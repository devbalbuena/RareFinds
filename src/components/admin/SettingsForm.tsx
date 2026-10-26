"use client";

import * as React from "react";
import { updateStoreSettingsAction } from "@/actions/settings";
import { SiteConfig } from "@/lib/site.config";
import {
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  Mail,
  Truck,
  CreditCard,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SettingsFormProps {
  initialSettings: SiteConfig;
}

type TabKey = "branding" | "logistics" | "payments";

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>("branding");
  const [formData, setFormData] = React.useState({
    storeName: initialSettings.storeName,
    storeTagline: initialSettings.storeTagline || "",
    contactEmail: initialSettings.contactEmail,
    contactPhone: initialSettings.contactPhone,
    address: initialSettings.address,
    currency: initialSettings.currency,
    currencySymbol: initialSettings.currencySymbol,
    shippingFee: initialSettings.shippingFee,
    shippingFeeLocal: initialSettings.shippingFeeLocal ?? 150,
    shippingFeeCourier: initialSettings.shippingFeeCourier ?? 250,
    pickupAddress: initialSettings.pickupAddress || "",
    pickupInstructions: initialSettings.pickupInstructions || "",
    localDeliveryAreas: initialSettings.localDeliveryAreas || "",
    codEnabled: initialSettings.codEnabled ?? false,
    codAllowedAreas: initialSettings.codAllowedAreas || "",
    codMaxAmount: initialSettings.codMaxAmount ?? 20000,
    manualPaymentInstructions: initialSettings.manualPaymentInstructions || "",
    manualPaymentHoldMinutes: initialSettings.manualPaymentHoldMinutes ?? 60,
    autoCompleteDays: initialSettings.autoCompleteDays ?? 3,
  });

  const [isPending, setIsPending] = React.useState(false);
  const [alert, setAlert] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setIsPending(true);

    const res = await updateStoreSettingsAction({
      storeName: formData.storeName.trim(),
      storeTagline: formData.storeTagline.trim() || undefined,
      contactEmail: formData.contactEmail.trim(),
      contactPhone: formData.contactPhone.trim(),
      address: formData.address.trim(),
      currency: formData.currency.trim(),
      currencySymbol: formData.currencySymbol.trim(),
      shippingFee: Number(formData.shippingFee),
      shippingFeeLocal: Number(formData.shippingFeeLocal),
      shippingFeeCourier: Number(formData.shippingFeeCourier),
      pickupAddress: formData.pickupAddress.trim() || null,
      pickupInstructions: formData.pickupInstructions.trim() || null,
      localDeliveryAreas: formData.localDeliveryAreas.trim() || null,
      codEnabled: formData.codEnabled,
      codAllowedAreas: formData.codAllowedAreas.trim() || null,
      codMaxAmount: Number(formData.codMaxAmount),
      manualPaymentInstructions: formData.manualPaymentInstructions.trim() || null,
      manualPaymentHoldMinutes: Number(formData.manualPaymentHoldMinutes),
      autoCompleteDays: Number(formData.autoCompleteDays),
    });

    setIsPending(false);

    if (res.error) {
      setAlert({ type: "error", message: res.error });
      return;
    }

    setAlert({
      type: "success",
      message: "Store configuration saved and cached storefront assets revalidated.",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-zinc-900">
      {/* Top Bar with Tabs and Sticky Save Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("branding")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "branding"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 ${activeTab === "branding" ? "text-amber-500" : "text-zinc-400"}`} />
            <span>Branding &amp; Channels</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logistics")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "logistics"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Truck className={`w-3.5 h-3.5 ${activeTab === "logistics" ? "text-emerald-500" : "text-zinc-400"}`} />
            <span>Fulfillment &amp; Shipping</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "payments"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <CreditCard className={`w-3.5 h-3.5 ${activeTab === "payments" ? "text-indigo-500" : "text-zinc-400"}`} />
            <span>Payments &amp; COD Rules</span>
          </button>
        </div>

        {/* Quick Save Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-9 px-5 gap-2 cursor-pointer shadow-xs shrink-0 self-end sm:self-auto"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span>Save Changes</span>
        </Button>
      </div>

      {alert && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in shadow-2xs font-medium ${
            alert.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {alert.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* TAB 1: BRANDING & CONTACT */}
      {activeTab === "branding" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Building2 className="h-4 w-4 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Store Identity &amp; Positioning
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Store Brand Name *
                </label>
                <Input
                  required
                  value={formData.storeName}
                  onChange={(e) =>
                    setFormData({ ...formData, storeName: e.target.value })
                  }
                  placeholder="e.g. RareFinds Manila"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-semibold"
                />
                <p className="text-[10px] text-zinc-500">
                  Reflected across header logos, digital certificates, and customer receipts.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Brand Tagline
                </label>
                <Input
                  value={formData.storeTagline}
                  onChange={(e) =>
                    setFormData({ ...formData, storeTagline: e.target.value })
                  }
                  placeholder="e.g. The Vault of Grails & Deadstock Kicks"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Mail className="h-4 w-4 text-sky-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Customer Support &amp; Dispatch Location
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Official Support Email *
                </label>
                <Input
                  required
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  placeholder="concierge@rarefinds.ph"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Contact Phone / Mobile *
                </label>
                <Input
                  required
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="+63 917 888 9999"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Vault Central Dispatch Address *
                </label>
                <Input
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="BGC High Street, Taguig City, Metro Manila"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                />
                <p className="text-[10px] text-zinc-500">
                  Baseline origin address used for NCR local express calculations and security verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FULFILLMENT & LOGISTICS */}
      {activeTab === "logistics" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Truck className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Philippine Courier &amp; Local Express Rates
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Local Rider Base Fee (₱) *
                </label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={formData.shippingFeeLocal}
                  onChange={(e) =>
                    setFormData({ ...formData, shippingFeeLocal: Number(e.target.value) })
                  }
                  placeholder="150"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono font-bold"
                />
                <p className="text-[10px] text-zinc-500">
                  Same-day dedicated motorbike / car courier within Metro Manila.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Nationwide Air Courier Base Fee (₱) *
                </label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={formData.shippingFeeCourier}
                  onChange={(e) =>
                    setFormData({ ...formData, shippingFeeCourier: Number(e.target.value) })
                  }
                  placeholder="250"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono font-bold"
                />
                <p className="text-[10px] text-zinc-500">
                  Insured air parcel service (LBC / J&amp;T Express) across Luzon, Visayas &amp; Mindanao.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Local Express Serviced Cities / Regions
                </label>
                <Input
                  value={formData.localDeliveryAreas}
                  onChange={(e) =>
                    setFormData({ ...formData, localDeliveryAreas: e.target.value })
                  }
                  placeholder="Metro Manila, NCR, Taguig, Makati, Manila, Quezon City, Pasig, Mandaluyong, San Juan"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                />
                <p className="text-[10px] text-zinc-500">
                  Comma-separated keywords. Customers outside these regions will automatically default to Nationwide Air Courier.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <MapPin className="h-4 w-4 text-blue-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                VIP Vault Self-Pickup Configuration
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Vault Pickup Location Address
                </label>
                <Input
                  value={formData.pickupAddress}
                  onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                  placeholder="RareFinds VIP Lounge, 2F Bonifacio High Street, Taguig, Metro Manila"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                />
                <p className="text-[10px] text-zinc-500">
                  {formData.pickupAddress.trim()
                    ? "✓ Store pickup is currently AVAILABLE at checkout (Free ₱0)."
                    : "⚠️ Store pickup is UNAVAILABLE at checkout until an address is filled in."}
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Pickup Instructions for Customer
                </label>
                <Input
                  value={formData.pickupInstructions}
                  onChange={(e) =>
                    setFormData({ ...formData, pickupInstructions: e.target.value })
                  }
                  placeholder="Vault Open: Mon-Sun 11:00 AM - 8:00 PM. Please present 1 valid government ID and your digital order confirmation."
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                />
              </div>
            </div>

            {/* Live Checkout Logistics Preview */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5 mt-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Buyer Checkout Delivery Rates Preview</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Metro Manila Express</div>
                  <div className="text-base font-black font-mono text-zinc-900 mt-0.5">
                    ₱{Number(formData.shippingFeeLocal || 0).toLocaleString("en-PH")}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">Dedicated Same-Day Rider</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Provincial Air Express</div>
                  <div className="text-base font-black font-mono text-zinc-900 mt-0.5">
                    ₱{Number(formData.shippingFeeCourier || 0).toLocaleString("en-PH")}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">LBC / J&T Insured Flight</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Vault Store Pickup</div>
                  <div className="text-base font-black font-mono text-emerald-700 mt-0.5">
                    FREE
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1 truncate" title={formData.pickupAddress || "Not configured"}>
                    {formData.pickupAddress ? "Pickup Available" : "Disabled (No Address)"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS & COD */}
      {activeTab === "payments" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  Cash on Delivery (COD) Safeguards
                </h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                <input
                  type="checkbox"
                  checked={formData.codEnabled}
                  onChange={(e) => setFormData({ ...formData, codEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-400"
                />
                Enable COD
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Maximum COD Order Total (₱) *
                </label>
                <Input
                  required
                  type="number"
                  min="1000"
                  step="500"
                  value={formData.codMaxAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, codMaxAmount: Number(e.target.value) })
                  }
                  placeholder="500000"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono font-bold"
                />
                <p className="text-[10px] text-zinc-500">
                  Orders exceeding this threshold must be paid online via GCash, Maya, or Bank.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Allowed COD Areas (Metro Manila / Local Only)
                </label>
                <Input
                  value={formData.codAllowedAreas}
                  onChange={(e) => setFormData({ ...formData, codAllowedAreas: e.target.value })}
                  placeholder="Metro Manila, NCR, Taguig, Makati, Manila, Quezon City, Pasig, Mandaluyong, San Juan, Parañaque, Pasay, Las Piñas, Muntinlupa"
                  className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                />
                <p className="text-[10px] text-zinc-500">
                  Provincial orders are automatically restricted from COD to safeguard courier transit insurance.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Manual Bank &amp; GCash Transfer Details
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Payment Instructions &amp; Account Numbers
                </label>
                <textarea
                  rows={4}
                  value={formData.manualPaymentInstructions}
                  onChange={(e) =>
                    setFormData({ ...formData, manualPaymentInstructions: e.target.value })
                  }
                  placeholder="GCash: 0917-123-4567 (RareFinds Manila)&#10;BDO Unibank: 0012-3456-7890 (RareFinds Sneaker Vault Inc.)"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-mono leading-relaxed"
                />
                <p className="text-[10px] text-zinc-500">
                  {formData.manualPaymentInstructions.trim()
                    ? "✓ Manual Transfer is AVAILABLE at checkout. Customers can upload transfer receipts."
                    : "⚠️ Manual Transfer is UNAVAILABLE at checkout until payment instructions are set."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                    Hold Reservation Expiry (Minutes) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="15"
                    max="1440"
                    value={formData.manualPaymentHoldMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        manualPaymentHoldMinutes: Number(e.target.value),
                      })
                    }
                    placeholder="60"
                    className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Window allocated for buyer to submit transfer slip before sneakers are restocked.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                    Auto-Complete Delivery (Days) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="1"
                    max="30"
                    value={formData.autoCompleteDays}
                    onChange={(e) =>
                      setFormData({ ...formData, autoCompleteDays: Number(e.target.value) })
                    }
                    placeholder="3"
                    className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Days after delivery before an untouched order auto-completes and releases vault escrow.
                  </p>
                </div>
              </div>

              {/* Live Payment & Hold Safeguards Preview */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-2.5 mt-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-900">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Live Payment Safeguards &amp; Reservation Hold Preview</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">COD Availability</div>
                    <div className={`text-sm font-black mt-0.5 ${formData.codEnabled ? "text-emerald-700" : "text-zinc-500"}`}>
                      {formData.codEnabled ? "Enabled" : "Disabled"}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {formData.codEnabled ? `Up to ₱${Number(formData.codMaxAmount || 0).toLocaleString("en-PH")}` : "Online payment required"}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">Bank / GCash Hold</div>
                    <div className="text-sm font-black font-mono text-amber-700 mt-0.5">
                      {formData.manualPaymentHoldMinutes} Minutes
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">Sneaker locked before auto-release</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">Auto-Complete Timer</div>
                    <div className="text-sm font-black font-mono text-zinc-900 mt-0.5">
                      {formData.autoCompleteDays} Days
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">Post-delivery escrow settlement</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Save Action Bar */}
      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
        <span className="text-xs text-zinc-500">
          Changes will immediately apply to storefront calculations and admin verification.
        </span>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-9 px-6 gap-2 cursor-pointer shadow-xs"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span>Save Store Configuration</span>
        </Button>
      </div>
    </form>
  );
}
