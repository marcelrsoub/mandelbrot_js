import {
  DEFAULT_CENTER_X,
  DEFAULT_CENTER_Y,
  DEFAULT_SCALE,
  interpolateView,
  iterationsFor,
  pan,
  zoomAt,
} from "./math/view";
import type { View, ViewTransform } from "./math/view";
import { planViewFlight } from "./math/flight";
import { PERTURBATION_SCALE_THRESHOLD, Renderer } from "./render/renderer";

type Quality = 0.5 | 1;

const MAX_DEVICE_PIXEL_RATIO = 2;
const INTERACTIVE_QUALITY: Quality = 0.5;
const FULL_QUALITY: Quality = 1;
const IDLE_DELAY_MS = 150;
const FLY_DURATION_MS = 1500;

export class Engine {
  private readonly renderer: Renderer;
  private view: View = {
    centerX: DEFAULT_CENTER_X,
    centerY: DEFAULT_CENTER_Y,
    scale: DEFAULT_SCALE,
    width: 1,
    height: 1,
  };
  private maxIter = 300;
  private iterationMultiplier = 1;
  private quality: Quality = FULL_QUALITY;
  private rafPending = false;
  private animationFrameId: number | undefined;
  private allowPerturbation = true;
  private idleTimer: number | undefined;
  private resizeObserver: ResizeObserver | undefined;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.resize();

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
    }
    window.addEventListener("resize", this.resize);
    this.invalidate();
  }

  invalidate = (): void => {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame((timestamp) => {
      this.rafPending = false;
      this.resizeDrawingBuffer();
      this.renderer.render(this.view, this.maxIter, 0, this.allowPerturbation);
    });
  };

  setQuality(quality: Quality): void {
    if (this.quality === quality) return;
    this.quality = quality;
    this.invalidate();
  }

  zoomAtCursor(px: number, py: number, factor: number): void {
    this.view = zoomAt(this.view, px, py, factor);
    this.updateIterationCount();
    this.noteInteraction();
  }

  panBy(dx: number, dy: number): void {
    this.view = pan(this.view, dx, dy);
    this.noteInteraction();
  }

  flyTo(destination: ViewTransform, durationMs = FLY_DURATION_MS): void {
    if (![destination.centerX, destination.centerY, destination.scale].every(Number.isFinite)) return;

    this.cancelFlight();
    if (this.idleTimer !== undefined) window.clearTimeout(this.idleTimer);
    this.idleTimer = undefined;

    const from: ViewTransform = {
      centerX: this.view.centerX,
      centerY: this.view.centerY,
      scale: this.view.scale,
    };
    const to: ViewTransform = { ...destination };
    if (from.centerX === to.centerX && from.centerY === to.centerY && from.scale === to.scale) {
      this.setQuality(FULL_QUALITY);
      return;
    }

    const phases = planViewFlight(from, to, PERTURBATION_SCALE_THRESHOLD);
    if (phases.length === 0) {
      this.setQuality(FULL_QUALITY);
      return;
    }

    const totalWeight = phases.reduce((sum, phase) => sum + phase.weight, 0);
    this.allowPerturbation = phases[0].allowPerturbation;
    this.setQuality(INTERACTIVE_QUALITY);
    this.invalidate();
    let phaseIndex = 0;
    let phaseStartedAt = performance.now();
    const safeDuration = Number.isFinite(durationMs) ? Math.max(1, durationMs) : FLY_DURATION_MS;

    const animate = (timestamp: number): void => {
      const phase = phases[phaseIndex];
      this.allowPerturbation = phase.allowPerturbation;
      const phaseDuration = (safeDuration * phase.weight) / totalWeight;
      const progress = Math.min(1, Math.max(0, (timestamp - phaseStartedAt) / phaseDuration));
      const next = interpolateView(phase.from, phase.to, progress);
      this.view.centerX = next.centerX;
      this.view.centerY = next.centerY;
      this.view.scale = next.scale;
      this.updateIterationCount();
      this.invalidate();

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        phaseIndex += 1;
        if (phaseIndex < phases.length) {
          phaseStartedAt = timestamp;
          this.allowPerturbation = phases[phaseIndex].allowPerturbation;
          this.animationFrameId = requestAnimationFrame(animate);
        } else {
          this.animationFrameId = undefined;
          this.allowPerturbation = true;
          this.scheduleFullQuality();
        }
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  reset(): void {
    this.view = {
      ...this.view,
      centerX: DEFAULT_CENTER_X,
      centerY: DEFAULT_CENTER_Y,
      scale: DEFAULT_SCALE,
    };
    this.iterationMultiplier = 1;
    this.updateIterationCount();
    this.noteInteraction();
  }

  adjustIterations(factor: number): void {
    const baseIterations = iterationsFor(this.view);
    const nextIterations = Math.min(5000, Math.max(300, Math.round(this.maxIter * factor)));
    this.iterationMultiplier = nextIterations / baseIterations;
    this.updateIterationCount();
    this.noteInteraction();
  }

  getView(): View {
    return { ...this.view };
  }

  dispose(): void {
    if (this.idleTimer !== undefined) window.clearTimeout(this.idleTimer);
    this.cancelFlight();
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.resize);
  }

  private resize = (): void => {
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width || window.innerWidth);
    const height = Math.max(1, bounds.height || window.innerHeight);
    if (width === this.view.width && height === this.view.height) {
      this.resizeDrawingBuffer();
      this.invalidate();
      return;
    }

    this.view = { ...this.view, width, height };
    this.resizeDrawingBuffer();
    this.invalidate();
  };

  private resizeDrawingBuffer(): void {
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    const renderScale = devicePixelRatio * this.quality;
    const width = Math.max(1, Math.min(this.renderer.maxViewportWidth, Math.round(this.view.width * renderScale)));
    const height = Math.max(1, Math.min(this.renderer.maxViewportHeight, Math.round(this.view.height * renderScale)));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  private updateIterationCount(): void {
    const baseIterations = iterationsFor(this.view);
    this.maxIter = Math.min(5000, Math.max(300, Math.round(baseIterations * this.iterationMultiplier)));
  }

  private noteInteraction(): void {
    this.cancelFlight();
    this.setQuality(INTERACTIVE_QUALITY);
    this.scheduleFullQuality();
    this.invalidate();
  }

  private scheduleFullQuality(): void {
    if (this.idleTimer !== undefined) window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      this.idleTimer = undefined;
      this.setQuality(FULL_QUALITY);
    }, IDLE_DELAY_MS);
  }

  private cancelFlight(): void {
    if (this.animationFrameId !== undefined) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = undefined;
    this.allowPerturbation = true;
  }
}
