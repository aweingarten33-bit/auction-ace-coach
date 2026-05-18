import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import hero from "@/assets/hero-landscape.jpg";

const NAV = [
  { label: "PROJECTS", to: "/draft-room" },
  { label: "EXPERTISE", to: "/draft-room" },
  { label: "PRACTICE", to: "/team" },
  { label: "STUDIOS", to: "/draft-room" },
  { label: "SPECIALISTS", to: "/draft-room" },
];

export default function LandingEditorial() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-white">
      {/* Full-bleed hero media */}
      <img
        src={hero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/25" />

      {/* Top bar — HBA style */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-6 md:px-10 md:py-8">
        {/* Logo: H B_A style — here "A A_A" mark */}
        <Link
          to="/"
          aria-label="Home"
          className="font-serif text-3xl leading-none tracking-[0.05em] md:text-4xl"
        >
          <span>A</span>
          <span className="mx-0.5">A</span>
          <span className="border-b border-white pb-0.5">A</span>
        </Link>

        {/* Centered nav (desktop) */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-12 text-[11px] font-light tracking-[0.25em] lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              className="transition-opacity hover:opacity-60"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          aria-label="Search"
          className="transition-opacity hover:opacity-60"
        >
          <Search className="h-5 w-5" strokeWidth={1} />
        </button>
      </header>

      {/* Mobile nav strip */}
      <nav className="absolute inset-x-0 bottom-6 z-10 flex justify-center gap-6 px-6 text-[10px] font-light tracking-[0.25em] lg:hidden">
        {NAV.slice(0, 3).map((n) => (
          <Link key={n.label} to={n.to} className="opacity-90">
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
