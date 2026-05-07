// Temporary preview route to render AuctionPlayerCard with mock data for screenshots.
import AuctionPlayerCard from "@/components/AuctionPlayerCard";
import type { DecisionResult } from "@/lib/decision-engine";

const mockDecision: DecisionResult = {
  hasPlayer: true,
  player: "Ja'Marr Chase",
  position: "WR",
  currentPrice: 52,
  goUpTo: 58,
  stopAt: 59,
  anchorPrice: 56,
  anchorSource: "league",
  verdict: "BID",
  oneLiner: "Push to $58 — tier value",
  ladder: [
    { price: 48, label: "GOOD" },
    { price: 56, label: "FAIR" },
    { price: 59, label: "STOP" },
  ],
  buy: {
    price: 58,
    remainingAfter: 155,
    slotsLeftAfter: 11,
    feasible: true,
    consequence: "You'll need cheaper RBs later",
    weakerPositions: ["RB"],
  },
  pass: {
    nextPos: "WR",
    nextPriceMin: 28,
    nextPriceMax: 36,
    nextOption: "Drake London",
    consequence: "You can still get a WR1 in the $28–36 range",
    dropoff: "moderate",
  },
  better: "buy",
  betterReason: "Tier-defining WR locks the ceiling",
  plan: { status: "ok", reason: "Budget holds with room to spare" },
  recovery: { triggered: false, overspendBy: 0, adjustments: [] },
  confidence: "high",
};

export default function CardPreview() {
  return (
    <div className="min-h-screen bg-slate-950 px-2 py-4">
      <div className="mx-auto max-w-[402px]">
        <AuctionPlayerCard d={mockDecision} />
      </div>
    </div>
  );
}
