/**
 * Mathematical-operations templates: symbol substitution (real signs or
 * letters standing for other signs), a missing number after substitution,
 * which coded equation is correct, interchanging two signs or two numbers,
 * filling in three different signs, and defined operations (a ★ b = 2a + b),
 * single, nested and two at once.
 *
 * Every expression is chosen so that the standard order (× ÷ together, then
 * + − together, left to right) and a literal "÷, ×, +, −" reading give the same
 * value, with every division whole (utils/reasoning/operations.js).
 *
 * `answer` works on the token list, one operation at a time (collapseSteps);
 * `verify` reads the printed text with an independently written parser, under
 * both conventions, and for every "which one" question tries every candidate
 * (every sign pair, number pair, sign sequence, or whole number up to 1000),
 * so a second right option can never be printed. Defined operations are
 * checked against the rule written as a plain function.
 */

import {
  OPS,
  SIGN_PAIRS,
  cleanByParser,
  cleanValue,
  collapseSteps,
  decode,
  evaluate,
  evaluateDefined,
  exprText,
  fillSigns,
  interchangeNumbers,
  interchangeSigns,
  interleave,
  mightHold,
  numberSwapsThatWork,
  pairText,
  parseValue,
  signSwapsThatWork,
  solveUnknown
} from '../../utils/reasoning/operations.js';

const TOPIC = 'mathematical-operations';

/* ------------------------------ shared pieces ------------------------------ */

/** A key in which every sign stands for a different one: { printed: real }. */
export function derangedKey(rng) {
  let perm;
  do perm = rng.shuffle(OPS);
  while (perm.some((s, i) => s === OPS[i]));
  return Object.fromEntries(OPS.map((s, i) => [s, perm[i]]));
}

const LETTER_SETS = [
  ['P', 'Q', 'R', 'S'],
  ['A', 'B', 'C', 'D'],
  ['@', '#', '$', '%'],
  ['L', 'M', 'N', 'O']
];

/** Letters (or symbols) standing for the four signs: { letter: real }. */
function letterKey(rng) {
  const letters = rng.pick(LETTER_SETS);
  const reals = rng.shuffle(OPS);
  return Object.fromEntries(letters.map((l, i) => [l, reals[i]]));
}

const invert = (key) => Object.fromEntries(Object.entries(key).map(([k, v]) => [v, k]));
export const keyLine = (key) =>
  Object.entries(key)
    .map(([from, to]) => `‘${from}’ means ‘${to}’`)
    .join(', ');

/** Numbers for these real signs, with the number before each ÷ a multiple of the one after it. */
function numbersFor(rng, signs, lo = 2, hi = 15) {
  const nums = Array.from({ length: signs.length + 1 }, () => rng.int(lo, hi));
  signs.forEach((s, i) => {
    if (s === '÷') {
      nums[i + 1] = rng.int(2, 9);
      nums[i] = nums[i + 1] * rng.int(2, 9);
    }
  });
  return nums;
}

/**
 * k different signs in random order, except that + comes before −: with −
 * first, the standard order and a literal "+ before −" reading disagree
 * (9 − 4 + 2 is 7 or 3), so such an expression is never printed.
 */
function orderedSigns(rng, k = 4) {
  const signs = rng.shuffle(OPS).slice(0, k);
  const plus = signs.indexOf('+');
  const minus = signs.indexOf('−');
  if (plus >= 0 && minus >= 0 && minus < plus) [signs[plus], signs[minus]] = ['−', '+'];
  return signs;
}

/** A real expression with these signs whose value is clean (both conventions, whole divisions), 0..999; a few tries. */
function cleanExpression(rng, signs, lo, hi) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const tokens = interleave(numbersFor(rng, signs, lo, hi), signs);
    const value = cleanValue(tokens);
    if (value !== null && value >= 0 && value <= 999) return { tokens, value };
  }
  return null;
}

const workingLines = (tokens) => (collapseSteps(tokens, 'standard') || []).map((l) => exprText(l.tokens));
const isWhole = (v) => v !== null && Number.isInteger(v) && v >= 0;

