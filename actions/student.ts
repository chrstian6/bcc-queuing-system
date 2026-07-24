// actions/student.ts
// Student portal reads. Every query is keyed off the session's schoolId /
// user id — client-supplied identifiers are never trusted.
"use server";

import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import { requireStudent, STALE_SESSION_ERROR } from "@/lib/authz";
import { getAppDayRange } from "@/lib/time";

export async function getMyTickets(filter?: { status?: string }) {
  try {
    const session = await requireStudent();
    if (!session)
      return { success: false, error: STALE_SESSION_ERROR, tickets: [] };

    await connectDB();
    const query: any = { "student.schoolId": session.user.schoolId };
    if (filter?.status && filter.status !== "all") {
      query.status = filter.status;
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 }).lean();
    return { success: true, tickets: JSON.parse(JSON.stringify(tickets)) };
  } catch (error) {
    console.error("Error fetching student tickets:", error);
    return { success: false, error: "Failed to fetch tickets", tickets: [] };
  }
}

export interface ActiveTicketInfo {
  ticketNumber: string;
  ticketId: string;
  transactionType: string;
  status: "pending" | "serving";
  createdAt: string;
  /** 1-based position in the assigned counter's pending queue (pending only) */
  queuePosition: number | null;
  /** ticket number the assigned counter is currently serving */
  nowServing: string | null;
}

export async function getMyActiveTickets() {
  try {
    const session = await requireStudent();
    if (!session)
      return { success: false, error: STALE_SESSION_ERROR, tickets: [] };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const active = await Ticket.find({
      "student.schoolId": session.user.schoolId,
      status: { $in: ["pending", "serving"] as any },
      createdAt: { $gte: today, $lt: tomorrow },
    })
      .sort({ createdAt: 1 })
      .lean();

    const tickets: ActiveTicketInfo[] = await Promise.all(
      active.map(async (ticket: any) => {
        let queuePosition: number | null = null;
        let nowServing: string | null = null;

        if (ticket.assignedTo) {
          if (ticket.status === "pending") {
            const ahead = await Ticket.countDocuments({
              assignedTo: ticket.assignedTo,
              status: "pending" as any,
              createdAt: { $gte: today, $lt: ticket.createdAt },
            });
            queuePosition = ahead + 1;
          }

          const serving = await Ticket.findOne({
            assignedTo: ticket.assignedTo,
            status: "serving" as any,
            createdAt: { $gte: today, $lt: tomorrow },
          })
            .sort({ servedAt: -1 })
            .select("ticketNumber")
            .lean();
          nowServing = serving ? (serving as any).ticketNumber : null;
        }

        return {
          ticketNumber: ticket.ticketNumber,
          ticketId: ticket.ticketId,
          transactionType: ticket.transactionType,
          status: ticket.status,
          createdAt: new Date(ticket.createdAt).toISOString(),
          queuePosition,
          nowServing,
        };
      }),
    );

    return { success: true, tickets };
  } catch (error) {
    console.error("Error fetching active tickets:", error);
    return { success: false, error: "Failed to fetch tickets", tickets: [] };
  }
}

export async function getMyDashboardStats() {
  try {
    const session = await requireStudent();
    if (!session) return { success: false, error: STALE_SESSION_ERROR };

    await connectDB();

    const schoolId = session.user.schoolId;
    const [activeCount, completedCount, totalCount] = await Promise.all([
      Ticket.countDocuments({
        "student.schoolId": schoolId,
        status: { $in: ["pending", "serving"] as any },
      }),
      Ticket.countDocuments({
        "student.schoolId": schoolId,
        status: "completed" as any,
      }),
      Ticket.countDocuments({ "student.schoolId": schoolId }),
    ]);

    return {
      success: true,
      stats: { activeCount, completedCount, totalCount },
    };
  } catch (error) {
    console.error("Error fetching student stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}
