/**
 * Speed maths: friendly multipliers, × 111 and × 99, the base method (near 100
 * and 1000, above, below and mixed), cross multiplication, percentage–fraction
 * swaps, the nines check and quick division. Each answer is worked by the
 * method taught and checked by plain multiplication (or the reverse).
 */

import { fmt, nearlyEqual } from '../core.js';
import { baseMethod, crossMultiply, digitalRoot } from '../../utils/numberTheory.js';

/** n × 111 by the sliding window: each column adds up to three neighbouring digits. */
function times111(n) {
  const digits = String(n).split('').map(Number);
  const padded = [0, 0, ...digits, 0, 0];
  const columns = [];
  for (let i = 0; i < digits.length + 2; i++) columns.push(padded[i] + padded[i + 1] + padded[i + 2]);
  let carry = 0;
  const out = [];
  for (let i = columns.length - 1; i >= 0; i--) {
    const total = columns[i] + carry;
    out.unshift(total % 10);
    carry = Math.floor(total / 10);
  }
  if (carry) out.unshift(carry);
  return Number(out.join(''));
}

const FRACTIONS = [
  { text: '12.5%', num: 1, den: 8, confuse: 7 },
  { text: '37.5%', num: 3, den: 8, confuse: 7 },
  { text: '62.5%', num: 5, den: 8, confuse: 7 },
  { text: '87.5%', num: 7, den: 8, confuse: 9 },
  { text: '16⅔%', num: 1, den: 6, confuse: 5 },
  { text: '83⅓%', num: 5, den: 6, confuse: 5 },
  { text: '14 2/7%', num: 1, den: 7, confuse: 8 },
  { text: '28 4/7%', num: 2, den: 7, confuse: 8 },
  { text: '11 1/9%', num: 1, den: 9, confuse: 11 },
  { text: '9 1/11%', num: 1, den: 11, confuse: 9 },
  { text: '6¼%', num: 1, den: 16, confuse: 12 },
  { text: '8⅓%', num: 1, den: 12, confuse: 8 },
  { text: '18¾%', num: 3, den: 16, confuse: 12 }
];

