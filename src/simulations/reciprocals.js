/**
 * Simulations: x + 1/x and its powers (algebraic-identities, Advanced unit).
 * Their meta.js entries keep this order.
 *
 * The x + 1/x ladder: a slider for k = x + 1/x (or x − 1/x), the curve
 * y = x + 1/x cut by the line y = k at x and its partner, and the rungs
 * xⁿ + 1/xⁿ built only from earlier rungs. The maths is in
 * utils/reciprocalPowers.js; tests/simulations-reciprocals.test.js holds this
 * model to an independent calculation from x itself.
 */

import { near, show } from './core.js';
import { directPower, ladderByRoutes, realRoots, rungRoute } from '../utils/reciprocalPowers.js';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sup = (n) => String(n).split('').map((d) => SUP[d]).join('');
const sub = (n) => String(n).split('').map((d) => SUB[d]).join('');
const MAX_RUNG = 8;
const VIEW = 6;

/** "x + 1/x", "x³ − 1/x³", "x⁴ + 1/x⁴": rung n of the ladder for this sign. */
export function rungName(n, sign) {
  const op = sign === 1 || n % 2 === 0 ? '+' : '−';
  return n === 1 ? `x ${op} 1/x` : `x${sup(n)} ${op} 1/x${sup(n)}`;
}

/** A value inside a sum, bracketed when negative: 4, (−3). */
const term = (value) => (value < 0 ? `(${show(value)})` : show(value));

/** How rung n is built, in symbols and in numbers: "p₂² − 2 = 14² − 2". */
function routeText(n, sign, rungs) {
  if (n === 1) return 'given: k';
  const { a, b, minus } = rungRoute(n, sign);
  const op = minus > 0 ? '−' : '+';
  if (a === b) return `p${sub(a)}² ${op} 2 = ${term(rungs[a])}² ${op} 2`;
  return `p${sub(a)} × p${sub(b)} ${op} p₁ = ${term(rungs[a])} × ${term(rungs[b])} ${op} ${term(rungs[1])}`;
}

/** Points of y = x + sign/x on one side of the y-axis, from near the axis out to the edge of the view. */
function branch(sign, side) {
  const points = [];
  for (let i = 0; i <= 120; i++) {
    const x = side * (0.15 + ((VIEW - 0.15) * i) / 120);
    points.push([x, x + sign / x]);
  }
  return points;
}

