// actions/staff.ts
"use server";

import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import User from "@/models/User";
import { revalidatePath } from "next/cache";
import { sendWelcomeEmail } from "@/lib/email";

interface CreateStaffData {
  facultyId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: "registrar" | "dean" | "dsdw" | "cashier";
  roleAccessLevel?: number;
  cashierWindow?: string;
}

interface StaffResponse {
  success: boolean;
  error?: string;
  staff?: {
    staffId: string;
    facultyId: string;
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    roleAccessLevel: number;
    cashierWindow?: string;
    status: string;
    createdAt: Date;
  };
}

/**
 * Generate a simple, easy-to-read temporary password
 * Format: word + number (e.g., "blue147", "happy523", "fox894")
 * Minimum length: word (3+ chars) + number (3 digits) = 6+ characters
 */
function generateSimplePassword(): string {
  const words = [
    "blue",
    "red",
    "green",
    "gold",
    "silver",
    "happy",
    "sunny",
    "brave",
    "calm",
    "wise",
    "star",
    "moon",
    "lake",
    "hill",
    "wind",
    "book",
    "pen",
    "desk",
    "door",
    "bell",
    "rain",
    "snow",
    "fire",
    "tree",
    "bird",
    "dawn",
    "dusk",
    "noon",
    "mist",
    "dew",
    "rose",
    "lily",
    "pine",
    "oak",
    "elm",
    "lion",
    "deer",
    "hawk",
    "dove",
    "fox",
  ];

  const word = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 100-999 (3 digits)
  const password = `${word}${number}`;

  console.log(
    "🔑 Generated password:",
    password,
    "(length:",
    password.length + ")",
  );
  return password;
}

export async function createStaffAccount(
  data: CreateStaffData,
): Promise<StaffResponse> {
  try {
    // ── Validation ──────────────────────────────────────
    if (
      !data.facultyId ||
      !data.firstName ||
      !data.lastName ||
      !data.email ||
      !data.roleName
    ) {
      return { success: false, error: "All required fields must be filled" };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { success: false, error: "Please enter a valid email address" };
    }

    if (data.roleName === "cashier" && !data.cashierWindow) {
      return { success: false, error: "Window number is required for cashier" };
    }

    // ── Database Connection ─────────────────────────────
    await connectDB();
    console.log("✅ Connected to database");

    // ── Check for existing accounts ─────────────────────
    const existingStaffEmail = await Staff.findOne({
      email: data.email.toLowerCase(),
    });
    if (existingStaffEmail) {
      return {
        success: false,
        error: "A staff account with this email already exists",
      };
    }

    const existingUserEmail = await User.findOne({
      email: data.email.toLowerCase(),
    });
    if (existingUserEmail) {
      return {
        success: false,
        error: "An admin account with this email already exists",
      };
    }

    const existingStaffFacultyId = await Staff.findOne({
      facultyId: data.facultyId,
    });
    if (existingStaffFacultyId) {
      return {
        success: false,
        error: "A staff account with this faculty ID already exists",
      };
    }

    console.log("✅ No duplicate accounts found");

    // ── Generate password ───────────────────────────────
    const tempPassword = generateSimplePassword();

    // ── Create staff account ────────────────────────────
    const staffData: any = {
      facultyId: data.facultyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      password: tempPassword,
      roleName: data.roleName,
      roleAccessLevel: data.roleAccessLevel || 6,
      status: "active",
      mustChangePassword: true,
    };

    if (data.roleName === "cashier") {
      staffData.cashierWindow = data.cashierWindow;
    }

    console.log("💾 Saving staff account to database...");
    const staff = new Staff(staffData);
    await staff.save();
    console.log("✅ Staff account saved with ID:", staff.staffId);

    // ── Send welcome email ──────────────────────────────
    console.log("📧 Attempting to send welcome email to:", staff.email);

    let emailSent = false;
    try {
      emailSent = await sendWelcomeEmail({
        email: staff.email,
        firstName: staff.firstName,
        roleName: staff.roleName,
        tempPassword,
        staffId: staff.staffId,
      });

      if (emailSent) {
        console.log("✅ Welcome email sent successfully to:", staff.email);
      } else {
        console.error("❌ sendWelcomeEmail returned false for:", staff.email);
      }
    } catch (emailError: any) {
      console.error("❌ Failed to send welcome email:");
      console.error("  Error name:", emailError.name);
      console.error("  Error message:", emailError.message);
      console.error("  Error code:", emailError.code);
      console.error("  Error command:", emailError.command);

      if (emailError.stack) {
        console.error(
          "  Stack trace:",
          emailError.stack.split("\n").slice(0, 3).join("\n"),
        );
      }

      // Check for common SMTP errors
      if (emailError.code === "EAUTH") {
        console.error(
          "  → Authentication failed. Check SMTP_USER and SMTP_PASS in .env.local",
        );
      } else if (emailError.code === "ESOCKET") {
        console.error(
          "  → Connection failed. Check SMTP_HOST and SMTP_PORT in .env.local",
        );
      } else if (emailError.code === "EENVELOPE") {
        console.error("  → Invalid email address or sender configuration");
      }
    }

    // ── Revalidate paths ────────────────────────────────
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/staff");

    // ── Prepare response ────────────────────────────────
    const responseStaff: any = {
      staffId: staff.staffId,
      facultyId: staff.facultyId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      roleName: staff.roleName,
      roleAccessLevel: staff.roleAccessLevel,
      status: staff.status,
      createdAt: staff.createdAt,
    };

    if (staff.roleName === "cashier") {
      responseStaff.cashierWindow = staff.cashierWindow;
    }

    return {
      success: true,
      staff: responseStaff,
      // Only show email warning if it failed
      error: emailSent
        ? undefined
        : "Account created but welcome email could not be sent. Please check email configuration.",
    };
  } catch (error: any) {
    console.error("❌ Error creating staff account:", error);
    console.error("  Error type:", error.constructor.name);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const messages: Record<string, string> = {
        email: "Email already exists",
        facultyId: "Faculty ID already exists",
        staffId: "Staff ID already exists",
      };
      return { success: false, error: messages[field] || "Duplicate value" };
    }

    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message,
      );
      return { success: false, error: messages.join(". ") };
    }

    return {
      success: false,
      error: "Failed to create staff account. Please try again.",
    };
  }
}

