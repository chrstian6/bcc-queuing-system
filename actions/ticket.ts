// app/actions/ticket.ts
"use server";

import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import Staff from "@/models/Staff";
import { revalidatePath } from "next/cache";
import { distributeTicketToAvailableStaff } from "./ticketNumberDistribution";
import { sendTicketNotificationEmail } from "@/lib/email";
import { getDepartmentForTransaction } from "@/lib/ticketUtils";

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
  transactionType: string;
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
 * Create a new ticket - automatically distributed to available staff
 */
export async function createTicket(
  data: CreateTicketData,
): Promise<TicketResponse> {
  // Validate input data
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

  // Get the department for this transaction type
  const department = getDepartmentForTransaction(data.transactionType);

  // Retry logic for handling concurrent requests
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await connectDB();

      // Distribute ticket to available staff in the department
      const numberResult = await distributeTicketToAvailableStaff(department);

      if (
        !numberResult.success ||
        !numberResult.ticketNumber ||
        !numberResult.ticketId
      ) {
        throw new Error(
          numberResult.error || "Failed to generate ticket number",
        );
      }

      // Create ticket with the distributed number
      const ticket = new Ticket({
        ticketNumber: numberResult.ticketNumber,
        ticketId: numberResult.ticketId,
        transactionType: data.transactionType,
        department: department,
        assignedTo: numberResult.staffId || null,
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
        status: "pending",
      });

      await ticket.save();

      // Convert to plain object (remove Mongoose document methods)
      const ticketObj = ticket.toObject();

      // Send email notification asynchronously (don't block response)
      const recipientEmail = data.requesterEmail;
      if (recipientEmail) {
        // Fire and forget - don't await to avoid blocking response
        sendTicketNotificationEmail({
          email: recipientEmail,
          studentName: `${data.student.firstName} ${data.student.lastName}`,
          ticketNumber: ticketObj.ticketNumber,
          ticketId: ticketObj.ticketId,
          transactionType: data.transactionType,
          queuePosition: numberResult.queuePosition,
        }).then((success) => {
          if (success) {
            console.log(`Ticket notification email sent to ${recipientEmail}`);
          } else {
            console.log(
              `Failed to send ticket notification email to ${recipientEmail}`,
            );
          }
        });
      }

      revalidatePath("/public/schedule");
      revalidatePath("/admin/dashboard");

      // Revalidate department paths
      if (department) {
        revalidatePath(`/staff/${department}/dashboard`);
        revalidatePath(`/staff/${department}/queue`);
      }

      // Return plain object (no Mongoose methods)
      return {
        success: true,
        ticket: {
          ticketNumber: ticketObj.ticketNumber,
          ticketId: ticketObj.ticketId,
          transactionType: ticketObj.transactionType,
          status: ticketObj.status,
          student: {
            schoolId: ticketObj.student.schoolId,
            firstName: ticketObj.student.firstName,
            lastName: ticketObj.student.lastName,
            middleName: ticketObj.student.middleName || "",
            suffix: ticketObj.student.suffix || "",
            year: ticketObj.student.year,
            section: ticketObj.student.section,
          },
          createdAt: ticketObj.createdAt,
        },
      };
    } catch (error: any) {
      console.error(
        `Error creating ticket (Attempt ${attempt + 1}/${MAX_RETRIES}):`,
        error.message || error,
      );

      // If it's a duplicate key error, retry
      if (error.code === 11000 && attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * (attempt + 1)),
        );
        continue;
      }

      // For validation errors, return the message
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((e: any) => e.message);
        return {
          success: false,
          error: messages.join(", "),
        };
      }

      return {
        success: false,
        error: "Failed to create ticket. Please try again.",
      };
    }
  }

  return {
    success: false,
    error: "Failed to create ticket after multiple attempts.",
  };
}

/**
 * Get ticket by ticket number
 */
export async function getTicketByNumber(ticketNumber: string) {
  try {
    await connectDB();
    const ticket = await Ticket.findOne({ ticketNumber }).lean();
    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }
    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
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
    const tickets = await Ticket.find({ "student.schoolId": schoolId })
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
    })
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
    })
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
    const tickets = await Ticket.find({ transactionType })
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
      }),
      Ticket.countDocuments({
        status: "pending",
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      Ticket.countDocuments({
        status: "serving",
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      Ticket.countDocuments({
        status: "completed",
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      Ticket.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
      }),
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
    })
      .sort({ createdAt: 1 })
      .lean();

    if (!nextTicket) {
      return { success: false, error: "No pending tickets" };
    }

    const pendingCount = await Ticket.countDocuments({
      status: "pending",
      createdAt: { $gte: today, $lt: tomorrow },
    });

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
      },
      {
        status: "serving",
        servedAt: new Date(),
      },
      {
        sort: { createdAt: 1 },
        returnDocument: "after",
      },
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
      { ticketNumber, status: "serving" },
      {
        status: "completed",
        completedAt: new Date(),
      },
      { returnDocument: "after" },
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
      {
        ticketNumber,
        status: { $in: ["pending", "serving"] },
      },
      {
        status: "cancelled",
        cancelledAt: new Date(),
      },
      { returnDocument: "after" },
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
    if (status === "serving") updateData.servedAt = new Date();
    else if (status === "completed") updateData.completedAt = new Date();
    else if (status === "cancelled") updateData.cancelledAt = new Date();

    const ticket = await Ticket.findOneAndUpdate({ ticketNumber }, updateData, {
      returnDocument: "after",
    });

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
    if (filters?.status) query.status = filters.status;
    if (filters?.transactionType)
      query.transactionType = filters.transactionType;
    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      query.createdAt = { $gte: date, $lt: nextDate };
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 }).lean();
    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching all tickets:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

