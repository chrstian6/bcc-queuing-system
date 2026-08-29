// actions/ticket-notifications.ts
"use server";

import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import { sendTicketNotificationEmail } from "@/lib/email";
import { sendTicketNotificationSMS } from "@/lib/sms";

interface NotificationResult {
  success: boolean;
  error?: string;
  notified?: boolean;
}

/**
 * Notify when a ticket is now being served
 */
export async function notifyNowServing(
  ticketNumber: string,
  staffName?: string,
): Promise<NotificationResult> {
  try {
    await connectDB();

    const ticket = await Ticket.findOne({
      ticketNumber,
      status: "serving",
    })
      .select("ticketNumber ticketId transactionType requester student")
      .lean();

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    const ticketData = ticket as any;
    const recipientEmail = ticketData.requester?.email;
    const recipientPhone = ticketData.requester?.contactNumber;

    const studentName =
      `${ticketData.student?.firstName || ""} ${ticketData.student?.lastName || ""}`.trim();

    let notified = false;

    // Send email notification
    if (recipientEmail) {
      const emailSent = await sendTicketNotificationEmail({
        email: recipientEmail,
        studentName: studentName || "Student",
        ticketNumber: ticketData.ticketNumber,
        ticketId: ticketData.ticketId,
        transactionType: ticketData.transactionType,
        queuePosition: 0,
        notificationType: "serving",
        staffName,
      });
      notified = emailSent;
    }

    // Send SMS notification
    if (recipientPhone) {
      console.log("SMS: Sending serving notification to:", recipientPhone);
      await sendTicketNotificationSMS(
        recipientPhone,
        studentName || "Student",
        ticketData.ticketNumber,
        ticketData.transactionType,
        "serving",
      ).catch((err) => console.error("Ticket serving SMS failed:", err));
      notified = true;
    }

    return { success: true, notified };
  } catch (error) {
    console.error("Error notifying now serving:", error);
    return { success: false, error: "Failed to send notification" };
  }
}

/**
 * Notify that they're next in line
 */
export async function notifyNextInLine(
  department: string,
  staffName?: string,
): Promise<NotificationResult> {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextTicket = await Ticket.findOne({
      department: department as any,
      status: "pending" as any,
      createdAt: { $gte: today, $lt: tomorrow },
    })
      .sort({ createdAt: 1 })
      .select("ticketNumber ticketId transactionType requester student")
      .lean();

    if (!nextTicket) {
      return { success: false, error: "No pending tickets" };
    }

    const ticketData = nextTicket as any;
    const recipientEmail = ticketData.requester?.email;
    const recipientPhone = ticketData.requester?.contactNumber;

    const studentName =
      `${ticketData.student?.firstName || ""} ${ticketData.student?.lastName || ""}`.trim();

    let notified = false;

    // Send email notification
    if (recipientEmail) {
      const emailSent = await sendTicketNotificationEmail({
        email: recipientEmail,
        studentName: studentName || "Student",
        ticketNumber: ticketData.ticketNumber,
        ticketId: ticketData.ticketId,
        transactionType: ticketData.transactionType,
        queuePosition: 1,
        notificationType: "next",
        staffName,
      });
      notified = emailSent;
    }

    // Send SMS notification
    if (recipientPhone) {
      console.log("SMS: Sending next-in-line notification to:", recipientPhone);
      await sendTicketNotificationSMS(
        recipientPhone,
        studentName || "Student",
        ticketData.ticketNumber,
        ticketData.transactionType,
        "next",
      ).catch((err) => console.error("Ticket next-in-line SMS failed:", err));
      notified = true;
    }

    return { success: true, notified };
  } catch (error) {
    console.error("Error notifying next in line:", error);
    return { success: false, error: "Failed to send notification" };
  }
}

/**
 * Notify the next two people in line
 */
