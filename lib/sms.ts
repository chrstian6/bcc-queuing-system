// lib/sms.ts
// TextBee SMS provider
// Docs: https://textbee.dev

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  messageStatusLink?: string;
}

interface SMSStatusResponse {
  success: boolean;
  status?: string;
  error?: string;
}

const TEXTBEE_SEND_ENDPOINT = "https://api.textbee.dev/api/v1/gateway/send-sms";

// Account-level message history endpoint. Use the `smsBatchId` query
// parameter to filter messages belonging to one send batch.
const TEXTBEE_MESSAGES_ENDPOINT =
  "https://api.textbee.dev/api/v1/gateway/messages";

/**
 * Format a phone number to E.164 (+63XXXXXXXXXX).
 *
 * TextBee recommends E.164 for all recipients [citation:1][citation:5].
 * Accepts the formats we already store in MongoDB:
 *   09XXXXXXXXX   → +639XXXXXXXXX
 *   9XXXXXXXXX    → +639XXXXXXXXX
 *   63XXXXXXXXXX  → +63XXXXXXXXXX
 *   +63XXXXXXXXXX → +63XXXXXXXXXX
 */
function formatPhoneForSMS(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("9") && digits.length === 10) {
    return `+63${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  // Unrecognized — best-effort pass-through with + prefix
  return `+${digits}`;
}

/**
 * Send SMS using the TextBee API.
 *
 * TextBee routes messages through an Android device linked to your
 * account. A 200 response means the message was **accepted and queued**,
 * not delivered. The phone must be online and have SMS permission granted
 * for the message to actually go out [citation:5][citation:10].
 *
 * Required env vars:
 *   TEXTBEE_API_KEY    — from the TextBee dashboard
 *   TEXTBEE_DEVICE_ID  — optional; pins a specific linked phone
 */
export async function sendSMS(
  phoneNumber: string,
  message: string,
): Promise<SMSResponse> {
  try {
    const formattedPhone = formatPhoneForSMS(phoneNumber);

    console.log("=== SMS Sending Debug (TextBee) ===");
    console.log("Original phone number:", phoneNumber);
    console.log("Formatted phone number:", formattedPhone);
    console.log("Message:", message);
    console.log("===================================");

    const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY;
    const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;

    if (!TEXTBEE_API_KEY) {
      console.error("TEXTBEE_API_KEY not configured");
      return { success: false, error: "SMS service not configured" };
    }

    const requestBody: Record<string, unknown> = {
      recipients: [formattedPhone],
      message,
    };

    // Optional: pin a specific device if you have multiple linked phones
    if (TEXTBEE_DEVICE_ID) {
      requestBody.deviceId = TEXTBEE_DEVICE_ID;
    }

    console.log(
      `Sending SMS to ${formattedPhone} via ${TEXTBEE_SEND_ENDPOINT}`,
    );

    const response = await fetch(TEXTBEE_SEND_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": TEXTBEE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    console.log("TextBee SMS API Response:", JSON.stringify(data, null, 2));

    if (!response.ok || !data) {
      console.error("TextBee SMS API error:", response.status, data);
      return {
        success: false,
        error:
          (data && (data.error || data.message)) ||
          `Failed to send SMS (${response.status})`,
      };
    }

    // TextBee wraps the payload in `data`. Success looks like:
    //   { data: { success: true, smsBatchId: "abc123", ... } }
    const inner = data.data ?? data;
    if (inner?.success === true || response.status === 200) {
      const batchId = inner?.smsBatchId || inner?.id;

      // Build a working status link using the messages endpoint.
      // There is no /sms-batches/{id} route — that was the cause of the 404.
      const statusLink = batchId
        ? `${TEXTBEE_MESSAGES_ENDPOINT}?smsBatchId=${encodeURIComponent(batchId)}`
        : undefined;

      return {
        success: true,
        messageId: batchId,
        messageStatusLink: statusLink,
      };
    }

    console.error(
      "TextBee SMS returned error:",
      inner?.error || inner?.message,
    );
    return {
      success: false,
      error: inner?.error || inner?.message || "SMS send failed",
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
 * Check SMS delivery status by TextBee batch ID.
 *
 * Uses the account-level message history endpoint:
 *   GET /api/v1/gateway/messages?smsBatchId={id}
 *
 * Returns the status of the first message in the batch (single-recipient
 * sends produce one message per batch). Statuses follow TextBee's state
 * machine: pending → dispatched → sent → delivered, or failed / unknown [citation:2].
 */
export async function checkSMSStatus(
  messageId: string,
): Promise<SMSStatusResponse> {
  try {
    const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY;

    if (!TEXTBEE_API_KEY) {
      console.error("TEXTBEE_API_KEY not configured");
      return { success: false, error: "SMS service not configured" };
    }

    const statusUrl = `${TEXTBEE_MESSAGES_ENDPOINT}?smsBatchId=${encodeURIComponent(messageId)}`;

    console.log(`Checking SMS status for batch ${messageId}`);

    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "x-api-key": TEXTBEE_API_KEY,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    console.log("SMS Status Response:", JSON.stringify(data, null, 2));

    if (!response.ok || !data) {
      return { success: false, error: "Failed to check SMS status" };
    }

    // /gateway/messages returns { data: [...messages], meta: {...} }
    const messages = Array.isArray(data.data) ? data.data : [];
    if (messages.length === 0) {
      return { success: false, error: "No messages found for this batch" };
    }

    const first = messages[0];
    return {
      success: true,
      status: first?.status || first?.state || "unknown",
    };
  } catch (error) {
    console.error("Error checking SMS status:", error);
    return { success: false, error: "Failed to check SMS status" };
  }
}

/**
 * Estimated time to receive a document after it is accepted, based on the
 * document type label:
 *   - 2 weeks: TOR, Good Moral, Certificate of Diploma, Certificate of Graduate
 *   - 2 days:  COE, COR, Grades
 * Any other document type returns null (no estimate in the SMS).
 */
function getEstimatedReceive(documentTypeLabel: string): string | null {
  const label = documentTypeLabel.toLowerCase();

  // 2 weeks
  if (
    /\btor\b/.test(label) ||
    label.includes("transcript") ||
    label.includes("good moral") ||
    label.includes("diploma") ||
    label.includes("graduat")
  ) {
    return "2 weeks";
  }

  // 2 days
  if (
    /\bcoe\b/.test(label) ||
    /\bcor\b/.test(label) ||
    label.includes("enrollment") ||
    label.includes("registration") ||
    label.includes("grade")
  ) {
    return "2 days";
  }

  return null;
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

    const estimate = getEstimatedReceive(documentTypeLabel);
    const estimateNote = estimate
      ? ` Estimated to receive: ${estimate} after acceptance.`
      : "";

    let message = "";

    switch (status) {
      case "submitted":
        message = `BCC Document Request: Hi ${studentName}, your request ${requestId} for ${documentTypeLabel} is PENDING.${
          estimateNote || " We'll text you again once there's an update."
        }`;
        break;
      case "processing":
        message = `BCC Document Request: Hi ${studentName}, your request ${requestId} for ${documentTypeLabel} is now being processed.${estimateNote}`;
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

    const MAX_SMS_LENGTH = 306;
    if (message.length > MAX_SMS_LENGTH) {
      message = message.substring(0, MAX_SMS_LENGTH - 3) + "...";
    }

    console.log("Sending SMS with message:", message);

    const result = await sendSMS(phoneNumber, message);

    if (!result.success) {
      console.error("Failed to send SMS notification:", result.error);
    } else {
      console.log(
        `SMS sent successfully to ${phoneNumber}, batchId: ${result.messageId}`,
      );
      if (result.messageStatusLink) {
        console.log(`SMS status link: ${result.messageStatusLink}`);
      }
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
        message = `BCC Queue: Hi ${studentName}, your ticket ${ticketNumber} for ${transactionLabel} is PENDING. Position: ${queuePosition || 1}. We'll notify you when it's your turn.`;
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

    if (message.length > 160) {
      message = message.substring(0, 157) + "...";
    }

    console.log("Sending ticket SMS with message:", message);

    const result = await sendSMS(phoneNumber, message);

    if (!result.success) {
      console.error("Failed to send ticket SMS notification:", result.error);
    } else {
      console.log(
        `Ticket SMS sent successfully to ${phoneNumber}, batchId: ${result.messageId}`,
      );
      if (result.messageStatusLink) {
        console.log(`SMS status link: ${result.messageStatusLink}`);
      }
    }
  } catch (error) {
    console.error("Error in sendTicketNotificationSMS:", error);
  }
}
