/**
 * Circles advanced unit: sectors, arcs and segments (Phase E).
 *
 * Every instance comes with a figure drawn at its own radius and angle, with the
 * region the question asks about shaded. The independent checks never use the
 * θ/360 formulas: they measure a fine polygon along the arc (its area by the
 * shoelace formula, its length by adding up the tiny chords), and rescale from
 * the true π to the π the question tells the learner to use.
 */

import { fmt, gcd, hasAtMostDecimals, nearlyEqual } from '../core.js';

/* ------------------------------ shared helpers ------------------------------ */

const RAD = Math.PI / 180;
const cm = (v) => `${fmt(v)} cm`;
const cm2 = (v) => `${fmt(v)} cm²`;
const degText = (v) => `${fmt(v)}°`;
const r2 = (v) => Math.round(v * 100) / 100;

/** The π a question states, as a fraction and as text. */
const PI = {
  '22/7': { num: 22, den: 7, value: 22 / 7, text: 'Use π = 22/7.' },
  '3.14': { num: 157, den: 50, value: 3.14, text: 'Use π = 3.14.' }
};

/** A radius that keeps the numbers clean with that π: a multiple of 7 for 22/7, of 5 for 3.14. */
const pickRadius = (rng, pi, multiples = 5) => (pi === '22/7' ? 7 * rng.int(1, multiples) : 5 * rng.int(1, multiples + 1));

/** Arc length and sector area with the stated π, from the θ/360 formulas. */
const arcOf = (pi, r, theta) => (theta * 2 * PI[pi].num * r) / (360 * PI[pi].den);
const areaOf = (pi, r, theta) => (theta * PI[pi].num * r * r) / (360 * PI[pi].den);

/** A point on a circle of radius r about the origin, at a bearing (degrees clockwise from the top; y up). */
const onCircle = (bearing, r) => ({ x: r * Math.sin(bearing * RAD), y: r * Math.cos(bearing * RAD) });

/* ------------------- independent measurement (no θ/360 formulas) ------------------- */

const STEPS = 6000;

/** Points along the arc from bearing `start` to `end`, finely spaced. */
function arcPolyline(r, start, end) {
  const points = [];
  for (let k = 0; k <= STEPS; k++) points.push(onCircle(start + ((end - start) * k) / STEPS, r));
  return points;
}

function shoelace(points) {
  let twice = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    twice += p.x * q.y - q.x * p.y;
  });
  return Math.abs(twice) / 2;
}

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return total;
}

/**
 * Measure a sector of radius r and angle θ off a fine polygon, then rescale to the
 * stated π (arc and area are both proportional to π, so the factor is exact).
 */
function measureSector(pi, r, theta) {
  const arc = arcPolyline(r, 0, theta);
  const toStated = PI[pi].value / Math.PI;
  const triangle = shoelace([{ x: 0, y: 0 }, arc[0], arc[arc.length - 1]]);
  return { area: shoelace([{ x: 0, y: 0 }, ...arc]) * toStated, arc: pathLength(arc) * toStated, triangle };
}

/* --------------------------------- figures --------------------------------- */

/** Label offset (screen px) that puts a label of `chars` characters `distance` px out along a bearing. */
function labelAlong(bearing, distance, chars = 1) {
  const x = Math.sin(bearing * RAD) * distance;
  const y = -Math.cos(bearing * RAD) * distance;
  const halfWidth = chars * 3.4;
  // Point labels are drawn from their left end, on the baseline.
  const dx = x >= 0 ? (x > 6 ? x - 2 : x - halfWidth) : x < -6 ? x - 2 * halfWidth + 2 : x - halfWidth;
  return [Math.round(dx), Math.round(y + 4)];
}

/** Offset (screen px) for a label beside radius OA, on the side away from B, clear of the line however long the text. */
function besideRadius(A, r, text) {
  const d = 10 + 3.3 * text.length;
  return [Math.round((-A.y / r) * d), Math.round((-A.x / r) * d)];
}

/** How far out (px) to write an angle's label so it clears both arms, even for a narrow angle. */
const angleLabelRadius = (theta, text) => Math.round(Math.min(85, Math.max(30, (text.length * 3.6) / Math.sin((theta / 2) * RAD) + 10)));

/**
 * A sector OAB drawn from bearing `start` to `end` (a fan opening upwards unless a
 * start is given), shaded, with the radius OA labelled and the angle at O marked.
 * `arcLabel` writes beside a point M at the middle of the arc; `regionLabel` (for
 * example "?") is written inside the sector; `clock` adds the whole clock face.
 */
