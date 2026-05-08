import { useEffect, useState } from "react";
import { Menu, ArrowDown, Play } from "lucide-react";
import heroImg from "@/assets/video-hero.jpg";

/**
 * Inspired-by-Light+Shade cinematic studio / video page.
 * Full-bleed grainy hero, corner metadata, condensed wordmark,
 * scroll cue, then a tile grid + video showcase.
 */

const tiles = [
  { kicker: "The", title: "Studio" },
  { kicker: "Our", title: "Crew" },
  { kicker: "The", title: "Work" },
  { kicker: "Our", title: "Services" },
  { kicker: "Our", title: "Contact" },
];

const reels = [
  { title: "Cape & Cowl — Spec Spot", client: "Nightline Apparel", year: "2026" },
  { title: "Midnight Run", client: "Atlas Motors", year: "2025" },
  { title: "Ink & Gold", client: "Frank Press", year: "2025" },
  { title: "Skyline Hymn", client: "Verge Records", year: "2024" },
];

function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000 * 30);
    return () => clearInterval(i);
  }, []);
  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function Studio() {
  const time = useClock();

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[hsl(225_50%_5%)] text-[hsl(40_55%_92%)]">
      {/* HERO */}
      <section className="relative h-[100svh] w-full overflow-hidden">
        <img
          src={heroImg}
          alt="Golden hour through tangled branches — cinematic still"
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        {/* film vignette + grain */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(225_60%_4%/0.85)_100%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
        {/* film border */}
        <div className="pointer-events-none absolute inset-3 border border-[hsl(40_55%_86%/0.15)] sm:inset-6" />

        {/* corner: logo */}
        <div className="absolute left-4 top-4 z-10 sm:left-8 sm:top-8">
          <span className="font-mono text-base font-bold tracking-widest text-[hsl(40_55%_92%)]">
            L+S
          </span>
        </div>
        {/* corner: menu */}
        <button
          aria-label="Open menu"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center text-[hsl(40_55%_92%)] sm:right-8 sm:top-8"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* top metadata */}
        <div className="absolute inset-x-0 top-16 z-10 grid grid-cols-3 px-4 font-mono text-[10px] uppercase tracking-wider text-[hsl(40_55%_88%)] sm:top-10 sm:px-12 sm:text-xs">
          <div>Brisbane /<br />Meanjin</div>
          <div className="text-center">{time} AEST</div>
          <div className="text-right">Adelaide /<br />Tarntanya</div>
        </div>

        {/* center wordmark */}
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
          <h1 className="font-display text-center font-black leading-[0.85] tracking-tight text-[hsl(40_55%_92%)] drop-shadow-[0_4px_24px_hsl(225_60%_4%/0.7)]">
            <span className="block text-[clamp(3.5rem,16vw,12rem)]">LIGHT</span>
            <span className="block text-[clamp(3.5rem,16vw,12rem)]">+ SHADE</span>
          </h1>
        </div>

        {/* bottom metadata */}
        <div className="absolute inset-x-0 bottom-6 z-10 grid grid-cols-3 px-4 font-mono text-[10px] uppercase tracking-wider text-[hsl(40_55%_88%)] sm:bottom-10 sm:px-12 sm:text-xs">
          <div>
            Elevating brands<br />
            Pushing boundaries
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <ArrowDown className="h-3 w-3" />
            <span>Scroll</span>
          </div>
          <div className="text-right">
            Artist-led<br />
            Craft-obsessed
          </div>
        </div>
      </section>

      {/* TILE GRID */}
      <section className="relative px-4 py-16 sm:px-12 sm:py-24">
        <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(40_55%_70%)] sm:text-xs">
          What we do — 01
        </p>
        <h2 className="mb-12 max-w-4xl font-display text-3xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Artist-Led. Craft-Obsessed. Story-Driven.
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
          {tiles.map((t) => (
            <a
              key={t.title}
              href="#"
              className="group relative aspect-[3/4] overflow-hidden bg-[hsl(225_40%_10%)] transition"
            >
              <img
                src={heroImg}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-105 group-hover:opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(225_60%_4%/0.95)] via-[hsl(225_60%_4%/0.4)] to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-5">
                <span className="font-display text-xs italic text-[hsl(40_55%_80%)] sm:text-sm">
                  {t.kicker}
                </span>
                <span className="font-display text-2xl font-black leading-none tracking-tight text-[hsl(40_55%_92%)] sm:text-4xl">
                  {t.title}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* VIDEO SHOWCASE */}
      <section className="relative border-t border-[hsl(40_55%_86%/0.1)] px-4 py-16 sm:px-12 sm:py-24">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(40_55%_70%)] sm:text-xs">
              The Reel — 02
            </p>
            <h2 className="font-display text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Selected Work
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {reels.map((r, i) => (
            <article key={r.title} className="group cursor-pointer">
              <div className="relative aspect-video overflow-hidden bg-[hsl(225_40%_10%)]">
                <img
                  src={heroImg}
                  alt={r.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(225_60%_4%/0.5)] to-[hsl(354_72%_20%/0.4)]" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full border border-[hsl(40_55%_86%/0.6)] bg-[hsl(225_60%_4%/0.4)] backdrop-blur-sm transition group-hover:scale-110 group-hover:border-[hsl(38_92%_55%)]">
                    <Play className="h-6 w-6 fill-[hsl(40_55%_92%)] text-[hsl(40_55%_92%)]" />
                  </div>
                </div>
                <div className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-widest text-[hsl(40_55%_88%)]">
                  {String(i + 1).padStart(2, "0")} / {String(reels.length).padStart(2, "0")}
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h3 className="font-display text-lg font-bold tracking-tight sm:text-xl">
                  {r.title}
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[hsl(40_55%_70%)]">
                  {r.year}
                </span>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-[hsl(40_55%_70%)]">
                {r.client}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="relative border-t border-[hsl(40_55%_86%/0.1)] px-4 py-20 sm:px-12 sm:py-32">
        <p className="mx-auto max-w-4xl font-display text-2xl leading-snug tracking-tight sm:text-4xl lg:text-5xl">
          We are unapologetically artist-led and craft-obsessed. Creativity isn't just what we do —
          <span className="text-[hsl(38_92%_55%)]"> it's who we are.</span>
        </p>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[hsl(40_55%_86%/0.1)] px-4 py-8 font-mono text-[10px] uppercase tracking-widest text-[hsl(40_55%_70%)] sm:px-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <span>© 2026 — Studio</span>
          <span>Brisbane · Adelaide</span>
        </div>
      </footer>
    </main>
  );
}
