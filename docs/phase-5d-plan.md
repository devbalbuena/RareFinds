# Phase 5d Architectural Plan: Delivery Methods, Payment Rules, Timeline Realignment & Finance Subsystem

## 1. Executive Summary & Goals

Phase 5d addresses operational realism, financial clarity, and trust in the RareFinds sneaker vault platform. In high-value sneaker commerce (pairs valued between ₱20,000 and ₱195,000+), operational inaccuracies—such as showing authentication as complete before staff inspects the shoe, or allowing unrestricted COD across provinces—introduce significant business risk and undermine customer trust.

### Primary Objectives:
1. **Fulfillment Timeline Realignment**: Separate payment confirmation from quality control (QC). Introduce an honest 5-step lifecycle:
   $$\text{Order Placed} \longrightarrow \text{Paid} \longrightarrow \text{QC \& Packing} \longrightarrow \text{Shipped / Ready} \longrightarrow \text{Delivered / Picked Up}$$
2. **Tri-Modal Delivery Architecture**:
   - `PICKUP`: Direct storefront collection at the vault (Free).
   - `LOCAL_DELIVERY`: Same-day courier/rider with a secure 4-digit customer delivery PIN.
   - `COURIER`: Nationwide courier with waybill tracking, signed Proof of Delivery (POD) uploads, and customer "Confirm Received" acknowledgement with auto-completion.
3. **Configurable COD Risk Guardrails**:
   - Server-enforced restrictions in `StoreSettings`: `codEnabled`, `codAllowedAreas` (provinces/cities), and `codMaxAmount` (e.g., maximum ₱20,000). COD strictly disallowed for nationwide courier orders.
4. **Manual Payment Bridge (`MANUAL_TRANSFER`)**:
   - Storefront GCash and Bank Transfer options with customer receipt upload into a private storage bucket, a 60-minute reservation hold, and an Admin/Staff verification drawer.
5. **Authentication & Identity Guards**:
   - Mandatory verified email before placing orders; strict phone format validation at checkout.
6. **Finance Command Center (`/admin/finance`)**:
   - Dedicated `Payment` transaction ledger; revenue analytics by period and method; gross profit calculation ($\text{Revenue} - \text{Cost Price}$); COD settlement tracking; toggleable demo transaction filtering. Restrict access strictly to `ADMIN` (`finance:view`).

---

## 2. Comprehensive Codebase Audit

### A. Current Order & Timeline Status Audit
- **Files**: `prisma/schema.prisma`, `src/actions/admin-orders.ts`, `src/lib/payments/order-payment.ts`, `src/components/orders/OrderTrackingTimeline.tsx`, `src/components/admin/OrderDetailView.tsx`.
- **Finding**: Currently, `completeOrderPayment` sets `status: OrderStatus.PAID`. In `OrderTrackingTimeline.tsx`, `isProcessing` is calculated as `status === "PROCESSING" || status === "PAID" || isShipped`. Consequently, when a customer pays via GCash or Card, Step 2 ("Authentication & QC") turns green immediately.
- **Problem**: Vault staff have not physically inspected the pair yet.
- **Solution**: Split status and UI into:
  - Step 1: **Order Placed** (`createdAt`)
  - Step 2: **Paid** (`paidAt`, green when `paymentStatus === PAID`; for COD, amber "Due Upon Handover")
  - Step 3: **Authentication & QC** (`qcVerifiedAt`, turns green ONLY when staff clicks "Confirm QC & Pack")
  - Step 4: **Dispatched / Ready** (`shippedAt`)
  - Step 5: **Delivered / Picked Up** (`deliveredAt` or customer confirmation)

### B. Current Checkout & Delivery Audit
- **Files**: `src/actions/orders.ts`, `src/components/checkout/CheckoutForm.tsx`, `src/app/(store)/checkout/page.tsx`.
- **Finding**: Checkout assumes a single delivery mode with a flat `shippingFee` from `StoreSettings`. No pickup or local delivery options exist.
- **Solution**: Introduce `deliveryMethod` (`PICKUP`, `LOCAL_DELIVERY`, `COURIER`) with separate fee tiers in `StoreSettings` (`shippingFeeLocal` vs `shippingFeeCourier`). Generate a secure 4-digit `deliveryPin` for `LOCAL_DELIVERY`.

