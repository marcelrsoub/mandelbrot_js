import { mandelIter } from "./mandel";
import type { View } from "./view";

type DoubleDouble = readonly [number, number];

export interface ReferenceCenter {
  centerX: number;
  centerY: number;
  escapedAt: number | null;
}

export interface ReferenceOrbit {
  /** RGBA32F texture data with high, low, and radius-expansion rows per orbit chunk. */
  data: Float32Array;
  textureWidth: number;
  textureHeight: number;
  steps: number;
}

const SPLITTER = 134217729;
const REFERENCE_MAGNITUDE_LIMIT = 1e15;
const REFERENCE_CENTER_OFFSETS = [-0.35, -0.2625, -0.175, -0.0875, 0, 0.0875, 0.175, 0.2625, 0.35] as const;
export const REFERENCE_REBASE_PIXELS = 8;

export const shouldRebaseReference = (centerDeltaX: number, centerDeltaY: number, scale: number): boolean =>
  Math.hypot(centerDeltaX, centerDeltaY) > REFERENCE_REBASE_PIXELS * scale;

/** Prefer a nearby long-lived orbit to avoid perturbation glitches around escaped references. */
export const chooseReferenceCenter = (view: View, iterations: number): ReferenceCenter => {
  let best: ReferenceCenter = { centerX: view.centerX, centerY: view.centerY, escapedAt: 0 };
  let bestLifetime = -1;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const offsetY of REFERENCE_CENTER_OFFSETS) {
    for (const offsetX of REFERENCE_CENTER_OFFSETS) {
      const centerX = view.centerX + offsetX * view.width * view.scale;
      const centerY = view.centerY - offsetY * view.height * view.scale;
      const escape = mandelIter(centerX, centerY, iterations);
      const lifetime = escape ?? iterations + 1;
      const distanceSquared =
        (centerX - view.centerX) * (centerX - view.centerX) +
        (centerY - view.centerY) * (centerY - view.centerY);

      if (lifetime > bestLifetime || (lifetime === bestLifetime && distanceSquared < bestDistanceSquared)) {
        best = { centerX, centerY, escapedAt: escape };
        bestLifetime = lifetime;
        bestDistanceSquared = distanceSquared;
      }
    }
  }

  return best;
};

const twoSum = (a: number, b: number): [number, number] => {
  const sum = a + b;
  const bVirtual = sum - a;
  const error = (a - (sum - bVirtual)) + (b - bVirtual);
  return [sum, error];
};

const quickTwoSum = (a: number, b: number): [number, number] => {
  const sum = a + b;
  return [sum, b - (sum - a)];
};

const twoProduct = (a: number, b: number): [number, number] => {
  const product = a * b;
  const aSplit = SPLITTER * a;
  const aHigh = aSplit - (aSplit - a);
  const aLow = a - aHigh;
  const bSplit = SPLITTER * b;
  const bHigh = bSplit - (bSplit - b);
  const bLow = b - bHigh;
  const error =
    ((aHigh * bHigh - product) + aHigh * bLow + aLow * bHigh) + aLow * bLow;
  return [product, error];
};

const add = (a: DoubleDouble, b: DoubleDouble): [number, number] => {
  const [sum, error] = twoSum(a[0], b[0]);
  return quickTwoSum(sum, error + a[1] + b[1]);
};

const subtract = (a: DoubleDouble, b: DoubleDouble): [number, number] =>
  add(a, [-b[0], -b[1]]);

const multiply = (a: DoubleDouble, b: DoubleDouble): [number, number] => {
  const [product, error] = twoProduct(a[0], b[0]);
  const correction = error + a[0] * b[1] + a[1] * b[0] + a[1] * b[1];
  return quickTwoSum(product, correction);
};

const floatExpansion = (value: DoubleDouble): [number, number, number, number] => {
  const high = Math.fround(value[0]);
  const residual1 = value[0] - high + value[1];
  const middle = Math.fround(residual1);
  const residual2 = residual1 - middle;
  const low = Math.fround(residual2);
  const lowest = Math.fround(residual2 - low);
  return [high, middle, low, lowest];
};

const pointOffsets = (textureWidth: number, index: number): [number, number, number] => {
  const group = Math.floor(index / textureWidth);
  const column = index - group * textureWidth;
  const coordinates = (group * 3 * textureWidth + column) * 4;
  return [coordinates, coordinates + textureWidth * 4, coordinates + textureWidth * 8];
};

