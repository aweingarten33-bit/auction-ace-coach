import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FAQ = [
  ["LOREM IPSUM DOLOR SIT?", "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."],
  ["CONSECTETUR ADIPISCING?", "Praesent dignissim malesuada eros, vitae fermentum lectus interdum eu. Nulla facilisi."],
  ["SED DO EIUSMOD TEMPOR?", "Curabitur volutpat, lectus a tincidunt convallis, sapien orci dictum nibh, vitae pretium magna."],
  ["UT LABORE ET DOLORE?", "Donec at risus dapibus, hendrerit nibh nec, posuere lectus. Integer pharetra lorem."],
  ["MAGNA ALIQUA UT ENIM?", "Integer pharetra, lorem id pulvinar finibus, augue nibh feugiat tellus, vitae pretium magna."],
];

function Disclosure({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-bone/25">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-4 text-left hover:bg-charcoal/40"
      >
        <span className="font-headline text-xl lg:text-2xl text-bone">{q}</span>
        <span className="font-mono text-bone/80 shrink-0" aria-hidden>{open ? "—" : "+"}</span>
      </button>
      {open && <p className="font-editorial text-paper pb-5 pr-8 max-w-[60ch] leading-relaxed">{a}</p>}
    </div>
  );
}

export default function FaqFooter() {
  return (
    <>
      <section id="s7" aria-labelledby="faq-h" className="relative bg-void">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-20 lg:py-24 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7">
            <div className="font-mono text-[10px] tracking-[0.32em] text-paper mb-2">REFERENCE · DESK</div>
            <h2 id="faq-h" className="headline-xl text-bone mb-6">QUERIES.</h2>
            <div>
              {FAQ.map(([q, a]) => <Disclosure key={q} q={q} a={a} />)}
            </div>
          </div>
          <aside className="col-span-12 lg:col-span-5">
            <div className="dossier reticle">
              <div className="font-mono text-[10px] tracking-[0.28em] text-blood mb-2">SLIP · NO · 047</div>
              <h3 className="font-headline text-3xl text-bone">JOIN THE NIGHT EDITION.</h3>
              <p className="font-mono text-[10px] tracking-[0.22em] text-paper mt-2">FILED · 03:47 — EVERY · NIGHT</p>
              <div className="rule-thin my-4" />
              <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                <Input placeholder="EMAIL · ADDRESS" aria-label="Email address" />
                <Button type="submit">SUBSCRIBE</Button>
              </form>
              <p className="mt-3 font-mono text-[9px] tracking-[0.22em] text-paper">
                BY · SIGNING · YOU · ACCEPT · TERMS · & · WIRE
              </p>
            </div>
          </aside>
        </div>
        <div className="rule-thick" aria-hidden />
      </section>

      <footer aria-label="Colophon" className="relative bg-ink">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-12 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3 font-mono text-[11px] tracking-[0.18em] text-paper space-y-2">
            <div className="text-bone">PRODUCT</div>
            <div>INTEL</div><div>DOSSIERS</div><div>WAR ROOM</div><div>PRICING</div>
          </div>
          <div className="col-span-12 md:col-span-3 font-mono text-[11px] tracking-[0.18em] text-paper space-y-2">
            <div className="text-bone">DESK</div>
            <div>ARCHIVE</div><div>METHODOLOGY</div><div>SOURCES</div><div>CHANGELOG</div>
          </div>
          <div className="col-span-12 md:col-span-3 font-mono text-[11px] tracking-[0.18em] text-paper space-y-2">
            <div className="text-bone">LEGAL</div>
            <div>TERMS</div><div>PRIVACY</div><div>DMCA</div><div>CONTACT</div>
          </div>
          <div className="col-span-12 md:col-span-3 text-right">
            <div className="font-display text-3xl text-bone leading-none">GRIDIRON / DOSSIER</div>
            <div className="edition-meta mt-3 inline-block">EST · 2026 · PRINTED · IN · THE · DARK</div>
          </div>
        </div>
        <div className="rule-thin" aria-hidden />
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-4 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] text-paper">
          <span>© 2026 · ALL · RIGHTS · <span className="redacted">████████</span></span>
          <span className="hidden sm:inline">FILE · 047 / 366</span>
        </div>
      </footer>
    </>
  );
}
