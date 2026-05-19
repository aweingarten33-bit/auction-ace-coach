import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function LandingEditorial() {
  const [scrollY, setScrollY] = useState(0);
  const ghostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoZoom, setVideoZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseFloat(localStorage.getItem("heroVideoZoom") || "1");
    return Number.isFinite(v) && v > 0 ? v : 1;
  });
  useEffect(() => {
    try { localStorage.setItem("heroVideoZoom", String(videoZoom)); } catch {}
  }, [videoZoom]);

  // Sync video start with preloader end (~6.5s) so it doesn't begin mid-clip.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    try { v.currentTime = 0; } catch {}
    const t = setTimeout(() => {
      if (!videoRef.current) return;
      try { videoRef.current.currentTime = 0; } catch {}
      void videoRef.current.play().catch(() => {});
    }, 6500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const progress = Math.min(scrollY / 600, 1);
  const ghostScale = 1 + progress * 1.4;
  const ghostY = -progress * 80;
  const ghostOpacity = 0.16 + progress * 0.18;
  const heroFade = 1 - progress * 0.4;

  const Wordmark = ({
    className = "",
    spin = true,
  }: {
    className?: string;
    spin?: boolean;
  }) => (
    <span
      className={
        "inline-flex items-center select-none font-serif italic font-medium leading-none tracking-tight text-white " +
        className
      }
      style={{ fontFamily: "'Playfair Display', 'Times New Roman', serif" }}
    >
      <span>H</span>
      <span
        aria-label="B"
        className="relative inline-block align-baseline"
        style={{
          width: "1.05em",
          height: "0.78em",
          marginInline: "0.06em",
          transform: "translateY(0.06em)",
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}football-real.png`}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            transform: "rotate(-18deg)",
            animation: spin ? "football-wobble 4.2s ease-in-out infinite" : undefined,
            transformOrigin: "50% 55%",
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
          }}
        />
      </span>
      <span className="not-italic font-light text-white/70">_</span>
      <span>A</span>
    </span>
  );

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-black text-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        preload="auto"
        className="pointer-events-none fixed inset-0 z-0 h-screen w-screen object-contain transition-transform duration-150"
        style={{
          filter: "brightness(0.7) contrast(1.05) saturate(0.85)",
          objectPosition: "center",
          transform: `scale(${videoZoom})`,
          transformOrigin: "center center",
        }}
      >
        <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
      </video>

      {/* Hero video zoom slider */}
      <div
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-white/80 backdrop-blur"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <span>Zoom</span>
        <input
          type="range"
          min={0.5}
          max={2.5}
          step={0.01}
          value={videoZoom}
          onChange={(e) => setVideoZoom(parseFloat(e.target.value))}
          className="h-1 w-32 cursor-pointer accent-white"
          aria-label="Hero video zoom"
        />
        <span className="w-10 text-right tabular-nums">{videoZoom.toFixed(2)}x</span>
        <button
          type="button"
          onClick={() => setVideoZoom(1)}
          className="rounded-full border border-white/20 px-2 py-0.5 text-white/70 transition hover:border-white/60 hover:text-white"
        >
          Reset
        </button>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 22%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.10] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: "200px 200px",
        }}
      />

      <div className="relative z-10">
        <header className="flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8">
          <Link to="/" aria-label="Home" className="flex items-center">
            <Wordmark className="text-2xl md:text-3xl" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.32em] text-white/55">
            <span>Est. 2025</span>
            <span className="h-px w-8 bg-white/25" />
            <span>Auction Room</span>
            <span className="h-px w-8 bg-white/25" />
            <span>Vol. I</span>
          </div>

          <button
            aria-label="Menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-white/60 hover:text-white"
          >
            <Menu className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <div className="mx-6 mt-6 h-px bg-white/10 md:mx-10" />

        <section
          className="px-6 pt-24 md:px-10 md:pt-32"
          style={{ opacity: heroFade }}
        >
          <p className="mb-8 text-center text-[10px] uppercase tracking-[0.4em] text-white/55">
            <span className="mr-3">N°01</span>
            <span className="text-white/30">—</span>
            <span className="ml-3">A research room for fantasy football auctions</span>
          </p>

          <h1
            className="mx-auto max-w-6xl text-center font-serif font-medium leading-[0.92] tracking-[-0.03em] text-white"
            style={{
              fontFamily: "'Playfair Display', 'Times New Roman', serif",
              fontSize: "clamp(3.5rem, 11vw, 10rem)",
            }}
          >
            <span className="block">High-end research.</span>
            <span className="block italic font-normal text-white/95">Auction ready.</span>
          </h1>

          <p className="mx-auto mt-12 max-w-xl text-center text-base leading-relaxed text-white/65 md:text-[17px]">
            Tiers, values, and trends — pulled from your ESPN league, shared with
            every member, before the bidding begins.
          </p>

          <div className="mt-14 flex justify-center">
            <Link
              to="/team"
              className="group inline-flex items-center gap-3 rounded-full border border-white/25 px-8 py-3.5 text-[11px] uppercase tracking-[0.32em] text-white/90 transition-all duration-300 hover:border-white hover:bg-white hover:text-black"
            >
              Enter draft room
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>

          <div
            ref={ghostRef}
            className="pointer-events-none mx-auto mt-24 flex max-w-md justify-center will-change-transform"
            style={{
              transform: `translateY(${ghostY}px) scale(${ghostScale})`,
              opacity: ghostOpacity,
              transition: "opacity 200ms linear",
            }}
          >
            <Wordmark className="text-[14rem] md:text-[20rem]" />
          </div>
        </section>

        <section className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-0 px-6 pb-20 sm:grid-cols-3 md:px-10">
          {[
            { num: "I.", label: "Built for league commissioners" },
            { num: "II.", label: "Powered by your ESPN league" },
            { num: "III.", label: "Read-only · shared view" },
          ].map((item, i) => (
            <div
              key={item.num}
              className={
                "flex flex-col items-center gap-3 py-8 text-center " +
                (i > 0 ? "sm:border-l sm:border-white/10" : "")
              }
            >
              <span
                className="text-2xl font-serif italic text-white/40"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {item.num}
              </span>
              <span className="text-[10px] uppercase tracking-[0.32em] text-white/55">
                {item.label}
              </span>
            </div>
          ))}
        </section>

        <div className="mx-6 h-px bg-white/10 md:mx-10" />
        <footer className="flex flex-col items-center justify-between gap-3 px-6 py-6 text-[10px] uppercase tracking-[0.3em] text-white/40 md:flex-row md:px-10">
          <span>HB_A · Auction Ace Coach</span>
          <span>© 2025 — All bids final</span>
        </footer>
      </div>

      <style>{`
        @keyframes football-wobble {
          0%, 100% { transform: rotate(-18deg) scale(1); }
          25% { transform: rotate(-12deg) scale(1.04); }
          75% { transform: rotate(-22deg) scale(0.97); }
        }
      `}</style>
    </div>
  );
}
