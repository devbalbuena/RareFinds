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
        token.isActive = (user as { isActive?: boolean }).isActive ?? true;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) || Role.CUSTOMER;
        session.user.isActive = token.isActive !== undefined ? Boolean(token.isActive) : true;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userRole = auth?.user?.role;
      const isUserActive = auth?.user?.isActive ?? true;

      // Immediately block deactivated users from continuing session
      if (isLoggedIn && !isUserActive) {
        return Response.redirect(new URL("/sign-in?error=deactivated", nextUrl));
      }

      const isAuthPage =
        nextUrl.pathname.startsWith("/sign-in") ||
        nextUrl.pathname.startsWith("/sign-up");
      const isAccountPage = nextUrl.pathname.startsWith("/account");
      const isCheckoutPage = nextUrl.pathname.startsWith("/checkout");
      const isAdminPage = nextUrl.pathname.startsWith("/admin");

      // Redirect authenticated users away from sign-in and sign-up
      if (isAuthPage) {
        if (isLoggedIn) {
          if (userRole === Role.ADMIN || userRole === Role.STAFF) {
            return Response.redirect(new URL("/admin", nextUrl));
          }
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Require login for checkout
      if (isCheckoutPage) {
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

      // Admin Shell Route Protection (STAFF & ADMIN allowed; ADMIN-only subpaths restricted)
      if (isAdminPage) {
        if (!isLoggedIn) {
          const callbackUrl = encodeURIComponent(
            nextUrl.pathname + nextUrl.search
          );
          return Response.redirect(
            new URL(`/sign-in?callbackUrl=${callbackUrl}`, nextUrl)
          );
        }

        // CUSTOMER role is blocked from /admin
        if (userRole !== Role.ADMIN && userRole !== Role.STAFF) {
          return Response.redirect(new URL("/", nextUrl));
        }

        // Subpages restricted only to ADMIN: /admin/users, /admin/settings, /admin/audit
        const isAdminOnlyPage =
          nextUrl.pathname.startsWith("/admin/users") ||
          nextUrl.pathname.startsWith("/admin/settings") ||
          nextUrl.pathname.startsWith("/admin/audit");

        if (isAdminOnlyPage && userRole !== Role.ADMIN) {
          return Response.redirect(new URL("/admin", nextUrl));
        }

        return true;
      }

      return true;
    },
  },
  providers: [], // Configured with CredentialsProvider in src/auth.ts
} satisfies NextAuthConfig;

export default authConfig;
