// One-time team picker + strategy chooser. Shown to any visitor whose profile
// doesn't yet have an espn_team_id. Pulls teams from the existing espn-sync
// edge function (which uses the league owner's stored cookies).
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Team { id: number; name: string; abbrev?: string }
type Preset = "balanced" | "stars-scrubs" | "custom";

export default function ClaimTeam() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Team | null>(null);
  const [preset, setPreset] = useState<Preset>("balanced");
  const [custom, setCustom] = useState("");
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      // If they've already claimed, skip the page entirely.
      const { data: prof } = await supabase
        .from("profiles")
        .select("espn_team_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prof?.espn_team_id) {
        setAlreadyClaimed(true);
        return;
      }
      // Pull live league teams from ESPN via the existing sync function.
      const { data, error } = await supabase.functions.invoke("espn-sync");
      const errMsg =
        (data && typeof data === "object" && "error" in data ? (data as any).error : null) ||
        error?.message ||
        null;
      if (errMsg) {
        if (String(errMsg).toLowerCase().includes("no league configured")) {
          toast.message("Connect ESPN to continue.");
          nav("/espn", { replace: true });
          return;
        }
        toast.error("Couldn't load league teams. Ask the league admin to connect ESPN.");
        setLoading(false);
        return;
      }
      const list: Team[] = (data?.teams ?? []).map((t: any) => ({
        id: t.id, name: t.name, abbrev: t.abbrev,
      }));
      setTeams(list);
      setLoading(false);
    })();
  }, [authLoading, user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (alreadyClaimed) return <Navigate to="/draft-room" replace />;

  const submit = async () => {
    if (!picked || !user) return;
    if (preset === "custom" && custom.trim().length < 3) {
      toast.error("Tell us about your strategy first");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        espn_team_id: picked.id,
        espn_team_name: picked.name,
        strategy_preset: preset,
        strategy_custom: preset === "custom" ? custom.trim() : null,
      })
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success(`Welcome, ${picked.name}`);
    nav("/draft-room", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <header className="text-center space-y-2">
          <Trophy className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Claim Your Team</h1>
          <p className="text-sm text-muted-foreground">
            Pick your team — we'll personalize the rest.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading teams…
          </div>
        ) : (
          <>
            <Card className="p-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground px-1">
                Step 1 — Who are you?
              </div>
              <div className="grid gap-2">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setPicked(t)}
                    className={`text-left px-3 py-2 rounded-md border transition ${
                      picked?.id === t.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="font-semibold">{t.name}</div>
                    {t.abbrev && (
                      <div className="text-xs text-muted-foreground">{t.abbrev}</div>
                    )}
                  </button>
                ))}
                {teams.length === 0 && (
                  <div className="text-sm text-muted-foreground p-2">
                    No teams found. Ask league admin to connect ESPN.
                  </div>
                )}
              </div>
            </Card>

            {picked && (
              <Card className="p-3 space-y-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground px-1">
                  Step 2 — Your draft strategy
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "balanced", label: "Balanced" },
                    { id: "stars-scrubs", label: "Stars & Scrubs" },
                    { id: "custom", label: "Custom" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPreset(opt.id as Preset)}
                      className={`px-2 py-2 text-xs font-semibold rounded-md border transition ${
                        preset === opt.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {preset === "custom" && (
                  <Textarea
                    value={custom}
                    onChange={(e) => setCustom(e.target.value.slice(0, 500))}
                    placeholder="e.g. Spend up at WR, punt RB, get a cheap QB late"
                    rows={4}
                  />
                )}
              </Card>
            )}

            <Button
              onClick={submit}
              disabled={!picked || saving}
              className="w-full"
              size="lg"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter Draft Room"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
