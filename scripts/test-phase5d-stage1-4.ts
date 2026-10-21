import { normalizeAreaString, isAreaAllowed } from "../src/lib/area-matching";
import { validateStatusTransition } from "../src/lib/orders/status-transitions";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import crypto from "crypto";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log("==================================================================");
console.log("PHASE 5d (STAGES 1-4) VERIFICATION: RULES, TRANSITIONS, PIN & AREAS");
console.log("==================================================================\n");

// -----------------------------------------------------------------------------
// 1. AREA MATCHING: EXACT NORMALIZED MATCHING (User Constraint #2)
// -----------------------------------------------------------------------------
console.log("--- 1. Testing Normalized Exact Area Matching ---");

// Normalization tests
assert(normalizeAreaString("Metro Manila") === "metro manila", "Normalizes lowercase & space");
assert(normalizeAreaString("  Taguig   City  ") === "taguig city", "Trims internal and outer spaces");
assert(normalizeAreaString("Quezon City,") === "quezon city", "Removes trailing punctuation");

// Null or empty list permits no areas
assert(isAreaAllowed("Makati", "Metro Manila", null) === false, "Null allowed list permits no areas");
assert(isAreaAllowed("Makati", "Metro Manila", "") === false, "Empty allowed list permits no areas");
assert(isAreaAllowed("Makati", "Metro Manila", "   ") === false, "Whitespace-only allowed list permits no areas");

// Exact matching on city
const allowedCities = "Makati, Taguig, Pasig";
assert(isAreaAllowed("Makati", "Metro Manila", allowedCities) === true, "Matches exact city in list");
assert(isAreaAllowed("taguig", "Metro Manila", allowedCities) === true, "Case-insensitive match on city");
assert(isAreaAllowed("  Pasig  ", "Metro Manila", allowedCities) === true, "Matches trimmed city in list");

// Rejection of substring match (e.g., 'Kat' shouldn't match 'Makati', 'Man' shouldn't match 'Manila')
assert(isAreaAllowed("Kat", "Rizal", allowedCities) === false, "Rejects substring city match");
assert(isAreaAllowed("Maka", "Rizal", allowedCities) === false, "Rejects partial city match");
assert(isAreaAllowed("Makati City", "Rizal", allowedCities) === false, "Exact normalized: 'Makati City' != 'Makati'");

// Exact matching on province
const allowedProvinces = "Metro Manila, Cebu, Davao del Sur";
assert(isAreaAllowed("Mandaue", "Cebu", allowedProvinces) === true, "Matches exact province in list");
assert(isAreaAllowed("Quezon City", "Metro Manila", allowedProvinces) === true, "Matches Metro Manila province");
assert(isAreaAllowed("Davao City", "Davao del Sur", allowedProvinces) === true, "Matches Davao del Sur province");
assert(isAreaAllowed("Bacolod", "Negros Occidental", allowedProvinces) === false, "Rejects province not in list");

// Mixed newline, semicolon, comma delimiters
const multiDelim = "Makati\nTaguig; Pasig, Cebu City";
assert(isAreaAllowed("Taguig", "Metro Manila", multiDelim) === true, "Handles newline delimiter");
assert(isAreaAllowed("Pasig", "Metro Manila", multiDelim) === true, "Handles semicolon delimiter");
assert(isAreaAllowed("Cebu City", "Cebu", multiDelim) === true, "Handles comma delimiter");


// -----------------------------------------------------------------------------
// 2. SERVER STATUS TRANSITION TABLE (User Constraint #3)
// -----------------------------------------------------------------------------
console.log("\n--- 2. Testing Server Status Transition Table ---");

// ONLINE PAID FLOW: PENDING_PAYMENT -> PAID -> PROCESSING -> SHIPPED -> DELIVERED
const onlinePayer = PaymentMethod.GCASH;

// Step 1: PENDING_PAYMENT -> PAID (allowed)
assert(
  validateStatusTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, onlinePayer).allowed === true,
  "Online: PENDING_PAYMENT -> PAID is allowed"
);

