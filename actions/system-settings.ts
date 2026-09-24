// actions/system-settings.ts
"use server";

import connectDB from "@/lib/mongodb";
import SystemSetting, { SYSTEM_SETTINGS_ID } from "@/models/SystemSetting";
import Staff from "@/models/Staff";
import { requireRole, UNAUTHORIZED_ERROR } from "@/lib/authz";
import { ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

// ─── Bounds & defaults ───────────────────────────────────────────────────────

const DEFAULT_DAILY_LIMIT = 500;
const MIN_DAILY_LIMIT = 1;
const MAX_DAILY_LIMIT = 2000;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SystemSettingsResult {
  success: boolean;
  error?: string;
  queueOpen?: boolean;
}

export interface GlobalDefaults {
  dailyLimit: number;
  openTime: string;
  closeTime: string;
  breaks: { start: string; end: string; label: string }[];
}

export interface AdminSettingsResult {
  success: boolean;
  error?: string;
  defaults?: GlobalDefaults;
  queueOpen?: boolean;
}

export interface StaffSummary {
  staffId: string;
  staffName: string;
  department: string;
  cashierWindow: string;
  isOnline: boolean;
  dailyLimit: number;
  openTime: string;
  closeTime: string;
  breaks: { start: string; end: string; label: string }[];
}

// ─── Public read ─────────────────────────────────────────────────────────────

export async function getSystemSettings(): Promise<SystemSettingsResult> {
  try {
    await connectDB();
    const settings = await SystemSetting.findOneAndUpdate(
      { _id: SYSTEM_SETTINGS_ID },
      { $setOnInsert: { queueOpen: true, updatedBy: "" } },
      { upsert: true, returnDocument: "after" },
    ).lean();

    return { success: true, queueOpen: settings?.queueOpen !== false };
  } catch (error) {
    console.error("Error reading system settings:", error);
    return {
      success: false,
      error: "Failed to read settings",
      queueOpen: true,
    };
  }
}

// ─── Admin: queue toggle ─────────────────────────────────────────────────────

export async function setQueueOpen(
  open: boolean,
): Promise<SystemSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const settings = await SystemSetting.findOneAndUpdate(
      { _id: SYSTEM_SETTINGS_ID },
      { $set: { queueOpen: open, updatedBy: session.user.id || "" } },
      { upsert: true, returnDocument: "after" },
    ).lean();

    revalidatePath("/admin/queue");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/settings");
    revalidatePath("/live-queue");
    revalidatePath("/");

    return { success: true, queueOpen: settings?.queueOpen !== false };
  } catch (error) {
    console.error("Error updating system settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

// ─── Admin: read full settings + defaults ────────────────────────────────────

export async function getAdminSettings(): Promise<AdminSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const settings = await SystemSetting.findOneAndUpdate(
      { _id: SYSTEM_SETTINGS_ID },
      {
        $setOnInsert: {
          queueOpen: true,
          defaultDailyLimit: DEFAULT_DAILY_LIMIT,
          defaultOpenTime: "08:00",
          defaultCloseTime: "17:00",
          defaultBreaks: [],
          updatedBy: "",
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();

    const s = settings as any;

    return {
      success: true,
      queueOpen: s?.queueOpen !== false,
      defaults: {
        dailyLimit: s?.defaultDailyLimit ?? DEFAULT_DAILY_LIMIT,
        openTime: s?.defaultOpenTime ?? "08:00",
        closeTime: s?.defaultCloseTime ?? "17:00",
        breaks: s?.defaultBreaks ?? [],
      },
    };
  } catch (error) {
    console.error("Error reading admin settings:", error);
    return { success: false, error: "Failed to read admin settings" };
  }
}

// ─── Admin: staff overview ───────────────────────────────────────────────────

export async function getStaffSettingsOverview() {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, staff: [] };

    await connectDB();
    const staff = await Staff.find({
      roleName: { $in: ["cashier", "dean", "registrar", "dsdw"] },
      status: "active",
    } as any)
      .select(
        "staffId firstName lastName roleName cashierWindow counterSettings",
      )
      .lean();

    const list: StaffSummary[] = staff.map((s: any) => {
      const cs = s.counterSettings ?? {};
      return {
        staffId: s.staffId,
        staffName:
          `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.staffId,
        department: s.roleName || "cashier",
        cashierWindow: s.cashierWindow || "—",
        isOnline: cs.isOpen ?? true,
        dailyLimit: cs.dailyLimit ?? DEFAULT_DAILY_LIMIT,
        openTime: cs.openTime ?? "08:00",
        closeTime: cs.closeTime ?? "17:00",
        breaks: cs.breaks ?? [],
      };
    });

    list.sort((a, b) => {
      const dept = a.department.localeCompare(b.department);
      if (dept !== 0) return dept;
      return a.staffName.localeCompare(b.staffName);
    });

    return { success: true, staff: list };
  } catch (error) {
    console.error("Error reading staff settings:", error);
    return {
      success: false,
      error: "Failed to read staff settings",
      staff: [],
    };
  }
}

// ─── Admin: global defaults ──────────────────────────────────────────────────

export async function updateDefaultCapacity(
  dailyLimit: number,
): Promise<AdminSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    if (
      !Number.isFinite(dailyLimit) ||
      dailyLimit < MIN_DAILY_LIMIT ||
      dailyLimit > MAX_DAILY_LIMIT
    ) {
      return {
        success: false,
        error: `Capacity must be between ${MIN_DAILY_LIMIT} and ${MAX_DAILY_LIMIT}`,
      };
    }

    await connectDB();
    await SystemSetting.findOneAndUpdate(
      { _id: SYSTEM_SETTINGS_ID },
      {
        $set: {
          defaultDailyLimit: dailyLimit,
          updatedBy: session.user.id || "",
        },
      },
      { upsert: true },
    );

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating default capacity:", error);
    return { success: false, error: "Failed to update default capacity" };
  }
}

export async function updateDefaultHours(
  openTime: string,
  closeTime: string,
): Promise<AdminSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
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
    await SystemSetting.findOneAndUpdate(
      { _id: SYSTEM_SETTINGS_ID },
      {
        $set: {
          defaultOpenTime: openTime,
          defaultCloseTime: closeTime,
          updatedBy: session.user.id || "",
        },
      },
      { upsert: true },
    );

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating default hours:", error);
    return { success: false, error: "Failed to update default hours" };
  }
}

// ─── Admin: per-staff overrides (WRITES TO counterSettings) ─────────────────

export async function updateStaffCapacity(
  staffId: string,
  dailyLimit: number,
): Promise<AdminSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    if (
      !Number.isFinite(dailyLimit) ||
      dailyLimit < MIN_DAILY_LIMIT ||
      dailyLimit > MAX_DAILY_LIMIT
    ) {
      return {
        success: false,
        error: `Capacity must be between ${MIN_DAILY_LIMIT} and ${MAX_DAILY_LIMIT}`,
      };
    }

    await connectDB();
    const result = await Staff.findOneAndUpdate(
      { staffId } as any,
      { $set: { "counterSettings.dailyLimit": dailyLimit } },
      { new: true },
    );

    if (!result) return { success: false, error: "Staff not found" };

    revalidatePath("/admin/settings");
    revalidatePath("/admin/queue");
    return { success: true };
  } catch (error) {
    console.error("Error updating staff capacity:", error);
    return { success: false, error: "Failed to update staff capacity" };
  }
}

export async function updateStaffHours(
  staffId: string,
  openTime: string,
  closeTime: string,
): Promise<AdminSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
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

    revalidatePath("/admin/settings");
    revalidatePath("/admin/queue");
    return { success: true };
  } catch (error) {
    console.error("Error updating staff hours:", error);
    return { success: false, error: "Failed to update staff hours" };
  }
}

export async function updateStaffWindow(
  staffId: string,
  isOnline: boolean,
): Promise<AdminSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const result = await Staff.findOneAndUpdate(
      { staffId } as any,
      { $set: { "counterSettings.isOpen": isOnline } },
      { new: true },
    );

    if (!result) return { success: false, error: "Staff not found" };

    revalidatePath("/admin/settings");
    revalidatePath("/admin/queue");
    return { success: true };
  } catch (error) {
    console.error("Error updating staff window:", error);
    return { success: false, error: "Failed to update staff window" };
  }
}

// ─── Admin: bulk open/close + apply defaults ─────────────────────────────────

/**
 * Force every active staff member's counter to open right now.
 */
export async function openAllWindowsOnce(): Promise<AdminSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    await Staff.updateMany(
      {
        roleName: { $in: ["cashier", "dean", "registrar", "dsdw"] },
        status: "active",
      } as any,
      { $set: { "counterSettings.isOpen": true } },
    );

    revalidatePath("/admin/settings");
    revalidatePath("/admin/queue");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error opening all windows:", error);
    return { success: false, error: "Failed to open all windows" };
  }
}

/**
 * Force every active staff member's counter to close right now.
 */
export async function closeAllWindowsOnce(): Promise<AdminSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    await Staff.updateMany(
      {
        roleName: { $in: ["cashier", "dean", "registrar", "dsdw"] },
        status: "active",
      } as any,
      { $set: { "counterSettings.isOpen": false } },
    );

    revalidatePath("/admin/settings");
    revalidatePath("/admin/queue");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error closing all windows:", error);
    return { success: false, error: "Failed to close all windows" };
  }
}

export async function applyDefaultsToAllStaff(): Promise<AdminSettingsResult> {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const settings = await SystemSetting.findOne({
      _id: SYSTEM_SETTINGS_ID,
    }).lean();
    const s = settings as any;

    const dailyLimit = s?.defaultDailyLimit ?? DEFAULT_DAILY_LIMIT;
    const openTime = s?.defaultOpenTime ?? "08:00";
    const closeTime = s?.defaultCloseTime ?? "17:00";

    await Staff.updateMany(
      {
        roleName: { $in: ["cashier", "dean", "registrar", "dsdw"] },
        status: "active",
      } as any,
      {
        $set: {
          "counterSettings.dailyLimit": dailyLimit,
          "counterSettings.openTime": openTime,
          "counterSettings.closeTime": closeTime,
        },
      },
    );

    revalidatePath("/admin/settings");
    revalidatePath("/admin/queue");
    revalidatePath("/staff/cashier/settings");
    revalidatePath("/staff/dean/settings");
    revalidatePath("/staff/registrar/settings");

    return { success: true };
  } catch (error) {
    console.error("Error applying defaults:", error);
    return { success: false, error: "Failed to apply defaults" };
  }
}
