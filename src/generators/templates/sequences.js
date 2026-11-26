/** Sequences (pattern-finding) and geometric progression templates. */

import { nearlyEqual } from '../core.js';

/* A step rule for the alternating / interleaved templates: add k, or multiply by k. */
const applyRule = (x, { op, k }) => (op === '+' ? x + k : x * k);
const ruleText = ({ op, k }) => (op === '+' ? `+${k}` : `×${k}`);
const ruleWords = ({ op, k }) => (op === '+' ? `adding ${k}` : `multiplying by ${k}`);

function randomRule(rng) {
  return rng.chance(0.65) ? { op: '+', k: rng.int(1, 12) } : { op: '×', k: rng.int(2, 3) };
}

/** Terms 1 … count of two sequences woven together (odd positions follow rule1, even positions rule2). */
function wovenTerms({ a1, rule1, a2, rule2 }, count) {
  const terms = [];
  let odd = a1;
  let even = a2;
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      terms.push(odd);
      odd = applyRule(odd, rule1);
    } else {
      terms.push(even);
      even = applyRule(even, rule2);
    }
  }
  return terms;
}

/** Terms of a series whose steps take turns: rule1, rule2, rule1, … */
function alternatingTerms({ start, rule1, rule2 }, count) {
  const terms = [start];
  while (terms.length < count) terms.push(applyRule(terms[terms.length - 1], terms.length % 2 ? rule1 : rule2));
  return terms;
}

const isArithmetic = (t) => t.every((v, i) => i < 2 || v - t[i - 1] === t[1] - t[0]);
const isGeometric = (t) => t[0] !== 0 && t.every((v, i) => i < 2 || v * t[0] === t[i - 1] * t[1]);

/*
 * Families of series for the wrong-term template. Each has a small parameter space
 * (`space`), a generator for n terms, and words for its rule. The check enumerates
 * every family's whole space, so a series only counts as unambiguous if no rule in
 * any family fits it with a different term changed.
 */
const cartesian = (...lists) => lists.reduce((acc, list) => acc.flatMap((prefix) => list.map((v) => [...prefix, v])), [[]]);
const WRONG_FAMILIES = {
  arith: {
    space: () => cartesian(range(1, 60), range(1, 25)).map(([a, d]) => ({ a, d })),
    terms: ({ a, d }, n) => Array.from({ length: n }, (_, i) => a + i * d),
    words: ({ d }) => `add ${d} each time`
  },
  geo: {
    space: () => cartesian(range(1, 20), range(2, 4)).map(([a, r]) => ({ a, r })),
    terms: ({ a, r }, n) => Array.from({ length: n }, (_, i) => a * r ** i),
    words: ({ r }) => `multiply by ${r} each time`
  },
  doublePlus: {
    space: () => cartesian(range(1, 30), range(1, 5)).map(([s, c]) => ({ s, c })),
    terms: ({ s, c }, n) => Array.from({ length: n - 1 }).reduce((t) => [...t, 2 * t[t.length - 1] + c], [s]),
    words: ({ c }) => `double the previous term and add ${c}`
  },
  squares: {
    space: () => cartesian(range(1, 9), range(-5, 10)).map(([m, c]) => ({ m, c })),
    terms: ({ m, c }, n) => Array.from({ length: n }, (_, i) => (m + i) ** 2 + c),
    words: ({ m, c }) => `consecutive squares${c ? ` ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}` : ''} (${m}²${c ? ` ${c > 0 ? '+' : '−'} ${Math.abs(c)}` : ''}, ${m + 1}²${c ? ` ${c > 0 ? '+' : '−'} ${Math.abs(c)}` : ''}, …)`
  },
  cubes: {
    space: () => range(1, 6).map((m) => ({ m })),
    terms: ({ m }, n) => Array.from({ length: n }, (_, i) => (m + i) ** 3),
    words: ({ m }) => `consecutive cubes (${m}³, ${m + 1}³, …)`
  },
  pronic: {
    space: () => range(1, 9).map((m) => ({ m })),
    terms: ({ m }, n) => Array.from({ length: n }, (_, i) => (m + i) * (m + i + 1)),
    words: ({ m }) => `n × (n + 1) for n = ${m}, ${m + 1}, …`
  },
  secondDiff: {
    space: () => cartesian(range(1, 40), range(1, 12), range(1, 5)).map(([a, d, e]) => ({ a, d, e })),
    terms: ({ a, d, e }, n) => Array.from({ length: n }, (_, i) => a + i * d + (e * i * (i - 1)) / 2),
    words: ({ d, e }) => `differences ${d}, ${d + e}, ${d + 2 * e}, … rising by ${e}`
  }
};
function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
const WRONG_SPACES = Object.fromEntries(Object.entries(WRONG_FAMILIES).map(([key, family]) => [key, family.space()]));

