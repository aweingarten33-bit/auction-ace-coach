// LastPickImpact — read-only snapshot of how the most recently imported pick
// shifted YOUR budget/roster. No bidding, no recommendations — pure delta.
import { ArrowDown, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import type { DraftEvent, Keeper, LeagueSettings, Position } from "@/lib/draft-types";
import { computeBudget, countByPosition, spendByPosition } from "@/lib/draft-math";
import { positionShare } from "@/lib/vetri-tiers";

interface Props {
  settings: LeagueSettings;
  keepers: Keeper[];
  events: DraftEvent[];
}

const POS: Position[] = ["QB", "RB", "WR", "TE"];

export default function LastPickImpact({ settings, keepers, events }: Props) {
  const last = events[events.length - 1];
  if (!last) return null;

  // Guardrails — flag missing fields before computing deltas
  const warnings: string[] = [];
  const hasPrice = typeof last.price === "number" && Number.isFinite(last.price) && last.price > 0;
  const pos = last.position;
  const isTrackedPos = !!pos && POS.includes(pos);
  if (!pos) warnings.push("Position missing on import — roster impact can't be computed.");
  else if (!isTrackedPos) warnings.push(`Position "${pos}" isn't tracked (QB/RB/WR/TE).`);
  if (!hasPrice) warnings.push("Price missing or invalid — budget impact can't be computed.");
  if (!last.player || last.player.trim().length < 2) warnings.push("Player name missing on import.");

  const prevEvents = events.slice(0, -1);
  const before = computeBudget(settings, keepers, prevEvents);
  const after = computeBudget(settings, keepers, events);

  const isMine = last.drafter === "me";
  const canShowDeltas = isMine && hasPrice;

  // Position-specific deltas (only meaningful when YOU made the pick at a tracked pos)
  const posBefore = isMine && isTrackedPos
    ? {
        count: countByPosition([
          ...keepers.map((k) => ({ player: k.player, position: k.position, price: k.cost, source: "keeper" as const })),
          ...prevEvents.filter((e) => e.drafter === "me").map((e) => ({ player: e.player, position: e.position, price: e.price, source: "draft" as const })),
        ])[pos!] ?? 0,
        spend: spendByPosition(prevEvents.filter((e) => e.drafter === "me"))[pos!] ?? 0,
      }
    : null;
  const posAfter = isMine && isTrackedPos
    ? {
        count: countByPosition([
          ...keepers.map((k) => ({ player: k.player, position: k.position, price: k.cost, source: "keeper" as const })),
          ...events.filter((e) => e.drafter === "me").map((e) => ({ player: e.player, position: e.position, price: e.price, source: "draft" as const })),
        ])[pos!] ?? 0,
        spend: spendByPosition(events.filter((e) => e.drafter === "me"))[pos!] ?? 0,
      }
    : null;

  const share = positionShare(settings);
  const target = isTrackedPos ? Math.round(settings.totalBudget * share[pos!]) : 0;

  // Strategy nudge
  let nudge: string | null = null;
  if (isMine && posAfter && target > 0) {
    if (posAfter.spend > target * 1.15) {
      nudge = `You're now over fair share at ${pos} ($${posAfter.spend} of $${target}). Pivot off ${pos}.`;
    } else if (posAfter.spend < target * 0.4 && pos === "QB" && (settings.leagueType === "Superflex" || settings.leagueType === "2QB")) {
      nudge = `Still light on QB spend in Superflex — keep one in your sights.`;
    }
  } else if (!isMine && isTrackedPos) {
    nudge = `${pos} pool shrank by 1 — fewer options at the top.`;
  }

  return (
    <section className="rounded-lg border border-border bg-secondary/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Last imported pick
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isMine
              ? "bg-primary/15 text-primary"
              : "bg-foreground/10 text-muted-foreground"
          }`}
        >
          {isMine ? "You" : "Other team"}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-base font-semibold text-foreground">
          {last.player}
          <span className="ml-2 text-[11px] font-normal text-muted-foreground">
            {pos ?? ""} · ${last.price}
          </span>
        </p>
      </div>

      {isMine && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Delta label="Remaining" before={`$${before.remaining}`} after={`$${after.remaining}`} />
          <Delta label="Max bid" before={`$${before.maxBid}`} after={`$${after.maxBid}`} />
          <Delta
            label="Slots left"
            before={String(before.slotsLeft)}
            after={String(after.slotsLeft)}
          />
        </div>
      )}

      {isMine && posAfter && posBefore && (
        <div className="mb-2 rounded-md bg-foreground/5 px-2 py-1.5 text-[11px] text-foreground/85">
          <div className="font-semibold text-foreground">{pos} roster</div>
          <div className="mt-0.5 text-muted-foreground">
            Count: {posBefore.count} → <span className="text-foreground">{posAfter.count}</span> ·{" "}
            Spent: ${posBefore.spend} → <span className="text-foreground">${posAfter.spend}</span>
            {target > 0 && <span> of ${target} fair share</span>}
          </div>
        </div>
      )}

      {nudge && (
        <p className="text-[12px] leading-snug text-foreground/85">
          <span className="font-semibold text-foreground">Strategy:</span> {nudge}
        </p>
      )}
    </section>
  );
}

function Delta({ label, before, after }: { label: string; before: string; after: string }) {
  const changed = before !== after;
  return (
    <div className="rounded-md border border-border/40 bg-background/40 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-center gap-1 text-xs font-bold tabular-nums">
        <span className="text-muted-foreground">{before}</span>
        {changed ? (
          <ArrowDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-foreground">{after}</span>
      </div>
    </div>
  );
}
