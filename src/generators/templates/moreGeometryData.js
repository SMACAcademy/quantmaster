/**
 * Geometry, counting, data interpretation and statistics: templates for
 * concepts that had no generator (step 9 of Phase D).
 *
 * Figures are drawn at each instance's true angles and lengths, and the
 * geometry checks measure the answer back off those coordinates. Counting
 * checks enumerate; data-interpretation checks recompute from the table or
 * chart the learner sees.
 */

import { fmt, format, gcd, lcm, nCr, nPr, factorial, nearlyEqual } from '../core.js';

/* ------------------------------ shared helpers ------------------------------ */

const sum = (list) => list.reduce((acc, v) => acc + v, 0);
const RAD = Math.PI / 180;
const deg = (v) => `${fmt(v, 1)}°`;
const cm = (v) => `${fmt(v)} cm`;
const cm2 = (v) => `${fmt(v)} cm²`;
const r2 = (v) => Math.round(v * 100) / 100;
const cap = (text) => text[0].toUpperCase() + text.slice(1);
const listText = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

/** The point `length` away from `from`, at `degrees` anticlockwise from the positive x-axis. */
const dir = (degrees, length, from = { x: 0, y: 0 }) => ({
  x: from.x + length * Math.cos(degrees * RAD),
  y: from.y + length * Math.sin(degrees * RAD)
});
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

/** ∠PAQ in degrees (0–180), measured from coordinates. */
function angleAt(a, p, q) {
  const ux = p.x - a.x;
  const uy = p.y - a.y;
  const vx = q.x - a.x;
  const vy = q.y - a.y;
  const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
  return Math.acos(Math.max(-1, Math.min(1, cos))) / RAD;
}
const measuresAs = (measured, value) => Math.abs(measured - value) < 1e-6;

/** Area of a polygon from its vertices (shoelace formula). */
function shoelace(points) {
  let twice = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    twice += p.x * q.y - q.x * p.y;
  });
  return Math.abs(twice) / 2;
}

function centreOf(points) {
  const list = Object.values(points);
  return { x: sum(list.map((p) => p.x)) / list.length, y: sum(list.map((p) => p.y)) / list.length };
}

/** Label offset (screen px) along a bearing in degrees, anticlockwise from the x-axis. */
const labelToward = (degrees, distance = 14) => {
  const p = dir(degrees, distance);
  return [Math.round(p.x) - 4, Math.round(-p.y) + 4];
};

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

/* Primitive Pythagorean triples (legs, then hypotenuse). */
const TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41]
];

/** "5/13", or "2" when the fraction is whole. */
function fraction(top, bottom) {
  const g = gcd(top, bottom);
  return bottom / g === 1 ? String(top / g) : `${top / g}/${bottom / g}`;
}
function fractionValue(text) {
  const [top, bottom = 1] = String(text).split('/').map(Number);
  return top / bottom;
}

/** Triangle ABC from its three sides, A at the origin and B on the x-axis. Null if impossible. */
function triangleFromSides(ab, bc, ca) {
  const x = (ca * ca + ab * ab - bc * bc) / (2 * ab);
  const ySquared = ca * ca - x * x;
  if (ySquared <= 1e-9) return null;
  return { A: { x: 0, y: 0 }, B: { x: ab, y: 0 }, C: { x, y: Math.sqrt(ySquared) } };
}

/** Apex of a triangle with base from the origin to (base, 0), angle p at the origin and q at the other end. */
function apex(p, q, base) {
  return dir(p, (base * Math.sin(q * RAD)) / Math.sin((180 - p - q) * RAD));
}

/* ================================================================================ */
/*                                    GEOMETRY                                      */
/* ================================================================================ */

/* ---------------------------- circles: parts ---------------------------- */

const CIRCLE_PARTS = ['radius', 'diameter', 'chord', 'tangent', 'secant'];
const PART_MEANING = {
  radius: 'joins the centre to a point on the circle',
  diameter: 'joins two points on the circle and passes through the centre',
  chord: 'joins two points on the circle without passing through the centre',
  tangent: 'touches the circle at exactly one point',
  secant: 'cuts the circle at two points and carries on beyond them'
};
const PART_LETTERS = [['P', 'Q'], ['A', 'B'], ['M', 'N'], ['X', 'Y']];
const CIRCLE_R = 5;

/** The figure's points for one kind of line: O is the centre; S and E are the ends of the line drawn. */
function circlePart(kind, t, span) {
  const O = { x: 0, y: 0 };
  if (kind === 'radius') return { O, S: O, E: dir(t, CIRCLE_R) };
  if (kind === 'diameter') return { O, S: dir(t, CIRCLE_R), E: dir(t + 180, CIRCLE_R) };
  if (kind === 'chord') return { O, S: dir(t, CIRCLE_R), E: dir(t + span, CIRCLE_R) };
  if (kind === 'tangent') {
    const T = dir(t, CIRCLE_R);
    return { O, S: dir(t + 90, 4, T), E: dir(t - 90, 4, T), T };
  }
  const c1 = dir(t, CIRCLE_R);
  const c2 = dir(t + span, CIRCLE_R);
  const len = dist(c1, c2);
  const u = { x: (c1.x - c2.x) / len, y: (c1.y - c2.y) / len };
  return { O, S: { x: c1.x + 2.5 * u.x, y: c1.y + 2.5 * u.y }, E: { x: c2.x - 2.5 * u.x, y: c2.y - 2.5 * u.y } };
}

/** Name a line from its coordinates alone: where its ends sit, and how far it passes from the centre. */
function classifyCircleLine({ O, S, E }) {
  const on = (p) => Math.abs(dist(p, O) - CIRCLE_R) < 1e-6;
  if (dist(S, O) < 1e-9 && on(E)) return 'radius';
  if (on(S) && on(E)) return dist(mid(S, E), O) < 1e-6 ? 'diameter' : 'chord';
  const gap = Math.abs((E.x - S.x) * (O.y - S.y) - (E.y - S.y) * (O.x - S.x)) / dist(S, E);
  if (Math.abs(gap - CIRCLE_R) < 1e-6) return 'tangent';
  if (gap < CIRCLE_R && dist(S, O) > CIRCLE_R && dist(E, O) > CIRCLE_R) return 'secant';
  return 'none';
}

/* ---------------------------- quadrilaterals ---------------------------- */

const QUAD_KINDS = ['Square', 'Rectangle', 'Rhombus', 'Parallelogram', 'Trapezium', 'Kite'];
const QUAD_WRONG = {
  Square: [
    ['Rhombus', 'missed the right angle: a rhombus with a 90° angle is a square'],
    ['Rectangle', 'missed that all four sides are equal'],
    ['Parallelogram', 'gave a more general name than the facts allow'],
    ['Kite', 'noticed only that neighbouring sides are equal']
  ],
  Rectangle: [
    ['Square', 'assumed all four sides are equal'],
    ['Parallelogram', 'ignored the right angle and gave the more general name'],
    ['Rhombus', 'took equal opposite sides to mean all sides equal'],
    ['Trapezium', 'checked only one pair of parallel sides']
  ],
  Rhombus: [
    ['Square', 'assumed the angle is 90°'],
    ['Parallelogram', 'gave the more general name, ignoring the four equal sides'],
    ['Kite', 'noticed only that neighbouring sides are equal'],
    ['Rectangle', 'confused equal sides with equal angles']
  ],
  Parallelogram: [
    ['Rectangle', 'assumed the angle is a right angle'],
    ['Rhombus', 'took equal opposite sides to mean all four sides equal'],
    ['Trapezium', 'counted only one pair of parallel sides'],
    ['Square', 'assumed equal sides and right angles']
  ],
  Trapezium: [
    ['Parallelogram', 'assumed both pairs of opposite sides are parallel'],
    ['Rectangle', 'assumed right angles at the parallel sides'],
    ['Kite', 'confused a pair of parallel sides with pairs of equal sides'],
    ['Rhombus', 'assumed the sides are all equal']
  ],
  Kite: [
    ['Rhombus', 'took two pairs of equal neighbouring sides as four equal sides'],
    ['Parallelogram', 'confused equal neighbouring sides with equal opposite sides'],
    ['Trapezium', 'assumed a pair of parallel sides'],
    ['Square', 'assumed all sides and angles are equal']
  ]
};

/** Coordinates of ABCD (anticlockwise, A at the origin) for each kind of quadrilateral. */
function quadShape(p) {
  const A = { x: 0, y: 0 };
  switch (p.kind) {
    case 'Square':
      return { A, B: { x: p.s, y: 0 }, C: { x: p.s, y: p.s }, D: { x: 0, y: p.s } };
    case 'Rectangle':
      return { A, B: { x: p.l, y: 0 }, C: { x: p.l, y: p.b }, D: { x: 0, y: p.b } };
    case 'Rhombus': {
      const D = dir(p.alpha, p.s);
      return { A, B: { x: p.s, y: 0 }, C: { x: p.s + D.x, y: D.y }, D };
    }
    case 'Parallelogram': {
      const D = dir(p.alpha, p.b);
      return { A, B: { x: p.l, y: 0 }, C: { x: p.l + D.x, y: D.y }, D };
    }
    case 'Trapezium': {
      const B = { x: p.l, y: 0 };
      return { A, B, C: dir(180 - p.beta, p.h / Math.sin(p.beta * RAD), B), D: dir(p.alpha, p.h / Math.sin(p.alpha * RAD)) };
    }
    default: {
      // Kite: AB = AD = p, CB = CD = q, symmetric about AC.
      const h = 0.6 * Math.min(p.p, p.q);
      const u = Math.sqrt(p.p * p.p - h * h);
      const w = Math.sqrt(p.q * p.q - h * h);
      return { A, B: { x: u, y: -h }, C: { x: u + w, y: 0 }, D: { x: u, y: h } };
    }
  }
}

/** Name ABCD from its coordinates: side lengths, parallel sides and the angle at A. */
function classifyQuad({ A, B, C, D }) {
  const sides = [dist(A, B), dist(B, C), dist(C, D), dist(D, A)];
  const eq = (x, y) => Math.abs(x - y) < 1e-6;
  const parallel = (p1, p2, q1, q2) => Math.abs((p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x)) < 1e-6;
  const abdc = parallel(A, B, D, C);
  const adbc = parallel(A, D, B, C);
  const right = Math.abs((B.x - A.x) * (D.x - A.x) + (B.y - A.y) * (D.y - A.y)) < 1e-6;
  const allEqual = sides.every((s) => eq(s, sides[0]));
  if (abdc && adbc) return allEqual ? (right ? 'Square' : 'Rhombus') : right ? 'Rectangle' : 'Parallelogram';
  if (abdc || adbc) return 'Trapezium';
  if ((eq(sides[0], sides[3]) && eq(sides[1], sides[2])) || (eq(sides[0], sides[1]) && eq(sides[2], sides[3]))) return 'Kite';
  return 'Quadrilateral';
}

function quadFacts(p) {
  switch (p.kind) {
    case 'Square':
      return `AB = BC = CD = DA = ${cm(p.s)} and ∠A = 90°`;
    case 'Rhombus':
      return `AB = BC = CD = DA = ${cm(p.s)} and ∠A = ${p.alpha}°`;
    case 'Rectangle':
      return `AB = CD = ${cm(p.l)}, BC = DA = ${cm(p.b)} and ∠A = 90°`;
    case 'Parallelogram':
      return `AB = CD = ${cm(p.l)}, BC = DA = ${cm(p.b)} and ∠A = ${p.alpha}°`;
    case 'Trapezium':
      return `AB parallel to DC, AB = ${cm(p.l)} and DC = ${cm(p.m)}`;
    default:
      return `AB = AD = ${cm(p.p)} and CB = CD = ${cm(p.q)}`;
  }
}

const QUAD_REASON = {
  Square: 'All four sides are equal and one angle is 90°. Equal sides make it a rhombus; a rhombus with a right angle has all four angles 90°, so it is a square.',
  Rhombus: 'All four sides are equal, so it is a rhombus. The angle is not 90°, so it is not a square.',
  Rectangle: 'Both pairs of opposite sides are equal, so it is a parallelogram; with a right angle, all its angles are 90°, so it is a rectangle. The sides are not all equal, so it is not a square.',
  Parallelogram: 'Both pairs of opposite sides are equal, so it is a parallelogram. The angle is not 90° and the sides are not all equal, so nothing more specific fits.',
  Trapezium: 'One pair of sides is parallel. Those parallel sides have different lengths, so the other pair cannot be parallel (that would make a parallelogram, whose opposite sides are equal). Exactly one pair of parallel sides makes a trapezium.',
  Kite: 'It has two pairs of equal sides, and each pair meets at a vertex (A and C). Equal neighbouring sides, not equal opposite sides, make a kite.'
};

/* ---------------------------- triangles ---------------------------- */

const SIDE_KIND_OPTIONS = ['Acute-angled triangle', 'Right-angled triangle', 'Obtuse-angled triangle', 'No triangle is possible'];
const SIDE_KIND_WHY = {
  'Acute-angled triangle': 'compared the longest side squared with the other two the wrong way round',
  'Right-angled triangle': 'assumed the squares balance exactly without checking',
  'Obtuse-angled triangle': 'misjudged the longest side squared against the sum of the other two squares',
  'No triangle is possible': 'misapplied the triangle inequality'
};

/** The angle type from three sides, by comparing squares. */
function sideKind([a, b, c]) {
  if (a + b <= c) return SIDE_KIND_OPTIONS[3];
  const d = c * c - (a * a + b * b);
  return d < 0 ? SIDE_KIND_OPTIONS[0] : d === 0 ? SIDE_KIND_OPTIONS[1] : SIDE_KIND_OPTIONS[2];
}

const ANGLE_CLASSES = ['Acute', 'Right', 'Obtuse'];

/** "Acute isosceles", "Right scalene", "Equilateral" from three angles. */
function angleSideName(angles) {
  const [A, B, C] = angles;
  if (A === B && B === C) return 'Equilateral';
  const largest = Math.max(...angles);
  const aClass = largest < 90 ? 'Acute' : largest === 90 ? 'Right' : 'Obtuse';
  const iso = A === B || B === C || A === C;
  return `${aClass} ${iso ? 'isosceles' : 'scalene'}`;
}

/* ---------------------------- trigonometry ---------------------------- */

const TRIG_NAMES = {
  sin: ['opposite', 'hypotenuse'],
  cos: ['adjacent', 'hypotenuse'],
  tan: ['opposite', 'adjacent'],
  cot: ['adjacent', 'opposite'],
  sec: ['hypotenuse', 'adjacent'],
  cosec: ['hypotenuse', 'opposite']
};
/* For each asked ratio, the ratios it is most often confused with, most likely first. */
const TRIG_CONFUSIONS = {
  sin: ['cos', 'tan', 'cosec', 'cot', 'sec'],
  cos: ['sin', 'cot', 'sec', 'tan', 'cosec'],
  tan: ['cot', 'sin', 'cos', 'sec', 'cosec']
};

/* ---------------------------- solids ---------------------------- */

const SOLID_PI = 22 / 7;

