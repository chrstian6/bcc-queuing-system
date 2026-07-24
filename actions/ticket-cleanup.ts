// actions/ticket-cleanup.ts
"use server";

import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import { requireRole, UNAUTHORIZED_ERROR } from "@/lib/authz";
import { ROLES } from "@/lib/roles";
import { getAppDayRange } from "@/lib/time";
import { buildCancelledUpdate } from "@/lib/ticketTransitions";

export async function cancelPreviousDayTickets() {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.CASHIER);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();

    const { start: today } = getAppDayRange();

    const result = await Ticket.updateMany(
      {
        status: "pending",
        createdAt: { $lt: today },
      },
      buildCancelledUpdate("system-cleanup"),
    );

    return {
      success: true,
      cancelledCount: result.modifiedCount,
      message:
        result.modifiedCount > 0
          ? `Cleared ${result.modifiedCount} ticket${result.modifiedCount !== 1 ? "s" : ""} from previous day`
          : "No previous day tickets to clear",
    };
  } catch (error) {
    console.error("Error cancelling previous day tickets:", error);
    return { success: false, error: "Failed to clear tickets" };
  }
}
