export default function Manifesto() {
  return (
    <section id="s5" aria-labelledby="man-h" className="relative bg-void overflow-hidden">
      <div className="absolute inset-0 rain-overlay" aria-hidden />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ background: "radial-gradient(ellipse 50% 40% at 12% 95%, hsl(var(--blood) / 0.35), transparent 65%)" }}
      />
      <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8 py-24 lg:py-32">
        <div className="edition-meta mb-6 max-w-fit">MANIFESTO · 01</div>
        <h2 id="man-h" className="font-stencil-fill text-5xl sm:text-7xl lg:text-[8rem] leading-[0.86] max-w-[18ch]">
          LOREM IPSUM<br />
          DOLOR · SIT —<br />
          <span className="text-blood">AMET FERIRE.</span>
        </h2>
        <div className="font-mono text-[10px] tracking-[0.32em] text-paper mt-8">— BACKALLEY · PRESS · NIGHT · EDITION</div>
        <span className="tape mt-10 inline-block">FILE · 01 / 09</span>
      </div>
      <div className="rule-thick" aria-hidden />
    </section>
  );
}
