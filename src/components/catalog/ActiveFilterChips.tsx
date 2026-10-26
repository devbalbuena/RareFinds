"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActiveFilterChipsProps {
  brandMap?: Record<string, string>; // slug -> Name
  categoryMap?: Record<string, string>; // slug -> Name
}

export function ActiveFilterChips({ brandMap = {}, categoryMap = {} }: ActiveFilterChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to read multi-value param
  const getArrayParam = (key: string): string[] => {
    const val = searchParams.get(key);
    if (!val) return [];
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const selectedBrands = getArrayParam("brand");
  const selectedCategories = getArrayParam("category");
  const selectedConditions = getArrayParam("condition");
  const selectedSizes = getArrayParam("size");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const availability = searchParams.get("availability");

  const hasAnyFilter = Boolean(
    selectedBrands.length ||
    selectedCategories.length ||
    selectedConditions.length ||
    selectedSizes.length ||
    minPrice ||
    maxPrice ||
    (availability && availability !== "all")
  );

  if (!hasAnyFilter) return null;

  const removeArrayItem = (key: string, item: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = getArrayParam(key);
    const updated = current.filter((x) => x !== item);
    if (updated.length > 0) {
      params.set(key, updated.join(","));
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

  const removeSingleParam = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

  const removePriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("minPrice");
    params.delete("maxPrice");
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

  const handleClearAll = () => {
    const params = new URLSearchParams();
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b border-border/60 text-xs">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
        Active Filters:
      </span>

      {/* Brands */}
      {selectedBrands.map((slug) => (
        <Badge
          key={`brand-${slug}`}
          variant="secondary"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition"
        >
          <span>Brand: {brandMap[slug] || slug}</span>
          <button
            type="button"
            onClick={() => removeArrayItem("brand", slug)}
            className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
            aria-label={`Remove ${slug} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Categories */}
      {selectedCategories.map((slug) => (
        <Badge
          key={`cat-${slug}`}
          variant="secondary"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition"
        >
          <span>Category: {categoryMap[slug] || slug}</span>
          <button
            type="button"
            onClick={() => removeArrayItem("category", slug)}
            className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
            aria-label={`Remove ${slug} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Condition */}
      {selectedConditions.map((cond) => (
        <Badge
          key={`cond-${cond}`}
          variant="secondary"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition"
        >
          <span>Grade: {cond}</span>
          <button
            type="button"
            onClick={() => removeArrayItem("condition", cond)}
            className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
            aria-label={`Remove ${cond} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Sizes */}
      {selectedSizes.map((size) => (
        <Badge
          key={`size-${size}`}
          variant="secondary"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition"
        >
          <span>Size: {size}</span>
          <button
            type="button"
            onClick={() => removeArrayItem("size", size)}
            className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
            aria-label={`Remove size ${size} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Price Range */}
      {(minPrice || maxPrice) && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition"
        >
          <span>
            Price: ₱{minPrice ? Number(minPrice).toLocaleString("en-PH") : "0"} -{" "}
            {maxPrice ? `₱${Number(maxPrice).toLocaleString("en-PH")}` : "Any"}
          </span>
          <button
            type="button"
            onClick={removePriceFilter}
            className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
            aria-label="Remove price filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Availability */}
      {availability && availability !== "all" && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition"
        >
          <span>Availability: {availability === "in_stock" ? "In Stock" : "Sold Out"}</span>
          <button
            type="button"
            onClick={() => removeSingleParam("availability")}
            className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
            aria-label="Remove availability filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Clear All Button */}
      <button
        type="button"
        onClick={handleClearAll}
        className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 ml-1 cursor-pointer"
      >
        <RotateCcw className="h-3 w-3" />
        <span>Clear All</span>
      </button>
    </div>
  );
}