/** Parser reading in both conventions: true only if both give rhs. */
const parserHolds = (tokens, rhs) => cleanByParser(exprText(tokens)) === rhs;
/** Parser reading in either convention gives rhs. */
const parserMight = (tokens, rhs) => ['standard', 'dmas'].some((c) => parseValue(exprText(tokens), c) === rhs);

/** Wrong values a learner might reach from the real expression, each named. */
function slipValues(real) {
  const misreads = [];
  real.forEach((t, i) => {
    if (!OPS.includes(t)) return;
    for (const other of OPS) if (other !== t) misreads.push({ value: cleanValue(real.map((u, j) => (j === i ? other : u))), why: `read one ${t} as ${other}` });
  });
  return [
    { value: evaluate(real, 'left'), why: 'worked straight left to right' },
    ...SIGN_PAIRS.map((pair) => ({ value: cleanValue(interchangeSigns(real, ...pair)), why: `mixed up ${pairText(pair)} in the key` })),
    ...misreads
  ].filter((d) => isWhole(d.value));
}

/* ------------------------------ defined operations ------------------------------ */

/** Rules for a defined operation: tokens (worked by BODMAS) and the same rule as a plain function. */
const RULES = {
  'pa+qb': { make: (p, q) => ({ text: `${p}a + ${q}b`, tokens: [p, '×', 'a', '+', q, '×', 'b'], fn: (a, b) => p * a + q * b }) },
  'pa-qb': { make: (p, q) => ({ text: `${p}a − ${q}b`, tokens: [p, '×', 'a', '−', q, '×', 'b'], fn: (a, b) => p * a - q * b }) },
  'ab-a': { make: () => ({ text: 'ab − a', tokens: ['a', '×', 'b', '−', 'a'], fn: (a, b) => a * b - a }) },
  'a+b+ab': { make: () => ({ text: 'a + b + ab', tokens: ['a', '+', 'b', '+', 'a', '×', 'b'], fn: (a, b) => a + b + a * b }) },
  'a2-b': { make: () => ({ text: 'a² − b', tokens: ['a', '×', 'a', '−', 'b'], fn: (a, b) => a ** 2 - b }) },
  'a2+b2': { make: () => ({ text: 'a² + b²', tokens: ['a', '×', 'a', '+', 'b', '×', 'b'], fn: (a, b) => a ** 2 + b ** 2 }) },
  'half-sum': { make: () => ({ text: '(a + b) ÷ 2', tokens: ['(', 'a', '+', 'b', ')', '÷', 2], fn: (a, b) => ((a + b) % 2 === 0 ? (a + b) / 2 : null) }) },
  'ab+q': { make: (p, q) => ({ text: `ab + ${q}`, tokens: ['a', '×', 'b', '+', q], fn: (a, b) => a * b + q }) }
};
const ruleOf = ({ family, p, q }) => RULES[family].make(p, q);
const SYMBOLS = ['★', '◆', '#', '@', '⊕'];

function pickRule(rng, families = Object.keys(RULES)) {
  return { family: rng.pick(families), p: rng.int(2, 4), q: rng.int(1, 3) };
}

/* ------------------------------ templates ------------------------------ */

