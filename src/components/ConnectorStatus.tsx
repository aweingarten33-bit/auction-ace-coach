import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, WifiOff } from "lucide-react";

interface CredRow {
  last_verified_at: string | null;
  league_id: number | null;
  season_id: number | null;
  team_id: number | null;
}
interface TokenRow { last_used_at: string | null; }
interface EventRow {
  id: string;
  created_at: string;
  occurred_at: string;
  source: string;
  event_type: string;
  player_name: string | null;
  price: number | null;
  raw: any;
}
interface LeagueInfo { name?: string; id?: number; season?: number; }

interface ParseError { ts: string; reason: string; raw?: any; }

function ago(iso?: string | null) {
  if (!iso) return "never";
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

/**
 * Connector status / debug panel.
 *
 * Surfaces, in plain language:
 *  - Last successful cookie verification (Path A)
 *  - Last extension webhook ping (Path B)
 *  - Currently detected ESPN league + season + team
 *  - Recent parse errors (events the webhook stored with raw.error or unknown shape)
 */
export default function ConnectorStatus() {
  const navigate = useNavigate();
  const [cred, setCred] = useState<CredRow | null>(null);
  const [token, setToken] = useState<TokenRow | null>(null);
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [recent, setRecent] = useState<EventRow[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [loading, setLoading] = useState(false);
  const [reverifying, setReverifying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: c }, { data: t }, { data: ev }] = await Promise.all([
        supabase
          .from("espn_credentials")
          .select("last_verified_at, league_id, season_id, team_id")
          .maybeSingle(),
        supabase.from("extension_tokens").select("last_used_at").maybeSingle(),
        supabase
          .from("live_draft_events")
          .select("id, created_at, occurred_at, source, event_type, player_name, price, raw")
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
      setCred(c as CredRow | null);
      setToken(t as TokenRow | null);
      setRecent((ev as EventRow[]) ?? []);

      // Try to derive league name from the most recent event raw payload, falling back to ID
      const fromEvt = (ev ?? []).find((r: any) => r?.raw?.league?.name) as any;
      if (c?.league_id) {
        setLeague({
          name: fromEvt?.raw?.league?.name as string | undefined,
          id: c.league_id,
          season: c.season_id ?? undefined,
        });
      } else {
        setLeague(null);
      }

      // Parse errors: events whose raw payload includes an explicit error,
      // or whose required fields are missing for their type.
      const errs: ParseError[] = [];
      for (const r of (ev as EventRow[]) ?? []) {
        if (r.raw && typeof r.raw === "object" && "error" in r.raw) {
          errs.push({ ts: r.created_at, reason: String((r.raw as any).error), raw: r.raw });
          continue;
        }
        if ((r.event_type === "won" || r.event_type === "bid") && (!r.player_name || r.price == null)) {
          errs.push({
            ts: r.created_at,
            reason: `Missing ${!r.player_name ? "player name" : "price"} on ${r.event_type} event`,
            raw: r.raw,
          });
        }
      }
      setErrors(errs.slice(0, 8));
    } finally {
      setLoading(false);
    }
  };

  const reverify = async () => {
    setReverifying(true);
    const { data: c } = await supabase
      .from("espn_credentials")
      .select("swid, espn_s2, season_id")
      .maybeSingle();
    if (!c?.swid || !c?.espn_s2) {
      setReverifying(false);
      navigate("/espn");
      return;
    }
    const { data, error } = await supabase.functions.invoke("espn-connect", {
      body: { swid: c.swid, espn_s2: c.espn_s2, season: c.season_id ?? new Date().getFullYear(), save: false },
    });
    setReverifying(false);
    if (error || data?.error) {
      toast.error("ESPN session expired — copy fresh cookies from your browser, then go to ESPN Settings.");
      navigate("/espn");
    } else {
      await supabase
        .from("espn_credentials")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("swid", c.swid);
      toast.success("ESPN connection verified");
      load();
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const cookieOk = !!cred?.last_verified_at;
  const extOk = !!token?.last_used_at && Date.now() - new Date(token.last_used_at).getTime() < 10 * 60_000;
  const lastEvent = recent[0];
  const anyOk = cookieOk || extOk;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-muted-foreground/40">Debug</Badge>
          <h2 className="font-semibold">Connector status</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Top-level health row */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <StatusRow
            ok={cookieOk}
            label="ESPN cookies (Path A)"
            detail={
              cookieOk
                ? `Last verified ${ago(cred?.last_verified_at)}`
                : "Not connected — paste SWID + espn_s2 above"
            }
          />
          {cookieOk && (
            <button
              onClick={reverify}
              disabled={reverifying}
              className="absolute right-2 top-2 text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {reverifying ? "Verifying…" : "Re-verify"}
            </button>
          )}
        </div>
        <StatusRow
          ok={extOk}
          label="Chrome extension (Path B)"
          detail={
            token?.last_used_at
              ? `Last ping ${ago(token.last_used_at)}${extOk ? "" : " — looks idle/offline"}`
              : "Extension has never reported in"
          }
        />
      </div>

      {/* Detected league */}
      <div className="mb-4 rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Detected league
        </div>
        {league ? (
          <div className="mt-0.5 text-sm">
            <span className="font-semibold">{league.name ?? `League #${league.id}`}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              ID {league.id}{league.season ? ` · ${league.season}` : ""}
              {cred?.team_id ? ` · team ${cred.team_id}` : ""}
            </span>
          </div>
        ) : (
          <div className="mt-0.5 text-xs text-muted-foreground">
            No league selected yet — verify cookies and pick one above.
          </div>
        )}
      </div>

      {/* Last event */}
      <div className="mb-4 rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Last sync activity
        </div>
        {lastEvent ? (
          <div className="mt-0.5 flex items-center justify-between text-sm">
            <span className="truncate">
              <span className="font-medium">{lastEvent.event_type}</span>
              {lastEvent.player_name ? ` · ${lastEvent.player_name}` : ""}
              {lastEvent.price != null ? ` · $${lastEvent.price}` : ""}
              <span className="ml-2 text-[10px] text-muted-foreground">via {lastEvent.source}</span>
            </span>
            <span className="text-xs text-muted-foreground">{ago(lastEvent.created_at)}</span>
          </div>
        ) : (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {anyOk
              ? "Connected, but no draft events have arrived yet."
              : "No data yet — connect a path above."}
          </div>
        )}
      </div>

      {/* Parse errors (plain-language) */}
      <div>
        <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <AlertTriangle className="h-3 w-3" /> Parsing errors
          <span className="ml-auto text-muted-foreground/70">
            {errors.length ? `${errors.length} recent` : "none"}
          </span>
        </div>
        {errors.length === 0 ? (
          <div className="rounded-md border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
            No parsing problems in the last 25 events. If picks aren't appearing, check that the
            extension popup shows "connected" and that your ESPN draft tab is open.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {errors.map((e, i) => (
              <li
                key={i}
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-destructive">{humanize(e.reason)}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{ago(e.ts)}</span>
                </div>
                {e.raw && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                      Raw payload
                    </summary>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-background/60 p-2 text-[10px] leading-tight">
                      {JSON.stringify(e.raw, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  const Icon = ok ? CheckCircle2 : WifiOff;
  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 ${
        ok ? "border-primary/30 bg-primary/5" : "border-border/60 bg-secondary/30"
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 ${ok ? "text-primary" : "text-muted-foreground"}`} />
      <div className="min-w-0">
        <div className="text-xs font-semibold">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

/** Translate raw error strings into something a non-engineer can act on. */
function humanize(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("missing player name")) return "Pick arrived with no player name attached.";
  if (r.includes("missing price")) return "Pick arrived with no winning bid amount.";
  if (r.includes("401") || r.includes("unauthorized")) return "ESPN rejected your cookies — re-paste SWID + espn_s2.";
  if (r.includes("token")) return "Extension token mismatch — re-copy it from this page.";
  if (r.includes("timeout")) return "ESPN took too long to respond. We'll retry.";
  if (r.includes("schema") || r.includes("parse")) return "ESPN returned an unexpected shape — likely a UI change on their side.";
  return reason;
}
