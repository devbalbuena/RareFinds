import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export function ConditionGuideCard() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Condition Grading Standard
        </h4>
        <span className="text-[11px] text-muted-foreground">RareFinds Scale</span>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* DS */}
        <div className="flex items-start gap-3">
          <Badge variant="ds" className="shrink-0 mt-0.5">
            DS
          </Badge>
          <div>
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              Deadstock (Brand New)
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">
              Factory fresh and never worn. Includes original packaging, spare laces, and all factory accessories.
            </p>
          </div>
        </div>

        {/* VNDS */}
        <div className="flex items-start gap-3">
          <Badge variant="vnds" className="shrink-0 mt-0.5">
            VNDS
          </Badge>
          <div>
            <div className="font-semibold text-foreground">
              Very Near Deadstock
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">
              Tried on indoors or worn once for photo shoot. Stars on outsole fully visible, zero heel drag or creasing.
            </p>
          </div>
        </div>

        {/* USED */}
        <div className="flex items-start gap-3">
          <Badge variant="used" className="shrink-0 mt-0.5">
            USED
          </Badge>
          <div>
            <div className="font-semibold text-foreground">
              Pre-Owned (Collector Grade)
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">
              Carefully worn pair. All specific cosmetic details, midsole oxidation, or box wear are fully disclosed in inspector notes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
