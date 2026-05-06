// STRATEGY — the chalkboard dream. A field unfolds, plays drawn in chalk.
import EditorialShell from "@/components/EditorialShell";
import { useNavigate } from "react-router-dom";

const PLAYS = [
  { label: "Draft Plan",          desc: "the written attack",            to: "/draft#plan",      x: 18, y: 12, rot: -3 },
  { label: "Team Build",          desc: "the slots fill in",             to: "/draft#roster",    x: 60, y: 22, rot: 2 },
  { label: "Position Needs",      desc: "where you are thin",            to: "/draft#roster",    x: 10, y: 44, rot: -1 },
  { label: "Tier Analysis",       desc: "the cliff before the break",    to: "/draft#tiers",     x: 55, y: 56, rot: -4 },
  { label: "Nomination Strategy", desc: "drain them, land yours",        to: "/draft#nominate",  x: 22, y: 76, rot: 3 },
];

export default function Strategy() {
  const navigate = useNavigate();
  return (
    <EditorialShell activeCategory="Strategy">
      <div className="px-4 pt-2">
        {/* The painted field */}
        <div className="relative mx-auto max-w-xl h-[78vh] rounded-[2rem] field-paint erase-edge overflow-hidden">
          {/* yard lines, drifting */}
          <div className="absolute inset-0 wobble-slow opacity-40">
            {[20, 35, 50, 65, 80].map(y => (
              <div key={y} className="absolute left-6 right-6 h-px bg-foreground/30" style={{ top: `${y}%` }}>
                <span className="absolute -top-2 left-0 dream-hand text-[9px] text-foreground/50">{(50 - Math.abs(y - 50)) | 0}</span>
              </div>
            ))}
          </div>
          {/* hash marks */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="absolute w-1 h-1 bg-foreground/30 rounded-full"
                style={{ left: `${(i * 7) % 100}%`, top: `${(i * 13) % 100}%` }} />
            ))}
          </div>
          {/* chalked plays */}
          {PLAYS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => navigate(p.to)}
              className="absolute group wobble-slow"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `rotate(${p.rot}deg)`, animationDelay: `${i * 0.3}s` }}
            >
              <div className="relative">
                {/* the orb */}
                <div className="w-12 h-12 rounded-full halo-grass flex items-center justify-center backdrop-blur-sm"
                     style={{ background: "hsl(38 40% 94% / 0.10)" }}>
                  <span className="dream-display text-xl text-foreground/90">{i + 1}</span>
                </div>
                {/* chalk-drawn route */}
                <svg className="absolute -top-3 -left-3 pointer-events-none opacity-60" width="120" height="80" viewBox="0 0 120 80">
                  <path d={`M 24 24 Q ${30 + i * 8} ${10 + i * 4} ${60 + i * 5} ${30 + i * 6}`}
                        stroke="hsl(38 40% 94% / 0.5)" strokeWidth="1.2" fill="none" strokeDasharray="3 4" />
                  <circle cx={60 + i * 5} cy={30 + i * 6} r="2" fill="hsl(138 70% 60%)" />
                </svg>
                {/* label */}
                <div className="mt-1 text-left">
                  <div className="dream-display text-[15px] text-foreground leading-tight">{p.label}</div>
                  <div className="dream-hand text-[10px] text-foreground/65">{p.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center dream-hand text-[11px] text-foreground/55 wobble-slow">
          the blueprint — before the bidding heats up
        </p>
      </div>
    </EditorialShell>
  );
}
