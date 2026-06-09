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
    <div className="grain relative min-h-screen overflow-x-hidden bg-[#0a1f3d] text-white">

      {/* ── Background video ───────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-20" : "opacity-0"}`}
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

      {/* ── Gradient overlay (CBS navy) ───────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a1f3d]/80 via-[#0a1f3d]/60 to-[#050d1c]" />

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">

        {/* CBS-style stacked headline */}
        <h1 className="mb-0 text-center font-bebas leading-[0.95] tracking-wide">
          <KineticWord
            text="FANTASY FOOTBALL"
            className="block text-[clamp(1.8rem,8vw,4rem)] text-white"
            delay={0.15}
          />
          <span className="my-2 block">
            <span className="mx-auto block h-[3px] w-24 bg-red-600" />
          </span>
          <KineticWord
            text="AUCTION DRAFT"
            className="block text-[clamp(2.4rem,11vw,5.5rem)] text-white"
            delay={0.35}
          />
          <KineticWord
            text="ASSISTANT"
            className="block text-[clamp(2.4rem,11vw,5.5rem)] text-red-500"
            delay={0.55}
          />
        </h1>


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
          <Link
            to="/espn"
            className="block w-full border border-white/30 bg-white/5 py-3.5 text-center font-bebas text-lg tracking-widest text-white/80 transition hover:border-white/60 hover:text-white"
          >
            CONNECT ESPN
          </Link>
        </div>

        {/* Broadcast stamp */}
        <p
          className="mt-8 text-[10px] font-mono tracking-[0.3em] text-white/30"
          style={{ animation: "fade-in 0.6s 1.5s ease-out both" }}
        >
          A FANTASY BROADCAST · 2025
        </p>
      </div>

      {/* ── Marquee strip at bottom ───────────────────────────────────────── */}
      <div className="relative mt-auto">
        <MarqueeStrip />
      </div>
    </div>
  );
}
