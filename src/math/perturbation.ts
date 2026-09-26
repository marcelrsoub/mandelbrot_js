type DoubleDouble = readonly [number, number];

export interface ReferenceOrbit {
  /** RGBA32F texture data with orbit coordinates in row 0 and bailout margin in row 1. */
  data: Float32Array;
  textureWidth: number;
  textureHeight: number;
  steps: number;
}

const SPLITTER = 134217729;
const REFERENCE_MAGNITUDE_LIMIT = 1e15;

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

const floatParts = (value: DoubleDouble): [number, number] => {
  const high = Math.fround(value[0]);
  const low = Math.fround(value[0] - high + value[1]);
  return [high, low];
};

const pointOffsets = (textureWidth: number, index: number): [number, number] => {
  const group = Math.floor(index / textureWidth);
  const column = index - group * textureWidth;
  const coordinates = (group * 2 * textureWidth + column) * 4;
  return [coordinates, coordinates + textureWidth * 4];
};

const storePoint = (
  data: Float32Array,
  textureWidth: number,
  index: number,
  real: DoubleDouble,
  imaginary: DoubleDouble,
): void => {
  const [coordinateOffset, marginOffset] = pointOffsets(textureWidth, index);
  const [realHigh, realLow] = floatParts(real);
  const [imaginaryHigh, imaginaryLow] = floatParts(imaginary);
  const normSquared = add(multiply(real, real), multiply(imaginary, imaginary));
  const margin = floatParts(subtract(normSquared, [4, 0]));

  data[coordinateOffset] = realHigh;
  data[coordinateOffset + 1] = imaginaryHigh;
  data[coordinateOffset + 2] = realLow;
  data[coordinateOffset + 3] = imaginaryLow;
  data[marginOffset] = margin[0];
  data[marginOffset + 1] = margin[1];
  data[marginOffset + 2] = 0;
  data[marginOffset + 3] = 0;
};

/**
 * Builds a double-double CPU reference orbit and packs each value as high/low
 * float pairs for a WebGL2 RGBA32F texture. Two texture rows are used per orbit
 * chunk: coordinates, then squared-radius-minus-four bailout margins.
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
  const textureHeight = groups * 2;
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

  const [coordinateOffset, marginOffset] = pointOffsets(orbit.textureWidth, index);
  return {
    real: orbit.data[coordinateOffset] + orbit.data[coordinateOffset + 2],
    imaginary: orbit.data[coordinateOffset + 1] + orbit.data[coordinateOffset + 3],
    bailoutMargin: orbit.data[marginOffset] + orbit.data[marginOffset + 1],
  };
};
