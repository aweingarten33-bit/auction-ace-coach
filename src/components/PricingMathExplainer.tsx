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
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              📚 What it studies
            </h3>
            <p className="text-muted-foreground">
              Your league's <span className="text-foreground font-medium">spending habits</span>, the <span className="text-foreground font-medium">expert rankings</span>, and <span className="text-foreground font-medium">live news</span> on every player. Three sources, one opinion.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              💰 How it picks a price
            </h3>
            <p className="text-muted-foreground">
              Two voices argue: one says "this is what your league pays guys like him," the other says "this is what he's actually worth." We blend them. Vets lean on history, rookies lean on talent.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              🚨 The news guard
            </h3>
            <p className="text-muted-foreground">
              If something bad breaks — injury, suspension, lost job — prices drop. We <span className="text-foreground">never</span> hype a guy up off rumors. Bad news only.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              🎯 Live at the table
            </h3>
            <p className="text-muted-foreground">
              Every bid, the engine checks your <span className="text-foreground">wallet, empty roster spots, and how thin the position is</span> — then says Bid, Wait, or Pass. It'll never tell you to spend money you don't have.
            </p>
          </section>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic pt-2 border-t border-border/40">
            <Lock className="h-3 w-3" /> The secret sauce stays secret.
          </p>
        </div>
      )}
    </Card>
  );
}
