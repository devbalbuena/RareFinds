"use server";

import { z } from "zod";
import { DeliveryMethod, OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role, StockAdjustmentReason } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { validateStatusTransition } from "@/lib/orders/status-transitions";
import { getStoreSettings } from "@/lib/settings";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in standalone test or script contexts
  }
}

export interface ShippingAddressData {
  fullName: string;
  phone: string;
  street: string;
  apartment?: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface SerializedAdminOrderItem {
  id: string;
  variantId: string | null;
  productTitle: string;
  variantDetails: string;
  productImageUrl: string | null;
  unitPrice: number;
  unitCost?: number | null;
  quantity: number;
  subtotal: number;
  variant?: {
    id: string;
    size: string;
    condition: string;
    isOneOfOne: boolean;
    isSold: boolean;
    stockQty: number;
  } | null;
}

export interface SerializedPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  reference: string | null;
  isSimulated: boolean;
  paidAt: string | null;
  createdAt: string;
}

export interface SerializedAdminOrder {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: ShippingAddressData;
  deliveryMethod: DeliveryMethod;
  deliveryPin: string | null;
  deliveryPinAttempts: number;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  isSimulated: boolean;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  notes: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  qcVerifiedAt: string | null;
  qcVerifiedById: string | null;
  qcVerifiedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  customerConfirmedAt: string | null;
  problemReportedAt: string | null;
  problemReason: string | null;
  autoCompleteAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: SerializedAdminOrderItem[];
  payments?: SerializedPayment[];
  user?: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    ordersCount?: number;
  } | null;
}

export interface GetAdminOrdersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OrderStatus | "ALL";
  paymentMethod?: PaymentMethod | "ALL";
  paymentStatus?: PaymentStatus | "ALL";
  sortBy?: "newest" | "oldest" | "total_desc" | "total_asc";
}

/**
 * Fetch paginated admin orders with filters, search, and status counters
 */
export async function getAdminOrdersAction(params: GetAdminOrdersParams = {}) {
  await verifyAdminSession("order:view");

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 15));
  const skip = (page - 1) * pageSize;

  const where: Prisma.OrderWhereInput = {};

  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: "insensitive" } },
      { customerName: { contains: term, mode: "insensitive" } },
      { customerEmail: { contains: term, mode: "insensitive" } },
      { customerPhone: { contains: term, mode: "insensitive" } },
      { trackingNumber: { contains: term, mode: "insensitive" } },
      { paymentReference: { contains: term, mode: "insensitive" } },
    ];
  }

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.paymentMethod && params.paymentMethod !== "ALL") {
    where.paymentMethod = params.paymentMethod;
  }

  if (params.paymentStatus && params.paymentStatus !== "ALL") {
    where.paymentStatus = params.paymentStatus;
  }

  let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: "desc" };
  if (params.sortBy === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (params.sortBy === "total_desc") {
    orderBy = { totalAmount: "desc" };
  } else if (params.sortBy === "total_asc") {
    orderBy = { totalAmount: "asc" };
  }

  const [orders, totalCount, statusCountsRaw] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                size: true,
                condition: true,
                isOneOfOne: true,
                isSold: true,
                stockQty: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {
    ALL: 0,
    PENDING: 0,
    PENDING_PAYMENT: 0,
    PROCESSING: 0,
    PAID: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    EXPIRED: 0,
  };

  for (const s of statusCountsRaw) {
    statusCounts[s.status] = s._count._all;
    statusCounts.ALL += s._count._all;
  }

  const serializedOrders: SerializedAdminOrder[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    shippingAddress: o.shippingAddress as unknown as ShippingAddressData,
    deliveryMethod: o.deliveryMethod,
    deliveryPin: o.deliveryPin,
    deliveryPinAttempts: o.deliveryPinAttempts,
    subtotal: Number(o.subtotal),
    shippingFee: Number(o.shippingFee),
    totalAmount: Number(o.totalAmount),
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    paymentReference: o.paymentReference,
    isSimulated: o.isSimulated,
    trackingNumber: o.trackingNumber,
    shippingCarrier: o.shippingCarrier,
    notes: o.notes,
    expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    qcVerifiedAt: o.qcVerifiedAt ? o.qcVerifiedAt.toISOString() : null,
    qcVerifiedById: o.qcVerifiedById,
    shippedAt: o.shippedAt ? o.shippedAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    customerConfirmedAt: o.customerConfirmedAt ? o.customerConfirmedAt.toISOString() : null,
    problemReportedAt: o.problemReportedAt ? o.problemReportedAt.toISOString() : null,
    problemReason: o.problemReason,
    autoCompleteAt: o.autoCompleteAt ? o.autoCompleteAt.toISOString() : null,
    cancelledAt: o.cancelledAt ? o.cancelledAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      variantId: i.variantId,
      productTitle: i.productTitle,
      variantDetails: i.variantDetails,
      productImageUrl: i.productImageUrl,
      unitPrice: Number(i.unitPrice),
      unitCost: i.unitCost ? Number(i.unitCost) : null,
      quantity: i.quantity,
      subtotal: Number(i.subtotal),
      variant: i.variant,
    })),
    user: o.user,
  }));

  return {
    orders: serializedOrders,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize) || 1,
    statusCounts,
  };
}

