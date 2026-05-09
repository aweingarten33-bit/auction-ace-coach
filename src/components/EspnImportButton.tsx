import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useDraftStore } from "@/lib/draft-store";
import { Keeper, LeagueType, Position, RosterSlots, Scoring } from "@/lib/draft-types";
import { toast } from "sonner";
import { Download, Loader2, CheckCircle2, Link2, ExternalLink } from "lucide-react";

/**
 * ESPN slot IDs → our roster keys.
 * 0=QB, 2=RB, 4=WR, 6=TE, 16=DST, 17=K, 23=FLEX (RB/WR/TE),
 * 7=OP / Superflex, 20=BENCH, 21=IR (skipped).
 */
const SLOT_MAP: Record<number, keyof RosterSlots> = {
  0: "QB", 2: "RB", 4: "WR", 6: "TE", 16: "DST", 17: "K",
  23: "FLEX", 7: "SUPERFLEX", 20: "BENCH",
};

interface Imported {
  budget: number;
  numTeams: number;
  scoring: Scoring | null;
  leagueType: LeagueType;
  roster: RosterSlots;
  leagueName?: string;
  keepers: Keeper[];
}

function mapRoster(slots: Record<string, number>): RosterSlots {
  const r: RosterSlots = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPERFLEX: 0, K: 0, DST: 0, BENCH: 0 };
  for (const [id, count] of Object.entries(slots)) {
    const key = SLOT_MAP[Number(id)];
    if (key) r[key] += Number(count) || 0;
  }
  return r;
}

/**
 * One-click "Import from ESPN" button.
 * Calls espn-sync, normalizes the response into our LeagueSettings shape,
 * shows a confirmation card with the diff, and applies on accept.
 */
export default function EspnImportButton({ autoApply = false }: { autoApply?: boolean } = {}) {
  const { setSettings, setRoster, setKeepers } = useDraftStore();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Imported | null>(null);
  const [autoApplied, setAutoApplied] = useState(false);
  const [autoLeagueName, setAutoLeagueName] = useState<string | null>(null);

  const fetchEspn = async (silent = false) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("espn-sync", {});
      if (error || data?.error) {
        if (!silent) toast.error(data?.error ?? error?.message ?? "ESPN sync failed");
        return null;
      }
      const lg = data.league;
      const roster = mapRoster(lg.rosterSlots ?? {});
      const leagueType: LeagueType =
        roster.SUPERFLEX > 0 ? "Superflex" : roster.QB >= 2 ? "2QB" : "Standard";

      const importedKeepers: Keeper[] = (data.keepers ?? []).map(
        (k: { name: string; position: string | null; cost: number; playerId: number }) => ({
          id: `espn-${k.playerId}`,
          player: k.name,
          position: (k.position as Position) || undefined,
          cost: Number(k.cost) || 0,
        }),
      );

      const imported: Imported = {
        budget: lg.budget ?? 200,
        numTeams: lg.size ?? data.teams?.length ?? 12,
        scoring: (lg.scoring as Scoring | null) ?? null,
        leagueType,
        roster,
        leagueName: lg.name,
        keepers: importedKeepers,
      };
      if (!silent) setPreview(imported);
      return imported;
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Failed to import");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const applyImported = (imported: Imported) => {
    setSettings({
      totalBudget: imported.budget,
      numTeams: imported.numTeams,
      ...(imported.scoring ? { scoring: imported.scoring } : {}),
      leagueType: imported.leagueType,
    });
    (Object.keys(imported.roster) as (keyof RosterSlots)[]).forEach((k) =>
      setRoster(k, imported.roster[k])
    );
    if (imported.keepers.length) setKeepers(imported.keepers);
  };

  // Auto-pull on mount when caller opts in (used by SetupWizard)
  useEffect(() => {
    if (!autoApply || autoApplied) return;
    let cancelled = false;
    (async () => {
      const imported = await fetchEspn(true);
      if (cancelled || !imported) return;
      applyImported(imported);
      setAutoApplied(true);
      setAutoLeagueName(imported.leagueName ?? null);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApply]);

  const apply = () => {
    if (!preview) return;
    setSettings({
      totalBudget: preview.budget,
      numTeams: preview.numTeams,
      ...(preview.scoring ? { scoring: preview.scoring } : {}),
      leagueType: preview.leagueType,
    });
    (Object.keys(preview.roster) as (keyof RosterSlots)[]).forEach((k) =>
      setRoster(k, preview.roster[k])
    );
    if (preview.keepers.length) setKeepers(preview.keepers);
    toast.success(
      preview.keepers.length
        ? `League settings + ${preview.keepers.length} keepers imported`
        : "League settings imported from ESPN",
    );
    setPreview(null);
  };

  return (
    <div className="space-y-2">
      {!preview && (
        <Button onClick={fetchEspn} disabled={busy} variant="outline" size="sm" className="w-full">
          {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
          Auto-fill from ESPN
        </Button>
      )}

      {preview && (
        <Card className="border-primary/40 bg-primary/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Pulled from ESPN</span>
            {preview.leagueName && (
              <Badge variant="outline" className="text-[10px]">{preview.leagueName}</Badge>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <Row label="Budget" value={`$${preview.budget}`} />
            <Row label="Teams" value={String(preview.numTeams)} />
            <Row label="Scoring" value={preview.scoring ?? "couldn't detect"} />
            <Row label="Type" value={preview.leagueType} />
            <Row label="QB" value={String(preview.roster.QB)} />
            <Row label="RB" value={String(preview.roster.RB)} />
            <Row label="WR" value={String(preview.roster.WR)} />
            <Row label="TE" value={String(preview.roster.TE)} />
            <Row label="FLEX" value={String(preview.roster.FLEX)} />
            {preview.roster.SUPERFLEX > 0 && <Row label="SF" value={String(preview.roster.SUPERFLEX)} />}
            <Row label="K" value={String(preview.roster.K)} />
            <Row label="DST" value={String(preview.roster.DST)} />
            <Row label="Bench" value={String(preview.roster.BENCH)} />
          </dl>
          {preview.keepers.length > 0 && (
            <div className="mt-2 rounded border border-border/60 bg-secondary/20 p-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Keepers ({preview.keepers.length})
              </p>
              <ul className="space-y-0.5 text-[11px]">
                {preview.keepers.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{k.player}{k.position ? ` · ${k.position}` : ""}</span>
                    <span className="font-mono tabular-nums">${k.cost}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={apply} className="flex-1">Confirm & apply</Button>
            <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}
