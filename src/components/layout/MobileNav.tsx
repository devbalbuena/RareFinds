"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles, Shield, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchInput } from "./SearchInput";

interface MobileNavProps {
  brands?: { name: string; slug: string }[];
}

export function MobileNav({ brands = [] }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = React.useState(pathname);

  // Close sheet when navigating
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-sm flex flex-col p-6">
        <SheetHeader className="text-left border-b pb-4">
          <SheetTitle className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-1.5">
            <span>RARE</span>
            <span className="text-amber-500">FINDS</span>
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Single-Vendor Rare & Limited Footwear
          </p>
        </SheetHeader>

        <div className="py-4">
          <React.Suspense fallback={<div className="h-9 bg-muted rounded-full" />}>
            <SearchInput placeholder="Search catalog..." />
          </React.Suspense>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
              Explore
            </p>
            <Link
              href="/products"
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            >
              <Flame className="h-4 w-4 text-orange-500" />
              All Sneakers
            </Link>
            <Link
              href="/products?sort=rarity"
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Holy Grails
            </Link>
            <Link
              href="/products?condition=DS"
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            >
              <Shield className="h-4 w-4 text-emerald-500" />
              Deadstock (Brand New)
            </Link>
          </div>

          {brands.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
                Brands
              </p>
              {brands.map((b) => (
                <Link
                  key={b.slug}
                  href={`/products?brand=${b.slug}`}
                  className="block px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">100% Authentic Guarantee</p>
          <p>Every pair physically inspected & graded before listing.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
