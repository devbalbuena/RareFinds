import { verifyAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = {
  title: "New Sneaker | RareFinds Vault Admin",
  description: "Add a new sneaker grail to the vault catalog.",
};

export default async function NewProductPage() {
  const caller = await verifyAdminSession("product:create");

  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/admin/products" className="hover:text-white">
          Sneakers
        </Link>
        <span>/</span>
        <span className="text-zinc-300">New Sneaker</span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-500" />
          Add Sneaker to Vault
        </h1>
        <p className="text-xs text-zinc-400">
          Create a new sneaker entry. You can configure multiple size variants and upload high-res gallery images next.
        </p>
      </div>

      <ProductForm
        mode="create"
        brands={brands}
        categories={categories}
        userRole={caller.role}
      />
    </div>
  );
}
