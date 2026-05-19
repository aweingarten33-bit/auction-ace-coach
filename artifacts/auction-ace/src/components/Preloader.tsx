import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

const TOTAL_MS = 5000;
const EXIT_MS = 820;

export default function Preloader({ onDone }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const dismiss = () => {
      setExiting(true);
      setTimeout(onDone, EXIT_MS);
    };
    const t = setTimeout(dismiss, TOTAL_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  // Single SVG stage — everything geometrically perfect around (cx, cy)
  const S = 560;
  const cx = S / 2;
  const cy = S / 2;
  const rOuter = 252;
  const rInner = 232;
  const rText = 196;

  // Ticks: 60 around the rim, longer every 5
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 - 90) * (Math.PI / 180);
    const major = i % 5 === 0;
    const outer = rOuter;
    const inner = rOuter - (major ? 12 : 5);
    return (
      <line
        key={i}
        x1={cx + Math.cos(a) * outer}
        y1={cy + Math.sin(a) * outer}
        x2={cx + Math.cos(a) * inner}
        y2={cy + Math.sin(a) * inner}
        stroke={major ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)"}
        strokeWidth={major ? 1 : 0.6}
      />
    );
  });

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black ${exiting ? "preloader-exit" : ""}`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Amber spotlight + vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(45% 45% at 50% 50%, rgba(209,138,69,0.18) 0%, rgba(0,0,0,0) 60%), radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.9) 100%)",
        }}
      />
      {/* Grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      {/* The dial — one centered stage, everything inside is geometrically aligned */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative" style={{ width: S, height: S }}>
          <svg
            width={S}
            height={S}
            viewBox={`0 0 ${S} ${S}`}
            className="absolute inset-0"
          >
            <defs>
              {/* Top arc: starts at left, sweeps over the top to right (text reads upright) */}
              <path
                id="pl-top"
                d={`M ${cx - rText},${cy} A ${rText},${rText} 0 0,1 ${cx + rText},${cy}`}
                fill="none"
              />
              {/* Bottom arc: starts at left, sweeps under to right (text reads upright) */}
              <path
                id="pl-bot"
                d={`M ${cx - rText},${cy} A ${rText},${rText} 0 1,0 ${cx + rText},${cy}`}
                fill="none"
              />
              <radialGradient id="pl-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(209,138,69,0.55)" />
                <stop offset="60%" stopColor="rgba(209,138,69,0.10)" />
                <stop offset="100%" stopColor="rgba(209,138,69,0)" />
              </radialGradient>
            </defs>

            {/* Soft glow behind football */}
            <circle cx={cx} cy={cy} r={120} fill="url(#pl-glow)" />

            {/* Concentric hairlines */}
            <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
            <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />

            {/* Tick marks */}
            <g>{ticks}</g>

            {/* Arc text — upright, perfectly centered on arcs */}
            <text fontSize="11.5" letterSpacing="6" fill="#ffffff" style={{ textTransform: "uppercase" }}>
              <textPath href="#pl-top" startOffset="50%" textAnchor="middle">
                Bro We're Senior Citizens
              </textPath>
            </text>
            <text fontSize="11.5" letterSpacing="6" fill="#ffffff" style={{ textTransform: "uppercase" }}>
              <textPath href="#pl-bot" startOffset="50%" textAnchor="middle">
                2026 — 2027 Fantasy Football Season
              </textPath>
            </text>

            {/* Amber index dot orbiting the outer ring */}
            <g style={{ animation: "football-orbit 8s linear infinite", transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy - rOuter} r="2.6" fill="#d18a45" />
            </g>

            {/* Cardinal tiny marks (N/E/S/W) as Roman numerals around the dial */}
            <g fill="rgba(255,255,255,0.4)" fontSize="9" letterSpacing="3" style={{ textTransform: "uppercase" }}>
              <text x={cx} y={cy - rOuter - 14} textAnchor="middle">XII</text>
              <text x={cx + rOuter + 18} y={cy + 3} textAnchor="middle">III</text>
              <text x={cx} y={cy + rOuter + 22} textAnchor="middle">VI</text>
              <text x={cx - rOuter - 18} y={cy + 3} textAnchor="middle">IX</text>
            </g>
          </svg>

          {/* Football — coin-flips on Y-axis, perfectly centered in same stage */}
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ perspective: "1400px" }}
          >
            <img
              src={`${import.meta.env.BASE_URL}football-real.png`}
              alt=""
              draggable={false}
              className="select-none"
              style={{
                width: 200,
                height: "auto",
                display: "block",
                transformOrigin: "50% 50%",
                animation: "football-flip 4.5s linear infinite",
                filter:
                  "drop-shadow(0 20px 30px rgba(0,0,0,0.75)) drop-shadow(0 0 26px rgba(209,138,69,0.35))",
              }}
            />
          </div>
        </div>
      </div>

      {/* Editorial corner brackets — viewport corners, thin & symmetrical */}
      {[
        { top: 24, left: 24, d: "M0 10 V0 H10" },
        { top: 24, right: 24, d: "M0 0 H10 V10" },
        { bottom: 24, right: 24, d: "M10 0 V10 H0" },
        { bottom: 24, left: 24, d: "M10 10 H0 V0" },
      ].map((c, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 10 10"
          className="absolute"
          style={{ top: c.top, left: c.left, right: c.right, bottom: c.bottom }}
        >
          <path d={c.d} stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none" />
        </svg>
      ))}

      {/* Top + bottom centered meta */}
      <div className="absolute top-7 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.5em] text-white/55">
        EST. 2025 — Vol. I
      </div>

      {/* Hairline progress bar (centered) */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-[260px] h-px bg-white/15 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-transparent via-[#d18a45] to-transparent"
          style={{
            width: "100%",
            transformOrigin: "left center",
            animation: `pl-progress ${TOTAL_MS}ms linear forwards`,
          }}
        />
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.45em] text-white/55">
        Entering the auction room
      </div>

      <style>{`
        @keyframes football-flip {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes pl-progress {
          0%   { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
