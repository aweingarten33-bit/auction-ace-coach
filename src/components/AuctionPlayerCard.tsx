// Trading-card BACK — Topps/Skybox style.
// Single dense card: name banner, vitals, stat line, scouting report,
// notes, footer with card number + copyright. Cream paper, navy ink, orange accents.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { DecisionResult } from "@/lib/decision-engine";
import { computeCardInsights } from "@/lib/card-insights";
import { useDraftStore } from "@/lib/draft-store";
import { supabase } from "@/integrations/supabase/client";
import {
  byeWeekForTeam, findPlayerByName, loadSleeperPlayers,
} from "@/lib/sleeper";
import { tierForPosRank } from "@/lib/league-tier-prices";

type ProjStats = Partial<Record<
  "passYds"|"passTD"|"int"|"rushAtt"|"rushYds"|"rushTD"|"rec"|"recYds"|"recTD"|"targets"|"games",
  number
>>;

const LEAGUE_NAME = "BRO WE'RE SENIOR CITIZENS";

const C = {
  cream:  "#f1e8d3",   // aged paper
  paper:  "#f7efdc",
  edge:   "#e6d9b8",
  navy:   "#0b1d3a",
  ink:    "#0f172a",
  body:   "#1f2937",
  muted:  "#6b6147",
  rule:   "#cdbf9a",
  orange: "#d4541b",
  amber:  "#b8851f",
  green:  "#1f6f3a",
  red:    "#9f2020",
  blue:   "#1d4ed8",
};

interface Props { d: DecisionResult }

type SleeperMeta = { team: string | null; bye: number | null };

const TEAM_FULL: Record<string, string> = {
  ARI:"ARIZONA",ATL:"ATLANTA",BAL:"BALTIMORE",BUF:"BUFFALO",CAR:"CAROLINA",
  CHI:"CHICAGO",CIN:"CINCINNATI",CLE:"CLEVELAND",DAL:"DALLAS",DEN:"DENVER",
  DET:"DETROIT",GB:"GREEN BAY",HOU:"HOUSTON",IND:"INDIANAPOLIS",JAX:"JACKSONVILLE",
  KC:"KANSAS CITY",LAC:"LOS ANGELES",LAR:"LOS ANGELES",LV:"LAS VEGAS",MIA:"MIAMI",
  MIN:"MINNESOTA",NE:"NEW ENGLAND",NO:"NEW ORLEANS",NYG:"NEW YORK",NYJ:"NEW YORK",
  PHI:"PHILADELPHIA",PIT:"PITTSBURGH",SEA:"SEATTLE",SF:"SAN FRANCISCO",TB:"TAMPA BAY",
  TEN:"TENNESSEE",WAS:"WASHINGTON",
};

