// Vetri Tier Sheet panel
// ----------------------------------------------------------------------
// User pastes their tier list (any of these formats works):
//   - "Bijan Robinson, RB, 1, 64"   ← name, pos, tier, optional $ override
//   - "RB Tier 1: Bijan, Saquon, McCaffrey"
//   - "RB1:" newline list
// Computes auction $ values calibrated to the user's league settings,
// then merges into the price sheet the coach reads from. Manual price
// overrides (set in the price editor) are preserved.
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Layers, Sparkles, Trash2, Eye, EyeOff } from "lucide-react";
import { POS_COLORS } from "@/lib/positions";
import { useDraftStore } from "@/lib/draft-store";
import {
  computeTierValues,
  parseVetriPaste,
  type VetriRanking,
} from "@/lib/vetri-tiers";
import type { Position } from "@/lib/draft-types";

const POS_ORDER: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

export default function VetriTierSheet() {
  const {
    settings,
    vetriRankings,
    vetriDecay,
    vetriAutoSync,
    priceOverrides,
    setVetriRankings,
    setVetriDecay,
    setVetriAutoSync,
    syncVetriToPrices,
    clearVetri,
  } = useDraftStore();

  const [paste, setPaste] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  // Live preview of computed values from current rankings + decay + settings
  const computed = useMemo(
    () => computeTierValues(vetriRankings, settings, vetriDecay),
    [vetriRankings, vetriDecay, settings],
  );

  const grouped = useMemo(() => {
    const m: Record<string, typeof computed> = {};
    for (const c of computed) {
      if (!m[c.position]) m[c.position] = [];
      m[c.position].push(c);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => a.tier - b.tier || b.value - a.value);
    }
    return m;
  }, [computed]);

  const handleParse = () => {
    const parsed = parseVetriPaste(paste);
    if (!parsed.length) {
      toast.error("Couldn't parse any rankings — check format");
      return;
    }
    // Merge with existing rankings (replace by name+position)
    const existingMap = new Map<string, VetriRanking>();
    for (const r of vetriRankings) existingMap.set(`${r.name.toLowerCase()}|${r.position}`, r);
    for (const r of parsed) existingMap.set(`${r.name.toLowerCase()}|${r.position}`, r);
    const merged = [...existingMap.values()];
    setVetriRankings(merged);
    setPaste("");
    toast.success(`${parsed.length} ranking${parsed.length === 1 ? "" : "s"} added · prices auto-synced`);
  };

  const handleReplace = () => {
    const parsed = parseVetriPaste(paste);
    if (!parsed.length) {
      toast.error("Couldn't parse any rankings");
      return;
    }
    setVetriRankings(parsed);
    setPaste("");
    toast.success(`Replaced with ${parsed.length} rankings · prices synced`);
  };

  const handleSync = () => {
    syncVetriToPrices();
    toast.success("Prices re-synced from analyst tiers");
  };

  const handleClear = () => {
    clearVetri();
    toast("Analyst rankings cleared");
  };

  const overrideCount = priceOverrides.length;

  return (
    <Card className="scoreboard p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="lower-third text-[10px]">
          <Layers className="mr-1 inline h-3 w-3 -translate-y-px" />
          VETRI TIERS · AUTO-PRICED
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {vetriRankings.length} ranked · {computed.length} priced
          </span>
        </div>
      </div>

      {/* Paste input */}
      <div className="space-y-2">
        <Textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={
            "Paste an analyst tier list — any of these formats:\n\n" +
            "Bijan Robinson, RB, 1\n" +
            "Saquon Barkley, RB, 1, 60   ← optional $ override\n" +
            "Christian McCaffrey, RB, 1\n\n" +
            "or:\n\n" +
            "RB Tier 1: Bijan, Saquon, McCaffrey\n" +
            "RB Tier 2: Henry, Achane, Gibbs"
          }
          className="h-32 resize-y font-mono text-[11px]"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleParse} disabled={!paste.trim()} className="h-7 gap-1 text-[11px]">
            <Sparkles className="h-3 w-3" /> Add to tiers
          </Button>
          <Button size="sm" variant="outline" onClick={handleReplace} disabled={!paste.trim()} className="h-7 text-[11px]">
            Replace all
          </Button>
          {vetriRankings.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={handleSync} className="h-7 text-[11px]">
                Re-sync prices
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClear} className="h-7 gap-1 text-[11px] text-destructive">
                <Trash2 className="h-3 w-3" /> Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      {vetriRankings.length > 0 && (
        <div className="mt-3 space-y-2 rounded-sm border border-border bg-card/40 p-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="font-lower-third text-[9px]">Tier Decay</Label>
            <span className="font-mono text-[10px] text-primary">{vetriDecay.toFixed(2)}</span>
          </div>
          <Slider
            value={[vetriDecay]}
            min={0.4}
            max={0.8}
            step={0.05}
            onValueChange={([v]) => setVetriDecay(v)}
          />
          <p className="font-mono text-[9px] text-muted-foreground">
            Lower = bigger $ gap top→bottom tiers. Higher = flatter.
          </p>

          <div className="flex items-center justify-between pt-1">
            <Label className="font-lower-third text-[9px]">Auto-sync to prices</Label>
            <Switch checked={vetriAutoSync} onCheckedChange={setVetriAutoSync} />
          </div>

          {overrideCount > 0 && (
            <p className="font-mono text-[9px] text-accent">
              {overrideCount} manual price override{overrideCount === 1 ? "" : "s"} preserved (won't be touched by analyst sync)
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      {vetriRankings.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowPreview((s) => !s)}
            className="flex w-full items-center justify-between gap-2 border-t border-border pt-2 font-lower-third text-[9px] text-muted-foreground hover:text-foreground"
          >
            <span>
              {showPreview ? <EyeOff className="mr-1 inline h-3 w-3" /> : <Eye className="mr-1 inline h-3 w-3" />}
              {showPreview ? "Hide" : "Show"} computed values
            </span>
            <span>{computed.length} players</span>
          </button>

          {showPreview && (
            <div className="mt-2 max-h-72 space-y-2 overflow-auto">
              {POS_ORDER.map((pos) => {
                const rows = grouped[pos];
                if (!rows?.length) return null;
                return (
                  <div key={pos}>
                    <div className="sticky top-0 z-10 flex items-center gap-2 bg-card/95 py-1 backdrop-blur">
                      <Badge variant="outline" className={`${POS_COLORS[pos]} px-1.5 py-0 text-[9px]`}>
                        {pos}
                      </Badge>
                      <span className="font-lower-third text-[9px] text-muted-foreground">
                        {rows.length} ranked
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {rows.map((r) => {
                        const isOverride = priceOverrides.includes(
                          r.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
                        );
                        return (
                          <div
                            key={`${r.name}-${pos}`}
                            className="flex items-center justify-between gap-2 rounded-sm px-1.5 py-0.5 text-[11px] hover:bg-secondary/40"
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="font-mono text-[9px] text-muted-foreground">T{r.tier}</span>
                              <span className="truncate">{r.name}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {isOverride && (
                                <span
                                  className="font-lower-third text-[8px] text-accent"
                                  title="You set this price manually — analyst sync skips it"
                                >
                                  PINNED
                                </span>
                              )}
                              <span className={`font-mono font-bold tabular-nums ${isOverride ? "text-muted-foreground line-through" : "text-primary"}`}>
                                ${r.value}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!vetriRankings.length && (
        <p className="mt-3 border-t border-border pt-3 text-center font-mono text-[10px] text-muted-foreground">
          Paste Vetri's tiers above. We auto-compute $ values from your league budget × position weights × tier curve.
        </p>
      )}
    </Card>
  );
}
