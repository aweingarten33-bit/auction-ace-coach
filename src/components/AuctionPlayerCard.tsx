// Fantasy Focus magazine cheat-sheet card.
// Cream bg, navy + orange palette, collectible energy, mobile-first 402px.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Footprints,
  Gavel,
  HeartPulse,
  Megaphone,
  Quote,
  ShieldCheck,
  Smile,
  Sofa,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
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

interface Props {
  d: DecisionResult;
}

type SleeperMeta = {
  playerId: string | null;
  team: string | null;
  teamFull: string | null;
  bye: number | null;
};

const TEAM_FULL: Record<string, string> = {
  ARI: "Arizona Cardinals", ATL: "Atlanta Falcons", BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills", CAR: "Carolina Panthers", CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals", CLE: "Cleveland Browns", DAL: "Dallas Cowboys",
  DEN: "Denver Broncos", DET: "Detroit Lions", GB: "Green Bay Packers",
  HOU: "Houston Texans", IND: "Indianapolis Colts", JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs", LAC: "Los Angeles Chargers", LAR: "Los Angeles Rams",
  LV: "Las Vegas Raiders", MIA: "Miami Dolphins", MIN: "Minnesota Vikings",
  NE: "New England Patriots", NO: "New Orleans Saints", NYG: "New York Giants",
  NYJ: "New York Jets", PHI: "Philadelphia Eagles", PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks", SF: "San Francisco 49ers", TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans", WAS: "Washington Commanders",
};

const LADDER_COLORS: Record<OutcomeRow["tone"] | "stop", string> = {
  good: "bg-gradient-to-r from-emerald-700 to-emerald-600 text-white",
  ok:   "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900",
  warn: "bg-gradient-to-r from-orange-600 to-orange-500 text-white",
  bad:  "bg-gradient-to-r from-red-700 to-red-600 text-white",
  stop: "bg-gradient-to-r from-red-900 to-red-800 text-white",
};

const TONE_TEXT: Record<OutcomeRow["tone"], string> = {
  good: "text-emerald-700",
  ok:   "text-sky-700",
  warn: "text-orange-600",
  bad:  "text-red-600",
};