/**
 * Fetch detailed order by ID with audit trail, QC verifier, and payment ledger
 */
export async function getAdminOrderByIdAction(orderId: string) {
  await verifyAdminSession("order:view");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: {
            select: {
              id: true,
              size: true,
              condition: true,
              isOneOfOne: true,
              isSold: true,
              stockQty: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
      qcVerifiedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          _count: {
            select: { orders: true },
          },
        },
      },
    },
  });

  if (!order) {
    return { error: "Order not found." };
  }

  // Fetch audit trail for this order
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "Order",
      entityId: order.id,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const serializedOrder: SerializedAdminOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress as unknown as ShippingAddressData,
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
    qcVerifiedBy: order.qcVerifiedBy
      ? {
          id: order.qcVerifiedBy.id,
          name: order.qcVerifiedBy.name,
          email: order.qcVerifiedBy.email,
        }
      : null,
    shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    customerConfirmedAt: order.customerConfirmedAt ? order.customerConfirmedAt.toISOString() : null,
    problemReportedAt: order.problemReportedAt ? order.problemReportedAt.toISOString() : null,
    problemReason: order.problemReason,
    autoCompleteAt: order.autoCompleteAt ? order.autoCompleteAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
      variantId: i.variantId,
      productTitle: i.productTitle,
      variantDetails: i.variantDetails,
      productImageUrl: i.productImageUrl,
      unitPrice: Number(i.unitPrice),
      unitCost: i.unitCost ? Number(i.unitCost) : null,
      quantity: i.quantity,
      subtotal: Number(i.subtotal),
      variant: i.variant,
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: Number(p.amount),
      status: p.status,
      reference: p.reference,
      isSimulated: p.isSimulated,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    })),
    user: order.user
      ? {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
          role: order.user.role,
          ordersCount: order.user._count?.orders ?? 0,
        }
      : null,
  };

  const serializedAuditLogs = auditLogs.map((a) => ({
    id: a.id,
    action: a.action,
    userEmail: a.userEmail,
    details: a.details,
    createdAt: a.createdAt.toISOString(),
  }));

  return { order: serializedOrder, auditLogs: serializedAuditLogs };
}

/**
 * Confirm Vault QC & Authenticity Inspection (Stage 4 / Transition Table)
 * Moves PAID (online) or PENDING (COD) order to PROCESSING status.
 * Rejects skipped or invalid transitions.
 */
export async function confirmOrderQcAction(orderInput: string | { orderId: string; notes?: string }) {
  const caller = await verifyAdminSession("order:update-status");
  const orderId = typeof orderInput === "string" ? orderInput : orderInput.orderId;
  const notes = typeof orderInput === "string" ? undefined : orderInput.notes;

  try {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
      },
    });

    if (!existing) {
      return { error: "Order not found." };
    }

    const check = validateStatusTransition(
      existing.status,
      OrderStatus.PROCESSING,
      existing.paymentMethod
    );
    if (!check.allowed) {
      return { error: check.reason || "Order cannot transition to QC Processing." };
    }

    const now = new Date();
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PROCESSING,
        qcVerifiedAt: now,
        qcVerifiedById: caller.id, // User ID snapshot (User Constraint #13)
        ...(notes ? { notes } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "ORDER_QC_CONFIRMED",
        entityType: "Order",
        entityId: orderId,
        details: {
          orderNumber: existing.orderNumber,
          previousStatus: existing.status,
          newStatus: OrderStatus.PROCESSING,
          qcVerifiedById: caller.id,
          notes: notes || null,
        },
      },
    });

    safeRevalidatePath("/admin/orders");
    safeRevalidatePath(`/admin/orders/${orderId}`);
    safeRevalidatePath("/account/orders");
    safeRevalidatePath(`/account/orders/${orderId}`);

    return { success: true, orderId: updated.id, status: updated.status };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to confirm QC.";
    return { error: msg };
  }
}

const updateStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID required"),
  status: z.enum([
    "PENDING",
    "PROCESSING",
    "PAID",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
  notes: z.string().max(500).optional(),
});

/**
 * Update order status with server-enforced transition matrix (User Constraint #3)
 */
export async function updateOrderStatusAction(input: z.infer<typeof updateStatusSchema>) {
  const caller = await verifyAdminSession("order:update-status");

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  const { orderId, status, notes } = parsed.data;

  try {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryMethod: true,
        paymentMethod: true,
        paymentStatus: true,
        totalAmount: true,
      },
    });

    if (!existing) {
      return { error: "Order not found." };
    }

    if (existing.status === OrderStatus.CANCELLED) {
      return { error: "Cannot update status of a cancelled order." };
    }

    // Server-enforced transition validation: reject skipped or backward transitions
    const transitionCheck = validateStatusTransition(
      existing.status,
      status as OrderStatus,
      existing.paymentMethod
    );
    if (!transitionCheck.allowed) {
      return { error: transitionCheck.reason || "Invalid status transition." };
    }

    const settings = await getStoreSettings();
    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = { status: status as OrderStatus };

    if (status === "SHIPPED") {
      updateData.shippedAt = now;
    } else if (status === "DELIVERED") {
      updateData.deliveredAt = now;
      updateData.autoCompleteAt = new Date(now.getTime() + (settings.autoCompleteDays || 3) * 86400000);
      if (existing.paymentMethod === PaymentMethod.COD) {
        updateData.paymentStatus = PaymentStatus.PAID;
        updateData.paidAt = now;
      }
    } else if (status === "PAID") {
      updateData.paymentStatus = PaymentStatus.PAID;
      updateData.paidAt = now;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      // Settle COD payment ledger entry at delivery
      if (status === "DELIVERED" && existing.paymentMethod === PaymentMethod.COD) {
        await tx.payment.upsert({
          where: {
            orderId_method: {
              orderId: existing.id,
              method: PaymentMethod.COD,
            },
          },
          update: {
            status: PaymentStatus.PAID,
            paidAt: now,
            verifiedById: caller.id,
          },
          create: {
            orderId: existing.id,
            method: PaymentMethod.COD,
            amount: existing.totalAmount,
            status: PaymentStatus.PAID,
            reference: `COD-${existing.orderNumber}`,
            isSimulated: false,
            paidAt: now,
            verifiedById: caller.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: caller.id,
          userEmail: caller.email,
          action: "ORDER_STATUS_UPDATED",
          entityType: "Order",
          entityId: orderId,
          details: {
            orderNumber: existing.orderNumber,
            previousStatus: existing.status,
            newStatus: status,
            notes: notes || null,
          },
        },
      });

      return res;
    });

    safeRevalidatePath("/admin/orders");
    safeRevalidatePath(`/admin/orders/${orderId}`);
    safeRevalidatePath("/account/orders");
    safeRevalidatePath(`/account/orders/${orderId}`);

    return { success: true, orderId: updated.id, status: updated.status };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update order status.";
    return { error: msg };
  }
}

