// app/actions/ticket.ts
"use server";

import { headers } from "next/headers";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import Staff from "@/models/Staff";
import { revalidatePath } from "next/cache";
import { distributeTicketToAvailableStaff } from "./ticketNumberDistribution";
import { sendTicketNotificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/ratelimits";
import { withIdempotency, IdempotencyConflictError } from "@/lib/idempotency";
import {
  requireRole,
  requireSelfStaffOrAdmin,
  UNAUTHORIZED_ERROR,
} from "@/lib/authz";
import { ROLES } from "@/lib/roles";
import { getAppDayRange } from "@/lib/time";
import {
  buildServingUpdate,
  buildAdminServingUpdate,
  buildCompletedUpdate,
  buildCancelledUpdate,
} from "@/lib/ticketTransitions";

interface StudentData {
  schoolId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  year: string;
  campus: string;
}

interface GuardianData {
  firstName: string;
  lastName: string;
  middleName?: string;
  relationship: string;
}

interface CreateTicketData {
  transactionType: string;
  transactionDescription?: string;
  amount: number;
  student: StudentData;
  requesterType: "student" | "guardian";
  requesterEmail?: string;
  requesterContactNumber?: string;
  guardian?: GuardianData;
  idempotencyKey: string;
}

interface TicketResponse {
  success: boolean;
  error?: string;
  ticket?: {
    ticketNumber: string;
    ticketId: string;
    transactionType: string;
    transactionDescription?: string;
    amount: number;
    status: string;
    student: {
      schoolId: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      suffix?: string;
      year: string;
      campus: string;
    };
    createdAt: Date;
  };
}

const TICKET_CREATION_LIMIT = 5;
const TICKET_CREATION_WINDOW_MS = 10 * 60 * 1000;

const CASHIER_TRANSACTIONS = [
  "tuition-payment",
  "miscellaneous-fee",
  "document-payment",
  "other-school-fees",
  "assessment",
];

const TRANSACTIONS_NEEDING_DESCRIPTION = ["other-school-fees"];

/**
 * Create a new ticket - automatically distributed to available staff
 */
export async function createTicket(
  data: CreateTicketData,
): Promise<TicketResponse> {
  if (!data.idempotencyKey) {
    return { success: false, error: "Missing request identifier" };
  }

  const headersList = await headers();
  const ip = getClientIp(headersList);

  const rateLimit = await checkRateLimit(
    ip,
    "createTicket",
    TICKET_CREATION_LIMIT,
    TICKET_CREATION_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return {
      success: false,
      error:
        "Too many ticket requests from this device. Please try again later.",
    };
  }

  if (!data.transactionType) {
    return { success: false, error: "Transaction type is required" };
  }

  if (!CASHIER_TRANSACTIONS.includes(data.transactionType)) {
    return {
      success: false,
      error:
        "Invalid transaction type. Please select a valid cashier transaction.",
    };
  }

  if (
    TRANSACTIONS_NEEDING_DESCRIPTION.includes(data.transactionType) &&
    (!data.transactionDescription ||
      data.transactionDescription.trim().length === 0)
  ) {
    return {
      success: false,
      error: "Please specify the other school fee you want to pay for.",
    };
  }

  if (data.transactionDescription && data.transactionDescription.length > 200) {
    return {
      success: false,
      error: "Description must be 200 characters or less.",
    };
  }

  if (!data.student.firstName || !data.student.lastName) {
    return { success: false, error: "Student information is incomplete" };
  }

  if (!data.student.year || !data.student.campus) {
    return { success: false, error: "Year level and campus are required" };
  }

  if (!data.amount || data.amount <= 0) {
    return {
      success: false,
      error: "Amount is required and must be greater than 0",
    };
  }

  if (data.amount > 999999999999) {
    return { success: false, error: "Amount exceeds maximum limit" };
  }

  if (!data.requesterEmail && !data.requesterContactNumber) {
    return {
      success: false,
      error: "Please provide either email or contact number",
    };
  }

  // Guardian validation - only when requesterType is guardian
  if (data.requesterType === "guardian") {
    if (!data.guardian || !data.guardian.firstName || !data.guardian.lastName) {
      return {
        success: false,
        error: "Guardian first name and last name are required",
      };
    }
    if (!data.guardian.relationship) {
      return { success: false, error: "Guardian relationship is required" };
    }
  }

  const department = "cashier";

  await connectDB();
  const { start: today, end: tomorrow } = getAppDayRange();

  if (data.requesterEmail && data.student.schoolId) {
    const existingTicket = await Ticket.findOne({
      "student.schoolId": data.student.schoolId,
      "requester.email": data.requesterEmail.toLowerCase().trim(),
      transactionType: data.transactionType as any,
      status: { $in: ["pending", "serving"] as any },
      createdAt: { $gte: today, $lt: tomorrow },
    });

    if (existingTicket) {
      const formattedType = data.transactionType.replace(/-/g, " ");
      return {
        success: false,
        error: `You already have an active ticket (#${existingTicket.ticketNumber}) for ${formattedType}. Please wait for it to be served before requesting another.`,
      };
    }
  }

  try {
    return await withIdempotency<TicketResponse>(
      `createTicket:${data.idempotencyKey}`,
      async () => {
        const MAX_RETRIES = 3;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            await connectDB();

            const numberResult =
              await distributeTicketToAvailableStaff(department);

            if (
              !numberResult.success ||
              !numberResult.ticketNumber ||
              !numberResult.ticketId
            ) {
              // Availability failures get friendly, specific copy
              const reasonMessages: Record<string, string> = {
                "queue-closed":
                  "The queue is currently closed by the administrator. Please try again later.",
                "outside-hours":
                  "Cashier counters are currently outside operating hours. Please come back during open hours.",
                "counters-closed":
                  "All cashier counters are temporarily closed or on break. Please try again shortly.",
                "capacity-reached":
                  "Today's queue has reached its capacity. Please come back tomorrow.",
                "no-staff":
                  "No cashier staff are available right now. Please try again later.",
              };
              if (numberResult.failureReason) {
                return {
                  success: false,
                  error:
                    reasonMessages[numberResult.failureReason] ||
                    numberResult.error ||
                    "Ticket creation is currently unavailable.",
                };
              }
              throw new Error(
                numberResult.error || "Failed to generate ticket number",
              );
            }

            // Only create guardian if requesterType is guardian AND all required fields are present
            const guardianData =
              data.requesterType === "guardian" &&
              data.guardian &&
              data.guardian.relationship &&
              data.guardian.firstName &&
              data.guardian.lastName
                ? {
                    firstName: data.guardian.firstName,
                    lastName: data.guardian.lastName,
                    middleName: data.guardian.middleName || "",
                    relationship: data.guardian.relationship as any,
                  }
                : undefined;

            const ticket = new Ticket({
              ticketNumber: numberResult.ticketNumber,
              ticketId: numberResult.ticketId,
              transactionType: data.transactionType as any,
              transactionDescription:
                data.transactionDescription?.trim() || undefined,
              amount: data.amount,
              department: "cashier" as any,
              assignedTo: numberResult.staffId || null,
              student: {
                schoolId: data.student.schoolId || "",
                firstName: data.student.firstName,
                lastName: data.student.lastName,
                middleName: data.student.middleName || "",
                suffix: data.student.suffix || "",
                year: data.student.year,
                campus: data.student.campus,
              },
              requester: {
                type: data.requesterType as any,
                email: data.requesterEmail || "",
                contactNumber: data.requesterContactNumber || "",
              },
              guardian: guardianData,
              status: "pending" as any,
            });

            await ticket.save();

            const ticketObj = ticket.toObject();

            const recipientEmail = data.requesterEmail;
            if (recipientEmail) {
              sendTicketNotificationEmail({
                email: recipientEmail,
                studentName: `${data.student.firstName} ${data.student.lastName}`,
                ticketNumber: ticketObj.ticketNumber,
                ticketId: ticketObj.ticketId,
                transactionType: data.transactionType,
                queuePosition: numberResult.queuePosition,
              } as any).then((success) => {
                if (success) {
                  console.log(
                    `Ticket notification email sent to ${recipientEmail}`,
                  );
                } else {
                  console.log(
                    `Failed to send ticket notification email to ${recipientEmail}`,
                  );
                }
              });
            }

            revalidatePath("/admin/dashboard");
            revalidatePath("/staff/cashier/dashboard");
            revalidatePath("/student/dashboard");
            revalidatePath("/student/tickets");
            revalidatePath("/staff/cashier/queue");

            return {
              success: true,
              ticket: {
                ticketNumber: ticketObj.ticketNumber,
                ticketId: ticketObj.ticketId,
                transactionType: ticketObj.transactionType,
                transactionDescription: ticketObj.transactionDescription,
                amount: ticketObj.amount,
                status: ticketObj.status,
                student: {
                  schoolId: ticketObj.student.schoolId,
                  firstName: ticketObj.student.firstName,
                  lastName: ticketObj.student.lastName,
                  middleName: ticketObj.student.middleName || "",
                  suffix: ticketObj.student.suffix || "",
                  year: ticketObj.student.year,
                  campus: ticketObj.student.campus,
                },
                createdAt: ticketObj.createdAt,
              },
            };
          } catch (error: any) {
            console.error(
              `Error creating ticket (Attempt ${attempt + 1}/${MAX_RETRIES}):`,
              error.message || error,
            );

            if (error.code === 11000 && attempt < MAX_RETRIES - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, 100 * (attempt + 1)),
              );
              continue;
            }

            if (error.name === "ValidationError") {
              const messages = Object.values(error.errors).map(
                (e: any) => e.message,
              );
              return { success: false, error: messages.join(", ") };
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
      },
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return {
        success: false,
        error: "Your request is still being processed. Please wait a moment.",
      };
    }
    throw error;
  }
}