export default function AuctionPlayerCard({ d }: Props) {
  const settings = useDraftStore((s) => s.settings);
  const events = useDraftStore((s) => s.events);
  const keepers = useDraftStore((s) => s.keepers);

  const [meta, setMeta] = useState<SleeperMeta>({
    playerId: null, team: null, teamFull: null, bye: null,
  });

  useEffect(() => {
    let live = true;
    setMeta({ playerId: null, team: null, teamFull: null, bye: null });
    if (!d.player) return;
    loadSleeperPlayers().then((players) => {
      if (!live) return;
      const p = findPlayerByName(players, d.player);
      if (!p) return;
      const team = p.team ?? null;
      setMeta({
        playerId: p.player_id,
        team,
        teamFull: team ? (TEAM_FULL[team] ?? team) : null,
        bye: byeWeekForTeam(team) ?? null,
      });
    }).catch(() => {});
    return () => { live = false; };
  }, [d.player]);

  const insights = computeCardInsights(d, settings, events, keepers);
  const copy = useMemo(() => buildCopy(d, insights), [d, insights]);

  const headshotUrl = meta.playerId
    ? `https://sleepercdn.com/content/nfl/players/${meta.playerId}.jpg`
    : null;
  const teamLogoUrl = meta.team
    ? `https://sleepercdn.com/images/team_logos/nfl/${meta.team.toLowerCase()}.png`
    : null;

  const ladderRows = insights.ladder.slice(0, 5);

  return (
    <article style={{ backgroundColor: "#f5efe4", color: "#0f172a" }} className="mx-auto w-full max-w-[402px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-900/15">
      {/* LEAGUE BANNER */}
      <div className="flex items-center justify-center gap-1.5 px-3 pt-3">
        <div className="flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1">
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          <span className="text-[9px] font-black tracking-[0.18em] text-white">LEAGUE:</span>
          <span className="text-[10px] font-black tracking-wider text-orange-400">{LEAGUE_NAME}</span>
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
        </div>
      </div>

      {/* HEADER */}
      <header className="flex items-center gap-2 px-3 pt-2">
        <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-slate-950 px-2 py-1.5">
          <span className="text-[8px] font-black tracking-widest text-white">BYE</span>
          <span className="text-xl font-black leading-none text-orange-500">{meta.bye ?? "—"}</span>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="truncate text-[1.5rem] font-black uppercase leading-none tracking-tight text-slate-950">
            {d.player || "PLAYER"}
          </h2>
          <p className="mt-1 text-[10px] font-black tracking-widest">
            <span className="text-orange-600">{d.position ?? "—"}</span>
            <span className="mx-1.5 text-slate-400">•</span>
            <span className="text-slate-800">{(meta.teamFull ?? meta.team ?? "TEAM").toUpperCase()}</span>
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          {teamLogoUrl ? (
            <img src={teamLogoUrl} alt={meta.team ?? ""} className="h-9 w-9 object-contain"
              onError={(e) => ((e.currentTarget.style.display = "none"))} />
          ) : (
            <Trophy className="h-6 w-6 text-slate-300" />
          )}
        </div>
      </header>

      {/* WHY + PHOTO + PATH */}
      <section className="grid grid-cols-[1fr_96px_1fr] items-stretch gap-2 px-3 pt-3">
        <Panel>
          <PanelTitle icon={<Trophy className="h-3.5 w-3.5 text-white" />} iconBg="bg-orange-500">
            WHY YOU DRAFT HIM
          </PanelTitle>
          <p className="mt-1.5 text-[10px] font-semibold leading-snug text-slate-800">
            {copy.whyDraftHim}
          </p>
        </Panel>

        <div className="relative flex items-end justify-center">
          {headshotUrl ? (
            <img
              src={headshotUrl}
              alt={d.player}
              className="h-[120px] w-auto object-contain drop-shadow-[0_4px_8px_rgba(234,88,12,0.4)]"
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
          ) : (
            <div className="flex h-[120px] w-full items-end justify-center text-[10px] text-slate-400">
              no photo
            </div>
          )}
        </div>

        <Panel>
          <PanelTitle icon={<TrendingUp className="h-3.5 w-3.5 text-navy" />} iconBg="bg-slate-950">
            PATH TO SMASH
          </PanelTitle>
          <ul className="mt-1.5 space-y-1">
            {copy.pathToSmash.map((item) => (
              <li key={item} className="flex items-start gap-1">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                <span className="text-[10px] font-semibold leading-tight text-slate-800">{item}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* PRICE LADDER + IF YOU BUY */}
      <section className="grid grid-cols-[160px_1fr] gap-2 px-3 pt-3">
        <div className="space-y-2">
          <Panel>
            <PanelTitle icon={<DollarSign className="h-3.5 w-3.5 text-amber-400" />} iconBg="bg-slate-950">
              PRICE LADDER
            </PanelTitle>
            <div className="mt-1 grid grid-cols-2 gap-x-1 px-0.5 text-[7px] font-black tracking-widest text-slate-500">
              <span>PRICE</span>
              <span className="text-right">REACTION</span>
            </div>
            <div className="mt-1 space-y-1">
              {ladderRows.map((row) => (
                <div key={row.label} className={`grid grid-cols-2 overflow-hidden rounded ${LADDER_COLORS[row.tone]}`}>
                  <div className="px-1.5 py-1 font-mono text-[11px] font-black tabular-nums">{row.price}</div>
                  <div className="px-1.5 py-1 text-right text-[10px] font-black tracking-wider">{row.label}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="text-center">
            <div className="flex items-center justify-center gap-1 text-[8px] font-black tracking-widest text-slate-700">
              <AlertTriangle className="h-2.5 w-2.5 text-red-600" />
              WALK-AWAY PRICE
              <AlertTriangle className="h-2.5 w-2.5 text-red-600" />
            </div>
            <p className="font-mono text-lg font-black tabular-nums text-red-600">${insights.walkAway}</p>
          </Panel>

          <Panel className="text-center">
            <div className="text-[8px] font-black tracking-widest text-slate-700">EXPECTED FINAL BID</div>
            <p className="flex items-center justify-center gap-1 font-mono text-base font-black tabular-nums text-slate-950">
              ${Math.max(1, insights.expectedFinal - 2)}–${insights.expectedFinal + 2}
              <Gavel className="h-3 w-3 text-slate-700" />
            </p>
          </Panel>
        </div>

        <Panel>
          <h3 className="text-[14px] font-black uppercase tracking-tight text-slate-950">
            IF YOU BUY {firstName(d.player).toUpperCase()}:
          </h3>
          <p className="text-[9px] font-black italic tracking-wider text-orange-600">
            WHAT HAPPENS TO THE REST OF YOUR DRAFT?
          </p>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 text-[10px]">
            <div className="text-[7px] font-black tracking-widest text-slate-500">OUTCOME</div>
            <div className="text-right text-[7px] font-black tracking-widest text-slate-500">EFFECT</div>
            {insights.outcomes.map((row) => (
              <div key={row.label} className="contents">
                <div className="flex items-center gap-1.5 border-t border-slate-200 py-1">
                  <OutcomeIcon label={row.label} />
                  <span className="text-[10px] font-bold text-slate-800">{row.label}</span>
                </div>
                <div className={`border-t border-slate-200 py-1 text-right text-[10px] font-black italic ${TONE_TEXT[row.tone]}`}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* RISKS / UPSIDE / STACKS */}
      <section className="grid grid-cols-3 gap-2 px-3 pt-3">
        <Panel>
          <PanelTitle icon={<AlertTriangle className="h-3 w-3 text-red-600" />} iconBg="bg-transparent">
            <span className="text-red-700">WHAT CAN GO WRONG?</span>
          </PanelTitle>
          <ul className="mt-1.5 space-y-1">
            {copy.risks.map((r) => (
              <li key={r} className="flex items-start gap-1">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-600" />
                <span className="text-[9px] font-semibold leading-tight text-slate-800">{r}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelTitle icon={<Trophy className="h-3 w-3 text-amber-500" />} iconBg="bg-transparent">
            <span className="text-slate-950">LEAGUE-WINNING UPSIDE</span>
          </PanelTitle>
          <div className="mt-1.5 space-y-1 text-[9px]">
            {copy.upside.map((u) => (
              <div key={u.label} className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <u.Icon className="h-3 w-3 text-orange-500" />
                  {u.label}
                </span>
                <span className={`font-black ${u.color}`}>{u.value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelTitle icon={<Users className="h-3 w-3 text-slate-950" />} iconBg="bg-transparent">
            <span className="text-slate-950">IDEAL STACKS</span>
          </PanelTitle>
          <ul className="mt-1.5 space-y-1">
            {copy.stacks.map((s) => (
              <li key={s} className="flex items-start gap-1">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-orange-500" />
                <span className="text-[9px] font-semibold leading-tight text-slate-800">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* DRAFT ROOM VIBE / TIER / DRAFT IF */}
      <section className="grid grid-cols-3 gap-2 px-3 pt-3">
        <Panel>
          <PanelTitle icon={<Megaphone className="h-3 w-3 text-sky-700" />} iconBg="bg-transparent">
            <span className="text-slate-950">DRAFT ROOM VIBE</span>
          </PanelTitle>
          <p className="mt-1.5 text-[9px] font-semibold leading-tight text-slate-800">
            {copy.vibe}
          </p>
        </Panel>

        <Panel className="text-center">
          <PanelTitle icon={<Star className="h-3 w-3 fill-amber-400 text-amber-400" />} iconBg="bg-transparent">
            <span className="text-slate-950">TIER</span>
          </PanelTitle>
          <div className="mt-1.5 rounded-md border-2 border-orange-500 bg-slate-950 px-2 py-1.5">
            <span className="font-mono text-base font-black italic tracking-wider text-orange-500">
              {copy.tier.label}
            </span>
          </div>
          <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-700">
            {copy.tier.sub}
          </p>
        </Panel>

        <Panel>
          <PanelTitle icon={<Target className="h-3 w-3 text-slate-950" />} iconBg="bg-transparent">
            <span className="text-slate-950">DRAFT IF...</span>
          </PanelTitle>
          <ul className="mt-1.5 space-y-1">
            {copy.draftIf.map((s) => (
              <li key={s} className="flex items-start gap-1">
                <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-600" />
                <span className="text-[9px] font-semibold leading-tight text-slate-800">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* ARCHETYPE + BOTTOM LINE */}
      <section className="grid grid-cols-[1fr_1.4fr] gap-2 px-3 pb-3 pt-3">
        <Panel>
          <PanelTitle icon={<Zap className="h-3 w-3 text-sky-700" />} iconBg="bg-transparent">
            <span className="text-slate-950">PLAYER ARCHETYPE</span>
          </PanelTitle>
          <p className="mt-1.5 text-[9px] font-semibold leading-tight text-slate-800">
            {copy.archetype}
          </p>
        </Panel>

        <Panel>
          <div className="flex items-start gap-1.5">
            <Quote className="h-4 w-4 shrink-0 text-orange-500" />
            <div className="min-w-0">
              <div className="text-[9px] font-black tracking-widest text-orange-600">ANALYST BOTTOM LINE</div>
              <p className="mt-0.5 text-[10px] font-semibold italic leading-snug text-slate-800">
                {insights.take}
              </p>
            </div>
          </div>
        </Panel>
      </section>
    </article>
  );
}

// ────────────────────────────── primitives ──────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-300 bg-white p-2 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function PanelTitle({
  icon, iconBg, children,
}: { icon: ReactNode; iconBg: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex h-4 w-4 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </div>
      <span className="text-[10px] font-black tracking-wider text-slate-950">{children}</span>
    </div>
  );
}

function OutcomeIcon({ label }: { label: string }) {
  const cls = "h-3 w-3 shrink-0";
  const u = label.toUpperCase();
  if (u.includes("RB")) return <Footprints className={`${cls} text-orange-600`} />;
  if (u.includes("QB")) return <ArrowUpRight className={`${cls} text-sky-700`} />;
  if (u.includes("FLEX")) return <Star className={`${cls} text-amber-500`} />;
  if (u.includes("BENCH")) return <Sofa className={`${cls} text-violet-600`} />;
  if (u.includes("RISK")) return <AlertTriangle className={`${cls} text-red-600`} />;
  if (u.includes("CEILING")) return <BarChart3 className={`${cls} text-emerald-600`} />;
  return <Star className={`${cls} text-orange-500`} />;
}

function firstName(full: string): string {
  if (!full) return "this player";
  return full.split(" ")[0] || full;
}

// ────────────────────────────── derived copy ──────────────────────────────

function buildCopy(d: DecisionResult, insights: ReturnType<typeof computeCardInsights>) {
  const pos = d.position ?? "player";
  const anchor = d.anchorPrice || d.goUpTo || d.currentPrice || 1;
  const tier = anchor >= 45 ? 1 : anchor >= 28 ? 2 : anchor >= 15 ? 3 : 4;

  const whyDraftHim =
    anchor >= 45
      ? `Can single-handedly win weeks. One of the few ${pos}s capable of league-tilting performances multiple times per season.`
      : anchor >= 25
      ? `Strong weekly starter with the upside to swing close matchups. The kind of name that anchors a real build.`
      : d.verdict === "BID"
      ? `Quiet value pocket. Keeps the build alive without wrecking budget — exactly the role-player edge winning teams find.`
      : `Only worth it if the room lets the price fall. Discipline over impulse here.`;

  const pathToSmash: string[] = (() => {
    if (pos === "QB") return ["Rushing floor holds", "Stays healthy 17 weeks", "Pass volume stays elite", "Stack partner produces", "Game scripts cooperate"];
    if (pos === "RB") return ["Goal-line role sticks", "Passing-down work climbs", "Offensive line holds up", "Backup stays inactive", "Avoids soft-tissue dings"];
    if (pos === "WR") return ["Target share stays alpha", "QB plays the full season", "Offense plays fast", "Red-zone looks spike", "Massive spike-week profile"];
    if (pos === "TE") return ["Routes stay elite", "Red-zone looks spike", "Offense throws to TE", "Stays healthy", "Beats coverage matchups"];
    return ["Price stays cheap", "Role beats projection", "Volume materializes", "Health holds", "Game flow cooperates"];
  })();

  const risks: string[] = (() => {
    const base: string[] = [];
    if (anchor >= 35) base.push("Premium auction cost limits depth");
    if (pos === "RB") base.push("Soft-tissue injury risk", "Workload concerns", "Game-script dependent");
    else if (pos === "WR") base.push("QB injury would crater value", "Target share volatility", "Boom/bust week-to-week");
    else if (pos === "QB") base.push("Defense scoring dependency", "Rushing volume could dip");
    else base.push("Tight roster window", "Volume not guaranteed");
    return base.slice(0, 4);
  })();

  const upside = [
    { label: "Weekly Ceiling",       value: anchor >= 45 ? "A+" : anchor >= 25 ? "A" : "B",    color: "text-emerald-600", Icon: BarChart3 },
    { label: "League-Winning Upside", value: anchor >= 45 ? "ELITE" : anchor >= 25 ? "HIGH" : "MID", color: anchor >= 45 ? "text-emerald-600" : "text-amber-600", Icon: Trophy },
    { label: "Bust Risk",            value: anchor >= 45 ? "LOW" : "MEDIUM",                    color: anchor >= 45 ? "text-emerald-600" : "text-amber-600", Icon: HeartPulse },
    { label: "Safety",               value: anchor >= 45 ? "A" : anchor >= 25 ? "B" : "C",     color: "text-sky-700", Icon: ShieldCheck },
    { label: "Fun Factor",           value: anchor >= 35 ? "MAX" : "HIGH",                     color: "text-orange-600", Icon: Smile },
  ];

  const stacks: string[] = ["Same-team QB stack", "Same-team WR2 cheap", "Defense late round"];

  const vibe = anchor >= 45
    ? "Room turns aggressive once elite tiers thin. Expect bid wars and overpays nearby."
    : anchor >= 25
    ? "Mid-tier nominations spike when premium names leave the board. Anticipate the run."
    : "Often goes for cheap when the room is chasing names. Pounce when attention is elsewhere.";

  const tierData = {
    label: `TIER ${tier}`,
    sub: tier === 1 ? "LEAGUE-TILTING ALPHAS" : tier === 2 ? "WEEKLY STARTERS" : tier === 3 ? "VALUE STARTERS" : "DEPTH / DART THROW",
  };

  const draftIf: string[] = (() => {
    if (insights.bigDecision === "AGGRESSIVE BUY") return ["You want a tier-1 anchor", "Comfortable with aggressive spending", "Trust the QB/team context"];
    if (insights.bigDecision === "VALUE ONLY") return ["Price falls into your zone", "You need this position", "Bench depth is healthy"];
    if (insights.bigDecision === "BAIT NOMINATION") return ["You want to drain wallets", "Have alternative targets queued", "Comfortable letting it walk"];
    return ["Room is undervaluing", "You can absorb the cost", "Build still has flexibility"];
  })();

  const archetype = pos === "WR"
    ? "Modern alpha receiver. Spike-week ceiling that breaks matchup models when healthy."
    : pos === "RB"
    ? "Workhorse role with multi-category usage. The kind of back that wins weeks outright."
    : pos === "QB"
    ? "Dual-threat profile. Rushing floor changes the math on every weekly decision."
    : pos === "TE"
    ? "Mismatch piece. Solves the position weekly when most rosters can't."
    : "Role player with situational upside.";

  return { whyDraftHim, pathToSmash, risks, upside, stacks, vibe, tier: tierData, draftIf, archetype };
}
