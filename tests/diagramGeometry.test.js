/**
 * Free-form shape diagram math tests: bounds fitting, bearing/angle-arc
 * geometry, and the vector arithmetic behind tick marks, parallel-line
 * chevrons and right-angle markers.
 */

import { describe, it, expect } from 'vitest';

import {
  computeBounds,
  bearingDeg,
  minorArc,
  angleArcPath,
  tickMarkSegments,
  chevronPoints,
  rightAngleMarkerPoints,
  circlePath,
  sectorPath,
  segmentRegionPath,
  regionPartPath
} from '../src/utils/diagramGeometry.js';

describe('computeBounds', () => {
  it('fits the bounding box of the points with padding on every side', () => {
    const { xRange, yRange } = computeBounds([{ x: 0, y: 0 }, { x: 4, y: 6 }, { x: -2, y: 3 }], 1);
    expect(xRange).toEqual([-3, 5]);
    expect(yRange).toEqual([-1, 7]);
  });
});

describe('bearingDeg', () => {
  it('matches chartScale.pointOnCircle\'s "clockwise from top" convention', () => {
    expect(bearingDeg(0, -1)).toBeCloseTo(0); // straight up
    expect(bearingDeg(1, 0)).toBeCloseTo(90); // right
    expect(bearingDeg(0, 1)).toBeCloseTo(180); // down
    expect(bearingDeg(-1, 0)).toBeCloseTo(270); // left
  });
});

describe('minorArc', () => {
  it('sweeps the shorter way between two bearings', () => {
    const { startAngle, endAngle, degrees } = minorArc(10, 100);
    expect(startAngle).toBe(10);
    expect(endAngle).toBe(100);
    expect(degrees).toBeCloseTo(90);
  });

  it('swaps direction when the forward sweep would exceed 180 degrees', () => {
    const { startAngle, endAngle, degrees } = minorArc(350, 10);
    // Forward 350->10 is 20 degrees already (wraps through 0), so no swap needed here.
    expect(degrees).toBeCloseTo(20);
    expect(((endAngle - startAngle) % 360 + 360) % 360).toBeCloseTo(20);
  });

  it('always returns an angle of 180 degrees or less', () => {
    for (const [b1, b2] of [[0, 190], [45, 300], [0, 359], [200, 10]]) {
      const { degrees } = minorArc(b1, b2);
      expect(degrees).toBeLessThanOrEqual(180);
      expect(degrees).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('angleArcPath', () => {
  it('produces an open arc path (no centre line, no close)', () => {
    const d = angleArcPath(50, 50, 20, 0, 90);
    expect(d).toMatch(/^M /);
    expect(d).toContain('A 20 20 0 0 1');
    expect(d).not.toContain('L 50 50');
    expect(d.trim().endsWith('Z')).toBe(false);
  });
});

describe('tickMarkSegments', () => {
  it('centres a single tick at the segment midpoint, perpendicular to it', () => {
    const [mark] = tickMarkSegments({ x: 0, y: 0 }, { x: 10, y: 0 }, 1, { size: 4 });
    // Segment is horizontal, so the perpendicular tick is vertical, centred at x=5.
    expect(mark.x1).toBeCloseTo(5);
    expect(mark.x2).toBeCloseTo(5);
    expect(mark.y1).toBeCloseTo(-4);
    expect(mark.y2).toBeCloseTo(4);
  });

  it('spaces multiple ticks symmetrically around the midpoint', () => {
    const marks = tickMarkSegments({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, { spacing: 6, size: 4 });
    expect(marks).toHaveLength(2);
    const centres = marks.map((m) => (m.x1 + m.x2) / 2);
    expect(centres[0] + centres[1]).toBeCloseTo(10); // symmetric about x=5
  });
});

describe('chevronPoints', () => {
  it('points the chevron tip along the segment direction', () => {
    const [chevron] = chevronPoints({ x: 0, y: 0 }, { x: 10, y: 0 }, 1, { size: 4 });
    // Direction is along +x, so the tip (x2,y2) should be further along +x than the two wings.
    expect(chevron.x2).toBeGreaterThan(chevron.x1);
    expect(chevron.x2).toBeGreaterThan(chevron.x3);
  });
});

describe('rightAngleMarkerPoints', () => {
  it('builds a square corner for an axis-aligned right angle', () => {
    const [p1, p2, p3] = rightAngleMarkerPoints({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, 1);
    expect(p1).toEqual({ x: 1, y: 0 });
    expect(p2).toEqual({ x: 1, y: 1 });
    expect(p3).toEqual({ x: 0, y: 1 });
  });
});

describe('sectors, segments and shaded regions', () => {
  // Numbers in a path, so its geometry can be checked without caring about spacing.
  const nums = (d) => d.match(/-?\d+(\.\d+)?(e-?\d+)?/g).map(Number);
  const close = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-9);

  it('draws a quarter sector from the centre, along the arc, and back', () => {
    // Bearings: 0 is straight up, 90 is to the right (clockwise, as seen on screen).
    const d = sectorPath(100, 100, 50, 0, 90);
    expect(d.startsWith('M 100 100 L')).toBe(true);
    expect(close(nums(d), [100, 100, 100, 50, 50, 50, 0, 0, 1, 150, 100])).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('uses the large-arc flag only past 180°, and a whole circle at 360°', () => {
    expect(nums(sectorPath(0, 0, 10, 0, 270))[7]).toBe(1);
    expect(nums(sectorPath(0, 0, 10, 0, 120))[7]).toBe(0);
    expect(sectorPath(5, 5, 10, 0, 360)).toBe(circlePath(5, 5, 10));
  });

  it('closes a circular segment with its chord, not through the centre', () => {
    const d = segmentRegionPath(100, 100, 50, 270, 360);
    expect(d.startsWith('M 50 100 A')).toBe(true);
    expect(d).not.toContain('L 100 100');
    expect(close(nums(d).slice(-2), [100, 50])).toBe(true);
  });

  it('builds each kind of region part from point ids, scaling radii', () => {
    const at = { O: { x: 10, y: 20 }, A: { x: 0, y: 0 }, B: { x: 4, y: 0 }, C: { x: 4, y: 3 } };
    const toScreen = (id) => at[id] || null;
    expect(regionPartPath({ type: 'polygon', points: ['A', 'B', 'C'] }, toScreen, 2)).toBe('M 0 0 L 4 0 L 4 3 Z');
    expect(regionPartPath({ type: 'circle', center: 'O', radius: 3 }, toScreen, 2)).toBe(circlePath(10, 20, 6));
    expect(regionPartPath({ type: 'sector', center: 'O', radius: 3, startAngle: 0, endAngle: 90 }, toScreen, 2)).toBe(sectorPath(10, 20, 6, 0, 90));
    expect(regionPartPath({ type: 'segment', center: 'O', radius: 3, startAngle: 0, endAngle: 90 }, toScreen, 2)).toBe(segmentRegionPath(10, 20, 6, 0, 90));
    expect(regionPartPath({ type: 'polygon', points: ['A', 'B', 'Z'] }, toScreen, 2)).toBeNull();
    expect(regionPartPath({ type: 'circle', center: 'Z', radius: 3 }, toScreen, 2)).toBeNull();
  });
});
