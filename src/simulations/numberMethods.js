/**
 * Simulations for remainders, factorials, squares and roots, and speed maths:
 * the remainder wheel, the fives inside n!, the square-root bracket and the
 * base method as an area. The maths comes from utils/numberTheory.js, which is
 * tested against brute force; tests/simulations-numbermethods.test.js holds
 * these models to it.
 */

import { show } from './core.js';
import {
  baseMethod as baseParts,
  cubeRootByEnds,
  gcd,
  isPrime,
  legendre,
  legendreLayers,
  powerCycle,
  powerFromCycle,
  squareRootByEnds,
  totient,
  trailingZeros,
  valuation
} from '../utils/numberTheory.js';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const pw = (a, k) => `${a}${String(k).split('').map((d) => SUP[d]).join('')}`;
const listText = (list, max = 12) => (list.length > max ? `${list.slice(0, max).join(', ')}, …` : list.join(', '));

/* ------------------------------ remainder wheel ------------------------------ */

export const remainderWheel = {
  id: 'remainder-wheel',
  topicId: 'remainders',
  alsoTopicIds: ['number-system'],
  title: 'The remainder wheel',
  summary: 'Walk round a clock of n positions as the power rises, and watch the remainders fall into a loop.',
  controls: [
    { id: 'a', label: 'Base a', type: 'range', min: 2, max: 20, step: 1, default: 3 },
    { id: 'n', label: 'Divisor n (positions on the wheel)', type: 'range', min: 2, max: 20, step: 1, default: 7 },
    { id: 'k', label: 'Power k', type: 'range', min: 1, max: 24, step: 1, default: 1 }
  ],
  compute({ a, n, k }) {
    const { tail, cycle } = powerCycle(a, n);
    const T = tail.length;
    const L = cycle.length;
    const sequence = Array.from({ length: k }, (_, i) => powerFromCycle(a, i + 1, n));
    const remainder = sequence[k - 1];
    const coprime = gcd(a, n) === 1;
    const prime = isPrime(n);
    const phi = totient(n);
    const visited = new Set(sequence);

    const positions = Array.from({ length: n }, (_, value) => ({
      value,
      state: value === remainder ? 'current' : visited.has(value) ? (cycle.includes(value) ? 'cycle' : 'tail') : 'idle'
    }));
    const path = sequence.slice(1).map((to, i) => ({ from: sequence[i], to, inCycle: i + 1 >= T }));
    const place = k <= T ? null : ((k - T - 1) % L) + 1;

    let insight;
    if (a % n === 0) insight = `${a} is a multiple of ${n}, so every power of ${a} leaves 0.`;
    else if (T > 0) insight = `${a} and ${n} share a factor, so the walk passes ${tail.join(', ')} before settling into a loop of ${L}, and it never comes back to 1.`;
    else if (n === 10) insight = `On division by 10 the remainder is the unit digit: powers of ${a} end in ${cycle.join(', ')} and repeat every ${L}.`;
    else if (prime) insight = `Powers of ${a} come back to 1 after ${L} step${L > 1 ? 's' : ''}, and ${L} divides ${n} − 1 = ${n - 1}, as Fermat's theorem promises. Only k mod ${L} matters.`;
    else insight = `Powers of ${a} come back to 1 after ${L} step${L > 1 ? 's' : ''}, and ${L} divides φ(${n}) = ${phi} (Euler). Only k mod ${L} matters.`;

    const theorem = !coprime
      ? { label: 'Theorems', value: `${a} and ${n} share a factor, so Fermat and Euler do not apply` }
      : prime
        ? { label: 'Fermat', value: `${pw(a, n - 1)} leaves 1; the cycle length ${L} divides ${n - 1}` }
        : { label: 'Euler', value: `φ(${n}) = ${phi}, so ${pw(a, phi)} leaves 1; the cycle length ${L} divides ${phi}` };

    return {
      numbers: { remainder, sequence, cycle: L, tail: T, cycleValues: cycle, coprime, prime, phi },
      readouts: [
        { label: `${pw(a, k)} ÷ ${n} leaves`, value: show(remainder) },
        { label: 'Remainders of the powers', value: listText(sequence) },
        { label: 'The loop', value: `${cycle.join(', ')} (length ${L})${T ? `, after ${tail.join(', ')}` : ''}` },
        { label: 'Place in the loop', value: place ? `${k} → place ${place} of ${L}` : `still before the loop` },
        theorem
      ],
      plot: {
        kind: 'wheel',
        n,
        positions,
        path,
        summary: `A wheel with positions 0 to ${n - 1}. The powers of ${a} visit ${listText(sequence)}; ${pw(a, k)} lands on ${remainder}. The loop is ${cycle.join(', ')}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'unit-cycle',
      prompt: 'Set the divisor to 10 and find a base whose unit digits repeat every 4 powers, like 7, 9, 3, 1.',
      check: (values, n) => values.n === 10 && n.cycle === 4,
      solution: { a: 7, n: 10 }
    },
    {
      id: 'always-one',
      prompt: 'Find a base and divisor where every power leaves remainder 1.',
      check: (values, n) => n.tail === 0 && n.cycle === 1 && n.cycleValues[0] === 1,
      solution: { a: 10, n: 9 }
    },
    {
      id: 'full-circle',
      prompt: 'With divisor 13, find a base whose powers visit all 12 non-zero remainders before repeating.',
      check: (values, n) => values.n === 13 && n.cycle === 12,
      solution: { a: 2, n: 13 }
    },
    {
      id: 'tail',
      prompt: 'Find a base and divisor where the remainders take a step or two before they start to loop.',
      check: (values, n) => n.tail > 0,
      solution: { a: 2, n: 12 }
    }
  ]
};

/* ------------------------------ fives inside n! ------------------------------ */

const LAYER_TONES = ['arithmetic', 'combinatorics', 'data', 'geometry'];

export const factorialFives = {
  id: 'factorial-fives',
  topicId: 'factorials',
  title: 'Counting primes inside n!',
  summary: 'Shade the multiples of a prime in 1 to n, layer by layer, and see where the zeros of n! come from.',
  controls: [
    { id: 'n', label: 'n', type: 'range', min: 5, max: 100, step: 1, default: 30 },
    {
      id: 'p',
      label: 'Prime p',
      type: 'choice',
      options: [
        { id: '2', label: '2' },
        { id: '3', label: '3' },
        { id: '5', label: '5' },
        { id: '7', label: '7' }
      ],
      default: '5'
    }
  ],
  compute({ n, p }) {
    const P = Number(p);
    const layers = legendreLayers(n, P);
    const exponent = legendre(n, P);
    const twos = legendre(n, 2);
    const fives = legendre(n, 5);
    const zeros = trailingZeros(n);

    // Ten numbers a row, one unit a cell; a legend row underneath.
    const rows = Math.ceil(n / 10);
    const rects = [];
    for (let m = 1; m <= n; m++) {
      const v = valuation(m, P);
      rects.push({
        x: (m - 1) % 10,
        y: Math.floor((m - 1) / 10),
        w: 0.96,
        h: 0.96,
        tone: v ? LAYER_TONES[Math.min(v, 4) - 1] : 'algebra',
        faint: v === 0,
        dashed: v === 0,
        label: String(m)
      });
    }
    const legendY = rows + 0.35;
    const notes = [];
    const deepest = Math.max(1, layers.length);
    for (let i = 0; i < Math.min(deepest, 4); i++) {
      rects.push({ x: i * 2.5, y: legendY, w: 0.5, h: 0.5, tone: LAYER_TONES[i] });
      notes.push({ x: i * 2.5 + 0.7, y: legendY + 0.42, text: i === 0 ? `holds ${P}` : i === 3 ? `${pw(P, 4)} or more` : `holds ${pw(P, i + 1)}`, anchor: 'start' });
    }

    const layerText = layers.length ? layers.map((v, i) => `⌊${n}/${P ** (i + 1)}⌋ = ${v}`).join(' + ') : `no multiples of ${P} up to ${n}`;
    let insight;
    if (P === 5) {
      insight =
        n >= 25
          ? `${n}! ends in ${zeros} zero${zeros === 1 ? '' : 's'}. Each multiple of 25 holds a second 5, so the count jumps by 2 there: 24! ends in 4 zeros, 25! in 6.`
          : `${n}! ends in ${zeros} zero${zeros === 1 ? '' : 's'}: one for each multiple of 5, because 2s are always plentiful.`;
    } else if (P === 2) {
      insight = `${n}! holds ${twos} twos but only ${fives} fives. Every zero needs one of each, so the fives decide: ${zeros} zero${zeros === 1 ? '' : 's'}.`;
    } else {
      insight = layers.length
        ? `${pw(P, exponent)} is the highest power of ${P} in ${n}!: the multiples of ${P} give ${layers[0]}${layers.length > 1 ? `, and multiples of ${P * P} add ${layers.slice(1).join(' + ')} more` : ''}.`
        : `No number up to ${n} is a multiple of ${P}, so ${P} does not divide ${n}!.`;
    }

    return {
      numbers: { exponent, layers, twos, fives, zeros },
      readouts: [
        { label: `Power of ${P} in ${n}!`, value: layers.length ? `${layerText} → ${pw(P, exponent)}` : layerText },
        { label: 'Twos and fives', value: `${twos} twos, ${fives} fives` },
        { label: `Zeros at the end of ${n}!`, value: `${zeros} (one for each pair of 2 and 5)` }
      ],
      plot: {
        kind: 'rects',
        width: 10,
        height: legendY + 0.6,
        rects,
        notes,
        summary: `The numbers 1 to ${n}. The ${layers[0] || 0} multiples of ${P} are shaded${layers.length > 1 ? `, with the ${layers[1]} multiples of ${P * P} in a second colour` : ''}. ${n}! holds ${pw(P, exponent)}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'six-zeros',
      prompt: 'Find the smallest n whose factorial ends in 6 zeros. Is there any n with exactly 5?',
      check: (values) => values.n === 25,
      solution: { n: 25 }
    },
    {
      id: 'three-to-ten',
      prompt: 'With p = 3, find an n for which 3¹⁰ is the highest power of 3 in n!.',
      check: (values, n) => values.p === '3' && n.exponent === 10,
      solution: { n: 24, p: '3' }
    },
    {
      id: 'seven-squared',
      prompt: 'With p = 7, find the smallest n where some number from 1 to n holds 7 twice.',
      check: (values) => values.p === '7' && values.n === 49,
      solution: { n: 49, p: '7' }
    }
  ]
};

/* ------------------------------ root bracket ------------------------------ */

export const rootBracket = {
  id: 'root-bracket',
  topicId: 'squares-cubes-roots',
  title: 'A square root from its two ends',
  summary: 'Narrow a root down in three steps: the last digit, the bracket of tens, then the midpoint.',
  controls: [
    {
      id: 'kind',
      label: 'Root',
      type: 'choice',
      options: [
        { id: 'square', label: 'Square root' },
        { id: 'cube', label: 'Cube root' }
      ],
      default: 'square'
    },
    { id: 'r', label: 'Hidden root (the number is its square or cube)', type: 'range', min: 11, max: 99, step: 1, default: 47 },
    { id: 'step', label: 'Step of the method', type: 'range', min: 1, max: 3, step: 1, default: 1 }
  ],
  compute({ kind, r, step }) {
    const square = kind === 'square';
    const N = square ? r * r : r ** 3;
    const info = square ? squareRootByEnds(N) : cubeRootByEnds(N);
    const digits = square ? info.digits : [info.digit];
    const candidates = digits.map((d) => 10 * info.k + d);
    const power = square ? '²' : '³';
    const dropped = square ? 'two' : 'three';
    const kPow = (x) => (square ? x * x : x ** 3);

    // Three rows of ten cells, each with a caption above it.
    const rects = [];
    const notes = [];
    const rowY = (i) => 0.8 + i * 1.9;
    // Step 1: which last digits are possible.
    notes.push({ x: 0, y: rowY(0) - 0.2, text: `Step 1: ${show(N, 0)} ends in ${info.unit}`, anchor: 'start' });
    for (let d = 0; d <= 9; d++) {
      const on = digits.includes(d);
      rects.push({ x: d, y: rowY(0), w: 0.94, h: 0.94, tone: on ? 'arithmetic' : 'algebra', faint: !on, label: `${d}` });
    }
    if (step >= 2) {
      notes.push({ x: 0, y: rowY(1) - 0.2, text: `Step 2: drop ${dropped} digits → ${info.lead}; tens digit ${info.k}`, anchor: 'start' });
      for (let t = 1; t <= 9; t++) {
        const on = t === info.k;
        rects.push({ x: t, y: rowY(1), w: 0.94, h: 0.94, tone: on ? 'combinatorics' : 'algebra', faint: !on, dashed: kPow(t) > info.lead, label: `${kPow(t)}` });
      }
    }
    if (step >= 3) {
      const midText = square && candidates.length === 2 ? `${10 * info.k + 5}${power} = ${show(info.mid, 0)} → ${info.root}` : `only one candidate → ${info.root}`;
      notes.push({ x: 0, y: rowY(2) - 0.2, text: `Step 3: ${midText}`, anchor: 'start' });
      for (let d = 0; d <= 9; d++) {
        const value = 10 * info.k + d;
        const isCandidate = candidates.includes(value);
        rects.push({
          x: d,
          y: rowY(2),
          w: 0.94,
          h: 0.94,
          tone: value === info.root ? 'data' : isCandidate ? 'arithmetic' : 'algebra',
          faint: value !== info.root,
          dashed: square && d === 5,
          label: `${value}`
        });
      }
    }

    const step1 = `${show(N, 0)} ends in ${info.unit}, so the root ends in ${digits.join(' or ')}`;
    const step2 = `${info.k}${power} = ${kPow(info.k)} ≤ ${info.lead} < ${kPow(info.k + 1)} = ${info.k + 1}${power}, so the tens digit is ${info.k}`;
    const step3 =
      square && candidates.length === 2
        ? `${10 * info.k + 5}² = ${show(info.mid, 0)} is ${N >= info.mid ? 'not more than' : 'more than'} ${show(N, 0)}, so the root is ${info.root}`
        : `only ${info.root} is left`;
    const insight =
      step === 1
        ? square
          ? `A square's last digit leaves at most two choices for the root's last digit: ${digits.join(' or ')} here.`
          : `Every digit has a cube with a different last digit, so ${info.unit} points to exactly one: ${info.digit}.`
        : step === 2
          ? `The digits before the last ${dropped} fix the tens digit: ${info.lead} sits between ${kPow(info.k)} and ${kPow(info.k + 1)}.`
          : square && candidates.length === 2
            ? `Between ${candidates[0]} and ${candidates[1]}, the square of ${10 * info.k + 5} decides: ${show(N, 0)} is ${N >= info.mid ? 'above' : 'below'} it, so the root is ${info.root}.`
            : `The last digit and the tens digit together give the root at once: ${info.root}.`;

    return {
      numbers: { N, root: info.root, candidates, k: info.k, lead: info.lead, unit: info.unit },
      readouts: [
        { label: 'Number', value: step >= 3 ? `${show(N, 0)} = ${r}${power}` : show(N, 0) },
        { label: 'Step 1: last digit', value: step1 },
        { label: 'Step 2: bracket', value: step >= 2 ? step2 : 'move to step 2' },
        { label: 'Step 3: choose', value: step >= 3 ? step3 : 'move to step 3' }
      ],
      plot: {
        kind: 'rects',
        width: 10,
        height: rowY(2) + 1.1,
        rects,
        notes,
        summary: `Finding the ${square ? 'square' : 'cube'} root of ${show(N, 0)}. Step 1: ${step1}.${step >= 2 ? ` Step 2: ${step2}.` : ''}${step >= 3 ? ` Step 3: ${step3}.` : ''}`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'ends-in-six',
      prompt: 'Square roots: pick a root so that the number ends in 6 and the root is the larger candidate (it ends in 6, not 4).',
      check: (values) => values.kind === 'square' && values.r % 10 === 6,
      solution: { kind: 'square', r: 56, step: 3 }
    },
    {
      id: 'one-candidate',
      prompt: 'Find a perfect square whose last digit leaves only one possible last digit for the root.',
      check: (values, n) => values.kind === 'square' && n.candidates.length === 1,
      solution: { kind: 'square', r: 35, step: 3 }
    },
    {
      id: 'cube-swap',
      prompt: 'Switch to cube roots and find a root ending in 2. What does its cube end in?',
      check: (values) => values.kind === 'cube' && values.r % 10 === 2,
      solution: { kind: 'cube', r: 72, step: 3 }
    }
  ]
};

/* ------------------------------ base method ------------------------------ */

const gapText = (d) => (d === 0 ? 'exactly 100' : `${show(Math.abs(d))} ${d < 0 ? 'below' : 'above'}`);

export const baseMethodArea = {
  id: 'base-method',
  topicId: 'speed-maths',
  alsoTopicIds: ['squares-cubes-roots', 'simplification'],
  title: 'The base method as an area',
  summary: 'Multiply two numbers near 100 by cutting strips off a 100 × 100 square, and see why the corner is added back.',
  controls: [
    { id: 'x', label: 'First number', type: 'range', min: 80, max: 120, step: 1, default: 92 },
    { id: 'y', label: 'Second number', type: 'range', min: 80, max: 120, step: 1, default: 94 }
  ],
  compute({ x, y }) {
    const { dx, dy, left, right, product } = baseParts(x, y, 100);
    const W = Math.max(100, x);
    const H = Math.max(100, y);
    const rects = [
      { x: 0, y: 0, w: 100, h: 100, tone: 'advanced', faint: true, dashed: true },
      { x: 0, y: 0, w: x, h: y, tone: 'arithmetic', label: `${x} × ${y}` }
    ];
    if (dx) rects.push({ x: Math.min(x, 100), y: 0, w: Math.abs(dx), h: 100, tone: 'combinatorics', faint: true, dashed: dx < 0 });
    if (dy) rects.push({ x: 0, y: Math.min(y, 100), w: 100, h: Math.abs(dy), tone: 'combinatorics', faint: true, dashed: dy < 0 });
    if (dx && dy) rects.push({ x: Math.min(x, 100), y: Math.min(y, 100), w: Math.abs(dx), h: Math.abs(dy), tone: 'data' });
    const notes = [
      { x: 0, y: H + 8, text: `100 × ${left} ${right < 0 ? '−' : '+'} ${show(Math.abs(right))} = ${show(product)}`, anchor: 'start' },
      { x: W, y: H + 8, text: dx && dy ? `corner ${show(Math.abs(dx))} × ${show(Math.abs(dy))}` : 'no corner', anchor: 'end' }
    ];

    let answer;
    if (right >= 100) answer = `${left} | ${right} → carry ${Math.floor(right / 100)}: ${show(product)}`;
    else if (right < 0) answer = `${left} | −${show(-right)} → borrow 100: ${show(product)}`;
    else answer = `${left} | ${String(right).padStart(2, '0')} = ${show(product)}`;

    let insight;
    if (dx === 0 || dy === 0) insight = `One number is exactly 100, so there is no corner: the product is just ${dx === 0 ? y : x} hundreds.`;
    else if (dx < 0 && dy < 0)
      insight = `Cutting strips ${-dx} and ${-dy} wide off the 100 × 100 square cuts the ${-dx} × ${-dy} corner twice, so it is added back: ${right}${right >= 100 ? ', and since it has three digits, 1 is carried' : ''}.`;
    else if (dx > 0 && dy > 0) insight = `Two strips are added to the square and the ${dx} × ${dy} corner fills the gap between them, so it is added too: ${left} hundreds + ${right}.`;
    else insight = `One strip is added and the other cut away, so the corner counts negative: ${left} hundreds − ${-right} = ${show(product)}.`;

    return {
      numbers: { dx, dy, left, right, product },
      readouts: [
        { label: 'Gaps from 100', value: `${x} is ${gapText(dx)}, ${y} is ${gapText(dy)}` },
        { label: 'Left part', value: `${x} ${dy < 0 ? '−' : '+'} ${show(Math.abs(dy))} = ${left}` },
        { label: 'Right part', value: `(${show(dx)}) × (${show(dy)}) = ${show(right)}` },
        { label: 'Answer', value: answer }
      ],
      plot: {
        kind: 'rects',
        width: W,
        height: H + 12,
        rects,
        notes,
        summary: `A ${x} by ${y} rectangle drawn on a 100 by 100 square. The strips are ${gapText(dx)} and ${gapText(dy)}; ${x} × ${y} = 100 × ${left} ${right < 0 ? '−' : '+'} ${show(Math.abs(right))} = ${show(product)}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'carry',
      prompt: 'Pick two numbers below 100 whose gaps multiply to 100 or more, so the right part carries (like 88 × 87).',
      check: (values, n) => n.dx < 0 && n.dy < 0 && n.right >= 100,
      solution: { x: 88, y: 89 }
    },
    {
      id: 'mixed',
      prompt: 'Pick one number above 100 and one below: the right part turns negative.',
      check: (values, n) => n.right < 0,
      solution: { x: 104, y: 97 }
    },
    {
      id: 'square-above',
      prompt: 'Square a number above 100 with the method (make both numbers equal).',
      check: (values) => values.x === values.y && values.x > 100,
      solution: { x: 106, y: 106 }
    }
  ]
};

export const numberMethodSims = [remainderWheel, factorialFives, rootBracket, baseMethodArea];