const markDeliveredSchema = z.object({
  orderId: z.string().min(1, "Order ID required"),
  pin: z.string().optional(),
  adminOverrideReason: z.string().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Mark Order Delivered with Delivery Security PIN Verification (User Constraint #5)
 * Handles PIN check, 5-attempt limit, AuditLog on failures, and Admin override with required reason.
 */
export async function markOrderDeliveredAction(input: z.infer<typeof markDeliveredSchema>) {
  const caller = await verifyAdminSession("order:update-status");

  const parsed = markDeliveredSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  const { orderId, pin, adminOverrideReason, notes } = parsed.data;

  try {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryMethod: true,
        deliveryPin: true,
        deliveryPinAttempts: true,
        paymentMethod: true,
        paymentStatus: true,
        totalAmount: true,
      },
    });

    if (!existing) {
      return { error: "Order not found." };
    }

    const check = validateStatusTransition(
      existing.status,
      OrderStatus.DELIVERED,
      existing.paymentMethod
    );
    if (!check.allowed) {
      return { error: check.reason || "Order cannot be marked delivered." };
    }

    // Local Delivery PIN Verification
    if (existing.deliveryMethod === DeliveryMethod.LOCAL_DELIVERY) {
      if (adminOverrideReason && adminOverrideReason.trim().length > 0) {
        if (caller.role !== Role.ADMIN) {
          return { error: "Only an Administrator can override delivery PIN verification." };
        }
        if (adminOverrideReason.trim().length < 5) {
          return { error: "Admin override requires a documented reason (at least 5 characters)." };
        }
        await prisma.auditLog.create({
          data: {
            userId: caller.id,
            userEmail: caller.email,
            action: "DELIVERY_PIN_OVERRIDDEN",
            entityType: "Order",
            entityId: orderId,
            details: {
              orderNumber: existing.orderNumber,
              reason: adminOverrideReason.trim(),
            },
          },
        });
      } else {
        if (existing.deliveryPinAttempts >= 5) {
          return {
            error: "Maximum PIN verification attempts exceeded (5/5). Admin override is required to complete delivery.",
          };
        }

        if (!pin || pin.trim() !== existing.deliveryPin) {
          await prisma.order.update({
            where: { id: orderId },
            data: { deliveryPinAttempts: { increment: 1 } },
          });
          await prisma.auditLog.create({
            data: {
              userId: caller.id,
              userEmail: caller.email,
              action: "DELIVERY_PIN_FAILED",
              entityType: "Order",
              entityId: orderId,
              details: {
                orderNumber: existing.orderNumber,
                attemptNumber: existing.deliveryPinAttempts + 1,
              },
            },
          });
          return {
            error: `Invalid delivery PIN (attempt ${existing.deliveryPinAttempts + 1}/5). Please verify with the recipient.`,
          };
        }
      }
    }

    const settings = await getStoreSettings();
    const now = new Date();
    const autoCompleteAt = new Date(now.getTime() + (settings.autoCompleteDays || 3) * 86400000);

    const updated = await prisma.$transaction(async (tx) => {
      const isCod = existing.paymentMethod === PaymentMethod.COD;
      const updateData: Prisma.OrderUpdateInput = {
        status: OrderStatus.DELIVERED,
        deliveredAt: now,
        autoCompleteAt,
      };

      if (notes) {
        updateData.notes = notes;
      }

      if (isCod) {
        updateData.paymentStatus = PaymentStatus.PAID;
        updateData.paidAt = now;

        await tx.payment.upsert({
          where: {
            orderId_method: {
              orderId: existing.id,
              method: PaymentMethod.COD,
            },
          },
          update: {
            status: PaymentStatus.PAID,
            paidAt: now,
            verifiedById: caller.id,
          },
          create: {
            orderId: existing.id,
            method: PaymentMethod.COD,
            amount: existing.totalAmount,
            status: PaymentStatus.PAID,
            reference: `COD-${existing.orderNumber}`,
            isSimulated: false,
            paidAt: now,
            verifiedById: caller.id,
          },
        });
      }

      const orderRes = await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          userId: caller.id,
          userEmail: caller.email,
          action: "ORDER_DELIVERED",
          entityType: "Order",
          entityId: orderId,
          details: {
            orderNumber: existing.orderNumber,
            deliveryMethod: existing.deliveryMethod,
            isCod,
            notes: notes || null,
          },
        },
      });

      return orderRes;
    });

    safeRevalidatePath("/admin/orders");
    safeRevalidatePath(`/admin/orders/${orderId}`);
    safeRevalidatePath("/account/orders");
    safeRevalidatePath(`/account/orders/${orderId}`);

    return { success: true, orderId: updated.id, status: updated.status };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark order delivered.";
    return { error: msg };
  }
}

const updateTrackingSchema = z.object({
  orderId: z.string().min(1, "Order ID required"),
  shippingCarrier: z.string().min(2, "Carrier name required"),
  trackingNumber: z.string().min(3, "Tracking number required"),
  markShipped: z.boolean().default(true),
  notes: z.string().max(500).optional(),
});

