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

const DEFAULT_SLOTS: [string, number][] = [
  ["QB", 52], ["RB1", 32], ["RB2", 21], ["WR1", 30], ["WR2", 21],
  ["WR3", 14], ["TE", 12], ["SF", 32], ["K", 1], ["DST", 1],
  ["Bench1", 1], ["Bench2", 1], ["Bench3", 1], ["Bench4", 1],
  ["Bench5", 1], ["Bench6", 1], ["Bench7", 1], ["Bench8", 1], ["Bench9", 1],
];

export default function FlowPlanner({
  positions,
  remaining: remainingProp,
  budget = 225,
  onReset,
}: FlowPlannerProps) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<[string, number][]>(DEFAULT_SLOTS);

  const total = slots.reduce((s, p) => s + (Number(p[1]) || 0), 0);
  const planRemaining = budget - total;
  const maxBid = Math.max(0, budget - (slots.length - 1));

  const updateSlot = (i: number, val: number) => {
    setSlots((prev) => prev.map((p, idx) => (idx === i ? [p[0], val] : p)));
  };

  const reset = () => {
    setSlots(DEFAULT_SLOTS);
    onReset?.();
  };

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
            <span className="font-medium font-mono tabular-nums text-primary">${remainingProp}</span>
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
          <div className="fixed bottom-0 left-0 right-0 h-[90%] bg-[#0b1f3a] text-white rounded-t-3xl z-50 shadow-2xl overflow-y-auto">
            <div className="px-4 pb-20">
              {/* HEADER */}
              <div className="py-4 border-b border-white/10 flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold">Budget Planner</div>
                  <div className="text-xs text-gray-400">
                    Setup · Allocate · Check · Find
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 text-sm hover:text-white"
                >
                  Close
                </button>
              </div>

              {/* TOP SUMMARY */}
              <div className="mt-4 p-4 rounded-xl bg-[#081a30] space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Bank</span>
                  <span>Max bid</span>
                  <span>Slots</span>
                </div>
                <div className="flex justify-between text-lg font-semibold font-mono tabular-nums">
                  <span>${budget}</span>
                  <span>${maxBid}</span>
                  <span>{slots.length}</span>
                </div>
                <div className="text-green-400 text-sm mt-2">
                  Plan total ${total} / ${budget}
                </div>
              </div>

              {/* STRATEGY */}
              <div className="mt-4 p-4 rounded-xl bg-[#081a30] flex justify-between items-center">
                <span className="text-sm">Draft strategy</span>
                <span className="text-xs text-yellow-400">
                  No strategy (default)
                </span>
              </div>

              {/* PRIMARY — ALLOCATIONS */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-medium">$ per roster slot</div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <button onClick={reset} className="hover:text-white">Reset</button>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-4">
                  Edit any slot to plan how you'll spend your ${budget}.
                </div>

                <div className="space-y-3">
                  {slots.map(([label, val], i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center px-2 py-1"
                    >
                      <span className="text-sm text-gray-400">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => updateSlot(i, Number(e.target.value))}
                          className="w-16 text-right text-lg font-semibold bg-[#102a4d] rounded px-2 py-1 focus:outline-none font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECONDARY — AFFORD TOOL */}
              <div className="mt-10 p-4 rounded-xl bg-[#081a30]/60">
                <div className="text-sm font-medium mb-1">
                  Can I afford X + Y + Z?
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Add up to 3 players and check instantly.
                </div>
                <div className="space-y-2">
                  <input className="w-full px-3 py-2 rounded bg-[#102a4d] text-sm focus:outline-none" placeholder="Player 1" />
                  <input className="w-full px-3 py-2 rounded bg-[#102a4d] text-sm focus:outline-none" placeholder="+ Player 2" />
                  <input className="w-full px-3 py-2 rounded bg-[#102a4d] text-sm focus:outline-none" placeholder="+ Player 3" />
                </div>
              </div>

              {/* TERTIARY — VALUE TOOL */}
              <div className="mt-6 flex items-center gap-3 text-sm text-gray-300 flex-wrap">
                <span>$</span>
                <input
                  className="w-16 px-2 py-1 rounded bg-[#102a4d] text-center focus:outline-none"
                  defaultValue={28}
                />
                <span className="text-gray-500">at</span>
                <div className="flex gap-2 flex-wrap">
                  {["ANY", "QB", "RB", "WR", "TE"].map((p) => (
                    <button
                      key={p}
                      className="px-2 py-1 rounded bg-[#1e3a5f] text-xs hover:bg-[#264a78]"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* FOOTER REMAINING */}
              <div className="mt-10 pt-4 border-t border-white/10 flex justify-between text-sm">
                <span className="text-gray-400">Remaining</span>
                <span className="font-semibold text-lg font-mono tabular-nums">
                  ${planRemaining}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
