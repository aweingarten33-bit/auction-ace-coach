import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Calculator, Search, Bot, Star } from "lucide-react";

interface Props {
  children: ReactNode;
  masthead?: string;
  /** Override which top category is highlighted (route-based by default). */
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

// Bottom dock = research shortcuts. ESPN handles actual picks/nominations.
const QUICK_ACTIONS = [
  { label: "Planner", icon: Calculator, to: "/" },
  { label: "Look Up", icon: Search, to: "/targets" },
  { label: "Watchlist", icon: Star, to: "/targets" },
  { label: "Ask Coach", icon: Bot, to: "/coach" },
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Masthead */}
      <header className="pt-3 pb-2 border-b border-border/60">
        <h1
          className="text-center font-bold tracking-tight text-foreground px-4"
          style={{
            fontFamily: '"UnifrakturCook", "Playfair Display", Georgia, serif',
            fontSize: "1.6rem",
            lineHeight: 1,
          }}
        >
          {masthead}
        </h1>

        {/* Top nav = MAJOR CATEGORIES */}
        <nav className="mt-3 overflow-x-auto no-scrollbar">
          <ul className="flex items-end gap-6 px-5 min-w-max">
            {CATEGORIES.map((c) => {
              const active = activeCategory ? activeCategory === c.label : isCatActive(c.to);
              return (
                <li key={c.label}>
                  <button
                    onClick={() => navigate(c.to)}
                    className={`pb-1.5 text-[14px] transition-colors ${
                      active
                        ? "text-foreground font-semibold border-b-2 border-foreground"
                        : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
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

      {/* Content */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom dock = QUICK ACTIONS (distinct from top categories) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ul className="grid grid-cols-4">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.label}>
                <button
                  onClick={() => navigate(a.to)}
                  className="w-full flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
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
