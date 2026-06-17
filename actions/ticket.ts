// app/actions/ticket.ts
"use server";

import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import { revalidatePath } from "next/cache";
import type { ITicket } from "@/models/Ticket";

interface StudentData {
  schoolId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  year: string;
  section: string;
}

interface GuardianData {
  firstName: string;
  lastName: string;
  middleName?: string;
  relationship: string;
}

interface CreateTicketData {
  transactionType: "certificate" | "tor" | "grades" | "assessment";
  student: StudentData;
  requesterType: "student" | "guardian";
  requesterEmail?: string;
  requesterContactNumber?: string;
  guardian?: GuardianData;
}

interface TicketResponse {
  success: boolean;
  error?: string;
  ticket?: {
    ticketNumber: string;
    ticketId: string;
    transactionType: string;
    status: string;
    student: StudentData;
    createdAt: Date;
  };
}

/**
 * Generate queue ticket number
 * Simple sequential numbering across all transaction types
 */
async function generateTicketNumber(
  transactionType: string,
): Promise<{ ticketNumber: string; ticketId: string }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Count ALL today's tickets for queue position
  const todayCount = await Ticket.countDocuments({
    createdAt: {
      $gte: today,
      $lt: tomorrow,
    },
  } as any);

  const nextNumber = todayCount + 1;
  const paddedNumber = String(nextNumber).padStart(3, "0");

  const codes: Record<string, string> = {
    certificate: "CERT",
    tor: "TOR",
    grades: "GRD",
    assessment: "ASM",
  };
  const code = codes[transactionType] || "GEN";

  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  return {
    ticketNumber: paddedNumber,
    ticketId: `BCC-${dateStr}-${code}-${paddedNumber}`,
  };
}

/**
 * Create a new ticket
 */
export async function createTicket(
  data: CreateTicketData,
): Promise<TicketResponse> {
  try {
    if (!data.transactionType) {
      return { success: false, error: "Transaction type is required" };
    }

    if (
      !data.student.schoolId ||
      !data.student.firstName ||
      !data.student.lastName
    ) {
      return { success: false, error: "Student information is incomplete" };
    }

    if (!data.student.year || !data.student.section) {
      return { success: false, error: "Year level and section are required" };
    }

    if (!data.requesterEmail && !data.requesterContactNumber) {
      return {
        success: false,
        error: "Please provide either email or contact number",
      };
    }

    if (data.requesterType === "guardian") {
      if (
        !data.guardian ||
        !data.guardian.firstName ||
        !data.guardian.lastName ||
        !data.guardian.relationship
      ) {
        return { success: false, error: "Guardian information is incomplete" };
      }
    }

    await connectDB();

    const { ticketNumber, ticketId } = await generateTicketNumber(
      data.transactionType,
    );

    const ticket = new Ticket({
      ticketNumber,
      ticketId,
      transactionType: data.transactionType,
      student: {
        schoolId: data.student.schoolId,
        firstName: data.student.firstName,
        lastName: data.student.lastName,
        middleName: data.student.middleName || "",
        suffix: data.student.suffix || "",
        year: data.student.year,
        section: data.student.section,
      },
      requester: {
        type: data.requesterType,
        email: data.requesterEmail || "",
        contactNumber: data.requesterContactNumber || "",
      },
      guardian:
        data.requesterType === "guardian" && data.guardian
          ? {
              firstName: data.guardian.firstName,
              lastName: data.guardian.lastName,
              middleName: data.guardian.middleName || "",
              relationship: data.guardian.relationship,
            }
          : undefined,
    });

    await ticket.save();

    revalidatePath("/get-ticket");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      ticket: {
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket.ticketId,
        transactionType: ticket.transactionType,
        status: ticket.status,
        student: ticket.student,
        createdAt: ticket.createdAt,
      },
    };
  } catch (error: any) {
    console.error("Error creating ticket:", error);

    if (error.code === 11000) {
      try {
        await connectDB();
        const { ticketNumber, ticketId } = await generateTicketNumber(
          data.transactionType,
        );

        const ticket = new Ticket({
          ticketNumber,
          ticketId,
          transactionType: data.transactionType,
          student: {
            schoolId: data.student.schoolId,
            firstName: data.student.firstName,
            lastName: data.student.lastName,
            middleName: data.student.middleName || "",
            suffix: data.student.suffix || "",
            year: data.student.year,
            section: data.student.section,
          },
          requester: {
            type: data.requesterType,
            email: data.requesterEmail || "",
            contactNumber: data.requesterContactNumber || "",
          },
          guardian:
            data.requesterType === "guardian" && data.guardian
              ? {
                  firstName: data.guardian.firstName,
                  lastName: data.guardian.lastName,
                  middleName: data.guardian.middleName || "",
                  relationship: data.guardian.relationship,
                }
              : undefined,
        });

        await ticket.save();

        revalidatePath("/get-ticket");
        revalidatePath("/admin/dashboard");

        return {
          success: true,
          ticket: {
            ticketNumber: ticket.ticketNumber,
            ticketId: ticket.ticketId,
            transactionType: ticket.transactionType,
            status: ticket.status,
            student: ticket.student,
            createdAt: ticket.createdAt,
          },
        };
      } catch (retryError) {
        console.error("Retry error:", retryError);
        return {
          success: false,
          error: "Failed to create ticket. Please try again.",
        };
      }
    }

    return {
      success: false,
      error: "Failed to create ticket. Please try again.",
    };
  }
}

/**
 * Get ticket by ticket number
 */
