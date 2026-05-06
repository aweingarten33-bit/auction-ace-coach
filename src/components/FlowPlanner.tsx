import { useState } from "react";

type PositionRow = { label: string; value: number };

interface FlowPlannerProps {
  positions: PositionRow[];
  remaining: number;
}

export default function FlowPlanner({ positions, remaining }: FlowPlannerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FLOW BAR (always visible, above bottom nav) */}
      <div
        onClick={() => setOpen(true)}
        className="fixed bottom-16 md:bottom-12 left-0 right-0 h-12 bg-card border-t border-border flex items-center px-4 text-xs z-40 overflow-x-auto cursor-pointer"
      >
        <div className="flex gap-6 whitespace-nowrap">
          {positions.map((p, i) => (
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
          <div className="fixed bottom-0 left-0 right-0 h-[65%] bg-card text-card-foreground rounded-t-3xl p-6 z-50 border-t border-border shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-medium">Budget</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground text-sm hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="space-y-6">
              {positions.map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{p.label}</span>
                  <span className="text-lg font-semibold font-mono tabular-nums">${p.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-4 border-t border-border flex justify-between">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="text-lg font-semibold font-mono tabular-nums text-primary">${remaining}</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
