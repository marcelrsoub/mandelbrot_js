import type { Engine } from "../engine";

interface Point {
  x: number;
  y: number;
}

interface Gesture {
  x: number;
  y: number;
  distance: number;
}

export const bindControls = (canvas: HTMLCanvasElement, engine: Engine): (() => void) => {
  const pointers = new Map<number, Point>();

  const canvasPoint = (event: PointerEvent | WheelEvent): Point => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const gesture = (): Gesture | undefined => {
    if (pointers.size < 2) return undefined;
    const iterator = pointers.values();
    const first = iterator.next().value as Point | undefined;
    const second = iterator.next().value as Point | undefined;
    if (!first || !second) return undefined;
    const dx = second.x - first.x;
    const dy = second.y - first.y;
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      distance: Math.hypot(dx, dy),
    };
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.set(event.pointerId, canvasPoint(event));
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    const previousPosition = pointers.get(event.pointerId);
    if (!previousPosition) return;

    const previousGesture = gesture();
    const nextPosition = canvasPoint(event);
    pointers.set(event.pointerId, nextPosition);
    const nextGesture = gesture();

    if (!previousGesture || !nextGesture) {
      engine.panBy(nextPosition.x - previousPosition.x, nextPosition.y - previousPosition.y);
      return;
    }

    const dx = nextGesture.x - previousGesture.x;
    const dy = nextGesture.y - previousGesture.y;
    if (dx !== 0 || dy !== 0) engine.panBy(dx, dy);

    if (previousGesture.distance > 0 && nextGesture.distance > 0) {
      const factor = nextGesture.distance / previousGesture.distance;
      if (factor !== 1) engine.zoomAtCursor(nextGesture.x, nextGesture.y, factor);
    }
  };

  const forgetPointer = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    let delta = event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      delta *= Math.max(1, canvas.getBoundingClientRect().height);
    }
    const factor = Math.min(2, Math.max(0.5, Math.exp(-delta * 0.002)));
    const point = canvasPoint(event);
    engine.zoomAtCursor(point.x, point.y, factor);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof Element && target.closest("#help-dialog[open]")) return;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    ) {
      return;
    }

    const view = engine.getView();
    const amountX = view.width * 0.1;
    const amountY = view.height * 0.1;
    let handled = true;

    switch (event.key) {
      case "+":
      case "=":
        engine.zoomAtCursor(view.width / 2, view.height / 2, 1.25);
        break;
      case "-":
        engine.zoomAtCursor(view.width / 2, view.height / 2, 0.8);
        break;
      case "ArrowLeft":
        engine.panBy(amountX, 0);
        break;
      case "ArrowRight":
        engine.panBy(-amountX, 0);
        break;
      case "ArrowUp":
        engine.panBy(0, amountY);
        break;
      case "ArrowDown":
        engine.panBy(0, -amountY);
        break;
      case "r":
      case "R":
        engine.reset();
        break;
      case "[":
        engine.adjustIterations(0.5);
        break;
      case "]":
        engine.adjustIterations(2);
        break;
      default:
        handled = false;
    }

    if (handled) event.preventDefault();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", forgetPointer);
  canvas.addEventListener("pointercancel", forgetPointer);
  canvas.addEventListener("lostpointercapture", forgetPointer);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", preventContextMenu);
  window.addEventListener("keydown", onKeyDown);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", forgetPointer);
    canvas.removeEventListener("pointercancel", forgetPointer);
    canvas.removeEventListener("lostpointercapture", forgetPointer);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("contextmenu", preventContextMenu);
    window.removeEventListener("keydown", onKeyDown);
  };
};

function preventContextMenu(event: MouseEvent): void {
  event.preventDefault();
}
