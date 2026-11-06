// app/api/public/queue-stream-full/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import Staff from "@/models/Staff";
import Counter from "@/models/Counter";
import SystemSetting, { SYSTEM_SETTINGS_ID } from "@/models/SystemSetting";
import {
  evaluateCounterState,
  summarizeAvailability,
} from "@/lib/counterSettings";
import { getAppDayRange, getAppNowMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getQueueStatus() {
  try {
    const settings = await SystemSetting.findById(SYSTEM_SETTINGS_ID).lean();
    const queueOpen = (settings as any)?.queueOpen !== false;

    // ✅ `as const` keeps the literal types, so Mongoose's strict
    // filter accepts `$in` without a TypeScript error.
    const cashierRoleNames = ["cashier", "head_cashier"] as const;

    const cashiers = await Staff.find({
      roleName: { $in: cashierRoleNames },
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
      status: summary.status,
      openCounters: summary.openCounters,
      totalCounters: cashiers.length,
      message: summary.message,
    };
  } catch (error) {
    console.error("Error computing queue status:", error);
    return { status: "open", openCounters: 0, totalCounters: 0, message: "" };
  }
}

const displayNames: Record<string, string> = {
  registrar: "Registrar",
  dean: "Dean",
  cashier: "Cashier",
};

function getEmptyDepartments() {
  return [
    {
      department: "dean",
      displayName: "Dean",
      staffName: null,
      serving: null,
      waiting: 0,
      waitingList: [],
    },
    {
      department: "registrar",
      displayName: "Registrar",
      staffName: null,
      serving: null,
      waiting: 0,
      waitingList: [],
    },
    {
      department: "cashier",
      displayName: "Cashier",
      staffName: null,
      serving: null,
      waiting: 0,
      waitingList: [],
    },
  ];
}

/**
 * Looks up the active staff for a department's office so the live monitor
 * can show who is at the desk. Prefers the regular role (e.g. "dean");
 * falls back to the head role (e.g. "head_dean") if no regular staff exists.
 *
 * Cashier is intentionally not handled here: the live page gets per-window
 * cashier names from getPublicCashierQueues().
 */
async function getDepartmentStaffName(dept: string): Promise<string | null> {
  try {
    let roleNames: string[] = [];
    if (dept === "dean") roleNames = ["dean", "head_dean"];
    else if (dept === "registrar") roleNames = ["registrar", "head_registrar"];
    else return null;

    const staff = await Staff.find({
      roleName: { $in: roleNames },
      status: "active",
    } as any)
      .select("firstName lastName roleName")
      .lean();

    if (!staff || staff.length === 0) return null;

    const regular = (staff as any[]).filter(
      (s) => !String(s.roleName || "").startsWith("head_"),
    );
    const chosen = regular.length > 0 ? regular : (staff as any[]);

    const names = chosen
      .map((s) => `${s.firstName || ""} ${s.lastName || ""}`.trim())
      .filter(Boolean);

    return names.length > 0 ? names.join(", ") : null;
  } catch (err) {
    console.error(`Error fetching staff name for ${dept}:`, err);
    return null;
  }
}

async function getQueueData() {
  try {
    await connectDB();

    const { start: today, end: tomorrow } = getAppDayRange();

    const departments = ["dean", "registrar", "cashier"];

    const departmentData = await Promise.all(
      departments.map(async (dept) => {
        try {
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

          const waitingList = await Ticket.find({
            department: dept as any,
            status: "pending" as any,
            createdAt: { $gte: today, $lt: tomorrow },
          })
            .sort({ createdAt: 1 })
            .select(
              "ticketNumber transactionType department createdAt status student",
            )
            .lean();

          const staffName = await getDepartmentStaffName(dept);

          return {
            department: dept,
            displayName: displayNames[dept] || dept,
            staffName,
            serving: servingTicket ? (servingTicket as any).ticketNumber : null,
            waiting: waitingCount,
            waitingList: JSON.parse(JSON.stringify(waitingList)),
          };
        } catch (err) {
          console.error(`Error fetching ${dept}:`, err);
          return {
            department: dept,
            displayName: displayNames[dept] || dept,
            staffName: null,
            serving: null,
            waiting: 0,
            waitingList: [],
          };
        }
      }),
    );

    return departmentData;
  } catch (error) {
    console.error("getQueueData error:", error);
    return getEmptyDepartments();
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendData = async () => {
        try {
          const [data, queueStatus] = await Promise.all([
            getQueueData(),
            getQueueStatus(),
          ]);
          const payload = JSON.stringify({
            departments: data,
            queueStatus,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (error) {
          console.error("SSE send error:", error);
          const fallback = JSON.stringify({
            departments: getEmptyDepartments(),
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${fallback}\n\n`));
        }
      };

      await sendData();

      const interval = setInterval(sendData, 3000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
