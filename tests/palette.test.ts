import { describe, expect, it } from "vitest";
import { palette } from "../src/render/palette";

describe("palette", () => {
  it("keeps its channels inside the normalized color range", () => {
    for (let index = 0; index <= 100; index += 1) {
      for (const channel of palette(index / 100, 0.17)) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
    }
  });

  it("changes smoothly for nearby iteration values", () => {
    const before = palette(0.4);
    const after = palette(0.4001);
    expect(Math.max(...before.map((channel, index) => Math.abs(channel - after[index])))).toBeLessThan(
      0.001,
    );
  });
});