// ────────────────────────────────────────────────────────
// Other functions remain the same
// ────────────────────────────────────────────────────────

export async function getAllStaff() {
  try {
    await connectDB();
    const staff = await Staff.find().sort({ createdAt: -1 }).lean();
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching all staff:", error);
    return { success: false, error: "Failed to fetch staff", staff: [] };
  }
}

export async function getStaffById(staffId: string) {
  try {
    await connectDB();
    const staff = await Staff.findOne({ staffId } as any).lean();
    if (!staff) return { success: false, error: "Staff not found" };
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching staff by ID:", error);
    return { success: false, error: "Failed to fetch staff" };
  }
}

export async function getStaffByRole(roleName: string) {
  try {
    await connectDB();
    const staff = await Staff.find({ roleName } as any)
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching staff by role:", error);
    return { success: false, error: "Failed to fetch staff", staff: [] };
  }
}

export async function getStaffByStatus(status: string) {
  try {
    await connectDB();
    const staff = await Staff.find({ status } as any)
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching staff by status:", error);
    return { success: false, error: "Failed to fetch staff", staff: [] };
  }
}

export async function updateStaffStatus(
  staffId: string,
  status: "active" | "inactive" | "suspended",
) {
  try {
    await connectDB();
    const staff = await Staff.findOneAndUpdate(
      { staffId } as any,
      { status },
      { new: true },
    ).lean();
    if (!staff) return { success: false, error: "Staff not found" };
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/staff");
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error updating staff status:", error);
    return { success: false, error: "Failed to update staff status" };
  }
}

export async function updateStaffRole(
  staffId: string,
  roleName: string,
  roleAccessLevel?: number,
) {
  try {
    await connectDB();
    const updateData: any = { roleName };
    if (roleAccessLevel) updateData.roleAccessLevel = roleAccessLevel;

    const staff = await Staff.findOneAndUpdate({ staffId } as any, updateData, {
      new: true,
    }).lean();
    if (!staff) return { success: false, error: "Staff not found" };
    revalidatePath("/admin/users");
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error updating staff role:", error);
    return { success: false, error: "Failed to update staff role" };
  }
}

export async function deleteStaff(staffId: string) {
  try {
    await connectDB();
    const staff = await Staff.findOneAndDelete({ staffId } as any);
    if (!staff) return { success: false, error: "Staff not found" };
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/staff");
    return { success: true, message: "Staff account deleted successfully" };
  } catch (error) {
    console.error("Error deleting staff:", error);
    return { success: false, error: "Failed to delete staff" };
  }
}

export async function getStaffStats() {
  try {
    await connectDB();

    const [
      totalStaff,
      activeStaff,
      inactiveStaff,
      suspendedStaff,
      registrarCount,
      deanCount,
      dsdwCount,
      cashierCount,
    ] = await Promise.all([
      Staff.countDocuments(),
      Staff.countDocuments({ status: "active" } as any),
      Staff.countDocuments({ status: "inactive" } as any),
      Staff.countDocuments({ status: "suspended" } as any),
      Staff.countDocuments({ roleName: "registrar" } as any),
      Staff.countDocuments({ roleName: "dean" } as any),
      Staff.countDocuments({ roleName: "dsdw" } as any),
      Staff.countDocuments({ roleName: "cashier" } as any),
    ]);

    return {
      success: true,
      stats: {
        totalStaff,
        activeStaff,
        inactiveStaff,
        suspendedStaff,
        byRole: {
          registrar: registrarCount,
          dean: deanCount,
          dsdw: dsdwCount,
          cashier: cashierCount,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching staff stats:", error);
    return { success: false, error: "Failed to fetch staff statistics" };
  }
}
