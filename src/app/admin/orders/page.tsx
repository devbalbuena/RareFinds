import { verifyAdminSession } from "@/lib/admin-auth";
import { getAdminOrdersAction } from "@/actions/admin-orders";
import { OrderManagementTable } from "@/components/admin/OrderManagementTable";
import { OrderStatus } from "@prisma/client";

export const metadata = {
  title: "Order Fulfillment Center | RareFinds Vault Admin",
  description: "Manage customer orders, COD confirmations, packaging, and courier dispatches.",
};

interface AdminOrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminOrdersPage(props: AdminOrdersPageProps) {
  const caller = await verifyAdminSession("order:view");
  const searchParams = await props.searchParams;

  const search = typeof searchParams.search === "string" ? searchParams.search : "";
  const rawStatus = typeof searchParams.status === "string" ? searchParams.status : "ALL";
  const status = Object.values(OrderStatus).includes(rawStatus as OrderStatus)
    ? (rawStatus as OrderStatus)
    : "ALL";

  const ordersRes = await getAdminOrdersAction({
    page: 1,
    pageSize: 15,
    search: search || undefined,
    status,
    sortBy: "newest",
  });

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto">
      <OrderManagementTable
        initialOrders={ordersRes.orders}
        initialTotal={ordersRes.totalCount}
        initialPage={ordersRes.currentPage}
        initialTotalPages={ordersRes.totalPages}
        initialStatusCounts={ordersRes.statusCounts}
        initialSearch={search}
        initialStatus={status}
        userRole={caller.role}
      />
    </div>
  );
}
