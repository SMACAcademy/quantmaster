/**
 * Two circles and common tangents (circles, Advanced unit): the direct and
 * transverse common tangents, DCT² − TCT² = 4r₁r₂, the number of common
 * tangents, two circles touching each other and a line, the tangent and the
 * secant from one point, and where the tangents cross the line of centres.
 *
 * Numbers are clean by construction (Pythagorean triples, r = k·m², PA a
 * divisor of PT²). The independent checks never use the length formulas: they
 * build the tangent lines from the two circles (utils/circleTangents.js) and
 * measure them, count tangents from where the outlines cross, or place the
 * circles by coordinates and measure distances.
 *
 * The figure builders are exported so the hand-written questions and lesson
 * figures in circles.json are drawn the same way.
 */

import { fmt, gcd, hasAtMostDecimals, nearlyEqual } from '../core.js';
import { circleIntersections, commonTangents, distance, lineIntersection, tangentCount, tangentsFromPoint } from '../../utils/circleTangents.js';

/* ------------------------------ shared helpers ------------------------------ */

const r2d = (v) => Math.round(v * 100) / 100;
const cm = (v) => `${fmt(v)} cm`;

/** √n in simplest form: 12, 6√11, √7. */
function surdText(n) {
  let k = 1;
  let m = n;
  for (let f = 2; f * f <= m; f++) {
    while (m % (f * f) === 0) {
      m /= f * f;
      k *= f;
    }
  }
  if (m === 1) return fmt(k);
  return `${k === 1 ? '' : k}√${m}`;
}

/** A length as the app writes it: "12 cm", "2.5 cm", or a surd "6√11 cm" when it is the root of a whole number. */
export function lengthText(value) {
  if (hasAtMostDecimals(value, 2)) return cm(value);
  const square = value * value;
  if (Math.abs(square - Math.round(square)) < 1e-6) return `${surdText(Math.round(square))} cm`;
  return cm(value);
}

/** Every (a, b, c) with a² + b² = c² and c ≤ 41, in both orders. */
const TRIPLES = (() => {
  const list = [];
  for (let c = 5; c <= 41; c++) {
    for (let a = 1; a < c; a++) {
      const b = Math.sqrt(c * c - a * a);
      if (Number.isInteger(b)) list.push([a, b, c]);
    }
  }
  return list;
})();

/** Circles apart (unequal radii) whose direct and transverse tangents are both whole: [d, r1, r2, DCT, TCT]. */
const BOTH_WHOLE = (() => {
  const list = [];
  for (let d = 5; d <= 75; d++) {
    for (let r1 = 2; r1 <= 40; r1++) {
      for (let r2 = 1; r2 < r1; r2++) {
        if (d <= r1 + r2) continue;
        const D = Math.sqrt(d * d - (r1 - r2) ** 2);
        const T = Math.sqrt(d * d - (r1 + r2) ** 2);
        if (Number.isInteger(D) && Number.isInteger(T)) list.push([d, r1, r2, D, T]);
      }
    }
  }
  return list;
})();

const A0 = { x: 0, y: 0 };
const at = (x, y = 0) => ({ x, y });

/** The common tangents of one kind for circles (A0, r1) and ((d, 0), r2), built from the circles themselves. */
const tangentsOf = (kind, r1, r2, d) => commonTangents(A0, r1, at(d), r2).filter((line) => line.kind === kind);

/* --------------------------------- figures --------------------------------- */

/** Label offset (screen px) that puts a point's label `dist` px out along the model direction (ux, uy). */
function outward(ux, uy, dist = 14, chars = 1) {
  const len = Math.hypot(ux, uy) || 1;
  const x = (ux / len) * dist;
  const y = (-uy / len) * dist;
  const half = chars * 3.5;
  // Point labels are drawn from their left end, on the baseline.
  const dx = x > 3 ? x - 2 : x < -3 ? x - 2 * half + 2 : x - half;
  return [Math.round(dx), Math.round(y + 4)];
}

/**
 * Offset (screen px) for a segment label beside segment p → q, on its left
 * (side = −1) or right (side = +1) as seen on screen, far enough out for the text.
 */
function sideOffset(p, q, text = '', side = 1) {
  const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  // A screen perpendicular to the segment (model y points up, screen y down).
  let nx = (q.y - p.y) / len;
  let ny = (q.x - p.x) / len;
  if (Math.sign(nx || 1) !== side) [nx, ny] = [-nx, -ny];
  const dist = 8 + 3.2 * text.length;
  return [Math.round(nx * dist), Math.round(ny * Math.max(10, dist * 0.6))];
}

const point = (id, p, labelOffset, extra = {}) => ({ id, x: r2d(p.x), y: r2d(p.y), labelOffset, ...extra });
const labelled = (labels) => (from, to, name, extra = {}) => ({ type: 'segment', from, to, ...extra, ...(labels[name] ? { label: labels[name] } : {}) });

/**
 * Two circles, centres A (radius r1, the larger, on the left) and B, d apart,
 * with the upper common tangent PQ of one kind and the radii to its touch
 * points (right angles marked). With `triangle`, R is added so that BR ∥ PQ:
 * AR = r1 − r2 (direct) or r1 + r2 (transverse), and triangle ARB is shaded.
 * `labels` may name AB, AP, AR, RP, PR, BQ and PQ.
 */
