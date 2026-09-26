import { describe, expect, it } from "vitest";
import { planViewFlight } from "../src/math/flight";

const PERTURBATION_THRESHOLD = 1e-5;

describe("planViewFlight", () => {
  it("keeps a deep destination zoom as a precise final phase", () => {
    const phases = planViewFlight(
      { centerX: -0.5, centerY: 0, scale: 0.005 },
      { centerX: -0.743, centerY: 0.132, scale: 1e-13 },
      PERTURBATION_THRESHOLD,
    );

    expect(phases).toHaveLength(2);
    expect(phases[0].allowPerturbation).toBe(false);
    expect(phases[0].to).toEqual({ centerX: -0.743, centerY: 0.132, scale: PERTURBATION_THRESHOLD });
    expect(phases[1].allowPerturbation).toBe(true);
    expect(phases[1].from).toEqual(phases[0].to);
    expect(phases[1].to.scale).toBe(1e-13);
  });

  it("zooms out precisely before traveling away from an existing deep view", () => {
    const phases = planViewFlight(
      { centerX: -0.743, centerY: 0.132, scale: 1e-13 },
      { centerX: -1.76, centerY: 0.002, scale: 2e-6 },
      PERTURBATION_THRESHOLD,
    );

    expect(phases).toHaveLength(3);
    expect(phases[0].allowPerturbation).toBe(true);
    expect(phases[0].from.scale).toBe(1e-13);
    expect(phases[0].to.scale).toBe(PERTURBATION_THRESHOLD);
    expect(phases[0].to.centerX).toBe(phases[0].from.centerX);
    expect(phases[1].allowPerturbation).toBe(false);
    expect(phases[1].to).toEqual({ centerX: -1.76, centerY: 0.002, scale: PERTURBATION_THRESHOLD });
    expect(phases[2].allowPerturbation).toBe(true);
    expect(phases[2].to.scale).toBe(2e-6);
  });

  it("uses one direct phase when both views are in the float32 overview range", () => {
    const phases = planViewFlight(
      { centerX: -0.5, centerY: 0, scale: 0.005 },
      { centerX: -0.75, centerY: 0.1, scale: 0.00025 },
      PERTURBATION_THRESHOLD,
    );

    expect(phases).toHaveLength(1);
    expect(phases[0].allowPerturbation).toBe(false);
    expect(phases[0].weight).toBe(1);
  });
});
