import { useEffect, useMemo, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────
   ANY GIVEN SUNDAY × BANKSY — WAR ROOM
   Pure realization of the spec. No business logic. No mercy.
   ───────────────────────────────────────────────────────────────────── */

type Pos = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
const POS_BORDER: Record<Pos, string> = {
  QB:  "border-l-turf",
  RB:  "border-l-penalty",
  WR:  "border-l-[#00BFFF]",
  TE:  "border-l-sweat",
  K:   "border-l-[#555555]",
  DEF: "border-l-rust",
};
const POS_BADGE: Record<Pos, string> = {
  QB:  "bg-turf text-locker",
  RB:  "bg-penalty text-locker",
  WR:  "bg-[#00BFFF] text-locker",
  TE:  "bg-sweat text-locker",
  K:   "bg-[#555555] text-chalk",
  DEF: "bg-rust text-chalk",
};

type Pick = { num: number; name: string; pos: Pos; team: string };
const BOARD: Pick[] = [
  { num: 1,  name: "MAHOMES",      pos: "QB",  team: "KC"  },
  { num: 2,  name: "MCCAFFREY",    pos: "RB",  team: "SF"  },
  { num: 3,  name: "JEFFERSON",    pos: "WR",  team: "MIN" },
  { num: 4,  name: "KELCE",        pos: "TE",  team: "KC"  },
  { num: 5,  name: "CHASE",        pos: "WR",  team: "CIN" },
  { num: 6,  name: "BIJAN",        pos: "RB",  team: "ATL" },
  { num: 7,  name: "ALLEN",        pos: "QB",  team: "BUF" },
  { num: 8,  name: "LAMB",         pos: "WR",  team: "DAL" },
  { num: 9,  name: "HENRY",        pos: "RB",  team: "BAL" },
  { num: 10, name: "HILL",         pos: "WR",  team: "MIA" },
  { num: 11, name: "ANDREWS",      pos: "TE",  team: "BAL" },
  { num: 12, name: "ROBINSON",     pos: "RB",  team: "ATL" },
];

type Slot = { pos: string; name: string; score: number; proj: number; status?: "QUEST" | "OUT" | "ACTIVE" | "FINAL" };

const HOME: Slot[] = [
  { pos: "QB",   name: "Patrick Mahomes",   score: 28.4, proj: 24.5, status: "ACTIVE" },
  { pos: "RB",   name: "Christian McCaffrey", score: 19.2, proj: 21.0, status: "ACTIVE" },
  { pos: "RB",   name: "Bijan Robinson",    score: 0.0,  proj: 16.4, status: "QUEST" },
  { pos: "WR",   name: "Justin Jefferson",  score: 14.8, proj: 18.2, status: "ACTIVE" },
  { pos: "WR",   name: "CeeDee Lamb",       score: 22.1, proj: 17.5, status: "FINAL" },
  { pos: "TE",   name: "Travis Kelce",      score: 9.4,  proj: 12.0, status: "ACTIVE" },
  { pos: "FLEX", name: "Puka Nacua",        score: 0.0,  proj: 13.8, status: "OUT"   },
  { pos: "K",    name: "Justin Tucker",     score: 11.0, proj: 8.0,  status: "FINAL" },
  { pos: "DEF",  name: "49ers D/ST",        score: 6.0,  proj: 7.5,  status: "ACTIVE" },
];

const AWAY: Slot[] = [
  { pos: "QB",   name: "Josh Allen",        score: 21.6, proj: 23.0, status: "ACTIVE" },
  { pos: "RB",   name: "Derrick Henry",     score: 15.4, proj: 14.0, status: "ACTIVE" },
  { pos: "RB",   name: "Saquon Barkley",    score: 11.2, proj: 16.0, status: "ACTIVE" },
  { pos: "WR",   name: "Tyreek Hill",       score: 8.8,  proj: 17.2, status: "ACTIVE" },
  { pos: "WR",   name: "Ja'Marr Chase",     score: 12.0, proj: 16.4, status: "ACTIVE" },
  { pos: "TE",   name: "Mark Andrews",      score: 4.2,  proj: 10.0, status: "FINAL" },
  { pos: "FLEX", name: "Davante Adams",     score: 6.4,  proj: 13.0, status: "ACTIVE" },
  { pos: "K",    name: "Harrison Butker",   score: 9.0,  proj: 7.5,  status: "FINAL" },
  { pos: "DEF",  name: "Cowboys D/ST",      score: 3.0,  proj: 7.0,  status: "ACTIVE" },
];

/* ── ON THE CLOCK COUNTDOWN ─────────────────────────────────────────── */
function useCountdown(start = 60) {
  const [s, setS] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setS((v) => (v <= 0 ? start : v - 1)), 1000);
    return () => clearInterval(id);
  }, [start]);
  return s;
}

