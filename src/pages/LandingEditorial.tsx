import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Editorial Stadium — Option B (contained video)
 * Cream zine base · oversized condensed display · refined serif accents ·
 * video lives as a contained square panel inside the editorial grid.
 */
export default function LandingEditorial() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ background: "#f1ebe0", color: "#171413" }}
    >
      {/* ── Top bar ────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 pt-6 md:px-12 md:pt-8">
        <div
          className="text-[11px] font-semibold tracking-[0.3em]"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          AUCTION&nbsp;ACE&nbsp;/&nbsp;Ξ&nbsp;25
        </div>
        <div
          className="hidden text-[11px] tracking-[0.3em] md:block"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          A&nbsp;FANTASY&nbsp;FOOTBALL&nbsp;RESEARCH&nbsp;ROOM
        </div>
        <Link
          to="/passcode"
          className="text-[11px] tracking-[0.3em] underline-offset-4 hover:underline"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          ADMIN
        </Link>
      </header>

      {/* ── Hairline ───────────────────────────────────────────── */}
      <div className="mx-6 mt-6 h-px md:mx-12" style={{ background: "#171413" }} />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="px-6 pt-10 md:px-12 md:pt-16">
        {/* Issue caption */}
        <div className="mb-8 flex items-baseline justify-between">
          <span
            className="text-[11px] tracking-[0.3em]"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            ISSUE&nbsp;Nº&nbsp;01&nbsp;—&nbsp;DRAFT&nbsp;SEASON
          </span>
          <span
            className="hidden text-[11px] tracking-[0.3em] md:inline"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            EST.&nbsp;MMXXV
          </span>
        </div>

        {/* Headline */}
        <h1
          className="font-bebas leading-[0.82] tracking-tight"
          style={{
            fontFamily: '"Bebas Neue", "Anton", sans-serif',
            fontSize: "clamp(4rem, 18vw, 14rem)",
          }}
        >
          WHERE THE
          <br />
          <span style={{ color: "#b8431f" }}>BIDDING</span>
          <br />
          GOES QUIET.
        </h1>

        {/* Below-hero grid: video + tagline */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-12 md:gap-12">
          {/* Contained square video */}
          <figure className="md:col-span-7">
            <div
              className="relative aspect-square w-full overflow-hidden"
              style={{ background: "#0a0908" }}
            >
              <video
                ref={videoRef}
                className={`h-full w-full object-cover transition-opacity duration-1000 ${
                  loaded ? "opacity-100" : "opacity-0"
                }`}
                autoPlay
                muted
                loop
                playsInline
                onCanPlay={() => setLoaded(true)}
              >
                <source src="/videos/hero.mp4" type="video/mp4" />
              </video>
              {/* subtle vignette */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)",
                }}
              />
              {/* corner caption */}
              <div
                className="absolute bottom-4 left-4 text-[10px] tracking-[0.3em] text-white/70"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                FILM&nbsp;001&nbsp;·&nbsp;THE&nbsp;ROOM
              </div>
            </div>
            <figcaption
              className="mt-3 text-[11px] tracking-[0.25em]"
              style={{ fontFamily: '"JetBrains Mono", monospace', color: "#5a534b" }}
            >
              ↳&nbsp;LOOPING&nbsp;FILM,&nbsp;NO&nbsp;SOUND
            </figcaption>
          </figure>

          {/* Tagline column */}
          <aside className="md:col-span-5 md:pt-6">
            <p
              className="text-[11px] tracking-[0.3em]"
              style={{ fontFamily: '"JetBrains Mono", monospace', color: "#5a534b" }}
            >
              ED.&nbsp;NOTE
            </p>
            <p
              className="mt-4 text-2xl leading-[1.15] md:text-3xl"
              style={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontStyle: "italic",
              }}
            >
              A research room for the league
              commissioner — three years of price
              history, every player, no noise.
            </p>
            <p
              className="mt-6 max-w-md text-base leading-relaxed"
              style={{ fontFamily: '"DM Sans", sans-serif', color: "#2a2520" }}
            >
              Built for the moments before the gavel. Tier maps,
              budget paths, opponent rosters — assembled quietly
              so the room can stay loud.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/team"
                className="group inline-flex items-center justify-between gap-6 px-7 py-4 text-[12px] tracking-[0.3em] transition"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  background: "#171413",
                  color: "#f1ebe0",
                }}
              >
                ENTER&nbsp;THE&nbsp;ROOM
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                to="/full-bleed"
                className="group inline-flex items-center justify-between gap-6 px-7 py-4 text-[12px] tracking-[0.3em] transition hover:bg-black/5"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  border: "1px solid #171413",
                  color: "#171413",
                }}
              >
                VIEW&nbsp;FULL&nbsp;BLEED
                <span aria-hidden>↗</span>
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Marquee divider ───────────────────────────────────── */}
      <div className="mt-24 overflow-hidden border-y py-4" style={{ borderColor: "#171413" }}>
        <div
          className="whitespace-nowrap text-[14px] tracking-[0.4em]"
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            animation: "marquee-scroll 40s linear infinite",
          }}
        >
          {"TIER MAPS  ·  BUDGET PATHS  ·  3-YEAR PRICE HISTORY  ·  OPPONENT ROSTERS  ·  SHARED RESEARCH  ·  ".repeat(
            6,
          )}
        </div>
      </div>

      {/* ── Editorial trio ────────────────────────────────────── */}
      <section className="px-6 py-20 md:px-12 md:py-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
          {[
            {
              n: "01",
              kicker: "TIERS",
              title: "Tiered, not ranked.",
              body: "Players grouped by replacement value — see the cliff before you fall off it.",
            },
            {
              n: "02",
              kicker: "HISTORY",
              title: "Three winters of receipts.",
              body: "Every nomination, every winning bid, every overpay — surfaced as you research.",
            },
            {
              n: "03",
              kicker: "ROOM",
              title: "Shared with the league.",
              body: "One link, twelve teams. Commissioner owns the connection, members see the board.",
            },
          ].map((card) => (
            <article key={card.n}>
              <div
                className="mb-6 flex items-baseline justify-between border-b pb-3"
                style={{ borderColor: "#171413" }}
              >
                <span
                  className="text-[11px] tracking-[0.3em]"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {card.kicker}
                </span>
                <span
                  className="font-bebas text-3xl"
                  style={{ fontFamily: '"Bebas Neue", sans-serif' }}
                >
                  {card.n}
                </span>
              </div>
              <h3
                className="text-3xl leading-tight md:text-4xl"
                style={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                }}
              >
                {card.title}
              </h3>
              <p
                className="mt-4 text-base leading-relaxed"
                style={{ fontFamily: '"DM Sans", sans-serif', color: "#2a2520" }}
              >
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Closing band ──────────────────────────────────────── */}
      <section
        className="relative px-6 py-20 md:px-12 md:py-28"
        style={{ background: "#0a0908", color: "#f1ebe0" }}
      >
        <div className="mx-auto max-w-5xl">
          <span
            className="text-[11px] tracking-[0.3em]"
            style={{ fontFamily: '"JetBrains Mono", monospace', color: "#c9a878" }}
          >
            COLOPHON
          </span>
          <h2
            className="mt-6 font-bebas leading-[0.9] tracking-tight"
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: "clamp(2.5rem, 9vw, 7rem)",
            }}
          >
            QUIET ROOM.
            <br />
            <span style={{ color: "#c9a878" }}>LOUD&nbsp;NIGHT.</span>
          </h2>
          <div className="mt-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <p
              className="max-w-md text-base leading-relaxed"
              style={{ fontFamily: '"DM Sans", sans-serif', color: "#cfc7b8" }}
            >
              Built for one league, sharpened over three drafts.
              No bidding bots. No nomination AI. Just the receipts.
            </p>
            <Link
              to="/team"
              className="inline-flex items-center gap-6 px-7 py-4 text-[12px] tracking-[0.3em]"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                background: "#c9a878",
                color: "#0a0908",
              }}
            >
              OPEN&nbsp;THE&nbsp;ROOM <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        className="flex flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row md:px-12"
        style={{ background: "#f1ebe0", color: "#5a534b" }}
      >
        <span
          className="text-[10px] tracking-[0.3em]"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          AUCTION&nbsp;ACE&nbsp;—&nbsp;DRAFT&nbsp;SEASON&nbsp;2025
        </span>
        <span
          className="text-[10px] tracking-[0.3em]"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          ISSUE&nbsp;01&nbsp;/&nbsp;PRINTED&nbsp;IN&nbsp;THE&nbsp;CLOUD
        </span>
      </footer>

      {/* Marquee keyframes */}
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
