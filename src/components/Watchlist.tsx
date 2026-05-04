import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, X } from "lucide-react";
import { ValueCall } from "@/lib/value";

interface Props {
  watchlist: string[];
  onUnpin: (name: string) => void;
  onLoad: (name: string) => void;
  valueFor: (name: string, bid: number) => ValueCall;
  maxBid: number;
}

export default function Watchlist({ watchlist, onUnpin, onLoad, valueFor, maxBid }: Props) {
  if (!watchlist.length) return null;
  return (
    <Card className="bg-gradient-card p-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Pin className="h-3.5 w-3.5" /> Watchlist ({watchlist.length})
      </h2>
      <div className="space-y-1.5">
        {watchlist.map((name) => {
          const v = valueFor(name, maxBid);
          return (
            <div key={name} className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-xs">
              <button onClick={() => onLoad(name)} className="flex-1 truncate text-left font-medium hover:text-primary">
                {name}
              </button>
              <div className="flex items-center gap-1.5">
                {v.hasRef && v.goingRate != null && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    ~${v.goingRate}
                  </Badge>
                )}
                <Button size="sm" variant="ghost" onClick={() => onUnpin(name)} className="h-6 w-6 px-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
