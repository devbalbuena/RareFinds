import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Shield, Package, ShoppingBag, ArrowLeft, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboardPage() {
  const session = await auth();

  // Server-side authorization check (never rely solely on proxy)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [productCount, brandCount, categoryCount, userCount] = await Promise.all([
    prisma.product.count(),
    prisma.brand.count(),
    prisma.category.count(),
    prisma.user.count(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Return to Storefront
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                Vault Command Center
              </h1>
              <Badge variant="grail" className="text-xs">
                ADMIN SECURED
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Logged in as store owner: <strong className="text-white">{session.user.email}</strong>
            </p>
          </div>
        </div>

        {/* Inventory Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Active Sneakers</span>
                <ShoppingBag className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black text-white">{productCount}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Catalog pairs in database</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Brands Cataloged</span>
                <Layers className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black text-white">{brandCount}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Sneaker labels registered</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Categories</span>
                <Package className="h-4 w-4 text-sky-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black text-white">{categoryCount}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Taxonomies active</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Total Users</span>
                <Shield className="h-4 w-4 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black text-white">{userCount}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Customers & Administrators</p>
            </CardContent>
          </Card>
        </div>

        {/* Phase 5 Notice Card */}
        <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Shield className="h-4 w-4" />
            Admin Operations Pipeline
          </div>
          <h3 className="text-lg font-bold text-white">
            Full Product Management & Order Fulfillment coming in Phase 5
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
            This route is strictly guarded by both the Next.js 16 proxy and server-side role validation. In Phase 5, the full sneaker creator form with drag-and-drop Supabase image uploads, 1-of-1 toggle, condition notes editor, and live order status tracker will be mounted here.
          </p>
        </div>
      </div>
    </div>
  );
}
