import { useEffect, useState } from "react";
import heroImg from "/league-hero.jpeg?url";

interface Props {
  onDone: () => void;
}

// NFL team logos (ESPN CDN) — used as flashing pages
const NFL_TEAMS = [
  "kc", "sf", "phi", "dal", "ne", "gb", "buf", "mia",
  "pit", "bal", "cin", "cle", "den", "lv", "lac", "nyj",
  "nyg", "wsh", "chi", "det", "min", "atl", "car", "no",
  "tb", "ari", "lar", "sea",
];

const LOGO_URL = (t: string) => `https://a.espncdn.com/i/teamlogos/nfl/500/${t}.png`;

// Marvel-style page-flip timing
const PER_PAGE_MS = 90;          // each "page" flashes by
const FLIP_DURATION = NFL_TEAMS.length * PER_PAGE_MS; // ~2.5s of flipping
const HERO_AT = FLIP_DURATION;   // hero reveals after flips
const HERO_HOLD = 2400;
const TOTAL_MS = HERO_AT + HERO_HOLD;
const EXIT_MS = 700;

export default function Preloader({ onDone }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const safety = setTimeout(onDone, TOTAL_MS + EXIT_MS + 2000);
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, EXIT_MS);
    }, TOTAL_MS);
    return () => { clearTimeout(t); clearTimeout(safety); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black ${exiting ? "preloader-exit" : ""}`}
    >
      {/* Red ambient backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 45%, rgba(180,20,30,0.55) 0%, rgba(60,5,10,0.85) 55%, rgba(0,0,0,1) 100%)",
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.10] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      {/* Flipping page stack (Marvel-style) */}
      <div className="absolute inset-0 grid place-items-center" style={{ perspective: "1600px" }}>
        <div
          className="relative"
          style={{
            width: "min(78vw, 760px)",
            height: "min(70vh, 520px)",
            transformStyle: "preserve-3d",
          }}
        >
          {NFL_TEAMS.map((t, i) => (
            <div
              key={t}
              className="absolute inset-0 grid place-items-center"
              style={{
                transformOrigin: "left center",
                opacity: 0,
                animation: `pl-flip ${PER_PAGE_MS * 3}ms cubic-bezier(.6,.05,.4,1) ${i * PER_PAGE_MS}ms 1 forwards`,
                backfaceVisibility: "hidden",
                background:
                  "linear-gradient(135deg, rgba(40,5,8,0.92) 0%, rgba(10,0,2,0.96) 100%)",
                boxShadow:
                  "0 30px 80px rgba(0,0,0,0.7), inset 0 0 60px rgba(255,60,60,0.18)",
                borderRadius: 8,
                border: "1px solid rgba(220,60,60,0.25)",
              }}
            >
              <img
                src={LOGO_URL(t)}
                alt={t}
                crossOrigin="anonymous"
                draggable={false}
                className="select-none pointer-events-none"
                style={{
                  width: "60%",
                  height: "60%",
                  objectFit: "contain",
                  filter:
                    "drop-shadow(0 0 24px rgba(255,80,80,0.45)) brightness(1.05) contrast(1.05)",
                }}
              />
              {/* page edge highlight */}
              <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{
                  width: 6,
                  background:
                    "linear-gradient(90deg, rgba(255,200,200,0.5), rgba(255,200,200,0) 100%)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Light streak across the flip */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(110deg, transparent 35%, rgba(255,220,220,0.18) 50%, transparent 65%)",
          mixBlendMode: "screen",
          opacity: 0,
          animation: `pl-streak ${FLIP_DURATION}ms linear forwards`,
        }}
      />

      {/* White flash before hero reveal */}
      <div
        className="absolute inset-0 bg-white pointer-events-none"
        style={{
          opacity: 0,
          animation: `pl-whiteflash 420ms ease-out ${HERO_AT - 120}ms 1 forwards`,
        }}
      />

      {/* Final hero reveal (user-provided artwork) */}
      <div
        className="absolute inset-0 grid place-items-center pointer-events-none"
        style={{
          opacity: 0,
          animation: `pl-hero-in 900ms cubic-bezier(.2,.8,.2,1) ${HERO_AT}ms forwards`,
        }}
      >
        <img
          src={heroImg}
          alt="Bro, We're Senior Citizens — FF League"
          draggable={false}
          className="select-none"
          style={{
            maxWidth: "92vw",
            maxHeight: "88vh",
            objectFit: "contain",
            filter: "drop-shadow(0 30px 80px rgba(0,0,0,0.8))",
            animation: `pl-hero-zoom 3200ms ease-out ${HERO_AT}ms forwards`,
          }}
        />
      </div>

      {/* Vignette on hero */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.85) 100%)",
          opacity: 0,
          animation: `pl-fade-in 800ms ease-out ${HERO_AT + 100}ms forwards`,
        }}
      />

      {/* Skip */}
      <button
        onClick={() => { setExiting(true); setTimeout(onDone, EXIT_MS); }}
        className="absolute bottom-5 right-5 text-[11px] uppercase tracking-[0.35em] text-white/60 hover:text-white transition"
        style={{ letterSpacing: "0.3em" }}
      >
        Skip →
      </button>

      <style>{`
        @keyframes pl-flip {
          0%   { opacity: 0; transform: rotateY(-92deg) translateZ(0); }
          18%  { opacity: 1; }
          50%  { opacity: 1; transform: rotateY(0deg) translateZ(0); }
          82%  { opacity: 1; transform: rotateY(0deg) translateZ(0); }
          100% { opacity: 0; transform: rotateY(92deg) translateZ(0); }
        }
        @keyframes pl-streak {
          0%   { opacity: 0; transform: translateX(-30%); }
          15%  { opacity: 0.6; }
          100% { opacity: 0.6; transform: translateX(30%); }
        }
        @keyframes pl-whiteflash {
          0%   { opacity: 0; }
          35%  { opacity: 0.92; }
          100% { opacity: 0; }
        }
        @keyframes pl-hero-in {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes pl-hero-zoom {
          0%   { transform: scale(1.18); filter: drop-shadow(0 30px 80px rgba(0,0,0,0.8)) blur(6px); }
          25%  { filter: drop-shadow(0 30px 80px rgba(0,0,0,0.8)) blur(0); }
          100% { transform: scale(1); }
        }
        @keyframes pl-fade-in {
          0% { opacity: 0; } 100% { opacity: 1; }
        }
        .preloader-exit { animation: pl-exit 700ms ease-in forwards; }
        @keyframes pl-exit { 0% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>
    </div>
  );
}
