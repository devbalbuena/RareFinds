import Link from "next/link";
import { ShieldCheck, Truck, RefreshCw, Sparkles } from "lucide-react";
import { getStoreSettings } from "@/lib/settings";

export async function StoreFooter() {
  const settings = await getStoreSettings();

  return (
    <footer className="border-t bg-zinc-950 text-zinc-300">
      {/* Reassurance Banner */}
      <div className="border-b border-zinc-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">100% Authentic Guaranteed</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Every pair undergoes physical authentication and UV inspection before listing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">1-of-1 Vault Inventory</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Actual photos of the exact pair you are purchasing. Once sold, it is gone.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Nationwide Delivery</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Double-boxed insured express shipping across Metro Manila and provinces.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Strict Condition Grading</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Standardized DS, VNDS, and USED grading with high-res disclosure of any flaws.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-4">
          <span className="text-xl font-black tracking-tighter uppercase italic text-white">
            {settings.storeName}
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {settings.storeTagline || "Curated single-vendor destination for rare, archived, and deadstock sneakers."}
            {settings.address ? ` Located in ${settings.address}.` : ""}
          </p>
          <div className="pt-2 text-xs text-zinc-500">
            Payment via Cash on Delivery, Maya, and Test Simulation.
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
            Shop Catalog
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/products" className="hover:text-white transition-colors">
                All Sneakers
              </Link>
            </li>
            <li>
              <Link href="/products?sort=rarity" className="hover:text-white transition-colors">
                Holy Grails &amp; Collabs
              </Link>
            </li>
            <li>
              <Link href="/products?condition=DS" className="hover:text-white transition-colors">
                Deadstock (Brand New)
              </Link>
            </li>
            <li>
              <Link href="/products?sort=newest" className="hover:text-white transition-colors">
                Just Landed
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
            Condition Grading Guide
          </h4>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li>
              <span className="font-semibold text-emerald-400">DS (Deadstock):</span> Brand new, unworn, original accessories &amp; box.
            </li>
            <li>
              <span className="font-semibold text-sky-400">VNDS (Very Near DS):</span> Tried on once or near-immaculate condition.
            </li>
            <li>
              <span className="font-semibold text-zinc-300">USED:</span> Lightly worn with disclosed high-definition photos.
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
            Security &amp; Support
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-2">
            Questions on sizing, condition notes, or physical viewings? Contact store support:
          </p>
          <p className="text-xs font-mono text-zinc-300">{settings.contactEmail}</p>
          <p className="text-xs font-mono text-zinc-400 mt-1">{settings.contactPhone}</p>
        </div>
      </div>

      <div className="border-t border-zinc-900 py-6 px-4 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {settings.storeName}. All rights reserved. Single-vendor verified authentic retail platform.
      </div>
    </footer>
  );
}
