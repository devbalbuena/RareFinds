import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Order History | RareFinds",
  description: "View your past rare sneaker orders and shipping tracking status.",
};

export default async function OrderHistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/account/orders");
  }

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
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-5">
          <div className="p-4 rounded-full bg-secondary text-muted-foreground">
            <Package className="h-10 w-10" />
          </div>

          <div className="space-y-2 max-w-sm">
            <h3 className="text-base font-bold text-foreground">
              No Orders Found in Your Vault
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You haven&apos;t placed any sneaker orders yet. Once checkout and PayMongo payments go live in Phase 4, your order history, receipts, and express courier tracking numbers will appear here.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button asChild size="sm" className="gap-2 font-bold text-xs">
              <Link href="/products">
                Explore The Sneaker Vault <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="pt-6 border-t w-full max-w-xs flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>All orders include physical authenticity guarantee</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
