// lib/email.ts
import transporter from "./nodemailer";

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────

interface WelcomeEmailData {
  email: string;
  firstName: string;
  roleName: string;
  tempPassword: string;
  staffId: string;
}

interface TicketNotificationData {
  email: string;
  studentName: string;
  ticketNumber: string;
  ticketId: string;
  transactionType: string;
  queuePosition?: number;
  notificationType?: "created" | "serving" | "next" | "reminder";
  staffName?: string;
}

interface EmailTemplateConfig {
  title: string;
  subtitle?: string;
  content: string;
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
}

// ──────────────────────────────────────────────
// Labels
// ──────────────────────────────────────────────

const roleLabels: Record<string, string> = {
  registrar: "Registrar",
  dean: "Dean",
  dsdw: "DSDW",
  cashier: "Cashier",
};

const transactionLabels: Record<string, string> = {
  tor: "Transcript of Records",
  coe: "Certificate of Enrollment",
  "request-grades": "Request for Grades",
  "enrollment-fees": "Enrollment Fees",
  assessment: "Request Assessment",
  "exam-fees": "Exam Fees",
  payments: "Payments",
  certificate: "Certificate",
};

// ──────────────────────────────────────────────
// Email Configuration
// ──────────────────────────────────────────────

function getSenderConfig() {
  const senderEmail = process.env.SMTP_USER || "";
  const senderDomain = senderEmail.split("@")[1] || "bcc.edu.ph";

  return {
    from: `"BCC Queue System" <${senderEmail}>`,
    senderEmail,
    senderDomain,
  };
}

function getMessageId(senderDomain: string): string {
  return `<${Date.now()}-${Math.random().toString(36).substring(7)}@${senderDomain}>`;
}

// ──────────────────────────────────────────────
// Reusable Minimalist Email Template
// ──────────────────────────────────────────────

