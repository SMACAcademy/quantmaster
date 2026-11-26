/**
 * The rotating-vector simulation (src/simulations/trigWaves.js): the value,
 * the peak and where it occurs held to an independent sweep of θ over many
 * settings, and the picture kept inside its view.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { waveText } from '../src/simulations/trigWaves.js';

const sim = getSimulation('trig-wave');
const compute = (values) => run(sim, { ...initialValues(sim), ...values }).result;
const RAD = Math.PI / 180;
const direct = (a, b, d) => a * Math.sin(d * RAD) + b * Math.cos(d * RAD);

/** The greatest value and where it occurs, by sweeping θ in steps of 0.01°. */
function sweepPeak(a, b) {
  let best = -Infinity;
  let at = 0;
  for (let k = 0; k < 36000; k++) {
    const d = k / 100;
    const v = direct(a, b, d);
    if (v > best) [best, at] = [v, d];
  }
  return { best, at };
}

/** Every point an item is drawn from. */
const itemPoints = (item) => [item.from, item.to, item.at, item.center, item.a, item.b].filter(Array.isArray);

function expectInsideView(plot, where) {
  const { xMin, xMax, yMin, yMax } = plot.view;
  for (const item of plot.items) {
    for (const [x, y] of itemPoints(item)) {
      expect(x, where).toBeGreaterThanOrEqual(xMin);
      expect(x, where).toBeLessThanOrEqual(xMax);
      expect(y, where).toBeGreaterThanOrEqual(yMin);
      expect(y, where).toBeLessThanOrEqual(yMax);
    }
    if (item.type === 'circle') {
      expect(item.center[0] - item.r, where).toBeGreaterThanOrEqual(xMin);
      expect(item.center[0] + item.r, where).toBeLessThanOrEqual(xMax);
      expect(item.center[1] - item.r, where).toBeGreaterThanOrEqual(yMin);
      expect(item.center[1] + item.r, where).toBeLessThanOrEqual(yMax);
    }
  }
}

describe('a sin θ + b cos θ as a rotating vector', () => {
  it('reads the value, the peak and where it comes from the sweep, never a + b', () => {
    for (let a = -12; a <= 12; a += 3) {
      for (let b = -12; b <= 12; b += 4) {
        if (!a && !b) continue;
        const { best, at } = sweepPeak(a, b);
        for (const theta of [0, 35, 90, 150, 225, 360]) {
          const where = `a=${a} b=${b} θ=${theta}`;
          const n = compute({ mode: 'combo', a, b, theta }).numbers;
          expect(n.value, where).toBeCloseTo(direct(a, b, theta), 9);
          expect(n.R, where).toBeCloseTo(best, 5);
          expect(Math.abs(n.value), where).toBeLessThanOrEqual(n.R + 1e-9);
          // The peak angle agrees with the sweep (allowing for 0° = 360°).
          const gap = Math.abs(n.peak - at);
          expect(Math.min(gap, 360 - gap), where).toBeLessThan(0.01);
          if (a && b) expect(n.sum, where).toBeGreaterThan(n.R);
        }
      }
    }
  });

  it('draws the arrows to scale: a, then b at right angles, ending at height a sin θ + b cos θ', () => {
    for (const [a, b] of [[3, 4], [-5, 12], [12, -5], [-7, -9], [0, 6], [8, 0]]) {
      for (let theta = 0; theta <= 360; theta += 15) {
        const result = compute({ mode: 'combo', a, b, theta });
        const [picture, graph] = result.plot.plots;
        const tip = picture.items.find((item) => item.type === 'point').at;
        expect(Math.hypot(...tip)).toBeCloseTo(Math.hypot(a, b), 9);
        expect(tip[1]).toBeCloseTo(direct(a, b, theta), 9);
        expect(picture.items.find((item) => item.type === 'circle').r).toBeCloseTo(Math.hypot(a, b), 9);
        expect(graph.markers[0]).toMatchObject({ x: theta });
        expect(graph.markers[0].y).toBeCloseTo(direct(a, b, theta), 9);
        for (const [x, y] of graph.series[0].points) expect(y).toBeCloseTo(direct(a, b, x), 9);
        expectInsideView(picture, `a=${a} b=${b} θ=${theta}`);
        // The wave and its guides fit the graph's range.
        for (const [, y] of graph.series.flatMap((s) => s.points)) expect(Math.abs(y)).toBeLessThanOrEqual(graph.y.max + 1e-9);
        for (const guide of graph.guides.filter((g) => g.axis === 'y')) expect(Math.abs(guide.value)).toBeLessThanOrEqual(graph.y.max + 1e-9);
      }
    }
  });

  it('marks |a| + |b| only when the wave cannot reach it', () => {
    const labels = (values) => compute({ mode: 'combo', ...values }).plot.plots[1].guides.map((g) => g.label);
    expect(labels({ a: 3, b: 4 })).toContain('|a| + |b| = 7 is never reached');
    expect(labels({ a: 0, b: 4 }).some((l) => l.startsWith('|a|'))).toBe(false);
    expect(compute({ mode: 'combo', a: 3, b: 4 }).readouts[2].value).toBe('5 at θ = 36.87°');
  });

  it('copes with a = b = 0', () => {
    const result = compute({ mode: 'combo', a: 0, b: 0, theta: 70 });
    expect(result.numbers).toMatchObject({ R: 0, value: 0 });
    expectInsideView(result.plot.plots[0], 'zero');
    expect(result.insight).toMatch(/nothing to turn/);
  });

  it('shows sin θ and cos θ on the unit circle, with θ in radians', () => {
    for (let theta = 0; theta <= 360; theta += 5) {
      const result = compute({ mode: 'unit', theta });
      const n = result.numbers;
      expect(n.sin).toBeCloseTo(Math.sin(theta * RAD), 12);
      expect(n.cos).toBeCloseTo(Math.cos(theta * RAD), 12);
      expect(n.radians).toBeCloseTo(theta * RAD, 12);
      expectInsideView(result.plot.plots[0], `unit θ=${theta}`);
    }
    expect(compute({ mode: 'unit', theta: 210 }).readouts[0].value).toBe('7π/6 ≈ 3.665 rad');
    expect(compute({ mode: 'unit', theta: 180 }).readouts[0].value).toBe('π rad');
  });

  it('names the expression the way the questions write it', () => {
    expect(waveText(3, 4)).toBe('3 sin θ + 4 cos θ');
    expect(waveText(12, -5)).toBe('12 sin θ − 5 cos θ');
    expect(waveText(-1, 1)).toBe('−sin θ + cos θ');
    expect(waveText(0, -6)).toBe('−6 cos θ');
    expect(waveText(0, 0)).toBe('0');
  });
});
