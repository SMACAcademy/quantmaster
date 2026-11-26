/** Mean/median/mode, dispersion and data sufficiency templates. */

import { gcd } from '../core.js';

export const statisticsTemplates = [
  /* =========================== mean, median and mode =========================== */
  {
    id: 'mmm-mean-clean',
    version: 1,
    topicId: 'mean-median-mode',
    conceptId: 'mmm-mean',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['mmm-mean-f'],
    estimatedSeconds: 35,
    params(rng) {
      const n = rng.int(4, 8);
      const mean = rng.int(5, 60);
      const targetSum = mean * n;
      const values = [];
      let sum = 0;
      for (let i = 0; i < n - 1; i++) {
        const value = rng.int(1, mean * 2);
        values.push(value);
        sum += value;
      }
      const last = targetSum - sum;
      if (last <= 0 || last > mean * 4) return null;
      values.push(last);
      return { n, mean, values: rng.shuffle(values) };
    },
    answer: ({ mean }) => mean,
    verify({ values }, value) {
      const sum = values.reduce((acc, v) => acc + v, 0);
      return sum === value * values.length;
    },
    render({ values, mean }) {
      return {
        question: `What is the mean of ${values.join(', ')}?`,
        explanation: `Sum = ${values.join(' + ')} = ${values.reduce((a, b) => a + b, 0)}. Mean = ${values.reduce((a, b) => a + b, 0)} ÷ ${values.length} = ${mean}.`,
        solutionSteps: [`Sum = ${values.reduce((a, b) => a + b, 0)}.`, `${values.reduce((a, b) => a + b, 0)} ÷ ${values.length} = ${mean}.`],
        method: 'Add all the values, then divide by how many there are.',
        hints: ['Count the values carefully before dividing.'],
        commonMistakes: ['Dividing by the wrong count.']
      };
    }
  },

  {
    id: 'mmm-median-sorted',
    version: 1,
    topicId: 'mean-median-mode',
    conceptId: 'mmm-median',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['mmm-median-f'],
    estimatedSeconds: 35,
    tags: ['trap'],
    params(rng) {
      const n = rng.int(5, 8);
      const seen = new Set();
      const values = [];
      let guard = 0;
      while (values.length < n && guard++ < 60) {
        const v = rng.int(1, 99);
        if (seen.has(v)) continue;
        seen.add(v);
        values.push(v);
      }
      if (values.length < n) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(n / 2);
      const median = n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return { values: rng.shuffle(values), sorted, median };
    },
    answer: ({ median }) => median,
    tolerance: 0.001,
    verify({ values }, value) {
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      const mid = Math.floor(n / 2);
      const median = n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return median === value;
    },
    render({ values, sorted, median }) {
      const n = sorted.length;
      const isOdd = n % 2 === 1;
      return {
        question: `What is the median of ${values.join(', ')}?`,
        explanation: `Sorted: ${sorted.join(', ')}. With ${n} values (${isOdd ? 'odd' : 'even'}), the median is ${isOdd ? `the middle value: ${median}` : `the average of the two middle values: ${median}`}.`,
        solutionSteps: [`Sort: ${sorted.join(', ')}.`, isOdd ? `Middle value: ${median}.` : `Average the two middle values: ${median}.`],
        method: 'Sort the data first, then find the middle (or the average of the two middle values).',
        hints: ['Do not find the median of the unsorted list.'],
        commonMistakes: ['Taking the middle of the list before sorting it.']
      };
    }
  },

  {
    id: 'mmm-missing-value',
    version: 1,
    topicId: 'mean-median-mode',
    conceptId: 'mmm-missing',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['mmm-missing-f'],
    estimatedSeconds: 45,
    params(rng) {
      const n = rng.int(4, 7);
      const mean = rng.int(10, 60);
      const targetSum = mean * n;
      const known = [];
      let sum = 0;
      for (let i = 0; i < n - 1; i++) {
        const value = rng.int(1, mean + 20);
        known.push(value);
        sum += value;
      }
      const missing = targetSum - sum;
      if (missing <= 0 || missing > mean * 5) return null;
      return { n, mean, known, missing };
    },
    answer: ({ missing }) => missing,
    verify({ known, mean, n }, value) {
      const sum = known.reduce((a, b) => a + b, 0) + value;
      return sum === mean * n;
    },
    render({ n, mean, known, missing }) {
      return {
        question: `The mean of ${n} numbers is ${mean}. ${n - 1} of them are ${known.join(', ')}. What is the missing number?`,
        explanation: `The total sum must be ${mean} × ${n} = ${mean * n}. The known values sum to ${known.reduce((a, b) => a + b, 0)}, so the missing value is ${mean * n} − ${known.reduce((a, b) => a + b, 0)} = ${missing}.`,
        solutionSteps: [`Required sum = ${mean} × ${n} = ${mean * n}.`, `Known sum = ${known.reduce((a, b) => a + b, 0)}.`, `Missing = ${mean * n} − ${known.reduce((a, b) => a + b, 0)} = ${missing}.`],
        method: 'Find the required total sum from the mean, then subtract the known values.',
        hints: ['Multiply the mean by the total count to get the required sum first.'],
        commonMistakes: ['Using the count of known values instead of the full count.']
      };
    }
  },

  {
    id: 'mmm-combined-mean',
    version: 1,
    topicId: 'mean-median-mode',
    conceptId: 'mmm-combined',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['mmm-combined-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const n1 = rng.int(2, 10);
      const n2 = rng.int(2, 10);
      const combined = rng.int(20, 80);
      const g = gcd(n1, n2);
      const k = rng.int(1, 4);
      const x = (n2 / g) * k;
      const y = (n1 / g) * k;
      const mean1 = combined + x;
      const mean2 = combined - y;
      if (mean2 <= 0) return null;
      return { n1, n2, mean1, mean2, combined };
    },
    answer: ({ combined }) => combined,
    verify({ n1, n2, mean1, mean2 }, value) {
      return n1 * mean1 + n2 * mean2 === value * (n1 + n2);
    },
    render({ n1, n2, mean1, mean2, combined }) {
      const total = n1 * mean1 + n2 * mean2;
      return {
        question: `A group of ${n1} has a mean of ${mean1}, and another group of ${n2} has a mean of ${mean2}. What is the combined mean of all ${n1 + n2}?`,
        explanation: `Combined mean = (${n1}×${mean1} + ${n2}×${mean2}) / (${n1}+${n2}) = (${n1 * mean1} + ${n2 * mean2}) / ${n1 + n2} = ${total} / ${n1 + n2} = ${combined}.`,
        solutionSteps: [`${n1}×${mean1} = ${n1 * mean1}; ${n2}×${mean2} = ${n2 * mean2}.`, `Total = ${total}; count = ${n1 + n2}.`, `${total} ÷ ${n1 + n2} = ${combined}.`],
        method: 'Weight each group\'s mean by its size before combining.',
        hints: ['Do not simply average the two means without weighting by group size.'],
        commonMistakes: ['Averaging the two means directly, ignoring the different group sizes.']
      };
    }
  },

  /* ============================= measures of dispersion ============================= */
  {
    id: 'ds-range-easy',
    version: 1,
    topicId: 'dispersion',
    conceptId: 'disp-range',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['disp-range-f'],
    estimatedSeconds: 30,
    params(rng) {
      const values = [];
      const seen = new Set();
      let guard = 0;
      while (values.length < 5 && guard++ < 40) {
        const v = rng.int(1, 100);
        if (seen.has(v)) continue;
        seen.add(v);
        values.push(v);
      }
      if (values.length < 5) return null;
      return { values };
    },
    answer: ({ values }) => Math.max(...values) - Math.min(...values),
    verify: ({ values }, value) => Math.max(...values) - Math.min(...values) === value,
    render({ values }) {
      const max = Math.max(...values);
      const min = Math.min(...values);
      return {
        question: `What is the range of ${values.join(', ')}?`,
        explanation: `Range = maximum − minimum = ${max} − ${min} = ${max - min}.`,
        solutionSteps: [`Max = ${max}, min = ${min}.`, `${max} − ${min} = ${max - min}.`],
        method: 'Subtract the smallest value from the largest.',
        hints: ['Find the maximum and minimum values first.'],
        commonMistakes: ['Using values other than the true maximum and minimum.']
      };
    }
  },

  {
    id: 'ds-variance-pairs',
    version: 1,
    topicId: 'dispersion',
    conceptId: 'disp-variance',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['disp-variance-f'],
    estimatedSeconds: 50,
    params(rng) {
      const mean = rng.int(20, 80);
      const d = rng.int(2, 12);
      const values = [mean - d, mean - d, mean + d, mean + d];
      return { mean, d, values: rng.shuffle(values) };
    },
    answer: ({ d }) => d * d,
    verify({ values }, value) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const sumSq = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
      return sumSq / values.length === value;
    },
    render({ values, mean, d }) {
      return {
        question: `What is the variance of ${values.join(', ')}?`,
        explanation: `Mean = ${mean}. Each deviation is ±${d}, so every squared deviation is ${d * d}. Variance = average of the squared deviations = ${d * d}.`,
        solutionSteps: [`Mean = ${mean}.`, `Each deviation is ±${d}; squared = ${d * d}.`, `Variance = ${d * d}.`],
        method: 'Find the mean, then average the squared deviations from it.',
        hints: ['Find the mean first, then work out each deviation from it.'],
        commonMistakes: ['Forgetting to square the deviations before averaging.']
      };
    }
  },

  {
    id: 'ds-stddev-triples',
    version: 1,
    topicId: 'dispersion',
    conceptId: 'disp-stddev',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['disp-stddev-f', 'disp-variance-f'],
    estimatedSeconds: 55,
    params(rng) {
      const mean = rng.int(20, 80);
      const d = rng.int(2, 10);
      const values = [mean - d, mean - d, mean - d, mean + d, mean + d, mean + d];
      return { mean, d, values: rng.shuffle(values) };
    },
    answer: ({ d }) => d,
    verify({ values }, value) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
      return Math.round(Math.sqrt(variance)) === value && variance === value * value;
    },
    render({ values, mean, d }) {
      return {
        question: `What is the standard deviation of ${values.join(', ')}?`,
        explanation: `Mean = ${mean}. Every deviation is ±${d}, so every squared deviation is ${d * d}, giving a variance of ${d * d}. Standard deviation = √${d * d} = ${d}.`,
        solutionSteps: [`Mean = ${mean}.`, `Variance = ${d * d}.`, `√${d * d} = ${d}.`],
        method: 'Find the variance first, then take its square root.',
        hints: ['Standard deviation is the square root of the variance.'],
        commonMistakes: ['Reporting the variance itself instead of its square root.']
      };
    }
  },

  {
    id: 'ds-cv-clean',
    version: 1,
    topicId: 'dispersion',
    conceptId: 'disp-cv',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['disp-cv-f'],
    estimatedSeconds: 45,
    unit: '%',
    params(rng) {
      const cv = rng.pick([5, 10, 15, 20, 25, 30, 40]);
      const mean = rng.int(1, 10) * 20;
      const sd = (mean * cv) / 100;
      if (!Number.isInteger(sd)) return null;
      return { mean, sd, cv };
    },
    answer: ({ cv }) => cv,
    verify: ({ mean, sd }, value) => (sd / mean) * 100 === value,
    render({ mean, sd, cv }) {
      return {
        question: `A data set has mean ${mean} and standard deviation ${sd}. What is its coefficient of variation, as a percentage?`,
        explanation: `CV = (SD / mean) × 100 = (${sd}/${mean}) × 100 = ${cv}%.`,
        solutionSteps: [`${sd} ÷ ${mean} = ${sd / mean}.`, `${sd / mean} × 100 = ${cv}%.`],
        method: 'Divide the standard deviation by the mean, then convert to a percentage.',
        hints: ['CV is always expressed as a percentage.'],
        commonMistakes: ['Forgetting to multiply by 100.']
      };
    }
  },

  /* ================================ data sufficiency ================================ */
  {
    id: 'dsq-single-linear',
    version: 1,
    topicId: 'data-sufficiency',
    conceptId: 'dsq-single',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dsq-single-f'],
    estimatedSeconds: 40,
    params(rng) {
      const a = rng.int(2, 9);
      const x0 = rng.int(-10, 20);
      const b = a * x0;
      const property = rng.pick(['a positive integer', 'a negative number', 'greater than 0', 'an even number']);
      const swap = rng.chance(0.5);
      return { a, b, x0, property, swap };
    },
    answer: ({ swap }) => (swap
      ? 'Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.'
      : 'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.'),
    distractors: () => [
      { value: 'BOTH statements TOGETHER are sufficient, but NEITHER statement alone is sufficient.', why: 'wrong: one statement alone already works' },
      { value: 'EACH statement ALONE is sufficient.', why: 'wrong: the property statement alone does not pin down one value' },
      { value: 'Statements (1) and (2) TOGETHER are still NOT sufficient.', why: 'wrong: one statement alone already works' }
    ],
    verify({ swap }, value) {
      const A = 'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.';
      const B = 'Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.';
      return swap ? value === B : value === A;
    },
    render({ a, b, x0, property, swap }) {
      const equation = `${a}x = ${b}`;
      const propStatement = `x is ${property}`;
      const stmt1 = swap ? propStatement : equation;
      const stmt2 = swap ? equation : propStatement;
      const sufficientLabel = swap ? '(2)' : '(1)';
      return {
        question: `What is the value of x? (1) ${stmt1}. (2) ${stmt2}.`,
        explanation: `Statement ${sufficientLabel} gives the equation ${equation}, which solves to a single definite value, x = ${x0} — sufficient by itself. The other statement only describes a property of x, which countless values could satisfy — not sufficient alone.`,
        solutionSteps: [`${equation} → x = ${x0}. Sufficient.`, `"${propStatement}" allows many values. Not sufficient.`],
        method: 'Test each statement completely on its own.',
        hints: ['Solve the equation statement by itself: does it give one definite value?'],
        commonMistakes: ['Assuming a vague property statement is enough on its own.']
      };
    }
  },

  {
    id: 'dsq-two-equations',
    version: 1,
    topicId: 'data-sufficiency',
    conceptId: 'dsq-combined',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dsq-combined-f'],
    estimatedSeconds: 50,
    params(rng) {
      const x0 = rng.int(1, 20);
      const y0 = rng.int(1, 20);
      if (x0 === y0) return null;
      const S = x0 + y0;
      const D = x0 - y0;
      return { x0, y0, S, D };
    },
    answer: () => 'BOTH statements TOGETHER are sufficient, but NEITHER statement alone is sufficient.',
    distractors: () => [
      { value: 'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.', why: 'wrong: one equation in two unknowns is never sufficient alone' },
      { value: 'Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.', why: 'wrong: one equation in two unknowns is never sufficient alone' },
      { value: 'Statements (1) and (2) TOGETHER are still NOT sufficient.', why: 'wrong: the two equations together do pin down a unique solution' }
    ],
    verify({ S, D }, value) {
      return value === 'BOTH statements TOGETHER are sufficient, but NEITHER statement alone is sufficient.' && Number.isFinite(S) && Number.isFinite(D);
    },
    render({ x0, y0, S, D }) {
      return {
        question: `What is the value of x? (1) x + y = ${S}. (2) x − y = ${D}.`,
        explanation: `Statement (1) alone: infinitely many (x,y) pairs satisfy x+y=${S}. Not sufficient. Statement (2) alone: infinitely many pairs satisfy x−y=${D} too. Not sufficient. Together, solving the two equations gives a unique value, x = ${x0}.`,
        solutionSteps: [`(1) alone: infinitely many pairs. Not sufficient.`, `(2) alone: infinitely many pairs. Not sufficient.`, `Together: unique solution x = ${x0}. Sufficient.`],
        method: 'Two linear equations in two unknowns usually need both to pin down a unique solution.',
        hints: ['One linear equation in two unknowns never gives a unique answer by itself.'],
        commonMistakes: ['Assuming one equation is already sufficient because it "looks solvable."']
      };
    }
  },

  {
    id: 'dsq-quadratic-filter',
    version: 1,
    topicId: 'data-sufficiency',
    conceptId: 'dsq-combined',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dsq-combined-f'],
    estimatedSeconds: 55,
    params(rng) {
      const p = rng.int(-8, 5);
      const q = rng.int(p + 1, p + 12);
      const sum = p + q;
      const prod = p * q;
      return { p, q, sum, prod };
    },
    answer: () => 'BOTH statements TOGETHER are sufficient, but NEITHER statement alone is sufficient.',
    distractors: () => [
      { value: 'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.', why: 'wrong: the quadratic alone gives two possible roots' },
      { value: 'EACH statement ALONE is sufficient.', why: 'wrong: neither statement alone pins down a single value' },
      { value: 'Statements (1) and (2) TOGETHER are still NOT sufficient.', why: 'wrong: combined, only one root satisfies both statements' }
    ],
    verify({ p, q }, value) {
      return value === 'BOTH statements TOGETHER are sufficient, but NEITHER statement alone is sufficient.' && q > p;
    },
    render({ p, q, sum, prod }) {
      return {
        question: `What is the value of x? (1) x² − ${sum}x + ${prod} = 0. (2) x > ${p}.`,
        explanation: `Statement (1) alone factorises to x = ${p} or x = ${q} — two possibilities, not sufficient. Statement (2) alone allows countless values greater than ${p}, not sufficient. Together, of the two roots from (1), only x = ${q} satisfies x > ${p}, giving a unique answer.`,
        solutionSteps: [`(1): x = ${p} or x = ${q}. Not sufficient.`, `(2) alone: x > ${p} allows many values. Not sufficient.`, `Together: only x = ${q} satisfies both. Sufficient.`],
        method: 'Use statement (2) to filter the possibilities left by statement (1).',
        hints: ['Statement (1) narrows x to a short list; statement (2) can then filter that list.'],
        commonMistakes: ['Assuming statement (1) is already sufficient because it "solves" the equation.']
      };
    }
  },

  {
    id: 'dsq-range-insufficient',
    version: 1,
    topicId: 'data-sufficiency',
    conceptId: 'dsq-neither',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['dsq-neither-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(1, 20);
      const b = rng.int(a + 2, a + 20);
      return { a, b };
    },
    answer: () => 'Statements (1) and (2) TOGETHER are still NOT sufficient.',
    distractors: () => [
      { value: 'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.', why: 'wrong: an open-ended inequality never pins down one value' },
      { value: 'Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.', why: 'wrong: an open-ended inequality never pins down one value' },
      { value: 'BOTH statements TOGETHER are sufficient, but NEITHER statement alone is sufficient.', why: 'wrong: combining the two only gives a range, not a single value' }
    ],
    verify({ a, b }, value) {
      return value === 'Statements (1) and (2) TOGETHER are still NOT sufficient.' && b > a + 1;
    },
    render({ a, b }) {
      return {
        question: `What is the value of x? (1) x > ${a}. (2) x < ${b}.`,
        explanation: `Statement (1) alone allows any value greater than ${a} — not sufficient. Statement (2) alone allows any value less than ${b} — not sufficient. Even combined, they only narrow x down to the range ${a} < x < ${b}, which still contains many possible values, so the data is not sufficient even together.`,
        solutionSteps: [`(1) alone: x > ${a}, infinitely many values. Not sufficient.`, `(2) alone: x < ${b}, infinitely many values. Not sufficient.`, `Together: ${a} < x < ${b}, still many values. Not sufficient.`],
        method: 'A range of possible values, however narrow, is not the same as a single definite answer.',
        hints: ['Combining a "greater than" and a "less than" statement usually just gives a range, not a single value.'],
        commonMistakes: ['Assuming that combining any two statements must always produce a unique answer.']
      };
    }
  }
];
