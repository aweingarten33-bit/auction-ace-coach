import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDraftStore } from "@/lib/draft-store";
import { Badge } from "@/components/ui/badge";
import { POS_COLORS } from "@/lib/positions";
import { Position, PriceEstimate } from "@/lib/draft-types";
import type { VetriTake } from "@/lib/vetri-types";
import { Youtube, Loader2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

interface RawNote {
  video_id: string;
  title: string;
  url: string;
  published_at: string | null;
  takes: any;
}

interface AggPlayer {
  player: string;
  position: Position | null;
  leans: VetriTake["lean"][];
  reasons: string[];
  videos: { videoId: string; title: string; url: string; publishedAt: string | null }[];
}

const LEAN_TONE: Record<string, { tone: string; Icon: typeof TrendingUp | null }> = {
  target: { tone: "text-success", Icon: TrendingUp },
  breakout: { tone: "text-success", Icon: TrendingUp },
  sleeper: { tone: "text-primary", Icon: Sparkles },
  value: { tone: "text-primary", Icon: TrendingUp },
  fade: { tone: "text-warning", Icon: TrendingDown },
  avoid: { tone: "text-destructive", Icon: TrendingDown },
  neutral: { tone: "text-muted-foreground", Icon: null },
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`.]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function priceFor(prices: PriceEstimate[], player: string): number | null {
  const want = norm(player);
  for (const p of prices) {
    if (norm(p.name) === want) return p.price;
  }
  // loose: all tokens of want appear in p.name
  const tokens = want.split(" ").filter(Boolean);
  for (const p of prices) {
    const h = new Set(norm(p.name).split(" "));
    if (tokens.length && tokens.every((t) => h.has(t))) return p.price;
  }
  return null;
}

export default function VetriPlayerSummary() {
  const prices = useDraftStore((s) => s.prices);
  const [notes, setNotes] = useState<RawNote[] | null>(null);
  const [filter, setFilter] = useState<"all" | "target" | "fade">("target");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("vetri_notes")
        .select("video_id, title, url, published_at, takes")
        .eq("status", "ready")
        .order("published_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error || !data) {
        setNotes([]);
        return;
      }
      setNotes(data as RawNote[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const players = useMemo<AggPlayer[]>(() => {
    if (!notes) return [];
    const map = new Map<string, AggPlayer>();
    for (const row of notes) {
      const takes: VetriTake[] = Array.isArray(row.takes) ? row.takes : [];
      for (const t of takes) {
        if (!t?.player) continue;
        const key = norm(t.player);
        const existing = map.get(key);
        if (existing) {
          existing.leans.push(t.lean);
          if (t.reasoning) existing.reasons.push(t.reasoning);
          existing.videos.push({
            videoId: row.video_id,
            title: row.title,
            url: row.url,
            publishedAt: row.published_at,
          });
        } else {
          map.set(key, {
            player: t.player,
            position: (t.position as Position) ?? null,
            leans: [t.lean],
            reasons: t.reasoning ? [t.reasoning] : [],
            videos: [{
              videoId: row.video_id,
              title: row.title,
              url: row.url,
              publishedAt: row.published_at,
            }],
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.videos.length - a.videos.length || a.player.localeCompare(b.player));
  }, [notes]);

  const filtered = useMemo(() => {
    // Always hide players who only have neutral mentions
    const meaningful = players.filter((p) => p.leans.some((l) => l !== "neutral"));
    if (filter === "all") return meaningful;
    if (filter === "target") {
      return meaningful.filter((p) =>
        p.leans.some((l) => l === "target" || l === "breakout" || l === "sleeper" || l === "value")
      );
    }
    return meaningful.filter((p) => p.leans.some((l) => l === "fade" || l === "avoid"));
  }, [players, filter]);

  if (notes === null) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading Sal Vetri players…
      </div>
    );
  }
  if (!players.length) {
    return <p className="text-[11px] italic text-muted-foreground">No player takes yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {filtered.length} of {players.length} players
        </p>
        <div className="inline-flex rounded-full bg-secondary/50 p-0.5 text-[10px] font-semibold">
          {(["all", "target", "fade"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-2 py-0.5 capitalize transition ${
                filter === k ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              {k === "target" ? "Targets" : k === "fade" ? "Fades" : "All"}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-1.5">
        {filtered.map((p) => {
          // Pick the strongest lean for the icon (target > breakout > sleeper > value > fade > avoid > neutral)
          const order = ["target", "breakout", "sleeper", "value", "fade", "avoid", "neutral"];
          const topLean = [...p.leans].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? "neutral";
          const tone = LEAN_TONE[topLean] ?? LEAN_TONE.neutral;
          const Icon = tone.Icon;
          const price = priceFor(prices, p.player);
          const reason = p.reasons[0] ?? "";

          return (
            <li
              key={p.player}
              className="rounded-md border border-border bg-secondary/30 p-2"
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${tone.tone}`} />}
                <span className="truncate text-[12px] font-semibold text-foreground">
                  {p.player}
                </span>
                {p.position && (
                  <Badge
                    variant="outline"
                    className={`${POS_COLORS[p.position]} px-1.5 py-0 text-[9px]`}
                  >
                    {p.position}
                  </Badge>
                )}
                <span className={`ml-auto text-[12px] font-bold tabular-nums ${
                  price != null ? "text-primary" : "text-muted-foreground"
                }`}>
                  {price != null ? `$${price}` : "—"}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1">
                {Array.from(new Set(p.leans)).map((l) => (
                  <Badge
                    key={l}
                    variant="outline"
                    className={`px-1.5 py-0 text-[9px] capitalize ${LEAN_TONE[l]?.tone ?? ""}`}
                  >
                    {l}
                  </Badge>
                ))}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {p.videos.length} {p.videos.length === 1 ? "video" : "videos"}
                </span>
              </div>

              {reason && (
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                  “{reason}”
                </p>
              )}

            </li>
          );
        })}
      </ul>
    </div>
  );
}