export const geometryPart = [
  /* ================================ circles ================================ */
  {
    id: 'cir-parts-radius-diameter',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-parts',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: 'cm',
    answerDecimals: 1,
    estimatedSeconds: 25,
    params(rng) {
      const ask = rng.pick(['radius', 'diameter', 'longest']);
      const r = rng.int(2, 40) + (ask === 'radius' && rng.chance(0.35) ? 0.5 : 0);
      return { r, ask, tilt: 5 * rng.int(-6, 6) };
    },
    answer: ({ r, ask }) => (ask === 'radius' ? r : 2 * r),
    verify({ r, ask, tilt }, value) {
      if (ask === 'radius') {
        // A circle of the candidate radius: its diameter must come out as the one given.
        return nearlyEqual(dist(dir(tilt, value), dir(tilt + 180, value)), 2 * r);
      }
      if (ask === 'diameter') return nearlyEqual(dist(dir(tilt, r), dir(tilt + 180, r)), value);
      // Longest chord: try chords between points every 5° round the circle.
      let longest = 0;
      for (let a = 0; a < 360; a += 5) for (let b = a + 5; b < 360; b += 5) longest = Math.max(longest, dist(dir(a, r), dir(b, r)));
      return nearlyEqual(longest, value);
    },
    render({ r, ask, tilt }) {
      const d = 2 * r;
      const g = { O: { x: 0, y: 0 }, A: dir(tilt, r), B: dir(tilt + 180, r), C: dir(tilt + 90, r) };
      const shapes = [{ type: 'circle', center: 'O', radius: r }];
      let caption;
      if (ask === 'radius') {
        shapes.push({ type: 'segment', from: 'A', to: 'B', style: 'dashed', label: cm(d) }, { type: 'segment', from: 'O', to: 'C', label: '?' });
        caption = `Circle with centre O and diameter AB = ${cm(d)}`;
      } else if (ask === 'diameter') {
        shapes.push({ type: 'segment', from: 'O', to: 'C', label: cm(r) }, { type: 'segment', from: 'A', to: 'B', style: 'dashed', label: '?' });
        caption = `Circle with centre O and radius OC = ${cm(r)}`;
      } else {
        shapes.push({ type: 'segment', from: 'O', to: 'C', label: cm(r) });
        caption = `Circle with centre O and radius OC = ${cm(r)}`;
      }
      const named = ask === 'longest' ? { O: g.O, C: g.C } : g;
      const question = {
        radius: `The diameter of a circle is ${cm(d)}. What is its radius?`,
        diameter: `The radius of a circle is ${cm(r)}. What is its diameter?`,
        longest: `A circle has a radius of ${cm(r)}. What is the length of its longest chord?`
      }[ask];
      return {
        question,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(named, g.O, { O: { labelOffset: labelToward(tilt - 45) } }),
          shapes,
          ariaSummary: `${caption}.`
        },
        explanation: {
          radius: `The radius is half the diameter: ${fmt(d)} ÷ 2 = ${fmt(r)} cm.`,
          diameter: `The diameter is twice the radius: 2 × ${fmt(r)} = ${fmt(d)} cm.`,
          longest: `The longest chord is the one through the centre, which is a diameter: 2 × ${fmt(r)} = ${fmt(d)} cm.`
        }[ask],
        solutionSteps: {
          radius: ['Radius = diameter ÷ 2.', `${fmt(d)} ÷ 2 = ${fmt(r)}.`],
          diameter: ['Diameter = 2 × radius.', `2 × ${fmt(r)} = ${fmt(d)}.`],
          longest: ['The longest chord passes through the centre: it is a diameter.', `2 × ${fmt(r)} = ${fmt(d)}.`]
        }[ask],
        method: 'A diameter is two radii laid end to end through the centre.',
        hints: [ask === 'longest' ? 'A chord gets longer the closer it passes to the centre.' : 'The diameter runs right across the circle through the centre.', 'Diameter = 2 × radius.'],
        commonMistakes: [ask === 'radius' ? `Doubling instead of halving: ${fmt(2 * d)} cm.` : `Halving instead of doubling: ${fmt(r / 2)} cm.`]
      };
    }
  },

  {
    id: 'cir-parts-name-line',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-parts',
    difficulty: 'easy',
    type: 'single_choice',
    estimatedSeconds: 25,
    formatValue: (value) => value,
    params(rng) {
      return {
        kind: rng.pick(CIRCLE_PARTS),
        t: 5 * rng.int(0, 71),
        span: 10 * rng.int(5, 14),
        letters: rng.pick(PART_LETTERS)
      };
    },
    answer: ({ kind }) => kind,
    distractors: ({ kind }) => CIRCLE_PARTS.filter((k) => k !== kind).map((value) => ({ value, why: `confused it with a ${value}, which ${PART_MEANING[value]}` })),
    verify: ({ kind, t, span }, value) => classifyCircleLine(circlePart(kind, t, span)) === value,
    render({ kind, t, span, letters }) {
      const g = circlePart(kind, t, span);
      const [first, second] = kind === 'radius' ? ['O', letters[1]] : letters;
      const name = `${first}${second}`;
      const named = { O: g.O, ...(kind === 'radius' ? {} : { [first]: g.S }), [second]: g.E, ...(g.T ? { T: g.T } : {}) };
      // O's label goes where nothing is drawn: away from the chord or radius, beside a diameter.
      const away = { radius: t + 180, diameter: t + 90, chord: t + span / 2 + 180, secant: t + span / 2 + 180, tangent: t + 180 }[kind];
      const facts = {
        radius: `${name} runs from the centre O to a point on the circle.`,
        diameter: `${first} and ${second} lie on the circle, and ${name} passes through O.`,
        chord: `${first} and ${second} lie on the circle, and ${name} does not pass through O.`,
        tangent: `${name} meets the circle only at T.`,
        secant: `${name} crosses the circle at two points, and ${first} and ${second} lie outside it.`
      }[kind];
      return {
        question: `In the figure, O is the centre of the circle. What is ${name} called?`,
        figure: {
          type: 'diagram',
          caption: 'A circle with centre O',
          points: figurePoints(named, g.O, { O: { labelOffset: labelToward(away) } }),
          shapes: [{ type: 'circle', center: 'O', radius: CIRCLE_R }, { type: 'segment', from: kind === 'radius' ? 'O' : first, to: second }],
          ariaSummary: `A circle with centre O. ${facts}`
        },
        explanation: `${facts} A ${kind} ${PART_MEANING[kind]}, so ${name} is a ${kind}.`,
        solutionSteps: [
          kind === 'radius' ? `One end of ${name} is the centre O.` : `Check where ${first} and ${second} are: ${kind === 'tangent' || kind === 'secant' ? 'outside' : 'on'} the circle.`,
          `${facts}`,
          `So ${name} is a ${kind}.`
        ],
        method: 'Look at where the ends lie (centre, on the circle, or outside) and whether the line passes through the centre.',
        hints: ['Find where each end of the line is.', 'Does the line pass through O? How many times does it meet the circle?'],
        commonMistakes: ['Calling any line across a circle a diameter: only one through the centre is.', 'Mixing up a tangent (touches once) with a secant (cuts twice).']
      };
    }
  },

  /* ============================ lines and angles ============================ */
  {
    id: 'la-angles-round-point',
    version: 1,
    topicId: 'lines-angles',
    conceptId: 'la-types',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['la-straight-f'],
    estimatedSeconds: 35,
    params(rng) {
      const count = rng.pick([3, 4]);
      const known = Array.from({ length: count - 1 }, () => 5 * (count === 3 ? rng.int(14, 32) : rng.int(8, 26)));
      const x = 360 - sum(known);
      if (x < 40 || x > 160) return null;
      return { known, start: 5 * rng.int(0, 71) };
    },
    answer: ({ known }) => 360 - sum(known),
    verify({ known, start }, value) {
      // Draw the rays at the given angles, then measure the gap from the last ray back to the first.
      const rays = [start];
      for (const k of known) rays.push(rays[rays.length - 1] + k);
      const O = { x: 0, y: 0 };
      return measuresAs(angleAt(O, dir(rays[rays.length - 1], 4), dir(start, 4)), value);
    },
    render({ known, start }) {
      const ids = 'ABCD'.slice(0, known.length + 1).split('');
      const x = 360 - sum(known);
      const g = { O: { x: 0, y: 0 } };
      let bearing = start;
      ids.forEach((id, i) => {
        g[id] = dir(bearing, 4);
        if (i < known.length) bearing += known[i];
      });
      const names = ids.map((id, i) => `∠${id}O${ids[(i + 1) % ids.length]}`);
      const unknown = names[names.length - 1];
      const given = known.map((k, i) => `${names[i]} = ${k}°`);
      // O's label sits in the biggest angle, between its arms.
      const all = [...known, x];
      const big = all.indexOf(Math.max(...all));
      const bisector = start + sum(all.slice(0, big)) + all[big] / 2;
      return {
        question: `${ids.length === 3 ? 'Three' : 'Four'} rays ${listText(ids.map((id) => `O${id}`))} meet at the point O. If ${listText(given)}, what is ${unknown}?`,
        figure: {
          type: 'diagram',
          caption: `Rays from O with ${listText(given)}`,
          points: figurePoints(g, g.O, { O: { labelOffset: labelToward(bisector, 12) } }),
          shapes: ids.map((id) => ({ type: 'segment', from: 'O', to: id })),
          angles: ids.map((id, i) => ({ at: 'O', from: id, to: ids[(i + 1) % ids.length], label: i < known.length ? `${known[i]}°` : '?', radius: 20 })),
          ariaSummary: `${ids.length} rays from O. ${listText(given)}; ${unknown} is marked with a question mark.`
        },
        explanation: `The angles all the way round a point add up to 360°. The known angles total ${known.join(' + ')} = ${sum(known)}°, so ${unknown} = 360 − ${sum(known)} = ${x}°.`,
        solutionSteps: [`${known.join(' + ')} = ${sum(known)}.`, `360 − ${sum(known)} = ${x}.`],
        method: 'Angles round a point sum to 360°.',
        hints: ['The angles go all the way round O without overlapping.', 'A full turn is 360°.'],
        commonMistakes: [`Subtracting from 180°, which gives ${180 - sum(known) < 0 ? 'a negative angle' : `${180 - sum(known)}°`}.`]
      };
    }
  },

  {
    id: 'la-straight-line-three',
    version: 1,
    topicId: 'lines-angles',
    conceptId: 'la-types',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['la-straight-f'],
    estimatedSeconds: 45,
    params(rng) {
      if (rng.chance(0.5)) {
        const a = 5 * rng.int(5, 20);
        const b = 5 * rng.int(5, 20);
        const x = 180 - a - b;
        if (x < 25) return null;
        return { mode: 'sum', parts: [a, x, b], ask: 1 };
      }
      const ratio = [rng.int(1, 7), rng.int(1, 7), rng.int(1, 7)];
      const total = sum(ratio);
      if (180 % total || ratio.every((r) => r === ratio[0])) return null;
      const parts = ratio.map((r) => (r * 180) / total);
      if (Math.min(...parts) < 20) return null;
      return { mode: 'ratio', ratio, parts, ask: rng.int(0, 2) };
    },
    answer: ({ mode, parts, ask }) => (mode === 'sum' ? 180 - parts[0] - parts[2] : parts[ask]),
    verify({ mode, parts, ratio, ask }, value) {
      const O = { x: 0, y: 0 };
      if (mode === 'sum') {
        // OC is drawn at ∠AOC from OA (pointing along 180°), OD at ∠DOB from OB; measure ∠COD.
        return measuresAs(angleAt(O, dir(180 - parts[0], 4), dir(parts[2], 4)), value);
      }
      const k = value / ratio[ask];
      return nearlyEqual(k * sum(ratio), 180);
    },
    render({ mode, parts, ratio, ask }) {
      const [a, x, b] = parts;
      const g = { A: { x: -5, y: 0 }, B: { x: 5, y: 0 }, O: { x: 0, y: 0 }, C: dir(180 - a, 4), D: dir(b, 4) };
      const names = ['∠AOC', '∠COD', '∠DOB'];
      const arms = [['A', 'C'], ['C', 'D'], ['D', 'B']];
      const labels = mode === 'sum' ? [`${a}°`, '?', `${b}°`] : parts.map((_, i) => (i === ask ? '?' : ''));
      const answer = parts[ask];
      const k = 180 / sum(ratio || [1]);
      const caption = mode === 'sum' ? `AOB is a straight line; ∠AOC = ${a}° and ∠DOB = ${b}°` : `AOB is a straight line; ∠AOC : ∠COD : ∠DOB = ${ratio.join(' : ')}`;
      return {
        question:
          mode === 'sum'
            ? `AOB is a straight line, and rays OC and OD lie on the same side of it. If ∠AOC = ${a}° and ∠DOB = ${b}°, what is ∠COD?`
            : `AOB is a straight line, and rays OC and OD split the straight angle into ∠AOC, ∠COD and ∠DOB in the ratio ${ratio.join(' : ')}. What is ${names[ask]}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, { x: 0, y: -1 }, { O: { labelOffset: [-4, 16] } }),
          shapes: [{ type: 'segment', from: 'A', to: 'B' }, { type: 'segment', from: 'O', to: 'C' }, { type: 'segment', from: 'O', to: 'D' }],
          angles: arms.map(([from, to], i) => ({ at: 'O', from, to, label: labels[i], radius: 18 + 4 * i })),
          ariaSummary: `${caption}. ${names[ask]} is marked with a question mark.`
        },
        explanation:
          mode === 'sum'
            ? `Angles on a straight line add up to 180°, so ∠COD = 180 − ${a} − ${b} = ${x}°.`
            : `The three angles make the straight angle, 180°. The ratio has ${ratio.join(' + ')} = ${sum(ratio)} parts, so one part is 180 ÷ ${sum(ratio)} = ${fmt(k)}°. ${names[ask]} has ${ratio[ask]} part${ratio[ask] === 1 ? '' : 's'}: ${ratio[ask]} × ${fmt(k)} = ${answer}°.`,
        solutionSteps:
          mode === 'sum'
            ? [`${a} + ${b} = ${a + b}.`, `180 − ${a + b} = ${x}.`]
            : [`Total parts: ${ratio.join(' + ')} = ${sum(ratio)}.`, `One part: 180 ÷ ${sum(ratio)} = ${fmt(k)}°.`, `${names[ask]}: ${ratio[ask]} × ${fmt(k)} = ${answer}°.`],
        method: 'Angles on a straight line sum to 180°.',
        hints: ['∠AOC, ∠COD and ∠DOB together make the straight angle AOB.', mode === 'sum' ? 'Subtract the two known angles from 180°.' : 'Share 180° out in the given ratio.'],
        commonMistakes: [mode === 'sum' ? 'Subtracting from 360°, the angle round a point.' : `Sharing 360° instead of 180°, giving ${fmt(ratio[ask] * 2 * k)}°.`]
      };
    }
  },

  /* ============================ mensuration 2D ============================ */
  {
    id: 'md-inscribed-circle-sheet',
    version: 1,
    topicId: 'mensuration-2d',
    conceptId: 'md-inscribed',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['md-inscribed-f'],
    estimatedSeconds: 60,
    params(rng) {
      return { k: rng.int(1, 8), given: rng.pick(['side', 'perimeter', 'area']), ask: rng.pick(['circle', 'left']) };
    },
    // Side 14k: radius 7k, circle 22/7 × 49k² = 154k², sheet 196k².
    answer: ({ k, ask }) => (ask === 'circle' ? 154 * k * k : 42 * k * k),
    verify({ k, ask }, value) {
      const a = 14 * k;
      const square = [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: a }, { x: 0, y: a }];
      const centre = { x: a / 2, y: a / 2 };
      // The largest circle touches the bottom side: its radius is the centre's height above it.
      const r = centre.y - square[0].y;
      const circle = Math.PI * r * r;
      return ask === 'circle' ? nearlyEqual(value, circle, 1e-3) : nearlyEqual(value, shoelace(square) - circle, 5e-3);
    },
    render({ k, given, ask }) {
      const a = 14 * k;
      const r = 7 * k;
      const circle = 154 * k * k;
      const sheet = a * a;
      const sheetText = { side: `a square sheet of side ${cm(a)}`, perimeter: `a square sheet with a perimeter of ${cm(4 * a)}`, area: `a square sheet of area ${cm2(sheet)}` }[given];
      const sideStep = { side: null, perimeter: `Side = ${4 * a} ÷ 4 = ${a} cm.`, area: `Side = √${sheet} = ${a} cm.` }[given];
      const points = [
        { id: 'A', x: 0, y: 0, labelOffset: [-14, 10] },
        { id: 'B', x: a, y: 0, labelOffset: [10, 10] },
        { id: 'C', x: a, y: a, labelOffset: [10, -10] },
        { id: 'D', x: 0, y: a, labelOffset: [-14, -10] },
        { id: 'O', x: r, y: r, hidden: true }
      ];
      const shapes = [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }, { type: 'circle', center: 'O', radius: r }];
      if (given === 'side') shapes.push({ type: 'segment', from: 'B', to: 'A', label: cm(a) });
      const caption = `The largest circle cut from ${sheetText}; ${ask === 'circle' ? 'the circle' : 'the sheet left over'} is shaded`;
      // The circle itself, or the four corners of the sheet outside it (square + circle, odd overlap).
      const shaded = [{ parts: ask === 'circle' ? [{ type: 'circle', center: 'O', radius: r }] : [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }, { type: 'circle', center: 'O', radius: r }] }];
      const shadedText = ask === 'circle' ? 'The circle is shaded.' : 'The four corners of the sheet outside the circle are shaded.';
      return {
        question: `The largest possible circle is cut from ${sheetText}. ${ask === 'circle' ? 'What is the area of the circle?' : 'What area of the sheet is left over?'} (Use π = 22/7.)`,
        figure: { type: 'diagram', caption, points, shapes, shaded, ariaSummary: `The largest circle cut from ${sheetText}; the circle touches all four sides of the square. ${shadedText}` },
        explanation: `${sideStep ? `${sideStep} ` : ''}The largest circle touches all four sides, so its diameter equals the side, ${a} cm, and its radius is ${r} cm. Circle = 22/7 × ${r}² = ${circle} cm².${ask === 'left' ? ` Left over = ${sheet} − ${circle} = ${sheet - circle} cm².` : ''}`,
        solutionSteps: [
          ...(sideStep ? [sideStep] : []),
          `Radius = ${a} ÷ 2 = ${r} cm.`,
          `Circle: 22/7 × ${r * r} = ${circle} cm².`,
          ...(ask === 'left' ? [`Sheet: ${a}² = ${sheet} cm².`, `${sheet} − ${circle} = ${sheet - circle} cm².`] : [])
        ],
        method: 'For a circle inside a square, diameter = side, so radius = side ÷ 2.',
        hints: ['The circle touches all four sides of the square.', `So its diameter is the side of the square${given === 'side' ? '' : ', which you must find first'}.`],
        commonMistakes: [`Using the side (${a} cm) as the radius, giving ${fmt(SOLID_PI * a * a)} cm².`]
      };
    }
  },

  {
    id: 'md-inscribed-square-in-circle',
    version: 1,
    topicId: 'mensuration-2d',
    conceptId: 'md-inscribed',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['md-sc-inscribed'],
    answerDecimals: 1,
    estimatedSeconds: 70,
    params(rng) {
      const ask = rng.pick(['square', 'gap']);
      const r = ask === 'gap' ? 7 * rng.int(1, 5) : rng.int(3, 30);
      return { r, ask, given: rng.pick(['radius', 'diameter']) };
    },
    // Square's diagonal = diameter 2r, so its area is (2r)² ÷ 2 = 2r²; gap = (22/7 − 2)r² = 8r²/7.
    answer: ({ r, ask }) => (ask === 'square' ? 2 * r * r : (8 * r * r) / 7),
    verify({ r, ask }, value) {
      const corners = [45, 135, 225, 315].map((a) => dir(a, r));
      const square = shoelace(corners);
      return ask === 'square' ? nearlyEqual(value, square) : nearlyEqual(value, Math.PI * r * r - square, 5e-3);
    },
    render({ r, ask, given }) {
      const g = { O: { x: 0, y: 0 }, A: dir(225, r), B: dir(315, r), C: dir(45, r), D: dir(135, r), E: dir(0, r) };
      const square = 2 * r * r;
      const circle = (22 / 7) * r * r;
      const sizeText = given === 'radius' ? `radius ${cm(r)}` : `diameter ${cm(2 * r)}`;
      const shapes = [
        { type: 'circle', center: 'O', radius: r },
        { type: 'polygon', points: ['A', 'B', 'C', 'D'] },
        { type: 'segment', from: 'A', to: 'C', style: 'dashed', ...(given === 'diameter' ? { label: cm(2 * r) } : {}) }
      ];
      if (given === 'radius') shapes.push({ type: 'segment', from: 'O', to: 'E', label: cm(r) });
      const caption = `Square ABCD with its corners on a circle of ${sizeText}; ${ask === 'square' ? 'the square' : 'the area inside the circle but outside the square'} is shaded`;
      // The square itself, or the four segments of the circle outside it (circle + square, odd overlap).
      const square4 = { type: 'polygon', points: ['A', 'B', 'C', 'D'] };
      const shaded = [{ parts: ask === 'square' ? [square4] : [{ type: 'circle', center: 'O', radius: r }, square4] }];
      const shadedText = ask === 'square' ? 'The square is shaded.' : 'The four segments of the circle outside the square are shaded.';
      return {
        question:
          ask === 'square'
            ? `A square ABCD is drawn with all four corners on a circle of ${sizeText}. What is the area of the square?`
            : `A square ABCD is drawn with all four corners on a circle of ${sizeText}. What is the area inside the circle but outside the square? (Use π = 22/7.)`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, g.O, { O: { labelOffset: [-6, 18] }, E: given === 'radius' ? {} : { hidden: true } }),
          shapes,
          shaded,
          ariaSummary: `Square ABCD with its corners on a circle of ${sizeText}; the diagonal AC passes through the centre O. ${shadedText}`
        },
        explanation: `The square's diagonal AC is a diameter of the circle, ${2 * r} cm. A square's area is half its diagonal squared: ${2 * r}² ÷ 2 = ${square} cm².${ask === 'gap' ? ` Circle = 22/7 × ${r}² = ${fmt(circle)} cm², so the gap is ${fmt(circle)} − ${square} = ${fmt(circle - square)} cm².` : ''}`,
        solutionSteps: [
          ...(given === 'radius' ? [`Diagonal = diameter = 2 × ${r} = ${2 * r} cm.`] : [`Diagonal = diameter = ${2 * r} cm.`]),
          `Square = ${2 * r}² ÷ 2 = ${square} cm².`,
          ...(ask === 'gap' ? [`Circle = 22/7 × ${r * r} = ${fmt(circle)} cm².`, `${fmt(circle)} − ${square} = ${fmt(circle - square)} cm².`] : [])
        ],
        method: 'Square inside a circle: diagonal = diameter, area = 2r².',
        hints: ['Which length of the square is a diameter of the circle?', 'Area of a square = diagonal² ÷ 2.'],
        commonMistakes: [`Taking the diameter as the side: ${fmt((2 * r) ** 2)} cm².`]
      };
    }
  },

  /* ================================ polygons ================================ */
  {
    id: 'poly-exterior-missing',
    version: 1,
    topicId: 'polygons',
    conceptId: 'poly-exteriorsum',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '°',
    estimatedSeconds: 55,
    params(rng) {
      const n = rng.pick([4, 5, 6]);
      const hi = { 4: 14, 5: 11, 6: 8 }[n];
      // Vertices on a circle: arcs of 10° steps between them make each exterior angle a multiple of 5°.
      const arcs = Array.from({ length: n - 1 }, () => 10 * rng.int(4, hi));
      const last = 360 - sum(arcs);
      if (last < 40 || last > 10 * hi) return null;
      arcs.push(last);
      return { arcs, missing: rng.int(0, n - 1), ask: rng.pick(['exterior', 'interior']), start: 5 * rng.int(0, 71) };
    },
    answer({ arcs, missing, ask }) {
      const ext = exteriorAngles(arcs);
      const rest = sum(ext.filter((_, i) => i !== missing));
      return ask === 'exterior' ? 360 - rest : 180 - (360 - rest);
    },
    verify(p, value) {
      const g = exteriorFigure(p);
      const i = p.missing;
      const n = p.arcs.length;
      const V = g.vertices;
      return p.ask === 'exterior'
        ? measuresAs(angleAt(V[i], g.ends[i], V[(i + 1) % n]), value)
        : measuresAs(angleAt(V[i], V[(i - 1 + n) % n], V[(i + 1) % n]), value);
    },
    render(p) {
      const { arcs, missing, ask } = p;
      const n = arcs.length;
      const ext = exteriorAngles(arcs);
      const g = exteriorFigure(p);
      const ids = 'ABCDEF'.slice(0, n).split('');
      const named = {};
      const extra = {};
      ids.forEach((id, i) => {
        named[id] = g.vertices[i];
        named[`${id}x`] = g.ends[i];
        const v = g.vertices[i];
        const len = Math.hypot(v.x, v.y) || 1;
        // Vertex labels sit just inside the polygon, clear of the extended sides and angle marks.
        extra[id] = { labelOffset: [Math.round((-v.x / len) * 15) - 4, Math.round((v.y / len) * 15) + 4] };
        extra[`${id}x`] = { hidden: true };
      });
      const name = { 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon' }[n];
      const knownIds = ids.filter((_, i) => i !== missing);
      const known = ext.filter((_, i) => i !== missing);
      const target = ids[missing];
      const exterior = 360 - sum(known);
      const interior = 180 - exterior;
      const angles = ids.map((id, i) => ({ at: id, from: `${id}x`, to: ids[(i + 1) % n], label: i === missing ? (ask === 'exterior' ? '?' : '') : `${ext[i]}°`, radius: 16 }));
      if (ask === 'interior') angles.push({ at: target, from: ids[(missing - 1 + n) % n], to: ids[(missing + 1) % n], label: '?', radius: 16 });
      const caption = `Convex ${name} ${ids.join('')} with each side extended`;
      return {
        question: `In the figure, each side of the convex ${name} ${ids.join('')} is extended to make an exterior angle at every vertex. The exterior angles at ${listText(knownIds)} are ${listText(known.map((e) => `${e}°`))}. What is the ${ask} angle at ${target}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(named, { x: 0, y: 0 }, extra),
          shapes: [{ type: 'polygon', points: ids }, ...ids.map((id) => ({ type: 'segment', from: id, to: `${id}x`, style: 'dashed' }))],
          angles,
          ariaSummary: `${caption}. Exterior angles: ${knownIds.map((id, i) => `${id} ${known[i]}°`).join(', ')}; the ${ask} angle at ${target} is marked with a question mark.`
        },
        explanation: `The exterior angles of any convex polygon add up to 360°. The given ones total ${known.join(' + ')} = ${sum(known)}°, so the exterior angle at ${target} is 360 − ${sum(known)} = ${exterior}°.${ask === 'interior' ? ` The interior and exterior angles at a vertex make a straight line, so the interior angle is 180 − ${exterior} = ${interior}°.` : ''}`,
        solutionSteps: [`${known.join(' + ')} = ${sum(known)}.`, `Exterior at ${target}: 360 − ${sum(known)} = ${exterior}°.`, ...(ask === 'interior' ? [`Interior at ${target}: 180 − ${exterior} = ${interior}°.`] : [])],
        method: 'Exterior angles of a convex polygon, one at each vertex, always sum to 360°.',
        hints: ['The total of the exterior angles does not depend on the number of sides.', ask === 'interior' ? 'Find the exterior angle first; the interior angle is its partner on a straight line.' : 'Subtract the known exterior angles from 360°.'],
        commonMistakes: [n === 4 ? 'Subtracting from 180°, as if the exterior angles made a straight line.' : `Using the interior-angle sum (${(n - 2) * 180}°) instead of 360°.`]
      };
    }
  },

  {
    id: 'poly-exterior-ratio',
    version: 1,
    topicId: 'polygons',
    conceptId: 'poly-exteriorsum',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: '°',
    estimatedSeconds: 60,
    params(rng) {
      const n = rng.pick([4, 5, 6, 8]);
      const parts = Array.from({ length: n }, () => rng.int(1, 5));
      const total = sum(parts);
      if (360 % total || parts.every((v) => v === parts[0])) return null;
      const k = 360 / total;
      if (Math.max(...parts) * k >= 180) return null;
      return { parts, ask: rng.pick(['largest', 'smallest', 'interior']) };
    },
    answer({ parts, ask }) {
      const k = 360 / sum(parts);
      if (ask === 'smallest') return Math.min(...parts) * k;
      const largest = Math.max(...parts) * k;
      return ask === 'largest' ? largest : 180 - largest;
    },
    // Scale the whole ratio from the answer and check it fills exactly 360°.
    verify({ parts, ask }, value) {
      const exterior = ask === 'interior' ? 180 - value : value;
      const part = ask === 'smallest' ? Math.min(...parts) : Math.max(...parts);
      return nearlyEqual(sum(parts.map((p) => (p * exterior) / part)), 360);
    },
    render({ parts, ask }) {
      const n = parts.length;
      const total = sum(parts);
      const k = 360 / total;
      const name = { 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 8: 'octagon' }[n];
      const big = Math.max(...parts);
      const small = Math.min(...parts);
      const asked = { largest: 'its largest exterior angle', smallest: 'its smallest exterior angle', interior: 'its smallest interior angle' }[ask];
      const result = { largest: big * k, smallest: small * k, interior: 180 - big * k }[ask];
      return {
        question: `The exterior angles of a convex ${name} are in the ratio ${parts.join(' : ')}. What is ${asked}?`,
        explanation: `The exterior angles add up to 360°. The ratio has ${total} parts, so one part is 360 ÷ ${total} = ${fmt(k)}°. ${ask === 'smallest' ? `The smallest exterior angle is ${small} × ${fmt(k)} = ${fmt(result)}°.` : `The largest exterior angle is ${big} × ${fmt(k)} = ${fmt(big * k)}°.`}${ask === 'interior' ? ` The smallest interior angle sits at the vertex with the largest exterior angle: 180 − ${fmt(big * k)} = ${fmt(result)}°.` : ''}`,
        solutionSteps: [
          `Parts: ${parts.join(' + ')} = ${total}.`,
          `One part = 360 ÷ ${total} = ${fmt(k)}°.`,
          ask === 'smallest' ? `${small} × ${fmt(k)} = ${fmt(result)}°.` : `${big} × ${fmt(k)} = ${fmt(big * k)}°.`,
          ...(ask === 'interior' ? [`180 − ${fmt(big * k)} = ${fmt(result)}°.`] : [])
        ],
        method: 'Share 360° in the given ratio: exterior angles of any convex polygon sum to 360°.',
        hints: ['The exterior angles total 360°, whatever the number of sides.', ask === 'interior' ? 'The smallest interior angle pairs with the largest exterior angle.' : 'Find the value of one part first.'],
        commonMistakes: [n === 4 ? 'Sharing 180° instead of 360°.' : `Sharing the interior-angle sum (${(n - 2) * 180}°) instead of 360°.`, ...(ask === 'interior' ? ['Pairing the smallest interior angle with the smallest exterior angle.'] : [])]
      };
    }
  },

  /* ============================= quadrilaterals ============================= */
  {
    id: 'quad-classify-properties',
    version: 1,
    topicId: 'quadrilaterals',
    conceptId: 'quad-types',
    difficulty: 'medium',
    type: 'single_choice',
    estimatedSeconds: 45,
    formatValue: (value) => value,
    params(rng) {
      const kind = rng.pick(QUAD_KINDS);
      const oblique = () => 5 * (rng.chance(0.5) ? rng.int(10, 16) : rng.int(20, 26));
      if (kind === 'Square') return { kind, s: rng.int(4, 12) };
      if (kind === 'Rhombus') return { kind, s: rng.int(4, 12), alpha: oblique() };
      if (kind === 'Rectangle' || kind === 'Parallelogram') {
        const l = rng.int(5, 14);
        return { kind, l, b: rng.int(3, l - 1), ...(kind === 'Parallelogram' ? { alpha: oblique() } : {}) };
      }
      if (kind === 'Trapezium') {
        const l = rng.int(8, 16);
        const m = rng.int(3, l - 3);
        const alpha = 5 * rng.int(10, 17);
        const beta = 5 * rng.int(10, 17);
        const h = (l - m) / (1 / Math.tan(alpha * RAD) + 1 / Math.tan(beta * RAD));
        if (h < 0.3 * l) return null;
        return { kind, l, m, alpha, beta, h };
      }
      const p = rng.int(4, 9);
      return { kind, p, q: rng.int(p + 2, p + 8) };
    },
    answer: ({ kind }) => kind,
    distractors: ({ kind }) => QUAD_WRONG[kind].map(([value, why]) => ({ value, why })),
    verify: (p, value) => classifyQuad(quadShape(p)) === value,
    render(p) {
      const g = quadShape(p);
      const facts = quadFacts(p);
      const marks = {};
      if (p.kind === 'Square' || p.kind === 'Rhombus') marks.ticks = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']].map((on) => ({ on, count: 1 }));
      if (p.kind === 'Rectangle' || p.kind === 'Parallelogram') {
        marks.ticks = [{ on: ['A', 'B'], count: 1 }, { on: ['D', 'C'], count: 1 }, { on: ['B', 'C'], count: 2 }, { on: ['A', 'D'], count: 2 }];
      }
      if (p.kind === 'Kite') marks.ticks = [{ on: ['A', 'B'], count: 1 }, { on: ['A', 'D'], count: 1 }, { on: ['C', 'B'], count: 2 }, { on: ['C', 'D'], count: 2 }];
      if (p.kind === 'Trapezium') marks.parallels = [{ on: ['A', 'B'], count: 1 }, { on: ['D', 'C'], count: 1 }];
      if (p.kind === 'Square' || p.kind === 'Rectangle') marks.rightAngles = [{ at: 'A', from: 'B', to: 'D' }];
      if (p.alpha && p.kind !== 'Trapezium') marks.angles = [{ at: 'A', from: 'B', to: 'D', label: `${p.alpha}°`, radius: 18 }];
      return {
        question: `Convex quadrilateral ABCD has ${facts}. What is the most specific name for ABCD?`,
        figure: {
          type: 'diagram',
          caption: `Quadrilateral ABCD: ${facts}`,
          points: figurePoints(g, centreOf(g)),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }],
          ...marks,
          ariaSummary: `Quadrilateral ABCD with ${facts}.`
        },
        explanation: `${QUAD_REASON[p.kind]} So ABCD is a ${p.kind.toLowerCase()}.`,
        solutionSteps: [`Given: ${facts}.`, QUAD_REASON[p.kind], `Most specific name: ${p.kind.toLowerCase()}.`],
        method: 'Check the sides (equal? parallel?) and the angles (right?), then choose the most specific shape that fits all the facts.',
        hints: ['Which sides are equal: opposite ones, neighbouring ones, or all four?', 'Is there a right angle? Is there a pair of parallel sides?'],
        commonMistakes: ['Giving a correct but more general name, such as parallelogram for a rectangle.', 'Assuming a property (like a right angle) that the facts do not give.']
      };
    }
  },

  {
    id: 'quad-trapezium-same-leg',
    version: 1,
    topicId: 'quadrilaterals',
    conceptId: 'quad-types',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['la-parallel-f'],
    estimatedSeconds: 45,
    formatValue: (value) => deg(value),
    params(rng) {
      const a = 5 * rng.int(10, 26);
      const b = 5 * rng.int(10, 26);
      if (a === 90 && b === 90) return null;
      return { a, b, target: rng.pick(['C', 'D']) };
    },
    answer: ({ a, b, target }) => (target === 'D' ? 180 - a : 180 - b),
    distractors: ({ a, b, target }) => {
      const [mine, other] = target === 'D' ? [a, b] : [b, a];
      const partner = target === 'D' ? 'A' : 'B';
      const across = target === 'D' ? 'B' : 'A';
      return [
        { value: 180 - other, why: `paired ∠${target} with ∠${across}, which is not on the same leg` },
        { value: mine, why: `took ∠${target} equal to ∠${partner} instead of supplementary` },
        { value: other, why: `took ∠${target} equal to ∠${across}, as if ABCD were a parallelogram` },
        { value: 360 - a - b, why: 'found ∠C + ∠D instead of one angle' },
        { value: 360 - mine, why: 'subtracted from 360° instead of 180°' },
        { value: Math.abs(90 - mine), why: 'subtracted from 90° instead of 180°' }
      ];
    },
    verify({ a, b, target }, value) {
      const g = trapeziumFromAngles(a, b);
      return measuresAs(target === 'D' ? angleAt(g.D, g.A, g.C) : angleAt(g.C, g.B, g.D), value);
    },
    render({ a, b, target }) {
      const g = trapeziumFromAngles(a, b);
      const partner = target === 'D' ? 'A' : 'B';
      const given = target === 'D' ? a : b;
      const answer = 180 - given;
      const leg = target === 'D' ? 'AD' : 'BC';
      const caption = `Trapezium ABCD with AB ∥ DC, ∠A = ${a}° and ∠B = ${b}°`;
      return {
        question: `ABCD is a trapezium with AB parallel to DC. If ∠A = ${a}° and ∠B = ${b}°, what is ∠${target}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g)),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }],
          parallels: [{ on: ['A', 'B'], count: 1 }, { on: ['D', 'C'], count: 1 }],
          angles: [
            { at: 'A', from: 'B', to: 'D', label: `${a}°`, radius: 18 },
            { at: 'B', from: 'A', to: 'C', label: `${b}°`, radius: 18 },
            target === 'D' ? { at: 'D', from: 'A', to: 'C', label: '?', radius: 18 } : { at: 'C', from: 'B', to: 'D', label: '?', radius: 18 }
          ],
          ariaSummary: `${caption}; ∠${target} is marked with a question mark.`
        },
        explanation: `∠${partner} and ∠${target} lie on the same leg ${leg}, between the parallel sides AB and DC. They are co-interior angles, so they add up to 180°: ∠${target} = 180 − ${given} = ${answer}°.`,
        solutionSteps: [`∠${partner} and ∠${target} share the leg ${leg}.`, `∠${partner} + ∠${target} = 180°.`, `180 − ${given} = ${answer}.`],
        method: 'In a trapezium, the two angles on the same leg are co-interior, so they sum to 180°.',
        hints: [`Which given angle shares a side with ∠${target} and sits between the parallel lines?`, 'Co-interior angles between parallel lines add up to 180°.'],
        commonMistakes: [`Using ∠${target === 'D' ? 'B' : 'A'}, which is on the other leg.`, 'Treating the angles as equal instead of supplementary.']
      };
    }
  },

  {
    id: 'quad-rectangle-diagonal',
    version: 1,
    topicId: 'quadrilaterals',
    conceptId: 'quad-rectangle',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['quad-rectangle-f', 'quad-sc-rectangle-diagonal'],
    answerDecimals: 1,
    estimatedSeconds: 50,
    params(rng) {
      const ask = rng.pick(['diagonal', 'side', 'half']);
      const [p, q, c] = rng.pick(TRIPLES);
      const k = rng.int(1, Math.max(1, Math.floor(50 / c)));
      if (c * k > 50) return null;
      const [l, w] = rng.chance(0.5) ? [p * k, q * k] : [q * k, p * k];
      return { l, w, d: c * k, ask };
    },
    answer: ({ w, d, ask }) => ({ diagonal: d, side: w, half: d / 2 })[ask],
    verify({ l, w, d, ask }, value) {
      const rect = (width, height) => ({ A: { x: 0, y: 0 }, B: { x: width, y: 0 }, C: { x: width, y: height }, D: { x: 0, y: height } });
      if (ask === 'side') {
        const g = rect(l, value);
        return nearlyEqual(dist(g.A, g.C), d);
      }
      const g = rect(l, w);
      return ask === 'diagonal' ? nearlyEqual(dist(g.B, g.D), value) : nearlyEqual(dist(mid(g.A, g.C), g.B), value);
    },
    render({ l, w, d, ask }) {
      const g = { A: { x: 0, y: 0 }, B: { x: l, y: 0 }, C: { x: l, y: w }, D: { x: 0, y: w }, O: { x: l / 2, y: w / 2 } };
      const shapes = [
        { type: 'polygon', points: ['A', 'B', 'C', 'D'] },
        { type: 'segment', from: 'B', to: 'A', label: cm(l) },
        { type: 'segment', from: 'C', to: 'B', label: ask === 'side' ? '?' : cm(w) },
        { type: 'segment', from: 'A', to: 'C', style: 'dashed', ...(ask === 'side' ? { label: cm(d) } : {}) },
        { type: 'segment', from: 'B', to: 'D', style: 'dashed', ...(ask === 'diagonal' ? { label: '?' } : {}) }
      ];
      const question = {
        diagonal: `Rectangle ABCD has AB = ${cm(l)} and BC = ${cm(w)}. How long is the diagonal BD?`,
        side: `In rectangle ABCD, the diagonal AC = ${cm(d)} and AB = ${cm(l)}. How long is BC?`,
        half: `The diagonals of rectangle ABCD meet at O. If AB = ${cm(l)} and BC = ${cm(w)}, how long is OB?`
      }[ask];
      const caption = { diagonal: `Rectangle ABCD, ${l} cm by ${w} cm`, side: `Rectangle ABCD with AB = ${cm(l)} and AC = ${cm(d)}`, half: `Rectangle ABCD, ${l} cm by ${w} cm; diagonals meet at O` }[ask];
      return {
        question,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, g.O, { O: ask === 'half' ? { labelOffset: [-4, 18] } : { hidden: true } }),
          shapes,
          rightAngles: [{ at: 'B', from: 'A', to: 'C' }],
          ariaSummary: `${caption}. Diagonals AC and BD are drawn.`
        },
        explanation: {
          diagonal: `Each diagonal is the hypotenuse of a right triangle with legs ${l} and ${w}: BD = √(${l}² + ${w}²) = √${d * d} = ${d} cm. (Both diagonals of a rectangle are equal, so AC is also ${d} cm.)`,
          side: `Triangle ABC has a right angle at B, so BC = √(${d}² − ${l}²) = √${w * w} = ${w} cm.`,
          half: `The diagonals are equal: BD = AC = √(${l}² + ${w}²) = ${d} cm. They bisect each other, so OB = ${d} ÷ 2 = ${fmt(d / 2)} cm.`
        }[ask],
        solutionSteps: {
          diagonal: [`${l}² + ${w}² = ${l * l} + ${w * w} = ${d * d}.`, `√${d * d} = ${d}.`],
          side: [`${d}² − ${l}² = ${d * d} − ${l * l} = ${w * w}.`, `√${w * w} = ${w}.`],
          half: [`Diagonal = √(${l * l} + ${w * w}) = ${d}.`, `OB = ${d} ÷ 2 = ${fmt(d / 2)}.`]
        }[ask],
        method: 'A rectangle\'s diagonal = √(l² + b²); the two diagonals are equal and bisect each other.',
        hints: ['A diagonal splits the rectangle into two right triangles.', ask === 'half' ? 'O is the midpoint of each diagonal.' : 'Use Pythagoras with the diagonal as the hypotenuse.'],
        commonMistakes: ask === 'side' ? [`Adding the squares: √(${d}² + ${l}²).`] : [`Adding the sides: ${l} + ${w} = ${l + w}.`]
      };
    }
  },

  {
    id: 'quad-rectangle-diagonal-angles',
    version: 1,
    topicId: 'quadrilaterals',
    conceptId: 'quad-rectangle',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['quad-rectangle-f'],
    estimatedSeconds: 60,
    formatValue: (value) => deg(value),
    params(rng) {
      const theta = 5 * rng.int(4, 14);
      if (theta === 45) return null;
      return { theta, ask: rng.pick(['AOB', 'BOC', 'OBC', 'ODC']) };
    },
    answer: ({ theta, ask }) => ({ AOB: 180 - 2 * theta, BOC: 2 * theta, OBC: 90 - theta, ODC: theta })[ask],
    distractors: ({ theta, ask }) =>
      ({
        AOB: [
          { value: 2 * theta, why: 'gave ∠BOC, the angle next to ∠AOB' },
          { value: 180 - theta, why: 'subtracted only ∠OAB, forgetting that ∠OBA equals it' },
          { value: 90 - theta, why: 'found ∠OBC instead' },
          { value: 90, why: 'assumed the diagonals cross at right angles, as in a square' }
        ],
        BOC: [
          { value: 180 - 2 * theta, why: 'gave ∠AOB instead' },
          { value: theta, why: 'forgot to double ∠OAB' },
          { value: 90 - theta, why: 'found ∠OBC instead' },
          { value: 90, why: 'assumed the diagonals cross at right angles, as in a square' }
        ],
        OBC: [
          { value: theta, why: 'took ∠OBC equal to ∠OAB' },
          { value: 180 - 2 * theta, why: 'gave ∠AOB instead' },
          { value: 90 + theta, why: 'added ∠OAB to 90° instead of subtracting' },
          { value: 45, why: 'assumed the diagonal halves the corner, as in a square' }
        ],
        ODC: [
          { value: 90 - theta, why: 'used the complement of ∠OAB' },
          { value: 2 * theta, why: 'doubled ∠OAB' },
          { value: 180 - 2 * theta, why: 'gave the angle at O' },
          { value: 45, why: 'assumed the diagonal halves the corner, as in a square' }
        ]
      })[ask],
    verify({ theta, ask }, value) {
      const g = rectangleWithDiagonalAngle(theta);
      const measured = { AOB: angleAt(g.O, g.A, g.B), BOC: angleAt(g.O, g.B, g.C), OBC: angleAt(g.B, g.O, g.C), ODC: angleAt(g.D, g.O, g.C) }[ask];
      return measuresAs(measured, value);
    },
    render({ theta, ask }) {
      const g = rectangleWithDiagonalAngle(theta);
      const [at, from, to] = { AOB: ['O', 'A', 'B'], BOC: ['O', 'B', 'C'], OBC: ['B', 'O', 'C'], ODC: ['D', 'O', 'C'] }[ask];
      const answer = { AOB: 180 - 2 * theta, BOC: 2 * theta, OBC: 90 - theta, ODC: theta }[ask];
      const reason = {
        AOB: `The diagonals of a rectangle are equal and bisect each other, so OA = OB and triangle AOB is isosceles: ∠OBA = ∠OAB = ${theta}°. Then ∠AOB = 180 − 2 × ${theta} = ${answer}°.`,
        BOC: `OA = OB (equal diagonals, bisected), so ∠OBA = ${theta}° and ∠AOB = 180 − ${2 * theta} = ${180 - 2 * theta}°. ∠BOC lies next to it on the straight line AC: 180 − ${180 - 2 * theta} = ${answer}°.`,
        OBC: `OA = OB, so ∠OBA = ∠OAB = ${theta}°. The corner ∠ABC is 90°, so ∠OBC = 90 − ${theta} = ${answer}°.`,
        ODC: `DC is parallel to AB, so ∠OCD = ∠OAB = ${theta}° (alternate angles). OC = OD (equal diagonals, bisected), so ∠ODC = ∠OCD = ${answer}°.`
      }[ask];
      const caption = `Rectangle ABCD with diagonals meeting at O; ∠OAB = ${theta}°`;
      return {
        question: `The diagonals of rectangle ABCD meet at O. If ∠OAB = ${theta}°, what is ∠${ask}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, g.O, { O: { labelOffset: [-4, 18] } }),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }, { type: 'segment', from: 'A', to: 'C' }, { type: 'segment', from: 'B', to: 'D' }],
          angles: [
            { at: 'A', from: 'B', to: 'O', label: `${theta}°`, radius: 22 },
            { at, from, to, label: '?', radius: 18 }
          ],
          ariaSummary: `${caption}. The angle asked for is marked with a question mark.`
        },
        explanation: reason,
        solutionSteps: [`OA = OB = OC = OD (equal diagonals that bisect each other).`, reason.split('. ').slice(1).join('. ')],
        method: 'Equal diagonals that bisect each other make four isosceles triangles at O.',
        hints: ['In a rectangle, OA = OB = OC = OD.', 'Equal sides in a triangle face equal angles.'],
        commonMistakes: ['Assuming the diagonals cross at right angles, which is only true for a square.']
      };
    }
  },

  {
    id: 'quad-square-diagonal-area',
    version: 1,
    topicId: 'quadrilaterals',
    conceptId: 'quad-rectangle',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['quad-rectangle-f'],
    answerDecimals: 1,
    estimatedSeconds: 45,
    params(rng) {
      const d = rng.int(4, 40);
      return { d, half: d % 2 === 0 && rng.chance(0.4) };
    },
    answer: ({ d }) => (d * d) / 2,
    verify({ d }, value) {
      // Corners at the ends of two perpendicular diagonals of length d.
      const corners = [{ x: d / 2, y: 0 }, { x: 0, y: d / 2 }, { x: -d / 2, y: 0 }, { x: 0, y: -d / 2 }];
      return nearlyEqual(shoelace(corners), value);
    },
    render({ d, half }) {
      const s = d / Math.SQRT2;
      const g = { A: { x: 0, y: 0 }, B: { x: s, y: 0 }, C: { x: s, y: s }, D: { x: 0, y: s }, O: { x: s / 2, y: s / 2 } };
      const given = half ? `the diagonals meet at O and OA = ${cm(d / 2)}` : `the diagonal AC = ${cm(d)}`;
      const caption = half ? `Square ABCD with OA = ${cm(d / 2)}` : `Square ABCD with diagonal AC = ${cm(d)}`;
      return {
        question: `In square ABCD, ${given}. What is the area of the square?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, g.O, { O: half ? { labelOffset: [-4, 18] } : { hidden: true } }),
          shapes: [
            { type: 'polygon', points: ['A', 'B', 'C', 'D'] },
            half ? { type: 'segment', from: 'O', to: 'A', label: cm(d / 2) } : { type: 'segment', from: 'A', to: 'C', label: cm(d) },
            ...(half ? [{ type: 'segment', from: 'O', to: 'C' }] : []),
            { type: 'segment', from: 'B', to: 'D', style: 'dashed' }
          ],
          ticks: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']].map((on) => ({ on, count: 1 })),
          rightAngles: [{ at: 'B', from: 'A', to: 'C' }],
          ariaSummary: `${caption}; all four sides are equal and the angles are right angles.`
        },
        explanation: `${half ? `The diagonals bisect each other, so AC = 2 × ${fmt(d / 2)} = ${d} cm. ` : ''}A diagonal splits the square into two right triangles with equal legs (the side s): s² + s² = ${d}², so s² = ${d * d} ÷ 2 = ${fmt((d * d) / 2)}. The area is s² = ${fmt((d * d) / 2)} cm².`,
        solutionSteps: [...(half ? [`AC = 2 × ${fmt(d / 2)} = ${d}.`] : []), `2s² = ${d}² = ${d * d}.`, `Area = s² = ${d * d} ÷ 2 = ${fmt((d * d) / 2)}.`],
        method: 'Area of a square = diagonal² ÷ 2.',
        hints: ['You do not need the side itself, only its square.', 'Pythagoras on triangle ABC: AB² + BC² = AC².'],
        commonMistakes: [`Squaring the diagonal and forgetting to halve: ${d * d} cm².`]
      };
    }
  },

  /* ================================ triangles ================================ */
  {
    id: 'tri-type-from-sides',
    version: 1,
    topicId: 'triangles',
    conceptId: 'tri-types',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tri-sc-type-from-sides'],
    estimatedSeconds: 50,
    formatValue: (value) => value,
    params(rng) {
      const target = rng.pick(SIDE_KIND_OPTIONS);
      for (let i = 0; i < 40; i++) {
        let sides;
        if (target === SIDE_KIND_OPTIONS[1]) {
          const t = rng.pick(TRIPLES);
          const k = rng.int(1, Math.max(1, Math.floor(30 / t[2])));
          if (t[2] * k > 30) continue;
          sides = t.map((v) => v * k);
        } else if (target === SIDE_KIND_OPTIONS[3]) {
          const a = rng.int(2, 12);
          const b = rng.int(2, 12);
          sides = [a, b, a + b + rng.int(0, 4)];
        } else {
          sides = [rng.int(3, 25), rng.int(3, 25), rng.int(3, 25)];
        }
        const sorted = [...sides].sort((x, y) => x - y);
        if (sideKind(sorted) === target) return { sides: rng.shuffle(sides) };
      }
      return null;
    },
    answer: ({ sides }) => sideKind([...sides].sort((x, y) => x - y)),
    distractors: ({ sides }) => {
      const answer = sideKind([...sides].sort((x, y) => x - y));
      return SIDE_KIND_OPTIONS.filter((o) => o !== answer).map((value) => ({ value, why: SIDE_KIND_WHY[value] }));
    },
    verify({ sides }, value) {
      // Build the triangle from its sides and measure its largest angle.
      const [a, b, c] = [...sides].sort((x, y) => x - y);
      const g = triangleFromSides(c, a, b);
      if (!g) return value === SIDE_KIND_OPTIONS[3];
      const largest = Math.max(angleAt(g.A, g.B, g.C), angleAt(g.B, g.A, g.C), angleAt(g.C, g.A, g.B));
      if (Math.abs(largest - 90) < 1e-6) return value === SIDE_KIND_OPTIONS[1];
      return value === (largest < 90 ? SIDE_KIND_OPTIONS[0] : SIDE_KIND_OPTIONS[2]);
    },
    render({ sides }) {
      const [a, b, c] = [...sides].sort((x, y) => x - y);
      const answer = sideKind([a, b, c]);
      const possible = a + b > c;
      const squares = `${c}² = ${c * c} and ${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}`;
      const compare = c * c < a * a + b * b ? 'less than' : c * c === a * a + b * b ? 'equal to' : 'greater than';
      const angleWord = { 'less than': 'acute', 'equal to': 'a right angle', 'greater than': 'obtuse' }[compare];
      return {
        question: `Can sticks of ${listText(sides.map(cm))} be joined end to end to make a triangle? If so, what kind of triangle is it by its angles?`,
        explanation: possible
          ? `The two shorter sides give ${a} + ${b} = ${a + b}, more than ${c}, so a triangle is possible. Compare the squares: ${squares}. ${c * c} is ${compare} ${a * a + b * b}, so the largest angle is ${angleWord}: ${answer.toLowerCase()}.`
          : `The two shorter sides give ${a} + ${b} = ${a + b}, which is not more than ${c}. The two short sticks cannot reach across the longest, so no triangle is possible.`,
        solutionSteps: possible
          ? [`Triangle check: ${a} + ${b} = ${a + b} > ${c}.`, `${squares}.`, `${c * c} is ${compare} ${a * a + b * b}: ${answer.toLowerCase()}.`]
          : [`Triangle check: ${a} + ${b} = ${a + b}, not more than ${c}.`, 'No triangle can be made.'],
        method: 'First check the two shorter sides add to more than the longest. Then compare the longest side squared with the sum of the other two squares.',
        hints: ['Start with the triangle inequality: the two shorter sides must add up to more than the longest.', 'Less than, equal to or more than: compare c² with a² + b², where c is the longest side.'],
        commonMistakes: ['Comparing the sides themselves instead of their squares.', 'Using a side other than the longest as c.']
      };
    }
  },

  {
    id: 'tri-type-from-angles',
    version: 1,
    topicId: 'triangles',
    conceptId: 'tri-types',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tri-anglesum-f'],
    estimatedSeconds: 45,
    formatValue: (value) => value,
    params(rng) {
      const target = rng.pick(['acute-scalene', 'acute-isosceles', 'right-scalene', 'right-isosceles', 'obtuse-scalene', 'obtuse-isosceles', 'equilateral']);
      let angles;
      if (target === 'equilateral') angles = [60, 60, 60];
      else if (target === 'right-isosceles') angles = [90, 45, 45];
      else if (target === 'right-scalene') {
        const x = 5 * rng.int(4, 14);
        if (x === 45) return null;
        angles = [90, x, 90 - x];
      } else if (target === 'acute-isosceles') {
        const e = 5 * rng.int(10, 17);
        if (e === 60) return null;
        angles = [e, e, 180 - 2 * e];
      } else if (target === 'obtuse-isosceles') {
        const e = 5 * rng.int(3, 8);
        angles = [e, e, 180 - 2 * e];
      } else {
        const big = target === 'obtuse-scalene' ? 5 * rng.int(19, 30) : 5 * rng.int(13, 17);
        const x = 5 * rng.int(4, Math.floor((180 - big) / 5) - 4);
        angles = [big, x, 180 - big - x];
        if (new Set(angles).size < 3 || Math.max(...angles) !== big) return null;
      }
      const [A, B, C] = rng.shuffle(angles);
      return { A, B, C };
    },
    answer: ({ A, B, C }) => angleSideName([A, B, C]),
    distractors: ({ A, B, C }) => {
      const answer = angleSideName([A, B, C]);
      if (answer === 'Equilateral') {
        return [
          { value: 'Acute isosceles', why: 'stopped at two equal angles' },
          { value: 'Acute scalene', why: 'did not notice that equal angles give equal sides' },
          { value: 'Right isosceles', why: 'misjudged the angles' },
          { value: 'Obtuse isosceles', why: 'misjudged the angles' }
        ];
      }
      const [aClass, sClass] = answer.split(' ');
      const otherSide = sClass === 'isosceles' ? 'scalene' : 'isosceles';
      const fromGiven = Math.max(A, B) < 90 ? 'Acute' : Math.max(A, B) === 90 ? 'Right' : 'Obtuse';
      const list = [
        { value: `${aClass} ${otherSide}`, why: sClass === 'isosceles' ? 'missed that two equal angles mean two equal sides' : 'assumed two equal sides without two equal angles' }
      ];
      if (fromGiven !== aClass) list.push({ value: `${fromGiven} ${sClass}`, why: 'classified by the two given angles without finding the third' });
      for (const c of ANGLE_CLASSES) if (c !== aClass && c !== fromGiven) list.push({ value: `${c} ${sClass}`, why: 'misjudged the largest angle' });
      list.push({ value: `${ANGLE_CLASSES.find((c) => c !== aClass)} ${otherSide}`, why: 'misjudged both the largest angle and the equal angles' });
      if (answer === 'Acute isosceles') list.push({ value: 'Equilateral', why: 'assumed all three angles equal' });
      return list;
    },
    verify({ A, B, C }, value) {
      // Build the triangle from two angles, then measure its sides and angles.
      const g = { A: { x: 0, y: 0 }, B: { x: 8, y: 0 }, C: apex(A, B, 8) };
      const sides = [dist(g.A, g.B), dist(g.B, g.C), dist(g.C, g.A)];
      const angles = [angleAt(g.A, g.B, g.C), angleAt(g.B, g.A, g.C), angleAt(g.C, g.A, g.B)];
      const eq = (x, y) => Math.abs(x - y) < 1e-6;
      const equalPairs = [eq(sides[0], sides[1]), eq(sides[1], sides[2]), eq(sides[0], sides[2])].filter(Boolean).length;
      if (equalPairs === 3) return value === 'Equilateral';
      const largest = Math.max(...angles);
      const aClass = Math.abs(largest - 90) < 1e-6 ? 'Right' : largest < 90 ? 'Acute' : 'Obtuse';
      return value === `${aClass} ${equalPairs ? 'isosceles' : 'scalene'}`;
    },
    render({ A, B, C }) {
      const g = { A: { x: 0, y: 0 }, B: { x: 8, y: 0 }, C: apex(A, B, 8) };
      const answer = angleSideName([A, B, C]);
      const largest = Math.max(A, B, C);
      const sideReason =
        answer === 'Equilateral'
          ? 'All three angles are equal, so all three sides are equal.'
          : A === B || B === C || A === C
            ? 'Two angles are equal, so the sides opposite them are equal: isosceles.'
            : 'All three angles are different, so all three sides are different: scalene.';
      const angleReason = largest < 90 ? `The largest angle is ${largest}°, under 90°, so it is acute-angled.` : largest === 90 ? 'One angle is exactly 90°, so it is right-angled.' : `The largest angle is ${largest}°, over 90°, so it is obtuse-angled.`;
      const caption = `Triangle ABC with ∠A = ${A}° and ∠B = ${B}°`;
      return {
        question: `In triangle ABC, ∠A = ${A}° and ∠B = ${B}°. How is the triangle best classified, by its sides and its angles?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g)),
          shapes: [{ type: 'polygon', points: ['A', 'B', 'C'] }],
          angles: [
            { at: 'A', from: 'B', to: 'C', label: `${A}°`, radius: 20 },
            { at: 'B', from: 'A', to: 'C', label: `${B}°`, radius: 20 },
            { at: 'C', from: 'A', to: 'B', label: '?', radius: 16 }
          ],
          ariaSummary: `${caption}; ∠C is marked with a question mark.`
        },
        explanation: `∠C = 180 − ${A} − ${B} = ${C}°. ${angleReason} ${sideReason} So it is ${answer === 'Equilateral' ? 'equilateral' : `an ${answer.toLowerCase()} triangle`.replace('an r', 'a r')}.`,
        solutionSteps: [`∠C = 180 − ${A} − ${B} = ${C}°.`, angleReason, sideReason],
        method: 'Find the third angle; the largest angle names the angle type, and equal angles mean equal opposite sides.',
        hints: ['Find ∠C first: the angles add up to 180°.', 'Equal angles sit opposite equal sides.'],
        commonMistakes: ['Classifying from the two given angles without working out the third.', 'Forgetting that two equal angles make the triangle isosceles.']
      };
    }
  },

  /* ============================== trigonometry ============================== */
  {
    id: 'trig-ratio-read-triangle',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-ratios',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['trig-ratios-f'],
    estimatedSeconds: 40,
    formatValue: (value) => value,
    params(rng) {
      const [p, q, h] = rng.pick(TRIPLES);
      const k = rng.int(1, Math.max(1, Math.floor(45 / h)));
      if (h * k > 45) return null;
      const [ab, bc] = rng.chance(0.5) ? [p * k, q * k] : [q * k, p * k];
      return { ab, bc, ac: h * k, angle: rng.pick(['A', 'C']), ratio: rng.pick(['sin', 'cos', 'tan']) };
    },
    answer: (p) => trigRatioText(p, p.ratio),
    distractors: (p) => TRIG_CONFUSIONS[p.ratio].map((name) => ({ value: trigRatioText(p, name), why: `used ${TRIG_NAMES[name][0]} ÷ ${TRIG_NAMES[name][1]}, which is ${name} ${p.angle}` })),
    verify(p, value) {
      const g = { A: { x: p.ab, y: 0 }, B: { x: 0, y: 0 }, C: { x: 0, y: p.bc } };
      const theta = (p.angle === 'A' ? angleAt(g.A, g.B, g.C) : angleAt(g.C, g.A, g.B)) * RAD;
      const actual = { sin: Math.sin(theta), cos: Math.cos(theta), tan: Math.tan(theta) }[p.ratio];
      return nearlyEqual(actual, fractionValue(value), 1e-9);
    },
    render(p) {
      const { ab, bc, ac, angle, ratio } = p;
      const g = { A: { x: ab, y: 0 }, B: { x: 0, y: 0 }, C: { x: 0, y: bc } };
      const sides = trigSides(p);
      const [top, bottom] = TRIG_NAMES[ratio];
      const answer = trigRatioText(p, ratio);
      const caption = `Triangle ABC, right-angled at B: AB = ${cm(ab)}, BC = ${cm(bc)}, AC = ${cm(ac)}`;
      return {
        question: `In triangle ABC, ∠B = 90°, AB = ${cm(ab)}, BC = ${cm(bc)} and AC = ${cm(ac)}. What is ${ratio} ${angle}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g)),
          shapes: [
            { type: 'polygon', points: ['A', 'B', 'C'] },
            { type: 'segment', from: 'A', to: 'B', label: cm(ab) },
            { type: 'segment', from: 'B', to: 'C', label: cm(bc) },
            { type: 'segment', from: 'C', to: 'A', label: cm(ac) }
          ],
          rightAngles: [{ at: 'B', from: 'A', to: 'C' }],
          angles: [angle === 'A' ? { at: 'A', from: 'B', to: 'C', radius: 22 } : { at: 'C', from: 'A', to: 'B', radius: 22 }],
          ariaSummary: `${caption}. ∠${angle} is marked.`
        },
        explanation: `From ∠${angle}, the opposite side is ${sides.oppName} = ${sides.opp}, the adjacent side is ${sides.adjName} = ${sides.adj}, and the hypotenuse is AC = ${ac}. ${ratio} ${angle} = ${top} ÷ ${bottom} = ${rawRatio(p, ratio)}${rawRatio(p, ratio) === answer ? '' : ` = ${answer}`}.`,
        solutionSteps: [`Opposite ${angle}: ${sides.oppName} = ${sides.opp}. Adjacent: ${sides.adjName} = ${sides.adj}. Hypotenuse: AC = ${ac}.`, `${ratio} ${angle} = ${top} ÷ ${bottom}.`, `= ${answer}.`],
        method: 'sin = opposite ÷ hypotenuse, cos = adjacent ÷ hypotenuse, tan = opposite ÷ adjacent.',
        hints: [`Stand at ∠${angle}: the opposite side does not touch it.`, 'The hypotenuse is always the side facing the right angle.'],
        commonMistakes: ['Mixing up the opposite and adjacent sides.', 'Using the sides as seen from the other acute angle.']
      };
    }
  },

  {
    id: 'trig-ratio-find-side',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-ratios',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['trig-ratios-f'],
    estimatedSeconds: 55,
    params(rng) {
      const [p, q, h] = rng.pick(TRIPLES);
      const k = rng.int(1, Math.max(1, Math.floor(60 / h)));
      if (h * k > 60) return null;
      const [opp, adj] = rng.chance(0.5) ? [p, q] : [q, p];
      const ratio = rng.pick(['sin', 'cos', 'tan']);
      const [first, second] = { sin: ['opp', 'hyp'], cos: ['adj', 'hyp'], tan: ['opp', 'adj'] }[ratio];
      const [given, asked] = rng.chance(0.5) ? [first, second] : [second, first];
      return { opp, adj, hyp: h, k, ratio, given, asked };
    },
    answer: (p) => p[p.asked] * p.k,
    verify(p, value) {
      // Fix the angle from the ratio's sides, then rebuild the asked side with the trig functions.
      const theta = Math.atan2(p.opp, p.adj);
      const known = p[p.given] * p.k;
      const hyp = { hyp: known, opp: known / Math.sin(theta), adj: known / Math.cos(theta) }[p.given];
      const actual = { hyp, opp: hyp * Math.sin(theta), adj: hyp * Math.cos(theta) }[p.asked];
      return nearlyEqual(actual, value, 1e-9);
    },
    render(p) {
      const { k, ratio, given, asked } = p;
      const NAME = { opp: 'BC', adj: 'AB', hyp: 'AC' };
      const WORD = { opp: 'opposite', adj: 'adjacent', hyp: 'hypotenuse' };
      const [top, bottom] = { sin: ['opp', 'hyp'], cos: ['adj', 'hyp'], tan: ['opp', 'adj'] }[ratio];
      const ratioText = fraction(p[top], p[bottom]);
      const knownLen = p[given] * k;
      const answer = p[asked] * k;
      const g = { A: { x: p.adj * k, y: 0 }, B: { x: 0, y: 0 }, C: { x: 0, y: p.opp * k } };
      const label = (side) => (side === given ? cm(knownLen) : side === asked ? '?' : null);
      const shapes = [{ type: 'polygon', points: ['A', 'B', 'C'] }];
      for (const [side, from, to] of [['adj', 'A', 'B'], ['opp', 'B', 'C'], ['hyp', 'C', 'A']]) {
        if (label(side)) shapes.push({ type: 'segment', from, to, label: label(side) });
      }
      const caption = `Triangle ABC, right-angled at B, with ${NAME[given]} = ${cm(knownLen)}`;
      const equation = given === top ? `${ratioText} = ${knownLen} ÷ ${NAME[asked]}` : `${ratioText} = ${NAME[asked]} ÷ ${knownLen}`;
      const solve = given === top ? `${NAME[asked]} = ${knownLen} × ${fraction(p[bottom], p[top])}` : `${NAME[asked]} = ${knownLen} × ${ratioText}`;
      return {
        question: `In triangle ABC, ∠B = 90°, ${ratio} A = ${ratioText} and ${NAME[given]} = ${cm(knownLen)}. How long is ${NAME[asked]}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(g)),
          shapes,
          rightAngles: [{ at: 'B', from: 'A', to: 'C' }],
          angles: [{ at: 'A', from: 'B', to: 'C', radius: 22 }],
          ariaSummary: `${caption}; ∠A is marked and ${NAME[asked]} is labelled with a question mark.`
        },
        explanation: `From ∠A, ${NAME[top]} is the ${WORD[top]} side and ${NAME[bottom]} the ${WORD[bottom]}, so ${ratio} A = ${NAME[top]} ÷ ${NAME[bottom]}. Then ${equation}, so ${solve} = ${answer} cm.`,
        solutionSteps: [`${ratio} A = ${WORD[top]} ÷ ${WORD[bottom]} = ${NAME[top]} ÷ ${NAME[bottom]}.`, `${equation}.`, `${solve} = ${answer}.`],
        method: 'Write the ratio with the sides named from ∠A, put in the known side, and solve.',
        hints: [`${ratio} = ${WORD[top]} ÷ ${WORD[bottom]}.`, `Which of ${NAME[top]} and ${NAME[bottom]} do you know?`],
        commonMistakes: ['Multiplying where you should divide (or the reverse).', 'Naming the opposite and adjacent sides from the wrong angle.']
      };
    }
  },

  /* ============================ volume and surface ============================ */
  {
    id: 'vsa-joined-solids-surface',
    version: 1,
    topicId: 'volume-surface-area',
    conceptId: 'vsa-composite-surface',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['vsa-composite-surface-f'],
    estimatedSeconds: 90,
    formatValue: (value) => cm2(value),
    params(rng) {
      const shape = rng.pick(['cone-hemisphere', 'capsule', 'cone-cylinder', 'hemisphere-cylinder']);
      const r = rng.pick([7, 14]);
      return { shape, r, h: rng.int(4, 30), l: r + rng.int(1, 18) };
    },
    answer: (p) => exposedSurface(p),
    distractors({ shape, r, h, l }) {
      const c = SOLID_PI * r * r;
      const side = 2 * SOLID_PI * r * h;
      const cone = SOLID_PI * r * l;
      return {
        'cone-hemisphere': [
          { value: cone + 4 * c, why: 'added both circular faces at the join' },
          { value: cone + 3 * c, why: 'used the hemisphere\'s total surface (3πr²) instead of its curved surface (2πr²)' },
          { value: cone + c, why: 'used πr² for the hemisphere\'s curved surface' }
        ],
        capsule: [
          { value: side + 8 * c, why: 'added the cylinder\'s ends and each hemisphere\'s flat face' },
          { value: side + 6 * c, why: 'used each hemisphere\'s total surface (3πr²)' },
          { value: side + 2 * c, why: 'counted only one hemisphere' }
        ],
        'cone-cylinder': [
          { value: 3 * c + side + cone, why: 'added the two circular faces at the join' },
          { value: side + cone, why: 'left out the flat base' },
          { value: 2 * c + side + cone, why: 'counted one of the faces at the join' }
        ],
        'hemisphere-cylinder': [
          { value: 5 * c + side, why: 'added both circular faces at the join' },
          { value: 2 * c + side, why: 'left out the flat base' },
          { value: 4 * c + side, why: 'used the hemisphere\'s total surface (3πr²)' }
        ]
      }[shape];
    },
    verify(p, value) {
      // Total surfaces of the separate solids, minus the two faces lost at each join (true π).
      const { r, h, l } = p;
      const join = Math.PI * r * r;
      const cone = Math.PI * r * l + join;
      const hemi = 3 * join;
      const cyl = 2 * Math.PI * r * h + 2 * join;
      const exact = { 'cone-hemisphere': cone + hemi - 2 * join, capsule: cyl + 2 * hemi - 4 * join, 'cone-cylinder': cyl + cone - 2 * join, 'hemisphere-cylinder': cyl + hemi - 2 * join }[p.shape];
      return nearlyEqual(value, exact, 1e-3);
    },
    render(p) {
      const { shape, r, h, l } = p;
      const c = SOLID_PI * r * r;
      const side = 2 * SOLID_PI * r * h;
      const cone = SOLID_PI * r * l;
      const total = exposedSurface(p);
      const text = {
        'cone-hemisphere': `A toy is a cone of radius ${cm(r)} and slant height ${cm(l)} standing on a hemisphere of the same radius.`,
        capsule: `A capsule is a cylinder of radius ${cm(r)} and length ${cm(h)} with a hemisphere of the same radius on each end.`,
        'cone-cylinder': `A solid is a cylinder of radius ${cm(r)} and height ${cm(h)} with a cone of slant height ${cm(l)} on top, on the same circular face. The bottom of the cylinder is flat.`,
        'hemisphere-cylinder': `A solid is a cylinder of radius ${cm(r)} and height ${cm(h)} with a hemisphere of the same radius on top. The bottom of the cylinder is flat.`
      }[shape];
      const parts = {
        'cone-hemisphere': [[`Cone, curved: πrl = 22/7 × ${r} × ${l}`, cone], [`Hemisphere, curved: 2πr² = 2 × 22/7 × ${r}²`, 2 * c]],
        capsule: [[`Cylinder, curved: 2πrh = 2 × 22/7 × ${r} × ${h}`, side], [`Two hemispheres, curved: 2 × 2πr² = 4 × 22/7 × ${r}²`, 4 * c]],
        'cone-cylinder': [[`Cone, curved: πrl = 22/7 × ${r} × ${l}`, cone], [`Cylinder, curved: 2πrh = 2 × 22/7 × ${r} × ${h}`, side], [`Flat base: πr² = 22/7 × ${r}²`, c]],
        'hemisphere-cylinder': [[`Hemisphere, curved: 2πr² = 2 × 22/7 × ${r}²`, 2 * c], [`Cylinder, curved: 2πrh = 2 × 22/7 × ${r} × ${h}`, side], [`Flat base: πr² = 22/7 × ${r}²`, c]]
      }[shape];
      // Drawn to scale, bottom part first; the cone's vertical height comes from its slant height.
      const coneH = Math.sqrt(l * l - r * r);
      const R = { r: cm(r) };
      const figure = {
        'cone-hemisphere': {
          caption: `Cone (slant ${cm(l)}) on a hemisphere of radius ${cm(r)}`,
          ariaSummary: `A cone standing point-up on a hemisphere, dome down, both of radius ${cm(r)}; the cone's slant height is marked ${cm(l)}.`,
          parts: [{ shape: 'hemisphere', r, down: true, labels: R }, { shape: 'cone', r, h: coneH, labels: { l: cm(l) } }]
        },
        capsule: {
          caption: `Capsule: cylinder of radius ${cm(r)} and length ${cm(h)} with hemisphere ends`,
          ariaSummary: `A capsule standing upright: a cylinder of radius ${cm(r)} and length ${cm(h)} with a hemisphere on each end.`,
          parts: [{ shape: 'hemisphere', r, down: true }, { shape: 'cylinder', r, h, labels: { r: cm(r), h: cm(h) } }, { shape: 'hemisphere', r }]
        },
        'cone-cylinder': {
          caption: `Cone (slant ${cm(l)}) on a cylinder of radius ${cm(r)} and height ${cm(h)}`,
          ariaSummary: `A cylinder of radius ${cm(r)} and height ${cm(h)} with a cone on top; the cone's slant height is marked ${cm(l)}.`,
          parts: [{ shape: 'cylinder', r, h, labels: { r: cm(r), h: cm(h) } }, { shape: 'cone', r, h: coneH, labels: { l: cm(l) } }]
        },
        'hemisphere-cylinder': {
          caption: `Hemisphere on a cylinder of radius ${cm(r)} and height ${cm(h)}`,
          ariaSummary: `A cylinder of radius ${cm(r)} and height ${cm(h)} with a hemisphere of the same radius on top.`,
          parts: [{ shape: 'cylinder', r, h, labels: { r: cm(r), h: cm(h) } }, { shape: 'hemisphere', r }]
        }
      }[shape];
      return {
        question: `${text} What is its total surface area on the outside? (Use π = 22/7.)`,
        figure: { type: 'solid', ...figure },
        explanation: `Only the outside surfaces count; the circles where the parts are joined are hidden inside. ${parts.map(([label, v]) => `${label} = ${fmt(v)}`).join('. ')}. Total = ${parts.map(([, v]) => fmt(v)).join(' + ')} = ${fmt(total)} cm².`,
        solutionSteps: [...parts.map(([label, v]) => `${label} = ${fmt(v)}.`), `Total = ${fmt(total)} cm².`],
        method: 'Add only the outward-facing surfaces; leave out the faces at each join.',
        hints: ['List each surface you could touch from outside.', 'The flat circles where two parts meet are not on the outside.'],
        commonMistakes: ['Adding the full surface areas of both solids, which counts the joined faces.', 'Using a hemisphere\'s total surface (3πr²) instead of its curved surface (2πr²).']
      };
    }
  },

  {
    id: 'vsa-cubes-joined',
    version: 1,
    topicId: 'volume-surface-area',
    conceptId: 'vsa-composite-surface',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['vsa-composite-surface-f'],
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.int(2, 10);
      if (rng.chance(0.5)) return { a, dims: [rng.int(2, 6), 1, 1] };
      return { a, dims: [rng.int(2, 4), rng.int(2, 3), rng.int(1, 2)] };
    },
    answer: ({ a, dims: [p, q, h] }) => 2 * a * a * (p * q + q * h + h * p),
    verify({ a, dims: [p, q, h] }, value) {
      // Count every cube face that has no neighbouring cube against it.
      let faces = 0;
      const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < p && y < q && z < h;
      const steps = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      for (let x = 0; x < p; x++) for (let y = 0; y < q; y++) for (let z = 0; z < h; z++) for (const [dx, dy, dz] of steps) if (!inside(x + dx, y + dy, z + dz)) faces++;
      return faces * a * a === value;
    },
    render({ a, dims: [p, q, h] }) {
      const n = p * q * h;
      const [L, W, H] = [p * a, q * a, h * a];
      const total = 2 * (L * W + W * H + H * L);
      const row = q === 1 && h === 1;
      const joins = n * 6 * a * a - total;
      return {
        question: row
          ? `${n} cubes, each of edge ${cm(a)}, are joined end to end in a row. What is the total surface area of the cuboid formed?`
          : `${n} cubes, each of edge ${cm(a)}, are put together to form a cuboid ${p} cubes long, ${q} cubes wide and ${h} cube${h === 1 ? '' : 's'} high. What is the total surface area of the cuboid?`,
        explanation: `The cuboid measures ${L} × ${W} × ${H} cm. Its surface area is 2(lb + bh + hl) = 2(${L * W} + ${W * H} + ${H * L}) = ${total} cm². (The separate cubes had ${n} × 6 × ${a}² = ${n * 6 * a * a} cm²; the ${fmt(joins / (2 * a * a))} joins hide ${fmt(joins)} cm² of faces.)`,
        solutionSteps: [`Size: ${p} × ${a} = ${L}, ${q} × ${a} = ${W}, ${h} × ${a} = ${H}.`, `2(${L} × ${W} + ${W} × ${H} + ${H} × ${L}) = 2 × ${L * W + W * H + H * L} = ${total}.`],
        method: 'Find the cuboid\'s length, breadth and height, then use 2(lb + bh + hl). Faces pressed together at a join are not on the outside.',
        hints: ['Work out the outside measurements of the new cuboid.', 'Each join hides two faces, one from each cube.'],
        commonMistakes: [`Adding the cubes' surfaces: ${n} × 6 × ${a}² = ${n * 6 * a * a} cm².`]
      };
    }
  },

  {
    id: 'vsa-painted-cube',
    version: 1,
    topicId: 'volume-surface-area',
    conceptId: 'vsa-composite-surface',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['vsa-sc-painted-cube'],
    estimatedSeconds: 60,
    params(rng) {
      return { n: rng.int(3, 10), e: rng.int(1, 3), ask: rng.pick(['three', 'two', 'one', 'none', 'some']) };
    },
    answer({ n, ask }) {
      const inner = n - 2;
      return { three: 8, two: 12 * inner, one: 6 * inner * inner, none: inner ** 3, some: n ** 3 - inner ** 3 }[ask];
    },
    verify({ n, ask }, value) {
      // Count the painted faces of every small cube.
      const tally = [0, 0, 0, 0];
      const outer = (i) => (i === 0 ? 1 : 0) + (i === n - 1 ? 1 : 0);
      for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) tally[outer(x) + outer(y) + outer(z)]++;
      return value === { three: tally[3], two: tally[2], one: tally[1], none: tally[0], some: tally[1] + tally[2] + tally[3] }[ask];
    },
    render({ n, e, ask }) {
      const inner = n - 2;
      const desc = { three: 'exactly three faces painted', two: 'exactly two faces painted', one: 'exactly one face painted', none: 'no painted face', some: 'at least one face painted' }[ask];
      const reason = {
        three: 'Only the corner cubes have three painted faces, and a cube has 8 corners.',
        two: `Cubes with exactly two painted faces sit along the edges, not at the corners: ${n} − 2 = ${inner} on each of the 12 edges, so 12 × ${inner} = ${12 * inner}.`,
        one: `Cubes with exactly one painted face sit in the middle of each face: a ${inner} × ${inner} square on each of the 6 faces, so 6 × ${inner * inner} = ${6 * inner * inner}.`,
        none: `Unpainted cubes form the hidden core, a ${inner} × ${inner} × ${inner} block: ${inner ** 3}.`,
        some: `All ${n ** 3} cubes minus the unpainted ${inner} × ${inner} × ${inner} core: ${n ** 3} − ${inner ** 3} = ${n ** 3 - inner ** 3}.`
      }[ask];
      return {
        question: `A cube of edge ${cm(n * e)} is painted on all six faces and then cut into small cubes of edge ${cm(e)}. How many small cubes have ${desc}?`,
        explanation: `${n * e} ÷ ${e} = ${n}, so the big cube is ${n} small cubes along each edge (${n ** 3} in all). ${reason}`,
        solutionSteps: [`Cubes per edge: ${n * e} ÷ ${e} = ${n}.`, reason],
        method: 'Corners: 8. Edges: 12(n − 2). Faces: 6(n − 2)². Inside: (n − 2)³.',
        hints: ['First find how many small cubes lie along one edge.', 'Think about where each kind of cube sits: corners, edges, face centres or the hidden core.'],
        commonMistakes: [`Using ${n * e} (the edge in cm) for n instead of ${n}.`, 'Counting the corner cubes again among the edge cubes.']
      };
    }
  }
];

