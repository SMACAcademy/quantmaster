/** Perimeter and area, 3D mensuration, and volume/surface-area application templates. */

import { fmt, nearlyEqual } from '../core.js';

const PI = 22 / 7;
const cm = (v) => `${fmt(v)} cm`;
const cm2 = (v) => `${fmt(v)} cm²`;
const cm3 = (v) => `${fmt(v)} cm³`;

/** "An" before numbers read with a vowel sound (8, 11, 18, 80–89), else "A". */
const anArticle = (n) => (/^(8|11|18)/.test(String(n)) ? 'An' : 'A');

/** Within 0.1% of the true-π value: 22/7 and 3.14 both land inside it, a wrong formula doesn't. */
const closeToTruePi = (value, exact) => nearlyEqual(value, exact, 1e-3);

/* ------------------------------ figures ------------------------------ */

/** A 3D solid drawing (utils/solidGeometry.js): parts stack bottom to top, drawn to scale. */
function solidFigure(caption, ariaSummary, ...parts) {
  return { type: 'solid', caption, ariaSummary, parts };
}

function rectangleFigure(l, b, caption) {
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: 0, labelOffset: [-14, 10] },
      { id: 'B', x: l, y: 0, labelOffset: [10, 10] },
      { id: 'C', x: l, y: b, labelOffset: [10, -10] },
      { id: 'D', x: 0, y: b, labelOffset: [-14, -10] }
    ],
    shapes: [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }],
    rightAngles: [{ at: 'A', from: 'D', to: 'B' }],
    ariaSummary: caption
  };
}

function triangleHeightFigure(base, height, apexX, caption) {
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: 0, labelOffset: [-14, 10] },
      { id: 'B', x: base, y: 0, labelOffset: [10, 10] },
      { id: 'C', x: apexX, y: height, labelOffset: [-4, -12] },
      { id: 'H', x: apexX, y: 0, hidden: true }
    ],
    shapes: [
      { type: 'polygon', points: ['A', 'B', 'C'] },
      { type: 'segment', from: 'C', to: 'H', style: 'dashed' }
    ],
    rightAngles: [{ at: 'H', from: 'B', to: 'C' }],
    ariaSummary: caption
  };
}

function trapeziumFigure(top, bottom, height, caption) {
  const offset = (bottom - top) / 2;
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: 0, labelOffset: [-14, 10] },
      { id: 'B', x: bottom, y: 0, labelOffset: [10, 10] },
      { id: 'C', x: offset + top, y: height, labelOffset: [10, -10] },
      { id: 'D', x: offset, y: height, labelOffset: [-12, -10] },
      { id: 'H', x: offset, y: 0, hidden: true }
    ],
    shapes: [
      { type: 'polygon', points: ['A', 'B', 'C', 'D'] },
      { type: 'segment', from: 'D', to: 'H', style: 'dashed' }
    ],
    parallels: [{ on: ['A', 'B'], count: 1 }, { on: ['D', 'C'], count: 1 }],
    rightAngles: [{ at: 'H', from: 'B', to: 'D' }],
    ariaSummary: caption
  };
}

function rhombusFigure(d1, d2, caption) {
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: d2 / 2, labelOffset: [-14, 4] },
      { id: 'B', x: d1 / 2, y: d2, labelOffset: [-4, -12] },
      { id: 'C', x: d1, y: d2 / 2, labelOffset: [10, 4] },
      { id: 'D', x: d1 / 2, y: 0, labelOffset: [-4, 14] },
      { id: 'O', x: d1 / 2, y: d2 / 2, hidden: true }
    ],
    shapes: [
      { type: 'polygon', points: ['A', 'B', 'C', 'D'] },
      { type: 'segment', from: 'A', to: 'C', style: 'dashed' },
      { type: 'segment', from: 'B', to: 'D', style: 'dashed' }
    ],
    rightAngles: [{ at: 'O', from: 'C', to: 'B' }],
    ariaSummary: caption
  };
}

function circleFigure(r, showDiameter, caption) {
  const points = [
    { id: 'O', x: 0, y: 0, labelOffset: [-4, 16] },
    { id: 'A', x: r, y: 0, labelOffset: [10, 4] }
  ];
  const shapes = [{ type: 'circle', center: 'O', radius: r }];
  if (showDiameter) {
    points.push({ id: 'B', x: -r, y: 0, labelOffset: [-16, 4] });
    shapes.push({ type: 'segment', from: 'B', to: 'A', style: 'dashed' });
  } else {
    shapes.push({ type: 'segment', from: 'O', to: 'A', style: 'dashed' });
  }
  return { type: 'diagram', caption, points, shapes, ariaSummary: caption };
}

/**
 * A W × H rectangle with a w × h rectangle cut from its top-right corner. With
 * `shadeL`, the L that remains is shaded and the removed corner is outlined dashed.
 */
function lShapeFigure(W, H, w, h, caption, shadeL = false) {
  const figure = {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: 0, labelOffset: [-14, 10] },
      { id: 'B', x: W, y: 0, labelOffset: [10, 10] },
      { id: 'C', x: W, y: H - h, labelOffset: [10, 4] },
      { id: 'D', x: W - w, y: H - h, labelOffset: [8, 14] },
      { id: 'E', x: W - w, y: H, labelOffset: [8, -8] },
      { id: 'F', x: 0, y: H, labelOffset: [-14, -8] }
    ],
    shapes: [{ type: 'polygon', points: ['A', 'B', 'C', 'D', 'E', 'F'] }],
    ariaSummary: caption
  };
  if (!shadeL) return figure;
  figure.points.push({ id: 'G', x: W, y: H, hidden: true });
  figure.shapes.push({ type: 'segment', from: 'E', to: 'G', style: 'dashed' }, { type: 'segment', from: 'G', to: 'C', style: 'dashed' });
  figure.shaded = [{ parts: [{ type: 'polygon', points: ['A', 'B', 'C', 'D', 'E', 'F'] }] }];
  figure.ariaSummary = `${anArticle(W)} ${cm(W)} × ${cm(H)} rectangle with ${anArticle(w).toLowerCase()} ${cm(w)} × ${cm(h)} corner removed from its top right. The L shape that remains is shaded; the removed corner is outlined with dashed lines.`;
  return figure;
}

