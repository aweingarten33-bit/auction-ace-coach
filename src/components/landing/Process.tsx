const STEPS = [
  { r: "I",   v: "CONNECT" },
  { r: "II",  v: "CALIBRATE" },
  { r: "III", v: "STRIKE" },
];

export default function Process() {
  return (
    <section id="s3" aria-labelledby="proc-h" className="relative bg-void">
      <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8 py-14 lg:py-16">
        <div className="font-mono text-[10px] tracking-[0.32em] text-paper mb-2">PROTOCOL · 03</div>
        <h2 id="proc-h" className="sr-only">Process</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x md:divide-bone/25">
          {STEPS.map((s, i) => (
            <div key={s.r} className="px-2 md:px-8 py-6 relative">
              <span className="headline-mega text-shadow-mega text-bone block leading-[0.78]">{s.r}</span>
              <div className="font-headline text-3xl text-bone mt-3">{s.v}</div>
              <p className="font-editorial italic text-paper mt-2 max-w-[34ch] leading-snug">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do.
              </p>
              {i < STEPS.length - 1 && (
                <span aria-hidden className="hidden md:block absolute top-10 -right-3 font-mono text-bone/60 text-xl tracking-widest">→ →</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="rule-thin" aria-hidden />
    </section>
  );
}
