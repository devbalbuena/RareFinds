"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  AlertCircle,
  Loader2,
  Lock,
  MapPin,
  Sparkles,
  Smartphone,
  Store,
  ExternalLink,
  User,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { placeOrderAction } from "@/actions/orders";
import {
  calculateShippingFee,
  getRegionZone,
} from "@/lib/shipping";

interface SerializedAddress {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  apartment?: string | null;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

interface SerializedCartItem {
  id: string;
  variantId: string;
  quantity: number;
  price: number;
  size: string;
  condition: string;
  isOneOfOne: boolean;
  product: {
    id: string;
    title: string;
    slug: string;
    brandName: string;
    imageUrl: string;
  };
}

interface CheckoutFormProps {
  savedAddresses: SerializedAddress[];
  cartItems: SerializedCartItem[];
  subtotal: number;
  shippingFeeLocal?: number;
  shippingFeeCourier?: number;
  pickupAddress?: string | null;
  pickupInstructions?: string | null;
  localDeliveryAreas?: string | null;
  codEnabled?: boolean;
  codAllowedAreas?: string | null;
  codMaxAmount?: number;
  manualPaymentInstructions?: string | null;
  currencySymbol?: string;
  storeName?: string;
  userEmail: string;
  userName: string;
  paymentMode?: "demo" | "cod_only" | "live";
}

export function CheckoutForm({
  savedAddresses,
  cartItems,
  subtotal,
  shippingFeeLocal = 150,
  shippingFeeCourier = 250,
  pickupAddress = null,
  pickupInstructions = null,
  localDeliveryAreas = null,
  codEnabled = true,
  codAllowedAreas = null,
  codMaxAmount = 500000,
  manualPaymentInstructions = null,
  currencySymbol = "₱",
  storeName = "RareFinds",
  userEmail,
  userName,
  paymentMode = "demo",
}: CheckoutFormProps) {
  const router = useRouter();
  const errorRef = React.useRef<HTMLDivElement>(null);

  // Address selection state (strictly from saved addresses)
  const defaultAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = React.useState<string>(
    defaultAddress ? defaultAddress.id : ""
  );

  const selectedAddress =
    savedAddresses.find((a) => a.id === selectedAddressId) || defaultAddress;

  // Active address resolution for dynamic calculations
  const activeAddressInfo = React.useMemo(() => {
    if (selectedAddress) {
      const zone = getRegionZone(selectedAddress.province);
      return {
        regionName: selectedAddress.province,
        cityName: selectedAddress.city,
        zoneKey: zone.zoneKey,
        isNCR: zone.zoneKey === "NCR",
      };
    }
    return {
      regionName: "Metro Manila",
      cityName: "Taguig City (BGC)",
      zoneKey: "NCR" as const,
      isNCR: true,
    };
  }, [selectedAddress]);

  const isAddressInManila = activeAddressInfo.isNCR;

  // Delivery & Payment Method state
  type AllowedDeliveryMethod = "PICKUP" | "LOCAL_DELIVERY" | "COURIER";
  const [deliveryMethod, setDeliveryMethod] = React.useState<AllowedDeliveryMethod>(() => {
    return defaultAddress && getRegionZone(defaultAddress.province).zoneKey !== "NCR"
      ? "COURIER"
      : "LOCAL_DELIVERY";
  });

  type AllowedPaymentMethod = "COD" | "GCASH" | "MAYA" | "CARD" | "TEST" | "MANUAL_TRANSFER";
  const [paymentMethod, setPaymentMethod] = React.useState<AllowedPaymentMethod>(
    paymentMode === "demo" ? "GCASH" : "COD"
  );

  // Delivery method availability rules
  const isCourierAvailable = !isAddressInManila;
  const isLocalDeliveryAvailable = isAddressInManila;
  const isPickupAvailable =
    isAddressInManila && Boolean(pickupAddress && pickupAddress.trim().length > 0);

  // Automatically adapt delivery method and payment method when address region changes
  React.useEffect(() => {
    if (isAddressInManila) {
      // Address is in Manila: Courier is disabled; auto-select Local Delivery if Courier was chosen
      setDeliveryMethod((prev) => (prev === "COURIER" ? "LOCAL_DELIVERY" : prev));
    } else {
      // Address is outside Manila: Local Express & Self Pickup are disabled; auto-select Courier
      setDeliveryMethod((prev) =>
        prev === "LOCAL_DELIVERY" || prev === "PICKUP" ? "COURIER" : prev
      );
      // COD is not allowed outside Manila; auto-switch to online payment
      setPaymentMethod((prev) =>
        prev === "COD" ? (paymentMode === "demo" ? "GCASH" : "CARD") : prev
      );
    }
  }, [isAddressInManila, paymentMode]);

  // Dynamic calculations for Courier & Local Express
  const courierCalc = React.useMemo(() => {
    return calculateShippingFee({
      deliveryMethod: "COURIER",
      regionIdOrName: activeAddressInfo.regionName,
      cityName: activeAddressInfo.cityName,
    });
  }, [activeAddressInfo]);

  const localExpressCalc = React.useMemo(() => {
    return calculateShippingFee({
      deliveryMethod: "LOCAL_DELIVERY",
      regionIdOrName: activeAddressInfo.regionName,
      cityName: activeAddressInfo.cityName,
    });
  }, [activeAddressInfo]);

  // Selected delivery method shipping calculation
  const shippingCalc = React.useMemo(() => {
    return calculateShippingFee({
      deliveryMethod,
      regionIdOrName: activeAddressInfo.regionName,
      cityName: activeAddressInfo.cityName,
    });
  }, [deliveryMethod, activeAddressInfo]);

  const shippingFee = shippingCalc.fee;
  const totalAmount = subtotal + shippingFee;

  const handleDeliveryMethodChange = (method: AllowedDeliveryMethod) => {
    if (method === "COURIER" && !isCourierAvailable) return;
    if (method === "LOCAL_DELIVERY" && !isLocalDeliveryAvailable) return;
    if (method === "PICKUP" && !isPickupAvailable) return;
    setDeliveryMethod(method);
  };

  const [orderNotes, setOrderNotes] = React.useState("");

  // Submission state
  const [isPending, setIsPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    try {
      if (deliveryMethod !== "PICKUP" && !selectedAddress) {
        setErrorMessage(
          "No delivery address selected. Please add your address in your profile before checking out."
        );
        setIsPending(false);
        return;
      }

      const effectivePaymentMethod =
        !isAddressInManila && paymentMethod === "COD"
          ? paymentMode === "demo"
            ? "GCASH"
            : manualPaymentInstructions
            ? "MANUAL_TRANSFER"
            : "CARD"
          : paymentMethod;

      const payload = {
        deliveryMethod,
        paymentMethod: effectivePaymentMethod,
        notes: orderNotes.trim() || undefined,
        ...(selectedAddress ? { addressId: selectedAddress.id } : {}),
      };

      const res = await placeOrderAction(payload);

      if (res.requiresLogin) {
        router.push("/sign-in?callbackUrl=/checkout");
        return;
      }

      if (res.error) {
        setErrorMessage(res.error);
        setIsPending(false);
        setTimeout(() => {
          errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        return;
      }

      if (res.success && res.orderId) {
        // Broadcast custom event so cart drawer updates count immediately
        window.dispatchEvent(new CustomEvent("cart:updated"));
        // Force full page navigation to order success page
        window.location.href = `/order-success/${res.orderId}`;
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      setIsPending(false);
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  };

  // COD is enabled in Manila; disabled for provincial destinations
  const isCodDisabled = !isAddressInManila;
  const codDisabledReason =
    "Cash on Delivery is available within Metro Manila only. Advance online payment required for provincial shipments.";

  return (
    <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
      {/* Left Column: Shipping & Payment Steps (7 cols) */}
      <div className="lg:col-span-7 space-y-8">
        {/* Error Alert */}
        {errorMessage && (
          <div
            ref={errorRef}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">Checkout Issue</div>
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Step 1: Delivery Method */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              1. Delivery Method
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Nationwide Courier */}
              <label
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  !isCourierAvailable
                    ? "opacity-50 cursor-not-allowed bg-secondary/30 border-dashed"
                    : deliveryMethod === "COURIER"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs cursor-pointer"
                    : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700 cursor-pointer"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="COURIER"
                      disabled={!isCourierAvailable}
                      checked={deliveryMethod === "COURIER"}
                      onChange={() => handleDeliveryMethodChange("COURIER")}
                      className="h-4 w-4 text-primary accent-primary"
                    />
                    <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Courier (Nationwide)
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-primary">
                    {isCourierAvailable
                      ? formatPrice(courierCalc.fee, currencySymbol)
                      : "Provincial Only"}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {isCourierAvailable
                      ? `${courierCalc.zoneName} (${courierCalc.estimatedTransitTime}). Double-boxed insured air & land courier.`
                      : "Standard nationwide courier is reserved for provincial shipments. For Metro Manila, choose Local Express or Self Pickup."}
                  </p>
                  {!isCourierAvailable && (
                    <Badge
                      variant="outline"
                      className="mt-2 text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/10"
                    >
                      Provincial Only
                    </Badge>
                  )}
                </div>
              </label>

              {/* Local Delivery */}
              <label
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  !isLocalDeliveryAvailable
                    ? "opacity-50 cursor-not-allowed bg-secondary/30 border-dashed"
                    : deliveryMethod === "LOCAL_DELIVERY"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs cursor-pointer"
                    : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700 cursor-pointer"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="LOCAL_DELIVERY"
                      disabled={!isLocalDeliveryAvailable}
                      checked={deliveryMethod === "LOCAL_DELIVERY"}
                      onChange={() => handleDeliveryMethodChange("LOCAL_DELIVERY")}
                      className="h-4 w-4 text-primary accent-primary"
                    />
                    <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Local Express
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-primary">
                    {isLocalDeliveryAvailable
                      ? formatPrice(localExpressCalc.fee, currencySymbol)
                      : "Metro Manila Only"}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {isLocalDeliveryAvailable
                      ? `${localExpressCalc.zoneName}. Dedicated express rider handover verified with 4-digit security PIN.`
                      : "Express rider handover is available within Metro Manila cities only."}
                  </p>
                  {!isLocalDeliveryAvailable && (
                    <Badge
                      variant="outline"
                      className="mt-2 text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/10"
                    >
                      Metro Manila Only
                    </Badge>
                  )}
                </div>
              </label>

              {/* Self Pickup (Renamed from Vault Pickup) */}
              <label
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  !isPickupAvailable
                    ? "opacity-50 cursor-not-allowed bg-secondary/30 border-dashed"
                    : deliveryMethod === "PICKUP"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs cursor-pointer"
                    : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700 cursor-pointer"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="PICKUP"
                      disabled={!isPickupAvailable}
                      checked={deliveryMethod === "PICKUP"}
                      onChange={() => handleDeliveryMethodChange("PICKUP")}
                      className="h-4 w-4 text-primary accent-primary"
                    />
                    <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Self Pickup
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-emerald-500">
                    {isPickupAvailable ? "FREE" : "Metro Manila Only"}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {isPickupAvailable
                      ? "Collect directly from our BGC vault. Zero shipping fee. Valid ID required."
                      : "Self pickup is available at our BGC Manila warehouse only. For provincial destinations, choose nationwide courier."}
                  </p>
                  {!isPickupAvailable && (
                    <Badge
                      variant="outline"
                      className="mt-2 text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/10"
                    >
                      Metro Manila Only
                    </Badge>
                  )}
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Shipping Destination / Pickup Details */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {deliveryMethod === "PICKUP" ? "2. Pickup Location" : "2. Delivery Address"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {deliveryMethod === "PICKUP" ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border bg-secondary/20 space-y-3">
                  <div className="flex items-start gap-3">
                    <Store className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-foreground">RareFinds Official Vault Location</div>
                      <p className="text-muted-foreground whitespace-pre-line">{pickupAddress}</p>
                      {pickupInstructions && (
                        <p className="text-[11px] text-amber-500 font-medium pt-1">
                          Notice: {pickupInstructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-dashed bg-secondary/10 flex items-center gap-3 text-xs">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-muted-foreground">
                    Order will be prepared for collection under:{" "}
                    <span className="font-bold text-foreground">{userName || "Collector"}</span> ({userEmail}).
                    Please bring 1 valid government ID upon claiming.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {savedAddresses.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Select Delivery Address
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {savedAddresses.length} saved {savedAddresses.length === 1 ? "address" : "addresses"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {savedAddresses.map((addr) => {
                        const addrZone = getRegionZone(addr.province);
                        const isAddrManila = addrZone.zoneKey === "NCR";

                        return (
                          <label
                            key={addr.id}
                            className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                              selectedAddressId === addr.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                                : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name="addressSelection"
                              value={addr.id}
                              checked={selectedAddressId === addr.id}
                              onChange={() => setSelectedAddressId(addr.id)}
                              className="mt-1 h-4 w-4 text-primary accent-primary"
                            />
                            <div className="flex-1 text-xs space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground">{addr.fullName}</span>
                                {addr.isDefault && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                                    Default
                                  </Badge>
                                )}
                                {isAddrManila ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 h-4 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-semibold"
                                  >
                                    Metro Manila (NCR)
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4 text-blue-500 border-blue-500/30 bg-blue-500/10 font-semibold"
                                  >
                                    Provincial ({addr.province})
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground">{addr.street}</p>
                              {addr.apartment && (
                                <p className="text-muted-foreground">{addr.apartment}</p>
                              )}
                              <p className="text-muted-foreground font-medium">
                                {addr.city}, {addr.province} {addr.postalCode}
                              </p>
                              <p className="font-mono text-[11px] text-zinc-500 pt-0.5 flex items-center gap-1.5">
                                <Phone className="h-3 w-3" />
                                {addr.phone}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Notice & Link to Profile Address Settings */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed bg-secondary/20 text-xs mt-3">
                      <div className="space-y-0.5 text-muted-foreground">
                        <span className="font-semibold text-foreground block">
                          Need to update or change your default shipping address?
                        </span>
                        <p className="text-[11px] leading-relaxed">
                          For security, delivery destinations are configured in your profile settings.
                        </p>
                      </div>
                      <Link
                        href="/account"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-background hover:bg-secondary font-semibold text-foreground text-xs shrink-0 transition-colors cursor-pointer"
                      >
                        Edit Address in Profile
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Empty state when user has no saved addresses */
                  <div className="p-8 rounded-xl border border-dashed text-center space-y-3 bg-secondary/10">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <MapPin className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="font-bold text-sm text-foreground">No Delivery Address Found</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You do not have any saved shipping addresses on file. Please configure your default
                        delivery address in your profile before completing checkout.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Link
                        href="/account"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors"
                      >
                        Go to Profile &amp; Add Address
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Payment Method */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              3. Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Demo Mode Notice Banner */}
            {paymentMode === "demo" && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 flex items-center gap-3 text-xs mb-4">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider block">
                    Demo mode: no real payment will be made.
                  </span>
                  <span className="text-[11px] text-amber-400/80">
                    GCash, Maya, and Card selections immediately simulate verified checkout and mark orders as paid.
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option: COD */}
              <label
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  isCodDisabled
                    ? "opacity-50 cursor-not-allowed bg-secondary/30 border-dashed"
                    : paymentMethod === "COD"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs cursor-pointer"
                    : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700 cursor-pointer"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      disabled={isCodDisabled}
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="h-4 w-4 text-primary accent-primary"
                    />
                    <span className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                      Cash on Delivery
                    </span>
                  </div>
                  {isCodDisabled ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 text-amber-500 border-amber-500/30 bg-amber-500/10"
                    >
                      Metro Manila Only
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-semibold"
                    >
                      Metro Manila Open
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                  {isCodDisabled
                    ? codDisabledReason
                    : "Pay cash upon rider/courier delivery inspection. Pair is allocated and processed for dispatch."}
                </p>
              </label>

              {/* Option: Manual Bank / E-Wallet Transfer */}
              {manualPaymentInstructions && (
                <label
                  className={`relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === "MANUAL_TRANSFER"
                      ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500 shadow-xs"
                      : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="MANUAL_TRANSFER"
                        checked={paymentMethod === "MANUAL_TRANSFER"}
                        onChange={() => setPaymentMethod("MANUAL_TRANSFER")}
                        className="h-4 w-4 text-amber-500 accent-amber-500"
                      />
                      <span className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5 text-amber-500" />
                        Manual Transfer
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Hold &amp; Verify
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                    Direct GCash or Bank transfer. Upload receipt after order; pair reserved pending staff review.
                  </p>
                </label>
              )}

              {/* Demo Payment Methods (Shown when paymentMode === 'demo') */}
              {paymentMode === "demo" && (
                <>
                  {/* GCash Demo */}
                  <label
                    className={`relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "GCASH"
                        ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500 shadow-xs"
                        : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="GCASH"
                          checked={paymentMethod === "GCASH"}
                          onChange={() => setPaymentMethod("GCASH")}
                          className="h-4 w-4 text-blue-500 accent-blue-500"
                        />
                        <span className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5 text-blue-400" />
                          GCash (Demo)
                        </span>
                      </div>
                      <Badge variant="grail" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        Instant Paid
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                      Simulated GCash payment. Instantly approved, vault holds cleared, and marked paid.
                    </p>
                  </label>

                  {/* Maya Demo */}
                  <label
                    className={`relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "MAYA"
                        ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 shadow-xs"
                        : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="MAYA"
                          checked={paymentMethod === "MAYA"}
                          onChange={() => setPaymentMethod("MAYA")}
                          className="h-4 w-4 text-emerald-500 accent-emerald-500"
                        />
                        <span className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                          Maya (Demo)
                        </span>
                      </div>
                      <Badge variant="grail" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        Instant Paid
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                      Simulated Maya wallet checkout. Instantly approved and marked paid.
                    </p>
                  </label>

                  {/* Card Demo */}
                  <label
                    className={`relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "CARD"
                        ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500 shadow-xs"
                        : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="CARD"
                          checked={paymentMethod === "CARD"}
                          onChange={() => setPaymentMethod("CARD")}
                          className="h-4 w-4 text-purple-500 accent-purple-500"
                        />
                        <span className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-purple-400" />
                          Card (Demo)
                        </span>
                      </div>
                      <Badge variant="grail" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        Instant Paid
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                      Simulated Visa / Mastercard payment. Instantly approved and marked paid.
                    </p>
                  </label>
                </>
              )}
            </div>

            {/* Delivery Instructions / Order Notes */}
            <div className="pt-2 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Special Delivery Notes (Optional)
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={2}
                placeholder="Leave with concierge, gate code, or preferred call time..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Order Summary & Placement (5 cols) */}
      <div className="lg:col-span-5">
        <div className="sticky top-24 space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Vault Order Summary</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {cartItems.length} {cartItems.length === 1 ? "pair" : "pairs"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Item List */}
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 text-xs">
                    <div className="relative h-16 w-16 rounded-lg border bg-secondary/30 shrink-0 overflow-hidden">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-bold text-foreground leading-tight line-clamp-1">
                        {item.product.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span>Size US {item.size}</span>
                        <span>•</span>
                        <span>{item.condition}</span>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {formatPrice(item.price)}
                        </span>
                        {item.isOneOfOne && (
                          <span className="text-[10px] text-amber-500 font-bold uppercase">
                            1-of-1
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation breakdown */}
              <div className="border-t pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(subtotal, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {deliveryMethod === "PICKUP" && "In-Store Self Pickup (Free)"}
                    {deliveryMethod === "LOCAL_DELIVERY" &&
                      `Local Express (${shippingCalc.zoneName})`}
                    {deliveryMethod === "COURIER" &&
                      `Insured Courier (${shippingCalc.zoneName})`}
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  </span>
                  {shippingFee > 0 ? (
                    <span className="font-semibold text-foreground">
                      {formatPrice(shippingFee, currencySymbol)}
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-semibold">FREE</span>
                  )}
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>100% Authenticity Guarantee</span>
                  <span className="text-foreground font-semibold">Included</span>
                </div>

                <div className="border-t pt-3 flex items-baseline justify-between">
                  <span className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Total Amount
                  </span>
                  <span className="text-xl font-black text-foreground">
                    {formatPrice(totalAmount, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Guarantee badges */}
              <div className="rounded-lg bg-secondary/50 p-3 space-y-1.5 text-[11px] text-muted-foreground border">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{storeName} Single-Vendor Guarantee</span>
                </div>
                <p className="leading-relaxed">
                  Every sneaker is inspected in Manila. Exact 1-of-1 pair photographed is shipped
                  double-boxed with serialized authenticity seal.{" "}
                  <Link
                    href="/shipping-policy"
                    target="_blank"
                    className="underline text-primary font-semibold hover:text-primary/80"
                  >
                    View Vault Delivery Policy &rarr;
                  </Link>
                </p>
              </div>

              {userEmail && (
                <div className="text-[11px] text-muted-foreground text-center">
                  Order updates sent to <span className="font-semibold text-foreground">{userEmail}</span>
                </div>
              )}

              {/* Inline Error Alert near Submit Button */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1">
                    <span className="font-bold block">Unable to place order</span>
                    <span className="leading-relaxed text-[11px]">{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isPending || (deliveryMethod !== "PICKUP" && !selectedAddress)}
                size="lg"
                className="w-full font-bold text-sm tracking-wide bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/25 h-12 gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Securing Your Grails...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    {paymentMethod === "COD" &&
                      `Place Order (COD) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "MANUAL_TRANSFER" &&
                      `Place Order (Manual Transfer) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "GCASH" &&
                      `Pay with GCash (Demo) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "MAYA" &&
                      `Pay with Maya (Demo) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "CARD" &&
                      `Pay with Card (Demo) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "TEST" &&
                      `Simulate Payment • ${formatPrice(totalAmount, currencySymbol)}`}
                  </>
                )}
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                By placing your order, you agree to RareFinds Terms of Authenticity and 1-of-1 Vault
                reservation rules.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
