import { Link } from "react-router-dom";
import { Menu, Sparkle } from "lucide-react";
import { useState } from "react";

export default function LandingEditorial() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";

  return (
    <div
      className={
        "min-h-screen w-full transition-colors duration-500 " +
        (isDark ? "bg-neutral-950 text-white" : "bg-neutral-50 text-neutral-950")
      }
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 md:px-8 md:pt-7">
        <Link to="/" aria-label="Home" className="flex items-center">
          <Sparkle className="h-7 w-7" strokeWidth={1.5} fill="currentColor" />
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

        {/* Decorative ghost mark */}
        <div className="mx-auto mt-20 flex max-w-md justify-center opacity-20">
          <Sparkle className="h-48 w-48" strokeWidth={0.5} />
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
  );
}
