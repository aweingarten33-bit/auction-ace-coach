// Reusable fantasy football auction trading-card.
// Layered visual system styled after the Matthew Berry / Fantasy Focus
// magazine cheat-sheet mockup: cream background, navy + orange accents,
// bold collectible energy, readable in <20 seconds during a live draft.
import { useEffect, useState } from "react";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Footprints,
  Star,
  Sofa,
  AlertTriangle,
  BarChart3,
  Gavel,
  Megaphone,
  Quote,
} from "lucide-react";
import type { DecisionResult } from "@/lib/decision-engine";
import { computeCardInsights, type OutcomeRow } from "@/lib/card-insights";
import { useDraftStore } from "@/lib/draft-store";
import { loadSleeperPlayers, findPlayerByName, byeWeekForTeam } from "@/lib/sleeper";

const LEAGUE_NAME = "BRO WE'RE SENIOR CITIZENS";

const TONE_BG: Record<OutcomeRow["tone"], string> = {
  good: "text-emerald-600",
  ok:   "text-sky-700",
  warn: "text-orange-600",
  bad:  "text-red-600",
};

const LADDER_BG: Record<string, string> = {
  good: "from-emerald-700 to-emerald-900 text-emerald-100",
  ok:   "from-amber-600 to-amber-800 text-amber-50",
  warn: "from-orange-600 to-orange-800 text-orange-50",
  bad:  "from-red-700 to-red-900 text-red-50",
  stop: "from-red-900 to-black text-red-100",
};

interface Props {
  d: DecisionResult;
}

