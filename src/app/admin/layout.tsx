import * as React from "react";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreSettings } from "@/lib/settings";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    // Re-read current role and isActive directly from database (never trust JWT alone)
    user = await verifyAdminSession("admin:access");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("deactivated")) {
      redirect("/sign-in?error=deactivated");
    }
    if (msg.includes("signed in")) {
      redirect("/sign-in?callbackUrl=/admin");
    }
    redirect("/");
  }

  const storeSettings = await getStoreSettings();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Role-aware dynamic sidebar */}
      <AdminSidebar
        userRole={user.role}
        userName={user.name || "Team Member"}
        userEmail={user.email}
        storeName={storeSettings.storeName}
      />

      {/* Admin content viewport */}
      <main className="flex-1 min-w-0 bg-zinc-900/40 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
