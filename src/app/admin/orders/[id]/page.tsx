import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreSettings } from "@/lib/settings";
import { getAdminOrderByIdAction } from "@/actions/admin-orders";
import { OrderDetailView } from "@/components/admin/OrderDetailView";

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  props: AdminOrderDetailPageProps
): Promise<Metadata> {
  const { id } = await props.params;
  const data = await getAdminOrderByIdAction(id);

  if (!data?.order) {
    return { title: "Order Not Found | Admin" };
  }

  return {
    title: `Order ${data.order.orderNumber} | Admin Fulfillment`,
  };
}

export default async function AdminOrderDetailPage(
  props: AdminOrderDetailPageProps
) {
  try {
    await verifyAdminSession("admin:access");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("deactivated")) {
      redirect("/sign-in?error=deactivated");
    }
    redirect("/sign-in?callbackUrl=/admin/orders");
  }

  const { id } = await props.params;
  const result = await getAdminOrderByIdAction(id);

  if (!result || !result.order) {
    notFound();
  }

  const storeSettings = await getStoreSettings();

  return (
    <OrderDetailView
      order={result.order}
      auditLogs={result.auditLogs}
      storeConfig={{
        storeName: storeSettings.storeName,
        storeTagline: storeSettings.storeTagline,
        contactEmail: storeSettings.contactEmail,
        contactPhone: storeSettings.contactPhone,
        address: storeSettings.address,
        currencySymbol: storeSettings.currencySymbol,
      }}
    />
  );
}
