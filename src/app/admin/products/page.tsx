import { verifyAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";
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
  const initialLowStock = searchParams.lowStock === "true";
  const initialStatus =
    typeof searchParams.status === "string" && ["ACTIVE", "DRAFT", "ARCHIVED"].includes(searchParams.status)
      ? (searchParams.status as ProductStatus)
      : undefined;
  const initialBrandId =
    typeof searchParams.brandId === "string" ? searchParams.brandId : undefined;
  const initialPage =
    typeof searchParams.page === "string" && !isNaN(parseInt(searchParams.page, 10))
      ? Math.max(1, parseInt(searchParams.page, 10))
      : 1;

  const [productsResult, brands, categories] = await Promise.all([
    getAdminProductsAction({
      page: initialPage,
      pageSize: 15,
      sortBy: "newest",
      search: initialSearch || undefined,
      lowStock: initialLowStock || undefined,
      status: initialStatus,
      brandId: initialBrandId,
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
        initialLowStock={initialLowStock}
        initialStatus={initialStatus || "ALL"}
        initialBrandId={initialBrandId || ""}
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
