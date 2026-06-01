import { describe, expect, it } from "vitest";
import { computeMarketPulse } from "@/lib/value";
import type { DraftEvent, PriceEstimate } from "@/lib/draft-types";

describe("computeMarketPulse", () => {
  it("ignores low-dollar bench churn when calculating multiplier", () => {
    const prices: PriceEstimate[] = [
      { name: "Elite QB", price: 40 },
      { name: "Mid RB", price: 20 },
      { name: "Cheap Bench A", price: 1 },
      { name: "Cheap Bench B", price: 2 },
    ];
    const events: DraftEvent[] = [
      { id: "1", player: "Elite QB", position: "QB", price: 50, drafter: "other", ts: 1 },
      { id: "2", player: "Mid RB", position: "RB", price: 24, drafter: "other", ts: 2 },
      { id: "3", player: "Cheap Bench A", position: "WR", price: 1, drafter: "other", ts: 3 },
      { id: "4", player: "Cheap Bench B", position: "TE", price: 1, drafter: "other", ts: 4 },
    ];

    const pulse = computeMarketPulse(events, prices);
    expect(pulse.sampleSize).toBe(2);
    expect(pulse.multiplier).toBe(1);
    expect(pulse.confident).toBe(false);
  });
});
