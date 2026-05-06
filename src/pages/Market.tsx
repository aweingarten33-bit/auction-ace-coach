// MARKET / ROOM — surveillance + sports analytics. How is the room behaving?
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, AlertTriangle, Eye, Wallet, ArrowRight } from "lucide-react";
import WarRoomShell from "@/components/WarRoomShell";
import { useDraftStore } from "@/lib/draft-store";
import { computeMarketPulse } from "@/lib/value";
import { recentRuns, spendByPosition } from "@/lib/draft-math";
import { Position } from "@/lib/draft-types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

export default function Market() {
  const navigate = useNavigate();
  const { events, prices, settings } = useDraftStore();
  const pulse = computeMarketPulse(events, prices);
  const runs = recentRuns(events, 8);
  const spend = spendByPosition(events);

  // Per-position pulse
  const posPulse = useMemo(() => {
    return POSITIONS.map((p) => {
      const evs = events.filter((e) => e.position === p);
      let paid = 0, sheet = 0, n = 0;
      for (const e of evs) {
        const ref = prices.find((x) => norm(x.name) === norm(e.player));
        if (!ref || ref.price <= 0) continue;
        paid += e.price; sheet += ref.price; n++;
      }
      const mult = sheet > 0 ? paid / sheet : 1;
      return { pos: p, mult, n, paid };
    });
  }, [events, prices]);

  // Bargains and overpays
  const recent = useMemo(() => {
    return events.slice(-30).reverse().map((e) => {
      const p = prices.find((x) => norm(x.name) === norm(e.player));
      const ref = p?.price ?? null;
      const delta = ref ? e.price - ref : 0;
      return { ...e, ref, delta };
    });
  }, [events, prices]);

  const bargains = recent.filter((r) => r.ref && r.delta < -3).slice(0, 5);
  const overpays = recent.filter((r) => r.ref && r.delta > 4).slice(0, 5);

  // Other managers — naive: how many picks each "other" has (we don't track per-team budget)
  const totalSpentOther = events.filter((e) => e.drafter === "other").reduce((s, e) => s + e.price, 0);
  const avgOtherTeamSpend = settings.numTeams > 1 ? Math.round(totalSpentOther / (settings.numTeams - 1)) : 0;
  const avgOtherRemaining = Math.max(0, settings.totalBudget - avgOtherTeamSpend);

  const headline =
    !pulse.confident ? "The room is still warming up — too few picks to read."
    : pulse.multiplier > 1.12 ? `The room is overpaying by ${Math.round((pulse.multiplier - 1) * 100)}%. Wait for the cool-down.`
    : pulse.multiplier < 0.92 ? `The room is timid. Bargains on the board — go fishing.`
    : `The room is at price. Discipline wins this stretch.`;

  return (
    <WarRoomShell title="The Room" eyebrow="Surveillance · who's spending, who's waiting" activeCategory="Room">
      <div className="px-4 md:px-8 max-w-5xl mx-auto pt-3">

        {/* Headline */}
        <div className="room-card room-card-lift p-5">
          <div className="room-eyebrow">Reading the room</div>
          <div className="room-display text-2xl md:text-3xl mt-1">{headline}</div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <div className="room-eyebrow">Multiplier</div>
              <div className={`room-mono text-2xl ${pulse.multiplier > 1.1 ? "heat-bad" : pulse.multiplier < 0.92 ? "heat-good" : "heat-fair"}`}>
                {(pulse.multiplier * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="room-eyebrow">Picks tracked</div>
              <div className="room-mono text-2xl">{pulse.sampleSize}</div>
            </div>
            <div>
              <div className="room-eyebrow">Confidence</div>
              <div className="room-mono text-2xl">{pulse.confident ? "high" : "low"}</div>
            </div>
          </div>
        </div>

        {/* Per-position heat */}
        <div className="room-card mt-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="room-eyebrow">Position heat</div>
              <div className="room-display text-xl mt-0.5">Where the money is going</div>
            </div>
            <TrendingUp className="h-5 w-5 text-foreground/40" />
          </div>
          <div className="mt-4 space-y-2">
            {posPulse.map((p) => {
              const tone = p.n === 0 ? "text-muted-foreground" :
                           p.mult > 1.1 ? "heat-bad" :
                           p.mult < 0.92 ? "heat-good" : "heat-fair";
              const widthPct = Math.min(100, Math.max(8, p.mult * 60));
              return (
                <div key={p.pos} className="flex items-center gap-3">
                  <div className="w-10 room-mono text-sm">{p.pos}</div>
                  <div className="flex-1 h-2 rounded-full bg-foreground/8 overflow-hidden">
                    <div className="h-full pressure-bar" style={{ width: `${widthPct}%` }} />
                  </div>
                  <div className={`room-mono text-xs ${tone} w-32 text-right`}>
                    {p.n === 0 ? "—" : `${(p.mult * 100).toFixed(0)}% · $${p.paid}`}
                  </div>
                </div>
              );
            })}
          </div>
          {Object.keys(runs.counts).length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Last 8 picks:{" "}
              {Object.entries(runs.counts).map(([k, v]) => `${k}×${v}`).join(" · ")}
            </p>
          )}
        </div>

        {/* Two columns: bargains & overpays */}
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className="room-card p-5">
            <div className="room-eyebrow heat-good flex items-center gap-1.5"><Eye className="h-3 w-3" /> Bargains found</div>
            <div className="room-display text-xl mt-0.5">Value taken</div>
            {bargains.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing under-priced yet.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {bargains.map((b) => (
                  <div key={b.id} className="flex justify-between text-sm">
                    <span className="text-foreground/85">{b.player} <span className="text-[10px] text-muted-foreground room-label">{b.position || ""}</span></span>
                    <span className="room-mono heat-good">${b.price} <span className="text-[10px]">({b.delta})</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="room-card p-5">
            <div className="room-eyebrow heat-bad flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Overpays</div>
            <div className="room-display text-xl mt-0.5">Where it got desperate</div>
            {overpays.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No panic spending yet.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {overpays.map((b) => (
                  <div key={b.id} className="flex justify-between text-sm">
                    <span className="text-foreground/85">{b.player} <span className="text-[10px] text-muted-foreground room-label">{b.position || ""}</span></span>
                    <span className="room-mono heat-bad">${b.price} <span className="text-[10px]">(+{b.delta})</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Other managers' wallets */}
        <div className="room-card mt-4 p-5">
          <div className="room-eyebrow flex items-center gap-1.5"><Wallet className="h-3 w-3" /> The other wallets</div>
          <div className="room-display text-xl mt-0.5">Money still in the room</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="room-eyebrow">Avg spent / opp.</div>
              <div className="room-mono text-2xl">${avgOtherTeamSpend}</div>
            </div>
            <div>
              <div className="room-eyebrow">Avg remaining</div>
              <div className="room-mono text-2xl heat-fair">${avgOtherRemaining}</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Rough average across the {settings.numTeams - 1} other teams. Watch the tape for who's been quiet.
          </p>
          <button onClick={() => navigate("/draft")} className="mt-3 text-xs room-label text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1">
            See the full tape in the live draft <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </WarRoomShell>
  );
}
