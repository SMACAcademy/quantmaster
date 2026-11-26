/**
 * Simulations: Two circles and their common tangents (circles, Advanced unit).
 * Their meta.js entries keep this order.
 *
 * The tangents are constructed from the circles (utils/circleTangents.js), not
 * from the length formulas, so the picture is an independent check on the
 * numbers it shows.
 */

import { near, show } from './core.js';
import { clipLineToRect } from '../utils/planeGeometry.js';
import { circlePosition, commonTangents, directTangentLength, tangentCount, transverseTangentLength } from '../utils/circleTangents.js';

const HEIGHT = 320;
/** The geometry picture is 560 px wide with 18 px of padding: a view this wide for its height fills it. */
const ASPECT = (560 - 36) / (HEIGHT - 36);
const TONE = { direct: 'algebra', transverse: 'combinatorics', triangle: 'data' };

/** Widen a view about its centre to the picture's shape. */
function fitView(xMin, xMax, yMin, yMax) {
  const width = xMax - xMin;
  const height = yMax - yMin;
  if (width / height < ASPECT) {
    const extra = (height * ASPECT - width) / 2;
    return { xMin: xMin - extra, xMax: xMax + extra, yMin, yMax };
  }
  const extra = (width / ASPECT - height) / 2;
  return { xMin, xMax, yMin: yMin - extra, yMax: yMax + extra };
}

/** √(square) as "12" when whole, else "√216 ≈ 14.7". */
function rootText(square) {
  const root = Math.sqrt(Math.max(0, square));
  if (near(root, Math.round(root), 1e-9)) return show(Math.round(root));
  return `√${show(square)} ≈ ${show(root, 1)}`;
}

const POSITION_TEXT = {
  apart: (r1, r2, d) => `Apart: d > r₁ + r₂ (${show(d)} > ${show(r1 + r2)})`,
  'touch-external': (r1, r2) => `Touching outside: d = r₁ + r₂ = ${show(r1 + r2)}`,
  intersect: (r1, r2, d) => `Cutting at two points: ${show(Math.abs(r1 - r2))} < d < ${show(r1 + r2)}`,
  'touch-internal': (r1, r2) => `Touching inside: d = |r₁ − r₂| = ${show(Math.abs(r1 - r2))}`,
  inside: (r1, r2, d) => `One inside the other: d < |r₁ − r₂| (${show(d)} < ${show(Math.abs(r1 - r2))})`,
  concentric: () => 'Same centre, different radii: one inside the other',
  same: () => 'The same circle twice'
};

const INSIGHT = {
  apart: 'Four common tangents: two direct ones with both circles on the same side, whose length uses r₁ − r₂, and two transverse ones crossing between the circles, whose length uses r₁ + r₂. The transverse ones are always shorter: DCT² − TCT² = 4r₁r₂.',
  'touch-external': 'The circles touch, so the two transverse tangents have merged into one line through the touch point (length √(d² − (r₁ + r₂)²) = 0): 3 common tangents. Push them any closer and it vanishes.',
  intersect: 'The circles cut each other, so no line can pass between them: the transverse tangents have vanished and only the 2 direct ones remain.',
  'touch-internal': 'One circle touches the other from inside: the two direct tangents have merged into the single line through the touch point. Only 1 common tangent.',
  inside: 'One circle lies inside the other (d < |r₁ − r₂|), so any line touching the inner one cuts the outer one: 0 common tangents.',
  concentric: 'Circles with the same centre and different radii: the smaller lies inside the larger, so there are 0 common tangents.',
  same: 'Equal radii and the same centre: it is one circle, and every tangent of it is common to both.'
};

