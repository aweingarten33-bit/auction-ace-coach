import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import footballImg from "@/assets/football.jpeg";

export default function LandingEditorial() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";
  const [scrollY, setScrollY] = useState(0);
  const ghostRef = useRef<HTMLDivElement>(null);

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

  // Scroll-linked transforms for the ghost mark
  const progress = Math.min(scrollY / 600, 1);
  const ghostScale = 1 + progress * 2.4;
  const ghostRotate = progress * 180;
  const ghostY = -progress * 120;
  const ghostOpacity = 0.2 + progress * 0.35;
  const headlineY = progress * -40;
  const headlineOpacity = 1 - progress * 0.6;

  // Football image (replaces Sparkle)
  const Football = ({ className = "" }: { className?: string }) => (
    <img
      src={footballImg}
      alt="Football"
      className={className + " object-contain select-none"}
      draggable={false}
    />
  );

  return (
    <div
      className={
        "relative min-h-screen w-full overflow-hidden transition-colors duration-500 " +
        (isDark ? "bg-neutral-950 text-white" : "bg-neutral-50 text-neutral-950")
      }
    >
      {/* Background video — blurred cover behind, full contain on top */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover opacity-70 blur-3xl scale-125 saturate-150"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-contain opacity-95"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      <div
        className={
          "pointer-events-none fixed inset-0 z-0 " +
          (isDark
            ? "bg-gradient-to-b from-neutral-950/40 via-neutral-950/20 to-neutral-950/70"
            : "bg-gradient-to-b from-white/20 via-white/10 to-white/40")
        }
      />

      <div className="relative z-10">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 md:px-8 md:pt-7">
        <Link to="/" aria-label="Home" className="flex items-center">
          <Football className="h-8 w-8" />
        </Link>

        {/* Theme toggle pill */}
        <div
          className={
            "flex items-center rounded-full border p-1 text-xs font-medium " +
            (isDark ? "border-white/15 bg-white/5" : "border-neutral-200 bg-white")
          }
        >
          <button
            onClick={() => setTheme("light")}
            className={
              "rounded-full px-5 py-2 transition-colors " +
              (!isDark ? "bg-neutral-100 text-neutral-900" : "text-white/70")
            }
          >
            Light
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={
              "rounded-full px-5 py-2 transition-colors " +
              (isDark ? "bg-white text-neutral-900" : "text-neutral-500")
            }
          >
            Dark
          </button>
        </div>

        <button
          aria-label="Menu"
          className={
            "flex h-10 w-10 items-center justify-center rounded-full border " +
            (isDark ? "border-white/15" : "border-neutral-300")
          }
        >
          <Menu className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </header>

      {/* Hero */}
      <section className="px-5 pt-16 md:px-8 md:pt-28">
        <h1 className="mx-auto max-w-6xl text-center text-[14vw] font-bold leading-[0.95] tracking-[-0.04em] md:text-[8rem] lg:text-[10rem]">
          HIGH-END
          <br />
          RESEARCH.
          <br />
          AUCTION READY.
        </h1>

        <p
          className={
            "mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed md:text-lg " +
            (isDark ? "text-white/70" : "text-neutral-600")
          }
        >
          A research room for fantasy football auction leagues. Tiers, values, and
          trends — pulled from your ESPN league, shared with every member, before
          the bidding begins.
        </p>

        <div className="mt-10 flex justify-center">
          <Link
            to="/draft-room"
            className={
              "rounded-full border px-7 py-3 text-sm font-medium transition-colors " +
              (isDark
                ? "border-white/20 hover:bg-white hover:text-neutral-900"
                : "border-neutral-300 hover:bg-neutral-900 hover:text-white")
            }
          >
            Enter draft room →
          </Link>
        </div>

        {/* Decorative ghost mark — scroll-linked */}
        <div
          ref={ghostRef}
          className="pointer-events-none mx-auto mt-20 flex max-w-md justify-center will-change-transform"
          style={{
            transform: `translateY(${ghostY}px) scale(${ghostScale}) rotate(${ghostRotate}deg)`,
            opacity: ghostOpacity,
            transition: "opacity 200ms linear",
          }}
        >
          <Football className="h-64 w-64" />
        </div>
      </section>

      {/* Badges */}
      <section
        className={
          "mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 px-5 pb-16 text-center text-xs uppercase tracking-[0.2em] sm:grid-cols-3 md:px-8 " +
          (isDark ? "text-white/60" : "text-neutral-500")
        }
      >
        <div>★ Built for league commissioners</div>
        <div>★ Powered by your ESPN league</div>
        <div>★ Read-only · shared view</div>
      </section>
      </div>
    </div>
  );
}
