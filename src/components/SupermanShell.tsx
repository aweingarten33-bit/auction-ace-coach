import { ReactNode } from "react";

// SUPERMAN 1978 — Donner-credits trippy backdrop.
// Streaking blue beams of light, krypton sky, slow-spinning S-shield,
// solar-yellow halo, chromatic-aberration title.
export default function SupermanShell({
  children,
  title = "the auction room",
  credit = "a fantasy focus production",
}: {
  children: ReactNode;
  title?: string;
  credit?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden krypton-sky text-foreground">
      {/* Streaking blue beams (Donner credits) */}
      <div className="pointer-events-none absolute inset-0 donner-streaks streak opacity-90" />
      <div className="pointer-events-none absolute inset-0 donner-streaks streak-slow opacity-60" style={{ filter: "blur(1.5px)" }} />

      {/* Crystal Fortress kaleidoscope */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[140vw] h-[140vw] max-w-[1100px] max-h-[1100px] rounded-full fortress opacity-70 wobble-slow" />

      {/* Solar yellow sun-flare top */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pulse-glow"
        style={{ background: "radial-gradient(circle, hsl(48 100% 60% / 0.45), transparent 60%)", filter: "blur(20px)" }}
      />
      <div className="pointer-events-none absolute inset-0 grain opacity-60" />

      {/* TITLE — chromatic, trippy */}
      <header className="relative z-10 pt-10 pb-6 text-center px-4">
        <div className="donner-credit text-[10px] md:text-[11px] mb-3 chroma-pulse uppercase">
          {credit}
        </div>
        <h1 className="donner-title text-[44px] md:text-[72px] leading-[0.9] uppercase chroma-pulse">
          {title}
        </h1>
        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-[hsl(208_100%_60%_/_0.6)]" />
          {/* spinning S-shield */}
          <div className="shield-spin sun-glow rounded-full p-[3px]" style={{ background: "linear-gradient(180deg, hsl(48 100% 55%), hsl(0 85% 50%))" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle at 35% 30%, hsl(48 100% 75%), hsl(0 85% 45%) 70%)" }}>
              <span className="font-black text-[22px] leading-none" style={{ color: "hsl(48 100% 90%)", fontFamily: '"Anton", Impact, sans-serif', textShadow: "0 0 4px hsl(0 90% 30%), 0 0 10px hsl(48 100% 50%)" }}>S</span>
            </div>
          </div>
          <div className="h-px w-16 bg-[hsl(208_100%_60%_/_0.6)]" />
        </div>
      </header>

      <main className="relative z-10 pb-32">{children}</main>
    </div>
  );
}
