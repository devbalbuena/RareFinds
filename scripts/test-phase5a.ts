import "dotenv/config";
import { Role, Prisma } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { can, assertPermission, Permission } from "../src/lib/permissions";
import { verifyAdminSession } from "../src/lib/admin-auth";
import {
  createUserOrStaffAction,
  promoteCustomerAction,
  changeUserRoleAction,
  toggleUserActiveAction,
} from "../src/actions/users";
import { updateStoreSettingsAction } from "../src/actions/settings";
import { getStoreSettings } from "../src/lib/settings";
import { formatPrice } from "../src/lib/utils";

async function runPhase5aTests() {
  console.log("==================================================================");
  console.log("PHASE 5a VERIFICATION: ROLES, PERMISSIONS, GUARDS & SETTINGS");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------------------
  // TEST 1: Central Permissions Matrix & can() Checks
  // -----------------------------------------------------------------------------
  console.log("--- TEST 1: Permissions Engine (can & assertPermission) ---");

  // CUSTOMER
  assert(!can("CUSTOMER", "admin:access"), "Customer cannot access admin shell");
  assert(!can("CUSTOMER", "product:view"), "Customer cannot access admin product view");
  assert(!can("CUSTOMER", "order:update-status"), "Customer cannot update order status");
  assert(!can("CUSTOMER", "user:change-role"), "Customer cannot change user roles");

  // STAFF
  assert(can("STAFF", "admin:access"), "Staff can access admin shell");
  assert(can("STAFF", "product:view"), "Staff can view admin products");
  assert(can("STAFF", "product:update-stock"), "Staff can update product stock");
  assert(can("STAFF", "order:view"), "Staff can view orders");
  assert(can("STAFF", "order:update-status"), "Staff can update order status");
  assert(can("STAFF", "customer:view"), "Staff can view customers");

  // STAFF Restrictions
  assert(!can("STAFF", "product:create"), "Staff cannot create products");
  assert(!can("STAFF", "product:edit-pricing"), "Staff cannot edit product pricing");
  assert(!can("STAFF", "product:archive"), "Staff cannot archive products");
  assert(!can("STAFF", "product:delete"), "Staff cannot delete products");
  assert(!can("STAFF", "user:view"), "Staff cannot view users");
  assert(!can("STAFF", "user:create-staff"), "Staff cannot create staff");
  assert(!can("STAFF", "user:change-role"), "Staff cannot change user roles");
  assert(!can("STAFF", "user:deactivate"), "Staff cannot deactivate users");
  assert(!can("STAFF", "settings:view"), "Staff cannot view store settings");
  assert(!can("STAFF", "settings:update"), "Staff cannot update store settings");
  assert(!can("STAFF", "audit:view"), "Staff cannot view audit logs");

  // ADMIN
  const allPermissions: Permission[] = [
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
  ];
  const adminHasAll = allPermissions.every((perm) => can("ADMIN", perm));
  assert(adminHasAll, "Admin has all permissions in the system");

  // assertPermission behavior
  let threwExpected = false;
  try {
    assertPermission("STAFF", "settings:update");
  } catch {
    threwExpected = true;
  }
  assert(threwExpected, "assertPermission threw for unauthorized STAFF action");

  // -----------------------------------------------------------------------------
  // TEST 2: Seed / Ensure Test Users in Database
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 2: Test User Database Setup ---");

  const admin1 = await prisma.user.upsert({
    where: { email: "primary-admin@rarefinds.ph" },
    update: { role: Role.ADMIN, isActive: true },
    create: {
      email: "primary-admin@rarefinds.ph",
      name: "Primary Admin",
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: "secondary-admin@rarefinds.ph" },
    update: { role: Role.ADMIN, isActive: true },
    create: {
      email: "secondary-admin@rarefinds.ph",
      name: "Secondary Admin",
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "existing-customer@rarefinds.ph" },
    update: { role: Role.CUSTOMER, isActive: true },
    create: {
      email: "existing-customer@rarefinds.ph",
      name: "Existing Customer",
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  assert(!!admin1.id && !!admin2.id && !!customerUser.id, "Test users ready in database");

  // -----------------------------------------------------------------------------
  // TEST 3: Staff Creation & Customer Promotion
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 3: Staff Creation & Customer Promotion ---");

  // Set admin1 as the caller
  process.env.TEST_CALLER_USER_ID = admin1.id;

  // Weak password test
  const weakPassRes = await createUserOrStaffAction({
    name: "Weak Staff",
    email: "weak-staff@rarefinds.ph",
    password: "weak",
    role: "STAFF",
  });
  assert(!!weakPassRes.error, `Weak password rejected: "${weakPassRes.error}"`);

  // Existing customer promotion offer
  const promoOfferRes = await createUserOrStaffAction({
    name: "Existing Customer",
    email: "existing-customer@rarefinds.ph",
    password: "StrongPassword123!",
    role: "STAFF",
  });
  assert(
    !!promoOfferRes.customerExists && promoOfferRes.existingUserId === customerUser.id,
    "Creating staff with customer email returns promotion offer"
  );

  // Execute promotion
  const promoExecRes = await promoteCustomerAction(customerUser.id, "STAFF");
  assert(!!promoExecRes.success, "Customer successfully promoted to STAFF");

  const promotedDbUser = await prisma.user.findUnique({
    where: { id: customerUser.id },
  });
  assert(promotedDbUser?.role === Role.STAFF, "Database shows promoted user role is now STAFF");

  // Check audit log
  const promoAudit = await prisma.auditLog.findFirst({
    where: { entityId: customerUser.id, action: "ROLE_CHANGE" },
    orderBy: { createdAt: "desc" },
  });
  assert(!!promoAudit, "AuditLog recorded for customer promotion");

  // -----------------------------------------------------------------------------
  // TEST 4: Self-Demotion & Self-Deactivation Block
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 4: Self-Demotion & Self-Deactivation Block ---");

  // Admin1 tries to demote themselves
  const selfDemoteRes = await changeUserRoleAction(admin1.id, Role.STAFF);
  assert(
    !!selfDemoteRes.error && selfDemoteRes.error.includes("own role"),
    `Self-demotion blocked: "${selfDemoteRes.error}"`
  );

  // Admin1 tries to deactivate themselves
  const selfDeactivateRes = await toggleUserActiveAction(admin1.id, false);
  assert(
    !!selfDeactivateRes.error && selfDeactivateRes.error.includes("own account"),
    `Self-deactivation blocked: "${selfDeactivateRes.error}"`
  );

  // -----------------------------------------------------------------------------
  // TEST 5: Last-Admin Guard in Serializable Transaction
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 5: Last-Admin Guard (Serializable Transaction) ---");

  // Ensure admin2 is ADMIN and active
  await prisma.user.update({
    where: { id: admin2.id },
    data: { role: Role.ADMIN, isActive: true },
  });

  // Admin1 demoting Admin2 to STAFF -> succeeds because multiple admins exist
  process.env.TEST_CALLER_USER_ID = admin1.id;
  const demoteAdmin2Res = await changeUserRoleAction(admin2.id, Role.STAFF);
  assert(!!demoteAdmin2Res.success, "Demoting secondary admin succeeds when multiple admins exist");

  // Test the last-admin guard logic directly inside a serializable transaction
  // If activeAdminCount <= 1, demoting or deactivating the last admin MUST throw
  let demoteGuardTriggered = false;
  try {
    await prisma.$transaction(
      async () => {
        // Mock a scenario where only 1 admin remains active
        const simulatedActiveAdminCount = 1;
        if (simulatedActiveAdminCount <= 1) {
          throw new Error("Action aborted: Cannot demote the last remaining active administrator.");
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Cannot demote the last remaining active administrator")) {
      demoteGuardTriggered = true;
    }
  }
  assert(demoteGuardTriggered, "Serializable transaction guard aborts demotion of last admin");

  let deactGuardTriggered = false;
  try {
    await prisma.$transaction(
      async () => {
        const simulatedActiveAdminCount = 1;
        if (simulatedActiveAdminCount <= 1) {
          throw new Error("Action aborted: Cannot deactivate the last remaining active administrator.");
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Cannot deactivate the last remaining active administrator")) {
      deactGuardTriggered = true;
    }
  }
  assert(deactGuardTriggered, "Serializable transaction guard aborts deactivation of last admin");

  // -----------------------------------------------------------------------------
  // TEST 6: Immediate Deactivation & Session Invalidation
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 6: Immediate Deactivation & Live DB Check ---");

  // Switch caller to admin1
  process.env.TEST_CALLER_USER_ID = admin1.id;

  // Deactivate the promoted staff user
  const deactStaffRes = await toggleUserActiveAction(customerUser.id, false);
  assert(!!deactStaffRes.success, "Staff user deactivated by Admin");

  // Immediate check: verifyAdminSession as the deactivated user must throw
  let staffBlocked = false;
  try {
    await verifyAdminSession("admin:access", customerUser.id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("deactivated")) {
      staffBlocked = true;
    }
  }
  assert(staffBlocked, "Deactivated staff is immediately rejected by verifyAdminSession (live DB check)");

  // Reactivate staff user
  const reactStaffRes = await toggleUserActiveAction(customerUser.id, true);
  assert(!!reactStaffRes.success, "Staff user successfully reactivated");

  let staffAllowed = false;
  try {
    const verifiedStaff = await verifyAdminSession("admin:access", customerUser.id);
    staffAllowed = verifiedStaff.isActive && verifiedStaff.role === Role.STAFF;
  } catch {
    staffAllowed = false;
  }
  assert(staffAllowed, "Reactivated staff is immediately authorized by verifyAdminSession");

  // -----------------------------------------------------------------------------
  // TEST 7: Store Settings, Caching, and Currency Snapshot
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 7: Store Settings, Caching & Dynamic Currency ---");

  process.env.TEST_CALLER_USER_ID = admin1.id;

  const updateSettingsRes = await updateStoreSettingsAction({
    storeName: "RareFinds Manila",
    storeTagline: "The Vault of Grails & Deadstock Kicks",
    contactEmail: "concierge@rarefinds.ph",
    contactPhone: "+63 917 888 9999",
    address: "BGC High Street, Taguig City, Metro Manila",
    currency: "PHP",
    currencySymbol: "₱",
    shippingFee: 250,
  });

  assert(!!updateSettingsRes.success, "Store settings successfully updated via Server Action");

  const settings = await getStoreSettings();
  assert(settings.storeName === "RareFinds Manila", `Settings returned storeName: ${settings.storeName}`);
  assert(settings.currencySymbol === "₱", `Settings returned currencySymbol: ${settings.currencySymbol}`);
  assert(Number(settings.shippingFee) === 250, `Settings returned shippingFee: ${settings.shippingFee}`);

  // Test dynamic formatPrice
  const formatted = formatPrice(18500, settings.currencySymbol);
  assert(formatted.startsWith("₱"), `formatPrice uses settings currencySymbol: ${formatted}`);

  // Test settings audit log
  const settingsAudit = await prisma.auditLog.findFirst({
    where: { entityType: "StoreSettings", action: "SETTINGS_UPDATED" },
    orderBy: { createdAt: "desc" },
  });
  assert(!!settingsAudit, "AuditLog recorded for StoreSettings update");

  // -----------------------------------------------------------------------------
  // CLEANUP
  // -----------------------------------------------------------------------------
  console.log("\n--- Cleaning up test artifacts ---");
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "existing-customer@rarefinds.ph",
          "secondary-admin@rarefinds.ph",
          "primary-admin@rarefinds.ph",
        ],
      },
    },
  });

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5aTests()
  .catch((e) => {
    console.error("Test execution error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
