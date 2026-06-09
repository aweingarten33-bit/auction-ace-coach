import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ── Kinetic word: chars slide up on mount ────────────────────────────────────
function KineticWord({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={`char-reveal ${className}`} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} style={{ animationDelay: `${delay + i * 0.04}s` }}>
          {ch === " " ? "\u00A0" : ch}
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
    <div className="pointer-events-none overflow-hidden border-y border-white/10 bg-black/30 py-2.5 backdrop-blur-sm">
      <div className="marquee-track whitespace-nowrap text-[11px] font-semibold tracking-[0.25em] text-white/40">
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
    <div className="grain relative min-h-screen overflow-hidden bg-[#050d1c] text-white">
      {/* Local effect styles */}
      <style>{`
        @keyframes spotlight-sweep {
          0%, 100% { transform: translate(-10%, -10%) scale(1); opacity: 0.55; }
          50%      { transform: translate(10%, 5%) scale(1.15);  opacity: 0.8;  }
        }
        @keyframes light-streak {
          0%   { transform: translateX(-120%) skewX(-20deg); opacity: 0; }
          20%  { opacity: 0.6; }
          100% { transform: translateX(220%)  skewX(-20deg); opacity: 0; }
        }
        @keyframes field-scroll {
          0%   { background-position: 0 0; }
          100% { background-position: 0 80px; }
        }
        @keyframes title-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes cta-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55), 0 0 30px rgba(239,68,68,0.35); }
          50%      { box-shadow: 0 0 0 8px rgba(239,68,68,0),    0 0 55px rgba(239,68,68,0.7); }
        }
        @keyframes float-up {
          0%   { transform: translateY(110vh); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-10vh); opacity: 0; }
        }
        @keyframes scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .title-shimmer {
          background: linear-gradient(90deg, #fff 0%, #fff 35%, #ffd9d9 50%, #fff 65%, #fff 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: title-shimmer 4s linear infinite;
        }
        .red-shimmer {
          background: linear-gradient(90deg, #ef4444 0%, #ef4444 35%, #fca5a5 50%, #ef4444 65%, #ef4444 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: title-shimmer 4s linear infinite;
        }
      `}</style>

      {/* ── Background video ───────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-15" : "opacity-0"}`}
        autoPlay muted loop playsInline
        onCanPlay={() => setVideoLoaded(true)}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
        <source src="/videos/draft.mp4" type="video/mp4" />
      </video>

      {/* ── Animated field yard-lines ─────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 78px, rgba(255,255,255,0.6) 78px 80px)",
          animation: "field-scroll 8s linear infinite",
        }}
      />

      {/* ── Stadium spotlights ────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 60%)",
          animation: "spotlight-sweep 12s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -right-1/4 -bottom-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 60%)",
          animation: "spotlight-sweep 14s ease-in-out -3s infinite reverse",
        }}
      />

      {/* ── Diagonal light streak ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
          style={{ animation: "light-streak 7s ease-in-out infinite" }}
        />
      </div>

      {/* ── Floating particles ────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-1 w-1 rounded-full bg-white/40"
            style={{
              left: `${(i * 8.3) % 100}%`,
              animation: `float-up ${10 + (i % 5) * 2}s linear ${i * 0.7}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Gradient base overlay ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a1f3d]/70 via-transparent to-[#050d1c]" />

      {/* ── Corner brackets ───────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-red-500/60" />
      <div className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-red-500/60" />
      <div className="pointer-events-none absolute left-3 bottom-3 h-6 w-6 border-l-2 border-b-2 border-red-500/60" />
      <div className="pointer-events-none absolute right-3 bottom-3 h-6 w-6 border-r-2 border-b-2 border-red-500/60" />

      {/* ── Vertical side label ──────────────────────────────────────────── */}
      <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        <span
          className="block text-[9px] font-bold tracking-[0.5em] text-white/25"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          DRAFT • 2025 • SUPERFLEX
        </span>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">

        {/* Live chip */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 backdrop-blur-sm"
          style={{ animation: "fade-in 0.5s 0.1s ease-out both" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-[10px] font-bold tracking-[0.3em] text-red-100">DRAFT ROOM LIVE</span>
        </div>

        {/* CBS-style stacked headline */}
        <h1 className="mb-0 text-center font-bebas leading-[0.95] tracking-wide">
          <KineticWord
            text="FANTASY FOOTBALL"
            className="title-shimmer block text-[clamp(1.8rem,8vw,4rem)]"
            delay={0.15}
          />
          <span className="my-3 block">
            <span
              className="mx-auto block h-[3px] w-32 rounded-full bg-gradient-to-r from-transparent via-red-500 to-transparent"
              style={{ boxShadow: "0 0 18px rgba(239,68,68,0.8)" }}
            />
          </span>
          <KineticWord
            text="AUCTION DRAFT"
            className="title-shimmer block text-[clamp(2.4rem,11vw,5.5rem)]"
            delay={0.35}
          />
          <KineticWord
            text="ASSISTANT"
            className="red-shimmer block text-[clamp(2.4rem,11vw,5.5rem)]"
            delay={0.55}
          />
        </h1>

        {/* Mini stat row */}
        <div
          className="mt-6 flex items-center gap-4 text-[10px] font-bold tracking-[0.25em] text-white/50"
          style={{ animation: "fade-in 0.6s 1s ease-out both" }}
        >
          <span>3-YR HISTORY</span>
          <span className="h-1 w-1 rounded-full bg-red-500" />
          <span>SUPERFLEX</span>
          <span className="h-1 w-1 rounded-full bg-red-500" />
          <span>LIVE TIERS</span>
        </div>

        {/* CTA buttons */}
        <div
          className="mt-8 flex w-full max-w-xs flex-col gap-3"
          style={{ animation: "fade-in 0.6s 1.2s ease-out both" }}
        >
          <Link
            to="/team"
            className="group relative block w-full overflow-hidden border border-red-400 bg-gradient-to-b from-red-500 to-red-600 py-4 text-center font-bebas text-xl tracking-[0.3em] text-white transition hover:from-red-400 hover:to-red-500"
            style={{ animation: "cta-glow 2.4s ease-in-out infinite" }}
          >
            <span className="relative z-10">GET STARTED</span>
            <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/30 transition-transform duration-700 group-hover:translate-x-[500%]" />
          </Link>
          <Link
            to="/espn"
            className="group relative block w-full overflow-hidden border border-white/30 bg-white/5 py-4 text-center font-bebas text-xl tracking-[0.3em] text-white/85 backdrop-blur-sm transition hover:border-white/70 hover:bg-white/10 hover:text-white"
          >
            CONNECT ESPN
          </Link>
        </div>
      </div>

    </div>
  );
}
