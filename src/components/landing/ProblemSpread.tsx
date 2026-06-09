const ITEMS = [
  { n: "01", t: "OVERPAY SPIRALS", c: "LOREM · IPSUM · DOLOR · SIT" },
  { n: "02", t: "SCARCITY BLINDNESS", c: "CONSECTETUR · ADIPISCING" },
  { n: "03", t: "TIER COLLAPSE", c: "SED · DO · EIUSMOD · TEMPOR" },
];

export default function ProblemSpread() {
  return (
    <section id="s0" aria-labelledby="prob-h" className="relative bg-ink">
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8 py-20 lg:py-28 grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-7">
          <div className="edition-meta mb-4">SECTION · A — INVESTIGATION</div>
          <h2 id="prob-h" className="headline-xl text-bone mb-6">THE BLEED.</h2>
          <p className="font-editorial drop-cap text-bone/90 max-w-[60ch] leading-[1.55]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent dignissim malesuada eros, vitae fermentum lectus interdum eu. Nulla facilisi. Curabitur volutpat, lectus a tincidunt convallis, sapien orci dictum nibh, vitae pretium magna nibh quis libero. Donec at risus dapibus, hendrerit nibh nec, posuere lectus. Integer pharetra, lorem id pulvinar finibus, augue nibh feugiat tellus.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 lg:border-l lg:border-bone/25 lg:pl-8">
          {ITEMS.map((i) => (
            <div key={i.n} className="dossier">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-5xl text-blood leading-none">{i.n}</span>
                <div className="flex-1">
                  <h3 className="font-headline text-2xl text-bone">{i.t}</h3>
                  <div className="rule-blood w-12 mt-1" />
                  <p className="font-mono text-[11px] tracking-[0.18em] text-paper mt-2">{i.c}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rule-blood" aria-hidden />
    </section>
  );
}
