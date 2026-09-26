import { describe, expect, it } from "vitest";
import { clampIterations, DEFAULT_ITERATIONS, MAX_ITERATIONS, MIN_ITERATIONS } from "../src/math/iteration";

describe("stable iteration budget", () => {
  it("keeps the default budget independent of the current zoom scale", () => {
    expect(DEFAULT_ITERATIONS).toBe(3000);
    expect(clampIterations(DEFAULT_ITERATIONS)).toBe(3000);
  });

  it("allows keyboard adjustments within bounded limits", () => {
    expect(clampIterations(3000 / 2)).toBe(1500);
    expect(clampIterations(3000 * 2)).toBe(MAX_ITERATIONS);
    expect(clampIterations(1)).toBe(MIN_ITERATIONS);
  });
});
