import { notFound } from "next/navigation";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { getAdminProductByIdAction } from "@/actions/products";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductVariantManager, ManagedVariant } from "@/components/admin/ProductVariantManager";
import { ProductImageManager, ManagedProductImage } from "@/components/admin/ProductImageManager";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { title: true },
  });

  return {
    title: product ? `Edit ${product.title} | RareFinds Vault Admin` : "Edit Sneaker",
  };
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const caller = await verifyAdminSession("product:view");

  const [productRes, brands, categories] = await Promise.all([
    getAdminProductByIdAction(id),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (productRes.error || !productRes.product) {
    notFound();
  }

  const product = productRes.product;

  const totalStock = product.variants.reduce((sum, v) => sum + v.stockQty, 0);
  const activeSizesCount = product.variants.filter((v) => !v.isSold && v.stockQty > 0).length;
  const isSoldOut = product.variants.length > 0 && activeSizesCount === 0;
  const isLowStock = !isSoldOut && totalStock <= 2 && totalStock > 0;

  const initialVariants: ManagedVariant[] = product.variants.map((v) => ({
    id: v.id,
    size: v.size,
    condition: v.condition,
    conditionNotes: v.conditionNotes,
    price: Number(v.price),
    costPrice: v.costPrice !== null && v.costPrice !== undefined ? Number(v.costPrice) : null,
    stockQty: v.stockQty,
    isOneOfOne: v.isOneOfOne,
    isSold: v.isSold,
  }));

  const initialImages: ManagedProductImage[] = product.images.map((img) => ({
    id: img.id,
    url: img.url,
    altText: img.altText,
    isPrimary: img.isPrimary,
    sortOrder: img.sortOrder,
  }));

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-8 text-zinc-900">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
          <Link href="/admin" className="hover:text-zinc-900 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/admin/products" className="hover:text-zinc-900 transition-colors">
            Sneakers
          </Link>
          <span>/</span>
          <span className="text-zinc-900 font-bold line-clamp-1 max-w-xs">{product.title}</span>
        </div>

        {product.status === ProductStatus.ACTIVE && (
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg font-bold transition-all shadow-2xs"
          >
            <span>View Live on Store</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6 bg-white p-6 rounded-2xl border shadow-xs">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900">
              {product.title}
            </h1>
            {product.status === ProductStatus.ACTIVE && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                ACTIVE
              </Badge>
            )}
            {product.status === ProductStatus.DRAFT && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold">
                DRAFT
              </Badge>
            )}
            {product.status === ProductStatus.ARCHIVED && (
              <Badge className="bg-zinc-100 text-zinc-700 border-zinc-300 text-xs font-bold">
                ARCHIVED
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-700 border border-zinc-200 font-medium">
              /{product.slug}
            </span>
            <span>•</span>
            <span>Brand: <strong className="text-zinc-900">{product.brand.name}</strong></span>
            <span>•</span>
            <span>Category: <strong className="text-zinc-900">{product.category.name}</strong></span>
            {product.sku && (
              <>
                <span>•</span>
                <span className="font-mono text-zinc-500">SKU: {product.sku}</span>
              </>
            )}
          </div>
        </div>

        {/* Inventory Summary Badge */}
        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Vault Total:</span>
            <span className="text-sm font-black font-mono text-zinc-900">
              {totalStock} {totalStock === 1 ? "pair" : "pairs"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isSoldOut ? (
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                SOLD OUT
              </Badge>
            ) : isLowStock ? (
              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                LOW STOCK ({totalStock} left)
              </Badge>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                IN STOCK ({activeSizesCount} {activeSizesCount === 1 ? "size" : "sizes"})
              </Badge>
            )}
            {product.variants.some((v) => v.isOneOfOne) && (
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                1-OF-1 GRAIL
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Gallery & Storage Images */}
      <section>
        <ProductImageManager
          productId={product.id}
          initialImages={initialImages}
        />
      </section>

      {/* Section 2: Variants & Stock Disclosures */}
      <section>
        <ProductVariantManager
          productId={product.id}
          productTitle={product.title}
          initialVariants={initialVariants}
          userRole={caller.role}
        />
      </section>

      {/* Section 3: Core Sneaker Specifications */}
      <section className="space-y-4">
        <ProductForm
          mode="edit"
          initialProduct={{
            id: product.id,
            title: product.title,
            slug: product.slug,
            brandId: product.brandId,
            categoryId: product.categoryId,
            description: product.description,
            releaseYear: product.releaseYear,
            colorway: product.colorway,
            sku: product.sku,
            rarity: product.rarity,
            authenticityNotes: product.authenticityNotes,
            status: product.status,
            isFeatured: product.isFeatured,
          }}
          brands={brands}
          categories={categories}
          userRole={caller.role}
        />
      </section>
    </div>
  );
}
