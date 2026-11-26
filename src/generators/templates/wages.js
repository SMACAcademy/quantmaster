/** Work and wages templates. */

import { format, gcd, lcm, nearlyEqual } from '../core.js';

export const wageTemplates = [
  {
    id: 'ww-ratio-share',
    version: 1,
    topicId: 'work-and-wages',
    conceptId: 'ww-ratio',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ww-ratio-f'],
    estimatedSeconds: 45,
    params(rng) {
      const p = rng.int(1, 8);
      const q = rng.int(1, 8);
      if (p === q || gcd(p, q) !== 1) return null;
      const unit = rng.int(2, 30) * 10;
      return { p, q, unit, total: (p + q) * unit, askA: rng.chance(0.5) };
    },
    answer: ({ p, q, unit, askA }) => (askA ? p : q) * unit,
    formatValue: (value) => format.rupees(value),
    distractors: ({ p, q, unit, total, askA }) => [
      { value: (askA ? q : p) * unit, why: "gave the other person's share" },
      { value: total / 2, why: 'split equally' },
      { value: (askA ? p : q) * unit + unit, why: 'added an extra part' },
      { value: (askA ? p : q) * unit * 2, why: 'doubled the share' }
    ],
    verify: ({ p, q, total, askA }, value) => nearlyEqual(value / (total - value), askA ? p / q : q / p),
    render({ p, q, unit, total, askA }) {
      const share = (askA ? p : q) * unit;
      return {
        question: `A and B do work in the ratio ${p} : ${q} and are paid ${format.rupees(total)} in total. How much does ${askA ? 'A' : 'B'} get?`,
        explanation: `Total parts = ${p + q}, so one part = ${format.rupees(total)} ÷ ${p + q} = ${format.rupees(unit)}. ${askA ? 'A' : 'B'} gets ${askA ? p : q} parts = ${format.rupees(share)}.`,
        solutionSteps: [`Parts: ${p} + ${q} = ${p + q}.`, `One part = ${total} ÷ ${p + q} = ${unit}.`, `Share = ${askA ? p : q} × ${unit} = ${share}.`],
        method: 'Divide the total by the sum of the ratio terms.',
        hints: ['Add the ratio terms to find the total number of parts.', 'Find the value of one part.'],
        commonMistakes: ["Giving the other person's share."]
      };
    }
  },

  {
    id: 'ww-days-share',
    version: 1,
    topicId: 'work-and-wages',
    conceptId: 'ww-days',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ww-days-f'],
    estimatedSeconds: 65,
    tags: ['trap'],
    params(rng) {
      const days = [6, 8, 10, 12, 15, 20, 24, 30];
      const [a, b] = rng.shuffle(days).slice(0, 2);
      const L = lcm(a, b);
      const wa = L / a;
      const wb = L / b;
      const unit = rng.int(2, 25) * 10;
      return { a, b, wa, wb, unit, total: (wa + wb) * unit, askA: rng.chance(0.5) };
    },
    answer: ({ wa, wb, unit, askA }) => (askA ? wa : wb) * unit,
    formatValue: (value) => format.rupees(value),
    distractors: ({ a, b, wa, wb, unit, total, askA }) => [
      { value: (total * (askA ? a : b)) / (a + b), why: 'shared in the ratio of days taken' },
      { value: (askA ? wb : wa) * unit, why: "gave the other person's share" },
      { value: total / 2, why: 'split equally' },
      { value: (total * (askA ? b : a)) / (a + b) + unit, why: 'shifted by one part' }
    ],
    verify: ({ a, b, wa, wb, unit, total, askA }, value) => {
      const shareA = askA ? value : total - value;
      const shareB = total - shareA;
      return nearlyEqual(shareA * a, shareB * b) && wa + wb > 0 && unit > 0;
    },
    render({ a, b, wa, wb, unit, total, askA }) {
      const share = (askA ? wa : wb) * unit;
      return {
        question: `A can finish a job alone in ${a} days and B alone in ${b} days. They complete it together for ${format.rupees(total)}. How much does ${askA ? 'A' : 'B'} get?`,
        explanation: `Rates are 1/${a} : 1/${b} = ${wa} : ${wb}. ${askA ? 'A' : 'B'} gets ${askA ? wa : wb} of ${wa + wb} parts of ${format.rupees(total)} = ${format.rupees(share)}.`,
        solutionSteps: [`Take the job as ${lcm(a, b)} units.`, `A does ${wa} units/day; B does ${wb} units/day.`, `Ratio ${wa} : ${wb}, so ${askA ? 'A' : 'B'} = ${format.rupees(total)} × ${askA ? wa : wb}/${wa + wb} = ${format.rupees(share)}.`],
        method: 'Convert days into rates, then split the money by rates.',
        hints: ['Convert each time into a daily rate.', 'Who works faster? They should get more.'],
        commonMistakes: ['Sharing in the ratio of days taken, which rewards the slower worker.']
      };
    }
  },

  {
    id: 'ww-third-worker',
    version: 1,
    topicId: 'work-and-wages',
    conceptId: 'ww-stages',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ww-stages-f', 'ww-days-f'],
    estimatedSeconds: 100,
    params(rng) {
      const days = [10, 12, 15, 20, 24, 30];
      const [a, b] = rng.shuffle(days).slice(0, 2);
      const T = rng.int(3, 8);
      const D = lcm(a, b);
      const pa = (T * D) / a;
      const pb = (T * D) / b;
      const pc = D - pa - pb;
      if (pc <= 0 || pa >= D || pb >= D) return null;
      const unit = rng.int(1, 12) * 10;
      return { a, b, T, D, pa, pb, pc, unit, total: D * unit };
    },
    answer: ({ pc, unit }) => pc * unit,
    formatValue: (value) => format.rupees(value),
    distractors: ({ pa, pb, pc, unit, total }) => [
      { value: total / 3, why: 'split three ways equally' },
      { value: pa * unit, why: "gave A's share" },
      { value: pb * unit, why: "gave B's share" },
      { value: (pc + 1) * unit, why: 'off by a part' }
    ],
    verify: ({ a, b, T, total }, value) => {
      const fractionC = 1 - T / a - T / b;
      return fractionC > 0 && nearlyEqual(value, total * fractionC);
    },
    render({ a, b, T, D, pa, pb, pc, unit, total }) {
      return {
        question: `A alone can do a job in ${a} days and B alone in ${b} days. With C's help they finish it in ${T} days. The total payment is ${format.rupees(total)}. How much does C get?`,
        explanation: `In ${T} days A does ${T}/${a} and B does ${T}/${b} of the job. Taking the job as ${D} units, A did ${pa}, B did ${pb} and C did ${D} − ${pa} − ${pb} = ${pc}. C gets ${pc}/${D} of ${format.rupees(total)} = ${format.rupees(pc * unit)}.`,
        solutionSteps: [`Job = ${D} units.`, `A: ${T} × ${D / a} = ${pa}; B: ${T} × ${D / b} = ${pb}.`, `C: ${D} − ${pa} − ${pb} = ${pc}.`, `C's pay = ${pc} × ${unit} = ${pc * unit}.`],
        method: "Find what is left over for the third worker, then split by units of work.",
        hints: [`How much work do A and B each do in ${T} days?`, 'C completed whatever fraction remains.'],
        commonMistakes: ['Splitting three ways equally.']
      };
    }
  },

  {
    id: 'ww-total-bill',
    version: 1,
    topicId: 'work-and-wages',
    conceptId: 'ww-mandays',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ww-mandays-f'],
    estimatedSeconds: 40,
    params(rng) {
      return { n: rng.int(3, 15), d: rng.int(2, 20), w: rng.int(4, 30) * 10 };
    },
    answer: ({ n, d, w }) => n * d * w,
    formatValue: (value) => format.rupees(value),
    distractors: ({ n, d, w }) => [
      { value: n * w, why: 'forgot to multiply by the days' },
      { value: d * w, why: 'forgot to multiply by the workers' },
      { value: n * d, why: 'forgot the daily wage' },
      { value: (n + d) * w, why: 'added workers and days' }
    ],
    verify: ({ n, d, w }, value) => {
      let total = 0;
      for (let day = 0; day < d; day++) for (let worker = 0; worker < n; worker++) total += w;
      return total === value;
    },
    render({ n, d, w }) {
      return {
        question: `${n} workers each work ${d} days at ${format.rupees(w)} per day. What is the total wage bill?`,
        explanation: `Man-days = ${n} × ${d} = ${n * d}. Wages = ${n * d} × ${format.rupees(w)} = ${format.rupees(n * d * w)}.`,
        solutionSteps: [`Man-days = ${n} × ${d} = ${n * d}.`, `Wages = ${n * d} × ${w} = ${n * d * w}.`],
        method: 'Total = workers × days × daily wage.',
        hints: ['Count the man-days first.'],
        commonMistakes: ['Forgetting to multiply by the number of days.']
      };
    }
  }
];
