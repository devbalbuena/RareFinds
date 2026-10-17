"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw } from "lucide-react";
import { Condition } from "@prisma/client";

interface CatalogFiltersProps {
  options: {
    brands: { id: string; name: string; slug: string }[];
    categories: { id: string; name: string; slug: string }[];
    sizes: string[];
    priceRange: { min: number; max: number };
  };
  onFilterChange?: () => void;
}

export function CatalogFilters({ options, onFilterChange }: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to read multi-value query param
  const getParamArray = (key: string): string[] => {
    const val = searchParams.get(key);
    if (!val) return [];
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const selectedBrands = getParamArray("brand");
  const selectedCategories = getParamArray("category");
  const selectedConditions = getParamArray("condition");
  const selectedSizes = getParamArray("size");
  const selectedAvailability = searchParams.get("availability") || "all";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";

  // Local state for price inputs
  const [prevMinPrice, setPrevMinPrice] = React.useState(currentMinPrice);
  const [prevMaxPrice, setPrevMaxPrice] = React.useState(currentMaxPrice);
  const [minPrice, setMinPrice] = React.useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = React.useState(currentMaxPrice);

  if (prevMinPrice !== currentMinPrice || prevMaxPrice !== currentMaxPrice) {
    setPrevMinPrice(currentMinPrice);
    setPrevMaxPrice(currentMaxPrice);
    setMinPrice(currentMinPrice);
    setMaxPrice(currentMaxPrice);
  }

  // Update URL params
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    // Reset to page 1 on filter modification
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
    if (onFilterChange) onFilterChange();
  };

  const toggleArrayItem = (key: string, item: string) => {
    const current = getParamArray(key);
    const updated = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    updateParams({ [key]: updated.length > 0 ? updated.join(",") : null });
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      minPrice: minPrice ? minPrice : null,
      maxPrice: maxPrice ? maxPrice : null,
    });
  };

  const handleReset = () => {
    const params = new URLSearchParams();
    // Preserve search and sort if present
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
    if (onFilterChange) onFilterChange();
  };

  const hasActiveFilters = Boolean(
    selectedBrands.length ||
    selectedCategories.length ||
    selectedConditions.length ||
    selectedSizes.length ||
    selectedAvailability !== "all" ||
    currentMinPrice ||
    currentMaxPrice
  );

  return (
    <div className="space-y-6 text-sm">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b">
        <h3 className="font-bold uppercase tracking-wider text-xs text-foreground">
          Filter Catalog
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Availability Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Availability
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-secondary rounded-lg text-xs font-medium">
          {[
            { label: "All", value: "all" },
            { label: "In Vault", value: "in_stock" },
            { label: "Sold", value: "sold" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() =>
                updateParams({
                  availability: tab.value === "all" ? null : tab.value,
                })
              }
              className={`py-1.5 rounded-md transition-all text-center cursor-pointer ${
                selectedAvailability === tab.value
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Condition Grade Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Condition Grade
        </label>
        <div className="space-y-2">
          {[
            { id: Condition.DS, label: "DS (Deadstock / Brand New)" },
            { id: Condition.VNDS, label: "VNDS (Very Near Deadstock)" },
            { id: Condition.USED, label: "USED (Pre-Owned / Graded)" },
          ].map((cond) => {
            const isChecked = selectedConditions.includes(cond.id);
            return (
              <label
                key={cond.id}
                className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer select-none hover:text-primary transition-colors"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleArrayItem("condition", cond.id)}
                />
                <span>{cond.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Brand Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Brands
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {options.brands.map((brand) => {
            const isChecked = selectedBrands.includes(brand.slug);
            return (
              <label
                key={brand.id}
                className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer select-none hover:text-primary transition-colors"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleArrayItem("brand", brand.slug)}
                />
                <span>{brand.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Sizing Filter (Pill buttons) */}
      {options.sizes.length > 0 && (
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Size
          </label>
          <div className="flex flex-wrap gap-1.5">
            {options.sizes.map((size) => {
              const isSelected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleArrayItem("size", size)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                      : "bg-background text-foreground border-input hover:bg-accent"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Category
        </label>
        <div className="space-y-2">
          {options.categories.map((cat) => {
            const isChecked = selectedCategories.includes(cat.slug);
            return (
              <label
                key={cat.id}
                className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer select-none hover:text-primary transition-colors"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleArrayItem("category", cat.slug)}
                />
                <span>{cat.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <form onSubmit={handlePriceApply} className="space-y-2.5 pt-2 border-t">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Price Range (₱)
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min ₱"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-8 text-xs"
          />
          <span className="text-muted-foreground text-xs">-</span>
          <Input
            type="number"
            placeholder="Max ₱"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="w-full h-8 text-xs font-medium"
        >
          Apply Price Filter
        </Button>
      </form>
    </div>
  );
}
