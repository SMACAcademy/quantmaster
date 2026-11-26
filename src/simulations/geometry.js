/**
 * Simulations for lines and angles, quadrilaterals, perimeter and area, 2D
 * mensuration (shaded regions) and recasting solids. The flat figures are
 * `geometry` plots in model units (see components/simPlots.js); the solids reuse
 * the 3D renderer of the questions (utils/solidGeometry.js).
 */

import { near, niceRange, show } from './core.js';
import { clipLineToRect } from '../utils/planeGeometry.js';

const RAD = Math.PI / 180;
/** The geometry picture is 560 px wide with 18 px of padding: a view this wide for its height fills it. */
const aspect = (height) => (560 - 36) / (height - 36);

/** Widen a view about its centre to the picture's shape, so lines drawn to its edge reach the picture's edge. */
function fitView(xMin, xMax, yMin, yMax, ratio) {
  const width = xMax - xMin;
  const height = yMax - yMin;
  if (width / height < ratio) {
    const extra = (height * ratio - width) / 2;
    return { xMin: xMin - extra, xMax: xMax + extra, yMin, yMax };
  }
  const extra = (width / ratio - height) / 2;
  return { xMin, xMax, yMin: yMin - extra, yMax: yMax + extra };
}

const unit = ([x, y]) => {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
};

/** The angle at `p` between the rays to `a` and `b`, in degrees. */
function angleAt(p, a, b) {
  const u = [a[0] - p[0], a[1] - p[1]];
  const v = [b[0] - p[0], b[1] - p[1]];
  const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  return Math.acos(Math.max(-1, Math.min(1, cos))) / RAD;
}

const degrees = (value) => `${show(value, 1)}°`;

/* ---------------------------- lines and angles ---------------------------- */

/**
 * The eight angles where a transversal at `theta` degrees crosses two lines: the
 * upper one level, the lower one turned anticlockwise by `tilt` degrees (0 when
 * parallel). Numbered clockwise from the upper left, 1–4 at the upper line and
 * 5–8 at the lower one.
 */
export function transversalAngles(theta, tilt = 0) {
  const d = theta - tilt;
  return [180 - theta, theta, 180 - theta, theta, 180 - d, d, 180 - d, d];
}

/** Angle pairs by number (1–8, as above), with where they sit. */
const FAMILIES = {
  corresponding: {
    name: 'Corresponding',
    pairs: [
      [2, 6],
      [1, 5]
    ],
    where: ['upper right at each line', 'upper left at each line'],
    sum: false
  },
  alternate: {
    name: 'Alternate',
    pairs: [
      [4, 6],
      [3, 5]
    ],
    where: ['inside, a Z shape', 'inside, the other Z'],
    sum: false
  },
  'co-interior': {
    name: 'Co-interior',
    pairs: [
      [4, 5],
      [3, 6]
    ],
    where: ['inside, left of the transversal', 'inside, right of the transversal'],
    sum: true
  }
};
const PAIR_TONES = ['arithmetic', 'combinatorics'];

