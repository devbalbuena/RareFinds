import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  Building2,
  Lock,
  PackageCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
  HelpCircle,
  FileCheck,
} from "lucide-react";
import { getStoreSettings } from "@/lib/settings";

export const metadata = {
  title: "Vault Delivery & Authenticity Policy | RareFinds Sneaker Vault",
  description:
    "Explore our 3 Philippine delivery tiers: NCR Local Express, BGC VIP Self-Pickup, and Nationwide Insured Air Courier. 100% double-boxed authenticity guarantee.",
};

export default async function ShippingPolicyPage() {
  const settings = await getStoreSettings();

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Vault Security Standards</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Delivery &amp; Authenticity Policy
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Every sneaker leaving the {settings.storeName} vault is verified, documented, double-boxed, and insured for transit across the Philippine archipelago.
          </p>
        </div>

        {/* 3 Delivery Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tier 1: NCR Express */}
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Tier 1</span>
                <h3 className="text-lg font-bold text-white mt-0.5">NCR Local Express</h3>
                <p className="text-xs text-zinc-400 mt-1">Same-Day / Next-Day Dedicated Courier</p>
              </div>

              <div className="space-y-2.5 text-xs text-zinc-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Doorstep delivery across all 17 Metro Manila cities.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Protected by 4-digit Handover PIN to ensure zero theft.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Cash on Delivery (COD) eligible up to store limits.</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Transit: 12 - 24 Hours</span>
              <span className="font-bold text-emerald-400 font-mono">From ₱180</span>
            </div>
          </div>

          {/* Tier 2: BGC Vault Pickup */}
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Tier 2</span>
                <h3 className="text-lg font-bold text-white mt-0.5">BGC VIP Self-Pickup</h3>
                <p className="text-xs text-zinc-400 mt-1">Private Vault Lounge Handover</p>
              </div>

              <div className="space-y-2.5 text-xs text-zinc-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Located at {settings.address || "Bonifacio Global City, Taguig, Metro Manila"}.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Inspect pair in person with our staff before taking home.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Zero shipping fee for local collectors.</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Ready in: 2 Hours</span>
              <span className="font-bold text-blue-400 font-mono">FREE (₱0)</span>
            </div>
          </div>

          {/* Tier 3: Nationwide Courier */}
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Tier 3</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Insured Air Courier</h3>
                <p className="text-xs text-zinc-400 mt-1">Luzon, Visayas &amp; Mindanao</p>
              </div>

              <div className="space-y-2.5 text-xs text-zinc-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Shipped via premium air couriers (LBC Express &amp; J&amp;T).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Heavy-duty double boxing with tamper-evident seal tape.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Online payment / Bank deposit required to secure insurance.</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Transit: 2 - 5 Days</span>
              <span className="font-bold text-amber-400 font-mono">₱280 - ₱450</span>
            </div>
          </div>
        </div>

        {/* 5-Step Vault Verification Protocol */}
        <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">The 5-Step Vault Authentication Protocol</h2>
              <p className="text-xs text-zinc-400">Every sneaker undergoes this strict regimen prior to dispatch.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2">
              <div className="text-amber-400 font-mono font-bold text-xs">01 • UV Inspection</div>
              <h4 className="text-xs font-bold text-white">Blacklight Stitch Audit</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                UV rays reveal hidden glue stains, factory stitching irregularities, and counterfeit glow signatures.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2">
              <div className="text-amber-400 font-mono font-bold text-xs">02 • Typography</div>
              <h4 className="text-xs font-bold text-white">Size Tag &amp; Barcode</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Font weights, SKU numbers, production dates, and micro-fonts are cross-referenced with authorized databases.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2">
              <div className="text-amber-400 font-mono font-bold text-xs">03 • Materiality</div>
              <h4 className="text-xs font-bold text-white">Leather &amp; Suede Feel</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Genuine tumble grain, cut edging, suede nap movement, and factory scent verification.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2">
              <div className="text-amber-400 font-mono font-bold text-xs">04 • Serialized Seal</div>
              <h4 className="text-xs font-bold text-white">Tamper-Proof Tag</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Laser-engraved RareFinds security zip-tie affixed to eyelet. Non-removable without cutting.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2">
              <div className="text-amber-400 font-mono font-bold text-xs">05 • Certificate</div>
              <h4 className="text-xs font-bold text-white">Digital &amp; Print COA</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Issued with unique serial code, order timestamp, and grading guarantee signed by our head curator.
              </p>
            </div>
          </div>
        </div>

        {/* Packaging Standards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Heavy-Duty Double Boxing Standard
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We never ship raw shoeboxes in poly mailers. All sneakers are housed in their original collector box, wrapped in multi-layered protective bubble wrap, and encased in a 200 lb. test corrugated outer box to shield against crushing, weather, and corner damage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              Customer Arrival &amp; Inspection Window
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Once delivered, customers receive 48 hours to confirm physical receipt and condition match. If any discrepancy with disclosed grading exists, our vault concierges resolve it immediately before funds are cleared.
            </p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="p-8 rounded-3xl bg-linear-to-r from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/60 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-white">Ready to acquire a grail?</h3>
            <p className="text-xs text-zinc-400">
              Browse our live inventory of verified deadstock sneakers.
            </p>
          </div>
          <Link
            href="/products"
            className="px-6 py-3 bg-white text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-lg"
          >
            <span>Browse Vault Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
