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

// NFL-style shield emblazoned with the league name
function LeagueShield() {
  return (
    <svg viewBox="0 0 360 440" className="h-full w-full">
      <defs>
        <linearGradient id="shieldNavy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2548" />
          <stop offset="100%" stopColor="#0a1230" />
        </linearGradient>
        <linearGradient id="shieldRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0223a" />
          <stop offset="100%" stopColor="#a8132a" />
        </linearGradient>
        <linearGradient id="shieldGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4d27a" />
          <stop offset="100%" stopColor="#c9943a" />
        </linearGradient>
        {/* Shield clip-path */}
        <clipPath id="shieldClip">
          <path d="M180 8 L344 56 L344 240 Q344 340 180 432 Q16 340 16 240 L16 56 Z" />
        </clipPath>
      </defs>

      {/* Outer gold trim */}
      <path
        d="M180 0 L352 50 L352 242 Q352 348 180 442 Q8 348 8 242 L8 50 Z"
        fill="url(#shieldGold)"
      />
      {/* Navy body */}
      <path
        d="M180 12 L340 58 L340 240 Q340 338 180 426 Q20 338 20 240 L20 58 Z"
        fill="url(#shieldNavy)"
      />

      {/* Red top band with stars */}
      <g clipPath="url(#shieldClip)">
        <rect x="0" y="40" width="360" height="62" fill="url(#shieldRed)" />
        {/* Hairline separators */}
        <rect x="0" y="38" width="360" height="2" fill="#f4d27a" />
        <rect x="0" y="102" width="360" height="2" fill="#f4d27a" />
        {/* Stars in the red band */}
        {[60, 110, 160, 210, 260, 310].map((cx) => (
          <Star key={cx} cx={cx} cy={71} size={9} fill="#ffffff" />
        ))}
      </g>

      {/* League name — main lockup */}
      <g textAnchor="middle" style={{ fontFamily: "'Playfair Display', 'Times New Roman', serif" }}>
        <text x="180" y="158" fill="#f4d27a" fontSize="22" fontWeight="700" letterSpacing="3">
          BRO WE&apos;RE
        </text>
        <text x="180" y="198" fill="#ffffff" fontSize="34" fontWeight="800" letterSpacing="2.5">
          SENIOR
        </text>
        <text x="180" y="234" fill="#ffffff" fontSize="34" fontWeight="800" letterSpacing="2.5">
          CITIZENS
        </text>
      </g>

      {/* Hairline divider */}
      <line x1="80" y1="252" x2="280" y2="252" stroke="#f4d27a" strokeWidth="1.2" />

      {/* Sub-lockup */}
      <g
        textAnchor="middle"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <text x="180" y="280" fill="#f4d27a" fontSize="13" fontWeight="700" letterSpacing="5">
          FANTASY FOOTBALL
        </text>
        <text x="180" y="304" fill="#ffffff" fontSize="11" letterSpacing="4" opacity="0.85">
          AUCTION LEAGUE
        </text>
      </g>

      {/* Bottom Roman numeral / season */}
      <g textAnchor="middle">
        <text
          x="180"
          y="348"
          fill="#f4d27a"
          fontSize="24"
          fontWeight="700"
          letterSpacing="6"
          style={{ fontFamily: "'Playfair Display', 'Times New Roman', serif" }}
        >
          MMXXVI
        </text>
        <text
          x="180"
          y="376"
          fill="#ffffff"
          fontSize="10"
          letterSpacing="6"
          opacity="0.75"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          2026 — 2027 SEASON
        </text>
      </g>

      {/* Inner hairline trim along shield */}
      <path
        d="M180 24 L328 64 L328 240 Q328 332 180 414 Q32 332 32 240 L32 64 Z"
        fill="none"
        stroke="#f4d27a"
        strokeWidth="0.8"
        opacity="0.55"
      />
    </svg>
  );
}

function Star({ cx, cy, size, fill }: { cx: number; cy: number; size: number; fill: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size / 2.4;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} />;
}

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

        {/* PHASE 2: Custom league shield big reveal */}
        <div
          className="absolute select-none pointer-events-none"
          style={{
            width: 360,
            height: 440,
            opacity: 0,
            transform: "scale(0.6)",
            filter: "drop-shadow(0 0 50px rgba(255,255,255,0.45))",
            animation: `pl-shield-in 900ms cubic-bezier(.2,.8,.2,1) ${SHIELD_AT}ms forwards, pl-shield-out 600ms ease-in ${SHIELD_AT + SHIELD_HOLD}ms forwards`,
          }}
        >
          <LeagueShield />
        </div>
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
