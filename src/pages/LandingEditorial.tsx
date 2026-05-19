import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export default function LandingEditorial() {
  const [sketchVisible, setSketchVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

      {/* ── Floating top nav (Modus-style: translucent pill) ─────────── */}
      <header className="fixed inset-x-3 top-3 z-50 md:inset-x-6 md:top-5">
        <div className="flex items-center justify-between gap-3 rounded-md bg-black/35 px-3 py-2.5 backdrop-blur-md ring-1 ring-white/10 md:px-5 md:py-3">
          {/* left: hamburger (mobile) — desktop could add nav items later */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="relative h-9 w-9 outline-none"
            >
              <span
                className="absolute left-1/2 top-1/2 block h-px w-6 bg-white transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]"
                style={{ transform: menuOpen ? "translate(-50%,-50%) rotate(45deg)" : "translate(-50%,-50%) translateY(-4px)" }}
              />
              <span
                className="absolute left-1/2 top-1/2 block h-px w-6 bg-white transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]"
                style={{ transform: menuOpen ? "translate(-50%,-50%) rotate(-45deg)" : "translate(-50%,-50%) translateY(4px)" }}
              />
            </button>
          </div>

          {/* center: wordmark */}
          <Link
            to="/"
            aria-label="Auction Ace home"
            className="absolute left-1/2 -translate-x-1/2 font-bebas text-[18px] tracking-[0.32em] text-white md:text-[22px]"
          >
            AUCTION&nbsp;ACE
          </Link>

          {/* right: CTA */}
          <Link
            to="/team"
            className="rounded-sm bg-red-500 px-3 py-2 font-bebas text-[12px] tracking-[0.22em] text-white transition hover:bg-red-400 md:px-4 md:text-[13px]"
          >
            ENTER&nbsp;DRAFT&nbsp;ROOM
          </Link>
        </div>
      </header>

      {/* ── Fullscreen menu overlay ───────────────────────────────── */}
      <div
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0a0a] transition-[clip-path,opacity] duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ clipPath: menuOpen ? "circle(160% at 8% 6%)" : "circle(0% at 8% 6%)" }}
      >
        <p
          className="absolute top-24 left-6 text-[10px] uppercase tracking-[0.32em] text-white/40 md:left-10"
          style={{ opacity: menuOpen ? 1 : 0, transition: "opacity 600ms ease 300ms" }}
        >
          Menu coming soon — tell me what links to add
        </p>
      </div>

      {/* ── Full-bleed hero video ──────────────────────────────────── */}
      <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
        <video
          ref={videoRef}
          loop muted playsInline preload="auto"
          poster={`${import.meta.env.BASE_URL}hero-poster.png`}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            filter: sketchVisible
              ? "url(#ahaSketch)"
              : "brightness(0.7) contrast(1.05) saturate(0.95)",
            transition: "filter 600ms ease",
          }}
        >
          <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
        </video>

        {/* dark gradient for headline legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

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

        {/* corner status */}
        <div className="absolute left-4 top-24 z-10 flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/70 md:left-10 md:top-28">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>Draft Season 2025</span>
        </div>

        {/* Headline — bottom-left, huge condensed, two lines with depth fade */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-8 md:px-10 md:pb-12">
          <h1
            className="font-bebas leading-[0.92] tracking-[0.005em] text-white"
            style={{ fontSize: "clamp(3rem, 14vw, 12rem)" }}
          >
            <span className="block">DRAFT&nbsp;SMARTER,</span>
            <span className="block text-white/35 mix-blend-screen">BID&nbsp;SHARPER.</span>
          </h1>

          <p className="mt-5 max-w-md text-[13px] leading-relaxed text-white/75 md:text-[14px]">
            Three years of league price history, tiered values, and shared
            research — built for your commissioner's draft room.
          </p>
        </div>
      </section>

      <footer className="relative z-10 flex items-center justify-between px-5 py-6 text-[9px] font-mono uppercase tracking-[0.3em] text-white/40 md:px-10">
        <span>HB_A · Auction Ace</span>
        <span>© 2025 — All bids final</span>
      </footer>
    </div>
  );
}
