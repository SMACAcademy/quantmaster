/** Time and work, time-speed-distance, ages and mixtures templates. */

import { fmt, format, gcd, hasAtMostDecimals, nearlyEqual, ratioText, reduceRatio } from '../core.js';

function parseRatio(text) {
  return String(text)
    .split(':')
    .map((part) => Number(part.trim()));
}

/** Ratios a : b (coprime, 1–9) where b's share is a percentage with at most 2 decimals. */
const CLEAN_PERCENT_RATIOS = [];
for (let a = 1; a <= 9; a++) {
  for (let b = 1; b <= 9; b++) {
    if (a !== b && gcd(a, b) === 1 && hasAtMostDecimals((100 * b) / (a + b), 2)) CLEAN_PERCENT_RATIOS.push([a, b]);
  }
}

/** Pairs (a, b) whose combined work time is a whole number of days T. */
function workTriple(rng) {
  const p = rng.int(1, 5);
  const q = rng.int(1, 5);
  if (p === q || gcd(p, q) !== 1) return null;
  // T as a multiple of p·q guarantees both individual times are whole days.
  const T = p * q * rng.int(1, 6);
  const a = (T * (p + q)) / p;
  const b = (T * (p + q)) / q;
  if (a > 90 || b > 90 || T < 2) return null;
  return { a, b, T };
}

