// actions/staff-settings.ts
"use server";

import connectDB from "@/lib/mongodb";
import Counter from "@/models/Counter";
import Staff from "@/models/Staff";
import Ticket from "@/models/Ticket";
import { revalidatePath } from "next/cache";
import { requireSelfStaffOrAdmin, UNAUTHORIZED_ERROR } from "@/lib/authz";
import { getAppDayRange } from "@/lib/time";

const DEFAULT_DAILY_LIMIT = 500;
const MIN_DAILY_LIMIT = 1;
const MAX_DAILY_LIMIT = 2000;

export interface StaffWindowSettings {
  staffId: string;
  staffName: string;
  department: string;
  cashierWindow: string;
  isOnline: boolean;
  dailyLimit: number;
  currentLoad: number;
  openTime: string;
  closeTime: string;
  breaks: { start: string; end: string; label?: string }[];
}

interface SettingsResponse {
  success: boolean;
  error?: string;
  settings?: StaffWindowSettings;
}

interface SimpleResponse {
  success: boolean;
  error?: string;
}

/**
 * Get the logged-in staff's own window settings.
 * Reads from `staff.counterSettings.*` with fallbacks for missing fields.
 */
export async function getMyWindowSettings(
  staffId: string,
): Promise<SettingsResponse> {
  try {
    const session = await requireSelfStaffOrAdmin(staffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();

    const staff = await Staff.findOne({ staffId } as any).lean();
    if (!staff) return { success: false, error: "Staff not found" };

    const staffData = staff as any;
    const cs = staffData.counterSettings ?? {};
    const department = staffData.roleName || "cashier";

    // Today's counter load
    const { start: today, end: tomorrow, dateStr } = getAppDayRange();
    const counter = await Counter.findOne({
      _id: `STAFF-${staffId}-${dateStr}`,
    } as any).lean();
    const currentLoad =
      (counter as any)?.seq ||
      (await Ticket.countDocuments({
        assignedTo: staffId,
        createdAt: { $gte: today, $lt: tomorrow },
      } as any));

    return {
      success: true,
      settings: {
        staffId,
        staffName:
          `${staffData.firstName || ""} ${staffData.lastName || ""}`.trim() ||
          staffId,
        department,
        cashierWindow: staffData.cashierWindow || "—",
        isOnline: cs.isOpen !== false,
        dailyLimit: cs.dailyLimit ?? DEFAULT_DAILY_LIMIT,
        openTime: cs.openTime || "08:00",
        closeTime: cs.closeTime || "17:00",
        breaks: cs.breaks ?? [],
        currentLoad,
      },
    };
  } catch (error) {
    console.error("Error fetching window settings:", error);
    return { success: false, error: "Failed to fetch settings" };
  }
}

/**
 * Toggle the staff's own window open/closed.
 * Writes to `counterSettings.isOpen`.
 */
export async function setMyWindowOpen(
  staffId: string,
  isOnline: boolean,
): Promise<SimpleResponse> {
  try {
    const session = await requireSelfStaffOrAdmin(staffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();

    const result = await Staff.findOneAndUpdate(
      { staffId } as any,
      { $set: { "counterSettings.isOpen": isOnline } },
      { new: true },
    );

    if (!result) return { success: false, error: "Staff not found" };

    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/cashier/settings");
    revalidatePath("/staff/dean/dashboard");
    revalidatePath("/staff/dean/settings");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/staff/registrar/settings");
    revalidatePath("/admin/queue");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error toggling window:", error);
    return { success: false, error: "Failed to update window" };
  }
}

/**
 * Update the staff's own daily capacity.
 */
export async function updateMyDailyLimit(
  staffId: string,
  dailyLimit: number,
): Promise<SimpleResponse> {
  try {
    const session = await requireSelfStaffOrAdmin(staffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    if (
      !Number.isFinite(dailyLimit) ||
      dailyLimit < MIN_DAILY_LIMIT ||
      dailyLimit > MAX_DAILY_LIMIT
    ) {
      return {
        success: false,
        error: `Daily capacity must be between ${MIN_DAILY_LIMIT} and ${MAX_DAILY_LIMIT}`,
      };
    }

    await connectDB();

    // Prevent reducing below today's load
    const { start: today, end: tomorrow } = getAppDayRange();
    const currentLoad = await Ticket.countDocuments({
      assignedTo: staffId,
      createdAt: { $gte: today, $lt: tomorrow },
    } as any);

    if (dailyLimit < currentLoad) {
      return {
        success: false,
        error: `Cannot set capacity below today's load (${currentLoad})`,
      };
    }

    const result = await Staff.findOneAndUpdate(
      { staffId } as any,
      { $set: { "counterSettings.dailyLimit": dailyLimit } },
      { new: true },
    );

    if (!result) return { success: false, error: "Staff not found" };

    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/cashier/settings");
    revalidatePath("/staff/dean/dashboard");
    revalidatePath("/staff/dean/settings");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/staff/registrar/settings");
    revalidatePath("/admin/queue");

    return { success: true };
  } catch (error) {
    console.error("Error updating daily limit:", error);
    return { success: false, error: "Failed to update capacity" };
  }
}

/**
 * Update the staff's own operating hours.
 */
export async function updateMyOperatingHours(
  staffId: string,
  openTime: string,
  closeTime: string,
): Promise<SimpleResponse> {
  try {
    const session = await requireSelfStaffOrAdmin(staffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
      return {
        success: false,
        error: "Invalid time format. Use HH:MM (24-hour)",
      };
    }
    if (openTime >= closeTime) {
      return { success: false, error: "Close time must be after open time" };
    }

    await connectDB();

    const result = await Staff.findOneAndUpdate(
      { staffId } as any,
      {
        $set: {
          "counterSettings.openTime": openTime,
          "counterSettings.closeTime": closeTime,
        },
      },
      { new: true },
    );

    if (!result) return { success: false, error: "Staff not found" };

    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/cashier/settings");
    revalidatePath("/staff/dean/dashboard");
    revalidatePath("/staff/dean/settings");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/staff/registrar/settings");
    revalidatePath("/admin/queue");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error updating hours:", error);
    return { success: false, error: "Failed to update hours" };
  }
}
