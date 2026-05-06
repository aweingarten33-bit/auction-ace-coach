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
  masthead = "Basin City Auction",
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
    <div className="relative min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* MASTHEAD — Sin City rooftop, rain, spot-color title */}
      <header className="relative bg-background border-b-2 border-foreground overflow-hidden">
        {/* Rain layer */}
        <div className="absolute inset-0 rain pointer-events-none opacity-70" />
        {/* Halftone wash */}
        <div className="absolute inset-0 halftone pointer-events-none" />
        {/* Vignette */}
        <div className="absolute inset-0 vignette pointer-events-none" />
        {/* Diagonal red slash */}
        <div className="red-slash" style={{ top: "38%", left: "-10%", width: "55%" }} />

        <div className="relative px-4 pt-3 pb-1 flex items-center justify-between text-stamp text-[9px] tracking-[0.3em] text-foreground/60">
          <span>Round 01</span>
          <span className="spot-red">·  RAIN  ·</span>
          <span>$ AUCTION</span>
        </div>

        <div className="relative px-4 py-5 text-center">
          <p className="text-stamp text-[10px] tracking-[0.45em] text-foreground/70 mb-1">
            A Tale From
          </p>
          <h1
            className="title-slab rgb-split-strong text-foreground"
            style={{ fontSize: "2.6rem" }}
          >
            {masthead.split(" ").map((w, i) => (
              <span key={i} className={i === 1 ? "spot-red" : ""}>
                {w}{" "}
              </span>
            ))}
          </h1>
          <p className="text-stamp text-[9px] tracking-[0.4em] text-foreground/60 mt-2">
            « It always rains on draft night »
          </p>
        </div>

        {/* NAV — SF6 character select strip */}
        <nav className="relative overflow-x-auto no-scrollbar bg-foreground border-t-2 border-foreground">
          <ul className="flex items-stretch min-w-max">
            {CATEGORIES.map((c) => {
              const active = activeCategory ? activeCategory === c.label : isCatActive(c.to);
              return (
                <li key={c.label} className="flex-1 relative">
                  <button
                    onClick={() => navigate(c.to)}
                    className={`headline-noir w-full px-4 py-2.5 text-[13px] transition-all border-r-2 border-background last:border-r-0 relative ${
                      active
                        ? "bg-primary text-primary-foreground rgb-split"
                        : "bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    {c.label}
                    {active && (
                      <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-accent" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="flex-1 pb-28 bg-background relative">{children}</main>

      {/* DOCK — silhouette skyline */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t-2 border-foreground bg-foreground text-background overflow-hidden">
        <div className="absolute inset-0 speedlines opacity-40 pointer-events-none" />
        <ul className="relative grid grid-cols-4 max-w-md mx-auto">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.label}>
                <button
                  onClick={() => navigate(a.to)}
                  className="group w-full flex flex-col items-center justify-center gap-1 py-3 text-[9px] uppercase tracking-[0.28em] text-background hover:text-primary transition-colors text-stamp"
                >
                  <Icon className="h-[20px] w-[20px] group-hover:scale-110 transition-transform" strokeWidth={2.25} />
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
