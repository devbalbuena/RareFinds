import { verifyAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { getAdminProductsAction } from "@/actions/products";
import { ProductManagementTable, SerializedAdminProduct } from "@/components/admin/ProductManagementTable";

export const metadata = {
  title: "Sneaker Inventory & Catalog | RareFinds Vault Admin",
  description: "Manage sneaker catalog, sizing variants, condition disclosures, and vault stock.",
};

interface AdminProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminProductsPage(props: AdminProductsPageProps) {
  const caller = await verifyAdminSession("product:view");
  const searchParams = await props.searchParams;
  const initialSearch =
    typeof searchParams.search === "string" ? searchParams.search : "";

  const [productsResult, brands, categories] = await Promise.all([
    getAdminProductsAction({
      page: 1,
      pageSize: 15,
      sortBy: "newest",
      search: initialSearch || undefined,
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const initialProducts: SerializedAdminProduct[] = productsResult.products.map((p) => ({
    ...p,
    createdAt: typeof p.createdAt === "string" ? p.createdAt : p.createdAt.toISOString(),
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : p.updatedAt.toISOString(),
    variants: p.variants.map((v) => ({
      ...v,
      price: Number(v.price),
      costPrice: v.costPrice !== null && v.costPrice !== undefined ? Number(v.costPrice) : null,
    })),
  }));

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto">
      <ProductManagementTable
        initialSearch={initialSearch}
        initialProducts={initialProducts}
        initialTotal={productsResult.totalCount}
        initialPage={productsResult.currentPage}
        initialTotalPages={productsResult.totalPages}
        brands={brands}
        categories={categories}
        userRole={caller.role}
      />
    </div>
  );
}
