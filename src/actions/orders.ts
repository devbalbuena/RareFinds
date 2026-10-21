"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { completeOrderPayment, cancelCustomerOrder } from "@/lib/payments/order-payment";
import { checkAndExpireOrder } from "@/lib/orders/expiry";
import { getStoreSettings } from "@/lib/settings";
import { can } from "@/lib/permissions";

import { getPaymentMode, getPaymentProvider } from "@/lib/payments";

const newAddressSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(7, "Valid phone number required"),
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
  paymentMethod: z.enum(["COD", "TEST", "GCASH", "MAYA", "CARD"]),
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

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    console.warn("[placeOrderAction] Validation failed:", parsed.error.issues);
    return { error: parsed.error.issues[0]?.message || "Invalid order information." };
  }

  const { addressId, newAddress, paymentMethod, notes } = parsed.data;

  // Strict Server-Side Enforcement of PAYMENT_MODE
  const paymentMode = getPaymentMode();
  if (paymentMethod !== "COD") {
    if (paymentMode !== "demo") {
      console.warn(`[placeOrderAction] Payment method ${paymentMethod} rejected: mode is ${paymentMode}`);
      return {
        error: "Online demo payments are disabled. Please checkout using Cash on Delivery (COD).",
      };
    }
  }

  // 1. Resolve Shipping Address Snapshot
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
  } else {
    return { error: "Please provide a shipping address." };
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  const customerEmail = userRecord?.email || session.user.email || "buyer@rarefinds.ph";
  const customerName = userRecord?.name || session.user.name || shippingAddressSnapshot.fullName;

  // 2. Execute Place Order in a SINGLE atomic Prisma transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute hold

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

      const isDemoPayment = paymentMethod !== "COD";

      // C. Reserve or Allocate each variant atomically with conditional update
      for (const item of cart.items) {
        const v = item.variant;

        if (isDemoPayment) {
          // Demo payment: Reserve for 15 minutes hold
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
          // COD: Allocate immediately (mark 1-of-1 as isSold=true, decrement stock for normal)
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
              isSold: v.isOneOfOne ? true : false,
              stockQty: { decrement: item.quantity },
              reservedUntil: null,
              reservedBy: null,
            },
          });

          if (updateRes.count === 0) {
            throw new Error(`"${v.product.title}" (${v.size}) is no longer available.`);
          }
        }
      }

      // D. Calculate subtotal & totals strictly from DB variant prices & Store Settings
      const subtotalNumber = cart.items.reduce((acc, item) => {
        return acc + Number(item.variant.price) * item.quantity;
      }, 0);
      const settings = await getStoreSettings();
      const shippingFeeNumber = Number(settings.shippingFee ?? 0);
      const totalAmountNumber = subtotalNumber + shippingFeeNumber;

      // E. Generate human-readable orderNumber
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `RF-${datePart}-${randomPart}`;

      // F. Create Order record
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          customerEmail,
          customerName,
          customerPhone: shippingAddressSnapshot.phone,
          shippingAddress: shippingAddressSnapshot,
          subtotal: subtotalNumber,
          shippingFee: shippingFeeNumber,
          totalAmount: totalAmountNumber,
          status: isDemoPayment
            ? OrderStatus.PENDING_PAYMENT
            : OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          paymentMethod: paymentMethod as PaymentMethod,
          isSimulated: isDemoPayment,
          paymentReference: isDemoPayment
            ? `DEMO-${paymentMethod}-${orderNumber}`
            : `COD-${orderNumber}`,
          expiresAt: isDemoPayment ? expiresAt : null,
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
                quantity: item.quantity,
                subtotal: Number(v.price) * item.quantity,
              };
            }),
          },
        },
      });

      // G. Clear the customer's cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });

    // If demo payment, instantly complete payment with markPaid
    if (paymentMethod !== "COD") {
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
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productTitle: item.productTitle,
      variantDetails: item.variantDetails,
      productImageUrl: item.productImageUrl,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    })),
  };

  return { success: true, order: serializedOrder };
}
