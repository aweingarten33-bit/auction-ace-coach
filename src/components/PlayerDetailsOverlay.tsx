import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { POS_COLORS } from "@/lib/positions";
import { Position } from "@/lib/draft-types";
import {
  loadSleeperPlayers,
  findPlayerByName,
  byeWeekForTeam,
  SleeperPlayer,
} from "@/lib/sleeper";
import { useDraftStore } from "@/lib/draft-store";
import { buildPlannerSlots, type SlotGroup } from "@/lib/planner-slots";
import type { AnchorEntry } from "@/lib/decision-engine";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  position?: Position;
  leagueName?: string;
  sheetPrice?: number;
  anchor?: AnchorEntry;
  posRank?: number;
  totalAtPos?: number;
  overallRank?: number;
  remaining?: number;
  maxBid?: number;
  slotsLeft?: number;
  gaps?: unknown;
  matchPct?: number;
  reason?: string;
  dossier?: string;
  worstCase?: string;
  knockoff?: unknown;
  knockoffNote?: string;
  grade?: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function tierLabel(pos?: string, rank?: number): string | null {
  if (!pos || !rank) return null;
  const base = pos === "DST" ? "DEF" : pos;
  return `${base}${Math.ceil(rank / 12)}`;
}

function tierTone(rank?: number): string {
  if (!rank) return "border-border bg-secondary/40 text-muted-foreground";
  if (rank <= 12) return "border-success/50 bg-success/15 text-success";
  if (rank <= 24) return "border-primary/50 bg-primary/15 text-primary";
  if (rank <= 36) return "border-warning/40 bg-warning/10 text-warning";
  return "border-border bg-secondary/40 text-muted-foreground";
}

const INJURY_TONE: Record<string, string> = {
  Healthy: "border-success/40 bg-success/10 text-success",
  Questionable: "border-warning/40 bg-warning/10 text-warning",
  Doubtful: "border-warning/50 bg-warning/15 text-warning",
  Out: "border-destructive/50 bg-destructive/10 text-destructive",
  IR: "border-destructive/50 bg-destructive/15 text-destructive",
  PUP: "border-destructive/40 bg-destructive/10 text-destructive",
  Suspended: "border-destructive/50 bg-destructive/15 text-destructive",
};

function injuryTone(s?: string | null) {
  if (!s) return "border-border bg-secondary/40 text-muted-foreground";
  return INJURY_TONE[s] ?? "border-warning/40 bg-warning/10 text-warning";
}

function statLine(pos: string | undefined, p?: SleeperPlayer["projection"]): Array<{ label: string; value: string }> {
  if (!p) return [];
  const fmt = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? "—" : Math.round(n).toLocaleString();
  const out: Array<{ label: string; value: string }> = [];
  switch (pos) {
    case "QB":
      out.push({ label: "Pass yds", value: fmt(p.pass_yd) });
      out.push({ label: "Pass TD", value: fmt(p.pass_td) });
      out.push({ label: "INT", value: fmt(p.pass_int) });
      out.push({ label: "Rush yds", value: fmt(p.rush_yd) });
      out.push({ label: "Rush TD", value: fmt(p.rush_td) });
      break;
    case "RB":
      out.push({ label: "Rush yds", value: fmt(p.rush_yd) });
      out.push({ label: "Rush TD", value: fmt(p.rush_td) });
      out.push({ label: "Rec", value: fmt(p.rec) });
      out.push({ label: "Rec yds", value: fmt(p.rec_yd) });
      out.push({ label: "Rec TD", value: fmt(p.rec_td) });
      break;
    case "WR":
    case "TE":
      out.push({ label: "Rec", value: fmt(p.rec) });
      out.push({ label: "Rec yds", value: fmt(p.rec_yd) });
      out.push({ label: "Rec TD", value: fmt(p.rec_td) });
      if ((p.rush_yd ?? 0) > 50) out.push({ label: "Rush yds", value: fmt(p.rush_yd) });
      break;
    default:
      break;
  }
  return out;
}

function slotAccepts(group: SlotGroup, pos?: Position): boolean {
  if (!pos) return false;
  if (group === pos) return true;
  if (group === "SUPERFLEX") return pos === "QB" || pos === "RB" || pos === "WR" || pos === "TE";
  if (group === "FLEX") return pos === "RB" || pos === "WR" || pos === "TE";
  if (group === "BENCH") return true;
  return false;
}

