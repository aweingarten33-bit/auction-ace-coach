import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Landing — Lando Norris–inspired.
 * Cream canvas, topographic texture, lime accent, serif+sans split wordmark.
 */
export default function LandingEditorial() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "#f3efe6", color: "#0e0e0e" }}
    >
      {/* ── Preloader ─────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-700"
        style={{
          background: "#d4ff00",
          opacity: loaded ? 0 : 1,
          pointerEvents: loaded ? "none" : "auto",
        }}
      >
        <Monogram className="h-12 w-12 text-black animate-pulse" />
        <span
          className="absolute bottom-8 text-[11px] font-bold tracking-[0.25em] text-black"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          LOAD ACE
        </span>
      </div>

      {/* ── Topographic background ───────────────────────────── */}
      <TopoBackground />

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5">
        <Link
          to="/team"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold tracking-[0.2em] text-black transition hover:opacity-90"
          style={{ background: "#d4ff00", fontFamily: '"JetBrains Mono", monospace' }}
        >
          <BagIcon className="h-3.5 w-3.5" />
          ENTER
        </Link>
        <Link
          to="/passcode"
          className="grid h-10 w-10 place-items-center rounded-xl border border-black/30 text-black transition hover:bg-black hover:text-[#d4ff00]"
          aria-label="Menu"
        >
          <span className="block h-px w-4 bg-current" />
        </Link>
      </header>

      {/* ── Wordmark block ───────────────────────────────────── */}
      <div className="relative z-10 mt-6 flex flex-col items-center px-5 text-center">
        <Monogram className="h-8 w-8 text-black" />
        <h1
          className="mt-3 leading-none"
          style={{ fontSize: "clamp(2.25rem, 11vw, 6rem)" }}
        >
          <span style={{ fontFamily: '"Playfair Display", "DM Serif Display", serif', fontWeight: 400, fontStyle: "italic" }}>
            Auction
          </span>
          <span
            className="font-black"
            style={{ fontFamily: '"Inter", "DM Sans", sans-serif', letterSpacing: "-0.02em" }}
          >
            ACE
          </span>
        </h1>
        <p
          className="mt-3 text-[11px] font-bold tracking-[0.25em] text-black"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          DRAFT&nbsp;ROOM&nbsp;SINCE&nbsp;2025
        </p>
      </div>

      {/* ── Bottom action pill ───────────────────────────────── */}
      <Link
        to="/draft-room"
        className="group fixed bottom-5 right-5 z-10 grid h-16 w-16 place-items-center rounded-full text-black shadow-lg transition hover:scale-105"
        style={{ background: "#d4ff00" }}
        aria-label="Enter draft room"
      >
        <HandIcon className="h-7 w-7 transition-transform group-hover:rotate-6" />
        <span
          className="pointer-events-none absolute -top-7 right-1 text-[9px] font-bold tracking-[0.25em] text-black/60"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          TAP&nbsp;TO&nbsp;DRAFT
        </span>
      </Link>

      {/* ── Footer marker ────────────────────────────────────── */}
      <div className="relative z-10 mt-auto px-5 pb-5 pt-24">
        <div
          className="flex items-center justify-between text-[10px] tracking-[0.3em] text-black/50"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          <span>AUCTION&nbsp;ACE</span>
          <span>EST.&nbsp;2025</span>
        </div>
      </div>
    </div>
  );
}

/* ── L7-style monogram ─────────────────────────────────────── */
function Monogram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M10 6 L10 46 L26 46 L26 38 L18 38 L18 6 Z M30 6 L52 6 L42 46 L34 46 L42 14 L30 14 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ── Icons ─────────────────────────────────────────────────── */
function BagIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 8h14l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function HandIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M11 2a1.5 1.5 0 0 0-1.5 1.5V11l-1.4-1.4a1.5 1.5 0 1 0-2.1 2.1l4.2 4.6a4 4 0 0 0 2.95 1.3H17a3 3 0 0 0 3-3v-4a1.5 1.5 0 0 0-3 0 1.5 1.5 0 0 0-3 0V3.5A1.5 1.5 0 0 0 12.5 2 1.5 1.5 0 0 0 11 3.5v-1Z" />
    </svg>
  );
}

/* ── Background topographic lines ──────────────────────────── */
function TopoBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g fill="none" stroke="#0e0e0e" strokeOpacity="0.08" strokeWidth="1">
        <path d="M-50 200 Q 80 140 200 220 T 460 200" />
        <path d="M-50 260 Q 80 200 200 280 T 460 260" />
        <path d="M-50 320 Q 80 260 200 340 T 460 320" />
        <path d="M-50 420 Q 100 360 220 440 T 460 420" />
        <path d="M-50 500 Q 120 440 240 520 T 460 500" />
        <path d="M-50 580 Q 120 520 240 600 T 460 580" />
        <path d="M-50 660 Q 140 600 260 680 T 460 660" />
        <ellipse cx="60" cy="380" rx="55" ry="35" />
        <ellipse cx="60" cy="380" rx="35" ry="22" />
        <ellipse cx="320" cy="360" rx="70" ry="48" />
        <ellipse cx="320" cy="360" rx="48" ry="32" />
        <ellipse cx="320" cy="360" rx="26" ry="18" />
        <ellipse cx="90" cy="640" rx="60" ry="40" />
        <ellipse cx="90" cy="640" rx="38" ry="24" />
      </g>
    </svg>
  );
}