export const speedMathsTemplates = [
  /* =========================== friendly multipliers =========================== */
  {
    id: 'spd-times-friendly',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-friendly',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['spd-friendly-f'],
    estimatedSeconds: 25,
    params(rng) {
      const [m, div, power] = rng.pick([[5, 2, 10], [25, 4, 100], [50, 2, 100], [125, 8, 1000]]);
      const n = div * rng.int(13, 499);
      return { m, div, power, n };
    },
    answer: ({ n, m }) => n * m,
    verify: ({ n, div, power }, value) => (n / div) * power === value,
    render({ m, div, power, n }) {
      return {
        question: `Find ${fmt(n)} × ${m} without long multiplication.`,
        explanation: `${m} = ${fmt(power)} ÷ ${div}. ${fmt(n)} ÷ ${div} = ${fmt(n / div)}, and × ${fmt(power)} gives ${fmt(n * m)}.`,
        solutionSteps: [`${m} = ${fmt(power)} ÷ ${div}.`, `${fmt(n)} ÷ ${div} = ${fmt(n / div)}.`, `× ${fmt(power)} = ${fmt(n * m)}.`],
        method: `× ${m} = × ${fmt(power)} ÷ ${div}.`,
        hints: [`${m} is ${fmt(power)} divided by ${div}.`, `Divide ${fmt(n)} by ${div} first; it divides exactly.`],
        commonMistakes: [`Dividing by the wrong number (× 25 is ÷ 4, × 125 is ÷ 8).`]
      };
    }
  },

  /* ============================ × 111, × 99, × 999 ============================ */
  {
    id: 'spd-times-111',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-eleven',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['spd-eleven-f'],
    estimatedSeconds: 40,
    params(rng) {
      const n = rng.chance(0.4) ? rng.int(12, 99) : rng.int(102, 899);
      return { n };
    },
    answer: ({ n }) => times111(n),
    verify: ({ n }, value) => n * 111 === value,
    render({ n }) {
      const d = String(n).split('').map(Number);
      const padded = [0, 0, ...d, 0, 0];
      const cols = [];
      for (let i = 0; i < d.length + 2; i++) cols.push(padded[i] + padded[i + 1] + padded[i + 2]);
      return {
        question: `Find ${n} × 111.`,
        explanation: `111 = 100 + 10 + 1, so each column adds up to three neighbouring digits of ${n}: ${cols.join(' | ')}. Carrying from the right gives ${fmt(n * 111)}.`,
        solutionSteps: [`Columns (sliding window of three digits): ${cols.join(' | ')}.`, `Carry from the right where a column passes 9.`, `${n} × 111 = ${fmt(n * 111)}.`],
        method: 'Sliding window of digit sums.',
        hints: ['Each digit lands in its own place and the two places above it.', `Write the columns: first digit, sums of neighbours, last digit.`],
        commonMistakes: ['Using a window of two digits (the × 11 rule).', 'Forgetting to carry.']
      };
    }
  },

  {
    id: 'spd-times-99',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-eleven',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['spd-sc-ninety-nine'],
    estimatedSeconds: 30,
    params(rng) {
      const m = rng.pick([99, 999]);
      const n = rng.int(23, m === 99 ? 9999 : 999);
      return { m, n };
    },
    answer: ({ m, n }) => n * (m + 1) - n,
    formatValue: (value) => fmt(value),
    distractors: ({ m, n }) => [
      { value: n * (m + 1) - 1, why: 'subtracted 1 instead of n' },
      { value: n * (m + 1) + n, why: 'added n' },
      { value: n * (m + 1) - 10 * n, why: 'subtracted 10n' },
      { value: n * (m + 1) - m, why: 'subtracted the multiplier' }
    ],
    verify: ({ m, n }, value) => n * m === value,
    render({ m, n }) {
      return {
        question: `What is ${fmt(n)} × ${m}?`,
        explanation: `${m} = ${fmt(m + 1)} − 1, so ${fmt(n)} × ${m} = ${fmt(n * (m + 1))} − ${fmt(n)} = ${fmt(n * m)}.`,
        solutionSteps: [`${fmt(n)} × ${fmt(m + 1)} = ${fmt(n * (m + 1))}.`, `Subtract ${fmt(n)}.`, `= ${fmt(n * m)}.`],
        method: `× ${m} = × ${fmt(m + 1)} − the number.`,
        hints: [`${m} is one less than ${fmt(m + 1)}.`, `Multiply by ${fmt(m + 1)}, then take away one ${fmt(n)}.`],
        commonMistakes: ['Subtracting 1 instead of the number.']
      };
    }
  },

  /* ================================ base method ================================ */
  {
    id: 'spd-base-same-side',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-base',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['spd-base-f'],
    estimatedSeconds: 30,
    params(rng) {
      const above = rng.chance(0.4);
      const x = above ? rng.int(101, 115) : rng.int(85, 99);
      const y = above ? rng.int(101, 115) : rng.int(85, 99);
      if (x === y) return null;
      return { x, y, above };
    },
    answer: ({ x, y }) => baseMethod(x, y, 100).product,
    formatValue: (value) => fmt(value),
    distractors: ({ x, y }) => {
      const { left, right } = baseMethod(x, y, 100);
      return [
        { value: left * 100 + (right % 100), why: 'dropped the carry from the right part' },
        { value: right < 10 ? left * 10 + right : left * 1000 + right, why: 'wrote the right part with the wrong number of digits' },
        { value: left * 100 - right, why: 'subtracted the right part' },
        { value: left * 100, why: 'forgot the right part' }
      ];
    },
    verify: ({ x, y }, value) => x * y === value,
    render({ x, y, above }) {
      const { dx, dy, left, right } = baseMethod(x, y, 100);
      const word = above ? 'surpluses' : 'deficits';
      return {
        question: `Use the base method to find ${x} × ${y}.`,
        explanation: `The ${word} from 100 are ${Math.abs(dx)} and ${Math.abs(dy)}. Left part: ${x} ${above ? '+' : '−'} ${Math.abs(dy)} = ${left}. Right part: ${Math.abs(dx)} × ${Math.abs(dy)} = ${right}${right >= 100 ? `, which has three digits, so carry ${Math.floor(right / 100)}` : ''}. So ${x} × ${y} = ${fmt(x * y)}.`,
        solutionSteps: [`${word[0].toUpperCase() + word.slice(1)}: ${Math.abs(dx)} and ${Math.abs(dy)}.`, `Left: ${left}; right: ${right < 10 ? `0${right}` : right}.`, `Combine${right >= 100 ? ' with the carry' : ''}: ${fmt(x * y)}.`],
        method: 'Cross-add or cross-subtract, then multiply the gaps.',
        hints: ['How far is each number from 100?', `${above ? 'Add' : 'Subtract'} one gap ${above ? 'to' : 'from'} the other number; multiply the gaps for the last two digits.`],
        commonMistakes: ['Writing a one-digit right part without its leading zero.', 'Not carrying a three-digit right part.']
      };
    }
  },

  {
    id: 'spd-base-mixed',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-base',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['spd-sc-mixed-base'],
    estimatedSeconds: 45,
    params(rng) {
      const x = rng.int(102, 118);
      const y = rng.int(82, 98);
      return { x, y };
    },
    answer: ({ x, y }) => baseMethod(x, y, 100).product,
    verify: ({ x, y }, value) => x * y === value,
    render({ x, y }) {
      const { dx, dy, left, right } = baseMethod(x, y, 100);
      const borrow = Math.ceil(-right / 100);
      return {
        question: `Find ${x} × ${y} by the base method.`,
        explanation: `${x} is ${dx} above 100 and ${y} is ${-dy} below. Left part: ${x} − ${-dy} = ${left}. Right part: ${dx} × (−${-dy}) = −${-right}. A negative right part means ${left} × 100 − ${-right}: borrow ${borrow} from the left to get ${left - borrow} | ${String(100 * borrow + right).padStart(2, '0')} = ${fmt(x * y)}.`,
        solutionSteps: [`Left: ${x} − ${-dy} = ${left}.`, `Right: ${dx} × (−${-dy}) = −${-right}.`, `${fmt(left * 100)} − ${-right} = ${fmt(x * y)}.`],
        method: 'Mixed base: the right part is negative, so borrow from the left.',
        hints: ['One number is above 100 and the other below, so the gaps have opposite signs.', `The right part is negative: subtract ${-right} from ${left} hundreds.`],
        commonMistakes: [`Ignoring the sign and adding ${-right}.`]
      };
    }
  },

  {
    id: 'spd-base-thousand',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-base',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['spd-base-f'],
    estimatedSeconds: 50,
    params(rng) {
      const x = rng.int(975, 1025);
      const y = rng.int(975, 1025);
      if (x === 1000 || y === 1000 || (x - 1000) * (y - 1000) <= 0) return null;
      return { x, y };
    },
    answer: ({ x, y }) => baseMethod(x, y, 1000).product,
    verify: ({ x, y }, value) => x * y === value,
    render({ x, y }) {
      const { dx, dy, left, right } = baseMethod(x, y, 1000);
      const above = dx > 0;
      return {
        question: `Find ${fmt(x)} × ${fmt(y)} using the base 1,000.`,
        explanation: `The ${above ? 'surpluses' : 'deficits'} from 1,000 are ${Math.abs(dx)} and ${Math.abs(dy)}. Left part: ${fmt(x)} ${above ? '+' : '−'} ${Math.abs(dy)} = ${fmt(left)}. Right part: ${Math.abs(dx)} × ${Math.abs(dy)} = ${right}, written with three digits as ${String(right).padStart(3, '0')}. So the product is ${fmt(x * y)}.`,
        solutionSteps: [`Gaps: ${Math.abs(dx)} and ${Math.abs(dy)}.`, `Left: ${fmt(left)}.`, `Right: ${String(right).padStart(3, '0')} → ${fmt(x * y)}.`],
        method: 'Base 1,000: the right part has three digits.',
        hints: ['With base 1,000 the right part must have three digits.', `Left part: ${fmt(x)} ${above ? '+' : '−'} ${Math.abs(dy)}.`],
        commonMistakes: ['Writing the right part with two digits as for base 100.']
      };
    }
  },

  /* ============================ cross multiplication ============================ */
  {
    id: 'spd-cross-two-digit',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-cross',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['spd-cross-f'],
    estimatedSeconds: 45,
    params(rng) {
      const x = rng.int(21, 98);
      const y = rng.int(21, 98);
      if (x % 10 === 0 || y % 10 === 0 || x === y) return null;
      return { x, y };
    },
    answer: ({ x, y }) => crossMultiply(x, y).product,
    verify: ({ x, y }, value) => x * y === value,
    render({ x, y }) {
      const { columns } = crossMultiply(x, y);
      const [a, b, c, d] = [Math.floor(x / 10), x % 10, Math.floor(y / 10), y % 10];
      return {
        question: `Find ${x} × ${y} by cross multiplication.`,
        explanation: `Units: ${b} × ${d} = ${columns[2]}. Tens: ${a} × ${d} + ${b} × ${c} = ${columns[1]}. Hundreds: ${a} × ${c} = ${columns[0]}. Carrying from the right turns ${columns.join(' | ')} into ${fmt(x * y)}.`,
        solutionSteps: [`Columns: ${a}×${c} | ${a}×${d} + ${b}×${c} | ${b}×${d} = ${columns.join(' | ')}.`, 'Carry leftwards, one column at a time.', `= ${fmt(x * y)}.`],
        method: 'Vertically and crosswise.',
        hints: [`Units first: ${b} × ${d}.`, `Tens: the two cross products ${a} × ${d} and ${b} × ${c}, plus the carry.`],
        commonMistakes: ['Forgetting to add a carry into the next column.']
      };
    }
  },

  /* ======================= percentages as fractions ======================= */
  {
    id: 'spd-percent-fraction',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-fraction',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['spd-fraction-f'],
    estimatedSeconds: 35,
    params(rng) {
      const f = rng.pick(FRACTIONS);
      const N = f.den * rng.int(12, 300);
      if (N < 100) return null;
      return { f, N };
    },
    answer: ({ f, N }) => (N / f.den) * f.num,
    formatValue: (value) => fmt(value),
    distractors: ({ f, N }) => [
      { value: Math.round(((N * f.num) / f.confuse) * 100) / 100, why: 'used the wrong fraction' },
      { value: (N / f.den) * (f.num + 1), why: 'one part too many' },
      { value: f.num > 1 ? (N / f.den) * (f.num - 1) : (N / f.den) * 2, why: 'one part out' },
      { value: (N / f.den) * f.num * 10, why: 'misplaced the decimal point' }
    ],
    verify: ({ f, N }, value) => {
      const pct = (f.num / f.den) * 100;
      return nearlyEqual((N * pct) / 100, value);
    },
    render({ f, N }) {
      const part = N / f.den;
      return {
        question: `What is ${f.text} of ${fmt(N)}?`,
        explanation: `${f.text} = ${f.num}/${f.den}. ${fmt(N)} ÷ ${f.den} = ${fmt(part)}${f.num > 1 ? `, and × ${f.num} gives ${fmt(part * f.num)}` : ''}.`,
        solutionSteps: [`${f.text} = ${f.num}/${f.den}.`, `${fmt(N)} ÷ ${f.den} = ${fmt(part)}.`, f.num > 1 ? `× ${f.num} = ${fmt(part * f.num)}.` : `Answer: ${fmt(part)}.`],
        method: 'Replace the percentage by its fraction.',
        hints: [`Which fraction is ${f.text}?`, `Divide ${fmt(N)} by ${f.den}.`],
        commonMistakes: [`Confusing 1/${f.den} with 1/${f.confuse}.`]
      };
    }
  },

  {
    id: 'spd-percent-swap',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-fraction',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['spd-sc-swap'],
    estimatedSeconds: 30,
    answerDecimals: 2,
    params(rng) {
      const [y, div, word] = rng.pick([[25, 4, 'a quarter'], [50, 2, 'half'], [20, 5, 'a fifth'], [75, 4, 'three quarters'], [40, 5, 'two fifths']]);
      const x = div * rng.int(3, 24);
      if (x === y || x >= 100) return null;
      return { x, y, word };
    },
    answer: ({ x, y }) => (x * y) / 100,
    verify: ({ x, y }, value) => nearlyEqual((y / 100) * x, value),
    render({ x, y, word }) {
      return {
        question: `Find ${x}% of ${y}.`,
        explanation: `x% of y = y% of x, so ${x}% of ${y} = ${y}% of ${x}, which is ${word} of ${x}: ${fmt((x * y) / 100)}.`,
        solutionSteps: [`Swap: ${x}% of ${y} = ${y}% of ${x}.`, `${y}% is ${word}.`, `${word[0].toUpperCase() + word.slice(1)} of ${x} = ${fmt((x * y) / 100)}.`],
        method: 'Swap the percentage and the number.',
        hints: ['x% of y and y% of x are always equal.', `${y}% is an easy fraction.`],
        commonMistakes: ['Swapping only one number and changing the value.']
      };
    }
  },

  /* ============================== casting out nines ============================== */
  {
    id: 'spd-nines-check',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-check',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['spd-check-f'],
    estimatedSeconds: 60,
    params(rng) {
      const A = rng.int(112, 989);
      const B = rng.int(13, 98);
      const P = A * B;
      const shifts = rng.shuffle([1, 2, 3, -1, -2, 4]).slice(0, 4);
      const places = shifts.map(() => 10 ** rng.int(1, 3));
      const wrong = shifts.map((s, i) => P + s * places[i]);
      // Every wrong option must fail the check, and none may repeat.
      if (wrong.some((w) => w <= 0 || digitalRoot(w) === digitalRoot(P))) return null;
      if (new Set(wrong).size !== wrong.length) return null;
      return { A, B, P, wrong };
    },
    answer: ({ P }) => P,
    formatValue: (value) => fmt(value),
    distractors: ({ wrong }) => wrong.map((value) => ({ value, why: 'fails the nines check' })),
    verify: ({ A, B }, value) => A * B === value && digitalRoot(digitalRoot(A) * digitalRoot(B)) === digitalRoot(value),
    render({ A, B, P }) {
      const ra = digitalRoot(A);
      const rb = digitalRoot(B);
      const target = digitalRoot(ra * rb);
      return {
        question: `Only one of these can be the value of ${A} × ${B}. Use digit sums to find it.`,
        explanation: `${A} → ${ra} and ${B} → ${rb}; ${ra} × ${rb} = ${ra * rb} → ${target}. Only ${fmt(P)} reduces to ${target}; every other option fails the check, so it cannot be right.`,
        solutionSteps: [`Digital roots: ${A} → ${ra}, ${B} → ${rb}.`, `${ra} × ${rb} = ${ra * rb} → ${target}.`, `Only ${fmt(P)} has digital root ${target}.`],
        method: 'Casting out nines.',
        hints: ['Add the digits of each number until one digit is left.', 'Multiply the two digital roots and reduce; compare with each option.'],
        commonMistakes: ['Adding the digital roots for a product instead of multiplying them.']
      };
    }
  },

  /* ================================ quick division ================================ */
  {
    id: 'spd-divide-friendly',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-division',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['spd-division-f'],
    estimatedSeconds: 30,
    answerDecimals: 3,
    params(rng) {
      const [d, mult, power] = rng.pick([[5, 2, 10], [25, 4, 100], [125, 8, 1000]]);
      const N = rng.int(120, 9999);
      return { d, mult, power, N };
    },
    answer: ({ N, mult, power }) => (N * mult) / power,
    verify: ({ N, d }, value) => nearlyEqual(value * d, N),
    render({ d, mult, power, N }) {
      return {
        question: `Find ${fmt(N)} ÷ ${d}.`,
        explanation: `÷ ${d} is × ${mult} ÷ ${fmt(power)}. ${fmt(N)} × ${mult} = ${fmt(N * mult)}, and ÷ ${fmt(power)} gives ${fmt((N * mult) / power, 3)}.`,
        solutionSteps: [`${fmt(N)} × ${mult} = ${fmt(N * mult)}.`, `÷ ${fmt(power)} = ${fmt((N * mult) / power, 3)}.`],
        method: `÷ ${d} = × ${mult} ÷ ${fmt(power)}.`,
        hints: [`How many ${d}s make ${fmt(power)}?`, `Multiply by ${mult}, then move the decimal point ${String(power).length - 1} place${power > 10 ? 's' : ''} left.`],
        commonMistakes: [`Dividing by ${mult} instead of multiplying.`, 'Moving the decimal point the wrong number of places.']
      };
    }
  },

  {
    id: 'spd-divide-stages',
    version: 1,
    topicId: 'speed-maths',
    conceptId: 'spd-division',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['spd-sc-split-divisor'],
    estimatedSeconds: 50,
    params(rng) {
      const [D, p, q] = rng.pick([[12, 4, 3], [16, 8, 2], [18, 9, 2], [24, 8, 3], [32, 8, 4], [36, 4, 9], [44, 4, 11], [45, 9, 5], [48, 8, 6], [56, 8, 7], [63, 9, 7], [72, 8, 9], [88, 8, 11]]);
      const quotient = rng.int(104, 999);
      return { D, p, q, quotient, N: D * quotient };
    },
    answer: ({ quotient }) => quotient,
    verify: ({ N, p, q }, value) => N % p === 0 && (N / p) % q === 0 && N / p / q === value,
    render({ D, p, q, N, quotient }) {
      return {
        question: `Find ${fmt(N)} ÷ ${D} by dividing in stages.`,
        explanation: `${D} = ${p} × ${q}. ${fmt(N)} ÷ ${p} = ${fmt(N / p)}, then ÷ ${q} = ${quotient}. Check: ${quotient} × ${D} = ${fmt(N)}.`,
        solutionSteps: [`${D} = ${p} × ${q}.`, `${fmt(N)} ÷ ${p} = ${fmt(N / p)}.`, `${fmt(N / p)} ÷ ${q} = ${quotient}.`],
        method: 'Split the divisor into easy factors.',
        hints: [`Write ${D} as a product of two small numbers.`, `Divide by ${p} first, then by ${q}.`],
        commonMistakes: [`Splitting ${D} into factors that do not multiply back to ${D}.`]
      };
    }
  }
];