export async function getTicketByNumber(ticketNumber: string) {
  try {
    await connectDB();

    const ticket = await Ticket.findOne({ ticketNumber } as any).lean();

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    return {
      success: true,
      ticket: JSON.parse(JSON.stringify(ticket)),
    };
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return { success: false, error: "Failed to fetch ticket" };
  }
}

/**
 * Get tickets by school ID
 */
export async function getTicketsBySchoolId(schoolId: string) {
  try {
    await connectDB();

    const tickets = await Ticket.find({ "student.schoolId": schoolId } as any)
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

/**
 * Get all pending tickets (FIFO order)
 */
export async function getPendingTickets() {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tickets = await Ticket.find({
      status: "pending",
      createdAt: { $gte: today, $lt: tomorrow },
    } as any)
      .sort({ createdAt: 1 })
      .lean();

    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching pending tickets:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

/**
 * Get today's tickets
 */
export async function getTodayTickets() {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tickets = await Ticket.find({
      createdAt: { $gte: today, $lt: tomorrow },
    } as any)
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching today's tickets:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

/**
 * Get tickets by transaction type
 */
export async function getTicketsByType(transactionType: string) {
  try {
    await connectDB();

    const tickets = await Ticket.find({ transactionType } as any)
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching tickets by type:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

/**
 * Get queue statistics for admin dashboard
 */
export async function getQueueStats() {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      activeQueues,
      pendingTickets,
      servingTickets,
      completedToday,
      totalToday,
    ] = await Promise.all([
      Ticket.distinct("transactionType", {
        status: { $in: ["pending", "serving"] },
        createdAt: { $gte: today, $lt: tomorrow },
      } as any),
      Ticket.countDocuments({
        status: "pending",
        createdAt: { $gte: today, $lt: tomorrow },
      } as any),
      Ticket.countDocuments({
        status: "serving",
        createdAt: { $gte: today, $lt: tomorrow },
      } as any),
      Ticket.countDocuments({
        status: "completed",
        createdAt: { $gte: today, $lt: tomorrow },
      } as any),
      Ticket.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
      } as any),
    ]);

    return {
      success: true,
      stats: {
        activeQueues: activeQueues.length,
        pendingTickets,
        servingTickets,
        completedToday,
        totalToday,
      },
    };
  } catch (error) {
    console.error("Error getting queue stats:", error);
    return { success: false, error: "Failed to get queue stats" };
  }
}

/**
 * Get the next ticket to serve (FIFO)
 */
export async function getNextToServe() {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextTicket = await Ticket.findOne({
      status: "pending",
      createdAt: { $gte: today, $lt: tomorrow },
    } as any)
      .sort({ createdAt: 1 })
      .lean();

    if (!nextTicket) {
      return { success: false, error: "No pending tickets" };
    }

    const pendingCount = await Ticket.countDocuments({
      status: "pending",
      createdAt: { $gte: today, $lt: tomorrow },
    } as any);

    return {
      success: true,
      ticket: JSON.parse(JSON.stringify(nextTicket)),
      pendingCount,
    };
  } catch (error) {
    console.error("Error getting next ticket:", error);
    return { success: false, error: "Failed to get next ticket" };
  }
}

/**
 * Serve the next ticket
 */
export async function serveNextTicket() {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextTicket = await Ticket.findOneAndUpdate(
      {
        status: "pending",
        createdAt: { $gte: today, $lt: tomorrow },
      } as any,
      {
        status: "serving",
        servedAt: new Date(),
      },
      {
        sort: { createdAt: 1 },
        new: true,
      } as any,
    );

    if (!nextTicket) {
      return { success: false, error: "No pending tickets" };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");

    return { success: true, ticket: JSON.parse(JSON.stringify(nextTicket)) };
  } catch (error) {
    console.error("Error serving ticket:", error);
    return { success: false, error: "Failed to serve ticket" };
  }
}

/**
 * Complete a ticket
 */
export async function completeTicket(ticketNumber: string) {
  try {
    await connectDB();

    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber, status: "serving" } as any,
      {
        status: "completed",
        completedAt: new Date(),
      },
      { new: true } as any,
    );

    if (!ticket) {
      return {
        success: false,
        error: "Ticket not found or not currently serving",
      };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error completing ticket:", error);
    return { success: false, error: "Failed to complete ticket" };
  }
}

/**
 * Cancel a ticket
 */
export async function cancelTicket(ticketNumber: string) {
  try {
    await connectDB();

    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber, status: { $in: ["pending", "serving"] } } as any,
      {
        status: "cancelled",
        cancelledAt: new Date(),
      },
      { new: true } as any,
    );

    if (!ticket) {
      return {
        success: false,
        error: "Ticket not found or cannot be cancelled",
      };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error cancelling ticket:", error);
    return { success: false, error: "Failed to cancel ticket" };
  }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketNumber: string,
  status: "pending" | "serving" | "completed" | "cancelled",
) {
  try {
    await connectDB();

    const updateData: any = { status };

    if (status === "serving") {
      updateData.servedAt = new Date();
    } else if (status === "completed") {
      updateData.completedAt = new Date();
    } else if (status === "cancelled") {
      updateData.cancelledAt = new Date();
    }

    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber } as any,
      updateData,
      { new: true } as any,
    );

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return { success: false, error: "Failed to update ticket status" };
  }
}

/**
 * Get all tickets with optional filters
 */
export async function getAllTickets(filters?: {
  status?: string;
  transactionType?: string;
  date?: string;
}) {
  try {
    await connectDB();

    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.transactionType) {
      query.transactionType = filters.transactionType;
    }

    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      query.createdAt = {
        $gte: date,
        $lt: nextDate,
      };
    }

    const tickets = await Ticket.find(query as any)
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching all tickets:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}
