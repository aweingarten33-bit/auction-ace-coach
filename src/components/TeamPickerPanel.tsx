// Inline team picker used inside the landing-page slide-in panel.
// Same logic as the standalone TeamPicker page — picks a team, saves it,
// then sends the visitor to the draft room.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trophy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";
import { saveTeamsToCache } from "@/lib/teamLogoGenerator";
import { toast } from "sonner";

interface Team { id: number; name: string; abbrev?: string }

export default function TeamPickerPanel({ active }: { active: boolean }) {
  const nav = useNavigate();
  const { setTeam } = useSelectedTeam();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Only fetch the first time the panel becomes active — keeps the landing
  // page fast and avoids hitting the edge function before the visitor opens it.
  useEffect(() => {
    if (!active || loadedOnce) return;
    setLoadedOnce(true);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke("league-teams");
        const errMsg =
          (data && typeof data === "object" && "error" in data ? (data as { error?: string }).error : null) ||
          invokeErr?.message || null;
        if (errMsg) { setError(typeof errMsg === "string" ? errMsg : "Couldn't load teams."); setLoading(false); return; }
        const list: Team[] = (data?.teams ?? []).map((t: { id: number; name: string; abbrev?: string }) => ({
          id: t.id, name: t.name, abbrev: t.abbrev,
        }));
        setTeams(list);
        saveTeamsToCache(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load teams.");
      } finally {
        setLoading(false);
      }
    })();
  }, [active, loadedOnce]);

  const confirm = (team: Team) => {
    setTeam(team);
    toast.success(`Personalized for ${team.name}`);
    nav("/draft-room");
  };

  return (
    <div className="flex h-full flex-col px-8 pb-10 pt-24 md:px-14">
      <div className="mb-8">
        <Trophy className="mb-4 h-9 w-9 text-red-500" strokeWidth={1.5} />
        <h2 className="font-bebas text-[clamp(2rem,7vw,3.25rem)] uppercase leading-[0.95] tracking-[0.01em] text-white">
          Which team<br />are you?
        </h2>
        <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-white/60">
          Pick your team to personalize the dossier — budget, roster needs, and coach
          recommendations get tailored to you.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading league teams…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200">
          <p className="mb-1 font-semibold">Couldn't load teams.</p>
          <p className="text-red-200/80">
            {error}. The league commissioner may need to connect ESPN first.
          </p>
        </div>
      )}

      {!loading && !error && teams.length > 0 && (
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {teams.map((t) => {
            const isPicked = picked?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setPicked(t); confirm(t); }}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                  isPicked
                    ? "border-red-500 bg-red-500/15"
                    : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]"
                }`}
              >
                {t.abbrev && (
                  <span className="font-mono text-[11px] font-semibold text-white/50">
                    {t.abbrev}
                  </span>
                )}
                <span className="flex-1 text-sm font-medium text-white">{t.name}</span>
                <ArrowRight className={`h-4 w-4 transition ${isPicked ? "text-red-500" : "text-white/30"}`} />
              </button>
            );
          })}
        </div>
      )}

      {!loading && !error && teams.length === 0 && (
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-4 text-xs text-amber-100">
          No teams found yet. The league admin needs to connect ESPN first.
        </div>
      )}
    </div>
  );
}
