// lib/email.ts
import transporter from "./nodemailer";

interface WelcomeEmailData {
  email: string;
  firstName: string;
  roleName: string;
  tempPassword: string;
  staffId: string;
}

const roleLabels: Record<string, string> = {
  registrar: "Registrar",
  dean: "Dean",
  dsdw: "DSDW",
  cashier: "Cashier",
};

function getWelcomeEmailTemplate(data: WelcomeEmailData): string {
  const loginUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const roleLabel = roleLabels[data.roleName] || data.roleName;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1B5A8C; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">BCC Queue Management System</h1>
      </div>

      <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1B5A8C; margin-top: 0;">Welcome, ${data.firstName}!</h2>

        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your staff account has been created for the <strong>BCC Queue Management System</strong>.
        </p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0; color: #555;"><strong>Staff ID:</strong> ${data.staffId}</p>
          <p style="margin: 5px 0; color: #555;"><strong>Role:</strong> ${roleLabel}</p>
          <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${data.email}</p>
          <p style="margin: 5px 0; color: #555;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e8e8e8; padding: 2px 8px; border-radius: 4px;">${data.tempPassword}</span></p>
        </div>

        <div style="background-color: #FFF3CD; border: 1px solid #FFE69C; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ Important: Change Your Password</p>
          <p style="color: #856404; margin: 8px 0 0 0; font-size: 14px;">
            For security reasons, you are required to change your temporary password immediately after logging in.
            This password will expire after your first login.
          </p>
        </div>

        <div style="margin: 30px 0;">
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            <strong>How to get started:</strong>
          </p>
          <ol style="color: #555; font-size: 14px; line-height: 1.8;">
            <li>Go to <a href="${loginUrl}" style="color: #1B5A8C;">${loginUrl}</a></li>
            <li>Click <strong>Login</strong> and select <strong>Admin / Faculty</strong></li>
            <li>Enter your email and temporary password</li>
            <li>You'll be prompted to change your password immediately</li>
            <li>Set a new secure password that you'll remember</li>
          </ol>
        </div>

        <a href="${loginUrl}" style="display: inline-block; background-color: #1B5A8C; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          Login to BCC Queue System
        </a>

        <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          This is an automated message from BCC Queue Management System. If you did not expect this email, please contact the IT Department immediately.
        </p>
      </div>
    </div>
  `;
}

export async function sendWelcomeEmail(
  data: WelcomeEmailData,
): Promise<boolean> {
  try {
    const roleLabel = roleLabels[data.roleName] || data.roleName;

    await transporter.sendMail({
      from: `"BCC Queue System" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: `Welcome to BCC Queue System - ${roleLabel} Account`,
      html: getWelcomeEmailTemplate(data),
    });

    console.log(`Welcome email sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetToken: string,
): Promise<boolean> {
  try {
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1B5A8C; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">BCC Queue Management System</h1>
        </div>

        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1B5A8C; margin-top: 0;">Password Reset Request</h2>

          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hello ${firstName}, you requested to reset your password for the BCC Queue Management System.
          </p>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #1B5A8C; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Reset Your Password
            </a>
          </div>

          <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            If you did not request this, please ignore this email. This link will expire in 1 hour.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"BCC Queue System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "BCC Queue System - Password Reset Request",
      html,
    });

    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}
