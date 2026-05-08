import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section id="hero" aria-labelledby="hero-h" className="relative lamp-glow rain-overlay overflow-hidden">
      <div className="absolute inset-0 bg-halftone opacity-30 pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
          <div className="edition-meta">FILED · 03:47 — SOURCE · WIRE — CONFIDENCE 0.91</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="tape">EYES&nbsp;ONLY</span>
            <span className="label-stamped label-blood">LIVE</span>
            <span className="label-stamped">REC · 044-QB</span>
          </div>
          <h1 id="hero-h" className="headline-mega text-bone">
            LOREM IPSUM<br />
            DOLOR SIT<br />
            <span className="font-stencil-fill">AMET&nbsp;—</span>
          </h1>
          <p className="font-editorial italic text-paper text-lg lg:text-xl max-w-[55ch]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vitae ipsum nec urna fermentum dispatch — observa, pretium, ferire.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button size="lg">ENTER THE ROOM</Button>
            <Button size="lg" variant="secondary">READ THE FILE</Button>
          </div>
        </div>

        {/* Right — dossier card */}
        <aside className="col-span-12 lg:col-span-4">
          <div className="dossier reticle shadow-brut-xl">
            <div className="aspect-[4/5] bg-charcoal sepia-image flex items-end justify-center mb-3 border border-border">
              <div className="w-2/3 h-3/4 bg-gradient-to-t from-bone/15 to-transparent" aria-hidden />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="label-stamped">QB · TIER 1</span>
              <span className="ml-auto stamp stamp-buy" style={{transform:"rotate(-6deg)"}}>BUY</span>
            </div>
            <div className="intel-value mt-3">$67</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 font-mono text-[11px] tracking-[0.14em] text-paper">
              <div className="flex justify-between border-b border-border py-1"><span>VORP</span><span className="text-bone tabular-nums">+18.4</span></div>
              <div className="flex justify-between border-b border-border py-1"><span>OWN</span><span className="text-bone tabular-nums">62%</span></div>
              <div className="flex justify-between border-b border-border py-1"><span>BYE</span><span className="text-bone tabular-nums">09</span></div>
              <div className="flex justify-between border-b border-border py-1"><span>RISK</span><span className="text-warning tabular-nums">MED</span></div>
            </div>
            <div className="mt-3 font-mono text-[10px] tracking-[0.22em] text-paper">FILE&nbsp;NO.&nbsp;044-QB · 2026/W04</div>
          </div>
        </aside>
      </div>

      {/* Ticker */}
      <div className="ticker-rail">
        <div className="ticker-track">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["▲ +4", "QB-01 · $67", "▼ -2", "RB-04 · $42", "INFL · 1.07×", "TRAP · WR-12", "OUT · TE-03", "PICK · 00:14", "▲ +1", "FLEX · $11", "STEAL · WR-18", "PASS · QB-09"].map((t, i) => (
              <span key={`${k}-${i}`} aria-hidden>{t}<span className="px-3 text-paper">·</span></span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
