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
      rarity: initialProduct?.rarity || Rarity.STANDARD,
      authenticityNotes: initialProduct?.authenticityNotes || "",
      status: initialProduct?.status || ProductStatus.DRAFT,
      isFeatured: initialProduct?.isFeatured || false,

      // Initial variant defaults
      size: "US 10",
      condition: Condition.DS,
      conditionNotes: "",
      price: 15000,
      costPrice: null,
      stockQty: 1,
      isOneOfOne: false,
    },
  });

  const titleVal = watch("title");
  const isOneOfOneVal = watch("isOneOfOne");

  // Helper to slugify title
  const handleAutoSlug = () => {
    if (!titleVal) return;
    const generated = titleVal
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setValue("slug", generated, { shouldValidate: true });
  };

  const onSubmit = async (data: FormOutput) => {
    setSaving(true);
    setServerError(null);
    setServerSuccess(null);

    try {
      if (mode === "create") {
        if (!data.size || !data.price) {
          setServerError("Initial variant size and retail price are required.");
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
              price: Number(data.price),
              costPrice: data.costPrice ? Number(data.costPrice) : undefined,
              stockQty: data.isOneOfOne ? 1 : Number(data.stockQty),
              isOneOfOne: data.isOneOfOne,
            },
          ],
        });

        if (res.error || !res.product) {
          setServerError(res.error || "Failed to create sneaker.");
        } else {
          setServerSuccess("Product created successfully! Redirecting to manager...");
          router.push(`/admin/products/${res.product.id}/edit`);
        }
      } else if (mode === "edit" && initialProduct) {
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-zinc-900">
      {/* Top alerts */}
      {serverError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-medium shadow-2xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{serverError}</span>
        </div>
      )}

      {serverSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 font-medium shadow-2xs">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{serverSuccess}</span>
        </div>
      )}

      {/* Main Details Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-6 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-500" />
            {mode === "create" ? "Sneaker Information" : "Core Specifications"}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Title, brand taxonomy, style code, and vault authenticity disclosures.
          </p>
        </div>

        {/* Title & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Sneaker Title *
            </label>
            <Input
              {...register("title")}
              placeholder="e.g. Nike Air Yeezy 2 SP 'Red October'"
              className="bg-white border-zinc-300 text-xs text-zinc-900"
            />
            {errors.title && (
              <p className="text-[11px] text-rose-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                URL Slug (Unique)
              </label>
              <button
                type="button"
                onClick={handleAutoSlug}
                className="text-[11px] text-amber-600 hover:text-amber-700 flex items-center gap-1 font-bold"
              >
                <RefreshCw className="h-3 w-3" /> Auto-generate
              </button>
            </div>
            <Input
              {...register("slug")}
              placeholder="e.g. nike-air-yeezy-2-sp-red-october"
              className="bg-white border-zinc-300 text-xs text-zinc-900 font-mono"
            />
            {errors.slug && (
              <p className="text-[11px] text-rose-600">{errors.slug.message}</p>
            )}
          </div>
        </div>

        {/* Brand & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Brand *
            </label>
            <select
              {...register("brandId")}
              className="w-full h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 font-medium"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.brandId && (
              <p className="text-[11px] text-rose-600">{errors.brandId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Category *
            </label>
            <select
              {...register("categoryId")}
              className="w-full h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 font-medium"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-[11px] text-rose-600">{errors.categoryId.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            Description *
          </label>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Detailed write-up of the sneaker's heritage, materials, and release significance..."
            className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-xs text-zinc-900 focus:outline-none focus:border-amber-500"
          />
          {errors.description && (
            <p className="text-[11px] text-rose-600">{errors.description.message}</p>
          )}
        </div>

        {/* Release Year, SKU, Colorway, Rarity */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Release Year
            </label>
            <Input
              type="number"
              {...register("releaseYear")}
              placeholder="e.g. 2014"
              className="bg-white border-zinc-300 text-xs text-zinc-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Style Code / SKU
            </label>
            <Input
              {...register("sku")}
              placeholder="508214-660"
              className="bg-white border-zinc-300 text-xs text-zinc-900 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Colorway
            </label>
            <Input
              {...register("colorway")}
              placeholder="Red / Red"
              className="bg-white border-zinc-300 text-xs text-zinc-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Rarity Tier
            </label>
            <select
              {...register("rarity")}
              className="w-full h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 font-medium"
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
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            Vault Authenticity Notes &amp; Verification Checks
          </label>
          <Input
            {...register("authenticityNotes")}
            placeholder="e.g. UV blacklight inspected, stitching and inside tag QR verified, og receipt included"
            className="bg-white border-zinc-300 text-xs text-zinc-900"
          />
        </div>

        {/* Status & Featured */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Storefront Status
            </label>
            <select
              disabled={!isAdmin}
              {...register("status")}
              className="w-full h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 disabled:opacity-50 font-medium"
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
                className="rounded border-zinc-300 bg-white text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs font-bold text-zinc-900">
                Feature in Vault Showcase / Home Banner
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Initial Variant Card (Create Mode Only) */}
      {mode === "create" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Initial Sizing &amp; Pricing Variant
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Every sneaker requires at least one initial size variant. You can add more sizes after creation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Size (e.g. US 10.5) *
              </label>
              <Input
                {...register("size")}
                placeholder="US 10"
                className="bg-white border-zinc-300 text-xs text-zinc-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Condition Tier *
              </label>
              <select
                {...register("condition")}
                className="w-full h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value={Condition.DS}>DS (Deadstock - Brand New)</option>
                <option value={Condition.VNDS}>VNDS (Very Near Deadstock)</option>
                <option value={Condition.USED}>USED (Pre-owned)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Retail Price (₱) *
              </label>
              <Input
                type="number"
                step="0.01"
                {...register("price")}
                placeholder="25000"
                className="bg-white border-zinc-300 text-xs text-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isAdmin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Cost / Acquisition Price (₱)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("costPrice")}
                  placeholder="18000"
                  className="bg-white border-zinc-300 text-xs text-zinc-900"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Condition Notes (Optional)
              </label>
              <Input
                {...register("conditionNotes")}
                placeholder="e.g. Original box, extra laces included"
                className="bg-white border-zinc-300 text-xs text-zinc-900"
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("isOneOfOne")}
                className="rounded border-zinc-300 bg-white text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs font-bold text-zinc-900">
                1-of-1 Grail Allocation (Stock locked to 1)
              </span>
            </label>

            {!isOneOfOneVal && (
              <div className="pt-2">
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Initial Stock Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  {...register("stockQty")}
                  className="bg-white border-zinc-300 text-xs text-zinc-900 w-28"
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
            className="border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 flex items-center gap-1.5 shadow-2xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Catalog
          </Button>
        </Link>

        <Button
          type="submit"
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-2 shadow-xs"
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