export const reciprocalLadder = {
  id: 'reciprocal-ladder',
  topicId: 'algebraic-identities',
  title: 'The x + 1/x ladder',
  summary: 'Slide k = x + 1/x and climb to x⁸ + 1/x⁸ using only k, never x itself, and see why k cannot lie between −2 and 2.',
  controls: [
    {
      id: 'mode',
      label: 'Given',
      type: 'choice',
      options: [
        { id: 'plus', label: 'x + 1/x = k' },
        { id: 'minus', label: 'x − 1/x = k' }
      ],
      default: 'plus'
    },
    { id: 'k', label: 'k (the given value)', type: 'range', min: -5, max: 5, step: 0.5, default: 4 },
    { id: 'top', label: 'Highest power shown', type: 'range', min: 3, max: MAX_RUNG, step: 1, default: 5 }
  ],
  compute({ mode, k, top }) {
    const sign = mode === 'minus' ? -1 : 1;
    const rungs = ladderByRoutes(k, MAX_RUNG, sign);
    const roots = realRoots(k, sign);
    const real = roots.length > 0;
    const [x, partner] = real ? roots : [NaN, NaN];
    const touching = real && near(x, partner, 1e-9);
    const direct = real ? rungs.map((_, n) => directPower(x, n, sign)) : null;
    // (x + 1/x)² − (x − 1/x)² = 4, so the other one of the pair is known up to sign.
    const otherSquare = sign === 1 ? k * k - 4 : k * k + 4;
    const partnerName = sign === 1 ? '1/x' : '−1/x';
    const curveName = sign === 1 ? 'y = x + 1/x' : 'y = x − 1/x';

    const rows = [];
    for (let n = 1; n <= top; n++) {
      rows.push({
        label: rungName(n, sign),
        cells: [{ text: routeText(n, sign, rungs) }, { text: show(rungs[n]) }, { text: real ? show(direct[n]) : 'no real x' }]
      });
    }

    const markers = !real
      ? []
      : touching
        ? [{ x, y: k, tone: 'geometry', label: `x = ${partnerName} = ${show(x)}` }]
        : x * partner > 0
          ? // Both roots on one side of the axis sit close together: one label for the pair, on the outer one.
            [
              { x, y: k, tone: 'geometry', label: `x = ${show(x, 2)}, ${partnerName} = ${show(partner, 2)}` },
              { x: partner, y: k, tone: 'combinatorics' }
            ]
          : [
              { x, y: k, tone: 'geometry', label: `x = ${show(x, 2)}` },
              { x: partner, y: k, tone: 'combinatorics', label: `${partnerName} = ${show(partner, 2)}` }
            ];

    const graph = {
      kind: 'xy',
      x: { min: -5, max: 5, label: 'x' },
      y: { min: -5, max: 5, label: 'y' },
      series: [
        { id: 'right', label: `${curveName}, x > 0`, tone: 'algebra', points: branch(sign, 1) },
        { id: 'left', label: `${curveName}, x < 0`, tone: 'advanced', points: branch(sign, -1) },
        { id: 'level', label: `y = k = ${show(k)}`, tone: 'data', dashed: true, points: [[-VIEW, k], [VIEW, k]] }
      ],
      guides: sign === 1 ? [{ axis: 'y', value: 2, label: 'y = 2' }, { axis: 'y', value: -2, label: 'y = −2' }] : [],
      markers,
      summary: `The curve ${curveName} and the line y = ${show(k)}. ${
        !real
          ? 'They do not meet: the curve has no points between y = −2 and y = 2.'
          : touching
            ? `The line touches the curve once, at x = ${show(x)}.`
            : `They meet at x = ${show(x, 2)} and x = ${show(partner, 2)}, whose product is ${sign === 1 ? '1' : '−1'}.`
      }`
    };
    const table = {
      kind: 'table',
      caption: `The ladder for ${rungName(1, sign)} = ${show(k)} (pₙ is rung n)`,
      corner: 'Rung',
      columns: ['Built from earlier rungs', 'Value', 'Straight from x'],
      rows,
      focusRow: top - 1,
      summary: `Rungs 1 to ${top}: ${rows.map((row, i) => `${row.label} = ${show(rungs[i + 1])}`).join('; ')}.${real ? ' Working them out from x itself gives the same values.' : ' There is no real x to check them against.'}`
    };

    let insight;
    if (!real) {
      insight = `No real x gives x + 1/x = ${show(k)}. For x > 0, x + 1/x = (√x − 1/√x)² + 2 is at least 2, and for x < 0 it is at most −2. The ladder still runs on k alone (x² + 1/x² = ${show(rungs[2])}), but it describes no real number.`;
    } else if (touching) {
      insight = `k = ${show(k)} is where the line just touches the curve: x = 1/x = ${show(x)}, because (x ${k > 0 ? '−' : '+'} 1)² = 0. Every rung is then ${k > 0 ? '2' : '2 or −2'}.`;
    } else if (sign === 1) {
      insight = `Every rung needs only k: x = ${show(x, 3)} was never used. ${rungName(top, sign)} = ${routeText(top, sign, rungs)} = ${show(rungs[top])}, and the column worked out from x agrees. Also x − 1/x = ±${show(Math.sqrt(otherSquare), 3)}, since (x + 1/x)² − (x − 1/x)² = 4.`;
    } else {
      insight = `Any k works for x − 1/x: the curve passes every height, so the line always meets it, at x and −1/x. The cross terms change sign: x² + 1/x² = k² + 2 = ${show(rungs[2])} and x³ − 1/x³ = k³ + 3k = ${show(rungs[3])}.`;
    }

    return {
      numbers: { k, sign, real, touching, roots, rungs, direct, top, otherSquare },
      readouts: [
        {
          label: `x and ${partnerName}`,
          value: !real ? 'no real x: k lies between −2 and 2' : touching ? `both ${show(x)}` : `${show(x, 3)} and ${show(partner, 3)}`
        },
        sign === 1
          ? {
              label: 'x − 1/x = ±√(k² − 4)',
              value: real ? `±${show(Math.sqrt(otherSquare), 3)}` : 'not real'
            }
          : { label: 'x + 1/x = ±√(k² + 4)', value: `±${show(Math.sqrt(otherSquare), 3)}` },
        { label: rungName(top, sign), value: show(rungs[top]) }
      ],
      plot: { kind: 'stack', plots: [graph, table], summary: `${graph.summary} ${table.summary}` },
      insight
    };
  },
  tasks: [
    {
      id: 'no-real-x',
      prompt: 'Find a value of x + 1/x that no real x can give, so the line misses the curve.',
      check: (values, n) => values.mode === 'plus' && !n.real,
      solution: { mode: 'plus', k: 1 }
    },
    {
      id: 'touch',
      prompt: 'Make x and 1/x the same number: the line should just touch the curve.',
      check: (values, n) => values.mode === 'plus' && n.touching,
      solution: { mode: 'plus', k: 2 }
    },
    {
      id: 'forty-seven',
      prompt: 'With x + 1/x = k, make the fourth rung x⁴ + 1/x⁴ equal 47.',
      check: (values, n) => values.mode === 'plus' && near(n.rungs[4], 47),
      solution: { mode: 'plus', k: 3 }
    },
    {
      id: 'eleven',
      prompt: 'Switch to x − 1/x = k and make x² + 1/x² equal 11.',
      check: (values, n) => values.mode === 'minus' && near(n.rungs[2], 11),
      solution: { mode: 'minus', k: 3 }
    }
  ]
};

export const reciprocalSims = [reciprocalLadder];
