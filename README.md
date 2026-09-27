# Mandelbrot Explorer

[Open the live explorer](https://marcelrsoub.github.io/mandelbrot_js/)

A quiet, full-screen fractal explorer: drag to roam, zoom past 10×, or open the `?` help button and glide to a famous region.

## The math

For each complex-plane coordinate `c = x + yi`, the renderer iterates

```text
z₀ = 0
zₙ₊₁ = zₙ² + c
```

If an orbit ever grows beyond `|z| = 2`, it escapes and `c` is outside the Mandelbrot set. If it has not escaped by the finite iteration limit, that pixel is drawn black as an inside approximation. The default limit stays at 3,000 across zoom levels, so the same parameter does not pop from black to color just because the view changed; `[` / `]` adjust that budget. Escaped pixels use the smooth escape count `ν = n + 1 − log₂(log |zₙ|)` and a cosine palette, avoiding hard bands between integer iteration counts.

## Controls

| Action | Control |
| --- | --- |
| Pan | Drag with the primary mouse button or one finger |
| Zoom at cursor | Mouse wheel or trackpad |
| Pinch zoom and pan | Two-finger gesture |
| Zoom in / out | `+` / `−` |
| Pan | Arrow keys |
| Reset view | `R` |
| Fewer / more escape iterations | `[` / `]` |
| Visit a notable region | Open `?` and choose a destination |

The places menu includes Seahorse Valley, the spiral junction, the period-three bulb, a mini Mandelbrot, and a Misiurewicz point. Each destination is a button with its approximate complex coordinates and magnification; selecting one smoothly interpolates the view and can be interrupted by panning or zooming. Open `?` to see the current center, scale, zoom, and iteration budget for comparing views.

## Tech and architecture

```text
Pointer / keyboard / place selection → Engine + CSS-pixel view math → WebGL2 fragment shader → Fullscreen canvas
```

Each fragment independently tests one complex coordinate on the GPU, so the orbit calculations run in parallel across the image. The shader skips points inside the main cardioid and period-two bulb analytically, then exits as soon as any remaining orbit escapes; TypeScript does no per-pixel rendering. A single fullscreen-triangle draw renders a frame. While moving, the engine halves the drawing-buffer resolution. After 150 ms idle it sharpens the whole image in 65%, 82%, and full device-pixel-ratio-capped passes, 60 ms apart; view changes are coalesced to the animation-frame clock.

View scale is measured in complex units per CSS pixel, keeping cursor zoom and pan consistent across screens and render qualities. From roughly 50× zoom onward, the renderer computes a double-double reference orbit, uploads its high/low float components, and evaluates each pixel's offset with `δzₙ₊₁ = 2Zₙδzₙ + δzₙ² + δc`. Nearby views reuse the cached orbit and periodically rebase it as the camera moves. This extends practical zoom to about 50 billion×; still deeper views eventually require higher precision and glitch correction. Pure view transforms, reference-orbit packing, and the JavaScript escape-time oracle are covered by Vitest.

## Run locally

```sh
npm install
npm run dev
npm test
npm run build
```

GitHub Pages deploys the `dist/` build from `master` through the workflow in `.github/workflows/deploy-pages.yml`.
