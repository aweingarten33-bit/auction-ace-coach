import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/**
 * Editorial Stadium — Option A (full-bleed video)
 */
export default function LandingFullBleed() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    v.addEventListener("loadeddata", tryPlay);
    return () => v.removeEventListener("loadeddata", tryPlay);
  }, []);

  return (
    <div className="min-h-screen w-full" style={{ background: "#f1ebe0", color: "#171413" }}>
      {/* ── Full-bleed hero ───────────────────────────────────── */}
      <section className="relative h-screen w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>

        {/* Cinematic gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.7) 100%)",
          }}
        />

        {/* Top bar overlay */}
        <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 pt-6 text-white md:px-12 md:pt-8">
          <div
            className="text-[11px] font-semibold tracking-[0.3em]"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            AUCTION&nbsp;ACE&nbsp;/&nbsp;Ξ&nbsp;25
          </div>
          <Link
            to="/"
            className="text-[11px] tracking-[0.3em] underline-offset-4 hover:underline"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            VIEW&nbsp;EDITORIAL
          </Link>
        </header>

        {/* Headline */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-16 text-white md:px-12 md:pb-24">
          <p
            className="mb-6 text-[11px] tracking-[0.3em] opacity-80"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            ISSUE&nbsp;Nº&nbsp;01&nbsp;—&nbsp;DRAFT&nbsp;SEASON&nbsp;2025
          </p>
          <h1
            className="font-bebas leading-[0.82] tracking-tight"
            style={{
              fontFamily: '"Bebas Neue", "Anton", sans-serif',
              fontSize: "clamp(4rem, 18vw, 14rem)",
            }}
          >
            WHERE THE
            <br />
            <span style={{ color: "#e6a368" }}>BIDDING</span>
            <br />
            GOES QUIET.
          </h1>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/team"
              className="group inline-flex items-center justify-between gap-6 px-7 py-4 text-[12px] tracking-[0.3em] transition"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                background: "#f1ebe0",
                color: "#171413",
              }}
            >
              ENTER&nbsp;THE&nbsp;ROOM
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              to="/"
              className="group inline-flex items-center justify-between gap-6 px-7 py-4 text-[12px] tracking-[0.3em] transition hover:bg-white/10"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                border: "1px solid rgba(255,255,255,0.6)",
                color: "#f1ebe0",
              }}
            >
              VIEW&nbsp;EDITORIAL
              <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>

        {/* Side rail */}
        <div className="absolute right-6 top-1/2 z-10 -translate-y-1/2 md:right-10">
          <span
            className="block text-[10px] tracking-[0.4em] text-white/60"
            style={{
              writingMode: "vertical-rl",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            FILM&nbsp;001&nbsp;·&nbsp;LOOP&nbsp;·&nbsp;MUTED
          </span>
        </div>
      </section>

      {/* ── Below the fold (cream rail) ──────────────────────── */}
      <section className="px-6 py-20 md:px-12 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <span
              className="text-[11px] tracking-[0.3em]"
              style={{ fontFamily: '"JetBrains Mono", monospace', color: "#5a534b" }}
            >
              ED.&nbsp;NOTE
            </span>
          </div>
          <div className="md:col-span-8">
            <p
              className="text-2xl leading-[1.2] md:text-4xl"
              style={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontStyle: "italic",
              }}
            >
              A research room for the league commissioner — three years
              of price history, every player, no noise.
            </p>
          </div>
        </div>
      </section>

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
        <Link
          to="/passcode"
          className="text-[10px] tracking-[0.3em] hover:underline"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          ADMIN
        </Link>
      </footer>
    </div>
  );
}
