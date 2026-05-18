import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDraftStore } from "@/lib/draft-store";
import { Position } from "@/lib/draft-types";
import { toast } from "sonner";

export type EspnSyncStatus =
  | "disabled"
  | "connecting"
  | "live"
  | "idle"
  | "stale"
  | "offline";

export interface LiveBid {
  player: string;
  position?: Position;
  team?: string;
  price: number;          // current top bid
  bidder?: string;        // drafter team name
  nominatedAt: number;
  updatedAt: number;
}

const STALE_AFTER_MS = 90_000;

interface Options {
  expectingEvents?: boolean;
  /** Optional override — when set, treat picks by this ESPN team_id as "me" */
  teamIdOverride?: number | null;
}

/**
 * Subscribes to live_draft_events and:
 *  - Backfills recent "won" picks into the local draft log on mount
 *  - Auto-inserts new "won" picks as they arrive (deduped vs manual entries)
 *  - Tracks the *current* nomination + climbing bid so the UI can render
 *    a live bidding-war strip without polluting the draft log
 */
export function useEspnLiveSync({ expectingEvents = true, teamIdOverride = null }: Options = {}) {
  const [status, setStatus] = useState<EspnSyncStatus>("connecting");
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [liveBid, setLiveBid] = useState<LiveBid | null>(null);
  // Your ESPN team_id for the current season. Used to auto-tag incoming
  // "won" events as YOUR picks (drafter: "me") so the budget math, targets,
  // and decision engine all work without you logging anything by hand.
  const [myTeamId, setMyTeamId] = useState<number | null>(null);
  const [leagueId, setLeagueId] = useState<number | null>(null);

  const seenIds = useRef<Set<string>>(new Set());
  const addEvent = useDraftStore((s) => s.addEvent);
  const events = useDraftStore((s) => s.events);

  // Dedupe signature: player|price already in local store
  const eventSig = useRef<Set<string>>(new Set());
  useEffect(() => {
    eventSig.current = new Set(events.map((e) => `${e.player.toLowerCase()}|${e.price}`));
  }, [events]);

  // Resolve auth user
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) setStatus("disabled");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) setStatus("disabled");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Pull our ESPN team_id once we know the user. This is what we compare
  // against incoming `drafter_team_id` to decide if a pick was ours.
  useEffect(() => {
    // Override wins — visitor explicitly picked their team in the front-door.
    if (typeof teamIdOverride === "number") {
      setMyTeamId(teamIdOverride);
      return;
    }
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("espn_credentials")
      .select("team_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setMyTeamId(typeof data?.team_id === "number" ? data.team_id : null);
      });
    supabase
      .from("profiles")
      .select("league_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setLeagueId(typeof data?.league_id === "number" ? data.league_id : null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, teamIdOverride]);

  // Apply a single event row to local state (used for both backfill and realtime)
  const applyEvent = (row: any, fromBackfill = false) => {
    if (!row || seenIds.current.has(row.id)) return;
    seenIds.current.add(row.id);
    if (!fromBackfill) {
      setLastEventAt(Date.now());
      setStatus("live");
    }

    if (row.event_type === "won" && row.player_name && row.price != null) {
      const sig = `${String(row.player_name).toLowerCase()}|${row.price}`;
      if (!eventSig.current.has(sig)) {
        // Auto-tag YOUR picks based on team_id matching your ESPN team.
        // Without this, the app thinks every pick was "other" and your
        // remaining budget never moves.
        const isMine =
          myTeamId != null &&
          typeof row.drafter_team_id === "number" &&
          row.drafter_team_id === myTeamId;
        addEvent({
          id: row.id,
          player: row.player_name,
          position: (row.player_position as Position) || undefined,
          price: Number(row.price) || 0,
          drafter: isMine ? "me" : "other",
          ts: new Date(row.occurred_at || row.created_at || Date.now()).getTime(),
        });
        if (!fromBackfill) {
          toast.success(
            isMine
              ? `You won ${row.player_name} for $${row.price}`
              : `ESPN: ${row.player_name} → $${row.price}`,
            { duration: 2500 },
          );
        }
      }
      // Won → bidding war is over for that player
      setLiveBid((cur) => (cur && cur.player === row.player_name ? null : cur));
      return;
    }

    if (row.event_type === "nomination" && row.player_name) {
      setLiveBid({
        player: row.player_name,
        position: (row.player_position as Position) || undefined,
        team: row.player_team || undefined,
        price: Number(row.price) || 1,
        bidder: row.drafter_team_name || undefined,
        nominatedAt: new Date(row.occurred_at || row.created_at || Date.now()).getTime(),
        updatedAt: Date.now(),
      });
      return;
    }

    if (row.event_type === "bid" && row.player_name && row.price != null) {
      setLiveBid((cur) => {
        // If this bid is for a different player than the current nomination, replace it
        if (!cur || cur.player !== row.player_name) {
          return {
            player: row.player_name,
            position: (row.player_position as Position) || undefined,
            team: row.player_team || undefined,
            price: Number(row.price),
            bidder: row.drafter_team_name || undefined,
            nominatedAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
        // Only climb (ignore stale out-of-order bids)
        if (Number(row.price) <= cur.price) return cur;
        return {
          ...cur,
          price: Number(row.price),
          bidder: row.drafter_team_name || cur.bidder,
          updatedAt: Date.now(),
        };
      });
      return;
    }

    if (row.event_type === "undo") {
      // Conservative: just clear the bid card; user undoes log manually if needed
      setLiveBid(null);
    }
  };

  // Backfill + realtime subscription
  useEffect(() => {
    if (!userId || !leagueId) return;
    setStatus("idle");

    let cancelled = false;
    // Backfill last hour of events so picks/bids that arrived before mount appear
    (async () => {
      const since = new Date(Date.now() - 60 * 60_000).toISOString();
      const { data } = await supabase
        .from("live_draft_events")
        .select("id, event_type, player_name, player_position, player_team, price, drafter_team_name, drafter_team_id, occurred_at, created_at")
        .eq("league_id" as any, leagueId)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(500);
      if (cancelled || !data) return;
      for (const row of data) applyEvent(row, true);
      // After backfill, the most recent event time still drives staleness
      const last = data[data.length - 1];
      if (last) setLastEventAt(new Date(last.created_at as string).getTime());
    })();

    const channel = supabase
      .channel(`live_draft:league:${leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_draft_events",
          filter: `league_id=eq.${leagueId}`,
        },
        (payload) => applyEvent(payload.new),
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus((cur) => (cur === "live" ? cur : "idle"));
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, leagueId]);

  // Stale watchdog
  useEffect(() => {
    if (status === "disabled" || status === "offline") return;
    if (!expectingEvents) return;
    const id = setInterval(() => {
      if (lastEventAt && Date.now() - lastEventAt > STALE_AFTER_MS) {
        setStatus((cur) => (cur === "offline" || cur === "disabled" ? cur : "stale"));
      }
    }, 15_000);
    return () => clearInterval(id);
  }, [status, lastEventAt, expectingEvents]);

  // Auto-clear an idle bid card after 60s of no updates
  useEffect(() => {
    if (!liveBid) return;
    const id = setTimeout(() => {
      setLiveBid((cur) => (cur && Date.now() - cur.updatedAt > 60_000 ? null : cur));
    }, 65_000);
    return () => clearTimeout(id);
  }, [liveBid]);

  return {
    status,
    lastEventAt,
    liveBid,
    isManualOnly: status !== "live" && status !== "idle",
  };
}
