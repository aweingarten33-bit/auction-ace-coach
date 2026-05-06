// Budget planner — V2 shell (bottom sheet, serif/mono palette) with the
// REAL wiring from /planner: slots derived from league roster, allocations
// persisted in the draft store, prices used for affordability checker and
// "$X buys" lookup. Three tabs (Plan / Audit / Valeur) so nothing stacks.
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDraftStore } from "@/lib/draft-store";
import { computeBudget } from "@/lib/draft-math";
import type { Position, PriceEstimate } from "@/lib/draft-types";
import { getStrategy } from "@/lib/strategies";
import PricedPlayerAutocomplete from "@/components/PricedPlayerAutocomplete";

const C = {
  page: "#0b1f3a",
  surface: "#081a30",
  input: "#102a4d",
  chip: "#1e3a5f",
  ink: "#ffffff",
  muted: "#9ca3af",
  faint: "#6b7280",
  green: "#4ade80",
  red: "#f87171",
  yellow: "#facc15",
  hair: "rgba(255,255,255,0.10)",
  hairlite: "rgba(255,255,255,0.06)",
};

const SERIF = "'Instrument Serif', 'EB Garamond', Georgia, serif";
const SANS = "'Geist', ui-sans-serif, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, 'SF Mono', monospace";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/* =========================
   🧱 SLOT BUILDER (from real league roster)
========================= */
type SlotPos = Position | "FLEX" | "SUPERFLEX" | "BENCH";
interface Slot { id: string; label: string; pos: SlotPos; isStarter: boolean }
type RosterShape = ReturnType<typeof useDraftStore.getState>["settings"]["roster"];

function buildSlots(roster: RosterShape): Slot[] {
  const order: { key: keyof RosterShape; pos: SlotPos; pretty: string }[] = [
    { key: "QB", pos: "QB", pretty: "QB" },
    { key: "RB", pos: "RB", pretty: "RB" },
    { key: "WR", pos: "WR", pretty: "WR" },
    { key: "TE", pos: "TE", pretty: "TE" },
    { key: "FLEX", pos: "FLEX", pretty: "FLEX" },
    { key: "SUPERFLEX", pos: "SUPERFLEX", pretty: "SF" },
    { key: "K", pos: "K", pretty: "K" },
    { key: "DST", pos: "DST", pretty: "DST" },
    { key: "BENCH", pos: "BENCH", pretty: "Bench" },
  ];
  const slots: Slot[] = [];
  for (const row of order) {
    const n = roster[row.key];
    for (let i = 1; i <= n; i++) {
      slots.push({
        id: `${String(row.key)}-${i}`,
        label: n > 1 ? `${row.pretty}${i}` : row.pretty,
        pos: row.pos,
        isStarter: row.pos !== "BENCH",
      });
    }
  }
  return slots;
}

function suggestedAllocations(
  slots: Slot[],
  budget: number,
  weights?: Partial<Record<SlotPos, number[]>>
): Record<string, number> {
  const base: Record<SlotPos, number[]> = {
    QB: [10, 7, 1],
    RB: [7, 4.5, 2.5, 1.5, 1],
    WR: [6.5, 4.5, 3, 1.5, 1],
    TE: [2.5, 1],
    FLEX: [2.5],
    SUPERFLEX: [7, 1],
    K: [0.05],
    DST: [0.05],
    BENCH: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  };
  const w: Record<SlotPos, number[]> = { ...base };
  if (weights) {
    for (const k of Object.keys(weights) as SlotPos[]) {
      const mult = weights[k] ?? [];
      w[k] = base[k].map((x, i) => x * (mult[i] ?? mult[mult.length - 1] ?? 1));
    }
  }
  const counters: Record<string, number> = {};
  const raw = slots.map((s) => {
    const idx = counters[s.pos] ?? 0;
    counters[s.pos] = idx + 1;
    return w[s.pos]?.[idx] ?? w[s.pos]?.[w[s.pos].length - 1] ?? 0.1;
  });
  const floor = slots.length;
  if (budget <= floor) return Object.fromEntries(slots.map((s) => [s.id, 1]));
  const pool = budget - floor;
  const sumW = raw.reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  let allocated = 0;
  slots.forEach((s, i) => {
    const v = Math.max(1, Math.round(1 + (raw[i] / sumW) * pool));
    out[s.id] = v;
    allocated += v;
  });
  const diff = budget - allocated;
  if (diff !== 0) {
    const biggestId = [...slots].sort((a, b) => out[b.id] - out[a.id])[0].id;
    out[biggestId] = Math.max(1, out[biggestId] + diff);
  }
  return out;
}

