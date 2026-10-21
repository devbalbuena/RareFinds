import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { checkAndExpireOrder } from "@/lib/orders/expiry";
import { OrderSuccessActions } from "@/components/orders/OrderSuccessActions";
import { OrderTrackingTimeline } from "@/components/orders/OrderTrackingTimeline";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  Package,
  MapPin,
  ArrowRight,
  Calendar,
} from "lucide-react";

interface OrderSuccessPageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata(
  props: OrderSuccessPageProps
): Promise<Metadata> {
  const { orderId } = await props.params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  });

  return {
    title: order ? `Order ${order.orderNumber} | RareFinds` : "Order Confirmation",
  };
}

export default async function OrderSuccessPage(props: OrderSuccessPageProps) {
  const { orderId } = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/order-success/${orderId}`);
  }

  // Lazy expiry check on read
  await checkAndExpireOrder(orderId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  // Server-side authorization check: Only the order owner or staff/admin can view
  if (order.userId !== session.user.id && !can(session.user.role, "order:view")) {
    redirect("/products");
  }

  const address = order.shippingAddress as Record<string, string>;

  const statusVariantMap: Record<string, "default" | "secondary" | "grail" | "outline"> = {
    PENDING_PAYMENT: "grail",
    PENDING: "secondary",
    PAID: "default",
    SHIPPED: "default",
    DELIVERED: "default",
    CANCELLED: "outline",
    EXPIRED: "outline",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Header Confirmation Banner */}
      <div className="border-b pb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-muted-foreground uppercase">
                Order Reference
              </span>
              <Badge variant={statusVariantMap[order.status] || "secondary"} className="text-xs">
                {order.status.replace(/_/g, " ")}
              </Badge>
              {order.isSimulated && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10 text-[10px] font-mono uppercase tracking-wider">
                  DEMO PAYMENT
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              {order.orderNumber}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Placed on {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/account/orders">
                <Package className="mr-1.5 h-3.5 w-3.5" />
                View Order History
              </Link>
            </Button>
            <Button asChild size="sm" className="text-xs font-semibold">
              <Link href="/products">
                Vault Catalog
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Actions Banner (Simulate Payment / Hold Countdown / Cancel) */}
      <OrderSuccessActions
        orderId={order.id}
        orderNumber={order.orderNumber}
        initialStatus={order.status}
        initialPaymentStatus={order.paymentStatus}
        paymentMethod={order.paymentMethod}
        expiresAt={order.expiresAt ? order.expiresAt.toISOString() : null}
        isSimulated={order.isSimulated}
      />

      {/* Visual Courier Fulfillment Journey & Tracking */}
      <OrderTrackingTimeline
        orderId={order.id}
        status={order.status}
        paymentStatus={order.paymentStatus}
        paymentMethod={order.paymentMethod}
        deliveryMethod={order.deliveryMethod}
        deliveryPin={order.deliveryPin}
        shippingCarrier={order.shippingCarrier}
        trackingNumber={order.trackingNumber}
        createdAt={order.createdAt.toISOString()}
        paidAt={order.paidAt ? order.paidAt.toISOString() : null}
        qcVerifiedAt={order.qcVerifiedAt ? order.qcVerifiedAt.toISOString() : null}
        shippedAt={order.shippedAt ? order.shippedAt.toISOString() : null}
        deliveredAt={order.deliveredAt ? order.deliveredAt.toISOString() : null}
        customerConfirmedAt={order.customerConfirmedAt ? order.customerConfirmedAt.toISOString() : null}
        problemReportedAt={order.problemReportedAt ? order.problemReportedAt.toISOString() : null}
        problemReason={order.problemReason}
        autoCompleteAt={order.autoCompleteAt ? order.autoCompleteAt.toISOString() : null}
        cancelledAt={order.cancelledAt ? order.cancelledAt.toISOString() : null}
      />

      {/* Order Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shipping Destination Card (1 col) */}
        <Card className="md:col-span-1">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Shipping Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-xs space-y-2 text-muted-foreground leading-relaxed">
            <div className="font-bold text-foreground">{address?.fullName}</div>
            <p>{address?.street}</p>
            {address?.apartment && <p>{address.apartment}</p>}
            <p>
              {address?.city}, {address?.province} {address?.postalCode}
            </p>
            <p className="font-mono text-[11px] text-zinc-500 pt-1">
              Contact: {address?.phone}
            </p>
            <p className="font-mono text-[11px] text-zinc-500">
              Email: {order.customerEmail}
            </p>
          </CardContent>
        </Card>

        {/* Ordered Items Summary (2 cols) */}
        <Card className="md:col-span-2">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-primary" />
                Ordered Holy Grails
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {order.items.length} {order.items.length === 1 ? "pair" : "pairs"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs items-center justify-between pb-3 border-b last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 rounded-lg border bg-secondary/30 shrink-0 overflow-hidden">
                      {item.productImageUrl ? (
                        <Image
                          src={item.productImageUrl}
                          alt={item.productTitle}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-foreground leading-tight">
                        {item.productTitle}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.variantDetails}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Qty: {item.quantity}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-foreground">
                      {formatPrice(Number(item.subtotal))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal Calculation */}
            <div className="border-t pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping Fee</span>
                <span className="text-emerald-500 font-semibold">
                  {Number(order.shippingFee) === 0 ? "FREE" : formatPrice(Number(order.shippingFee))}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Payment Method</span>
                <span className="font-semibold text-foreground">
                  {order.paymentMethod === "GCASH"
                    ? "GCash (Demo)"
                    : order.paymentMethod === "MAYA"
                    ? "Maya (Demo)"
                    : order.paymentMethod === "CARD"
                    ? "Credit/Debit Card (Demo)"
                    : order.paymentMethod === "TEST"
                    ? "Test Payment (Simulated)"
                    : "Cash on Delivery (COD)"}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-sm text-foreground">
                <span>Total Amount</span>
                <span>{formatPrice(Number(order.totalAmount))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
