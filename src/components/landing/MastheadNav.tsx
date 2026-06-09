const LINKS = ["INTEL", "DOSSIERS", "WAR ROOM", "PRICING", "ARCHIVE"];

export default function MastheadNav() {
  return (
    <header className="sticky top-0 z-40 site-header">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-3 flex items-end gap-6">
        <a href="#hero" className="flex flex-col leading-none">
          <span className="font-display text-3xl lg:text-5xl text-bone tracking-tight">GRIDIRON / DOSSIER</span>
          <span className="edition-meta mt-1 hidden sm:block">VOL · IX — NO · 047 — NIGHT EDITION</span>
        </a>
        <nav aria-label="Primary" className="ml-auto hidden md:flex items-center">
          {LINKS.map((l, i) => (
            <a
              key={l}
              href={`#s${i}`}
              className="px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-bone/80 hover:text-bone border-l border-bone/25 first:border-l-0"
            >
              {l}
            </a>
          ))}
        </nav>
        <div className="ml-auto md:ml-0 flex items-center gap-2">
          <button className="hidden sm:inline-flex h-9 px-3 font-mono text-[10px] tracking-[0.18em] text-bone border border-bone/40 hover:bg-bone hover:text-void">SIGN&nbsp;IN</button>
          <button className="h-9 px-4 font-mono text-[10px] tracking-[0.18em] bg-blood text-bone border border-blood hover:bg-signal active:translate-x-[2px] active:translate-y-[2px]">ENTER</button>
        </div>
      </div>
    </header>
  );
}
