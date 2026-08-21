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

  it("strategy dropdown is reference-only: picking one changes the guidance text, not the board", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB planned allocation") as HTMLInputElement;
    const before = qb.value;

    fireEvent.change(screen.getByLabelText("Strategy reference"), { target: { value: "hero-qb" } });

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

  it("locking freezes the box; unlocking is required to edit it again", () => {
    render(<PositionBudgetBar />);

    const qb = screen.getByLabelText("QB planned allocation") as HTMLInputElement;
    fireEvent.change(qb, { target: { value: "74" } });
    expect(qb.value).toBe("74");

    fireEvent.click(screen.getByRole("button", { name: "QB is editable — tap to lock in $74" }));

    const actual = screen.getByLabelText("QB actual spend") as HTMLInputElement;
    expect(actual.value).toBe("74");
    expect(sumOfDisplayedAllocations()).toBe(225);

    // Locked means locked — the box is disabled until you unlock it.
    expect(actual).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "QB is locked — tap to unlock and edit again" }));
    const reopened = screen.getByLabelText("QB planned allocation") as HTMLInputElement;
    expect(reopened).not.toBeDisabled();
    // Unlocking must not wipe the number — it just re-opens the box.
    expect(reopened.value).toBe("74");
    fireEvent.change(reopened, { target: { value: "80" } });
    expect(reopened.value).toBe("80");
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

  it("supports the new v2 strategy options instead of only the legacy four", () => {
    render(<PositionBudgetBar />);

    const dropdown = screen.getByLabelText("Strategy reference");

    fireEvent.change(dropdown, { target: { value: "double-elite-qb" } });
    expect(screen.getByText(/QB1–5 \+ QB4–8/)).toBeInTheDocument();

    fireEvent.change(dropdown, { target: { value: "value-qb" } });
    expect(screen.getByText(/QB11–16 \+ QB17–22/)).toBeInTheDocument();
  });
});
