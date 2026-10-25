import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await verifyAdminSession("settings:view");
  const settings = await getStoreSettings();

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/admin" className="hover:text-zinc-900 flex items-center gap-1 font-semibold">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Store Settings</span>
      </div>

      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-amber-500" />
          Store Settings &amp; Configuration
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Configure branding, official contact channels, base shipping fees, and currency display.
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
