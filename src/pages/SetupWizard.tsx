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
import { parsePlayerLine, parsePriceSheet, totalRosterSize } from "@/lib/draft-math";
import { Position } from "@/lib/draft-types";
import { POSITIONS } from "@/lib/positions";
import { Trash2, Plus, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { toast } from "sonner";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import EspnImportButton from "@/components/EspnImportButton";
import PriceSheetEditor from "@/components/PriceSheetEditor";

const STEPS = [
  "League Basics",
  "Roster",
  "Keepers",
  "Player Prices",
  "League Context",
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, setSettings, setRoster, keepers, setKeepers, prices, setPrices, completeSetup } =
    useDraftStore();
  const [step, setStep] = useState(() => {
    const s = searchParams.get("step");
    if (!s) return 0;
    const idx = STEPS.findIndex((label) => label.toLowerCase().replace(/\s+/g, "-") === s.toLowerCase());
    if (idx >= 0) return idx;
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 && n < STEPS.length ? n : 0;
  });

  useEffect(() => {
    const s = searchParams.get("step");
    if (!s) return;
    const idx = STEPS.findIndex((label) => label.toLowerCase().replace(/\s+/g, "-") === s.toLowerCase());
    const n = idx >= 0 ? idx : parseInt(s, 10);
    if (Number.isFinite(n) && n >= 0 && n < STEPS.length) setStep(n);
  }, [searchParams]);
  const [keeperName, setKeeperName] = useState("");
  const [keeperCost, setKeeperCost] = useState("");
  const [keeperPos, setKeeperPos] = useState<Position | "">("");
  const [pricesText, setPricesText] = useState(
    prices.map((p) => `${p.name} - ${p.price}`).join("\n")
  );

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const addKeeper = () => {
    const name = keeperName.trim();
    const cost = parseInt(keeperCost, 10);
    if (!name) {
      toast.error("Enter a player name");
      return;
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      toast.error("Enter a valid keeper cost");
      return;
    }
    setKeepers([
      ...keepers,
      {
        id: crypto.randomUUID(),
        player: name,
        cost,
        position: keeperPos || undefined,
      },
    ]);
    setKeeperName("");
    setKeeperCost("");
    setKeeperPos("");
  };

  const finish = () => {
    setPrices(parsePriceSheet(pricesText));
    completeSetup();
    navigate("/draft");
  };

  const keeperSpend = keepers.reduce((s, k) => s + k.cost, 0);
  const rosterTotal = totalRosterSize(settings.roster);
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Auction Draft AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Setup · Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
          </div>
        </header>

        <Progress value={progress} className="mb-6 h-1.5" />

        <Card className="bg-gradient-card p-5 md:p-6">
          {step === 0 && (
            <div className="space-y-4">
              <EspnImportButton />
              <div>
                <Label>Total Budget ($)</Label>
                <Input
                  type="number"
                  value={settings.totalBudget}
                  onChange={(e) => setSettings({ totalBudget: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Number of Teams</Label>
                <Input
                  type="number"
                  value={settings.numTeams}
                  onChange={(e) => setSettings({ numTeams: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Scoring</Label>
                <Select
                  value={settings.scoring}
                  onValueChange={(v) => setSettings({ scoring: v as any })}
                >
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
                <Select
                  value={settings.leagueType}
                  onValueChange={(v) => setSettings({ leagueType: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard (1 QB)</SelectItem>
                    <SelectItem value="Superflex">Superflex</SelectItem>
                    <SelectItem value="2QB">2QB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>League Format</Label>
                <Select
                  value={settings.format}
                  onValueChange={(v) => setSettings({ format: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Redraft">Redraft</SelectItem>
                    <SelectItem value="Keeper">Keeper</SelectItem>
                    <SelectItem value="Dynasty">Dynasty</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dynasty/Keeper shifts the assistant toward youth, long-term value, and contract awareness.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Total roster size: <span className="text-primary font-semibold">{rosterTotal}</span>
              </p>
              {(["QB", "RB", "WR", "TE", "FLEX", "SUPERFLEX", "K", "DST", "BENCH"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <Label className="w-28">{k}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.roster[k]}
                    onChange={(e) => setRoster(k, parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm">
                Budget after keepers:{" "}
                <span className="font-bold text-primary">${settings.totalBudget - keeperSpend}</span>{" "}
                <span className="text-muted-foreground">(${keeperSpend} spent on {keepers.length} keepers)</span>
              </p>
              <div className="grid grid-cols-[1fr_90px_80px_auto] gap-2">
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
                  placeholder="Cost $"
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
              <div className="space-y-2 max-h-64 overflow-auto">
                {keepers.map((k) => (
                  <div key={k.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
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
                {!keepers.length && (
                  <p className="text-xs text-muted-foreground text-center py-4">No keepers added.</p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <PriceSheetEditor
              prices={prices}
              setPrices={setPrices}
              pricesText={pricesText}
              setPricesText={setPricesText}
            />
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Label>League Context</Label>
              <p className="text-xs text-muted-foreground">
                Anything the assistant should know — owner tendencies, who overspends on QBs, positional run patterns, etc.
              </p>
              <Textarea
                rows={10}
                placeholder="e.g. Veteran league, owners overpay for elite QBs in superflex. Frank always nominates kickers early to drain budgets. Recent trend toward zero-RB builds."
                value={settings.context}
                onChange={(e) => setSettings({ context: e.target.value })}
              />
            </div>
          )}

          <div className="mt-6 flex justify-between gap-3">
            <Button variant="outline" onClick={back} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next} className="bg-gradient-primary text-primary-foreground">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={finish} className="bg-gradient-primary text-primary-foreground shadow-glow">
                Start Draft <Trophy className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
