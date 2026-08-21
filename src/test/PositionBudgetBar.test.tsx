import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import PositionBudgetBar from "@/components/PositionBudgetBar";
import { useDraftStore } from "@/lib/draft-store";
import { DEFAULT_SETTINGS } from "@/lib/draft-types";

function sumOfDisplayedAllocations() {
  const inputs = document.querySelectorAll<HTMLInputElement>(
    'input[aria-label$="planned allocation"], input[aria-label$="actual spend"]',
  );
  return Array.from(inputs).reduce((sum, el) => sum + Number(el.value || 0), 0);
}

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

  it("seeds a starting plan on first load instead of showing a blank board", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB planned allocation") as HTMLInputElement;
    expect(Number(qb.value)).toBeGreaterThan(0);
    expect(sumOfDisplayedAllocations()).toBe(225);
  });

  it("strategy cards are reference-only: picking one changes the guidance text, not the board", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB planned allocation") as HTMLInputElement;
    const before = qb.value;

    fireEvent.click(screen.getByRole("button", { name: "Hero QB" }));

    expect(screen.getByText(/QB1–4 \+ QB15–20/)).toBeInTheDocument();
    expect(qb.value).toBe(before);
  });

  it("typing a $ amount edits just that slot, with no other rebalancing", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB planned allocation") as HTMLInputElement;
    const originalQb = Number(qb.value);
    fireEvent.change(qb, { target: { value: "70" } });
    expect(qb.value).toBe("70");
    // A plain edit only changes this one number — total shifts by the delta,
    // it isn't silently redistributed like a budget change or a locked
    // correction would.
    expect(sumOfDisplayedAllocations()).toBe(225 - originalQb + 70);
  });

  it('"Load these numbers into my plan" writes the selected strategy into the board', () => {
    render(<PositionBudgetBar />);

    fireEvent.click(screen.getByRole("button", { name: "Double Elite" }));
    const qb = screen.getByLabelText("QB planned allocation") as HTMLInputElement;
    const beforeLoad = qb.value;

    fireEvent.click(screen.getByRole("button", { name: /Load these numbers into my plan/i }));

    expect(qb.value).not.toBe(beforeLoad);
    expect(sumOfDisplayedAllocations()).toBe(225);
  });

  it("locks actual spend and recalculates the real bank, and stays editable afterward", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB planned allocation") as HTMLInputElement;
    fireEvent.change(qb, { target: { value: "74" } });
    expect(qb.value).toBe("74");

    fireEvent.click(screen.getByRole("button", { name: "Lock QB at $74" }));

    expect(screen.getByText("$74")).toBeInTheDocument();
    expect(screen.getByText("$151")).toBeInTheDocument();
    expect(sumOfDisplayedAllocations()).toBe(225);

    // Locking no longer freezes the box — the actual price can be corrected
    // without unlocking first, and the plan rescales around the correction.
    const actual = screen.getByLabelText("QB actual spend") as HTMLInputElement;
    expect(actual).not.toBeDisabled();
    fireEvent.change(actual, { target: { value: "80" } });
    expect(actual.value).toBe("80");
    expect(screen.getByText("$80")).toBeInTheDocument();
    expect(screen.getByText("$145")).toBeInTheDocument();
    expect(sumOfDisplayedAllocations()).toBe(225);
  });

  it("rescales the whole plan when the total budget changes", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB planned allocation") as HTMLInputElement;
    const before = Number(qb.value);
    expect(before).toBeGreaterThan(0);

    act(() => {
      useDraftStore.getState().setSettings({ totalBudget: 300 });
    });

    expect(Number(qb.value)).not.toBe(before);
    expect(sumOfDisplayedAllocations()).toBe(300);
  });

  it("supports the new v2 strategy buttons instead of only the legacy four", () => {
    render(<PositionBudgetBar />);

    fireEvent.click(screen.getByRole("button", { name: "Double Elite" }));
    expect(screen.getByText(/QB1–5 \+ QB4–8/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Value QB" }));
    expect(screen.getByText(/QB11–16 \+ QB17–22/)).toBeInTheDocument();
  });
});
