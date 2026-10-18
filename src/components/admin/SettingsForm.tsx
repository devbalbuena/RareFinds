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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {alert && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
            alert.type === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}
        >
          {alert.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{alert.message}</span>
        </div>
      )}

      {/* Section 1: Store Identity */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Building className="h-4 w-4 text-amber-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Store Identity &amp; Branding
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Store Brand Name *
            </label>
            <Input
              required
              value={formData.storeName}
              onChange={(e) =>
                setFormData({ ...formData, storeName: e.target.value })
              }
              placeholder="e.g. RareFinds"
              className="h-10 text-xs bg-zinc-900 border-zinc-800 text-white"
            />
            <p className="text-[10px] text-zinc-500">
              Appears in the header logo, footer copyright, and order confirmation documents.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Brand Tagline
            </label>
            <Input
              value={formData.storeTagline}
              onChange={(e) =>
                setFormData({ ...formData, storeTagline: e.target.value })
              }
              placeholder="e.g. Rare & Limited Sneaker Vault"
              className="h-10 text-xs bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Contact Information */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Mail className="h-4 w-4 text-sky-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Contact &amp; Customer Support
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
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
              className="h-10 text-xs bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Contact Phone / Mobile *
            </label>
            <Input
              required
              value={formData.contactPhone}
              onChange={(e) =>
                setFormData({ ...formData, contactPhone: e.target.value })
              }
              placeholder="+63 917 123 4567"
              className="h-10 text-xs bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Physical / Dispatch Vault Address *
            </label>
            <Input
              required
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Manila, Philippines"
              className="h-10 text-xs bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Currency & Shipping Fees */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Coins className="h-4 w-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Currency &amp; Base Shipping
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Currency Code *
            </label>
            <Input
              required
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value.toUpperCase() })
              }
              placeholder="PHP"
              className="h-10 text-xs bg-zinc-900 border-zinc-800 text-white font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Currency Symbol *
            </label>
            <Input
              required
              value={formData.currencySymbol}
              onChange={(e) =>
                setFormData({ ...formData, currencySymbol: e.target.value })
              }
              placeholder="₱"
              className="h-10 text-xs bg-zinc-900 border-zinc-800 text-white font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Standard Shipping Fee *
            </label>
            <Input
              required
              type="number"
              min="0"
              step="1"
              value={formData.shippingFee}
              onChange={(e) =>
                setFormData({ ...formData, shippingFee: Number(e.target.value) })
              }
              placeholder="0 for Free Delivery"
              className="h-10 text-xs bg-zinc-900 border-zinc-800 text-white font-mono"
            />
            <p className="text-[10px] text-zinc-500">
              Set to 0 for complimentary insured shipping.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-10 px-6 gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Save Configuration</span>
        </Button>
      </div>
    </form>
  );
}