/* -------------------------- geometry builders (used above) -------------------------- */

/** Exterior angle at each vertex of a polygon whose vertices sit on a circle, from the arcs between them. */
function exteriorAngles(arcs) {
  const n = arcs.length;
  return arcs.map((a, i) => (arcs[(i - 1 + n) % n] + a) / 2);
}

/** Vertices round a circle (anticlockwise), and a point on each side extended past its vertex. */
function exteriorFigure({ arcs, start }) {
  const vertices = [];
  let bearing = start;
  for (const a of arcs) {
    vertices.push(dir(bearing, 5));
    bearing += a;
  }
  const n = vertices.length;
  const ends = vertices.map((v, i) => {
    const prev = vertices[(i - 1 + n) % n];
    const len = dist(v, prev);
    return { x: v.x + (1.8 * (v.x - prev.x)) / len, y: v.y + (1.8 * (v.y - prev.y)) / len };
  });
  return { vertices, ends };
}

/** Trapezium ABCD (AB ∥ DC, AB on the x-axis) with angles a at A and b at B, height 5. */
function trapeziumFromAngles(a, b) {
  const h = 5;
  const B = { x: 12, y: 0 };
  return { A: { x: 0, y: 0 }, B, C: dir(180 - b, h / Math.sin(b * RAD), B), D: dir(a, h / Math.sin(a * RAD)) };
}

