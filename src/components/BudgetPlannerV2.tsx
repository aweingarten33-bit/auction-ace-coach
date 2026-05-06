import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  page: "#0b1f3a",
  surface: "#081a30",
  input: "#102a4d",
  chip: "#1e3a5f",
  ink: "#ffffff",
  muted: "#9ca3af",
  faint: "#6b7280",
  green: "#4ade80",
  yellow: "#facc15",
  hair: "rgba(255,255,255,0.10)",
  hairlite: "rgba(255,255,255,0.06)",
};

const SERIF = "'Instrument Serif', 'EB Garamond', Georgia, serif";
const SANS = "'Geist', ui-sans-serif, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, 'SF Mono', monospace";

type Row = [string, number];

const INITIAL: Row[] = [
  ["QB", 52], ["RB1", 32], ["RB2", 21], ["WR1", 30], ["WR2", 21],
  ["WR3", 14], ["TE", 12], ["FLEX", 32], ["K", 1], ["DST", 1],
  ["Bench 1", 1], ["Bench 2", 1], ["Bench 3", 1], ["Bench 4", 1],
  ["Bench 5", 1], ["Bench 6", 1], ["Bench 7", 1], ["Bench 8", 1], ["Bench 9", 1],
];

const STARTERS = new Set(["QB", "RB1", "RB2", "WR1", "WR2", "WR3", "TE", "FLEX", "K", "DST"]);

/* =========================
   🧠 CORE PLANNER LOGIC
========================= */
function usePlanner(initial: Row[], bank: number) {
  const [rows, setRows] = useState<Row[]>(initial);
  const total = rows.reduce((s, r) => s + (Number(r[1]) || 0), 0);
  const remaining = bank - total;
  const balanced = total <= bank;

  const update = (index: number, value: number) =>
    setRows(prev => prev.map((r, i) => (i === index ? [r[0], value] as Row : r)));

  const reset = () => setRows(initial);
  const suggestPlan = () => setRows(suggest(bank));

  return { rows, update, reset, suggestPlan, total, remaining, balanced, bank };
}

/* =========================
   🚀 ENTRY
========================= */
export default function BudgetPlannerV2({ bank = 225 }: { bank?: number }) {
  const planner = usePlanner(INITIAL, bank);
  return <PlannerDock planner={planner} />;
}

/* =========================
   💬 FLOATING DOCK (BOTTOM SHEET)
========================= */
function PlannerDock({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  const [open, setOpen] = useState(false);

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
              <div className="bp-scroll" style={{ flex: 1, overflowY: "auto" }}>
                <PlannerView planner={planner} />
              </div>
              <PanelFooter remaining={planner.remaining} balanced={planner.balanced} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 280 }}
        aria-label={open ? "Close planner" : "Open planner"}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 50,
          width: 64, height: 64, borderRadius: "50%",
          background: C.ink, color: C.page, border: "none", cursor: "pointer",
          boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
          display: "grid", placeItems: "center",
          fontFamily: SERIF, fontSize: 30, fontWeight: 400,
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
   🎯 PLANNER VIEW (TABBED)
