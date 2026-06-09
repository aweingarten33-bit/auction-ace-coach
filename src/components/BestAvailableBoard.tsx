// The primary sidecar view during a live auction draft.
// Shows available players your budget can reach, sorted by adjusted value.
// Highlights the currently nominated player with live bid climbing.
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { POS_COLORS } from "@/lib/positions";
import type { DraftEvent, Position, PriceEstimate } from "@/lib/draft-types";
import type { LiveBid } from "@/hooks/useEspnLiveSync";
import { Flame, Lock } from "lucide-react";

const POSITIONS: Array<Position | "ALL"> = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Props {
  prices: PriceEstimate[];
  events: DraftEvent[];
  maxBid: number;
  remaining: number;
  liveBid: LiveBid | null;
  onSelect: (name: string, position?: Position) => void;
}

export default function BestAvailableBoard({ prices, events, maxBid, remaining, liveBid, onSelect }: Props) {
  const [posFilter, setPosFilter] = useState<Position | "ALL">("ALL");
  const [showAll, setShowAll] = useState(false);

  const drafted = useMemo(
    () => new Set(events.map((e) => norm(e.player))),
    [events],
  );

  const liveKey = liveBid ? norm(liveBid.player) : null;

  const available = useMemo(() => {
    return prices
      .filter((p) => !drafted.has(norm(p.name)))
      .filter((p) => posFilter === "ALL" || p.position === posFilter)
      .filter((p) => showAll || p.price <= Math.max(maxBid, 1))
      .sort((a, b) => b.price - a.price);
  }, [prices, drafted, posFilter, showAll, maxBid]);

  const livePlayer = useMemo(
    () => liveKey ? prices.find((p) => norm(p.name) === liveKey) : null,
    [prices, liveKey],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Live nomination banner */}
      {liveBid && (
        <div className="mx-3 mb-2 flex animate-pulse items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2">
          <Flame className="h-3.5 w-3.5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-warning">{liveBid.player}</span>
            {liveBid.position && (
              <Badge variant="outline" className={`ml-1.5 px-1 py-0 text-[9px] ${POS_COLORS[liveBid.position as Position] ?? ""}`}>
                {liveBid.position}
              </Badge>
            )}
            <span className="ml-2 font-mono text-sm font-bold text-foreground">${liveBid.price}</span>
            {livePlayer && (
              <span className="ml-1 text-[11px] text-muted-foreground">
                · sheet ${livePlayer.price}
                {liveBid.price > livePlayer.price
                  ? <span className="ml-1 text-destructive">+${liveBid.price - livePlayer.price} over</span>
                  : <span className="ml-1 text-success">${livePlayer.price - liveBid.price} left</span>
                }
              </span>
            )}
          </div>
          {liveBid.bidder && (
            <span className="shrink-0 text-[10px] text-muted-foreground">{liveBid.bidder}</span>
          )}
        </div>
      )}

      {/* Position filter */}
      <div className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              posFilter === pos
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {pos}
          </button>
        ))}
        <button
          onClick={() => setShowAll((v) => !v)}
          className={`ml-auto shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
            showAll
              ? "bg-secondary text-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Lock className="h-2.5 w-2.5" />
          {showAll ? "All prices" : `≤ $${maxBid}`}
        </button>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        {available.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {showAll
              ? "No players left at this position."
              : `No players ≤ $${maxBid} at this position. Toggle to see all.`}
          </div>
        ) : (
          <div className="space-y-1">
            {available.map((p) => {
              const isLive = liveKey === norm(p.name);
              return (
                <button
                  key={p.name}
                  onClick={() => onSelect(p.name, p.position)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition hover:border-primary/50 ${
                    isLive
                      ? "border-warning/60 bg-warning/10 ring-1 ring-warning/30"
                      : "border-border bg-secondary/30 hover:bg-secondary/60"
                  }`}
                >
                  {p.position && (
                    <Badge
                      variant="outline"
                      className={`shrink-0 px-1.5 py-0 text-[9px] font-bold ${POS_COLORS[p.position] ?? ""}`}
                    >
                      {p.position}
                    </Badge>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {p.name}
                    {isLive && liveBid && (
                      <span className="ml-2 text-[11px] font-normal text-warning">
                        live: ${liveBid.price}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-bold tabular-nums">
                    ${p.price}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
