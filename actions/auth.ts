// app/actions/auth.ts
"use server";

import { signIn, signOut, auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User, { UserRole } from "@/models/User";
import Staff from "@/models/Staff";
import { revalidatePath } from "next/cache";

interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
  mustChangePassword?: boolean;
}

// Helper function instead of exported constant
function getStaffRoleNumber(roleName: string): number {
  const roleMap: Record<string, number> = {
    registrar: 3,
    dean: 4,
    dsdw: 5,
    cashier: 6,
  };
  return roleMap[roleName] || 6;
}

export async function loginAction(
  email: string,
  password: string,
  role: "admin" | "staff",
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

    // Admin login
    const result = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      role: UserRole.ADMIN.toString(),
      redirect: false,
    });

    if (result?.error) {
      const errorMessages: Record<string, string> = {
        "Invalid email or password":
          "Invalid email or password. Please try again.",
        "Invalid credentials for this role":
          "Invalid admin credentials. Please check your email and password.",
        "Please provide all required fields":
          "Please fill in all required fields.",
        "Invalid role specified": "Invalid role specified. Please try again.",
      };

      return {
        success: false,
        error: errorMessages[result.error] || result.error,
      };
    }

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: "Login successful",
      redirectTo: "/admin/dashboard",
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
    revalidatePath("/registrar/dashboard");
    revalidatePath("/dean/dashboard");
    revalidatePath("/dsdw/dashboard");
    revalidatePath("/cashier/dashboard");
    return { success: true, message: "Logged out successfully" };
  } catch (error: any) {
    console.error("Logout error:", error);
    return { success: false, error: "Failed to logout. Please try again." };
  }
}

export async function registerAction(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResponse> {
  try {
    if (!email || !password) {
      return { success: false, error: "Please provide all required fields" };
    }

    if (!email.includes("@")) {
      return { success: false, error: "Please enter a valid email address" };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters",
      };
    }

    await connectDB();

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      role: UserRole.ADMIN,
      name: name || email.split("@")[0],
    });

    await user.save();

    return {
      success: true,
      message: "Admin account created successfully",
    };
  } catch (error: any) {
    console.error("Registration error:", error);

    if (error?.code === 11000) {
      return {
        success: false,
        error: "An account with this email already exists",
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
