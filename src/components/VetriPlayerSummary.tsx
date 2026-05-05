import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDraftStore } from "@/lib/draft-store";
import { Badge } from "@/components/ui/badge";
import { POS_COLORS } from "@/lib/positions";
import { Position, PriceEstimate } from "@/lib/draft-types";
import type { VetriTake } from "@/lib/vetri-types";
import { Loader2 } from "lucide-react";

interface RawNote {
  video_id: string;
  title: string;
  url: string;
  published_at: string | null;
  takes: any;
}

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
  for (const p of prices) if (norm(p.name) === want) return p.price;
  const tokens = want.split(" ").filter(Boolean);
  for (const p of prices) {
    const h = new Set(norm(p.name).split(" "));
    if (tokens.length && tokens.every((t) => h.has(t))) return p.price;
  }
  return null;
}

function fmtDate(s: string | null): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function VetriPlayerSummary() {
  const prices = useDraftStore((s) => s.prices);
  const [notes, setNotes] = useState<RawNote[] | null>(null);

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
      if (error || !data) setNotes([]);
      else setNotes(data as RawNote[]);
    })();
    return () => { cancelled = true; };
  }, []);

  if (notes === null) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
      </div>
    );
  }
  if (!notes.length) {
    return <p className="text-[11px] italic text-muted-foreground">No videos yet.</p>;
  }

  return (
    <div className="space-y-3">
      {notes.map((row) => {
        const takes: VetriTake[] = Array.isArray(row.takes) ? row.takes : [];
        return (
          <div key={row.video_id}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <p className="truncate text-[12px] font-semibold text-foreground">{row.title}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">{fmtDate(row.published_at)}</span>
            </div>
            <ul className="divide-y divide-border rounded-md border border-border bg-secondary/20">
              {takes.map((t, i) => {
                const price = priceFor(prices, t.player);
                return (
                  <li key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <span className="truncate text-[12px] font-medium text-foreground">{t.player}</span>
                    {t.position && (
                      <Badge
                        variant="outline"
                        className={`${POS_COLORS[t.position as Position] ?? ""} px-1.5 py-0 text-[9px]`}
                      >
                        {t.position}
                      </Badge>
                    )}
                    <span className={`ml-auto text-[12px] font-bold tabular-nums ${
                      price != null ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {price != null ? `$${price}` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
