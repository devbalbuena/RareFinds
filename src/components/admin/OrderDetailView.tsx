"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Package,
  User,
  MapPin,
  CreditCard,
  ExternalLink,
  Loader2,
  Calendar,
  Sparkles,
  History,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  updateOrderStatusAction,
  updateOrderTrackingAction,
  cancelOrderAdminAction,
  SerializedAdminOrder,
} from "@/actions/admin-orders";
import { OrderStatus } from "@prisma/client";

interface SerializedAuditLog {
  id: string;
  action: string;
  userEmail: string;
  details: unknown;
  createdAt: string;
}

interface OrderDetailViewProps {
  order: SerializedAdminOrder;
  auditLogs?: SerializedAuditLog[];
  storeConfig: {
    storeName: string;
    storeTagline: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    currencySymbol: string;
  };
}

const CARRIER_OPTIONS = [
  "LBC Express",
  "J&T Express",
  "2GO Express",
  "DHL Express",
  "FedEx",
  "Grab Express",
  "Ninja Van",
  "Flash Express",
  "RareFinds Vault Courier",
];

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badgeClass: string; desc: string }
> = {
  PENDING_PAYMENT: {
    label: "Pending Payment",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    desc: "Awaiting customer payment confirmation.",
  },
  PENDING: {
    label: "Pending",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    desc: "Order placed and waiting for fulfillment confirmation.",
  },
  PROCESSING: {
    label: "Processing",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    desc: "Items are being retrieved from the vault and authenticated.",
  },
  PAID: {
    label: "Paid",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    desc: "Payment has been settled.",
  },
  SHIPPED: {
    label: "Shipped",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    desc: "Order is in transit with designated courier.",
  },
  DELIVERED: {
    label: "Delivered",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    desc: "Package safely handed to the buyer.",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
    desc: "Order cancelled and items returned to stock inventory.",
  },
  EXPIRED: {
    label: "Expired",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    desc: "Reservation timer expired before payment.",
  },
};

