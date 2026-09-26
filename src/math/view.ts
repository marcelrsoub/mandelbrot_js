export interface View {
  centerX: number;
  centerY: number;
  /** Complex-plane units per CSS pixel. */
  scale: number;
  /** Logical viewport dimensions in CSS pixels, independent of render quality. */
  width: number;
  height: number;
}

export interface ViewTransform {
  centerX: number;
  centerY: number;
  scale: number;
}

export const DEFAULT_CENTER_X = -0.5;
export const DEFAULT_CENTER_Y = 0;
export const DEFAULT_SCALE = 0.005;

// Perturbation rendering keeps a high/low reference orbit so per-pixel offsets
// remain useful far below ordinary float32 coordinate precision.
export const MIN_SCALE = 1e-13;
export const MAX_SCALE = 10;

export const screenToComplex = (view: View, px: number, py: number): [number, number] => [
  view.centerX + (px - view.width / 2) * view.scale,
  view.centerY - (py - view.height / 2) * view.scale,
];

export const complexToScreen = (view: View, x: number, y: number): [number, number] => [
  (x - view.centerX) / view.scale + view.width / 2,
  (view.centerY - y) / view.scale + view.height / 2,
];

export const clampScale = (scale: number): number => {
  if (Number.isNaN(scale)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
};

export const zoomAt = (view: View, px: number, py: number, factor: number): View => {
  const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
  const [x, y] = screenToComplex(view, px, py);
  const scale = clampScale(view.scale / safeFactor);

  return {
    ...view,
    scale,
    centerX: x - (px - view.width / 2) * scale,
    centerY: y + (py - view.height / 2) * scale,
  };
};

export const pan = (view: View, dx: number, dy: number): View => ({
  ...view,
  centerX: view.centerX - dx * view.scale,
  centerY: view.centerY + dy * view.scale,
});

/** Smoothly interpolates position and logarithmic scale between two views. */
export const interpolateView = (
  from: ViewTransform,
  to: ViewTransform,
  progress: number,
): ViewTransform => {
  const t = Math.min(1, Math.max(0, progress));
  const targetScale = clampScale(to.scale);
  if (t === 0) return { ...from };
  if (t === 1) return { centerX: to.centerX, centerY: to.centerY, scale: targetScale };

  const eased = t * t * (3 - 2 * t);

  return {
    centerX: from.centerX + (to.centerX - from.centerX) * eased,
    centerY: from.centerY + (to.centerY - from.centerY) * eased,
    scale: from.scale * Math.exp(Math.log(targetScale / from.scale) * eased),
  };
};

export const iterationsFor = (view: View): number =>
  Math.min(5000, Math.max(300, Math.round(300 + 100 * Math.log10(DEFAULT_SCALE / view.scale))));
