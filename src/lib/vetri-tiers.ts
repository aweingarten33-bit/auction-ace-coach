// Vetri tier-to-value mapping
// ---------------------------------------------------------------
// Input: a tier list per player (name, position, tier 1..N)
// Output: a synthesized auction $ value for each player, calibrated to the
// user's actual league (budget × teams × roster slots × scoring).
//
// Algorithm (deterministic, no AI):
//   1. Compute total league $ = totalBudget × numTeams.
//   2. Compute total starter+bench slots per position across the league
//      (e.g. 12-team, 2 RB + 1 FLEX_share + 2 bench-RB ≈ 5.5 RBs/team).
//   3. Allocate league $ by position weights (PPR/scoring-aware).
//   4. Within a position, distribute $ across tiers using a geometric decay
//      curve (top tier gets the most). Min bid floor = $1.
//   5. Within a tier, all players share equally (tier = price band).
//
// Budget allocation defaults are chosen to match typical industry auction
// values; they're tunable. The user's manual price overrides ALWAYS win
// when sync is run (handled in store, not here).

import type { LeagueSettings, Position, PriceEstimate } from "./draft-types";

export interface VetriRanking {
  name: string;
  position: Position;
  tier: number;          // 1 = best
  projection?: number;   // optional: user-supplied $ override for this player only
}

export interface ComputedValue {
  name: string;
  position: Position;
  tier: number;
  value: number;         // computed auction $
  source: "vetri" | "vetri-projection";
}

/**
 * Position spend share of total league $.
 * Defaults reflect typical PPR auction patterns; we adjust per scoring/leagueType.
 */
function positionShare(settings: LeagueSettings): Record<Position, number> {
  const base: Record<Position, number> = {
    RB: 0.42,
    WR: 0.34,
    QB: 0.08,
    TE: 0.10,
    DST: 0.03,
    K: 0.03,
  };

  // PPR boosts WR/TE; Standard pushes RB harder.
  if (settings.scoring === "PPR") {
    base.WR += 0.04;
    base.TE += 0.02;
    base.RB -= 0.06;
  } else if (settings.scoring === "Standard") {
    base.RB += 0.04;
    base.WR -= 0.03;
    base.TE -= 0.01;
  }

  // Superflex / 2QB drastically inflates QB.
  if (settings.leagueType === "Superflex" || settings.leagueType === "2QB") {
    const qbBoost = 0.16;
    base.QB += qbBoost;
    // pull from RB/WR proportionally
    base.RB -= qbBoost * 0.6;
    base.WR -= qbBoost * 0.4;
  }

  // No K/DST in roster? zero them out and redistribute to RB/WR.
  if (settings.roster.K === 0) {
    base.WR += base.K * 0.5;
    base.RB += base.K * 0.5;
    base.K = 0;
  }
  if (settings.roster.DST === 0) {
    base.WR += base.DST * 0.5;
    base.RB += base.DST * 0.5;
    base.DST = 0;
  }

  // Normalize to sum to 1.
  const total = Object.values(base).reduce((s, v) => s + v, 0);
  if (total > 0) {
    for (const k of Object.keys(base) as Position[]) base[k] = base[k] / total;
  }
  return base;
}

/**
 * Estimate how many roster spots per position the LEAGUE will fill
 * (used to compute "draftable players" per position).
 */
function leagueSlotsPerPosition(settings: LeagueSettings): Record<Position, number> {
  const r = settings.roster;
  const teams = settings.numTeams;
  // FLEX is ~split among RB/WR/TE (60/35/5 typical).
  const flexRB = r.FLEX * 0.6;
  const flexWR = r.FLEX * 0.35;
  const flexTE = r.FLEX * 0.05;
  // Bench is ~50% RB, 35% WR, 10% QB/TE depth, rest streamers.
  const benchRB = r.BENCH * 0.45;
  const benchWR = r.BENCH * 0.35;
  const benchQB = r.BENCH * 0.08;
  const benchTE = r.BENCH * 0.07;

  const sf = settings.leagueType === "Superflex" || settings.leagueType === "2QB" ? r.SUPERFLEX || 1 : 0;

  return {
    QB: teams * (r.QB + sf + benchQB),
    RB: teams * (r.RB + flexRB + benchRB),
    WR: teams * (r.WR + flexWR + benchWR),
    TE: teams * (r.TE + flexTE + benchTE),
    K: teams * r.K,
    DST: teams * r.DST,
  };
}

