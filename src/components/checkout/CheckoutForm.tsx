"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  AlertCircle,
  Loader2,
  Lock,
  Plus,
  Globe,
  MapPin,
  Sparkles,
  Smartphone,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { placeOrderAction } from "@/actions/orders";
import {
  COUNTRIES,
  PHILIPPINES_REGIONS,
} from "@/lib/constants/philippines-addresses";

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
  codEnabled = false,
  codAllowedAreas = null,
  codMaxAmount = 20000,
  manualPaymentInstructions = null,
  currencySymbol = "₱",
  storeName = "RareFinds",
  userEmail,
  userName,
  paymentMode = "demo",
}: CheckoutFormProps) {
  const router = useRouter();
  const errorRef = React.useRef<HTMLDivElement>(null);

  // Delivery Method state
  type AllowedDeliveryMethod = "PICKUP" | "LOCAL_DELIVERY" | "COURIER";
  const [deliveryMethod, setDeliveryMethod] = React.useState<AllowedDeliveryMethod>("COURIER");

  // Dynamic Shipping Fee Calculation
  const shippingFee = React.useMemo(() => {
    if (deliveryMethod === "PICKUP") return 0;
    if (deliveryMethod === "LOCAL_DELIVERY") return shippingFeeLocal;
    return shippingFeeCourier;
  }, [deliveryMethod, shippingFeeLocal, shippingFeeCourier]);

  const totalAmount = subtotal + shippingFee;

  // Address selection state
  const defaultAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = React.useState<string>(
    defaultAddress ? defaultAddress.id : "new"
  );

  // Cascading Philippine address states
  const initialRegion = PHILIPPINES_REGIONS[0]; // NCR
  const [selectedCountry, setSelectedCountry] = React.useState<string>("PH");
  const [selectedRegionId, setSelectedRegionId] = React.useState<string>(initialRegion.id);
  const [selectedCity, setSelectedCity] = React.useState<string>(initialRegion.cities[0]);
  const [customCity, setCustomCity] = React.useState<string>("");

  // New address form state
  const [newAddress, setNewAddress] = React.useState({
    fullName: userName || "",
    phone: "",
    street: "",
    apartment: "",
    city: initialRegion.cities[0],
    province: initialRegion.name,
    postalCode: "",
    saveToAccount: true,
  });

  // Handle region dropdown change
  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    const reg = PHILIPPINES_REGIONS.find((r) => r.id === regionId) || initialRegion;
    const firstCity = reg.cities[0] || "";
    setSelectedCity(firstCity);
    setCustomCity("");
    setNewAddress((prev) => ({
      ...prev,
      province: reg.name,
      city: firstCity,
    }));
  };

  // Handle city dropdown change
  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    if (cityName !== "__custom__") {
      setNewAddress((prev) => ({
        ...prev,
        city: cityName,
      }));
    } else {
      setNewAddress((prev) => ({
        ...prev,
        city: customCity || "",
      }));
    }
  };

  // Payment method state
  type AllowedPaymentMethod = "COD" | "GCASH" | "MAYA" | "CARD" | "TEST" | "MANUAL_TRANSFER";
  const [paymentMethod, setPaymentMethod] = React.useState<AllowedPaymentMethod>(
    paymentMode === "demo" ? "GCASH" : "COD"
  );
  const [orderNotes, setOrderNotes] = React.useState("");

  const handleDeliveryMethodChange = (method: AllowedDeliveryMethod) => {
    setDeliveryMethod(method);
    if (method === "COURIER" && paymentMethod === "COD") {
      setPaymentMethod(
        paymentMode === "demo"
          ? "GCASH"
          : manualPaymentInstructions
          ? "MANUAL_TRANSFER"
          : "CARD"
      );
    }
  };

  // Submission state
  const [isPending, setIsPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    try {
      const resolvedCity =
        selectedCity === "__custom__" ? customCity.trim() : newAddress.city.trim();

      if (deliveryMethod !== "PICKUP" && !resolvedCity && selectedAddressId === "new") {
        setErrorMessage("Please enter a valid City / Municipality.");
        setIsPending(false);
        return;
      }

      const effectivePaymentMethod =
        deliveryMethod === "COURIER" && paymentMethod === "COD"
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
        ...(deliveryMethod === "PICKUP" && selectedAddressId === "new" && !resolvedCity
          ? {}
          : selectedAddressId !== "new"
          ? { addressId: selectedAddressId }
          : {
              newAddress: {
                fullName: newAddress.fullName.trim() || userName || "Collector",
                phone: newAddress.phone.trim() || "09000000000",
                street: newAddress.street.trim() || "Store Pickup",
                apartment: newAddress.apartment?.trim() || undefined,
                city: resolvedCity || "Pickup",
                province: newAddress.province.trim() || "Pickup",
                postalCode: newAddress.postalCode.trim() || "0000",
                saveToAccount: newAddress.saveToAccount,
              },
            }),
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

  const isPickupAvailable = Boolean(pickupAddress && pickupAddress.trim().length > 0);
  const isLocalDeliveryAvailable = Boolean(localDeliveryAreas && localDeliveryAreas.trim().length > 0);

  const isCodDisabled =
    !codEnabled ||
    deliveryMethod === "COURIER" ||
    totalAmount > codMaxAmount;

  let codDisabledReason = "";
  if (!codEnabled) {
    codDisabledReason = "Cash on Delivery is currently disabled.";
  } else if (deliveryMethod === "COURIER") {
    codDisabledReason = "Advance payment required for nationwide courier shipments.";
  } else if (totalAmount > codMaxAmount) {
    codDisabledReason = `Exceeds max COD limit of ${formatPrice(codMaxAmount, currencySymbol)}.`;
  }

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
                className={`relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  deliveryMethod === "COURIER"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="COURIER"
                      checked={deliveryMethod === "COURIER"}
                      onChange={() => handleDeliveryMethodChange("COURIER")}
                      className="h-4 w-4 text-primary accent-primary"
                    />
                    <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Courier
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-primary">
                    {formatPrice(shippingFeeCourier, currencySymbol)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    Nationwide insured air &amp; land courier. Double-boxed with live tracking.
                  </p>
                </div>
              </label>

              {/* Local Delivery */}
              <label
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  !isLocalDeliveryAvailable
                    ? "opacity-60 cursor-not-allowed bg-secondary/30 border-dashed"
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
                    {formatPrice(shippingFeeLocal, currencySymbol)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    Dedicated express rider handover verified with 4-digit security PIN.
                  </p>
                  {!isLocalDeliveryAvailable && (
                    <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground">
                      No coverage set
                    </Badge>
                  )}
                </div>
              </label>

              {/* Store Pickup */}
              <label
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  !isPickupAvailable
                    ? "opacity-60 cursor-not-allowed bg-secondary/30 border-dashed"
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
                      Vault Pickup
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-emerald-500">
                    FREE
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    Collect directly from our store vault. Zero shipping fee. Valid ID required.
                  </p>
                  {!isPickupAvailable && (
                    <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground">
                      No pickup address set
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
            ) : (
              <>
            {savedAddresses.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Saved Address
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {savedAddresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? "border-primary bg-primary/5 shadow-xs"
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
                      <div className="flex-1 text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{addr.fullName}</span>
                          {addr.isDefault && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">{addr.street}</p>
                        {addr.apartment && <p className="text-muted-foreground">{addr.apartment}</p>}
                        <p className="text-muted-foreground">
                          {addr.city}, {addr.province} {addr.postalCode}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-500 pt-0.5">
                          Phone: {addr.phone}
                        </p>
                      </div>
                    </label>
                  ))}

                  {/* Option for new address */}
                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedAddressId === "new"
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addressSelection"
                      value="new"
                      checked={selectedAddressId === "new"}
                      onChange={() => setSelectedAddressId("new")}
                      className="h-4 w-4 text-primary accent-primary"
                    />
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Plus className="h-3.5 w-3.5" />
                      Add a New Shipping Address
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* New Address Inputs Form (shown if "new" is selected or no saved addresses) */}
            {(selectedAddressId === "new" || savedAddresses.length === 0) && (() => {
              const currentRegion =
                PHILIPPINES_REGIONS.find((r) => r.id === selectedRegionId) ||
                PHILIPPINES_REGIONS[0];

              return (
                <div className="pt-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Recipient Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Recipient Full Name *
                      </label>
                      <Input
                        required
                        value={newAddress.fullName}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, fullName: e.target.value })
                        }
                        placeholder="Juan Dela Cruz"
                        className="h-10 text-xs"
                      />
                    </div>

                    {/* Contact Phone Number */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Contact Phone Number *
                      </label>
                      <Input
                        required
                        type="tel"
                        value={newAddress.phone}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, phone: e.target.value })
                        }
                        placeholder="0917 123 4567"
                        className="h-10 text-xs"
                      />
                    </div>

                    {/* Country / Territory Dropdown */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-primary" />
                          Country / Territory *
                        </span>
                        <span className="text-[10px] text-amber-500 font-medium">
                          Philippines Only (Others Available Soon)
                        </span>
                      </label>
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {COUNTRIES.map((country) => (
                          <option
                            key={country.code}
                            value={country.code}
                            disabled={!country.available}
                            className={!country.available ? "text-muted-foreground bg-muted/30" : "font-medium"}
                          >
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Province / Administrative Region Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        Province / Administrative Region *
                      </label>
                      <select
                        value={selectedRegionId}
                        onChange={(e) => handleRegionChange(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {PHILIPPINES_REGIONS.map((region) => (
                          <option key={region.id} value={region.id}>
                            {region.designation} — {region.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* City / Municipality Cascading Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        City / Municipality *
                      </label>
                      <select
                        value={selectedCity}
                        onChange={(e) => handleCityChange(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {currentRegion.cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                        <option value="__custom__">Other City / Municipality (Type Manually)</option>
                      </select>
                    </div>

                    {/* Custom City Name Input (Shown when __custom__ is picked) */}
                    {selectedCity === "__custom__" && (
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Enter Specific City / Municipality Name *
                        </label>
                        <Input
                          required
                          value={customCity}
                          onChange={(e) => {
                            setCustomCity(e.target.value);
                            setNewAddress((prev) => ({ ...prev, city: e.target.value }));
                          }}
                          placeholder="Type your city or municipality name"
                          className="h-10 text-xs"
                        />
                      </div>
                    )}

                    {/* Street Address & Building */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Street Address & Building *
                      </label>
                      <Input
                        required
                        value={newAddress.street}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, street: e.target.value })
                        }
                        placeholder="e.g. 123 Ayala Avenue, Tower 1 or Street / Purok"
                        className="h-10 text-xs"
                      />
                    </div>

                    {/* Unit / Apartment / Barangay (Optional) */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Unit / Apartment / Barangay (Optional)
                      </label>
                      <Input
                        value={newAddress.apartment}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, apartment: e.target.value })
                        }
                        placeholder="Unit 14B, Purok 5, Brgy. San Lorenzo"
                        className="h-10 text-xs"
                      />
                    </div>

                    {/* Postal / ZIP Code */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Postal / ZIP Code *
                      </label>
                      <Input
                        required
                        value={newAddress.postalCode}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, postalCode: e.target.value })
                        }
                        placeholder="e.g. 1200 or 8600"
                        className="h-10 text-xs"
                      />
                    </div>

                    {/* Save Address to Account Checkbox */}
                    <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                      <Checkbox
                        id="saveAddressCheckbox"
                        checked={newAddress.saveToAccount}
                        onCheckedChange={(checked) =>
                          setNewAddress({ ...newAddress, saveToAccount: !!checked })
                        }
                      />
                      <label
                        htmlFor="saveAddressCheckbox"
                        className="text-xs text-foreground cursor-pointer select-none font-medium"
                      >
                        Save this address to my account for faster future orders
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}
            </>
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
                  <span className="font-bold uppercase tracking-wider block">Demo mode: no real payment will be made.</span>
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
                    ? "opacity-60 cursor-not-allowed bg-secondary/30 border-dashed"
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
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                      Restricted
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Official Delivery
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                  {isCodDisabled
                    ? codDisabledReason
                    : "Pay cash upon courier inspection. Pair is allocated and processed for dispatch."}
                  {codAllowedAreas && !isCodDisabled && (
                    <span className="block text-[10px] text-muted-foreground/80 mt-1">
                      Coverage: {codAllowedAreas}
                    </span>
                  )}
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
                  <span className="font-medium text-foreground">{formatPrice(subtotal, currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {deliveryMethod === "PICKUP" && "In-Store Vault Pickup"}
                    {deliveryMethod === "LOCAL_DELIVERY" && "Local Express Delivery"}
                    {deliveryMethod === "COURIER" && "Insured Courier Shipping"}
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  </span>
                  {shippingFee > 0 ? (
                    <span className="font-semibold text-foreground">{formatPrice(shippingFee, currencySymbol)}</span>
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
                  Every sneaker is inspected in Manila. Exact 1-of-1 pair photographed is shipped double-boxed with serialized authenticity seal.
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
                disabled={isPending}
                size="lg"
                className="w-full font-bold text-sm tracking-wide bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/25 h-12 gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Securing Your Grails...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    {paymentMethod === "COD" && `Place Order (COD) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "MANUAL_TRANSFER" && `Place Order (Manual Transfer) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "GCASH" && `Pay with GCash (Demo) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "MAYA" && `Pay with Maya (Demo) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "CARD" && `Pay with Card (Demo) • ${formatPrice(totalAmount, currencySymbol)}`}
                    {paymentMethod === "TEST" && `Simulate Payment • ${formatPrice(totalAmount, currencySymbol)}`}
                  </>
                )}
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                By placing your order, you agree to RareFinds Terms of Authenticity and 1-of-1 Vault reservation rules.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
