import * as React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "./SearchInput";
import { MobileNav } from "./MobileNav";
import prisma from "@/lib/prisma";

export async function StoreHeader() {
  const brands = await prisma.brand.findMany({
    select: { name: true, slug: true },
    orderBy: { name: "asc" },
    take: 6,
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-all">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Nav + Logo */}
        <div className="flex items-center gap-3">
          <MobileNav brands={brands} />

          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-foreground group-hover:text-amber-500 transition-colors">
              RARE<span className="text-amber-500 group-hover:text-foreground">FINDS</span>
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/products"
            className="text-foreground/80 hover:text-foreground transition-colors hover:underline underline-offset-8"
          >
            All Sneakers
          </Link>
          <Link
            href="/products?sort=rarity"
            className="text-foreground/80 hover:text-foreground transition-colors hover:underline underline-offset-8"
          >
            Holy Grails
          </Link>
          <Link
            href="/products?sort=newest"
            className="text-foreground/80 hover:text-foreground transition-colors hover:underline underline-offset-8"
          >
            Just Landed
          </Link>
          <Link
            href="/products?condition=DS"
            className="text-foreground/80 hover:text-foreground transition-colors hover:underline underline-offset-8"
          >
            Deadstock
          </Link>
        </nav>

        {/* Right: Search & Cart */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:block w-48 md:w-64 lg:w-80">
            <React.Suspense fallback={<div className="h-9 bg-muted rounded-full animate-pulse" />}>
              <SearchInput />
            </React.Suspense>
          </div>

          {/* Cart Icon (Static for Phase 2, shows 0) */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Shopping bag"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              0
            </span>
          </Button>
        </div>
      </div>

      {/* Mobile search bar visible under header on very small screens */}
      <div className="sm:hidden px-4 pb-3">
        <React.Suspense fallback={<div className="h-9 bg-muted rounded-full" />}>
          <SearchInput placeholder="Search rare sneakers..." />
        </React.Suspense>
      </div>
    </header>
  );
}