export const operationsTemplates = [
  {
    id: 'mo-gen-substitute',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-substitute',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['mo-substitute-f', 'mo-bodmas-f'],
    estimatedSeconds: 60,
    params(rng) {
      const key = derangedKey(rng);
      const back = invert(key);
      const made = cleanExpression(rng, orderedSigns(rng), 2, 15);
      if (!made) return null;
      return { key, printed: made.tokens.map((t) => (typeof t === 'string' ? back[t] : t)) };
    },
    answer: ({ key, printed }) => cleanValue(decode(printed, key)),
    verify: ({ key, printed }, value) => {
      // Rewrite the printed text character by character from the key, then parse it.
      const text = [...exprText(printed)].map((ch) => key[ch] || ch).join('');
      return cleanByParser(text) === value;
    },
    render({ key, printed }) {
      const real = decode(printed, key);
      const lines = workingLines(real);
      return {
        question: `If ${keyLine(key)}, what is the value of ${exprText(printed)}?`,
        explanation: `Rewrite every sign from the key at once: ${exprText(printed)} becomes ${exprText(real)}. Then BODMAS: ${lines.join(' = ')}.`,
        solutionSteps: [`Real signs: ${exprText(real)}.`, `× and ÷ first, left to right; then + and −: ${lines.slice(1).join(' → ')}.`],
        method: 'Write the real sign under each printed sign, rewrite the whole expression, then apply BODMAS.',
        hints: ['Make a small table: printed sign → real sign. Rewrite all the signs before calculating.', `The real expression is ${exprText(real)}. Now do × and ÷ before + and −.`],
        commonMistakes: ['Calculating with the printed signs instead of the real ones.', 'Replacing one sign at a time through the line, so a sign already rewritten is rewritten again.', 'Working left to right instead of × and ÷ first.']
      };
    }
  },
  {
    id: 'mo-gen-letters',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-substitute',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['mo-substitute-f', 'mo-bodmas-f'],
    estimatedSeconds: 60,
    params(rng) {
      const key = letterKey(rng);
      const back = invert(key);
      const made = cleanExpression(rng, orderedSigns(rng), 2, 15);
      if (!made) return null;
      return { key, printed: made.tokens.map((t) => (typeof t === 'string' ? back[t] : t)) };
    },
    answer: ({ key, printed }) => cleanValue(decode(printed, key)),
    distractors: ({ key, printed }) => slipValues(decode(printed, key)),
    verify: ({ key, printed }, value) => cleanByParser(exprText(printed.map((t) => (typeof t === 'string' ? key[t] : t)))) === value,
    render({ key, printed }) {
      const real = decode(printed, key);
      const lines = workingLines(real);
      return {
        question: `If ${keyLine(key)}, then ${exprText(printed)} = ?`,
        explanation: `With the key, ${exprText(printed)} is ${exprText(real)}. By BODMAS: ${lines.join(' = ')}.`,
        solutionSteps: [`Replace each letter: ${exprText(real)}.`, `Work × and ÷ first, then + and −: ${lines.slice(1).join(' → ')}.`],
        method: 'Decode every letter, then BODMAS.',
        hints: ['Write the real sign under every letter before you calculate anything.', `It reads ${exprText(real)}. Which operations come first?`],
        commonMistakes: ['Working straight left to right.', 'Mixing up two letters of the key.']
      };
    }
  },
  {
    id: 'mo-gen-unknown',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-substitute',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['mo-substitute-f', 'mo-bodmas-f'],
    estimatedSeconds: 90,
    params(rng) {
      const key = rng.chance(0.5) ? derangedKey(rng) : letterKey(rng);
      const back = invert(key);
      const made = cleanExpression(rng, orderedSigns(rng, 3), 2, 15);
      if (!made) return null;
      // Hide a number that is not a divisor (dividing by the unknown makes it a guessing game).
      const slots = made.tokens.map((t, i) => i).filter((i) => typeof made.tokens[i] === 'number' && made.tokens[i - 1] !== '÷');
      const at = rng.pick(slots);
      const x = made.tokens[at];
      const withGap = made.tokens.map((t, i) => (i === at ? '?' : t));
      if (solveUnknown(withGap, made.value, 0, 1000).join() !== String(x)) return null;
      return { key, printed: withGap.map((t) => (typeof t === 'string' && t !== '?' ? back[t] : t)), rhs: made.value, x };
    },
    answer: ({ x }) => x,
    verify: ({ key, printed, rhs }, value) => {
      const real = decode(printed, key);
      const fits = [];
      for (let n = 0; n <= 1000; n++) if (parserMight(real.map((t) => (t === '?' ? n : t)), rhs)) fits.push(n);
      return fits.length === 1 && fits[0] === value;
    },
    render({ key, printed, rhs, x }) {
      const real = decode(printed, key);
      const filled = real.map((t) => (t === '?' ? x : t));
      return {
        question: `If ${keyLine(key)}, find the number in place of ? in: ${exprText(printed)} = ${rhs}`,
        explanation: `Decoded, the equation is ${exprText(real)} = ${rhs}. Working back, ? = ${x}. Check: ${workingLines(filled).join(' = ')}.`,
        solutionSteps: [`Real signs: ${exprText(real)} = ${rhs}.`, 'Do the parts without ? first, then undo the operations around ?.', `? = ${x}. Check: ${workingLines(filled).join(' = ')}.`],
        method: 'Decode, simplify what you can, then undo the operations on ? one at a time.',
        hints: ['Rewrite the equation with the real signs first.', 'Treat ? like x: simplify the known parts, then solve.'],
        commonMistakes: ['Solving with the printed signs.', 'Undoing the operations in the wrong order (BODMAS still decides what belongs to ?).']
      };
    }
  },
  {
    id: 'mo-gen-which-true',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-equation',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['mo-equation-f', 'mo-sc-unit'],
    formatValue: (v) => v,
    estimatedSeconds: 100,
    params(rng) {
      const key = rng.chance(0.5) ? derangedKey(rng) : letterKey(rng);
      const back = invert(key);
      const options = [];
      for (let k = 0; k < 4; k++) {
        const made = cleanExpression(rng, orderedSigns(rng, 3), 2, 12);
        if (!made) return null;
        let rhs = made.value;
        let why = null;
        if (k > 0) {
          const slips = slipValues(made.tokens).filter((d) => d.value !== made.value);
          const slip = slips.length ? rng.pick(slips) : { value: made.value + rng.pick([2, 3, 4, 6]), why: 'made an arithmetic slip' };
          rhs = slip.value;
          why = `true only if you ${slip.why}`;
          if (mightHold(made.tokens, rhs)) return null;
        }
        const printed = made.tokens.map((t) => (typeof t === 'string' ? back[t] : t));
        options.push({ text: `${exprText(printed)} = ${rhs}`, printed, rhs, why });
      }
      if (new Set(options.map((o) => o.text)).size !== 4) return null;
      return { key, options };
    },
    answer: ({ options }) => options[0].text,
    distractors: ({ options }) => options.slice(1).map((o) => ({ value: o.text, why: o.why })),
    verify: ({ key, options }, value) => {
      const right = options.filter((o) => parserHolds(decode(o.printed, key), o.rhs));
      const maybe = options.filter((o) => parserMight(decode(o.printed, key), o.rhs));
      return right.length === 1 && maybe.length === 1 && right[0].text === value;
    },
    render({ key, options }) {
      const lines = options.map((o) => {
        const real = decode(o.printed, key);
        const v = cleanValue(real);
        return `${o.text}: ${exprText(real)} = ${v}${v === o.rhs ? ', true.' : `, not ${o.rhs}.`}`;
      });
      return {
        question: `If ${keyLine(key)}, which of the following equations is correct?`,
        explanation: `Decode each option and work it out with BODMAS. Only ${options[0].text} comes out true.`,
        solutionSteps: lines,
        method: 'Decode every option and evaluate the left side; keep the one equal to its right side.',
        hints: ['Write the key as a table and rewrite each option with real signs.', 'A quick check of the last digit, or of odd and even, often rules an option out before the full calculation.'],
        commonMistakes: ['Testing the options with the printed signs.', 'Working left to right, which makes a wrong option look true.']
      };
    }
  },
  {
    id: 'mo-gen-swap-signs',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-interchange',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['mo-interchange-f', 'mo-sc-gap'],
    formatValue: (v) => v,
    estimatedSeconds: 100,
    params(rng) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const made = cleanExpression(rng, orderedSigns(rng, rng.pick([3, 4])), 2, 12);
        if (!made) continue;
        const pair = rng.pick(SIGN_PAIRS);
        if (!pair.some((s) => made.tokens.includes(s))) continue;
        const printed = interchangeSigns(made.tokens, ...pair);
        // The printed line must read the same both ways too (and divide exactly), only to the wrong value.
        const now = cleanValue(printed);
        if (now === null || now < 0 || mightHold(printed, made.value)) continue;
        const works = signSwapsThatWork(printed, made.value);
        if (works.length !== 1 || pairText(works[0]) !== pairText(pair)) continue;
        return { printed, rhs: made.value, pair };
      }
      return null;
    },
    answer: ({ pair }) => pairText(pair),
    distractors: ({ printed, rhs, pair }) =>
      SIGN_PAIRS.filter((p) => pairText(p) !== pairText(pair)).map((p) => {
        const v = cleanValue(interchangeSigns(printed, ...p));
        return { value: pairText(p), why: v === null ? 'a division would not come out whole' : `gives ${v}, not ${rhs}` };
      }),
    verify: ({ printed, rhs }, value) => {
      const works = SIGN_PAIRS.filter((p) => parserMight(interchangeSigns(printed, ...p), rhs));
      return works.length === 1 && pairText(works[0]) === value && parserHolds(interchangeSigns(printed, ...works[0]), rhs);
    },
    render({ printed, rhs, pair }) {
      const fixed = interchangeSigns(printed, ...pair);
      const tries = SIGN_PAIRS.filter((p) => pairText(p) !== pairText(pair)).map((p) => {
        const v = cleanValue(interchangeSigns(printed, ...p));
        return `${pairText(p)}: ${v === null ? 'a division is not whole' : v}`;
      });
      const now = cleanValue(printed);
      return {
        question: `Which two signs should be interchanged to make this equation correct?\n${exprText(printed)} = ${rhs}`,
        explanation: `Interchanging ${pairText(pair)} gives ${exprText(fixed)}: ${workingLines(fixed).join(' = ')}. Every other pair gives something else (${tries.join('; ')}).`,
        solutionSteps: [`As printed, the left side is ${now === null ? 'not even a whole number' : now}, not ${rhs}.`, `Interchange ${pairText(pair)}: ${exprText(fixed)}.`, `${workingLines(fixed).join(' = ')}. Correct.`],
        method: 'Interchange each candidate pair everywhere it appears, and evaluate with BODMAS until one gives the right side.',
        hints: ['Interchanging two signs changes both of them, wherever they appear.', 'Compare the left side with the right side: do you need it much bigger, or smaller? That suggests which pair to try first.'],
        commonMistakes: ['Changing only one of the two signs.', 'Evaluating left to right after the interchange.']
      };
    }
  },
  {
    id: 'mo-gen-swap-numbers',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-interchange',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['mo-interchange-f', 'mo-sc-gap'],
    formatValue: (v) => v,
    estimatedSeconds: 120,
    params(rng) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const made = cleanExpression(rng, orderedSigns(rng), 2, 12);
        if (!made) continue;
        const nums = made.tokens.filter((t) => typeof t === 'number');
        if (new Set(nums).size !== nums.length) continue;
        const [x, y] = rng
          .shuffle(nums)
          .slice(0, 2)
          .sort((a, b) => a - b);
        const printed = interchangeNumbers(made.tokens, x, y);
        // The printed line must read the same both ways too (and divide exactly), only to the wrong value.
        const now = cleanValue(printed);
        if (now === null || now < 0 || mightHold(printed, made.value)) continue;
        if (numberSwapsThatWork(printed, made.value).length !== 1) continue;
        return { printed, rhs: made.value, pair: [x, y] };
      }
      return null;
    },
    answer: ({ pair }) => `${pair[0]} and ${pair[1]}`,
    distractors: ({ printed, rhs, pair }) => {
      const nums = printed.filter((t) => typeof t === 'number');
      const out = [];
      for (let i = 0; i < nums.length; i++)
        for (let j = i + 1; j < nums.length; j++) {
          const [a, b] = [nums[i], nums[j]].sort((m, n) => m - n);
          if (a === pair[0] && b === pair[1]) continue;
          const v = cleanValue(interchangeNumbers(printed, a, b));
          // Neighbouring numbers first: the pairs a learner tries first.
          out.push({ value: `${a} and ${b}`, why: v === null ? 'a division would not come out whole' : `gives ${v}, not ${rhs}`, near: j - i });
        }
      return out.sort((p, q) => p.near - q.near);
    },
    verify: ({ printed, rhs }, value) => {
      const nums = printed.filter((t) => typeof t === 'number');
      const works = [];
      for (let i = 0; i < nums.length; i++)
        for (let j = i + 1; j < nums.length; j++) {
          const swapped = printed.map((t) => (t === nums[i] ? nums[j] : t === nums[j] ? nums[i] : t));
          if (parserMight(swapped, rhs)) works.push([nums[i], nums[j]].sort((a, b) => a - b).join(' and '));
        }
      return works.length === 1 && works[0] === value;
    },
    render({ printed, rhs, pair }) {
      const fixed = interchangeNumbers(printed, ...pair);
      const now = cleanValue(printed);
      return {
        question: `Which two numbers should be interchanged to make this equation correct?\n${exprText(printed)} = ${rhs}`,
        explanation: `Interchanging ${pair[0]} and ${pair[1]} gives ${exprText(fixed)}: ${workingLines(fixed).join(' = ')}. No other pair gives ${rhs}.`,
        solutionSteps: [`As printed, the left side is ${now === null ? 'not even a whole number' : now}, not ${rhs}.`, `Interchange ${pair[0]} and ${pair[1]}: ${exprText(fixed)}.`, `${workingLines(fixed).join(' = ')}. Correct.`],
        method: 'Try each option: interchange the two numbers, evaluate with BODMAS, and keep the pair that gives the right side.',
        hints: ['The signs stay where they are; only the two numbers change places.', 'A number next to ÷ must divide exactly after the interchange: that rules out some pairs at once.'],
        commonMistakes: ['Interchanging the signs next to the numbers as well.', 'Evaluating left to right after the interchange.']
      };
    }
  },
  {
    id: 'mo-gen-fill',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-fill',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['mo-fill-f', 'mo-sc-unit'],
    formatValue: (v) => v,
    estimatedSeconds: 100,
    params(rng) {
      const signs = orderedSigns(rng, 3);
      const made = cleanExpression(rng, signs, 2, 12);
      if (!made) return null;
      const numbers = made.tokens.filter((t) => typeof t === 'number');
      if (fillSigns(numbers, made.value, { distinct: true }).length !== 1) return null;
      return { numbers, signs, rhs: made.value };
    },
    answer: ({ signs }) => signs.join(', '),
    distractors: ({ numbers, signs }) => {
      const out = [];
      // Two of the right signs in the wrong places, then one wrong sign.
      for (const [i, j] of [
        [0, 1],
        [1, 2],
        [0, 2]
      ]) {
        const s = signs.slice();
        [s[i], s[j]] = [s[j], s[i]];
        const v = cleanValue(interleave(numbers, s));
        out.push({ value: s.join(', '), why: v === null ? 'a division would not be whole' : `gives ${v}` });
      }
      const missing = OPS.find((s) => !signs.includes(s));
      for (let k = 0; k < 3; k++) {
        const s = signs.slice();
        s[k] = missing;
        out.push({ value: s.join(', '), why: 'uses the wrong sign' });
      }
      return out;
    },
    verify: ({ numbers, rhs }, value) => {
      const works = [];
      for (const a of OPS)
        for (const b of OPS)
          for (const c of OPS) {
            if (a === b || b === c || a === c) continue;
            if (parserMight(interleave(numbers, [a, b, c]), rhs)) works.push([a, b, c].join(', '));
          }
      return works.length === 1 && works[0] === value;
    },
    render({ numbers, signs, rhs }) {
      const blank = numbers.map(String).join(' * ');
      const real = interleave(numbers, signs);
      return {
        question: `Which three different signs, in order, should replace the * signs to make the equation correct?\n${blank} = ${rhs}`,
        explanation: `With ${signs.join(', ')}: ${workingLines(real).join(' = ')}. No other order of three different signs gives ${rhs}.`,
        solutionSteps: ['Put each option into the blanks.', `${exprText(real)}: BODMAS gives ${cleanValue(real)}.`, `That equals ${rhs}, so the signs are ${signs.join(', ')}.`],
        method: 'Substitute each option and evaluate with BODMAS; size and last digit rule most options out quickly.',
        hints: ['Try each option in turn, remembering × and ÷ come before + and −.', `The right side is ${rhs}. Is that bigger or smaller than the numbers themselves? That says whether × must be in it.`],
        commonMistakes: ['Working each option left to right.', 'Stopping at an option that is nearly right.']
      };
    }
  },
  {
    id: 'mo-gen-defined',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-defined',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['mo-defined-f'],
    estimatedSeconds: 45,
    params(rng) {
      const rule = pickRule(rng);
      const a = rng.int(2, 12);
      const b = rng.int(2, 12);
      if (a === b) return null;
      const value = evaluateDefined([a, '★', b], { '★': ruleOf(rule).tokens });
      if (!isWhole(value)) return null;
      return { rule, a, b, symbol: rng.pick(SYMBOLS) };
    },
    answer: ({ rule, a, b }) => evaluateDefined([a, '★', b], { '★': ruleOf(rule).tokens }),
    verify: ({ rule, a, b }, value) => ruleOf(rule).fn(a, b) === value,
    render({ rule, a, b, symbol }) {
      const r = ruleOf(rule);
      const v = r.fn(a, b);
      return {
        question: `If a ${symbol} b = ${r.text}, find ${a} ${symbol} ${b}.`,
        explanation: `Put a = ${a} and b = ${b} into ${r.text}: the value is ${v}.`,
        solutionSteps: [`a = ${a} (the number before ${symbol}), b = ${b} (the number after).`, `${r.text} with these values = ${v}.`],
        method: 'Replace a with the first number and b with the second, then apply BODMAS.',
        hints: [`Which number is a and which is b in ${a} ${symbol} ${b}?`, `Substitute into ${r.text}; ${/ab|\d[ab]/.test(r.text) ? '2a means 2 × a, and ab means a × b.' : 'do the bracket or the power first.'}`],
        commonMistakes: ['Swapping a and b (the rule is usually not symmetric).', 'Reading 2a as 2 + a instead of 2 × a.']
      };
    }
  },
  {
    id: 'mo-gen-defined-nested',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-defined',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['mo-defined-f'],
    estimatedSeconds: 80,
    params(rng) {
      const rule = pickRule(rng, ['pa+qb', 'pa-qb', 'ab-a', 'a+b+ab', 'half-sum', 'ab+q']);
      const [a, b, c] = [rng.int(1, 9), rng.int(1, 9), rng.int(1, 9)];
      const innerFirst = rng.chance(0.5);
      const tokens = innerFirst ? ['(', a, '★', b, ')', '★', c] : [a, '★', '(', b, '★', c, ')'];
      const value = evaluateDefined(tokens, { '★': ruleOf(rule).tokens });
      if (!isWhole(value) || value > 2000) return null;
      return { rule, a, b, c, innerFirst, symbol: rng.pick(SYMBOLS) };
    },
    answer: ({ rule, a, b, c, innerFirst }) => evaluateDefined(innerFirst ? ['(', a, '★', b, ')', '★', c] : [a, '★', '(', b, '★', c, ')'], { '★': ruleOf(rule).tokens }),
    verify: ({ rule, a, b, c, innerFirst }, value) => {
      const f = ruleOf(rule).fn;
      const inner = innerFirst ? f(a, b) : f(b, c);
      if (inner === null) return false;
      return (innerFirst ? f(inner, c) : f(a, inner)) === value;
    },
    render({ rule, a, b, c, innerFirst, symbol }) {
      const r = ruleOf(rule);
      const inner = innerFirst ? r.fn(a, b) : r.fn(b, c);
      const outer = innerFirst ? r.fn(inner, c) : r.fn(a, inner);
      const shown = innerFirst ? `(${a} ${symbol} ${b}) ${symbol} ${c}` : `${a} ${symbol} (${b} ${symbol} ${c})`;
      const innerText = innerFirst ? `${a} ${symbol} ${b}` : `${b} ${symbol} ${c}`;
      const outerText = innerFirst ? `${inner} ${symbol} ${c}` : `${a} ${symbol} ${inner}`;
      return {
        question: `If a ${symbol} b = ${r.text}, find the value of ${shown}.`,
        explanation: `Bracket first: ${innerText} = ${inner}. Then ${outerText} = ${outer}.`,
        solutionSteps: [`${innerText} = ${inner}.`, `${outerText} = ${outer}.`],
        method: 'Work the bracket first, then use its value as a or b in the outer operation.',
        hints: ['Start inside the bracket.', `The bracket gives ${inner}. Where does it go in the outer operation: as a or as b?`],
        commonMistakes: ['Working the outer operation first.', 'Putting the bracket’s value in the wrong place (as a instead of b).']
      };
    }
  },
  {
    id: 'mo-gen-defined-two',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mo-defined',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['mo-defined-f'],
    estimatedSeconds: 110,
    params(rng) {
      const r1 = pickRule(rng, ['pa+qb', 'pa-qb', 'ab-a', 'a+b+ab', 'ab+q']);
      const r2 = pickRule(rng, ['pa+qb', 'pa-qb', 'a2-b', 'half-sum', 'ab+q']);
      if (r1.family === r2.family) return null;
      const [s1, s2] = rng.shuffle(SYMBOLS).slice(0, 2);
      const [a, b, c] = [rng.int(1, 8), rng.int(1, 8), rng.int(1, 8)];
      const innerFirst = rng.chance(0.5);
      const tokens = innerFirst ? ['(', a, s1, b, ')', s2, c] : [a, s2, '(', b, s1, c, ')'];
      const value = evaluateDefined(tokens, { [s1]: ruleOf(r1).tokens, [s2]: ruleOf(r2).tokens });
      if (!isWhole(value) || value > 2000) return null;
      return { r1, r2, s1, s2, a, b, c, innerFirst, tokens };
    },
    answer: ({ r1, r2, s1, s2, tokens }) => evaluateDefined(tokens, { [s1]: ruleOf(r1).tokens, [s2]: ruleOf(r2).tokens }),
    verify: ({ r1, r2, a, b, c, innerFirst }, value) => {
      const [f, g] = [ruleOf(r1).fn, ruleOf(r2).fn];
      const inner = innerFirst ? f(a, b) : f(b, c);
      if (inner === null) return false;
      return (innerFirst ? g(inner, c) : g(a, inner)) === value;
    },
    render({ r1, r2, s1, s2, a, b, c, innerFirst }) {
      const [f, g] = [ruleOf(r1), ruleOf(r2)];
      const inner = innerFirst ? f.fn(a, b) : f.fn(b, c);
      const outer = innerFirst ? g.fn(inner, c) : g.fn(a, inner);
      const shown = innerFirst ? `(${a} ${s1} ${b}) ${s2} ${c}` : `${a} ${s2} (${b} ${s1} ${c})`;
      const innerText = innerFirst ? `${a} ${s1} ${b}` : `${b} ${s1} ${c}`;
      const outerText = innerFirst ? `${inner} ${s2} ${c}` : `${a} ${s2} ${inner}`;
      return {
        question: `If a ${s1} b = ${f.text} and a ${s2} b = ${g.text}, find the value of ${shown}.`,
        explanation: `Bracket first, with the ${s1} rule: ${innerText} = ${inner}. Then the ${s2} rule: ${outerText} = ${outer}.`,
        solutionSteps: [`${innerText}: ${f.text} with a = ${innerFirst ? a : b}, b = ${innerFirst ? b : c} gives ${inner}.`, `${outerText}: ${g.text} with a = ${innerFirst ? inner : a}, b = ${innerFirst ? c : inner} gives ${outer}.`],
        method: 'Bracket first; use each symbol’s own rule; the bracket’s value becomes a or b of the outer rule.',
        hints: [`Inside the bracket the sign is ${s1}: use ${f.text}.`, `The outer sign is ${s2}: use ${g.text}, with the bracket’s value in its place.`],
        commonMistakes: ['Using the same rule for both symbols.', 'Working the outer operation first.']
      };
    }
  }
];