========================= */
function PlannerView({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  const { rows, update, reset, suggestPlan, total, remaining, bank, balanced } = planner;
  const [tab, setTab] = useState<"plan" | "audit" | "value">("plan");

  const tabs = [
    { id: "plan" as const, label: "Plan" },
    { id: "audit" as const, label: "Audit" },
    { id: "value" as const, label: "Valeur" },
  ];

  return (
    <div style={{ padding: "16px 24px 28px" }}>
      {/* SNAPSHOT — Remaining is the hero, always visible */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint }}>
          RESTE
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 56, lineHeight: 1, color: balanced ? C.ink : C.yellow, marginTop: 6 }}>
          ${remaining}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: balanced ? C.green : C.yellow, marginTop: 8, letterSpacing: "0.1em" }}>
          ${total} / ${bank} {balanced ? "· EN ÉQUILIBRE" : "· OVER BUDGET"}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.hairlite}`, marginBottom: 20 }}>
        {tabs.map(t => {
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
        <>
          <SectionHeader title="Allocations" caption="$ PER SLOT">
            <Linkish onClick={suggestPlan}>Suggest</Linkish>
            <Linkish onClick={reset}>Reset</Linkish>
          </SectionHeader>
          <div>
            {rows.map(([label, val], i) => (
              <SlotRow key={label} label={label} value={val} isStarter={STARTERS.has(label)}
                onChange={(v) => update(i, v)}
              />
            ))}
          </div>
        </>
      )}

      {tab === "audit" && (
        <>
          <SectionHeader title="Audit" caption="CAN I AFFORD X+Y+Z?" />
          <AuditTool />
        </>
      )}

      {tab === "value" && (
        <>
          <SectionHeader title="Valeur" caption="WHAT DOES $X BUY?" />
          <ValueTool />
        </>
      )}
    </div>
  );
}

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
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
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
   🧮 AUDIT TOOL
========================= */
function AuditTool() {
  const [picks, setPicks] = useState<{ name: string; price: number }[]>([
    { name: "", price: 0 }, { name: "", price: 0 }, { name: "", price: 0 },
  ]);
  const sum = picks.reduce((s, p) => s + (Number(p.price) || 0), 0);
  const named = picks.filter(p => p.name.trim()).length;

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
        {picks.map((p, i) => (
          <PickRow key={i} index={i + 1} pick={p}
            onChange={(next) => setPicks(prev => prev.map((x, idx) => idx === i ? next : x))}
          />
        ))}
      </div>

      <div style={{
        padding: "16px 18px", border: `1px solid ${C.hair}`, borderRadius: 12, background: C.surface,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint, marginBottom: 8 }}>
          VERDICT
        </div>
        {named === 0 ? (
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.muted }}>
            add a name to begin
          </div>
        ) : (
          <div style={{ fontFamily: SERIF, fontSize: 18, color: C.ink, lineHeight: 1.4 }}>
            ${sum} <span style={{ fontStyle: "italic", color: C.muted, fontSize: 15 }}>across {named} pick{named > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PickRow({ index, pick, onChange }: any) {
  const [focus, setFocus] = useState<"name" | "price" | null>(null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: C.faint, width: 18 }}>
        {index === 1 ? "i" : index === 2 ? "ii" : "iii"}
      </span>
      <input className="bp-input" value={pick.name}
        onChange={(e) => onChange({ ...pick, name: e.target.value })}
        onFocus={() => setFocus("name")} onBlur={() => setFocus(null)}
        placeholder="player name"
        style={{
          flex: 1, background: "transparent", border: "none",
          borderBottom: `1px solid ${focus === "name" ? C.ink : C.hair}`,
          fontFamily: SERIF, fontSize: 18, color: C.ink, padding: "4px 0",
          transition: "border-color 0.2s ease",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.faint }}>$</span>
        <input className="bp-input" type="number" value={pick.price || ""}
          onChange={(e) => onChange({ ...pick, price: Math.max(0, Number(e.target.value) || 0) })}
          onFocus={() => setFocus("price")} onBlur={() => setFocus(null)}
          placeholder="0"
          style={{
            width: 48, textAlign: "right",
            fontFamily: MONO, fontSize: 15,
            background: "transparent", border: "none",
            borderBottom: `1px solid ${focus === "price" ? C.yellow : C.hair}`,
            color: C.ink, padding: "4px 0", transition: "border-color 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}

/* =========================
   💎 VALUE TOOL
========================= */
function ValueTool() {
  const [look, setLook] = useState({ amount: 28, pos: "ANY" });
  const positions = ["ANY", "QB", "RB", "WR", "TE"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18, marginTop: 4 }}>
        <span style={{ fontFamily: SERIF, fontSize: 32, color: C.muted }}>$</span>
        <input className="bp-input" type="number" value={look.amount}
          onChange={(e) => setLook({ ...look, amount: Math.max(0, Number(e.target.value) || 0) })}
          style={{
            width: 72, fontFamily: SERIF, fontSize: 32, color: C.ink,
            background: "transparent", border: "none",
            borderBottom: `1px solid ${C.ink}`, padding: "2px 4px",
          }}
        />
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.muted, marginLeft: 8 }}>at</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {positions.map(p => {
          const active = look.pos === p;
          return (
            <button key={p} onClick={() => setLook({ ...look, pos: p })} style={{
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
        padding: "16px 18px", border: `1px solid ${C.hair}`,
        borderRadius: 12, background: C.surface,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint, marginBottom: 8 }}>
          TIER — {look.pos}
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: C.ink, lineHeight: 1.4 }}>
          {tierForPrice(look.amount)}
        </div>
      </div>
    </div>
  );
}

/* =========================
   📌 FOOTER (sticky reste)
========================= */
function PanelFooter({ remaining, balanced }: { remaining: number; balanced: boolean }) {
  return (
    <div style={{
      borderTop: `1px solid ${C.hair}`, padding: "14px 24px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: C.surface,
    }}>
      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.muted }}>Reste</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: SERIF, fontSize: 26, color: balanced ? C.ink : C.yellow }}>${remaining}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: balanced ? C.green : C.yellow }}>
          {balanced ? "EN ÉQUILIBRE" : "OVER BUDGET"}
        </span>
      </div>
    </div>
  );
}

/* =========================
   🛠 HELPERS
========================= */
function suggest(bank: number): Row[] {
  const pct: Record<string, number> = { QB: 0.10, RB1: 0.15, RB2: 0.10, WR1: 0.15, WR2: 0.10, WR3: 0.07, TE: 0.06, FLEX: 0.14 };
  const out: Row[] = INITIAL.map(([label]) => pct[label] ? [label, Math.round(bank * pct[label])] as Row : [label, 1] as Row);
  const t = out.reduce((s, r) => s + r[1], 0);
  if (t > bank) out[7][1] -= (t - bank);
  return out;
}

function tierForPrice(amt: number): string {
  if (amt <= 1) return "Late-round dart throw — name to remember, not to chase.";
  if (amt <= 5) return "Bench depth · waiver-replaceable starter.";
  if (amt <= 12) return "Mid-tier flex piece. Stable floor, modest ceiling.";
  if (amt <= 25) return "Weekly starter · borderline top-12 at the position.";
  if (amt <= 40) return "Position cornerstone. Building block of the roster.";
  if (amt <= 60) return "Elite tier — room-shaping bid. Spend with conviction.";
  return "Anchor of anchors. Most rooms will let you have him — at this price.";
}
