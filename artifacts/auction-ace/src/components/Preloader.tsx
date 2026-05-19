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
    const hardTimeout = setTimeout(dismiss, TOTAL_MS);
    return () => clearTimeout(hardTimeout);
  }, [onDone]);

  // Geometry
  const size = 220;                    // football width
  const ringSize = 480;                // overall stage
  const cx = ringSize / 2;
  const cy = ringSize / 2;
  const rOuter = 232;
  const rInner = 210;
  const rText = 156;

  // Outer ring with editorial tick marks (every 6°, longer every 30°)
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i * 6) * (Math.PI / 180);
    const isMajor = i % 5 === 0;
    const inner = rOuter - (isMajor ? 14 : 6);
    const x1 = cx + Math.cos(angle) * rOuter;
    const y1 = cy + Math.sin(angle) * rOuter;
    const x2 = cx + Math.cos(angle) * inner;
    const y2 = cy + Math.sin(angle) * inner;
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isMajor ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)"}
        strokeWidth={isMajor ? 1.2 : 0.6}
      />
    );
  });

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black ${exiting ? "preloader-exit" : ""}`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Spotlight + vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(209,138,69,0.10) 0%, rgba(0,0,0,0) 55%), radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      {/* Subtle grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      {/* Editorial corner brackets */}
      {[
        { top: 28, left: 28, rotate: 0 },
        { top: 28, right: 28, rotate: 90 },
        { bottom: 28, right: 28, rotate: 180 },
        { bottom: 28, left: 28, rotate: 270 },
      ].map((c, i) => (
        <svg
          key={i}
          width="26"
          height="26"
          viewBox="0 0 26 26"
          className="absolute"
          style={{
            top: c.top,
            left: c.left,
            right: c.right,
            bottom: c.bottom,
            transform: `rotate(${c.rotate}deg)`,
          }}
        >
          <path d="M0 8 V0 H8" stroke="rgba(255,255,255,0.55)" strokeWidth="1" fill="none" />
        </svg>
      ))}

      {/* Top meta */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.5em] text-white/55">
        Bro We're Senior Citizens
      </div>

      {/* Side meta */}
      <div
        className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.4em] text-white/45"
        style={{ writingMode: "vertical-rl", transform: "translateY(-50%) rotate(180deg)" }}
      >
        Est. 2025 — Volume I
      </div>
      <div
        className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.4em] text-white/45"
        style={{ writingMode: "vertical-rl" }}
      >
        Draft Room — Auction Ace
      </div>

      {/* Center stage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: ringSize, height: ringSize }}>
          {/* Concentric rings + ticks */}
          <svg
            className="absolute inset-0"
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            <defs>
              {/* Top arc: left → right across the top */}
              <path
                id="pl-top-arc"
                d={`M ${cx - rText},${cy} A ${rText},${rText} 0 0,1 ${cx + rText},${cy}`}
                fill="none"
              />
              {/* Bottom arc */}
              <path
                id="pl-bottom-arc"
                d={`M ${cx - rText},${cy} A ${rText},${rText} 0 1,0 ${cx + rText},${cy}`}
                fill="none"
              />
            </defs>

            {/* Outer hairline circle */}
            <circle
              cx={cx}
              cy={cy}
              r={rOuter}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.6"
            />
            {/* Inner hairline circle */}
            <circle
              cx={cx}
              cy={cy}
              r={rInner}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="0.6"
            />
            {/* Tick marks */}
            <g>{ticks}</g>

            {/* Arc text — upright, static */}
            <text fontSize="11" letterSpacing="6" fill="rgba(255,255,255,0.92)" style={{ textTransform: "uppercase" }}>
              <textPath href="#pl-top-arc" startOffset="50%" textAnchor="middle">
                Bro We're Senior Citizens
              </textPath>
            </text>
            <text fontSize="11" letterSpacing="6" fill="rgba(255,255,255,0.92)" style={{ textTransform: "uppercase" }}>
              <textPath href="#pl-bottom-arc" startOffset="50%" textAnchor="middle">
                2026 — 2027 Fantasy Football Season
              </textPath>
            </text>

            {/* Slowly rotating index marker on outer ring */}
            <g style={{ animation: "football-orbit 8s linear infinite", transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy - rOuter} r="2.4" fill="#d18a45" />
            </g>
          </svg>

          {/* Football — coin-flip on Y axis with perspective */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ perspective: "1200px" }}
          >
            <div
              className="relative"
              style={{
                width: size,
                height: size * 0.65,
                transformStyle: "preserve-3d",
                animation: "football-flip 4.5s linear infinite",
              }}
            >
              {/* Soft glow behind */}
              <div
                className="absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(50% 50% at 50% 55%, rgba(209,138,69,0.45) 0%, rgba(209,138,69,0) 70%)",
                  filter: "blur(20px)",
                }}
              />
              <img
                src={`${import.meta.env.BASE_URL}football-real.png`}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain select-none"
                style={{
                  filter:
                    "drop-shadow(0 22px 32px rgba(0,0,0,0.75)) drop-shadow(0 0 24px rgba(209,138,69,0.35))",
                  backfaceVisibility: "visible",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hairline progress bar */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[260px] h-px bg-white/15 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#d18a45] via-white to-[#d18a45]"
          style={{
            width: "100%",
            transformOrigin: "left center",
            animation: `pl-progress ${TOTAL_MS}ms linear forwards`,
          }}
        />
      </div>

      {/* Bottom caption */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.45em] text-white/55">
        Entering the auction room
      </div>

      {/* Local keyframes */}
      <style>{`
        @keyframes football-flip {
          0%   { transform: rotateY(0deg)   rotateZ(-8deg); }
          100% { transform: rotateY(360deg) rotateZ(-8deg); }
        }
        @keyframes pl-progress {
          0%   { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
