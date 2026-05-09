import { useEffect, useState } from "react";
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
import { Activity, Calendar, MapPin, User, Hash, Layers, AlertTriangle } from "lucide-react";
import AuctionPlayerCard from "@/components/AuctionPlayerCard";
import type { AnchorEntry } from "@/lib/decision-engine";

interface RosterGap {
  pos: string;
  starterShort: number;
  severity: "critical" | "need" | "depth" | "done";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  position?: Position;
  leagueName?: string;
  // Auction research data
  sheetPrice?: number;
  anchor?: AnchorEntry;
  posRank?: number;
  totalAtPos?: number;
  // Roster context — drives personalized card copy
  remaining?: number;
  maxBid?: number;
  slotsLeft?: number;
  gaps?: RosterGap[];
  // AI-derived enrichment we already have
  matchPct?: number;
  reason?: string;
  dossier?: string;
  worstCase?: string;
  knockoff?: { name: string; price: number };
  knockoffNote?: string;
  grade?: number;
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

export default function PlayerDetailsOverlay({
  open,
  onOpenChange,
  name,
  position,
  leagueName,
  sheetPrice,
  anchor,
  posRank,
  totalAtPos,
  remaining,
  maxBid,
  slotsLeft,
  gaps,
  matchPct,
  reason,
  dossier,
  worstCase,
  knockoff,
  knockoffNote,
  grade,
}: Props) {
  const [meta, setMeta] = useState<SleeperPlayer | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
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
  const showInjury = injury && injury !== "Active";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-12px)] max-w-md max-h-[94vh] overflow-y-auto overscroll-contain p-0 bg-[#f5efe4] border-none">
        {/* Visually-hidden title for a11y; real header is inside the card */}
        <DialogHeader className="sr-only">
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>

        <AuctionPlayerCard
          name={name}
          position={pos}
          leagueName={leagueName}
          sheetPrice={sheetPrice}
          anchor={anchor}
          posRank={posRank}
          totalAtPos={totalAtPos}
          remaining={remaining}
          maxBid={maxBid}
          slotsLeft={slotsLeft}
          gaps={gaps}
        />

        {/* Sleeper meta grid */}
        <div className="mx-2 rounded-md border border-border/60 bg-secondary/30 p-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Player Info {loading && <span className="ml-1 normal-case opacity-60">· loading…</span>}
          </p>
          {meta === null && !loading && (
            <p className="text-[11px] text-muted-foreground italic">
              No metadata found for this name. AI recs only.
            </p>
          )}
          {meta && (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Stat icon={MapPin} label="Team" value={team ?? "FA"} />
              <Stat icon={Calendar} label="Bye" value={bye ? `Week ${bye}` : "—"} />
              <Stat icon={User} label="Age" value={meta.age != null ? String(meta.age) : "—"} />
              <Stat icon={Hash} label="Exp" value={meta.years_exp != null ? `${meta.years_exp} yr` : "—"} />
              {meta.depth_chart_position && (
                <Stat
                  icon={Layers}
                  label="Depth"
                  value={`${meta.depth_chart_position}${meta.depth_chart_order ? ` #${meta.depth_chart_order}` : ""}`}
                />
              )}
              <Stat
                icon={Activity}
                label="Status"
                value={
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${injuryTone(injury)}`}
                  >
                    {injury || "Healthy"}
                  </span>
                }
              />
            </div>
          )}
          {showInjury && meta?.injury_body_part && (
            <p className="mt-2 flex items-start gap-1 text-[10px] text-warning">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                <span className="font-semibold">{meta.injury_body_part}</span>
                {meta.injury_notes ? ` — ${meta.injury_notes}` : ""}
              </span>
            </p>
          )}
        </div>

        {/* AI enrichment */}
        <div className="space-y-2 px-2 pb-2 text-[12px] leading-snug">
          {(matchPct != null || maxBid != null || grade != null) && (
            <div className="flex items-center gap-2">
              {matchPct != null && (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-bold text-primary">
                  {matchPct}% fit
                </span>
              )}
              {maxBid != null && (
                <span className="font-mono text-foreground">
                  Max bid: <span className="font-bold">${maxBid}</span>
                </span>
              )}
              {grade != null && (
                <span className="ml-auto text-warning">★ {grade}/5</span>
              )}
            </div>
          )}
          {reason && (
            <Block label="Why now">{reason}</Block>
          )}
          {dossier && (
            <Block label="About this player">{dossier}</Block>
          )}
          {worstCase && (
            <Block label="If you pass" tone="warning">{worstCase}</Block>
          )}
          {knockoff ? (
            <Block label="Cheaper option" tone="success">
              {knockoff.name} — <span className="font-mono">${knockoff.price}</span>
              {maxBid != null && (
                <span className="ml-1 opacity-70">(saves ${Math.max(0, maxBid - knockoff.price)})</span>
              )}
            </Block>
          ) : knockoffNote ? (
            <Block label="Cheaper option">
              <span className="italic text-muted-foreground">{knockoffNote}</span>
            </Block>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Block({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "warning" | "success";
}) {
  const toneCls =
    tone === "warning"
      ? "border-warning/30 bg-warning/5"
      : tone === "success"
      ? "border-success/30 bg-success/5"
      : "border-border bg-secondary/30";
  return (
    <div className={`rounded-md border px-2.5 py-1.5 ${toneCls}`}>
      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="leading-snug">{children}</p>
    </div>
  );
}
