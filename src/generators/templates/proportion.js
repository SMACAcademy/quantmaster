/** Direct and inverse proportion, and partnership templates. */

import { fmt, format, gcd, nearlyEqual } from '../core.js';

function divisorsOf(n, min, max) {
  const out = [];
  for (let d = min; d <= max; d++) if (n % d === 0) out.push(d);
  return out;
}

export const proportionTemplates = [
  /* ===================== direct and inverse proportion ===================== */
  {
    id: 'dp-direct-scale',
    version: 1,
    topicId: 'direct-inverse-proportion',
    conceptId: 'dp-direct',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dp-direct-f'],
    estimatedSeconds: 40,
    params(rng) {
      const item = rng.pick(['pens', 'notebooks', 'metres of cloth', 'kg of sugar']);
      const n1 = rng.int(3, 12);
      const n2 = rng.int(3, 20);
      if (n1 === n2) return null;
      return { item, n1, n2, u: rng.int(4, 40) };
    },
    answer: ({ n2, u }) => n2 * u,
    formatValue: (value) => format.rupees(value),
    distractors: ({ n1, n2, u }) => [
      { value: n1 * u + (n2 - n1), why: 'added the difference in quantity to the cost' },
      { value: (n1 * u * n1) / n2, why: 'treated it as inverse proportion' },
      { value: n1 * u * n2, why: 'multiplied without dividing' },
      { value: n1 * u + n2, why: 'added the quantity to the cost' }
    ],
    verify: ({ n1, n2, u }, value) => nearlyEqual(value / n2, (n1 * u) / n1),
    render({ item, n1, n2, u }) {
      return {
        question: `${n1} ${item} cost ${format.rupees(n1 * u)}. What is the cost of ${n2} ${item} at the same rate?`,
        explanation: `One unit costs ${n1 * u} ÷ ${n1} = ${format.rupees(u)}, so ${n2} cost ${n2} × ${u} = ${format.rupees(n2 * u)}.`,
        solutionSteps: [`Unit cost = ${n1 * u} ÷ ${n1} = ${u}.`, `${n2} × ${u} = ${n2 * u}.`],
        method: 'Find the unit value, then scale.',
        hints: ['Find the cost of one unit first.', 'More items mean a higher cost: direct proportion.'],
        commonMistakes: ['Adding the difference instead of scaling.']
      };
    }
  },

  {
    id: 'dp-inverse-time',
    version: 1,
    topicId: 'direct-inverse-proportion',
    conceptId: 'dp-inverse',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dp-inverse-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const ctx = rng.pick([
        { who: 'workers', what: 'a job', unit: 'days' },
        { who: 'taps', what: 'a tank', unit: 'hours' },
        { who: 'machines', what: 'an order', unit: 'days' }
      ]);
      const M1 = rng.int(3, 20);
      const D1 = rng.int(4, 30);
      const W = M1 * D1;
      const options = divisorsOf(W, 2, 60).filter((m) => m !== M1);
      if (!options.length) return null;
      return { ...ctx, M1, D1, M2: rng.pick(options), W };
    },
    answer: ({ W, M2 }) => W / M2,
    formatValue: (value, { unit }) => `${fmt(value)} ${unit}`,
    distractors: ({ M1, D1, M2, W }) => [
      { value: (D1 * M2) / M1, why: 'treated it as direct proportion' },
      { value: W, why: 'gave the total work' },
      { value: D1, why: 'assumed the time stays the same' },
      { value: D1 + Math.abs(M2 - M1), why: 'adjusted by the difference in workers' }
    ],
    verify: ({ M1, D1, M2 }, value) => nearlyEqual(M2 * value, M1 * D1),
    render({ who, what, unit, M1, D1, M2, W }) {
      return {
        question: `${M1} ${who} can complete ${what} in ${D1} ${unit}. How long will ${M2} ${who} take at the same rate?`,
        explanation: `Total work = ${M1} × ${D1} = ${W} ${who.slice(0, -1)}-${unit}. With ${M2} ${who} it takes ${W} ÷ ${M2} = ${fmt(W / M2)} ${unit}.`,
        solutionSteps: [`${M1} × ${D1} = ${W}.`, `${W} ÷ ${M2} = ${fmt(W / M2)}.`],
        method: 'Inverse proportion: the product stays constant.',
        hints: [`${M2 > M1 ? 'More' : 'Fewer'} ${who} means ${M2 > M1 ? 'less' : 'more'} time.`, 'Multiply first to find the total work.'],
        commonMistakes: ['Scaling the time in the same direction as the workers.']
      };
    }
  },

  {
    id: 'dp-speed-time',
    version: 1,
    topicId: 'direct-inverse-proportion',
    conceptId: 'dp-inverse',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dp-inverse-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const s1 = rng.int(3, 16) * 5;
      const t1 = rng.int(2, 12);
      const options = divisorsOf(s1 * t1, 10, 120).filter((s) => s % 5 === 0 && s !== s1);
      if (!options.length) return null;
      return { s1, t1, s2: rng.pick(options) };
    },
    answer: ({ s1, t1, s2 }) => (s1 * t1) / s2,
    formatValue: (value) => format.hours(value),
    distractors: ({ s1, t1, s2 }) => [
      { value: (t1 * s2) / s1, why: 'scaled the time with the speed' },
      { value: s1 * t1, why: 'gave the distance' },
      { value: Math.abs(t1 - (s2 - s1)), why: 'subtracted the change in speed' },
      { value: t1, why: 'assumed the time stays the same' }
    ],
    verify: ({ s1, t1, s2 }, value) => nearlyEqual(s2 * value, s1 * t1),
    render({ s1, t1, s2 }) {
      return {
        question: `A car takes ${t1} hours at ${s1} km/hr to cover a certain distance. How long would it take at ${s2} km/hr?`,
        explanation: `Distance = ${s1} × ${t1} = ${s1 * t1} km. At ${s2} km/hr the time is ${s1 * t1} ÷ ${s2} = ${fmt((s1 * t1) / s2)} hours.`,
        solutionSteps: [`Distance = ${s1 * t1} km.`, `Time = ${s1 * t1} ÷ ${s2} = ${fmt((s1 * t1) / s2)} hr.`],
        method: 'For a fixed distance, speed × time is constant.',
        hints: [`${s2 > s1 ? 'Faster' : 'Slower'} speed means ${s2 > s1 ? 'less' : 'more'} time.`, 'Find the distance first.'],
        commonMistakes: ['Scaling the time in the same direction as the speed.']
      };
    }
  },

  {
    id: 'dp-compound-days',
    version: 1,
    topicId: 'direct-inverse-proportion',
    conceptId: 'dp-compound',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['dp-compound-f'],
    estimatedSeconds: 90,
    tags: ['trap'],
    params(rng) {
      const M2 = rng.int(5, 20);
      const H2 = rng.int(5, 10);
      const D2 = rng.int(6, 30);
      const W = M2 * H2 * D2;
      const men = divisorsOf(W, 5, 30).filter((m) => m !== M2);
      if (!men.length) return null;
      const M1 = rng.pick(men);
      const hours = divisorsOf(W / M1, 5, 10).filter((h) => h !== H2);
      if (!hours.length) return null;
      const H1 = rng.pick(hours);
      return { M1, H1, D1: W / (M1 * H1), M2, H2, D2 };
    },
    answer: ({ D2 }) => D2,
    formatValue: (value) => format.days(value),
    distractors: ({ M1, H1, D1, M2, H2 }) => [
      { value: (M1 * D1) / M2, why: 'ignored the hours per day' },
      { value: (D1 * M2 * H2) / (M1 * H1), why: 'treated everything as direct proportion' },
      { value: (D1 * H1) / H2, why: 'ignored the number of men' },
      { value: D1, why: 'assumed the time stays the same' }
    ],
    verify: ({ M1, H1, D1, M2, H2 }, value) => nearlyEqual(M2 * H2 * value, M1 * H1 * D1),
    render({ M1, H1, D1, M2, H2, D2 }) {
      return {
        question: `${M1} men working ${H1} hours a day can finish a job in ${D1} days. In how many days can ${M2} men working ${H2} hours a day finish it?`,
        explanation: `Total work = ${M1} × ${H1} × ${D1} = ${M1 * H1 * D1} man-hours. The second crew does ${M2} × ${H2} = ${M2 * H2} man-hours a day, so ${M1 * H1 * D1} ÷ ${M2 * H2} = ${D2} days.`,
        solutionSteps: [`${M1} × ${H1} × ${D1} = ${M1 * H1 * D1} man-hours.`, `${M2} × ${H2} = ${M2 * H2} per day.`, `${M1 * H1 * D1} ÷ ${M2 * H2} = ${D2}.`],
        method: 'Total man-hours stays constant.',
        hints: ['Convert everything into man-hours.', 'Do not forget the hours per day.'],
        commonMistakes: ['Ignoring the hours per day.']
      };
    }
  },

  /* ================================ partnership ================================ */
  {
    id: 'pt-capital-share',
    version: 1,
    topicId: 'partnership',
    conceptId: 'pt-capital',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pt-capital-f'],
    estimatedSeconds: 50,
    params(rng) {
      const parts = [rng.int(1, 9), rng.int(1, 9), rng.int(1, 9)];
      const g = parts.reduce((acc, x) => gcd(acc, x));
      if (g !== 1 || new Set(parts).size < 3) return null;
      const unit = rng.int(2, 20) * 100;
      const pick = rng.int(0, 2);
      const sum = parts[0] + parts[1] + parts[2];
      return { parts, unit, sum, pick, profit: sum * unit, cap: rng.int(1, 3) * 1000 };
    },
    answer: ({ parts, unit, pick }) => parts[pick] * unit,
    formatValue: (value) => format.rupees(value),
    distractors: ({ parts, unit, pick, profit }) => [
      { value: profit / 3, why: 'split equally' },
      { value: parts[(pick + 1) % 3] * unit, why: "gave another partner's share" },
      { value: parts[(pick + 2) % 3] * unit, why: "gave another partner's share" },
      { value: parts[pick] * unit + unit, why: 'added an extra part' }
    ],
    verify: ({ parts, pick, profit }, value) => nearlyEqual(value / profit, parts[pick] / (parts[0] + parts[1] + parts[2])),
    render({ parts, unit, sum, pick, profit, cap }) {
      const names = ['A', 'B', 'C'];
      const caps = parts.map((p) => p * cap);
      return {
        question: `A, B and C invest ${format.rupees(caps[0])}, ${format.rupees(caps[1])} and ${format.rupees(caps[2])} in a business for one year. The profit is ${format.rupees(profit)}. What is ${names[pick]}'s share?`,
        explanation: `The capitals are in the ratio ${parts.join(' : ')} (${sum} parts). One part = ${format.rupees(profit)} ÷ ${sum} = ${format.rupees(unit)}, so ${names[pick]} gets ${parts[pick]} × ${format.rupees(unit)} = ${format.rupees(parts[pick] * unit)}.`,
        solutionSteps: [`Ratio of capitals = ${parts.join(' : ')}.`, `One part = ${profit} ÷ ${sum} = ${unit}.`, `${names[pick]} = ${parts[pick]} × ${unit} = ${parts[pick] * unit}.`],
        method: 'Equal time: share profit in the ratio of capitals.',
        hints: ['Simplify the ratio of the capitals.', 'Divide the profit by the total number of parts.'],
        commonMistakes: ['Splitting the profit equally.']
      };
    }
  },

  {
    id: 'pt-time-share',
    version: 1,
    topicId: 'partnership',
    conceptId: 'pt-time',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pt-time-f'],
    estimatedSeconds: 70,
    tags: ['trap'],
    params(rng) {
      const a = rng.int(2, 9) * 1000;
      const b = rng.int(2, 9) * 1000;
      const ma = rng.int(3, 12);
      const mb = rng.int(3, 12);
      const x = a * ma;
      const y = b * mb;
      if (x === y) return null;
      const g = gcd(x, y);
      const rx = x / g;
      const ry = y / g;
      if (rx + ry > 40) return null;
      const unit = rng.int(2, 15) * 100;
      return { a, b, ma, mb, rx, ry, unit, profit: (rx + ry) * unit };
    },
    answer: ({ rx, unit }) => rx * unit,
    formatValue: (value) => format.rupees(value),
    distractors: ({ a, b, ma, mb, profit, ry, unit }) => [
      { value: (profit * a) / (a + b), why: 'shared by capital only' },
      { value: (profit * ma) / (ma + mb), why: 'shared by time only' },
      { value: ry * unit, why: "gave the other partner's share" },
      { value: profit / 2, why: 'split equally' }
    ],
    verify: ({ a, b, ma, mb, profit }, value) => nearlyEqual(value * b * mb, (profit - value) * a * ma),
    render({ a, b, ma, mb, rx, ry, unit, profit }) {
      return {
        question: `A invests ${format.rupees(a)} for ${ma} months and B invests ${format.rupees(b)} for ${mb} months. The profit is ${format.rupees(profit)}. What is A's share?`,
        explanation: `Capital-months: A = ${a} × ${ma} = ${a * ma}; B = ${b} × ${mb} = ${b * mb}. The ratio is ${rx} : ${ry}. One part = ${format.rupees(profit)} ÷ ${rx + ry} = ${format.rupees(unit)}, so A gets ${format.rupees(rx * unit)}.`,
        solutionSteps: [`A: ${a} × ${ma} = ${a * ma}.`, `B: ${b} × ${mb} = ${b * mb}.`, `Ratio ${rx} : ${ry}, so A = ${profit} × ${rx} ÷ ${rx + ry} = ${rx * unit}.`],
        method: 'Share in the ratio of capital × months.',
        hints: ['Multiply each capital by the months it was invested.', 'Simplify the ratio, then divide the profit.'],
        commonMistakes: ['Sharing by capital alone.']
      };
    }
  },

  {
    id: 'pt-late-joiner',
    version: 1,
    topicId: 'partnership',
    conceptId: 'pt-changes',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pt-time-f', 'pt-stages-f'],
    estimatedSeconds: 75,
    tags: ['trap'],
    params(rng) {
      const a = rng.int(3, 9) * 1000;
      const b = rng.int(3, 12) * 1000;
      const m = rng.int(2, 8);
      const x = a * 12;
      const y = b * (12 - m);
      if (x === y) return null;
      const g = gcd(x, y);
      const rx = x / g;
      const ry = y / g;
      if (rx + ry > 40) return null;
      const unit = rng.int(2, 15) * 100;
      return { a, b, m, rx, ry, unit, profit: (rx + ry) * unit };
    },
    answer: ({ ry, unit }) => ry * unit,
    formatValue: (value) => format.rupees(value),
    distractors: ({ a, b, rx, unit, profit }) => [
      { value: (profit * b) / (a + b), why: 'ignored the months B was not invested' },
      { value: rx * unit, why: "gave A's share" },
      { value: profit / 2, why: 'split equally' },
      { value: (profit * b * 12) / (a * 12 + b * 12) + unit, why: 'shifted by a part' }
    ],
    verify: ({ a, b, m, profit }, value) => nearlyEqual(value * a * 12, (profit - value) * b * (12 - m)),
    render({ a, b, m, rx, ry, unit, profit }) {
      return {
        question: `A starts a business with ${format.rupees(a)}. After ${m} months B joins with ${format.rupees(b)}. At the end of the year the profit is ${format.rupees(profit)}. What is B's share?`,
        explanation: `A: ${a} × 12 = ${a * 12}. B: ${b} × ${12 - m} = ${b * (12 - m)}. The ratio is ${rx} : ${ry}, so B gets ${ry} of ${rx + ry} parts = ${format.rupees(ry * unit)}.`,
        solutionSteps: [`A is invested 12 months; B only ${12 - m} months.`, `Ratio ${a * 12} : ${b * (12 - m)} = ${rx} : ${ry}.`, `B = ${profit} × ${ry} ÷ ${rx + ry} = ${ry * unit}.`],
        method: 'Use the months each partner is actually invested.',
        hints: [`How many months is B invested?`, 'Multiply each capital by its months.'],
        commonMistakes: ['Giving B the full 12 months.']
      };
    }
  },

  {
    id: 'pt-manager',
    version: 1,
    topicId: 'partnership',
    conceptId: 'pt-working',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['pt-working-f'],
    estimatedSeconds: 90,
    tags: ['trap'],
    params(rng) {
      const p = rng.int(2, 6);
      const q = rng.int(2, 6);
      if (p === q || gcd(p, q) !== 1) return null;
      const c = rng.pick([10, 20, 25]);
      const unit = rng.int(2, 20) * 100;
      const rest = (p + q) * unit;
      const profit = (rest * 100) / (100 - c);
      if (!Number.isInteger(profit)) return null;
      return { p, q, c, unit, rest, profit };
    },
    answer: ({ q, unit }) => q * unit,
    formatValue: (value) => format.rupees(value),
    distractors: ({ p, q, profit, unit, c }) => [
      { value: (profit * q) / (p + q), why: 'did not deduct the commission first' },
      { value: (profit * c) / 100 + p * unit, why: "gave the manager's total" },
      { value: p * unit, why: "gave the manager's investor share" },
      { value: profit / 2, why: 'split equally' }
    ],
    verify: ({ p, q, c, profit, rest }, value) => {
      const commission = (profit * c) / 100;
      return nearlyEqual(commission + rest, profit) && nearlyEqual(value / (rest - value), q / p);
    },
    render({ p, q, c, unit, rest, profit }) {
      const commission = (profit * c) / 100;
      return {
        question: `A and B invest in the ratio ${p} : ${q} for one year. A manages the business and takes ${c}% of the profit as commission; the rest is shared in proportion to capital. The total profit is ${format.rupees(profit)}. How much does B get?`,
        explanation: `Commission = ${format.rupees(commission)}. The remaining ${format.rupees(rest)} is shared ${p} : ${q}, so B gets ${format.rupees(q * unit)}.`,
        solutionSteps: [`Commission: ${c}% of ${profit} = ${commission}.`, `Remaining: ${profit} − ${commission} = ${rest}.`, `B = ${rest} × ${q} ÷ ${p + q} = ${q * unit}.`],
        method: 'Commission off the top; B shares only the remainder.',
        hints: ['Which amount is left to divide by capital?', 'Only the manager receives the commission.'],
        commonMistakes: ['Sharing the whole profit by capital.']
      };
    }
  }
];
