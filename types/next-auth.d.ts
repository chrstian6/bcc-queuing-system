// types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
    name?: string;
  }

  interface Session {
    user: {
      id?: string;
      role?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    name?: string;
  }
}
