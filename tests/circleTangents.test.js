/**
 * The geometry of two circles (src/utils/circleTangents.js): every common
 * tangent really touches both circles, the counts follow the positions, the
 * lengths match √(d² − (r₁ ∓ r₂)²), and the tangents cross the line of centres
 * where the ratio of the radii says.
 */

import { describe, it, expect } from 'vitest';

import {
  circleIntersections,
  circlePosition,
  commonTangents,
  directTangentLength,
  distance,
  lineCircleDistances,
  lineIntersection,
  signedDistance,
  tangentCentres,
  tangentCount,
  tangentsFromPoint,
  transverseTangentLength
} from '../src/utils/circleTangents.js';

const range = (from, to, step = 1) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);

/** Many pairs of circles, at awkward places and angles, including touching and nested ones. */
function* pairs() {
  for (const r1 of [1, 2.5, 4, 7]) {
    for (const r2 of [1, 3, 4, 6.5]) {
      for (const d of [0, 0.5, Math.abs(r1 - r2), (Math.abs(r1 - r2) + r1 + r2) / 2, r1 + r2, r1 + r2 + 0.75, 3 * (r1 + r2)]) {
        for (const angle of [0, 37, 140, 250]) {
          const c1 = { x: -1.5, y: 2 };
          const c2 = { x: c1.x + d * Math.cos((angle * Math.PI) / 180), y: c1.y + d * Math.sin((angle * Math.PI) / 180) };
          yield { r1, r2, d, c1, c2 };
        }
      }
    }
  }
}

