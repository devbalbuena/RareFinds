"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Star,
} from "lucide-react";

interface AddressItem {
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

interface AddressListProps {
  addresses: AddressItem[];
}

export function AddressList({ addresses }: AddressListProps) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = React.useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(createAddressAction, null);

  const [prevSuccess, setPrevSuccess] = React.useState(state?.success);
  if (prevSuccess !== state?.success) {
    setPrevSuccess(state?.success);
    if (state?.success) {
      setShowAddForm(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this address?")) return;
    setDeletingId(id);
    try {
      await deleteAddressAction(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await setDefaultAddressAction(id);
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Saved Shipping Addresses
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage destinations for express double-boxed sneaker deliveries.
          </p>
        </div>

        {!showAddForm && (
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Address
          </Button>
        )}
      </div>

      {/* Add Address Form Modal/Panel */}
      {showAddForm && (
        <div className="rounded-xl border bg-secondary/20 p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              New Shipping Address
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="font-medium">{state.error}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Recipient Full Name
                </label>
                <Input
                  name="fullName"
                  required
                  placeholder="Juan Dela Cruz"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Phone Number
                </label>
                <Input
                  name="phone"
                  required
                  placeholder="0917 123 4567"
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Street Address
                </label>
                <Input
                  name="street"
                  required
                  placeholder="House / Building No., Street, Barangay"
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Apartment / Unit / Landmark (Optional)
                </label>
                <Input
                  name="apartment"
                  placeholder="Unit 4B, Near City Hall"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  City / Municipality
                </label>
                <Input
                  name="city"
                  required
                  placeholder="Makati City"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Province / Metro Manila
                </label>
                <Input
                  name="province"
                  required
                  placeholder="Metro Manila"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Postal Code
                </label>
                <Input
                  name="postalCode"
                  required
                  placeholder="1200"
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                <Checkbox id="isDefault" name="isDefault" />
                <label
                  htmlFor="isDefault"
                  className="text-xs text-foreground cursor-pointer select-none"
                >
                  Set as default shipping address
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                size="sm"
                className="text-xs font-semibold gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Save Address
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Address Cards List */}
      {addresses.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <MapPin className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            No saved shipping addresses yet.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Add your primary shipping destination for faster one-click checkouts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                addr.isDefault
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">
                    {addr.fullName}
                  </span>
                  {addr.isDefault && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                      Default
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5 leading-relaxed">
                  <p className="text-foreground">{addr.street}</p>
                  {addr.apartment && <p>{addr.apartment}</p>}
                  <p>
                    {addr.city}, {addr.province} {addr.postalCode}
                  </p>
                  <p className="pt-1 text-[11px] font-mono text-zinc-500">
                    Phone: {addr.phone}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t text-xs">
                {!addr.isDefault ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={settingDefaultId === addr.id}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  >
                    {settingDefaultId === addr.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Star className="h-3 w-3" />
                    )}
                    Set as default
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Primary shipping address
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(addr.id)}
                  disabled={deletingId === addr.id}
                  className="text-muted-foreground hover:text-red-500 p-1 transition-colors cursor-pointer"
                  aria-label="Delete address"
                >
                  {deletingId === addr.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
