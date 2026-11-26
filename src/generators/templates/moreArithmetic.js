/** Averages, interest, profit, ratio, ages and boats: templates for concepts that had no generator (step 9 of Phase D). */

import { fmt, format, gcd, lcm, nearlyEqual, ratioText, reduceRatio, fractionText } from '../core.js';

/* -------------------------------- helpers -------------------------------- */

const NAMES = ['Ravi', 'Sita', 'Anil', 'Meena', 'Farhan', 'Priya', 'Karan', 'Divya', 'Arjun', 'Nisha', 'Kavya', 'Rahul'];
const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

function ordinal(n) {
  const tail = n % 100;
  if (tail >= 11 && tail <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

function timesWord(k) {
  return k === 2 ? 'twice' : `${k} times`;
}

function parseRatio(text) {
  return String(text)
    .split(':')
    .map((part) => Number(part.trim()));
}

function parseFraction(text) {
  const [p, q] = String(text).split('/').map(Number);
  return [p, q === undefined ? 1 : q];
}

/** Two different names. */
function twoNames(rng) {
  const first = rng.pick(NAMES);
  let second = rng.pick(NAMES);
  while (second === first) second = rng.pick(NAMES);
  return [first, second];
}

/** A random multiple of `base` inside [min, max], or null if there is none. */
function multipleIn(rng, base, min, max) {
  const lo = Math.ceil(min / base);
  const hi = Math.floor(max / base);
  if (lo > hi) return null;
  return base * rng.int(lo, hi);
}

/** Smallest P for which P × num ÷ den is a whole number. */
function cleanBase(num, den) {
  return den / gcd(den, num);
}

/** Year-by-year compounding — deliberately not the closed-form formula. */
function compoundBalance(P, R, years) {
  let balance = P;
  for (let year = 0; year < years; year++) balance += (balance * R) / 100;
  return balance;
}

/** Half-yearly and quarterly cases whose interest is a whole number for a sensible principal. */
const CI_FREQUENCY_CASES = [];
for (const k of [2, 4]) {
  for (const R of [4, 8, 10, 12, 16, 20]) {
    const r = R / k;
    if (!Number.isInteger(r)) continue;
    for (const n of [2, 3, 4]) {
      const base = cleanBase((100 + r) ** n, 100 ** n);
      if (base <= 20000) CI_FREQUENCY_CASES.push({ k, R, r, n, base });
    }
  }
}

/** Article-count pairs (x sold for the cost of y) whose profit or loss % is a whole number. */
const ARTICLE_PAIRS = [];
for (let x = 4; x <= 30; x++) {
  for (let y = Math.max(2, x - 8); y <= x + 10; y++) {
    if (y === x) continue;
    const pct = (100 * (y - x)) / x;
    if (Number.isInteger(pct) && Math.abs(pct) <= 50) ARTICLE_PAIRS.push([x, y]);
  }
}

/** Coprime pairs a < b with both terms at most 9. */
const COPRIME_PAIRS = [];
for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) if (gcd(a, b) === 1) COPRIME_PAIRS.push([a, b]);

/** Fractions a/b in lowest terms with 2 ≤ b ≤ 9 and a ≤ 2b. */
const SIMPLE_FRACTIONS = [];
for (let b = 2; b <= 9; b++) for (let a = 1; a <= 2 * b; a++) if (gcd(a, b) === 1) SIMPLE_FRACTIONS.push([a, b]);

/* ------------------ direct / inverse identification bank ------------------ */

// Each scenario carries a model y(x) so the classification can be checked numerically.
const PROPORTION_BANK = {
  direct: [
    { text: 'The cost of pens and the number of pens bought at a fixed price', model: (x) => 12 * x },
    { text: 'The distance covered and the time taken at a fixed speed', model: (x) => 45 * x },
    { text: 'The simple interest earned and the time, at a fixed principal and rate', model: (x) => 80 * x },
    { text: 'The wages earned and the days worked at a fixed daily wage', model: (x) => 600 * x },
    { text: 'The weight of a stack of identical books and the number of books', model: (x) => 0.4 * x },
    { text: 'The perimeter of a square and the length of its side', model: (x) => 4 * x },
    { text: 'The petrol used and the distance driven at a fixed mileage', model: (x) => x / 15 },
    { text: 'The flour needed and the number of identical cakes baked', model: (x) => 250 * x }
  ],
  inverse: [
    { text: 'The speed and the time taken to cover a fixed distance', model: (x) => 120 / x },
    { text: 'The number of workers and the days needed to finish a fixed job', model: (x) => 60 / x },
    { text: 'The number of identical pipes and the time they take to fill a tank', model: (x) => 24 / x },
    { text: "The number of people sharing a fixed bill and each person's share", model: (x) => 1800 / x },
    { text: 'The length and the width of rectangles with a fixed area', model: (x) => 48 / x },
    { text: 'The number of animals and the days a fixed stock of fodder lasts', model: (x) => 900 / x },
    { text: 'The price per kg and the kilograms bought with a fixed budget', model: (x) => 500 / x }
  ],
  neither: [
    { text: 'The area of a square and the length of its side', model: (x) => x * x, trap: 'direct' },
    { text: 'The area of a circle and its radius', model: (x) => 3.14 * x * x, trap: 'direct' },
    { text: 'A taxi fare (fixed charge plus a rate per km) and the distance travelled', model: (x) => 50 + 12 * x, trap: 'direct' },
    { text: 'The volume of a cube and the length of its edge', model: (x) => x * x * x, trap: 'direct' },
    { text: 'The pages left to read in a 300-page book and the pages already read', model: (x) => 300 - x, trap: 'inverse' },
    { text: 'The time left in a 10-hour journey and the time already spent', model: (x) => 10 - x, trap: 'inverse' },
    { text: 'The water left in a full 50-litre tank and the litres already drained', model: (x) => 50 - x, trap: 'inverse' }
  ]
};

function classifyModel(model) {
  const xs = [2, 3, 6];
  const ys = xs.map(model);
  if (ys.every((y, i) => nearlyEqual(y / xs[i], ys[0] / xs[0]))) return 'direct';
  if (ys.every((y, i) => nearlyEqual(y * xs[i], ys[0] * xs[0]))) return 'inverse';
  return 'neither';
}

function findScenario(text) {
  for (const list of Object.values(PROPORTION_BANK)) {
    const hit = list.find((s) => s.text === text);
    if (hit) return hit;
  }
  return null;
}

/* -------------------------------- templates -------------------------------- */

export const moreArithmeticTemplates = [
  /* ============================== averages ============================== */
  {
    id: 'avg-mean-of-list',
    version: 1,
    topicId: 'averages',
    conceptId: 'avg-meaning',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['avg-basic'],
    estimatedSeconds: 40,
    params(rng) {
      const n = rng.int(4, 6);
      const m = rng.int(15, 80);
      const values = [];
      for (let i = 0; i < n - 1; i++) values.push(m + rng.int(-12, 12));
      const last = n * m - values.reduce((a, b) => a + b, 0);
      if (last < 5 || last > 150) return null;
      values.push(last);
      if (new Set(values).size < 3) return null;
      return { n, values: rng.shuffle(values), setting: rng.pick(['plain', 'marks', 'sales']) };
    },
    answer: ({ values }) => values.reduce((a, b) => a + b, 0) / values.length,
    formatValue: (value) => fmt(value),
    distractors: ({ n, values }) => {
      const sum = values.reduce((a, b) => a + b, 0);
      return [
        { value: sum / (n - 1), why: 'divided by one fewer than the count' },
        { value: (Math.min(...values) + Math.max(...values)) / 2, why: 'averaged only the smallest and largest values' },
        { value: sum, why: 'gave the total, not the average' },
        { value: sum / (n + 1), why: 'divided by one more than the count' }
      ];
    },
    // Balance check: the deviations from a true average cancel out.
    verify: ({ values }, value) => nearlyEqual(values.reduce((acc, v) => acc + (v - value), 0), 0),
    render({ n, values, setting }) {
      const sum = values.reduce((a, b) => a + b, 0);
      const list = `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
      const question = {
        plain: `What is the average of ${list}?`,
        marks: `A student scores ${list} marks in ${n} tests. What is the average mark?`,
        sales: `A shop sells ${list} units on ${n} days. What is the average number of units sold per day?`
      }[setting];
      return {
        question,
        explanation: `Sum = ${values.join(' + ')} = ${sum}. Average = ${sum} ÷ ${n} = ${fmt(sum / n)}.`,
        solutionSteps: [`Add the ${n} values: ${values.join(' + ')} = ${sum}.`, `Divide by the count: ${sum} ÷ ${n} = ${fmt(sum / n)}.`],
        method: 'Average = sum of the values ÷ number of values.',
        hints: [`Add all ${n} values first.`, `Then share the total ${sum} equally among ${n}.`],
        commonMistakes: [`Dividing ${sum} by ${n - 1} or ${n + 1} after miscounting the values.`]
      };
    }
  },

  {
    id: 'avg-every-value-changed',
    version: 1,
    topicId: 'averages',
    conceptId: 'avg-meaning',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['avg-shift', 'avg-sum'],
    estimatedSeconds: 45,
    tags: ['trap'],
    params(rng) {
      const n = rng.int(5, 15);
      const op = rng.pick(['add', 'sub', 'mul', 'div']);
      let A;
      let k;
      if (op === 'div') {
        k = rng.pick([2, 3, 4, 5]);
        A = k * rng.int(Math.ceil(12 / k), Math.floor(80 / k));
      } else if (op === 'mul') {
        k = rng.int(2, 5);
        A = rng.int(8, 40);
      } else {
        k = rng.int(2, 15);
        A = rng.int(k + 6, 70);
      }
      return { n, op, A, k };
    },
    answer: ({ op, A, k }) => ({ add: A + k, sub: A - k, mul: A * k, div: A / k })[op],
    formatValue: (value) => fmt(value),
    distractors: ({ n, op, A, k }) => {
      const same = { value: A, why: 'assumed the average does not change' };
      if (op === 'add') {
        return [same, { value: A + n * k, why: 'added the total increase to the average' }, { value: A + k / n, why: 'added the increase to the total only once' }, { value: A * k, why: 'multiplied instead of adding' }];
      }
      if (op === 'sub') {
        return [same, { value: A - k / n, why: 'took the decrease off the total only once' }, { value: A + k, why: 'added instead of subtracting' }, { value: A - n * k, why: 'took the total decrease off the average' }];
      }
      if (op === 'mul') {
        return [same, { value: A + k, why: 'added instead of multiplying' }, { value: n * A * k, why: 'gave the new total, not the new average' }, { value: A * k * k, why: 'multiplied twice' }];
      }
      return [same, { value: A - k, why: 'subtracted instead of dividing' }, { value: A * k, why: 'multiplied instead of dividing' }, { value: (n * A) / k, why: 'gave the new total, not the new average' }];
    },
    verify({ n, op, A, k }, value) {
      // Build an actual list with average A, change every member, and re-average.
      const list = Array.from({ length: n }, (_, i) => A + (i - (n - 1) / 2));
      const changed = list.map((v) => ({ add: v + k, sub: v - k, mul: v * k, div: v / k })[op]);
      return nearlyEqual(changed.reduce((a, b) => a + b, 0) / n, value);
    },
    render({ n, op, A, k }) {
      const words = { add: `increased by ${k}`, sub: `decreased by ${k}`, mul: `multiplied by ${k}`, div: `divided by ${k}` }[op];
      const result = { add: A + k, sub: A - k, mul: A * k, div: A / k }[op];
      const sign = { add: '+', sub: '−', mul: '×', div: '÷' }[op];
      const totalBefore = n * A;
      const totalAfter = n * result;
      return {
        question: `The average of ${n} numbers is ${A}. If every number is ${words}, what is the new average?`,
        explanation: `Changing every value the same way changes the average the same way: ${A} ${sign} ${k} = ${fmt(result)}. Check with totals: ${n} × ${A} = ${totalBefore} becomes ${fmt(totalAfter)}, and ${fmt(totalAfter)} ÷ ${n} = ${fmt(result)}.`,
        solutionSteps: [`Old total = ${n} × ${A} = ${totalBefore}.`, `Each of the ${n} values is ${words}, so the new total is ${fmt(totalAfter)}.`, `New average = ${fmt(totalAfter)} ÷ ${n} = ${fmt(result)}.`],
        method: 'Whatever is done to every value is done to the average.',
        hints: ['Think of the average as the value each member would have if all were equal.', `If every one of the ${n} values is ${words}, so is that equal share.`],
        commonMistakes: op === 'add' || op === 'sub' ? [`Changing the average by ${n} × ${k} instead of ${k}.`] : ['Thinking the average stays the same.']
      };
    }
  },

  {
    id: 'avg-first-n-kind',
    version: 1,
    topicId: 'averages',
    conceptId: 'avg-sequences',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['avg-sc-first-n', 'avg-consecutive'],
    answerDecimals: 1,
    estimatedSeconds: 35,
    params(rng) {
      return { n: rng.int(6, 60), kind: rng.pick(['natural', 'even', 'odd']) };
    },
    answer: ({ n, kind }) => ({ natural: (n + 1) / 2, even: n + 1, odd: n })[kind],
    formatValue: (value) => fmt(value),
    distractors: ({ n, kind }) => {
      if (kind === 'natural') {
        return [
          { value: n / 2, why: 'halved n instead of n + 1' },
          { value: (n * (n + 1)) / 2, why: 'gave the sum, not the average' },
          { value: n + 1, why: 'used the result for even numbers' }
        ];
      }
      if (kind === 'even') {
        return [
          { value: (n + 1) / 2, why: 'used the result for natural numbers' },
          { value: n * (n + 1), why: 'gave the sum, not the average' },
          { value: n, why: 'halved the last term only' }
        ];
      }
      return [
        { value: n + 1, why: 'used the result for even numbers' },
        { value: n * n, why: 'gave the sum, not the average' },
        { value: (n + 1) / 2, why: 'used the result for natural numbers' },
        { value: (2 * n - 1) / 2, why: 'halved the last term only' }
      ];
    },
    verify({ n, kind }, value) {
      let sum = 0;
      for (let i = 1; i <= n; i++) sum += kind === 'natural' ? i : kind === 'even' ? 2 * i : 2 * i - 1;
      return nearlyEqual(sum / n, value);
    },
    render({ n, kind }) {
      const first = kind === 'even' ? 2 : 1;
      const last = kind === 'natural' ? n : kind === 'even' ? 2 * n : 2 * n - 1;
      const label = kind === 'natural' ? 'natural numbers' : `${kind} numbers`;
      const avg = (first + last) / 2;
      return {
        question: `What is the average of the first ${n} ${label}?`,
        explanation: `The numbers are evenly spaced from ${first} to ${last}, so the average is the middle value: (${first} + ${last}) ÷ 2 = ${fmt(avg)}.`,
        solutionSteps: [`First term = ${first}, last term = ${last}.`, `Evenly spaced numbers average to (first + last) ÷ 2.`, `(${first} + ${last}) ÷ 2 = ${fmt(avg)}.`],
        method: 'Average of evenly spaced numbers = (first + last) ÷ 2.',
        hints: [`What is the ${ordinal(n)} ${label.replace(/s$/, '')}?`, `Average the first and last terms: ${first} and ${last}.`],
        commonMistakes: ['Giving the sum of the numbers instead of their average.']
      };
    }
  },

  {
    id: 'avg-consecutive-extreme',
    version: 1,
    topicId: 'averages',
    conceptId: 'avg-sequences',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['avg-consecutive'],
    estimatedSeconds: 50,
    params(rng) {
      const kind = rng.pick(['whole', 'even', 'odd']);
      const d = kind === 'whole' ? 1 : 2;
      const n = rng.int(3, 9);
      const first = kind === 'whole' ? rng.int(5, 80) : kind === 'even' ? 2 * rng.int(3, 40) : 2 * rng.int(3, 40) + 1;
      const mean = first + ((n - 1) * d) / 2;
      return { kind, d, n, first, mean, ask: rng.pick(['largest', 'smallest']) };
    },
    answer: ({ d, n, mean, ask }) => (ask === 'largest' ? mean + ((n - 1) * d) / 2 : mean - ((n - 1) * d) / 2),
    verify({ d, n, mean, ask }, value) {
      // Rebuild the run of numbers from the answer and re-average it.
      const start = ask === 'smallest' ? value : value - (n - 1) * d;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += start + i * d;
      return nearlyEqual(sum / n, mean);
    },
    render({ kind, d, n, first, mean, ask }) {
      const label = kind === 'whole' ? 'whole numbers' : `${kind} numbers`;
      const half = ((n - 1) * d) / 2;
      const result = ask === 'largest' ? mean + half : mean - half;
      const terms = Array.from({ length: n }, (_, i) => first + i * d);
      return {
        question: `The average of ${n} consecutive ${label} is ${fmt(mean)}. What is the ${ask} of them?`,
        explanation: `Consecutive ${label} are evenly spaced ${d} apart, so their average is the middle of the run. The ends are (${n} − 1) × ${d} ÷ 2 = ${fmt(half)} either side of it, so the ${ask} is ${fmt(mean)} ${ask === 'largest' ? '+' : '−'} ${fmt(half)} = ${fmt(result)}. The numbers are ${terms.join(', ')}.`,
        solutionSteps: [
          `The ${n} numbers are spaced ${d} apart, so the average ${fmt(mean)} is their middle.`,
          `From the middle to either end: (${n} − 1) × ${d} ÷ 2 = ${fmt(half)}.`,
          `${ask === 'largest' ? 'Largest' : 'Smallest'} = ${fmt(mean)} ${ask === 'largest' ? '+' : '−'} ${fmt(half)} = ${fmt(result)}.`
        ],
        method: 'For evenly spaced numbers, the average is the middle value.',
        hints: [`The average of evenly spaced numbers is the middle value, ${fmt(mean)}.`, `Step out by ${d} at a time until you have ${n} numbers.`],
        commonMistakes: [`Using a gap of ${d === 1 ? 2 : 1} instead of ${d} between consecutive ${label}.`]
      };
    }
  },

  {
    id: 'avg-innings-raise',
    version: 1,
    topicId: 'averages',
    conceptId: 'avg-applications',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['avg-sc-joiner', 'avg-sum'],
    estimatedSeconds: 70,
    params(rng) {
      const n = rng.int(8, 24);
      const A = rng.int(20, 50);
      const d = rng.int(1, 5);
      const x = A + (n + 1) * d;
      if (x > 180) return null;
      return { n, A, d, x };
    },
    answer: ({ x, n, d }) => x - n * d,
    formatValue: (value) => fmt(value),
    distractors: ({ n, A, d, x }) => [
      { value: A, why: 'gave the average before this innings' },
      { value: x / (n + 1), why: 'divided the score by the number of innings' },
      { value: x - d, why: 'took the rise off the score' },
      { value: x - (n - 1) * d, why: 'counted the rise over one innings too few' }
    ],
    verify: ({ n, d, x }, value) => nearlyEqual((n * (value - d) + x) / (n + 1), value),
    render({ n, A, d, x }) {
      const now = A + d;
      return {
        question: `A batsman scores ${x} runs in his ${ordinal(n + 1)} innings, and this raises his average by ${d} run${d === 1 ? '' : 's'}. What is his average after the ${ordinal(n + 1)} innings?`,
        explanation: `Let the new average be y. Before: ${n} innings at (y − ${d}). After: ${n + 1} innings at y. So ${x} = ${n + 1}y − ${n}(y − ${d}) = y + ${n * d}, giving y = ${x} − ${n * d} = ${now}.`,
        solutionSteps: [
          `Total after ${n + 1} innings = ${n + 1}y; total after ${n} innings = ${n}(y − ${d}).`,
          `The difference is the new score: ${n + 1}y − ${n}y + ${n * d} = ${x}.`,
          `y = ${x} − ${n * d} = ${now}. (The old average was ${A}.)`
        ],
        method: 'New score = new average + (old innings × rise).',
        hints: ['Let the new average be y; the old average is y minus the rise.', `The ${x} runs must lift each of the earlier ${n} innings by ${d} and still leave the new average.`],
        commonMistakes: [`Giving the old average ${A} instead of the new one.`]
      };
    }
  },

  {
    id: 'avg-overlap-middle',
    version: 1,
    topicId: 'averages',
    conceptId: 'avg-applications',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['avg-sum'],
    estimatedSeconds: 80,
    tags: ['trap'],
    params(rng) {
      const k = rng.int(4, 8);
      const M = rng.int(25, 70);
      const p = rng.int(1, 6);
      const q = rng.int(1, 6);
      if (p === q) return null;
      const mid = M + k * (q - p);
      if (mid < 10) return null;
      return { k, N: 2 * k - 1, M, a: M - p, b: M + q, mid };
    },
    answer: ({ k, N, M, a, b }) => k * a + k * b - N * M,
    formatValue: (value) => fmt(value),
    distractors: ({ k, N, M, a, b }) => [
      { value: M, why: 'assumed the middle result equals the overall average' },
      { value: (a + b) / 2, why: 'averaged the two group averages' },
      { value: N * M - k * a, why: 'took the first group from the total and stopped' },
      { value: Math.abs(k * (a + b) - 2 * k * M), why: `counted the total as ${2 * k} results` }
    ],
    verify({ k, N, M, a, b }, value) {
      // Fill in an actual list around the shared middle result and check every stated average.
      const v1 = (k * a - value) / (k - 1);
      const v2 = (k * b - value) / (k - 1);
      const list = [...Array(k - 1).fill(v1), value, ...Array(k - 1).fill(v2)];
      const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      return list.length === N && nearlyEqual(avg(list), M) && nearlyEqual(avg(list.slice(0, k)), a) && nearlyEqual(avg(list.slice(k - 1)), b);
    },
    render({ k, N, M, a, b, mid }) {
      return {
        question: `The average of ${N} results is ${M}. The average of the first ${k} is ${a} and the average of the last ${k} is ${b}. What is the ${ordinal(k)} result?`,
        explanation: `The first ${k} and last ${k} make ${2 * k} results, so the ${ordinal(k)} is counted twice. ${k} × ${a} + ${k} × ${b} − ${N} × ${M} = ${k * a} + ${k * b} − ${N * M} = ${mid}.`,
        solutionSteps: [`Total of all ${N} = ${N} × ${M} = ${N * M}.`, `First ${k} total = ${k * a}; last ${k} total = ${k * b}.`, `The ${ordinal(k)} result is in both groups: ${k * a} + ${k * b} − ${N * M} = ${mid}.`],
        method: 'Sum of overlapping groups − whole total = the shared value.',
        hints: [`${k} + ${k} = ${2 * k}, but there are only ${N} results. Which one is counted twice?`, 'Turn each average into a total before combining.'],
        commonMistakes: ['Working with the averages instead of the totals.']
      };
    }
  },

  /* =========================== boats and streams =========================== */
  {
    id: 'bs-with-against-stream',
    version: 1,
    topicId: 'boats-streams',
    conceptId: 'bs-speeds',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['bs-speeds-f'],
    estimatedSeconds: 30,
    params(rng) {
      const b = rng.int(6, 30);
      const s = rng.int(1, Math.min(b - 2, 9));
      return { b, s, dir: rng.pick(['downstream', 'upstream']), who: rng.pick(['boat', 'swimmer', 'rower']) };
    },
    answer: ({ b, s, dir }) => (dir === 'downstream' ? b + s : b - s),
    formatValue: (value) => format.kmh(value),
    distractors: ({ b, s, dir }) => [
      { value: dir === 'downstream' ? b - s : b + s, why: `gave the ${dir === 'downstream' ? 'upstream' : 'downstream'} speed` },
      { value: b, why: 'ignored the stream' },
      { value: dir === 'downstream' ? b + 2 * s : b - 2 * s, why: 'applied the stream twice' },
      { value: s, why: 'gave the speed of the stream' }
    ],
    verify({ b, s, dir }, value) {
      // Strip the stream back out: the speed relative to the water must be the still-water speed.
      const relative = dir === 'downstream' ? value - s : value + s;
      return nearlyEqual(relative, b) && (dir === 'downstream' ? value > b : value < b);
    },
    render({ b, s, dir, who }) {
      const subject = who === 'boat' ? 'A boat moves' : who === 'swimmer' ? 'A swimmer swims' : 'A rower rows';
      const result = dir === 'downstream' ? b + s : b - s;
      return {
        question: `${subject} at ${b} km/hr in still water. The stream flows at ${s} km/hr. What is the speed ${dir}?`,
        explanation: `${dir === 'downstream' ? 'Downstream the stream helps' : 'Upstream the stream works against the motion'}: ${b} ${dir === 'downstream' ? '+' : '−'} ${s} = ${result} km/hr.`,
        solutionSteps: [`Still-water speed b = ${b}, stream s = ${s}.`, `${dir === 'downstream' ? 'Downstream = b + s' : 'Upstream = b − s'} = ${result} km/hr.`],
        method: 'Downstream = b + s; upstream = b − s.',
        hints: [`Does the stream help or hinder when going ${dir}?`, `${dir === 'downstream' ? 'Add' : 'Subtract'} the stream speed ${s}.`],
        commonMistakes: ['Mixing up which direction gets b + s.']
      };
    }
  },

  {
    id: 'bs-other-direction-speed',
    version: 1,
    topicId: 'boats-streams',
    conceptId: 'bs-speeds',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['bs-speeds-f'],
    estimatedSeconds: 50,
    tags: ['trap'],
    params(rng) {
      const s = rng.int(1, 6);
      const b = rng.int(2 * s + 2, 26);
      const t = rng.int(2, 6);
      const given = rng.pick(['downstream', 'upstream']);
      const speed = given === 'downstream' ? b + s : b - s;
      return { b, s, t, given, d: speed * t };
    },
    answer: ({ b, s, given }) => (given === 'downstream' ? b - s : b + s),
    formatValue: (value) => format.kmh(value),
    distractors: ({ d, t, s, given }) => {
      const v = d / t;
      return given === 'downstream'
        ? [
            { value: v - s, why: 'subtracted the stream once — that is the still-water speed' },
            { value: v, why: 'gave the downstream speed' },
            { value: v + s, why: 'added the stream again' }
          ]
        : [
            { value: v + s, why: 'added the stream once — that is the still-water speed' },
            { value: v, why: 'gave the upstream speed' },
            { value: v - s, why: 'subtracted the stream again' }
          ];
    },
    verify({ d, t, s, given }, value) {
      // b = (D + U) ÷ 2 and s = (D − U) ÷ 2 must hold with the given speed.
      const known = d / t;
      const D = given === 'downstream' ? known : value;
      const U = given === 'downstream' ? value : known;
      return nearlyEqual((D - U) / 2, s) && U > 0;
    },
    render({ b, s, t, given, d }) {
      const v = d / t;
      const other = given === 'downstream' ? 'upstream' : 'downstream';
      const result = given === 'downstream' ? b - s : b + s;
      return {
        question: `A boat covers ${d} km ${given} in ${t} hours. The stream flows at ${s} km/hr. What is the boat's speed ${other}?`,
        explanation: `${given[0].toUpperCase() + given.slice(1)} speed = ${d} ÷ ${t} = ${v} km/hr. Still-water speed = ${v} ${given === 'downstream' ? '−' : '+'} ${s} = ${b} km/hr. ${other[0].toUpperCase() + other.slice(1)} speed = ${b} ${given === 'downstream' ? '−' : '+'} ${s} = ${result} km/hr.`,
        solutionSteps: [
          `${given[0].toUpperCase() + given.slice(1)} speed = ${d} ÷ ${t} = ${v} km/hr.`,
          `Remove the stream: b = ${v} ${given === 'downstream' ? '−' : '+'} ${s} = ${b} km/hr.`,
          `${other[0].toUpperCase() + other.slice(1)} speed = ${b} ${given === 'downstream' ? '−' : '+'} ${s} = ${result} km/hr.`
        ],
        method: `The two speeds differ by 2s, so ${other} = ${given} ${given === 'downstream' ? '−' : '+'} 2s.`,
        hints: [`First find the ${given} speed from ${d} km in ${t} hours.`, `Going from ${given} to ${other}, the stream's effect switches sides — a change of 2 × ${s}.`],
        commonMistakes: [`Changing the speed by only ${s}, which gives the still-water speed.`]
      };
    }
  },

  /* =========================== compound interest =========================== */
  {
    id: 'ci-single-year-interest',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-meaning',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ci-amount'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const R = rng.pick([4, 5, 8, 10, 12, 15, 20, 25]);
      const k = rng.pick([2, 3]);
      const base = cleanBase((100 + R) ** (k - 1) * R, 100 ** k);
      const P = multipleIn(rng, base, 1000, 200000);
      if (!P) return null;
      return { P, R, k };
    },
    answer: ({ P, R, k }) => (P * (100 + R) ** (k - 1) * R) / 100 ** k,
    formatValue: (value) => format.rupees(value),
    distractors: ({ P, R, k }) => [
      { value: (P * R) / 100, why: 'used simple interest — ignored interest on interest' },
      { value: compoundBalance(P, R, k) - P, why: `gave the total interest for all ${k} years` },
      { value: compoundBalance(P, R, k), why: 'gave the amount at the end of that year' },
      { value: (P * R * k) / 100, why: `multiplied one year's interest by ${k}` }
    ],
    verify: ({ P, R, k }, value) => nearlyEqual(compoundBalance(P, R, k) - compoundBalance(P, R, k - 1), value, 1e-6),
    render({ P, R, k }) {
      const start = compoundBalance(P, R, k - 1);
      const result = (start * R) / 100;
      const rows = [];
      let bal = P;
      for (let year = 1; year <= k; year++) {
        const interest = (bal * R) / 100;
        rows.push(`Year ${year}: ${R}% of ₹${fmt(bal)} = ₹${fmt(interest)}`);
        bal += interest;
      }
      return {
        question: `₹${fmt(P)} is invested at ${R}% per annum compound interest, compounded annually. How much interest is earned in the ${ordinal(k)} year alone?`,
        explanation: `With compounding, each year's interest is added to the balance. At the start of year ${k} the balance is ₹${fmt(start)}, so the year-${k} interest is ${R}% of ₹${fmt(start)} = ₹${fmt(result)}.`,
        solutionSteps: [...rows.map((row) => `${row}.`), `Interest in year ${k} alone = ₹${fmt(result)}.`],
        method: "Each year's interest = R% of the balance at the start of that year.",
        hints: [`What is the balance at the start of year ${k}?`, `Interest in year ${k} = ${R}% of that balance, not of ₹${fmt(P)}.`],
        commonMistakes: [`Taking ${R}% of the original ₹${fmt(P)}, which ignores interest earned on interest.`]
      };
    }
  },

  {
    id: 'ci-rate-from-two-amounts',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-meaning',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ci-sc-consecutive-years'],
    estimatedSeconds: 60,
    params(rng) {
      const R = rng.pick([4, 5, 8, 10, 12, 15, 20, 25]);
      const n = rng.pick([1, 2, 3]);
      const base = cleanBase((100 + R) ** (n + 1), 100 ** (n + 1));
      const P = multipleIn(rng, base, 1000, 300000);
      if (!P) return null;
      const A1 = (P * (100 + R) ** n) / 100 ** n;
      const A2 = (P * (100 + R) ** (n + 1)) / 100 ** (n + 1);
      if (!Number.isInteger(A1) || !Number.isInteger(A2)) return null;
      return { n, A1, A2 };
    },
    answer: ({ A1, A2 }) => ((A2 - A1) / A1) * 100,
    formatValue: (value) => format.percent(value),
    distractors: ({ n, A1, A2 }) => {
      const I = A2 - A1;
      return [
        { value: (I / A2) * 100, why: 'divided the gain by the later amount' },
        { value: (I / (A1 - n * I)) * 100, why: 'treated it as simple interest' },
        { value: (I / A1) * 100 / (n + 1), why: 'divided by the number of years' },
        { value: (I / A1) * 100 * n, why: `multiplied by ${n} years` }
      ];
    },
    verify({ n, A1, A2 }, value) {
      // Recover the principal, then compound it year by year and check both amounts.
      const P = A1 / (1 + value / 100) ** n;
      return nearlyEqual(compoundBalance(P, value, n), A1, 1e-6) && nearlyEqual(compoundBalance(P, value, n + 1), A2, 1e-6);
    },
    render({ n, A1, A2 }) {
      const I = A2 - A1;
      const R = (I / A1) * 100;
      return {
        question: `A sum of money amounts to ₹${fmt(A1)} in ${n} year${n === 1 ? '' : 's'} and to ₹${fmt(A2)} in ${n + 1} years at compound interest, compounded annually. What is the rate of interest per annum?`,
        explanation: `The extra ₹${fmt(I)} is one year's interest on ₹${fmt(A1)} (the balance at the start of that year). Rate = ${fmt(I)} ÷ ${fmt(A1)} × 100 = ${fmt(R)}%.`,
        solutionSteps: [`Interest in year ${n + 1} = ${fmt(A2)} − ${fmt(A1)} = ₹${fmt(I)}.`, `It is earned on the balance ₹${fmt(A1)}.`, `R = ${fmt(I)} ÷ ${fmt(A1)} × 100 = ${fmt(R)}%.`],
        method: 'R = (A₂ − A₁) ÷ A₁ × 100 for consecutive years.',
        hints: ['The two amounts are one year apart.', `That year's interest is charged on ₹${fmt(A1)}, not on the original sum.`],
        commonMistakes: ['Treating the yearly gain as simple interest on the original principal.']
      };
    }
  },

  {
    id: 'ci-period-and-rate',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-frequency',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ci-half-yearly'],
    estimatedSeconds: 40,
    params(rng) {
      const k = rng.pick([2, 2, 4]);
      const R = k === 2 ? rng.pick([4, 6, 8, 10, 12, 16, 20]) : rng.pick([4, 8, 12, 16, 20]);
      const months = k === 2 ? rng.pick([12, 18, 24, 36]) : rng.pick([6, 9, 12, 24]);
      return { k, R, months, P: rng.int(2, 80) * 1000 };
    },
    answer: ({ k, R, months }) => `${fmt(R / k)}% for ${months / (12 / k)} periods`,
    formatValue: (value) => value,
    distractors: ({ k, R, months }) => {
      const n = months / (12 / k);
      const years = months / 12;
      return [
        { value: `${fmt(R)}% for ${n} periods`, why: 'changed the number of periods but not the rate' },
        { value: Number.isInteger(years) ? `${fmt(R / k)}% for ${years} periods` : null, why: 'changed the rate but not the number of periods' },
        { value: Number.isInteger(years) ? `${fmt(R)}% for ${years} periods` : null, why: 'used annual compounding' },
        { value: `${fmt(R * k)}% for ${n} periods`, why: 'multiplied the rate instead of dividing' },
        { value: `${fmt(R / k)}% for ${months} periods`, why: 'counted months as periods' }
      ];
    },
    verify({ k, R, months }, value) {
      const match = /^([\d.]+)% for (\d+) periods$/.exec(value);
      if (!match) return false;
      const rate = Number(match[1]);
      const periods = Number(match[2]);
      // Periods must tile the whole time exactly, and rate × periods must match R% a year over the same time.
      return periods * (12 / k) === months && nearlyEqual(rate * periods, (R * months) / 12);
    },
    render({ k, R, months, P }) {
      const freq = k === 2 ? 'half-yearly' : 'quarterly';
      const n = months / (12 / k);
      const time = months % 12 === 0 ? `${months / 12} year${months === 12 ? '' : 's'}` : months > 12 ? `${Math.floor(months / 12)} year and ${months % 12} months` : `${months} months`;
      return {
        question: `₹${fmt(P)} is invested at ${R}% per annum for ${time}, compounded ${freq}. In A = P(1 + r/100)ⁿ, which rate per period r and number of periods n should be used?`,
        explanation: `Compounding ${freq} means ${k} periods a year. The rate per period is ${R} ÷ ${k} = ${fmt(R / k)}%, and ${months} months ÷ ${12 / k} months = ${n} periods.`,
        solutionSteps: [`Each period is ${12 / k} months.`, `Rate per period = ${R}% ÷ ${k} = ${fmt(R / k)}%.`, `Periods = ${months} ÷ ${12 / k} = ${n}.`],
        method: 'Divide the annual rate by the periods per year; multiply the years by it.',
        hints: [`How many ${freq} periods fit in one year?`, 'Both the rate and the time must be changed, not just one of them.'],
        commonMistakes: ['Halving the rate but keeping the time in years.']
      };
    }
  },

  {
    id: 'ci-short-period-interest',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-frequency',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ci-half-yearly', 'ci-interest'],
    estimatedSeconds: 75,
    params(rng) {
      const c = rng.pick(CI_FREQUENCY_CASES);
      const P = multipleIn(rng, c.base, 2000, 200000);
      if (!P) return null;
      return { ...c, P };
    },
    answer: ({ P, r, n }) => (P * (100 + r) ** n) / 100 ** n - P,
    formatValue: (value) => format.rupees(value),
    distractors: ({ P, R, r, n, k }) => {
      const years = n / k;
      return [
        { value: Number.isInteger(years) ? compoundBalance(P, R, years) - P : null, why: 'compounded yearly instead' },
        { value: (P * R * years) / 100, why: 'used simple interest' },
        { value: compoundBalance(P, R, n) - P, why: 'used the annual rate for every period' },
        { value: (P * (100 + r) ** n) / 100 ** n, why: 'gave the amount, not the interest' },
        { value: Number.isInteger(years) ? compoundBalance(P, r, years) - P : null, why: 'divided the rate but did not multiply the periods' }
      ];
    },
    verify({ P, R, n, k }, value) {
      // Simulate month by month, crediting interest at the end of each compounding period.
      const step = 12 / k;
      let balance = P;
      for (let month = 1; month <= n * step; month++) {
        if (month % step === 0) balance += (balance * R * step) / 1200;
      }
      return nearlyEqual(balance - P, value, 1e-6);
    },
    render({ P, R, r, n, k }) {
      const freq = k === 2 ? 'half-yearly' : 'quarterly';
      const months = n * (12 / k);
      const time = months % 12 === 0 ? `${months / 12} year${months === 12 ? '' : 's'}` : months > 12 ? `1½ years` : `${months} months`;
      const A = (P * (100 + r) ** n) / 100 ** n;
      return {
        question: `Find the compound interest on ₹${fmt(P)} at ${R}% per annum for ${time}, if interest is compounded ${freq}.`,
        explanation: `${freq[0].toUpperCase() + freq.slice(1)}: rate per period = ${R} ÷ ${k} = ${r}%, periods = ${n}. A = ${fmt(P)} × (1 + ${r}/100)^${n} = ₹${fmt(A)}. CI = ${fmt(A)} − ${fmt(P)} = ₹${fmt(A - P)}.`,
        solutionSteps: [`Rate per period = ${r}%; number of periods = ${n}.`, `A = ${fmt(P)} × ${fmt(1 + r / 100, 4)}^${n} = ₹${fmt(A)}.`, `CI = ₹${fmt(A)} − ₹${fmt(P)} = ₹${fmt(A - P)}.`],
        method: 'Convert to per-period rate and number of periods, then use A = P(1 + r/100)ⁿ.',
        hints: [`There are ${k} compounding periods each year.`, `Use ${r}% per period for ${n} periods.`],
        commonMistakes: [`Using ${R}% for ${n} periods.`]
      };
    }
  },

  {
    id: 'ci-grow-or-depreciate',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-growth',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ci-growth-formula'],
    estimatedSeconds: 60,
    params(rng) {
      const kind = rng.pick(['population', 'machine', 'flat']);
      const up = kind !== 'machine';
      const R = rng.pick([4, 5, 8, 10, 12, 15, 20, 25]);
      const T = rng.pick([2, 3]);
      const base = cleanBase((up ? 100 + R : 100 - R) ** T, 100 ** T);
      const max = kind === 'flat' ? 2000000 : 600000;
      // Prefer round starting values when they fit.
      const round = lcm(base, 100);
      const X = multipleIn(rng, round * 4 <= max ? round : base, kind === 'population' ? 4000 : 10000, max);
      if (!X) return null;
      return { kind, up, R, T, X };
    },
    answer: ({ up, R, T, X }) => (X * (up ? 100 + R : 100 - R) ** T) / 100 ** T,
    formatValue: (value, { kind }) => (kind === 'population' ? fmt(value) : format.rupees(value)),
    distractors: ({ up, R, T, X }) => {
      const final = (X * (up ? 100 + R : 100 - R) ** T) / 100 ** T;
      return [
        { value: X * (1 + ((up ? 1 : -1) * R * T) / 100), why: 'used simple growth — ignored compounding' },
        { value: compoundBalance(X, up ? -R : R, T), why: up ? 'applied a decrease instead of growth' : 'applied growth instead of depreciation' },
        { value: Math.abs(final - X), why: 'gave the change, not the final value' },
        { value: compoundBalance(X, up ? R : -R, 1), why: 'applied the rate for one year only' }
      ];
    },
    // Undo the change year by year: dividing back must return the starting value.
    verify({ up, R, T, X }, value) {
      let v = value;
      for (let year = 0; year < T; year++) v /= 1 + ((up ? 1 : -1) * R) / 100;
      return nearlyEqual(v, X, 1e-6);
    },
    render({ kind, up, R, T, X }) {
      const factor = up ? 1 + R / 100 : 1 - R / 100;
      const final = (X * (up ? 100 + R : 100 - R) ** T) / 100 ** T;
      const show = (v) => (kind === 'population' ? fmt(v) : format.rupees(v));
      const question = {
        population: `The population of a town is ${fmt(X)}. It grows by ${R}% every year. What will the population be after ${T} years?`,
        machine: `A machine is bought for ₹${fmt(X)}. Its value depreciates by ${R}% every year. What will its value be after ${T} years?`,
        flat: `A flat is worth ₹${fmt(X)}. Its price rises by ${R}% every year. What will it be worth after ${T} years?`
      }[kind];
      const steps = [];
      let v = X;
      for (let year = 1; year <= T; year++) {
        const next = v * factor;
        steps.push(`After year ${year}: ${show(v)} ${up ? '+' : '−'} ${R}% = ${show(next)}.`);
        v = next;
      }
      return {
        question,
        explanation: `Each year's change is on the latest value, so Final = ${show(X)} × (1 ${up ? '+' : '−'} ${R}/100)^${T} = ${show(X)} × ${fmt(factor, 4)}^${T} = ${show(final)}.`,
        solutionSteps: steps,
        method: 'Final = Initial × (1 ± R/100)^T.',
        hints: [`Each year the value is multiplied by ${fmt(factor, 4)}.`, `Do that ${T} times, starting from ${show(X)}.`],
        commonMistakes: [`Changing the value by ${R * T}% in one step, which ignores compounding.`]
      };
    }
  },

  {
    id: 'ci-rise-then-fall',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-growth',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ci-growth-formula'],
    estimatedSeconds: 75,
    tags: ['trap'],
    params(rng) {
      const r1 = rng.pick([5, 10, 15, 20, 25, 30]);
      const r2 = rng.pick([4, 5, 8, 10, 12, 15, 20, 25]);
      // Equal-looking swings (or ones that cancel exactly) are excluded so the answer always moves.
      if (r1 === r2 || (100 + r1) * (100 - r2) === 10000) return null;
      const riseFirst = rng.chance(0.5);
      // A multiple of 100 keeps the first year's value whole as well as the final one.
      const base = lcm(100, cleanBase((100 + r1) * (100 - r2), 10000));
      const X = multipleIn(rng, base, 5000, 800000);
      if (!X) return null;
      return { r1, r2, riseFirst, X, what: rng.pick(['population of a town', 'number of members of a club', 'number of visitors to a museum']) };
    },
    answer: ({ r1, r2, X }) => (X * (100 + r1) * (100 - r2)) / 10000,
    formatValue: (value) => fmt(value),
    distractors: ({ r1, r2, X }) => {
      const final = (X * (100 + r1) * (100 - r2)) / 10000;
      return [
        { value: X * (1 + (r1 - r2) / 100), why: 'combined the percentages by simple addition' },
        { value: (X * (100 + r1) * (100 + r2)) / 10000, why: 'treated the fall as a rise' },
        { value: Math.abs(final - X), why: 'gave the net change only' },
        { value: (X * (100 - r1) * (100 + r2)) / 10000, why: 'swapped which change was a rise' }
      ];
    },
    verify({ r1, r2, riseFirst, X }, value) {
      // Run the two years in their stated order, then undo them in reverse.
      let v = X;
      const changes = riseFirst ? [r1, -r2] : [-r2, r1];
      for (const c of changes) v += (v * c) / 100;
      let back = value;
      for (const c of [...changes].reverse()) back /= 1 + c / 100;
      return nearlyEqual(v, value, 1e-6) && nearlyEqual(back, X, 1e-6);
    },
    render({ r1, r2, riseFirst, X, what }) {
      const mid = riseFirst ? (X * (100 + r1)) / 100 : (X * (100 - r2)) / 100;
      const final = (X * (100 + r1) * (100 - r2)) / 10000;
      const first = riseFirst ? `rises by ${r1}%` : `falls by ${r2}%`;
      const second = riseFirst ? `falls by ${r2}%` : `rises by ${r1}%`;
      return {
        question: `The ${what} is ${fmt(X)}. It ${first} in the first year and ${second} in the second year. What is it at the end of the second year?`,
        explanation: `Each change acts on the latest value: ${fmt(X)} × ${fmt(1 + (riseFirst ? r1 : -r2) / 100, 4)} = ${fmt(mid)}, then × ${fmt(1 + (riseFirst ? -r2 : r1) / 100, 4)} = ${fmt(final)}.`,
        solutionSteps: [`Year 1: ${fmt(X)} ${riseFirst ? `+ ${r1}%` : `− ${r2}%`} = ${fmt(mid)}.`, `Year 2: ${fmt(mid)} ${riseFirst ? `− ${r2}%` : `+ ${r1}%`} = ${fmt(final)}.`],
        method: 'Final = Initial × (1 + r₁/100) × (1 − r₂/100).',
        hints: ['The second change is applied to the value after the first change.', `Multiply by ${fmt(1 + r1 / 100, 4)} for the rise and by ${fmt(1 - r2 / 100, 4)} for the fall.`],
        commonMistakes: [`Netting the rates to ${r1 - r2}% in one step.`]
      };
    }
  },

  /* ============================ simple interest ============================ */
  {
    id: 'si-interest-in-one-year',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-meaning',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['si-basic'],
    estimatedSeconds: 40,
    tags: ['trap'],
    params(rng) {
      const P = rng.int(2, 60) * 500;
      const R = rng.pick([4, 5, 6, 8, 10, 12, 15]);
      const T = rng.int(3, 8);
      const k = rng.int(2, T);
      return { P, R, T, k };
    },
    answer: ({ P, R }) => (P * R) / 100,
    formatValue: (value) => format.rupees(value),
    distractors: ({ P, R, T, k }) => [
      { value: (P * R * k) / 100, why: `gave the total interest up to year ${k}` },
      { value: (P * R * T) / 100, why: `gave the interest for all ${T} years` },
      { value: compoundBalance(P, R, k) - compoundBalance(P, R, k - 1), why: 'charged interest on earlier interest (compound interest)' },
      { value: P + (P * R) / 100, why: 'added the principal' }
    ],
    verify({ P, R, k }, value) {
      // Year-by-year ledger: the interest is always worked out on the original sum.
      const ledger = [];
      for (let year = 1; year <= k; year++) ledger.push((P / 100) * R);
      return nearlyEqual(ledger[k - 1], value) && ledger.every((x) => nearlyEqual(x, ledger[0]));
    },
    render({ P, R, T, k }) {
      const yearly = (P * R) / 100;
      return {
        question: `₹${fmt(P)} is lent for ${T} years at ${R}% per annum simple interest. How much interest is earned in the ${ordinal(k)} year alone?`,
        explanation: `Simple interest is charged only on the original ₹${fmt(P)}, so every year earns the same: ${R}% of ${fmt(P)} = ₹${fmt(yearly)}. The ${ordinal(k)} year is no different.`,
        solutionSteps: [`One year's interest = ${fmt(P)} × ${R} ÷ 100 = ₹${fmt(yearly)}.`, `Under simple interest this is the same every year, including year ${k}.`],
        method: 'Simple interest is the same amount every year.',
        hints: ['Is interest ever charged on interest under simple interest?', `Find ${R}% of ₹${fmt(P)}.`],
        commonMistakes: [`Giving the total for ${k} years instead of year ${k} alone.`]
      };
    }
  },

  {
    id: 'si-scale-with-time',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-meaning',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['si-basic'],
    estimatedSeconds: 45,
    params(rng) {
      const R = rng.pick([4, 5, 6, 8, 10, 12, 15]);
      const P = rng.int(4, 80) * 500;
      const T1 = rng.int(2, 6);
      const T2 = rng.int(2, 10);
      if (T1 === T2) return null;
      return { P, R, T1, T2, X: (P * R * T1) / 100 };
    },
    answer: ({ X, T1, T2 }) => (X / T1) * T2,
    formatValue: (value) => format.rupees(value),
    distractors: ({ X, T1, T2 }) => [
      { value: X * T2, why: 'multiplied by the new period without dividing by the old one' },
      { value: (X * T1) / T2, why: 'turned the time ratio upside down' },
      { value: X / T1, why: "gave one year's interest" },
      { value: X + T2 - T1, why: 'added the extra years as rupees' }
    ],
    // Independent route: the hidden principal and rate give the interest directly.
    verify: ({ P, R, T2 }, value) => nearlyEqual((P * R * T2) / 100, value),
    render({ X, T1, T2 }) {
      const yearly = X / T1;
      return {
        question: `A sum of money earns ₹${fmt(X)} as simple interest in ${T1} years. At the same rate, how much simple interest will it earn in ${T2} years?`,
        explanation: `Simple interest grows in equal steps each year: ₹${fmt(X)} ÷ ${T1} = ₹${fmt(yearly)} a year, so ${T2} years earn ${T2} × ${fmt(yearly)} = ₹${fmt(yearly * T2)}.`,
        solutionSteps: [`One year's interest = ${fmt(X)} ÷ ${T1} = ₹${fmt(yearly)}.`, `For ${T2} years: ${fmt(yearly)} × ${T2} = ₹${fmt(yearly * T2)}.`],
        method: 'SI is proportional to time: SI₂ = SI₁ × T₂ ÷ T₁.',
        hints: ['Under simple interest, every year earns the same amount.', `Find the interest for one year from ₹${fmt(X)} in ${T1} years.`],
        commonMistakes: [`Multiplying ₹${fmt(X)} by ${T2} directly.`]
      };
    }
  },

  {
    id: 'si-years-and-months',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-units',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '₹',
    formulaIds: ['si-basic', 'si-time-units'],
    estimatedSeconds: 60,
    params(rng) {
      const Y = rng.int(1, 4);
      const M = rng.int(1, 11);
      const R = rng.pick([4, 5, 6, 8, 9, 10, 12, 15]);
      const base = cleanBase(R * (12 * Y + M), 1200);
      const P = multipleIn(rng, lcm(base, 100), 1000, 60000);
      if (!P) return null;
      return { P, R, Y, M };
    },
    answer: ({ P, R, Y, M }) => (P * R * (12 * Y + M)) / 1200,
    verify({ P, R, Y, M }, value) {
      // Accumulate the interest month by month.
      let interest = 0;
      for (let month = 0; month < 12 * Y + M; month++) interest += (P * R) / 100 / 12;
      return nearlyEqual(interest, value, 1e-6);
    },
    render({ P, R, Y, M }) {
      const months = 12 * Y + M;
      const SI = (P * R * months) / 1200;
      return {
        question: `Find the simple interest on ₹${fmt(P)} at ${R}% per annum for ${Y} year${Y === 1 ? '' : 's'} and ${M} month${M === 1 ? '' : 's'}. (Answer in ₹)`,
        explanation: `${Y} year${Y === 1 ? '' : 's'} ${M} month${M === 1 ? '' : 's'} = ${months} months = ${months}/12 years. SI = ${fmt(P)} × ${R} × ${months} ÷ 1200 = ₹${fmt(SI)}.`,
        solutionSteps: [`Time = ${12 * Y} + ${M} = ${months} months = ${months}/12 years.`, `One year's interest = ₹${fmt((P * R) / 100)}.`, `SI = ${fmt((P * R) / 100)} × ${months}/12 = ₹${fmt(SI)}.`],
        method: 'SI = PRT ÷ 100 with T in years (months ÷ 12).',
        hints: ['The rate is per year, so the time must be in years.', `Write the time as ${months} months, then divide by 12.`],
        commonMistakes: [`Using T = ${Y}.${M} years.`]
      };
    }
  },

  {
    id: 'si-days-or-monthly-rate',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-units',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['si-basic', 'si-time-units'],
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const kind = rng.pick(['days', 'monthly']);
      if (kind === 'days') {
        const D = rng.pick([73, 146, 219, 292, 438, 511]);
        const R = rng.pick([4, 5, 6, 8, 10, 12, 15]);
        const P = multipleIn(rng, lcm(cleanBase(R * D, 36500), 100), 1000, 100000);
        if (!P) return null;
        return { kind, P, R, D };
      }
      const r = rng.pick([0.5, 1, 1.5, 2]);
      const T = rng.pick([1, 2, 3]);
      const P = rng.int(2, 60) * 1000;
      return { kind, P, r, T };
    },
    answer: (p) => (p.kind === 'days' ? (p.P * p.R * p.D) / 36500 : (p.P * p.r * 12 * p.T) / 100),
    formatValue: (value) => format.rupees(value),
    distractors: (p) => {
      if (p.kind === 'days') {
        const { P, R, D } = p;
        return [
          { value: (P * R * D) / 1200, why: 'treated the days as months' },
          { value: (P * R * D) / 36000, why: 'used 360 days in a year' },
          { value: (P * R) / 100, why: 'used a full year' },
          { value: (P * R * D) / 100, why: 'used the days as years' }
        ];
      }
      const { P, r, T } = p;
      return [
        { value: (P * r * T) / 100, why: 'used the monthly rate as a yearly rate' },
        { value: (P * r * T) / 1200, why: 'divided by 12 instead of multiplying' },
        { value: (P * r * 12) / 100, why: 'gave one year of interest' },
        { value: P + (P * r * 12 * T) / 100, why: 'gave the amount, not the interest' }
      ];
    },
    verify(p, value) {
      let interest = 0;
      if (p.kind === 'days') {
        for (let day = 0; day < p.D; day++) interest += (p.P * p.R) / 100 / 365;
      } else {
        for (let month = 0; month < 12 * p.T; month++) interest += (p.P * p.r) / 100;
      }
      return nearlyEqual(interest, value, 1e-6);
    },
    render(p) {
      if (p.kind === 'days') {
        const { P, R, D } = p;
        const SI = (P * R * D) / 36500;
        return {
          question: `Find the simple interest on ₹${fmt(P)} at ${R}% per annum for ${D} days.`,
          explanation: `${D} days = ${D}/365 = ${fmt(D / 365)} years. SI = ${fmt(P)} × ${R} × ${fmt(D / 365)} ÷ 100 = ₹${fmt(SI)}.`,
          solutionSteps: [`Time = ${D} ÷ 365 = ${fmt(D / 365)} years.`, `One year's interest = ₹${fmt((P * R) / 100)}.`, `SI = ${fmt((P * R) / 100)} × ${fmt(D / 365)} = ₹${fmt(SI)}.`],
          method: 'T (years) = days ÷ 365.',
          hints: ['The rate is per year, so convert the days into years.', `${D} is a multiple of 73, and 73 days is one fifth of a year.`],
          commonMistakes: [`Putting T = ${D} into PRT ÷ 100.`]
        };
      }
      const { P, r, T } = p;
      const SI = (P * r * 12 * T) / 100;
      return {
        question: `Find the simple interest on ₹${fmt(P)} at ${fmt(r)}% per month for ${T} year${T === 1 ? '' : 's'}.`,
        explanation: `The rate is per month, so count months: ${T} year${T === 1 ? '' : 's'} = ${12 * T} months. SI = ${fmt(P)} × ${fmt(r)} × ${12 * T} ÷ 100 = ₹${fmt(SI)}.`,
        solutionSteps: [`Rate ${fmt(r)}% per month = ${fmt(12 * r)}% per year.`, `SI = ${fmt(P)} × ${fmt(12 * r)} × ${T} ÷ 100 = ₹${fmt(SI)}.`],
        method: 'Put the rate and the time in the same unit.',
        hints: ['The rate is per month but the time is in years.', `${fmt(r)}% a month is ${fmt(12 * r)}% a year.`],
        commonMistakes: [`Using ${fmt(r)}% as if it were per year.`]
      };
    }
  },

  {
    id: 'si-amount-repayable',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-amount',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['si-amount-formula'],
    estimatedSeconds: 40,
    params(rng) {
      return { P: rng.int(2, 50) * 500, R: rng.pick([4, 5, 6, 8, 10, 12]), T: rng.int(2, 8) };
    },
    answer: ({ P, R, T }) => P + (P * R * T) / 100,
    formatValue: (value) => format.rupees(value),
    distractors: ({ P, R, T }) => [
      { value: (P * R * T) / 100, why: 'gave the interest, not the amount' },
      { value: compoundBalance(P, R, T), why: 'compounded the interest' },
      { value: P + (P * R) / 100, why: "added only one year's interest" },
      { value: P - (P * R * T) / 100, why: 'subtracted the interest' }
    ],
    // Find-the-rate route: the amount must imply exactly R% per annum.
    verify: ({ P, R, T }, value) => nearlyEqual(((value - P) * 100) / (P * T), R),
    render({ P, R, T }) {
      const SI = (P * R * T) / 100;
      return {
        question: `₹${fmt(P)} is lent at ${R}% per annum simple interest for ${T} years. What amount is repayable at the end?`,
        explanation: `SI = ${fmt(P)} × ${R} × ${T} ÷ 100 = ₹${fmt(SI)}. Amount = principal + interest = ${fmt(P)} + ${fmt(SI)} = ₹${fmt(P + SI)}.`,
        solutionSteps: [`SI = ₹${fmt(SI)}.`, `Amount = ₹${fmt(P)} + ₹${fmt(SI)} = ₹${fmt(P + SI)}.`],
        method: 'Amount = P + SI.',
        hints: ['The amount repayable includes the original sum.', `Work out the interest, then add ₹${fmt(P)}.`],
        commonMistakes: [`Stopping at the interest ₹${fmt(SI)}.`]
      };
    }
  },

  {
    id: 'si-principal-from-amount',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-amount',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['si-amount-formula'],
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const P = rng.int(2, 50) * 500;
      const R = rng.pick([4, 5, 6, 8, 10, 12]);
      const T = rng.int(2, 8);
      return { R, T, A: P + (P * R * T) / 100 };
    },
    answer: ({ A, R, T }) => (100 * A) / (100 + R * T),
    formatValue: (value) => format.rupees(value),
    distractors: ({ A, R, T }) => [
      { value: A - (A * R * T) / 100, why: 'took the interest on the amount instead of the principal' },
      { value: (100 * A) / (R * T), why: 'treated the amount as the interest' },
      { value: A / (1 + R / 100) ** T, why: 'used compound interest' },
      { value: A - (A * R) / 100, why: "removed only one year's interest" }
    ],
    verify: ({ A, R, T }, value) => nearlyEqual(value + (value * R * T) / 100, A),
    render({ A, R, T }) {
      const P = (100 * A) / (100 + R * T);
      return {
        question: `A sum lent at ${R}% per annum simple interest amounts to ₹${fmt(A)} in ${T} years. What is the sum?`,
        explanation: `In ${T} years the sum grows by ${R * T}%, so ₹${fmt(A)} is ${100 + R * T}% of it. Sum = ${fmt(A)} × 100 ÷ ${100 + R * T} = ₹${fmt(P)}.`,
        solutionSteps: [`Total interest rate = ${R} × ${T} = ${R * T}%.`, `Amount = ${100 + R * T}% of P.`, `P = ${fmt(A)} × 100 ÷ ${100 + R * T} = ₹${fmt(P)}.`],
        method: 'P = 100A ÷ (100 + RT).',
        hints: [`₹${fmt(A)} is the principal plus the interest.`, `The amount is (100 + ${R * T})% of the principal.`],
        commonMistakes: [`Taking ${R * T}% of ₹${fmt(A)} off the amount.`]
      };
    }
  },

  /* ========================= profit, loss, discount ========================= */
  {
    id: 'pl-selling-price-from-rate',
    version: 1,
    topicId: 'profit-loss-discount',
    conceptId: 'pl-basics',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pl-sp-formula'],
    estimatedSeconds: 40,
    params(rng) {
      const R = rng.pick([5, 8, 10, 12, 15, 20, 25, 30, 40]);
      const [item, lo, hi] = rng.pick([
        ['a table', 1000, 10000],
        ['a bicycle', 3000, 15000],
        ['a watch', 500, 12000],
        ['a mobile phone', 5000, 30000],
        ['a ceiling fan', 1000, 5000],
        ['a sofa', 8000, 40000],
        ['a pen set', 200, 1000]
      ]);
      const CP = multipleIn(rng, lcm(100 / gcd(100, R), 10), lo, hi);
      return { R, CP, profit: rng.chance(0.6), item };
    },
    answer: ({ R, CP, profit }) => (CP * (profit ? 100 + R : 100 - R)) / 100,
    formatValue: (value) => format.rupees(value),
    distractors: ({ R, CP, profit }) => [
      { value: (CP * (profit ? 100 - R : 100 + R)) / 100, why: profit ? 'applied a loss instead of a profit' : 'applied a profit instead of a loss' },
      { value: (CP * R) / 100, why: `gave only the ${profit ? 'profit' : 'loss'}` },
      { value: profit ? CP + R : CP - R, why: `${profit ? 'added' : 'subtracted'} ${R} rupees, not ${R}%` },
      { value: profit ? (CP * 100) / (100 - R) : (CP * 100) / (100 + R), why: 'took the percentage on the selling price' }
    ],
    verify: ({ R, CP, profit }, value) => nearlyEqual(((value - CP) / CP) * 100, profit ? R : -R),
    render({ R, CP, profit, item }) {
      const change = (CP * R) / 100;
      const SP = profit ? CP + change : CP - change;
      return {
        question: `A shopkeeper buys ${item} for ₹${fmt(CP)} and sells it at a ${profit ? 'profit' : 'loss'} of ${R}%. What is the selling price?`,
        explanation: `${profit ? 'Profit' : 'Loss'} = ${R}% of ₹${fmt(CP)} = ₹${fmt(change)}. SP = ${fmt(CP)} ${profit ? '+' : '−'} ${fmt(change)} = ₹${fmt(SP)}.`,
        solutionSteps: [`${profit ? 'Profit' : 'Loss'} % is on the cost price ₹${fmt(CP)}.`, `${R}% of ${fmt(CP)} = ₹${fmt(change)}.`, `SP = ₹${fmt(SP)}.`],
        method: `SP = CP × (100 ${profit ? '+' : '−'} ${R}) ÷ 100.`,
        hints: ['Profit and loss percentages are worked out on the cost price.', `SP = ${100 + (profit ? R : -R)}% of ₹${fmt(CP)}.`],
        commonMistakes: [`Stopping at the ${profit ? 'profit' : 'loss'} of ₹${fmt(change)}.`]
      };
    }
  },

  {
    id: 'pl-gain-with-overheads',
    version: 1,
    topicId: 'profit-loss-discount',
    conceptId: 'pl-basics',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pl-profit-formula', 'pl-loss-formula'],
    estimatedSeconds: 65,
    tags: ['trap'],
    params(rng) {
      const R = rng.pick([5, 8, 10, 12, 15, 20, 25]);
      const profit = rng.chance(0.65);
      const total = 100 * rng.int(20, 600);
      // Overheads between about 5% and 25% of the total cost.
      const E = 50 * rng.int(Math.max(1, Math.ceil(total / 1000)), Math.floor(total / 200));
      const [item, extra] = rng.pick([
        ['an old scooter', 'repairs'],
        ['a second-hand car', 'repairs'],
        ['a cupboard', 'transport'],
        ['a machine', 'installation'],
        ['a used laptop', 'a new battery']
      ]);
      return { R, profit, total, E, C: total - E, S: (total * (profit ? 100 + R : 100 - R)) / 100, item, extra };
    },
    answer: ({ total, S }) => (Math.abs(S - total) / total) * 100,
    formatValue: (value) => format.percent(value),
    distractors: ({ profit, total, E, C, S }) => [
      { value: ((profit ? S - C : C - S) / C) * 100, why: `ignored the ₹${fmt(E)} spent` },
      { value: (Math.abs(S - total) / C) * 100, why: 'divided by the purchase price only' },
      { value: (Math.abs(S - total) / S) * 100, why: 'divided by the selling price' },
      { value: (Math.abs(S - total) / (total + E)) * 100, why: 'counted the extra cost twice' }
    ],
    // Rebuild the selling price from the answer.
    verify: ({ profit, total, S }, value) => nearlyEqual((total * (100 + (profit ? value : -value))) / 100, S),
    render({ profit, total, E, C, S, item, extra }) {
      const diff = Math.abs(S - total);
      const word = profit ? 'profit' : 'loss';
      const Word = profit ? 'Profit' : 'Loss';
      return {
        question: `A man buys ${item} for ₹${fmt(C)} and spends ₹${fmt(E)} on ${extra}. He then sells it for ₹${fmt(S)}. What is his ${word} percentage?`,
        explanation: `The real cost price includes the ₹${fmt(E)} spent on ${extra}: ${fmt(C)} + ${fmt(E)} = ₹${fmt(total)}. ${Word} = ₹${fmt(diff)}, so ${word} % = ${fmt(diff)} ÷ ${fmt(total)} × 100 = ${fmt((diff / total) * 100)}%.`,
        solutionSteps: [
          `CP = ${fmt(C)} + ${fmt(E)} = ₹${fmt(total)}.`,
          `${Word} = ${profit ? `${fmt(S)} − ${fmt(total)}` : `${fmt(total)} − ${fmt(S)}`} = ₹${fmt(diff)}.`,
          `${Word} % = ${fmt(diff)} ÷ ${fmt(total)} × 100 = ${fmt((diff / total) * 100)}%.`
        ],
        method: 'Overheads are part of the cost price.',
        hints: [`Is the ₹${fmt(E)} spent on ${extra} part of what the article cost him?`, `Measure the ${word} against ₹${fmt(total)}.`],
        commonMistakes: [`Using ₹${fmt(C)} as the cost price.`]
      };
    }
  },

  {
    id: 'pl-price-after-discount',
    version: 1,
    topicId: 'profit-loss-discount',
    conceptId: 'pl-discount',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pl-discount-formula'],
    estimatedSeconds: 35,
    params(rng) {
      const d = rng.pick([5, 10, 12, 15, 20, 25, 30, 35, 40]);
      const [item, lo, hi] = rng.pick([
        ['shirt', 300, 3000],
        ['watch', 500, 20000],
        ['pair of shoes', 500, 6000],
        ['mixer', 1500, 8000],
        ['chair', 500, 5000],
        ['backpack', 500, 4000],
        ['saree', 800, 15000],
        ['television', 10000, 60000]
      ]);
      const MP = multipleIn(rng, lcm(100 / gcd(100, d), 10), lo, hi);
      return { d, MP, item };
    },
    answer: ({ d, MP }) => (MP * (100 - d)) / 100,
    formatValue: (value) => format.rupees(value),
    distractors: ({ d, MP }) => [
      { value: (MP * d) / 100, why: 'gave the discount, not the price paid' },
      { value: (MP * (100 + d)) / 100, why: 'added the discount' },
      { value: MP - d, why: `subtracted ${d} rupees, not ${d}%` },
      { value: MP / (1 + d / 100), why: `divided by ${fmt(1 + d / 100)} instead of taking ${d}% off` }
    ],
    verify: ({ d, MP }, value) => nearlyEqual(((MP - value) / MP) * 100, d),
    render({ d, MP, item }) {
      const off = (MP * d) / 100;
      return {
        question: `A ${item} marked at ₹${fmt(MP)} is sold at a discount of ${d}%. How much does the customer pay?`,
        explanation: `Discount = ${d}% of ₹${fmt(MP)} = ₹${fmt(off)}. Price paid = ${fmt(MP)} − ${fmt(off)} = ₹${fmt(MP - off)}.`,
        solutionSteps: [`Discount is on the marked price: ${d}% of ${fmt(MP)} = ₹${fmt(off)}.`, `SP = ${fmt(MP)} − ${fmt(off)} = ₹${fmt(MP - off)}.`],
        method: 'SP = MP × (100 − d) ÷ 100.',
        hints: ['A discount is always a percentage of the marked price.', `The customer pays ${100 - d}% of ₹${fmt(MP)}.`],
        commonMistakes: [`Giving the discount ₹${fmt(off)} as the answer.`]
      };
    }
  },

  {
    id: 'pl-marked-from-paid',
    version: 1,
    topicId: 'profit-loss-discount',
    conceptId: 'pl-discount',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pl-discount-formula'],
    estimatedSeconds: 50,
    tags: ['trap'],
    params(rng) {
      const d = rng.pick([5, 10, 15, 20, 25, 30, 40]);
      const MP = multipleIn(rng, lcm(100 / gcd(100, d), 10), 200, 50000);
      return { d, MP, SP: (MP * (100 - d)) / 100 };
    },
    answer: ({ d, SP }) => (SP * 100) / (100 - d),
    formatValue: (value) => format.rupees(value),
    distractors: ({ d, SP }) => [
      { value: (SP * (100 + d)) / 100, why: `added ${d}% of the selling price` },
      { value: (SP * 100) / (100 + d), why: `divided by ${100 + d} instead of ${100 - d}` },
      { value: (SP * (100 - d)) / 100, why: 'took the discount off the selling price' },
      { value: SP + d, why: `added ${d} rupees` }
    ],
    verify: ({ d, SP }, value) => nearlyEqual(value - (value * d) / 100, SP),
    render({ d, SP }) {
      const MP = (SP * 100) / (100 - d);
      return {
        question: `After a discount of ${d}%, an article sells for ₹${fmt(SP)}. What is its marked price?`,
        explanation: `The price paid is ${100 - d}% of the marked price, so MP = ${fmt(SP)} × 100 ÷ ${100 - d} = ₹${fmt(MP)}. Check: ${d}% of ${fmt(MP)} is ₹${fmt(MP - SP)}, and ${fmt(MP)} − ${fmt(MP - SP)} = ${fmt(SP)}.`,
        solutionSteps: [`SP = ${100 - d}% of MP.`, `MP = ${fmt(SP)} ÷ ${fmt((100 - d) / 100)} = ₹${fmt(MP)}.`],
        method: 'MP = SP × 100 ÷ (100 − d).',
        hints: ['The discount was taken off the marked price, which you do not know yet.', `₹${fmt(SP)} is ${100 - d}% of the marked price.`],
        commonMistakes: [`Adding ${d}% of ₹${fmt(SP)}.`]
      };
    }
  },

  {
    id: 'pl-extra-rupees-swing',
    version: 1,
    topicId: 'profit-loss-discount',
    conceptId: 'pl-applications',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: '₹',
    formulaIds: ['pl-sp-formula'],
    estimatedSeconds: 80,
    params(rng) {
      const kind = rng.pick(['loss-gain', 'loss-gain', 'gain-gain', 'loss-loss']);
      const x = rng.pick([2, 4, 5, 6, 8, 10, 12, 15, 20]);
      const y = rng.pick([2, 4, 5, 6, 8, 10, 12, 15, 20, 25]);
      if (kind === 'gain-gain' && y <= x) return null;
      if (kind === 'loss-loss' && y >= x) return null;
      const diff = kind === 'loss-gain' ? x + y : Math.abs(y - x);
      const CP = multipleIn(rng, lcm(100 / gcd(100, diff), 10), 200, 20000);
      if (!CP) return null;
      return { kind, x, y, CP, k: (CP * diff) / 100 };
    },
    answer: ({ kind, x, y, k }) => (100 * k) / (kind === 'loss-gain' ? x + y : Math.abs(y - x)),
    verify({ kind, x, y, k }, value) {
      const first = kind === 'gain-gain' ? 100 + x : 100 - x;
      const second = kind === 'loss-loss' ? 100 - y : 100 + y;
      return nearlyEqual((value * first) / 100 + k, (value * second) / 100);
    },
    render({ kind, x, y, k }) {
      const first = kind === 'gain-gain' ? `a profit of ${x}%` : `a loss of ${x}%`;
      const second = kind === 'loss-loss' ? `a loss of only ${y}%` : `a profit of ${y}%`;
      const swing = kind === 'loss-gain' ? x + y : Math.abs(y - x);
      const CP = (100 * k) / swing;
      const p1 = kind === 'gain-gain' ? 100 + x : 100 - x;
      const p2 = kind === 'loss-loss' ? 100 - y : 100 + y;
      return {
        question: `A man sells an article at ${first}. Had he sold it for ₹${fmt(k)} more, he would have made ${second}. What is the cost price? (Answer in ₹)`,
        explanation: `The two selling prices are ${p1}% and ${p2}% of CP, a gap of ${swing}% of CP. So ${swing}% of CP = ₹${fmt(k)}, giving CP = ${fmt(k)} × 100 ÷ ${swing} = ₹${fmt(CP)}.`,
        solutionSteps: [`First SP = ${p1}% of CP; second SP = ${p2}% of CP.`, `Difference = ${swing}% of CP = ₹${fmt(k)}.`, `CP = ${fmt(k)} ÷ ${swing} × 100 = ₹${fmt(CP)}.`],
        method: 'The extra rupees equal the change in percentage of the cost price.',
        hints: ['Write both selling prices as percentages of the cost price.', `The ₹${fmt(k)} covers a swing of ${swing}% of CP.`],
        commonMistakes: kind === 'loss-gain' ? [`Using ${Math.abs(y - x)}% instead of ${x} + ${y} = ${x + y}%.`] : [`Using ${x + y}% instead of the difference ${swing}%.`]
      };
    }
  },

  {
    id: 'pl-articles-sold-vs-bought',
    version: 1,
    topicId: 'profit-loss-discount',
    conceptId: 'pl-applications',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['pl-sc-count-articles'],
    estimatedSeconds: 70,
    tags: ['trap'],
    params(rng) {
      const [x, y] = rng.pick(ARTICLE_PAIRS);
      return { x, y };
    },
    answer: ({ x, y }) => `${fmt((100 * Math.abs(y - x)) / x)}% ${y > x ? 'profit' : 'loss'}`,
    formatValue: (value) => value,
    distractors: ({ x, y }) => {
      const gain = y > x;
      const label = (pct, isGain) => `${fmt(pct)}% ${isGain ? 'profit' : 'loss'}`;
      return [
        { value: label((100 * Math.abs(y - x)) / y, gain), why: `divided by ${y} instead of ${x}` },
        { value: label((100 * Math.abs(y - x)) / x, !gain), why: 'mixed up profit and loss' },
        { value: label(Math.abs(y - x), gain), why: 'took the difference in articles as the percentage' },
        { value: label((100 * Math.abs(y - x)) / y, !gain), why: 'divided by the wrong count and mixed up profit and loss' }
      ];
    },
    verify({ x, y }, value) {
      const match = /^([\d.]+)% (profit|loss)$/.exec(value);
      if (!match) return false;
      // Price one article at ₹60 and compare the money in and out for x articles.
      const cost = 60;
      const sellEach = (y * cost) / x;
      const pct = ((sellEach - cost) / cost) * 100;
      const signed = match[2] === 'profit' ? Number(match[1]) : -Number(match[1]);
      return nearlyEqual(pct, signed, 1e-3);
    },
    render({ x, y }) {
      const gain = y > x;
      const pct = (100 * Math.abs(y - x)) / x;
      return {
        question: `The selling price of ${x} articles is equal to the cost price of ${y} articles. What is the profit or loss percentage?`,
        explanation: `Let each article cost ₹1. Then ${x} articles cost ₹${x} and sell for ₹${y}. ${gain ? 'Profit' : 'Loss'} = ₹${Math.abs(y - x)} on a cost of ₹${x}, so ${fmt(pct)}% ${gain ? 'profit' : 'loss'}.`,
        solutionSteps: [`Take CP of one article = ₹1.`, `CP of ${x} articles = ₹${x}; their SP = CP of ${y} = ₹${y}.`, `${gain ? 'Profit' : 'Loss'} % = ${Math.abs(y - x)} ÷ ${x} × 100 = ${fmt(pct)}%.`],
        method: 'Profit % = (y − x) ÷ x × 100, where x articles are sold.',
        hints: ['Give one article a convenient cost, such as ₹1.', `Compare what ${x} articles cost with what they sold for.`],
        commonMistakes: [`Dividing by ${y} instead of ${x}.`]
      };
    }
  },

  /* ============================ ratio and proportion ============================ */
  {
    id: 'rp-part-of-whole',
    version: 1,
    topicId: 'ratio-proportion',
    conceptId: 'rp-meaning',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['rp-share'],
    estimatedSeconds: 35,
    params(rng) {
      const a = rng.int(2, 12);
      const b = rng.int(2, 12);
      if (a === b || gcd(a, b) !== 1) return null;
      const [pair, groups] = rng.pick([
        ['boys to girls in a class', { names: ['boys', 'girls'], whole: 'the class', verb: 'are' }],
        ['milk to water in a mixture', { names: ['milk', 'water'], whole: 'the mixture', verb: 'is' }],
        ['red marbles to blue marbles in a bag', { names: ['red marbles', 'blue marbles'], whole: 'the marbles', verb: 'are' }],
        ['adults to children at a show', { names: ['adults', 'children'], whole: 'the audience', verb: 'are' }]
      ]);
      return { a, b, pair, groups, first: rng.chance(0.5) };
    },
    answer: ({ a, b, first }) => fractionText([first ? a : b, a + b]),
    formatValue: (value) => value,
    distractors: ({ a, b, first }) => {
      const own = first ? a : b;
      const other = first ? b : a;
      return [
        { value: fractionText([own, other]), why: 'compared with the other group, not the whole' },
        { value: fractionText([other, a + b]), why: "gave the other group's fraction" },
        { value: fractionText([other, own]), why: 'turned the ratio upside down' }
      ];
    },
    verify({ a, b, first }, value) {
      // Put real numbers on it: 7 groups of (a + b) items.
      const [p, q] = parseFraction(value);
      const total = 7 * (a + b);
      const part = 7 * (first ? a : b);
      return p * total === q * part;
    },
    render({ a, b, pair, groups, first }) {
      const name = groups.names[first ? 0 : 1];
      const own = first ? a : b;
      return {
        question: `The ratio of ${pair} is ${a} : ${b}. What fraction of ${groups.whole} ${groups.verb} ${name}?`,
        explanation: `A ratio counts parts: ${a} parts and ${b} parts make ${a + b} parts in all. ${name[0].toUpperCase() + name.slice(1)} ${groups.verb === 'is' ? 'makes' : 'make'} up ${own} of those ${a + b} parts, so the fraction is ${own}/${a + b}.`,
        solutionSteps: [`Total parts = ${a} + ${b} = ${a + b}.`, `${name} = ${own} parts.`, `Fraction = ${own}/${a + b}.`],
        method: 'Part ÷ (sum of the ratio terms).',
        hints: ['A ratio compares parts, not totals.', `How many parts are there altogether?`],
        commonMistakes: [`Writing ${own}/${first ? b : a}, which compares one group with the other.`]
      };
    }
  },

  {
    id: 'rp-mixed-units',
    version: 1,
    topicId: 'ratio-proportion',
    conceptId: 'rp-meaning',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rp-share'],
    estimatedSeconds: 45,
    tags: ['trap'],
    params(rng) {
      const unit = rng.pick([
        { small: 'paise', big: 'rupees', conv: 100, step: 5, max: 40 },
        { small: 'minutes', big: 'hours', conv: 60, step: 5, max: 30 },
        { small: 'grams', big: 'kg', conv: 1000, step: 50, max: 30 },
        { small: 'cm', big: 'metres', conv: 100, step: 5, max: 40 },
        { small: 'ml', big: 'litres', conv: 1000, step: 50, max: 30 },
        { small: 'seconds', big: 'minutes', conv: 60, step: 5, max: 24 }
      ]);
      const a = unit.step * rng.int(1, unit.max);
      const b = rng.int(1, 5);
      if (a === b * unit.conv) return null;
      const smallFirst = rng.chance(0.6);
      const answer = smallFirst ? reduceRatio(a, b * unit.conv) : reduceRatio(b * unit.conv, a);
      if (Math.max(...answer) > 60) return null;
      return { ...unit, a, b, smallFirst };
    },
    answer: ({ a, b, conv, smallFirst }) => ratioText(smallFirst ? reduceRatio(a, b * conv) : reduceRatio(b * conv, a)),
    formatValue: (value) => value,
    distractors: ({ a, b, conv, smallFirst }) => {
      const order = (x, y) => ratioText(smallFirst ? reduceRatio(x, y) : reduceRatio(y, x));
      return [
        { value: order(a, b), why: 'did not convert to the same unit' },
        { value: smallFirst ? ratioText(reduceRatio(b * conv, a)) : ratioText(reduceRatio(a, b * conv)), why: 'reversed the order' },
        { value: order(a * conv, b), why: 'converted the wrong quantity' }
      ];
    },
    verify({ a, b, conv, smallFirst }, value) {
      const [p, q] = parseRatio(value);
      const first = smallFirst ? a : b * conv;
      const second = smallFirst ? b * conv : a;
      return p * second === q * first;
    },
    render({ small, big, conv, a, b, smallFirst }) {
      const bigText = big === 'rupees' ? `₹${b}` : `${b} ${b === 1 ? big.replace(/s$/, '').replace('metre', 'metre') : big}`;
      const smallText = `${a} ${small}`;
      const [p, q] = smallFirst ? reduceRatio(a, b * conv) : reduceRatio(b * conv, a);
      const firstText = smallFirst ? smallText : bigText;
      const secondText = smallFirst ? bigText : smallText;
      const converted = `${b * conv} ${small}`;
      return {
        question: `What is the ratio of ${firstText} to ${secondText}?`,
        explanation: `A ratio compares like with like, so first write both in ${small}: ${bigText} = ${converted}. Then ${smallFirst ? `${a} : ${b * conv}` : `${b * conv} : ${a}`} simplifies to ${p} : ${q}.`,
        solutionSteps: [`Convert: ${bigText} = ${converted}.`, `Ratio = ${smallFirst ? `${a} : ${b * conv}` : `${b * conv} : ${a}`}.`, `Divide both terms by ${gcd(a, b * conv)}: ${p} : ${q}.`],
        method: 'Same units first, then simplify.',
        hints: ['Both quantities must be in the same unit before you compare them.', `1 ${big === 'rupees' ? 'rupee' : big.replace(/s$/, '')} = ${conv} ${small}.`],
        commonMistakes: [`Writing ${smallFirst ? `${a} : ${b}` : `${b} : ${a}`} without converting.`]
      };
    }
  },

  {
    id: 'rp-pick-equivalent',
    version: 1,
    topicId: 'ratio-proportion',
    conceptId: 'rp-simplify',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['rp-cross'],
    estimatedSeconds: 35,
    params(rng) {
      const p = rng.int(1, 9);
      const q = rng.int(1, 9);
      if (p === q || gcd(p, q) !== 1) return null;
      const m = rng.int(2, 9);
      const n = rng.int(2, 12);
      const c = rng.int(1, 5);
      if (n === m) return null;
      const wrong = [
        { terms: [n * q, n * p], why: 'reversed the order' },
        { terms: [n * p, m * q], why: 'scaled only one term' },
        { terms: [m * p + c, m * q + c], why: 'added the same number to both terms' }
      ];
      // No two options may be the same ratio in a different form.
      const keys = [[p, q], ...wrong.map((w) => w.terms)].map((t) => ratioText(reduceRatio(...t)));
      if (new Set(keys).size !== keys.length) return null;
      return { p, q, m, n, wrong };
    },
    answer: ({ p, q, n }) => ratioText([n * p, n * q]),
    formatValue: (value) => value,
    distractors: ({ wrong }) => wrong.map((w) => ({ value: ratioText(w.terms), why: w.why })),
    verify({ p, q, m }, value) {
      const [x, y] = parseRatio(value);
      return x * (m * q) === y * (m * p);
    },
    render({ p, q, m, n }) {
      return {
        question: `Which of these ratios is equivalent to ${m * p} : ${m * q}?`,
        explanation: `${m * p} : ${m * q} simplifies to ${p} : ${q} (divide both by ${m}). ${n * p} : ${n * q} is ${p} : ${q} with both terms multiplied by ${n}, so it is equivalent.`,
        solutionSteps: [`Simplify: ${m * p} ÷ ${m} = ${p}, ${m * q} ÷ ${m} = ${q}.`, `Each option must also reduce to ${p} : ${q}.`, `${n * p} : ${n * q} = ${p} : ${q} ✓`],
        method: 'Multiplying or dividing both terms by the same number keeps a ratio unchanged.',
        hints: [`Reduce ${m * p} : ${m * q} to its simplest form first.`, 'Adding the same number to both terms changes the ratio.'],
        commonMistakes: ['Thinking that adding the same number to both terms keeps the ratio.']
      };
    }
  },

  {
    id: 'rp-fraction-terms',
    version: 1,
    topicId: 'ratio-proportion',
    conceptId: 'rp-simplify',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rp-cross'],
    estimatedSeconds: 50,
    params(rng) {
      const [a, b] = rng.pick(SIMPLE_FRACTIONS);
      const [c, d] = rng.pick(SIMPLE_FRACTIONS);
      if (a * d === b * c || b === d) return null;
      const answer = reduceRatio(a * d, b * c);
      if (Math.max(...answer) > 80) return null;
      return { a, b, c, d };
    },
    answer: ({ a, b, c, d }) => ratioText(reduceRatio(a * d, b * c)),
    formatValue: (value) => value,
    distractors: ({ a, b, c, d }) => [
      { value: ratioText(reduceRatio(a, c)), why: 'compared the numerators only' },
      { value: ratioText(reduceRatio(b * c, a * d)), why: 'reversed the ratio after cross-multiplying' },
      { value: ratioText(reduceRatio(a * c, b * d)), why: 'multiplied straight across' },
      { value: ratioText(reduceRatio(b, d)), why: 'compared the denominators only' }
    ],
    verify({ a, b, c, d }, value) {
      // x : y = (a/b) : (c/d) exactly when x × (c/d) = y × (a/b).
      const [x, y] = parseRatio(value);
      return x * c * b === y * a * d;
    },
    render({ a, b, c, d }) {
      const L = lcm(b, d);
      const [x, y] = reduceRatio(a * d, b * c);
      return {
        question: `Express the ratio ${a}/${b} : ${c}/${d} in its simplest form.`,
        explanation: `Multiply both terms by ${L} (the LCM of ${b} and ${d}): ${a}/${b} × ${L} = ${(a * L) / b} and ${c}/${d} × ${L} = ${(c * L) / d}. So the ratio is ${(a * L) / b} : ${(c * L) / d}${x === (a * L) / b ? '' : ` = ${x} : ${y}`}.`,
        solutionSteps: [`LCM of ${b} and ${d} = ${L}.`, `Scale both terms by ${L}: ${(a * L) / b} : ${(c * L) / d}.`, x === (a * L) / b ? 'The terms share no common factor, so this is the simplest form.' : `Divide both terms by ${gcd((a * L) / b, (c * L) / d)}: ${x} : ${y}.`],
        method: 'Clear the fractions by multiplying both terms by the LCM of the denominators.',
        hints: ['Multiplying both terms by the same number does not change a ratio.', `Choose a number that clears both denominators, ${b} and ${d}.`],
        commonMistakes: [`Writing ${a} : ${c} and ignoring the denominators.`]
      };
    }
  },

  {
    id: 'rp-add-same-number',
    version: 1,
    topicId: 'ratio-proportion',
    conceptId: 'rp-applications',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rp-cross'],
    estimatedSeconds: 75,
    params(rng) {
      const [a, b] = rng.pick(COPRIME_PAIRS);
      const x = rng.int(2, 12);
      const k = rng.int(2, 20);
      const [c, d] = reduceRatio(a * x + k, b * x + k);
      if (d > 40) return null;
      return { a, b, x, k, c, d, ask: rng.pick(['smaller', 'larger']) };
    },
    answer: ({ a, b, x, ask }) => (ask === 'smaller' ? a : b) * x,
    formatValue: (value) => fmt(value),
    distractors: ({ a, b, x, k, ask }) => {
      const own = ask === 'smaller' ? a : b;
      const other = ask === 'smaller' ? b : a;
      return [
        { value: own * x + k, why: `gave the number after adding ${k}` },
        { value: other * x, why: `gave the ${ask === 'smaller' ? 'larger' : 'smaller'} number` },
        { value: x, why: 'gave one part, not the number' },
        { value: own * k, why: `multiplied the ratio term by ${k}` }
      ];
    },
    verify({ a, b, k, c, d, ask }, value) {
      const small = ask === 'smaller' ? value : (value * a) / b;
      const large = ask === 'smaller' ? (value * b) / a : value;
      return nearlyEqual((small + k) * d, (large + k) * c);
    },
    render({ a, b, x, k, c, d, ask }) {
      const result = (ask === 'smaller' ? a : b) * x;
      const ax = a === 1 ? 'x' : `${a}x`;
      return {
        question: `Two numbers are in the ratio ${a} : ${b}. If ${k} is added to each, the ratio becomes ${c} : ${d}. What is the ${ask} number?`,
        explanation: `Let the numbers be ${ax} and ${b}x. Then ${d}(${ax} + ${k}) = ${c}(${b}x + ${k}), so ${b * c - a * d}x = ${k * (d - c)} and x = ${x}. The numbers are ${a * x} and ${b * x}; the ${ask} is ${result}.`,
        solutionSteps: [`Numbers: ${ax} and ${b}x.`, `(${ax} + ${k}) : (${b}x + ${k}) = ${c} : ${d} → ${d}(${ax} + ${k}) = ${c}(${b}x + ${k}).`, `${a * d}x + ${d * k} = ${b * c}x + ${c * k} → x = ${x}.`, `The ${ask} number = ${result}. Check: ${a * x + k} : ${b * x + k} = ${c} : ${d} ✓`],
        method: 'Write the numbers as ax and bx, apply the change to both, cross-multiply.',
        hints: [`Call the numbers ${ax} and ${b}x.`, `Add ${k} to both, then cross-multiply with ${c} : ${d}.`],
        commonMistakes: [`Giving x = ${x} instead of the number itself.`]
      };
    }
  },

  {
    id: 'rp-mixture-topped-up',
    version: 1,
    topicId: 'ratio-proportion',
    conceptId: 'rp-applications',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['rp-cross'],
    estimatedSeconds: 80,
    params(rng) {
      const [s1, s2] = rng.pick(COPRIME_PAIRS);
      const [a, b] = rng.chance(0.7) ? [s2, s1] : [s1, s2];
      const x = rng.int(2, 10);
      const addWater = rng.chance(0.6);
      if (addWater) {
        const c = rng.int(b + 1, b + 6);
        if (gcd(a, c) !== 1 || a * x > 120) return null;
        return { a, b, x, addWater, c, w: (c - b) * x };
      }
      const c = rng.int(a + 1, a + 6);
      if (gcd(c, b) !== 1 || b * x > 120) return null;
      return { a, b, x, addWater, c, w: (c - a) * x };
    },
    // Adding water: ask for the milk. Adding milk: ask for the water.
    answer: ({ a, b, x, addWater }) => (addWater ? a : b) * x,
    formatValue: (value) => format.litres(value),
    distractors: ({ a, b, x, addWater, w }) => [
      { value: (addWater ? b : a) * x, why: `gave the ${addWater ? 'water' : 'milk'} instead` },
      { value: (a + b) * x, why: 'gave the whole mixture' },
      { value: x, why: 'gave one part, not the quantity' },
      { value: (a + b) * x + w, why: 'gave the mixture after topping up' }
    ],
    verify({ a, b, addWater, c, w }, value) {
      if (addWater) {
        const water = (value * b) / a;
        return nearlyEqual(value * c, a * (water + w));
      }
      const milk = (value * a) / b;
      return nearlyEqual((milk + w) * b, c * value);
    },
    render({ a, b, x, addWater, c, w }) {
      const newRatio = addWater ? `${a} : ${c}` : `${c} : ${b}`;
      const asked = addWater ? 'milk' : 'water';
      const result = (addWater ? a : b) * x;
      const added = addWater ? 'water' : 'milk';
      const changedFrom = addWater ? b : a;
      return {
        question: `In a mixture, milk and water are in the ratio ${a} : ${b}. When ${w} litres of ${added} is added, the ratio becomes ${newRatio}. How much ${asked} is in the original mixture?`,
        explanation: `The ${asked} does not change, so keep its term fixed (${addWater ? a : b}). The ${added} term rises from ${changedFrom} to ${c}, i.e. by ${c - changedFrom} parts = ${w} litres, so one part = ${x} litres. ${asked[0].toUpperCase() + asked.slice(1)} = ${addWater ? a : b} × ${x} = ${result} litres.`,
        solutionSteps: [`${asked} stays the same: ${addWater ? a : b} parts in both ratios.`, `${added}: ${changedFrom} → ${c} parts, a rise of ${c - changedFrom} parts = ${w} litres.`, `One part = ${w} ÷ ${c - changedFrom} = ${x} litres.`, `${asked} = ${addWater ? a : b} × ${x} = ${result} litres.`],
        method: 'Hold the unchanged ingredient fixed; the change in the other term is the amount added.',
        hints: [`Adding ${added} does not change the amount of ${asked}.`, `The ${added} term went from ${changedFrom} to ${c} parts.`],
        commonMistakes: ['Giving the total mixture instead of one ingredient.']
      };
    }
  },

  /* ======================= direct and inverse proportion ======================= */
  {
    id: 'dp-spot-the-pair',
    version: 1,
    topicId: 'direct-inverse-proportion',
    conceptId: 'dp-identify',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dp-identify-f'],
    estimatedSeconds: 40,
    tags: ['trap'],
    params(rng) {
      const want = rng.pick(['direct', 'inverse', 'neither']);
      // A worked example of the same kind opens the question; it never appears as an option.
      const [reference, right] = rng.shuffle(PROPORTION_BANK[want]);
      if (want === 'neither') {
        const [d1, d2] = rng.shuffle(PROPORTION_BANK.direct);
        return { want, reference: reference.text, right: right.text, wrong: [d1.text, rng.pick(PROPORTION_BANK.inverse).text, d2.text] };
      }
      const other = want === 'direct' ? 'inverse' : 'direct';
      const neither = rng.shuffle(PROPORTION_BANK.neither);
      // Prefer "neither" pairs that look like the kind being asked for.
      const traps = [...neither.filter((s) => s.trap === want), ...neither.filter((s) => s.trap !== want)];
      return { want, reference: reference.text, right: right.text, wrong: [rng.pick(PROPORTION_BANK[other]).text, traps[0].text, traps[1].text] };
    },
    answer: ({ right }) => right,
    formatValue: (value) => value,
    distractors: ({ want, wrong }) => {
      if (want === 'neither') {
        return [
          { value: wrong[0], why: 'missed that one quantity is a fixed multiple of the other (direct proportion)' },
          { value: wrong[1], why: 'missed that the product of the two quantities is fixed (inverse proportion)' },
          { value: wrong[2], why: 'missed that one quantity is a fixed multiple of the other (direct proportion)' }
        ];
      }
      return [
        { value: wrong[0], why: `confused ${want === 'direct' ? 'inverse with direct' : 'direct with inverse'} proportion` },
        { value: wrong[1], why: want === 'direct' ? 'took "both increase" as direct proportion' : 'took "one falls as the other rises" as inverse proportion' },
        { value: wrong[2], why: 'chose a pair that changes together but not in proportion' }
      ];
    },
    verify: ({ want }, value) => {
      const scenario = findScenario(value);
      return Boolean(scenario) && classifyModel(scenario.model) === want;
    },
    render({ want, reference, right }) {
      const lower = (text) => text[0].toLowerCase() + text.slice(1);
      const label = { direct: 'directly proportional', inverse: 'inversely proportional', neither: 'neither directly nor inversely proportional' }[want];
      const test = {
        direct: 'y ÷ x stays constant: double one and the other doubles',
        inverse: 'x × y stays constant: double one and the other halves',
        neither: 'neither the ratio y ÷ x nor the product x × y stays constant'
      }[want];
      return {
        question: `${reference} are ${label}. Which of these pairs is also ${label}?`,
        explanation: `${right}: ${test}. ${want === 'neither' ? 'Each of the other pairs keeps a fixed ratio or a fixed product.' : `The other pairs either work the opposite way or change together without a constant ${want === 'direct' ? 'ratio' : 'product'} (a fixed starting charge, a square, or "what is left" all break proportion).`}`,
        solutionSteps: ['Test each pair: if one quantity doubles, what happens to the other?', `For ${lower(right)}, ${test}.`],
        method: { direct: 'Direct: y = kx (constant ratio).', inverse: 'Inverse: xy = k (constant product).', neither: 'Proportional pairs keep either y ÷ x or x × y constant.' }[want],
        hints: [
          'Ask: if one quantity doubles, does the other double, halve, or do something else?',
          want === 'neither' ? 'A fixed starting amount, a square or a cube, or "what is left" breaks proportion.' : '"One goes down as the other goes up" is not enough for inverse proportion; the product must stay fixed.'
        ],
        commonMistakes: ['Calling any "both increase" pair direct, even when there is a fixed starting amount.']
      };
    }
  },

  {
    id: 'dp-table-which-and-fill',
    version: 1,
    topicId: 'direct-inverse-proportion',
    conceptId: 'dp-identify',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dp-identify-f', 'dp-direct-f', 'dp-inverse-f'],
    answerDecimals: 2,
    estimatedSeconds: 60,
    params(rng) {
      const kind = rng.pick(['direct', 'inverse']);
      if (kind === 'direct') {
        const k = rng.int(2, 15);
        const xs = rng.shuffle([2, 3, 4, 5, 6, 8, 9, 10, 12, 15]).slice(0, 3);
        return { kind, k, xs, ys: xs.map((x) => k * x) };
      }
      const K = rng.pick([36, 48, 60, 72, 90, 120, 144, 180, 240, 360]);
      const divisors = [];
      for (let x = 2; x <= K / 2; x++) if (K % x === 0) divisors.push(x);
      const xs = rng.shuffle(divisors).slice(0, 3);
      return { kind, K, xs, ys: xs.map((x) => K / x) };
    },
    answer: ({ kind, k, K, xs }) => (kind === 'direct' ? k * xs[2] : K / xs[2]),
    formatValue: (value) => fmt(value),
    distractors: ({ kind, xs, ys }) => {
      const [x1, x2, x3] = xs;
      const [y1, y2] = ys;
      const linear = y2 + ((y2 - y1) / (x2 - x1)) * (x3 - x2);
      return [
        { value: kind === 'direct' ? (x1 * y1) / x3 : (y1 * x3) / x1, why: `assumed ${kind === 'direct' ? 'inverse' : 'direct'} proportion` },
        { value: linear, why: 'assumed y changes by a constant amount' },
        { value: kind === 'direct' ? y2 + (x3 - x2) : y2 - (x3 - x2), why: 'changed y by the same amount as x' },
        { value: (y1 * x2) / x3, why: 'mixed the two given pairs' }
      ];
    },
    verify({ xs, ys }, value) {
      // Decide the relationship from the data itself, then check the new pair fits it.
      const [x1, x2, x3] = xs;
      const [y1, y2] = ys;
      if (nearlyEqual(x1 * y1, x2 * y2)) return nearlyEqual(value * x3, x1 * y1);
      if (nearlyEqual(y1 / x1, y2 / x2)) return nearlyEqual(value / x3, y1 / x1);
      return false;
    },
    render({ kind, k, K, xs, ys }) {
      const [x1, x2, x3] = xs;
      const [y1, y2] = ys;
      const result = kind === 'direct' ? k * x3 : K / x3;
      const check = kind === 'direct' ? `y ÷ x = ${y1} ÷ ${x1} = ${y2} ÷ ${x2} = ${k}` : `x × y = ${x1} × ${y1} = ${x2} × ${y2} = ${K}`;
      return {
        question: `x and y are either directly or inversely proportional. When x = ${x1}, y = ${y1}, and when x = ${x2}, y = ${y2}. What is y when x = ${x3}?`,
        explanation: `${check}, so the relation is ${kind}. Then y = ${kind === 'direct' ? `${k} × ${x3}` : `${K} ÷ ${x3}`} = ${fmt(result)}.`,
        solutionSteps: [`Test the ratio: ${y1} ÷ ${x1} = ${fmt(y1 / x1)}, ${y2} ÷ ${x2} = ${fmt(y2 / x2)}.`, `Test the product: ${x1} × ${y1} = ${x1 * y1}, ${x2} × ${y2} = ${x2 * y2}.`, `The ${kind === 'direct' ? 'ratio' : 'product'} is constant, so it is ${kind} proportion.`, `y = ${kind === 'direct' ? `${k} × ${x3}` : `${K} ÷ ${x3}`} = ${fmt(result)}.`],
        method: 'Constant y ÷ x → direct; constant x × y → inverse.',
        hints: [`As x goes from ${x1} to ${x2}, does y go up or down?`, `Check whether y ÷ x or x × y is the same for both pairs.`],
        commonMistakes: ['Assuming the relation is direct without testing the pairs.']
      };
    }
  },

  /* ============================ weighted average ============================ */
  {
    id: 'wa-time-weighted-speed',
    version: 1,
    topicId: 'weighted-average',
    conceptId: 'wa-weights',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['wa-weights-f', 'wa-combine-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const p = rng.int(1, 5);
      const q = rng.int(1, 5);
      if (p === q || gcd(p, q) !== 1) return null;
      const u = rng.int(1, 2);
      const C = rng.int(30, 80);
      const m = rng.int(2, 8);
      const v1 = C - q * m;
      const v2 = C + p * m;
      if (v1 < 10) return null;
      const swap = rng.chance(0.5);
      return swap ? { t1: q * u, t2: p * u, v1: v2, v2: v1, C } : { t1: p * u, t2: q * u, v1, v2, C };
    },
    answer: ({ t1, t2, v1, v2 }) => (t1 * v1 + t2 * v2) / (t1 + t2),
    formatValue: (value) => format.kmh(value),
    distractors: ({ t1, t2, v1, v2 }) => [
      { value: (v1 + v2) / 2, why: 'averaged the two speeds' },
      { value: (2 * v1 * v2) / (v1 + v2), why: 'used 2xy ÷ (x + y), which is for equal distances' },
      { value: (t2 * v1 + t1 * v2) / (t1 + t2), why: 'paired the times with the wrong speeds' },
      { value: (t1 * v1 * v1 + t2 * v2 * v2) / (t1 * v1 + t2 * v2), why: 'weighted the speeds by distance instead of time' }
    ],
    verify({ t1, t2, v1, v2 }, value) {
      // Drive it hour by hour (in quarter-hour steps) and divide the distance by the time.
      let distance = 0;
      let time = 0;
      for (let i = 0; i < t1 * 4; i++) { distance += v1 / 4; time += 0.25; }
      for (let i = 0; i < t2 * 4; i++) { distance += v2 / 4; time += 0.25; }
      return nearlyEqual(distance / time, value);
    },
    render({ t1, t2, v1, v2, C }) {
      const d1 = t1 * v1;
      const d2 = t2 * v2;
      return {
        question: `A car travels for ${t1} hour${t1 === 1 ? '' : 's'} at ${v1} km/hr and then for ${t2} hour${t2 === 1 ? '' : 's'} at ${v2} km/hr. What is its average speed for the whole journey?`,
        explanation: `Average speed = total distance ÷ total time = (${d1} + ${d2}) ÷ (${t1} + ${t2}) = ${d1 + d2} ÷ ${t1 + t2} = ${C} km/hr. The speeds are weighted by the time spent at each.`,
        solutionSteps: [`Distances: ${t1} × ${v1} = ${d1} km and ${t2} × ${v2} = ${d2} km.`, `Total: ${d1 + d2} km in ${t1 + t2} hours.`, `Average = ${d1 + d2} ÷ ${t1 + t2} = ${C} km/hr.`],
        method: 'Average speed = total distance ÷ total time (time-weighted mean of the speeds).',
        hints: ['The car spends different lengths of time at each speed.', 'Find the total distance first.'],
        commonMistakes: [`Averaging ${v1} and ${v2} directly.`]
      };
    }
  },

  {
    id: 'wa-distance-weighted-speed',
    version: 1,
    topicId: 'weighted-average',
    conceptId: 'wa-weights',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'km/hr',
    formulaIds: ['wa-weights-f'],
    estimatedSeconds: 75,
    params(rng) {
      const p = rng.int(1, 5);
      const q = rng.int(1, 5);
      if (p === q || gcd(p, q) !== 1) return null;
      const h = rng.pick([0.5, 1, 1.5, 2]);
      const C = rng.int(30, 80);
      const m = rng.int(2, 8);
      const v1 = C - q * m;
      const v2 = C + p * m;
      if (v1 < 10) return null;
      const d1 = v1 * p * h;
      const d2 = v2 * q * h;
      if (!Number.isInteger(d1) || !Number.isInteger(d2)) return null;
      return rng.chance(0.5) ? { d1, d2, v1, v2 } : { d1: d2, d2: d1, v1: v2, v2: v1 };
    },
    answer: ({ d1, d2, v1, v2 }) => (d1 + d2) / (d1 / v1 + d2 / v2),
    // Substitute back: travelling the whole route at the answer must take the same total time.
    verify: ({ d1, d2, v1, v2 }, value) => nearlyEqual((d1 + d2) / value, d1 / v1 + d2 / v2),
    render({ d1, d2, v1, v2 }) {
      const t1 = d1 / v1;
      const t2 = d2 / v2;
      const avg = (d1 + d2) / (t1 + t2);
      return {
        question: `A train travels the first ${d1} km at ${v1} km/hr and the next ${d2} km at ${v2} km/hr. What is its average speed for the whole journey, in km/hr?`,
        explanation: `Times: ${d1} ÷ ${v1} = ${fmt(t1)} h and ${d2} ÷ ${v2} = ${fmt(t2)} h. Average speed = ${d1 + d2} ÷ ${fmt(t1 + t2)} = ${fmt(avg)} km/hr.`,
        solutionSteps: [`Time for part 1 = ${d1} ÷ ${v1} = ${fmt(t1)} h.`, `Time for part 2 = ${d2} ÷ ${v2} = ${fmt(t2)} h.`, `Average = (${d1} + ${d2}) ÷ ${fmt(t1 + t2)} = ${fmt(avg)} km/hr.`],
        method: 'Average speed = total distance ÷ total time.',
        hints: ['Speeds must be weighted by time, so find the time for each part.', `Total distance is ${d1 + d2} km.`],
        commonMistakes: [`Taking (${v1} + ${v2}) ÷ 2 = ${fmt((v1 + v2) / 2)}.`]
      };
    }
  },

  /* ============================== weighted mean ============================== */
  {
    id: 'wm-k-times-weight',
    version: 1,
    topicId: 'weighted-mean',
    conceptId: 'wm-compare',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['wm-def-f', 'wm-compare-f'],
    estimatedSeconds: 45,
    params(rng) {
      const x = rng.int(10, 60);
      const k = rng.int(2, 5);
      const m = rng.int(1, 8);
      return { x, y: x + (1 + k) * m, k, heavyHigh: rng.chance(0.6) };
    },
    answer: ({ x, y, k, heavyHigh }) => (heavyHigh ? x + k * y : k * x + y) / (1 + k),
    formatValue: (value) => fmt(value),
    distractors: ({ x, y, k, heavyHigh }) => [
      { value: (x + y) / 2, why: 'took the simple mean' },
      { value: (heavyHigh ? k * x + y : x + k * y) / (1 + k), why: 'gave the extra weight to the wrong value' },
      { value: (heavyHigh ? x + k * y : k * x + y) / k, why: `divided by ${k} instead of ${k + 1}` },
      { value: heavyHigh ? y : x, why: 'gave the heavier value only' }
    ],
    verify({ x, y, k, heavyHigh }, value) {
      // See-saw check: distances to each value are in the inverse ratio of the weights.
      const toX = value - x;
      const toY = y - value;
      return heavyHigh ? nearlyEqual(toX, k * toY) : nearlyEqual(toY, k * toX);
    },
    render({ x, y, k, heavyHigh }) {
      const heavy = heavyHigh ? y : x;
      const light = heavyHigh ? x : y;
      const wm = (heavyHigh ? x + k * y : k * x + y) / (1 + k);
      return {
        question: `What is the weighted mean of ${x} and ${y}, if ${heavy} carries ${timesWord(k)} the weight of ${light}?`,
        explanation: `Weights ${light} : ${heavy} = 1 : ${k}. Mean = (1 × ${light} + ${k} × ${heavy}) ÷ ${1 + k} = ${light + k * heavy} ÷ ${1 + k} = ${fmt(wm)}. It sits closer to ${heavy}, which has the larger weight.`,
        solutionSteps: [`Weights: 1 for ${light}, ${k} for ${heavy}.`, `Σ(w·x) = ${light} + ${k} × ${heavy} = ${light + k * heavy}.`, `Divide by Σw = ${1 + k}: ${fmt(wm)}.`],
        method: 'Weighted mean = Σ(w·x) ÷ Σw; it leans towards the heavier value.',
        hints: [`Use weights 1 and ${k}.`, `Divide by the total weight, ${1 + k}.`],
        commonMistakes: [`Taking the simple mean ${fmt((x + y) / 2)}.`]
      };
    }
  },

  {
    id: 'wm-weights-from-mean',
    version: 1,
    topicId: 'weighted-mean',
    conceptId: 'wm-compare',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['wm-compare-f', 'wm-def-f'],
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const p = rng.int(1, 7);
      const q = rng.int(1, 7);
      if (p === q || gcd(p, q) !== 1) return null;
      const a = rng.int(10, 60);
      const m = rng.int(1, 6);
      return { p, q, a, b: a + (p + q) * m, M: a + q * m };
    },
    answer: ({ p, q }) => ratioText([p, q]),
    formatValue: (value) => value,
    distractors: ({ p, q, a, b, M }) => [
      { value: ratioText([q, p]), why: 'gave the larger weight to the value further from the mean' },
      { value: ratioText(reduceRatio(M - a, b - a)), why: 'compared one distance with the whole range' },
      { value: '1 : 1', why: 'assumed equal weights' },
      { value: ratioText(reduceRatio(a, b)), why: 'used the values themselves as weights' }
    ],
    verify({ a, b, M }, value) {
      const [wa, wb] = parseRatio(value);
      return nearlyEqual((wa * a + wb * b) / (wa + wb), M);
    },
    render({ p, q, a, b, M }) {
      const closer = M - a < b - M ? a : b;
      return {
        question: `The weighted mean of ${a} and ${b} is ${M}. In what ratio are the weights of ${a} and ${b}?`,
        explanation: `${M} is ${M - a} above ${a} and ${b - M} below ${b}. The weights are in the inverse ratio of these distances: ${b - M} : ${M - a}${b - M === p ? '' : ` = ${p} : ${q}`}. The mean leans towards ${closer}, which carries more weight.`,
        solutionSteps: [`Distance from ${a}: ${M} − ${a} = ${M - a}.`, `Distance from ${b}: ${b} − ${M} = ${b - M}.`, `Weight of ${a} : weight of ${b} = ${b - M} : ${M - a}${b - M === p ? '' : ` = ${p} : ${q}`}.`],
        method: 'Weights are inversely proportional to the distances from the mean.',
        hints: [`Is ${M} closer to ${a} or to ${b}?`, 'The closer value has the larger weight.'],
        commonMistakes: ['Putting the distances the wrong way round.']
      };
    }
  },

  /* ============================== problems on ages ============================== */
  {
    id: 'age-ago-to-hence',
    version: 1,
    topicId: 'problems-on-ages',
    conceptId: 'age-translate',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['age-shift'],
    estimatedSeconds: 30,
    params(rng) {
      return { n: rng.int(2, 15), x: rng.int(5, 50), m: rng.int(2, 20), name: rng.pick(NAMES) };
    },
    answer: ({ n, x, m }) => x + n + m,
    formatValue: (value) => format.years(value),
    distractors: ({ n, x, m }) => [
      { value: x + m, why: 'forgot to bring the age up to today first' },
      { value: x + m - n, why: 'subtracted the years-ago gap instead of adding it' },
      { value: x + n, why: 'gave the present age' },
      { value: x + n - m, why: 'went back in time instead of forward' }
    ],
    verify: ({ n, x, m }, value) => value - m - n === x,
    render({ n, x, m, name }) {
      return {
        question: `${n} years ago, ${name} was ${x} years old. How old will ${name} be ${m} years from now?`,
        explanation: `Today ${name} is ${x} + ${n} = ${x + n}. In ${m} years: ${x + n} + ${m} = ${x + n + m} years.`,
        solutionSteps: [`Present age = ${x} + ${n} = ${x + n}.`, `Age in ${m} years = ${x + n} + ${m} = ${x + n + m}.`],
        method: '"n years ago" means subtract n from today; "n years hence" means add n.',
        hints: [`First work out ${name}'s age today.`, `Then move ${m} years forward.`],
        commonMistakes: [`Adding ${m} to ${x} without first adding ${n}.`]
      };
    }
  },

  {
    id: 'age-times-as-old-shift',
    version: 1,
    topicId: 'problems-on-ages',
    conceptId: 'age-translate',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['age-shift'],
    estimatedSeconds: 75,
    params(rng) {
      const hence = rng.chance(0.5);
      let k;
      let j;
      if (hence) {
        k = rng.int(3, 6);
        j = rng.int(2, k - 1);
      } else {
        k = rng.int(2, 4);
        j = rng.int(k + 1, k + 4);
      }
      // The son's age is a multiple of this step, so the number of years comes out whole.
      const step = (j - 1) / gcd(j - 1, Math.abs(k - j));
      const s = multipleIn(rng, step, Math.max(3, Math.ceil(18 / (k - 1))), Math.floor(75 / k));
      if (!s) return null;
      const n = (s * Math.abs(k - j)) / (j - 1);
      if (n < 2 || n > 25) return null;
      if (!hence && s - n < 1) return null;
      return { hence, k, j, s, n };
    },
    answer: ({ hence, k, j, n }) => (hence ? (n * (j - 1)) / (k - j) : (n * (j - 1)) / (j - k)),
    formatValue: (value) => format.years(value),
    distractors: ({ hence, k, s, n }) => [
      { value: hence ? s + n : s - n, why: `gave the son's age ${hence ? `in ${n} years` : `${n} years ago`}` },
      { value: k * s, why: "gave the father's age" },
      { value: n, why: 'gave the number of years' },
      { value: hence ? (s - n > 0 ? s - n : null) : s + n, why: 'moved the wrong way in time' },
      { value: hence ? k * s + n : k * s - n, why: "gave the father's age at that time" }
    ],
    verify: ({ hence, k, j, n }, value) => {
      const father = k * value;
      return hence ? father + n === j * (value + n) : father - n === j * (value - n);
    },
    render({ hence, k, j, s, n }) {
      const when = hence ? `In ${n} years` : `${n} years ago`;
      const verb = hence ? 'will be' : 'was';
      const sign = hence ? '+' : '−';
      return {
        question: `A father is ${timesWord(k)} as old as his son. ${when}, he ${verb} ${timesWord(j)} as old as his son. How old is the son now?`,
        explanation: `Let the son be x, so the father is ${k}x. ${when}: ${k}x ${sign} ${n} = ${j}(x ${sign} ${n}). Solving gives x = ${s}, so the son is ${s} (father ${k * s}).`,
        solutionSteps: [`Now: son x, father ${k}x.`, `${when}: son x ${sign} ${n}, father ${k}x ${sign} ${n}.`, `${k}x ${sign} ${n} = ${j}x ${sign} ${j * n} → ${Math.abs(k - j)}x = ${Math.abs(j * n - n)} → x = ${s}.`, `Check: ${k * s} ${sign} ${n} = ${hence ? k * s + n : k * s - n} and ${j} × ${hence ? s + n : s - n} = ${j * (hence ? s + n : s - n)} ✓`],
        method: 'Write present ages with one unknown, shift both by the same years, then form the equation.',
        hints: [`Let the son's present age be x; the father is ${k}x.`, `${hence ? `Add ${n} to` : `Subtract ${n} from`} BOTH ages before using "${timesWord(j)}".`],
        commonMistakes: [`Shifting only the father's age by ${n} years.`]
      };
    }
  },

  {
    id: 'age-born-when-older',
    version: 1,
    topicId: 'problems-on-ages',
    conceptId: 'age-difference',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['age-gap'],
    estimatedSeconds: 30,
    params(rng) {
      const [younger, older] = twoNames(rng);
      return { g: rng.int(2, 35), z: rng.int(5, 60), younger, older };
    },
    answer: ({ g, z }) => z + g,
    formatValue: (value) => format.years(value),
    distractors: ({ g, z }) => [
      { value: z, why: 'ignored the age gap' },
      { value: z - g, why: 'subtracted the gap instead of adding it' },
      { value: z + 2 * g, why: 'added the gap twice' },
      { value: 2 * z, why: 'doubled the age' }
    ],
    verify({ g, z }, value) {
      // Walk forward year by year from the day the younger one was born.
      let young = 0;
      let old = g;
      while (young < z) { young += 1; old += 1; }
      return old === value;
    },
    render({ g, z, younger, older }) {
      return {
        question: `When ${younger} was born, ${older} was ${g} years old. How old will ${older} be when ${younger} turns ${z}?`,
        explanation: `The gap between their ages is ${g} years and never changes. So when ${younger} is ${z}, ${older} is ${z} + ${g} = ${z + g}.`,
        solutionSteps: [`Age gap = ${g} years, fixed for life.`, `${older} = ${z} + ${g} = ${z + g}.`],
        method: 'The difference between two ages is the same at every point in time.',
        hints: [`How much older is ${older}, and does that ever change?`, `Add the gap to ${z}.`],
        commonMistakes: ['Thinking the gap grows or shrinks over time.']
      };
    }
  },

  {
    id: 'age-gap-then-multiple',
    version: 1,
    topicId: 'problems-on-ages',
    conceptId: 'age-difference',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['age-gap', 'age-shift'],
    estimatedSeconds: 65,
    params(rng) {
      const hence = rng.chance(0.4);
      const k = rng.int(2, 5);
      const t = rng.int(2, 15);
      const n = rng.int(2, 15);
      if (hence && t - n < 1) return null;
      const [a, b] = twoNames(rng);
      return { hence, k, t, n, d: (k - 1) * t, a, b };
    },
    answer: ({ hence, t, n }) => (hence ? t - n : t + n),
    formatValue: (value) => format.years(value),
    distractors: ({ hence, k, t, n, d }) => [
      { value: t, why: `gave B's age ${hence ? `in ${n} years` : `${n} years ago`}` },
      // An age of 0 is no real temptation; a negative value is dropped by the engine.
      { value: hence ? t + n : t - n > 0 ? t - n : -1, why: 'moved the wrong way in time' },
      { value: d / k + (hence ? -n : n), why: `divided the gap by ${k} instead of ${k - 1}` },
      { value: (hence ? t - n : t + n) + d, why: "gave A's age" }
    ],
    verify({ hence, k, n, d }, value) {
      const older = value + d;
      return hence ? older + n === k * (value + n) : older - n === k * (value - n);
    },
    render({ hence, k, t, n, d, a, b }) {
      const when = hence ? `In ${n} years` : `${n} years ago`;
      const result = hence ? t - n : t + n;
      const gapIs = k === 2 ? `equal to ${b}'s age` : `${k - 1} times ${b}'s age`;
      const then = k === 2 ? `${d}` : `${d} ÷ ${k - 1} = ${t}`;
      return {
        question: `${a} is ${d} years older than ${b}. ${when}, ${a} ${hence ? 'will be' : 'was'} ${timesWord(k)} as old as ${b}. How old is ${b} now?`,
        explanation: `The gap stays ${d} years. ${when}, ${a} ${hence ? 'will be' : 'was'} ${timesWord(k)} ${b}'s age, so the gap of ${d} is ${gapIs} at that time: ${b} ${hence ? 'will be' : 'was'} ${then}. So ${b} is now ${t} ${hence ? '−' : '+'} ${n} = ${result}.`,
        solutionSteps: [`At that time ${a} = ${k} × ${b}, so the gap = ${k - 1} × ${b}'s age then.`, `${b}'s age then = ${then}.`, `${b} now = ${t} ${hence ? '−' : '+'} ${n} = ${result}.`],
        method: 'Use the constant gap: gap = (k − 1) × the younger age at that time.',
        hints: [`The ${d}-year gap is the same ${hence ? 'then' : 'back then'} as now.`, `If one age is ${timesWord(k)} the other, the gap is ${k === 2 ? 'equal to' : `${k - 1} times`} the smaller age.`],
        commonMistakes: [`Stopping at ${b}'s age at that time (${t}).`]
      };
    }
  },

  {
    id: 'age-group-total-shift',
    version: 1,
    topicId: 'problems-on-ages',
    conceptId: 'age-applications',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['age-sum'],
    estimatedSeconds: 35,
    params(rng) {
      const m = rng.int(2, 7);
      const n = rng.int(2, 12);
      const S = rng.int(m * 15, m * 45);
      const hence = rng.chance(0.6);
      if (!hence && S - m * n < m * 3) return null;
      return { m, n, S, hence, group: rng.pick(['friends', 'siblings', 'colleagues']) };
    },
    answer: ({ m, n, S, hence }) => (hence ? S + m * n : S - m * n),
    verify({ m, n, S, hence }, value) {
      // Split the total into actual ages, shift each person, and add up again.
      const ages = Array.from({ length: m }, (_, i) => Math.floor(S / m) + (i < S % m ? 1 : 0));
      const shifted = ages.map((age) => (hence ? age + n : age - n));
      return shifted.reduce((a, b) => a + b, 0) === value;
    },
    render({ m, n, S, hence, group }) {
      const result = hence ? S + m * n : S - m * n;
      return {
        question: `The ages of ${COUNT_WORDS[m]} ${group} add up to ${S} years today. What ${hence ? `will their total age be in ${n} years` : `was their total age ${n} years ago`}? (Answer in years)`,
        explanation: `Each of the ${m} people ${hence ? 'gains' : 'was'} ${n} years ${hence ? '' : 'younger'}, so the total ${hence ? 'rises' : 'falls'} by ${m} × ${n} = ${m * n}: ${S} ${hence ? '+' : '−'} ${m * n} = ${result}.`,
        solutionSteps: [`Change per person = ${n} years.`, `Change in the total = ${m} × ${n} = ${m * n}.`, `Total = ${S} ${hence ? '+' : '−'} ${m * n} = ${result}.`],
        method: 'New sum = old sum ± (number of people × years).',
        hints: [`Every one of the ${m} people's ages changes by ${n}.`, `So the total changes by ${m} × ${n}.`],
        commonMistakes: [`Changing the total by only ${n}.`]
      };
    }
  },

  {
    id: 'age-family-new-member',
    version: 1,
    topicId: 'problems-on-ages',
    conceptId: 'age-applications',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['age-sum'],
    estimatedSeconds: 55,
    params(rng) {
      const m = rng.int(3, 7);
      const b = rng.int(1, 4);
      const lo = Math.ceil((15 - b) / m);
      const hi = Math.floor((40 - b) / m);
      if (lo > hi) return null;
      const j = rng.int(Math.max(1, lo), hi);
      const N = b + m * j;
      return { m, b, A: N + j };
    },
    answer: ({ m, b, A }) => (m * A + b) / (m + 1),
    formatValue: (value) => format.years(value),
    distractors: ({ m, b, A }) => [
      { value: (A + b) / 2, why: "averaged the old average with the baby's age" },
      { value: A - b, why: "subtracted the baby's age" },
      { value: (m * A + b) / m, why: 'divided by the old count' },
      { value: A, why: 'assumed the average does not change' }
    ],
    verify({ m, b, A }, value) {
      const ages = [...Array(m).fill(A), b];
      return nearlyEqual(ages.reduce((s, x) => s + x, 0) / ages.length, value);
    },
    render({ m, b, A }) {
      const N = (m * A + b) / (m + 1);
      return {
        question: `The average age of a family of ${m} members is ${A} years. A baby aged ${b} year${b === 1 ? '' : 's'} joins the family. What is the new average age of the family?`,
        explanation: `Total before = ${m} × ${A} = ${m * A}. Add the baby: ${m * A} + ${b} = ${m * A + b}. New average = ${m * A + b} ÷ ${m + 1} = ${fmt(N)} years.`,
        solutionSteps: [`Old total = ${m} × ${A} = ${m * A}.`, `New total = ${m * A} + ${b} = ${m * A + b}.`, `New average = ${m * A + b} ÷ ${m + 1} = ${fmt(N)}.`],
        method: 'Convert the average to a total, adjust it, then divide by the new count.',
        hints: ['Turn the average into the total age of the family.', `There are now ${m + 1} members.`],
        commonMistakes: [`Dividing by ${m} instead of ${m + 1}.`]
      };
    }
  },

  {
    id: 'age-sum-and-past-multiple',
    version: 1,
    topicId: 'problems-on-ages',
    conceptId: 'age-applications',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['age-shift', 'age-sum'],
    estimatedSeconds: 85,
    params(rng) {
      const k = rng.int(3, 7);
      const x = rng.int(Math.ceil(18 / (k - 1)), 14);
      const n = rng.int(2, 10);
      if (k * x + n > 80) return null;
      return { k, x, n, S: (k + 1) * x + 2 * n, pair: rng.pick([['father', 'son'], ['mother', 'daughter']]) };
    },
    answer: ({ k, n, S }) => (S - 2 * n) / (k + 1) + n,
    formatValue: (value) => format.years(value),
    distractors: ({ k, x, n, S }) => [
      { value: x, why: `gave the age ${n} years ago` },
      { value: S / (k + 1), why: 'split the present sum without allowing for the years' },
      { value: k * x + n, why: "gave the parent's age" },
      { value: (S - n) / (k + 1), why: `took ${n} off the sum only once` }
    ],
    verify({ k, n, S }, value) {
      const parent = S - value;
      return parent - n === k * (value - n);
    },
    render({ k, x, n, S, pair }) {
      const [parent, child] = pair;
      return {
        question: `The sum of the present ages of a ${parent} and ${child === 'son' ? 'his' : 'her'} ${child} is ${S} years. ${n} years ago, the ${parent} was ${timesWord(k)} as old as the ${child}. How old is the ${child} now?`,
        explanation: `${n} years ago their total was ${S} − 2 × ${n} = ${S - 2 * n}. Then the ${parent} was ${k} times the ${child}, so the ${child} was ${S - 2 * n} ÷ ${k + 1} = ${x}. Now the ${child} is ${x} + ${n} = ${x + n}.`,
        solutionSteps: [`Sum ${n} years ago = ${S} − ${2 * n} = ${S - 2 * n} (both were ${n} years younger).`, `${child} then = ${S - 2 * n} ÷ (${k} + 1) = ${x}.`, `${child} now = ${x} + ${n} = ${x + n}.`],
        method: 'Shift the sum back for both people, split it in the stated ratio, then come forward again.',
        hints: [`${n} years ago, both people were ${n} years younger, so the sum was ${2 * n} less.`, `Then split that sum into ${k} + 1 = ${k + 1} equal parts.`],
        commonMistakes: [`Giving the ${child}'s age ${n} years ago (${x}).`]
      };
    }
  }
];
