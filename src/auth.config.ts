import type { NextAuthConfig } from "next-auth";
import { Role } from "@prisma/client";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role || Role.CUSTOMER;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) || Role.CUSTOMER;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userRole = auth?.user?.role;

      const isAuthPage =
        nextUrl.pathname.startsWith("/sign-in") ||
        nextUrl.pathname.startsWith("/sign-up");
      const isAccountPage = nextUrl.pathname.startsWith("/account");
      const isAdminPage = nextUrl.pathname.startsWith("/admin");

      // Redirect authenticated users away from sign-in and sign-up
      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/account", nextUrl));
        }
        return true;
      }

      // Require login for customer account routes
      if (isAccountPage) {
        if (!isLoggedIn) {
          const callbackUrl = encodeURIComponent(
            nextUrl.pathname + nextUrl.search
          );
          return Response.redirect(
            new URL(`/sign-in?callbackUrl=${callbackUrl}`, nextUrl)
          );
        }
        return true;
      }

      // Require ADMIN role for admin routes
      if (isAdminPage) {
        if (!isLoggedIn) {
          const callbackUrl = encodeURIComponent(
            nextUrl.pathname + nextUrl.search
          );
          return Response.redirect(
            new URL(`/sign-in?callbackUrl=${callbackUrl}`, nextUrl)
          );
        }
        if (userRole !== Role.ADMIN) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return true;
    },
  },
  providers: [], // Configured with CredentialsProvider in src/auth.ts
} satisfies NextAuthConfig;

export default authConfig;
