import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

const HOLD_MS = 2200;
const EXIT_MS = 600;

export default function Preloader({ onDone }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const safety = setTimeout(onDone, HOLD_MS + EXIT_MS + 2000);
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, EXIT_MS);
    }, HOLD_MS);
    return () => { clearTimeout(t); clearTimeout(safety); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-black ${exiting ? "preloader-exit" : ""}`}
    >
      <img
        src="/league-hero.jpeg"
        alt="Bro, We're Senior Citizens — FF League"
        draggable={false}
        className="select-none max-w-[94vw] max-h-[90vh] object-contain"
        style={{ animation: "pl-in 700ms ease-out forwards" }}
      />
      <button
        onClick={() => { setExiting(true); setTimeout(onDone, EXIT_MS); }}
        className="absolute bottom-5 right-5 text-[11px] uppercase tracking-[0.35em] text-white/60 hover:text-white transition"
      >
        Skip →
      </button>
      <style>{`
        @keyframes pl-in { 0% { opacity: 0; transform: scale(1.04); } 100% { opacity: 1; transform: scale(1); } }
        .preloader-exit { animation: pl-out 600ms ease-in forwards; }
        @keyframes pl-out { 0% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>
    </div>
  );
}
