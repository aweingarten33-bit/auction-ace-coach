import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, Eye, EyeOff, RefreshCw, Shield } from "lucide-react";
import ConnectorStatus from "@/components/ConnectorStatus";

interface League { leagueId: number; leagueName: string; teamId: number; teamName: string; seasonId: number; }

export default function EspnSettings() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [swid, setSwid] = useState("");
  const [s2, setS2] = useState("");
  const [season, setSeason] = useState(new Date().getFullYear());
  const [showS2, setShowS2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selected, setSelected] = useState<League | null>(null);
  const [token, setToken] = useState<string>("");
  const [verified, setVerified] = useState<string | null>(null);

  // Load existing
  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("espn_credentials")
        .select("swid, espn_s2, season_id, league_id, team_id, last_verified_at")
        .maybeSingle();
      if (c) {
        setSwid(c.swid); setS2(c.espn_s2);
        if (c.season_id) setSeason(c.season_id);
        setVerified(c.last_verified_at);
      }
      const { data: t } = await supabase
        .from("extension_tokens").select("token").maybeSingle();
      if (t) setToken(t.token);
    })();
  }, []);

  const connect = async () => {
    if (!swid || !s2) return toast.error("Both cookies required");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("espn-connect", {
      body: { swid, espn_s2: s2, season },
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "Failed");
      return;
    }
    setLeagues(data.leagues ?? []);
    setVerified(new Date().toISOString());
    toast.success(`Found ${data.leagues?.length ?? 0} league(s)`);
  };

  const pickLeague = async (lg: League) => {
    setSelected(lg);
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("espn-connect", {
      body: { swid, espn_s2: s2, season, league_id: lg.leagueId, team_id: lg.teamId },
    });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Failed");
    toast.success(`Selected: ${lg.leagueName}`);
  };

  const sync = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("espn-sync", {});
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Sync failed");
    toast.success(`Synced ${data.teams?.length ?? 0} teams from ${data.league?.name}`);
  };

  const syncHistory = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("espn-historical-draft", {
      body: { seasonsBack: 3 },
    });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "History sync failed");
    const ok = (data.summary ?? []).filter((s: any) => s.status === "ok");
    const skipped = (data.summary ?? []).filter((s: any) => s.status !== "ok");
    const totalPicks = ok.reduce((s: number, x: any) => s + x.picks, 0);
    toast.success(`Pulled ${totalPicks} picks across ${ok.length} season(s)${skipped.length ? ` · ${skipped.length} skipped` : ""}`);
  };

  const syncRanks = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("espn-player-ranks", {});
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Rank sync failed");
    toast.success(`Cached ${data.upserted} player ranks`);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    toast.success("Token copied");
  };

  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/draft-webhook`;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {user?.email}
          <Button size="sm" variant="ghost" onClick={() => { signOut(); nav("/auth"); }}>Sign out</Button>
        </div>
      </div>

      <h1 className="mb-1 text-2xl font-bold">ESPN Connection</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Two paths to live data: paste cookies for league import, install the extension for live draft sync.
      </p>

      <div className="mb-6">
        <ConnectorStatus />
      </div>

      {/* Path A */}
      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">Path A</Badge>
          <h2 className="font-semibold">League import via cookies</h2>
          {verified && <span className="ml-auto text-[10px] text-success">✓ verified {new Date(verified).toLocaleString()}</span>}
        </div>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Log into <code className="rounded bg-secondary px-1">fantasy.espn.com</code> in Chrome</li>
          <li>DevTools (F12) → Application → Cookies → <code className="rounded bg-secondary px-1">espn.com</code></li>
          <li>Copy <code>SWID</code> (with the curly braces) and <code>espn_s2</code></li>
          <li>Paste below — we encrypt them and only call ESPN on your behalf</li>
        </ol>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">SWID</Label>
            <Input value={swid} onChange={(e) => setSwid(e.target.value)} placeholder="{XXXX-XXXX-XXXX-XXXX}" className="font-mono text-xs" />
          </div>
          <div>
            <Label className="text-xs">Season</Label>
            <Input type="number" value={season} onChange={(e) => setSeason(Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">espn_s2</Label>
            <div className="relative">
              <Textarea
                value={s2}
                onChange={(e) => setS2(e.target.value)}
                rows={3}
                className={`font-mono text-[10px] ${showS2 ? "" : "[-webkit-text-security:disc]"}`}
                placeholder="long base64 string..."
              />
              <Button size="sm" variant="ghost" className="absolute right-1 top-1 h-6 w-6 p-0" onClick={() => setShowS2((v) => !v)}>
                {showS2 ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button onClick={connect} disabled={busy}>
            <Shield className="mr-1 h-3.5 w-3.5" /> Verify & list leagues
          </Button>
          {selected && (
            <>
              <Button variant="outline" onClick={sync} disabled={busy}>
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Sync league now
              </Button>
              <Button variant="outline" onClick={syncHistory} disabled={busy}>
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Pull last 3 auctions
              </Button>
            </>
          )}
        </div>

        {leagues.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs">Pick your league</Label>
            {leagues.map((lg) => (
              <button
                key={`${lg.leagueId}-${lg.teamId}`}
                onClick={() => pickLeague(lg)}
                className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  selected?.leagueId === lg.leagueId
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/40 hover:border-primary/40"
                }`}
              >
                <div className="font-semibold">{lg.leagueName}</div>
                <div className="text-[10px] text-muted-foreground">
                  Your team: {lg.teamName} · ID {lg.leagueId} · {lg.seasonId}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Path B */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">Path B</Badge>
          <h2 className="font-semibold">Live draft sync via Chrome extension</h2>
        </div>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Download the extension below</li>
          <li>Unzip → open <code className="rounded bg-secondary px-1">chrome://extensions</code> → enable Developer mode → "Load unpacked"</li>
          <li>Open the extension popup, paste your token below</li>
          <li>Open your ESPN draft room — picks and live bids stream into this app automatically</li>
        </ol>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Your extension token (keep secret)</Label>
            <div className="flex gap-2">
              <Input readOnly value={token} className="font-mono text-[10px]" />
              <Button size="sm" variant="outline" onClick={copyToken}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Webhook URL (already wired into the extension)</Label>
            <Input readOnly value={webhookUrl} className="font-mono text-[10px]" />
          </div>
          <Button onClick={() => downloadExtension()}>
            <Download className="mr-1 h-3.5 w-3.5" /> Download Chrome extension (.zip)
          </Button>
        </div>
      </Card>
    </div>
  );
}

function downloadExtension() {
  fetch("/auction-coach-extension.zip")
    .then((r) => { if (!r.ok) throw new Error(`Download failed: ${r.status}`); return r.blob(); })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "auction-coach-extension.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((e) => toast.error(e.message));
}