const storePoint = (
  data: Float32Array,
  textureWidth: number,
  index: number,
  real: DoubleDouble,
  imaginary: DoubleDouble,
): void => {
  const [coordinateHighOffset, coordinateLowOffset, marginOffset] = pointOffsets(textureWidth, index);
  const realParts = floatExpansion(real);
  const imaginaryParts = floatExpansion(imaginary);
  const normSquared = add(multiply(real, real), multiply(imaginary, imaginary));
  const radiusParts = floatExpansion(subtract(normSquared, [4, 0]));

  data[coordinateHighOffset] = realParts[0];
  data[coordinateHighOffset + 1] = imaginaryParts[0];
  data[coordinateHighOffset + 2] = realParts[1];
  data[coordinateHighOffset + 3] = imaginaryParts[1];
  data[coordinateLowOffset] = realParts[2];
  data[coordinateLowOffset + 1] = imaginaryParts[2];
  data[coordinateLowOffset + 2] = realParts[3];
  data[coordinateLowOffset + 3] = imaginaryParts[3];
  data[marginOffset] = radiusParts[0];
  data[marginOffset + 1] = radiusParts[1];
  data[marginOffset + 2] = radiusParts[2];
  data[marginOffset + 3] = radiusParts[3];
};

/**
 * Builds a double-double CPU reference orbit and packs each value as high/low
 * float expansions for a WebGL2 RGBA32F texture. Three texture rows are used
 * per orbit chunk: coordinate high/middle parts, low parts, then bailout margin.
 */
export const buildReferenceOrbit = (
  centerX: number,
  centerY: number,
  iterations: number,
  maxTextureSize: number,
): ReferenceOrbit => {
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    throw new RangeError("Reference orbit coordinates must be finite.");
  }
  if (!Number.isInteger(iterations) || iterations < 0) {
    throw new RangeError("Reference orbit iterations must be a non-negative integer.");
  }
  if (!Number.isInteger(maxTextureSize) || maxTextureSize < 2) {
    throw new RangeError("WebGL texture size is too small for a reference orbit.");
  }

  const steps = iterations + 1;
  const textureWidth = Math.min(steps, maxTextureSize);
  const groups = Math.ceil(steps / textureWidth);
  const textureHeight = groups * 3;
  if (textureHeight > maxTextureSize) {
    throw new RangeError("Reference orbit exceeds the WebGL texture capacity.");
  }

  const data = new Float32Array(textureWidth * textureHeight * 4);
  const parameterReal: DoubleDouble = [centerX, 0];
  const parameterImaginary: DoubleDouble = [centerY, 0];
  let real: DoubleDouble = [0, 0];
  let imaginary: DoubleDouble = [0, 0];

  for (let index = 0; index < steps; index += 1) {
    storePoint(data, textureWidth, index, real, imaginary);

    const approximateReal = real[0] + real[1];
    const approximateImaginary = imaginary[0] + imaginary[1];
    if (Math.hypot(approximateReal, approximateImaginary) > REFERENCE_MAGNITUDE_LIMIT) {
      for (let remaining = index + 1; remaining < steps; remaining += 1) {
        storePoint(data, textureWidth, remaining, real, imaginary);
      }
      break;
    }

    const realSquared = multiply(real, real);
    const imaginarySquared = multiply(imaginary, imaginary);
    const realProduct = multiply(real, imaginary);
    real = add(subtract(realSquared, imaginarySquared), parameterReal);
    imaginary = add(multiply([2, 0], realProduct), parameterImaginary);
  }

  return { data, textureWidth, textureHeight, steps };
};

/** Reads a packed orbit value for CPU-side tests and diagnostics. */
export const referenceOrbitPoint = (
  orbit: ReferenceOrbit,
  index: number,
): { real: number; imaginary: number; bailoutMargin: number } => {
  if (!Number.isInteger(index) || index < 0 || index >= orbit.steps) {
    throw new RangeError("Reference orbit index is out of range.");
  }

  const [coordinateHighOffset, coordinateLowOffset, marginOffset] = pointOffsets(orbit.textureWidth, index);
  return {
    real:
      orbit.data[coordinateHighOffset] +
      orbit.data[coordinateHighOffset + 2] +
      orbit.data[coordinateLowOffset] +
      orbit.data[coordinateLowOffset + 2],
    imaginary:
      orbit.data[coordinateHighOffset + 1] +
      orbit.data[coordinateHighOffset + 3] +
      orbit.data[coordinateLowOffset + 1] +
      orbit.data[coordinateLowOffset + 3],
    bailoutMargin:
      orbit.data[marginOffset] +
      orbit.data[marginOffset + 1] +
      orbit.data[marginOffset + 2] +
      orbit.data[marginOffset + 3],
  };
};
