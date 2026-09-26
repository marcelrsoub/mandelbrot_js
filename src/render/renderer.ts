import type { View } from "../math/view";
import { buildReferenceOrbit } from "../math/perturbation";
import { FRAGMENT_SHADER, PERTURBATION_FRAGMENT_SHADER, VERTEX_SHADER } from "./shader";

// Switch before float32 coordinate rounding approaches a visible fraction of a pixel.
export const PERTURBATION_SCALE_THRESHOLD = 1e-3;
const MAX_REFERENCE_ITERATIONS = 5000;
const REFERENCE_ITERATION_MARGIN = 128;

export class WebGL2UnavailableError extends Error {
  constructor() {
    super("This browser has no WebGL2 support.");
    this.name = "WebGL2UnavailableError";
  }
}

export class RendererInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RendererInitializationError";
  }
}

export class Renderer {
  readonly maxViewportWidth: number;
  readonly maxViewportHeight: number;
  readonly maxTextureSize: number;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly perturbationProgram: WebGLProgram;
  private readonly positionBuffer: WebGLBuffer;
  private readonly centerLocation: WebGLUniformLocation;
  private readonly scaleLocation: WebGLUniformLocation;
  private readonly resolutionLocation: WebGLUniformLocation;
  private readonly viewSizeLocation: WebGLUniformLocation;
  private readonly maxIterLocation: WebGLUniformLocation;
  private readonly paletteShiftLocation: WebGLUniformLocation;
  private readonly perturbScaleLocation: WebGLUniformLocation;
  private readonly perturbResolutionLocation: WebGLUniformLocation;
  private readonly perturbViewSizeLocation: WebGLUniformLocation;
  private readonly perturbCenterDeltaLocation: WebGLUniformLocation;
  private readonly perturbMaxIterLocation: WebGLUniformLocation;
  private readonly perturbReferenceWidthLocation: WebGLUniformLocation;
  private readonly perturbPaletteShiftLocation: WebGLUniformLocation;
  private readonly referenceOrbitLocation: WebGLUniformLocation;
  private readonly referenceTexture: WebGLTexture;
  private lastView: View | undefined;
  private lastMaxIter = 300;
  private lastPaletteShift = 0;
  private referenceCenterX: number | undefined;
  private referenceCenterY: number | undefined;
  private referenceIterations = 0;
  private referenceTextureWidth = 0;
  private referenceTextureHeight = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new WebGL2UnavailableError();
    this.gl = gl;
    const viewportLimits = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    this.maxViewportWidth = Math.max(1, viewportLimits[0]);
    this.maxViewportHeight = Math.max(1, viewportLimits[1]);
    this.maxTextureSize = Math.max(2, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const perturbationFragmentShader = this.compileShader(gl.FRAGMENT_SHADER, PERTURBATION_FRAGMENT_SHADER);
    this.program = this.linkProgram(vertexShader, fragmentShader);
    this.perturbationProgram = this.linkProgram(vertexShader, perturbationFragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteShader(perturbationFragmentShader);

    const buffer = gl.createBuffer();
    if (!buffer) throw new RendererInitializationError("Unable to create the WebGL vertex buffer.");
    this.positionBuffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    if (positionLocation !== 0) {
      throw new RendererInitializationError("The WebGL position attribute was not found.");
    }
    gl.useProgram(this.program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    this.centerLocation = this.requireUniform(this.program, "u_center");
    this.scaleLocation = this.requireUniform(this.program, "u_scale");
    this.resolutionLocation = this.requireUniform(this.program, "u_resolution");
    this.viewSizeLocation = this.requireUniform(this.program, "u_viewSize");
    this.maxIterLocation = this.requireUniform(this.program, "u_maxIter");
    this.paletteShiftLocation = this.requireUniform(this.program, "u_paletteShift");

    this.perturbScaleLocation = this.requireUniform(this.perturbationProgram, "u_scale");
    this.perturbResolutionLocation = this.requireUniform(this.perturbationProgram, "u_resolution");
    this.perturbViewSizeLocation = this.requireUniform(this.perturbationProgram, "u_viewSize");
    this.perturbCenterDeltaLocation = this.requireUniform(this.perturbationProgram, "u_centerDelta");
    this.perturbMaxIterLocation = this.requireUniform(this.perturbationProgram, "u_maxIter");
    this.perturbReferenceWidthLocation = this.requireUniform(this.perturbationProgram, "u_referenceWidth");
    this.perturbPaletteShiftLocation = this.requireUniform(this.perturbationProgram, "u_paletteShift");
    this.referenceOrbitLocation = this.requireUniform(this.perturbationProgram, "u_referenceOrbit");

    const referenceTexture = gl.createTexture();
    if (!referenceTexture) throw new RendererInitializationError("Unable to create the reference-orbit texture.");
    this.referenceTexture = referenceTexture;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, referenceTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  render(view: View, maxIter: number, paletteShift = 0, allowPerturbation = true): void {
    const gl = this.gl;
    this.lastView = view;
    this.lastMaxIter = maxIter;
    this.lastPaletteShift = paletteShift;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    if (allowPerturbation && view.scale < PERTURBATION_SCALE_THRESHOLD) {
      this.renderPerturbed(view, maxIter, paletteShift);
      return;
    }

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.uniform2f(this.centerLocation, view.centerX, view.centerY);
    gl.uniform1f(this.scaleLocation, view.scale);
    gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.viewSizeLocation, view.width, view.height);
    gl.uniform1i(this.maxIterLocation, maxIter);
    gl.uniform1f(this.paletteShiftLocation, paletteShift);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Reads a canvas pixel using the same top-left origin as view/input coordinates. */
  readPixel(px: number, py: number): [number, number, number] {
    if (px < 0 || px >= this.canvas.width || py < 0 || py >= this.canvas.height) {
      throw new RangeError("Pixel coordinates are outside the canvas.");
    }
    if (!this.lastView) throw new Error("Render a frame before reading a pixel.");

    // The default WebGL drawing buffer may be discarded after compositing.
    // Redraw synchronously here so this testing/debug helper returns a fresh pixel.
    this.render(this.lastView, this.lastMaxIter, this.lastPaletteShift);

    const pixel = new Uint8Array(4);
    this.gl.readPixels(
      Math.floor(px),
      this.canvas.height - 1 - Math.floor(py),
      1,
      1,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      pixel,
    );
    return [pixel[0], pixel[1], pixel[2]];
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new RendererInitializationError("Unable to create a WebGL shader.");
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const message = this.gl.getShaderInfoLog(shader) || "Unknown shader compilation error.";
      this.gl.deleteShader(shader);
      throw new RendererInitializationError(`Unable to compile the WebGL shader: ${message}`);
    }
    return shader;
  }

  private linkProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram();
    if (!program) throw new RendererInitializationError("Unable to create the WebGL program.");
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.bindAttribLocation(program, 0, "a_position");
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const message = this.gl.getProgramInfoLog(program) || "Unknown program link error.";
      this.gl.deleteProgram(program);
      throw new RendererInitializationError(`Unable to link the WebGL program: ${message}`);
    }
    return program;
  }