function sectorFigure({ r, theta, start = -theta / 2, radiusLabel, angleLabel, arcLabel, regionLabel, clock, caption, ariaSummary }) {
  const end = start + theta;
  const midBearing = start + theta / 2;
  const A = onCircle(start, r);
  const B = onCircle(end, r);
  const points = [
    { id: 'O', x: 0, y: 0, labelOffset: clock ? [-14, 14] : [-4, 18] },
    { id: 'A', x: r2(A.x), y: r2(A.y), ...(clock ? { label: '12', labelOffset: labelAlong(start, 14, 2) } : { labelOffset: labelAlong(start, 14) }) },
    { id: 'B', x: r2(B.x), y: r2(B.y), labelOffset: labelAlong(end, 14) }
  ];
  if (arcLabel) {
    const M = onCircle(midBearing, r);
    points.push({ id: 'M', x: r2(M.x), y: r2(M.y), label: arcLabel, labelOffset: labelAlong(clock ? midBearing + 180 : midBearing, 16, arcLabel.length) }); // inside the clock face, which fills the frame
  }
  if (regionLabel) {
    const X = onCircle(midBearing, theta < 50 ? 0.7 * r : 0.6 * r);
    points.push({ id: 'X', x: r2(X.x), y: r2(X.y), hidden: true });
  }
  const shapes = [];
  if (clock) shapes.push({ type: 'circle', center: 'O', radius: r, style: 'dashed' });
  shapes.push({ type: 'sector', center: 'O', radius: r, startAngle: start, endAngle: end });
  if (radiusLabel) shapes.push({ type: 'segment', from: 'O', to: 'A', label: radiusLabel, labelOffset: besideRadius(A, r, radiusLabel) });
  const region = { parts: [{ type: 'sector', center: 'O', radius: r, startAngle: start, endAngle: end }] };
  if (regionLabel) Object.assign(region, { label: regionLabel, labelAt: 'X' });
  return {
    type: 'diagram',
    caption,
    points,
    shapes,
    shaded: [region],
    ...(angleLabel ? { angles: [{ at: 'O', from: 'A', to: 'B', label: angleLabel, radius: 16, labelRadius: angleLabelRadius(theta, angleLabel) }] } : {}),
    ariaSummary
  };
}

/**
 * A circle with chord AB across the top, subtending θ at the centre O. The minor
 * segment (or, for `major`, the rest of the circle) is shaded.
 */
function segmentFigure({ r, theta, major, radiusLabel, angleLabel, chordLabel, regionLabel, caption, ariaSummary }) {
  const start = -theta / 2;
  const end = theta / 2;
  const A = onCircle(start, r);
  const B = onCircle(end, r);
  const points = [
    { id: 'O', x: 0, y: 0, labelOffset: [-4, 18] },
    { id: 'A', x: r2(A.x), y: r2(A.y), labelOffset: labelAlong(start, 14) },
    { id: 'B', x: r2(B.x), y: r2(B.y), labelOffset: labelAlong(end, 14) }
  ];
  if (regionLabel) {
    const depth = major ? -0.55 * r : (r * Math.cos((theta / 2) * RAD) + r) / 2;
    points.push({ id: 'X', x: 0, y: r2(depth), hidden: true });
  }
  const segment = { type: 'segment', center: 'O', radius: r, startAngle: start, endAngle: end };
  const shapes = [
    { type: 'circle', center: 'O', radius: r },
    { type: 'segment', from: 'O', to: 'A', style: 'dashed', ...(radiusLabel ? { label: radiusLabel, labelOffset: besideRadius(A, r, radiusLabel) } : {}) },
    { type: 'segment', from: 'O', to: 'B', style: 'dashed' },
    { type: 'segment', from: 'B', to: 'A', ...(chordLabel ? { label: chordLabel } : {}) }
  ];
  const region = { parts: major ? [{ type: 'circle', center: 'O', radius: r }, segment] : [segment] };
  if (regionLabel) Object.assign(region, { label: regionLabel, labelAt: 'X' });
  return {
    type: 'diagram',
    caption,
    points,
    shapes,
    shaded: [region],
    angles: [{ at: 'O', from: 'A', to: 'B', radius: 16, ...(angleLabel ? { label: angleLabel, labelRadius: angleLabelRadius(theta, angleLabel) } : {}) }],
    ariaSummary
  };
}