/** Rectangle ABCD with diagonal 10 at θ to AB; O is where the diagonals cross. */
function rectangleWithDiagonalAngle(theta) {
  const w = 10 * Math.cos(theta * RAD);
  const h = 10 * Math.sin(theta * RAD);
  return { A: { x: 0, y: 0 }, B: { x: w, y: 0 }, C: { x: w, y: h }, D: { x: 0, y: h }, O: { x: w / 2, y: h / 2 } };
}

/** Sides of right triangle ABC (∠B = 90°) as seen from the asked angle. */
function trigSides({ ab, bc, ac, angle }) {
  return angle === 'A'
    ? { opp: bc, adj: ab, hyp: ac, oppName: 'BC', adjName: 'AB' }
    : { opp: ab, adj: bc, hyp: ac, oppName: 'AB', adjName: 'BC' };
}

function trigRatioText(p, name) {
  const s = trigSides(p);
  const pick = (word) => ({ opposite: s.opp, adjacent: s.adj, hypotenuse: s.hyp })[word];
  const [top, bottom] = TRIG_NAMES[name];
  return fraction(pick(top), pick(bottom));
}

/** The ratio as read straight off the side lengths, before cancelling: "9/41". */
function rawRatio(p, name) {
  const s = trigSides(p);
  const pick = (word) => ({ opposite: s.opp, adjacent: s.adj, hypotenuse: s.hyp })[word];
  const [top, bottom] = TRIG_NAMES[name];
  return `${pick(top)}/${pick(bottom)}`;
}

/** Outside surface of a combined solid with π = 22/7. */
function exposedSurface({ shape, r, h, l }) {
  const c = SOLID_PI * r * r;
  const side = 2 * SOLID_PI * r * h;
  const cone = SOLID_PI * r * l;
  return { 'cone-hemisphere': cone + 2 * c, capsule: side + 4 * c, 'cone-cylinder': cone + side + c, 'hemisphere-cylinder': 2 * c + side + c }[shape];
}

/* ================================================================================ */
/*                                    COUNTING                                      */
/* ================================================================================ */

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sup = (n) => (typeof n === 'string' ? n : String(n).split('').map((d) => SUP[d]).join(''));
const sub = (n) => (typeof n === 'string' ? n : String(n).split('').map((d) => SUB[d]).join(''));
/** ⁿCᵣ-style symbols; numbers become super/subscripts, strings are used as written. */
const nCrText = (n, r) => `${sup(n)}C${sub(r)}`;
const nPrText = (n, r) => `${sup(n)}P${sub(r)}`;
const signed = (n) => (n < 0 ? `−${-n}` : String(n));
const product = (list) => list.reduce((a, b) => a * b, 1);

/** Every arrangement (no repeats) of `len` items from `items`, as arrays. */
function arrangements(items, len) {
  if (len === 0) return [[]];
  const out = [];
  items.forEach((item, i) => {
    for (const rest of arrangements(items.filter((_, j) => j !== i), len - 1)) out.push([item, ...rest]);
  });
  return out;
}

/* ------------------------------ data sufficiency ------------------------------ */

const DS_OPTIONS = [
  'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.',
  'Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.',
  'BOTH statements TOGETHER are sufficient, but NEITHER statement alone is sufficient.',
  'EACH statement ALONE is sufficient.',
  'Statements (1) and (2) TOGETHER are still NOT sufficient.'
];
/* What each answer choice claims about (1) alone, (2) alone, and the two together. */
const DS_CLAIMS = [
  [true, false, true],
  [false, true, true],
  [false, false, true],
  [true, true, true],
  [false, false, false]
];

/** The answer choice from the three sufficiency judgements. */
function dsChoice(s1, s2, both) {
  if (s1 && s2) return DS_OPTIONS[3];
  if (s1) return DS_OPTIONS[0];
  if (s2) return DS_OPTIONS[1];
  return both ? DS_OPTIONS[2] : DS_OPTIONS[4];
}

/** Each wrong choice, named by the first judgement it gets wrong. */
function dsDistractors(answer, outcome) {
  const truth = DS_CLAIMS[DS_OPTIONS.indexOf(answer)];
  const labels = ['statement (1) alone', 'statement (2) alone', 'the two statements together'];
  return DS_OPTIONS.filter((o) => o !== answer).map((value) => {
    const claim = DS_CLAIMS[DS_OPTIONS.indexOf(value)];
    const k = [0, 1, 2].find((i) => claim[i] !== truth[i]);
    return { value, why: claim[k] ? `thought ${labels[k]} ${outcome}` : `missed that ${labels[k]} ${outcome}` };
  });
}