describe('common tangents', () => {
  it('touch both circles: each line is r₁ from the first centre and r₂ from the second, and the touch points lie on the circles', () => {
    for (const { r1, r2, d, c1, c2 } of pairs()) {
      for (const line of commonTangents(c1, r1, c2, r2)) {
        const where = `${r1} ${r2} ${d} ${line.kind}`;
        expect(Math.hypot(line.normal.x, line.normal.y)).toBeCloseTo(1, 12);
        expect(distance(line.t1, c1), where).toBeCloseTo(r1, 9);
        expect(distance(line.t2, c2), where).toBeCloseTo(r2, 9);
        // The line through t1 with this normal is exactly r1 from c1 and r2 from c2 ...
        expect(Math.abs(signedDistance(c1, line.t1, line.normal)), where).toBeCloseTo(r1, 9);
        expect(Math.abs(signedDistance(c2, line.t1, line.normal)), where).toBeCloseTo(r2, 9);
        // ... and t2 lies on it.
        expect(signedDistance(line.t2, line.t1, line.normal), where).toBeCloseTo(0, 9);
        // Direct: both centres on the same side. Transverse: opposite sides (or the line runs through the touch point).
        const side = Math.sign(signedDistance(c1, line.t1, line.normal)) * Math.sign(signedDistance(c2, line.t1, line.normal));
        expect(side, where).toBe(line.kind === 'direct' ? 1 : -1);
      }
    }
  });

  it('come in the number the positions say: 4, 3, 2, 1 or 0', () => {
    for (const { r1, r2, d, c1, c2 } of pairs()) {
      const lines = commonTangents(c1, r1, c2, r2);
      const count = tangentCount(r1, r2, d);
      if (count === null) {
        expect(lines).toEqual([]); // the same circle twice: infinitely many, none listed
        continue;
      }
      expect(lines.length, `${r1} ${r2} ${d}`).toBe(count);
    }
    expect([tangentCount(5, 3, 10), tangentCount(5, 3, 8), tangentCount(5, 3, 5), tangentCount(5, 3, 2), tangentCount(5, 3, 1), tangentCount(5, 3, 0)]).toEqual([4, 3, 2, 1, 0, 0]);
    expect(tangentCount(4, 4, 0)).toBeNull();
  });

  it('agree with where the outlines cross', () => {
    for (const { r1, r2, d, c1, c2 } of pairs()) {
      const position = circlePosition(r1, r2, d);
      const crossings = circleIntersections(c1, r1, c2, r2);
      const expected = { apart: 0, 'touch-external': 1, intersect: 2, 'touch-internal': 1, inside: 0, concentric: 0, same: 0 }[position];
      expect(crossings.length, `${r1} ${r2} ${d} ${position}`).toBe(expected);
      for (const X of crossings) {
        expect(distance(X, c1)).toBeCloseTo(r1, 6);
        expect(distance(X, c2)).toBeCloseTo(r2, 6);
      }
    }
  });

  it('have the lengths √(d² − (r₁ − r₂)²) and √(d² − (r₁ + r₂)²), and DCT² − TCT² = 4r₁r₂', () => {
    for (const { r1, r2, d, c1, c2 } of pairs()) {
      const lines = commonTangents(c1, r1, c2, r2);
      const direct = lines.filter((l) => l.kind === 'direct');
      const transverse = lines.filter((l) => l.kind === 'transverse');
      for (const line of direct) expect(line.length).toBeCloseTo(directTangentLength(r1, r2, d), 9);
      for (const line of transverse) expect(line.length).toBeCloseTo(transverseTangentLength(r1, r2, d), 9);
      if (direct.length && transverse.length) expect(direct[0].length ** 2 - transverse[0].length ** 2).toBeCloseTo(4 * r1 * r2, 8);
    }
    expect(directTangentLength(8, 3, 13)).toBe(12);
    expect(transverseTangentLength(11, 4, 25)).toBe(20);
    expect(transverseTangentLength(5, 3, 6)).toBeNull();
    expect(directTangentLength(9, 2, 4)).toBeNull();
    expect(transverseTangentLength(5, 3, 8)).toBe(0); // touching: the tangent at the touch point
  });

  it('meet the line of centres where it is divided in the ratio of the radii', () => {
    for (const r1 of [3, 5, 9]) {
      for (const r2 of [1, 2, 4]) {
        for (const d of [r1 + r2 + 1, 2 * (r1 + r2), 20]) {
          const c1 = { x: 0, y: 0 };
          const c2 = { x: d, y: 0 };
          const { internal, external } = tangentCentres(r1, r2, d);
          for (const line of commonTangents(c1, r1, c2, r2)) {
            const X = lineIntersection(line.t1, { x: -line.normal.y, y: line.normal.x }, c1, { x: 1, y: 0 });
            expect(X.y).toBeCloseTo(0, 9);
            expect(X.x, `${r1} ${r2} ${d} ${line.kind}`).toBeCloseTo(line.kind === 'transverse' ? internal : external, 9);
          }
          // Internally and externally in r₁ : r₂.
          expect(internal / (d - internal)).toBeCloseTo(r1 / r2, 12);
          expect(external / (external - d)).toBeCloseTo(r1 / r2, 12);
        }
      }
    }
    expect(tangentCentres(4, 4, 10).external).toBeNull();
  });

  it('classifies positions at the boundaries', () => {
    expect(circlePosition(5, 3, 9)).toBe('apart');
    expect(circlePosition(5, 3, 8)).toBe('touch-external');
    expect(circlePosition(5, 3, 4)).toBe('intersect');
    expect(circlePosition(5, 3, 2)).toBe('touch-internal');
    expect(circlePosition(5, 3, 1)).toBe('inside');
    expect(circlePosition(5, 3, 0)).toBe('concentric');
    expect(circlePosition(5, 5, 0)).toBe('same');
  });
});

describe('tangent and secant from one point', () => {
  it('PT² = PA × PB for any line through P that cuts the circle', () => {
    const c = { x: 3, y: 4 };
    for (const r of [2, 5]) {
      for (const P of [{ x: 12, y: -1 }, { x: -6, y: 9 }]) {
        const { length, touches } = tangentsFromPoint(P, c, r);
        for (const T of touches) {
          expect(distance(T, c)).toBeCloseTo(r, 9);
          // The radius meets the tangent at a right angle.
          expect((T.x - c.x) * (P.x - T.x) + (T.y - c.y) * (P.y - T.y)).toBeCloseTo(0, 9);
          expect(distance(P, T)).toBeCloseTo(length, 9);
        }
        for (const angle of range(-60, 60, 7)) {
          const toward = Math.atan2(c.y - P.y, c.x - P.x) + (angle * Math.PI) / 1800;
          const [pa, pb] = lineCircleDistances(P, { x: Math.cos(toward), y: Math.sin(toward) }, c, r);
          expect(pa * pb).toBeCloseTo(length ** 2, 8);
        }
      }
    }
    expect(tangentsFromPoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 2)).toBeNull();
  });
});
