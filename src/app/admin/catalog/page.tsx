import { verifyAdminSession } from "@/lib/admin-auth";
import { getCatalogAction } from "@/actions/catalog";
import { CatalogManagementTable } from "@/components/admin/CatalogManagementTable";

export const metadata = {
  title: "Brands & Categories | RareFinds Vault Admin",
  description: "Manage sneaker brands and categories in the vault catalog.",
};

export default async function AdminCatalogPage() {
  const caller = await verifyAdminSession("product:view");
  const { brands, categories } = await getCatalogAction();

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto">
      <CatalogManagementTable
        initialBrands={brands}
        initialCategories={categories}
        userRole={caller.role}
      />
    </div>
  );
}
