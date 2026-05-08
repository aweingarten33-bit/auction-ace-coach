import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Sigma } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Plain-English explainer of how every dollar value in the app gets calculated.
 * Admin-only. Collapsed by default.
 */
export default function PricingMathExplainer() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setIsAdmin(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!isAdmin) return null;

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
              How we price every player
            </h2>
            <p className="text-xs text-muted-foreground">
              The math behind every dollar value you see
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm text-foreground/90 leading-relaxed">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              1. Three inputs feed the engine
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><span className="text-foreground font-medium">Your league history</span> — last 3 seasons of actual winning bids in your auction.</li>
              <li><span className="text-foreground font-medium">ESPN ranks &amp; projected points</span> — the public market and a points projection per player.</li>
              <li><span className="text-foreground font-medium">Sleeper player DB</span> — overall search rank, depth chart, injury status, rookie flag.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              2. Two parallel anchor prices
            </h3>
            <div className="space-y-2">
              <div className="rounded-md border border-border/60 bg-secondary/30 p-3">
                <div className="font-medium">A. Recency-weighted league anchor</div>
                <p className="text-xs text-muted-foreground mt-1">
                  For any player who's been drafted in your league, we collapse the last 3 winning bids into one number with weights that lean recent:
                </p>
                <pre className="mt-2 text-xs bg-background/60 p-2 rounded overflow-x-auto">
{`anchor = 0.50·last + 0.30·prev + 0.20·older`}
                </pre>
                <p className="text-xs text-muted-foreground mt-1">
                  If <span className="text-foreground">last year dropped &gt;15% vs prior</span> (a fade — think CMC), we re-weight to <code className="text-foreground">0.80·last + 0.15·prev + 0.05·older</code> so collapses don't get smoothed away.
                </p>
              </div>

              <div className="rounded-md border border-border/60 bg-secondary/30 p-3">
                <div className="font-medium">B. VORP anchor (for everyone else)</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Value Over Replacement Player. For each position we find the projected points of the last "starter-grade" player your league will draft (replacement level), then:
                </p>
                <pre className="mt-2 text-xs bg-background/60 p-2 rounded overflow-x-auto">
{`VORP_i        = max(0, projection_i − replacement_pos)
$ pool        = totalBudget × numTeams − $1·(every roster slot)
global $/VORP = $ pool / Σ VORP

price_i = $1 + VORP_i × $/VORP_pos × superflex_QB_premium`}
                </pre>
                <p className="text-xs text-muted-foreground mt-1">
                  $/VORP is calibrated <span className="text-foreground">per position</span> using what your league actually paid the last 3 years (blended toward global until we have ≥25 samples). Superflex/2QB adds a 1.25× QB premium.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              3. Blend → final anchor
            </h3>
            <p className="text-muted-foreground">
              When we have both, we blend league history and VORP. League history dominates for veterans with bid records; VORP carries rookies, breakouts, and players new to your league.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              4. AI safety net (only ever subtracts)
            </h3>
            <p className="text-muted-foreground">
              Flagged players (suspension, surgery, holdout, depth-chart demotion) get checked against last-30-days news with a Google-grounded model. We only apply a discount when:
              <span className="text-foreground"> confidence = high</span>, a real source URL is returned, and the news is fantasy-relevant. Severity maps to a multiplier (e.g. 6+ game suspension = ×0.40, season-ending = ×0.15). The math anchor is the ceiling — AI can never raise a price.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              5. Live decision layer
            </h3>
            <p className="text-muted-foreground">
              In the draft room the anchor gets compared to your remaining budget, open roster slots, and position scarcity to produce <span className="text-foreground">Bid / Wait / Pass</span> calls. The legal cap <code>B − ($1 × open slots − 1)</code> always wins — we never recommend a bid you can't legally make.
            </p>
          </section>

          <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/40">
            Source files: <code>use-anchor-map.ts</code>, <code>use-vorp-map.ts</code>, <code>decision-engine.ts</code>, <code>league-tier-prices.ts</code>, <code>check-player-news</code>.
          </p>
        </div>
      )}
    </Card>
  );
}
