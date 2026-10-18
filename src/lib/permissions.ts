import { Role } from "@prisma/client";

export type Permission =
  // Admin Shell Access
  | "admin:access"
  // Sneaker Products & Inventory
  | "product:view"
  | "product:update-stock"
  | "product:create"
  | "product:edit-pricing"
  | "product:archive"
  | "product:delete"
  // Order Fulfillment & Tracking
  | "order:view"
  | "order:update-status"
  | "order:cancel"
  // Customer Directory
  | "customer:view"
  // User & Staff Management (ADMIN only)
  | "user:view"
  | "user:create-staff"
  | "user:change-role"
  | "user:deactivate"
  // Store Branding & Configuration (ADMIN only)
  | "settings:view"
  | "settings:update"
  // Audit Trail (ADMIN only)
  | "audit:view";

/**
 * Single source of truth for Role-to-Permission mapping.
 * Avoids scattering string checks across the codebase.
 */
const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  CUSTOMER: new Set<Permission>([]),

  STAFF: new Set<Permission>([
    "admin:access",
    "product:view",
    "product:update-stock",
    "order:view",
    "order:update-status",
    "order:cancel",
    "customer:view",
  ]),

  ADMIN: new Set<Permission>([
    "admin:access",
    "product:view",
    "product:update-stock",
    "product:create",
    "product:edit-pricing",
    "product:archive",
    "product:delete",
    "order:view",
    "order:update-status",
    "order:cancel",
    "customer:view",
    "user:view",
    "user:create-staff",
    "user:change-role",
    "user:deactivate",
    "settings:view",
    "settings:update",
    "audit:view",
  ]),
};

/**
 * Checks whether a given role has a specific permission.
 */
export function can(
  role: Role | string | undefined | null,
  permission: Permission
): boolean {
  if (!role) return false;
  const normalizedRole = role as Role;
  const permissions = ROLE_PERMISSIONS[normalizedRole];
  if (!permissions) return false;
  return permissions.has(permission);
}

/**
 * Asserts that the role has the permission, or throws an error.
 */
export function assertPermission(
  role: Role | string | undefined | null,
  permission: Permission,
  customMessage?: string
): void {
  if (!can(role, permission)) {
    throw new Error(
      customMessage ||
        `Forbidden: Role '${role || "ANONYMOUS"}' lacks required permission '${permission}'.`
    );
  }
}

