# Mandelbrot Explorer

[Open the live explorer](https://marcelrsoub.github.io/mandelbrot_js/)

A quiet, full-screen fractal explorer: drag to roam, zoom past 10×, or open the `?` help button and glide to a famous region.

## The math

For each complex-plane coordinate `c = x + yi`, the renderer iterates

```text
z₀ = 0
zₙ₊₁ = zₙ² + c
```

If an orbit ever grows beyond `|z| = 2`, it escapes and `c` is outside the Mandelbrot set. If it remains bounded through the iteration limit, that pixel is drawn inside the set. Escaped pixels use the smooth escape count `ν = n + 1 − log₂(log |zₙ|)` and a cosine palette, avoiding hard bands between integer iteration counts.

## Controls

| Action | Control |
| --- | --- |
| Pan | Drag with the primary mouse button or one finger |
| Zoom at cursor | Mouse wheel or trackpad |
| Pinch zoom and pan | Two-finger gesture |
| Zoom in / out | `+` / `−` |
| Pan | Arrow keys |
| Reset view | `R` |
| Visit a notable region | Open `?` and choose a destination |

The places menu includes Seahorse Valley, the spiral junction, the period-three bulb, a mini Mandelbrot, and a Misiurewicz point. Each destination is a button with its approximate complex coordinates and magnification; selecting one smoothly interpolates the view and can be interrupted by panning or zooming.

## Tech and architecture

```text
Pointer / keyboard / place selection → Engine + CSS-pixel view math → WebGL2 fragment shader → Fullscreen canvas
```

Each fragment independently tests one complex coordinate on the GPU, so the orbit calculations run in parallel across the image. The shader skips points inside the main cardioid and period-two bulb analytically, then exits as soon as any remaining orbit escapes; TypeScript does no per-pixel rendering. A single fullscreen-triangle draw renders a frame. While moving, the engine halves the drawing-buffer resolution and restores device-pixel-ratio-capped quality after 150 ms; it coalesces view changes to the animation-frame clock.

View scale is measured in complex units per CSS pixel, keeping cursor zoom and pan consistent across screens and render qualities. At close scales the renderer computes a double-double reference orbit, uploads its high/low float components, and evaluates each pixel's offset with `δzₙ₊₁ = 2Zₙδzₙ + δzₙ² + δc`. Nearby views reuse the cached orbit and periodically rebase it as the camera moves. This extends practical zoom to about 50 billion×; still deeper views eventually require higher precision and glitch correction. Pure view transforms, reference-orbit packing, and the JavaScript escape-time oracle are covered by Vitest.

At the `1e-13` scale with 1,370 iterations, a 1,280×800 WebGL2 timer-query check measured a 7.63 ms median GPU frame after warm-up (three samples, no disjoint result).

## Run locally

```sh
npm install
npm run dev
npm test
npm run build
```

GitHub Pages deploys the `dist/` build from `master` through the workflow in `.github/workflows/deploy-pages.yml`.
