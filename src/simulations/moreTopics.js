/**
 * Simulations for nine topics that had none of their own, or only borrowed
 * another topic's: simplification (a BODMAS stack), approximation (an estimate
 * and its error band), the counting principle (a tree of choices), set theory
 * (elements in sets, and the power set), caselets (a paragraph filling a
 * table), radar charts (radar or grouped bars), races, work and wages, and
 * quadratic comparison (roots on two number lines).
 * tests/simulations-moretopics.test.js holds each model to its own sums.
 */

import { near, ratioText, show } from './core.js';
import { QC_OPTIONS, rootText, rootsOf, verdict } from '../generators/templates/quadComparison.js';

const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;
const roster = (list) => (list.length ? `{${list.join(', ')}}` : '∅');
const rupees = (value) => `₹${show(value, 0)}`;
const percentText = (value, decimals = 1) => `${show(value * 100, decimals)}%`;

/* ------------------------------ simplification ------------------------------ */

const PRECEDENCE = { '+': 1, '−': 1, '×': 2, '÷': 2 };
/** The usual mistake "× before ÷, + before −": a strict ranking instead of two levels. */
const MULT_FIRST = { '×': 4, '÷': 3, '+': 2, '−': 1 };
const isOperator = (token) => typeof token === 'string' && token in PRECEDENCE;

export function applyOperation(a, op, b) {
  if (op === '+') return a + b;
  if (op === '−') return a - b;
  if (op === '×') return a * b;
  return a / b;
}

/**
 * The index of the operator to work out next. `order` is 'bodmas' (innermost
 * bracket, then × and ÷ before + and −, left to right within a level),
 * 'left' (innermost bracket, then strictly left to right) or 'mult-first'
 * (innermost bracket, then ×, ÷, +, − in that fixed order: the classic slip).
 * Returns the index and the reason, or null when one number is left.
 */
export function nextOperation(tokens, order = 'bodmas') {
  const close = tokens.indexOf(')');
  let lo = 0;
  let hi = tokens.length;
  if (close >= 0) {
    lo = tokens.lastIndexOf('(', close) + 1;
    hi = close;
  }
  const ops = [];
  for (let i = lo; i < hi; i++) if (isOperator(tokens[i])) ops.push(i);
  if (!ops.length) return null;
  const inBracket = close >= 0;
  if (order === 'left') return { index: ops[0], reason: inBracket ? 'bracket' : 'left' };
  const rank = order === 'mult-first' ? MULT_FIRST : PRECEDENCE;
  const best = Math.max(...ops.map((i) => rank[tokens[i]]));
  const index = ops.find((i) => rank[tokens[i]] === best);
  const levels = new Set(ops.map((i) => PRECEDENCE[tokens[i]]));
  const sameLevel = ops.filter((i) => PRECEDENCE[tokens[i]] === PRECEDENCE[tokens[index]]).length > 1;
  const reason = inBracket ? 'bracket' : ops.length === 1 ? 'last' : levels.size > 1 && order === 'bodmas' ? 'level' : sameLevel ? 'same-level' : 'level';
  return { index, reason };
}

/** Every line of the working, from the expression to its value, with the operation done at each step. */
export function collapse(tokens, order = 'bodmas') {
  const lines = [];
  let current = tokens.slice();
  let resultAt = null;
  for (let guard = 0; guard < 20; guard++) {
    const next = nextOperation(current, order);
    lines.push({ tokens: current, next, resultAt });
    if (!next) break;
    const { index } = next;
    const value = applyOperation(current[index - 1], current[index], current[index + 1]);
    let after = [...current.slice(0, index - 1), value, ...current.slice(index + 2)];
    resultAt = index - 1;
    // A bracket holding one number has done its job: drop it.
    if (after[resultAt - 1] === '(' && after[resultAt + 1] === ')') {
      after = [...after.slice(0, resultAt - 1), value, ...after.slice(resultAt + 2)];
      resultAt -= 1;
    }
    current = after;
  }
  return lines;
}

const tokenText = (token) => (typeof token === 'number' ? show(token, 2) : token);
const lineText = (tokens) => tokens.map(tokenText).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
const operationText = (tokens, index) => `${tokenText(tokens[index - 1])} ${tokens[index]} ${tokenText(tokens[index + 1])}`;

const BODMAS_PROBLEMS = {
  p1: { tokens: [8, '+', 6, '×', 3, '−', 4, '÷', 2], mistake: 'left', mistakeName: 'straight left to right' },
  p2: { tokens: [48, '÷', 6, '×', 2], mistake: 'mult-first', mistakeName: '× before ÷' },
  p3: { tokens: [36, '−', '(', 4, '+', 8, ')', '÷', 3, '×', 2], mistake: 'left', mistakeName: 'left to right after the bracket' }
};

const REASONS = {
  bracket: 'the bracket comes first',
  level: '× and ÷ come before + and −',
  'same-level': 'same level, so left to right',
  left: 'the mistake: straight left to right',
  last: 'the only operation left'
};

