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
  KeyRound,
  Store,
  AlertTriangle,
  Loader2,
  Star,
  ThumbsUp,
} from "lucide-react";
import { OrderStatus, PaymentMethod, DeliveryMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  confirmReceivedCustomerAction,
  reportOrderProblemAction,
} from "@/actions/orders";
import { getCarrierTrackingUrl } from "@/lib/couriers";

interface OrderTrackingTimelineProps {
  orderId: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod?: PaymentMethod | string;
  deliveryMethod?: DeliveryMethod | string;
  deliveryPin?: string | null;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  paidAt?: string | null;
  qcVerifiedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  customerConfirmedAt?: string | null;
  problemReportedAt?: string | null;
  problemReason?: string | null;
  autoCompleteAt?: string | null;
  cancelledAt?: string | null;
}

export function OrderTrackingTimeline({
  orderId,
  status,
  paymentStatus,
  paymentMethod = "TEST",
  deliveryMethod = "COURIER",
  deliveryPin,
  shippingCarrier,
  trackingNumber,
  createdAt,
  paidAt,
  qcVerifiedAt,
  shippedAt,
  deliveredAt,
  customerConfirmedAt: initialCustomerConfirmedAt,
  problemReportedAt: initialProblemReportedAt,
  problemReason: initialProblemReason,
  autoCompleteAt,
  cancelledAt,
}: OrderTrackingTimelineProps) {
  const [copied, setCopied] = React.useState(false);
  const [customerConfirmedAt, setCustomerConfirmedAt] = React.useState<string | null>(
    initialCustomerConfirmedAt || null
  );
  const [problemReportedAt, setProblemReportedAt] = React.useState<string | null>(
    initialProblemReportedAt || null
  );
  const [problemReason, setProblemReason] = React.useState<string | null>(
    initialProblemReason || null
  );

  // Problem reporting & Condition review states
  const [isReportingProblem, setIsReportingProblem] = React.useState(false);
  const [issueText, setIssueText] = React.useState("");
  const [isConfirmingReceipt, setIsConfirmingReceipt] = React.useState(false);
  const [reviewRating, setReviewRating] = React.useState<number>(5);
  const [conditionVerified, setConditionVerified] = React.useState(true);
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [actionPending, setActionPending] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  function handleCopy() {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmitConfirm(e: React.FormEvent) {
    e.preventDefault();
    setActionPending(true);
    setActionError(null);
    try {
      const res = await confirmReceivedCustomerAction(orderId, {
        rating: reviewRating,
        feedback: reviewNotes.trim() || undefined,
        conditionVerified,
      });
      if (res.error) {
        setActionError(res.error);
      } else {
        setCustomerConfirmedAt(new Date().toISOString());
        setIsConfirmingReceipt(false);
      }
    } catch {
      setActionError("Failed to confirm delivery receipt.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!issueText || issueText.trim().length < 10) {
      setActionError("Please describe the issue in detail (at least 10 characters).");
      return;
    }

    setActionPending(true);
    setActionError(null);
    try {
      const res = await reportOrderProblemAction(orderId, issueText.trim());
      if (res.error) {
        setActionError(res.error);
      } else {
        setProblemReportedAt(new Date().toISOString());
        setProblemReason(issueText.trim());
        setIsReportingProblem(false);
      }
    } catch {
      setActionError("Failed to submit issue report.");
    } finally {
      setActionPending(false);
    }
  }

  const carrierUrl = getCarrierTrackingUrl(shippingCarrier || null, trackingNumber || null);

  const isDelivered = status === "DELIVERED";
  const isShipped = status === "SHIPPED" || isDelivered;
  const isQcCompleted = Boolean(qcVerifiedAt) || isShipped;
  const isCancelled = status === "CANCELLED";
  const isExpired = status === "EXPIRED";
  const isCod = paymentMethod === "COD";

  // Check if reporting window is still open
  const now = new Date();
  const isReportWindowActive = isDelivered && (!autoCompleteAt || now <= new Date(autoCompleteAt));

  // 5 Honest Steps (Separating Payment from QC)
  const steps = [
    {
      stepNum: "01",
      title: "Order Placed",
      description: "Order secured in our vault system",
      icon: Package,
      date: createdAt,
      completed: true,
      current: status === "PENDING" || status === "PENDING_PAYMENT",
    },
    {
      stepNum: "02",
      title: isCod ? "Payment (COD)" : "Payment Confirmed",
      description: isCod
        ? isDelivered
          ? "Cash collected at delivery"
          : "Cash settles at delivery handover"
        : paymentStatus === "PAID"
        ? "Payment verified & holds cleared"
        : "Awaiting payment verification",
      icon: CheckCircle2,
      date: paidAt,
      completed: isCod ? isDelivered : paymentStatus === "PAID",
      current: !isCod && status === "PENDING_PAYMENT",
    },
    {
      stepNum: "03",
      title: "Authentication & QC",
      description: isQcCompleted
        ? "Inspected & sealed with authenticity tag"
        : "Vault inspection & packaging in progress",
      icon: ShieldCheck,
      date: qcVerifiedAt,
      completed: isQcCompleted,
      current:
        !isQcCompleted &&
        ((isCod && (status === "PENDING" || status === "PROCESSING")) ||
          (!isCod && (status === "PAID" || status === "PROCESSING"))),
    },
    {
      stepNum: "04",
      title:
        deliveryMethod === "PICKUP"
          ? "Ready for Pickup"
          : deliveryMethod === "LOCAL_DELIVERY"
          ? "Out for Delivery"
          : "Dispatched",
      description:
        deliveryMethod === "PICKUP"
          ? isShipped
            ? "Ready for claiming at the store vault"
            : "Preparing for store handover"
          : shippingCarrier
          ? `${shippingCarrier} (${trackingNumber || "Assigned"})`
          : "Handed over to courier",
      icon: deliveryMethod === "PICKUP" ? Store : Truck,
      date: shippedAt,
      completed: isShipped,
      current: status === "SHIPPED",
    },
    {
      stepNum: "05",
      title: isCancelled
        ? "Order Cancelled"
        : isExpired
        ? "Hold Expired"
        : deliveryMethod === "PICKUP"
        ? "Claimed at Vault"
        : "Delivered",
      description: isCancelled
        ? "Items returned to vault stock"
        : isExpired
        ? "Reservation hold timed out"
        : isDelivered
        ? customerConfirmedAt
          ? "Delivered & customer confirmed"
          : "Package handed over"
        : "Expected destination handover",
      icon: isCancelled || isExpired ? AlertCircle : CheckCircle2,
      date: isCancelled ? cancelledAt : deliveredAt,
      completed: isDelivered || isCancelled || isExpired,
      current: isDelivered || isCancelled || isExpired,
      isCancelled: isCancelled || isExpired,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── VISUAL STEP PROGRESS BAR (5 STEPS) ───────────────────────────── */}
      <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Fulfillment Journey
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-secondary text-foreground border">
              {deliveryMethod === "PICKUP"
                ? "Self Pickup"
                : deliveryMethod === "LOCAL_DELIVERY"
                ? "Local Express Delivery"
                : "Nationwide Courier"}
            </span>
            {shippingCarrier && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {shippingCarrier}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className={`relative p-3.5 rounded-xl border transition-all ${
                  step.isCancelled
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : step.completed
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : step.current
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                    : "bg-muted/40 border-border/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">
                    Step {step.stepNum}
                  </span>
                  {step.isCancelled ? (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                  ) : step.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : step.current ? (
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-border" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{step.title}</span>
                </div>

                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {step.description}
                </p>

                {step.date && (
                  <div className="text-[10px] font-mono text-muted-foreground/80 mt-2 pt-1.5 border-t border-border/50 flex items-center gap-1">
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

      {/* ── LOCAL DELIVERY SECURITY PIN CARD ─────────────────────────────── */}
      {deliveryMethod === "LOCAL_DELIVERY" && deliveryPin && !isCancelled && !isExpired && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-500" />
              <span className="text-xs uppercase font-bold text-amber-500 tracking-wider">
                Delivery Verification PIN
              </span>
            </div>
            <p className="text-xs text-foreground">
              Provide this 4-digit code to the RareFinds delivery rider upon handover to verify authentic delivery.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-2xl font-black px-4 py-2 rounded-xl bg-background border border-amber-500/40 text-amber-500 tracking-widest shadow-xs">
              {deliveryPin}
            </span>
          </div>
        </div>
      )}

      {/* ── COURIER DISPATCH PREPARATION CARD (BEFORE TRACKING NUMBER) ─── */}
      {deliveryMethod === "COURIER" && (!shippingCarrier || !trackingNumber) && !isCancelled && !isExpired && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-sky-500" />
              <span className="text-xs uppercase font-bold text-sky-500 tracking-wider">
                Nationwide Courier Dispatch Preparation
              </span>
            </div>
            <p className="text-xs text-foreground">
              Your pair is currently undergoing physical authenticity verification and double-box packing in our Manila vault. Once dispatched to our courier partner (LBC / J&T Express), your waybill number and real-time tracking link will automatically appear here.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono font-semibold px-3 py-1.5 rounded-xl bg-background border border-sky-500/30 text-sky-500 shadow-xs">
              Insured Air &amp; Land Freight
            </span>
          </div>
        </div>
      )}

      {/* ── COURIER WAYBILL CARD (WHEN DISPATCHED) ───────────────────────── */}
      {deliveryMethod === "COURIER" && shippingCarrier && trackingNumber && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                Courier Waybill &amp; Tracking
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
                className="p-1.5 rounded-lg border bg-background/60 hover:bg-background text-muted-foreground hover:text-foreground transition cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs transition"
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

      {/* ── PRE-DELIVERY LOCKED RECEIPT NOTICE ───────────────────────────── */}
      {!isDelivered && !isCancelled && !isExpired && (
        <div className="rounded-2xl border border-dashed p-4 sm:p-5 bg-card/40 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-muted-foreground">
          <div className="space-y-0.5">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              Delivery Confirmation &amp; Vault Warranty
            </div>
            <p className="text-[11px] text-muted-foreground">
              {deliveryMethod === "LOCAL_DELIVERY"
                ? "The 'Confirm Received' button unlocks once our delivery rider arrives and verifies your 4-digit security PIN."
                : deliveryMethod === "PICKUP"
                ? "The 'Confirm Received' button unlocks once you claim and inspect your grails at our BGC vault."
                : "The 'Confirm Received' button unlocks once courier transit is completed and marked delivered."}
            </p>
          </div>
          <Button
            disabled
            size="sm"
            variant="outline"
            className="text-xs h-8 opacity-60 cursor-not-allowed shrink-0"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Locked Until Delivered
          </Button>
        </div>
      )}

      {/* ── POST-DELIVERY ACTIONS: CONFIRM RECEIVED & REPORT A PROBLEM ──── */}
      {isDelivered && (
        <div className="rounded-2xl border p-4 sm:p-5 bg-card/60 backdrop-blur-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Delivery Receipt &amp; Vault Warranty
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Confirm you have inspected and received your authenticated sneakers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {customerConfirmedAt ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Receipt Confirmed • Condition Verified
                </span>
              ) : (
                <Button
                  onClick={() => {
                    setIsConfirmingReceipt(!isConfirmingReceipt);
                    setIsReportingProblem(false);
                  }}
                  disabled={actionPending}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-lg cursor-pointer gap-1.5"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Confirm Received &amp; Review
                </Button>
              )}

              {isReportWindowActive && !problemReportedAt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsReportingProblem(!isReportingProblem);
                    setIsConfirmingReceipt(false);
                  }}
                  className="text-xs font-semibold h-8 rounded-lg cursor-pointer gap-1.5 text-rose-600 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Report a Problem
                </Button>
              )}
            </div>
          </div>

          {/* Condition Grading Review & Confirmation Form */}
          {isConfirmingReceipt && !customerConfirmedAt && (
            <form onSubmit={handleSubmitConfirm} className="pt-2 space-y-3.5 border-t mt-3 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  Verify Physical Sneaker Condition
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Rate your satisfaction and confirm that the physical pair matches the vault condition grading.
                </p>
              </div>

              {/* Star Rating Selection */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          star <= reviewRating
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-foreground ml-1">
                    {reviewRating} / 5 Stars
                  </span>
                </div>
              </div>

              {/* Condition Verified Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-secondary/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={conditionVerified}
                  onChange={(e) => setConditionVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-emerald-600 accent-emerald-600 rounded"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-foreground block">
                    Condition Grading Confirmed
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    I have unboxed and inspected the shoe. The condition (Deadstock / VNDS) and accessories match the photographed pair.
                  </span>
                </div>
              </label>

              {/* Optional Feedback */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Collector Comments (Optional)
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Flawless pair, double-boxed packaging was crisp..."
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmingReceipt(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionPending || !conditionVerified}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer"
                >
                  {actionPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Confirm Handover &amp; Submit Review
                </Button>
              </div>
            </form>
          )}

          {actionError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              {actionError}
            </div>
          )}

          {/* Problem Banner if already reported */}
          {problemReportedAt && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-1">
              <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Problem Reported to RareFinds Vault
              </div>
              <p className="text-muted-foreground">{problemReason}</p>
              <p className="text-[10px] text-amber-600/80 pt-1 font-mono">
                Reported on {new Date(problemReportedAt).toLocaleString("en-US")} • Under administrator review.
              </p>
            </div>
          )}

          {/* Inline Report Problem Form */}
          {isReportingProblem && !problemReportedAt && (
            <form onSubmit={handleSubmitReport} className="pt-2 space-y-3">
              <label className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                Describe the problem with your order
              </label>
              <textarea
                required
                rows={3}
                value={issueText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setIssueText(e.target.value)}
                placeholder="Disclose any damage, packaging flaw, missing accessories, or condition discrepancies..."
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReportingProblem(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionPending || issueText.trim().length < 10}
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8"
                >
                  {actionPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Submit Report to Admin"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