/** Square of side a with a circle (or four corner quarter-circles) of radius a/2 cut out. */
function squareCutoutFigure(a, quarters, caption) {
  const points = [
    { id: 'A', x: 0, y: 0, labelOffset: [-14, 10] },
    { id: 'B', x: a, y: 0, labelOffset: [10, 10] },
    { id: 'C', x: a, y: a, labelOffset: [10, -10] },
    { id: 'D', x: 0, y: a, labelOffset: [-14, -10] }
  ];
  const shapes = [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }];
  if (quarters) {
    // Arcs sweep clockwise from the top (0°); each covers the quarter pointing into the square.
    shapes.push(
      { type: 'arc', center: 'A', radius: a / 2, startAngle: 0, endAngle: 90 },
      { type: 'arc', center: 'B', radius: a / 2, startAngle: 270, endAngle: 360 },
      { type: 'arc', center: 'C', radius: a / 2, startAngle: 180, endAngle: 270 },
      { type: 'arc', center: 'D', radius: a / 2, startAngle: 90, endAngle: 180 }
    );
  } else {
    points.push({ id: 'O', x: a / 2, y: a / 2, hidden: true });
    shapes.push({ type: 'circle', center: 'O', radius: a / 2 });
  }
  // The area left: the square with the cut-outs taken away (odd-overlap shading).
  const cutouts = quarters
    ? shapes.filter((s) => s.type === 'arc').map(({ center, radius, startAngle, endAngle }) => ({ type: 'sector', center, radius, startAngle, endAngle }))
    : [{ type: 'circle', center: 'O', radius: a / 2 }];
  const left = quarters ? 'the middle of the square between the four quarter-circles' : 'the four corners of the square outside the circle';
  const base = quarters
    ? `Square ABCD of side ${cm(a)} with a quarter-circle of radius ${cm(a / 2)} cut from each corner`
    : `Square ABCD of side ${cm(a)} with a circle of radius ${cm(a / 2)} cut out of its middle`;
  return {
    type: 'diagram',
    caption,
    points,
    shapes,
    shaded: [{ parts: [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }, ...cutouts] }],
    ariaSummary: `${base}. The area left is shaded: ${left}.`
  };
}

/** An l × b garden with a path of width w around it (outside) or inside its edge. */
function pathFigure(l, b, w, outside, caption) {
  const [ol, ob, il, ib] = outside ? [l + 2 * w, b + 2 * w, l, b] : [l, b, l - 2 * w, b - 2 * w];
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: 0, labelOffset: [-14, 10] },
      { id: 'B', x: ol, y: 0, labelOffset: [10, 10] },
      { id: 'C', x: ol, y: ob, labelOffset: [10, -10] },
      { id: 'D', x: 0, y: ob, labelOffset: [-14, -10] },
      { id: 'P', x: w, y: w, hidden: true },
      { id: 'Q', x: w + il, y: w, hidden: true },
      { id: 'R', x: w + il, y: w + ib, hidden: true },
      { id: 'S', x: w, y: w + ib, hidden: true }
    ],
    shapes: [
      { type: 'polygon', points: ['A', 'B', 'C', 'D'] },
      { type: 'polygon', points: ['P', 'Q', 'R', 'S'], style: 'dashed' }
    ],
    // The path: the strip between the outer and inner rectangles.
    shaded: [{ parts: [{ type: 'polygon', points: ['A', 'B', 'C', 'D'] }, { type: 'polygon', points: ['P', 'Q', 'R', 'S'] }] }],
    ariaSummary: outside
      ? `A ${l} m × ${b} m garden (dashed) with an outer rectangle ${w} m beyond each of its sides. The ${w} m path between them is shaded.`
      : `A ${l} m × ${b} m garden with a dashed rectangle ${w} m in from each of its sides. The ${w} m path between the edge and the dashed rectangle is shaded.`
  };
}

/** A 2r × h rectangle with a semicircle of radius r on its top side. */
function rectSemicircleFigure(r, h, caption) {
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: 0, labelOffset: [-14, 10] },
      { id: 'B', x: 2 * r, y: 0, labelOffset: [10, 10] },
      { id: 'C', x: 2 * r, y: h, labelOffset: [10, 4] },
      { id: 'D', x: 0, y: h, labelOffset: [-14, 4] },
      { id: 'M', x: r, y: h, hidden: true }
    ],
    shapes: [
      { type: 'polygon', points: ['A', 'B', 'C', 'D'] },
      { type: 'arc', center: 'M', radius: r, startAngle: -90, endAngle: 90 }
    ],
    ariaSummary: caption
  };
}

/** Divisors of n between lo and hi, inclusive. */
function divisorsBetween(n, lo, hi) {
  const out = [];
  for (let d = lo; d <= Math.min(hi, n); d++) if (n % d === 0) out.push(d);
  return out;
}

/* Pythagorean (radius, height, slant) triples with radius a multiple of 7, so 22/7 cancels. */
const CONE_TRIPLES = [
  [7, 24, 25],
  [14, 48, 50],
  [21, 20, 29],
  [21, 28, 35],
  [21, 72, 75],
  [28, 21, 35],
  [28, 45, 53],
  [35, 12, 37],
  [35, 84, 91],
  [42, 40, 58],
  [42, 56, 70]
];

