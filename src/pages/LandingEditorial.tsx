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
        <div className="flex items-center justify-between gap-3 rounded-md bg-black/40 px-3 py-2.5 backdrop-blur-xl ring-1 ring-white/10 md:px-5 md:py-3">
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

          <span
            aria-label="Auction Ace"
            className="absolute left-1/2 -translate-x-1/2 font-bebas text-[18px] tracking-[0.32em] text-white md:text-[22px]"
          >
            AUCTION&nbsp;ACE
          </span>

          <Link
            to="/team"
            className="rounded-sm bg-red-500 px-3 py-2 font-bebas text-[12px] tracking-[0.22em] text-white transition hover:bg-red-400 md:px-4 md:text-[13px]"
          >
            ENTER&nbsp;DRAFT&nbsp;ROOM
          </Link>
        </div>
      </header>

      {/* ── Side-panel menu (Clum-style: slides in from right) ─────── */}
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-30 bg-white/30 backdrop-blur-md transition-opacity duration-500 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <aside
        aria-hidden={!menuOpen}
        className={`fixed right-0 top-0 z-40 h-[100svh] w-[88vw] max-w-[520px] bg-white/70 backdrop-blur-2xl ring-1 ring-black/5 shadow-[-20px_0_60px_rgba(0,0,0,0.12)] transition-transform duration-[650ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Round close button */}
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-black/5 text-[#0a0a0a] ring-1 ring-black/10 transition hover:bg-black/10 md:right-7 md:top-7"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Nav list — large bold left-aligned, staggered fade-in */}
        <nav className="flex h-full flex-col justify-center gap-1 px-8 md:px-14">
          {[
            { label: "Home", to: "/" },
            { label: "Teams", to: "/team" },
            { label: "Draft Room", to: "/draft-room" },
            { label: "Admin", to: "/admin" },
          ].map((link, i) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="group flex items-baseline gap-3 py-1 font-serif text-[clamp(2rem,7vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.01em] text-[#0a0a0a] transition-colors hover:text-red-500"
              style={{
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? "translateX(0)" : "translateX(24px)",
                transition: `opacity 600ms ease ${220 + i * 80}ms, transform 600ms cubic-bezier(0.22,1,0.36,1) ${220 + i * 80}ms, color 220ms`,
              }}
            >
              {link.label}
            </Link>
          ))}

          <div
            className="mt-10 flex flex-col gap-2 text-[11px] uppercase tracking-[0.32em] text-black/45"
            style={{
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? "translateY(0)" : "translateY(12px)",
              transition: `opacity 600ms ease 600ms, transform 600ms cubic-bezier(0.22,1,0.36,1) 600ms`,
            }}
          >
            <span>Auction Ace · Draft 2026</span>
            <span>Read-only · Shared view</span>
          </div>
        </nav>
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
