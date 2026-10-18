// actions/password-reset.ts
"use server";

import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Staff from "@/models/Staff";
import transporter from "@/lib/nodemailer";

const PIN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between PIN emails
const MAX_PIN_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_REGEX = /^\d{6}$/;

type ActionResult = { success: boolean; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePin(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// HMAC (not plain SHA) so a leaked DB can't be brute-forced from the 1M possible PINs
function hashPin(email: string, pin: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`${email}:${pin}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Not exported: "use server" files can only export async server actions
async function sendPasswordResetPinEmail(
  to: string,
  firstName: string,
  pin: string,
) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `${pin} is your SmartQ password reset PIN`,
    text: `Hi ${firstName},\n\nYour password reset PIN is: ${pin}\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#0F172A;margin:0 0 16px">Password reset PIN</h2>
        <p style="color:#475569">Hi ${firstName},</p>
        <p style="color:#475569">
          Enter this PIN to reset your password. It expires in <b>10 minutes</b>.
        </p>
        <p style="margin:24px 0;text-align:center">
          <span style="display:inline-block;padding:14px 24px;background:#F1F5F9;border-radius:10px;font-size:32px;font-weight:700;letter-spacing:10px;color:#0000CC">
            ${pin}
          </span>
        </p>
        <p style="color:#94A3B8;font-size:13px">
          If you didn't request this, you can safely ignore this email.
          Never share this PIN with anyone.
        </p>
      </div>
    `,
  });

  console.log("📧 [RESET] sendMail result:", {
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  });
}

/**
 * Checks an email + PIN pair. Counts wrong guesses and invalidates the PIN
 * after MAX_PIN_ATTEMPTS. Returns the staff doc (with reset fields loaded) when valid.
 */
async function checkPin(email: string, pin: string) {
  const staff = await Staff.findOne({ email, status: "active" }).select(
    "+password +passwordResetPin +passwordResetExpires +passwordResetAttempts",
  );

  const invalid = {
    ok: false as const,
    message: "Invalid or expired PIN. Please try again.",
  };

  if (!staff || !staff.passwordResetPin || !staff.passwordResetExpires) {
    return invalid;
  }

  if (staff.passwordResetExpires.getTime() < Date.now()) {
    return {
      ok: false as const,
      message: "This PIN has expired. Please request a new one.",
    };
  }

  if ((staff.passwordResetAttempts ?? 0) >= MAX_PIN_ATTEMPTS) {
    return {
      ok: false as const,
      message: "Too many incorrect attempts. Please request a new PIN.",
    };
  }

  if (!safeEqual(staff.passwordResetPin, hashPin(email, pin))) {
    staff.passwordResetAttempts = (staff.passwordResetAttempts ?? 0) + 1;

    if (staff.passwordResetAttempts >= MAX_PIN_ATTEMPTS) {
      staff.passwordResetPin = undefined;
      staff.passwordResetExpires = undefined;
      await staff.save({ validateModifiedOnly: true });
      return {
        ok: false as const,
        message: "Too many incorrect attempts. Please request a new PIN.",
      };
    }

    await staff.save({ validateModifiedOnly: true });
    const left = MAX_PIN_ATTEMPTS - staff.passwordResetAttempts;
    return {
      ok: false as const,
      message: `Incorrect PIN. ${left} attempt${left === 1 ? "" : "s"} left.`,
    };
  }

  return { ok: true as const, staff };
}

// ─── 1. Request a PIN ────────────────────────────────────────────────────────

export async function requestPasswordResetPin(
  email: string,
): Promise<ActionResult> {
  // Same response whether or not the email exists (prevents account enumeration)
  const genericResponse: ActionResult = {
    success: true,
    message: "If that email is registered, a 6-digit PIN has been sent.",
  };

  try {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !EMAIL_REGEX.test(normalized)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    await dbConnect();

    const staff = await Staff.findOne({ email: normalized }).select(
      "+passwordResetPin +passwordResetExpires +passwordResetAttempts",
    );

    if (!staff) {
      console.log(`📧 [RESET] No Staff found for ${normalized} — PIN not sent`);
      return genericResponse;
    }
    if (staff.status !== "active") {
      console.log(
        `📧 [RESET] Staff ${normalized} has status "${staff.status}" — PIN not sent`,
      );
      return genericResponse;
    }

    // Resend cooldown (the PIN's send time = expiry - TTL)
    if (staff.passwordResetExpires) {
      const sentAt = staff.passwordResetExpires.getTime() - PIN_TTL_MS;
      if (Date.now() - sentAt < RESEND_COOLDOWN_MS) {
        return {
          success: false,
          message: "Please wait a minute before requesting another PIN.",
        };
      }
    }

    const pin = generatePin();
    staff.passwordResetPin = hashPin(normalized, pin);
    staff.passwordResetExpires = new Date(Date.now() + PIN_TTL_MS);
    staff.passwordResetAttempts = 0;
    await staff.save({ validateModifiedOnly: true });

    try {
      console.log(`📧 [RESET] Sending PIN to ${staff.email}...`);
      await sendPasswordResetPinEmail(staff.email, staff.firstName, pin);
    } catch (mailError) {
      console.error("Failed to send reset PIN email:", mailError);
      staff.passwordResetPin = undefined;
      staff.passwordResetExpires = undefined;
      await staff.save({ validateModifiedOnly: true });
      return {
        success: false,
        message: "We couldn't send the email. Please try again later.",
      };
    }

    return genericResponse;
  } catch (error) {
    console.error("requestPasswordResetPin error:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}

// ─── 2. Verify the PIN (does not consume it) ─────────────────────────────────

export async function verifyResetPin(
  email: string,
  pin: string,
): Promise<ActionResult> {
  try {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !PIN_REGEX.test(pin ?? "")) {
      return { success: false, message: "Please enter the 6-digit PIN." };
    }

    await dbConnect();

    const result = await checkPin(normalized, pin);
    if (!result.ok) return { success: false, message: result.message };

    return { success: true, message: "PIN verified." };
  } catch (error) {
    console.error("verifyResetPin error:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}

// ─── 3. Set the new password (re-verifies the PIN, then consumes it) ─────────

export async function resetPasswordWithPin(
  email: string,
  pin: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ActionResult> {
  try {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !PIN_REGEX.test(pin ?? "")) {
      return { success: false, message: "Invalid or expired PIN." };
    }
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, message: "Passwords do not match." };
    }

    await dbConnect();

    const result = await checkPin(normalized, pin);
    if (!result.ok) return { success: false, message: result.message };

    const { staff } = result;
    staff.password = newPassword; // hashed by the pre-save hook in Staff.ts
    staff.mustChangePassword = false;
    staff.passwordResetPin = undefined;
    staff.passwordResetExpires = undefined;
    staff.passwordResetAttempts = 0;
    await staff.save();

    return { success: true, message: "Password updated. You can now sign in." };
  } catch (error) {
    console.error("resetPasswordWithPin error:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
