import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreSettings } from "@/lib/settings";
import { getAdminCustomersAction } from "@/actions/admin-customers";
import { CustomerManagementTable } from "@/components/admin/CustomerManagementTable";

export const metadata: Metadata = {
  title: "Customer Directory | RareFinds Admin",
};

interface AdminCustomersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    role?: string;
    sortBy?: "spend_desc" | "orders_desc" | "newest" | "oldest";
  }>;
}

export default async function AdminCustomersPage(props: AdminCustomersPageProps) {
  try {
    await verifyAdminSession("customer:view");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("deactivated")) {
      redirect("/sign-in?error=deactivated");
    }
    redirect("/sign-in?callbackUrl=/admin/customers");
  }

  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || "1", 10);

  const { customers, totalCount, totalPages, currentPage, metrics } =
    await getAdminCustomersAction({
      page: isNaN(page) ? 1 : page,
      pageSize: 15,
      search: searchParams.search,
      role: searchParams.role,
      sortBy: searchParams.sortBy,
    });

  const storeSettings = await getStoreSettings();

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Link href="/admin" className="hover:text-zinc-900 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Dashboard
            </Link>
            <span>/</span>
            <span className="text-zinc-900 font-semibold">Customers</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-900">
                Customer & Collector Directory
              </h1>
              <p className="text-xs text-zinc-500">
                Track buyer lifetime values, spending tiers, order frequencies, and shipping profiles.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Table & Metrics */}
      <CustomerManagementTable
        initialCustomers={customers}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        metrics={metrics}
        currencySymbol={storeSettings.currencySymbol}
      />
    </div>
  );
}
