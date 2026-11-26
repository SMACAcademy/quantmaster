/**
 * Prisms, pyramids and frustums (mensuration-3d, Advanced unit).
 *
 * Numbers are clean by construction: Pythagorean triples for every slant height
 * and lateral edge, radii in multiples of 7 with π = 22/7, and equilateral or
 * hexagonal bases answered as a multiple of √3. The independent checks never use
 * the formulas the questions teach: prisms, pyramids and pyramid frustums are
 * built corner by corner and measured (utils/prismPyramid.js), a cone frustum is
 * the big cone minus the small one (extended to the apex by similar triangles),
 * and a cut cone's shares are integrated slice by slice.
 */

import { fmt, gcd, nearlyEqual } from '../core.js';
import { distance3, faceAreas, meshVolume, prismMesh, pyramidMesh, regularCorners } from '../../utils/prismPyramid.js';

/* ------------------------------ shared helpers ------------------------------ */

const PI = 22 / 7;
const SQRT3 = Math.sqrt(3);
const cm = (v) => `${fmt(v)} cm`;
const cm2 = (v) => `${fmt(v)} cm²`;
const cm3 = (v) => `${fmt(v)} cm³`;
const sum = (list) => list.reduce((s, v) => s + v, 0);
const close = (a, b) => nearlyEqual(a, b, 1e-9);

/** Pythagorean triples (leg, leg, hypotenuse). */
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];

/** A triple, perhaps scaled, legs in either order, hypotenuse at most `maxHyp`. */
function pickTriple(rng, maxHyp = 45, scales = [1, 2, 3]) {
  const [x, y, z] = rng.pick(TRIPLES);
  const s = rng.pick(scales.filter((k) => k * z <= maxHyp).concat([1]));
  const [p, q] = rng.chance(0.5) ? [x, y] : [y, x];
  return [p * s, q * s, z * s];
}

/** A 3D solid drawing (utils/solidGeometry.js), drawn to the question's own sizes. */
const solidFigure = (caption, ariaSummary, ...parts) => ({ type: 'solid', caption, ariaSummary, parts });

/** Square-pyramid corners, for measuring. */
const squarePyramid = (a, h) => pyramidMesh(regularCorners(4, a), h);

/** A cone frustum measured as the big cone minus the small one (no frustum formula), with π = 22/7. */
function frustumByCones(R, r, h) {
  const [big, small] = [Math.max(R, r), Math.min(R, r)];
  const H = (h * big) / (big - small); // the full cone's height, by similar triangles
  const L = Math.hypot(H, big);
  const ell = Math.hypot(H - h, small);
  return {
    volume: (PI * big * big * H) / 3 - (PI * small * small * (H - h)) / 3,
    curved: PI * big * L - PI * small * ell,
    big: PI * big * big,
    small: PI * small * small
  };
}

/** ∫ f over [a, b] by Simpson's rule (exact for the quadratic cross-sections used here). */
function simpson(f, a, b, n = 20) {
  const dx = (b - a) / n;
  let total = f(a) + f(b);
  for (let i = 1; i < n; i++) total += (i % 2 ? 4 : 2) * f(a + i * dx);
  return (total * dx) / 3;
}

const fractionOf = (numerator, denominator) => {
  const g = gcd(numerator, denominator) || 1;
  return denominator / g === 1 ? String(numerator / g) : `${numerator / g}/${denominator / g}`;
};

/* ================================ templates ================================ */

