import Link from "next/link";
import { ArrowRight, Flame, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/catalog/ProductCard";
import {
  getFeaturedProducts,
  getLatestProducts,
  getBrandsWithCounts,
} from "@/lib/queries/products";

export default async function HomePage() {
  const [featuredGrails, justLanded, brands] = await Promise.all([
    getFeaturedProducts(4),
    getLatestProducts(8),
    getBrandsWithCounts(),
  ]);

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-zinc-950 text-white border-b border-zinc-900">
        {/* Background Video Layer (Autoplays /videos/hero.mp4 from public folder) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>

        {/* Ambient Dark Gradient & Vignette Overlays for Maximum Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/40 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,119,6,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6 tracking-wider uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Limited Drops • Single-Vendor Vault
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase italic max-w-4xl leading-[1.05]">
            AUTHENTIC <span className="text-amber-500">RARE & DEADSTOCK</span> SNEAKERS
          </h1>

          <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl font-normal leading-relaxed">
            The premier Philippine boutique for authenticated holy grails, archived collaborative editions, and 1-of-1 collector pairs.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 shadow-lg shadow-amber-500/20">
              <Link href="/products">
                Shop The Vault <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-white font-semibold px-6">
              <Link href="/products?sort=rarity">
                Explore Holy Grails
              </Link>
            </Button>
          </div>

          {/* Quick Metrics */}
          <div className="mt-14 pt-8 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-12 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white">100%</div>
              <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mt-1">
                Authentic Guarantee
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400">1-of-1</div>
              <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mt-1">
                Exact Pair Photographed
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-2xl sm:text-3xl font-black text-white">DS / VNDS</div>
              <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mt-1">
                Certified Condition Grades
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Grails Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
              <Flame className="h-4 w-4" />
              Most Wanted
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Featured Grails
            </h2>
          </div>
          <Link
            href="/products?sort=rarity"
            className="text-xs sm:text-sm font-semibold text-primary hover:underline flex items-center gap-1 group"
          >
            View All Grails <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredGrails.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Shop by Brand Section */}
      <section className="bg-secondary/40 border-y py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Shop by Brand
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Browse authentic deadstock and rare models from legendary sneaker houses.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/products?brand=${brand.slug}`}
                className="group flex flex-col items-center justify-center p-6 rounded-xl border bg-card hover:bg-accent/60 transition-all text-center hover:shadow-sm hover:border-zinc-400 dark:hover:border-zinc-700"
              >
                <span className="text-lg font-bold tracking-tight text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {brand.name}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {brand._count.products} {brand._count.products === 1 ? "Pair" : "Pairs"} in Vault
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Just Landed (Newest) Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              <Sparkles className="h-4 w-4" />
              Latest Arrivals
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Just Landed
            </h2>
          </div>
          <Link
            href="/products?sort=newest"
            className="text-xs sm:text-sm font-semibold text-primary hover:underline flex items-center gap-1 group"
          >
            Browse Full Catalog <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {justLanded.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Authenticity Guarantee Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="rounded-2xl border bg-zinc-950 text-white p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Physical Authentication Guarantee
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              NEVER FAKES. ZERO GUESSWORK.
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every single pair in RareFinds is hand-inspected, blacklight/UV-tested, and verified before being cataloged. We stand 100% behind the authenticity of our entire inventory.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-zinc-200 font-bold shrink-0">
            <Link href="/products?condition=DS">
              Browse Deadstock Pairs
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
