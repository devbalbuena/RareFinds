"use client";

import * as React from "react";
import { updateStoreSettingsAction } from "@/actions/settings";
import { SiteConfig } from "@/lib/site.config";
import {
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building,
  Mail,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SettingsFormProps {
  initialSettings: SiteConfig;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl text-zinc-900">
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

      {/* Section 1: Store Identity */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
          <Building className="h-4 w-4 text-amber-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
            Store Identity &amp; Branding
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
              placeholder="e.g. RareFinds"
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
            />
            <p className="text-[10px] text-zinc-500">
              Appears in the header logo, footer copyright, and order confirmation documents.
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
              placeholder="e.g. Rare & Limited Sneaker Vault"
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Contact Information */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
          <Mail className="h-4 w-4 text-sky-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
            Contact &amp; Customer Support
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Official Contact Email *
            </label>
            <Input
              required
              type="email"
              value={formData.contactEmail}
              onChange={(e) =>
                setFormData({ ...formData, contactEmail: e.target.value })
              }
              placeholder="contact@rarefinds.ph"
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
              placeholder="+63 917 123 4567"
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Physical / Dispatch Vault Address *
            </label>
            <Input
              required
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Manila, Philippines"
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Currency & Shipping Fees */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
          <Coins className="h-4 w-4 text-emerald-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
            Currency &amp; Delivery Methods
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Currency Code *
            </label>
            <Input
              required
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value.toUpperCase() })
              }
              placeholder="PHP"
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Currency Symbol *
            </label>
            <Input
              required
              value={formData.currencySymbol}
              onChange={(e) =>
                setFormData({ ...formData, currencySymbol: e.target.value })
              }
              placeholder="₱"
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Local Rider Shipping Fee (₱) *
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
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono"
            />
            <p className="text-[10px] text-zinc-500">
              Applied for Same-Day Local Delivery (Grab, Lalamove, Maxim).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Nationwide Courier Shipping Fee (₱) *
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
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono"
            />
            <p className="text-[10px] text-zinc-500">
              Applied for nationwide express couriers (LBC, J&amp;T, 2GO).
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Local Delivery Serviced Areas (Exact Match)
            </label>
            <Input
              value={formData.localDeliveryAreas}
              onChange={(e) =>
                setFormData({ ...formData, localDeliveryAreas: e.target.value })
              }
              placeholder="Metro Manila, San Juan, Quezon City, Makati, Taguig, Pasig, Mandaluyong, Manila"
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
            />
            <p className="text-[10px] text-zinc-500">
              Comma-separated cities or provinces where local same-day delivery is available. Leave empty to disable local delivery.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Vault Pickup Address
            </label>
            <Input
              value={formData.pickupAddress}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
              placeholder="RareFinds Vault, 4F Greenhills Mall, San Juan, Metro Manila"
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
              Store Pickup Instructions
            </label>
            <Input
              value={formData.pickupInstructions}
              onChange={(e) =>
                setFormData({ ...formData, pickupInstructions: e.target.value })
              }
              placeholder="Present your Order Reference and 1 valid government ID upon collection."
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Cash on Delivery (COD) Rules */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-purple-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Cash on Delivery (COD) Safeguards
            </h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800">
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
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Allowed COD Areas (Local / Pickup Only)
            </label>
            <Input
              value={formData.codAllowedAreas}
              onChange={(e) => setFormData({ ...formData, codAllowedAreas: e.target.value })}
              placeholder="Metro Manila, San Juan, Quezon City, Makati, Taguig, Pasig, Mandaluyong, Manila"
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
            />
            <p className="text-[10px] text-zinc-500">
              Comma-separated list of cities or provinces. Nationwide courier orders cannot use COD.
            </p>
          </div>

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
              placeholder="20000"
              className="h-10 text-xs bg-white border-zinc-300 text-zinc-900 font-mono"
            />
            <p className="text-[10px] text-zinc-500">
              Orders whose grand total (including shipping) exceeds this threshold must be prepaid.
            </p>
          </div>
        </div>
      </div>

      {/* Section 5: Manual Bank & GCash Transfer */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
          <Coins className="h-4 w-4 text-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
            Manual Bank &amp; GCash Transfer
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
              Payment Instructions &amp; Account Details
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
                Reservation hold window for customer to upload transfer receipt.
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
                Days after staff marks delivered before an untouched order auto-completes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-10 px-6 gap-2 cursor-pointer shadow-xs"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Save Store Configuration</span>
        </Button>
      </div>
    </form>
  );
}
