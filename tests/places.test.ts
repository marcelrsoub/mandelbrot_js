import { describe, expect, it } from "vitest";
import { DEFAULT_SCALE, MIN_SCALE } from "../src/math/view";
import { FAMOUS_PLACES } from "../src/places";

describe("famous places", () => {
  it("offers distinct, supported destinations beyond 10x zoom", () => {
    expect(FAMOUS_PLACES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(FAMOUS_PLACES.map((place) => place.id)).size).toBe(FAMOUS_PLACES.length);

    for (const place of FAMOUS_PLACES) {
      expect(place.scale).toBeGreaterThanOrEqual(MIN_SCALE);
      expect(DEFAULT_SCALE / place.scale).toBeGreaterThan(10);
    }
  });
});
