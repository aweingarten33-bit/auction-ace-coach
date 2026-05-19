import { useEffect, useRef, useState } from "react";

interface Props {
  onDone: () => void;
}

const EXIT_MS = 600;
const SAFETY_MS = 12000; // hard cap if video stalls

export default function Preloader({ onDone }: Props) {
  const [exiting, setExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setExiting(true);
      setTimeout(onDone, EXIT_MS);
    };

    const v = videoRef.current;
    const safety = setTimeout(finish, SAFETY_MS);

    if (v) {
      v.muted = true;
      v.playsInline = true;
      const tryPlay = () => v.play().catch(finish);
      tryPlay();
      v.addEventListener("ended", finish);
      v.addEventListener("error", finish);
      return () => {
        clearTimeout(safety);
        v.removeEventListener("ended", finish);
        v.removeEventListener("error", finish);
      };
    }
    return () => clearTimeout(safety);
  }, [onDone]);

  const skip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);
    setTimeout(onDone, EXIT_MS);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black ${exiting ? "preloader-exit" : ""}`}
      onClick={skip}
    >
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}intro.mp4`}
        poster={`${import.meta.env.BASE_URL}intro-poster.png`}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); skip(); }}
        className="absolute bottom-6 right-6 z-10 rounded-full border border-white/30 bg-black/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80 backdrop-blur-sm transition hover:border-white hover:bg-white hover:text-black"
      >
        Skip →
      </button>

      <style>{`
        .preloader-exit { animation: pl-exit ${EXIT_MS}ms ease-in forwards; }
        @keyframes pl-exit {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
