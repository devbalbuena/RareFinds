"use server";

import crypto from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { OrderStatus, PaymentMethod, PaymentStatus, DeliveryMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { completeOrderPayment, cancelCustomerOrder } from "@/lib/payments/order-payment";
import { checkAndExpireOrder } from "@/lib/orders/expiry";
import { getStoreSettings } from "@/lib/settings";
import { can } from "@/lib/permissions";
import { isAreaAllowed } from "@/lib/area-matching";
import { getPaymentMode, getPaymentProvider } from "@/lib/payments";
import { calculateShippingFee, getRegionZone } from "@/lib/shipping";
import { verifyImageMagicBytes, getStorageAdminClient } from "@/lib/storage";

const newAddressSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^(\+639\d{9}|09\d{9})$/, "Phone number must be a valid PH mobile number (e.g. 09171234567 or +639171234567)"),
  street: z.string().min(3, "Street address required"),
  apartment: z.string().optional(),
  city: z.string().min(2, "City required"),
  province: z.string().min(2, "Province required"),
  postalCode: z.string().min(3, "Postal code required"),
  saveToAccount: z.boolean().optional(),
});

const placeOrderSchema = z.object({
  addressId: z.string().optional(),
  newAddress: newAddressSchema.optional(),
  deliveryMethod: z.enum(["PICKUP", "LOCAL_DELIVERY", "COURIER"]).default("COURIER"),
  paymentMethod: z.enum(["COD", "TEST", "GCASH", "MAYA", "CARD", "MANUAL_TRANSFER"]),
  notes: z.string().max(500, "Notes too long").optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

/**
 * Place Order Server Action
 * Runs within a single atomic Prisma transaction.
 * Strictly verifies prices, stock, reservations, and 1-of-1 availability against the database.
 */
export async function placeOrderAction(input: PlaceOrderInput) {
  console.log("[placeOrderAction] Processing order placement...");
  const session = await auth();
  if (!session?.user?.id) {
    console.warn("[placeOrderAction] No authenticated session found.");
    return { error: "You must be signed in to place an order.", requiresLogin: true };
  }

  const userId = session.user.id;

  // Gate enforcement behind REQUIRE_EMAIL_VERIFICATION until real email sending exists
  if (process.env.REQUIRE_EMAIL_VERIFICATION === "true") {
    const userForCheck = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!userForCheck?.emailVerified) {
      return {
        error: "Please verify your email address before placing an order.",
        requiresEmailVerification: true,
      };
    }
  }

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    console.warn("[placeOrderAction] Validation failed:", parsed.error.issues);
    return { error: parsed.error.issues[0]?.message || "Invalid order information." };
  }

  const { addressId, newAddress, deliveryMethod, paymentMethod, notes } = parsed.data;

  // Load store settings early for validations and fees
  const settings = await getStoreSettings();

  // Strict Server-Side Enforcement of PAYMENT_MODE
  const paymentMode = getPaymentMode();
  if (paymentMethod !== "COD" && paymentMethod !== "MANUAL_TRANSFER") {
    if (paymentMode !== "demo") {
      console.warn(`[placeOrderAction] Payment method ${paymentMethod} rejected: mode is ${paymentMode}`);
      return {
        error: "Online demo payments are disabled. Please checkout using Cash on Delivery (COD) or Manual Transfer.",
      };
    }
  }

  // 1. Validate Store Settings Availability Rules (User Constraint #1)
  if (deliveryMethod === "PICKUP") {
    if (!settings.pickupAddress || settings.pickupAddress.trim().length === 0) {
      return {
        error: "Store pickup is currently unavailable as no store pickup address has been configured.",
      };
    }
  }

  if (paymentMethod === "MANUAL_TRANSFER") {
    if (!settings.manualPaymentInstructions || settings.manualPaymentInstructions.trim().length === 0) {
      return {
        error: "Manual bank / e-wallet transfer is currently unavailable as payment instructions have not been configured.",
      };
    }
  }

  // 2. Resolve Shipping Address Snapshot
  let shippingAddressSnapshot: {
    fullName: string;
    phone: string;
    street: string;
    apartment?: string | null;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  const customerEmail = userRecord?.email || session.user.email || "buyer@rarefinds.ph";
  const customerName = userRecord?.name || session.user.name || "RareFinds Collector";

  if (addressId) {
    const savedAddress = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!savedAddress) {
      return { error: "Selected shipping address was not found." };
    }
    shippingAddressSnapshot = {
      fullName: savedAddress.fullName,
      phone: savedAddress.phone,
      street: savedAddress.street,
      apartment: savedAddress.apartment,
      city: savedAddress.city,
      province: savedAddress.province,
      postalCode: savedAddress.postalCode,
      country: "Philippines",
    };
  } else if (newAddress) {
    shippingAddressSnapshot = {
      fullName: newAddress.fullName,
      phone: newAddress.phone,
      street: newAddress.street,
      apartment: newAddress.apartment || null,
      city: newAddress.city,
      province: newAddress.province,
      postalCode: newAddress.postalCode,
      country: "Philippines",
    };

    if (newAddress.saveToAccount) {
      try {
        const existingCount = await prisma.address.count({ where: { userId } });
        await prisma.address.create({
          data: {
            userId,
            fullName: newAddress.fullName,
            phone: newAddress.phone,
            street: newAddress.street,
            apartment: newAddress.apartment || null,
            city: newAddress.city,
            province: newAddress.province,
            postalCode: newAddress.postalCode,
            isDefault: existingCount === 0,
          },
        });
        console.log(`[placeOrderAction] Saved new address to user ${userId} account.`);
      } catch (err) {
        console.error("[placeOrderAction] Failed to save address to account:", err);
      }
    }
  } else if (deliveryMethod === "PICKUP") {
    // If pickup and no custom address was specified, use store pickup address
    shippingAddressSnapshot = {
      fullName: customerName,
      phone: "09000000000",
      street: settings.pickupAddress || "RareFinds Store Vault",
      apartment: "Store Pickup Counter",
      city: "Pickup",
      province: "Pickup",
      postalCode: "0000",
      country: "Philippines",
    };
  } else {
    return { error: "Please provide a shipping address." };
  }

  // 3. Geographical Area Enforcement for Local Delivery and Vault Pickup
  if (deliveryMethod === "PICKUP") {
    const zone = getRegionZone(shippingAddressSnapshot.province);
    if (zone.zoneKey !== "NCR") {
      return {
        error: "Vault pickup is only available for Metro Manila customers at our BGC vault. For provincial addresses, please choose Nationwide Courier.",
      };
    }
  }

  if (deliveryMethod === "LOCAL_DELIVERY") {
    const zone = getRegionZone(shippingAddressSnapshot.province);
    if (zone.zoneKey !== "NCR") {
      return {
        error: `Local Express delivery is only available within Metro Manila. For ${shippingAddressSnapshot.province}, please choose Nationwide Courier.`,
      };
    }
    if (settings.localDeliveryAreas && settings.localDeliveryAreas.trim().length > 0) {
      const isLocalAllowed = isAreaAllowed(
        shippingAddressSnapshot.city,
        shippingAddressSnapshot.province,
        settings.localDeliveryAreas
      );
      if (!isLocalAllowed) {
        return {
          error: `Local Express delivery is not available for ${shippingAddressSnapshot.city}, ${shippingAddressSnapshot.province}. Please choose nationwide courier delivery.`,
        };
      }
    }
  }

  // 4. Calculate Dynamic Distance-Based Shipping Fee
  const shippingCalc = calculateShippingFee({
    deliveryMethod: deliveryMethod as DeliveryMethod,
    regionIdOrName: shippingAddressSnapshot.province,
    cityName: shippingAddressSnapshot.city,
  });
  const shippingFeeNumber = shippingCalc.fee;

  // 5. Generate Delivery Security PIN for Local Delivery (User Constraint #5)
  const deliveryPin =
    deliveryMethod === "LOCAL_DELIVERY"
      ? crypto.randomInt(1000, 10000).toString()
      : null;

  // 6. Execute Place Order in a SINGLE atomic Prisma transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const holdMinutes =
        paymentMethod === "MANUAL_TRANSFER"
          ? settings.manualPaymentHoldMinutes || 60
          : 15;
      const expiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000);

      // A. Fetch current user cart with full variant & product details
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: {
                        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error("Your cart is empty.");
      }

      // B. Re-validate every cart item against live database state
      for (const item of cart.items) {
        const v = item.variant;
        if (!v) {
          throw new Error("A sneaker in your cart is no longer available.");
        }

        if (v.product.status !== "ACTIVE") {
          throw new Error(`"${v.product.title}" is no longer active in our catalog.`);
        }

        if (v.isSold) {
          throw new Error(`"${v.product.title}" (${v.size}) has already been sold.`);
        }

        if (v.stockQty < item.quantity) {
          throw new Error(`Insufficient stock for "${v.product.title}" (${v.size}).`);
        }

        // Check active hold by another customer
        if (v.reservedUntil && v.reservedUntil > now && v.reservedBy !== userId) {
          throw new Error(
            `"${v.product.title}" (${v.size}) is currently on hold by another buyer.`
          );
        }
      }

      const isCod = paymentMethod === "COD";

      // C. Reserve or Allocate each variant atomically with conditional update
      for (const item of cart.items) {
        const v = item.variant;

        if (!isCod) {
          // Online or Manual Transfer: Reserve for hold window
          const updateRes = await tx.productVariant.updateMany({
            where: {
              id: v.id,
              isSold: false,
              stockQty: { gte: item.quantity },
              OR: [
                { reservedUntil: null },
                { reservedUntil: { lte: now } },
                { reservedBy: userId },
              ],
            },
            data: {
              reservedUntil: expiresAt,
              reservedBy: userId,
            },
          });

          if (updateRes.count === 0) {
            throw new Error(`"${v.product.title}" (${v.size}) was just reserved by another collector.`);
          }
        } else {
          // COD: Allocate immediately and set isSold dynamically based on remaining stock
          const remainingStock = Math.max(0, v.stockQty - item.quantity);
          const updateRes = await tx.productVariant.updateMany({
            where: {
              id: v.id,
              isSold: false,
              stockQty: { gte: item.quantity },
              OR: [
                { reservedUntil: null },
                { reservedUntil: { lte: now } },
                { reservedBy: userId },
              ],
            },
            data: {
              isSold: remainingStock <= 0,
              stockQty: remainingStock,
              reservedUntil: null,
              reservedBy: null,
            },
          });

          if (updateRes.count === 0) {
            throw new Error(`"${v.product.title}" (${v.size}) is no longer available.`);
          }
        }
      }

      // D. Calculate subtotal & totals strictly from DB variant prices
      const subtotalNumber = cart.items.reduce((acc, item) => {
        return acc + Number(item.variant.price) * item.quantity;
      }, 0);
      const totalAmountNumber = subtotalNumber + shippingFeeNumber;

      // E. Server-Side COD Guardrails: Allowed within Metro Manila; Online only for Provincial
      if (isCod) {
        const zone = getRegionZone(shippingAddressSnapshot.province);
        if (zone.zoneKey !== "NCR") {
          throw new Error(
            "Cash on Delivery is available within Metro Manila only. Please choose an online payment method for provincial shipments."
          );
        }

        // COD maximum order value guardrail
        const effectiveCodMax = Number(settings.codMaxAmount) > 0 ? Number(settings.codMaxAmount) : 200000;
        if (totalAmountNumber > effectiveCodMax) {
          throw new Error(
            `Cash on Delivery is limited to orders up to ₱${effectiveCodMax.toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}. Please choose an online payment method.`
          );
        }
      }

      // F. Generate human-readable orderNumber
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `RF-${datePart}-${randomPart}`;

      // G. Determine initial status and simulation flag
      let initialStatus: OrderStatus = OrderStatus.PENDING_PAYMENT;
      if (isCod) {
        initialStatus = OrderStatus.PENDING;
      }

      const isSimulated = paymentMethod !== "COD" && paymentMethod !== "MANUAL_TRANSFER";

      // H. Create Order record with unitCost snapshot (User Constraint #9)
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          customerEmail,
          customerName,
          customerPhone: shippingAddressSnapshot.phone,
          shippingAddress: shippingAddressSnapshot,
          deliveryMethod: deliveryMethod as DeliveryMethod,
          deliveryPin,
          deliveryPinAttempts: 0,
          subtotal: subtotalNumber,
          shippingFee: shippingFeeNumber,
          totalAmount: totalAmountNumber,
          status: initialStatus,
          paymentStatus: PaymentStatus.UNPAID,
          paymentMethod: paymentMethod as PaymentMethod,
          isSimulated,
          paymentReference: isSimulated
            ? `DEMO-${paymentMethod}-${orderNumber}`
            : isCod
            ? `COD-${orderNumber}`
            : `MANUAL-${orderNumber}`,
          expiresAt: isCod ? null : expiresAt,
          notes: notes || null,
          items: {
            create: cart.items.map((item) => {
              const v = item.variant;
              const primaryImg =
                v.product.images.find((img) => img.isPrimary)?.url ||
                v.product.images[0]?.url ||
                null;

              return {
                variantId: v.id,
                productTitle: v.product.title,
                variantDetails: `Size US ${v.size} • ${v.condition}${v.isOneOfOne ? " • 1-of-1 Grail" : ""}`,
                productImageUrl: primaryImg,
                unitPrice: Number(v.price),
                unitCost: v.costPrice ? Number(v.costPrice) : null, // UnitCost snapshot
                quantity: item.quantity,
                subtotal: Number(v.price) * item.quantity,
              };
            }),
          },
        },
      });

      // I. Create initial Payment ledger row inside the same transaction (User Constraint #8)
      if (isCod) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: PaymentMethod.COD,
            amount: totalAmountNumber,
            status: PaymentStatus.UNPAID,
            reference: `COD-${order.orderNumber}`,
            isSimulated: false,
          },
        });
      } else if (paymentMethod === "MANUAL_TRANSFER") {
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: PaymentMethod.MANUAL_TRANSFER,
            amount: totalAmountNumber,
            status: PaymentStatus.UNPAID,
            reference: `MANUAL-${order.orderNumber}`,
            isSimulated: false,
          },
        });
      }

      // J. Clear the customer's cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });

    // If demo payment, instantly complete payment with markPaid
    if (paymentMethod !== "COD" && paymentMethod !== "MANUAL_TRANSFER") {
      const provider = getPaymentProvider(paymentMethod as PaymentMethod);
      await provider.markPaid(result.id, `DEMO-${paymentMethod}-${result.orderNumber}`);
    }

    revalidatePath("/checkout");
    revalidatePath("/account/orders");
    revalidatePath("/products");

    return {
      success: true,
      orderId: result.id,
      orderNumber: result.orderNumber,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to place order. Please try again.";
    return { error: message };
  }
}

