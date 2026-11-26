/**
 * Advanced identities: x + 1/x powers, three-variable identities and extreme values (algebraic-identities, Advanced unit).
 *
 * Answers come from the identities (the ladder in utils/reciprocalPowers.js,
 * a³ + b³ + c³ − 3abc, completing the square); every one is checked a second
 * way: by finding x numerically and raising it to the power, by working the
 * cubes out from a, b, c themselves, or by a brute-force search.
 */

import { fmt, nearlyEqual, reduceFraction } from '../core.js';
import { reciprocalLadder, surdText } from '../../utils/reciprocalPowers.js';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const pw = (base, n) => `${base}${String(n).split('').map((d) => SUP[d]).join('')}`;
/** "xⁿ + 1/xⁿ" (or with a minus sign). */
const powerSum = (n, op = '+') => (n === 1 ? `x ${op} 1/x` : `${pw('x', n)} ${op} 1/${pw('x', n)}`);

/** The real x > 1 with x + 1/x = k (k > 2), or x > 0 with x − 1/x = m: found by the quadratic formula. */
const rootPlus = (k) => (k + Math.sqrt(k * k - 4)) / 2;
const rootMinus = (m) => (m + Math.sqrt(m * m + 4)) / 2;

/** " + 4b", " − 2a": a signed linear term (coefficient never 0). */
const linear = (coef, name) => ` ${coef < 0 ? '−' : '+'} ${Math.abs(coef) === 1 ? '' : Math.abs(coef)}${name}`;
/** "a = −2" style. */
const signed = (value) => (value < 0 ? `−${Math.abs(value)}` : `${value}`);

/** The least value of f over a log-spaced scan of x > 0 (a brute-force check, no calculus). */
function scanMinimum(f) {
  let best = Infinity;
  for (let i = -3000; i <= 3000; i++) best = Math.min(best, f(10 ** (i / 1000)));
  return best;
}