/* Statements for "What is the value of x?". Each knows what it says on its own. */
const DS_GRID = 40;
const dsLinear = (a, b, c) => `${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${signed(c)}`;
const dsMakers = {
  eq(rng, x0) {
    const a = rng.int(2, 9);
    const b = rng.pick([-1, 1]) * rng.int(1, 15);
    const c = a * x0 + b;
    return { text: dsLinear(a, b, c), alone: `${dsLinear(a, b, c)} gives x = ${signed(x0)}, a single value: sufficient` };
  },
  eq2(rng, x0) {
    const a = rng.int(2, 6);
    const b = rng.int(1, 9);
    const c = a * (x0 - b);
    return { text: `${a}(x − ${b}) = ${signed(c)}`, alone: `${a}(x − ${b}) = ${signed(c)} gives x = ${signed(x0)}, a single value: sufficient` };
  },
  cube: (rng, x0) => ({ text: `x³ = ${signed(x0 ** 3)}`, alone: `x³ = ${signed(x0 ** 3)} has only one real root, x = ${signed(x0)}: sufficient` }),
  sq: (rng, k) => ({ text: `x² = ${k * k}`, alone: `x² = ${k * k} gives x = ${k} or x = −${k}: two values, not sufficient` }),
  gt: (rng, p) => ({ text: `x > ${signed(p)}`, alone: `x > ${signed(p)} allows ${signed(p + 1)}, ${signed(p + 2)}, ${signed(p + 3)} and more: not sufficient` }),
  lt: (rng, q) => ({ text: `x < ${signed(q)}`, alone: `x < ${signed(q)} allows ${signed(q - 1)}, ${signed(q - 2)} and more: not sufficient` }),
  mult: (rng, m) => ({ text: `x is a multiple of ${m}`, alone: `x could be ${m}, ${2 * m}, ${3 * m} and so on: not sufficient` }),
  sum: (rng, s) => ({ text: `x + y = ${signed(s)}`, alone: `x + y = ${signed(s)} is one equation in two unknowns (x = 0 with y = ${signed(s)}, x = 1 with y = ${signed(s - 1)}, …): not sufficient` }),
  diff: (rng, d) => ({ text: `x − y = ${signed(d)}`, alone: `x − y = ${signed(d)} is one equation in two unknowns: not sufficient` }),
  scaled: (rng, s, m) => ({ text: `${m}x + ${m}y = ${signed(m * s)}`, alone: `${m}x + ${m}y = ${signed(m * s)} is one equation in two unknowns: not sufficient` }),
  sign: (rng, positive) => ({ text: `x is ${positive ? 'positive' : 'negative'}`, alone: `"x is ${positive ? 'positive' : 'negative'}" allows many values: not sufficient` })
};

/** Rebuild a statement's condition from its printed text alone (for the independent check). */
function dsPredicateFromText(text) {
  const num = (s) => Number(s.replace('−', '-'));
  let m;
  if ((m = text.match(/^(\d+)x ([+−]) (\d+) = (−?\d+)$/))) {
    const [a, b, c] = [Number(m[1]), (m[2] === '−' ? -1 : 1) * Number(m[3]), num(m[4])];
    return (x) => a * x + b === c;
  }
  if ((m = text.match(/^(\d+)\(x − (\d+)\) = (−?\d+)$/))) return (x) => Number(m[1]) * (x - Number(m[2])) === num(m[3]);
  if ((m = text.match(/^x³ = (−?\d+)$/))) return (x) => x ** 3 === num(m[1]);
  if ((m = text.match(/^x² = (\d+)$/))) return (x) => x * x === Number(m[1]);
  if ((m = text.match(/^x > (−?\d+)$/))) return (x) => x > num(m[1]);
  if ((m = text.match(/^x < (−?\d+)$/))) return (x) => x < num(m[1]);
  if ((m = text.match(/^x is a multiple of (\d+)$/))) return (x) => x % Number(m[1]) === 0;
  if ((m = text.match(/^x \+ y = (−?\d+)$/))) return (x, y) => x + y === num(m[1]);
  if ((m = text.match(/^x − y = (−?\d+)$/))) return (x, y) => x - y === num(m[1]);
  if ((m = text.match(/^(\d+)x \+ (\d+)y = (−?\d+)$/))) return (x, y) => Number(m[1]) * x + Number(m[2]) * y === num(m[3]);
  if (text === 'x is positive') return (x) => x > 0;
  if (text === 'x is negative') return (x) => x < 0;
  return null;
}

/** How many different x values the conditions leave, over whole-number x and y from −40 to 40. */
function dsCountX(preds) {
  const xs = new Set();
  for (let x = -DS_GRID; x <= DS_GRID; x++) {
    for (let y = -DS_GRID; y <= DS_GRID; y++) {
      if (preds.every((pred) => pred(x, y))) {
        xs.add(x);
        break;
      }
    }
  }
  return xs.size;
}

/** Two statements built to give the target answer choice, and what they say together. */
function dsValueScenario(rng, target) {
  const x0 = rng.pick([-1, 1]) * rng.int(1, 12);
  const k = rng.int(2, 12);
  const sufficient = (kind) => dsMakers[kind || rng.pick(['eq', 'eq2', 'cube'])](rng, x0);
  const insufficient = () => {
    const kind = rng.pick(['sq', 'gt', 'mult', 'sum']);
    if (kind === 'sq') return dsMakers.sq(rng, k);
    if (kind === 'gt') return dsMakers.gt(rng, rng.int(-10, 10));
    if (kind === 'mult') return dsMakers.mult(rng, rng.int(2, 9));
    return dsMakers.sum(rng, rng.int(-15, 20));
  };
  const order = (a, b) => (rng.chance(0.5) ? [a, b] : [b, a]);
  if (target === 0) return { pair: [sufficient(), insufficient()], together: null };
  if (target === 1) return { pair: [insufficient(), sufficient()], together: null };
  if (target === 3) {
    const [f, g] = rng.shuffle(['eq', 'eq2', 'cube']).slice(0, 2);
    return { pair: [sufficient(f), sufficient(g)], together: null };
  }
  if (target === 2) {
    const form = rng.pick(['sum-diff', 'sq-sign', 'sq-gt']);
    if (form === 'sum-diff') {
      const y0 = rng.pick([-1, 1]) * rng.int(1, 12);
      return { pair: order(dsMakers.sum(rng, x0 + y0), dsMakers.diff(rng, x0 - y0)), together: `adding the two equations gives 2x = ${signed(2 * x0)}, so x = ${signed(x0)}: sufficient` };
    }
    if (form === 'sq-sign') {
      const positive = rng.chance(0.5);
      const root = positive ? String(k) : `−${k}`;
      return { pair: order(dsMakers.sq(rng, k), dsMakers.sign(rng, positive)), together: `of ${k} and −${k}, only ${root} is ${positive ? 'positive' : 'negative'}, so x = ${root}: sufficient` };
    }
    const p = rng.int(-k, k - 1);
    return { pair: order(dsMakers.sq(rng, k), dsMakers.gt(rng, p)), together: `of ${k} and −${k}, only ${k} is greater than ${signed(p)}, so x = ${k}: sufficient` };
  }
  const form = rng.pick(['scaled', 'range', 'sq-mult', 'sum-gt']);
  if (form === 'scaled') {
    const s = rng.int(-15, 20);
    const m = rng.int(2, 5);
    return { pair: order(dsMakers.sum(rng, s), dsMakers.scaled(rng, s, m)), together: `the second equation is just the first multiplied by ${m}, so together they still leave many pairs: not sufficient` };
  }
  if (form === 'range') {
    const p = rng.int(-10, 10);
    const q = p + rng.int(3, 9);
    return { pair: [dsMakers.gt(rng, p), dsMakers.lt(rng, q)], together: `${signed(p)} < x < ${signed(q)} still allows ${signed(p + 1)} and ${signed(p + 2)}: not sufficient` };
  }
  if (form === 'sq-mult') {
    const m = rng.pick([2, 3]);
    const kk = m * rng.int(1, 4);
    return { pair: order(dsMakers.sq(rng, kk), dsMakers.mult(rng, m)), together: `both ${kk} and −${kk} are multiples of ${m}, so x is still not fixed: not sufficient` };
  }
  const p = rng.int(-10, 10);
  const s = rng.int(-15, 20);
  return { pair: order(dsMakers.sum(rng, s), dsMakers.gt(rng, p)), together: `x > ${signed(p)} together with x + y = ${signed(s)} still allows many pairs: not sufficient` };
}

/* Divisibility statements for "Is n divisible by m?" */
const dsStatement = (s) =>
  s.kind === 'D'
    ? { ...s, text: `n is divisible by ${s.a}`, pred: (n) => n % s.a === 0 }
    : { ...s, text: `n leaves a remainder of ${s.r} when divided by ${s.k}`, pred: (n) => n % s.k === s.r };

/** Does the statement settle "does m divide n?" Worked out from factors, not by trying numbers. */
function dsSettles(s, m) {
  if (s.kind === 'D') return s.a % m === 0;
  // n = r + tk: always divisible when m divides both k and r; never when gcd(k, m) does not divide r.
  return (s.k % m === 0 && s.r % m === 0) || s.r % gcd(s.k, m) !== 0;
}

/** The Yes/No answers that occur among n = 1 … limit meeting the conditions, with a first example of each. */
function dsAnswersFor(preds, m, limit) {
  const seen = new Set();
  const examples = {};
  for (let n = 1; n <= limit; n++) {
    if (!preds.every((pred) => pred(n))) continue;
    const yes = n % m === 0;
    seen.add(yes);
    if (examples[yes] === undefined) examples[yes] = n;
  }
  return { seen, examples };
}

function dsDivisibleAnswer({ m, pair }) {
  const [one, two] = pair;
  const s1 = dsSettles(one, m);
  const s2 = dsSettles(two, m);
  const both = s1 || s2 || (one.kind === 'D' && two.kind === 'D' && lcm(one.a, two.a) % m === 0);
  return dsChoice(s1, s2, both);
}

const dsLimit = (m, pair) => 4 * pair.reduce((acc, s) => lcm(acc, s.kind === 'D' ? s.a : s.k), m);

/** A number as printed in a question: a true minus sign, not a hyphen. */
const minus = (value) => String(value).replace('-', '−');

export const countingPart = [
  /* ============================== combinations ============================== */
  {
    id: 'comb-symmetry-find',
    version: 1,
    topicId: 'combinations',
    conceptId: 'comb-properties',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['comb-symmetry'],
    estimatedSeconds: 40,
    params(rng) {
      const mode = rng.pick(['n', 'r', 'value']);
      if (mode === 'r') {
        const N = rng.int(8, 20);
        const d = rng.int(1, 6);
        if ((N - d) % 2 || N - d < 2) return null;
        return { mode, N, d };
      }
      const a = rng.int(1, mode === 'value' ? 6 : 9);
      const b = rng.int(a + 1, mode === 'value' ? 10 : 14);
      return { mode, a, b, c: rng.pick([1, 2]) };
    },
    answer({ mode, a, b, c, N, d }) {
      if (mode === 'r') return (N - d) / 2;
      return mode === 'n' ? a + b : nCr(a + b, c);
    },
    verify({ mode, a, b, c, N, d }, value) {
      if (mode === 'r') {
        // Try every r and keep those where the two coefficients match.
        const hits = [];
        for (let r = 0; r + d <= N; r++) if (nCr(N, r) === nCr(N, r + d)) hits.push(r);
        return hits.length === 1 && hits[0] === value;
      }
      // Try every n from b upward until the two coefficients match.
      let n = b;
      while (n < 80 && nCr(n, a) !== nCr(n, b)) n++;
      return mode === 'n' ? n === value : (c === 1 ? n : (n * (n - 1)) / 2) === value;
    },
    render({ mode, a, b, c, N, d }) {
      if (mode === 'r') {
        const r = (N - d) / 2;
        return {
          question: `If ${nCrText(N, 'ᵣ')} = ${nCrText(N, `ᵣ₊${sub(d)}`)}, what is r?`,
          explanation: `Choosing r items to take is the same as choosing the rest to leave, so ⁿCᵣ = ⁿCₙ₋ᵣ. Two different lower numbers give the same value only when they add up to n: r + (r + ${d}) = ${N}, so 2r = ${N - d} and r = ${r}.`,
          solutionSteps: [`r + (r + ${d}) = ${N}.`, `2r = ${N - d}.`, `r = ${r}.`],
          method: 'ⁿCᵣ = ⁿCₙ₋ᵣ: two different lower numbers give the same value only when they add up to n.',
          hints: ['Choosing r things to keep is the same as choosing n − r to leave out.', `The two lower numbers, r and r + ${d}, must add up to ${N}.`],
          commonMistakes: [`Setting r = r + ${d}, which has no solution.`, `Forgetting to halve: ${N - d}.`]
        };
      }
      const n = a + b;
      const value = c === 1 ? n : (n * (n - 1)) / 2;
      const valueStep = `${nCrText(n, c)} = ${c === 1 ? n : `${n} × ${n - 1} ÷ 2 = ${value}`}`;
      return {
        question: mode === 'n' ? `If ${nCrText('ⁿ', a)} = ${nCrText('ⁿ', b)}, what is n?` : `If ${nCrText('ⁿ', a)} = ${nCrText('ⁿ', b)}, what is ${nCrText('ⁿ', c)}?`,
        explanation: `Two different lower numbers give the same ⁿCᵣ only when they add up to n (choosing ${a} to take is the same as choosing ${b} to leave). So n = ${a} + ${b} = ${n}.${mode === 'value' ? ` Then ${valueStep}.` : ''}`,
        solutionSteps: [`n = ${a} + ${b} = ${n}.`, ...(mode === 'value' ? [`${valueStep}.`] : [])],
        method: 'ⁿCₐ = ⁿC_b with a ≠ b means a + b = n.',
        hints: ['ⁿCᵣ = ⁿCₙ₋ᵣ.', `So ${b} must be n − ${a}.`],
        commonMistakes: [`Subtracting: n = ${b} − ${a} = ${b - a}.`]
      };
    }
  },

  {
    id: 'comb-npr-ncr-link',
    version: 1,
    topicId: 'combinations',
    conceptId: 'comb-properties',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['comb-perm-link'],
    estimatedSeconds: 45,
    params(rng) {
      const n = rng.int(5, 12);
      return { n, r: rng.int(2, Math.min(5, n - 1)), mode: rng.pick(['r', 'P', 'C']) };
    },
    answer({ n, r, mode }) {
      const P = nPr(n, r);
      const Cv = nCr(n, r);
      if (mode === 'P') return Cv * factorial(r);
      if (mode === 'C') return P / factorial(r);
      // r! = P ÷ C: count up the factorials until one matches.
      let k = 1;
      while (factorial(k) < P / Cv) k++;
      return k;
    },
    verify({ n, r, mode }, value) {
      const P = nPr(n, r);
      const Cv = nCr(n, r);
      if (mode === 'r') {
        // Every (n, r) pair up to 30 with these two values must have this r.
        const rs = new Set();
        for (let nn = 1; nn <= 30; nn++) for (let rr = 0; rr <= nn; rr++) if (nPr(nn, rr) === P && nCr(nn, rr) === Cv) rs.add(rr);
        return rs.size === 1 && rs.has(value);
      }
      // Recover n by search from the value given, then compute the other from scratch.
      let nn = r;
      while (nn < 60 && (mode === 'P' ? nCr(nn, r) !== Cv : nPr(nn, r) !== P)) nn++;
      let count = 1;
      for (let i = 0; i < r; i++) count *= nn - i;
      return mode === 'P' ? count === value : count / factorial(r) === value;
    },
    render({ n, r, mode }) {
      const P = nPr(n, r);
      const Cv = nCr(n, r);
      const f = factorial(r);
      const facText = `${r}! = ${Array.from({ length: r }, (_, i) => r - i).join(' × ')} = ${f}`;
      return {
        question: {
          r: `For some whole number n, ${nPrText('ⁿ', 'ᵣ')} = ${P} and ${nCrText('ⁿ', 'ᵣ')} = ${Cv}. What is r?`,
          P: `For some whole number n, ${nCrText('ⁿ', r)} = ${Cv}. What is ${nPrText('ⁿ', r)}?`,
          C: `For some whole number n, ${nPrText('ⁿ', r)} = ${P}. What is ${nCrText('ⁿ', r)}?`
        }[mode],
        explanation: {
          r: `Arranging r items is choosing them and then putting them in order, so ⁿPᵣ = ⁿCᵣ × r!. So r! = ${P} ÷ ${Cv} = ${f}, and ${facText}, so r = ${r}.`,
          P: `ⁿPᵣ = ⁿCᵣ × r!: each choice of ${r} items can be put in order in ${r}! ways. ${facText}, so ${nPrText('ⁿ', r)} = ${Cv} × ${f} = ${P}.`,
          C: `ⁿPᵣ = ⁿCᵣ × r!, so ⁿCᵣ = ⁿPᵣ ÷ r!. ${facText}, so ${nCrText('ⁿ', r)} = ${P} ÷ ${f} = ${Cv}.`
        }[mode],
        solutionSteps: { r: [`r! = ${P} ÷ ${Cv} = ${f}.`, `${f} = ${r}!, so r = ${r}.`], P: [`${facText}.`, `${Cv} × ${f} = ${P}.`], C: [`${facText}.`, `${P} ÷ ${f} = ${Cv}.`] }[mode],
        method: 'ⁿPᵣ = ⁿCᵣ × r!.',
        hints: ['A permutation is a combination followed by putting the chosen items in order.', 'You do not need to find n.'],
        commonMistakes: mode === 'C' ? ['Multiplying by r! instead of dividing.'] : mode === 'P' ? ['Dividing by r! instead of multiplying.'] : [`Giving ${P} ÷ ${Cv} = ${f} as r, instead of finding which factorial it is.`]
      };
    }
  },

  /* ============================ counting principle ============================ */
  {
    id: 'cp-addition-either-or',
    version: 1,
    topicId: 'counting-principle',
    conceptId: 'cp-addition',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['cp-add-f'],
    estimatedSeconds: 35,
    params(rng) {
      const scene = rng.pick(['menu', 'travel', 'books']);
      const groups = Array.from({ length: scene === 'books' ? 3 : 2 }, () => rng.int(2, 9));
      return { scene, groups, next: scene !== 'books' && rng.chance(0.5) ? rng.int(2, 6) : 0 };
    },
    answer: ({ groups, next }) => sum(groups) * (next || 1),
    verify({ groups, next }, value) {
      // Name every first-stage option, pair each with every second-stage option, and count.
      const firsts = groups.flatMap((size, g) => Array.from({ length: size }, (_, i) => `${g}-${i}`));
      const seconds = next ? Array.from({ length: next }, (_, i) => i) : ['-'];
      const all = new Set();
      for (const f of firsts) for (const s of seconds) all.add(`${f}/${s}`);
      return all.size === value;
    },
    render({ scene, groups, next }) {
      const total = sum(groups);
      const answer = total * (next || 1);
      return {
        question: {
          menu: `A café's set lunch starts with one starter: either one of ${groups[0]} soups or one of ${groups[1]} salads, never both.${next ? ` It is followed by one of ${next} main courses.` : ''} How many different ${next ? 'set lunches' : 'choices of starter'} are possible?`,
          travel: `To travel from Town P to Town Q you can take one of ${groups[0]} buses or one of ${groups[1]} trains.${next ? ` From Q to Town R there are ${next} ferries.` : ''} In how many ways can you travel from P to ${next ? 'R' : 'Q'}?`,
          books: `A student may borrow exactly one item: one of ${groups[0]} novels, one of ${groups[1]} comics or one of ${groups[2]} magazines. How many different choices does the student have?`
        }[scene],
        explanation: `The ${scene === 'travel' ? 'ways of making the first trip' : 'options'} are "either-or": they never happen together, so add them: ${groups.join(' + ')} = ${total}.${next ? ` Each is then followed by one of ${next} choices, so multiply: ${total} × ${next} = ${answer}.` : ''}`,
        solutionSteps: [`Either-or choices: ${groups.join(' + ')} = ${total}.`, ...(next ? [`Then the next stage: ${total} × ${next} = ${answer}.`] : [])],
        method: 'Add for "either … or" choices that cannot happen together; multiply for stages done one after another.',
        hints: ['Can both kinds be chosen at once? If not, add.', ...(next ? ['The second stage comes after the first: multiply.'] : [])],
        commonMistakes: [`Multiplying the either-or counts: ${product(groups) * (next || 1)}.`]
      };
    }
  },

  {
    id: 'cp-addition-number-lengths',
    version: 1,
    topicId: 'counting-principle',
    conceptId: 'cp-addition',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cp-add-f', 'cp-mult-f'],
    estimatedSeconds: 55,
    formatValue: (value) => fmt(value),
    params(rng) {
      const n = rng.int(3, 6);
      return { digits: rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, n).sort((a, b) => a - b), lengths: rng.pick([[1, 2], [2, 3], [1, 2, 3], [1, 3]]) };
    },
    answer: ({ digits, lengths }) => sum(lengths.map((len) => nPr(digits.length, len))),
    distractors: ({ digits, lengths }) => {
      const n = digits.length;
      return [
        { value: product(lengths.map((len) => nPr(n, len))), why: 'multiplied the cases instead of adding them' },
        { value: nPr(n, Math.max(...lengths)), why: 'counted only the longest numbers' },
        { value: sum(lengths.map((len) => n ** len)), why: 'allowed digits to repeat' },
        { value: sum(lengths.map((len) => nCr(n, len))), why: 'chose the digits without arranging them' }
      ];
    },
    verify: ({ digits, lengths }, value) => sum(lengths.map((len) => arrangements(digits, len).length)) === value,
    render({ digits, lengths }) {
      const n = digits.length;
      const lenText = lengths.length === 2 ? `${lengths[0]} or ${lengths[1]}` : '1, 2 or 3';
      const cases = lengths.map((len) => ({ len, count: nPr(n, len), work: Array.from({ length: len }, (_, i) => n - i).join(' × ') }));
      const total = sum(cases.map((c) => c.count));
      return {
        question: `How many numbers with ${lenText} digits can be made from the digits ${listText(digits.map(String))}, if no digit is repeated within a number?`,
        explanation: `A number has exactly one length, so the cases never overlap: count each case and add. ${cases.map((c) => `${c.len}-digit: ${c.len === 1 ? c.count : `${c.work} = ${c.count}`}`).join('; ')}. Total = ${cases.map((c) => c.count).join(' + ')} = ${total}.`,
        solutionSteps: [...cases.map((c) => `${c.len}-digit numbers: ${c.len === 1 ? c.count : `${c.work} = ${c.count}`}.`), `Add the cases: ${total}.`],
        method: 'Split into cases that cannot happen together (here, by length), count each with the multiplication principle, then add.',
        hints: ['A number cannot have two different lengths, so the cases are separate.', 'Within one case, fill the places one at a time, with one digit fewer each time.'],
        commonMistakes: ['Multiplying the counts of the separate cases.', 'Allowing a digit to be used twice.']
      };
    }
  },

  /* ============================== permutations ============================== */
  {
    id: 'perm-fpc-outfits',
    version: 1,
    topicId: 'permutations',
    conceptId: 'perm-counting',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['perm-fpc'],
    estimatedSeconds: 40,
    formatValue: (value) => fmt(value),
    params(rng) {
      return { scene: rng.pick(['outfit', 'meal']), counts: [rng.int(2, 8), rng.int(2, 6), rng.int(2, 5)], extra: rng.chance(0.5) ? rng.int(2, 4) : 0 };
    },
    answer: ({ counts, extra }) => product(counts) * (extra ? extra + 1 : 1),
    distractors: ({ counts, extra }) => {
      const all = product(counts);
      if (extra) {
        return [
          { value: sum(counts) + extra, why: 'added the choices instead of multiplying' },
          { value: all * extra, why: 'forgot that taking no extra item is also a choice' },
          { value: all, why: 'left out the optional stage' },
          { value: all + extra, why: 'added the optional choices instead of multiplying' }
        ];
      }
      return [
        { value: sum(counts), why: 'added the choices instead of multiplying' },
        { value: counts[0] * counts[1], why: 'left out the third stage' },
        { value: counts[0] * counts[2], why: 'left out the second stage' },
        { value: counts[1] * counts[2], why: 'left out the first stage' },
        { value: counts[0] * counts[1] + counts[2], why: 'multiplied the first two stages but added the third' },
        { value: counts[0] + counts[1] * counts[2], why: 'added the first stage instead of multiplying' }
      ];
    },
    verify({ counts, extra }, value) {
      let count = 0;
      const extras = extra ? extra + 1 : 1; // includes "none"
      for (let a = 0; a < counts[0]; a++) for (let b = 0; b < counts[1]; b++) for (let c = 0; c < counts[2]; c++) for (let e = 0; e < extras; e++) count++;
      return count === value;
    },
    render({ scene, counts, extra }) {
      const [x, y, z] = counts;
      const answer = x * y * z * (extra ? extra + 1 : 1);
      const item = scene === 'outfit' ? 'cap' : 'drink';
      const question =
        scene === 'outfit'
          ? `Ravi has ${x} shirts, ${y} pairs of trousers and ${z} pairs of shoes. An outfit is one shirt, one pair of trousers and one pair of shoes.${extra ? ` He may also wear one of his ${extra} caps, or no cap at all.` : ''} How many different outfits can he make?`
          : `A restaurant offers ${x} starters, ${y} main courses and ${z} desserts. A meal is one starter, one main course and one dessert.${extra ? ` A diner may also add one of ${extra} drinks, or no drink at all.` : ''} How many different meals are possible?`;
      return {
        question,
        explanation: `Each choice is independent of the others, so multiply: ${x} × ${y} × ${z} = ${x * y * z}.${extra ? ` The ${item} has ${extra} + 1 = ${extra + 1} choices, counting "no ${item}": ${x * y * z} × ${extra + 1} = ${answer}.` : ''}`,
        solutionSteps: [`${x} × ${y} × ${z} = ${x * y * z}.`, ...(extra ? [`${cap(item)}: ${extra} + 1 = ${extra + 1} choices.`, `${x * y * z} × ${extra + 1} = ${answer}.`] : [])],
        method: 'Fundamental counting principle: multiply the number of choices at each independent stage.',
        hints: [scene === 'outfit' ? 'Every shirt can go with every pair of trousers, and so on.' : 'Every starter can go with every main course, and so on.', ...(extra ? [`"No ${item}" is one more choice.`] : [])],
        commonMistakes: ['Adding the numbers of choices instead of multiplying.', ...(extra ? [`Forgetting the choice of no ${item}.`] : [])]
      };
    }
  },

  {
    id: 'perm-fpc-codes',
    version: 1,
    topicId: 'permutations',
    conceptId: 'perm-counting',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['perm-fpc'],
    estimatedSeconds: 50,
    params(rng) {
      return { m: rng.int(2, 6), d: rng.int(2, 3), rule: rng.pick(['repeat', 'distinct', 'odd-last', 'nonzero-first']) };
    },
    answer: ({ m, d, rule }) => m * product(codePlaces(d, rule)),
    verify({ m, d, rule }, value) {
      // Write out every digit string and keep those that obey the rule.
      let ok = 0;
      for (let v = 0; v < 10 ** d; v++) {
        const s = String(v).padStart(d, '0');
        if (rule === 'distinct' && new Set(s).size !== d) continue;
        if (rule === 'odd-last' && Number(s[d - 1]) % 2 === 0) continue;
        if (rule === 'nonzero-first' && s[0] === '0') continue;
        ok++;
      }
      return ok * m === value;
    },
    render({ m, d, rule }) {
      const letters = 'ABCDEF'.slice(0, m).split('');
      const ruleText = { repeat: 'Digits may repeat.', distinct: 'No digit may be used twice.', 'odd-last': 'Digits may repeat, but the last digit must be odd.', 'nonzero-first': 'Digits may repeat, but the first digit cannot be 0.' }[rule];
      const places = codePlaces(d, rule);
      const digitsCount = product(places);
      const answer = m * digitsCount;
      return {
        question: `A locker code is one letter from ${listText(letters)}, followed by ${d} digits (0–9). ${ruleText} How many different codes are possible?`,
        explanation: `Fill each place in turn and multiply: the letter has ${m} choices and the digit places have ${places.join(', ')}. Total = ${m} × ${places.join(' × ')} = ${fmt(answer)}.`,
        solutionSteps: [`Letter: ${m} choices.`, `Digits: ${places.join(' × ')} = ${fmt(digitsCount)}.`, `${m} × ${fmt(digitsCount)} = ${fmt(answer)}.`],
        method: 'Count the choices for each place (applying any rule to that place), then multiply.',
        hints: ['Treat the code as a row of places to fill.', { repeat: 'Every digit place has all 10 digits available.', distinct: 'Each digit used leaves one fewer for the next place.', 'odd-last': 'The last place can only be 1, 3, 5, 7 or 9.', 'nonzero-first': 'The first digit place has only 9 choices.' }[rule]],
        commonMistakes: [rule === 'repeat' ? `Not allowing repeats: ${m} × ${nPr(10, d)} = ${fmt(m * nPr(10, d))}.` : `Ignoring the rule: ${m} × ${10 ** d} = ${fmt(m * 10 ** d)}.`, 'Adding the choices instead of multiplying.']
      };
    }
  },

  /* ============================ data sufficiency ============================ */
  {
    id: 'dsq-options-value-x',
    version: 1,
    topicId: 'data-sufficiency',
    conceptId: 'dsq-options',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dsq-options-f'],
    formatValue: (value) => value,
    optionOrder: DS_OPTIONS,
    optionCount: 5,
    estimatedSeconds: 60,
    params(rng) {
      const target = rng.int(0, 4);
      const { pair, together } = dsValueScenario(rng, target);
      const texts = pair.map((s) => s.text);
      // Data-sufficiency statements never contradict each other: some x must fit both.
      const preds = texts.map(dsPredicateFromText);
      if (preds.some((f) => !f) || dsCountX(preds) < 1) return null;
      return { target, texts, alone: pair.map((s) => s.alone), together };
    },
    answer: ({ target }) => DS_OPTIONS[target],
    distractors: ({ target }) => dsDistractors(DS_OPTIONS[target], 'fixes x'),
    // Re-read each statement from its printed text and count the values of x it leaves on a grid.
    verify({ texts }, value) {
      const preds = texts.map(dsPredicateFromText);
      if (preds.some((f) => !f)) return false;
      return dsChoice(dsCountX([preds[0]]) === 1, dsCountX([preds[1]]) === 1, dsCountX(preds) === 1) === value;
    },
    render({ target, texts, alone, together }) {
      const answer = DS_OPTIONS[target];
      const lines = [`(1) alone: ${alone[0]}.`, `(2) alone: ${alone[1]}.`, ...(target === 2 || target === 4 ? [`Together: ${together}.`] : [])];
      return {
        question: `What is the value of x? (1) ${texts[0]}. (2) ${texts[1]}.`,
        explanation: `${lines.join(' ')} So the answer is "${answer}"`,
        solutionSteps: [...lines, `Answer: ${answer}`],
        method: 'Test (1) alone, then (2) alone; combine them only if neither works alone. A statement is sufficient only if it leaves exactly one value.',
        hints: ['Cover statement (2) and decide whether (1) alone gives exactly one value of x.', 'Then cover (1) and do the same for (2).'],
        commonMistakes: ['Using information from one statement while judging the other.', 'Treating an equation with two possible roots as sufficient.']
      };
    }
  },

  {
    id: 'dsq-strategy-divisible',
    version: 1,
    topicId: 'data-sufficiency',
    conceptId: 'dsq-strategy',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['dsq-strategy-f', 'dsq-sc-definite-no'],
    formatValue: (value) => value,
    optionOrder: DS_OPTIONS,
    optionCount: 5,
    estimatedSeconds: 70,
    params(rng) {
      const target = rng.int(0, 4);
      const m = rng.pick(target === 2 ? [6, 10, 12, 15, 18, 20] : [2, 3, 4, 5, 6, 8, 9, 10, 12]);
      // A statement that settles the question: always Yes, or always No.
      const settles = () => {
        const j = rng.int(1, 4);
        const form = j === 1 ? 'no' : rng.pick(['div', 'no', 'yes']);
        if (form === 'div') return { kind: 'D', a: m * j };
        if (form === 'yes') return { kind: 'R', k: m * j, r: m * rng.int(1, j - 1) };
        const r = rng.int(1, m * j - 1);
        return r % m ? { kind: 'R', k: m * j, r } : null;
      };
      // A statement that allows both answers.
      const unsettled = () => {
        if (rng.chance(0.6)) {
          const b = rng.int(2, 30);
          return b % m ? { kind: 'D', a: b } : null;
        }
        const k = rng.int(3, 20);
        const r = rng.int(1, k - 1);
        return k % m && r % gcd(k, m) === 0 ? { kind: 'R', k, r } : null;
      };
      for (let i = 0; i < 40; i++) {
        let pair;
        if (target === 0) pair = [settles(), unsettled()];
        else if (target === 1) pair = [unsettled(), settles()];
        else if (target === 3) pair = [settles(), settles()];
        else {
          const a = rng.int(2, 30);
          const b = rng.int(2, 30);
          if (a === b || a % m === 0 || b % m === 0 || (lcm(a, b) % m === 0) !== (target === 2)) continue;
          pair = [{ kind: 'D', a }, { kind: 'D', a: b }];
        }
        if (pair.some((s) => !s) || JSON.stringify(pair[0]) === JSON.stringify(pair[1])) continue;
        // Data-sufficiency statements never contradict each other: some n must fit both.
        const preds = pair.map((s) => dsStatement(s).pred);
        const limit = dsLimit(m, pair);
        let common = false;
        for (let n = 1; n <= limit && !common; n++) common = preds.every((pred) => pred(n));
        if (!common) continue;
        return { m, pair };
      }
      return null;
    },
    answer: (p) => dsDivisibleAnswer(p),
    distractors: (p) => dsDistractors(dsDivisibleAnswer(p), 'settles the question'),
    // By trying numbers: does every n that fits give the same Yes/No answer?
    verify({ m, pair }, value) {
      const stmts = pair.map(dsStatement);
      const limit = dsLimit(m, pair);
      const settled = (preds) => dsAnswersFor(preds, m, limit).seen.size === 1;
      return dsChoice(settled([stmts[0].pred]), settled([stmts[1].pred]), settled(stmts.map((s) => s.pred))) === value;
    },
    render({ m, pair }) {
      const stmts = pair.map(dsStatement);
      const answer = dsDivisibleAnswer({ m, pair });
      const limit = dsLimit(m, pair);
      const describe = (preds, label) => {
        const { seen, examples } = dsAnswersFor(preds, m, limit);
        if (seen.size === 2) return `${label}: n = ${examples[false]} gives No but n = ${examples[true]} gives Yes, so not sufficient.`;
        return seen.has(true)
          ? `${label}: every such n is divisible by ${m} (for example ${examples[true]}), so the answer is always Yes: sufficient.`
          : `${label}: no such n is divisible by ${m} (for example ${examples[false]}), so the answer is always No. A definite No still answers the question: sufficient.`;
      };
      const lines = [describe([stmts[0].pred], '(1) alone'), describe([stmts[1].pred], '(2) alone')];
      if (answer === DS_OPTIONS[2] || answer === DS_OPTIONS[4]) {
        lines.push(describe(stmts.map((s) => s.pred), `Together (n must then be a multiple of ${lcm(stmts[0].a, stmts[1].a)})`));
      }
      return {
        question: `${m === 2 ? 'Is n even?' : `Is n divisible by ${m}?`} (n is a positive integer.) (1) ${stmts[0].text}. (2) ${stmts[1].text}.`,
        explanation: `${lines.join(' ')} So the answer is "${answer}"`,
        solutionSteps: [...lines, `Answer: ${answer}`],
        method: 'Judge each statement completely on its own first. A statement is sufficient if it always gives the same answer, Yes or No.',
        hints: ['Cover statement (2), then try a few values of n allowed by statement (1).', 'If one allowed n gives Yes and another gives No, that statement is not sufficient.'],
        commonMistakes: ['Letting what you learned from one statement colour your judgement of the other.', 'Thinking a statement that always gives "No" is not sufficient.']
      };
    }
  }
];

