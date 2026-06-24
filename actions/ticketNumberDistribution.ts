// app/actions/ticketNumberDistribution.ts
"use server";

import connectDB from "@/lib/mongodb";
import Counter from "@/models/Counter";
import Staff from "@/models/Staff";

interface TicketNumberResult {
  success: boolean;
  error?: string;
  ticketNumber?: string;
  ticketId?: string;
  queuePosition?: number;
  staffId?: string;
}

/**
 * Distribute ticket number for a specific staff member
 * Each staff has their own independent counter that resets daily
 * Format: Just a number sequence (1, 2, 3...)
 */
export async function distributeTicketNumber(
  staffId: string,
): Promise<TicketNumberResult> {
  try {
    await connectDB();

    // Get staff info
    const staff = await Staff.findOne({ staffId });
    if (!staff) {
      return { success: false, error: "Staff not found" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    // Create unique counter key per staff per day
    const counterKey = `STAFF-${staffId}-${dateStr}`;

    // Atomic increment for this staff's counter
    const result = await Counter.findOneAndUpdate(
      { _id: counterKey },
      {
        $inc: { seq: 1 },
        $setOnInsert: {
          date: today,
          staffId: staffId,
          department: staff.roleName,
          createdAt: new Date(),
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
    console.error("Error distributing staff ticket number:", error);

    if (error.code === 11000) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return await distributeTicketNumber(staffId);
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

    return {
      success: false,
      error: "Failed to generate ticket number.",
    };
  }
}

/**
 * Distribute ticket to the least busy staff in a department
 * Automatically assigns to the staff with fewest tickets
 */
export async function distributeTicketToAvailableStaff(
  department: string,
): Promise<TicketNumberResult> {
  try {
    await connectDB();

    // Find all active staff in this department
    const departmentStaff = await Staff.find({
      roleName: department,
      status: "active",
    }).lean();

    if (!departmentStaff || departmentStaff.length === 0) {
      return {
        success: false,
        error: `No available staff in ${department} department`,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    // Get today's counters for all staff in department
    const staffLoads = await Promise.all(
      departmentStaff.map(async (staff) => {
        const counterKey = `STAFF-${staff.staffId}-${dateStr}`;
        const counter = await Counter.findOne({ _id: counterKey }).lean();

        return {
          staffId: staff.staffId,
          staffName: `${staff.firstName} ${staff.lastName}`,
          currentLoad: counter ? counter.seq : 0,
        };
      }),
    );

    // Find the staff with the lowest load
    const leastBusyStaff = staffLoads.reduce((min, staff) =>
      staff.currentLoad < min.currentLoad ? staff : min,
    );

    // Assign ticket to least busy staff
    return await distributeTicketNumber(leastBusyStaff.staffId);
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

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
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
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
  