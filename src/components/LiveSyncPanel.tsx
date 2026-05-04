import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EspnSyncStatus } from "@/hooks/useEspnLiveSync";
import { Activity, ChevronDown, ChevronUp, Radio, Trash2 } from "lucide-react";

interface FeedRow {
  id: string;
  created_at: string;
  source: string;
  event_type: string;
  player_name: string | null;
  player_position: string | null;
  price: number | null;
  drafter_team_name: string | null;
}

interface Props {
  status: EspnSyncStatus;
  lastEventAt: number | null;
  /** Compact view (header pill style). Defaults to false (full card). */
  compact?: boolean;
}

const STATUS_COLOR: Record<EspnSyncStatus, string> = {
  live: "bg-primary text-primary-foreground",
  idle: "bg-secondary text-secondary-foreground",
  connecting: "bg-secondary text-muted-foreground",
  stale: "bg-amber-500 text-white",
  offline: "bg-destructive text-destructive-foreground",
  disabled: "bg-muted text-muted-foreground",
};

function ago(iso?: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

/**
 * Real-time sync panel: connection health pill, last-event timestamp,
 * and a rolling debug feed that updates as events stream in.
 */
export default function LiveSyncPanel({ status, lastEventAt, compact = false }: Props) {
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [open, setOpen] = useState(!compact);
  const [userId, setUserId] = useState<string | null>(null);
  const [, force] = useState(0);
  const seen = useRef<Set<string>>(new Set());

  // Tick every 5s so "ago" labels stay live
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setUserId(data.session?.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  // Backfill last 20 + subscribe
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("live_draft_events")
        .select("id, created_at, source, event_type, player_name, player_position, price, drafter_team_name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled || !data) return;
      seen.current = new Set(data.map((r) => r.id));
      setFeed(data as FeedRow[]);
    })();

    const channel = supabase
      .channel(`sync_panel:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_draft_events", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as FeedRow;
          if (seen.current.has(row.id)) return;
          seen.current.add(row.id);
          setFeed((f) => [row, ...f].slice(0, 30));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const clear = () => { setFeed([]); seen.current.clear(); };

  const healthLabel: Record<EspnSyncStatus, string> = {
    live: "Live", idle: "Connected", connecting: "Connecting…",
    stale: "Stale", offline: "Offline", disabled: "Manual only",
  };

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-secondary/40"
      >
        <Radio className={`h-3.5 w-3.5 ${status === "live" ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
        <span className="text-xs font-semibold">Real-time sync</span>
        <Badge className={`ml-1 px-1.5 py-0 text-[10px] ${STATUS_COLOR[status]}`}>
          {healthLabel[status]}
        </Badge>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          last event {lastEventAt ? ago(new Date(lastEventAt).toISOString()) : "never"}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/60">
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Event feed ({feed.length})</span>
            <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={clear} disabled={!feed.length}>
              <Trash2 className="mr-1 h-2.5 w-2.5" /> Clear
            </Button>
          </div>
          <div className="max-h-56 overflow-auto">
            {feed.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                No events yet. Open your ESPN draft tab — picks and bids will stream here.
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {feed.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                    <Badge
                      variant="outline"
                      className={`px-1 py-0 text-[9px] uppercase ${
                        r.event_type === "won" ? "border-primary/40 text-primary" :
                        r.event_type === "bid" ? "border-amber-500/40 text-amber-600" :
                        r.event_type === "nomination" ? "border-blue-500/40 text-blue-500" :
                        "border-border text-muted-foreground"
                      }`}
                    >
                      {r.event_type}
                    </Badge>
                    <span className="truncate font-medium">
                      {r.player_name ?? "(no player)"}
                    </span>
                    {r.player_position && (
                      <span className="text-[9px] text-muted-foreground">{r.player_position}</span>
                    )}
                    {r.price != null && <span className="font-mono text-primary">${r.price}</span>}
                    {r.drafter_team_name && (
                      <span className="truncate text-[9px] text-muted-foreground">· {r.drafter_team_name}</span>
                    )}
                    <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">
                      {ago(r.created_at)} · {r.source}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
