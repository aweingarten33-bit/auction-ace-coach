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

  it("switches presets immediately and lets a typed preset amount stay fixed", () => {
    render(<PositionBudgetBar />);

    const qb1 = screen.getByLabelText("QB1 planned allocation") as HTMLInputElement;
    const balancedValue = Number(qb1.value);

    fireEvent.click(screen.getByRole("button", { name: "Hero QB" }));
    const heroValue = Number(qb1.value);
    expect(heroValue).not.toBe(balancedValue);

    fireEvent.change(qb1, { target: { value: "70" } });
    expect(qb1.value).toBe("70");
    expect(screen.getByText("Planned total: $225")).toBeInTheDocument();
  });

  it("locks actual spend and recalculates the real bank", () => {
    render(<PositionBudgetBar />);

    const qb1 = screen.getByLabelText("QB1 planned allocation") as HTMLInputElement;
    fireEvent.change(qb1, { target: { value: "74" } });
    expect(qb1.value).toBe("74");

    fireEvent.click(screen.getByRole("button", { name: "Mark QB1 drafted at $74" }));

    expect(screen.getByText("$74")).toBeInTheDocument();
    expect(screen.getByText("$151")).toBeInTheDocument();
    expect(screen.getByLabelText("QB1 actual spend")).toBeDisabled();
    expect(screen.getByText("Planned total: $225")).toBeInTheDocument();
  });

  it("supports the new v2 strategy buttons instead of only the legacy four", () => {
    render(<PositionBudgetBar />);

    fireEvent.click(screen.getByRole("button", { name: "Double Elite" }));
    expect(screen.getByText(/QB1–5 \+ QB4–8/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Value QB" }));
    expect(screen.getByText(/QB11–16 \+ QB17–22/)).toBeInTheDocument();
  });
});
