// actions/system-settings.ts
"use server";

import connectDB from "@/lib/mongodb";
import SystemSetting, { SYSTEM_SETTINGS_ID } from "@/models/SystemSetting";
import { requireRole, UNAUTHORIZED_ERROR } from "@/lib/authz";
import { ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export interface SystemSettingsResult {
  success: boolean;
  error?: string;
  queueOpen?: boolean;
}

/** Public read — consumed by ticket creation and the public status UI. */
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
    // Fail open: a settings read outage should not stop the queue.
    return { success: false, error: "Failed to read settings", queueOpen: true };
  }
}

export async function setQueueOpen(open: boolean): Promise<SystemSettingsResult> {
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
    revalidatePath("/live-queue");

    return { success: true, queueOpen: settings?.queueOpen !== false };
  } catch (error) {
    console.error("Error updating system settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}
