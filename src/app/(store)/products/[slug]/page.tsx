import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Calendar, Tag } from "lucide-react";
import { getProductBySlug } from "@/lib/queries/products";
import { ProductImageGallery } from "@/components/catalog/ProductImageGallery";
import { ProductVariantSelector } from "@/components/catalog/ProductVariantSelector";
import { AuthenticityCard } from "@/components/catalog/AuthenticityCard";
import { ConditionGuideCard } from "@/components/catalog/ConditionGuideCard";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  props: ProductDetailPageProps
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Sneaker Not Found | RareFinds",
    };
  }

  const primaryImage =
    product.images.find((img) => img.isPrimary)?.url ||
    product.images[0]?.url;

  return {
    title: `${product.title} | RareFinds Vault`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: `${product.title} | RareFinds`,
      description: product.description.slice(0, 160),
      images: primaryImage ? [{ url: primaryImage }] : [],
    },
  };
}

export default async function ProductDetailPage(props: ProductDetailPageProps) {
  // Next.js 16 requirement: await params
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const isSoldOut =
    product.variants.length > 0 &&
    product.variants.every((v) => v.isSold || v.stockQty <= 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground pb-6">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="hover:text-foreground transition-colors">
          Catalog
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href={`/products?brand=${product.brand.slug}`}
          className="hover:text-foreground transition-colors"
        >
          {product.brand.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-md">
          {product.title}
        </span>
      </nav>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Image Gallery (5 cols) */}
        <div className="lg:col-span-6 xl:col-span-7">
          <div className="sticky top-24">
            <ProductImageGallery
              images={product.images}
              title={product.title}
              rarity={product.rarity}
              isSoldOut={isSoldOut}
            />
          </div>
        </div>

        {/* Right Column: Details, Variant Selector & Guides (7 cols) */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-8">
          {/* Header Info */}
          <div className="space-y-3 border-b pb-6">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              <Link
                href={`/products?brand=${product.brand.slug}`}
                className="hover:text-primary transition-colors font-bold text-foreground"
              >
                {product.brand.name}
              </Link>
              {product.releaseYear && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {product.releaseYear}
                </span>
              )}
              {product.category && (
                <span>• {product.category.name}</span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
              {product.title}
            </h1>

            {/* SKU and Colorway Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              {product.sku && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary font-mono text-[11px]">
                  <Tag className="h-3 w-3" />
                  SKU: {product.sku}
                </span>
              )}
              {product.colorway && (
                <span className="px-2.5 py-1 rounded-md bg-secondary text-[11px]">
                  {product.colorway}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Variant & Sizing Selector */}
          <ProductVariantSelector variants={product.variants} />

          {/* Authenticity Guarantee Card */}
          <AuthenticityCard notes={product.authenticityNotes} />

          {/* Condition Grading Guide Card */}
          <ConditionGuideCard />

          {/* Sneaker Story & Description */}
          <div className="space-y-3 border-t pt-6 text-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Sneaker Archive & Story
            </h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
