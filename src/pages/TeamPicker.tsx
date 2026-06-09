// TeamPicker — front door. No login required. Visitor picks which team they
// identify as so the dossier (budget remaining, roster, slot needs, coach
// recommendations) is personalized to them. Selection is saved locally.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";
import { toast } from "sonner";
import SyncStatusPill from "@/components/SyncStatusPill";

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
      // Ensure visitors have a Supabase session (anonymous is fine) so they can
      // call edge functions. This is a no-op if they're already signed in.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      try {
        const { data, error: invokeErr } = await supabase.functions.invoke("league-teams");
        if (invokeErr) {
          setError(invokeErr.message);
          setLoading(false);
          return;
        }
        const list: Team[] = (data?.teams ?? []).map((t: any) => ({
          id: t.id, name: t.name, abbrev: t.abbrev,
        }));
        setTeams(list);
        if ((data as any)?.empty || list.length === 0) {
          setError("No league synced yet — the commissioner needs to connect ESPN first.");
        }
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
    <div className="min-h-screen bg-background text-foreground">
      <main
        className="mx-auto max-w-md px-5 pt-12 pb-32"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        <div className="mb-8">
          <Trophy className="mb-4 h-10 w-10 text-primary" strokeWidth={1.5} />
          <h1 className="mb-3 text-[34px] leading-[1.05] font-semibold tracking-tight">
            Which team are you?
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pick your team to personalize the dossier — budget remaining, roster needs,
            and AI recommendations get tailored to your specific roster and gaps.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading league teams…
          </div>
        )}

        {error && !loading && (
          <Card className="border-destructive/40 bg-destructive/5 p-4 text-xs text-destructive">
            <p className="mb-1 font-semibold">Couldn't load teams.</p>
            <p className="text-destructive/80">
              {error}. The league commissioner may need to connect ESPN first.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={skip}>
              Continue without picking →
            </Button>
          </Card>
        )}

        {!loading && !error && teams.length > 0 && (
          <>
            <div className="space-y-1.5">
              {teams.map((t) => {
                const isPicked = picked?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPicked(t)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                      isPicked
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-secondary/20 hover:bg-secondary/40"
                    }`}
                  >
                    {t.abbrev && (
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                        {t.abbrev}
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium">{t.name}</span>
                    {isPicked && <ArrowRight className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-2">
              <Button onClick={confirm} disabled={!picked} className="flex-1">
                {picked ? `Continue as ${picked.name}` : "Pick a team"}
              </Button>
              <Button variant="ghost" onClick={skip}>
                Skip
              </Button>
            </div>
          </>
        )}

        {!loading && !error && teams.length === 0 && (
          <Card className="border-warning/40 bg-warning/5 p-4 text-xs">
            <p>No teams found yet. The league admin needs to connect ESPN first.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={skip}>
              Continue anyway →
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
