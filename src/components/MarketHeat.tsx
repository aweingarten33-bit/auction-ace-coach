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
    <Card className="bg-gradient-card p-4 shadow-glow">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
          <Flame className="h-3.5 w-3.5" /> Hot Players Right Now
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="sm" variant="ghost"
            onClick={() => setShowHelp((s) => !s)}
            className="h-7 px-2"
            title="What is this?"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground">{updatedLabel}</span>
          <Button
            size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 px-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
        Players that <span className="font-semibold text-foreground">tons of other fantasy managers</span> just grabbed.
        If they're hot here, expect your league to <span className="font-semibold text-warning">overpay</span> for them too.
      </p>

      {showHelp && (
        <div className="mb-3 space-y-1.5 rounded-md border border-border bg-secondary/40 p-2.5 text-[11px] leading-relaxed">
          <p className="font-semibold">Quick guide — what each label means:</p>
          <p><span className="rounded border border-success/50 bg-success/15 px-1 py-0.5 text-[9px] font-bold text-success">TARGET</span> You need this position + you can afford him → <b>BID</b>.</p>
          <p><span className="rounded border border-warning/50 bg-warning/15 px-1 py-0.5 text-[9px] font-bold text-warning">STRETCH</span> You need him but he costs more than your max → only if you have a backup plan.</p>
          <p><span className="rounded border border-destructive/50 bg-destructive/10 px-1 py-0.5 text-[9px] font-bold text-destructive">SKIP</span> Too expensive — you don't have the money.</p>
          <p><span className="rounded border border-muted-foreground/30 bg-muted/20 px-1 py-0.5 text-[9px] font-bold text-muted-foreground">FADE</span> You don't need him — let someone else overpay.</p>
          <p className="pt-1 text-muted-foreground">🔥 The flame number = how many people just added him. Bigger = hotter.</p>
        </div>
      )}

      {spikes.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-[11px]">
          <TrendingUp className="h-3 w-3 text-warning" />
          <span className="font-semibold text-warning">Everyone's grabbing:</span>
          {spikes.map((s) => (
            <Badge key={s.pos} variant="outline" className={`${POS_COLORS[s.pos]} px-1.5 py-0 text-[10px]`}>
              {s.pos}
            </Badge>
          ))}
          <span className="ml-1 text-muted-foreground">
            → next {spikes[0].pos} will go for too much. Either grab one fast or skip the bidding war.
          </span>
        </div>
      )}

      {error && (
        <p className="py-3 text-center text-xs text-destructive">{error}</p>
      )}

      {loading && !top.length && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[52px] animate-pulse rounded-md border border-border bg-secondary/40"
            />
          ))}
        </div>
      )}

      {!loading && !top.length && !error && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No trending adds right now.
        </p>
      )}

      <div className="space-y-1.5">
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
            callout = needsPos
              ? `${pos} need but no sheet price — set one to gauge fit`
              : `No sheet price — informational only`;
          } else if (sev === "done") {
            tier = "FADE";
            tierTone = "border-muted-foreground/30 bg-muted/20 text-muted-foreground";
            callout = `${pos} done — let the room overpay at $${goingRate}`;
          } else if (affordable && needsPos) {
            tier = "TARGET";
            tierTone = "border-success/50 bg-success/15 text-success";
            const head = sev === "critical" ? `Critical ${pos} need`
              : sev === "need" ? `Fills ${pos} starter`
              : `${pos} depth play`;
            callout = `${head} — going ~$${goingRate}, fits your $${maxBid} max`;
          } else if (stretchable && needsPos) {
            tier = "STRETCH";
            tierTone = "border-warning/50 bg-warning/15 text-warning";
            callout = `${pos} need but $${goingRate - maxBid} over max — only with knockoff plan`;
          } else if (goingRate > remaining) {
            tier = "SKIP";
            tierTone = "border-destructive/50 bg-destructive/10 text-destructive";
            callout = `Out of budget — $${goingRate} vs $${remaining} left`;
          } else {
            tier = "FADE";
            tierTone = "border-muted-foreground/30 bg-muted/20 text-muted-foreground";
            callout = `${pos} not a need — pass unless steal`;
          }

          return (
            <div
              key={t.player_id}
              style={{ animationDelay: `${i * 50}ms` }}
              className="animate-fade-in-up rounded-md border border-border bg-secondary/40 px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-[10px] font-bold text-warning">
                  {i + 1}
                </span>
                <Badge variant="outline" className={`${POS_COLORS[pos]} px-1.5 py-0 text-[10px]`}>
                  {pos}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {p.full_name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {p.team || "FA"}{bye ? ` · BYE ${bye}` : ""}
                </span>
                {inj && (
                  <Badge variant="outline" className="border-destructive/40 bg-destructive/10 px-1 py-0 text-[9px] text-destructive">
                    {inj}
                  </Badge>
                )}
                <span className="ml-1 flex shrink-0 items-center gap-0.5 font-mono text-[11px] font-bold tabular-nums text-warning" title="Sleeper add count (24h)">
                  <Flame className="h-2.5 w-2.5" />
                  {t.count >= 1000 ? `${(t.count / 1000).toFixed(1)}k` : t.count}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 pl-7">
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${tierTone}`}>
                  {tier}
                </span>
                <p className="min-w-0 flex-1 truncate text-[10px] leading-snug text-muted-foreground">
                  {callout}
                  {ref && (
                    <span className="ml-1 font-mono text-foreground/80">
                      · sheet ${ref}
                      {goingRate !== ref && <span className="opacity-70"> → ${goingRate}</span>}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
        💡 Tap <HelpCircle className="inline h-2.5 w-2.5" /> above if any label is confusing.
      </p>
    </Card>
  );
}
