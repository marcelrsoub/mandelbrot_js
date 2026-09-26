const TAU = Math.PI * 2;
const PHASES = [0, 0.33, 0.67] as const;

export type RGB = [number, number, number];

export const palette = (t: number, shift = 0): RGB => [
  0.5 + 0.5 * Math.cos(TAU * (t + PHASES[0] + shift)),
  0.5 + 0.5 * Math.cos(TAU * (t + PHASES[1] + shift)),
  0.5 + 0.5 * Math.cos(TAU * (t + PHASES[2] + shift)),
];
