import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Calculator, Search, Bot, Star, Home, Settings as SettingsIcon, Target, TrendingUp, Compass, X } from "lucide-react";

interface Props {
  children: ReactNode;
  masthead?: string;
  activeCategory?: string;
}

const SECTIONS = [
  { label: "Home",     to: "/",          Icon: Home,         hue: "amber" },
  { label: "Strategy", to: "/strategy",  Icon: Compass,      hue: "grass" },
  { label: "Market",   to: "/market",    Icon: TrendingUp,   hue: "rose" },
  { label: "Targets",  to: "/targets",   Icon: Target,       hue: "cyan" },
  { label: "Coach",    to: "/coach",     Icon: Bot,          hue: "amber" },
  { label: "Settings", to: "/settings",  Icon: SettingsIcon, hue: "grass" },
];

export default function EditorialShell({
  children,
  activeCategory,
}: Props) {
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (to: string, label: string) => {
    if (activeCategory) return activeCategory === label;
    if (to === "/") return loc.pathname === "/" || loc.pathname === "/index";
    return loc.pathname.startsWith(to);
  };

  // radial geometry for the dream-orb menu
  const radius = 130;
  const startAngle = -170;
  const endAngle = -10;
  const step = (endAngle - startAngle) / (SECTIONS.length - 1);

  return (
    <div className="relative min-h-screen text-foreground antialiased dream-sky overflow-x-hidden">
      {/* Drifting paint blobs (the canvas breathes) */}
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="blob drift" style={{ background: "hsl(138 70% 45%)", width: 380, height: 380, top: "10%", left: "-10%" }} />
        <div className="blob drift-slow" style={{ background: "hsl(18 85% 55%)", width: 320, height: 320, top: "55%", right: "-12%" }} />
        <div className="blob drift" style={{ background: "hsl(348 75% 55%)", width: 260, height: 260, bottom: "-8%", left: "20%", animationDelay: "3s" }} />
        <div className="blob drift-slow" style={{ background: "hsl(188 80% 50%)", width: 200, height: 200, top: "30%", left: "55%", animationDelay: "5s" }} />
      </div>
      <div className="pointer-events-none fixed inset-0 grain -z-0" />
      <div className="pointer-events-none fixed inset-0 vignette -z-0" />

      {/* Quiet signature — no masthead */}
      <div className="relative z-10 px-5 pt-5 flex items-center justify-between">
        <span className="dream-hand text-[11px] tracking-[0.3em] text-foreground/55 wobble-slow">
          {activeCategory || "the field"}
        </span>
        <span className="dream-hand text-[10px] tracking-[0.32em] text-foreground/40">
          a dream of football · vol. {new Date().getFullYear()}
        </span>
      </div>

      <main className="relative z-10 flex-1 pb-32">{children}</main>

      {/* Dream-orb radial menu */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 transition-opacity duration-500 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{
          background: "radial-gradient(circle at 50% 100%, hsl(38 80% 55% / 0.20) 0%, hsl(232 60% 4% / 0.85) 60%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />

      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div className="relative max-w-md mx-auto h-0">
          {SECTIONS.map((s, i) => {
            const angle = (startAngle + step * i) * (Math.PI / 180);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const active = isActive(s.to, s.label);
            const Icon = s.Icon;
            const haloClass = `halo-${s.hue}`;
            return (
              <button
                key={s.label}
                onClick={() => { setOpen(false); navigate(s.to); }}
                tabIndex={open ? 0 : -1}
                aria-label={s.label}
                className={`absolute left-1/2 bottom-12 pointer-events-auto transition-all duration-500 ease-out ${
                  open ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                style={{
                  transform: open
                    ? `translate(calc(-50% + ${x}px), ${y}px)`
                    : "translate(-50%, 20px)",
                  transitionDelay: open ? `${i * 50}ms` : "0ms",
                }}
              >
                <div className="flex flex-col items-center gap-2 wobble-slow">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${haloClass} ${
                      active ? "bg-foreground/15 scale-110" : "bg-foreground/8 hover:bg-foreground/15 hover:scale-110"
                    }`}
                    style={{ background: "hsl(38 40% 94% / 0.10)" }}
                  >
                    <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
                  </div>
                  <span className="dream-hand text-[10px] tracking-[0.25em] text-foreground/85 lowercase">
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* The summon — single floating dream-orb */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setOpen(v => !v)}
          aria-label={open ? "close" : "summon"}
          aria-expanded={open}
          className="relative w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105 wobble-slow"
          style={{
            background: "radial-gradient(circle at 35% 30%, hsl(38 95% 80%), hsl(18 85% 55%) 55%, hsl(348 60% 30%) 100%)",
            boxShadow:
              "0 0 0 1px hsl(38 40% 94% / 0.20), 0 0 40px hsl(18 90% 55% / 0.65), 0 0 90px hsl(348 70% 50% / 0.45), 0 18px 40px -10px hsl(232 60% 4% / 0.7)",
          }}
        >
          {open
            ? <X className="h-6 w-6 text-foreground/90" strokeWidth={1.5} />
            : <span className="dream-hand text-[11px] tracking-[0.25em] text-foreground/80 lowercase">drift</span>}
        </button>
      </div>

      {/* Faint quick-actions, top-right (planner / scout / watch / coach) */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-1">
        {[
          { Icon: Calculator, to: "/", label: "math" },
          { Icon: Search, to: "/draft#upnext", label: "scout" },
          { Icon: Star, to: "/draft#watchlist", label: "watch" },
          { Icon: Bot, to: "/draft?coach=open", label: "coach" },
        ].map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            aria-label={a.label}
            className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md bg-foreground/5 hover:bg-foreground/12 transition-colors"
          >
            <a.Icon className="h-4 w-4 text-foreground/70" strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}