export default function AuctionPlayerCard({ d }: Props) {
  const settings = useDraftStore((s) => s.settings);
  const events = useDraftStore((s) => s.events);
  const keepers = useDraftStore((s) => s.keepers);

  const [meta, setMeta] = useState<SleeperMeta>({ team: null, bye: null });
  const [proj, setProj] = useState<{ stats: ProjStats | null; points: number | null; posRank: number | null; overallRank: number | null }>({ stats: null, points: null, posRank: null, overallRank: null });
  const [espnId, setEspnId] = useState<number | null>(null);
  const [headshotOk, setHeadshotOk] = useState(true);

  useEffect(() => {
    let live = true;
    setMeta({ team: null, bye: null });
    setProj({ stats: null, points: null, posRank: null, overallRank: null });
    setEspnId(null);
    setHeadshotOk(true);
    if (!d.player) return;
    loadSleeperPlayers().then((players) => {
      if (!live) return;
      const p = findPlayerByName(players, d.player);
      if (!p) return;
      const team = p.team ?? null;
      setMeta({ team, bye: byeWeekForTeam(team) ?? null });
    }).catch(() => {});

    const norm = d.player.toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ").trim();
    supabase
      .from("espn_player_ranks")
      .select("projected_stats, projected_points, season, espn_player_id, pos_rank, overall_rank")
      .eq("player_name_norm", norm)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!live || !data) return;
        setProj({
          stats: (data.projected_stats as ProjStats) ?? null,
          points: data.projected_points ?? null,
          posRank: data.pos_rank ?? null,
          overallRank: data.overall_rank ?? null,
        });
        if (data.espn_player_id) setEspnId(Number(data.espn_player_id));
      });

    return () => { live = false; };
  }, [d.player]);

  const insights = computeCardInsights(d, settings, events, keepers);
  const copy = useMemo(() => buildCopy(d, insights, proj.posRank), [d, insights, proj.posRank]);

  const cardNo = useMemo(() => {
    if (!d.player) return "001";
    let h = 0;
    for (let i = 0; i < d.player.length; i++) h = (h * 31 + d.player.charCodeAt(i)) >>> 0;
    return String((h % 399) + 1).padStart(3, "0");
  }, [d.player]);

  const teamCity = meta.team ? (TEAM_FULL[meta.team] ?? meta.team) : "FREE AGENT";
  const recBig = copy.recBig;
  const recColor = copy.recColor;

  return (
    <article style={{
      // outer "card stock" with subtle aged paper feel
      backgroundColor: C.cream,
      backgroundImage:
        "radial-gradient(circle at 20% 10%, rgba(180,150,90,0.12), transparent 50%), radial-gradient(circle at 80% 90%, rgba(120,90,50,0.10), transparent 55%)",
      color: C.ink,
      maxWidth: 402,
      width: "100%",
      margin: "0 auto",
      borderRadius: 10,
      overflow: "hidden",
      boxShadow: "0 14px 30px rgba(11,29,58,0.30), inset 0 0 0 1px rgba(0,0,0,0.04)",
      border: `2px solid ${C.navy}`,
      fontFamily: "'Times New Roman', Georgia, serif",
      padding: 10,
    }}>
      {/* Inner double-rule frame */}
      <div style={{
        border: `1px solid ${C.navy}`,
        outline: `1px solid ${C.orange}`,
        outlineOffset: 2,
        padding: 10,
        background: "transparent",
      }}>
        {/* TOP NAME BANNER */}
        <div style={{
          background: C.navy,
          color: "#fff",
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `2px solid ${C.orange}`,
          borderBottom: `2px solid ${C.orange}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "Impact, 'Arial Narrow', sans-serif",
              fontSize: 22, lineHeight: 1, letterSpacing: 1,
              textTransform: "uppercase",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{d.player || "PLAYER NAME"}</div>
            <div style={{
              fontSize: 9, marginTop: 3, letterSpacing: 2, color: "#fbbf24",
              fontFamily: "Georgia, serif", fontStyle: "italic",
            }}>
              {teamCity} • {d.position ?? "—"}
            </div>
          </div>
          <div style={{
            background: C.orange, color: "#fff", borderRadius: 4,
            padding: "4px 6px", textAlign: "center", minWidth: 40,
            border: `1px solid #fbbf24`,
          }}>
            <div style={{ fontSize: 7, letterSpacing: 1.5, fontFamily: "Georgia,serif" }}>BYE</div>
            <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1, fontFamily: "Impact, sans-serif" }}>
              {meta.bye ?? "—"}
            </div>
          </div>
        </div>

        {/* PLAYER PHOTO — ESPN headshot over team-logo backdrop */}
        <div style={{
          position: "relative", marginTop: 8,
          height: 150, borderRadius: 4, overflow: "hidden",
          border: `1px solid ${C.rule}`,
          background: `linear-gradient(135deg, ${C.paper} 0%, ${C.edge} 100%)`,
        }}>
          {meta.team && (
            <img
              src={`https://a.espncdn.com/i/teamlogos/nfl/500/${meta.team.toLowerCase()}.png`}
              alt=""
              style={{
                position: "absolute", inset: 0, margin: "auto",
                width: "85%", height: "85%", objectFit: "contain",
                opacity: 0.18,
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
          {espnId && headshotOk ? (
            <img
              src={`https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`}
              alt={d.player ?? ""}
              style={{
                position: "absolute", bottom: 0, left: "50%",
                transform: "translateX(-50%)",
                height: "100%", objectFit: "contain",
              }}
              onError={() => setHeadshotOk(false)}
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Impact, sans-serif", fontSize: 48, color: C.navy, opacity: 0.35,
              letterSpacing: 2,
            }}>
              {(d.player ?? "?").split(" ").map((p) => p.charAt(0)).join("").slice(0,3).toUpperCase()}
            </div>
          )}
          <div style={{
            position: "absolute", top: 6, left: 6,
            background: C.navy, color: "#fbbf24",
            fontFamily: "Impact, sans-serif", fontSize: 11, letterSpacing: 1.5,
            padding: "2px 6px", borderRadius: 3, border: `1px solid ${C.orange}`,
          }}>{d.position ?? "—"}</div>
          {meta.team && (
            <div style={{
              position: "absolute", top: 6, right: 6,
              background: "#fff", color: C.navy,
              fontFamily: "Impact, sans-serif", fontSize: 11, letterSpacing: 1.5,
              padding: "2px 6px", borderRadius: 3, border: `1px solid ${C.navy}`,
            }}>{meta.team}</div>
          )}
        </div>

        {/* SUB-HEADER: AI VERDICT */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center", padding: "8px 4px 6px",
          borderBottom: `1px dashed ${C.rule}`,
        }}>
          <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1.5, fontFamily: "Georgia,serif" }}>
            ★ {LEAGUE_NAME}
          </div>
          <div style={{
            border: `2px solid ${recColor}`, borderRadius: 4, padding: "2px 10px",
            fontFamily: "Impact, sans-serif", fontSize: 16, color: recColor,
            letterSpacing: 2,
          }}>{recBig}</div>
          <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1.5, textAlign: "right", fontFamily: "Georgia,serif" }}>
            CARD No. {cardNo}
          </div>
        </div>

        {/* VITALS LINE */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          gap: 2, marginTop: 8, fontFamily: "Georgia,serif",
        }}>
          {copy.vitals.map((v) => (
            <div key={v.label} style={{
              textAlign: "center",
              borderRight: `1px solid ${C.rule}`,
              padding: "0 2px",
            }}>
              <div style={{ fontSize: 7, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase" }}>
                {v.label}
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.1,
                fontFamily: "'Courier New', monospace",
              }}>{v.value}</div>
            </div>
          ))}
        </div>

        {/* PROJECTED STAT LINE — like a real Topps card back */}
        {(proj.stats && Object.keys(proj.stats).length > 0) || proj.posRank || proj.points != null ? (
          <div style={{ marginTop: 10 }}>
            <SectionRule>PROJECTED STAT LINE</SectionRule>
            {(proj.posRank || proj.overallRank) && (
              <div style={{
                marginTop: 4, display: "flex", justifyContent: "space-between",
                alignItems: "baseline", padding: "3px 6px",
                background: C.navy, color: "#fbbf24",
                fontFamily: "Impact, sans-serif", letterSpacing: 1.5, fontSize: 11,
                border: `1px solid ${C.orange}`,
              }}>
                <span>
                  PROJ. FINISH:{" "}
                  <span style={{ color: "#fff", fontSize: 14 }}>
                    {proj.posRank ? `${d.position ?? "POS"}${proj.posRank}` : "—"}
                  </span>
                </span>
                {proj.overallRank && (
                  <span style={{ fontSize: 9, color: "#fff" }}>
                    OVERALL #{proj.overallRank}
                  </span>
                )}
              </div>
            )}
            {proj.stats && Object.keys(proj.stats).length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(5, projStatCells(d.position, proj.stats).length) || 1}, 1fr)`,
                gap: 2, marginTop: 4,
                fontFamily: "Georgia, serif",
              }}>
                {projStatCells(d.position, proj.stats).slice(0,5).map((c) => (
                  <div key={c.label} style={{
                    textAlign: "center", borderRight: `1px solid ${C.rule}`, padding: "0 2px",
                  }}>
                    <div style={{ fontSize: 7, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase" }}>
                      {c.label}
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.1,
                      fontFamily: "'Courier New', monospace",
                    }}>{c.value}</div>
                  </div>
                ))}
              </div>
            )}
            {proj.points != null && (
              <div style={{
                fontSize: 8, color: C.muted, letterSpacing: 1.2, fontFamily: "Georgia,serif",
                textAlign: "right", marginTop: 2,
              }}>
                PROJ. FANTASY PTS: <span style={{ color: C.ink, fontWeight: 700 }}>{proj.points}</span>
              </div>
            )}
          </div>
        ) : null}


        {/* STAT TABLE — auction price ladder, like a stat line on card back */}
        <div style={{ marginTop: 10 }}>
          <SectionRule>AUCTION PRICE LINE</SectionRule>
          <table style={{
            width: "100%", borderCollapse: "collapse", marginTop: 4,
            fontFamily: "'Courier New', monospace",
          }}>
            <thead>
              <tr style={{ background: C.navy, color: "#fbbf24" }}>
                <th style={th()}>BID</th>
                <th style={th()}>$</th>
                <th style={{ ...th(), textAlign: "right" }}>VERDICT</th>
              </tr>
            </thead>
            <tbody>
              {insights.ladder.slice(0,5).map((row, i) => (
                <tr key={row.label} style={{
                  background: i % 2 === 0 ? C.paper : "transparent",
                }}>
                  <td style={td()}>{["1ST","2ND","3RD","4TH","5TH"][i] ?? `${i+1}TH`}</td>
                  <td style={{ ...td(), fontWeight: 700 }}>${row.price}</td>
                  <td style={{ ...td(), textAlign: "right", color: toneColor(row.tone), fontWeight: 700 }}>
                    {row.label}
                  </td>
                </tr>
              ))}
              <tr style={{ background: C.navy, color: "#fff" }}>
                <td style={{ ...td(), color: "#fbbf24" }}>WALK</td>
                <td style={{ ...td(), color: "#fff", fontWeight: 700 }}>${insights.walkAway}</td>
                <td style={{ ...td(), textAlign: "right", color: "#fbbf24" }}>HARD STOP</td>
              </tr>
              <tr>
                <td style={td()}>EXP.</td>
                <td style={{ ...td(), fontWeight: 700 }}>
                  ${Math.max(1, insights.expectedFinal - 2)}–{insights.expectedFinal + 2}
                </td>
                <td style={{ ...td(), textAlign: "right", color: C.muted }}>FINAL BID</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SCOUTING REPORT — the prose paragraph (the classic card-back bio) */}
        <div style={{ marginTop: 10 }}>
          <SectionRule>SCOUTING REPORT</SectionRule>
          <p style={{
            margin: "5px 0 0", fontSize: 11, lineHeight: 1.45, color: C.body,
            fontFamily: "Georgia, 'Times New Roman', serif",
            textAlign: "justify",
          }}>
            <span style={{
              fontFamily: "Impact, sans-serif", fontSize: 18, color: C.orange,
              float: "left", lineHeight: 0.9, paddingRight: 4, paddingTop: 2,
            }}>{firstName(d.player).charAt(0) || "•"}</span>
            {copy.scoutingReport}
          </p>
        </div>

        {/* CAREER NOTES + RISKS — two-column note block */}
        <div style={{
          marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
        }}>
          <div>
            <SectionRule small>PATH TO SMASH</SectionRule>
            <ul style={notesList()}>
              {copy.pathToSmash.map((s) => (
                <li key={s} style={noteItem()}>
                  <span style={{ color: C.green, fontWeight: 900 }}>+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionRule small>RISK FACTORS</SectionRule>
            <ul style={notesList()}>
              {copy.risks.map((s) => (
                <li key={s} style={noteItem()}>
                  <span style={{ color: C.red, fontWeight: 900 }}>−</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* DID YOU KNOW — single fun-fact strip, like classic Topps trivia */}
        <div style={{
          marginTop: 10, padding: "6px 8px", border: `1px solid ${C.rule}`,
          background: C.paper, borderRadius: 3,
          fontFamily: "Georgia, serif", fontSize: 10, lineHeight: 1.4,
          color: C.body, fontStyle: "italic",
        }}>
          <span style={{
            fontFamily: "Impact, sans-serif", fontStyle: "normal",
            color: C.orange, letterSpacing: 1.5, fontSize: 10, marginRight: 6,
          }}>DID YOU KNOW?</span>
          {copy.didYouKnow}
        </div>

        {/* IDEAL STACKS strip */}
        <div style={{
          marginTop: 8, display: "flex", alignItems: "baseline", gap: 6,
          fontFamily: "Georgia, serif", fontSize: 10, color: C.body,
          borderTop: `1px dashed ${C.rule}`, paddingTop: 6,
        }}>
          <span style={{
            fontFamily: "Impact, sans-serif", color: C.navy, letterSpacing: 1.5,
            fontSize: 10,
          }}>IDEAL STACKS:</span>
          <span style={{ flex: 1 }}>{copy.stacks.join(" • ")}</span>
        </div>

        {/* FOOTER — copyright / printer line */}
        <div style={{
          marginTop: 10, paddingTop: 6, borderTop: `2px solid ${C.navy}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: "Georgia, serif", fontSize: 7, color: C.muted, letterSpacing: 1,
        }}>
          <span>© AUCTION COACH PRO 2026</span>
          <span>SERIES I · {cardNo}/399</span>
          <span>PRINTED IN U.S.A.</span>
        </div>
      </div>
    </article>
  );
}

