import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ListMusic, RefreshCw, Eye, Pin, X, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Star, ShieldAlert, Tag, Info } from "lucide-react";
import PlayerDetailsOverlay from "@/components/PlayerDetailsOverlay";
import { POS_COLORS } from "@/lib/positions";
import { Position } from "@/lib/draft-types";
import { ValueCall, WhatIf } from "@/lib/value";

export interface QueueKnockoff {
  name: string;
  position: Position;
  price: number;
}

export interface QueueTarget {
  name: string;
  position: Position;
  matchPct: number;
  maxBid: number;
  reason: string;
  grade?: number;
  worstCase?: string;
  knockoff?: QueueKnockoff;
  knockoffNote?: string;
  dossier?: string;
}

interface Props {
  targets: QueueTarget[];
  openMan?: string;
  loading: boolean;
  empty: boolean;
  pulseMultiplier: number;
  pulseConfident: boolean;
  watchlist: string[];
  onRefresh: () => void;
  onPick: (t: QueueTarget) => void;
  onPin: (name: string) => void;
  onUnpin: (name: string) => void;
  onDismiss: (name: string) => void;
  valueFor: (name: string, bid: number) => ValueCall;
  whatIfFor: (pos: Position, bid: number) => WhatIf;
}

function matchTone(pct: number) {
  if (pct >= 85) return "text-success border-success/40 bg-success/10";
  if (pct >= 70) return "text-primary border-primary/40 bg-primary/10";
  if (pct >= 55) return "text-warning border-warning/40 bg-warning/10";
  return "text-muted-foreground border-border bg-secondary/40";
}

function verdictTone(v: ValueCall["verdict"]) {
  switch (v) {
    case "steal": return "text-success border-success/50 bg-success/15";
    case "value": return "text-success border-success/40 bg-success/10";
    case "fair": return "text-muted-foreground border-border bg-secondary/40";
    case "reach": return "text-warning border-warning/40 bg-warning/10";
    case "overpay": return "text-destructive border-destructive/50 bg-destructive/10";
    default: return "text-muted-foreground border-border bg-secondary/30";
  }
}

function verdictLabel(v: ValueCall["verdict"]) {
  return { steal: "STEAL", value: "VALUE", fair: "FAIR", reach: "REACH", overpay: "OVER", unknown: "—" }[v];
}

