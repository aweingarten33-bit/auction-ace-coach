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
  drain:    { label: "MAKE THEM SPEND", cls: "bg-accent/15 text-accent" },
  plug:     { label: "CHEAP FILL",      cls: "bg-primary/15 text-primary" },
  enforcer: { label: "PUSH PRICE UP",   cls: "bg-warning/15 text-warning" },
};

export default function NominationCard({ drain, get, aiSuggestions, aiLoading, onAskAi, onPickAi }: Props) {
  return (
    <Card className="bg-gradient-card p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Nomination
      </p>

      {/* DRAIN */}
      <div className="rounded-md border border-accent/40 bg-accent/5 p-2.5">
        <div className="flex items-center gap-1.5">
          <Megaphone className="h-3.5 w-3.5 text-accent" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-accent">
            Throw out — make others spend
          </p>
        </div>
        {drain.primary ? (
          <>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-base font-bold leading-tight text-foreground">
                {drain.primary.name}
              </p>
              {drain.primary.position && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {drain.primary.position}
                </Badge>
              )}
              <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                ~${drain.primary.price}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-foreground">{drain.primary.reason}</p>
            {drain.backups.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                <span className="font-bold uppercase tracking-wider">Backups:</span>
                {drain.backups.map((b) => (
                  <span key={b.name} className="text-foreground">
                    {b.name}
                    {b !== drain.backups[drain.backups.length - 1] && <span className="text-muted-foreground">,</span>}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">No good name to throw out yet.</p>
        )}
      </div>

      {/* GET */}
      <div className="mt-2 rounded-md border border-primary/40 bg-primary/5 p-2.5">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-primary" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-primary">
            Get your guy · target
          </p>
        </div>
        {get.target ? (
          <>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-base font-bold leading-tight text-foreground">{get.target}</p>
              {get.position && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{get.position}</Badge>
              )}
              <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                get.timing === "Nominate now"
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
              }`}>
                {get.timing}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
              <div className="rounded border border-border/50 bg-secondary/30 px-1 py-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Start</p>
                <p className="font-mono text-sm font-bold tabular-nums text-foreground">${get.startPrice}</p>
              </div>
              <div className="rounded border border-success/40 bg-success/10 px-1 py-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-success/80">Push to</p>
                <p className="font-mono text-sm font-bold tabular-nums text-success">${get.pushTo}</p>
              </div>
              <div className="rounded border border-destructive/40 bg-destructive/10 px-1 py-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-destructive/80">Stop at</p>
                <p className="font-mono text-sm font-bold tabular-nums text-destructive">${get.stopAt}</p>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[11px]">
              <span className={`flex items-center gap-1 font-bold ${get.safeIfWin ? "text-success" : "text-warning"}`}>
                {get.safeIfWin ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {get.safeIfWin ? "Safe if you win" : "Risky if you win"}
              </span>
              <span className="text-muted-foreground">— {get.reason}</span>
            </div>
          </>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">{get.reason}</p>
        )}
      </div>

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
