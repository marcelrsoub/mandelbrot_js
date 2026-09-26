import { describe, expect, it } from "vitest";
import { mandelIter, mandelSmooth } from "../src/math/mandel";

describe("mandelIter", () => {
  it("returns null for a point inside the set", () => {
    expect(mandelIter(0, 0, 200)).toBeNull();
  });

  it("returns an escape iteration for a point outside the set", () => {
    expect(mandelIter(2, 0, 200)).toBe(2);
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
});
