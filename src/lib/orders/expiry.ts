import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

/**
 * Lazy expiry check for a single order.
 * If the 15-minute reservation window has passed and the order remains PENDING_PAYMENT,
 * transitions the order to EXPIRED and releases reserved sneakers.
 */
export async function checkAndExpireOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) return null;

  const now = new Date();
  if (
    order.status === OrderStatus.PENDING_PAYMENT &&
    order.expiresAt &&
    order.expiresAt <= now
  ) {
    await prisma.$transaction(async (tx) => {
      // 1. Mark order expired
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.EXPIRED },
      });

      // 2. Release variant holds
      for (const item of order.items) {
        if (item.variantId && order.userId) {
          await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              reservedBy: order.userId,
            },
            data: {
              reservedUntil: null,
              reservedBy: null,
            },
          });
        }
      }
    });

    return {
      ...order,
      status: OrderStatus.EXPIRED,
    };
  }

  return order;
}

/**
 * Batch cleanup for all expired orders.
 * Cleans up any stale holds across the platform.
 */
export async function cleanupExpiredOrders() {
  const now = new Date();

  const expiredOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING_PAYMENT,
      expiresAt: {
        lte: now,
      },
    },
    include: {
      items: true,
    },
  });

  if (expiredOrders.length === 0) return { count: 0 };

  let processedCount = 0;

  for (const order of expiredOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.EXPIRED },
        });

        for (const item of order.items) {
          if (item.variantId && order.userId) {
            await tx.productVariant.updateMany({
              where: {
                id: item.variantId,
                reservedBy: order.userId,
              },
              data: {
                reservedUntil: null,
                reservedBy: null,
              },
            });
          }
        }
      });
      processedCount++;
    } catch (err) {
      console.error(`Failed to expire order ${order.id}:`, err);
    }
  }

  return { count: processedCount };
}
