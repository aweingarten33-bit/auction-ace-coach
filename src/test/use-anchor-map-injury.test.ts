import { describe, expect, it } from "vitest";
import { anchorInjuryFactorFromStatus } from "@/lib/use-anchor-map";

describe("anchorInjuryFactorFromStatus", () => {
  it("keeps OUT aligned with redraft injury multiplier", () => {
    expect(anchorInjuryFactorFromStatus("OUT", null)).toEqual({ factor: 0.55, reason: "OUT" });
  });

  it("still handles surgery-specific questionable discount", () => {
    expect(anchorInjuryFactorFromStatus("QUESTIONABLE", "expected after surgery")).toEqual({
      factor: 0.8,
      reason: "Questionable (surgery)",
    });
  });
});
