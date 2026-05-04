import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, RefreshCw, TrendingUp } from "lucide-react";
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
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const REFRESH_MS = 5 * 60 * 1000;

export default function MarketHeat({ events, prices, gaps, maxBid }: Props) {
  const [trending, setTrending] = useState<TrendingAdd[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);

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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
          <Flame className="h-3.5 w-3.5" /> Market Heat
          <span className="ml-1 text-[10px] font-normal normal-case text-muted-foreground">
            · Sleeper adds 24h
          </span>
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{updatedLabel}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={load}
            disabled={loading}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {spikes.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-[10px]">
          <TrendingUp className="h-3 w-3 text-warning" />
          <span className="font-semibold text-warning">Position spike:</span>
          {spikes.map((s) => (
            <Badge
              key={s.pos}
              variant="outline"
              className={`${POS_COLORS[s.pos]} px-1.5 py-0 text-[10px]`}
            >
              {s.pos} ×{(s.count / 1000).toFixed(1)}k
            </Badge>
          ))}
          <span className="ml-1 text-muted-foreground">
            → expect bidding inflation on next {spikes[0].pos}
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

          // Strategy callout
          let callout = "";
          if (sev === "critical")
            callout = `Critical ${pos} need — bid up to your sheet $${ref ?? "—"}`;
          else if (sev === "need")
            callout = `You still need a ${pos} — track price`;
          else if (sev === "depth")
            callout = `${pos} depth — only chase a knockoff price`;
          else callout = `${pos} done — let the room overpay`;

          if (ref && ref > maxBid) callout += ` · over your max ($${maxBid})`;

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
                <Badge
                  variant="outline"
                  className={`${POS_COLORS[pos]} px-1.5 py-0 text-[10px]`}
                >
                  {pos}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {p.full_name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {p.team || "FA"}
                  {bye ? ` · BYE ${bye}` : ""}
                </span>
                {inj && (
                  <Badge
                    variant="outline"
                    className="border-destructive/40 bg-destructive/10 px-1 py-0 text-[9px] text-destructive"
                  >
                    {inj}
                  </Badge>
                )}
                <span
                  className="ml-1 flex shrink-0 items-center gap-0.5 font-mono text-[11px] font-bold tabular-nums text-warning"
                  title="Sleeper add count (24h)"
                >
                  <Flame className="h-2.5 w-2.5" />
                  {t.count >= 1000
                    ? `${(t.count / 1000).toFixed(1)}k`
                    : t.count}
                </span>
              </div>
              <p className="mt-0.5 pl-7 text-[10px] leading-snug text-muted-foreground">
                {callout}
                {ref ? (
                  <span className="ml-1 font-mono text-foreground/80">
                    · sheet ${ref}
                  </span>
                ) : (
                  <span className="ml-1 italic">· no sheet price</span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[9px] leading-snug text-muted-foreground">
        Cross-platform signal: high Sleeper add volume usually precedes ESPN
        bidding spikes within 24–48h. Use this to front-run nominations or fade
        the hype.
      </p>
    </Card>
  );
}
