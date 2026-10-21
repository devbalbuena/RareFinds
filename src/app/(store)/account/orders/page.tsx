import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { cleanupExpiredOrders } from "@/lib/orders/expiry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import {
  Package,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CreditCard,
  Banknote,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Order History | RareFinds Vault",
  description: "View your past rare sneaker orders and shipping tracking status.",
};

const statusBadgeConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "grail" | "outline"; className?: string }
> = {
  PENDING_PAYMENT: {
    label: "Pending Payment",
    variant: "grail",
    className: "border-amber-500/30 text-amber-500 bg-amber-500/10",
  },
  PENDING: {
    label: "Pending Confirmation",
    variant: "secondary",
    className: "border-blue-500/30 text-blue-500 bg-blue-500/10",
  },
  PAID: {
    label: "Paid & Secured",
    variant: "default",
    className: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
  },
  PROCESSING: {
    label: "Processing",
    variant: "default",
    className: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
  },
  SHIPPED: {
    label: "Shipped",
    variant: "default",
    className: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  },
  DELIVERED: {
    label: "Delivered",
    variant: "default",
    className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "outline",
    className: "text-zinc-500 border-zinc-800",
  },
  EXPIRED: {
    label: "Hold Expired",
    variant: "outline",
    className: "text-red-400 border-red-500/30 bg-red-500/5",
  },
};

export default async function OrderHistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/account/orders");
  }

  // Lazy platform-wide expiry cleanup
  await cleanupExpiredOrders();

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Profile
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            Order History
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track and view fulfillment status for your authenticated sneaker acquisitions.
          </p>
        </div>

        <Button asChild size="sm" className="text-xs font-semibold">
          <Link href="/products">
            Browse Vault Catalog
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Orders List or Empty State */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-5">
            <div className="p-4 rounded-full bg-secondary text-muted-foreground">
              <Package className="h-10 w-10" />
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="text-base font-bold text-foreground">
                No Orders in Your Vault Yet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You haven&apos;t placed any sneaker orders yet. Add a 1-of-1 grail to your cart to begin checkout.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button asChild size="sm" className="font-semibold text-xs bg-amber-500 hover:bg-amber-600 text-black">
                <Link href="/products">Shop Available Pairs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig =
              statusBadgeConfig[order.status] || {
                label: order.status,
                variant: "secondary",
              };

            return (
              <Card key={order.id} className="overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-700 transition-all">
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar: Order Number, Date, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm uppercase tracking-tight">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {order.paymentMethod === "COD" ? (
                            <>
                              <Banknote className="h-3 w-3 text-emerald-500" />
                              <span>Cash on Delivery</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-3 w-3 text-purple-400" />
                              <span>{order.paymentMethod} (Demo)</span>
                            </>
                          )}
                        </span>
                        {order.isSimulated && (
                          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[9px] py-0 px-1 font-semibold uppercase">
                            DEMO PAYMENT
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right sm:text-right">
                        <span className="text-xs text-muted-foreground block">Total Amount</span>
                        <span className="text-base font-black text-foreground">
                          {formatPrice(Number(order.totalAmount))}
                        </span>
                      </div>
                      <Button asChild variant="outline" size="sm" className="text-xs gap-1">
                        <Link href={`/account/orders/${order.id}`}>
                          View Details
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Items Previews */}
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 bg-secondary/30 p-2.5 rounded-lg border text-xs">
                        <div className="relative h-12 w-12 rounded-md bg-secondary shrink-0 overflow-hidden">
                          {item.productImageUrl ? (
                            <Image
                              src={item.productImageUrl}
                              alt={item.productTitle}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-0.5 max-w-[200px]">
                          <div className="font-bold text-foreground truncate">
                            {item.productTitle}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.variantDetails}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
