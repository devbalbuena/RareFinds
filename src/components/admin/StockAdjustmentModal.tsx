"use client";

import * as React from "react";
import { StockAdjustmentReason } from "@prisma/client";
import { adjustVariantStockAction } from "@/actions/products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface VariantSummary {
  id: string;
  size: string;
  stockQty: number;
  isOneOfOne: boolean;
  isSold: boolean;
}

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle: string;
  variants: VariantSummary[];
  onSuccess?: () => void;
}

const REASONS: { value: StockAdjustmentReason; label: string; description: string }[] = [
  { value: "RESTOCK", label: "Restock / Warehouse Delivery", description: "Incoming fresh units from supplier or consignment" },
  { value: "DAMAGED", label: "Damaged Pair", description: "Box or sneaker damaged during storage/handling" },
  { value: "LOST", label: "Lost / Missing", description: "Discrepancy identified during physical vault count" },
  { value: "AUDIT_CORRECTION", label: "Audit Count Correction", description: "Inventory count discrepancy rectification" },
  { value: "INITIAL_STOCK", label: "Initial Inventory Entry", description: "Initial vault stocking" },
];

export function StockAdjustmentModal({
  open,
  onOpenChange,
  productTitle,
  variants,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [selectedVariantId, setSelectedVariantId] = React.useState<string>(
    variants[0]?.id || ""
  );
  const [deltaType, setDeltaType] = React.useState<"add" | "remove">("add");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [reason, setReason] = React.useState<StockAdjustmentReason>("RESTOCK");
  const [notes, setNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const activeVariantId = selectedVariantId || variants[0]?.id || "";
  const selectedVariant = variants.find((v) => v.id === activeVariantId);
  const isOneOfOne = selectedVariant?.isOneOfOne;

  const currentStock = selectedVariant?.stockQty ?? 0;
  const calculatedDelta = deltaType === "add" ? Math.abs(quantity) : -Math.abs(quantity);
  const projectedStock = currentStock + calculatedDelta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVariantId) return;

    if (isOneOfOne) {
      setError("1-of-1 grails have fixed allocation and cannot receive quantity adjustments.");
      return;
    }

    if (quantity <= 0) {
      setError("Please enter a valid quantity greater than 0.");
      return;
    }

    if (projectedStock < 0) {
      setError(`Cannot reduce stock below 0 (current: ${currentStock}).`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await adjustVariantStockAction({
        variantId: activeVariantId,
        delta: calculatedDelta,
        reason,
        notes: notes.trim() || undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg(`Inventory updated! New stock for ${selectedVariant?.size}: ${res.newStock} pair(s).`);
        setTimeout(() => {
          onOpenChange(false);
          setSuccessMsg(null);
          onSuccess?.();
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record stock adjustment.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-2xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900">
            <Package className="h-5 w-5 text-amber-500" />
            Adjust Inventory Stock
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            {productTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Select Variant */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
              Select Variant / Size
            </label>
            <select
              value={activeVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.size} — Current Stock: {v.stockQty} {v.isOneOfOne ? "(1-of-1 Grail)" : ""}
                </option>
              ))}
            </select>
          </div>

          {isOneOfOne ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold">Fixed 1-of-1 Allocation</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                This pair is configured as a unique 1-of-1 grail. Its quantity is locked to 1. Quantity adjustments are disabled.
              </p>
            </div>
          ) : (
            <>
              {/* Add vs Remove toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeltaType("add")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                      deltaType === "add"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs"
                        : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> + Increase Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeltaType("remove")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                      deltaType === "remove"
                        ? "border-rose-300 bg-rose-50 text-rose-800 shadow-xs"
                        : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600" /> - Decrease Stock
                  </button>
                </div>
              </div>

              {/* Quantity input & Preview */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                    Units ({deltaType === "add" ? "+" : "-"})
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-white border-zinc-300 text-zinc-900"
                  />
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-center">
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                    Projected Stock
                  </span>
                  <span
                    className={`text-base font-black ${
                      projectedStock < 0 ? "text-rose-600" : "text-zinc-900"
                    }`}
                  >
                    {currentStock} → {projectedStock}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                  Adjustment Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 font-medium"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Internal Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                  Notes / Audit Trail Details (Optional)
                </label>
                <Input
                  placeholder="e.g. Supplier PO #4092 or shelf count discrepancy"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white border-zinc-300 text-xs text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || isOneOfOne || projectedStock < 0}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold shadow-xs"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
