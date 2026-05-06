// COACH / BRAIN — your draft brain. Quick prompts that drop you into the
// live coach with the right question pre-loaded. No goofy chat metaphor.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageSquare } from "lucide-react";
import WarRoomShell from "@/components/WarRoomShell";
import { useDraftStore } from "@/lib/draft-store";
import { computeBudget } from "@/lib/draft-math";
import { computeMarketPulse } from "@/lib/value";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const QUESTIONS = [
  { q: "Should I bid?",            sub: "yes / no with a max",                       hash: "?coach=bid" },
  { q: "Who should I nominate?",   sub: "drain the room, not yourself",              hash: "?coach=nominate" },
  { q: "What's my next move?",     sub: "the smartest dollar right now",             hash: "?coach=next" },
  { q: "Am I too thin?",           sub: "where you're at risk",                      hash: "?coach=thin" },
  { q: "Best value left?",         sub: "the single best $ on the board",            hash: "?coach=value" },
  { q: "Compare two players",      sub: "side by side, with a verdict",              hash: "?coach=compare" },
];

export default function Coach() {
  const navigate = useNavigate();
  const { settings, keepers, events, prices, watchlist } = useDraftStore();
  const budget = computeBudget(settings, keepers, events);
  const pulse = computeMarketPulse(events, prices);

  // Auto-generated war-room read — short, like a voice in your ear
  const reads = useMemo(() => {
    const out: { tone: "good" | "warn" | "bad" | "info"; text: string }[] = [];
    if (events.length === 0) {
      out.push({ tone: "info", text: "Room hasn't started. When it does — open the live draft and I'll watch every pick." });
      return out;
    }
    if (pulse.confident && pulse.multiplier > 1.12) {
      out.push({ tone: "bad", text: `Room is ${Math.round((pulse.multiplier-1)*100)}% over price. Wait. Don't be the one to set the next overpay.` });
    } else if (pulse.confident && pulse.multiplier < 0.92) {
      out.push({ tone: "good", text: `Bargains on the board. Push your real targets — the room is leaving money out.` });
    }
    const burn = budget.slotsLeft > 0 ? budget.remaining / budget.slotsLeft : 0;
    if (budget.slotsLeft > 0 && burn < 1.5) {
      out.push({ tone: "bad", text: `$${budget.remaining} for ${budget.slotsLeft} slots. Cap the next bid at $${Math.max(1, Math.round(burn * 2))}.` });
    } else if (burn > 6 && budget.slotsFilled > 5) {
      out.push({ tone: "warn", text: `You're sitting on $${budget.remaining}. Spend it before the tier breaks.` });
    } else if (events.length > 4) {
      out.push({ tone: "info", text: `On plan. $${budget.maxBid} max bid, $${budget.remaining} bank.` });
    }
    const drafted = new Set(events.map((e) => norm(e.player)));
    const liveTargets = watchlist.filter((w) => !drafted.has(norm(w))).length;
    if (watchlist.length === 0) {
      out.push({ tone: "warn", text: "No targets pinned. Star players in the live draft so I can flag dropoffs." });
    } else {
      out.push({ tone: "info", text: `${liveTargets} of your ${watchlist.length} targets still on the board.` });
    }
    return out;
  }, [events, pulse, budget, watchlist]);

  return (
    <WarRoomShell title="The Brain" eyebrow="Your draft analyst — short, useful, in your ear" activeCategory="Brain">
      <div className="px-4 md:px-8 max-w-3xl mx-auto pt-3">

        {/* Live read */}
        <div className="room-card room-card-lift p-5">
          <div className="room-eyebrow">Right now</div>
          <div className="mt-2 space-y-2">
            {reads.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-md ${
                r.tone === "good" ? "bg-good" :
                r.tone === "warn" ? "bg-fair" :
                r.tone === "bad" ? "bg-bad" : "bg-foreground/5 border border-foreground/8"
              }`}>
                <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                  r.tone === "good" ? "bg-[hsl(var(--success))]" :
                  r.tone === "warn" ? "bg-[hsl(var(--warning))]" :
                  r.tone === "bad" ? "bg-[hsl(var(--destructive))]" : "bg-foreground/40"
                }`} />
                <p className="text-sm leading-relaxed text-foreground/90">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ask */}
        <div className="mt-4">
          <div className="room-eyebrow">Ask the brain</div>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {QUESTIONS.map((q) => (
              <button key={q.q} onClick={() => navigate(`/draft${q.hash}`)}
                className="room-card p-4 text-left hover:room-card-lift transition-shadow group">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-[hsl(var(--primary))] mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">{q.q}</div>
                    <div className="text-xs text-muted-foreground room-label mt-0.5">{q.sub}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-foreground/30 group-hover:text-[hsl(var(--primary))] group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground italic">
          Live conversation happens inside the draft room. Tap any question to open it.
        </p>
      </div>
    </WarRoomShell>
  );
}
