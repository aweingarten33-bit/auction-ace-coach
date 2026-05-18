import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SpinningFootball from "@/components/SpinningFootball";

// ── Kinetic word: chars slide up on mount ────────────────────────────────────
function KineticWord({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={`char-reveal ${className}`} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          style={{ animationDelay: `${delay + i * 0.04}s` }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

// ── Scrolling marquee strip ───────────────────────────────────────────────────
function MarqueeStrip() {
  const content = "AUCTION DRAFT · BUDGET MATH · LEAGUE HISTORY · TIER MAPPING · SMART BIDS · ";
  const repeated = content.repeat(4);
  return (
    <div className="pointer-events-none overflow-hidden border-y border-white/10 py-2.5">
      <div className="marquee-track whitespace-nowrap text-[11px] font-semibold tracking-[0.25em] text-white/30">
        {repeated}
      </div>
    </div>
  );
}

export default function Landing() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);

  return (
    <div className="grain relative min-h-screen overflow-x-hidden bg-black text-white">

      {/* ── Background video ───────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-30" : "opacity-0"}`}
        autoPlay
        muted
        loop
        playsInline
        onCanPlay={() => setVideoLoaded(true)}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
        <source src="/videos/draft.mp4" type="video/mp4" />
        <source src="/videos/stadium.mp4" type="video/mp4" />
      </video>

      {/* ── Gradient overlay ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black" />

      {/* ── Floating location badge ───────────────────────────────────────── */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2">
        <span
          className="block text-[9px] font-bold tracking-[0.4em] text-white/20"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          DRAFT ROOM
        </span>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24">

        {/* Spinning football */}
        <div className="mb-6 opacity-90">
          <SpinningFootball size={180} speed={10} />
        </div>

        {/* Headline */}
        <h1 className="mb-0 text-center font-bebas leading-none tracking-wider">
          <KineticWord
            text="AUCTION"
            className="block text-[clamp(3.5rem,18vw,9rem)] text-white"
            delay={0.2}
          />
          <KineticWord
            text="ACE"
            className="block text-[clamp(3.5rem,18vw,9rem)] text-red-500"
            delay={0.5}
          />
        </h1>

        {/* Tagline */}
        <p
          className="mb-10 mt-6 max-w-xs text-center text-sm leading-relaxed text-white/50"
          style={{ animation: "fade-in 0.6s 1s ease-out both" }}
        >
          Budget-path planning grounded in your league's 3-year price history.
          Know exactly what to spend and on who.
        </p>

        {/* CTA buttons */}
        <div
          className="flex w-full max-w-xs flex-col gap-3"
          style={{ animation: "fade-in 0.6s 1.2s ease-out both" }}
        >
          <Link
            to="/team"
            className="block w-full border border-red-500 bg-red-600 py-3.5 text-center font-bebas text-lg tracking-widest text-white transition hover:bg-red-500"
          >
            GET STARTED
          </Link>

        </div>

        {/* Version stamp */}
        <p
          className="mt-10 text-[10px] font-mono tracking-widest text-white/20"
          style={{ animation: "fade-in 0.6s 1.5s ease-out both" }}
        >
          AUCTION ACE — DRAFT SEASON 2025
        </p>
      </div>

      {/* ── Marquee strip at bottom ───────────────────────────────────────── */}
      <div className="relative mt-auto">
        <MarqueeStrip />
      </div>
    </div>
  );
}
