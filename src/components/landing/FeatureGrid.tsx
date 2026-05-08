const PILLARS = [
  { r: "I",   t: "LIVE COACH",      o: "VERDICT · 200ms" },
  { r: "II",  t: "INFL · RADAR",    o: "Δ · PER · ROUND" },
  { r: "III", t: "TRAP DETECTOR",   o: "FLAG · NOMINATE" },
  { r: "IV",  t: "ROSTER WAR-MAP",  o: "SLOT · SCARCITY" },
];

export default function FeatureGrid() {
  return (
    <section id="s1" aria-labelledby="feat-h" className="relative bg-void">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-16 lg:py-20">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <div className="font-mono text-[10px] tracking-[0.32em] text-paper">THE · INTEL · STACK</div>
            <h2 id="feat-h" className="headline-xl text-bone mt-2">FOUR INSTRUMENTS.</h2>
          </div>
          <span className="hidden md:inline-block edition-meta">04 / 04 · ACTIVE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILLARS.map((p) => (
            <article key={p.r} className="dossier reticle group transition-[transform,box-shadow,border-color] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut-lg">
              <span className="file-stamp file-stamp-gold absolute -top-3 left-3">{p.r}</span>
              <div className="aspect-[5/3] bg-charcoal mt-4 mb-4 border border-border bg-halftone" aria-hidden />
              <h3 className="font-headline text-3xl text-bone">{p.t}</h3>
              <p className="font-editorial text-paper italic text-sm mt-2 leading-snug">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do.
              </p>
              <div className="rule-thin my-3" />
              <div className="font-mono text-[10px] tracking-[0.22em] text-bone/80">OUTPUT · {p.o}</div>
            </article>
          ))}
        </div>
      </div>
      <div className="rule-thick" aria-hidden />
    </section>
  );
}
