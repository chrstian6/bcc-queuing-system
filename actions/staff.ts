// actions/staff.ts
"use server";

import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import { revalidatePath } from "next/cache";
import { sendWelcomeEmail } from "@/lib/email";

interface CreateStaffData {
  facultyId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: "registrar" | "dean" | "dsdw" | "cashier";
  roleAccessLevel?: number;
  cashierWindow?: string;
}

interface StaffResponse {
  success: boolean;
  error?: string;
  staff?: {
    staffId: string;
    facultyId: string;
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    roleAccessLevel: number;
    cashierWindow?: string;
    status: string;
    createdAt: Date;
  };
}

function generateRandomPassword(length: number = 10): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const all = uppercase + lowercase + numbers;

  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export async function createStaffAccount(
  data: CreateStaffData,
): Promise<StaffResponse> {
  try {
    if (
      !data.facultyId ||
      !data.firstName ||
      !data.lastName ||
      !data.email ||
      !data.roleName
    ) {
      return { success: false, error: "All required fields must be filled" };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { success: false, error: "Please enter a valid email address" };
    }

    if (data.roleName === "cashier" && !data.cashierWindow) {
      return { success: false, error: "Window number is required for cashier" };
    }

    await connectDB();

    const existingEmail = await Staff.findOne({
      email: data.email.toLowerCase(),
    } as any);
    if (existingEmail) {
      return {
        success: false,
        error: "A staff account with this email already exists",
      };
    }

    const existingFacultyId = await Staff.findOne({
      facultyId: data.facultyId,
    } as any);
    if (existingFacultyId) {
      return {
        success: false,
        error: "A staff account with this faculty ID already exists",
      };
    }

    const tempPassword = generateRandomPassword(10);

    const staffData: any = {
      facultyId: data.facultyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      password: tempPassword,
      roleName: data.roleName,
      roleAccessLevel: data.roleAccessLevel || 6,
      status: "active",
      mustChangePassword: true,
    };

    if (data.roleName === "cashier") {
      staffData.cashierWindow = data.cashierWindow;
    }

    const staff = new Staff(staffData);
    await staff.save();

    try {
      await sendWelcomeEmail({
        email: staff.email,
        firstName: staff.firstName,
        roleName: staff.roleName,
        tempPassword,
        staffId: staff.staffId,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/users/staff");

    const responseStaff: any = {
      staffId: staff.staffId,
      facultyId: staff.facultyId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      roleName: staff.roleName,
      roleAccessLevel: staff.roleAccessLevel,
      status: staff.status,
      createdAt: staff.createdAt,
    };

    if (staff.roleName === "cashier") {
      responseStaff.cashierWindow = staff.cashierWindow;
    }

    return { success: true, staff: responseStaff };
  } catch (error: any) {
    console.error("Error creating staff account:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const messages: Record<string, string> = {
        email: "Email already exists",
        facultyId: "Faculty ID already exists",
        staffId: "Staff ID already exists",
      };
      return { success: false, error: messages[field] || "Duplicate value" };
    }

    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message,
      );
      return { success: false, error: messages.join(". ") };
    }

    return {
      success: false,
      error: "Failed to create staff account. Please try again.",
    };
  }
}

export async function getAllStaff() {
  try {
    await connectDB();
    const staff = await Staff.find().sort({ createdAt: -1 }).lean();
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching all staff:", error);
    return { success: false, error: "Failed to fetch staff", staff: [] };
  }
}

export async function getStaffById(staffId: string) {
  try {
    await connectDB();
    const staff = await Staff.findOne({ staffId } as any).lean();
    if (!staff) return { success: false, error: "Staff not found" };
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching staff by ID:", error);
    return { success: false, error: "Failed to fetch staff" };
  }
}

export async function getStaffByRole(roleName: string) {
  try {
    await connectDB();
    const staff = await Staff.find({ roleName } as any)
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching staff by role:", error);
    return { success: false, error: "Failed to fetch staff", staff: [] };
  }
}

export async function getStaffByStatus(status: string) {
  try {
    await connectDB();
    const staff = await Staff.find({ status } as any)
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching staff by status:", error);
    return { success: false, error: "Failed to fetch staff", staff: [] };
  }
}

export async function updateStaffStatus(
  staffId: string,
  status: "active" | "inactive" | "suspended",
) {
  try {
    await connectDB();
    const staff = await Staff.findOneAndUpdate(
      { staffId } as any,
      { status },
      { new: true },
    ).lean();
    if (!staff) return { success: false, error: "Staff not found" };
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/staff");
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error updating staff status:", error);
    return { success: false, error: "Failed to update staff status" };
  }
}

export async function updateStaffRole(
  staffId: string,
  roleName: string,
  roleAccessLevel?: number,
) {
  try {
    await connectDB();
    const updateData: any = { roleName };
    if (roleAccessLevel) updateData.roleAccessLevel = roleAccessLevel;

    const staff = await Staff.findOneAndUpdate({ staffId } as any, updateData, {
      new: true,
    }).lean();
    if (!staff) return { success: false, error: "Staff not found" };
    revalidatePath("/admin/users");
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error updating staff role:", error);
    return { success: false, error: "Failed to update staff role" };
  }
}

export async function deleteStaff(staffId: string) {
  try {
    await connectDB();
    const staff = await Staff.findOneAndDelete({ staffId } as any);
    if (!staff) return { success: false, error: "Staff not found" };
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/staff");
    return { success: true, message: "Staff account deleted successfully" };
  } catch (error) {
    console.error("Error deleting staff:", error);
    return { success: false, error: "Failed to delete staff" };
  }
}

export async function getStaffStats() {
  try {
    await connectDB();

    const [
      totalStaff,
      activeStaff,
      inactiveStaff,
      suspendedStaff,
      registrarCount,
      deanCount,
      dsdwCount,
      cashierCount,
    ] = await Promise.all([
      Staff.countDocuments(),
      Staff.countDocuments({ status: "active" } as any),
      Staff.countDocuments({ status: "inactive" } as any),
      Staff.countDocuments({ status: "suspended" } as any),
      Staff.countDocuments({ roleName: "registrar" } as any),
      Staff.countDocuments({ roleName: "dean" } as any),
      Staff.countDocuments({ roleName: "dsdw" } as any),
      Staff.countDocuments({ roleName: "cashier" } as any),
    ]);

    return {
      success: true,
      stats: {
        totalStaff,
        activeStaff,
        inactiveStaff,
        suspendedStaff,
        byRole: {
          registrar: registrarCount,
          dean: deanCount,
          dsdw: dsdwCount,
          cashier: cashierCount,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching staff stats:", error);
    return { success: false, error: "Failed to fetch staff statistics" };
  }
}
