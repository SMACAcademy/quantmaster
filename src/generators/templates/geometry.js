/**
 * Angle-geometry templates: polygons, lines and angles, triangles,
 * quadrilaterals and circles.
 *
 * Figures are drawn at the true angles and lengths of each instance, and the
 * independent checks measure the answer back off those coordinates.
 */

import { fmt, fractionText, nearlyEqual, reduceFraction } from '../core.js';

const deg = (v) => `${fmt(v, 1)}°`;
const VERTEX_IDS = 'ABCDEFGHIJKL';
const round1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const rad = (degrees) => (degrees * Math.PI) / 180;
const cm = (v) => `${fmt(v)} cm`;

/** The point `length` away from `from`, at `degrees` anticlockwise from the positive x-axis. */
const dir = (degrees, length, from = { x: 0, y: 0 }) => ({
  x: from.x + length * Math.cos(rad(degrees)),
  y: from.y + length * Math.sin(rad(degrees))
});

/** ∠PAQ in degrees (0–180), measured from coordinates. */
function angleAt(a, p, q) {
  const ux = p.x - a.x;
  const uy = p.y - a.y;
  const vx = q.x - a.x;
  const vy = q.y - a.y;
  const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
const measuresAs = (measured, value) => Math.abs(measured - value) < 1e-6;

function centreOf(points) {
  const list = Object.values(points);
  return { x: list.reduce((s, p) => s + p.x, 0) / list.length, y: list.reduce((s, p) => s + p.y, 0) / list.length };
}

/**
 * Figure points from a { id: {x, y} } map: coordinates rounded, labels pushed
 * away from `centre` (screen y runs downward, hence the flip). `extra[id]`
 * overrides per point, e.g. { hidden: true } or a hand-placed labelOffset.
 */
function figurePoints(named, centre, extra = {}) {
  return Object.entries(named).map(([id, p]) => {
    const dx = p.x - centre.x;
    const dy = p.y - centre.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      id,
      x: r2(p.x),
      y: r2(p.y),
      labelOffset: [Math.round((dx / len) * 13) - 3, Math.round((-dy / len) * 13) + 4],
      ...(extra[id] || {})
    };
  });
}

/** "3x + 10", "x − 5", "2x". */
function linearText(a, b) {
  const ax = a === 1 ? 'x' : `${a}x`;
  if (b === 0) return ax;
  return b > 0 ? `${ax} + ${b}` : `${ax} − ${-b}`;
}

/** An angle written in terms of x: "(3x + 10)°", or "3x°" with no constant. */
const angleText = (a, b) => (b === 0 ? `${linearText(a, b)}°` : `(${linearText(a, b)})°`);

/**
 * Two expressions ax + b and cx + d, with a whole-number x, that either equal
 * each other (both = first) or add up to 180 (first + second).
 */
function anglePair(rng, { equal, first }) {
  const x = rng.int(4, 20);
  const a = rng.int(2, 5);
  const c = rng.int(1, 4);
  if (a === c) return null;
  const second = equal ? first : 180 - first;
  const b = first - a * x;
  const d = second - c * x;
  if (Math.abs(b) > 60 || Math.abs(d) > 60) return null;
  return { x, a, b, c, d, first, second, equal };
}

/** x from the expressions as displayed, then the first angle. */
function solveAnglePair({ a, b, c, d, equal }) {
  const x = equal ? (d - b) / (a - c) : (180 - b - d) / (a + c);
  return a * x + b;
}

const signed = (n) => (n < 0 ? `−${-n}` : String(n));

