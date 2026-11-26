/**
 * Pure geometry of two circles: their common tangents (lines and touch points),
 * how they sit relative to each other, where the tangents cross the line of
 * centres, and the tangent from an outside point. No DOM, so the question
 * templates, the simulation and the tests all share it.
 *
 * Points are { x, y } in model units. A tangent line is described by its unit
 * normal n and the touch points: the touch point on circle 1 is C1 − r1·n and
 * on circle 2 is C2 − s·r2·n, where s = +1 for a direct tangent (both circles
 * on the same side of the line) and s = −1 for a transverse one (the line runs
 * between them).
 */

const EPS = 1e-9;

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * How two circles sit, from the distance d between centres:
 * 'same' (one circle twice), 'concentric', 'inside', 'touch-internal',
 * 'intersect', 'touch-external' or 'apart'.
 */
export function circlePosition(r1, r2, d, tolerance = EPS) {
  const sum = r1 + r2;
  const gap = Math.abs(r1 - r2);
  if (d <= tolerance) return gap <= tolerance ? 'same' : 'concentric';
  if (d > sum + tolerance) return 'apart';
  if (Math.abs(d - sum) <= tolerance) return 'touch-external';
  if (d > gap + tolerance) return 'intersect';
  if (Math.abs(d - gap) <= tolerance) return 'touch-internal';
  return 'inside';
}

/** Number of common tangents for each position (null: infinitely many, the circles coincide). */
const COUNTS = { apart: 4, 'touch-external': 3, intersect: 2, 'touch-internal': 1, inside: 0, concentric: 0, same: null };

export function tangentCount(r1, r2, d, tolerance = EPS) {
  return COUNTS[circlePosition(r1, r2, d, tolerance)];
}

/** Length of the direct common tangent, √(d² − (r1 − r2)²); null when there is none. */
export function directTangentLength(r1, r2, d) {
  const square = d * d - (r1 - r2) ** 2;
  if (d <= EPS || square < -EPS) return null;
  return Math.sqrt(Math.max(0, square));
}

/** Length of the transverse common tangent, √(d² − (r1 + r2)²); null when there is none. */
export function transverseTangentLength(r1, r2, d) {
  const square = d * d - (r1 + r2) ** 2;
  if (square < -EPS) return null;
  return Math.sqrt(Math.max(0, square));
}

/**
 * Every common tangent of circle (c1, r1) and circle (c2, r2), constructed from
 * the condition that the line is r1 from c1 and r2 from c2:
 * [{ kind: 'direct' | 'transverse', normal, t1, t2, length }]
 * t1 and t2 are the touch points on circle 1 and circle 2 (the same point where
 * the circles touch). Concentric or coincident circles give an empty list.
 */
export function commonTangents(c1, r1, c2, r2) {
  const v = sub(c2, c1);
  const d = Math.hypot(v.x, v.y);
  if (d <= EPS) return [];
  const phi = Math.atan2(v.y, v.x);
  const lines = [];
  for (const [kind, s] of [
    ['direct', 1],
    ['transverse', -1]
  ]) {
    // n · (c2 − c1) = s·r2 − r1, with n = (cos θ, sin θ): cos(θ − φ) = (s·r2 − r1) / d.
    const k = (s * r2 - r1) / d;
    if (Math.abs(k) > 1 + EPS) continue;
    const spread = Math.acos(Math.max(-1, Math.min(1, k)));
    // Touching circles: the two tangents of this kind merge into the one at the touch point.
    const angles = spread <= 1e-7 ? [phi] : Math.PI - spread <= 1e-7 ? [phi + Math.PI] : [phi + spread, phi - spread];
    for (const theta of angles) {
      const normal = { x: Math.cos(theta), y: Math.sin(theta) };
      const t1 = { x: c1.x - r1 * normal.x, y: c1.y - r1 * normal.y };
      const t2 = { x: c2.x - s * r2 * normal.x, y: c2.y - s * r2 * normal.y };
      lines.push({ kind, normal, t1, t2, length: distance(t1, t2) });
    }
  }
  return lines;
}

/** Signed distance of point p from the line through t with unit normal n (positive on the side n points to). */
export const signedDistance = (p, t, n) => (p.x - t.x) * n.x + (p.y - t.y) * n.y;

/**
 * The points where the circles' outlines cross (0, 1 or 2 of them), found by
 * coordinates: a different route to the position than comparing d with r1 ± r2.
 */
export function circleIntersections(c1, r1, c2, r2, tolerance = 1e-7) {
  const v = sub(c2, c1);
  const d = Math.hypot(v.x, v.y);
  if (d <= EPS) return [];
  // Along the line of centres, the common chord is a from c1; h is half its length.
  const a = (d * d + r1 * r1 - r2 * r2) / (2 * d);
  const h2 = r1 * r1 - a * a;
  if (h2 < -tolerance * Math.max(1, r1 * r1)) return [];
  const u = { x: v.x / d, y: v.y / d };
  const m = { x: c1.x + a * u.x, y: c1.y + a * u.y };
  if (h2 <= tolerance * Math.max(1, r1 * r1)) return [m];
  const h = Math.sqrt(h2);
  return [
    { x: m.x - h * u.y, y: m.y + h * u.x },
    { x: m.x + h * u.y, y: m.y - h * u.x }
  ];
}

/**
 * Where the common tangents cross the line of centres, as distances from c1
 * towards c2: the transverse ones at d·r1/(r1 + r2) (dividing c1c2 internally
 * in r1 : r2), the direct ones at d·r1/(r1 − r2) (externally, beyond the
 * smaller circle; null for equal radii, when they are parallel to it).
 */
export function tangentCentres(r1, r2, d) {
  return {
    internal: (d * r1) / (r1 + r2),
    external: Math.abs(r1 - r2) <= EPS ? null : (d * r1) / (r1 - r2)
  };
}

/** Where line (p, direction dir) meets line (q, direction dir2); null if parallel. */
export function lineIntersection(p, dir, q, dir2) {
  const cross = dir.x * dir2.y - dir.y * dir2.x;
  if (Math.abs(cross) <= EPS) return null;
  const t = ((q.x - p.x) * dir2.y - (q.y - p.y) * dir2.x) / cross;
  return { x: p.x + t * dir.x, y: p.y + t * dir.y };
}

/**
 * The two touch points of the tangents from an outside point p to circle (c, r),
 * and the tangent length √(|pc|² − r²); null when p is not outside.
 */
export function tangentsFromPoint(p, c, r) {
  const D = distance(p, c);
  if (D <= r + EPS) return null;
  const length = Math.sqrt(D * D - r * r);
  // The touch points lie on the circle, seen from c at ±acos(r/D) from the direction of p.
  const base = Math.atan2(p.y - c.y, p.x - c.x);
  const spread = Math.acos(r / D);
  const at = (angle) => ({ x: c.x + r * Math.cos(angle), y: c.y + r * Math.sin(angle) });
  return { length, touches: [at(base + spread), at(base - spread)] };
}

/** Where the line from p in direction dir crosses circle (c, r): the distances along it (0, 1 or 2, ascending). */
export function lineCircleDistances(p, dir, c, r) {
  const len = Math.hypot(dir.x, dir.y);
  const u = { x: dir.x / len, y: dir.y / len };
  const w = sub(p, c);
  const b = w.x * u.x + w.y * u.y;
  const disc = b * b - (w.x * w.x + w.y * w.y - r * r);
  if (disc < -EPS) return [];
  if (disc <= EPS) return [-b];
  const root = Math.sqrt(disc);
  return [-b - root, -b + root];
}
