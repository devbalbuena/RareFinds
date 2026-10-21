"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductStatus, Role } from "@prisma/client";
import {
  getAdminProductsAction,
  archiveProductAction,
  restoreProductAction,
  deleteProductAction,
} from "@/actions/products";
import { formatPrice } from "@/lib/utils";
import { StockAdjustmentModal } from "@/components/admin/StockAdjustmentModal";
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  CheckCircle,
  Archive,
  RefreshCw,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Loader2,
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

export interface SerializedProductVariant {
  id: string;
  size: string;
  condition: string;
  price: number;
  costPrice?: number | null;
  stockQty: number;
  isOneOfOne: boolean;
  isSold: boolean;
}

export interface SerializedProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface SerializedAdminProduct {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  colorway: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  rarity: string | null;
  createdAt: string;
  updatedAt: string;
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  variants: SerializedProductVariant[];
  images: SerializedProductImage[];
}

interface ProductManagementTableProps {
  initialSearch?: string;
  initialProducts: SerializedAdminProduct[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  userRole: Role;
}

export function ProductManagementTable({
  initialSearch = "",
  initialProducts,
  initialTotal,
  initialPage,
  initialTotalPages,
  brands,
  categories,
  userRole,
}: ProductManagementTableProps) {
  const isAdmin = userRole === Role.ADMIN;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = React.useState(initialSearch);
  const [statusFilter, setStatusFilter] = React.useState<ProductStatus | "ALL">("ALL");
  const [brandFilter, setBrandFilter] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [lowStockFilter, setLowStockFilter] = React.useState(false);
  const [soldFilter, setSoldFilter] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<
    "newest" | "oldest" | "title_asc" | "title_desc" | "price_asc" | "price_desc"
  >("newest");
  const [currentPage, setCurrentPage] = React.useState(initialPage);

  // Data states
  const [products, setProducts] = React.useState<SerializedAdminProduct[]>(initialProducts);
  const [totalCount, setTotalCount] = React.useState(initialTotal);
  const [totalPages, setTotalPages] = React.useState(initialTotalPages);
  const [loading, setLoading] = React.useState(false);

  // Action notices
  const [actionNotice, setActionNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal states
  const [stockModalProduct, setStockModalProduct] = React.useState<SerializedAdminProduct | null>(
    null
  );
  const [deleteModalProduct, setDeleteModalProduct] = React.useState<SerializedAdminProduct | null>(
    null
  );
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Fetch products wrapper
  const fetchProducts = React.useCallback(
    async (pageToFetch: number = currentPage) => {
      setLoading(true);
      try {
        const res = await getAdminProductsAction({
          page: pageToFetch,
          pageSize: 15,
          search: searchQuery.trim() || undefined,
          status: statusFilter,
          brandId: brandFilter || undefined,
          categoryId: categoryFilter || undefined,
          lowStock: lowStockFilter || undefined,
          sold: soldFilter || undefined,
          sortBy,
        });

        setProducts(res.products as unknown as SerializedAdminProduct[]);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setCurrentPage(res.currentPage);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load products.";
        setActionNotice({ type: "error", message: msg });
      } finally {
        setLoading(false);
      }
    },
    [
      searchQuery,
      statusFilter,
      brandFilter,
      categoryFilter,
      lowStockFilter,
      soldFilter,
      sortBy,
      currentPage,
    ]
  );

  // Trigger search on debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    searchQuery,
    statusFilter,
    brandFilter,
    categoryFilter,
    lowStockFilter,
    soldFilter,
    sortBy,
    fetchProducts,
  ]);