/**
 * Geometric decay: tier weights given a tier count.
 * Lower decay = flatter (top tier closer in $ to bottom). Default 0.55 gives
 * a reasonable auction curve where T1 is ~3-4x T-last.
 */
function tierWeights(numTiers: number, decay = 0.55): number[] {
  const weights: number[] = [];
  for (let i = 0; i < numTiers; i++) weights.push(Math.pow(decay, i));
  return weights;
}

/**
 * Core mapper. Pure function — no side effects.
 *
 * @param rankings flat list of {name, position, tier, projection?}
 * @param settings league settings (used for budget calibration)
 * @param decay tier decay (0.4-0.8 sane range; lower = bigger gap top→bottom)
 */
export function computeTierValues(
  rankings: VetriRanking[],
  settings: LeagueSettings,
  decay = 0.55,
): ComputedValue[] {
  if (!rankings.length) return [];

  const totalLeagueDollars = settings.totalBudget * settings.numTeams;
  // Reserve $1 minimum per roster spot (auction reality).
  const reservePerTeam =
    settings.roster.QB + settings.roster.RB + settings.roster.WR +
    settings.roster.TE + settings.roster.FLEX + settings.roster.SUPERFLEX +
    settings.roster.K + settings.roster.DST + settings.roster.BENCH;
  const reserve = reservePerTeam * settings.numTeams;
  const spendable = Math.max(1, totalLeagueDollars - reserve);

  const posShare = positionShare(settings);
  const leagueSlots = leagueSlotsPerPosition(settings);

  // Group rankings by position.
  const byPos = new Map<Position, VetriRanking[]>();
  for (const r of rankings) {
    if (!byPos.has(r.position)) byPos.set(r.position, []);
    byPos.get(r.position)!.push(r);
  }

  const out: ComputedValue[] = [];

  for (const [pos, list] of byPos.entries()) {
    if (!list.length) continue;
    const posDollars = spendable * (posShare[pos] ?? 0);
    if (posDollars <= 0) {
      // Position not drafted in this league — give nominal $1 to all.
      for (const r of list) {
        out.push({ name: r.name, position: pos, tier: r.tier, value: r.projection ?? 1, source: r.projection ? "vetri-projection" : "vetri" });
      }
      continue;
    }

    // Only the top N rankings actually get drafted at meaningful $.
    // N = league slots for this position. Anything beyond gets $1.
    const draftableN = Math.max(1, Math.round(leagueSlots[pos]));

    // Sort by tier ascending, then by original order so input order breaks ties.
    const sorted = [...list].sort((a, b) => a.tier - b.tier);

    const draftable = sorted.slice(0, draftableN);
    const fillers = sorted.slice(draftableN);

    // Group draftable by tier.
    const tierGroups = new Map<number, VetriRanking[]>();
    for (const r of draftable) {
      if (!tierGroups.has(r.tier)) tierGroups.set(r.tier, []);
      tierGroups.get(r.tier)!.push(r);
    }

    // Sort tiers ascending (1 first).
    const tiers = [...tierGroups.keys()].sort((a, b) => a - b);
    const weights = tierWeights(tiers.length, decay);

    // Each tier's $ pool = (weight / sumWeights × posDollars).
    // Then split equally among players in that tier.
    // Reserve a $1 floor per draftable player so we don't exceed pool.
    const floorPerPlayer = 1;
    const floorTotal = draftable.length * floorPerPlayer;
    const distributable = Math.max(0, posDollars - floorTotal);

    // Weight each tier by (tier weight × players in tier) so larger tiers don't get squeezed unfairly.
    const tierWeightedSum = tiers.reduce(
      (sum, t, i) => sum + weights[i] * tierGroups.get(t)!.length,
      0,
    );

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const players = tierGroups.get(t)!;
      const tierPool =
        tierWeightedSum > 0
          ? (weights[i] * players.length / tierWeightedSum) * distributable
          : 0;
      const perPlayerExtra = tierPool / players.length;
      const perPlayer = floorPerPlayer + perPlayerExtra;

      for (const r of players) {
        const value = r.projection && r.projection > 0
          ? Math.round(r.projection)
          : Math.max(1, Math.round(perPlayer));
        out.push({
          name: r.name,
          position: pos,
          tier: r.tier,
          value,
          source: r.projection ? "vetri-projection" : "vetri",
        });
      }
    }

    // Fillers — $1 each.
    for (const r of fillers) {
      out.push({
        name: r.name,
        position: pos,
        tier: r.tier,
        value: r.projection && r.projection > 0 ? Math.round(r.projection) : 1,
        source: r.projection ? "vetri-projection" : "vetri",
      });
    }
  }

  return out;
}