export const advReciprocalTemplates = [
  /* ============================== x + 1/x ============================== */
  {
    id: 'ai-adv-recip-square',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-adv-reciprocal',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['ai-adv-minus-sc', 'ai-adv-disguise-sc'],
    estimatedSeconds: 45,
    params(rng) {
      const mode = rng.pick(['plus', 'minus', 'back-plus', 'back-minus']);
      if (mode === 'plus') return { mode, k: rng.int(3, 15) };
      if (mode === 'minus') return { mode, k: rng.int(1, 15) };
      if (mode === 'back-plus') return { mode, k: rng.int(3, 12) };
      return { mode, k: rng.int(1, 12) };
    },
    answer({ mode, k }) {
      if (mode === 'plus') return k * k - 2;
      if (mode === 'minus') return k * k + 2;
      return k;
    },
    // Find x itself and work the expression out from it.
    verify({ mode, k }, value) {
      if (mode === 'plus') {
        const x = rootPlus(k);
        return nearlyEqual(x * x + 1 / (x * x), value, 1e-9);
      }
      if (mode === 'minus') {
        const x = rootMinus(k);
        return nearlyEqual(x * x + 1 / (x * x), value, 1e-9);
      }
      // x² + 1/x² = N: u = x² solves u² − Nu + 1 = 0; take x > 1.
      const N = mode === 'back-plus' ? k * k - 2 : k * k + 2;
      const x = Math.sqrt((N + Math.sqrt(N * N - 4)) / 2);
      return nearlyEqual(mode === 'back-plus' ? x + 1 / x : x - 1 / x, value, 1e-9);
    },
    render({ mode, k }) {
      if (mode === 'plus' || mode === 'minus') {
        const op = mode === 'plus' ? '+' : '−';
        const fix = mode === 'plus' ? '−' : '+';
        const value = mode === 'plus' ? k * k - 2 : k * k + 2;
        return {
          question: `If x ${op} 1/x = ${k}, what is x² + 1/x²?`,
          explanation: `Square both sides: (x ${op} 1/x)² = x² + 1/x² ${op} 2, because the middle term is 2 × x × 1/x = 2. So ${k * k} = x² + 1/x² ${op} 2, and x² + 1/x² = ${k * k} ${fix} 2 = ${value}.`,
          solutionSteps: [`(x ${op} 1/x)² = x² ${op} 2 + 1/x².`, `${k}² = x² + 1/x² ${op} 2.`, `x² + 1/x² = ${k * k} ${fix} 2 = ${value}.`],
          method: mode === 'plus' ? 'x² + 1/x² = k² − 2.' : 'x² + 1/x² = m² + 2.',
          hints: [`Square x ${op} 1/x; do not try to find x.`, `The middle term is ${op === '+' ? '+' : '−'}2 × x × 1/x = ${op === '+' ? '' : '−'}2.`, `So x² + 1/x² = ${k}² ${fix} 2.`],
          commonMistakes: [
            `Forgetting the middle term and answering ${k * k}.`,
            mode === 'plus' ? `Adding 2 instead of subtracting it (${k * k + 2}).` : `Using the x + 1/x rule k² − 2 (${k * k - 2}).`
          ]
        };
      }
      const plus = mode === 'back-plus';
      const N = plus ? k * k - 2 : k * k + 2;
      const op = plus ? '+' : '−';
      const fix = plus ? '+' : '−';
      const sq = k * k;
      return {
        question: `If ${plus ? 'x > 0' : 'x > 1'} and x² + 1/x² = ${N}, what is x ${op} 1/x?`,
        explanation: `(x ${op} 1/x)² = x² + 1/x² ${op} 2 = ${N} ${fix} 2 = ${sq}. ${plus ? 'x > 0 makes x + 1/x positive' : 'x > 1 makes x bigger than 1/x, so x − 1/x is positive'}, so x ${op} 1/x = √${sq} = ${k}.`,
        solutionSteps: [`(x ${op} 1/x)² = x² + 1/x² ${op} 2.`, `= ${N} ${fix} 2 = ${sq}.`, `x ${op} 1/x = ${k} (the positive root).`],
        method: plus ? 'Go back down the ladder: x + 1/x = √(N + 2).' : 'Go back down the ladder: x − 1/x = √(N − 2).',
        hints: [`Square x ${op} 1/x and compare with x² + 1/x².`, `(x ${op} 1/x)² = x² + 1/x² ${op} 2.`, `So (x ${op} 1/x)² = ${N} ${fix} 2; take the positive square root.`],
        commonMistakes: [
          plus ? `Subtracting 2 instead of adding it: √${N - 2} is not a whole number here.` : `Adding 2 instead of subtracting it: √${N + 2} is not a whole number here.`,
          'Forgetting to take the square root at the end.'
        ]
      };
    }
  },

  {
    id: 'ai-adv-recip-cube',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-adv-reciprocal',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ai-adv-ladder-f', 'ai-adv-minus-sc'],
    estimatedSeconds: 55,
    formatValue: (value) => fmt(value),
    params(rng) {
      const plus = rng.chance(0.55);
      return { plus, k: plus ? rng.int(3, 12) : rng.int(2, 10) };
    },
    answer: ({ plus, k }) => (plus ? k ** 3 - 3 * k : k ** 3 + 3 * k),
    distractors: ({ plus, k }) =>
      plus
        ? [
            { value: k ** 3, why: 'dropped the 3k' },
            { value: k ** 3 - 3, why: 'subtracted 3, not 3k' },
            { value: k ** 3 + 3 * k, why: 'added 3k instead of subtracting it' },
            { value: (k * k - 2) * k, why: 'multiplied x² + 1/x² by k without taking k away' }
          ]
        : [
            { value: k ** 3, why: 'dropped the 3m' },
            { value: k ** 3 - 3 * k, why: 'used the x + 1/x rule' },
            { value: k ** 3 + 3, why: 'added 3, not 3m' },
            { value: (k * k + 2) * k, why: 'multiplied x² + 1/x² by m without adding m back' }
          ],
    verify({ plus, k }, value) {
      const x = plus ? rootPlus(k) : rootMinus(k);
      return nearlyEqual(plus ? x ** 3 + x ** -3 : x ** 3 - x ** -3, value, 1e-9);
    },
    render({ plus, k }, { fmt: f }) {
      const op = plus ? '+' : '−';
      const value = plus ? k ** 3 - 3 * k : k ** 3 + 3 * k;
      return {
        question: `If x ${op} 1/x = ${k}, what is x³ ${op} 1/x³?`,
        explanation: `Cube both sides: (x ${op} 1/x)³ = x³ ${op} 1/x³ ${op} 3(x ${op} 1/x), because 3 × x × (1/x) = 3. So ${f(k ** 3)} = x³ ${op} 1/x³ ${op} ${3 * k}, giving x³ ${op} 1/x³ = ${f(k ** 3)} ${plus ? '−' : '+'} ${3 * k} = ${f(value)}.`,
        solutionSteps: [`(x ${op} 1/x)³ = x³ ${op} 1/x³ ${op} 3(x ${op} 1/x).`, `${k}³ = x³ ${op} 1/x³ ${op} 3 × ${k}.`, `x³ ${op} 1/x³ = ${f(k ** 3)} ${plus ? '−' : '+'} ${3 * k} = ${f(value)}.`],
        method: plus ? 'x³ + 1/x³ = k³ − 3k.' : 'x³ − 1/x³ = m³ + 3m.',
        hints: [`Cube x ${op} 1/x instead of finding x.`, `(a ${op} b)³ = a³ ${op} b³ ${op} 3ab(a ${op} b), and here ab = 1.`, `So ${k}³ = x³ ${op} 1/x³ ${op} 3 × ${k}.`],
        commonMistakes: [plus ? `Subtracting 3 instead of 3k (${f(k ** 3 - 3)}).` : `Using the x + 1/x rule k³ − 3k (${f(k ** 3 - 3 * k)}).`, `Dropping the cross term and answering ${f(k ** 3)}.`]
      };
    }
  },

  {
    id: 'ai-adv-recip-higher',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-adv-reciprocal',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ai-adv-ladder-f', 'ai-adv-disguise-sc'],
    estimatedSeconds: 80,
    formatValue: (value) => fmt(value),
    params(rng) {
      return { k: rng.int(3, 7), n: rng.pick([4, 5, 6]), quadratic: rng.chance(0.4) };
    },
    answer: ({ k, n }) => reciprocalLadder(k, n)[n],
    distractors({ k, n }) {
      const [, p1, p2, p3] = reciprocalLadder(k, 3);
      if (n === 4) {
        return [
          { value: p2 * p2, why: 'forgot the second −2' },
          { value: k ** 4 - 2, why: 'squared once: k⁴ − 2' },
          { value: k ** 4, why: 'took k⁴' },
          { value: p2 * p2 - 4, why: 'took 4 away' }
        ];
      }
      if (n === 5) {
        return [
          { value: p2 * p3, why: 'forgot to take k away' },
          { value: p2 * p3 + p1, why: 'added k' },
          { value: k ** 5 - 5 * k, why: 'guessed k⁵ − 5k' },
          { value: k ** 5, why: 'took k⁵' }
        ];
      }
      return [
        { value: p3 * p3, why: 'forgot the −2' },
        { value: p2 ** 3, why: 'cubed x² + 1/x² without taking 3(x² + 1/x²) away' },
        { value: k ** 6 - 2, why: 'took k⁶ − 2' },
        { value: p3 * p3 + 2, why: 'added 2' }
      ];
    },
    // Raise x itself to the power.
    verify({ k, n }, value) {
      const x = rootPlus(k);
      return nearlyEqual(x ** n + x ** -n, value, 1e-9);
    },
    render({ k, n, quadratic }, { fmt: f }) {
      const [, , p2, p3, p4, p5, p6] = reciprocalLadder(k, 6);
      const given = quadratic ? `x² − ${k}x + 1 = 0` : `x + 1/x = ${k}`;
      const start = quadratic ? [`Divide by x: x − ${k} + 1/x = 0, so x + 1/x = ${k}.`] : [];
      let steps;
      let method;
      if (n === 4) {
        steps = [`x² + 1/x² = ${k}² − 2 = ${p2}.`, `x⁴ + 1/x⁴ = ${p2}² − 2 = ${f(p4)}.`];
        method = 'Square twice, taking 2 away each time.';
      } else if (n === 5) {
        steps = [`x² + 1/x² = ${p2} and x³ + 1/x³ = ${k}³ − 3 × ${k} = ${p3}.`, `(x² + 1/x²)(x³ + 1/x³) = x⁵ + 1/x⁵ + x + 1/x.`, `x⁵ + 1/x⁵ = ${p2} × ${p3} − ${k} = ${f(p5)}.`];
        method = 'Multiply the second and third rungs, then take k away.';
      } else {
        steps = [`x³ + 1/x³ = ${k}³ − 3 × ${k} = ${p3}.`, `x⁶ + 1/x⁶ = ${p3}² − 2 = ${f(p6)}.`];
        method = 'Square the cube rung and take 2 away.';
      }
      const answer = [0, 0, 0, 0, p4, p5, p6][n];
      return {
        question: `If ${given}, what is ${powerSum(n)}?`,
        explanation: `${quadratic ? `x is not 0, so dividing by x gives x + 1/x = ${k}. ` : ''}Climb the ladder using only k: ${steps.join(' ')} ${n === 5 ? 'Multiplying two rungs adds the powers but leaves the cross terms x + 1/x, which is why k is taken away.' : 'Each squaring leaves a middle term 2, which is taken away.'}`,
        solutionSteps: [...start, ...steps],
        method,
        hints: [
          quadratic ? `An equation x² − kx + 1 = 0 is x + 1/x = k in disguise: divide by x.` : `Do not find x; build ${powerSum(n)} from lower powers.`,
          n === 5 ? 'x⁵ + 1/x⁵ comes from (x² + 1/x²)(x³ + 1/x³).' : n === 4 ? 'x⁴ + 1/x⁴ comes from squaring x² + 1/x².' : 'x⁶ + 1/x⁶ comes from squaring x³ + 1/x³.',
          `First find ${n === 4 ? `x² + 1/x² = ${p2}` : n === 5 ? `x² + 1/x² = ${p2} and x³ + 1/x³ = ${p3}` : `x³ + 1/x³ = ${p3}`}.`
        ],
        commonMistakes: [
          n === 5 ? `Multiplying the rungs and forgetting to take k away (${f(p2 * p3)}).` : `Squaring without taking 2 away (${f(answer + 2)}).`,
          `Treating ${powerSum(n)} as k${pw('', n)} with a small correction.`
        ]
      };
    }
  },

  {
    id: 'ai-adv-recip-surd',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-adv-reciprocal',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ai-adv-disguise-sc', 'ai-adv-ladder-f'],
    estimatedSeconds: 70,
    formatValue: (value) => fmt(value),
    params(rng) {
      return { a: rng.int(2, 9), plus: rng.chance(0.6), n: rng.pick([2, 3]) };
    },
    answer: ({ a, n }) => (n === 2 ? 4 * a * a - 2 : 8 * a ** 3 - 6 * a),
    distractors: ({ a, n }) =>
      n === 2
        ? [
            { value: 4 * a * a, why: 'forgot the −2' },
            { value: 4 * a * a + 2, why: 'added 2' },
            { value: a * a - 2, why: 'took x + 1/x as a instead of 2a' },
            { value: 2 * a * a - 1, why: 'kept only the whole-number part of x²' }
          ]
        : [
            { value: 8 * a ** 3, why: 'dropped the 3k' },
            { value: 8 * a ** 3 - 3, why: 'subtracted 3, not 3k' },
            { value: 8 * a ** 3 + 6 * a, why: 'added 3k' },
            { value: a ** 3 - 3 * a, why: 'took x + 1/x as a instead of 2a' }
          ],
    // Work x out as a decimal and raise it to the power.
    verify({ a, plus, n }, value) {
      const x = a + (plus ? 1 : -1) * Math.sqrt(a * a - 1);
      return nearlyEqual(x ** n + x ** -n, value, 1e-8);
    },
    render({ a, plus, n }, { fmt: f }) {
      const b = a * a - 1;
      const root = surdText(b);
      const x = `${a} ${plus ? '+' : '−'} ${root}`;
      const inverse = `${a} ${plus ? '−' : '+'} ${root}`;
      const k = 2 * a;
      const value = n === 2 ? k * k - 2 : k ** 3 - 3 * k;
      return {
        question: `If x = ${x}, what is ${powerSum(n)}?`,
        explanation: `(${a} + ${root})(${a} − ${root}) = ${a * a} − ${b} = 1, so 1/x = ${inverse} and x + 1/x = ${k}. Then ${powerSum(n)} = ${n === 2 ? `${k}² − 2 = ${f(value)}` : `${k}³ − 3 × ${k} = ${f(k ** 3)} − ${3 * k} = ${f(value)}`}.`,
        solutionSteps: [`(${a} + ${root})(${a} − ${root}) = ${a * a} − ${b} = 1, so 1/x = ${inverse}.`, `x + 1/x = ${k}; the surds cancel.`, n === 2 ? `x² + 1/x² = ${k * k} − 2 = ${f(value)}.` : `x³ + 1/x³ = ${f(k ** 3)} − ${3 * k} = ${f(value)}.`],
        method: 'Find 1/x by the conjugate, add to get k, then use the ladder.',
        hints: [`Multiply ${a} + ${root} by ${a} − ${root}. What do you get?`, `The product is 1, so 1/x = ${inverse} and x + 1/x = ${k}.`, n === 2 ? 'Now x² + 1/x² = k² − 2.' : 'Now x³ + 1/x³ = k³ − 3k.'],
        commonMistakes: [`Taking x + 1/x = ${a} instead of ${k}: the two whole-number parts add.`, n === 2 ? `Forgetting the −2 (${f(k * k)}).` : `Dropping the 3k (${f(k ** 3)}).`]
      };
    }
  },

  /* ============================== a³ + b³ + c³ − 3abc ============================== */
  {
    id: 'ai-adv-cubes-zero-sum',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-adv-three-var',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ai-adv-zero-equal-sc', 'ai-sc-zero-sum-cubes'],
    estimatedSeconds: 60,
    params(rng) {
      if (rng.chance(0.55)) {
        const q = rng.int(3, 25);
        const r = rng.int(2, 20);
        if (q === r) return null;
        return { form: 'numbers', p: q + r, q, r };
      }
      // x < y < z keeps (x − y)(y − z)(z − x) positive.
      const x = rng.int(1, 9);
      const y = x + rng.int(1, 6);
      const z = y + rng.int(1, 6);
      return { form: 'differences', x, y, z };
    },
    answer: (p) => (p.form === 'numbers' ? 3 * p.p * p.q * p.r : 3 * (p.x - p.y) * (p.y - p.z) * (p.z - p.x)),
    // Cube every number directly (BigInt, so nothing is rounded).
    verify(p, value) {
      const cube = (v) => BigInt(v) ** 3n;
      const direct = p.form === 'numbers' ? cube(p.p) - cube(p.q) - cube(p.r) : cube(p.x - p.y) + cube(p.y - p.z) + cube(p.z - p.x);
      return direct === BigInt(value);
    },
    render(p) {
      if (p.form === 'numbers') {
        const value = 3 * p.p * p.q * p.r;
        return {
          question: `Without cubing each number, find the value of ${pw(p.p, 3)} − ${pw(p.q, 3)} − ${pw(p.r, 3)}.`,
          explanation: `Write it as a³ + b³ + c³ with a = ${p.p}, b = −${p.q}, c = −${p.r}. These add up to 0, so a³ + b³ + c³ = 3abc = 3 × ${p.p} × (−${p.q}) × (−${p.r}) = ${fmt(value)}.`,
          solutionSteps: [`a = ${p.p}, b = −${p.q}, c = −${p.r}; a + b + c = 0.`, 'So a³ + b³ + c³ = 3abc.', `3 × ${p.p} × ${p.q} × ${p.r} = ${fmt(value)} (two minus signs cancel).`],
          method: 'If a + b + c = 0, then a³ + b³ + c³ = 3abc.',
          hints: [`Treat the minus signs as part of the numbers: ${p.p}, −${p.q} and −${p.r}.`, 'What do those three numbers add up to?', 'They add to 0, so the sum of cubes is 3 × their product.'],
          commonMistakes: [`Dropping the 3 and giving ${fmt(p.p * p.q * p.r)}.`, 'Losing one of the two minus signs and giving a negative answer.']
        };
      }
      const { x, y, z } = p;
      const [d1, d2, d3] = [x - y, y - z, z - x];
      const value = 3 * d1 * d2 * d3;
      return {
        question: `If x = ${x}, y = ${y} and z = ${z}, what is (x − y)³ + (y − z)³ + (z − x)³?`,
        explanation: `The three bases x − y = ${signed(d1)}, y − z = ${signed(d2)} and z − x = ${signed(d3)} add up to 0, so the sum of their cubes is 3 × their product: 3 × (${signed(d1)}) × (${signed(d2)}) × ${d3} = ${fmt(value)}.`,
        solutionSteps: [`x − y = ${signed(d1)}, y − z = ${signed(d2)}, z − x = ${d3}; they add to 0.`, 'So the sum of cubes = 3 × product.', `3 × (${signed(d1)}) × (${signed(d2)}) × ${d3} = ${fmt(value)}.`],
        method: 'Three bases that add to 0: the sum of cubes is 3 × the product.',
        hints: ['Add the three bases x − y, y − z and z − x.', 'They always add to 0, so use a³ + b³ + c³ = 3abc.', `Multiply ${signed(d1)}, ${signed(d2)} and ${d3}, then by 3.`],
        commonMistakes: ['Thinking the cubes cancel because the bases add to 0, and answering 0.', `Forgetting the 3 (${fmt(d1 * d2 * d3)}).`]
      };
    }
  },

  {
    id: 'ai-adv-three-cubes-sums',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-adv-three-var',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ai-adv-three-cubes-f'],
    estimatedSeconds: 80,
    formatValue: (value) => fmt(value),
    params(rng) {
      const a = rng.int(1, 9);
      const b = rng.int(1, 9);
      const c = rng.int(1, 9);
      if (a === b && b === c) return null;
      return { a, b, c, mode: rng.pick(['gap', 'gap-squares', 'cubes']) };
    },
    answer({ a, b, c, mode }) {
      const s = a + b + c;
      const q = a * b + b * c + c * a;
      const S2 = s * s - 2 * q;
      const gap = s * (S2 - q);
      return mode === 'cubes' ? gap + 3 * a * b * c : gap;
    },
    distractors({ a, b, c, mode }) {
      const s = a + b + c;
      const q = a * b + b * c + c * a;
      const S2 = s * s - 2 * q;
      const P = a * b * c;
      if (mode === 'gap') {
        return [
          { value: s * S2, why: 'forgot to subtract ab + bc + ca' },
          { value: s * (s * s - q), why: 'took a² + b² + c² as (a + b + c)²' },
          { value: S2 - q, why: 'forgot to multiply by a + b + c' },
          { value: s ** 3, why: 'cubed the sum' }
        ];
      }
      if (mode === 'gap-squares') {
        return [
          { value: s * S2, why: 'forgot to subtract ab + bc + ca' },
          { value: s * (S2 - (s * s - S2)), why: 'forgot to halve for ab + bc + ca' },
          { value: S2 - q, why: 'forgot to multiply by a + b + c' },
          { value: s ** 3, why: 'cubed the sum' }
        ];
      }
      return [
        { value: s * (S2 - q), why: 'forgot to add 3abc back' },
        { value: s * (S2 - q) + P, why: 'added abc, not 3abc' },
        { value: s * S2, why: 'multiplied the sum by the sum of squares' },
        { value: s ** 3, why: 'cubed the sum' }
      ];
    },
    // Cube a, b, c themselves.
    verify({ a, b, c, mode }, value) {
      const cubes = a ** 3 + b ** 3 + c ** 3;
      return value === (mode === 'cubes' ? cubes : cubes - 3 * a * b * c);
    },
    render({ a, b, c, mode }, { fmt: f }) {
      const s = a + b + c;
      const q = a * b + b * c + c * a;
      const S2 = s * s - 2 * q;
      const P = a * b * c;
      const gap = s * (S2 - q);
      if (mode === 'cubes') {
        return {
          question: `If a + b + c = ${s}, a² + b² + c² = ${S2} and abc = ${P}, what is a³ + b³ + c³?`,
          explanation: `First ab + bc + ca = (${s}² − ${S2}) ÷ 2 = ${q}. Then a³ + b³ + c³ − 3abc = (a + b + c)(a² + b² + c² − ab − bc − ca) = ${s} × ${S2 - q} = ${f(gap)}, so a³ + b³ + c³ = ${f(gap)} + 3 × ${P} = ${f(gap + 3 * P)}.`,
          solutionSteps: [`ab + bc + ca = (${s * s} − ${S2}) ÷ 2 = ${q}.`, `a³ + b³ + c³ − 3abc = ${s} × (${S2} − ${q}) = ${f(gap)}.`, `a³ + b³ + c³ = ${f(gap)} + ${3 * P} = ${f(gap + 3 * P)}.`],
          method: 'Find ab + bc + ca, use the identity, then add 3abc back.',
          hints: ['The identity gives a³ + b³ + c³ − 3abc, and it needs ab + bc + ca.', '2(ab + bc + ca) = (a + b + c)² − (a² + b² + c²).', 'After the identity, add 3abc back.'],
          commonMistakes: [`Stopping at a³ + b³ + c³ − 3abc = ${f(gap)}.`, `Adding abc instead of 3abc (${f(gap + P)}).`]
        };
      }
      const givenQ = mode === 'gap';
      return {
        question: givenQ
          ? `If a + b + c = ${s} and ab + bc + ca = ${q}, what is a³ + b³ + c³ − 3abc?`
          : `If a + b + c = ${s} and a² + b² + c² = ${S2}, what is a³ + b³ + c³ − 3abc?`,
        explanation: `a³ + b³ + c³ − 3abc = (a + b + c)(a² + b² + c² − ab − bc − ca). ${
          givenQ ? `Here a² + b² + c² = ${s}² − 2 × ${q} = ${S2}` : `Here ab + bc + ca = (${s}² − ${S2}) ÷ 2 = ${q}`
        }, so the bracket is ${S2} − ${q} = ${S2 - q} and the value is ${s} × ${S2 - q} = ${f(gap)}.`,
        solutionSteps: [
          givenQ ? `a² + b² + c² = ${s * s} − ${2 * q} = ${S2}.` : `ab + bc + ca = (${s * s} − ${S2}) ÷ 2 = ${q}.`,
          `a² + b² + c² − ab − bc − ca = ${S2} − ${q} = ${S2 - q}.`,
          `a³ + b³ + c³ − 3abc = ${s} × ${S2 - q} = ${f(gap)}.`
        ],
        method: 'Factorise as (a + b + c)(a² + b² + c² − ab − bc − ca).',
        hints: [
          'Which identity has a³ + b³ + c³ − 3abc on one side?',
          'It is (a + b + c)(a² + b² + c² − ab − bc − ca).',
          givenQ ? 'Find a² + b² + c² from (a + b + c)² − 2(ab + bc + ca).' : 'Find ab + bc + ca from [(a + b + c)² − (a² + b² + c²)] ÷ 2.'
        ],
        commonMistakes: [
          givenQ ? `Taking a² + b² + c² as ${s}² (${f(s * (s * s - q))}).` : `Forgetting to halve for ab + bc + ca (${f(s * (2 * S2 - s * s))}).`,
          `Forgetting to subtract ab + bc + ca (${f(s * S2)}).`
        ]
      };
    }
  },

  /* ============================== least values from squares ============================== */
  {
    id: 'ai-adv-extreme-square-pair',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-adv-extremes',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ai-adv-square-floor-sc'],
    estimatedSeconds: 60,
    formatValue: (value) => fmt(value),
    params(rng) {
      const p = rng.int(1, 6);
      const q = rng.int(1, 9);
      if (p === 1 && q === 1) return null;
      return { p, q };
    },
    answer: ({ p, q }) => 2 * p * q,
    distractors: ({ p, q }) => [
      { value: p * p + q * q, why: 'put x = 1' },
      { value: p * q, why: 'forgot the 2 in the middle term' },
      { value: 2, why: 'copied x² + 1/x² ≥ 2' },
      { value: (p + q) ** 2, why: 'used (p + q)²' }
    ],
    // A brute-force scan over x > 0 (the expression is even, so x < 0 gives the same values).
    verify({ p, q }, value) {
      const best = scanMinimum((x) => p * p * x * x + (q * q) / (x * x));
      return best >= value * (1 - 1e-9) && nearlyEqual(best, value, 1e-4);
    },
    render({ p, q }) {
      const [num, den] = reduceFraction(q, p);
      const at = den === 1 ? `${num}` : `${num}/${den}`;
      const A = p * p;
      const B = q * q;
      const left = A === 1 ? 'x²' : `${A}x²`;
      const right = `${B}/x²`;
      const sq = `${p === 1 ? '' : p}x − ${q}/x`;
      return {
        question: `For real x ≠ 0, what is the least value of ${left} + ${right}?`,
        explanation: `(${sq})² = ${left} − ${2 * p * q} + ${right}, because the middle term is 2 × ${p === 1 ? '' : p}x × ${q}/x = ${2 * p * q}. So ${left} + ${right} = (${sq})² + ${2 * p * q}, which is never below ${2 * p * q} and equals it when ${p === 1 ? '' : p}x = ${q}/x, that is x² = ${at}.`,
        solutionSteps: [`(${sq})² = ${left} − ${2 * p * q} + ${right}.`, `${left} + ${right} = (${sq})² + ${2 * p * q} ≥ ${2 * p * q}.`, `Equality when x² = ${at}, so the least value is ${2 * p * q}.`],
        method: 'Write the expression as a square plus a constant.',
        hints: [`Which square has ${left} and ${right} as its outer terms?`, `(${sq})² has middle term −2 × ${p === 1 ? '' : p}x × ${q}/x, a constant.`, `So ${left} + ${right} = (${sq})² + ${2 * p * q}.`],
        commonMistakes: [`Putting x = 1, which gives ${A + B}, not the least value.`, `Forgetting the 2 in the middle term (${p * q}).`]
      };
    }
  },

  {
    id: 'ai-adv-extreme-zero-squares',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-adv-extremes',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ai-adv-square-floor-sc'],
    estimatedSeconds: 75,
    params(rng) {
      const pick = () => rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
      let [p, q, r] = [pick(), pick(), pick()];
      if (p + q + r === 0) return null;
      // Keep the answer positive: flip every sign if needed.
      if (p + q + r < 0) [p, q, r] = [-p, -q, -r];
      return { p, q, r };
    },
    answer: ({ p, q, r }) => p + q + r,
    // Search every whole-number triple for the zeros of the expression.
    verify({ p, q, r }, value) {
      const K = p * p + q * q + r * r;
      const zeros = [];
      for (let a = -8; a <= 8; a++) {
        for (let b = -8; b <= 8; b++) {
          for (let c = -8; c <= 8; c++) if (a * a + b * b + c * c - 2 * p * a - 2 * q * b - 2 * r * c + K === 0) zeros.push(a + b + c);
        }
      }
      return zeros.length === 1 && zeros[0] === value;
    },
    render({ p, q, r }) {
      const K = p * p + q * q + r * r;
      const sq = (name, v) => `(${name} ${v > 0 ? '−' : '+'} ${Math.abs(v)})²`;
      const equation = `a² + b² + c²${linear(-2 * p, 'a')}${linear(-2 * q, 'b')}${linear(-2 * r, 'c')} + ${K} = 0`;
      const sum = p + q + r;
      return {
        question: `Real numbers a, b and c satisfy ${equation}. What is a + b + c?`,
        explanation: `Split ${K} as ${p * p} + ${q * q} + ${r * r} to complete three squares: ${sq('a', p)} + ${sq('b', q)} + ${sq('c', r)} = 0. Squares are never negative, so each one is 0: a = ${signed(p)}, b = ${signed(q)}, c = ${signed(r)}, and a + b + c = ${sum}.`,
        solutionSteps: [`${K} = ${p * p} + ${q * q} + ${r * r}.`, `${sq('a', p)} + ${sq('b', q)} + ${sq('c', r)} = 0.`, `Each square is 0: a = ${signed(p)}, b = ${signed(q)}, c = ${signed(r)}.`, `a + b + c = ${sum}.`],
        method: 'Complete the squares; a sum of squares is 0 only when each is 0.',
        hints: ['Group the a-terms, the b-terms and the c-terms, and look for perfect squares.', `Half of each linear coefficient, squared, adds up to the constant ${K}.`, 'A sum of squares equal to 0 makes every square 0.'],
        commonMistakes: ['Reading the sign the wrong way round: (b + 2)² = 0 means b = −2, not 2.', `Answering with the constant ${K}.`]
      };
    }
  },

  {
    id: 'ai-adv-extreme-fixed-sum',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-adv-extremes',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ai-adv-square-floor-sc'],
    estimatedSeconds: 50,
    formatValue: (value) => fmt(value),
    params(rng) {
      return { s: 2 * rng.int(2, 20), diff: rng.chance(0.4) };
    },
    answer: ({ s }) => (s * s) / 2,
    distractors: ({ s }) => [
      { value: s * s, why: 'took x² + y² as (x + y)², ignoring the cross term' },
      { value: (s * s) / 4, why: 'gave the largest product instead' },
      { value: 2 * s * s, why: 'doubled instead of halving' },
      { value: s, why: 'did not square' }
    ],
    // Scan x on a quarter-unit grid (it includes the true minimiser).
    verify({ s, diff }, value) {
      let best = Infinity;
      for (let x = -2 * s; x <= 2 * s; x += 0.25) best = Math.min(best, x * x + (diff ? x - s : s - x) ** 2);
      return nearlyEqual(best, value);
    },
    render({ s, diff }) {
      const half = s / 2;
      const op = diff ? '−' : '+';
      const other = diff ? '−' : '';
      const value = (s * s) / 2;
      return {
        question: `x and y are real numbers with x ${op} y = ${s}. What is the least possible value of x² + y²?`,
        explanation: `x² + y² = ½[(x + y)² + (x − y)²]. Here (x ${op} y)² = ${s * s} is fixed, and the other square, (x ${diff ? '+' : '−'} y)², is never negative, so x² + y² ≥ ${s * s} ÷ 2 = ${fmt(value)}. It equals ${fmt(value)} when x ${diff ? '+' : '−'} y = 0, that is x = ${half} and y = ${other}${half}.`,
        solutionSteps: ['x² + y² = ½[(x + y)² + (x − y)²].', `(x ${op} y)² = ${s * s}; the other square is at least 0.`, `Least value ½ × ${s * s} = ${fmt(value)}, at x = ${half}, y = ${other}${half}.`],
        method: 'x² + y² = ½[(x + y)² + (x − y)²]: make the free square 0.',
        hints: [`Write x² + y² using (x + y)² and (x − y)².`, 'x² + y² = ½[(x + y)² + (x − y)²].', `One square is fixed at ${s}² = ${s * s}; make the other one 0.`],
        commonMistakes: [`Taking x² + y² = (x ${op} y)² = ${s * s}, forgetting the cross term.`, diff ? `Dividing by 4 instead of 2 (${fmt((s * s) / 4)}).` : `Giving ${fmt((s * s) / 4)}, the largest value of xy, not the least of x² + y².`]
      };
    }
  }
];
