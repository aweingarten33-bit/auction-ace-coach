import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDraftStore } from "@/lib/draft-store";
import { Position } from "@/lib/draft-types";
import { toast } from "sonner";

export type EspnSyncStatus =
  | "disabled"   // no auth / not connected
  | "connecting"
  | "live"       // recent activity within window
  | "idle"       // connected, no recent events (normal between picks)
  | "stale"      // expected events but channel quiet too long
  | "offline";   // realtime channel error / disconnected

const STALE_AFTER_MS = 90_000; // 90s without any event after first sync = stale

interface Options {
  /** Set true once user clicks "I'm drafting" or similar; controls stale detection. */
  expectingEvents?: boolean;
}

/**
 * Subscribes to live_draft_events from the connected ESPN session and
 * automatically inserts won-pick events into the local draft store.
 *
 * If realtime drops or no events arrive within STALE_AFTER_MS while the
 * user is actively drafting, status flips to "stale"/"offline" so the UI
 * can prompt the user to fall back to manual entry (which always works).
 */
export function useEspnLiveSync({ expectingEvents = true }: Options = {}) {
  const [status, setStatus] = useState<EspnSyncStatus>("connecting");
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const addEvent = useDraftStore((s) => s.addEvent);
  const events = useDraftStore((s) => s.events);

  // Track existing events to dedupe against incoming webhook picks
  const eventSig = useRef<Set<string>>(new Set());
  useEffect(() => {
    eventSig.current = new Set(
      events.map((e) => `${e.player.toLowerCase()}|${e.price}`)
    );
  }, [events]);

  // Resolve user — if no auth session, sync is disabled (manual mode only)
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

  // Subscribe to realtime won-pick events for this user
  useEffect(() => {
    if (!userId) return;
    setStatus("idle");

    const channel = supabase
      .channel(`live_draft:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_draft_events",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row: any = payload.new;
          if (!row || seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);
          setLastEventAt(Date.now());
          setStatus("live");

          // Only auto-insert "won" picks into the local draft log.
          if (row.event_type !== "won" || !row.player_name || !row.price) return;
          const sig = `${String(row.player_name).toLowerCase()}|${row.price}`;
          if (eventSig.current.has(sig)) return; // already logged manually

          addEvent({
            id: row.id,
            player: row.player_name,
            position: (row.player_position as Position) || undefined,
            price: Number(row.price) || 0,
            // Webhook doesn't reliably know "me" vs "other"; default other.
            // User can correct via undo if needed.
            drafter: "other",
            ts: new Date(row.occurred_at || row.created_at || Date.now()).getTime(),
          });
          toast.success(`ESPN: ${row.player_name} → $${row.price}`, { duration: 2500 });
        }
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus((cur) => (cur === "live" ? cur : "idle"));
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addEvent]);

  // Stale detection: if drafting actively and no events for STALE window, flag stale
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

  return { status, lastEventAt, isManualOnly: status !== "live" && status !== "idle" };
}
