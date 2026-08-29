// actions/ticket.ts
"use server";

import { headers } from "next/headers";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import Staff from "@/models/Staff";
import { revalidatePath } from "next/cache";
import { distributeTicketToAvailableStaff } from "./ticketNumberDistribution";
import { sendTicketNotificationEmail } from "@/lib/email";
import { sendTicketNotificationSMS } from "@/lib/sms";
import { checkRateLimit, getClientIp } from "@/lib/ratelimits";
import { withIdempotency, IdempotencyConflictError } from "@/lib/idempotency";
import {
  requireRole,
  requireSelfStaffOrAdmin,
  UNAUTHORIZED_ERROR,
} from "@/lib/authz";
import { ROLES } from "@/lib/roles";
import { getAppDayRange } from "@/lib/time";

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
  department: string;
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
    department?: string;
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

const DEPARTMENT_TRANSACTIONS: Record<string, string[]> = {
  dean: [
    "grade-appeal",
    "academic-concern",
    "course-approval",
    "student-discipline",
    "faculty-concern",
    "curriculum-review",
    "academic-advisory",
  ],
  cashier: [
    "tuition-payment",
    "miscellaneous-fee",
    "document-payment",
    "other-school-fees",
    "assessment",
  ],
  registrar: [
    "certificate-enrollment",
    "transcript-records",
    "request-grades",
    "request-assessment",
    "good-moral",
    "diploma",
    "other-document",
  ],
};

const TRANSACTIONS_NEEDING_DESCRIPTION = [
  "other-school-fees",
  "other-document",
];

/**
 * Helper function to resolve department from staff record
 */
