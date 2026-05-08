import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Sigma, Lock } from "lucide-react";

/**
 * High-level explainer of HOW the engine thinks — deliberately vague on
 * formulas, weights, and thresholds. The exact math is proprietary.
 */
export default function PricingMathExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-4 md:p-5 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Sigma className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              How your coach thinks 🧠
            </h2>
            <p className="text-xs text-muted-foreground">
              The brain behind every Bid, Wait, and Pass
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm text-foreground/90 leading-relaxed">
          <section>
            <p className="text-muted-foreground">
              A custom algorithm was built for this. It doesn't just copy ESPN or Sleeper — it watches <span className="text-foreground font-medium">your league</span> and learns how the money actually moves.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              🧠 The brain
            </h3>
            <p className="text-muted-foreground">
              It runs on <span className="text-foreground font-medium">Bayesian reasoning</span> — fancy way of saying it starts with what the market thinks, then updates that belief every time new info comes in. Same math NASA uses to land rovers. Here it's used to win your draft.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              📜 Your league's receipts
            </h3>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">3 years of your actual auction results</span> get pulled in to learn your league's personality — who overpays at WR, who hoards RBs, who always sleeps on TE. Recent years count more than older ones, so last year's habits matter most. That's your league's fingerprint, and no other tool has it.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              👀 What else it watches
            </h3>
            <p className="text-muted-foreground">
              Expert consensus and live news layer on top. All three sources get weighted based on which one is most trustworthy <span className="text-foreground">for that specific player</span>.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              🎯 At the table
            </h3>
            <p className="text-muted-foreground">
              Every bid, it does the math on your wallet, your open spots, and how thin the position is — then tells you the most you should pay. Period. No bloat, no math you have to do in your head.
            </p>
          </section>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic pt-2 border-t border-border/40">
            <Lock className="h-3 w-3" /> The actual formulas stay locked.
          </p>
        </div>
      )}
    </Card>
  );
}
