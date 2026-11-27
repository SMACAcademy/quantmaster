/** The landing page's journey (landing/journey.js): stations, scroll maths, first-visit rule. */

import { describe, it, expect } from 'vitest';

import { STATIONS, ease, focusOf, progressFromScroll } from '../src/landing/journey.js';
import { SIMULATION_META } from '../src/simulations/meta.js';
import topicsFile from '../src/data/topics.json';

const topicIds = new Set((topicsFile.topics || topicsFile).map((t) => t.id));
const simulationIds = new Set(SIMULATION_META.map((s) => s.id));

describe('stations', () => {
  it('start at the hero and end at the finale, with unique ids', () => {
    expect(STATIONS[0].id).toBe('hero');
    expect(STATIONS.at(-1).id).toBe('finale');
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
  });

  it('link only to topics and simulations that exist', () => {
    for (const station of STATIONS.filter((s) => s.title)) {
      expect(station.topics.length, station.id).toBeGreaterThan(0);
      for (const id of station.topics) expect(topicIds.has(id), `${station.id}: topic ${id}`).toBe(true);
      expect(simulationIds.has(station.simulation), `${station.id}: simulation ${station.simulation}`).toBe(true);
      expect(station.teaser.question.length, station.id).toBeGreaterThan(20);
      expect(station.teaser.answer.length, station.id).toBeGreaterThan(10);
      expect(['left', 'right']).toContain(station.side);
    }
  });

  it('alternate sides, so the cards zig-zag down the page', () => {
    const sides = STATIONS.filter((s) => s.title).map((s) => s.side);
    sides.slice(1).forEach((side, i) => expect(side).not.toBe(sides[i]));
  });
});

describe('teaser answers', () => {
  it('match the arithmetic they claim', () => {
    expect(300 / (60 + 40)).toBe(3);
    expect(1 / (1 / 12 + 1 / 15 - 1 / 20)).toBeCloseTo(10, 10);
    expect([1, 2, 3, 4, 5, 6, 7].reduce((a, b) => a * b, 1)).toBe(5040);
    expect(0.32 * 360).toBeCloseTo(115.2, 10);
    expect(Math.abs(30 * 3 - 5.5 * 40)).toBe(130);
    expect(10000 * 1.1 * 1.1 - 10000 - 2 * 1000).toBeCloseTo(100, 6);
  });
});

describe('progressFromScroll', () => {
  const anchors = [0, 1000, 2000, 4000];
  it('maps scroll between anchors to a fractional station', () => {
    expect(progressFromScroll(0, anchors)).toBe(0);
    expect(progressFromScroll(500, anchors)).toBe(0.5);
    expect(progressFromScroll(1000, anchors)).toBe(1);
    expect(progressFromScroll(3000, anchors)).toBe(2.5);
  });
  it('holds at the ends', () => {
    expect(progressFromScroll(-50, anchors)).toBe(0);
    expect(progressFromScroll(9999, anchors)).toBe(3);
    expect(progressFromScroll(10, [])).toBe(0);
  });
  it('copes with two anchors at the same place', () => {
    expect(progressFromScroll(1000, [0, 1000, 1000])).toBe(1);
    expect(progressFromScroll(1001, [0, 1000, 1000])).toBe(2);
  });
});

describe('easing and focus', () => {
  it('eases from 0 to 1 symmetrically', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(-1)).toBe(0);
    expect(ease(2)).toBe(1);
  });
  it('focuses fully on the current station and not at all one away', () => {
    expect(focusOf(3, 3)).toBe(1);
    expect(focusOf(3.5, 3)).toBe(0.5);
    expect(focusOf(4, 3)).toBe(0);
    expect(focusOf(1, 3)).toBe(0);
  });
});
