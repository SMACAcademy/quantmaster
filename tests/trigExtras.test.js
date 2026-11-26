/**
 * The trigonometry helpers behind the Advanced unit's generators and the
 * rotating-vector simulation, each held to Math.sin and friends or to a
 * brute-force sweep.
 */

import { describe, it, expect } from 'vitest';

import { RAD, amplitude, peakAngle, phase, piFractionText, radianFraction, radianText, rootsOf, rotatingVector, surdValue, sweepExtremes, waveValue } from '../src/utils/trigExtras.js';

describe('radian measure', () => {
  it('writes whole degrees as fractions of π in lowest terms', () => {
    expect(radianFraction(210)).toEqual([7, 6]);
    expect(radianFraction(0)).toEqual([0, 1]);
    expect(radianText(0)).toBe('0');
    expect(radianText(180)).toBe('π');
    expect(radianText(360)).toBe('2π');
    expect(radianText(30)).toBe('π/6');
    expect(radianText(135)).toBe('3π/4');
    expect(radianText(5)).toBe('π/36');
    expect(piFractionText(-3, 4)).toBe('−3π/4');
    expect(piFractionText(10, 4)).toBe('5π/2');
  });

  it('agrees with degrees × π/180 for every whole degree', () => {
    for (let d = 0; d <= 720; d++) {
      const [k, n] = radianFraction(d);
      expect(k * 180).toBe(d * n); // k/n = d/180 exactly
      expect(surdValue(radianText(d))).toBeCloseTo(d * RAD, 12);
    }
  });
});

describe('reading exact values', () => {
  it('reads surds, π and fractions the way the questions write them', () => {
    const cases = {
      '2 − √3': 2 - Math.sqrt(3),
      '2 + √3': 2 + Math.sqrt(3),
      '(√3 − 1)/(2√2)': (Math.sqrt(3) - 1) / (2 * Math.sqrt(2)),
      '(√3 + 1)/(2√2)': (Math.sqrt(3) + 1) / (2 * Math.sqrt(2)),
      '√6/2': Math.sqrt(6) / 2,
      '1/√2': 1 / Math.sqrt(2),
      '2√3': 2 * Math.sqrt(3),
      '7π/6': (7 * Math.PI) / 6,
      'π': Math.PI,
      '−1/2': -0.5,
      '3/4': 0.75,
      '1.5': 1.5,
      '√2 + 1': Math.SQRT2 + 1,
      '2 × 3': 6
    };
    for (const [text, value] of Object.entries(cases)) expect(surdValue(text), text).toBeCloseTo(value, 12);
  });

  it('matches the standard and 15° values', () => {
    const at = (d) => ({ sin: Math.sin(d * RAD), cos: Math.cos(d * RAD), tan: Math.tan(d * RAD) });
    expect(surdValue('(√3 − 1)/(2√2)')).toBeCloseTo(at(15).sin, 12);
    expect(surdValue('2 − √3')).toBeCloseTo(at(15).tan, 12);
    expect(surdValue('2 + √3')).toBeCloseTo(at(75).tan, 12);
    expect(surdValue('√3/2')).toBeCloseTo(at(60).sin, 12);
  });

  it('refuses what it cannot read', () => {
    for (const text of ['', 'abc', '2 +', '(1 + 2', '√', '3)', 'sin 30°']) expect(surdValue(text), text).toBeNaN();
  });
});

describe('a sin θ + b cos θ', () => {
  const sweep = (a, b) => sweepExtremes((d) => waveValue(a, b, d), 0, 360, 0.01);

  it('peaks at √(a² + b²), never a + b, at the angle peakAngle gives', () => {
    for (let a = -12; a <= 12; a += 3) {
      for (let b = -12; b <= 12; b += 4) {
        if (!a && !b) continue;
        const R = amplitude(a, b);
        const { min, max } = sweep(a, b);
        expect(max, `${a}, ${b}`).toBeCloseTo(R, 5);
        expect(min, `${a}, ${b}`).toBeCloseTo(-R, 5);
        expect(waveValue(a, b, peakAngle(a, b))).toBeCloseTo(R, 9);
        expect(peakAngle(a, b)).toBeGreaterThanOrEqual(0);
        expect(peakAngle(a, b)).toBeLessThan(360);
        if (a && b) expect(Math.abs(a) + Math.abs(b)).toBeGreaterThan(R + 1e-9);
      }
    }
    expect(amplitude(3, 4)).toBe(5);
    expect(peakAngle(1, 1)).toBeCloseTo(45, 9);
    expect(peakAngle(0, 1)).toBe(0);
  });

  it('is R sin(θ + α)', () => {
    for (const [a, b] of [[3, 4], [-5, 12], [8, -15], [0, -7]]) {
      for (let d = 0; d < 360; d += 7) {
        expect(waveValue(a, b, d)).toBeCloseTo(amplitude(a, b) * Math.sin((d + phase(a, b)) * RAD), 9);
      }
    }
  });

  it('adds two arrows at right angles into one of length √(a² + b²) whose height is the value', () => {
    for (const [a, b] of [[3, 4], [-5, 12], [12, -5], [7, 0]]) {
      for (let d = 0; d <= 360; d += 15) {
        const { A, P } = rotatingVector(a, b, d);
        expect(Math.hypot(...A)).toBeCloseTo(Math.abs(a), 9);
        expect(Math.hypot(P[0] - A[0], P[1] - A[1])).toBeCloseTo(Math.abs(b), 9);
        expect(A[0] * (P[0] - A[0]) + A[1] * (P[1] - A[1])).toBeCloseTo(0, 9); // at right angles
        expect(Math.hypot(...P)).toBeCloseTo(amplitude(a, b), 9);
        expect(P[1]).toBeCloseTo(waveValue(a, b, d), 9);
      }
    }
  });
});

describe('numeric sweeps', () => {
  it('finds extremes and where they occur', () => {
    const { min, max, argMin, argMax } = sweepExtremes((x) => (x - 2) ** 2, 0, 5, 0.5);
    expect([min, argMin, max, argMax]).toEqual([0, 2, 9, 5]);
  });

  it('finds the roots of simple trig equations at standard angles', () => {
    const s = (d) => Math.sin(d * RAD);
    // 2 sin²θ − 3 sin θ + 1 = 0: sin θ = 1/2 or 1.
    const roots = rootsOf((d) => 2 * s(d) ** 2 - 3 * s(d) + 1, 0.5, 179.5, 0.5);
    expect(roots.map((r) => Math.round(r * 1e6) / 1e6)).toEqual([30, 90, 150]);
    // sin 3θ = cos(θ − 6°) for 0 < θ < 30.
    const one = rootsOf((d) => s(3 * d) - Math.cos((d - 6) * RAD), 0.1, 29.9, 0.1);
    expect(one).toHaveLength(1);
    expect(one[0]).toBeCloseTo(24, 9);
    expect(rootsOf((x) => x * x + 1, -3, 3, 0.1)).toEqual([]);
  });
});
