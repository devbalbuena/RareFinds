"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Trash2,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { getCartAction, removeFromCartAction } from "@/actions/cart";

interface CartItemData {
  id: string;
  variantId: string;
  quantity: number;
  price: number;
  size: string;
  condition: string;
  isOneOfOne: boolean;
  isUnavailable: boolean;
  unavailableReason: string;
  product: {
    id: string;
    title: string;
    slug: string;
    brandName: string;
    imageUrl: string;
  };
}

export function CartDrawer() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<CartItemData[]>([]);
  const [subtotal, setSubtotal] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const fetchCart = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCartAction();
      setItems(res.items);
      setSubtotal(res.subtotal);
      setTotalCount(res.totalCount);
      setIsLoggedIn(res.isLoggedIn);
    } catch (e) {
      console.error("Failed to load cart:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial count load
  React.useEffect(() => {
    getCartAction().then((res) => {
      setTotalCount(res.totalCount);
      setIsLoggedIn(res.isLoggedIn);
    });
  }, []);

  // Listen for custom "cart:updated" event dispatched by AddToCart
  React.useEffect(() => {
    const handleCartUpdated = () => {
      fetchCart();
      setOpen(true);
    };

    window.addEventListener("cart:updated", handleCartUpdated);
    return () => window.removeEventListener("cart:updated", handleCartUpdated);
  }, [fetchCart]);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await removeFromCartAction(id);
      if (res.success) {
        await fetchCart();
      }
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          fetchCart();
        }
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Open Cart"
        >
          <ShoppingBag className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in-50">
              {totalCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-6">
        <SheetHeader className="text-left border-b pb-4">
          <SheetTitle className="text-lg font-black uppercase tracking-tight flex items-center justify-between">
            <span>Your Vault Cart</span>
            {totalCount > 0 && (
              <span className="text-xs font-semibold text-muted-foreground lowercase">
                {totalCount} {totalCount === 1 ? "pair" : "pairs"}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Cart Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading vault cart...</p>
            </div>
          ) : !isLoggedIn ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="p-4 rounded-full bg-secondary text-muted-foreground">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  Sign In to Access Your Cart
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Your rare sneaker selections are securely linked to your account.
                </p>
              </div>
              <Button asChild size="sm" onClick={() => setOpen(false)}>
                <Link href="/sign-in?callbackUrl=/products">Sign In Now</Link>
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="p-4 rounded-full bg-secondary text-muted-foreground">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  Your Cart is Empty
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Explore our curated inventory of deadstock and authenticated grails.
                </p>
              </div>
              <Button asChild size="sm" onClick={() => setOpen(false)}>
                <Link href="/products">Browse Sneakers</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex gap-3.5 p-3 rounded-xl border transition-all ${
                    item.isUnavailable
                      ? "bg-red-500/5 border-red-500/30 opacity-75"
                      : "bg-card"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-secondary border">
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.title}
                      fill
                      sizes="80px"
                      className="object-cover object-center"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          href={`/products/${item.product.slug}`}
                          onClick={() => setOpen(false)}
                          className="font-bold text-xs line-clamp-1 hover:underline text-foreground"
                        >
                          {item.product.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          className="text-muted-foreground hover:text-red-500 p-1 transition-colors"
                          aria-label="Remove item"
                        >
                          {removingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Size: {item.size}
                        </span>
                        <span className="text-[11px] text-muted-foreground">•</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {item.condition}
                        </Badge>
                        {item.isOneOfOne && (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            1-of-1
                          </span>
                        )}
                      </div>

                      {/* Availability Warning */}
                      {item.isUnavailable && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{item.unavailableReason}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between mt-2 pt-1 border-t text-xs">
                      <span className="text-muted-foreground">
                        {item.quantity > 1
                          ? `Qty: ${item.quantity} × ${formatPrice(item.price)}`
                          : "Price:"}
                      </span>
                      <span className="font-bold text-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Checkout Bar */}
        {isLoggedIn && items.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Subtotal
              </span>
              <span className="text-xl font-black text-foreground">
                {formatPrice(subtotal)}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Shipping & taxes calculated at checkout. 1-of-1 inventory holds begin during checkout step.
            </p>

            {/* Checkout Button (Enabled in Phase 4) */}
            <div className="space-y-2">
              {items.some((item) => item.isUnavailable) ? (
                <Button
                  disabled
                  className="w-full h-11 text-sm font-bold gap-2 opacity-60 cursor-not-allowed"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Remove Unavailable Pairs to Checkout
                </Button>
              ) : (
                <Button
                  asChild
                  onClick={() => setOpen(false)}
                  className="w-full h-11 text-sm font-bold gap-2 bg-amber-500 hover:bg-amber-600 text-black shadow-md shadow-amber-500/20"
                >
                  <Link href="/checkout">
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
