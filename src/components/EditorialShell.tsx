import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Headphones, User, Calculator } from "lucide-react";

type Tab = { label: string; to?: string };

interface Props {
  children: ReactNode;
  masthead?: string;
  tabs?: Tab[];
  activeTab?: string;
  onTabClick?: (label: string) => void;
}

export default function EditorialShell({
  children,
  masthead = "The Auction Room",
  tabs = [
    { label: "Draft", to: "/draft" },
    { label: "Planner", to: "/planner" },
    { label: "ESPN", to: "/espn" },
    { label: "Setup", to: "/?edit=1" },
    { label: "Admin", to: "/admin" },
  ],
  activeTab,
  onTabClick,
}: Props) {
  const navigate = useNavigate();
  const loc = useLocation();

  const isActive = (t: Tab) => {
    if (activeTab) return activeTab === t.label;
    if (!t.to) return false;
    return loc.pathname === t.to.split("?")[0];
  };

  const navItems = [
    { label: "Draft", icon: Home, to: "/draft" },
    { label: "Planner", icon: Calculator, to: "/planner" },
    { label: "ESPN", icon: Headphones, to: "/espn" },
    { label: "You", icon: User, to: "/admin" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Masthead */}
      <header className="pt-3 pb-2 border-b border-border/60">
        <h1
          className="text-center font-bold tracking-tight text-foreground"
          style={{
            fontFamily: '"UnifrakturCook", "Playfair Display", Georgia, serif',
            fontSize: "1.75rem",
            lineHeight: 1,
            letterSpacing: "0.01em",
          }}
        >
          {masthead}
        </h1>

        {/* Scrollable text tabs */}
        <nav className="mt-3 overflow-x-auto no-scrollbar">
          <ul className="flex items-end gap-6 px-5 min-w-max">
            {tabs.map((t) => {
              const active = isActive(t);
              return (
                <li key={t.label}>
                  <button
                    onClick={() => {
                      onTabClick?.(t.label);
                      if (t.to) navigate(t.to);
                    }}
                    className={`pb-1.5 text-[15px] transition-colors ${
                      active
                        ? "text-foreground font-semibold border-b-2 border-foreground"
                        : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
                    }`}
                  >
                    {t.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ul className="grid grid-cols-4">
          {navItems.map((n) => {
            const active = loc.pathname === n.to;
            const Icon = n.icon;
            return (
              <li key={n.label}>
                <button
                  onClick={() => navigate(n.to)}
                  className={`w-full flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  <span className={active ? "font-semibold" : ""}>{n.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
