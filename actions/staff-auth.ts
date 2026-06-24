// actions/staff-auth.ts
"use server";

import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import { revalidatePath } from "next/cache";

interface ChangePasswordResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function changeStaffPassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResponse> {
  try {
    // Get the current session
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "You must be logged in to change your password",
      };
    }

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return {
        success: false,
        error: "Both current and new passwords are required",
      };
    }

    if (currentPassword === newPassword) {
      return {
        success: false,
        error: "New password must be different from current password",
      };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        error: "New password must be at least 8 characters long",
      };
    }

    if (!/[A-Z]/.test(newPassword)) {
      return {
        success: false,
        error: "New password must contain at least one uppercase letter",
      };
    }

    if (!/[a-z]/.test(newPassword)) {
      return {
        success: false,
        error: "New password must contain at least one lowercase letter",
      };
    }

    if (!/[0-9]/.test(newPassword)) {
      return {
        success: false,
        error: "New password must contain at least one number",
      };
    }

    await connectDB();

    // Find staff by email or staffId from session
    const staff = await Staff.findOne({
      $or: [{ email: session.user.email }, { staffId: session.user.staffId }],
    }).select("+password");

    if (!staff) {
      return {
        success: false,
        error: "Staff account not found",
      };
    }

    // Verify current password
    const isPasswordValid = await staff.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return {
        success: false,
        error: "Current password is incorrect",
      };
    }

    // Update password and set mustChangePassword to false
    staff.password = newPassword;
    staff.mustChangePassword = false;

    await staff.save();

    // Revalidate paths
    revalidatePath("/staff/change-password");
    revalidatePath("/staff/dashboard");

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error: any) {
    console.error("Change password error:", error);

    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message,
      );
      return { success: false, error: messages.join(". ") };
    }

    return {
      success: false,
      error: "Failed to change password. Please try again.",
    };
  }
}

export async function checkMustChangePassword(): Promise<{
  success: boolean;
  mustChangePassword?: boolean;
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    await connectDB();

    const staff = await Staff.findOne({
      $or: [{ email: session.user.email }, { staffId: session.user.staffId }],
    });

    if (!staff) {
      return {
        success: false,
        error: "Staff account not found",
      };
    }

    return {
      success: true,
      mustChangePassword: staff.mustChangePassword,
    };
  } catch (error: any) {
    console.error("Check password change error:", error);
    return {
      success: false,
      error: "Failed to check password status",
    };
  }
}