export function twoCircleFigure({ r1, r2, d, kind, labels = {}, triangle = false, caption, ariaSummary }) {
  const B = at(d);
  const line = tangentsOf(kind, r1, r2, d).sort((p, q) => q.t1.y - p.t1.y)[0];
  const P = line.t1;
  const Q = line.t2;
  const R = { x: B.x + P.x - Q.x, y: B.y + P.y - Q.y };
  const withTriangle = triangle && distance(R, A0) > 1e-6;
  // A transverse tangent touches B below it, so B's label goes above.
  const points = [point('A', A0, [-4, 18]), point('B', B, kind === 'transverse' ? [6, -8] : [-4, 18]), point('P', P, outward(P.x, P.y)), point('Q', Q, outward(Q.x - d, Q.y))];
  if (withTriangle) points.push(point('R', R, kind === 'direct' ? [-16, 4] : outward(R.x, R.y)));
  const seg = labelled(labels);
  const shapes = [
    { type: 'circle', center: 'A', radius: r1 },
    { type: 'circle', center: 'B', radius: r2 },
    // The transverse tangents cross AB beyond its middle (r1 > r2), so their label moves towards A.
    seg('A', 'B', 'AB', { style: 'dashed', labelOffset: [kind === 'transverse' ? -24 : 0, 14] }),
    seg('B', 'Q', 'BQ', { labelOffset: sideOffset(B, Q, labels.BQ, 1) }),
    seg('P', 'Q', 'PQ')
  ];
  if (withTriangle && kind === 'direct') {
    shapes.push(seg('A', 'R', 'AR', { labelOffset: sideOffset(A0, R, labels.AR, -1) }), seg('R', 'P', 'RP', { labelOffset: sideOffset(R, P, labels.RP, -1) }));
  } else shapes.push(seg('A', 'P', 'AP', { labelOffset: sideOffset(A0, P, labels.AP, -1) }));
  if (withTriangle) {
    if (kind === 'transverse') shapes.push(seg('P', 'R', 'PR', { style: 'dashed', labelOffset: sideOffset(P, R, labels.PR, -1) }));
    shapes.push({ type: 'segment', from: 'B', to: 'R', style: 'dashed' });
  }
  const rightAngles = [
    { at: 'P', from: 'A', to: 'Q' },
    { at: 'Q', from: 'B', to: 'P' }
  ];
  if (withTriangle) rightAngles.push({ at: 'R', from: 'A', to: 'B' });
  return {
    type: 'diagram',
    caption,
    points,
    shapes,
    ...(withTriangle ? { shaded: [{ parts: [{ type: 'polygon', points: ['A', 'R', 'B'] }] }] } : {}),
    rightAngles,
    ariaSummary
  };
}

/**
 * Two circles touching each other externally and both touching a line: centres
 * A (radius r1) and B (radius r2), touch points P and Q on the line, 2√(r1r2) apart.
 */
export function touchingLineFigure({ r1, r2, labels = {}, caption, ariaSummary }) {
  const gap = 2 * Math.sqrt(r1 * r2);
  const A = at(0, r1);
  const B = at(gap, r2);
  const big = Math.max(r1, r2);
  const seg = labelled(labels);
  return {
    type: 'diagram',
    caption,
    points: [
      point('A', A, [-4, -10]),
      point('B', B, [6, -8]),
      point('P', at(0), [-4, 18]),
      point('Q', at(gap), [-4, 18]),
      point('L', at(-0.45 * big), [0, 0], { hidden: true }),
      point('M', at(gap + 0.45 * big), [0, 0], { hidden: true })
    ],
    shapes: [
      { type: 'circle', center: 'A', radius: r1 },
      { type: 'circle', center: 'B', radius: r2 },
      { type: 'segment', from: 'L', to: 'M' },
      seg('A', 'P', 'AP', { style: 'dashed' }),
      seg('B', 'Q', 'BQ', { style: 'dashed' }),
      { type: 'segment', from: 'A', to: 'B', style: 'dashed' },
      seg('P', 'Q', 'PQ', { labelOffset: [0, 30] })
    ],
    rightAngles: [
      { at: 'P', from: 'A', to: 'M' },
      { at: 'Q', from: 'B', to: 'L' }
    ],
    ariaSummary
  };
}

/**
 * A circle with a secant from P cutting it at A and B (PA = a, PB = b along a
 * straight line) and the tangent PT. `lift` raises the centre O off the secant
 * (0 puts the secant through O, which is then shown with the radius OT).
 */
export function secantFigure({ a, b, lift = null, labels = {}, caption, ariaSummary }) {
  const half = (b - a) / 2;
  const h = lift ?? Math.max(0.55 * half, 0.25 * a);
  const O = at((a + b) / 2, h);
  const radius = Math.hypot(half, h);
  const P = at(0);
  const T = tangentsFromPoint(P, O, radius).touches.sort((p, q) => q.y - p.y)[0];
  const seg = labelled(labels);
  const showCentre = h === 0;
  return {
    type: 'diagram',
    caption,
    points: [
      point('P', P, [-16, 5]),
      point('A', at(a), showCentre ? [-14, 16] : [-4, 18]),
      point('B', at(b), [4, 18]),
      point('T', T, outward(T.x - O.x, T.y - O.y)),
      point('O', O, [4, 16], showCentre ? {} : { hidden: true })
    ],
    shapes: [
      { type: 'circle', center: 'O', radius: r2d(radius) },
      seg('P', 'A', 'PA', { labelOffset: [0, 14] }),
      seg('A', 'B', 'AB', { labelOffset: [0, 14] }),
      seg('P', 'T', 'PT'),
      ...(showCentre ? [{ type: 'segment', from: 'O', to: 'T', style: 'dashed' }] : [])
    ],
    ...(showCentre ? { rightAngles: [{ at: 'T', from: 'O', to: 'P' }] } : {}),
    ariaSummary
  };
}

/**
 * Two circles (A, radius r1, the larger; B, radius r2) d apart, with both
 * common tangents of one kind meeting the line of centres at X: between the
 * circles for the transverse pair, beyond the smaller circle for the direct pair.
 * `from` is the centre whose distance to X is labelled "?".
 */
export function divisionFigure({ r1, r2, d, kind, from, caption, ariaSummary }) {
  const lines = tangentsOf(kind, r1, r2, d).sort((p, q) => q.t1.y - p.t1.y);
  const X = at(kind === 'transverse' ? (d * r1) / (r1 + r2) : (d * r1) / (r1 - r2));
  const points = [point('A', A0, [-4, 18]), point('B', at(d), [-4, 18]), point('X', X, kind === 'transverse' ? [-4, 22] : [6, 16])];
  lines.forEach((line, i) => {
    points.push(point(`P${i + 1}`, line.t1, [0, 0], { label: '' }), point(`Q${i + 1}`, line.t2, [0, 0], { label: '' }));
  });
  const tangentSegments = lines.map((_, i) => ({ type: 'segment', from: `P${i + 1}`, to: kind === 'transverse' ? `Q${i + 1}` : 'X' }));
  const asked = { style: 'dashed', label: `${from}X = ?`, labelOffset: [0, 16] };
  const centreLine =
    kind === 'transverse'
      ? [
          from === 'A' ? { type: 'segment', from: 'A', to: 'X', ...asked } : { type: 'segment', from: 'X', to: 'B', ...asked },
          from === 'A' ? { type: 'segment', from: 'X', to: 'B', style: 'dashed' } : { type: 'segment', from: 'A', to: 'X', style: 'dashed' }
        ]
      : from === 'A'
        ? [{ type: 'segment', from: 'A', to: 'X', ...asked }]
        : [
            { type: 'segment', from: 'A', to: 'B', style: 'dashed' },
            { type: 'segment', from: 'B', to: 'X', ...asked }
          ];
  return {
    type: 'diagram',
    caption,
    points,
    shapes: [{ type: 'circle', center: 'A', radius: r1 }, { type: 'circle', center: 'B', radius: r2 }, ...centreLine, ...tangentSegments],
    ariaSummary
  };
}

