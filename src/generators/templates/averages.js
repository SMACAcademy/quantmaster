/** Weighted average and weighted mean templates. */

import { fmt, format, gcd, nearlyEqual } from '../core.js';

function coprimePair(rng, max) {
  const p = rng.int(1, max);
  const q = rng.int(1, max);
  return p !== q && gcd(p, q) === 1 ? [p, q] : null;
}

export const averageTemplates = [
  /* ========================== weighted average ========================== */
  {
    id: 'wa-combine-groups',
    version: 1,
    topicId: 'weighted-average',
    conceptId: 'wa-combine',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['wa-combine-f'],
    estimatedSeconds: 50,
    tags: ['trap'],
    params(rng) {
      const pair = coprimePair(rng, 5);
      if (!pair) return null;
      const [p, q] = pair;
      const u = rng.int(2, 8);
      const C = rng.int(30, 90);
      const t = rng.int(1, 3);
      const a1 = C - q * t;
      const a2 = C + p * t;
      if (a1 < 10) return null;
      return { n1: p * u, n2: q * u, a1, a2, C };
    },
    answer: ({ C }) => C,
    formatValue: (value) => fmt(value),
    distractors: ({ n1, n2, a1, a2 }) => [
      { value: (a1 + a2) / 2, why: 'averaged the two averages' },
      { value: n1 * a1 + n2 * a2, why: 'gave the total and did not divide' },
      { value: (n1 * a2 + n2 * a1) / (n1 + n2), why: 'paired the sizes with the wrong averages' },
      { value: a1 + a2, why: 'added the averages' }
    ],
    verify({ n1, n2, a1, a2 }, value) {
      let total = 0;
      for (let i = 0; i < n1; i++) total += a1;
      for (let i = 0; i < n2; i++) total += a2;
      return nearlyEqual(total / (n1 + n2), value);
    },
    render({ n1, n2, a1, a2, C }) {
      return {
        question: `${n1} students score an average of ${a1} and another ${n2} students score an average of ${a2}. What is the average score of all ${n1 + n2} students?`,
        explanation: `Totals: ${n1} × ${a1} = ${n1 * a1} and ${n2} × ${a2} = ${n2 * a2}. Combined = ${n1 * a1 + n2 * a2} ÷ ${n1 + n2} = ${C}.`,
        solutionSteps: [`Group 1 total = ${n1 * a1}.`, `Group 2 total = ${n2 * a2}.`, `(${n1 * a1} + ${n2 * a2}) ÷ ${n1 + n2} = ${C}.`],
        method: 'Weight each average by its group size.',
        hints: ['The groups are different sizes, so the simple average is not right.', 'Find each group\'s total first.'],
        commonMistakes: [`Averaging ${a1} and ${a2} directly.`]
      };
    }
  },

  {
    id: 'wa-new-member',
    version: 1,
    topicId: 'weighted-average',
    conceptId: 'wa-change',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['wa-total-f'],
    estimatedSeconds: 65,
    params(rng) {
      return { n: rng.int(5, 30), A: rng.int(20, 80), d: rng.int(1, 6) };
    },
    answer: ({ n, A, d }) => A + (n + 1) * d,
    formatValue: (value) => fmt(value),
    distractors: ({ n, A, d }) => [
      { value: A + d, why: 'added the rise to the old average only' },
      { value: A + n * d, why: 'used the old count for the rise' },
      { value: A + (n - 1) * d, why: 'used the wrong count for the totals' },
      { value: (n + 1) * d, why: 'gave only the extra' }
    ],
    verify: ({ n, A, d }, value) => nearlyEqual((n * A + value) / (n + 1), A + d),
    render({ n, A, d }) {
      const x = A + (n + 1) * d;
      return {
        question: `The average of ${n} numbers is ${A}. When one more number is added, the average becomes ${A + d}. What is the new number?`,
        explanation: `Old total = ${n} × ${A} = ${n * A}. New total = ${n + 1} × ${A + d} = ${(n + 1) * (A + d)}. New number = ${(n + 1) * (A + d)} − ${n * A} = ${x}.`,
        solutionSteps: [`Old total = ${n * A}.`, `New total = ${(n + 1) * (A + d)}.`, `Difference = ${x}.`],
        method: 'New total − old total = the joiner.',
        hints: ['Convert both averages into totals.', 'Count the new number when finding the new total.'],
        commonMistakes: ['Working with the averages instead of the totals.']
      };
    }
  },

  {
    id: 'wa-group-sizes',
    version: 1,
    topicId: 'weighted-average',
    conceptId: 'wa-seesaw',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['wa-seesaw-f'],
    estimatedSeconds: 75,
    tags: ['trap'],
    params(rng) {
      const pair = coprimePair(rng, 5);
      if (!pair) return null;
      const [p, q] = pair;
      const u = rng.int(2, 9);
      const C = rng.int(40, 80);
      const t = rng.int(1, 4);
      return { p, q, u, C, t, a1: C - q * t, a2: C + p * t, N: (p + q) * u, askFirst: rng.chance(0.5) };
    },
    answer: ({ p, q, u, askFirst }) => (askFirst ? p : q) * u,
    formatValue: (value) => fmt(value),
    distractors: ({ p, q, u, N, askFirst }) => [
      { value: (askFirst ? q : p) * u, why: 'swapped the two groups' },
      { value: N / 2, why: 'split equally' },
      { value: p + q, why: 'gave the number of ratio parts' },
      { value: (askFirst ? p : q) * u * 2, why: 'doubled' }
    ],
    verify({ p, q, u, C, a1, a2, N, askFirst }, value) {
      const n1 = askFirst ? value : N - value;
      const n2 = N - n1;
      return nearlyEqual((n1 * a1 + n2 * a2) / N, C) && n1 > 0 && n2 > 0 && p > 0 && q > 0 && u > 0;
    },
    render({ p, q, C, t, a1, a2, N, askFirst, u }) {
      return {
        question: `A group of ${N} people has an average of ${C}. The lower-scoring subgroup (Group 1) averages ${a1} and the higher-scoring subgroup (Group 2) averages ${a2}. How many people are in Group ${askFirst ? '1' : '2'}?`,
        explanation: `Distances from ${C}: Group 1 is ${q * t} below and Group 2 is ${p * t} above. Sizes are in the inverse ratio: Group 1 : Group 2 = ${p * t} : ${q * t} = ${p} : ${q}. Group ${askFirst ? '1' : '2'} has ${(askFirst ? p : q) * u} people.`,
        solutionSteps: [`Group 1 is ${q * t} below the mean; Group 2 is ${p * t} above.`, `Ratio of sizes = ${p * t} : ${q * t} = ${p} : ${q}.`, `One part = ${N} ÷ ${p + q} = ${u}.`, `Group ${askFirst ? '1' : '2'} = ${(askFirst ? p : q) * u}.`],
        method: 'Sizes are in the inverse ratio of the distances from the combined average.',
        hints: ['Which group is closer to the overall average?', 'The closer group is the larger one.'],
        commonMistakes: ['Putting the distances the wrong way round.']
      };
    }
  },

  {
    id: 'wa-remove-two',
    version: 1,
    topicId: 'weighted-average',
    conceptId: 'wa-change',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['wa-total-f'],
    estimatedSeconds: 85,
    params(rng) {
      const n = rng.int(10, 40);
      const B = rng.int(20, 60);
      const d = rng.int(1, 4);
      const A = B + d;
      const S = n * A - (n - 2) * B;
      const e = rng.int(0, 5);
      const x = Math.floor(S / 2) - e;
      const y = S - x;
      if (x <= 0 || y <= 0) return null;
      return { n, A, B, x, y };
    },
    answer: ({ B }) => B,
    formatValue: (value) => fmt(value),
    distractors: ({ A, B, x, y }) => [
      { value: A, why: 'left the average unchanged' },
      { value: (x + y) / 2, why: 'gave the average of the two removed numbers' },
      { value: A + (A - B), why: 'moved the average the wrong way' },
      { value: A + 1, why: 'guessed' }
    ],
    verify: ({ n, A, B, x, y }, value) => nearlyEqual(value * (n - 2) + x + y, n * A) && B === value,
    render({ n, A, B, x, y }) {
      return {
        question: `The average of ${n} numbers is ${A}. Two of the numbers, ${x} and ${y}, are discarded. What is the average of the remaining ${n - 2} numbers?`,
        explanation: `Total = ${n} × ${A} = ${n * A}. Remove ${x} + ${y} = ${x + y}: ${n * A - x - y}. New average = ${n * A - x - y} ÷ ${n - 2} = ${B}.`,
        solutionSteps: [`Total = ${n * A}.`, `After removal: ${n * A} − ${x + y} = ${n * A - x - y}.`, `${n * A - x - y} ÷ ${n - 2} = ${B}.`],
        method: 'Adjust the total and the count, then divide.',
        hints: ['Convert the average into a total.', 'Remember the count drops by two as well.'],
        commonMistakes: ['Assuming the average stays the same.']
      };
    }
  },

  /* ============================= weighted mean ============================= */
  {
    id: 'wm-grades',
    version: 1,
    topicId: 'weighted-mean',
    conceptId: 'wm-def',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['wm-def-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const layout = rng.pick([
        { names: ['assignments', 'exam'], weights: [30, 70] },
        { names: ['coursework', 'exam'], weights: [40, 60] },
        { names: ['project', 'exam'], weights: [20, 80] },
        { names: ['quizzes', 'midterm', 'final'], weights: [20, 30, 50] },
        { names: ['labs', 'midterm', 'final'], weights: [10, 30, 60] },
        { names: ['homework', 'midterm', 'final'], weights: [25, 25, 50] }
      ]);
      // Score steps make every weighted contribution a whole number by design.
      const scores = layout.weights.map((w) => {
        const step = 100 / gcd(w, 100);
        return step * rng.int(Math.ceil(50 / step), Math.floor(100 / step));
      });
      const total = layout.weights.reduce((acc, w, i) => acc + w * scores[i], 0) / 100;
      if (!Number.isInteger(total)) return null;
      const simple = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (nearlyEqual(simple, total)) return null;
      return { ...layout, scores, total, simple };
    },
    answer: ({ total }) => total,
    formatValue: (value) => fmt(value),
    distractors: ({ weights, scores, simple }) => {
      const top = weights.indexOf(Math.max(...weights));
      const low = weights.indexOf(Math.min(...weights));
      return [
        { value: simple, why: 'took the simple mean' },
        { value: scores[top], why: 'gave the heaviest component only' },
        { value: scores[low], why: 'gave the lightest component only' }
      ];
    },
    verify: ({ weights, scores, total }, value) => {
      let points = 0;
      let weightSum = 0;
      weights.forEach((w, i) => {
        points += w * scores[i];
        weightSum += w;
      });
      return weightSum === 100 && nearlyEqual(points / weightSum, value) && value === total;
    },
    render({ names, weights, scores, total }) {
      const parts = names.map((name, i) => `${weights[i]}% ${name}`);
      const marks = names.map((name, i) => `${scores[i]} on the ${name}`);
      const products = weights.map((w, i) => `${w / 100} × ${scores[i]}`);
      return {
        question: `A course grade is ${parts.join(', ')}. A student scores ${marks.join(', ')}. What is the final mark?`,
        explanation: `${products.join(' + ')} = ${weights.map((w, i) => fmt((w * scores[i]) / 100)).join(' + ')} = ${total}.`,
        solutionSteps: [`Multiply each score by its weight: ${products.join(', ')}.`, `Add: ${total}.`],
        method: 'Σ(w · x) with weights as decimals that sum to 1.',
        hints: ['The weights already add to 100%, so no further division is needed.', 'Convert each percentage into a decimal.'],
        commonMistakes: ['Taking the simple mean of the scores.']
      };
    }
  },

  {
    id: 'wm-target-score',
    version: 1,
    topicId: 'weighted-mean',
    conceptId: 'wm-target',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['wm-target-f'],
    estimatedSeconds: 70,
    tags: ['trap'],
    params(rng) {
      const [w1, w2] = rng.pick([[30, 70], [40, 60], [20, 80], [25, 75], [60, 40]]);
      const s1 = rng.int(50, 90);
      const fits = [];
      for (let v = 55; v <= 100; v++) if (v !== s1 && (w1 * s1 + w2 * v) % 100 === 0) fits.push(v);
      if (!fits.length) return null;
      const x = rng.pick(fits);
      const T = (w1 * s1 + w2 * x) / 100;
      return { w1, w2, s1, T, x };
    },
    answer: ({ x }) => x,
    formatValue: (value) => fmt(value),
    distractors: ({ w1, w2, s1, T }) => [
      { value: T, why: 'assumed the needed mark equals the target' },
      { value: 2 * T - s1, why: 'treated the weights as equal' },
      { value: (100 * T - w2 * s1) / w1, why: 'swapped the weights' },
      { value: s1, why: 'repeated the first mark' }
    ],
    verify: ({ w1, w2, s1, T }, value) => nearlyEqual((w1 * s1 + w2 * value) / 100, T),
    render({ w1, w2, s1, T, x }) {
      return {
        question: `Coursework counts ${w1}% and the final exam ${w2}% of a grade. The coursework mark is ${s1}. What exam mark is needed for an overall mark of ${T}?`,
        explanation: `The coursework contributes ${fmt((w1 * s1) / 100)}. The exam must contribute ${T} − ${fmt((w1 * s1) / 100)} = ${fmt(T - (w1 * s1) / 100)}, and ${fmt(T - (w1 * s1) / 100)} ÷ ${w2 / 100} = ${x}.`,
        solutionSteps: [`Coursework: ${w1 / 100} × ${s1} = ${fmt((w1 * s1) / 100)}.`, `Still needed: ${fmt(T - (w1 * s1) / 100)}.`, `Exam mark = ${fmt(T - (w1 * s1) / 100)} ÷ ${w2 / 100} = ${x}.`],
        method: 'Target − banked points, divided by the remaining weight.',
        hints: ['How many points does the coursework already contribute?', 'Divide what is left by the exam weight.'],
        commonMistakes: ['Assuming the exam mark should equal the target.']
      };
    }
  },

  {
    id: 'wm-average-speed',
    version: 1,
    topicId: 'weighted-mean',
    conceptId: 'wm-derived',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['wm-price-f'],
    estimatedSeconds: 70,
    tags: ['trap'],
    params(rng) {
      const t1 = rng.int(1, 5);
      const t2 = rng.int(1, 5);
      if (t1 === t2) return null;
      // (t1 + t2) must divide t1 × (s2 − s1) for the average to be whole.
      const gaps = [];
      for (let k = 1; k <= 6; k++) if ((t1 * 10 * k) % (t1 + t2) === 0) gaps.push(k * 10);
      if (!gaps.length) return null;
      const gap = rng.pick(gaps);
      const s1 = rng.int(2, 9 - gap / 10) * 10;
      const s2 = s1 + gap;
      const d1 = s1 * t1;
      const d2 = s2 * t2;
      const avg = (d1 + d2) / (t1 + t2);
      if (!Number.isInteger(avg)) return null;
      return { s1, s2, d1, d2, avg };
    },
    answer: ({ avg }) => avg,
    formatValue: (value) => format.kmh(value),
    distractors: ({ s1, s2, d1, d2 }) => [
      { value: (s1 + s2) / 2, why: 'averaged the two speeds' },
      { value: (d1 * s1 + d2 * s2) / (d1 + d2), why: 'weighted the speeds by distance' },
      { value: (2 * s1 * s2) / (s1 + s2), why: 'used the equal-distance formula' }
    ],
    verify({ s1, s2, d1, d2 }, value) {
      const time = d1 / s1 + d2 / s2;
      return nearlyEqual((d1 + d2) / time, value);
    },
    render({ s1, s2, d1, d2, avg }) {
      const t1 = d1 / s1;
      const t2 = d2 / s2;
      return {
        question: `A vehicle covers ${d1} km at ${s1} km/hr and then ${d2} km at ${s2} km/hr. What is its average speed for the whole trip?`,
        explanation: `Times: ${d1} ÷ ${s1} = ${t1} hr and ${d2} ÷ ${s2} = ${t2} hr. Total distance ${d1 + d2} km in ${t1 + t2} hr gives ${avg} km/hr.`,
        solutionSteps: [`Time 1 = ${t1} hr; time 2 = ${t2} hr.`, `Total distance = ${d1 + d2} km; total time = ${t1 + t2} hr.`, `${d1 + d2} ÷ ${t1 + t2} = ${avg}.`],
        method: 'Average speed = total distance ÷ total time.',
        hints: ['Find the time taken on each part.', 'Divide the total distance by the total time.'],
        commonMistakes: ['Averaging the two speeds.']
      };
    }
  },

  {
    id: 'wm-missing-weight',
    version: 1,
    topicId: 'weighted-mean',
    conceptId: 'wm-target',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['wm-def-f'],
    estimatedSeconds: 85,
    params(rng) {
      const a = rng.int(2, 8) * 10;
      const b = rng.int(a / 10 + 1, 12) * 10;
      const w = rng.int(1, 5);
      const v = rng.int(1, 5);
      if (w === v) return null;
      const m = (a * w + b * v) / (w + v);
      if (!Number.isInteger(m) || m <= a || m >= b) return null;
      return { a, b, w, v, m };
    },
    answer: ({ w }) => w,
    formatValue: (value) => fmt(value),
    distractors: ({ a, m, w, v, b }) => [
      { value: v, why: 'gave the known weight' },
      { value: w + v, why: 'gave the total weight' },
      { value: (m - a) / 10, why: 'used the distance to the mean' },
      { value: (b - m) / 10, why: 'used the other distance' }
    ],
    verify: ({ a, b, v, m }, value) => nearlyEqual((a * value + b * v) / (value + v), m),
    render({ a, b, w, v, m }) {
      return {
        question: `The weighted mean of ${a} (with weight w) and ${b} (with weight ${v}) is ${m}. What is w?`,
        explanation: `(${a}w + ${b * v}) ÷ (w + ${v}) = ${m}. So ${a}w + ${b * v} = ${m}w + ${m * v}, giving ${m - a}w = ${b * v - m * v}, so w = ${w}.`,
        solutionSteps: [`${a}w + ${b} × ${v} = ${m}(w + ${v}).`, `${a}w + ${b * v} = ${m}w + ${m * v}.`, `${(m - a)}w = ${(b - m) * v}, so w = ${w}.`],
        method: 'Set Σ(w · x) equal to mean × Σw and solve.',
        hints: [`${m} is ${m - a} above ${a} and ${b - m} below ${b}. Which value carries more weight?`, 'Write Σ(w · x) = mean × Σw.'],
        commonMistakes: ['Assuming equal weights.']
      };
    }
  }
];
