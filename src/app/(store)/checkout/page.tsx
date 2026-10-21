import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { ShoppingBag, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoreSettings } from "@/lib/settings";
import { getPaymentMode } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Secure Checkout | RareFinds Vault",
  description: "Complete your rare & limited-edition sneaker order with single-vendor authenticity.",
};

export default async function CheckoutPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/checkout");
  }

  const userId = session.user.id;

  const [user, cart] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
      },
    }),
    prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    brand: true,
                    images: {
                      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-tight">
            Your Cart is Empty
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You don&apos;t have any rare sneakers in your cart yet. Explore our vault to secure your next holy grail.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full bg-amber-500 hover:bg-amber-600 text-black font-bold">
          <Link href="/products">
            Explore Vault Catalog <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  // Serialize addresses to plain JSON objects
  const serializedAddresses = (user?.addresses || []).map((addr) => ({
    id: addr.id,
    fullName: addr.fullName,
    phone: addr.phone,
    street: addr.street,
    apartment: addr.apartment,
    city: addr.city,
    province: addr.province,
    postalCode: addr.postalCode,
    isDefault: addr.isDefault,
  }));

  // Serialize cart items with live database prices
  const serializedCartItems = cart.items.map((item) => {
    const v = item.variant;
    return {
      id: item.id,
      variantId: v.id,
      quantity: item.quantity,
      price: Number(v.price), // Always from database
      size: v.size,
      condition: v.condition,
      isOneOfOne: v.isOneOfOne,
      product: {
        id: v.product.id,
        title: v.product.title,
        slug: v.product.slug,
        brandName: v.product.brand.name,
        imageUrl:
          v.product.images.find((img) => img.isPrimary)?.url ||
          v.product.images[0]?.url ||
          "/placeholder.png",
      },
    };
  });

  const subtotal = serializedCartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const settings = await getStoreSettings();
  const paymentMode = getPaymentMode();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Checkout Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
        <div className="space-y-1">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Continue Shopping
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            Vault Checkout
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete your order with single-vendor authenticity verification.
          </p>
        </div>
      </div>

      {/* Main Interactive Checkout Form */}
      <CheckoutForm
        savedAddresses={serializedAddresses}
        cartItems={serializedCartItems}
        subtotal={subtotal}
        shippingFeeLocal={settings.shippingFeeLocal}
        shippingFeeCourier={settings.shippingFeeCourier}
        pickupAddress={settings.pickupAddress}
        pickupInstructions={settings.pickupInstructions}
        localDeliveryAreas={settings.localDeliveryAreas}
        codEnabled={settings.codEnabled}
        codAllowedAreas={settings.codAllowedAreas}
        codMaxAmount={settings.codMaxAmount}
        manualPaymentInstructions={settings.manualPaymentInstructions}
        currencySymbol={settings.currencySymbol}
        storeName={settings.storeName}
        userEmail={user?.email || session.user.email || ""}
        userName={user?.name || session.user.name || ""}
        paymentMode={paymentMode}
      />
    </div>
  );
}
