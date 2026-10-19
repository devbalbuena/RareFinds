import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-zinc-950 text-foreground px-4 py-8 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Video Layer (Autoplays /videos/auth.mp4 or /videos/hero.mp4) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* Ambient Dark Gradient & Vignette Overlays for Maximum Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-zinc-950/30 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,119,6,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition-all backdrop-blur-md shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Store</span>
          </Link>
          <Link href="/" className="flex items-center gap-1 group">
            <span className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-foreground group-hover:text-amber-500 transition-colors">
              RARE<span className="text-amber-500 group-hover:text-foreground">FINDS</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="hidden sm:inline">Verified Vault Access</span>
        </div>
      </div>

      {/* Main Auth Form Container */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md flex flex-col gap-3">
          <div className="flex items-center justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-amber-400 transition-colors bg-zinc-900/70 hover:bg-zinc-850 px-3 py-1.5 rounded-full backdrop-blur-md border border-zinc-800 shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Store</span>
            </Link>
          </div>
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-xs text-muted-foreground py-4 border-t border-zinc-900 max-w-7xl mx-auto w-full">
        © {new Date().getFullYear()} RareFinds. Single-vendor authenticated rare & deadstock footwear.
      </div>
    </div>
  );
}