export const simplificationStack = {
  id: 'bodmas-stack',
  topicId: 'simplification',
  title: 'The BODMAS stack',
  summary: 'Collapse an expression one operation at a time, with the next one lit up. Switch to a common wrong order and watch a different answer appear.',
  controls: [
    {
      id: 'problem',
      label: 'Expression',
      type: 'choice',
      options: Object.entries(BODMAS_PROBLEMS).map(([id, p]) => ({ id, label: lineText(p.tokens) })),
      default: 'p1'
    },
    {
      id: 'order',
      label: 'Order of working',
      type: 'choice',
      options: [
        { id: 'right', label: 'BODMAS' },
        { id: 'wrong', label: 'A common mistake' }
      ],
      default: 'right'
    },
    { id: 'step', label: 'Operations done', type: 'range', min: 0, max: 4, step: 1, default: 0 }
  ],
  compute({ problem, order, step }) {
    const p = BODMAS_PROBLEMS[problem];
    const wrong = order === 'wrong';
    const strategy = wrong ? p.mistake : 'bodmas';
    const lines = collapse(p.tokens, strategy);
    const right = collapse(p.tokens, 'bodmas');
    const mistaken = collapse(p.tokens, p.mistake);
    const total = lines.length - 1;
    const at = Math.min(step, total);
    const line = lines[at];
    const done = at === total;
    const value = (list) => list[list.length - 1].tokens[0];
    const correct = value(right);
    const mistakeValue = value(mistaken);
    const reasonText = (next) => (wrong && next.reason !== 'bracket' ? `the mistake: ${p.mistakeName}` : REASONS[next.reason]);
    // The first step where the mistake does something BODMAS would not.
    const split = mistaken.findIndex((l, i) => !right[i] || lineText(l.tokens) !== lineText(right[i].tokens));

    const shown = lines.slice(0, at + 1).map((l, i) => ({
      tokens: l.tokens.map((token, j) => ({
        text: tokenText(token),
        mark:
          i === at && l.next && j >= l.next.index - 1 && j <= l.next.index + 1
            ? 'next'
            : i < at && l.next && j >= l.next.index - 1 && j <= l.next.index + 1
              ? 'used'
              : j === l.resultAt
                ? 'done'
                : null
      })),
      note: i === 0 ? 'Start' : `Step ${i}`
    }));

    let insight;
    if (done) {
      insight = wrong
        ? near(mistakeValue, correct)
          ? `Here the mistake happens to land on ${show(correct)} too, but only by luck.`
          : `Working ${p.mistakeName} gives ${show(mistakeValue)}, not ${show(correct)}. Same numbers, same signs: only the order changed.`
        : `One number is left: ${show(correct)}. ${p.mistake === 'mult-first' ? 'Working ÷ before × here, simply because it comes first, is what keeps it right.' : 'Every step followed BODMAS, so anyone gets the same answer.'}`;
    } else {
      insight = `Next: ${operationText(line.tokens, line.next.index)}, because ${reasonText(line.next)}.`;
    }

    return {
      numbers: { total, at, done, value: done ? line.tokens[0] : null, correct, mistakeValue, bracket: line.tokens.includes('('), split },
      readouts: [
        { label: 'Step', value: `${at} of ${total}` },
        { label: 'Next operation', value: done ? 'None: finished' : `${operationText(line.tokens, line.next.index)} (${reasonText(line.next)})` },
        { label: 'With BODMAS', value: show(correct) },
        { label: `With the mistake (${p.mistakeName})`, value: show(mistakeValue) }
      ],
      plot: {
        kind: 'steps',
        lines: shown,
        result: done ? `= ${show(line.tokens[0])}` : null,
        wrong,
        summary: `${lineText(p.tokens)} worked ${wrong ? p.mistakeName : 'with BODMAS'}: ${lines
          .slice(0, at + 1)
          .map((l) => lineText(l.tokens))
          .join(', then ')}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'collapse',
      prompt: 'Collapse 8 + 6 × 3 − 4 ÷ 2 all the way with BODMAS. Which operation went first?',
      check: (values, n) => values.problem === 'p1' && values.order === 'right' && n.done,
      solution: { problem: 'p1', order: 'right', step: 4 }
    },
    {
      id: 'mistake',
      prompt: 'Work 48 ÷ 6 × 2 the wrong way, × first. Why is 4 not the answer?',
      check: (values, n) => values.problem === 'p2' && values.order === 'wrong' && n.done,
      solution: { problem: 'p2', order: 'wrong', step: 2 }
    },
    {
      id: 'bracket',
      prompt: 'In 36 − (4 + 8) ÷ 3 × 2, step with BODMAS until the bracket has gone.',
      check: (values, n) => values.problem === 'p3' && values.order === 'right' && !n.bracket,
      solution: { problem: 'p3', order: 'right', step: 1 }
    }
  ]
};

/* ------------------------------ approximation ------------------------------ */

const APPROX = { a: 48.6, b: 21.6, options: [1000, 1050, 1100, 1150] };
const APPROX_EXACT = APPROX.a * APPROX.b;
/** The answer line: wide enough for every estimate the sliders allow (44 × 18 to 54 × 25), clamped at the ends. */
const LINE = [800, 1400];
const direction = (rounded, exact) => (near(rounded, exact) ? 'kept' : rounded > exact ? 'up' : 'down');
const signedPct = (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${show(Math.abs(value) * 100, 1)}%`;

export const approximationBand = {
  id: 'estimate-band',
  topicId: 'approximation',
  title: 'Round, estimate, check the band',
  summary: 'Estimate 48.6 × 21.6 by rounding each number. The exact answer stays hidden; an error band shows how far off the estimate can be. Round one up and one down and the band shrinks.',
  controls: [
    { id: 'ra', label: 'Round 48.6 to', type: 'range', min: 44, max: 54, step: 1, default: 49 },
    { id: 'rb', label: 'Round 21.6 to', type: 'range', min: 18, max: 25, step: 1, default: 22 },
    {
      id: 'reveal',
      label: 'Exact answer',
      type: 'choice',
      options: [
        { id: 'hidden', label: 'Hidden' },
        { id: 'shown', label: 'Shown' }
      ],
      default: 'hidden'
    },
    {
      id: 'pick',
      label: 'Your answer',
      type: 'choice',
      options: [{ id: 'none', label: 'Not yet' }, ...APPROX.options.map((o) => ({ id: String(o), label: show(o) }))],
      default: 'none'
    }
  ],
  compute({ ra, rb, reveal, pick }) {
    const estimate = ra * rb;
    const error = estimate - APPROX_EXACT;
    const relative = estimate / APPROX_EXACT - 1;
    const ea = ra / APPROX.a - 1;
    const eb = rb / APPROX.b - 1;
    const dirA = direction(ra, APPROX.a);
    const dirB = direction(rb, APPROX.b);
    const opposite = (dirA === 'up' && dirB === 'down') || (dirA === 'down' && dirB === 'up');
    const band = [estimate - Math.abs(error), estimate + Math.abs(error)];
    const inBand = APPROX.options.filter((o) => o >= band[0] - 1e-9 && o <= band[1] + 1e-9);
    const nearest = APPROX.options.reduce((best, o) => (Math.abs(o - APPROX_EXACT) < Math.abs(best - APPROX_EXACT) ? o : best));
    const picked = pick === 'none' ? null : Number(pick);
    const shown = reveal === 'shown';

    const points = [
      ...APPROX.options.map((o, i) => ({ value: o, label: show(o), shape: 'option', tone: o === picked ? 'combinatorics' : null, slot: i % 2 ? 'low' : 'below' })),
      { value: estimate, label: `estimate ${show(estimate)}`, shape: 'dot', tone: 'arithmetic', slot: 'above' },
      ...(shown ? [{ value: APPROX_EXACT, label: `exact ${show(APPROX_EXACT)}`, shape: 'diamond', tone: 'geometry', slot: 'high' }] : [])
    ];

    let insight;
    if (opposite) insight = `One rounded up (${signedPct(dirA === 'up' ? ea : eb)}), one down (${signedPct(dirA === 'up' ? eb : ea)}): the errors pull against each other, so the estimate is off by only about ${show(Math.abs(relative) * 100, 2)}%.`;
    else if (dirA === dirB) insight = `Both rounded ${dirA} (${signedPct(ea)} and ${signedPct(eb)}): the errors add up, so the estimate is off by about ${show(Math.abs(relative) * 100, 1)}%.`;
    else insight = `One number kept, the other rounded ${dirA === 'kept' ? dirB : dirA}: the error is that one rounding, about ${show(Math.abs(relative) * 100, 1)}%.`;
    if (picked !== null) insight += picked === nearest ? ` ${show(picked)} is the nearest option.` : ` ${show(picked)} is not the nearest option${inBand.length > 1 ? ': the band is too wide to tell them apart' : ''}.`;
    else if (inBand.length === 1) insight += ` Only ${show(inBand[0])} lies inside the band: that is the one to choose.`;
    else if (inBand.length > 1) insight += ` ${inBand.map((o) => show(o)).join(' and ')} both lie inside the band: round more carefully to choose.`;

    return {
      numbers: { estimate, relative, dirA, dirB, opposite, band, inBand, nearest, picked },
      readouts: [
        { label: 'Rounding 48.6', value: `→ ${ra} (${dirA}, ${signedPct(ea)})` },
        { label: 'Rounding 21.6', value: `→ ${rb} (${dirB}, ${signedPct(eb)})` },
        { label: 'Estimate', value: `${ra} × ${rb} = ${show(estimate)}` },
        { label: 'Error band', value: `${show(band[0], 0)} to ${show(band[1], 0)} (± ${show(Math.abs(relative) * 100, 2)}%)` },
        { label: 'Exact answer', value: shown ? show(APPROX_EXACT) : 'Hidden' },
        { label: 'Options inside the band', value: inBand.length ? inBand.map((o) => show(o)).join(', ') : 'None' }
      ],
      plot: {
        kind: 'numberlines',
        min: LINE[0],
        max: LINE[1],
        step: 50,
        labelStep: 300,
        rows: [
          {
            label: 'Answer',
            tone: 'arithmetic',
            bands: [{ from: Math.max(LINE[0], band[0]), to: Math.min(LINE[1], band[1]), tone: 'arithmetic' }],
            points: points.map((p) => ({ ...p, value: Math.min(LINE[1], Math.max(LINE[0], p.value)) }))
          }
        ],
        summary: `Estimate ${ra} × ${rb} = ${show(estimate)}, error band ${show(band[0], 0)} to ${show(band[1], 0)}. Options ${APPROX.options.join(', ')}.${shown ? ` Exact ${show(APPROX_EXACT)}.` : ''}`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'cancel',
      prompt: 'Round one number up and the other down so that the error is under 0.5%.',
      check: (values, n) => n.opposite && Math.abs(n.relative) < 0.005,
      solution: { ra: 50, rb: 21 }
    },
    {
      id: 'both-up',
      prompt: 'Round both numbers up and push the error past 4%.',
      check: (values, n) => n.dirA === 'up' && n.dirB === 'up' && n.relative > 0.04,
      solution: { ra: 50, rb: 22 }
    },
    {
      id: 'pick',
      prompt: 'Make the band cover just one option, then choose that option as your answer.',
      check: (values, n) => n.inBand.length === 1 && n.picked === n.nearest && n.inBand[0] === n.nearest,
      solution: { ra: 50, rb: 21, pick: '1050' }
    }
  ]
};

/* ---------------------------- counting principle ---------------------------- */

const STAGES = [
  { name: 'Shirt', short: 'S', tone: 'arithmetic' },
  { name: 'Trousers', short: 'T', tone: 'algebra' },
  { name: 'Shoes', short: 'F', tone: 'geometry' }
];

/** The tree of choices, depth first: a root, then one layer per stage. */
export function choiceTree(counts) {
  const nodes = [{ depth: 0, parent: -1, tone: null, label: '' }];
  const grow = (parent, depth) => {
    if (depth > counts.length) return;
    const stage = STAGES[depth - 1];
    for (let i = 0; i < counts[depth - 1]; i++) {
      nodes.push({ depth, parent, tone: stage.tone, label: `${stage.short}${i + 1}` });
      grow(nodes.length - 1, depth + 1);
    }
  };
  grow(0, 1);
  return nodes;
}

export const countingTree = {
  id: 'choice-tree',
  topicId: 'counting-principle',
  title: 'A tree of choices: and multiplies, or adds',
  summary: 'Grow a tree one layer per choice: every branch splits again, so "a shirt and trousers and shoes" multiplies. Switch to "or" and the branches sit side by side, so they add.',
  controls: [
    {
      id: 'mode',
      label: 'You choose',
      type: 'choice',
      options: [
        { id: 'and', label: 'One from every stage (and)' },
        { id: 'or', label: 'One item in all (or)' }
      ],
      default: 'and'
    },
    { id: 'stages', label: 'Stages', type: 'range', min: 1, max: 3, step: 1, default: 2 },
    { id: 'n1', label: 'Shirts', type: 'range', min: 1, max: 4, step: 1, default: 3 },
    { id: 'n2', label: 'Trousers', type: 'range', min: 1, max: 4, step: 1, default: 2 },
    { id: 'n3', label: 'Pairs of shoes', type: 'range', min: 1, max: 4, step: 1, default: 2 }
  ],
  compute({ mode, stages, n1, n2, n3 }) {
    const counts = [n1, n2, n3].slice(0, stages);
    const product = counts.reduce((p, c) => p * c, 1);
    const sum = counts.reduce((s, c) => s + c, 0);
    const and = mode === 'and';
    const used = STAGES.slice(0, stages);
    const nodes = and
      ? choiceTree(counts)
      : [{ depth: 0, parent: -1, tone: null, label: '' }, ...used.flatMap((stage, s) => Array.from({ length: counts[s] }, (_, i) => ({ depth: 1, parent: 0, tone: stage.tone, label: `${stage.short}${i + 1}` })))];
    const product$ = counts.join(' × ');
    const sum$ = counts.join(' + ');

    let insight;
    if (stages === 1) insight = `With one stage there is nothing to combine: ${plural(n1, 'shirt')}, ${plural(n1, 'way')}, whether you say "and" or "or".`;
    else if (and) {
      insight = `Every shirt branches into ${plural(counts[1], 'choice')} of trousers${stages === 3 ? `, and each of those into ${plural(counts[2], 'choice')} of shoes` : ''}: the tree ends in ${product$} = ${product} outfits.`;
      if (counts.includes(1)) insight += ' A stage with one option does not change the count: × 1.';
    } else insight = `Only one item is chosen, from any one stage, so the branches sit side by side instead of splitting again: ${sum$} = ${sum} choices.`;

    return {
      numbers: { counts, product, sum, leaves: and ? product : sum },
      readouts: [
        { label: 'And: multiply', value: `${product$} = ${product}` },
        { label: 'Or: add', value: `${sum$} = ${sum}` },
        { label: 'Ends of the tree', value: String(and ? product : sum) }
      ],
      plot: {
        kind: 'tree',
        levels: and ? ['Start', ...used.map((s, i) => `${s.name} (${counts[i]})`)] : ['Start', 'One item'],
        nodes,
        caption: and ? `${product$} = ${product} outfits` : `${sum$} = ${sum} choices`,
        legend: used.map((s, i) => ({ label: `${s.name}: ${counts[i]}`, tone: s.tone })),
        summary: and
          ? `A tree of ${stages} stage${stages === 1 ? '' : 's'} with ${counts.join(', ')} options: ${product} ends.`
          : `${counts.join(', ')} options side by side: ${sum} choices.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'twenty-four',
      prompt: 'Choose a shirt and trousers and shoes: set the options to make 24 outfits.',
      check: (values, n) => values.mode === 'and' && values.stages === 3 && n.product === 24,
      solution: { mode: 'and', stages: 3, n1: 4, n2: 3, n3: 2 }
    },
    {
      id: 'same',
      prompt: 'With at least two stages, find options where "and" and "or" give the same count.',
      check: (values, n) => values.stages >= 2 && n.product === n.sum,
      solution: { stages: 2, n1: 2, n2: 2 }
    },
    {
      id: 'one-option',
      prompt: 'Add a third stage with only one option. Does the "and" count change? Does the "or" count?',
      check: (values) => values.stages === 3 && values.n3 === 1,
      solution: { stages: 3, n3: 1 }
    }
  ]
};

/* -------------------------------- set theory -------------------------------- */

const SET_TONES = ['arithmetic', 'combinatorics', 'geometry'];
const multiplesUpTo = (k, n) => Array.from({ length: Math.floor(n / k) }, (_, i) => k * (i + 1));

/** Every subset of {1, …, k}, smallest first, in a fixed order. */
export function subsetsOf(k) {
  const all = [];
  for (let mask = 0; mask < 2 ** k; mask++) all.push(Array.from({ length: k }, (_, i) => i + 1).filter((v) => mask & (1 << (v - 1))));
  return all.sort((p, q) => p.length - q.length || p.join(',').localeCompare(q.join(','), 'en', { numeric: true }));
}

export const setTheoryDots = {
  id: 'set-elements',
  topicId: 'set-theory',
  title: 'Elements in sets, and the power set',
  summary: 'Numbers from 1 to n drop into sets of multiples. Read the roster form, check n(A ∪ B) = n(A) + n(B) − n(A ∩ B), then watch the power set double with every new element.',
  controls: [
    {
      id: 'view',
      label: 'Show',
      type: 'choice',
      options: [
        { id: 'two', label: 'Two sets' },
        { id: 'three', label: 'Three sets' },
        { id: 'power', label: 'Power set' }
      ],
      default: 'two'
    },
    { id: 'n', label: 'U = {1, …, n}: n', type: 'range', min: 6, max: 20, step: 1, default: 12, showWhen: { view: ['two', 'three'] } },
    { id: 'a', label: 'A = multiples of', type: 'range', min: 2, max: 6, step: 1, default: 2, showWhen: { view: ['two', 'three'] } },
    { id: 'b', label: 'B = multiples of', type: 'range', min: 2, max: 6, step: 1, default: 3, showWhen: { view: ['two', 'three'] } },
    { id: 'c', label: 'C = multiples of', type: 'range', min: 2, max: 6, step: 1, default: 5, showWhen: { view: 'three' } },
    { id: 'k', label: 'Elements in S', type: 'range', min: 0, max: 5, step: 1, default: 2, showWhen: { view: 'power' } }
  ],
  compute({ view, n, a, b, c, k }) {
    if (view === 'power') {
      const subsets = subsetsOf(k);
      const fresh = subsets.filter((s) => s.includes(k) && k > 0).length;
      const columns = Array.from({ length: k + 1 }, (_, size) => ({
        label: `${plural(size, 'element')}`,
        items: subsets.filter((s) => s.length === size).map((s) => ({ text: roster(s), fresh: k > 0 && s.includes(k) }))
      }));
      const S = roster(Array.from({ length: k }, (_, i) => i + 1));
      return {
        numbers: { view, k, count: subsets.length, fresh },
        readouts: [
          { label: 'S', value: S },
          { label: 'Subsets of S: 2ⁿ', value: `2${'⁰¹²³⁴⁵'[k]} = ${subsets.length}` },
          { label: k ? `New ones, with ${k} added` : 'New ones', value: k ? `${fresh} (one for each subset of the set before)` : '— (only ∅)' }
        ],
        plot: {
          kind: 'subsets',
          columns,
          summary: `The ${subsets.length} subsets of ${S}: ${subsets.map(roster).join(', ')}.`
        },
        insight: k === 0
          ? 'The empty set has exactly one subset: itself, ∅. Add an element and watch the count double.'
          : `Every subset of ${roster(Array.from({ length: k - 1 }, (_, i) => i + 1))} appears twice: once without ${k}, once with it (highlighted). So the count doubles: ${2 ** (k - 1)} → ${2 ** k}.`
      };
    }

    const three = view === 'three';
    const steps = three ? [a, b, c] : [a, b];
    const names = three ? ['A', 'B', 'C'] : ['A', 'B'];
    const sets = steps.map((s) => multiplesUpTo(s, n));
    const letters = 'abc';
    const elements = Array.from({ length: n }, (_, i) => i + 1).map((value) => ({
      value,
      in: steps.map((s, j) => (value % s === 0 ? letters[j] : '')).join('')
    }));
    const where = (test) => elements.filter((e) => test(e.in)).map((e) => e.value);
    const ab = where((r) => r.includes('a') && r.includes('b'));
    const union = where((r) => r.length > 0);
    const outside = where((r) => r === '');
    const [A, B] = sets;
    const subset = B.length > 0 && B.every((v) => A.includes(v));

    const readouts = names.map((name, j) => ({ label: `${name} (multiples of ${steps[j]})`, value: roster(sets[j]) }));
    let formula;
    let numbers;
    if (three) {
      const ac = where((r) => r.includes('a') && r.includes('c'));
      const bc = where((r) => r.includes('b') && r.includes('c'));
      const abc = where((r) => r === 'abc');
      formula = `${sets[0].length} + ${sets[1].length} + ${sets[2].length} − ${ab.length} − ${ac.length} − ${bc.length} + ${abc.length} = ${union.length}`;
      readouts.push(
        { label: 'A ∩ B ∩ C', value: roster(abc) },
        { label: 'n(A ∪ B ∪ C) = ΣA − Σ(A ∩ B) + n(A ∩ B ∩ C)', value: formula }
      );
      numbers = { view, sizes: sets.map((s) => s.length), ab: ab.length, ac: ac.length, bc: bc.length, abc: abc.length, union: union.length, outside: outside.length, subset };
    } else {
      formula = `${A.length} + ${B.length} − ${ab.length} = ${union.length}`;
      readouts.push(
        { label: 'A ∩ B', value: roster(ab) },
        { label: 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B)', value: formula }
      );
      numbers = { view, sizes: [A.length, B.length], ab: ab.length, abc: 0, union: union.length, outside: outside.length, subset };
    }
    readouts.push({ label: 'In none of them', value: roster(outside) });

    let insight;
    if (three) {
      insight = numbers.abc
        ? `${roster(where((r) => r === 'abc'))} is in all three sets: it is a multiple of ${a}, ${b} and ${c}. Adding three sets counts it three times, taking away the three overlaps removes it three times, so it is added back once.`
        : `Nothing up to ${n} is a multiple of ${a}, ${b} and ${c} at once, so the last term, n(A ∩ B ∩ C), is 0.`;
    } else if (a === b) insight = 'A and B have the same elements, so they are equal sets: the overlap is everything, and n(A ∪ B) = n(A).';
    else if (!ab.length) insight = `No number up to ${n} is a multiple of both ${a} and ${b}, so A and B are disjoint: n(A ∪ B) is simply ${A.length} + ${B.length}.`;
    else if (subset) insight = `Every multiple of ${b} is a multiple of ${a}, so B ⊂ A: the overlap is all of B, and n(A ∪ B) = n(A).`;
    else insight = `${roster(ab)} ${ab.length === 1 ? 'is' : 'are'} in both A and B, so n(A) + n(B) counts ${ab.length === 1 ? 'it' : 'them'} twice. Take n(A ∩ B) away once: ${formula}.`;

    return {
      numbers,
      readouts,
      plot: {
        kind: 'setdots',
        sets: names.map((name, j) => ({ label: `${name}: ×${steps[j]}`, tone: SET_TONES[j] })),
        elements,
        universe: `U = {1, …, ${n}}`,
        summary: `U = 1 to ${n}. ${names.map((name, j) => `${name} = ${roster(sets[j])}`).join('; ')}. Union has ${union.length} elements; ${outside.length} are outside.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'disjoint',
      prompt: 'Make A and B disjoint: two non-empty sets with nothing in common.',
      check: (values, n) => n.view === 'two' && n.ab === 0 && n.sizes[0] > 0 && n.sizes[1] > 0,
      solution: { view: 'two', n: 12, a: 4, b: 5 }
    },
    {
      id: 'subset',
      prompt: 'Make B a proper subset of A (every element of B in A, and A bigger).',
      check: (values, n) => n.view === 'two' && n.subset && n.sizes[1] < n.sizes[0],
      solution: { view: 'two', a: 2, b: 4 }
    },
    {
      id: 'all-three',
      prompt: 'With three sets, find settings where some number is in A, B and C at once.',
      check: (values, n) => n.view === 'three' && n.abc > 0,
      solution: { view: 'three', n: 12, a: 2, b: 3, c: 4 }
    },
    {
      id: 'sixteen',
      prompt: 'In the power set, add elements until S has 16 subsets.',
      check: (values, n) => n.view === 'power' && n.count === 16,
      solution: { view: 'power', k: 4 }
    }
  ]
};

/* --------------------------------- caselet --------------------------------- */

const CASELET_SENTENCES = [
  'A college has 800 students in three streams: Arts, Science and Commerce.',
  '300 of them study Science.',
  'Arts has 100 fewer students than Science.',
  'The rest study Commerce.',
  '40% of the Science students are girls.',
  'In Arts, there are as many girls as boys.',
  'In all, 360 of the students are girls.'
];
const CASELET_ROWS = ['Arts', 'Science', 'Commerce', 'Total'];
const CASELET_COLUMNS = ['Boys', 'Girls', 'Total'];
/** Each cell: the sentence that gives or implies it, the cells it needs, and its working. */
const CASELET_CELLS = [
  { row: 3, col: 2, value: 800, fact: 0, needs: [], kind: 'given' },
  { row: 1, col: 2, value: 300, fact: 1, needs: [], kind: 'given' },
  { row: 0, col: 2, value: 200, fact: 2, needs: ['1,2'], kind: 'derived', how: '300 − 100' },
  { row: 2, col: 2, value: 300, fact: 3, needs: ['3,2', '1,2', '0,2'], kind: 'derived', how: '800 − 300 − 200' },
  { row: 1, col: 1, value: 120, fact: 4, needs: ['1,2'], kind: 'derived', how: '40% of 300' },
  { row: 1, col: 0, value: 180, fact: 4, needs: ['1,2', '1,1'], kind: 'derived', how: '300 − 120' },
  { row: 0, col: 1, value: 100, fact: 5, needs: ['0,2'], kind: 'derived', how: '200 ÷ 2' },
  { row: 0, col: 0, value: 100, fact: 5, needs: ['0,2'], kind: 'derived', how: '200 ÷ 2' },
  { row: 3, col: 1, value: 360, fact: 6, needs: [], kind: 'given' },
  { row: 3, col: 0, value: 440, fact: 6, needs: ['3,2', '3,1'], kind: 'derived', how: '800 − 360' },
  { row: 2, col: 1, value: 140, fact: 6, needs: ['3,1', '1,1', '0,1'], kind: 'derived', how: '360 − 120 − 100' },
  { row: 2, col: 0, value: 160, fact: 6, needs: ['2,2', '2,1'], kind: 'derived', how: '300 − 140' }
];
const cellKey = (cell) => `${cell.row},${cell.col}`;
const SKIPPABLE = { none: -1, arts: 2, girls: 6 };

/** The cells known after reading the facts in `read` (a set of sentence indexes): fill until nothing changes. */
export function caseletKnown(read) {
  const known = new Set();
  for (let changed = true; changed; ) {
    changed = false;
    for (const cell of CASELET_CELLS) {
      const key = cellKey(cell);
      if (!known.has(key) && read.has(cell.fact) && cell.needs.every((k) => known.has(k))) {
        known.add(key);
        changed = true;
      }
    }
  }
  return known;
}

export const caseletTable = {
  id: 'caselet-table',
  topicId: 'di-caselet',
  title: 'From a paragraph to a table',
  summary: 'Read a caselet one sentence at a time. Facts stated outright fill their cells as "given"; a cell whose inputs are all known fills itself as "derived". Leave a fact out and see what can never be found.',
  controls: [
    { id: 'read', label: 'Sentences read', type: 'range', min: 0, max: CASELET_SENTENCES.length, step: 1, default: 1 },
    {
      id: 'skip',
      label: 'Leave out a fact',
      type: 'choice',
      options: [
        { id: 'none', label: 'None' },
        { id: 'arts', label: '"Arts has 100 fewer"' },
        { id: 'girls', label: '"360 are girls"' }
      ],
      default: 'none'
    }
  ],
  compute({ read, skip }) {
    const skipped = SKIPPABLE[skip];
    const readSet = (count) => new Set(Array.from({ length: count }, (_, i) => i).filter((i) => i !== skipped));
    const known = caseletKnown(readSet(read));
    const before = caseletKnown(readSet(Math.max(0, read - 1)));
    const fresh = CASELET_CELLS.filter((cell) => known.has(cellKey(cell)) && !before.has(cellKey(cell)));
    const everything = caseletKnown(readSet(CASELET_SENTENCES.length));
    const never = CASELET_CELLS.filter((cell) => !everything.has(cellKey(cell)));
    const cellAt = (row, col) => CASELET_CELLS.find((cell) => cell.row === row && cell.col === col);
    const given = CASELET_CELLS.filter((cell) => cell.kind === 'given' && known.has(cellKey(cell))).length;
    const derived = CASELET_CELLS.filter((cell) => cell.kind === 'derived' && known.has(cellKey(cell))).length;
    const blank = CASELET_CELLS.length - given - derived;
    const name = (cell) => (cell.row === 3 && cell.col === 2 ? 'Grand total' : `${CASELET_ROWS[cell.row]} ${CASELET_COLUMNS[cell.col].toLowerCase()}`);
    const last = read > 0 ? read - 1 : null;

    const table = {
      kind: 'table',
      caption: 'Students by stream',
      corner: 'Stream',
      columns: CASELET_COLUMNS,
      focusRow: null,
      rows: CASELET_ROWS.map((label, row) => ({
        label,
        total: row === 3,
        cells: CASELET_COLUMNS.map((_, col) => {
          const cell = cellAt(row, col);
          const isKnown = known.has(cellKey(cell));
          const isFresh = fresh.includes(cell);
          return isKnown
            ? { text: show(cell.value), note: cell.kind === 'given' ? 'given' : `= ${cell.how}`, kind: cell.kind, fresh: isFresh }
            : { text: '?', note: never.includes(cell) ? 'cannot be found' : '', kind: 'blank' };
        })
      })),
      summary: `${given} cells given, ${derived} derived, ${blank} still blank.`
    };
    const passage = {
      kind: 'passage',
      title: 'The caselet',
      sentences: CASELET_SENTENCES.map((text, i) => ({
        text,
        state: i === skipped ? 'skipped' : i === last ? 'new' : i < read ? 'read' : 'unread'
      })),
      summary: `${read} of ${CASELET_SENTENCES.length} sentences read${skipped >= 0 ? `, one left out: "${CASELET_SENTENCES[skipped]}"` : ''}.`
    };

    let insight;
    if (read === 0) insight = 'Nothing read yet: every cell is blank. Read the first sentence.';
    else if (last === skipped) insight = 'This fact is left out, so nothing new can be filled from it.';
    else if (!fresh.length) insight = `"${CASELET_SENTENCES[last]}" adds nothing new to the table${skipped >= 0 ? ' without the fact that was left out' : ''}.`;
    else {
      const kinds = fresh.map((cell) => (cell.kind === 'given' ? `${name(cell)} ${cell.value} (given)` : `${name(cell)} = ${cell.how} = ${cell.value}`));
      insight = `This sentence fills ${plural(fresh.length, 'cell')}: ${kinds.join('; ')}.`;
    }
    if (read === CASELET_SENTENCES.length && never.length) insight += ` Without that fact, ${plural(never.length, 'cell')} can never be found.`;
    else if (read === CASELET_SENTENCES.length) insight += ` All 12 cells are filled: ${given} given, ${derived} derived.`;

    return {
      numbers: { read, known: [...known], fresh: fresh.length, given, derived, blank, never: never.length, skip },
      readouts: [
        { label: 'Sentences read', value: `${read} of ${CASELET_SENTENCES.length}` },
        { label: 'Given outright', value: String(given) },
        { label: 'Derived from other cells', value: String(derived) },
        { label: 'Still blank', value: String(blank) },
        { label: 'Filled by the last sentence', value: fresh.length ? fresh.map(name).join(', ') : 'Nothing' }
      ],
      plot: { kind: 'stack', plots: [passage, table], summary: `${passage.summary} ${table.summary}` },
      insight
    };
  },
  tasks: [
    {
      id: 'commerce',
      prompt: 'Read on until the Commerce total can be filled in. Which facts did it need?',
      check: (values, n) => n.known.includes('2,2'),
      solution: { read: 4, skip: 'none' }
    },
    {
      id: 'four-at-once',
      prompt: 'Find the sentence that fills four cells at once.',
      check: (values, n) => n.fresh === 4,
      solution: { read: 7, skip: 'none' }
    },
    {
      id: 'missing',
      prompt: 'Leave out "Arts has 100 fewer" and read everything. Which cells can never be found?',
      check: (values, n) => values.skip === 'arts' && values.read === CASELET_SENTENCES.length,
      solution: { read: 7, skip: 'arts' }
    }
  ]
};

/* ------------------------------- radar charts ------------------------------- */

const RADAR_SUBJECTS = ['Maths', 'Science', 'English', 'History', 'Geography'];
const RADAR_SCORES = { asha: [100, 30, 90, 45, 95], ravi: [70, 75, 65, 70, 70] };
const RADAR_ORDERS = { given: [0, 1, 2, 3, 4], grouped: [0, 2, 4, 1, 3] };
const sum = (list) => list.reduce((s, v) => s + v, 0);

/** The area of a radar shape: equal angles between spokes, each value its distance from the centre. */
export function radarArea(values) {
  const angle = (2 * Math.PI) / values.length;
  return 0.5 * Math.sin(angle) * values.reduce((s, v, i) => s + v * values[(i + 1) % values.length], 0);
}

export const radarOrBars = {
  id: 'radar-or-bars',
  topicId: 'di-mixed-radar',
  title: 'Radar or bars: read values, not areas',
  summary: 'The same two students\' marks drawn as a radar chart or as grouped bars. Reorder the spokes and the shapes change size while every mark stays the same.',
  controls: [
    {
      id: 'view',
      label: 'Draw as',
      type: 'choice',
      options: [
        { id: 'radar', label: 'Radar' },
        { id: 'bars', label: 'Grouped bars' }
      ],
      default: 'radar'
    },
    {
      id: 'order',
      label: 'Order of the subjects',
      type: 'choice',
      options: [
        { id: 'given', label: 'As listed' },
        { id: 'grouped', label: "Asha's best together" }
      ],
      default: 'given'
    },
    {
      id: 'focus',
      label: 'Read a subject',
      type: 'choice',
      options: [{ id: 'none', label: 'None' }, ...RADAR_SUBJECTS.map((s) => ({ id: s.toLowerCase(), label: s }))],
      default: 'none'
    }
  ],
  compute({ view, order, focus }) {
    const idx = RADAR_ORDERS[order];
    const categories = idx.map((i) => RADAR_SUBJECTS[i]);
    const asha = idx.map((i) => RADAR_SCORES.asha[i]);
    const ravi = idx.map((i) => RADAR_SCORES.ravi[i]);
    const areaA = radarArea(asha);
    const areaR = radarArea(ravi);
    const totals = [sum(asha), sum(ravi)];
    const f = RADAR_SUBJECTS.findIndex((s) => s.toLowerCase() === focus);
    const radar = view === 'radar';
    const gaps = RADAR_SUBJECTS.map((_, i) => RADAR_SCORES.asha[i] - RADAR_SCORES.ravi[i]);
    const ashaBest = RADAR_SUBJECTS[gaps.indexOf(Math.max(...gaps))];
    const raviBest = RADAR_SUBJECTS[gaps.indexOf(Math.min(...gaps))];
    const dim = categories.map((c) => f >= 0 && c !== RADAR_SUBJECTS[f]);

    const focusText =
      f < 0
        ? 'Pick a subject'
        : `${RADAR_SUBJECTS[f]}: Asha ${RADAR_SCORES.asha[f]}, Ravi ${RADAR_SCORES.ravi[f]} (${gaps[f] >= 0 ? `Asha +${gaps[f]}` : `Ravi +${-gaps[f]}`})`;
    const chart = {
      type: radar ? 'radar' : 'bar',
      caption: 'Marks out of 100',
      max: 100,
      categories,
      series: [
        { label: 'Asha', data: asha, colorToken: 'data', ...(radar ? {} : { dim }) },
        { label: 'Ravi', data: ravi, colorToken: 'algebra', ...(radar ? {} : { dim }) }
      ],
      ...(radar ? {} : { legend: [{ label: 'Asha', colorToken: 'data' }, { label: 'Ravi', colorToken: 'algebra' }] })
    };

    let insight;
    if (!radar) insight = 'The same ten marks as bars: each pair stands side by side on one scale, so the gaps are read straight off. Bars have no area to mislead you.';
    else if (areaA < areaR) insight = `Asha's total is higher (${totals[0]} against ${totals[1]}), yet her shape is smaller: her high and low marks alternate, which pulls the shape in. Read the marks on the spokes, not the areas.`;
    else insight = `Same marks, new order: now Asha's shape is the bigger one. The area changed with the order of the spokes; not one mark did.`;
    if (f >= 0) insight += ` ${focusText}.`;

    return {
      numbers: { view, order, areaA, areaR, totals, focus: f >= 0 ? RADAR_SUBJECTS[f] : null, ashaBest, raviBest },
      readouts: [
        { label: 'Totals', value: `Asha ${totals[0]} · Ravi ${totals[1]}` },
        { label: 'Shape areas (radar)', value: radar ? `Asha ${show(areaA, 0)} · Ravi ${show(areaR, 0)}` : 'Bars have no shape' },
        { label: 'Spoke order', value: categories.join(', ') },
        { label: 'Selected subject', value: focusText }
      ],
      plot: {
        kind: 'chart',
        chart,
        summary: `Marks out of 100 as a ${radar ? 'radar chart' : 'grouped bar chart'}. ${categories.map((c, i) => `${c}: Asha ${asha[i]}, Ravi ${ravi[i]}`).join('; ')}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'asha-lead',
      prompt: 'Select the subject where Asha is furthest ahead of Ravi.',
      check: (values, n) => n.focus === n.ashaBest,
      solution: { focus: 'maths' }
    },
    {
      id: 'ravi-lead',
      prompt: 'Switch to grouped bars and select the subject where Ravi is furthest ahead.',
      check: (values, n) => n.view === 'bars' && n.focus === n.raviBest,
      solution: { view: 'bars', focus: 'science' }
    },
    {
      id: 'order',
      prompt: 'On the radar, reorder the subjects so the higher total also has the bigger shape. Did any mark change?',
      check: (values, n) => n.view === 'radar' && n.areaA > n.areaR,
      solution: { view: 'radar', order: 'grouped' }
    }
  ]
};

/* ----------------------------------- races ----------------------------------- */

const A_SPEED = 10; // m/s

/** A race of `length` m: A at 10 m/s, B at `ratio`% of that, B starting `start` m ahead. */
export function race(length, ratio, start) {
  const speedB = (A_SPEED * ratio) / 100;
  const timeA = length / A_SPEED;
  const timeB = (length - start) / speedB;
  const winner = near(timeA, timeB, 1e-9) ? 'tie' : timeA < timeB ? 'A' : 'B';
  const finish = Math.min(timeA, timeB);
  const at = (t) => ({ a: Math.min(length, A_SPEED * t), b: Math.min(length, start + speedB * t) });
  const end = at(finish);
  const margin = winner === 'A' ? length - end.b : winner === 'B' ? length - end.a : 0;
  return { speedB, timeA, timeB, winner, finish, at, margin, seconds: Math.abs(timeA - timeB), deadHeat: length * (1 - ratio / 100) };
}

export const raceTrack = {
  id: 'race-track',
  topicId: 'races',
  title: 'A beats B by x metres',
  summary: 'Two runners on a straight track. Set B\'s speed and head start, and read the margin at the moment the winner crosses the line, and the head start that makes it a dead heat.',
  controls: [
    { id: 'length', label: 'Race length', type: 'range', min: 100, max: 400, step: 100, default: 100, unit: 'm' },
    { id: 'ratio', label: 'B runs this far while A runs 100 m', type: 'range', min: 50, max: 100, step: 1, default: 90, unit: 'm' },
    { id: 'start', label: "B's head start", type: 'range', min: 0, max: 50, step: 1, default: 0, unit: 'm' },
    { id: 'clock', label: 'Race clock (% of the race)', type: 'range', min: 0, max: 100, step: 5, default: 100, unit: '%' }
  ],
  compute({ length, ratio, start, clock }) {
    const r = race(length, ratio, start);
    const t = (r.finish * clock) / 100;
    const pos = r.at(t);
    const ended = clock === 100;
    const loser = r.winner === 'A' ? 'B' : 'A';
    const result =
      r.winner === 'tie'
        ? 'Dead heat'
        : `${r.winner} beats ${loser} by ${show(r.margin, 2)} m (${show(r.seconds, 2)} s)`;
    const bRows = [];
    if (start > 0) bRows.push({ from: 0, to: start, tone: 'data', label: `head start ${start} m` });
    if (ended && r.winner === 'A') bRows.push({ from: pos.b, to: length, tone: 'combinatorics', label: `${show(r.margin, 2)} m short` });
    const aBands = ended && r.winner === 'B' ? [{ from: pos.a, to: length, tone: 'arithmetic', label: `${show(r.margin, 2)} m short` }] : [];

    let insight;
    if (!ended) insight = `${show(t, 2)} s in: A has run ${show(pos.a, 1)} m, B is at ${show(pos.b, 1)} m. Move the clock to 100% to see the finish.`;
    else if (r.winner === 'tie') insight = `A dead heat: B's ${start} m start exactly makes up for running ${ratio} m to A's 100 m.`;
    else if (r.winner === 'A')
      insight = `When A crosses the line, B has covered ${show(pos.b - start, 2)} m${start ? ` (from a ${start} m start)` : ''}, so B is ${show(r.margin, 2)} m short: "A beats B by ${show(r.margin, 2)} m". ${start ? '' : `In one race, distances are in the ratio of speeds: ${ratioText(100, ratio)}.`}`.trim();
    else insight = `B's ${start} m start is more than the ${show(r.deadHeat, 2)} m needed for a dead heat, so B wins: when B finishes, A is ${show(r.margin, 2)} m short.`;

    return {
      numbers: { winner: r.winner, margin: r.margin, seconds: r.seconds, deadHeat: r.deadHeat, posA: pos.a, posB: pos.b },
      readouts: [
        { label: 'Speeds A : B', value: `${ratioText(100, ratio)} (A runs 10 m/s)` },
        { label: 'Result', value: result },
        { label: 'Head start for a dead heat', value: `${show(r.deadHeat, 2)} m` },
        { label: 'Times to finish', value: `A ${show(r.timeA, 2)} s · B ${show(r.timeB, 2)} s` }
      ],
      plot: {
        kind: 'numberlines',
        min: 0,
        max: length,
        step: length / 10,
        labelStep: length / 5,
        unit: 'm',
        guides: [
          { value: 0, label: 'Start' },
          { value: length, label: 'Finish' }
        ],
        rows: [
          { label: 'A', tone: 'arithmetic', bands: aBands, points: [{ value: pos.a, label: `A ${show(pos.a, 1)} m`, shape: 'runner', tone: 'arithmetic' }] },
          {
            label: 'B',
            tone: 'combinatorics',
            bands: bRows,
            points: [
              ...(r.deadHeat > 0 && !near(r.deadHeat, start) ? [{ value: r.deadHeat, label: 'dead-heat start', shape: 'ring', tone: 'geometry', slot: 'below' }] : []),
              { value: pos.b, label: `B ${show(pos.b, 1)} m`, shape: 'runner', tone: 'combinatorics' }
            ]
          }
        ],
        summary: `${length} m race. At ${clock}% of the race, A is at ${show(pos.a, 1)} m and B at ${show(pos.b, 1)} m. ${result}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'beat-twenty',
      prompt: 'In a 100 m race with no head start, make A beat B by 20 m.',
      check: (values, n) => values.length === 100 && values.start === 0 && n.winner === 'A' && near(n.margin, 20),
      solution: { length: 100, ratio: 80, start: 0, clock: 100 }
    },
    {
      id: 'dead-heat',
      prompt: 'Give B just enough head start for a dead heat.',
      check: (values, n) => values.start > 0 && n.winner === 'tie',
      solution: { length: 100, ratio: 90, start: 10 }
    },
    {
      id: 'b-wins',
      prompt: 'Give B more start than that, so B wins. By how many metres?',
      check: (values, n) => n.winner === 'B' && values.ratio < 100,
      solution: { length: 100, ratio: 90, start: 20, clock: 100 }
    },
    {
      id: 'double',
      prompt: 'Run 200 m at the same speeds (B 90 m to A\'s 100 m), no head start. Does the margin double?',
      check: (values) => values.length === 200 && values.ratio === 90 && values.start === 0,
      solution: { length: 200, ratio: 90, start: 0, clock: 100 }
    }
  ]
};

/* ------------------------------ work and wages ------------------------------ */

/** A and B (a and b days alone) start together; B may leave after `leaveAfter` days. */
export function wagesJob(a, b, leaveAfter = Infinity) {
  const together = (a * b) / (a + b);
  const bDays = Math.min(leaveAfter, together);
  const days = bDays >= together ? together : a * (1 - bDays / b);
  return { days, aDays: days, bDays, workA: days / a, workB: bDays / b, together };
}

export const workWages = {
  id: 'wage-split',
  topicId: 'work-and-wages',
  title: 'Wages follow the work, not the days',
  summary: 'Two workers fill one progress bar in their own colours. The wage pile splits in the same colours: by the share of the job each did, not by the days each spent.',
  controls: [
    { id: 'a', label: 'A alone takes', type: 'range', min: 2, max: 20, step: 1, default: 10, unit: 'days' },
    { id: 'b', label: 'B alone takes', type: 'range', min: 2, max: 20, step: 1, default: 15, unit: 'days' },
    {
      id: 'leave',
      label: 'B on the job',
      type: 'choice',
      options: [
        { id: 'stay', label: 'Stays to the end' },
        { id: 'early', label: 'Leaves early' }
      ],
      default: 'stay'
    },
    { id: 'k', label: 'B leaves after', type: 'range', min: 1, max: 10, step: 1, default: 3, unit: 'days', showWhen: { leave: 'early' } },
    { id: 'wage', label: 'Total wage', type: 'range', min: 600, max: 6000, step: 100, default: 3000, unit: '₹' },
    { id: 'progress', label: 'Time passed (% of the job)', type: 'range', min: 0, max: 100, step: 5, default: 100, unit: '%' }
  ],
  compute({ a, b, leave, k, wage, progress }) {
    const early = leave === 'early';
    const job = wagesJob(a, b, early ? k : Infinity);
    const leftEarly = early && k < job.together - 1e-9;
    const t = (job.days * progress) / 100;
    const payA = wage * job.workA;
    const payB = wage * job.workB;
    const byDaysA = (wage * job.aDays) / (job.aDays + job.bDays);
    const byDaysB = wage - byDaysA;

    // The bar, day by day: A's piece, then B's, in their colours.
    const SCALE = 10;
    const rects = [];
    let x = 0;
    for (let d = 0; d < Math.ceil(t - 1e-9); d++) {
      const span = Math.min(1, t - d);
      const pieceA = (span / a) * SCALE;
      const pieceB = (Math.max(0, Math.min(d + span, job.bDays) - d) / b) * SCALE;
      rects.push({ x, y: 0.7, w: pieceA, h: 1, tone: 'arithmetic', label: '' });
      x += pieceA;
      if (pieceB > 1e-9) {
        rects.push({ x, y: 0.7, w: pieceB, h: 1, tone: 'combinatorics', label: '' });
        x += pieceB;
      }
    }
    const doneA = Math.min(t, job.aDays) / a;
    const doneB = Math.min(t, job.bDays) / b;
    const earnedA = wage * doneA;
    const earnedB = wage * doneB;
    rects.unshift({ x: 0, y: 0.7, w: SCALE, h: 1, tone: 'data', dashed: true, faint: true });
    rects.push(
      { x: 0, y: 2.6, w: SCALE * doneA, h: 1, tone: 'arithmetic', label: doneA > 0 ? rupees(earnedA) : '' },
      { x: SCALE * doneA, y: 2.6, w: SCALE * doneB, h: 1, tone: 'combinatorics', label: doneB > 0 ? rupees(earnedB) : '' },
      { x: 0, y: 4.5, w: (SCALE * byDaysA) / wage, h: 1, tone: 'arithmetic', dashed: true, faint: true, label: rupees(byDaysA) },
      { x: (SCALE * byDaysA) / wage, y: 4.5, w: (SCALE * byDaysB) / wage, h: 1, tone: 'combinatorics', dashed: true, faint: true, label: rupees(byDaysB) }
    );
    const notes = [
      { x: 0, y: 0.5, text: `The job: ${percentText(doneA + doneB, 0)} done after ${show(t, 2)} of ${show(job.days, 2)} days`, anchor: 'start' },
      { x: 0, y: 2.4, text: `Wages so far, by work done (of ${rupees(wage)})`, anchor: 'start' },
      { x: 0, y: 4.3, text: 'Wrong: shared by days worked', anchor: 'start' }
    ];

    let insight;
    if (leftEarly) insight = `B leaves after ${k} days, having done ${k} × 1/${b} = ${percentText(job.workB)} of the job. A works all ${show(job.days, 2)} days. B gets ${percentText(job.workB)} of ${rupees(wage)} = ${rupees(payB)}.`;
    else if (a === b) insight = 'Equal speeds and equal days: equal work, equal pay.';
    else
      insight = `Both work all ${show(job.days, 2)} days, yet ${a < b ? 'A' : 'B'} does more: a day's work is 1/${a} for A and 1/${b} for B. So the pay splits ${ratioText(job.workA, job.workB)}, the ratio 1/${a} : 1/${b}, not 50 : 50 by days.`;
    if (early && !leftEarly) insight = `The job is done in ${show(job.together, 2)} days, before B would leave, so B stays to the end. ${insight}`;

    return {
      numbers: { days: job.days, workA: job.workA, workB: job.workB, payA, payB, byDaysA, byDaysB, leftEarly },
      readouts: [
        { label: 'Days to finish', value: `${show(job.days, 2)} days` },
        { label: 'Work done A : B', value: `${percentText(job.workA)} : ${percentText(job.workB)} (${ratioText(job.workA, job.workB)})` },
        { label: 'Wages by work done', value: `A ${rupees(payA)} · B ${rupees(payB)}` },
        { label: 'Days worked A : B', value: `${show(job.aDays, 2)} : ${show(job.bDays, 2)}` },
        { label: 'Wrong: split by days worked', value: `A ${rupees(byDaysA)} · B ${rupees(byDaysB)}` }
      ],
      plot: {
        kind: 'rects',
        width: SCALE,
        height: 5.7,
        rects,
        notes,
        legend: [
          { label: `A (1/${a} of the job a day)`, tone: 'arithmetic' },
          { label: `B (1/${b} a day)`, tone: 'combinatorics' }
        ],
        summary: `A and B finish in ${show(job.days, 2)} days. A does ${percentText(job.workA)} and earns ${rupees(payA)}; B does ${percentText(job.workB)} and earns ${rupees(payB)}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'equal',
      prompt: 'Make A and B earn the same.',
      check: (values, n) => near(n.payA, n.payB, 1e-6),
      solution: { a: 12, b: 12, leave: 'stay' }
    },
    {
      id: 'double',
      prompt: 'Both stay to the end: make A earn exactly twice what B earns.',
      check: (values, n) => values.leave === 'stay' && near(n.payA, 2 * n.payB, 1e-6),
      solution: { a: 10, b: 20, leave: 'stay' }
    },
    {
      id: 'leave',
      prompt: 'B leaves after 3 days of a ₹3,000 job (A 10 days, B 15 days alone). What is B\'s share now?',
      check: (values, n) => values.a === 10 && values.b === 15 && values.wage === 3000 && n.leftEarly && values.k === 3,
      solution: { a: 10, b: 15, leave: 'early', k: 3, wage: 3000 }
    }
  ]
};

/* --------------------------- quadratic comparison --------------------------- */

/** How the signs of b and c fix the signs of the roots of v² + bv + c = 0. */
export function rootSigns(b, c) {
  if (c === 0) return 'one root is 0 (c = 0)';
  if (c < 0) return 'one positive, one negative (c < 0)';
  if (b < 0) return 'both positive (c > 0, b < 0)';
  if (b > 0) return 'both negative (c > 0, b > 0)';
  return 'none real (b = 0, c > 0)';
}

const equation = (b, c, v) => {
  const mid = b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}${v}`;
  const end = c === 0 ? '' : ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}`;
  return `${v}²${mid}${end} = 0`;
};
const rootsText = (roots) => (roots.length ? roots.map(rootText).join(', ') : 'no real roots');

export const quadraticCompare = {
  id: 'compare-roots',
  topicId: 'quadratic-comparison',
  title: 'Compare x and y on two number lines',
  summary: 'Set the coefficients of two quadratics and see their roots on two number lines. The answer badge follows: x > y, x < y, x ≥ y, x ≤ y, or no relation when the roots interleave.',
  controls: [
    { id: 'bx', label: 'I. x² + bx + c: b', type: 'range', min: -10, max: 10, step: 1, default: -7 },
    { id: 'cx', label: 'I. x² + bx + c: c', type: 'range', min: -20, max: 20, step: 1, default: 12 },
    { id: 'by', label: 'II. y² + by + c: b', type: 'range', min: -10, max: 10, step: 1, default: 9 },
    { id: 'cy', label: 'II. y² + by + c: c', type: 'range', min: -20, max: 20, step: 1, default: 20 }
  ],
  compute({ bx, cx, by, cy }) {
    const xs = rootsOf(1, bx, cx);
    const ys = rootsOf(1, by, cy);
    const both = xs.length > 0 && ys.length > 0;
    const answer = both ? verdict(xs, ys) : null;
    const equal = answer === QC_OPTIONS[4] && xs.length === 1 && ys.length === 1 && near(xs[0], ys[0]);
    const badge = !both ? 'No real roots' : answer === QC_OPTIONS[4] ? (equal ? 'x = y' : 'Cannot be established') : answer;
    const span = (roots) => (roots.length > 1 ? [{ from: roots[0], to: roots[roots.length - 1] }] : []);
    const shared = xs.filter((x) => ys.some((y) => near(x, y)));

    let insight;
    if (!xs.length || !ys.length) insight = `${!xs.length ? equation(bx, cx, 'x') : equation(by, cy, 'y')} has no real roots: b² − 4c is negative. Choose other coefficients.`;
    else if (answer === QC_OPTIONS[0]) insight = 'Every root of x lies to the right of every root of y, so x > y whichever pair you take.';
    else if (answer === QC_OPTIONS[1]) insight = 'Every root of x lies to the left of every root of y, so x < y whichever pair you take.';
    else if (answer === QC_OPTIONS[2]) insight = `They share ${rootText(shared[0])}; every other pair has x above y. So x ≥ y: "equal" is possible, "less" never.`;
    else if (answer === QC_OPTIONS[3]) insight = `They share ${rootText(shared[0])}; every other pair has x below y. So x ≤ y: "equal" is possible, "greater" never.`;
    else if (equal) insight = 'Each has one repeated root, the same number: x = y.';
    else insight = 'The roots interleave: one pair has x above y and another has x below. No single relation holds, so the answer is "cannot be established".';

    const point = (value, tone) => ({ value, label: rootText(value), shape: 'dot', tone });
    return {
      numbers: { xs, ys, answer, badge },
      readouts: [
        { label: 'I', value: `${equation(bx, cx, 'x')} → x = ${rootsText(xs)}` },
        { label: 'II', value: `${equation(by, cy, 'y')} → y = ${rootsText(ys)}` },
        { label: 'Signs of the x roots', value: rootSigns(bx, cx) },
        { label: 'Signs of the y roots', value: rootSigns(by, cy) },
        { label: 'Answer', value: !both ? '—' : answer }
      ],
      plot: {
        kind: 'numberlines',
        min: -12,
        max: 12,
        step: 1,
        labelStep: 2,
        badge,
        guides: [{ value: 0 }],
        rows: [
          { label: 'x', tone: 'arithmetic', bands: span(xs).map((s) => ({ ...s, tone: 'arithmetic' })), points: xs.map((v) => point(v, 'arithmetic')), empty: xs.length ? null : 'no real roots' },
          { label: 'y', tone: 'combinatorics', bands: span(ys).map((s) => ({ ...s, tone: 'combinatorics' })), points: ys.map((v) => point(v, 'combinatorics')), empty: ys.length ? null : 'no real roots' }
        ],
        summary: `x = ${rootsText(xs)}; y = ${rootsText(ys)}. ${badge}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'less',
      prompt: 'Change the coefficients so that x < y.',
      check: (values, n) => n.answer === QC_OPTIONS[1],
      solution: { bx: 7, cx: 12, by: -9, cy: 20 }
    },
    {
      id: 'shared',
      prompt: 'Keep x = 3 or 4 and give y one root that is also 3, so the answer is x ≥ y.',
      check: (values, n) => n.answer === QC_OPTIONS[2],
      solution: { bx: -7, cx: 12, by: -1, cy: -6 }
    },
    {
      id: 'overlap',
      prompt: 'Make the roots interleave so that no relation can be established.',
      check: (values, n) => n.badge === 'Cannot be established',
      solution: { bx: -7, cx: 12, by: -7, cy: 10 }
    }
  ]
};

export const moreTopicSims = [simplificationStack, approximationBand, countingTree, setTheoryDots, caseletTable, radarOrBars, raceTrack, workWages, quadraticCompare];
