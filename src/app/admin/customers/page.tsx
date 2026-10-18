import { verifyAdminSession } from "@/lib/admin-auth";
import { Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AdminCustomersPlaceholderPage() {
  await verifyAdminSession("customer:view");

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/admin" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Customers</span>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Users className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">
            Customer Directory
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Coming in the next phase: Registered buyer directory, vault purchase histories, shipping address profiles, and collector tier badges.
          </p>
        </div>
      </div>
    </div>
  );
}
