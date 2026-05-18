import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import hero from "@/assets/hero-landscape.jpg";

const NAV = [
  { label: "DRAFT ROOM", to: "/draft-room" },
  { label: "PLAYERS", to: "/draft-room" },
  { label: "TEAMS", to: "/team" },
  { label: "RESEARCH", to: "/draft-room" },
  { label: "ABOUT", to: "/" },
];

export default function LandingEditorial() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Hero image */}
      <img
        src={hero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Subtle vignette for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 md:px-12 md:pt-8">
        <Link to="/" className="font-serif text-2xl tracking-[0.18em] md:text-3xl">
          A<span className="opacity-60">|</span>A
        </Link>

        <nav className="hidden items-center gap-10 text-[11px] font-light tracking-[0.25em] lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              className="opacity-90 transition-opacity hover:opacity-60"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          aria-label="Search"
          className="opacity-90 transition-opacity hover:opacity-60"
        >
          <Search className="h-4 w-4" strokeWidth={1.25} />
        </button>
      </header>

      {/* Hero content */}
      <section className="relative z-10 flex min-h-[calc(100vh-6rem)] flex-col justify-end px-6 pb-16 md:px-12 md:pb-20">
        <p className="mb-4 text-[10px] font-light tracking-[0.4em] opacity-80">
          AUCTION ACE — EST. 2025
        </p>
        <h1 className="max-w-4xl font-serif text-5xl font-light leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          The research room <br />
          for auction drafts.
        </h1>
        <p className="mt-6 max-w-xl text-sm font-light leading-relaxed tracking-wide opacity-80 md:text-base">
          A quiet, considered space for league commissioners and members to study
          values, tiers, and trends — together, before the bidding begins.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Link
            to="/draft-room"
            className="group inline-flex items-center gap-3 border border-white/70 px-6 py-3 text-[11px] font-light tracking-[0.3em] transition-colors hover:bg-white hover:text-black"
          >
            ENTER DRAFT ROOM
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link
            to="/team"
            className="text-[11px] font-light tracking-[0.3em] opacity-80 hover:opacity-100"
          >
            CHOOSE A TEAM
          </Link>
        </div>
      </section>

      {/* Footer ticker */}
      <footer className="relative z-10 flex items-center justify-between border-t border-white/15 px-6 py-5 text-[10px] font-light tracking-[0.3em] opacity-80 md:px-12">
        <span>RESEARCH · READ-ONLY</span>
        <span className="hidden md:inline">SHARED LEAGUE VIEW</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