/* ------------------------- exact a + b√3 values (fractions) ------------------------- */

const frac = (n, d = 1) => {
  const g = gcd(n, d) || 1;
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: (sign * d) / g };
};
const add = (p, q) => frac(p.n * q.d + q.n * p.d, p.d * q.d);
const neg = (p) => ({ n: -p.n, d: p.d });
const times = (p, k) => frac(p.n * k.n, p.d * k.d);
const fracValue = (p) => p.n / p.d;

/** An exact area a + b√3: `{ q, s }`, both fractions. */
const exact = (q, s = frac(0)) => ({ q, s });
const plus = (x, y) => exact(add(x.q, y.q), add(x.s, y.s));
const minus = (x, y) => plus(x, exact(neg(y.q), neg(y.s)));
const exactValue = (x) => fracValue(x.q) + fracValue(x.s) * Math.sqrt(3);
const sameExact = (x, y) => x.q.n === y.q.n && x.q.d === y.q.d && x.s.n === y.s.n && x.s.d === y.s.d;

/** 14, 38.5 or 77/3: a terminating decimal of up to 2 places, else a fraction. */
function rationalText(p) {
  const v = Math.abs(p.n) / p.d;
  return hasAtMostDecimals(v, 2) ? fmt(v) : `${Math.abs(p.n)}/${p.d}`;
}
/** 49√3/4, 25√3, √3. */
function surdText(p) {
  const n = Math.abs(p.n);
  return `${n === 1 ? '' : n}√3${p.d === 1 ? '' : `/${p.d}`}`;
}

/** "56 cm²", "(77/3 − 49√3/4) cm²", "(924 + 441√3/4) cm²". */
function exactText(x) {
  if (x.s.n === 0) return `${x.q.n < 0 ? '−' : ''}${rationalText(x.q)} cm²`;
  if (x.q.n === 0) return `${x.s.n < 0 ? '−' : ''}${surdText(x.s)} cm²`;
  return `(${x.q.n < 0 ? '−' : ''}${rationalText(x.q)} ${x.s.n < 0 ? '−' : '+'} ${surdText(x.s)}) cm²`;
}

/** Reads an option text back into a number, for the independent check. */
function valueOfText(text) {
  const body = text.replace(/\s*cm²$/, '').replace(/[()\s]/g, '').replace(/−/g, '-').replace(/,/g, '');
  const terms = body.match(/[+-]?[^+-]+/g) || [];
  let total = 0;
  for (const term of terms) {
    const m = /^([+-]?)(\d+(?:\.\d+)?)?(√3)?(?:\/(\d+))?$/.exec(term);
    if (!m || (!m[2] && !m[3])) return NaN;
    const v = ((m[2] ? Number(m[2]) : 1) * (m[3] ? Math.sqrt(3) : 1)) / (m[4] ? Number(m[4]) : 1);
    total += m[1] === '-' ? -v : v;
  }
  return terms.length ? total : NaN;
}

/** Sector, triangle and circle for a segment question, exactly. */
function segmentParts(pi, r, theta) {
  const piFrac = frac(PI[pi].num, PI[pi].den);
  const circle = exact(times(piFrac, frac(r * r)));
  const sector = exact(times(piFrac, frac(r * r * theta, 360)));
  // ½ r² sin θ: sin 90° = 1; sin 60° = sin 120° = √3/2, giving (√3/4) r².
  const triangle = theta === 90 ? exact(frac(r * r, 2)) : exact(frac(0), frac(r * r, 4));
  const minor = minus(sector, triangle);
  return { circle, sector, triangle, minor, major: minus(circle, minor) };
}

/* ================================ templates ================================ */

