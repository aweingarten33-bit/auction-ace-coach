// Compact ESPN + snapshot freshness indicator.
// Shows two pills: (1) ESPN connection, (2) league snapshot / ranks freshness.
// Tapping either jumps to /espn so the commissioner can re-sync.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, WifiOff, RefreshCw } from "lucide-react";

type Health = "ok" | "stale" | "missing";

interface State {
  espn: Health;
  espnDetail: string;
  snap: Health;
  snapDetail: string;
  loading: boolean;
}

function ago(iso?: string | null) {
  if (!iso) return "never";
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const STALE_HOURS = 24;

export default function SyncStatusPill({ compact = false }: { compact?: boolean }) {
  const [s, setS] = useState<State>({
    espn: "missing", espnDetail: "Checking…",
    snap: "missing", snapDetail: "Checking…",
    loading: true,
  });

  const load = async () => {
    setS((p) => ({ ...p, loading: true }));
    const [{ data: cred }, snapRes, ranksRes] = await Promise.all([
      supabase
        .from("espn_credentials")
        .select("last_verified_at, league_id")
        .maybeSingle(),
      supabase.functions.invoke("league-teams"),
      supabase
        .from("espn_player_ranks")
        .select("updated_at", { count: "exact", head: false })
        .order("updated_at", { ascending: false })
        .limit(1),
    ]);

    // ESPN connection
    let espn: Health = "missing";
    let espnDetail = "Not connected";
    if (cred?.last_verified_at) {
      const hrs = (Date.now() - new Date(cred.last_verified_at).getTime()) / 3_600_000;
      espn = hrs > 24 * 14 ? "stale" : "ok";
      espnDetail = `ESPN verified ${ago(cred.last_verified_at)}`;
    }

    // Snapshot freshness — combine league snapshot + ranks
    const snapData = (snapRes.data ?? {}) as { league?: { synced_at?: string } | null; empty?: boolean };
    const lastSnap = snapData.league?.synced_at;
    const lastRank = (ranksRes.data ?? [])[0]?.updated_at as string | undefined;
    const newest = [lastSnap, lastRank].filter(Boolean).sort().slice(-1)[0];

    let snap: Health = "missing";
    let snapDetail = "Never synced";
    if (snapData.empty && !lastRank) {
      snap = "missing";
      snapDetail = "No league synced yet";
    } else if (!newest) {
      snap = "missing";
      snapDetail = "No data yet";
    } else {
      const hrs = (Date.now() - new Date(newest).getTime()) / 3_600_000;
      snap = hrs > STALE_HOURS ? "stale" : "ok";
      const parts: string[] = [];
      if (lastSnap) parts.push(`teams ${ago(lastSnap)}`);
      if (lastRank) parts.push(`ranks ${ago(lastRank)}`);
      snapDetail = parts.join(" · ") || `synced ${ago(newest)}`;
    }

    setS({ espn, espnDetail, snap, snapDetail, loading: false });
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link
      to="/espn"
      className={`flex items-center gap-1.5 ${compact ? "text-[10px]" : "text-[11px]"} hover:opacity-80`}
      title="Open ESPN connection"
    >
      <Pill health={s.espn} label="ESPN" detail={s.espnDetail} compact={compact} />
      <Pill health={s.snap} label="Data" detail={s.snapDetail} compact={compact} />
      {s.loading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
    </Link>
  );
}

function Pill({
  health, label, detail, compact,
}: { health: Health; label: string; detail: string; compact: boolean }) {
  const cfg = {
    ok:      { Icon: CheckCircle2,  cls: "border-success/40 bg-success/10 text-success" },
    stale:   { Icon: AlertTriangle, cls: "border-warning/40 bg-warning/10 text-warning" },
    missing: { Icon: WifiOff,       cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  }[health];
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 leading-none ${cfg.cls}`}
      title={detail}
    >
      <Icon className="h-2.5 w-2.5" />
      <span className="font-semibold">{label}</span>
      {!compact && <span className="font-normal opacity-80">· {detail}</span>}
    </span>
  );
}
