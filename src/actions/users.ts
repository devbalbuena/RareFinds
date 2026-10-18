"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in standalone test or script contexts
  }
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_-])[A-Za-z\d@$!%*?&#^_-]{8,}$/;

const createStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      passwordRegex,
      "Password must include uppercase, lowercase, number, and special character"
    ),
  role: z.enum(["STAFF", "ADMIN"]).default("STAFF"),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/**
 * Create Staff or Admin Account
 * If email already belongs to a CUSTOMER, offers to promote instead of failing.
 */
export async function createUserOrStaffAction(input: CreateStaffInput) {
  try {
    const caller = await verifyAdminSession("user:create-staff");

    const parsed = createStaffSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input data." };
    }

    const { name, email: rawEmail, password, role } = parsed.data;
    const email = rawEmail.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (existingUser) {
      if (existingUser.role === Role.CUSTOMER) {
        return {
          customerExists: true,
          existingUserId: existingUser.id,
          existingUserName: existingUser.name,
          existingUserEmail: existingUser.email,
          message: `A customer account with "${email}" already exists. Would you like to promote them to ${role} instead?`,
        };
      }
      return { error: `An account with "${email}" already exists as ${existingUser.role}.` };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role as Role,
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    // Record in Audit Log
    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "USER_CREATED",
        entityType: "User",
        entityId: newUser.id,
        details: {
          createdUserName: newUser.name,
          createdUserEmail: newUser.email,
          assignedRole: newUser.role,
        },
      },
    });

    safeRevalidatePath("/admin/users");
    safeRevalidatePath("/admin/audit");

    return { success: true, user: newUser };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create staff account.";
    return { error: msg };
  }
}

/**
 * Promote an existing customer to Staff or Admin
 */
export async function promoteCustomerAction(targetUserId: string, targetRole: "STAFF" | "ADMIN" = "STAFF") {
  try {
    const caller = await verifyAdminSession("user:create-staff");

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!target) {
      return { error: "Target user account was not found." };
    }

    const previousRole = target.role;

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: targetRole as Role, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "ROLE_CHANGE",
        entityType: "User",
        entityId: targetUserId,
        details: {
          targetEmail: target.email,
          previousRole,
          newRole: targetRole,
          promotedBy: caller.email,
        },
      },
    });

    safeRevalidatePath("/admin/users");
    safeRevalidatePath("/admin/audit");

    return { success: true, message: `Successfully promoted ${target.email} to ${targetRole}.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to promote user.";
    return { error: msg };
  }
}

/**
 * Change a user's role (CUSTOMER, STAFF, ADMIN)
 * Strictly enforces:
 *  1. Caller cannot change their own role (self-demotion blocked).
 *  2. Count check & update run inside a serializable transaction to prevent race conditions from removing the last admin.
 */
export async function changeUserRoleAction(targetUserId: string, newRole: Role) {
  try {
    const caller = await verifyAdminSession("user:change-role");

    if (targetUserId === caller.id) {
      return { error: "You cannot change or demote your own role." };
    }

    await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, email: true, role: true, isActive: true },
        });

        if (!target) {
          throw new Error("Target user not found.");
        }

        // If target is currently ADMIN and being demoted to non-ADMIN, guard last admin
        if (target.role === Role.ADMIN && newRole !== Role.ADMIN) {
          const activeAdminCount = await tx.user.count({
            where: { role: Role.ADMIN, isActive: true },
          });

          if (activeAdminCount <= 1) {
            throw new Error(
              "Action aborted: Cannot demote the last remaining active administrator."
            );
          }
        }

        await tx.user.update({
          where: { id: targetUserId },
          data: { role: newRole },
        });

        await tx.auditLog.create({
          data: {
            userId: caller.id,
            userEmail: caller.email,
            action: "ROLE_CHANGE",
            entityType: "User",
            entityId: targetUserId,
            details: {
              targetEmail: target.email,
              previousRole: target.role,
              newRole,
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    safeRevalidatePath("/admin/users");
    safeRevalidatePath("/admin/audit");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update role.";
    return { error: msg };
  }
}

/**
 * Toggle user activation status (Deactivate / Reactivate)
 * Strictly enforces:
 *  1. Caller cannot deactivate their own account (self-deactivation blocked).
 *  2. Count check & update run inside a serializable transaction to prevent deactivating the last active admin.
 */
export async function toggleUserActiveAction(targetUserId: string, isActive: boolean) {
  try {
    const caller = await verifyAdminSession("user:deactivate");

    if (targetUserId === caller.id) {
      return { error: "You cannot deactivate your own account." };
    }

    await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, email: true, role: true, isActive: true },
        });

        if (!target) {
          throw new Error("Target user not found.");
        }

        // If target is an ADMIN and being deactivated, guard last admin
        if (target.role === Role.ADMIN && !isActive) {
          const activeAdminCount = await tx.user.count({
            where: { role: Role.ADMIN, isActive: true },
          });

          if (activeAdminCount <= 1) {
            throw new Error(
              "Action aborted: Cannot deactivate the last remaining active administrator."
            );
          }
        }

        await tx.user.update({
          where: { id: targetUserId },
          data: { isActive },
        });

        await tx.auditLog.create({
          data: {
            userId: caller.id,
            userEmail: caller.email,
            action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
            entityType: "User",
            entityId: targetUserId,
            details: {
              targetEmail: target.email,
              role: target.role,
              previousState: target.isActive,
              newState: isActive,
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    safeRevalidatePath("/admin/users");
    safeRevalidatePath("/admin/audit");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to change user status.";
    return { error: msg };
  }
}