export const twoCircleTangents = {
  id: 'two-circle-tangents',
  topicId: 'circles',
  title: 'Two circles and their common tangents',
  summary: 'Move two circles apart and together: their common tangents appear and vanish, 4, 3, 2, 1, 0. The direct ones use r₁ − r₂, the transverse ones r₁ + r₂, and a right triangle shows why.',
  controls: [
    { id: 'r1', label: 'Radius r₁ of circle A', type: 'range', min: 1, max: 10, step: 1, default: 6, unit: 'cm' },
    { id: 'r2', label: 'Radius r₂ of circle B', type: 'range', min: 1, max: 10, step: 1, default: 3, unit: 'cm' },
    { id: 'd', label: 'Distance d between the centres', type: 'range', min: 0, max: 24, step: 0.5, default: 15, unit: 'cm' },
    {
      id: 'triangle',
      label: 'Shade the right triangle for',
      type: 'choice',
      options: [
        { id: 'direct', label: 'A direct tangent' },
        { id: 'transverse', label: 'A transverse tangent' }
      ],
      default: 'direct'
    }
  ],
  compute({ r1, r2, d, triangle }) {
    const A = { x: 0, y: 0 };
    const B = { x: d, y: 0 };
    const position = circlePosition(r1, r2, d);
    const count = tangentCount(r1, r2, d);
    const lines = commonTangents(A, r1, B, r2);
    const directCount = lines.filter((l) => l.kind === 'direct').length;
    const transverseCount = lines.length - directCount;
    const direct = position === 'same' ? null : directTangentLength(r1, r2, d);
    const transverse = transverseTangentLength(r1, r2, d);
    const gap = Math.abs(r1 - r2);
    const sum = r1 + r2;

    // The right triangle for the chosen kind: R = B + (P − Q) for the upper tangent PQ,
    // so BR ∥ PQ, BR = PQ, and AR = r₁ − r₂ (direct) or r₁ + r₂ (transverse).
    const chosen = lines.filter((l) => l.kind === triangle).sort((p, q) => q.t1.y - p.t1.y)[0] || null;
    const R = chosen ? { x: B.x + chosen.t1.x - chosen.t2.x, y: B.y + chosen.t1.y - chosen.t2.y } : null;
    const showTriangle = Boolean(chosen && chosen.length > 1e-9 && Math.hypot(R.x - A.x, R.y - A.y) > 1e-9);

    // The view holds both circles and the triangle, with room for the labels.
    const big = Math.max(r1, r2);
    let xMin = Math.min(-r1, d - r2);
    let xMax = Math.max(r1, d + r2);
    let yMin = -big;
    let yMax = big;
    if (showTriangle) {
      xMin = Math.min(xMin, R.x);
      xMax = Math.max(xMax, R.x);
      yMin = Math.min(yMin, R.y);
      yMax = Math.max(yMax, R.y);
    }
    const pad = 0.14 * Math.max(xMax - xMin, yMax - yMin);
    const view = fitView(xMin - pad, xMax + pad, yMin - pad, yMax + 1.6 * pad);
    const xy = (p) => [p.x, p.y];

    const items = [];
    if (showTriangle) {
      items.push({ type: 'polygon', points: [xy(A), xy(R), xy(B)], tone: TONE.triangle, fill: 0.2, dashed: true });
    }
    items.push({ type: 'circle', center: xy(A), r: r1, tone: 'geometry', fill: 0.06 }, { type: 'circle', center: xy(B), r: r2, tone: 'geometry', fill: 0.06 });
    if (d > 0) items.push({ type: 'segment', from: xy(A), to: xy(B), dashed: true, thin: true });
    for (const line of lines) {
      const along = { x: -line.normal.y, y: line.normal.x };
      const ends = clipLineToRect(line.t1, { x: line.t1.x + along.x, y: line.t1.y + along.y }, [view.xMin, view.xMax], [view.yMin, view.yMax]);
      if (ends) items.push({ type: 'segment', from: xy(ends[0]), to: xy(ends[1]), tone: TONE[line.kind], thin: true });
      if (line.length > 1e-9) items.push({ type: 'segment', from: xy(line.t1), to: xy(line.t2), tone: TONE[line.kind] });
    }
    if (showTriangle) {
      items.push(
        { type: 'segment', from: xy(A), to: xy(chosen.t1), thin: true },
        { type: 'segment', from: xy(B), to: xy(chosen.t2), thin: true },
        { type: 'right', at: xy(R), a: xy(A), b: xy(B) },
        { type: 'right', at: xy(chosen.t1), a: xy(A), b: xy(chosen.t2) }
      );
    }
    for (const line of lines) items.push({ type: 'point', at: xy(line.t1) }, { type: 'point', at: xy(line.t2) });
    items.push({ type: 'point', at: xy(A) }, { type: 'point', at: xy(B) });
    items.push(
      { type: 'label', at: xy(A), text: 'A', dy: 14, dx: -8, strong: true },
      { type: 'label', at: xy(B), text: 'B', dy: 14, dx: 8, strong: true },
      {
        type: 'label',
        at: [view.xMin, view.yMax],
        text: count === null ? 'Infinitely many common tangents' : `${count} common tangent${count === 1 ? '' : 's'}`,
        dx: 6,
        dy: 12,
        anchor: 'start',
        strong: true
      }
    );
    if (showTriangle) {
      // Each leg's label sits beside its middle, pushed away from the triangle.
      const centroid = { x: (A.x + R.x + B.x) / 3, y: (A.y + R.y + B.y) / 3 };
      // Text grows away from the triangle, so a long label never lies across a side.
      const beside = (p, q, text, tone, along = 0.5) => {
        const mid = { x: p.x + (q.x - p.x) * along, y: p.y + (q.y - p.y) * along };
        const len = Math.hypot(mid.x - centroid.x, mid.y - centroid.y) || 1;
        const dx = ((mid.x - centroid.x) / len) * 12;
        const dy = (-(mid.y - centroid.y) / len) * 12;
        return { type: 'label', at: xy(mid), text, dx, dy, anchor: dx > 4 ? 'start' : dx < -4 ? 'end' : 'middle', tone, strong: true };
      };
      const legText = triangle === 'direct' ? `|r₁ − r₂| = ${show(gap)}` : `r₁ + r₂ = ${show(sum)}`;
      // d is written nearer A, clear of where the transverse tangents cross AB.
      items.push(beside(A, R, legText, TONE.triangle), beside(R, B, show(chosen.length, 1), TONE[triangle]), beside(A, B, `d = ${show(d)}`, undefined, 0.3));
    }

    const lengthReadout = (square, exists, none) => (exists ? `√(${show(d)}² − ${show(Math.sqrt(square.sub))}²) = ${rootText(square.value)} cm` : none);
    const directSquare = { sub: gap * gap, value: d * d - gap * gap };
    const transverseSquare = { sub: sum * sum, value: d * d - sum * sum };
    const readouts = [
      { label: 'Position', value: POSITION_TEXT[position](r1, r2, d) },
      {
        label: 'Common tangents',
        value: count === null ? 'Infinitely many' : `${count}: ${directCount} direct, ${transverseCount} transverse`
      },
      {
        label: 'Direct tangent √(d² − (r₁ − r₂)²)',
        value: lengthReadout(directSquare, direct !== null && directCount > 0, position === 'same' ? 'every tangent' : 'none: d < |r₁ − r₂|')
      },
      { label: 'Transverse tangent √(d² − (r₁ + r₂)²)', value: lengthReadout(transverseSquare, transverse !== null, 'none: d < r₁ + r₂') }
    ];
    if (direct !== null && transverse !== null) {
      readouts.push({ label: 'DCT² − TCT² = 4r₁r₂', value: `${show(directSquare.value)} − ${show(transverseSquare.value)} = ${show(4 * r1 * r2)} = 4 × ${r1} × ${r2}` });
    }

    const missing =
      chosen === null && position !== 'same'
        ? ` There is no ${triangle} tangent now, so there is no triangle to shade.`
        : chosen && !showTriangle
          ? chosen.length <= 1e-9
            ? ` The ${triangle} tangent passes through the touch point, so its length and its triangle have shrunk to nothing.`
            : ' With equal radii the direct tangents are parallel to AB and as long as d: the triangle has flattened into the rectangle ABQP.'
          : '';
    const lengthWords = [
      direct !== null && directCount ? `direct tangent ${show(direct, 1)} cm` : null,
      transverse !== null && transverseCount ? `transverse tangent ${show(transverse, 1)} cm` : null
    ]
      .filter(Boolean)
      .join(', ');
    return {
      numbers: { r1, r2, d, position, count, directCount, transverseCount, direct, transverse, triangleShown: showTriangle, R, lines },
      readouts,
      plot: {
        kind: 'geometry',
        view,
        height: HEIGHT,
        items,
        legend: [
          { tone: TONE.direct, label: 'Direct common tangents' },
          { tone: TONE.transverse, label: 'Transverse common tangents' },
          { tone: TONE.triangle, label: 'Right triangle for the shaded length' }
        ],
        summary: `Circle A of radius ${show(r1)} cm and circle B of radius ${show(r2)} cm, centres ${show(d)} cm apart. ${POSITION_TEXT[position](r1, r2, d)}. ${
          count === null ? 'Every tangent is common.' : `${count} common tangent${count === 1 ? '' : 's'}: ${directCount} direct, ${transverseCount} transverse${lengthWords ? `; ${lengthWords}` : ''}.`
        }${showTriangle ? ` The shaded right triangle has legs ${triangle === 'direct' ? `|r₁ − r₂| = ${show(gap)}` : `r₁ + r₂ = ${show(sum)}`} and ${show(chosen.length, 1)}, with hypotenuse d.` : ''}`
      },
      insight: INSIGHT[position] + missing
    };
  },
  tasks: [
    {
      id: 'three',
      prompt: 'Make exactly three common tangents. How far apart are the centres?',
      check: (values, n) => n.count === 3,
      solution: { d: 9 }
    },
    {
      id: 'two',
      prompt: 'Make the circles cut each other. Which tangents are left?',
      check: (values, n) => n.count === 2,
      solution: { d: 6 }
    },
    {
      id: 'one',
      prompt: 'Leave exactly one common tangent.',
      check: (values, n) => n.count === 1,
      solution: { d: 3 }
    },
    {
      id: 'direct-twelve',
      prompt: 'Keep the circles apart and make the direct tangent exactly 12 cm.',
      check: (values, n) => n.count === 4 && n.direct !== null && near(n.direct, 12, 1e-9),
      solution: { r2: 1, d: 13 }
    }
  ]
};

export const twoCircleSims = [twoCircleTangents];