### C. Cash on Delivery (COD) Audit
- **Files**: `src/actions/orders.ts`, `src/lib/settings.ts`.
- **Finding**: Currently, any customer can select COD for any shoe (even a ₱68,000 or ₱195,000 grail) to any address nationwide.
- **Problem**: High risk of bogus buyers, damaged returns, and lost shipping fees on expensive holy grails.
- **Solution**: Enforce server-side checks in `placeOrderAction`:
  1. `storeSettings.codEnabled === true`
  2. `totalAmount <= storeSettings.codMaxAmount` (e.g. ₱20,000)
  3. `deliveryMethod === PICKUP || deliveryMethod === LOCAL_DELIVERY`
  4. If `LOCAL_DELIVERY`, recipient city/province must match `storeSettings.codAllowedAreas`.

### D. Private Storage & Proof of Delivery Audit
- **Files**: `src/lib/storage.ts`.
- **Finding**: Storage client is hardcoded to a public `product-images` bucket.
- **Solution**: Support a private `order-proofs` bucket. Proof of delivery photos and manual transfer receipts are uploaded via server actions using magic-byte validation, and displayed exclusively via temporary pre-signed URLs (valid for 60 minutes).

### E. Finance & Reporting Audit
- **Files**: `src/actions/admin-orders.ts`, `src/components/admin/AdminSidebar.tsx`.
- **Finding**: No dedicated `Payment` model exists; transaction totals are computed ad-hoc from `Order` rows. Staff members currently have partial visibility into orders, but there is no dedicated financial dashboard or margin calculation.
- **Solution**: Create a `Payment` entity tracking individual transaction events. Build `/admin/finance` accessible only to `ADMIN` with the `finance:view` permission.

---

## 3. Database Schema Changes & Migration Plan

### A. New Enums
```prisma
enum DeliveryMethod {
  PICKUP
  LOCAL_DELIVERY
  COURIER
}
```

Update `PaymentMethod` to include manual transfer:
```prisma
enum PaymentMethod {
  COD
  TEST
  GCASH
  MAYA
  CARD
  MANUAL_TRANSFER
}
```

### B. Updated `Order` Model
```prisma
model Order {
  // Existing fields preserved...
  deliveryMethod      DeliveryMethod @default(COURIER)
  deliveryPin         String?        // 4-digit PIN for LOCAL_DELIVERY
  qcVerifiedAt        DateTime?      // Timestamp when staff completed vault QC
  qcVerifiedBy        String?        // Staff ID or email who conducted QC
  customerConfirmedAt DateTime?      // Timestamp when customer confirmed receipt
  proofOfDeliveryUrl  String?        // Private Supabase storage key for POD image
  paymentProofUrl     String?        // Private Supabase storage key for manual transfer receipt
  
  // Relations
  payments            Payment[]
  // ...
}
```

### C. New `Payment` Model
```prisma
model Payment {
  id               String        @id @default(cuid())
  orderId          String
  order            Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  method           PaymentMethod
  amount           Decimal       @db.Decimal(10, 2)
  status           PaymentStatus @default(UNPAID)
  reference        String?
  isSimulated      Boolean       @default(false)
  paidAt           DateTime?
  proofUrl         String?
  rejectionReason  String?
  verifiedBy       String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@index([orderId])
  @@index([status])
  @@index([isSimulated])
  @@index([createdAt])
  @@map("payments")
}
```

### D. Updated `StoreSettings` Model
```prisma
model StoreSettings {
  // Existing fields...
  shippingFeeLocal           Decimal  @default(150.00) @db.Decimal(10, 2)
  shippingFeeCourier         Decimal  @default(250.00) @db.Decimal(10, 2)
  pickupAddress              String?  @default("RareFinds Vault, 4F Greenhills Mall, San Juan, Metro Manila")
  pickupInstructions         String?  @default("Present a valid government ID and your Order Reference upon claiming.")
  
  // COD Guardrails
  codEnabled                 Boolean  @default(true)
  codAllowedAreas            String   @default("Metro Manila, San Juan, Quezon City, Makati, Taguig, Pasig, Mandaluyong, Manila")
  codMaxAmount               Decimal  @default(20000.00) @db.Decimal(10, 2)
  
  // Manual Transfer Details
  manualPaymentInstructions  String?  @default("GCash: 0917-123-4567 (RareFinds Manila)\nBDO Unibank: 0012-3456-7890 (RareFinds Sneaker Vault Inc.)")
  manualPaymentQrUrl         String?
  manualPaymentHoldMinutes   Int      @default(60)
  
  // Auto-completion
  autoCompleteDays           Int      @default(3)
}
```

