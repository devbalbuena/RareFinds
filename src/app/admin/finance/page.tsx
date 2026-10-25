import { verifyAdminSession } from "@/lib/admin-auth";
import { getFinanceDataAction } from "@/actions/finance";
import { FinanceDashboardClient } from "@/components/admin/finance/FinanceDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance Command Center | RareFinds Admin",
  description: "Philippine Peso transaction settlement, gross margins, and courier cash collections.",
};

export default async function AdminFinancePage() {
  await verifyAdminSession("finance:view");

  const res = await getFinanceDataAction({ includeSimulated: true });

  if (res.error || !res.data) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
        <h2 className="text-lg font-bold">Failed to load finance data</h2>
        <p className="text-xs text-rose-600 mt-1">{res.error || "Unknown server error."}</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-6">
      <FinanceDashboardClient initialData={res.data} />
    </div>
  );
}
