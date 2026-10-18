"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").trim(),
    email: z.string().email("Please enter a valid email address").trim().toLowerCase(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function signUpAction(prevState: unknown, formData: FormData) {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const validated = signUpSchema.safeParse(rawData);
  if (!validated.success) {
    const firstError = validated.error.issues[0]?.message || "Invalid input";
    return { error: firstError };
  }

  const { name, email, password } = validated.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "An account with this email address already exists." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.CUSTOMER,
      },
    });

    // Create an initial cart for the new user
    await prisma.cart.create({
      data: {
        userId: user.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Sign up error:", error);
    return { error: "Something went wrong creating your account. Please try again." };
  }
}

export async function signInAction(prevState: unknown, formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = (formData.get("callbackUrl") as string) || "/account";

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return { error: "Please enter both email and password." };
  }

  try {
    await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirectTo: callbackUrl,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        case "CallbackRouteError":
          return {
            error:
              error.cause?.err?.message ||
              "Invalid email or password or account temporarily locked.",
          };
        default:
          return { error: "Failed to sign in. Please try again." };
      }
    }
    // Re-throw redirect errors so Next.js can handle navigation
    throw error;
  }
}
