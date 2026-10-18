import { verifyAdminSession } from "@/lib/admin-auth";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AdminOrdersPlaceholderPage() {
  await verifyAdminSession("order:view");

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/admin" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Orders</span>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <ShoppingBag className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">
            Order Fulfillment Center
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Coming in the next phase: Live order status management (confirming COD orders, mark shipped, courier tracking IDs, and customer notifications).
          </p>
        </div>
      </div>
    </div>
  );
}