### E. Migration & Backfill Strategy
1. Standard Prisma migration: `prisma migrate dev --name phase_5d_delivery_payments_finance`.
2. Backfill script inside migration:
   - Sets `deliveryMethod = 'COURIER'` on all legacy orders.
   - For every existing order where `paymentStatus = 'PAID'` or `status IN ('PAID', 'SHIPPED', 'DELIVERED')`: creates a corresponding `Payment` record with `amount = order.totalAmount`, `status = 'PAID'`, `method = order.paymentMethod`, `paidAt = order.paidAt || order.createdAt`, and `isSimulated = order.isSimulated`.
   - Populates existing seed users with `emailVerified = NOW()`.

---

## 4. Architectural & API Specifications

### 1. Timeline & QC Separation
- **State Transition Machine**:
  - `Order Created` $\rightarrow$ `status: PENDING_PAYMENT` (if online/manual) or `PENDING` (if COD).
  - `Payment Received` $\rightarrow$ `paymentStatus = PAID`, `paidAt = now()`, `status = PAID`. Order moves to the **QC & Packing** stage, displayed as *In Progress* to the customer.
  - `Staff Action: confirmQcAction(orderId)`:
    - Sets `qcVerifiedAt = now()`, `qcVerifiedBy = caller.email`, `status = PROCESSING`.
    - Customer timeline turns Step 3 (QC & Packing) green.
  - `Staff Action: dispatchOrderAction(orderId, carrier, tracking)`:
    - Sets `shippedAt = now()`, `status = SHIPPED`.
  - `Delivery Action: markOrderDeliveredAction(orderId, pin?, proofFile?)`:
    - Validates PIN if `LOCAL_DELIVERY`.
    - Uploads POD if provided.
    - Sets `deliveredAt = now()`, `status = DELIVERED`.
    - If COD, creates/updates `Payment` row and marks `paymentStatus = PAID`.

### 2. Delivery Methods & Proof of Delivery
- **PIN Verification**:
  - For `LOCAL_DELIVERY`, generate a cryptographic 4-digit PIN: `Math.floor(1000 + Math.random() * 9000).toString()`.
  - Stored plain with access control; rendered only to the buyer and Admin/Staff.
  - To mark delivered, staff submits PIN; server compares. Admin can override with audit reason (`PIN_OVERRIDE`).
- **Proof of Delivery Upload**:
  - Server action `uploadDeliveryProofAction(orderId, formData)`.
  - Storage path: `order-proofs/deliveries/{orderId}/{filename}`.
  - Magic byte verification (JPEG, PNG, WebP $\le$ 5MB).
  - Accessible strictly via 1-hour signed URLs.
- **Customer "Confirm Received"**:
  - Button active on `/account/orders/[id]` and `/order-success/[orderId]` once status is `SHIPPED` or `DELIVERED`.
  - Sets `customerConfirmedAt = now()`.

### 3. COD Server-Side Validation Matrix
```typescript
if (paymentMethod === "COD") {
  if (!settings.codEnabled) throw new Error("Cash on Delivery is currently disabled.");
  if (totalAmount > Number(settings.codMaxAmount)) {
    throw new Error(`COD is restricted to orders up to ₱${settings.codMaxAmount.toLocaleString()}. Please choose a prepaid method.`);
  }
  if (deliveryMethod === "COURIER") {
    throw new Error("Nationwide courier shipments require advance payment to protect authentic inventory.");
  }
  if (deliveryMethod === "LOCAL_DELIVERY") {
    const allowed = settings.codAllowedAreas.split(",").map(s => s.trim().toLowerCase());
    const matchesCity = allowed.some(a => shippingAddress.city.toLowerCase().includes(a));
    const matchesProvince = allowed.some(a => shippingAddress.province.toLowerCase().includes(a));
    if (!matchesCity && !matchesProvince) {
      throw new Error(`COD is only available in: ${settings.codAllowedAreas}.`);
    }
  }
}
```

