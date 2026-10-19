"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProductStatus, Rarity, Condition, Role } from "@prisma/client";
import {
  createProductAction,
  updateProductAction,
} from "@/actions/products";
import {
  Package,
  Save,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Schema for the form
const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  slug: z.string().optional(),
  brandId: z.string().min(1, "Please select a brand"),
  categoryId: z.string().min(1, "Please select a category"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  releaseYear: z.coerce.number().min(1970).max(2035).optional().nullable(),
  colorway: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  rarity: z.nativeEnum(Rarity),
  authenticityNotes: z.string().optional().nullable(),
  status: z.nativeEnum(ProductStatus),
  isFeatured: z.boolean(),

  // Initial variant (only required on create mode)
  size: z.string().optional(),
  condition: z.nativeEnum(Condition),
  conditionNotes: z.string().optional(),
  price: z.coerce.number().optional(),
  costPrice: z.coerce.number().optional().nullable(),
  stockQty: z.coerce.number(),
  isOneOfOne: z.boolean(),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface ProductFormProps {
  mode: "create" | "edit";
  initialProduct?: {
    id: string;
    title: string;
    slug: string;
    brandId: string;
    categoryId: string;
    description: string;
    releaseYear: number | null;
    colorway: string | null;
    sku: string | null;
    rarity: Rarity;
    authenticityNotes: string | null;
    status: ProductStatus;
    isFeatured: boolean;
  };
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  userRole: Role;
}

const RARITIES: { value: Rarity; label: string; desc: string }[] = [
  { value: "STANDARD", label: "Standard", desc: "Regular release / wider distribution" },
  { value: "RARE", label: "Rare", desc: "Limited release, tier-0 stockist" },
  { value: "VERY_RARE", label: "Very Rare", desc: "Tier-zero collabs, exclusive drops" },
  { value: "GRAIL", label: "Grail", desc: "Historical holy grails, Friends & Family" },
];

export function ProductForm({
  mode,
  initialProduct,
  brands,
  categories,
  userRole,
}: ProductFormProps) {
  const router = useRouter();
  const isAdmin = userRole === Role.ADMIN;
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialProduct?.title || "",
      slug: initialProduct?.slug || "",
      brandId: initialProduct?.brandId || brands[0]?.id || "",
      categoryId: initialProduct?.categoryId || categories[0]?.id || "",
      description: initialProduct?.description || "",
      releaseYear: initialProduct?.releaseYear || null,
      colorway: initialProduct?.colorway || "",
      sku: initialProduct?.sku || "",
      rarity: initialProduct?.rarity || Rarity.RARE,
      authenticityNotes: initialProduct?.authenticityNotes || "",
      status: initialProduct?.status || ProductStatus.ACTIVE,
      isFeatured: initialProduct?.isFeatured || false,
      // create-only defaults
      size: "US 10",
      condition: Condition.DS,
      price: 15000,
      costPrice: null,
      stockQty: 1,
      isOneOfOne: true,
    },
  });

  const titleVal = watch("title");
  const isOneOfOneVal = watch("isOneOfOne");

  // Helper to auto-generate slug preview
  const handleAutoSlug = () => {
    if (!titleVal) return;
    const generated = titleVal
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setValue("slug", generated);
  };

  const onSubmit = async (data: FormOutput) => {
    setServerError(null);
    setServerSuccess(null);
    setSaving(true);

    try {
      if (mode === "create") {
        if (!data.size) {
          setServerError("Initial variant size is required.");
          setSaving(false);
          return;
        }
        if (!data.price || data.price <= 0) {
          setServerError("Initial variant price must be greater than 0.");
          setSaving(false);
          return;
        }

        const res = await createProductAction({
          title: data.title,
          slug: data.slug || undefined,
          brandId: data.brandId,
          categoryId: data.categoryId,
          description: data.description,
          releaseYear: data.releaseYear,
          colorway: data.colorway,
          sku: data.sku,
          rarity: data.rarity,
          authenticityNotes: data.authenticityNotes,
          status: data.status,
          isFeatured: data.isFeatured,
          variants: [
            {
              size: data.size,
              condition: data.condition,
              conditionNotes: data.conditionNotes,
              price: data.price,
              costPrice: isAdmin ? data.costPrice : null,
              stockQty: data.isOneOfOne ? 1 : data.stockQty || 1,
              isOneOfOne: data.isOneOfOne,
            },
          ],
        });

        if (res.error || !res.product) {
          setServerError(res.error || "Failed to create sneaker.");
        } else {
          setServerSuccess("Sneaker created successfully! Redirecting to image gallery uploader...");
          setTimeout(() => {
            router.push(`/admin/products/${res.product.id}/edit`);
          }, 1000);
        }
      } else {
        // Edit mode
        if (!initialProduct) return;

        const res = await updateProductAction(initialProduct.id, {
          title: data.title,
          slug: data.slug || undefined,
          brandId: data.brandId,
          categoryId: data.categoryId,
          description: data.description,
          releaseYear: data.releaseYear,
          colorway: data.colorway,
          sku: data.sku,
          rarity: data.rarity,
          authenticityNotes: data.authenticityNotes,
          status: isAdmin ? data.status : undefined, // STAFF cannot change status
          isFeatured: data.isFeatured,
        });

        if (res.error) {
          setServerError(res.error);
        } else {
          setServerSuccess("Product details updated successfully.");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Top alerts */}
      {serverError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {serverSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{serverSuccess}</span>
        </div>
      )}

      {/* Main Details Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-500" />
            {mode === "create" ? "Sneaker Information" : "Core Specifications"}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Title, brand taxonomy, style code, and vault authenticity disclosures.
          </p>
        </div>

        {/* Title & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Sneaker Title *
            </label>
            <Input
              {...register("title")}
              placeholder="e.g. Nike Air Yeezy 2 SP 'Red October'"
              className="bg-zinc-950 border-zinc-800 text-xs text-white"
            />
            {errors.title && (
              <p className="text-[11px] text-rose-400">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                URL Slug (Unique)
              </label>
              <button
                type="button"
                onClick={handleAutoSlug}
                className="text-[11px] text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium"
              >
                <RefreshCw className="h-3 w-3" /> Auto-generate
              </button>
            </div>
            <Input
              {...register("slug")}
              placeholder="e.g. nike-air-yeezy-2-sp-red-october"
              className="bg-zinc-950 border-zinc-800 text-xs text-white font-mono"
            />
            {errors.slug && (
              <p className="text-[11px] text-rose-400">{errors.slug.message}</p>
            )}
          </div>
        </div>

        {/* Brand & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Brand *
            </label>
            <select
              {...register("brandId")}
              className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.brandId && (
              <p className="text-[11px] text-rose-400">{errors.brandId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Category *
            </label>
            <select
              {...register("categoryId")}
              className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-[11px] text-rose-400">{errors.categoryId.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Description *
          </label>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Detailed write-up of the sneaker's heritage, materials, and release significance..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          {errors.description && (
            <p className="text-[11px] text-rose-400">{errors.description.message}</p>
          )}
        </div>

        {/* Release Year, SKU, Colorway, Rarity */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Release Year
            </label>
            <Input
              type="number"
              {...register("releaseYear")}
              placeholder="e.g. 2014"
              className="bg-zinc-950 border-zinc-800 text-xs text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Style Code / SKU
            </label>
            <Input
              {...register("sku")}
              placeholder="508214-660"
              className="bg-zinc-950 border-zinc-800 text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Colorway
            </label>
            <Input
              {...register("colorway")}
              placeholder="Red / Red"
              className="bg-zinc-950 border-zinc-800 text-xs text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Rarity Tier
            </label>
            <select
              {...register("rarity")}
              className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {RARITIES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Authenticity Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Vault Authenticity Notes &amp; Verification Checks
          </label>
          <Input
            {...register("authenticityNotes")}
            placeholder="e.g. UV blacklight inspected, stitching and inside tag QR verified, og receipt included"
            className="bg-zinc-950 border-zinc-800 text-xs text-white"
          />
        </div>

        {/* Status & Featured */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Storefront Status
            </label>
            <select
              disabled={!isAdmin}
              {...register("status")}
              className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value={ProductStatus.ACTIVE}>ACTIVE — Live on Storefront</option>
              <option value={ProductStatus.DRAFT}>DRAFT — Hidden / Work in Progress</option>
              <option value={ProductStatus.ARCHIVED}>ARCHIVED — Delisted / Closed Vault</option>
            </select>
            {!isAdmin && (
              <p className="text-[11px] text-zinc-500">Only ADMIN can change product status.</p>
            )}
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("isFeatured")}
                className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs font-bold text-white">
                Feature in Vault Showcase / Home Banner
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Initial Variant Card (Create Mode Only) */}
      {mode === "create" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Initial Sizing &amp; Pricing Variant
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Every sneaker requires at least one initial size variant. You can add more sizes after creation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Size (e.g. US 10.5) *
              </label>
              <Input
                {...register("size")}
                placeholder="US 10"
                className="bg-zinc-950 border-zinc-800 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Condition Tier *
              </label>
              <select
                {...register("condition")}
                className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value={Condition.DS}>DS (Deadstock - Brand New)</option>
                <option value={Condition.VNDS}>VNDS (Very Near Deadstock)</option>
                <option value={Condition.USED}>USED (Pre-owned)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Retail Price (₱) *
              </label>
              <Input
                type="number"
                step="0.01"
                {...register("price")}
                placeholder="25000"
                className="bg-zinc-950 border-zinc-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isAdmin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Cost / Acquisition Price (₱)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("costPrice")}
                  placeholder="18000"
                  className="bg-zinc-950 border-zinc-800 text-xs text-white"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Condition Notes (Optional)
              </label>
              <Input
                {...register("conditionNotes")}
                placeholder="e.g. Original box, extra laces included"
                className="bg-zinc-950 border-zinc-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("isOneOfOne")}
                className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs font-bold text-white">
                1-of-1 Grail Allocation (Stock locked to 1)
              </span>
            </label>

            {!isOneOfOneVal && (
              <div className="pt-2">
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Initial Stock Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  {...register("stockQty")}
                  className="bg-zinc-900 border-zinc-800 text-xs text-white w-28"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4">
        <Link href="/admin/products">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Catalog
          </Button>
        </Link>

        <Button
          type="submit"
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === "create" ? "Create Sneaker & Continue" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
