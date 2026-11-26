/** Factors and multiples, HCF and LCM, and divisibility templates. */

import { fmt, gcd, lcm } from '../core.js';

const SMALL_PRIMES = [2, 3, 5, 7];

function divisorsOf(n) {
  const out = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d);
  return out;
}

function isPerfectSquare(n) {
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

function coprimePair(rng, max) {
  const x = rng.int(1, max);
  const y = rng.int(1, max);
  return x !== y && gcd(x, y) === 1 ? [x, y] : null;
}

export const numberTheoryTemplates = [
  /* ========================= factors and multiples ========================= */
  {
    id: 'fm-multiples-count',
    version: 1,
    topicId: 'factors-multiples',
    conceptId: 'fm-multiples',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['fm-multiples-f'],
    estimatedSeconds: 35,
    params(rng) {
      const k = rng.int(3, 19);
      const n = rng.int(5, 30) * 10 + rng.int(0, 9);
      if (n % k === 0 || n < 2 * k) return null;
      return { n, k };
    },
    answer: ({ n, k }) => Math.floor(n / k),
    formatValue: (value) => fmt(value),
    distractors: ({ n, k }) => [
      { value: Math.ceil(n / k), why: 'rounded up' },
      { value: Math.floor(n / k) - 1, why: 'lost a multiple' },
      { value: k, why: 'gave the divisor' },
      { value: Math.floor(n / k) + 2, why: 'off by two' }
    ],
    verify({ n, k }, value) {
      let count = 0;
      for (let m = k; m <= n; m += k) count++;
      return count === value;
    },
    render({ n, k }) {
      const q = Math.floor(n / k);
      return {
        question: `How many multiples of ${k} are there from 1 to ${n}?`,
        explanation: `${n} ÷ ${k} = ${fmt(n / k, 2)}, so there are ${q} multiples (the last is ${k} × ${q} = ${k * q}).`,
        solutionSteps: [`${n} ÷ ${k} = ${fmt(n / k, 2)}.`, `Drop the fraction: ${q}.`],
        method: 'Divide and round down.',
        hints: [`What is the largest multiple of ${k} that does not exceed ${n}?`, 'Divide and ignore the remainder.'],
        commonMistakes: ['Rounding up instead of down.']
      };
    }
  },

  {
    id: 'fm-sum-of-factors',
    version: 1,
    topicId: 'factors-multiples',
    conceptId: 'fm-count',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['fm-sum-f', 'fm-count-f'],
    estimatedSeconds: 70,
    params(rng) {
      const [p, q] = rng.shuffle(SMALL_PRIMES).slice(0, 2);
      const a = rng.int(1, 3);
      const b = rng.int(1, 2);
      const N = p ** a * q ** b;
      if (N > 300) return null;
      return { p, q, a, b, N };
    },
    answer: ({ p, q, a, b }) => {
      let sp = 0;
      for (let i = 0; i <= a; i++) sp += p ** i;
      let sq = 0;
      for (let i = 0; i <= b; i++) sq += q ** i;
      return sp * sq;
    },
    verify: ({ N }, value) => divisorsOf(N).reduce((acc, d) => acc + d, 0) === value,
    render({ p, q, a, b, N }) {
      const spTerms = Array.from({ length: a + 1 }, (_, i) => p ** i);
      const sqTerms = Array.from({ length: b + 1 }, (_, i) => q ** i);
      const sp = spTerms.reduce((x, y) => x + y, 0);
      const sq = sqTerms.reduce((x, y) => x + y, 0);
      return {
        question: `What is the sum of all the factors of ${N}?`,
        explanation: `${N} = ${p}${a > 1 ? `^${a}` : ''} × ${q}${b > 1 ? `^${b}` : ''}, so the sum is (${spTerms.join(' + ')})(${sqTerms.join(' + ')}) = ${sp} × ${sq} = ${sp * sq}.`,
        solutionSteps: [`Factorise: ${N} = ${p}^${a} × ${q}^${b}.`, `Sum for ${p}: ${spTerms.join(' + ')} = ${sp}.`, `Sum for ${q}: ${sqTerms.join(' + ')} = ${sq}.`, `Multiply: ${sp} × ${sq} = ${sp * sq}.`],
        method: 'Multiply the geometric sums for each prime.',
        hints: ['Write N as a product of prime powers.', 'For each prime add its powers from 0 up to its exponent, then multiply the sums.'],
        commonMistakes: ['Adding only the prime factors.']
      };
    }
  },

  {
    id: 'fm-square-multiplier',
    version: 1,
    topicId: 'factors-multiples',
    conceptId: 'fm-squares',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fm-square-f'],
    estimatedSeconds: 65,
    params(rng) {
      const m = rng.pick([2, 3, 5, 6, 7, 10, 11, 13, 14, 15]);
      const s = rng.int(2, 12);
      return { m, s, N: s * s * m };
    },
    answer: ({ m }) => m,
    formatValue: (value) => fmt(value),
    distractors: ({ m, s }) => [
      { value: 2 * m, why: 'over-multiplied' },
      { value: s, why: 'gave the square root part' },
      { value: m + 1, why: 'guessed the next number' },
      { value: m * m, why: 'squared the missing factor' }
    ],
    verify({ N }, value) {
      if (!isPerfectSquare(N * value)) return false;
      for (let k = 1; k < value; k++) if (isPerfectSquare(N * k)) return false;
      return true;
    },
    render({ m, s, N }) {
      return {
        question: `What is the smallest number by which ${N} must be multiplied to make it a perfect square?`,
        explanation: `${N} = ${s * s} × ${m} = ${s}² × ${m}. The factor ${m} is unpaired (it has odd exponents), so multiply by ${m}: ${N} × ${m} = ${N * m} = ${s * m}².`,
        solutionSteps: [`Split ${N} into a square and a remainder: ${s * s} × ${m}.`, `${m} is what is left unpaired.`, `Multiply by ${m} to get ${N * m} = ${s * m}².`],
        method: 'Multiply by the primes whose exponents are odd.',
        hints: ['Write N in prime powers.', 'Which primes have odd exponents?'],
        commonMistakes: ['Multiplying by extra factors that are already paired.']
      };
    }
  },

  {
    id: 'fm-restricted-factors',
    version: 1,
    topicId: 'factors-multiples',
    conceptId: 'fm-count',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['fm-count-f'],
    estimatedSeconds: 90,
    params(rng) {
      const a = rng.int(2, 5);
      const b = rng.int(2, 4);
      const c = rng.int(1, 3);
      const x = rng.int(1, 2);
      const y = rng.int(1, Math.min(2, b));
      return { a, b, c, x, y };
    },
    answer: ({ a, b, c, x, y }) => (a - x + 1) * (b - y + 1) * (c + 1),
    verify({ a, b, c, x, y }, value) {
      let count = 0;
      for (let i = 0; i <= a; i++) {
        for (let j = 0; j <= b; j++) {
          for (let k = 0; k <= c; k++) if (i >= x && j >= y && k >= 0) count++;
        }
      }
      return count === value;
    },
    render({ a, b, c, x, y }) {
      const divisor = 2 ** x * 3 ** y;
      const total = (a + 1) * (b + 1) * (c + 1);
      return {
        question: `How many factors of 2^${a} × 3^${b} × 5^${c} are multiples of ${divisor}?`,
        explanation: `A multiple of ${divisor} needs at least ${x} two(s) and ${y} three(s). Choices: 2 → ${a - x + 1}, 3 → ${b - y + 1}, 5 → ${c + 1}. Total = ${a - x + 1} × ${b - y + 1} × ${c + 1} = ${(a - x + 1) * (b - y + 1) * (c + 1)}.`,
        solutionSteps: [`Exponent of 2: ${x} to ${a} → ${a - x + 1} choices.`, `Exponent of 3: ${y} to ${b} → ${b - y + 1} choices.`, `Exponent of 5: 0 to ${c} → ${c + 1} choices.`, `Multiply: ${(a - x + 1) * (b - y + 1) * (c + 1)}.`],
        method: 'Restrict the exponent range of each prime, then multiply the choices.',
        hints: [`What must every multiple of ${divisor} contain?`, 'Count the allowed exponents for each prime separately.'],
        commonMistakes: [`Counting all ${total} factors.`]
      };
    }
  },

  /* ============================== HCF and LCM ============================== */
  {
    id: 'hl-basic-pair',
    version: 1,
    topicId: 'hcf-lcm',
    conceptId: 'hl-basic',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['hl-factor-f'],
    estimatedSeconds: 45,
    params(rng) {
      const pair = coprimePair(rng, 9);
      if (!pair) return null;
      const g = rng.int(2, 12);
      const a = g * pair[0];
      const b = g * pair[1];
      if (a > 150 || b > 150) return null;
      return { a, b, g, askHcf: rng.chance(0.5) };
    },
    answer: ({ a, b, askHcf }) => (askHcf ? gcd(a, b) : lcm(a, b)),
    formatValue: (value) => fmt(value),
    distractors: ({ a, b, askHcf }) =>
      askHcf
        ? [
            { value: lcm(a, b), why: 'gave the LCM' },
            { value: a * b, why: 'gave the product' },
            { value: Math.abs(a - b), why: 'subtracted' },
            { value: Math.min(a, b), why: 'took the smaller number' }
          ]
        : [
            { value: gcd(a, b), why: 'gave the HCF' },
            { value: a * b, why: 'gave the product' },
            { value: a + b, why: 'added' },
            { value: Math.max(a, b), why: 'took the larger number' }
          ],
    verify({ a, b, askHcf }, value) {
      if (askHcf) {
        for (let d = Math.min(a, b); d >= 1; d--) if (a % d === 0 && b % d === 0) return d === value;
        return false;
      }
      for (let m = Math.max(a, b); m <= a * b; m++) if (m % a === 0 && m % b === 0) return m === value;
      return false;
    },
    render({ a, b, askHcf }) {
      const h = gcd(a, b);
      const l = lcm(a, b);
      return {
        question: `What is the ${askHcf ? 'HCF' : 'LCM'} of ${a} and ${b}?`,
        explanation: askHcf
          ? `The largest number dividing both ${a} and ${b} is ${h}. (LCM = ${a} × ${b} ÷ ${h} = ${l}.)`
          : `HCF = ${h}, so LCM = ${a} × ${b} ÷ ${h} = ${l}.`,
        solutionSteps: [`Common factor of ${a} and ${b}: HCF = ${h}.`, askHcf ? `HCF = ${h}.` : `LCM = ${a} × ${b} ÷ ${h} = ${l}.`],
        method: askHcf ? 'Common primes, lowest powers.' : 'All primes, highest powers; or a × b ÷ HCF.',
        hints: ['Write each number in prime powers.', askHcf ? 'Keep only shared primes, at the lowest power.' : 'Keep every prime, at the highest power.'],
        commonMistakes: [askHcf ? 'Giving the LCM.' : 'Giving the HCF.']
      };
    }
  },

  {
    id: 'hl-missing-number',
    version: 1,
    topicId: 'hcf-lcm',
    conceptId: 'hl-product',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['hl-product-f'],
    estimatedSeconds: 60,
    params(rng) {
      const pair = coprimePair(rng, 9);
      if (!pair) return null;
      const g = rng.int(2, 15);
      const [x, y] = pair;
      if (x < 2 || y < 2) return null;
      return { g, a: g * x, b: g * y, l: g * x * y };
    },
    answer: ({ b }) => b,
    formatValue: (value) => fmt(value),
    distractors: ({ a, b, g, l }) => [
      { value: l / a, why: 'divided the LCM by the known number' },
      { value: l - a, why: 'subtracted from the LCM' },
      { value: a + g, why: 'added the HCF' },
      { value: g * l, why: 'multiplied without dividing' }
    ],
    verify: ({ a, g, l }, value) => gcd(a, value) === g && lcm(a, value) === l,
    render({ a, b, g, l }) {
      return {
        question: `The HCF of two numbers is ${g} and their LCM is ${l}. If one of the numbers is ${a}, what is the other?`,
        explanation: `HCF × LCM = product of the numbers: ${g} × ${l} = ${g * l}. The other number is ${g * l} ÷ ${a} = ${b}.`,
        solutionSteps: [`${g} × ${l} = ${g * l}.`, `${g * l} ÷ ${a} = ${b}.`],
        method: 'Other number = HCF × LCM ÷ known number.',
        hints: ['Use HCF × LCM = a × b.'],
        commonMistakes: ['Dividing the LCM by the known number.']
      };
    }
  },

  {
    id: 'hl-bells',
    version: 1,
    topicId: 'hcf-lcm',
    conceptId: 'hl-lcm-apps',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['hl-lcm-f'],
    estimatedSeconds: 50,
    params(rng) {
      const values = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20];
      const [a, b, c] = rng.shuffle(values).slice(0, 3);
      const L = lcm(lcm(a, b), c);
      if (L > 180 || L === Math.max(a, b, c)) return null;
      return { a, b, c, L };
    },
    answer: ({ L }) => L,
    formatValue: (value) => `${fmt(value)} minutes`,
    distractors: ({ a, b, c, L }) => [
      { value: a * b * c, why: 'multiplied the periods' },
      { value: a + b + c, why: 'added the periods' },
      { value: Math.max(a, b, c) * 2, why: 'doubled the largest period' },
      { value: L / 2, why: 'halved the answer' }
    ],
    verify({ a, b, c }, value) {
      for (let t = 1; t <= a * b * c; t++) if (t % a === 0 && t % b === 0 && t % c === 0) return t === value;
      return false;
    },
    render({ a, b, c, L }) {
      return {
        question: `Three bells ring every ${a}, ${b} and ${c} minutes. They ring together now. After how many minutes will they next ring together?`,
        explanation: `They next coincide at the LCM of ${a}, ${b} and ${c}, which is ${L} minutes.`,
        solutionSteps: [`Factorise ${a}, ${b} and ${c} into primes.`, `Take every prime at its highest power.`, `LCM = ${L}.`],
        method: 'Repeating events coincide at the LCM.',
        hints: ['You need a time that is a multiple of all three periods.', 'The first such time is the LCM.'],
        commonMistakes: ['Multiplying the periods.']
      };
    }
  },

  {
    id: 'hl-remainder-smallest',
    version: 1,
    topicId: 'hcf-lcm',
    conceptId: 'hl-remainder',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['hl-remainder-f'],
    estimatedSeconds: 75,
    tags: ['trap'],
    params(rng) {
      const values = [4, 6, 8, 9, 10, 12, 15, 18, 20];
      const [a, b, c] = rng.shuffle(values).slice(0, 3);
      const L = lcm(lcm(a, b), c);
      const r = rng.int(1, Math.min(a, b, c) - 1);
      if (L > 180) return null;
      const lower = r + rng.int(1, 9);
      if (lower >= L + r) return null;
      return { a, b, c, r, L, lower, N: L + r };
    },
    answer: ({ N }) => N,
    formatValue: (value) => fmt(value),
    distractors: ({ L, r }) => [
      { value: L, why: 'gave the LCM without the remainder' },
      { value: L - r, why: 'subtracted the remainder' },
      { value: 2 * L + r, why: 'skipped to the second solution' },
      { value: L * r, why: 'multiplied by the remainder' }
    ],
    verify({ a, b, c, r, lower, N }, value) {
      for (let n = lower + 1; n <= 4000; n++) {
        if (n % a === r && n % b === r && n % c === r) return n === value;
      }
      return false;
    },
    render({ a, b, c, r, L, lower, N }) {
      return {
        question: `Find the smallest number greater than ${lower} that leaves a remainder of ${r} when divided by ${a}, ${b} and ${c}.`,
        explanation: `LCM(${a}, ${b}, ${c}) = ${L}. Numbers leaving remainder ${r} are ${L}k + ${r}: ${r}, ${L + r}, … The first above ${lower} is ${N}.`,
        solutionSteps: [`LCM = ${L}.`, `Numbers are ${L}k + ${r}.`, `Smallest above ${lower}: ${L} + ${r} = ${N}.`],
        method: 'LCM plus the common remainder.',
        hints: ['Numbers leaving the same remainder differ by a multiple of the LCM.', `Add the remainder ${r} to a multiple of the LCM.`],
        commonMistakes: ['Answering with the LCM and forgetting the remainder.']
      };
    }
  },

  /* ============================== divisibility ============================== */
  {
    id: 'dv-missing-digit-9',
    version: 1,
    topicId: 'divisibility',
    conceptId: 'dv-missing',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dv-missing-f'],
    estimatedSeconds: 50,
    params(rng) {
      const digits = Array.from({ length: 4 }, () => rng.int(1, 9));
      const pos = rng.int(1, 3);
      const known = digits.filter((_, i) => i !== pos);
      const sum = known.reduce((x, y) => x + y, 0);
      const d = (9 - (sum % 9)) % 9;
      if (d === 0) return null;
      return { digits, pos, sum, d };
    },
    answer: ({ d }) => d,
    formatValue: (value) => fmt(value),
    distractors: ({ sum, d }) => [
      { value: sum % 9, why: 'gave the remainder of the digit sum' },
      { value: d + 1, why: 'off by one' },
      { value: d - 1, why: 'off by one' },
      { value: sum, why: 'gave the sum of the known digits' }
    ],
    verify({ digits, pos, d }, value) {
      let hits = 0;
      let last = -1;
      for (let x = 0; x <= 9; x++) {
        const number = digits.map((digit, i) => (i === pos ? x : digit)).join('');
        if (Number(number) % 9 === 0) {
          hits++;
          last = x;
        }
      }
      return hits === 1 && last === value && value === d;
    },
    render({ digits, pos, sum, d }) {
      const shown = digits.map((digit, i) => (i === pos ? 'x' : digit)).join('');
      const target = sum + d;
      return {
        question: `If the number ${shown} (x is a single digit) is divisible by 9, what is x?`,
        explanation: `The digit sum ${sum} + x must be a multiple of 9. The next multiple above ${sum} is ${target}, so x = ${d}.`,
        solutionSteps: [`Known digits add to ${sum}.`, `Next multiple of 9: ${target}.`, `x = ${target} − ${sum} = ${d}.`],
        method: 'Top the digit sum up to the next multiple of 9.',
        hints: ['Add the known digits.', 'What is the next multiple of 9 above that sum?'],
        commonMistakes: ['Answering with the remainder of the digit sum.']
      };
    }
  },

  {
    id: 'dv-remainder-by-rule',
    version: 1,
    topicId: 'divisibility',
    conceptId: 'dv-counting',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dv-rules-f'],
    estimatedSeconds: 50,
    params(rng) {
      const m = rng.pick([4, 8, 9]);
      const N = rng.int(2000, 99999);
      if (N % m === 0) return null;
      return { m, N };
    },
    answer: ({ m, N }) => N % m,
    formatValue: (value) => fmt(value),
    distractors: ({ m, N }) => {
      const r = N % m;
      return [
        { value: m - r, why: 'gave the complement of the remainder' },
        { value: (N % 10) % m, why: 'used only the last digit' },
        { value: r + 1 < m ? r + 1 : r - 1, why: 'off by one' },
        { value: m, why: 'gave the divisor' }
      ];
    },
    verify({ m, N }, value) {
      const text = String(N);
      const tail = m === 4 ? Number(text.slice(-2)) : m === 8 ? Number(text.slice(-3)) : text.split('').reduce((s, d) => s + Number(d), 0);
      return tail % m === value;
    },
    render({ m, N }) {
      const text = String(N);
      const via = m === 4 ? `the last two digits ${text.slice(-2)}` : m === 8 ? `the last three digits ${text.slice(-3)}` : `the digit sum ${text.split('').reduce((s, d) => s + Number(d), 0)}`;
      return {
        question: `What is the remainder when ${fmt(N)} is divided by ${m}?`,
        explanation: `Only ${via} matters for divisibility by ${m}, which leaves remainder ${N % m}.`,
        solutionSteps: [m === 9 ? 'Add the digits.' : `Take ${via}.`, `Divide by ${m}: remainder ${N % m}.`],
        method: m === 9 ? 'Remainder mod 9 = remainder of the digit sum.' : `Only the last ${m === 4 ? 'two' : 'three'} digits matter.`,
        hints: [m === 9 ? 'A number has the same remainder as its digit sum.' : 'Which part of the number is always a multiple of ' + m + '?'],
        commonMistakes: ['Looking at the last digit only.']
      };
    }
  },

  {
    id: 'dv-smallest-multiple',
    version: 1,
    topicId: 'divisibility',
    conceptId: 'dv-counting',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dv-count-f'],
    estimatedSeconds: 70,
    tags: ['trap'],
    params(rng) {
      const m = rng.pick([12, 15, 18, 24, 36, 45, 56, 72, 88, 96]);
      const k = rng.int(3, 5);
      const start = 10 ** (k - 1);
      if (start % m === 0) return null;
      return { m, k, start, N: Math.ceil(start / m) * m };
    },
    answer: ({ N }) => N,
    formatValue: (value) => fmt(value),
    distractors: ({ m, N, start }) => [
      { value: N - m, why: 'rounded down to a multiple with too few digits' },
      { value: N + m, why: 'skipped a multiple' },
      { value: start, why: 'gave the smallest number with that many digits' },
      { value: N + 1, why: 'guessed' }
    ],
    verify({ m, start }, value) {
      return value % m === 0 && value >= start && value - m < start;
    },
    render({ m, k, start, N }) {
      return {
        question: `What is the smallest ${k}-digit number that is divisible by ${m}?`,
        explanation: `The smallest ${k}-digit number is ${fmt(start)}. ${fmt(start)} ÷ ${m} = ${fmt(start / m, 2)}, so round up to ${Math.ceil(start / m)} and multiply: ${Math.ceil(start / m)} × ${m} = ${fmt(N)}.`,
        solutionSteps: [`Smallest ${k}-digit number: ${fmt(start)}.`, `${fmt(start)} ÷ ${m} = ${fmt(start / m, 2)} → round up to ${Math.ceil(start / m)}.`, `${Math.ceil(start / m)} × ${m} = ${fmt(N)}.`],
        method: 'Round the smallest k-digit number up to the next multiple.',
        hints: [`Divide ${fmt(start)} by ${m}.`, 'Round up, never down.'],
        commonMistakes: ['Rounding down and ending up with too few digits.']
      };
    }
  },

  {
    id: 'dv-count-either',
    version: 1,
    topicId: 'divisibility',
    conceptId: 'dv-counting',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['dv-count-f'],
    estimatedSeconds: 80,
    tags: ['trap'],
    params(rng) {
      const a = rng.int(3, 9);
      const b = rng.int(4, 12);
      if (a === b) return null;
      return { a, b, n: rng.int(6, 30) * 10 };
    },
    answer: ({ a, b, n }) => Math.floor(n / a) + Math.floor(n / b) - Math.floor(n / lcm(a, b)),
    formatValue: (value) => fmt(value),
    distractors: ({ a, b, n }) => [
      { value: Math.floor(n / a) + Math.floor(n / b), why: 'did not subtract the overlap' },
      { value: Math.floor(n / a) + Math.floor(n / b) - Math.floor(n / (a * b)), why: 'used a × b for the overlap instead of the LCM' },
      { value: Math.floor(n / lcm(a, b)), why: 'counted only the common multiples' },
      { value: Math.floor(n / a) + Math.floor(n / b) - 2 * Math.floor(n / lcm(a, b)), why: 'subtracted the overlap twice' }
    ],
    verify({ a, b, n }, value) {
      let count = 0;
      for (let i = 1; i <= n; i++) if (i % a === 0 || i % b === 0) count++;
      return count === value;
    },
    render({ a, b, n }) {
      const l = lcm(a, b);
      return {
        question: `How many numbers from 1 to ${n} are divisible by ${a} or ${b}?`,
        explanation: `⌊${n} ÷ ${a}⌋ = ${Math.floor(n / a)}, ⌊${n} ÷ ${b}⌋ = ${Math.floor(n / b)}, and numbers divisible by both are multiples of LCM(${a}, ${b}) = ${l}: ${Math.floor(n / l)}. Total = ${Math.floor(n / a)} + ${Math.floor(n / b)} − ${Math.floor(n / l)} = ${Math.floor(n / a) + Math.floor(n / b) - Math.floor(n / l)}.`,
        solutionSteps: [`Multiples of ${a}: ${Math.floor(n / a)}.`, `Multiples of ${b}: ${Math.floor(n / b)}.`, `Multiples of ${l} (both): ${Math.floor(n / l)}.`, `Subtract the overlap once.`],
        method: 'Inclusion–exclusion with the LCM.',
        hints: ['Some numbers are counted in both lists.', `The overlap is the multiples of LCM(${a}, ${b}), not of ${a * b}.`],
        commonMistakes: ['Not subtracting the overlap, or using a × b instead of the LCM.']
      };
    }
  }
];
