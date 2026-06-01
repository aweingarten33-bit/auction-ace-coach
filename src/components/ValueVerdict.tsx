import { Badge } from "@/components/ui/badge";
import type { ValueCall } from "@/lib/value";

const TONE: Record<ValueCall["verdict"], string> = {
  steal: "border-success/60 bg-success/15 text-success",
  value: "border-success/40 bg-success/10 text-success",
  fair: "border-border bg-secondary/50 text-foreground",
  reach: "border-warning/50 bg-warning/10 text-warning",
  overpay: "border-destructive/60 bg-destructive/10 text-destructive",
  unknown: "border-border bg-muted text-muted-foreground",
};

const LABEL: Record<ValueCall["verdict"], string> = {
  steal: "STEAL",
  value: "VALUE",
  fair: "FAIR",
  reach: "REACH",
  overpay: "OVERPAY",
  unknown: "—",
};

export default function ValueVerdict({ value }: { value: ValueCall }) {
  if (!value.hasRef) return null;
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${TONE[value.verdict]} px-1.5 py-0 text-[10px] font-bold tracking-wider`}>
        {LABEL[value.verdict]}
      </Badge>
      {value.goingRate != null && (
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          mkt ${value.goingRate}
          {value.delta != null && (
            <span className={value.delta >= 0 ? " text-success" : " text-warning"}>
              {" "}({value.delta >= 0 ? "+" : ""}${value.delta})
            </span>
          )}
        </span>
      )}
    </div>
  );
}
