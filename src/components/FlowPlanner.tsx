import { useEffect, useState } from "react";

type PositionRow = { label: string; value: number };

interface FlowPlannerProps {
  positions: PositionRow[];
  remaining: number;
  budget?: number;
  onReset?: () => void;
  onApplyStrategy?: () => void;
  onChange?: (rows: PositionRow[]) => void;
}

export default function FlowPlanner({
  positions,
  remaining: remainingProp,
  budget,
  onReset,
  onApplyStrategy,
  onChange,
}: FlowPlannerProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PositionRow[]>(positions);

  useEffect(() => {
    setRows(positions);
  }, [positions]);

  const total = rows.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  const remaining = budget != null ? budget - total : remainingProp;

  const updateRow = (i: number, val: number) => {
    const next = rows.map((p, idx) => (idx === i ? { ...p, value: val } : p));
    setRows(next);
    onChange?.(next);
  };

  return (
    <>
      {/* FLOW BAR (always visible, above bottom nav) */}
      <div
        onClick={() => setOpen(true)}
        className="fixed bottom-16 md:bottom-12 left-0 right-0 h-12 bg-card border-t border-border flex items-center px-4 text-xs z-40 overflow-x-auto cursor-pointer"
      >
        <div className="flex gap-6 whitespace-nowrap">
          {rows.map((p, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-medium font-mono tabular-nums text-foreground">${p.value}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-muted-foreground">Left</span>
            <span className="font-medium font-mono tabular-nums text-primary">${remaining}</span>
          </div>
        </div>
      </div>

      {/* EXPANDED SHEET */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <div className="fixed bottom-0 left-0 right-0 h-[80%] bg-background text-foreground rounded-t-3xl z-50 border-t border-border shadow-2xl overflow-y-auto">
            <div className="px-6 py-8">
              {/* HEADER ROW with close */}
              <div className="flex justify-between items-start mb-8">
                {/* SNAPSHOT */}
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Remaining
                  </div>
                  <div className="text-3xl font-semibold mt-1 font-mono tabular-nums">
                    ${remaining}
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground text-sm hover:text-foreground"
                >
                  Close
                </button>
              </div>

              {/* ALLOCATIONS */}
              <div className="space-y-7">
                {rows.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground tracking-wide">
                      {p.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={p.value}
                        onChange={(e) => updateRow(i, Number(e.target.value))}
                        className="w-20 text-right text-xl font-semibold bg-transparent focus:outline-none font-mono tabular-nums"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* SOFT DIVIDER */}
              <div className="mt-12 border-t border-border" />

              {/* CONTROLS */}
              <div className="mt-6 flex items-center justify-between text-sm">
                <button
                  onClick={onReset}
                  className="text-primary hover:opacity-80"
                >
                  Reset allocations
                </button>
                <button
                  onClick={onApplyStrategy}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Apply strategy
                </button>
              </div>

              {/* TOTAL */}
              <div className="mt-6 flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase">
                  Total Allocated
                </span>
                <span className="text-lg font-medium font-mono tabular-nums">
                  ${total}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
