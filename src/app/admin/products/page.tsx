import { verifyAdminSession } from "@/lib/admin-auth";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AdminProductsPlaceholderPage() {
  await verifyAdminSession("product:view");

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/admin" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Inventory &amp; Stock</span>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
          <Package className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">
            Sneaker Catalog &amp; Vault Stock
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Coming in the next phase: Variant stock controls, 1-of-1 grail allocation manager, image uploader with Supabase storage, and condition disclosures.
          </p>
        </div>
      </div>
    </div>
  );
}
