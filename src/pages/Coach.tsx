// COACH — the conversation dream. A figure in dusk waits with answers.
// No grid, no list. A speaker, a halo, four whispers underneath.
import EditorialShell from "@/components/EditorialShell";
import { useNavigate } from "react-router-dom";

const WHISPERS = [
  { label: "ask anything",          desc: "free-form conversation",                  to: "/draft?coach=open" },
  { label: "should i bid?",         desc: "yes or no, with the why",                 to: "/draft?coach=bid" },
  { label: "who should i nominate?",desc: "the right name to throw out",             to: "/draft?coach=nominate" },
  { label: "what's my next move?",  desc: "where the night is asking you to go",     to: "/draft?coach=next" },
];

export default function Coach() {
  const navigate = useNavigate();
  return (
    <EditorialShell activeCategory="Coach">
      <div className="px-5 pt-2 pb-10 max-w-md mx-auto flex flex-col items-center">
        {/* the figure — a glowing presence */}
        <div className="relative mt-6 mb-8 wobble-slow">
          <div className="w-44 h-44 rounded-full halo-amber" style={{
            background: "radial-gradient(circle at 50% 40%, hsl(38 95% 75%) 0%, hsl(18 90% 55%) 40%, hsl(348 60% 30%) 90%)",
          }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="dream-display text-foreground text-2xl text-center leading-none drop-shadow-lg">
              the<br/>coach
            </div>
          </div>
          {/* breathing inner ring */}
          <div className="absolute inset-4 rounded-full border border-foreground/30 pulse-glow" />
        </div>

        <p className="dream-hand text-center text-[12px] text-foreground/70 mb-8 max-w-xs leading-relaxed">
          ask anything. a call comes back in seconds.
          <br/>
          <span className="text-foreground/45">— a voice in the room you can trust</span>
        </p>

        {/* whispers — four soft ovals */}
        <div className="w-full space-y-3">
          {WHISPERS.map((w, i) => (
            <button
              key={w.label}
              onClick={() => navigate(w.to)}
              className="group relative w-full vellum erase-edge-soft px-5 py-4 text-left hover:translate-x-1 transition-transform overflow-hidden"
              style={{ animationDelay: `${i * 0.25}s` }}
            >
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[hsl(38_95%_70%)] halo-amber pulse-glow" />
              <div className="dream-display text-[18px] text-foreground lowercase">{w.label}</div>
              <div className="dream-hand text-[11px] text-foreground/60">{w.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </EditorialShell>
  );
}
