// Deterministic nomination logic — no AI, no guessing.
// DRAIN: who to nominate to make OTHER teams spend money.
// GET: how to nominate players you actually want.
import { computeBudget } from "./draft-math";
import { projectRemainingBuild } from "./simulator";
import { computeMarketPulse } from "./value";
import {
  DraftEvent,
  Keeper,
  LeagueSettings,
  Position,
  PriceEstimate,
} from "./draft-types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface DrainPick {
  name: string;
  position?: Position;
  price: number;            // sheet price
  reason: string;           // one short line
}

export interface DrainPlan {
  primary: DrainPick | null;
  backups: DrainPick[];     // up to 2
}

export interface GetPlan {
  target: string | null;
  position?: Position;
  timing: "Nominate now" | "Wait";
  startPrice: number;
  pushTo: number;           // GOOD price
  stopAt: number;           // hard cap
  safeIfWin: boolean;
  reason: string;           // one short line
}

interface Input {
  settings: LeagueSettings;
  keepers: Keeper[];
  events: DraftEvent[];
  prices: PriceEstimate[];
}

interface PricedPlayer {
  name: string;
  price: number;
  position?: Position;
}

function undraftedPool(input: Input): PricedPlayer[] {
  const drafted = new Set<string>([
    ...input.events.map((e) => norm(e.player)),
    ...input.keepers.map((k) => norm(k.player)),
  ]);
  return input.prices
    .filter((p) => !drafted.has(norm(p.name)) && p.price > 0)
    .map((p) => ({
      name: p.name,
      price: p.price,
      position: ((p as unknown) as { position?: Position }).position,
    }));
}

function userNeeds(input: Input): Record<Position, number> {
  const { settings, keepers, events } = input;
  const required: Record<Position, number> = {
    QB: settings.roster.QB + (settings.leagueType !== "Standard" ? settings.roster.SUPERFLEX : 0),
    RB: settings.roster.RB,
    WR: settings.roster.WR,
    TE: settings.roster.TE,
    K: settings.roster.K,
    DST: settings.roster.DST,
  };
  const have: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  for (const k of keepers) if (k.position) have[k.position]++;
  for (const e of events) if (e.drafter === "me" && e.position) have[e.position]++;
  const need: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  (Object.keys(required) as Position[]).forEach((p) => {
    need[p] = Math.max(0, required[p] - have[p]);
  });
  return need;
}

// =================== DRAIN ===================
export function computeDrain(input: Input): DrainPlan {
  const pool = undraftedPool(input);
  const need = userNeeds(input);
  const budget = computeBudget(input.settings, input.keepers, input.events);

  // Score each priced player as a drain candidate.
  // - Higher price = drains more money
  // - Position user does NOT need = safer
  // - If user could accidentally win: must NOT hurt the build
  const scored = pool
    .map((p) => {
      const pos = p.position;
      const userNeedsPos = pos ? need[pos] > 0 : false;

      // If user could afford and pos is needed, winning would fill a slot — risky as a "drain"
      const couldHurt = userNeedsPos && p.price <= budget.maxBid;
      if (couldHurt) return null;

      // Prefer big-money players user does not need
      let score = p.price;
      if (!userNeedsPos) score *= 1.5;
      // Penalize K/DST — nobody fights for them
      if (pos === "K" || pos === "DST") score *= 0.2;

      const reason = !pos
        ? "Expensive — drains the room"
        : userNeedsPos
          ? `${pos} you can skip — others will pay`
          : `You don't need ${pos} — let others overpay`;

      return { pick: { name: p.name, position: pos, price: p.price, reason }, score };
    })
    .filter((x) => x !== null) as { pick: DrainPick; score: number }[];
  scored
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { primary: null, backups: [] };
  return {
    primary: scored[0].pick,
    backups: scored.slice(1, 3).map((s) => s.pick),
  };
}

// =================== GET ===================
export function computeGet(input: Input): GetPlan {
  const { settings, keepers, events, prices } = input;
  const pool = undraftedPool(input);
  const need = userNeeds(input);
  const budget = computeBudget(settings, keepers, events);
  const pulse = computeMarketPulse(events, prices);
  const mult = pulse.multiplier || 1;

  // Pick the most-needed position the user can still afford
  const positionsByNeed = (["RB", "WR", "QB", "TE", "DST", "K"] as Position[])
    .filter((p) => need[p] > 0)
    .sort((a, b) => need[b] - need[a]);

  let target: PricedPlayer | null = null;
  let chosenPos: Position | undefined;
  for (const pos of positionsByNeed) {
    const candidates = pool
      .filter((p) => p.position === pos && p.price <= budget.maxBid)
      .sort((a, b) => b.price - a.price);
    if (candidates.length > 0) {
      target = candidates[0];
      chosenPos = pos;
      break;
    }
  }

  if (!target || !chosenPos) {
    return {
      target: null,
      timing: "Wait",
      startPrice: 1,
      pushTo: 0,
      stopAt: 0,
      safeIfWin: false,
      reason: "No priced target you need is left",
    };
  }

  // Tier = players within ±15% of target's price at same position, still on the board
  const lo = target.price * 0.85;
  const hi = target.price * 1.15;
  const tier = pool.filter(
    (p) => p.position === chosenPos && p.price >= lo && p.price <= hi,
  );
  const tierLeft = tier.length;

  // Going price (market-adjusted) for the target
  const going = Math.max(1, Math.round(target.price * mult));
  const pushTo = Math.max(1, Math.round(going * 0.9));
  const stopAt = Math.min(budget.maxBid, going);

  // Safe if you win: build still works if you pay pushTo
  const proj = projectRemainingBuild({
    settings, keepers, events, prices,
    hypothetical: { name: target.name, pos: chosenPos, price: pushTo },
  });
  const safeIfWin = proj.feasible && pushTo <= budget.maxBid;

  // Timing: nominate now if tier is thin OR market is hot (prices inflated)
  const timing: "Nominate now" | "Wait" =
    tierLeft <= 2 || mult > 1.05 ? "Nominate now" : "Wait";

  const reason =
    timing === "Nominate now"
      ? tierLeft <= 2
        ? `Only ${tierLeft} similar ${chosenPos} left`
        : "Room is hot — get yours before prices climb"
      : `${tierLeft} similar ${chosenPos} left — you can wait`;

  return {
    target: target.name,
    position: chosenPos,
    timing,
    startPrice: 1,
    pushTo,
    stopAt,
    safeIfWin,
    reason,
  };
}
