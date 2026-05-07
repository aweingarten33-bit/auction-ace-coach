import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
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

const toneText: Record<OutcomeRow["tone"], string> = {
  good: "text-emerald-700",
  ok: "text-sky-700",
  warn: "text-orange-700",
  bad: "text-red-700",
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

    setMeta({
      playerId: null,
      team: null,
      bye: null,
    });

    if (!d.player) return;

    loadSleeperPlayers()
      .then((players) => {
        if (!live) return;

        const p = findPlayerByName(players, d.player);

        if (!p) return;

        setMeta({
          playerId: p.player_id,
          team: p.team ?? null,
          bye: byeWeekForTeam(p.team) ?? null,
        });
      })
      .catch(() => {
        if (!live) return;

        setMeta({
          playerId: null,
          team: null,
          bye: null,
        });
      });

    return () => {
      live = false;
    };
  }, [d.player]);

  const insights = computeCardInsights(d, settings, events, keepers);

  const derived = useMemo(() => {
    return buildDerivedCopy(d, meta.team, insights.take);
  }, [d, meta.team, insights.take]);

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

      <header className="relative border-b-4 border-slate-950 bg-orange-500 px-3 py-3">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/40" />

        <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2">
          <div className="rounded-xl border-2 border-slate-950 bg-white px-1.5 py-1 text-center shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <div className="text-[8px] font-black tracking-widest text-slate-500">
              BYE
            </div>

            <div className="font-mono text-xl font-black leading-none text-slate-950">
              {meta.bye ?? "—"}
            </div>
          </div>

          <div className="min-w-0 text-center">
            <h2 className="truncate text-[1.65rem] font-black uppercase leading-none tracking-[-0.06em] text-white drop-shadow">
              {d.player || "PLAYER"}
            </h2>

            <div className="mt-1 inline-flex items-center rounded-full border border-slate-950 bg-white px-2 py-0.5 text-[10px] font-black tracking-widest text-slate-950">
              {d.position ?? "—"}
              <span className="mx-1.5 text-orange-600">•</span>
              {meta.team ?? "TEAM"}
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-950 bg-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            {teamLogoUrl ? (
              <img
                src={teamLogoUrl}
                alt={meta.team ?? "team"}
                className="h-9 w-9 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Trophy className="h-6 w-6 text-slate-400" />
            )}
          </div>
        </div>
      </header>

      <section className="border-b border-slate-300 p-3">
        <div className="grid grid-cols-[126px_1fr] gap-2">
          <div className="relative min-h-[172px] overflow-hidden rounded-2xl border-2 border-slate-950 bg-gradient-to-b from-orange-200 to-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <div className="absolute inset-x-0 top-0 bg-slate-950 py-1 text-center text-[9px] font-black tracking-widest text-orange-300">
              PLAYER FILE
            </div>

            <div className="absolute inset-x-2 bottom-0 flex justify-center">
              {headshotUrl ? (
                <img
                  src={headshotUrl}
                  alt={d.player}
                  className="h-40 w-auto object-contain drop-shadow-xl"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-400">
                  PHOTO
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <CardPlate title="BIG DECISION" icon={<Gauge className="h-3.5 w-3.5" />}>
              <div className="text-[1.05rem] font-black uppercase leading-none tracking-tight text-orange-600">
                {insights.bigDecision}
              </div>

              <div className="mt-1 line-clamp-2 text-[10px] font-bold leading-snug text-slate-700">
                {insights.bigDecisionReason}
              </div>
            </CardPlate>

            <CardPlate title="WHY DRAFT HIM" icon={<Sparkles className="h-3.5 w-3.5" />}>
              <div className="line-clamp-3 text-[11px] font-black leading-snug text-slate-900">
                {derived.whyDraftHim}
              </div>
            </CardPlate>

            <CardPlate title="PATH TO SMASH" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>
              <div className="grid gap-1">
                {derived.pathToSmash.slice(0, 2).map((item) => (
                  <MiniBullet key={item}>{item}</MiniBullet>
                ))}
              </div>
            </CardPlate>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[1fr_112px] gap-2 border-b border-slate-300 p-3">
        <div className="rounded-2xl border-2 border-slate-950 bg-white p-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <SectionTitle icon={<BadgeDollarSign className="h-3.5 w-3.5" />} title="PRICE LADDER" />

          <div className="mt-2 grid gap-1">
            {insights.ladder.slice(0, 5).map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[58px_1fr] overflow-hidden rounded-lg border border-slate-950"
              >
                <div className={`px-2 py-1 text-center font-mono text-[13px] font-black tabular-nums ${tonePill[row.tone]}`}>
                  {formatMoney(row.price)}
                </div>

                <div className="bg-slate-100 px-2 py-1 text-[11px] font-black tracking-tight text-slate-950">
                  {row.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <PriceBox label="WALK-AWAY" value={formatMoney(insights.walkAway)} danger />
          <PriceBox label="EXPECTED FINAL" value={formatExpectedFinal(insights.expectedFinal)} />
        </div>
      </section>

      <section className="border-b border-slate-300 p-3">
        <div className="rounded-2xl border-2 border-slate-950 bg-white p-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-end justify-between gap-2">
            <div>
              <SectionTitle icon={<Target className="h-3.5 w-3.5" />} title={`IF YOU BUY ${firstName(d.player)}`} />
              <div className="text-[10px] font-black italic tracking-tight text-orange-600">
                What happens to the rest of your draft?
              </div>
            </div>

            <div className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-black text-orange-300">
              20 SEC READ
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
            {insights.outcomes.slice(0, 6).map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <OutcomeIcon label={row.label} />
                  <span className="truncate text-[9px] font-black text-slate-600">
                    {row.label}
                  </span>
                </div>

                <span className={`shrink-0 text-[10px] font-black ${toneText[row.tone]}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-300 p-3">
        <div className="rounded-2xl border-2 border-slate-950 bg-orange-500 p-2 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <div className="text-[9px] font-black tracking-[0.18em] text-white/80">
            PROJECTED TEAM IDENTITY
          </div>

          <div className="mt-1 text-[16px] font-black uppercase leading-none tracking-tight text-white">
            {insights.identity}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 border-b border-slate-300 p-3">
        <SmallPanel title="WHAT CAN GO WRONG" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
          {derived.risks.slice(0, 2).map((item) => (
            <MiniBullet key={item}>{item}</MiniBullet>
          ))}
        </SmallPanel>

        <SmallPanel title="LEAGUE-WINNING UPSIDE" icon={<Flame className="h-3.5 w-3.5" />}>
          <div className="text-[1.35rem] font-black leading-none text-orange-600">
            {derived.upside.grade}
          </div>

          <div className="mt-1 text-[9px] font-black leading-tight text-slate-700">
            {derived.upside.label}
          </div>
        </SmallPanel>

        <SmallPanel title="IDEAL STACKS" icon={<Users className="h-3.5 w-3.5" />}>
          {derived.idealStacks.slice(0, 2).map((item) => (
            <MiniBullet key={item}>{item}</MiniBullet>
          ))}
        </SmallPanel>
      </section>

      <section className="p-3">
        <div className="rounded-2xl border-2 border-slate-950 bg-white p-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black tracking-tight text-slate-950">
            <MessageSquareQuote className="h-4 w-4 text-orange-600" />
            <span>ANALYST TAKE</span>
          </div>

          <div className="line-clamp-2 text-[12px] font-black italic leading-snug text-slate-900">
            {insights.take || derived.analystTake}
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
      <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black tracking-wider text-slate-500">
        <span className="text-orange-600">{icon}</span>
        {title}
      </div>

      {children}
    </div>
  );
}

function SmallPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[84px] rounded-xl border border-slate-300 bg-white p-2 shadow-sm">
      <div className="mb-1 flex items-center gap-1 text-[8px] font-black leading-tight tracking-wider text-orange-600">
        {icon}
        <span>{title}</span>
      </div>

      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] font-black tracking-tight text-slate-950">
      <span className="text-orange-600">{icon}</span>
      <span>{title}</span>
    </div>
  );
}

function PriceBox({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 border-slate-950 p-2 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${
        danger ? "bg-red-700 text-white" : "bg-slate-950 text-white"
      }`}
    >
      <div className={`text-[8px] font-black tracking-widest ${danger ? "text-red-100" : "text-orange-300"}`}>
        {label}
      </div>

      <div className="mt-1 font-mono text-[1.05rem] font-black leading-none tabular-nums">
        {value}
      </div>
    </div>
  );
}

function MiniBullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-1 text-[9px] font-bold leading-tight text-slate-800">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
      <span className="line-clamp-2">{children}</span>
    </div>
  );
}

function OutcomeIcon({ label }: { label: string }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  const upper = label.toUpperCase();

  if (upper.includes("RB")) return <Target className={`${cls} text-orange-600`} />;
  if (upper.includes("QB")) return <ArrowUpRight className={`${cls} text-sky-700`} />;
  if (upper.includes("FLEX")) return <Sparkles className={`${cls} text-amber-600`} />;
  if (upper.includes("BENCH")) return <Users className={`${cls} text-violet-700`} />;
  if (upper.includes("RISK")) return <AlertTriangle className={`${cls} text-red-700`} />;
  if (upper.includes("CEILING")) return <BarChart3 className={`${cls} text-emerald-700`} />;

  return <Star className={`${cls} text-orange-600`} />;
}

function firstName(full?: string): string {
  if (!full) return "PLAYER";

  return full.split(" ")[0]?.toUpperCase() ?? "PLAYER";
}

function formatMoney(value: string | number): string {
  if (typeof value === "string") {
    return value.startsWith("$") ? value : `$${value}`;
  }

  return `$${value}`;
}

function formatExpectedFinal(value: string | number): string {
  if (typeof value === "string") {
    return value.includes("$") ? value : `$${value}`;
  }

  const low = Math.max(1, value - 2);
  const high = value + 2;

  return `$${low}–$${high}`;
}

function buildDerivedCopy(
  d: DecisionResult,
  team: string | null,
  take: string,
) {
  const position = d.position ?? "player";
  const anchor = d.anchorPrice || d.goUpTo || d.currentPrice || 1;
  const isElite = anchor >= 45;
  const isPremium = anchor >= 25;
  const teamLabel = team ?? "team";

  const whyDraftHim = (() => {
    if (isElite) {
      return "Ceiling swing piece who can change the whole week with one monster game.";
    }

    if (isPremium) {
      return "Strong starter price with enough weekly juice to tilt close matchups.";
    }

    if (d.verdict === "BID") {
      return "Value pocket target who keeps the build alive without wrecking budget.";
    }

    return "Only worth it if the room lets the price fall under market.";
  })();

  const pathToSmash = (() => {
    if (position === "QB") {
      return ["Rushing/volume edge holds", "Stack partner stays healthy"];
    }

    if (position === "RB") {
      return ["Goal-line role sticks", "Passing-down work climbs"];
    }

    if (position === "WR") {
      return ["Target share stays alpha", "Offense plays fast"];
    }

    if (position === "TE") {
      return ["Routes stay elite", "Red-zone looks spike"];
    }

    return ["Price stays cheap", "Role beats projection"];
  })();

  const risks = (() => {
    if (d.plan.status === "broken") {
      return ["Budget damage", "Depth gets squeezed"];
    }

    if (d.plan.status === "tight") {
      return ["Thin bench", "Must hit cheap values"];
    }

    if (isElite) {
      return ["Premium cost", "One injury hurts build"];
    }

    return ["Role volatility", "Easy to replace"];
  })();

  const upside = (() => {
    if (isElite) {
      return {
        grade: "A+",
        label: "Week-winner profile",
      };
    }

    if (isPremium) {
      return {
        grade: "A",
        label: "Real ceiling",
      };
    }

    if (anchor >= 12) {
      return {
        grade: "B",
        label: "Useful spike weeks",
      };
    }

    return {
      grade: "C+",
      label: "Value dart",
    };
  })();

  const idealStacks = (() => {
    if (position === "QB") {
      return ["Top pass-catcher", "Late upside WR"];
    }

    if (position === "WR" || position === "TE") {
      return [`${teamLabel} QB`, "Cheap RB value"];
    }

    if (position === "RB") {
      return ["Value WRs", "Mobile QB"];
    }

    return ["Bench upside", "Low-cost depth"];
  })();

  const analystTake = take || "Do not overthink it: follow the price, protect the build, and keep your walk-away number clean.";

  return {
    whyDraftHim,
    pathToSmash,
    risks,
    upside,
    idealStacks,
    analystTake,
  };
}
