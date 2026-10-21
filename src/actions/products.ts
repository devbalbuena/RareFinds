"use server";

import { z } from "zod";
import { Prisma, ProductStatus, Rarity, Condition, StockAdjustmentReason, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin-auth";
import {
  createSignedUploadUrl as createStorageSignedUrl,
  verifyAndInspectUploadedImage,
  deleteStorageImage,
} from "@/lib/storage";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in test/CLI environments
  }
}

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const variantInputSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1, "Size is required"),
  condition: z.nativeEnum(Condition).default(Condition.DS),
  conditionNotes: z.string().optional(),
  price: z.number().positive("Price must be greater than 0"),
  costPrice: z.number().positive("Cost price must be greater than 0").optional().nullable(),
  stockQty: z.number().int().min(0, "Stock cannot be negative").default(1),
  isOneOfOne: z.boolean().default(true),
});

const productFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  slug: z.string().optional(),
  brandId: z.string().min(1, "Brand is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  releaseYear: z.number().int().min(1970).max(2035).optional().nullable(),
  colorway: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  rarity: z.nativeEnum(Rarity).default(Rarity.RARE),
  authenticityNotes: z.string().optional().nullable(),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  isFeatured: z.boolean().default(false),
  variants: z.array(variantInputSchema).min(1, "At least one variant is required"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

// Helper to generate a unique slug
async function generateUniqueSlug(title: string, currentProductId?: string): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = baseSlug || "sneaker";
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === currentProductId) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// -----------------------------------------------------------------------------
// Query Actions
// -----------------------------------------------------------------------------

export interface AdminProductListParams {
  search?: string;
  status?: ProductStatus | "ALL";
  brandId?: string;
  categoryId?: string;
  lowStock?: boolean;
  sold?: boolean;
  sortBy?: "newest" | "oldest" | "title_asc" | "title_desc" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
}

/**
 * Paginated list of products for admin.
 * If caller is STAFF, costPrice is omitted from variant queries.
 */
export async function getAdminProductsAction(params: AdminProductListParams = {}) {
  const caller = await verifyAdminSession("product:view");
  const isStaff = caller.role === Role.STAFF;

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(50, params.pageSize || 15));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {};

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.brandId) {
    where.brandId = params.brandId;
  }

  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { colorway: { contains: term, mode: "insensitive" } },
    ];
  }

  if (params.lowStock) {
    where.variants = {
      some: {
        isSold: false,
        stockQty: { lte: 1 },
      },
    };
  }

  if (params.sold) {
    where.variants = {
      some: {
        isSold: true,
      },
    };
  }

  // Sorting
  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (params.sortBy === "oldest") orderBy = { createdAt: "asc" };
  else if (params.sortBy === "title_asc") orderBy = { title: "asc" };
  else if (params.sortBy === "title_desc") orderBy = { title: "desc" };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        variants: {
          select: {
            id: true,
            size: true,
            condition: true,
            price: true,
            costPrice: !isStaff, // Hidden for STAFF
            stockQty: true,
            isOneOfOne: true,
            isSold: true,
            reservedUntil: true,
            _count: {
              select: {
                orderItems: true,
                cartItems: true,
              },
            },
          },
          orderBy: { price: "asc" },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Serialize Decimals for Client Components
  const serializedProducts = products.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({
      ...v,
      price: Number(v.price),
      costPrice: v.costPrice ? Number(v.costPrice) : null,
      isOrdered: v._count.orderItems > 0,
      isInCart: v._count.cartItems > 0,
    })),
  }));

  return {
    products: serializedProducts,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
    pageSize,
  };
}

/**
 * Fetch a single product by ID for admin viewing/editing.
 * Masks costPrice for STAFF.
 */