function resolveDepartment(staffData: any, session: any): string {
  return (
    staffData?.staffRole ||
    staffData?.department ||
    session?.user?.staffRole ||
    "cashier"
  );
}

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

  const department = data.department || "cashier";
  const validTransactions = DEPARTMENT_TRANSACTIONS[department] || [];

  if (!validTransactions.includes(data.transactionType)) {
    return {
      success: false,
      error: `Invalid transaction type for ${department} department.`,
    };
  }

  if (
    TRANSACTIONS_NEEDING_DESCRIPTION.includes(data.transactionType) &&
    (!data.transactionDescription ||
      data.transactionDescription.trim().length === 0)
  ) {
    return {
      success: false,
      error: "Please provide additional details for this transaction.",
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

  if (department === "cashier") {
    if (!data.amount || data.amount <= 0) {
      return {
        success: false,
        error: "Amount is required and must be greater than 0",
      };
    }

    if (data.amount > 999999999999) {
      return { success: false, error: "Amount exceeds maximum limit" };
    }
  }

  if (!data.requesterEmail && !data.requesterContactNumber) {
    return {
      success: false,
      error: "Please provide either email or contact number",
    };
  }

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

  await connectDB();
  const { start: today, end: tomorrow } = getAppDayRange();

  if (data.requesterEmail && data.student.schoolId) {
    const existingTicket = await Ticket.findOne({
      "student.schoolId": data.student.schoolId,
      "requester.email": data.requesterEmail.toLowerCase().trim(),
      transactionType: data.transactionType as any,
      status: { $in: ["pending", "serving"] as any },
      createdAt: { $gte: today, $lt: tomorrow },
    } as any);

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
              const reasonMessages: Record<string, string> = {
                "queue-closed":
                  "The queue is currently closed by the administrator. Please try again later.",
                "outside-hours":
                  "Counters are currently outside operating hours. Please come back during open hours.",
                "counters-closed":
                  "All counters are temporarily closed or on break. Please try again shortly.",
                "capacity-reached":
                  "Today's queue has reached its capacity. Please come back tomorrow.",
                "no-staff":
                  "No staff are available right now. Please try again later.",
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
              amount: department === "cashier" ? data.amount : 0,
              department: department as any,
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

            if (data.requesterContactNumber) {
              const studentName = `${data.student.firstName} ${data.student.lastName}`;

              sendTicketNotificationSMS(
                data.requesterContactNumber,
                studentName,
                ticketObj.ticketNumber,
                data.transactionType,
                "submitted",
                numberResult.queuePosition,
              ).catch((err) =>
                console.error("Ticket creation SMS failed:", err),
              );
            }

            revalidatePath("/admin/dashboard");
            revalidatePath("/staff/cashier/dashboard");
            revalidatePath("/staff/dean/dashboard");
            revalidatePath("/staff/registrar/dashboard");
            revalidatePath("/student/dashboard");
            revalidatePath("/student/tickets");
            revalidatePath("/staff/cashier/queue");
            revalidatePath("/staff/dean/queue");
            revalidatePath("/staff/registrar/queue");

            return {
              success: true,
              ticket: {
                ticketNumber: ticketObj.ticketNumber,
                ticketId: ticketObj.ticketId,
                transactionType: ticketObj.transactionType,
                transactionDescription: ticketObj.transactionDescription,
                amount: ticketObj.amount,
                status: ticketObj.status,
                department: ticketObj.department,
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

// ============================================================
// Get functions with FIXED department resolution
// ============================================================

export async function getTicketByNumber(ticketNumber: string) {
  try {
    await connectDB();
    const ticket = await Ticket.findOne({ ticketNumber } as any).lean();
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

export async function getPendingTickets(department?: string) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const query: any = {
      status: "pending",
      createdAt: { $gte: today, $lt: tomorrow },
    };

    if (department) {
      query.department = department;
    }

    const tickets = await Ticket.find(query as any)
      .sort({ createdAt: 1 })
      .lean();

    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching pending tickets:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

export async function getTodayTickets(department?: string) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const query: any = {
      createdAt: { $gte: today, $lt: tomorrow },
    };

    if (department) {
      query.department = department;
    }

    const tickets = await Ticket.find(query as any)
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
      transactionType: transactionType as any,
    } as any)
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching tickets by type:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

export async function getQueueStats(department?: string) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const query: any = {
      status: { $in: ["pending", "serving"] },
      createdAt: { $gte: today, $lt: tomorrow },
    };

    if (department) {
      query.department = department;
    }

    const [
      activeQueues,
      pendingTickets,
      servingTickets,
      completedToday,
      totalToday,
    ] = await Promise.all([
      Ticket.distinct("transactionType", query as any),
      Ticket.countDocuments({ ...query, status: "pending" } as any),
      Ticket.countDocuments({ ...query, status: "serving" } as any),
      Ticket.countDocuments({
        ...query,
        status: "completed",
      } as any),
      Ticket.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
        ...(department ? { department } : {}),
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

export async function getNextToServe(department?: string) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const query: any = {
      status: "pending",
      createdAt: { $gte: today, $lt: tomorrow },
    };

    if (department) {
      query.department = department;
    }

    const nextTicket = await Ticket.findOne(query as any)
      .sort({ createdAt: 1 })
      .lean();

    if (!nextTicket) return { success: false, error: "No pending tickets" };

    const pendingCount = await Ticket.countDocuments(query as any);

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

// ============================================================
// FIXED: Staff functions with proper department resolution
// ============================================================

export async function getStaffQueueData(staffId: string) {
  try {
    const session = await requireSelfStaffOrAdmin(staffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();

    const staff = await Staff.findOne({ staffId } as any).lean();

    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    const staffData = staff as any;
    const department = resolveDepartment(staffData, session);

    console.log(
      `getStaffQueueData - Resolved department: ${department} for staff: ${staffId}`,
    );

    const query: any = {
      department: department,
      status: { $in: ["pending", "serving"] },
    };

    const tickets = await Ticket.find(query as any)
      .sort({ createdAt: 1 })
      .lean();

    return {
      success: true,
      tickets: JSON.parse(JSON.stringify(tickets)),
      department,
    };
  } catch (error) {
    console.error("Error fetching staff queue data:", error);
    return { success: false, error: "Failed to fetch queue data" };
  }
}

export async function getStaffAllTickets(
  staffId: string,
  filters?: { status?: string; date?: string },
) {
  try {
    const session = await requireSelfStaffOrAdmin(staffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();

    const staff = await Staff.findOne({ staffId } as any).lean();

    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    const staffData = staff as any;
    const department = resolveDepartment(staffData, session);

    console.log(
      `getStaffAllTickets - Resolved department: ${department} for staff: ${staffId}`,
    );

    const query: any = { department: department };

    if (filters?.status && filters.status !== "all") {
      if (filters.status === "pending") {
        query.status = { $in: ["pending", "waiting"] };
      } else if (filters.status === "cancelled") {
        query.status = { $in: ["cancelled", "no-show", "skipped"] };
      } else {
        query.status = filters.status;
      }
    }

    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      query.createdAt = { $gte: date, $lt: nextDate };
    }

    const tickets = await Ticket.find(query as any)
      .sort({ createdAt: -1 })
      .lean();

    console.log(
      `Found ${tickets.length} tickets for department: ${department}`,
    );

    return {
      success: true,
      tickets: JSON.parse(JSON.stringify(tickets)),
      department,
    };
  } catch (error) {
    console.error("Error fetching all staff tickets:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

export async function getStaffTickets(
  staffId: string,
  filters?: { status?: string; date?: string },
) {
  return getStaffAllTickets(staffId, filters);
}

export async function getNextTicketForStaff(staffId: string) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const staff = await Staff.findOne({ staffId } as any).lean();
    if (!staff) return { success: false, error: "Staff not found" };

    const staffData = staff as any;
    const department = resolveDepartment(staffData, session);

    const { start: today, end: tomorrow } = getAppDayRange();

    const nextTicket = await Ticket.findOne({
      department: department as any,
      status: "pending" as any,
      createdAt: { $gte: today, $lt: tomorrow },
    } as any)
      .sort({ createdAt: 1 })
      .lean();

    if (!nextTicket)
      return {
        success: false,
        error: `No pending tickets for ${department} department`,
      };

    const pendingCount = await Ticket.countDocuments({
      department: department as any,
      status: "pending" as any,
      createdAt: { $gte: today, $lt: tomorrow },
    } as any);

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
    const staff = await Staff.findOne({ staffId } as any).lean();
    if (!staff) return { success: false, error: "Staff not found" };

    const staffData = staff as any;
    const department = resolveDepartment(staffData, session);
    const now = new Date();

    const ticket = await Ticket.findOneAndUpdate(
      {
        ticketNumber,
        status: "pending",
        department: department,
      } as any,
      {
        $set: {
          status: "serving",
          servedBy: staffId,
          servedAt: now,
        },
        $push: {
          statusHistory: {
            status: "serving",
            timestamp: now,
            changedBy: staffId,
          },
        },
      },
      { returnDocument: "after", new: true } as any,
    ).lean();

    if (!ticket) {
      return {
        success: false,
        error: "Ticket not found or already being served",
      };
    }

    const ticketData = ticket as any;
    if (ticketData.requester?.contactNumber) {
      sendTicketNotificationSMS(
        ticketData.requester.contactNumber,
        `${ticketData.student?.firstName || ""} ${ticketData.student?.lastName || ""}`.trim(),
        ticketData.ticketNumber,
        ticketData.transactionType,
        "serving",
      ).catch((err) => console.error("Serving SMS failed:", err));
    }

    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/dean/dashboard");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/staff/cashier/queue");
    revalidatePath("/staff/dean/queue");
    revalidatePath("/staff/registrar/queue");
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
    const now = new Date();

    const ticket = await Ticket.findOneAndUpdate(
      {
        ticketNumber,
        status: "serving",
        servedBy: staffId,
      } as any,
      {
        $set: {
          status: "completed",
          completedAt: now,
        },
        $push: {
          statusHistory: {
            status: "completed",
            timestamp: now,
            changedBy: staffId,
          },
        },
      },
      { returnDocument: "after", new: true } as any,
    ).lean();

    if (!ticket)
      return {
        success: false,
        error: "Ticket not found or not being served by you",
      };

    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/dean/dashboard");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/staff/cashier/queue");
    revalidatePath("/staff/dean/queue");
    revalidatePath("/staff/registrar/queue");
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
    const staff = await Staff.findOne({ staffId } as any).lean();
    if (!staff) return { success: false, error: "Staff not found" };

    const staffData = staff as any;
    const department = resolveDepartment(staffData, session);
    const { start: today, end: tomorrow } = getAppDayRange();

    const [pendingDept, servingByStaff, completedByStaff, totalDept] =
      await Promise.all([
        Ticket.countDocuments({
          department: department as any,
          status: "pending" as any,
          createdAt: { $gte: today, $lt: tomorrow },
        } as any),
        Ticket.countDocuments({
          servedBy: staffId,
          status: "serving" as any,
          createdAt: { $gte: today, $lt: tomorrow },
        } as any),
        Ticket.countDocuments({
          servedBy: staffId,
          status: "completed" as any,
          createdAt: { $gte: today, $lt: tomorrow },
        } as any),
        Ticket.countDocuments({
          department: department as any,
          createdAt: { $gte: today, $lt: tomorrow },
        } as any),
      ]);

    return {
      success: true,
      stats: {
        department,
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

export async function getAllTickets(filters?: {
  status?: string;
  transactionType?: string;
  date?: string;
  department?: string;
}) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const query: any = {};
    if (filters?.status) query.status = filters.status as any;
    if (filters?.transactionType)
      query.transactionType = filters.transactionType as any;
    if (filters?.department) query.department = filters.department as any;
    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      query.createdAt = { $gte: date, $lt: nextDate };
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

export async function getDepartmentTickets(
  department: string,
  filters?: { status?: string; date?: string },
) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const query: any = { department: department as any };
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

    const tickets = await Ticket.find(query as any)
      .sort({ createdAt: 1 })
      .lean();
    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error(`Error fetching ${department} tickets:`, error);
    return { success: false, error: `Failed to fetch ${department} tickets` };
  }
}

export async function serveNextTicket(department?: string) {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();
    const now = new Date();

    const query: any = {
      status: "pending",
      createdAt: { $gte: today, $lt: tomorrow },
    };

    if (department) {
      query.department = department;
    }

    const nextTicket = await Ticket.findOneAndUpdate(
      query as any,
      {
        $set: {
          status: "serving",
          servedBy: "admin",
          servedAt: now,
        },
        $push: {
          statusHistory: {
            status: "serving",
            timestamp: now,
            changedBy: "admin",
          },
        },
      },
      { sort: { createdAt: 1 }, returnDocument: "after", new: true } as any,
    ).lean();

    if (!nextTicket) return { success: false, error: "No pending tickets" };

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/dean/dashboard");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");
    revalidatePath("/staff/cashier/queue");
    revalidatePath("/staff/dean/queue");
    revalidatePath("/staff/registrar/queue");

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
    const now = new Date();

    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber, status: "serving" } as any,
      {
        $set: {
          status: "completed",
          completedAt: now,
        },
        $push: {
          statusHistory: {
            status: "completed",
            timestamp: now,
            changedBy: "admin",
          },
        },
      },
      { returnDocument: "after", new: true } as any,
    ).lean();

    if (!ticket)
      return {
        success: false,
        error: "Ticket not found or not currently serving",
      };

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/dean/dashboard");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");
    revalidatePath("/staff/cashier/queue");
    revalidatePath("/staff/dean/queue");
    revalidatePath("/staff/registrar/queue");

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
    const now = new Date();

    const ticket = await Ticket.findOneAndUpdate(
      {
        ticketNumber,
        status: { $in: ["pending", "serving"] },
      } as any,
      {
        $set: {
          status: "cancelled",
          cancelledAt: now,
        },
        $push: {
          statusHistory: {
            status: "cancelled",
            timestamp: now,
            changedBy: changedBy,
          },
        },
      },
      { returnDocument: "after", new: true } as any,
    ).lean();

    if (!ticket)
      return {
        success: false,
        error: "Ticket not found or cannot be cancelled",
      };

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/dean/dashboard");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");
    revalidatePath("/staff/cashier/queue");
    revalidatePath("/staff/dean/queue");
    revalidatePath("/staff/registrar/queue");

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
    const now = new Date();

    const updateData: any = {
      $set: { status: status },
      $push: {
        statusHistory: {
          status: status,
          timestamp: now,
          changedBy: "admin",
        },
      },
    };

    if (status === "serving") {
      updateData.$set.servedAt = now;
      updateData.$set.servedBy = "admin";
    } else if (status === "completed") {
      updateData.$set.completedAt = now;
    } else if (status === "cancelled") {
      updateData.$set.cancelledAt = now;
    }

    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber } as any,
      updateData,
      { returnDocument: "after", new: true } as any,
    ).lean();

    if (!ticket) return { success: false, error: "Ticket not found" };

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/queue");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/dean/dashboard");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/tickets");
    revalidatePath("/staff/cashier/queue");
    revalidatePath("/staff/dean/queue");
    revalidatePath("/staff/registrar/queue");

    return { success: true, ticket: JSON.parse(JSON.stringify(ticket)) };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return { success: false, error: "Failed to update ticket status" };
  }
}
