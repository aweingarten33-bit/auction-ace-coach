import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * HBA-inspired full-bleed video landing.
 * Tiny serif wordmark top-left, thin spaced nav, search icon top-right.
 * Video fills the screen; subtle dark vignette for legibility.
 */
export default function LandingEditorial() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const play = () => v.play().catch(() => {});
    play();
    v.addEventListener("loadeddata", () => {
      setLoaded(true);
      play();
    });
  }, []);

  const navItems = [
    { label: "RESEARCH", to: "/draft-room" },
    { label: "TIERS", to: "/draft-room" },
    { label: "LEAGUE", to: "/team" },
    { label: "HISTORY", to: "/draft-room" },
    { label: "ADMIN", to: "/passcode" },
  ];

  return (
    <div className="relative h-screen w-full overflow-hidden bg-neutral-50 text-neutral-900">
      {/* Heavenly dream video — washed out, transparent, fades into page */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={
          "pointer-events-none absolute inset-0 h-full w-full object-cover animate-kenburns transition-opacity duration-[1200ms] " +
          (loaded ? "opacity-70" : "opacity-0")
        }
        style={{
          filter: "brightness(1.35) contrast(0.88) saturate(0.9)",
          WebkitMaskImage:
            "radial-gradient(ellipse 95% 90% at center, black 55%, transparent 100%)",
          maskImage:
            "radial-gradient(ellipse 95% 90% at center, black 55%, transparent 100%)",
        }}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* Warm halo + vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,235,200,0.18) 0%, transparent 45%, rgba(0,0,0,0.25) 100%)",
        }}
      />

      {/* Film grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: "200px 200px",
        }}
      />

      {/* Top nav */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-6 md:px-12 md:pt-8">
        {/* Serif wordmark */}
        <Link
          to="/"
          aria-label="Auction Ace"
          className="select-none"
          style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif' }}
        >
          <span className="text-2xl tracking-[0.15em] text-neutral-900">A_A</span>
        </Link>

        {/* Centered nav — hidden on small screens */}
        <nav className="hidden flex-1 items-center justify-around px-12 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="text-[11px] font-light tracking-[0.35em] text-neutral-700 transition hover:text-neutral-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center text-neutral-700 transition hover:text-neutral-950"
        >
          <Search className="h-4 w-4" strokeWidth={1.25} />
        </button>
      </header>

      {/* Mobile nav row */}
      <nav className="absolute inset-x-0 top-20 z-10 flex justify-between px-6 md:hidden">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="text-[9px] font-light tracking-[0.3em] text-neutral-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom-left tiny meta caption (HBA-style) */}
      <div
        className="absolute bottom-6 left-6 z-10 text-[10px] tracking-[0.3em] text-neutral-500 md:bottom-8 md:left-12"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        AUCTION&nbsp;ACE&nbsp;—&nbsp;DRAFT&nbsp;SEASON&nbsp;2025
      </div>
    </div>
  );
}