/* ── GLITCH SCORE — ##.# for 200ms then real ─────────────────────────── */
function GlitchScore({ value, color = "text-chalk" }: { value: number; color?: string }) {
  const [shown, setShown] = useState<string>(value.toFixed(1));
  const [hot, setHot] = useState(false);
  useEffect(() => {
    setHot(true);
    const garbage = setInterval(() => {
      setShown(`${Math.floor(Math.random() * 90)}.${Math.floor(Math.random() * 9)}`);
    }, 40);
    const done = setTimeout(() => {
      clearInterval(garbage);
      setShown(value.toFixed(1));
      setTimeout(() => setHot(false), 600);
    }, 200);
    return () => { clearInterval(garbage); clearTimeout(done); };
  }, [value]);
  return (
    <span className={`font-mono tabular-nums ${color} ${hot ? "animate-score-hit" : ""}`}>
      {shown}
    </span>
  );
}

/* ── PAGE ────────────────────────────────────────────────────────────── */
export default function WarRoom() {
  const time = useCountdown(60);
  const danger = time <= 30;
  const lastTen = time <= 10;
  const [tab, setTab] = useState<"draft" | "matchup" | "profile">("draft");

  const homeTotal = useMemo(() => HOME.reduce((a, b) => a + b.score, 0), []);
  const awayTotal = useMemo(() => AWAY.reduce((a, b) => a + b.score, 0), []);
  const diff = homeTotal - awayTotal;
  const winning = diff > 0;
  const blowout = Math.abs(diff) >= 20;
  const painPct = Math.min(100, Math.max(0, (-diff / 40) * 100)); // PAIN meter — fills with blood when losing

  return (
    <div className="min-h-screen bg-locker text-chalk relative overflow-x-hidden">
      {/* ── PAIN METER — left edge vertical bar, blood fills as you lose ── */}
      <div className="fixed left-0 top-0 z-40 h-screen w-[6px] bg-locker">
        <div
          className="absolute bottom-0 left-0 w-full bg-[hsl(348_83%_47%)] transition-all duration-500"
          style={{ height: `${painPct}%`, opacity: 0.7 }}
        />
      </div>

      {/* ── TOP BAR — surveillance + spectacle ─────────────────────────── */}
      <header className="relative border-b-2 border-border bg-locker px-3 sm:px-6 py-2 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="font-stardos text-[10px] tracking-[0.3em] text-chalk">CH-04</span>
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground cctv-blink">
            REC · {new Date().toLocaleTimeString([], { hour12: false })}
          </span>
        </div>
        <span className="property-stamp">PROPERTY OF NFL</span>
      </header>

      {/* ── TAB SWITCHER ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 border-b-2 border-border bg-locker/95 backdrop-blur-sm flex">
        {(["draft", "matchup", "profile"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 font-stencil uppercase text-lg sm:text-xl tracking-wider py-3 transition-none border-b-4 ${
              tab === t
                ? "text-turf border-turf overspray-green"
                : "text-muted-foreground border-transparent hover:text-chalk"
            }`}
          >
            {t === "draft" ? "War Room" : t === "matchup" ? "Trenches" : "Rap Sheet"}
          </button>
        ))}
      </nav>

      {tab === "draft" && (
        <DraftBoard time={time} danger={danger} lastTen={lastTen} />
      )}
      {tab === "matchup" && (
        <Trenches homeTotal={homeTotal} awayTotal={awayTotal} winning={winning} blowout={blowout} />
      )}
      {tab === "profile" && <RapSheet />}

      {/* ── FOOTER STAMP ───────────────────────────────────────────────── */}
      <footer className="border-t-2 border-border bg-locker px-4 py-6 mt-8 text-center">
        <p className="font-stardos text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          ▮ Either we heal as a team ▮ Or we die as individuals ▮
        </p>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   THE WAR ROOM — Draft Board + ON THE CLOCK centerpiece
   ═══════════════════════════════════════════════════════════════════════ */
function DraftBoard({ time, danger, lastTen }: { time: number; danger: boolean; lastTen: boolean }) {
  return (
    <section className="relative">
      {/* yard lines — every 10vh */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent calc(10vh - 1px), hsl(60 11% 95% / 0.025) calc(10vh - 1px), hsl(60 11% 95% / 0.025) 10vh)",
        }}
        aria-hidden
      />

      {/* ON THE CLOCK ─────────────────────────────────────────────────── */}
      <div
        className={`relative z-10 mx-0 my-3 border-y-4 ${
          lastTen ? "border-[hsl(348_83%_47%)] animate-shake" : danger ? "border-penalty" : "border-turf"
        } bg-turf text-locker px-4 py-5 sm:py-7`}
      >
        <p className="font-stencil text-center text-4xl sm:text-7xl leading-none tracking-tight">
          ON THE CLOCK
        </p>
        <p className="text-center font-mono tabular-nums leading-none mt-2 text-locker">
          <span className={`text-6xl sm:text-9xl ${lastTen ? "animate-flicker" : ""}`}>
            {String(time).padStart(2, "0")}
          </span>
        </p>
        <p className="text-center font-stardos text-[10px] sm:text-xs uppercase tracking-[0.3em] mt-2 text-locker/80">
          Pick 13 ▮ Round 2 ▮ Auto-pick imminent
        </p>
      </div>

      {/* DRAFT GRID — full bleed, position-colored polaroids ──────────── */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 px-2 pb-6">
        {BOARD.map((p) => (
          <DraftCard key={p.num} pick={p} />
        ))}
        {/* empty locker slots */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="relative bg-[#0F0F0F] border-2 border-rust min-h-[110px] flex items-center justify-center"
          >
            <span className="font-stardos text-[10px] tracking-[0.3em] text-muted-foreground rotate-[-4deg]">
              EMPTY ▮ {13 + i}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DraftCard({ pick }: { pick: Pick }) {
  return (
    <div
      className={`group relative bg-[#111111] border-2 border-border ${POS_BORDER[pick.pos]} border-l-[6px] shadow-[6px_6px_0_hsl(0_0%_0%/0.9)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_hsl(0_0%_0%/0.9)] transition-[transform,box-shadow] duration-75`}
      style={{
        transform: `rotate(${(pick.num % 2 ? -0.6 : 0.4)}deg)`,
      }}
    >
      {/* tiny photo placeholder — desaturated face crop */}
      <div className="relative h-16 sm:h-20 bg-concrete overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 40%, hsl(0 0% 25%) 0%, hsl(0 0% 8%) 70%)`,
            filter: "contrast(1.4) saturate(0.4)",
          }}
        />
        {/* spray edge */}
        <div className={`absolute inset-x-0 bottom-0 h-1 ${POS_BADGE[pick.pos].split(" ")[0]}`} />
        <span className="absolute top-1 right-1 font-mono text-[10px] tabular-nums text-muted-foreground">
          #{String(pick.num).padStart(2, "0")}
        </span>
      </div>
      <div className="p-2">
        <p className="font-stencil text-base sm:text-lg leading-none text-chalk truncate">{pick.name}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className={`px-1.5 py-0.5 font-stencil text-[10px] tracking-wider ${POS_BADGE[pick.pos]}`}>
            {pick.pos}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{pick.team}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TRENCHES — Matchup split-screen war
   ═══════════════════════════════════════════════════════════════════════ */
function Trenches({
  homeTotal,
  awayTotal,
  winning,
  blowout,
}: {
  homeTotal: number;
  awayTotal: number;
  winning: boolean;
  blowout: boolean;
}) {
  const totalColor = (mine: boolean) => {
    const isWinningSide = (mine && winning) || (!mine && !winning);
    if (blowout && !isWinningSide) return "text-blood overspray-red";
    if (isWinningSide) return "text-turf overspray-green";
    return "text-chalk";
  };

  return (
    <section className="relative px-2 sm:px-4 py-4">
      {/* chain-link divider — hidden on mobile per spec */}
      <div
        className="hidden md:block absolute top-0 bottom-0 left-1/2 w-[2px] bg-border z-10"
        aria-hidden
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <TeamColumn
          label="THE BRO WE'RE SENIOR CITIZENS"
          record="9-3"
          total={homeTotal}
          totalColor={totalColor(true)}
          slots={HOME}
          mine
          diff={homeTotal - awayTotal}
        />
        <TeamColumn
          label="DUMPSTER FIRE FC"
          record="7-5"
          total={awayTotal}
          totalColor={totalColor(false)}
          slots={AWAY}
          diff={awayTotal - homeTotal}
        />
      </div>
    </section>
  );
}

function TeamColumn({
  label, record, total, totalColor, slots, mine, diff,
}: {
  label: string; record: string; total: number; totalColor: string;
  slots: Slot[]; mine?: boolean; diff: number;
}) {
  return (
    <div className={`relative ${mine ? "" : "tilt-back"}`}>
      <div className="border-b-2 border-border pb-3 mb-3">
        <p className="font-stencil text-2xl sm:text-3xl leading-none text-chalk overspray-green truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="font-mono text-xs text-muted-foreground">{record}</span>
          <span className={`font-mono tabular-nums leading-none text-5xl sm:text-7xl ${totalColor}`}>
            {total.toFixed(1)}
          </span>
        </div>
        <p className={`font-mono text-sm mt-1 ${diff >= 0 ? "text-turf" : "text-blood"}`}>
          {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
        </p>
      </div>

      <ul className="divide-y divide-border border-2 border-border">
        {slots.map((s, i) => (
          <SlotRow key={i} slot={s} striped={i % 2 === 1} />
        ))}
      </ul>
    </div>
  );
}

function SlotRow({ slot, striped }: { slot: Slot; striped: boolean }) {
  const injured = slot.status === "OUT";
  const quest = slot.status === "QUEST";
  const final = slot.status === "FINAL";
  const dotColor =
    slot.status === "ACTIVE" ? "bg-turf" :
    slot.status === "QUEST"  ? "bg-sweat" :
    slot.status === "OUT"    ? "bg-blood" :
                                "bg-muted";

  return (
    <li
      className={`relative flex items-center gap-2 px-2 py-2 ${striped ? "bg-[#0F0F0F]" : "bg-[#141414]"} ${
        injured ? "border-l-4 border-blood" : ""
      } ${quest ? "animate-bruise" : ""}`}
    >
      <span className="px-1.5 py-0.5 font-stencil text-[10px] tracking-wider bg-concrete border border-border text-chalk">
        {slot.pos}
      </span>
      <span className="flex-1 min-w-0 truncate text-sm text-chalk">{slot.name}</span>
      <span className={`h-2 w-2 ${dotColor}`} aria-hidden />
      <div className="text-right leading-none">
        <div className="font-mono tabular-nums text-xl">
          <GlitchScore
            value={slot.score}
            color={
              slot.score > slot.proj ? "text-turf" :
              slot.score === 0       ? "text-muted-foreground" :
              slot.score < slot.proj * 0.5 ? "text-blood" :
              "text-chalk"
            }
          />
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          PROJ {slot.proj.toFixed(1)}
        </div>
      </div>
    </li>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   RAP SHEET — Player profile / scouting report
   ═══════════════════════════════════════════════════════════════════════ */
function RapSheet() {
  const stats = [
    { label: "PASS YDS", value: "4,183", trend: "up" },
    { label: "PASS TD",  value: "31",     trend: "up" },
    { label: "INT",      value: "8",      trend: "down" },
    { label: "RUSH YDS", value: "389",    trend: "up" },
    { label: "RUSH TD",  value: "4",      trend: "flat" },
    { label: "FUM",      value: "3",      trend: "down" },
    { label: "QBR",      value: "78.4",   trend: "up" },
    { label: "FPTS/G",   value: "24.5",   trend: "up" },
  ];
  const news = [
    { type: "good",    when: "2h",  text: "Cleared concussion protocol. Full participation Wednesday.", source: "Adam Schefter" },
    { type: "bad",     when: "5d",  text: "Limited in practice with hip soreness. Listed as questionable.", source: "Ian Rapoport" },
    { type: "carnage", when: "21d", text: "Helmet-to-helmet with Roquan. Carted off. MRI pending.",      source: "ESPN" },
    { type: "good",    when: "34d", text: "Career-high 412 yards passing. Three TDs. Locker room MVP.",  source: "NFL.com" },
  ];
  const newsBorder = (t: string) =>
    t === "good"    ? "border-l-turf"    :
    t === "bad"     ? "border-l-penalty" :
                       "border-l-blood";

  return (
    <section className="relative">
      {/* HEADER — full-bleed face crop */}
      <div className="relative h-64 sm:h-96 overflow-hidden bg-concrete border-b-2 border-border">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 40%, hsl(0 0% 30%) 0%, hsl(0 0% 5%) 75%)",
            filter: "contrast(1.5) saturate(0.3)",
          }}
        />
        {/* turf spray overlay on edge */}
        <div className="absolute -bottom-3 left-0 right-0 h-6 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 50%, hsl(111 100% 54% / 0.6) 0, transparent 30px), radial-gradient(circle at 76% 50%, hsl(111 100% 54% / 0.5) 0, transparent 24px)",
          }}
        />
        {/* heavy vignette */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 35%, hsl(0 0% 5% / 0.95) 100%)" }}
        />
        <span className="property-stamp absolute top-3 right-3">PROPERTY OF KC</span>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-stencil text-5xl sm:text-7xl leading-none text-chalk overspray-green tilt-slight">
            PATRICK MAHOMES
          </p>
          <p className="font-mono text-sm text-muted-foreground mt-1 tracking-wider">QB ▮ KANSAS CITY ▮ #15</p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-locker">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#111111] border-2 border-border p-3">
            <p className="font-stardos text-[10px] tracking-[0.2em] text-muted-foreground">{s.label}</p>
            <p className={`font-mono tabular-nums text-3xl mt-1 ${
              s.trend === "up"   ? "text-turf"   :
              s.trend === "down" ? "text-blood"  :
                                   "text-chalk"
            }`}>
              {s.value}{s.trend === "up" ? " ▲" : s.trend === "down" ? " ▼" : ""}
            </p>
          </div>
        ))}
      </div>

      {/* NEWS — torn paper clippings */}
      <div className="px-3 py-4 space-y-3">
        <h2 className="font-stencil text-2xl text-chalk overspray-green">THE FILE</h2>
        {news.map((n, i) => (
          <article
            key={i}
            className={`relative bg-[#141414] border-2 border-border border-l-4 ${newsBorder(n.type)} p-3 torn-top shadow-[4px_4px_0_hsl(0_0%_0%/0.9)]`}
          >
            <p className="text-sm text-chalk leading-snug">{n.text}</p>
            <p className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span>{n.when} AGO</span>
              <span className="italic">{n.source}</span>
            </p>
          </article>
        ))}
      </div>

      {/* CTA */}
      <div className="px-3 pb-8 pt-2">
        <button
          type="button"
          className="w-full bg-turf text-locker font-stencil text-2xl sm:text-3xl tracking-wide py-4 shadow-[8px_8px_0_hsl(0_0%_0%/0.95)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[5px_5px_0_hsl(0_0%_0%/0.95)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-[2px_2px_0_hsl(0_0%_0%/0.95)] transition-[transform,box-shadow] duration-75"
          onClick={(e) => {
            const el = document.createElement("div");
            el.className = "flashbulb-once";
            el.style.position = "fixed";
            el.style.inset = "0";
            el.style.pointerEvents = "none";
            el.style.zIndex = "10001";
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 260);
          }}
        >
          ADD TO ROSTER
        </button>
        <button
          type="button"
          className="w-full mt-3 bg-transparent border-[3px] border-penalty text-penalty font-stencil text-xl tracking-wide py-3 hover:bg-penalty hover:text-locker transition-none"
        >
          PUT ON WAIVERS
        </button>
      </div>
    </section>
  );
}
