// actions/admin-monitor.ts
"use server";

import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import Counter from "@/models/Counter";
import Ticket from "@/models/Ticket";
import { getSystemSettings } from "./system-settings";
import {
  evaluateCounterState,
  type CounterState,
} from "@/lib/counterSettings";
import { getAppDayRange, getAppNowMinutes } from "@/lib/time";
import { requireRole, UNAUTHORIZED_ERROR } from "@/lib/authz";
import { ROLES } from "@/lib/roles";

export interface CounterOverview {
  staffId: string;
  name: string;
  cashierWindow: string;
  state: CounterState;
  load: number;
  dailyLimit: number;
  openTime: string;
  closeTime: string;
  breaks: { start: string; end: string; label: string }[];
  nowServing: string | null;
  pendingCount: number;
}

export async function getCounterOverview() {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, counters: [], queueOpen: true };

    await connectDB();

    const settingsResult = await getSystemSettings();
    const queueOpen = settingsResult.queueOpen !== false;

    const cashiers = await Staff.find({
      roleName: "cashier",
      status: "active",
    }).lean();

    const { start: today, end: tomorrow, dateStr } = getAppDayRange();
    const nowMinutes = getAppNowMinutes();

    const counters: CounterOverview[] = await Promise.all(
      cashiers.map(async (staff) => {
        const counter = await Counter.findOne({
          _id: `STAFF-${staff.staffId}-${dateStr}`,
        }).lean();
        const load = counter?.seq || 0;
        const evaluation = evaluateCounterState(staff, load, nowMinutes);

        const [serving, pendingCount] = await Promise.all([
          Ticket.findOne({
            assignedTo: staff.staffId,
            status: "serving" as any,
            createdAt: { $gte: today, $lt: tomorrow },
          })
            .sort({ servedAt: -1 })
            .select("ticketNumber")
            .lean(),
          Ticket.countDocuments({
            assignedTo: staff.staffId,
            status: "pending" as any,
            createdAt: { $gte: today, $lt: tomorrow },
          }),
        ]);

        return {
          staffId: staff.staffId,
          name: `${staff.firstName} ${staff.lastName}`,
          cashierWindow: staff.cashierWindow || "",
          state: evaluation.state,
          load,
          dailyLimit: evaluation.settings.dailyLimit,
          openTime: evaluation.settings.openTime,
          closeTime: evaluation.settings.closeTime,
          breaks: evaluation.settings.breaks,
          nowServing: serving ? (serving as any).ticketNumber : null,
          pendingCount,
        };
      }),
    );

    counters.sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, counters, queueOpen };
  } catch (error) {
    console.error("Error building counter overview:", error);
    return {
      success: false,
      error: "Failed to load queue monitor",
      counters: [],
      queueOpen: true,
    };
  }
}
