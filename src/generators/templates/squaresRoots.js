/**
 * Squares, cubes and roots as calculation methods: squares near a base, squares
 * by splitting, the next square, cubes by the row method, square and cube roots
 * from the ends of a number, roots of decimals, estimates and perfect-square tests.
 * Each answer is checked by the hand method it teaches against direct arithmetic.
 */

import { fmt } from '../core.js';
import { cubeRootByEnds, digitalRoot, intSqrt, isPerfectSquare, squareRootByEnds } from '../../utils/numberTheory.js';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const pw = (a, k) => `${a}${String(k).split('').map((d) => SUP[d]).join('')}`;
/** A decimal for display without floating-point dust: 0.013, not 0.013000000000000001. */
const dec = (value) => fmt(Number(value.toFixed(10)), 10);
const padded = (value, digits) => String(value).padStart(digits, '0');

/** n³ by the row method: a³ | 3a²b | 3ab² | b³ with carries (n = 10a + b). */
function cubeByRow(n) {
  const a = Math.floor(n / 10);
  const b = n % 10;
  const columns = [a ** 3, 3 * a * a * b, 3 * a * b * b, b ** 3];
  let carry = 0;
  const digits = [];
  for (let i = columns.length - 1; i > 0; i--) {
    const total = columns[i] + carry;
    digits.unshift(total % 10);
    carry = Math.floor(total / 10);
  }
  return Number(`${columns[0] + carry}${digits.join('')}`);
}

const NOT_SQUARE_RULES = ['end', 'zeros', 'five', 'digital'];

