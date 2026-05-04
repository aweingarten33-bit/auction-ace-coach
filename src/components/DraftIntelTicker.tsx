// Live draft intel ticker — replaces the quote rotator with actionable facts
// scrolling across the chyron: budget, market pulse, position runs, top need,
// most-spent position, last pick verdict, next target. Pure presentation; all
// data computed upstream in LiveDashboard and passed in.
import { useMemo } from "react";
import type { DraftEvent, Position, PriceEstimate } from "@/lib/draft-types";
import type { MarketPulse, ValueCall } from "@/lib/value";

export interface IntelGap {
  pos: Position;
  severity: "critical" | "need" | "depth" | "done";
  starterShort: number;
}

interface Props {
  remaining: number;
  maxBid: number;
  slotsLeft: number;
  avgPerSlot: number;
  events: DraftEvent[];
  prices: PriceEstimate[];
  pulse: MarketPulse;
  gaps: IntelGap[];
  spendByPosition: Record<string, number>;
  recentRuns: { window: number; counts: Record<string, number> };
  topTarget?: { name: string; position: string; maxBid: number } | null;
  lastPickVerdict?: { player: string; bid: number; call: ValueCall } | null;
}

interface IntelItem {
  tag: string;        // colored label (red lower-third)
  tagTone: "primary" | "accent" | "warning" | "success" | "destructive";
  text: string;       // body copy
  highlight?: string; // emphasized number/word at end
}

const TONE_BG: Record<IntelItem["tagTone"], string> = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  warning: "bg-warning text-warning-foreground",
  success: "bg-success text-success-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

export default function DraftIntelTicker({
  remaining,
  maxBid,
  slotsLeft,
  avgPerSlot,
  events,
  pulse,
  gaps,
  spendByPosition,
  recentRuns,
  topTarget,
  lastPickVerdict,
}: Props) {
  const items = useMemo<IntelItem[]>(() => {
    const out: IntelItem[] = [];

    // 1. Budget snapshot
    out.push({
      tag: "BUDGET",
      tagTone: "primary",
      text: `$${remaining} left · $${maxBid} max bid · ${slotsLeft} slots · $${avgPerSlot.toFixed(1)}/slot avg`,
    });

    // 2. Market pulse
    if (pulse.sampleSize >= 3) {
      const pct = Math.round((pulse.multiplier - 1) * 100);
      const hot = pct > 5;
      const cold = pct < -5;
      const label = hot ? "ROOM HOT" : cold ? "ROOM COLD" : "ROOM AT PRICE";
      const tone: IntelItem["tagTone"] = hot ? "destructive" : cold ? "success" : "accent";
      const sign = pct > 0 ? "+" : "";
      out.push({
        tag: label,
        tagTone: tone,
        text: `Picks going ${sign}${pct}% vs your sheet${pulse.confident ? " (confident, n=" + pulse.sampleSize + ")" : " (early, n=" + pulse.sampleSize + ")"}${hot ? " — wait or pivot to value" : cold ? " — go shopping NOW" : ""}`,
      });
    }

    // 3. Top need
    const topGap = gaps.find((g) => g.severity === "critical") || gaps.find((g) => g.severity === "need");
    if (topGap) {
      out.push({
        tag: topGap.severity === "critical" ? "CRITICAL NEED" : "NEED",
        tagTone: topGap.severity === "critical" ? "destructive" : "warning",
        text: `${topGap.pos} — short ${topGap.starterShort} starter${topGap.starterShort === 1 ? "" : "s"} · prioritize next nomination`,
      });
    }

    // 4. Recent runs
    if (recentRuns.window >= 3) {
      const sorted = Object.entries(recentRuns.counts).sort((a, b) => b[1] - a[1]);
      const top = sorted[0];
      if (top && top[1] >= 2) {
        out.push({
          tag: `${top[0]} RUN`,
          tagTone: "warning",
          text: `${top[1]} of last ${recentRuns.window} picks were ${top[0]} — supply tightening, expect price spike`,
        });
      } else {
        out.push({
          tag: "LAST 6",
          tagTone: "accent",
          text: sorted.map(([k, v]) => `${k}×${v}`).join(" · "),
        });
      }
    }

    // 5. Spend by position (where the league $ is going)
    const spendEntries = Object.entries(spendByPosition).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const totalSpend = spendEntries.reduce((s, [, v]) => s + v, 0);
    if (spendEntries.length && totalSpend > 0) {
      const [topPos, topAmt] = spendEntries[0];
      const pct = Math.round((topAmt / totalSpend) * 100);
      out.push({
        tag: "LEAGUE $",
        tagTone: "primary",
        text: `${topPos}s leading: $${topAmt} (${pct}% of all spend) · ${spendEntries.slice(1, 4).map(([p, v]) => `${p} $${v}`).join(" · ")}`,
      });
    }

    // 6. Last pick verdict
    if (lastPickVerdict && lastPickVerdict.call.hasRef && lastPickVerdict.call.goingRate) {
      const v = lastPickVerdict.call.verdict;
      const toneMap: Record<string, IntelItem["tagTone"]> = {
        steal: "success",
        value: "success",
        fair: "accent",
        reach: "warning",
        overpay: "destructive",
        unknown: "accent",
      };
      const verdictText: Record<string, string> = {
        steal: "STEAL",
        value: "VALUE",
        fair: "FAIR",
        reach: "REACH",
        overpay: "OVERPAY",
        unknown: "?",
      };
      out.push({
        tag: `LAST: ${verdictText[v]}`,
        tagTone: toneMap[v],
        text: `${lastPickVerdict.player} went $${lastPickVerdict.bid} (sheet $${lastPickVerdict.call.refPrice}, going rate $${lastPickVerdict.call.goingRate})`,
      });
    }

    // 7. Top target queued
    if (topTarget) {
      out.push({
        tag: "TARGET",
        tagTone: "success",
        text: `${topTarget.name} (${topTarget.position}) — bid up to $${topTarget.maxBid}`,
      });
    }

    // 8. Pick count
    out.push({
      tag: "PICKS LOGGED",
      tagTone: "accent",
      text: `${events.length} total — keep logging to sharpen the read`,
    });

    return out;
  }, [remaining, maxBid, slotsLeft, avgPerSlot, events.length, pulse, gaps, spendByPosition, recentRuns, topTarget, lastPickVerdict]);

  // Duplicate for seamless marquee loop
  const loop = [...items, ...items];

  return (
    <div className="border-b border-primary/40 bg-black overflow-hidden">
      <div className="flex items-stretch gap-0">
        <div className="flex shrink-0 items-center bg-gradient-chyron px-3 py-1 shadow-chyron">
          <span className="font-chyron text-[11px] font-extrabold italic tracking-wider text-white">
            <span className="mr-1.5 inline-block h-2 w-2 translate-y-[-1px] rounded-full bg-accent live-pulse align-middle"></span>
            LIVE INTEL
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden bg-black">
          <div className="flex w-max animate-ticker items-center gap-6 whitespace-nowrap py-1.5 pl-4">
            {loop.map((it, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-[11px]">
                <span className={`px-1.5 py-0.5 font-lower-third text-[9px] ${TONE_BG[it.tagTone]}`}>
                  {it.tag}
                </span>
                <span className="font-mono text-foreground/90">{it.text}</span>
                <span className="text-primary/40">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