function anglePairSteps({ x, a, b, c, d, first, equal }) {
  const left = linearText(a, b);
  const right = linearText(c, d);
  const substituted = `${a === 1 ? '' : `${a} × `}${x}${b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${-b}`} = ${first}°.`;
  if (equal) {
    const [coef, rhs] = a > c ? [a - c, d - b] : [c - a, b - d];
    return [`${left} = ${right}.`, `${coef === 1 ? '' : coef}x = ${signed(rhs)}, so x = ${x}.`, substituted];
  }
  const k = b + d;
  const collected = k === 0 ? `${a + c}x = 180` : `${a + c}x ${k > 0 ? '+' : '−'} ${Math.abs(k)} = 180`;
  return [`(${left}) + (${right}) = 180.`, `${collected}, so x = ${x}.`, substituted];
}

/** Vertices of a regular n-gon (n ≤ 12), first vertex at the top, labelled clockwise. */
function regularPolygonPoints(n, r = 5) {
  return Array.from({ length: n }, (_, i) => {
    const angle = ((90 - (i * 360) / n) * Math.PI) / 180;
    const x = round1(r * Math.cos(angle));
    const y = round1(r * Math.sin(angle));
    // Labels sit just outside the vertex; screen y runs downward, so flip it.
    return { id: VERTEX_IDS[i], x, y, labelOffset: [Math.round((x / r) * 14), Math.round((-y / r) * 14)] };
  });
}

function polygonFigure(n, caption, { diagonalsFromFirst = false } = {}) {
  if (n > VERTEX_IDS.length) return undefined;
  const points = regularPolygonPoints(n);
  const ids = points.map((p) => p.id);
  const shapes = [{ type: 'polygon', points: ids }];
  if (diagonalsFromFirst) {
    for (const target of ids.slice(2, n - 1)) shapes.push({ type: 'segment', from: 'A', to: target, style: 'dashed' });
  }
  return { type: 'diagram', caption, points, shapes, ariaSummary: caption };
}

const POLYGON_NAMES = {
  3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon',
  9: 'nonagon', 10: 'decagon', 12: 'dodecagon'
};
const polygonName = (n) => POLYGON_NAMES[n] || `${n}-sided polygon`;
const withSides = (n) => (POLYGON_NAMES[n] ? `${polygonName(n)} (${n} sides)` : polygonName(n));
/** "a"/"an" for a word or a number read aloud (an octagon, an 8-sided, an 11-sided, an 18-sided). */
const article = (text) => (/^([aeiou]|8|11-|18-)/i.test(text) ? `an ${text}` : `a ${text}`);
const cap = (text) => text[0].toUpperCase() + text.slice(1);

/* Regular polygons whose interior angle is a whole or half degree (16 gives 157.5°). */
const REGULAR_SIDES = [4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 30, 36, 40, 45, 60];
/* Exterior angles that give a whole number of sides from 5 to 36. */
const EXTERIOR_ANGLES = [72, 60, 45, 40, 36, 30, 24, 20, 18, 15, 12, 10];

/* Primitive Pythagorean triples, scaled up at use. */
const TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41]
];

/** A Pythagorean triple (legs a < b, hypotenuse c) with c ≤ maxHyp. */
function pickTriple(rng, maxHyp) {
  const [a, b, c] = rng.pick(TRIPLES);
  const k = rng.int(1, Math.max(1, Math.floor(maxHyp / c)));
  return c * k > maxHyp ? null : [a * k, b * k, c * k];
}

/** A multiple of 5 in [lo, hi] that is not a right angle. */
function obliqueAngle(rng, lo, hi) {
  const value = 5 * rng.int(Math.ceil(lo / 5), Math.floor(hi / 5));
  return value === 90 ? null : value;
}

/* ---------------------------- figure geometry ---------------------------- */

/** AOB is a straight line; ray OC makes ∠BOC = boc. */
const straightLine = (boc) => ({ A: { x: -5, y: 0 }, B: { x: 5, y: 0 }, O: { x: 0, y: 0 }, C: dir(boc, 4) });

/** Lines AB (horizontal) and CD cross at O, with ∠BOC = boc. */
const crossingLines = (boc) => ({ A: { x: -5, y: 0 }, B: { x: 5, y: 0 }, C: dir(boc, 5), D: dir(boc + 180, 5), O: { x: 0, y: 0 } });

/**
 * Parallel lines AB (top) and CD (bottom), cut by a transversal EF meeting
 * them at X and Y, at `t` degrees to the parallels. ∠AXY = t.
 */
function parallelLines(t) {
  const u = dir(t, 1);
  const Y = { x: 0, y: 0 };
  const X = { x: (4 / u.y) * u.x, y: 4 };
  const left = Math.min(X.x, 0) - 4;
  const right = Math.max(X.x, 0) + 6;
  return {
    A: { x: left, y: 4 }, B: { x: right, y: 4 },
    C: { x: left, y: 0 }, D: { x: right, y: 0 },
    X, Y,
    E: { x: X.x + 2 * u.x, y: X.y + 2 * u.y },
    F: { x: Y.x - 2 * u.x, y: Y.y - 2 * u.y },
    // Short stretches near the right-hand ends, so the ">" marks sit clear of the crossings.
    G: { x: right - 2.5, y: 4 },
    H: { x: right - 2.5, y: 0 }
  };
}

/** Label offset (screen px) along a bearing in degrees, anticlockwise from the x-axis. */
const labelToward = (degrees, distance = 14) => {
  const p = dir(degrees, distance);
  return [Math.round(p.x) - 4, Math.round(-p.y) + 4];
};

/**
 * X and Y labels go in the one angle at each crossing that is never marked:
 * ∠BXE above-right of X, and ∠DYF below-right of Y.
 */
const parallelLabelOffsets = (t) => ({
  X: { labelOffset: labelToward(t / 2) },
  Y: { labelOffset: labelToward((t - 180) / 2) },
  G: { hidden: true },
  H: { hidden: true }
});

/** Triangle with P at the origin and Q `base` along the x-axis, angle p at P and q at Q: returns the apex. */
function apex(p, q, base) {
  return dir(p, (base * Math.sin(rad(q))) / Math.sin(rad(180 - p - q)));
}

/** Triangle ABC from its three sides, A at the origin and B on the x-axis. Null if impossible. */
function triangleFromSides(ab, bc, ca) {
  const x = (ca * ca + ab * ab - bc * bc) / (2 * ab);
  const ySquared = ca * ca - x * x;
  if (ySquared <= 0) return null;
  return { A: { x: 0, y: 0 }, B: { x: ab, y: 0 }, C: { x, y: Math.sqrt(ySquared) } };
}

/** Convex quadrilateral ABCD (anticlockwise) with interior angles A, B, C; D closes it. Null if it won't close sensibly. */
function quadrilateralFromAngles(A, B, C, ab = 8, bc = 6) {
  const pA = { x: 0, y: 0 };
  const pB = { x: ab, y: 0 };
  const bcDir = 180 - B;
  const pC = dir(bcDir, bc, pB);
  const u = dir(A, 1);
  const v = dir(bcDir + 180 - C, 1);
  // pA + t·u = pC + s·v, solved by Cramer's rule.
  const det = u.x * -v.y + v.x * u.y;
  if (Math.abs(det) < 1e-9) return null;
  const t = (pC.x * -v.y + v.x * pC.y) / det;
  const s = (u.x * pC.y - u.y * pC.x) / det;
  if (t < 2.5 || s < 2.5) return null;
  return { A: pA, B: pB, C: pC, D: dir(A, t, pA) };
}

/* --------------------------- coordinate geometry --------------------------- */

const coord = (n) => (n < 0 ? `−${-n}` : String(n));
const pointText = (id, p) => `${id}(${coord(p.x)}, ${coord(p.y)})`;
/** A number that follows "−" or "+": negatives get brackets, "5 − (−3)". */
const neg = (n) => (n < 0 ? `(${coord(n)})` : coord(n));

/** "(3, −2)" back to {x, y}. */
function parsePoint(text) {
  const [x, y] = text.replace(/[()]/g, '').split(',').map((part) => Number(part.trim().replace('−', '-')));
  return { x, y };
}

/** Slope dy/dx as reduced text: "3/4", "−2", "−1/3". */
function slopeText(dy, dx) {
  const [n, d] = reduceFraction(Math.abs(dy), Math.abs(dx));
  return `${dy * dx < 0 ? '−' : ''}${fractionText([n, d])}`;
}

function parseSlope(text) {
  const negative = text.startsWith('−');
  const [n, d = '1'] = text.replace('−', '').split('/');
  return ((negative ? -1 : 1) * Number(n)) / Number(d);
}

/** A coordinate-plane figure fitted around the points (always including the origin). */
function planeFigure(named, caption, { segments = [], lines = [] } = {}) {
  const list = Object.entries(named);
  const xs = list.map(([, p]) => p.x);
  const ys = list.map(([, p]) => p.y);
  const centre = centreOf(named);
  // A full line runs past its points in both directions, so labels go to the side of it:
  // above-right of a falling line, below-right of a rising one. A segment ends at its
  // points, so there each label goes on the far side from the others. Plane labels are
  // left-anchored, so a label to the left shifts back by its approximate width.
  const [p1, p2] = list.map(([, p]) => p);
  const rising = lines.length && (p2.y - p1.y) * (p2.x - p1.x) > 0;
  const labelOffset = (label, p) =>
    lines.length
      ? [7, rising ? 16 : -8]
      : [p.x < centre.x ? -Math.round(label.length * 6.3 + 6) : 7, p.y < centre.y ? 16 : -8];
  return {
    type: 'coordinate-plane',
    caption,
    xRange: [Math.min(0, ...xs) - 1, Math.max(0, ...xs) + 2],
    yRange: [Math.min(0, ...ys) - 1, Math.max(0, ...ys) + 1],
    points: list.map(([id, p]) => {
      const label = pointText(id, p);
      return { id, x: p.x, y: p.y, label, labelOffset: labelOffset(label, p) };
    }),
    segments,
    lines,
    ariaSummary: `${caption}. Points ${list.map(([id, p]) => pointText(id, p)).join(' and ')}.`
  };
}

/** Two lattice points A and B, B offset from A by (dx, dy) in random directions. */
function latticePair(rng, dx, dy) {
  const A = { x: rng.int(-5, 5), y: rng.int(-5, 5) };
  const B = { x: A.x + (rng.chance(0.5) ? dx : -dx), y: A.y + (rng.chance(0.5) ? dy : -dy) };
  return Math.max(Math.abs(B.x), Math.abs(B.y)) > 12 ? null : { A, B };
}

/** Parallelogram ABCD with ∠A = a. */
const parallelogram = (a) => {
  const D = dir(a, 5);
  return { A: { x: 0, y: 0 }, B: { x: 8, y: 0 }, C: { x: 8 + D.x, y: D.y }, D };
};

export const geometryTemplates = [
  /* ================================ polygons ================================ */
  {
    id: 'poly-interior-sum',
    version: 1,
    topicId: 'polygons',
    conceptId: 'poly-interiorsum',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['poly-interiorsum-f'],
    estimatedSeconds: 35,
    formatValue: (value) => deg(value),
    params(rng) {
      return { n: rng.int(5, 20) };
    },
    answer: ({ n }) => (n - 2) * 180,
    distractors: ({ n }) => [
      { value: n * 180, why: 'forgot to subtract 2' },
      { value: (n - 1) * 180, why: 'subtracted only 1' },
      { value: 360, why: 'used the exterior angle sum' },
      { value: (n - 2) * 90, why: 'used 90° per triangle' }
    ],
    // Diagonals from one vertex reach every vertex except itself and its two
    // neighbours; they split the polygon into one more triangle than diagonals.
    verify: ({ n }, value) => (n - 3 + 1) * 180 === value,
    render({ n }) {
      return {
        question: `What is the sum of the interior angles of ${article(withSides(n))}?`,
        figure: polygonFigure(n, `${cap(article(polygonName(n)))} split into triangles from one vertex`, { diagonalsFromFirst: true }),
        explanation: `Diagonals from one vertex split ${article(`${n}-sided`)} polygon into ${n - 2} triangles, each 180°. Sum = (${n} − 2) × 180 = ${(n - 2) * 180}°.`,
        solutionSteps: [`${n} − 2 = ${n - 2} triangles.`, `${n - 2} × 180 = ${(n - 2) * 180}.`],
        method: 'Sum of interior angles = (n − 2) × 180°.',
        hints: [n <= VERTEX_IDS.length ? 'Count the triangles the dashed diagonals make.' : 'Picture diagonals drawn from one vertex, and count the triangles they make.', 'Each triangle contributes 180°.'],
        commonMistakes: [`Using n × 180 = ${n * 180}°.`]
      };
    }
  },

  {
    id: 'poly-regular-interior',
    version: 1,
    topicId: 'polygons',
    conceptId: 'poly-regular',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['poly-regular-f'],
    answerDecimals: 1,
    estimatedSeconds: 45,
    formatValue: (value) => deg(value),
    params(rng) {
      return { n: rng.pick(REGULAR_SIDES) };
    },
    answer: ({ n }) => ((n - 2) * 180) / n,
    distractors: ({ n }) => [
      { value: 360 / n, why: 'found the exterior angle' },
      { value: (n - 2) * 180, why: 'gave the total instead of one angle' },
      { value: 180 - 180 / n, why: 'halved the exterior angle' },
      { value: (n * 180) / (n + 2), why: 'swapped n and n − 2' }
    ],
    // Interior + exterior = 180°, and the exterior angles share 360° equally.
    verify: ({ n }, value) => Math.abs(value - (180 - 360 / n)) < 1e-9,
    render({ n }) {
      const each = ((n - 2) * 180) / n;
      return {
        question: `What is each interior angle of a regular ${withSides(n)}?`,
        figure: polygonFigure(n, `A regular ${polygonName(n)}`),
        explanation: `Sum = (${n} − 2) × 180 = ${(n - 2) * 180}°. All ${n} angles are equal, so each is ${(n - 2) * 180} ÷ ${n} = ${deg(each)}.`,
        solutionSteps: [`(${n} − 2) × 180 = ${(n - 2) * 180}.`, `${(n - 2) * 180} ÷ ${n} = ${fmt(each, 1)}.`],
        method: `Each interior angle = (n − 2) × 180° ÷ n, or 180° − 360°/n.`,
        hints: ['Find the total of the interior angles first.', 'A regular polygon shares that total equally.'],
        commonMistakes: [`Giving 360 ÷ ${n} = ${deg(360 / n)}, which is the exterior angle.`]
      };
    }
  },

  {
    id: 'poly-sides-from-angle',
    version: 1,
    topicId: 'polygons',
    conceptId: 'poly-extangle',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['poly-extangle-f'],
    estimatedSeconds: 60,
    params(rng) {
      return { e: rng.pick(EXTERIOR_ANGLES), givenInterior: rng.chance(0.5) };
    },
    answer: ({ e }) => 360 / e,
    verify: ({ e }, value) => Number.isInteger(value) && value >= 3 && value * e === 360,
    render({ e, givenInterior }) {
      const n = 360 / e;
      const interior = 180 - e;
      return {
        question: givenInterior
          ? `Each interior angle of a regular polygon is ${interior}°. How many sides does it have?`
          : `Each exterior angle of a regular polygon is ${e}°. How many sides does it have?`,
        explanation: `${givenInterior ? `Exterior angle = 180 − ${interior} = ${e}°. ` : ''}The exterior angles add up to 360°, so n = 360 ÷ ${e} = ${n}.`,
        solutionSteps: [...(givenInterior ? [`180 − ${interior} = ${e}.`] : []), `360 ÷ ${e} = ${n}.`],
        method: 'Number of sides = 360° ÷ exterior angle.',
        hints: [givenInterior ? 'Turn the interior angle into the exterior angle first: they add up to 180°.' : 'The exterior angles of any convex polygon total 360°.', 'Divide 360 by one exterior angle.'],
        commonMistakes: givenInterior ? [`Dividing 360 by the interior angle ${interior}°.`] : ['Dividing 180 by the exterior angle.']
      };
    }
  },

  {
    id: 'poly-diagonals-count',
    version: 1,
    topicId: 'polygons',
    conceptId: 'poly-diagonals',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['poly-diagonals-f'],
    estimatedSeconds: 45,
    formatValue: (value) => fmt(value),
    params(rng) {
      return { n: rng.int(5, 20) };
    },
    answer: ({ n }) => (n * (n - 3)) / 2,
    distractors: ({ n }) => [
      { value: n * (n - 3), why: 'counted each diagonal twice' },
      { value: (n * (n - 1)) / 2, why: 'counted the sides as diagonals too' },
      { value: n - 3, why: 'counted from one vertex only' },
      { value: (n * (n - 2)) / 2, why: 'excluded only one neighbour' }
    ],
    verify({ n }, value) {
      // Count every pair of vertices that are not next to each other.
      let count = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const adjacent = j - i === 1 || (i === 0 && j === n - 1);
          if (!adjacent) count += 1;
        }
      }
      return count === value;
    },
    render({ n }) {
      return {
        question: `How many diagonals does ${article(withSides(n))} have?`,
        figure: polygonFigure(n, cap(article(withSides(n)))),
        explanation: `Each vertex joins to ${n} − 3 = ${n - 3} others by a diagonal (not itself or its two neighbours). That counts every diagonal twice, so the total is ${n} × ${n - 3} ÷ 2 = ${(n * (n - 3)) / 2}.`,
        solutionSteps: [`${n} × ${n - 3} = ${n * (n - 3)}.`, `${n * (n - 3)} ÷ 2 = ${(n * (n - 3)) / 2}.`],
        method: 'Number of diagonals = n(n − 3) ÷ 2.',
        hints: ['From one vertex, you cannot draw a diagonal to itself or its two neighbours.', 'Each diagonal has two ends, so halve the count.'],
        commonMistakes: [`Forgetting to halve: ${n * (n - 3)}.`]
      };
    }
  },

  /* ============================ lines and angles ============================ */
  {
    id: 'la-straight-line',
    version: 1,
    topicId: 'lines-angles',
    conceptId: 'la-pairs',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['la-straight-f'],
    estimatedSeconds: 30,
    params(rng) {
      const boc = obliqueAngle(rng, 25, 155);
      return boc === null ? null : { boc, aoc: 180 - boc };
    },
    answer: ({ boc }) => boc,
    verify({ aoc }, value) {
      // Draw OC at the given ∠AOC from OA (which points along 180°), then measure ∠BOC.
      const g = { ...straightLine(0), C: dir(180 - aoc, 4) };
      return measuresAs(angleAt(g.O, g.B, g.C), value);
    },
    render({ boc, aoc }) {
      const caption = `AOB is a straight line and ∠AOC = ${aoc}°`;
      return {
        question: `In the figure, AOB is a straight line and ∠AOC = ${aoc}°. What is ∠BOC?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(straightLine(boc), { x: 0, y: -1 }, { O: { labelOffset: [-4, 16] } }),
          shapes: [{ type: 'segment', from: 'A', to: 'B' }, { type: 'segment', from: 'O', to: 'C' }],
          angles: [
            { at: 'O', from: 'A', to: 'C', label: `${aoc}°`, radius: 18 },
            { at: 'O', from: 'B', to: 'C', label: '?', radius: 26 }
          ],
          ariaSummary: `${caption}. ∠BOC is marked with a question mark.`
        },
        explanation: `Angles on a straight line add up to 180°, so ∠BOC = 180 − ${aoc} = ${boc}°.`,
        solutionSteps: ['∠AOC + ∠BOC = 180°.', `180 − ${aoc} = ${boc}.`],
        method: 'Angles on a straight line sum to 180°.',
        hints: ['∠AOC and ∠BOC together make the straight angle AOB.', 'Subtract the known angle from 180°.'],
        commonMistakes: ['Subtracting from 90° instead of 180°.', 'Assuming ∠BOC equals ∠AOC.']
      };
    }
  },

  {
    id: 'la-vertical-angles',
    version: 1,
    topicId: 'lines-angles',
    conceptId: 'la-vertical',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['la-vertical-f', 'la-straight-f'],
    estimatedSeconds: 30,
    formatValue: (value) => deg(value),
    params(rng) {
      const boc = obliqueAngle(rng, 25, 155);
      return boc === null ? null : { boc, opposite: rng.chance(0.5) };
    },
    answer: ({ boc, opposite }) => (opposite ? boc : 180 - boc),
    distractors: ({ boc, opposite }) => [
      { value: opposite ? 180 - boc : boc, why: opposite ? 'treated it as a straight-line pair' : 'treated it as vertically opposite' },
      { value: Math.abs(90 - boc), why: 'used 90° instead of 180°' },
      { value: 360 - (opposite ? boc : 180 - boc), why: 'used a full turn' },
      { value: 2 * boc < 180 ? 2 * boc : null, why: 'doubled the angle' }
    ],
    verify({ boc, opposite }, value) {
      const g = crossingLines(boc);
      return measuresAs(opposite ? angleAt(g.O, g.A, g.D) : angleAt(g.O, g.A, g.C), value);
    },
    render({ boc, opposite }) {
      const target = opposite ? '∠AOD' : '∠AOC';
      const caption = `Lines AB and CD cross at O, with ∠BOC = ${boc}°`;
      return {
        question: `Lines AB and CD cross at O. If ∠BOC = ${boc}°, what is ${target}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(crossingLines(boc), { x: 0, y: 0 }, { O: { labelOffset: [6, 18] } }),
          shapes: [{ type: 'segment', from: 'A', to: 'B' }, { type: 'segment', from: 'C', to: 'D' }],
          angles: [
            { at: 'O', from: 'B', to: 'C', label: `${boc}°`, radius: 22 },
            { at: 'O', from: 'A', to: opposite ? 'D' : 'C', label: '?', radius: 22 }
          ],
          ariaSummary: `${caption}. ${target} is marked with a question mark.`
        },
        explanation: opposite
          ? `∠AOD and ∠BOC are vertically opposite angles, so they are equal: ∠AOD = ${boc}°.`
          : `∠AOC and ∠BOC lie together on the straight line AB, so ∠AOC = 180 − ${boc} = ${180 - boc}°.`,
        solutionSteps: opposite ? ['∠AOD is vertically opposite ∠BOC.', `∠AOD = ${boc}°.`] : ['∠AOC + ∠BOC = 180°.', `180 − ${boc} = ${180 - boc}.`],
        method: opposite ? 'Vertically opposite angles are equal.' : 'Angles on a straight line sum to 180°.',
        hints: [opposite ? '∠AOD sits directly across the crossing point from ∠BOC.' : '∠AOC sits next to ∠BOC on the line AB.', 'Across the crossing: equal. Side by side on a line: add to 180°.'],
        commonMistakes: ['Mixing up vertically opposite angles (equal) with angles on a line (sum to 180°).']
      };
    }
  },

  {
    id: 'la-parallel-transversal',
    version: 1,
    topicId: 'lines-angles',
    conceptId: 'la-parallel',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['la-parallel-f'],
    estimatedSeconds: 45,
    formatValue: (value) => deg(value),
    params(rng) {
      const t = obliqueAngle(rng, 40, 140);
      return t === null ? null : { t, kind: rng.pick(['alternate', 'co-interior', 'corresponding']) };
    },
    answer: ({ t, kind }) => (kind === 'co-interior' ? 180 - t : t),
    distractors: ({ t, kind }) => [
      { value: kind === 'co-interior' ? t : 180 - t, why: kind === 'co-interior' ? 'treated co-interior angles as equal' : 'treated equal angles as supplementary' },
      { value: Math.abs(90 - t), why: 'used 90°' },
      { value: 360 - (kind === 'co-interior' ? 180 - t : t), why: 'used a full turn' },
      { value: 2 * t < 180 ? 2 * t : null, why: 'doubled the angle' }
    ],
    verify({ t, kind }, value) {
      const g = parallelLines(t);
      const target = { alternate: [g.Y, g.D, g.X], 'co-interior': [g.Y, g.C, g.X], corresponding: [g.Y, g.C, g.F] }[kind];
      return measuresAs(angleAt(...target), value) && measuresAs(angleAt(g.X, g.A, g.Y), t);
    },
    render({ t, kind }) {
      const target = { alternate: '∠DYX', 'co-interior': '∠CYX', corresponding: '∠CYF' }[kind];
      const [from, to] = { alternate: ['D', 'X'], 'co-interior': ['C', 'X'], corresponding: ['C', 'F'] }[kind];
      const g = parallelLines(t);
      const caption = `Parallel lines AB and CD cut by the line EF at X and Y; ∠AXY = ${t}°`;
      const answer = kind === 'co-interior' ? 180 - t : t;
      return {
        question: `AB is parallel to CD, and the line EF cuts them at X and Y. If ∠AXY = ${t}°, what is ${target}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g), parallelLabelOffsets(t)),
          shapes: [
            { type: 'segment', from: 'A', to: 'B' },
            { type: 'segment', from: 'C', to: 'D' },
            { type: 'segment', from: 'E', to: 'F' }
          ],
          parallels: [{ on: ['G', 'B'], count: 1 }, { on: ['H', 'D'], count: 1 }],
          angles: [
            { at: 'X', from: 'A', to: 'Y', label: `${t}°`, radius: 20 },
            { at: 'Y', from, to, label: '?', radius: 20 }
          ],
          ariaSummary: `${caption}. ${target} is marked with a question mark.`
        },
        explanation: {
          alternate: `∠AXY and ∠DYX are alternate angles (a Z shape between the parallels), so they are equal: ${target} = ${t}°.`,
          'co-interior': `∠AXY and ∠CYX are co-interior angles (same side, between the parallels), so they add up to 180°: ${target} = 180 − ${t} = ${answer}°.`,
          corresponding: `∠AXY and ∠CYF are corresponding angles (the same position at each crossing), so they are equal: ${target} = ${t}°.`
        }[kind],
        solutionSteps: [`${target} and ∠AXY are ${kind} angles.`, kind === 'co-interior' ? `180 − ${t} = ${answer}.` : `So ${target} = ${t}°.`],
        method: 'Alternate and corresponding angles are equal; co-interior angles add up to 180°.',
        hints: ['Find where each angle sits: between the parallels or outside, and on which side of EF.', kind === 'co-interior' ? 'Both angles are between the parallels, on the same side of EF.' : 'Look for a Z shape (alternate) or an F shape (corresponding).'],
        commonMistakes: ['Treating co-interior angles as equal instead of supplementary.']
      };
    }
  },

  {
    id: 'la-solve-algebra',
    version: 1,
    topicId: 'lines-angles',
    conceptId: 'la-solve',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['la-straight-f', 'la-vertical-f'],
    estimatedSeconds: 75,
    params(rng) {
      const equal = rng.chance(0.5);
      const first = obliqueAngle(rng, 60, 120);
      return first === null ? null : anglePair(rng, { equal, first });
    },
    answer: ({ first }) => first,
    verify: (p, value) => nearlyEqual(solveAnglePair(p), value),
    render(p) {
      const { a, b, c, d, first, equal } = p;
      const left = angleText(a, b);
      const right = angleText(c, d);
      if (equal) {
        const caption = `Lines AB and CD cross at O; ∠BOC = ${left}, ∠AOD = ${right}`;
        return {
          question: `Lines AB and CD cross at O, with ∠BOC = ${left} and ∠AOD = ${right}. What is ∠BOC?`,
          figure: {
            type: 'diagram',
            caption,
            points: figurePoints(crossingLines(first), { x: 0, y: 0 }, { O: { labelOffset: [6, 18] } }),
            shapes: [{ type: 'segment', from: 'A', to: 'B' }, { type: 'segment', from: 'C', to: 'D' }],
            angles: [
              { at: 'O', from: 'B', to: 'C', label: left, radius: 22, labelRadius: 60 },
              { at: 'O', from: 'A', to: 'D', label: right, radius: 22, labelRadius: 60 }
            ],
            ariaSummary: caption
          },
          explanation: `∠BOC and ∠AOD are vertically opposite, so they are equal. Solving gives x = ${p.x}, so ∠BOC = ${first}°.`,
          solutionSteps: anglePairSteps(p),
          method: 'Set vertically opposite angles equal, solve for x, then substitute.',
          hints: ['∠BOC and ∠AOD are vertically opposite.', 'Write an equation, find x, then put it back in.'],
          commonMistakes: ['Stopping at x instead of finding the angle.', 'Adding the two angles to 180° when they are vertically opposite.']
        };
      }
      const caption = `AOB is a straight line; ∠AOC = ${left}, ∠BOC = ${right}`;
      return {
        question: `AOB is a straight line, with ∠AOC = ${left} and ∠BOC = ${right}. What is ∠AOC?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(straightLine(180 - first), { x: 0, y: -1 }, { O: { labelOffset: [-4, 16] } }),
          shapes: [{ type: 'segment', from: 'A', to: 'B' }, { type: 'segment', from: 'O', to: 'C' }],
          angles: [
            { at: 'O', from: 'A', to: 'C', label: left, radius: 20, labelRadius: 56 },
            { at: 'O', from: 'B', to: 'C', label: right, radius: 26, labelRadius: 56 }
          ],
          ariaSummary: caption
        },
        explanation: `Angles on a straight line add up to 180°. Solving gives x = ${p.x}, so ∠AOC = ${first}°.`,
        solutionSteps: anglePairSteps(p),
        method: 'Add the two angles, set the sum to 180°, solve for x, then substitute.',
        hints: ['∠AOC and ∠BOC make the straight angle AOB.', 'Write an equation, find x, then put it back in.'],
        commonMistakes: ['Stopping at x instead of finding the angle.', 'Setting the two angles equal instead of adding them to 180°.']
      };
    }
  },

  /* ================================ triangles ================================ */
  {
    id: 'tri-angle-sum',
    version: 1,
    topicId: 'triangles',
    conceptId: 'tri-anglesum',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['tri-anglesum-f'],
    estimatedSeconds: 30,
    params(rng) {
      const A = 5 * rng.int(5, 22);
      const B = 5 * rng.int(5, 22);
      if (180 - A - B < 20) return null;
      return { A, B };
    },
    answer: ({ A, B }) => 180 - A - B,
    verify({ A, B }, value) {
      const C = apex(A, B, 8);
      return measuresAs(angleAt(C, { x: 0, y: 0 }, { x: 8, y: 0 }), value);
    },
    render({ A, B }) {
      const g = { A: { x: 0, y: 0 }, B: { x: 8, y: 0 }, C: apex(A, B, 8) };
      const caption = `Triangle ABC with ∠A = ${A}° and ∠B = ${B}°`;
      return {
        question: `In triangle ABC, ∠A = ${A}° and ∠B = ${B}°. What is ∠C?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g)),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C'] }],
          angles: [
            { at: 'A', from: 'B', to: 'C', label: `${A}°`, radius: 20 },
            { at: 'B', from: 'A', to: 'C', label: `${B}°`, radius: 20 },
            { at: 'C', from: 'A', to: 'B', label: '?', radius: 18 }
          ],
          ariaSummary: `${caption}. ∠C is marked with a question mark.`
        },
        explanation: `The angles of a triangle add up to 180°, so ∠C = 180 − ${A} − ${B} = ${180 - A - B}°.`,
        solutionSteps: [`${A} + ${B} = ${A + B}.`, `180 − ${A + B} = ${180 - A - B}.`],
        method: 'Angle sum of a triangle: A + B + C = 180°.',
        hints: ['All three angles of any triangle add up to 180°.', 'Add the two you know, then subtract from 180°.'],
        commonMistakes: ['Subtracting from 360°, the quadrilateral total.']
      };
    }
  },

  {
    id: 'tri-exterior-angle',
    version: 1,
    topicId: 'triangles',
    conceptId: 'tri-exterior',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['tri-exterior-f'],
    estimatedSeconds: 45,
    params(rng) {
      const p = 5 * rng.int(5, 20);
      const q = 5 * rng.int(5, 20);
      if (p + q > 150) return null;
      return { p, q, askExterior: rng.chance(0.5) };
    },
    answer: ({ p, q, askExterior }) => (askExterior ? p + q : p),
    verify({ p, q, askExterior }, value) {
      // B at the origin, C at (8, 0), D beyond C on the same line.
      const B = { x: 0, y: 0 };
      const C = { x: 8, y: 0 };
      const D = { x: 12, y: 0 };
      if (askExterior) {
        const A = apex(q, 180 - p - q, 8);
        return measuresAs(angleAt(C, A, D), value);
      }
      // Given the exterior angle, the interior angle at C is its straight-line partner.
      const A = apex(q, 180 - (p + q), 8);
      return measuresAs(angleAt(A, B, C), value);
    },
    render({ p, q, askExterior }) {
      const g = { B: { x: 0, y: 0 }, C: { x: 8, y: 0 }, A: apex(q, 180 - p - q, 8), D: { x: 12, y: 0 } };
      const exterior = p + q;
      const caption = `Triangle ABC with BC extended to D`;
      return {
        question: askExterior
          ? `In triangle ABC, side BC is extended to D. If ∠A = ${p}° and ∠B = ${q}°, what is the exterior angle ∠ACD?`
          : `In triangle ABC, side BC is extended to D. If the exterior angle ∠ACD = ${exterior}° and ∠B = ${q}°, what is ∠A?`,
        figure: {
          type: 'diagram',
          caption,
          // C's label goes straight below it, clear of the dashed extension to D.
          points: figurePoints(g, centreOf({ A: g.A, B: g.B, C: g.C }), { C: { labelOffset: [-4, 17] } }),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C'] }, { type: 'segment', from: 'C', to: 'D', style: 'dashed' }],
          angles: [
            { at: 'A', from: 'B', to: 'C', label: askExterior ? `${p}°` : '?', radius: 18 },
            { at: 'B', from: 'C', to: 'A', label: `${q}°`, radius: 20 },
            { at: 'C', from: 'A', to: 'D', label: askExterior ? '?' : `${exterior}°`, radius: 20 }
          ],
          ariaSummary: askExterior
            ? `${caption}; ∠A = ${p}°, ∠B = ${q}°, and the exterior angle ACD is marked with a question mark.`
            : `${caption}; the exterior angle ACD = ${exterior}°, ∠B = ${q}°, and ∠A is marked with a question mark.`
        },
        explanation: askExterior
          ? `An exterior angle equals the sum of the two opposite interior angles: ∠ACD = ${p} + ${q} = ${exterior}°.`
          : `An exterior angle equals the sum of the two opposite interior angles, so ∠A = ${exterior} − ${q} = ${p}°.`,
        solutionSteps: askExterior ? [`∠ACD = ∠A + ∠B.`, `${p} + ${q} = ${exterior}.`] : [`∠ACD = ∠A + ∠B.`, `∠A = ${exterior} − ${q} = ${p}.`],
        method: 'Exterior angle = sum of the two remote interior angles.',
        hints: ['Use the two interior angles that are not next to the exterior angle.', 'Exterior angle = ∠A + ∠B here.'],
        commonMistakes: askExterior ? ['Using the interior angle at C instead of the two remote angles.'] : ['Subtracting from 180° instead of from the exterior angle.']
      };
    }
  },

  {
    id: 'tri-pythagoras-side',
    version: 1,
    topicId: 'triangles',
    conceptId: 'tri-pythagoras',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['tri-pythagoras-f'],
    estimatedSeconds: 50,
    params(rng) {
      const triple = pickTriple(rng, 60);
      if (!triple) return null;
      const [a, b, c] = triple;
      return { a, b, c, askHyp: rng.chance(0.5) };
    },
    answer: ({ b, c, askHyp }) => (askHyp ? c : b),
    verify: ({ a, b, c, askHyp }, value) => (askHyp ? a * a + b * b === value * value : a * a + value * value === c * c),
    render({ a, b, c, askHyp }) {
      const g = { A: { x: 0, y: 0 }, B: { x: b, y: 0 }, C: { x: 0, y: a } };
      const caption = askHyp ? `Right triangle ABC: AB = ${cm(b)}, AC = ${cm(a)}` : `Right triangle ABC: AC = ${cm(a)}, BC = ${cm(c)}`;
      return {
        question: askHyp
          ? `In triangle ABC, ∠A = 90°, AB = ${cm(b)} and AC = ${cm(a)}. How long is BC?`
          : `In triangle ABC, ∠A = 90°, AC = ${cm(a)} and BC = ${cm(c)}. How long is AB?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g)),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C'] }],
          rightAngles: [{ at: 'A', from: 'B', to: 'C' }],
          ariaSummary: `${caption}, right-angled at A.`
        },
        explanation: askHyp
          ? `BC is the hypotenuse: BC² = ${b}² + ${a}² = ${b * b} + ${a * a} = ${c * c}, so BC = ${c} cm.`
          : `BC is the hypotenuse: AB² = ${c}² − ${a}² = ${c * c} − ${a * a} = ${b * b}, so AB = ${b} cm.`,
        solutionSteps: askHyp
          ? [`${b}² + ${a}² = ${c * c}.`, `√${c * c} = ${c}.`]
          : [`${c}² − ${a}² = ${b * b}.`, `√${b * b} = ${b}.`],
        method: 'Pythagoras: hypotenuse² = sum of the squares of the other two sides.',
        hints: ['The hypotenuse is opposite the right angle, so here it is BC.', askHyp ? 'Add the squares of the two shorter sides.' : 'Subtract the square of the known side from the square of the hypotenuse.'],
        commonMistakes: askHyp ? ['Adding the sides instead of their squares.'] : ['Adding the squares when the unknown side is not the hypotenuse.']
      };
    }
  },

  {
    id: 'tri-similar-side',
    version: 1,
    topicId: 'triangles',
    conceptId: 'tri-similar',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['tri-similar-f'],
    estimatedSeconds: 70,
    params(rng) {
      const ab = rng.int(3, 12);
      const bc = rng.int(3, 12);
      const ca = rng.int(3, 12);
      const shape = triangleFromSides(ab, bc, ca);
      // Skip sliver triangles: they are hard to read and to match up.
      if (!shape || shape.C.y < 0.35 * Math.max(ab, bc, ca)) return null;
      const k = rng.pick([2, 3, 1.5, 2.5]);
      if (![ab, bc, ca].every((side) => Number.isInteger(side * k))) return null;
      return { ab, bc, ca, k, pq: ab * k, target: rng.pick(['bc', 'ca']) };
    },
    answer: ({ bc, ca, k, target }) => (target === 'bc' ? bc : ca) * k,
    // Cross-multiplied: value / side = PQ / AB.
    verify: ({ ab, bc, ca, pq, target }, value) => nearlyEqual(value * ab, pq * (target === 'bc' ? bc : ca)),
    render({ ab, bc, ca, k, pq, target }) {
      const small = triangleFromSides(ab, bc, ca);
      // Clear the small triangle's right edge, and the big one's left overhang if angle A is obtuse.
      const shift = Math.max(ab, small.C.x) + 0.3 * ab * k + 1.5 - Math.min(0, small.C.x * k);
      const big = {
        P: { x: shift, y: 0 },
        Q: { x: shift + small.B.x * k, y: 0 },
        R: { x: shift + small.C.x * k, y: small.C.y * k }
      };
      const side = target === 'bc' ? bc : ca;
      const name = target === 'bc' ? 'QR' : 'RP';
      const pair = target === 'bc' ? 'BC' : 'CA';
      return {
        question: `Triangle ABC is similar to triangle PQR, with A ↔ P, B ↔ Q and C ↔ R. AB = ${cm(ab)}, BC = ${cm(bc)}, CA = ${cm(ca)} and PQ = ${cm(pq)}. How long is ${name}?`,
        figure: {
          type: 'diagram',
          caption: 'Similar triangles ABC and PQR',
          points: [...figurePoints(small, centreOf(small)), ...figurePoints(big, centreOf(big))],
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C'] }, { type: 'polygon', points: ['P', 'Q', 'R'] }],
          ariaSummary: `Two similar triangles, ABC and the larger PQR, with A matching P, B matching Q and C matching R.`
        },
        explanation: `The scale factor is PQ ÷ AB = ${pq} ÷ ${ab} = ${fmt(k)}. ${name} matches ${pair}, so ${name} = ${side} × ${fmt(k)} = ${fmt(side * k)} cm.`,
        solutionSteps: [`Scale factor = ${pq} ÷ ${ab} = ${fmt(k)}.`, `${name} = ${side} × ${fmt(k)} = ${fmt(side * k)}.`],
        method: 'Find the scale factor from one pair of matching sides, then apply it to the side you need.',
        hints: [`${name} corresponds to ${pair}.`, 'Scale factor = PQ ÷ AB.'],
        commonMistakes: [`Scaling the wrong side of ABC.`, 'Adding the difference PQ − AB instead of multiplying by the scale factor.']
      };
    }
  },

  /* ============================= quadrilaterals ============================= */
  {
    id: 'quad-angle-sum',
    version: 1,
    topicId: 'quadrilaterals',
    conceptId: 'quad-anglesum',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['quad-anglesum-f'],
    estimatedSeconds: 35,
    params(rng) {
      const A = 5 * rng.int(12, 28);
      const B = 5 * rng.int(12, 28);
      const C = 5 * rng.int(12, 28);
      const D = 360 - A - B - C;
      if (D < 60 || D > 140 || !quadrilateralFromAngles(A, B, C)) return null;
      return { A, B, C };
    },
    answer: ({ A, B, C }) => 360 - A - B - C,
    verify({ A, B, C }, value) {
      const g = quadrilateralFromAngles(A, B, C);
      return measuresAs(angleAt(g.D, g.C, g.A), value);
    },
    render({ A, B, C }) {
      const g = quadrilateralFromAngles(A, B, C);
      const D = 360 - A - B - C;
      const caption = `Quadrilateral ABCD with ∠A = ${A}°, ∠B = ${B}°, ∠C = ${C}°`;
      return {
        question: `In quadrilateral ABCD, ∠A = ${A}°, ∠B = ${B}° and ∠C = ${C}°. What is ∠D?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g)),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }],
          angles: [
            { at: 'A', from: 'B', to: 'D', label: `${A}°`, radius: 18 },
            { at: 'B', from: 'A', to: 'C', label: `${B}°`, radius: 18 },
            { at: 'C', from: 'B', to: 'D', label: `${C}°`, radius: 18 },
            { at: 'D', from: 'C', to: 'A', label: '?', radius: 18 }
          ],
          ariaSummary: `${caption}; ∠D is marked with a question mark.`
        },
        explanation: `The angles of a quadrilateral add up to 360°, so ∠D = 360 − ${A} − ${B} − ${C} = ${D}°.`,
        solutionSteps: [`${A} + ${B} + ${C} = ${A + B + C}.`, `360 − ${A + B + C} = ${D}.`],
        method: 'Angle sum of a quadrilateral: A + B + C + D = 360°.',
        hints: ['A quadrilateral splits into two triangles, so its angles total 2 × 180°.', 'Add the three you know, then subtract from 360°.'],
        commonMistakes: ['Subtracting from 180°, the triangle total.']
      };
    }
  },

  {
    id: 'quad-parallelogram-angle',
    version: 1,
    topicId: 'quadrilaterals',
    conceptId: 'quad-parallelogram',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['quad-parallelogram-f'],
    estimatedSeconds: 35,
    formatValue: (value) => deg(value),
    params(rng) {
      const a = obliqueAngle(rng, 45, 135);
      return a === null ? null : { a, target: rng.pick(['B', 'C', 'D']) };
    },
    answer: ({ a, target }) => (target === 'C' ? a : 180 - a),
    distractors: ({ a, target }) => [
      { value: target === 'C' ? 180 - a : a, why: target === 'C' ? 'treated opposite angles as supplementary' : 'treated adjacent angles as equal' },
      { value: 90, why: 'assumed a right angle' },
      { value: 360 - a, why: 'subtracted from 360°' },
      { value: Math.abs(90 - a), why: 'subtracted from 90°' }
    ],
    verify({ a, target }, value) {
      const g = parallelogram(a);
      const measured = { B: angleAt(g.B, g.A, g.C), C: angleAt(g.C, g.B, g.D), D: angleAt(g.D, g.C, g.A) }[target];
      return measuresAs(measured, value);
    },
    render({ a, target }) {
      const g = parallelogram(a);
      const [from, to] = { B: ['A', 'C'], C: ['B', 'D'], D: ['C', 'A'] }[target];
      const opposite = target === 'C';
      const caption = `Parallelogram ABCD with ∠A = ${a}°`;
      return {
        question: `ABCD is a parallelogram with ∠A = ${a}°. What is ∠${target}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g)),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }],
          parallels: [
            { on: ['A', 'B'], count: 1 }, { on: ['D', 'C'], count: 1 },
            { on: ['A', 'D'], count: 2 }, { on: ['B', 'C'], count: 2 }
          ],
          angles: [
            { at: 'A', from: 'B', to: 'D', label: `${a}°`, radius: 18 },
            { at: target, from, to, label: '?', radius: 18 }
          ],
          ariaSummary: `${caption}; ∠${target} is marked with a question mark.`
        },
        explanation: opposite
          ? `Opposite angles of a parallelogram are equal, so ∠C = ∠A = ${a}°.`
          : `∠${target} is next to ∠A, and neighbouring angles of a parallelogram add up to 180°: ∠${target} = 180 − ${a} = ${180 - a}°.`,
        solutionSteps: opposite ? ['∠C is opposite ∠A.', `∠C = ${a}°.`] : [`∠A + ∠${target} = 180°.`, `180 − ${a} = ${180 - a}.`],
        method: 'Opposite angles are equal; neighbouring angles add up to 180°.',
        hints: [opposite ? '∠C is directly across from ∠A.' : `∠${target} shares a side with ∠A.`, 'Neighbouring angles sit between a pair of parallel sides, like co-interior angles.'],
        commonMistakes: ['Mixing up opposite angles (equal) with neighbouring angles (sum to 180°).']
      };
    }
  },

  {
    id: 'quad-parallelogram-algebra',
    version: 1,
    topicId: 'quadrilaterals',
    conceptId: 'quad-parallelogram',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['quad-parallelogram-f'],
    estimatedSeconds: 75,
    params(rng) {
      const equal = rng.chance(0.5);
      const first = obliqueAngle(rng, 60, 120);
      return first === null ? null : anglePair(rng, { equal, first });
    },
    answer: ({ first }) => first,
    verify: (p, value) => nearlyEqual(solveAnglePair(p), value),
    render(p) {
      const { a, b, c, d, first, equal } = p;
      const g = parallelogram(first);
      const left = angleText(a, b);
      const right = angleText(c, d);
      const other = equal ? 'C' : 'B';
      const caption = `Parallelogram ABCD with ∠A = ${left} and ∠${other} = ${right}`;
      return {
        question: `In parallelogram ABCD, ∠A = ${left} and ∠${other} = ${right}. What is ∠A?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g)),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }],
          parallels: [{ on: ['A', 'B'], count: 1 }, { on: ['D', 'C'], count: 1 }],
          angles: [
            { at: 'A', from: 'B', to: 'D', label: left, radius: 18, labelRadius: 48 },
            equal ? { at: 'C', from: 'B', to: 'D', label: right, radius: 18, labelRadius: 48 } : { at: 'B', from: 'A', to: 'C', label: right, radius: 18, labelRadius: 48 }
          ],
          ariaSummary: caption
        },
        explanation: equal
          ? `∠A and ∠C are opposite angles, so they are equal. Solving gives x = ${p.x}, so ∠A = ${first}°.`
          : `∠A and ∠B are neighbouring angles, so they add up to 180°. Solving gives x = ${p.x}, so ∠A = ${first}°.`,
        solutionSteps: anglePairSteps(p),
        method: equal ? 'Set the opposite angles equal, solve for x, substitute.' : 'Set the neighbouring angles to sum to 180°, solve for x, substitute.',
        hints: [equal ? '∠A and ∠C are opposite each other.' : '∠A and ∠B share the side AB.', 'Find x first, then put it back into ∠A.'],
        commonMistakes: ['Stopping at x instead of finding the angle.', equal ? 'Adding opposite angles to 180°.' : 'Setting neighbouring angles equal.']
      };
    }
  },

  {
    id: 'quad-rhombus-diagonals',
    version: 1,
    topicId: 'quadrilaterals',
    conceptId: 'quad-rhombus',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['quad-rhombus-f'],
    estimatedSeconds: 55,
    params(rng) {
      const triple = pickTriple(rng, 50);
      if (!triple) return null;
      const [p, q, s] = rng.chance(0.5) ? triple : [triple[1], triple[0], triple[2]];
      return { p, q, s, askSide: rng.chance(0.5) };
    },
    answer: ({ q, s, askSide }) => (askSide ? s : 2 * q),
    verify: ({ p, q, s, askSide }, value) => (askSide ? p * p + q * q === value * value : p * p + (value / 2) ** 2 === s * s),
    render({ p, q, s, askSide }) {
      const g = { A: { x: 0, y: q }, B: { x: p, y: 2 * q }, C: { x: 2 * p, y: q }, D: { x: p, y: 0 }, O: { x: p, y: q } };
      const caption = askSide ? `Rhombus ABCD with diagonals AC = ${cm(2 * p)} and BD = ${cm(2 * q)}` : `Rhombus ABCD with side ${cm(s)} and diagonal AC = ${cm(2 * p)}`;
      return {
        question: askSide
          ? `The diagonals of a rhombus are ${cm(2 * p)} and ${cm(2 * q)}. How long is each side?`
          : `A rhombus has sides of ${cm(s)}, and one diagonal is ${cm(2 * p)}. How long is the other diagonal?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, g.O, { O: { hidden: true } }),
          shapes: [
            { type: 'polygon', points: ['A', 'B', 'C', 'D'] },
            { type: 'segment', from: 'A', to: 'C', style: 'dashed' },
            { type: 'segment', from: 'B', to: 'D', style: 'dashed' }
          ],
          ticks: [{ on: ['A', 'B'], count: 1 }, { on: ['B', 'C'], count: 1 }, { on: ['C', 'D'], count: 1 }, { on: ['D', 'A'], count: 1 }],
          rightAngles: [{ at: 'O', from: 'C', to: 'B' }],
          ariaSummary: `${caption}. The diagonals cross at right angles at O.`
        },
        explanation: askSide
          ? `The diagonals bisect each other at right angles, making right triangles with legs ${p} and ${q}. Side = √(${p}² + ${q}²) = √${s * s} = ${s} cm.`
          : `Half of the known diagonal is ${p}. The diagonals meet at right angles, so half the other diagonal is √(${s}² − ${p}²) = √${q * q} = ${q}. The other diagonal is 2 × ${q} = ${2 * q} cm.`,
        solutionSteps: askSide
          ? [`Half-diagonals: ${p} and ${q}.`, `${p}² + ${q}² = ${s * s}.`, `√${s * s} = ${s}.`]
          : [`Half of ${2 * p} is ${p}.`, `${s}² − ${p}² = ${q * q}, so the half-diagonal is ${q}.`, `2 × ${q} = ${2 * q}.`],
        method: 'Half-diagonals and a side form a right triangle.',
        hints: ['The diagonals of a rhombus bisect each other at right angles.', 'Work with half of each diagonal.'],
        commonMistakes: askSide ? ['Using the full diagonals in Pythagoras.'] : ['Forgetting to double the half-diagonal at the end.']
      };
    }
  },

  /* ================================= circles ================================= */
  {
    id: 'cir-inscribed-angle',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-central',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['cir-central-f'],
    estimatedSeconds: 45,
    params(rng) {
      return { central: 10 * rng.int(4, 16), askInscribed: rng.chance(0.5), tilt: rng.int(-12, 12) };
    },
    answer: ({ central, askInscribed }) => (askInscribed ? central / 2 : central),
    verify({ central, askInscribed, tilt }, value) {
      // Build the figure from the central angle (the given one, or the candidate answer), then measure ∠ACB.
      const builtFrom = askInscribed ? central : value;
      const A = dir(90 + builtFrom / 2, 5);
      const B = dir(90 - builtFrom / 2, 5);
      const C = dir(270 + tilt, 5);
      return measuresAs(angleAt(C, A, B), askInscribed ? value : central / 2);
    },
    render({ central, askInscribed, tilt }) {
      const g = { O: { x: 0, y: 0 }, A: dir(90 + central / 2, 5), B: dir(90 - central / 2, 5), C: dir(270 + tilt, 5) };
      const inscribed = central / 2;
      const caption = askInscribed ? `Circle with centre O and ∠AOB = ${central}°` : `Circle with centre O and ∠ACB = ${inscribed}°`;
      return {
        question: askInscribed
          ? `O is the centre of the circle and ∠AOB = ${central}°. C is a point on the major arc. What is ∠ACB?`
          : `O is the centre of the circle, C is a point on the major arc, and ∠ACB = ${inscribed}°. What is ∠AOB?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, { x: 0, y: 0 }, { O: { labelOffset: [8, 4] } }),
          shapes: [
            { type: 'circle', center: 'O', radius: 5 },
            { type: 'segment', from: 'O', to: 'A', style: 'dashed' },
            { type: 'segment', from: 'O', to: 'B', style: 'dashed' },
            { type: 'segment', from: 'C', to: 'A' },
            { type: 'segment', from: 'C', to: 'B' }
          ],
          angles: [
            { at: 'O', from: 'A', to: 'B', label: askInscribed ? `${central}°` : '?', radius: 18 },
            { at: 'C', from: 'A', to: 'B', label: askInscribed ? '?' : `${inscribed}°`, radius: 22 }
          ],
          ariaSummary: `${caption}; both angles stand on the arc AB.`
        },
        explanation: askInscribed
          ? `The angle at the centre is twice the angle at the circumference on the same arc, so ∠ACB = ${central} ÷ 2 = ${inscribed}°.`
          : `The angle at the centre is twice the angle at the circumference on the same arc, so ∠AOB = 2 × ${inscribed} = ${central}°.`,
        solutionSteps: askInscribed ? ['∠AOB = 2 × ∠ACB.', `∠ACB = ${central} ÷ 2 = ${inscribed}.`] : ['∠AOB = 2 × ∠ACB.', `2 × ${inscribed} = ${central}.`],
        method: 'Angle at the centre = 2 × angle at the circumference (same arc).',
        hints: ['Both angles stand on the same arc AB.', 'The centre angle is the bigger one: double.'],
        commonMistakes: [askInscribed ? 'Doubling instead of halving.' : 'Halving instead of doubling.']
      };
    }
  },

  {
    id: 'cir-cyclic-opposite',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-cyclic',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['cir-cyclic-f'],
    estimatedSeconds: 30,
    params(rng) {
      return { a: 5 * rng.int(10, 26), askC: rng.chance(0.5) };
    },
    answer: ({ a, askC }) => (askC ? 180 - a : a),
    verify({ a, askC }, value) {
      // With B at +a°, C at 0° and D at −a° on the circle, the angle at A is a.
      const build = (angleA) => ({ B: dir(angleA, 5), C: dir(0, 5), D: dir(-angleA, 5) });
      if (askC) {
        const g = build(a);
        return measuresAs(angleAt(g.C, g.B, g.D), value);
      }
      const g = build(value);
      return measuresAs(angleAt(g.C, g.B, g.D), 180 - a);
    },
    render({ a, askC }) {
      const g = { A: dir(180, 5), B: dir(a, 5), C: dir(0, 5), D: dir(-a, 5), O: { x: 0, y: 0 } };
      const c = 180 - a;
      const caption = askC ? `Cyclic quadrilateral ABCD with ∠A = ${a}°` : `Cyclic quadrilateral ABCD with ∠C = ${c}°`;
      return {
        question: askC ? `ABCD is a cyclic quadrilateral with ∠A = ${a}°. What is ∠C?` : `ABCD is a cyclic quadrilateral with ∠C = ${c}°. What is ∠A?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, { x: 0, y: 0 }, { O: { hidden: true } }),
          shapes: [{ type: 'circle', center: 'O', radius: 5 }, { type: 'polygon', points: ['A', 'B', 'C', 'D'] }],
          angles: [
            { at: 'A', from: 'D', to: 'B', label: askC ? `${a}°` : '?', radius: 18 },
            { at: 'C', from: 'B', to: 'D', label: askC ? '?' : `${c}°`, radius: 18 }
          ],
          ariaSummary: `${caption}, all four vertices on the circle.`
        },
        explanation: askC
          ? `Opposite angles of a cyclic quadrilateral add up to 180°, so ∠C = 180 − ${a} = ${c}°.`
          : `Opposite angles of a cyclic quadrilateral add up to 180°, so ∠A = 180 − ${c} = ${a}°.`,
        solutionSteps: ['∠A + ∠C = 180°.', askC ? `180 − ${a} = ${c}.` : `180 − ${c} = ${a}.`],
        method: 'Opposite angles of a cyclic quadrilateral are supplementary.',
        hints: ['All four corners lie on the circle.', '∠A and ∠C are opposite each other.'],
        commonMistakes: ['Assuming opposite angles are equal, as in a parallelogram.']
      };
    }
  },

  {
    id: 'cir-chord-distance',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-chord',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['cir-chord-f'],
    estimatedSeconds: 60,
    params(rng) {
      const triple = pickTriple(rng, 40);
      if (!triple) return null;
      const [d, h] = rng.chance(0.5) ? [triple[0], triple[1]] : [triple[1], triple[0]];
      return { d, h, r: triple[2], ask: rng.pick(['chord', 'radius', 'distance']) };
    },
    answer: ({ d, h, r, ask }) => ({ chord: 2 * h, radius: r, distance: d })[ask],
    verify({ d, h, r, ask }, value) {
      if (ask === 'chord') return (value / 2) ** 2 + d * d === r * r;
      if (ask === 'radius') return h * h + d * d === value * value;
      return h * h + value * value === r * r;
    },
    render({ d, h, r, ask }) {
      const g = { O: { x: 0, y: 0 }, A: { x: -h, y: d }, B: { x: h, y: d }, M: { x: 0, y: d } };
      const caption = {
        chord: `Circle with centre O, radius ${cm(r)}; chord AB is ${cm(d)} from O`,
        radius: `Circle with centre O; chord AB = ${cm(2 * h)} is ${cm(d)} from O`,
        distance: `Circle with centre O, radius ${cm(r)}, and chord AB = ${cm(2 * h)}`
      }[ask];
      const question = {
        chord: `A chord AB is ${cm(d)} from the centre of a circle of radius ${cm(r)}. How long is the chord?`,
        radius: `A chord of length ${cm(2 * h)} is ${cm(d)} from the centre of a circle. What is the radius?`,
        distance: `A circle has a radius of ${cm(r)}. How far from the centre is a chord of length ${cm(2 * h)}?`
      }[ask];
      const explanation = {
        chord: `The perpendicular OM bisects the chord. AM = √(${r}² − ${d}²) = √${h * h} = ${h}, so AB = 2 × ${h} = ${2 * h} cm.`,
        radius: `The perpendicular OM bisects the chord, so AM = ${h}. Radius OA = √(${h}² + ${d}²) = √${r * r} = ${r} cm.`,
        distance: `The perpendicular OM bisects the chord, so AM = ${h}. OM = √(${r}² − ${h}²) = √${d * d} = ${d} cm.`
      }[ask];
      const steps = {
        chord: [`${r}² − ${d}² = ${h * h}.`, `√${h * h} = ${h}.`, `2 × ${h} = ${2 * h}.`],
        radius: [`AM = ${2 * h} ÷ 2 = ${h}.`, `${h}² + ${d}² = ${r * r}.`, `√${r * r} = ${r}.`],
        distance: [`AM = ${2 * h} ÷ 2 = ${h}.`, `${r}² − ${h}² = ${d * d}.`, `√${d * d} = ${d}.`]
      }[ask];
      return {
        question,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, { x: 0, y: -1 }, { O: { labelOffset: [-4, 16] }, M: { hidden: true } }),
          shapes: [
            { type: 'circle', center: 'O', radius: r },
            { type: 'segment', from: 'A', to: 'B' },
            { type: 'segment', from: 'O', to: 'A', style: 'dashed' },
            { type: 'segment', from: 'O', to: 'M', style: 'dashed' }
          ],
          rightAngles: [{ at: 'M', from: 'B', to: 'O' }],
          ariaSummary: `${caption}. OM is perpendicular to AB and meets it at its midpoint M.`
        },
        explanation,
        solutionSteps: steps,
        method: 'The perpendicular from the centre halves the chord: radius² = (half-chord)² + distance².',
        hints: ['Draw the radius OA to make a right triangle OMA.', 'The perpendicular from the centre cuts the chord exactly in half.'],
        commonMistakes: ask === 'distance' ? ['Using the whole chord instead of half of it.'] : ask === 'chord' ? ['Forgetting to double the half-chord.'] : ['Using the whole chord instead of half of it.']
      };
    }
  },

  {
    id: 'cir-tangent-length',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-tangent',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['cir-tangent-f'],
    estimatedSeconds: 60,
    params(rng) {
      const triple = pickTriple(rng, 40);
      if (!triple) return null;
      const [r, t] = rng.chance(0.5) ? [triple[0], triple[1]] : [triple[1], triple[0]];
      // Keep P well outside the circle, so the tangent is visible in the figure.
      if (triple[2] < 1.25 * r) return null;
      return { r, t, D: triple[2], askTangent: rng.chance(0.5) };
    },
    answer: ({ r, t, askTangent }) => (askTangent ? t : r),
    verify: ({ r, t, D, askTangent }, value) => (askTangent ? r * r + value * value === D * D : value * value + t * t === D * D),
    render({ r, t, D, askTangent }) {
      // T is a true tangent point: ∠OTP = 90° when cos(∠TOP) = r / D.
      const phi = (Math.acos(r / D) * 180) / Math.PI;
      const g = { O: { x: 0, y: 0 }, P: { x: D, y: 0 }, T: dir(phi, r) };
      const caption = askTangent ? `Circle with centre O, radius ${cm(r)}; OP = ${cm(D)}` : `Tangent PT = ${cm(t)} from a point P with OP = ${cm(D)}`;
      return {
        question: askTangent
          ? `A point P is ${cm(D)} from the centre O of a circle of radius ${cm(r)}. PT is a tangent touching the circle at T. How long is PT?`
          : `A point P is ${cm(D)} from the centre O of a circle. The tangent from P touches the circle at T, and PT = ${cm(t)}. What is the radius?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g), { O: { labelOffset: [-6, 16] } }),
          shapes: [
            { type: 'circle', center: 'O', radius: r },
            { type: 'segment', from: 'O', to: 'T' },
            { type: 'segment', from: 'T', to: 'P' },
            { type: 'segment', from: 'O', to: 'P', style: 'dashed' }
          ],
          rightAngles: [{ at: 'T', from: 'O', to: 'P' }],
          ariaSummary: `${caption}. The radius OT meets the tangent PT at a right angle.`
        },
        explanation: askTangent
          ? `The radius OT is perpendicular to the tangent, so triangle OTP is right-angled at T. PT = √(${D}² − ${r}²) = √${t * t} = ${t} cm.`
          : `The radius OT is perpendicular to the tangent, so triangle OTP is right-angled at T. OT = √(${D}² − ${t}²) = √${r * r} = ${r} cm.`,
        solutionSteps: askTangent
          ? ['∠OTP = 90°.', `${D}² − ${r}² = ${t * t}.`, `√${t * t} = ${t}.`]
          : ['∠OTP = 90°.', `${D}² − ${t}² = ${r * r}.`, `√${r * r} = ${r}.`],
        method: 'Tangent ⟂ radius at the point of contact, then Pythagoras with OP as the hypotenuse.',
        hints: ['A tangent meets the radius at 90°.', 'OP is the hypotenuse of triangle OTP.'],
        commonMistakes: ['Adding the squares, as if OP were a shorter side.']
      };
    }
  },

  /* =========================== coordinate geometry =========================== */
  {
    id: 'cg-distance-points',
    version: 1,
    topicId: 'coordinate-geometry',
    conceptId: 'cg-distance',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['cg-distance-f'],
    estimatedSeconds: 45,
    params(rng) {
      const triple = pickTriple(rng, 15);
      if (!triple) return null;
      const [dx, dy] = rng.chance(0.5) ? [triple[0], triple[1]] : [triple[1], triple[0]];
      const pair = latticePair(rng, dx, dy);
      return pair && { ...pair, dx, dy, d: triple[2] };
    },
    answer: ({ d }) => d,
    verify: ({ A, B }, value) => nearlyEqual(Math.hypot(B.x - A.x, B.y - A.y), value),
    render({ A, B, dx, dy, d }) {
      return {
        question: `What is the distance between ${pointText('A', A)} and ${pointText('B', B)}?`,
        figure: planeFigure({ A, B }, 'Points A and B', { segments: [{ from: 'A', to: 'B' }] }),
        explanation: `Distance = √((x₂ − x₁)² + (y₂ − y₁)²) = √(${dx}² + ${dy}²) = √${d * d} = ${d}.`,
        solutionSteps: [`Across: ${coord(B.x)} − ${neg(A.x)} = ${coord(B.x - A.x)}; up: ${coord(B.y)} − ${neg(A.y)} = ${coord(B.y - A.y)}.`, `${dx}² + ${dy}² = ${d * d}.`, `√${d * d} = ${d}.`],
        method: 'Distance formula: √((x₂ − x₁)² + (y₂ − y₁)²), which is Pythagoras on the grid.',
        hints: ['Find how far across and how far up B is from A.', 'Those are the two shorter sides of a right triangle; AB is the hypotenuse.'],
        commonMistakes: [`Adding the differences instead: ${dx} + ${dy} = ${dx + dy}.`, 'Adding the coordinates instead of subtracting them.']
      };
    }
  },

  {
    id: 'cg-midpoint-points',
    version: 2,
    topicId: 'coordinate-geometry',
    conceptId: 'cg-midpoint',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['cg-midpoint-f'],
    estimatedSeconds: 40,
    formatValue: (value) => value,
    params(rng) {
      // B's coordinates share A's parity (so the midpoint is whole) and differ from A's.
      const partner = (v) => rng.pick([-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8].filter((w) => w !== v && (w - v) % 2 === 0));
      const A = { x: rng.int(-8, 8), y: rng.int(-8, 8) };
      const B = { x: partner(A.x), y: partner(A.y) };
      return { A, B };
    },
    answer: ({ A, B }) => `(${coord((A.x + B.x) / 2)}, ${coord((A.y + B.y) / 2)})`,
    distractors: ({ A, B }) => [
      { value: `(${coord(A.x + B.x)}, ${coord(A.y + B.y)})`, why: 'added without halving' },
      { value: `(${coord((B.x - A.x) / 2)}, ${coord((B.y - A.y) / 2)})`, why: 'halved the difference' },
      { value: `(${coord((A.y + B.y) / 2)}, ${coord((A.x + B.x) / 2)})`, why: 'swapped x and y' },
      { value: `(${coord(B.x - A.x)}, ${coord(B.y - A.y)})`, why: 'subtracted the coordinates' }
    ],
    verify({ A, B }, text) {
      // The midpoint is equally far from both ends and lies on the segment between them.
      const M = parsePoint(text);
      const toA = Math.hypot(M.x - A.x, M.y - A.y);
      const toB = Math.hypot(M.x - B.x, M.y - B.y);
      return nearlyEqual(toA, toB) && nearlyEqual(toA + toB, Math.hypot(B.x - A.x, B.y - A.y));
    },
    render({ A, B }) {
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2;
      return {
        question: `What is the midpoint of ${pointText('A', A)} and ${pointText('B', B)}?`,
        figure: planeFigure({ A, B }, 'Points A and B', { segments: [{ from: 'A', to: 'B' }] }),
        explanation: `Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2) = ((${coord(A.x)} + ${neg(B.x)})/2, (${coord(A.y)} + ${neg(B.y)})/2) = (${coord(mx)}, ${coord(my)}).`,
        solutionSteps: [`x: (${coord(A.x)} + ${neg(B.x)}) ÷ 2 = ${coord(mx)}.`, `y: (${coord(A.y)} + ${neg(B.y)}) ÷ 2 = ${coord(my)}.`],
        method: 'Average the x-coordinates and average the y-coordinates.',
        hints: ['The midpoint is halfway along in both directions.', 'Add the two x-values and halve; do the same for y.'],
        commonMistakes: ['Adding the coordinates but forgetting to halve.']
      };
    }
  },

  {
    id: 'cg-slope-points',
    version: 1,
    topicId: 'coordinate-geometry',
    conceptId: 'cg-slope',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cg-slope-f'],
    estimatedSeconds: 45,
    formatValue: (value) => value,
    params(rng) {
      const A = { x: rng.int(-6, 6), y: rng.int(-6, 6) };
      const B = { x: rng.int(-6, 6), y: rng.int(-6, 6) };
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      if (!dx || !dy || Math.abs(dx) === Math.abs(dy)) return null;
      return { A, B };
    },
    answer: ({ A, B }) => slopeText(B.y - A.y, B.x - A.x),
    distractors: ({ A, B }) => [
      { value: slopeText(B.x - A.x, B.y - A.y), why: 'divided run by rise' },
      { value: slopeText(-(B.y - A.y), B.x - A.x), why: 'lost the sign' },
      { value: slopeText(-(B.x - A.x), B.y - A.y), why: 'gave the perpendicular slope' }
    ],
    verify({ A, B }, text) {
      // Stepping 1 across from A by the candidate slope must stay on line AB (zero cross product).
      const m = parseSlope(text);
      return nearlyEqual((B.x - A.x) * m - (B.y - A.y) * 1, 0);
    },
    render({ A, B }) {
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const answer = slopeText(dy, dx);
      return {
        question: `What is the slope of the line through ${pointText('A', A)} and ${pointText('B', B)}?`,
        figure: planeFigure({ A, B }, 'The line through A and B', { lines: [{ through: ['A', 'B'] }] }),
        explanation: `Slope = (y₂ − y₁)/(x₂ − x₁) = (${coord(B.y)} − ${neg(A.y)})/(${coord(B.x)} − ${neg(A.x)}) = ${coord(dy)}/${neg(dx)}${`${coord(dy)}/${neg(dx)}` === answer ? "" : ` = ${answer}`}.`,
        solutionSteps: [`Rise: ${coord(B.y)} − ${neg(A.y)} = ${coord(dy)}.`, `Run: ${coord(B.x)} − ${neg(A.x)} = ${coord(dx)}.`, `${coord(dy)} ÷ ${neg(dx)} = ${answer}.`],
        method: 'Slope = rise ÷ run = (y₂ − y₁)/(x₂ − x₁).',
        hints: ['Subtract the y-values for the rise and the x-values for the run, in the same order.', `A line that ${dy * dx > 0 ? 'rises' : 'falls'} from left to right has a ${dy * dx > 0 ? 'positive' : 'negative'} slope.`],
        commonMistakes: ['Dividing run by rise.', 'Subtracting in a different order on top and bottom, which flips the sign.']
      };
    }
  },

  {
    id: 'cg-y-intercept',
    version: 1,
    topicId: 'coordinate-geometry',
    conceptId: 'cg-lineeq',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cg-lineeq-f', 'cg-slope-f'],
    estimatedSeconds: 60,
    params(rng) {
      const m = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
      const c = rng.int(-8, 8);
      const x1 = rng.int(-4, 3);
      const x2 = x1 + rng.int(1, 4);
      const A = { x: x1, y: m * x1 + c };
      const B = { x: x2, y: m * x2 + c };
      if (Math.max(Math.abs(A.y), Math.abs(B.y)) > 14 || x1 === 0 || x2 === 0) return null;
      return { A, B, m, c };
    },
    answer: ({ c }) => c,
    verify({ A, B }, value) {
      const slope = (B.y - A.y) / (B.x - A.x);
      return nearlyEqual(A.y - slope * A.x, value) && nearlyEqual(B.y - slope * B.x, value);
    },
    render({ A, B, m, c }) {
      return {
        question: `A line passes through ${pointText('A', A)} and ${pointText('B', B)}. Where does it cross the y-axis? (Give the y-intercept c in y = mx + c.)`,
        figure: planeFigure({ A, B }, 'The line through A and B', { lines: [{ through: ['A', 'B'] }] }),
        explanation: `Slope m = (${coord(B.y)} − ${neg(A.y)})/(${coord(B.x)} − ${neg(A.x)}) = ${coord(m)}. Then c = y − mx = ${coord(A.y)} − (${coord(m)})(${coord(A.x)}) = ${coord(c)}.`,
        solutionSteps: [`m = ${coord(B.y - A.y)} ÷ ${neg(B.x - A.x)} = ${coord(m)}.`, `c = ${coord(A.y)} − (${coord(m)} × ${coord(A.x)}) = ${coord(c)}.`],
        method: 'Find the slope, then substitute one point into y = mx + c.',
        hints: ['Work out the slope first.', 'Put either point into y = mx + c and solve for c.'],
        commonMistakes: ['Getting the sign wrong when moving mx across.', 'Using the x-coordinate where the y-coordinate belongs.']
      };
    }
  },

  {
    id: 'cg-parallel-perpendicular',
    version: 1,
    topicId: 'coordinate-geometry',
    conceptId: 'cg-parallelperp',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cg-parallelperp-f', 'cg-slope-f'],
    estimatedSeconds: 60,
    formatValue: (value) => value,
    params(rng) {
      const A = { x: rng.int(-6, 6), y: rng.int(-6, 6) };
      const B = { x: rng.int(-6, 6), y: rng.int(-6, 6) };
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      if (!dx || !dy || Math.abs(dx) === Math.abs(dy)) return null;
      return { A, B, perpendicular: rng.chance(0.7) };
    },
    answer: ({ A, B, perpendicular }) => (perpendicular ? slopeText(-(B.x - A.x), B.y - A.y) : slopeText(B.y - A.y, B.x - A.x)),
    distractors: ({ A, B, perpendicular }) => {
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      return [
        { value: perpendicular ? slopeText(dy, dx) : slopeText(-dx, dy), why: perpendicular ? 'gave the parallel slope' : 'gave the perpendicular slope' },
        { value: slopeText(-dy, dx), why: 'only changed the sign' },
        { value: slopeText(dx, dy), why: 'only flipped the fraction' }
      ];
    },
    verify({ A, B, perpendicular }, text) {
      const m = parseSlope(text);
      const original = (B.y - A.y) / (B.x - A.x);
      return perpendicular ? nearlyEqual(m * original, -1) : nearlyEqual(m, original);
    },
    render({ A, B, perpendicular }) {
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const m = slopeText(dy, dx);
      const answer = perpendicular ? slopeText(-dx, dy) : m;
      return {
        question: `What is the slope of a line ${perpendicular ? 'perpendicular' : 'parallel'} to the line through ${pointText('A', A)} and ${pointText('B', B)}?`,
        figure: planeFigure({ A, B }, 'The line through A and B', { lines: [{ through: ['A', 'B'] }] }),
        explanation: perpendicular
          ? `The slope of AB is ${m}. Perpendicular slopes multiply to −1, so flip the fraction and change the sign: ${answer}.`
          : `The slope of AB is ${m}. Parallel lines have equal slopes, so the answer is ${answer}.`,
        solutionSteps: [`Slope of AB = ${coord(dy)} ÷ ${neg(dx)} = ${m}.`, perpendicular ? `Negative reciprocal of ${m} = ${answer}.` : `Parallel slope = ${answer}.`],
        method: 'Parallel: same slope. Perpendicular: negative reciprocal (m₁ × m₂ = −1).',
        hints: ['Find the slope of AB first.', perpendicular ? 'Flip the fraction and change its sign.' : 'Parallel lines rise at the same rate.'],
        commonMistakes: perpendicular ? ['Flipping the fraction but keeping the sign.', 'Changing the sign but not flipping.'] : ['Using the negative reciprocal, which is for perpendicular lines.']
      };
    }
  }
];