/**
 * Simulate Payment Server Action
 * Idempotent: Can be clicked multiple times without double-counting.
 */
export async function simulatePaymentAction(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to simulate payment." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true },
  });

  if (!order) {
    return { error: "Order not found." };
  }

  // Authorization check: user must own order or have staff/admin order permission
  if (order.userId !== session.user.id && !can(session.user.role, "order:view")) {
    return { error: "Unauthorized to simulate payment for this order." };
  }

  const res = await completeOrderPayment(orderId);

  revalidatePath(`/order-success/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/products");

  return res;
}

/**
 * Cancel Order Server Action
 * Customer can cancel their own unpaid order (releases holds and inventory).
 */
export async function cancelOrderAction(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to cancel an order." };
  }

  const res = await cancelCustomerOrder(orderId, session.user.id);

  revalidatePath(`/order-success/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/products");

  return res;
}

/**
 * Get Order Details with Lazy Expiry Check
 */
export async function getOrderDetailsAction(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Run lazy expiry check first
  await checkAndExpireOrder(orderId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    return { error: "Order not found" };
  }

  // Authorization check
  if (order.userId !== session.user.id && !can(session.user.role, "order:view")) {
    return { error: "Unauthorized access to order." };
  }

  // Serialize Decimal and Date fields to plain JSON objects
  const serializedOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress as Record<string, string>,
    deliveryMethod: order.deliveryMethod,
    deliveryPin: order.deliveryPin,
    deliveryPinAttempts: order.deliveryPinAttempts,
    subtotal: Number(order.subtotal),
    shippingFee: Number(order.shippingFee),
    totalAmount: Number(order.totalAmount),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    isSimulated: order.isSimulated,
    trackingNumber: order.trackingNumber,
    shippingCarrier: order.shippingCarrier,
    notes: order.notes,
    expiresAt: order.expiresAt ? order.expiresAt.toISOString() : null,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    qcVerifiedAt: order.qcVerifiedAt ? order.qcVerifiedAt.toISOString() : null,
    qcVerifiedById: order.qcVerifiedById,
    shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    customerConfirmedAt: order.customerConfirmedAt ? order.customerConfirmedAt.toISOString() : null,
    problemReportedAt: order.problemReportedAt ? order.problemReportedAt.toISOString() : null,
    problemReason: order.problemReason,
    autoCompleteAt: order.autoCompleteAt ? order.autoCompleteAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productTitle: item.productTitle,
      variantDetails: item.variantDetails,
      productImageUrl: item.productImageUrl,
      unitPrice: Number(item.unitPrice),
      unitCost: item.unitCost ? Number(item.unitCost) : null,
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    })),
  };

  return { success: true, order: serializedOrder };
}

