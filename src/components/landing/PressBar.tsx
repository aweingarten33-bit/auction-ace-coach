const LOGOS = [
  { t: "BACKALLEY", f: "font-display" },
  { t: "Gridiron Times", f: "font-editorial italic" },
  { t: "DRAFT/NIGHT", f: "font-condensed" },
  { t: "the Owner's Ledger", f: "font-editorial" },
  { t: "STADIUM·UG", f: "font-mono tracking-[0.2em]" },
];

export default function PressBar() {
  return (
    <section aria-label="Press" className="relative bg-void">
      <div className="absolute inset-0 bg-halftone opacity-25" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8 py-8 grid grid-cols-12 gap-6 items-center">
        <div className="col-span-12 lg:col-span-7 flex flex-wrap items-center gap-x-6 gap-y-3">
          <span className="font-mono text-[10px] tracking-[0.32em] text-paper">AS · WHISPERED · IN</span>
          {LOGOS.map((l, i) => (
            <span key={l.t} className={`${l.f} text-bone text-lg lg:text-xl ${i ? "border-l border-bone/25 pl-6" : ""}`}>
              {l.t.toUpperCase ? l.t : l.t}
            </span>
          ))}
        </div>
        <p className="col-span-12 lg:col-span-5 pull-quote text-bone/90">
          "Lorem ipsum dolor sit amet — consectetur adipiscing elit, sed do eiusmod."
        </p>
      </div>
      <div className="torn-bottom h-3 bg-void" aria-hidden />
    </section>
  );
}
