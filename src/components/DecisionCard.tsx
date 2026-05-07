// One card. Five-second decision. No dashboards.
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, ShieldAlert, ShieldX, Wrench } from "lucide-react";
import type { DecisionResult, Verdict } from "@/lib/decision-engine";

const verdictTone: Record<Verdict, { bg: string; text: string; ring: string }> = {
  BID: { bg: "bg-success/15", text: "text-success", ring: "ring-success/40" },
  PASS: { bg: "bg-warning/15", text: "text-warning", ring: "ring-warning/40" },
  STOP: { bg: "bg-destructive/15", text: "text-destructive", ring: "ring-destructive/50" },
  "ONLY IF CHEAP": { bg: "bg-muted", text: "text-foreground", ring: "ring-border" },
};

const planTone = {
  ok: { Icon: ShieldCheck, color: "text-success", label: "Your plan still works" },
  tight: { Icon: ShieldAlert, color: "text-warning", label: "Your plan is getting tight" },
  broken: { Icon: ShieldX, color: "text-destructive", label: "Your plan no longer works" },
} as const;

export default function DecisionCard({ d }: { d: DecisionResult }) {
  if (!d.hasPlayer) {
    return (
      <Card className="bg-gradient-card p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Type a player to get a decision
        </p>
      </Card>
    );
  }

  const v = verdictTone[d.verdict];
  const Plan = planTone[d.plan.status];

  return (
    <Card className="bg-gradient-card p-4 shadow-glow">
      {/* HEADER — player + verdict */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold leading-tight text-foreground">
              {d.player}
            </h2>
            {d.position && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{d.position}</Badge>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            current ${d.currentPrice || 0} · confidence {d.confidence}
            {d.anchorPrice > 0 && d.anchorSource === "sheet" && (
              <span className="ml-1.5 rounded bg-secondary/60 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
                your price ${d.anchorPrice}
              </span>
            )}
            {d.anchorPrice > 0 && d.anchorSource === "league" && (
              <span className="ml-1.5 rounded bg-secondary/60 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
                3yr league avg ${d.anchorPrice}
              </span>
            )}
            {d.anchorPrice > 0 && d.anchorSource === "espn" && (
              <span className="ml-1.5 rounded bg-secondary/60 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
                ESPN 2026 ${d.anchorPrice}
              </span>
            )}
            {d.anchorPrice === 0 && (
              <span className="ml-1.5 rounded bg-warning/20 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                ⚠ no price data — showing your max budget
              </span>
            )}
          </p>
        </div>
        <div className={`shrink-0 rounded-md px-3 py-1.5 ring-1 ${v.bg} ${v.ring}`}>
          <p className={`text-2xl font-extrabold leading-none tracking-tight ${v.text}`}>
            {d.verdict}
          </p>
          <p className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wider ${v.text}`}>
            {d.oneLiner}
          </p>
        </div>
      </div>

      {/* GO UP TO / STOP AT */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-success/80">You can go up to</p>
          <p className="font-mono text-2xl font-extrabold tabular-nums text-success">${d.goUpTo}</p>
        </div>
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-destructive/80">Stop at</p>
          <p className="font-mono text-2xl font-extrabold tabular-nums text-destructive">${d.stopAt}</p>
        </div>
      </div>
      <p className="mt-1 text-center text-[11px] font-semibold text-destructive/90">
        If you go above ${d.stopAt}, your plan no longer works
      </p>

      {/* PRICE LADDER */}
      <div className="mt-2 grid grid-cols-3 gap-1">
        {d.ladder.map((p) => {
          const label = p.label === "GOOD" ? "GOOD" : p.label === "FAIR" ? "BE CAREFUL" : "STOP";
          const tone = p.label === "GOOD"
            ? "border-success/40 bg-success/5 text-success"
            : p.label === "FAIR"
              ? "border-warning/40 bg-warning/5 text-warning"
              : "border-destructive/40 bg-destructive/5 text-destructive";
          return (
            <div key={p.label} className={`rounded border px-2 py-1 text-center ${tone}`}>
              <p className="font-mono text-sm font-bold tabular-nums">${p.price}</p>
              <p className="text-[9px] font-bold tracking-wider">{label}</p>
            </div>
          );
        })}
      </div>

      {/* BUY vs PASS */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className={`rounded-md border p-2.5 ${d.better === "buy" ? "border-success/60 bg-success/5" : "border-border/50 bg-secondary/30"}`}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">If you buy</p>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-foreground">
            ${d.buy.remainingAfter} left · {d.buy.slotsLeftAfter} slots
          </p>
          <p className="mt-1 text-[11px] leading-snug text-foreground">{d.buy.consequence}</p>
        </div>
        <div className={`rounded-md border p-2.5 ${d.better === "pass" ? "border-success/60 bg-success/5" : "border-border/50 bg-secondary/30"}`}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">If you pass</p>
          <p className="mt-1 text-[11px] leading-snug text-foreground">{d.pass.consequence}</p>
        </div>
      </div>

      {/* WHICH IS BETTER */}
      <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm font-semibold text-foreground">{d.betterReason}</p>
      </div>

      {/* PLAN STATUS */}
      <div className="mt-2 flex items-center gap-2 text-xs">
        <Plan.Icon className={`h-3.5 w-3.5 ${Plan.color}`} />
        <span className={`font-semibold ${Plan.color}`}>{Plan.label}</span>
        <span className="text-muted-foreground">— {d.plan.reason}</span>
      </div>

      {/* WINSTON WOLF — recovery */}
      {d.recovery.triggered && (
        <div className="mt-3 rounded-md border border-warning/50 bg-warning/10 p-2.5">
          <div className="flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-warning" />
            <p className="text-xs font-bold uppercase tracking-wider text-warning">
              You spent too much (${d.recovery.overspendBy} over)
            </p>
          </div>
          <ul className="mt-1 space-y-0.5 pl-5 text-[11px] text-foreground">
            {d.recovery.adjustments.map((a, i) => (
              <li key={i} className="list-disc">{a}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
