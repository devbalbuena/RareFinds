"use client";

import * as React from "react";
import {
  Package,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";

interface OrderTrackingTimelineProps {
  status: OrderStatus;
  paymentStatus: string;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
}

export function OrderTrackingTimeline({
  status,
  paymentStatus,
  shippingCarrier,
  trackingNumber,
  createdAt,
  paidAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
}: OrderTrackingTimelineProps) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getCarrierUrl(carrier: string | null, tracking: string | null) {
    if (!carrier || !tracking) return null;
    const lower = carrier.toLowerCase();
    if (lower.includes("lbc")) {
      return `https://www.lbcexpress.com/track/?tracking_no=${encodeURIComponent(tracking)}`;
    }
    if (lower.includes("j&t") || lower.includes("jt")) {
      return `https://www.jtexpress.ph/index/query/gzquery.html?bills=${encodeURIComponent(tracking)}`;
    }
    if (lower.includes("2go")) {
      return `https://supplychain.2go.com.ph/track/track.asp?tin=${encodeURIComponent(tracking)}`;
    }
    if (lower.includes("dhl")) {
      return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(tracking)}`;
    }
    if (lower.includes("ninja")) {
      return `https://www.ninjavan.co/en-ph/tracking?id=${encodeURIComponent(tracking)}`;
    }
    return null;
  }

  const carrierUrl = getCarrierUrl(shippingCarrier || null, trackingNumber || null);

  const isDelivered = status === "DELIVERED";
  const isShipped = status === "SHIPPED" || isDelivered;
  const isProcessing =
    status === "PROCESSING" ||
    status === "PAID" ||
    isShipped;
  const isCancelled = status === "CANCELLED";

  const steps = [
    {
      title: "Order Placed",
      description: "Order secured in our vault system",
      icon: Package,
      date: createdAt,
      completed: true,
      current: status === "PENDING" || status === "PENDING_PAYMENT",
    },
    {
      title: "Authentication & QC",
      description:
        paymentStatus === "PAID"
          ? "Payment confirmed & multi-point authenticated"
          : "Under vault inspection",
      icon: ShieldCheck,
      date: paidAt,
      completed: isProcessing,
      current: status === "PROCESSING" || status === "PAID",
    },
    {
      title: "Courier In Transit",
      description: shippingCarrier
        ? `${shippingCarrier} (${trackingNumber || "Assigned"})`
        : "Awaiting courier handover",
      icon: Truck,
      date: shippedAt,
      completed: isShipped,
      current: status === "SHIPPED",
    },
    {
      title: isCancelled ? "Order Cancelled" : "Delivered",
      description: isCancelled
        ? "Items returned to vault stock"
        : isDelivered
        ? "Package signed and delivered"
        : "Expected at your doorstep",
      icon: isCancelled ? AlertCircle : CheckCircle2,
      date: isCancelled ? cancelledAt : deliveredAt,
      completed: isDelivered || isCancelled,
      current: isDelivered || isCancelled,
      isCancelled,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── VISUAL STEP PROGRESS BAR ────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Fulfillment Journey
          </h2>
          {shippingCarrier && (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {shippingCarrier}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className={`relative p-4 rounded-xl border transition-all ${
                  step.isCancelled
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : step.completed
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : step.current
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                    : "bg-muted/40 border-border/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">
                    Step 0{idx + 1}
                  </span>
                  {step.isCancelled ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : step.current ? (
                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-border" />
                  )}
                </div>

                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{step.title}</span>
                </div>

                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {step.description}
                </p>

                {step.date && (
                  <div className="text-[10px] font-mono text-muted-foreground/80 mt-2.5 pt-2 border-t border-border/50 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(step.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── COURIER WAYBILL CARD (WHEN DISPATCHED) ───────────────────────── */}
      {shippingCarrier && trackingNumber && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                Courier Waybill & Tracking
              </span>
            </div>
            <div className="text-sm font-semibold text-foreground">
              Handled by <span className="font-bold">{shippingCarrier}</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="font-mono text-xs font-bold bg-background/80 border px-2.5 py-1 rounded-lg text-foreground">
                {trackingNumber}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg border bg-background/60 hover:bg-background text-muted-foreground hover:text-foreground transition"
                title="Copy tracking number"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {carrierUrl ? (
              <a
                href={carrierUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Track on {shippingCarrier}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">
                Courier tracking number ready
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
