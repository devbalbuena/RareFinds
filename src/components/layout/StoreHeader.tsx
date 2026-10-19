import * as React from "react";
import Link from "next/link";
import { SearchInput } from "./SearchInput";
import { MobileNav } from "./MobileNav";
import { UserNav } from "./UserNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

import { Shield } from "lucide-react";
import { getStoreSettings } from "@/lib/settings";

export async function StoreHeader() {
  const [brands, session, settings] = await Promise.all([
    prisma.brand.findMany({
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
      take: 6,
    }),
    auth(),
    getStoreSettings(),
  ]);

  const isStaffOrAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-all">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Nav + Logo */}
        <div className="flex items-center gap-3">
          <MobileNav brands={brands} />

          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-foreground group-hover:text-amber-500 transition-colors">
              {settings.storeName}
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

        {/* Right: Search, Cart & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block w-40 md:w-56 lg:w-72">
            <React.Suspense fallback={<div className="h-9 bg-muted rounded-full animate-pulse" />}>
              <SearchInput />
            </React.Suspense>
          </div>

          {/* Quick Dashboard link for Staff and Admins */}
          {isStaffOrAdmin && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 text-xs font-bold transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
          )}

          {/* User Account Menu / Sign In */}
          <UserNav user={session?.user} />

          {/* Live Cart Drawer */}
          <CartDrawer />
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
