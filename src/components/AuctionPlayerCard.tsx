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

      {/* ── CONTENT SECTIONS — placeholders to design together ── */}
      <div className="space-y-2 p-3">
        <Section label={`Why draft ${firstName}`} placeholder />
        <Section label="Path to smash" placeholder />
        <Section label="Risk factors" placeholder />
        <Section label="Bottom line" placeholder />
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