/* =========================
   🚀 ENTRY
========================= */
interface BudgetPlannerV2Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showFab?: boolean;
}

export default function BudgetPlannerV2({ open: openProp, onOpenChange, showFab = true }: BudgetPlannerV2Props = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@300;400&display=swap');
        .bp-scroll::-webkit-scrollbar { width: 6px; }
        .bp-scroll::-webkit-scrollbar-thumb { background: ${C.hair}; border-radius: 3px; }
        .bp-input::-webkit-outer-spin-button, .bp-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .bp-input[type=number] { -moz-appearance: textfield; }
        .bp-input:focus { outline: none; }
      `}</style>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
            />
            <motion.aside
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              style={{
                position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 45,
                height: "85vh", background: C.page, color: C.ink,
                borderTop: `1px solid ${C.hair}`,
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                display: "flex", flexDirection: "column",
                fontFamily: SANS,
                boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <SheetHandle />
              <PanelHeader setOpen={setOpen} />
              <PlannerBody />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 280 }}
        aria-label={open ? "Close planner" : "Open planner"}
        style={{
          position: "fixed", bottom: 84, right: 16, zIndex: 50,
          width: 56, height: 56, borderRadius: "50%",
          background: C.ink, color: C.page, border: "none", cursor: "pointer",
          boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
          display: "grid", placeItems: "center",
          fontFamily: SERIF, fontSize: 26, fontWeight: 400,
        }}
      >
        $
      </motion.button>
    </>
  );
}

function SheetHandle() {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "10px 0 4px" }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: C.hair }} />
    </div>
  );
}

function PanelHeader({ setOpen }: { setOpen: (b: boolean) => void }) {
  return (
    <div style={{ padding: "12px 24px 16px", borderBottom: `1px solid ${C.hairlite}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontFamily: SERIF, fontSize: 30, fontStyle: "italic", lineHeight: 1, color: C.ink }}>
          le planner
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint, marginTop: 6 }}>
          BUDGET · AUCTION
        </div>
      </div>
      <button onClick={() => setOpen(false)} aria-label="Close" style={{
        width: 32, height: 32, borderRadius: "50%", background: "transparent",
        border: `1px solid ${C.hair}`, color: C.ink, cursor: "pointer",
        fontFamily: SERIF, fontSize: 18, display: "grid", placeItems: "center",
      }}>×</button>
    </div>
  );
}

