/** Triangles advanced unit: centres of a triangle and congruence (Phase E). */

import { fmt, hasAtMostDecimals, nearlyEqual } from '../core.js';

/* ------------------------------- geometry ------------------------------- */

const rad = (degrees) => (degrees * Math.PI) / 180;
const r2 = (v) => Math.round(v * 100) / 100;
const deg = (v) => `${fmt(v, 1)}°`;
const cm = (v) => `${fmt(v, 2)} cm`;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

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

/** Triangle ABC with B at the origin, C `base` along the x-axis, ∠B = b and ∠C = c. */
function triangleFromAngles(b, c, base = 8) {
  const a = 180 - b - c;
  return { A: dir(b, (base * Math.sin(rad(c))) / Math.sin(rad(a))), B: { x: 0, y: 0 }, C: { x: base, y: 0 } };
}

/** Triangle ABC from its sides (BC = a, CA = b, AB = c), B at the origin and C on the x-axis. Null if impossible. */
function triangleFromSides(a, b, c) {
  const x = (c * c + a * a - b * b) / (2 * a);
  const ySquared = c * c - x * x;
  if (ySquared <= 1e-9) return null;
  return { A: { x, y: Math.sqrt(ySquared) }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
}

/** Where line P1 + t·d1 meets line P2 + s·d2 (Cramer's rule). */
function intersect(p1, d1, p2, d2) {
  const det = d1.x * -d2.y - d1.y * -d2.x;
  if (Math.abs(det) < 1e-12) return null;
  const rx = p2.x - p1.x;
  const ry = p2.y - p1.y;
  const t = (rx * -d2.y - ry * -d2.x) / det;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
const perp = (p, q) => ({ x: -(q.y - p.y), y: q.x - p.x });
const unit = (p, q) => {
  const len = dist(p, q);
  return { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
};

/** Incentre, as the meeting point of the bisectors of ∠B and ∠C. */
function bisectorMeet({ A, B, C }) {
  const ub = [unit(B, A), unit(B, C)];
  const uc = [unit(C, A), unit(C, B)];
  return intersect(B, { x: ub[0].x + ub[1].x, y: ub[0].y + ub[1].y }, C, { x: uc[0].x + uc[1].x, y: uc[0].y + uc[1].y });
}

/** Circumcentre, as the meeting point of the perpendicular bisectors of AB and BC. */
const perpendicularBisectorMeet = ({ A, B, C }) => intersect(mid(A, B), perp(A, B), mid(B, C), perp(B, C));

/** Orthocentre, as the meeting point of the altitudes from B and C. */
const altitudeMeet = ({ A, B, C }) => intersect(B, perp(A, C), C, perp(A, B));

/** Foot of the perpendicular from P to line QR. */
function foot(p, q, r) {
  const dx = r.x - q.x;
  const dy = r.y - q.y;
  const t = ((p.x - q.x) * dx + (p.y - q.y) * dy) / (dx * dx + dy * dy);
  return { x: q.x + t * dx, y: q.y + t * dy };
}
const distanceToLine = (p, q, r) => dist(p, foot(p, q, r));

function centreOf(points) {
  const list = Object.values(points);
  return { x: list.reduce((s, p) => s + p.x, 0) / list.length, y: list.reduce((s, p) => s + p.y, 0) / list.length };
}

/**
 * Figure points from a { id: {x, y} } map: coordinates rounded, labels pushed
 * away from `centre` (screen y runs downward, hence the flip). `extra[id]`
 * overrides per point.
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

/* Primitive Pythagorean triples (legs, hypotenuse), scaled up at use. */
const TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29]
];

/**
 * Heronian triangles that are not right-angled, have no angle under 20° and an
 * inradius with at most one decimal place. Filtered here so a bad entry can't slip in.
 */
const HERONIAN = [
  [13, 14, 15], [5, 5, 6], [10, 10, 12], [4, 13, 15], [10, 17, 21], [13, 13, 24], [11, 13, 20],
  [17, 25, 28], [7, 15, 20], [9, 10, 17], [6, 25, 29], [15, 28, 41], [5, 5, 8], [13, 20, 21]
].filter(([a, b, c]) => {
  const s = (a + b + c) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  const angles = [
    Math.acos((b * b + c * c - a * a) / (2 * b * c)),
    Math.acos((c * c + a * a - b * b) / (2 * c * a)),
    Math.acos((a * a + b * b - c * c) / (2 * a * b))
  ].map((x) => (x * 180) / Math.PI);
  const right = angles.some((x) => Math.abs(x - 90) < 1e-9);
  return Number.isInteger(Math.round(area * 1e6) / 1e6) && hasAtMostDecimals(area / s, 1) && !right && Math.min(...angles) >= 20;
});

/* ------------------------------ congruence ------------------------------ */

const NONE = 'Not guaranteed by any rule';
const RULE_ANSWER = { SSS: 'SSS', SAS: 'SAS', ASA: 'ASA', AAS: 'AAS', RHS: 'RHS', SSA: NONE, AAA: NONE };

/** The equal parts for each rule, in vertex roles x, y, z (0, 1, 2 rotated). */
function rulePartsFor(rule, [x, y, z]) {
  const side = (i, j) => ({ kind: 'side', v: [i, j] });
  const angle = (i, right = false) => ({ kind: 'angle', v: i, right });
  switch (rule) {
    case 'SSS': return [side(x, y), side(y, z), side(z, x)];
    case 'SAS': return [side(x, y), angle(y), side(y, z)];
    case 'ASA': return [angle(x), side(x, y), angle(y)];
    case 'AAS': return [angle(x), angle(y), side(y, z)];
    case 'RHS': return [angle(y, true), side(z, x), side(x, y)];
    case 'SSA': return [side(x, y), side(y, z), angle(x)];
    default: return [angle(x), angle(y), angle(z)];
  }
}

/** Independent classifier: reads only the listed parts, never the rule that produced them. */
function classifyParts(parts) {
  const sides = parts.filter((p) => p.kind === 'side');
  const angles = parts.filter((p) => p.kind === 'angle');
  if (sides.length === 3) return 'SSS';
  if (angles.length === 3) return NONE;
  if (sides.length === 2) {
    const [s1, s2] = sides.map((s) => s.v);
    const shared = s1.find((v) => s2.includes(v));
    const a = angles[0];
    if (a.v === shared) return 'SAS';
    // A right angle with the side opposite it (the hypotenuse) among the equal sides.
    const hypotenuseGiven = sides.some((s) => !s.v.includes(a.v));
    return a.right && hypotenuseGiven ? 'RHS' : NONE;
  }
  const [a1, a2] = angles.map((a) => a.v);
  const s = sides[0].v;
  return s.includes(a1) && s.includes(a2) ? 'ASA' : 'AAS';
}

/* Distractors per rule, each a real slip. ASA and AAS never appear together, nor SSS with RHS. */
const CONGRUENCE_DISTRACTORS = {
  SSS: [
    { value: 'SAS', why: 'saw an angle that is not given' },
    { value: 'RHS', why: 'no right angle is given' },
    { value: NONE, why: 'thought three sides are not enough' }
  ],
  SAS: [
    { value: NONE, why: 'took the angle as not between the sides (SSA)' },
    { value: 'ASA', why: 'only one angle is given' },
    { value: 'RHS', why: 'the angle is not a right angle' },
    { value: 'SSS', why: 'only two sides are given' }
  ],
  ASA: [
    { value: 'SAS', why: 'only one side is given' },
    { value: NONE, why: 'mistook it for AAA' },
    { value: 'RHS', why: 'no right angle is given' }
  ],
  AAS: [
    { value: NONE, why: 'thought the side must lie between the two angles' },
    { value: 'SAS', why: 'only one side is given' },
    { value: 'RHS', why: 'no right angle is given' }
  ],
  RHS: [
    { value: 'SAS', why: 'took the right angle as between the two given sides' },
    { value: NONE, why: 'treated it as SSA and forgot the right-angle exception' },
    { value: 'ASA', why: 'only one angle is given' }
  ],
  SSA: [
    { value: 'SAS', why: 'took the angle as between the two sides' },
    { value: 'RHS', why: 'the angle is not a right angle' },
    { value: 'ASA', why: 'only one angle is given' },
    { value: 'SSS', why: 'only two sides are given' }
  ],
  AAA: [
    { value: 'ASA', why: 'no side is given' },
    { value: 'AAS', why: 'no side is given' },
    { value: 'SSS', why: 'equal angles do not give equal sides' }
  ]
};

const RULE_EXPLANATION = {
  SSS: 'All three pairs of sides are equal, so the triangles are congruent by SSS.',
  SAS: 'The equal angle lies between the two equal sides, so this is SAS.',
  ASA: 'The equal side lies between the two equal angles, so this is ASA.',
  AAS: 'Two angles are equal and the equal side is not between them, so this is AAS (the third angles are then equal too).',
  RHS: 'There is a right angle, the hypotenuse (the side opposite it) is equal, and one more side is equal: RHS.',
  SSA: 'The equal angle is not between the two equal sides. That is SSA, which can fit two different triangles, so congruence is not guaranteed.',
  AAA: 'Equal angles fix only the shape, not the size: the triangles are similar but need not be congruent.'
};

const SECOND_TRIANGLES = ['PQR', 'DEF', 'XYZ', 'LMN'];

/** The solution step that says where the odd part sits (it names parts; it does not decide the rule). */
function whereStep(parts, first, sideName) {
  const sides = parts.filter((p) => p.kind === 'side');
  const angles = parts.filter((p) => p.kind === 'angle');
  if (sides.length === 3) return 'Three pairs of sides are equal; no angle is needed.';
  if (angles.length === 3) return 'Only angles are equal; no side is given.';
  if (sides.length === 2) {
    const v = angles[0].v;
    const arms = `${sideName(first, [v, (v + 1) % 3])} and ${sideName(first, [v, (v + 2) % 3])}`;
    return `∠${first[v]} is formed by sides ${arms}; the equal sides are ${sides.map((s) => sideName(first, s.v)).join(' and ')}.`;
  }
  const [i, j] = sides[0].v;
  return `Side ${sideName(first, sides[0].v)} joins ${first[Math.min(i, j)]} and ${first[Math.max(i, j)]}; the equal angles are at ${angles.map((a) => first[a.v]).join(' and ')}.`;
}

export const advTriangleCentresTemplates = [
  /* ============================ angles at the centres ============================ */
  {
    id: 'tri-adv-centre-angle',
    version: 1,
    topicId: 'triangles',
    conceptId: 'tri-adv-centres',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['tri-adv-centre-angles-f'],
    estimatedSeconds: 60,
    formatValue: (value) => deg(value),
    params(rng) {
      const A = 2 * rng.int(18, 42);
      const B = 5 * rng.int(7, 16);
      const C = 180 - A - B;
      // Every angle acute and at least 30°, so all three centres sit well inside.
      if (C < 30 || C >= 90) return null;
      return { A, B, C, centre: rng.pick(['I', 'O', 'H']) };
    },
    answer: ({ A, centre }) => (centre === 'I' ? 90 + A / 2 : centre === 'O' ? 2 * A : 180 - A),
    distractors: ({ A, centre }) => {
      const incentre = { value: 90 + A / 2, why: 'used the incentre rule 90° + A/2' };
      const circumcentre = { value: 2 * A, why: 'used the circumcentre rule 2A' };
      const orthocentre = { value: 180 - A, why: 'used the orthocentre rule 180° − A' };
      if (centre === 'I') {
        return [circumcentre, orthocentre, { value: 90 + A, why: 'forgot to halve ∠A' }, { value: 90 - A / 2, why: 'subtracted A/2 from 90° instead of adding' }];
      }
      if (centre === 'O') {
        return [incentre, orthocentre, { value: A, why: 'took the angle at the centre equal to ∠A' }, { value: 90 - A, why: 'gave the base angle ∠OBC' }];
      }
      return [circumcentre, incentre, { value: A, why: 'took ∠BHC equal to ∠A' }, { value: 180 - 2 * A, why: 'subtracted ∠A twice' }];
    },
    // Build the triangle, construct the centre from its defining lines, and measure ∠BXC.
    verify({ B, C, centre }, value) {
      const t = triangleFromAngles(B, C);
      const X = centre === 'I' ? bisectorMeet(t) : centre === 'O' ? perpendicularBisectorMeet(t) : altitudeMeet(t);
      return Boolean(X) && measuresAs(angleAt(X, t.B, t.C), value);
    },
    render({ A, B, C, centre }) {
      const t = triangleFromAngles(B, C);
      const g = { ...t };
      const shapes = [{ type: 'polygon', points: ['A', 'B', 'C'] }];
      const extra = { [centre]: { labelOffset: [-4, -10] } };
      const rightAngles = [];
      const ticks = [];
      let name;
      let lines;
      if (centre === 'I') {
        g.I = bisectorMeet(t);
        shapes.push({ type: 'segment', from: 'B', to: 'I' }, { type: 'segment', from: 'C', to: 'I' });
        name = 'the incentre, where the angle bisectors meet';
        lines = 'the bisectors BI and CI';
      } else if (centre === 'O') {
        g.O = perpendicularBisectorMeet(t);
        shapes.push(
          { type: 'segment', from: 'O', to: 'A', style: 'dashed' },
          { type: 'segment', from: 'O', to: 'B' },
          { type: 'segment', from: 'O', to: 'C' }
        );
        ticks.push({ on: ['O', 'A'], count: 1 }, { on: ['O', 'B'], count: 1 }, { on: ['O', 'C'], count: 1 });
        name = 'the circumcentre, the centre of the circle through A, B and C';
        lines = 'the equal radii OA, OB and OC';
      } else {
        g.H = altitudeMeet(t);
        g.E = foot(t.B, t.A, t.C);
        g.F = foot(t.C, t.A, t.B);
        shapes.push({ type: 'segment', from: 'B', to: 'E', style: 'dashed' }, { type: 'segment', from: 'C', to: 'F', style: 'dashed' });
        rightAngles.push({ at: 'E', from: 'C', to: 'B' }, { at: 'F', from: 'B', to: 'C' });
        name = 'the orthocentre, where the altitudes meet';
        lines = 'the altitudes BE and CF';
      }
      const angleName = `∠B${centre}C`;
      const caption = `Triangle ABC with ${lines} meeting at ${centre}`;
      const steps = {
        I: [
          `∠B + ∠C = 180 − ${A} = ${180 - A}°.`,
          `In triangle BIC the base angles are halves: ${180 - A} ÷ 2 = ${(180 - A) / 2}°.`,
          `∠BIC = 180 − ${(180 - A) / 2} = ${90 + A / 2}°.`
        ],
        O: [`Arc BC subtends ∠A = ${A}° at the circumference.`, `At the centre it subtends twice that: 2 × ${A} = ${2 * A}°.`],
        H: [
          `In quadrilateral AFHE, ∠AFH = ∠AEH = 90° and ∠A = ${A}°.`,
          `∠FHE = 360 − 90 − 90 − ${A} = ${180 - A}°.`,
          `∠BHC = ∠FHE (vertically opposite) = ${180 - A}°.`
        ]
      };
      const explanation = {
        I: `I lies on the bisectors of ∠B and ∠C, so the base angles of triangle BIC add up to (∠B + ∠C) ÷ 2 = ${(180 - A) / 2}°. So ∠BIC = 180 − ${(180 - A) / 2} = ${90 + A / 2}°, which is 90° + A/2.`,
        O: `The angle an arc subtends at the centre is twice the angle it subtends at the circumference, so ∠BOC = 2 × ∠A = 2 × ${A} = ${2 * A}°.`,
        H: `The altitudes meet AC at E and AB at F at right angles, so in quadrilateral AFHE the angle at H is 360 − 90 − 90 − ${A} = ${180 - A}°. ∠BHC is vertically opposite it, so ∠BHC = 180° − A = ${180 - A}°.`
      };
      return {
        question: `In ${centre === 'I' ? '' : 'acute '}triangle ABC, ∠A = ${A}° and ∠B = ${B}°. ${centre} is ${name}. What is ${angleName}?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(t), extra),
          shapes,
          ...(rightAngles.length ? { rightAngles } : {}),
          ...(ticks.length ? { ticks } : {}),
          angles: [
            { at: 'A', from: 'B', to: 'C', label: `${A}°`, radius: 18 },
            { at: 'B', from: 'A', to: 'C', label: `${B}°`, radius: 16 },
            { at: centre, from: 'B', to: 'C', label: '?', radius: 14 }
          ],
          ariaSummary: `${caption}. ∠A = ${A}°, ∠B = ${B}° (so ∠C = ${C}°), and ${angleName} is marked with a question mark.`
        },
        explanation: explanation[centre],
        solutionSteps: steps[centre],
        method: { I: '∠BIC = 90° + A/2.', O: '∠BOC = 2A for an acute triangle.', H: '∠BHC = 180° − A.' }[centre],
        hints: [
          { I: 'I is on the bisectors, so triangle BIC has half of ∠B and half of ∠C.', O: 'O is the centre of the circle through A, B and C.', H: 'Look at the quadrilateral formed by A, the two feet of the altitudes and H.' }[centre],
          'Only ∠A matters for this angle: ∠B is there to help you draw the triangle.'
        ],
        commonMistakes: [
          { I: `Using 2A = ${2 * A}°, the circumcentre rule.`, O: `Using 90° + A/2 = ${90 + A / 2}°, the incentre rule.`, H: `Using 2A = ${2 * A}°, the circumcentre rule.` }[centre],
          { I: `Forgetting to halve: 90 + ${A} = ${90 + A}°.`, O: `Taking ∠BOC equal to ∠A = ${A}°.`, H: `Taking ∠BHC equal to ∠A = ${A}°.` }[centre]
        ]
      };
    }
  },

  /* ============================ inradius and circumradius ============================ */
  {
    id: 'tri-adv-radius',
    version: 1,
    topicId: 'triangles',
    conceptId: 'tri-adv-centres',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tri-adv-centres-f', 'tri-sc-equilateral-centres', 'tri-sc-right-radii'],
    answerDecimals: 1,
    estimatedSeconds: 70,
    formatValue: (value) => cm(value),
    params(rng) {
      const kind = rng.pick(['rightR', 'rightr', 'equiR', 'equir', 'heron']);
      if (kind === 'rightR' || kind === 'rightr') {
        const [p, q, h] = rng.pick(TRIPLES);
        const k = rng.int(1, Math.floor(40 / h));
        const [a, b, c] = rng.chance(0.5) ? [p * k, q * k, h * k] : [q * k, p * k, h * k];
        return { kind, a, b, c };
      }
      if (kind === 'equiR' || kind === 'equir') return { kind, k: rng.int(2, 16) };
      const base = rng.pick(HERONIAN);
      const k = rng.int(1, Math.max(1, Math.floor(30 / Math.max(...base))));
      const [a, b, c] = rng.shuffle(base.map((side) => side * k));
      return { kind, a, b, c };
    },
    answer(p) {
      if (p.kind === 'rightR') return p.c / 2;
      if (p.kind === 'rightr') return (p.a + p.b - p.c) / 2;
      if (p.kind === 'equiR') return p.k;
      if (p.kind === 'equir') return p.k / 2;
      const s = (p.a + p.b + p.c) / 2;
      return Math.sqrt(s * (s - p.a) * (s - p.b) * (s - p.c)) / s;
    },
    distractors(p) {
      const clean = (list) => list.map((d) => (hasAtMostDecimals(d.value, 2) ? d : { ...d, value: null }));
      if (p.kind === 'rightR' || p.kind === 'rightr') {
        const { a, b, c } = p;
        const R = c / 2;
        const r = (a + b - c) / 2;
        if (p.kind === 'rightR') {
          return clean([
            { value: c, why: 'gave the hypotenuse, which is the diameter' },
            { value: r, why: 'found the inradius instead' },
            { value: Math.max(a, b) / 2, why: 'halved the longer leg instead of the hypotenuse' },
            { value: (a * b) / c, why: 'found the altitude to the hypotenuse' }
          ]);
        }
        return clean([
          { value: R, why: 'found the circumradius instead' },
          { value: 2 * r, why: 'forgot to halve a + b − c' },
          { value: r / 2, why: 'divided the area by the perimeter, not the semi-perimeter' },
          { value: (a + b + c) / 2, why: 'stopped at the semi-perimeter' }
        ]);
      }
      if (p.kind === 'equiR' || p.kind === 'equir') {
        const { k } = p;
        const height = (3 * k) / 2;
        if (p.kind === 'equiR') {
          return clean([
            { value: k / 2, why: 'found the inradius a ÷ (2√3)' },
            { value: height, why: 'gave the height (√3/2)a' },
            { value: 3 * k, why: 'multiplied the side by √3 instead of dividing' },
            { value: 2 * k, why: 'doubled R' }
          ]);
        }
        return clean([
          { value: k, why: 'found the circumradius a ÷ √3' },
          { value: height, why: 'gave the height (√3/2)a' },
          { value: height / 2, why: 'took half the height instead of a third' },
          { value: 3 * k, why: 'multiplied the side by √3 instead of dividing' }
        ]);
      }
      const { a, b, c } = p;
      const s = (a + b + c) / 2;
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      return clean([
        { value: area / (2 * s), why: 'divided the area by the perimeter, not the semi-perimeter' },
        { value: (2 * area) / s, why: 'used r = 2 × Area ÷ s' },
        { value: (a * b * c) / (4 * area), why: 'found the circumradius abc ÷ (4 × Area)' },
        { value: (2 * area) / Math.max(a, b, c), why: 'gave the shortest altitude instead' }
      ]);
    },
    // Construct the triangle, then the centre from its defining lines, and measure the radius.
    verify(p, value) {
      const sides = p.kind === 'equiR' || p.kind === 'equir' ? [p.k * Math.sqrt(3), p.k * Math.sqrt(3), p.k * Math.sqrt(3)] : [p.a, p.b, p.c];
      const t = p.kind.startsWith('right') ? { A: { x: 0, y: p.a }, B: { x: 0, y: 0 }, C: { x: p.b, y: 0 } } : triangleFromSides(...sides);
      if (!t) return false;
      if (p.kind.startsWith('right') && !measuresAs(angleAt(t.B, t.A, t.C), 90)) return false;
      if (p.kind === 'rightR' || p.kind === 'equiR') {
        const O = perpendicularBisectorMeet(t);
        return Boolean(O) && [t.A, t.B, t.C].every((v) => nearlyEqual(dist(O, v), value, 1e-9));
      }
      const I = bisectorMeet(t);
      return Boolean(I) && [[t.A, t.B], [t.B, t.C], [t.C, t.A]].every(([q, r]) => nearlyEqual(distanceToLine(I, q, r), value, 1e-9));
    },
    render(p, { fmt: show }) {
      const askR = p.kind === 'rightR' || p.kind === 'equiR';
      const word = askR ? 'circumradius (the radius of the circle through all three vertices)' : 'inradius (the radius of the circle that touches all three sides)';
      const X = askR ? 'O' : 'I';
      if (p.kind === 'rightR' || p.kind === 'rightr') {
        const { a, b, c } = p;
        const t = { A: { x: 0, y: a }, B: { x: 0, y: 0 }, C: { x: b, y: 0 } };
        const R = c / 2;
        const r = (a + b - c) / 2;
        const g = { ...t, [X]: askR ? mid(t.A, t.C) : { x: r, y: r } };
        const caption = `Right triangle ABC: AB = ${cm(a)}, BC = ${cm(b)}, right-angled at B`;
        return {
          question: `In triangle ABC, ∠B = 90°, AB = ${cm(a)} and BC = ${cm(b)}. What is its ${word}?`,
          figure: {
            type: 'diagram',
            caption,
            points: figurePoints(g, centreOf(t), { [X]: { labelOffset: [6, -8] } }),
            shapes: [
              { type: 'polygon', points: ['A', 'B', 'C'] },
              { type: 'segment', from: 'A', to: 'B', label: cm(a), labelOffset: [-26, 0] },
              { type: 'segment', from: 'B', to: 'C', label: cm(b), labelOffset: [0, 14] },
              { type: 'circle', center: X, radius: askR ? R : r, style: 'dashed' }
            ],
            rightAngles: [{ at: 'B', from: 'A', to: 'C' }],
            ariaSummary: `${caption}. The dashed circle is its ${askR ? 'circumcircle, centre O' : 'incircle, centre I'}.`
          },
          explanation: askR
            ? `The hypotenuse AC = √(${a}² + ${b}²) = ${c} cm. In a right triangle the hypotenuse is a diameter of the circumcircle, so R = ${c} ÷ 2 = ${show(R)}.`
            : `The hypotenuse AC = √(${a}² + ${b}²) = ${c} cm. For a right triangle r = (a + b − c) ÷ 2 = (${a} + ${b} − ${c}) ÷ 2 = ${show(r)}. Check: Area ÷ s = ${(a * b) / 2} ÷ ${(a + b + c) / 2} = ${fmt(r, 2)}.`,
          solutionSteps: askR
            ? [`AC² = ${a * a} + ${b * b} = ${c * c}, so AC = ${c}.`, `R = AC ÷ 2 = ${fmt(R, 2)}.`]
            : [`AC² = ${a * a} + ${b * b} = ${c * c}, so AC = ${c}.`, `r = (${a} + ${b} − ${c}) ÷ 2 = ${fmt(r, 2)}.`],
          method: askR ? 'Right triangle: R = hypotenuse ÷ 2.' : 'Right triangle: r = (a + b − c) ÷ 2, or Area ÷ s.',
          hints: [
            'Find the hypotenuse first with Pythagoras.',
            askR ? 'The circumcentre of a right triangle is the midpoint of its hypotenuse.' : 'r = Area ÷ s, where s is half the perimeter.'
          ],
          commonMistakes: askR ? [`Giving the whole hypotenuse, ${c} cm: that is the diameter.`] : [`Forgetting to halve a + b − c, giving ${2 * r} cm.`]
        };
      }
      if (p.kind === 'equiR' || p.kind === 'equir') {
        const { k } = p;
        const side = k * Math.sqrt(3);
        const t = triangleFromSides(side, side, side);
        const centre = centreOf(t);
        const g = { ...t, [X]: centre };
        const caption = `Equilateral triangle ABC with side ${k}√3 cm`;
        const value = askR ? k : k / 2;
        return {
          question: `An equilateral triangle ABC has side ${k}√3 cm. What is its ${word}?`,
          figure: {
            type: 'diagram',
            caption,
            points: figurePoints(g, centre, { [X]: { labelOffset: [6, -8] } }),
            shapes: [
              { type: 'polygon', points: ['A', 'B', 'C'] },
              { type: 'segment', from: 'B', to: 'C', label: `${k}√3 cm`, labelOffset: [0, 14] },
              { type: 'circle', center: X, radius: value, style: 'dashed' }
            ],
            ticks: [
              { on: ['A', 'B'], count: 1 },
              { on: ['B', 'C'], count: 1 },
              { on: ['C', 'A'], count: 1 }
            ],
            ariaSummary: `${caption}; all three sides are marked equal. The dashed circle is its ${askR ? 'circumcircle, centre O' : 'incircle, centre I'}.`
          },
          explanation: askR
            ? `R = a ÷ √3 = ${k}√3 ÷ √3 = ${show(k)}. (The height is (√3/2) × ${k}√3 = ${fmt((3 * k) / 2, 2)} cm, and R is two-thirds of it.)`
            : `r = a ÷ (2√3) = ${k}√3 ÷ (2√3) = ${show(k / 2)}. (The height is (√3/2) × ${k}√3 = ${fmt((3 * k) / 2, 2)} cm, and r is one-third of it.)`,
          solutionSteps: askR
            ? [`Height = (√3/2) × ${k}√3 = ${fmt((3 * k) / 2, 2)}.`, `R = (2/3) × ${fmt((3 * k) / 2, 2)} = ${k}.`]
            : [`Height = (√3/2) × ${k}√3 = ${fmt((3 * k) / 2, 2)}.`, `r = (1/3) × ${fmt((3 * k) / 2, 2)} = ${fmt(k / 2, 2)}.`],
          method: askR ? 'Equilateral: R = a ÷ √3.' : 'Equilateral: r = a ÷ (2√3).',
          hints: ['In an equilateral triangle all four centres coincide at the centroid.', 'The centroid splits the height 2 : 1, so R is 2/3 of the height and r is 1/3.'],
          commonMistakes: [`Giving the full height, ${fmt((3 * k) / 2, 2)} cm.`, askR ? `Mixing up R and r: r = ${fmt(k / 2, 2)} cm.` : `Mixing up R and r: R = ${k} cm.`]
        };
      }
      const { a, b, c } = p;
      const s = (a + b + c) / 2;
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      const r = area / s;
      // Sides as BC = a, CA = b, AB = c.
      const t = triangleFromSides(a, b, c);
      const g = { ...t, I: bisectorMeet(t) };
      const caption = `Triangle ABC with BC = ${cm(a)}, CA = ${cm(b)}, AB = ${cm(c)}`;
      return {
        question: `Triangle ABC has sides BC = ${cm(a)}, CA = ${cm(b)} and AB = ${cm(c)}. What is its inradius (the radius of the circle that touches all three sides)?`,
        figure: {
          type: 'diagram',
          caption,
          points: figurePoints(g, centreOf(t), { I: { labelOffset: [6, -8] } }),
          shapes: [
            { type: 'polygon', points: ['A', 'B', 'C'] },
            { type: 'segment', from: 'B', to: 'C', label: cm(a), labelOffset: [0, 14] },
            { type: 'circle', center: 'I', radius: r, style: 'dashed' }
          ],
          ariaSummary: `${caption}. The dashed circle is its incircle, centre I.`
        },
        explanation: `s = (${a} + ${b} + ${c}) ÷ 2 = ${fmt(s, 2)}. By Heron's formula, Area = √(${fmt(s, 2)} × ${fmt(s - a, 2)} × ${fmt(s - b, 2)} × ${fmt(s - c, 2)}) = ${fmt(area, 2)} cm². r = Area ÷ s = ${fmt(area, 2)} ÷ ${fmt(s, 2)} = ${show(r)}.`,
        solutionSteps: [`s = ${fmt(s, 2)}.`, `Area = √(${fmt(s, 2)} × ${fmt(s - a, 2)} × ${fmt(s - b, 2)} × ${fmt(s - c, 2)}) = ${fmt(area, 2)}.`, `r = ${fmt(area, 2)} ÷ ${fmt(s, 2)} = ${fmt(r, 2)}.`],
        method: 'Inradius r = Area ÷ s.',
        hints: ['Find the semi-perimeter s first.', "Use Heron's formula for the area, then divide by s."],
        commonMistakes: [`Dividing by the perimeter ${a + b + c} instead of s, giving ${fmt(r / 2, 2)} cm.`]
      };
    }
  },

  /* ================================ congruence ================================ */
  {
    id: 'tri-adv-congruence-rule',
    version: 1,
    topicId: 'triangles',
    conceptId: 'tri-adv-congruence',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tri-adv-congruence-f'],
    estimatedSeconds: 45,
    params(rng) {
      const rule = rng.pick(['SSS', 'SAS', 'ASA', 'AAS', 'RHS', 'SSA', 'AAA']);
      const start = rng.int(0, 2);
      const roles = [start, (start + 1) % 3, (start + 2) % 3];
      const parts = rng.shuffle(rulePartsFor(rule, roles));
      return { rule, parts, other: rng.pick(SECOND_TRIANGLES) };
    },
    answer: ({ rule }) => RULE_ANSWER[rule],
    distractors: ({ rule }) => CONGRUENCE_DISTRACTORS[rule],
    verify: ({ parts }, value) => classifyParts(parts) === value,
    render({ rule, parts, other }) {
      const first = 'ABC';
      const sideName = (tri, [i, j]) => `${tri[Math.min(i, j)]}${tri[Math.max(i, j)]}`;
      const partText = (part) => {
        if (part.kind === 'side') return `${sideName(first, part.v)} = ${sideName(other, part.v)}`;
        return `∠${first[part.v]} = ∠${other[part.v]}${part.right ? ' = 90°' : ''}`;
      };
      const listed = parts.map(partText);
      const list = `${listed.slice(0, -1).join(', ')} and ${listed[listed.length - 1]}`;
      const answer = RULE_ANSWER[rule];
      return {
        question: `In triangles ABC and ${other}, ${list}. Which rule, if any, guarantees that ΔABC ≅ Δ${other}?`,
        explanation: `${RULE_EXPLANATION[rule]} Answer: ${answer}.`,
        solutionSteps: [
          `Equal parts: ${listed.join('; ')}.`,
          whereStep(parts, first, sideName),
          RULE_EXPLANATION[rule]
        ],
        method: 'Match the equal parts to SSS, SAS, ASA, AAS or RHS; SSA and AAA prove nothing.',
        hints: ['Count how many sides and how many angles are equal.', 'For two sides and an angle, is the angle between the two sides? For two angles and a side, is the side between the angles?'],
        commonMistakes: rule === 'SSA' || rule === 'AAA'
          ? [`Treating ${rule} as a congruence rule.`]
          : rule === 'RHS'
            ? ['Ruling it out as SSA: with a right angle and the hypotenuse it is RHS.']
            : rule === 'SSS'
              ? ['Looking for an equal angle as well: three equal sides are enough.']
              : rule === 'SAS'
                ? ['Calling it SSA without checking which sides form the equal angle.']
                : [`Requiring the side to lie between the angles: ${rule === 'AAS' ? 'AAS' : 'ASA'} is a valid test as it stands.`]
      };
    }
  }
];
