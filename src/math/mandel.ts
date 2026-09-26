export function mandelIter(cx: number, cy: number, maxIter: number): number | null {
  let x = 0;
  let y = 0;
  let iteration = 0;

  while (iteration < maxIter && x * x + y * y <= 4) {
    const nextX = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = nextX;
    iteration += 1;
  }

  return x * x + y * y <= 4 ? null : iteration;
}

export function mandelSmooth(cx: number, cy: number, maxIter: number): number | null {
  let x = 0;
  let y = 0;
  let iteration = 0;

  while (iteration < maxIter && x * x + y * y <= 4) {
    const nextX = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = nextX;
    iteration += 1;
  }

  const magnitudeSquared = x * x + y * y;
  if (magnitudeSquared <= 4) return null;

  const magnitude = Math.sqrt(magnitudeSquared);
  return iteration + 1 - Math.log2(Math.log(magnitude));
}
