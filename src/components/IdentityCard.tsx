import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, AlertTriangle } from "lucide-react";
import { IdentityRead } from "@/lib/identity";

interface Props { read: IdentityRead }

const POS_ORDER = ["QB", "RB", "WR", "TE", "K", "DST"];

export default function IdentityCard({ read }: Props) {
  return (
    <Card className="bg-gradient-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Fingerprint className="h-3.5 w-3.5" /> Draft Identity
        </h2>
        <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
          {read.label}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground">{read.blurb}</p>

      {/* Spend bar */}
      {read.archetype !== "forming" && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-secondary/40">
          {POS_ORDER.map((pos) => {
            const pct = (read.spendShare[pos] ?? 0) * 100;
            if (pct < 0.5) return null;
            const tone =
              pos === "RB" ? "bg-primary"
              : pos === "WR" ? "bg-accent"
              : pos === "QB" ? "bg-warning"
              : pos === "TE" ? "bg-success"
              : "bg-muted-foreground";
            return <div key={pos} className={tone} style={{ width: `${pct}%` }} title={`${pos} ${pct.toFixed(0)}%`} />;
          })}
        </div>
      )}

      {read.archetype !== "forming" && (
        <div className="mt-1.5 grid grid-cols-6 gap-1 text-center text-[9px] font-mono text-muted-foreground">
          {POS_ORDER.map((pos) => (
            <div key={pos}>
              <div className="font-semibold text-foreground/80">{pos}</div>
              <div>{Math.round((read.spendShare[pos] ?? 0) * 100)}%</div>
            </div>
          ))}
        </div>
      )}

      {read.drift && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
          <span className="text-foreground/90">{read.drift}</span>
        </div>
      )}
    </Card>
  );
}
