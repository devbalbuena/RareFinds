import { OrderStatus, PaymentMethod } from "@prisma/client";

/**
 * Valid state transition matrix for RareFinds orders.
 *
 * Online / Prepaid flow:
 * PENDING_PAYMENT -> PAID -> PROCESSING (QC) -> SHIPPED -> DELIVERED
 *
 * COD flow:
 * PENDING -> PROCESSING (QC) -> SHIPPED -> DELIVERED (payment settles at delivery)
 *
 * PICKUP flow:
 * Same transitions, but SHIPPED step represents "Ready for Pickup"
 *
 * Skipped or backward transitions are strictly rejected.
 */
export const ALLOWED_TRANSITIONS: Record<"ONLINE" | "COD", Record<OrderStatus, OrderStatus[]>> = {
  ONLINE: {
    PENDING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.EXPIRED],
    PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    SHIPPED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    DELIVERED: [],
    CANCELLED: [],
    EXPIRED: [],
    PENDING: [], // COD-only state
  },
  COD: {
    PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    SHIPPED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    DELIVERED: [],
    CANCELLED: [],
    EXPIRED: [],
    PENDING_PAYMENT: [], // Online-only state
    PAID: [], // Online-only state (COD settles directly to DELIVERED with PAID paymentStatus)
  },
};

/**
 * Validates whether a requested status transition is allowed.
 */
export function validateStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  paymentMethod: PaymentMethod
): { allowed: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  const flow = paymentMethod === PaymentMethod.COD ? "COD" : "ONLINE";
  const validTargets = ALLOWED_TRANSITIONS[flow][currentStatus] || [];

  if (!validTargets.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid status transition from ${currentStatus} to ${targetStatus} for ${flow} order. Skipped or backward transitions are strictly prohibited.`,
    };
  }

  return { allowed: true };
}
