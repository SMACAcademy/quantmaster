/**
 * Chart math tests.
 *
 * The SVG rendering itself (src/components/Chart.js) isn't unit tested, in
 * keeping with the rest of the app: there's no DOM-rendering test harness here,
 * and it's exercised visually and by the content validator instead. What can
 * and should be tested is the pure math it depends on — axis scaling and pie
 * geometry — since a bug there silently mislabels every chart built on top of it.
 */

import { describe, it, expect } from 'vitest';

import { niceScale, scaleTicks, pointOnCircle, pieSectorPath, pieSectors } from '../src/utils/chartScale.js';

describe('niceScale', () => {
  it('rounds up to a round number above the data max', () => {
    expect(niceScale(87).max).toBeGreaterThanOrEqual(87);
    expect(niceScale(430).max).toBeGreaterThanOrEqual(430);
    expect(niceScale(9).max).toBeGreaterThanOrEqual(9);
  });

  it('picks a step that divides the max evenly', () => {
    const { max, step } = niceScale(87);
    expect(Number.isInteger(max / step)).toBe(true);
  });

  it('produces a "nice" step (1, 2, 5 or 10 times a power of ten)', () => {
    for (const max of [7, 42, 87, 430, 999, 12000]) {
      const { step } = niceScale(max);
      const magnitude = 10 ** Math.floor(Math.log10(step));
      const residual = Math.round((step / magnitude) * 1000) / 1000;
      expect([1, 2, 5, 10]).toContain(residual);
    }
  });

  it('handles zero and negative input without throwing', () => {
    expect(niceScale(0)).toEqual({ max: 1, step: 1 });
    expect(niceScale(-5)).toEqual({ max: 1, step: 1 });
    expect(niceScale(NaN)).toEqual({ max: 1, step: 1 });
  });
});

describe('scaleTicks', () => {
  it('starts at 0 and ends at the max', () => {
    const ticks = scaleTicks({ max: 100, step: 25 });
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(100);
  });

  it('spaces ticks evenly by the step', () => {
    const ticks = scaleTicks({ max: 20, step: 5 });
    expect(ticks).toEqual([0, 5, 10, 15, 20]);
  });
});

describe('pointOnCircle', () => {
  it('places 0 degrees at the top of the circle', () => {
    const p = pointOnCircle(0, 0, 10, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-10);
  });

  it('places 90 degrees at the right of the circle', () => {
    const p = pointOnCircle(0, 0, 10, 90);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(0);
  });

  it('places 180 degrees at the bottom of the circle', () => {
    const p = pointOnCircle(0, 0, 10, 180);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(10);
  });
});

describe('pieSectors', () => {
  it('splits values into sectors proportional to their share of the total', () => {
    const sectors = pieSectors([25, 25, 50]);
    expect(sectors[0].percent).toBeCloseTo(25);
    expect(sectors[1].percent).toBeCloseTo(25);
    expect(sectors[2].percent).toBeCloseTo(50);
  });

  it('sectors are contiguous and sum to 360 degrees', () => {
    const sectors = pieSectors([10, 20, 30, 40]);
    expect(sectors[0].startAngle).toBe(0);
    for (let i = 1; i < sectors.length; i++) {
      expect(sectors[i].startAngle).toBeCloseTo(sectors[i - 1].endAngle);
    }
    expect(sectors[sectors.length - 1].endAngle).toBeCloseTo(360);
  });

  it('does not divide by zero when every value is zero', () => {
    const sectors = pieSectors([0, 0, 0]);
    expect(sectors.every((s) => s.percent === 0)).toBe(true);
  });
});

describe('pieSectorPath', () => {
  it('produces a well-formed SVG path string', () => {
    const d = pieSectorPath(50, 50, 40, 0, 90);
    expect(d).toMatch(/^M 50 50 L /);
    expect(d).toContain('A 40 40 0');
    expect(d.trim().endsWith('Z')).toBe(true);
  });

  it('sets the large-arc-flag for sectors over 180 degrees', () => {
    const small = pieSectorPath(0, 0, 10, 0, 90);
    const large = pieSectorPath(0, 0, 10, 0, 270);
    expect(small).toContain('A 10 10 0 0 1');
    expect(large).toContain('A 10 10 0 1 1');
  });
});