/** Choices for each digit place of a locker code under its rule. */
function codePlaces(d, rule) {
  if (rule === 'repeat') return Array(d).fill(10);
  if (rule === 'distinct') return Array.from({ length: d }, (_, i) => 10 - i);
  if (rule === 'odd-last') return [...Array(d - 1).fill(10), 5];
  return [9, ...Array(d - 1).fill(10)];
}


/* ================================================================================ */
/*                              DATA INTERPRETATION                                 */
/* ================================================================================ */

const DI_COLORS = ['data', 'algebra', 'geometry'];
const DI_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const DI_STORES = ['Store A', 'Store B', 'Store C'];
const DI_COMPANIES = ['Company X', 'Company Y'];
const DI_BUDGET = ['Rent', 'Food', 'Transport', 'Savings', 'Other'];

function diChart(type, caption, unit, categories, series) {
  const summary = series.map((s) => `${s.label}: ${categories.map((c, i) => `${c} ${fmt(s.data[i])}`).join(', ')}`).join('. ');
  return {
    type,
    caption,
    unit,
    categories,
    series: series.map((s, i) => ({ label: s.label, data: s.data, ...(type === 'pie' ? {} : { colorToken: DI_COLORS[i] }) })),
    ariaSummary: `${caption}. ${summary}.`
  };
}

/** Read one value back off a chart by its series label and category name. */
const readChart = (chart, label, category) => chart.series.find((s) => s.label === label).data[chart.categories.indexOf(category)];

function diTable(caption, headers, rowLabels, rows) {
  return { caption, headers, rows: rows.map((row, i) => [rowLabels[i], ...row.map((v) => fmt(v))]) };
}

/** Read one cell back off a table (as printed) by its row label and column header. */
function readTable(table, rowLabel, header) {
  const row = table.rows.find((r) => r[0] === rowLabel);
  return Number(String(row[table.headers.indexOf(header)]).replace(/,/g, ''));
}

const diYears = (rng, n) => {
  const start = rng.int(2015, 2020);
  return Array.from({ length: n }, (_, i) => String(start + i));
};

/** Five multiples of 5 (each at least 5) that add up to 100. */
function budgetShares(rng) {
  const shares = [];
  let left = 100;
  for (let i = 0; i < 4; i++) {
    const share = 5 * rng.int(1, Math.min(8, (left - 5 * (4 - i)) / 5));
    shares.push(share);
    left -= share;
  }
  shares.push(left);
  return left >= 5 ? shares : null;
}

const budgetChart = (shares, caption) => ({
  type: 'pie',
  caption,
  unit: '%',
  categories: DI_BUDGET,
  series: [{ label: 'Budget', data: shares }],
  ariaSummary: `${caption}: ${DI_BUDGET.map((c, i) => `${c} ${shares[i]}%`).join(', ')}.`
});

/** Split `total` into `count` multiples of 5, each at least `min`. Null if it cannot. */
function splitFives(rng, total, count, min = 5) {
  const parts = [];
  let left = total;
  for (let i = 0; i < count - 1; i++) {
    const most = (left - min * (count - 1 - i)) / 5;
    if (most < min / 5) return null;
    const part = 5 * rng.int(min / 5, most);
    parts.push(part);
    left -= part;
  }
  if (left < min) return null;
  parts.push(left);
  return rng.shuffle(parts);
}

const ratioOf = (a, b) => {
  const g = gcd(a, b);
  return `${a / g} : ${b / g}`;
};

/* Units a table heading can carry, and how the answer is written in the base unit. */
const TABLE_UNITS = [
  { heading: 'thousand tonnes', factor: 1000, items: ['Plant P', 'Plant Q', 'Plant R'], thing: 'Production', ask: (item, yr) => `How many tonnes did ${item} produce in ${yr}?`, show: (v) => `${fmt(v)} tonnes` },
  { heading: '₹ lakh', factor: 100000, items: ['Product A', 'Product B', 'Product C'], thing: 'Sales', ask: (item, yr) => `What were the sales of ${item} in ${yr}, in rupees?`, show: (v) => format.rupees(v) },
  { heading: 'thousand units', factor: 1000, items: ['Factory X', 'Factory Y', 'Factory Z'], thing: 'Output', ask: (item, yr) => `How many units did ${item} make in ${yr}?`, show: (v) => `${fmt(v)} units` }
];
const unitTable = (unit, yrs, rows) => diTable(`${unit.thing} (${unit.heading})`, ['Year', ...unit.items], yrs, rows);

/* Market shares that change by a clean percentage. */
const SHARE_STARTS = [10, 12, 15, 16, 20, 24, 25, 30, 40, 50];
const SHARE_CHANGES = [-50, -40, -25, -20, -10, 10, 20, 25, 40, 50, 60, 75, 100];
const BRANDS = ['Brand A', 'Brand B', 'Brand C'];

/* Two-way caselets: a whole, split into two groups; one group split by a percentage, the other by a count. */
const CASELETS = {
  library: {
    text: ({ total, first, pct, second, extra }) => `A library has ${total} books, and also ${extra} magazines. ${first} of the books are fiction and the rest are non-fiction. ${pct}% of the fiction books are in English and the rest are in Hindi. ${second} of the non-fiction books are in Hindi and the rest are in English.`,
    asks: { group2: 'How many non-fiction books does the library have?', g1yes: 'How many fiction books are in English?', g2yes: 'How many non-fiction books are in English?', yes: 'How many of the books are in English altogether?' },
    words: { group1: 'fiction', group2: 'non-fiction', yes: 'English', no: 'Hindi' }
  },
  school: {
    text: ({ total, first, pct, second, extra }) => `A school has ${total} students and ${extra} teachers. ${first} of the students are boys and the rest are girls. ${pct}% of the boys walk to school and the rest come by bus. ${second} of the girls come by bus and the rest walk.`,
    asks: { group2: 'How many girls are there in the school?', g1yes: 'How many boys walk to school?', g2yes: 'How many girls walk to school?', yes: 'How many students walk to school altogether?' },
    words: { group1: 'boys', group2: 'girls', yes: 'walk', no: 'bus' }
  }
};