### 4. Manual Transfer (`MANUAL_TRANSFER`)
- Order created with `expiresAt: now + settings.manualPaymentHoldMinutes`.
- Customer uploads proof screenshot via `submitPaymentProofAction(orderId, formData)`.
- Server creates `Payment` row with `status: UNPAID`, `proofUrl: storageKey`.
- Admin/Staff sees order in `/admin/orders` and `/admin/finance` under "Pending Verification":
  - **Approve**: Calls `completeOrderPayment`, sets `Payment.status = PAID`, releases hold.
  - **Reject**: Prompts for reason (e.g., "Reference mismatch"), sets `Payment.status = FAILED`, cancels order, and frees stock.

### 5. Email Verification & Phone Guard
- Before `placeOrderAction` proceeds, verify:
  ```typescript
  if (!user.emailVerified) {
    return { error: "Please verify your email address before placing an order.", requiresEmailVerification: true };
  }
  ```
- Verification flow:
  - `sendVerificationEmailAction()` generates 32-byte hex token with 24-hour expiry in `VerificationToken`.
  - Sends email or logs link in dev mode.
  - Route `/verify-email?token=...` marks `user.emailVerified = now()`.
- Phone validation: Regex `^(\+639\d{9}|09\d{9})$` enforced on server.

### 6. Finance Subsystem (`/admin/finance`)
- **Permission**: `finance:view` granted exclusively to `Role.ADMIN`.
- **KPI Metrics**:
  - Total Real Revenue ($\sum \text{amount}$ for real `PAID` payments).
  - Toggle: "Include Demo Transactions" (recomputes metrics with `isSimulated = true`).
  - Total Gross Margin: $\sum (\text{item.unitPrice} - \text{variant.costPrice}) \times \text{quantity}$.
  - COD Pipeline: Collected Cash vs. Uncollected in Transit.
  - Pending Verification: Count and total value of unverified manual receipts.
- **Transactions Table**: Search, filter by method/status, CSV export, and demo badges.

---

## 5. Risk Assessment & Mitigation

| # | Risk | Potential Impact | Mitigation Strategy |
|---|:---|:---|:---|
| 1 | **Prisma Migration Drift on Production DB** | Migration failure or broken foreign keys | Use strict `prisma migrate dev` with SQL migration file. Backfill `Payment` rows in SQL before adding foreign key constraints. Test on clean DB. |
| 2 | **Customer Blocked by Email Verification** | Drop in conversion during testing | Existing seed users (`buyer@rarefinds.ph`, `customer@rarefinds.ph`, `admin@rarefinds.ph`) will be backfilled with `emailVerified = now()`. Provide an instant 1-click verification link in development. |
| 3 | **Private File Leakage** | Buyer address or payment slips exposed publicly | Create an explicit private Supabase bucket (`order-proofs` with `public: false`). Serve all images via ephemeral signed URLs (`createSignedUrl` with 3600s TTL). |
| 4 | **Stock Hoarding via Manual Transfer** | Buyer creates order with manual transfer, never pays, locking rare 1-of-1 pair | Strictly enforce `manualPaymentHoldMinutes` (default 60 mins). Scheduled expiry background check releases 1-of-1 inventory if proof is not submitted. |
| 5 | **Staff Accessing Financial Profits** | Leak of wholesale cost prices and store margins | Strictly decouple `finance:view` from `STAFF`. `verifyAdminSession("finance:view")` checks live DB role. Sidebar hides Finance from Staff. |

---

## 6. Implementation Stages & Verification Plan

1. **Stage 1**: Schema updates (`prisma/schema.prisma`), SQL migration with backfill, and seed data alignment.
2. **Stage 2**: Store settings enhancements (COD rules, delivery fees, manual payment instructions) and admin settings UI.
3. **Stage 3**: Timeline & QC separation in `OrderTrackingTimeline.tsx` and `OrderDetailView.tsx` (5 honest steps).
4. **Stage 4**: Checkout delivery method selector, PIN generation, and server-side COD enforcement in `placeOrderAction`.
5. **Stage 5**: Manual payment upload dropzone, private Supabase storage helper, and Admin verification drawer.
6. **Stage 6**: Email verification check before checkout & phone validation.
7. **Stage 7**: Finance Subsystem (`/admin/finance`) with revenue, profit, COD pipeline, and demo toggle.
8. **Stage 8**: Verification: `npx tsc --noEmit`, `npm run lint`, `npm run build`, and manual end-to-end tests across Customer, Staff, and Admin.

---

*Awaiting user approval before proceeding to implementation.*
