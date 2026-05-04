import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POS_COLORS } from "@/lib/positions";
import { Position } from "@/lib/draft-types";
import { supabase } from "@/integrations/supabase/client";
import { Youtube, RefreshCw, ExternalLink, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Sparkles, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import VetriTakesForPlayer from "@/components/VetriTakesForPlayer";
import { toast } from "sonner";

export interface VetriTake {
  player: string;
  position: Position;
  lean: "target" | "value" | "fade" | "avoid" | "sleeper" | "breakout" | "neutral";
  tier?: string;
  reasoning: string;
}

export interface VetriNote {
  id: string;
  video_id: string;
  title: string;
  url: string;
  published_at: string | null;
  summary: string | null;
  takes: VetriTake[];
  positions: string[];
  status: string;
  error: string | null;
  updated_at: string;
}

const REFRESH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vetri-notes-refresh`;

const LEAN_TONE: Record<VetriTake["lean"], { bg: string; text: string; icon: typeof TrendingUp | null }> = {
  target: { bg: "bg-success/15 border-success/40", text: "text-success", icon: TrendingUp },
  breakout: { bg: "bg-success/15 border-success/40", text: "text-success", icon: TrendingUp },
  sleeper: { bg: "bg-primary/15 border-primary/40", text: "text-primary", icon: Sparkles },
  value: { bg: "bg-primary/15 border-primary/40", text: "text-primary", icon: TrendingUp },
  fade: { bg: "bg-warning/15 border-warning/40", text: "text-warning", icon: TrendingDown },
  avoid: { bg: "bg-destructive/15 border-destructive/40", text: "text-destructive", icon: TrendingDown },
  neutral: { bg: "bg-secondary/40 border-border", text: "text-muted-foreground", icon: null },
};

interface Props {
  onTakesUpdate?: (takes: VetriTake[]) => void;
  onLoadPlayer?: (name: string, position: Position) => void;
}

export default function VetriNotesPanel({ onTakesUpdate, onLoadPlayer }: Props) {
  const [notes, setNotes] = useState<VetriNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vetri_notes")
      .select("id, video_id, title, url, published_at, summary, takes, positions, status, error, updated_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(8);
    if (error) {
      console.error(error);
    } else if (data) {
      const list = data as unknown as VetriNote[];
      setNotes(list);
      // Bubble up flat take list for coach injection
      const allTakes = list.filter((n) => n.status === "ready").flatMap((n) => n.takes ?? []);
      onTakesUpdate?.(allTakes);
    }
    setLoading(false);
  }, [onTakesUpdate]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const refresh = async (force = false) => {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${REFRESH_URL}?max=5${force ? "&force=1" : ""}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limited. Try again shortly.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Vetri sync failed.");
        return;
      }
      const json = await resp.json();
      const ready = (json.results ?? []).filter((r: any) => r.status === "ready").length;
      const skipped = (json.results ?? []).filter((r: any) => r.status === "skipped").length;
      const failed = (json.results ?? []).filter((r: any) => r.status === "failed" || r.status === "no_transcript").length;
      toast.success(`Vetri sync · ${ready} new · ${skipped} cached · ${failed} skipped`);
      await loadNotes();
    } catch (e) {
      console.error(e);
      toast.error("Vetri sync error");
    } finally {
      setRefreshing(false);
    }
  };

  const totalTakes = notes.filter((n) => n.status === "ready").reduce((s, n) => s + (n.takes?.length ?? 0), 0);

  return (
    <Card className="bg-gradient-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Youtube className="h-3.5 w-3.5 text-destructive" /> Vetri Notes
            <span className="font-mono text-[9px] tracking-[0.2em] text-primary/80">— THE TAKE TAPE</span>
          </h2>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {totalTakes} takes from {notes.filter((n) => n.status === "ready").length} videos · feeds the coach
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refresh(false)}
          disabled={refreshing}
          className="h-7 gap-1 px-2 text-[10px]"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Syncing" : notes.length ? "Refresh" : "Pull videos"}
        </Button>
      </div>

      {loading && !notes.length && (
        <p className="py-4 text-center font-mono text-[11px] text-muted-foreground">Loading…</p>
      )}

      {!loading && !notes.length && (
        <p className="py-4 text-center font-mono text-[11px] text-muted-foreground">
          No notes yet. Click "Pull videos" to fetch Sal's latest 5 uploads.
        </p>
      )}

      <div className="space-y-1.5">
        {notes.map((n) => {
          const isOpen = expanded === n.video_id;
          const ready = n.status === "ready";
          const dateStr = n.published_at ? new Date(n.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
          return (
            <div key={n.id} className="rounded-md border border-border bg-card/60">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : n.video_id)}
                className="flex w-full items-start justify-between gap-2 px-2.5 py-2 text-left transition hover:bg-secondary/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{n.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-muted-foreground">
                    {dateStr && <span>{dateStr}</span>}
                    {ready && <span className="text-primary">{n.takes?.length ?? 0} takes</span>}
                    {!ready && (
                      <span className={n.status === "no_transcript" ? "text-warning" : n.status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                        {n.status === "processing" ? "processing…" : n.status === "no_transcript" ? "no captions" : n.status === "failed" ? "failed" : n.status}
                      </span>
                    )}
                    {n.positions?.length > 0 && (
                      <span className="opacity-70">· {n.positions.join(" ")}</span>
                    )}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </button>

              {isOpen && (
                <div className="space-y-2 border-t border-border/50 px-2.5 py-2">
                  {n.summary && (
                    <p className="text-[11px] italic leading-snug text-foreground/80">{n.summary}</p>
                  )}
                  {ready && n.takes?.length > 0 && (
                    <div className="space-y-1">
                      {n.takes.map((t, idx) => {
                        const tone = LEAN_TONE[t.lean] ?? LEAN_TONE.neutral;
                        const Icon = tone.icon;
                        return (
                          <div key={idx} className={`flex items-start gap-2 rounded-sm border ${tone.bg} px-2 py-1.5`}>
                            <Badge variant="outline" className={`${POS_COLORS[t.position]} px-1.5 py-0 text-[9px]`}>
                              {t.position}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-[12px] font-semibold text-foreground">{t.player}</span>
                                <span className={`flex items-center gap-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${tone.text}`}>
                                  {Icon && <Icon className="h-2.5 w-2.5" />}
                                  {t.lean}
                                </span>
                                {t.tier && (
                                  <span className="font-mono text-[9px] text-muted-foreground">· {t.tier}</span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[10px] leading-snug text-foreground/75">{t.reasoning}</p>
                            </div>
                            {onLoadPlayer && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 shrink-0 px-1.5 text-[9px]"
                                onClick={(e) => { e.stopPropagation(); onLoadPlayer(t.player, t.position); }}
                              >
                                Load
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {n.status === "no_transcript" && (
                    <p className="text-[10px] text-warning">YouTube didn't expose captions for this video.</p>
                  )}
                  {n.status === "failed" && n.error && (
                    <p className="text-[10px] text-destructive">{n.error}</p>
                  )}
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[9px] text-primary hover:underline"
                  >
                    Watch on YouTube <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