/* ================================ templates ================================ */

const KIND = {
  direct: { name: 'direct', sign: '−', combine: (r1, r2) => r1 - r2, other: 'transverse' },
  transverse: { name: 'transverse', sign: '+', combine: (r1, r2) => r1 + r2, other: 'direct' }
};
const capital = (text) => text[0].toUpperCase() + text.slice(1);

/**
 * Radii and distance for a tangent of one kind whose length is whole: from a
 * triple (a, t, d), a is r1 − r2 (direct) or r1 + r2 (transverse). The circles
 * stay apart (d > r1 + r2), with r1 > r2.
 */
function pickCircles(rng, kindName) {
  const [a, t, d] = rng.pick(TRIPLES);
  const maxSmall = kindName === 'direct' ? Math.min(12, Math.floor((d - a - 1) / 2)) : Math.ceil(a / 2) - 1;
  if (maxSmall < 1) return null;
  const r2 = rng.int(1, maxSmall);
  const r1 = kindName === 'direct' ? r2 + a : a - r2;
  return r1 > r2 ? { r1, r2, d, t } : null;
}

/** The length template for one kind: given r1, r2 and d, find that common tangent. */
function lengthTemplate(kindName) {
  const kind = KIND[kindName];
  const other = KIND[kind.other];
  return {
    id: `cir-adv2-${kindName === 'direct' ? 'dct' : 'tct'}-length`,
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-common-tangents',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cir-adv-common-tangent-f'],
    tags: ['advanced'],
    estimatedSeconds: 60,
    formatValue: (value) => lengthText(value),
    params: (rng) => pickCircles(rng, kindName),
    answer: ({ r1, r2, d }) => Math.sqrt(d * d - kind.combine(r1, r2) ** 2),
    distractors: ({ r1, r2, d }) => [
      { value: Math.sqrt(d * d - other.combine(r1, r2) ** 2), why: `used r₁ ${other.sign} r₂, which gives the ${other.name} tangent` },
      { value: Math.sqrt(d * d + kind.combine(r1, r2) ** 2), why: 'added the squares instead of subtracting' },
      { value: d - kind.combine(r1, r2), why: 'subtracted the lengths instead of their squares' },
      { value: Math.sqrt(d * d - r1 * r1), why: 'used the larger radius alone, as for a tangent from a point' }
    ],
    verify({ r1, r2, d }, value) {
      // Build both tangents of this kind from the circles and measure them between their touch points.
      const lines = tangentsOf(kindName, r1, r2, d);
      return lines.length === 2 && lines.every((line) => nearlyEqual(line.length, value, 1e-9));
    },
    render({ r1, r2, d, t }) {
      const k = kind.combine(r1, r2);
      const square = d * d - k * k;
      return {
        question: `Two circles of radii ${cm(r1)} and ${cm(r2)} have their centres ${cm(d)} apart. What is the length of their ${kind.name} common tangent?`,
        figure: twoCircleFigure({
          r1,
          r2,
          d,
          kind: kindName,
          labels: { AP: cm(r1), BQ: cm(r2), AB: cm(d), PQ: '?' },
          caption: `Circles with centres A and B, radii ${cm(r1)} and ${cm(r2)}, ${cm(d)} apart; the ${kind.name} common tangent PQ is asked`,
          ariaSummary: `Two circles with centres A and B, ${cm(d)} apart, radii AP = ${cm(r1)} and BQ = ${cm(r2)}. The ${kind.name} common tangent PQ ${
            kindName === 'direct' ? 'runs above both circles' : 'crosses between the circles'
          } and is marked with a question mark. Both radii meet it at right angles.`
        }),
        explanation: `Draw BR parallel to PQ, with R on the line AP. Then BR = PQ and AR = r₁ ${kind.sign} r₂ = ${k} cm, and triangle ARB is right-angled at R with hypotenuse AB = d. So the ${kind.name} tangent = √(d² − (r₁ ${kind.sign} r₂)²) = √(${d}² − ${k}²) = √${square} = ${t} cm.`,
        solutionSteps: [
          `${capital(kind.name)} tangent = √(d² − (r₁ ${kind.sign} r₂)²).`,
          `r₁ ${kind.sign} r₂ = ${r1} ${kind.sign} ${r2} = ${k}.`,
          `${d}² − ${k}² = ${d * d} − ${k * k} = ${square}.`,
          `√${square} = ${t} cm.`
        ],
        method: `${capital(kind.name)} common tangent = √(d² − (r₁ ${kind.sign} r₂)²).`,
        hints: [
          kindName === 'direct'
            ? 'A direct tangent has both circles on the same side of it: its formula uses the difference of the radii.'
            : 'A transverse tangent passes between the circles: its formula uses the sum of the radii.',
          `Length = √(d² − (r₁ ${kind.sign} r₂)²).`,
          `First find ${d}² − ${k}².`
        ],
        commonMistakes: [`Using r₁ ${other.sign} r₂, which gives the ${other.name} tangent.`, 'Subtracting the lengths instead of their squares.']
      };
    }
  };
}

