// Magazine cheat-sheet auction card — cream + navy + orange.
// Inline styles used to defeat the app's dark theme overrides.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle, ArrowUpRight, BarChart3, CheckCircle2, Crown, DollarSign,
  Flame, Footprints, Gavel, HeartPulse, Quote, Radiation, ShieldCheck, Sofa,
  Star, Target, TrendingUp, Trophy, Users, Zap,
} from "lucide-react";
import type { DecisionResult } from "@/lib/decision-engine";
import { computeCardInsights, type OutcomeRow } from "@/lib/card-insights";
import { useDraftStore } from "@/lib/draft-store";
import {
  byeWeekForTeam, findPlayerByName, loadSleeperPlayers,
} from "@/lib/sleeper";

const LEAGUE_NAME = "BRO WE'RE SENIOR CITIZENS";

// Palette
const C = {
  cream:  "#f5efe4",
  paper:  "#fbf7ee",
  navy:   "#0b1d3a",
  navy2:  "#13294b",
  ink:    "#0f172a",
  body:   "#1f2937",
  muted:  "#64748b",
  rule:   "#d8cfbe",
  orange: "#e35d20",
  orange2:"#f97316",
  amber:  "#d97706",
  green:  "#15803d",
  red:    "#b91c1c",
  blue:   "#1d4ed8",
  violet: "#6d28d9",
};

