# PayMongo Integration Plan (Phase 4b Reference)

This document contains the complete architectural specification and design for Phase 4b (PayMongo Integration), archived for future implementation when live payment gateways are enabled.

---

## 1. Overview & Architecture Choice
- **Gateway**: PayMongo Philippines (`https://api.paymongo.com/v1`)
- **Integration Approach**: **PayMongo Checkout Sessions** (`/v1/checkout_sessions`)
  - **Reasoning**:
    - Supports GCash, Maya (PayMaya), and Credit/Debit Cards (Visa/Mastercard) in a single PCI-compliant hosted checkout.
    - Matches our 15-minute vault reservation timer with PayMongo's session expiration.
    - Handles 3DS verification and e-wallet mobile deep-links/QR codes without custom frontend redirect gymnastics.
    - Clean webhook events: `checkout_session.payment.paid`, `payment.paid`, `payment.failed`.

---

## 2. Environment Keys
```env
PAYMONGO_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY="pk_test_..."
PAYMONGO_WEBHOOK_SECRET="whsec_..."
```

---

## 3. Schema Requirements
1. **`PaymentMethod` enum**:
   ```prisma
   enum PaymentMethod {
     COD
     TEST
     GCASH
     MAYA
     CARD
   }
   ```
2. **`Order` fields**:
   - `checkoutUrl String?` — PayMongo hosted checkout URL
   - `manualResolutionNeeded Boolean @default(false)`
   - `manualResolutionReason String? @db.Text`
   - `refundNeeded Boolean @default(false)`
   - `refundReason String? @db.Text`
3. **`PaymentWebhookEvent` model**:
   ```prisma
   model PaymentWebhookEvent {
     id          String   @id @default(cuid())
     eventId     String   @unique
     eventType   String
     orderId     String?
     status      String   // PROCESSED, IGNORED, FAILED, MANUAL_RESOLUTION
     payload     Json?
     error       String?
     processedAt DateTime @default(now())
     createdAt   DateTime @default(now())

     @@index([orderId])
     @@index([eventType])
     @@map("payment_webhook_events")
   }
   ```

---

## 4. Server-Side PayMongo Client (`src/lib/payments/paymongo.ts`)
- Server-only execution (`import "server-only"`).
- `createPayMongoCheckoutSession(order, paymentMethodType)`:
  - Formats line items with amounts in centavos (`Math.round(price * 100)`).
  - Configures `payment_method_types: ["gcash"]`, `["paymaya"]`, or `["card"]`.
  - Sets `success_url` and `cancel_url` pointing back to order confirmation.
  - Embeds metadata `{ orderId, orderNumber, userId }`.
- `verifyPayMongoSignature(rawBody, signatureHeader)`:
  - Extracts timestamp `t`, test signature `te`, and live signature `li`.
  - Calculates HMAC SHA256 of `${t}.${rawBody}` using `PAYMONGO_WEBHOOK_SECRET`.
  - Compares with constant-time equality `crypto.timingSafeEqual`.

---

## 5. Webhook Route (`/api/webhooks/paymongo/route.ts`)
- Reads RAW body as string using `req.text()`.
- Validates signature before JSON parsing.
- Checks idempotency table `PaymentWebhookEvent`. If `eventId` exists, returns `200 OK` immediately.
- On `checkout_session.payment.paid`:
  - Enters serializable transaction.
  - Verifies item availability.
  - If still available: marks `status: PAID`, `paymentStatus: PAID`, clears hold, decrements inventory / marks 1-of-1 `isSold: true`.
  - If late-payment conflict (hold expired and item was bought by someone else):
    - Sets `paymentStatus: PAID`, `paidAt: new Date()`.
    - Flags `manualResolutionNeeded: true`, `refundNeeded: true`.
    - Logs alert in `AuditLog` so store staff can issue a manual refund in PayMongo.
- On `payment.failed`:
  - Marks `paymentStatus: FAILED`.

---

## 6. Storefront & Admin Experience
- **Customer Return**:
  - `/order-success/[orderId]` polls `checkOrderPaymentStatus(orderId)`.
  - Shows "Confirming payment with PayMongo..." until webhook arrives.
- **Admin Order Detail**:
  - Displays PayMongo payment reference ID (`pay_xxx` / `cs_xxx`).
  - Displays high-priority Amber banner if `manualResolutionNeeded === true`.
  - Displays "Refund Needed" badge with "Mark as Refunded" button for staff after processing refunds in the PayMongo dashboard.
