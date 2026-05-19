import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";
import { saveTeamsToCache } from "@/lib/teamLogoGenerator";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Team { id: number; name: string; abbrev?: string }

export default function TeamPicker() {
  const nav = useNavigate();
  const { setTeam } = useSelectedTeam();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      try {
        const { data, error: invokeErr } = await supabase.functions.invoke("league-teams");
        const errMsg =
          (data && typeof data === "object" && "error" in data ? (data as any).error : null) ||
          invokeErr?.message || null;
        if (errMsg) {
          setError(typeof errMsg === "string" ? errMsg : "Couldn't load teams.");
          setLoading(false);
          return;
        }
        const list: Team[] = (data?.teams ?? []).map((t: any) => ({
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
  }, []);

  const confirm = () => {
    if (!picked) return;
    setTeam(picked);
    toast.success(`Personalized for ${picked.name}`);
    nav("/draft-room", { replace: true });
  };

  const skip = () => {
    setTeam(null);
    nav("/draft-room", { replace: true });
  };

  return (
    <div
      className="min-h-screen bg-white text-[#1d1d1f]"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 h-12 flex items-center border-b border-black/[0.07] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-4xl px-5 flex items-center justify-between">
          <Link to="/" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
            Back
          </Link>
          <span className="text-[13px] font-medium text-[#1d1d1f]">Ace</span>
          <button
            onClick={skip}
            className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
          >
            Skip
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-24 px-5 mx-auto max-w-md">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#6e6e73] mb-4">
            Step 1
          </p>
          <h1
            className="text-[#1d1d1f] font-bold leading-tight mb-4"
            style={{ fontSize: "clamp(2rem, 8vw, 2.8rem)", letterSpacing: "-0.03em" }}
          >
            Which team
            <br />
            are you?
          </h1>
          <p className="text-[15px] leading-relaxed text-[#6e6e73] font-light">
            Pick your team to personalize budget, roster gaps, and AI recommendations.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-12 text-[14px] text-[#6e6e73]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading league teams…
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl border border-[#d2d2d7] p-6 text-[14px]">
            <p className="font-semibold text-[#1d1d1f] mb-1">Couldn't load teams</p>
            <p className="text-[#6e6e73] mb-4 leading-relaxed">{error}. The league commissioner may need to connect ESPN first.</p>
            <button
              onClick={skip}
              className="text-[13px] font-medium text-[#eb0000] hover:underline"
            >
              Continue without picking →
            </button>
          </div>
        )}

        {/* Team list */}
        {!loading && !error && teams.length > 0 && (
          <div className="space-y-1.5">
            {teams.map((t) => {
              const isPicked = picked?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPicked(t)}
                  className={`w-full flex items-center gap-4 rounded-xl px-5 py-3.5 text-left transition-all ${
                    isPicked
                      ? "bg-[#1d1d1f] text-white"
                      : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebeb]"
                  }`}
                >
                  {t.abbrev && (
                    <span
                      className={`font-mono text-[11px] font-semibold w-8 shrink-0 ${
                        isPicked ? "text-white/50" : "text-[#6e6e73]"
                      }`}
                    >
                      {t.abbrev}
                    </span>
                  )}
                  <span className="flex-1 text-[15px] font-medium">{t.name}</span>
                  {isPicked && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && teams.length === 0 && (
          <div className="rounded-xl border border-[#d2d2d7] p-6 text-[14px]">
            <p className="text-[#1d1d1f] font-semibold mb-1">No teams found</p>
            <p className="text-[#6e6e73] mb-4">The league admin needs to connect ESPN first.</p>
            <button
              onClick={skip}
              className="text-[13px] font-medium text-[#eb0000] hover:underline"
            >
              Continue anyway →
            </button>
          </div>
        )}

        {/* Confirm */}
        {!loading && !error && teams.length > 0 && (
          <div className="mt-6">
            <button
              onClick={confirm}
              disabled={!picked}
              className={`w-full rounded-full py-4 text-[15px] font-semibold transition-all ${
                picked
                  ? "bg-[#1d1d1f] text-white hover:bg-[#2d2d2d]"
                  : "bg-[#f5f5f7] text-[#6e6e73] cursor-not-allowed"
              }`}
            >
              {picked ? `Continue as ${picked.name}` : "Select a team above"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
