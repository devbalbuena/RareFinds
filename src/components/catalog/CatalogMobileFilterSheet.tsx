"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CatalogFilters } from "./CatalogFilters";
import { useSearchParams } from "next/navigation";

interface CatalogMobileFilterSheetProps {
  options: {
    brands: { id: string; name: string; slug: string }[];
    categories: { id: string; name: string; slug: string }[];
    sizes: string[];
    priceRange: { min: number; max: number };
  };
}

export function CatalogMobileFilterSheet({
  options,
}: CatalogMobileFilterSheetProps) {
  const [open, setOpen] = React.useState(false);
  const searchParams = useSearchParams();

  // Count active filters
  const activeCount = React.useMemo(() => {
    let count = 0;
    if (searchParams.get("brand")) count += searchParams.get("brand")!.split(",").length;
    if (searchParams.get("category")) count += searchParams.get("category")!.split(",").length;
    if (searchParams.get("condition")) count += searchParams.get("condition")!.split(",").length;
    if (searchParams.get("size")) count += searchParams.get("size")!.split(",").length;
    if (searchParams.get("availability")) count += 1;
    if (searchParams.get("minPrice") || searchParams.get("maxPrice")) count += 1;
    return count;
  }, [searchParams]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden h-9 gap-2 text-xs font-semibold"
          aria-label="Filter sneakers"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto p-6">
        <SheetHeader className="text-left border-b pb-4">
          <SheetTitle className="text-lg font-bold tracking-tight">
            Filters & Refinements
          </SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <CatalogFilters options={options} onFilterChange={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
