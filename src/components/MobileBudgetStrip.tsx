import AnimatedNumber from "@/components/AnimatedNumber";
import { Progress } from "@/components/ui/progress";

interface SlotChip {
  pos: string;
  have: number;
  need: number;
  short: number;
}

interface MobileBudgetStripProps {
  remaining: number;
  spent: number;
  totalBudget: number;
  maxBid: number;
  avgPerSlot: number;
  slotsLeft: number;
  slotsTotal: number;
  rows: SlotChip[];
}

export default function MobileBudgetStrip({
  remaining,
  spent,
  totalBudget,
  maxBid,
  avgPerSlot,
  slotsLeft,
  slotsTotal,
  rows,
}: MobileBudgetStripProps) {
  const spentPct = totalBudget ? Math.min(100, (spent / totalBudget) * 100) : 0;

  return (
    <div className="sticky top-[48px] z-10 -mx-3 mb-2 border-b border-border/60 bg-card/90 px-3 py-1.5 backdrop-blur-md lg:hidden">
      {/* Row 1: budget headlines */}
      <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
        <div className="flex items-baseline gap-1">
          <AnimatedNumber value={remaining} prefix="$" className="text-base font-extrabold text-primary" />
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">left</span>
        </div>
        <div className="flex items-baseline gap-1">
          <AnimatedNumber value={maxBid} prefix="$" className="text-sm font-bold text-foreground" />
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">max</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-foreground">${avgPerSlot.toFixed(0)}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">/slot</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-foreground tabular-nums">
            {slotsLeft}<span className="text-muted-foreground">/{slotsTotal}</span>
          </span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">slots</span>
        </div>
      </div>

      {/* Spend progress */}
      <Progress value={spentPct} className="mt-1 h-0.5 transition-all duration-500 ease-out-expo" />
      <div className="mt-0.5 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>${spent} spent</span>
        <span>${totalBudget - spent} reserve</span>
      </div>

      {/* Row 2: per-position chips (have/need) */}
      {rows.length > 0 && (
        <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
          {rows.map((r) => {
            const ok = r.short <= 0;
            return (
              <div
                key={r.pos}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  ok
                    ? "border-border/60 bg-secondary/40 text-muted-foreground"
                    : r.short >= 2
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-primary/40 bg-primary/10 text-primary"
                }`}
              >
                <span className="font-mono tracking-wider">{r.pos}</span>
                <span className="tabular-nums">
                  {r.have}<span className="opacity-50">/{r.need}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