export const squaresRootsTemplates = [
  /* ============================ squares near a base ============================ */
  {
    id: 'scr-square-near-base',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-base',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['scr-base-f', 'scr-sc-near-1000'],
    estimatedSeconds: 30,
    params(rng) {
      const base = rng.pick([50, 100, 100, 1000]);
      const limit = base === 50 ? 9 : 14;
      const d = rng.int(-limit, limit);
      if (d === 0) return null;
      return { base, d, n: base + d };
    },
    answer: ({ n }) => n * n,
    verify: ({ base, d, n }, value) => {
      if (base === 50) return (25 + d) * 100 + d * d === value;
      return (n + d) * base + d * d === value;
    },
    render({ base, d, n }) {
      const above = d > 0;
      const gap = Math.abs(d);
      if (base === 50) {
        const left = 25 + d;
        return {
          question: `Using the base 50, find ${n}².`,
          explanation: `${n} is ${gap} ${above ? 'above' : 'below'} 50. Left part: 25 ${above ? '+' : '−'} ${gap} = ${left}. Right part: ${gap}² = ${padded(gap * gap, 2)}. So ${n}² = ${fmt(n * n)}.`,
          solutionSteps: [`d = ${d < 0 ? '−' : '+'}${gap}.`, `Left: 25 ${above ? '+' : '−'} ${gap} = ${left} (hundreds).`, `Right: ${padded(gap * gap, 2)} → ${fmt(n * n)}.`],
          method: 'Near 50: (25 + d) hundreds plus d².',
          hints: ['50² = 2,500, so the left part starts from 25.', `${n} is ${gap} ${above ? 'above' : 'below'} 50: ${above ? 'add' : 'subtract'} ${gap} from 25, then write ${gap}² as two digits.`],
          commonMistakes: ['Starting the left part from 50 instead of 25.']
        };
      }
      const zeros = base === 100 ? 2 : 3;
      const left = n + d;
      return {
        question: `Using the base ${fmt(base)}, find ${fmt(n)}².`,
        explanation: `${fmt(n)} is ${gap} ${above ? 'above' : 'below'} ${fmt(base)}. Left part: ${fmt(n)} ${above ? '+' : '−'} ${gap} = ${fmt(left)}. Right part: ${gap}² = ${gap * gap}${gap * gap >= base ? `, which has more than ${zeros} digits: keep ${padded((gap * gap) % base, zeros)} and carry ${Math.floor((gap * gap) / base)} into the left part, giving ${fmt(left + Math.floor((gap * gap) / base))} | ${padded((gap * gap) % base, zeros)}` : `, written with ${zeros} digits as ${padded(gap * gap, zeros)}`}. So ${fmt(n)}² = ${fmt(n * n)}.`,
        solutionSteps: [`d = ${d < 0 ? '−' : '+'}${gap}.`, `Left: ${fmt(left)}.`, `Right: ${gap * gap >= base ? `${gap * gap}, carry ${Math.floor((gap * gap) / base)}` : padded(gap * gap, zeros)} → ${fmt(n * n)}.`],
        method: '(n + d) | d², with d² as many digits as the base has zeros.',
        hints: [`How far is ${fmt(n)} from ${fmt(base)}?`, `${above ? 'Add' : 'Subtract'} that gap, then append its square as ${zeros} digits.`],
        commonMistakes: [`Writing d² with too few digits for the base ${fmt(base)}.`]
      };
    }
  },

  /* ============================ squares by splitting ============================ */
  {
    id: 'scr-square-split',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-identity',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['scr-split-f'],
    estimatedSeconds: 45,
    params(rng) {
      const round = rng.pick([20, 30, 40, 60, 70, 80, 90, 110, 120, 130, 140, 150, 160, 180, 210, 250, 310]);
      const b = rng.int(1, 4);
      const sign = rng.pick([1, -1]);
      return { round, b, sign, n: round + sign * b };
    },
    answer: ({ n }) => n * n,
    formatValue: (value) => fmt(value),
    distractors: ({ round, b, sign }) => [
      { value: round * round + sign * b * b, why: 'dropped the middle term' },
      { value: round * round + sign * round * b + b * b, why: 'used ab instead of 2ab' },
      { value: round * round - sign * 2 * round * b + b * b, why: 'used the wrong sign for the middle term' },
      { value: round * round + sign * 2 * round * b - b * b, why: 'subtracted b²' }
    ],
    verify: ({ round, b, sign }, value) => round * round + sign * 2 * round * b + b * b === value,
    render({ round, b, sign, n }) {
      const s = sign > 0 ? '+' : '−';
      return {
        question: `What is ${fmt(n)}²?`,
        explanation: `Split ${fmt(n)} = ${round} ${s} ${b}. Then ${fmt(n)}² = ${fmt(round * round)} ${s} 2 × ${round} × ${b} + ${b * b} = ${fmt(round * round)} ${s} ${fmt(2 * round * b)} + ${b * b} = ${fmt(n * n)}.`,
        solutionSteps: [`${fmt(n)} = ${round} ${s} ${b}.`, `${round}² = ${fmt(round * round)}, 2ab = ${fmt(2 * round * b)}, b² = ${b * b}.`, `${fmt(round * round)} ${s} ${fmt(2 * round * b)} + ${b * b} = ${fmt(n * n)}.`],
        method: '(a ± b)² with a round number a.',
        hints: [`Which round number is ${fmt(n)} close to?`, 'Remember the middle term 2ab, and that b² is always added.'],
        commonMistakes: ['Dropping the middle term 2ab.', 'Subtracting b² when splitting as a − b.']
      };
    }
  },

  {
    id: 'scr-next-square',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-identity',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['scr-sc-next-square'],
    estimatedSeconds: 30,
    params(rng) {
      const n = rng.int(21, 130);
      const up = rng.chance(0.65);
      return { n, up };
    },
    answer: ({ n, up }) => (up ? (n + 1) ** 2 : (n - 1) ** 2),
    verify: ({ n, up }, value) => (up ? n * n + n + (n + 1) : n * n - n - (n - 1)) === value,
    render({ n, up }) {
      const m = up ? n + 1 : n - 1;
      return {
        question: `Given that ${n}² = ${fmt(n * n)}, find ${m}².`,
        explanation: up
          ? `Consecutive squares differ by the sum of the two numbers: ${m}² = ${n}² + ${n} + ${m} = ${fmt(n * n)} + ${n + m} = ${fmt(m * m)}.`
          : `Consecutive squares differ by the sum of the two numbers: ${m}² = ${n}² − ${n} − ${m} = ${fmt(n * n)} − ${n + m} = ${fmt(m * m)}.`,
        solutionSteps: [`${n} + ${m} = ${n + m}.`, `${fmt(n * n)} ${up ? '+' : '−'} ${n + m} = ${fmt(m * m)}.`],
        method: 'Neighbouring squares differ by the sum of the two numbers.',
        hints: [`${m}² − ${n}² = (${m} − ${n})(${m} + ${n}).`, `So ${up ? 'add' : 'subtract'} ${n} + ${m}.`],
        commonMistakes: [`${up ? 'Adding' : 'Subtracting'} only 2 × ${n} and missing the extra 1.`]
      };
    }
  },

  /* ================================== cubes ================================== */
  {
    id: 'scr-cube-two-digit',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-cube',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['scr-cube-f'],
    estimatedSeconds: 60,
    params(rng) {
      const n = rng.int(11, 59);
      if (n % 10 === 0) return null;
      return { n };
    },
    answer: ({ n }) => n ** 3,
    verify: ({ n }, value) => cubeByRow(n) === value,
    render({ n }) {
      const a = Math.floor(n / 10);
      const b = n % 10;
      const row = [a ** 3, a * a * b, a * b * b, b ** 3];
      const columns = [row[0], 3 * row[1], 3 * row[2], row[3]];
      return {
        question: `Find ${n}³.`,
        explanation: `Row for a = ${a}, b = ${b}: ${row.join(' | ')}. Add the doubled middle terms (${2 * row[1]} and ${2 * row[2]}) underneath to get the columns ${columns.join(' | ')}. Carrying from the right gives ${fmt(n ** 3)}.`,
        solutionSteps: [`Row: a³, a²b, ab², b³ = ${row.join(', ')}.`, `Columns (middle terms tripled): ${columns.join(' | ')}.`, `Carry from the right: ${fmt(n ** 3)}.`],
        method: 'Row method: a³ | 3a²b | 3ab² | b³ with carries.',
        hints: [`Start the row with ${a}³ = ${a ** 3}; each next term is × ${b}/${a}.`, 'Triple the two middle terms, then add the columns from the right with carries.'],
        commonMistakes: ['Forgetting to triple the middle terms.']
      };
    }
  },

  /* ================================ square roots ================================ */
  {
    id: 'scr-sqrt-four-digit',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-sqrt',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['scr-sqrt-f', 'scr-sc-unit-pairs'],
    estimatedSeconds: 40,
    params(rng) {
      const r = rng.int(32, 99);
      if (r % 10 === 0 || r % 10 === 5) return null;
      return { r, N: r * r };
    },
    answer: ({ r }) => r,
    formatValue: (value) => fmt(value),
    distractors: ({ r }) => {
      const other = Math.floor(r / 10) * 10 + (10 - (r % 10));
      return [
        { value: other, why: 'picked the other candidate' },
        { value: r + 10, why: 'wrong tens digit' },
        { value: other + 10, why: 'other candidate, wrong tens digit' },
        { value: r - 10, why: 'wrong tens digit' }
      ];
    },
    verify: ({ N }, value) => squareRootByEnds(N).root === value && value * value === N,
    render({ r, N }) {
      const s = squareRootByEnds(N);
      return {
        question: `What is √${fmt(N)}?`,
        explanation: `${fmt(N)} ends in ${s.unit}, so the root ends in ${s.digits.join(' or ')}. Dropping the last two digits leaves ${s.lead}, and ${s.k}² ≤ ${s.lead} < ${s.k + 1}², so the root is ${s.candidates.join(' or ')}. ${10 * s.k + 5}² = ${fmt(s.mid)} is ${N >= s.mid ? 'less' : 'more'} than ${fmt(N)}, so the root is ${r}.`,
        solutionSteps: [`Unit digit ${s.unit} → ${s.digits.join(' or ')}.`, `${s.lead} → tens digit ${s.k}.`, `Compare with ${10 * s.k + 5}² = ${fmt(s.mid)} → ${r}.`],
        method: 'Unit digit, bracket, midpoint.',
        hints: [`Which digits squared end in ${s.unit}?`, `Compare ${fmt(N)} with ${10 * s.k + 5}².`],
        commonMistakes: ['Choosing between the two candidates without the midpoint check.']
      };
    }
  },

  {
    id: 'scr-sqrt-five-digit',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-sqrt',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['scr-sqrt-f'],
    estimatedSeconds: 60,
    params(rng) {
      const r = rng.int(101, 316);
      if (r % 10 === 0) return null;
      return { r, N: r * r };
    },
    answer: ({ N }) => squareRootByEnds(N).root,
    verify: ({ N }, value) => value * value === N,
    render({ r, N }) {
      const s = squareRootByEnds(N);
      const pick = s.candidates.length === 2 ? ` ${10 * s.k + 5}² = ${fmt(s.mid)} is ${N >= s.mid ? 'not more' : 'more'} than ${fmt(N)}, so the root is ${r}.` : ` Only one candidate: ${r}.`;
      return {
        question: `Find √${fmt(N)}.`,
        explanation: `It ends in ${s.unit}, so the root ends in ${s.digits.join(' or ')}. Dropping the last two digits leaves ${s.lead}, and ${s.k}² = ${s.k * s.k} ≤ ${s.lead} < ${(s.k + 1) ** 2} = ${s.k + 1}², so the root is ${s.candidates.join(' or ')}.${pick}`,
        solutionSteps: [`Unit digit ${s.unit} → ${s.digits.join(' or ')}.`, `${s.lead} → k = ${s.k}, candidates ${s.candidates.join(', ')}.`, s.candidates.length === 2 ? `Midpoint ${10 * s.k + 5}² = ${fmt(s.mid)} → ${r}.` : `Root ${r}.`],
        method: 'Unit digit, then the largest k with k² ≤ the leading part, then the midpoint.',
        hints: ['Drop the last two digits and find the largest square not above what is left.', `Here that square is ${s.k}² = ${s.k * s.k}.`],
        commonMistakes: ['Bracketing with the first digit only, which gives a two-digit root.']
      };
    }
  },

  /* ================================= cube roots ================================= */
  {
    id: 'scr-cbrt-perfect',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-cbrt',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['scr-cbrt-f'],
    estimatedSeconds: 35,
    params(rng) {
      const r = rng.int(11, 99);
      if (r % 10 === 0) return null;
      return { r, N: r ** 3 };
    },
    answer: ({ r }) => r,
    verify: ({ N }, value) => cubeRootByEnds(N).root === value && value ** 3 === N,
    render({ r, N }) {
      const c = cubeRootByEnds(N);
      return {
        question: `What is the cube root of ${fmt(N)}?`,
        explanation: `The cube ends in ${c.unit}, so the root ends in ${c.digit} (${c.digit}³ = ${c.digit ** 3}). Dropping the last three digits leaves ${c.lead}, and ${c.k}³ = ${c.k ** 3} ≤ ${c.lead} < ${(c.k + 1) ** 3} = ${c.k + 1}³, so the tens digit is ${c.k}. The root is ${r}.`,
        solutionSteps: [`Unit digit ${c.unit} → ${c.digit}.`, `${c.lead} lies between ${c.k}³ and ${c.k + 1}³ → ${c.k}.`, `Root = ${r}.`],
        method: 'Unit digit of the cube, then the part left after three digits.',
        hints: [`Which digit cubed ends in ${c.unit}?`, `Drop three digits: between which cubes does ${c.lead} lie?`],
        commonMistakes: [c.unit !== c.digit ? `Keeping the unit digit ${c.unit} (2 ↔ 8 and 3 ↔ 7 swap).` : 'Dropping two digits instead of three for the bracket.']
      };
    }
  },

  /* ============================== decimals and estimates ============================== */
  {
    id: 'scr-sqrt-decimal',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-decimal',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['scr-decimal-f'],
    estimatedSeconds: 40,
    answerDecimals: 4,
    params(rng) {
      const r = rng.int(11, 99);
      if (r % 10 === 0) return null;
      const k = rng.int(1, 3);
      return { r, k };
    },
    answer: ({ r, k }) => r / 10 ** k,
    formatValue: (value) => dec(value),
    distractors: ({ r, k }) => [
      { value: r / 10 ** (k - 1), why: 'one decimal place too few' },
      { value: r / 10 ** (k + 1), why: 'one decimal place too many' },
      { value: r / 10 ** (2 * k), why: 'kept all the decimal places' },
      { value: r / 10 ** (k + 2), why: 'two decimal places too many' }
    ],
    verify: ({ r, k }, value) => Math.abs(value * value - (r * r) / 10 ** (2 * k)) < 1e-12,
    render({ r, k }) {
      const N = (r * r) / 10 ** (2 * k);
      return {
        question: `What is √${dec(N)}?`,
        explanation: `${dec(N)} = ${fmt(r * r)} ÷ ${fmt(10 ** (2 * k))}. √${fmt(r * r)} = ${r} and √${fmt(10 ** (2 * k))} = ${fmt(10 ** k)}, so the root is ${dec(r / 10 ** k)}: ${2 * k} decimal places become ${k}.`,
        solutionSteps: [`√${fmt(r * r)} = ${r}.`, `${2 * k} decimal places → ${k}.`, `√${dec(N)} = ${dec(r / 10 ** k)}.`],
        method: 'Root of the digits, half the decimal places.',
        hints: ['Ignore the decimal point and find the root of the digits.', `Count the decimal places in ${dec(N)} and halve that number.`],
        commonMistakes: ['Keeping the same number of decimal places as the square.']
      };
    }
  },

  {
    id: 'scr-sqrt-estimate',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-approx',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['scr-approx-f'],
    estimatedSeconds: 50,
    answerDecimals: 1,
    params(rng) {
      const N = rng.int(20, 999);
      if (isPerfectSquare(N)) return null;
      const scaled = Math.sqrt(N) * 10;
      // Avoid values that sit on a rounding boundary.
      if (Math.abs(scaled - Math.floor(scaled) - 0.5) < 0.1) return null;
      const lo = intSqrt(N);
      const a = N - lo * lo <= (lo + 1) ** 2 - N ? lo : lo + 1;
      // The estimate must round to the same tenth as the true root, or the working would contradict the answer.
      if (Math.round((a + (N - a * a) / (2 * a)) * 10) !== Math.round(scaled)) return null;
      return { N, a };
    },
    answer: ({ N }) => Math.round(Math.sqrt(N) * 10) / 10,
    formatValue: (value) => value.toFixed(1),
    distractors: ({ N, a }) => {
      const ans = Math.round(Math.sqrt(N) * 10) / 10;
      return [
        { value: Math.round((a + (N - a * a) / a) * 10) / 10, why: 'divided by a instead of 2a' },
        { value: ans + 0.3, why: 'too high' },
        { value: ans - 0.3, why: 'too low' },
        { value: ans + 1, why: 'wrong whole part' }
      ];
    },
    verify: ({ N }, value) => (value - 0.05) ** 2 <= N && N <= (value + 0.05) ** 2,
    render({ N, a }) {
      const est = a + (N - a * a) / (2 * a);
      const ans = Math.round(Math.sqrt(N) * 10) / 10;
      const diff = N - a * a;
      return {
        question: `Which of these is closest to √${N}?`,
        explanation: `The nearest perfect square is ${a}² = ${a * a}. √${N} ≈ ${a} ${diff >= 0 ? '+' : '−'} ${Math.abs(diff)} ÷ ${2 * a} ≈ ${est.toFixed(2)}, so ${ans.toFixed(1)}. Check: ${ans.toFixed(1)}² = ${(ans * ans).toFixed(2)}.`,
        solutionSteps: [`Nearest square: ${a}² = ${a * a}.`, `Correction: ${diff >= 0 ? '+' : '−'}${Math.abs(diff)} ÷ ${2 * a} ≈ ${diff >= 0 ? '+' : '−'}${(Math.abs(diff) / (2 * a)).toFixed(2)}.`, `≈ ${ans.toFixed(1)}.`],
        method: '√N ≈ a + (N − a²) ÷ 2a.',
        hints: [`Which perfect square is nearest to ${N}?`, `Divide the gap by 2 × ${a} = ${2 * a}.`],
        commonMistakes: ['Dividing the gap by a instead of 2a.']
      };
    }
  },

  /* =============================== perfect-square tests =============================== */
  {
    id: 'scr-not-a-square',
    version: 1,
    topicId: 'squares-cubes-roots',
    conceptId: 'scr-properties',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['scr-properties-f'],
    estimatedSeconds: 50,
    params(rng) {
      const rule = rng.pick(NOT_SQUARE_RULES);
      let bad;
      if (rule === 'end') bad = rng.int(100, 9999) * 10 + rng.pick([2, 3, 7, 8]);
      else if (rule === 'zeros') bad = rng.int(4, 40) ** 2 * rng.pick([10, 1000]);
      else if (rule === 'five') bad = rng.int(10, 999) * 100 + rng.pick([15, 35, 45, 55, 65, 75, 85, 95]);
      else {
        bad = rng.int(100, 9999) * 10 + rng.pick([1, 4, 6, 9]);
        if ([1, 4, 7, 9].includes(digitalRoot(bad))) return null;
      }
      if (isPerfectSquare(bad)) return null;
      const roots = new Set();
      while (roots.size < 3) roots.add(rng.int(32, 316));
      const squares = [...roots].map((r) => r * r);
      const lengths = new Set([...squares, bad].map((x) => String(x).length));
      if (lengths.size > 2) return null;
      return { rule, bad, squares, roots: [...roots] };
    },
    answer: ({ bad }) => fmt(bad),
    distractors: ({ squares }) => squares.map((s) => ({ value: fmt(s), why: 'a genuine square' })),
    verify: ({ bad, squares }, value) => value === fmt(bad) && !isPerfectSquare(bad) && squares.every(isPerfectSquare),
    render({ rule, bad, squares, roots }) {
      const reason = {
        end: `it ends in ${bad % 10}, and no square ends in 2, 3, 7 or 8`,
        zeros: `it ends in ${String(bad).length - String(bad).replace(/0+$/, '').length} zeros, an odd number, while the zeros of a square come in pairs`,
        five: `it ends in 5 but not in 25, and every square ending in 5 ends in 25`,
        digital: `its digits reduce to ${digitalRoot(bad)}, and a square’s digital root is always 1, 4, 7 or 9`
      }[rule];
      return {
        question: `Which of these numbers cannot be a perfect square: ${[...squares, bad].sort((x, y) => x - y).map((v) => fmt(v)).join(', ')}?`,
        explanation: `${fmt(bad)} fails a test: ${reason}. The others are squares: ${squares.map((s, i) => `${fmt(s)} = ${roots[i]}²`).join(', ')}.`,
        solutionSteps: ['Check the last digit (0, 1, 4, 5, 6 or 9 only).', 'Check the zeros at the end (an even number) and an ending of 5 (must be 25).', `Check the digital root (1, 4, 7 or 9). ${fmt(bad)} fails.`],
        method: 'Run the quick tests until one fails.',
        hints: ['Look at the last digit or digits of each number first.', 'If every last digit is allowed, add up the digits of each number.'],
        commonMistakes: ['Trying to find every square root instead of running the quick tests.', 'Passing a number only because its last digit is allowed.']
      };
    }
  }
];

