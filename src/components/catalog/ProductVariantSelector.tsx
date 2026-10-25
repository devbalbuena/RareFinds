"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { Condition } from "@prisma/client";
import {
  ShoppingBag,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { addToCartAction } from "@/actions/cart";

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
  const router = useRouter();
  const pathname = usePathname();

  const [selectedId, setSelectedId] = React.useState<string>(
    variants[0]?.id || ""
  );
  const [quantity, setQuantity] = React.useState<number>(1);
  const [isPending, setIsPending] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    setQuantity(1);
  }, [selectedId]);

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
  const maxAvailable = Math.min(2, Math.max(1, selectedVariant.stockQty));

  const conditionMap: Record<
    Condition,
    { label: string; badgeVariant: "ds" | "vnds" | "used" }
  > = {
    DS: { label: "Deadstock (Brand New)", badgeVariant: "ds" },
    VNDS: { label: "Very Near Deadstock", badgeVariant: "vnds" },
    USED: { label: "Pre-Owned / Graded", badgeVariant: "used" },
  };

  const handleAddToCart = async () => {
    setActionError(null);
    setActionSuccess(null);
    setIsPending(true);

    try {
      const res = await addToCartAction(selectedVariant.id, quantity);

      if (res.requiresLogin) {
        const callbackUrl = encodeURIComponent(pathname);
        router.push(`/sign-in?callbackUrl=${callbackUrl}`);
        return;
      }

      if (res.error) {
        setActionError(res.message);
        return;
      }

      if (res.success) {
        setActionSuccess(res.message || "Added to cart!");
        // Dispatch cart:updated event to notify CartDrawer
        window.dispatchEvent(new CustomEvent("cart:updated"));
      }
    } catch {
      setActionError("Failed to add sneaker to cart. Please try again.");
    } finally {
      setIsPending(false);
    }
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
                onClick={() => {
                  setSelectedId(variant.id);
                  setActionError(null);
                  setActionSuccess(null);
                }}
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

      {/* Feedback Messages */}
      {actionError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="font-medium">{actionError}</div>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="font-medium">{actionSuccess}</div>
        </div>
      )}

      {/* Quantity Stepper & Concierge Notice (Max 2 pairs) */}
      {!isSold && (
        <div className="space-y-3 rounded-xl border border-border/80 bg-card/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                Order Quantity
              </span>
              <span className="text-[11px] text-muted-foreground">
                Limit 2 pairs per collector order
              </span>
            </div>

            <div className="flex items-center gap-2 border border-border rounded-lg bg-background p-1">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                disabled={quantity <= 1 || isPending}
                className="h-8 w-8 flex items-center justify-center rounded text-sm font-bold text-foreground hover:bg-accent disabled:opacity-30 cursor-pointer transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center font-bold text-sm text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.min(maxAvailable, prev + 1))}
                disabled={quantity >= maxAvailable || isPending}
                className="h-8 w-8 flex items-center justify-center rounded text-sm font-bold text-foreground hover:bg-accent disabled:opacity-30 cursor-pointer transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2.5 border-t border-border/50 text-[11px] text-muted-foreground leading-relaxed">
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
            <span>
              Collector policy restricts self-checkout to a maximum of <strong>2 pairs</strong>. Need to place a bulk order or request VIP consignment sourcing?{" "}
              <Link
                href="/about"
                className="text-amber-500 hover:text-amber-400 font-bold underline underline-offset-2 transition-colors"
              >
                Chat directly with our admin or staff
              </Link>
              .
            </span>
          </div>
        </div>
      )}

      {/* Add to Cart Button */}
      <div className="pt-2">
        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={isSold || isPending}
          size="lg"
          className="w-full h-12 text-base font-bold gap-2 cursor-pointer shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Adding to Vault Cart...
            </span>
          ) : isSold ? (
            "Item Sold Out"
          ) : (
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {quantity > 1
                ? `Add ${quantity} Pairs to Cart • ${formatPrice(Number(selectedVariant.price) * quantity)}`
                : `Add to Cart • ${formatPrice(selectedVariant.price)}`}
            </span>
          )}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground mt-2">
          Includes free double-boxed insured shipping & authenticity card
        </p>
      </div>
    </div>
  );
}
