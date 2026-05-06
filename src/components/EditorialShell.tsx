import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Calculator, Search, Bot, Star } from "lucide-react";

interface Props {
  children: ReactNode;
  masthead?: string;
  activeCategory?: string;
}

const CATEGORIES = [
  { label: "Home", to: "/" },
  { label: "Strategy", to: "/strategy" },
  { label: "Market", to: "/market" },
  { label: "Targets", to: "/targets" },
  { label: "Coach", to: "/coach" },
  { label: "Settings", to: "/settings" },
];

const QUICK_ACTIONS = [
  { label: "Planner", icon: Calculator, to: "/" },
  { label: "Scout", icon: Search, to: "/draft#upnext" },
  { label: "Watch", icon: Star, to: "/draft#watchlist" },
  { label: "Coach", icon: Bot, to: "/draft?coach=open" },
];

export default function EditorialShell({
  children,
  masthead = "The Auction Room",
  activeCategory,
}: Props) {
  const navigate = useNavigate();
  const loc = useLocation();

  const isCatActive = (to: string) => {
    if (activeCategory) return false;
    if (to === "/") return loc.pathname === "/" || loc.pathname === "/index";
    return loc.pathname.startsWith(to);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col antialiased gotham-sky">
      {/* ============= MASTHEAD ============= */}
      <header className="relative overflow-hidden border-b-[3px] border-foreground/95 tracy-sky">
        {/* Art-deco rays from below */}
        <div className="absolute inset-0 deco-rays pointer-events-none" />
        {/* Halftone wash */}
        <div className="absolute inset-0 halftone-yellow opacity-40 pointer-events-none" />
        {/* Vignette + grain */}
        <div className="absolute inset-0 vignette pointer-events-none" />
        <div className="absolute inset-0 grain pointer-events-none" />

        {/* Top bar — wiretap dossier strip */}
        <div className="relative px-4 pt-2.5 pb-1 flex items-center justify-between text-stamp text-[9px] tracking-[0.35em] text-foreground/70">
          <span>Case № 0451</span>
          <span className="spot-yellow">·  CONFIDENTIAL  ·</span>
          <span>21:00 hrs</span>
        </div>

        {/* Title plate */}
        <div className="relative px-4 py-5 text-center">
          <p className="text-stamp text-[10px] tracking-[0.45em] text-foreground/60 mb-2">
            A Vetri Picture · Presented in
          </p>
          <h1
            className="toon-display neon-yellow inline-block"
            style={{ fontSize: "2.5rem" }}
          >
            {masthead}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3 text-stamp text-[9px] tracking-[0.4em] text-foreground/65">
            <span className="h-px w-8 bg-foreground/40" />
            <span>« Auction in Progress »</span>
            <span className="h-px w-8 bg-foreground/40" />
          </div>
        </div>

        {/* NAV — radio-show dial / theatre marquee */}
        <nav className="relative bg-foreground border-t-2 border-foreground overflow-x-auto no-scrollbar">
          <ul className="flex items-stretch min-w-max">
            {CATEGORIES.map((c) => {
              const active = activeCategory ? activeCategory === c.label : isCatActive(c.to);
              return (
                <li key={c.label} className="flex-1 relative">
                  <button
                    onClick={() => navigate(c.to)}
                    className={`headline-noir w-full px-4 py-3 text-[13px] transition-all border-r-2 border-background/40 last:border-r-0 relative ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground text-background hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {c.label}
                    {active && (
                      <>
                        <span className="absolute top-0 left-0 right-0 h-1 bg-accent" />
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-primary border-r-2 border-b-2 border-foreground" />
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="flex-1 pb-28 relative">{children}</main>

      {/* ============= BOTTOM DOCK — Bat-signal control panel ============= */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t-[3px] border-foreground bg-foreground text-background overflow-hidden">
        <div className="absolute inset-0 deco-rays-purple opacity-60 pointer-events-none" />
        <ul className="relative grid grid-cols-4 max-w-md mx-auto">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.label}>
                <button
                  onClick={() => navigate(a.to)}
                  className="group w-full flex flex-col items-center justify-center gap-1.5 py-3 text-[9px] uppercase tracking-[0.28em] text-background/85 hover:text-primary transition-colors text-stamp"
                >
                  <Icon
                    className="h-[20px] w-[20px] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_hsl(48_100%_55%)] transition-all"
                    strokeWidth={2.25}
                  />
                  <span>{a.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
