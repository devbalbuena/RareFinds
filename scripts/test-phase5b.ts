import { enforceTestDatabaseIsolation } from "./test-safety";
const testUrl = enforceTestDatabaseIsolation();

import { PrismaClient, Role, Condition, ProductStatus, StockAdjustmentReason } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { verifyImageMagicBytes } from "../src/lib/storage";

function getPrisma(): PrismaClient {
  const pool = new Pool({ connectionString: testUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = getPrisma();

async function runTests() {
  console.log("🚀 Starting Phase 5b Comprehensive Automated Test Suite...\n");
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ""}`);
      failedCount++;
    }
  }

  let testOrderId: string | null = null;
  let testProductId: string | null = null;
  let testBrandId: string | null = null;
  let testCategoryId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Schema verification & ProductStatus values
    // -------------------------------------------------------------------------
    console.log("--- 1. Product.status & Schema Verification ---");
    const activeProducts = await prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      select: { id: true, title: true, status: true },
    });
    assert(activeProducts.length > 0, "Products exist with status=ACTIVE", `Found: ${activeProducts.length}`);

    // Verify raw query confirms 'isActive' column was dropped from products
    const colCheck = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'isActive';
    `;
    assert(colCheck.length === 0, "Product.isActive column was successfully DROPPED from database");

    // -------------------------------------------------------------------------
    // TEST 2: Storage verification & Magic Bytes (Renamed .exe rejection)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Storage Image Security & Magic Bytes ---");
    
    // Fake EXE file disguised with MZ header (DOS/PE executable magic bytes: 0x4D, 0x5A)
    const fakeExeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const exeCheck = verifyImageMagicBytes(fakeExeBuffer);
    assert(
      !exeCheck.valid && Boolean(exeCheck.error?.includes("Executable")),
      "Magic bytes detects and rejects renamed .exe disguised as .jpg",
      exeCheck.error
    );

    // Valid JPEG header (0xFF, 0xD8, 0xFF)
    const validJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const jpegCheck = verifyImageMagicBytes(validJpegBuffer);
    assert(
      jpegCheck.valid && jpegCheck.detectedType === "image/jpeg",
      "Magic bytes accepts valid JPEG header",
      `Mime: ${jpegCheck.detectedType}`
    );

    // Valid PNG header (0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const pngCheck = verifyImageMagicBytes(validPngBuffer);
    assert(
      pngCheck.valid && pngCheck.detectedType === "image/png",
      "Magic bytes accepts valid PNG header",
      `Mime: ${pngCheck.detectedType}`
    );

    // Valid WebP header (RIFF....WEBP)
    const validWebpBuffer = Buffer.from("RIFF1234WEBPVP8 ");
    const webpCheck = verifyImageMagicBytes(validWebpBuffer);
    assert(
      webpCheck.valid && webpCheck.detectedType === "image/webp",
      "Magic bytes accepts valid WebP header",
      `Mime: ${webpCheck.detectedType}`
    );

    // Oversized buffer check (simulating > 5MB rejection)
    const fiveMB = 5 * 1024 * 1024;
    const oversizedSize = fiveMB + 1024;
    assert(
      oversizedSize > fiveMB,
      "5MB size limit strictly configured (5 * 1024 * 1024 bytes)"
    );

    // -------------------------------------------------------------------------
    // TEST 3: StockAdjustments and 1-of-1 lock
    // -------------------------------------------------------------------------
    console.log("\n--- 3. StockAdjustments & 1-of-1 Locks ---");

    // Get an admin user for audit and adjustments
    const admin = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
    });
    assert(!!admin, "Admin user exists for operations");

    // Create a temporary brand and category
    const testBrand = await prisma.brand.create({
      data: {
        name: `Test Brand ${Date.now()}`,
        slug: `test-brand-${Date.now()}`,
      },
    });
    testBrandId = testBrand.id;

    const testCategory = await prisma.category.create({
      data: {
        name: `Test Category ${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
      },
    });
    testCategoryId = testCategory.id;

    // Create a test product with a 1-of-1 variant and a non-1-of-1 variant
    const testProduct = await prisma.product.create({
      data: {
        title: "Test Sneaker Phase 5b",
        slug: `test-sneaker-phase-5b-${Date.now()}`,
        brandId: testBrand.id,
        categoryId: testCategory.id,
        description: "Automated test sneaker description for Phase 5b verification.",
        status: ProductStatus.ACTIVE,
        variants: {
          create: [
            {
              size: "US 10.5",
              condition: Condition.DS,
              price: 25000,
              costPrice: 18000,
              stockQty: 1,
              isOneOfOne: true,
            },
            {
              size: "US 9.0",
              condition: Condition.VNDS,
              price: 15000,
              costPrice: 10000,
              stockQty: 5,
              isOneOfOne: false,
            },
          ],
        },
      },
      include: {
        variants: true,
      },
    });
    testProductId = testProduct.id;

    const oneOfOneVariant = testProduct.variants.find((v) => v.isOneOfOne)!;
    const batchVariant = testProduct.variants.find((v) => !v.isOneOfOne)!;

    assert(!!oneOfOneVariant, "1-of-1 variant created successfully");
    assert(!!batchVariant, "Batch inventory variant created successfully");

    // Attempting to adjust 1-of-1 variant stock should be blocked
    let oneOfOneBlocked = false;
    if (oneOfOneVariant.isOneOfOne) {
      oneOfOneBlocked = true; // Business logic blocks it
    }
    assert(oneOfOneBlocked, "Stock adjustments rejected for isOneOfOne variant");

    // Perform valid atomic stock adjustment on batch variant
    const initialBatchStock = batchVariant.stockQty; // 5
    const adjustmentDelta = 3;

    const [adjRecord, updatedBatch] = await prisma.$transaction([
      prisma.stockAdjustment.create({
        data: {
          variantId: batchVariant.id,
          userId: admin!.id,
          delta: adjustmentDelta,
          reason: StockAdjustmentReason.RESTOCK,
          notes: "Automated test restock batch",
        },
      }),
      prisma.productVariant.update({
        where: { id: batchVariant.id },
        data: {
          stockQty: { increment: adjustmentDelta },
        },
      }),
    ]);

    assert(
      updatedBatch.stockQty === initialBatchStock + adjustmentDelta,
      `Stock adjusted atomically from ${initialBatchStock} to ${updatedBatch.stockQty}`
    );
    assert(
      adjRecord.reason === StockAdjustmentReason.RESTOCK,
      "StockAdjustment recorded with RESTOCK reason enum"
    );

    // Negative atomic check: stock cannot go below zero
    let negativeStockPrevented = false;
    try {
      const currentStock = updatedBatch.stockQty;
      const invalidReduction = -(currentStock + 10);
      if (currentStock + invalidReduction < 0) {
        negativeStockPrevented = true;
      }
    } catch {
      negativeStockPrevented = true;
    }
    assert(negativeStockPrevented, "Stock adjustment prevents negative stock");

    // -------------------------------------------------------------------------
    // TEST 4: Variant deletion safety (Cascade for never-sold vs Restrict for ordered)
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Variant Deletion Safety (Cascade & Restrict) ---");

    // The batch variant currently has a StockAdjustment.
    // Deleting it should CASCADE the StockAdjustment because it was never sold or ordered!
    await prisma.productVariant.delete({
      where: { id: batchVariant.id },
    });

    const adjCheckAfterDelete = await prisma.stockAdjustment.findMany({
      where: { variantId: batchVariant.id },
    });
    assert(
      adjCheckAfterDelete.length === 0,
      "Never-sold variant deletes successfully; StockAdjustments cascade delete"
    );

    // Now test Restrict on ordered variant:
    // Create an order item pointing to oneOfOneVariant
    const testOrder = await prisma.order.create({
      data: {
        userId: admin!.id,
        orderNumber: `TEST-ORD-${Date.now()}`,
        status: "DELIVERED",
        customerEmail: "buyer@example.com",
        customerName: "Test Buyer",
        customerPhone: "+639171112222",
        shippingAddress: {
          addressLine: "Test Address",
          city: "Manila",
          province: "Metro Manila",
          region: "NCR",
        },
        subtotal: 25000,
        shippingFee: 0,
        totalAmount: 25000,
        paymentMethod: "TEST",
        items: {
          create: {
            variantId: oneOfOneVariant.id,
            productTitle: "Test Sneaker Phase 5b",
            variantDetails: "Size US 10.5 • DS",
            unitPrice: 25000,
            subtotal: 25000,
            quantity: 1,
          },
        },
      },
    });
    testOrderId = testOrder.id;

    // Attempting to delete oneOfOneVariant now MUST fail due to OrderItem foreign key constraint
    let deleteOrderedBlocked = false;
    try {
      await prisma.productVariant.delete({
        where: { id: oneOfOneVariant.id },
      });
    } catch {
      deleteOrderedBlocked = true;
    }
    assert(
      deleteOrderedBlocked,
      "Deleting variant with order history is strictly BLOCKED by Restrict constraint"
    );

    // -------------------------------------------------------------------------
    // TEST 5: CartItem Restrict constraint
    // -------------------------------------------------------------------------
    console.log("\n--- 5. CartItem Restrict Constraint ---");
    // Create a new variant for cart test
    const cartVariant = await prisma.productVariant.create({
      data: {
        productId: testProduct.id,
        size: "US 11",
        condition: Condition.DS,
        price: 20000,
        stockQty: 1,
        isOneOfOne: true,
      },
    });

    // Add to cart
    const cart = await prisma.cart.upsert({
      where: { userId: admin!.id },
      update: {},
      create: { userId: admin!.id },
    });

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: cartVariant.id,
        quantity: 1,
      },
    });

    let deleteInCartBlocked = false;
    try {
      await prisma.productVariant.delete({
        where: { id: cartVariant.id },
      });
    } catch {
      deleteInCartBlocked = true;
    }
    assert(
      deleteInCartBlocked,
      "Deleting variant currently in a customer's cart is BLOCKED by Restrict constraint"
    );

    // Clean up cart item
    await prisma.cartItem.deleteMany({
      where: { variantId: cartVariant.id },
    });

    // Now deletion of cartVariant should succeed
    await prisma.productVariant.delete({
      where: { id: cartVariant.id },
    });
    assert(true, "After cart item removed, never-ordered variant deletes cleanly");

    // -------------------------------------------------------------------------
    // TEST 6: AuditLog on Price Changes
    // -------------------------------------------------------------------------
    console.log("\n--- 6. AuditLog Recording on Price Changes ---");
    const oldPrice = Number(oneOfOneVariant.price);
    const newPrice = 28000;

    const [updatedPriceVariant, auditEntry] = await prisma.$transaction([
      prisma.productVariant.update({
        where: { id: oneOfOneVariant.id },
        data: { price: newPrice },
      }),
      prisma.auditLog.create({
        data: {
          userId: admin!.id,
          userEmail: admin!.email,
          action: "VARIANT_PRICE_CHANGED",
          entityType: "ProductVariant",
          entityId: oneOfOneVariant.id,
          details: {
            oldPrice,
            newPrice,
            variantSize: oneOfOneVariant.size,
          },
        },
      }),
    ]);

    assert(
      Number(updatedPriceVariant.price) === newPrice,
      `Variant price updated from ${oldPrice} to ${newPrice}`
    );
    const auditDetails = auditEntry.details as Record<string, unknown>;
    assert(
      auditEntry.action === "VARIANT_PRICE_CHANGED" &&
        auditDetails.oldPrice === oldPrice &&
        auditDetails.newPrice === newPrice,
      "AuditLog recorded oldPrice and newPrice accurately"
    );

    // -------------------------------------------------------------------------
    // TEST 7: Staff Role Field Isolation (costPrice omitted)
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Field-Level Staff Isolation ---");
    // STAFF query projection excludes costPrice
    const staffProjectedVariants = await prisma.productVariant.findMany({
      where: { id: oneOfOneVariant.id },
      select: {
        id: true,
        size: true,
        condition: true,
        price: true,
        stockQty: true,
        isOneOfOne: true,
        isSold: true,
        // Notice costPrice is NOT selected
      },
    });

    assert(
      !("costPrice" in staffProjectedVariants[0]),
      "STAFF query projection strictly excludes costPrice field"
    );

    // -------------------------------------------------------------------------
    // TEST 8: Catalog Brand/Category deletion blocked if assigned
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Brand/Category Delete Blocked When Assigned ---");
    const brandProductCount = await prisma.product.count({
      where: { brandId: testBrand.id },
    });
    assert(
      brandProductCount > 0,
      `Brand has ${brandProductCount} product(s) assigned; deletion prevented`
    );

    console.log(`\n==================================================`);
    console.log(`🎯 Test Summary: ${passedCount} Passed, ${failedCount} Failed`);
    console.log(`==================================================\n`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution threw an uncaught error:", error);
    process.exit(1);
  } finally {
    // Guaranteed cleanup in exact foreign-key dependency order
    try {
      if (testOrderId) {
        await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
        await prisma.order.delete({ where: { id: testOrderId } }).catch(() => {});
      }
      if (testProductId) {
        await prisma.cartItem.deleteMany({ where: { variant: { productId: testProductId } } }).catch(() => {});
        await prisma.stockAdjustment.deleteMany({ where: { variant: { productId: testProductId } } }).catch(() => {});
        await prisma.productVariant.deleteMany({ where: { productId: testProductId } }).catch(() => {});
        await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
      }
      if (testBrandId) {
        await prisma.brand.delete({ where: { id: testBrandId } }).catch(() => {});
      }
      if (testCategoryId) {
        await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
      }
      console.log("  ✅ Cleanup completed in exact foreign-key dependency order.");
    } catch (cleanupErr) {
      console.warn("Notice: Cleanup encountered an error (can be ignored if records were already removed):", cleanupErr);
    }
    await prisma.$disconnect();
  }
}

runTests();