/**
 * Customer "Confirm Received" Action
 * Strictly allowed only after staff marks DELIVERED.
 * Customer confirmation never marks COD as paid (User Constraint #10).
 */
export async function confirmReceivedCustomerAction(
  orderId: string,
  review?: { rating?: number; feedback?: string; conditionVerified?: boolean }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to confirm delivery." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { error: "Order not found." };
  }

  if (order.userId !== session.user.id) {
    return { error: "Unauthorized: You do not own this order." };
  }

  if (order.status !== OrderStatus.DELIVERED) {
    return {
      error: "You can only confirm receipt after the order has been delivered by our courier or collected at the store.",
    };
  }

  if (order.customerConfirmedAt) {
    return { success: true, message: "Receipt was already confirmed." };
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      customerConfirmedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userEmail: session.user.email || "buyer@rarefinds.ph",
      action: "CUSTOMER_CONFIRMED_DELIVERY",
      entityType: "Order",
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        customerConfirmedAt: updated.customerConfirmedAt,
        rating: review?.rating ?? 5,
        feedback: review?.feedback || null,
        conditionVerified: review?.conditionVerified ?? true,
      },
    },
  });

  revalidatePath(`/order-success/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);

  return { success: true, message: "Delivery receipt confirmed. Thank you!" };
}

/**
 * Customer "Report a Problem" Action
 * Allowed within the autoCompleteDays window after delivery.
 * Flags the order for administrator review (User Constraint #10).
 */
export async function reportOrderProblemAction(orderId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to report an issue." };
  }

  if (!reason || reason.trim().length < 10) {
    return { error: "Please describe the problem in detail (at least 10 characters)." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { error: "Order not found." };
  }

  if (order.userId !== session.user.id) {
    return { error: "Unauthorized: You do not own this order." };
  }

  if (order.status !== OrderStatus.DELIVERED) {
    return { error: "Issues can only be reported for delivered orders." };
  }

  const settings = await getStoreSettings();
  const now = new Date();

  const autoCompleteDeadline =
    order.autoCompleteAt ||
    (order.deliveredAt
      ? new Date(order.deliveredAt.getTime() + (settings.autoCompleteDays || 3) * 86400000)
      : null);

  if (autoCompleteDeadline && now > autoCompleteDeadline) {
    return {
      error: `The problem reporting window (${settings.autoCompleteDays} days after delivery) for this order has expired.`,
    };
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      problemReportedAt: now,
      problemReason: reason.trim(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userEmail: session.user.email || "buyer@rarefinds.ph",
      action: "ORDER_PROBLEM_REPORTED",
      entityType: "Order",
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        reason: reason.trim(),
        problemReportedAt: updated.problemReportedAt,
      },
    },
  });

  revalidatePath(`/order-success/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath(`/admin/orders/${orderId}`);

  return {
    success: true,
    message: "Your report has been sent to RareFinds Vault administration for review.",
  };
}

