import { useState, useEffect, useRef, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Calculator, Search, Bot, Star, Home, Settings as SettingsIcon, Target, TrendingUp, Compass, X } from "lucide-react";

interface Props {
  children: ReactNode;
  masthead?: string;
  activeCategory?: string;
}

const SECTIONS = [
  { label: "Home",     to: "/",          Icon: Home },
  { label: "Strategy", to: "/strategy",  Icon: Compass },
  { label: "Market",   to: "/market",    Icon: TrendingUp },
  { label: "Targets",  to: "/targets",   Icon: Target },
  { label: "Coach",    to: "/coach",     Icon: Bot },
  { label: "Settings", to: "/settings",  Icon: SettingsIcon },
];

const QUICK = [
  { label: "Planner",  to: "/",                  Icon: Calculator },
  { label: "Scout",    to: "/draft#upnext",      Icon: Search },
  { label: "Watch",    to: "/draft#watchlist",   Icon: Star },
];

export default function EditorialShell({
  children,
  masthead = "The Daily Planet",
  activeCategory,
}: Props) {
  const navigate = useNavigate();
  const loc = useLocation();
  const [signalOpen, setSignalOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Issue date — Daily Planet front-page banner
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).toUpperCase();

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSignalOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (to: string, label: string) => {
    if (activeCategory) return activeCategory === label;
    if (to === "/") return loc.pathname === "/" || loc.pathname === "/index";
    return loc.pathname.startsWith(to);
  };

  // Radial geometry — fan above the FAB
  const radius = 130;
  const startAngle = -170; // degrees
  const endAngle = -10;
  const step = (endAngle - startAngle) / (SECTIONS.length - 1);

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col antialiased gotham-sky">
      {/* ===================== MASTHEAD — Daily Planet front page ===================== */}
      <header className="relative overflow-hidden border-b-[3px] border-foreground">
        <div className="absolute inset-0 deco-rays opacity-30 pointer-events-none" />
        <div className="absolute inset-0 grain pointer-events-none" />

        {/* Daily Planet red banner */}
        <div className="relative bg-destructive text-destructive-foreground">
          <div className="absolute inset-0 halftone-red opacity-30 pointer-events-none" />
          <div className="relative px-4 py-1 flex items-center justify-between text-stamp text-[9px] tracking-[0.3em]">
            <span>VOL. CXII</span>
            <span>FINAL EDITION</span>
            <span>5¢</span>
          </div>
        </div>

        {/* Newspaper title */}
        <div className="relative px-4 pt-4 pb-3 text-center">
          <p className="biz-card text-[9px] tracking-[0.5em] text-foreground/60 mb-1">
            METROPOLIS · GOTHAM · CHICAGO
          </p>
          <h1
            className="toon-display neon-yellow inline-block"
            style={{ fontSize: "2.55rem" }}
          >
            {masthead}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3 text-stamp text-[9px] tracking-[0.32em] text-foreground/70">
            <span className="h-px flex-1 bg-foreground/30 max-w-[70px]" />
            <span>{dateStr}</span>
            <span className="h-px flex-1 bg-foreground/30 max-w-[70px]" />
          </div>
        </div>

        {/* Front-page sub-headline strip + skyline silhouette */}
        <div className="relative h-14 border-t-2 border-foreground/80 overflow-hidden bg-background">
          <div className="absolute inset-0 deco-rays-purple opacity-50" />
          {/* Skyline silhouette — pure CSS rooftops */}
          <div
            className="absolute bottom-0 left-0 right-0 h-10"
            style={{
              background: "hsl(0 0% 0%)",
              clipPath:
                "polygon(0% 100%, 0% 60%, 5% 60%, 5% 40%, 10% 40%, 10% 55%, 14% 55%, 14% 30%, 18% 30%, 18% 50%, 22% 50%, 22% 20%, 26% 20%, 26% 45%, 32% 45%, 32% 35%, 36% 35%, 36% 60%, 42% 60%, 42% 25%, 46% 25%, 46% 50%, 52% 50%, 52% 15%, 56% 15%, 56% 45%, 62% 45%, 62% 30%, 68% 30%, 68% 55%, 74% 55%, 74% 35%, 80% 35%, 80% 60%, 86% 60%, 86% 40%, 92% 40%, 92% 55%, 100% 55%, 100% 100%)",
            }}
          />
          {/* The signal — yellow moon over the skyline */}
          <div
            className="absolute right-6 top-1 w-9 h-9 rounded-full bat-glow"
            style={{
              background: "radial-gradient(circle at 35% 35%, hsl(48 100% 75%), hsl(48 100% 50%) 65%, hsl(38 100% 38%) 100%)",
            }}
          />
        </div>
      </header>

      {/* ===================== MAIN ===================== */}
      <main className="flex-1 pb-32 relative">{children}</main>

      {/* ===================== BAT-SIGNAL RADIAL NAV ===================== */}
      {/* Backdrop overlay when open */}
      <div
        ref={overlayRef}
        onClick={() => setSignalOpen(false)}
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          signalOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{
          background:
            "radial-gradient(circle at 50% 100%, hsl(48 100% 55% / 0.18) 0%, hsl(252 60% 6% / 0.85) 55%, hsl(252 70% 4% / 0.95) 100%)",
          backdropFilter: "blur(2px)",
        }}
      >
        <div className="absolute inset-0 deco-rays opacity-60 pointer-events-none" />
        <div className="absolute inset-0 grain pointer-events-none" />
      </div>

      {/* Radial section buttons */}
      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div className="relative max-w-md mx-auto h-0">
          {SECTIONS.map((s, i) => {
            const angle = (startAngle + step * i) * (Math.PI / 180);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const active = isActive(s.to, s.label);
            const Icon = s.Icon;
            return (
              <button
                key={s.label}
                onClick={() => { setSignalOpen(false); navigate(s.to); }}
                tabIndex={signalOpen ? 0 : -1}
                aria-label={s.label}
                className={`absolute left-1/2 bottom-12 pointer-events-auto transition-all duration-300 ${
                  signalOpen ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
                }`}
                style={{
                  transform: signalOpen
                    ? `translate(calc(-50% + ${x}px), ${y}px)`
                    : "translate(-50%, 0)",
                  transitionDelay: signalOpen ? `${i * 35}ms` : "0ms",
                }}
              >
                <div className={`flex flex-col items-center gap-1 group`}>
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-[2.5px] border-foreground transition-all ${
                      active
                        ? "bg-primary text-primary-foreground bat-glow"
                        : "bg-card text-foreground hover:bg-primary hover:text-primary-foreground hover:scale-110"
                    }`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.25} />
                  </div>
                  <span className={`text-stamp text-[9px] tracking-[0.25em] ${active ? "spot-yellow" : "text-foreground/85"}`}>
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom action bar — quick tools + signal trigger */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t-[3px] border-foreground bg-foreground text-background overflow-visible">
        <div className="absolute inset-0 deco-rays-purple opacity-50 pointer-events-none" />
        <div className="relative max-w-md mx-auto grid grid-cols-3 items-center">
          {/* Quick action — left */}
          <button
            onClick={() => navigate(QUICK[0].to)}
            className="flex flex-col items-center justify-center gap-1 py-3 text-[9px] uppercase tracking-[0.28em] text-background/85 hover:text-primary transition-colors text-stamp"
          >
            <Calculator className="h-5 w-5" strokeWidth={2.25} />
            <span>{QUICK[0].label}</span>
          </button>

          {/* SIGNAL — center */}
          <div className="flex justify-center">
            <button
              onClick={() => setSignalOpen((v) => !v)}
              aria-label={signalOpen ? "Close signal" : "Open signal"}
              aria-expanded={signalOpen}
              className="relative -translate-y-5 w-16 h-16 rounded-full border-[3px] border-background flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
              style={{
                background:
                  "radial-gradient(circle at 35% 35%, hsl(48 100% 78%), hsl(48 100% 52%) 60%, hsl(38 100% 38%) 100%)",
                boxShadow:
                  "0 0 0 3px hsl(0 0% 0%), 0 0 28px hsl(48 100% 55% / 0.7), 0 0 64px hsl(48 100% 50% / 0.45)",
              }}
            >
              {signalOpen ? (
                <X className="h-7 w-7 text-foreground" strokeWidth={3} />
              ) : (
                /* Bat silhouette */
                <svg viewBox="0 0 64 32" className="w-9 h-5" fill="hsl(0 0% 0%)" aria-hidden>
                  <path d="M32 4 C30 10, 26 14, 20 14 C14 14, 8 10, 2 12 C6 16, 8 22, 12 24 C18 22, 24 24, 28 28 L32 22 L36 28 C40 24, 46 22, 52 24 C56 22, 58 16, 62 12 C56 10, 50 14, 44 14 C38 14, 34 10, 32 4 Z" />
                </svg>
              )}
            </button>
          </div>

          {/* Quick action — right */}
          <button
            onClick={() => navigate(QUICK[1].to)}
            className="flex flex-col items-center justify-center gap-1 py-3 text-[9px] uppercase tracking-[0.28em] text-background/85 hover:text-primary transition-colors text-stamp"
          >
            <Search className="h-5 w-5" strokeWidth={2.25} />
            <span>{QUICK[1].label}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
