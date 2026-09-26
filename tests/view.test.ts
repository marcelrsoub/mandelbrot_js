import { describe, expect, it } from "vitest";
import {
  complexToScreen,
  interpolateView,
  iterationsFor,
  MIN_SCALE,
  pan,
  screenToComplex,
  View,
  zoomAt,
} from "../src/math/view";

const view: View = { centerX: -0.5, centerY: 0, scale: 0.01, width: 800, height: 600 };

describe("screenToComplex", () => {
  it("maps the canvas center to the view center", () => {
    expect(screenToComplex(view, 400, 300)).toEqual([-0.5, 0]);
  });

  it("maps the top edge to positive imaginary values", () => {
    expect(screenToComplex(view, 400, 0)[1]).toBeCloseTo(3);
  });

  it("round-trips through complexToScreen", () => {
    const [x, y] = screenToComplex(view, 123, 456);
    const [px, py] = complexToScreen(view, x, y);
    expect(px).toBeCloseTo(123);
    expect(py).toBeCloseTo(456);
  });
});

describe("zoomAt", () => {
  it("keeps the point under the cursor fixed while zooming", () => {
    const before = screenToComplex(view, 100, 500);
    const zoomed = zoomAt(view, 100, 500, 1.25);
    const after = screenToComplex(zoomed, 100, 500);
    expect(after[0]).toBeCloseTo(before[0], 10);
    expect(after[1]).toBeCloseTo(before[1], 10);
  });

  it("scales inversely with the zoom factor and clamps to finite limits", () => {
    expect(zoomAt(view, 400, 300, 2).scale).toBeCloseTo(0.005);
    expect(zoomAt(view, 400, 300, 1e-30).scale).toBe(10);
    expect(zoomAt(view, 400, 300, 1e30).scale).toBe(1e-13);
  });
});

describe("pan", () => {
  it("keeps the same complex point under a translated screen position", () => {
    const moved = pan(view, 12, -7);
    const before = screenToComplex(view, 100, 300);
    const after = screenToComplex(moved, 112, 293);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
  });
});

describe("interpolateView", () => {
  it("eases between centers and interpolates scale logarithmically", () => {
    const from = { centerX: -0.5, centerY: 0, scale: 0.01 };
    const to = { centerX: -1.5, centerY: 1, scale: 0.0001 };
    expect(interpolateView(from, to, 0)).toEqual(from);
    expect(interpolateView(from, to, 1)).toEqual(to);
    const halfway = interpolateView(from, to, 0.5);
    expect(halfway.centerX).toBeCloseTo(-1);
    expect(halfway.centerY).toBeCloseTo(0.5);
    expect(halfway.scale).toBeCloseTo(0.001, 12);
  });

  it("clamps animation progress and destination scale", () => {
    const from = { centerX: 0, centerY: 0, scale: 0.005 };
    expect(interpolateView(from, { centerX: 1, centerY: 1, scale: 1e-30 }, 2)).toEqual({
      centerX: 1,
      centerY: 1,
      scale: 1e-13,
    });
  });
});

describe("iterationsFor", () => {
  it("increases monotonically with zoom and respects its bounds", () => {
    const shallow = { ...view, scale: 0.002 };
    const deep = { ...view, scale: 0.00002 };
    expect(iterationsFor(shallow)).toBeGreaterThan(iterationsFor(view));
    expect(iterationsFor(deep)).toBeGreaterThan(iterationsFor(shallow));
    expect(iterationsFor({ ...view, scale: 1 })).toBe(300);
    expect(iterationsFor({ ...view, scale: 1e-100 })).toBe(5000);
    expect(MIN_SCALE).toBe(1e-13);
    expect(iterationsFor({ ...view, scale: MIN_SCALE })).toBe(1370);
  });
});
