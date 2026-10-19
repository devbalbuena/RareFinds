"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in CLI/test contexts
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const brandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters"),
  description: z.string().optional(),
  logoUrl: z.string().url("Valid logo URL required").optional().or(z.literal("")),
});

const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional(),
});

/**
 * Fetch all brands and categories with product counts.
 */
export async function getCatalogAction() {
  await verifyAdminSession("product:view");

  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),
  ]);

  return { brands, categories };
}

// -----------------------------------------------------------------------------
// Brand Mutations (ADMIN only)
// -----------------------------------------------------------------------------

export async function createBrandAction(input: z.infer<typeof brandSchema>) {
  const caller = await verifyAdminSession("catalog:manage");

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid brand data." };
  }

  const { name, description, logoUrl } = parsed.data;
  const slug = generateSlug(name);

  try {
    const existing = await prisma.brand.findFirst({
      where: { OR: [{ name }, { slug }] },
    });

    if (existing) {
      return { error: `Brand "${name}" already exists.` };
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        description: description || null,
        logoUrl: logoUrl || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "BRAND_CREATED",
        entityType: "Brand",
        entityId: brand.id,
        details: { name: brand.name, slug: brand.slug },
      },
    });

    safeRevalidate("/admin/catalog");
    safeRevalidate("/admin/products");
    safeRevalidate("/products");

    return { success: true, brand };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create brand.";
    return { error: msg };
  }
}

export async function renameBrandAction(brandId: string, input: z.infer<typeof brandSchema>) {
  const caller = await verifyAdminSession("catalog:manage");

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid brand data." };
  }

  const { name, description, logoUrl } = parsed.data;
  const slug = generateSlug(name);

  try {
    const conflict = await prisma.brand.findFirst({
      where: {
        AND: [
          { id: { not: brandId } },
          { OR: [{ name }, { slug }] },
        ],
      },
    });

    if (conflict) {
      return { error: `Another brand with name "${name}" already exists.` };
    }

    const brand = await prisma.brand.update({
      where: { id: brandId },
      data: {
        name,
        slug,
        description: description || null,
        logoUrl: logoUrl || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "BRAND_UPDATED",
        entityType: "Brand",
        entityId: brand.id,
        details: { name: brand.name, slug: brand.slug },
      },
    });

    safeRevalidate("/admin/catalog");
    safeRevalidate("/admin/products");
    safeRevalidate("/products");

    return { success: true, brand };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to rename brand.";
    return { error: msg };
  }
}

export async function deleteBrandAction(brandId: string) {
  const caller = await verifyAdminSession("catalog:manage");

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!brand) {
    return { error: "Brand not found." };
  }

  if (brand._count.products > 0) {
    return {
      error: `Cannot delete brand "${brand.name}" because it is currently assigned to ${brand._count.products} sneaker(s).`,
    };
  }

  try {
    await prisma.brand.delete({
      where: { id: brandId },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "BRAND_DELETED",
        entityType: "Brand",
        entityId: brandId,
        details: { name: brand.name },
      },
    });

    safeRevalidate("/admin/catalog");
    safeRevalidate("/admin/products");
    safeRevalidate("/products");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete brand.";
    return { error: msg };
  }
}

// -----------------------------------------------------------------------------
// Category Mutations (ADMIN only)
// -----------------------------------------------------------------------------

export async function createCategoryAction(input: z.infer<typeof categorySchema>) {
  const caller = await verifyAdminSession("catalog:manage");

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid category data." };
  }

  const { name, description } = parsed.data;
  const slug = generateSlug(name);

  try {
    const existing = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] },
    });

    if (existing) {
      return { error: `Category "${name}" already exists.` };
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "CATEGORY_CREATED",
        entityType: "Category",
        entityId: category.id,
        details: { name: category.name, slug: category.slug },
      },
    });

    safeRevalidate("/admin/catalog");
    safeRevalidate("/admin/products");
    safeRevalidate("/products");

    return { success: true, category };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create category.";
    return { error: msg };
  }
}

export async function renameCategoryAction(categoryId: string, input: z.infer<typeof categorySchema>) {
  const caller = await verifyAdminSession("catalog:manage");

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid category data." };
  }

  const { name, description } = parsed.data;
  const slug = generateSlug(name);

  try {
    const conflict = await prisma.category.findFirst({
      where: {
        AND: [
          { id: { not: categoryId } },
          { OR: [{ name }, { slug }] },
        ],
      },
    });

    if (conflict) {
      return { error: `Another category with name "${name}" already exists.` };
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name,
        slug,
        description: description || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "CATEGORY_UPDATED",
        entityType: "Category",
        entityId: category.id,
        details: { name: category.name, slug: category.slug },
      },
    });

    safeRevalidate("/admin/catalog");
    safeRevalidate("/admin/products");
    safeRevalidate("/products");

    return { success: true, category };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to rename category.";
    return { error: msg };
  }
}

export async function deleteCategoryAction(categoryId: string) {
  const caller = await verifyAdminSession("catalog:manage");

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    return { error: "Category not found." };
  }

  if (category._count.products > 0) {
    return {
      error: `Cannot delete category "${category.name}" because it is currently assigned to ${category._count.products} sneaker(s).`,
    };
  }

  try {
    await prisma.category.delete({
      where: { id: categoryId },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "CATEGORY_DELETED",
        entityType: "Category",
        entityId: categoryId,
        details: { name: category.name },
      },
    });

    safeRevalidate("/admin/catalog");
    safeRevalidate("/admin/products");
    safeRevalidate("/products");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete category.";
    return { error: msg };
  }
}
