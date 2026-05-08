import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";

interface Player { rank: number; name: string; position: string; team: string; note?: string; }
interface RankList { source: string; label: string; position: string; url: string; players: Player[]; kind?: "ranking" | "sleeper"; }

const CACHE_KEY = "fl_rankings_cache_v2";

function readCache(): { lists: RankList[]; at: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function FantasyLifeFeed() {
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [lists, setLists] = useState<RankList[]>(cached?.lists ?? []);
  const [active, setActive] = useState<string>(cached?.lists?.[0]?.source ?? "qb");
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (force = false) => {
    if (force) setRefreshing(true); else if (lists.length === 0) setLoading(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke(
      `fantasy-life-rankings${force ? "?refresh=1" : ""}`,
      {},
    );
    if (error || (data as any)?.error) {
      setErr((data as any)?.error ?? error?.message ?? "Failed to load");
    } else {
      const newLists = ((data as any)?.lists ?? []) as RankList[];
      setLists(newLists);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ lists: newLists, at: Date.now() })); } catch { /* ignore */ }
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    // Serve cache instantly; only fetch if cache is empty or stale (>6h)
    const stale = !cached || Date.now() - cached.at > 6 * 60 * 60 * 1000;
    if (stale) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = lists.find((l) => l.source === active) ?? lists[0];
  const players = list?.players ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">FantasyLife rankings</p>
        <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={refreshing} className="h-7 px-2">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {lists.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lists.map((l) => (
            <Button
              key={l.source}
              size="sm"
              variant={l.source === active ? "default" : "outline"}
              onClick={() => setActive(l.source)}
              className="h-7 px-2 text-[11px]"
            >
              {l.label}
            </Button>
          ))}
        </div>
      )}

      {loading && lists.length === 0 && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {err && (
        <Card className="border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{err}</Card>
      )}

      <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
        {players.map((p) => (
          <div
            key={`${p.name}-${p.rank}`}
            className="flex items-center gap-2 rounded-md border border-border/40 bg-secondary/20 px-2 py-1.5"
          >
            <span className="w-6 text-right text-[11px] font-mono text-muted-foreground">{p.rank}</span>
            <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
            {p.position && <Badge variant="outline" className="text-[10px]">{p.position}</Badge>}
            <span className="w-9 text-right text-[10px] text-muted-foreground">{p.team}</span>
          </div>
        ))}
        {!loading && !err && players.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No players found in this list.</p>
        )}
      </div>
    </div>
  );
}
