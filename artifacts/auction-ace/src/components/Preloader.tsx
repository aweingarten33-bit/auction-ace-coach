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

    const hardTimeout = setTimeout(dismiss, 4000);
    document.fonts.ready.then(dismiss);

    return () => clearTimeout(hardTimeout);
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black ${exiting ? "preloader-exit" : ""}`}
    >
      <p className="font-bebas text-[clamp(3rem,16vw,10rem)] tracking-[0.15em] text-white">
        LOADING
      </p>
      <div className="mt-4 h-px w-24 overflow-hidden bg-white/10">
        <div className="h-full animate-[loading-bar_3.8s_linear_forwards] bg-red-600" />
      </div>
      <style>{`
        @keyframes loading-bar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
