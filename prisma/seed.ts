import "dotenv/config";
import { PrismaClient, Role, Condition, Rarity } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Initialize Prisma client with driver adapter or direct connection
function getPrisma(): PrismaClient {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Neither DIRECT_URL nor DATABASE_URL was found in environment. Please set them in your .env file."
    );
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = getPrisma();

async function main() {
  console.log("👟 Starting RareFinds database seed...");

  // 1. Seed Admin User
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@rarefinds.ph";
  const rawPassword = process.env.INITIAL_ADMIN_PASSWORD || "ChangeMe123!RareFinds";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      passwordHash,
    },
    create: {
      name: process.env.INITIAL_ADMIN_NAME || "RareFinds Store Owner",
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Seeded Admin User: ${admin.email} (ID: ${admin.id})`);

  // 2. Seed Brands
  const brandsData = [
    {
      name: "Jordan",
      slug: "jordan",
      description: "Air Jordan retro grails, iconic court silhouettes, and historic collaborations.",
      logoUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Nike",
      slug: "nike",
      description: "Nike SB Dunks, tier-zero Air Max releases, and special projects.",
      logoUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Travis Scott",
      slug: "travis-scott",
      description: "Cactus Jack collaboration series with Nike and Jordan Brand.",
      logoUrl: "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Off-White",
      slug: "off-white",
      description: "Virgil Abloh's revolutionary 'The Ten' and deconstructed design archive.",
      logoUrl: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "New Balance",
      slug: "new-balance",
      description: "Made in USA & Made in UK premium craftsmanship and limited curator collabs.",
      logoUrl: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=400&q=80",
    },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { description: b.description, logoUrl: b.logoUrl },
      create: b,
    });
    brandMap.set(b.slug, brand.id);
  }
  console.log(`✅ Seeded ${brandsData.length} Brands`);

  // 3. Seed Categories
  const categoriesData = [
    {
      name: "Retro Basketball",
      slug: "retro-basketball",
      description: "Historic hardwood silhouettes from the golden era of basketball sneakers.",
    },
    {
      name: "Collabs & Grails",
      slug: "collabs-and-grails",
      description: "Extremely limited artist, designer, and boutique collaborative grails.",
    },
    {
      name: "SB Dunks & Skate",
      slug: "sb-dunks-skate",
      description: "Collectible Nike SB Dunks with cultural storytelling and premium materials.",
    },
    {
      name: "Runners & Lifestyle",
      slug: "runners-lifestyle",
      description: "Archival running shoes, premium retro runners, and lifestyle essentials.",
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const c of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { description: c.description },
      create: c,
    });
    categoryMap.set(c.slug, category.id);
  }
  console.log(`✅ Seeded ${categoriesData.length} Categories`);

  // 4. Seed Rare Sneakers with 1-of-1 Variants & Condition Notes
  const productsData = [
    {
      title: "Air Jordan 1 Retro High OG 'Chicago' (2015)",
      slug: "air-jordan-1-retro-high-og-chicago-2015",
      brandSlug: "jordan",
      categorySlug: "retro-basketball",
      sku: "555088-101",
      releaseYear: 2015,
      colorway: "White/Black-Varsity Red",
      rarity: Rarity.GRAIL,
      isFeatured: true,
      description:
        "The holy grail of sneaker culture. Originally worn by Michael Jordan during his legendary 1985 rookie campaign, the 2015 release remains the gold standard for high-cut Chicago retro fidelity, featuring premium full-grain white leather, vibrant varsity red overlays, and signature black Nike Swooshes.",
      authenticityNotes:
        "Verified 100% authentic via dual-point sneaker inspection. Includes original red/black Jordan box with correct style label, factory cardboard shoe trees, and black/white lace sets in original factory fold.",
      images: [
        {
          url: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85",
          altText: "Air Jordan 1 Retro High OG Chicago 2015 lateral view",
          isPrimary: true,
          sortOrder: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1200&q=85",
          altText: "Air Jordan 1 Retro High OG Chicago 2015 toe box and collar detail",
          isPrimary: false,
          sortOrder: 1,
        },
      ],
      variant: {
        size: "US 10.5",
        condition: Condition.DS,
        conditionNotes:
          "Deadstock, factory laced, unworn. Leather is soft and supple with zero oxidation on the midsole. Box is collector grade 9.5/10.",
        price: 68000,
        costPrice: 52000,
        stockQty: 1,
        isOneOfOne: true,
      },
    },
    {
      title: "Travis Scott x Air Jordan 1 Low OG 'Reverse Mocha'",
      slug: "travis-scott-air-jordan-1-low-reverse-mocha",
      brandSlug: "travis-scott",
      categorySlug: "collabs-and-grails",
      sku: "DM7866-162",
      releaseYear: 2022,
      colorway: "Sail/University Red-Ridgerock",
      rarity: Rarity.VERY_RARE,
      isFeatured: true,
      description:
        "Houston rapper Travis Scott flipped the color scheme of his legendary 2019 'Mocha' Low to create the 'Reverse Mocha'. Pairing rich dark mocha durabuck with crisp sail tumbled leather overlays and his signature oversized backwards Swoosh in off-white.",
      authenticityNotes:
        "Verified authentic with UV-light blacklight inspection of stitching and stamp marks. Includes Cactus Jack special edition box, tissue paper with Cactus Jack prints, and all four lace bundles (sail, mocha, red, black).",
      images: [
        {
          url: "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=1200&q=85",
          altText: "Travis Scott x Air Jordan 1 Low Reverse Mocha lateral profile",
          isPrimary: true,
          sortOrder: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1200&q=85",
          altText: "Travis Scott x Air Jordan 1 Low Reverse Mocha heel embroidery detail",
          isPrimary: false,
          sortOrder: 1,
        },
      ],
      variant: {
        size: "US 9.5",
        condition: Condition.DS,
        conditionNotes:
          "Brand new in box (Deadstock). Complete packaging intact with zero flaws on the nubuck.",
        price: 58000,
        costPrice: 44000,
        stockQty: 1,
        isOneOfOne: true,
      },
    },
    {
      title: "Nike SB Dunk Low Pro 'Chunky Dunky' (Ben & Jerry's)",
      slug: "nike-sb-dunk-low-pro-chunky-dunky",
      brandSlug: "nike",
      categorySlug: "sb-dunks-skate",
      sku: "CU3244-100",
      releaseYear: 2020,
      colorway: "White/Lagoon Pulse-Black-University Gold",
      rarity: Rarity.GRAIL,
      isFeatured: true,
      description:
        "An instant icon of modern sneaker design. Nike SB teamed up with Vermont ice cream maker Ben & Jerry's to create the 'Chunky Dunky', featuring genuine faux cowhide overlays, cloudy blue skies on the leather panels, tie-dye inner linings, and a melting golden Swoosh.",
      authenticityNotes:
        "100% verified authentic. Faux fur nap pattern, melting Swoosh embroidery density, and tie-dye insole batch codes rigorously verified. Includes regular SB shoebox and rainbow alternate laces.",
      images: [
        {
          url: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=1200&q=85",
          altText: "Nike SB Dunk Low Pro Chunky Dunky lateral",
          isPrimary: true,
          sortOrder: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85",
          altText: "Nike SB Dunk Low Pro Chunky Dunky outsole and insole",
          isPrimary: false,
          sortOrder: 1,
        },
      ],
      variant: {
        size: "US 10.0",
        condition: Condition.VNDS,
        conditionNotes:
          "Very Near Deadstock (worn once indoors for a high-fashion lookbook shoot). Outsoles wiped completely clean, zero star loss, faux fur 100% pristine. Standard SB box in 9/10 condition.",
        price: 74000,
        costPrice: 58000,
        stockQty: 1,
        isOneOfOne: true,
      },
    },
    {
      title: "Off-White x Air Jordan 1 Retro High 'Chicago' (The Ten)",
      slug: "off-white-air-jordan-1-retro-high-chicago-the-ten",
      brandSlug: "off-white",
      categorySlug: "collabs-and-grails",
      sku: "AA3834-101",
      releaseYear: 2017,
      colorway: "White/Black-Varsity Red",
      rarity: Rarity.GRAIL,
      isFeatured: true,
      description:
        "The centerpiece of Virgil Abloh's historic 2017 'The Ten' collection. This deconstructed masterpiece features exposed foam tongues, blue and orange tack stitching on the swoosh, 'AIR' typography on the midsole, and Abloh's iconic Helvetica media block on the medial side.",
      authenticityNotes:
        "Collector museum tier grail. Includes authentic 2017 red zip-tie, inside-out collector box, and all four factory lace pairs with intact 'SHOELACES' printing.",
      images: [
        {
          url: "https://images.unsplash.com/photo-1597045566677-8cf032ed6634?auto=format&fit=crop&w=1200&q=85",
          altText: "Off-White x Air Jordan 1 Chicago The Ten lateral view",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      variant: {
        size: "US 11.0",
        condition: Condition.VNDS,
        conditionNotes:
          "VNDS collector condition. Minimal, honest vintage foam tinting natural for a 2017 pair. Full outsole star count visible. OG box has minor storage indent on top lid.",
        price: 195000,
        costPrice: 155000,
        stockQty: 1,
        isOneOfOne: true,
      },
    },
    {
      title: "Nike Kobe 6 Protro 'Grinch' (2020)",
      slug: "nike-kobe-6-protro-grinch-2020",
      brandSlug: "nike",
      categorySlug: "retro-basketball",
      sku: "CW2190-300",
      releaseYear: 2020,
      colorway: "Green Apple/Volt-Crimson-Black",
      rarity: Rarity.VERY_RARE,
      isFeatured: false,
      description:
        "Originally worn by the late Kobe Bryant on Christmas Day 2010. The 2020 Protro edition updates the snake-scaled upper with refined Zoom Air Turbo cushioning while retaining the iconic vibrant neon green colorway.",
      authenticityNotes:
        "100% verified authentic Mamba release. Includes original Mamba logo shoe box and spare neon green laces.",
      images: [
        {
          url: "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=1200&q=85",
          altText: "Nike Kobe 6 Protro Grinch scale detail",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      variant: {
        size: "US 10.5",
        condition: Condition.DS,
        conditionNotes:
          "Deadstock, brand new in box. Kept in climate-controlled dark storage. Scales intact, zoom bags factory firm.",
        price: 45000,
        costPrice: 34000,
        stockQty: 1,
        isOneOfOne: true,
      },
    },
    {
      title: "New Balance 990v3 MiUSA JJJJound 'Olive'",
      slug: "new-balance-990v3-miusa-jjjjound-olive",
      brandSlug: "new-balance",
      categorySlug: "runners-lifestyle",
      sku: "M990JD3",
      releaseYear: 2022,
      colorway: "Olive/Black",
      rarity: Rarity.RARE,
      isFeatured: false,
      description:
        "Justin Saunders' Montreal design studio JJJJound delivered this subtle, ultra-clean rendition of the Made in USA 990v3. Cloaked in tonal olive pigskin suede and mesh, finished with a black 'N' logo and silver JJJJound heel insignia.",
      authenticityNotes:
        "Verified authentic Made in USA JJJJound release. Premium pigskin suede texture and custom silver branded insole verified.",
      images: [
        {
          url: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1200&q=85",
          altText: "New Balance 990v3 JJJJound Olive suede profile",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      variant: {
        size: "US 9.0",
        condition: Condition.USED,
        conditionNotes:
          "Pre-owned in 8.5/10 condition. Gently worn 4 times casually. Clean insoles, minimal heel wear, minor nap variation on left toe. Includes original box and cream laces.",
        price: 27500,
        costPrice: 20000,
        stockQty: 1,
        isOneOfOne: true,
      },
    },
  ];

  for (const item of productsData) {
    const brandId = brandMap.get(item.brandSlug);
    const categoryId = categoryMap.get(item.categorySlug);

    if (!brandId || !categoryId) {
      console.warn(`Skipping ${item.title}: brand or category not resolved`);
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        brandId,
        categoryId,
        description: item.description,
        releaseYear: item.releaseYear,
        colorway: item.colorway,
        sku: item.sku,
        rarity: item.rarity,
        authenticityNotes: item.authenticityNotes,
        isFeatured: item.isFeatured,
      },
      create: {
        title: item.title,
        slug: item.slug,
        brandId,
        categoryId,
        description: item.description,
        releaseYear: item.releaseYear,
        colorway: item.colorway,
        sku: item.sku,
        rarity: item.rarity,
        authenticityNotes: item.authenticityNotes,
        isFeatured: item.isFeatured,
      },
    });

    // Seed Images
    for (const img of item.images) {
      const existingImg = await prisma.productImage.findFirst({
        where: { productId: product.id, url: img.url },
      });
      if (!existingImg) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: img.url,
            altText: img.altText,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
          },
        });
      }
    }

    // Seed 1-of-1 Variant
    const existingVariant = await prisma.productVariant.findFirst({
      where: { productId: product.id, size: item.variant.size },
    });

    if (!existingVariant) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          size: item.variant.size,
          condition: item.variant.condition,
          conditionNotes: item.variant.conditionNotes,
          price: item.variant.price,
          costPrice: item.variant.costPrice,
          stockQty: item.variant.stockQty,
          isOneOfOne: item.variant.isOneOfOne,
          isSold: false,
        },
      });
    }

    console.log(`👟 Seeded product: ${product.title}`);
  }

  console.log("✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