/**
 * Assign courier and tracking number to order (auto-transitions to SHIPPED if markShipped=true)
 */
export async function updateOrderTrackingAction(input: z.infer<typeof updateTrackingSchema>) {
  const caller = await verifyAdminSession("order:update-status");

  const parsed = updateTrackingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid tracking details." };
  }

  const { orderId, shippingCarrier, trackingNumber, markShipped, notes } = parsed.data;

  try {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, status: true, paymentMethod: true },
    });

    if (!existing) {
      return { error: "Order not found." };
    }

    const updateData: Prisma.OrderUpdateInput = {
      shippingCarrier: shippingCarrier.trim(),
      trackingNumber: trackingNumber.trim(),
    };

    if (markShipped && existing.status !== OrderStatus.SHIPPED && existing.status !== OrderStatus.DELIVERED) {
      const check = validateStatusTransition(
        existing.status,
        OrderStatus.SHIPPED,
        existing.paymentMethod
      );
      if (!check.allowed) {
        return { error: check.reason || "Authentication & QC must be completed before shipping." };
      }
      updateData.status = OrderStatus.SHIPPED;
      updateData.shippedAt = new Date();
    }

    if (notes) {
      updateData.notes = notes;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "ORDER_TRACKING_UPDATED",
        entityType: "Order",
        entityId: orderId,
        details: {
          orderNumber: existing.orderNumber,
          shippingCarrier,
          trackingNumber,
          status: updated.status,
        },
      },
    });

    safeRevalidatePath("/admin/orders");
    safeRevalidatePath(`/admin/orders/${orderId}`);
    safeRevalidatePath("/account/orders");
    safeRevalidatePath(`/account/orders/${orderId}`);

    return { success: true, orderId: updated.id, status: updated.status };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update tracking.";
    return { error: msg };
  }
}

/**
 * Admin Cancel Order Action
 * Atomically releases 1-of-1 sneakers and restocks batch inventory with stock adjustments and audit trail.
 */
export async function cancelOrderAdminAction(orderId: string, reason: string) {
  const caller = await verifyAdminSession("order:cancel");

  if (!reason || reason.trim().length < 3) {
    return { error: "Please provide a valid cancellation reason." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
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
        throw new Error("Order not found.");
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new Error("Order is already cancelled.");
      }

      if (order.status === OrderStatus.DELIVERED) {
        throw new Error("Cannot cancel an order that has already been delivered.");
      }

      // Restock all items
      for (const item of order.items) {
        if (!item.variantId || !item.variant) continue;
        const v = item.variant;

        if (v.isOneOfOne) {
          // Release 1-of-1 sneaker back to available
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              isSold: false,
              stockQty: 1,
              reservedUntil: null,
              reservedBy: null,
            },
          });
        } else {
          // Increment batch stock
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              stockQty: { increment: item.quantity },
            },
          });
        }

        // Traceable stock adjustment
        await tx.stockAdjustment.create({
          data: {
            variantId: v.id,
            userId: caller.id,
            delta: item.quantity,
            reason: StockAdjustmentReason.RESTOCK,
            notes: `Restocked via admin cancellation of Order ${order.orderNumber}: ${reason.trim()}`,
          },
        });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          paymentStatus:
            order.paymentStatus === PaymentStatus.PAID
              ? PaymentStatus.REFUNDED
              : order.paymentStatus,
          notes: `Cancelled by admin (${caller.email}): ${reason.trim()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: caller.id,
          userEmail: caller.email,
          action: "ORDER_CANCELLED",
          entityType: "Order",
          entityId: orderId,
          details: {
            orderNumber: order.orderNumber,
            reason: reason.trim(),
            restockedItems: order.items.map((i) => ({
              variantId: i.variantId,
              title: i.productTitle,
              qty: i.quantity,
            })),
          },
        },
      });

      return updated;
    });

    safeRevalidatePath("/admin/orders");
    safeRevalidatePath(`/admin/orders/${orderId}`);
    safeRevalidatePath("/admin/products");
    safeRevalidatePath("/account/orders");
    safeRevalidatePath(`/account/orders/${orderId}`);
    safeRevalidatePath("/products");

    return { success: true, orderId: result.id, status: result.status };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to cancel order.";
    return { error: msg };
  }
}