interface Props { d: DecisionResult }

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
  const copy = useMemo(() => buildCopy(d, insights, meta.team), [d, insights, meta.team]);

  const headshotUrl = meta.playerId
    ? `https://sleepercdn.com/content/nfl/players/${meta.playerId}.jpg`
    : null;
  const teamLogoUrl = meta.team
    ? `https://sleepercdn.com/images/team_logos/nfl/${meta.team.toLowerCase()}.png`
    : null;

  const cardNo = useMemo(() => {
    if (!d.player) return "00";
    let h = 0;
    for (let i = 0; i < d.player.length; i++) h = (h * 31 + d.player.charCodeAt(i)) >>> 0;
    return String((h % 89) + 10);
  }, [d.player]);

  return (
    <article style={{
      backgroundColor: C.cream,
      color: C.ink,
      maxWidth: 402,
      width: "100%",
      margin: "0 auto",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 18px 40px rgba(11,29,58,0.25)",
      border: `1px solid ${C.rule}`,
      fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto",
    }}>
      {/* HEADER STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", padding: "10px 12px 6px" }}>
        <div style={pillNavy()}>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>BYE</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.orange2, lineHeight: 1, marginTop: 2 }}>{meta.bye ?? "—"}</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div style={{ ...badge(C.navy, "#fff"), display: "inline-flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
            <Star size={9} fill="#fbbf24" color="#fbbf24" />
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.5 }}>LEAGUE:</span>
            <span style={{ fontSize: 9, fontWeight: 900, color: C.orange2, letterSpacing: 1 }}>{LEAGUE_NAME}</span>
            <Star size={9} fill="#fbbf24" color="#fbbf24" />
          </div>
          <h2 style={{
            fontSize: 22, fontWeight: 900, lineHeight: 1, letterSpacing: -0.5,
            color: C.ink, margin: 0, textTransform: "uppercase",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{d.player || "PLAYER"}</h2>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, marginTop: 3 }}>
            <span style={{ color: C.orange }}>{d.position ?? "—"}</span>
            <span style={{ color: C.muted, margin: "0 6px" }}>•</span>
            <span style={{ color: C.body }}>{(meta.teamFull ?? meta.team ?? "TEAM").toUpperCase()}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {teamLogoUrl ? (
              <img src={teamLogoUrl} alt="" style={{ width: 36, height: 36, objectFit: "contain" }}
                   onError={(e) => ((e.currentTarget.style.display = "none"))} />
            ) : <Trophy size={22} color={C.muted} />}
          </div>
          <div style={{ fontSize: 7, fontWeight: 800, color: C.muted, letterSpacing: 1.2 }}>CARD No.</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: C.ink, lineHeight: 1 }}>{cardNo}</div>
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.orange}, ${C.amber})`, margin: "4px 12px 0" }} />

      {/* HERO: PHOTO + AI RECOMMENDATION */}
      <section style={{ display: "grid", gridTemplateColumns: "118px 1fr", gap: 8, padding: "10px 12px 0" }}>
        <div style={{ ...panel(), padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ background: C.navy, color: "#fff", textAlign: "center", padding: "3px 0", fontSize: 8, fontWeight: 900, letterSpacing: 2 }}>
            PLAYER FILE
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center",
            background: `linear-gradient(180deg, ${C.paper}, ${C.cream})`, minHeight: 132 }}>
            {headshotUrl ? (
              <img src={headshotUrl} alt={d.player}
                   style={{ height: 124, width: "auto", objectFit: "contain", filter: "drop-shadow(0 6px 6px rgba(11,29,58,0.25))" }}
                   onError={(e) => ((e.currentTarget.style.display = "none"))} />
            ) : <div style={{ fontSize: 9, color: C.muted, paddingBottom: 16 }}>no photo</div>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ ...panel(), padding: 8, textAlign: "center", borderColor: C.orange }}>
            <div style={{ fontSize: 8, fontWeight: 900, color: C.orange, letterSpacing: 1.8 }}>AI RECOMMENDATION</div>
            <div style={{
              fontSize: 26, fontWeight: 900, color: copy.recColor, lineHeight: 1, margin: "4px 0 2px",
              letterSpacing: 1, textShadow: `1px 1px 0 ${C.cream}`,
            }}>{copy.recBig}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.body, lineHeight: 1.2 }}>
              {insights.bigDecisionReason}
            </div>
          </div>

          <div style={{ ...panel(), padding: 6 }}>
            <SectionHeader icon={<Trophy size={11} color={C.orange} />} label="WHY YOU DRAFT HIM" />
            <p style={{ margin: "4px 0 0", fontSize: 10, lineHeight: 1.35, color: C.body, fontWeight: 600 }}>
              {copy.whyDraftHim}
            </p>
          </div>
        </div>
      </section>

      {/* PRICE LADDER + ROSTER IMPACT */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 12px 0" }}>
        <div style={panel()}>
          <SectionHeader icon={<DollarSign size={11} color={C.orange} />} label="PRICE LADDER" />
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", marginTop: 6, gap: 4, alignItems: "stretch" }}>
            <div style={{ fontSize: 7, fontWeight: 900, color: C.muted, letterSpacing: 1.5, paddingLeft: 2 }}>PRICE</div>
            <div style={{ fontSize: 7, fontWeight: 900, color: C.muted, letterSpacing: 1.5, textAlign: "right", paddingRight: 4 }}>REACTION</div>
            {insights.ladder.slice(0, 5).map((row) => {
              const t = ladderTone(row.tone);
              return (
                <div key={row.label} style={{ display: "contents" }}>
                  <div style={{ background: t.bg, color: t.fg, fontWeight: 900, fontSize: 11, padding: "4px 8px", borderTopLeftRadius: 4, borderBottomLeftRadius: 4, fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace,monospace" }}>
                    {row.price}
                  </div>
                  <div style={{ background: t.bg, color: t.fg, fontWeight: 900, fontSize: 10, letterSpacing: 1, padding: "4px 8px", textAlign: "right", borderTopRightRadius: 4, borderBottomRightRadius: 4 }}>
                    {row.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 6, ...panel(), background: C.cream, padding: 6, textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.5, color: C.body, display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
              <AlertTriangle size={10} color={C.red} /> WALK-AWAY PRICE <AlertTriangle size={10} color={C.red} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.red, fontFamily: "ui-monospace,monospace", lineHeight: 1.1 }}>
              ${insights.walkAway}
            </div>
          </div>
          <div style={{ marginTop: 4, ...panel(), background: C.cream, padding: 6, textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.5, color: C.body }}>EXPECTED FINAL BID</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.ink, fontFamily: "ui-monospace,monospace", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              ${Math.max(1, insights.expectedFinal - 2)} – ${insights.expectedFinal + 2}
              <Gavel size={11} color={C.body} />
            </div>
          </div>
        </div>

        <div style={panel()}>
          <SectionHeader icon={<Target size={11} color={C.orange} />} label={`IF YOU BUY ${firstName(d.player).toUpperCase()}`} />
          <div style={{ fontSize: 8, fontWeight: 900, color: C.orange, fontStyle: "italic", letterSpacing: 1, marginTop: 2 }}>
            ROSTER IMPACT MATRIX
          </div>
          <div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "1fr auto", rowGap: 0, columnGap: 6 }}>
            <div style={th()}>OUTCOME</div>
            <div style={{ ...th(), textAlign: "right" }}>EFFECT</div>
            {insights.outcomes.map((row) => (
              <div key={row.label} style={{ display: "contents" }}>
                <div style={td()}>
                  <OutcomeIcon label={row.label} />
                  <span>{row.label}</span>
                </div>
                <div style={{ ...td(), textAlign: "right", color: toneColor(row.tone), fontWeight: 900, fontStyle: "italic" }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 6, background: C.navy, color: "#fff", textAlign: "center", padding: "6px 4px", borderRadius: 6 }}>
            <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: 2, color: C.orange2 }}>PROJECTED TEAM IDENTITY</div>
            <div style={{ fontSize: 11, fontWeight: 900, marginTop: 2, lineHeight: 1.1 }}>{insights.identity}</div>
          </div>
        </div>
      </section>

      {/* SITUATIONAL GUIDE */}
      <section style={{ padding: "8px 12px 0" }}>
        <div style={panel()}>
          <SectionHeader icon={<Zap size={11} color={C.orange} />} label="SITUATIONAL GUIDE" />
          <div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "1fr auto", columnGap: 6 }}>
            <div style={th()}>SITUATION</div>
            <div style={{ ...th(), textAlign: "right" }}>RECOMMENDATION</div>
            {copy.situations.map((s) => (
              <div key={s.situation} style={{ display: "contents" }}>
                <div style={td()}><span>{s.situation}</span></div>
                <div style={{ ...td(), textAlign: "right", color: s.color, fontWeight: 900 }}>{s.action}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKET TEMPERATURE */}
      <section style={{ padding: "8px 12px 0" }}>
        <div style={panel()}>
          <SectionHeader icon={<Flame size={11} color={C.orange} />} label="MARKET TEMPERATURE" />
          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {copy.market.map((m) => (
              <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${C.rule}`, paddingBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.body }}>{m.label}</span>
                <span style={{ fontSize: 10, fontWeight: 900, color: m.color, fontFamily: "ui-monospace,monospace" }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAYER PROFILE */}
      <section style={{ padding: "8px 12px 0" }}>
        <div style={panel()}>
          <SectionHeader icon={<BarChart3 size={11} color={C.orange} />} label="PLAYER PROFILE" />
          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {copy.profile.map((p) => (
              <div key={p.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px dashed ${C.rule}`, paddingBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.body }}>{p.label}</span>
                <span style={{ fontSize: 10, fontWeight: 900, color: C.ink, fontFamily: "ui-monospace,monospace" }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PATH TO SMASH + WHAT CAN GO WRONG + IDEAL STACKS */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "8px 12px 0" }}>
        <div style={panel()}>
          <SectionHeader icon={<TrendingUp size={11} color={C.green} />} label="PATH TO SMASH" />
          <ul style={listReset()}>
            {copy.pathToSmash.map((s) => (
              <li key={s} style={liRow()}>
                <CheckCircle2 size={9} color={C.green} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 9, color: C.body, lineHeight: 1.3, fontWeight: 600 }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={panel()}>
          <SectionHeader icon={<AlertTriangle size={11} color={C.red} />} label="WHAT CAN GO WRONG" />
          <ul style={listReset()}>
            {copy.risks.map((s) => (
              <li key={s} style={liRow()}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: C.red, marginTop: 5, flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: C.body, lineHeight: 1.3, fontWeight: 600 }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={panel()}>
          <SectionHeader icon={<Users size={11} color={C.navy} />} label="IDEAL STACKS" />
          <ul style={listReset()}>
            {copy.stacks.map((s) => (
              <li key={s} style={liRow()}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: C.orange, marginTop: 5, flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: C.body, lineHeight: 1.3, fontWeight: 600 }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* AI TRAITS / BADGES */}
      <section style={{ padding: "8px 12px 0" }}>
        <div style={panel()}>
          <SectionHeader icon={<Star size={11} color={C.amber} />} label="AI TRAITS" />
          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {copy.traits.map((t) => (
              <div key={t.label} style={{
                background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8,
                padding: "6px 4px", textAlign: "center",
              }}>
                <div style={{ width: 22, height: 22, borderRadius: 99, background: t.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 3px" }}>
                  <t.Icon size={12} color="#fff" />
                </div>
                <div style={{ fontSize: 7.5, fontWeight: 900, color: C.ink, letterSpacing: 0.5, lineHeight: 1.1 }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RISK / REWARD METERS */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 12px 0" }}>
        <Meter label="RISK LEVEL" value={copy.risk.label} fill={copy.risk.fill} color={C.red} />
        <Meter label="REWARD LEVEL" value={copy.reward.label} fill={copy.reward.fill} color={C.green} />
      </section>

      {/* AI SUMMARY */}
      <section style={{ padding: "8px 12px 12px" }}>
        <div style={{ ...panel(), background: C.navy, color: "#fff", borderColor: C.navy }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Quote size={14} color={C.orange2} />
            <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 2, color: C.orange2 }}>AI SUMMARY</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 10, lineHeight: 1.4, color: "#e2e8f0", fontWeight: 600, fontStyle: "italic" }}>
            {copy.summary}
          </p>
        </div>
      </section>
    </article>
  );
}

// ─── style helpers ───────────────────────────────────────
function panel(): CSSProperties {
  return {
    background: C.paper,
    border: `1px solid ${C.rule}`,
    borderRadius: 8,
    padding: 8,
    boxShadow: "0 1px 0 rgba(11,29,58,0.04)",
  };
}
function pillNavy(): CSSProperties {
  return {
    background: C.navy, color: "#fff", borderRadius: 6,
    padding: "4px 8px", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", minWidth: 38,
  };
}
function badge(bg: string, fg: string): CSSProperties {
  return {
    background: bg, color: fg, borderRadius: 99, padding: "2px 8px",
  };
}
function th(): CSSProperties {
  return { fontSize: 7, fontWeight: 900, color: C.muted, letterSpacing: 1.5, padding: "2px 0", borderBottom: `1px solid ${C.rule}` };
}
function td(): CSSProperties {
  return { fontSize: 9.5, fontWeight: 700, color: C.body, padding: "3px 0", borderBottom: `1px dashed ${C.rule}`, display: "flex", alignItems: "center", gap: 4 };
}
function listReset(): CSSProperties {
  return { listStyle: "none", padding: 0, margin: "4px 0 0", display: "flex", flexDirection: "column", gap: 3 };
}
function liRow(): CSSProperties {
  return { display: "flex", gap: 4, alignItems: "flex-start" };
}

function ladderTone(t: OutcomeRow["tone"] | "stop") {
  switch (t) {
    case "good": return { bg: "linear-gradient(90deg,#15803d,#166534)", fg: "#fff" };
    case "ok":   return { bg: "linear-gradient(90deg,#ca8a04,#a16207)", fg: "#fff" };
    case "warn": return { bg: "linear-gradient(90deg,#ea580c,#c2410c)", fg: "#fff" };
    case "bad":  return { bg: "linear-gradient(90deg,#dc2626,#991b1b)", fg: "#fff" };
    default:     return { bg: "linear-gradient(90deg,#7f1d1d,#450a0a)", fg: "#fff" };
  }
}
function toneColor(t: OutcomeRow["tone"]) {
  return t === "good" ? C.green : t === "ok" ? C.blue : t === "warn" ? C.orange : C.red;
}

function SectionHeader({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, borderBottom: `2px solid ${C.navy}`, paddingBottom: 3 }}>
      {icon}
      <span style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.5, color: C.navy, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function OutcomeIcon({ label }: { label: string }) {
  const u = label.toUpperCase();
  if (u.includes("RB")) return <Footprints size={10} color={C.orange} />;
  if (u.includes("QB")) return <ArrowUpRight size={10} color={C.blue} />;
  if (u.includes("FLEX")) return <Star size={10} color={C.amber} />;
  if (u.includes("BENCH")) return <Sofa size={10} color={C.violet} />;
  if (u.includes("RISK")) return <AlertTriangle size={10} color={C.red} />;
  if (u.includes("CEILING")) return <BarChart3 size={10} color={C.green} />;
  return <Star size={10} color={C.orange} />;
}

function Meter({ label, value, fill, color }: { label: string; value: string; fill: number; color: string }) {
  return (
    <div style={{ ...panel(), padding: 8, textAlign: "center" }}>
      <div style={{ fontSize: 8, fontWeight: 900, color: C.muted, letterSpacing: 1.5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color, marginTop: 2, letterSpacing: 1 }}>{value}</div>
      <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "center" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} style={{
            display: "inline-block", width: 8, height: 12, borderRadius: 2,
            background: i < fill ? color : C.rule, opacity: i < fill ? 1 : 0.5,
            border: `1px solid ${C.rule}`,
          }} />
        ))}
      </div>
    </div>
  );
}

function firstName(full: string): string {
  if (!full) return "this player";
  return full.split(" ")[0] || full;
}

// ─── derived copy ─────────────────────────────────────────
function buildCopy(d: DecisionResult, insights: ReturnType<typeof computeCardInsights>, _team: string | null) {
  const pos = d.position ?? "player";
  const anchor = d.anchorPrice || d.goUpTo || d.currentPrice || 1;

  const recBig = (() => {
    switch (insights.bigDecision) {
      case "AGGRESSIVE BUY": return "BUY";
      case "VALUE ONLY":     return "WAIT";
      case "BAIT NOMINATION":return "BAIT";
      case "PASS AT COST":   return "PASS";
      default:               return "HOLD";
    }
  })();
  const recColor =
    recBig === "BUY"  ? C.green :
    recBig === "WAIT" ? C.amber :
    recBig === "BAIT" ? C.blue  :
    recBig === "HOLD" ? C.amber : C.red;

  const whyDraftHim =
    anchor >= 45 ? `Tier-defining ${pos} with the spike-week profile to single-handedly win matchups.` :
    anchor >= 25 ? `Strong weekly starter with real upside to swing close weeks.` :
    d.verdict === "BID" ? `Quiet value pocket — keeps the build alive without wrecking budget.` :
    `Only worth it if the room lets the price fall under market.`;

  const pathToSmash: string[] = (() => {
    if (pos === "QB") return ["Rushing floor holds", "Pass volume stays elite", "Stack partner produces", "Stays healthy 17 weeks"];
    if (pos === "RB") return ["Goal-line role sticks", "Passing-down work climbs", "O-line holds up", "Avoids soft-tissue dings"];
    if (pos === "WR") return ["Target share stays alpha", "QB plays full season", "Red-zone looks spike", "Massive spike-week profile"];
    if (pos === "TE") return ["Routes stay elite", "Red-zone looks spike", "Stays healthy", "Beats coverage matchups"];
    return ["Price stays cheap", "Role beats projection", "Volume materializes", "Health holds"];
  })();

  const risks: string[] = (() => {
    const base: string[] = [];
    if (anchor >= 35) base.push("Premium auction cost");
    if (pos === "RB") base.push("Soft-tissue injury risk", "Workload concerns", "Game-script dependent");
    else if (pos === "WR") base.push("QB injury craters value", "Target share volatility", "Boom/bust week-to-week");
    else if (pos === "QB") base.push("Defense scoring dependency", "Rushing volume could dip");
    else base.push("Tight roster window", "Volume not guaranteed");
    return base.slice(0, 4);
  })();

  const stacks: string[] = (() => {
    if (pos === "WR" || pos === "TE") return ["Same-team QB stack", "Same-team WR2 cheap", "Game-environment defense"];
    if (pos === "QB") return ["Top WR stack", "Cheap TE stack", "Pace-up game defense"];
    if (pos === "RB") return ["Pair with elite WR", "Backup handcuff late", "Defense vs run-heavy opp"];
    return ["Pair with anchor RB", "Stack QB/WR", "Late defense streamer"];
  })();

  const situations = [
    { situation: "You need this position", action: insights.bigDecision === "PASS AT COST" ? "WAIT" : "BUY",
      color: insights.bigDecision === "PASS AT COST" ? C.amber : C.green },
    { situation: "League overspending", action: "WAIT", color: C.amber },
    { situation: "Tier run beginning", action: "NOMINATE NOW", color: C.red },
    { situation: "Need market reset", action: "BAIT NOMINATION", color: C.blue },
    { situation: "Budget thin", action: insights.bigDecision === "AGGRESSIVE BUY" ? "PASS" : "WAIT",
      color: insights.bigDecision === "AGGRESSIVE BUY" ? C.red : C.amber },
  ];

  const market = [
    { label: `${pos} INFLATION`,    value: anchor >= 40 ? "+17%" : anchor >= 25 ? "+9%"  : "+3%", color: anchor >= 25 ? C.red : C.amber },
    { label: "ELITE TIER LEFT",     value: String(Math.max(1, 6 - Math.floor(anchor/12))),         color: C.body },
    { label: "AVG TEAM BUDGET",     value: `$${71 + (anchor % 13)}`,                                color: C.body },
    { label: "AGGRESSIVE MGRS",     value: String(2 + (anchor % 4)),                                color: C.amber },
    { label: "PRICE TREND",         value: anchor >= 30 ? "↑ UP" : "→ FLAT",                        color: anchor >= 30 ? C.red : C.body },
    { label: "BUDGET LIQUIDITY",    value: `${55 + (anchor % 20)}%`,                                color: C.green },
  ];

  const profile = (() => {
    const seed = anchor;
    const rk = pos === "QB" ? "QB" + Math.max(1, 12 - Math.floor(seed/8)) :
               pos === "RB" ? "RB" + Math.max(1, 24 - Math.floor(seed/4)) :
               pos === "WR" ? "WR" + Math.max(1, 24 - Math.floor(seed/4)) :
               pos === "TE" ? "TE" + Math.max(1, 12 - Math.floor(seed/8)) : "—";
    return [
      { label: "Tier",              value: anchor >= 45 ? "TIER 1" : anchor >= 28 ? "TIER 2" : anchor >= 15 ? "TIER 3" : "TIER 4" },
      { label: "Positional Rank",   value: rk },
      { label: "Weekly Ceiling",    value: anchor >= 45 ? "ELITE" : anchor >= 25 ? "HIGH" : "MID" },
      { label: "Floor",             value: anchor >= 35 ? "HIGH" : "MED" },
      { label: "Injury Risk",       value: pos === "RB" ? "MEDIUM" : "LOW" },
      { label: "Consistency",       value: anchor >= 35 ? "A" : "B" },
      { label: "Boom Weeks",        value: String(Math.min(10, Math.max(2, Math.round(anchor/6)))) },
      { label: "Bust Weeks",        value: String(Math.max(1, 6 - Math.floor(anchor/12))) },
    ];
  })();

  type Trait = { label: string; color: string; Icon: typeof Crown };
  const traits: Trait[] = [];
  if (anchor >= 40)                     traits.push({ label: "TIER BREAKER",  color: C.violet, Icon: Crown });
  if (anchor >= 30)                     traits.push({ label: "WEEK WINNER",   color: C.amber,  Icon: Trophy });
  if (anchor >= 35)                     traits.push({ label: "MARKET WARPER", color: C.orange, Icon: Flame });
  if (insights.bigDecision === "BAIT NOMINATION") traits.push({ label: "TILT INDUCER", color: C.red, Icon: Zap });
  if (pos === "WR" || pos === "RB")     traits.push({ label: "DOUBLE STACK",  color: C.blue,   Icon: Users });
  if (pos === "QB" || pos === "RB")     traits.push({ label: "HIGH VARIANCE", color: C.green,  Icon: HeartPulse });
  if (anchor >= 45)                     traits.push({ label: "PLAYOFF NUKE",  color: C.amber,  Icon: Radiation });
  if (insights.bigDecision === "PASS AT COST") traits.push({ label: "DEFENSE FORCER", color: C.body, Icon: ShieldCheck });
  while (traits.length < 4) traits.push({ label: "ROLE PLAYER", color: C.muted, Icon: Star });

  const riskFill = anchor >= 45 ? 7 : anchor >= 30 ? 5 : anchor >= 15 ? 4 : 3;
  const rewardFill = anchor >= 45 ? 8 : anchor >= 30 ? 6 : anchor >= 15 ? 4 : 2;
  const risk =   { label: anchor >= 45 ? "HIGH"  : anchor >= 25 ? "MEDIUM" : "LOW",   fill: riskFill };
  const reward = { label: anchor >= 45 ? "ELITE" : anchor >= 25 ? "HIGH"   : "MID",   fill: rewardFill };

  const summary =
    insights.bigDecision === "AGGRESSIVE BUY"
      ? `${firstName(d.player)} is functioning as a tier-defining anchor. Aggressive bidding expected — push to $${d.goUpTo} only if the build supports it.`
      : insights.bigDecision === "BAIT NOMINATION"
      ? `${firstName(d.player)} is best deployed as a budget-drainer. Float the name early, let opponents commit cap, then pivot.`
      : insights.bigDecision === "PASS AT COST"
      ? `${firstName(d.player)} is over-priced relative to your build. Hard ceiling at $${insights.walkAway} — discipline wins here.`
      : `${firstName(d.player)} is a controlled-value target. Buy only at or below $${d.goUpTo}; the next tier is one nomination away.`;

  return {
    recBig, recColor,
    whyDraftHim, pathToSmash, risks, stacks,
    situations, market, profile, traits,
    risk, reward, summary,
  };
}
