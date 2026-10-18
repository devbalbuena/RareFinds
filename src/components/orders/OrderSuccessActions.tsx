"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulatePaymentAction, cancelOrderAction } from "@/actions/orders";

interface OrderSuccessActionsProps {
  orderId: string;
  orderNumber?: string;
  initialStatus: string;
  initialPaymentStatus: string;
  paymentMethod: string;
  expiresAt: string | null;
}

export function OrderSuccessActions({
  orderId,
  initialStatus,
  paymentMethod,
  expiresAt,
}: OrderSuccessActionsProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState(initialStatus);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  // Live countdown timer for 15-minute hold
  const [timeLeft, setTimeLeft] = React.useState<number>(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  React.useEffect(() => {
    if (!expiresAt || status !== "PENDING_PAYMENT") return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && status === "PENDING_PAYMENT") {
        setStatus("EXPIRED");
        router.refresh();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status, router]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSimulatePayment = async () => {
    setActionError(null);
    setActionMessage(null);
    setIsSimulating(true);

    try {
      const res = await simulatePaymentAction(orderId);
      if ("error" in res && res.error) {
        setActionError(res.error);
      } else if ("success" in res && res.success) {
        setStatus("PAID");
        setActionMessage(
          ("message" in res && res.message) ||
            "Payment simulated successfully! Your grails are secured."
        );
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to simulate payment.";
      setActionError(msg);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order and release the reserved sneakers?")) {
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setIsCancelling(true);

    try {
      const res = await cancelOrderAction(orderId);
      if ("error" in res && res.error) {
        setActionError(res.error);
      } else if ("success" in res && res.success) {
        setStatus("CANCELLED");
        setActionMessage(
          ("message" in res && res.message) || "Order has been cancelled."
        );
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel order.";
      setActionError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Messages */}
      {actionError && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Dynamic State Banner */}
      {status === "PENDING_PAYMENT" && paymentMethod === "TEST" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                <span className="font-bold text-xs uppercase tracking-wider text-amber-500">
                  15-Minute Reservation Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your 1-of-1 sneakers are temporarily reserved. Simulate payment below to confirm ownership.
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 font-mono text-sm font-bold text-amber-400 self-start sm:self-center">
              <span>Expires in:</span>
              <span>{formatCountdown(timeLeft)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-500/20">
            <Button
              onClick={handleSimulatePayment}
              disabled={isSimulating || isCancelling || timeLeft <= 0}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Simulating Payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-3.5 w-3.5" />
                  Simulate Payment (Complete Order)
                </>
              )}
            </Button>

            <Button
              onClick={handleCancelOrder}
              disabled={isSimulating || isCancelling}
              variant="outline"
              size="sm"
              className="text-xs text-muted-foreground hover:text-red-500 hover:border-red-500/50 cursor-pointer"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel Order
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {status === "PENDING" && paymentMethod === "COD" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4" />
            <span>Cash on Delivery Confirmed • Sneakers Allocated</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your 1-of-1 pair has been allocated and removed from the active store catalog. Please prepare the exact cash amount for our authorized courier upon delivery inspection.
          </p>
          <div className="pt-2">
            <Button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              variant="outline"
              size="sm"
              className="text-xs text-muted-foreground hover:text-red-500 hover:border-red-500/50 cursor-pointer"
            >
              {isCancelling ? "Cancelling..." : "Cancel Order"}
            </Button>
          </div>
        </div>
      )}

      {status === "PAID" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              Payment Confirmed &amp; Grails Secured
            </div>
            <p className="text-xs text-muted-foreground">
              Your order is locked in. Our team in Manila is preparing express double-boxed dispatch.
            </p>
          </div>
        </div>
      )}

      {status === "CANCELLED" && (
        <div className="rounded-xl border border-zinc-800 bg-secondary/30 p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-zinc-500 shrink-0" />
          <div className="text-xs text-muted-foreground">
            This order was cancelled and any held pairs have been returned to the vault.
          </div>
        </div>
      )}

      {status === "EXPIRED" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-red-500 shrink-0" />
          <div className="text-xs text-red-400">
            The 15-minute reservation window has expired. Held sneakers were automatically released back to the catalog.
          </div>
        </div>
      )}
    </div>
  );
}
