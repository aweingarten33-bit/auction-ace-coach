// MARKET — the heat dream. Concentric rings of room temperature.
// Tools arranged as a thermometer climbing up the page.
import EditorialShell from "@/components/EditorialShell";
import { useNavigate } from "react-router-dom";

const READINGS = [
  { label: "Recent Picks",     temp: 92, hue: "rose",  desc: "the last ten breaths the room took",       to: "/draft#log" },
  { label: "Position Runs",    temp: 78, hue: "amber", desc: "a thread tightening around a slot",        to: "/draft#heat" },
  { label: "Market Heat",      temp: 64, hue: "amber", desc: "who is overpaying, who is underpaying",    to: "/draft#heat" },
  { label: "Opponent Budgets", temp: 42, hue: "cyan",  desc: "who still has the money to hurt you",      to: "/draft#opponents" },
  { label: "Spend Trends",     temp: 22, hue: "grass", desc: "the curve of the night",                   to: "/draft#heat" },
];

export default function Market() {
  const navigate = useNavigate();
  return (
    <EditorialShell activeCategory="Market">
      <div className="px-5 pt-4 pb-10 max-w-md mx-auto">
        {/* heat dial */}
        <div className="relative mx-auto w-44 h-44 mb-6 wobble-slow">
          <div className="absolute inset-0 rounded-full halo-rose" style={{ background: "radial-gradient(circle at 50% 40%, hsl(348 80% 60%), hsl(18 80% 50%) 40%, hsl(232 50% 18%) 80%)" }} />
          <div className="absolute inset-3 rounded-full" style={{ background: "radial-gradient(circle at 50% 40%, hsl(38 80% 70% / 0.6), transparent 70%)", filter: "blur(8px)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="dream-display text-5xl text-foreground">76°</div>
            <div className="dream-hand text-[10px] tracking-[0.3em] text-foreground/70 uppercase">room temp</div>
          </div>
        </div>

        {/* thermometer column */}
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[hsl(348_80%_60%)] via-[hsl(18_85%_55%)] to-[hsl(138_60%_50%)] opacity-50" />
          <div className="space-y-4">
            {READINGS.map((r, i) => (
              <button
                key={r.label}
                onClick={() => navigate(r.to)}
                className="group relative w-full text-left pl-12 pr-3 py-3 vellum erase-edge-soft hover:translate-x-1 transition-transform"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {/* mercury bead */}
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full halo-${r.hue} pulse-glow`}
                     style={{ background: `hsl(38 40% 94% / 0.10)` }} />
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="dream-display text-lg text-foreground">{r.label}</div>
                    <div className="dream-hand text-[11px] text-foreground/60">{r.desc}</div>
                  </div>
                  <div className={`dream-display text-xl spot-${r.hue}`}>{r.temp}°</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center dream-hand text-[11px] text-foreground/55">
          what the room is doing right now
        </p>
      </div>
    </EditorialShell>
  );
}
