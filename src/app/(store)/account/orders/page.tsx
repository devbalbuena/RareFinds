import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { cleanupExpiredOrders } from "@/lib/orders/expiry";
import { getStoreSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerOrdersList, SerializedOrderListItem } from "@/components/account/CustomerOrdersList";
import {
  Package,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Order History | RareFinds Vault",
  description: "View your past rare sneaker orders and shipping tracking status.",
};

export default async function OrderHistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/account/orders");
  }

  // Lazy platform-wide expiry cleanup
  await cleanupExpiredOrders();

  const [orders, storeSettings] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    getStoreSettings(),
  ]);

  const serializedOrders: SerializedOrderListItem[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentMethod: o.paymentMethod,
    isSimulated: o.isSimulated,
    totalAmount: Number(o.totalAmount),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((item) => ({
      id: item.id,
      productTitle: item.productTitle,
      variantDetails: item.variantDetails,
      productImageUrl: item.productImageUrl,
    })),
  }));

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

      {/* Orders List with Search & Status Tabs or Empty State */}
      {serializedOrders.length === 0 ? (
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
        <CustomerOrdersList
          orders={serializedOrders}
          currencySymbol={storeSettings.currencySymbol}
        />
      )}
    </div>
  );
}
