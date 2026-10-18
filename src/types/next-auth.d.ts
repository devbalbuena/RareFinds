import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isActive: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    isActive?: boolean;
  }
}