export default function UpNextQueue({
  targets, openMan, loading, empty, pulseMultiplier, pulseConfident,
  watchlist, onRefresh, onPick, onPin, onUnpin, onDismiss, valueFor, whatIfFor,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailFor, setDetailFor] = useState<QueueTarget | null>(null);

  const pulsePct = Math.round((pulseMultiplier - 1) * 100);
  const pulseTone =
    !pulseConfident ? "text-muted-foreground border-border bg-secondary/40"
    : pulsePct > 8 ? "text-warning border-warning/40 bg-warning/10"
    : pulsePct < -8 ? "text-success border-success/40 bg-success/10"
    : "text-muted-foreground border-border bg-secondary/40";
  const PulseIcon = pulsePct > 4 ? TrendingUp : pulsePct < -4 ? TrendingDown : Minus;

  return (
    <Card className="bg-gradient-card p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <ListMusic className="h-3.5 w-3.5" /> Up Next
          {loading && <span className="text-muted-foreground normal-case">· tuning...</span>}
        </h2>
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums transition-colors duration-300 ${pulseTone} ${Math.abs(pulsePct) > 8 && pulseConfident ? "animate-pulse-soft" : ""}`}>
            <PulseIcon className="h-3 w-3" />
            Market {pulsePct >= 0 ? "+" : ""}{pulsePct}%
            {!pulseConfident && <span className="opacity-60">·early</span>}
          </span>
          <Button size="sm" variant="ghost" onClick={onRefresh} disabled={loading} className="h-7 px-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {openMan && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11px]">
          <Eye className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
          <span className="text-foreground/90"><span className="font-semibold text-accent">Open man:</span> {openMan}</span>
        </div>
      )}

      <div className="space-y-2">
        {empty && !loading && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Log your first pick — your queue will populate.
          </p>
        )}
        {loading && !targets.length && (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-md border border-border bg-secondary/40" />
          ))
        )}
        {targets.map((t, i) => {
          const v = valueFor(t.name, t.maxBid);
          const isPinned = watchlist.includes(t.name);
          const isOpen = expanded === t.name;
          const wi = isOpen ? whatIfFor(t.position, t.maxBid) : null;

          return (
            <div
              key={`${t.name}-${i}`}
              style={{ animationDelay: `${i * 60}ms` }}
              className="group relative animate-fade-in-up overflow-hidden rounded-md border border-border bg-secondary/40 transition-all duration-200 ease-out-expo hover:border-primary/50 hover:bg-secondary/60"
            >
              <button
                onClick={() => onPick(t)}
                className="block w-full px-3 py-2.5 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-bold text-muted-foreground">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`${POS_COLORS[t.position]} text-[10px] px-1.5 py-0`}>
                        {t.position}
                      </Badge>
                      {t.dossier ? (
                        <HoverCard openDelay={150}>
                          <HoverCardTrigger asChild>
                            <span className="flex min-w-0 items-center gap-1 truncate font-semibold text-sm cursor-help">
                              {t.name}
                              <Info className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" />
                            </span>
                          </HoverCardTrigger>
                          <HoverCardContent side="top" className="w-64 text-[11px] leading-snug">
                            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Dossier</p>
                            <p>{t.dossier}</p>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <span className="truncate font-semibold text-sm">{t.name}</span>
                      )}
                      {isPinned && <Pin className="h-3 w-3 shrink-0 fill-primary text-primary" />}
                      {t.grade != null && (
                        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px] font-bold tabular-nums text-warning" title="Coach grade">
                          <Star className="h-2.5 w-2.5 fill-warning" />{t.grade}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {t.reason}
                    </p>
                    {t.worstCase && (
                      <p className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-warning/90">
                        <ShieldAlert className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                        <span><span className="font-semibold">If you pass:</span> {t.worstCase}</span>
                      </p>
                    )}
                    {t.knockoff && t.knockoff.name.toLowerCase() !== t.name.toLowerCase() && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] leading-snug text-success/90">
                        <Tag className="h-2.5 w-2.5 shrink-0" />
                        <span>
                          <span className="font-semibold">Knockoff:</span> {t.knockoff.name}
                          <span className="ml-1 font-mono">${t.knockoff.price}</span>
                          <span className="ml-1 opacity-70">(save ${Math.max(0, t.maxBid - t.knockoff.price)})</span>
                        </span>
                      </p>
                    )}
                    {!t.knockoff && t.knockoffNote && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] leading-snug text-muted-foreground">
                        <Tag className="h-2.5 w-2.5 shrink-0" />
                        <span className="italic">{t.knockoffNote}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${matchTone(t.matchPct)}`}>
                      {t.matchPct}%
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ≤ <span className="font-bold text-foreground">${t.maxBid}</span>
                    </span>
                  </div>
                </div>
              </button>

              {/* Action bar */}
              <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-background/30 px-2 py-1">
                <div className="flex items-center gap-1.5">
                  {v.hasRef ? (
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${verdictTone(v.verdict)}`}
                      title={`Sheet $${v.refPrice} · Going $${v.goingRate} · Bid $${t.maxBid}`}
                    >
                      {verdictLabel(v.verdict)}
                      {v.goingRate != null && <span className="ml-1 font-mono opacity-80">${v.goingRate}</span>}
                    </span>
                  ) : (
                    <span className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-muted-foreground">
                      NO REF
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm" variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setExpanded(isOpen ? null : t.name); }}
                    className="h-6 px-2 text-[10px]"
                  >
                    {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    What if
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={(e) => { e.stopPropagation(); isPinned ? onUnpin(t.name) : onPin(t.name); }}
                    className="h-6 w-6 px-0"
                    title={isPinned ? "Unpin" : "Pin to watchlist"}
                  >
                    <Pin className={`h-3 w-3 ${isPinned ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onDismiss(t.name); }}
                    className="h-6 w-6 px-0"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {isOpen && wi && (
                <div className="border-t border-border/60 bg-background/40 px-3 py-2 text-[11px]">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    If you win at ${t.maxBid}
                  </p>
                  <div className="grid grid-cols-3 gap-2 font-mono">
                    <div>
                      <p className="text-[9px] uppercase text-muted-foreground">Budget</p>
                      <p className="font-bold">${wi.after.remaining}</p>
                      <p className="text-[9px] text-warning">{wi.budgetDelta}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-muted-foreground">Max bid</p>
                      <p className="font-bold">${wi.after.maxBid}</p>
                      <p className="text-[9px] text-warning">{wi.maxBidDelta >= 0 ? "+" : ""}{wi.maxBidDelta}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-muted-foreground">Slot</p>
                      <p className="font-bold uppercase">{wi.fillsSlot}</p>
                      <p className="text-[9px] text-muted-foreground">{wi.after.slotsLeft} left</p>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {t.position} need after: <span className="font-semibold text-foreground">{wi.newGapSeverityForPos.toUpperCase()}</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