export const rateTemplates = [
  /* ========================== time and work ========================== */
  {
    id: 'tw-together',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-combined',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tw-combined-formula'],
    estimatedSeconds: 50,
    params: (rng) => workTriple(rng),
    answer: ({ T }) => T,
    formatValue: (value) => format.days(value),
    distractors: ({ a, b }) => [
      { value: (a + b) / 2, why: 'averaged the times' },
      { value: a + b, why: 'added the times' },
      { value: Math.abs(a - b), why: 'subtracted the times' },
      { value: Math.min(a, b) / 2, why: 'halved the faster time' }
    ],
    verify: ({ a, b }, value) => nearlyEqual(1 / a + 1 / b, 1 / value),
    render({ a, b, T }) {
      const units = (a * b) / gcd(a, b);
      return {
        question: `A can finish a job in ${a} days and B can finish it in ${b} days. How long will they take working together?`,
        explanation: `Together they do 1/${a} + 1/${b} = 1/${T} of the job per day, so they need ${T} days.`,
        solutionSteps: [
          `Call the job ${units} units (the LCM of ${a} and ${b}).`,
          `A does ${units / a} units/day and B does ${units / b} units/day.`,
          `Together: ${units / a + units / b} units/day, so ${units} ÷ ${units / a + units / b} = ${T} days.`
        ],
        method: 'Add the daily rates, then invert.',
        hints: [
          'Convert each time into a daily rate: A does 1/' + a + ' of the job per day.',
          `Or call the job ${units} units to avoid fractions.`,
          'Add the rates and invert the total.'
        ],
        commonMistakes: ['Averaging or adding the two times — working together must be faster than either alone.']
      };
    }
  },

  {
    id: 'tw-find-other',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-combined',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tw-combined-formula'],
    estimatedSeconds: 65,
    params: (rng) => {
      const triple = workTriple(rng);
      return triple ? { ...triple, knownIsA: rng.chance(0.5) } : null;
    },
    answer: ({ a, b, knownIsA }) => (knownIsA ? b : a),
    formatValue: (value) => format.days(value),
    distractors: ({ a, b, T, knownIsA }) => {
      const known = knownIsA ? a : b;
      return [
        { value: known - T, why: 'subtracted the times' },
        { value: known + T, why: 'added the times' },
        { value: (known + T) / 2, why: 'averaged the times' },
        { value: 2 * T, why: 'doubled the joint time' }
      ];
    },
    verify: ({ a, b, T, knownIsA }, value) => nearlyEqual(1 / (knownIsA ? a : b) + 1 / value, 1 / T),
    render({ a, b, T, knownIsA }) {
      const known = knownIsA ? a : b;
      const unknown = knownIsA ? b : a;
      const [knownName, unknownName] = knownIsA ? ['A', 'B'] : ['B', 'A'];
      return {
        question: `A and B together can finish a job in ${T} days. ${knownName} alone takes ${known} days. How long would ${unknownName} take alone?`,
        explanation: `${unknownName}'s rate = 1/${T} − 1/${known} = 1/${unknown}, so ${unknownName} alone takes ${unknown} days.`,
        solutionSteps: [
          `Joint rate = 1/${T}; ${knownName}'s rate = 1/${known}.`,
          `${unknownName}'s rate = 1/${T} − 1/${known} = 1/${unknown}.`,
          `${unknownName} alone takes ${unknown} days.`
        ],
        method: 'Subtract rates, not times.',
        hints: [
          'Rates subtract just as cleanly as they add.',
          `Work out 1/${T} − 1/${known}.`,
          'Invert the result to get days.'
        ],
        commonMistakes: [`Subtracting the times: ${known} − ${T}.`]
      };
    }
  },

  {
    id: 'tw-mandays',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-mandays',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tw-mandays-formula'],
    estimatedSeconds: 45,
    params(rng) {
      const M1 = rng.int(4, 30);
      const D1 = rng.int(6, 40);
      const work = M1 * D1;
      const divisors = [];
      for (let m = 2; m <= 60; m++) if (work % m === 0 && m !== M1 && work / m <= 200) divisors.push(m);
      if (!divisors.length) return null;
      return { M1, D1, M2: rng.pick(divisors) };
    },
    answer: ({ M1, D1, M2 }) => (M1 * D1) / M2,
    formatValue: (value) => format.days(value),
    distractors: ({ M1, D1, M2 }) => [
      { value: (D1 * M2) / M1, why: 'treated the relationship as direct' },
      { value: M1 * D1, why: 'gave the total man-days' },
      { value: D1 + (M1 - M2), why: 'adjusted days by the change in workers' },
      { value: D1, why: 'assumed the time stays the same' }
    ],
    verify: ({ M1, D1, M2 }, value) => nearlyEqual(M2 * value, M1 * D1),
    render({ M1, D1, M2 }) {
      const D2 = (M1 * D1) / M2;
      return {
        question: `${M1} workers can complete a job in ${D1} days. How many days would ${M2} workers take, working at the same rate?`,
        explanation: `The job needs ${M1} × ${D1} = ${M1 * D1} worker-days, so ${M2} workers need ${M1 * D1} ÷ ${M2} = ${fmt(D2)} days.`,
        solutionSteps: [
          `Total work = ${M1} × ${D1} = ${M1 * D1} worker-days.`,
          `Days for ${M2} workers = ${M1 * D1} ÷ ${M2}.`,
          `= ${fmt(D2)} days.`
        ],
        method: 'M₁ × D₁ = M₂ × D₂.',
        hints: [
          'The total amount of work stays the same.',
          `Express it as worker-days: ${M1} × ${D1}.`,
          `${M2 > M1 ? 'More' : 'Fewer'} workers means ${M2 > M1 ? 'fewer' : 'more'} days.`
        ],
        commonMistakes: ['Scaling the days in the same direction as the workers.']
      };
    }
  },

  /* ====================== time, speed, distance ====================== */
  {
    id: 'tsd-convert',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-units',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tsd-conversion'],
    answerDecimals: 0,
    estimatedSeconds: 30,
    params(rng) {
      const toMs = rng.chance(0.5);
      return toMs ? { toMs, input: 18 * rng.int(1, 8) } : { toMs, input: 5 * rng.int(1, 12) };
    },
    answer: ({ toMs, input }) => (toMs ? (input * 5) / 18 : (input * 18) / 5),
    formatValue: (value, { toMs }) => (toMs ? format.ms(value) : format.kmh(value)),
    distractors: ({ toMs, input }) =>
      toMs
        ? [
            { value: (input * 18) / 5, why: 'used the reverse factor' },
            { value: (input * 1000) / 60, why: 'converted to metres per minute' },
            { value: input, why: 'did not convert' }
          ]
        : [
            { value: (input * 5) / 18, why: 'used the reverse factor' },
            { value: input * 60, why: 'converted to metres per minute' },
            { value: input, why: 'did not convert' }
          ],
    verify: ({ toMs, input }, value) =>
      toMs ? nearlyEqual((input * 1000) / 3600, value) : nearlyEqual((input * 3600) / 1000, value),
    render({ toMs, input }) {
      return {
        question: toMs ? `Convert ${input} km/hr into metres per second.` : `Convert ${input} m/s into kilometres per hour.`,
        explanation: toMs
          ? `${input} × 5/18 = ${fmt((input * 5) / 18)} m/s.`
          : `${input} × 18/5 = ${fmt((input * 18) / 5)} km/hr.`,
        solutionSteps: [
          toMs ? '1 km/hr = 1000 m ÷ 3600 s = 5/18 m/s.' : '1 m/s = 3600 m per hour = 3.6 km/hr = 18/5 km/hr.',
          toMs ? `${input} × 5/18.` : `${input} × 18/5.`,
          toMs ? `= ${fmt((input * 5) / 18)} m/s.` : `= ${fmt((input * 18) / 5)} km/hr.`
        ],
        method: toMs ? 'km/hr → m/s: × 5/18.' : 'm/s → km/hr: × 18/5.',
        hints: [
          toMs ? 'A speed in m/s is a smaller number than the same speed in km/hr.' : 'A speed in km/hr is a larger number than the same speed in m/s.',
          toMs ? 'Multiply by 5 and divide by 18.' : 'Multiply by 18 and divide by 5.'
        ],
        commonMistakes: ['Using 18/5 and 5/18 the wrong way round.']
      };
    }
  },

  {
    id: 'tsd-average-speed',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-average',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tsd-average-speed'],
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const [x, y] = rng.pick([
        [2, 6],
        [3, 6],
        [6, 12],
        [4, 12],
        [10, 15],
        [20, 30],
        [40, 60],
        [5, 20],
        [12, 24],
        [9, 18],
        [15, 30],
        [21, 28],
        [30, 45]
      ]);
      const s = rng.pick([1, 2, 3, 5]);
      const X = x * s;
      const Y = y * s;
      if (X < 10 || Y > 150) return null;
      return rng.chance(0.5) ? { x: X, y: Y } : { x: Y, y: X };
    },
    answer: ({ x, y }) => (2 * x * y) / (x + y),
    formatValue: (value) => format.kmh(value),
    distractors: ({ x, y }) => [
      { value: (x + y) / 2, why: 'averaged the speeds' },
      { value: (x * y) / (x + y), why: 'forgot the factor of 2' },
      { value: x + y, why: 'added the speeds' }
    ],
    verify: ({ x, y }, value) => {
      const distance = 1;
      return nearlyEqual((2 * distance) / (distance / x + distance / y), value);
    },
    render({ x, y }) {
      const avg = (2 * x * y) / (x + y);
      const d = (x * y) / gcd(x, y);
      return {
        question: `A car travels to a town at ${x} km/hr and returns along the same road at ${y} km/hr. What is its average speed for the round trip?`,
        explanation: `For equal distances, average speed = 2xy ÷ (x + y) = (2 × ${x} × ${y}) ÷ ${x + y} = ${fmt(avg)} km/hr.`,
        solutionSteps: [
          `Take the one-way distance as ${d} km.`,
          `Times: ${d} ÷ ${x} = ${fmt(d / x)} hr and ${d} ÷ ${y} = ${fmt(d / y)} hr.`,
          `Average = ${2 * d} km ÷ ${fmt(d / x + d / y)} hr = ${fmt(avg)} km/hr.`
        ],
        method: 'Total distance ÷ total time (2xy ÷ (x + y) for equal distances).',
        hints: [
          `The answer must be below ${fmt((x + y) / 2)} — more time is spent at the slower speed.`,
          `Pick a convenient distance such as ${d} km and work out both times.`,
          'Divide the total distance by the total time.'
        ],
        commonMistakes: ['Averaging the two speeds.']
      };
    }
  },

  {
    id: 'tsd-train-platform',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-units',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tsd-basic', 'tsd-conversion'],
    estimatedSeconds: 80,
    params(rng) {
      const kmh = 18 * rng.int(2, 6);
      const ms = (kmh * 5) / 18;
      const t = rng.int(8, 40);
      const total = ms * t;
      const L = rng.int(8, 30) * 10;
      const P = total - L;
      if (P < 50 || P % 10 !== 0) return null;
      return { kmh, ms, t, L, P };
    },
    answer: ({ t }) => t,
    formatValue: (value) => format.seconds(value),
    distractors: ({ kmh, ms, L, P }) => [
      { value: L / ms, why: 'ignored the platform' },
      { value: P / ms, why: 'ignored the length of the train' },
      { value: (L + P) / kmh, why: 'did not convert km/hr to m/s' }
    ],
    verify: ({ kmh, L, P }, value) => nearlyEqual(((kmh * 1000) / 3600) * value, L + P),
    render({ kmh, ms, t, L, P }) {
      return {
        question: `A train ${L} m long, running at ${kmh} km/hr, crosses a platform ${P} m long. How long does it take?`,
        explanation: `The train must cover its own length plus the platform: ${L} + ${P} = ${L + P} m. At ${fmt(ms)} m/s that takes ${fmt(t)} seconds.`,
        solutionSteps: [
          `Distance = train + platform = ${L + P} m.`,
          `Speed = ${kmh} × 5/18 = ${fmt(ms)} m/s.`,
          `Time = ${L + P} ÷ ${fmt(ms)} = ${fmt(t)} seconds.`
        ],
        method: 'Distance = train length + platform length, with speed in m/s.',
        hints: [
          'The train has not finished crossing until its last carriage clears the platform.',
          `So the distance is ${L} + ${P} metres.`,
          'Convert the speed to m/s before dividing.'
        ],
        commonMistakes: ['Using only the platform length, or forgetting to convert units.']
      };
    }
  },

  /* ============================== ages ============================== */
  {
    id: 'age-ratio-future',
    version: 1,
    topicId: 'problems-on-ages',
    conceptId: 'age-ratio',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['age-ratio-setup'],
    estimatedSeconds: 90,
    params(rng) {
      const a = rng.int(2, 9);
      const b = rng.int(1, a - 1);
      const x = rng.int(2, 8);
      const n = rng.int(2, 12);
      if (gcd(a, b) !== 1 || a * x > 70) return null;
      const [c, d] = reduceRatio(a * x + n, b * x + n);
      if (c > 30 || d > 30 || (c === a && d === b)) return null;
      return { a, b, x, n, c, d };
    },
    answer: ({ a, x }) => a * x,
    formatValue: (value) => format.years(value),
    distractors: ({ a, b, x, n }) => [
      { value: b * x, why: "gave B's age" },
      { value: a * x + n, why: 'gave the future age' },
      { value: a * x - n, why: 'subtracted the years' },
      { value: a * n, why: 'multiplied the ratio term by the years' }
    ],
    verify: ({ a, b, n, c, d }, value) => {
      const other = (value * b) / a;
      return nearlyEqual((value + n) * d, (other + n) * c);
    },
    render({ a, b, x, n, c, d }) {
      return {
        question: `The present ages of A and B are in the ratio ${a} : ${b}. In ${n} years, the ratio will be ${c} : ${d}. What is A's present age?`,
        explanation: `With ages ${a}x and ${b}x: (${a}x + ${n}) ÷ (${b}x + ${n}) = ${c}/${d} gives x = ${x}, so A is ${a * x}.`,
        solutionSteps: [
          `Let the ages be ${a}x and ${b}x.`,
          `${d}(${a}x + ${n}) = ${c}(${b}x + ${n}).`,
          `${a * d}x + ${d * n} = ${b * c}x + ${c * n} → x = ${x}.`,
          `A = ${a} × ${x} = ${a * x}. Check: in ${n} years ${a * x + n} : ${b * x + n} = ${c} : ${d} ✓`
        ],
        method: 'Write both ages with one unknown, shift both by the same years, cross multiply.',
        hints: [
          `Represent the ages as ${a}x and ${b}x.`,
          `Add ${n} to BOTH ages before forming the new ratio.`,
          `Cross multiply: ${d}(${a}x + ${n}) = ${c}(${b}x + ${n}).`
        ],
        commonMistakes: ['Adding the years to only one of the ages.']
      };
    }
  },

  /* ============================ mixtures ============================ */
  {
    id: 'mix-alligation',
    version: 1,
    topicId: 'mixtures-alligation',
    conceptId: 'mix-alligation',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['mix-alligation-rule'],
    estimatedSeconds: 70,
    params(rng) {
      const c = rng.int(10, 60);
      const d = c + rng.int(4, 30);
      const m = c + rng.int(1, d - c - 1);
      const [r1, r2] = reduceRatio(d - m, m - c);
      if (r1 === r2 || r1 > 12 || r2 > 12) return null;
      return { c, d, m };
    },
    answer: ({ c, d, m }) => ratioText(reduceRatio(d - m, m - c)),
    formatValue: (value) => value,
    distractors: ({ c, d, m }) => [
      { value: ratioText(reduceRatio(m - c, d - m)), why: 'reversed the ratio' },
      { value: ratioText(reduceRatio(c, d)), why: 'used the prices themselves' },
      { value: ratioText(reduceRatio(m - c, d - c)), why: 'used the wrong differences' },
      { value: ratioText(reduceRatio(d - m, d - c)), why: 'used the wrong differences' }
    ],
    verify: ({ c, d, m }, text) => {
      const [r1, r2] = parseRatio(text);
      return nearlyEqual((c * r1 + d * r2) / (r1 + r2), m);
    },
    render({ c, d, m }) {
      const [r1, r2] = reduceRatio(d - m, m - c);
      return {
        question: `Rice costing ₹${c}/kg is mixed with rice costing ₹${d}/kg to make a mixture worth ₹${m}/kg. In what ratio must the cheaper and dearer rice be mixed?`,
        explanation: `Alligation: cheaper : dearer = (${d} − ${m}) : (${m} − ${c}) = ${d - m} : ${m - c} = ${r1} : ${r2}.`,
        solutionSteps: [
          `Distance of the dearer price from the mean: ${d} − ${m} = ${d - m}.`,
          `Distance of the cheaper price from the mean: ${m} − ${c} = ${m - c}.`,
          `Cheaper : dearer = ${d - m} : ${m - c} = ${r1} : ${r2}.`,
          `Check: (${r1} × ${c} + ${r2} × ${d}) ÷ ${r1 + r2} = ₹${m} ✓`
        ],
        method: 'Cross the differences from the mean.',
        hints: [
          `₹${m} is closer to ₹${m - c < d - m ? c : d}, so more of that variety is needed.`,
          'Each quantity pairs with the OTHER price\'s distance from the mean.',
          `Compute (${d} − ${m}) : (${m} − ${c}).`
        ],
        commonMistakes: ['Assigning each distance to its own ingredient, which reverses the ratio.']
      };
    }
  },

  {
    id: 'mix-replacement',
    version: 1,
    topicId: 'mixtures-alligation',
    conceptId: 'mix-replacement',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['mix-replacement-formula'],
    answerDecimals: 2,
    tolerance: 0.01,
    estimatedSeconds: 110,
    params(rng) {
      const V = rng.pick([20, 40, 50, 60, 80, 100, 120]);
      const denominator = rng.pick([10, 5, 4]);
      const x = V / denominator;
      const n = rng.pick([2, 3]);
      if (!Number.isInteger(x)) return null;
      return { V, x, n };
    },
    answer: ({ V, x, n }) => V * (1 - x / V) ** n,
    verify: ({ V, x, n }, value) => {
      let milk = V;
      for (let step = 0; step < n; step++) milk -= (x * milk) / V;
      return nearlyEqual(milk, value, 1e-6);
    },
    render({ V, x, n }) {
      const keep = 1 - x / V;
      const answer = V * keep ** n;
      return {
        question: `A vessel holds ${V} litres of pure milk. ${x} litres are removed and replaced with water. This is done ${n === 2 ? 'twice' : 'three times'} in total. How many litres of milk remain? (Answer to 2 decimal places if needed.)`,
        explanation: `Each replacement keeps ${fmt(keep)} of the milk present, so milk left = ${V} × ${fmt(keep)}^${n} = ${fmt(answer)} litres.`,
        solutionSteps: [
          `Each step keeps (${V} − ${x}) ÷ ${V} = ${fmt(keep)} of the milk.`,
          `After ${n} steps: ${V} × ${fmt(keep)}^${n}.`,
          `= ${fmt(answer)} litres.`
        ],
        method: 'Remaining = V × (1 − x/V)^n.',
        hints: [
          'After the first replacement, what you remove is no longer pure milk.',
          `Each operation keeps the same fraction, ${fmt(keep)}, of the milk.`,
          `Multiply ${V} by ${fmt(keep)} a total of ${n} times.`
        ],
        commonMistakes: [`Subtracting ${x} litres ${n} times.`]
      };
    }
  },

  {
    id: 'mix-part-percent',
    version: 1,
    topicId: 'mixtures-alligation',
    conceptId: 'mix-composition',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['mix-component'],
    answerDecimals: 2,
    estimatedSeconds: 35,
    formatValue: (value) => format.percent(value),
    params(rng) {
      const [a, b] = rng.pick(CLEAN_PERCENT_RATIOS);
      return { a, b, liquid: rng.pick(['milk', 'juice', 'syrup']) };
    },
    answer: ({ a, b }) => (100 * b) / (a + b),
    distractors: ({ a, b }) => [
      { value: (100 * b) / a, why: 'divided by the other part, not the total' },
      { value: (100 * a) / (a + b), why: 'gave the other liquid' },
      { value: 100 / (a + b), why: 'found one part, not the water share' },
      { value: 10 * b, why: 'read the ratio number as a percentage' }
    ],
    // Check back: that percentage of a total of (a + b) parts must be exactly b parts.
    verify: ({ a, b }, value) => nearlyEqual((value / 100) * (a + b), b),
    render({ a, b, liquid }) {
      const pct = (100 * b) / (a + b);
      return {
        question: `A mixture contains ${liquid} and water in the ratio ${a} : ${b}. What percentage of the mixture is water?`,
        explanation: `The mixture has ${a} + ${b} = ${a + b} equal parts, of which ${b} are water. Water = ${b}/${a + b} × 100 = ${fmt(pct)}%.`,
        solutionSteps: [`Total parts: ${a} + ${b} = ${a + b}.`, `Water share: ${b}/${a + b}.`, `${b}/${a + b} × 100 = ${fmt(pct)}%.`],
        method: 'Share of a component = its ratio part ÷ total parts.',
        hints: ['Add the ratio parts to find the whole.', 'Water is the second number in the ratio.'],
        commonMistakes: [`Dividing ${b} by ${a} instead of by the total ${a + b}.`]
      };
    }
  },

  {
    id: 'mix-add-water',
    version: 1,
    topicId: 'mixtures-alligation',
    conceptId: 'mix-adding',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: 'litres',
    formulaIds: ['mix-component'],
    estimatedSeconds: 75,
    params(rng) {
      const [a, b] = rng.pick([[3, 1], [4, 1], [5, 2], [5, 3], [7, 3], [3, 2], [7, 2], [9, 1]]);
      const k = rng.int(2, 8);
      const milk = a * k;
      const water = b * k;
      const [c, d] = rng.pick([[1, 1], [2, 1], [3, 2], [4, 3], [5, 4], [3, 1], [5, 3]]);
      const target = (milk * d) / c;
      if (!Number.isInteger(target) || target <= water) return null;
      return { a, b, c, d, milk, water, total: milk + water, add: target - water };
    },
    answer: ({ add }) => add,
    // After adding, milk : water must be exactly c : d (cross-multiplied).
    verify: ({ c, d, milk, water }, value) => milk * d === c * (water + value),
    render({ a, b, c, d, milk, water, total, add }) {
      return {
        question: `${total} litres of a mixture contain milk and water in the ratio ${a} : ${b}. How many litres of water must be added to make the ratio ${c} : ${d}?`,
        explanation: `Milk = ${a}/${a + b} × ${total} = ${milk} litres and water = ${water} litres. Adding water leaves the milk unchanged, so the new water must be ${milk} × ${d}/${c} = ${water + add} litres. Add ${water + add} − ${water} = ${add} litres.`,
        solutionSteps: [`Milk: ${milk} L; water: ${water} L.`, `Needed water for ${c} : ${d}: ${milk} × ${d} ÷ ${c} = ${water + add}.`, `${water + add} − ${water} = ${add}.`],
        method: 'Keep the unchanged component fixed and scale the other to the new ratio.',
        hints: ['Adding water does not change the amount of milk.', `Work out how much water gives milk : water = ${c} : ${d}.`],
        commonMistakes: ['Scaling the whole mixture instead of keeping the milk fixed.', 'Giving the new total water instead of the amount added.']
      };
    }
  },

  /* ==================== advanced (Tier 6) levels: mixtures ==================== */
  {
    id: 'mix-adv-combine-ratio',
    version: 1,
    topicId: 'mixtures-alligation',
    conceptId: 'mix-adv-combine',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['mix-adv-combine-f'],
    estimatedSeconds: 100,
    formatValue: (value) => value,
    params(rng) {
      const pairs = [[3, 1], [5, 3], [2, 1], [3, 2], [4, 1], [5, 2], [7, 3], [1, 1], [2, 3], [1, 2]];
      const [a1, b1] = rng.pick(pairs);
      const [a2, b2] = rng.pick(pairs);
      if (a1 === a2 && b1 === b2) return null;
      const k1 = rng.int(1, 4);
      const k2 = rng.int(1, 4);
      return { a1, b1, a2, b2, q1: k1 * (a1 + b1), q2: k2 * (a2 + b2), milk: k1 * a1 + k2 * a2, water: k1 * b1 + k2 * b2 };
    },
    answer: ({ milk, water }) => ratioText(reduceRatio(milk, water)),
    distractors: ({ a1, b1, a2, b2, milk, water }) => [
      { value: ratioText(reduceRatio(a1 + a2, b1 + b2)), why: 'added the ratios term by term' },
      { value: ratioText(reduceRatio(water, milk)), why: 'gave water to milk' },
      { value: ratioText(reduceRatio(a1, b1)), why: 'kept the first ratio' },
      { value: ratioText(reduceRatio(a2, b2)), why: 'kept the second ratio' }
    ],
    // Litres of each component straight from the quantities and ratios, compared as a ratio.
    verify({ a1, b1, a2, b2, q1, q2 }, text) {
      const [m, w] = text.split(':').map((part) => Number(part.trim()));
      const milk = (q1 * a1) / (a1 + b1) + (q2 * a2) / (a2 + b2);
      const water = (q1 * b1) / (a1 + b1) + (q2 * b2) / (a2 + b2);
      return nearlyEqual(m / w, milk / water) && gcd(m, w) === 1;
    },
    render({ a1, b1, a2, b2, q1, q2, milk, water }) {
      const answer = ratioText(reduceRatio(milk, water));
      const m1 = (q1 * a1) / (a1 + b1);
      const m2 = (q2 * a2) / (a2 + b2);
      return {
        question: `${q1} litres of milk and water in the ratio ${a1} : ${b1} is mixed with ${q2} litres of milk and water in the ratio ${a2} : ${b2}. What is the ratio of milk to water in the result?`,
        explanation: `First: ${fmt(m1)} L milk and ${fmt(q1 - m1)} L water. Second: ${fmt(m2)} L milk and ${fmt(q2 - m2)} L water. Together: ${fmt(milk)} L milk and ${fmt(water)} L water, so ${answer}.`,
        solutionSteps: [`Mixture 1: ${fmt(m1)} milk, ${fmt(q1 - m1)} water.`, `Mixture 2: ${fmt(m2)} milk, ${fmt(q2 - m2)} water.`, `Total ${fmt(milk)} : ${fmt(water)} = ${answer}.`],
        method: 'Convert each mixture to litres, then add like with like.',
        hints: ['How many litres of milk are in each mixture?', 'Add milk to milk and water to water before simplifying.'],
        commonMistakes: ['Adding the two ratios term by term.']
      };
    }
  },

  {
    id: 'mix-adv-add-pure',
    version: 1,
    topicId: 'mixtures-alligation',
    conceptId: 'mix-adv-target',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'litres',
    formulaIds: ['mix-adv-target-f'],
    estimatedSeconds: 100,
    params(rng) {
      const V = 10 * rng.int(2, 12);
      const p = rng.pick([10, 20, 25, 30, 40, 50]);
      const q = p + 5 * rng.int(1, 8);
      if (q >= 95) return null;
      const added = (V * (q - p)) / (100 - q);
      if (!Number.isInteger(added) || added <= 0) return null;
      return { V, p, q, added };
    },
    answer: ({ added }) => added,
    verify: ({ V, p, q }, value) => nearlyEqual((((V * p) / 100 + value) / (V + value)) * 100, q),
    render({ V, p, q, added }) {
      const acid = (V * p) / 100;
      return {
        question: `How many litres of pure acid must be added to ${V} litres of a ${p}% acid solution to make it ${q}% acid?`,
        explanation: `Acid now = ${p}% of ${V} = ${fmt(acid)} L. After adding a litres: (${fmt(acid)} + a) ÷ (${V} + a) = ${q}/100. Solving gives a = ${added} L.`,
        solutionSteps: [`Acid: ${fmt(acid)} L.`, `(${fmt(acid)} + a) × 100 = ${q} × (${V} + a).`, `a = ${added}.`],
        method: 'Write the new strength as a fraction and solve for the amount added.',
        hints: ['Adding pure acid raises both the acid and the total.', `Set the new acid fraction equal to ${q}%.`],
        commonMistakes: [`Adding ${q - p}% of ${V} = ${fmt((V * (q - p)) / 100)} L, which ignores that the total grows too.`]
      };
    }
  },

  /* ================== advanced (Tier 6) levels: time and work ================== */
  {
    id: 'tw-adv-alternate-day',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-adv-alternate',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['tw-adv-cycle-f'],
    estimatedSeconds: 120,
    params(rng) {
      const a = rng.int(4, 20);
      const b = rng.int(4, 20);
      if (a === b) return null;
      const units = (a * b) / gcd(a, b);
      if (units > 240) return null;
      return { a, b, units, startA: rng.chance(0.6) };
    },
    answer({ a, b, units, startA }) {
      const turns = startA ? [units / a, units / b] : [units / b, units / a];
      let done = 0;
      let day = 0;
      while (done < units) done += turns[day++ % 2];
      return day;
    },
    // Whole cycles first, then whoever's turn it is.
    verify({ a, b, units, startA }, value) {
      const first = startA ? units / a : units / b;
      const cycle = units / a + units / b;
      const k = Math.floor(units / cycle);
      const rest = units - k * cycle;
      const expected = rest === 0 ? 2 * k : rest <= first ? 2 * k + 1 : 2 * k + 2;
      return expected === value;
    },
    render({ a, b, units, startA }) {
      const [ra, rb] = [units / a, units / b];
      const cycle = ra + rb;
      const k = Math.floor(units / cycle);
      const rest = units - k * cycle;
      const firstName = startA ? 'A' : 'B';
      const secondName = startA ? 'B' : 'A';
      const first = startA ? ra : rb;
      const day = rest === 0 ? 2 * k : rest <= first ? 2 * k + 1 : 2 * k + 2;
      return {
        question: `A can finish a job in ${a} days and B in ${b} days. They work on alternate days, with ${firstName} starting. On which day is the job completed?`,
        explanation: `Take the job as ${units} units: A does ${ra} a day and B ${rb}, so each 2-day cycle does ${cycle} units. ${k} full cycles (${2 * k} days) do ${k * cycle} units${rest === 0 ? ', which finishes the job.' : `, leaving ${rest}. ${rest <= first ? `Day ${2 * k + 1} is ${firstName}'s turn, and that finishes it.` : `${firstName} does ${first} on day ${2 * k + 1}, and ${secondName} finishes the rest on day ${2 * k + 2}.`}`} Answer: day ${day}.`,
        solutionSteps: [`Job = ${units} units; A ${ra}/day, B ${rb}/day.`, `${k} cycles = ${2 * k} days → ${k * cycle} units.`, rest === 0 ? 'Nothing is left.' : `${rest} units left → finished on day ${day}.`],
        method: 'Cycle method: units per cycle, count whole cycles, then check whose turn finishes it.',
        hints: ['Measure the job in units that both times divide.', 'After the whole cycles, whose turn is it?'],
        commonMistakes: ['Using the "together" time, as if both worked every day.']
      };
    }
  },

  {
    id: 'tw-adv-efficiency-time',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-adv-efficiency',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'days',
    formulaIds: ['tw-adv-chain-f'],
    estimatedSeconds: 70,
    params(rng) {
      const p = rng.pick([20, 25, 50, 60, 100]);
      const timeA = rng.int(4, 30);
      const timeB = timeA * (1 + p / 100);
      if (!Number.isInteger(timeB)) return null;
      return { p, timeA, timeB, askA: rng.chance(0.5) };
    },
    answer: ({ timeA, timeB, askA }) => (askA ? timeA : timeB),
    // A's daily rate must be (1 + p/100) times B's.
    verify({ p, timeA, timeB, askA }, value) {
      const [tA, tB] = askA ? [value, timeB] : [timeA, value];
      return nearlyEqual(1 / tA, (1 / tB) * (1 + p / 100));
    },
    render({ p, timeA, timeB, askA }) {
      const factor = fmt(1 + p / 100);
      return {
        question: askA
          ? `A is ${p}% more efficient than B. If B takes ${timeB} days to finish a job alone, how many days does A take alone?`
          : `A is ${p}% more efficient than B. If A takes ${timeA} days to finish a job alone, how many days does B take alone?`,
        explanation: askA
          ? `A does ${factor} times B's daily work, so A needs ${timeB} ÷ ${factor} = ${timeA} days.`
          : `A does ${factor} times B's daily work, so B needs ${factor} times as long: ${timeA} × ${factor} = ${timeB} days.`,
        solutionSteps: [`Efficiency A : B = ${factor} : 1.`, askA ? `${timeB} ÷ ${factor} = ${timeA}.` : `${timeA} × ${factor} = ${timeB}.`],
        method: 'Time is inversely proportional to efficiency.',
        hints: ['More efficient means fewer days.', `Scale by ${factor}, not by ${p}% of the days.`],
        commonMistakes: [askA ? `Taking ${p}% off ${timeB} days.` : `Taking ${p}% off ${timeA} days, as if the less efficient worker were faster.`]
      };
    }
  },

  /* ============= advanced (Tier 6) levels: time, speed and distance ============= */
  {
    id: 'tsd-adv-circular-meet',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-adv-circular',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'seconds',
    formulaIds: ['tsd-adv-circular-f'],
    estimatedSeconds: 70,
    params(rng) {
      const L = rng.pick([300, 360, 400, 480, 600, 720, 800, 900, 1200]);
      const a = rng.int(3, 12);
      const b = rng.int(2, a - 1);
      const same = rng.chance(0.5);
      const t = L / (same ? a - b : a + b);
      return Number.isInteger(t) ? { L, a, b, same, t } : null;
    },
    answer: ({ t }) => t,
    // In that time, the gap they have closed (or opened) must be exactly one lap.
    verify: ({ L, a, b, same }, value) => (same ? a * value - b * value : a * value + b * value) === L,
    render({ L, a, b, same, t }) {
      return {
        question: same
          ? `Two runners start together from the same point on a ${L} m circular track and run in the same direction at ${a} m/s and ${b} m/s. After how many seconds does the faster runner first lap the slower one?`
          : `Two runners start together from the same point on a ${L} m circular track and run in opposite directions at ${a} m/s and ${b} m/s. After how many seconds do they first meet?`,
        explanation: same
          ? `Running the same way, the gap grows at ${a} − ${b} = ${a - b} m/s. Lapping means gaining ${L} m: ${L} ÷ ${a - b} = ${t} s.`
          : `Running opposite ways, they close the lap at ${a} + ${b} = ${a + b} m/s: ${L} ÷ ${a + b} = ${t} s.`,
        solutionSteps: [same ? `Relative speed = ${a - b} m/s.` : `Closing speed = ${a + b} m/s.`, `${L} ÷ ${same ? a - b : a + b} = ${t}.`],
        method: same ? 'Same direction: subtract the speeds.' : 'Opposite directions: add the speeds.',
        hints: [same ? 'To lap someone, you gain one full lap on them.' : 'Together they cover one full lap.', same ? 'Use the difference of the speeds.' : 'Use the sum of the speeds.'],
        commonMistakes: [same ? 'Adding the speeds.' : 'Subtracting the speeds.']
      };
    }
  },

  {
    id: 'tsd-adv-meeting-point',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-adv-meeting',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'km',
    formulaIds: ['tsd-adv-meeting-f'],
    estimatedSeconds: 80,
    params(rng) {
      const a = 5 * rng.int(6, 24);
      const b = 5 * rng.int(6, 24);
      if (a === b) return null;
      const t = rng.pick([1, 1.5, 2, 2.5, 3, 4, 5]);
      const D = (a + b) * t;
      return Number.isInteger(D) ? { a, b, t, D } : null;
    },
    answer: ({ a, t }) => a * t,
    // Scale the first train's share of the distance up to the whole gap.
    verify: ({ a, b, D }, value) => nearlyEqual((value / a) * (a + b), D),
    render({ a, b, t, D }) {
      return {
        question: `Two towns are ${fmt(D)} km apart. A train leaves each town at the same time, heading towards the other, at ${a} km/h and ${b} km/h. How far from the ${a} km/h train's town do they meet?`,
        explanation: `They close the gap at ${a + b} km/h, so they meet after ${fmt(D)} ÷ ${a + b} = ${fmt(t)} h. The ${a} km/h train has gone ${a} × ${fmt(t)} = ${fmt(a * t)} km.`,
        solutionSteps: [`Closing speed = ${a + b} km/h.`, `Time = ${fmt(t)} h.`, `${a} × ${fmt(t)} = ${fmt(a * t)} km.`],
        method: 'Meeting time = distance ÷ sum of speeds; then distance = speed × time.',
        hints: ['How fast is the gap closing?', 'Multiply that time by the right train\'s speed.'],
        commonMistakes: [`Splitting the distance equally (${fmt(D / 2)} km).`]
      };
    }
  }
];
