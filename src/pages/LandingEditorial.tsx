import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "Teams", to: "/team" },
  { label: "Draft Room", to: "/draftroom" },
  { label: "Admin", to: "/passcode" },
];

const SOCIAL_LINKS: { label: string; to: string }[] = [
  { label: "ESPN", to: "/espn-settings" },
  { label: "Setup", to: "/admin" },
];

export default function LandingEditorial() {
  const [sketchVisible, setSketchVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const MARQUEE = "AUCTION ROOM · BUDGET MATH · LEAGUE HISTORY · TIER MAPPING · DRAFT 2025 · ";

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

      {/* ── Top bar (center hamburger) ─────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 pt-5 md:px-10 md:pt-7 mix-blend-difference">
        <Link to="/" aria-label="Home" className="font-serif italic leading-[0.85] text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
          <span className="block text-[18px] md:text-[22px]">auction</span>
          <span className="block pl-3 text-[18px] md:text-[22px]">ace</span>
        </Link>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="relative h-10 w-10 outline-none"
        >
          <span
            className="absolute left-1/2 top-1/2 block h-px w-7 bg-white transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]"
            style={{ transform: menuOpen ? "translate(-50%,-50%) rotate(45deg)" : "translate(-50%,-50%) translateY(-4px)" }}
          />
          <span
            className="absolute left-1/2 top-1/2 block h-px w-7 bg-white transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]"
            style={{ transform: menuOpen ? "translate(-50%,-50%) rotate(-45deg)" : "translate(-50%,-50%) translateY(4px)" }}
          />
        </button>

        <span aria-hidden className="font-serif text-2xl leading-none text-red-500 md:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>✳</span>
      </header>

      {/* ── Fullscreen menu overlay ───────────────────────────────── */}
      <div
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0a0a] transition-[clip-path,opacity] duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ clipPath: menuOpen ? "circle(150% at 50% 0%)" : "circle(0% at 50% 0%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")",
          }}
        />
        <nav className="relative flex flex-col items-center gap-1 md:gap-2">
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="font-serif italic text-[clamp(2.5rem,9vw,5.5rem)] leading-[1.05] tracking-[-0.02em] text-white/85 transition-colors duration-300 hover:text-red-500"
              style={{
                fontFamily: "'Playfair Display', serif",
                transform: menuOpen ? "translateY(0)" : "translateY(40px)",
                opacity: menuOpen ? 1 : 0,
                transition: `transform 700ms cubic-bezier(0.22,1,0.36,1) ${260 + i * 90}ms, opacity 700ms ease ${260 + i * 90}ms, color 300ms`,
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div
          className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 font-serif italic text-[clamp(1rem,3.5vw,1.5rem)] text-white/55"
          style={{
            fontFamily: "'Playfair Display', serif",
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? "translateY(0)" : "translateY(20px)",
            transition: `opacity 600ms ease ${260 + NAV_LINKS.length * 90 + 80}ms, transform 600ms cubic-bezier(0.22,1,0.36,1) ${260 + NAV_LINKS.length * 90 + 80}ms`,
          }}
        >
          {SOCIAL_LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-5 mt-20 h-px bg-white/10 md:mx-10 md:mt-24" />

      {/* ── Video panel (front and center on load) ─────────────────────── */}
      <section className="relative z-10 mt-4 px-5 md:px-10">
        <div className="relative">
          {/* Corner labels */}
          <div className="absolute -top-3 left-0 z-20 bg-[#0a0a0a] px-2 text-[9px] font-mono uppercase tracking-[0.32em] text-white/55">
            ▸ Reel / 00:00
          </div>
          <div className="absolute -top-3 right-0 z-20 bg-[#0a0a0a] px-2 text-[9px] font-mono uppercase tracking-[0.32em] text-red-500">
            ● REC
          </div>

          <div
            className="relative h-[62vh] max-h-[640px] w-full overflow-hidden bg-transparent sm:h-[70vh]"
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
            }}
          >
            <video
              ref={videoRef}
              loop muted playsInline preload="auto"
              poster={`${import.meta.env.BASE_URL}hero-poster.png`}
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                filter: sketchVisible
                  ? "url(#ahaSketch)"
                  : "brightness(0.78) contrast(1.06) saturate(0.9)",
                transition: "filter 600ms ease",
              }}
            >
              <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
            </video>

            {/* Soft blur bands on top + bottom edges */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[22%]"
              style={{
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
                maskImage: "linear-gradient(to bottom, black, transparent)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%]"
              style={{
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                WebkitMaskImage: "linear-gradient(to top, black, transparent)",
                maskImage: "linear-gradient(to top, black, transparent)",
              }}
            />

            {/* Paper grain during sketch */}
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

            {/* Bottom gradient + caption inside the frame */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-[9px] font-mono uppercase tracking-[0.3em] text-white/75">
              <span>The Draft Tape</span>
              <span>2025 · HB_A</span>
            </div>
          </div>

          {/* Bottom corner labels */}
          <div className="mt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.32em] text-white/40">
            <span>Auto-loop</span>
            <span>Read-only · Shared view</span>
          </div>
        </div>
      </section>

      {/* ── Editorial headline (below video) ───────────────────────────── */}
      <section className="relative z-10 px-5 pt-8 md:px-10 md:pt-12">
        <h2 className="font-serif italic leading-[0.82] tracking-[-0.04em] text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}>
          <span className="block text-[clamp(3.5rem,18vw,12rem)]">Auction</span>
          <span className="block text-[clamp(3.5rem,18vw,12rem)] pl-[18%] text-white/35">Room.</span>
        </h2>
        <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <p className="max-w-[20rem] text-[12px] leading-relaxed text-white/65">
            A shared research desk for your league — three years of price history, tiered values, zero noise.
          </p>
          <div className="shrink-0 text-right text-[9px] font-mono uppercase tracking-[0.28em] text-white/40">
            №&nbsp;001<br />HB_A
          </div>
        </div>
      </section>


      {/* ── Marquee ────────────────────────────────────────────────────── */}
      <section className="relative z-10 mt-10 overflow-hidden border-y border-white/10 py-3">
        <div className="marquee-track whitespace-nowrap font-serif italic text-[clamp(1.5rem,5vw,2.5rem)] text-white/30"
             style={{ fontFamily: "'Playfair Display', serif" }}>
          {MARQUEE.repeat(6)}
        </div>
      </section>

      {/* ── CTA + index list ───────────────────────────────────────────── */}
      <section className="relative z-10 px-5 pt-10 md:px-10">
        <Link
          to="/team"
          className="group inline-flex w-full items-center justify-between gap-3 border border-white/25 px-6 py-5 text-[11px] uppercase tracking-[0.32em] text-white transition-all duration-300 hover:border-white hover:bg-white hover:text-black"
        >
          <span>Enter the draft room</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>

        <ol className="mt-10 divide-y divide-white/10 border-y border-white/10">
          {[
            { num: "01", label: "Built for league commissioners", meta: "Admin" },
            { num: "02", label: "Powered by your ESPN league", meta: "Sync" },
            { num: "03", label: "Read-only · Shared view", meta: "Public" },
          ].map((item) => (
            <li key={item.num} className="flex items-center justify-between gap-4 py-5">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-[10px] tracking-[0.32em] text-white/40">{item.num}</span>
                <span className="font-serif italic text-[clamp(1.1rem,4.5vw,1.6rem)] text-white"
                      style={{ fontFamily: "'Playfair Display', serif" }}>
                  {item.label}
                </span>
              </div>
              <span className="shrink-0 text-[9px] font-mono uppercase tracking-[0.3em] text-white/40">
                {item.meta}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="relative z-10 mt-10 flex items-center justify-between px-5 py-6 text-[9px] font-mono uppercase tracking-[0.3em] text-white/40 md:px-10">
        <span>HB_A · Auction Ace</span>
        <span>© 2025 — All bids final</span>
      </footer>

      <style>{`
        .marquee-track {
          animation: marquee 38s linear infinite;
          will-change: transform;
        }
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none; }
        }
      `}</style>
    </div>
  );
}
