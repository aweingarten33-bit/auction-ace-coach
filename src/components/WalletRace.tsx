// WalletRace — live remaining-budget bars for every team in the league.
// Pure SQL aggregate: budget − Σ(price) per drafter_team_name. No predictions.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  totalBudget: number;
  numTeams: number;
}

interface Row {
  team: string;
  spent: number;
  picks: number;
}

export default function WalletRace({ totalBudget, numTeams }: Props) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("live_draft_events")
        .select("drafter_team_name, price, event_type")
        .eq("event_type", "PICK_MADE");
      if (cancelled || !data) return;
      const agg = new Map<string, { spent: number; picks: number }>();
      for (const r of data as Array<{ drafter_team_name: string | null; price: number | null }>) {
        const team = r.drafter_team_name || "—";
        const cur = agg.get(team) ?? { spent: 0, picks: 0 };
        cur.spent += Number(r.price) || 0;
        cur.picks += 1;
        agg.set(team, cur);
      }
      const out: Row[] = Array.from(agg.entries())
        .map(([team, v]) => ({ team, spent: v.spent, picks: v.picks }))
        .sort((a, b) => totalBudget - a.spent - (totalBudget - b.spent));
      setRows(out);
    };
    load();
    const ch = supabase
      .channel("wallet-race")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_draft_events" }, load)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [totalBudget]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Wallet Race
        </h3>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
          Waiting for picks…
        </p>
      </div>
    );
  }

  // Pad to numTeams so everyone shows even before they bid
  const max = totalBudget;
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Wallet Race
        </h3>
        <span className="font-mono text-[9px] text-muted-foreground/60">
          {rows.length}/{numTeams} active
        </span>
      </div>
      <div className="space-y-1">
        {rows.map((r) => {
          const remaining = Math.max(0, totalBudget - r.spent);
          const pct = (remaining / max) * 100;
          const tone =
            pct < 15 ? "bg-destructive" : pct < 35 ? "bg-warning" : "bg-primary";
          return (
            <div key={r.team} className="flex items-center gap-2">
              <span className="w-20 truncate font-mono text-[10px] text-foreground/80">
                {r.team}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-sm bg-border/50">
                <div
                  className={`h-full ${tone} transition-[width] duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-[10px] tabular-nums text-foreground">
                ${remaining}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
