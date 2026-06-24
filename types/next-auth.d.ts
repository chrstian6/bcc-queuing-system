// types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    staffId?: string;
    facultyId?: string;
    staffRole?: string;
    cashierWindow?: string;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: string;
      staffId?: string;
      facultyId?: string;
      staffRole?: string;
      cashierWindow?: string;
      mustChangePassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    staffId?: string;
    facultyId?: string;
    staffRole?: string;
    cashierWindow?: string;
    mustChangePassword?: boolean;
  }
}