export const dataPart = [
  /* ================================ bar graphs ================================ */
  {
    id: 'bg-read-bar-value',
    version: 1,
    topicId: 'di-bar-graphs',
    conceptId: 'bg-reading',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['bg-read-f'],
    estimatedSeconds: 40,
    params(rng) {
      const series = [0, 1].map(() => DI_MONTHS.slice(0, 5).map(() => 5 * rng.int(4, 20)));
      const store = rng.int(0, 1);
      const ask = rng.pick(['value', 'change', 'total']);
      const i = rng.int(0, 3);
      const j = rng.int(i + 1, 4);
      if (ask === 'change' && series[store][i] === series[store][j]) return null;
      return { series, store, ask, i, j };
    },
    answer({ series, store, ask, i, j }) {
      const data = series[store];
      return { value: data[i], change: Math.abs(data[j] - data[i]), total: sum(data) }[ask];
    },
    verify(p, value) {
      const chart = barChartOf(p.series);
      const name = DI_STORES[p.store];
      const months = DI_MONTHS.slice(0, 5);
      const at = (k) => readChart(chart, name, months[k]);
      if (p.ask === 'value') return at(p.i) === value;
      if (p.ask === 'change') return at(p.i) + (at(p.j) > at(p.i) ? value : -value) === at(p.j);
      return months.reduce((acc, m) => acc + readChart(chart, name, m), 0) === value;
    },
    render({ series, store, ask, i, j }) {
      const months = DI_MONTHS.slice(0, 5);
      const name = DI_STORES[store];
      const data = series[store];
      const rise = data[j] > data[i];
      return {
        context: 'Study the bar chart of monthly sales and answer the question.',
        chart: barChartOf(series),
        question: {
          value: `What were ${name}'s sales in ${months[i]}, in ₹ thousand?`,
          change: `By how much did ${name}'s sales ${rise ? 'rise' : 'fall'} from ${months[i]} to ${months[j]}, in ₹ thousand?`,
          total: `What were ${name}'s total sales over the five months, in ₹ thousand?`
        }[ask],
        explanation: {
          value: `Find ${name} in the legend, then read its ${months[i]} bar against the axis: ${data[i]}.`,
          change: `${name}'s bars: ${months[i]} ${data[i]}, ${months[j]} ${data[j]}. The ${rise ? 'rise' : 'fall'} is ${Math.abs(data[j] - data[i])}.`,
          total: `${name}'s bars: ${data.join(' + ')} = ${sum(data)}.`
        }[ask],
        solutionSteps: {
          value: [`Match ${name}'s colour in the legend.`, `${months[i]} bar: ${data[i]}.`],
          change: [`${months[i]}: ${data[i]}; ${months[j]}: ${data[j]}.`, `|${data[j]} − ${data[i]}| = ${Math.abs(data[j] - data[i])}.`],
          total: [`Read ${name}'s five bars: ${data.join(', ')}.`, `Sum = ${sum(data)}.`]
        }[ask],
        method: 'Match the series through the legend first, then read each bar against the value axis.',
        hints: [`Check which colour is ${name} in the legend.`, 'Trace across from the top of the bar to the axis.'],
        commonMistakes: [`Reading the other store's bar for the same month.`]
      };
    }
  },

  {
    id: 'bg-read-extreme-month',
    version: 1,
    topicId: 'di-bar-graphs',
    conceptId: 'bg-reading',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['bg-read-f'],
    estimatedSeconds: 35,
    formatValue: (value) => value,
    params(rng) {
      const series = [0, 1].map(() => DI_MONTHS.map(() => 5 * rng.int(4, 20)));
      const store = rng.int(0, 1);
      const high = rng.chance(0.5);
      const pickIndex = (data, top) => {
        const best = top ? Math.max(...data) : Math.min(...data);
        return data.filter((v) => v === best).length === 1 ? data.indexOf(best) : -1;
      };
      const target = pickIndex(series[store], high);
      return target < 0 ? null : { series, store, high, target, opposite: pickIndex(series[store], !high), other: pickIndex(series[1 - store], high) };
    },
    answer: ({ target }) => DI_MONTHS[target],
    distractors: ({ opposite, other, high }) => [
      ...(opposite >= 0 ? [{ value: DI_MONTHS[opposite], why: `picked the ${high ? 'lowest' : 'highest'} month instead of the ${high ? 'highest' : 'lowest'}` }] : []),
      ...(other >= 0 ? [{ value: DI_MONTHS[other], why: 'read the other store\'s bars' }] : []),
      ...DI_MONTHS.map((value) => ({ value, why: 'misjudged the bar heights' }))
    ],
    verify({ series, store, high }, value) {
      const chart = barChartOf(series, DI_MONTHS);
      const name = DI_STORES[store];
      const mine = readChart(chart, name, value);
      return DI_MONTHS.every((m) => m === value || (high ? readChart(chart, name, m) < mine : readChart(chart, name, m) > mine));
    },
    render({ series, store, high, target }) {
      const name = DI_STORES[store];
      const data = series[store];
      return {
        context: 'Study the bar chart of monthly sales and answer the question.',
        chart: barChartOf(series, DI_MONTHS),
        question: `In which month were ${name}'s sales the ${high ? 'highest' : 'lowest'}?`,
        explanation: `${name}'s bars: ${DI_MONTHS.map((m, i) => `${m} ${data[i]}`).join(', ')}. The ${high ? 'tallest' : 'shortest'} is ${DI_MONTHS[target]} (${data[target]}).`,
        solutionSteps: [`Find ${name}'s colour in the legend.`, `Values: ${data.join(', ')}.`, `${high ? 'Highest' : 'Lowest'}: ${DI_MONTHS[target]}.`],
        method: 'Pick out one series by its legend colour, then compare only those bars.',
        hints: [`Look only at ${name}'s bars.`, `Find the ${high ? 'tallest' : 'shortest'} of them.`],
        commonMistakes: ['Comparing the other store\'s bars.']
      };
    }
  },

  {
    id: 'bg-grouped-month-values',
    version: 1,
    topicId: 'di-bar-graphs',
    conceptId: 'bg-grouped',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['bg-read-f'],
    estimatedSeconds: 45,
    params(rng) {
      const series = DI_STORES.map(() => DI_MONTHS.slice(0, 5).map(() => 5 * rng.int(5, 20)));
      const month = rng.int(0, 4);
      const [p, q] = rng.shuffle([0, 1, 2]).slice(0, 2);
      const ask = rng.pick(['combined', 'gap', 'pair']);
      if (ask === 'gap' && series[p][month] === series[q][month]) return null;
      return { series, month, p, q, ask };
    },
    answer({ series, month, p, q, ask }) {
      const col = series.map((s) => s[month]);
      return { combined: sum(col), gap: Math.abs(col[p] - col[q]), pair: col[p] + col[q] }[ask];
    },
    verify({ series, month, p, q, ask }, value) {
      const chart = barChartOf(series);
      const m = DI_MONTHS[month];
      const [a, b] = [readChart(chart, DI_STORES[p], m), readChart(chart, DI_STORES[q], m)];
      if (ask === 'gap') return Math.max(a, b) - value === Math.min(a, b);
      if (ask === 'pair') return value - a === b;
      return DI_STORES.reduce((acc, s) => acc - readChart(chart, s, m), value) === 0;
    },
    render({ series, month, p, q, ask }) {
      const m = DI_MONTHS[month];
      const col = series.map((s) => s[month]);
      const [P, Q] = [DI_STORES[p], DI_STORES[q]];
      return {
        context: 'Study the bar chart of monthly sales for three stores and answer the question.',
        chart: barChartOf(series),
        question: {
          combined: `What were the combined sales of all three stores in ${m}, in ₹ thousand?`,
          gap: `In ${m}, what was the difference between the sales of ${P} and ${Q}, in ₹ thousand?`,
          pair: `What were the combined sales of ${P} and ${Q} in ${m}, in ₹ thousand?`
        }[ask],
        explanation: {
          combined: `${m}: ${DI_STORES.map((s, i) => `${s} ${col[i]}`).join(', ')}. Total = ${col.join(' + ')} = ${sum(col)}.`,
          gap: `${m}: ${P} ${col[p]}, ${Q} ${col[q]}. Difference = ${Math.abs(col[p] - col[q])}.`,
          pair: `${m}: ${P} ${col[p]}, ${Q} ${col[q]}. Together = ${col[p] + col[q]}.`
        }[ask],
        solutionSteps: [`Find the ${m} group of bars.`, `Match each store's colour in the legend: ${DI_STORES.map((s, i) => `${s} ${col[i]}`).join(', ')}.`, `Answer: ${this.answer({ series, month, p, q, ask })}.`],
        method: 'In a grouped bar chart, find the category first, then match each bar to its series through the legend.',
        hints: [`Look at the ${m} group only.`, 'Use the legend colours to tell the stores apart.'],
        commonMistakes: ['Mixing up which coloured bar belongs to which store.', `Reading the bars of a neighbouring month.`]
      };
    }
  },

  {
    id: 'bg-grouped-first-exceed',
    version: 1,
    topicId: 'di-bar-graphs',
    conceptId: 'bg-grouped',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['bg-read-f'],
    estimatedSeconds: 60,
    formatValue: (value) => value,
    params(rng) {
      const series = DI_STORES.map(() => DI_MONTHS.slice(0, 5).map(() => 5 * rng.int(5, 20)));
      const [p, q] = rng.shuffle([0, 1, 2]).slice(0, 2);
      // Try the pair both ways round; keep a margin first passed after an earlier, smaller lead.
      for (const [b, c] of [[p, q], [q, p]]) {
        const gaps = series[b].map((v, i) => v - series[c][i]);
        const options = [5, 10, 15, 20, 25].filter((t) => {
          const first = gaps.findIndex((g) => g > t);
          return first >= 1 && gaps.slice(0, first).some((g) => g > 0);
        });
        if (options.length) return { series, b, c, t: rng.pick(options) };
      }
      return null;
    },
    answer: ({ series, b, c, t }) => DI_MONTHS[series[b].findIndex((v, i) => v - series[c][i] > t)],
    distractors({ series, b, c, t }) {
      const gaps = series[b].map((v, i) => v - series[c][i]);
      const last = gaps.map((g, i) => (g > t ? i : -1)).filter((i) => i >= 0).pop();
      const biggest = gaps.indexOf(Math.max(...gaps));
      const equal = gaps.findIndex((g) => g >= t);
      return [
        { value: DI_MONTHS[gaps.findIndex((g) => g > 0)], why: 'took the first month the store was ahead at all, ignoring the margin' },
        { value: DI_MONTHS[biggest], why: 'picked the month with the largest gap, not the first' },
        { value: DI_MONTHS[last], why: 'picked the last such month, not the first' },
        { value: DI_MONTHS[equal], why: `counted a gap of exactly ${t} as more than ${t}` },
        ...DI_MONTHS.slice(0, 5).map((value) => ({ value, why: 'misread the bar heights' }))
      ];
    },
    verify({ series, b, c, t }, value) {
      const chart = barChartOf(series);
      const months = DI_MONTHS.slice(0, 5);
      const k = months.indexOf(value);
      const gap = (m) => readChart(chart, DI_STORES[b], m) - readChart(chart, DI_STORES[c], m);
      return k >= 0 && gap(value) > t && months.slice(0, k).every((m) => gap(m) <= t);
    },
    render({ series, b, c, t }) {
      const months = DI_MONTHS.slice(0, 5);
      const [B, C] = [DI_STORES[b], DI_STORES[c]];
      const gaps = series[b].map((v, i) => v - series[c][i]);
      const k = gaps.findIndex((g) => g > t);
      return {
        context: 'Study the bar chart of monthly sales for three stores and answer the question.',
        chart: barChartOf(series),
        question: `In which month did ${B}'s sales first exceed ${C}'s sales by more than ₹${t} thousand?`,
        explanation: `${B} − ${C}, month by month: ${months.map((m, i) => `${m} ${gaps[i] < 0 ? `−${-gaps[i]}` : gaps[i]}`).join(', ')}. The first gap above ${t} is in ${months[k]} (${gaps[k]}).`,
        solutionSteps: months.slice(0, k + 1).map((m, i) => `${m}: ${series[b][i]} − ${series[c][i]} = ${signed(gaps[i])}${i === k ? ` > ${t}. First such month.` : gaps[i] > t ? '' : ` (not more than ${t}).`}`),
        method: 'Work through the months in order, subtracting the two stores\' bars, and stop at the first gap above the margin.',
        hints: [`Use the legend to find the ${B} and ${C} bars; ignore the third store.`, 'Go month by month from the start.'],
        commonMistakes: ['Choosing the month with the biggest gap rather than the first one above the margin.']
      };
    }
  },

  /* ================================== caselets ================================== */
  {
    id: 'csl-extract-two-way',
    version: 1,
    topicId: 'di-caselet',
    conceptId: 'csl-extract',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['csl-organize-f'],
    estimatedSeconds: 70,
    params(rng) {
      const total = 20 * rng.int(10, 40);
      const first = 10 * rng.int(Math.ceil((0.3 * total) / 10), Math.floor((0.7 * total) / 10));
      const pct = rng.pick([20, 25, 40, 50, 60, 75, 80]);
      if (((first * pct) / 100) % 1) return null;
      const second = 10 * rng.int(1, Math.floor((total - first) / 10) - 1);
      return { story: rng.pick(['library', 'school']), total, first, pct, second, extra: rng.int(12, 60), ask: rng.pick(['group2', 'g1yes', 'g2yes', 'yes']) };
    },
    answer({ total, first, pct, second, ask }) {
      const g1yes = (first * pct) / 100;
      const g2yes = total - first - second;
      return { group2: total - first, g1yes, g2yes, yes: g1yes + g2yes }[ask];
    },
    // Pull the numbers back out of the paragraph as printed, and work from the "no" side.
    verify(p, value) {
      const text = CASELETS[p.story].text(p);
      const [total, , first, pct, second] = text.match(/\d+/g).map(Number);
      const g1no = first - (first * pct) / 100;
      const g2 = total - first;
      return { group2: () => total - first === value, g1yes: () => first - g1no === value, g2yes: () => g2 - second === value, yes: () => total - g1no - second === value }[p.ask]();
    },
    render(p) {
      const story = CASELETS[p.story];
      const w = story.words;
      const g1yes = (p.first * p.pct) / 100;
      const g2 = p.total - p.first;
      const g2yes = g2 - p.second;
      const steps = {
        group2: [`${cap(w.group2)} = ${p.total} − ${p.first} = ${g2}.`],
        g1yes: [`${p.pct}% of ${p.first} = ${g1yes}.`],
        g2yes: [`${cap(w.group2)} = ${p.total} − ${p.first} = ${g2}.`, `${g2} − ${p.second} = ${g2yes}.`],
        yes: [`${cap(w.group1)}: ${p.pct}% of ${p.first} = ${g1yes}.`, `${cap(w.group2)}: (${p.total} − ${p.first}) − ${p.second} = ${g2yes}.`, `${g1yes} + ${g2yes} = ${g1yes + g2yes}.`]
      }[p.ask];
      return {
        context: story.text(p),
        question: story.asks[p.ask],
        explanation: `${steps.join(' ')} (The ${p.extra} ${p.story === 'library' ? 'magazines are' : 'teachers are'} not part of the count.)`,
        solutionSteps: steps,
        method: 'Write down each number with what it refers to, then use only the ones the question needs.',
        hints: ['List every number in the paragraph and label it.', `Check which group each figure belongs to: ${w.group1} or ${w.group2}.`],
        commonMistakes: [p.story === 'library' ? `Adding the ${p.extra} magazines to the books.` : `Counting the ${p.extra} teachers as students.`, 'Applying the percentage to the whole total instead of to its own group.']
      };
    }
  },

  {
    id: 'csl-extract-bus-stops',
    version: 1,
    topicId: 'di-caselet',
    conceptId: 'csl-extract',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['csl-organize-f'],
    estimatedSeconds: 50,
    params(rng) {
      const start = rng.int(15, 40);
      const stops = [];
      let now = start;
      for (let i = 0; i < 3; i++) {
        const off = rng.int(2, Math.min(15, now - 1));
        const on = rng.int(0, 12);
        stops.push([off, on]);
        now += on - off;
      }
      return { start, stops, ask: rng.pick(['end', 'after2', 'boarded', 'left']) };
    },
    answer({ start, stops, ask }) {
      if (ask === 'boarded') return sum(stops.map((s) => s[1]));
      if (ask === 'left') return sum(stops.map((s) => s[0]));
      const used = ask === 'end' ? stops : stops.slice(0, 2);
      return start + sum(used.map((s) => s[1])) - sum(used.map((s) => s[0]));
    },
    // Ride the bus stop by stop.
    verify({ start, stops, ask }, value) {
      let now = start;
      let boarded = 0;
      let left = 0;
      const after = [];
      for (const [off, on] of stops) {
        now -= off;
        left += off;
        if (now < 0) return false;
        now += on;
        boarded += on;
        after.push(now);
      }
      return { end: after[2], after2: after[1], boarded, left }[ask] === value;
    },
    render({ start, stops, ask }) {
      const ord = ['first', 'second', 'third'];
      const text = stops.map(([off, on], i) => `At the ${ord[i]} stop, ${off} ${off === 1 ? 'person gets' : 'people get'} off and ${on === 0 ? 'nobody gets' : `${on} ${on === 1 ? 'gets' : 'get'}`} on.`).join(' ');
      let now = start;
      const steps = stops.map(([off, on], i) => {
        const before = now;
        now += on - off;
        return `Stop ${i + 1}: ${before} − ${off} + ${on} = ${now}.`;
      });
      const answer = this.answer({ start, stops, ask });
      return {
        context: `A bus leaves the depot with ${start} passengers. ${text}`,
        question: {
          end: 'How many passengers are on the bus after the third stop?',
          after2: 'How many passengers are on the bus after the second stop?',
          boarded: 'How many passengers got on the bus at the three stops altogether?',
          left: 'How many passengers got off the bus at the three stops altogether?'
        }[ask],
        explanation: ask === 'boarded' || ask === 'left'
          ? `Add the people who got ${ask === 'boarded' ? 'on' : 'off'} at each stop: ${stops.map((s) => s[ask === 'boarded' ? 1 : 0]).join(' + ')} = ${answer}. The ${start} who started at the depot are not counted.`
          : `Track the count stop by stop. ${steps.slice(0, ask === 'end' ? 3 : 2).join(' ')} So there are ${answer} passengers.`,
        solutionSteps: ask === 'boarded' || ask === 'left' ? [`${stops.map((s) => s[ask === 'boarded' ? 1 : 0]).join(' + ')} = ${answer}.`] : steps.slice(0, ask === 'end' ? 3 : 2),
        method: 'Write each figure down with what it refers to, then follow the events in order.',
        hints: ['Note the starting number, then each "off" and "on" separately.', ask === 'boarded' || ask === 'left' ? 'The question is about the stops only, not the depot.' : 'Take people off before adding the new ones.'],
        commonMistakes: [ask === 'boarded' ? `Including the ${start} starting passengers.` : 'Mixing up the "off" and "on" figures.']
      };
    }
  },

  /* ================================ line graphs ================================ */
  {
    id: 'lng-read-point-values',
    version: 1,
    topicId: 'di-line-graphs',
    conceptId: 'lng-reading',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['lng-read-f'],
    estimatedSeconds: 40,
    params(rng) {
      const yrs = diYears(rng, 5);
      const x = yrs.map(() => 5 * rng.int(4, 20));
      const y = yrs.map(() => 5 * rng.int(4, 20));
      const which = rng.int(0, 1);
      const i = rng.int(0, 3);
      const ask = rng.pick(['value', 'combined', 'change']);
      if (ask === 'change' && (which ? y : x)[i] === (which ? y : x)[i + 1]) return null;
      return { yrs, x, y, which, i, ask };
    },
    answer({ x, y, which, i, ask }) {
      const data = which ? y : x;
      return { value: data[i], combined: x[i] + y[i], change: Math.abs(data[i + 1] - data[i]) }[ask];
    },
    verify(p, value) {
      const chart = lineChartOf(p);
      const name = DI_COMPANIES[p.which];
      if (p.ask === 'value') return readChart(chart, name, p.yrs[p.i]) === value;
      if (p.ask === 'combined') return value - readChart(chart, DI_COMPANIES[0], p.yrs[p.i]) === readChart(chart, DI_COMPANIES[1], p.yrs[p.i]);
      const [a, b] = [readChart(chart, name, p.yrs[p.i]), readChart(chart, name, p.yrs[p.i + 1])];
      return a + Math.sign(b - a) * value === b;
    },
    render(p) {
      const { yrs, x, y, which, i, ask } = p;
      const name = DI_COMPANIES[which];
      const data = which ? y : x;
      const rise = data[i + 1] > data[i];
      return {
        context: 'Study the line graph of annual profits and answer the question.',
        chart: lineChartOf(p),
        question: {
          value: `What was ${name}'s profit in ${yrs[i]}, in ₹ crore?`,
          combined: `What was the combined profit of the two companies in ${yrs[i]}, in ₹ crore?`,
          change: `By how much did ${name}'s profit ${rise ? 'rise' : 'fall'} from ${yrs[i]} to ${yrs[i + 1]}, in ₹ crore?`
        }[ask],
        explanation: {
          value: `Find ${yrs[i]} on the horizontal axis, go up to ${name}'s line and read across: ${data[i]}.`,
          combined: `${yrs[i]}: ${DI_COMPANIES[0]} ${x[i]} and ${DI_COMPANIES[1]} ${y[i]}. Together = ${x[i] + y[i]}.`,
          change: `${name}: ${data[i]} in ${yrs[i]} and ${data[i + 1]} in ${yrs[i + 1]}. The ${rise ? 'rise' : 'fall'} is ${Math.abs(data[i + 1] - data[i])}.`
        }[ask],
        solutionSteps: {
          value: [`Year ${yrs[i]}, ${name}'s line.`, `Value: ${data[i]}.`],
          combined: [`${DI_COMPANIES[0]}: ${x[i]}; ${DI_COMPANIES[1]}: ${y[i]}.`, `${x[i]} + ${y[i]} = ${x[i] + y[i]}.`],
          change: [`${yrs[i]}: ${data[i]}; ${yrs[i + 1]}: ${data[i + 1]}.`, `|${data[i + 1]} − ${data[i]}| = ${Math.abs(data[i + 1] - data[i])}.`]
        }[ask],
        method: 'Find the year on the x-axis, move up to the right line, then across to the value axis.',
        hints: ['Use the legend to tell the two lines apart.', 'Read the point exactly above the year.'],
        commonMistakes: ['Reading the other company\'s line.', 'Reading the point for a neighbouring year.']
      };
    }
  },

  {
    id: 'lng-read-years-above',
    version: 1,
    topicId: 'di-line-graphs',
    conceptId: 'lng-reading',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['lng-read-f'],
    estimatedSeconds: 45,
    params(rng) {
      const yrs = diYears(rng, 5);
      const x = yrs.map(() => 5 * rng.int(4, 20));
      const y = yrs.map(() => 5 * rng.int(4, 20));
      const which = rng.int(0, 1);
      const data = which ? y : x;
      const level = 5 * rng.int(6, 18);
      const count = data.filter((v) => v > level).length;
      if (data.includes(level) || count === 0 || count === 5) return null;
      return { yrs, x, y, which, level, i: 0, above: rng.chance(0.5) };
    },
    answer: ({ x, y, which, level, above }) => (which ? y : x).filter((v) => (above ? v > level : v < level)).length,
    verify(p, value) {
      const chart = lineChartOf(p);
      const name = DI_COMPANIES[p.which];
      // Sort the readings and count from the end on the asked side of the level.
      const readings = p.yrs.map((yr) => readChart(chart, name, yr)).sort((a, b) => a - b);
      const below = readings.findIndex((v) => v > p.level);
      return (p.above ? readings.length - below : below) === value;
    },
    render(p) {
      const { yrs, x, y, which, level, above } = p;
      const name = DI_COMPANIES[which];
      const data = which ? y : x;
      const hits = yrs.filter((_, k) => (above ? data[k] > level : data[k] < level));
      return {
        context: 'Study the line graph of annual profits and answer the question.',
        chart: lineChartOf(p),
        question: `In how many of the five years was ${name}'s profit ${above ? 'more' : 'less'} than ₹${level} crore?`,
        explanation: `${name}'s profits: ${yrs.map((yr, k) => `${yr} ${data[k]}`).join(', ')}. ${above ? 'Above' : 'Below'} ${level}: ${hits.join(', ')}, which is ${hits.length} year${hits.length === 1 ? '' : 's'}.`,
        solutionSteps: [`Read ${name}'s five points: ${data.join(', ')}.`, `Count those ${above ? 'above' : 'below'} ${level}: ${hits.length}.`],
        method: 'Read every point on the one line, then count those past the level.',
        hints: [`Imagine a horizontal line at ${level} on the value axis.`, `Count ${name}'s points ${above ? 'above' : 'below'} it.`],
        commonMistakes: ['Counting points on the other company\'s line.']
      };
    }
  },

  /* ================================ pie charts ================================ */
  {
    id: 'pch-sector-percent',
    version: 1,
    topicId: 'di-pie-charts',
    conceptId: 'pch-percent',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: '%',
    formulaIds: ['pch-value-f'],
    estimatedSeconds: 35,
    params(rng) {
      const shares = budgetShares(rng);
      if (!shares) return null;
      const [i, j] = rng.shuffle([0, 1, 2, 3, 4]).slice(0, 2);
      return { shares, i, j, ask: rng.pick(['one', 'two', 'except']) };
    },
    answer: ({ shares, i, j, ask }) => ({ one: shares[i], two: shares[i] + shares[j], except: 100 - shares[i] })[ask],
    // Work from the rest of the pie: 100% minus every sector not asked about.
    verify({ shares, i, j, ask }, value) {
      const chart = budgetChart(shares, 'Budget');
      const data = chart.series[0].data;
      const asked = { one: [i], two: [i, j], except: [0, 1, 2, 3, 4].filter((k) => k !== i) }[ask];
      return 100 - sum(data.filter((_, k) => !asked.includes(k))) === value;
    },
    render({ shares, i, j, ask }) {
      const [I, J] = [DI_BUDGET[i], DI_BUDGET[j]];
      return {
        context: 'Study the pie chart of a household\'s monthly budget and answer the question.',
        chart: budgetChart(shares, 'Monthly budget, by category'),
        question: {
          one: `What percentage of the budget is spent on ${I}?`,
          two: `What percentage of the budget is spent on ${I} and ${J} together?`,
          except: `What percentage of the budget goes on everything except ${I}?`
        }[ask],
        explanation: {
          one: `The ${I} sector is labelled ${shares[i]}%.`,
          two: `${I} is ${shares[i]}% and ${J} is ${shares[j]}%, so together ${shares[i] + shares[j]}%.`,
          except: `The whole pie is 100%. ${I} is ${shares[i]}%, so everything else is 100 − ${shares[i]} = ${100 - shares[i]}%.`
        }[ask],
        solutionSteps: { one: [`${I}: ${shares[i]}%.`], two: [`${I}: ${shares[i]}%; ${J}: ${shares[j]}%.`, `${shares[i]} + ${shares[j]} = ${shares[i] + shares[j]}%.`], except: [`${I}: ${shares[i]}%.`, `100 − ${shares[i]} = ${100 - shares[i]}%.`] }[ask],
        method: 'Each sector\'s label gives its share of the whole; all the sectors add up to 100%.',
        hints: [`Find the ${I} sector or its legend entry.`, ask === 'except' ? 'The whole pie is 100%.' : 'Read the percentage printed for it.'],
        commonMistakes: ['Reading a neighbouring sector\'s label.', ...(ask === 'except' ? ['Giving the sector\'s own share instead of the rest.'] : [])]
      };
    }
  },

  {
    id: 'pch-compare-amount-gap',
    version: 1,
    topicId: 'di-pie-charts',
    conceptId: 'pch-compare',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '₹',
    formulaIds: ['pch-value-f'],
    estimatedSeconds: 50,
    params(rng) {
      const shares = budgetShares(rng);
      if (!shares) return null;
      const [m, n] = rng.shuffle([0, 1, 2, 3, 4]).slice(0, 2);
      if (shares[m] === shares[n]) return null;
      const [i, j] = shares[m] > shares[n] ? [m, n] : [n, m];
      return { shares, i, j, total: rng.pick([20000, 30000, 40000, 50000, 60000, 80000, 120000]) };
    },
    answer: ({ shares, i, j, total }) => ((shares[i] - shares[j]) * total) / 100,
    // Turn each sector into rupees first, then subtract.
    verify({ shares, i, j, total }, value) {
      const data = budgetChart(shares, 'Budget').series[0].data;
      return nearlyEqual((data[i] / 100) * total - (data[j] / 100) * total, value);
    },
    render({ shares, i, j, total }) {
      const [I, J] = [DI_BUDGET[i], DI_BUDGET[j]];
      const gap = shares[i] - shares[j];
      const answer = (gap * total) / 100;
      return {
        context: 'Study the pie chart of a household\'s monthly budget and answer the question.',
        chart: budgetChart(shares, `Monthly budget of ${format.rupees(total)}, by category`),
        question: `The monthly budget is ${format.rupees(total)}. How much more is spent on ${I} than on ${J}?`,
        explanation: `${I} is ${shares[i]}% and ${J} is ${shares[j]}%, a gap of ${gap}% of the budget. ${gap}% of ${format.rupees(total)} = ${format.rupees(answer)}.`,
        solutionSteps: [`${shares[i]}% − ${shares[j]}% = ${gap}%.`, `${gap} ÷ 100 × ${fmt(total)} = ${fmt(answer)}.`],
        method: 'Subtract the percentages first, then convert the gap into rupees once.',
        hints: [`Find the ${I} and ${J} sectors.`, 'The gap in percentage, applied to the total, is the gap in rupees.'],
        commonMistakes: [`Giving the gap as ${gap} (a percentage) instead of in rupees.`]
      };
    }
  },

  {
    id: 'pch-compare-sector-ratio',
    version: 1,
    topicId: 'di-pie-charts',
    conceptId: 'pch-compare',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pch-value-f', 'pch-sc-ratio'],
    estimatedSeconds: 45,
    formatValue: (value) => value,
    params(rng) {
      const shares = budgetShares(rng);
      if (!shares) return null;
      const [i, j, k] = rng.shuffle([0, 1, 2, 3, 4]).slice(0, 3);
      if (shares[i] === shares[j]) return null;
      return { shares, i, j, k, total: rng.pick([20000, 40000, 50000, 60000, 80000]) };
    },
    answer: ({ shares, i, j }) => ratioOf(shares[i], shares[j]),
    distractors: ({ shares, i, j, k }) => [
      { value: ratioOf(shares[j], shares[i]), why: 'wrote the ratio the wrong way round' },
      { value: ratioOf(shares[i], 100), why: 'compared the sector with the whole budget' },
      { value: ratioOf(shares[i], shares[k]), why: `read ${DI_BUDGET[k]} instead of ${DI_BUDGET[j]}` },
      { value: ratioOf(shares[k], shares[j]), why: `read ${DI_BUDGET[k]} instead of ${DI_BUDGET[i]}` }
    ],
    // Convert both sectors to rupees, then cancel the amounts.
    verify({ shares, i, j, total }, value) {
      const data = budgetChart(shares, 'Budget').series[0].data;
      const [a, b] = [(data[i] * total) / 100, (data[j] * total) / 100];
      const g = gcd(a, b);
      return `${a / g} : ${b / g}` === value;
    },
    render({ shares, i, j, total }) {
      const [I, J] = [DI_BUDGET[i], DI_BUDGET[j]];
      const answer = ratioOf(shares[i], shares[j]);
      return {
        context: 'Study the pie chart of a household\'s monthly budget and answer the question.',
        chart: budgetChart(shares, `Monthly budget of ${format.rupees(total)}, by category`),
        question: `What is the ratio of the amount spent on ${I} to the amount spent on ${J}?`,
        explanation: `Both amounts are percentages of the same total, so their ratio is the ratio of the percentages: ${shares[i]} : ${shares[j]} = ${answer}. (In rupees: ${format.rupees((shares[i] * total) / 100)} : ${format.rupees((shares[j] * total) / 100)}, the same ratio.)`,
        solutionSteps: [`${I}: ${shares[i]}%; ${J}: ${shares[j]}%.`, `${shares[i]} : ${shares[j]} = ${answer}.`],
        method: 'Sectors of one pie compare in the same ratio as their percentages; no need to find the amounts.',
        hints: [`The first term is ${I}.`, 'Cancel by the highest common factor.'],
        commonMistakes: ['Writing the ratio the wrong way round.', 'Working out both rupee amounts when the percentages are enough.']
      };
    }
  },

  /* ================================== tables ================================== */
  {
    id: 'dt-read-cell-units',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'di-read',
    difficulty: 'easy',
    type: 'single_choice',
    estimatedSeconds: 40,
    formatValue: (value, p) => TABLE_UNITS[p.unit].show(value),
    params(rng) {
      const yrs = diYears(rng, 4);
      return { unit: rng.int(0, 2), yrs, rows: yrs.map(() => [0, 1, 2].map(() => rng.int(12, 95))), r: rng.int(0, 3), c: rng.int(0, 2) };
    },
    answer: ({ unit, rows, r, c }) => rows[r][c] * TABLE_UNITS[unit].factor,
    distractors({ unit, rows, r, c }) {
      const f = TABLE_UNITS[unit].factor;
      const v = rows[r][c];
      return [
        { value: v, why: 'ignored the unit in the heading' },
        { value: rows[r === 0 ? 1 : r - 1][c] * f, why: 'read the wrong year\'s row' },
        { value: rows[r][c === 0 ? 1 : c - 1] * f, why: 'read the wrong column' },
        { value: (v * f) / 10, why: 'dropped a zero when converting the unit' },
        { value: v * f * 10, why: 'added an extra zero when converting the unit' }
      ];
    },
    verify({ unit, yrs, rows, r, c }, value) {
      const u = TABLE_UNITS[unit];
      return readTable(unitTable(u, yrs, rows), yrs[r], u.items[c]) * u.factor === value;
    },
    render({ unit, yrs, rows, r, c }) {
      const u = TABLE_UNITS[unit];
      const v = rows[r][c];
      return {
        context: 'Study the table and answer the question. Check the units in the heading.',
        table: unitTable(u, yrs, rows),
        question: u.ask(u.items[c], yrs[r]),
        explanation: `The ${yrs[r]} row and the ${u.items[c]} column meet at ${v}. The heading says the figures are in ${u.heading}, so this is ${v} × ${fmt(u.factor)} = ${u.show(v * u.factor)}.`,
        solutionSteps: [`Cell (${yrs[r]}, ${u.items[c]}): ${v}.`, `Unit: ${u.heading}, so multiply by ${fmt(u.factor)}.`, `${u.show(v * u.factor)}.`],
        method: 'Find the row and column, then apply the unit given in the heading.',
        hints: [`Go along the ${yrs[r]} row to the ${u.items[c]} column.`, `What does "${u.heading}" mean for the number you read?`],
        commonMistakes: [`Giving ${v} without the unit's multiplier.`]
      };
    }
  },

  {
    id: 'dt-read-cell-difference',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'di-read',
    difficulty: 'easy',
    type: 'numerical_input',
    estimatedSeconds: 45,
    params(rng) {
      const yrs = diYears(rng, 4);
      const rows = yrs.map(() => [0, 1, 2].map(() => rng.int(12, 95)));
      const across = rng.chance(0.5);
      const r = rng.int(0, 3);
      const c = rng.int(0, 2);
      const [a, b] = across ? rng.shuffle([0, 1, 2]).slice(0, 2) : rng.shuffle([0, 1, 2, 3]).slice(0, 2);
      const first = across ? rows[r][a] : rows[a][c];
      const second = across ? rows[r][b] : rows[b][c];
      if (first === second) return null;
      const [hi, lo] = first > second ? [a, b] : [b, a];
      return { unit: rng.int(0, 2), yrs, rows, across, r, c, a: hi, b: lo };
    },
    answer: ({ rows, across, r, c, a, b }) => (across ? rows[r][a] - rows[r][b] : rows[a][c] - rows[b][c]),
    verify({ unit, yrs, rows, across, r, c, a, b }, value) {
      const u = TABLE_UNITS[unit];
      const t = unitTable(u, yrs, rows);
      const [x, y] = across ? [readTable(t, yrs[r], u.items[a]), readTable(t, yrs[r], u.items[b])] : [readTable(t, yrs[a], u.items[c]), readTable(t, yrs[b], u.items[c])];
      return y + value === x;
    },
    render({ unit, yrs, rows, across, r, c, a, b }) {
      const u = TABLE_UNITS[unit];
      const [x, y] = across ? [rows[r][a], rows[r][b]] : [rows[a][c], rows[b][c]];
      const what = u.thing.toLowerCase();
      return {
        context: 'Study the table and answer the question.',
        table: unitTable(u, yrs, rows),
        question: across
          ? `In ${yrs[r]}, by how much did ${u.items[a]}'s ${what} exceed ${u.items[b]}'s, in ${u.heading}?`
          : `By how much was ${u.items[c]}'s ${what} in ${yrs[a]} more than in ${yrs[b]}, in ${u.heading}?`,
        explanation: across ? `In the ${yrs[r]} row: ${u.items[a]} ${x}, ${u.items[b]} ${y}. Difference = ${x} − ${y} = ${x - y}.` : `In the ${u.items[c]} column: ${yrs[a]} ${x}, ${yrs[b]} ${y}. Difference = ${x} − ${y} = ${x - y}.`,
        solutionSteps: [`Read ${x} and ${y}.`, `${x} − ${y} = ${x - y}.`],
        method: across ? 'Stay in one row and read across to each column.' : 'Stay in one column and read down to each row.',
        hints: [across ? `Both figures are in the ${yrs[r]} row.` : `Both figures are in the ${u.items[c]} column.`, `The answer stays in ${u.heading}.`],
        commonMistakes: ['Reading a figure from the wrong row or column.']
      };
    }
  },

  {
    id: 'dt-points-vs-change',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'di-points',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['di-points-rule'],
    estimatedSeconds: 60,
    formatValue: (value, p) => (p.ask === 'points' ? `${fmt(value, 1)} percentage points` : `${fmt(value, 1)}%`),
    params(rng) {
      const s1 = rng.pick(SHARE_STARTS);
      const pct = rng.pick(SHARE_CHANGES);
      const s2 = s1 + (s1 * pct) / 100;
      if (!Number.isInteger(s2) || s2 < 5 || s2 > 70) return null;
      const brand = rng.int(0, 2);
      const fill = (mine) => {
        const left = 100 - mine;
        if (left < 20) return null;
        const first = rng.int(10, left - 10);
        const row = [first, left - first];
        row.splice(brand, 0, mine);
        return row;
      };
      const before = fill(s1);
      const after = fill(s2);
      if (!before || !after) return null;
      const yrs = diYears(rng, 4);
      return { yrs: [yrs[0], yrs[3]], rows: [before, after], brand, ask: rng.pick(['points', 'percent']) };
    },
    answer({ rows, brand, ask }) {
      const [s1, s2] = [rows[0][brand], rows[1][brand]];
      return ask === 'points' ? Math.abs(s2 - s1) : (Math.abs(s2 - s1) / s1) * 100;
    },
    distractors({ rows, brand, ask }) {
      const [s1, s2] = [rows[0][brand], rows[1][brand]];
      const points = Math.abs(s2 - s1);
      const other = rows[0].findIndex((_, k) => k !== brand && rows[0][k] !== rows[1][k]);
      const otherPoints = other >= 0 ? Math.abs(rows[1][other] - rows[0][other]) : null;
      return ask === 'points'
        ? [
            { value: (points / s1) * 100, why: 'gave the percentage change instead of the change in points' },
            { value: s2, why: 'gave the new share instead of the change' },
            { value: (s2 / s1) * 100, why: 'divided the new share by the old one' },
            { value: otherPoints, why: 'read another brand\'s column' },
            { value: (points / s2) * 100, why: 'divided the change by the new share' }
          ]
        : [
            { value: points, why: 'gave the change in percentage points instead of the percentage change' },
            { value: (points / s2) * 100, why: 'divided by the new share instead of the old one' },
            { value: (s2 / s1) * 100, why: 'forgot to subtract 100%' },
            { value: otherPoints === null ? null : (otherPoints / rows[0][other]) * 100, why: 'read another brand\'s column' },
            { value: (s1 / s2) * 100, why: 'divided the old share by the new one' }
          ];
    },
    verify({ yrs, rows, brand, ask }, value) {
      const t = diTable('Market share (%)', ['Year', ...BRANDS], yrs, rows);
      const [s1, s2] = [readTable(t, yrs[0], BRANDS[brand]), readTable(t, yrs[1], BRANDS[brand])];
      if (ask === 'points') return s1 + Math.sign(s2 - s1) * value === s2;
      return nearlyEqual(s1 * (1 + (Math.sign(s2 - s1) * value) / 100), s2);
    },
    render({ yrs, rows, brand, ask }) {
      const name = BRANDS[brand];
      const [s1, s2] = [rows[0][brand], rows[1][brand]];
      const rise = s2 > s1;
      const points = Math.abs(s2 - s1);
      const pct = (points / s1) * 100;
      return {
        context: 'Study the table of market shares and answer the question.',
        table: diTable('Market share (%)', ['Year', ...BRANDS], yrs, rows),
        question:
          ask === 'points'
            ? `By how many percentage points did ${name}'s market share ${rise ? 'rise' : 'fall'} from ${yrs[0]} to ${yrs[1]}?`
            : `By what percentage did ${name}'s market share ${rise ? 'rise' : 'fall'} from ${yrs[0]} to ${yrs[1]}?`,
        explanation: `${name}'s share went from ${s1}% to ${s2}%. The change in percentage points is the plain difference: ${s2} − ${s1} = ${rise ? '' : '−'}${points} points. The percentage change compares that with the starting share: ${points} ÷ ${s1} × 100 = ${fmt(pct, 1)}%. The question asks for the ${ask === 'points' ? 'percentage points' : 'percentage change'}: ${ask === 'points' ? `${points} percentage points` : `${fmt(pct, 1)}%`}.`,
        solutionSteps: [`${yrs[0]}: ${s1}%; ${yrs[1]}: ${s2}%.`, ask === 'points' ? `${s2} − ${s1} = ${rise ? '' : '−'}${points} percentage points.` : `(${points} ÷ ${s1}) × 100 = ${fmt(pct, 1)}%.`],
        method: 'Percentage points = new % − old %. Percentage change = (new % − old %) ÷ old % × 100.',
        hints: ['Are you asked for the plain difference in shares, or the difference compared with the starting share?', `${name}'s starting share is ${s1}%.`],
        commonMistakes: ['Confusing percentage points with percentage change.']
      };
    }
  },

  {
    id: 'dt-points-share-from-sales',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'di-points',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'percentage points',
    formulaIds: ['di-points-rule', 'di-share'],
    estimatedSeconds: 80,
    params(rng) {
      const product = rng.int(0, 2);
      const make = () => {
        const total = rng.pick([200, 250, 400, 500]);
        const share = 5 * rng.int(3, 10);
        const mine = (total * share) / 100;
        const rest = splitFives(rng, total - mine, 2, 20);
        if (!rest || !Number.isInteger(mine)) return null;
        const row = [...rest];
        row.splice(product, 0, mine);
        return { row, share };
      };
      const [a, b] = [make(), make()];
      if (!a || !b || a.share === b.share) return null;
      const yrs = diYears(rng, 2);
      return { yrs, rows: [a.row, b.row], product };
    },
    answer: ({ rows, product }) => Math.abs((rows[1][product] / sum(rows[1])) * 100 - (rows[0][product] / sum(rows[0])) * 100),
    verify({ yrs, rows, product }, value) {
      const t = diTable('Annual sales (₹ lakh)', ['Year', 'Product A', 'Product B', 'Product C'], yrs, rows);
      const share = (yr) => {
        const cells = ['Product A', 'Product B', 'Product C'].map((h) => readTable(t, yr, h));
        return (cells[product] * 100) / sum(cells);
      };
      return nearlyEqual(Math.abs(share(yrs[1]) - share(yrs[0])), value);
    },
    render({ yrs, rows, product }) {
      const name = ['Product A', 'Product B', 'Product C'][product];
      const [t1, t2] = [sum(rows[0]), sum(rows[1])];
      const [s1, s2] = [(rows[0][product] / t1) * 100, (rows[1][product] / t2) * 100];
      const rise = s2 > s1;
      return {
        context: 'Study the table of annual sales and answer the question.',
        table: diTable('Annual sales (₹ lakh)', ['Year', 'Product A', 'Product B', 'Product C'], yrs, rows),
        question: `By how many percentage points did ${name}'s share of total sales ${rise ? 'rise' : 'fall'} from ${yrs[0]} to ${yrs[1]}?`,
        explanation: `${yrs[0]}: total ${rows[0].join(' + ')} = ${t1}, so ${name}'s share = ${rows[0][product]} ÷ ${t1} × 100 = ${fmt(s1)}%. ${yrs[1]}: total ${rows[1].join(' + ')} = ${t2}, share = ${rows[1][product]} ÷ ${t2} × 100 = ${fmt(s2)}%. Change = ${fmt(s2)} − ${fmt(s1)} = ${rise ? '' : '−'}${fmt(Math.abs(s2 - s1))} percentage points.`,
        solutionSteps: [`${yrs[0]} share: ${rows[0][product]} ÷ ${t1} = ${fmt(s1)}%.`, `${yrs[1]} share: ${rows[1][product]} ÷ ${t2} = ${fmt(s2)}%.`, `${fmt(s2)} − ${fmt(s1)} = ${rise ? '' : '−'}${fmt(Math.abs(s2 - s1))} points.`],
        method: 'Find the share in each year (part ÷ that year\'s total × 100), then subtract the shares.',
        hints: ['Each year has its own total; work out both.', 'Percentage points are a plain difference of the two shares.'],
        commonMistakes: [`Giving the percentage change in ${name}'s sales instead of the change in its share.`, 'Dividing by the other year\'s total.']
      };
    }
  }
];

