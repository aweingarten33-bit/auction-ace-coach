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
        <div className="mt-4 text-sm text-muted-foreground italic">
          {/* Write your own explanation here */}
          Coming soon.
        </div>
      )}
    </Card>
  );
}
