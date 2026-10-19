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
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin" className="hover:text-white">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/admin/products" className="hover:text-white">
            Sneakers
          </Link>
          <span>/</span>
          <span className="text-zinc-300">{product.title}</span>
        </div>

        {product.status === ProductStatus.ACTIVE && (
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold transition-colors"
          >
            <span>View Live on Store</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              {product.title}
            </h1>
            {product.status === ProductStatus.ACTIVE && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-semibold">
                ACTIVE
              </Badge>
            )}
            {product.status === ProductStatus.DRAFT && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs font-semibold">
                DRAFT
              </Badge>
            )}
            {product.status === ProductStatus.ARCHIVED && (
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs font-semibold">
                ARCHIVED
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            /{product.slug} • Brand: <span className="text-white font-semibold">{product.brand.name}</span> •
            Category: <span className="text-white font-semibold">{product.category.name}</span>
          </p>
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
