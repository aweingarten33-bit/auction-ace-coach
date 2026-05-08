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
              How the engine thinks
            </h2>
            <p className="text-xs text-muted-foreground">
              A high-level look at what powers every call
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm text-foreground/90 leading-relaxed">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              What goes in
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><span className="text-foreground font-medium">Your league's own auction history</span> — what your money actually does.</li>
              <li><span className="text-foreground font-medium">Public ranks &amp; projections</span> — to ground every player against the market.</li>
              <li><span className="text-foreground font-medium">Live player data</span> — depth chart, status, role.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              How a price is built
            </h3>
            <p className="text-muted-foreground">
              Two independent signals — one tuned to <span className="text-foreground">your league's spending behavior</span>, one to <span className="text-foreground">value over a replacement-level player</span> — get blended into a single anchor. Veterans lean on history; rookies and breakouts lean on value.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              News safety net
            </h3>
            <p className="text-muted-foreground">
              When something material hits (suspension, surgery, role change), the engine can <span className="text-foreground">only ever lower</span> a price — never raise it — and only with verified sourcing.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              Live decisions
            </h3>
            <p className="text-muted-foreground">
              At the table, the anchor is checked against your <span className="text-foreground">budget, open slots, and position scarcity</span> to produce Bid / Wait / Pass. The legal cap always wins — you'll never see a recommendation you can't actually make.
            </p>
          </section>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic pt-2 border-t border-border/40">
            <Lock className="h-3 w-3" /> Exact weights, formulas, and thresholds are proprietary.
          </p>
        </div>
      )}
    </Card>
  );
}
