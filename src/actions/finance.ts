"use server";

import prisma from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin-auth";
import { PaymentStatus, OrderStatus, PaymentMethod, DeliveryMethod } from "@prisma/client";

export interface SerializedFinanceLedgerItem {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  deliveryMethod: string;
  amount: number;
  shippingFee: number;
  status: string;
  paymentStatus: string;
  isSimulated: boolean;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface FinanceOverviewData {
  metrics: {
    totalRevenue: number;
    totalOrdersCount: number;
    paidOrdersCount: number;
    netProfit: number;
    grossMarginPercent: number;
    averageOrderValue: number;
    totalShippingCollected: number;
    pendingRevenue: number;
    codCashInTransit: number;
    codCashCollected: number;
  };
  paymentMethodBreakdown: {
    method: string;
    label: string;
    count: number;
    totalAmount: number;
    percentage: number;
  }[];
  deliveryMethodBreakdown: {
    method: string;
    label: string;
    count: number;
    totalAmount: number;
  }[];
  ledger: SerializedFinanceLedgerItem[];
}

const PAYMENT_LABELS: Record<string, string> = {
  COD: "Cash on Delivery",
  GCASH: "GCash QR / Transfer",
  PAYMAYA: "Maya Wallet",
  CARD: "Credit / Debit Card",
  MANUAL_TRANSFER: "Bank / GCash Deposit",
  TEST: "Simulation Sandbox",
};

const DELIVERY_LABELS: Record<string, string> = {
  LOCAL_EXPRESS: "NCR Local Express",
  VAULT_PICKUP: "BGC Self-Pickup",
  COURIER_NATIONWIDE: "Nationwide Courier",
};

export async function getFinanceDataAction(
  options: { includeSimulated?: boolean } = { includeSimulated: true }
): Promise<{ data?: FinanceOverviewData; error?: string }> {
  try {
    await verifyAdminSession("finance:view");

    const includeSimulated = options.includeSimulated ?? true;

    // Fetch orders with items and payments
    const orders = await prisma.order.findMany({
      where: includeSimulated ? {} : { isSimulated: false },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let totalRevenue = 0;
    let paidOrdersCount = 0;
    let totalShippingCollected = 0;
    let pendingRevenue = 0;
    let totalCostOfGoods = 0;
    let codCashInTransit = 0;
    let codCashCollected = 0;

    const paymentTotals: Record<string, { count: number; totalAmount: number }> = {};
    const deliveryTotals: Record<string, { count: number; totalAmount: number }> = {};

    const ledger: SerializedFinanceLedgerItem[] = [];

    for (const order of orders) {
      const orderTotal = Number(order.totalAmount);
      const shipping = Number(order.shippingFee);
      const isPaid = order.paymentStatus === PaymentStatus.PAID;
      const isCancelled = order.status === OrderStatus.CANCELLED;

      // Track delivery breakdown
      const delKey = order.deliveryMethod;
      if (!deliveryTotals[delKey]) {
        deliveryTotals[delKey] = { count: 0, totalAmount: 0 };
      }
      deliveryTotals[delKey].count += 1;
      deliveryTotals[delKey].totalAmount += orderTotal;

      // Track payment breakdown
      const payKey = order.paymentMethod;
      if (!paymentTotals[payKey]) {
        paymentTotals[payKey] = { count: 0, totalAmount: 0 };
      }
      paymentTotals[payKey].count += 1;
      paymentTotals[payKey].totalAmount += orderTotal;

      if (!isCancelled) {
        if (isPaid) {
          totalRevenue += orderTotal;
          paidOrdersCount += 1;
          totalShippingCollected += shipping;

          // Compute cost of items sold
          for (const item of order.items) {
            const cost = item.unitCost ? Number(item.unitCost) : 0;
            totalCostOfGoods += cost * item.quantity;
          }
        } else {
          pendingRevenue += orderTotal;
        }

        // COD Pipeline
        if (order.paymentMethod === PaymentMethod.COD) {
          if (order.status === OrderStatus.DELIVERED || order.paymentStatus === PaymentStatus.PAID) {
            codCashCollected += orderTotal;
          } else if (order.status === OrderStatus.SHIPPED) {
            codCashInTransit += orderTotal;
          }
        }
      }

      // Ledger item
      ledger.push({
        id: order.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        paymentMethod: order.paymentMethod,
        deliveryMethod: order.deliveryMethod,
        amount: orderTotal,
        shippingFee: shipping,
        status: order.status,
        paymentStatus: order.paymentStatus,
        isSimulated: order.isSimulated,
        reference: order.paymentReference || null,
        paidAt: order.paidAt ? order.paidAt.toISOString() : null,
        createdAt: order.createdAt.toISOString(),
      });
    }

    const netProfit = Math.max(0, totalRevenue - totalCostOfGoods);
    const grossMarginPercent =
      totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;
    const averageOrderValue =
      paidOrdersCount > 0 ? Math.round((totalRevenue / paidOrdersCount) * 100) / 100 : 0;

    const paymentMethodBreakdown = Object.entries(paymentTotals).map(([method, data]) => ({
      method,
      label: PAYMENT_LABELS[method] || method,
      count: data.count,
      totalAmount: data.totalAmount,
      percentage: totalRevenue > 0 ? Math.round((data.totalAmount / (totalRevenue + pendingRevenue)) * 100) : 0,
    }));

    const deliveryMethodBreakdown = Object.entries(deliveryTotals).map(([method, data]) => ({
      method,
      label: DELIVERY_LABELS[method] || method,
      count: data.count,
      totalAmount: data.totalAmount,
    }));

    return {
      data: {
        metrics: {
          totalRevenue,
          totalOrdersCount: orders.length,
          paidOrdersCount,
          netProfit,
          grossMarginPercent,
          averageOrderValue,
          totalShippingCollected,
          pendingRevenue,
          codCashInTransit,
          codCashCollected,
        },
        paymentMethodBreakdown,
        deliveryMethodBreakdown,
        ledger,
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to retrieve finance data.";
    return { error: msg };
  }
}

/**
 * Admin Action: Reconcile / Remit Courier COD Cash to Vault
 */
export async function reconcileCodPaymentAction(
  orderId: string,
  remittanceRef?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const caller = await verifyAdminSession("finance:view");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { error: "Order not found." };
    }

    if (order.paymentMethod !== PaymentMethod.COD) {
      return { error: "Order is not a Cash on Delivery order." };
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      return { error: "This order is already marked as settled/paid." };
    }

    const ref = remittanceRef?.trim() || `COD-REMIT-${Date.now()}`;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
        paymentReference: ref,
      },
    });

    await prisma.payment.upsert({
      where: {
        orderId_method: {
          orderId,
          method: PaymentMethod.COD,
        },
      },
      create: {
        orderId,
        method: PaymentMethod.COD,
        amount: order.totalAmount,
        status: PaymentStatus.PAID,
        reference: ref,
        isSimulated: order.isSimulated,
        paidAt: new Date(),
        verifiedById: caller.id,
      },
      update: {
        status: PaymentStatus.PAID,
        reference: ref,
        paidAt: new Date(),
        verifiedById: caller.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "COD_REMITTANCE_SETTLED",
        entityType: "Order",
        entityId: orderId,
        details: {
          orderNumber: order.orderNumber,
          amount: Number(order.totalAmount),
          reference: ref,
          settledBy: caller.email,
        },
      },
    });

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to reconcile COD payment.";
    return { error: msg };
  }
}
