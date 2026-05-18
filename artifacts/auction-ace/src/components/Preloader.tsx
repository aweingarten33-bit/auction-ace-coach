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
  const ringSize = size + 90;
  const textRadius = size / 2 + 30;
  const ringText = "BRO WE'RE SENIOR CITIZENS  •  2026–2027 FANTASY FOOTBALL SEASON  •  ";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black ${exiting ? "preloader-exit" : ""}`}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: ringSize, height: ringSize }}
      >
        {/* Rotating text ring */}
        <svg
          className="absolute inset-0"
          width={ringSize}
          height={ringSize}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          style={{ animation: "football-orbit 22s linear infinite" }}
        >
          <defs>
            <path
              id="preloader-ring-path"
              d={`M ${ringSize / 2},${ringSize / 2} m -${textRadius},0 a ${textRadius},${textRadius} 0 1,1 ${textRadius * 2},0 a ${textRadius},${textRadius} 0 1,1 -${textRadius * 2},0`}
            />
          </defs>
          <text
            fontSize="10"
            letterSpacing="3.5"
            fill="rgba(255,255,255,0.32)"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              textTransform: "uppercase",
            }}
          >
            <textPath href="#preloader-ring-path">{ringText.repeat(3)}</textPath>
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
