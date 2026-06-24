// lib/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [], // real provider with Mongoose lives in lib/auth.ts
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
          token.cashierWindow = user.cashierWindow;
          token.mustChangePassword = user.mustChangePassword;
        }
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
          session.user.cashierWindow = token.cashierWindow as string;
          session.user.mustChangePassword = token.mustChangePassword as boolean;
        }
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
