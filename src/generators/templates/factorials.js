/**
 * Factorials: ratios, trailing zeros, the power of a prime or composite in n!,
 * sums of factorials, the size of n! and the smallest factorial a number divides.
 * Answers come from Legendre-style counting and are checked against n! itself (BigInt).
 */

import { fmt } from '../core.js';
import { factorialBig, factorialPowerOf, legendre, legendreLayers, primeFactors, smallestFactorialMultiple, valuation } from '../../utils/numberTheory.js';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const pw = (a, k) => `${a}${String(k).split('').map((d) => SUP[d]).join('')}`;
const powersText = (m) => primeFactors(m).map(([p, k]) => (k > 1 ? pw(p, k) : String(p))).join(' × ');
const zerosOf = (big) => {
  const s = big.toString();
  return s.length - s.replace(/0+$/, '').length;
};
const layersText = (n, p) => legendreLayers(n, p).join(' + ');

export const factorialTemplates = [
  /* =============================== definition =============================== */
  {
    id: 'fc-ratio',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-definition',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['fc-def-f', 'fc-sc-ratio'],
    estimatedSeconds: 30,
    params(rng) {
      const n = rng.int(6, 25);
      const k = rng.pick([2, 2, 3]);
      return { n, k };
    },
    answer: ({ n, k }) => (k === 2 ? n * (n - 1) : n * (n - 1) * (n - 2)),
    formatValue: (value) => fmt(value),
    distractors: ({ n, k }) => [
      { value: k === 2 ? 2 : 6, why: 'subtracted inside the factorial: (n − (n − k))!' },
      { value: n ** k, why: 'raised n to the power k' },
      { value: k === 2 ? n * (n - 1) * (n - 2) : n * (n - 1), why: 'took the wrong number of factors' },
      { value: n * k, why: 'multiplied n by k' }
    ],
    verify: ({ n, k }, value) => factorialBig(n) / factorialBig(n - k) === BigInt(value),
    render({ n, k }) {
      const factors = Array.from({ length: k }, (_, i) => n - i);
      const value = factors.reduce((a, b) => a * b, 1);
      return {
        question: `What is ${n}! ÷ ${n - k}!?`,
        explanation: `${n}! = ${factors.join(' × ')} × ${n - k}!, so the ${n - k}! cancels and leaves ${factors.join(' × ')} = ${fmt(value)}.`,
        solutionSteps: [`Write ${n}! = ${factors.join(' × ')} × ${n - k}!.`, `Cancel ${n - k}!.`, `${factors.join(' × ')} = ${fmt(value)}.`],
        method: 'Cancel the smaller factorial; k factors remain.',
        hints: [`Write ${n}! so that ${n - k}! appears inside it.`, `${k} factors remain, counting down from ${n}.`],
        commonMistakes: [`Computing (${n} − ${n - k})! = ${k}!.`]
      };
    }
  },

  {
    id: 'fc-ratio-equation',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-definition',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['fc-sc-ratio'],
    estimatedSeconds: 50,
    params(rng) {
      const n = rng.int(4, 24);
      const k = rng.pick([2, 2, 3]);
      return { n, k };
    },
    answer: ({ n }) => n,
    verify: ({ n, k }, value) => {
      const target = factorialBig(n + k) / factorialBig(n);
      const hits = [];
      for (let m = 1; m <= 60; m++) if (factorialBig(m + k) / factorialBig(m) === target) hits.push(m);
      return hits.length === 1 && hits[0] === value;
    },
    render({ n, k }) {
      const factors = Array.from({ length: k }, (_, i) => n + k - i);
      const P = factors.reduce((a, b) => a * b, 1);
      const lhs = `(n + ${k})! ÷ n!`;
      const terms = Array.from({ length: k }, (_, i) => `(n + ${k - i})`).join('');
      return {
        question: `If ${lhs} = ${fmt(P)}, what is n?`,
        explanation: `${lhs} = ${terms}, a product of ${k} consecutive numbers. ${fmt(P)} = ${factors.slice().reverse().join(' × ')}, so n + ${k} = ${n + k} and n = ${n}.`,
        solutionSteps: [`${lhs} = ${terms}.`, `${fmt(P)} = ${factors.slice().reverse().join(' × ')}.`, `n = ${n}.`],
        method: 'Cancel, then look for consecutive factors.',
        hints: [`After cancelling n!, ${k} consecutive factors remain.`, `Which ${k} consecutive numbers multiply to ${fmt(P)}?`],
        commonMistakes: [`Answering the largest factor (${n + k}) instead of n.`]
      };
    }
  },

  /* ============================== trailing zeros ============================== */
  {
    id: 'fc-trailing-zeros',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-trailing',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['fc-zeros-f', 'fc-sc-divide-down'],
    estimatedSeconds: 35,
    params(rng) {
      const n = rng.int(26, 600);
      return { n };
    },
    answer: ({ n }) => legendre(n, 5),
    verify: ({ n }, value) => zerosOf(factorialBig(n)) === value,
    render({ n }) {
      const layers = legendreLayers(n, 5);
      const zeros = legendre(n, 5);
      return {
        question: `How many zeros are there at the end of ${n}!?`,
        explanation: `Count the fives: divide ${n} by 5 again and again, dropping remainders: ${layers.join(', ')}. Adding them gives ${layers.join(' + ')} = ${zeros}. There are more than enough 2s, so ${n}! ends in ${zeros} zeros.`,
        solutionSteps: [`${n} ÷ 5 = ${layers[0]}.`, ...layers.slice(1).map((v, i) => `${layers[i]} ÷ 5 = ${v}.`), `Total: ${zeros}.`],
        method: 'Count the fives layer by layer.',
        hints: ['Each zero needs a 2 and a 5, and 5s are scarcer.', 'Don’t stop at ⌊n/5⌋: multiples of 25 and 125 hold extra fives.'],
        commonMistakes: [`Stopping at ⌊${n}/5⌋ = ${layers[0]}.`]
      };
    }
  },

  {
    id: 'fc-zeros-product',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-trailing',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fc-zeros-f'],
    estimatedSeconds: 55,
    params(rng) {
      const a = rng.int(20, 90);
      const b = rng.int(20, 90);
      if (a >= b) return null;
      return { a, b };
    },
    answer: ({ a, b }) => legendre(a, 5) + legendre(b, 5),
    formatValue: (value) => fmt(value),
    distractors: ({ a, b }) => [
      { value: legendre(b, 5), why: 'counted only the larger factorial' },
      { value: legendre(a, 5) * legendre(b, 5), why: 'multiplied the counts' },
      { value: legendre(a + b, 5), why: 'added the numbers first' },
      { value: Math.floor(a / 5) + Math.floor(b / 5), why: 'missed the extra fives in multiples of 25' }
    ],
    verify: ({ a, b }, value) => zerosOf(factorialBig(a) * factorialBig(b)) === value,
    render({ a, b }) {
      const za = legendre(a, 5);
      const zb = legendre(b, 5);
      return {
        question: `How many zeros are there at the end of ${a}! × ${b}!?`,
        explanation: `${a}! holds ${za} fives (${layersText(a, 5)}) and ${b}! holds ${zb} (${layersText(b, 5)}). The product holds ${za + zb} fives and far more 2s, so it ends in ${za + zb} zeros.`,
        solutionSteps: [`Fives in ${a}!: ${layersText(a, 5)} = ${za}.`, `Fives in ${b}!: ${layersText(b, 5)} = ${zb}.`, `Product: ${za} + ${zb} = ${za + zb}.`],
        method: 'Fives in a product add up.',
        hints: ['Count the fives in each factorial separately.', 'In a product the counts of fives add.'],
        commonMistakes: ['Giving the zeros of one factorial only.', 'Multiplying the two counts.']
      };
    }
  },

  {
    id: 'fc-smallest-with-zeros',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-trailing',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['fc-zeros-f', 'fc-sc-skipped'],
    estimatedSeconds: 80,
    params(rng) {
      const k = rng.int(3, 150);
      let n = 0;
      while (legendre(n, 5) < k) n += 5;
      if (legendre(n, 5) !== k) return null; // k is a skipped count
      return { k, n };
    },
    answer: ({ n }) => n,
    verify: ({ k }, value) => zerosOf(factorialBig(value)) === k && zerosOf(factorialBig(value - 1)) < k,
    render({ k, n }) {
      const guess = 4 * k;
      return {
        question: `What is the smallest n for which n! ends in exactly ${k} zeros?`,
        explanation: `The zero count only rises at multiples of 5, so n is a multiple of 5. Roughly n ≈ 4 × ${k} = ${guess}; adjusting in steps of 5, ${n}! has ${layersText(n, 5)} = ${k} zeros and ${n - 5}! has ${legendre(n - 5, 5)}. So n = ${n}.`,
        solutionSteps: [`Estimate: each 5 numbers add at least one zero, so n ≈ 4k = ${guess}.`, `Zeros of ${n}!: ${layersText(n, 5)} = ${k}.`, `Zeros of ${n - 5}!: ${legendre(n - 5, 5)} < ${k}, so n = ${n}.`],
        method: 'Estimate with n ≈ 4k, then adjust in multiples of 5.',
        hints: ['The count of zeros only changes at multiples of 5.', `Start near 4 × ${k} and count the fives.`],
        commonMistakes: [`Answering 5 × ${k} = ${5 * k}, forgetting the extra fives from multiples of 25.`]
      };
    }
  },

  /* ============================ powers of primes ============================ */
  {
    id: 'fc-legendre-prime',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-legendre',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fc-legendre-f'],
    estimatedSeconds: 50,
    params(rng) {
      const p = rng.pick([2, 3, 7, 11, 13]);
      const n = rng.int(p === 2 ? 20 : 30, p === 2 ? 120 : 300);
      if (legendreLayers(n, p).length < 2) return null;
      return { p, n };
    },
    answer: ({ n, p }) => legendre(n, p),
    formatValue: (value) => fmt(value),
    distractors: ({ n, p }) => {
      const layers = legendreLayers(n, p);
      return [
        { value: layers[0], why: 'counted only the multiples of p' },
        { value: layers[0] + layers[1], why: 'stopped after two layers' },
        { value: Math.round(n / p), why: 'rounded n/p' },
        { value: legendre(n, p) + 1, why: 'off by one' },
        { value: Math.floor(n / (p * p)), why: 'counted only multiples of p²' }
      ];
    },
    verify: ({ n, p }, value) => {
      let total = 0;
      for (let m = 1; m <= n; m++) total += valuation(m, p);
      return total === value;
    },
    render({ p, n }) {
      const layers = legendreLayers(n, p);
      return {
        question: `The highest power of ${p} that divides ${n}! is ${p}ᵏ. What is k?`,
        explanation: `Legendre: ${layers.map((v, i) => `⌊${n}/${p ** (i + 1)}⌋ = ${v}`).join(', ')}. k = ${layers.join(' + ')} = ${legendre(n, p)}.`,
        solutionSteps: [...layers.map((v, i) => `Multiples of ${p ** (i + 1)} up to ${n}: ${v}.`), `k = ${legendre(n, p)}.`],
        method: 'Add ⌊n/p⌋ + ⌊n/p²⌋ + … while the terms are positive.',
        hints: [`Multiples of ${p} each give one ${p}.`, `Multiples of ${p * p} give a second ${p}${layers.length > 2 ? `, multiples of ${p ** 3} a third` : ''}.`],
        commonMistakes: [`Stopping at the multiples of ${p} (${layers[0]}).`]
      };
    }
  },

  {
    id: 'fc-composite-power',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-composite',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['fc-composite-f', 'fc-legendre-f'],
    estimatedSeconds: 90,
    params(rng) {
      const m = rng.pick([6, 12, 14, 15, 18, 20, 21, 24, 28, 35, 36, 45, 48, 50, 72, 75, 80, 96, 100]);
      const n = rng.int(15, 80);
      if (factorialPowerOf(n, m) < 2) return null;
      return { m, n };
    },
    answer: ({ m, n }) => factorialPowerOf(n, m),
    verify: ({ m, n }, value) => {
      let f = factorialBig(n);
      let k = 0;
      while (f % BigInt(m) === 0n) {
        f /= BigInt(m);
        k += 1;
      }
      return k === value;
    },
    render({ m, n }) {
      const parts = primeFactors(m).map(([p, a]) => ({ p, a, e: legendre(n, p), copies: Math.floor(legendre(n, p) / a) }));
      const k = Math.min(...parts.map((x) => x.copies));
      return {
        question: `What is the largest whole number k for which ${m}ᵏ divides ${n}!?`,
        explanation: `${m} = ${powersText(m)}. ${parts.map((x) => `${n}! holds ${pw(x.p, x.e)} (${layersText(n, x.p)}), enough for ⌊${x.e} ÷ ${x.a}⌋ = ${x.copies} copies`).join('; ')}. The scarcest prime decides: k = ${k}.`,
        solutionSteps: [`${m} = ${powersText(m)}.`, ...parts.map((x) => `Prime ${x.p}: ${x.e} in ${n}!, ÷ ${x.a} → ${x.copies}.`), `k = smallest = ${k}.`],
        method: 'Copies allowed by each prime power; take the smallest.',
        hints: [`Write ${m} as a product of prime powers.`, 'For each prime, divide its count in n! by the exponent it has in m.'],
        commonMistakes: ['Assuming the largest prime always decides.', 'Forgetting to divide by the exponent in m.']
      };
    }
  },

  /* ============================== sums of factorials ============================== */
  {
    id: 'fc-sum-unit-digit',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-sums',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['fc-sum-f'],
    estimatedSeconds: 40,
    params(rng) {
      const a = rng.int(1, 6);
      const n = rng.int(10, 99);
      return { a, n };
    },
    answer: ({ a }) => [1, 2, 6, 24].slice(a - 1).reduce((s, x) => s + x, 0) % 10,
    formatValue: (value) => fmt(value),
    distractors: ({ a, n }) => [
      { value: 3, why: 'used the answer for a sum starting at 1!' },
      { value: 0, why: 'assumed every term ends in 0' },
      { value: ([1, 2, 6, 24].slice(a - 1).reduce((s, x) => s + x, 0) + 5) % 10, why: 'included 5! as 5' },
      { value: (a * n) % 10, why: 'multiplied the limits' },
      { value: 9, why: 'guessed' }
    ],
    verify: ({ a, n }, value) => {
      let sum = 0n;
      for (let k = a; k <= n; k++) sum += factorialBig(k);
      return Number(sum % 10n) === value;
    },
    render({ a, n }) {
      const early = [1, 2, 6, 24].slice(a - 1);
      const total = early.reduce((s, x) => s + x, 0);
      const terms = early.map((_, i) => `${a + i}!`);
      return {
        question: `What is the unit digit of ${a}! + ${a + 1}! + ${a + 2}! + … + ${n}!?`,
        explanation: early.length
          ? `From 5! = 120 onwards every factorial ends in 0. So only ${terms.join(' + ')} = ${early.join(' + ')} = ${total} matters, and its unit digit is ${total % 10}.`
          : `Every term from 5! onwards ends in 0 (each contains 2 × 5), so the whole sum ends in 0.`,
        solutionSteps: early.length
          ? [`n! ends in 0 for n ≥ 5.`, `${terms.join(' + ')} = ${total}.`, `Unit digit: ${total % 10}.`]
          : ['Every term contains 2 × 5.', 'Each ends in 0.', 'Unit digit: 0.'],
        method: 'Only the terms before 5! affect the unit digit.',
        hints: ['From which factorial onwards does every term end in 0?', a <= 4 ? `Add the terms from ${a}! to 4!.` : 'Does any term here come before 5!?'],
        commonMistakes: ['Answering 3 by habit, though the sum does not start at 1!.']
      };
    }
  },

  {
    id: 'fc-sum-remainder',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-sums',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fc-sc-sum-remainder'],
    estimatedSeconds: 60,
    params(rng) {
      const d = rng.pick([3, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 18, 24, 100]);
      const n = rng.int(20, 80);
      let stop = 1;
      while (factorialBig(stop) % BigInt(d) !== 0n) stop += 1;
      return { d, n, stop };
    },
    answer: ({ d, stop }) => {
      let sum = 0n;
      for (let k = 1; k < stop; k++) sum += factorialBig(k);
      return Number(sum % BigInt(d));
    },
    formatValue: (value) => fmt(value),
    distractors: ({ d, stop }) => {
      let sum = 0n;
      for (let k = 1; k < stop; k++) sum += factorialBig(k);
      const r = Number(sum % BigInt(d));
      return [
        { value: 0, why: 'assumed every term is divisible' },
        { value: 33 % d, why: 'stopped at 4! as for unit digits' },
        { value: d - r, why: 'took the complement' },
        { value: (r + 1) % d, why: 'off by one' },
        { value: Number(sum) % 10, why: 'gave the unit digit' }
      ];
    },
    verify: ({ d, n }, value) => {
      let sum = 0n;
      for (let k = 1; k <= n; k++) sum += factorialBig(k);
      return Number(sum % BigInt(d)) === value;
    },
    render({ d, n, stop }) {
      const early = Array.from({ length: stop - 1 }, (_, i) => factorialBig(i + 1));
      const total = early.reduce((s, x) => s + x, 0n);
      const r = Number(total % BigInt(d));
      const label = d === 100 ? 'What are the last two digits of' : 'What is the remainder when';
      const tail = d === 100 ? '?' : ` is divided by ${d}?`;
      return {
        question: `${label} 1! + 2! + 3! + … + ${n}!${tail}`,
        explanation: `${stop}! = ${fmt(Number(factorialBig(stop)))} is divisible by ${d}, and so is every later factorial. Only 1! + … + ${stop - 1}! = ${fmt(Number(total))} is left, which leaves ${r} on division by ${d}.`,
        solutionSteps: [`The first factorial divisible by ${d} is ${stop}!.`, `1! + … + ${stop - 1}! = ${fmt(Number(total))}.`, `${fmt(Number(total))} leaves ${r} on division by ${d}.`],
        method: 'Drop every term from the first factorial the divisor divides.',
        hints: [`Find the first k for which ${d} divides k!.`, 'Add the terms before it and reduce.'],
        commonMistakes: [`Stopping at ${d}! instead of at the first factorial that ${d} divides.`, 'Assuming the remainder is 0.']
      };
    }
  },

  /* ============================== size and divisibility ============================== */
  {
    id: 'fc-digits',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-growth',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fc-growth-f'],
    estimatedSeconds: 50,
    params(rng) {
      const n = rng.int(8, 40);
      return { n };
    },
    answer: ({ n }) => {
      let log = 0;
      for (let k = 2; k <= n; k++) log += Math.log10(k);
      return Math.floor(log + 1e-9) + 1;
    },
    formatValue: (value) => fmt(value),
    distractors: ({ n }) => {
      const digits = factorialBig(n).toString().length;
      return [
        { value: digits - 1, why: 'one digit short' },
        { value: digits + 1, why: 'one digit too many' },
        { value: n, why: 'assumed n! has n digits' },
        { value: digits + 2, why: 'over-estimated' }
      ];
    },
    verify: ({ n }, value) => factorialBig(n).toString().length === value,
    render({ n }) {
      let log = 0;
      for (let k = 2; k <= n; k++) log += Math.log10(k);
      const digits = Math.floor(log + 1e-9) + 1;
      return {
        question: `How many digits does ${n}! have?`,
        explanation: `log₁₀ ${n}! = log₁₀ 2 + log₁₀ 3 + … + log₁₀ ${n} ≈ ${log.toFixed(2)}. A number whose logarithm is ${log.toFixed(2)} has ⌊${log.toFixed(2)}⌋ + 1 = ${digits} digits. (Check from 10! = 36,28,800, which has 7 digits.)`,
        solutionSteps: [`Add the logarithms: ≈ ${log.toFixed(2)}.`, `Digits = ⌊${log.toFixed(2)}⌋ + 1.`, `= ${digits}.`],
        method: 'Digits = ⌊log₁₀ N⌋ + 1.',
        hints: ['Use 10! = 36,28,800 (7 digits) as a benchmark.', 'Each extra factor k adds about log₁₀ k digits.'],
        commonMistakes: ['Assuming n! has about n digits.']
      };
    }
  },

  {
    id: 'fc-smallest-divisible',
    version: 1,
    topicId: 'factorials',
    conceptId: 'fc-divisibility',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['fc-divisible-f', 'fc-legendre-f'],
    estimatedSeconds: 75,
    params(rng) {
      const [p, q] = rng.shuffle([2, 3, 5, 7]).slice(0, 2);
      const a = rng.int(3, p === 2 ? 18 : p === 3 ? 10 : 6);
      const b = rng.pick([0, 1, 2, 3]);
      const m = p ** a * q ** b;
      if (m > 1e12) return null;
      return { m, p, a, q, b };
    },
    answer: ({ m }) => smallestFactorialMultiple(m),
    verify: ({ m }, value) => factorialBig(value) % BigInt(m) === 0n && factorialBig(value - 1) % BigInt(m) !== 0n,
    render({ m }) {
      const parts = primeFactors(m).map(([p, a]) => {
        let n = p;
        while (legendre(n, p) < a) n += p;
        return { p, a, n };
      });
      const answer = Math.max(...parts.map((x) => x.n));
      return {
        question: `What is the smallest n for which n! is divisible by ${powersText(m)}?`,
        explanation: `${parts.map((x) => `For ${x.a > 1 ? pw(x.p, x.a) : x.p}, ${x.n}! is the first factorial with at least ${x.a} factor${x.a > 1 ? 's' : ''} of ${x.p} (it has ${legendre(x.n, x.p)}: ${layersText(x.n, x.p)})`).join('. ')}. n! needs all of them at once, so n = ${answer}.`,
        solutionSteps: [...parts.map((x) => `${x.a > 1 ? pw(x.p, x.a) : x.p}: smallest n is ${x.n}.`), `Take the largest: n = ${answer}.`],
        method: 'For each prime power, the smallest n whose factorial holds it; then the largest of those.',
        hints: ['Treat each prime power separately.', 'The count of a prime p in n! only rises when n passes a multiple of p.'],
        commonMistakes: ['Matching the exponent (n = a) instead of counting the primes in n!.']
      };
    }
  }
];
