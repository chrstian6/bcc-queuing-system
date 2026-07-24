// app/actions/ticketNumberDistribution.ts
"use server";

import connectDB from "@/lib/mongodb";
import Counter from "@/models/Counter";
import Staff from "@/models/Staff";
import { requireRole, UNAUTHORIZED_ERROR } from "@/lib/authz";
import { ROLES } from "@/lib/roles";
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
 * Distribute ticket number for a specific staff member.
 * Each staff has their own independent counter that resets daily.
 * When opts.maxSeq is set, the daily cap is enforced atomically: the filter
 * only matches counters below the cap, so a counter at the limit makes the
 * upsert throw E11000 instead of incrementing past it.
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

    const { start: today, dateStr } = getAppDayRange();
    const counterKey = `STAFF-${staffId}-${dateStr}`;

    const filter: any = { _id: counterKey };
    if (opts?.maxSeq) {
      filter.$or = [
        { seq: { $lt: opts.maxSeq } },
        { seq: { $exists: false } },
      ];
    }

    // Atomic increment for this staff's counter
    const result = await Counter.findOneAndUpdate(
      filter,
      {
        $inc: { seq: 1 },
        $setOnInsert: {
          date: today,
          staffId: staffId,
          department: staff.roleName,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );

    if (!result) {
      return { success: false, error: "Failed to generate ticket number" };
    }

    const nextNumber = result.seq || 1;
    // Pure number sequence
    const ticketNumber = String(nextNumber);
    // Full ID for database uniqueness
    const ticketId = `${staff.roleName}-${staffId}-${dateStr}-${String(nextNumber).padStart(4, "0")}`;

    return {
      success: true,
      ticketNumber,
      ticketId,
      queuePosition: nextNumber,
      staffId: staffId,
    };
  } catch (error: any) {
    if (error.code === 11000) {
      // Either a concurrent first-create race, or the counter is at the cap
      // (filter missed an existing doc, so the upsert tried to re-insert it).
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
 * Eligibility: global queue open, counter open, within hours, not on break,
 * and under the counter's daily limit. Distinct failure reasons are returned
 * so the UI can explain why creation is unavailable.
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

    // Find all active staff in this department
    const departmentStaff = await Staff.find({
      roleName: department,
      status: "active",
    }).lean();

    if (!departmentStaff || departmentStaff.length === 0) {
      return {
        success: false,
        failureReason: "no-staff",
        error: `No available staff in ${department} department`,
      };
    }

    const { dateStr } = getAppDayRange();
    const nowMinutes = getAppNowMinutes();

    // Evaluate every counter's state and load
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

    // Try least-loaded first; if a counter fills up in a race, exclude it
    // and fall back to the next one.
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
 * Get current queue position for a staff member
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const counterKey = `STAFF-${staffId}-${dateStr}`;

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
 * Get all staff counters for a department (including staff with 0 tickets)
 */
export async function getDepartmentStaffCounters(department: string) {
  try {
    await connectDB();

    const { start: today, end: tomorrow } = getAppDayRange();

    // Find all active staff in this department
    const allDepartmentStaff = await Staff.find({
      roleName: department,
      status: "active",
    }).lean();

    // Find today's counters
    const counters = await Counter.find({
      _id: { $regex: `^STAFF-` },
      department: department,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    }).lean();

    // Map all staff with their counters (default to 0 if no counter yet)
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

    // Sort by staff name
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
 * Get daily statistics for a staff member
 */
export async function getStaffDailyStats(staffId: string) {
  try {
    await connectDB();

    const staff = await Staff.findOne({ staffId }).lean();
    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const counterKey = `STAFF-${staffId}-${dateStr}`;

    const counter = await Counter.findOne({ _id: counterKey }).lean();

    // Get total department tickets for today
    const deptCounters = await Counter.find({
      _id: { $regex: `^STAFF-` },
      department: staff.roleName,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    }).lean();

    const totalDeptTickets = deptCounters.reduce(
      (sum, c: any) => sum + (c.seq || 0),
      0,
    );

    // Get the next number this staff will serve
    const nextNumber = counter ? (counter.seq || 0) + 1 : 1;

    return {
      success: true,
      stats: {
        staffName: `${staff.firstName} ${staff.lastName}`,
        department: staff.roleName,
        ticketsServed: counter ? counter.seq : 0,
        nextTicketNumber: nextNumber,
        totalDepartmentTickets: totalDeptTickets,
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
 * Get department statistics
 */
export async function getDepartmentStats(department: string) {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const counters = await Counter.find({
      _id: { $regex: `^STAFF-` },
      department: department,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    }).lean();

    const totalTickets = counters.reduce(
      (sum, c: any) => sum + (c.seq || 0),
      0,
    );
    const activeStaffCount = counters.length;
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
 * Reset daily counter for a staff member (admin only)
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
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
 * Reset all counters for a department (admin only)
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all staff in department
    const staff = await Staff.find({
      roleName: department,
      status: "active",
    }).lean();

    // Reset each staff counter
    for (const s of staff) {
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
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
  