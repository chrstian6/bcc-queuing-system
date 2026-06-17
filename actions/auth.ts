// actions/auth.ts
"use server";

import { signIn, signOut, auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User, { UserRole } from "@/models/User";
import { revalidatePath } from "next/cache";

interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
}

export async function loginAction(
  email: string,
  password: string,
  role: "admin" | "student",
): Promise<AuthResponse> {
  try {
    if (!email || !password || !role) {
      return { success: false, error: "Please provide all required fields" };
    }

    if (!email.includes("@")) {
      return { success: false, error: "Please enter a valid email address" };
    }

    // Convert role string to number for the credentials
    const roleNumber = role === "admin" ? UserRole.ADMIN : UserRole.STUDENT;

    const result = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      role: roleNumber.toString(),
      redirect: false,
    });

    if (result?.error) {
      const errorMessages: Record<string, string> = {
        "Invalid email or password":
          "Invalid email or password. Please try again.",
        "Invalid credentials for this role": `Invalid ${role} credentials. Please check your email and password.`,
        "Please provide all required fields":
          "Please fill in all required fields.",
      };

      return {
        success: false,
        error: errorMessages[result.error] || result.error,
      };
    }

    revalidatePath("/");

    return {
      success: true,
      message: "Login successful",
      redirectTo: role === "admin" ? "/admin/dashboard" : "/student/dashboard",
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

export async function logoutAction(): Promise<AuthResponse> {
  try {
    await signOut({ redirect: false });
    revalidatePath("/");
    return { success: true, message: "Logged out successfully" };
  } catch (error: any) {
    console.error("Logout error:", error);
    return { success: false, error: "Failed to logout. Please try again." };
  }
}

export async function registerAction(
  email: string,
  password: string,
  role: "admin" | "student",
  name?: string,
): Promise<AuthResponse> {
  try {
    if (!email || !password || !role) {
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

    if (role !== "admin" && role !== "student") {
      return { success: false, error: "Invalid role specified" };
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

    // Create new user with numeric role
    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      role: role === "admin" ? UserRole.ADMIN : UserRole.STUDENT,
      name: name || email.split("@")[0],
    });

    await user.save();

    const loginResult = await loginAction(email, password, role);

    if (!loginResult.success) {
      return {
        success: false,
        error:
          "Registration successful but auto-login failed. Please login manually.",
      };
    }

    return {
      success: true,
      message: "Registration successful",
      redirectTo: role === "admin" ? "/admin/dashboard" : "/student/dashboard",
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
    return { success: true, session };
  } catch (error: any) {
    console.error("Get session error:", error);
    return { success: false, error: "Failed to get session", session: null };
  }
}

export async function checkAuth(requiredRole?: "admin" | "student") {
  try {
    const session = await auth();

    if (!session) {
      return {
        isAuthenticated: false,
        error: "Not authenticated",
        redirect: "/?error=unauthorized",
      };
    }

    if (requiredRole && session.user?.role !== requiredRole) {
      return {
        isAuthenticated: true,
        isAuthorized: false,
        error: `Access denied. ${requiredRole} role required.`,
        redirect: "/?error=forbidden",
      };
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
