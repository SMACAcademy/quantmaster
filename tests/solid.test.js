/**
 * 3D solid drawings: the geometry behind them (utils/solidGeometry.js). The
 * SVG itself is checked in the browser, like the other figures.
 */

import { describe, it, expect } from 'vitest';

import { ELLIPSE_RATIO, baseCorners, solidDrawing, solidHeight, solidProblems } from '../src/utils/solidGeometry.js';

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
    expect(solidProblems(solid({ shape: 'torus', a: 3 }))[0]).toMatch(/shape must be one of/);
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
      solid({ shape: 'prism', base: 'hexagon', a: 0.3, h: 90, labels: { a: '?', h: '90 cm' } }),
      solid({ shape: 'pyramid', base: 'triangle', a: 50, h: 0.2, labels: { a: '50', h: '0.2', l: '?', e: 'e' } }),
      solid({ shape: 'pyramid-frustum', base: 'square', a: 12, b: 0.01, h: 9, labels: { a: '12', b: '?', h: '9', l: 'l' } }),
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

describe('prisms, pyramids and pyramid frustums', () => {
  const dist = (p, q) => Math.hypot(...p.map((v, i) => v - q[i]));
  const edges = (d) => d.lines.filter((l) => l.pts.length === 2);
  /** Convex hull of points (monotone chain), as a list of points in order. */
  function hull(points) {
    const pts = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const half = (list) => {
      const out = [];
      for (const p of list) {
        while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 1e-9) out.pop();
        out.push(p);
      }
      out.pop();
      return out;
    };
    return [...half(pts), ...half([...pts].reverse())];
  }
  const samePoint = (p, q) => near(p[0], q[0]) && near(p[1], q[1]);

  const shapes = [
    { part: { shape: 'prism', base: 'triangle', a: 8, h: 10 }, edges: 9, hidden: 3 },
    { part: { shape: 'prism', base: 'right-triangle', a: 6, b: 8, h: 15 }, edges: 9, hidden: 1 },
    { part: { shape: 'prism', base: 'square', a: 6, h: 4 }, edges: 12, hidden: 3 },
    { part: { shape: 'prism', base: 'hexagon', a: 4, h: 10 }, edges: 18, hidden: 5 },
    { part: { shape: 'pyramid', base: 'triangle', a: 8, h: 9 }, edges: 6, hidden: 3 },
    { part: { shape: 'pyramid', base: 'square', a: 12, h: 8 }, edges: 8, hidden: 3 },
    { part: { shape: 'pyramid', base: 'hexagon', a: 6, h: 8 }, edges: 12, hidden: 5 },
    { part: { shape: 'pyramid-frustum', base: 'square', a: 12, b: 6, h: 9 }, edges: 12, hidden: 3 }
  ];

  it('accepts each base, and rejects missing or mismatched sizes', () => {
    for (const { part } of shapes) expect(solidProblems(solid(part)), `${part.shape} ${part.base}`).toEqual([]);
    expect(solidProblems(solid({ shape: 'prism', a: 4, h: 5 }))[0]).toMatch(/needs a base/);
    expect(solidProblems(solid({ shape: 'pyramid', base: 'right-triangle', a: 4, h: 5 }))[0]).toMatch(/needs a base/);
    expect(solidProblems(solid({ shape: 'prism', base: 'right-triangle', a: 4, h: 5 }))[0]).toMatch(/positive b/);
    expect(solidProblems(solid({ shape: 'prism', base: 'square', a: 4, h: 5, labels: { b: '3 cm' } }))[0]).toMatch(/second leg/);
    expect(solidProblems(solid({ shape: 'pyramid-frustum', base: 'square', a: 4, b: 4, h: 5 }))[0]).toMatch(/smaller/);
    expect(solidProblems(solid({ shape: 'cylinder', base: 'square', r: 4, h: 5 }))[0]).toMatch(/only a prism/);
    expect(solidProblems(solid({ shape: 'pyramid', base: 'square', a: 4, h: 5, labels: { r: '2' } }))[0]).toMatch(/label "r"/);
    expect(solidProblems(solid({ shape: 'prism', base: 'square', a: 4, h: 5 }, { shape: 'cone', r: 2, h: 3 }))[0]).toMatch(/cannot be stacked/);
  });

  it('builds bases of the right size: equal sides, or a right angle between legs a and b', () => {
    for (const [base, n] of [['triangle', 3], ['square', 4], ['hexagon', 6]]) {
      const c = baseCorners(base, 5);
      expect(c).toHaveLength(n);
      c.forEach((p, i) => expect(near(dist(p, c[(i + 1) % n]), 5), `${base} side ${i}`).toBe(true));
    }
    const [p0, p1, p2] = baseCorners('right-triangle', 6, 8);
    expect(near(dist(p0, p1), 6)).toBe(true);
    expect(near(dist(p0, p2), 8)).toBe(true);
    expect(near(dist(p1, p2), 10)).toBe(true);
  });

  it.each(shapes)('draws a $part.base $part.shape with every edge once, the right ones hidden, the outline solid', ({ part, edges: count, hidden }) => {
    const d = solidDrawing(solid(part));
    expect(edges(d)).toHaveLength(count);
    expect(edges(d).filter((l) => l.dashed)).toHaveLength(hidden);
    // Every edge along the outline of the drawing is seen, never dashed.
    const outline = hull(edges(d).flatMap((l) => l.pts));
    outline.forEach((p, i) => {
      const q = outline[(i + 1) % outline.length];
      const edge = edges(d).find((l) => (samePoint(l.pts[0], p) && samePoint(l.pts[1], q)) || (samePoint(l.pts[0], q) && samePoint(l.pts[1], p)));
      if (edge) expect(edge.dashed).toBe(false);
    });
    expect(solidHeight(solid(part))).toBe(part.h);
  });

  it('draws the vertical edges of a prism as tall as h, and shades its top', () => {
    const d = solidDrawing(solid({ shape: 'prism', base: 'square', a: 6, h: 4, labels: { a: '6 cm', h: '4 cm' } }));
    const vertical = edges(d).filter((l) => near(l.pts[0][0], l.pts[1][0]));
    expect(vertical).toHaveLength(4);
    for (const l of vertical) expect(near(Math.abs(l.pts[1][1] - l.pts[0][1]), 4)).toBe(true);
    expect(d.fills).toHaveLength(1);
    expect(d.labels.map((l) => l.text)).toEqual(['6 cm', '4 cm']);
  });

  it('puts a pyramid apex at height h, with the height and slant guides dashed when labelled', () => {
    const bare = solidDrawing(solid({ shape: 'pyramid', base: 'square', a: 12, h: 8 }));
    const d = solidDrawing(solid({ shape: 'pyramid', base: 'square', a: 12, h: 8, labels: { a: '12 cm', h: '8 cm', l: '?', e: 'e' } }));
    expect(near(bounds(d).maxY, 8)).toBe(true);
    expect(d.fills).toHaveLength(0);
    // Three guides: the height, the slant height and the line joining their feet.
    expect(d.lines.length - bare.lines.length).toBe(3);
    expect(d.lines.slice(bare.lines.length).every((l) => l.dashed)).toBe(true);
    const slant = d.lines[bare.lines.length + 1].pts;
    expect(slant[1]).toEqual([0, 8]);
    expect(d.labels.map((l) => l.text)).toEqual(['12 cm', '8 cm', '?', 'e']);
    expect(d.labels.find((l) => l.text === 'e').anchor).toBe('end');
  });

  it('draws a pyramid frustum with its top side b straight above the base', () => {
    const d = solidDrawing(solid({ shape: 'pyramid-frustum', base: 'square', a: 12, b: 6, h: 9, labels: { a: '12 cm', b: '6 cm', h: '9 cm', l: 'l' } }));
    const top = d.fills[0];
    expect(top).toHaveLength(4);
    // The top square, drawn at y = 9 (plus its depth), is half the base: its left-right spread halves too.
    const base = baseCorners('square', 12);
    const spread = (xs) => Math.max(...xs) - Math.min(...xs);
    expect(near(spread(top.map((p) => p[0])), spread(base.map((p) => p[0])) / 2)).toBe(true);
    expect(d.labels.map((l) => l.text)).toEqual(['12 cm', '6 cm', '9 cm', 'l']);
  });
});
