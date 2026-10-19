-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('RESTOCK', 'DAMAGED', 'LOST', 'AUDIT_CORRECTION', 'INITIAL_STOCK');

-- AlterTable: Add status with default ACTIVE
ALTER TABLE "products" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';

-- Migrate data: true -> ACTIVE, false -> ARCHIVED
UPDATE "products" SET "status" = 'ACTIVE' WHERE "isActive" = true;
UPDATE "products" SET "status" = 'ARCHIVED' WHERE "isActive" = false;

-- Drop isActive column
ALTER TABLE "products" DROP COLUMN "isActive";

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateTable stock_adjustments
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "userId" TEXT,
    "delta" INTEGER NOT NULL,
    "reason" "StockAdjustmentReason" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_adjustments_variantId_idx" ON "stock_adjustments"("variantId");
CREATE INDEX "stock_adjustments_userId_idx" ON "stock_adjustments"("userId");
CREATE INDEX "stock_adjustments_createdAt_idx" ON "stock_adjustments"("createdAt");

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop and recreate OrderItem foreign key with ON DELETE RESTRICT
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_variantId_fkey";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop and recreate CartItem foreign key with ON DELETE RESTRICT
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_variantId_fkey";
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
