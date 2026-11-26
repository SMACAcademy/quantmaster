/**
 * Remainders and cyclicity: sums and products, negative remainders, powers,
 * unit digits, last two digits, Fermat, Euler, Wilson and two-remainder problems.
 * Every answer is checked a second way, usually by BigInt arithmetic or a brute-force search.
 */

import { fmt, gcd } from '../core.js';
import { modPow, mod, powerCycle, powerFromCycle, totient, isPrime, primeFactors, factorialBig } from '../../utils/numberTheory.js';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const pw = (a, k) => `${a}${String(k).split('').map((d) => SUP[d]).join('')}`;
const two = (v) => String(v).padStart(2, '0');
const PRIMES = [7, 11, 13, 17, 19, 23];

/** The modular inverse of a mod m (a and m coprime), by the extended Euclidean algorithm. */
function inverse(a, m) {
  let [oldR, r] = [mod(a, m), m];
  let [oldS, s] = [1, 0];
  while (r) {
    const q = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return mod(oldS, m);
}

export const remainderTemplates = [
  /* ============================ sums and products ============================ */
  {
    id: 'rm-product-remainder',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-basics',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['rm-identity-f'],
    estimatedSeconds: 45,
    params(rng) {
      const d = rng.pick([6, 7, 8, 9, 11, 12, 13]);
      const nums = [rng.int(101, 999), rng.int(101, 999), rng.int(11, 99)];
      const rems = nums.map((x) => x % d);
      if (rems.some((r) => r === 0)) return null;
      const raw = rems[0] * rems[1] * rems[2];
      if (raw < d) return null;
      return { d, nums, rems, raw };
    },
    answer: ({ raw, d }) => raw % d,
    formatValue: (value) => fmt(value),
    distractors: ({ rems, raw, d }) => [
      { value: (rems[0] + rems[1] + rems[2]) % d, why: 'added the remainders instead of multiplying' },
      { value: raw, why: 'did not reduce the product of the remainders' },
      { value: d - (raw % d), why: 'subtracted from the divisor' },
      { value: ((raw % d) + 1) % d, why: 'off by one' }
    ],
    verify: ({ nums, d }, value) => Number((BigInt(nums[0]) * BigInt(nums[1]) * BigInt(nums[2])) % BigInt(d)) === value,
    render({ d, nums, rems, raw }) {
      const r = raw % d;
      return {
        question: `What is the remainder when ${fmt(nums[0])} × ${fmt(nums[1])} × ${nums[2]} is divided by ${d}?`,
        explanation: `Replace each number by its remainder on division by ${d}: ${rems.join(', ')}. Their product is ${raw}, and ${raw} = ${d} × ${Math.floor(raw / d)} + ${r}, so the remainder is ${r}.`,
        solutionSteps: [
          `Remainders on division by ${d}: ${rems.join(', ')}.`,
          `Multiply: ${rems.join(' × ')} = ${raw}.`,
          `${raw} leaves ${r} on division by ${d}.`
        ],
        method: 'Multiply the remainders, then reduce.',
        hints: [`Find what each number leaves on division by ${d}; the full product is never needed.`, `Multiply the three remainders and divide by ${d} once more.`],
        commonMistakes: ['Stopping at the product of the remainders without reducing it.', 'Adding the remainders instead of multiplying them.']
      };
    }
  },

  {
    id: 'rm-sum-remainder',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-basics',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['rm-identity-f'],
    estimatedSeconds: 50,
    params(rng) {
      const d = rng.pick([4, 6, 7, 8, 9, 11, 12]);
      const nums = [rng.int(1001, 9999), rng.int(1001, 9999), rng.int(1001, 9999), rng.int(101, 999)];
      const rems = nums.map((x) => x % d);
      const total = rems.reduce((a, b) => a + b, 0);
      if (total < d) return null;
      return { d, nums, rems, total };
    },
    answer: ({ total, d }) => total % d,
    verify: ({ nums, d }, value) => nums.reduce((a, b) => a + b, 0) % d === value,
    render({ d, nums, rems, total }) {
      return {
        question: `What is the remainder when ${nums.map((x) => fmt(x)).join(' + ')} is divided by ${d}?`,
        explanation: `The remainders on division by ${d} are ${rems.join(', ')}. They add up to ${total}, which leaves ${total % d} on division by ${d}.`,
        solutionSteps: [`Remainders: ${rems.join(', ')}.`, `Add: ${rems.join(' + ')} = ${total}.`, `${total} leaves ${total % d}.`],
        method: 'Add the remainders, then reduce.',
        hints: ['A sum leaves the same remainder as the sum of the remainders.', `Find each number's remainder on division by ${d} first.`],
        commonMistakes: [`Giving the sum of the remainders (${total}) without reducing it.`]
      };
    }
  },

  /* ============================ negative remainders ============================ */
  {
    id: 'rm-negative-product',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-negative',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['rm-negative-f'],
    estimatedSeconds: 60,
    params(rng) {
      const d = rng.int(15, 80);
      const shorts = rng.shuffle([1, 2, 3, 4, 5]).slice(0, 3).sort((a, b) => a - b);
      const nums = shorts.map((s) => rng.int(1, 3) * d - s);
      return { d, shorts, nums };
    },
    answer: ({ d, shorts }) => mod(-(shorts[0] * shorts[1] * shorts[2]), d),
    verify: ({ nums, d }, value) => Number((BigInt(nums[0]) * BigInt(nums[1]) * BigInt(nums[2])) % BigInt(d)) === value,
    render({ d, shorts, nums }) {
      const p = shorts[0] * shorts[1] * shorts[2];
      const r = mod(-p, d);
      return {
        question: `What is the remainder when ${nums.join(' × ')} is divided by ${d}?`,
        explanation: `Each number is just short of a multiple of ${d}, so use negative remainders: ${shorts.map((s) => `−${s}`).join(', ')}. Their product is −${p}, and −${p} + ${Math.ceil(p / d) * d} = ${r}.`,
        solutionSteps: [
          `Negative remainders: ${shorts.map((s) => `−${s}`).join(', ')}.`,
          `Product: (−${shorts[0]})(−${shorts[1]})(−${shorts[2]}) = −${p}.`,
          `Add multiples of ${d} until it is not negative: ${r}.`
        ],
        method: 'Use small negative remainders, then add the divisor back.',
        hints: [`How far is each number below a multiple of ${d}?`, `Three negatives multiply to a negative; add ${d} (as often as needed) at the end.`],
        commonMistakes: [`Answering ${p % d} by forgetting the minus sign.`, 'Leaving a negative remainder.']
      };
    }
  },

  {
    id: 'rm-negative-power',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-negative',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rm-negative-f', 'rm-power-f'],
    estimatedSeconds: 55,
    params(rng) {
      const d = rng.int(5, 13);
      const s = rng.pick([1, 1, 2]);
      const base = rng.int(2, 9) * d - s;
      const e = s === 1 ? rng.int(21, 99) : rng.int(3, 9);
      if (s === 2 && 2 ** e < d) return null;
      return { d, s, base, e };
    },
    answer: ({ d, s, e }) => mod((-s) ** e, d),
    formatValue: (value) => fmt(value),
    distractors: ({ d, s, e }) => [
      { value: mod(s ** e, d), why: 'ignored the minus sign' },
      { value: d - 1, why: 'assumed −1' },
      { value: 1, why: 'assumed +1' },
      { value: 0, why: 'assumed divisible' },
      { value: s, why: 'gave the shortfall' },
      { value: d - s, why: 'gave the base’s remainder' },
      { value: d - 2, why: 'off by one from −1' },
      { value: 2, why: 'off by one from +1' }
    ],
    verify: ({ base, e, d }, value) => modPow(base, e, d) === value,
    render({ d, s, base, e }) {
      const signed = (-s) ** e;
      const r = mod(signed, d);
      return {
        question: `What is the remainder when ${pw(base, e)} is divided by ${d}?`,
        explanation: `${base} = ${(base + s) / d} × ${d} − ${s}, so it behaves like −${s} on division by ${d}. (−${s})${pw('', e)} = ${signed < 0 ? '−' : ''}${fmt(Math.abs(signed))}${signed < 0 ? `, and adding multiples of ${d} gives ${r}` : `, which leaves ${r}`}.`,
        solutionSteps: [`${base} ≡ −${s} (mod ${d}).`, `${e} is ${e % 2 ? 'odd' : 'even'}, so (−${s})${pw('', e)} = ${signed < 0 ? '−' : ''}${fmt(Math.abs(signed))}.`, `Remainder: ${r}.`],
        method: 'Replace the base by a small negative remainder.',
        hints: [`Is ${base} just above or just below a multiple of ${d}?`, `Raise −${s} to the power ${e}; mind whether the exponent is odd or even.`],
        commonMistakes: ['Ignoring the sign of the negative remainder.', 'Leaving the answer negative instead of adding the divisor.']
      };
    }
  },

  /* ============================== powers and cycles ============================== */
  {
    id: 'rm-power-cycle',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-powers',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rm-power-f'],
    estimatedSeconds: 75,
    params(rng) {
      const n = rng.int(5, 15);
      const bases = [];
      for (let a = 2; a <= 14; a++) {
        if (gcd(a, n) === 1 && a % n > 1 && a % n !== n - 1 && powerCycle(a, n).cycle.length >= 3) bases.push(a);
      }
      if (!bases.length) return null;
      const a = rng.pick(bases);
      const k = rng.int(25, 199);
      return { n, a, k, cycle: powerCycle(a, n).cycle };
    },
    answer: ({ a, k, n }) => powerFromCycle(a, k, n),
    formatValue: (value) => fmt(value),
    distractors: ({ a, k, n, cycle }) => [
      { value: powerFromCycle(a, k % n || n, n), why: 'reduced the exponent by the divisor instead of the cycle length' },
      { value: a % n, why: 'gave the first remainder' },
      { value: 1, why: 'assumed the cycle ends exactly' },
      { value: powerFromCycle(a, k + 1, n), why: 'counted one step too far' },
      { value: cycle[cycle.length - 2], why: 'picked the wrong place in the cycle' },
      { value: powerFromCycle(a, k - 1, n), why: 'counted one step short' },
      { value: 0, why: 'assumed divisible' }
    ],
    verify: ({ a, k, n }, value) => modPow(a, k, n) === value,
    render({ n, a, k, cycle }) {
      const L = cycle.length;
      const r = k % L || L;
      const value = powerFromCycle(a, k, n);
      return {
        question: `What is the remainder when ${pw(a, k)} is divided by ${n}?`,
        explanation: `The remainders of ${a}, ${pw(a, 2)}, ${pw(a, 3)}, … on division by ${n} are ${cycle.join(', ')} and then repeat: a cycle of ${L}. ${k} = ${L} × ${Math.floor((k - r) / L)} + ${r}, so ${pw(a, k)} leaves what ${pw(a, r)} leaves: ${value}.`,
        solutionSteps: [`Cycle of remainders: ${cycle.join(', ')} (length ${L}).`, `${k} leaves ${k % L} on division by ${L}${k % L ? '' : ` (so take the ${L}th place)`}.`, `The ${r === 1 ? '1st' : r === 2 ? '2nd' : r === 3 ? '3rd' : `${r}th`} remainder in the cycle is ${value}.`],
        method: 'Find the cycle, then the exponent’s place in it.',
        hints: [`List the remainders of ${a}¹, ${a}², ${a}³ … on division by ${n} until they repeat.`, `The cycle has length ${L}. Divide ${k} by ${L}.`],
        commonMistakes: ['Dividing the exponent by the divisor instead of by the cycle length.', 'Treating a zero remainder of the exponent as the first place instead of the last.']
      };
    }
  },

  /* ================================ unit digits ================================ */
  {
    id: 'rm-unit-digit-pair',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-unit-digit',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['rm-unit-cycle-f'],
    estimatedSeconds: 70,
    params(rng) {
      const ends = [2, 3, 4, 7, 8, 9];
      const a = rng.int(1, 9) * 10 + rng.pick(ends);
      const b = rng.int(1, 9) * 10 + rng.pick(ends);
      const m = rng.int(11, 199);
      const n = rng.int(11, 199);
      const op = rng.pick(['×', '+']);
      if (a === b) return null;
      return { a, b, m, n, op };
    },
    answer: ({ a, b, m, n, op }) => {
      const ua = modPow(a % 10, ((m - 1) % 4) + 1, 10);
      const ub = modPow(b % 10, ((n - 1) % 4) + 1, 10);
      return op === '×' ? (ua * ub) % 10 : (ua + ub) % 10;
    },
    verify: ({ a, b, m, n, op }, value) => {
      const A = BigInt(a) ** BigInt(m);
      const Bn = BigInt(b) ** BigInt(n);
      return Number((op === '×' ? A * Bn : A + Bn) % 10n) === value;
    },
    render({ a, b, m, n, op }) {
      const ra = ((m - 1) % 4) + 1;
      const rb = ((n - 1) % 4) + 1;
      const ua = modPow(a % 10, ra, 10);
      const ub = modPow(b % 10, rb, 10);
      const combined = op === '×' ? ua * ub : ua + ub;
      return {
        question: `What is the unit digit of ${pw(a, m)} ${op} ${pw(b, n)}?`,
        explanation: `Only unit digits matter, and they repeat every 4 powers. ${m} → place ${ra}: ${a % 10}${pw('', ra)} ends in ${ua}. ${n} → place ${rb}: ${b % 10}${pw('', rb)} ends in ${ub}. ${ua} ${op} ${ub} = ${combined}, so the unit digit is ${combined % 10}.`,
        solutionSteps: [`${m} mod 4 → use the power ${ra}: unit digit ${ua}.`, `${n} mod 4 → use the power ${rb}: unit digit ${ub}.`, `${ua} ${op} ${ub} = ${combined} → ${combined % 10}.`],
        method: 'Reduce each exponent mod 4 (0 means 4), then combine the unit digits.',
        hints: ['Only the unit digit of each base matters.', 'Unit digits repeat every 4 powers; a remainder of 0 means the 4th power.'],
        commonMistakes: ['Treating an exponent that is a multiple of 4 as the power 0.', `${op === '×' ? 'Adding' : 'Multiplying'} the unit digits instead of ${op === '×' ? 'multiplying' : 'adding'} them.`]
      };
    }
  },

  /* ============================== last two digits ============================== */
  {
    id: 'rm-last-two-ends-one',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-last-two',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['rm-last-two-f'],
    estimatedSeconds: 80,
    params(rng) {
      const t = rng.int(1, 9);
      const e = rng.int(12, 99);
      return { t, e, base: 10 * t + 1 };
    },
    answer: ({ t, e }) => 10 * ((t * e) % 10) + 1,
    formatValue: (value) => two(value),
    distractors: ({ t, e }) => [
      { value: 10 * ((t * Math.floor(e / 10)) % 10) + 1, why: 'used the tens digit of the exponent' },
      { value: 10 * ((t + e) % 10) + 1, why: 'added instead of multiplying' },
      { value: 10 * t + 1, why: 'kept the base' },
      { value: 1, why: 'kept only the unit digit' },
      { value: 10 * ((t * e + 1) % 10) + 1, why: 'off by one in the tens digit' }
    ],
    verify: ({ base, e }, value) => modPow(base, e, 100) === value,
    render({ t, e, base }) {
      const tens = (t * e) % 10;
      return {
        question: `What are the last two digits of ${pw(base, e)}?`,
        explanation: `(${10 * t} + 1)${pw('', e)} = 1 + ${e} × ${10 * t} + (multiples of 100). So the unit digit is 1 and the tens digit is the unit digit of ${t} × ${e} = ${t * e}, which is ${tens}. The last two digits are ${two(10 * tens + 1)}.`,
        solutionSteps: [`The base ends in 1, so the power ends in 1.`, `Tens digit: unit digit of ${t} × ${e} = ${t * e} → ${tens}.`, `Last two digits: ${two(10 * tens + 1)}.`],
        method: 'Tens digit = unit digit of (tens digit of base × exponent).',
        hints: ['The last two digits are the remainder on division by 100.', `For a base ending in 1, multiply its tens digit ${t} by the exponent ${e}.`],
        commonMistakes: ['Multiplying by a digit of the exponent instead of the whole exponent.']
      };
    }
  },

  {
    id: 'rm-last-two-powers-of-two',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-last-two',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['rm-sc-twenty-four'],
    estimatedSeconds: 90,
    params(rng) {
      const q = rng.int(2, 15);
      const r = rng.int(0, 9);
      return { q, r, n: 10 * q + r };
    },
    answer: ({ n }) => modPow(2, n, 100),
    verify: ({ q, r }, value) => ((q % 2 ? 24 : 76) * 2 ** r) % 100 === value,
    render({ q, r, n }) {
      const block = q % 2 ? 24 : 76;
      const result = (block * 2 ** r) % 100;
      return {
        question: `What are the last two digits of ${pw(2, n)}? Enter them as a number (for example, 04 as 4).`,
        explanation: `2¹⁰ = 1024 ends in 24, and 24 to an odd power ends in 24, to an even power in 76. ${pw(2, n)} = (2¹⁰)${pw('', q)}${r ? ` × ${pw(2, r)}` : ''}: ${q} is ${q % 2 ? 'odd' : 'even'}, so (2¹⁰)${pw('', q)} ends in ${block}${r ? `, and ${block} × ${2 ** r} = ${fmt(block * 2 ** r)} ends in ${two(result)}` : ''}.`,
        solutionSteps: [`${n} = 10 × ${q}${r ? ` + ${r}` : ''}.`, `(2¹⁰)${pw('', q)} ends in ${block} (${q} is ${q % 2 ? 'odd' : 'even'}).`, r ? `Multiply by ${pw(2, r)} = ${2 ** r}: last two digits ${two(result)}.` : `Last two digits: ${block}.`],
        method: 'Group the power into blocks of 2¹⁰ (ending in 24), then use 24 ↔ 76.',
        hints: ['2¹⁰ = 1024. How many blocks of 10 are in the exponent?', '24 raised to an even power ends in 76, to an odd power in 24.'],
        commonMistakes: ['Mixing up which of 24 and 76 goes with odd and even.', 'Forgetting the leftover power of 2 after the blocks of 10.']
      };
    }
  },

  /* ============================ Fermat, Euler, Wilson ============================ */
  {
    id: 'rm-fermat-power',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-fermat',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['rm-fermat-f'],
    estimatedSeconds: 75,
    params(rng) {
      const p = rng.pick(PRIMES);
      const a = rng.int(2, 30);
      if (a % p === 0) return null;
      const e = rng.int(100, 2100);
      if (e % (p - 1) === 0) return null;
      return { p, a, e };
    },
    answer: ({ p, a, e }) => {
      let r = 1;
      for (let i = 0; i < e % (p - 1); i++) r = (r * a) % p;
      return r;
    },
    verify: ({ p, a, e }, value) => modPow(a, e, p) === value,
    render({ p, a, e }) {
      const small = e % (p - 1);
      const value = modPow(a, small, p);
      return {
        question: `What is the remainder when ${pw(a, e)} is divided by ${p}?`,
        explanation: `${p} is prime and does not divide ${a}, so ${pw(a, p - 1)} leaves 1 (Fermat). ${e} = ${p - 1} × ${Math.floor(e / (p - 1))} + ${small}, so ${pw(a, e)} leaves what ${pw(a, small)} leaves: ${value}.`,
        solutionSteps: [`Fermat: ${pw(a, p - 1)} ≡ 1 (mod ${p}).`, `${e} mod ${p - 1} = ${small}.`, `${pw(a, small)} leaves ${value} on division by ${p}.`],
        method: 'Reduce the exponent mod p − 1.',
        hints: [`${p} is prime. Which power of ${a} is sure to leave 1?`, `Divide the exponent ${e} by ${p - 1} and keep the remainder.`],
        commonMistakes: [`Reducing the exponent mod ${p} instead of mod ${p - 1}.`]
      };
    }
  },

  {
    id: 'rm-totient',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-euler',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['rm-euler-f'],
    estimatedSeconds: 60,
    params(rng) {
      const [p, q] = rng.shuffle([2, 3, 5, 7, 11]).slice(0, 2).sort((x, y) => x - y);
      const n = p ** rng.int(1, 4) * q ** rng.int(1, 2);
      if (n > 600 || n < 20) return null;
      return { n };
    },
    answer: ({ n }) => totient(n),
    verify: ({ n }, value) => {
      let count = 0;
      for (let k = 1; k <= n; k++) if (gcd(k, n) === 1) count++;
      return count === value;
    },
    render({ n }) {
      const primes = primeFactors(n).map(([p]) => p);
      const power = primeFactors(n).map(([p, k]) => (k > 1 ? pw(p, k) : String(p))).join(' × ');
      return {
        question: `How many whole numbers from 1 to ${n} have no common factor with ${n} other than 1?`,
        explanation: `This is φ(${n}). ${n} = ${power}, so φ(${n}) = ${n} × ${primes.map((p) => `(1 − 1/${p})`).join(' × ')} = ${totient(n)}.`,
        solutionSteps: [`${n} = ${power}; distinct primes ${primes.join(' and ')}.`, `φ(${n}) = ${n} × ${primes.map((p) => `${p - 1}/${p}`).join(' × ')}.`, `= ${totient(n)}.`],
        method: 'Multiply n by (1 − 1/p) for each distinct prime p.',
        hints: [`Factorise ${n} into primes.`, 'Use each distinct prime once, whatever its power.'],
        commonMistakes: ['Using a prime once for every power it appears with.', 'Subtracting the number of prime factors from n.']
      };
    }
  },

  {
    id: 'rm-euler-power',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-euler',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['rm-euler-f'],
    estimatedSeconds: 85,
    params(rng) {
      const n = rng.pick([10, 12, 14, 15, 18, 20, 21, 22, 24, 26, 28, 33, 35, 36, 40, 45]);
      const bases = [];
      for (let b = 3; b <= 40; b++) if (gcd(b, n) === 1 && b % n > 1) bases.push(b);
      const a = rng.pick(bases);
      const e = rng.int(50, 999);
      if (e % totient(n) === 0) return null;
      return { n, a, e };
    },
    answer: ({ n, a, e }) => {
      let r = 1;
      for (let i = 0; i < e % totient(n); i++) r = (r * a) % n;
      return r;
    },
    formatValue: (value) => fmt(value),
    distractors: ({ n, a, e }) => [
      { value: modPow(a, e % (n - 1) || n - 1, n), why: 'used n − 1 as if n were prime' },
      { value: modPow(a, e % n || n, n), why: 'reduced the exponent mod n' },
      { value: 1, why: 'assumed the power leaves 1' },
      { value: a % n, why: 'gave the base' },
      { value: n - 1, why: 'assumed −1' },
      { value: modPow(a, (e % totient(n)) + 1, n), why: 'one power too many' },
      { value: modPow(a, Math.max(1, (e % totient(n)) - 1), n), why: 'one power too few' },
      { value: 0, why: 'assumed divisible' }
    ],
    verify: ({ n, a, e }, value) => modPow(a, e, n) === value,
    render({ n, a, e }) {
      const phi = totient(n);
      const small = e % phi;
      const value = modPow(a, small, n);
      const primes = primeFactors(n).map(([p]) => p);
      return {
        question: `What is the remainder when ${pw(a, e)} is divided by ${n}?`,
        explanation: `${a} and ${n} share no factor, and φ(${n}) = ${n} × ${primes.map((p) => `${p - 1}/${p}`).join(' × ')} = ${phi}, so ${pw(a, phi)} leaves 1 (Euler). ${e} = ${phi} × ${Math.floor(e / phi)} + ${small}, so the remainder is that of ${pw(a, small)}: ${value}.`,
        solutionSteps: [`φ(${n}) = ${phi}.`, `${e} mod ${phi} = ${small}.`, `${pw(a, small)} leaves ${value} on division by ${n}.`],
        method: 'Reduce the exponent mod φ(n).',
        hints: [`${n} is not prime, so use Euler’s theorem: find φ(${n}).`, `φ(${n}) = ${phi}. Reduce ${e} mod ${phi}.`],
        commonMistakes: [`Using ${n - 1} as if ${n} were prime.`]
      };
    }
  },

  {
    id: 'rm-wilson-factorial',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-wilson',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rm-wilson-f'],
    estimatedSeconds: 55,
    params(rng) {
      const p = rng.pick([7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]);
      const j = rng.pick([1, 2, 3]);
      return { p, j };
    },
    answer: ({ p, j }) => (j === 1 ? p - 1 : j === 2 ? 1 : (p - 1) / 2),
    formatValue: (value) => fmt(value),
    distractors: ({ p }) => [
      { value: 0, why: 'assumed the factorial is divisible by p' },
      { value: p - 1, why: 'used (p − 1)! for every case' },
      { value: 1, why: 'used (p − 2)! for every case' },
      { value: (p + 1) / 2, why: 'halved the wrong way' },
      { value: p - 2, why: 'took the last factor' }
    ],
    verify: ({ p, j }, value) => isPrime(p) && Number(factorialBig(p - j) % BigInt(p)) === value,
    render({ p, j }) {
      const n = p - j;
      const value = j === 1 ? p - 1 : j === 2 ? 1 : (p - 1) / 2;
      const steps = [`${p} is prime, so (${p} − 1)! = ${p - 1}! leaves −1 (Wilson).`];
      if (j >= 2) steps.push(`${p - 1}! = ${p - 1} × ${p - 2}!, and ${p - 1} ≡ −1, so ${p - 2}! leaves 1.`);
      if (j === 3) steps.push(`${p - 2}! = ${p - 2} × ${p - 3}!, and ${p - 2} ≡ −2, so ${p - 3}! leaves the number x with −2x ≡ 1: x = (${p} − 1)/2 = ${value}.`);
      else steps.push(`Remainder: ${value}.`);
      return {
        question: `What is the remainder when ${n}! is divided by ${p}?`,
        explanation: `${steps.join(' ')}${j === 3 ? ` Check: −2 × ${value} = −${p - 1} ≡ 1.` : ''}`,
        solutionSteps: steps,
        method: 'Start from Wilson’s theorem for (p − 1)! and peel off factors.',
        hints: [`Is ${p} prime? Then (${p} − 1)! leaves −1.`, j === 1 ? `${n}! is exactly (${p} − 1)!.` : `Write ${p - 1}! in terms of ${n}! and treat ${p - 1} as −1.`],
        commonMistakes: [`Answering 0: ${n}! contains every number up to ${n}, but not the prime ${p}.`]
      };
    }
  },

  /* ============================ finding the number ============================ */
  {
    id: 'rm-crt-smallest',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-crt',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['rm-crt-f'],
    estimatedSeconds: 75,
    params(rng) {
      const a = rng.int(3, 11);
      const b = rng.int(a + 1, 13);
      if (gcd(a, b) !== 1) return null;
      const r1 = rng.int(0, a - 1);
      const r2 = rng.int(0, b - 1);
      // Same remainder or same shortfall has its own shortcut (HCF and LCM).
      if (r1 === r2 || a - r1 === b - r2) return null;
      return { a, b, r1, r2 };
    },
    answer: ({ a, b, r1, r2 }) => r2 + b * mod((r1 - r2) * inverse(b, a), a),
    verify: ({ a, b, r1, r2 }, value) => {
      for (let N = 0; N <= a * b; N++) if (N % a === r1 && N % b === r2) return N === value;
      return false;
    },
    render({ a, b, r1, r2 }) {
      const N = r2 + b * mod((r1 - r2) * inverse(b, a), a);
      const list = [];
      for (let x = r2; x <= N; x += b) list.push(x);
      return {
        question: `What is the smallest whole number that leaves remainder ${r1} when divided by ${a} and remainder ${r2} when divided by ${b}?`,
        explanation: `List the numbers that leave ${r2} on division by ${b}: ${list.join(', ')}. Test each on division by ${a}: the first that leaves ${r1} is ${N}. (All solutions: ${N} + ${a * b}t.)`,
        solutionSteps: [`Candidates for ${b}: ${list.join(', ')}.`, `Remainders on ${a}: ${list.map((x) => x % a).join(', ')}.`, `First match: ${N}.`],
        method: 'List for the larger divisor, test against the smaller.',
        hints: [`Start with the numbers that leave ${r2} on division by ${b}.`, `Divide each by ${a} until the remainder is ${r1}.`],
        commonMistakes: ['Adding the remainders or the divisors.', `Testing numbers for ${a} first, which means a longer list.`]
      };
    }
  },

  {
    id: 'rm-crt-count',
    version: 1,
    topicId: 'remainders',
    conceptId: 'rm-crt',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['rm-crt-f', 'rm-sc-count-range'],
    estimatedSeconds: 110,
    params(rng) {
      const a = rng.int(3, 9);
      const b = rng.int(a + 1, 12);
      if (gcd(a, b) !== 1) return null;
      const r1 = rng.int(0, a - 1);
      const r2 = rng.int(0, b - 1);
      const [lo, hi, label] = rng.pick([[10, 99, 'two-digit'], [100, 999, 'three-digit'], [100, 500, 'from 100 to 500']]);
      return { a, b, r1, r2, lo, hi, label };
    },
    answer: ({ a, b, r1, r2, lo, hi }) => {
      const L = a * b;
      const N0 = r2 + b * mod((r1 - r2) * inverse(b, a), a);
      const first = N0 + Math.ceil(Math.max(0, lo - N0) / L) * L;
      return first > hi ? 0 : Math.floor((hi - first) / L) + 1;
    },
    verify: ({ a, b, r1, r2, lo, hi }, value) => {
      let count = 0;
      for (let N = lo; N <= hi; N++) if (N % a === r1 && N % b === r2) count++;
      return count === value && value > 0;
    },
    render({ a, b, r1, r2, lo, hi, label }) {
      const L = a * b;
      const N0 = r2 + b * mod((r1 - r2) * inverse(b, a), a);
      const first = N0 + Math.ceil(Math.max(0, lo - N0) / L) * L;
      const count = Math.floor((hi - first) / L) + 1;
      const last = first + (count - 1) * L;
      const range = label.startsWith('from') ? `numbers ${label}` : `${label} numbers`;
      return {
        question: `How many ${range} leave remainder ${r1} when divided by ${a} and remainder ${r2} when divided by ${b}?`,
        explanation: `The smallest such number is ${N0}, and the solutions repeat every LCM(${a}, ${b}) = ${L}. In the range ${lo} to ${hi} they run from ${first} to ${last} in steps of ${L}: (${last} − ${first}) ÷ ${L} + 1 = ${count}.`,
        solutionSteps: [`Smallest solution: ${N0}.`, `Solutions: ${N0} + ${L}t.`, `First in range ${first}, last ${last}.`, `Count = ${count}.`],
        method: 'First solution, then an arithmetic progression with difference LCM.',
        hints: ['Find one number that meets both conditions.', `Then step by ${L} and count the terms between ${lo} and ${hi}.`],
        commonMistakes: [`Counting from a solution below ${lo}.`, 'Stepping by one of the divisors instead of the LCM.']
      };
    }
  }
];
