import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Condition, Rarity } from "@prisma/client";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    colorway?: string | null;
    releaseYear?: number | null;
    rarity: Rarity;
    brand: { name: string; slug: string };
    images: { url: string; altText?: string | null; isPrimary: boolean }[];
    variants: {
      id: string;
      size: string;
      condition: Condition;
      price: { toString: () => string } | number | string;
      isOneOfOne: boolean;
      isSold: boolean;
      stockQty: number;
    }[];
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage =
    product.images.find((img) => img.isPrimary)?.url ||
    product.images[0]?.url ||
    "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80";

  // Check if all variants are sold or stock is 0
  const isAllSold =
    product.variants.length > 0 &&
    product.variants.every((v) => v.isSold || v.stockQty <= 0);

  // Price range or single price
  const prices = product.variants.map((v) => Number(v.price));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  // Primary condition badge from first variant
  const primaryCondition = product.variants[0]?.condition || Condition.DS;
  const sizes = product.variants.map((v) => v.size).join(", ");

  const conditionVariantMap: Record<
    Condition,
    "ds" | "vnds" | "used"
  > = {
    DS: "ds",
    VNDS: "vnds",
    USED: "used",
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-zinc-400 dark:hover:border-zinc-700"
    >
      {/* Product Image Stage */}
      <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
        <Image
          src={primaryImage}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={`object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
            isAllSold ? "grayscale opacity-75" : ""
          }`}
          priority={false}
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          {product.rarity === Rarity.GRAIL && (
            <Badge variant="grail">GRAIL</Badge>
          )}
          {product.rarity === Rarity.VERY_RARE && (
            <Badge variant="grail">VERY RARE</Badge>
          )}
          <Badge variant={conditionVariantMap[primaryCondition]}>
            {primaryCondition}
          </Badge>
        </div>

        {/* Sold Overlay */}
        {isAllSold && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
            <Badge variant="destructive" className="text-sm px-4 py-1.5 font-bold uppercase tracking-widest shadow-lg">
              SOLD OUT
            </Badge>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            <span>{product.brand.name}</span>
            {product.releaseYear && <span>{product.releaseYear}</span>}
          </div>

          <h3 className="font-semibold text-sm line-clamp-2 mt-1 text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {product.title}
          </h3>

          {product.colorway && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {product.colorway}
            </p>
          )}
        </div>

        {/* Sizing & Price */}
        <div className="border-t pt-2.5 flex items-baseline justify-between mt-auto">
          <div className="text-xs text-muted-foreground">
            {product.variants.length === 0 && (
              <span className="italic text-zinc-400">Vault Allocation Pending</span>
            )}
            {product.variants[0]?.isOneOfOne && (
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {product.variants[0]?.size} • 1-of-1
              </span>
            )}
            {!product.variants[0]?.isOneOfOne && sizes && (
              <span>Sizes: {sizes}</span>
            )}
          </div>

          <div className="text-sm font-bold text-foreground">
            {product.variants.length === 0 ? (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Vault Pricing Soon
              </span>
            ) : minPrice === maxPrice ? (
              formatPrice(minPrice)
            ) : (
              `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
