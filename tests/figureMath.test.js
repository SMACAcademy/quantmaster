/** Clock faces and number lines: the maths behind the figures. */

import { describe, it, expect } from 'vitest';

import { clockAngle, clockHandBearings, clockProblems, numberLineProblems, numberLineStep, numberLineTicks } from '../src/utils/figureMath.js';

describe('clock hands', () => {
  it('points the hands where a real clock does, the hour hand moving with the minutes', () => {
    expect(clockHandBearings(3, 0)).toEqual({ hour: 90, minute: 0 });
    expect(clockHandBearings(12, 30)).toEqual({ hour: 15, minute: 180 });
    expect(clockHandBearings(9, 45)).toEqual({ hour: 292.5, minute: 270 });
  });

  it('gives the smaller angle between them (30h − 5.5m, folded)', () => {
    expect(clockAngle(3, 40)).toBe(130);
    expect(clockAngle(12, 0)).toBe(0);
    expect(clockAngle(6, 0)).toBe(180);
    expect(clockAngle(10, 10)).toBe(115);
  });

  it('rejects times that are not on a clock', () => {
    expect(clockProblems({ hour: 3, minute: 40 })).toEqual([]);
    expect(clockProblems({ hour: 0, minute: 40 })).toHaveLength(1);
    expect(clockProblems({ hour: 3, minute: 60 })).toHaveLength(1);
    expect(clockProblems({ hour: 3, minute: 5, hands: 'seconds' })).toHaveLength(1);
  });
});

describe('number lines', () => {
  it('picks a readable tick step and clean ticks', () => {
    expect(numberLineStep(-5, 5)).toBe(1);
    expect(numberLineStep(0, 100)).toBe(10);
    expect(numberLineTicks(-1, 1, 0.5)).toEqual([-1, -0.5, 0, 0.5, 1]);
    expect(numberLineTicks(-2.5, 2.5, 1)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('accepts ranges that run off to infinity and rejects ones off the line', () => {
    expect(numberLineProblems({ min: -5, max: 5, ranges: [{ from: -2, to: null, fromOpen: true }] })).toEqual([]);
    expect(numberLineProblems({ min: -5, max: 5, ranges: [{ from: null, to: 3 }] })).toEqual([]);
    expect(numberLineProblems({ min: -5, max: 5, ranges: [{ from: -9, to: 3 }] })).toHaveLength(1);
    expect(numberLineProblems({ min: -5, max: 5, ranges: [{ from: 3, to: -1 }] })).toHaveLength(1);
    expect(numberLineProblems({ min: -5, max: 5, ranges: [{ from: 3 }] })).toHaveLength(1);
    expect(numberLineProblems({ min: 5, max: 5, points: [] })).toHaveLength(1);
    expect(numberLineProblems({ min: -5, max: 5 })).toHaveLength(1);
  });
});
