import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";

interface Player { rank: number; name: string; position: string; team: string; }
interface RankList { source: string; label: string; position: string; url: string; players: Player[]; }

export default function FantasyLifeFeed() {
  const [lists, setLists] = useState<RankList[]>([]);
  const [active, setActive] = useState<string>("top50");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke("fantasy-life-rankings", {});
    if (error || (data as any)?.error) {
      setErr((data as any)?.error ?? error?.message ?? "Failed to load");
      setLoading(false);
      return;
    }
    setLists((data as any)?.lists ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const list = lists.find((l) => l.source === active) ?? lists[0];
  const players = list?.players ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">FantasyLife rankings</p>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 px-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
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
              {l.label} {l.players.length > 0 && (
                <span className="ml-1 opacity-60">{l.players.length}</span>
              )}
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

      {list?.url && (
        <a
          href={list.url}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-[10px] text-muted-foreground underline-offset-2 hover:underline"
        >
          source: fantasylife.com
        </a>
      )}
    </div>
  );
}
