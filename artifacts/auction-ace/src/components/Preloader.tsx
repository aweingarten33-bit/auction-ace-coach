import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

export default function Preloader({ onDone }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const dismiss = () => {
      setExiting(true);
      setTimeout(onDone, 820);
    };
    const hardTimeout = setTimeout(dismiss, 5000);
    return () => {
      clearTimeout(hardTimeout);
    };
  }, [onDone]);

  const size = 200;
  const ringSize = size + 120;
  const r = size / 2 + 36;
  const cx = ringSize / 2;
  const cy = ringSize / 2;
  const topText = "BRO WE'RE SENIOR CITIZENS";
  const bottomText = "2026–2027 FANTASY FOOTBALL SEASON";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black ${exiting ? "preloader-exit" : ""}`}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: ringSize, height: ringSize }}
      >
        {/* Text on top + bottom arcs, white, slowly spinning */}
        <svg
          className="absolute inset-0"
          width={ringSize}
          height={ringSize}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
        >
          <defs>
            {/* Top arc: left → right across the top (readable upright) */}
            <path
              id="preloader-top-arc"
              d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
              fill="none"
            />
            {/* Bottom arc: left → right across the bottom (readable upright) */}
            <path
              id="preloader-bottom-arc"
              d={`M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy}`}
              fill="none"
            />
          </defs>
          <text
            fontSize="12"
            letterSpacing="4"
            fill="#ffffff"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              textTransform: "uppercase",
            }}
          >
            <textPath href="#preloader-top-arc" startOffset="50%" textAnchor="middle">
              {topText}
            </textPath>
          </text>
          <text
            fontSize="12"
            letterSpacing="4"
            fill="#ffffff"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              textTransform: "uppercase",
            }}
          >
            <textPath href="#preloader-bottom-arc" startOffset="50%" textAnchor="middle">
              {bottomText}
            </textPath>
          </text>
        </svg>

        {/* Real football, gently wobbling */}
        <img
          src={`${import.meta.env.BASE_URL}football-real.png`}
          alt=""
          draggable={false}
          className="relative select-none"
          style={{
            width: size,
            height: "auto",
            animation: "football-orbit 6s linear infinite",
            transformOrigin: "50% 50%",
            filter: "drop-shadow(0 18px 32px rgba(0,0,0,0.65))",
          }}
        />
      </div>

      <p
        className="mt-12 text-[10px] uppercase tracking-[0.42em] text-white/55"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        Loading the auction room
      </p>
    </div>
  );
}