export async function getAdminProductByIdAction(productId: string) {
  const caller = await verifyAdminSession("product:view");
  const isStaff = caller.role === Role.STAFF;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      brand: true,
      category: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
      variants: {
        include: {
          _count: {
            select: {
              orderItems: true,
              cartItems: true,
            },
          },
          stockAdjustments: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!product) {
    return { error: "Product not found." };
  }

  // Decimal serialization & costPrice masking
  const serialized = {
    ...product,
    variants: product.variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      size: v.size,
      condition: v.condition,
      conditionNotes: v.conditionNotes,
      price: Number(v.price),
      costPrice: isStaff ? null : v.costPrice ? Number(v.costPrice) : null,
      stockQty: v.stockQty,
      isOneOfOne: v.isOneOfOne,
      isSold: v.isSold,
      reservedUntil: v.reservedUntil ? v.reservedUntil.toISOString() : null,
      reservedBy: v.reservedBy,
      isOrdered: v._count.orderItems > 0,
      isInCart: v._count.cartItems > 0,
      stockAdjustments: v.stockAdjustments.map((sa) => ({
        id: sa.id,
        delta: sa.delta,
        reason: sa.reason,
        notes: sa.notes,
        createdAt: sa.createdAt.toISOString(),
        actor: sa.user?.name || sa.user?.email || "System",
      })),
    })),
  };

  return { product: serialized };
}

// -----------------------------------------------------------------------------
// Mutation Actions
// -----------------------------------------------------------------------------

/**
 * Create a new product with initial variants (ADMIN only).
 */
export async function createProductAction(values: ProductFormValues) {
  const caller = await verifyAdminSession("product:create");

  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid product data." };
  }

  const data = parsed.data;
  const slug = data.slug ? await generateUniqueSlug(data.slug) : await generateUniqueSlug(data.title);

  try {
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          title: data.title,
          slug,
          brandId: data.brandId,
          categoryId: data.categoryId,
          description: data.description,
          releaseYear: data.releaseYear,
          colorway: data.colorway,
          sku: data.sku,
          rarity: data.rarity,
          authenticityNotes: data.authenticityNotes,
          status: data.status,
          isFeatured: data.isFeatured,
          variants: {
            create: data.variants.map((v) => ({
              size: v.size,
              condition: v.condition,
              conditionNotes: v.conditionNotes,
              price: new Prisma.Decimal(v.price),
              costPrice: v.costPrice ? new Prisma.Decimal(v.costPrice) : null,
              isOneOfOne: v.isOneOfOne,
              stockQty: v.isOneOfOne ? 1 : v.stockQty,
              isSold: false,
            })),
          },
        },
        include: {
          variants: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: caller.id,
          userEmail: caller.email,
          action: "PRODUCT_CREATED",
          entityType: "Product",
          entityId: newProduct.id,
          details: {
            title: newProduct.title,
            slug: newProduct.slug,
            status: newProduct.status,
            variantCount: newProduct.variants.length,
          },
        },
      });

      return newProduct;
    });

    safeRevalidate("/admin/products");
    safeRevalidate("/products");
    safeRevalidate("/");

    return { success: true, product };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create product.";
    return { error: msg };
  }
}

/**
 * Update an existing product (ADMIN only for core details, field-level checks).
 */