export async function getTicketByNumber(ticketNumber: string) {
  try {
    await connectDB();
    const ticket = await Ticket.findOne({ ticketNumber }).lean();
    if (!ticket) return { success: false, error: "Ticket not found" };
    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return { success: false, error: "Failed to fetch ticket" };
  }
}

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

export async function getPendingTickets() {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const tickets = await Ticket.find({
      department: "cashier" as any,
      status: "pending" as any,
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

export async function getTodayTickets() {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const tickets = await Ticket.find({
      department: "cashier" as any,
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

export async function getTicketsByType(transactionType: string) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const tickets = await Ticket.find({
      department: "cashier" as any,
      transactionType: transactionType as any,
    })
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching tickets by type:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

export async function getQueueStats() {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const [
      activeQueues,
      pendingTickets,
      servingTickets,
      completedToday,
      totalToday,
    ] = await Promise.all([
      Ticket.distinct("transactionType", {
        department: "cashier" as any,
        status: { $in: ["pending", "serving"] as any },
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      Ticket.countDocuments({
        department: "cashier" as any,
        status: "pending" as any,
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      Ticket.countDocuments({
        department: "cashier" as any,
        status: "serving" as any,
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      Ticket.countDocuments({
        department: "cashier" as any,
        status: "completed" as any,
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      Ticket.countDocuments({
        department: "cashier" as any,
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

export async function getNextToServe() {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const nextTicket = await Ticket.findOne({
      department: "cashier" as any,
      status: "pending" as any,
      createdAt: { $gte: today, $lt: tomorrow },
    })
      .sort({ createdAt: 1 })
      .lean();

    if (!nextTicket) return { success: false, error: "No pending tickets" };

    const pendingCount = await Ticket.countDocuments({
      department: "cashier" as any,
      status: "pending" as any,
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

export async function serveNextTicket() {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const nextTicket = await Ticket.findOneAndUpdate(
      {
        department: "cashier" as any,
        status: "pending" as any,
        createdAt: { $gte: today, $lt: tomorrow },
      },
      buildAdminServingUpdate(),
      { sort: { createdAt: 1 }, returnDocument: "after" },
    );

    if (!nextTicket) return { success: false, error: "No pending tickets" };

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");
    revalidatePath("/staff/cashier/queue");

    return { success: true, ticket: JSON.parse(JSON.stringify(nextTicket)) };
  } catch (error) {
    console.error("Error serving ticket:", error);
    return { success: false, error: "Failed to serve ticket" };
  }
}

export async function completeTicket(ticketNumber: string) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber, status: "serving" as any },
      buildCompletedUpdate("admin"),
      { returnDocument: "after" },
    );

    if (!ticket)
      return {
        success: false,
        error: "Ticket not found or not currently serving",
      };

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");
    revalidatePath("/staff/cashier/queue");

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error completing ticket:", error);
    return { success: false, error: "Failed to complete ticket" };
  }
}

export async function cancelTicket(ticketNumber: string) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    const changedBy =
      session.user.role === ROLES.ADMIN
        ? "admin"
        : session.user.staffId || "staff";

    await connectDB();
    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber, status: { $in: ["pending", "serving"] as any } },
      buildCancelledUpdate(changedBy),
      { returnDocument: "after" },
    );

    if (!ticket)
      return {
        success: false,
        error: "Ticket not found or cannot be cancelled",
      };

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");
    revalidatePath("/staff/cashier/queue");

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error cancelling ticket:", error);
    return { success: false, error: "Failed to cancel ticket" };
  }
}

export async function updateTicketStatus(
  ticketNumber: string,
  status: "pending" | "serving" | "completed" | "cancelled",
) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const updateData =
      status === "serving"
        ? buildAdminServingUpdate()
        : status === "completed"
          ? buildCompletedUpdate("admin")
          : status === "cancelled"
            ? buildCancelledUpdate("admin")
            : [
                {
                  $set: {
                    status: "pending",
                    statusHistory: {
                      $concatArrays: [
                        { $ifNull: ["$statusHistory", []] },
                        [
                          {
                            status: "pending",
                            timestamp: "$$NOW",
                            changedBy: "admin",
                          },
                        ],
                      ],
                    },
                  },
                },
              ];

    const ticket = await Ticket.findOneAndUpdate({ ticketNumber }, updateData, {
      returnDocument: "after",
    });

    if (!ticket) return { success: false, error: "Ticket not found" };

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");
    revalidatePath("/staff/cashier/queue");

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return { success: false, error: "Failed to update ticket status" };
  }
}

export async function getAllTickets(filters?: {
  status?: string;
  transactionType?: string;
  date?: string;
}) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const query: any = { department: "cashier" as any };
    if (filters?.status) query.status = filters.status as any;
    if (filters?.transactionType)
      query.transactionType = filters.transactionType as any;
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

export async function getDepartmentTickets(
  department: string,
  filters?: { status?: string; date?: string },
) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    if (department !== "cashier")
      return { success: false, error: "Only cashier department is supported" };

    const query: any = { department: "cashier" as any };
    if (filters?.status) query.status = filters.status as any;
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
    console.error("Error fetching cashier tickets:", error);
    return { success: false, error: "Failed to fetch cashier tickets" };
  }
}

export async function getStaffTickets(
  staffId: string,
  filters?: { status?: string; date?: string },
) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const query: any = {
      department: "cashier" as any,
      $or: [{ servedBy: staffId }, { assignedTo: staffId }],
    };
    if (filters?.status) query.status = filters.status as any;
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

export async function getNextTicketForStaff(staffId: string) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const staff = await Staff.findOne({ staffId });
    if (!staff) return { success: false, error: "Staff not found" };

    const { start: today, end: tomorrow } = getAppDayRange();

    const nextTicket = await Ticket.findOne({
      department: "cashier" as any,
      status: "pending" as any,
      createdAt: { $gte: today, $lt: tomorrow },
    })
      .sort({ createdAt: 1 })
      .lean();

    if (!nextTicket)
      return {
        success: false,
        error: "No pending tickets for cashier department",
      };

    const pendingCount = await Ticket.countDocuments({
      department: "cashier" as any,
      status: "pending" as any,
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

export async function serveTicket(ticketNumber: string, staffId: string) {
  try {
    const session = await requireSelfStaffOrAdmin(staffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const staff = await Staff.findOne({ staffId });
    if (!staff) return { success: false, error: "Staff not found" };

    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber, status: "pending" as any, department: "cashier" as any },
      buildServingUpdate(staffId),
      { returnDocument: "after" },
    );

    if (!ticket)
      return {
        success: false,
        error: "Ticket not found or already being served",
      };

    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/cashier/queue");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error serving ticket:", error);
    return { success: false, error: "Failed to serve ticket" };
  }
}

export async function completeServedTicket(
  ticketNumber: string,
  staffId: string,
) {
  try {
    const session = await requireSelfStaffOrAdmin(staffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber, status: "serving" as any, servedBy: staffId },
      buildCompletedUpdate(staffId),
      { returnDocument: "after" },
    );

    if (!ticket)
      return {
        success: false,
        error: "Ticket not found or not being served by you",
      };

    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/cashier/queue");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error completing ticket:", error);
    return { success: false, error: "Failed to complete ticket" };
  }
}

export async function getStaffQueueStats(staffId: string) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const staff = await Staff.findOne({ staffId });
    if (!staff) return { success: false, error: "Staff not found" };

    const { start: today, end: tomorrow } = getAppDayRange();

    const [pendingDept, servingByStaff, completedByStaff, totalDept] =
      await Promise.all([
        Ticket.countDocuments({
          department: "cashier" as any,
          status: "pending" as any,
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        Ticket.countDocuments({
          servedBy: staffId,
          status: "serving" as any,
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        Ticket.countDocuments({
          servedBy: staffId,
          status: "completed" as any,
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        Ticket.countDocuments({
          department: "cashier" as any,
          createdAt: { $gte: today, $lt: tomorrow },
        }),
      ]);

    return {
      success: true,
      stats: {
        department: "cashier",
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