  private requireUniform(program: WebGLProgram, name: string): WebGLUniformLocation {
    const location = this.gl.getUniformLocation(program, name);
    if (!location) throw new RendererInitializationError(`The WebGL uniform ${name} was not found.`);
    return location;
  }

  private renderPerturbed(view: View, maxIter: number, paletteShift: number): void {
    const gl = this.gl;
    this.ensureReferenceOrbit(view, maxIter);
    gl.useProgram(this.perturbationProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.referenceTexture);
    gl.uniform1i(this.referenceOrbitLocation, 0);
    gl.uniform1i(this.perturbReferenceWidthLocation, this.referenceTextureWidth);
    gl.uniform1f(this.perturbScaleLocation, view.scale);
    gl.uniform2f(this.perturbResolutionLocation, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.perturbViewSizeLocation, view.width, view.height);
    gl.uniform2f(
      this.perturbCenterDeltaLocation,
      view.centerX - this.referenceCenterX!,
      view.centerY - this.referenceCenterY!,
    );
    gl.uniform1i(this.perturbMaxIterLocation, maxIter);
    gl.uniform1f(this.perturbPaletteShiftLocation, paletteShift);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private ensureReferenceOrbit(view: View, maxIter: number): void {
    const centerX = this.referenceCenterX;
    const centerY = this.referenceCenterY;
    const centerDeltaX = centerX === undefined ? Number.POSITIVE_INFINITY : view.centerX - centerX;
    const centerDeltaY = centerY === undefined ? Number.POSITIVE_INFINITY : view.centerY - centerY;
    const rebaseDistance = Math.hypot(centerDeltaX, centerDeltaY);
    const rebaseLimit = Math.max(view.width, view.height) * view.scale * 0.5;
    const needsReference =
      centerX === undefined ||
      centerY === undefined ||
      rebaseDistance > rebaseLimit ||
      this.referenceIterations < maxIter;

    if (needsReference) {
      const referenceIterations = Math.min(
        MAX_REFERENCE_ITERATIONS,
        maxIter + REFERENCE_ITERATION_MARGIN,
      );
      const orbit = buildReferenceOrbit(
        view.centerX,
        view.centerY,
        referenceIterations,
        this.maxTextureSize,
      );
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.referenceTexture);

      if (orbit.textureWidth !== this.referenceTextureWidth || orbit.textureHeight !== this.referenceTextureHeight) {
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          this.gl.RGBA32F,
          orbit.textureWidth,
          orbit.textureHeight,
          0,
          this.gl.RGBA,
          this.gl.FLOAT,
          orbit.data,
        );
        this.referenceTextureWidth = orbit.textureWidth;
        this.referenceTextureHeight = orbit.textureHeight;
      } else {
        this.gl.texSubImage2D(
          this.gl.TEXTURE_2D,
          0,
          0,
          0,
          orbit.textureWidth,
          orbit.textureHeight,
          this.gl.RGBA,
          this.gl.FLOAT,
          orbit.data,
        );
      }

      this.referenceCenterX = view.centerX;
      this.referenceCenterY = view.centerY;
      this.referenceIterations = orbit.steps - 1;
    }
  }
}
