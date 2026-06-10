import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDraftStore } from "@/lib/draft-store";
import { parsePriceSheet, totalRosterSize } from "@/lib/draft-math";
import { Position } from "@/lib/draft-types";
import { POSITIONS } from "@/lib/positions";
import { Trash2, Plus, ChevronLeft, ChevronRight, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import EspnImportButton from "@/components/EspnImportButton";
import PriceSheetEditor from "@/components/PriceSheetEditor";


const STEPS = ["League & Roster", "Keepers & Prices"];

export default function SetupWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, setSettings, setRoster, keepers, setKeepers, prices, setPrices, completeSetup, setupComplete } =
    useDraftStore();
  const [step, setStep] = useState(() => {
    const s = searchParams.get("step");
    if (!s) return 0;
    const n = parseInt(s, 10);
    if (Number.isFinite(n) && n >= 0 && n < STEPS.length) return n;
    // legacy step slugs all map to the appropriate group
    if (/keeper|price|context/i.test(s)) return 1;
    return 0;
  });

  useEffect(() => {
    const s = searchParams.get("step");
    if (!s) return;
    const n = parseInt(s, 10);
    if (Number.isFinite(n) && n >= 0 && n < STEPS.length) setStep(n);
    else if (/keeper|price|context/i.test(s)) setStep(1);
  }, [searchParams]);

  const [keeperName, setKeeperName] = useState("");
  const [keeperCost, setKeeperCost] = useState("");
  const [keeperPos, setKeeperPos] = useState<Position | "">("");
  const [pricesText, setPricesText] = useState(
    prices.map((p) => `${p.name} - ${p.price}`).join("\n")
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const addKeeper = () => {
    const name = keeperName.trim();
    const cost = parseInt(keeperCost, 10);
    if (!name) return toast.error("Enter a player name");
    if (!Number.isFinite(cost) || cost <= 0) return toast.error("Enter a valid keeper cost");
    setKeepers([
      ...keepers,
      { id: crypto.randomUUID(), player: name, cost, position: keeperPos || undefined },
    ]);
    setKeeperName("");
    setKeeperCost("");
    setKeeperPos("");
  };

  const finish = () => {
    setPrices(parsePriceSheet(pricesText));
    completeSetup();
    navigate("/draft-room");
  };

  const keeperSpend = keepers.reduce((s, k) => s + k.cost, 0);
  const rosterTotal = totalRosterSize(settings.roster);
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050d1c] p-4 text-white md:p-8">
      {/* ambient stadium glow */}
      <div
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[60vh] w-[60vh] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 60%)" }}
      />
      <div
        className="pointer-events-none absolute -right-1/4 -bottom-1/4 h-[60vh] w-[60vh] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 60%)" }}
      />
      {/* corner brackets */}
      <div className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-red-500/60" />
      <div className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-red-500/60" />
      <div className="pointer-events-none absolute left-3 bottom-3 h-5 w-5 border-l-2 border-b-2 border-red-500/60" />
      <div className="pointer-events-none absolute right-3 bottom-3 h-5 w-5 border-r-2 border-b-2 border-red-500/60" />

      <div className="relative mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-600 shadow-[0_0_18px_rgba(239,68,68,0.55)]">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bebas text-xl tracking-wider text-white">Draft Setup</h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">{STEPS[step]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {setupComplete && (
              <Button size="sm" variant="outline" onClick={() => navigate("/draft-room")} className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                Open Draft Room <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </header>


        <Progress value={progress} className="mb-6 h-1.5 bg-white/10" />

        <Card className="border-white/10 bg-white/[0.04] p-5 text-white backdrop-blur-sm md:p-6">
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 text-left mb-2"
          >
            <div>
              <h2 className="text-sm font-semibold text-white">Draft Settings</h2>
              <p className="text-xs text-white/50">{STEPS[step]}</p>
            </div>
            {settingsOpen ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />}
          </button>

          {settingsOpen && (<>
          {step === 0 && (
            <div className="space-y-6">
              <EspnImportButton autoApply />


              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">League Basics</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Budget ($)</Label>
                    <Input
                      type="number"
                      value={settings.totalBudget}
                      onChange={(e) => setSettings({ totalBudget: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Teams</Label>
                    <Input
                      type="number"
                      value={settings.numTeams}
                      onChange={(e) => setSettings({ numTeams: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Scoring</Label>
                    <Select value={settings.scoring} onValueChange={(v) => setSettings({ scoring: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PPR">PPR</SelectItem>
                        <SelectItem value="Half PPR">Half PPR</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>League Type</Label>
                    <Select value={settings.leagueType} onValueChange={(v) => setSettings({ leagueType: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard (1 QB)</SelectItem>
                        <SelectItem value="Superflex">Superflex</SelectItem>
                        <SelectItem value="2QB">2QB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Format</Label>
                  <Select value={settings.format} onValueChange={(v) => setSettings({ format: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Redraft">Redraft</SelectItem>
                      <SelectItem value="Keeper">Keeper</SelectItem>
                      <SelectItem value="Dynasty">Dynasty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Roster Slots</h2>
                  <span className="text-xs text-muted-foreground">
                    Total: <span className="text-primary font-semibold">{rosterTotal}</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["QB", "RB", "WR", "TE", "FLEX", "SUPERFLEX", "K", "DST", "BENCH"] as const).map((k) => (
                    <div key={k} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1">
                      <Label className="text-xs" title={k === "SUPERFLEX" ? "Any position including QB" : undefined}>
                        {k === "SUPERFLEX" ? "SFLEX" : k}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={settings.roster[k]}
                        onChange={(e) => setRoster(k, parseInt(e.target.value) || 0)}
                        className="h-7 w-12 px-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">SFLEX</span> = QB/RB/WR/TE. <span className="font-semibold text-foreground">FLEX</span> = RB/WR/TE.
                </p>
              </section>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Keepers</h2>
                  <span className="text-xs text-muted-foreground">
                    Budget left: <span className="text-primary font-semibold">${settings.totalBudget - keeperSpend}</span>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Once ESPN is connected, your keepers will be pulled in automatically — you won't need to enter them by hand.
                </p>
                <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2">
                  <PlayerAutocomplete
                    value={keeperName}
                    onChange={setKeeperName}
                    onSelect={(p) => {
                      if (p.position && POSITIONS.includes(p.position as Position)) {
                        setKeeperPos(p.position as Position);
                      }
                    }}
                    onEnter={addKeeper}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="$"
                    value={keeperCost}
                    onChange={(e) => setKeeperCost(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeeper()}
                  />
                  <Select value={keeperPos} onValueChange={(v) => setKeeperPos(v as Position)}>
                    <SelectTrigger><SelectValue placeholder="Pos" /></SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addKeeper} size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
                {keepers.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {keepers.map((k) => (
                      <div key={k.id} className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5">
                        <div className="text-sm">
                          <span className="font-medium">{k.player}</span>
                          {k.position && <span className="ml-2 text-xs text-muted-foreground">{k.position}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">${k.cost}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setKeepers(keepers.filter((x) => x.id !== k.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <PriceSheetEditor
                  prices={prices}
                  setPrices={setPrices}
                  pricesText={pricesText}
                  setPricesText={setPricesText}
                />
              </section>

            </div>
          )}


          <div className="mt-6 flex justify-between gap-3">
            <Button variant="outline" onClick={back} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={finish}>
                Start Draft <Trophy className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
          </>)}
        </Card>
      </div>
    </div>
  );
}
