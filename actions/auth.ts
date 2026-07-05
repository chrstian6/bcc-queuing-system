// app/actions/auth.ts
"use server";

import { signIn, signOut, auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { headers } from "next/headers";
import User, { UserRole } from "@/models/User";
import Staff from "@/models/Staff";
import { revalidatePath } from "next/cache";
import { getStaffRoleNumber } from "@/lib/roles";
import { checkRateLimit, getClientIp } from "@/lib/ratelimits";
import {
  registerStudentSchema,
  type RegisterStudentInput,
} from "@/types/student";
import { getCampusForYearLevel, type YearLevel } from "@/types/ticket";

interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
  mustChangePassword?: boolean;
}

export async function loginAction(
  email: string,
  password: string,
  role: "admin" | "staff" | "student",
): Promise<AuthResponse> {
  try {
    if (!email || !password || !role) {
      return { success: false, error: "Please provide all required fields" };
    }

    if (!email.includes("@")) {
      return { success: false, error: "Please enter a valid email address" };
    }

    if (password.length < 3) {
      return {
        success: false,
        error: "Password must be at least 3 characters",
      };
    }

    // For staff login, verify credentials directly since they use Staff model
    if (role === "staff") {
      return await staffLogin(email, password);
    }

    // Admin/student login share the User model
    const result = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      role:
        role === "student"
          ? UserRole.STUDENT.toString()
          : UserRole.ADMIN.toString(),
      redirect: false,
    });

    if (result?.error) {
      const errorMessages: Record<string, string> = {
        "Invalid email or password":
          "Invalid email or password. Please try again.",
        "Invalid credentials for this role":
          role === "student"
            ? "Invalid student credentials. Please check your email and password."
            : "Invalid admin credentials. Please check your email and password.",
        "Please provide all required fields":
          "Please fill in all required fields.",
        "Invalid role specified": "Invalid role specified. Please try again.",
      };

      return {
        success: false,
        error: errorMessages[result.error] || result.error,
      };
    }

    const redirectTo =
      role === "student" ? "/student/dashboard" : "/admin/dashboard";

    revalidatePath("/");
    revalidatePath(redirectTo);

    return {
      success: true,
      message: "Login successful",
      redirectTo,
    };
  } catch (error: any) {
    console.error("Login error:", error);

    if (error?.type === "CredentialsSignin") {
      return {
        success: false,
        error: "Invalid credentials. Please try again.",
      };
    }

    return {
      success: false,
      error: "An unexpected error occurred. Please try again later.",
    };
  }
}

// In actions/auth.ts - Update the staffLogin function redirects
async function staffLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    await connectDB();

    const staff = await Staff.findOne({
      email: email.toLowerCase().trim(),
      status: "active",
    }).select("+password");

    if (!staff) {
      return {
        success: false,
        error: "Invalid staff credentials or account is inactive.",
      };
    }

    const isPasswordValid = await staff.comparePassword(password);

    if (!isPasswordValid) {
      return {
        success: false,
        error: "Invalid email or password. Please try again.",
      };
    }

    // Dynamic redirect based on role
    const redirectTo = `/staff/${staff.roleName}/dashboard`;

    const roleNumber = getStaffRoleNumber(staff.roleName);

    const result = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      role: roleNumber.toString(),
      redirect: false,
    });

    if (result?.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    // If must change password, redirect to standalone change password page
    if (staff.mustChangePassword) {
      return {
        success: true,
        message: "Please change your password",
        redirectTo: "/change-password",
        mustChangePassword: true,
      };
    }

    revalidatePath("/");
    revalidatePath(redirectTo);

    return {
      success: true,
      message: "Login successful",
      redirectTo,
    };
  } catch (error: any) {
    console.error("Staff login error:", error);
    return {
      success: false,
      error: "Staff login failed. Please try again.",
    };
  }
}

export async function logoutAction(): Promise<AuthResponse> {
  try {
    await signOut({ redirect: false });
    revalidatePath("/");
    revalidatePath("/admin/dashboard");
    revalidatePath("/staff/cashier/dashboard");
    revalidatePath("/staff/registrar/dashboard");
    revalidatePath("/student/dashboard");
    return { success: true, message: "Logged out successfully" };
  } catch (error: any) {
    console.error("Logout error:", error);
    return { success: false, error: "Failed to logout. Please try again." };
  }
}

