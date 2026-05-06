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
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Masthead — paper white, generous air */}
      <header className="pt-6 pb-3 border-b border-border/80 bg-background">
        <h1
          className="text-center text-foreground px-4"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: "1.4rem",
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          {masthead}
        </h1>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.32em] text-muted-foreground/80">
          A private research suite
        </p>

        {/* Top nav — thin, calm */}
        <nav className="mt-5 overflow-x-auto no-scrollbar">
          <ul className="flex items-end justify-center gap-7 px-5 min-w-max">
            {CATEGORIES.map((c) => {
              const active = activeCategory ? activeCategory === c.label : isCatActive(c.to);
              return (
                <li key={c.label}>
                  <button
                    onClick={() => navigate(c.to)}
                    className={`pb-1.5 text-[11px] uppercase tracking-[0.22em] transition-colors ${
                      active
                        ? "text-foreground border-b border-foreground"
                        : "text-muted-foreground hover:text-foreground border-b border-transparent"
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

      <main className="flex-1 pb-28 bg-background">{children}</main>

      {/* Bottom dock — quiet, thin, mobile-only emphasis */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <ul className="grid grid-cols-4 max-w-md mx-auto">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.label}>
                <button
                  onClick={() => navigate(a.to)}
                  className="w-full flex flex-col items-center justify-center gap-1 py-3 text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.4} />
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
