import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TeamPickerPanel from "@/components/TeamPickerPanel";
import ScrambleText from "@/components/ScrambleText";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";

export default function LandingEditorial() {
  const [sketchVisible, setSketchVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [morphing, setMorphing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nav = useNavigate();
  const location = useLocation();
  const { team } = useSelectedTeam();

  // If a team was already picked, resume into the draft room — unless the
  // user just hit Back from the draft room (then stay on the landing).
  useEffect(() => {
    const fromBack = (location.state as { fromBack?: boolean } | null)?.fromBack;
    if (team && !fromBack) nav("/draft-room", { replace: true });
  }, [team, nav, location.state]);

  // Hold video at frame 0 until preloader finishes, then play + drop sketch filter.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let sketchTimer = 0;
    let shouldPlay = false;

    const resetToStart = () => {
      try { v.pause(); } catch {}
      try { v.currentTime = 0; } catch {}
    };
    const start = () => {
      shouldPlay = true;
      window.clearTimeout(sketchTimer);
      setSketchVisible(true);
      try { v.currentTime = 0; } catch {}
      void v.play().catch(() => {});
      sketchTimer = window.setTimeout(() => setSketchVisible(false), 1700);
    };

    resetToStart();
    v.addEventListener("loadedmetadata", resetToStart, { once: true });
    v.addEventListener("canplay", () => { if (shouldPlay) void v.play().catch(() => {}); });
    window.addEventListener("landing:visible", start, { once: true });
    if ((window as typeof window & { __landingVisible?: boolean }).__landingVisible) start();

    return () => {
      window.clearTimeout(sketchTimer);
      v.removeEventListener("loadedmetadata", resetToStart);
      window.removeEventListener("landing:visible", start);
    };
  }, []);

  // Lock scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden bg-[#0a0a0a] text-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* a-ha sketch filter */}
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="ahaSketch" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix"
              values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0" result="gray" />
            <feMorphology in="gray" operator="dilate" radius="1.2" result="dilated" />
            <feMorphology in="gray" operator="erode" radius="1.2" result="eroded" />
            <feComposite in="dilated" in2="eroded" operator="arithmetic" k1="0" k2="1" k3="-1" k4="0" result="edge" />
            <feComponentTransfer in="edge" result="edgeBoost">
              <feFuncR type="linear" slope="6" intercept="0" />
              <feFuncG type="linear" slope="6" intercept="0" />
              <feFuncB type="linear" slope="6" intercept="0" />
            </feComponentTransfer>
            <feColorMatrix in="edgeBoost" type="matrix"
              values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" result="ink" />
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="noise">
              <animate attributeName="seed" values="1;4;7;2;9;5" dur="0.35s" repeatCount="indefinite" calcMode="discrete" />
            </feTurbulence>
            <feDisplacementMap in="ink" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* ── Floating top nav: wordmark + single CTA ─────────────────── */}
      <header className="fixed inset-x-3 top-3 z-50 md:inset-x-6 md:top-5">
        <div className="flex items-center justify-between gap-3 rounded-md bg-black/40 px-3 py-2.5 backdrop-blur-xl ring-1 ring-white/10 md:px-5 md:py-3">
          <span
            aria-label="Auction Ace"
            className="font-bebas text-[18px] tracking-[0.32em] text-white md:text-[22px]"
          >
            AUCTION&nbsp;ACE
          </span>

          <button
            type="button"
            aria-label="Choose your teams"
            onClick={() => {
              if (morphing) return;
              setMorphing(true);
              window.setTimeout(() => setMenuOpen(true), 750);
              window.setTimeout(() => setMorphing(false), 1100);
            }}
            onMouseEnter={() => { if (!morphing) setMorphing(true); }}
            onMouseLeave={() => { if (!menuOpen) window.setTimeout(() => setMorphing(false), 200); }}
            className={`group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-full px-4 font-bebas text-[12px] tracking-[0.28em] text-white outline-none ring-1 transition-all duration-500 ease-out md:text-[13px] ${
              morphing
                ? "bg-red-500 ring-red-300/70 shadow-[0_0_28px_-4px_rgba(239,68,68,0.95)]"
                : "bg-white/5 ring-white/20 hover:bg-white/10"
            }`}
          >
            {/* shine sweep on activation */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-[900ms] ease-out ${
                morphing ? "translate-x-full" : "-translate-x-full"
              }`}
            />
            {/* indicator dot */}
            <span
              aria-hidden
              className={`relative inline-block h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                morphing
                  ? "bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.9)]"
                  : "bg-red-500 shadow-[0_0_8px_1px_rgba(239,68,68,0.8)]"
              }`}
            />
            <ScrambleText
              text="CHOOSE YOUR TEAMS"
              play={morphing}
              duration={750}
              className="relative whitespace-nowrap"
            />
          </button>
        </div>
      </header>

      {/* ── Slide-in team picker panel ─────────────────────────────── */}
      <div
        aria-hidden
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-30 bg-black/25 backdrop-blur-sm transition-opacity duration-[1100ms] ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        aria-hidden={!menuOpen}
        className={`fixed right-0 top-0 z-40 h-[100svh] w-[88vw] max-w-[520px] bg-black/25 backdrop-blur-xl ring-1 ring-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.35)] transition-transform duration-[1200ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => setMenuOpen(false)}
          className="absolute right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white/85 ring-1 ring-white/15 transition hover:bg-white/20 md:right-7 md:top-7"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <TeamPickerPanel active={menuOpen} />
      </aside>

      {/* ── Full-bleed hero video ──────────────────────────────────── */}
      {/* HERO — full screen. Change `height` below to control size (e.g. "100svh", "80svh", "640px") */}
      <section className="relative w-full overflow-hidden" style={{ height: "100svh" }}>
        <video
          ref={videoRef}
          loop muted playsInline preload="auto"
          poster={`${import.meta.env.BASE_URL}hero-poster.png`}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            filter: sketchVisible
              ? "url(#ahaSketch)"
              : "brightness(0.72) contrast(1.06) saturate(0.95)",
            transition: "filter 600ms ease",
          }}
        >
          <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
        </video>

        {/* Modus-style overlay gradients: heavy bottom for type, soft top behind nav */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* paper grain during sketch */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-multiply"
          style={{
            opacity: sketchVisible ? 0.35 : 0,
            transition: "opacity 900ms ease-in",
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.93  0 0 0 0 0.88  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")",
            backgroundSize: "240px 240px",
          }}
        />
        {/* Status badge */}
        <div className="absolute left-5 top-24 z-10 inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md ring-1 ring-white/15 md:left-12 md:top-28">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.32em] text-white/85">Draft Season 2026</span>
        </div>

        {/* Headline */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 md:px-12 md:pb-12">
          <h1
            className="font-bebas uppercase leading-[0.9] tracking-[0.005em] text-white"
            style={{ fontSize: "clamp(1.5rem, 7.5vw, 9rem)" }}
          >
            <span className="block">Draft&nbsp;smarter,</span>
            <span
              className="block text-transparent"
              style={{
                WebkitTextStroke: "1px rgba(255,255,255,0.55)",
                color: "rgba(255,255,255,0.06)",
              }}
            >
              bid&nbsp;sharper.
            </span>
          </h1>

          <p className="mt-3 hidden max-w-lg text-[13px] leading-relaxed text-white/80 md:block md:text-[15px]">
            Three years of league price history, tiered values, and shared
            research — built for your commissioner's draft room.
          </p>
        </div>

        {/* scroll cue (desktop only — hero is too short on mobile) */}
        <div className="absolute bottom-5 right-5 z-10 hidden items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/55 md:bottom-7 md:right-10 md:flex">
          <span>Scroll</span>
          <span aria-hidden className="inline-block h-px w-8 bg-white/50" />
        </div>
      </section>


      <footer className="relative z-10 flex items-center justify-between px-5 py-6 text-[9px] font-mono uppercase tracking-[0.3em] text-white/40 md:px-10">
        <span>HB_A · Auction Ace</span>
        <span>© 2025 — All bids final</span>
      </footer>
    </div>
  );
}
