// SETTINGS — the workshop dream. Everything sits on a vellum desk.
// Quiet, paper-soft, almost American Psycho stationery.
import EditorialShell from "@/components/EditorialShell";
import { useNavigate } from "react-router-dom";

const ITEMS = [
  { label: "League Setup",     desc: "budget · teams · scoring · slots",   to: "/setup?step=0" },
  { label: "Keepers",          desc: "who is already off the board",       to: "/setup?step=1" },
  { label: "Price Estimates",  desc: "your cheat sheet",                   to: "/setup?step=1" },
  { label: "Sync Settings",    desc: "the live wire to the room",          to: "/espn" },
  { label: "Admin",            desc: "site lock, roles, dev",              to: "/admin" },
];

export default function Settings() {
  const navigate = useNavigate();
  return (
    <EditorialShell activeCategory="Settings">
      <div className="px-5 pt-4 pb-10 max-w-md mx-auto">
        {/* a desk lamp glow at the top */}
        <div className="relative h-32 mb-2">
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-72 h-72 rounded-full pulse-glow"
               style={{ background: "radial-gradient(circle, hsl(38 95% 70% / 0.35), transparent 60%)", filter: "blur(20px)" }} />
          <div className="absolute inset-x-0 bottom-0 text-center">
            <div className="dream-hand text-[10px] tracking-[0.3em] text-foreground/55">configure once</div>
            <div className="dream-display text-3xl text-foreground mt-1">draft for years</div>
          </div>
        </div>

        {/* the desk — psycho card on vellum */}
        <div className="psycho-card relative wobble-slow">
          <div className="dream-hand text-[9px] tracking-[0.4em] text-foreground/50 mb-3">— the workshop —</div>
          <ul className="divide-y divide-foreground/10">
            {ITEMS.map((it, i) => (
              <li key={it.label}>
                <button
                  onClick={() => navigate(it.to)}
                  className="group w-full flex items-baseline justify-between gap-4 py-3 text-left hover:bg-foreground/5 transition-colors px-1 -mx-1 rounded"
                >
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="dream-hand text-[10px] text-foreground/45 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <div className="dream-display text-[17px] text-foreground truncate">{it.label}</div>
                      <div className="dream-hand text-[11px] text-foreground/55 truncate">{it.desc}</div>
                    </div>
                  </div>
                  <span className="dream-hand text-[14px] text-foreground/40 group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex items-center justify-between dream-hand text-[10px] text-foreground/40">
          <span>vetri & co.</span>
          <span>fantasy acquisitions</span>
        </div>
      </div>
    </EditorialShell>
  );
}