// ─── primitives ──────────────────────────────────────────
function SectionRule({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <span style={{ flex: "0 0 6px", height: 2, background: C.orange }} />
      <span style={{
        fontFamily: "Impact, sans-serif", letterSpacing: 2,
        fontSize: small ? 9 : 10, color: C.navy,
      }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: C.navy }} />
    </div>
  );
}

function th(): CSSProperties {
  return {
    fontSize: 8, letterSpacing: 1.2, padding: "3px 6px",
    textAlign: "left", fontFamily: "Impact, sans-serif", fontWeight: 400,
  };
}
function td(): CSSProperties {
  return {
    fontSize: 10, padding: "3px 6px", color: C.body,
    borderBottom: `1px dotted ${C.rule}`,
  };
}
function notesList(): CSSProperties {
  return { listStyle: "none", padding: 0, margin: "4px 0 0", display: "flex", flexDirection: "column", gap: 2 };
}
function noteItem(): CSSProperties {
  return {
    display: "flex", gap: 5, alignItems: "flex-start",
    fontFamily: "Georgia, serif", fontSize: 10, color: C.body, lineHeight: 1.3,
  };
}
function toneColor(t: string) {
  return t === "good" ? C.green : t === "ok" ? C.amber : t === "warn" ? C.orange : C.red;
}
function firstName(full: string): string {
  if (!full) return "this player";
  return full.split(" ")[0] || full;
}