export const advTwoCircleTemplates = [
  lengthTemplate('direct'),
  lengthTemplate('transverse'),

  /* ---------------- distance between centres from a tangent ---------------- */
  {
    id: 'cir-adv2-centre-distance',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-common-tangents',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cir-adv-common-tangent-f'],
    tags: ['advanced'],
    estimatedSeconds: 75,
    formatValue: (value) => lengthText(value),
    params(rng) {
      const kindName = rng.pick(['direct', 'transverse']);
      const circles = pickCircles(rng, kindName);
      return circles && { kindName, ...circles };
    },
    answer: ({ kindName, r1, r2, t }) => Math.sqrt(t * t + KIND[kindName].combine(r1, r2) ** 2),
    distractors({ kindName, r1, r2, t }) {
      const k = KIND[kindName].combine(r1, r2);
      const other = KIND[KIND[kindName].other];
      return [
        { value: Math.sqrt(t * t + other.combine(r1, r2) ** 2), why: `used r₁ ${other.sign} r₂, the ${other.name} tangent's formula` },
        { value: t + k, why: 'added the lengths instead of their squares' },
        { value: Math.sqrt(t * t - k * k), why: 'subtracted the square instead of adding it' },
        { value: Math.sqrt(t * t + r1 * r1), why: 'used the larger radius alone' }
      ];
    },
    verify({ kindName, r1, r2, t }, value) {
      // Put the centres `value` apart, build the tangents and measure them.
      const lines = tangentsOf(kindName, r1, r2, value);
      return lines.length === 2 && lines.every((line) => nearlyEqual(line.length, t, 1e-9));
    },
    render({ kindName, r1, r2, d, t }) {
      const kind = KIND[kindName];
      const k = kind.combine(r1, r2);
      return {
        question: `The ${kind.name} common tangent of two circles of radii ${cm(r1)} and ${cm(r2)} is ${cm(t)} long. What is the distance between their centres?`,
        figure: twoCircleFigure({
          r1,
          r2,
          d,
          kind: kindName,
          labels: { AP: cm(r1), BQ: cm(r2), AB: '?', PQ: cm(t) },
          caption: `Circles with radii ${cm(r1)} and ${cm(r2)} and a ${kind.name} common tangent PQ of ${cm(t)}; the distance AB between the centres is asked`,
          ariaSummary: `Two circles with centres A and B and radii AP = ${cm(r1)} and BQ = ${cm(r2)}. Their ${kind.name} common tangent PQ is ${cm(t)} long, with right angles at P and Q. The dashed line AB between the centres is marked with a question mark.`
        }),
        explanation: `The ${kind.name} tangent satisfies t² = d² − (r₁ ${kind.sign} r₂)², so d² = t² + (r₁ ${kind.sign} r₂)² = ${t}² + ${k}² = ${t * t + k * k}, and d = ${d} cm. (Triangle ARB, with BR = PQ and AR = r₁ ${kind.sign} r₂, has AB as its hypotenuse.)`,
        solutionSteps: [`r₁ ${kind.sign} r₂ = ${k}.`, `d² = ${t}² + ${k}² = ${t * t} + ${k * k} = ${t * t + k * k}.`, `d = √${t * t + k * k} = ${d} cm.`],
        method: `d = √(t² + (r₁ ${kind.sign} r₂)²).`,
        hints: [
          `Which combination of the radii goes with a ${kind.name} tangent: r₁ − r₂ or r₁ + r₂?`,
          `The tangent, r₁ ${kind.sign} r₂ and d form a right triangle with d as the hypotenuse.`,
          `d² = ${t}² + ${k}².`
        ],
        commonMistakes: [`Using r₁ ${KIND[kind.other].sign} r₂, the ${kind.other} tangent's formula.`, 'Subtracting the square instead of adding it: d is the longest side.']
      };
    }
  },

  /* ---------------- DCT² − TCT² = 4r₁r₂ ---------------- */
  {
    id: 'cir-adv2-tangent-difference',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-common-tangents',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cir-sc-dct-tct'],
    tags: ['advanced'],
    estimatedSeconds: 75,
    formatValue: (value, { ask }) => (ask === 'product' ? `${fmt(value)} cm²` : lengthText(value)),
    params(rng) {
      const [d, r1, r2, D, T] = rng.pick(BOTH_WHOLE);
      return { r1, r2, d, D, T, ask: rng.pick(['product', 'direct', 'transverse']) };
    },
    answer: ({ ask, r1, r2, D, T }) => (ask === 'product' ? (D * D - T * T) / 4 : ask === 'direct' ? Math.sqrt(T * T + 4 * r1 * r2) : Math.sqrt(D * D - 4 * r1 * r2)),
    distractors({ ask, r1, r2, d, D, T }) {
      if (ask === 'product') {
        return [
          { value: D * D - T * T, why: 'forgot to divide by 4' },
          { value: (D * D - T * T) / 2, why: 'divided by 2 instead of 4' },
          { value: D - T, why: 'subtracted the lengths instead of their squares' },
          { value: Math.sqrt((D * D - T * T) / 4), why: 'took a square root at the end' }
        ];
      }
      const p = 4 * r1 * r2;
      return ask === 'direct'
        ? [
            { value: d, why: 'stopped at the distance between the centres' },
            { value: Math.sqrt(T * T + p / 2), why: 'used 2r₁r₂ instead of 4r₁r₂' },
            { value: Math.sqrt(T * T + (r1 - r2) ** 2), why: 'added (r₁ − r₂)² instead of 4r₁r₂' },
            { value: T * T > p ? Math.sqrt(T * T - p) : null, why: 'subtracted 4r₁r₂ instead of adding it' }
          ]
        : [
            { value: Math.sqrt(D * D + p), why: 'added 4r₁r₂ instead of subtracting it' },
            { value: Math.sqrt(D * D - p / 2), why: 'used 2r₁r₂ instead of 4r₁r₂' },
            { value: d, why: 'stopped at the distance between the centres' },
            { value: D - (r1 + r2), why: 'subtracted r₁ + r₂ from the length' }
          ];
    },
    verify({ ask, r1, r2, d, D, T }, value) {
      // Build the circles and measure both tangents; the given lengths must be theirs.
      const direct = tangentsOf('direct', r1, r2, d)[0].length;
      const transverse = tangentsOf('transverse', r1, r2, d)[0].length;
      if (!nearlyEqual(direct, D, 1e-9) || !nearlyEqual(transverse, T, 1e-9)) return false;
      if (ask === 'product') return value === r1 * r2;
      return nearlyEqual(value, ask === 'direct' ? direct : transverse, 1e-9);
    },
    render({ ask, r1, r2, D, T }) {
      const p = 4 * r1 * r2;
      if (ask === 'product') {
        return {
          question: `The direct common tangent of two circles is ${cm(D)} long and their transverse common tangent is ${cm(T)} long. What is the product of their radii?`,
          explanation: `DCT² = d² − (r₁ − r₂)² and TCT² = d² − (r₁ + r₂)². Subtracting, d² cancels: DCT² − TCT² = (r₁ + r₂)² − (r₁ − r₂)² = 4r₁r₂. Here ${D}² − ${T}² = ${D * D} − ${T * T} = ${D * D - T * T}, so r₁r₂ = ${D * D - T * T} ÷ 4 = ${(D * D - T * T) / 4} cm².`,
          solutionSteps: ['DCT² − TCT² = 4r₁r₂.', `${D}² − ${T}² = ${D * D} − ${T * T} = ${D * D - T * T}.`, `r₁r₂ = ${D * D - T * T} ÷ 4 = ${(D * D - T * T) / 4}.`],
          method: 'DCT² − TCT² = 4r₁r₂: the distance between the centres cancels.',
          hints: ['Write both tangent lengths with their formulas. What do they have in common?', 'Subtract the squares: d² cancels.', '(r₁ + r₂)² − (r₁ − r₂)² = 4r₁r₂.'],
          commonMistakes: ['Forgetting to divide by 4.', 'Subtracting the lengths instead of their squares.']
        };
      }
      const given = ask === 'direct' ? `transverse common tangent is ${cm(T)}` : `direct common tangent is ${cm(D)}`;
      const asked = ask === 'direct' ? 'direct' : 'transverse';
      return {
        question: `Two circles have radii ${cm(r1)} and ${cm(r2)}, and their ${given} long. How long is their ${asked} common tangent?`,
        explanation: `DCT² − TCT² = (r₁ + r₂)² − (r₁ − r₂)² = 4r₁r₂ = 4 × ${r1} × ${r2} = ${p}, whatever the distance between the centres. ${
          ask === 'direct' ? `DCT² = ${T}² + ${p} = ${T * T + p}, so DCT = ${D} cm.` : `TCT² = ${D}² − ${p} = ${D * D - p}, so TCT = ${T} cm.`
        }`,
        solutionSteps: [
          'DCT² − TCT² = 4r₁r₂.',
          `4r₁r₂ = 4 × ${r1} × ${r2} = ${p}.`,
          ask === 'direct' ? `DCT² = ${T * T} + ${p} = ${T * T + p}.` : `TCT² = ${D * D} − ${p} = ${D * D - p}.`,
          ask === 'direct' ? `DCT = √${T * T + p} = ${D} cm.` : `TCT = √${D * D - p} = ${T} cm.`
        ],
        method: 'DCT² − TCT² = 4r₁r₂, so the distance between the centres is not needed.',
        hints: ['The distance between the centres is not given. Is there a link between the two tangents that does not need it?', 'DCT² − TCT² = 4r₁r₂.', `4r₁r₂ = ${p}.`],
        commonMistakes: ['Using 2r₁r₂ instead of 4r₁r₂.', ask === 'direct' ? 'Subtracting 4r₁r₂: the direct tangent is the longer one.' : 'Adding 4r₁r₂: the transverse tangent is the shorter one.']
      };
    }
  },

  /* ---------------- how many common tangents ---------------- */
  {
    id: 'cir-adv2-count',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-positions',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['cir-adv-positions-f'],
    tags: ['advanced'],
    estimatedSeconds: 45,
    formatValue: (value) => String(value),
    params(rng) {
      const r1 = rng.int(3, 12);
      const r2 = rng.int(2, r1 - 1);
      const position = rng.pick(['apart', 'touch-external', 'intersect', 'touch-internal', 'inside']);
      const d = {
        apart: r1 + r2 + rng.int(1, 8),
        'touch-external': r1 + r2,
        intersect: rng.int(r1 - r2 + 1, r1 + r2 - 1),
        'touch-internal': r1 - r2,
        inside: rng.int(0, r1 - r2 - 1)
      }[position];
      return { r1, r2, d };
    },
    answer: ({ r1, r2, d }) => tangentCount(r1, r2, d),
    distractors: () => [
      { value: 4, why: 'counted as if the circles were apart, with two direct and two transverse tangents' },
      { value: 3, why: 'treated the circles as touching externally' },
      { value: 2, why: 'counted only the two direct tangents (or counted 2 for touching circles)' },
      { value: 1, why: 'treated the circles as touching internally' },
      { value: 0, why: 'thought one circle lies inside the other' }
    ],
    verify({ r1, r2, d }, value) {
      // Route 1: where the outlines cross, and whether the smaller circle is inside the larger.
      const B = at(d);
      const crossings = circleIntersections(A0, r1, B, r2);
      let byCrossings;
      if (crossings.length === 2) byCrossings = 2;
      else if (crossings.length === 1) {
        const X = crossings[0];
        // Touching from outside puts the touch point between the centres.
        byCrossings = (X.x - A0.x) * (B.x - X.x) + (X.y - A0.y) * (B.y - X.y) > 0 ? 3 : 1;
      } else byCrossings = distance(A0, B) < r1 ? 0 : 4;
      // Route 2: construct the tangent lines and count them.
      const byLines = commonTangents(A0, r1, B, r2).length;
      return value === byCrossings && value === byLines;
    },
    render({ r1, r2, d }) {
      const sum = r1 + r2;
      const diff = r1 - r2;
      const n = tangentCount(r1, r2, d);
      const verdict = {
        4: `d = ${d} is more than r₁ + r₂ = ${sum}, so the circles are apart: two direct and two transverse tangents, 4 in all.`,
        3: `d = ${d} equals r₁ + r₂ = ${sum}, so the circles touch externally: two direct tangents and one transverse tangent at the touch point, 3 in all.`,
        2: `d = ${d} lies between r₁ − r₂ = ${diff} and r₁ + r₂ = ${sum}, so the circles cut each other at two points: only the 2 direct tangents remain.`,
        1: `d = ${d} equals r₁ − r₂ = ${diff}, so the circles touch internally: only 1 common tangent, at the touch point.`,
        0: `d = ${d} is less than r₁ − r₂ = ${diff}, so the smaller circle lies inside the larger one and no line can touch both: 0 common tangents.`
      }[n];
      return {
        question:
          d === 0
            ? `Two circles of radii ${cm(r1)} and ${cm(r2)} have the same centre. How many common tangents can be drawn to them?`
            : `Two circles of radii ${cm(r1)} and ${cm(r2)} have their centres ${cm(d)} apart. How many common tangents can be drawn to them?`,
        explanation: `Compare d with r₁ + r₂ = ${sum} and r₁ − r₂ = ${diff}. ${verdict}`,
        solutionSteps: [`r₁ + r₂ = ${sum}; r₁ − r₂ = ${diff}.`, `d = ${d}.`, verdict],
        method: 'Compare d with r₁ + r₂ and r₁ − r₂: 4, 3, 2, 1 or 0 common tangents.',
        hints: [
          'How the circles sit decides the count: apart, touching, cutting, or one inside the other.',
          'Find r₁ + r₂ and r₁ − r₂ and see where d falls.',
          'd > r₁ + r₂: 4; d = r₁ + r₂: 3; between: 2; d = r₁ − r₂: 1; less: 0.'
        ],
        commonMistakes: ['Counting 2 tangents for circles that touch externally: the tangent at the touch point makes 3.', 'Forgetting the transverse tangents of circles that are apart.']
      };
    }
  },

  /* ---------------- two circles touching each other and a line ---------------- */
  {
    id: 'cir-adv2-touching-line',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-common-tangents',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cir-sc-touching-line'],
    tags: ['advanced'],
    estimatedSeconds: 60,
    formatValue: (value) => lengthText(value),
    params(rng) {
      const m = rng.int(2, 5);
      const n = rng.int(1, m - 1);
      if (gcd(m, n) !== 1) return null;
      const k = rng.int(1, Math.max(1, Math.floor(50 / (m * m))));
      return { r1: k * m * m, r2: k * n * n, gap: 2 * k * m * n, ask: rng.pick(['distance', 'distance', 'small', 'large']) };
    },
    answer: ({ r1, r2, ask }) => (ask === 'distance' ? 2 * Math.sqrt(r1 * r2) : ask === 'small' ? r2 : r1),
    distractors({ r1, r2, gap, ask }) {
      if (ask === 'distance') {
        return [
          { value: r1 + r2, why: 'gave the distance between the centres' },
          { value: Math.sqrt(r1 * r2), why: 'forgot the 2: used √(r₁r₂)' },
          { value: r1 - r2, why: 'used r₁ − r₂' },
          { value: Math.sqrt(r1 * r1 + r2 * r2), why: 'added the squares of the radii' }
        ];
      }
      const known = ask === 'small' ? r1 : r2;
      return [
        { value: (gap * gap) / known, why: 'forgot the 4 in PQ² = 4r₁r₂' },
        { value: (gap * gap) / (2 * known), why: 'used 2r₁r₂ instead of 4r₁r₂' },
        { value: Math.abs(gap - known), why: 'subtracted the lengths' },
        { value: gap / 2, why: 'took half of PQ as the radius' }
      ];
    },
    verify({ r1, r2, gap, ask }, value) {
      // Stand both circles on the line y = 0 (centres at height r), the given distance apart, and check they just touch.
      const [big, small, across] = ask === 'distance' ? [r1, r2, value] : ask === 'small' ? [r1, value, gap] : [value, r2, gap];
      return nearlyEqual(distance(at(0, big), at(across, small)), big + small, 1e-9);
    },
    render({ r1, r2, gap, ask }) {
      const labels = ask === 'distance' ? { AP: cm(r1), BQ: cm(r2), PQ: '?' } : ask === 'small' ? { AP: cm(r1), BQ: '?', PQ: cm(gap) } : { AP: '?', BQ: cm(r2), PQ: cm(gap) };
      const shown =
        ask === 'distance'
          ? `AP = ${cm(r1)}, BQ = ${cm(r2)}, and PQ is marked with a question mark.`
          : ask === 'small'
            ? `AP = ${cm(r1)}, PQ = ${cm(gap)}, and BQ is marked with a question mark.`
            : `BQ = ${cm(r2)}, PQ = ${cm(gap)}, and AP is marked with a question mark.`;
      const figure = touchingLineFigure({
        r1,
        r2,
        labels,
        caption: `Two circles touching each other and a line at P and Q${ask === 'distance' ? `, radii ${cm(r1)} and ${cm(r2)}; PQ is asked` : `; PQ = ${cm(gap)}`}`,
        ariaSummary: `Two circles with centres A and B touch each other and both touch a straight line, at P and Q. The radii AP and BQ are dashed and perpendicular to the line; AB passes through the point where the circles touch. ${shown}`
      });
      const why = 'Draw BR parallel to PQ, with R on AP. AB = r₁ + r₂ (the circles touch) and AR = r₁ − r₂, so PQ² = BR² = (r₁ + r₂)² − (r₁ − r₂)² = 4r₁r₂.';
      if (ask === 'distance') {
        return {
          question: `Two circles of radii ${cm(r1)} and ${cm(r2)} touch each other externally. Both touch a straight line, at P and Q. What is the length PQ?`,
          figure,
          explanation: `${why} PQ = 2√(r₁r₂) = 2√(${r1} × ${r2}) = 2√${r1 * r2} = 2 × ${gap / 2} = ${gap} cm.`,
          solutionSteps: ['PQ is the direct common tangent of two touching circles: d = r₁ + r₂.', `PQ = 2√(r₁r₂) = 2√(${r1} × ${r2}).`, `= 2 × ${gap / 2} = ${gap} cm.`],
          method: 'Circles touching each other and a line: PQ = 2√(r₁r₂).',
          hints: ['PQ is a direct common tangent. How far apart are the centres of touching circles?', 'd = r₁ + r₂, so PQ² = (r₁ + r₂)² − (r₁ − r₂)².', 'That simplifies to 4r₁r₂.'],
          commonMistakes: ['Giving AB = r₁ + r₂, the distance between the centres.', 'Forgetting the 2: √(r₁r₂) is half of PQ.']
        };
      }
      const known = ask === 'small' ? r1 : r2;
      const unknown = ask === 'small' ? r2 : r1;
      return {
        question: `Two circles touch each other externally and both touch a straight line, at P and Q. One circle has radius ${cm(known)} and PQ = ${cm(gap)}. What is the radius of the other circle?`,
        figure,
        explanation: `${why} So ${gap}² = 4 × ${known} × r, giving r = ${gap * gap} ÷ ${4 * known} = ${unknown} cm.`,
        solutionSteps: ['PQ² = 4r₁r₂.', `${gap}² = ${gap * gap} = 4 × ${known} × r = ${4 * known}r.`, `r = ${gap * gap} ÷ ${4 * known} = ${unknown} cm.`],
        method: 'PQ = 2√(r₁r₂), solved for the unknown radius.',
        hints: ['PQ is a direct common tangent of two touching circles.', 'PQ = 2√(r₁r₂), so PQ² = 4r₁r₂.', `${gap}² = 4 × ${known} × r.`],
        commonMistakes: ['Forgetting the 4: PQ² = 4r₁r₂, not r₁r₂.', 'Subtracting the given radius from PQ.']
      };
    }
  },

  /* ---------------- tangent and secant from one point ---------------- */
  {
    id: 'cir-adv2-tangent-secant',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-tangent-secant',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cir-adv-tangent-secant-f'],
    tags: ['advanced'],
    estimatedSeconds: 60,
    formatValue: (value) => lengthText(value),
    params(rng) {
      const t = rng.int(4, 24);
      // PA a divisor of PT², not too small, so the secant and the figure stay sensible.
      const divisors = [];
      for (let a = Math.ceil(t / 4); a < t; a++) if ((t * t) % a === 0 && (t * t) / a - a >= 2) divisors.push(a);
      if (!divisors.length) return null;
      const a = rng.pick(divisors);
      const ask = rng.pick(['tangent', 'chord', 'outside']);
      // Finding PA from PT and AB reads best when the chord is not much longer than the tangent.
      if (ask === 'outside' && 2 * a < t) return null;
      return { t, a, b: (t * t) / a, ask };
    },
    answer: ({ t, a, b, ask }) => (ask === 'tangent' ? Math.sqrt(a * b) : ask === 'chord' ? (t * t) / a - a : a),
    distractors({ t, a, b, ask }) {
      const c = b - a;
      if (ask === 'tangent') {
        return [
          { value: Math.sqrt(a * c), why: 'used the chord AB instead of the whole secant PB' },
          { value: (a + b) / 2, why: 'took the average of PA and PB' },
          { value: c, why: 'gave the chord AB' },
          { value: Math.sqrt(a * a + c * c), why: 'used Pythagoras on PA and AB' }
        ];
      }
      if (ask === 'chord') {
        return [
          { value: b, why: 'gave PB, the whole secant, instead of the chord' },
          { value: b + a, why: 'added PA instead of subtracting it' },
          { value: Math.sqrt(t * t - a * a), why: 'treated PTA as a right triangle' },
          { value: (t * t) / (2 * a), why: 'halved PT² ÷ PA' }
        ];
      }
      return [
        { value: (t * t) / c, why: 'used PT² = PA × AB, the chord instead of the whole secant' },
        { value: b, why: 'gave PB instead of PA' },
        { value: t > c ? Math.sqrt(t * t - c * c) : null, why: 'used Pythagoras on PT and AB' },
        { value: t - c / 2, why: 'subtracted half the chord from PT' },
        { value: t * t > c ? Math.sqrt(t * t - c) : null, why: 'wrote x² + AB = PT², dropping the x from x × AB' },
        { value: t - c, why: 'subtracted the chord from PT' },
        { value: (t * t) / c - c, why: 'found PB from PT² = PB × AB, then took AB away' }
      ];
    },
    verify({ t, a, b, ask }, value) {
      // A real circle through A and B with its centre off the line: measure the tangent from P = (0, 0).
      const [pa, pb] = ask === 'outside' ? [value, value + (b - a)] : ask === 'chord' ? [a, a + value] : [a, b];
      const centre = at((pa + pb) / 2, 1.3 + (pb - pa) / 3);
      const radius = distance(centre, at(pa));
      if (!nearlyEqual(distance(centre, at(pb)), radius, 1e-9)) return false;
      const tangent = tangentsFromPoint(A0, centre, radius)?.length;
      return nearlyEqual(tangent, ask === 'tangent' ? value : t, 1e-9);
    },
    render({ t, a, b, ask }) {
      const c = b - a;
      const labels = ask === 'tangent' ? { PA: cm(a), AB: cm(c), PT: '?' } : ask === 'chord' ? { PA: cm(a), AB: '?', PT: cm(t) } : { PA: '?', AB: cm(c), PT: cm(t) };
      const given = ask === 'tangent' ? `PA = ${cm(a)} and AB = ${cm(c)}` : ask === 'chord' ? `PT = ${cm(t)} and PA = ${cm(a)}` : `PT = ${cm(t)} and AB = ${cm(c)}`;
      const asked = ask === 'tangent' ? 'PT' : ask === 'chord' ? 'the chord AB' : 'PA';
      const figure = secantFigure({
        a,
        b,
        labels,
        caption: `Tangent PT and secant PAB from P; ${given}`,
        ariaSummary: `A circle with an outside point P. The tangent from P touches the circle at T; a straight line from P cuts the circle first at A, then at B. ${given.replace(' and ', ', ')}; ${asked === 'the chord AB' ? 'AB' : asked} is marked with a question mark.`
      });
      const steps = {
        tangent: [`PB = PA + AB = ${a} + ${c} = ${b}.`, `PT² = PA × PB = ${a} × ${b} = ${t * t}.`, `PT = ${t} cm.`],
        chord: [`PT² = ${t * t} = PA × PB = ${a} × PB.`, `PB = ${t * t} ÷ ${a} = ${b}.`, `AB = PB − PA = ${b} − ${a} = ${c} cm.`],
        outside: [`Let PA = x; then PB = x + ${c}.`, `x(x + ${c}) = ${t}² = ${t * t}.`, `x = ${a}, since ${a} × ${b} = ${t * t}: PA = ${a} cm.`]
      }[ask];
      return {
        question: `From a point P outside a circle, a tangent touches the circle at T, and a straight line through P cuts the circle at A and B (A nearer to P). If ${given}, what is ${asked}?`,
        figure,
        explanation: `The tangent–secant theorem: PT² = PA × PB, where PB is the whole secant from P to the far point B. ${steps.join(' ')}`,
        solutionSteps: ['PT² = PA × PB (the whole secant).', ...steps],
        method: 'Tangent–secant theorem: PT² = PA × PB.',
        hints: [
          'A tangent and a secant from the same outside point are linked by the tangent–secant theorem.',
          'PT² = PA × PB, with PB the whole secant, not just the chord.',
          ask === 'outside' ? `Try whole numbers x with x(x + ${c}) = ${t * t}.` : ask === 'tangent' ? `PB = ${a} + ${c}.` : `PB = ${t * t} ÷ ${a}.`
        ],
        commonMistakes: ['Using the chord AB instead of the whole secant PB.', ask === 'chord' ? 'Giving PB instead of the chord AB = PB − PA.' : 'Treating PT and the secant as sides of a right triangle.']
      };
    }
  },

  /* ---------------- where the tangents cross the line of centres ---------------- */
  {
    id: 'cir-adv2-centre-division',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-common-tangents',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cir-sc-tangent-division'],
    tags: ['advanced'],
    estimatedSeconds: 75,
    formatValue: (value) => lengthText(value),
    params(rng) {
      const kindName = rng.pick(['transverse', 'direct']);
      const r2 = rng.int(1, 8);
      const r1 = rng.int(r2 + 1, 12);
      // Keep the direct tangents' meeting point within about 3d of A, so the figure stays readable.
      if (kindName === 'direct' && 2 * r1 < 3 * r2) return null;
      const base = kindName === 'transverse' ? r1 + r2 : r1 - r2;
      // d a multiple of the base keeps both distances whole; the circles stay apart (d > r1 + r2).
      const mMin = Math.floor((r1 + r2) / base) + 1;
      const mMax = Math.min(Math.floor(60 / base), mMin + 5);
      if (mMin > mMax) return null;
      return { kindName, r1, r2, d: rng.int(mMin, mMax) * base, from: rng.pick(['A', 'B']) };
    },
    answer({ kindName, r1, r2, d, from }) {
      const base = kindName === 'transverse' ? r1 + r2 : r1 - r2;
      return (d * (from === 'A' ? r1 : r2)) / base;
    },
    distractors({ kindName, r1, r2, d, from }) {
      const mine = from === 'A' ? r1 : r2;
      const theirs = from === 'A' ? r2 : r1;
      const base = kindName === 'transverse' ? r1 + r2 : r1 - r2;
      const otherBase = kindName === 'transverse' ? r1 - r2 : r1 + r2;
      return [
        { value: (d * theirs) / base, why: 'put the ratio upside down (measured from the other centre)' },
        { value: (d * mine) / otherBase, why: kindName === 'transverse' ? 'used the external division (r₁ − r₂ parts)' : 'used the internal division (r₁ + r₂ parts)' },
        { value: d / 2, why: 'took the midpoint of the centres' },
        { value: (d * mine) / theirs, why: 'compared the distance with AB itself in the ratio of the radii' }
      ];
    },
    verify({ kindName, r1, r2, d, from }, value) {
      // Build the tangents and intersect each with the line of centres (the x-axis).
      const lines = tangentsOf(kindName, r1, r2, d);
      if (lines.length !== 2) return false;
      const centre = from === 'A' ? A0 : at(d);
      return lines.every((line) => {
        const X = lineIntersection(line.t1, { x: -line.normal.y, y: line.normal.x }, A0, { x: 1, y: 0 });
        return X !== null && nearlyEqual(distance(X, centre), value, 1e-9);
      });
    },
    render({ kindName, r1, r2, d, from }) {
      const transverse = kindName === 'transverse';
      const base = transverse ? r1 + r2 : r1 - r2;
      const mine = from === 'A' ? r1 : r2;
      const part = d / base;
      const value = mine * part;
      const centreName = from === 'A' ? `A (radius ${cm(r1)})` : `B (radius ${cm(r2)})`;
      const where = transverse ? 'between the circles' : 'beyond the smaller circle';
      return {
        question: `Two circles have centres A and B, ${cm(d)} apart, and radii ${cm(r1)} and ${cm(r2)}. Their ${kindName} common tangents meet the line AB at X, ${where}. How far is X from ${centreName}?`,
        figure: divisionFigure({
          r1,
          r2,
          d,
          kind: kindName,
          from,
          caption: `The two ${kindName} common tangents meet line AB at X; ${from}X is asked`,
          ariaSummary: `Two circles with centres A (radius ${cm(r1)}) and B (radius ${cm(r2)}), ${cm(d)} apart. Both ${kindName} common tangents are drawn and meet the line of centres at X, ${where}. The distance ${from}X is marked with a question mark.`
        }),
        explanation: transverse
          ? `The radii to a transverse tangent make two similar right triangles with X, so AX : XB = r₁ : r₂ = ${r1} : ${r2}: X divides AB internally in the ratio of the radii. AB is ${r1} + ${r2} = ${base} parts of ${fmt(part)} cm, so ${from}X = ${mine} × ${fmt(part)} = ${fmt(value)} cm.`
          : `The radii to a direct tangent make two similar right triangles with X, so XA : XB = r₁ : r₂ = ${r1} : ${r2}: X divides AB externally in the ratio of the radii, and AB = XA − XB is ${r1} − ${r2} = ${base} parts of ${fmt(part)} cm. So ${from}X = ${mine} × ${fmt(part)} = ${fmt(value)} cm.`,
        solutionSteps: transverse
          ? [`AX : XB = ${r1} : ${r2}, and AX + XB = ${d}.`, `One part = ${d} ÷ ${base} = ${fmt(part)}.`, `${from}X = ${mine} × ${fmt(part)} = ${fmt(value)} cm.`]
          : [`XA : XB = ${r1} : ${r2}, and XA − XB = AB = ${d}.`, `One part = ${d} ÷ ${base} = ${fmt(part)}.`, `${from}X = ${mine} × ${fmt(part)} = ${fmt(value)} cm.`],
        method: transverse ? 'Transverse tangents cut AB internally in r₁ : r₂.' : 'Direct tangents cut AB externally in r₁ : r₂.',
        hints: [
          'The radii to the tangent are both perpendicular to it. Which two triangles are similar?',
          transverse ? 'X divides AB internally in the ratio r₁ : r₂.' : 'X divides AB externally in the ratio r₁ : r₂: XA − XB = AB.',
          transverse ? `Split ${d} in the ratio ${r1} : ${r2}.` : `AB is ${r1} − ${r2} = ${base} parts.`
        ],
        commonMistakes: [
          transverse ? 'Using r₁ − r₂ parts, the external division of the direct tangents.' : 'Using r₁ + r₂ parts, the internal division of the transverse tangents.',
          'Measuring from the wrong centre (the ratio upside down).'
        ]
      };
    }
  }
];
