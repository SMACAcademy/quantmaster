/**
 * Simulations for four CAT and placement topics: modulus (distances on a
 * number line and the flat bottom of a V graph), polynomials (the remainder is
 * the curve's height), integer solutions (lattice points on a line) and
 * cryptarithms (a sum worked column by column). The maths comes from
 * utils/modulus.js, utils/polynomials.js, utils/diophantine.js and
 * utils/cryptarithm.js, which are tested against brute force;
 * tests/simulations-cat.test.js holds these models to them.
 */

import { show } from './core.js';
import { absSum, absText, minAbsSum, solvePiecewise } from '../utils/modulus.js';
import { evaluate, linearFactorText, polyText, realRoots, syntheticDivision, vieta } from '../utils/polynomials.js';
import { gcd, generalSolution, solutions } from '../utils/diophantine.js';
import { candidatesAfter, columnCount, lettersOf, leadingLetters, puzzleText } from '../utils/cryptarithm.js';

const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;
const listText = (list) => (list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

/* --------------------------------- modulus --------------------------------- */

const X_RANGE = [-10, 10];

export const modulusDistance = {
  id: 'modulus-distance',
  topicId: 'modulus',
  alsoTopicIds: ['inequalities'],
  title: 'Modulus as distance, and the flat bottom',
  summary: 'Read |x − a| as the distance from x to a on a number line. Add a second distance and the V graph gets a flat bottom: its least value is the gap between a and b.',
  controls: [
    {
      id: 'mode',
      label: 'Function',
      type: 'choice',
      options: [
        { id: 'one', label: '|x − a|' },
        { id: 'two', label: '|x − a| + |x − b|' }
      ],
      default: 'two'
    },
    { id: 'a', label: 'a', type: 'range', min: -6, max: 6, step: 1, default: -1 },
    { id: 'b', label: 'b', type: 'range', min: -6, max: 6, step: 1, default: 3, showWhen: { mode: 'two' } },
    { id: 'x', label: 'x (the moving point)', type: 'range', min: -10, max: 10, step: 0.5, default: 5 },
    { id: 'c', label: 'Level c (solve f(x) = c)', type: 'range', min: 0, max: 16, step: 1, default: 8 }
  ],
  compute({ mode, a, b, x, c }) {
    const two = mode === 'two';
    const centres = two ? [a, b] : [a];
    const f = (t) => absSum(t, centres);
    const name = two ? `${absText(a)} + ${absText(b)}` : absText(a);
    const value = f(x);
    const { min, from, to } = minAbsSum(centres);
    const solved = solvePiecewise(f, centres, c);
    const count = solved.intervals.length ? Infinity : solved.points.length;
    const lo = Math.min(...centres);
    const hi = Math.max(...centres);

    const solutionText = solved.intervals.length
      ? `every x from ${show(from)} to ${show(to)}`
      : solved.points.length
        ? `x = ${listText(solved.points.map((p) => show(p)))}`
        : 'none';
    const minText = from === to ? `${show(min)}, at x = ${show(from)} only` : `${show(min)}, for every x from ${show(from)} to ${show(to)}`;

    let insight;
    if (!two) {
      insight =
        c === 0
          ? `|x − ${show(a)}| = 0 only at x = ${show(a)}: the one point at distance 0 from ${show(a)}.`
          : `Two points lie at distance ${c} from ${show(a)}: ${show(a - c)} and ${show(a + c)}. A level above the vertex always cuts a V twice.`;
    } else if (a === b) {
      insight = `With a = b the two distances are equal, so f(x) = 2|x − ${show(a)}|: a single V, twice as steep.`;
    } else if (count === Infinity) {
      insight = `c equals the least value ${show(min)}, so every x between ${show(lo)} and ${show(hi)} is a solution: there the two distances always add up to the gap between ${show(lo)} and ${show(hi)}.`;
    } else if (count === 0) {
      insight = `No x is less than ${show(min)} away from ${show(lo)} and ${show(hi)} together, so f(x) = ${c} has no solution.`;
    } else if (x >= lo && x <= hi) {
      insight = `x is between ${show(lo)} and ${show(hi)}, so its two distances add up to exactly the gap ${show(hi - lo)}: that is the flat bottom.`;
    } else {
      insight = `Outside the gap, moving x one step away adds 1 to both distances, so the graph climbs with slope 2.`;
    }

    // The graph: exact corners, so the V and its flat bottom are drawn sharp.
    const xs = [...new Set([X_RANGE[0], ...centres, X_RANGE[1]])].sort((p, q) => p - q);
    const graph = xs.map((t) => [t, f(t)]);
    const top = Math.max(f(X_RANGE[0]), f(X_RANGE[1]), c, 4);
    const markers = [
      { x, y: value, tone: 'algebra', label: `f(${show(x)}) = ${show(value)}` },
      ...solved.points.filter((p) => p >= X_RANGE[0] && p <= X_RANGE[1]).map((p) => ({ x: p, y: c, tone: 'geometry' }))
    ];
    const series = [{ id: 'f', label: `f(x) = ${name}`, tone: 'algebra', points: graph }];
    if (two && from !== to) series.push({ id: 'bottom', label: `Least value ${show(min)}`, tone: 'data', points: [[from, min], [to, min]] });
    if (solved.intervals.length) series.push({ id: 'solved', label: `f(x) = ${c} here`, tone: 'geometry', dashed: true, points: [[from, c], [to, c]] });

    const rows = [
      {
        label: 'x',
        tone: 'algebra',
        bands: [
          { from: Math.min(x, a), to: Math.max(x, a), tone: 'algebra' },
          ...(two ? [{ from: Math.min(x, b), to: Math.max(x, b), tone: 'data' }] : [])
        ],
        points: [
          { value: a, label: `a = ${show(a)}`, shape: 'diamond', tone: 'algebra', slot: 'above' },
          ...(two ? [{ value: b, label: `b = ${show(b)}`, shape: 'diamond', tone: 'data', slot: a === b ? 'high' : 'above' }] : []),
          { value: x, label: `x = ${show(x)}`, shape: 'runner', tone: 'geometry', slot: 'below' }
        ]
      }
    ];

    return {
      numbers: { value, min, from, to, count, solutions: solved.points, interval: solved.intervals[0] || null, distanceA: Math.abs(x - a), distanceB: two ? Math.abs(x - b) : null },
      readouts: [
        { label: `Distance from x to a, ${absText(a)}`, value: show(Math.abs(x - a)) },
        ...(two ? [{ label: `Distance from x to b, ${absText(b)}`, value: show(Math.abs(x - b)) }] : []),
        { label: `f(${show(x)})`, value: show(value) },
        { label: 'Least value of f', value: minText },
        { label: `Solutions of f(x) = ${c}`, value: `${solutionText} (${count === Infinity ? 'infinitely many' : plural(count, 'solution')})` }
      ],
      plot: {
        kind: 'stack',
        summary: `f(x) = ${name}. At x = ${show(x)} it is ${show(value)}. Least value ${minText}. f(x) = ${c}: ${solutionText}.`,
        plots: [
          {
            kind: 'numberlines',
            min: X_RANGE[0],
            max: X_RANGE[1],
            step: 1,
            labelStep: 2,
            rows,
            summary: `A number line from −10 to 10 with a = ${show(a)}${two ? `, b = ${show(b)}` : ''} and x = ${show(x)}. Shaded: the distance ${show(Math.abs(x - a))} from x to a${two ? ` and the distance ${show(Math.abs(x - b))} from x to b` : ''}.`
          },
          {
            kind: 'xy',
            x: { min: X_RANGE[0], max: X_RANGE[1], label: 'x' },
            y: { min: 0, max: top, label: 'f(x)' },
            series,
            guides: [{ axis: 'y', value: c, label: `y = ${c}` }],
            markers,
            summary: `The graph of f(x) = ${name}, ${two && a !== b ? `flat at height ${show(min)} from ${show(from)} to ${show(to)}` : `a V with its vertex at (${show(from)}, ${show(min)})`}. The level y = ${c} meets it at ${solutionText}.`
          }
        ]
      },
      insight
    };
  },
  tasks: [
    {
      id: 'one-answer',
      prompt: 'With the single modulus |x − a|, set the level c so that f(x) = c has exactly one solution.',
      check: (values, n) => values.mode === 'one' && n.count === 1,
      solution: { mode: 'one', c: 0 }
    },
    {
      id: 'on-bottom',
      prompt: 'With two moduli, move x to a place where the total distance is as small as it can be.',
      check: (values, n) => values.mode === 'two' && values.a !== values.b && n.value === n.min,
      solution: { mode: 'two', x: 1 }
    },
    {
      id: 'flat',
      prompt: 'With two moduli, choose c so that f(x) = c has infinitely many solutions.',
      check: (values, n) => values.mode === 'two' && n.count === Infinity,
      solution: { mode: 'two', c: 4 }
    },
    {
      id: 'none',
      prompt: 'With two moduli, make f(x) = c impossible: no x at all.',
      check: (values, n) => values.mode === 'two' && n.count === 0,
      solution: { mode: 'two', c: 2 }
    }
  ]
};

/* -------------------------------- polynomials -------------------------------- */

const P_RANGE = [-4, 4];

export const remainderCurve = {
  id: 'remainder-curve',
  topicId: 'polynomials',
  alsoTopicIds: ['quadratic-equations'],
  title: 'The remainder is the height of the curve',
  summary: 'Change the coefficients of a cubic and the point a. Dividing p(x) by (x − a) leaves p(a), the height of the curve at a; when the curve crosses the axis there, x − a is a factor.',
  controls: [
    { id: 'b', label: 'b (coefficient of x²)', type: 'range', min: -6, max: 6, step: 1, default: -2 },
    { id: 'c', label: 'c (coefficient of x)', type: 'range', min: -9, max: 9, step: 1, default: -5 },
    { id: 'd', label: 'd (constant term)', type: 'range', min: -9, max: 9, step: 1, default: 4 },
    { id: 'a', label: 'Divide by (x − a): a', type: 'range', min: -4, max: 4, step: 1, default: 2 }
  ],
  compute({ b, c, d, a }) {
    const coeffs = [1, b, c, d];
    const p = (x) => evaluate(coeffs, x);
    const name = polyText(coeffs);
    const division = syntheticDivision(coeffs, a);
    const remainder = division.remainder;
    const roots = realRoots(coeffs);
    // + 0 turns −0 (from −b when b = 0) into 0.
    const { sum, pairSum, product } = vieta(coeffs);
    const relations = { sum: sum + 0, pairSum: pairSum + 0, product: product + 0 };
    const factor = remainder === 0;
    const divisor = linearFactorText(a);

    const samples = Array.from({ length: 161 }, (_, i) => P_RANGE[0] + (i * (P_RANGE[1] - P_RANGE[0])) / 160);
    const values = samples.map(p);
    // The picture's height follows the curve, but a steep end is cut off rather than squashing the middle flat.
    const visible = [...values.filter((v) => Math.abs(v) <= 40), remainder, 0];
    const yMin = Math.max(-40, Math.min(-10, ...visible));
    const yMax = Math.min(40, Math.max(10, ...visible));
    // Points far off the picture are pulled in just past its edge (the plot clips them).
    const clampY = (v) => Math.max(yMin - 20, Math.min(yMax + 20, v));
    const rootText = roots.length ? roots.map((r) => show(r)).join(', ') : 'none';

    let insight;
    if (factor) insight = `p(${a}) = 0, so the curve crosses the axis at x = ${a} and ${divisor} is a factor: p(x) = ${divisor}(${polyText(division.quotient)}).`;
    else if (a === 0) insight = `Dividing by x leaves p(0) = ${show(d)}, the constant term: the curve meets the y-axis at height ${show(d)}.`;
    else if (roots.length === 1) insight = `The curve crosses the axis once, so there is one real root; the other two roots are not real, though the sum of all three is still −b = ${show(relations.sum)}.`;
    else insight = `p(${a}) = ${show(remainder)}: the curve is ${remainder > 0 ? 'above' : 'below'} the axis at x = ${a} by ${show(Math.abs(remainder))}, and that is the remainder on dividing by ${divisor}.`;

    const coefficientCells = coeffs.map((v) => ({ text: show(v), kind: 'given' }));
    const productCells = division.products.map((v) => ({ text: v === null ? '' : show(v), kind: v === null ? 'blank' : null }));
    const sumCells = division.sums.map((v, i) => ({ text: show(v), kind: 'derived', note: i === division.sums.length - 1 ? 'remainder' : null }));

    return {
      numbers: {
        remainder,
        quotient: division.quotient,
        roots,
        realRootCount: roots.length,
        factor,
        sum: relations.sum,
        pairSum: relations.pairSum,
        product: relations.product
      },
      readouts: [
        { label: 'p(x)', value: name },
        { label: `Remainder on dividing by ${divisor}`, value: `p(${a}) = ${show(remainder)}` },
        { label: 'Quotient', value: polyText(division.quotient) },
        { label: 'Real roots (where the curve crosses)', value: rootText },
        { label: 'Sum of the roots, −b', value: show(relations.sum) },
        { label: 'Sum of products two at a time, c', value: show(relations.pairSum) },
        { label: 'Product of the roots, −d', value: show(relations.product) }
      ],
      plot: {
        kind: 'stack',
        summary: `p(x) = ${name}. p(${a}) = ${show(remainder)}${factor ? `, so ${divisor} is a factor` : ''}. Real roots: ${rootText}.`,
        plots: [
          {
            kind: 'xy',
            x: { min: P_RANGE[0], max: P_RANGE[1], label: 'x' },
            y: { min: yMin, max: yMax, label: 'p(x)' },
            series: [{ id: 'p', label: `p(x) = ${name}`, tone: 'algebra', points: samples.map((x, i) => [x, clampY(values[i])]) }],
            guides: [
              { axis: 'y', value: 0 },
              { axis: 'x', value: a, label: `x = ${a}` }
            ],
            markers: [
              ...roots.filter((r) => r >= P_RANGE[0] && r <= P_RANGE[1] && Math.abs(r - a) > 1e-9).map((r) => ({ x: r, y: 0, tone: 'data' })),
              { x: a, y: remainder, tone: factor ? 'geometry' : 'combinatorics', label: factor ? `p(${a}) = 0: a factor` : `remainder p(${a}) = ${show(remainder)}` }
            ],
            summary: `The graph of p(x) = ${name} from x = −4 to 4. At x = ${a} its height is ${show(remainder)}. It crosses the x-axis at ${rootText}.`
          },
          {
            kind: 'table',
            caption: `Synthetic division of p(x) by ${divisor}`,
            corner: `a = ${a}`,
            columns: ['x³', 'x²', 'x', '1'],
            rows: [
              { label: 'Coefficients', cells: coefficientCells },
              { label: `Carried × ${a}`, cells: productCells },
              { label: 'Sums', cells: sumCells }
            ],
            summary: `Synthetic division by ${divisor}: coefficients ${coeffs.map((v) => show(v)).join(', ')}; sums ${division.sums.map((v) => show(v)).join(', ')}. The quotient is ${polyText(division.quotient)} and the remainder ${show(remainder)}.`
          }
        ]
      },
      insight
    };
  },
  tasks: [
    {
      id: 'factor',
      prompt: 'Find coefficients and a value of a (not 0) that make x − a a factor: the remainder must be 0.',
      check: (values, n) => values.a !== 0 && n.factor,
      solution: { b: -2, c: -5, d: 6, a: 1 }
    },
    {
      id: 'sum-zero',
      prompt: 'Keep three real roots, but make them add up to 0.',
      check: (values, n) => n.realRootCount === 3 && n.sum === 0,
      solution: { b: 0, c: -7, d: 6 }
    },
    {
      id: 'one-root',
      prompt: 'Make the curve cross the x-axis only once.',
      check: (values, n) => n.realRootCount === 1,
      solution: { b: 0, c: 1, d: -2 }
    },
    {
      id: 'touch',
      prompt: 'Make the curve just touch the axis at one point and cross it at another (a repeated root).',
      check: (values, n) => n.realRootCount === 2,
      solution: { b: 0, c: -3, d: 2 }
    }
  ]
};

/* ----------------------------- integer solutions ----------------------------- */

export const latticeLine = {
  id: 'lattice-line',
  topicId: 'integer-solutions',
  alsoTopicIds: ['linear-equations'],
  title: 'Whole-number points on a line',
  summary: 'Draw ax + by = c over a grid. The points where it passes exactly through a grid corner are its whole-number solutions, and they are evenly spaced: x steps by b/g and y by a/g.',
  controls: [
    { id: 'a', label: 'a (coefficient of x)', type: 'range', min: 1, max: 12, step: 1, default: 3 },
    { id: 'b', label: 'b (coefficient of y)', type: 'range', min: 1, max: 12, step: 1, default: 5 },
    { id: 'c', label: 'c', type: 'range', min: 1, max: 60, step: 1, default: 47 },
    {
      id: 'mode',
      label: 'Count solutions in',
      type: 'choice',
      options: [
        { id: 'positive', label: 'Positive integers' },
        { id: 'non-negative', label: 'Non-negative integers' }
      ],
      default: 'positive'
    }
  ],
  compute({ a, b, c, mode }) {
    const least = mode === 'positive' ? 1 : 0;
    const g = gcd(a, b);
    const general = generalSolution(a, b, c);
    const found = solutions(a, b, c, least);
    // Solutions on an axis, shown but not counted when only positive ones count.
    const onAxes = least === 1 ? solutions(a, b, c, 0).filter(([x, y]) => x === 0 || y === 0) : [];
    const count = found.length;
    const stepX = b / g;
    const stepY = a / g;
    const xMax = Math.max(1, Math.ceil(c / a));
    const yMax = Math.max(1, Math.ceil(c / b));
    const what = least ? 'positive' : 'non-negative';
    const listed = found.length > 8 ? `${found.slice(0, 8).map(([x, y]) => `(${x}, ${y})`).join(', ')}, …` : found.map(([x, y]) => `(${x}, ${y})`).join(', ');

    let insight;
    if (!general) insight = `gcd(${a}, ${b}) = ${g} does not divide ${c}, so ax + by is always a multiple of ${g} and can never equal ${c}: the line misses every grid point.`;
    else if (!count) insight = `${a}x + ${b}y = ${c} has whole-number solutions, but none with both x and y ${least ? 'at least 1' : 'at least 0'}: the line passes its grid points outside the first quadrant${onAxes.length ? ' or on the axes' : ''}.`;
    else if (count === 1) insight = `Only one ${what} solution, (${found[0][0]}, ${found[0][1]}). The next one is ${stepX} to the right and ${stepY} down, which leaves the quadrant.`;
    else insight = `From one solution to the next, x goes up by b/g = ${stepX} and y goes down by a/g = ${stepY}, so the ${count} solutions are evenly spaced along the line.`;

    return {
      numbers: { g, solvable: Boolean(general), count, solutions: found, stepX, stepY, onAxes: onAxes.length, touchesBothAxes: found.some(([x]) => x === 0) && found.some(([, y]) => y === 0) },
      readouts: [
        { label: 'Equation', value: `${a}x + ${b}y = ${c}` },
        { label: `gcd(${a}, ${b})`, value: `${g}${general ? `, which divides ${c}` : `, which does not divide ${c}`}` },
        { label: `${least ? 'Positive' : 'Non-negative'} solutions (x, y)`, value: count ? listed : 'none' },
        { label: 'How many', value: String(count) },
        { label: 'Step between solutions', value: general ? `x + ${stepX}, y − ${stepY}` : '—' }
      ],
      plot: {
        kind: 'lattice',
        xMax,
        yMax,
        line: { a, b, c },
        least,
        points: found.map(([x, y]) => ({ x, y })),
        excluded: onAxes.map(([x, y]) => ({ x, y })),
        step: found.length >= 2 ? { from: found[0], to: found[1], label: `x + ${stepX}, y − ${stepY}` } : null,
        summary: `The line ${a}x + ${b}y = ${c} on a grid from 0 to ${xMax} across and 0 to ${yMax} up. ${count ? `It passes through ${plural(count, `${what} whole-number point`)}: ${listed}.` : `It passes through no ${what} whole-number point.`}`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'miss',
      prompt: 'Make the line miss every grid point: choose a and b with a common factor that does not divide c.',
      check: (values, n) => !n.solvable,
      solution: { a: 4, b: 6, c: 15 }
    },
    {
      id: 'five',
      prompt: 'Find an equation with exactly five positive solutions.',
      check: (values, n) => values.mode === 'positive' && n.count === 5,
      solution: { a: 2, b: 3, c: 31, mode: 'positive' }
    },
    {
      id: 'axes',
      prompt: 'Counting non-negative solutions, make the line pass through grid points on both axes.',
      check: (values, n) => values.mode === 'non-negative' && n.touchesBothAxes,
      solution: { a: 3, b: 5, c: 30, mode: 'non-negative' }
    }
  ]
};

/* ------------------------------- cryptarithms ------------------------------- */

/** Original sums, each with exactly one solution (tests/simulations-cat.test.js checks). */
export const SOLVER_PUZZLES = {
  six: { op: '+', terms: ['SIX', 'SIX'], result: 'HILL' },
  kite: { op: '+', terms: ['KITE', 'KITE'], result: 'TIGER' },
  tea: { op: '+', terms: ['TEA', 'TEA', 'TEA'], result: 'EAR' },
  sitar: { op: '+', terms: ['SITAR', 'STAR'], result: 'TRAIN' }
};

export const columnSolver = {
  id: 'column-solver',
  topicId: 'cryptarithmetic',
  title: 'Solve a letter sum column by column',
  summary: 'Work a letter sum from the units column leftwards. Each column, with its carry, rules out digits; watch each letter’s candidates shrink until one digit is left for every letter.',
  controls: [
    {
      id: 'puzzle',
      label: 'Puzzle',
      type: 'choice',
      options: [
        { id: 'six', label: 'SIX + SIX = HILL' },
        { id: 'kite', label: 'KITE + KITE = TIGER' },
        { id: 'tea', label: 'TEA + TEA + TEA = EAR' },
        { id: 'sitar', label: 'SITAR + STAR = TRAIN' }
      ],
      default: 'six'
    },
    { id: 'k', label: 'Columns worked (from the right)', type: 'range', min: 0, max: 6, step: 1, default: 0 }
  ],
  compute({ puzzle: key, k: wanted }) {
    const puzzle = SOLVER_PUZZLES[key];
    const columns = columnCount(puzzle);
    const k = Math.min(wanted, columns);
    const letters = lettersOf(puzzle);
    const leading = new Set(leadingLetters(puzzle));
    const { partialCount, candidates, carries } = candidatesAfter(puzzle, k);
    const fixed = letters.filter((l) => candidates[l].length === 1);
    const total = letters.reduce((sum, l) => sum + candidates[l].length, 0);
    const solved = k === columns && partialCount === 1;
    const digitOf = (l) => (candidates[l].length === 1 ? candidates[l][0] : null);
    const carryText = (list) => (list.length === 1 ? String(list[0]) : list.join(' or '));
    const at = (word, i) => (i < word.length ? word[word.length - 1 - i] : null);
    const thisColumn = k > 0 ? [...puzzle.terms.map((w) => at(w, k - 1)).filter(Boolean), at(puzzle.result, k - 1)].filter(Boolean) : [];

    let insight;
    if (k === 0) insight = `Before any column: each letter can be any digit, except that ${listText([...leading])} lead${leading.size === 1 ? 's' : ''} a word, so cannot be 0.`;
    else if (solved) insight = `All ${columns} columns worked: one assignment is left, so the puzzle has exactly one solution.`;
    else if (k === columns && partialCount === 0) insight = 'No assignment survives every column, so this puzzle has no solution.';
    else if (k === columns - 1 && puzzle.result.length > Math.max(...puzzle.terms.map((w) => w.length))) insight = `One column left: it holds only ${puzzle.result[0]}, which must equal the final carry, so ${puzzle.result[0]} = 1 if the carry can be 1 (and never 0).`;
    else insight = `Column ${k} (${listText([...new Set(thisColumn)])}) with its carry leaves ${plural(partialCount, 'way')} to fill the first ${plural(k, 'column')}; ${plural(fixed.length, 'letter')} already ${fixed.length === 1 ? 'has' : 'have'} one digit left.`;

    const rows = [
      ...puzzle.terms.map((word, i) => ({ sign: i === 0 ? '' : puzzle.op, word })),
      { sign: '=', word: puzzle.result }
    ];

    return {
      numbers: { k, columns, partialCount, fixed: fixed.length, total, solved, candidates },
      readouts: [
        { label: 'Puzzle', value: puzzleText(puzzle) },
        { label: 'Columns worked', value: `${k} of ${columns}` },
        { label: 'Ways to fill those columns', value: String(partialCount) },
        { label: 'Letters with one digit left', value: fixed.length ? fixed.map((l) => `${l} = ${digitOf(l)}`).join(', ') : 'none yet' },
        { label: 'Candidates left (all letters)', value: String(total) }
      ],
      plot: {
        kind: 'cryptarithm',
        columns,
        done: k,
        rows,
        carries: carries.map(carryText),
        digits: Object.fromEntries(letters.map((l) => [l, digitOf(l)])),
        candidates: letters.map((l) => ({ letter: l, digits: candidates[l], leading: leading.has(l) })),
        summary: `${puzzleText(puzzle)}, ${k} of ${columns} columns worked. ${letters.map((l) => `${l}: ${candidates[l].length === 1 ? candidates[l][0] : `${candidates[l].length} digits`}`).join('; ')}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'solve-six',
      prompt: 'Work SIX + SIX = HILL all the way: which digit is L?',
      check: (values, n) => values.puzzle === 'six' && n.solved,
      solution: { puzzle: 'six', k: 4 }
    },
    {
      id: 'units',
      prompt: 'In KITE + KITE = TIGER, work just the units column. How many digits can E still be?',
      check: (values, n) => values.puzzle === 'kite' && n.k === 1,
      solution: { puzzle: 'kite', k: 1 }
    },
    {
      id: 'three',
      prompt: 'In TEA + TEA + TEA = EAR the carries can be 2. Solve it completely.',
      check: (values, n) => values.puzzle === 'tea' && n.solved,
      solution: { puzzle: 'tea', k: 3 }
    }
  ]
};

export const catTopicSims = [modulusDistance, remainderCurve, latticeLine, columnSolver];