export async function notifyNextTwoInLine(
  department: string,
  staffName?: string,
): Promise<NotificationResult> {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextTickets = await Ticket.find({
      department: department as any,
      status: "pending" as any,
      createdAt: { $gte: today, $lt: tomorrow },
    })
      .sort({ createdAt: 1 })
      .limit(2)
      .select("ticketNumber ticketId transactionType requester student")
      .lean();

    if (!nextTickets || nextTickets.length === 0) {
      return { success: false, error: "No pending tickets" };
    }

    let notifiedCount = 0;

    for (let i = 0; i < nextTickets.length; i++) {
      const ticketData = nextTickets[i] as any;
      const recipientEmail = ticketData.requester?.email;
      const recipientPhone = ticketData.requester?.contactNumber;

      if (recipientEmail || recipientPhone) {
        const studentName =
          `${ticketData.student?.firstName || ""} ${ticketData.student?.lastName || ""}`.trim();
        const position = i + 1;

        // Send email
        if (recipientEmail) {
          await sendTicketNotificationEmail({
            email: recipientEmail,
            studentName: studentName || "Student",
            ticketNumber: ticketData.ticketNumber,
            ticketId: ticketData.ticketId,
            transactionType: ticketData.transactionType,
            queuePosition: position,
            notificationType: position === 1 ? "next" : "reminder",
            staffName,
          });
        }

        // Send SMS
        if (recipientPhone) {
          console.log(
            `SMS: Sending position ${position} notification to:`,
            recipientPhone,
          );
          await sendTicketNotificationSMS(
            recipientPhone,
            studentName || "Student",
            ticketData.ticketNumber,
            ticketData.transactionType,
            position === 1 ? "next" : "reminder",
          ).catch((err) => console.error("Ticket reminder SMS failed:", err));
        }

        notifiedCount++;
      }
    }

    return { success: true, notified: notifiedCount > 0 };
  } catch (error) {
    console.error("Error notifying next two:", error);
    return { success: false, error: "Failed to send notifications" };
  }
}

/**
 * Notify a skipped/cancelled ticket holder
 */
export async function notifySkipped(
  ticketNumber: string,
  staffName?: string,
): Promise<NotificationResult> {
  try {
    await connectDB();

    const ticket = await Ticket.findOne({
      ticketNumber,
      status: "cancelled",
    })
      .select("ticketNumber ticketId transactionType requester student")
      .lean();

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    const ticketData = ticket as any;
    const recipientEmail = ticketData.requester?.email;
    const recipientPhone = ticketData.requester?.contactNumber;

    const studentName =
      `${ticketData.student?.firstName || ""} ${ticketData.student?.lastName || ""}`.trim();

    let notified = false;

    // Send email notification
    if (recipientEmail) {
      const emailSent = await sendTicketNotificationEmail({
        email: recipientEmail,
        studentName: studentName || "Student",
        ticketNumber: ticketData.ticketNumber,
        ticketId: ticketData.ticketId,
        transactionType: ticketData.transactionType,
        queuePosition: 0,
        notificationType: "skipped",
        staffName,
      });
      notified = emailSent;
    }

    // Send SMS notification
    if (recipientPhone) {
      console.log("SMS: Sending skipped notification to:", recipientPhone);
      await sendTicketNotificationSMS(
        recipientPhone,
        studentName || "Student",
        ticketData.ticketNumber,
        ticketData.transactionType,
        "skipped",
      ).catch((err) => console.error("Ticket skipped SMS failed:", err));
      notified = true;
    }

    return { success: true, notified };
  } catch (error) {
    console.error("Error notifying skipped:", error);
    return { success: false, error: "Failed to send notification" };
  }
}

/**
 * Notify all waiting tickets in a department
 */
export async function notifyAllWaiting(
  department: string,
): Promise<NotificationResult> {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const waitingTickets = await Ticket.find({
      department: department as any,
      status: "pending" as any,
      createdAt: { $gte: today, $lt: tomorrow },
    })
      .sort({ createdAt: 1 })
      .select("ticketNumber ticketId transactionType requester student")
      .lean();

    if (!waitingTickets || waitingTickets.length === 0) {
      return { success: false, error: "No pending tickets" };
    }

    let notifiedCount = 0;

    for (let i = 0; i < waitingTickets.length; i++) {
      const ticketData = waitingTickets[i] as any;
      const recipientEmail = ticketData.requester?.email;
      const recipientPhone = ticketData.requester?.contactNumber;

      if (recipientEmail || recipientPhone) {
        const studentName =
          `${ticketData.student?.firstName || ""} ${ticketData.student?.lastName || ""}`.trim();

        // Send email
        if (recipientEmail) {
          await sendTicketNotificationEmail({
            email: recipientEmail,
            studentName: studentName || "Student",
            ticketNumber: ticketData.ticketNumber,
            ticketId: ticketData.ticketId,
            transactionType: ticketData.transactionType,
            queuePosition: i + 1,
          });
        }

        // Send SMS
        if (recipientPhone) {
          await sendTicketNotificationSMS(
            recipientPhone,
            studentName || "Student",
            ticketData.ticketNumber,
            ticketData.transactionType,
            "waiting",
            i + 1,
          ).catch((err) => console.error("Ticket waiting SMS failed:", err));
        }

        notifiedCount++;
      }
    }

    return { success: true, notified: notifiedCount > 0 };
  } catch (error) {
    console.error("Error notifying all waiting:", error);
    return { success: false, error: "Failed to send notifications" };
  }
}
