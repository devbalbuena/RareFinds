"use client";

import * as React from "react";
import { Condition, Role } from "@prisma/client";
import {
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
} from "@/actions/products";
import { formatPrice } from "@/lib/utils";
import { StockAdjustmentModal } from "@/components/admin/StockAdjustmentModal";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ManagedVariant {
  id: string;
  size: string;
  condition: Condition;
  conditionNotes: string | null;
  price: number;
  costPrice?: number | null;
  stockQty: number;
  isOneOfOne: boolean;
  isSold: boolean;
}

interface ProductVariantManagerProps {
  productId: string;
  productTitle: string;
  initialVariants: ManagedVariant[];
  userRole: Role;
  onVariantsChange?: (variants: ManagedVariant[]) => void;
}

const CONDITIONS: { value: Condition; label: string; desc: string }[] = [
  { value: "DS", label: "DS (Deadstock)", desc: "Brand new, never worn or tried on" },
  { value: "VNDS", label: "VNDS (Very Near Deadstock)", desc: "Worn 1-2 times, virtually no creasing" },
  { value: "USED", label: "USED (Pre-owned)", desc: "Noticeable wear, fully disclosed in notes" },
];

export function ProductVariantManager({
  productId,
  productTitle,
  initialVariants,
  userRole,
  onVariantsChange,
}: ProductVariantManagerProps) {
  const isAdmin = userRole === Role.ADMIN;
  const [variants, setVariants] = React.useState<ManagedVariant[]>(initialVariants);
  const [actionAlert, setActionAlert] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Add Variant Dialog State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [addSize, setAddSize] = React.useState("");
  const [addCondition, setAddCondition] = React.useState<Condition>("DS");
  const [addNotes, setAddNotes] = React.useState("");
  const [addPrice, setAddPrice] = React.useState<string>("");
  const [addCostPrice, setAddCostPrice] = React.useState<string>("");
  const [addStockQty, setAddStockQty] = React.useState<number>(1);
  const [addIsOneOfOne, setAddIsOneOfOne] = React.useState<boolean>(true);
  const [addLoading, setAddLoading] = React.useState(false);

  // Edit Variant Dialog State
  const [editingVariant, setEditingVariant] = React.useState<ManagedVariant | null>(null);
  const [editSize, setEditSize] = React.useState("");
  const [editCondition, setEditCondition] = React.useState<Condition>("DS");
  const [editNotes, setEditNotes] = React.useState("");
  const [editPrice, setEditPrice] = React.useState<string>("");
  const [editCostPrice, setEditCostPrice] = React.useState<string>("");
  const [editIsOneOfOne, setEditIsOneOfOne] = React.useState<boolean>(false);
  const [editLoading, setEditLoading] = React.useState(false);

  // Stock Adjustment Modal
  const [stockAdjustVariant, setStockAdjustVariant] = React.useState<ManagedVariant | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const openEditModal = (v: ManagedVariant) => {
    setEditingVariant(v);
    setEditSize(v.size);
    setEditCondition(v.condition);
    setEditNotes(v.conditionNotes || "");
    setEditPrice(v.price.toString());
    setEditCostPrice(v.costPrice !== null && v.costPrice !== undefined ? v.costPrice.toString() : "");
    setEditIsOneOfOne(v.isOneOfOne);
    setActionAlert(null);
  };

  // Add Variant Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSize.trim()) {
      setActionAlert({ type: "error", message: "Size is required (e.g. US 10.5)." });
      return;
    }

    const priceNum = parseFloat(addPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setActionAlert({ type: "error", message: "Please provide a valid price greater than 0." });
      return;
    }

    const costNum = addCostPrice ? parseFloat(addCostPrice) : undefined;
    if (addCostPrice && (isNaN(costNum!) || costNum! <= 0)) {
      setActionAlert({ type: "error", message: "Cost price must be greater than 0." });
      return;
    }

    setAddLoading(true);
    setActionAlert(null);

    try {
      const res = await createVariantAction(productId, {
        size: addSize.trim(),
        condition: addCondition,
        conditionNotes: addNotes.trim() || undefined,
        price: priceNum,
        costPrice: isAdmin ? costNum : undefined,
        stockQty: addIsOneOfOne ? 1 : addStockQty,
        isOneOfOne: addIsOneOfOne,
      });

      if (res.error || !res.variant) {
        setActionAlert({ type: "error", message: res.error || "Failed to create variant." });
      } else {
        const created: ManagedVariant = {
          id: res.variant.id,
          size: res.variant.size,
          condition: res.variant.condition,
          conditionNotes: res.variant.conditionNotes,
          price: Number(res.variant.price),
          costPrice: res.variant.costPrice !== null && res.variant.costPrice !== undefined ? Number(res.variant.costPrice) : null,
          stockQty: res.variant.stockQty,
          isOneOfOne: res.variant.isOneOfOne,
          isSold: res.variant.isSold,
        };

        const updated = [...variants, created];
        setVariants(updated);
        onVariantsChange?.(updated);
        setIsAddOpen(false);
        setActionAlert({ type: "success", message: `Variant size ${created.size} added.` });

        // reset form
        setAddSize("");
        setAddNotes("");
        setAddPrice("");
        setAddCostPrice("");
        setAddStockQty(1);
        setAddIsOneOfOne(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add variant.";
      setActionAlert({ type: "error", message: msg });
    } finally {
      setAddLoading(false);
    }
  };

  // Edit Variant Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;

    const priceNum = editPrice ? parseFloat(editPrice) : undefined;
    const costNum = editCostPrice ? parseFloat(editCostPrice) : undefined;

    setEditLoading(true);
    setActionAlert(null);

    try {
      const res = await updateVariantAction(editingVariant.id, {
        size: editSize.trim() || undefined,
        condition: editingVariant.isSold ? undefined : editCondition,
        conditionNotes: editNotes.trim() || undefined,
        price: isAdmin && !editingVariant.isSold ? priceNum : undefined,
        costPrice: isAdmin ? costNum : undefined,
        isOneOfOne: editIsOneOfOne,
      });

      if (res.error || !res.variant) {
        setActionAlert({ type: "error", message: res.error || "Failed to update variant." });
      } else {
        const updatedList = variants.map((v) =>
          v.id === editingVariant.id
            ? {
                ...v,
                size: res.variant!.size,
                condition: res.variant!.condition,
                conditionNotes: res.variant!.conditionNotes,
                price: Number(res.variant!.price),
                costPrice:
                  res.variant!.costPrice !== null && res.variant!.costPrice !== undefined
                    ? Number(res.variant!.costPrice)
                    : null,
                isOneOfOne: res.variant!.isOneOfOne,
              }
            : v
        );

        setVariants(updatedList);
        onVariantsChange?.(updatedList);
        setEditingVariant(null);
        setActionAlert({ type: "success", message: `Variant ${res.variant.size} updated successfully.` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update variant.";
      setActionAlert({ type: "error", message: msg });
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Variant
  const handleDeleteVariant = async (variant: ManagedVariant) => {
    if (!confirm(`Are you sure you want to delete size ${variant.size}? If ordered or in cart, deletion will be blocked.`)) {
      return;
    }

    setDeletingId(variant.id);
    setActionAlert(null);

    try {
      const res = await deleteVariantAction(variant.id);
      if (res.error) {
        setActionAlert({ type: "error", message: res.error });
      } else {
        const remaining = variants.filter((v) => v.id !== variant.id);
        setVariants(remaining);
        onVariantsChange?.(remaining);
        setActionAlert({ type: "success", message: `Size ${variant.size} deleted successfully.` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete variant.";
      setActionAlert({ type: "error", message: msg });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-amber-500" />
            Sizes, Vault Stock &amp; Condition Disclosures
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage sneaker sizing variants, condition tiers, pricing, and 1-of-1 grail allocation locks.
          </p>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            onClick={() => {
              setActionAlert(null);
              setIsAddOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Add Size Variant
          </Button>
        )}
      </div>

      {/* Notifications */}
      {actionAlert && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium border ${
            actionAlert.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          {actionAlert.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{actionAlert.message}</span>
        </div>
      )}

      {/* Variants Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Condition</th>
              <th className="py-3 px-4">Vault Stock</th>
              <th className="py-3 px-4">Retail Price</th>
              {isAdmin && <th className="py-3 px-4">Cost Price</th>}
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-zinc-500">
                  No variants added yet. At least one size variant is required.
                </td>
              </tr>
            ) : (
              variants.map((v) => (
                <tr key={v.id} className="hover:bg-zinc-900/40 transition-colors">
                  {/* Size + 1-of-1 Badge */}
                  <td className="py-3 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span>{v.size}</span>
                      {v.isOneOfOne && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] py-0 px-1 font-semibold">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5 inline" /> 1-of-1
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Condition & Notes */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px] py-0 px-1.5 font-medium">
                        {v.condition}
                      </Badge>
                      {v.conditionNotes && (
                        <p className="text-[10px] text-zinc-500 line-clamp-1 italic">
                          {v.conditionNotes}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Stock Quantity */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-black ${
                          v.stockQty === 0 || v.isSold
                            ? "text-rose-400"
                            : v.stockQty <= 2
                            ? "text-amber-400"
                            : "text-white"
                        }`}
                      >
                        {v.stockQty} unit{v.stockQty !== 1 ? "s" : ""}
                      </span>
                      {v.isSold && (
                        <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] py-0 px-1">
                          SOLD
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 font-semibold text-white">
                    {formatPrice(v.price)}
                  </td>

                  {/* Cost Price (Admin only) */}
                  {isAdmin && (
                    <td className="py-3 px-4 text-zinc-400">
                      {v.costPrice !== null && v.costPrice !== undefined
                        ? formatPrice(v.costPrice)
                        : "—"}
                    </td>
                  )}

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Stock Adjustment (disabled for 1-of-1) */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={v.isOneOfOne}
                        onClick={() => setStockAdjustVariant(v)}
                        title={
                          v.isOneOfOne
                            ? "1-of-1 grails have fixed allocation"
                            : "Adjust stock count"
                        }
                        className="h-7 px-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-30"
                      >
                        <Package className="h-3.5 w-3.5" />
                      </Button>

                      {/* Edit Variant */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(v)}
                        title="Edit size, condition, and pricing"
                        className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>

                      {/* Delete Variant (Admin only) */}
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === v.id || variants.length <= 1}
                          onClick={() => handleDeleteVariant(v)}
                          title={
                            variants.length <= 1
                              ? "At least one variant must remain"
                              : "Delete variant"
                          }
                          className="h-7 px-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
                        >
                          {deletingId === v.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Variant Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Plus className="h-5 w-5 text-amber-500" />
              Add Sizing Variant
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              {productTitle}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Size (e.g. US 10.5) *
                </label>
                <Input
                  required
                  placeholder="US 9.5"
                  value={addSize}
                  onChange={(e) => setAddSize(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Condition Tier
                </label>
                <select
                  value={addCondition}
                  onChange={(e) => setAddCondition(e.target.value as Condition)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Condition Notes / Flaws Disclosure
              </label>
              <Input
                placeholder="e.g. Og all with replacement box lid, slight yellowing on sole"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Retail Price (₱) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="25000"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs text-white"
                />
              </div>

              {isAdmin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Cost Price (₱)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="18000"
                    value={addCostPrice}
                    onChange={(e) => setAddCostPrice(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs text-white"
                  />
                </div>
              )}
            </div>

            {/* 1-of-1 Toggle & Stock Quantity */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addIsOneOfOne}
                  onChange={(e) => setAddIsOneOfOne(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-white">
                  1-of-1 Grail Allocation
                </span>
              </label>
              <p className="text-[11px] text-zinc-400 leading-normal">
                {addIsOneOfOne
                  ? "Quantity is locked to 1 pair. Cannot be restocked with batch increments."
                  : "Standard vault inventory: bulk units can be restocked and adjusted."}
              </p>

              {!addIsOneOfOne && (
                <div className="pt-2 border-t border-zinc-800">
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">
                    Initial Stock Quantity
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={addStockQty}
                    onChange={(e) => setAddStockQty(parseInt(e.target.value) || 1)}
                    className="bg-zinc-900 border-zinc-800 text-xs text-white w-28"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                className="border-zinc-800 text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addLoading}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                {addLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Add Variant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Variant Modal */}
      {editingVariant && (
        <Dialog open={!!editingVariant} onOpenChange={(open) => !open && setEditingVariant(null)}>
          <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
                <Edit className="h-5 w-5 text-amber-500" />
                Edit Size Variant ({editingVariant.size})
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Update condition disclosures or pricing. Price changes generate permanent audit log entries.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              {editingVariant.isSold && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>
                    This variant has been marked SOLD. Price and condition are locked against edits.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Size
                  </label>
                  <Input
                    required
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Condition Tier
                  </label>
                  <select
                    disabled={editingVariant.isSold}
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value as Condition)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Condition Notes / Flaws Disclosure
                </label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs text-white"
                />
              </div>

              {isAdmin && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Retail Price (₱)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      disabled={editingVariant.isSold}
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-xs text-white disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Cost Price (₱)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editCostPrice}
                      onChange={(e) => setEditCostPrice(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* 1-of-1 checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsOneOfOne"
                  checked={editIsOneOfOne}
                  onChange={(e) => setEditIsOneOfOne(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="editIsOneOfOne" className="text-xs font-bold text-white cursor-pointer">
                  1-of-1 Grail Allocation
                </label>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingVariant(null)}
                  className="border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={editLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                >
                  {editLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Stock Adjustment Modal */}
      {stockAdjustVariant && (
        <StockAdjustmentModal
          open={!!stockAdjustVariant}
          onOpenChange={(open) => !open && setStockAdjustVariant(null)}
          productTitle={`${productTitle} (${stockAdjustVariant.size})`}
          variants={[stockAdjustVariant]}
          onSuccess={() => {
            // refresh variant locally or invoke callback
            setVariants((prev) =>
              prev.map((v) =>
                v.id === stockAdjustVariant.id ? { ...v, stockQty: stockAdjustVariant.stockQty } : v
              )
            );
          }}
        />
      )}
    </div>
  );
}
