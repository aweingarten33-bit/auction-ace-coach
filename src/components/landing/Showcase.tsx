const ROWS = [
  { p: "QB-01", v: "$67", s: "BUY" },
  { p: "RB-04", v: "$42", s: "PASS" },
  { p: "WR-09", v: "$28", s: "STEAL" },
  { p: "TE-02", v: "$14", s: "BUY" },
];
const SIDE = [
  { t: "200MS VERDICT",    s: "LATENCY · MEDIAN" },
  { t: "INFL · TRACE",     s: "Δ · PER · NOMINATION" },
  { t: "TRAP FLAGS",       s: "OVERBID · BAIT · LURE" },
  { t: "BENCH · MATH",     s: "FLEX · SCARCITY · MAP" },
  { t: "AFTER-ACTION",     s: "FILE · ARCHIVED" },
];

export default function Showcase() {
  return (
    <section id="s2" aria-labelledby="show-h" className="relative bg-ink">
      <div className="absolute inset-0 rain-overlay opacity-60 pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8 py-20 lg:py-28">
        <h2 id="show-h" className="font-stencil text-5xl lg:text-7xl mb-10">THE WAR ROOM.</h2>
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          <div className="col-span-12 lg:col-span-7">
            <div className="dossier reticle shadow-brut-xl border-2 border-bone p-0">
              <div className="flex items-center justify-between border-b-2 border-bone px-4 py-2 bg-void">
                <span className="font-mono text-[10px] tracking-[0.28em] text-bone">LIVE · AUCTION · 03:47</span>
                <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-blood">
                  <span className="led" aria-hidden /> REC
                </span>
              </div>
              <ul className="divide-y divide-border">
                {ROWS.map((r) => (
                  <li key={r.p} className="flex items-center gap-3 px-4 py-3">
                    <span className="font-mono text-[11px] tracking-[0.2em] text-paper w-16">{r.p}</span>
                    <div className="flex-1 h-[3px] bg-border relative">
                      <div className="absolute inset-y-0 left-0 bg-bone" style={{ width: `${30 + (r.p.length * 11) % 60}%` }} />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-blood" />
                    </div>
                    <span className="font-mono text-base text-bone tabular-nums w-14 text-right">{r.v}</span>
                    <span className={`stamp ${r.s === "PASS" ? "stamp-pass" : r.s === "STEAL" ? "stamp-target" : "stamp-buy"} text-xs px-2 py-0.5`} style={{transform:"rotate(-4deg)"}}>{r.s}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t-2 border-bone px-4 py-3 flex items-center justify-between bg-void">
                <span className="font-mono text-[10px] tracking-[0.24em] text-paper">MAX · BID</span>
                <span className="intel-value-gold text-3xl">$42</span>
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
            {SIDE.map((s) => (
              <div key={s.t} className="col-rule-gold py-1">
                <div className="font-headline text-2xl text-bone">{s.t}</div>
                <div className="font-mono text-[10px] tracking-[0.22em] text-paper">{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="torn-bottom h-3 bg-ink" aria-hidden />
    </section>
  );
}
