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
  return texelFetch(u_referenceOrbit, ivec2(column, chunk * 3 + row), 0);
}

vec2 quickTwoSum(float a, float b) {
  float sum = a + b;
  return vec2(sum, b - (sum - a));
}

vec2 twoSum(float a, float b) {
  float sum = a + b;
  float bVirtual = sum - a;
  float error = (a - (sum - bVirtual)) + (b - bVirtual);
  return vec2(sum, error);
}

vec2 twoProduct(float a, float b) {
  float product = a * b;
  float aSplit = 4097.0 * a;
  float aHigh = aSplit - (aSplit - a);
  float aLow = a - aHigh;
  float bSplit = 4097.0 * b;
  float bHigh = bSplit - (bSplit - b);
  float bLow = b - bHigh;
  float error = ((aHigh * bHigh - product) + aHigh * bLow + aLow * bHigh) + aLow * bLow;
  return vec2(product, error);
}

vec2 doubleSingleAdd(vec2 a, vec2 b) {
  vec2 sum = twoSum(a.x, b.x);
  return quickTwoSum(sum.x, sum.y + a.y + b.y);
}

vec2 doubleSingleMultiply(vec2 a, vec2 b) {
  vec2 product = twoProduct(a.x, b.x);
  float correction = product.y + a.x * b.y + a.y * b.x + a.y * b.y;
  return quickTwoSum(product.x, correction);
}

vec4 doubleSingleComplexAdd(vec4 a, vec4 b) {
  vec2 real = doubleSingleAdd(vec2(a.x, a.z), vec2(b.x, b.z));
  vec2 imaginary = doubleSingleAdd(vec2(a.y, a.w), vec2(b.y, b.w));
  return vec4(real.x, imaginary.x, real.y, imaginary.y);
}

vec4 complexMultiplyDoubleSingle(vec4 a, vec4 b) {
  vec2 aReal = vec2(a.x, a.z);
  vec2 aImaginary = vec2(a.y, a.w);
  vec2 bReal = vec2(b.x, b.z);
  vec2 bImaginary = vec2(b.y, b.w);
  vec2 real = doubleSingleAdd(
    doubleSingleMultiply(aReal, bReal),
    -doubleSingleMultiply(aImaginary, bImaginary)
  );
  vec2 imaginary = doubleSingleAdd(
    doubleSingleMultiply(aReal, bImaginary),
    doubleSingleMultiply(aImaginary, bReal)
  );
  return vec4(real.x, imaginary.x, real.y, imaginary.y);
}

vec2 complexDotDoubleSingle(vec4 a, vec4 b) {
  vec4 conjugateA = vec4(a.x, -a.y, a.z, -a.w);
  vec4 product = complexMultiplyDoubleSingle(conjugateA, b);
  return vec2(product.x, product.z);
}

vec2 bailoutMargin(vec4 orbitHigh, vec4 orbitLow, vec4 radius, vec4 delta) {
  vec2 referenceRadius = doubleSingleAdd(radius.xy, radius.zw);
  vec2 crossHigh = complexDotDoubleSingle(orbitHigh, delta);
  vec2 crossLow = complexDotDoubleSingle(orbitLow, delta);
  vec2 crossTerm = doubleSingleMultiply(vec2(2.0, 0.0), doubleSingleAdd(crossHigh, crossLow));
  vec2 deltaMagnitudeSquared = complexDotDoubleSingle(delta, delta);
  return doubleSingleAdd(doubleSingleAdd(referenceRadius, crossTerm), deltaMagnitudeSquared);
}

bool marginIsPositive(vec2 margin) {
  return margin.x > 0.0 || (margin.x == 0.0 && margin.y > 0.0);
}

void main() {
  vec2 viewPosition = gl_FragCoord.xy * (u_viewSize / u_resolution);
  vec2 deltaC = u_centerDelta + (viewPosition - 0.5 * u_viewSize) * u_scale;
  vec4 preciseDeltaC = vec4(deltaC, 0.0, 0.0);
  vec4 firstOrbitHigh = referenceValue(1, 0);
  vec4 firstOrbitLow = referenceValue(1, 1);
  vec4 firstRadius = referenceValue(1, 2);
  vec2 firstMargin = bailoutMargin(firstOrbitHigh, firstOrbitLow, firstRadius, preciseDeltaC);
  if (marginIsPositive(firstMargin)) {
    float smoothIteration = 2.0 - log2(log(sqrt(max(4.0 + firstMargin.x + firstMargin.y, 4.000001))));
    outColor = vec4(palette(sqrt(max(smoothIteration, 0.0) / float(u_maxIter))), 1.0);
    return;
  }

  vec4 deltaZ = vec4(0.0);
  float iteration = 0.0;
  vec2 finalMargin = vec2(-4.0, 0.0);
  bool escaped = false;

  for (int n = 0; n < 5000; n++) {
    if (n >= u_maxIter) break;
    vec4 orbitHigh = referenceValue(n, 0);
    vec4 orbitLow = referenceValue(n, 1);
    vec4 radius = referenceValue(n, 2);
    finalMargin = bailoutMargin(orbitHigh, orbitLow, radius, deltaZ);
    if (marginIsPositive(finalMargin)) {
      escaped = true;
      break;
    }

    vec4 productHigh = complexMultiplyDoubleSingle(orbitHigh, deltaZ);
    vec4 productLow = complexMultiplyDoubleSingle(orbitLow, deltaZ);
    vec4 squaredDelta = complexMultiplyDoubleSingle(deltaZ, deltaZ);
    vec4 doubleProduct = 2.0 * doubleSingleComplexAdd(productHigh, productLow);
    deltaZ = doubleSingleComplexAdd(doubleProduct, squaredDelta);
    deltaZ = doubleSingleComplexAdd(deltaZ, preciseDeltaC);
    iteration += 1.0;
  }

  if (!escaped) {
    vec4 orbitHigh = referenceValue(int(iteration), 0);
    vec4 orbitLow = referenceValue(int(iteration), 1);
    vec4 radius = referenceValue(int(iteration), 2);
    finalMargin = bailoutMargin(orbitHigh, orbitLow, radius, deltaZ);
    escaped = marginIsPositive(finalMargin);
  }

  if (!escaped) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float magnitude = sqrt(max(4.0 + finalMargin.x + finalMargin.y, 4.000001));
  float smoothIteration = iteration + 1.0 - log2(log(magnitude));
  outColor = vec4(palette(sqrt(max(smoothIteration, 0.0) / float(u_maxIter))), 1.0);
}
`;
