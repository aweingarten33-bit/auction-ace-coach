// War Room shell — cinematic command-center chrome.
// Top: editorial masthead with live budget pulse.
// Bottom: thin dock — six destinations + central LIVE button to /draft.
import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, Compass, TrendingUp, Target, Bot, Settings as SettingsIcon, Radio, Calculator,
} from "lucide-react";
import { useDraftStore } from "@/lib/draft-store";
import { computeBudget } from "@/lib/draft-math";

interface Props {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  activeCategory?: string;
}

const NAV = [
  { label: "Command", to: "/",         Icon: Home },
  { label: "Strategy", to: "/strategy", Icon: Compass },
  { label: "Targets",  to: "/targets",  Icon: Target },
  { label: "Room",     to: "/market",   Icon: TrendingUp },
  { label: "Brain",    to: "/coach",    Icon: Bot },
  { label: "Setup",    to: "/setup",    Icon: SettingsIcon },
];

export default function WarRoomShell({ children, eyebrow, title, activeCategory }: Props) {
  const navigate = useNavigate();
  const loc = useLocation();
  const { settings, keepers, events } = useDraftStore();
  const budget = computeBudget(settings, keepers, events);

  const [pulse, setPulse] = useState(false);
  useEffect(() => { setPulse(true); const t = setTimeout(() => setPulse(false), 600); return () => clearTimeout(t); }, [budget.remaining]);

  const isActive = (to: string, label: string) => {
    if (activeCategory) return activeCategory.toLowerCase() === label.toLowerCase();
    if (to === "/") return loc.pathname === "/" || loc.pathname === "/index";
    return loc.pathname.startsWith(to);
  };

  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const burnRate = budget.slotsLeft > 0 ? budget.remaining / budget.slotsLeft : 0;

  return (
    <div className="relative min-h-screen text-foreground room-bg">
      <div className="pointer-events-none fixed inset-0 room-grid opacity-50 -z-0" />
      <div className="pointer-events-none fixed inset-0 grain opacity-40 -z-0" />

      {/* Editorial masthead */}
      <header className="relative z-10 px-4 md:px-8 pt-5 pb-3 max-w-6xl mx-auto">
        <div className="flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-muted-foreground room-label">
          <span>{date}</span>
          <span className="hidden sm:inline">War Room · Vol. {new Date().getFullYear()}</span>
          <span className={`flex items-center gap-1.5 ${pulse ? "text-[hsl(var(--success))]" : ""}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))] live-pulse" />
            ROOM LIVE
          </span>
        </div>
        <div className="editorial-rule mt-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              {eyebrow && <div className="editorial-kicker text-xs">{eyebrow}</div>}
              <h1 className="room-display text-3xl md:text-5xl text-foreground mt-0.5">
                {title || activeCategory || "The Auction Room"}
              </h1>
            </div>
            {/* Budget pulse — always visible */}
            <button
              onClick={() => navigate("/")}
              className="hidden md:flex items-baseline gap-3 px-3 py-1.5 rounded-md hover:bg-foreground/5 transition-colors"
              aria-label="Budget"
            >
              <div className="text-right">
                <div className="room-eyebrow">Bank</div>
                <div className="room-mono text-2xl text-[hsl(var(--primary))]">${budget.remaining}</div>
              </div>
              <div className="text-right">
                <div className="room-eyebrow">Max bid</div>
                <div className="room-mono text-lg text-foreground">${budget.maxBid}</div>
              </div>
              <div className="text-right">
                <div className="room-eyebrow">$/slot</div>
                <div className="room-mono text-lg text-foreground">${burnRate.toFixed(0)}</div>
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-32">{children}</main>

      {/* Bottom dock */}
      <nav className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto room-card flex items-center justify-between gap-1 px-2 py-1.5">
          {NAV.slice(0, 3).map((n) => {
            const active = isActive(n.to, n.label);
            return (
              <button key={n.label} onClick={() => navigate(n.to)} aria-label={n.label}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-colors ${active ? "text-[hsl(var(--primary))] bg-foreground/5" : "text-muted-foreground hover:text-foreground"}`}>
                <n.Icon className="h-4 w-4" strokeWidth={1.75} />
                <span className="text-[9px] tracking-[0.18em] uppercase room-label">{n.label}</span>
              </button>
            );
          })}
          {/* Center LIVE button */}
          <button
            onClick={() => navigate("/draft")}
            aria-label="Live draft"
            className="relative -mt-6 mx-1 w-14 h-14 rounded-full flex flex-col items-center justify-center text-[hsl(var(--primary-foreground))] room-breathe"
            style={{
              background: "linear-gradient(160deg, hsl(38 95% 60%), hsl(16 88% 56%))",
              boxShadow: "0 0 0 1px hsl(38 95% 60% / 0.5), 0 0 28px hsl(16 88% 50% / 0.6), 0 14px 30px -10px hsl(222 90% 2% / 0.85)",
            }}
          >
            <Radio className="h-5 w-5" strokeWidth={2} />
            <span className="text-[8px] tracking-[0.2em] uppercase font-bold">LIVE</span>
          </button>
          {NAV.slice(3).map((n) => {
            const active = isActive(n.to, n.label);
            return (
              <button key={n.label} onClick={() => navigate(n.to)} aria-label={n.label}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-colors ${active ? "text-[hsl(var(--primary))] bg-foreground/5" : "text-muted-foreground hover:text-foreground"}`}>
                <n.Icon className="h-4 w-4" strokeWidth={1.75} />
                <span className="text-[9px] tracking-[0.18em] uppercase room-label">{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
