// "Targeted Forecast" — opens a popover to filter the next-10 nomination forecast
// by position, value tier, and price range, then triggers a fresh prediction.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Crosshair, RefreshCw } from "lucide-react";
import { POSITIONS } from "@/lib/positions";
import { Position } from "@/lib/draft-types";

export interface ForecastFilters {
  positions: Position[];
  tier: "any" | "elite" | "starter" | "depth";
  priceMin: string;
  priceMax: string;
}

interface Props {
  value: ForecastFilters;
  onChange: (next: ForecastFilters) => void;
  onRun: (filters: ForecastFilters) => void;
  loading?: boolean;
}

export default function TargetedForecastButton({ value, onChange, onRun, loading }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount =
    value.positions.length +
    (value.tier !== "any" ? 1 : 0) +
    (value.priceMin ? 1 : 0) +
    (value.priceMax ? 1 : 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-primary/40 bg-primary/5 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
        >
          <Crosshair className="h-3.5 w-3.5" />
          Targeted Forecast
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] space-y-3 p-3">
        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Position
          </Label>
          <ToggleGroup
            type="multiple"
            value={value.positions}
            onValueChange={(v) => onChange({ ...value, positions: v as Position[] })}
            className="mt-1 flex flex-wrap justify-start gap-1"
          >
            {POSITIONS.map((p) => (
              <ToggleGroupItem
                key={p}
                value={p}
                className="h-7 min-w-[40px] px-2 text-[10px] font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Value Tier
          </Label>
          <ToggleGroup
            type="single"
            value={value.tier}
            onValueChange={(v) => v && onChange({ ...value, tier: v as ForecastFilters["tier"] })}
            className="mt-1 grid grid-cols-4 gap-1"
          >
            <ToggleGroupItem value="any" className="h-7 text-[10px] font-semibold">Any</ToggleGroupItem>
            <ToggleGroupItem value="elite" className="h-7 text-[10px] font-semibold">Elite</ToggleGroupItem>
            <ToggleGroupItem value="starter" className="h-7 text-[10px] font-semibold">Starter</ToggleGroupItem>
            <ToggleGroupItem value="depth" className="h-7 text-[10px] font-semibold">Depth</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Price Range (going $)
          </Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={value.priceMin}
                onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
                className="h-8 pl-5 text-xs"
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={value.priceMax}
                onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
                className="h-8 pl-5 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-[11px]"
            onClick={() => onChange({ positions: [], tier: "any", priceMin: "", priceMax: "" })}
          >
            Clear
          </Button>
          <Button
            size="sm"
            disabled={loading}
            className="h-8 gap-1 bg-gradient-primary px-3 text-[11px] font-semibold text-primary-foreground"
            onClick={() => {
              onRun(value);
              setOpen(false);
            }}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Predict 10
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
