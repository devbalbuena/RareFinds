"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CatalogSortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSort === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", newSort);
    }
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
        Sort by:
      </span>
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[170px] h-9 text-xs">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="newest" className="text-xs">
            Newest Arrivals
          </SelectItem>
          <SelectItem value="rarity" className="text-xs">
            Highest Rarity / Grails
          </SelectItem>
          <SelectItem value="price_asc" className="text-xs">
            Price: Low to High
          </SelectItem>
          <SelectItem value="price_desc" className="text-xs">
            Price: High to Low
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
