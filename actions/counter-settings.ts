// actions/counter-settings.ts
"use server";

import connectDB from "@/lib/mongodb";
import Staff, { type ICounterSettings } from "@/models/Staff";
import Counter from "@/models/Counter";
import { requireSelfStaffOrAdmin, UNAUTHORIZED_ERROR } from "@/lib/authz";
import {
  getEffectiveCounterSettings,
  evaluateCounterState,
} from "@/lib/counterSettings";
import { getAppDayRange, isValidHHMM, hhmmToMinutes } from "@/lib/time";
import { revalidatePath } from "next/cache";

export interface CounterSettingsInput {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks: { start: string; end: string; label?: string }[];
  dailyLimit: number;
}

const MAX_BREAKS = 5;

function validateSettings(input: CounterSettingsInput): string | null {
  if (!isValidHHMM(input.openTime) || !isValidHHMM(input.closeTime)) {
    return "Opening and closing times must be valid times (HH:mm)";
  }
  const open = hhmmToMinutes(input.openTime);
  const close = hhmmToMinutes(input.closeTime);
  if (open >= close) {
    return "Opening time must be before closing time";
  }
  if (!Array.isArray(input.breaks)) return "Invalid break list";
  if (input.breaks.length > MAX_BREAKS) {
    return `A maximum of ${MAX_BREAKS} break windows is allowed`;
  }
  for (const brk of input.breaks) {
    if (!isValidHHMM(brk.start) || !isValidHHMM(brk.end)) {
      return "Break times must be valid times (HH:mm)";
    }
    const start = hhmmToMinutes(brk.start);
    const end = hhmmToMinutes(brk.end);
    if (start >= end) {
      return "Each break must start before it ends";
    }
    if (start < open || end > close) {
      return "Breaks must be within the counter's open hours";
    }
    if ((brk.label || "").length > 50) {
      return "Break labels must be 50 characters or less";
    }
  }
  const limit = Number(input.dailyLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 2000) {
    return "Daily limit must be a whole number between 1 and 2000";
  }
  return null;
}

export async function getCounterSettings(targetStaffId: string) {
  try {
    const session = await requireSelfStaffOrAdmin(targetStaffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const staff = await Staff.findOne({ staffId: targetStaffId }).lean();
    if (!staff) return { success: false, error: "Staff not found" };

    const { dateStr } = getAppDayRange();
    const counter = await Counter.findOne({
      _id: `STAFF-${targetStaffId}-${dateStr}`,
    }).lean();
    const load = counter?.seq || 0;

    const evaluation = evaluateCounterState(staff, load);

    return {
      success: true,
      settings: getEffectiveCounterSettings(staff),
      load,
      state: evaluation.state,
    };
  } catch (error) {
    console.error("Error getting counter settings:", error);
    return { success: false, error: "Failed to load counter settings" };
  }
}

export async function updateCounterSettings(
  targetStaffId: string,
  input: CounterSettingsInput,
) {
  try {
    const session = await requireSelfStaffOrAdmin(targetStaffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    const validationError = validateSettings(input);
    if (validationError) return { success: false, error: validationError };

    const settings: ICounterSettings = {
      isOpen: !!input.isOpen,
      openTime: input.openTime,
      closeTime: input.closeTime,
      breaks: input.breaks.map((b) => ({
        start: b.start,
        end: b.end,
        label: (b.label || "").trim(),
      })),
      dailyLimit: Number(input.dailyLimit),
    };

    await connectDB();
    const staff = await Staff.findOneAndUpdate(
      { staffId: targetStaffId },
      { $set: { counterSettings: settings } },
      { new: true },
    ).lean();
    if (!staff) return { success: false, error: "Staff not found" };

    revalidatePath("/staff/cashier/settings");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/admin/queue");

    return { success: true, settings: getEffectiveCounterSettings(staff) };
  } catch (error) {
    console.error("Error updating counter settings:", error);
    return { success: false, error: "Failed to update counter settings" };
  }
}

export async function toggleCounterOpen(
  targetStaffId: string,
  isOpen: boolean,
) {
  try {
    const session = await requireSelfStaffOrAdmin(targetStaffId);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    // Dotted $set creates the parent path on legacy docs; the normalizer
    // fills the remaining defaults on read.
    const staff = await Staff.findOneAndUpdate(
      { staffId: targetStaffId },
      { $set: { "counterSettings.isOpen": !!isOpen } },
      { new: true },
    ).lean();
    if (!staff) return { success: false, error: "Staff not found" };

    revalidatePath("/staff/cashier/settings");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/admin/queue");

    return { success: true, settings: getEffectiveCounterSettings(staff) };
  } catch (error) {
    console.error("Error toggling counter:", error);
    return { success: false, error: "Failed to update counter" };
  }
}