export async function updateProductAction(productId: string, values: Partial<ProductFormValues>) {
  const caller = await verifyAdminSession("product:view");

  // Field-level permission enforcement
  if (caller.role === Role.STAFF) {
    if (values.status !== undefined || values.variants !== undefined) {
      return { error: "Staff members cannot modify product status or pricing." };
    }
    // Staff cannot edit core product fields
    return { error: "Forbidden: Staff members do not have permission to edit product details." };
  }

  // Caller is ADMIN
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });

  if (!existing) {
    return { error: "Product not found." };
  }

  // Preserve existing slug unless explicitly changed by admin
  let slug = existing.slug;
  if (values.slug && values.slug !== existing.slug) {
    slug = await generateUniqueSlug(values.slug, productId);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: productId },
        data: {
          title: values.title ?? existing.title,
          slug,
          brandId: values.brandId ?? existing.brandId,
          categoryId: values.categoryId ?? existing.categoryId,
          description: values.description ?? existing.description,
          releaseYear: values.releaseYear !== undefined ? values.releaseYear : existing.releaseYear,
          colorway: values.colorway !== undefined ? values.colorway : existing.colorway,
          sku: values.sku !== undefined ? values.sku : existing.sku,
          rarity: values.rarity ?? existing.rarity,
          authenticityNotes:
            values.authenticityNotes !== undefined
              ? values.authenticityNotes
              : existing.authenticityNotes,
          status: values.status ?? existing.status,
          isFeatured: values.isFeatured !== undefined ? values.isFeatured : existing.isFeatured,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: caller.id,
          userEmail: caller.email,
          action: "PRODUCT_UPDATED",
          entityType: "Product",
          entityId: productId,
          details: {
            title: p.title,
            slug: p.slug,
            status: p.status,
          },
        },
      });

      return p;
    });

    safeRevalidate("/admin/products");
    safeRevalidate(`/admin/products/${productId}`);
    safeRevalidate("/products");
    safeRevalidate(`/products/${existing.slug}`);
    if (slug !== existing.slug) {
      safeRevalidate(`/products/${slug}`);
    }
    safeRevalidate("/");

    return { success: true, product: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update product.";
    return { error: msg };
  }
}

/**
 * Archive a product (ADMIN only).
 */
export async function archiveProductAction(productId: string) {
  const caller = await verifyAdminSession("product:archive");

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "PRODUCT_ARCHIVED",
        entityType: "Product",
        entityId: productId,
        details: { title: product.title },
      },
    });

    safeRevalidate("/admin/products");
    safeRevalidate(`/admin/products/${productId}`);
    safeRevalidate("/products");
    safeRevalidate(`/products/${product.slug}`);
    safeRevalidate("/");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to archive product.";
    return { error: msg };
  }
}

/**
 * Restore an archived product (ADMIN only).
 */
export async function restoreProductAction(productId: string) {
  const caller = await verifyAdminSession("product:archive");

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ACTIVE },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "PRODUCT_RESTORED",
        entityType: "Product",
        entityId: productId,
        details: { title: product.title },
      },
    });

    safeRevalidate("/admin/products");
    safeRevalidate(`/admin/products/${productId}`);
    safeRevalidate("/products");
    safeRevalidate(`/products/${product.slug}`);
    safeRevalidate("/");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to restore product.";
    return { error: msg };
  }
}

/**
 * Hard-delete a product (ADMIN only).
 * Only allowed if none of its variants have ever been ordered or are currently in cart.
 */
export async function deleteProductAction(productId: string) {
  const caller = await verifyAdminSession("product:delete");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: true,
      variants: {
        include: {
          _count: {
            select: {
              orderItems: true,
              cartItems: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    return { error: "Product not found." };
  }

  // Pre-flight check: any ordered or in-cart variants?
  const hasOrders = product.variants.some((v) => v._count.orderItems > 0 || v.isSold);
  if (hasOrders) {
    return {
      error:
        "Action blocked: This sneaker has historical order records and cannot be permanently deleted. Please archive it instead to remove it from the storefront.",
    };
  }

  const hasCarts = product.variants.some((v) => v._count.cartItems > 0);
  if (hasCarts) {
    return {
      error:
        "Action blocked: A variant of this sneaker is currently in an active customer cart. Please archive it instead.",
    };
  }

  try {
    // 1. Delete images from storage
    for (const img of product.images) {
      await deleteStorageImage(img.url);
    }

    // 2. Delete product from database
    await prisma.product.delete({
      where: { id: productId },
    });

    // 3. Log Audit
    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "PRODUCT_DELETED",
        entityType: "Product",
        entityId: productId,
        details: { title: product.title, sku: product.sku },
      },
    });

    safeRevalidate("/admin/products");
    safeRevalidate("/products");
    safeRevalidate("/");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete product.";
    return { error: msg };
  }
}

// -----------------------------------------------------------------------------
// Variant Actions
// -----------------------------------------------------------------------------

