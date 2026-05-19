import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TeamPickerPanel from "@/components/TeamPickerPanel";
import ScrambleText from "@/components/ScrambleText";
import helmetImg from "@/assets/choose-team-helmet.png";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";

export default function LandingEditorial() {
  const [sketchVisible, setSketchVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [morphing, setMorphing] = useState(false);
  const [videoControlsOpen, setVideoControlsOpen] = useState(false);
  const [videoHeight, setVideoHeight] = useState(100);
  const [videoZoom, setVideoZoom] = useState(118);
  const [videoY, setVideoY] = useState(100);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nav = useNavigate();
  const location = useLocation();
  const { team } = useSelectedTeam();

  useEffect(() => {
    const saved = window.localStorage.getItem("landing-video-controls");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { height?: number; zoom?: number; y?: number };
      if (typeof parsed.height === "number") setVideoHeight(parsed.height);
      if (typeof parsed.zoom === "number") setVideoZoom(parsed.zoom);
      if (typeof parsed.y === "number") setVideoY(parsed.y);
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "landing-video-controls",
      JSON.stringify({ height: videoHeight, zoom: videoZoom, y: videoY })
    );
  }, [videoHeight, videoZoom, videoY]);

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
        <div className="flex items-center justify-end gap-3 px-1 py-1">


          <button
            type="button"
            aria-label="Choose your teams"
            onClick={() => {
              if (morphing) return;
              setMorphing(true);
              window.setTimeout(() => setMenuOpen(true), 600);
              window.setTimeout(() => setMorphing(false), 1000);
            }}
            onMouseEnter={() => { if (!morphing) setMorphing(true); }}
            onMouseLeave={() => { if (!menuOpen) window.setTimeout(() => setMorphing(false), 200); }}
            className="group relative block bg-transparent outline-none"
          >
            <img
              src={helmetImg}
              alt=""
              draggable={false}
              className={`block h-auto w-[180px] select-none transition-transform duration-500 ease-out md:w-[240px] ${
                morphing ? "scale-[1.06]" : "scale-100 group-hover:scale-[1.03]"
              }`}
              style={{ filter: "drop-shadow(0 0 18px rgba(255,255,255,0.35))" }}
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
      <section className="relative w-full overflow-hidden" style={{ height: `${videoHeight}svh` }}>
        <video
          ref={videoRef}
          loop muted playsInline preload="auto"
          poster={`${import.meta.env.BASE_URL}hero-poster.png`}
          className="absolute left-1/2 top-1/2 h-full w-full object-cover"
          style={{
            objectPosition: `50% ${videoY}%`,
            transform: `translate(-50%, -50%) scale(${videoZoom / 100})`,
            filter: sketchVisible
              ? "url(#ahaSketch)"
              : "brightness(0.85) contrast(1.06) saturate(0.95)",
            transition: "filter 600ms ease, transform 220ms ease, object-position 220ms ease",
          }}
        >
          <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
        </video>

        <div className="absolute left-4 top-28 z-20 w-[min(88vw,360px)] text-white md:left-6 md:top-32">
          <button
            type="button"
            onClick={() => setVideoControlsOpen((open) => !open)}
            className="rounded-md bg-black/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55"
          >
            Video sizing
          </button>
          <div
            className={`mt-2 rounded-lg bg-black/45 p-3 shadow-2xl ring-1 ring-white/15 backdrop-blur-md transition duration-300 ${
              videoControlsOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
            }`}
          >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">Video sizing</span>
            <button
              type="button"
              onClick={() => {
                setVideoHeight(100);
                setVideoZoom(118);
                setVideoY(100);
              }}
              className="rounded-md bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75 ring-1 ring-white/15 transition hover:bg-white/20"
            >
              Reset
            </button>
          </div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-white/65">
            Screen height
            <input
              type="range"
              min="45"
              max="120"
              value={videoHeight}
              onChange={(e) => setVideoHeight(Number(e.target.value))}
              className="mt-2 block w-full accent-white"
            />
          </label>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-white/65">
            Video zoom
            <input
              type="range"
              min="100"
              max="160"
              value={videoZoom}
              onChange={(e) => setVideoZoom(Number(e.target.value))}
              className="mt-2 block w-full accent-white"
            />
          </label>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/65">
            Vertical crop
            <input
              type="range"
              min="0"
              max="100"
              value={videoY}
              onChange={(e) => setVideoY(Number(e.target.value))}
              className="mt-2 block w-full accent-white"
            />
          </label>
          </div>
        </div>

        {/* Modus-style overlay gradient: heavy bottom for type */}
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
