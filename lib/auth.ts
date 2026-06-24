// lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "./mongodb";
import User, { UserRole } from "@/models/User";
import Staff from "@/models/Staff";
import { authConfig } from "./auth.config";

const isProduction = process.env.NODE_ENV === "production";

// Staff role numbers - use const assertion for type safety
const StaffRoles = {
  REGISTRAR: 3,
  DEAN: 4,
  DSDW: 5,
  CASHIER: 6,
} as const;

// Helper function to check if a number is a valid staff role
function isStaffRole(
  role: number,
): role is (typeof StaffRoles)[keyof typeof StaffRoles] {
  return Object.values(StaffRoles).includes(role as any);
}

// Helper function to get role number from staff role name
function getStaffRoleNumber(roleName: string): number {
  const roleMap: Record<string, number> = {
    registrar: StaffRoles.REGISTRAR,
    dean: StaffRoles.DEAN,
    dsdw: StaffRoles.DSDW,
    cashier: StaffRoles.CASHIER,
  };
  return roleMap[roleName] || StaffRoles.CASHIER;
}

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "admin@bcc.edu.ph",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "••••••••",
        },
        role: {
          label: "Role",
          type: "text",
        },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.password ||
          !credentials?.role
        ) {
          throw new Error("Please provide all required fields");
        }

        const roleNumber = parseInt(credentials.role as string);

        try {
          await connectDB();

          // Check if it's a staff role (3, 4, 5, or 6)
          if (isStaffRole(roleNumber)) {
            // Staff authentication
            const staff = await Staff.findOne({
              email: (credentials.email as string).toLowerCase().trim(),
              status: "active",
            }).select("+password");

            if (!staff) {
              throw new Error("Invalid email or password");
            }

            // Get the expected role number for this staff member
            const expectedRoleNumber = getStaffRoleNumber(staff.roleName);

            if (expectedRoleNumber !== roleNumber) {
              throw new Error(`Invalid credentials for this role`);
            }

            const isPasswordValid = await staff.comparePassword(
              credentials.password as string,
            );

            if (!isPasswordValid) {
              throw new Error("Invalid email or password");
            }

            return {
              id: staff._id.toString(),
              email: staff.email,
              role: expectedRoleNumber.toString(),
              name: `${staff.firstName} ${staff.lastName}`,
              staffId: staff.staffId,
              facultyId: staff.facultyId,
              staffRole: staff.roleName,
              cashierWindow: staff.cashierWindow,
              mustChangePassword: staff.mustChangePassword,
            };
          } else if (
            roleNumber === UserRole.ADMIN ||
            roleNumber === UserRole.STUDENT
          ) {
            // Admin/Student authentication
            const user = await User.findOne({
              email: (credentials.email as string).toLowerCase().trim(),
            }).select("+password");

            if (!user) {
              throw new Error("Invalid email or password");
            }

            if (user.role !== roleNumber) {
              throw new Error(`Invalid credentials for this role`);
            }

            const isPasswordValid = await user.comparePassword(
              credentials.password as string,
            );

            if (!isPasswordValid) {
              throw new Error("Invalid email or password");
            }

            return {
              id: user._id.toString(),
              email: user.email,
              role: user.role.toString(),
              name: user.name || user.email.split("@")[0],
            };
          } else {
            throw new Error("Invalid role specified");
          }
        } catch (error: any) {
          console.error("Authorization error:", error.message);
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  debug: process.env.NODE_ENV === "development",
});
