/**
 * Modulus (absolute value): distances, equations with one or two moduli,
 * inequalities, the least value of a sum of distances, V graphs and their
 * solution counts, nested moduli and the square |x| + |y| = k.
 *
 * Answers come from the distance rules; each is checked a second way, by
 * scanning x over a grid, enumerating integers, solving piece by piece
 * (utils/modulus.js) or substituting back.
 */

import { fmt } from '../core.js';
import { absSum, absText, signed, solutionCount, solvePiecewise } from '../../utils/modulus.js';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sq = (v) => `${v}${SUP[2]}`;
/** "+ 3", "− 3" or "" for a constant added after a term. */
const plus = (k) => (k === 0 ? '' : k > 0 ? ` + ${k}` : ` − ${-k}`);
/** Every value of f on a grid from `from` to `to` in steps of `step`, as [x, f(x)] pairs. */
const grid = (from, to, step = 1) => {
  const out = [];
  for (let i = 0; from + i * step <= to + 1e-9; i++) out.push(Number((from + i * step).toFixed(6)));
  return out;
};
const parseSigned = (text) => Number(String(text).replace('−', '-'));
/** "a + b" or "a − |b|" with true minus signs. */
const sumText = (a, b) => (b < 0 ? `${signed(a)} − ${-b}` : `${signed(a)} + ${b}`);
/** "hi − lo" or "hi + |lo|". */
const diffText = (hi, lo) => (lo < 0 ? `${signed(hi)} + ${-lo}` : `${signed(hi)} − ${lo}`);
/** The inside of |x − a| without the bars: "x − 3", "x + 2", "x". */
const inner = (a) => absText(a).slice(1, -1);

/** Text of a solution count, as the options show it. */
const countText = (count) => (count === Infinity ? 'Infinitely many' : String(count));

