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
  { label: "Research", icon: Search, to: "/draft#upnext" },
  { label: "Watchlist", icon: Star, to: "/draft#watchlist" },
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
    <div className="relative min-h-screen bg-background text-foreground flex flex-col antialiased halftone">
      {/* Masthead — pulp comic cover */}
      <header className="relative bg-background border-b-[3px] border-foreground">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            <span className="text-stamp">No. 01</span>
            <span className="text-stamp text-primary">·  Auction Night  ·</span>
            <span className="text-stamp">$2.99</span>
          </div>
        </div>
        <div className="bg-foreground text-background py-3 px-4 border-y-2 border-foreground">
          <h1
            className="headline-noir text-center text-background"
            style={{ fontSize: "2.4rem" }}
          >
            {masthead}
          </h1>
          <p className="mt-1 text-center text-[9px] uppercase tracking-[0.4em] text-background/70 text-stamp">
            « A draft-room thriller in one panel »
          </p>
        </div>

        <nav className="overflow-x-auto no-scrollbar bg-background">
          <ul className="flex items-stretch justify-start gap-0 px-2 min-w-max">
            {CATEGORIES.map((c) => {
              const active = activeCategory ? activeCategory === c.label : isCatActive(c.to);
              return (
                <li key={c.label} className="flex-1">
                  <button
                    onClick={() => navigate(c.to)}
                    className={`headline-noir w-full px-3 py-2.5 text-[13px] transition-colors border-r border-border last:border-r-0 ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {c.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="flex-1 pb-28 bg-background relative">{children}</main>

      {/* Bottom dock — black ink slab */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t-[3px] border-foreground bg-foreground text-background">
        <ul className="grid grid-cols-4 max-w-md mx-auto">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.label}>
                <button
                  onClick={() => navigate(a.to)}
                  className="w-full flex flex-col items-center justify-center gap-1 py-3 text-[9px] uppercase tracking-[0.24em] text-background/80 hover:text-primary transition-colors text-stamp"
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
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
