/**
 * Pure math for the coordinate-plane renderer: axis scaling and line
 * clipping. Kept free of the DOM so it can be unit tested directly.
 */

import { niceScale } from './chartScale.js';

/** A sensible gridline step for a numeric range: 1 unit for small ranges, "nice" numbers for large ones. */
export function axisStep(min, max) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return 1;
  return span > 16 ? niceScale(span, 8).step : 1;
}

/**
 * Build a data-space -> screen-space transform that fits `xRange`/`yRange`
 * into `box` (width/height, in SVG user units) with equal x/y scale, so
 * slopes and distances are not visually distorted.
 */
export function makeTransform(xRange, yRange, box) {
  const unitsX = xRange[1] - xRange[0];
  const unitsY = yRange[1] - yRange[0];
  const scale = Math.min(box.width / unitsX, box.height / unitsY);
  const usedWidth = scale * unitsX;
  const usedHeight = scale * unitsY;
  const offsetX = box.left + (box.width - usedWidth) / 2;
  const offsetY = box.top + (box.height - usedHeight) / 2;
  return {
    scale,
    toX: (x) => offsetX + (x - xRange[0]) * scale,
    toY: (y) => offsetY + (yRange[1] - y) * scale
  };
}

/**
 * Clip the infinite line through `p1` and `p2` to the rectangle
 * [xRange[0], xRange[1]] x [yRange[0], yRange[1]], returning its two
 * boundary points, or null if the line does not cross the rectangle.
 */
export function clipLineToRect(p1, p2, xRange, yRange) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const candidates = [];
  const within = (value, lo, hi) => value >= lo - 1e-9 && value <= hi + 1e-9;

  if (p1.x === p2.x) {
    if (!within(p1.x, xMin, xMax)) return null;
    candidates.push({ x: p1.x, y: yMin }, { x: p1.x, y: yMax });
  } else if (p1.y === p2.y) {
    if (!within(p1.y, yMin, yMax)) return null;
    candidates.push({ x: xMin, y: p1.y }, { x: xMax, y: p1.y });
  } else {
    const m = (p2.y - p1.y) / (p2.x - p1.x);
    const b = p1.y - m * p1.x;
    const atXMin = m * xMin + b;
    const atXMax = m * xMax + b;
    const atYMin = (yMin - b) / m;
    const atYMax = (yMax - b) / m;
    if (within(atXMin, yMin, yMax)) candidates.push({ x: xMin, y: atXMin });
    if (within(atXMax, yMin, yMax)) candidates.push({ x: xMax, y: atXMax });
    if (within(atYMin, xMin, xMax)) candidates.push({ x: atYMin, y: yMin });
    if (within(atYMax, xMin, xMax)) candidates.push({ x: atYMax, y: yMax });
  }

  const unique = [];
  for (const point of candidates) {
    if (!unique.some((p) => Math.abs(p.x - point.x) < 1e-6 && Math.abs(p.y - point.y) < 1e-6)) {
      unique.push(point);
    }
  }
  if (unique.length < 2) return null;
  // The line may touch a corner (3+ candidates); keep the two furthest apart.
  let best = [unique[0], unique[1]];
  let bestDist = -1;
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const dist = (unique[i].x - unique[j].x) ** 2 + (unique[i].y - unique[j].y) ** 2;
      if (dist > bestDist) {
        bestDist = dist;
        best = [unique[i], unique[j]];
      }
    }
  }
  return best;
}