/* =========================
   🎯 BODY — wired to draft store
========================= */
function PlannerBody() {
  const {
    settings, keepers, events, prices,
    slotAllocations, setSlotAllocation, setSlotAllocations, clearSlotAllocations,
    strategyId,
  } = useDraftStore();

  const strategy = getStrategy(strategyId);
  const slots = useMemo(() => buildSlots(settings.roster), [settings.roster]);
  const budget = useMemo(() => computeBudget(settings, keepers, events), [settings, keepers, events]);

  // Initialize allocations once if shape changed
  useEffect(() => {
    const known = new Set(Object.keys(slotAllocations));
    const slotIds = new Set(slots.map((s) => s.id));
    const sameSet = known.size === slotIds.size && [...slotIds].every((id) => known.has(id));
    if (!sameSet) {
      setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, strategy.weights));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length, settings.totalBudget]);

  const totalAllocated = useMemo(
    () => slots.reduce((s, sl) => s + (slotAllocations[sl.id] ?? 0), 0),
    [slots, slotAllocations]
  );
  const planDiff = settings.totalBudget - totalAllocated;
  const balanced = planDiff >= 0;

  const [tab, setTab] = useState<"plan" | "audit" | "value">("plan");
  const tabs = [
    { id: "plan" as const, label: "Plan" },
    { id: "audit" as const, label: "Audit" },
    { id: "value" as const, label: "Valeur" },
  ];

  return (
    <div className="bp-scroll" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "16px 24px 28px" }}>
        {/* SNAPSHOT — Reste is the hero, real numbers from store */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint }}>
            RESTE · BANK
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 56, lineHeight: 1, color: C.ink, marginTop: 6 }}>
            ${budget.remaining}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 8, letterSpacing: "0.1em" }}>
            {budget.slotsLeft}/{budget.slotsTotal} SLOTS · MAX ${budget.maxBid}
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.hairlite}`, marginBottom: 20 }}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: "10px 0", marginRight: 24,
                fontFamily: SANS, fontSize: 13, fontWeight: active ? 500 : 400,
                color: active ? C.ink : C.muted, position: "relative",
              }}>
                {t.label}
                {active && (
                  <motion.div layoutId="bp-tab-underline" style={{
                    position: "absolute", left: 0, right: 0, bottom: -1, height: 1, background: C.ink,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {tab === "plan" && (
          <PlanTab
            slots={slots}
            allocations={slotAllocations}
            setAllocation={setSlotAllocation}
            onSuggest={() => setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, strategy.weights))}
            onReset={clearSlotAllocations}
            totalAllocated={totalAllocated}
            totalBudget={settings.totalBudget}
            planDiff={planDiff}
            balanced={balanced}
            strategyLabel={strategy.label}
          />
        )}

        {tab === "audit" && (
          <AuditTab prices={prices} events={events} keepers={keepers} budget={budget} />
        )}

        {tab === "value" && (
          <ValueTab prices={prices} events={events} keepers={keepers} />
        )}
      </div>
    </div>
  );
}

/* =========================
   📋 PLAN TAB
========================= */
function PlanTab({
  slots, allocations, setAllocation, onSuggest, onReset,
  totalAllocated, totalBudget, planDiff, balanced, strategyLabel,
}: any) {
  return (
    <>
      <div style={{
        padding: "10px 14px", border: `1px solid ${C.hair}`, borderRadius: 10,
        marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center",
        background: C.surface,
      }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: C.faint }}>STRATEGY</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.yellow, marginTop: 2 }}>{strategyLabel}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: C.faint }}>PLAN</div>
          <div style={{ fontFamily: SERIF, fontSize: 18, color: balanced ? C.ink : C.red, marginTop: 2 }}>
            ${totalAllocated} / ${totalBudget}
            {planDiff !== 0 && (
              <span style={{ fontFamily: MONO, fontSize: 11, marginLeft: 6, color: planDiff < 0 ? C.red : C.yellow }}>
                ({planDiff > 0 ? `+${planDiff}` : planDiff})
              </span>
            )}
          </div>
        </div>
      </div>

      <SectionHeader title="Allocations" caption="$ PER SLOT">
        <Linkish onClick={onSuggest}>Suggest</Linkish>
        <Linkish onClick={onReset}>Reset</Linkish>
      </SectionHeader>

      <div>
        {slots.map((s: Slot) => (
          <SlotRow key={s.id} label={s.label} value={allocations[s.id] ?? 0} isStarter={s.isStarter}
            onChange={(v: number) => setAllocation(s.id, Math.max(1, v))}
          />
        ))}
      </div>
    </>
  );
}

function SlotRow({ label, value, isStarter, onChange }: any) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: `1px solid ${C.hairlite}`,
    }}>
      <span style={{
        fontFamily: SERIF, fontSize: 17,
        color: isStarter ? C.ink : C.muted,
        fontStyle: isStarter ? "normal" : "italic",
      }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.faint }}>$</span>
        <input className="bp-input" type="number" value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            width: 56, textAlign: "right",
            fontFamily: MONO, fontSize: 16,
            background: "transparent", border: "none",
            borderBottom: `1px solid ${focus ? C.yellow : "transparent"}`,
            paddingBottom: 2, color: C.ink, transition: "border-color 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}

/* =========================
   🧮 AUDIT TAB — real autocomplete + verdict math
========================= */
function AuditTab({ prices, events, keepers, budget }: any) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const rows = [a, b, c].filter((s) => s.trim().length > 0);

  const priceFor = (name: string) => {
    if (!name.trim()) return null;
    const k = norm(name);
    const hit = prices.find((p: PriceEstimate) => norm(p.name) === k);
    if (!hit) return null;
    return { price: hit.price, pos: (hit as any).position as Position | undefined };
  };

  const results = rows.map((n) => ({ name: n.trim(), info: priceFor(n) }));
  const sum = results.reduce((s, r) => s + (r.info?.price ?? 0), 0);
  const remainingAfter = budget.remaining - sum;
  const slotsAfter = budget.slotsLeft - results.filter((r) => r.info).length;
  const minNeeded = Math.max(0, slotsAfter);
  const canAfford = sum > 0 && remainingAfter >= minNeeded && slotsAfter >= 0;

  const exclude = [...events.map((e: any) => e.player), ...keepers.map((k: any) => k.player)];

  return (
    <>
      <SectionHeader title="Audit" caption="CAN I AFFORD X+Y+Z?" />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <PricedPlayerAutocomplete value={a} onChange={setA} prices={prices} excludeNames={exclude} placeholder="Player 1" />
        <PricedPlayerAutocomplete value={b} onChange={setB} prices={prices} excludeNames={exclude} placeholder="+ Player 2" />
        <PricedPlayerAutocomplete value={c} onChange={setC} prices={prices} excludeNames={exclude} placeholder="+ Player 3" />
      </div>

      <div style={{
        padding: "16px 18px", border: `1px solid ${C.hair}`, borderRadius: 12, background: C.surface,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint, marginBottom: 10 }}>
          VERDICT
        </div>

        {rows.length === 0 ? (
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.muted }}>
            add a name to begin
          </div>
        ) : (
          <>
            {/* per-player */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {results.map((r) => (
                <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 16, color: C.ink }}>{r.name}</span>
                    {r.info?.pos && (
                      <span style={{
                        fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em",
                        padding: "2px 6px", borderRadius: 4,
                        background: C.chip, color: C.muted,
                      }}>{r.info.pos}</span>
                    )}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: r.info ? C.ink : C.faint }}>
                    {r.info ? `$${r.info.price}` : "no price"}
                  </span>
                </div>
              ))}
            </div>

            {/* verdict pill */}
            <div style={{
              padding: "10px 12px", borderRadius: 8, marginBottom: 12,
              background: canAfford ? "rgba(74,222,128,0.10)" : "rgba(248,113,113,0.10)",
              border: `1px solid ${canAfford ? "rgba(74,222,128,0.40)" : "rgba(248,113,113,0.40)"}`,
              fontFamily: SERIF, fontSize: 16,
              color: canAfford ? C.green : C.red,
            }}>
              {canAfford
                ? "Yes — you can afford this"
                : slotsAfter < 0
                  ? `No — only ${budget.slotsLeft} roster spot${budget.slotsLeft === 1 ? "" : "s"} left`
                  : `No — leaves $${remainingAfter} for ${slotsAfter} more slot${slotsAfter === 1 ? "" : "s"}`}
            </div>

            {/* the math */}
            <div style={{
              fontFamily: MONO, fontSize: 11, color: C.muted, lineHeight: 1.7,
            }}>
              <Line k="Bank now" v={`$${budget.remaining}`} />
              <Line k="− Cost" v={`−$${sum}`} />
              <Divider />
              <Line k="= After" v={`$${remainingAfter}`} bold />
              <div style={{ height: 6 }} />
              <Line k="Slots open" v={`${budget.slotsLeft}`} />
              <Line k="− Used" v={`−${results.filter((r) => r.info).length}`} />
              <Divider />
              <Line k="= Slots left" v={`${slotsAfter}`} bold />
              <div style={{ height: 6 }} />
              <Line k="Min needed ($1/slot)" v={`$${minNeeded}`} />
              <Line k="Cushion" v={`$${remainingAfter - minNeeded}`} accent={remainingAfter - minNeeded >= 0 ? C.green : C.red} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Line({ k, v, bold, accent }: { k: string; v: string; bold?: boolean; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: C.faint }}>{k}</span>
      <span style={{ color: accent ?? (bold ? C.ink : C.muted), fontWeight: bold ? 500 : 400 }}>{v}</span>
    </div>
  );
}
function Divider() {
  return <div style={{ borderTop: `1px solid ${C.hairlite}`, margin: "4px 0" }} />;
}

/* =========================
   💎 VALEUR TAB — real $X buys lookup
========================= */
function ValueTab({ prices, events, keepers }: any) {
  const [amt, setAmt] = useState<number>(28);
  const [pos, setPos] = useState<"ANY" | Position>("ANY");

  const draftedKeys = useMemo(
    () => new Set([...events.map((e: any) => norm(e.player)), ...keepers.map((k: any) => norm(k.player))]),
    [events, keepers]
  );

  const results = useMemo(() => {
    if (!Number.isFinite(amt) || amt <= 0) return [];
    const tol = Math.max(2, Math.round(amt * 0.15));
    return prices
      .filter((p: PriceEstimate) => !draftedKeys.has(norm(p.name)))
      .filter((p: PriceEstimate) => {
        const ppos = (p as any).position as Position | undefined;
        if (pos !== "ANY" && ppos && ppos !== pos) return false;
        if (pos !== "ANY" && !ppos) return false;
        return p.price >= amt - tol && p.price <= amt + tol;
      })
      .sort((a: PriceEstimate, b: PriceEstimate) => Math.abs(a.price - amt) - Math.abs(b.price - amt))
      .slice(0, 12);
  }, [prices, draftedKeys, amt, pos]);

  const positions: Array<"ANY" | Position> = ["ANY", "QB", "RB", "WR", "TE"];

  return (
    <>
      <SectionHeader title="Valeur" caption="WHAT DOES $X BUY?" />

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14, marginTop: 4 }}>
        <span style={{ fontFamily: SERIF, fontSize: 32, color: C.muted }}>$</span>
        <input className="bp-input" type="number" value={amt}
          onChange={(e) => setAmt(Math.max(0, Number(e.target.value) || 0))}
          style={{
            width: 72, fontFamily: SERIF, fontSize: 32, color: C.ink,
            background: "transparent", border: "none",
            borderBottom: `1px solid ${C.ink}`, padding: "2px 4px",
          }}
        />
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.muted, marginLeft: 8 }}>at</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {positions.map((p) => {
          const active = pos === p;
          return (
            <button key={p} onClick={() => setPos(p)} style={{
              padding: "7px 14px",
              background: active ? C.chip : "transparent",
              color: active ? C.ink : C.muted,
              border: `1px solid ${active ? C.chip : C.hair}`,
              borderRadius: 999, cursor: "pointer",
              fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em",
              transition: "all 0.18s ease",
            }}>{p}</button>
          );
        })}
      </div>

      <div style={{
        border: `1px solid ${C.hair}`, borderRadius: 12, background: C.surface, overflow: "hidden",
      }}>
        {results.length === 0 ? (
          <div style={{ padding: "16px 18px", fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: C.muted }}>
            {prices.length === 0
              ? "no price sheet loaded yet"
              : `nothing within ±15% of $${amt}${pos !== "ANY" ? ` at ${pos}` : ""}`}
          </div>
        ) : (
          results.map((p: PriceEstimate) => {
            const ppos = (p as any).position as Position | undefined;
            return (
              <div key={p.name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 16px", borderBottom: `1px solid ${C.hairlite}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 16, color: C.ink }}>{p.name}</span>
                  {ppos && (
                    <span style={{
                      fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em",
                      padding: "2px 6px", borderRadius: 4,
                      background: C.chip, color: C.muted,
                    }}>{ppos}</span>
                  )}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 14, color: C.ink }}>${p.price}</span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

/* =========================
   🧩 SHARED
========================= */
function SectionHeader({ title, caption, children }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
      <div>
        <div style={{ fontFamily: SERIF, fontSize: 22, color: C.ink }}>{title}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: C.faint, marginTop: 4 }}>
          {caption}
        </div>
      </div>
      {children && <div style={{ display: "flex", gap: 16 }}>{children}</div>}
    </div>
  );
}

function Linkish({ children, onClick }: any) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", border: "none", cursor: "pointer",
      fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: C.muted,
      borderBottom: `1px solid ${C.hair}`, padding: "2px 0",
    }}>{children}</button>
  );
}