export const modulusTemplates = [
  /* =============================== distance =============================== */
  {
    id: 'md-distance-points',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-distance',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['md-def-f'],
    estimatedSeconds: 30,
    params(rng) {
      const kind = rng.pick(['temperature', 'floors', 'line']);
      const a = rng.int(-25, -1);
      const b = rng.int(kind === 'temperature' ? 2 : kind === 'floors' ? 1 : -12, kind === 'floors' ? 40 : 30);
      if (b === a) return null;
      return { kind, a, b };
    },
    answer: ({ a, b }) => Math.abs(b - a),
    verify: ({ a, b }, value) => {
      let steps = 0;
      for (let x = Math.min(a, b); x < Math.max(a, b); x++) steps += 1;
      return steps === value;
    },
    render({ kind, a, b }) {
      const d = Math.abs(b - a);
      const question =
        kind === 'temperature'
          ? `At 5 a.m. the temperature in Dras was ${signed(a)} °C. By 1 p.m. it was ${signed(b)} °C. By how many degrees did it rise?`
          : kind === 'floors'
            ? `A lift in a Mumbai office tower goes from basement level ${signed(a)} to floor ${signed(b)}. How many levels does it travel?`
            : `What is the distance between ${signed(a)} and ${signed(b)} on the number line?`;
      return {
        question,
        explanation: `The gap between two numbers is the modulus of their difference: |${signed(b)} − (${signed(a)})| = |${signed(b - a)}| = ${d}.`,
        solutionSteps: [`Distance = |${signed(b)} − (${signed(a)})|.`, `${signed(b)} − (${signed(a)}) = ${signed(b - a)}.`, `|${signed(b - a)}| = ${d}.`],
        method: 'Distance between a and b is |a − b|.',
        hints: ['Subtract the two numbers and drop the sign.', `Subtracting ${signed(a)} means adding ${-a}.`],
        commonMistakes: [`Adding the numbers as they stand: ${signed(a)} + ${signed(b)} = ${signed(a + b)}.`]
      };
    }
  },

  {
    id: 'md-evaluate',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-distance',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['md-def-f'],
    estimatedSeconds: 40,
    params(rng) {
      const a = rng.int(-12, 12);
      const b = rng.int(-12, 12);
      if (a === 0 || b === 0 || a === b || Math.sign(a) === Math.sign(b)) return null;
      return { a, b };
    },
    answer: ({ a, b }) => signed(Math.abs(a - b) - Math.abs(a) + Math.abs(b)),
    formatValue: (value) => String(value),
    distractors: ({ a, b }) => [
      { value: signed(a - b - a + b), why: 'dropped every modulus sign' },
      { value: signed(Math.abs(a - b) + Math.abs(a) + Math.abs(b)), why: 'added every term' },
      { value: signed(Math.abs(a - b) - a + b), why: 'removed the single moduli without fixing the signs' },
      { value: signed(Math.abs(a + b) - Math.abs(a) + Math.abs(b)), why: 'read a − b as a + b' },
      { value: signed(Math.abs(a) + Math.abs(b)), why: 'stopped after |a − b|' },
      { value: signed(2 * Math.abs(a)), why: 'subtracted |b| and added |a|' }
    ],
    verify: ({ a, b }, value) => {
      const m = (v) => Math.sqrt(v * v);
      return parseSigned(value) === m(a - b) - m(a) + m(b);
    },
    render({ a, b }) {
      const d = Math.abs(a - b);
      const v = d - Math.abs(a) + Math.abs(b);
      return {
        question: `If a = ${signed(a)} and b = ${signed(b)}, what is |a − b| − |a| + |b|?`,
        explanation: `a − b = ${signed(a - b)}, so |a − b| = ${d}. |a| = ${Math.abs(a)} and |b| = ${Math.abs(b)}. So ${d} − ${Math.abs(a)} + ${Math.abs(b)} = ${signed(v)}.`,
        solutionSteps: [`|a − b| = |${signed(a - b)}| = ${d}.`, `|a| = ${Math.abs(a)}, |b| = ${Math.abs(b)}.`, `${d} − ${Math.abs(a)} + ${Math.abs(b)} = ${signed(v)}.`],
        method: 'Work out what is inside each modulus first, then drop the sign.',
        hints: ['Find a − b before taking its modulus.', 'Every modulus is a positive number; only then add and subtract.'],
        commonMistakes: ['Treating |a − b| as |a| − |b|.', 'Removing the bars without changing the sign of a negative number.']
      };
    }
  },

  /* =============================== equations =============================== */
  {
    id: 'md-solve-linear',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-equations',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['md-eq-f'],
    estimatedSeconds: 40,
    params(rng) {
      const p = rng.pick([1, 1, 2, 3]);
      const x1 = rng.int(-12, 8);
      const x2 = x1 + rng.int(2, 16);
      if ((p * (x1 + x2)) % 2 !== 0 || (p * (x2 - x1)) % 2 !== 0) return null;
      const q = (p * (x1 + x2)) / 2;
      const r = (p * (x2 - x1)) / 2;
      const ask = rng.pick(['larger', 'smaller']);
      return { p, q, r, x1, x2, ask };
    },
    answer: ({ x1, x2, ask }) => (ask === 'larger' ? x2 : x1),
    verify: ({ p, q, r, ask }, value) => {
      const { points } = solvePiecewise((x) => Math.abs(p * x - q), [q / p], r);
      return points.length === 2 && (ask === 'larger' ? points[1] : points[0]) === value && Math.abs(p * value - q) === r;
    },
    render({ p, q, r, x1, x2, ask }) {
      const inside = `${p === 1 ? '' : p}x${plus(-q)}`;
      return {
        question: `Solve |${inside}| = ${r}. What is the ${ask} solution?`,
        explanation: `${inside} = ${r} or ${inside} = −${r}. ${p === 1 ? '' : `${p}x = ${signed(q + r)} or ${p}x = ${signed(q - r)}, so `}x = ${signed(x2)} or x = ${signed(x1)}. The ${ask} is ${signed(ask === 'larger' ? x2 : x1)}.`,
        solutionSteps: [`${inside} = ±${r}.`, p === 1 ? `x = ${sumText(q, r)} = ${signed(x2)} or x = ${diffText(q, r)} = ${signed(x1)}.` : `x = (${sumText(q, r)}) ÷ ${p} = ${signed(x2)} or x = (${diffText(q, r)}) ÷ ${p} = ${signed(x1)}.`, `The ${ask} solution is ${signed(ask === 'larger' ? x2 : x1)}.`],
        method: 'Set the inside equal to +b and to −b.',
        hints: [`The inside, ${inside}, is either ${r} or −${r}.`, 'Solve both linear equations, then compare.'],
        commonMistakes: [`Solving only ${inside} = ${r}.`, p === 1 ? 'Moving the number the wrong way.' : `Forgetting to divide by ${p}.`]
      };
    }
  },

  {
    id: 'md-equal-moduli',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-equations',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['md-sc-midpoint'],
    answerDecimals: 1,
    estimatedSeconds: 40,
    params(rng) {
      const a = rng.int(-15, 15);
      const b = rng.int(-15, 15);
      if (a === b) return null;
      return { a, b };
    },
    answer: ({ a, b }) => (a + b) / 2,
    verify: ({ a, b }, value) => {
      const f = (x) => Math.abs(x - a) - Math.abs(x - b);
      const { points, intervals } = solvePiecewise(f, [a, b], 0);
      return !intervals.length && points.length === 1 && Math.abs(points[0] - value) < 1e-9 && Math.abs(value - a) === Math.abs(value - b);
    },
    render({ a, b }) {
      const m = (a + b) / 2;
      return {
        question: `Solve ${absText(a)} = ${absText(b)}.`,
        explanation: `${absText(a)} is the distance from x to ${signed(a)} and ${absText(b)} the distance to ${signed(b)}. Equal distances put x at the midpoint: (${sumText(a, b)}) ÷ 2 = ${signed(m)}.`,
        solutionSteps: [`x is equally far from ${signed(a)} and ${signed(b)}.`, `x = (${sumText(a, b)}) ÷ 2.`, `x = ${signed(m)}.`],
        method: 'Equal distances from two points: the midpoint.',
        hints: [`Read ${absText(b)} as the distance from x to ${signed(b)}.`, 'Which point is equally far from both?'],
        commonMistakes: ['Writing x − a = x − b, which has no solution, and answering "no solution".', 'Halving the gap between the points instead of finding the middle point.']
      };
    }
  },

  {
    id: 'md-two-moduli-solve',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-equations',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['md-min-f', 'md-eq-f'],
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.int(-10, 6);
      const b = a + rng.int(2, 10);
      const c = b - a + rng.int(1, 12);
      if ((a + b + c) % 2 !== 0) return null;
      return { a, b, c, ask: rng.pick(['larger', 'smaller']) };
    },
    answer: ({ a, b, c, ask }) => (ask === 'larger' ? (a + b + c) / 2 : (a + b - c) / 2),
    verify: ({ a, b, c, ask }, value) => {
      const hits = grid(a - c - 2, b + c + 2).filter((x) => absSum(x, [a, b]) === c);
      return hits.length === 2 && (ask === 'larger' ? hits[1] : hits[0]) === value;
    },
    render({ a, b, c, ask }) {
      const hi = (a + b + c) / 2;
      const lo = (a + b - c) / 2;
      return {
        question: `Solve ${absText(a)} + ${absText(b)} = ${c}. What is the ${ask} solution?`,
        explanation: `Between ${signed(a)} and ${signed(b)} the left side is always ${b - a}, which is less than ${c}, so x lies outside. Right of ${signed(b)}: 2x${plus(-(a + b))} = ${c}, x = ${signed(hi)}. Left of ${signed(a)}: ${a + b === 0 ? '' : `${signed(a + b)} `}${a + b === 0 ? '−2x' : '− 2x'} = ${c}, x = ${signed(lo)}. The ${ask} solution is ${signed(ask === 'larger' ? hi : lo)}.`,
        solutionSteps: [`Flat bottom: ${b - a} < ${c}, so no solution between ${signed(a)} and ${signed(b)}.`, `x > ${signed(b)}: 2x${plus(-(a + b))} = ${c} → x = ${signed(hi)}.`, `x < ${signed(a)}: ${a + b === 0 ? '−2x' : `${signed(a + b)} − 2x`} = ${c} → x = ${signed(lo)}.`],
        method: 'Compare c with the flat bottom |a − b|, then solve on each outer arm.',
        hints: [`What is ${absText(a)} + ${absText(b)} for x between ${signed(a)} and ${signed(b)}?`, `On the right of ${signed(b)} both moduli open with a plus sign.`],
        commonMistakes: ['Looking for a solution between the two points, where the sum never changes.']
      };
    }
  },

  {
    id: 'md-check-cases',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-equations',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['md-eq-f'],
    estimatedSeconds: 80,
    params(rng) {
      // Choose the two case answers first: A from x − a = kx + c, B from a − x = kx + c.
      const k = rng.pick([2, 3]);
      const A = rng.int(-10, 10);
      const B = rng.int(-10, 10);
      const twiceA = (1 - k) * A + (1 + k) * B;
      const twiceC = (1 - k) * A - (1 + k) * B;
      if (A === B || twiceA % 2 !== 0) return null;
      const a = twiceA / 2;
      const c = twiceC / 2;
      if (Math.abs(a) > 10 || Math.abs(c) > 15) return null;
      const okA = A >= a;
      const okB = B < a;
      if (okA === okB) return null; // one kept, one rejected: the lesson of the template
      return { a, k, c, A, B, okA, okB };
    },
    answer: ({ A, B, okA }) => (okA ? A : B),
    verify: ({ a, k, c }, value) => {
      const { points, intervals } = solvePiecewise((x) => Math.abs(x - a) - k * x, [a], c);
      return !intervals.length && points.length === 1 && points[0] === value;
    },
    render({ a, k, c, A, B, okA }) {
      const rhs = `${k}x${plus(c)}`;
      const kept = okA ? A : B;
      const dropped = okA ? B : A;
      return {
        question: `Find the sum of all real solutions of ${absText(a)} = ${rhs}.`,
        explanation: `Case x ≥ ${signed(a)}: ${inner(a)} = ${rhs} gives x = ${signed(A)}, which ${okA ? 'fits' : 'does not fit'} the case. Case x < ${signed(a)}: ${signed(a)} − x = ${rhs} gives x = ${signed(B)}, which ${okA ? 'does not fit' : 'fits'}. Only x = ${signed(kept)} is a solution, so the sum is ${signed(kept)}.`,
        solutionSteps: [`x ≥ ${signed(a)}: x = ${signed(A)} (${okA ? 'keep' : 'reject'}).`, `x < ${signed(a)}: x = ${signed(B)} (${okA ? 'reject' : 'keep'}).`, `Check x = ${signed(dropped)}: the right side ${rhs} is ${signed(k * dropped + c)}, which cannot equal a modulus of ${Math.abs(dropped - a)}.`, `Sum = ${signed(kept)}.`],
        method: 'Solve each case and keep only the answers that fit it (or substitute back).',
        hints: ['The right side contains x, so one of the two answers may be false.', 'Substitute each candidate into the original equation.'],
        commonMistakes: [`Adding both candidates: ${signed(A)} + (${signed(B)}) = ${signed(A + B)}.`]
      };
    }
  },

  /* ============================== inequalities ============================== */
  {
    id: 'md-integer-count',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-inequalities',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['md-ineq-f', 'md-sc-intcount'],
    estimatedSeconds: 40,
    params(rng) {
      const kind = rng.pick(['le', 'lt', 'double']);
      const a = rng.int(-15, 15);
      const b = rng.int(2, 20);
      if (kind === 'double' && b % 2 === 0) return null; // |2x − q| < r with odd r: a half-integer centre is more interesting
      return { kind, a, b };
    },
    answer: ({ kind, a, b }) => {
      if (kind === 'le') return 2 * b + 1;
      if (kind === 'lt') return 2 * b - 1;
      // |2x − a| < b  ⇔  (a − b)/2 < x < (a + b)/2
      return Math.ceil((a + b) / 2) - Math.floor((a - b) / 2) - 1;
    },
    verify: ({ kind, a, b }, value) => {
      let count = 0;
      for (let x = -80; x <= 80; x++) {
        if (kind === 'le' && Math.abs(x - a) <= b) count++;
        if (kind === 'lt' && Math.abs(x - a) < b) count++;
        if (kind === 'double' && Math.abs(2 * x - a) < b) count++;
      }
      return count === value;
    },
    render({ kind, a, b }) {
      if (kind === 'double') {
        const lo = (a - b) / 2;
        const hi = (a + b) / 2;
        const first = Math.floor(lo) + 1;
        const last = Math.ceil(hi) - 1;
        return {
          question: `How many integers x satisfy |2x${plus(-a)}| < ${b}?`,
          explanation: `−${b} < 2x${plus(-a)} < ${b} gives ${signed(a - b)} < 2x < ${signed(a + b)}, so ${signed(lo)} < x < ${signed(hi)}. The integers run from ${signed(first)} to ${signed(last)}: ${last - first + 1} of them.`,
          solutionSteps: [`${signed(a - b)} < 2x < ${signed(a + b)}.`, `${signed(lo)} < x < ${signed(hi)}.`, `Integers ${signed(first)} to ${signed(last)}: ${last - first + 1}.`],
          method: 'Turn the modulus into an interval, then count the whole numbers inside.',
          hints: ['Write −b < 2x − a < b, then halve everything.', 'The ends are not whole numbers, so look at the integers just inside.'],
          commonMistakes: ['Forgetting to halve and counting the integers between a − b and a + b.']
        };
      }
      const strict = kind === 'lt';
      const lo = strict ? a - b + 1 : a - b;
      const hi = strict ? a + b - 1 : a + b;
      return {
        question: `How many integers x satisfy ${absText(a)} ${strict ? '<' : '≤'} ${b}?`,
        explanation: `${absText(a)} ${strict ? '<' : '≤'} ${b} means ${signed(a - b)} ${strict ? '<' : '≤'} x ${strict ? '<' : '≤'} ${signed(a + b)}. The integers run from ${signed(lo)} to ${signed(hi)}: ${hi - lo + 1} of them (2 × ${b} ${strict ? '− 1' : '+ 1'}).`,
        solutionSteps: [`${signed(a - b)} ${strict ? '<' : '≤'} x ${strict ? '<' : '≤'} ${signed(a + b)}.`, `Integers ${signed(lo)} to ${signed(hi)}.`, `Count = ${hi - lo + 1}.`],
        method: strict ? '|x − a| < b holds 2b − 1 integers.' : '|x − a| ≤ b holds 2b + 1 integers.',
        hints: [`Read ${absText(a)} as the distance from x to ${signed(a)}.`, strict ? 'A strict sign leaves out both end points.' : 'Count both end points and the centre.'],
        commonMistakes: [`Answering 2 × ${b} = ${2 * b}.`]
      };
    }
  },

  {
    id: 'md-interval',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-inequalities',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['md-ineq-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(-9, 9);
      const b = rng.int(1, 9);
      if (a === 0 || Math.abs(a) === b) return null;
      return { a, b, sign: rng.pick(['<', '≤', '>', '≥']) };
    },
    answer: ({ a, b, sign }) => intervalText(a, b, sign),
    formatValue: (value) => String(value),
    distractors: ({ a, b, sign }) => {
      const flip = { '<': '>', '≤': '≥', '>': '<', '≥': '≤' };
      const strictness = { '<': '≤', '≤': '<', '>': '≥', '≥': '>' };
      return [
        { value: intervalText(a, b, flip[sign]), why: 'inside and outside swapped' },
        { value: intervalText(-a, b, sign), why: 'centred on −a instead of a' },
        { value: intervalText(a, b, strictness[sign]), why: 'end points wrongly included or left out' },
        { value: sign === '<' || sign === '≤' ? `x ${sign} ${signed(a + b)}` : `x ${sign} ${signed(a + b)}`, why: 'kept only one side' }
      ];
    },
    verify: ({ a, b, sign }, value) => {
      const holds = (x) => ({ '<': Math.abs(x - a) < b, '≤': Math.abs(x - a) <= b, '>': Math.abs(x - a) > b, '≥': Math.abs(x - a) >= b })[sign];
      const n = (s) => parseSigned(s);
      const inside = /^(\S+) ([<≤]) x ([<≤]) (\S+)$/.exec(value);
      const outside = /^x ([>≥<≤]) (\S+) or x ([>≥]) (\S+)$/.exec(value);
      let described;
      if (inside) {
        const [, lo, s1, s2, hi] = inside;
        described = (x) => (s1 === '<' ? n(lo) < x : n(lo) <= x) && (s2 === '<' ? x < n(hi) : x <= n(hi));
      } else if (outside) {
        const [, s1, lo, s2, hi] = outside;
        described = (x) => (s1 === '<' ? x < n(lo) : x <= n(lo)) || (s2 === '>' ? x > n(hi) : x >= n(hi));
      } else return false;
      return grid(a - b - 6, a + b + 6, 0.5).every((x) => described(x) === holds(x));
    },
    render({ a, b, sign }) {
      const inside = sign === '<' || sign === '≤';
      return {
        question: `Which of these is the solution of ${absText(a)} ${sign} ${b}?`,
        explanation: inside
          ? `${absText(a)} ${sign} ${b} keeps x within ${b} of ${signed(a)}: ${intervalText(a, b, sign)}.`
          : `${absText(a)} ${sign} ${b} puts x at least ${b} away from ${signed(a)}${sign === '>' ? ' (strictly)' : ''}, on either side: ${intervalText(a, b, sign)}.`,
        solutionSteps: [`Centre ${signed(a)}, distance ${b}.`, `End points ${signed(a)} − ${b} = ${signed(a - b)} and ${signed(a)} + ${b} = ${signed(a + b)}.`, `${inside ? 'Between them' : 'Outside them'}: ${intervalText(a, b, sign)}.`],
        method: inside ? '|x − a| < b ⇔ a − b < x < a + b.' : '|x − a| > b ⇔ x < a − b or x > a + b.',
        hints: [`Read ${absText(a)} as the distance from x to ${signed(a)}.`, inside ? '"Less than" means close to the centre: one interval.' : '"Greater than" means far from the centre: two pieces.'],
        commonMistakes: ['Joining the two outside pieces with "and".', 'Centring the interval on the wrong sign of a.']
      };
    }
  },

  /* ================================ minimum ================================ */
  {
    id: 'md-min-sum',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-minimum',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['md-min-f', 'md-sc-median'],
    estimatedSeconds: 60,
    params(rng) {
      const count = rng.int(2, 5);
      const points = Array.from({ length: count }, () => rng.int(-12, 20));
      if (new Set(points).size !== count) return null;
      return { points };
    },
    answer: ({ points }) => {
      const s = [...points].sort((x, y) => x - y);
      let total = 0;
      for (let i = 0; i < Math.floor(s.length / 2); i++) total += s[s.length - 1 - i] - s[i];
      return total;
    },
    verify: ({ points }, value) => Math.min(...grid(-15, 25, 0.5).map((x) => absSum(x, points))) === value,
    render({ points }) {
      const s = [...points].sort((x, y) => x - y);
      const pairs = [];
      for (let i = 0; i < Math.floor(s.length / 2); i++) pairs.push([s[i], s[s.length - 1 - i]]);
      const total = pairs.reduce((sum, [lo, hi]) => sum + hi - lo, 0);
      const middle = s.length % 2 ? `x = ${signed(s[(s.length - 1) / 2])}` : `any x from ${signed(s[s.length / 2 - 1])} to ${signed(s[s.length / 2])}`;
      return {
        question: `What is the least value of ${points.map((p) => absText(p)).join(' + ')}?`,
        explanation: `Pair the outermost points, then the next pair inwards: each pair contributes at least the gap between its points, ${pairs.map(([lo, hi]) => `${diffText(hi, lo)} = ${hi - lo}`).join(', ')}. All the pairs reach their least together at ${middle} (${s.length % 2 ? 'the median' : 'between the two middle points'}), so the least value is ${pairs.length > 1 ? `${pairs.map(([lo, hi]) => hi - lo).join(' + ')} = ` : ''}${total}.`,
        solutionSteps: [`Points in order: ${s.map(signed).join(', ')}.`, ...pairs.map(([lo, hi]) => `${absText(lo)} + ${absText(hi)} ≥ ${hi - lo}.`), `Least value ${total}, at ${middle}.`],
        method: 'Pair the points from the outside in and add the gaps; the minimum is at the median.',
        hints: ['Each modulus is a distance from x to a point.', 'The best x is the median of the points.'],
        commonMistakes: ['Using the mean of the points instead of the median.', 'Adding the distances from 0.']
      };
    }
  },

  {
    id: 'md-min-meeting',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-minimum',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['md-sc-median'],
    estimatedSeconds: 70,
    params(rng) {
      const count = rng.pick([3, 5, 5]);
      const villages = Array.from({ length: count }, () => rng.int(1, 40));
      if (new Set(villages).size !== count) return null;
      const sorted = [...villages].sort((x, y) => x - y);
      const median = sorted[(count - 1) / 2];
      if (villages[(count - 1) / 2] === median) return null; // listed out of order, so the middle of the list is a trap
      return { villages, road: rng.pick(['canal road', 'state highway', 'railway line']) };
    },
    answer: ({ villages }) => [...villages].sort((x, y) => x - y)[(villages.length - 1) / 2],
    formatValue: (value) => `km ${fmt(value)}`,
    distractors: ({ villages }) => {
      const s = [...villages].sort((x, y) => x - y);
      const mean = villages.reduce((x, y) => x + y, 0) / villages.length;
      return [
        { value: Math.round(mean * 10) / 10, why: 'used the mean' },
        { value: (s[0] + s[s.length - 1]) / 2, why: 'took the midpoint of the two ends' },
        { value: villages[(villages.length - 1) / 2], why: 'took the middle of the list as written, not in order' },
        { value: s[0], why: 'picked the first village' }
      ];
    },
    verify: ({ villages }, value) => {
      let best = Infinity;
      let where = [];
      for (let x = 0; x <= 41; x += 0.5) {
        const total = absSum(x, villages);
        if (total < best) {
          best = total;
          where = [x];
        } else if (total === best) where.push(x);
      }
      return where.length === 1 && where[0] === value;
    },
    render({ villages, road }) {
      const s = [...villages].sort((x, y) => x - y);
      const m = s[(s.length - 1) / 2];
      const total = absSum(m, villages);
      return {
        question: `${villages.length} villages lie along a straight ${road}, at the ${villages.map((v) => `km ${v}`).join(', ')} markers. A primary health centre is to be built on the ${road} so that the total distance from it to all the villages is as small as possible. At which marker should it be built?`,
        explanation: `The total distance is ${villages.map((v) => absText(v)).join(' + ')}, which is least at the median. In order the markers are ${s.join(', ')}, so the median is km ${m}, giving a total of ${total} km.`,
        solutionSteps: [`Sort the markers: ${s.join(', ')}.`, `The middle one is km ${m}.`, `Total distance there: ${total} km.`],
        method: 'Build at the median village.',
        hints: ['Write the total as a sum of distances.', 'Put the markers in order first, then take the middle one.'],
        commonMistakes: ['Taking the average of the markers.', 'Taking the middle of the list as written, without sorting.']
      };
    }
  },

  /* ================================= graphs ================================= */
  {
    id: 'md-vertex',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-graphs',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['md-graph-f'],
    estimatedSeconds: 30,
    params(rng) {
      const h = rng.int(-8, 8);
      const k = rng.int(-8, 8);
      if (h === 0 || k === 0 || Math.abs(h) === Math.abs(k)) return null;
      return { h, k };
    },
    answer: ({ h, k }) => `(${signed(h)}, ${signed(k)})`,
    formatValue: (value) => String(value),
    distractors: ({ h, k }) => [
      { value: `(${signed(-h)}, ${signed(k)})`, why: 'moved the wrong way along x' },
      { value: `(${signed(k)}, ${signed(h)})`, why: 'swapped the coordinates' },
      { value: `(${signed(h)}, ${signed(-k)})`, why: 'moved the wrong way along y' },
      { value: `(${signed(-h)}, ${signed(-k)})`, why: 'both signs wrong' }
    ],
    verify: ({ h, k }, value) => {
      const f = (x) => Math.abs(x - h) + k;
      let best = { x: 0, y: Infinity };
      for (const x of grid(-20, 20, 0.5)) if (f(x) < best.y) best = { x, y: f(x) };
      return value === `(${signed(best.x)}, ${signed(best.y)})`;
    },
    render({ h, k }) {
      return {
        question: `What is the lowest point of the graph of y = ${absText(h)}${plus(k)}?`,
        explanation: `${absText(h)} is 0 at x = ${signed(h)} and positive everywhere else, so y is least there: y = 0${plus(k)} = ${signed(k)}. The tip of the V is (${signed(h)}, ${signed(k)}).`,
        solutionSteps: [`${absText(h)} = 0 when x = ${signed(h)}.`, `Then y = ${signed(k)}.`, `Lowest point (${signed(h)}, ${signed(k)}).`],
        method: 'y = |x − h| + k has its tip at (h, k).',
        hints: ['Where is the modulus zero?', 'The number outside the bars moves the V up or down.'],
        commonMistakes: [h < 0 ? `Reading ${absText(h)} as a shift to +${-h}.` : `Reading ${absText(h)} as a shift to −${h}.`]
      };
    }
  },

  {
    id: 'md-solution-count',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-graphs',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['md-graph-f', 'md-min-f'],
    estimatedSeconds: 50,
    params(rng) {
      const kind = rng.pick(['one', 'sum', 'sum', 'difference']);
      const a = rng.int(-8, 4);
      const b = a + rng.int(2, 9);
      const gap = b - a;
      let c;
      if (kind === 'one') c = rng.int(-4, 8);
      else if (kind === 'sum') c = rng.pick([gap - rng.int(1, gap), gap, gap + rng.int(1, 8)]);
      else c = rng.pick([rng.int(-gap + 1, gap - 1), gap, -gap, gap + rng.int(1, 5)]);
      return { kind, a, b, c };
    },
    answer: ({ kind, a, b, c }) => countText(solutionCount(solvePiecewise(fOf(kind, a, b), [a, b], c))),
    formatValue: (value) => String(value),
    distractors: () => ['0', '1', '2', 'Infinitely many'].map((value) => ({ value, why: 'another count' })),
    verify: ({ kind, a, b, c }, value) => {
      const f = fOf(kind, a, b);
      const hits = grid(-60, 60, 0.5).filter((x) => f(x) === c).length;
      return value === (hits >= 3 ? 'Infinitely many' : String(hits));
    },
    render({ kind, a, b, c }) {
      const lhs = kind === 'one' ? absText(a) : kind === 'sum' ? `${absText(a)} + ${absText(b)}` : `${absText(a)} − ${absText(b)}`;
      const count = solutionCount(solvePiecewise(fOf(kind, a, b), [a, b], c));
      const gap = b - a;
      let why;
      if (kind === 'one') why = c > 0 ? `A positive distance ${c} from ${signed(a)} gives two points.` : c === 0 ? `Only x = ${signed(a)} is at distance 0.` : 'A modulus is never negative, so there is no solution.';
      else if (kind === 'sum')
        why = c > gap ? `The least value of the left side is ${gap}; ${c} is above it, so the level line meets both arms: two solutions.` : c === gap ? `The left side equals ${gap} for every x from ${signed(a)} to ${signed(b)}: infinitely many solutions.` : `The left side is never less than ${gap}, so it cannot equal ${c}.`;
      else
        why = Math.abs(c) < gap ? `The left side climbs steadily from −${gap} to ${gap} between ${signed(a)} and ${signed(b)} and is flat outside, so it takes the value ${signed(c)} exactly once.` : Math.abs(c) === gap ? `The left side equals ${signed(c)} all along one outer ray: infinitely many solutions.` : `The left side always lies between −${gap} and ${gap}, so it never reaches ${signed(c)}.`;
      return {
        question: `How many real solutions does ${lhs} = ${signed(c)} have?`,
        explanation: why,
        solutionSteps: [kind === 'one' ? `Compare ${signed(c)} with 0.` : `The graph of the left side is flat at ${kind === 'sum' ? gap : `±${gap}`} ${kind === 'sum' ? `between ${signed(a)} and ${signed(b)}` : 'outside the two points'}.`, `Slide the line y = ${signed(c)} across the graph.`, `Number of solutions: ${countText(count)}.`],
        method: 'Count where the horizontal line y = c meets the graph of the left side.',
        hints: [kind === 'one' ? 'Can a modulus be negative?' : `What is the left side for x between ${signed(a)} and ${signed(b)}?`, 'Picture the graph and a horizontal line at the given height.'],
        commonMistakes: ['Assuming every modulus equation has two solutions.']
      };
    }
  },

  /* =============================== advanced: nested =============================== */
  {
    id: 'md-nested',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-adv-nested',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['md-nested-f'],
    estimatedSeconds: 70,
    params(rng) {
      const a = rng.int(-6, 6);
      const b = rng.int(1, 9);
      const c = rng.int(0, 10);
      return { a, b, c, ask: rng.pick(['count', 'count', 'largest']) };
    },
    answer: ({ a, b, c, ask }) => {
      if (ask === 'largest') return a + b + c;
      const values = [...new Set([b + c, b - c])];
      return values.reduce((n, d) => n + (d > 0 ? 2 : d === 0 ? 1 : 0), 0);
    },
    verify: ({ a, b, c, ask }, value) => {
      const hits = grid(a - b - c - 3, a + b + c + 3).filter((x) => Math.abs(Math.abs(x - a) - b) === c);
      return ask === 'largest' ? Math.max(...hits) === value : hits.length === value;
    },
    render({ a, b, c, ask }) {
      const inner = absText(a);
      const d1 = b + c;
      const d2 = b - c;
      const sols = [...new Set([a - d1, a + d1, ...(d2 >= 0 ? [a - d2, a + d2] : [])])].sort((x, y) => x - y);
      const second = d2 > 0 ? `${inner} = ${d2} gives x = ${signed(a - d2)} or ${signed(a + d2)}` : d2 === 0 ? `${inner} = 0 gives x = ${signed(a)} only` : `${inner} = ${signed(d2)} is impossible`;
      return {
        question: ask === 'count' ? `How many real solutions does |${inner} − ${b}| = ${c} have?` : `What is the largest real solution of |${inner} − ${b}| = ${c}?`,
        explanation: `Remove the outer modulus: ${inner} − ${b} = ±${c}, so ${inner} = ${d1}${c === 0 ? '' : ` or ${inner} = ${signed(d2)}`}. ${inner} = ${d1} gives x = ${signed(a - d1)} or ${signed(a + d1)}${c === 0 ? '' : `; ${second}`}. The solutions are ${sols.map(signed).join(', ')}.`,
        solutionSteps: [`${inner} − ${b} = ±${c}.`, `${inner} = ${d1}${c === 0 ? '' : ` or ${signed(d2)}`}.`, `Solutions: ${sols.map(signed).join(', ')}.`, ask === 'count' ? `Count: ${sols.length}.` : `Largest: ${signed(a + d1)}.`],
        method: 'Peel the moduli from the outside; each positive value of the inner modulus gives two solutions.',
        hints: [`First find the possible values of ${inner}.`, 'A positive value gives two solutions, zero gives one, a negative value none.'],
        commonMistakes: ['Removing both moduli at once and finding only two solutions.', 'Keeping a negative value of the inner modulus.']
      };
    }
  },

  {
    id: 'md-abs-quadratic',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-adv-nested',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['md-nested-f'],
    estimatedSeconds: 70,
    params(rng) {
      const q = rng.int(2, 9);
      const kind = rng.pick(['four', 'four', 'three', 'two']);
      let p;
      if (kind === 'four') p = rng.int(1, q - 1);
      else if (kind === 'three') p = 0;
      else p = null;
      if (p !== null) {
        if ((q * q + p * p) % 2 !== 0) return null;
        return { n: (q * q + p * p) / 2, c: (q * q - p * p) / 2 };
      }
      // c > n: only n + c = q² is possible
      const n = rng.int(1, q * q - 1);
      const c = q * q - n;
      if (c <= n) return null;
      return { n, c };
    },
    answer: ({ n, c }) => {
      let count = 0;
      for (const s of new Set([n + c, n - c])) count += s > 0 ? 2 : s === 0 ? 1 : 0;
      return count;
    },
    verify: ({ n, c }, value) => grid(-20, 20).filter((x) => Math.abs(x * x - n) === c).length === value,
    render({ n, c }) {
      const hi = n + c;
      const lo = n - c;
      const loText = lo > 0 ? `x² = ${lo} gives x = ±${Math.sqrt(lo)}` : lo === 0 ? 'x² = 0 gives x = 0 only' : `x² = ${signed(lo)} is impossible`;
      const count = (hi > 0 ? 2 : 0) + (lo > 0 ? 2 : lo === 0 ? 1 : 0);
      return {
        question: `How many real solutions does |x² − ${n}| = ${c} have?`,
        explanation: `x² − ${n} = ${c} or −${c}, so x² = ${hi} or x² = ${signed(lo)}. x² = ${hi} gives x = ±${Math.sqrt(hi)}; ${loText}. In all, ${count} solutions. On the graph, the line y = ${c} ${c < n ? `is below the reflected hump of height ${n}, so it meets the curve 4 times` : c === n ? `touches the top of the hump at x = 0` : `passes above the hump of height ${n}`}.`,
        solutionSteps: [`x² − ${n} = ±${c}.`, `x² = ${hi} → x = ±${Math.sqrt(hi)}.`, `${loText}.`, `Total: ${count}.`],
        method: 'Remove the modulus into two cases, then count the real square roots.',
        hints: ['Write x² − n = c and x² − n = −c.', 'A positive value of x² gives two solutions, zero one, a negative none.'],
        commonMistakes: [`Ignoring the case x² − ${n} = −${c}.`, 'Counting x = 0 twice.']
      };
    }
  },

  /* =============================== advanced: |x| + |y| = k =============================== */
  {
    id: 'md-diamond-area',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-adv-diamond',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['md-diamond-f'],
    estimatedSeconds: 50,
    params(rng) {
      const kind = rng.pick(['plain', 'shifted', 'scaled']);
      if (kind === 'scaled') {
        const a = rng.int(1, 4);
        const b = rng.int(1, 4);
        if (a === b) return null;
        const c = a * b * rng.int(1, 4);
        return { kind, a, b, c, h: 0, v: 0 };
      }
      return { kind, a: 1, b: 1, c: rng.int(2, 15), h: kind === 'shifted' ? rng.int(-6, 6) : 0, v: kind === 'shifted' ? rng.int(-6, 6) : 0 };
    },
    answer: ({ a, b, c }) => (2 * c * c) / (a * b),
    verify: ({ a, b, c, h, v }, value) => {
      // Vertices from where the graph meets the lines through its centre, then the shoelace formula.
      const rx = solvePiecewise((x) => Math.abs(a * x), [0], c).points;
      const ry = solvePiecewise((y) => Math.abs(b * y), [0], c).points;
      if (rx.length !== 2 || ry.length !== 2) return false;
      const pts = [[h + rx[1], v], [h, v + ry[1]], [h + rx[0], v], [h, v + ry[0]]];
      let twice = 0;
      for (let i = 0; i < 4; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % 4];
        twice += x1 * y2 - x2 * y1;
      }
      return Math.abs(Math.abs(twice) / 2 - value) < 1e-9;
    },
    render({ kind, a, b, c, h, v }) {
      const xs = c / a;
      const ys = c / b;
      const area = (2 * c * c) / (a * b);
      const eq =
        kind === 'scaled'
          ? `|${a === 1 ? '' : a}x| + |${b === 1 ? '' : b}y| = ${c}`
          : kind === 'shifted'
            ? `${absText(h)} + ${absText(v, 'y')} = ${c}`
            : `|x| + |y| = ${c}`;
      return {
        question: `What is the area of the region enclosed by the graph of ${eq}?`,
        explanation:
          kind === 'shifted'
            ? `This is the square |x| + |y| = ${c} moved to centre (${signed(h)}, ${signed(v)}); moving it does not change its area. Its diagonals are 2 × ${c} = ${2 * c}, so the area is ${2 * c} × ${2 * c} ÷ 2 = ${fmt(area)}.`
            : `The graph meets the x-direction at ±${fmt(xs)} and the y-direction at ±${fmt(ys)}, so it is a rhombus with diagonals ${fmt(2 * xs)} and ${fmt(2 * ys)}. Area = ${fmt(2 * xs)} × ${fmt(2 * ys)} ÷ 2 = ${fmt(area)}.`,
        solutionSteps: [`Corners at ${kind === 'shifted' ? `(${signed(h)} ± ${c}, ${signed(v)}) and (${signed(h)}, ${signed(v)} ± ${c})` : `(±${fmt(xs)}, 0) and (0, ±${fmt(ys)})`}.`, `Diagonals ${fmt(2 * xs)} and ${fmt(2 * ys)}.`, `Area = d₁ × d₂ ÷ 2 = ${fmt(area)}.`],
        method: 'Find the four corners on the axes through the centre; area = product of the diagonals ÷ 2.',
        hints: ['Put y = 0 (or the centre’s y) to find the corners left and right.', 'The shape is a rhombus; use half the product of its diagonals.'],
        commonMistakes: [kind === 'scaled' ? `Ignoring the coefficients and answering 2 × ${c}² = ${2 * c * c}.` : `Taking the side as ${c} and answering ${sq(c)} = ${c * c}.`]
      };
    }
  },

  {
    id: 'md-diamond-points',
    version: 1,
    topicId: 'modulus',
    conceptId: 'md-adv-diamond',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['md-diamond-f'],
    estimatedSeconds: 55,
    params(rng) {
      return { k: rng.int(2, 15), kind: rng.pick(['on', 'within', 'inside']) };
    },
    answer: ({ k, kind }) => (kind === 'on' ? 4 * k : kind === 'within' ? 2 * k * k + 2 * k + 1 : 2 * (k - 1) * (k - 1) + 2 * (k - 1) + 1),
    verify: ({ k, kind }, value) => {
      let count = 0;
      for (let x = -k - 1; x <= k + 1; x++)
        for (let y = -k - 1; y <= k + 1; y++) {
          const s = Math.abs(x) + Math.abs(y);
          if ((kind === 'on' && s === k) || (kind === 'within' && s <= k) || (kind === 'inside' && s < k)) count++;
        }
      return count === value;
    },
    render({ k, kind }) {
      const sign = kind === 'on' ? '=' : kind === 'within' ? '≤' : '<';
      const top = kind === 'inside' ? k - 1 : k;
      const rows = Array.from({ length: top + 1 }, (_, i) => 2 * (top - i) + 1);
      const total = kind === 'on' ? 4 * k : 2 * top * top + 2 * top + 1;
      return {
        question: `How many points (x, y) with integer coordinates satisfy |x| + |y| ${sign} ${k}?`,
        explanation:
          kind === 'on'
            ? `The 4 corners (±${k}, 0), (0, ±${k}), plus ${k - 1} points strictly inside each of the 4 sides: 4 + 4 × ${k - 1} = ${4 * k}.`
            : `${kind === 'inside' ? `|x| + |y| < ${k} is the same as |x| + |y| ≤ ${top}. ` : ''}Count row by row: y = 0 holds ${rows[0]} points, and each row further out holds 2 fewer (${rows.slice(1).join(', ')}), above and below. Total ${rows[0]} + 2 × (${rows.slice(1).join(' + ') || 0}) = ${total} = 2k² + 2k + 1 with k = ${top}.`,
        solutionSteps:
          kind === 'on'
            ? ['Corners: 4.', `Each side holds ${k - 1} more points: 4 × ${k - 1} = ${4 * (k - 1)}.`, `Total = ${4 * k}.`]
            : [`Row y = 0: ${rows[0]} points.`, `Rows y = ±1 … ±${top}: ${rows.slice(1).join(', ')} each, twice.`, `Total = ${total}.`],
        method: kind === 'on' ? 'On |x| + |y| = k there are 4k integer points.' : 'On or inside |x| + |y| = k there are 2k² + 2k + 1 integer points.',
        hints: ['Fix y and count the x that work.', kind === 'on' ? 'Count the corners and the points along one side.' : `For a given y, |x| ${kind === 'on' ? '=' : '≤'} ${top} − |y|.`],
        commonMistakes: [kind === 'on' ? `Counting the corners twice (4 × ${k + 1} = ${4 * (k + 1)}).` : `Using the area 2k² = ${2 * top * top} as the count.`]
      };
    }
  }
];

/** "−2 < x < 8", "x < −3 or x > 5" for |x − a| (sign) b. */
function intervalText(a, b, sign) {
  const lo = signed(a - b);
  const hi = signed(a + b);
  if (sign === '<' || sign === '≤') return `${lo} ${sign} x ${sign} ${hi}`;
  return `x ${sign === '>' ? '<' : '≤'} ${lo} or x ${sign} ${hi}`;
}

/** The left side of the count questions: |x − a|, |x − a| + |x − b| or |x − a| − |x − b|. */
function fOf(kind, a, b) {
  if (kind === 'one') return (x) => Math.abs(x - a);
  if (kind === 'sum') return (x) => Math.abs(x - a) + Math.abs(x - b);
  return (x) => Math.abs(x - a) - Math.abs(x - b);
}
