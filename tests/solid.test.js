/**
 * 3D solid drawings: the geometry behind them (utils/solidGeometry.js). The
 * SVG itself is checked in the browser, like the other figures.
 */

import { describe, it, expect } from 'vitest';

import { ELLIPSE_RATIO, solidDrawing, solidHeight, solidProblems } from '../src/utils/solidGeometry.js';

const solid = (...parts) => ({ type: 'solid', parts });
const near = (a, b) => Math.abs(a - b) < 1e-9;
const bounds = (drawing) => {
  const pts = drawing.lines.flatMap((l) => l.pts);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

describe('checking a solid figure', () => {
  it('accepts every shape on its own, and sensible stacks', () => {
    for (const part of [
      { shape: 'cube', a: 4 },
      { shape: 'cuboid', l: 6, b: 4, h: 3 },
      { shape: 'sphere', r: 7 },
      { shape: 'cylinder', r: 7, h: 10 },
      { shape: 'cone', r: 3, h: 4 },
      { shape: 'hemisphere', r: 5 },
      { shape: 'frustum', R: 6, r: 3, h: 4 }
    ]) {
      expect(solidProblems(solid(part)), part.shape).toEqual([]);
    }
    expect(solidProblems(solid({ shape: 'cylinder', r: 7, h: 10 }, { shape: 'cone', r: 7, h: 24 }))).toEqual([]);
    expect(solidProblems(solid({ shape: 'cone', r: 3, h: 9, down: true }, { shape: 'hemisphere', r: 3 }))).toEqual([]);
    expect(solidProblems(solid({ shape: 'hemisphere', r: 3, down: true }, { shape: 'cylinder', r: 3, h: 8 }, { shape: 'hemisphere', r: 3 }))).toEqual([]);
  });

  it('rejects what cannot be drawn or does not make sense', () => {
    expect(solidProblems({ type: 'solid' })).toHaveLength(1);
    expect(solidProblems(solid({ shape: 'pyramid', a: 3 }))[0]).toMatch(/shape must be one of/);
    expect(solidProblems(solid({ shape: 'cylinder', r: 7 }))[0]).toMatch(/positive h/);
    expect(solidProblems(solid({ shape: 'cylinder', r: -1, h: 2 }))[0]).toMatch(/positive r/);
    expect(solidProblems(solid({ shape: 'cube', a: 2 }, { shape: 'cube', a: 2 }))[0]).toMatch(/cannot be stacked/);
    expect(solidProblems(solid({ shape: 'cone', r: 2, h: 3 }, { shape: 'cylinder', r: 2, h: 3 }))[0]).toMatch(/point of a cone/);
    expect(solidProblems(solid({ shape: 'cylinder', r: 2, h: 3 }, { shape: 'cone', r: 2, h: 3, down: true }))[0]).toMatch(/bottom part/);
    expect(solidProblems(solid({ shape: 'cylinder', r: 2, h: 3, down: true }))[0]).toMatch(/only a cone or hemisphere/);
    expect(solidProblems(solid({ shape: 'cylinder', r: 2, h: 3, labels: { l: '5 cm' } }))[0]).toMatch(/label "l"/);
    expect(solidDrawing(solid({ shape: 'cylinder', r: 7 }))).toBeNull();
  });
});

describe('drawing', () => {
  it('draws a cuboid to scale with exactly three hidden edges', () => {
    const d = solidDrawing(solid({ shape: 'cuboid', l: 12, b: 4, h: 3, labels: { l: '12 cm', b: '4 cm', h: '3 cm' } }));
    expect(d.lines.filter((l) => l.dashed)).toHaveLength(3);
    const front = d.lines[0].pts;
    expect(front).toEqual([[0, 0], [12, 0], [12, 3], [0, 3], [0, 0]]);
    expect(d.labels.map((l) => l.text)).toEqual(['12 cm', '3 cm', '4 cm']);
    expect(d.fills).toHaveLength(1); // the top face is lightly shaded
  });

  it('adds the space diagonal as a dashed line when asked', () => {
    const d = solidDrawing(solid({ shape: 'cube', a: 5, labels: { a: '5 cm', d: '?' } }));
    const diagonal = d.lines[d.lines.length - 1];
    expect(diagonal.dashed).toBe(true);
    expect(diagonal.pts[0]).toEqual([0, 0]);
    expect(d.labels.map((l) => l.text)).toEqual(['5 cm', '?']);
  });

  it('draws a cylinder: the back of the base dashed, the top whole, the sides as tall as h', () => {
    const d = solidDrawing(solid({ shape: 'cylinder', r: 7, h: 10, labels: { r: '7 cm', h: '10 cm' } }));
    const b = bounds(d);
    expect(near(b.maxX - b.minX, 14)).toBe(true);
    expect(near(b.maxY - b.minY, 10 + 2 * ELLIPSE_RATIO * 7)).toBe(true);
    const dashedArcs = d.lines.filter((l) => l.dashed && l.pts.length > 2);
    expect(dashedArcs).toHaveLength(1);
    expect(dashedArcs[0].pts.every(([, y]) => y >= 0)).toBe(true); // the back half of the base, behind it
    expect(d.labels.map((l) => l.text)).toEqual(['7 cm', '10 cm']);
  });

  it('draws a cone with its apex at height h, and the slant label beside the side', () => {
    const d = solidDrawing(solid({ shape: 'cone', r: 3, h: 4, labels: { r: '3 cm', h: '4 cm', l: '?' } }));
    expect(near(bounds(d).maxY, 4)).toBe(true);
    const side = d.lines.find((l) => l.pts.length === 3);
    expect(side.pts).toEqual([[-3, 0], [0, 4], [3, 0]]);
    expect(d.labels.find((l) => l.text === '?').anchor).toBe('start');
  });

  it('turns a cone point-down for an ice-cream cone', () => {
    const d = solidDrawing(solid({ shape: 'cone', r: 3, h: 9, down: true }, { shape: 'hemisphere', r: 3 }));
    const side = d.lines.find((l) => l.pts.length === 3);
    expect(side.pts).toEqual([[-3, 9], [0, 0], [3, 9]]);
    expect(near(bounds(d).maxY, 12)).toBe(true);
    expect(solidHeight(solid({ shape: 'cone', r: 3, h: 9, down: true }, { shape: 'hemisphere', r: 3 }))).toBe(12);
  });

  it('stacks parts on one axis and draws each joint once, its back half dashed', () => {
    const fig = solid({ shape: 'cylinder', r: 7, h: 10 }, { shape: 'cone', r: 7, h: 24 });
    const d = solidDrawing(fig);
    expect(near(bounds(d).maxY, 34)).toBe(true);
    expect(solidHeight(fig)).toBe(34);
    const atJoint = d.lines.filter((l) => l.pts.length > 3 && l.pts.every(([, y]) => Math.abs(y - 10) <= ELLIPSE_RATIO * 7 + 1e-9));
    expect(atJoint).toHaveLength(2); // front half and back half, once
    expect(atJoint.filter((l) => l.dashed)).toHaveLength(1);
    expect(d.fills).toHaveLength(0); // no flat top: the cone covers it
  });

  it('draws a sphere as an outline with a dashed back to its equator', () => {
    const d = solidDrawing(solid({ shape: 'sphere', r: 7, labels: { r: '7 cm' } }));
    const b = bounds(d);
    expect(near(b.maxX - b.minX, 14)).toBe(true);
    expect(near(b.maxY - b.minY, 14)).toBe(true);
    expect(d.lines.filter((l) => l.dashed)).toHaveLength(2); // back of the equator, and the radius
  });

  it('never produces a number that cannot be drawn', () => {
    const figures = [
      solid({ shape: 'frustum', R: 6, r: 3, h: 4, labels: { R: '6', r: '3', h: '4', l: '5' } }),
      solid({ shape: 'hemisphere', r: 3, down: true }, { shape: 'cylinder', r: 3, h: 8 }, { shape: 'hemisphere', r: 3, labels: { r: '3 cm' } }),
      solid({ shape: 'cuboid', l: 0.5, b: 200, h: 3, labels: { d: '?' } })
    ];
    for (const fig of figures) {
      const d = solidDrawing(fig);
      for (const p of [...d.lines.flatMap((l) => l.pts), ...d.labels.map((l) => [l.x, l.y])]) {
        expect(p.every(Number.isFinite)).toBe(true);
      }
    }
  });
});
