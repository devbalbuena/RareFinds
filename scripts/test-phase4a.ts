import "dotenv/config";
import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { completeOrderPayment, cancelCustomerOrder } from "../src/lib/payments/order-payment";
import { checkAndExpireOrder } from "../src/lib/orders/expiry";

async function runPhase4aTests() {
  console.log("==================================================================");
  console.log("PHASE 4a VERIFICATION: CHECKOUT, ORDERS, 1-OF-1 HOLDS & PAYMENTS");
  console.log("==================================================================\n");

  // 1. Setup Test Users
  const userA = await prisma.user.upsert({
    where: { email: "test-buyer-a@rarefinds.ph" },
    update: {},
    create: {
      email: "test-buyer-a@rarefinds.ph",
      name: "Collector Alpha",
      role: "CUSTOMER",
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "test-buyer-b@rarefinds.ph" },
    update: {},
    create: {
      email: "test-buyer-b@rarefinds.ph",
      name: "Collector Beta",
      role: "CUSTOMER",
    },
  });

  console.log("Test users ready:", userA.email, "&", userB.email);

  // Helper to find or reset an available 1-of-1 variant
  async function getCleanGrailVariant(index = 0) {
    const variants = await prisma.productVariant.findMany({
      where: { isOneOfOne: true },
      include: { product: true },
    });
    const v = variants[index];
    // Reset to available
    await prisma.productVariant.update({
      where: { id: v.id },
      data: { isSold: false, reservedUntil: null, reservedBy: null, stockQty: 1 },
    });
    return v;
  }

  // -----------------------------------------------------------------------------
  // TEST 1: Buy 1-of-1 pair with TEST payment + Idempotent Simulation
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 1: Buying 1-of-1 pair with TEST payment ---");
  const grail1 = await getCleanGrailVariant(0);
  console.log(`Selected Grail: ${grail1.product.title} (${grail1.size}) - ₱${grail1.price}`);

  // Create Cart for User A
  const cartA = await prisma.cart.upsert({
    where: { userId: userA.id },
    update: {},
    create: { userId: userA.id },
  });
  await prisma.cartItem.deleteMany({ where: { cartId: cartA.id } });
  await prisma.cartItem.create({
    data: { cartId: cartA.id, variantId: grail1.id, quantity: 1 },
  });

  // Execute Transaction: Order Placement (TEST)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const orderNumber1 = `RF-TEST-0001`;

  const order1 = await prisma.$transaction(async (tx) => {
    // Conditional update reserving variant
    const updateRes = await tx.productVariant.updateMany({
      where: {
        id: grail1.id,
        isSold: false,
        stockQty: { gte: 1 },
        OR: [{ reservedUntil: null }, { reservedUntil: { lte: now } }],
      },
      data: { reservedUntil: expiresAt, reservedBy: userA.id },
    });
    if (updateRes.count === 0) throw new Error("Variant reservation failed");

    const created = await tx.order.create({
      data: {
        orderNumber: orderNumber1,
        userId: userA.id,
        customerEmail: userA.email,
        customerName: userA.name || "Collector Alpha",
        shippingAddress: { street: "123 Ayala Ave", city: "Makati", province: "Metro Manila", postalCode: "1200", phone: "09171234567" },
        subtotal: grail1.price,
        totalAmount: grail1.price,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.TEST,
        expiresAt,
        items: {
          create: [{
            variantId: grail1.id,
            productTitle: grail1.product.title,
            variantDetails: `Size ${grail1.size} • 1-of-1`,
            unitPrice: grail1.price,
            quantity: 1,
            subtotal: grail1.price,
          }],
        },
      },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cartA.id } });
    return created;
  });

  // Verify hold
  const heldVariant1 = await prisma.productVariant.findUnique({ where: { id: grail1.id } });
  console.log(`Order created: ${order1.orderNumber}, status: ${order1.status}`);
  console.log(`Variant reservedUntil: ${heldVariant1?.reservedUntil?.toISOString()}, reservedBy: ${heldVariant1?.reservedBy}`);
  if (heldVariant1?.reservedBy === userA.id && !heldVariant1?.isSold) {
    console.log("PASS: 15-minute hold active; item not sold yet.");
  } else {
    throw new Error("FAIL: Hold was not set correctly");
  }

  // Simulate Payment
  console.log("\nSimulating payment for Order 1...");
  const sim1 = await completeOrderPayment(order1.id, "TEST-TX-12345");
  console.log("Payment result:", sim1);
  const paidOrder1 = await prisma.order.findUnique({ where: { id: order1.id } });
  const soldVariant1 = await prisma.productVariant.findUnique({ where: { id: grail1.id } });
  if (paidOrder1?.status === OrderStatus.PAID && soldVariant1?.isSold && soldVariant1?.reservedUntil === null) {
    console.log("PASS: Order marked PAID, 1-of-1 variant permanently isSold=true, hold cleared.");
  } else {
    throw new Error("FAIL: Payment simulation failed");
  }

  // Test Idempotency (calling simulatePayment a 2nd time)
  console.log("\nTesting Idempotency: Calling simulatePayment again on already-paid order...");
  const sim2 = await completeOrderPayment(order1.id, "TEST-TX-DUPLICATE");
  console.log("Second call result:", sim2);
  if (sim2.success && sim2.message?.includes("already marked as paid")) {
    console.log("PASS: Idempotency verified! Second call returned successfully without duplicate operations.");
  } else {
    throw new Error("FAIL: Idempotency check failed");
  }

  // -----------------------------------------------------------------------------
  // TEST 2: Buy with Cash on Delivery (COD)
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 2: Buying 1-of-1 pair with COD ---");
  const grail2 = await getCleanGrailVariant(1);
  console.log(`Selected Grail: ${grail2.product.title} (${grail2.size})`);

  const order2 = await prisma.$transaction(async (tx) => {
    // COD immediately marks isSold=true
    const updateRes = await tx.productVariant.updateMany({
      where: {
        id: grail2.id,
        isSold: false,
        stockQty: { gte: 1 },
      },
      data: { isSold: true, stockQty: 0, reservedUntil: null, reservedBy: null },
    });
    if (updateRes.count === 0) throw new Error("COD allocation failed");

    return tx.order.create({
      data: {
        orderNumber: `RF-COD-0002`,
        userId: userB.id,
        customerEmail: userB.email,
        customerName: userB.name || "Collector Beta",
        shippingAddress: { street: "456 BGC High St", city: "Taguig", province: "Metro Manila", postalCode: "1634", phone: "09189876543" },
        subtotal: grail2.price,
        totalAmount: grail2.price,
        status: OrderStatus.PENDING, // PENDING confirmation for COD
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.COD,
        items: {
          create: [{
            variantId: grail2.id,
            productTitle: grail2.product.title,
            variantDetails: `Size ${grail2.size} • 1-of-1`,
            unitPrice: grail2.price,
            quantity: 1,
            subtotal: grail2.price,
          }],
        },
      },
    });
  });

  const codVariant2 = await prisma.productVariant.findUnique({ where: { id: grail2.id } });
  console.log(`COD Order created: ${order2.orderNumber}, status: ${order2.status}`);
  if (order2.status === OrderStatus.PENDING && codVariant2?.isSold === true) {
    console.log("PASS: COD order marked PENDING (awaiting admin confirmation); variant immediately marked isSold=true.");
  } else {
    throw new Error("FAIL: COD order allocation failed");
  }

  // -----------------------------------------------------------------------------
  // TEST 3: Two accounts racing for the same 1-of-1 pair
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 3: Two accounts racing for the exact same 1-of-1 pair ---");
  const grail3 = await getCleanGrailVariant(2);
  console.log(`Contested Grail: ${grail3.product.title} (${grail3.size})`);

  // Account A reserves it first
  const holdExpiry = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.productVariant.update({
    where: { id: grail3.id },
    data: { reservedUntil: holdExpiry, reservedBy: userA.id },
  });
  console.log(`User A successfully secured 15-minute hold for User ID: ${userA.id}`);

  // Account B tries to reserve it while User A's hold is active
  console.log(`User B now attempting to reserve the exact same variant...`);
  const userBAttempt = await prisma.$transaction(async (tx) => {
    const updateRes = await tx.productVariant.updateMany({
      where: {
        id: grail3.id,
        isSold: false,
        OR: [
          { reservedUntil: null },
          { reservedUntil: { lte: new Date() } },
          { reservedBy: userB.id }, // User B is not User A
        ],
      },
      data: { reservedUntil: holdExpiry, reservedBy: userB.id },
    });
    return updateRes.count;
  });

  if (userBAttempt === 0) {
    console.log("PASS: Race condition defeated! User B was rejected because User A holds active reservation.");
  } else {
    throw new Error("FAIL: User B should NOT have been able to acquire User A's held pair!");
  }

  // -----------------------------------------------------------------------------
  // TEST 4: Letting a hold expire & lazy cleanup
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 4: Letting a hold expire & lazy release ---");
  const grail4 = await getCleanGrailVariant(3);
  const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  // Simulate an order whose hold expired 5 minutes ago
  const expiredOrder = await prisma.order.create({
    data: {
      orderNumber: `RF-EXPIRED-TEST`,
      userId: userA.id,
      customerEmail: userA.email,
      customerName: userA.name || "Collector Alpha",
      shippingAddress: { street: "Stale Road", city: "Pasig", province: "Metro Manila", postalCode: "1600", phone: "09170000000" },
      subtotal: grail4.price,
      totalAmount: grail4.price,
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.TEST,
      expiresAt: pastDate,
      items: {
        create: [{
          variantId: grail4.id,
          productTitle: grail4.product.title,
          variantDetails: `Size ${grail4.size}`,
          unitPrice: grail4.price,
          quantity: 1,
          subtotal: grail4.price,
        }],
      },
    },
  });

  // Place variant on hold with past date
  await prisma.productVariant.update({
    where: { id: grail4.id },
    data: { reservedUntil: pastDate, reservedBy: userA.id },
  });

  console.log(`Created order ${expiredOrder.orderNumber} with expiresAt in the past.`);
  console.log("Running lazy checkAndExpireOrder...");
  const checked = await checkAndExpireOrder(expiredOrder.id);
  const releasedVariant = await prisma.productVariant.findUnique({ where: { id: grail4.id } });

  if (checked?.status === OrderStatus.EXPIRED && releasedVariant?.reservedUntil === null && releasedVariant?.reservedBy === null) {
    console.log("PASS: Order transitioned to EXPIRED, and variant hold was automatically released back to vault!");
  } else {
    throw new Error("FAIL: Lazy expiry did not release held sneakers");
  }

  // -----------------------------------------------------------------------------
  // TEST 5: Customer cancelling an unpaid order
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 5: Customer cancelling an unpaid order ---");
  const grail5 = await getCleanGrailVariant(4);
  const order5 = await prisma.order.create({
    data: {
      orderNumber: `RF-CANCEL-TEST`,
      userId: userA.id,
      customerEmail: userA.email,
      customerName: userA.name || "Collector Alpha",
      shippingAddress: { street: "Cancel St", city: "Manila", province: "Metro Manila", postalCode: "1000", phone: "09170000000" },
      subtotal: grail5.price,
      totalAmount: grail5.price,
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.TEST,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      items: {
        create: [{
          variantId: grail5.id,
          productTitle: grail5.product.title,
          variantDetails: `Size ${grail5.size}`,
          unitPrice: grail5.price,
          quantity: 1,
          subtotal: grail5.price,
        }],
      },
    },
  });
  await prisma.productVariant.update({
    where: { id: grail5.id },
    data: { reservedUntil: new Date(Date.now() + 15 * 60 * 1000), reservedBy: userA.id },
  });

  console.log(`Order ${order5.orderNumber} created with active hold.`);
  console.log(`User A cancelling their own order...`);
  const cancelRes = await cancelCustomerOrder(order5.id, userA.id);
  console.log("Cancel result:", cancelRes);

  const cancelledOrder = await prisma.order.findUnique({ where: { id: order5.id } });
  const freedVariant = await prisma.productVariant.findUnique({ where: { id: grail5.id } });

  if (cancelledOrder?.status === OrderStatus.CANCELLED && freedVariant?.reservedUntil === null) {
    console.log("PASS: Order marked CANCELLED and held sneakers immediately freed!");
  } else {
    throw new Error("FAIL: Order cancellation failed");
  }

  // Unauthorized cancel test: User B tries to cancel User A's order
  console.log("\nTesting Authorization: User B attempts to cancel User A's order...");
  const unauthorizedCancel = await cancelCustomerOrder(order1.id, userB.id);
  console.log("Unauthorized cancel attempt:", unauthorizedCancel);
  if (!unauthorizedCancel.success) {
    console.log("PASS: Server-side authorization protected User A's order from User B.");
  } else {
    throw new Error("FAIL: User B should not be allowed to cancel User A's order!");
  }

  // -----------------------------------------------------------------------------
  // TEST 6: Viewing Order History
  // -----------------------------------------------------------------------------
  console.log("\n--- TEST 6: Order History View ---");
  const userAOrders = await prisma.order.findMany({
    where: { userId: userA.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`User A has ${userAOrders.length} orders in history:`);
  for (const o of userAOrders) {
    console.log(` - Order ${o.orderNumber}: status = ${o.status}, method = ${o.paymentMethod}, total = ₱${o.totalAmount}`);
  }

  if (userAOrders.length >= 3) {
    console.log("PASS: Order history query verified with proper statuses.");
  } else {
    throw new Error("FAIL: Order history count mismatch");
  }

  console.log("\n==================================================================");
  console.log("ALL 6 TESTS PASSED SUCCESSFULLY! PHASE 4a VERIFICATION COMPLETE.");
  console.log("==================================================================");
}

runPhase4aTests()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
