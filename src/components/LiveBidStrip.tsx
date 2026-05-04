import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveBid } from "@/hooks/useEspnLiveSync";
import { POS_COLORS } from "@/lib/positions";
import { Position } from "@/lib/draft-types";
import { Gavel, Radio } from "lucide-react";

interface Props {
  bid: LiveBid | null;
  /** Recommended max bid for the nominated player (from coach math). Optional. */
  recommendedMax?: number;
}

/**
 * Live bidding-war strip. Shows the player currently on the block,
 * the climbing top bid, and (if known) a coach-recommended ceiling.
 * Hidden when nothing is live.
 */
export default function LiveBidStrip({ bid, recommendedMax }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!bid) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [bid]);

  if (!bid) return null;

  const sinceUpdate = Math.max(0, Math.round((Date.now() - bid.updatedAt) / 1000));
  const overMax = recommendedMax != null && bid.price > recommendedMax;
  const nearMax = recommendedMax != null && !overMax && bid.price >= recommendedMax * 0.85;

  return (
    <Card
      key={tick === -1 ? 0 : undefined /* keep instance stable */}
      className={`flex items-center gap-3 border-2 px-3 py-2 transition-colors ${
        overMax
          ? "border-destructive/60 bg-destructive/10"
          : nearMax
          ? "border-amber-500/60 bg-amber-500/10"
          : "border-primary/50 bg-primary/5"
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Gavel className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <Radio className="h-2.5 w-2.5 animate-pulse" /> Live bid
          </span>
          {bid.position && (
            <Badge variant="outline" className={`${POS_COLORS[bid.position as Position]} px-1 py-0 text-[10px]`}>
              {bid.position}
            </Badge>
          )}
          {bid.team && <span className="text-[10px] text-muted-foreground">{bid.team}</span>}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold">{bid.player}</span>
          {bid.bidder && (
            <span className="truncate text-[10px] text-muted-foreground">by {bid.bidder}</span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className={`font-mono text-lg font-bold tabular-nums ${overMax ? "text-destructive" : "text-primary"}`}>
          ${bid.price}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {recommendedMax != null ? (
            <>max ${recommendedMax} · {sinceUpdate}s</>
          ) : (
            <>updated {sinceUpdate}s ago</>
          )}
        </div>
      </div>
    </Card>
  );
}
