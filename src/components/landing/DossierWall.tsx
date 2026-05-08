type V = "BUY" | "PASS" | "STEAL" | "RED";
const FILES: { code: string; pos: string; price: string; v: V; rot: number; redact?: boolean }[] = [
  { code: "044-QB", pos: "QB · T1", price: "$67", v: "BUY",   rot: -6 },
  { code: "108-RB", pos: "RB · T2", price: "$42", v: "PASS",  rot: -3 },
  { code: "212-WR", pos: "WR · T1", price: "$54", v: "BUY",   rot: -8 },
  { code: "319-TE", pos: "TE · T3", price: "$11", v: "STEAL", rot:  4 },
  { code: "402-WR", pos: "WR · T2", price: "$28", v: "PASS",  rot: -5 },
  { code: "███-██", pos: "▓▓ · ▓▓", price: "$??", v: "RED",   rot:  2, redact: true },
];

const stampClass = (v: V) =>
  v === "PASS" ? "stamp stamp-pass" : v === "BUY" ? "stamp stamp-buy" : v === "STEAL" ? "stamp stamp-target" : "stamp text-blood";

export default function DossierWall() {
  return (
    <section id="s4" aria-labelledby="wall-h" className="relative bg-ink">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-20 lg:py-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="font-mono text-[10px] tracking-[0.32em] text-paper">CLASSIFIED · SAMPLE · FILES</div>
            <h2 id="wall-h" className="headline-xl text-bone mt-2">THE WALL.</h2>
          </div>
          <span className="hidden md:inline edition-meta">06 / 06 · LEAKED</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-5">
          {FILES.map((f) => (
            <article key={f.code} className="dossier reticle">
              <div className="aspect-[4/5] bg-charcoal sepia-image border border-border mb-3 flex items-end justify-center">
                <div className="w-2/3 h-3/4 bg-gradient-to-t from-bone/15 to-transparent" aria-hidden />
              </div>
              <div className="flex items-center gap-2">
                <span className="label-stamped">{f.pos}</span>
                <span className={`ml-auto ${stampClass(f.v)} text-sm px-2 py-0.5`} style={{ transform: `rotate(${f.rot}deg)` }}>
                  {f.v === "RED" ? "VOID" : f.v}
                </span>
              </div>
              <div className="intel-value mt-3 text-5xl">{f.price}</div>
              <p className="font-editorial italic text-paper text-sm mt-2 leading-snug">
                {f.redact ? <span className="redacted">████ ███ ████ ██████</span> : "Lorem ipsum dolor sit amet, consectetur."}
              </p>
              <div className="mt-3 font-mono text-[10px] tracking-[0.22em] text-paper">FILE&nbsp;NO.&nbsp;{f.code}</div>
            </article>
          ))}
        </div>
      </div>
      <div className="rule-blood" aria-hidden />
    </section>
  );
}
