/**
 * Pure math for free-form 2D shape diagrams (triangles, quadrilaterals,
 * polygons, circles, lines and angles): fitting a diagram to a viewBox, and
 * the vector geometry behind angle arcs, tick marks and right-angle marks.
 * All angle math works directly in whatever coordinate space it's given
 * (the renderer calls it in screen space, after the y-flip) — a reflection
 * preserves angle magnitudes, so this stays correct either way.
 */

import { pointOnCircle } from './chartScale.js';

/** Bounding [xRange, yRange] for a set of {x, y} points, with padding added on every side. */
export function computeBounds(points, padding = 1) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    xRange: [Math.min(...xs) - padding, Math.max(...xs) + padding],
    yRange: [Math.min(...ys) - padding, Math.max(...ys) + padding]
  };
}

/** The "clockwise from top" bearing (degrees, 0-360) of the vector (dx, dy) — inverse of chartScale's pointOnCircle. */
export function bearingDeg(dx, dy) {
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return ((deg % 360) + 360) % 360;
}

/** The minor arc (<=180°) between two bearings, returned as {startAngle, endAngle, degrees}. */
export function minorArc(bearing1, bearing2) {
  let delta = ((bearing2 - bearing1) % 360 + 360) % 360;
  let start = bearing1;
  if (delta > 180) {
    start = bearing2;
    delta = 360 - delta;
  }
  return { startAngle: start, endAngle: start + delta, degrees: delta };
}

/** SVG path `d` for an open angle arc (no centre point, unlike a filled pie sector). */
export function angleArcPath(cx, cy, radius, startAngle, endAngle) {
  const start = pointOnCircle(cx, cy, radius, startAngle);
  const end = pointOnCircle(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** Unit vector and length of the segment from a to b. */
function segmentVector(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  return { ux: dx / length, uy: dy / length, length };
}

/** Endpoints of `count` short perpendicular tick marks centred on segment a-b, for "equal length" marks. */
export function tickMarkSegments(a, b, count, { spacing = 6, size = 5 } = {}) {
  const { ux, uy } = segmentVector(a, b);
  const px = -uy;
  const py = ux;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const marks = [];
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spacing;
    const cx = mx + ux * offset;
    const cy = my + uy * offset;
    marks.push({ x1: cx - px * size, y1: cy - py * size, x2: cx + px * size, y2: cy + py * size });
  }
  return marks;
}

/** Points for `count` small ">"-style chevrons centred on segment a-b, for "parallel lines" marks. */
export function chevronPoints(a, b, count, { spacing = 8, size = 5 } = {}) {
  const { ux, uy } = segmentVector(a, b);
  const px = -uy;
  const py = ux;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const chevrons = [];
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spacing;
    const cx = mx + ux * offset;
    const cy = my + uy * offset;
    const tipX = cx + ux * size;
    const tipY = cy + uy * size;
    chevrons.push({
      x1: cx - ux * size + px * size,
      y1: cy - uy * size + py * size,
      x2: tipX,
      y2: tipY,
      x3: cx - ux * size - px * size,
      y3: cy - uy * size - py * size
    });
  }
  return chevrons;
}

/** Corner points of a small square marking a right angle at `at`, between rays toward `from` and `to`. */
export function rightAngleMarkerPoints(at, from, to, size = 12) {
  const v1 = segmentVector(at, from);
  const v2 = segmentVector(at, to);
  const p1 = { x: at.x + v1.ux * size, y: at.y + v1.uy * size };
  const p2 = { x: at.x + v1.ux * size + v2.ux * size, y: at.y + v1.uy * size + v2.uy * size };
  const p3 = { x: at.x + v2.ux * size, y: at.y + v2.uy * size };
  return [p1, p2, p3];
}

/* ---------------------- sectors, segments and shaded regions ---------------------- */
// Angles are bearings: degrees clockwise from the top, as seen on screen, the same
// convention as `arc` shapes and pie charts. Everything here works in screen space.

/** A circle as a closed path (two half arcs), so it can join other parts in one path. */
export function circlePath(cx, cy, r) {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
}

/** A sector (pie slice) from `start` to `end`, clockwise; 360° or more is the whole circle. */
export function sectorPath(cx, cy, r, start, end) {
  const sweep = end - start;
  if (sweep >= 360) return circlePath(cx, cy, r);
  const a = pointOnCircle(cx, cy, r, start);
  const b = pointOnCircle(cx, cy, r, end);
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
}

/** A circular segment: the region between the arc from `start` to `end` (clockwise) and its chord. */
export function segmentRegionPath(cx, cy, r, start, end) {
  const sweep = end - start;
  const a = pointOnCircle(cx, cy, r, start);
  const b = pointOnCircle(cx, cy, r, end);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
}

/** A closed polygon through screen points. */
export function polygonPath(points) {
  return `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
}

/** Shapes a shaded region can be built from. */
export const REGION_PART_TYPES = ['polygon', 'circle', 'sector', 'segment'];

/**
 * The SVG path for one part of a shaded region, given a `toScreen(pointId)` lookup and
 * the model-to-screen `scale` for radii; null if a point is missing.
 */
export function regionPartPath(part, toScreen, scale) {
  if (part.type === 'polygon') {
    const pts = (part.points || []).map(toScreen);
    return pts.length >= 3 && pts.every(Boolean) ? polygonPath(pts) : null;
  }
  const c = toScreen(part.center);
  if (!c) return null;
  const r = part.radius * scale;
  if (part.type === 'circle') return circlePath(c.x, c.y, r);
  if (part.type === 'sector') return sectorPath(c.x, c.y, r, part.startAngle, part.endAngle);
  if (part.type === 'segment') return segmentRegionPath(c.x, c.y, r, part.startAngle, part.endAngle);
  return null;
}
