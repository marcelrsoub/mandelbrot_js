export const MIN_ITERATIONS = 300;
export const MAX_ITERATIONS = 5000;
/** A view-independent escape limit avoids zoom-driven black-to-color popping. */
export const DEFAULT_ITERATIONS = 3000;

export const clampIterations = (iterations: number): number =>
  Math.min(MAX_ITERATIONS, Math.max(MIN_ITERATIONS, Math.round(iterations)));
