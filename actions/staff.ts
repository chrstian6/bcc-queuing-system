// app/actions/staff.ts
"use server";

import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import User from "@/models/User";
import { revalidatePath } from "next/cache";
import { sendWelcomeEmail } from "@/lib/email";
import { requireRole, UNAUTHORIZED_ERROR } from "@/lib/authz";
import { ROLES, baseStaffRole } from "@/lib/roles";
import { getAppDayRange } from "@/lib/time";
import {
  canCreateRole,
  subordinateDepartment,
  type StaffRoleName,
} from "@/lib/roleCreationMatrix";

interface CreateStaffData {
  facultyId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: StaffRoleName;
  cashierWindow?: string;
  /**
   * DEPRECATED — ignored by the server. Kept in the type so the existing
   * admin form (which still sends it) doesn't break at compile time.
   * The actual access level is always derived from `roleName`.
   */
  roleAccessLevel?: number;
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

function generateSimplePassword(): string {
  const words = [
    "blue",
    "gold",
    "silver",
    "happy",
    "sunny",
    "brave",
    "calm",
    "wise",
    "star",
    "moon",
    "lake",
    "hill",
    "wind",
    "book",
    "desk",
    "door",
    "bell",
    "rain",
    "snow",
    "fire",
    "tree",
    "bird",
    "dawn",
    "dusk",
    "noon",
    "mist",
    "rose",
    "lily",
    "pine",
    "lion",
    "deer",
    "hawk",
    "dove",
  ];
  const word = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(Math.random() * 90) + 10;
  return `${word}${number}`;
}

/**
 * Server-side source of truth for roleAccessLevel. Never trust the client.
 */
function getAccessLevelForRole(roleName: StaffRoleName): number {
  switch (roleName) {
    case "head_cashier":
    case "head_dean":
    case "head_registrar":
      return 2;
    case "registrar":
      return 3;
    case "dean":
      return 4;
    case "dsdw":
      return 5;
    case "cashier":
      return 6;
    default:
      return 6;
  }
}

export async function createStaffAccount(
  data: CreateStaffData,
): Promise<StaffResponse> {
  try {
    // Admin + head roles can reach this action. The matrix below decides
    // which target role each of them may create.
    const session = await requireRole(
      ROLES.ADMIN,
      "7", // head_registrar
      "8", // head_dean
      "9", // head_cashier
    );
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    const isAdmin = session.user.role === ROLES.ADMIN;
    const loggedInRoleName = session.user.staffRole || null;

    // Enforce the creation matrix.
    if (!canCreateRole(loggedInRoleName, data.roleName, isAdmin)) {
      return {
        success: false,
        error: "You do not have permission to create this role.",
      };
    }

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

    if (
      data.roleName !== "cashier" &&
      data.cashierWindow !== undefined &&
      data.cashierWindow !== ""
    ) {
      return {
        success: false,
        error: "Cashier window is only valid for cashier accounts.",
      };
    }

    await connectDB();

    const existingStaffEmail = await Staff.findOne({
      email: data.email.toLowerCase(),
    });
    if (existingStaffEmail) {
      return {
        success: false,
        error: "A staff account with this email already exists",
      };
    }

    const existingUserEmail = await User.findOne({
      email: data.email.toLowerCase(),
    });
    if (existingUserEmail) {
      return {
        success: false,
        error: "An admin account with this email already exists",
      };
    }

    const existingStaffFacultyId = await Staff.findOne({
      facultyId: data.facultyId,
    });
    if (existingStaffFacultyId) {
      return {
        success: false,
        error: "A staff account with this faculty ID already exists",
      };
    }

    const tempPassword = generateSimplePassword();

    // Derived on the server — client cannot override.
    const roleAccessLevel = getAccessLevelForRole(data.roleName);

    const staffData: any = {
      facultyId: data.facultyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      password: tempPassword,
      roleName: data.roleName,
      roleAccessLevel,
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
    revalidatePath("/staff/cashier/users");
    revalidatePath("/staff/dean/users");
    revalidatePath("/staff/registrar/users");

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
      const field = Object.keys(error.keyPattern || {})[0];
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

/**
 * Subordinate staff list for head staff pages.
 */
export async function getMySubordinateStaff() {
  try {
    const session = await requireRole(ROLES.ADMIN, "7", "8", "9");
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, staff: [] };

    const isAdmin = session.user.role === ROLES.ADMIN;
    const dept = subordinateDepartment(session.user.staffRole);
    if (!dept && !isAdmin) {
      return {
        success: false,
        error: "You do not have access to this list.",
        staff: [],
      };
    }

    await connectDB();

    const allStaff = await Staff.find({}).sort({ createdAt: -1 }).lean();
    const staff = isAdmin
      ? allStaff
      : allStaff.filter(
          (s: any) =>
            baseStaffRole(s.roleName) === dept &&
            !String(s.roleName || "").startsWith("head_"),
        );

    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching subordinate staff:", error);
    return {
      success: false,
      error: "Failed to fetch staff",
      staff: [],
    };
  }
}

export async function getAllStaff() {
  try {
    const session = await requireRole(
      ROLES.ADMIN,
      ROLES.REGISTRAR,
      ROLES.CASHIER,
    );
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, staff: [] };

    await connectDB();
    const staff = await Staff.find().sort({ createdAt: -1 }).lean();
    return { success: true, staff: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("Error fetching all staff:", error);
    return { success: false, error: "Failed to fetch staff", staff: [] };
  }
}

export async function getPublicCashierWindows(): Promise<{
  success: boolean;
  windows: { window: string; name: string }[];
}> {
  try {
    await connectDB();
    const allActive = await Staff.find({ status: "active" })
      .select("firstName lastName roleName cashierWindow")
      .lean();

    const cashiers = allActive.filter(
      (s: any) => baseStaffRole(s.roleName) === "cashier",
    );

    const windows = (cashiers as any[])
      .map((s) => ({
        window: String(s.cashierWindow || "").trim(),
        name: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
      }))
      .filter((w) => w.window && w.name);

    return { success: true, windows };
  } catch (error) {
    console.error("Error fetching public cashier windows:", error);
    return { success: false, windows: [] };
  }
}

export async function getStaffById(staffId: string) {
  try {
    const session = await requireRole(
      ROLES.ADMIN,
      ROLES.REGISTRAR,
      ROLES.CASHIER,
      "7",
      "8",
      "9",
    );
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

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
    const session = await requireRole(
      ROLES.ADMIN,
      ROLES.REGISTRAR,
      ROLES.CASHIER,
    );
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, staff: [] };

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
    const session = await requireRole(
      ROLES.ADMIN,
      ROLES.REGISTRAR,
      ROLES.CASHIER,
    );
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, staff: [] };

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
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

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
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

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
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

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
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

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
      headCashierCount,
      headDeanCount,
      headRegistrarCount,
    ] = await Promise.all([
      Staff.countDocuments(),
      Staff.countDocuments({ status: "active" } as any),
      Staff.countDocuments({ status: "inactive" } as any),
      Staff.countDocuments({ status: "suspended" } as any),
      Staff.countDocuments({ roleName: "registrar" } as any),
      Staff.countDocuments({ roleName: "dean" } as any),
      Staff.countDocuments({ roleName: "dsdw" } as any),
      Staff.countDocuments({ roleName: "cashier" } as any),
      Staff.countDocuments({ roleName: "head_cashier" } as any),
      Staff.countDocuments({ roleName: "head_dean" } as any),
      Staff.countDocuments({ roleName: "head_registrar" } as any),
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
          head_cashier: headCashierCount,
          head_dean: headDeanCount,
          head_registrar: headRegistrarCount,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching staff stats:", error);
    return { success: false, error: "Failed to fetch staff statistics" };
  }
}

export async function getUserStats() {
  try {
    const session = await requireRole(ROLES.ADMIN);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const [totalUsers, students, admins, staffCount, studentsToday] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 2 } as any),
        User.countDocuments({ role: 1 } as any),
        Staff.countDocuments(),
        User.countDocuments({
          role: 2,
          createdAt: { $gte: today, $lt: tomorrow },
        } as any),
      ]);

    return {
      success: true,
      stats: {
        totalUsers: totalUsers + staffCount,
        students,
        admins,
        staff: staffCount,
        studentsToday,
      },
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return { success: false, error: "Failed to fetch user statistics" };
  }
}
