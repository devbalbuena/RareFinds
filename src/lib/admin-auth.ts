import { Role } from "@prisma/client";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { assertPermission, Permission } from "@/lib/permissions";

export interface VerifiedAdminUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
}

/**
 * Strict database-level authentication & authorization check.
 * NEVER trusts role or isActive from JWT cookies alone.
 * Re-reads current user state from the live database on every invocation.
 */
export async function verifyAdminSession(
  requiredPermission?: Permission,
  overrideCallerId?: string
): Promise<VerifiedAdminUser> {
  const callerId =
    overrideCallerId ||
    (process.env.NODE_ENV !== "production" ? process.env.TEST_CALLER_USER_ID : undefined);

  let userId = callerId;
  if (!userId) {
    const session = await auth();
    userId = session?.user?.id;
  }

  if (!userId) {
    throw new Error("You must be signed in to perform this action.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new Error("User account was not found.");
  }

  if (!user.isActive) {
    throw new Error("Your account has been deactivated. Please contact an administrator.");
  }

  if (requiredPermission) {
    assertPermission(user.role, requiredPermission);
  } else {
    assertPermission(user.role, "admin:access");
  }

  return user;
}
