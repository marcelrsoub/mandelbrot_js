import type { View } from "../math/view";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shader";

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
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly positionBuffer: WebGLBuffer;
  private readonly centerLocation: WebGLUniformLocation;
  private readonly scaleLocation: WebGLUniformLocation;
  private readonly resolutionLocation: WebGLUniformLocation;
  private readonly viewSizeLocation: WebGLUniformLocation;
  private readonly maxIterLocation: WebGLUniformLocation;
  private readonly paletteShiftLocation: WebGLUniformLocation;
  private lastView: View | undefined;
  private lastMaxIter = 300;
  private lastPaletteShift = 0;

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

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new RendererInitializationError("Unable to create the WebGL program.");
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Unknown program link error.";
      gl.deleteProgram(program);
      throw new RendererInitializationError(`Unable to link the WebGL program: ${message}`);
    }
    this.program = program;
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    const buffer = gl.createBuffer();
    if (!buffer) throw new RendererInitializationError("Unable to create the WebGL vertex buffer.");
    this.positionBuffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    if (positionLocation < 0) {
      throw new RendererInitializationError("The WebGL position attribute was not found.");
    }
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    this.centerLocation = this.requireUniform("u_center");
    this.scaleLocation = this.requireUniform("u_scale");
    this.resolutionLocation = this.requireUniform("u_resolution");
    this.viewSizeLocation = this.requireUniform("u_viewSize");
    this.maxIterLocation = this.requireUniform("u_maxIter");
    this.paletteShiftLocation = this.requireUniform("u_paletteShift");
  }

  render(view: View, maxIter: number, paletteShift = 0): void {
    const gl = this.gl;
    this.lastView = view;
    this.lastMaxIter = maxIter;
    this.lastPaletteShift = paletteShift;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
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

  private requireUniform(name: string): WebGLUniformLocation {
    const location = this.gl.getUniformLocation(this.program, name);
    if (!location) throw new RendererInitializationError(`The WebGL uniform ${name} was not found.`);
    return location;
  }
}
