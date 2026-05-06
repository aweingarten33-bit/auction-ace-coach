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

export default function BudgetPlannerV2({ bank = 225 }: { bank?: number }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"plan" | "audit" | "value">("plan");
  const [rows, setRows] = useState<Row[]>(INITIAL);
  const [picks, setPicks] = useState<string[]>(["", "", ""]);
  const [look, setLook] = useState<{ amount: number; pos: string }>({ amount: 28, pos: "ANY" });

  const total = rows.reduce((s, r) => s + (Number(r[1]) || 0), 0);
  const remaining = bank - total;
  const balanced = total <= bank;

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

      <Dock
        open={open} setOpen={setOpen}
        tab={tab} setTab={setTab}
        rows={rows} setRows={setRows}
        picks={picks} setPicks={setPicks}
        look={look} setLook={setLook}
        total={total} bank={bank} remaining={remaining} balanced={balanced}
      />

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

function Dock({
  open, setOpen, tab, setTab, rows, setRows, picks, setPicks, look, setLook,
  total, bank, remaining, balanced,
}: any) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 45,
              width: "min(440px, 100vw)", background: C.page, color: C.ink,
              borderLeft: `1px solid ${C.hair}`,
              display: "flex", flexDirection: "column",
              fontFamily: SANS,
            }}
          >
            <PanelHeader tab={tab} setTab={setTab} setOpen={setOpen} />

            <div className="bp-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 28px 28px" }}>
              {tab === "plan" && (
                <PlanView rows={rows} setRows={setRows} bank={bank} total={total} remaining={remaining} balanced={balanced} />
              )}
              {tab === "audit" && <AuditView picks={picks} setPicks={setPicks} />}
              {tab === "value" && <ValueView look={look} setLook={setLook} />}
            </div>

            <PanelFooter remaining={remaining} balanced={balanced} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function PanelHeader({ tab, setTab, setOpen }: any) {
  const tabs = [
    { id: "plan", label: "Plan" },
    { id: "audit", label: "Audit" },
    { id: "value", label: "Valeur" },
  ];
  return (
    <div style={{ padding: "28px 28px 0", borderBottom: `1px solid ${C.hairlite}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 32, fontStyle: "italic", lineHeight: 1, color: C.ink }}>
            le planner
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint, marginTop: 8 }}>
            BUDGET · AUCTION
          </div>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close" style={{
          width: 32, height: 32, borderRadius: "50%", background: "transparent",
          border: `1px solid ${C.hair}`, color: C.ink, cursor: "pointer",
          fontFamily: SERIF, fontSize: 18, display: "grid", placeItems: "center",
        }}>×</button>
      </div>

      <div style={{ marginTop: 24, display: "flex" }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "6px 0", marginRight: 24,
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
    </div>
  );
}

function PlanView({ rows, setRows, bank, total, remaining, balanced }: any) {
  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <MiniStat label="Bank" value={`$${bank}`} />
        <MiniStat label="Plan" value={`$${total}`} accent={balanced ? C.green : C.yellow} />
        <MiniStat label="Reste" value={`$${remaining}`} accent={balanced ? C.ink : C.yellow} />
      </div>

      <div style={{
        padding: "12px 14px", border: `1px solid ${C.hair}`, borderRadius: 10,
        marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center",
        background: C.surface,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: C.muted }}>STRATEGY</span>
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: C.yellow }}>balanced — default</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 22, color: C.ink }}>Allocations</div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: C.faint, marginTop: 4 }}>
            $ PER SLOT
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <Linkish onClick={() => setRows(suggest(bank))}>Suggest</Linkish>
          <Linkish onClick={() => setRows(INITIAL)}>Reset</Linkish>
        </div>
      </div>

      <div>
        {rows.map(([label, val]: Row, i: number) => (
          <Row key={label} label={label} value={val} isStarter={STARTERS.has(label)}
            onChange={(v: number) => setRows((prev: Row[]) => prev.map((r, idx) => idx === i ? [r[0], v] as Row : r))}
          />
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: C.faint }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: SERIF, fontSize: 28, color: accent || C.ink, marginTop: 4 }}>{value}</div>
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

function Row({ label, value, isStarter, onChange }: any) {
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

function AuditView({ picks, setPicks }: any) {
  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ fontFamily: SERIF, fontSize: 26, color: C.ink, marginBottom: 4 }}>Audit</div>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.muted, marginBottom: 6 }}>
        Can I afford X + Y + Z?
      </div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: C.faint, marginBottom: 24, lineHeight: 1.6 }}>
        Add up to three names with their projected price. We'll tell you what's left for the rest of the room.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {picks.map((p: string, i: number) => (
          <PickRow key={i} index={i + 1} value={p}
            onChange={(v: string) => setPicks((prev: string[]) => prev.map((x, idx) => idx === i ? v : x))}
          />
        ))}
      </div>

      <div style={{
        marginTop: 32, padding: "20px 18px",
        border: `1px solid ${C.hair}`, borderRadius: 12, background: C.surface,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint, marginBottom: 8 }}>
          VERDICT
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: C.muted }}>
          add a name to begin
        </div>
      </div>
    </div>
  );
}

function PickRow({ index, value, onChange }: any) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: C.faint, width: 18 }}>
        {index === 1 ? "i" : index === 2 ? "ii" : "iii"}
      </span>
      <input className="bp-input" value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholder="player name"
        style={{
          flex: 1, background: "transparent", border: "none",
          borderBottom: `1px solid ${focus ? C.ink : C.hair}`,
          fontFamily: SERIF, fontSize: 20, color: C.ink, padding: "4px 0",
          transition: "border-color 0.2s ease",
        }}
      />
    </div>
  );
}

function ValueView({ look, setLook }: any) {
  const positions = ["ANY", "QB", "RB", "WR", "TE"];
  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ fontFamily: SERIF, fontSize: 26, color: C.ink, marginBottom: 4 }}>Valeur</div>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.muted, marginBottom: 28 }}>
        What does ${look.amount} buy?
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 28 }}>
        <span style={{ fontFamily: SERIF, fontSize: 36, color: C.muted }}>$</span>
        <input className="bp-input" type="number" value={look.amount}
          onChange={(e) => setLook({ ...look, amount: Math.max(0, Number(e.target.value) || 0) })}
          style={{
            width: 80, fontFamily: SERIF, fontSize: 36, color: C.ink,
            background: "transparent", border: "none",
            borderBottom: `1px solid ${C.ink}`, padding: "2px 4px",
          }}
        />
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: C.muted, marginLeft: 8 }}>at</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
        {positions.map(p => {
          const active = look.pos === p;
          return (
            <button key={p} onClick={() => setLook({ ...look, pos: p })} style={{
              padding: "8px 16px",
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
        padding: "20px 18px", border: `1px solid ${C.hair}`,
        borderRadius: 12, background: C.surface,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint, marginBottom: 10 }}>
          TIER — {look.pos}
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: C.ink, lineHeight: 1.4 }}>
          {tierForPrice(look.amount)}
        </div>
      </div>
    </div>
  );
}

function PanelFooter({ remaining, balanced }: any) {
  return (
    <div style={{
      borderTop: `1px solid ${C.hair}`, padding: "18px 28px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: C.surface,
    }}>
      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.muted }}>Reste</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: SERIF, fontSize: 28, color: balanced ? C.ink : C.yellow }}>${remaining}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: balanced ? C.green : C.yellow }}>
          {balanced ? "EN ÉQUILIBRE" : "OVER BUDGET"}
        </span>
      </div>
    </div>
  );
}

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
