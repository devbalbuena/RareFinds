import { ShieldCheck, Check } from "lucide-react";

interface AuthenticityCardProps {
  notes?: string | null;
}

export function AuthenticityCard({ notes }: AuthenticityCardProps) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
        <ShieldCheck className="h-4 w-4" />
        Authenticity Guarantee Verified
      </div>

      <p className="text-xs text-foreground/90 leading-relaxed font-medium">
        {notes ||
          "This pair has been physically inspected by our sneaker authentication specialist. Verified 100% genuine."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>UV Blacklight Stitch Check</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>Box Label & Font Verification</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>Material & Scent Profile Audit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>Serial / SKU Match Checked</span>
        </div>
      </div>
    </div>
  );
}