export const linesAngles = {
  id: 'lines-angles',
  topicId: 'lines-angles',
  title: 'Parallel lines and a transversal',
  summary: 'Turn a line across two parallel lines and only two angle sizes appear. Colour-matched pairs show which angles are equal and which add to 180°; tilt one line and the rules break.',
  controls: [
    { id: 'angle', label: 'Angle of the transversal', type: 'range', min: 30, max: 150, step: 5, default: 60, unit: '°' },
    {
      id: 'pair',
      label: 'Colour the pairs',
      type: 'choice',
      options: [
        { id: 'corresponding', label: 'Corresponding' },
        { id: 'alternate', label: 'Alternate' },
        { id: 'co-interior', label: 'Co-interior' }
      ],
      default: 'corresponding'
    },
    {
      id: 'lines',
      label: 'The two lines',
      type: 'choice',
      options: [
        { id: 'parallel', label: 'Parallel' },
        { id: 'tilted', label: 'Tilt the lower line' }
      ],
      default: 'parallel'
    },
    { id: 'tilt', label: 'Tilt of the lower line', type: 'range', min: -15, max: 15, step: 5, default: 10, unit: '°', showWhen: { lines: 'tilted' } }
  ],
  compute({ angle: theta, pair, lines, tilt: tiltValue }) {
    const tilt = lines === 'tilted' ? tiltValue : 0;
    const parallel = tilt === 0;
    const angles = transversalAngles(theta, tilt);
    const of = (k) => angles[k - 1];
    const family = FAMILIES[pair];
    const pairValues = family.pairs.map(([a, b]) => [of(a), of(b)]);
    const holds = pairValues.map(([a, b]) => (family.sum ? near(a + b, 180) : near(a, b)));
    const leftSum = of(4) + of(5);
    const rightSum = of(3) + of(6);
    const sizes = [...new Set(angles)].sort((a, b) => a - b);

    // The upper line is y = 1, the lower one passes through (0, −1), the transversal through the origin.
    const P = [Math.cos(theta * RAD) / Math.sin(theta * RAD), 1];
    const t = -Math.cos(tilt * RAD) / Math.sin((theta - tilt) * RAD);
    const Q = [t * Math.cos(theta * RAD), t * Math.sin(theta * RAD)];
    const height = 320;
    const view = fitView(Math.min(P[0], Q[0]) - 2.6, Math.max(P[0], Q[0]) + 2.6, Math.min(1, Q[1]) - 1.3, Math.max(1, Q[1]) + 1.3, aspect(height));
    const clip = (a, b) => {
      const ends = clipLineToRect({ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, [view.xMin, view.xMax], [view.yMin, view.yMax]);
      return ends ? { from: [ends[0].x, ends[0].y], to: [ends[1].x, ends[1].y] } : null;
    };
    const lineItems = [
      clip([0, 1], [1, 1]),
      clip([0, -1], [Math.cos(tilt * RAD), -1 + Math.sin(tilt * RAD)]),
      clip([0, 0], [Math.cos(theta * RAD), Math.sin(theta * RAD)])
    ]
      .filter(Boolean)
      .map((segment, i) => ({ type: 'segment', ...segment, tone: i === 2 ? 'algebra' : undefined }));

    // Each angle as a sector: [vertex, from, to] in degrees anticlockwise from the x-axis.
    const sector = (k) => {
      const at = k <= 4 ? P : Q;
      const base = k <= 4 ? 0 : tilt;
      const spans = {
        1: [theta, base + 180],
        2: [base, theta],
        3: [theta + 180, base + 360],
        4: [base + 180, theta + 180]
      };
      return [at, ...spans[((k - 1) % 4) + 1]];
    };
    const highlighted = family.pairs.flatMap((ks, i) =>
      ks.map((k) => {
        const [at, from, to] = sector(k);
        return { type: 'angle', at, from, to, radius: 28, tone: PAIR_TONES[i] };
      })
    );
    const toneOf = new Map(family.pairs.flatMap((ks, i) => ks.map((k) => [k, PAIR_TONES[i]])));
    const labels = angles.map((value, i) => {
      const [at, from, to] = sector(i + 1);
      const middle = ((from + to) / 2) * RAD;
      // Far enough along the bisector to clear both arms, even in a narrow angle.
      const distance = Math.min(90, Math.max(46, 16 / Math.sin(((to - from) / 2) * RAD)));
      return { type: 'label', at, text: degrees(value), dx: distance * Math.cos(middle), dy: -distance * Math.sin(middle), tone: toneOf.get(i + 1), strong: toneOf.has(i + 1) };
    });
    // Arrow marks on the two lines while they are parallel, as in a textbook.
    const marks = parallel
      ? [
          { type: 'arrows', from: [view.xMax - 1.6, 1], to: [view.xMax - 0.6, 1], count: 1 },
          { type: 'arrows', from: [view.xMax - 1.6, -1], to: [view.xMax - 0.6, -1], count: 1 }
        ]
      : [];

    const pairText = ([a, b], ok) =>
      family.sum ? `${degrees(a)} + ${degrees(b)} = ${degrees(a + b)}${ok ? '' : ', not 180°'}` : `${degrees(a)} and ${degrees(b)}: ${ok ? 'equal' : 'not equal'}`;
    const right = near(theta, 90) && parallel;
    const meetSide = leftSum < 180 ? 'left' : 'right';
    return {
      numbers: { theta, tilt, parallel, angles, pairValues, holds, leftSum, rightSum, sizes: sizes.length },
      readouts: [
        { label: `${family.name}, ${family.where[0]} (blue)`, value: pairText(pairValues[0], holds[0]) },
        { label: `${family.name}, ${family.where[1]} (pink)`, value: pairText(pairValues[1], holds[1]) },
        { label: 'Different angle sizes', value: `${sizes.length}: ${sizes.map(degrees).join(', ')}` },
        { label: 'Inside angles on one side add to', value: parallel ? '180° on each side' : `${degrees(leftSum)} on the left, ${degrees(rightSum)} on the right` }
      ],
      plot: {
        kind: 'geometry',
        view,
        height,
        items: [...highlighted, ...lineItems, ...marks, { type: 'point', at: P }, { type: 'point', at: Q }, ...labels],
        summary: `Two ${parallel ? 'parallel' : 'non-parallel'} lines cut by a transversal at ${theta}°. The eight angles are ${angles.map(degrees).join(', ')}. ${family.name} pairs: ${pairValues
          .map(([a, b]) => `${degrees(a)} and ${degrees(b)}`)
          .join('; ')}.`
      },
      insight: right
        ? 'The transversal is perpendicular to the lines, so all eight angles are right angles.'
        : !parallel
          ? `The lines are not parallel, so the pairs no longer match: they differ by the tilt, ${degrees(Math.abs(tilt))}. The inside angles on the ${meetSide} add to ${degrees(Math.min(leftSum, rightSum))}, less than 180°, and the lines meet on that side.`
          : family.sum
            ? `Co-interior angles sit between the lines on the same side (a C shape). They are not equal; they add to 180°: ${degrees(of(4))} + ${degrees(of(5))}.`
            : `${family.name} angles are equal when the lines are parallel (${pair === 'alternate' ? 'a Z shape' : 'an F shape'}). Only two sizes appear, ${degrees(theta)} and ${degrees(180 - theta)}, and they add to 180°.`
    };
  },
  tasks: [
    {
      id: 'right',
      prompt: 'Make all eight angles equal. What size are they?',
      check: (values, n) => n.parallel && near(n.theta, 90),
      solution: { lines: 'parallel', angle: 90 }
    },
    {
      id: 'co-interior',
      prompt: 'Colour the co-interior pairs and make one of those angles 110°. What is its partner?',
      check: (values, n) => values.pair === 'co-interior' && n.parallel && (n.theta === 110 || n.theta === 70),
      solution: { pair: 'co-interior', angle: 110 }
    },
    {
      id: 'break',
      prompt: 'Tilt the lower line. Are corresponding angles still equal?',
      check: (values, n) => values.pair === 'corresponding' && !n.parallel,
      solution: { pair: 'corresponding', lines: 'tilted', tilt: 10 }
    },
    {
      id: 'meet',
      prompt: 'Tilt the lower line so the inside angles on the left add to 170°. On which side do the lines meet?',
      check: (values, n) => !n.parallel && near(n.leftSum, 170),
      solution: { lines: 'tilted', tilt: -10 }
    }
  ]
};

/* ------------------------------ quadrilaterals ------------------------------ */

const sideLength = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const sameLength = (a, b) => Math.abs(a - b) < 1e-6;
const isParallel = (a, b, c, d) => {
  const u = unit([b[0] - a[0], b[1] - a[1]]);
  const v = unit([d[0] - c[0], d[1] - c[1]]);
  return Math.abs(u[0] * v[1] - u[1] * v[0]) < 1e-9;
};

/**
 * What a convex quadrilateral ABCD is, measured from its corners: sides AB, BC,
 * CD, DA; angles at A, B, C, D; which opposite sides are parallel; the diagonals
 * (equal? bisecting each other? at what angle?), and its most specific name.
 */
export function classifyQuadrilateral(points) {
  const [A, B, C, D] = points;
  const sides = [sideLength(A, B), sideLength(B, C), sideLength(C, D), sideLength(D, A)];
  const angles = points.map((p, i) => angleAt(p, points[(i + 3) % 4], points[(i + 1) % 4]));
  const abParallelCd = isParallel(A, B, D, C);
  const bcParallelDa = isParallel(B, C, A, D);
  const allEqual = sides.every((s) => sameLength(s, sides[0]));
  const rightAngles = angles.filter((a) => Math.abs(a - 90) < 1e-6).length;
  const ac = sideLength(A, C);
  const bd = sideLength(B, D);
  const bisect = sideLength([(A[0] + C[0]) / 2, (A[1] + C[1]) / 2], [(B[0] + D[0]) / 2, (B[1] + D[1]) / 2]) < 1e-6;
  const u = [C[0] - A[0], C[1] - A[1]];
  const v = [D[0] - B[0], D[1] - B[1]];
  const crossing = Math.acos(Math.abs(u[0] * v[0] + u[1] * v[1]) / (ac * bd)) / RAD;
  const perpendicular = Math.abs(crossing - 90) < 1e-6;
  const kite = (sameLength(sides[0], sides[1]) && sameLength(sides[2], sides[3])) || (sameLength(sides[1], sides[2]) && sameLength(sides[3], sides[0]));
  let name;
  if (abParallelCd && bcParallelDa) name = allEqual ? (rightAngles ? 'Square' : 'Rhombus') : rightAngles ? 'Rectangle' : 'Parallelogram';
  else if (abParallelCd || bcParallelDa) {
    const legs = abParallelCd ? [sides[1], sides[3]] : [sides[0], sides[2]];
    name = rightAngles ? 'Right trapezium' : sameLength(...legs) ? 'Isosceles trapezium' : 'Trapezium';
  } else name = kite ? 'Kite' : 'Quadrilateral';
  return {
    sides,
    angles,
    angleSum: angles.reduce((sum, a) => sum + a, 0),
    parallelPairs: (abParallelCd ? 1 : 0) + (bcParallelDa ? 1 : 0),
    abParallelCd,
    bcParallelDa,
    allEqual,
    rightAngles,
    diagonals: { ac, bd, equal: sameLength(ac, bd), bisect, perpendicular, crossing },
    name
  };
}

/** The corners A, B, C, D (anticlockwise from the lower left) for the chosen properties. */
export function quadPoints({ sides, equal, right, angle }) {
  const a = (right === 'on' ? 90 : angle) * RAD;
  const at = (length) => [length * Math.cos(a), length * Math.sin(a)];
  if (equal === 'on') {
    // Four equal sides force both pairs of opposite sides to be parallel: a rhombus.
    const D = at(3);
    return [[0, 0], [3, 0], [3 + D[0], D[1]], D];
  }
  if (sides === 'both') {
    const D = at(2.6);
    return [[0, 0], [4, 0], [4 + D[0], D[1]], D];
  }
  if (sides === 'one') {
    const D = at(3);
    return [[0, 0], [5, 0], [D[0] + 2.4, D[1]], D];
  }
  return [[0, 0], [4.4, 0], [3.8, 3], at(2.6)];
}

export const quadrilaterals = {
  id: 'quadrilaterals',
  topicId: 'quadrilaterals',
  title: 'The quadrilateral family',
  summary: 'Ask for parallel sides, equal sides or a right angle, and the shape snaps from parallelogram to rhombus or rectangle to square. The name, the diagonals and the 360° update as it changes.',
  controls: [
    {
      id: 'sides',
      label: 'Opposite sides parallel',
      type: 'choice',
      options: [
        { id: 'none', label: 'None' },
        { id: 'one', label: 'One pair' },
        { id: 'both', label: 'Both pairs' }
      ],
      default: 'both'
    },
    {
      id: 'equal',
      label: 'All four sides equal',
      type: 'choice',
      options: [
        { id: 'off', label: 'No' },
        { id: 'on', label: 'Yes' }
      ],
      default: 'off'
    },
    {
      id: 'right',
      label: 'A right angle at A',
      type: 'choice',
      options: [
        { id: 'off', label: 'No' },
        { id: 'on', label: 'Yes' }
      ],
      default: 'off'
    },
    { id: 'angle', label: 'Angle A', type: 'range', min: 45, max: 135, step: 5, default: 70, unit: '°', showWhen: { right: 'off' } }
  ],
  compute(values) {
    const points = quadPoints(values);
    const q = classifyQuadrilateral(points);
    const { diagonals: d } = q;
    const snapped = values.equal === 'on' && values.sides !== 'both';
    const names = ['A', 'B', 'C', 'D'];
    const centre = [points.reduce((s, p) => s + p[0], 0) / 4, points.reduce((s, p) => s + p[1], 0) / 4];

    // Equal sides share a number of tick marks; parallel sides share a number of arrows.
    const edges = points.map((p, i) => [p, points[(i + 1) % 4]]);
    const groups = [];
    q.sides.forEach((s, i) => {
      const group = groups.find((g) => sameLength(q.sides[g[0]], s));
      if (group) group.push(i);
      else groups.push([i]);
    });
    // Ticks sit a third of the way along a side and arrows two thirds, so the two never overlap.
    const along = (a, b, from, to) => ({ from: [a[0] + (b[0] - a[0]) * from, a[1] + (b[1] - a[1]) * from], to: [a[0] + (b[0] - a[0]) * to, a[1] + (b[1] - a[1]) * to] });
    const ticks = groups
      .filter((g) => g.length > 1)
      .flatMap((g, k) => g.map((i) => ({ type: 'ticks', ...along(edges[i][0], edges[i][1], 0.2, 0.46), count: k + 1 })));
    // Arrows on a parallel pair point the same way; on DC and AD that runs against the edge (C to D, D to A).
    const arrow = (a, b, count, against) => ({ type: 'arrows', ...along(a, b, against ? 0.2 : 0.54, against ? 0.46 : 0.8), count });
    const arrows = [
      ...(q.abParallelCd ? [arrow(points[0], points[1], 1, false), arrow(points[3], points[2], 1, true)] : []),
      ...(q.bcParallelDa ? [arrow(points[1], points[2], 2, false), arrow(points[0], points[3], 2, true)] : [])
    ];
    // Each shape fills the picture: the view is the shape's own box with room for the labels.
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const height = 300;
    const view = fitView(Math.min(...xs) - 0.8, Math.max(...xs) + 0.8, Math.min(...ys) - 0.6, Math.max(...ys) + 0.6, aspect(height));
    const corners = points.flatMap((p, i) => {
      const prev = points[(i + 3) % 4];
      const next = points[(i + 1) % 4];
      const toPrev = unit([prev[0] - p[0], prev[1] - p[1]]);
      const toNext = unit([next[0] - p[0], next[1] - p[1]]);
      const inward = unit([toPrev[0] + toNext[0], toPrev[1] + toNext[1]]);
      const outward = unit([p[0] - centre[0], p[1] - centre[1]]);
      const isRight = Math.abs(q.angles[i] - 90) < 1e-6;
      return [
        { type: 'label', at: p, text: names[i], dx: outward[0] * 18, dy: -outward[1] * 18, strong: true },
        { type: 'label', at: p, text: degrees(q.angles[i]), dx: inward[0] * (isRight ? 40 : 34), dy: -inward[1] * (isRight ? 40 : 34) },
        ...(isRight ? [{ type: 'right', at: p, a: prev, b: next }] : [])
      ];
    });
    const yesNo = (flag) => (flag ? 'Yes' : 'No');
    const list = (xs) => xs.map((x) => show(x, 2)).join(', ');

    return {
      numbers: {
        name: q.name,
        angleSum: q.angleSum,
        parallelPairs: q.parallelPairs,
        allEqual: q.allEqual,
        rightAngles: q.rightAngles,
        ac: d.ac,
        bd: d.bd,
        diagonalsEqual: d.equal,
        bisect: d.bisect,
        perpendicular: d.perpendicular,
        crossing: d.crossing,
        snapped
      },
      readouts: [
        { label: 'Name', value: q.name },
        { label: 'Angles A + B + C + D', value: `${q.angles.map(degrees).join(' + ')} = ${degrees(q.angleSum)}` },
        { label: 'Sides AB, BC, CD, DA', value: list(q.sides) },
        { label: 'Diagonals AC and BD', value: `${show(d.ac, 2)} and ${show(d.bd, 2)}: ${d.equal ? 'equal' : 'not equal'}` },
        { label: 'Diagonals bisect each other', value: yesNo(d.bisect) },
        { label: 'Diagonals cross at', value: d.perpendicular ? '90°: perpendicular' : degrees(d.crossing) }
      ],
      plot: {
        kind: 'geometry',
        view,
        height,
        items: [
          { type: 'polygon', points, tone: 'geometry' },
          { type: 'segment', from: points[0], to: points[2], dashed: true, thin: true },
          { type: 'segment', from: points[1], to: points[3], dashed: true, thin: true },
          ...ticks,
          ...arrows,
          ...points.map((p) => ({ type: 'point', at: p })),
          ...corners
        ],
        summary: `${q.name} ABCD with angles ${q.angles.map(degrees).join(', ')} (sum ${degrees(q.angleSum)}), sides ${list(q.sides)}. Diagonals ${show(d.ac, 2)} and ${show(d.bd, 2)}, crossing at ${degrees(d.crossing)}.`
      },
      insight: snapped
        ? 'Four equal sides cannot stay with fewer than two parallel pairs: the shape snaps to a rhombus, so every rhombus is a parallelogram.'
        : {
            Square: 'A square is a rhombus and a rectangle at once: four equal sides, four right angles, and diagonals that are equal, cross at 90° and bisect each other.',
            Rhombus: `A rhombus is a parallelogram with four equal sides: opposite angles equal (${degrees(q.angles[0])} and ${degrees(q.angles[1])}), and diagonals that bisect each other at right angles, though they are not equal.`,
            Rectangle: 'A rectangle is a parallelogram with a right angle: one right angle makes all four 90°, opposite sides stay equal, and the diagonals become equal.',
            Parallelogram: `Opposite sides are parallel and equal, opposite angles are equal (A = C = ${degrees(q.angles[0])}, B = D = ${degrees(q.angles[1])}) and neighbours add to 180°. The diagonals bisect each other but are not equal.`,
            Trapezium: `Only one pair of parallel sides (AB and DC), so the angles along each slanted side add to 180°: A + D = ${degrees(q.angles[0] + q.angles[3])}.`,
            'Right trapezium': 'One pair of parallel sides and a right angle at A: the angle at D is a right angle too, since A + D = 180°.',
            'Isosceles trapezium': 'One pair of parallel sides and equal slanted sides, so the diagonals are equal too.',
            Kite: 'Two pairs of equal neighbouring sides: the diagonals cross at right angles.',
            Quadrilateral: 'No parallel sides and no equal sides, yet the four angles still add to 360°: a diagonal splits any quadrilateral into two triangles.'
          }[q.name]
    };
  },
  tasks: [
    {
      id: 'rhombus',
      prompt: 'Make the diagonals cross at right angles without making a square.',
      check: (values, n) => n.perpendicular && n.name !== 'Square',
      solution: { equal: 'on', right: 'off' }
    },
    {
      id: 'rectangle',
      prompt: 'Make the diagonals equal but keep two different side lengths.',
      check: (values, n) => n.diagonalsEqual && !n.allEqual,
      solution: { sides: 'both', equal: 'off', right: 'on' }
    },
    {
      id: 'square',
      prompt: 'Make a square. Which diagonal facts does it keep from the rhombus and which from the rectangle?',
      check: (values, n) => n.name === 'Square',
      solution: { equal: 'on', right: 'on' }
    },
    {
      id: 'snap',
      prompt: 'Ask for four equal sides with only one pair of parallel sides. What do you get?',
      check: (values) => values.equal === 'on' && values.sides === 'one',
      solution: { sides: 'one', equal: 'on' }
    }
  ]
};

/* ---------------------------- perimeter and area ---------------------------- */

const FENCE = 24;
const PLOT_AREA = 36;
const SQUARE_SIDE = 6;

/** Width, perimeter and area of a rectangle of length `length` with the perimeter or the area held fixed. */
export function fixedRectangle(mode, length) {
  const width = mode === 'perimeter' ? FENCE / 2 - length : PLOT_AREA / length;
  return { length, width, perimeter: 2 * (length + width), area: length * width };
}

export const perimeterArea = {
  id: 'perimeter-area',
  topicId: 'perimeter-area',
  title: 'Same fence, different area',
  summary: 'Bend 24 m of fence into rectangles and watch the area trace a parabola that peaks at the square. Then fix the area instead: the square needs the least fence.',
  controls: [
    {
      id: 'mode',
      label: 'Keep fixed',
      type: 'choice',
      options: [
        { id: 'perimeter', label: 'Perimeter 24 m' },
        { id: 'area', label: 'Area 36 m²' }
      ],
      default: 'perimeter'
    },
    { id: 'length', label: 'Length', type: 'range', min: 1, max: 11, step: 0.5, default: 3, unit: 'm', showWhen: { mode: 'perimeter' } },
    { id: 'side', label: 'Length', type: 'range', min: 2, max: 18, step: 0.5, default: 4, unit: 'm', showWhen: { mode: 'area' } }
  ],
  compute({ mode, length: fenceLength, side }) {
    const fixedFence = mode === 'perimeter';
    const l = fixedFence ? fenceLength : side;
    const { width: w, perimeter, area } = fixedRectangle(mode, l);
    const square = near(l, SQUARE_SIDE);
    const curve = fixedFence
      ? Array.from({ length: 49 }, (_, i) => [i / 4, (i / 4) * (FENCE / 2 - i / 4)])
      : Array.from({ length: 65 }, (_, i) => [2 + i / 4, fixedRectangle('area', 2 + i / 4).perimeter]);
    const m = (x) => `${show(x, 2)} m`;
    // The view hugs the rectangle and the dashed 6 m square together, so the two always compare at one scale.
    const height = 300;
    const big = Math.max(l, w, SQUARE_SIDE);
    const rectangle = {
      kind: 'geometry',
      view: fitView(-big * 0.22, Math.max(l, SQUARE_SIDE) + big * 0.45, -big * 0.12, Math.max(w, SQUARE_SIDE) + big * 0.08, aspect(height)),
      height,
      items: [
        { type: 'polygon', points: [[0, 0], [SQUARE_SIDE, 0], [SQUARE_SIDE, SQUARE_SIDE], [0, SQUARE_SIDE]], dashed: true, fill: 0 },
        { type: 'polygon', points: [[0, 0], [l, 0], [l, w], [0, w]], tone: 'geometry', fill: 0.28 },
        { type: 'label', at: [l / 2, 0], text: m(l), dy: 14 },
        { type: 'label', at: [0, w / 2], text: m(w), dx: -8, anchor: 'end' },
        { type: 'label', at: [l / 2, w / 2], text: fixedFence ? `${show(area, 2)} m²` : `${show(perimeter, 2)} m round`, strong: true },
        { type: 'label', at: [SQUARE_SIDE, SQUARE_SIDE], text: 'the 6 m square', dx: 6, dy: -10, anchor: 'start' }
      ],
      summary: `A rectangle ${m(l)} by ${m(w)}: perimeter ${m(perimeter)}, area ${show(area, 2)} square metres. The dashed square is 6 m by 6 m.`
    };
    const graph = {
      kind: 'xy',
      x: { label: 'Length (m)', min: 0, max: fixedFence ? 12 : 18 },
      y: fixedFence ? { label: 'Area (m²)', min: 0, max: 40 } : { label: 'Perimeter (m)', min: 0, max: 45 },
      series: [{ id: 'curve', label: fixedFence ? 'Area' : 'Perimeter', tone: 'geometry', points: curve }],
      guides: [{ axis: 'x', value: SQUARE_SIDE, label: 'square' }],
      markers: [{ x: l, y: fixedFence ? area : perimeter, tone: 'combinatorics', label: fixedFence ? `${show(area, 2)} m²` : m(perimeter) }],
      summary: fixedFence
        ? `Area against length for a 24 m perimeter: a parabola from 0 at length 0 up to 36 at length 6 and back to 0 at 12. Now at length ${show(l, 2)}: ${show(area, 2)} square metres.`
        : `Perimeter against length for a 36 square metre area: lowest, 24 m, at length 6. Now at length ${show(l, 2)}: ${m(perimeter)}.`
    };
    return {
      numbers: { mode, length: l, width: w, perimeter, area, square },
      readouts: [
        { label: 'Length × width', value: `${m(l)} × ${m(w)}` },
        { label: 'Perimeter = 2(l + w)', value: `2(${show(l, 2)} + ${show(w, 2)}) = ${m(perimeter)}` },
        { label: 'Area = l × w', value: `${show(area, 2)} m²` },
        fixedFence
          ? { label: 'The square with this fence', value: `6 m × 6 m = 36 m²${square ? ' (this one)' : `, ${show(36 - area, 2)} m² more`}` }
          : { label: 'The square with this area', value: `6 m × 6 m needs 24 m${square ? ' (this one)' : `, ${m(perimeter - 24)} less`}` }
      ],
      plot: { kind: 'stack', plots: [rectangle, graph], summary: `${rectangle.summary} ${graph.summary}` },
      insight: fixedFence
        ? square
          ? 'The square: 6 × 6 = 36 m², the most area 24 m of fence can hold. It sits at the top of the parabola.'
          : `Area = l × (12 − l), a parabola. A length of ${show(l, 2)} m gives ${show(area, 2)} m², and so does ${show(12 - l, 2)} m: the curve is symmetric about the square at 6 m.`
        : square
          ? 'The square: 36 m² with only 24 m of fence, the least any rectangle of this area needs.'
          : `Same 36 m², but ${m(perimeter)} of fence. The longer and thinner the rectangle, the more fence it needs; the square needs only 24 m.`
    };
  },
  tasks: [
    {
      id: 'most',
      prompt: 'With 24 m of fence, enclose the largest area you can. What shape is it?',
      check: (values, n) => n.mode === 'perimeter' && n.square,
      solution: { mode: 'perimeter', length: 6 }
    },
    {
      id: 'twenty',
      prompt: 'With 24 m of fence, enclose exactly 20 m². Is there a second length that does it?',
      check: (values, n) => n.mode === 'perimeter' && near(n.area, 20),
      solution: { mode: 'perimeter', length: 10 }
    },
    {
      id: 'least',
      prompt: 'Keep the area at 36 m² and use the least fence.',
      check: (values, n) => n.mode === 'area' && n.square,
      solution: { mode: 'area', side: 6 }
    },
    {
      id: 'thirty',
      prompt: 'Keep the area at 36 m² and find a rectangle that needs exactly 30 m of fence.',
      check: (values, n) => n.mode === 'area' && near(n.perimeter, 30),
      solution: { mode: 'area', side: 12 }
    }
  ]
};

/* --------------------------- 2D mensuration: shaded --------------------------- */

/** π as the exam takes it. */
const PI = 22 / 7;
/** Each figure fills its picture: the labels give the sizes. */
const HEIGHT_2D = 300;

/** Outer, inner and shaded areas of the three figures (π = 22/7). */
export function shadedArea(values) {
  if (values.figure === 'square') {
    const a = values.side;
    const r = a / 2;
    return { outer: a * a, inner: PI * r * r, r };
  }
  if (values.figure === 'path') {
    const { length: l, breadth: b, path: w } = values;
    return { outer: (l + 2 * w) * (b + 2 * w), inner: l * b };
  }
  const R = values.outer;
  const r = R - values.band;
  return { outer: PI * R * R, inner: PI * r * r, r };
}

export const mensuration2d = {
  id: 'mensuration-2d',
  topicId: 'mensuration-2d',
  title: 'Shaded area = outer − inner',
  summary: 'Corners left by a circle in a square, a path round a garden, a ring: each shaded region is the outer area minus the inner one. Resize them and follow the formula.',
  controls: [
    {
      id: 'figure',
      label: 'Figure',
      type: 'choice',
      options: [
        { id: 'square', label: 'Circle in a square' },
        { id: 'path', label: 'Path round a garden' },
        { id: 'ring', label: 'Ring' }
      ],
      default: 'square'
    },
    { id: 'side', label: 'Side of the square', type: 'range', min: 4, max: 28, step: 2, default: 10, unit: 'cm', showWhen: { figure: 'square' } },
    { id: 'length', label: 'Garden length', type: 'range', min: 10, max: 40, step: 2, default: 20, unit: 'm', showWhen: { figure: 'path' } },
    { id: 'breadth', label: 'Garden breadth', type: 'range', min: 6, max: 30, step: 2, default: 12, unit: 'm', showWhen: { figure: 'path' } },
    { id: 'path', label: 'Path width', type: 'range', min: 1, max: 5, step: 0.5, default: 2, unit: 'm', showWhen: { figure: 'path' } },
    { id: 'outer', label: 'Outer radius R', type: 'range', min: 8, max: 28, step: 1, default: 14, unit: 'cm', showWhen: { figure: 'ring' } },
    { id: 'band', label: 'Width of the ring', type: 'range', min: 1, max: 7, step: 1, default: 7, unit: 'cm', showWhen: { figure: 'ring' } }
  ],
  compute(values) {
    const { figure } = values;
    const { outer, inner, r } = shadedArea(values);
    const shaded = outer - inner;
    const share = (shaded / outer) * 100;
    const unitName = figure === 'path' ? 'm' : 'cm';
    const sq = `${unitName}²`;
    const n = (x) => show(x, 2);
    let readouts;
    let items;
    let view;
    let words;
    let insight;
    if (figure === 'square') {
      const a = values.side;
      readouts = [
        { label: 'Square = a²', value: `${n(a)}² = ${n(outer)} ${sq}` },
        { label: 'Circle = πr², r = a ÷ 2', value: `22/7 × ${n(r)}² = ${n(inner)} ${sq}` },
        { label: 'Shaded = square − circle', value: `${n(outer)} − ${n(inner)} = ${n(shaded)} ${sq}` },
        { label: 'Shaded share of the square', value: `${n(share)}% (always 3/14)` }
      ];
      view = fitView(-0.15 * a, 1.15 * a, -0.18 * a, 1.08 * a, aspect(HEIGHT_2D));
      items = [
        { type: 'region', outer: { rect: [0, 0, a, a] }, holes: [{ circle: [a / 2, a / 2, r] }], tone: 'geometry' },
        { type: 'polygon', points: [[0, 0], [a, 0], [a, a], [0, a]], fill: 0 },
        { type: 'circle', center: [a / 2, a / 2], r, fill: 0 },
        { type: 'segment', from: [a / 2, a / 2], to: [a, a / 2], dashed: true, thin: true },
        { type: 'point', at: [a / 2, a / 2] },
        { type: 'label', at: [(3 * a) / 4, a / 2], text: `r = ${n(r)}`, dy: -12 },
        { type: 'label', at: [a / 2, 0], text: `a = ${n(a)} cm`, dy: 14 }
      ];
      words = `A ${n(a)} cm square with a circle of radius ${n(r)} cm inside it`;
      insight = `The four corners are the square minus the circle: ${n(outer)} − ${n(inner)} = ${n(shaded)} ${sq}. Whatever the side, they are 1 − π/4 of the square, about 21.4%: double the side and every area grows four times.`;
    } else if (figure === 'path') {
      const { length: l, breadth: b, path: w } = values;
      readouts = [
        { label: 'Garden with path = (l + 2w)(b + 2w)', value: `${n(l + 2 * w)} × ${n(b + 2 * w)} = ${n(outer)} ${sq}` },
        { label: 'Garden = l × b', value: `${n(l)} × ${n(b)} = ${n(inner)} ${sq}` },
        { label: 'Path = outer − garden', value: `${n(outer)} − ${n(inner)} = ${n(shaded)} ${sq}` },
        { label: 'Shortcut 2w(l + b + 2w)', value: `2 × ${n(w)} × ${n(l + b + 2 * w)} = ${n(2 * w * (l + b + 2 * w))} ${sq}` }
      ];
      const pad = 0.08 * Math.max(l, b);
      view = fitView(-w - pad, l + w + pad, -w - 2 * pad, b + w + pad, aspect(HEIGHT_2D));
      items = [
        { type: 'region', outer: { rect: [-w, -w, l + 2 * w, b + 2 * w] }, holes: [{ rect: [0, 0, l, b] }], tone: 'geometry' },
        { type: 'polygon', points: [[-w, -w], [l + w, -w], [l + w, b + w], [-w, b + w]], fill: 0 },
        { type: 'polygon', points: [[0, 0], [l, 0], [l, b], [0, b]], tone: 'data', fill: 0.12 },
        { type: 'label', at: [l / 2, b / 2], text: `garden ${n(l)} × ${n(b)}`, strong: true },
        { type: 'label', at: [l / 2, -w], text: `path ${n(w)} m wide`, dy: 14 }
      ];
      words = `A ${n(l)} m by ${n(b)} m garden with a path ${n(w)} m wide all round it`;
      insight = near(shaded, inner)
        ? `The path covers exactly as much ground as the garden: ${n(shaded)} ${sq} each, because the outer rectangle is twice the garden.`
        : `The path is the big rectangle minus the garden. The big one is l + 2w by b + 2w: the path adds ${n(w)} m on both sides, so add 2w, not w.`;
    } else {
      const R = values.outer;
      readouts = [
        { label: 'Outer circle = πR²', value: `22/7 × ${n(R)}² = ${n(outer)} ${sq}` },
        { label: 'Inner circle = πr², r = R − width', value: `22/7 × ${n(r)}² = ${n(inner)} ${sq}` },
        { label: 'Ring = π(R² − r²)', value: `${n(outer)} − ${n(inner)} = ${n(shaded)} ${sq}` },
        { label: 'Same as π(R + r)(R − r)', value: `22/7 × ${n(R + r)} × ${n(R - r)} = ${n(PI * (R + r) * (R - r))} ${sq}` }
      ];
      view = fitView(-1.12 * R, 1.12 * R, -1.12 * R, 1.12 * R, aspect(HEIGHT_2D));
      items = [
        { type: 'region', outer: { circle: [0, 0, R] }, holes: [{ circle: [0, 0, r] }], tone: 'geometry' },
        { type: 'circle', center: [0, 0], r: R, fill: 0 },
        { type: 'circle', center: [0, 0], r, fill: 0 },
        { type: 'segment', from: [0, 0], to: [R, 0], dashed: true, thin: true },
        { type: 'segment', from: [0, 0], to: [0, r], dashed: true, thin: true },
        { type: 'point', at: [0, 0] },
        { type: 'label', at: [(r + R) / 2, 0], text: `R = ${n(R)}`, dy: 12 },
        { type: 'label', at: [0, r / 2], text: `r = ${n(r)}`, dx: 6, anchor: 'start' }
      ];
      words = `A ring between circles of radius ${n(R)} cm and ${n(r)} cm`;
      insight = `A ring is the outer circle minus the inner one: π(R² − r²) = π(R + r)(R − r). The same ${n(R - r)} cm width holds more area further out, because R + r grows.`;
    }
    return {
      numbers: { figure, outer, inner, shaded, share },
      readouts,
      plot: {
        kind: 'geometry',
        view,
        height: HEIGHT_2D,
        items,
        summary: `${words}: shaded area ${n(outer)} − ${n(inner)} = ${n(shaded)} square ${unitName === 'm' ? 'metres' : 'centimetres'}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'corners',
      prompt: 'Make the four shaded corners of the square exactly 42 cm². What is the side?',
      check: (values, n) => n.figure === 'square' && near(n.shaded, 42),
      solution: { figure: 'square', side: 14 }
    },
    {
      id: 'path-garden',
      prompt: 'Make the path cover as much ground as the garden itself.',
      check: (values, n) => n.figure === 'path' && near(n.shaded, n.inner),
      solution: { figure: 'path', length: 20, breadth: 6, path: 2 }
    },
    {
      id: 'ring',
      prompt: 'Keep the ring 7 cm wide and make its area 770 cm². What is R?',
      check: (values, n) => n.figure === 'ring' && values.band === 7 && near(n.shaded, 770),
      solution: { figure: 'ring', outer: 21, band: 7 }
    }
  ]
};

/* --------------------------- recasting a solid --------------------------- */

/** The big solids, both 288π cm³: a sphere of radius 6, a cylinder of radius 6 and height 8. Areas in units of π. */
const BIG = {
  sphere: { label: 'Sphere, r = 6 cm', volume: 288, area: 144, parts: [{ shape: 'sphere', r: 6 }] },
  cylinder: { label: 'Cylinder, r = 6 cm, h = 8 cm', volume: 288, area: 2 * 6 * (6 + 8), parts: [{ shape: 'cylinder', r: 6, h: 8 }] }
};

/**
 * `count` equal small solids with the same total volume (in units of π): spheres,
 * or cones whose height is 4/3 of the radius (so the slant is 5/3 of it, a 3-4-5
 * triangle). Returns each one's radius (and height, slant) and the total surface.
 */
export function recast(volume, into, count) {
  if (into === 'spheres') {
    const r = Math.cbrt((3 * volume) / (4 * count));
    return { r, each: (4 / 3) * r ** 3, area: count * 4 * r * r };
  }
  const r = Math.cbrt((9 * volume) / (4 * count));
  const h = (4 * r) / 3;
  const l = (5 * r) / 3;
  return { r, h, l, each: (r * r * h) / 3, area: count * (r * r + r * l) };
}

export const volumeSurfaceArea = {
  id: 'volume-surface-area',
  topicId: 'volume-surface-area',
  title: 'Melt it down: volume stays, surface grows',
  summary: 'Melt a sphere or a cylinder into many small spheres or cones. The total volume never changes, but the total surface area keeps growing.',
  controls: [
    {
      id: 'from',
      label: 'Melt down',
      type: 'choice',
      options: [
        { id: 'sphere', label: 'A sphere' },
        { id: 'cylinder', label: 'A cylinder' }
      ],
      default: 'sphere'
    },
    {
      id: 'into',
      label: 'Recast into',
      type: 'choice',
      options: [
        { id: 'spheres', label: 'Small spheres' },
        { id: 'cones', label: 'Small cones (h = 4r/3)' }
      ],
      default: 'spheres'
    },
    { id: 'count', label: 'How many', type: 'range', min: 1, max: 100, step: 1, default: 4 }
  ],
  compute({ from, into, count }) {
    const big = BIG[from];
    const small = recast(big.volume, into, count);
    const ratio = small.area / big.area;
    const pi = (x) => `${show(x, 2)}π`;
    const cm = (x) => `${show(x, 2)} cm`;
    const shape = into === 'spheres' ? 'sphere' : 'cone';
    const sizes = into === 'spheres' ? `r = ${cm(small.r)}` : `r = ${cm(small.r)}, h = ${cm(small.h)}, slant ${cm(small.l)}`;
    const same = from === 'sphere' && into === 'spheres' && count === 1;
    const solids = {
      kind: 'solids',
      items: [
        { label: big.label, caption: `${pi(big.volume)} cm³`, tone: 'data', parts: big.parts },
        {
          label: count === 1 ? `One ${shape}` : `One of ${count} ${shape}s`,
          caption: `${pi(small.each)} cm³ each`,
          tone: 'geometry',
          parts: into === 'spheres' ? [{ shape: 'sphere', r: small.r }] : [{ shape: 'cone', r: small.r, h: small.h }]
        }
      ],
      summary: `${big.label}, ${pi(big.volume)} cubic centimetres, recast into ${count} ${shape}${count === 1 ? '' : 's'} with ${sizes}, drawn to the same scale.`
    };
    const bars = {
      kind: 'bars',
      y: { label: '× the original', min: 0, max: niceRange(0, Math.max(2, ratio)).max },
      bars: [
        { label: 'Volume (× before)', value: 1, tone: 'data' },
        { label: 'Surface area (× before)', value: ratio, tone: 'combinatorics' }
      ],
      baseline: 1,
      summary: `After recasting, the total volume is 1 times the original and the total surface area is ${show(ratio, 2)} times.`
    };
    return {
      numbers: { from, into, count, r: small.r, h: small.h ?? null, volumeAfter: count * small.each, areaBefore: big.area, areaAfter: small.area, ratio },
      readouts: [
        { label: 'Total volume (never changes)', value: `${pi(big.volume)} cm³ = ${count} × ${pi(small.each)} cm³` },
        { label: `Each small ${shape}`, value: sizes },
        { label: 'Total surface area', value: `${pi(big.area)} → ${pi(small.area)} cm²` },
        { label: 'Surface area grows', value: `× ${show(ratio, 2)}` }
      ],
      plot: { kind: 'stack', plots: [solids, bars], summary: `${solids.summary} ${bars.summary}` },
      insight: same
        ? 'One sphere from a sphere is the same sphere. Make more, smaller ones and watch the surface.'
        : into === 'spheres' && from === 'sphere'
          ? `${count} spheres of radius 6 ÷ ∛${count} = ${cm(small.r)} hold the same ${pi(big.volume)} cm³, but their surface is ∛${count} = ${show(ratio, 2)} times as much. Small pieces expose more surface: crushed ice melts faster.`
          : from === 'cylinder' && count === 1 && into === 'spheres'
            ? `The cylinder and the sphere hold the same 288π cm³, yet the cylinder needs ${pi(big.area)} cm² of surface and the sphere only 144π: a sphere wraps a volume in the least surface.`
            : `Volume before = volume after: ${count} × ${pi(small.each)} = ${pi(big.volume)} cm³, so each ${shape} has ${sizes}. The total surface goes from ${pi(big.area)} to ${pi(small.area)} cm².`
    };
  },
  tasks: [
    {
      id: 'double',
      prompt: 'Melt the sphere into small spheres with exactly twice its surface area. How many?',
      check: (values, n) => n.from === 'sphere' && n.into === 'spheres' && near(n.ratio, 2),
      solution: { from: 'sphere', into: 'spheres', count: 8 }
    },
    {
      id: 'three-four-five',
      prompt: 'Make cones of radius 3 cm (height 4 cm, slant 5 cm). How many does the metal make?',
      check: (values, n) => n.into === 'cones' && near(n.r, 3),
      solution: { into: 'cones', count: 24 }
    },
    {
      id: 'cylinder',
      prompt: 'Melt the cylinder into 27 equal spheres. What is each radius?',
      check: (values, n) => n.from === 'cylinder' && n.into === 'spheres' && n.count === 27,
      solution: { from: 'cylinder', into: 'spheres', count: 27 }
    }
  ]
};

export const geometrySims = [linesAngles, quadrilaterals, perimeterArea, mensuration2d, volumeSurfaceArea];
