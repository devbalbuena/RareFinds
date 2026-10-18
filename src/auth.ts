import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase().trim();
        const password = parsed.data.password;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          // Prevent timing attacks by running a dummy hash comparison
          await bcrypt.compare(
            password,
            "$2a$10$wK1yPsmQk5Xb7Hh3kR9wNuP6QoB5fK9lV1gUqO8tE2eE3rT4yY5u"
          );
          return null;
        }

        // Check if user is locked out from too many failed login attempts
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          const remainingMinutes = Math.ceil(
            (new Date(user.lockedUntil).getTime() - Date.now()) / (60 * 1000)
          );
          throw new Error(
            `Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s).`
          );
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          const newFailedAttempts = user.failedLoginAttempts + 1;
          const shouldLock = newFailedAttempts >= 5;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
              lockedUntil: shouldLock
                ? new Date(Date.now() + 15 * 60 * 1000) // 15-minute lock
                : null,
            },
          });

          if (shouldLock) {
            throw new Error(
              "Too many failed login attempts. Your account has been temporarily locked for 15 minutes."
            );
          }

          return null;
        }

        // On successful authentication, reset failed attempts & lockout
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
});