  // Handle Archive
  const handleArchive = async (productId: string, title: string) => {
    setActionNotice(null);
    try {
      const res = await archiveProductAction(productId);
      if (res.error) {
        setActionNotice({ type: "error", message: res.error });
      } else {
        setActionNotice({
          type: "success",
          message: `"${title}" has been moved to ARCHIVED status.`,
        });
        fetchProducts(currentPage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Archive failed.";
      setActionNotice({ type: "error", message: msg });
    }
  };

  // Handle Restore
  const handleRestore = async (productId: string, title: string) => {
    setActionNotice(null);
    try {
      const res = await restoreProductAction(productId);
      if (res.error) {
        setActionNotice({ type: "error", message: res.error });
      } else {
        setActionNotice({
          type: "success",
          message: `"${title}" has been restored to ACTIVE status.`,
        });
        fetchProducts(currentPage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Restore failed.";
      setActionNotice({ type: "error", message: msg });
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteModalProduct) return;
    setDeleteLoading(true);
    setActionNotice(null);

    try {
      const res = await deleteProductAction(deleteModalProduct.id);
      if (res.error) {
        setActionNotice({ type: "error", message: res.error });
      } else {
        setActionNotice({
          type: "success",
          message: `Product "${deleteModalProduct.title}" and storage assets deleted successfully.`,
        });
        setDeleteModalProduct(null);
        fetchProducts(currentPage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed.";
      setActionNotice({ type: "error", message: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-900">
      {/* Top Banner / Alerts */}
      {actionNotice && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-semibold border shadow-2xs ${
            actionNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="hover:opacity-75 transition-opacity font-bold"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header and Add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-amber-500" />
            Sneaker Catalog &amp; Vault
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage vault inventory, condition disclosures, stock counts, and storage imagery. Total:{" "}
            <span className="font-bold text-zinc-900">{totalCount}</span> sneaker(s).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin/products/new">
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Add Sneaker
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search title, SKU, colorway..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-zinc-300 text-xs text-zinc-900 placeholder:text-zinc-400 shadow-2xs"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProductStatus | "ALL")}
              className="w-full h-9 rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-700 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE (Storefront Visible)</option>
              <option value="DRAFT">DRAFT (Unpublished)</option>
              <option value="ARCHIVED">ARCHIVED (Vault Closed)</option>
            </select>
          </div>

          {/* Brand filter */}
          <div>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full h-9 rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-700 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-9 rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-700 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Toggles & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`px-3 py-1.5 rounded-xl border font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
                lowStockFilter
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              Low Stock (&lt; 2 units)
            </button>

            <button
              onClick={() => setSoldFilter(!soldFilter)}
              className={`px-3 py-1.5 rounded-xl border font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
                soldFilter
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Package className="h-3 w-3 text-rose-600" />
              Sold Out
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3 w-3 text-zinc-400" />
            <span className="text-zinc-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | "newest"
                    | "oldest"
                    | "title_asc"
                    | "title_desc"
                    | "price_asc"
                    | "price_desc"
                )
              }
              className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title (A - Z)</option>
              <option value="title_desc">Title (Z - A)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product List Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Sneaker</th>
                <th className="py-3.5 px-4">Brand / Cat</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Vault Inventory</th>
                <th className="py-3.5 px-4">Price Range</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
                    Fetching inventory data...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No sneakers found matching the selected filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const primaryImage =
                    product.images.find((img) => img.isPrimary) || product.images[0];
                  const totalStock = product.variants.reduce((acc, v) => acc + v.stockQty, 0);
                  const isSoldOut = totalStock === 0 || product.variants.every((v) => v.isSold);
                  const prices = product.variants.map((v) => v.price);
                  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-zinc-50/70 transition-colors group"
                    >
                      {/* Sneaker Thumbnail + Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 rounded-xl border border-zinc-200 bg-zinc-100 shrink-0 overflow-hidden flex items-center justify-center">
                            {primaryImage ? (
                              <Image
                                src={primaryImage.url}
                                alt={product.title}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="space-y-0.5 max-w-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isAdmin ? (
                                <Link
                                  href={`/admin/products/${product.id}/edit`}
                                  className="font-bold text-zinc-900 hover:text-amber-600 transition-colors line-clamp-1"
                                >
                                  {product.title}
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setStockModalProduct(product)}
                                  className="font-bold text-zinc-900 hover:text-amber-600 text-left transition-colors line-clamp-1 cursor-pointer"
                                  title="Click to adjust stock"
                                >
                                  {product.title}
                                </button>
                              )}
                              {product.isFeatured && (
                                <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] py-0 px-1 font-bold">
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 line-clamp-1">
                              {product.sku ? `SKU: ${product.sku}` : `/${product.slug}`}
                              {product.colorway ? ` • ${product.colorway}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Brand & Category */}
                      <td className="py-3 px-4 text-zinc-700">
                        <div className="space-y-0.5">
                          <span className="font-bold block text-zinc-900">{product.brand.name}</span>
                          <span className="text-[11px] text-zinc-500 block">{product.category.name}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        {product.status === ProductStatus.ACTIVE && (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            ACTIVE
                          </Badge>
                        )}
                        {product.status === ProductStatus.DRAFT && (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                            DRAFT
                          </Badge>
                        )}
                        {product.status === ProductStatus.ARCHIVED && (
                          <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px] font-bold">
                            ARCHIVED
                          </Badge>
                        )}
                      </td>

                      {/* Vault Inventory / Variants */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-black text-xs ${
                                isSoldOut
                                  ? "text-rose-600"
                                  : totalStock <= 2
                                  ? "text-amber-700"
                                  : "text-zinc-900"
                              }`}
                            >
                              {totalStock} pair{totalStock !== 1 ? "s" : ""}
                            </span>
                            {isSoldOut ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] py-0 px-1 font-bold">
                                Sold Out
                              </Badge>
                            ) : totalStock <= 2 ? (
                              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] py-0 px-1 font-bold">
                                Low Stock
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-[10px] text-zinc-500 line-clamp-1">
                            {product.variants.map((v) => `${v.size} (${v.stockQty})`).join(", ")}
                          </p>
                        </div>
                      </td>

                      {/* Price Range */}
                      <td className="py-3 px-4 text-zinc-800 font-bold">
                        {minPrice === maxPrice ? (
                          formatPrice(minPrice)
                        ) : (
                          <span>
                            {formatPrice(minPrice)} - {formatPrice(maxPrice)}
                          </span>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin ? (
                            <>
                              {/* Admin: Explicit Edit Button */}
                              <Link href={`/admin/products/${product.id}/edit`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Edit sneaker details & images"
                                  className="h-7 px-2.5 text-xs font-bold gap-1.5 border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 shadow-2xs"
                                >
                                  <Edit className="h-3.5 w-3.5 text-amber-600" />
                                  <span>Edit</span>
                                </Button>
                              </Link>

                              {/* Admin: Quick Stock Adjustment */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStockModalProduct(product)}
                                title="Adjust inventory stock"
                                className="h-7 px-2 text-zinc-500 hover:text-amber-600 hover:bg-amber-50"
                              >
                                <Package className="h-3.5 w-3.5" />
                              </Button>

                              {/* Archive / Restore (Admin only) */}
                              {product.status === ProductStatus.ARCHIVED ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRestore(product.id, product.title)}
                                  title="Restore to ACTIVE"
                                  className="h-7 px-2 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleArchive(product.id, product.title)}
                                  title="Archive sneaker"
                                  className="h-7 px-2 text-zinc-500 hover:text-amber-600 hover:bg-amber-50"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {/* Hard Delete (Admin only) */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteModalProduct(product)}
                                title="Delete sneaker"
                                className="h-7 px-2 text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            /* Staff: Explicitly shows "Adjust stock" action */
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setStockModalProduct(product)}
                              title="Adjust inventory stock quantities"
                              className="h-7 px-2.5 text-xs font-bold gap-1.5 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-2xs"
                            >
                              <Package className="h-3.5 w-3.5" />
                              <span>Adjust stock</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/60 p-4 text-xs text-zinc-600">
            <div>
              Page <span className="font-bold text-zinc-900">{currentPage}</span> of{" "}
              <span className="font-bold text-zinc-900">{totalPages}</span> ({totalCount} total)
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchProducts(currentPage - 1)}
                className="h-8 border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 shadow-2xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => fetchProducts(currentPage + 1)}
                className="h-8 border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 shadow-2xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {stockModalProduct && (
        <StockAdjustmentModal
          open={!!stockModalProduct}
          onOpenChange={(open) => !open && setStockModalProduct(null)}
          productTitle={stockModalProduct.title}
          variants={stockModalProduct.variants}
          onSuccess={() => fetchProducts(currentPage)}
        />
      )}

      {/* Hard Delete Confirmation Modal */}
      {deleteModalProduct && (
        <Dialog
          open={!!deleteModalProduct}
          onOpenChange={(open) => !open && setDeleteModalProduct(null)}
        >
          <DialogContent className="sm:max-w-md bg-white border-rose-200 text-zinc-900 p-6 shadow-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                Confirm Sneaker Deletion
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Are you sure you want to delete{" "}
                <span className="font-bold text-zinc-900">{deleteModalProduct.title}</span>?
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1.5">
              <p className="font-bold">Permanent Deletion Warning</p>
              <p className="text-[11px] text-zinc-600">
                This action will delete all image assets from Supabase storage and remove variant records.
                If any variant of this sneaker has historical order records, deletion will be blocked by
                database integrity constraints. Consider archiving instead.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalProduct(null)}
                className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleteLoading}
                onClick={handleDeleteConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {deleteLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