/**
 * Parse pasted text/CSV into VetriRanking[].
 * Accepts:
 *   - "Name, POS, Tier"           (3 cols)
 *   - "Name, POS, Tier, $value"   (4 cols, $ optional override)
 *   - tab OR comma separated
 *   - lines like "RB1: Bijan, Saquon, McCaffrey" (header → tier)
 * Lenient — skips empty lines and comments (#, //).
 */
export function parseVetriPaste(text: string): VetriRanking[] {
  const out: VetriRanking[] = [];
  if (!text.trim()) return out;

  const lines = text.split(/\r?\n/);
  let currentTier: number | null = null;
  let currentPos: Position | null = null;

  const POS_REGEX = /^(QB|RB|WR|TE|K|DST|D\/ST)/i;

  const pushHeaderForm = (line: string) => {
    // "RB Tier 1:" or "RB1:" or "Tier 1 RB:" or "RB Tier 1 - "
    const m = line.match(/(QB|RB|WR|TE|K|DST|D\/ST)\s*(?:tier\s*)?(\d+)/i)
      || line.match(/tier\s*(\d+)\s*(QB|RB|WR|TE|K|DST|D\/ST)/i);
    if (!m) return false;
    const pos = (m[1] || m[2]).toUpperCase().replace("D/ST", "DST") as Position;
    const tier = parseInt(m[1] && /\d/.test(m[1]) ? m[1] : (m[2] && /\d/.test(m[2]) ? m[2] : "0"), 10);
    if (!Number.isFinite(tier) || tier <= 0) return false;
    currentPos = pos;
    currentTier = tier;
    // Inline players after colon?
    const after = line.split(":")[1];
    if (after && after.trim()) {
      for (const name of after.split(/[,;|]/)) {
        const n = name.trim();
        if (n) out.push({ name: n, position: pos, tier });
      }
    }
    return true;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;

    // Try header form: "RB Tier 1: Bijan, Saquon"
    if (pushHeaderForm(line)) continue;

    // Try delimited row form: "Name, POS, Tier[, $]"
    const parts = line.split(/[,\t]/).map((p) => p.trim());
    if (parts.length >= 3) {
      const name = parts[0];
      const posStr = parts[1].toUpperCase().replace("D/ST", "DST");
      const tierStr = parts[2].replace(/[^\d]/g, "");
      const projStr = parts[3]?.replace(/[^\d.]/g, "");
      if (POS_REGEX.test(posStr) && /^\d+$/.test(tierStr)) {
        out.push({
          name,
          position: posStr as Position,
          tier: parseInt(tierStr, 10),
          projection: projStr ? parseFloat(projStr) : undefined,
        });
        continue;
      }
    }

    // Continuation under a header context
    if (currentTier && currentPos) {
      // Comma-separated names on a line under a tier header
      for (const name of line.split(/[,;|]/)) {
        const n = name.trim();
        if (n) out.push({ name: n, position: currentPos, tier: currentTier });
      }
    }
  }

  return out;
}

/**
 * Merge computed Vetri values into the existing price sheet.
 * Manual overrides (names in `overrides` set) are preserved.
 * Returns a new PriceEstimate[] with Vetri values applied to non-overridden
 * names, plus any rows already in the sheet that aren't in Vetri rankings.
 */
export function mergeVetriIntoPrices(
  existing: PriceEstimate[],
  computed: ComputedValue[],
  overrides: Set<string>,
): PriceEstimate[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const result = new Map<string, PriceEstimate>();

  // Seed with existing rows so we don't lose any.
  for (const p of existing) result.set(norm(p.name), { ...p });

  for (const c of computed) {
    const key = norm(c.name);
    const existingRow = result.get(key);
    if (existingRow && overrides.has(key)) {
      // user override wins — keep existing price, but ensure name from override
      continue;
    }
    result.set(key, {
      name: existingRow?.name ?? c.name,
      price: c.value,
      // @ts-expect-error PriceEstimate may grow position later — keep flexible
      position: c.position,
    });
  }

  return [...result.values()];
}
