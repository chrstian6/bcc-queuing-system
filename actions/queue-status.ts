// actions/queue-status.ts
"use server";

import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import Staff from "@/models/Staff";
import Counter from "@/models/Counter";
import { getSystemSettings } from "./system-settings";
import {
  evaluateCounterState,
  summarizeAvailability,
  type QueueAvailabilityStatus,
} from "@/lib/counterSettings";
import { getAppDayRange, getAppNowMinutes } from "@/lib/time";

interface DepartmentStatus {
  department: string;
  displayName: string;
  serving: string | null;
  waiting: number;
  color: string;
}

interface QueueStatusResponse {
  success: boolean;
  departments?: DepartmentStatus[];
  error?: string;
  timestamp?: string;
}

const displayNames: Record<string, string> = {
  registrar: "Registrar",
  dean: "Dean",
  dsdw: "DSDW",
  cashier: "Cashier",
};

const colors: Record<string, string> = {
  registrar: "from-blue-500 to-blue-600",
  dean: "from-purple-500 to-purple-600",
  dsdw: "from-orange-500 to-orange-600",
  cashier: "from-emerald-500 to-emerald-600",
};

export async function getPublicQueueStatus(): Promise<QueueStatusResponse> {
  try {
    await connectDB();

    const { start: today, end: tomorrow } = getAppDayRange();

    const departments = ["registrar", "dean", "dsdw", "cashier"];

    const departmentData = await Promise.all(
      departments.map(async (dept) => {
        const servingTicket = await Ticket.findOne({
          department: dept as any,
          status: "serving" as any,
          createdAt: { $gte: today, $lt: tomorrow },
        })
          .sort({ servedAt: -1 })
          .select("ticketNumber")
          .lean();

        const waitingCount = await Ticket.countDocuments({
          department: dept as any,
          status: "pending" as any,
          createdAt: { $gte: today, $lt: tomorrow },
        });

        return {
          department: dept,
          displayName: displayNames[dept] || dept,
          serving: servingTicket ? (servingTicket as any).ticketNumber : null,
          waiting: waitingCount,
          color: colors[dept] || "from-gray-500 to-gray-600",
        };
      }),
    );

    return {
      success: true,
      departments: departmentData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching queue status:", error);
    return {
      success: false,
      error: "Failed to fetch queue status",
    };
  }
}

export interface QueueAvailability {
  success: boolean;
  status: QueueAvailabilityStatus;
  queueOpen: boolean;
  openCounters: number;
  totalCounters: number;
  message: string;
}

/**
 * Public: can a cashier ticket be created right now? Combines the global
 * queue toggle with every active cashier's counter state (open/close, hours,
 * breaks, daily limit). Uses the same evaluator as ticket distribution.
 */
export async function getQueueAvailability(): Promise<QueueAvailability> {
  try {
    await connectDB();

    const settingsResult = await getSystemSettings();
    const queueOpen = settingsResult.queueOpen !== false;

    const cashiers = await Staff.find({
      roleName: "cashier",
      status: "active",
    }).lean();

    const { dateStr } = getAppDayRange();
    const nowMinutes = getAppNowMinutes();

    const states = await Promise.all(
      cashiers.map(async (staff) => {
        const counter = await Counter.findOne({
          _id: `STAFF-${staff.staffId}-${dateStr}`,
        }).lean();
        return evaluateCounterState(staff, counter?.seq || 0, nowMinutes).state;
      }),
    );

    const summary = summarizeAvailability(queueOpen, states);

    return {
      success: true,
      status: summary.status,
      queueOpen,
      openCounters: summary.openCounters,
      totalCounters: cashiers.length,
      message: summary.message,
    };
  } catch (error) {
    console.error("Error checking queue availability:", error);
    // Fail open so an outage doesn't block the kiosk; creation still
    // re-validates server-side.
    return {
      success: false,
      status: "open",
      queueOpen: true,
      openCounters: 0,
      totalCounters: 0,
      message: "",
    };
  }
}
