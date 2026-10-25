import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { checkAndExpireOrder } from "@/lib/orders/expiry";
import { OrderSuccessActions } from "@/components/orders/OrderSuccessActions";
import { OrderTrackingTimeline } from "@/components/orders/OrderTrackingTimeline";
import { CustomerVaultReceipt } from "@/components/orders/CustomerVaultReceipt";
import { ManualPaymentProofDropzone } from "@/components/orders/ManualPaymentProofDropzone";
import { getStoreSettings } from "@/lib/settings";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  Package,
  MapPin,
  ArrowLeft,
  Calendar,
  ChevronRight,
} from "lucide-react";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  props: OrderDetailPageProps
): Promise<Metadata> {
  const { id } = await props.params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { orderNumber: true },
  });

  return {
    title: order ? `Order ${order.orderNumber} | RareFinds Vault` : "Order Details",
  };
}

const statusBadgeConfig: Record<
  string,
  { label: string; className: string }
> = {
  PENDING_PAYMENT: {
    label: "Pending Payment",
    className: "border-amber-500/30 text-amber-500 bg-amber-500/10",
  },
  PENDING: {
    label: "Pending Confirmation",
    className: "border-blue-500/30 text-blue-500 bg-blue-500/10",
  },
  PAID: {
    label: "Paid & Secured",
    className: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
  },
  PROCESSING: {
    label: "Processing",
    className: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
  },
  SHIPPED: {
    label: "Shipped",
    className: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  },
  DELIVERED: {
    label: "Delivered",
    className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "text-zinc-500 border-zinc-800",
  },
  EXPIRED: {
    label: "Hold Expired",
    className: "text-red-400 border-red-500/30 bg-red-500/5",
  },
};

export default async function OrderDetailPage(props: OrderDetailPageProps) {
  const { id } = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/account/orders/${id}`);
  }

  // Lazy expiry check
  await checkAndExpireOrder(id);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  // Server-side authorization check: user must own order or have permission to view orders
  if (order.userId !== session.user.id && !can(session.user.role, "order:view")) {
    redirect("/account/orders");
  }

  const storeSettings = await getStoreSettings();
  const address = order.shippingAddress as Record<string, string>;
  const statusInfo = statusBadgeConfig[order.status] || {
    label: order.status,
    className: "border-zinc-800 text-zinc-400",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2">
        <Link href="/account" className="hover:text-foreground transition-colors">
          Account
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/account/orders" className="hover:text-foreground transition-colors">
          Orders
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-semibold truncate">{order.orderNumber}</span>
      </nav>

      {/* Header Info */}
      <div className="border-b pb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                {order.orderNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
              {order.isSimulated && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-purple-500/30 bg-purple-500/10 text-purple-400">
                  DEMO PAYMENT
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
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

          <div className="flex items-center gap-2 flex-wrap">
            <CustomerVaultReceipt
              orderNumber={order.orderNumber}
              createdAt={order.createdAt.toISOString()}
              status={order.status}
              paymentMethod={order.paymentMethod}
              deliveryMethod={order.deliveryMethod}
              customerName={address?.fullName || order.customerName || "Collector"}
              customerEmail={order.customerEmail}
              customerPhone={address?.phone || order.customerPhone || undefined}
              shippingAddress={address || {}}
              items={order.items.map((i) => ({
                id: i.id,
                productTitle: i.productTitle,
                variantDetails: i.variantDetails,
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                subtotal: Number(i.subtotal),
              }))}
              subtotal={Number(order.subtotal)}
              shippingFee={Number(order.shippingFee)}
              totalAmount={Number(order.totalAmount)}
              currencySymbol={storeSettings.currencySymbol}
              storeName={storeSettings.storeName}
              qcVerifiedAt={order.qcVerifiedAt ? order.qcVerifiedAt.toISOString() : null}
            />

            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/account/orders">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to All Orders
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Actions (Simulate Payment / Hold Countdown / Cancel) */}
      <OrderSuccessActions
        orderId={order.id}
        orderNumber={order.orderNumber}
        initialStatus={order.status}
        initialPaymentStatus={order.paymentStatus}
        paymentMethod={order.paymentMethod}
        expiresAt={order.expiresAt ? order.expiresAt.toISOString() : null}
      />

      {/* Manual Bank / GCash Transfer Receipt Dropzone */}
      {order.paymentMethod === "MANUAL_TRANSFER" && (
        <ManualPaymentProofDropzone
          orderId={order.id}
          orderNumber={order.orderNumber}
          initialProofKey={order.paymentProofKey}
          uploadedAt={order.paymentProofUploadedAt ? order.paymentProofUploadedAt.toISOString() : null}
          instructions={storeSettings.manualPaymentInstructions}
          expiresAt={order.expiresAt ? order.expiresAt.toISOString() : null}
        />
      )}

      {/* Live Visual Courier Tracking Timeline */}
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
        {/* Shipping Address (1 col) */}
        <Card className="md:col-span-1">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Delivery Destination
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

        {/* Ordered Items (2 cols) */}
        <Card className="md:col-span-2">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-primary" />
                Items Snapshot
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
                      {formatPrice(Number(item.subtotal), storeSettings.currencySymbol)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal Calculation */}
            <div className="border-t pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(Number(order.subtotal), storeSettings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping Fee</span>
                <span className="text-emerald-500 font-semibold">
                  {Number(order.shippingFee) === 0 ? "FREE" : formatPrice(Number(order.shippingFee), storeSettings.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Payment Method</span>
                <span className="font-semibold text-foreground">
                  {order.paymentMethod === "COD"
                    ? "Cash on Delivery (COD)"
                    : `${order.paymentMethod} (Demo Payment)`}
                </span>
              </div>
              {order.paymentReference && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Reference ID</span>
                  <span className="font-mono text-[11px] text-foreground">
                    {order.paymentReference}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-sm text-foreground">
                <span>Total Amount</span>
                <span>{formatPrice(Number(order.totalAmount), storeSettings.currencySymbol)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
