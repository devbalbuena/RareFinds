import prisma from "@/lib/prisma";
import { Condition, Prisma, Rarity } from "@prisma/client";

export interface CatalogFilterParams {
  search?: string;
  brand?: string | string[];
  category?: string | string[];
  condition?: string | string[];
  size?: string | string[];
  minPrice?: string | number;
  maxPrice?: string | number;
  availability?: "all" | "in_stock" | "sold";
  sort?: "newest" | "price_asc" | "price_desc" | "rarity";
  page?: string | number;
}

export async function getFeaturedProducts(limit = 4) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    include: {
      brand: true,
      category: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
      variants: {
        orderBy: { price: "asc" },
      },
    },
    take: limit,
  });
}

export async function getLatestProducts(limit = 8) {
  return prisma.product.findMany({
    where: {
      isActive: true,
    },
    include: {
      brand: true,
      category: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
      variants: {
        orderBy: { price: "asc" },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function getBrandsWithCounts() {
  const brands = await prisma.brand.findMany({
    include: {
      _count: {
        select: {
          products: {
            where: { isActive: true },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return brands;
}

export async function getAllCategories() {
  return prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function getCatalogFilterOptions() {
  const [brands, categories, variants, priceAggregate] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.productVariant.findMany({
      select: { size: true },
      distinct: ["size"],
      orderBy: { size: "asc" },
    }),
    prisma.productVariant.aggregate({
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  const sizes = variants.map((v) => v.size);
  const minPrice = priceAggregate._min.price ? Number(priceAggregate._min.price) : 0;
  const maxPrice = priceAggregate._max.price ? Number(priceAggregate._max.price) : 250000;

  return {
    brands,
    categories,
    sizes,
    priceRange: {
      min: Math.floor(minPrice),
      max: Math.ceil(maxPrice),
    },
  };
}

export async function getFilteredProducts(rawParams: CatalogFilterParams) {
  const page = Math.max(1, Number(rawParams.page) || 1);
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
  };

  // Search filter (title, SKU, or colorway)
  if (rawParams.search && typeof rawParams.search === "string" && rawParams.search.trim()) {
    const term = rawParams.search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { colorway: { contains: term, mode: "insensitive" } },
    ];
  }

  // Brand filter
  if (rawParams.brand) {
    const brandSlugs = Array.isArray(rawParams.brand)
      ? rawParams.brand
      : rawParams.brand.split(",").map((s) => s.trim()).filter(Boolean);
    if (brandSlugs.length > 0) {
      where.brand = {
        slug: { in: brandSlugs },
      };
    }
  }

  // Category filter
  if (rawParams.category) {
    const categorySlugs = Array.isArray(rawParams.category)
      ? rawParams.category
      : rawParams.category.split(",").map((s) => s.trim()).filter(Boolean);
    if (categorySlugs.length > 0) {
      where.category = {
        slug: { in: categorySlugs },
      };
    }
  }

  // Variant-level conditions (Condition, Size, Price range, Availability)
  const variantConditions: Prisma.ProductVariantWhereInput = {};

  if (rawParams.condition) {
    const conditions = (
      Array.isArray(rawParams.condition)
        ? rawParams.condition
        : rawParams.condition.split(",").map((c) => c.trim().toUpperCase())
    ).filter((c): c is Condition => Object.values(Condition).includes(c as Condition));

    if (conditions.length > 0) {
      variantConditions.condition = { in: conditions };
    }
  }

  if (rawParams.size) {
    const sizes = Array.isArray(rawParams.size)
      ? rawParams.size
      : rawParams.size.split(",").map((s) => s.trim()).filter(Boolean);
    if (sizes.length > 0) {
      variantConditions.size = { in: sizes };
    }
  }

  const minPrice = rawParams.minPrice !== undefined && rawParams.minPrice !== "" ? Number(rawParams.minPrice) : undefined;
  const maxPrice = rawParams.maxPrice !== undefined && rawParams.maxPrice !== "" ? Number(rawParams.maxPrice) : undefined;

  if (minPrice !== undefined || maxPrice !== undefined) {
    variantConditions.price = {};
    if (minPrice !== undefined && !isNaN(minPrice)) {
      variantConditions.price.gte = minPrice;
    }
    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      variantConditions.price.lte = maxPrice;
    }
  }

  if (rawParams.availability === "in_stock") {
    variantConditions.isSold = false;
    variantConditions.stockQty = { gt: 0 };
  } else if (rawParams.availability === "sold") {
    variantConditions.isSold = true;
  }

  // Apply variant conditions if any were set
  if (Object.keys(variantConditions).length > 0) {
    where.variants = {
      some: variantConditions,
    };
  }

  // Sort order mapping
  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  const sort = rawParams.sort || "newest";

  if (sort === "newest") {
    orderBy = { createdAt: "desc" };
  } else if (sort === "rarity") {
    // In our schema: GRAIL, VERY_RARE, RARE, STANDARD
    // Prisma sorts enums alphabetically by default, or we can sort by releaseYear / createdAt
    orderBy = { rarity: "desc" };
  }

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        variants: {
          orderBy: { price: "asc" },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  // Handle client-side sorting by price across variant relations if needed
  if (sort === "price_asc") {
    products.sort((a, b) => {
      const minA = a.variants.length > 0 ? Number(a.variants[0].price) : 0;
      const minB = b.variants.length > 0 ? Number(b.variants[0].price) : 0;
      return minA - minB;
    });
  } else if (sort === "price_desc") {
    products.sort((a, b) => {
      const maxA = a.variants.length > 0 ? Number(a.variants[a.variants.length - 1].price) : 0;
      const maxB = b.variants.length > 0 ? Number(b.variants[b.variants.length - 1].price) : 0;
      return maxB - maxA;
    });
  } else if (sort === "rarity") {
    const rarityWeight: Record<Rarity, number> = {
      GRAIL: 4,
      VERY_RARE: 3,
      RARE: 2,
      STANDARD: 1,
    };
    products.sort((a, b) => (rarityWeight[b.rarity] || 0) - (rarityWeight[a.rarity] || 0));
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    products,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
      variants: {
        orderBy: { price: "asc" },
      },
    },
  });
}