// ─── derived copy ────────────────────────────────────────
function buildCopy(d: DecisionResult, insights: ReturnType<typeof computeCardInsights>, posRank?: number | null) {
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

  // Tier from real positional rank when available (RB1 → T1), else fall back to anchor $.
  const tier = (() => {
    if (posRank && pos && pos !== "player") {
      const t = tierForPosRank(pos, posRank);
      return String(t);
    }
    return anchor >= 45 ? "1" : anchor >= 28 ? "2" : anchor >= 15 ? "3" : "4";
  })();

  const vitals = [
    { label: "Tier",   value: `T${tier}` },
    { label: "Anchor", value: `$${d.anchorPrice ?? anchor}` },
    { label: "Cap",    value: `$${d.goUpTo ?? insights.walkAway}` },
    { label: "Now",    value: `$${d.currentPrice ?? "—"}` },
  ];

  const scoutingReport = (() => {
    const fn = firstName(d.player);
    const tierStr = anchor >= 45 ? "tier-defining" : anchor >= 25 ? "weekly-starter" : "value-tier";
    const recPart =
      insights.bigDecision === "AGGRESSIVE BUY"
        ? `Aggressive bidding is justified — push to $${d.goUpTo} when the build supports it.`
        : insights.bigDecision === "BAIT NOMINATION"
        ? `Best deployed as a budget-drainer; float the name early and let opponents commit cap.`
        : insights.bigDecision === "PASS AT COST"
        ? `The market is over-paying — discipline at $${insights.walkAway} keeps the build intact.`
        : `A controlled-value target. Buy at or below $${d.goUpTo}; the next tier is one nomination away.`;
    return `${fn} grades out as a ${tierStr} ${pos} with the production profile to swing close weeks. ${recPart} Expected hammer in the $${Math.max(1, insights.expectedFinal-2)}–$${insights.expectedFinal+2} window.`;
  })();

  const pathToSmash: string[] = (() => {
    if (pos === "QB") return ["Rushing floor holds", "Stack partner produces", "17-week health"];
    if (pos === "RB") return ["Goal-line role sticks", "Passing-down work climbs", "O-line stays healthy"];
    if (pos === "WR") return ["Alpha target share", "QB plays full year", "Red-zone looks spike"];
    if (pos === "TE") return ["Routes per game ≥ 30", "Red-zone looks spike", "Stays healthy"];
    return ["Price stays cheap", "Role beats projection", "Volume materializes"];
  })();

  const risks: string[] = (() => {
    const base: string[] = [];
    if (anchor >= 35) base.push("Premium auction cost");
    if (pos === "RB") base.push("Soft-tissue risk", "Game-script reliant");
    else if (pos === "WR") base.push("QB injury craters value", "Boom/bust weekly");
    else if (pos === "QB") base.push("Defense-scoring tied", "Rushing volume dip");
    else base.push("Tight roster window", "Volume not guaranteed");
    return base.slice(0, 3);
  })();

  const stacks: string[] = (() => {
    if (pos === "WR" || pos === "TE") return ["Same-team QB", "Cheap WR2", "Game-env. DST"];
    if (pos === "QB") return ["Top WR", "Cheap TE", "Pace-up DST"];
    if (pos === "RB") return ["Elite WR pair", "Late handcuff", "Run-heavy DST"];
    return ["Anchor RB", "QB/WR stack", "Late DST"];
  })();

  const didYouKnow = (() => {
    const fn = firstName(d.player);
    if (anchor >= 45) return `${fn} ranks among the top auction nominations every season — early-round managers historically commit 25%+ of cap to secure this tier.`;
    if (anchor >= 25) return `${fn} sits in the league's middle-tier sweet spot — most title teams roster 2-3 players priced exactly here.`;
    return `${fn} is exactly the kind of late-auction value pocket that funds elite anchors at the top of the build.`;
  })();

  return { recBig, recColor, vitals, scoutingReport, pathToSmash, risks, stacks, didYouKnow };
}

