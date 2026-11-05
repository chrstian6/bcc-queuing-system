// app/actions/ticketNumberDistribution.ts
"use server";

import connectDB from "@/lib/mongodb";
import Counter from "@/models/Counter";
import Staff from "@/models/Staff";
import { requireRole, UNAUTHORIZED_ERROR } from "@/lib/authz";
import { ROLES, baseStaffRole } from "@/lib/roles";
import { getSystemSettings } from "./system-settings";
import { evaluateCounterState } from "@/lib/counterSettings";
import { getAppDayRange, getAppNowMinutes } from "@/lib/time";

export type DistributionFailureReason =
  | "queue-closed"
  | "no-staff"
  | "outside-hours"
  | "counters-closed"
  | "capacity-reached";

interface TicketNumberResult {
  success: boolean;
  error?: string;
  failureReason?: DistributionFailureReason;
  ticketNumber?: string;
  ticketId?: string;
  queuePosition?: number;
  staffId?: string;
}

/**
 * Atomically increment the GLOBAL per-department daily counter.
 *
 * One shared counter per department (dean / cashier / registrar / dsdw)
 * per day. This is what produces a continuous 1, 2, 3, ... sequence
 * across every window, regardless of which staff member gets assigned
 * or which transaction type is requested.
 *
 * The Counter model stores:
 *   _id:        "DEPT-{department}-{dateStr}"
 *   seq:        current number
 *   department: base role
 *   date:       start of day
 *
 * NOTE: This does NOT touch per-staff counters. Those are still incremented
 * in `distributeTicketNumber` so admin dashboard stats ("how many did staff X
 * serve today") keep working.
 */
