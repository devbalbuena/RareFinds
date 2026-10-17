import * as React from "react";
import Link from "next/link";
import { SearchX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { CatalogMobileFilterSheet } from "@/components/catalog/CatalogMobileFilterSheet";
import { CatalogSortSelect } from "@/components/catalog/CatalogSortSelect";
import { CatalogPagination } from "@/components/catalog/CatalogPagination";
import {
  getCatalogFilterOptions,
  getFilteredProducts,
  type CatalogFilterParams,
} from "@/lib/queries/products";

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage(props: ProductsPageProps) {
  // Next.js 16 requirement: await searchParams
  const resolvedSearchParams = await props.searchParams;

  const filterParams: CatalogFilterParams = {
    search: typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : undefined,
    brand: resolvedSearchParams.brand,
    category: resolvedSearchParams.category,
    condition: resolvedSearchParams.condition,
    size: resolvedSearchParams.size,
    minPrice: typeof resolvedSearchParams.minPrice === "string" ? resolvedSearchParams.minPrice : undefined,
    maxPrice: typeof resolvedSearchParams.maxPrice === "string" ? resolvedSearchParams.maxPrice : undefined,
    availability:
      resolvedSearchParams.availability === "in_stock" ||
      resolvedSearchParams.availability === "sold"
        ? (resolvedSearchParams.availability as "in_stock" | "sold")
        : "all",
    sort:
      resolvedSearchParams.sort === "price_asc" ||
      resolvedSearchParams.sort === "price_desc" ||
      resolvedSearchParams.sort === "rarity"
        ? (resolvedSearchParams.sort as "price_asc" | "price_desc" | "rarity")
        : "newest",
    page: typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : "1",
  };

  const [filterOptions, catalogData] = await Promise.all([
    getCatalogFilterOptions(),
    getFilteredProducts(filterParams),
  ]);

  const { products, totalCount, totalPages, currentPage } = catalogData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Catalog Title & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            The Sneaker Vault
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? "authenticated pair" : "authenticated pairs"} in collection
            {filterParams.search && (
              <span> matching &ldquo;{filterParams.search}&rdquo;</span>
            )}
          </p>
        </div>

        {/* Controls: Mobile Filter Drawer + Sort Selector */}
        <div className="flex items-center gap-3">
          <CatalogMobileFilterSheet options={filterOptions} />
          <CatalogSortSelect />
        </div>
      </div>

      {/* Main Catalog Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 pr-4">
            <CatalogFilters options={filterOptions} />
          </div>
        </aside>

        {/* Product Grid / Empty State */}
        <div className="lg:col-span-3 flex flex-col justify-between">
          {products.length > 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              <CatalogPagination
                currentPage={currentPage}
                totalPages={totalPages}
              />
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border rounded-2xl bg-secondary/30">
              <div className="p-4 rounded-full bg-secondary text-muted-foreground mb-4">
                <SearchX className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                No Grails Found Matching Your Filter
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
                We couldn&apos;t find any pairs matching your current combination of filters or search terms. Try loosening your criteria or resetting.
              </p>
              <div className="mt-6 flex gap-3">
                <Button asChild variant="default" size="sm" className="gap-2">
                  <Link href="/products">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset All Filters
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