function projStatCells(pos: string | null | undefined, s: ProjStats): { label: string; value: string }[] {
  const fmt = (n?: number) => (n == null ? "—" : n.toLocaleString());
  if (pos === "QB") {
    return [
      { label: "Pa Yds", value: fmt(s.passYds) },
      { label: "Pa TD",  value: fmt(s.passTD) },
      { label: "Int",    value: fmt(s.int) },
      { label: "Ru Yds", value: fmt(s.rushYds) },
      { label: "Ru TD",  value: fmt(s.rushTD) },
    ].filter((c) => c.value !== "—");
  }
  if (pos === "RB") {
    return [
      { label: "Att",    value: fmt(s.rushAtt) },
      { label: "Ru Yds", value: fmt(s.rushYds) },
      { label: "Ru TD",  value: fmt(s.rushTD) },
      { label: "Rec",    value: fmt(s.rec) },
      { label: "Re Yds", value: fmt(s.recYds) },
    ].filter((c) => c.value !== "—");
  }
  if (pos === "WR" || pos === "TE") {
    return [
      { label: "Tgt",    value: fmt(s.targets) },
      { label: "Rec",    value: fmt(s.rec) },
      { label: "Re Yds", value: fmt(s.recYds) },
      { label: "Re TD",  value: fmt(s.recTD) },
      { label: "Games",  value: fmt(s.games) },
    ].filter((c) => c.value !== "—");
  }
  // Fallback: show whatever is present
  return Object.entries(s).slice(0, 5).map(([k, v]) => ({ label: k, value: fmt(v) }));
}