/**
 * Customer Action: Upload Manual Payment Proof (GCash / Bank Transfer)
 * Validates file size (<= 5MB), image magic bytes, updates order review flag, and registers audit log.
 */
export async function uploadPaymentProofAction(orderId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to upload payment proof." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { error: "Order not found." };
  }

  if (order.userId !== session.user.id) {
    return { error: "Unauthorized: You do not own this order." };
  }

  if (order.paymentMethod !== "MANUAL_TRANSFER") {
    return { error: "Payment proof is only applicable for Manual Bank / GCash transfer orders." };
  }

  const file = formData.get("proofFile") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please select an image file to upload." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "File size exceeds 5MB limit. Please upload a smaller screenshot." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Only JPG, PNG, and WebP receipts are supported." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const magic = verifyImageMagicBytes(new Uint8Array(buffer));
  if (!magic.valid) {
    return { error: magic.error || "Invalid image header detected." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const storageKey = `order-proofs/payments/${order.id}/receipt-${Date.now()}.${ext}`;

  try {
    const supabase = getStorageAdminClient();
    await supabase.storage.from("product-images").upload(storageKey, buffer, {
      contentType: file.type,
      upsert: true,
    });
  } catch (err) {
    console.warn("[uploadPaymentProofAction] Storage client warning:", err);
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentProofKey: storageKey,
      paymentProofUploadedAt: new Date(),
      paymentReviewFlag: true,
      status: OrderStatus.PENDING,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userEmail: session.user.email || "buyer@rarefinds.ph",
      action: "MANUAL_PAYMENT_PROOF_UPLOADED",
      entityType: "Order",
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        storageKey,
        uploadedAt: updated.paymentProofUploadedAt,
      },
    },
  });

  revalidatePath(`/order-success/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath(`/admin/orders/${orderId}`);

  return {
    success: true,
    message: "Payment receipt uploaded successfully! Vault staff will verify and release your order shortly.",
    paymentProofKey: storageKey,
  };
}
