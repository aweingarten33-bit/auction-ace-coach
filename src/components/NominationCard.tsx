// One compact card. Two answers: who to nominate to drain, and how to get yours.
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Target, Check, X, Sparkles, Loader2 } from "lucide-react";
import type { DrainPlan, GetPlan } from "@/lib/nomination";

export interface AiNomination {
  name: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DST";
  strategy: "drain" | "plug" | "enforcer";
  price: number;
  reason: string;
}

interface Props {
  drain: DrainPlan;
  get: GetPlan;
  aiSuggestions?: AiNomination[];
  aiLoading?: boolean;
  onAskAi?: () => void;
  onPickAi?: (s: AiNomination) => void;
}

const STRATEGY_STYLE: Record<AiNomination["strategy"], { label: string; cls: string }> = {
  drain:    { label: "WASTE THEIR MONEY", cls: "bg-accent/15 text-accent" },
  plug:     { label: "CHEAP PICK",        cls: "bg-primary/15 text-primary" },
  enforcer: { label: "RAISE THE PRICE",   cls: "bg-warning/15 text-warning" },
};

export default function NominationCard({ drain: _drain, get: _get, aiSuggestions, aiLoading, onAskAi, onPickAi }: Props) {
  return (
    <Card className="bg-gradient-card p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Who to nominate next
      </p>


      {/* AI SUGGESTIONS */}
      {(onAskAi || aiSuggestions?.length) && (
        <div className="mt-2 rounded-md border border-border bg-secondary/30 p-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-foreground" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-foreground">
              AI suggestions
            </p>
            {onAskAi && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-6 px-2 text-[10px]"
                onClick={onAskAi}
                disabled={aiLoading}
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Suggest"}
              </Button>
            )}
          </div>
          {aiSuggestions && aiSuggestions.length > 0 ? (
            <div className="mt-1.5 space-y-1.5">
              {aiSuggestions.map((s) => {
                const style = STRATEGY_STYLE[s.strategy];
                return (
                  <button
                    key={s.name}
                    onClick={() => onPickAi?.(s)}
                    className="block w-full rounded border border-border bg-background/40 px-2 py-1.5 text-left transition hover:border-primary/60 hover:bg-background"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className={`rounded px-1 py-0 text-[9px] font-bold tracking-wider ${style.cls}`}>
                        {style.label}
                      </span>
                      <span className="text-sm font-bold text-foreground">{s.name}</span>
                      <Badge variant="outline" className="px-1 py-0 text-[10px]">{s.position}</Badge>
                      <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                        ~${s.price}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{s.reason}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            !aiLoading && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tap Suggest for AI picks using draft + history + takes.
              </p>
            )
          )}
        </div>
      )}
    </Card>
  );
}
