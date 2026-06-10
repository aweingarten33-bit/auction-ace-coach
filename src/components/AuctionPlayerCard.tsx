// Magazine cheat-sheet style player card — research-only.
// Cream bg, navy banner, BYE badge, headshot, team logo, roster math,
// and the blended PDF cheat sheet + DraftSharks Superflex price.

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  loadSleeperPlayers,
  findPlayerByName,
  byeWeekForTeam,
} from "@/lib/sleeper";
import type { Position } from "@/lib/draft-types";
import type { AnchorEntry } from "@/lib/decision-engine";

const fmt = (n: number) => `$${Math.round(n)}`;

interface RosterGap {
  pos: string;
  starterShort: number;
  severity: "critical" | "need" | "depth" | "done";
}

interface Props {
  name: string;
  position?: Position;
  leagueName?: string;
  sheetPrice?: number;
  anchor?: AnchorEntry;
  posRank?: number;
  totalAtPos?: number;
  // Roster context — drives the personalized section copy
  remaining?: number;        // $ left in your budget
  maxBid?: number;           // most you can spend on any one player
  slotsLeft?: number;        // roster slots remaining
  gaps?: RosterGap[];        // your starter gaps by position
}

export default function AuctionPlayerCard({
  name,
  position,
  leagueName,
  sheetPrice,
  anchor,
  posRank,
  totalAtPos,
  remaining,
  maxBid,
  slotsLeft,
  gaps,
}: Props) {
  const [meta, setMeta] = useState<{
    playerId: string | null;
    team: string | null;
    bye: number | null;
  }>({ playerId: null, team: null, bye: null });
  const [history, setHistory] = useState<Array<{ season: number; bid: number }>>([]);

  useEffect(() => {
    let live = true;
    setMeta({ playerId: null, team: null, bye: null });
    if (!name) return;
    loadSleeperPlayers()
      .then((players) => {
        if (!live) return;
        const p = findPlayerByName(players, name);
        if (!p) return;
        setMeta({
          playerId: p.player_id,
          team: p.team ?? null,
          bye: byeWeekForTeam(p.team) ?? null,
        });
      })
      .catch(() => live && setMeta({ playerId: null, team: null, bye: null }));
    return () => { live = false; };
  }, [name]);

  useEffect(() => {
    if (!name) { setHistory([]); return; }
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("league_auction_history")
        .select("season, bid_amount")
        .ilike("player_name", name)
        .order("season", { ascending: false })
        .limit(5);
      if (!live) return;
      setHistory(((data ?? []) as Array<{ season: number; bid_amount: number }>).map(
        (r) => ({ season: r.season, bid: r.bid_amount })
      ));
    })();
    return () => { live = false; };
  }, [name]);

  const headshot = meta.playerId
    ? `https://sleepercdn.com/content/nfl/players/${meta.playerId}.jpg`
    : null;
  const teamLogo = meta.team
    ? `https://sleepercdn.com/images/team_logos/nfl/${meta.team.toLowerCase()}.png`
    : null;

  const sleeperVal = anchor?.marketSources?.sleeper;
  const espnVal = anchor?.marketSources?.espn ?? anchor?.marketPrice;
  // Berry from Fantasy Life (Firecrawl-scraped, superflex-adjusted, blended in edge fn).
  // Falls back to user's price sheet only if no Berry value found for this player.
  const berryVal = anchor?.marketSources?.berry ?? sheetPrice;
  const leagueVal = anchor?.leaguePrice;
  const lastSold = history[0];

  const analystInputs = [berryVal, sleeperVal].filter((v): v is number => typeof v === "number" && v > 0);
  const analystAvg = analystInputs.length
    ? Math.round(analystInputs.reduce((a, b) => a + b, 0) / analystInputs.length)
    : undefined;
  const headlinePrice = analystAvg ?? sheetPrice ?? anchor?.price ?? sleeperVal ?? espnVal;
  const suggested = headlinePrice != null ? Math.round(headlinePrice) : undefined;
  const marketAvg = analystAvg ?? anchor?.marketPrice ?? (espnVal && sleeperVal ? Math.round((espnVal + sleeperVal) / 2) : espnVal ?? sleeperVal ?? leagueVal);
  const delta = suggested != null && marketAvg != null ? suggested - Math.round(marketAvg) : undefined;
  const valueVerdict = delta == null ? null : delta <= -3 ? "VALUE" : delta >= 3 ? "OVERPAY" : "FAIR";

  const firstName = name.split(" ")[0] || "Player";

  // ── Personalized section copy (math + your roster context) ───────────
  const myGap = position && gaps ? gaps.find((g) => g.pos === position) : undefined;
  const need = myGap?.severity ?? "depth";
  const needLabel: Record<string, string> = {
    critical: `CRITICAL hole at ${position}`,
    need: `Open starter at ${position}`,
    depth: `Depth at ${position}`,
    done: `${position} starters filled`,
  };
  const needsLeft = (gaps ?? [])
    .filter((g) => g.starterShort > 0)
    .map((g) => `${g.starterShort} ${g.pos}`)
    .join(", ");
  const rosterLine = remaining != null && slotsLeft != null
    ? `Your roster math now: ${fmt(remaining)} left for ${slotsLeft} slots${needsLeft ? `; starter needs left: ${needsLeft}` : "; starter spots are covered"}.`
    : needsLeft
      ? `Starter needs left: ${needsLeft}.`
      : "Starter spots are covered; this is about value/depth.";
  const afterRemaining = suggested != null && remaining != null ? remaining - suggested : undefined;
  const slotsAfter = slotsLeft != null ? Math.max(0, slotsLeft - 1) : undefined;
  const avgPerSlotAfter = afterRemaining != null && slotsAfter != null && slotsAfter > 0
    ? Math.floor(afterRemaining / slotsAfter)
    : undefined;

  // Why-draft text
  const whyParts: string[] = [rosterLine];
  if (suggested != null && marketAvg != null) {
    const roundedMarket = Math.round(marketAvg);
    const math = `${fmt(suggested)} price vs ${fmt(roundedMarket)} blended value = ${delta! >= 0 ? "+" : "-"}${fmt(Math.abs(delta!))}`;
    if (delta! < 0) {
      whyParts.push(`${math}; discount if you still need ${position ?? "this position"}.`);
    } else if (delta! > 0) {
      whyParts.push(`${math}; premium only makes sense if the roster hole is real.`);
    } else {
      whyParts.push(`${math}; fair blend, not generic app pricing.`);
    }
  }
  if (posRank && totalAtPos) {
    whyParts.push(`${position}${posRank} of ${totalAtPos} by auction value, so compare him to your remaining ${position} need.`);
  }
  if (myGap && (need === "critical" || need === "need")) {
    whyParts.push(`You still need ${myGap.starterShort} starting ${position}; this card is judging him against that hole.`);
  }

  // Path-to-smash: based on rank + blended value context
  const pathParts: string[] = [];
  if (posRank && posRank <= 6) {
    pathParts.push(`Top-${posRank} ${position} profile; the blended value already prices him like a difference-maker.`);
  } else if (posRank && posRank <= 15) {
    pathParts.push(`Mid-tier ${position}; payoff is beating the blended ${marketAvg ? fmt(marketAvg) : "market"} number while your expensive slots stay intact.`);
  } else if (posRank) {
    pathParts.push(`Late ${position}; path is cheap depth or injury-away upside.`);
  }
  if (lastSold && marketAvg != null && lastSold.bid < marketAvg - 2) {
    pathParts.push(`Your league last paid ${fmt(lastSold.bid)} in '${String(lastSold.season).slice(2)}, below today's ${fmt(marketAvg)} blend.`);
  }


  // Risk: injury status from anchor + price-vs-budget
  const riskParts: string[] = [];
  if (anchor?.injuryDiscount) {
    const pre = anchor.injuryDiscount.preInjuryPrice;
    const cut = pre - (anchor.price ?? pre);
    if (cut > 0) {
      riskParts.push(`Availability discount of ~${fmt(cut)} baked in (${anchor.injuryDiscount.reason}).`);
    }
  }
  if (suggested != null && afterRemaining != null && slotsAfter != null && slotsLeft != null && slotsLeft > 1) {
    if (avgPerSlotAfter != null && avgPerSlotAfter < 2) {
      riskParts.push(`At ${fmt(suggested)}, you have ${fmt(afterRemaining)} for ${slotsAfter} slots (${fmt(avgPerSlotAfter)}/slot). TOO TIGHT.`);
    } else if (avgPerSlotAfter != null && avgPerSlotAfter < 5) {
      riskParts.push(`At ${fmt(suggested)}, you have ${fmt(afterRemaining)} for ${slotsAfter} slots (${fmt(avgPerSlotAfter)}/slot). Tight.`);
    } else {
      riskParts.push(`At ${fmt(suggested)}, remaining build is ${fmt(afterRemaining)} for ${slotsAfter} slots (${fmt(avgPerSlotAfter ?? 0)}/slot).`);
    }
  }
  if (suggested != null && maxBid != null && suggested > maxBid) {
    riskParts.push(`${fmt(suggested)} is above your max single-player spend ${fmt(maxBid)}.`);
  }

  // Bottom line
  const bottomParts: string[] = [];
  if (suggested != null) {
    const roundedMarket = marketAvg != null ? Math.round(marketAvg) : undefined;
    const math = roundedMarket != null ? `${fmt(suggested)} - ${fmt(roundedMarket)} = ${delta! >= 0 ? "+" : "-"}${fmt(Math.abs(delta!))}` : `${fmt(suggested)} current value`;
    if (need === "critical" || need === "need") {
      bottomParts.push(`${needLabel[need]}: ${math}. If you tap him, the key is whether ${fmt(afterRemaining ?? 0)} for ${slotsAfter ?? 0} slots still fits your build.`);
    } else if (need === "depth") {
      bottomParts.push(`Depth only: ${math}. Better if he falls below the blended cheat-sheet number.`);
    } else {

      bottomParts.push(`Position filled: ${math}. This has to be a clear discount, not another spend slot.`);
    }
  }
  if (remaining != null && slotsLeft != null) {
    bottomParts.push(`Current inputs: ${fmt(remaining)} remaining, ${slotsLeft} roster slots left${maxBid != null ? `, ${fmt(maxBid)} max single-player spend` : ""}.`);
  }

  return (
    // Cream magazine-card background
    <div className="rounded-xl bg-[#f5efe4] text-[#1b2238] shadow-lg ring-1 ring-[#1b2238]/15 overflow-hidden">
      {/* ── TOP BANNER ─────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 bg-[#1b2238] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f5efe4]">
        <Star className="h-3 w-3 fill-[#f5b339] text-[#f5b339]" />
        <span>League: {leagueName || "your league"}</span>
        <Star className="h-3 w-3 fill-[#f5b339] text-[#f5b339]" />
      </div>

      {/* ── HEADER ROW ─────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b-2 border-[#1b2238]/10 px-3 py-2.5">
        {/* BYE pill */}
        <div className="flex flex-col items-center justify-center rounded bg-[#1b2238] px-2 py-1 text-[#f5efe4]">
          <span className="text-[8px] font-bold uppercase tracking-widest">Bye</span>
          <span className="font-mono text-base font-black leading-none">
            {meta.bye ?? "—"}
          </span>
        </div>

        {/* Name + pos/team */}
        <div className="min-w-0 flex-1 px-1">
          <h2 className="truncate font-serif text-[20px] font-black leading-tight">
            {name || "PLAYER"}
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2238]/70">
            {position ?? "—"} · {meta.team ?? "FA"}
            {posRank != null && (
              <span className="ml-1 text-[#d2691e]">
                · {position}{posRank}{totalAtPos ? ` of ${totalAtPos}` : ""}
              </span>
            )}
          </p>
        </div>

        {/* Team logo */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          {teamLogo ? (
            <img
              src={teamLogo}
              alt={meta.team ?? "team"}
              className="h-10 w-10 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[#1b2238]/10" />
          )}
        </div>
      </div>

      {/* ── PHOTO + HEADLINE PRICE ─────────────────────── */}
      <div className="grid grid-cols-[96px_1fr] gap-3 border-b-2 border-[#1b2238]/10 p-3 sm:grid-cols-[110px_1fr]">
        <div className="aspect-[3/4] overflow-hidden rounded border-2 border-[#1b2238] bg-[#1b2238]/5">
          {headshot ? (
            <img
              src={headshot}
              alt={name}
              className="h-full w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-[#1b2238]/40">
              No photo
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#d2691e]">
              Blended cheat-sheet value
            </p>
            {headlinePrice != null ? (
              <p className="font-serif text-[42px] font-black leading-none">
                ${Math.round(headlinePrice)}
              </p>
            ) : (
              <p className="font-serif text-2xl font-black leading-none text-[#1b2238]/40">
                —
              </p>
            )}
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#1b2238]/60">
              PDF + DraftSharks blend
            </p>
          </div>

          {/* Compact price stack */}
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
            {sheetPrice != null && (
              <PriceLine label="Cheat sheet" value={`$${Math.round(sheetPrice)}`} />
            )}
            {leagueVal != null && (
              <PriceLine label="League 3yr avg" value={`$${Math.round(leagueVal)}`} />
            )}
            {anchor?.price != null && (
              <PriceLine label="League final blend" value={`$${Math.round(anchor.price)}`} />
            )}
            {lastSold && (
              <PriceLine
                label="Last sold"
                value={`$${lastSold.bid} '${String(lastSold.season).slice(2)}`}
              />
            )}
          </div>
        </div>
      </div>


      {/* Mobile quick-read strip: keep recommendation visible while scrolling */}
      <div className="sticky top-0 z-10 border-y border-[#1b2238]/20 bg-[#f5efe4]/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-[#f5efe4]/80">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2238]/70">Recommendation</p>
            <p className="truncate text-sm font-black">
              {valueVerdict ?? "FAIR"}{suggested != null ? ` · target ${fmt(suggested)}` : ""}
            </p>
          </div>
          {maxBid != null && (
            <div className="rounded border border-[#1b2238]/25 px-2 py-1 text-right">
              <p className="text-[9px] uppercase tracking-wider text-[#1b2238]/60">Max bid</p>
              <p className="font-mono text-sm font-bold">{fmt(maxBid)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT SECTIONS — personalized to your roster ── */}
      <div className="space-y-2 p-3">
        {myGap && (
          <div className="flex items-center justify-between rounded bg-[#1b2238] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#f5efe4]">
            <span>Your need</span>
            <span className={
              need === "critical" ? "text-[#ff7a59]" :
              need === "need" ? "text-[#f5b339]" :
              need === "depth" ? "text-[#f5efe4]" : "text-[#f5efe4]/60"
            }>{needLabel[need]}</span>
          </div>
        )}
        {valueVerdict && (
          <div className="flex items-center justify-between rounded border-2 border-[#1b2238] bg-[#f5efe4] px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1b2238]/70">
              Price vs market
            </span>
            <span className={
              "font-mono text-sm font-black " +
              (valueVerdict === "VALUE" ? "text-emerald-700" :
               valueVerdict === "OVERPAY" ? "text-rose-700" : "text-[#1b2238]")
            }>
              {valueVerdict} ({delta! >= 0 ? "+" : ""}${delta})
            </span>
          </div>
        )}
        <Section label={`Why draft ${firstName}`} body={whyParts} />
        <Section label="Path to smash" body={pathParts} />
        <Section label="Risk factors" body={riskParts} tone="warning" />
        <Section label="Bottom line" body={bottomParts} tone="bold" />
      </div>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <div className="bg-[#1b2238] px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-[#f5efe4]/70">
        Research only · PDF cheat sheet + DraftSharks blend
      </div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-[9px] uppercase tracking-wider text-[#1b2238]/60">{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}

function Section({
  label,
  body,
  tone,
}: {
  label: string;
  body?: string[];
  tone?: "warning" | "bold";
}) {
  const items = (body ?? []).filter(Boolean);
  const toneCls =
    tone === "warning"
      ? "border-rose-700/40 bg-rose-700/5"
      : tone === "bold"
      ? "border-[#1b2238]/40 bg-[#1b2238]/10"
      : "border-[#1b2238]/30 bg-[#1b2238]/5";
  return (
    <div className={`rounded border ${toneCls} px-2.5 py-1.5`}>
      <p className="text-[9px] font-black uppercase tracking-widest text-[#d2691e]">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-0.5 text-[11px] italic text-[#1b2238]/40">
          Not enough data yet — pick a player with a price to see math.
        </p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-[11px] leading-snug">
          {items.map((t, i) => (
            <li key={i} className="flex gap-1">
              <span className="text-[#d2691e]">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