type ValidAdminTargetStatus = "PENDING" | "PROCESSING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export function OrderDetailView({
  order,
  auditLogs = [],
  storeConfig,
}: OrderDetailViewProps) {
  const router = useRouter();

  // Local state for modals & feedback
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState<ValidAdminTargetStatus>(
    (order.status === "PENDING_PAYMENT" || order.status === "EXPIRED")
      ? "PENDING"
      : (order.status as ValidAdminTargetStatus)
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Tracking Modal State
  const [isTrackingModalOpen, setIsTrackingModalOpen] = React.useState(false);
  const [carrier, setCarrier] = React.useState(order.shippingCarrier || "LBC Express");
  const [trackingNumber, setTrackingNumber] = React.useState(order.trackingNumber || "");
  const [markShippedOnTracking, setMarkShippedOnTracking] = React.useState(
    order.status !== "SHIPPED" && order.status !== "DELIVERED"
  );
  const [isUpdatingTracking, setIsUpdatingTracking] = React.useState(false);

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("Customer requested cancellation");
  const [isCancelling, setIsCancelling] = React.useState(false);

  const statusInfo = ORDER_STATUS_CONFIG[order.status] || {
    label: order.status,
    badgeClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
    desc: "",
  };

  // Derive fulfillment journey timeline
  const isDelivered = order.status === "DELIVERED";
  const isShipped = order.status === "SHIPPED" || isDelivered;
  const isProcessing =
    order.status === "PROCESSING" ||
    order.status === "PAID" ||
    isShipped;
  const isCancelled = order.status === "CANCELLED";

  const timeline = [
    {
      title: "Order Placed",
      description: "Order received in system.",
      date: order.createdAt,
      completed: true,
      current: order.status === "PENDING" || order.status === "PENDING_PAYMENT",
    },
    {
      title: "Processing & QC",
      description: order.paymentStatus === "PAID" ? "Payment secured & QC verified" : "Awaiting vault authentication",
      date: order.paidAt || (isProcessing ? order.updatedAt : null),
      completed: isProcessing,
      current: order.status === "PROCESSING" || order.status === "PAID",
    },
    {
      title: "Dispatched",
      description: order.shippingCarrier
        ? `${order.shippingCarrier} (${order.trackingNumber || "Assigned"})`
        : "Pending courier pickup",
      date: order.shippedAt,
      completed: isShipped,
      current: order.status === "SHIPPED",
    },
    {
      title: isCancelled ? "Order Cancelled" : "Delivered",
      description: isCancelled
        ? "Items returned to inventory"
        : isDelivered
        ? "Package handed over to recipient"
        : "Final destination delivery",
      date: isCancelled ? order.cancelledAt : order.deliveredAt,
      completed: isDelivered || isCancelled,
      current: isDelivered || isCancelled,
      isCancelled,
    },
  ];

  // Helper for tracking links
  function getTrackingUrl(c: string | null, num: string | null) {
    if (!c || !num) return null;
    const lower = c.toLowerCase();
    if (lower.includes("lbc")) {
      return `https://www.lbcexpress.com/track/?tracking_no=${encodeURIComponent(num)}`;
    }
    if (lower.includes("j&t") || lower.includes("jt")) {
      return `https://www.jtexpress.ph/index/query/gzquery.html?bills=${encodeURIComponent(num)}`;
    }
    if (lower.includes("2go")) {
      return `https://supplychain.2go.com.ph/track/track.asp?tin=${encodeURIComponent(num)}`;
    }
    if (lower.includes("dhl")) {
      return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(num)}`;
    }
    if (lower.includes("ninja")) {
      return `https://www.ninjavan.co/en-ph/tracking?id=${encodeURIComponent(num)}`;
    }
    return null;
  }

  const trackingUrl = getTrackingUrl(order.shippingCarrier, order.trackingNumber);

  // Action handlers
  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingStatus(true);
    setFeedback(null);

    const res = await updateOrderStatusAction({
      orderId: order.id,
      status: newStatus,
    });

    setIsUpdatingStatus(false);
    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setIsStatusModalOpen(false);
      setFeedback({ type: "success", message: `Order status updated to ${newStatus}` });
      router.refresh();
    }
  }

  async function handleTrackingUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setFeedback({ type: "error", message: "Please provide a valid tracking number." });
      return;
    }

    setIsUpdatingTracking(true);
    setFeedback(null);

    const res = await updateOrderTrackingAction({
      orderId: order.id,
      shippingCarrier: carrier,
      trackingNumber: trackingNumber.trim(),
      markShipped: markShippedOnTracking,
    });

    setIsUpdatingTracking(false);
    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setIsTrackingModalOpen(false);
      setFeedback({
        type: "success",
        message: `Courier tracking updated for ${carrier}: ${trackingNumber}`,
      });
      router.refresh();
    }
  }

  async function handleCancelOrder(e: React.FormEvent) {
    e.preventDefault();
    setIsCancelling(true);
    setFeedback(null);

    const res = await cancelOrderAdminAction(order.id, cancelReason);

    setIsCancelling(false);
    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setIsCancelModalOpen(false);
      setFeedback({
        type: "success",
        message: "Order has been cancelled and items returned to stock inventory.",
      });
      router.refresh();
    }
  }

  return (
    <>
      {/* ── PRINT-ONLY PACKING SLIP / INVOICE ─────────────────── */}
      <div className="hidden print:block font-sans text-black p-8 bg-white max-w-4xl mx-auto">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { margin: 12mm; }
              body { background: #fff !important; color: #000 !important; }
              nav, aside, header, footer, button, .no-print { display: none !important; }
            }
          `
        }} />

        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">
              {storeConfig.storeName}
            </h1>
            <p className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">
              {storeConfig.storeTagline}
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              {storeConfig.address} • {storeConfig.contactEmail} • {storeConfig.contactPhone}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-wider mb-2">
              Official Packing Slip & Invoice
            </span>
            <div className="text-lg font-mono font-bold">{order.orderNumber}</div>
            <div className="text-xs text-zinc-500">
              Date: {new Date(order.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="text-xs font-medium uppercase mt-1">
              Payment: {order.paymentMethod} • <span className="font-bold">{order.paymentStatus}</span>
            </div>
          </div>
        </div>

        {/* Shipping & Customer Details */}
        <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-zinc-200 text-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Ship To Recipient
            </h3>
            <div className="font-bold text-base">{order.shippingAddress.fullName}</div>
            <div className="text-zinc-700">{order.shippingAddress.phone}</div>
            <div className="text-zinc-700 mt-1">{order.shippingAddress.street}</div>
            {order.shippingAddress.apartment && (
              <div className="text-zinc-700">{order.shippingAddress.apartment}</div>
            )}
            <div className="text-zinc-700">
              {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
              {order.shippingAddress.postalCode}
            </div>
            <div className="text-zinc-700">{order.shippingAddress.country}</div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Fulfillment & Courier
            </h3>
            <div>
              <span className="text-zinc-500">Carrier:</span>{" "}
              <span className="font-semibold">{order.shippingCarrier || "Pending Assignment"}</span>
            </div>
            <div>
              <span className="text-zinc-500">Tracking #:</span>{" "}
              <span className="font-mono font-bold">{order.trackingNumber || "N/A"}</span>
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Customer Account: {order.customerEmail}
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-200">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                QC & Pack Checklist
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-zinc-600">
                <div>[ &nbsp; ] Authenticity Verified</div>
                <div>[ &nbsp; ] Vault Seal Attached</div>
                <div>[ &nbsp; ] Packed with Bubble wrap</div>
                <div>[ &nbsp; ] Courier Bagged</div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left text-sm mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-xs uppercase tracking-wider">
              <th className="py-2">Item Description</th>
              <th className="py-2">Variant</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {order.items.map((item) => (
              <tr key={item.id} className="py-3">
                <td className="py-3 pr-4">
                  <div className="font-bold">{item.productTitle}</div>
                  {item.variant?.isOneOfOne && (
                    <div className="text-[10px] uppercase font-bold text-zinc-800">
                      ★ 1-of-1 Vault Grail Specimen
                    </div>
                  )}
                </td>
                <td className="py-3 text-xs text-zinc-700">
                  {item.variantDetails || (item.variant ? `Size: ${item.variant.size}` : "Standard")}
                </td>
                <td className="py-3 text-center font-medium">{item.quantity}</td>
                <td className="py-3 text-right font-mono">
                  {formatPrice(item.unitPrice, storeConfig.currencySymbol)}
                </td>
                <td className="py-3 text-right font-mono font-bold">
                  {formatPrice(item.subtotal, storeConfig.currencySymbol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Totals */}
        <div className="flex justify-end pt-4 border-t-2 border-black mb-8">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between py-1 text-zinc-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatPrice(order.subtotal, storeConfig.currencySymbol)}</span>
            </div>
            <div className="flex justify-between py-1 text-zinc-600">
              <span>Shipping Fee:</span>
              <span className="font-mono">
                {order.shippingFee === 0 ? "FREE" : formatPrice(order.shippingFee, storeConfig.currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t border-black font-bold text-base">
              <span>Total Amount:</span>
              <span className="font-mono">{formatPrice(order.totalAmount, storeConfig.currencySymbol)}</span>
            </div>
          </div>
        </div>

        {/* Authenticity Certificate Note */}
        <div className="border border-zinc-300 rounded p-4 text-center text-xs text-zinc-600">
          <p className="font-bold uppercase tracking-wider text-black mb-1">
            RareFinds Vault Authenticity Guarantee
          </p>
          <p>
            Every artifact dispatched from RareFinds has undergone rigorous multi-point verification
            by our curators. All original seals and holographic tags must remain intact for inquiries.
          </p>
        </div>
      </div>

      {/* ── SCREEN INTERFACE (INTERACTIVE ADMIN VIEW) ────────────────────────── */}
      <div className="print:hidden p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
              title="Back to Orders List"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold font-mono tracking-tight text-white">
                  {order.orderNumber}
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusInfo.badgeClass}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Placed on{" "}
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-850 hover:text-white hover:border-zinc-700 transition"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              Print Packing Slip & Invoice
            </button>

            {order.status !== "CANCELLED" && (
              <>
                <button
                  onClick={() => setIsTrackingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition"
                >
                  <Truck className="w-3.5 h-3.5" />
                  {order.shippingCarrier ? "Update Courier" : "Assign Courier"}
                </button>

                <button
                  onClick={() => {
                    setIsStatusModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition"
                >
                  Change Status
                </button>

                {order.status !== "DELIVERED" && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel Order
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Feedback alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
              feedback.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── FULFILLMENT TIMELINE ────────────────────────────────────────── */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Fulfillment Journey
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {timeline.map((step, idx) => (
              <div
                key={idx}
                className={`relative p-4 rounded-xl border ${
                  step.isCancelled
                    ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                    : step.completed
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                    : step.current
                    ? "bg-amber-950/20 border-amber-500/40 text-amber-200"
                    : "bg-zinc-900/40 border-zinc-800/60 text-zinc-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">
                    Step 0{idx + 1}
                  </span>
                  {step.isCancelled ? (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  ) : step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : step.current ? (
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-700" />
                  )}
                </div>
                <div className="font-semibold text-sm text-zinc-200">{step.title}</div>
                <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {step.description}
                </div>
                {step.date && (
                  <div className="text-[11px] font-mono text-zinc-500 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(step.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 2-COLUMN MAIN CONTENT ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Ordered Items & Vault Disclosures (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Card */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-zinc-200">
                    Order Items ({order.items.length})
                  </h2>
                </div>
                <span className="text-xs text-zinc-400">
                  {order.items.reduce((acc, i) => acc + i.quantity, 0)} total units
                </span>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {order.items.map((item) => (
                  <div key={item.id} className="p-5 flex gap-4 items-start hover:bg-zinc-850/20 transition">
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0">
                      {item.productImageUrl ? (
                        <Image
                          src={item.productImageUrl}
                          alt={item.productTitle}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm text-zinc-100 hover:text-amber-400 transition">
                            {item.productTitle}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {item.variantDetails && (
                              <span className="text-[11px] text-zinc-300 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/50">
                                {item.variantDetails}
                              </span>
                            )}
                            {item.variant?.condition && (
                              <span className="text-[11px] text-zinc-400">
                                Condition: {item.variant.condition}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="text-right shrink-0">
                          <div className="font-mono font-semibold text-sm text-zinc-100">
                            {formatPrice(item.subtotal, storeConfig.currencySymbol)}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono mt-0.5">
                            {item.quantity} × {formatPrice(item.unitPrice, storeConfig.currencySymbol)}
                          </div>
                        </div>
                      </div>

                      {/* 1-of-1 Vault Disclosure */}
                      {item.variant?.isOneOfOne && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-semibold">Vault Certified 1-of-1:</span>
                          <span className="text-amber-400/80">
                            Single-specimen artifact locked and serialized in vault.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Financial Totals */}
              <div className="p-5 bg-zinc-950/40 border-t border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-300">
                    {formatPrice(order.subtotal, storeConfig.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Shipping Fee</span>
                  <span className="font-mono text-zinc-300">
                    {order.shippingFee === 0
                      ? "FREE"
                      : formatPrice(order.shippingFee, storeConfig.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-zinc-100 pt-2 border-t border-zinc-800/80">
                  <span>Grand Total</span>
                  <span className="font-mono text-amber-400 text-base">
                    {formatPrice(order.totalAmount, storeConfig.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>

            {/* Courier Tracking Dispatch Card */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-zinc-200">
                    Courier Dispatch & Waybill
                  </h2>
                </div>
                <button
                  onClick={() => setIsTrackingModalOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  Edit Courier Details
                </button>
              </div>

              {order.shippingCarrier && order.trackingNumber ? (
                <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-zinc-400">Designated Carrier</div>
                    <div className="font-semibold text-sm text-zinc-100">
                      {order.shippingCarrier}
                    </div>
                    <div className="font-mono text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 inline-block mt-1">
                      Tracking: {order.trackingNumber}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {trackingUrl ? (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Track with Carrier
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-500">
                        Carrier portal link available on tracking code
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl p-6 text-center">
                  <p className="text-xs text-zinc-400 mb-3">
                    No courier has been assigned to this order yet.
                  </p>
                  <button
                    onClick={() => setIsTrackingModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Assign Courier & Waybill
                  </button>
                </div>
              )}
            </div>

            {/* Audit Trail for Order */}
            {auditLogs.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-zinc-400" />
                  <h2 className="text-sm font-semibold text-zinc-200">
                    Order Audit Log History
                  </h2>
                </div>
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-xs bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                    >
                      <div>
                        <span className="font-mono font-medium text-amber-400">
                          {log.action}
                        </span>{" "}
                        <span className="text-zinc-400">by {log.userEmail}</span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Buyer & Shipping Address & Payment Card (1 col) */}
          <div className="space-y-6">
            {/* Buyer Contact Card */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <User className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Buyer Information</h2>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-zinc-500 block">Customer Name</span>
                  <span className="font-semibold text-zinc-200 text-sm">
                    {order.customerName}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 block">Email Address</span>
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="text-amber-400 hover:underline"
                  >
                    {order.customerEmail}
                  </a>
                </div>

                {order.customerPhone && (
                  <div>
                    <span className="text-zinc-500 block">Phone</span>
                    <span className="text-zinc-300">{order.customerPhone}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800/80">
                  <span className="text-zinc-500 block">Account Status</span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                      order.userId
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {order.userId ? "Registered Collector" : "Guest Checkout"}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Address Card */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Delivery Address</h2>
              </div>

              <div className="text-xs text-zinc-300 space-y-1">
                <div className="font-semibold text-sm text-zinc-100">
                  {order.shippingAddress.fullName}
                </div>
                <div className="text-zinc-400">{order.shippingAddress.phone}</div>
                <div className="pt-2 text-zinc-300">{order.shippingAddress.street}</div>
                {order.shippingAddress.apartment && (
                  <div className="text-zinc-400">{order.shippingAddress.apartment}</div>
                )}
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                  {order.shippingAddress.postalCode}
                </div>
                <div className="text-zinc-400">{order.shippingAddress.country}</div>
              </div>
            </div>

            {/* Payment Details Card */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Payment Status</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Method</span>
                  <span className="font-mono font-medium text-zinc-200">
                    {order.paymentMethod}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      order.paymentStatus === "PAID"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : order.paymentStatus === "FAILED"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>

                {order.paidAt && (
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800/80">
                    <span className="text-zinc-500">Settled On</span>
                    <span className="text-zinc-300">
                      {new Date(order.paidAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: UPDATE STATUS ────────────────────────────────────────── */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Update Order Status</h3>
            <p className="text-xs text-zinc-400">
              Moving order to <strong>SHIPPED</strong> records the shipping timestamp.
              Moving to <strong>DELIVERED</strong> completes the order and reconciles COD payment.
            </p>

            <form onSubmit={handleStatusUpdate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Select Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ValidAdminTargetStatus)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="PAID">PAID</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 text-xs rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 text-zinc-950 hover:bg-amber-400 flex items-center gap-1.5"
                >
                  {isUpdatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ASSIGN TRACKING ──────────────────────────────────────── */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Assign Courier & Tracking</h3>
            <p className="text-xs text-zinc-400">
              Tracking numbers are visible to customers on their order tracking timeline.
            </p>

            <form onSubmit={handleTrackingUpdate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Courier Carrier</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400"
                >
                  {CARRIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Waybill / Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1729-4820-XXXX"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="markShippedCheck"
                  checked={markShippedOnTracking}
                  onChange={(e) => setMarkShippedOnTracking(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-0 w-4 h-4"
                />
                <label htmlFor="markShippedCheck" className="text-xs text-zinc-300 cursor-pointer">
                  Automatically mark order as <strong>SHIPPED</strong> now
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTrackingModalOpen(false)}
                  disabled={isUpdatingTracking}
                  className="px-4 py-2 text-xs rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTracking}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-1.5"
                >
                  {isUpdatingTracking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CANCEL ORDER ─────────────────────────────────────────── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold">Cancel Order & Restore Inventory</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Cancelling will mark this order as <strong>CANCELLED</strong>, restore quantities to
              product inventory, and release 1-of-1 Vault items back to available status.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Cancellation Reason</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Provide reason for audit log..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isCancelling}
                  className="px-4 py-2 text-xs rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Keep Order Active
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-500 flex items-center gap-1.5"
                >
                  {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
