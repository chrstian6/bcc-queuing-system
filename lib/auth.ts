// lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "./mongodb";
import User, { UserRole } from "@/models/User";

const isProduction = process.env.NODE_ENV === "production";

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "student@bcc.edu.ph",
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

        if (roleNumber !== UserRole.ADMIN && roleNumber !== UserRole.STUDENT) {
          throw new Error("Invalid role specified");
        }

        try {
          await connectDB();

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
        } catch (error: any) {
          console.error("Authorization error:", error.message);
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  trustHost: true,
});
