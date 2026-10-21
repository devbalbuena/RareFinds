import prisma from "@/lib/prisma";
import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

/**
 * Idempotent order payment fulfillment.
 * Can be called by "Simulate Payment" action in Phase 4a or PayMongo Webhooks in Phase 4b.
 * If called multiple times with the same order, it returns successfully without double-processing.
 */
export async function completeOrderPayment(
  orderId: string,
  paymentReference?: string,
  isSimulated?: boolean
): Promise<{ success: boolean; message?: string; error?: string; orderNumber?: string }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    // Idempotency: If already paid, return success immediately without double-processing
    if (order.paymentStatus === PaymentStatus.PAID) {
      return {
        success: true,
        message: "Order is already marked as paid.",
        orderNumber: order.orderNumber,
      };
    }

    // Disallow paying cancelled or expired orders
    if (order.status === OrderStatus.CANCELLED) {
      return { success: false, error: "Cannot pay for a cancelled order." };
    }

    if (order.status === OrderStatus.EXPIRED) {
      return { success: false, error: "This order has expired and reservations were released." };
    }

    // Process each variant in the order
    for (const item of order.items) {
      if (item.variantId && item.variant) {
        const v = item.variant;

        if (v.isOneOfOne) {
          // Permanently mark 1-of-1 pair as sold and clear holds
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              isSold: true,
              reservedUntil: null,
              reservedBy: null,
            },
          });
        } else {
          // Standard multi-quantity sneaker:
          // If the order was COD, stock was already decremented upon order placement.
          // For non-COD (GCASH, MAYA, CARD, TEST), decrement stock now upon confirmed payment.
          const shouldDecrement = order.paymentMethod !== PaymentMethod.COD;

          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              ...(shouldDecrement
                ? { stockQty: Math.max(0, v.stockQty - item.quantity) }
                : {}),
              reservedUntil: null,
              reservedBy: null,
            },
          });
        }
      }
    }

    const markSimulated =
      isSimulated !== undefined
        ? isSimulated
        : order.isSimulated || order.paymentMethod !== PaymentMethod.COD;

    const paymentRef =
      paymentReference ||
      order.paymentReference ||
      `DEMO-${order.paymentMethod}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Update order status and payment details
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
        isSimulated: markSimulated,
        paymentReference: paymentRef,
      },
    });

    // Record or update the Payment ledger entry atomically (unique guard on [orderId, method])
    await tx.payment.upsert({
      where: {
        orderId_method: {
          orderId: order.id,
          method: order.paymentMethod,
        },
      },
      update: {
        status: PaymentStatus.PAID,
        amount: order.totalAmount,
        reference: paymentRef,
        isSimulated: markSimulated,
        paidAt: new Date(),
      },
      create: {
        orderId: order.id,
        method: order.paymentMethod,
        amount: order.totalAmount,
        status: PaymentStatus.PAID,
        reference: paymentRef,
        isSimulated: markSimulated,
        paidAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Payment processed successfully.",
      orderNumber: updatedOrder.orderNumber,
    };
  });
}

/**
 * Customer cancels an unpaid order.
 * Releases 1-of-1 reservations and restores inventory if COD was previously allocated.
 */
export async function cancelCustomerOrder(
  orderId: string,
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    // Server-side authorization check: order must belong to user
    if (order.userId !== userId) {
      return { success: false, error: "You are not authorized to cancel this order." };
    }

    // Only allow cancelling unpaid orders or simulated demo paid orders
    const canCancel =
      order.status === OrderStatus.PENDING_PAYMENT ||
      order.status === OrderStatus.PENDING ||
      (order.isSimulated && order.status === OrderStatus.PAID);

    if (!canCancel) {
      return {
        success: false,
        error: `Cannot cancel an order in ${order.status} status.`,
      };
    }

    // Release variants
    for (const item of order.items) {
      if (item.variantId && item.variant) {
        const v = item.variant;

        if (
          order.paymentMethod === PaymentMethod.COD ||
          (order.isSimulated && order.status === OrderStatus.PAID)
        ) {
          // COD or PAID demo order previously marked 1-of-1 isSold=true or decremented stockQty
          if (v.isOneOfOne) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                isSold: false,
                reservedUntil: null,
                reservedBy: null,
              },
            });
          } else {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                stockQty: { increment: item.quantity },
                reservedUntil: null,
                reservedBy: null,
              },
            });
          }
        } else {
          // TEST/unpaid hold: clear reservation if held by this user
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              reservedUntil: null,
              reservedBy: null,
            },
          });
        }
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Order cancelled successfully and reserved sneakers released.",
    };
  });
}
