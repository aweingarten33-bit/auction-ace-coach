import { Link } from "react-router-dom";
import HeroWebGL from "@/components/HeroWebGL";
import NorrisText from "@/components/NorrisText";

// ── Kinetic word: chars slide up on mount ────────────────────────────────────
function KineticWord({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={`char-reveal ${className}`} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} style={{ animationDelay: `${delay + i * 0.04}s` }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

// ── Scrolling marquee strip ───────────────────────────────────────────────────
function MarqueeStrip() {
  const content = "AUCTION DRAFT · BUDGET MATH · LEAGUE HISTORY · TIER MAPPING · SMART BIDS · ";
  return (
    <div className="pointer-events-none overflow-hidden border-y border-white/10 py-2.5">
      <div className="marquee-track whitespace-nowrap text-[11px] font-semibold tracking-[0.25em] text-white/30">
        {content.repeat(4)}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="grain relative min-h-screen overflow-x-hidden bg-black text-white">

      {/* ── Full-screen background video ─────────────────────────────────── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"
        src="/videos/hero.mp4"
      />


      {/* ── Gradient overlay — fades image into black at bottom ──────────── */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-transparent to-black" />

      {/* ── Floating side badge ───────────────────────────────────────────── */}
      <div className="absolute left-4 top-1/2 z-20 -translate-y-1/2">
        <span
          className="block text-[9px] font-bold tracking-[0.4em] text-white/20"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          DRAFT ROOM
        </span>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-end px-6 pb-24 pt-24">

        {/* Headline — pushed to bottom so players are visible above */}
        <h1 className="mb-0 text-center font-bebas leading-none tracking-wider">
          <KineticWord
            text="AUCTION"
            className="block text-[clamp(3.5rem,18vw,9rem)] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.8)]"
            delay={0.3}
          />
          <KineticWord
            text="ACE"
            className="block text-[clamp(3.5rem,18vw,9rem)] text-red-500 drop-shadow-[0_2px_24px_rgba(220,38,38,0.5)]"
            delay={0.6}
          />
        </h1>

        {/* Tagline */}
        <p
          className="mb-10 mt-6 max-w-xs text-center text-sm leading-relaxed text-white/60"
          style={{ animation: "fade-in 0.6s 1.2s ease-out both" }}
        >
          Budget-path planning grounded in your league's 3-year price history.
          Know exactly what to spend and on who.
        </p>

        {/* CTA */}
        <div
          className="flex w-full max-w-xs flex-col gap-3"
          style={{ animation: "fade-in 0.6s 1.4s ease-out both" }}
        >
          <Link
            to="/team"
            className="block w-full border border-red-500 bg-red-600 py-3.5 text-center font-bebas text-lg tracking-widest text-white transition hover:bg-red-500"
          >
            <NorrisText>GET STARTED</NorrisText>
          </Link>
        </div>

        {/* Admin */}
        <Link
          to="/passcode"
          className="mt-8 text-[10px] font-mono tracking-widest text-white/20 transition hover:text-white/40"
          style={{ animation: "fade-in 0.6s 1.6s ease-out both" }}
        >
          <NorrisText>ADMIN</NorrisText>
        </Link>

        {/* Version */}
        <p
          className="mt-2 text-[10px] font-mono tracking-widest text-white/20"
          style={{ animation: "fade-in 0.6s 1.6s ease-out both" }}
        >
          AUCTION ACE — DRAFT SEASON 2025
        </p>
      </div>

      {/* ── Marquee strip ─────────────────────────────────────────────────── */}
      <div className="relative z-20 mt-auto">
        <MarqueeStrip />
      </div>
    </div>
  );
}
