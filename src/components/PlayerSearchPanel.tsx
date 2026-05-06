import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Pin, PinOff } from "lucide-react";
import { DraftEvent, PriceEstimate, Position } from "@/lib/draft-types";
import { POS_COLORS } from "@/lib/positions";
import { tierForPosRank } from "@/lib/league-tier-prices";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Props {
  prices: PriceEstimate[];
  events: DraftEvent[];
  watchlist: string[];
  onPick: (name: string, position?: Position, price?: number) => void;
  onPin: (name: string) => void;
  onUnpin: (name: string) => void;
}

export default function PlayerSearchPanel({ prices, events, watchlist, onPick, onPin, onUnpin }: Props) {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<"ALL" | Position>("ALL");

  const draftedSet = useMemo(() => new Set(events.map((e) => norm(e.player))), [events]);
  const pinnedSet = useMemo(() => new Set(watchlist.map(norm)), [watchlist]);

  const results = useMemo(() => {
    const qn = norm(q);
    let arr = prices;
    if (pos !== "ALL") arr = arr.filter((p) => p.position === pos);
    if (qn) arr = arr.filter((p) => norm(p.name).includes(qn));
    return [...arr].sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 100);
  }, [prices, q, pos]);

  return (
    <Card className="min-w-0 overflow-hidden p-3">
      <div className="mb-2 flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Search players ({prices.length})
        </span>
      </div>
      <div className="relative mb-2">
        <Input
          autoFocus
          placeholder="Type a name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 pr-8"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {(["ALL", "QB", "RB", "WR", "TE", "K", "DST"] as const).map((p) => (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={pos === p ? "default" : "outline"}
            className="h-7 px-2 text-[11px]"
            onClick={() => setPos(p)}
          >
            {p}
          </Button>
        ))}
      </div>
      <p className="mb-1 text-[10px] text-muted-foreground">
        Showing {results.length}{results.length === 100 ? "+" : ""} of {prices.length}
      </p>
      <div className="max-h-[60vh] space-y-1 overflow-y-auto overscroll-contain rounded-md border border-border/60 bg-secondary/20 p-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {results.map((p) => {
          const isDrafted = draftedSet.has(norm(p.name));
          const isPinned = pinnedSet.has(norm(p.name));
          const cls = p.position && p.position in POS_COLORS ? POS_COLORS[p.position as Position] : "";
          return (
            <button
              key={p.name}
              type="button"
              disabled={isDrafted}
              onClick={() => !isDrafted && onPick(p.name, p.position, p.price)}
              className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left transition ${
                isDrafted ? "opacity-40 line-through" : "hover:bg-secondary/60"
              }`}
            >
              <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
              {p.position && (
                <Badge variant="outline" className={`${cls} text-[10px] px-1.5 py-0`}>
                  {p.position}
                </Badge>
              )}
              <span className="w-12 text-right font-mono text-xs tabular-nums">${p.price}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  isPinned ? onUnpin(p.name) : onPin(p.name);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
        {!results.length && (
          <p className="py-6 text-center text-xs text-muted-foreground">No matches.</p>
        )}
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        Tap a player to load them into the bid form. Pin to add to your watchlist.
      </p>
    </Card>
  );
}
