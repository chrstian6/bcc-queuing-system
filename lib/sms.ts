// lib/sms.ts

interface IProgSMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  messageStatusLink?: string;
}

interface IProgSMSStatusResponse {
  success: boolean;
  status?: string;
  error?: string;
}

const IPROG_SMS_ENDPOINT = "https://sms.iprogtech.com/api/v1/sms_messages";
const IPROG_SMS_STATUS_ENDPOINT =
  "https://sms.iprogtech.com/api/v1/sms_messages/status";

/**
 * Format phone number for IPROG SMS.
 * IPROG expects a local-format number like 09XXXXXXXXX (their docs use this
 * consistently), so normalize to that rather than the 63-prefixed format.
 */
function formatPhoneForSMS(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, "");

  if (cleanPhone.startsWith("63") && cleanPhone.length === 12) {
    return "0" + cleanPhone.substring(2);
  } else if (cleanPhone.startsWith("9") && cleanPhone.length === 10) {
    return "0" + cleanPhone;
  }

  // Already in 09XXXXXXXXX form (or unrecognized — pass through as-is)
  return cleanPhone;
}

/**
 * Send SMS using the IPROG SMS API
 * Docs: https://sms.iprogtech.com/api/v1/documentation
 */
export async function sendSMS(
  phoneNumber: string,
  message: string,
): Promise<IProgSMSResponse> {
  try {
    const formattedPhone = formatPhoneForSMS(phoneNumber);

    console.log("=== SMS Sending Debug ===");
    console.log("Original phone number:", phoneNumber);
    console.log("Formatted phone number:", formattedPhone);
    console.log("Message:", message);
    console.log("=========================");

    const IPROG_API_TOKEN = process.env.IPROG_API_TOKEN;

    if (!IPROG_API_TOKEN) {
      console.error("IPROG_API_TOKEN not configured");
      return { success: false, error: "SMS service not configured" };
    }

    const requestBody = {
      api_token: IPROG_API_TOKEN,
      phone_number: formattedPhone,
      message,
    };

    console.log(`Sending SMS to ${formattedPhone} via ${IPROG_SMS_ENDPOINT}`);

    const response = await fetch(IPROG_SMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    console.log("SMS API Response:", JSON.stringify(data, null, 2));

    if (!response.ok || !data) {
      console.error("IPROG SMS API error:", response.status, data);
      return {
        success: false,
        error: `Failed to send SMS (${response.status})`,
      };
    }

    // IPROG returns { status: 200, message: "...", message_id: "iSms-..." }
    // on success, or { status: "error"/500, message: "..." } on failure.
    const isSuccess = data.status === 200 || data.status === "success";

    if (!isSuccess) {
      console.error("IPROG SMS API returned error:", data.message);
      return { success: false, error: data.message || "SMS send failed" };
    }

    return {
      success: true,
      messageId: data.message_id,
      messageStatusLink: data.message_status_link,
    };
  } catch (error: any) {
    console.error("Error sending SMS:", error);

    if (error?.cause?.code === "ENOTFOUND") {
      console.error(
        `DNS lookup failed for ${error.cause.hostname}. Check that this hostname is reachable from your network.`,
      );
      return {
        success: false,
        error: `SMS service hostname not found: ${error.cause.hostname}`,
      };
    }

    return { success: false, error: "Failed to send SMS" };
  }
}

/**
 * Check SMS delivery status
 */
export async function checkSMSStatus(
  messageId: string,
): Promise<IProgSMSStatusResponse> {
  try {
    const IPROG_API_TOKEN = process.env.IPROG_API_TOKEN;

    if (!IPROG_API_TOKEN) {
      console.error("IPROG_API_TOKEN not configured");
      return { success: false, error: "SMS service not configured" };
    }

    const statusUrl = `${IPROG_SMS_STATUS_ENDPOINT}?api_token=${IPROG_API_TOKEN}&message_id=${messageId}`;

    console.log(`Checking SMS status for ${messageId}`);

    const response = await fetch(statusUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    console.log("SMS Status Response:", JSON.stringify(data, null, 2));

    if (!response.ok || !data) {
      return { success: false, error: "Failed to check SMS status" };
    }

    return {
      success: true,
      status: data.status || data.message_status || data.delivery_status,
    };
  } catch (error) {
    console.error("Error checking SMS status:", error);
    return { success: false, error: "Failed to check SMS status" };
  }
}

/**
 * Send SMS notification for document requests
 */
export async function sendDocumentRequestSMS(
  phoneNumber: string,
  studentName: string,
  requestId: string,
  documentTypeLabel: string,
  status: string,
  remarks?: string,
): Promise<void> {
  try {
    if (!phoneNumber) {
      console.log("No phone number provided for SMS notification");
      return;
    }

    console.log("=== Document Request SMS Notification ===");
    console.log("Phone number:", phoneNumber);
    console.log("Student name:", studentName);
    console.log("Request ID:", requestId);
    console.log("Document type:", documentTypeLabel);
    console.log("Status:", status);
    console.log("Remarks:", remarks || "None");
    console.log("=========================================");

    let message = "";

    switch (status) {
      case "submitted":
        message = `BCC Document Request: Hi ${studentName}, your request ${requestId} for ${documentTypeLabel} has been submitted. We'll notify you when it's ready.`;
        break;
      case "processing":
        message = `BCC Document Request: Hi ${studentName}, your request ${requestId} for ${documentTypeLabel} is now being processed.`;
        break;
      case "ready-for-pickup":
        message = `BCC Document Request: Hi ${studentName}, your request ${requestId} for ${documentTypeLabel} is ready for pickup at the Registrar's Office.`;
        break;
      case "released":
        message = `BCC Document Request: Hi ${studentName}, your request ${requestId} for ${documentTypeLabel} has been released. Thank you!`;
        break;
      case "rejected":
        message = `BCC Document Request: Hi ${studentName}, your request ${requestId} for ${documentTypeLabel} was rejected${remarks ? `: ${remarks}` : ""}. Please visit the Registrar's Office for more information.`;
        break;
      default:
        message = `BCC Document Request: Hi ${studentName}, your request ${requestId} status has been updated to ${status}.`;
    }

    // Limit message length (SMS max is typically 160 characters)
    if (message.length > 160) {
      message = message.substring(0, 157) + "...";
    }

    console.log("Sending SMS with message:", message);

    const result = await sendSMS(phoneNumber, message);

    if (!result.success) {
      console.error("Failed to send SMS notification:", result.error);
    } else {
      console.log(
        `SMS sent successfully to ${phoneNumber}, messageId: ${result.messageId}`,
      );
      console.log(`SMS status link: ${result.messageStatusLink}`);
    }
  } catch (error) {
    console.error("Error in sendDocumentRequestSMS:", error);
  }
}

/**
 * Send SMS notification for ticket updates
 */
export async function sendTicketNotificationSMS(
  phoneNumber: string,
  studentName: string,
  ticketNumber: string,
  transactionType: string,
  status: string,
  queuePosition?: number,
  staffName?: string,
): Promise<void> {
  try {
    if (!phoneNumber) {
      console.log("No phone number provided for ticket SMS notification");
      return;
    }

    const transactionLabel = transactionType
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l: string) => l.toUpperCase());

    console.log("=== Ticket SMS Notification ===");
    console.log("Phone number:", phoneNumber);
    console.log("Student name:", studentName);
    console.log("Ticket number:", ticketNumber);
    console.log("Transaction type:", transactionLabel);
    console.log("Status:", status);
    console.log("Queue position:", queuePosition || "N/A");
    console.log("Staff name:", staffName || "N/A");
    console.log("===================================");

    let message = "";

    switch (status) {
      case "submitted":
        message = `BCC Queue: Hi ${studentName}, your ticket ${ticketNumber} for ${transactionLabel} has been created. Position: ${queuePosition || 1}. We'll notify you when it's your turn.`;
        break;
      case "serving":
        message = `BCC Queue: Hi ${studentName}, your ticket ${ticketNumber} for ${transactionLabel} is now being served${staffName ? ` by ${staffName}` : ""}. Please proceed to the counter.`;
        break;
      case "next":
        message = `BCC Queue: Hi ${studentName}, you're next in line! Ticket ${ticketNumber} for ${transactionLabel} will be served soon. Please be ready.`;
        break;
      case "reminder":
        message = `BCC Queue: Hi ${studentName}, your ticket ${ticketNumber} for ${transactionLabel} is in position ${queuePosition || 2}. Please wait for your turn.`;
        break;
      case "skipped":
        message = `BCC Queue: Hi ${studentName}, your ticket ${ticketNumber} for ${transactionLabel} was cancelled. Please visit the cashier for assistance.`;
        break;
      case "cancelled":
        message = `BCC Queue: Hi ${studentName}, your ticket ${ticketNumber} for ${transactionLabel} was cancelled. Please visit the cashier for assistance.`;
        break;
      case "completed":
        message = `BCC Queue: Hi ${studentName}, your ticket ${ticketNumber} for ${transactionLabel} has been completed. Thank you!`;
        break;
      case "waiting":
        message = `BCC Queue: Hi ${studentName}, your ticket ${ticketNumber} for ${transactionLabel} is in position ${queuePosition || 1}. Please wait for your turn.`;
        break;
      default:
        message = `BCC Queue: Hi ${studentName}, your ticket ${ticketNumber} status has been updated to ${status}.`;
    }

    // Limit message length (SMS max is typically 160 characters)
    if (message.length > 160) {
      message = message.substring(0, 157) + "...";
    }

    console.log("Sending ticket SMS with message:", message);

    const result = await sendSMS(phoneNumber, message);

    if (!result.success) {
      console.error("Failed to send ticket SMS notification:", result.error);
    } else {
      console.log(
        `Ticket SMS sent successfully to ${phoneNumber}, messageId: ${result.messageId}`,
      );
      console.log(`SMS status link: ${result.messageStatusLink}`);
    }
  } catch (error) {
    console.error("Error in sendTicketNotificationSMS:", error);
  }
}
