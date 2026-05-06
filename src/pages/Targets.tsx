// TARGETS — the constellation dream. Players are stars; you draw lines between them.
import EditorialShell from "@/components/EditorialShell";
import { useNavigate } from "react-router-dom";

const STARS = [
  { label: "Watchlist",     desc: "the starred sky",                       to: "/draft#watchlist", x: 20, y: 18, size: 18 },
  { label: "Up Next",       desc: "the next five to bid on",               to: "/draft#upnext",    x: 70, y: 28, size: 24 },
  { label: "Sleepers",      desc: "dim lights priced below market",        to: "/draft#upnext",    x: 30, y: 52, size: 14 },
  { label: "Tier Targets",  desc: "the brightest in each tier",            to: "/draft#tiers",     x: 78, y: 62, size: 22 },
  { label: "Player Queue",  desc: "your full research line",               to: "/draft#upnext",    x: 45, y: 82, size: 16 },
];

const LINES: [number, number][] = [[0, 1], [1, 3], [0, 2], [2, 4], [3, 4]];

export default function Targets() {
  const navigate = useNavigate();
  return (
    <EditorialShell activeCategory="Targets">
      <div className="relative px-4 pt-4 pb-10 max-w-xl mx-auto">
        <div className="relative h-[78vh] rounded-[2rem] overflow-hidden erase-edge"
             style={{ background: "radial-gradient(ellipse at 50% 30%, hsl(232 50% 22%), hsl(232 60% 6%) 75%)" }}>
          {/* drifting nebulas */}
          <div className="blob drift" style={{ background: "hsl(188 70% 50%)", width: 220, height: 220, top: "10%", left: "10%" }} />
          <div className="blob drift-slow" style={{ background: "hsl(285 70% 55%)", width: 180, height: 180, bottom: "10%", right: "10%" }} />
          <div className="absolute inset-0 grain" />

          {/* constellation lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            {LINES.map(([a, b], i) => {
              const A = STARS[a], B = STARS[b];
              return (
                <line key={i}
                      x1={`${A.x}%`} y1={`${A.y}%`}
                      x2={`${B.x}%`} y2={`${B.y}%`}
                      stroke="hsl(188 80% 70% / 0.35)" strokeWidth="1" strokeDasharray="2 5" />
              );
            })}
          </svg>

          {/* stars */}
          {STARS.map((s, i) => (
            <button key={s.label}
                    onClick={() => navigate(s.to)}
                    className="absolute group"
                    style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%, -50%)" }}>
              {/* halo */}
              <div className="rounded-full halo-cyan pulse-glow"
                   style={{
                     width: s.size * 2.5, height: s.size * 2.5,
                     background: "radial-gradient(circle, hsl(188 80% 70%) 0%, hsl(188 90% 60% / 0.3) 35%, transparent 70%)",
                   }} />
              {/* star core */}
              <div className="absolute top-1/2 left-1/2 rounded-full bg-foreground"
                   style={{ width: s.size / 2.5, height: s.size / 2.5, transform: "translate(-50%, -50%)", boxShadow: "0 0 8px hsl(38 80% 90%)" }} />
              {/* label */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-center">
                <div className="dream-display text-[14px] text-foreground/95 wobble-slow">{s.label}</div>
                <div className="dream-hand text-[10px] text-foreground/55">{s.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center dream-hand text-[11px] text-foreground/55">
          the sky of players you want to leave with
        </p>
      </div>
    </EditorialShell>
  );
}
