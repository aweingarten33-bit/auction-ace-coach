import { Button } from "@/components/ui/button";

type Plan = { name: string; price: string; cadence: string; feats: [string, boolean][]; cta: string; featured?: boolean };
const PLANS: Plan[] = [
  { name: "STREET", price: "$0", cadence: "FOREVER · NO · CARD", cta: "BEGIN", feats: [
    ["LIVE · TICKER", true],
    ["BASIC · DOSSIERS", true],
    ["INFL · RADAR", false],
    ["TRAP · FLAGS", false],
    ["WAR-MAP · EXPORT", false],
  ]},
  { name: "SYNDICATE", price: "$24", cadence: "PER · MONTH · BILLED · NIGHTLY", cta: "JOIN", featured: true, feats: [
    ["LIVE · TICKER", true],
    ["FULL · DOSSIERS", true],
    ["INFL · RADAR", true],
    ["TRAP · FLAGS", true],
    ["WAR-MAP · EXPORT", false],
  ]},
  { name: "KINGPIN", price: "$96", cadence: "PER · MONTH · CASH · ONLY", cta: "TAKE OVER", feats: [
    ["LIVE · TICKER", true],
    ["FULL · DOSSIERS", true],
    ["INFL · RADAR", true],
    ["TRAP · FLAGS", true],
    ["WAR-MAP · EXPORT", true],
  ]},
];

export default function Pricing() {
  // Mobile order: featured first
  const ordered = [...PLANS].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  return (
    <section id="s6" aria-labelledby="price-h" className="relative bg-ink">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-20 lg:py-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="font-mono text-[10px] tracking-[0.32em] text-paper">RATES · CASH · ONLY</div>
            <h2 id="price-h" className="headline-xl text-bone mt-2">THE LEDGER.</h2>
          </div>
          <span className="hidden md:inline edition-meta">03 · TIERS · OPEN</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {ordered.map((p) => (
            <article
              key={p.name}
              className={`dossier reticle relative ${p.featured ? "border-2 border-bone shadow-brut-xl lg:order-2" : "lg:order-1"}`}
              style={p.featured ? { borderTop: "4px solid hsl(var(--blood))" } : undefined}
            >
              {p.featured && (
                <span className="file-stamp file-stamp-blood absolute -top-4 right-4" style={{ transform: "rotate(4deg)" }}>
                  RECOMMENDED
                </span>
              )}
              <h3 className="font-headline text-4xl text-bone">{p.name}</h3>
              <div className="intel-value-gold text-6xl mt-2">{p.price}</div>
              <div className="font-mono text-[10px] tracking-[0.22em] text-paper mt-1">{p.cadence}</div>
              <div className="rule-thin my-4" />
              <ul className="space-y-2 font-mono text-[11px] tracking-[0.18em]">
                {p.feats.map(([t, on]) => (
                  <li key={t} className={on ? "text-bone" : "text-paper/50 line-through"}>
                    <span aria-hidden className="mr-2">{on ? "▣" : "▢"}</span>{t}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Button className="w-full" variant={p.featured ? "destructive" : p.name === "KINGPIN" ? "gold" : "secondary"}>
                  {p.cta}
                </Button>
              </div>
              <div className="mt-3 font-mono text-[10px] tracking-[0.22em] text-paper">NO · REFUNDS · CANCEL · ANYTIME</div>
            </article>
          ))}
        </div>
      </div>
      <div className="rule-thin" aria-hidden />
    </section>
  );
}
