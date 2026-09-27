import { describe, expect, it } from "vitest";
import {
  buildReferenceOrbit,
  chooseReferenceCenter,
  referenceOrbitPoint,
  REFERENCE_REBASE_PIXELS,
  shouldRebaseReference,
} from "../src/math/perturbation";

describe("buildReferenceOrbit", () => {
  it("stores the initial orbit and known escape values", () => {
    const orbit = buildReferenceOrbit(2, 0, 3, 16);
    expect(referenceOrbitPoint(orbit, 0)).toMatchObject({ real: 0, imaginary: 0, bailoutMargin: -4 });
    expect(referenceOrbitPoint(orbit, 1)).toMatchObject({ real: 2, imaginary: 0, bailoutMargin: 0 });
    expect(referenceOrbitPoint(orbit, 2)).toMatchObject({ real: 6, imaginary: 0, bailoutMargin: 32 });
  });

  it("retains low float parts for deep reference coordinates", () => {
    const centerX = -0.743643887037151;
    const centerY = 0.13182590420533;
    const orbit = buildReferenceOrbit(centerX, centerY, 8, 16);
    const firstPoint = referenceOrbitPoint(orbit, 1);
    const realHigh = orbit.data[4];
    const imaginaryHigh = orbit.data[5];

    expect(Math.abs(firstPoint.real - centerX)).toBeLessThan(Math.abs(realHigh - centerX));
    expect(Math.abs(firstPoint.imaginary - centerY)).toBeLessThan(Math.abs(imaginaryHigh - centerY));
  });

  it("packs multiple orbit chunks into a bounded 2D texture", () => {
    const orbit = buildReferenceOrbit(-1, 0, 8, 8);
    expect(orbit.textureWidth).toBe(8);
    expect(orbit.textureHeight).toBe(6);
    expect(referenceOrbitPoint(orbit, 7)).toMatchObject({ real: -1, imaginary: 0, bailoutMargin: -3 });
  });

  it("rejects reference orbits that exceed the available texture dimensions", () => {
    expect(() => buildReferenceOrbit(0, 0, 8, 4)).toThrow(RangeError);
  });
});

describe("reference rebase distance", () => {
  it("rebases before the reference center drifts more than eight view pixels", () => {
    const scale = 1e-13;
    expect(REFERENCE_REBASE_PIXELS).toBe(8);
    expect(shouldRebaseReference(7 * scale, 0, scale)).toBe(false);
    expect(shouldRebaseReference(9 * scale, 0, scale)).toBe(true);
  });
});

describe("reference center selection", () => {
  it("prefers a nearby long-lived orbit for the seahorse-region view", () => {
    const view = {
      centerX: -0.7660939653700035,
      centerY: 0.0969992397183866,
      scale: 0.000004717095223578413,
      width: 1899,
      height: 1291,
    };
    const reference = chooseReferenceCenter(view, 3128);
    expect(reference.escapedAt).toBeNull();
    expect(Math.hypot(reference.centerX - view.centerX, reference.centerY - view.centerY)).toBeLessThan(
      Math.max(view.width, view.height) * view.scale * 0.5,
    );
  });
});