export default function PlayerDetailsOverlay({
  open,
  onOpenChange,
  name,
  position,
  sheetPrice,
  posRank,
  overallRank,
  remaining,
  maxBid,
  slotsLeft,
}: Props) {
  const [meta, setMeta] = useState<SleeperPlayer | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const settings = useDraftStore((s) => s.settings);
  const slotAllocations = useDraftStore((s) => s.slotAllocations);
  const slotNotes = useDraftStore((s) => s.slotNotes);
  const lockedSlots = useDraftStore((s) => s.lockedSlots);

  useEffect(() => {
    if (!open || !name) return;
    let cancelled = false;
    setLoading(true);
    loadSleeperPlayers()
      .then((list) => {
        if (cancelled) return;
        setMeta(findPlayerByName(list, name) ?? null);
      })
      .catch(() => !cancelled && setMeta(null))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, name]);

  const team = meta?.team ?? undefined;
  const bye = byeWeekForTeam(team);
  const pos = (meta?.position as Position | undefined) ?? position;
  const injury = meta?.injury_status ?? meta?.status;
  const tier = tierLabel(pos, posRank);
  const proj = meta?.projection ?? null;
  const stats = statLine(pos, proj);
  const projPts = proj?.pts_ppr;
  const projGames = proj?.games;
  const ppg = projPts != null && projGames != null && projGames > 0 ? (projPts / projGames).toFixed(1) : null;
  const expectedPrice = sheetPrice;

  const planMatch = useMemo(() => {
    if (!pos) return null;
    const slots = buildPlannerSlots(settings).filter((s) => !lockedSlots[s.id] && slotAccepts(s.group, pos));
    if (!slots.length) return null;
    const key = norm(name);
    const named = slots.find((s) => norm(slotNotes[s.id] ?? "").includes(key));
    const slot = named ?? slots[0];
    return {
      label: slot.label,
      dollars: Number(slotAllocations[slot.id] ?? 0),
      specificallyTargeted: !!named,
    };
  }, [lockedSlots, name, pos, settings, slotAllocations, slotNotes]);

  const fit = useMemo(() => {
    if (expectedPrice == null || !planMatch || planMatch.dollars <= 0) return { label: "No plan", tone: "neutral" as const };
    const delta = expectedPrice - planMatch.dollars;
    if (delta <= 0) return { label: "Fits", tone: "good" as const };
    if (delta <= 3) return { label: "Stretch", tone: "warn" as const };
    return { label: `+$${delta} over`, tone: "bad" as const };
  }, [expectedPrice, planMatch]);

  const fitTone = fit.tone === "good"
    ? "border-success/50 bg-success/15 text-success"
    : fit.tone === "warn"
      ? "border-warning/50 bg-warning/10 text-warning"
      : fit.tone === "bad"
        ? "border-destructive/50 bg-destructive/10 text-destructive"
        : "border-border bg-secondary/40 text-muted-foreground";

  const afterExpected = expectedPrice != null && remaining != null ? remaining - expectedPrice : null;
  const legal = expectedPrice == null || maxBid == null || expectedPrice <= maxBid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-12px)] max-w-md max-h-[94vh] overflow-y-auto overscroll-contain p-0 bg-[#f5efe4] border-none">
        <DialogHeader className="sr-only"><DialogTitle>{name}</DialogTitle></DialogHeader>

        <div className="p-4 space-y-3">
          <div className="pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold leading-tight text-foreground">{name}</h2>
              {pos && (
                <Badge variant="outline" className={`${POS_COLORS[pos as keyof typeof POS_COLORS] || ""} text-[10px] px-1.5 py-0`}>
                  {pos}
                </Badge>
              )}
              {tier && <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${tierTone(posRank)}`}>{tier}</span>}
              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${injuryTone(injury)}`}>{injury || "Healthy"}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {team ?? "FA"}{bye ? ` · Bye W${bye}` : ""}{meta?.age != null ? ` · Age ${meta.age}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Tile label="Expected price" value={expectedPrice != null ? `$${expectedPrice}` : "—"} />
            <Tile label={planMatch ? `${planMatch.label} plan` : "Plan"} value={planMatch && planMatch.dollars > 0 ? `$${planMatch.dollars}` : "—"} />
            <Tile
              label="Pos rank"
              value={posRank ? <span>{pos ? `${pos === "DST" ? "DEF" : pos}${posRank}` : `#${posRank}`}{overallRank ? <span className="ml-1 text-[10px] font-normal text-muted-foreground">· #{overallRank} ovr</span> : null}</span> : "—"}
            />
            <Tile label="Plan fit" value={<span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${fitTone}`}>{fit.label}</span>} />
          </div>

          <div className="rounded-md border border-border/60 bg-secondary/30 p-3 text-[11px]">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Draft impact</p>
            {expectedPrice != null && remaining != null ? (
              <p>
                At the <span className="font-semibold">${expectedPrice} expected price</span>, you would have <span className="font-semibold">${Math.max(0, afterExpected ?? 0)}</span> left{slotsLeft != null ? ` for ${Math.max(0, slotsLeft - 1)} roster spots` : ""}.
                {planMatch?.specificallyTargeted ? ` You specifically listed ${name} in ${planMatch.label}.` : planMatch ? ` The first open ${pos} fit is ${planMatch.label}.` : ""}
              </p>
            ) : (
              <p>Expected-price impact will appear once the board and budget are loaded.</p>
            )}
            {!legal && maxBid != null && (
              <p className="mt-1 font-semibold text-destructive">Expected price is above your current legal max bid of ${maxBid}.</p>
            )}
          </div>

          <div className="rounded-md border border-border/60 bg-secondary/30 p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                2026 Projections{loading && <span className="ml-1 normal-case opacity-60">· loading…</span>}
              </p>
              {projPts != null && (
                <p className="font-mono text-xs"><span className="font-bold text-foreground">{Math.round(projPts)}</span><span className="text-muted-foreground"> pts</span>{ppg && <span className="text-muted-foreground"> · {ppg}/g</span>}</p>
              )}
            </div>
            {stats.length > 0 ? (
              <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]">
                {stats.map((s) => (
                  <div key={s.label} className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <p className="font-mono font-semibold tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] italic text-muted-foreground">{loading ? "Loading projections…" : "No projections available."}</p>
            )}
          </div>

          {injury && injury !== "Healthy" && injury !== "Active" && (meta?.injury_body_part || meta?.injury_notes) && (
            <div className="rounded-md border border-warning/30 bg-warning/5 p-2.5 text-[11px] text-warning">
              {meta?.injury_body_part && <span className="font-semibold">{meta.injury_body_part}</span>}
              {meta?.injury_notes && <span> — {meta.injury_notes}</span>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/60 p-2">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
