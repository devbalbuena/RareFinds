"use client";

import * as React from "react";
import { Role } from "@prisma/client";
import {
  createBrandAction,
  renameBrandAction,
  deleteBrandAction,
  createCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
} from "@/actions/catalog";
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FolderTree,
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

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  _count: { products: number };
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { products: number };
}

interface CatalogManagementTableProps {
  initialBrands: BrandItem[];
  initialCategories: CategoryItem[];
  userRole: Role;
}

export function CatalogManagementTable({
  initialBrands,
  initialCategories,
  userRole,
}: CatalogManagementTableProps) {
  const isAdmin = userRole === Role.ADMIN;
  const [activeTab, setActiveTab] = React.useState<"brands" | "categories">("brands");

  const [brands, setBrands] = React.useState<BrandItem[]>(initialBrands);
  const [categories, setCategories] = React.useState<CategoryItem[]>(initialCategories);

  const [alert, setAlert] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Brand Modal State
  const [isBrandModalOpen, setIsBrandModalOpen] = React.useState(false);
  const [editingBrand, setEditingBrand] = React.useState<BrandItem | null>(null);
  const [brandName, setBrandName] = React.useState("");
  const [brandDesc, setBrandDesc] = React.useState("");
  const [brandLogo, setBrandLogo] = React.useState("");
  const [brandLoading, setBrandLoading] = React.useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryItem | null>(null);
  const [catName, setCatName] = React.useState("");
  const [catDesc, setCatDesc] = React.useState("");
  const [catLoading, setCatLoading] = React.useState(false);

  // Deletion loader
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Open Create Brand
  const openCreateBrand = () => {
    setEditingBrand(null);
    setBrandName("");
    setBrandDesc("");
    setBrandLogo("");
    setIsBrandModalOpen(true);
  };

  // Open Edit Brand
  const openEditBrand = (brand: BrandItem) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setBrandDesc(brand.description || "");
    setBrandLogo(brand.logoUrl || "");
    setIsBrandModalOpen(true);
  };

  // Open Create Category
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCatName("");
    setCatDesc("");
    setIsCategoryModalOpen(true);
  };

  // Open Edit Category
  const openEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || "");
    setIsCategoryModalOpen(true);
  };

  // Save Brand
  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    setBrandLoading(true);
    setAlert(null);

    try {
      if (editingBrand) {
        const res = await renameBrandAction(editingBrand.id, {
          name: brandName.trim(),
          description: brandDesc.trim() || undefined,
          logoUrl: brandLogo.trim() || undefined,
        });

        if (res.error || !res.brand) {
          setAlert({ type: "error", message: res.error || "Failed to update brand." });
        } else {
          setBrands((prev) =>
            prev.map((b) =>
              b.id === editingBrand.id
                ? {
                    ...b,
                    name: res.brand!.name,
                    slug: res.brand!.slug,
                    description: res.brand!.description,
                    logoUrl: res.brand!.logoUrl,
                  }
                : b
            )
          );
          setIsBrandModalOpen(false);
          setAlert({ type: "success", message: `Brand "${res.brand.name}" updated successfully.` });
        }
      } else {
        const res = await createBrandAction({
          name: brandName.trim(),
          description: brandDesc.trim() || undefined,
          logoUrl: brandLogo.trim() || undefined,
        });

        if (res.error || !res.brand) {
          setAlert({ type: "error", message: res.error || "Failed to create brand." });
        } else {
          setBrands((prev) => [
            ...prev,
            {
              id: res.brand!.id,
              name: res.brand!.name,
              slug: res.brand!.slug,
              description: res.brand!.description,
              logoUrl: res.brand!.logoUrl,
              _count: { products: 0 },
            },
          ]);
          setIsBrandModalOpen(false);
          setAlert({ type: "success", message: `Brand "${res.brand.name}" created successfully.` });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Brand operation failed.";
      setAlert({ type: "error", message: msg });
    } finally {
      setBrandLoading(false);
    }
  };

  // Delete Brand
  const handleDeleteBrand = async (brand: BrandItem) => {
    if (!confirm(`Are you sure you want to delete brand "${brand.name}"?`)) return;

    setDeletingId(brand.id);
    setAlert(null);

    try {
      const res = await deleteBrandAction(brand.id);
      if (res.error) {
        setAlert({ type: "error", message: res.error });
      } else {
        setBrands((prev) => prev.filter((b) => b.id !== brand.id));
        setAlert({ type: "success", message: `Brand "${brand.name}" deleted successfully.` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete brand.";
      setAlert({ type: "error", message: msg });
    } finally {
      setDeletingId(null);
    }
  };

  // Save Category
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setCatLoading(true);
    setAlert(null);

    try {
      if (editingCategory) {
        const res = await renameCategoryAction(editingCategory.id, {
          name: catName.trim(),
          description: catDesc.trim() || undefined,
        });

        if (res.error || !res.category) {
          setAlert({ type: "error", message: res.error || "Failed to update category." });
        } else {
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editingCategory.id
                ? {
                    ...c,
                    name: res.category!.name,
                    slug: res.category!.slug,
                    description: res.category!.description,
                  }
                : c
            )
          );
          setIsCategoryModalOpen(false);
          setAlert({ type: "success", message: `Category "${res.category.name}" updated successfully.` });
        }
      } else {
        const res = await createCategoryAction({
          name: catName.trim(),
          description: catDesc.trim() || undefined,
        });

        if (res.error || !res.category) {
          setAlert({ type: "error", message: res.error || "Failed to create category." });
        } else {
          setCategories((prev) => [
            ...prev,
            {
              id: res.category!.id,
              name: res.category!.name,
              slug: res.category!.slug,
              description: res.category!.description,
              _count: { products: 0 },
            },
          ]);
          setIsCategoryModalOpen(false);
          setAlert({ type: "success", message: `Category "${res.category.name}" created successfully.` });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Category operation failed.";
      setAlert({ type: "error", message: msg });
    } finally {
      setCatLoading(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    setDeletingId(cat.id);
    setAlert(null);

    try {
      const res = await deleteCategoryAction(cat.id);
      if (res.error) {
        setAlert({ type: "error", message: res.error });
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        setAlert({ type: "success", message: `Category "${cat.name}" deleted successfully.` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete category.";
      setAlert({ type: "error", message: msg });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 text-zinc-900">
      {/* Alert Notice */}
      {alert && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-semibold border shadow-2xs ${
            alert.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 flex items-center gap-2">
            <Tags className="h-6 w-6 text-amber-500" />
            Brands &amp; Categories
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Taxonomy configuration for sneaker vault classification and navigation filters.
          </p>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            onClick={activeTab === "brands" ? openCreateBrand : openCreateCategory}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "brands" ? "Add New Brand" : "Add New Category"}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab("brands")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "brands"
              ? "bg-amber-500 text-black shadow-xs"
              : "bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200 shadow-2xs"
          }`}
        >
          <Tags className="h-3.5 w-3.5" />
          Brands ({brands.length})
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "categories"
              ? "bg-amber-500 text-black shadow-xs"
              : "bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200 shadow-2xs"
          }`}
        >
          <FolderTree className="h-3.5 w-3.5" />
          Categories ({categories.length})
        </button>
      </div>

      {/* Brands Table */}
      {activeTab === "brands" && (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Brand</th>
                <th className="py-3.5 px-4">Slug</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Sneakers Linked</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    No brands found in catalog.
                  </td>
                </tr>
              ) : (
                brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900 flex items-center gap-2">
                      <span>{brand.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                      {brand.slug}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 max-w-xs truncate">
                      {brand.description || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 text-[10px] font-medium">
                        {brand._count.products} sneaker(s)
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditBrand(brand)}
                            title="Edit brand"
                            className="h-7 px-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === brand.id || brand._count.products > 0}
                            onClick={() => handleDeleteBrand(brand)}
                            title={
                              brand._count.products > 0
                                ? "Cannot delete brand while assigned to sneakers"
                                : "Delete brand"
                            }
                            className="h-7 px-2 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                          >
                            {deletingId === brand.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400">Read only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Categories Table */}
      {activeTab === "categories" && (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Slug</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Sneakers Linked</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    No categories found in catalog.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900">
                      {cat.name}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                      {cat.slug}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 max-w-xs truncate">
                      {cat.description || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 text-[10px] font-medium">
                        {cat._count.products} sneaker(s)
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditCategory(cat)}
                            title="Edit category"
                            className="h-7 px-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === cat.id || cat._count.products > 0}
                            onClick={() => handleDeleteCategory(cat)}
                            title={
                              cat._count.products > 0
                                ? "Cannot delete category while assigned to sneakers"
                                : "Delete category"
                            }
                            className="h-7 px-2 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                          >
                            {deletingId === cat.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400">Read only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Brand Add/Edit Modal */}
      <Dialog open={isBrandModalOpen} onOpenChange={setIsBrandModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 p-6 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900">
              <Tags className="h-5 w-5 text-amber-500" />
              {editingBrand ? `Edit Brand (${editingBrand.name})` : "Create New Brand"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Taxonomy entry for sneaker labels and manufacturer cataloging.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBrandSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Brand Name *
              </label>
              <Input
                required
                placeholder="e.g. Jordan, Nike, New Balance"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="bg-white border-zinc-300 text-xs text-zinc-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Description (Optional)
              </label>
              <Input
                placeholder="Short bio or heritage overview"
                value={brandDesc}
                onChange={(e) => setBrandDesc(e.target.value)}
                className="bg-white border-zinc-300 text-xs text-zinc-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Brand Logo URL (Optional)
              </label>
              <Input
                type="url"
                placeholder="https://example.com/logo.png"
                value={brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                className="bg-white border-zinc-300 text-xs text-zinc-900"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBrandModalOpen(false)}
                className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={brandLoading}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold shadow-xs"
              >
                {brandLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editingBrand ? "Save Changes" : "Create Brand"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Add/Edit Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 p-6 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900">
              <FolderTree className="h-5 w-5 text-amber-500" />
              {editingCategory ? `Edit Category (${editingCategory.name})` : "Create New Category"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Vault classification tier (e.g. Basketball, Running, Lifestyle).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCategorySubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Category Name *
              </label>
              <Input
                required
                placeholder="e.g. Basketball, Lifestyle, Skateboarding"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="bg-white border-zinc-300 text-xs text-zinc-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Description (Optional)
              </label>
              <Input
                placeholder="Classification notes"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="bg-white border-zinc-300 text-xs text-zinc-900"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCategoryModalOpen(false)}
                className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={catLoading}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold shadow-xs"
              >
                {catLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
