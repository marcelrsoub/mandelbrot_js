import { clampScale } from "./view";
import type { ViewTransform } from "./view";

export interface FlightPhase {
  from: ViewTransform;
  to: ViewTransform;
  allowPerturbation: boolean;
  weight: number;
}

/** Keeps deep flights precise by zooming out before direct-render travel and zooming in after arrival. */
export const planViewFlight = (
  from: ViewTransform,
  destination: ViewTransform,
  perturbationThreshold: number,
): FlightPhase[] => {
  const to = { ...destination, scale: clampScale(destination.scale) };
  const startsDeep = from.scale < perturbationThreshold;
  const endsDeep = to.scale < perturbationThreshold;
  const phases: FlightPhase[] = [];
  let phaseFrom = { ...from };

  const addPhase = (phaseTo: ViewTransform, allowPerturbation: boolean, weight: number): void => {
    if (
      phaseFrom.centerX === phaseTo.centerX &&
      phaseFrom.centerY === phaseTo.centerY &&
      phaseFrom.scale === phaseTo.scale
    ) {
      return;
    }
    phases.push({ from: phaseFrom, to: phaseTo, allowPerturbation, weight });
    phaseFrom = phaseTo;
  };

  if (startsDeep) {
    addPhase({ ...phaseFrom, scale: perturbationThreshold }, true, 0.2);
  }

  const cruiseTarget: ViewTransform = {
    centerX: to.centerX,
    centerY: to.centerY,
    scale: endsDeep ? perturbationThreshold : to.scale,
  };
  const transitWeight = startsDeep && endsDeep ? 0.6 : startsDeep || endsDeep ? 0.75 : 1;
  addPhase(cruiseTarget, false, transitWeight);

  if (endsDeep) addPhase(to, true, startsDeep ? 0.2 : 0.25);
  return phases;
};
