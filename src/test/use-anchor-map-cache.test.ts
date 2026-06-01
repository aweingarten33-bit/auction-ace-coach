import { describe, expect, it, beforeEach, vi } from "vitest";
import { readAvailabilityCache } from "@/lib/use-anchor-map";

describe("readAvailabilityCache", () => {
  const now = 1_700_000_000_000;

  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
  });

  it("keeps fresh well-formed entries and drops expired/malformed ones", () => {
    const freshTs = now - 60_000;
    const expiredTs = now - 25 * 60 * 60 * 1000;
    (globalThis.localStorage.getItem as any).mockReturnValue(
      JSON.stringify({
        freshGood: { value: { factor: 0.8, reason: "Holdout" }, ts: freshTs },
        freshNull: { value: null, ts: freshTs },
        expired: { value: { factor: 0.7, reason: "Suspended" }, ts: expiredTs },
        malformed1: { value: { factor: "bad", reason: "X" }, ts: freshTs },
        malformed2: "oops",
      }),
    );

    const cache = readAvailabilityCache(now);
    expect(cache.freshGood?.value).toEqual({ factor: 0.8, reason: "Holdout" });
    expect(cache.freshNull?.value).toBeNull();
    expect(cache.expired).toBeUndefined();
    expect(cache.malformed1).toBeUndefined();
    expect(cache.malformed2).toBeUndefined();
  });
});