async function nextDepartmentSequence(
  department: string,
): Promise<{ seq: number }> {
  const { start: today, dateStr } = getAppDayRange();
  const counterKey = `DEPT-${department}-${dateStr}`;

  const result = await Counter.findOneAndUpdate(
    { _id: counterKey },
    {
      $inc: { seq: 1 },
      $setOnInsert: {
        date: today,
        department,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!result || typeof result.seq !== "number") {
    throw new Error("Failed to increment department counter");
  }
  return { seq: result.seq };
}

/**
 * Distribute ticket number for a specific staff member.
 *
 * The **displayed** ticket number now comes from the shared per-department
 * daily counter so it stays continuous (1, 2, 3, ...) across all windows.
 * The per-staff counter is still incremented purely for per-staff stats.
 *
 * `opts.maxSeq` still enforces the per-staff daily cap (so one staff
 * member can't be assigned more than their `dailyLimit`), but the ticket
 * number is *not* derived from that cap.
 */
export async function distributeTicketNumber(
  staffId: string,
  opts?: { maxSeq?: number },
): Promise<TicketNumberResult> {
  try {
    await connectDB();

    const staff = await Staff.findOne({ staffId });
    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    const baseRole = baseStaffRole(staff.roleName) ?? staff.roleName;
    const { start: today, dateStr } = getAppDayRange();

    // ── 1. Enforce per-staff daily cap via the per-staff counter ──────────
    // The filter `seq < maxSeq` makes the upsert fail with E11000 once
    // the staff member has hit their limit, which the caller catches.
    const staffCounterKey = `STAFF-${staffId}-${dateStr}`;
    const staffFilter: any = { _id: staffCounterKey };
    if (opts?.maxSeq) {
      staffFilter.$or = [
        { seq: { $lt: opts.maxSeq } },
        { seq: { $exists: false } },
      ];
    }

    await Counter.findOneAndUpdate(
      staffFilter,
      {
        $inc: { seq: 1 },
        $setOnInsert: {
          date: today,
          staffId,
          department: baseRole,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    // ── 2. Issue the ticket number from the GLOBAL department counter ─────
    const { seq: departmentSeq } = await nextDepartmentSequence(baseRole);

    const ticketNumber = String(departmentSeq);
    const ticketId = `${baseRole}-${dateStr}-${String(departmentSeq).padStart(4, "0")}`;

    return {
      success: true,
      ticketNumber,
      ticketId,
      queuePosition: departmentSeq,
      staffId,
    };
  } catch (error: any) {
    if (error.code === 11000) {
      try {
        if (opts?.maxSeq) {
          const { dateStr } = getAppDayRange();
          const existing = await Counter.findOne({
            _id: `STAFF-${staffId}-${dateStr}`,
          }).lean();
          if (existing && (existing.seq || 0) >= opts.maxSeq) {
            return {
              success: false,
              failureReason: "capacity-reached",
              error: "This counter has reached its daily ticket limit.",
            };
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        return await distributeTicketNumber(staffId, opts);
      } catch (retryError) {
        console.error(
          "Retry failed for staff ticket distribution:",
          retryError,
        );
        return {
          success: false,
          error: "Failed to generate ticket number. Please try again.",
        };
      }
    }

    console.error("Error distributing staff ticket number:", error);
    return {
      success: false,
      error: "Failed to generate ticket number.",
    };
  }
}

/**
 * Distribute ticket to the least busy eligible staff in a department.
 * A "department" is a base role: "cashier", "registrar", "dean", "dsdw".
 * Head staff of that department (head_cashier, head_dean, ...) are treated
 * identically to regular staff — same pool, same eligibility, same cap.
 *
 * NOTE: Which staff member gets the ticket is decided by the per-staff
 * load (for load balancing). The ticket NUMBER is decided by the shared
 * department counter so it stays continuous.
 */
export async function distributeTicketToAvailableStaff(
  department: string,
): Promise<TicketNumberResult> {
  try {
    await connectDB();

    const settingsResult = await getSystemSettings();
    if (settingsResult.queueOpen === false) {
      return {
        success: false,
        failureReason: "queue-closed",
        error: "The queue is currently closed by the administrator.",
      };
    }

    const allActive = await Staff.find({ status: "active" }).lean();
    const departmentStaff = allActive.filter(
      (s) => baseStaffRole(s.roleName) === department,
    );

    if (!departmentStaff || departmentStaff.length === 0) {
      return {
        success: false,
        failureReason: "no-staff",
        error: `No available staff in ${department} department`,
      };
    }

    const { dateStr } = getAppDayRange();
    const nowMinutes = getAppNowMinutes();

    const counters = await Promise.all(
      departmentStaff.map(async (staff) => {
        const counterKey = `STAFF-${staff.staffId}-${dateStr}`;
        const counter = await Counter.findOne({ _id: counterKey }).lean();
        const load = counter ? counter.seq || 0 : 0;
        const evaluation = evaluateCounterState(staff, load, nowMinutes);
        return {
          staffId: staff.staffId,
          load,
          state: evaluation.state,
          dailyLimit: evaluation.settings.dailyLimit,
          accepting: evaluation.accepting,
        };
      }),
    );

    let eligible = counters.filter((c) => c.accepting);

    if (eligible.length === 0) {
      const states = counters.map((c) => c.state);
      if (states.every((s) => s === "outside-hours")) {
        return {
          success: false,
          failureReason: "outside-hours",
          error: "Cashier counters are outside operating hours.",
        };
      }
      if (states.some((s) => s === "full")) {
        return {
          success: false,
          failureReason: "capacity-reached",
          error: "Today's queue has reached capacity.",
        };
      }
      return {
        success: false,
        failureReason: "counters-closed",
        error: "All cashier counters are temporarily closed or on break.",
      };
    }

    while (eligible.length > 0) {
      const leastBusy = eligible.reduce((min, staff) =>
        staff.load < min.load ? staff : min,
      );

      const result = await distributeTicketNumber(leastBusy.staffId, {
        maxSeq: leastBusy.dailyLimit,
      });

      if (result.failureReason !== "capacity-reached") {
        return result;
      }

      eligible = eligible.filter((c) => c.staffId !== leastBusy.staffId);
    }

    return {
      success: false,
      failureReason: "capacity-reached",
      error: "Today's queue has reached capacity.",
    };
  } catch (error: any) {
    console.error("Error distributing to available staff:", error);
    return {
      success: false,
      error: "Failed to distribute ticket to available staff",
    };
  }
}

/**
 * Get current queue position for a staff member.
 * Now reflects the SHARED department counter (the one that produced
 * the displayed ticket number), not the per-staff counter.
 */
export async function getStaffQueuePosition(staffId: string): Promise<{
  success: boolean;
  position?: number;
  staffName?: string;
  error?: string;
}> {
  try {
    await connectDB();

    const staff = await Staff.findOne({ staffId });
    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    const baseRole = baseStaffRole(staff.roleName) ?? staff.roleName;
    const { dateStr } = getAppDayRange();
    const counterKey = `DEPT-${baseRole}-${dateStr}`;

    const counter = await Counter.findOne({ _id: counterKey });

    return {
      success: true,
      position: counter ? counter.seq : 0,
      staffName: `${staff.firstName} ${staff.lastName}`,
    };
  } catch (error) {
    console.error("Error getting staff queue position:", error);
    return {
      success: false,
      error: "Failed to get queue position",
    };
  }
}

/**
 * Get all staff counters for a department (including staff with 0 tickets).
 * Uses the per-staff counter, which is still kept up to date for stats.
 */
export async function getDepartmentStaffCounters(department: string) {
  try {
    await connectDB();

    const { start: today, end: tomorrow } = getAppDayRange();

    const allActive = await Staff.find({ status: "active" }).lean();
    const allDepartmentStaff = allActive.filter(
      (s) => baseStaffRole(s.roleName) === department,
    );

    const counters = await Counter.find({
      _id: { $regex: `^STAFF-` },
      department: department,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    }).lean();

    const enrichedCounters = allDepartmentStaff.map((staff) => {
      const counter = counters.find((c: any) => c.staffId === staff.staffId);
      return {
        staffId: staff.staffId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        ticketsServed: counter ? (counter as any).seq || 0 : 0,
        currentNumber: counter ? (counter as any).seq || 0 : 0,
        department: department,
        date: today,
        lastUpdated: counter ? (counter as any).updatedAt : null,
      };
    });

    enrichedCounters.sort((a, b) => a.staffName.localeCompare(b.staffName));

    return {
      success: true,
      counters: JSON.parse(JSON.stringify(enrichedCounters)),
    };
  } catch (error) {
    console.error("Error getting department counters:", error);
    return { success: false, error: "Failed to get department counters" };
  }
}

/**
 * Get daily statistics for a staff member.
 * `ticketsServed` / `nextTicketNumber` still use the per-staff counter.
 * `totalDepartmentTickets` now reads from the shared department counter.
 */
export async function getStaffDailyStats(staffId: string) {
  try {
    await connectDB();

    const staff = await Staff.findOne({ staffId }).lean();
    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    const baseRole = baseStaffRole(staff.roleName) ?? staff.roleName;

    const { start: today, end: tomorrow, dateStr } = getAppDayRange();

    const staffCounterKey = `STAFF-${staffId}-${dateStr}`;
    const staffCounter = await Counter.findOne({
      _id: staffCounterKey,
    }).lean();

    const deptCounterKey = `DEPT-${baseRole}-${dateStr}`;
    const deptCounter = await Counter.findOne({
      _id: deptCounterKey,
    }).lean();

    const nextNumber = staffCounter ? (staffCounter.seq || 0) + 1 : 1;

    return {
      success: true,
      stats: {
        staffName: `${staff.firstName} ${staff.lastName}`,
        department: baseRole,
        ticketsServed: staffCounter ? staffCounter.seq : 0,
        nextTicketNumber: nextNumber,
        totalDepartmentTickets: deptCounter ? deptCounter.seq || 0 : 0,
        date: dateStr,
      },
    };
  } catch (error) {
    console.error("Error getting staff daily stats:", error);
    return {
      success: false,
      error: "Failed to get staff stats",
    };
  }
}

/**
 * Get department statistics.
 * Reads from the shared department counter.
 */
export async function getDepartmentStats(department: string) {
  try {
    await connectDB();

    const { dateStr } = getAppDayRange();

    const deptCounterKey = `DEPT-${department}-${dateStr}`;
    const deptCounter = await Counter.findOne({
      _id: deptCounterKey,
    }).lean();

    // Per-staff counter count for "active staff" (only staff with >=1 ticket)
    const { start: today, end: tomorrow } = getAppDayRange();
    const staffCounters = await Counter.find({
      _id: { $regex: `^STAFF-` },
      department: department,
      date: { $gte: today, $lt: tomorrow },
    }).lean();

    const totalTickets = deptCounter ? deptCounter.seq || 0 : 0;
    const activeStaffCount = staffCounters.length;
    const averagePerStaff =
      activeStaffCount > 0 ? Math.round(totalTickets / activeStaffCount) : 0;

    return {
      success: true,
      stats: {
        department,
        totalTicketsToday: totalTickets,
        activeStaffCount,
        averageTicketsPerStaff: averagePerStaff,
        date: today,
      },
    };
  } catch (error) {
    console.error("Error getting department stats:", error);
    return { success: false, error: "Failed to get department stats" };
  }
}

/**
 * Reset daily counter for a staff member (admin only).
 * Only resets the per-staff counter — the department sequence is NOT
 * reset here on purpose, otherwise resetting one staff member would
 * cause duplicate ticket numbers across the department.
 */
export async function resetStaffCounter(staffId: string): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();

    const { dateStr } = getAppDayRange();
    const counterKey = `STAFF-${staffId}-${dateStr}`;

    await Counter.findOneAndUpdate(
      { _id: counterKey },
      { seq: 0 },
      { upsert: true },
    );

    return { success: true, message: "Counter reset successfully" };
  } catch (error) {
    console.error("Error resetting staff counter:", error);
    return {
      success: false,
      error: "Failed to reset staff counter",
    };
  }
}

/**
 * Reset all counters for a department (admin only).
 * Resets BOTH the shared department counter and every per-staff counter.
 * Only do this at the start of a new day or if you really want to
 * restart the whole department's numbering from 1.
 */
export async function resetDepartmentCounters(department: string): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();

    const { start: today, dateStr } = getAppDayRange();

    // Reset the shared department counter
    const deptCounterKey = `DEPT-${department}-${dateStr}`;
    await Counter.findOneAndUpdate(
      { _id: deptCounterKey },
      { seq: 0, date: today, department },
      { upsert: true },
    );

    // Reset every per-staff counter in this department
    const allActive = await Staff.find({ status: "active" }).lean();
    const staff = allActive.filter(
      (s) => baseStaffRole(s.roleName) === department,
    );

    for (const s of staff) {
      const counterKey = `STAFF-${s.staffId}-${dateStr}`;
      await Counter.findOneAndUpdate(
        { _id: counterKey },
        { seq: 0 },
        { upsert: true },
      );
    }

    return { success: true, message: `All ${department} counters reset` };
  } catch (error) {
    console.error("Error resetting department counters:", error);
    return {
      success: false,
      error: "Failed to reset department counters",
    };
  }
}