/**
 * Create a variant for a product (ADMIN only).
 */
export async function createVariantAction(
  productId: string,
  input: {
    size: string;
    condition: Condition;
    conditionNotes?: string;
    price: number;
    costPrice?: number | null;
    stockQty: number;
    isOneOfOne: boolean;
  }
) {
  const caller = await verifyAdminSession("product:edit-pricing");

  if (input.price <= 0) {
    return { error: "Price must be greater than zero." };
  }

  try {
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        size: input.size,
        condition: input.condition,
        conditionNotes: input.conditionNotes,
        price: new Prisma.Decimal(input.price),
        costPrice: input.costPrice ? new Prisma.Decimal(input.costPrice) : null,
        isOneOfOne: input.isOneOfOne,
        stockQty: input.isOneOfOne ? 1 : input.stockQty,
        isSold: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "VARIANT_CREATED",
        entityType: "ProductVariant",
        entityId: variant.id,
        details: {
          productId,
          size: variant.size,
          price: input.price,
        },
      },
    });

    safeRevalidate(`/admin/products/${productId}`);
    safeRevalidate("/products");

    return {
      success: true,
      variant: {
        ...variant,
        price: Number(variant.price),
        costPrice: variant.costPrice ? Number(variant.costPrice) : null,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create variant.";
    return { error: msg };
  }
}

/**
 * Update a variant.
 * Enforces price change tracking in AuditLog and locked editing for sold variants.
 */
export async function updateVariantAction(
  variantId: string,
  input: {
    size?: string;
    condition?: Condition;
    conditionNotes?: string;
    price?: number;
    costPrice?: number | null;
    stockQty?: number;
    isOneOfOne?: boolean;
  }
) {
  const caller = await verifyAdminSession("product:view");

  // Field level permission: STAFF cannot edit pricing
  if (caller.role === Role.STAFF) {
    if (input.price !== undefined || input.costPrice !== undefined) {
      return { error: "Forbidden: Staff members are not allowed to change pricing." };
    }
  }

  const existing = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: true,
      _count: {
        select: {
          orderItems: true,
          cartItems: true,
        },
      },
    },
  });

  if (!existing) {
    return { error: "Variant not found." };
  }

  // Sold variants cannot have price or condition edited
  if (existing.isSold) {
    if (
      (input.price !== undefined && input.price !== Number(existing.price)) ||
      (input.condition !== undefined && input.condition !== existing.condition)
    ) {
      return { error: "Action blocked: Sold pairs cannot have their price or condition modified." };
    }
  }

  const now = new Date();
  const isOnHold = existing.reservedUntil && existing.reservedUntil > now;
  if (isOnHold && input.price !== undefined && input.price !== Number(existing.price)) {
    return { error: "Action blocked: Cannot change price while variant is on checkout hold." };
  }

  const isPriceChanged =
    input.price !== undefined && input.price !== Number(existing.price);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          size: input.size ?? existing.size,
          condition: input.condition ?? existing.condition,
          conditionNotes:
            input.conditionNotes !== undefined
              ? input.conditionNotes
              : existing.conditionNotes,
          price:
            input.price !== undefined
              ? new Prisma.Decimal(input.price)
              : existing.price,
          costPrice:
            input.costPrice !== undefined
              ? input.costPrice
                ? new Prisma.Decimal(input.costPrice)
                : null
              : existing.costPrice,
          isOneOfOne:
            input.isOneOfOne !== undefined ? input.isOneOfOne : existing.isOneOfOne,
          stockQty:
            input.isOneOfOne || (input.isOneOfOne === undefined && existing.isOneOfOne)
              ? 1
              : input.stockQty !== undefined
              ? input.stockQty
              : existing.stockQty,
        },
      });

      if (isPriceChanged) {
        await tx.auditLog.create({
          data: {
            userId: caller.id,
            userEmail: caller.email,
            action: "PRICE_CHANGED",
            entityType: "ProductVariant",
            entityId: variantId,
            details: {
              productId: existing.productId,
              productTitle: existing.product.title,
              size: existing.size,
              previousPrice: Number(existing.price),
              newPrice: input.price,
            },
          },
        });
      }

      return v;
    });

    safeRevalidate(`/admin/products/${existing.productId}`);
    safeRevalidate("/products");
    safeRevalidate(`/products/${existing.product.slug}`);

    return {
      success: true,
      variant: {
        ...updated,
        price: Number(updated.price),
        costPrice: updated.costPrice ? Number(updated.costPrice) : null,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update variant.";
    return { error: msg };
  }
}