export default function AuctionPlayerCard({ d }: Props) {
  const settings = useDraftStore((s) => s.settings);
  const events = useDraftStore((s) => s.events);
  const keepers = useDraftStore((s) => s.keepers);

  const [headshot, setHeadshot] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [bye, setBye] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    if (!d.player) return;
    loadSleeperPlayers().then((players) => {
      if (!live) return;
      const p = findPlayerByName(players, d.player);
      if (!p) return;
      setHeadshot(`https://sleepercdn.com/content/nfl/players/${p.player_id}.jpg`);
      setTeam(p.team ?? null);
      setBye(byeWeekForTeam(p.team) ?? null);
    });
    return () => { live = false; };
  }, [d.player]);

  const insights = computeCardInsights(d, settings, events, keepers);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#f5efe4] text-slate-900 shadow-2xl ring-1 ring-black/10">
      {/* LAYER 1 — top banner */}
      <div className="flex items-center justify-center bg-slate-900 px-3 py-1.5">
        <Star className="mr-2 h-3 w-3 fill-amber-400 text-amber-400" />
        <span className="text-[10px] font-bold tracking-[0.2em] text-white">LEAGUE:</span>
        <span className="ml-1.5 text-[11px] font-extrabold tracking-wider text-amber-400">
          {LEAGUE_NAME}
        </span>
        <Star className="ml-2 h-3 w-3 fill-amber-400 text-amber-400" />
      </div>

      {/* HEADER — bye badge, name, team */}
      <div className="relative flex items-stretch gap-2 px-3 pt-3">
        <div className="flex shrink-0 flex-col items-center justify-center rounded-md bg-slate-900 px-2.5 py-1.5 text-white">
          <span className="text-[8px] font-bold tracking-widest">BYE</span>
          <span className="text-xl font-black leading-none text-orange-500">{bye ?? "—"}</span>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="truncate text-2xl font-black uppercase leading-tight tracking-tight text-slate-900">
            {d.player || "—"}
          </h2>
          <p className="mt-0.5 text-[10px] font-bold tracking-wider">
            <span className="text-orange-600">{d.position ?? "—"}</span>
            <span className="mx-1.5 text-slate-400">•</span>
            <span className="text-slate-700">{team ?? "—"}</span>
          </p>
        </div>
        <div className="flex w-10 shrink-0 items-center justify-center">
          {team && (
            <img
              src={`https://sleepercdn.com/images/team_logos/nfl/${team.toLowerCase()}.png`}
              alt={team}
              className="h-8 w-8 object-contain"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
        </div>
      </div>

      {/* LAYER 2 — player image + big decision row */}
      <div className="mt-3 grid grid-cols-2 gap-2 px-3">
        <div className="rounded-lg border border-slate-300 bg-white p-2 shadow-sm">
          <div className="flex items-center gap-1.5">
            <div className="rounded-full bg-orange-500 p-1"><Trophy className="h-3 w-3 text-white" /></div>
            <span className="text-[10px] font-extrabold tracking-wider text-slate-900">BIG DECISION</span>
          </div>
          <p className="mt-1.5 text-base font-black leading-tight text-orange-600">
            {insights.bigDecision}
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-700">
            {insights.bigDecisionReason}
          </p>
        </div>

        <div className="relative flex items-end justify-center overflow-hidden rounded-lg bg-gradient-to-br from-orange-200 via-orange-100 to-amber-50">
          {headshot ? (
            <img
              src={headshot}
              alt={d.player}
              className="h-28 w-auto object-contain drop-shadow-xl"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex h-28 items-center text-[10px] text-slate-400">no photo</div>
          )}
        </div>
      </div>

      {/* PRICE LADDER */}
      <div className="mt-3 px-3">
        <div className="rounded-lg border border-slate-300 bg-white p-2.5 shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="rounded-full bg-slate-900 p-1"><DollarSign className="h-3 w-3 text-amber-400" /></div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-900">PRICE LADDER</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-1">
            {insights.ladder.map((row) => (
              <div key={row.label} className="contents">
                <div className={`flex items-center justify-center rounded-l-md bg-gradient-to-r ${LADDER_BG[row.tone]} px-2 py-1 font-mono text-sm font-black tabular-nums`}>
                  {row.price}
                </div>
                <div className={`flex items-center justify-center rounded-r-md bg-gradient-to-r ${LADDER_BG[row.tone]} px-2 py-1 text-[11px] font-black tracking-wider`}>
                  {row.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-center">
              <div className="flex items-center justify-center gap-1 text-[8px] font-bold tracking-widest text-slate-600">
                <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                WALK-AWAY
                <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
              </div>
              <p className="font-mono text-base font-black tabular-nums text-red-600">${insights.walkAway}</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-center">
              <div className="flex items-center justify-center gap-1 text-[8px] font-bold tracking-widest text-slate-600">
                EXPECTED FINAL
                <Gavel className="h-2.5 w-2.5 text-slate-700" />
              </div>
              <p className="font-mono text-base font-black tabular-nums text-slate-900">
                ${Math.max(1, insights.expectedFinal - 2)}–${insights.expectedFinal + 2}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* IF YOU BUY — outcome table */}
      <div className="mt-3 px-3">
        <div className="rounded-lg border border-slate-300 bg-white p-2.5 shadow-sm">
          <p className="text-sm font-black uppercase tracking-tight text-slate-900">
            If You Buy {firstName(d.player)}
          </p>
          <p className="text-[10px] font-bold italic tracking-wider text-orange-600">
            What happens to the rest of your draft?
          </p>
          <div className="mt-2 divide-y divide-slate-200">
            {insights.outcomes.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-1.5">
                  <OutcomeIcon label={row.label} />
                  <span className="text-[11px] font-semibold text-slate-800">{row.label}</span>
                </div>
                <span className={`text-[12px] font-black italic ${TONE_BG[row.tone]}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TEAM IDENTITY + TAKE */}
      <div className="mt-3 grid grid-cols-1 gap-2 px-3 pb-3">
        <div className="rounded-lg border border-slate-300 bg-slate-900 p-2.5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold tracking-widest text-amber-400">
            <Megaphone className="h-3 w-3" />
            PROJECTED TEAM IDENTITY
          </div>
          <p className="mt-1 text-sm font-black tracking-tight text-white">{insights.identity}</p>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-2.5 shadow-sm">
          <div className="flex items-start gap-2">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
            <div>
              <p className="text-[9px] font-bold tracking-widest text-orange-600">ANALYST TAKE</p>
              <p className="mt-0.5 text-[12px] font-semibold italic leading-snug text-slate-800">
                {insights.take}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function firstName(full: string): string {
  if (!full) return "this player";
  const parts = full.split(" ");
  return parts[0] || full;
}

function OutcomeIcon({ label }: { label: string }) {
  const cls = "h-3.5 w-3.5";
  if (label.includes("RB")) return <Footprints className={`${cls} text-orange-600`} />;
  if (label.includes("QB")) return <TrendingUp className={`${cls} text-sky-700`} />;
  if (label.includes("FLEX")) return <Star className={`${cls} text-amber-500`} />;
  if (label.includes("BENCH")) return <Sofa className={`${cls} text-violet-600`} />;
  if (label.includes("RISK")) return <AlertTriangle className={`${cls} text-red-600`} />;
  if (label.includes("CEILING")) return <BarChart3 className={`${cls} text-emerald-600`} />;
  return <Star className={cls} />;
}