function barChartOf(series, months = DI_MONTHS.slice(0, series[0].length)) {
  return diChart('bar', `Monthly sales of ${series.length === 2 ? 'two' : 'three'} stores (₹ thousand)`, '₹ thousand', months, series.map((data, i) => ({ label: DI_STORES[i], data })));
}

function lineChartOf({ yrs, x, y }) {
  return diChart('line', 'Annual profit of two companies (₹ crore)', '₹ crore', yrs, [
    { label: DI_COMPANIES[0], data: x },
    { label: DI_COMPANIES[1], data: y }
  ]);
}


/* ================================================================================ */
/*                                   STATISTICS                                     */
/* ================================================================================ */

/** Run lengths of a sorted copy: [[value, count], …]. */
function runs(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const out = [];
  for (const v of sorted) {
    if (out.length && out[out.length - 1][0] === v) out[out.length - 1][1]++;
    else out.push([v, 1]);
  }
  return out;
}

const MODE_TABLES = [
  { label: 'Shoe size', count: 'Number of pupils', values: [4, 5, 6, 7, 8, 9, 10], ask: 'What is the modal shoe size?', context: 'The shoe sizes of the pupils in a class are shown in the table.' },
  { label: 'Goals scored', count: 'Number of matches', values: [0, 1, 2, 3, 4, 5], ask: 'What is the modal number of goals scored in a match?', context: 'A football team recorded how many goals it scored in each match of the season.' },
  { label: 'Family size', count: 'Number of families', values: [2, 3, 4, 5, 6, 7], ask: 'What is the modal family size?', context: 'A survey recorded the number of people in each family on a street.' },
  { label: 'Marks (out of 10)', count: 'Number of students', values: [3, 4, 5, 6, 7, 8, 9, 10], ask: 'What is the modal mark?', context: 'The marks scored by students in a short quiz are shown in the table.' }
];

const VENN_THREE = [
  { sets: ['Hindi', 'English', 'Tamil'], who: 'students', verb: 'speak', context: 'In a survey of students about the languages they speak' },
  { sets: ['cricket', 'football', 'hockey'], who: 'children', verb: 'play', context: 'In a sports club survey of the games children play' },
  { sets: ['Paper P', 'Paper Q', 'Paper R'], who: 'households', verb: 'read', context: 'In a survey of households about the newspapers they read' }
];
const VENN_TWO = [
  { a: 'tea', b: 'coffee', who: 'people', verb: 'like' },
  { a: 'cricket', b: 'football', who: 'students', verb: 'play' },
  { a: 'French', b: 'German', who: 'employees', verb: 'speak' },
  { a: 'Maths', b: 'Science', who: 'students', verb: 'passed' }
];

export const statisticsPart = [
  /* ================================ dispersion ================================ */
  {
    id: 'disp-mean-deviation-list',
    version: 1,
    topicId: 'dispersion',
    conceptId: 'disp-meandeviation',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['disp-meandev-f'],
    answerDecimals: 2,
    estimatedSeconds: 70,
    params(rng) {
      const n = rng.pick([4, 5, 5, 6, 8]);
      const mean = rng.int(10, 60);
      const devs = Array.from({ length: n - 1 }, () => rng.int(-12, 12));
      const last = -sum(devs);
      if (Math.abs(last) > 15 || devs.every((d) => d === 0)) return null;
      devs.push(last);
      const md = sum(devs.map(Math.abs)) / n;
      if (Math.abs(md * 100 - Math.round(md * 100)) > 1e-9) return null;
      return { values: rng.shuffle(devs.map((d) => mean + d)) };
    },
    answer({ values }) {
      const mean = sum(values) / values.length;
      return sum(values.map((v) => Math.abs(v - mean))) / values.length;
    },
    // The deviations above the mean balance those below, so the total distance is twice the excess above it.
    verify({ values }, value) {
      const n = values.length;
      const mean = sum(values) / n;
      const above = values.filter((v) => v > mean).reduce((acc, v) => acc + (v - mean), 0);
      return nearlyEqual((2 * above) / n, value);
    },
    render({ values }) {
      const n = values.length;
      const total = sum(values);
      const mean = total / n;
      const devs = values.map((v) => Math.abs(v - mean));
      const md = sum(devs) / n;
      return {
        question: `What is the mean deviation about the mean of ${listText(values.map(minus))}?`,
        explanation: `Mean = ${minus(total)} ÷ ${n} = ${minus(mean)}. The distances from the mean are ${devs.join(', ')}, which add up to ${sum(devs)}. Mean deviation = ${sum(devs)} ÷ ${n} = ${fmt(md)}.`,
        solutionSteps: [`Mean = ${minus(total)} ÷ ${n} = ${minus(mean)}.`, `|x − ${minus(mean)}|: ${devs.join(', ')}.`, `Sum = ${sum(devs)}.`, `${sum(devs)} ÷ ${n} = ${fmt(md)}.`],
        method: 'Mean deviation = (sum of |x − mean|) ÷ n.',
        hints: ['Find the mean first.', 'Take every distance from the mean as positive before adding.'],
        commonMistakes: ['Adding the signed deviations, which always total 0.', 'Dividing by n − 1 instead of n.']
      };
    }
  },

  /* ============================ mean, median and mode ============================ */
  {
    id: 'mmm-mode-from-list',
    version: 1,
    topicId: 'mean-median-mode',
    conceptId: 'mmm-mode',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['mmm-mode-f'],
    estimatedSeconds: 30,
    params(rng) {
      const top = rng.int(3, 4);
      const pool = rng.shuffle(Array.from({ length: 30 }, (_, i) => i + 2)).slice(0, rng.int(4, 6));
      const [mode, ...others] = pool;
      const values = Array(top).fill(mode);
      for (const v of others) values.push(...Array(rng.int(1, top - 1)).fill(v));
      return { values: rng.shuffle(values) };
    },
    answer({ values }) {
      const counts = new Map();
      for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    },
    // Sort the list and find the longest run of equal values; it must be the only longest.
    verify({ values }, value) {
      const r = runs(values);
      const best = Math.max(...r.map(([, c]) => c));
      const winners = r.filter(([, c]) => c === best);
      return winners.length === 1 && winners[0][0] === value;
    },
    render({ values }) {
      const r = runs(values);
      const best = Math.max(...r.map(([, c]) => c));
      const mode = r.find(([, c]) => c === best)[0];
      const sorted = [...values].sort((a, b) => a - b);
      return {
        question: `What is the mode of ${values.join(', ')}?`,
        explanation: `Sorted: ${sorted.join(', ')}. ${r.filter(([, c]) => c > 1).map(([v, c]) => `${v} appears ${c} times`).join(', ')}${r.some(([, c]) => c === 1) ? '; the rest appear once' : ''}. The most frequent value is ${mode}, so the mode is ${mode}.`,
        solutionSteps: [`Sort: ${sorted.join(', ')}.`, `Count each value: ${r.map(([v, c]) => `${v}×${c}`).join(', ')}.`, `Most frequent: ${mode} (${best} times).`],
        method: 'Mode = the value that appears most often.',
        hints: ['Sorting puts equal values side by side.', 'Count how many times each value appears.'],
        commonMistakes: [`Giving the count (${best}) instead of the value.`, 'Giving the middle value (the median) instead.']
      };
    }
  },

  {
    id: 'mmm-mode-frequency-table',
    version: 1,
    topicId: 'mean-median-mode',
    conceptId: 'mmm-mode',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['mmm-mode-f'],
    estimatedSeconds: 40,
    formatValue: (value) => fmt(value),
    params(rng) {
      const kind = rng.int(0, MODE_TABLES.length - 1);
      const freqs = MODE_TABLES[kind].values.map(() => rng.int(1, 15));
      const best = Math.max(...freqs);
      if (freqs.filter((f) => f === best).length !== 1) return null;
      return { kind, freqs };
    },
    answer: ({ kind, freqs }) => MODE_TABLES[kind].values[freqs.indexOf(Math.max(...freqs))],
    distractors({ kind, freqs }) {
      const values = MODE_TABLES[kind].values;
      const best = Math.max(...freqs);
      const second = Math.max(...freqs.filter((f) => f !== best));
      return [
        { value: best, why: 'gave the highest frequency instead of the value' },
        { value: values[freqs.indexOf(second)], why: 'misread the frequency column and took the second most common value' },
        { value: values[values.length - 1], why: 'picked the largest value' },
        { value: values[Math.floor(values.length / 2)], why: 'picked the value in the middle of the table' },
        { value: values[0], why: 'picked the first value in the table' }
      ];
    },
    // Write out every observation, sort, and find the longest run.
    verify({ kind, freqs }, value) {
      const list = MODE_TABLES[kind].values.flatMap((v, i) => Array(freqs[i]).fill(v));
      const r = runs(list);
      const best = Math.max(...r.map(([, c]) => c));
      const winners = r.filter(([, c]) => c === best);
      return winners.length === 1 && winners[0][0] === value;
    },
    render({ kind, freqs }) {
      const t = MODE_TABLES[kind];
      const best = Math.max(...freqs);
      const mode = t.values[freqs.indexOf(best)];
      return {
        context: t.context,
        table: { caption: `${t.label} and frequency`, headers: [t.label, t.count], rows: t.values.map((v, i) => [String(v), String(freqs[i])]) },
        question: t.ask,
        explanation: `The mode is the value with the highest frequency. The largest frequency in the table is ${best}, next to ${mode}, so the mode is ${mode}.`,
        solutionSteps: [`Highest frequency: ${best}.`, `Its value: ${mode}.`],
        method: 'In a frequency table, the mode is the value whose frequency is largest.',
        hints: ['Look down the frequency column for the biggest number.', 'The answer is the value beside it, not the frequency itself.'],
        commonMistakes: [`Giving the frequency ${best} instead of the value ${mode}.`]
      };
    }
  },

  /* ================================ venn diagrams ================================ */
  {
    id: 'vd-only-vs-total-three',
    version: 1,
    topicId: 'venn-diagrams',
    conceptId: 'vd-only-vs-total',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['vd-only-total-f'],
    estimatedSeconds: 60,
    params(rng) {
      const regions = { A: rng.int(5, 40), B: rng.int(5, 40), C: rng.int(5, 40), AB: rng.int(2, 15), AC: rng.int(2, 15), BC: rng.int(2, 15), ABC: rng.int(1, 10) };
      return { story: rng.int(0, VENN_THREE.length - 1), regions, target: rng.int(0, 2), ask: rng.pick(['total', 'only']) };
    },
    answer({ regions, target, ask }) {
      const [x, y, z] = ['A', 'B', 'C'];
      const me = [x, y, z][target];
      const pairs = ['AB', 'AC', 'BC'].filter((k) => k.includes(me));
      const total = regions[me] + regions[pairs[0]] + regions[pairs[1]] + regions.ABC;
      return ask === 'total' ? total : regions[me];
    },
    // Put everyone into one of the seven regions and count heads.
    verify({ regions, target, ask }, value) {
      const letter = 'ABC'[target];
      const people = Object.entries(regions).flatMap(([key, n]) => Array(n).fill(key));
      const inSet = people.filter((key) => key.includes(letter)).length;
      const only = people.filter((key) => key === letter).length;
      return ask === 'total' ? inSet === value : only === value;
    },
    render({ story, regions, target, ask }) {
      const s = VENN_THREE[story];
      const [P, Q, R] = s.sets;
      const name = { A: P, B: Q, C: R };
      const me = 'ABC'[target];
      const pairs = ['AB', 'AC', 'BC'].filter((k) => k.includes(me));
      const pairText = (k) => `${name[k[0]]} and ${name[k[1]]} only`;
      const total = regions[me] + regions[pairs[0]] + regions[pairs[1]] + regions.ABC;
      const facts = [
        `${regions.A} ${s.verb} only ${P}`,
        `${regions.B} ${s.verb} only ${Q}`,
        `${regions.C} ${s.verb} only ${R}`,
        `${regions.AB} ${s.verb} ${pairText('AB')}`,
        `${regions.AC} ${s.verb} ${pairText('AC')}`,
        `${regions.BC} ${s.verb} ${pairText('BC')}`,
        `${regions.ABC} ${s.verb} all three`
      ];
      const known = ask === 'total' ? facts : facts.filter((_, i) => i !== target);
      const shown = { a: regions.A, b: regions.B, c: regions.C, ab: regions.AB, ac: regions.AC, bc: regions.BC, abc: regions.ABC };
      if (ask === 'only') shown[me.toLowerCase()] = '?';
      return {
        figure: {
          type: 'venn',
          caption: 'Each region holds the count for that region alone',
          sets: [P, Q, R],
          regions: shown,
          ariaSummary: `Three overlapping circles for ${P}, ${Q} and ${R}, with the count written in each region${ask === 'only' ? `; the region for only ${name[me]} is unknown` : ''}.`
        },
        question:
          ask === 'total'
            ? `${s.context}: ${listText(known)}. How many ${s.who} ${s.verb} ${name[me]} in total?`
            : `${s.context}, ${total} ${s.who} ${s.verb} ${name[me]} in total. Also, ${listText(known)}. How many ${s.who} ${s.verb} only ${name[me]}?`,
        explanation:
          ask === 'total'
            ? `Everyone in the ${name[me]} circle counts: only ${name[me]} (${regions[me]}), ${pairText(pairs[0])} (${regions[pairs[0]]}), ${pairText(pairs[1])} (${regions[pairs[1]]}) and all three (${regions.ABC}). Total = ${regions[me]} + ${regions[pairs[0]]} + ${regions[pairs[1]]} + ${regions.ABC} = ${total}.`
            : `The ${name[me]} total includes the overlaps: ${pairText(pairs[0])} (${regions[pairs[0]]}), ${pairText(pairs[1])} (${regions[pairs[1]]}) and all three (${regions.ABC}). Only ${name[me]} = ${total} − ${regions[pairs[0]]} − ${regions[pairs[1]]} − ${regions.ABC} = ${regions[me]}.`,
        solutionSteps:
          ask === 'total'
            ? [`Regions inside ${name[me]}: ${regions[me]}, ${regions[pairs[0]]}, ${regions[pairs[1]]}, ${regions.ABC}.`, `Sum = ${total}.`]
            : [`Overlaps inside ${name[me]}: ${regions[pairs[0]]} + ${regions[pairs[1]]} + ${regions.ABC} = ${regions[pairs[0]] + regions[pairs[1]] + regions.ABC}.`, `${total} − ${regions[pairs[0]] + regions[pairs[1]] + regions.ABC} = ${regions[me]}.`],
        method: 'Total in A = only A + (A and B only) + (A and C only) + all three.',
        hints: [`Picture the ${name[me]} circle: which regions lie inside it?`, `Only the overlaps that include ${name[me]} count, plus "all three".`],
        commonMistakes: [`Including the ${pairText(['AB', 'AC', 'BC'].find((k) => !k.includes(me)))} group, which is outside ${name[me]}.`, 'Forgetting the "all three" region.']
      };
    }
  },

  {
    id: 'vd-only-vs-total-word',
    version: 1,
    topicId: 'venn-diagrams',
    conceptId: 'vd-only-vs-total',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['vd-only-total-f'],
    estimatedSeconds: 40,
    params(rng) {
      return { story: rng.int(0, VENN_TWO.length - 1), onlyA: rng.int(5, 40), both: rng.int(2, 25), onlyB: rng.int(3, 40), ask: rng.pick(['both', 'total', 'onlyB']) };
    },
    answer: ({ onlyA, both, onlyB, ask }) => ({ both, total: onlyA + both, onlyB })[ask],
    // Build the group person by person and count.
    verify({ onlyA, both, onlyB, ask }, value) {
      const people = [...Array(onlyA).fill('a'), ...Array(both).fill('ab'), ...Array(onlyB).fill('b')];
      const count = { both: people.filter((p) => p === 'ab').length, total: people.filter((p) => p.includes('a')).length, onlyB: people.filter((p) => p === 'b').length }[ask];
      return count === value;
    },
    render({ story, onlyA, both, onlyB, ask }) {
      const s = VENN_TWO[story];
      const totalA = onlyA + both;
      const totalB = onlyB + both;
      const q = {
        both: [`${totalA} ${s.who} ${s.verb} ${s.a}. Of these, ${onlyA} ${s.verb} only ${s.a}.`, `How many ${s.verb} both ${s.a} and ${s.b}?`, `Both = total ${s.a} − only ${s.a} = ${totalA} − ${onlyA} = ${both}.`],
        total: [`${onlyA} ${s.who} ${s.verb} only ${s.a}, and ${both} ${s.verb} both ${s.a} and ${s.b}.`, `How many ${s.verb} ${s.a} in total?`, `Total ${s.a} = only ${s.a} + both = ${onlyA} + ${both} = ${totalA}.`],
        onlyB: [`${totalA} ${s.who} ${s.verb} ${s.a}, of whom ${onlyA} ${s.verb} only ${s.a}. ${totalB} ${s.verb} ${s.b}.`, `How many ${s.verb} only ${s.b}?`, `Both = ${totalA} − ${onlyA} = ${both}. Only ${s.b} = ${totalB} − ${both} = ${onlyB}.`]
      }[ask];
      return {
        question: `In a group, ${q[0]} ${q[1]}`,
        explanation: `The total for a set includes the overlap. ${q[2]}`,
        solutionSteps: q[2].split('. ').map((t) => (t.endsWith('.') ? t : `${t}.`)),
        method: 'Total in A = only A + both.',
        hints: [`"${cap(s.verb)} ${s.a}" includes those who also ${s.verb} ${s.b}.`, '"Only" leaves the overlap out.'],
        commonMistakes: [ask === 'total' ? `Giving only ${s.a} (${onlyA}) as the total.` : `Treating the ${s.a} total as if it were "only ${s.a}".`]
      };
    }
  }
];


export const moreGeometryDataTemplates = [...geometryPart, ...countingPart, ...dataPart, ...statisticsPart];
