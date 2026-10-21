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
  ShieldCheck,
  KeyRound,
  Store,
  ShieldAlert,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  updateOrderStatusAction,
  updateOrderTrackingAction,
  cancelOrderAdminAction,
  confirmOrderQcAction,
  markOrderDeliveredAction,
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
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    desc: "Awaiting customer payment confirmation.",
  },
  PENDING: {
    label: "Pending Confirmation",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    desc: "Order placed and waiting for fulfillment confirmation.",
  },
  PROCESSING: {
    label: "Processing & QC",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    desc: "Items are being retrieved from the vault and authenticated.",
  },
  PAID: {
    label: "Paid",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    desc: "Payment has been settled.",
  },
  SHIPPED: {
    label: "Dispatched",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    desc: "Order is in transit with designated courier.",
  },
  DELIVERED: {
    label: "Delivered",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
    desc: "Package safely handed to the buyer.",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200",
    desc: "Order cancelled and items returned to stock inventory.",
  },
  EXPIRED: {
    label: "Expired",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
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

  // Delivery PIN Verification Modal State (for LOCAL_DELIVERY)
  const [isDeliveredModalOpen, setIsDeliveredModalOpen] = React.useState(false);
  const [enteredPin, setEnteredPin] = React.useState("");
  const [adminOverrideReason, setAdminOverrideReason] = React.useState("");
  const [isSubmittingDelivery, setIsSubmittingDelivery] = React.useState(false);

  const statusInfo = ORDER_STATUS_CONFIG[order.status] || {
    label: order.status,
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200",
    desc: "",
  };

  // Derive fulfillment journey timeline (5 Honest Steps)
  const isDelivered = order.status === "DELIVERED";
  const isShipped = order.status === "SHIPPED" || isDelivered;
  const isQcCompleted = Boolean(order.qcVerifiedAt) || order.status === "PROCESSING" || isShipped;
  const isCancelled = order.status === "CANCELLED";
  const isExpired = order.status === "EXPIRED";
  const isCod = order.paymentMethod === "COD";

  const timeline = [
    {
      step: 1,
      title: "Order Placed",
      description: "Order secured in vault system.",
      date: order.createdAt,
      completed: true,
      current: order.status === "PENDING" || order.status === "PENDING_PAYMENT",
    },
    {
      step: 2,
      title: isCod ? "Payment (COD)" : "Payment Confirmed",
      description: isCod
        ? isDelivered
          ? "Cash collected at delivery"
          : "Cash settles upon delivery inspection"
        : order.paymentStatus === "PAID"
        ? "Payment verified & holds cleared"
        : "Awaiting payment verification",
      date: order.paidAt,
      completed: isCod ? isDelivered : order.paymentStatus === "PAID",
      current: !isCod && order.status === "PENDING_PAYMENT",
    },
    {
      step: 3,
      title: "Authentication & QC",
      description: isQcCompleted
        ? `Inspected & sealed${order.qcVerifiedBy?.name ? ` by ${order.qcVerifiedBy.name}` : ""}`
        : "Pending staff authenticity inspection",
      date: order.qcVerifiedAt,
      completed: isQcCompleted,
      current:
        !isQcCompleted &&
        ((isCod && order.status === "PENDING") || (!isCod && (order.status === "PAID" || order.status === "PROCESSING"))),
    },
    {
      step: 4,
      title:
        order.deliveryMethod === "PICKUP"
          ? "Ready for Pickup"
          : order.deliveryMethod === "LOCAL_DELIVERY"
          ? "Local Rider Handover"
          : "Courier In Transit",
      description:
        order.deliveryMethod === "PICKUP"
          ? isShipped
            ? "Ready for claiming at the store vault"
            : "Preparing for store handover"
          : order.shippingCarrier
          ? `${order.shippingCarrier} (${order.trackingNumber || "Assigned"})`
          : "Pending courier dispatch",
      date: order.shippedAt,
      completed: isShipped,
      current: order.status === "SHIPPED",
    },
    {
      step: 5,
      title: isCancelled
        ? "Order Cancelled"
        : isExpired
        ? "Hold Expired"
        : order.deliveryMethod === "PICKUP"
        ? "Claimed at Vault"
        : "Delivered",
      description: isCancelled
        ? "Items returned to inventory"
        : isExpired
        ? "Hold timer expired"
        : isDelivered
        ? order.customerConfirmedAt
          ? "Delivered & customer confirmed"
          : "Package handed over to recipient"
        : "Final destination handover",
      date: isCancelled ? order.cancelledAt : order.deliveredAt,
      completed: isDelivered || isCancelled || isExpired,
      current: isDelivered || isCancelled || isExpired,
      isCancelled: isCancelled || isExpired,
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

  // Quick Action: Confirm Authenticity & QC
  async function handleConfirmQc() {
    setIsUpdatingStatus(true);
    setFeedback(null);
    const res = await confirmOrderQcAction({
      orderId: order.id,
      notes: "Staff verified authenticity and condition in vault. Passed QC.",
    });
    setIsUpdatingStatus(false);
    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setFeedback({ type: "success", message: "Vault Authentication & QC confirmed!" });
      router.refresh();
    }
  }

  // Quick Action: Ready for Pickup (For PICKUP orders in PROCESSING)
  async function handleMarkReadyForPickup() {
    setIsUpdatingStatus(true);
    setFeedback(null);
    const res = await updateOrderStatusAction({
      orderId: order.id,
      status: "SHIPPED",
      notes: "Specimen prepared and placed in vault pickup lockers.",
    });
    setIsUpdatingStatus(false);
    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setFeedback({ type: "success", message: "Order is now ready for customer pickup!" });
      router.refresh();
    }
  }

  // Quick Action: Complete Delivery (direct for COURIER / PICKUP)
  async function handleDirectDelivery(notes: string) {
    if (
      !confirm(
        "Confirm that this order has been successfully delivered/claimed?\n\n(If COD, payment will automatically settle as PAID)"
      )
    ) {
      return;
    }

    setIsUpdatingStatus(true);
    setFeedback(null);
    const res = await markOrderDeliveredAction({
      orderId: order.id,
      notes,
    });
    setIsUpdatingStatus(false);
    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setFeedback({
        type: "success",
        message: "Order marked as DELIVERED! Delivery timestamp recorded and COD reconciled.",
      });
      router.refresh();
    }
  }

  // Handle Delivery with PIN Verification (for LOCAL_DELIVERY)
  async function handlePinDeliverySubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingDelivery(true);
    setFeedback(null);

    const res = await markOrderDeliveredAction({
      orderId: order.id,
      pin: enteredPin ? enteredPin.trim() : undefined,
      adminOverrideReason: adminOverrideReason ? adminOverrideReason.trim() : undefined,
      notes: adminOverrideReason
        ? `Delivered via admin override: ${adminOverrideReason.trim()}`
        : "Delivered via verified customer PIN.",
    });

    setIsSubmittingDelivery(false);
    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setIsDeliveredModalOpen(false);
      setEnteredPin("");
      setAdminOverrideReason("");
      setFeedback({
        type: "success",
        message: "PIN verified and order successfully marked as DELIVERED!",
      });
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

      {/* ── SCREEN INTERFACE (CLEAN WHITE/LIGHT THEME) ────────────────────────── */}
      <div className="print:hidden p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-zinc-900">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 shadow-2xs transition"
              title="Back to Orders List"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-900">
                  {order.orderNumber}
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusInfo.badgeClass}`}
                >
                  {statusInfo.label}
                </span>
                {order.isSimulated && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border bg-purple-50 text-purple-700 border-purple-200">
                    DEMO PAYMENT
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-500" />
              Print Invoice
            </button>

            {order.status !== "CANCELLED" && (
              <>
                {/* 1. Advance to QC (PROCESSING) */}
                {((order.paymentMethod === "COD" && order.status === "PENDING") ||
                  (order.paymentMethod !== "COD" && order.status === "PAID")) && (
                  <button
                    onClick={handleConfirmQc}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Confirm & Start QC
                  </button>
                )}

                {/* 2. Ready for Pickup (if PICKUP) or Courier Dispatch */}
                {order.status === "PROCESSING" && (
                  <>
                    {order.deliveryMethod === "PICKUP" ? (
                      <button
                        onClick={handleMarkReadyForPickup}
                        disabled={isUpdatingStatus}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-xs transition"
                      >
                        <Store className="w-3.5 h-3.5" />
                        Mark Ready for Pickup
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsTrackingModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        {order.deliveryMethod === "LOCAL_DELIVERY"
                          ? "Dispatch Local Rider"
                          : "Assign Courier & Ship"}
                      </button>
                    )}
                  </>
                )}

                {/* 3. Mark as Delivered / Claimed (when SHIPPED) */}
                {order.status === "SHIPPED" && (
                  <>
                    {order.deliveryMethod === "LOCAL_DELIVERY" ? (
                      <button
                        onClick={() => setIsDeliveredModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Verify PIN & Deliver
                      </button>
                    ) : order.deliveryMethod === "PICKUP" ? (
                      <button
                        onClick={() =>
                          handleDirectDelivery(
                            "Customer presented pickup claim and collected artifact at store vault."
                          )
                        }
                        disabled={isUpdatingStatus}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm Customer Claimed
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleDirectDelivery("Courier delivered package to customer.")
                        }
                        disabled={isUpdatingStatus}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark as Delivered
                      </button>
                    )}
                  </>
                )}

                {/* Tracking modal button for updating carrier/waybill info */}
                {order.deliveryMethod !== "PICKUP" && (
                  <button
                    onClick={() => setIsTrackingModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    {order.shippingCarrier ? "Update Courier" : "Assign Courier"}
                  </button>
                )}

                {/* 4. Change Status */}
                <button
                  onClick={() => setIsStatusModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition"
                >
                  Change Status
                </button>

                {/* 5. Cancel Order */}
                {order.status !== "DELIVERED" && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition"
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
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm shadow-2xs ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-semibold underline hover:no-underline text-zinc-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Customer Problem Report Alert */}
        {order.problemReportedAt && (
          <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 flex items-start justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-rose-950">
                  Customer Reported a Problem with This Order
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  Reported on {new Date(order.problemReportedAt).toLocaleString()} during the inspection window.
                </p>
                {order.problemReason && (
                  <div className="mt-2 text-xs font-mono bg-white/80 p-2.5 rounded-lg border border-rose-200 text-rose-900">
                    &ldquo;{order.problemReason}&rdquo;
                  </div>
                )}
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-800 shrink-0">
              ACTION REQUIRED
            </span>
          </div>
        )}

        {/* Customer Confirmation Badge */}
        {order.customerConfirmedAt && (
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-2 text-xs font-medium shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Customer confirmed receipt on {new Date(order.customerConfirmedAt).toLocaleString()}.
            </span>
          </div>
        )}

        {/* ── FULFILLMENT TIMELINE ────────────────────────────────────────── */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>5-Step Fulfillment Lifecycle</span>
            </h2>
            <span className="text-xs text-zinc-500">
              Real-time synchronization across Customer, Staff, and Admin roles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            {timeline.map((step) => (
              <div
                key={step.step}
                className={`relative p-4 rounded-xl border transition-all ${
                  step.isCancelled
                    ? "bg-rose-50/60 border-rose-200 text-rose-900"
                    : step.completed
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : step.current
                    ? "bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/20"
                    : "bg-zinc-50/80 border-zinc-200 text-zinc-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
                    Step 0{step.step}
                  </span>
                  {step.isCancelled ? (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  ) : step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : step.current ? (
                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-300" />
                  )}
                </div>
                <div className="font-bold text-sm text-zinc-900">{step.title}</div>
                <div className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  {step.description}
                </div>
                {step.date && (
                  <div className="text-[11px] font-mono text-zinc-500 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
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
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/60">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-zinc-900">
                    Order Items ({order.items.length})
                  </h2>
                </div>
                <span className="text-xs text-zinc-500">
                  {order.items.reduce((acc, i) => acc + i.quantity, 0)} total unit(s)
                </span>
              </div>

              <div className="divide-y divide-zinc-100">
                {order.items.map((item) => (
                  <div key={item.id} className="p-5 flex gap-4 items-start hover:bg-zinc-50/50 transition">
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                      {item.productImageUrl ? (
                        <Image
                          src={item.productImageUrl}
                          alt={item.productTitle}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 hover:text-amber-600 transition">
                            {item.productTitle}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {item.variantDetails && (
                              <span className="text-[11px] text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 font-medium">
                                {item.variantDetails}
                              </span>
                            )}
                            {item.variant?.condition && (
                              <span className="text-[11px] text-zinc-500">
                                Condition: {item.variant.condition}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-sm text-zinc-900">
                            {formatPrice(item.subtotal, storeConfig.currencySymbol)}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5">
                            {item.quantity} × {formatPrice(item.unitPrice, storeConfig.currencySymbol)}
                          </div>
                        </div>
                      </div>

                      {/* 1-of-1 Vault Disclosure */}
                      {item.variant?.isOneOfOne && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-bold">Vault Certified 1-of-1:</span>
                          <span className="text-amber-800">
                            Single-specimen artifact locked and serialized in vault.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Financial Totals */}
              <div className="p-5 bg-zinc-50/80 border-t border-zinc-200 space-y-2">
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-900 font-medium">
                    {formatPrice(order.subtotal, storeConfig.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>Shipping Fee</span>
                  <span className="font-mono text-zinc-900 font-medium">
                    {order.shippingFee === 0
                      ? "FREE"
                      : formatPrice(order.shippingFee, storeConfig.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-zinc-900 pt-2 border-t border-zinc-200">
                  <span>Grand Total</span>
                  <span className="font-mono text-amber-700 text-base font-black">
                    {formatPrice(order.totalAmount, storeConfig.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>

            {/* Courier Tracking Dispatch Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-bold text-zinc-900">
                    Courier Dispatch & Waybill
                  </h2>
                </div>
                <button
                  onClick={() => setIsTrackingModalOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                >
                  Edit Courier Details
                </button>
              </div>

              {order.shippingCarrier && order.trackingNumber ? (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-zinc-500">Designated Carrier</div>
                    <div className="font-bold text-sm text-zinc-900">
                      {order.shippingCarrier}
                    </div>
                    <div className="font-mono text-xs text-indigo-800 bg-white px-2.5 py-1 rounded border border-indigo-200 inline-block mt-1 font-semibold">
                      Tracking #: {order.trackingNumber}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {trackingUrl ? (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Track with Carrier
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-500">
                        Carrier portal link available with waybill
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-xl p-6 text-center">
                  <p className="text-xs text-zinc-500 mb-3">
                    No courier has been assigned to this order yet.
                  </p>
                  <button
                    onClick={() => setIsTrackingModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Assign Courier & Waybill
                  </button>
                </div>
              )}
            </div>

            {/* Audit Trail for Order */}
            {auditLogs.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-zinc-500" />
                  <h2 className="text-sm font-bold text-zinc-900">
                    Order Audit Trail
                  </h2>
                </div>
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-xs bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                    >
                      <div>
                        <span className="font-mono font-bold text-amber-700">
                          {log.action}
                        </span>{" "}
                        <span className="text-zinc-600">by {log.userEmail}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
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
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-200">
                <User className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-zinc-900">Buyer Information</h2>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-zinc-500 block">Customer Name</span>
                  <span className="font-bold text-zinc-900 text-sm">
                    {order.customerName}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 block">Email Address</span>
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="text-amber-700 hover:underline font-medium"
                  >
                    {order.customerEmail}
                  </a>
                </div>

                {order.customerPhone && (
                  <div>
                    <span className="text-zinc-500 block">Phone</span>
                    <span className="text-zinc-700 font-medium">{order.customerPhone}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-100">
                  <span className="text-zinc-500 block">Account Status</span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                      order.userId
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {order.userId ? "Registered Collector" : "Guest Checkout"}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping / Delivery Details Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  {order.deliveryMethod === "PICKUP" ? (
                    <Store className="w-4 h-4 text-purple-600" />
                  ) : order.deliveryMethod === "LOCAL_DELIVERY" ? (
                    <Truck className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  )}
                  <h2 className="text-sm font-bold text-zinc-900">
                    {order.deliveryMethod === "PICKUP" ? "Pickup Location" : "Delivery Address"}
                  </h2>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 uppercase">
                  {order.deliveryMethod === "LOCAL_DELIVERY"
                    ? "Local Delivery"
                    : order.deliveryMethod === "PICKUP"
                    ? "Vault Pickup"
                    : "Courier"}
                </span>
              </div>

              <div className="text-xs text-zinc-700 space-y-1">
                <div className="font-bold text-sm text-zinc-900">
                  {order.shippingAddress.fullName}
                </div>
                <div className="text-zinc-500">{order.shippingAddress.phone}</div>
                <div className="pt-2 text-zinc-800">{order.shippingAddress.street}</div>
                {order.shippingAddress.apartment && (
                  <div className="text-zinc-600">{order.shippingAddress.apartment}</div>
                )}
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                  {order.shippingAddress.postalCode}
                </div>
                <div className="text-zinc-500">{order.shippingAddress.country}</div>
              </div>

              {/* Local Delivery PIN display */}
              {order.deliveryMethod === "LOCAL_DELIVERY" && (
                <div className="pt-3 border-t border-zinc-100">
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Security Delivery PIN</span>
                      </div>
                      <div className="text-[10px] text-emerald-800 mt-0.5">
                        Attempts used: {order.deliveryPinAttempts} / 5
                      </div>
                    </div>
                    <span className="font-mono text-base font-black text-emerald-950 tracking-widest bg-white px-2.5 py-1 rounded border border-emerald-300">
                      {order.deliveryPin || "----"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Details Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-200">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-zinc-900">Payment Status</h2>
              </div>

              <div className="space-y-3 text-xs">
                {order.isSimulated && (
                  <div className="p-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 space-y-0.5">
                    <span className="font-bold text-[11px] uppercase tracking-wider block">
                      Demo Payment Mode
                    </span>
                    <span className="text-[11px] text-purple-800 leading-relaxed block">
                      This order was settled using demo checkout and is isolated from real store revenue.
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Method</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-zinc-900">
                      {order.paymentMethod}
                    </span>
                    {order.isSimulated && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                        DEMO
                      </span>
                    )}
                  </div>
                </div>

                {order.paymentReference && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Reference ID</span>
                    <span className="font-mono text-zinc-800 text-[11px] truncate max-w-[180px]">
                      {order.paymentReference}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      order.paymentStatus === "PAID"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : order.paymentStatus === "FAILED"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>

                {order.paidAt && (
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                    <span className="text-zinc-500">Settled On</span>
                    <span className="text-zinc-800 font-mono text-[11px]">
                      {new Date(order.paidAt).toLocaleDateString()} {new Date(order.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-zinc-900">
            <h3 className="text-lg font-bold text-zinc-900">Update Order Status</h3>
            <p className="text-xs text-zinc-500">
              Moving order to <strong>SHIPPED</strong> records the dispatched timestamp.
              Moving to <strong>DELIVERED</strong> completes the order and reconciles COD payment.
            </p>

            <form onSubmit={handleStatusUpdate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Select Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ValidAdminTargetStatus)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-amber-500"
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
                  className="px-4 py-2 text-xs rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-black hover:bg-amber-400 flex items-center gap-1.5 shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-zinc-900">
            <h3 className="text-lg font-bold text-zinc-900">Assign Courier & Waybill</h3>
            <p className="text-xs text-zinc-500">
              Tracking numbers are visible to customers on their order tracking timeline.
            </p>

            <form onSubmit={handleTrackingUpdate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Courier Carrier</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-amber-500"
                >
                  {CARRIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Waybill / Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1729-4820-XXXX"
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-zinc-900 font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="markShippedCheck"
                  checked={markShippedOnTracking}
                  onChange={(e) => setMarkShippedOnTracking(e.target.checked)}
                  className="rounded border-zinc-300 bg-white text-indigo-600 focus:ring-0 w-4 h-4"
                />
                <label htmlFor="markShippedCheck" className="text-xs text-zinc-700 cursor-pointer font-medium">
                  Automatically mark order as <strong>DISPATCHED (SHIPPED)</strong> now
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTrackingModalOpen(false)}
                  disabled={isUpdatingTracking}
                  className="px-4 py-2 text-xs rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTracking}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-zinc-900">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold">Cancel Order & Restore Inventory</h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Cancelling will mark this order as <strong>CANCELLED</strong>, restore quantities to
              product inventory, and release 1-of-1 Vault items back to available status.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Cancellation Reason</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Provide reason for audit trail..."
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isCancelling}
                  className="px-4 py-2 text-xs rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-semibold"
                >
                  Keep Order Active
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1.5 shadow-xs"
                >
                  {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VERIFY DELIVERY PIN (FOR LOCAL DELIVERY) ─────────────── */}
      {isDeliveredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-zinc-900">
            <div className="flex items-center gap-2 text-emerald-700">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold">Local Delivery Handover Verification</h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              To complete this local delivery, input the 4-digit security PIN provided to the customer upon order placement.
            </p>

            <form onSubmit={handlePinDeliverySubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 flex justify-between">
                  <span>Customer 4-Digit Delivery PIN</span>
                  <span className="font-mono text-zinc-400 text-[11px]">
                    Attempts used: {order.deliveryPinAttempts}/5
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="e.g. 7492"
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-lg text-center tracking-widest font-mono font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Admin Override Option */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  <span>Admin Emergency Override</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  If the customer is unable to access their device or maximum attempts were reached, an Administrator can override with a documented reason.
                </p>
                <input
                  type="text"
                  value={adminOverrideReason}
                  onChange={(e) => setAdminOverrideReason(e.target.value)}
                  placeholder="Document reason for audit log (min 5 chars)..."
                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeliveredModalOpen(false)}
                  disabled={isSubmittingDelivery}
                  className="px-4 py-2 text-xs rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelivery || (!enteredPin && !adminOverrideReason)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingDelivery && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Verify & Complete Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
