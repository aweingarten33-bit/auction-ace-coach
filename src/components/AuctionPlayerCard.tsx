import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  Flame,
  Gauge,
  MessageSquareQuote,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import type { DecisionResult } from "@/lib/decision-engine";
import { computeCardInsights, type OutcomeRow } from "@/lib/card-insights";
import { useDraftStore } from "@/lib/draft-store";
import {
  byeWeekForTeam,
  findPlayerByName,
  loadSleeperPlayers,
} from "@/lib/sleeper";

const LEAGUE_NAME = "BRO WE'RE SENIOR CITIZENS";

interface AuctionPlayerCardProps {
  d: DecisionResult;
}

type SleeperMeta = {
  playerId: string | null;
  team: string | null;
  bye: number | null;
};

const tonePill: Record<OutcomeRow["tone"], string> = {
  good: "bg-emerald-700 text-white",
  ok: "bg-slate-900 text-white",
  warn: "bg-orange-600 text-white",
  bad: "bg-red-700 text-white",
};

export default function AuctionPlayerCard({ d }: AuctionPlayerCardProps) {
  const settings = useDraftStore((s) => s.settings);
  const events = useDraftStore((s) => s.events);
  const keepers = useDraftStore((s) => s.keepers);

  const [meta, setMeta] = useState<SleeperMeta>({
    playerId: null,
    team: null,
    bye: null,
  });

  useEffect(() => {
    let live = true;

    loadSleeperPlayers().then((players) => {
      if (!live || !d.player) return;

      const p = findPlayerByName(players, d.player);

      if (!p) return;

      setMeta({
        playerId: p.player_id,
        team: p.team ?? null,
        bye: byeWeekForTeam(p.team) ?? null,
      });
    });

    return () => {
      live = false;
    };
  }, [d.player]);

  const insights = computeCardInsights(
    d,
    settings,
    events,
    keepers,
  );

  const headshotUrl = meta.playerId
    ? `https://sleepercdn.com/content/nfl/players/${meta.playerId}.jpg`
    : null;

  const teamLogoUrl = meta.team
    ? `https://sleepercdn.com/images/team_logos/nfl/${meta.team.toLowerCase()}.png`
    : null;

  return (
    <article className="mx-auto w-full max-w-[402px] overflow-hidden rounded-[1.35rem] bg-[#f5efe4] text-slate-950 shadow-2xl ring-1 ring-slate-900/15">
      <div className="bg-slate-950 px-3 py-1.5 text-center text-[10px] font-black tracking-[0.16em] text-orange-300">
        ★ LEAGUE: {LEAGUE_NAME} ★
      </div>

      <header className="border-b-4 border-slate-950 bg-orange-500 px-3 py-3">
        <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2">
          <div className="rounded-xl border-2 border-slate-950 bg-white px-1.5 py-1 text-center">
            <div className="text-[8px] font-black tracking-widest text-slate-500">BYE</div>
            <div className="font-mono text-xl font-black leading-none text-slate-950">
              {meta.bye ?? "—"}
            </div>
          </div>

          <div className="min-w-0 text-center">
            <h2 className="truncate text-[1.65rem] font-black uppercase leading-none tracking-[-0.06em] text-white">
              {d.player || "PLAYER"}
            </h2>

            <div className="mt-1 inline-flex items-center rounded-full border border-slate-950 bg-white px-2 py-0.5 text-[10px] font-black tracking-widest text-slate-950">
              {d.position ?? "—"}
              <span className="mx-1.5 text-orange-600">•</span>
              {meta.team ?? "TEAM"}
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-950 bg-white">
            {teamLogoUrl ? (
              <img
                src={teamLogoUrl}
                alt={meta.team ?? "team"}
                className="h-9 w-9 object-contain"
              />
            ) : (
              <Trophy className="h-6 w-6 text-slate-400" />
            )}
          </div>
        </div>
      </header>

      <section className="border-b border-slate-300 p-3">
        <div className="grid grid-cols-[126px_1fr] gap-2">
          <div className="relative min-h-[172px] overflow-hidden rounded-2xl border-2 border-slate-950 bg-gradient-to-b from-orange-200 to-white">
            <div className="absolute inset-x-0 top-0 bg-slate-950 py-1 text-center text-[9px] font-black tracking-widest text-orange-300">
              PLAYER FILE
            </div>

            <div className="absolute inset-x-2 bottom-0 flex justify-center">
              {headshotUrl ? (
                <img
                  src={headshotUrl}
                  alt={d.player}
                  className="h-40 w-auto object-contain drop-shadow-xl"
                />
              ) : (
                <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-400">
                  PHOTO
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <CardPlate
              title="BIG DECISION"
              icon={<Gauge className="h-3.5 w-3.5" />}
            >
              <div className="text-[1.05rem] font-black uppercase leading-none tracking-tight text-orange-600">
                {insights.bigDecision}
              </div>

              <div className="mt-1 text-[10px] font-bold leading-snug text-slate-700">
                {insights.bigDecisionReason}
              </div>
            </CardPlate>

            <CardPlate
              title="PRICE LADDER"
              icon={<BadgeDollarSign className="h-3.5 w-3.5" />}
            >
              <div className="grid gap-1">
                {insights.ladder.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[64px_1fr] overflow-hidden rounded-lg border border-slate-950"
                  >
                    <div
                      className={`px-2 py-1 text-center font-mono text-[13px] font-black ${tonePill[row.tone]}`}
                    >
                      ${row.price}
                    </div>

                    <div className="bg-slate-100 px-2 py-1 text-[11px] font-black">
                      {row.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-red-700 p-2 text-center text-white">
                  <div className="text-[8px] font-black tracking-widest">
                    WALK-AWAY
                  </div>

                  <div className="font-mono text-lg font-black">
                    ${insights.walkAway}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-950 p-2 text-center text-white">
                  <div className="text-[8px] font-black tracking-widest text-orange-300">
                    EXPECTED FINAL
                  </div>

                  <div className="font-mono text-sm font-black">
                    ${insights.expectedFinal - 2}-${insights.expectedFinal + 2}
                  </div>
                </div>
              </div>
            </CardPlate>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-300 p-3">
        <div className="rounded-2xl border-2 border-slate-950 bg-white p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-600" />

            <div className="text-[12px] font-black uppercase">
              IF YOU BUY {firstName(d.player)}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {insights.outcomes.slice(0, 6).map((row) => (
              <div
                key={row.label}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2"
              >
                <div className="text-[9px] font-black uppercase text-slate-500">
                  {row.label}
                </div>

                <div className="mt-1 text-[11px] font-black text-slate-900">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-300 p-3">
        <div className="rounded-2xl border-2 border-slate-950 bg-orange-500 p-3 text-center text-white">
          <div className="text-[9px] font-black tracking-[0.18em] text-white/80">
            PROJECTED TEAM IDENTITY
          </div>

          <div className="mt-1 text-[16px] font-black uppercase leading-none tracking-tight">
            {insights.identity}
          </div>
        </div>
      </section>

      <section className="p-3">
        <div className="rounded-2xl border-2 border-slate-950 bg-white p-3">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-orange-600" />

            <div className="text-[12px] font-black uppercase">
              ANALYST TAKE
            </div>
          </div>

          <div className="mt-2 text-[12px] font-black italic leading-snug text-slate-900">
            {insights.take}
          </div>
        </div>
      </section>
    </article>
  );
}

function CardPlate({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-2 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black tracking-wider text-slate-500">
        <span className="text-orange-600">
          {icon}
        </span>

        {title}
      </div>

      {children}
    </div>
  );
}

function firstName(full?: string) {
  if (!full) return "PLAYER";
  return full.split(" ")[0]?.toUpperCase() ?? "PLAYER";
}
