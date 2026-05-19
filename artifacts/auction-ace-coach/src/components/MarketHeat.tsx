import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, HelpCircle, RefreshCw, TrendingUp } from "lucide-react";
import { fetchTrendingAdds, TrendingAdd, byeWeekForTeam } from "@/lib/sleeper";
import { POS_COLORS } from "@/lib/positions";
import { Position, DraftEvent, PriceEstimate } from "@/lib/draft-types";

interface Gap {
  pos: Position;
  severity: "critical" | "need" | "depth" | "done";
}

interface Props {
  events: DraftEvent[];
  prices: PriceEstimate[];
  gaps: Gap[];
  maxBid: number;
  remaining: number;
  pulseMultiplier: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const REFRESH_MS = 5 * 60 * 1000;

export default function MarketHeat({ events, prices, gaps, maxBid, remaining, pulseMultiplier }: Props) {
  const [trending, setTrending] = useState<TrendingAdd[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [showHelp, setShowHelp] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrendingAdds(24, 25);
      setTrending(data);
      setUpdatedAt(Date.now());
    } catch (e: any) {
      setError(e?.message || "Failed to load trending");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const draftedSet = useMemo(
    () => new Set(events.map((e) => norm(e.player))),
    [events]
  );
  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of prices) m.set(norm(p.name), p.price);
    return m;
  }, [prices]);
  const gapMap = useMemo(() => {
    const m = new Map<Position, Gap["severity"]>();
    for (const g of gaps) m.set(g.pos, g.severity);
    return m;
  }, [gaps]);

  const available = trending.filter(
    (t) => t.player && !draftedSet.has(norm(t.player.full_name))
  );

  const top = available.slice(0, 5);

  // Position rollup → spike detection
  const posCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of available.slice(0, 15)) {
      const pos = t.player?.position;
      if (!pos) continue;
      m[pos] = (m[pos] || 0) + t.count;
    }
    return m;
  }, [available]);

  const spikes = useMemo(() => {
    const totals = Object.entries(posCounts).sort((a, b) => b[1] - a[1]);
    if (!totals.length) return [];
    const max = totals[0][1];
    return totals
      .filter(([, c]) => c >= 0.4 * max && c > 1000)
      .slice(0, 3)
      .map(([pos, c]) => ({ pos: pos as Position, count: c }));
  }, [posCounts]);

  const updatedLabel = updatedAt
    ? `${Math.max(0, Math.round((Date.now() - updatedAt) / 60000))}m ago`
    : "—";

  return (
    <Card className="bg-gradient-card p-3 shadow-glow">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
          <Flame className="h-3 w-3" /> Hot Right Now
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="sm" variant="ghost"
            onClick={() => setShowHelp((s) => !s)}
            className="h-6 px-1.5"
            title="What is this?"
          >
            <HelpCircle className="h-3 w-3" />
          </Button>
          <span className="text-[9px] text-muted-foreground">{updatedLabel}</span>
        </div>
      </div>

      {showHelp && (
        <div className="mb-2 space-y-1 rounded-md border border-border bg-secondary/40 p-2 text-[10px] leading-relaxed">
          <p className="font-semibold">Players tons of managers just grabbed → expect overpays.</p>
          <p><span className="rounded border border-success/50 bg-success/15 px-1 py-0.5 text-[9px] font-bold text-success">TARGET</span> Need + can afford → <b>BID</b>.</p>
          <p><span className="rounded border border-warning/50 bg-warning/15 px-1 py-0.5 text-[9px] font-bold text-warning">STRETCH</span> Over your max — only with backup plan.</p>
          <p><span className="rounded border border-destructive/50 bg-destructive/10 px-1 py-0.5 text-[9px] font-bold text-destructive">SKIP</span> Out of budget.</p>
          <p><span className="rounded border border-muted-foreground/30 bg-muted/20 px-1 py-0.5 text-[9px] font-bold text-muted-foreground">FADE</span> Not a need — let others overpay.</p>
        </div>
      )}

      {spikes.length > 0 && (
        <div className="mb-1.5 flex flex-wrap items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-1 text-[10px]">
          <TrendingUp className="h-3 w-3 text-warning" />
          <span className="font-semibold text-warning">Run on:</span>
          {spikes.map((s) => (
            <Badge key={s.pos} variant="outline" className={`${POS_COLORS[s.pos]} px-1 py-0 text-[9px]`}>
              {s.pos}
            </Badge>
          ))}
        </div>
      )}

      {error && (
        <p className="py-2 text-center text-[11px] text-destructive">{error}</p>
      )}

      {loading && !top.length && (
        <div className="space-y-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[44px] animate-pulse rounded-md border border-border bg-secondary/40"
            />
          ))}
        </div>
      )}

      {!loading && !top.length && !error && (
        <p className="py-3 text-center text-[11px] text-muted-foreground">
          No trending adds right now.
        </p>
      )}

      <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
        {top.map((t, i) => {
          const p = t.player!;
          const pos = (p.position as Position) || "RB";
          const ref = priceMap.get(norm(p.full_name));
          const sev = gapMap.get(pos);
          const bye = byeWeekForTeam(p.team);
          const inj = p.injury_status;

          const goingRate = ref ? Math.max(1, Math.round(ref * pulseMultiplier)) : null;
          const affordable = goingRate != null && goingRate <= maxBid && goingRate <= remaining;
          const stretchable = goingRate != null && goingRate <= remaining && goingRate > maxBid;
          const needsPos = sev === "critical" || sev === "need" || sev === "depth";

          let tier: "TARGET" | "STRETCH" | "FADE" | "SKIP" | "UNKNOWN";
          let tierTone = "";
          let callout = "";

          if (!ref || goingRate == null) {
            tier = "UNKNOWN";
            tierTone = "border-border bg-secondary/40 text-muted-foreground";
            callout = needsPos ? `${pos} need · no sheet $` : `No sheet $`;
          } else if (sev === "done") {
            tier = "FADE";
            tierTone = "border-muted-foreground/30 bg-muted/20 text-muted-foreground";
            callout = `${pos} done · ~$${goingRate}`;
          } else if (affordable && needsPos) {
            tier = "TARGET";
            tierTone = "border-success/50 bg-success/15 text-success";
            const head = sev === "critical" ? `Critical ${pos}` : sev === "need" ? `Starter ${pos}` : `${pos} depth`;
            callout = `${head} · ~$${goingRate} (max $${maxBid})`;
          } else if (stretchable && needsPos) {
            tier = "STRETCH";
            tierTone = "border-warning/50 bg-warning/15 text-warning";
            callout = `${pos} need · $${goingRate - maxBid} over max`;
          } else if (goingRate > remaining) {
            tier = "SKIP";
            tierTone = "border-destructive/50 bg-destructive/10 text-destructive";
            callout = `$${goingRate} vs $${remaining} left`;
          } else {
            tier = "FADE";
            tierTone = "border-muted-foreground/30 bg-muted/20 text-muted-foreground";
            callout = `${pos} not a need`;
          }

          return (
            <div
              key={t.player_id}
              className="rounded-md border border-border bg-secondary/40 px-2 py-1"
            >
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className={`${POS_COLORS[pos]} px-1 py-0 text-[9px]`}>
                  {pos}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {p.full_name}
                </span>
                {inj && (
                  <Badge variant="outline" className="border-destructive/40 bg-destructive/10 px-1 py-0 text-[8px] text-destructive">
                    {inj}
                  </Badge>
                )}
                <span className={`shrink-0 rounded border px-1 py-0 text-[8px] font-bold tracking-wider ${tierTone}`}>
                  {tier}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 font-mono text-[10px] font-bold tabular-nums text-warning">
                  <Flame className="h-2.5 w-2.5" />
                  {t.count >= 1000 ? `${(t.count / 1000).toFixed(1)}k` : t.count}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] leading-snug text-muted-foreground">
                {callout}
                {ref && (
                  <span className="ml-1 font-mono text-foreground/80">
                    · ${ref}{goingRate !== ref && <span className="opacity-70"> → ${goingRate}</span>}
                  </span>
                )}
                <span className="ml-1 opacity-70">{p.team || "FA"}{bye ? ` · BYE ${bye}` : ""}</span>
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
