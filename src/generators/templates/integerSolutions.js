/**
 * Integer solutions of linear equations: when ax + by = c has whole-number
 * solutions, finding one, the step between them, counting positive and
 * non-negative ones, coin and stamp problems, three-variable sums and the
 * largest amount coins cannot pay.
 *
 * Answers come from the general solution (utils/diophantine.js); every
 * `verify` re-counts or re-searches by brute force, trying every x.
 */

import { fmt, nCr } from '../core.js';
import { bruteSolutions, countSolutions, gcd, solutions, starsAndBars } from '../../utils/diophantine.js';

const NAMES = ['Ananya', 'Ravi', 'Meena', 'Arjun', 'Priya', 'Kiran', 'Suresh', 'Lata', 'Imran', 'Deepa', 'Farhan', 'Kavya'];
const eq = (a, b, c) => `${a}x + ${b}y = ${c}`;
const pair = ([x, y]) => `x = ${x}, y = ${y}`;
const parsePair = (text) => {
  const m = /^x = (-?\d+), y = (-?\d+)$/.exec(text);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
/** Does ax + by = c have an integer solution? Searched directly: x only matters modulo b. */
const solvableBySearch = (a, b, c) => {
  for (let x = 0; x < b; x++) if ((((c - a * x) % b) + b) % b === 0) return true;
  return false;
};
const countByBrute = (a, b, c, least) => bruteSolutions(a, b, c, least).length;
/** Brute-force count of a·x + b·y + c·z = n with every variable ≥ least. */
const bruteThree = (a, b, c, n, least) => {
  let count = 0;
  for (let x = least; a * x <= n; x++) for (let y = least; a * x + b * y <= n; y++) {
    const rest = n - a * x - b * y;
    if (rest % c === 0 && rest / c >= least) count += 1;
  }
  return count;
};

export const integerSolutionTemplates = [
  /* ================================ solvable ================================ */
  {
    id: 'is-gen-gcd-test',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-solvable',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['is-solvable-f'],
    estimatedSeconds: 40,
    params(rng) {
      // Coefficients sharing a factor, so the test "c is a multiple of gcd(a, b)" has teeth.
      const g = rng.pick([2, 3, 4, 5, 6, 7, 8, 9]);
      const p = rng.int(1, 9);
      let q = rng.int(2, 11);
      if (p === q) q += 1;
      return { a: g * p, b: g * q };
    },
    answer: ({ a, b }) => gcd(a, b),
    verify: ({ a, b }, value) => {
      // The reachable right-hand sides, searched directly: the smallest positive one is the step of all of them.
      let least = 0;
      for (let c = 1; c <= a && !least; c++) if (solvableBySearch(a, b, c)) least = c;
      if (least !== value) return false;
      for (let c = 1; c <= 3 * a; c++) if (solvableBySearch(a, b, c) !== (c % least === 0)) return false;
      return true;
    },
    render({ a, b }) {
      const g = gcd(a, b);
      return {
        question: `${a}x + ${b}y = c has a solution in integers x and y exactly when c is a multiple of a certain number N. What is N?`,
        explanation: `Every value of ${a}x + ${b}y is a multiple of gcd(${a}, ${b}) = ${g}, and every multiple of ${g} can be reached (Bézout). So the equation is solvable exactly when ${g} divides c: N = ${g}.`,
        solutionSteps: [`${a} = ${g} × ${a / g} and ${b} = ${g} × ${b / g}.`, `gcd(${a}, ${b}) = ${g}.`, `Solvable exactly when ${g} divides c, so N = ${g}.`],
        method: 'ax + by = c has integer solutions exactly when gcd(a, b) divides c.',
        hints: [`Find the highest common factor of ${a} and ${b}.`, `${a}x + ${b}y can only ever be a multiple of that common factor.`],
        commonMistakes: [`Answering a common factor smaller than the gcd, or the lcm ${(a * b) / g}.`]
      };
    }
  },

  {
    id: 'is-gen-which-c',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-solvable',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['is-solvable-f'],
    estimatedSeconds: 45,
    params(rng) {
      const g = rng.pick([3, 4, 6, 7, 8, 9]);
      let p = rng.int(2, 9);
      let q = rng.int(2, 9);
      if (gcd(p, q) !== 1 || p === q) return null;
      const good = g * rng.int(5, 20);
      const bad = new Set();
      for (let i = 0; i < 20 && bad.size < 4; i++) {
        const c = good + rng.int(-g + 1, 2 * g);
        if (c > 0 && c % g !== 0) bad.add(c);
      }
      if (bad.size < 3) return null;
      return { a: g * p, b: g * q, c: good, bad: [...bad] };
    },
    answer: ({ c }) => c,
    formatValue: (value) => fmt(value),
    distractors: ({ bad }) => bad.map((v) => ({ value: v, why: 'not a multiple of the gcd' })),
    verify: ({ a, b, bad }, value) => solvableBySearch(a, b, value) && bad.every((v) => !solvableBySearch(a, b, v)),
    render({ a, b, c }) {
      const g = gcd(a, b);
      return {
        question: `For which value of c does ${a}x + ${b}y = c have a solution in integers?`,
        explanation: `${a}x + ${b}y is always a multiple of gcd(${a}, ${b}) = ${g}. Of the choices only ${fmt(c)} is a multiple of ${g}, so only ${eq(a, b, c)} has integer solutions.`,
        solutionSteps: [`gcd(${a}, ${b}) = ${g}.`, `The right-hand side must be a multiple of ${g}.`, `${fmt(c)} = ${g} × ${c / g}.`],
        method: 'The gcd of the coefficients must divide c.',
        hints: [`What do ${a} and ${b} have in common?`, `Only a multiple of gcd(${a}, ${b}) can be reached.`],
        commonMistakes: ['Checking divisibility by one coefficient instead of by their gcd.']
      };
    }
  },

  /* ================================ particular ================================ */
  {
    id: 'is-gen-smallest-x',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-particular',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['is-particular-f', 'is-sc-residue'],
    estimatedSeconds: 50,
    params(rng) {
      const a = rng.int(3, 13);
      const b = rng.int(3, 9);
      if (gcd(a, b) !== 1) return null;
      const x = rng.int(2, b);
      const y = rng.int(3, 15);
      return { a, b, c: a * x + b * y };
    },
    answer: ({ a, b, c }) => solutions(a, b, c, 1)[0][0],
    verify: ({ a, b, c }, value) => {
      for (let x = 1; x < value; x++) if ((c - a * x) > 0 && (c - a * x) % b === 0) return false;
      return (c - a * value) > 0 && (c - a * value) % b === 0;
    },
    render({ a, b, c }) {
      const [x, y] = solutions(a, b, c, 1)[0];
      const tried = Array.from({ length: x }, (_, i) => i + 1).map((t) => `${c} − ${a * t} = ${c - a * t}`);
      return {
        question: `x and y are positive integers with ${eq(a, b, c)}. What is the smallest possible value of x?`,
        explanation: `${c} − ${a}x must be a positive multiple of ${b}. Trying x = 1, 2, …: ${tried.join('; ')}. The first that ${b} divides is at x = ${x}, giving y = ${y}.`,
        solutionSteps: [`Need ${c} − ${a}x divisible by ${b}.`, ...tried.slice(-2).map((t) => `${t}.`), `x = ${x}, y = ${y}.`],
        method: `Try x = 1, 2, … (at most ${b} tries) until ${c} − ${a}x is a multiple of ${b}.`,
        hints: [`For y to be whole, ${c} − ${a}x must be divisible by ${b}.`, `Only x from 1 to ${b} need be tried; after that the remainders repeat.`],
        commonMistakes: ['Giving the smallest y instead of the smallest x.', 'Allowing y = 0 when the question asks for positive integers.']
      };
    }
  },

  {
    id: 'is-gen-which-pair',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-particular',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['is-particular-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(3, 15);
      const b = rng.int(3, 12);
      if (gcd(a, b) !== 1 || a === b) return null;
      const x = rng.int(1, 12);
      const y = rng.int(1, 20);
      return { a, b, c: a * x + b * y, x, y };
    },
    answer: ({ x, y }) => pair([x, y]),
    distractors: ({ a, b, c, x, y }) =>
      [
        { value: [y, x], why: 'swapped x and y' },
        { value: [x + 1, y - 1], why: 'moved both by 1' },
        { value: [x + a, y - b], why: 'stepped by the wrong coefficients' },
        { value: [x + 1, y + 1], why: 'added 1 to both' },
        { value: [x - 1, y + 1], why: 'moved both by 1 the other way' }
      ]
        .filter(({ value: [p, q] }) => p > 0 && q > 0 && a * p + b * q !== c)
        .map(({ value, why }) => ({ value: pair(value), why })),
    verify: ({ a, b, c }, value) => {
      const p = parsePair(value);
      return !!p && p[0] > 0 && p[1] > 0 && bruteSolutions(a, b, c, 1).some(([u, v]) => u === p[0] && v === p[1]);
    },
    render({ a, b, c, x, y }) {
      return {
        question: `Which pair of positive integers satisfies ${eq(a, b, c)}?`,
        explanation: `Substitute: ${a} × ${x} + ${b} × ${y} = ${a * x} + ${b * y} = ${c}. Each of the other pairs gives a different total.`,
        solutionSteps: [`${a} × ${x} = ${a * x}.`, `${b} × ${y} = ${b * y}.`, `${a * x} + ${b * y} = ${c} ✓.`],
        method: 'Substitute each pair; or use remainders to rule pairs out quickly.',
        hints: [`Work out ${a}x + ${b}y for each pair.`, `Check the unit digit first to rule pairs out fast.`],
        commonMistakes: ['Swapping x and y when substituting.']
      };
    }
  },

  /* ================================== step ================================== */
  {
    id: 'is-gen-next-solution',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-step',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['is-step-f'],
    estimatedSeconds: 40,
    params(rng) {
      const g = rng.pick([1, 1, 1, 2, 3]);
      const p = rng.int(2, 9);
      const q = rng.int(3, 11);
      if (gcd(p, q) !== 1 || p === q) return null;
      const a = g * p;
      const b = g * q;
      const x = rng.int(1, 8);
      const y = p + rng.int(1, 12);
      return { a, b, c: a * x + b * y, x, y };
    },
    answer: ({ a, b, x, y }) => {
      const g = gcd(a, b);
      return pair([x + b / g, y - a / g]);
    },
    distractors: ({ a, b, c, x, y }) => {
      const g = gcd(a, b);
      return [
        { value: [x + a / g, y - b / g], why: 'stepped x by a and y by b' },
        { value: [x + b / g, y + a / g], why: 'moved y the same way as x' },
        { value: [x + b, y - a], why: 'forgot to divide by the gcd' },
        { value: [x + 1, y - 1], why: 'stepped both by 1' },
        { value: [x + b / g, y - b / g], why: 'stepped both by b' }
      ]
        .filter(({ value: [p, q] }) => q > 0 && a * p + b * q !== c)
        .map(({ value, why }) => ({ value: pair(value), why }));
    },
    verify: ({ a, b, c, x }, value) => {
      const p = parsePair(value);
      if (!p) return false;
      const next = bruteSolutions(a, b, c, 1).find(([u]) => u > x);
      return !!next && next[0] === p[0] && next[1] === p[1];
    },
    render({ a, b, c, x, y }) {
      const g = gcd(a, b);
      return {
        question: `x = ${x}, y = ${y} is a solution of ${eq(a, b, c)}. Which is the next solution in positive integers with a larger x?`,
        explanation: `Solutions are ${b}/${g} = ${b / g} apart in x and ${a}/${g} = ${a / g} apart in y, in opposite directions (gcd(${a}, ${b}) = ${g}). So the next one is x = ${x} + ${b / g} = ${x + b / g}, y = ${y} − ${a / g} = ${y - a / g}. Check: ${a * (x + b / g)} + ${b * (y - a / g)} = ${c}.`,
        solutionSteps: [`gcd(${a}, ${b}) = ${g}.`, `x goes up by ${b}/${g} = ${b / g}; y goes down by ${a}/${g} = ${a / g}.`, `Next: x = ${x + b / g}, y = ${y - a / g}.`],
        method: 'x moves by b/g and y by a/g, in opposite directions.',
        hints: ['Raising x adds to the left side; y must fall to compensate.', `x steps by the OTHER coefficient: ${b} ÷ gcd.`],
        commonMistakes: ['Stepping x by its own coefficient a.', 'Forgetting to divide by the gcd when a and b share a factor.']
      };
    }
  },

  {
    id: 'is-gen-step-size',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-step',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['is-step-f'],
    estimatedSeconds: 45,
    params(rng) {
      const g = rng.pick([2, 3, 4, 5, 6]);
      const p = rng.int(2, 9);
      const q = rng.int(2, 11);
      if (gcd(p, q) !== 1 || p === q) return null;
      const x = rng.int(1, 6);
      const y = rng.int(1, 6) + 2 * p;
      return { a: g * p, b: g * q, c: g * (p * x + q * y), ask: rng.pick(['x', 'y']) };
    },
    answer: ({ a, b, ask }) => (ask === 'x' ? b / gcd(a, b) : a / gcd(a, b)),
    verify: ({ a, b, c, ask }, value) => {
      const list = bruteSolutions(a, b, c, 1);
      if (list.length < 2) return false;
      const gaps = list.slice(1).map((s, i) => Math.abs(s[ask === 'x' ? 0 : 1] - list[i][ask === 'x' ? 0 : 1]));
      return gaps.every((d) => d === value);
    },
    render({ a, b, c, ask }) {
      const g = gcd(a, b);
      const value = ask === 'x' ? b / g : a / g;
      const other = ask === 'x' ? b : a;
      return {
        question: `List the solutions of ${eq(a, b, c)} in positive integers in order of x. By how much does ${ask} change from one solution to the next?`,
        explanation: `gcd(${a}, ${b}) = ${g}. Dividing through, ${a / g}x + ${b / g}y = ${c / g}. Now ${ask} changes by the other coefficient, ${value}: that is ${other} ÷ ${g}, not ${other}.`,
        solutionSteps: [`gcd(${a}, ${b}) = ${g}.`, `Reduced equation: ${eq(a / g, b / g, c / g)}.`, `${ask} changes by ${value}.`],
        method: 'Divide by the gcd first; each variable steps by the other reduced coefficient.',
        hints: ['Do the coefficients share a factor?', `After dividing by it, ${ask} steps by the other coefficient.`],
        commonMistakes: [`Answering ${other} without dividing by the gcd.`, 'Using the variable’s own coefficient.']
      };
    }
  },

  {
    id: 'is-gen-x-spread',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-step',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['is-step-f', 'is-sc-ends'],
    estimatedSeconds: 70,
    params(rng) {
      const a = rng.int(5, 17);
      const b = rng.int(4, 13);
      if (gcd(a, b) !== 1 || a === b) return null;
      const c = rng.int(200, 700);
      const n = countSolutions(a, b, c, 1);
      if (n < 2) return null;
      return { a, b, c };
    },
    answer: ({ a, b, c }) => {
      const list = solutions(a, b, c, 1);
      return list[list.length - 1][0] - list[0][0];
    },
    verify: ({ a, b, c }, value) => {
      const xs = bruteSolutions(a, b, c, 1).map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs) === value;
    },
    render({ a, b, c }) {
      const list = solutions(a, b, c, 1);
      const [first, last] = [list[0], list[list.length - 1]];
      return {
        question: `x and y are positive integers with ${eq(a, b, c)}. What is the difference between the largest and the smallest possible value of x?`,
        explanation: `The smallest x is ${first[0]} (y = ${first[1]}). Each step adds ${b} to x and takes ${a} from y, so x keeps rising until y can fall no further: x = ${last[0]}, y = ${last[1]}. The difference is ${last[0]} − ${first[0]} = ${last[0] - first[0]}, which is ${list.length - 1} step${list.length > 2 ? 's' : ''} of ${b}.`,
        solutionSteps: [`Smallest x: ${first[0]} (y = ${first[1]}).`, `Step: x + ${b}, y − ${a}.`, `Largest x: ${last[0]} (y = ${last[1]}).`, `Difference: ${last[0] - first[0]}.`],
        method: 'Find the first solution, then step until y would drop below 1.',
        hints: [`Find the smallest x that makes ${c} − ${a}x a multiple of ${b}.`, `Then x rises in steps of ${b} while y stays positive.`],
        commonMistakes: ['Stopping one step early, or letting y reach 0.']
      };
    }
  },

  /* ================================= count ================================== */
  {
    id: 'is-gen-count-positive',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-count',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['is-count-f', 'is-sc-ends'],
    estimatedSeconds: 70,
    params(rng) {
      const g = rng.pick([1, 1, 1, 2]);
      const p = rng.int(2, 9);
      const q = rng.int(3, 11);
      if (gcd(p, q) !== 1 || p === q) return null;
      const c = g * rng.int(40, 160);
      if (countSolutions(g * p, g * q, c, 1) < 1) return null;
      return { a: g * p, b: g * q, c };
    },
    answer: ({ a, b, c }) => countSolutions(a, b, c, 1),
    verify: ({ a, b, c }, value) => countByBrute(a, b, c, 1) === value,
    render({ a, b, c }) {
      const list = solutions(a, b, c, 1);
      const g = gcd(a, b);
      const [first, last] = [list[0], list[list.length - 1]];
      return {
        question: `How many solutions in positive integers does ${eq(a, b, c)} have?`,
        explanation: `The smallest x is ${first[0]} (y = ${first[1]}). Solutions step by ${b / g} in x and ${a / g} in y, so the largest x is ${last[0]} (y = ${last[1]}). Count: (${last[0]} − ${first[0]}) ÷ ${b / g} + 1 = ${list.length}.`,
        solutionSteps: [`First solution: (${first[0]}, ${first[1]}).`, `Step: x + ${b / g}, y − ${a / g}.`, `Last solution: (${last[0]}, ${last[1]}).`, `Count = ${list.length}.`],
        method: 'Find the first solution, the step, and count the steps that keep y positive.',
        hints: [`Start with the smallest x for which ${c} − ${a}x is a multiple of ${b}.`, 'Count = (last x − first x) ÷ step + 1.'],
        commonMistakes: ['Forgetting the + 1 when counting from the first to the last solution.', 'Counting a solution with y = 0.']
      };
    }
  },

  {
    id: 'is-gen-count-nonneg',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-count',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['is-count-f', 'is-sc-nonneg'],
    estimatedSeconds: 70,
    params(rng) {
      const a = rng.int(2, 9);
      const b = rng.int(3, 12);
      if (gcd(a, b) !== 1 || a === b) return null;
      // Often a multiple of both, so both ends (x = 0 and y = 0) are solutions.
      const c = rng.chance(0.5) ? a * b * rng.int(2, 6) : rng.int(60, 200);
      const n = countSolutions(a, b, c, 0);
      if (n < 2) return null;
      return { a, b, c };
    },
    answer: ({ a, b, c }) => countSolutions(a, b, c, 0),
    formatValue: (value) => fmt(value),
    distractors: ({ a, b, c }) => {
      const n = countSolutions(a, b, c, 0);
      return [
        { value: countSolutions(a, b, c, 1), why: 'counted positive solutions only' },
        { value: n + 1, why: 'added one too many' },
        { value: n - 1, why: 'missed one end' },
        { value: Math.floor(c / Math.max(a, b)), why: 'divided c by the larger coefficient' },
        { value: Math.floor(c / Math.min(a, b)), why: 'divided c by the smaller coefficient' }
      ];
    },
    verify: ({ a, b, c }, value) => countByBrute(a, b, c, 0) === value,
    render({ a, b, c }) {
      const list = solutions(a, b, c, 0);
      const [first, last] = [list[0], list[list.length - 1]];
      return {
        question: `How many pairs of non-negative integers (x, y) satisfy ${eq(a, b, c)}?`,
        explanation: `Non-negative allows x = 0 or y = 0. The smallest x is ${first[0]} (y = ${first[1]}); x then rises by ${b} and y falls by ${a}, up to x = ${last[0]} (y = ${last[1]}). Count: (${last[0]} − ${first[0]}) ÷ ${b} + 1 = ${list.length}.`,
        solutionSteps: [`First: (${first[0]}, ${first[1]}).`, `Last: (${last[0]}, ${last[1]}).`, `Count = ${list.length}.`],
        method: 'Same steps as for positive solutions, but zero is allowed at both ends.',
        hints: ['Here x = 0 and y = 0 are allowed.', `Find the smallest x ≥ 0 that makes ${c} − ${a}x a multiple of ${b}.`],
        commonMistakes: ['Counting only positive solutions.']
      };
    }
  },

  /* ================================== word ================================== */
  {
    id: 'is-gen-coins',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-word',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['is-word-f', 'is-count-f'],
    estimatedSeconds: 75,
    params(rng) {
      const [p, q] = rng.pick([[2, 5], [2, 5], [5, 10], [2, 10], [5, 20], [10, 20], [3, 5], [2, 7]]);
      const total = rng.int(4, 30) * (p === 3 || q === 7 ? 1 : 5);
      const n = countSolutions(p, q, total, 1);
      if (n < 2) return null;
      return { p, q, total, name: rng.pick(NAMES), stamps: p === 3 || q === 7 };
    },
    answer: ({ p, q, total }) => countSolutions(p, q, total, 1),
    formatValue: (value) => fmt(value),
    distractors: ({ p, q, total }) => {
      const n = countSolutions(p, q, total, 1);
      return [
        { value: countSolutions(p, q, total, 0), why: 'allowed none of one kind' },
        { value: n + 1, why: 'added one too many' },
        { value: n - 1, why: 'missed one end' },
        { value: Math.floor(total / q), why: 'divided the total by the larger value' }
      ];
    },
    verify: ({ p, q, total }, value) => countByBrute(p, q, total, 1) === value,
    render({ p, q, total, name, stamps }) {
      const list = solutions(p, q, total, 1);
      const g = gcd(p, q);
      const things = stamps ? `₹${p} and ₹${q} stamps` : `₹${p} and ₹${q} coins`;
      return {
        question: stamps
          ? `${name} spends exactly ₹${total} on ${things}, buying at least one of each. How many different combinations are possible?`
          : `${name} pays exactly ₹${total} using only ${things}, with at least one coin of each kind. In how many ways can this be done?`,
        explanation: `Let x be the number of ₹${p} and y the number of ₹${q}: ${eq(p, q, total)} with x, y ≥ 1. The solutions run from (${list[0].join(', ')}) to (${list[list.length - 1].join(', ')}), stepping by ${q / g} in x and ${p / g} in y: ${list.length} in all.`,
        solutionSteps: [`${eq(p, q, total)}, x, y ≥ 1.`, `Solutions: ${list.map((s) => `(${s.join(', ')})`).join(', ')}.`, `Count: ${list.length}.`],
        method: '"At least one of each" means positive solutions.',
        hints: [`Write the value equation: ${p}x + ${q}y = ${total}.`, 'Both counts must be at least 1.'],
        commonMistakes: ['Including the ways that use only one kind.']
      };
    }
  },

  {
    id: 'is-gen-two-equations',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-word',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['is-word-f'],
    estimatedSeconds: 70,
    params(rng) {
      const [item1, item2] = rng.pick([
        ['pens', 'notebooks'],
        ['samosas', 'sandwiches'],
        ['mangoes', 'pineapples'],
        ['bus tickets', 'metro tickets'],
        ['erasers', 'geometry boxes']
      ]);
      const p = rng.int(3, 12);
      const q = p + rng.int(2, 15);
      const x = rng.int(2, 15);
      const y = rng.int(2, 15);
      return { item1, item2, p, q, x, y, name: rng.pick(NAMES) };
    },
    answer: ({ x }) => x,
    verify: ({ p, q, x, y }, value) => {
      const total = p * x + q * y;
      const count = x + y;
      const hits = [];
      for (let u = 1; u < count; u++) if (p * u + q * (count - u) === total) hits.push(u);
      return hits.length === 1 && hits[0] === value;
    },
    render({ item1, item2, p, q, x, y, name }) {
      const total = p * x + q * y;
      const count = x + y;
      return {
        question: `${name} buys ${count} items in all, ${item1} at ₹${p} each and ${item2} at ₹${q} each, and pays exactly ₹${fmt(total)}. How many ${item1} did ${name} buy?`,
        explanation: `If all ${count} were ${item1} the bill would be ₹${fmt(p * count)}. Each ${item2.replace(/s$/, '')} in place of one of the ${item1} adds ₹${q - p}. The extra ₹${fmt(total - p * count)} ÷ ${q - p} = ${y} ${item2}, so ${count} − ${y} = ${x} ${item1}.`,
        solutionSteps: [`x + y = ${count}; ${p}x + ${q}y = ${total}.`, `${q}y − ${p}y = ${total} − ${p * count} → ${q - p}y = ${total - p * count}.`, `y = ${y}, x = ${x}.`],
        method: 'Two conditions (count and cost) fix the answer: assume all cheap, then swap.',
        hints: [`Suppose all ${count} items were ${item1}. What would they cost?`, `Each swap to ${item2} adds ₹${q - p}.`],
        commonMistakes: [`Answering the number of ${item2} instead.`]
      };
    }
  },

  /* ============================= three variables ============================= */
  {
    id: 'is-gen-three-sum',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-adv-three',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['is-three-f'],
    estimatedSeconds: 55,
    params(rng) {
      const n = rng.int(6, 25);
      const least = rng.pick([0, 1, 1, 2]);
      if (3 * least > n) return null;
      return { n, least, thing: rng.pick(['laddoos', 'chocolates', 'marbles', 'identical pencils']) };
    },
    answer: ({ n, least }) => starsAndBars(n - 3 * least, 3, false),
    formatValue: (value) => fmt(value),
    distractors: ({ n, least }) => {
      const m = n - 3 * least;
      return [
        { value: nCr(n + 2, 2), why: 'ignored the lower limit' },
        { value: nCr(m + 1, 2), why: 'off by one in the top of nCr' },
        { value: nCr(m + 2, 3), why: 'chose 3 instead of 2' },
        { value: nCr(m + 3, 2), why: 'off by one the other way' },
        { value: nCr(n - 1, 2), why: 'used the positive-solution formula' }
      ];
    },
    verify: ({ n, least }, value) => bruteThree(1, 1, 1, n, least) === value,
    render({ n, least, thing }) {
      const m = n - 3 * least;
      const limit = least === 0 ? 'some children may get none' : least === 1 ? 'each child gets at least one' : `each child gets at least ${least}`;
      return {
        question: `In how many ways can ${n} ${thing} be shared among three children if ${limit}? (Only the number each child gets matters.)`,
        explanation: `${least ? `Give each child ${least} first; ${m} remain to be shared freely. ` : ''}The number of solutions of x + y + z = ${m} in non-negative integers is C(${m} + 2, 2) = C(${m + 2}, 2) = ${nCr(m + 2, 2)}.`,
        solutionSteps: [
          ...(least ? [`Hand out ${least} each: ${n} − ${3 * least} = ${m} left.`] : []),
          `x + y + z = ${m}, all ≥ 0.`,
          `C(${m + 2}, 2) = ${nCr(m + 2, 2)}.`
        ],
        method: 'Remove the lower limits first, then use C(n + 2, 2).',
        hints: ['Write x + y + z for the three shares.', least ? `Give each child ${least} first.` : 'Think of 2 dividers placed among the items.'],
        commonMistakes: ['Forgetting to remove the minimum each child must get.']
      };
    }
  },

  {
    id: 'is-gen-three-weighted',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-adv-three',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['is-three-f'],
    estimatedSeconds: 90,
    params(rng) {
      const a = rng.int(2, 6);
      const n = rng.int(8, 30);
      return { a, n };
    },
    answer: ({ a, n }) => {
      let total = 0;
      for (let x = 0; a * x <= n; x++) total += n - a * x + 1;
      return total;
    },
    verify: ({ a, n }, value) => bruteThree(a, 1, 1, n, 0) === value,
    render({ a, n }) {
      const terms = [];
      for (let x = 0; a * x <= n; x++) terms.push(n - a * x + 1);
      const total = terms.reduce((s, t) => s + t, 0);
      return {
        question: `How many solutions in non-negative integers does ${a}x + y + z = ${n} have?`,
        explanation: `Fix x. Then y + z = ${n} − ${a}x has ${n} − ${a}x + 1 non-negative solutions. x runs from 0 to ${Math.floor(n / a)}, giving ${terms.join(' + ')} = ${total}.`,
        solutionSteps: [`x can be 0 to ${Math.floor(n / a)}.`, `For each x: y + z = ${n} − ${a}x has (${n} − ${a}x + 1) solutions.`, `Sum: ${terms.join(' + ')} = ${total}.`],
        method: 'Fix the variable with the big coefficient, count the rest, and add.',
        hints: ['Try each possible value of x in turn.', 'y + z = m has m + 1 non-negative solutions.'],
        commonMistakes: ['Using C(n + 2, 2) as if every coefficient were 1.']
      };
    }
  },

  /* ================================ extremes ================================ */
  {
    id: 'is-gen-frobenius',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-adv-extreme',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['is-frobenius-f'],
    estimatedSeconds: 60,
    params(rng) {
      const p = rng.int(3, 11);
      const q = rng.int(p + 1, 15);
      if (gcd(p, q) !== 1) return null;
      return { p, q, setting: rng.pick(['a vending machine', 'a parking meter', 'a ticket machine at the bus stand']) };
    },
    answer: ({ p, q }) => p * q - p - q,
    verify: ({ p, q }, value) => {
      const payable = (m) => bruteSolutions(p, q, m, 0).length > 0 || m % p === 0 || m % q === 0;
      if (payable(value)) return false;
      for (let m = value + 1; m <= value + p; m++) if (!payable(m)) return false;
      return true;
    },
    render({ p, q, setting }) {
      const f = p * q - p - q;
      return {
        question: `${setting[0].toUpperCase()}${setting.slice(1)} accepts only ₹${p} and ₹${q} coins and gives no change. What is the largest whole-rupee amount that cannot be paid exactly?`,
        explanation: `${p} and ${q} have no common factor, so every large enough amount can be paid. The largest that cannot is ${p} × ${q} − ${p} − ${q} = ${f}. Check: ₹${f} cannot be made, while ₹${f + 1} to ₹${f + p} all can, and adding ₹${p} coins reaches everything beyond.`,
        solutionSteps: [`gcd(${p}, ${q}) = 1.`, `Largest amount that cannot be paid = ${p} × ${q} − ${p} − ${q}.`, `= ${p * q} − ${p + q} = ${f}.`],
        method: 'For coprime coins a and b, the largest amount that cannot be paid is ab − a − b.',
        hints: ['Every amount from some point on can be paid; find where that starts.', 'For coprime a and b the formula is ab − a − b.'],
        commonMistakes: ['Giving ab, or ab − 1.']
      };
    }
  },

  {
    id: 'is-gen-most-items',
    version: 1,
    topicId: 'integer-solutions',
    conceptId: 'is-adv-extreme',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['is-extreme-f'],
    estimatedSeconds: 80,
    params(rng) {
      const p = rng.int(2, 9);
      const q = rng.int(p + 1, 15);
      if (gcd(p, q) !== 1) return null;
      const total = rng.int(40, 180);
      if (countSolutions(p, q, total, 1) < 2) return null;
      return { p, q, total, ask: rng.pick(['most', 'fewest']), name: rng.pick(NAMES), item: rng.pick([['₹', 'stamps'], ['₹', 'coins']]) };
    },
    answer: ({ p, q, total, ask }) => {
      const list = solutions(p, q, total, 1);
      const [x, y] = ask === 'most' ? list[list.length - 1] : list[0];
      return x + y;
    },
    formatValue: (value) => fmt(value),
    distractors: ({ p, q, total, ask }) => {
      const list = solutions(p, q, total, 1);
      const sums = list.map(([x, y]) => x + y);
      const other = ask === 'most' ? Math.min(...sums) : Math.max(...sums);
      const middle = sums[Math.floor(sums.length / 2)];
      return [
        { value: other, why: ask === 'most' ? 'gave the fewest instead' : 'gave the most instead' },
        { value: middle, why: 'took a middle solution' },
        { value: Math.floor(total / p), why: 'divided the total by the cheaper value, ignoring "at least one of each"' },
        { value: Math.floor(total / q), why: 'divided the total by the dearer value' },
        { value: list.length, why: 'counted the solutions instead' }
      ];
    },
    verify: ({ p, q, total, ask }, value) => {
      const sums = bruteSolutions(p, q, total, 1).map(([x, y]) => x + y);
      return (ask === 'most' ? Math.max(...sums) : Math.min(...sums)) === value;
    },
    render({ p, q, total, ask, name, item }) {
      const list = solutions(p, q, total, 1);
      const pick = ask === 'most' ? list[list.length - 1] : list[0];
      const things = item[1];
      return {
        question: `${name} pays exactly ₹${total} with ₹${p} and ₹${q} ${things}, using at least one of each. What is the ${ask === 'most' ? 'largest' : 'smallest'} number of ${things} ${name} can use?`,
        explanation: `${p}x + ${q}y = ${total} with x, y ≥ 1, where x counts the ₹${p} ${things}. The total x + y is ${ask === 'most' ? 'largest when as many as possible are the cheaper ₹' + p : 'smallest when as many as possible are the dearer ₹' + q}. The solutions are ${list.map((s) => `(${s.join(', ')})`).join(', ')}; the ${ask === 'most' ? 'largest' : 'smallest'} x + y is ${pick[0]} + ${pick[1]} = ${pick[0] + pick[1]}.`,
        solutionSteps: [`${eq(p, q, total)}, x, y ≥ 1.`, `${ask === 'most' ? 'Largest' : 'Smallest'} x: (${pick.join(', ')}).`, `x + y = ${pick[0] + pick[1]}.`],
        method: `Each step trades ${p} of the ₹${q} for ${q} of the ₹${p}, changing the count by ${q - p}; so the extreme is at an end.`,
        hints: ['List the solutions from smallest to largest x.', `To ${ask === 'most' ? 'maximise' : 'minimise'} the count, use as many ${ask === 'most' ? 'cheaper' : 'dearer'} ones as possible.`],
        commonMistakes: ['Forgetting that at least one of each must be used.']
      };
    }
  }
];

