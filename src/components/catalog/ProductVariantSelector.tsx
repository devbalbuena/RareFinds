"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPrice } from "@/lib/utils";
import { Condition } from "@prisma/client";
import { ShoppingBag, Lock, Sparkles, AlertCircle } from "lucide-react";

interface Variant {
  id: string;
  size: string;
  condition: Condition;
  conditionNotes?: string | null;
  price: { toString: () => string } | number | string;
  costPrice?: { toString: () => string } | number | string | null;
  stockQty: number;
  isOneOfOne: boolean;
  isSold: boolean;
  reservedUntil?: Date | string | null;
}

interface ProductVariantSelectorProps {
  variants: Variant[];
}

const emptySubscribe = () => () => {};

export function ProductVariantSelector({
  variants,
}: ProductVariantSelectorProps) {
  const [selectedId, setSelectedId] = React.useState<string>(
    variants[0]?.id || ""
  );

  const now = React.useSyncExternalStore(
    emptySubscribe,
    () => Date.now(),
    () => 0
  );

  const selectedVariant =
    variants.find((v) => v.id === selectedId) || variants[0];

  if (!selectedVariant) return null;

  // Determine reservation status
  const isReserved = Boolean(
    selectedVariant.reservedUntil &&
      new Date(selectedVariant.reservedUntil).getTime() > now
  );

  const isSold = selectedVariant.isSold || selectedVariant.stockQty <= 0;

  const conditionMap: Record<
    Condition,
    { label: string; badgeVariant: "ds" | "vnds" | "used" }
  > = {
    DS: { label: "Deadstock (Brand New)", badgeVariant: "ds" },
    VNDS: { label: "Very Near Deadstock", badgeVariant: "vnds" },
    USED: { label: "Pre-Owned / Graded", badgeVariant: "used" },
  };

  return (
    <div className="space-y-6">
      {/* Price & Condition Badge */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-black tracking-tight text-foreground">
            {formatPrice(selectedVariant.price)}
          </div>
          <Badge
            variant={conditionMap[selectedVariant.condition].badgeVariant}
            className="text-xs px-2.5 py-1"
          >
            {conditionMap[selectedVariant.condition].label}
          </Badge>
        </div>

        {/* Stock Status Badge */}
        <div>
          {isSold ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20">
              <AlertCircle className="h-3.5 w-3.5" />
              Sold Out (No Longer Available)
            </div>
          ) : isReserved ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              <Lock className="h-3.5 w-3.5" />
              On Hold (Active Checkout Hold)
            </div>
          ) : selectedVariant.isOneOfOne ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              One of a kind (Only 1 in stock)
            </div>
          ) : (
            <div className="text-xs font-semibold text-muted-foreground">
              {selectedVariant.stockQty} pairs in stock
            </div>
          )}
        </div>
      </div>

      {/* Size Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">
            Select Size (US Men)
          </span>
          <span className="text-muted-foreground">
            Selected: <strong className="text-foreground">{selectedVariant.size}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {variants.map((variant) => {
            const isSelected = variant.id === selectedId;
            const variantSold = variant.isSold || variant.stockQty <= 0;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedId(variant.id)}
                className={`relative flex flex-col items-center justify-center min-w-[72px] h-14 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs ring-2 ring-primary ring-offset-2"
                    : "border-input bg-card text-foreground hover:bg-accent"
                } ${variantSold ? "opacity-50 line-through" : ""}`}
              >
                <span className="text-sm">{variant.size}</span>
                <span className="text-[10px] opacity-80 mt-0.5">
                  {variant.condition}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Specific Variant Condition Notes */}
      {selectedVariant.conditionNotes && (
        <div className="rounded-lg border bg-secondary/30 p-3.5 text-xs space-y-1">
          <span className="font-semibold text-foreground uppercase tracking-wider block text-[11px]">
            Inspector Notes on this Pair:
          </span>
          <p className="text-muted-foreground leading-relaxed">
            {selectedVariant.conditionNotes}
          </p>
        </div>
      )}

      {/* Add to Cart Button (Disabled with Tooltip as requested) */}
      <div className="pt-2">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  disabled
                  size="lg"
                  className="w-full h-12 text-base font-bold gap-2 cursor-not-allowed opacity-60"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {isSold ? "Item Sold" : "Add to Cart"}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Shopping cart and checkout functionality coming soon in Phase 3 & 4!
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <p className="text-[11px] text-center text-muted-foreground mt-2">
          Includes free double-boxed insured shipping & authenticity card
        </p>
      </div>
    </div>
  );
}