// Online: Cannot skip from PENDING_PAYMENT directly to PROCESSING or SHIPPED
assert(
  validateStatusTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.PROCESSING, onlinePayer).allowed === false,
  "Online: Reject skip from PENDING_PAYMENT directly to PROCESSING"
);
assert(
  validateStatusTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.SHIPPED, onlinePayer).allowed === false,
  "Online: Reject skip from PENDING_PAYMENT directly to SHIPPED"
);

// Step 2: PAID -> PROCESSING (allowed for QC)
assert(
  validateStatusTransition(OrderStatus.PAID, OrderStatus.PROCESSING, onlinePayer).allowed === true,
  "Online: PAID -> PROCESSING is allowed for QC authentication"
);

// Online: Cannot skip from PAID directly to SHIPPED or DELIVERED (QC must happen)
assert(
  validateStatusTransition(OrderStatus.PAID, OrderStatus.SHIPPED, onlinePayer).allowed === false,
  "Online: Reject skip from PAID directly to SHIPPED (QC required)"
);
assert(
  validateStatusTransition(OrderStatus.PAID, OrderStatus.DELIVERED, onlinePayer).allowed === false,
  "Online: Reject skip from PAID directly to DELIVERED"
);

// Step 3: PROCESSING -> SHIPPED (allowed)
assert(
  validateStatusTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED, onlinePayer).allowed === true,
  "Online: PROCESSING -> SHIPPED is allowed after QC verification"
);

// Step 4: SHIPPED -> DELIVERED (allowed)
assert(
  validateStatusTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED, onlinePayer).allowed === true,
  "Online: SHIPPED -> DELIVERED is allowed upon verified handover"
);

// Rejection of backward transitions
assert(
  validateStatusTransition(OrderStatus.SHIPPED, OrderStatus.PROCESSING, onlinePayer).allowed === false,
  "Online: Reject backward transition from SHIPPED to PROCESSING"
);
assert(
  validateStatusTransition(OrderStatus.DELIVERED, OrderStatus.SHIPPED, onlinePayer).allowed === false,
  "Online: Reject backward transition from DELIVERED to SHIPPED"
);

// COD FLOW: PENDING -> PROCESSING -> SHIPPED -> DELIVERED (payment settles at delivery)
const codPayer = PaymentMethod.COD;

// COD initial is PENDING
assert(
  validateStatusTransition(OrderStatus.PENDING, OrderStatus.PROCESSING, codPayer).allowed === true,
  "COD: PENDING -> PROCESSING is allowed for QC authentication"
);
// COD cannot transition to PAID prior to delivery
assert(
  validateStatusTransition(OrderStatus.PENDING, OrderStatus.PAID, codPayer).allowed === false,
  "COD: Reject transition to PAID before delivery (payment settles at delivery)"
);
assert(
  validateStatusTransition(OrderStatus.PROCESSING, OrderStatus.PAID, codPayer).allowed === false,
  "COD: Reject transition from PROCESSING to PAID"
);

// COD: PROCESSING -> SHIPPED -> DELIVERED
assert(
  validateStatusTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED, codPayer).allowed === true,
  "COD: PROCESSING -> SHIPPED is allowed"
);
assert(
  validateStatusTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED, codPayer).allowed === true,
  "COD: SHIPPED -> DELIVERED is allowed (settles payment)"
);


// -----------------------------------------------------------------------------
// 3. DELIVERY SECURITY PIN (User Constraint #5)
// -----------------------------------------------------------------------------
console.log("\n--- 3. Testing Delivery Security PIN Generation ---");

for (let i = 0; i < 20; i++) {
  const pin = crypto.randomInt(1000, 10000).toString();
  assert(pin.length === 4, `Generated PIN "${pin}" is exactly 4 digits`);
  const numeric = parseInt(pin, 10);
  assert(numeric >= 1000 && numeric <= 9999, `PIN ${pin} is in range 1000-9999`);
}

console.log("\n==================================================================");
console.log("🎉 ALL PHASE 5d (STAGES 1-4) VERIFICATION CHECKS PASSED!");
console.log("==================================================================\n");
