-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'GCASH';
ALTER TYPE "PaymentMethod" ADD VALUE 'MAYA';
ALTER TYPE "PaymentMethod" ADD VALUE 'CARD';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "isSimulated" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "orders_isSimulated_idx" ON "orders"("isSimulated");
