-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PICKUP', 'LOCAL_DELIVERY', 'COURIER');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'MANUAL_TRANSFER';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "unitCost" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "autoCompleteAt" TIMESTAMP(3),
ADD COLUMN     "customerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'COURIER',
ADD COLUMN     "deliveryPin" TEXT,
ADD COLUMN     "deliveryPinAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentProofKey" TEXT,
ADD COLUMN     "paymentProofRejections" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentProofUploadedAt" TIMESTAMP(3),
ADD COLUMN     "paymentReviewFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "problemReason" TEXT,
ADD COLUMN     "problemReportedAt" TIMESTAMP(3),
ADD COLUMN     "proofOfDeliveryKey" TEXT,
ADD COLUMN     "qcVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "qcVerifiedById" TEXT;

-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "autoCompleteDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "codAllowedAreas" TEXT,
ADD COLUMN     "codEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "codMaxAmount" DECIMAL(10,2) NOT NULL DEFAULT 20000.00,
ADD COLUMN     "localDeliveryAreas" TEXT,
ADD COLUMN     "manualPaymentHoldMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "manualPaymentInstructions" TEXT,
ADD COLUMN     "manualPaymentQrKey" TEXT,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupInstructions" TEXT,
ADD COLUMN     "shippingFeeCourier" DECIMAL(10,2) NOT NULL DEFAULT 250.00,
ADD COLUMN     "shippingFeeLocal" DECIMAL(10,2) NOT NULL DEFAULT 150.00;

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "reference" TEXT,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "proofKey" TEXT,
    "rejectionReason" TEXT,
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_isSimulated_idx" ON "payments"("isSimulated");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_method_key" ON "payments"("orderId", "method");

-- CreateIndex
CREATE INDEX "orders_deliveryMethod_idx" ON "orders"("deliveryMethod");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_qcVerifiedById_fkey" FOREIGN KEY ("qcVerifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill OrderItem.unitCost from ProductVariant.costPrice
UPDATE "order_items" oi
SET "unitCost" = pv."costPrice"
FROM "product_variants" pv
WHERE oi."variantId" = pv."id" AND oi."unitCost" IS NULL;

-- Backfill Payments for existing orders
INSERT INTO "payments" ("id", "orderId", "method", "amount", "status", "reference", "isSimulated", "paidAt", "createdAt", "updatedAt")
SELECT 
    'pay_' || substr(md5(random()::text || o."id"), 1, 20),
    o."id",
    o."paymentMethod",
    o."totalAmount",
    CASE 
        WHEN o."paymentStatus" = 'PAID' OR o."status" IN ('PAID', 'SHIPPED', 'DELIVERED') THEN 'PAID'::"PaymentStatus"
        ELSE 'UNPAID'::"PaymentStatus"
    END,
    o."paymentReference",
    o."isSimulated",
    COALESCE(o."paidAt", CASE WHEN o."paymentStatus" = 'PAID' THEN o."createdAt" ELSE NULL END),
    o."createdAt",
    o."updatedAt"
FROM "orders" o
ON CONFLICT ("orderId", "method") DO NOTHING;

-- Remove default from deliveryMethod after backfill
ALTER TABLE "orders" ALTER COLUMN "deliveryMethod" DROP DEFAULT;