/**
 * Hard-delete a variant (ADMIN only).
 * Blocked if ordered, in cart, sold, or on hold.
 */
export async function deleteVariantAction(variantId: string) {
  const caller = await verifyAdminSession("product:delete");

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: true,
      _count: {
        select: {
          orderItems: true,
          cartItems: true,
        },
      },
    },
  });

  if (!variant) {
    return { error: "Variant not found." };
  }

  if (variant._count.orderItems > 0 || variant.isSold) {
    return {
      error:
        "Action blocked: This variant has been ordered in past transactions and cannot be deleted. Please archive the product instead.",
    };
  }

  if (variant._count.cartItems > 0) {
    return {
      error: "Action blocked: This variant is currently saved in an active customer cart.",
    };
  }

  const now = new Date();
  if (variant.reservedUntil && variant.reservedUntil > now) {
    return {
      error: "Action blocked: This variant is currently on active checkout hold.",
    };
  }

  try {
    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "VARIANT_DELETED",
        entityType: "ProductVariant",
        entityId: variantId,
        details: {
          productId: variant.productId,
          size: variant.size,
        },
      },
    });

    safeRevalidate(`/admin/products/${variant.productId}`);
    safeRevalidate("/products");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete variant.";
    return { error: msg };
  }
}

/**
 * Staff and Admin stock adjustment action.
 * Atomically modifies stockQty and creates StockAdjustment + AuditLog.
 * Rejects for 1-of-1 variants.
 */
export async function adjustVariantStockAction(input: {
  variantId: string;
  delta: number;
  reason: StockAdjustmentReason;
  notes?: string;
}) {
  const caller = await verifyAdminSession("product:update-stock");

  if (!input.delta || input.delta === 0) {
    return { error: "Stock delta must be non-zero." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: input.variantId },
        include: { product: true },
      });

      if (!variant) {
        throw new Error("Variant not found.");
      }

      if (variant.isOneOfOne) {
        throw new Error(
          "Stock adjustment rejected: 1-of-1 pairs have a locked single-unit allocation and cannot receive quantity adjustments."
        );
      }

      const newStock = variant.stockQty + input.delta;
      if (newStock < 0) {
        throw new Error(
          `Adjustment aborted: Resulting stock cannot be negative (current: ${variant.stockQty}, delta: ${input.delta}).`
        );
      }

      const updatedVariant = await tx.productVariant.update({
        where: { id: input.variantId },
        data: {
          stockQty: newStock,
          isSold: newStock === 0,
        },
      });

      const adjustment = await tx.stockAdjustment.create({
        data: {
          variantId: input.variantId,
          userId: caller.id,
          delta: input.delta,
          reason: input.reason,
          notes: input.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: caller.id,
          userEmail: caller.email,
          action: "STOCK_ADJUSTED",
          entityType: "ProductVariant",
          entityId: input.variantId,
          details: {
            productId: variant.productId,
            productTitle: variant.product.title,
            size: variant.size,
            previousStock: variant.stockQty,
            newStock,
            delta: input.delta,
            reason: input.reason,
            notes: input.notes,
          },
        },
      });

      return { variant: updatedVariant, adjustment };
    });

    safeRevalidate(`/admin/products/${result.variant.productId}`);
    safeRevalidate("/admin/products");
    safeRevalidate("/products");

    return { success: true, newStock: result.variant.stockQty };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to adjust stock.";
    return { error: msg };
  }
}

