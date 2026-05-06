// TARGETS — your dream list. Priority, fallback, and missed memories.
// Pulls from store: watchlist + price sheet + draft events.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Star, AlertTriangle, ShieldCheck, Flame, X, ArrowRight } from "lucide-react";
import WarRoomShell from "@/components/WarRoomShell";
import { useDraftStore } from "@/lib/draft-store";
import { computeBudget } from "@/lib/draft-math";
import { computeMarketPulse } from "@/lib/value";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type Tag = "must-have" | "safe" | "upside" | "danger" | "overpriced";
const TAG_STYLES: Record<Tag, string> = {
  "must-have": "bg-bad",
  safe: "bg-good",
  upside: "bg-fair",
  danger: "bg-warn",
  overpriced: "bg-warn",
};

export default function Targets() {
  const navigate = useNavigate();
  const { watchlist, prices, events, settings, keepers, removeFromWatchlist } = useDraftStore();
  const budget = computeBudget(settings, keepers, events);
  const pulse = computeMarketPulse(events, prices);
  const draftedSet = new Set(events.map((e) => norm(e.player)));

  const live = useMemo(() => {
    return watchlist
      .filter((w) => !draftedSet.has(norm(w)))
      .map((w) => {
        const p = prices.find((x) => norm(x.name) === norm(w));
        const ref = p?.price ?? 0;
        const going = ref > 0 ? Math.max(1, Math.round(ref * pulse.multiplier)) : 0;
        const realistic = going > 0 ? Math.max(1, Math.round(going * 1.05)) : 0;
        // tag heuristics
        let tag: Tag = "upside";
        if (going > 0 && going > budget.maxBid) tag = "overpriced";
        else if (ref >= 30) tag = "must-have";
        else if (ref >= 12) tag = "safe";
        else if (ref > 0 && ref < 5) tag = "danger";
        const affordability =
          realistic === 0 ? "unknown" :
          realistic <= budget.maxBid * 0.5 ? "comfort" :
          realistic <= budget.maxBid ? "stretch" : "out-of-reach";
        return { name: w, pos: p?.position, ref, going, realistic, tag, affordability };
      })
      .sort((a, b) => (b.ref || 0) - (a.ref || 0));
  }, [watchlist, prices, pulse, budget, draftedSet]);

  const missed = useMemo(() => {
    const watchSet = new Set(watchlist.map(norm));
    return events
      .filter((e) => e.drafter === "other" && watchSet.has(norm(e.player)))
      .reverse()
      .map((e) => {
        const p = prices.find((x) => norm(x.name) === norm(e.player));
        return { name: e.player, sold: e.price, ref: p?.price ?? null, pos: e.position };
      });
  }, [watchlist, events, prices]);

  return (
    <WarRoomShell title="Dream List" eyebrow="Players you can't leave without" activeCategory="Targets">
      <div className="px-4 md:px-8 max-w-5xl mx-auto pt-3">

        <div className="grid md:grid-cols-3 gap-3">
          {[
            { eyebrow: "Targets active", value: live.length, sub: "still on the board" },
            { eyebrow: "Must-haves",     value: live.filter((t) => t.tag === "must-have").length, sub: "elite tier" },
            { eyebrow: "Out of reach",   value: live.filter((t) => t.affordability === "out-of-reach").length, sub: "more than your max bid" },
          ].map((s) => (
            <div key={s.eyebrow} className="room-card p-4">
              <div className="room-eyebrow">{s.eyebrow}</div>
              <div className="room-mono text-2xl mt-1">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* live targets */}
        <div className="room-card mt-4 p-2">
          <div className="px-3 pt-2 pb-2 flex items-center justify-between">
            <div>
              <div className="room-eyebrow">On the board</div>
              <div className="room-display text-xl mt-0.5">Live targets</div>
            </div>
          </div>
          {live.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No targets pinned yet. Star players from the live draft to build your list.
              <div className="mt-3">
                <button onClick={() => navigate("/draft")}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-foreground/10 hover:bg-foreground/15">
                  Open live draft <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-foreground/8">
              {live.map((t) => (
                <div key={t.name} className="flex items-center gap-3 px-3 py-3">
                  <div className="w-8 text-center">
                    {t.tag === "must-have" && <Flame className="h-4 w-4 heat-bad mx-auto" />}
                    {t.tag === "safe" && <ShieldCheck className="h-4 w-4 heat-good mx-auto" />}
                    {t.tag === "upside" && <Star className="h-4 w-4 heat-fair mx-auto" />}
                    {(t.tag === "danger" || t.tag === "overpriced") && <AlertTriangle className="h-4 w-4 heat-warn mx-auto" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <div className="text-sm font-medium truncate">{t.name}</div>
                      <div className="room-label text-[10px] text-muted-foreground">{t.pos || "—"}</div>
                    </div>
                    <div className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] room-label uppercase ${TAG_STYLES[t.tag]}`}>
                      {t.tag.replace("-", " ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="room-mono text-xs text-muted-foreground">going</div>
                    <div className="room-mono text-base text-[hsl(var(--primary))]">${t.going || "—"}</div>
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <div className="room-mono text-xs text-muted-foreground">to land</div>
                    <div className={`room-mono text-base ${
                      t.affordability === "comfort" ? "heat-good" :
                      t.affordability === "stretch" ? "heat-fair" :
                      t.affordability === "out-of-reach" ? "heat-bad" : "text-foreground"
                    }`}>${t.realistic || "—"}</div>
                  </div>
                  <button onClick={() => removeFromWatchlist(t.name)} aria-label="Remove"
                    className="p-1.5 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* missed memories */}
        <div className="room-card mt-4 p-5">
          <div className="room-eyebrow">Missed memories</div>
          <div className="room-display text-xl mt-0.5">Where you stopped</div>
          {missed.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No targets gone yet. They'll fade in here when the room takes one.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {missed.map((m) => {
                const ref = m.ref;
                const overbid = ref ? m.sold - ref : 0;
                return (
                  <div key={m.name + m.sold} className="memory-fade flex items-baseline justify-between text-sm">
                    <div>
                      <span className="font-medium text-foreground/85">{m.name}</span>
                      <span className="ml-2 text-[10px] room-label text-muted-foreground">{m.pos || ""}</span>
                    </div>
                    <div className="room-mono text-xs text-foreground/65 italic">
                      {ref ? `you let go at ~$${ref - 1}. Sold $${m.sold}${overbid > 0 ? ` · +$${overbid} over` : ""}.`
                           : `Sold $${m.sold}.`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4 italic">
          tag legend — must-have · safe · upside · danger · overpriced
        </p>
      </div>
    </WarRoomShell>
  );
}
