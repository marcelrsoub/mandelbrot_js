import { DEFAULT_SCALE } from "./math/view";
import type { ViewTransform } from "./math/view";

export interface FamousPlace extends ViewTransform {
  id: string;
  name: string;
  description: string;
  coordinates: string;
  zoomLabel: string;
}

export const FAMOUS_PLACES: readonly FamousPlace[] = [
  {
    id: "seahorse-valley",
    name: "Seahorse Valley",
    description: "Branching filaments along the western edge.",
    coordinates: "Re −0.75 · Im +0.10",
    zoomLabel: `${DEFAULT_SCALE / 0.00025}×`,
    centerX: -0.75,
    centerY: 0.1,
    scale: 0.00025,
  },
  {
    id: "spiral-junction",
    name: "Spiral junction",
    description: "A classic spiral-rich boundary point.",
    coordinates: "Re −0.743643887 · Im +0.131825904",
    zoomLabel: `${Math.round(DEFAULT_SCALE / 0.0000025).toLocaleString("en-US")}×`,
    centerX: -0.743643887037151,
    centerY: 0.13182590420533,
    scale: 0.0000025,
  },
  {
    id: "period-three-bulb",
    name: "Period-three bulb",
    description: "A small bulb attached to the main cardioid.",
    coordinates: "Re −0.125 · Im +0.74486",
    zoomLabel: `${DEFAULT_SCALE / 0.00025}×`,
    centerX: -0.125,
    centerY: 0.74486176661974,
    scale: 0.00025,
  },
  {
    id: "mini-mandelbrot",
    name: "Mini Mandelbrot",
    description: "A miniature copy with its own intricate boundary.",
    coordinates: "Re −1.768778833 · Im +0.001738996",
    zoomLabel: `${Math.round(DEFAULT_SCALE / 0.00001).toLocaleString("en-US")}×`,
    centerX: -1.768778833,
    centerY: 0.001738996,
    scale: 0.00001,
  },
  {
    id: "misiurewicz-point",
    name: "Misiurewicz point",
    description: "A famous preperiodic boundary point.",
    coordinates: "Re −0.101096364 · Im +0.956286511",
    zoomLabel: `${Math.round(DEFAULT_SCALE / 0.000002).toLocaleString("en-US")}×`,
    centerX: -0.10109636384562,
    centerY: 0.95628651080914,
    scale: 0.000002,
  },
];
