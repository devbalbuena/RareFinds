"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  createAddressAction,
  updateAddressAction,
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
  Pencil,
  Building2,
} from "lucide-react";
import { getRegionZone } from "@/lib/shipping";

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

const REGION_PRESETS = [
  { label: "Metro Manila (NCR)", province: "National Capital Region (NCR)" },
  { label: "Greater Manila (Nearby Luzon)", province: "Region 4A (CALABARZON)" },
  { label: "North & South Luzon", province: "Region 3 (Central Luzon)" },
  { label: "Visayas (Inter-Island Air)", province: "Region 7 (Central Visayas)" },
  { label: "Mindanao (Long-Haul Air)", province: "Region 11 (Davao Region)" },
];

const NCR_CITIES = [
  "Taguig City (BGC)",
  "Makati City",
  "Manila City",
  "Pasig City",
  "Quezon City",
  "Mandaluyong City",
  "San Juan City",
  "Parañaque City",
  "Pasay City",
  "Las Piñas City",
  "Muntinlupa City",
  "Caloocan City",
  "Marikina City",
];

export function AddressList({ addresses }: AddressListProps) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<AddressItem | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = React.useState<string | null>(null);

  // Create address action state
  const [createState, createAction, isCreating] = useActionState(createAddressAction, null);
  const [prevCreateSuccess, setPrevCreateSuccess] = React.useState(createState?.success);
  if (prevCreateSuccess !== createState?.success) {
    setPrevCreateSuccess(createState?.success);
    if (createState?.success) {
      setShowAddForm(false);
    }
  }

  // Update address action state
  const [updateState, editAction, isUpdating] = useActionState(updateAddressAction, null);
  const [prevUpdateSuccess, setPrevUpdateSuccess] = React.useState(updateState?.success);
  if (prevUpdateSuccess !== updateState?.success) {
    setPrevUpdateSuccess(updateState?.success);
    if (updateState?.success) {
      setEditingAddress(null);
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

        {!showAddForm && !editingAddress && (
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Address
          </Button>
        )}
      </div>

      {/* Add Address Form Panel */}
      {showAddForm && (
        <div className="rounded-xl border bg-secondary/20 p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-primary" />
              New Shipping Address
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="h-7 w-7 p-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form action={createAction} className="space-y-4">
            {createState?.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="font-medium">{createState.error}</div>
              </div>
            )}

            {/* Quick Region Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Quick Region Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REGION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      const provInput = document.getElementById("create-province") as HTMLInputElement;
                      if (provInput) provInput.value = p.province;
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-md border bg-card hover:bg-secondary transition-colors text-foreground font-medium cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Recipient Full Name *
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
                  Phone Number *
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
                  Street Address *
                </label>
                <Input
                  name="street"
                  required
                  placeholder="House / Unit No., Street, Subdivision"
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Apartment / Unit / Landmark (Optional)
                </label>
                <Input
                  name="apartment"
                  placeholder="Unit 14B, Tower 2, Near High Street"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Province / Administrative Region *
                </label>
                <Input
                  id="create-province"
                  name="province"
                  required
                  defaultValue="National Capital Region (NCR)"
                  placeholder="e.g. National Capital Region (NCR)"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  City / Municipality *
                </label>
                <Input
                  name="city"
                  required
                  defaultValue="Taguig City (BGC)"
                  placeholder="e.g. Taguig City (BGC)"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Postal / ZIP Code *
                </label>
                <Input
                  name="postalCode"
                  required
                  defaultValue="1634"
                  placeholder="1200 or 1634"
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                <Checkbox id="create-isDefault" name="isDefault" defaultChecked />
                <label
                  htmlFor="create-isDefault"
                  className="text-xs text-foreground cursor-pointer select-none font-medium"
                >
                  Set as default shipping destination
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                size="sm"
                className="text-xs font-semibold gap-1.5 cursor-pointer"
              >
                {isCreating ? (
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

      {/* Edit Address Form Panel */}
      {editingAddress && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-primary" />
              Edit Shipping Address
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingAddress(null)}
              className="h-7 w-7 p-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form action={editAction} className="space-y-4">
            <input type="hidden" name="addressId" value={editingAddress.id} />

            {updateState?.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="font-medium">{updateState.error}</div>
              </div>
            )}

            {/* Quick Region Presets for Edit */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Quick Region Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REGION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      const provInput = document.getElementById("edit-province") as HTMLInputElement;
                      if (provInput) provInput.value = p.province;
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-md border bg-card hover:bg-secondary transition-colors text-foreground font-medium cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Recipient Full Name *
                </label>
                <Input
                  name="fullName"
                  required
                  defaultValue={editingAddress.fullName}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Phone Number *
                </label>
                <Input
                  name="phone"
                  required
                  defaultValue={editingAddress.phone}
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Street Address *
                </label>
                <Input
                  name="street"
                  required
                  defaultValue={editingAddress.street}
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Apartment / Unit / Landmark (Optional)
                </label>
                <Input
                  name="apartment"
                  defaultValue={editingAddress.apartment || ""}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Province / Administrative Region *
                </label>
                <Input
                  id="edit-province"
                  name="province"
                  required
                  defaultValue={editingAddress.province}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  City / Municipality *
                </label>
                <Input
                  name="city"
                  required
                  defaultValue={editingAddress.city}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Postal / ZIP Code *
                </label>
                <Input
                  name="postalCode"
                  required
                  defaultValue={editingAddress.postalCode}
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                <Checkbox
                  id="edit-isDefault"
                  name="isDefault"
                  defaultChecked={editingAddress.isDefault}
                />
                <label
                  htmlFor="edit-isDefault"
                  className="text-xs text-foreground cursor-pointer select-none font-medium"
                >
                  Set as default shipping destination
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingAddress(null)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                size="sm"
                className="text-xs font-semibold gap-1.5 cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Save Changes
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
          {addresses.map((addr) => {
            const isManila = getRegionZone(addr.province).zoneKey === "NCR";

            return (
              <div
                key={addr.id}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  addr.isDefault
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-700"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-bold text-xs text-foreground">
                      {addr.fullName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {addr.isDefault && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                          Default
                        </Badge>
                      )}
                      {isManila ? (
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
                          Provincial
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5 leading-relaxed">
                    <p className="text-foreground">{addr.street}</p>
                    {addr.apartment && <p>{addr.apartment}</p>}
                    <p className="font-medium text-foreground/90">
                      {addr.city}, {addr.province} {addr.postalCode}
                    </p>
                    <p className="pt-1 text-[11px] font-mono text-zinc-500">
                      Phone: {addr.phone}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t text-xs">
                  <div className="flex items-center gap-3">
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
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Default Destination
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingAddress(addr);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>

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
            );
          })}
        </div>
      )}
    </div>
  );
}
