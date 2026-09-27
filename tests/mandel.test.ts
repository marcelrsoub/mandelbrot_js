import { describe, expect, it } from "vitest";
import { isInPeriodTwoBulb, mandelIter, mandelSmooth } from "../src/math/mandel";

describe("period-two bulb interior shortcut", () => {
  it("recognizes the reported view center as inside the bulb", () => {
    expect(isInPeriodTwoBulb(-0.8855172255391052, 0.1958515450569268)).toBe(true);
    expect(isInPeriodTwoBulb(-0.7, 0.2)).toBe(false);
  });
});

describe("mandelIter", () => {
  it("returns null for a point inside the set", () => {
    expect(mandelIter(0, 0, 200)).toBeNull();
  });

  it("returns an escape iteration for a point outside the set", () => {
    expect(mandelIter(2, 0, 200)).toBe(2);
    expect(mandelIter(3, 0, 200)).toBe(1);
  });

  it("reports faster escape for points farther outside", () => {
    expect(mandelIter(1, 1, 200)).toBeLessThan(mandelIter(0.5, 0.5, 200)!);
  });
});

describe("mandelSmooth", () => {
  it("returns a fractional escape count", () => {
    const smooth = mandelSmooth(2, 0, 200);
    expect(smooth).not.toBeNull();
    expect(smooth!).not.toBe(Math.floor(smooth!));
  });

  it("returns null for points in the set", () => {
    expect(mandelSmooth(0, 0, 200)).toBeNull();
  });

  it("smooth-colors points outside the radius-two bound after one iteration", () => {
    expect(mandelSmooth(3, 0, 200)).toBeCloseTo(2 - Math.log2(Math.log(3)));
  });
});
