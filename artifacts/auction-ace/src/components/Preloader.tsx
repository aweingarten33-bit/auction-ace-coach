import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

// 32 NFL team ESPN abbreviations
const TEAMS = [
  "kc", "sf", "phi", "dal", "ne", "gb", "buf", "mia",
  "pit", "bal", "cin", "cle", "hou", "ind", "jax", "ten",
  "den", "lv", "lac", "nyj", "nyg", "wsh", "chi", "det",
  "min", "atl", "car", "no", "tb", "ari", "lar", "sea",
];

const LOGO_URL = (t: string) => `https://a.espncdn.com/i/teamlogos/nfl/500/${t}.png`;
const NFL_SHIELD = "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png";

// Phase timings (ms)
const FLIP_DURATION = 3000;   // total time for team-logo montage
const PER_LOGO = FLIP_DURATION / TEAMS.length; // ~94ms per logo
const SHIELD_AT = FLIP_DURATION;               // 3000
const SHIELD_HOLD = 1100;
const TITLE_AT = SHIELD_AT + 900;              // ~3900 — title begins to rise
const TOTAL_MS = SHIELD_AT + SHIELD_HOLD + 2400; // ~6500
const EXIT_MS = 820;

export default function Preloader({ onDone }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, EXIT_MS);
    }, TOTAL_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  // Title letters for stagger
  const TITLE_TOP = "BRO WE'RE";
  const TITLE_BOT = "SENIOR CITIZENS";

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black ${exiting ? "preloader-exit" : ""}`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Faint amber spotlight, intensifies for shield/title phase */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(209,138,69,0.18) 0%, rgba(0,0,0,0) 60%), radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.92) 100%)",
          opacity: 0,
          animation: `pl-spot-fade 2400ms ease-out ${SHIELD_AT - 600}ms forwards`,
        }}
      />

      {/* Grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      {/* PHASE 1: rapid team-logo flash montage */}
      <div className="absolute inset-0 grid place-items-center">
        {TEAMS.map((team, i) => (
          <img
            key={team}
            src={LOGO_URL(team)}
            alt=""
            draggable={false}
            crossOrigin="anonymous"
            className="absolute select-none pointer-events-none"
            style={{
              width: 320,
              height: 320,
              objectFit: "contain",
              opacity: 0,
              filter: "drop-shadow(0 0 24px rgba(255,255,255,0.35))",
              animation: `pl-flash ${PER_LOGO * 2.2}ms ease-out ${i * PER_LOGO}ms 1 forwards`,
            }}
          />
        ))}

        {/* PHASE 2: NFL shield big reveal */}
        <img
          src={NFL_SHIELD}
          alt=""
          draggable={false}
          crossOrigin="anonymous"
          className="absolute select-none pointer-events-none"
          style={{
            width: 360,
            height: 360,
            objectFit: "contain",
            opacity: 0,
            transform: "scale(0.6)",
            filter: "drop-shadow(0 0 50px rgba(255,255,255,0.45))",
            animation: `pl-shield-in 900ms cubic-bezier(.2,.8,.2,1) ${SHIELD_AT}ms forwards, pl-shield-out 600ms ease-in ${SHIELD_AT + SHIELD_HOLD}ms forwards`,
          }}
        />
      </div>

      {/* PHASE 3: TITLE REVEAL — "BRO WE'RE / SENIOR CITIZENS" */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center" style={{ marginTop: -8 }}>
          <div
            className="font-serif text-white"
            style={{
              fontFamily: "'Playfair Display', 'Times New Roman', serif",
              fontWeight: 600,
              letterSpacing: "0.04em",
              fontSize: "clamp(40px, 7vw, 84px)",
              lineHeight: 1.02,
              textShadow: "0 4px 30px rgba(0,0,0,0.6)",
            }}
          >
            <div>
              {TITLE_TOP.split("").map((ch, i) => (
                <span
                  key={`t${i}`}
                  className="inline-block"
                  style={{
                    opacity: 0,
                    transform: "translateY(28px)",
                    animation: `pl-letter 700ms cubic-bezier(.2,.8,.2,1) ${TITLE_AT + i * 35}ms forwards`,
                    whiteSpace: ch === " " ? "pre" : undefined,
                  }}
                >
                  {ch === " " ? "\u00A0" : ch}
                </span>
              ))}
            </div>
            <div
              className="italic"
              style={{
                color: "#d18a45",
                fontStyle: "italic",
              }}
            >
              {TITLE_BOT.split("").map((ch, i) => (
                <span
                  key={`b${i}`}
                  className="inline-block"
                  style={{
                    opacity: 0,
                    transform: "translateY(28px)",
                    animation: `pl-letter 700ms cubic-bezier(.2,.8,.2,1) ${TITLE_AT + 320 + i * 30}ms forwards`,
                    whiteSpace: ch === " " ? "pre" : undefined,
                  }}
                >
                  {ch === " " ? "\u00A0" : ch}
                </span>
              ))}
            </div>
          </div>

          {/* Subtitle */}
          <div
            className="mt-6 text-[11px] uppercase text-white/70"
            style={{
              letterSpacing: "0.55em",
              opacity: 0,
              animation: `pl-fade-in 900ms ease-out ${TITLE_AT + 1100}ms forwards`,
            }}
          >
            2026 — 2027 Fantasy Football Season
          </div>

          {/* Hairline divider */}
          <div
            className="mx-auto mt-6 h-px bg-[#d18a45]"
            style={{
              width: 0,
              animation: `pl-line 900ms ease-out ${TITLE_AT + 1300}ms forwards`,
            }}
          />

          {/* Final small caption */}
          <div
            className="mt-4 text-[10px] uppercase text-white/45"
            style={{
              letterSpacing: "0.5em",
              opacity: 0,
              animation: `pl-fade-in 700ms ease-out ${TITLE_AT + 1700}ms forwards`,
            }}
          >
            Presented by Auction Ace
          </div>
        </div>
      </div>

      {/* White flash between phase 1 → 2 */}
      <div
        className="absolute inset-0 bg-white pointer-events-none"
        style={{
          opacity: 0,
          animation: `pl-whiteflash 380ms ease-out ${SHIELD_AT - 80}ms 1 forwards`,
        }}
      />

      <style>{`
        @keyframes pl-flash {
          0%   { opacity: 0; transform: scale(0.9); }
          25%  { opacity: 1; transform: scale(1); }
          75%  { opacity: 1; transform: scale(1.02); }
          100% { opacity: 0; transform: scale(1.06); }
        }
        @keyframes pl-shield-in {
          0%   { opacity: 0; transform: scale(0.5) rotate(-6deg); filter: drop-shadow(0 0 80px rgba(255,255,255,0.8)) blur(8px); }
          60%  { opacity: 1; transform: scale(1.06) rotate(0deg); filter: drop-shadow(0 0 60px rgba(255,255,255,0.6)) blur(0); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 50px rgba(255,255,255,0.45)) blur(0); }
        }
        @keyframes pl-shield-out {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.6); }
        }
        @keyframes pl-letter {
          0%   { opacity: 0; transform: translateY(28px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pl-fade-in {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes pl-line {
          0%   { width: 0; }
          100% { width: 220px; }
        }
        @keyframes pl-whiteflash {
          0%   { opacity: 0; }
          30%  { opacity: 0.95; }
          100% { opacity: 0; }
        }
        @keyframes pl-spot-fade {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
