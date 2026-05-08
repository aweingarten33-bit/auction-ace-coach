// Magazine cheat-sheet style player card — research-only.
// Cream bg, navy banner, BYE badge, headshot, team logo. The dollar/why/how
// sections show research data we already have (league 3yr avg, ESPN value,
// last-sold, position rank). Content sections marked "Coming soon" are
// placeholders we'll design together — no bidding/decision logic.
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

  const espnVal = anchor?.marketSources?.espn ?? anchor?.marketPrice;
  const leagueVal = anchor?.leaguePrice;
  const lastSold = history[0];
  const headlinePrice = sheetPrice ?? anchor?.price ?? espnVal;

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

  // Math: compare suggested price vs market values
  const refPrices: number[] = [];
  if (leagueVal != null) refPrices.push(leagueVal);
  if (espnVal != null) refPrices.push(espnVal);
  const marketAvg = refPrices.length
    ? Math.round(refPrices.reduce((a, b) => a + b, 0) / refPrices.length)
    : undefined;
  const suggested = headlinePrice != null ? Math.round(headlinePrice) : undefined;
  const delta = suggested != null && marketAvg != null ? suggested - marketAvg : undefined;
  const valueVerdict =
    delta == null ? null : delta <= -3 ? "VALUE" : delta >= 3 ? "OVERPAY" : "FAIR";

  // Why-draft text
  const whyParts: string[] = [];
  if (suggested != null && marketAvg != null) {
    if (delta! < 0) {
      whyParts.push(
        `Suggested $${suggested} is $${Math.abs(delta!)} UNDER market avg $${marketAvg} — buy-low spot.`
      );
    } else if (delta! > 0) {
      whyParts.push(
        `Suggested $${suggested} is $${delta} OVER market avg $${marketAvg} — only chase if you need ${position}.`
      );
    } else {
      whyParts.push(`Suggested $${suggested} matches market avg $${marketAvg} — fair price.`);
    }
  }
  if (posRank && totalAtPos) {
    whyParts.push(`${position}${posRank} of ${totalAtPos} on the board by price.`);
  }
  if (myGap && (need === "critical" || need === "need")) {
    whyParts.push(`You still need ${myGap.starterShort} starting ${position}.`);
  }

  // Path-to-smash: based on usage rank + injury history
  const pathParts: string[] = [];
  if (posRank && posRank <= 6) {
    pathParts.push(`Top-${posRank} ${position} usage = ceiling pick if healthy.`);
  } else if (posRank && posRank <= 15) {
    pathParts.push(`Mid-tier ${position}; smash case is one tier jump in role.`);
  } else if (posRank) {
    pathParts.push(`Late-round ${position}; smash needs an injury ahead or breakout role.`);
  }
  if (lastSold && marketAvg != null && lastSold.bid < marketAvg - 2) {
    pathParts.push(`Sold for $${lastSold.bid} in '${String(lastSold.season).slice(2)} — room for upside.`);
  }

  // Risk: injury status from anchor + price-vs-budget
  const riskParts: string[] = [];
  if (anchor?.injuryDiscount) {
    const pre = anchor.injuryDiscount.preInjuryPrice;
    const cut = pre - (anchor.price ?? pre);
    if (cut > 0) {
      riskParts.push(`Injury discount of ~$${Math.round(cut)} baked in (${anchor.injuryDiscount.reason}).`);
    }
  }
  if (suggested != null && remaining != null && slotsLeft != null && slotsLeft > 1) {
    const afterRemaining = remaining - suggested;
    const slotsAfter = slotsLeft - 1;
    const avgPerSlotAfter = slotsAfter > 0 ? Math.floor(afterRemaining / slotsAfter) : 0;
    if (avgPerSlotAfter < 2) {
      riskParts.push(
        `Spending $${suggested} leaves $${afterRemaining} for ${slotsAfter} slots ($${avgPerSlotAfter}/slot avg). TOO TIGHT.`
      );
    } else if (avgPerSlotAfter < 5) {
      riskParts.push(
        `After this you'd have $${afterRemaining} for ${slotsAfter} slots ($${avgPerSlotAfter}/slot). Tight.`
      );
    }
  }
  if (suggested != null && maxBid != null && suggested > maxBid) {
    riskParts.push(`Suggested $${suggested} exceeds your max bid $${maxBid}.`);
  }

  // Bottom line
  const bottomParts: string[] = [];
  if (suggested != null) {
    if (need === "critical" || need === "need") {
      bottomParts.push(
        `You NEED ${position}. Pay up to $${suggested}${marketAvg != null ? ` (market $${marketAvg})` : ""}.`
      );
    } else if (need === "depth") {
      bottomParts.push(
        `Depth pick — only at $${Math.max(1, suggested - 2)} or under (${marketAvg != null ? `market $${marketAvg}` : "value play"}).`
      );
    } else {
      bottomParts.push(`Position is filled — pass unless price drops to a bargain.`);
    }
  }
  if (remaining != null && slotsLeft != null) {
    bottomParts.push(`Budget: $${remaining} left, ${slotsLeft} slots.`);
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
      <div className="grid grid-cols-[110px_1fr] gap-3 border-b-2 border-[#1b2238]/10 p-3">
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
            <p className="text-[9px] font-black uppercase tracking-widest text-[#d2691e]">
              Auction value
            </p>
            {headlinePrice != null ? (
              <p className="font-serif text-4xl font-black leading-none">
                ${Math.round(headlinePrice)}
              </p>
            ) : (
              <p className="font-serif text-2xl font-black leading-none text-[#1b2238]/40">
                —
              </p>
            )}
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#1b2238]/60">
              suggested bid
            </p>
          </div>

          {/* Compact price stack */}
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
            {leagueVal != null && (
              <PriceLine label="League 3yr avg" value={`$${Math.round(leagueVal)}`} />
            )}
            {espnVal != null && (
              <PriceLine label="ESPN value" value={`$${Math.round(espnVal)}`} />
            )}
            {sheetPrice != null && (
              <PriceLine label="Your sheet" value={`$${sheetPrice}`} />
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
          <div className="flex items-center justify-between rounded border-2 border-[#1b2238] bg-[#f5efe4] px-2.5 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1b2238]/70">
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
        Research only · No bidding
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

function Section({ label, placeholder }: { label: string; placeholder?: boolean }) {
  return (
    <div className="rounded border border-dashed border-[#1b2238]/30 bg-[#1b2238]/5 px-2.5 py-1.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-[#d2691e]">
        {label}
      </p>
      {placeholder && (
        <p className="mt-0.5 text-[11px] italic text-[#1b2238]/50">
          Coming soon — let's design what goes here.
        </p>
      )}
    </div>
  );
}
