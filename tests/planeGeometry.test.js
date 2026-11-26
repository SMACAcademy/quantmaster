/**
 * Coordinate-plane math tests — axis scaling and line-rectangle clipping.
 * As with chart.test.js, the SVG rendering itself isn't unit tested; this
 * covers the pure geometry it depends on, where a bug would silently
 * mislabel or mis-clip every plane figure built on top of it.
 */

import { describe, it, expect } from 'vitest';

import { axisStep, makeTransform, clipLineToRect } from '../src/utils/planeGeometry.js';

describe('axisStep', () => {
  it('uses a 1-unit step for small ranges', () => {
    expect(axisStep(-5, 5)).toBe(1);
    expect(axisStep(0, 10)).toBe(1);
  });

  it('picks a larger "nice" step for large ranges', () => {
    expect(axisStep(0, 100)).toBeGreaterThan(1);
  });
});

describe('makeTransform', () => {
  const box = { left: 20, top: 20, width: 200, height: 200 };

  it('maps the range extremes to the box edges', () => {
    const { toX, toY } = makeTransform([0, 10], [0, 10], box);
    expect(toX(0)).toBeCloseTo(20);
    expect(toX(10)).toBeCloseTo(220);
    // y is flipped: data-max maps to the top of the box, data-min to the bottom.
    expect(toY(10)).toBeCloseTo(20);
    expect(toY(0)).toBeCloseTo(220);
  });

  it('uses one locked scale for both axes, even with unequal ranges', () => {
    const { scale, toX, toY } = makeTransform([0, 10], [0, 20], box);
    // 20 units of y must fit in 200px, so scale is 10px/unit; x uses the same scale.
    expect(scale).toBeCloseTo(10);
    expect(toX(5) - toX(0)).toBeCloseTo(toY(5) - toY(10));
  });

  it('centres the plot when one axis has room to spare', () => {
    const { toX } = makeTransform([0, 5], [0, 10], box);
    // scale is capped by the y range (10px/unit), so the x extent (50px) sits centred in 200px.
    const left = toX(0);
    const right = toX(5);
    expect(left - box.left).toBeCloseTo(box.left + box.width - right, 5);
  });
});

describe('clipLineToRect', () => {
  const xRange = [-5, 5];
  const yRange = [-5, 5];

  it('clips a diagonal line through the origin to the rectangle corners', () => {
    const [a, b] = clipLineToRect({ x: 0, y: 0 }, { x: 1, y: 1 }, xRange, yRange);
    const points = [a, b].sort((p, q) => p.x - q.x);
    expect(points[0]).toEqual({ x: -5, y: -5 });
    expect(points[1]).toEqual({ x: 5, y: 5 });
  });

  it('clips a vertical line', () => {
    const [a, b] = clipLineToRect({ x: 2, y: 0 }, { x: 2, y: 3 }, xRange, yRange);
    expect(a.x).toBe(2);
    expect(b.x).toBe(2);
    expect([a.y, b.y].sort((p, q) => p - q)).toEqual([-5, 5]);
  });

  it('clips a horizontal line', () => {
    const [a, b] = clipLineToRect({ x: -1, y: 2 }, { x: 3, y: 2 }, xRange, yRange);
    expect(a.y).toBe(2);
    expect(b.y).toBe(2);
    expect([a.x, b.x].sort((p, q) => p - q)).toEqual([-5, 5]);
  });

  it('clips a shallow line to the left/right edges rather than top/bottom', () => {
    const [a, b] = clipLineToRect({ x: 0, y: 0 }, { x: 10, y: 1 }, xRange, yRange);
    const points = [a, b].sort((p, q) => p.x - q.x);
    expect(points[0].x).toBeCloseTo(-5);
    expect(points[1].x).toBeCloseTo(5);
  });

  it('returns null when the infinite line never crosses the rectangle', () => {
    // A horizontal line at y=10 never enters the y in [-5, 5] band, however far it extends.
    expect(clipLineToRect({ x: 0, y: 10 }, { x: 5, y: 10 }, xRange, yRange)).toBeNull();
  });
});
