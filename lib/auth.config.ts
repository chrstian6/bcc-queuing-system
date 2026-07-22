// lib/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.name = user.name;

        // Staff-specific fields
        if (user.staffId) {
          token.staffId = user.staffId;
          token.facultyId = user.facultyId;
          token.staffRole = user.staffRole;
          token.roleName = user.staffRole || user.roleName; // ADD THIS
          token.cashierWindow = user.cashierWindow;
          token.mustChangePassword = user.mustChangePassword;
        }

        console.log("🔑 JWT Token set:", {
          staffId: token.staffId,
          staffRole: token.staffRole,
          roleName: token.roleName,
          role: token.role,
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.name = token.name as string;

        // Staff-specific fields
        if (token.staffId) {
          session.user.staffId = token.staffId as string;
          session.user.facultyId = token.facultyId as string;
          session.user.staffRole = token.staffRole as string;
          session.user.roleName = (token.roleName || token.staffRole) as string; // ADD THIS
          session.user.cashierWindow = token.cashierWindow as string;
          session.user.mustChangePassword = token.mustChangePassword as boolean;
        }

        console.log("🔑 Session set:", {
          staffId: session.user.staffId,
          staffRole: session.user.staffRole,
          roleName: session.user.roleName,
        });
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};