export const mensurationTemplates = [
  /* ============================ perimeter and area ============================ */
  {
    id: 'pa-rect-area',
    version: 1,
    topicId: 'perimeter-area',
    conceptId: 'pa-rectangle',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['pa-rectangle-f'],
    estimatedSeconds: 30,
    params(rng) {
      const l = rng.int(5, 24);
      const b = rng.int(3, l - 1);
      return { l, b };
    },
    answer: ({ l, b }) => l * b,
    verify({ l, b }, value) {
      let total = 0;
      for (let row = 0; row < b; row++) total += l;
      return total === value;
    },
    render({ l, b }) {
      return {
        question: `A rectangle is ${cm(l)} long and ${cm(b)} wide. What is its area?`,
        figure: rectangleFigure(l, b, `Rectangle ${cm(l)} by ${cm(b)}`),
        explanation: `Area = length × breadth = ${l} × ${b} = ${l * b} cm².`,
        solutionSteps: [`${l} × ${b} = ${l * b}.`],
        method: 'Area = length × breadth.',
        hints: ['Area counts the unit squares that cover the shape.', 'Multiply the length by the breadth.'],
        commonMistakes: [`Adding the sides instead: 2(${l} + ${b}) = ${2 * (l + b)} is the perimeter, not the area.`]
      };
    }
  },

  {
    id: 'pa-rect-missing-side',
    version: 1,
    topicId: 'perimeter-area',
    conceptId: 'pa-rectangle',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['pa-rectangle-f'],
    estimatedSeconds: 45,
    params(rng) {
      const l = rng.int(6, 30);
      const b = rng.int(2, l - 1);
      return { l, b, P: 2 * (l + b) };
    },
    answer: ({ b }) => b,
    verify: ({ l, P }, value) => 2 * (l + value) === P,
    render({ l, b, P }) {
      return {
        question: `A rectangle has a perimeter of ${cm(P)} and a length of ${cm(l)}. What is its breadth?`,
        figure: rectangleFigure(l, b, `Rectangle with length ${cm(l)}; breadth unknown`),
        explanation: `Perimeter = 2(l + b), so l + b = ${P} ÷ 2 = ${P / 2}. Breadth = ${P / 2} − ${l} = ${b} cm.`,
        solutionSteps: [`${P} ÷ 2 = ${P / 2}.`, `${P / 2} − ${l} = ${b}.`],
        method: 'Halve the perimeter to get length + breadth, then subtract the length.',
        hints: ['The perimeter goes round both lengths and both breadths.', `Half the perimeter, ${P / 2}, is one length plus one breadth.`],
        commonMistakes: [`Subtracting the length from the whole perimeter: ${P} − ${l} = ${P - l}.`, 'Dividing the perimeter by 4, as if it were a square.']
      };
    }
  },

  {
    id: 'pa-triangle-area',
    version: 1,
    topicId: 'perimeter-area',
    conceptId: 'pa-triangle',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pa-triangle-f'],
    estimatedSeconds: 35,
    formatValue: (value) => cm2(value),
    params(rng) {
      const base = rng.int(4, 24);
      const height = rng.int(3, 18);
      if ((base * height) % 2 !== 0) return null;
      return { base, height, apexX: rng.int(1, base - 1) };
    },
    answer: ({ base, height }) => (base * height) / 2,
    distractors: ({ base, height }) => [
      { value: base * height, why: 'forgot to halve' },
      { value: base + height, why: 'added base and height' },
      { value: (base * height) / 4, why: 'halved twice' },
      { value: 2 * (base + height), why: 'used a perimeter-style formula' }
    ],
    verify({ base, height, apexX }, value) {
      // Shoelace formula on the drawn vertices (0,0), (base,0), (apexX,height).
      const [x1, y1, x2, y2, x3, y3] = [0, 0, base, 0, apexX, height];
      const twiceArea = Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
      return nearlyEqual(twiceArea / 2, value);
    },
    render({ base, height, apexX }) {
      return {
        question: `A triangle has a base of ${cm(base)} and a height of ${cm(height)}. What is its area?`,
        figure: triangleHeightFigure(base, height, apexX, `Triangle with base ${cm(base)} and height ${cm(height)}`),
        explanation: `Area = ½ × base × height = ½ × ${base} × ${height} = ${(base * height) / 2} cm².`,
        solutionSteps: [`${base} × ${height} = ${base * height}.`, `Half of that is ${(base * height) / 2}.`],
        method: 'Area = ½ × base × height, with the height measured at right angles to the base.',
        hints: ['A triangle is half of a rectangle with the same base and height.', 'Multiply base by height, then halve.'],
        commonMistakes: ['Forgetting the ½.']
      };
    }
  },

  {
    id: 'pa-circle-area',
    version: 1,
    topicId: 'perimeter-area',
    conceptId: 'pa-circle',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pa-circle-f'],
    estimatedSeconds: 50,
    formatValue: (value) => cm2(value),
    params(rng) {
      const r = 7 * rng.int(1, 10);
      return { r, givenDiameter: rng.chance(0.5) };
    },
    answer: ({ r }) => PI * r * r,
    distractors: ({ r }) => [
      { value: 2 * PI * r, why: 'found the circumference' },
      { value: PI * (2 * r) * (2 * r), why: 'used the diameter as the radius' },
      { value: PI * r, why: 'forgot to square the radius' },
      { value: PI * r * r * 2, why: 'doubled the area' }
    ],
    verify: ({ r }, value) => closeToTruePi(value, Math.PI * r * r),
    render({ r, givenDiameter }) {
      const given = givenDiameter ? `a diameter of ${cm(2 * r)}` : `a radius of ${cm(r)}`;
      const area = PI * r * r;
      return {
        question: `A circle has ${given}. What is its area? (Use π = 22/7.)`,
        figure: circleFigure(r, givenDiameter, givenDiameter ? `Circle with diameter ${cm(2 * r)}` : `Circle with radius ${cm(r)}`),
        explanation: `${givenDiameter ? `Radius = ${2 * r} ÷ 2 = ${r} cm. ` : ''}Area = πr² = 22/7 × ${r} × ${r} = ${fmt(area)} cm².`,
        solutionSteps: [
          ...(givenDiameter ? [`Radius = ${2 * r} ÷ 2 = ${r}.`] : []),
          `${r} × ${r} = ${r * r}.`,
          `22/7 × ${r * r} = ${fmt(area)}.`
        ],
        method: 'Area = πr², using the radius.',
        hints: [givenDiameter ? 'The area formula needs the radius — halve the diameter first.' : 'Square the radius before multiplying by π.', 'With a radius that is a multiple of 7, the 7 in 22/7 cancels.'],
        commonMistakes: ['Using 2πr, which is the circumference.', 'Putting the diameter into πr².']
      };
    }
  },

  {
    id: 'pa-rhombus-area',
    version: 1,
    topicId: 'perimeter-area',
    conceptId: 'pa-rhombus',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['pa-rhombus-f'],
    estimatedSeconds: 40,
    params(rng) {
      const d1 = 2 * rng.int(3, 12);
      const d2 = 2 * rng.int(2, 10);
      if (d1 === d2) return null;
      return { d1, d2 };
    },
    answer: ({ d1, d2 }) => (d1 * d2) / 2,
    verify({ d1, d2 }, value) {
      // Four congruent right triangles with legs d1/2 and d2/2.
      const oneTriangle = ((d1 / 2) * (d2 / 2)) / 2;
      return nearlyEqual(4 * oneTriangle, value);
    },
    render({ d1, d2 }) {
      return {
        question: `The diagonals of a rhombus are ${cm(d1)} and ${cm(d2)}. What is its area?`,
        figure: rhombusFigure(d1, d2, `Rhombus with diagonals ${cm(d1)} and ${cm(d2)}`),
        explanation: `Area = ½ × d₁ × d₂ = ½ × ${d1} × ${d2} = ${(d1 * d2) / 2} cm².`,
        solutionSteps: [`${d1} × ${d2} = ${d1 * d2}.`, `Half of that is ${(d1 * d2) / 2}.`],
        method: 'Area of a rhombus = ½ × product of the diagonals.',
        hints: ['The diagonals cut the rhombus into four equal right triangles.', 'Multiply the diagonals, then halve.'],
        commonMistakes: ['Forgetting the ½ and giving d₁ × d₂.']
      };
    }
  },

  {
    id: 'pa-trapezium-area',
    version: 1,
    topicId: 'perimeter-area',
    conceptId: 'pa-parallelogram-trapezium',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['pa-trapezium-f'],
    estimatedSeconds: 60,
    params(rng) {
      const top = rng.int(4, 16);
      const bottom = rng.int(top + 2, top + 14);
      const height = rng.int(3, 14);
      if (((top + bottom) * height) % 2 !== 0) return null;
      return { top, bottom, height };
    },
    answer: ({ top, bottom, height }) => ((top + bottom) * height) / 2,
    verify({ top, bottom, height }, value) {
      // A central rectangle plus the two side triangles, whose bases add up to bottom − top.
      return nearlyEqual(top * height + ((bottom - top) * height) / 2, value);
    },
    render({ top, bottom, height }) {
      const sum = top + bottom;
      return {
        question: `A trapezium has parallel sides of ${cm(top)} and ${cm(bottom)}, and the distance between them is ${cm(height)}. What is its area?`,
        figure: trapeziumFigure(top, bottom, height, `Trapezium with parallel sides ${cm(top)} and ${cm(bottom)}, height ${cm(height)}`),
        explanation: `Area = ½ × (a + b) × h = ½ × (${top} + ${bottom}) × ${height} = ½ × ${sum} × ${height} = ${(sum * height) / 2} cm².`,
        solutionSteps: [`${top} + ${bottom} = ${sum}.`, `${sum} × ${height} = ${sum * height}.`, `Half of that is ${(sum * height) / 2}.`],
        method: 'Area = ½ × (sum of the parallel sides) × height.',
        hints: ['Add the two parallel sides first.', 'Then multiply by the height and halve.'],
        commonMistakes: [`Multiplying the two parallel sides: ${top} × ${bottom}.`, 'Forgetting the ½.']
      };
    }
  },

  /* ============================== 3D mensuration ============================== */
  {
    id: 'td-cuboid-tsa',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-cuboid',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['td-cuboid-f'],
    estimatedSeconds: 55,
    formatValue: (value) => cm2(value),
    params(rng) {
      const l = rng.int(4, 20);
      const b = rng.int(3, l);
      const h = rng.int(2, 15);
      return { l, b, h };
    },
    answer: ({ l, b, h }) => 2 * (l * b + b * h + h * l),
    distractors: ({ l, b, h }) => [
      { value: l * b + b * h + h * l, why: 'forgot to double' },
      { value: l * b * h, why: 'found the volume' },
      { value: 2 * (l + b) * h, why: 'found only the four side faces' },
      { value: 6 * l * b, why: 'treated it as a cube' }
    ],
    // Four walls (perimeter of the base × height) plus the top and bottom.
    verify: ({ l, b, h }, value) => 2 * (l + b) * h + 2 * l * b === value,
    render({ l, b, h }) {
      const sum = l * b + b * h + h * l;
      return {
        question: `A cuboid is ${cm(l)} long, ${cm(b)} wide and ${cm(h)} high. What is its total surface area?`,
        figure: solidFigure(
          `Cuboid ${cm(l)} × ${cm(b)} × ${cm(h)}`,
          `A cuboid with length ${cm(l)}, breadth ${cm(b)} and height ${cm(h)} marked on its edges.`,
          { shape: 'cuboid', l, b, h, labels: { l: cm(l), b: cm(b), h: cm(h) } }
        ),
        explanation: `Total surface area = 2(lb + bh + hl) = 2(${l * b} + ${b * h} + ${h * l}) = 2 × ${sum} = ${2 * sum} cm².`,
        solutionSteps: [`lb = ${l * b}, bh = ${b * h}, hl = ${h * l}.`, `${l * b} + ${b * h} + ${h * l} = ${sum}.`, `2 × ${sum} = ${2 * sum}.`],
        method: 'A cuboid has three pairs of equal faces: add one of each pair, then double.',
        hints: ['There are 6 faces, in 3 matching pairs.', 'Find lb, bh and hl, add them, then double.'],
        commonMistakes: ['Forgetting to double.', 'Multiplying l × b × h, which is the volume.']
      };
    }
  },

  {
    id: 'td-cube-volume-from-tsa',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-cube',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'cm³',
    formulaIds: ['td-cube-f'],
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.int(2, 20);
      return { a, tsa: 6 * a * a };
    },
    answer: ({ a }) => a * a * a,
    verify({ tsa }, value) {
      const edge = Math.round(Math.cbrt(value));
      return edge ** 3 === value && 6 * edge * edge === tsa;
    },
    render({ a, tsa }) {
      return {
        question: `The total surface area of a cube is ${cm2(tsa)}. What is its volume?`,
        figure: solidFigure(
          `Cube with total surface area ${cm2(tsa)}`,
          `A cube with no lengths marked; its total surface area is ${cm2(tsa)}.`,
          { shape: 'cube', a }
        ),
        explanation: `Each of the 6 faces has area ${tsa} ÷ 6 = ${a * a} cm², so the edge is √${a * a} = ${a} cm. Volume = ${a}³ = ${a ** 3} cm³.`,
        solutionSteps: [`${tsa} ÷ 6 = ${a * a}.`, `√${a * a} = ${a}.`, `${a}³ = ${a ** 3}.`],
        method: 'Surface area → one face → edge → volume.',
        hints: ['A cube has 6 identical square faces.', 'Find the area of one face, then its side.'],
        commonMistakes: [`Dividing by 6 and stopping: ${a * a} is the area of one face, not the volume.`, 'Taking the cube root of the surface area.']
      };
    }
  },

  {
    id: 'td-cylinder-volume',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-cylinder',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['td-cylinder-f'],
    estimatedSeconds: 45,
    formatValue: (value) => cm3(value),
    params(rng) {
      return { r: rng.pick([7, 14, 21]), h: rng.int(2, 30) };
    },
    answer: ({ r, h }) => PI * r * r * h,
    distractors: ({ r, h }) => [
      { value: 2 * PI * r * h, why: 'found the curved surface area' },
      { value: PI * (2 * r) * (2 * r) * h, why: 'used the diameter as the radius' },
      { value: PI * r * h, why: 'forgot to square the radius' },
      { value: (PI * r * r * h) / 3, why: 'used the cone formula' }
    ],
    verify: ({ r, h }, value) => closeToTruePi(value, Math.PI * r * r * h),
    render({ r, h }) {
      const base = PI * r * r;
      return {
        question: `A cylinder has a radius of ${cm(r)} and a height of ${cm(h)}. What is its volume? (Use π = 22/7.)`,
        figure: solidFigure(
          `Cylinder with radius ${cm(r)} and height ${cm(h)}`,
          `A cylinder with its radius marked ${cm(r)} and its height marked ${cm(h)}.`,
          { shape: 'cylinder', r, h, labels: { r: cm(r), h: cm(h) } }
        ),
        explanation: `Volume = πr²h = 22/7 × ${r}² × ${h} = ${fmt(base)} × ${h} = ${fmt(base * h)} cm³.`,
        solutionSteps: [`Base area = 22/7 × ${r * r} = ${fmt(base)}.`, `${fmt(base)} × ${h} = ${fmt(base * h)}.`],
        method: 'Volume = base area × height = πr²h.',
        hints: ['Find the area of the circular base first.', 'Then multiply by the height.'],
        commonMistakes: ['Using 2πrh, which is the curved surface area.']
      };
    }
  },

  {
    id: 'td-cone-surface',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-cone',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['td-cone-f'],
    estimatedSeconds: 80,
    params(rng) {
      const [r, h, l] = rng.pick(CONE_TRIPLES);
      return { r, h, l, total: rng.chance(0.5) };
    },
    answer: ({ r, l, total }) => (total ? PI * r * (l + r) : PI * r * l),
    verify({ r, h, total }, value) {
      const slant = Math.hypot(r, h);
      const curved = Math.PI * r * slant;
      return closeToTruePi(value, total ? curved + Math.PI * r * r : curved);
    },
    render({ r, h, l, total }) {
      const curved = PI * r * l;
      const area = total ? PI * r * (l + r) : curved;
      return {
        question: `A cone has a base radius of ${cm(r)} and a height of ${cm(h)}. What is its ${total ? 'total' : 'curved'} surface area? (Use π = 22/7.)`,
        figure: solidFigure(
          `Cone with base radius ${cm(r)} and height ${cm(h)}`,
          `A cone with its base radius marked ${cm(r)} and its vertical height marked ${cm(h)}.`,
          { shape: 'cone', r, h, labels: { r: cm(r), h: cm(h) } }
        ),
        explanation: total
          ? `Slant height l = √(${r}² + ${h}²) = √${r * r + h * h} = ${l} cm. Total surface area = πr(l + r) = 22/7 × ${r} × (${l} + ${r}) = ${fmt(area)} cm².`
          : `Slant height l = √(${r}² + ${h}²) = √${r * r + h * h} = ${l} cm. Curved surface area = πrl = 22/7 × ${r} × ${l} = ${fmt(area)} cm².`,
        solutionSteps: [
          `${r}² + ${h}² = ${r * r + h * h}, so l = ${l}.`,
          total ? `22/7 × ${r} × ${l + r} = ${fmt(area)}.` : `22/7 × ${r} × ${l} = ${fmt(area)}.`
        ],
        method: total ? 'Find the slant height, then πr(l + r).' : 'Find the slant height, then πrl.',
        hints: ['The surface formulas use the slant height, not the vertical height.', 'Slant height² = radius² + height².'],
        commonMistakes: [`Using the vertical height ${h} in place of the slant height ${l}.`, ...(total ? ['Leaving out the circular base (πr²).'] : [])]
      };
    }
  },

  {
    id: 'td-sphere-volume',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-sphere',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['td-sphere-f'],
    answerDecimals: 2,
    estimatedSeconds: 55,
    formatValue: (value) => cm3(value),
    params(rng) {
      return { r: 3 * rng.int(1, 7), hemisphere: rng.chance(0.5), givenDiameter: rng.chance(0.5) };
    },
    // r is a multiple of 3, so 4r³/3 and 2r³/3 are whole numbers before × 3.14.
    answer: ({ r, hemisphere }) => (((hemisphere ? 2 : 4) * r ** 3) / 3) * 3.14,
    distractors: ({ r, hemisphere }) => [
      { value: (((hemisphere ? 4 : 2) * r ** 3) / 3) * 3.14, why: hemisphere ? 'found the whole sphere' : 'found a hemisphere' },
      { value: 4 * 3.14 * r * r, why: 'found the surface area' },
      { value: (hemisphere ? 2 : 4) * 3.14 * r ** 3, why: 'forgot to divide by 3' },
      { value: (((hemisphere ? 2 : 4) * (2 * r) ** 3) / 3) * 3.14, why: 'used the diameter as the radius' }
    ],
    verify: ({ r, hemisphere }, value) => closeToTruePi(value, ((hemisphere ? 2 : 4) / 3) * Math.PI * r ** 3),
    render({ r, hemisphere, givenDiameter }) {
      const k = hemisphere ? 2 : 4;
      const volume = ((k * r ** 3) / 3) * 3.14;
      const given = givenDiameter ? `a diameter of ${cm(2 * r)}` : `a radius of ${cm(r)}`;
      return {
        question: `A ${hemisphere ? 'solid hemisphere' : 'sphere'} has ${given}. What is its volume? (Use π = 3.14.)`,
        figure: solidFigure(
          `${hemisphere ? 'Hemisphere' : 'Sphere'} with ${given}`,
          givenDiameter
            ? `A ${hemisphere ? 'solid hemisphere' : 'sphere'} with no lengths marked; its diameter is ${cm(2 * r)}.`
            : `A ${hemisphere ? 'solid hemisphere' : 'sphere'} with its radius marked ${cm(r)}.`,
          { shape: hemisphere ? 'hemisphere' : 'sphere', r, ...(givenDiameter ? {} : { labels: { r: cm(r) } }) }
        ),
        explanation: `${givenDiameter ? `Radius = ${2 * r} ÷ 2 = ${r} cm. ` : ''}Volume = ${k}/3 × πr³ = ${k}/3 × 3.14 × ${r ** 3} = ${(k * r ** 3) / 3} × 3.14 = ${fmt(volume)} cm³.`,
        solutionSteps: [
          ...(givenDiameter ? [`Radius = ${2 * r} ÷ 2 = ${r}.`] : []),
          `${r}³ = ${r ** 3}.`,
          `${r ** 3} ÷ 3 × ${k} = ${(k * r ** 3) / 3}.`,
          `${(k * r ** 3) / 3} × 3.14 = ${fmt(volume)}.`
        ],
        method: hemisphere ? 'Volume of a hemisphere = 2/3 πr³, half of a sphere.' : 'Volume of a sphere = 4/3 πr³.',
        hints: [
          givenDiameter ? 'The formula needs the radius, so halve the diameter first.' : `Cube the radius: ${r}³ = ${r ** 3}.`,
          hemisphere ? 'A hemisphere is exactly half a sphere.' : 'Divide by 3 before multiplying; it keeps the numbers small.'
        ],
        commonMistakes: ['Using 4πr², which is the surface area.', ...(givenDiameter ? ['Cubing the diameter instead of the radius.'] : [])]
      };
    }
  },

  /* ========================= volume and surface area ========================= */
  {
    id: 'vsa-recast-spheres',
    version: 1,
    topicId: 'volume-surface-area',
    conceptId: 'vsa-recast',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['vsa-recast-f'],
    estimatedSeconds: 50,
    params(rng) {
      const r = rng.int(1, 6);
      const k = rng.int(2, 5);
      return { r, k, R: k * r };
    },
    answer: ({ k }) => k ** 3,
    verify({ r, R }, value) {
      const big = (4 / 3) * Math.PI * R ** 3;
      const small = (4 / 3) * Math.PI * r ** 3;
      return nearlyEqual(big / small, value);
    },
    render({ r, k, R }) {
      return {
        question: `A solid metal sphere of radius ${cm(R)} is melted and recast into small spheres of radius ${cm(r)} each. How many small spheres are made?`,
        figure: solidFigure(
          `The large sphere (radius ${cm(R)}) before it is melted`,
          `The large metal sphere before melting, with its radius marked ${cm(R)}. It is recast into small spheres of radius ${cm(r)}, which are not drawn.`,
          { shape: 'sphere', r: R, labels: { r: cm(R) } }
        ),
        explanation: `Volume is unchanged by recasting, and a sphere's volume goes with r³. Number = (${R}/${r})³ = ${k}³ = ${k ** 3}.`,
        solutionSteps: [`${R} ÷ ${r} = ${k}.`, `${k}³ = ${k ** 3}.`],
        method: 'Number of pieces = big volume ÷ small volume; for similar shapes that is (ratio of radii)³.',
        hints: ['The 4/3 and π are the same for both spheres, so they cancel.', 'Compare the radii, then cube the ratio.'],
        commonMistakes: [`Dividing the radii only: ${R} ÷ ${r} = ${k}.`, `Squaring the ratio: ${k}² = ${k * k}.`]
      };
    }
  },

  {
    id: 'vsa-recast-cube-cuboid',
    version: 1,
    topicId: 'volume-surface-area',
    conceptId: 'vsa-recast',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['vsa-recast-f'],
    estimatedSeconds: 50,
    params(rng) {
      const a = rng.int(4, 12);
      const volume = a ** 3;
      const lengths = divisorsBetween(volume, 2, 3 * a);
      if (!lengths.length) return null;
      const l = rng.pick(lengths);
      const breadths = divisorsBetween(volume / l, 2, 3 * a);
      if (!breadths.length) return null;
      const b = rng.pick(breadths);
      const h = volume / (l * b);
      if (h < 2 || h > 4 * a || (l === a && b === a)) return null;
      return { a, l, b, h };
    },
    answer: ({ h }) => h,
    verify: ({ a, l, b }, value) => l * b * value === a * a * a,
    render({ a, l, b, h }) {
      return {
        question: `A metal cube of edge ${cm(a)} is melted and recast into a cuboid ${cm(l)} long and ${cm(b)} wide. What is the height of the cuboid?`,
        figure: solidFigure(
          `The cube (edge ${cm(a)}) before it is melted`,
          `The metal cube before melting, with its edge marked ${cm(a)}. It is recast into a cuboid ${cm(l)} long and ${cm(b)} wide, which is not drawn.`,
          { shape: 'cube', a, labels: { a: cm(a) } }
        ),
        explanation: `Cube volume = ${a}³ = ${a ** 3} cm³, which equals the cuboid's volume. Height = ${a ** 3} ÷ (${l} × ${b}) = ${a ** 3} ÷ ${l * b} = ${h} cm.`,
        solutionSteps: [`${a}³ = ${a ** 3}.`, `${l} × ${b} = ${l * b}.`, `${a ** 3} ÷ ${l * b} = ${h}.`],
        method: 'Volume before = volume after; divide by the known base area.',
        hints: ['Melting and recasting keeps the volume the same.', 'Height = volume ÷ (length × breadth).'],
        commonMistakes: ['Matching one edge of the cube to the cuboid instead of equating volumes.']
      };
    }
  },

  {
    id: 'vsa-capacity-litres',
    version: 1,
    topicId: 'volume-surface-area',
    conceptId: 'vsa-capacity',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: 'litres',
    formulaIds: ['vsa-capacity-f'],
    estimatedSeconds: 45,
    params(rng) {
      return { l: 10 * rng.int(3, 15), b: 10 * rng.int(2, 10), h: 10 * rng.int(2, 10) };
    },
    answer: ({ l, b, h }) => (l * b * h) / 1000,
    // Convert to metres first, then 1 m³ = 1000 litres.
    verify: ({ l, b, h }, value) => nearlyEqual((l / 100) * (b / 100) * (h / 100) * 1000, value),
    render({ l, b, h }) {
      const volume = l * b * h;
      return {
        question: `A tank measures ${cm(l)} × ${cm(b)} × ${cm(h)}. How many litres does it hold when full?`,
        figure: solidFigure(
          `A tank ${cm(l)} × ${cm(b)} × ${cm(h)}`,
          `A cuboid tank with its length ${cm(l)}, breadth ${cm(b)} and height ${cm(h)} marked.`,
          { shape: 'cuboid', l, b, h, labels: { l: cm(l), b: cm(b), h: cm(h) } }
        ),
        explanation: `Volume = ${l} × ${b} × ${h} = ${fmt(volume)} cm³. Since 1 litre = 1000 cm³, capacity = ${fmt(volume)} ÷ 1000 = ${fmt(volume / 1000)} litres.`,
        solutionSteps: [`${l} × ${b} × ${h} = ${fmt(volume)} cm³.`, `${fmt(volume)} ÷ 1000 = ${fmt(volume / 1000)}.`],
        method: 'Volume in cm³ ÷ 1000 = litres.',
        hints: ['Find the volume in cm³ first.', '1 litre = 1000 cm³.'],
        commonMistakes: ['Dividing by 100 instead of 1000.']
      };
    }
  },

  {
    id: 'vsa-fill-time',
    version: 1,
    topicId: 'volume-surface-area',
    conceptId: 'vsa-rate',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'minutes',
    formulaIds: ['vsa-rate-f', 'vsa-capacity-f'],
    estimatedSeconds: 60,
    params(rng) {
      const l = rng.int(1, 5);
      const b = rng.int(1, 4);
      const h = rng.int(1, 3);
      const litres = 1000 * l * b * h;
      const rates = divisorsBetween(litres, 40, 600).filter((rate) => litres / rate >= 5 && litres / rate <= 240 && rate % 10 === 0);
      if (!rates.length) return null;
      return { l, b, h, litres, rate: rng.pick(rates) };
    },
    answer: ({ litres, rate }) => litres / rate,
    verify: ({ litres, rate }, value) => rate * value === litres,
    render({ l, b, h, litres, rate }) {
      return {
        question: `A tank ${l} m long, ${b} m wide and ${h} m deep is filled by a pipe delivering ${rate} litres per minute. How many minutes does it take to fill the empty tank?`,
        figure: solidFigure(
          `A tank ${l} m long, ${b} m wide and ${h} m deep`,
          `A cuboid tank with its length ${l} m, width ${b} m and depth ${h} m marked.`,
          { shape: 'cuboid', l, b, h, labels: { l: `${l} m`, b: `${b} m`, h: `${h} m` } }
        ),
        explanation: `Volume = ${l} × ${b} × ${h} = ${l * b * h} m³ = ${fmt(litres)} litres. Time = ${fmt(litres)} ÷ ${rate} = ${litres / rate} minutes.`,
        solutionSteps: [`${l} × ${b} × ${h} = ${l * b * h} m³.`, `${l * b * h} × 1000 = ${fmt(litres)} litres.`, `${fmt(litres)} ÷ ${rate} = ${litres / rate}.`],
        method: 'Time = capacity ÷ rate, with both in litres.',
        hints: ['1 m³ holds 1000 litres.', 'Divide the capacity by the rate.'],
        commonMistakes: ['Forgetting to convert m³ to litres.', 'Dividing the rate by the capacity.']
      };
    }
  },

  {
    id: 'vsa-cylinder-minus-cone',
    version: 1,
    topicId: 'volume-surface-area',
    conceptId: 'vsa-composite-volume',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'cm³',
    formulaIds: ['vsa-composite-volume-f'],
    estimatedSeconds: 75,
    params(rng) {
      return { r: rng.pick([7, 14]), h: 3 * rng.int(2, 10) };
    },
    answer: ({ r, h }) => (2 / 3) * PI * r * r * h,
    verify({ r, h }, value) {
      const cylinder = Math.PI * r * r * h;
      const cone = cylinder / 3;
      return closeToTruePi(value, cylinder - cone);
    },
    render({ r, h }) {
      const cylinder = PI * r * r * h;
      const cone = cylinder / 3;
      return {
        question: `A solid cylinder of radius ${cm(r)} and height ${cm(h)} has a cone of the same radius and height hollowed out of it. What volume of material is left? (Use π = 22/7.)`,
        figure: solidFigure(
          `The solid cylinder before the cone is hollowed out`,
          `The solid cylinder before the cone is cut out, with its radius marked ${cm(r)} and its height marked ${cm(h)}. The cone of the same radius and height is not drawn.`,
          { shape: 'cylinder', r, h, labels: { r: cm(r), h: cm(h) } }
        ),
        explanation: `Cylinder = πr²h = 22/7 × ${r}² × ${h} = ${fmt(cylinder)} cm³. The cone is one-third of that: ${fmt(cone)} cm³. Left = ${fmt(cylinder)} − ${fmt(cone)} = ${fmt(cylinder - cone)} cm³.`,
        solutionSteps: [`Cylinder: ${fmt(cylinder)}.`, `Cone: ${fmt(cylinder)} ÷ 3 = ${fmt(cone)}.`, `${fmt(cylinder)} − ${fmt(cone)} = ${fmt(cylinder - cone)}.`],
        method: 'Remaining volume = cylinder − cone = ⅔ of the cylinder.',
        hints: ['A cone with the same base and height is exactly ⅓ of the cylinder.', 'Subtract the cone, since it was removed.'],
        commonMistakes: ['Adding the cone instead of subtracting it.']
      };
    }
  },

  /* ============================== 2D mensuration ============================== */
  {
    id: 'md-lshape-perimeter',
    version: 1,
    topicId: 'mensuration-2d',
    conceptId: 'md-composite-perimeter',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm',
    formulaIds: ['md-composite-perimeter-f'],
    estimatedSeconds: 60,
    params(rng) {
      const W = rng.int(8, 20);
      const H = rng.int(6, 16);
      return { W, H, w: rng.int(2, W - 3), h: rng.int(2, H - 3) };
    },
    answer: ({ W, H }) => 2 * (W + H),
    // Walk round the six edges of the L.
    verify: ({ W, H, w, h }, value) => W + (H - h) + w + h + (W - w) + H === value,
    render({ W, H, w, h }) {
      const sides = [W, H - h, w, h, W - w, H];
      return {
        question: `${anArticle(W)} ${cm(W)} × ${cm(H)} rectangle has ${anArticle(w).toLowerCase()} ${cm(w)} × ${cm(h)} rectangle cut from one corner, leaving an L shape. What is the perimeter of the L shape?`,
        figure: lShapeFigure(W, H, w, h, `An L shape: a ${W} × ${H} rectangle with a ${w} × ${h} corner removed`),
        explanation: `Walking round the L, the sides are ${sides.join(', ')} cm, which total ${2 * (W + H)} cm. That equals the perimeter of the original ${W} × ${H} rectangle: cutting out the corner replaces two edges with two new ones of the same total length.`,
        solutionSteps: [`Sides: ${sides.join(' + ')}.`, `Total = ${2 * (W + H)}.`, `Check: 2(${W} + ${H}) = ${2 * (W + H)}.`],
        method: 'Add every outer edge. A rectangular corner notch leaves the perimeter unchanged.',
        hints: ['List every edge of the L as you walk round it.', 'Compare your total with the perimeter of the full rectangle.'],
        commonMistakes: [`Subtracting the notch's perimeter: ${2 * (W + H)} − ${2 * (w + h)} = ${2 * (W + H) - 2 * (w + h)}.`, 'Forgetting the two new edges created by the cut.']
      };
    }
  },

  {
    id: 'md-lshape-area',
    version: 1,
    topicId: 'mensuration-2d',
    conceptId: 'md-composite-area',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['md-composite-area-f'],
    estimatedSeconds: 45,
    params(rng) {
      const W = rng.int(8, 20);
      const H = rng.int(6, 16);
      return { W, H, w: rng.int(2, W - 3), h: rng.int(2, H - 3) };
    },
    answer: ({ W, H, w, h }) => W * H - w * h,
    // Split the L into a full-height strip and a shorter strip.
    verify: ({ W, H, w, h }, value) => (W - w) * H + w * (H - h) === value,
    render({ W, H, w, h }) {
      return {
        question: `${anArticle(W)} ${cm(W)} × ${cm(H)} rectangle has ${anArticle(w).toLowerCase()} ${cm(w)} × ${cm(h)} rectangle cut from one corner. What is the area of the remaining L shape?`,
        figure: lShapeFigure(W, H, w, h, `${anArticle(W)} ${cm(W)} × ${cm(H)} rectangle with ${anArticle(w).toLowerCase()} ${cm(w)} × ${cm(h)} corner removed; the L shape left is shaded`, true),
        explanation: `Area = whole rectangle − cut-out = ${W} × ${H} − ${w} × ${h} = ${W * H} − ${w * h} = ${W * H - w * h} cm².`,
        solutionSteps: [`${W} × ${H} = ${W * H}.`, `${w} × ${h} = ${w * h}.`, `${W * H} − ${w * h} = ${W * H - w * h}.`],
        method: 'Subtract the missing piece from the whole, or split the L into two rectangles.',
        hints: ['Start from the full rectangle.', 'Take away the area of the corner that was cut out.'],
        commonMistakes: ['Adding the cut-out instead of subtracting it.']
      };
    }
  },

  {
    id: 'md-square-cutout',
    version: 1,
    topicId: 'mensuration-2d',
    conceptId: 'md-shaded',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['md-shaded-f'],
    answerDecimals: 2,
    tolerance: 0.01,
    estimatedSeconds: 60,
    params(rng) {
      return { a: 2 * rng.int(2, 10), quarters: rng.chance(0.5) };
    },
    answer: ({ a }) => Math.round((a * a - 3.14 * (a / 2) ** 2) * 100) / 100,
    // Against true π: the shaded region is small, so allow 0.5% for 3.14.
    verify: ({ a }, value) => nearlyEqual(value, a * a - Math.PI * (a / 2) ** 2, 5e-3),
    render({ a, quarters }) {
      const r = a / 2;
      const circle = 3.14 * r * r;
      const caption = quarters
        ? `Square of side ${cm(a)} with a quarter-circle of radius ${cm(r)} cut from each corner; the area left is shaded`
        : `Square of side ${cm(a)} with a circle of radius ${cm(r)} cut out; the area left is shaded`;
      return {
        question: quarters
          ? `From each corner of a square of side ${cm(a)}, a quarter-circle of radius ${cm(r)} is cut away. What area is left? (Use π = 3.14.)`
          : `A circle of radius ${cm(r)} is cut out of a square of side ${cm(a)}. What area is left? (Use π = 3.14.)`,
        figure: squareCutoutFigure(a, quarters, caption),
        explanation: `${quarters ? `The four quarter-circles together make one full circle of radius ${r}. ` : ''}Remaining area = ${a}² − 3.14 × ${r}² = ${a * a} − ${fmt(circle)} = ${fmt(a * a - circle)} cm².`,
        solutionSteps: [`Square: ${a}² = ${a * a}.`, `Circle: 3.14 × ${r * r} = ${fmt(circle)}.`, `${a * a} − ${fmt(circle)} = ${fmt(a * a - circle)}.`],
        method: 'Shaded area = outer shape − the parts removed.',
        hints: [quarters ? 'Four quarter-circles of the same radius make one whole circle.' : 'The circle touches all four sides, so its diameter is the side of the square.', 'Subtract the circle from the square.'],
        commonMistakes: ['Using the side of the square as the radius.', ...(quarters ? ['Counting each quarter-circle as a full circle.'] : [])]
      };
    }
  },

  {
    id: 'md-garden-path',
    version: 1,
    topicId: 'mensuration-2d',
    conceptId: 'md-path',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'm²',
    formulaIds: ['md-path-f'],
    estimatedSeconds: 75,
    params(rng) {
      const l = rng.int(10, 30);
      const b = rng.int(6, l - 2);
      const w = rng.int(1, 3);
      const outside = rng.chance(0.5);
      if (!outside && (l - 2 * w < 4 || b - 2 * w < 3)) return null;
      return { l, b, w, outside };
    },
    answer: ({ l, b, w, outside }) => (outside ? (l + 2 * w) * (b + 2 * w) - l * b : l * b - (l - 2 * w) * (b - 2 * w)),
    // Two long strips, two short strips, and the four corner squares (added outside, overlapping inside).
    verify: ({ l, b, w, outside }, value) => 2 * w * (l + b) + (outside ? 4 : -4) * w * w === value,
    render({ l, b, w, outside }) {
      const [ol, ob, il, ib] = outside ? [l + 2 * w, b + 2 * w, l, b] : [l, b, l - 2 * w, b - 2 * w];
      const area = ol * ob - il * ib;
      return {
        question: outside
          ? `A rectangular garden ${l} m × ${b} m has a path ${w} m wide all round it, outside the garden. What is the area of the path?`
          : `A rectangular garden ${l} m × ${b} m has a path ${w} m wide running round the inside of its edge. What is the area of the path?`,
        figure: pathFigure(l, b, w, outside, outside ? `A ${l} m × ${b} m garden with a ${w} m path outside it (shaded)` : `A ${l} m × ${b} m garden with a ${w} m path inside its edge (shaded)`),
        explanation: `The ${outside ? 'outer' : 'inner'} rectangle is ${outside ? `${l} + 2 × ${w} = ${ol} by ${b} + 2 × ${w} = ${ob}` : `${l} − 2 × ${w} = ${il} by ${b} − 2 × ${w} = ${ib}`} m. Path area = ${ol} × ${ob} − ${il} × ${ib} = ${ol * ob} − ${il * ib} = ${area} m².`,
        solutionSteps: [`${outside ? 'Outer' : 'Inner'} size: ${outside ? `${ol} × ${ob}` : `${il} × ${ib}`}.`, `${ol} × ${ob} = ${ol * ob}; ${il} × ${ib} = ${il * ib}.`, `${ol * ob} − ${il * ib} = ${area}.`],
        method: 'Path area = area of the outer rectangle − area of the inner rectangle.',
        hints: [`The path changes each dimension by ${w} m on both sides, so by 2 × ${w} = ${2 * w} m.`, 'Subtract the smaller rectangle from the larger.'],
        commonMistakes: [`${outside ? 'Adding' : 'Subtracting'} the path width only once to each side.`]
      };
    }
  },

  {
    id: 'md-rect-semicircle',
    version: 1,
    topicId: 'mensuration-2d',
    conceptId: 'md-composite-area',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['md-composite-area-f'],
    estimatedSeconds: 60,
    params(rng) {
      return { r: rng.pick([7, 14]), h: rng.int(5, 20) };
    },
    answer: ({ r, h }) => 2 * r * h + (PI * r * r) / 2,
    verify: ({ r, h }, value) => closeToTruePi(value, 2 * r * h + (Math.PI * r * r) / 2),
    render({ r, h }) {
      const semicircle = (PI * r * r) / 2;
      return {
        question: `A shape is made of a rectangle ${cm(2 * r)} wide and ${cm(h)} tall, with a semicircle on its top edge. What is its total area? (Use π = 22/7.)`,
        figure: rectSemicircleFigure(r, h, `A ${2 * r} cm × ${h} cm rectangle with a semicircle on top`),
        explanation: `Rectangle = ${2 * r} × ${h} = ${2 * r * h} cm². The semicircle has radius ${2 * r} ÷ 2 = ${r}, so its area = ½ × 22/7 × ${r}² = ${fmt(semicircle)} cm². Total = ${fmt(2 * r * h + semicircle)} cm².`,
        solutionSteps: [`Rectangle: ${2 * r} × ${h} = ${2 * r * h}.`, `Semicircle: ½ × 22/7 × ${r * r} = ${fmt(semicircle)}.`, `${2 * r * h} + ${fmt(semicircle)} = ${fmt(2 * r * h + semicircle)}.`],
        method: 'Split into a rectangle and a semicircle, and add their areas.',
        hints: ['The semicircle sits on the whole top edge, so its diameter is the rectangle\'s width.', 'A semicircle is half of πr².'],
        commonMistakes: ['Using the full circle instead of half.', 'Using the width as the radius.']
      };
    }
  }
];