// -----------------------------------------------------------------------------
// Image Storage Actions
// -----------------------------------------------------------------------------

/**
 * Generate a signed upload URL for a product image (ADMIN only).
 */
export async function createSignedUploadUrlAction(
  productId: string,
  filename: string,
  contentType: string
) {
  await verifyAdminSession("product:create");
  try {
    const result = await createStorageSignedUrl(productId, filename, contentType);
    return { success: true, ...result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create upload URL.";
    return { error: msg };
  }
}

/**
 * Verify and save an uploaded image to the database (ADMIN only).
 * Validates actual file in storage (size, magic bytes, product prefix) and max 8 images limit.
 */
export async function saveProductImageAction(
  productId: string,
  storagePath: string,
  altText?: string,
  isPrimary?: boolean
) {
  const caller = await verifyAdminSession("product:create");

  // Check 8-image limit
  const currentCount = await prisma.productImage.count({
    where: { productId },
  });

  if (currentCount >= 8) {
    // Delete file from storage since limit is reached
    await deleteStorageImage(storagePath);
    return { error: "Maximum limit of 8 images per sneaker reached." };
  }

  try {
    // Deep byte-level verification
    const verifiedFile = await verifyAndInspectUploadedImage(productId, storagePath);

    const isFirstImage = currentCount === 0;
    const shouldBePrimary = isPrimary !== undefined ? isPrimary : isFirstImage;

    const savedImage = await prisma.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      const img = await tx.productImage.create({
        data: {
          productId,
          url: verifiedFile.publicUrl,
          altText: altText || null,
          isPrimary: shouldBePrimary,
          sortOrder: currentCount,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: caller.id,
          userEmail: caller.email,
          action: "IMAGE_ADDED",
          entityType: "ProductImage",
          entityId: img.id,
          details: {
            productId,
            url: img.url,
            sizeBytes: verifiedFile.size,
            format: verifiedFile.contentType,
          },
        },
      });

      return img;
    });

    safeRevalidate(`/admin/products/${productId}`);
    safeRevalidate("/products");

    return { success: true, image: savedImage };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Image verification failed.";
    return { error: msg };
  }
}

/**
 * Reorder product images (ADMIN only).
 */
export async function reorderProductImagesAction(
  productId: string,
  imageIdsInOrder: string[]
) {
  await verifyAdminSession("product:create");

  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < imageIdsInOrder.length; i++) {
        await tx.productImage.update({
          where: { id: imageIdsInOrder[i] },
          data: {
            sortOrder: i,
            isPrimary: i === 0, // First image automatically becomes primary
          },
        });
      }
    });

    safeRevalidate(`/admin/products/${productId}`);
    safeRevalidate("/products");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reorder images.";
    return { error: msg };
  }
}

/**
 * Set an image as primary (ADMIN only).
 */
export async function setPrimaryProductImageAction(
  productId: string,
  imageId: string
) {
  await verifyAdminSession("product:create");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });

      await tx.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      });
    });

    safeRevalidate(`/admin/products/${productId}`);
    safeRevalidate("/products");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to set primary image.";
    return { error: msg };
  }
}

/**
 * Delete a product image from database and storage (ADMIN only).
 */
export async function deleteProductImageAction(productId: string, imageId: string) {
  const caller = await verifyAdminSession("product:create");

  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    return { error: "Image not found." };
  }

  try {
    // 1. Delete file from storage
    await deleteStorageImage(image.url);

    // 2. Delete database record
    await prisma.productImage.delete({
      where: { id: imageId },
    });

    // 3. If primary was deleted, assign primary to remaining first image
    if (image.isPrimary) {
      const nextImage = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: "asc" },
      });
      if (nextImage) {
        await prisma.productImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "IMAGE_DELETED",
        entityType: "ProductImage",
        entityId: imageId,
        details: { productId, url: image.url },
      },
    });

    safeRevalidate(`/admin/products/${productId}`);
    safeRevalidate("/products");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete image.";
    return { error: msg };
  }
}
