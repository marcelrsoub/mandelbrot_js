import "./style.css";
import { Engine } from "./engine";
import { bindControls } from "./input/controls";
import { DEFAULT_SCALE } from "./math/view";
import { FAMOUS_PLACES } from "./places";
import { WebGL2UnavailableError } from "./render/renderer";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
const helpButton = document.querySelector<HTMLButtonElement>("#help-button");
const helpDialog = document.querySelector<HTMLDialogElement>("#help-dialog");
const closeHelpButton = document.querySelector<HTMLButtonElement>("#close-help");
const viewReadout = document.querySelector<HTMLElement>("#view-readout");
const placesList = document.querySelector<HTMLElement>("#places-list");
const rendererError = document.querySelector<HTMLElement>("#renderer-error");

if (!canvas || !helpButton || !helpDialog || !closeHelpButton || !viewReadout || !placesList || !rendererError) {
  throw new Error("The Mandelbrot explorer interface is incomplete.");
}

let engine: Engine | undefined;

const updateViewReadout = (): void => {
  if (!engine) {
    viewReadout.textContent = "View coordinates are unavailable until WebGL2 initializes.";
    return;
  }

  const view = engine.getView();
  const zoom = DEFAULT_SCALE / view.scale;
  const zoomText =
    zoom >= 1000
      ? `${(zoom / 1000).toFixed(1)}k×`
      : zoom >= 1
        ? `${Number(zoom.toFixed(1))}×`
        : `${zoom.toExponential(1)}×`;
  viewReadout.textContent =
    `Re ${view.centerX.toPrecision(8)} · Im ${view.centerY.toPrecision(8)} · ` +
    `scale ${view.scale.toExponential(2)} · zoom ${zoomText} · ${engine.getMaxIter().toLocaleString()} iterations`;
};

helpButton.addEventListener("click", () => {
  if (!helpDialog.open) {
    updateViewReadout();
    helpDialog.showModal();
  }
});
closeHelpButton.addEventListener("click", () => helpDialog.close());

helpDialog.addEventListener("close", () => {
  helpButton.setAttribute("aria-expanded", "false");
  helpButton.focus();
});

helpDialog.addEventListener("click", (event) => {
  if (event.target === helpDialog) helpDialog.close();
});

helpDialog.addEventListener("cancel", () => {
  helpButton.setAttribute("aria-expanded", "false");
});

helpButton.addEventListener("click", () => {
  helpButton.setAttribute("aria-expanded", String(helpDialog.open));
});

for (const place of FAMOUS_PLACES) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "place-button";
  button.setAttribute(
    "aria-label",
    `Fly to ${place.name}, ${place.coordinates}, ${place.zoomLabel} zoom`,
  );

  const title = document.createElement("span");
  title.className = "place-title";
  title.textContent = place.name;

  const description = document.createElement("span");
  description.className = "place-description";
  description.textContent = place.description;

  const metadata = document.createElement("span");
  metadata.className = "place-metadata";
  metadata.textContent = `${place.coordinates} · ${place.zoomLabel}`;

  button.append(title, description, metadata);
  button.addEventListener("click", () => {
    engine?.flyTo(place);
    helpDialog.close();
  });
  placesList.append(button);
}

const showRendererError = (message: string): void => {
  rendererError.textContent = message;
  rendererError.hidden = false;
};

canvas.addEventListener("webglcontextlost", () => {
  showRendererError("The WebGL context was lost. Reload this page to continue.");
});

try {
  engine = new Engine(canvas);
  bindControls(canvas, engine);
} catch (error) {
  showRendererError(
    error instanceof WebGL2UnavailableError
      ? error.message
      : `Unable to initialize the fractal renderer: ${error instanceof Error ? error.message : String(error)}`,
  );
}
