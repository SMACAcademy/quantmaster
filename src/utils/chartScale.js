/**
 * Pure chart math: axis scaling and pie-sector geometry. Kept free of the DOM
 * so it can be unit tested directly, independent of the SVG rendering layer.
 */

/**
 * Round `max` up to a "nice" axis ceiling and pick a matching gridline step,
 * aiming for roughly `ticks` gridlines (Heckbert's nice-numbers algorithm).
 */
export function niceScale(max, ticks = 5) {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, step: 1 };
  const rawStep = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  let niceResidual;
  if (residual > 5) niceResidual = 10;
  else if (residual > 2) niceResidual = 5;
  else if (residual > 1) niceResidual = 2;
  else niceResidual = 1;
  const step = niceResidual * magnitude;
  const niceMax = Math.ceil(max / step) * step;
  return { max: niceMax, step };
}

/** The gridline values from 0 to `max` (inclusive) at `step` intervals. */
export function scaleTicks({ max, step }) {
  const ticks = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(Math.round(value * 1e6) / 1e6);
  return ticks;
}

/** A point on a circle of `radius` centred at (cx, cy), at `angleDeg` clockwise from the top. */
export function pointOnCircle(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

/**
 * SVG arc path `d` for one pie sector, from `startAngle` to `endAngle`
 * (degrees, clockwise from the top, 0-360).
 */
export function pieSectorPath(cx, cy, radius, startAngle, endAngle) {
  const start = pointOnCircle(cx, cy, radius, startAngle);
  const end = pointOnCircle(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

/** Turn a list of non-negative values into `{ startAngle, endAngle, percent }` sectors summing to 360°. */
export function pieSectors(values) {
  const total = values.reduce((sum, v) => sum + v, 0);
  let angle = 0;
  return values.map((value) => {
    const startAngle = angle;
    const sweep = total > 0 ? (value / total) * 360 : 0;
    angle += sweep;
    return { startAngle, endAngle: angle, percent: total > 0 ? (value / total) * 100 : 0 };
  });
}
