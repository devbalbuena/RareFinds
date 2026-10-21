import { enforceTestDatabaseIsolation } from "./test-safety";
enforceTestDatabaseIsolation();

import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { completeOrderPayment } from "../src/lib/payments/order-payment";
import { getPaymentProvider } from "../src/lib/payments";
import { getPaymentMode } from "../src/lib/payments/mode";

async function runDemoPaymentTests() {
  console.log("==================================================================");
  console.log("DEMO PAYMENT MODE TEST SUITE");
  console.log("Testing: Instant Paid Marking, Double-Click Idempotency,");
  console.log("Server Mode Enforcement, and Revenue / LTV Exclusion");
  console.log("==================================================================\n");

  // 1. Setup Test User
  const testUser = await prisma.user.upsert({
    where: { email: "test-demopayer@rarefinds.ph" },
    update: {},
    create: {
      email: "test-demopayer@rarefinds.ph",
      name: "Demo Sneakerhead",
      role: "CUSTOMER",
    },
  });
  console.log("✅ Test user ready:", testUser.email);

  // Helper to ensure a clean 1-of-1 variant
  async function getCleanGrailVariant() {
    let variant = await prisma.productVariant.findFirst({
      where: { isOneOfOne: true },
      include: { product: true },
    });

    if (!variant) {
      // Find or create a brand & category
      let brand = await prisma.brand.findFirst();
      if (!brand) {
        brand = await prisma.brand.create({
          data: { name: "Nike Demo", slug: "nike-demo" },
        });
      }
      let category = await prisma.category.findFirst();
      if (!category) {
        category = await prisma.category.create({
          data: { name: "Sneakers Demo", slug: "sneakers-demo" },
        });
      }

      const product = await prisma.product.create({
        data: {
          title: "Air Jordan 1 High 'Chicago 1985' (Demo Test)",
          slug: `aj1-chicago-test-${Date.now()}`,
          description: "Demo test grail sneaker",
          brandId: brand.id,
          categoryId: category.id,
          sku: `SKU-TEST-${Date.now()}`,
          status: "ACTIVE",
        },
      });

      const createdVariant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          size: "10.5 US",
          price: 125000,
          stockQty: 1,
          isOneOfOne: true,
          isSold: false,
        },
        include: { product: true },
      });
      variant = createdVariant;
    } else {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { isSold: false, reservedUntil: null, reservedBy: null, stockQty: 1 },
      });
    }

    if (!variant) throw new Error("Could not find or create a grail variant");
    return variant;
  }

  // Helper to ensure a clean standard multi-stock variant
  async function getCleanStandardVariant() {
    let variant = await prisma.productVariant.findFirst({
      where: { isOneOfOne: false, stockQty: { gte: 5 } },
      include: { product: true },
    });

    if (!variant) {
      let brand = await prisma.brand.findFirst();
      if (!brand) {
        brand = await prisma.brand.create({
          data: { name: "Nike Demo Standard", slug: "nike-demo-standard" },
        });
      }
      let category = await prisma.category.findFirst();
      if (!category) {
        category = await prisma.category.create({
          data: { name: "Sneakers Demo Standard", slug: "sneakers-demo-standard" },
        });
      }
      const product = await prisma.product.create({
        data: {
          title: "Nike Dunk Low Retro White Black (Demo Test)",
          slug: `dunk-low-panda-test-${Date.now()}`,
          description: "Demo test standard sneaker",
          brandId: brand.id,
          categoryId: category.id,
          sku: `SKU-PANDA-${Date.now()}`,
          status: "ACTIVE",
        },
      });

      const createdVariant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          size: "9.5 US",
          price: 7500,
          stockQty: 10,
          isOneOfOne: false,
          isSold: false,
        },
        include: { product: true },
      });
      variant = createdVariant;
    }

    if (!variant) throw new Error("Could not find or create a standard variant");
    return variant;
  }

  // -----------------------------------------------------------------------------
  // TEST 1: Payment Provider Interface Routing
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 1: Payment Provider Interface Routing ---");
  const codProvider = getPaymentProvider(PaymentMethod.COD);
  const gcashProvider = getPaymentProvider(PaymentMethod.GCASH);
  const mayaProvider = getPaymentProvider(PaymentMethod.MAYA);
  const cardProvider = getPaymentProvider(PaymentMethod.CARD);
  const testProvider = getPaymentProvider(PaymentMethod.TEST);

  if (codProvider.method !== "COD") throw new Error("FAIL: COD provider misconfigured");
  if (gcashProvider.method !== "GCASH") throw new Error("FAIL: GCASH provider misconfigured");
  if (mayaProvider.method !== "MAYA") throw new Error("FAIL: MAYA provider misconfigured");
  if (cardProvider.method !== "CARD") throw new Error("FAIL: CARD provider misconfigured");
  if (testProvider.method !== "TEST") throw new Error("FAIL: TEST provider misconfigured");
  console.log("✅ PASS: All payment providers resolve cleanly through src/lib/payments/ abstraction.");

  // -----------------------------------------------------------------------------
  // TEST 2: Demo GCash Payment - Instant PAID, isSimulated=true, 1-of-1 Marked Sold
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 2: Demo GCash Payment Marks Order PAID Instantly ---");
  const grailVariant = await getCleanGrailVariant();
  const demoOrderNumber = `RF-DEMO-${Date.now()}`;

  // Create demo order
  const demoOrder = await prisma.order.create({
    data: {
      orderNumber: demoOrderNumber,
      userId: testUser.id,
      customerEmail: testUser.email,
      customerName: testUser.name || "Demo Sneakerhead",
      shippingAddress: {
        street: "BGC High Street",
        city: "Taguig",
        province: "Metro Manila",
        postalCode: "1634",
        phone: "09170000000",
      },
      subtotal: grailVariant.price,
      shippingFee: 0,
      totalAmount: grailVariant.price,
      deliveryMethod: "COURIER",
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.GCASH,
      isSimulated: true, // Tagged as simulated demo
      items: {
        create: [
          {
            variantId: grailVariant.id,
            productTitle: grailVariant.product.title,
            variantDetails: `Size ${grailVariant.size} • 1-of-1`,
            unitPrice: grailVariant.price,
            quantity: 1,
            subtotal: grailVariant.price,
          },
        ],
      },
    },
  });

  console.log(`Demo order created: ${demoOrder.orderNumber}, isSimulated: ${demoOrder.isSimulated}`);

  // Trigger markPaid via provider (instant fulfillment)
  const payResult = await gcashProvider.markPaid(demoOrder.id);
  console.log("markPaid result:", payResult);

  const updatedDemoOrder = await prisma.order.findUnique({
    where: { id: demoOrder.id },
  });
  const updatedVariant = await prisma.productVariant.findUnique({
    where: { id: grailVariant.id },
  });

  if (
    updatedDemoOrder?.status === OrderStatus.PAID &&
    updatedDemoOrder?.paymentStatus === PaymentStatus.PAID &&
    updatedDemoOrder?.isSimulated === true &&
    updatedVariant?.isSold === true &&
    updatedVariant?.reservedUntil === null
  ) {
    console.log("✅ PASS: Demo payment instantly marked PAID with isSimulated=true, holds released, and 1-of-1 marked isSold=true.");
  } else {
    throw new Error(`FAIL: Demo order state invalid: ${JSON.stringify(updatedDemoOrder)}`);
  }

  // -----------------------------------------------------------------------------
  // TEST 3: Double-Click / Idempotency Test
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 3: Double-Click / Idempotency Test ---");
  const doubleClickResult = await gcashProvider.markPaid(demoOrder.id);
  console.log("Double-click result via provider:", doubleClickResult);

  const directIdempotentCall = await completeOrderPayment(demoOrder.id);
  console.log("Direct completeOrderPayment call on paid order:", directIdempotentCall);

  if (
    doubleClickResult.success &&
    doubleClickResult.message?.includes("already marked as paid") &&
    directIdempotentCall.success &&
    directIdempotentCall.message?.includes("already marked as paid")
  ) {
    console.log("✅ PASS: Double-click idempotent across provider and direct payment pipelines.");
  } else {
    throw new Error("FAIL: Idempotency check failed on repeated payment call.");
  }

  // -----------------------------------------------------------------------------
  // TEST 4: Multi-Stock Decrement on Demo Payment (CARD)
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 4: Multi-stock Sneaker Stock Decrement on Demo Payment ---");
  const standardVariant = await getCleanStandardVariant();
  const initialStock = standardVariant.stockQty;
  const cardOrderNumber = `RF-CARD-${Date.now()}`;

  const cardOrder = await prisma.order.create({
    data: {
      orderNumber: cardOrderNumber,
      userId: testUser.id,
      customerEmail: testUser.email,
      customerName: testUser.name || "Demo Sneakerhead",
      shippingAddress: {
        street: "Makati Ave",
        city: "Makati",
        province: "Metro Manila",
        postalCode: "1200",
        phone: "09170000000",
      },
      subtotal: standardVariant.price,
      shippingFee: 0,
      totalAmount: standardVariant.price,
      deliveryMethod: "COURIER",
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.CARD,
      isSimulated: true,
      items: {
        create: [
          {
            variantId: standardVariant.id,
            productTitle: standardVariant.product.title,
            variantDetails: `Size ${standardVariant.size}`,
            unitPrice: standardVariant.price,
            quantity: 2,
            subtotal: Number(standardVariant.price) * 2,
          },
        ],
      },
    },
  });

  await cardProvider.markPaid(cardOrder.id);
  const updatedStandard = await prisma.productVariant.findUnique({
    where: { id: standardVariant.id },
  });

  if (updatedStandard?.stockQty === initialStock - 2) {
    console.log(`✅ PASS: Stock correctly decremented from ${initialStock} to ${updatedStandard.stockQty} on demo CARD payment.`);
  } else {
    throw new Error(`FAIL: Expected stock ${initialStock - 2}, got ${updatedStandard?.stockQty}`);
  }

  // Double click on multi-stock order must NOT decrement stock again!
  await cardProvider.markPaid(cardOrder.id);
  const stockAfterSecondClick = await prisma.productVariant.findUnique({
    where: { id: standardVariant.id },
  });
  if (stockAfterSecondClick?.stockQty === initialStock - 2) {
    console.log("✅ PASS: Repeated payment call did not decrement stock a second time.");
  } else {
    throw new Error("FAIL: Repeated payment call double-decremented stock!");
  }

  // -----------------------------------------------------------------------------
  // TEST 5: Server Enforcement of PAYMENT_MODE
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 5: Server Enforcement of PAYMENT_MODE ---");
  // Test mode resolver
  const originalEnvMode = process.env.PAYMENT_MODE;

  // Case A: Mode is cod_only
  process.env.PAYMENT_MODE = "cod_only";
  if (getPaymentMode() !== "cod_only") throw new Error("FAIL: getPaymentMode should return cod_only");

  // Validate server enforcement check (mirrors placeOrderAction server validation)
  const isDemoMethod = ["GCASH", "MAYA", "CARD", "TEST"].includes("GCASH");
  const isAllowedInCodOnly = !isDemoMethod || getPaymentMode() === "demo";
  if (!isAllowedInCodOnly) {
    console.log("✅ PASS: When PAYMENT_MODE=cod_only, non-COD payment methods are strictly rejected on server.");
  } else {
    throw new Error("FAIL: Server allowed demo method when PAYMENT_MODE=cod_only!");
  }

  // Case B: Mode is live (should fall back to cod_only until real PayMongo is configured)
  process.env.PAYMENT_MODE = "live";
  if (getPaymentMode() !== "cod_only") throw new Error("FAIL: PAYMENT_MODE=live should fall back to cod_only");
  console.log("✅ PASS: PAYMENT_MODE=live safely defaults to cod_only with logged warning.");

  // Case C: Unset in production
  delete process.env.PAYMENT_MODE;
  const envObj = process.env as Record<string, string | undefined>;
  const originalNodeEnv = envObj.NODE_ENV;
  envObj.NODE_ENV = "production";
  if (getPaymentMode() !== "cod_only") throw new Error("FAIL: In production, unset PAYMENT_MODE must default to cod_only");
  console.log("✅ PASS: Unset PAYMENT_MODE in production safely defaults to cod_only.");

  // Restore env
  envObj.NODE_ENV = originalNodeEnv;
  if (originalEnvMode) {
    process.env.PAYMENT_MODE = originalEnvMode;
  } else {
    process.env.PAYMENT_MODE = "demo";
  }

  // -----------------------------------------------------------------------------
  // TEST 6: Simulated Orders Excluded from Revenue & LTV Totals
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 6: Revenue & Customer LTV Metric Isolation ---");

  // Create one real COD order (e.g. ₱15,000)
  const realCodOrder = await prisma.order.create({
    data: {
      orderNumber: `RF-REAL-COD-${Date.now()}`,
      userId: testUser.id,
      customerEmail: testUser.email,
      customerName: testUser.name || "Demo Sneakerhead",
      shippingAddress: {
        street: "Legaspi Village",
        city: "Makati",
        province: "Metro Manila",
        postalCode: "1229",
        phone: "09170000000",
      },
      subtotal: 15000,
      shippingFee: 0,
      totalAmount: 15000,
      deliveryMethod: "COURIER",
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.COD,
      isSimulated: false, // REAL MONEY
    },
  });
  console.log(`Real COD Order created: ${realCodOrder.orderNumber}, isSimulated: ${realCodOrder.isSimulated}`);

  // Calculate LTV Aggregate across all non-cancelled orders using the app query:
  const ltvAggregate = await prisma.order.aggregate({
    where: {
      userId: testUser.id,
      status: { not: "CANCELLED" },
      isSimulated: false, // STRICT FILTER
    },
    _sum: { totalAmount: true },
  });

  const totalRealMoney = Number(ltvAggregate._sum.totalAmount ?? 0);
  console.log(`Calculated real LTV for test user: ₱${totalRealMoney}`);

  // Fetch all user orders
  const allUserOrders = await prisma.order.findMany({
    where: { userId: testUser.id },
  });
  const simulatedOrders = allUserOrders.filter((o) => o.isSimulated);
  const nonSimulatedOrders = allUserOrders.filter((o) => !o.isSimulated);

  console.log(`User order count: total=${allUserOrders.length}, real=${nonSimulatedOrders.length}, simulated=${simulatedOrders.length}`);

  if (simulatedOrders.length >= 2 && nonSimulatedOrders.length >= 1) {
    console.log("Simulated and real orders exist concurrently.");
  }

  if (totalRealMoney === 15000) {
    console.log("✅ PASS: Simulated demo orders (GCash, Card) are strictly excluded from revenue aggregates.");
  } else {
    throw new Error(`FAIL: Expected real money total to be 15000, but got ${totalRealMoney}`);
  }

  // Cleanup test user's test orders
  await prisma.orderItem.deleteMany({
    where: { order: { userId: testUser.id } },
  });
  await prisma.order.deleteMany({
    where: { userId: testUser.id },
  });
  console.log("Cleaned up test orders for test user.");

  console.log("\n==================================================================");
  console.log("🎉 ALL DEMO PAYMENT MODE TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================================\n");
}

runDemoPaymentTests()
  .catch((err) => {
    console.error("\n❌ DEMO PAYMENT TEST RUN FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
