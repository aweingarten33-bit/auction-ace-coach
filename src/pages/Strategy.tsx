// STRATEGY — pick one, write your own, or skip it entirely.
// Every recommendation downstream listens to this choice.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, Pencil, X } from "lucide-react";
import WarRoomShell from "@/components/WarRoomShell";
import { useDraftStore } from "@/lib/draft-store";
import { STRATEGIES, getStrategy } from "@/lib/strategies";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Strategy() {
  const navigate = useNavigate();
  const { strategyId, setStrategyId, settings, setSettings } = useDraftStore();
  const current = getStrategy(strategyId);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(settings.context || "");

  const saveNotes = () => {
    setSettings({ context: notesDraft });
    setEditingNotes(false);
    toast.success("Strategy notes saved");
  };

  return (
    <WarRoomShell
      title="The Plan"
      eyebrow="Choose a build, write your own, or stay flexible"
      activeCategory="Strategy"
    >
      <div className="px-4 md:px-8 max-w-4xl mx-auto pt-3 space-y-4">

        {/* Current pick — banner */}
        <div className="room-card room-card-lift p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-10 w-56 h-56 rounded-full opacity-25 blur-3xl"
               style={{ background: "radial-gradient(circle, hsl(38 95% 60%), transparent 70%)" }} />
          <div className="room-eyebrow">Currently running</div>
          <div className="flex items-baseline gap-3 mt-1">
            <h2 className="room-display text-2xl md:text-3xl">{current.label}</h2>
            {strategyId !== "none" && (
              <button onClick={() => { setStrategyId("none"); toast("Switched to no fixed strategy"); }}
                className="text-xs room-label text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => navigate("/draft")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-[hsl(var(--primary-foreground))]"
              style={{ background: "linear-gradient(160deg, hsl(38 95% 60%), hsl(16 88% 56%))" }}>
              Take it to the draft <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setEditingNotes(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-foreground/15 text-foreground hover:bg-foreground/5">
              <Pencil className="h-4 w-4" /> {settings.context ? "Edit your notes" : "Add your own notes"}
            </button>
          </div>
        </div>

        {/* Free-form notes — for users who don't want a preset */}
        <div className="room-card p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="room-eyebrow">Your own words</div>
              <div className="room-display text-xl mt-0.5">How you want to draft</div>
            </div>
            {!editingNotes && settings.context && (
              <button onClick={() => { setNotesDraft(settings.context); setEditingNotes(true); }}
                className="text-xs room-label text-[hsl(var(--primary))] hover:underline">Edit</button>
            )}
          </div>
          {editingNotes ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={6}
                placeholder={"e.g. Don't want a strict plan. Stay flexible. Pay up for elite WRs if they fall, fade rookies, never end up with one QB. Frank always overpays for QBs early — let him."}
                className="text-sm"
              />
              <div className="flex gap-2">
                <button onClick={saveNotes}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                  Save notes
                </button>
                <button onClick={() => { setEditingNotes(false); setNotesDraft(settings.context || ""); }}
                  className="px-3 py-1.5 rounded-md text-xs font-medium border border-foreground/15 hover:bg-foreground/5">
                  Cancel
                </button>
              </div>
            </div>
          ) : settings.context ? (
            <p className="mt-2 text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap italic">"{settings.context}"</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No notes yet. Some teams don't want a preset — just describe how you want to draft and the brain will respect it.
            </p>
          )}
        </div>

        {/* Strategy chooser */}
        <div>
          <div className="room-eyebrow">Pick a build</div>
          <div className="room-display text-xl mt-0.5 mb-3">Or stick with no fixed plan</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {STRATEGIES.map((s) => {
              const active = s.id === strategyId;
              return (
                <button
                  key={s.id}
                  onClick={() => { setStrategyId(s.id); toast.success(`Strategy: ${s.label}`); }}
                  className={`text-left room-card p-4 transition-all ${active ? "room-card-lift ring-1 ring-[hsl(var(--primary))]" : "hover:bg-foreground/5"}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      active ? "bg-[hsl(var(--primary))]" : "border border-foreground/25"
                    }`}>
                      {active && <Check className="h-3 w-3 text-[hsl(var(--primary-foreground))]" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground">{s.label}</div>
                      <div className="text-xs text-muted-foreground room-label mt-0.5">{s.short}</div>
                      <p className="text-xs text-foreground/70 mt-2 leading-relaxed line-clamp-3">{s.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground italic pt-2">
          The brain reads this on every recommendation. Change it any time — even mid-draft.
        </p>
      </div>
    </WarRoomShell>
  );
}
