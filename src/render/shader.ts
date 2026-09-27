export const VERTEX_SHADER = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_center;
uniform float u_scale;
uniform vec2 u_resolution;
uniform vec2 u_viewSize;
uniform int u_maxIter;
uniform float u_paletteShift;

out vec4 outColor;

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318530718 * (t + u_paletteShift + vec3(0.0, 0.33, 0.67)));
}

bool inMainCardioid(vec2 c) {
  float x = c.x - 0.25;
  float q = x * x + c.y * c.y;
  return q * (q + x) <= 0.25 * c.y * c.y;
}

bool inPeriodTwoBulb(vec2 c) {
  vec2 offset = vec2(c.x + 1.0, c.y);
  return dot(offset, offset) <= 0.0625;
}

void main() {
  // gl_FragCoord starts at the bottom-left; positive imaginary values point up.
  vec2 viewPosition = gl_FragCoord.xy * (u_viewSize / u_resolution);
  vec2 c = u_center + (viewPosition - 0.5 * u_viewSize) * u_scale;
  if (inMainCardioid(c) || inPeriodTwoBulb(c)) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float cMagnitudeSquared = dot(c, c);
  if (cMagnitudeSquared > 4.0) {
    float smoothIteration = 2.0 - log2(log(sqrt(cMagnitudeSquared)));
    outColor = vec4(palette(sqrt(max(smoothIteration, 0.0) / float(u_maxIter))), 1.0);
    return;
  }

  vec2 z = vec2(0.0);
  float iteration = 0.0;

  for (int n = 0; n < 5000; n++) {
    if (n >= u_maxIter || dot(z, z) > 4.0) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    iteration += 1.0;
  }

  float magnitudeSquared = dot(z, z);
  if (magnitudeSquared <= 4.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float smoothIteration = iteration + 1.0 - log2(log(sqrt(magnitudeSquared)));
  outColor = vec4(palette(sqrt(max(smoothIteration, 0.0) / float(u_maxIter))), 1.0);
}
`;

export const PERTURBATION_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

uniform float u_scale;
uniform vec2 u_resolution;
uniform vec2 u_viewSize;
uniform vec2 u_centerDelta;
uniform int u_maxIter;
uniform int u_referenceWidth;
uniform float u_paletteShift;
uniform sampler2D u_referenceOrbit;

out vec4 outColor;

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318530718 * (t + u_paletteShift + vec3(0.0, 0.33, 0.67)));
}

vec4 referenceValue(int iteration, int row) {
  int column = iteration % u_referenceWidth;
  int chunk = iteration / u_referenceWidth;
  return texelFetch(u_referenceOrbit, ivec2(column, chunk * 2 + row), 0);
}

vec2 complexProduct(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

float bailoutMargin(vec4 orbit, vec4 radius, vec2 delta) {
  float margin = radius.x;
  margin += 2.0 * dot(orbit.xy, delta);
  margin += 2.0 * dot(orbit.zw, delta);
  margin += dot(delta, delta);
  return margin + radius.y;
}

void main() {
  vec2 viewPosition = gl_FragCoord.xy * (u_viewSize / u_resolution);
  vec2 deltaC = u_centerDelta + (viewPosition - 0.5 * u_viewSize) * u_scale;
  vec4 firstOrbit = referenceValue(1, 0);
  vec4 firstRadius = referenceValue(1, 1);
  float firstMargin = bailoutMargin(firstOrbit, firstRadius, deltaC);
  if (firstMargin > 0.0) {
    float smoothIteration = 2.0 - log2(log(sqrt(4.0 + firstMargin)));
    outColor = vec4(palette(sqrt(max(smoothIteration, 0.0) / float(u_maxIter))), 1.0);
    return;
  }

  vec2 deltaZ = vec2(0.0);
  float iteration = 0.0;
  float finalMargin = -4.0;
  bool escaped = false;

  for (int n = 0; n < 5000; n++) {
    if (n >= u_maxIter) break;
    vec4 orbit = referenceValue(n, 0);
    vec4 radius = referenceValue(n, 1);
    finalMargin = bailoutMargin(orbit, radius, deltaZ);
    if (finalMargin > 0.0) {
      escaped = true;
      break;
    }

    vec2 productHigh = complexProduct(orbit.xy, deltaZ);
    vec2 productLow = complexProduct(orbit.zw, deltaZ);
    vec2 squaredDelta = complexProduct(deltaZ, deltaZ);
    deltaZ = 2.0 * productHigh + 2.0 * productLow + squaredDelta + deltaC;
    iteration += 1.0;
  }

  if (!escaped) {
    vec4 orbit = referenceValue(int(iteration), 0);
    vec4 radius = referenceValue(int(iteration), 1);
    finalMargin = bailoutMargin(orbit, radius, deltaZ);
    escaped = finalMargin > 0.0;
  }

  if (!escaped) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float magnitude = sqrt(max(4.0 + finalMargin, 4.000001));
  float smoothIteration = iteration + 1.0 - log2(log(magnitude));
  outColor = vec4(palette(sqrt(max(smoothIteration, 0.0) / float(u_maxIter))), 1.0);
}
`;
