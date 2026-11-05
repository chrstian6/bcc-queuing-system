// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    staffId?: string;
    facultyId?: string;
    staffRole?: string;
    cashierWindow?: string;
    mustChangePassword?: boolean;
    schoolId?: string;
    year?: string;
    campus?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      staffId?: string;
      facultyId?: string;
      staffRole?: string;
      cashierWindow?: string;
      mustChangePassword?: boolean;
      schoolId?: string;
      year?: string;
      campus?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    staffId?: string;
    facultyId?: string;
    staffRole?: string;
    cashierWindow?: string;
    mustChangePassword?: boolean;
    schoolId?: string;
    year?: string;
    campus?: string;
  }
}