export async function registerStudentAction(
  data: RegisterStudentInput,
): Promise<AuthResponse> {
  try {
    const headersList = await headers();
    const ip = getClientIp(headersList);
    const rateLimit = await checkRateLimit(
      ip,
      "registerStudent",
      5,
      60 * 60 * 1000,
    );
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Too many registration attempts. Please try again later.",
      };
    }

    const parsed = registerStudentSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message || "Please check the form for errors.",
      };
    }

    const input = parsed.data;
    const email = input.email.toLowerCase().trim();
    // Campus is derived server-side from year level, never client-supplied
    const campus = getCampusForYearLevel(input.year as YearLevel);
    if (!campus) {
      return { success: false, error: "Invalid year level" };
    }

    await connectDB();

    const [existingUserEmail, existingSchoolId, existingStaffEmail] =
      await Promise.all([
        User.findOne({ email }),
        User.findOne({ schoolId: input.schoolId }),
        Staff.findOne({ email }),
      ]);

    if (existingUserEmail || existingStaffEmail) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    if (existingSchoolId) {
      return {
        success: false,
        error: "An account with this School ID already exists",
      };
    }

    const user = new User({
      email,
      password: input.password,
      role: UserRole.STUDENT,
      name: `${input.firstName} ${input.lastName}`,
      schoolId: input.schoolId,
      firstName: input.firstName,
      lastName: input.lastName,
      middleName: input.middleName || "",
      suffix: input.suffix || "",
      year: input.year,
      campus,
      contactNumber: input.contactNumber || "",
    });

    await user.save();

    // Immediate login (no email verification by design)
    const result = await signIn("credentials", {
      email,
      password: input.password,
      role: UserRole.STUDENT.toString(),
      redirect: false,
    });

    if (result?.error) {
      // Account exists but auto-login failed — let them log in manually
      return {
        success: true,
        message: "Account created. Please log in.",
        redirectTo: "/auth/login",
      };
    }

    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: "Account created successfully",
      redirectTo: "/student/dashboard",
    };
  } catch (error: any) {
    console.error("Student registration error:", error);

    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return {
        success: false,
        error:
          field === "schoolId"
            ? "An account with this School ID already exists"
            : "An account with this email already exists",
      };
    }

    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message,
      );
      return {
        success: false,
        error: messages.join(". "),
      };
    }

    return {
      success: false,
      error: "Registration failed. Please try again later.",
    };
  }
}

export async function getSession() {
  try {
    const session = await auth();

    if (!session) {
      return { success: false, error: "No session found", session: null };
    }

    return { success: true, session };
  } catch (error: any) {
    console.error("Get session error:", error);
    return { success: false, error: "Failed to get session", session: null };
  }
}

export async function checkAuth(requiredRole?: "admin" | "staff") {
  try {
    const session = await auth();

    if (!session) {
      return {
        isAuthenticated: false,
        error: "Not authenticated",
        redirect: "/?error=unauthorized",
      };
    }

    if (requiredRole) {
      if (requiredRole === "admin" && session.user?.role !== "1") {
        return {
          isAuthenticated: true,
          isAuthorized: false,
          error: "Access denied. Admin role required.",
          redirect: "/?error=forbidden",
        };
      }

      if (requiredRole === "staff") {
        const staffRoles = ["3", "4", "5", "6"];
        if (!staffRoles.includes(session.user?.role || "")) {
          return {
            isAuthenticated: true,
            isAuthorized: false,
            error: "Access denied. Staff role required.",
            redirect: "/?error=forbidden",
          };
        }
      }
    }

    return {
      isAuthenticated: true,
      isAuthorized: true,
      user: session.user,
    };
  } catch (error: any) {
    console.error("Auth check error:", error);
    return {
      isAuthenticated: false,
      error: "Authentication check failed",
      redirect: "/?error=auth_error",
    };
  }
}