// ============================================
// STAFF-SPECIFIC FUNCTIONS
// ============================================

/**
 * Get tickets for a specific department (staff view)
 */
export async function getDepartmentTickets(
  department: string,
  filters?: {
    status?: string;
    date?: string;
  },
) {
  try {
    await connectDB();

    const query: any = { department };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      query.createdAt = { $gte: date, $lt: nextDate };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.createdAt = { $gte: today, $lt: tomorrow };
    }

    const tickets = await Ticket.find(query).sort({ createdAt: 1 }).lean();

    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error(`Error fetching ${department} tickets:`, error);
    return { success: false, error: `Failed to fetch ${department} tickets` };
  }
}

/**
 * Get tickets assigned to or served by a specific staff member
 */
export async function getStaffTickets(
  staffId: string,
  filters?: {
    status?: string;
    date?: string;
  },
) {
  try {
    await connectDB();

    const staff = await Staff.findOne({ staffId });

    const query: any = {
      $or: [
        { servedBy: staffId },
        { assignedTo: staffId },
        ...(staff?.roleName ? [{ department: staff.roleName }] : []),
      ],
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      query.createdAt = { $gte: date, $lt: nextDate };
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 }).lean();

    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching staff tickets:", error);
    return { success: false, error: "Failed to fetch staff tickets" };
  }
}

/**
 * Get next available ticket for a staff member to serve
 */
export async function getNextTicketForStaff(staffId: string) {
  try {
    await connectDB();

    const staff = await Staff.findOne({ staffId });
    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextTicket = await Ticket.findOne({
      department: staff.roleName,
      status: "pending",
      createdAt: { $gte: today, $lt: tomorrow },
    })
      .sort({ createdAt: 1 })
      .lean();

    if (!nextTicket) {
      return {
        success: false,
        error: `No pending tickets for ${staff.roleName} department`,
      };
    }

    const pendingCount = await Ticket.countDocuments({
      department: staff.roleName,
      status: "pending",
      createdAt: { $gte: today, $lt: tomorrow },
    });

    return {
      success: true,
      ticket: JSON.parse(JSON.stringify(nextTicket)),
      pendingCount,
    };
  } catch (error) {
    console.error("Error getting next ticket for staff:", error);
    return { success: false, error: "Failed to get next ticket" };
  }
}

/**
 * Assign and serve a ticket to a staff member
 */
export async function serveTicket(ticketNumber: string, staffId: string) {
  try {
    await connectDB();

    const staff = await Staff.findOne({ staffId });
    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    // Find and update the ticket - NO DATE FILTER
    const ticket = await Ticket.findOneAndUpdate(
      {
        ticketNumber,
        status: "pending",
        $or: [{ assignedTo: staffId }, { department: staff.roleName }],
      },
      {
        status: "serving",
        servedBy: staffId,
        assignedTo: staffId,
        department: staff.roleName,
        servedAt: new Date(),
      },
      { returnDocument: "after" },
    );

    if (!ticket) {
      return {
        success: false,
        error: "Ticket not found or already being served",
      };
    }

    revalidatePath(`/staff/${staff.roleName}/dashboard`);
    revalidatePath(`/staff/${staff.roleName}/queue`);

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error serving ticket:", error);
    return { success: false, error: "Failed to serve ticket" };
  }
}

/**
 * Complete a ticket served by a staff member
 */
export async function completeServedTicket(
  ticketNumber: string,
  staffId: string,
) {
  try {
    await connectDB();

    // Find and update - NO DATE FILTER
    const ticket = await Ticket.findOneAndUpdate(
      {
        ticketNumber,
        status: "serving",
        servedBy: staffId,
      },
      {
        status: "completed",
        completedAt: new Date(),
      },
      { returnDocument: "after" },
    );

    if (!ticket) {
      return {
        success: false,
        error: "Ticket not found or not being served by you",
      };
    }

    const staff = await Staff.findOne({ staffId });
    if (staff) {
      revalidatePath(`/staff/${staff.roleName}/dashboard`);
      revalidatePath(`/staff/${staff.roleName}/queue`);
    }

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error completing ticket:", error);
    return { success: false, error: "Failed to complete ticket" };
  }
}

/**
 * Get staff queue stats for dashboard
 */
export async function getStaffQueueStats(staffId: string) {
  try {
    await connectDB();

    const staff = await Staff.findOne({ staffId });
    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [pendingDept, servingByStaff, completedByStaff, totalDept] =
      await Promise.all([
        Ticket.countDocuments({
          department: staff.roleName,
          status: "pending",
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        Ticket.countDocuments({
          servedBy: staffId,
          status: "serving",
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        Ticket.countDocuments({
          servedBy: staffId,
          status: "completed",
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        Ticket.countDocuments({
          department: staff.roleName,
          createdAt: { $gte: today, $lt: tomorrow },
        }),
      ]);

    return {
      success: true,
      stats: {
        department: staff.roleName,
        pendingInDepartment: pendingDept,
        currentlyServing: servingByStaff,
        completedToday: completedByStaff,
        totalDepartmentTickets: totalDept,
      },
    };
  } catch (error) {
    console.error("Error getting staff queue stats:", error);
    return { success: false, error: "Failed to get staff queue stats" };
  }
}
