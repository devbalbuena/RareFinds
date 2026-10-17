import { ShieldCheck, Sparkles } from "lucide-react";

export function AnnouncementBar() {
  return (
    <aside aria-label="Store Announcement" className="bg-zinc-950 text-zinc-100 text-xs py-2 px-4 border-b border-zinc-800 tracking-wide">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            RARE GRAIL VAULT
          </span>
          <span className="hidden sm:inline text-zinc-400">|</span>
          <span className="hidden sm:inline text-zinc-300">
            Single-vendor verified authentic limited sneakers. 1-of-1 inventory.
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            100% Authenticity Guarantee
          </span>
          <span>•</span>
          <span>Inspected in Manila, PH</span>
        </div>
      </div>
    </aside>
  );
}