export const advCircleSectorsTemplates = [
  /* ---------------- sector area or arc length from r and θ ---------------- */
  {
    id: 'cir-adv-sector-measure',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-sectors',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cir-adv-sector-f'],
    tags: ['advanced'],
    answerDecimals: 2,
    estimatedSeconds: 60,
    formatValue: (value, { ask }) => (ask === 'area' ? cm2(value) : cm(value)),
    params(rng) {
      const pi = rng.chance(0.7) ? '22/7' : '3.14';
      const r = pickRadius(rng, pi);
      const clock = rng.chance(0.3);
      // A minute hand turns 6° a minute.
      const theta = clock ? 6 * rng.pick([10, 15, 20, 25]) : rng.pick([30, 36, 40, 45, 60, 72, 80, 90, 108, 120, 135, 144, 150, 160]);
      const ask = rng.pick(['area', 'arc']);
      const value = ask === 'area' ? areaOf(pi, r, theta) : arcOf(pi, r, theta);
      if (!hasAtMostDecimals(value, 2)) return null;
      return { pi, r, theta, ask, clock };
    },
    answer: ({ pi, r, theta, ask }) => (ask === 'area' ? areaOf(pi, r, theta) : arcOf(pi, r, theta)),
    distractors({ pi, r, theta, ask }) {
      const area = areaOf(pi, r, theta);
      const arc = arcOf(pi, r, theta);
      return ask === 'area'
        ? [
            { value: arc, why: 'used 2πr (the arc length) in place of πr²' },
            { value: 2 * area, why: 'used θ/180 in place of θ/360' },
            { value: PI[pi].value * r * r - area, why: 'gave the rest of the circle (the major sector)' },
            { value: 4 * area, why: 'used the diameter as the radius' }
          ]
        : [
            { value: area, why: 'used πr² (the sector area) in place of 2πr' },
            { value: 2 * arc, why: 'used θ/180 in place of θ/360' },
            { value: arc / 2, why: 'used πr, half the circumference' },
            { value: 2 * PI[pi].value * r - arc, why: 'gave the major arc' }
          ];
    },
    verify({ pi, r, theta, ask }, value) {
      const measured = measureSector(pi, r, theta);
      return nearlyEqual(value, ask === 'area' ? measured.area : measured.arc, 1e-6);
    },
    render({ pi, r, theta, ask, clock }, { fmt: show }) {
      const minutes = theta / 6;
      const fraction = `${theta}/360`;
      const value = ask === 'area' ? areaOf(pi, r, theta) : arcOf(pi, r, theta);
      const piText = PI[pi].text;
      const whole = ask === 'area' ? `Whole circle: πr² = ${pi} × ${r}² = ${fmt(PI[pi].value * r * r)} cm²` : `Whole circumference: 2πr = 2 × ${pi} × ${r} = ${fmt(2 * PI[pi].value * r)} cm`;
      const question = clock
        ? ask === 'area'
          ? `The minute hand of a clock is ${r} cm long. What area does it sweep out in ${minutes} minutes? (${piText})`
          : `The minute hand of a clock is ${r} cm long. How far does its tip travel in ${minutes} minutes? (${piText})`
        : ask === 'area'
          ? `A sector of a circle of radius ${r} cm has a central angle of ${theta}°. What is the area of the sector? (${piText})`
          : `A sector of a circle of radius ${r} cm has a central angle of ${theta}°. What is the length of its arc? (${piText})`;
      const what = ask === 'area' ? 'the sector is shaded' : 'the sector is shaded and its arc is marked with a question mark';
      const figure = sectorFigure({
        r,
        theta,
        start: clock ? 0 : undefined,
        clock,
        radiusLabel: cm(r),
        angleLabel: clock ? `${minutes} min` : degText(theta),
        arcLabel: ask === 'arc' ? 'arc = ?' : null,
        regionLabel: ask === 'area' ? '?' : null,
        caption: clock ? `The minute hand sweeps a sector of radius ${cm(r)} in ${minutes} minutes; ${what}` : `Sector OAB of radius ${cm(r)} and angle ${theta}°; ${what}`,
        ariaSummary: clock
          ? `A clock face with centre O. The minute hand, ${cm(r)} long, turns from 12 at A to B, sweeping a shaded sector marked ${minutes} min.${ask === 'arc' ? ' The arc AB its tip travels along is marked with a question mark.' : ' The shaded sector is marked with a question mark.'}`
          : `Sector OAB with centre O, radius OA = ${cm(r)} and ∠AOB = ${theta}°. The sector is shaded.${ask === 'arc' ? ' The arc AB is marked with a question mark.' : ' The shaded sector is marked with a question mark.'}`
      });
      const angleStep = clock ? [`The minute hand turns 360° in 60 minutes, 6° a minute: ${minutes} × 6 = ${theta}°.`] : [];
      return {
        question,
        figure,
        explanation: `${clock ? `In ${minutes} minutes the minute hand turns ${minutes} × 6 = ${theta}°. ` : ''}The ${ask === 'area' ? 'sector' : 'arc'} is ${fraction} of the whole ${ask === 'area' ? 'circle' : 'circumference'}. ${whole}, so the ${ask === 'area' ? 'area' : 'arc'} is ${fraction} × ${fmt(ask === 'area' ? PI[pi].value * r * r : 2 * PI[pi].value * r)} = ${show(value)}.`,
        solutionSteps: [
          ...angleStep,
          `${ask === 'area' ? 'Sector area = (θ/360) × πr²' : 'Arc length = (θ/360) × 2πr'}.`,
          `${whole}.`,
          `(${fraction}) × ${fmt(ask === 'area' ? PI[pi].value * r * r : 2 * PI[pi].value * r)} = ${show(value)}.`
        ],
        method: ask === 'area' ? 'Sector area = (θ/360) × πr².' : 'Arc length = (θ/360) × 2πr.',
        hints: [
          clock ? 'How many degrees does the minute hand turn in one minute?' : `What fraction of the full turn is ${theta}°?`,
          ask === 'area' ? 'Take that fraction of the whole circle, πr².' : 'Take that fraction of the whole circumference, 2πr.'
        ],
        commonMistakes: [
          ask === 'area' ? 'Using 2πr instead of πr², which gives the arc length.' : 'Using πr² instead of 2πr, which gives the sector area.',
          'Dividing θ by 180 instead of 360, which doubles the answer.'
        ]
      };
    }
  },

  /* ---------------- θ or r from a given arc or area ---------------- */
  {
    id: 'cir-adv-sector-reverse',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-sectors',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cir-adv-sector-f', 'cir-sc-sector-half-arc'],
    tags: ['advanced'],
    answerDecimals: 2,
    estimatedSeconds: 75,
    formatValue: (value, { mode }) => (mode.startsWith('theta') ? degText(value) : cm(value)),
    params(rng) {
      const mode = rng.pick(['theta-arc', 'theta-area', 'r-arc', 'r-area-arc']);
      const pi = mode === 'r-area-arc' || rng.chance(0.7) ? '22/7' : '3.14';
      const r = pickRadius(rng, pi);
      const theta = rng.pick([30, 36, 40, 45, 60, 72, 80, 90, 108, 120, 135, 144, 150, 160]);
      const arc = arcOf(pi, r, theta);
      const area = areaOf(pi, r, theta);
      const needed = { 'theta-arc': [arc], 'theta-area': [area], 'r-arc': [arc], 'r-area-arc': [arc, area] }[mode];
      if (!needed.every((v) => hasAtMostDecimals(v, 2))) return null;
      return { mode, pi, r, theta };
    },
    answer: ({ mode, r, theta }) => (mode.startsWith('theta') ? theta : r),
    distractors({ mode, pi, r, theta }) {
      const arc = arcOf(pi, r, theta);
      const upTo360 = (v) => (v > 0 && v < 360 ? v : null);
      if (mode === 'theta-arc') {
        return [
          { value: theta / 2, why: 'used θ/180 in place of θ/360' },
          { value: upTo360(2 * theta), why: 'used πr in place of 2πr' },
          { value: 360 - theta, why: 'gave the angle of the major sector' },
          { value: theta / 4, why: 'used the diameter as the radius and θ/180' }
        ];
      }
      if (mode === 'theta-area') {
        return [
          { value: theta / 2, why: 'used θ/180 in place of θ/360' },
          { value: 360 - theta, why: 'gave the angle of the major sector' },
          { value: theta / 4, why: 'used the diameter as the radius' },
          { value: upTo360((theta * r) / 2), why: 'used 2πr in place of πr²' }
        ];
      }
      if (mode === 'r-arc') {
        return [
          { value: 2 * r, why: 'gave the diameter' },
          { value: r / 2, why: 'used θ/180 in place of θ/360' },
          { value: arc / (2 * PI[pi].value), why: 'took the arc as the whole circumference' }
        ];
      }
      return [
        { value: r / 2, why: 'used area = arc × r, forgetting the ½' },
        { value: 2 * r, why: 'gave the diameter' },
        { value: arc / (2 * PI[pi].value), why: 'took the arc as the whole circumference' }
      ];
    },
    verify({ mode, pi, r, theta }, value) {
      const arc = arcOf(pi, r, theta);
      const area = areaOf(pi, r, theta);
      // Build the sector the answer describes and measure it against the given numbers.
      if (mode === 'theta-arc') return nearlyEqual(measureSector(pi, r, value).arc, arc, 1e-6);
      if (mode === 'theta-area') return nearlyEqual(measureSector(pi, r, value).area, area, 1e-6);
      const measured = measureSector(pi, value, theta);
      if (mode === 'r-arc') return nearlyEqual(measured.arc, arc, 1e-6);
      return nearlyEqual(measured.arc, arc, 1e-6) && nearlyEqual(measured.area, area, 1e-6);
    },
    render({ mode, pi, r, theta }, { fmt: show }) {
      const arc = arcOf(pi, r, theta);
      const area = areaOf(pi, r, theta);
      const piText = PI[pi].text;
      const circumference = 2 * PI[pi].value * r;
      const circle = PI[pi].value * r * r;
      const fraction = (part, whole) => `${fmt(part)}/${fmt(whole)}`;
      if (mode === 'theta-arc' || mode === 'theta-area') {
        const byArc = mode === 'theta-arc';
        const given = byArc ? arc : area;
        const whole = byArc ? circumference : circle;
        const g = gcd(theta, 360);
        const share = `${theta / g}/${360 / g}`;
        const givenText = byArc ? `an arc of length ${cm(arc)}` : `an area of ${cm2(area)}`;
        return {
          question: `A sector of a circle of radius ${r} cm has ${givenText}. What is its central angle? (${piText})`,
          figure: sectorFigure({
            r,
            theta,
            radiusLabel: cm(r),
            angleLabel: '?',
            arcLabel: byArc ? `arc = ${cm(arc)}` : null,
            regionLabel: byArc ? null : cm2(area),
            caption: `Sector OAB of radius ${cm(r)} with ${givenText}; the sector is shaded and its angle is asked`,
            ariaSummary: `Sector OAB with centre O and radius OA = ${cm(r)}. The sector is shaded${byArc ? ` and its arc AB is marked ${cm(arc)}` : ` and marked ${cm2(area)}`}. The angle AOB is marked with a question mark.`
          }),
          explanation: `${byArc ? 'Arc' : 'Area'} ÷ ${byArc ? 'circumference' : 'circle area'} is the fraction of the full turn. ${byArc ? `Circumference = 2 × ${pi} × ${r} = ${fmt(whole)} cm` : `Circle = ${pi} × ${r}² = ${fmt(whole)} cm²`}, so θ = ${fraction(given, whole)} × 360° = ${show(theta)}.`,
          solutionSteps: [
            byArc ? 'θ/360 = arc ÷ 2πr.' : 'θ/360 = area ÷ πr².',
            byArc ? `2πr = 2 × ${pi} × ${r} = ${fmt(whole)} cm.` : `πr² = ${pi} × ${r}² = ${fmt(whole)} cm².`,
            `${fmt(given)} ÷ ${fmt(whole)} = ${share}.`,
            `θ = ${share} × 360 = ${theta}°.`
          ],
          method: byArc ? 'θ = (arc ÷ 2πr) × 360.' : 'θ = (area ÷ πr²) × 360.',
          hints: [byArc ? 'What fraction of the whole circumference is this arc?' : 'What fraction of the whole circle is this sector?', 'That same fraction of 360° is the angle.'],
          commonMistakes: ['Multiplying the fraction by 180° instead of 360°, which halves the angle.', 'Giving 360° − θ, the angle of the rest of the circle.']
        };
      }
      if (mode === 'r-arc') {
        return {
          question: `A sector with a central angle of ${theta}° has an arc of length ${cm(arc)}. What is the radius of the circle? (${piText})`,
          figure: sectorFigure({
            r,
            theta,
            radiusLabel: 'r = ?',
            angleLabel: degText(theta),
            arcLabel: `arc = ${cm(arc)}`,
            caption: `Sector OAB with angle ${theta}° and an arc of ${cm(arc)}; the sector is shaded and its radius is asked`,
            ariaSummary: `Sector OAB with centre O and ∠AOB = ${theta}°. The sector is shaded and its arc AB is marked ${cm(arc)}. The radius OA is marked r = ?.`
          }),
          explanation: `Arc = (θ/360) × 2πr, so 2πr = ${fmt(arc)} × 360/${theta} = ${fmt(circumference)} cm, the whole circumference. Then r = ${fmt(circumference)} ÷ (2 × ${pi}) = ${show(r)}.`,
          solutionSteps: [`Arc = (θ/360) × 2πr.`, `Whole circumference = ${fmt(arc)} × 360 ÷ ${theta} = ${fmt(circumference)} cm.`, `r = ${fmt(circumference)} ÷ (2 × ${pi}) = ${r} cm.`],
          method: 'Scale the arc up to the whole circumference, then divide by 2π.',
          hints: [`What fraction of the circle is a ${theta}° sector?`, 'The arc is that fraction of 2πr. Find 2πr first.'],
          commonMistakes: ['Dividing the arc itself by 2π, as if the arc were the whole circumference.', 'Giving the diameter instead of the radius.']
        };
      }
      return {
        question: `A sector of a circle has an area of ${cm2(area)} and an arc of length ${cm(arc)}. What is the radius of the circle?`,
        figure: sectorFigure({
          r,
          theta,
          radiusLabel: 'r = ?',
          arcLabel: `arc = ${cm(arc)}`,
          regionLabel: cm2(area),
          caption: `Sector OAB with an area of ${cm2(area)} and an arc of ${cm(arc)}; the sector is shaded and its radius is asked`,
          ariaSummary: `Sector OAB with centre O. The sector is shaded and marked ${cm2(area)}, and its arc AB is marked ${cm(arc)}. The radius OA is marked r = ?.`
        }),
        explanation: `A sector is like a triangle with base the arc and height the radius: area = ½ × arc × r. So r = 2 × area ÷ arc = 2 × ${fmt(area)} ÷ ${fmt(arc)} = ${show(r)}. Neither π nor the angle is needed.`,
        solutionSteps: ['Area = ½ × arc × r.', `${fmt(area)} = ½ × ${fmt(arc)} × r.`, `r = 2 × ${fmt(area)} ÷ ${fmt(arc)} = ${r} cm.`],
        method: 'Sector area = ½ × arc × r, solved for r.',
        hints: ['There is a formula linking area, arc and radius with no angle in it.', 'Area = ½ × arc × r.'],
        commonMistakes: ['Forgetting the ½: area ÷ arc gives half the radius.', 'Trying to find θ first: possible, but longer.']
      };
    }
  },

  /* ---------------- segment area for θ = 60°, 90° or 120° ---------------- */
  {
    id: 'cir-adv-segment-area',
    version: 1,
    topicId: 'circles',
    conceptId: 'cir-adv-segments',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cir-adv-segment-f', 'cir-sc-segment-angles'],
    tags: ['advanced'],
    estimatedSeconds: 90,
    params(rng) {
      const pi = rng.chance(0.7) ? '22/7' : '3.14';
      const r = pi === '22/7' ? 7 * rng.int(1, 4) : rng.pick([10, 20]);
      return { pi, r, theta: rng.pick([60, 90, 120]), ask: rng.pick(['minor', 'minor', 'major']), given: rng.pick(['angle', 'chord']) };
    },
    answer: ({ pi, r, theta, ask }) => exactText(segmentParts(pi, r, theta)[ask]),
    distractors({ pi, r, theta, ask }) {
      const { circle, sector, triangle, minor, major } = segmentParts(pi, r, theta);
      const right = exact(frac(r * r, 2));
      const candidates =
        ask === 'minor'
          ? [
              [sector, 'forgot to subtract the triangle'],
              [major, 'gave the major segment'],
              [minus(plus(sector, sector), triangle), 'used θ/180 for the sector'],
              theta === 90 ? [minus(sector, exact(frac(r * r))), 'forgot the ½ in the triangle'] : [minus(sector, right), 'took the triangle as right-angled (½r²)'],
              theta === 90 ? null : [minus(sector, plus(triangle, triangle)), 'used (√3/2)r² for the triangle']
            ]
          : [
              [minor, 'gave the minor segment'],
              [minus(circle, sector), 'forgot the triangle (that is the major sector)'],
              [minus(minus(circle, sector), triangle), 'subtracted the triangle instead of adding it'],
              [minus(circle, minus(plus(sector, sector), triangle)), 'used θ/180 for the sector']
            ];
      // Keep only positive areas that differ in value from the answer and from each other.
      const answer = segmentParts(pi, r, theta)[ask];
      const kept = [];
      for (const item of candidates) {
        if (!item) continue;
        const [x, why] = item;
        if (exactValue(x) <= 0 || sameExact(x, answer) || kept.some((k) => sameExact(k.x, x))) continue;
        kept.push({ x, why });
      }
      return kept.map(({ x, why }) => ({ value: exactText(x), why }));
    },
    verify({ pi, r, theta, ask }, value) {
      // Fine-polygon sector, rescaled to the stated π, minus the triangle OAB by the shoelace formula.
      const measured = measureSector(pi, r, theta);
      const minorSegment = measured.area - measured.triangle;
      const wholeCircle = measureSector(pi, r, 360).area;
      return nearlyEqual(valueOfText(value), ask === 'minor' ? minorSegment : wholeCircle - minorSegment, 1e-6);
    },
    render({ pi, r, theta, ask, given }) {
      const { circle, sector, triangle, minor, major } = segmentParts(pi, r, theta);
      const piText = PI[pi].text;
      const chordText = { 60: cm(r), 90: `${r}√2 cm`, 120: `${r}√3 cm` }[theta];
      const sectorText = exactText(sector);
      const triangleText = exactText(triangle);
      const asked = ask === 'minor' ? 'minor segment' : 'major segment';
      const setUp =
        given === 'angle'
          ? `A chord AB of a circle of radius ${r} cm subtends an angle of ${theta}° at the centre O.`
          : `In a circle of radius ${r} cm with centre O, the chord AB is ${chordText} long.`;
      const angleStep =
        given === 'chord'
          ? theta === 60
            ? 'OA = OB = AB, so triangle OAB is equilateral and ∠AOB = 60°.'
            : theta === 90
              ? `AB² = ${2 * r * r} = OA² + OB², so ∠AOB = 90° (Pythagoras).`
              : `The perpendicular from O bisects AB: half-chord ${r}√3/2 cm, so ∠AOB = 2 × 60° = 120°.`
          : null;
      const triangleStep =
        theta === 90 ? `Triangle OAB = ½ × ${r} × ${r} = ${triangleText}.` : `Triangle OAB = ½ × ${r}² × sin ${theta}° = (√3/4) × ${r}² = ${triangleText}.`;
      return {
        question: `${setUp} What is the area of the ${asked}? (${piText})`,
        figure: segmentFigure({
          r,
          theta,
          major: ask === 'major',
          radiusLabel: cm(r),
          angleLabel: given === 'angle' ? degText(theta) : null,
          chordLabel: given === 'chord' ? chordText : null,
          regionLabel: ask === 'major' || theta > 60 ? '?' : null,
          caption: `Circle of radius ${cm(r)} with chord AB${given === 'angle' ? ` subtending ${theta}° at O` : ` of ${chordText}`}; the ${asked} is shaded`,
          ariaSummary: `A circle with centre O and radius OA = ${cm(r)}. Chord AB ${given === 'angle' ? `subtends ∠AOB = ${theta}° at the centre` : `is ${chordText} long`}, with radii OA and OB dashed. The ${asked}${ask === 'minor' ? ', between chord AB and the shorter arc,' : ', everything on the far side of chord AB from the short arc,'} is shaded.`
        }),
        explanation: `${angleStep ? `${angleStep} ` : ''}Minor segment = sector OAB − triangle OAB. Sector = (${theta}/360) × ${pi} × ${r}² = ${sectorText}. ${triangleStep} Minor segment = ${exactText(minor)}.${ask === 'major' ? ` Major segment = circle − minor segment = ${exactText(circle)} − ${exactText(minor)} = ${exactText(major)}.` : ''}`,
        solutionSteps: [
          ...(angleStep ? [angleStep] : []),
          `Sector = (${theta}/360) × ${pi} × ${r}² = ${sectorText}.`,
          triangleStep,
          `Minor segment = sector − triangle = ${exactText(minor)}.`,
          ...(ask === 'major' ? [`Major segment = ${exactText(circle)} − minor = ${exactText(major)}.`] : [])
        ],
        method: ask === 'minor' ? 'Minor segment = sector − triangle.' : 'Major segment = circle − (sector − triangle).',
        hints: [
          given === 'chord' ? 'First find ∠AOB from the chord and the radius.' : 'Split the region into a sector and a triangle.',
          theta === 90 ? 'The triangle has a right angle at O: ½ × r × r.' : `The triangle's area is ½ r² sin ${theta}° = (√3/4) r².`,
          ...(ask === 'major' ? ['The major segment is the whole circle minus the minor segment.'] : [])
        ],
        commonMistakes: [
          'Giving the sector area, forgetting to subtract the triangle.',
          ask === 'major' ? 'Subtracting the triangle from the major sector instead of adding it.' : 'Giving the major segment instead of the minor one.'
        ]
      };
    }
  }
];
