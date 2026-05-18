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
    <div className="relative h-screen w-full overflow-hidden bg-black text-white">
      {/* Full-bleed video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] " +
          (loaded ? "opacity-100" : "opacity-0")
        }
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* Subtle darkening for nav legibility (HBA-style soft vignette) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.55) 100%)",
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
          <span className="text-2xl tracking-[0.15em] text-white/95">A_A</span>
        </Link>

        {/* Centered nav — hidden on small screens */}
        <nav className="hidden flex-1 items-center justify-around px-12 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="text-[11px] font-light tracking-[0.35em] text-white/85 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center text-white/85 transition hover:text-white"
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
            className="text-[9px] font-light tracking-[0.3em] text-white/85"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom-left tiny meta caption (HBA-style) */}
      <div
        className="absolute bottom-6 left-6 z-10 text-[10px] tracking-[0.3em] text-white/60 md:bottom-8 md:left-12"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        AUCTION&nbsp;ACE&nbsp;—&nbsp;DRAFT&nbsp;SEASON&nbsp;2025
      </div>
    </div>
  );
}
