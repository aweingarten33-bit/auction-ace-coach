import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import PositionBudgetBar from "@/components/PositionBudgetBar";
import { useDraftStore } from "@/lib/draft-store";
import { DEFAULT_SETTINGS } from "@/lib/draft-types";

describe("PositionBudgetBar live interactions", () => {
  beforeEach(() => {
    localStorage.clear();
    useDraftStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        totalBudget: 225,
        numTeams: 12,
        scoring: "Half PPR",
        leagueType: "Superflex",
        roster: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 0, SUPERFLEX: 1, K: 1, DST: 1, BENCH: 9 },
      },
      prices: [],
      slotAllocations: {},
      lockedSlots: {},
      slotNotes: {},
      touchedSlots: {},
      plannerStrategy: "balanced-qbs",
    });
  });

  it("every slot starts blank — nothing pre-filled or planned", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB price paid") as HTMLInputElement;
    expect(qb.value).toBe("");
    const rb1 = screen.getByLabelText("RB1 price paid") as HTMLInputElement;
    expect(rb1.value).toBe("");
  });

  it("strategy dropdown is reference-only: picking one changes the guidance text, not the roster", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB price paid") as HTMLInputElement;
    fireEvent.change(qb, { target: { value: "60" } });
    expect(qb.value).toBe("60");

    fireEvent.change(screen.getByLabelText("Strategy reference"), { target: { value: "hero-qb" } });

    expect(screen.getByText(/QB1–4 \+ QB15–20/)).toBeInTheDocument();
    expect(qb.value).toBe("60");
  });

  it("typing the actual price you paid just sets that slot's value", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB price paid") as HTMLInputElement;
    fireEvent.change(qb, { target: { value: "60" } });
    expect(qb.value).toBe("60");

    const rb1 = screen.getByLabelText("RB1 price paid") as HTMLInputElement;
    fireEvent.change(rb1, { target: { value: "40" } });
    expect(rb1.value).toBe("40");
    expect(qb.value).toBe("60");
  });

  it("clamps a single price to the total budget instead of an arbitrary cap", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB price paid") as HTMLInputElement;
    fireEvent.change(qb, { target: { value: "9999" } });
    expect(qb.value).toBe("225");
  });

  it("clearing a price back to blank leaves it blank", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB price paid") as HTMLInputElement;
    fireEvent.change(qb, { target: { value: "60" } });
    expect(qb.value).toBe("60");

    fireEvent.change(qb, { target: { value: "" } });
    expect(qb.value).toBe("");
  });

  it("supports the new v2 strategy options instead of only the legacy four", () => {
    render(<PositionBudgetBar />);

    const dropdown = screen.getByLabelText("Strategy reference");

    fireEvent.change(dropdown, { target: { value: "double-elite-qb" } });
    expect(screen.getByText(/QB1–5 \+ QB4–8/)).toBeInTheDocument();

    fireEvent.change(dropdown, { target: { value: "value-qb" } });
    expect(screen.getByText(/QB11–16 \+ QB17–22/)).toBeInTheDocument();
  });
});