function getEmailTemplate(config: EmailTemplateConfig): string {
  const { title, subtitle, content, actionLabel, actionUrl, footerNote } =
    config;
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fafafa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="520" style="max-width: 520px; width: 100%;">
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 11px; color: #a0a0a0; text-transform: uppercase; letter-spacing: 2px;">Binalbagan Catholic College</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; padding: 48px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #1a1a1a; text-align: center; line-height: 1.3;">${title}</h2>
              ${subtitle ? `<p style="margin: 0 0 32px 0; font-size: 13px; color: #888888; text-align: center; line-height: 1.5;">${subtitle}</p>` : ""}
              <div style="margin-bottom: ${actionUrl ? "32px" : "0"};">${content}</div>
              ${
                actionUrl && actionLabel
                  ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; text-align: center;">${actionLabel}</a>
                  </td>
                </tr>
              </table>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #c0c0c0; line-height: 1.5;">${footerNote || "This is an automated message from BCC Queue System."}</p>
              <p style="margin: 0; font-size: 11px; color: #c0c0c0;">© ${currentYear} Binalbagan Catholic College Inc.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ──────────────────────────────────────────────
// Email Content Builders
// ──────────────────────────────────────────────

function buildWelcomeContent(data: WelcomeEmailData): string {
  const roleLabel = roleLabels[data.roleName] || data.roleName;

  return `
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #555555; line-height: 1.6; text-align: center;">Your staff account has been created.</p>
    <div style="background-color: #f9f9f9; border-radius: 8px; padding: 24px; margin-bottom: 8px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr><td style="padding: 6px 0; font-size: 13px; color: #888888; width: 40%;">Staff ID</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a; font-weight: 500; text-align: right;">${data.staffId}</td></tr>
        <tr><td style="padding: 6px 0; font-size: 13px; color: #888888;">Role</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a; font-weight: 500; text-align: right;">${roleLabel}</td></tr>
        <tr><td style="padding: 6px 0; font-size: 13px; color: #888888;">Email</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a; font-weight: 500; text-align: right;">${data.email}</td></tr>
        <tr><td style="padding: 6px 0; font-size: 13px; color: #888888;">Temp Password</td><td style="padding: 6px 0; font-size: 13px; font-weight: 500; text-align: right;"><code style="font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 13px; color: #1a1a1a; background: #eeeeee; padding: 3px 10px; border-radius: 4px;">${data.tempPassword}</code></td></tr>
      </table>
    </div>
    <p style="margin: 24px 0 0 0; font-size: 12px; color: #aaaaaa; text-align: center; line-height: 1.5;">Please change your password immediately after logging in.</p>`;
}

function buildTicketContent(data: TicketNotificationData): string {
  const transactionLabel =
    transactionLabels[data.transactionType] || data.transactionType;

  // Determine message based on notification type
  let headerMessage = "";
  let headerSubtext = "";

  switch (data.notificationType) {
    case "serving":
      headerMessage = "You're now being served!";
      headerSubtext = data.staffName
        ? `${data.staffName} is now assisting you. Please proceed to the counter.`
        : "Please proceed to the counter.";
      break;
    case "next":
      headerMessage = "You're next in line!";
      headerSubtext = data.staffName
        ? `${data.staffName} will serve you shortly. Please get ready.`
        : "Please get ready. You'll be called shortly.";
      break;
    case "reminder":
      headerMessage = "Get ready!";
      headerSubtext = data.staffName
        ? `You're second in line. ${data.staffName} will serve you soon.`
        : "You're second in line. Please prepare your documents.";
      break;
    default:
      headerMessage = "Your ticket has been created!";
      headerSubtext = "We'll notify you when it's your turn.";
  }

  return `
    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a; text-align: center;">${headerMessage}</p>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #666666; line-height: 1.5; text-align: center;">${headerSubtext}</p>

    <div style="text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 4px 0; font-size: 10px; color: #aaaaaa; text-transform: uppercase; letter-spacing: 1.5px;">Ticket Number</p>
      <p style="margin: 0; font-size: 40px; font-weight: 700; color: #1a1a1a; letter-spacing: 2px; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;">${data.ticketNumber}</p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #cccccc;">${data.ticketId}</p>
    </div>

    <div style="background-color: #f9f9f9; border-radius: 8px; padding: 24px; margin-bottom: 8px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr><td style="padding: 6px 0; font-size: 13px; color: #888888; width: 40%;">Transaction</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a; font-weight: 500; text-align: right;">${transactionLabel}</td></tr>
        ${data.queuePosition ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #888888;">Queue Position</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a; font-weight: 500; text-align: right;">#${data.queuePosition}</td></tr>` : ""}
        <tr><td style="padding: 6px 0; font-size: 13px; color: #888888;">Student</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a; font-weight: 500; text-align: right;">${data.studentName}</td></tr>
      </table>
    </div>`;
}

function buildPasswordResetContent(
  firstName: string,
  resetUrl: string,
): string {
  return `
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #555555; line-height: 1.6; text-align: center;">Hello ${firstName},<br>you requested to reset your password.</p>
    <p style="margin: 0 0 8px 0; font-size: 12px; color: #aaaaaa; text-align: center; line-height: 1.5;">This link will expire in 1 hour. If you did not request this, you can safely ignore this email.</p>`;
}

// ──────────────────────────────────────────────
// Plain Text Fallbacks
// ──────────────────────────────────────────────

function getWelcomePlainText(data: WelcomeEmailData): string {
  const roleLabel = roleLabels[data.roleName] || data.roleName;
  const loginUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return [
    `Welcome ${data.firstName}!`,
    ``,
    `Your staff account has been created.`,
    ``,
    `Staff ID: ${data.staffId}`,
    `Role: ${roleLabel}`,
    `Email: ${data.email}`,
    `Temporary Password: ${data.tempPassword}`,
    ``,
    `Login here: ${loginUrl}`,
    ``,
    `Please change your password immediately.`,
    ``,
    `Binalbagan Catholic College Inc.`,
  ].join("\n");
}

function getTicketPlainText(data: TicketNotificationData): string {
  const transactionLabel =
    transactionLabels[data.transactionType] || data.transactionType;

  let headerMessage = "Your queue ticket has been created.";
  if (data.notificationType === "serving")
    headerMessage = "You're now being served! Please proceed to the counter.";
  else if (data.notificationType === "next")
    headerMessage = "You're next in line! Please get ready.";
  else if (data.notificationType === "reminder")
    headerMessage = "Get ready! You're second in line.";

  return [
    `Hello ${data.studentName},`,
    ``,
    headerMessage,
    ``,
    `Ticket Number: ${data.ticketNumber}`,
    `Ticket ID: ${data.ticketId}`,
    `Transaction: ${transactionLabel}`,
    data.queuePosition ? `Queue Position: #${data.queuePosition}` : "",
    `Student: ${data.studentName}`,
    ``,
    `Binalbagan Catholic College Inc.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function getPasswordResetPlainText(
  firstName: string,
  resetUrl: string,
): string {
  return [
    `Hello ${firstName},`,
    ``,
    `Reset your password: ${resetUrl}`,
    ``,
    `This link expires in 1 hour.`,
    ``,
    `Binalbagan Catholic College Inc.`,
  ].join("\n");
}

// ──────────────────────────────────────────────
// Email Sending Functions
// ──────────────────────────────────────────────

export async function sendWelcomeEmail(
  data: WelcomeEmailData,
): Promise<boolean> {
  try {
    const roleLabel = roleLabels[data.roleName] || data.roleName;
    const loginUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const { from, senderDomain } = getSenderConfig();
    await transporter.sendMail({
      from,
      to: data.email,
      subject: `Welcome to BCC Queue System - ${roleLabel} Account`,
      html: getEmailTemplate({
        title: `Welcome, ${data.firstName}`,
        subtitle: "Your staff account is ready",
        content: buildWelcomeContent(data),
        actionLabel: "Login to BCC Queue System",
        actionUrl: loginUrl,
      }),
      text: getWelcomePlainText(data),
      headers: {
        "X-Priority": "3",
        "X-Mailer": "BCC Queue Management System",
        "Message-ID": getMessageId(senderDomain),
        "List-Unsubscribe": `<mailto:${process.env.SMTP_USER}?subject=unsubscribe>`,
      },
    });
    console.log(`Welcome email sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}

export async function sendTicketNotificationEmail(
  data: TicketNotificationData,
): Promise<boolean> {
  try {
    const transactionLabel =
      transactionLabels[data.transactionType] || data.transactionType;
    const { from, senderDomain } = getSenderConfig();

    // Dynamic subject based on notification type
    let subject = `Ticket #${data.ticketNumber} - ${transactionLabel}`;
    if (data.notificationType === "serving")
      subject = `Now Serving: Ticket #${data.ticketNumber} - ${transactionLabel}`;
    else if (data.notificationType === "next")
      subject = `You're Next: Ticket #${data.ticketNumber} - ${transactionLabel}`;
    else if (data.notificationType === "reminder")
      subject = `Get Ready: Ticket #${data.ticketNumber} - ${transactionLabel}`;

    const info = await transporter.sendMail({
      from,
      to: data.email,
      subject,
      html: getEmailTemplate({
        title: `Hello, ${data.studentName}`,
        subtitle: transactionLabel,
        content: buildTicketContent(data),
        footerNote: "Please keep this ticket for reference.",
      }),
      text: getTicketPlainText(data),
      headers: {
        "X-Priority": "3",
        "X-Mailer": "BCC Queue Management System",
        "Message-ID": getMessageId(senderDomain),
        "List-Unsubscribe": `<mailto:${process.env.SMTP_USER}?subject=unsubscribe>`,
      },
    });
    console.log(
      `Ticket email sent to ${data.email} (#${data.ticketNumber}), MessageID: ${info.messageId}`,
    );
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send ticket notification email:",
      error.message || error,
    );
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
    const { from, senderDomain } = getSenderConfig();
    await transporter.sendMail({
      from,
      to: email,
      subject: "Password Reset Request",
      html: getEmailTemplate({
        title: "Password Reset",
        subtitle: "BCC Queue Management System",
        content: buildPasswordResetContent(firstName, resetUrl),
        actionLabel: "Reset Your Password",
        actionUrl: resetUrl,
        footerNote: "If you did not request this, please ignore this email.",
      }),
      text: getPasswordResetPlainText(firstName, resetUrl),
      headers: {
        "X-Priority": "3",
        "X-Mailer": "BCC Queue Management System",
        "Message-ID": getMessageId(senderDomain),
      },
    });
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}