export const advPrismTemplates = [
  /* ---------------- prism on a right-triangle base: volume ---------------- */
  {
    id: 'td-adv-prism-volume',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-adv-prism',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['td-adv-prism-f'],
    tags: ['advanced'],
    estimatedSeconds: 45,
    formatValue: (value) => cm3(value),
    params(rng) {
      const [p, q, c] = pickTriple(rng, 40, [1, 2]);
      return { p, q, c, h: rng.int(4, 25) };
    },
    answer: ({ p, q, h }) => (p * q * h) / 2,
    distractors: ({ p, q, c, h }) => [
      { value: p * q * h, why: 'forgot the ½ in the triangle' },
      { value: (p * q * h) / 6, why: 'divided by 3 as for a pyramid' },
      { value: (p + q + c) * h, why: 'found the lateral surface, perimeter × height' },
      { value: (p * c * h) / 2, why: 'used the hypotenuse as a leg' }
    ],
    verify: ({ p, q, h }, value) => close(value, meshVolume(prismMesh([[0, 0], [p, 0], [0, q]], h))),
    render({ p, q, h }) {
      const base = (p * q) / 2;
      return {
        question: `A right prism stands on a right-angled triangle whose legs are ${cm(p)} and ${cm(q)}. The prism is ${cm(h)} high. What is its volume?`,
        figure: solidFigure(
          `A right prism on a right-triangle base with legs ${cm(p)} and ${cm(q)}, ${cm(h)} high`,
          `A right triangular prism. The two base edges that meet at the right angle are labelled ${cm(p)} and ${cm(q)}, and a vertical edge is labelled ${cm(h)}.`,
          { shape: 'prism', base: 'right-triangle', a: p, b: q, h, labels: { a: cm(p), b: cm(q), h: cm(h) } }
        ),
        explanation: `Every horizontal slice of a right prism is a copy of its base, so volume = base area × height. The base is a right triangle: ½ × ${p} × ${q} = ${fmt(base)} cm². Volume = ${fmt(base)} × ${h} = ${fmt(base * h)} cm³.`,
        solutionSteps: [`Base area = ½ × ${p} × ${q} = ${fmt(base)} cm².`, `Volume = ${fmt(base)} × ${h} = ${fmt(base * h)} cm³.`],
        method: 'Volume of a right prism = base area × height.',
        hints: ['Every horizontal slice of a right prism is the same as its base.', 'Volume = base area × height.', `The base is a right triangle: its area is ½ × ${p} × ${q}.`],
        commonMistakes: [`Forgetting the ½ in the triangle's area, which gives ${cm3(p * q * h)}.`, 'Dividing by 3 as if the solid were a pyramid.']
      };
    }
  },

  /* ---------------- prism on a right-triangle base: lateral or total surface ---------------- */
  {
    id: 'td-adv-prism-surface',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-adv-prism',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'cm²',
    formulaIds: ['td-adv-prism-f'],
    tags: ['advanced'],
    estimatedSeconds: 70,
    params(rng) {
      const [p, q, c] = pickTriple(rng, 40, [1, 2]);
      return { p, q, c, h: rng.int(4, 25), ask: rng.pick(['total', 'lateral']) };
    },
    answer: ({ p, q, c, h, ask }) => (p + q + c) * h + (ask === 'total' ? p * q : 0),
    verify({ p, q, h, ask }, value) {
      const faces = faceAreas(prismMesh([[0, 0], [p, 0], [0, q]], h));
      return close(value, ask === 'total' ? sum(faces) : sum(faces.slice(2)));
    },
    render({ p, q, c, h, ask }) {
      const base = (p * q) / 2;
      const lateral = (p + q + c) * h;
      const total = ask === 'total';
      return {
        question: `The base of a right prism is a triangle with sides ${cm(p)}, ${cm(q)} and ${cm(c)}, and the prism is ${cm(h)} high. Find its ${total ? 'total' : 'lateral'} surface area.`,
        figure: solidFigure(
          `A right prism on a ${p}–${q}–${c} triangle, ${cm(h)} high`,
          `A right triangular prism. The two base edges that meet at a right angle are labelled ${cm(p)} and ${cm(q)}, and a vertical edge is labelled ${cm(h)}.`,
          { shape: 'prism', base: 'right-triangle', a: p, b: q, h, labels: { a: cm(p), b: cm(q), h: cm(h) } }
        ),
        explanation: total
          ? `${p}² + ${q}² = ${c}², so the base is a right triangle of area ½ × ${p} × ${q} = ${fmt(base)} cm². The side faces together are perimeter × height = ${p + q + c} × ${h} = ${fmt(lateral)} cm². The total adds both ends: ${fmt(lateral)} + 2 × ${fmt(base)} = ${fmt(lateral + 2 * base)} cm².`
          : `The three rectangular side faces have widths ${p}, ${q} and ${c} and the same height ${h}, so together they are perimeter × height = ${p + q + c} × ${h} = ${fmt(lateral)} cm².`,
        solutionSteps: total
          ? [`Base: ${p}² + ${q}² = ${c}², so its area = ½ × ${p} × ${q} = ${fmt(base)} cm².`, `Lateral surface = ${p + q + c} × ${h} = ${fmt(lateral)} cm².`, `Total = ${fmt(lateral)} + 2 × ${fmt(base)} = ${fmt(lateral + 2 * base)} cm².`]
          : [`Perimeter of the base = ${p} + ${q} + ${c} = ${p + q + c} cm.`, `Lateral surface = ${p + q + c} × ${h} = ${fmt(lateral)} cm².`],
        method: total ? 'Total surface = base perimeter × height + 2 × base area.' : 'Lateral surface = base perimeter × height.',
        hints: total
          ? ['The surface is three rectangles and two equal triangles.', 'The rectangles together: perimeter × height.', `Each triangle: ${p}² + ${q}² = ${c}², so it is right-angled with area ½ × ${p} × ${q}.`]
          : ['The lateral surface is the three rectangular side faces.', 'Unrolled, they make one rectangle: the perimeter of the base by the height.'],
        commonMistakes: total ? ['Adding only one of the two triangular ends.', `Taking each end as ${p} × ${q} without the ½.`] : ['Adding the triangular ends, which are not part of the lateral surface.']
      };
    }
  },

  /* ---------------- prism on an equilateral or hexagonal base: volume in √3 ---------------- */
  {
    id: 'td-adv-prism-regular',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-adv-prism',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['td-adv-prism-f', 'td-sc-hexagon-base'],
    tags: ['advanced'],
    estimatedSeconds: 60,
    // The value is the multiple of √3.
    formatValue: (value) => `${fmt(value)}√3 cm³`,
    params(rng) {
      if (rng.chance(0.5)) return { base: 'triangle', a: 2 * rng.int(1, 7), h: 3 * rng.int(1, 8) };
      const a = rng.int(2, 10);
      const h = rng.int(3, 20);
      // (3√3/2)a²h is a whole multiple of √3 when a or h is even.
      if ((a * a * h) % 2) return null;
      return { base: 'hexagon', a, h };
    },
    answer: ({ base, a, h }) => (base === 'triangle' ? (a * a * h) / 4 : (3 * a * a * h) / 2),
    distractors: ({ base, a, h }) =>
      base === 'triangle'
        ? [
            { value: (a * a * h) / 2, why: 'used (√3/2)a², side × height of the triangle without halving' },
            { value: a * a * h, why: 'left out the ÷ 4 in (√3/4)a²' },
            { value: (a * a * h) / 12, why: 'divided by 3 as for a pyramid' },
            { value: (3 * a * a * h) / 2, why: 'used the hexagon formula' }
          ]
        : [
            { value: (a * a * h) / 4, why: 'used one equilateral triangle for the whole hexagon' },
            { value: (a * a * h) / 2, why: 'divided by 3 as for a pyramid' },
            { value: 3 * a * a * h, why: 'used 3√3a², forgetting the ½' },
            { value: (3 * a * a * h) / 4, why: 'used (3√3/4)a²' }
          ],
    verify: ({ base, a, h }, value) => close(value * SQRT3, meshVolume(prismMesh(regularCorners(base === 'triangle' ? 3 : 6, a), h))),
    render({ base, a, h }, { fmt: show }) {
      const tri = base === 'triangle';
      const coefficient = tri ? (a * a) / 4 : (3 * a * a) / 2;
      const name = tri ? 'an equilateral triangle' : 'a regular hexagon';
      return {
        question: `The base of a right prism is ${name} of side ${cm(a)}, and the prism is ${cm(h)} high. What is its volume?`,
        figure: solidFigure(
          `A right prism on ${name} of side ${cm(a)}, ${cm(h)} high`,
          `A right prism whose base is ${name}. A base edge is labelled ${cm(a)} and a vertical edge ${cm(h)}. The hidden edges at the back are dashed.`,
          { shape: 'prism', base, a, h, labels: { a: cm(a), h: cm(h) } }
        ),
        explanation: tri
          ? `An equilateral triangle of side a has area (√3/4)a² = (√3/4) × ${a * a} = ${fmt(coefficient)}√3 cm². Every slice of the prism is that triangle, so volume = ${fmt(coefficient)}√3 × ${h} = ${show(coefficient * h)}.`
          : `A regular hexagon is six equilateral triangles: 6 × (√3/4)a² = (3√3/2) × ${a * a} = ${fmt(coefficient)}√3 cm². Every slice of the prism is that hexagon, so volume = ${fmt(coefficient)}√3 × ${h} = ${show(coefficient * h)}.`,
        solutionSteps: [
          tri ? `Base area = (√3/4) × ${a}² = ${fmt(coefficient)}√3 cm².` : `Base area = 6 × (√3/4) × ${a}² = ${fmt(coefficient)}√3 cm².`,
          `Volume = base area × height = ${fmt(coefficient)}√3 × ${h} = ${show(coefficient * h)}.`
        ],
        method: 'Volume of a right prism = base area × height.',
        hints: [
          'Find the area of the base first.',
          tri ? 'An equilateral triangle of side a has area (√3/4)a².' : 'A regular hexagon is six equilateral triangles of side a: (3√3/2)a².',
          'Multiply the base area by the height.'
        ],
        commonMistakes: tri
          ? ['Using (√3/2)a², which doubles the base.', 'Dividing by 3 as if the solid were a pyramid.']
          : ['Counting only one of the six triangles in the hexagon.', 'Writing 3√3a² and forgetting the ½.']
      };
    }
  },

  /* ---------------- square pyramid: volume from side, diagonal or slant height ---------------- */
  {
    id: 'td-adv-pyramid-volume',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-adv-pyramid',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['td-adv-pyramid-f'],
    tags: ['advanced'],
    answerDecimals: 0,
    estimatedSeconds: 70,
    formatValue: (value) => cm3(value),
    params(rng) {
      const mode = rng.pick(['side', 'diagonal', 'slant']);
      if (mode === 'slant') {
        // Half the side, the height and the slant height form a triple, so a²h/3 = 4m²h/3 is whole.
        const [m, h, l] = pickTriple(rng, 30, [1, 2]);
        return { mode, a: 2 * m, h, l };
      }
      const a = rng.int(4, 24);
      const h = rng.int(3, 30);
      if ((a * a * h) % 3) return null;
      return { mode, a, h };
    },
    answer: ({ a, h }) => (a * a * h) / 3,
    distractors: ({ mode, a, h, l }) => [
      { value: a * a * h, why: 'forgot the ⅓' },
      { value: (a * a * h) / 2, why: 'used ½ in place of ⅓' },
      mode === 'diagonal'
        ? { value: (2 * a * a * h) / 3, why: 'took the square of the diagonal as the base area' }
        : mode === 'slant'
          ? { value: (a * a * l) / 3, why: 'used the slant height as the height' }
          : { value: (4 * a * h) / 3, why: 'used the perimeter 4a in place of the area a²' },
      { value: (a * a * h) / 6, why: 'treated the base as a triangle, ½ × a × a' }
    ],
    verify: ({ a, h }, value) => close(value, meshVolume(squarePyramid(a, h))),
    render({ mode, a, h, l }) {
      const base = a * a;
      const given =
        mode === 'side'
          ? `stands on a square base of side ${cm(a)} and is ${cm(h)} high`
          : mode === 'diagonal'
            ? `is ${cm(h)} high, and the diagonal of its square base is ${a}√2 cm`
            : `stands on a square base of side ${cm(a)}, and the slant height of each face is ${cm(l)}`;
      const first =
        mode === 'diagonal'
          ? [`A square with diagonal ${a}√2 has side ${a} cm, so the base area = ${base} cm².`]
          : mode === 'slant'
            ? [`Height = √(slant² − (half the side)²) = √(${l}² − ${a / 2}²) = ${h} cm.`]
            : [];
      return {
        question: `A right pyramid ${given}. What is its volume?`,
        figure: solidFigure(
          mode === 'slant' ? `A square pyramid with base side ${cm(a)} and slant height ${cm(l)}` : `A square pyramid ${cm(h)} high`,
          mode === 'slant'
            ? `A right pyramid on a square base. A base edge is labelled ${cm(a)}, and a dashed line from the apex down the middle of the front face is labelled ${cm(l)}. The height is not marked.`
            : `A right pyramid on a square base, with a dashed vertical line from the centre of the base to the apex labelled ${cm(h)}.${mode === 'side' ? ` A base edge is labelled ${cm(a)}.` : ' The base edges are not labelled.'}`,
          {
            shape: 'pyramid',
            base: 'square',
            a,
            h,
            labels: mode === 'slant' ? { a: cm(a), l: cm(l) } : mode === 'side' ? { a: cm(a), h: cm(h) } : { h: cm(h) }
          }
        ),
        explanation: `${mode === 'diagonal' ? `A square's area is half the square of its diagonal: (${a}√2)² ÷ 2 = ${base} cm². ` : mode === 'slant' ? `The height, half the side (${a / 2} cm) and the slant height form a right triangle, so the height = √(${l}² − ${a / 2}²) = ${h} cm. ` : ''}A pyramid holds a third of the prism on the same base and height: ⅓ × ${base} × ${h} = ${fmt((base * h) / 3)} cm³.`,
        solutionSteps: [...first, `Base area = ${a}² = ${base} cm².`, `Volume = ⅓ × ${base} × ${h} = ${fmt((base * h) / 3)} cm³.`],
        method: 'Volume of a pyramid = ⅓ × base area × height.',
        hints: [
          mode === 'slant' ? 'The volume needs the vertical height, not the slant height.' : 'Find the area of the square base first.',
          mode === 'slant' ? `Height² = slant height² − (half the side)² = ${l}² − ${a / 2}².` : mode === 'diagonal' ? 'A square\'s area is half the square of its diagonal.' : `The base is ${a}² = ${base} cm².`,
          'Volume = ⅓ × base area × height.'
        ],
        commonMistakes: [
          'Forgetting the ⅓, which gives the volume of the prism on the same base.',
          mode === 'slant' ? 'Using the slant height in place of the vertical height.' : mode === 'diagonal' ? 'Squaring the diagonal and taking that as the base area.' : 'Using ½ in place of ⅓.'
        ]
      };
    }
  },

  /* ---------------- square pyramid: lateral or total surface from the height ---------------- */
  {
    id: 'td-adv-pyramid-surface',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-adv-pyramid',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['td-adv-pyramid-f'],
    tags: ['advanced'],
    estimatedSeconds: 75,
    formatValue: (value) => cm2(value),
    params(rng) {
      // Half the side, the height and the slant height form a triple.
      const [m, h, l] = pickTriple(rng, 45);
      return { a: 2 * m, h, l, ask: rng.pick(['lateral', 'total']) };
    },
    answer: ({ a, l, ask }) => 2 * a * l + (ask === 'total' ? a * a : 0),
    distractors({ a, h, l, ask }) {
      const base = ask === 'total' ? a * a : 0;
      return [
        { value: 2 * a * h + base, why: 'used the vertical height in place of the slant height' },
        { value: 4 * a * l + base, why: 'forgot the ½' },
        ask === 'total' ? { value: 2 * a * l, why: 'left out the base' } : { value: 2 * a * l + a * a, why: 'added the base' }
      ];
    },
    verify({ a, h, ask }, value) {
      const faces = faceAreas(squarePyramid(a, h));
      return close(value, ask === 'total' ? sum(faces) : sum(faces.slice(1)));
    },
    render({ a, h, l, ask }) {
      const lateral = 2 * a * l;
      const total = ask === 'total';
      return {
        question: `A right pyramid stands on a square base of side ${cm(a)} and is ${cm(h)} high. Find its ${total ? 'total' : 'lateral'} surface area.`,
        figure: solidFigure(
          `A square pyramid with base side ${cm(a)} and height ${cm(h)}`,
          `A right pyramid on a square base. A base edge is labelled ${cm(a)}, and a dashed vertical line from the centre of the base to the apex is labelled ${cm(h)}.`,
          { shape: 'pyramid', base: 'square', a, h, labels: { a: cm(a), h: cm(h) } }
        ),
        explanation: `Each face is a triangle whose height is the slant height. It runs to the middle of a side, ${a / 2} cm from the centre, so the slant height = √(${h}² + ${a / 2}²) = ${l} cm. Lateral surface = ½ × perimeter × slant height = ½ × ${4 * a} × ${l} = ${fmt(lateral)} cm².${total ? ` Adding the base, ${a * a} cm², gives ${fmt(lateral + a * a)} cm².` : ''}`,
        solutionSteps: [
          `Slant height = √(${h}² + ${a / 2}²) = √${h * h + (a / 2) ** 2} = ${l} cm.`,
          `Lateral surface = ½ × ${4 * a} × ${l} = ${fmt(lateral)} cm².`,
          ...(total ? [`Total = ${fmt(lateral)} + ${a}² = ${fmt(lateral + a * a)} cm².`] : [])
        ],
        method: total ? 'Total surface = ½ × perimeter × slant height + base.' : 'Lateral surface = ½ × perimeter × slant height.',
        hints: ['The faces are triangles: their height is the slant height, not the vertical height.', `Slant height² = height² + (half the side)² = ${h}² + ${a / 2}².`, 'Lateral surface = ½ × perimeter × slant height.'],
        commonMistakes: ['Using the vertical height in place of the slant height.', total ? 'Leaving out the square base.' : 'Adding the base, which is not part of the lateral surface.']
      };
    }
  },

  /* ---------------- square pyramid: surface from the lateral edge ---------------- */
  {
    id: 'td-adv-pyramid-edge',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-adv-pyramid',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['td-adv-pyramid-f', 'td-sc-slant-edge'],
    tags: ['advanced'],
    estimatedSeconds: 90,
    formatValue: (value) => cm2(value),
    params(rng) {
      // Each face is isosceles: half the side m, the face's height l and the edge e form a triple, l > m.
      const [x, y, z] = rng.pick(TRIPLES);
      const s = rng.pick([1, 2].filter((k) => k * z <= 45).concat([1]));
      return { a: 2 * Math.min(x, y) * s, l: Math.max(x, y) * s, e: z * s, ask: rng.pick(['lateral', 'total']) };
    },
    answer: ({ a, l, ask }) => 2 * a * l + (ask === 'total' ? a * a : 0),
    distractors({ a, l, e, ask }) {
      const base = ask === 'total' ? a * a : 0;
      return [
        { value: 2 * a * e + base, why: 'used the lateral edge as the slant height' },
        { value: 4 * a * l + base, why: 'forgot the ½' },
        ask === 'total' ? { value: 2 * a * l, why: 'left out the base' } : { value: 2 * a * l + a * a, why: 'added the base' }
      ];
    },
    verify({ a, e, ask }, value) {
      // Build the pyramid from the edge alone: the apex is √(e² − (a/√2)²) above the centre.
      const h = Math.sqrt(e * e - (a * a) / 2);
      const mesh = squarePyramid(a, h);
      if (!close(distance3(mesh.vertices[4], mesh.vertices[0]), e)) return false;
      const faces = faceAreas(mesh);
      return close(value, ask === 'total' ? sum(faces) : sum(faces.slice(1)));
    },
    render({ a, l, e, ask }) {
      const total = ask === 'total';
      const lateral = 2 * a * l;
      const h = Math.round(Math.sqrt(e * e - (a * a) / 2) * 100) / 100;
      return {
        question: `A right pyramid stands on a square base of side ${cm(a)}, and each of its lateral edges is ${cm(e)}. Find its ${total ? 'total' : 'lateral'} surface area.`,
        figure: solidFigure(
          `A square pyramid with base side ${cm(a)} and lateral edges of ${cm(e)}`,
          `A right pyramid on a square base. A base edge is labelled ${cm(a)}, and a sloping edge from the apex down to a corner is labelled ${cm(e)}. The height is not marked.`,
          { shape: 'pyramid', base: 'square', a, h, labels: { a: cm(a), e: cm(e) } }
        ),
        explanation: `Each face is an isosceles triangle with sides ${e}, ${e} and ${a}. Its height, the slant height, meets the base at the middle of the ${a} cm side: √(${e}² − ${a / 2}²) = ${l} cm. Lateral surface = ½ × ${4 * a} × ${l} = ${fmt(lateral)} cm².${total ? ` Adding the base, ${a * a} cm², gives ${fmt(lateral + a * a)} cm².` : ''}`,
        solutionSteps: [
          `Slant height = √(${e}² − ${a / 2}²) = √${e * e - (a / 2) ** 2} = ${l} cm.`,
          `Lateral surface = ½ × ${4 * a} × ${l} = ${fmt(lateral)} cm².`,
          ...(total ? [`Total = ${fmt(lateral)} + ${a * a} = ${fmt(lateral + a * a)} cm².`] : [])
        ],
        method: 'Slant height from the lateral edge and half the side, then ½ × perimeter × slant height.',
        hints: ['Look at one triangular face on its own: what are its three sides?', `Its height splits the ${a} cm side into two halves of ${a / 2} cm.`, `Slant height = √(${e}² − ${a / 2}²); then ½ × perimeter × slant height.`],
        commonMistakes: ['Using the lateral edge as the slant height: the edge runs to a corner, the slant height to the middle of a side.', total ? 'Leaving out the square base.' : 'Adding the base to the lateral surface.']
      };
    }
  },

  /* ---------------- cone frustum: volume ---------------- */
  {
    id: 'td-adv-frustum-volume',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-adv-frustum',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['td-adv-frustum-f'],
    tags: ['advanced'],
    estimatedSeconds: 80,
    formatValue: (value) => cm3(value),
    params(rng) {
      const i = rng.int(1, 3);
      return { r: 7 * i, R: 7 * rng.int(i + 1, i + 3), h: 3 * rng.int(1, 15), bucket: rng.chance(0.5) };
    },
    // (22/7) × (h/3) × (R² + Rr + r²): with R and r multiples of 7 and h of 3, a whole number.
    answer: ({ R, r, h }) => (22 * (h / 3) * (R * R + R * r + r * r)) / 7,
    distractors: ({ R, r, h }) => [
      { value: (22 * h * (R * R + R * r + r * r)) / 7, why: 'forgot the ⅓' },
      { value: (22 * (h / 3) * (R * R + r * r)) / 7, why: 'left out the middle term Rr' },
      { value: (22 * h * (R * R + r * r)) / 14, why: 'averaged the two end areas and multiplied by the height' },
      { value: (22 * (h / 3) * R * R) / 7, why: 'used a cone on the larger end' }
    ],
    verify: ({ R, r, h }, value) => close(value, frustumByCones(R, r, h).volume),
    render({ R, r, h, bucket }) {
      const s = R * R + R * r + r * r;
      const v = (22 * (h / 3) * s) / 7;
      return {
        question: bucket
          ? `A bucket is the frustum of a cone, with radius ${cm(R)} at the top and ${cm(r)} at the bottom, and it is ${cm(h)} deep. How much water can it hold? (Use π = 22/7.)`
          : `A frustum of a cone has end radii ${cm(R)} and ${cm(r)} and height ${cm(h)}. What is its volume? (Use π = 22/7.)`,
        figure: solidFigure(
          bucket ? `A bucket: radius ${cm(R)} at the top, ${cm(r)} at the bottom, ${cm(h)} deep` : `A frustum of a cone with radii ${cm(R)} and ${cm(r)}, ${cm(h)} high`,
          bucket
            ? `A frustum of a cone, wider at the top. The top radius is labelled ${cm(R)}, the bottom radius ${cm(r)}, and the dashed axis between the ends ${cm(h)}.`
            : `A frustum of a cone, narrower at the top. The bottom radius is labelled ${cm(R)}, the top radius ${cm(r)}, and the dashed axis between the ends ${cm(h)}.`,
          bucket
            ? { shape: 'frustum', R: r, r: R, h, labels: { R: cm(r), r: cm(R), h: cm(h) } }
            : { shape: 'frustum', R, r, h, labels: { R: cm(R), r: cm(r), h: cm(h) } }
        ),
        explanation: `A frustum is a cone with its top cut off, and V = (πh/3)(R² + Rr + r²) = (22/7) × (${h}/3) × (${R * R} + ${R * r} + ${r * r}) = (22/7) × ${h / 3} × ${s} = ${fmt(v)} cm³.`,
        solutionSteps: [`R² + Rr + r² = ${R * R} + ${R * r} + ${r * r} = ${s}.`, `V = (22/7) × ${h / 3} × ${s} = ${fmt(v)} cm³.`],
        method: 'Frustum volume = (πh/3)(R² + Rr + r²).',
        hints: ['The solid is a cone with its tip cut off: use the frustum volume formula.', 'V = (πh/3)(R² + Rr + r²).', `R² + Rr + r² = ${R * R} + ${R * r} + ${r * r}.`],
        commonMistakes: ['Averaging the two end areas and multiplying by the height, as if it were a cylinder.', 'Leaving out the middle term Rr, or the ⅓.']
      };
    }
  },

  /* ---------------- cone frustum: curved, total or open-bucket surface ---------------- */
  {
    id: 'td-adv-frustum-surface',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-adv-frustum',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['td-adv-frustum-f'],
    tags: ['advanced'],
    estimatedSeconds: 100,
    formatValue: (value) => cm2(value),
    params(rng) {
      // R − r, the height and the slant height form a triple whose first leg is a multiple of 7.
      const [d, h, l] = rng.pick([[7, 24, 25], [21, 20, 29], [21, 28, 35], [28, 21, 35], [14, 48, 50], [35, 12, 37], [28, 45, 53]]);
      const r = 7 * rng.int(1, 3);
      return { R: r + d, r, h, l, ask: rng.pick(['curved', 'total', 'bucket']) };
    },
    answer({ R, r, l, ask }) {
      const curved = (22 * l * (R + r)) / 7;
      if (ask === 'curved') return curved;
      return ask === 'total' ? curved + (22 * (R * R + r * r)) / 7 : curved + (22 * r * r) / 7;
    },
    distractors({ R, r, h, l, ask }) {
      const curved = (22 * l * (R + r)) / 7;
      const byHeight = (22 * h * (R + r)) / 7;
      const [top, bottom] = [(22 * R * R) / 7, (22 * r * r) / 7];
      if (ask === 'curved') {
        return [
          { value: byHeight, why: 'used the height in place of the slant height' },
          { value: curved + top + bottom, why: 'added both ends' },
          { value: (22 * l * R) / 7, why: 'used only the larger radius, as for a cone' }
        ];
      }
      if (ask === 'total') {
        return [
          { value: curved, why: 'left out both ends' },
          { value: curved + top, why: 'added only one end' },
          { value: byHeight + top + bottom, why: 'used the height in place of the slant height' }
        ];
      }
      return [
        { value: curved + top + bottom, why: 'added both ends to an open bucket' },
        { value: curved + top, why: 'added the open top in place of the bottom' },
        { value: curved, why: 'left out the bottom' },
        { value: byHeight + bottom, why: 'used the depth in place of the slant height' }
      ];
    },
    verify({ R, r, h, ask }, value) {
      const m = frustumByCones(R, r, h);
      return close(value, m.curved + (ask === 'total' ? m.big + m.small : ask === 'bucket' ? m.small : 0));
    },
    render({ R, r, h, l, ask }) {
      const curved = (22 * l * (R + r)) / 7;
      const top = (22 * R * R) / 7;
      const bottom = (22 * r * r) / 7;
      const bucket = ask === 'bucket';
      const answer = ask === 'curved' ? curved : ask === 'total' ? curved + top + bottom : curved + bottom;
      const question = bucket
        ? `A bucket, open at the top, is the frustum of a cone. Its top radius is ${cm(R)}, its bottom radius ${cm(r)} and its depth ${cm(h)}. How much metal sheet is needed to make it? (Use π = 22/7.)`
        : `A frustum of a cone has end radii ${cm(R)} and ${cm(r)} and height ${cm(h)}. What is its ${ask === 'curved' ? 'curved' : 'total'} surface area? (Use π = 22/7.)`;
      const ends = ask === 'total' ? ` Both ends are added: (22/7) × (${R}² + ${r}²) = ${fmt(top + bottom)} cm², making ${fmt(answer)} cm².` : bucket ? ` The top is open, so only the bottom is added: (22/7) × ${r}² = ${fmt(bottom)} cm², making ${fmt(answer)} cm².` : '';
      return {
        question,
        figure: solidFigure(
          bucket ? `A bucket: radius ${cm(R)} at the open top, ${cm(r)} at the bottom, ${cm(h)} deep` : `A frustum of a cone with radii ${cm(R)} and ${cm(r)}, ${cm(h)} high`,
          bucket
            ? `A frustum of a cone, wider at the top, like a bucket. The top radius is labelled ${cm(R)}, the bottom radius ${cm(r)}, and the dashed axis between the ends ${cm(h)}.`
            : `A frustum of a cone, narrower at the top. The bottom radius is labelled ${cm(R)}, the top radius ${cm(r)}, and the dashed axis between the ends ${cm(h)}.`,
          bucket ? { shape: 'frustum', R: r, r: R, h, labels: { R: cm(r), r: cm(R), h: cm(h) } } : { shape: 'frustum', R, r, h, labels: { R: cm(R), r: cm(r), h: cm(h) } }
        ),
        explanation: `The slant height is √(h² + (R − r)²) = √(${h}² + ${R - r}²) = ${l} cm. Curved surface = πl(R + r) = (22/7) × ${l} × ${R + r} = ${fmt(curved)} cm².${ends}`,
        solutionSteps: [
          `Slant height = √(${h}² + ${R - r}²) = ${l} cm.`,
          `Curved surface = (22/7) × ${l} × (${R} + ${r}) = ${fmt(curved)} cm².`,
          ...(ask === 'total' ? [`Add both ends: ${fmt(curved)} + ${fmt(top)} + ${fmt(bottom)} = ${fmt(answer)} cm².`] : []),
          ...(bucket ? [`Add the bottom only: ${fmt(curved)} + ${fmt(bottom)} = ${fmt(answer)} cm².`] : [])
        ],
        method: bucket ? 'Curved surface πl(R + r), plus the bottom circle only.' : ask === 'total' ? 'Curved surface πl(R + r), plus πR² and πr².' : 'Curved surface = πl(R + r).',
        hints: [
          bucket ? 'Which surfaces does the metal make? The bucket has no lid.' : 'The surface formulas use the slant height, not the vertical height.',
          'Slant height = √(h² + (R − r)²).',
          'Curved surface = πl(R + r).'
        ],
        commonMistakes: [
          'Using the vertical height in place of the slant height.',
          bucket ? 'Adding both circular ends, though the bucket is open at the top.' : ask === 'total' ? 'Adding only one of the two circular ends.' : 'Adding the circular ends, which are not part of the curved surface.'
        ]
      };
    }
  },

  /* ---------------- a cone cut parallel to its base ---------------- */
  {
    id: 'td-adv-cone-cut',
    version: 1,
    topicId: 'mensuration-3d',
    conceptId: 'td-adv-frustum',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['td-sc-cone-cut'],
    tags: ['advanced'],
    estimatedSeconds: 75,
    // 'height': the answer is in cm. 'share': the answer is the numerator of a fraction over q³.
    formatValue: (value, { mode, q }) => (mode === 'height' ? cm(value) : fractionOf(value, q ** 3)),
    params(rng) {
      const [p, q] = rng.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5]]);
      const mode = rng.pick(['height', 'share']);
      return { mode, p, q, H: q * rng.int(2, 12) };
    },
    answer: ({ mode, p, q, H }) => (mode === 'height' ? H - (H * p) / q : q ** 3 - p ** 3),
    distractors: ({ mode, p, q, H }) =>
      mode === 'height'
        ? [
            { value: (H * p) / q, why: "gave the small cone's height, measured from the apex" },
            { value: H - (H * p ** 3) / q ** 3, why: 'used the volume ratio as the height ratio' },
            { value: H - (H * p * p) / (q * q), why: 'used the square of the height ratio' }
          ]
        : [
            { value: q ** 3 - p * q * q, why: 'used the height ratio in place of its cube' },
            { value: q ** 3 - p * p * q, why: 'used the square of the height ratio' },
            { value: p ** 3, why: "gave the small cone's share" }
          ],
    verify({ mode, p, q, H }, value) {
      // Slice a cone of radius 1 into thin discs: the radius at height y is 1 − y/H.
      const disc = (y) => (1 - y / H) ** 2;
      const whole = simpson(disc, 0, H);
      if (mode === 'height') return close(simpson(disc, value, H) / whole, (p / q) ** 3);
      return close(simpson(disc, 0, H - (H * p) / q) / whole, value / q ** 3);
    },
    render({ mode, p, q, H }, { fmt: show }) {
      const k = `${p}/${q}`;
      const k3 = `${p ** 3}/${q ** 3}`;
      if (mode === 'height') {
        const small = (H * p) / q;
        return {
          question: `A cone ${cm(H)} high is cut by a plane parallel to its base. The small cone cut off from the top has ${k3} of the volume of the whole cone. How far above the base is the cut?`,
          explanation: `The small cone is similar to the whole cone, so its volume is the cube of the height ratio. (height ratio)³ = ${k3}, so the height ratio is ${k}. The small cone is ${k} × ${H} = ${fmt(small)} cm tall, measured down from the apex, so the cut is ${H} − ${fmt(small)} = ${show(H - small)} above the base.`,
          solutionSteps: [`(h′/H)³ = ${k3}, so h′/H = ${k}.`, `Small cone's height = ${k} × ${H} = ${fmt(small)} cm, from the apex.`, `Cut above the base = ${H} − ${fmt(small)} = ${show(H - small)}.`],
          method: 'Volume ratio of similar cones = cube of the height ratio; take the cube root.',
          hints: ['The small cone on top is similar to the whole cone.', `Which height ratio, cubed, gives ${k3}?`, "The small cone's height is measured from the apex; the question asks from the base."],
          commonMistakes: ["Giving the small cone's own height, which is measured from the apex.", 'Using the volume ratio as the height ratio, without the cube root.']
        };
      }
      return {
        question: `A cone is cut by a plane parallel to its base, so that the small cone cut off from the top is ${k} of the cone's height. What fraction of the cone's volume is in the frustum left at the bottom?`,
        figure: solidFigure(
          `A cone cut parallel to its base; the small cone on top is ${k} of the height`,
          `A cone with a horizontal cut, drawn as an ellipse with its back half dashed, ${k} of the way down from the apex. The frustum below the cut and the small cone above it are not labelled.`,
          { shape: 'frustum', R: q, r: p, h: q - p },
          { shape: 'cone', r: p, h: p }
        ),
        explanation: `The small cone is similar to the whole one with every length ${k} as long, so it holds (${k})³ = ${k3} of the volume. The frustum keeps the rest: 1 − ${k3} = ${show(q ** 3 - p ** 3)}.`,
        solutionSteps: [`Small cone = (${k})³ = ${k3} of the volume.`, `Frustum = 1 − ${k3} = ${show(q ** 3 - p ** 3)}.`],
        method: 'Similar solids: volume ratio = cube of the length ratio.',
        hints: ['How does the small cone compare with the whole cone?', 'It is similar: its volume is the cube of the height ratio.', `The small cone holds (${k})³; the frustum holds the rest.`],
        commonMistakes: [`Using ${k} itself (or its square) in place of its cube.`, "Giving the small cone's share instead of the frustum's."]
      };
    }
  }
];
