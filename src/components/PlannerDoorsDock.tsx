// Budget Planner — Doors-inspired aesthetic.
// 60s psychedelic art-nouveau: hand-lettered serifs, sunset gradients, organic frames.
// Colors stay within existing palette (deep navy surface + warm primary).
// Functionality mirrors src/pages/Planner.tsx (allocation + affordability + lookup).
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDraftStore } from "@/lib/draft-store";
import { computeBudget } from "@/lib/draft-math";
import { Position, PriceEstimate } from "@/lib/draft-types";
import { getStrategy } from "@/lib/strategies";
import PricedPlayerAutocomplete from "@/components/PricedPlayerAutocomplete";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Slot { id: string; label: string; pos: Position | "FLEX" | "SUPERFLEX" | "BENCH"; }
type RosterShape = ReturnType<typeof useDraftStore.getState>["settings"]["roster"];

function buildSlots(roster: RosterShape): Slot[] {
  const order: { key: keyof RosterShape; pos: Slot["pos"]; pretty: string }[] = [
    { key: "QB", pos: "QB", pretty: "QB" }, { key: "RB", pos: "RB", pretty: "RB" },
    { key: "WR", pos: "WR", pretty: "WR" }, { key: "TE", pos: "TE", pretty: "TE" },
    { key: "FLEX", pos: "FLEX", pretty: "FLEX" }, { key: "SUPERFLEX", pos: "SUPERFLEX", pretty: "SF" },
    { key: "K", pos: "K", pretty: "K" }, { key: "DST", pos: "DST", pretty: "DST" },
    { key: "BENCH", pos: "BENCH", pretty: "Bench" },
  ];
  const slots: Slot[] = [];
  for (const row of order) {
    const n = roster[row.key];
    for (let i = 1; i <= n; i++) {
      slots.push({ id: `${String(row.key)}-${i}`, label: n > 1 ? `${row.pretty}${i}` : row.pretty, pos: row.pos });
    }
  }
  return slots;
}

function suggestedAllocations(slots: Slot[], budget: number, strategyWeights?: Partial<Record<Slot["pos"], number[]>>): Record<string, number> {
  const base: Record<Slot["pos"], number[]> = {
    QB: [10, 7, 1], RB: [7, 4.5, 2.5, 1.5, 1], WR: [6.5, 4.5, 3, 1.5, 1],
    TE: [2.5, 1], FLEX: [2.5], SUPERFLEX: [7, 1], K: [0.05], DST: [0.05],
    BENCH: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  };
  const weights: Record<Slot["pos"], number[]> = { ...base };
  if (strategyWeights) {
    for (const k of Object.keys(strategyWeights) as (keyof typeof base)[]) {
      const mult = strategyWeights[k] ?? [];
      weights[k] = base[k].map((v, i) => v * (mult[i] ?? 1));
    }
  }
  const counts: Record<Slot["pos"], number> = { QB:0,RB:0,WR:0,TE:0,FLEX:0,SUPERFLEX:0,K:0,DST:0,BENCH:0 };
  const slotWeights = slots.map((s) => {
    const i = counts[s.pos]++;
    const ws = weights[s.pos]; return ws[Math.min(i, ws.length-1)];
  });
  const sumW = slotWeights.reduce((a,b)=>a+b,0) || 1;
  const out: Record<string, number> = {};
  let allocated = 0;
  slots.forEach((s,i) => {
    const v = Math.max(1, Math.round((slotWeights[i] / sumW) * budget));
    out[s.id] = v; allocated += v;
  });
  const diff = budget - allocated;
  if (diff !== 0) {
    const biggestId = [...slots].sort((a,b) => out[b.id] - out[a.id])[0].id;
    out[biggestId] = Math.max(1, out[biggestId] + diff);
  }
  return out;
}

// Doors palette — within existing dark navy world, but with sunset warmth.
const D = {
  page: "#0a0604",          // night
  surface: "#140a06",        // deep amber-black
  ink: "#f4e6cf",            // bone
  mute: "#9a8770",
  faint: "#6a5a48",
  amber: "#e8a85a",          // morrison sunset
  amberHot: "#d97a3a",
  blood: "#b53a2a",          // L.A. Woman red
  hair: "rgba(232,168,90,0.18)",
  hairlite: "rgba(232,168,90,0.08)",
};