/* Every rule's first n terms, built once per length. */
const WRONG_TABLES = new Map();
function wrongTable(n) {
  if (!WRONG_TABLES.has(n)) {
    WRONG_TABLES.set(n, Object.entries(WRONG_FAMILIES).flatMap(([key, family]) => WRONG_SPACES[key].map((params) => family.terms(params, n))));
  }
  return WRONG_TABLES.get(n);
}

/** Positions that some rule (in any family) explains with only that one term changed. */
function explainablePositions(shown) {
  const positions = new Set();
  for (const expected of wrongTable(shown.length)) {
    const off = [];
    for (let i = 0; i < shown.length && off.length < 2; i++) if (expected[i] !== shown[i]) off.push(i);
    if (off.length === 0) return null; // the series is already perfect: no wrong term at all
    if (off.length === 1) positions.add(off[0]);
  }
  return positions;
}

export const sequenceTemplates = [
  /* ================================= sequences ================================= */
  {
    id: 'sq-arith-next',
    version: 1,
    topicId: 'sequences',
    conceptId: 'sq-arithmetic',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['sq-arith-f'],
    estimatedSeconds: 30,
    params(rng) {
      const a = rng.int(1, 30);
      const d = rng.int(2, 9);
      return { a, d };
    },
    answer: ({ a, d }) => a + 4 * d,
    verify: ({ a, d }, value) => a + 4 * d === value,
    render({ a, d }) {
      const terms = [a, a + d, a + 2 * d, a + 3 * d];
      return {
        question: `What comes next: ${terms.join(', ')}, ?`,
        explanation: `Each term increases by ${d}, so the next term is ${terms[3]} + ${d} = ${terms[3] + d}.`,
        solutionSteps: [`Common difference = ${d}.`, `${terms[3]} + ${d} = ${terms[3] + d}.`],
        method: 'Find the constant difference, then add it once more.',
        hints: ['Check the gap between each pair of consecutive terms.'],
        commonMistakes: ['Using the wrong difference by checking only one gap.']
      };
    }
  },

  {
    id: 'sq-geo-next',
    version: 1,
    topicId: 'sequences',
    conceptId: 'sq-geometric',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['sq-geo-f'],
    estimatedSeconds: 35,
    params(rng) {
      const a = rng.int(1, 10);
      const r = rng.pick([2, 3, 4]);
      if (a * r ** 4 > 20000) return null;
      return { a, r };
    },
    answer: ({ a, r }) => a * r ** 4,
    verify: ({ a, r }, value) => a * r ** 4 === value,
    render({ a, r }) {
      const terms = [a, a * r, a * r ** 2, a * r ** 3];
      return {
        question: `What comes next: ${terms.join(', ')}, ?`,
        explanation: `Each term is multiplied by ${r}, so the next term is ${terms[3]} × ${r} = ${terms[3] * r}.`,
        solutionSteps: [`Common ratio = ${r}.`, `${terms[3]} × ${r} = ${terms[3] * r}.`],
        method: 'Find the constant ratio, then multiply once more.',
        hints: ['Check what each term is multiplied by to reach the next.'],
        commonMistakes: ['Treating this as an arithmetic pattern and adding a fixed amount.']
      };
    }
  },

  {
    id: 'sq-quadratic-diff',
    version: 1,
    topicId: 'sequences',
    conceptId: 'sq-other',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['sq-other-f'],
    estimatedSeconds: 50,
    params(rng) {
      const a = rng.int(1, 15);
      const d0 = rng.int(1, 6);
      const e = rng.int(1, 4);
      const terms = [a];
      let diff = d0;
      for (let i = 1; i <= 5; i++) {
        terms.push(terms[i - 1] + diff);
        diff += e;
      }
      return { a, d0, e, terms };
    },
    answer: ({ terms }) => terms[5],
    verify({ a, d0, e }, value) {
      const terms = [a];
      let diff = d0;
      for (let i = 1; i <= 5; i++) {
        terms.push(terms[i - 1] + diff);
        diff += e;
      }
      return terms[5] === value;
    },
    render({ terms, d0, e }) {
      const shown = terms.slice(0, 5);
      const diffs = [];
      for (let i = 1; i < shown.length; i++) diffs.push(shown[i] - shown[i - 1]);
      return {
        question: `What comes next: ${shown.join(', ')}, ?`,
        explanation: `The differences are ${diffs.join(', ')}, increasing by ${e} each time. The next difference is ${diffs[diffs.length - 1] + e}, so the next term is ${shown[4]} + ${diffs[diffs.length - 1] + e} = ${terms[5]}.`,
        solutionSteps: [`Differences: ${diffs.join(', ')}.`, `Next difference: ${diffs[diffs.length - 1] + e}.`, `${shown[4]} + ${diffs[diffs.length - 1] + e} = ${terms[5]}.`],
        method: 'Look at the differences between terms.',
        hints: ['The differences themselves form their own arithmetic pattern.'],
        commonMistakes: ['Assuming the sequence itself has a constant difference.']
      };
    }
  },

  {
    id: 'sq-interleaved-next',
    version: 1,
    topicId: 'sequences',
    conceptId: 'sq-interleaved',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['sq-interleaved-f'],
    estimatedSeconds: 60,
    params(rng) {
      const kind = rng.pick(['woven', 'alternating']);
      const shown = rng.int(6, 7);
      if (kind === 'woven') {
        const p = { a1: rng.int(1, 12), rule1: randomRule(rng), a2: rng.int(1, 30), rule2: randomRule(rng) };
        const terms = wovenTerms(p, shown + 1);
        if (Math.max(...terms) > 999 || isArithmetic(terms) || isGeometric(terms)) return null;
        return { kind, shown, ...p };
      }
      const add = { op: '+', k: rng.int(1, 9) };
      const times = { op: '×', k: rng.int(2, 3) };
      const [rule1, rule2] = rng.chance(0.5) ? [add, times] : [times, add];
      const p = { start: rng.int(1, 9), rule1, rule2 };
      if (Math.max(...alternatingTerms(p, shown + 1)) > 999) return null;
      return { kind, shown, ...p };
    },
    answer: (p) => (p.kind === 'woven' ? wovenTerms(p, p.shown + 1) : alternatingTerms(p, p.shown + 1))[p.shown],
    // Closed forms: each woven strand jumps straight to its own term; alternating pairs apply both rules at once.
    verify(p, value) {
      const pos = p.shown; // zero-based index of the asked-for term
      if (p.kind === 'woven') {
        const [start, rule] = pos % 2 === 0 ? [p.a1, p.rule1] : [p.a2, p.rule2];
        const steps = Math.floor(pos / 2);
        return value === (rule.op === '+' ? start + steps * rule.k : start * rule.k ** steps);
      }
      let x = p.start;
      for (let i = 0; i + 2 <= pos; i += 2) x = applyRule(applyRule(x, p.rule1), p.rule2);
      if (pos % 2) x = applyRule(x, p.rule1);
      return value === x;
    },
    render(p) {
      const all = p.kind === 'woven' ? wovenTerms(p, p.shown + 1) : alternatingTerms(p, p.shown + 1);
      const terms = all.slice(0, p.shown);
      const answer = all[p.shown];
      if (p.kind === 'woven') {
        const odd = terms.filter((_, i) => i % 2 === 0);
        const even = terms.filter((_, i) => i % 2 === 1);
        const nextOdd = p.shown % 2 === 0;
        const [strand, rule] = nextOdd ? [odd, p.rule1] : [even, p.rule2];
        return {
          question: `What comes next: ${terms.join(', ')}, ?`,
          explanation: `Two sequences are woven together. Odd positions: ${odd.join(', ')} (${ruleWords(p.rule1)}). Even positions: ${even.join(', ')} (${ruleWords(p.rule2)}). Term ${p.shown + 1} is in an ${nextOdd ? 'odd' : 'even'} position, so it is ${strand[strand.length - 1]} ${ruleText(rule).replace(/^([+×])/, '$1 ')} = ${answer}.`,
          solutionSteps: [`Odd positions: ${odd.join(', ')} (${ruleText(p.rule1)}).`, `Even positions: ${even.join(', ')} (${ruleText(p.rule2)}).`, `Term ${p.shown + 1}: ${answer}.`],
          method: 'Split the series into odd and even positions.',
          hints: ['Read every other term.', `Which of the two sequences does term ${p.shown + 1} belong to?`],
          commonMistakes: [`Continuing the ${nextOdd ? 'even' : 'odd'}-position sequence instead.`, 'Looking only at consecutive differences, which hide the two patterns.']
        };
      }
      const rule = p.shown % 2 ? p.rule1 : p.rule2;
      const chain = all.map((t, i) => (i === 0 ? `${t}` : `(${ruleText(i % 2 ? p.rule1 : p.rule2)}) ${t}`)).join(' ');
      return {
        question: `What comes next: ${terms.join(', ')}, ?`,
        explanation: `The steps take turns: ${ruleWords(p.rule1)}, then ${ruleWords(p.rule2)}. The next step is ${ruleText(rule)}, so ${terms[terms.length - 1]} ${ruleText(rule).replace(/^([+×])/, '$1 ')} = ${answer}.`,
        solutionSteps: [chain + '.', `Next step: ${ruleText(rule)}.`],
        method: 'Track which operation applies at each step.',
        hints: ['The gaps are not constant. Do the steps alternate between two operations?', `Look at how you get from ${terms[0]} to ${terms[1]}, then from ${terms[1]} to ${terms[2]}.`],
        commonMistakes: [`Applying ${ruleText(p.shown % 2 ? p.rule2 : p.rule1)} at this step instead of ${ruleText(rule)}.`]
      };
    }
  },

  {
    id: 'sq-wrong-term',
    version: 1,
    topicId: 'sequences',
    conceptId: 'sq-wrong',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['sq-wrong-f'],
    estimatedSeconds: 70,
    formatValue: (value) => String(value),
    params(rng) {
      const family = rng.pick(Object.keys(WRONG_FAMILIES));
      const params = rng.pick(WRONG_SPACES[family]);
      const n = rng.int(6, 7);
      const correct = WRONG_FAMILIES[family].terms(params, n);
      if (Math.max(...correct) > 999 || correct.some((v) => v <= 0)) return null;
      const wrong = rng.int(1, n - 2);
      const shift = rng.pick([-3, -2, -1, 1, 2, 3]);
      const shown = correct.map((v, i) => (i === wrong ? v + shift : v));
      if (shown[wrong] <= 0 || new Set(shown).size < n) return null;
      // Only keep series where exactly this one term can be the wrong one.
      const positions = explainablePositions(shown);
      if (!positions || positions.size !== 1 || !positions.has(wrong)) return null;
      return { family, params, shown, wrong, correctValue: correct[wrong] };
    },
    answer: ({ shown, wrong }) => shown[wrong],
    distractors: ({ shown, wrong }) => [
      { value: shown[wrong + 1], why: 'blamed the term after the wrong one' },
      { value: shown[wrong - 1], why: 'blamed the term before the wrong one' },
      { value: shown[shown.length - 1], why: 'blamed the last term' },
      { value: shown[0], why: 'blamed the first term' }
    ],
    // Every rule in every family is tried against every position.
    verify({ shown }, value) {
      const positions = explainablePositions(shown);
      return Boolean(positions) && positions.size === 1 && shown[[...positions][0]] === value;
    },
    render({ family, params, shown, wrong, correctValue }) {
      const correct = shown.map((v, i) => (i === wrong ? correctValue : v));
      const words = WRONG_FAMILIES[family].words(params);
      return {
        question: `Which number is wrong in the series ${shown.join(', ')}?`,
        explanation: `The rule is: ${words}. The series should be ${correct.join(', ')}. The term shown as ${shown[wrong]} should be ${correctValue}, so ${shown[wrong]} is the wrong number.`,
        solutionSteps: [`Rule from the other terms: ${words}.`, `Rebuilt series: ${correct.join(', ')}.`, `${shown[wrong]} should be ${correctValue}.`],
        method: 'Find the rule from the terms that agree, rebuild the series, and see which term differs.',
        hints: ['One wrong term spoils the steps on both sides of it.', 'Find a rule that fits most of the series, then check each term against it.'],
        commonMistakes: [`Blaming ${shown[wrong + 1]}, which only looks out of place because it follows the wrong term.`]
      };
    }
  },

  /* ========================== geometric progression ========================== */
  {
    id: 'gp-nth-term-easy',
    version: 1,
    topicId: 'geometric-progression',
    conceptId: 'gp-nth',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['gp-nth-f'],
    estimatedSeconds: 35,
    params(rng) {
      const a = rng.int(1, 10);
      const r = rng.pick([2, 3, 4, 5]);
      const n = rng.int(3, 6);
      const term = a * r ** (n - 1);
      if (term > 100000) return null;
      return { a, r, n, term };
    },
    answer: ({ term }) => term,
    verify: ({ a, r, n }, value) => a * r ** (n - 1) === value,
    render({ a, r, n, term }) {
      return {
        question: `A GP has first term ${a} and common ratio ${r}. What is the ${n}th term?`,
        explanation: `Tn = a·r^(n−1) = ${a} × ${r}^${n - 1} = ${a} × ${r ** (n - 1)} = ${term}.`,
        solutionSteps: [`Exponent = n − 1 = ${n - 1}.`, `${r}^${n - 1} = ${r ** (n - 1)}.`, `${a} × ${r ** (n - 1)} = ${term}.`],
        method: 'Use Tn = a · r^(n−1).',
        hints: ['The exponent is one less than the term number.'],
        commonMistakes: [`Using r^${n} instead of r^${n - 1}.`]
      };
    }
  },

  {
    id: 'gp-ratio-find',
    version: 1,
    topicId: 'geometric-progression',
    conceptId: 'gp-ratio',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['gp-ratio-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(1, 10);
      const r = rng.pick([2, 3, 4, 5]);
      const n = rng.int(3, 5);
      const T = a * r ** (n - 1);
      if (T > 100000) return null;
      return { a, r, n, T };
    },
    answer: ({ r }) => r,
    verify: ({ a, n, T }, value) => a * value ** (n - 1) === T,
    render({ a, r, n, T }) {
      return {
        question: `In a GP, the first term is ${a} and the ${n}th term is ${T}. What is the common ratio?`,
        explanation: `${T} = ${a} × r^${n - 1}, so r^${n - 1} = ${T / a}. Since ${r}^${n - 1} = ${r ** (n - 1)}, the common ratio is ${r}.`,
        solutionSteps: [`r^${n - 1} = ${T} ÷ ${a} = ${T / a}.`, `Find the (${n - 1})th root: r = ${r}.`],
        method: 'Divide the term by the first term, then undo the exponent.',
        hints: ['Isolate r^(n−1) first, then find its root.'],
        commonMistakes: ['Using the wrong exponent, forgetting it is (n − 1) not n.']
      };
    }
  },

  {
    id: 'gp-sum-finite',
    version: 1,
    topicId: 'geometric-progression',
    conceptId: 'gp-sum',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['gp-sum-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(1, 10);
      const r = rng.pick([2, 3]);
      const n = rng.int(3, 6);
      const sum = (a * (r ** n - 1)) / (r - 1);
      if (sum > 100000) return null;
      return { a, r, n, sum };
    },
    answer: ({ sum }) => sum,
    verify({ a, r, n }, value) {
      let total = 0;
      let term = a;
      for (let i = 0; i < n; i++) {
        total += term;
        term *= r;
      }
      return total === value;
    },
    render({ a, r, n, sum }) {
      return {
        question: `Find the sum of the first ${n} terms of a GP with first term ${a} and common ratio ${r}.`,
        explanation: `Sn = a(rⁿ − 1)/(r − 1) = ${a}(${r}^${n} − 1)/(${r} − 1) = ${a}(${r ** n - 1})/(${r - 1}) = ${sum}.`,
        solutionSteps: [`${r}^${n} = ${r ** n}.`, `${a}(${r ** n} − 1)/(${r} − 1).`, `= ${sum}.`],
        method: 'Apply the finite-sum formula directly.',
        hints: [`${r}^${n} is not the same as ${r} × ${n}.`],
        commonMistakes: ['Multiplying the ratio by n instead of raising it to the power n.']
      };
    }
  },

  {
    id: 'gp-suminf',
    version: 1,
    topicId: 'geometric-progression',
    conceptId: 'gp-suminf',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['gp-suminf-f'],
    estimatedSeconds: 50,
    params(rng) {
      const fractions = [
        [1, 2], [1, 3], [1, 4], [1, 5], [2, 5], [3, 5], [2, 3], [1, 6]
      ];
      const [num, den] = rng.pick(fractions);
      const k = rng.int(1, 20);
      const a = (den - num) * k;
      const sum = k * den;
      return { num, den, a, sum };
    },
    answer: ({ sum }) => sum,
    verify: ({ a, num, den }, value) => nearlyEqual(a / (1 - num / den), value),
    render({ a, num, den, sum }) {
      return {
        question: `A GP has first term ${a} and common ratio ${num}/${den}. What is the sum to infinity?`,
        explanation: `S∞ = a/(1 − r) = ${a} / (1 − ${num}/${den}) = ${a} / (${den - num}/${den}) = ${a} × ${den}/${den - num} = ${sum}.`,
        solutionSteps: [`1 − ${num}/${den} = ${den - num}/${den}.`, `${a} ÷ (${den - num}/${den}) = ${a} × ${den}/${den - num}.`, `= ${sum}.`],
        method: 'Divide the first term by (1 − r).',
        hints: ['Dividing by a fraction means multiplying by its reciprocal.'],
        commonMistakes: ['Multiplying by (1 − r) instead of dividing.']
      };
    }
  }
];
