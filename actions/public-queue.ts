// actions/public-queue.ts
"use server";

import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import Ticket from "@/models/Ticket";
import { getAppDayRange } from "@/lib/time";

/**
 * Masks one name part: "Cydric" -> "Cy****", "A" -> "A".
 * Done on the server so full student names never reach the public page.
 */
function maskNamePart(part?: string): string {
  if (!part) return "";
  const trimmed = part.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.length === 1) return trimmed;
  return `${trimmed.slice(0, 2)}${"*".repeat(Math.max(trimmed.length - 2, 1))}`;
}

function maskStudentName(student?: any): string {
  if (!student) return "—";
  const parts = [
    maskNamePart(student.firstName),
    maskNamePart(student.middleName),
    maskNamePart(student.lastName),
    student.suffix ? String(student.suffix) : "",
  ].filter((p) => p && p.length > 0);
  return parts.length > 0 ? parts.join(" ") : "—";
}

/**
 * PUBLIC (no auth) — used by the live queue display (/live-queue).
 *
 * One entry per active cashier, built from the ticket's `assignedTo` /
 * `servedBy`, so each ticket shows under the window of the cashier it was
 * actually assigned to. Returns only: window number, cashier display name,
 * the serving ticket number, and the waiting tickets (number, transaction
 * type, MASKED student name). No emails, staff IDs, or raw student names.
 */
export async function getPublicCashierQueues(): Promise<{
  success: boolean;
  queues: {
    window: number | null;
    staffName: string;
    serving: string | null;
    waiting: {
      id: string;
      ticketNumber: string;
      transactionType: string;
      maskedName: string;
      createdAt: string;
    }[];
  }[];
}> {
  try {
    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const cashiers = (await Staff.find({
      roleName: "cashier",
      status: "active",
    } as any)
      .select("staffId firstName lastName cashierWindow")
      .lean()) as any[];

    const staffIds = cashiers.map((s) => s.staffId);

    const tickets = (await Ticket.find({
      department: "cashier",
      createdAt: { $gte: today, $lt: tomorrow },
      $or: [
        { status: "pending", assignedTo: { $in: staffIds } },
        { status: "serving", servedBy: { $in: staffIds } },
      ],
    } as any)
      .sort({ createdAt: 1 })
      .select(
        "ticketNumber status assignedTo servedBy transactionType student createdAt",
      )
      .lean()) as any[];

    const queues = cashiers.map((s) => {
      const match = String(s.cashierWindow || "").match(/\d+/);
      const windowNumber = match ? parseInt(match[0], 10) : null;

      const serving = tickets.find(
        (t) => t.status === "serving" && t.servedBy === s.staffId,
      );

      const waiting = tickets
        .filter((t) => t.status === "pending" && t.assignedTo === s.staffId)
        .map((t) => ({
          id: String(t._id),
          ticketNumber: String(t.ticketNumber),
          transactionType: String(t.transactionType || ""),
          maskedName: maskStudentName(t.student),
          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
        }));

      return {
        window: windowNumber,
        staffName: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        serving: serving ? String(serving.ticketNumber) : null,
        waiting,
      };
    });

    queues.sort((a, b) => (a.window ?? 999) - (b.window ?? 999));

    return { success: true, queues };
  } catch (error) {
    console.error("Error fetching public cashier queues:", error);
    return { success: false, queues: [] };
  }
}