const DOORS_SERIF = "'Cormorant Garamond', 'EB Garamond', 'Instrument Serif', Georgia, serif";
const DOORS_DISPLAY = "'Cormorant Garamond', 'EB Garamond', Georgia, serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

export default function PlannerDoorsDock({ open, onOpenChange }: Props) {
  const {
    settings, keepers, events, prices,
    slotAllocations, setSlotAllocation, setSlotAllocations, clearSlotAllocations,
    strategyId,
  } = useDraftStore();
  const strategy = getStrategy(strategyId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const slots = useMemo(() => buildSlots(settings.roster), [settings.roster]);
  const budget = useMemo(() => computeBudget(settings, keepers, events), [settings, keepers, events]);

  useEffect(() => {
    const known = new Set(Object.keys(slotAllocations));
    const slotIds = new Set(slots.map((s) => s.id));
    const sameSet = known.size === slotIds.size && [...slotIds].every((id) => known.has(id));
    if (!sameSet) setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, strategy.weights));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length, settings.totalBudget]);

  const totalAllocated = useMemo(
    () => slots.reduce((s, sl) => s + (slotAllocations[sl.id] ?? 0), 0),
    [slots, slotAllocations]
  );
  const diff = settings.totalBudget - totalAllocated;

  // Affordability
  const [a, setA] = useState(""); const [b, setB] = useState(""); const [c, setC] = useState("");
  const rows = [a,b,c].filter((s) => s.trim().length > 0);
  const priceFor = (name: string) => {
    if (!name.trim()) return null;
    const k = norm(name);
    const hit = prices.find((p) => norm(p.name) === k);
    if (!hit) return null;
    return { price: hit.price, pos: (hit as PriceEstimate & { position?: Position }).position };
  };
  const results = rows.map((n) => ({ name: n.trim(), info: priceFor(n) }));
  const sumCheck = results.reduce((s,r) => s + (r.info?.price ?? 0), 0);
  const remainAfter = budget.remaining - sumCheck;
  const slotsAfter = budget.slotsLeft - results.filter((r) => r.info).length;
  const minNeed = Math.max(0, slotsAfter);
  const canAfford = sumCheck > 0 && remainAfter >= minNeed && slotsAfter >= 0;

  // Lookup
  const [lkBudget, setLkBudget] = useState("");
  const [lkPos, setLkPos] = useState<"ANY" | Position>("ANY");
  const draftedKeys = useMemo(
    () => new Set([...events.map((e) => norm(e.player)), ...keepers.map((k) => norm(k.player))]),
    [events, keepers]
  );
  const lookupResults = useMemo(() => {
    const target = parseInt(lkBudget, 10);
    if (!Number.isFinite(target) || target <= 0) return [];
    const tol = Math.max(2, Math.round(target * 0.15));
    return prices
      .filter((p) => !draftedKeys.has(norm(p.name)))
      .filter((p) => {
        const pos = (p as PriceEstimate & { position?: Position }).position;
        if (lkPos !== "ANY" && pos && pos !== lkPos) return false;
        if (lkPos !== "ANY" && !pos) return false;
        return p.price >= target - tol && p.price <= target + tol;
      })
      .sort((x,y) => Math.abs(x.price - target) - Math.abs(y.price - target))
      .slice(0, 12);
  }, [prices, draftedKeys, lkBudget, lkPos]);

  const sectionTitle: React.CSSProperties = {
    fontFamily: DOORS_DISPLAY, fontSize: 36, lineHeight: 1, letterSpacing: "-0.01em",
    fontWeight: 500, fontStyle: "italic", color: D.amber,
  };
  const sectionRoman: React.CSSProperties = {
    fontFamily: MONO, fontSize: 10, letterSpacing: "0.32em", color: D.faint,
    textTransform: "uppercase", marginBottom: 12,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
        .doors-scroll::-webkit-scrollbar { width: 6px; }
        .doors-scroll::-webkit-scrollbar-thumb { background: ${D.hair}; border-radius: 3px; }
        .doors-input {
          background: rgba(232,168,90,0.05);
          border: 1px solid ${D.hair};
          color: ${D.ink};
          font-family: ${MONO};
          font-size: 13px;
          padding: 6px 10px;
          border-radius: 2px;
          width: 100%;
          outline: none;
          transition: border-color .2s;
        }
        .doors-input:focus { border-color: ${D.amber}; }
        .doors-btn {
          font-family: ${DOORS_SERIF};
          font-style: italic;
          font-size: 14px;
          color: ${D.amber};
          background: transparent;
          border: 1px solid ${D.hair};
          padding: 4px 12px;
          border-radius: 999px;
          cursor: pointer;
          transition: all .2s;
        }
        .doors-btn:hover { background: rgba(232,168,90,0.08); border-color: ${D.amber}; }
        .doors-pos-pill {
          font-family: ${MONO}; font-size: 10px; letterSpacing: 0.15em;
          padding: 3px 8px; border-radius: 2px; border: 1px solid ${D.hair};
          color: ${D.mute}; cursor: pointer; background: transparent;
          text-transform: uppercase;
        }
        .doors-pos-pill.active {
          background: ${D.amber}; color: ${D.page}; border-color: ${D.amber};
        }
        .doors-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, ${D.hair} 20%, ${D.amber} 50%, ${D.hair} 80%, transparent);
          margin: 28px 0 20px;
        }
        .doors-ornament {
          text-align: center; color: ${D.amber}; font-family: ${DOORS_SERIF};
          font-size: 18px; letterSpacing: 0.4em; margin: 4px 0 16px;
        }
      `}</style>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
              style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)" }}
            />
            <motion.aside
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              style={{
                position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 45,
                height: "92vh",
                background: `radial-gradient(ellipse at 50% -10%, ${D.amberHot}22 0%, transparent 55%), linear-gradient(180deg, ${D.surface} 0%, ${D.page} 100%)`,
                color: D.ink,
                borderTop: `1px solid ${D.amber}55`,
                borderTopLeftRadius: 28, borderTopRightRadius: 28,
                display: "flex", flexDirection: "column",
                fontFamily: DOORS_SERIF,
                boxShadow: "0 -30px 80px rgba(0,0,0,0.7), 0 -2px 0 rgba(232,168,90,0.15) inset",
              }}
            >
              {/* Drag handle */}
              <div style={{ display: "grid", placeItems: "center", padding: "10px 0 0" }}>
                <div style={{ width: 40, height: 3, borderRadius: 2, background: D.amber, opacity: 0.6 }} />
              </div>

              {/* Header — title plate */}
              <div style={{
                padding: "20px 28px 18px",
                borderBottom: `1px solid ${D.hairlite}`,
                position: "relative",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{
                      fontFamily: MONO, fontSize: 9, letterSpacing: "0.5em",
                      color: D.amber, marginBottom: 8, textTransform: "uppercase",
                    }}>· The Doors of Perception ·</div>
                    <div style={{
                      fontFamily: DOORS_DISPLAY, fontSize: 52, lineHeight: 0.9,
                      fontStyle: "italic", fontWeight: 500, color: D.ink,
                      letterSpacing: "-0.02em",
                    }}>
                      Budget <span style={{ color: D.amber }}>Plan</span>
                    </div>
                    <div style={{
                      fontFamily: DOORS_SERIF, fontSize: 14, color: D.mute,
                      marginTop: 6, fontStyle: "italic",
                    }}>
                      &mdash; break on through to the other side &mdash;
                    </div>
                  </div>
                  <button onClick={() => onOpenChange(false)} aria-label="Close" style={{
                    width: 36, height: 36, borderRadius: "50%", background: "transparent",
                    border: `1px solid ${D.amber}55`, color: D.amber, cursor: "pointer",
                    fontFamily: DOORS_SERIF, fontSize: 22, display: "grid", placeItems: "center",
                    flexShrink: 0,
                  }}>×</button>
                </div>

                {/* Budget summary — like a 60s LP back-cover stat block */}
                <div style={{
                  marginTop: 18, display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8, padding: "12px 0",
                  borderTop: `1px solid ${D.hair}`, borderBottom: `1px solid ${D.hair}`,
                }}>
                  {[
                    { l: "Bank", v: `$${budget.remaining}` },
                    { l: "Max Bid", v: `$${budget.maxBid}` },
                    { l: "Slots", v: `${budget.slotsLeft}` },
                    { l: "Plan", v: `$${totalAllocated}` },
                  ].map((m, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.25em", color: D.faint, textTransform: "uppercase" }}>
                        {m.l}
                      </div>
                      <div style={{ fontFamily: DOORS_DISPLAY, fontSize: 22, color: D.ink, marginTop: 2, fontStyle: "italic" }}>
                        {m.v}
                      </div>
                    </div>
                  ))}
                </div>
                {diff !== 0 && (
                  <div style={{
                    marginTop: 8, textAlign: "center", fontFamily: DOORS_SERIF, fontStyle: "italic",
                    fontSize: 13, color: diff < 0 ? D.blood : D.amberHot,
                  }}>
                    {diff > 0 ? `${diff} unspent` : `${Math.abs(diff)} over budget`}
                  </div>
                )}
              </div>

              <div className="doors-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 24px 60px" }}>

                {/* SECTION I — Allocation */}
                <div style={{ marginTop: 24 }}>
                  <div style={sectionRoman}>I · Allocation</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <h2 style={sectionTitle}>The Spend</h2>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="doors-btn"
                        onClick={() => setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, strategy.weights))}>
                        suggest
                      </button>
                      <button className="doors-btn" onClick={() => clearSlotAllocations()}>clear</button>
                    </div>
                  </div>
                  <p style={{ fontFamily: DOORS_SERIF, fontStyle: "italic", color: D.mute, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                    Divide your <span style={{ color: D.amber }}>${settings.totalBudget}</span> across the roster.
                    Auto-suggest follows the <em style={{ color: D.ink }}>{strategy.label}</em> shape.
                  </p>

                  <div style={{
                    marginTop: 16, display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: 8,
                  }}>
                    {slots.map((s) => (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 10px",
                        background: "rgba(232,168,90,0.04)",
                        border: `1px solid ${D.hairlite}`,
                        borderRadius: 2,
                      }}>
                        <div style={{
                          fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em",
                          color: D.amber, width: 38, flexShrink: 0,
                          textTransform: "uppercase",
                        }}>{s.label}</div>
                        <span style={{ color: D.faint, fontFamily: MONO, fontSize: 12 }}>$</span>
                        <input
                          type="number" inputMode="numeric" min={1}
                          value={slotAllocations[s.id] ?? ""}
                          onChange={(e) => setSlotAllocation(s.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="doors-input"
                          style={{ padding: "4px 6px", textAlign: "right" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="doors-divider" />
                <div className="doors-ornament">✦ &nbsp;✦ &nbsp;✦</div>

                {/* SECTION II — Affordability */}
                <div>
                  <div style={sectionRoman}>II · The Question</div>
                  <h2 style={sectionTitle}>Can I Afford?</h2>
                  <p style={{ fontFamily: DOORS_SERIF, fontStyle: "italic", color: D.mute, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                    Name up to three. The math will tell you what's left when the dust settles.
                  </p>

                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <PricedPlayerAutocomplete value={a} onChange={setA} prices={prices}
                      excludeNames={[...events.map(e=>e.player), ...keepers.map(k=>k.player)]}
                      placeholder="first soul…" />
                    <PricedPlayerAutocomplete value={b} onChange={setB} prices={prices}
                      excludeNames={[...events.map(e=>e.player), ...keepers.map(k=>k.player)]}
                      placeholder="+ second soul…" />
                    <PricedPlayerAutocomplete value={c} onChange={setC} prices={prices}
                      excludeNames={[...events.map(e=>e.player), ...keepers.map(k=>k.player)]}
                      placeholder="+ third soul…" />
                  </div>

                  {rows.length > 0 && (
                    <div style={{
                      marginTop: 18, padding: 16, borderRadius: 4,
                      background: "rgba(0,0,0,0.35)",
                      border: `1px solid ${D.hair}`,
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {results.map((r) => (
                          <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                            <div style={{ fontFamily: DOORS_SERIF, fontSize: 17, fontStyle: "italic", color: D.ink }}>
                              {r.name}
                              {r.info?.pos && (
                                <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: D.amber }}>
                                  · {r.info.pos}
                                </span>
                              )}
                            </div>
                            <div style={{ fontFamily: MONO, fontSize: 13, color: r.info ? D.ink : D.faint }}>
                              {r.info ? `$${r.info.price}` : "—"}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{
                        marginTop: 14, padding: "12px 14px", borderRadius: 2,
                        background: canAfford ? "rgba(232,168,90,0.12)" : "rgba(181,58,42,0.18)",
                        borderLeft: `3px solid ${canAfford ? D.amber : D.blood}`,
                        fontFamily: DOORS_SERIF, fontSize: 18, fontStyle: "italic",
                        color: canAfford ? D.amber : D.blood,
                      }}>
                        {canAfford
                          ? `Yes — the door opens.`
                          : slotsAfter < 0
                            ? `No — only ${budget.slotsLeft} spot${budget.slotsLeft===1?"":"s"} remain.`
                            : `No — leaves $${remainAfter} for ${slotsAfter} more.`}
                      </div>

                      <div style={{
                        marginTop: 12, padding: 12,
                        background: "rgba(0,0,0,0.4)",
                        fontFamily: MONO, fontSize: 11, lineHeight: 1.7, color: D.mute,
                      }}>
                        <Row l="bank now" v={`$${budget.remaining}`} />
                        <Row l="− cost" v={`−$${sumCheck}`} />
                        <Hr />
                        <Row l="= bank after" v={`$${remainAfter}`} bold />
                        <Row l="slots left after" v={`${slotsAfter}`} />
                        <Row l="min needed (1/slot)" v={`$${minNeed}`} />
                        <Row l="cushion" v={`$${remainAfter - minNeed}`} bold
                          color={remainAfter - minNeed >= 0 ? D.amber : D.blood} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="doors-divider" />
                <div className="doors-ornament">✦ &nbsp;✦ &nbsp;✦</div>

                {/* SECTION III — Lookup */}
                <div>
                  <div style={sectionRoman}>III · The Market</div>
                  <h2 style={sectionTitle}>What $X Buys</h2>
                  <p style={{ fontFamily: DOORS_SERIF, fontStyle: "italic", color: D.mute, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                    Speak a number. The market answers within a fifteen-percent breath.
                  </p>

                  <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: MONO, color: D.amber, fontSize: 14 }}>$</span>
                    <input
                      type="number" inputMode="numeric" min={1}
                      value={lkBudget} onChange={(e) => setLkBudget(e.target.value)}
                      placeholder="28"
                      className="doors-input"
                      style={{ width: 80 }}
                    />
                    <span style={{ fontFamily: DOORS_SERIF, fontStyle: "italic", color: D.mute }}>at</span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {(["ANY", "QB", "RB", "WR", "TE"] as const).map((p) => (
                        <button key={p} type="button"
                          onClick={() => setLkPos(p)}
                          className={`doors-pos-pill ${lkPos === p ? "active" : ""}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {lookupResults.length > 0 ? (
                    <ul style={{
                      marginTop: 18, listStyle: "none", padding: 0,
                      border: `1px solid ${D.hair}`, borderRadius: 2,
                      background: "rgba(0,0,0,0.3)",
                    }}>
                      {lookupResults.map((p, i) => {
                        const pos = (p as PriceEstimate & { position?: Position }).position;
                        return (
                          <li key={p.name} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "baseline",
                            padding: "10px 14px",
                            borderBottom: i < lookupResults.length - 1 ? `1px solid ${D.hairlite}` : "none",
                          }}>
                            <div style={{ fontFamily: DOORS_SERIF, fontSize: 17, color: D.ink, fontStyle: "italic" }}>
                              {p.name}
                              {pos && <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: D.amber }}>· {pos}</span>}
                            </div>
                            <div style={{ fontFamily: MONO, fontSize: 13, color: D.amber }}>${p.price}</div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : lkBudget ? (
                    <p style={{ marginTop: 12, fontFamily: DOORS_SERIF, fontStyle: "italic", fontSize: 13, color: D.faint }}>
                      The market is silent at ${lkBudget}{lkPos !== "ANY" ? ` for ${lkPos}` : ""}.
                    </p>
                  ) : null}
                </div>

                {/* Closing ornament */}
                <div style={{ marginTop: 40, textAlign: "center" }}>
                  <div style={{
                    fontFamily: DOORS_SERIF, fontStyle: "italic",
                    fontSize: 14, color: D.faint, letterSpacing: "0.05em",
                  }}>
                    &mdash; the end &mdash;
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Row({ l, v, bold, color }: { l: string; v: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: D.faint }}>{l}</span>
      <span style={{ color: color ?? (bold ? D.ink : D.mute), fontWeight: bold ? 600 : 400 }}>{v}</span>
    </div>
  );
}
function Hr() {
  return <div style={{ height: 1, background: D.hair, margin: "6px 0" }} />;
}
