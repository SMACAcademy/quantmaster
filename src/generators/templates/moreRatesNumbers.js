/** Work, motion, clocks, calendars, conversions and number properties: templates for concepts that had no generator (step 9 of Phase D). */

import { fmt, format, fractionText, gcd, lcm, nearlyEqual, ratioText, reduceFraction, reduceRatio } from '../core.js';

/* -------------------------------- helpers -------------------------------- */

const SUPERSCRIPT = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const FROM_SUPERSCRIPT = Object.fromEntries(Object.entries(SUPERSCRIPT).map(([digit, mark]) => [mark, digit]));
const sup = (n) => String(n).split('').map((digit) => SUPERSCRIPT[digit]).join('');

const NAMES = ['Ravi', 'Meena', 'Arjun', 'Priya', 'Kiran', 'Lata', 'Suresh', 'Anita'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const frac = (n, d) => fractionText(reduceFraction(n, d));
function parseFraction(text) {
  const [n, d = '1'] = String(text).split('/');
  return [Number(n), Number(d)];
}
const parseRatio = (text) => String(text).split(':').map((part) => Number(part.trim()));

const plural = (value, unit) => `${fmt(value)} ${unit}${nearlyEqual(value, 1) ? '' : 's'}`;
const minutes = (value) => plural(value, 'minute');
const seconds = (value) => plural(value, 'second');
const km = (value) => `${fmt(value)} km`;
const metres = (value) => `${fmt(value)} m`;
const cm = (value) => `${fmt(value)} cm`;
const degrees = (value) => `${fmt(value, 1)}°`;
const pad2 = (n) => String(n).padStart(2, '0');
const signed = (n) => (n < 0 ? `−${Math.abs(n)}` : String(n));
const hourWord = (h) => (h === 1 ? 'hour' : 'hours');

function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

function smallestPrimeFactor(n) {
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d;
  return n;
}

/** Sieve of Eratosthenes up to 1000 — the "answer" side of prime questions (verify uses trial division). */
const PRIME_SET = (() => {
  const composite = new Array(1001).fill(false);
  const out = new Set();
  for (let i = 2; i <= 1000; i++) {
    if (composite[i]) continue;
    out.add(i);
    for (let j = i * i; j <= 1000; j += i) composite[j] = true;
  }
  return out;
})();

/** Highest common factor by counting down — an independent check of gcd(). */
function hcfByCounting(...values) {
  for (let g = Math.min(...values); g >= 1; g--) if (values.every((v) => v % g === 0)) return g;
  return 1;
}

/* ------------------------------ work helpers ------------------------------ */

const WORK_DAYS = [6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 28, 30, 32, 35, 36, 40, 45];

/* ------------------------------ clock helpers ------------------------------ */

// One tick = 1/11 minute; one unit = 1/22°. Per tick the minute hand moves 12 units, the hour hand 1.
const FULL_TURN = 360 * 22;

/** Step both hands tick by tick from `startHour` o'clock; returns the ticks at which the minute hand leads by one of `leads` degrees. */
function clockEvents(startHour, ticks, leads, includeStart) {
  const targets = leads.map((d) => d * 22);
  let minuteHand = 0;
  let hourHand = (startHour % 12) * 30 * 22;
  const hits = [];
  for (let t = 0; t < ticks; t++) {
    const lead = (minuteHand - hourHand + FULL_TURN) % FULL_TURN;
    if (targets.includes(lead) && (t > 0 || includeStart)) hits.push(t);
    minuteHand = (minuteHand + 12) % FULL_TURN;
    hourHand = (hourHand + 1) % FULL_TURN;
  }
  return hits;
}

/** "h:MM p/q" for a time `num/den` minutes past h o'clock (null if outside the hour). */
function clockTime(h, num, den) {
  if (num <= 0 || num >= 60 * den) return null;
  const whole = Math.floor(num / den);
  const [rn, rd] = reduceFraction(num - whole * den, den);
  return `${h}:${pad2(whole)}${rn ? ` ${rn}/${rd}` : ''}`;
}

const mixedMinutes = (num, den) => {
  const whole = Math.floor(num / den);
  const [rn, rd] = reduceFraction(num - whole * den, den);
  return rn ? `${whole} ${rn}/${rd}` : `${whole}`;
};

const CLOCK_EVENTS = {
  together: { leads: [0], phrase: 'together', perHour: 1 },
  opposite: { leads: [180], phrase: 'pointing in opposite directions', perHour: 1 },
  right: { leads: [90, 270], phrase: 'at right angles', perHour: 2 }
};

/** Event times, in 1/11-minute ticks past 12:00, strictly between h1 and h2 o'clock — from the formula (2/11)(θ + 360k). */
function clockEventTicks(kind, h1, h2) {
  const ticks = [];
  for (const lead of CLOCK_EVENTS[kind].leads) {
    for (let k = 0; k <= 12; k++) {
      const tick = 2 * (lead + 360 * k);
      if (tick > h1 * 660 && tick < h2 * 660) ticks.push(tick);
    }
  }
  return ticks.sort((x, y) => x - y);
}

/* ------------------------------ race helpers ------------------------------ */

const LAP_PAIRS = { same: [], opposite: [] };
for (let x = 12; x <= 90; x += 2) {
  for (let y = x + 2; y <= 120; y += 2) {
    if ((x * y) % (y - x) === 0 && (x * y) / (y - x) <= 1200) LAP_PAIRS.same.push([x, y]);
    if ((x * y) % (x + y) === 0) LAP_PAIRS.opposite.push([x, y]);
  }
}

/* ----------------------------- calendar helpers ----------------------------- */

/** Odd days in 0, 100, 200, 300 years (then the 400-year cycle repeats). */
const CENTURY_ODD = [0, 5, 3, 1];

/* --------------------------- approximation helpers --------------------------- */

/** The rounding of a × b (to multiples of 10) whose product is nearest the exact one. */
function closestPair(a, b) {
  const aL = a - (a % 10);
  const bL = b - (b % 10);
  const pairs = [[aL + 10, bL + 10], [aL, bL], [aL + 10, bL], [aL, bL + 10]];
  const errors = pairs.map(([x, y]) => Math.abs(x * y - a * b));
  const [x, y] = pairs[errors.indexOf(Math.min(...errors))];
  return `${x} × ${y}`;
}

const BIAS_CHOICES = ['Larger than the exact value', 'Smaller than the exact value', 'Equal to the exact value', 'Cannot be decided without the exact value'];

/* ----------------------------- decimal helpers ----------------------------- */

/** Four decimals with the classic traps, largest first: 0.5, 0.45(6), 0.405, 0.056 (shifted by a whole part w). */
function decimalFamily(rng) {
  const w = rng.chance(0.6) ? 0 : rng.int(1, 9);
  const a = rng.int(2, 9);
  const b = rng.int(1, 9);
  const c = rng.int(1, 9);
  const second = rng.chance(0.5) ? `${a - 1}${b}` : `${a - 1}${b}${c}`;
  return { w, digits: [`${a}`, second, `${a - 1}0${b}`, `0${b}${c}`] };
}

/** "0.096 < 0.405 < …" for decimal digits given smallest first. */
function orderText(w, digits, sortedSmallestFirst, ascending) {
  const sequence = ascending ? sortedSmallestFirst : [...sortedSmallestFirst].reverse();
  return sequence.map((d) => `${w}.${d}`).join(ascending ? ' < ' : ' > ');
}

/* -------------------------- powers and roots helpers -------------------------- */

const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const POWER_TERMS = {
  sq: range(2, 12).map((base) => ({ kind: 'sq', base })),
  cube: range(2, 5).map((base) => ({ kind: 'cube', base })),
  root: range(2, 15).map((base) => ({ kind: 'root', base })),
  num: range(2, 12).map((base) => ({ kind: 'num', base }))
};

/** Value of a term; `mode` models a slip: 'power' multiplies by the index, 'swapPower' swaps squares and cubes, 'root' halves the radicand, 'noRoot' ignores the root. */
function termValue({ kind, base }, mode = 'normal') {
  if (kind === 'sq') return mode === 'power' ? 2 * base : mode === 'swapPower' ? base * base * base : base * base;
  if (kind === 'cube') return mode === 'power' ? 3 * base : mode === 'swapPower' ? base * base : base * base * base;
  if (kind === 'root') return mode === 'root' ? (base * base) / 2 : mode === 'noRoot' ? base * base : base;
  return base;
}

const termText = ({ kind, base }) => (kind === 'sq' ? `${base}²` : kind === 'cube' ? `${base}³` : kind === 'root' ? `√${base * base}` : `${base}`);
const applyOp = (x, op, y) => (op === '+' ? x + y : op === '−' ? x - y : op === '×' ? x * y : x / y);
const expressionText = ({ terms, ops }) => terms.map((t, i) => (i ? ` ${ops[i - 1]} ` : '') + termText(t)).join('');

/** Evaluate with the right order ('normal', 'power', 'root'), strictly left to right, or with + − before × ÷. */
function evalExpression({ terms, ops }, mode) {
  const values = terms.map((t) => termValue(t, mode));
  if (mode === 'leftToRight') return ops.reduce((acc, op, i) => applyOp(acc, op, values[i + 1]), values[0]);
  const high = mode === 'addFirst' ? ['+', '−'] : ['×', '÷'];
  const vals = [values[0]];
  const low = [];
  ops.forEach((op, i) => {
    if (high.includes(op)) vals[vals.length - 1] = applyOp(vals[vals.length - 1], op, values[i + 1]);
    else {
      low.push(op);
      vals.push(values[i + 1]);
    }
  });
  return low.reduce((acc, op, i) => applyOp(acc, op, vals[i + 1]), vals[0]);
}

/** Build an expression from planned kinds and operators; every division is exact by construction. */
function powerExpression(rng, kinds, ops, max) {
  const terms = [];
  let chain = 0;
  for (let i = 0; i < kinds.length; i++) {
    const op = i ? ops[i - 1] : null;
    let pool = POWER_TERMS[kinds[i]];
    if (op === '÷') pool = pool.filter((t) => termValue(t) > 1 && chain % termValue(t) === 0);
    if (!pool.length) return null;
    const term = rng.pick(pool);
    terms.push(term);
    const v = termValue(term);
    chain = op === '×' ? chain * v : op === '÷' ? chain / v : v;
  }
  const p = { terms, ops };
  const value = evalExpression(p, 'normal');
  return Number.isInteger(value) && value >= 0 && value <= max ? p : null;
}

function powerDistractors(p) {
  const clean = (value) => (Number.isInteger(value) && value >= 0 ? value : null);
  return [
    { value: clean(evalExpression(p, 'leftToRight')), why: 'worked strictly from left to right' },
    { value: clean(evalExpression(p, 'addFirst')), why: 'added and subtracted before multiplying and dividing' },
    { value: clean(evalExpression(p, 'power')), why: 'multiplied by the index instead of raising to the power' },
    { value: clean(evalExpression(p, 'swapPower')), why: 'mixed up squares and cubes' },
    { value: clean(evalExpression(p, 'root')), why: 'halved the number under the root instead of taking its square root' },
    { value: clean(evalExpression(p, 'noRoot')), why: 'used the number under the root sign without taking the root' }
  ];
}

/** Independent check: parse the printed expression and evaluate it by recursive descent. */
function evaluateExpressionText(text) {
  const tokens = text.match(/√\d+|\d+[²³]?|[+−×÷]/g) || [];
  let pos = 0;
  const factor = () => {
    const token = tokens[pos++] || '';
    if (token.startsWith('√')) {
      const n = Number(token.slice(1));
      let r = 0;
      while ((r + 1) * (r + 1) <= n) r++;
      return r * r === n ? r : NaN;
    }
    const mark = token.slice(-1);
    if (mark === '²' || mark === '³') {
      const base = Number(token.slice(0, -1));
      let out = 1;
      for (let i = 0; i < (mark === '²' ? 2 : 3); i++) out *= base;
      return out;
    }
    return Number(token);
  };
  const product = () => {
    let v = factor();
    while (tokens[pos] === '×' || tokens[pos] === '÷') {
      const op = tokens[pos++];
      const w = factor();
      v = op === '×' ? v * w : v / w;
    }
    return v;
  };
  let v = product();
  while (tokens[pos] === '+' || tokens[pos] === '−') {
    const op = tokens[pos++];
    const w = product();
    v = op === '+' ? v + w : v - w;
  }
  return pos === tokens.length ? v : NaN;
}

function renderPowerExpression(p) {
  const values = p.terms.map((t) => termValue(t));
  const powers = p.terms.filter((t) => t.kind !== 'num').map((t) => `${termText(t)} = ${termValue(t)}`);
  const substituted = values.map((v, i) => (i ? ` ${p.ops[i - 1]} ` : '') + v).join('');
  const groups = [];
  const low = [];
  let current = { text: String(values[0]), value: values[0], multi: false };
  p.ops.forEach((op, i) => {
    const v = values[i + 1];
    if (op === '×' || op === '÷') current = { text: `${current.text} ${op} ${v}`, value: applyOp(current.value, op, v), multi: true };
    else {
      groups.push(current);
      low.push(op);
      current = { text: String(v), value: v, multi: false };
    }
  });
  groups.push(current);
  const products = groups.filter((g) => g.multi).map((g) => `${g.text} = ${fmt(g.value)}`);
  const sums = groups.map((g, i) => (i ? ` ${low[i - 1]} ` : '') + fmt(g.value)).join('');
  const answer = fmt(evalExpression(p, 'normal'));
  const text = expressionText(p);
  return {
    question: `What is the value of ${text}?`,
    explanation: `Powers and roots first: ${powers.join(', ')}, giving ${substituted}. Then multiply and divide: ${products.join('; ')}. Finally add and subtract from left to right${groups.length > 1 ? `: ${sums}` : ''} = ${answer}.`,
    solutionSteps: [`Powers and roots: ${powers.join(', ')}.`, `${substituted}.`, `× and ÷ first: ${products.join('; ')}.`, `${sums} = ${answer}.`],
    method: 'Powers and roots, then × and ÷, then + and −.',
    hints: ['Work out every square, cube and root before anything else.', 'Then do the multiplications and divisions, and only then add and subtract.'],
    commonMistakes: ['Working strictly from left to right.', 'Reading 3² as 3 × 2.']
  };
}

/* --------------------------- number-type helpers --------------------------- */

/** Odd composites that do not end in 5 — they "look" prime. */
const LOOKALIKE_COMPOSITES = [];
for (let n = 21; n <= 420; n += 2) if (n % 5 !== 0 && !PRIME_SET.has(n)) LOOKALIKE_COMPOSITES.push(n);

const RATIONAL_KINDS = ['sqrtSquare', 'fraction', 'recurring', 'terminating', 'sumSquare'];
const IRRATIONAL_KINDS = ['sqrtNon', 'pi', 'pattern', 'sumRoot', 'cubeRoot'];

function nonSquare(rng) {
  const n = rng.int(2, 99);
  return Number.isInteger(Math.sqrt(n)) ? n + 1 : n;
}

function numberItem(rng, kind) {
  switch (kind) {
    case 'sqrtSquare': {
      const r = rng.int(2, 15);
      return { kind, rad: r * r, text: `√${r * r}`, why: `√${r * r} = ${r}, a whole number, so it is rational` };
    }
    case 'fraction': {
      const [p, q] = rng.pick([[22, 7], [355, 113], [5, 3], [7, 9], [13, 4], [11, 6], [17, 8]]);
      return { kind, text: `${p}/${q}`, why: p === 22 || p === 355 ? `${p}/${q} is a fraction of integers, so it is rational — it only approximates π` : `${p}/${q} is a ratio of integers, so it is rational` };
    }
    case 'recurring': {
      let ab = rng.int(12, 98);
      if (ab % 11 === 0) ab += 1;
      return { kind, text: `0.${ab}${ab}${ab}…`, why: `the block ${ab} repeats forever, so it is rational` };
    }
    case 'terminating': {
      const text = `${rng.int(1, 9)}.${rng.pick(['125', '375', '25', '75', '625', '5', '04'])}`;
      return { kind, text, why: `${text} is a terminating decimal, so it is rational` };
    }
    case 'sumSquare': {
      const a = rng.int(2, 9);
      const r = rng.int(2, 12);
      return { kind, rad: r * r, text: `${a} + √${r * r}`, why: `${a} + ${r} = ${a + r}, so it is rational` };
    }
    case 'sqrtNon': {
      const n = nonSquare(rng);
      return { kind, rad: n, text: `√${n}`, why: `${n} is not a perfect square, so √${n} is irrational` };
    }
    case 'pi':
      return { kind, text: 'π', why: 'π never ends and never repeats, so it is irrational' };
    case 'pattern': {
      const d = rng.int(1, 9);
      return { kind, text: `0.${d}0${d}00${d}000${d}…`, why: 'the runs of zeros keep growing, so the decimal never repeats — irrational' };
    }
    case 'sumRoot': {
      const a = rng.int(2, 9);
      const n = nonSquare(rng);
      return { kind, rad: n, text: `${a} + √${n}`, why: `√${n} is irrational, and adding ${a} keeps it irrational` };
    }
    default: {
      let n = rng.int(2, 30);
      if ([8, 27].includes(n)) n += 1;
      return { kind: 'cubeRoot', rad: n, text: `∛${n}`, why: `${n} is not a perfect cube, so ∛${n} is irrational` };
    }
  }
}

/** Classify by integer checks only (no stored labels). */
function isRationalItem(item) {
  const isPower = (n, k) => {
    let r = 0;
    while ((r + 1) ** k <= n) r++;
    return r ** k === n;
  };
  if (['sqrtSquare', 'sqrtNon', 'sumSquare', 'sumRoot'].includes(item.kind)) return isPower(item.rad, 2);
  if (item.kind === 'cubeRoot') return isPower(item.rad, 3);
  return ['fraction', 'recurring', 'terminating'].includes(item.kind);
}

/* --------------------------- divisibility helpers --------------------------- */

const digitsOf = (n) => String(n).split('').map(Number);
const digitSum = (n) => digitsOf(n).reduce((sum, d) => sum + d, 0);
/** (digits in odd places from the right) − (digits in even places). */
const altSum = (n) => digitsOf(n).reverse().reduce((sum, d, i) => sum + (i % 2 ? -d : d), 0);

/** The digit tests themselves (the "answer" route; verify divides). */
const RULES = {
  2: (n) => (n % 10) % 2 === 0,
  3: (n) => digitSum(n) % 3 === 0,
  4: (n) => Number(String(n).slice(-2)) % 4 === 0,
  5: (n) => [0, 5].includes(n % 10),
  8: (n) => Number(String(n).slice(-3)) % 8 === 0,
  9: (n) => digitSum(n) % 9 === 0,
  11: (n) => altSum(n) % 11 === 0
};

const RULE_TEXT = {
  2: 'A number is divisible by 2 when its last digit is even',
  3: 'A number is divisible by 3 when its digit sum is',
  4: 'A number is divisible by 4 when the number formed by its last two digits is',
  5: 'A number is divisible by 5 when its last digit is 0 or 5',
  8: 'A number is divisible by 8 when the number formed by its last three digits is',
  9: 'A number is divisible by 9 when its digit sum is',
  11: 'A number is divisible by 11 when the alternating sum of its digits is 0 or a multiple of 11'
};

const RULE_SLIP = {
  3: 'Checking the last digit instead of the digit sum.',
  4: 'Checking only the last digit instead of the last two.',
  8: 'Checking only the last two digits instead of the last three.',
  9: 'Stopping at a digit sum that is divisible by 3 but not by 9.',
  11: 'Using the plain digit sum instead of the alternating sum.'
};

function ruleWorking(d, n) {
  const s = String(n);
  const ok = RULES[d](n);
  if (d === 3 || d === 9) return `${n}: digit sum ${s.split('').join(' + ')} = ${digitSum(n)}, ${ok ? '' : 'not '}divisible by ${d}`;
  if (d === 4) return `${n}: last two digits ${s.slice(-2)}, ${ok ? '' : 'not '}divisible by 4`;
  if (d === 8) return `${n}: last three digits ${s.slice(-3)}, ${ok ? '' : 'not '}divisible by 8`;
  if (d === 2 || d === 5) return `${n}: last digit ${s.slice(-1)} ${ok ? 'is' : 'is not'} ${d === 2 ? 'even' : '0 or 5'}`;
  const rev = s.split('').reverse();
  const odd = rev.filter((_, i) => i % 2 === 0).join(' + ');
  const even = rev.filter((_, i) => i % 2 === 1).join(' + ');
  return `${n}: (${odd}) − (${even}) = ${altSum(n)}, ${ok ? '' : 'not '}a multiple of 11`;
}

/** Non-multiples that pass a tempting wrong test. */
const TRAPS = {
  3: [{ test: (n) => [3, 6, 9].includes(n % 10) && digitSum(n) % 3 !== 0, why: 'it ends in 3, 6 or 9, but its digit sum is not divisible by 3' }],
  4: [{ test: (n) => [4, 8].includes(n % 10) && Number(String(n).slice(-2)) % 4 !== 0, why: 'it ends in 4 or 8, but its last two digits are not divisible by 4' }],
  8: [
    { test: (n) => Number(String(n).slice(-2)) % 8 === 0 && Number(String(n).slice(-3)) % 8 !== 0, why: 'its last two digits are divisible by 8, but the test for 8 needs the last three' },
    { test: (n) => Number(String(n).slice(-2)) % 4 === 0 && Number(String(n).slice(-3)) % 8 !== 0, why: 'it is divisible by 4, which is not enough for 8' }
  ],
  9: [
    { test: (n) => digitSum(n) % 3 === 0 && digitSum(n) % 9 !== 0, why: 'its digit sum is divisible by 3 but not by 9' },
    { test: (n) => n % 10 === 9 && digitSum(n) % 9 !== 0, why: 'it ends in 9, but its digit sum is not divisible by 9' }
  ],
  11: [
    { test: (n) => digitSum(n) % 11 === 0 && altSum(n) % 11 !== 0, why: 'its digit sum is a multiple of 11, but the test for 11 uses the alternating sum' },
    {
      test: (n) => {
        const d = digitsOf(n);
        return d.length === 4 && d[0] + d[1] === d[2] + d[3] && altSum(n) % 11 !== 0;
      },
      why: 'its first two digits add up to the same as its last two, which is not the test for 11'
    }
  ]
};

/** Multiples that fail a tempting wrong test (so they look non-divisible). */
const LOOKS_WRONG = {
  3: { test: (n) => ![3, 6, 9].includes(n % 10), why: 'it does not end in 3, 6 or 9, but its digit sum is divisible by 3' },
  4: { test: (n) => ![4, 8].includes(n % 10), why: 'its last digit is not 4 or 8, but its last two digits are divisible by 4' },
  8: { test: (n) => Number(String(n).slice(-2)) % 8 !== 0, why: 'its last two digits are not divisible by 8, but its last three digits are' },
  9: { test: (n) => n % 10 !== 9, why: 'it does not end in 9, but its digit sum is divisible by 9' },
  11: { test: (n) => digitSum(n) % 11 !== 0, why: 'its digit sum is not a multiple of 11, but its alternating digit sum is' }
};

/** `count` distinct 4-digit numbers satisfying `test`, avoiding `exclude`; null if none found. */
function findNumbers(rng, count, test, exclude) {
  const out = [];
  for (let tries = 0; tries < 3000 && out.length < count; tries++) {
    const n = rng.int(1000, 9999);
    if (test(n) && !exclude.includes(n) && !out.includes(n)) out.push(n);
  }
  return out.length === count ? out : null;
}

const SEVEN_TRAPS = [
  { test: (n) => (Math.floor(n / 10) + 2 * (n % 10)) % 7 === 0, why: 'it passes only if you add twice the last digit instead of subtracting it' },
  { test: (n) => n % 10 === 7, why: 'it ends in 7, but the last digit says nothing about divisibility by 7' },
  { test: (n) => digitSum(n) % 7 === 0, why: 'its digit sum is a multiple of 7, but the digit-sum test does not work for 7' }
];

/** The "double the last digit and subtract" chain: [n, step1, step2, …] until below 70. */
function sevenSteps(n) {
  const steps = [n];
  let x = n;
  while (x >= 70) {
    const raw = Math.floor(x / 10) - 2 * (x % 10);
    steps.push(raw);
    x = Math.abs(raw);
  }
  return steps;
}

const COMPOSITE_SPLITS = [[12, 3, 4], [18, 2, 9], [20, 4, 5], [24, 3, 8], [36, 4, 9], [40, 5, 8], [44, 4, 11], [45, 5, 9], [72, 8, 9], [88, 8, 11], [99, 9, 11]];

/** Factor pairs x × y = D that share a factor, so testing both proves only their LCM. */
function overlappingPairs(D) {
  const out = [];
  for (let x = 2; x * x < D; x++) if (D % x === 0 && gcd(x, D / x) > 1) out.push([x, D / x]);
  return out;
}

const pairTest = ([x, y]) => `Divisible by ${x} and by ${y}`;

/* ---------------------------- factorisation helpers ---------------------------- */

const factorText = (bases, exps) =>
  bases
    .map((p, i) => (exps[i] === 0 ? null : exps[i] > 1 ? `${p}${sup(exps[i])}` : `${p}`))
    .filter(Boolean)
    .join(' × ');

function primeFactorText(n) {
  const bases = [];
  const exps = [];
  for (let p = 2; n > 1; p++) {
    if (n % p !== 0) continue;
    let e = 0;
    while (n % p === 0) {
      n /= p;
      e++;
    }
    bases.push(p);
    exps.push(e);
  }
  return factorText(bases, exps);
}

/* ============================== templates ============================== */

export const moreRatesNumbersTemplates = [
  /* ============================ time and work ============================ */
  {
    id: 'tw-rate-part-done',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-rate',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tw-rate-formula'],
    estimatedSeconds: 35,
    params(rng) {
      const n = rng.int(6, 30);
      const k = rng.int(2, n - 2);
      if (2 * k === n) return null;
      return { n, k, askLeft: rng.chance(0.4), name: rng.pick(NAMES) };
    },
    answer: ({ n, k, askLeft }) => frac(askLeft ? n - k : k, n),
    formatValue: (value) => value,
    distractors: ({ n, k, askLeft }) =>
      askLeft
        ? [
            { value: frac(k, n), why: 'gave the part done, not the part left' },
            { value: frac(n, n - k), why: 'turned the fraction upside down' },
            { value: frac(1, n), why: "gave one day's work" }
          ]
        : [
            { value: frac(n, k), why: 'divided the days the wrong way round' },
            { value: frac(1, n), why: "gave one day's work" },
            { value: frac(n - k, n), why: 'gave the part still left' }
          ],
    // Call the job n units (one unit a day) and count the units day by day.
    verify({ n, k, askLeft }, text) {
      let done = 0;
      for (let day = 1; day <= k; day++) done += 1;
      const [a, b] = parseFraction(text);
      return gcd(a, b) === 1 && a * n === b * (askLeft ? n - done : done);
    },
    render({ n, k, askLeft, name }) {
      const done = frac(k, n);
      const left = frac(n - k, n);
      const doneWork = done === `${k}/${n}` ? done : `${k}/${n} = ${done}`;
      return {
        question: askLeft
          ? `${name} can finish a job alone in ${n} days and works on it for ${k} days. What fraction of the job is still left?`
          : `${name} can finish a job alone in ${n} days. What fraction of the job is done in ${k} days?`,
        explanation: `${name} does 1/${n} of the job each day, so in ${k} days ${doneWork} of it is done${askLeft ? `, leaving 1 − ${done} = ${left}` : ''}.`,
        solutionSteps: [
          `One day's work = 1/${n}.`,
          `${k} days' work = ${k} × 1/${n} = ${done}.`,
          ...(askLeft ? [`Work left = 1 − ${done} = ${left}.`] : [])
        ],
        method: 'Rate = 1 ÷ days; work done = rate × time.',
        hints: [
          `What fraction of the job is done in one day if the whole job takes ${n} days?`,
          `Multiply that daily fraction by ${k}.`,
          ...(askLeft ? ['Subtract the part done from the whole job (1).'] : [])
        ],
        commonMistakes: [askLeft ? 'Giving the part already done instead of the part left.' : `Writing ${n}/${k} — dividing the days the wrong way round.`]
      };
    }
  },

  {
    id: 'tw-rate-whole-from-part',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-rate',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tw-rate-formula'],
    estimatedSeconds: 50,
    params(rng) {
      const q = rng.int(3, 9);
      const p = rng.int(2, q - 1);
      if (gcd(p, q) !== 1) return null;
      const m = rng.int(1, 8);
      if (q * m > 72) return null;
      return { p, q, m, k: p * m, name: rng.pick(NAMES) };
    },
    answer: ({ q, m }) => q * m,
    formatValue: (value) => format.days(value),
    distractors: ({ p, q, m, k }) => [
      { value: (k * p) / q, why: 'multiplied the days by the fraction instead of dividing' },
      { value: (q - p) * m, why: 'gave the days needed for the rest of the job only' },
      { value: p * q * m, why: 'multiplied by the denominator but forgot to divide by the numerator' },
      { value: m, why: `found the time for 1/${q} of the job and stopped` }
    ],
    // The daily rate is (p/q) ÷ k; rate × days must be the whole job.
    verify: ({ p, q, k }, value) => value * p === q * k,
    render({ p, q, m, k, name }) {
      return {
        question: `${name} completes ${p}/${q} of a job in ${k} days. Working at the same rate, how many days does ${name} need for the whole job?`,
        explanation: `${p}/${q} of the job takes ${k} days, so 1/${q} of it takes ${k} ÷ ${p} = ${m} day${m === 1 ? '' : 's'}, and the whole job (${q}/${q}) takes ${q} × ${m} = ${q * m} days.`,
        solutionSteps: [`${p}/${q} of the job → ${k} days.`, `1/${q} of the job → ${k} ÷ ${p} = ${m} day${m === 1 ? '' : 's'}.`, `Whole job → ${q} × ${m} = ${q * m} days.`],
        method: 'Days for the whole job = days taken ÷ fraction done.',
        hints: [`How long does 1/${q} of the job take?`, `Divide ${k} by ${p}, then multiply by ${q}.`],
        commonMistakes: [`Multiplying ${k} by ${p}/${q} instead of dividing by it.`]
      };
    }
  },

  {
    id: 'tw-efficiency-ratio-time',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-efficiency',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tw-efficiency-formula'],
    estimatedSeconds: 45,
    params(rng) {
      const [eA, eB] = rng.pick([[3, 2], [4, 3], [5, 4], [5, 3], [2, 3], [3, 4], [4, 5], [3, 5], [5, 2], [7, 4], [7, 5], [4, 7], [5, 7], [6, 5], [5, 6], [7, 6], [6, 7], [2, 5]]);
      const knownA = rng.chance(0.5);
      const eK = knownA ? eA : eB;
      const eU = knownA ? eB : eA;
      const tKnown = eK * eU * rng.int(1, 3);
      if (tKnown > 90 || 2 * eK - eU <= 0) return null;
      return { eA, eB, knownA, tKnown };
    },
    answer: ({ eA, eB, knownA, tKnown }) => (tKnown * (knownA ? eA : eB)) / (knownA ? eB : eA),
    formatValue: (value) => format.days(value),
    distractors({ eA, eB, knownA, tKnown }) {
      const eK = knownA ? eA : eB;
      const eU = knownA ? eB : eA;
      const tU = (tKnown * eK) / eU;
      return [
        { value: (tKnown * eU) / eK, why: 'used the efficiency ratio as the time ratio' },
        { value: (tKnown * (2 * eK - eU)) / eK, why: "measured the efficiency gap against the wrong worker's efficiency" },
        { value: (tKnown * tU) / (tKnown + tU), why: 'gave the time for both working together' }
      ];
    },
    // Total work in units = efficiency × days for the known worker; the other must do the same work.
    verify: ({ eA, eB, knownA, tKnown }, value) => value * (knownA ? eB : eA) === tKnown * (knownA ? eA : eB),
    render({ eA, eB, knownA, tKnown }) {
      const [K, U] = knownA ? ['A', 'B'] : ['B', 'A'];
      const eK = knownA ? eA : eB;
      const eU = knownA ? eB : eA;
      const work = eK * tKnown;
      const tU = work / eU;
      return {
        question: `The efficiencies of A and B are in the ratio ${eA} : ${eB}. ${K} alone finishes a job in ${tKnown} days. How many days will ${U} alone take?`,
        explanation: `Let ${K} do ${eK} units a day and ${U} do ${eU}. The job is ${eK} × ${tKnown} = ${work} units, so ${U} needs ${work} ÷ ${eU} = ${tU} days. Time is inversely proportional to efficiency.`,
        solutionSteps: [`Work = ${eK} × ${tKnown} = ${work} units.`, `${U} does ${eU} units a day.`, `${work} ÷ ${eU} = ${tU} days.`],
        method: 'Efficiency ratio a : b ⟹ time ratio b : a.',
        hints: ['A more efficient worker needs fewer days.', `Turn the ratio into units per day and find the total work from ${K}.`],
        commonMistakes: ['Using the efficiency ratio directly as the time ratio.']
      };
    }
  },

  {
    id: 'tw-efficiency-times-as-fast',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-efficiency',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tw-efficiency-formula', 'tw-sc-times-as-fast'],
    estimatedSeconds: 70,
    params(rng) {
      const mode = rng.pick(['together', 'gap']);
      const k = rng.int(2, 4);
      const askA = rng.chance(0.5);
      if (mode === 'together') {
        const m = rng.int(2, 9);
        const T = k * m;
        if (k * m * (k + 1) > 120) return null;
        return { mode, k, askA, T, A: m * (k + 1), B: k * m * (k + 1) };
      }
      const m = rng.int(3, 15);
      const D = (k - 1) * m;
      return { mode, k, askA, D, A: m, B: k * m };
    },
    answer: ({ askA, A, B }) => (askA ? A : B),
    formatValue: (value) => format.days(value),
    distractors({ mode, k, askA, T, D, A, B }) {
      if (mode === 'together') {
        return askA
          ? [
              { value: B, why: "gave B's time" },
              { value: 2 * T, why: 'treated A and B as equally efficient' },
              { value: T * k, why: 'multiplied the joint time by the efficiency factor' },
              { value: (T * k) / (k + 1), why: "multiplied by A's share of the work instead of dividing" }
            ]
          : [
              { value: A, why: "gave A's time" },
              { value: 2 * T, why: 'treated A and B as equally efficient' },
              { value: T * k, why: 'multiplied the joint time by the efficiency factor' },
              { value: T / (k + 1), why: "multiplied by B's share of the work instead of dividing" }
            ];
      }
      return askA
        ? [
            { value: B, why: "gave B's time" },
            { value: D, why: "took the gap in days as A's time" },
            { value: D / (k + 1), why: 'divided the gap by k + 1 instead of k − 1' },
            { value: (D * k) / (k + 1), why: 'shared the gap in the ratio k : 1' }
          ]
        : [
            { value: A, why: "gave A's time" },
            { value: D, why: "took the gap in days as B's time" },
            { value: D * k, why: 'multiplied the gap by k' },
            { value: (D * (k + 1)) / (k - 1), why: 'used k + 1 instead of k in kD ÷ (k − 1)' },
            { value: (D * k) / (k + 1), why: 'shared the gap in the ratio k : 1' }
          ];
    },
    verify({ mode, k, askA, T, D }, value) {
      const a = askA ? value : value / k;
      const b = a * k;
      return mode === 'together' ? nearlyEqual(1 / a + 1 / b, 1 / T) : nearlyEqual(b - a, D);
    },
    render({ mode, k, askA, T, D, A, B }) {
      const who = askA ? 'A' : 'B';
      const ans = askA ? A : B;
      if (mode === 'together') {
        const work = (k + 1) * T;
        return {
          question: `A is ${k} times as efficient as B. Working together, they finish a job in ${T} days. How many days would ${who} take alone?`,
          explanation: `Let B do 1 unit a day, so A does ${k}. Together they do ${k + 1} units a day, so the job is ${k + 1} × ${T} = ${work} units. ${who} alone needs ${work} ÷ ${askA ? k : 1} = ${ans} days.`,
          solutionSteps: [`Daily units: A = ${k}, B = 1, together = ${k + 1}.`, `Work = ${k + 1} × ${T} = ${work} units.`, `${who} alone: ${work} ÷ ${askA ? k : 1} = ${ans} days.`],
          method: 'Turn efficiencies into units per day; total work = joint rate × joint time.',
          hints: ['Give B 1 unit of work per day.', `How many units a day do they do together, and how many units is the job?`],
          commonMistakes: ['Splitting the joint time equally, as if the two were equally efficient.']
        };
      }
      return {
        question: `A is ${k} times as fast as B at a job and takes ${D} days fewer than B to finish it alone. How many days does ${who} take alone?`,
        explanation: `If A takes t days, B takes ${k}t days. The gap is ${k}t − t = ${k - 1}t = ${D}, so t = ${A}. A takes ${A} days and B takes ${B} days.`,
        solutionSteps: [`A: t days; B: ${k}t days.`, `${k}t − t = ${D} ⟹ ${k - 1}t = ${D} ⟹ t = ${A}.`, `${who} alone: ${ans} days.`],
        method: 'A takes D ÷ (k − 1) days; B takes k × D ÷ (k − 1) days.',
        hints: [`If A takes t days, how long does B take?`, `Write the gap as ${k}t − t and set it equal to ${D}.`],
        commonMistakes: [`Taking the gap of ${D} days as one of the times.`]
      };
    }
  },

  {
    id: 'tw-handover-finish',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-applications',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tw-remaining'],
    estimatedSeconds: 55,
    params(rng) {
      const a = rng.pick(WORK_DAYS);
      const b = rng.pick(WORK_DAYS);
      if (a === b) return null;
      const xs = [];
      for (let x = 1; x < a; x++) if ((b * (a - x)) % a === 0) xs.push(x);
      if (!xs.length) return null;
      const x = rng.pick(xs);
      return { a, b, x, y: (b * (a - x)) / a };
    },
    answer: ({ y }) => y,
    formatValue: (value) => format.days(value),
    distractors: ({ a, b, x }) => [
      { value: b - x, why: "subtracted A's days from B's time" },
      { value: a - x, why: 'gave the days A would still need' },
      { value: (b * x) / a, why: 'gave the time B would need for the part A already did' },
      { value: b, why: "gave B's time for the whole job" },
      { value: a, why: "gave A's time for the whole job" }
    ],
    // Simulate in work units, day by day.
    verify({ a, b, x }, value) {
      const units = lcm(a, b);
      let work = 0;
      for (let day = 0; day < x; day++) work += units / a;
      let days = 0;
      while (work < units) {
        work += units / b;
        days++;
      }
      return work === units && days === value;
    },
    render({ a, b, x, y }) {
      const left = frac(a - x, a);
      return {
        question: `A can finish a job in ${a} days and B can finish it in ${b} days. A works alone for ${x} day${x === 1 ? '' : 's'} and then leaves. How many days does B take to finish the rest?`,
        explanation: `In ${x} day${x === 1 ? '' : 's'} A does ${frac(x, a)} of the job, leaving ${left}. B does 1/${b} of the job a day, so B needs ${left} × ${b} = ${y} days.`,
        solutionSteps: [`A's work = ${x} × 1/${a} = ${frac(x, a)}.`, `Remaining = 1 − ${frac(x, a)} = ${left}.`, `B's time = ${left} ÷ 1/${b} = ${left} × ${b} = ${y} days.`],
        method: 'Remaining work ÷ rate of whoever finishes.',
        hints: [`What fraction of the job does A finish in ${x} day${x === 1 ? '' : 's'}?`, `Divide the remaining fraction by B's daily rate 1/${b}.`],
        commonMistakes: [`Subtracting days: ${b} − ${x}. Days only subtract when the same person does the work.`]
      };
    }
  },

  {
    id: 'tw-partner-leaves',
    version: 1,
    topicId: 'time-and-work',
    conceptId: 'tw-applications',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['tw-remaining', 'tw-combined-formula'],
    estimatedSeconds: 80,
    params(rng) {
      const a = rng.pick(WORK_DAYS);
      const b = rng.pick(WORK_DAYS);
      if (a === b) return null;
      const L = lcm(a, b);
      if (L > 360) return null;
      const rA = L / a;
      const rB = L / b;
      const leaverA = rng.chance(0.5);
      const rC = leaverA ? rB : rA;
      const xs = [];
      for (let x = 1; x * (rA + rB) < L; x++) if ((L - x * (rA + rB)) % rC === 0) xs.push(x);
      if (!xs.length) return null;
      const x = rng.pick(xs);
      return { a, b, x, leaverA, y: (L - x * (rA + rB)) / rC };
    },
    answer: ({ y }) => y,
    formatValue: (value) => format.days(value),
    distractors({ a, b, x, leaverA, y }) {
      const L = lcm(a, b);
      const rA = L / a;
      const rB = L / b;
      const rC = leaverA ? rB : rA;
      const rLeaver = leaverA ? rA : rB;
      return [
        { value: (leaverA ? b : a) - x, why: "subtracted the days already worked from the finisher's own time" },
        { value: (L - x * (rA + rB)) / (rA + rB), why: 'assumed both kept working' },
        { value: (L - x * rLeaver) / rC, why: "counted only the leaver's work in the first days" },
        { value: x + y, why: 'gave the total time instead of the extra days' }
      ];
    },
    verify({ a, b, x, leaverA }, value) {
      const L = lcm(a, b);
      let work = 0;
      for (let day = 0; day < x; day++) work += L / a + L / b;
      let days = 0;
      while (work < L) {
        work += leaverA ? L / b : L / a;
        days++;
      }
      return work === L && days === value;
    },
    render({ a, b, x, leaverA, y }) {
      const L = lcm(a, b);
      const rA = L / a;
      const rB = L / b;
      const [leaver, stayer, rC] = leaverA ? ['A', 'B', rB] : ['B', 'A', rA];
      const done = x * (rA + rB);
      return {
        question: `A can do a job in ${a} days and B in ${b} days. They start together, and after ${x} day${x === 1 ? '' : 's'} ${leaver} leaves. How many more days does ${stayer} need to finish the job?`,
        explanation: `Take the job as ${L} units (the LCM of ${a} and ${b}): A does ${rA} and B does ${rB} units a day. In ${x} day${x === 1 ? '' : 's'} together they do ${x} × ${rA + rB} = ${done} units, leaving ${L - done}. ${stayer} alone needs ${L - done} ÷ ${rC} = ${y} days.`,
        solutionSteps: [`Job = ${L} units; A: ${rA}/day, B: ${rB}/day.`, `Together for ${x} day${x === 1 ? '' : 's'}: ${done} units.`, `Left: ${L - done} units; ${stayer}: ${L - done} ÷ ${rC} = ${y} days.`],
        method: 'Work done together first, then remaining work ÷ the rate of whoever stays.',
        hints: [`Call the job ${L} units to avoid fractions.`, `How much is done in the first ${x} day${x === 1 ? '' : 's'} with both working?`, `Divide what is left by ${stayer}'s daily units.`],
        commonMistakes: ['Forgetting that both worked during the first days.', 'Giving the total time instead of the extra days.']
      };
    }
  },

  /* ======================= time, speed and distance ======================= */
  {
    id: 'tsd-relation-speed-distance',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-relation',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tsd-basic'],
    estimatedSeconds: 30,
    params(rng) {
      const [vehicle, lo, hi] = rng.pick([['cyclist', 8, 20], ['car', 35, 90], ['bus', 30, 70], ['train', 45, 120], ['scooter', 25, 60]]);
      const s = rng.int(lo, hi);
      const t = rng.int(2, 8);
      return { vehicle, s, t, d: s * t, ask: rng.pick(['speed', 'distance']) };
    },
    answer: ({ s, d, ask }) => (ask === 'speed' ? s : d),
    formatValue: (value, { ask }) => (ask === 'speed' ? format.kmh(value) : km(value)),
    distractors: ({ s, t, d, ask }) =>
      ask === 'speed'
        ? [
            { value: d * t, why: 'multiplied distance by time' },
            { value: d, why: 'took the distance as the speed' },
            { value: d / (t * t), why: 'divided by the time twice' }
          ]
        : [
            { value: s / t, why: 'divided speed by time' },
            { value: s, why: 'took the speed as the distance' },
            { value: s * t * t, why: 'multiplied by the time twice' }
          ],
    verify: ({ s, t, d, ask }, value) => (ask === 'speed' ? nearlyEqual(value * t, d) : nearlyEqual(value / s, t)),
    render({ vehicle, s, t, d, ask }) {
      return {
        question:
          ask === 'speed'
            ? `A ${vehicle} covers ${d} km in ${t} hours. What is its speed?`
            : `A ${vehicle} travels at ${s} km/hr for ${t} hours. How far does the ${vehicle} go?`,
        explanation: ask === 'speed' ? `Speed = distance ÷ time = ${d} ÷ ${t} = ${s} km/hr.` : `Distance = speed × time = ${s} × ${t} = ${d} km.`,
        solutionSteps: ask === 'speed' ? ['Speed = Distance ÷ Time.', `${d} ÷ ${t} = ${s} km/hr.`] : ['Distance = Speed × Time.', `${s} × ${t} = ${d} km.`],
        method: ask === 'speed' ? 'Distance ÷ time.' : 'Speed × time.',
        hints: [
          ask === 'speed' ? 'Speed tells you how many km are covered in one hour.' : `In one hour the ${vehicle} goes ${s} km.`,
          ask === 'speed' ? `Share ${d} km equally over ${t} hours.` : `How far in ${t} hours?`
        ],
        commonMistakes: [ask === 'speed' ? 'Multiplying distance by time.' : 'Dividing speed by time.']
      };
    }
  },

  {
    id: 'tsd-relation-minutes',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-relation',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tsd-basic', 'tsd-conversion'],
    answerDecimals: 1,
    estimatedSeconds: 50,
    params(rng) {
      const k = rng.int(2, 15);
      const s = 6 * k;
      const M = rng.pick([10, 15, 20, 25, 35, 40, 45, 50, 55, 70, 75, 80, 90, 100, 105, 110, 135, 150]);
      const vehicle = s <= 24 ? 'cyclist' : rng.pick(['car', 'bus', 'van', 'motorbike']);
      return { s, M, d: (k * M) / 10, vehicle, ask: rng.pick(['distance', 'speed', 'time']) };
    },
    answer: ({ s, M, d, ask }) => ({ distance: d, speed: s, time: M })[ask],
    formatValue: (value, { ask }) => (ask === 'distance' ? km(value) : ask === 'speed' ? format.kmh(value) : minutes(value)),
    distractors({ s, M, d, ask }) {
      if (ask === 'distance') {
        return [
          { value: s * M, why: 'did not convert the minutes into hours' },
          { value: (s * M) / 100, why: 'used 100 minutes in an hour' },
          { value: (60 * s) / M, why: 'divided the speed by the time' }
        ];
      }
      if (ask === 'speed') {
        return [
          { value: d / M, why: 'did not convert the minutes into hours' },
          { value: (100 * d) / M, why: 'used 100 minutes in an hour' },
          { value: (d * M) / 60, why: 'multiplied distance by time' }
        ];
      }
      return [
        { value: d / s, why: 'gave the time in hours without converting to minutes' },
        { value: (100 * d) / s, why: 'used 100 minutes in an hour' },
        { value: (60 * s) / d, why: 'divided speed by distance' }
      ];
    },
    verify({ s, M, d, ask }, value) {
      if (ask === 'distance') return nearlyEqual((value * 60) / s, M);
      if (ask === 'speed') return nearlyEqual((d * 60) / value, M);
      return nearlyEqual((s * value) / 60, d);
    },
    render({ s, M, d, vehicle, ask }) {
      const hours = `${M}/60`;
      if (ask === 'distance') {
        return {
          question: `A ${vehicle} travels at ${s} km/hr for ${M} minutes. How far does the ${vehicle} go?`,
          explanation: `${M} minutes = ${M}/60 hour. Distance = ${s} × ${hours} = ${fmt(d)} km.`,
          solutionSteps: [`Time = ${M} ÷ 60 = ${fmt(M / 60)} hours.`, `Distance = ${s} × ${fmt(M / 60)} = ${fmt(d)} km.`],
          method: 'Convert minutes to hours before using km/hr.',
          hints: ['The speed is per hour, but the time is in minutes.', `Write ${M} minutes as a fraction of an hour.`],
          commonMistakes: [`Multiplying ${s} × ${M} without converting.`]
        };
      }
      if (ask === 'speed') {
        return {
          question: `A ${vehicle} covers ${fmt(d)} km in ${M} minutes. What is its speed in km/hr?`,
          explanation: `${M} minutes = ${M}/60 hour. Speed = ${fmt(d)} ÷ ${hours} = ${fmt(d)} × 60/${M} = ${s} km/hr.`,
          solutionSteps: [`Time = ${M}/60 hour.`, `Speed = ${fmt(d)} × 60 ÷ ${M} = ${s} km/hr.`],
          method: 'km/hr needs the time in hours.',
          hints: ['How far would it go in a full hour at this rate?', `Multiply ${fmt(d)} by 60/${M}.`],
          commonMistakes: [`Dividing ${fmt(d)} by ${M} and calling it km/hr.`]
        };
      }
      return {
        question: `How many minutes does a ${vehicle} take to cover ${fmt(d)} km at ${s} km/hr?`,
        explanation: `Time = ${fmt(d)} ÷ ${s} hour. In minutes: ${fmt(d)} × 60 ÷ ${s} = ${M} minutes.`,
        solutionSteps: [`Time in hours = ${fmt(d)}/${s}.`, `× 60 → ${fmt(d)} × 60 ÷ ${s} = ${M} minutes.`],
        method: 'Time = distance ÷ speed, then hours × 60.',
        hints: ['Find the time in hours first.', 'Multiply hours by 60 to get minutes.'],
        commonMistakes: ['Stopping at hours when the question asks for minutes.']
      };
    }
  },

  {
    id: 'tsd-relative-meet-chase',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-relative',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tsd-relative-speed'],
    answerDecimals: 1,
    estimatedSeconds: 45,
    params(rng) {
      const towards = rng.chance(0.6);
      const p = 5 * rng.int(2, 18);
      const q = 5 * rng.int(2, 18);
      if (p === q) return null;
      const fast = Math.max(p, q);
      const slow = Math.min(p, q);
      const t = rng.pick([1, 1.5, 2, 2.5, 3, 4, 5]);
      const D = (towards ? fast + slow : fast - slow) * t;
      if (D < 10) return null;
      return towards ? { towards, a: p, b: q, t, D } : { towards, a: fast, b: slow, t, D };
    },
    answer: ({ t }) => t,
    formatValue: (value) => format.hours(value),
    distractors: ({ towards, a, b, D }) =>
      towards
        ? [
            { value: D / Math.abs(a - b), why: 'subtracted the speeds' },
            { value: D / Math.max(a, b), why: 'used only the faster speed' },
            { value: (2 * D) / (a + b), why: 'used the average of the speeds' },
            { value: D / Math.min(a, b), why: 'used only the slower speed' }
          ]
        : [
            { value: D / (a + b), why: 'added the speeds' },
            { value: D / a, why: 'used only the faster speed' },
            { value: D / b, why: 'used only the slower speed' },
            { value: (2 * D) / (a + b), why: 'used the average of the speeds' }
          ],
    // After `value` hours the two must have closed exactly the gap D.
    verify: ({ towards, a, b, D }, value) => nearlyEqual(towards ? a * value + b * value : a * value - b * value, D),
    render({ towards, a, b, t, D }) {
      const rel = towards ? a + b : a - b;
      return {
        question: towards
          ? `Two cars start at the same time from towns ${fmt(D)} km apart and drive towards each other at ${a} km/hr and ${b} km/hr. After how long do they meet?`
          : `A jeep travelling at ${a} km/hr chases a lorry that is ${fmt(D)} km ahead and travelling at ${b} km/hr on the same road. How long does the jeep take to catch the lorry?`,
        explanation: towards
          ? `Moving towards each other, the gap closes at ${a} + ${b} = ${rel} km/hr. Time = ${fmt(D)} ÷ ${rel} = ${fmt(t)} hours.`
          : `Moving the same way, the jeep gains ${a} − ${b} = ${rel} km every hour. Time = ${fmt(D)} ÷ ${rel} = ${fmt(t)} hours.`,
        solutionSteps: [towards ? `Relative speed = ${a} + ${b} = ${rel} km/hr.` : `Relative speed = ${a} − ${b} = ${rel} km/hr.`, `Time = ${fmt(D)} ÷ ${rel} = ${fmt(t)} hours.`],
        method: towards ? 'Approaching: add the speeds.' : 'Chasing: subtract the speeds.',
        hints: [towards ? 'How fast is the gap between them shrinking?' : 'How much does the jeep gain on the lorry each hour?', `Divide ${fmt(D)} km by that relative speed.`],
        commonMistakes: [towards ? 'Subtracting the speeds when the two move towards each other.' : 'Adding the speeds in a chase.']
      };
    }
  },

  {
    id: 'tsd-relative-head-start',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-relative',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tsd-relative-speed', 'tsd-basic'],
    answerDecimals: 1,
    estimatedSeconds: 65,
    params(rng) {
      const h = rng.int(1, 3);
      const j = rng.int(1, 4);
      const g = 2 * h * j;
      const t = rng.pick([1, 1.5, 2, 2.5, 3, 4, 5, 6]);
      const a = 2 * j * t;
      const b = a + g;
      if (a < 3 || b > 100) return null;
      return { h, a, b, t, ask: rng.pick(['time', 'distance']) };
    },
    answer: ({ b, t, ask }) => (ask === 'time' ? t : b * t),
    formatValue: (value, { ask }) => (ask === 'time' ? format.hours(value) : km(value)),
    distractors: ({ h, a, b, t, ask }) =>
      ask === 'time'
        ? [
            { value: (a * h) / (a + b), why: 'added the speeds' },
            { value: (a * h) / b, why: 'ignored that A keeps moving during the chase' },
            { value: t + h, why: 'gave the time since A set out' },
            { value: (b * h) / (b - a), why: "used B's speed to work out the head start" }
          ]
        : [
            { value: a * h, why: 'gave only the head start' },
            { value: b * (t + h), why: 'used the time since A set out' },
            { value: a * t, why: "used A's speed with the chase time" },
            { value: (b - a) * t, why: 'multiplied the relative speed by the chase time' },
            { value: (a + b) * t, why: 'added the speeds' }
          ],
    // Positions measured from the town: A has walked h hours longer than B.
    verify({ h, a, b, ask }, value) {
      const chase = ask === 'time' ? value : value / b;
      return nearlyEqual(a * (h + chase), b * chase);
    },
    render({ h, a, b, t, ask }) {
      const lead = a * h;
      return {
        question: `A sets out from a town at ${a} km/hr. ${h} ${hourWord(h)} later, B sets out from the same place along the same road at ${b} km/hr. ${ask === 'time' ? 'How long after B starts does B catch up with A?' : 'How far from the town does B catch up with A?'}`,
        explanation: `When B starts, A is ${a} × ${h} = ${lead} km ahead. B gains ${b} − ${a} = ${b - a} km/hr, so B catches A after ${lead} ÷ ${b - a} = ${fmt(t)} hours${ask === 'distance' ? `, having gone ${b} × ${fmt(t)} = ${fmt(b * t)} km` : ''}.`,
        solutionSteps: [`Head start = ${a} × ${h} = ${lead} km.`, `Relative speed = ${b} − ${a} = ${b - a} km/hr.`, `Chase time = ${lead} ÷ ${b - a} = ${fmt(t)} hours.`, ...(ask === 'distance' ? [`Distance = ${b} × ${fmt(t)} = ${fmt(b * t)} km.`] : [])],
        method: 'Head start ÷ difference of speeds.',
        hints: [`How far ahead is A when B starts?`, 'Same direction: B closes the gap at the difference of the speeds.'],
        commonMistakes: ['Dividing the head start by B’s full speed, as if A stood still.']
      };
    }
  },

  {
    id: 'tsd-late-early-distance',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-applications',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['tsd-late-early', 'tsd-sc-late-early'],
    answerDecimals: 1,
    estimatedSeconds: 85,
    params(rng) {
      const [s1, s2] = rng.pick([[3, 4], [4, 5], [5, 6], [3, 5], [4, 6], [6, 8], [10, 12], [12, 15], [15, 20], [20, 24], [30, 40], [40, 50], [40, 60], [36, 45], [45, 60], [48, 60], [50, 60], [60, 75], [60, 80], [30, 36]]);
      // d = s1·s2·G / (60(s2 − s1)) must be clean: pick G as a multiple of the reduced denominator.
      const [num, den] = reduceFraction(s1 * s2, 60 * (s2 - s1));
      const options = [];
      for (let G = den; G <= 60; G += den) if (G >= 4) options.push(G);
      if (!options.length) return null;
      const G = rng.pick(options);
      const d = (num * G) / den;
      if (d < 1 || d > 300) return null;
      const mode = rng.pick(['lateEarly', 'lateEarly', 'bothLate', 'bothEarly']);
      let m1;
      let m2;
      if (mode === 'lateEarly') {
        m1 = rng.int(1, G - 1);
        m2 = G - m1;
      } else if (mode === 'bothLate') {
        m2 = rng.int(2, 20);
        m1 = m2 + G;
      } else {
        m1 = rng.int(2, 20);
        m2 = m1 + G;
      }
      const onTime = (60 * d) / s1 + (mode === 'bothEarly' ? m1 : -m1);
      if (onTime <= 5) return null;
      return { s1, s2, G, d, m1, m2, mode };
    },
    answer: ({ d }) => d,
    formatValue: (value) => km(value),
    distractors({ s1, s2, G, m1, m2, mode }) {
      const wrongGap = mode === 'lateEarly' ? Math.abs(m1 - m2) : m1 + m2;
      return [
        {
          value: wrongGap ? (s1 * s2 * wrongGap) / (60 * (s2 - s1)) : null,
          why: mode === 'lateEarly' ? 'subtracted the minutes although one trip is late and the other early' : 'added the minutes although both trips are on the same side of the right time'
        },
        { value: (s1 * s2 * G) / (60 * (s1 + s2)), why: 'divided by the sum of the speeds' },
        { value: (s1 * s2 * G) / (s2 - s1), why: 'did not convert the minutes into hours' }
      ];
    },
    // Substitute: both trips must imply the same on-time journey.
    verify({ s1, s2, m1, m2, mode }, value) {
      const t1 = (60 * value) / s1;
      const t2 = (60 * value) / s2;
      if (mode === 'lateEarly') return nearlyEqual(t1 - m1, t2 + m2);
      if (mode === 'bothLate') return nearlyEqual(t1 - m1, t2 - m2);
      return nearlyEqual(t1 + m1, t2 + m2);
    },
    render({ s1, s2, G, d, m1, m2, mode }) {
      const verb = s2 <= 8 ? 'Walking' : s2 <= 24 ? 'Cycling' : 'Driving';
      const first = mode === 'bothEarly' ? `${m1} minutes early` : `${m1} minutes late`;
      const second = mode === 'bothLate' ? `${m2} minutes late` : `${m2} minutes early`;
      const gapText = mode === 'lateEarly' ? `${m1} + ${m2} = ${G}` : `${Math.max(m1, m2)} − ${Math.min(m1, m2)} = ${G}`;
      return {
        question: `${verb} at ${s1} km/hr, a man reaches his office ${first}. ${verb} at ${s2} km/hr, he reaches ${second}. How far is his office?`,
        explanation: `The two journey times differ by ${gapText} minutes = ${G}/60 hour. So d/${s1} − d/${s2} = ${G}/60, giving d = ${s1} × ${s2} × (${G}/60) ÷ (${s2} − ${s1}) = ${fmt(d)} km.`,
        solutionSteps: [`Time gap = ${gapText} minutes = ${G}/60 hour.`, `d/${s1} − d/${s2} = d × ${s2 - s1}/${s1 * s2}.`, `d = ${s1 * s2} × ${G} ÷ (60 × ${s2 - s1}) = ${fmt(d)} km.`],
        method: 'Distance = s₁ × s₂ × time gap ÷ (s₂ − s₁).',
        hints: [mode === 'lateEarly' ? 'Late at one speed and early at the other: the minutes add.' : 'Both on the same side of the right time: the minutes subtract.', 'Convert the gap into hours before using km/hr.'],
        commonMistakes: [mode === 'lateEarly' ? 'Subtracting the late and early minutes.' : 'Adding the minutes.', 'Leaving the gap in minutes.']
      };
    }
  },

  {
    id: 'tsd-late-right-time',
    version: 1,
    topicId: 'time-speed-distance',
    conceptId: 'tsd-applications',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tsd-basic', 'tsd-late-early'],
    estimatedSeconds: 45,
    params(rng) {
      const s = rng.pick([4, 5, 6, 10, 12, 15, 20, 24, 30, 36, 40, 45, 48, 50, 60]);
      const d = rng.int(2, 60);
      const travel = (60 * d) / s;
      if (!Number.isInteger(travel) || travel < 20 || travel > 180) return null;
      const m = rng.int(5, 30);
      if (m > travel - 10) return null;
      return { s, d, travel, m, late: rng.chance(0.5) };
    },
    answer: ({ travel, m, late }) => (late ? travel - m : travel + m),
    formatValue: (value) => minutes(value),
    distractors: ({ s, d, travel, m, late }) => [
      { value: late ? travel + m : travel - m, why: late ? 'added the late minutes instead of taking them off' : 'took the early minutes off instead of adding them' },
      { value: travel, why: 'gave the actual journey time' },
      { value: (100 * d) / s + (late ? -m : m), why: 'used 100 minutes in an hour' }
    ],
    // Rebuild the actual trip from the on-time answer and check it covers d km.
    verify: ({ s, d, m, late }, value) => nearlyEqual(((late ? value + m : value - m) * s) / 60, d),
    render({ s, d, travel, m, late }) {
      const verb = s <= 6 ? 'Walking' : s <= 24 ? 'Cycling' : 'Driving';
      const ans = late ? travel - m : travel + m;
      return {
        question: `${verb} at ${s} km/hr, a man covers ${d} km to his office and arrives ${m} minutes ${late ? 'late' : 'early'}. How many minutes should the journey take for him to arrive exactly on time?`,
        explanation: `His journey takes ${d} ÷ ${s} hour = ${travel} minutes. He is ${m} minutes ${late ? 'late, so the right time is' : 'early, so the right time is'} ${travel} ${late ? '−' : '+'} ${m} = ${ans} minutes.`,
        solutionSteps: [`Actual time = ${d} ÷ ${s} × 60 = ${travel} minutes.`, `${late ? 'Late' : 'Early'} by ${m} → on-time journey = ${travel} ${late ? '−' : '+'} ${m} = ${ans} minutes.`],
        method: 'Actual time ∓ the minutes late or early.',
        hints: ['First find how long the journey actually takes.', late ? 'Arriving late means he took longer than he should.' : 'Arriving early means he took less time than he had.'],
        commonMistakes: [late ? 'Adding the late minutes.' : 'Subtracting the early minutes.']
      };
    }
  },

  /* ================================ trains ================================ */
  {
    id: 'tr-pole-time-speed',
    version: 1,
    topicId: 'trains',
    conceptId: 'tr-pole',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tr-pole-f', 'tr-convert-f'],
    estimatedSeconds: 45,
    params(rng) {
      const k = rng.int(2, 6);
      const t = rng.int(4, 20);
      return { s: 18 * k, v: 5 * k, t, L: 5 * k * t, ask: rng.pick(['time', 'speed']), object: rng.pick(['a signal post', 'a telegraph pole', 'a man standing on the platform', 'a tree beside the track']) };
    },
    answer: ({ s, t, ask }) => (ask === 'time' ? t : s),
    formatValue: (value, { ask }) => (ask === 'time' ? seconds(value) : format.kmh(value)),
    distractors: ({ s, v, t, L, ask }) =>
      ask === 'time'
        ? [
            { value: L / s, why: 'did not convert km/hr into m/s' },
            { value: L / ((s * 18) / 5), why: 'converted with 18/5 instead of 5/18' },
            { value: L * v, why: 'multiplied length by speed' }
          ]
        : [
            { value: L / t, why: 'stopped at m/s and did not convert to km/hr' },
            { value: ((L / t) * 5) / 18, why: 'converted with 5/18 instead of 18/5' },
            { value: (L / t) * 60, why: 'multiplied m/s by 60 instead of by 18/5' }
          ],
    verify: ({ s, t, L, ask }, value) => (ask === 'time' ? nearlyEqual(((s * 1000) / 3600) * value, L) : nearlyEqual(((value * 1000) / 3600) * t, L)),
    render({ s, v, t, L, ask, object }) {
      return {
        question:
          ask === 'time'
            ? `A train ${L} m long runs at ${s} km/hr. How long does it take to pass ${object}?`
            : `A train ${L} m long passes ${object} in ${t} seconds. What is its speed in km/hr?`,
        explanation:
          ask === 'time'
            ? `Passing a point means covering the train's own length. ${s} km/hr = ${s} × 5/18 = ${v} m/s, so time = ${L} ÷ ${v} = ${t} seconds.`
            : `Passing a point means covering the train's own length: ${L} m in ${t} s = ${v} m/s. In km/hr: ${v} × 18/5 = ${s} km/hr.`,
        solutionSteps:
          ask === 'time'
            ? ['Distance = train length = ' + L + ' m.', `${s} × 5/18 = ${v} m/s.`, `${L} ÷ ${v} = ${t} s.`]
            : [`Distance = ${L} m.`, `Speed = ${L} ÷ ${t} = ${v} m/s.`, `${v} × 18/5 = ${s} km/hr.`],
        method: 'Distance = train length; convert with 5/18 or 18/5.',
        hints: ['How far does the train travel to pass a single point?', ask === 'time' ? 'The time is in seconds, so convert the speed into m/s.' : 'Find m/s first, then multiply by 18/5.'],
        commonMistakes: ['Mixing km/hr with metres and seconds without converting.']
      };
    }
  },

  {
    id: 'tr-pole-speed-ratio',
    version: 1,
    topicId: 'trains',
    conceptId: 'tr-pole',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tr-pole-f'],
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.int(2, 7);
      const b = rng.int(2, 7);
      if (a === b || gcd(a, b) !== 1) return null;
      const w = rng.int(2, 5);
      const t1 = rng.int(6, 25);
      const t2 = rng.int(6, 25);
      const L1 = a * w * t1;
      const L2 = b * w * t2;
      if (L1 < 80 || L2 < 80 || L1 > 600 || L2 > 600 || t1 === t2 || L1 === L2) return null;
      return { L1, L2, t1, t2 };
    },
    answer: ({ L1, L2, t1, t2 }) => ratioText(reduceRatio(L1 * t2, L2 * t1)),
    formatValue: (value) => value,
    distractors: ({ L1, L2, t1, t2 }) => [
      { value: ratioText(reduceRatio(t1, t2)), why: 'compared the times only' },
      { value: ratioText(reduceRatio(L1, L2)), why: 'compared the lengths only' },
      { value: ratioText(reduceRatio(L2 * t1, L1 * t2)), why: 'wrote the ratio the wrong way round' },
      { value: ratioText(reduceRatio(L1 * t1, L2 * t2)), why: 'multiplied length by time' }
    ],
    // Speeds in m/s, cross-multiplied.
    verify({ L1, L2, t1, t2 }, text) {
      const [a, b] = parseRatio(text);
      return gcd(a, b) === 1 && nearlyEqual(a * (L2 / t2), b * (L1 / t1));
    },
    render({ L1, L2, t1, t2 }) {
      const v1 = L1 / t1;
      const v2 = L2 / t2;
      const answer = ratioText(reduceRatio(L1 * t2, L2 * t1));
      return {
        question: `A train ${L1} m long passes a signal in ${t1} seconds. Another train, ${L2} m long, passes the same signal in ${t2} seconds. What is the ratio of the speed of the first train to that of the second?`,
        explanation: `Passing a signal covers each train's own length. Speeds: ${L1} ÷ ${t1} = ${fmt(v1)} m/s and ${L2} ÷ ${t2} = ${fmt(v2)} m/s, so the ratio is ${fmt(v1)} : ${fmt(v2)} = ${answer}.`,
        solutionSteps: [`First: ${L1} ÷ ${t1} = ${fmt(v1)} m/s.`, `Second: ${L2} ÷ ${t2} = ${fmt(v2)} m/s.`, `Ratio = ${answer}.`],
        method: 'Speed = own length ÷ time to pass a point.',
        hints: ['What distance does each train cover to pass the signal?', 'Work out each speed, then simplify the ratio.'],
        commonMistakes: ['Comparing only the times, ignoring that the trains have different lengths.']
      };
    }
  },

  {
    id: 'tr-same-pass-man',
    version: 1,
    topicId: 'trains',
    conceptId: 'tr-same',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tr-same-f', 'tr-convert-f'],
    estimatedSeconds: 60,
    params(rng) {
      const u = rng.pick([3, 4, 5, 6, 9, 12, 15]);
      const k = rng.int(1, 5);
      const s = u + 18 * k;
      const t = rng.int(6, 30);
      const L = 5 * k * t;
      if (s > 110 || L < 50 || L > 400) return null;
      return { u, k, s, t, L, ask: rng.pick(['time', 'speed']) };
    },
    answer: ({ s, t, ask }) => (ask === 'time' ? t : s),
    formatValue: (value, { ask }) => (ask === 'time' ? seconds(value) : format.kmh(value)),
    distractors: ({ u, s, t, L, ask }) =>
      ask === 'time'
        ? [
            { value: L / (((s + u) * 5) / 18), why: 'added the speeds' },
            { value: L / ((s * 5) / 18), why: "ignored the man's speed" },
            { value: L / (s - u), why: 'did not convert km/hr into m/s' }
          ]
        : [
            { value: ((L / t) * 18) / 5, why: "gave only the relative speed and forgot to add the man's speed" },
            { value: ((L / t) * 18) / 5 - u, why: "subtracted the man's speed instead of adding it" },
            { value: u + L / t, why: 'did not convert m/s into km/hr' }
          ],
    verify: ({ u, s, t, L, ask }, value) => (ask === 'time' ? nearlyEqual(((s - u) / 3.6) * value, L) : nearlyEqual(((value - u) / 3.6) * t, L)),
    render({ u, k, s, t, L, ask }) {
      const who = u <= 6 ? 'a man walking' : 'a cyclist riding';
      const rel = 18 * k;
      return {
        question:
          ask === 'time'
            ? `A train ${L} m long, running at ${s} km/hr, overtakes ${who} at ${u} km/hr in the same direction. How many seconds does it take to pass him?`
            : `A train ${L} m long passes ${who} at ${u} km/hr in the same direction in ${t} seconds. What is the speed of the train?`,
        explanation:
          ask === 'time'
            ? `Same direction, so relative speed = ${s} − ${u} = ${rel} km/hr = ${rel} × 5/18 = ${5 * k} m/s. The train must cover its own ${L} m: ${L} ÷ ${5 * k} = ${t} seconds.`
            : `Relative speed = ${L} ÷ ${t} = ${5 * k} m/s = ${5 * k} × 18/5 = ${rel} km/hr. This is the train's speed minus the man's, so the train runs at ${rel} + ${u} = ${s} km/hr.`,
        solutionSteps:
          ask === 'time'
            ? [`Relative speed = ${s} − ${u} = ${rel} km/hr = ${5 * k} m/s.`, `Distance = ${L} m.`, `Time = ${L} ÷ ${5 * k} = ${t} s.`]
            : [`Relative speed = ${L} ÷ ${t} = ${5 * k} m/s = ${rel} km/hr.`, `Train speed = ${rel} + ${u} = ${s} km/hr.`],
        method: 'Same direction: subtract the speeds; distance = the train’s length.',
        hints: ['The man moves the same way, so the train gains on him only at the difference of the speeds.', 'Convert between km/hr and m/s with 5/18 or 18/5.'],
        commonMistakes: ['Adding the speeds for objects moving the same way.']
      };
    }
  },

  {
    id: 'tr-same-find-length',
    version: 1,
    topicId: 'trains',
    conceptId: 'tr-same',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['tr-same-f', 'tr-convert-f'],
    estimatedSeconds: 80,
    params(rng) {
      const k = rng.int(1, 4);
      const s2 = rng.int(30, 72);
      const s1 = s2 + 18 * k;
      const t = rng.int(10, 60);
      const total = 5 * k * t;
      if (s1 > 120 || total < 150 || total > 800 || total % 10 !== 0) return null;
      const L1 = 10 * rng.int(5, total / 10 - 5);
      return { s1, s2, k, t, L1, L2: total - L1, askSlow: rng.chance(0.5) };
    },
    answer: ({ L1, L2, askSlow }) => (askSlow ? L2 : L1),
    formatValue: (value) => metres(value),
    distractors({ s1, s2, t, L1, L2, askSlow }) {
      const known = askSlow ? L1 : L2;
      return [
        { value: L1 + L2, why: "forgot to subtract the known train's length" },
        { value: ((s1 + s2) / 3.6) * t - known, why: 'added the speeds' },
        { value: (s1 - s2) * t - known, why: 'did not convert km/hr into m/s' }
      ];
    },
    verify: ({ s1, s2, t, L1, L2, askSlow }, value) => nearlyEqual(((askSlow ? L1 : L2) + value) / ((s1 - s2) / 3.6), t),
    render({ s1, s2, k, t, L1, L2, askSlow }) {
      const total = L1 + L2;
      const [knownName, known, unknownName, unknown] = askSlow ? ['faster', L1, 'slower', L2] : ['slower', L2, 'faster', L1];
      return {
        question: `Two trains run in the same direction on parallel tracks at ${s1} km/hr and ${s2} km/hr. The ${knownName} train is ${known} m long. The faster train takes ${t} seconds to pass the slower one completely. How long is the ${unknownName} train?`,
        explanation: `Relative speed = ${s1} − ${s2} = ${18 * k} km/hr = ${5 * k} m/s. In ${t} s the faster train gains ${5 * k} × ${t} = ${total} m, which is the sum of the lengths. So the ${unknownName} train is ${total} − ${known} = ${unknown} m.`,
        solutionSteps: [`Relative speed = ${18 * k} km/hr = ${5 * k} m/s.`, `Sum of lengths = ${5 * k} × ${t} = ${total} m.`, `${total} − ${known} = ${unknown} m.`],
        method: 'Time × (S₁ − S₂) = L₁ + L₂.',
        hints: ['Overtaking completely means covering both lengths.', 'Same direction: use the difference of the speeds, in m/s.'],
        commonMistakes: ['Giving the sum of the lengths as the answer.', 'Adding the speeds.']
      };
    }
  },

  /* =========================== pipes and cisterns =========================== */
  {
    id: 'pc-rate-part-filled',
    version: 1,
    topicId: 'pipes-cisterns',
    conceptId: 'pc-rate',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pc-rate-f'],
    estimatedSeconds: 35,
    params(rng) {
      const n = rng.int(5, 24);
      const k = rng.int(2, n - 2);
      if (2 * k === n) return null;
      return { n, k, empty: rng.chance(0.5) };
    },
    answer: ({ n, k, empty }) => frac(empty ? n - k : k, n),
    formatValue: (value) => value,
    distractors: ({ n, k, empty }) =>
      empty
        ? [
            { value: frac(k, n), why: 'gave the part drained, not the part left' },
            { value: frac(1, n), why: "gave one hour's emptying" },
            { value: frac(n, n - k), why: 'turned the fraction upside down' }
          ]
        : [
            { value: frac(n, k), why: 'divided the hours the wrong way round' },
            { value: frac(1, n), why: "gave one hour's filling" },
            { value: frac(n - k, n), why: 'gave the part still empty' }
          ],
    // Call the tank n units, one unit moved per hour, and count hour by hour.
    verify({ n, k, empty }, text) {
      let water = empty ? n : 0;
      for (let hour = 1; hour <= k; hour++) water += empty ? -1 : 1;
      const [a, b] = parseFraction(text);
      return gcd(a, b) === 1 && a * n === b * water;
    },
    render({ n, k, empty }) {
      const moved = frac(k, n);
      const left = frac(n - k, n);
      return {
        question: empty
          ? `An outlet pipe can empty a full tank in ${n} hours. The tank is full and the outlet is opened for ${k} hours. What fraction of the tank is still full?`
          : `A pipe can fill an empty tank in ${n} hours. What fraction of the tank does it fill in ${k} hours?`,
        explanation: empty
          ? `The outlet removes 1/${n} of the tank each hour, so in ${k} hours it removes ${moved}, leaving 1 − ${moved} = ${left}.`
          : `The pipe adds 1/${n} of the tank each hour, so in ${k} hours it fills ${k} × 1/${n} = ${moved}.`,
        solutionSteps: empty ? [`Rate = −1/${n} per hour.`, `In ${k} hours: ${moved} drained.`, `Left: ${left}.`] : [`Rate = 1/${n} per hour.`, `In ${k} hours: ${k}/${n} = ${moved}.`],
        method: 'A pipe that takes n hours moves 1/n of the tank per hour.',
        hints: [`What fraction of the tank moves in one hour?`, `Multiply by ${k}${empty ? ', then subtract from the full tank' : ''}.`],
        commonMistakes: [empty ? 'Giving the fraction drained instead of the fraction left.' : `Writing ${n}/${k}.`]
      };
    }
  },

  {
    id: 'pc-rate-rest-of-tank',
    version: 1,
    topicId: 'pipes-cisterns',
    conceptId: 'pc-rate',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pc-rate-f'],
    estimatedSeconds: 50,
    params(rng) {
      const q = rng.int(3, 9);
      const p = rng.int(1, q - 1);
      if (gcd(p, q) !== 1 || q === 2 * p) return null;
      const m = rng.int(2, 12);
      return { p, q, m, k: p * m, empty: rng.chance(0.5) };
    },
    answer: ({ p, q, m }) => (q - p) * m,
    formatValue: (value) => minutes(value),
    distractors: ({ p, q, m, k }) => [
      { value: q * m, why: 'gave the time for the whole tank' },
      { value: k, why: 'assumed the rest takes as long as the first part' },
      { value: (p * k) / (q - p), why: 'inverted the ratio of the two parts' },
      { value: ((q - p) * k) / q, why: 'multiplied the time by the fraction left' }
    ],
    // Rate is (p/q) ÷ k per minute; rate × value must equal the part still to go.
    verify: ({ p, q, k }, value) => value * p === (q - p) * k,
    render({ p, q, m, k, empty }) {
      const rest = (q - p) * m;
      return {
        question: empty
          ? `An outlet pipe empties ${p}/${q} of a full tank in ${k} minutes. At the same rate, how many more minutes will it take to empty the tank completely?`
          : `A pipe fills ${p}/${q} of an empty tank in ${k} minutes. At the same rate, how many more minutes will it take to fill the tank completely?`,
        explanation: `${p}/${q} of the tank takes ${k} minutes, so 1/${q} takes ${k} ÷ ${p} = ${m} minute${m === 1 ? '' : 's'}. The remaining ${q - p}/${q} takes ${q - p} × ${m} = ${rest} minutes.`,
        solutionSteps: [`1/${q} of the tank → ${k} ÷ ${p} = ${m} min.`, `Remaining = 1 − ${p}/${q} = ${q - p}/${q}.`, `${q - p} × ${m} = ${rest} minutes.`],
        method: 'Time for one share, then multiply by the shares left.',
        hints: [`How long does 1/${q} of the tank take?`, `How many ${q}ths are still left?`],
        commonMistakes: ['Giving the time for the whole tank instead of the rest.']
      };
    }
  },

  /* ================================= races ================================= */
  {
    id: 'rc-circular-lap-times',
    version: 1,
    topicId: 'races',
    conceptId: 'rc-circular',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rc-circular-f'],
    estimatedSeconds: 65,
    params(rng) {
      const same = rng.chance(0.5);
      const [x, y] = rng.pick(same ? LAP_PAIRS.same : LAP_PAIRS.opposite);
      return { x, y, same };
    },
    answer: ({ x, y, same }) => (x * y) / (same ? y - x : x + y),
    formatValue: (value) => seconds(value),
    distractors: ({ x, y, same }) => [
      { value: lcm(x, y), why: 'gave the first meeting at the starting point, not anywhere' },
      { value: (x * y) / (same ? x + y : y - x), why: 'used the formula for the other direction' },
      { value: same ? y - x : x + y, why: same ? 'subtracted the lap times' : 'added the lap times' },
      { value: (x + y) / 2, why: 'averaged the lap times' }
    ],
    // Measure positions in 1/(x·y) of a lap and step second by second until the gap is a whole lap.
    verify({ x, y, same }, value) {
      for (let t = 1; t <= 100000; t++) {
        const gap = same ? t * y - t * x : t * y + t * x;
        if (gap % (x * y) === 0) return t === value;
      }
      return false;
    },
    render({ x, y, same }) {
      const T = (x * y) / (same ? y - x : x + y);
      return {
        question: `A and B start together from the same point on a circular track and run in ${same ? 'the same direction' : 'opposite directions'}. A completes a lap in ${x} seconds and B in ${y} seconds. After how many seconds do they first meet anywhere on the track?`,
        explanation: same
          ? `A runs 1/${x} of a lap per second and B 1/${y}. Running the same way, A gains 1/${x} − 1/${y} = ${frac(y - x, x * y)} of a lap per second, and they meet when A has gained one full lap: ${fmt(x * y)} ÷ ${y - x} = ${T} seconds.`
          : `A runs 1/${x} of a lap per second and B 1/${y}. Running towards each other, together they cover 1/${x} + 1/${y} = ${frac(x + y, x * y)} of a lap per second, and they meet when they have covered one lap between them: ${fmt(x * y)} ÷ ${x + y} = ${T} seconds.`,
        solutionSteps: [
          same ? `Gain per second = 1/${x} − 1/${y} = ${frac(y - x, x * y)} lap.` : `Combined per second = 1/${x} + 1/${y} = ${frac(x + y, x * y)} lap.`,
          `One lap ÷ that rate = ${T} seconds.`
        ],
        method: same ? 'Same direction: first meeting when the faster has gained one lap.' : 'Opposite directions: first meeting when together they have run one lap.',
        hints: ['Turn each lap time into a fraction of a lap per second.', same ? 'Subtract the rates — the faster runner must gain a full lap.' : 'Add the rates — between them they close one lap.'],
        commonMistakes: [`Giving the LCM ${lcm(x, y)}, which is when they first meet at the starting point.`]
      };
    }
  },

  {
    id: 'rc-circular-start-point',
    version: 1,
    topicId: 'races',
    conceptId: 'rc-circular',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['rc-circular-f'],
    estimatedSeconds: 75,
    params(rng) {
      const L = rng.pick([200, 240, 300, 360, 400, 450, 480, 500, 600, 720, 800, 900, 1000, 1200]);
      const speeds = [];
      for (let s = 2; s <= 12; s++) if (L % s === 0) speeds.push(s);
      const a = rng.pick(speeds);
      const b = rng.pick(speeds);
      if (a <= b) return null;
      const T = lcm(L / a, L / b);
      if (T > 3600) return null;
      return { L, a, b, same: rng.chance(0.5) };
    },
    answer: ({ L, a, b }) => lcm(L / a, L / b),
    formatValue: (value) => seconds(value),
    distractors: ({ L, a, b, same }) => [
      { value: L / (same ? a - b : a + b), why: 'gave the first meeting anywhere on the track, not at the start' },
      { value: (L / a) * (L / b), why: 'multiplied the lap times instead of taking their LCM' },
      { value: L / b, why: "gave the slower runner's lap time" },
      { value: L / a, why: "gave the faster runner's lap time" },
      { value: L / a + L / b, why: 'added the lap times' }
    ],
    // Step second by second until both runners are exactly at the start together.
    verify({ L, a, b }, value) {
      for (let t = 1; t <= 100000; t++) if ((a * t) % L === 0 && (b * t) % L === 0) return t === value;
      return false;
    },
    render({ L, a, b, same }) {
      const x = L / a;
      const y = L / b;
      const T = lcm(x, y);
      return {
        question: `Two runners start together from the starting point of a ${L} m circular track and run in ${same ? 'the same direction' : 'opposite directions'} at ${a} m/s and ${b} m/s. After how many seconds do they first meet again at the starting point?`,
        explanation: `The faster runner is back at the start every ${L} ÷ ${a} = ${x} s and the slower every ${L} ÷ ${b} = ${y} s. Both are there together first at LCM(${x}, ${y}) = ${T} seconds. The direction does not matter for meeting at the start.`,
        solutionSteps: [`Lap times: ${x} s and ${y} s.`, `LCM(${x}, ${y}) = ${T} s.`],
        method: 'Meeting at the starting point = LCM of the lap times.',
        hints: ['When is each runner back at the starting point?', 'Find the first time that is a whole number of laps for both.'],
        commonMistakes: [`Giving ${fmt(L / (same ? a - b : a + b))} s, the first meeting anywhere on the track.`]
      };
    }
  },

  /* ================================= clocks ================================= */
  {
    id: 'clk-hand-turn',
    version: 1,
    topicId: 'clocks',
    conceptId: 'clk-speed',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['clk-speed-f'],
    answerDecimals: 1,
    estimatedSeconds: 40,
    params(rng) {
      const hand = rng.pick(['hour', 'minute']);
      const E = 5 * (hand === 'hour' ? rng.int(4, 96) : rng.int(2, 24));
      const S = 5 * rng.int(12, 143);
      if (S + E >= 720) return null;
      return { hand, S, E };
    },
    answer: ({ hand, E }) => (hand === 'hour' ? E / 2 : 6 * E),
    formatValue: (value) => degrees(value),
    distractors({ hand, S, E }) {
      const wholeHours = Math.floor((S + E) / 60) - Math.floor(S / 60);
      const minuteChange = 6 * ((((S + E) % 60) - (S % 60) + 60) % 60);
      return hand === 'hour'
        ? [
            { value: 6 * E, why: "used the minute hand's 6° a minute" },
            { value: wholeHours ? 30 * wholeHours : null, why: 'counted only the whole hours, at 30° each' },
            { value: 5.5 * E, why: 'used the 5.5° a minute that the minute hand gains' },
            { value: E / 4, why: 'took the hour hand to go round once a day instead of every 12 hours' }
          ]
        : [
            { value: E / 2, why: "used the hour hand's 0.5° a minute" },
            { value: 5.5 * E, why: 'used the 5.5° a minute gain instead of the minute hand’s own speed' },
            { value: minuteChange || null, why: 'looked only at the change in the minute reading' },
            { value: 360 * Math.floor(E / 60) || null, why: 'counted only the complete turns' },
            { value: 360 * wholeHours || null, why: 'counted one full turn for each change in the hour reading' },
            { value: (6 * E) / 5, why: 'took 6° for each 5-minute mark instead of each minute' },
            { value: 30 * E, why: 'used 30° a minute, the angle between hour marks' }
          ];
    },
    // Step minute by minute, reading each hand's position off the clock and adding the movement.
    verify({ hand, S, E }, value) {
      const position = (t) => (hand === 'hour' ? (t % 720) * 0.5 : (t % 60) * 6);
      let total = 0;
      for (let t = S; t < S + E; t++) total += (position(t + 1) - position(t) + 360) % 360;
      return nearlyEqual(total, value);
    },
    render({ hand, S, E }) {
      const time = (t) => `${Math.floor(t / 60)}:${pad2(t % 60)}`;
      const rate = hand === 'hour' ? 0.5 : 6;
      const ans = rate * E;
      return {
        question: `Through how many degrees does the ${hand} hand of a clock turn between ${time(S)} and ${time(S + E)}?`,
        explanation: `From ${time(S)} to ${time(S + E)} is ${E} minutes. The ${hand} hand turns ${hand === 'hour' ? '360° in 12 hours, i.e. 0.5°' : '360° in 60 minutes, i.e. 6°'} a minute, so it turns ${E} × ${rate} = ${fmt(ans, 1)}°.`,
        solutionSteps: [`Elapsed time = ${E} minutes.`, `${hand === 'hour' ? 'Hour' : 'Minute'} hand speed = ${rate}° per minute.`, `${E} × ${rate} = ${fmt(ans, 1)}°.`],
        method: 'Degrees = minutes × hand speed (6° or 0.5° a minute).',
        hints: ['How many minutes pass between the two times?', hand === 'hour' ? 'The hour hand goes round once in 12 hours (720 minutes).' : 'The minute hand goes round once every 60 minutes.'],
        commonMistakes: [hand === 'hour' ? 'Counting only whole hours and ignoring the extra minutes.' : 'Ignoring the full turns the minute hand makes.']
      };
    }
  },

  {
    id: 'clk-minute-gain',
    version: 1,
    topicId: 'clocks',
    conceptId: 'clk-speed',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['clk-speed-f'],
    answerDecimals: 1,
    estimatedSeconds: 45,
    params(rng) {
      const mode = rng.pick(['time', 'angle']);
      const t = mode === 'time' ? 2 * rng.int(1, 32) : rng.int(3, 60);
      return { mode, t, X: 5.5 * t };
    },
    answer: ({ mode, t, X }) => (mode === 'time' ? t : X),
    formatValue: (value, { mode }) => (mode === 'time' ? minutes(value) : degrees(value)),
    distractors: ({ mode, t, X }) =>
      mode === 'time'
        ? [
            { value: X / 6, why: 'ignored the hour hand moving' },
            { value: X / 6.5, why: 'added the speeds of the two hands' },
            { value: 2 * X, why: "used the hour hand's 0.5° a minute" }
          ]
        : [
            { value: 6 * t, why: 'ignored the hour hand moving' },
            { value: 6.5 * t, why: 'added the speeds of the two hands' },
            { value: 0.5 * t, why: "gave the hour hand's own turn" }
          ],
    // Start both hands at 12 and step minute by minute.
    verify({ mode, t, X }, value) {
      let minuteHand = 0;
      let hourHand = 0;
      for (let n = 1; n <= 120; n++) {
        minuteHand += 6;
        hourHand += 0.5;
        const lead = minuteHand - hourHand;
        if (mode === 'angle' && n === t) return nearlyEqual(lead, value);
        if (mode === 'time' && lead >= X - 1e-9) return nearlyEqual(lead, X) && n === value;
      }
      return false;
    },
    render({ mode, t, X }) {
      return {
        question:
          mode === 'time'
            ? `At 12 o'clock both hands of a clock point at 12. After how many minutes is the minute hand ${fmt(X, 1)}° ahead of the hour hand?`
            : `By how many degrees does the minute hand of a clock gain on the hour hand in ${t} minutes?`,
        explanation:
          mode === 'time'
            ? `The minute hand turns 6° a minute and the hour hand 0.5°, so the minute hand gains 5.5° a minute. To gain ${fmt(X, 1)}° it needs ${fmt(X, 1)} ÷ 5.5 = ${t} minutes.`
            : `The minute hand gains 6° − 0.5° = 5.5° on the hour hand every minute, so in ${t} minutes it gains ${t} × 5.5 = ${fmt(X, 1)}°.`,
        solutionSteps: ['Gain per minute = 6° − 0.5° = 5.5°.', mode === 'time' ? `${fmt(X, 1)} ÷ 5.5 = ${t} minutes.` : `${t} × 5.5 = ${fmt(X, 1)}°.`],
        method: 'Relative speed of the hands = 5.5° a minute.',
        hints: ['The hour hand is not still — it moves 0.5° each minute.', 'Subtract the two speeds to get the gain per minute.'],
        commonMistakes: ['Using 6° a minute and forgetting that the hour hand also moves.']
      };
    }
  },

  {
    id: 'clk-hands-event-time',
    version: 1,
    topicId: 'clocks',
    conceptId: 'clk-coincide',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['clk-coincide-f', 'clk-sc-time-for-angle'],
    estimatedSeconds: 75,
    params(rng) {
      const kind = rng.pick(['together', 'opposite', 'right']);
      const h = rng.int(1, 11);
      const gaps = [];
      for (const lead of CLOCK_EVENTS[kind].leads) {
        for (let k = -1; k <= 1; k++) {
          const gap = 30 * h + lead + 360 * k;
          if (gap > 0 && 2 * gap < 660) gaps.push(gap);
        }
      }
      if (!gaps.length) return null;
      gaps.sort((x, y) => x - y);
      return { kind, h, gap: gaps[0], second: gaps[1] ?? null };
    },
    answer: ({ h, gap }) => clockTime(h, 2 * gap, 11),
    formatValue: (value) => value,
    distractors: ({ h, gap, second }) => [
      { value: clockTime(h, gap, 6), why: 'ignored the hour hand (used 6° a minute)' },
      { value: clockTime(h, 11 * gap, 72), why: 'multiplied the minute spaces by 11/12 instead of 12/11' },
      { value: clockTime(h, 2 * gap, 13), why: 'added the speeds of the hands (6.5° a minute)' },
      { value: second ? clockTime(h, 2 * second, 11) : null, why: 'gave the second right-angle time in that hour' }
    ],
    // Step both hands 1/11 minute at a time from h o'clock and stop at the first matching position.
    verify({ kind, h }, text) {
      const hits = clockEvents(h, 660, CLOCK_EVENTS[kind].leads, false);
      return hits.length > 0 && clockTime(h, hits[0], 11) === text;
    },
    render({ kind, h, gap }) {
      const answer = clockTime(h, 2 * gap, 11);
      const offset = gap - 30 * h;
      const gapText = offset === 0 ? `${30 * h}°` : `${30 * h}° ${offset > 0 ? '+' : '−'} ${Math.abs(offset)}° = ${gap}°`;
      const what = { together: 'catch up with the hour hand', opposite: 'be 180° away from the hour hand', right: 'be 90° away from the hour hand' }[kind];
      return {
        question:
          kind === 'right'
            ? `At what time between ${h} and ${h + 1} o'clock are the hands of a clock first at right angles?`
            : `At what time between ${h} and ${h + 1} o'clock are the hands of a clock ${CLOCK_EVENTS[kind].phrase}?`,
        explanation: `At ${h}:00 the hour hand is ${30 * h}° ahead of the minute hand. To ${what}, the minute hand must gain ${gapText}. It gains 5.5° a minute, so it needs ${gap} ÷ 5.5 = ${gap} × 2/11 = ${mixedMinutes(2 * gap, 11)} minutes. The time is ${answer}.`,
        solutionSteps: [`Gap at ${h}:00 = ${30 * h}°.`, `Angle to gain = ${gapText}.`, `Minutes = ${gap} × 2/11 = ${mixedMinutes(2 * gap, 11)}.`, `Time = ${answer}.`],
        method: 'Minutes past h = (2/11) × (angle the minute hand must gain).',
        hints: [`Where is the hour hand at exactly ${h} o'clock?`, 'How many degrees must the minute hand gain, at 5.5° a minute?'],
        commonMistakes: ['Dividing by 6 instead of 5.5, as if the hour hand stood still.']
      };
    }
  },

  {
    id: 'clk-count-events',
    version: 1,
    topicId: 'clocks',
    conceptId: 'clk-coincide',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['clk-sc-counts', 'clk-coincide-f'],
    estimatedSeconds: 60,
    params(rng) {
      const kind = rng.pick(['together', 'opposite', 'right']);
      const span = rng.pick(['12', '24', 'interval', 'interval', 'interval']);
      if (span !== 'interval') return { kind, span };
      const h1 = rng.int(1, 8);
      const h2 = rng.int(h1 + 2, 11);
      const onTheHour = { together: [], opposite: [6], right: [3, 9] }[kind];
      if (onTheHour.includes(h1) || onTheHour.includes(h2)) return null;
      return { kind, span, h1, h2 };
    },
    answer({ kind, span, h1, h2 }) {
      if (span === '12') return 11 * CLOCK_EVENTS[kind].perHour;
      if (span === '24') return 22 * CLOCK_EVENTS[kind].perHour;
      return clockEventTicks(kind, h1, h2).length;
    },
    formatValue: (value) => `${value} time${value === 1 ? '' : 's'}`,
    distractors({ kind, span, h1, h2 }) {
      const per = CLOCK_EVENTS[kind].perHour;
      if (span === '12') {
        return [
          { value: 12 * per, why: per === 1 ? 'assumed it happens once every hour' : 'assumed it happens twice every hour' },
          { value: 22 * per, why: 'gave the count for a full day' },
          { value: per === 1 ? 22 : 11, why: per === 1 ? 'used the count for right angles' : 'used the count for overlaps' },
          { value: 13 * per, why: 'counted the 12 o’clock position at both the start and the end' }
        ];
      }
      if (span === '24') {
        return [
          { value: 24 * per, why: per === 1 ? 'assumed it happens once every hour' : 'assumed it happens twice every hour' },
          { value: 11 * per, why: 'gave the count for 12 hours only' },
          { value: per === 1 ? 44 : 22, why: per === 1 ? 'used the count for right angles' : 'used the count for overlaps' },
          { value: 25 * per, why: 'counted the midnight position at both the start and the end' }
        ];
      }
      return [
        { value: (h2 - h1) * per, why: per === 1 ? 'assumed it happens once every hour' : 'assumed it happens twice every hour' },
        { value: (h2 - h1 + 1) * per, why: `counted each hour from ${h1} to ${h2} inclusive` },
        { value: (h2 - h1 - 1) * per, why: 'counted only the hours strictly between the two times' },
        { value: (h2 - h1) * (per === 1 ? 2 : 1), why: per === 1 ? 'used the right-angle rate of twice an hour' : 'used the overlap rate of once an hour' }
      ];
    },
    // Simulate both hands 1/11 minute at a time and count the matching positions.
    verify({ kind, span, h1, h2 }, value) {
      const { leads } = CLOCK_EVENTS[kind];
      const hits = span === 'interval' ? clockEvents(h1, (h2 - h1) * 660, leads, false) : clockEvents(0, Number(span) * 660, leads, true);
      return hits.length === value;
    },
    render({ kind, span, h1, h2 }) {
      const per = CLOCK_EVENTS[kind].perHour;
      const phrase = CLOCK_EVENTS[kind].phrase;
      if (span !== 'interval') {
        const base = 11 * per;
        return {
          question: `How many times are the hands of a clock ${phrase} in ${span === '12' ? '12 hours' : 'a day (24 hours)'}?`,
          explanation: `The minute hand gains 360° on the hour hand only 11 times in 12 hours (every 65 5/11 minutes), so each position${per === 2 ? ' — and there are two right-angle positions —' : ''} recurs 11 times in 12 hours: ${base} times${span === '24' ? `, and ${2 * base} times in a day` : ''}.`,
          solutionSteps: [`In 12 hours the minute hand laps the hour hand 11 times, not 12.`, `${phrase[0].toUpperCase() + phrase.slice(1)}: ${per} × 11 = ${base} times in 12 hours.`, ...(span === '24' ? [`A day: 2 × ${base} = ${2 * base}.`] : [])],
          method: 'In 12 hours: coincide 11, opposite 11, right angles 22.',
          hints: ['The two hands are both moving; the minute hand gains 5.5° a minute.', 'Between 11 and 1 o’clock the hands overlap only once (at 12).'],
          commonMistakes: ['Assuming one event every hour, giving 12 (or 24) instead of 11 (or 22).']
        };
      }
      const times = clockEventTicks(kind, h1, h2).map((tick) => clockTime(Math.floor(tick / 660), tick % 660 || 660, 11) ?? `${Math.floor(tick / 660)}:00`);
      const value = times.length;
      return {
        question: `How many times are the hands of a clock ${phrase} between ${h1} o'clock and ${h2} o'clock?`,
        explanation: `The hands are ${phrase} every ${per === 1 ? '65 5/11 minutes' : '32 8/11 minutes'}, not exactly ${per === 1 ? 'once' : 'twice'} an hour. Between ${h1}:00 and ${h2}:00 this happens at ${times.join(', ')} — ${value} time${value === 1 ? '' : 's'}.`,
        solutionSteps: [
          `Times past 12: minutes = (2/11) × (${CLOCK_EVENTS[kind].leads.join('° or ')}° + 360°k).`,
          `Those between ${h1}:00 and ${h2}:00: ${times.join(', ')}.`,
          `Count = ${value}.`
        ],
        method: 'Event times are (2/11)(θ + 360k) minutes past 12; count those in the window.',
        hints: ['Use minutes past 12 o’clock for every event.', 'Check whether one falls near the start or end of the window — that is where the count differs from one per hour.'],
        commonMistakes: ['Counting one per hour (two for right angles) without checking the actual times.']
      };
    }
  },
  /* =============================== calendars =============================== */
  {
    id: 'cal-century-odd-days',
    version: 1,
    topicId: 'calendars',
    conceptId: 'cal-century',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['cal-century-f', 'cal-odd-f'],
    estimatedSeconds: 40,
    params: (rng) => ({ c: rng.int(1, 30) }),
    answer: ({ c }) => CENTURY_ODD[c % 4],
    formatValue: (value) => `${value} odd day${value === 1 ? '' : 's'}`,
    distractors: ({ c }) => [
      { value: (5 * c) % 7, why: 'gave every century 5 odd days, ignoring the 400-year rule' },
      { value: (6 * c) % 7, why: 'counted 25 leap years in every century' },
      { value: (2 * c) % 7, why: 'counted every year as 365 days' },
      { value: 5 * c + Math.floor(c / 4) > 6 ? 5 * c + Math.floor(c / 4) : null, why: 'did not reduce the total modulo 7' },
      { value: (CENTURY_ODD[c % 4] + 1) % 7, why: 'counted one leap year too many' },
      { value: (CENTURY_ODD[c % 4] + 6) % 7, why: 'counted one leap year too few' }
    ],
    // Count the actual days with Date across an aligned span of years (1601 starts a 400-year cycle).
    verify({ c }, value) {
      const days = (Date.UTC(1601 + 100 * c, 0, 1) - Date.UTC(1601, 0, 1)) / 86400000;
      return days % 7 === value;
    },
    render({ c }) {
      const N = 100 * c;
      const rest = c % 4;
      const odd = CENTURY_ODD[rest];
      const blocks = Math.floor(c / 4);
      return {
        question: `How many odd days are there in ${fmt(N)} years?`,
        explanation: blocks
          ? `${fmt(N)} years = ${blocks} × 400 years${rest ? ` + ${rest * 100} years` : ''}. Every 400 years has 0 odd days${rest ? `, and ${rest * 100} years have ${odd}` : ''}, so ${fmt(N)} years have ${odd} odd day${odd === 1 ? '' : 's'}.`
          : `${N} years have ${odd} odd day${odd === 1 ? '' : 's'}: each century has 5 odd days (76 ordinary + 24 leap years = 124 odd days), so ${rest} × 5 = ${rest * 5}, and ${rest * 5} mod 7 = ${odd}.`,
        solutionSteps: [
          '100 → 5, 200 → 3, 300 → 1, 400 → 0 odd days.',
          blocks ? `Drop the ${blocks} whole 400-year block${blocks === 1 ? '' : 's'}: ${rest * 100} years remain.` : `${N} years is ${rest} centur${rest === 1 ? 'y' : 'ies'}.`,
          `Odd days = ${odd}.`
        ],
        method: 'Remove whole 400-year cycles; 100, 200, 300 years give 5, 3, 1 odd days.',
        hints: ['A 400-year cycle has exactly 0 odd days.', 'How many years are left after removing whole 400-year cycles?'],
        commonMistakes: ['Giving every century 5 odd days, forgetting that the 400th year is a leap year.']
      };
    }
  },

  {
    id: 'cal-century-boundary-day',
    version: 1,
    topicId: 'calendars',
    conceptId: 'cal-century',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cal-century-f', 'cal-dow-f'],
    estimatedSeconds: 60,
    params: (rng) => ({ c: rng.int(16, 30), next: rng.chance(0.5) }),
    answer: ({ c, next }) => DAYS[(CENTURY_ODD[c % 4] + (next ? 1 : 0)) % 7],
    formatValue: (value) => value,
    distractors({ c, next }) {
      const shift = next ? 1 : 0;
      const odd = CENTURY_ODD[c % 4];
      return [
        { value: DAYS[((5 * c) % 7 + shift) % 7], why: 'gave every century 5 odd days, ignoring the 400-year rule' },
        { value: DAYS[((6 * c) % 7 + shift) % 7], why: 'treated every century year as a leap year' },
        { value: DAYS[((2 * c) % 7 + shift) % 7], why: 'counted every year as 365 days' },
        { value: DAYS[(odd + (next ? 0 : 1)) % 7], why: next ? 'gave the day of 31 December instead of the next day' : 'counted one leap year too many' },
        { value: DAYS[(odd + shift + 6) % 7], why: 'counted one leap year too few' },
        { value: DAYS[(odd + shift + 2) % 7], why: 'counted two leap years too many' }
      ];
    },
    // Read the weekday straight from Date.
    verify({ c, next }, value) {
      const Y = 100 * c;
      const date = next ? Date.UTC(Y + 1, 0, 1) : Date.UTC(Y, 11, 31);
      return DAYS[new Date(date).getUTCDay()] === value;
    },
    render({ c, next }) {
      const Y = 100 * c;
      const rest = c % 4;
      const odd = CENTURY_ODD[rest];
      const day = DAYS[(odd + (next ? 1 : 0)) % 7];
      return {
        question: next ? `What day of the week is 1 January ${Y + 1}?` : `What day of the week is 31 December ${Y}?`,
        explanation: `From 1 January of year 1 to 31 December ${Y} there are ${Y} years. Whole 400-year blocks give 0 odd days; the remaining ${rest * 100} years give ${odd}. So 31 December ${Y} is a ${DAYS[odd]} (0 = Sunday, 1 = Monday, …)${next ? `, and 1 January ${Y + 1} is the next day, a ${day}` : ''}.`,
        solutionSteps: [`${Y} = ${Math.floor(c / 4)} × 400 + ${rest * 100}.`, `Odd days = ${odd} → 31 December ${Y} is a ${DAYS[odd]}.`, ...(next ? [`The next day is a ${day}.`] : [])],
        method: 'Odd days up to the end of the century, then 0 = Sunday, 1 = Monday, …',
        hints: ['How many odd days do 100, 200, 300 and 400 years have?', 'Count from 1 January of year 1, which was a Monday.'],
        commonMistakes: ['Forgetting that a century year divisible by 400 is a leap year.']
      };
    }
  },

  /* ============================ unit conversions ============================ */
  {
    id: 'uc-time-compound',
    version: 1,
    topicId: 'unit-conversions',
    conceptId: 'uc-time-speed',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['uc-time-f'],
    estimatedSeconds: 30,
    params(rng) {
      const mode = rng.pick(['hm', 'ms', 'dec']);
      if (mode === 'hm') return { mode, big: rng.int(1, 9), small: rng.int(1, 11) * 5 };
      if (mode === 'ms') return { mode, big: rng.int(1, 15), small: rng.int(2, 58) };
      return { mode, big: rng.int(1, 6), tenths: rng.pick([1, 2, 3, 4, 6, 7, 8, 9, 25, 75]) };
    },
    answer: ({ mode, big, small, tenths }) => (mode === 'dec' ? 60 * big + (60 * tenths) / (tenths > 9 ? 100 : 10) : 60 * big + small),
    formatValue: (value, { mode }) => (mode === 'ms' ? seconds(value) : minutes(value)),
    distractors({ mode, big, small, tenths }) {
      if (mode === 'dec') {
        const decimalPart = tenths > 9 ? tenths : tenths * 10;
        return [
          { value: 60 * big + decimalPart, why: `read .${tenths} hour as ${decimalPart} minutes` },
          { value: 100 * big + decimalPart, why: 'used 100 minutes in an hour' },
          { value: 60 * big, why: 'dropped the decimal part' }
        ];
      }
      return [
        { value: 100 * big + small, why: `used 100 ${mode === 'hm' ? 'minutes in an hour' : 'seconds in a minute'}` },
        { value: 60 * big, why: `left out the extra ${mode === 'hm' ? 'minutes' : 'seconds'}` },
        { value: big + small, why: 'added the numbers without converting' }
      ];
    },
    // Convert back to the larger unit and compare.
    verify: ({ mode, big, small, tenths }, value) =>
      mode === 'dec' ? nearlyEqual(value / 60, big + tenths / (tenths > 9 ? 100 : 10)) : nearlyEqual(value / 60, big + small / 60),
    render({ mode, big, small, tenths }) {
      if (mode === 'dec') {
        const decimal = big + tenths / (tenths > 9 ? 100 : 10);
        const extra = 60 * (decimal - big);
        return {
          question: `How many minutes are there in ${fmt(decimal)} hours?`,
          explanation: `${fmt(decimal)} hours = ${big} hour${big === 1 ? '' : 's'} + ${fmt(decimal - big)} hour. ${fmt(decimal - big)} × 60 = ${fmt(extra)} minutes, so the total is ${60 * big} + ${fmt(extra)} = ${fmt(60 * decimal)} minutes.`,
          solutionSteps: [`${big} × 60 = ${60 * big} minutes.`, `${fmt(decimal - big)} × 60 = ${fmt(extra)} minutes.`, `Total = ${fmt(60 * decimal)} minutes.`],
          method: 'Multiply hours by 60 — including the decimal part.',
          hints: ['A decimal of an hour is not the same as that many minutes.', `What is ${fmt(decimal - big)} of 60?`],
          commonMistakes: [`Reading ${fmt(decimal)} hours as ${big} hours ${tenths > 9 ? tenths : tenths * 10} minutes.`]
        };
      }
      const [bigUnit, smallUnit] = mode === 'hm' ? ['hour', 'minute'] : ['minute', 'second'];
      const total = 60 * big + small;
      return {
        question: `Express ${big} ${bigUnit}${big === 1 ? '' : 's'} ${small} ${smallUnit}s in ${smallUnit}s.`,
        explanation: `1 ${bigUnit} = 60 ${smallUnit}s${big === 1 ? '' : `, so ${big} ${bigUnit}s = ${60 * big} ${smallUnit}s`}. Adding ${small} gives ${total} ${smallUnit}s.`,
        solutionSteps: [`${big} × 60 = ${60 * big}.`, `${60 * big} + ${small} = ${total}.`],
        method: `${bigUnit}s × 60, then add the ${smallUnit}s.`,
        hints: [`How many ${smallUnit}s make one ${bigUnit}?`, `Convert the ${bigUnit}s first, then add.`],
        commonMistakes: [`Using 100 ${smallUnit}s in a ${bigUnit}.`]
      };
    }
  },

  {
    id: 'uc-speed-metres-minute',
    version: 1,
    topicId: 'unit-conversions',
    conceptId: 'uc-time-speed',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['uc-time-f', 'uc-rate-f'],
    answerDecimals: 1,
    estimatedSeconds: 45,
    params(rng) {
      const mode = rng.pick(['toKmh', 'toMmin', 'toMs']);
      if (mode === 'toKmh') return { mode, input: 50 * rng.int(1, 30) };
      if (mode === 'toMmin') return { mode, input: 3 * rng.int(1, 30) };
      return { mode, input: 30 * rng.int(1, 40) };
    },
    answer: ({ mode, input }) => (mode === 'toKmh' ? (input * 60) / 1000 : mode === 'toMmin' ? (input * 1000) / 60 : input / 60),
    formatValue: (value, { mode }) => `${fmt(value)} ${mode === 'toKmh' ? 'km/hr' : mode === 'toMmin' ? 'm/min' : 'm/s'}`,
    distractors({ mode, input }) {
      if (mode === 'toKmh') {
        return [
          { value: input * 60, why: 'converted minutes to hours but not metres to km' },
          { value: input / 1000, why: 'converted metres to km but not minutes to hours' },
          { value: input * 3.6, why: 'used the m/s factor 3.6' }
        ];
      }
      if (mode === 'toMmin') {
        return [
          { value: input * 1000, why: 'converted km to m but not hours to minutes' },
          { value: input * 60, why: 'multiplied by 60 instead of dividing' },
          { value: (input * 5) / 18, why: 'converted to m/s instead of m/min' }
        ];
      }
      return [
        { value: input * 60, why: 'multiplied by 60 instead of dividing' },
        { value: (input * 5) / 18, why: 'used the km/hr factor 5/18' },
        { value: input / 3600, why: 'divided by 3600 as if the speed were per hour' }
      ];
    },
    // Convert the answer back to the original unit.
    verify({ mode, input }, value) {
      if (mode === 'toKmh') return nearlyEqual((value * 1000) / 60, input);
      if (mode === 'toMmin') return nearlyEqual((value * 60) / 1000, input);
      return nearlyEqual(value * 60, input);
    },
    render({ mode, input }) {
      if (mode === 'toKmh') {
        const ans = (input * 60) / 1000;
        return {
          question: `A cyclist covers ${input} metres every minute. What is the speed in km/hr?`,
          explanation: `In an hour the cyclist covers ${input} × 60 = ${fmt(input * 60)} m = ${fmt(ans)} km, so the speed is ${fmt(ans)} km/hr.`,
          solutionSteps: [`Per hour: ${input} × 60 = ${fmt(input * 60)} m.`, `${fmt(input * 60)} ÷ 1000 = ${fmt(ans)} km.`],
          method: 'Convert the top unit and the bottom unit separately: × 60, then ÷ 1000.',
          hints: ['How many metres in one hour?', 'Then change metres into kilometres.'],
          commonMistakes: ['Converting only one of the two units.']
        };
      }
      if (mode === 'toMmin') {
        const ans = (input * 1000) / 60;
        return {
          question: `Convert ${input} km/hr into metres per minute.`,
          explanation: `${input} km = ${fmt(input * 1000)} m, covered in 60 minutes, so the speed is ${fmt(input * 1000)} ÷ 60 = ${fmt(ans)} m/min.`,
          solutionSteps: [`${input} km = ${fmt(input * 1000)} m per hour.`, `÷ 60 → ${fmt(ans)} m per minute.`],
          method: '× 1000 for km → m, ÷ 60 for per hour → per minute.',
          hints: ['Change km to metres.', 'A minute is 1/60 of an hour, so divide by 60.'],
          commonMistakes: ['Multiplying by 60 when changing "per hour" to "per minute".']
        };
      }
      const ans = input / 60;
      return {
        question: `Convert ${input} metres per minute into metres per second.`,
        explanation: `A minute has 60 seconds, so ${input} m per minute is ${input} ÷ 60 = ${fmt(ans)} m per second.`,
        solutionSteps: [`${input} m in 60 s.`, `${input} ÷ 60 = ${fmt(ans)} m/s.`],
        method: 'Per minute → per second: ÷ 60.',
        hints: ['Is a speed per second bigger or smaller than the same speed per minute?', 'Divide by 60.'],
        commonMistakes: ['Multiplying by 60.']
      };
    }
  },

  /* ============================== approximation ============================== */
  {
    id: 'ap-bias-direction',
    version: 1,
    topicId: 'approximation',
    conceptId: 'ap-bias',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ap-bias-f'],
    estimatedSeconds: 45,
    params(rng) {
      const op = rng.pick(['product', 'sum', 'quotient', 'difference']);
      const over = rng.chance(0.5);
      const name = rng.pick(NAMES);
      if (op === 'product') {
        const A = 10 * rng.int(2, 9);
        const B = 10 * rng.int(2, 9);
        const ea = rng.int(1, 4);
        const eb = rng.int(1, 4);
        return { op, over, name, A, B, a: over ? A - ea : A + ea, b: over ? B - eb : B + eb };
      }
      if (op === 'sum') {
        const A = 100 * rng.int(2, 9);
        const B = 100 * rng.int(2, 9);
        const ea = rng.int(1, 40);
        const eb = rng.int(1, 40);
        return { op, over, name, A, B, a: over ? A - ea : A + ea, b: over ? B - eb : B + eb };
      }
      if (op === 'quotient') {
        const B = 10 * rng.int(2, 9);
        const A = B * rng.int(5, 30);
        const ea = rng.int(1, 9);
        const eb = rng.int(1, 4);
        return { op, over, name, A, B, a: over ? A - ea : A + ea, b: over ? B + eb : B - eb };
      }
      const A = 10 * rng.int(30, 99);
      const B = 10 * rng.int(2, 25);
      const ea = rng.int(1, 4);
      const eb = rng.int(1, 4);
      return { op, over, name, A, B, a: over ? A - ea : A + ea, b: over ? B + eb : B - eb };
    },
    answer: ({ over }) => BIAS_CHOICES[over ? 0 : 1],
    formatValue: (value) => value,
    distractors: ({ op, over }) => [
      { value: BIAS_CHOICES[over ? 1 : 0], why: op === 'quotient' ? 'forgot that a smaller divisor gives a larger result' : op === 'difference' ? 'forgot that subtracting a smaller number leaves more' : 'reversed the direction of the error' },
      { value: BIAS_CHOICES[2], why: 'assumed rounding errors always cancel out' },
      { value: BIAS_CHOICES[3], why: 'thought the direction cannot be known without the exact value' }
    ],
    // Work out both values exactly (cross-multiplying for division) and compare.
    verify({ op, a, b, A, B }, text) {
      let diff;
      if (op === 'product') diff = A * B - a * b;
      else if (op === 'sum') diff = A + B - (a + b);
      else if (op === 'difference') diff = A - B - (a - b);
      else diff = A * b - a * B;
      return text === BIAS_CHOICES[diff > 0 ? 0 : diff < 0 ? 1 : 2];
    },
    render({ op, over, name, a, b, A, B }) {
      const sign = { product: '×', sum: '+', quotient: '÷', difference: '−' }[op];
      const word = over ? 'larger' : 'smaller';
      const why = {
        product: `Both numbers were rounded ${over ? 'up' : 'down'} (${a} → ${A}, ${b} → ${B}). Making both positive factors ${over ? 'bigger' : 'smaller'} makes the product ${word}.`,
        sum: `Both numbers were rounded ${over ? 'up' : 'down'} (${a} → ${A}, ${b} → ${B}), so the errors add and the total is ${word}.`,
        quotient: `The dividend was rounded ${over ? 'up' : 'down'} (${a} → ${A}) and the divisor ${over ? 'down' : 'up'} (${b} → ${B}). A ${over ? 'bigger' : 'smaller'} number divided by a ${over ? 'smaller' : 'bigger'} one gives a ${word} result.`,
        difference: `The first number was rounded ${over ? 'up' : 'down'} (${a} → ${A}) and the number taken away ${over ? 'down' : 'up'} (${b} → ${B}), so the gap is ${over ? 'wider' : 'narrower'} and the estimate is ${word}.`
      }[op];
      return {
        question: `To estimate ${a} ${sign} ${b}, ${name} works out ${A} ${sign} ${B} instead. Without calculating either value, how does the estimate compare with the exact value?`,
        explanation: `${why} So the estimate is ${word} than the exact value.`,
        solutionSteps: [`${a} → ${A}: rounded ${A > a ? 'up' : 'down'}.`, `${b} → ${B}: rounded ${B > b ? 'up' : 'down'}.`, `Effect on ${op === 'sum' ? 'a sum' : op === 'product' ? 'a product' : op === 'quotient' ? 'a quotient' : 'a difference'}: estimate is ${word}.`],
        method: op === 'product' || op === 'sum' ? 'Rounding everything the same way biases the answer the same way.' : 'Rounding the second number the opposite way pushes the answer in the same direction as the first.',
        hints: ['Was each number rounded up or down?', op === 'quotient' ? 'What happens to a quotient when the divisor gets smaller?' : op === 'difference' ? 'What happens to a difference when the number taken away gets smaller?' : 'If every part grows, what happens to the result?'],
        commonMistakes: ['Assuming rounding errors always cancel.']
      };
    }
  },

  {
    id: 'ap-bias-closest-estimate',
    version: 1,
    topicId: 'approximation',
    conceptId: 'ap-bias',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ap-bias-f', 'ap-sc-compensate'],
    estimatedSeconds: 70,
    params(rng) {
      const a = rng.int(12, 98);
      const b = rng.int(12, 98);
      if (a % 10 === 0 || b % 10 === 0 || a % 10 === 5 || b % 10 === 5 || a === b) return null;
      const aL = a - (a % 10);
      const bL = b - (b % 10);
      const pairs = [[aL + 10, bL + 10], [aL, bL], [aL + 10, bL], [aL, bL + 10]];
      const errors = pairs.map(([x, y]) => Math.abs(x * y - a * b));
      const best = Math.min(...errors);
      if (errors.filter((e) => e === best).length > 1 || errors.indexOf(best) < 2) return null;
      return { a, b };
    },
    answer: ({ a, b }) => closestPair(a, b),
    formatValue: (value) => value,
    distractors({ a, b }) {
      const aL = a - (a % 10);
      const bL = b - (b % 10);
      return [
        { value: `${aL + 10} × ${bL + 10}`, why: 'rounded both up, so the errors add' },
        { value: `${aL} × ${bL}`, why: 'rounded both down, so the errors add' },
        { value: `${aL + 10} × ${bL}`, why: 'compensated, but in the less effective direction' },
        { value: `${aL} × ${bL + 10}`, why: 'compensated, but in the less effective direction' }
      ];
    },
    // Error of (a + e)(b + f) is af + be + ef — compare those instead of the products.
    verify({ a, b }, text) {
      const aL = a - (a % 10);
      const bL = b - (b % 10);
      let bestText = '';
      let bestError = Infinity;
      for (const x of [aL, aL + 10]) {
        for (const y of [bL, bL + 10]) {
          const e = x - a;
          const f = y - b;
          const error = Math.abs(a * f + b * e + e * f);
          if (error < bestError) {
            bestError = error;
            bestText = `${x} × ${y}`;
          }
        }
      }
      return bestText === text;
    },
    render({ a, b }) {
      const aL = a - (a % 10);
      const bL = b - (b % 10);
      const exact = a * b;
      const lines = [[aL + 10, bL + 10], [aL, bL], [aL + 10, bL], [aL, bL + 10]].map(([x, y]) => `${x} × ${y} = ${fmt(x * y)} (off by ${fmt(Math.abs(x * y - exact))})`);
      return {
        question: `Each number in ${a} × ${b} is rounded to a multiple of 10. Which choice gives the estimate closest to the exact product?`,
        explanation: `The exact product is ${fmt(exact)}. ${lines.join('; ')}. Rounding one number up and the other down lets the errors partly cancel, and ${closestPair(a, b)} is closest.`,
        solutionSteps: [`Exact: ${a} × ${b} = ${fmt(exact)}.`, ...lines.map((line) => `${line}.`)],
        method: 'Round the two factors in opposite directions so the errors partly cancel.',
        hints: ['Rounding both numbers the same way makes the errors add up.', 'Of the two mixed choices, which rounds the larger number by less?'],
        commonMistakes: ['Rounding both numbers up (or both down) and accepting a large error.']
      };
    }
  },

  /* ================================ decimals ================================ */
  {
    id: 'dc-compare-extreme',
    version: 1,
    topicId: 'decimals',
    conceptId: 'dc-compare',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dc-compare-f'],
    estimatedSeconds: 35,
    tags: ['trap'],
    params(rng) {
      const set = decimalFamily(rng);
      return { ...set, ask: rng.pick(['greatest', 'smallest']), order: rng.shuffle([0, 1, 2, 3]) };
    },
    answer: ({ w, digits, ask }) => {
      const values = digits.map((d) => Number(`${w}.${d}`));
      const target = ask === 'greatest' ? Math.max(...values) : Math.min(...values);
      return `${w}.${digits[values.indexOf(target)]}`;
    },
    formatValue: (value) => value,
    distractors: ({ w, digits, ask }) =>
      ask === 'greatest'
        ? [
            { value: `${w}.${digits[1]}`, why: 'thought more decimal places means a larger number' },
            { value: `${w}.${digits[2]}`, why: 'compared the digits after the point as whole numbers' },
            { value: `${w}.${digits[3]}`, why: 'ignored the zero straight after the decimal point' }
          ]
        : [
            { value: `${w}.${digits[0]}`, why: 'thought fewer decimal places means a smaller number' },
            { value: `${w}.${digits[2]}`, why: 'thought the zero in the middle makes it the smallest' },
            { value: `${w}.${digits[1]}`, why: 'misread the place values' }
          ],
    // Pad every number to three decimal places and compare them as whole numbers.
    verify({ w, digits, ask }, text) {
      const scaled = digits.map((d) => w * 1000 + Number(d.padEnd(3, '0')));
      const target = ask === 'greatest' ? Math.max(...scaled) : Math.min(...scaled);
      return text === `${w}.${digits[scaled.indexOf(target)]}`;
    },
    render({ w, digits, ask, order }) {
      const texts = digits.map((d) => `${w}.${d}`);
      const padded = digits.map((d) => `${w}.${d.padEnd(3, '0')}`);
      const answer = ask === 'greatest' ? texts[0] : texts[3];
      return {
        question: `Which of these is the ${ask}: ${order.map((i) => texts[i]).join(', ')}?`,
        explanation: `Pad each number to three decimal places: ${order.map((i) => padded[i]).join(', ')}. Now compare digit by digit from the left: the ${ask} is ${answer}.`,
        solutionSteps: [`Padded: ${order.map((i) => padded[i]).join(', ')}.`, `Compare the first decimal digits, then the next.`, `The ${ask} is ${answer}.`],
        method: 'Line up the decimal points, pad with zeros, compare from the left.',
        hints: ['More digits after the point does not make a number bigger.', 'Write every number with the same number of decimal places.'],
        commonMistakes: [`Thinking ${texts[1]} is bigger than ${texts[0]} because it has more digits.`]
      };
    }
  },

  {
    id: 'dc-compare-order',
    version: 1,
    topicId: 'decimals',
    conceptId: 'dc-compare',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dc-compare-f'],
    estimatedSeconds: 50,
    tags: ['trap'],
    params(rng) {
      const set = decimalFamily(rng);
      const asWhole = set.digits.map(Number);
      if (new Set(asWhole).size < 4) return null;
      return { ...set, ascending: rng.chance(0.5), order: rng.shuffle([0, 1, 2, 3]) };
    },
    answer: ({ w, digits, ascending }) => orderText(w, digits, [...digits].sort((x, y) => Number(`0.${x}`) - Number(`0.${y}`)), ascending),
    formatValue: (value) => value,
    distractors: ({ w, digits, ascending }) => {
      const correct = [...digits].sort((x, y) => Number(`0.${x}`) - Number(`0.${y}`));
      return [
        { value: orderText(w, digits, [...digits].sort((x, y) => Number(x) - Number(y)), ascending), why: 'compared the digits after the point as whole numbers' },
        { value: orderText(w, digits, [...correct].reverse(), ascending), why: ascending ? 'listed them from largest to smallest' : 'listed them from smallest to largest' },
        { value: orderText(w, digits, [correct[0], correct[2], correct[1], correct[3]], ascending), why: 'mixed up the two numbers that differ only from the second decimal place' }
      ];
    },
    // Order by the padded whole numbers instead of by value.
    verify({ w, digits, ascending }, text) {
      const sorted = [...digits].sort((x, y) => Number(x.padEnd(3, '0')) - Number(y.padEnd(3, '0')));
      return orderText(w, digits, sorted, ascending) === text;
    },
    render({ w, digits, ascending, order }) {
      const texts = digits.map((d) => `${w}.${d}`);
      const padded = order.map((i) => `${w}.${digits[i].padEnd(3, '0')}`);
      const answer = orderText(w, digits, [...digits].sort((x, y) => Number(`0.${x}`) - Number(`0.${y}`)), ascending);
      return {
        question: `Arrange in ${ascending ? 'ascending' : 'descending'} order: ${order.map((i) => texts[i]).join(', ')}.`,
        explanation: `Pad to three decimal places — ${padded.join(', ')} — and compare like whole numbers of thousandths. ${ascending ? 'Smallest to largest' : 'Largest to smallest'}: ${answer}.`,
        solutionSteps: [`Padded: ${padded.join(', ')}.`, `Compare the thousandths as whole numbers.`, answer + '.'],
        method: 'Pad with zeros to equal length, then compare.',
        hints: ['A longer decimal is not necessarily larger.', 'Give every number three decimal places first.'],
        commonMistakes: ['Ordering by the digits after the point as if they were whole numbers.']
      };
    }
  },

  {
    id: 'dc-fraction-to-decimal',
    version: 1,
    topicId: 'decimals',
    conceptId: 'dc-convert',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dc-conv-f'],
    answerDecimals: 4,
    estimatedSeconds: 40,
    params(rng) {
      const q = rng.pick([2, 4, 5, 8, 16, 20, 25, 40, 50, 80, 125]);
      const p = rng.int(1, 2 * q - 1);
      if (p === q || gcd(p, q) !== 1) return null;
      return { p, q };
    },
    answer: ({ p, q }) => p / q,
    formatValue: (value) => fmt(value, 4),
    distractors: ({ p, q }) => [
      { value: Number(`0.${p}${q}`), why: 'wrote the numerator and denominator side by side after the point' },
      { value: q / p, why: 'divided the denominator by the numerator' },
      { value: p / q / 10, why: 'put the decimal point one place too far left' },
      { value: Math.round((p / q) * 100) / 100, why: 'rounded to two decimal places' }
    ],
    // Scale up to whole numbers and cross-multiply.
    verify: ({ p, q }, value) => Math.round(value * 10000) * q === p * 10000,
    render({ p, q }) {
      let n = 0;
      while ((10 ** n) % q !== 0) n++;
      const k = 10 ** n / q;
      const value = fmt(p / q, 4);
      return {
        question: `What is ${p}/${q} as a decimal?`,
        explanation: `Make the denominator a power of 10: ${p}/${q} = (${p} × ${k})/(${q} × ${k}) = ${p * k}/${fmt(10 ** n)} = ${value}.`,
        solutionSteps: [`${q} × ${k} = ${fmt(10 ** n)}.`, `${p} × ${k} = ${p * k}.`, `${p * k}/${fmt(10 ** n)} = ${value}.`],
        method: 'Scale the denominator to 10, 100, 1000 … or divide numerator by denominator.',
        hints: [`What do you multiply ${q} by to get a power of 10?`, 'Multiply the numerator by the same number.'],
        commonMistakes: ['Dividing the denominator by the numerator.']
      };
    }
  },

  {
    id: 'dc-decimal-to-fraction',
    version: 1,
    topicId: 'decimals',
    conceptId: 'dc-convert',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dc-conv-f'],
    estimatedSeconds: 45,
    params(rng) {
      const q = rng.pick([4, 5, 8, 16, 20, 25, 40, 50, 125, 250]);
      const p = rng.int(1, q - 1);
      if (gcd(p, q) !== 1) return null;
      let n = 0;
      while ((10 ** n) % q !== 0) n++;
      return { p, q, n, digits: (p * 10 ** n) / q };
    },
    answer: ({ p, q }) => `${p}/${q}`,
    formatValue: (value) => value,
    distractors: ({ p, q, n, digits }) => [
      { value: frac(digits, 10 ** (n - 1)), why: 'used one zero too few in the denominator' },
      { value: frac(digits, 10 ** (n + 1)), why: 'used one zero too many in the denominator' },
      { value: frac(q, p), why: 'turned the fraction upside down' }
    ],
    verify({ n, digits }, text) {
      const [a, b] = parseFraction(text);
      return gcd(a, b) === 1 && a * 10 ** n === digits * b;
    },
    render({ p, q, n, digits }) {
      const decimal = (digits / 10 ** n).toFixed(n);
      const g = gcd(digits, 10 ** n);
      return {
        question: `Write ${decimal} as a fraction in its simplest form.`,
        explanation: `${decimal} has ${n} decimal place${n === 1 ? '' : 's'}, so it is ${digits}/${fmt(10 ** n)}. Divide top and bottom by their HCF, ${g}: ${p}/${q}.`,
        solutionSteps: [`${decimal} = ${digits}/${fmt(10 ** n)}.`, `HCF(${digits}, ${10 ** n}) = ${g}.`, `${digits} ÷ ${g} = ${p}; ${10 ** n} ÷ ${g} = ${q}.`],
        method: 'Digits over 10ⁿ (n = decimal places), then simplify.',
        hints: [`How many decimal places does ${decimal} have?`, 'Put the digits over 1 followed by that many zeros, then cancel.'],
        commonMistakes: ['Using the wrong power of 10 for the number of decimal places.']
      };
    }
  },

  /* ============================= simplification ============================= */
  {
    id: 'sp-powers-short',
    version: 1,
    topicId: 'simplification',
    conceptId: 'sp-powers',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['sp-powers-f', 'sp-bodmas-f'],
    estimatedSeconds: 45,
    params: (rng) =>
      powerExpression(rng, rng.shuffle(['root', rng.pick(['sq', 'cube']), rng.pick(['sq', 'num', 'root'])]), [rng.pick(['+', '+', '−']), rng.pick(['×', '×', '÷'])], 500),
    answer: (p) => evalExpression(p, 'normal'),
    formatValue: (value) => fmt(value),
    distractors: (p) => powerDistractors(p),
    verify: (p, value) => evaluateExpressionText(expressionText(p)) === value,
    render: (p) => renderPowerExpression(p)
  },

  {
    id: 'sp-powers-long',
    version: 1,
    topicId: 'simplification',
    conceptId: 'sp-powers',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['sp-powers-f', 'sp-bodmas-f'],
    estimatedSeconds: 80,
    params: (rng) =>
      powerExpression(
        rng,
        rng.shuffle(['root', 'sq', 'cube', rng.pick(['sq', 'root', 'num']), rng.pick(['num', 'sq', 'root'])]),
        [rng.pick(['+', '−']), ...rng.shuffle(['+', rng.pick(['×', '÷']), rng.pick(['×', '÷', '−'])])],
        3000
      ),
    answer: (p) => evalExpression(p, 'normal'),
    formatValue: (value) => fmt(value),
    distractors: (p) => powerDistractors(p),
    verify: (p, value) => evaluateExpressionText(expressionText(p)) === value,
    render: (p) => renderPowerExpression(p)
  },

  /* ============================== number system ============================== */
  {
    id: 'ns-types-pick-prime',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-types',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: [],
    estimatedSeconds: 45,
    tags: ['trap'],
    params(rng) {
      const askPrime = rng.chance(0.6);
      const base = 10 * rng.int(2, 34);
      const inWindow = (n) => n >= base && n <= base + 70;
      const primes = [...PRIME_SET].filter((n) => n > 10 && inWindow(n));
      const traps = LOOKALIKE_COMPOSITES.filter(inWindow);
      const [ones, threes] = askPrime ? [primes, traps] : [traps, primes];
      if (ones.length < 1 || threes.length < 3) return null;
      const answer = rng.pick(ones);
      const others = rng.shuffle(threes).slice(0, 3);
      return { askPrime, answer, list: rng.shuffle([answer, ...others]) };
    },
    answer: ({ askPrime, list }) => String(list.find((n) => PRIME_SET.has(n) === askPrime)),
    formatValue: (value) => value,
    distractors: ({ askPrime, list }) =>
      list
        .filter((n) => PRIME_SET.has(n) !== askPrime)
        .map((n) => ({ value: String(n), why: askPrime ? `${n} = ${smallestPrimeFactor(n)} × ${n / smallestPrimeFactor(n)} only looks prime` : `${n} is prime, though it looks composite` })),
    // Trial division on every number: exactly the chosen one has the asked property.
    verify: ({ askPrime, list }, text) => list.every((n) => (isPrime(n) === askPrime) === (String(n) === text)),
    render({ askPrime, list }) {
      const answer = list.find((n) => PRIME_SET.has(n) === askPrime);
      const factorised = list.filter((n) => !PRIME_SET.has(n)).map((n) => `${n} = ${smallestPrimeFactor(n)} × ${n / smallestPrimeFactor(n)}`);
      const root = Math.floor(Math.sqrt(Math.max(...list)));
      return {
        question: `Which of these numbers is ${askPrime ? 'prime' : 'composite'}: ${list.join(', ')}?`,
        explanation: askPrime
          ? `${answer} has no prime factor up to √${answer} (try 2, 3, 5, 7, … up to ${Math.floor(Math.sqrt(answer))}), so it is prime. The others factorise: ${factorised.join('; ')}.`
          : `${factorised[0]}, so ${answer} is composite. The others have no prime factor up to their square roots, so they are prime.`,
        solutionSteps: [`Test each number by the primes up to ${root}.`, ...factorised.map((line) => `${line}.`), `${askPrime ? 'Prime' : 'Composite'}: ${answer}.`],
        method: 'Test divisibility only by primes up to the square root.',
        hints: ['Check divisibility by 3 with the digit sum, and try 7, 11 and 13.', `You only need primes up to about √${Math.max(...list)}.`],
        commonMistakes: ['Calling a number prime because it is odd and does not end in 5.']
      };
    }
  },

  {
    id: 'ns-types-rational',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-types',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: [],
    estimatedSeconds: 50,
    params(rng) {
      const askRational = rng.chance(0.5);
      const [answerKinds, otherKinds] = askRational ? [RATIONAL_KINDS, IRRATIONAL_KINDS] : [IRRATIONAL_KINDS, RATIONAL_KINDS];
      const items = [numberItem(rng, rng.pick(answerKinds)), ...rng.shuffle(otherKinds).slice(0, 3).map((kind) => numberItem(rng, kind))];
      if (new Set(items.map((item) => item.text)).size < 4) return null;
      return { askRational, items, order: rng.shuffle([0, 1, 2, 3]) };
    },
    answer: ({ items }) => items[0].text,
    formatValue: (value) => value,
    distractors: ({ items }) => items.slice(1).map((item) => ({ value: item.text, why: item.why })),
    // Classify every item independently (integer square / cube checks) — only the answer may match.
    verify: ({ askRational, items }, text) => items.every((item) => (isRationalItem(item) === askRational) === (item.text === text)),
    render({ askRational, items, order }) {
      const [answer, ...others] = items;
      return {
        question: `Which of these numbers is ${askRational ? 'rational' : 'irrational'}: ${order.map((i) => items[i].text).join(', ')}?`,
        explanation: `${answer.text}: ${answer.why}. The others are ${askRational ? 'irrational' : 'rational'} — ${others.map((item) => `${item.text}: ${item.why}`).join('; ')}.`,
        solutionSteps: ['A rational number can be written as p/q; its decimal ends or repeats.', ...items.map((item) => `${item.text}: ${item.why}.`)],
        method: 'Rational = p/q = terminating or repeating decimal; square roots of non-squares are irrational.',
        hints: ['Is each square root of a perfect square?', 'A decimal that repeats a block forever is rational; one that never settles into a repeat is not.'],
        commonMistakes: ['Treating 22/7 as π, or any long decimal as irrational.']
      };
    }
  },

  {
    id: 'ns-divisibility-which',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-divisibility',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ns-divisibility-rules'],
    estimatedSeconds: 45,
    tags: ['trap'],
    params(rng) {
      const d = rng.pick([3, 4, 8, 9, 11]);
      const answer = d * rng.int(Math.ceil(1000 / d), Math.floor(9999 / d));
      const traps = findNumbers(rng, 3, (n) => n % d !== 0 && TRAPS[d].some((trap) => trap.test(n)), [answer]);
      if (!traps) return null;
      return { d, list: rng.shuffle([answer, ...traps]) };
    },
    answer: ({ d, list }) => String(list.find((n) => RULES[d](n))),
    formatValue: (value) => value,
    distractors: ({ d, list }) => list.filter((n) => !RULES[d](n)).map((n) => ({ value: String(n), why: TRAPS[d].find((trap) => trap.test(n)).why })),
    // Plain division on every option.
    verify: ({ d, list }, text) => list.every((n) => (n % d === 0) === (String(n) === text)),
    render({ d, list }) {
      const answer = list.find((n) => RULES[d](n));
      return {
        question: `Which of these numbers is divisible by ${d}: ${list.join(', ')}?`,
        explanation: `${RULE_TEXT[d]}. ${ruleWorking(d, answer)}, so ${answer} is divisible by ${d}. ${list.filter((n) => n !== answer).map((n) => ruleWorking(d, n)).join('; ')} — those fail.`,
        solutionSteps: [`Rule for ${d}: ${RULE_TEXT[d].toLowerCase()}.`, ...list.map((n) => `${ruleWorking(d, n)}.`)],
        method: `Apply the digit test for ${d}.`,
        hints: [`What is the divisibility test for ${d}?`, d === 4 || d === 8 ? 'Look at the last digits, not just the final one.' : d === 11 ? 'Alternate the signs of the digits.' : 'Add the digits.'],
        commonMistakes: [RULE_SLIP[d]]
      };
    }
  },

  {
    id: 'ns-series-first-n',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-series',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ns-sum-natural', 'ns-sc-sum-odd-even'],
    estimatedSeconds: 35,
    params: (rng) => ({ kind: rng.pick(['natural', 'odd', 'even']), n: rng.int(10, 60) }),
    answer: ({ kind, n }) => (kind === 'natural' ? (n * (n + 1)) / 2 : kind === 'odd' ? n * n : n * (n + 1)),
    formatValue: (value) => fmt(value),
    distractors: ({ kind, n }) =>
      kind === 'natural'
        ? [
            { value: n * (n + 1), why: 'forgot to halve' },
            { value: n * n, why: 'used the formula for odd numbers' },
            { value: (n * (n - 1)) / 2, why: 'used n − 1 instead of n + 1' }
          ]
        : kind === 'odd'
          ? [
              { value: (n * (n + 1)) / 2, why: 'used the formula for natural numbers' },
              { value: n * (n + 1), why: 'used the formula for even numbers' },
              { value: (2 * n - 1) ** 2, why: 'squared the last odd number instead of the count' }
            ]
          : [
              { value: n * n, why: 'used the formula for odd numbers' },
              { value: (n * (n + 1)) / 2, why: 'used the formula for natural numbers' },
              { value: n * (2 * n + 1), why: `added all the numbers up to ${2 * n}` }
            ],
    // Add the terms one by one.
    verify({ kind, n }, value) {
      let sum = 0;
      for (let i = 1; i <= n; i++) sum += kind === 'natural' ? i : kind === 'odd' ? 2 * i - 1 : 2 * i;
      return sum === value;
    },
    render({ kind, n }) {
      const formula = { natural: `n(n + 1)/2 = ${n} × ${n + 1} ÷ 2`, odd: `n² = ${n}²`, even: `n(n + 1) = ${n} × ${n + 1}` }[kind];
      const value = kind === 'natural' ? (n * (n + 1)) / 2 : kind === 'odd' ? n * n : n * (n + 1);
      const what = { natural: 'natural numbers', odd: 'odd numbers', even: 'even numbers' }[kind];
      return {
        question: `What is the sum of the first ${n} ${what}?`,
        explanation: `Sum of the first n ${what} = ${formula} = ${fmt(value)}.`,
        solutionSteps: [`n = ${n}.`, `${formula}.`, `= ${fmt(value)}.`],
        method: { natural: 'n(n + 1) ÷ 2.', odd: 'n².', even: 'n(n + 1).' }[kind],
        hints: [kind === 'natural' ? 'Pair the first and last terms: each pair adds to n + 1.' : `The first n ${what} have a neat closed form.`, `Use n = ${n}, the number of terms.`],
        commonMistakes: [kind === 'odd' ? `Squaring the last term (${2 * n - 1}) instead of the count (${n}).` : 'Mixing up the three formulas.']
      };
    }
  },

  {
    id: 'ns-series-range',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-series',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ns-sum-natural', 'ns-sc-sum-odd-even'],
    estimatedSeconds: 55,
    params(rng) {
      const kind = rng.pick(['range', 'odd', 'even']);
      if (kind === 'range') {
        const a = rng.int(5, 40);
        return { kind, a, b: a + rng.int(10, 80) };
      }
      return { kind, k: rng.int(8, 40) };
    },
    answer({ kind, a, b, k }) {
      if (kind === 'range') return (b * (b + 1)) / 2 - ((a - 1) * a) / 2;
      return kind === 'odd' ? k * k : k * (k + 1);
    },
    formatValue: (value) => fmt(value),
    distractors({ kind, a, b, k }) {
      const S = (n) => (n * (n + 1)) / 2;
      if (kind === 'range') {
        return [
          { value: S(b) - S(a), why: `subtracted the sum up to ${a}, dropping ${a} itself` },
          { value: ((b - a) * (a + b)) / 2, why: `counted ${b - a} terms instead of ${b - a + 1}` },
          { value: S(b), why: 'ignored the starting point' }
        ];
      }
      const L = kind === 'odd' ? 2 * k - 1 : 2 * k;
      return kind === 'odd'
        ? [
            { value: L * L, why: 'used the last term as the number of terms' },
            { value: S(L), why: `added every number up to ${L}` },
            { value: k * (k + 1), why: 'used the formula for even numbers' }
          ]
        : [
            { value: L * (L + 1), why: 'used the last term as the number of terms' },
            { value: S(L), why: `added every number up to ${L}` },
            { value: k * k, why: 'used the formula for odd numbers' }
          ];
    },
    verify({ kind, a, b, k }, value) {
      let sum = 0;
      if (kind === 'range') for (let i = a; i <= b; i++) sum += i;
      else for (let i = kind === 'odd' ? 1 : 2; i <= 2 * k; i += 2) sum += i;
      return sum === value;
    },
    render({ kind, a, b, k }) {
      if (kind === 'range') {
        const value = (b * (b + 1)) / 2 - ((a - 1) * a) / 2;
        return {
          question: `What is the sum of all the whole numbers from ${a} to ${b}, both included?`,
          explanation: `There are ${b} − ${a} + 1 = ${b - a + 1} terms with average (${a} + ${b}) ÷ 2, so the sum is ${b - a + 1} × ${a + b} ÷ 2 = ${fmt(value)}. (Or: sum to ${b} minus sum to ${a - 1}.)`,
          solutionSteps: [`Terms = ${b - a + 1}.`, `Sum = ${b - a + 1} × (${a} + ${b}) ÷ 2.`, `= ${fmt(value)}.`],
          method: 'Number of terms × (first + last) ÷ 2.',
          hints: [`How many numbers are there from ${a} to ${b} inclusive?`, 'Pair the first and last terms.'],
          commonMistakes: [`Counting ${b - a} terms instead of ${b - a + 1}.`]
        };
      }
      const odd = kind === 'odd';
      const L = odd ? 2 * k - 1 : 2 * k;
      const value = odd ? k * k : k * (k + 1);
      return {
        question: `What is ${odd ? '1 + 3 + 5' : '2 + 4 + 6'} + … + ${L}?`,
        explanation: `These are the first ${k} ${odd ? 'odd' : 'even'} numbers (${odd ? `(${L} + 1) ÷ 2` : `${L} ÷ 2`} = ${k} terms), so the sum is ${odd ? `${k}²` : `${k} × ${k + 1}`} = ${fmt(value)}.`,
        solutionSteps: [`Number of terms = ${k}.`, odd ? `Sum = n² = ${k}².` : `Sum = n(n + 1) = ${k} × ${k + 1}.`, `= ${fmt(value)}.`],
        method: odd ? 'First n odd numbers: n².' : 'First n even numbers: n(n + 1).',
        hints: ['First count the terms — it is not the last term.', odd ? 'The last odd number is 2n − 1.' : 'The last even number is 2n.'],
        commonMistakes: [`Using ${L} as the number of terms.`]
      };
    }
  },

  /* =============================== divisibility =============================== */
  {
    id: 'dv-rules-not-divisible',
    version: 1,
    topicId: 'divisibility',
    conceptId: 'dv-rules',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dv-rules-f', 'dv-eleven-f'],
    estimatedSeconds: 45,
    tags: ['trap'],
    params(rng) {
      const d = rng.pick([3, 4, 8, 9, 11]);
      const [trap] = findNumbers(rng, 1, (n) => n % d !== 0 && TRAPS[d].some((t) => t.test(n)), []) || [];
      if (!trap) return null;
      const multiples = findNumbers(rng, 3, (n) => n % d === 0 && LOOKS_WRONG[d].test(n), [trap]);
      if (!multiples) return null;
      return { d, list: rng.shuffle([trap, ...multiples]) };
    },
    answer: ({ d, list }) => String(list.find((n) => !RULES[d](n))),
    formatValue: (value) => value,
    distractors: ({ d, list }) => list.filter((n) => RULES[d](n)).map((n) => ({ value: String(n), why: LOOKS_WRONG[d].why })),
    verify: ({ d, list }, text) => list.every((n) => (n % d !== 0) === (String(n) === text)),
    render({ d, list }) {
      const answer = list.find((n) => !RULES[d](n));
      return {
        question: `Which of these numbers is NOT divisible by ${d}: ${list.join(', ')}?`,
        explanation: `${RULE_TEXT[d]}. ${ruleWorking(d, answer)}, so ${answer} is not divisible by ${d}${TRAPS[d].find((t) => t.test(answer)) ? ` — ${TRAPS[d].find((t) => t.test(answer)).why}` : ''}. The other three pass the test.`,
        solutionSteps: [`Rule for ${d}: ${RULE_TEXT[d].toLowerCase()}.`, ...list.map((n) => `${ruleWorking(d, n)}.`)],
        method: `Apply the correct test for ${d} to every option.`,
        hints: [`What exactly does the test for ${d} look at?`, 'A number can look wrong at a glance and still pass the real test.'],
        commonMistakes: [`${LOOKS_WRONG[d].why[0].toUpperCase()}${LOOKS_WRONG[d].why.slice(1)}.`]
      };
    }
  },

  {
    id: 'dv-rules-seven',
    version: 1,
    topicId: 'divisibility',
    conceptId: 'dv-rules',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dv-sc-seven'],
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const answer = 7 * rng.int(143, 1428);
      const traps = [];
      for (const trap of SEVEN_TRAPS) {
        const found = findNumbers(rng, 1, (n) => n % 7 !== 0 && trap.test(n), [answer, ...traps]);
        if (!found) return null;
        traps.push(found[0]);
      }
      return { answer, traps, list: rng.shuffle([answer, ...traps]) };
    },
    answer: ({ list }) => String(list.find((n) => sevenSteps(n).at(-1) % 7 === 0)),
    formatValue: (value) => value,
    distractors: ({ traps }) => traps.map((n, i) => ({ value: String(n), why: SEVEN_TRAPS[i].why })),
    verify: ({ list }, text) => list.every((n) => (n % 7 === 0) === (String(n) === text)),
    render({ answer, list }) {
      const chain = (n) => {
        const steps = sevenSteps(n);
        return steps.slice(1).map((x, i) => `${Math.floor(Math.abs(steps[i]) / 10)} − 2 × ${Math.abs(steps[i]) % 10} = ${signed(x)}`).join(', then ');
      };
      return {
        question: `Which of these numbers is divisible by 7: ${list.join(', ')}?`,
        explanation: `Double the last digit and subtract it from the rest, repeating until the number is small. For ${answer}: ${chain(answer)} — a multiple of 7, so ${answer} is divisible by 7. The others end at ${list.filter((n) => n !== answer).map((n) => signed(sevenSteps(n).at(-1))).join(', ')}, not multiples of 7.`,
        solutionSteps: list.map((n) => `${n}: ${chain(n)}.`),
        method: 'Double the last digit and subtract it from the rest; repeat.',
        hints: ['Digit sums and last digits do not test for 7.', 'Take the last digit off, double it, and subtract from what is left.'],
        commonMistakes: ['Adding twice the last digit instead of subtracting it.']
      };
    }
  },

  {
    id: 'dv-composite-which',
    version: 1,
    topicId: 'divisibility',
    conceptId: 'dv-composite',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dv-composite-f', 'dv-rules-f'],
    estimatedSeconds: 50,
    tags: ['trap'],
    params(rng) {
      const [D, p1, p2] = rng.pick(COMPOSITE_SPLITS);
      const overlaps = overlappingPairs(D);
      const [x, y] = rng.pick(overlaps);
      const m = lcm(x, y);
      const answer = D * rng.int(Math.ceil(1000 / D), Math.floor(9999 / D));
      const checks = [(n) => n % m === 0 && n % D !== 0, (n) => n % p1 === 0 && n % p2 !== 0, (n) => n % p2 === 0 && n % p1 !== 0];
      const traps = [];
      for (const check of checks) {
        const found = findNumbers(rng, 1, check, [answer, ...traps]);
        if (!found) return null;
        traps.push(found[0]);
      }
      return { D, p1, p2, x, y, traps, list: rng.shuffle([answer, ...traps]) };
    },
    answer: ({ p1, p2, list }) => String(list.find((n) => RULES[p1](n) && RULES[p2](n))),
    formatValue: (value) => value,
    distractors: ({ p1, p2, x, y, traps }) => [
      { value: String(traps[0]), why: `it is divisible by ${x} and by ${y}, but they share a factor, so that only proves divisibility by ${lcm(x, y)}` },
      { value: String(traps[1]), why: `it passes the test for ${p1} but not for ${p2}` },
      { value: String(traps[2]), why: `it passes the test for ${p2} but not for ${p1}` }
    ],
    verify: ({ D, list }, text) => list.every((n) => (n % D === 0) === (String(n) === text)),
    render({ D, p1, p2, x, y, list }) {
      const answer = list.find((n) => RULES[p1](n) && RULES[p2](n));
      return {
        question: `Which of these numbers is divisible by ${D}: ${list.join(', ')}?`,
        explanation: `${D} = ${p1} × ${p2}, and ${p1} and ${p2} share no factor, so a number is divisible by ${D} exactly when it passes both tests. Only ${answer} passes both: ${ruleWorking(p1, answer)}; ${ruleWorking(p2, answer)}. Testing ${x} and ${y} is not enough — they overlap.`,
        solutionSteps: [`Split ${D} into coprime parts: ${p1} × ${p2}.`, ...list.map((n) => `${n}: ${p1} ${RULES[p1](n) ? '✓' : '✗'}, ${p2} ${RULES[p2](n) ? '✓' : '✗'}.`)],
        method: 'Test coprime factors whose product is the divisor.',
        hints: [`Write ${D} as a product of two numbers with no common factor.`, `Why is "divisible by ${x} and ${y}" not enough?`],
        commonMistakes: [`Testing ${x} and ${y}, which overlap and only prove divisibility by ${lcm(x, y)}.`]
      };
    }
  },

  {
    id: 'dv-composite-correct-test',
    version: 1,
    topicId: 'divisibility',
    conceptId: 'dv-composite',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dv-composite-f'],
    estimatedSeconds: 45,
    params(rng) {
      const D = rng.pick([12, 18, 20, 24, 28, 36, 40, 44, 45, 48, 52, 56, 60, 63, 72, 75, 80, 84, 88, 90, 96, 99, 100, 104, 108, 112, 117, 120, 126, 132, 144]);
      const divisors = [];
      for (let d = 2; d < D; d++) if (D % d === 0) divisors.push(d);
      const coprime = [];
      const wrong = [];
      for (const x of divisors) {
        for (const y of divisors) {
          if (y <= x) continue;
          if (x * y === D && gcd(x, y) === 1) coprime.push([x, y]);
          else if (lcm(x, y) < D) wrong.push([x, y, x * y === D ? 0 : 1]);
        }
      }
      if (!coprime.length || wrong.length < 3) return null;
      const shuffled = rng.shuffle(wrong).sort((u, v) => u[2] - v[2]);
      return { D, pair: rng.pick(coprime), wrong: shuffled.slice(0, 4).map(([x, y]) => [x, y]) };
    },
    answer: ({ pair }) => pairTest(pair),
    formatValue: (value) => value,
    distractors: ({ D, wrong }) => wrong.map(([x, y]) => ({ value: pairTest([x, y]), why: `${x} and ${y} together only guarantee their LCM, ${lcm(x, y)}, not ${D}` })),
    // Brute force: across several multiples of D, the pair of tests must agree with divisibility by D every time.
    verify({ D }, text) {
      const [x, y] = text.match(/\d+/g).map(Number);
      for (let n = 1; n <= D * 12; n++) if ((n % x === 0 && n % y === 0) !== (n % D === 0)) return false;
      return true;
    },
    render({ D, pair, wrong }) {
      const [x, y] = pair;
      const [wx, wy] = wrong[0];
      return {
        question: `Which pair of tests correctly proves that a number is divisible by ${D}?`,
        explanation: `${x} × ${y} = ${D} and ${x}, ${y} share no common factor, so a number divisible by both is divisible by ${D}. A pair like ${wx} and ${wy} overlaps: passing both proves only divisibility by their LCM, ${lcm(wx, wy)}.`,
        solutionSteps: [`Prime factors: ${D} = ${primeFactorText(D)}.`, `Group them into two coprime parts: ${x} × ${y}.`, `${pairTest(pair)}.`],
        method: 'Split the divisor into coprime factors.',
        hints: [`Factorise ${D} into primes.`, 'The two tests must not share a prime factor, and their product must be the divisor.'],
        commonMistakes: [`Choosing ${wx} and ${wy}: their product may look right, but they share a factor.`]
      };
    }
  },

  {
    id: 'dv-composite-extreme-multiple',
    version: 1,
    topicId: 'divisibility',
    conceptId: 'dv-composite',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['dv-count-f', 'dv-composite-f'],
    estimatedSeconds: 60,
    params(rng) {
      const D = rng.pick([12, 15, 18, 24, 28, 36, 44, 45, 48, 56, 63, 72, 84, 88, 96, 99]);
      const k = rng.int(3, 5);
      const smallest = rng.chance(0.5);
      const edge = smallest ? 10 ** (k - 1) : 10 ** k - 1;
      if (edge % D === 0) return null;
      return { D, k, smallest };
    },
    answer({ D, k, smallest }) {
      if (smallest) {
        const lo = 10 ** (k - 1);
        return lo + (D - (lo % D));
      }
      const hi = 10 ** k - 1;
      return hi - (hi % D);
    },
    formatValue: (value) => fmt(value),
    distractors({ D, k, smallest }) {
      if (smallest) {
        const lo = 10 ** (k - 1);
        const r = lo % D;
        return [
          { value: lo + r, why: 'added the remainder instead of the divisor minus the remainder' },
          { value: lo - r, why: `subtracted the remainder, which drops below ${k} digits` },
          { value: lo + D, why: 'added the divisor without using the remainder' }
        ];
      }
      const hi = 10 ** k - 1;
      const r = hi % D;
      return [
        { value: hi - (D - r), why: 'subtracted the divisor minus the remainder' },
        { value: hi + (D - r), why: `went up to the next multiple, which has ${k + 1} digits` },
        { value: hi - D, why: 'subtracted the divisor instead of the remainder' }
      ];
    },
    // Step one number at a time from the edge.
    verify({ D, k, smallest }, value) {
      let n = smallest ? 10 ** (k - 1) : 10 ** k - 1;
      while (n % D !== 0) n += smallest ? 1 : -1;
      return n === value;
    },
    render({ D, k, smallest }) {
      const edge = smallest ? 10 ** (k - 1) : 10 ** k - 1;
      const r = edge % D;
      const ans = smallest ? edge + (D - r) : edge - r;
      return {
        question: `What is the ${smallest ? 'smallest' : 'largest'} ${k}-digit number divisible by ${D}?`,
        explanation: `The ${smallest ? 'smallest' : 'largest'} ${k}-digit number is ${fmt(edge)}. ${fmt(edge)} ÷ ${D} leaves remainder ${r}, so ${smallest ? `add ${D} − ${r} = ${D - r}` : `subtract ${r}`}: ${fmt(ans)}.`,
        solutionSteps: [`${fmt(edge)} ÷ ${D} = ${Math.floor(edge / D)} remainder ${r}.`, smallest ? `${fmt(edge)} + (${D} − ${r}) = ${fmt(ans)}.` : `${fmt(edge)} − ${r} = ${fmt(ans)}.`],
        method: smallest ? 'Smallest: add (divisor − remainder).' : 'Largest: subtract the remainder.',
        hints: [`Start from ${fmt(edge)} and divide by ${D}.`, smallest ? 'Going down would lose a digit, so go up to the next multiple.' : 'Going up would add a digit, so go down to the previous multiple.'],
        commonMistakes: [smallest ? 'Adding the remainder itself.' : 'Subtracting (divisor − remainder).']
      };
    }
  },

  /* =========================== factors and multiples =========================== */
  {
    id: 'fm-prime-factorisation-pick',
    version: 1,
    topicId: 'factors-multiples',
    conceptId: 'fm-primes',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['fm-factorise-f'],
    estimatedSeconds: 50,
    params(rng) {
      const count = rng.int(2, 3);
      const bases = rng.shuffle([2, 3, 5, 7, 11, 13]).slice(0, count).sort((x, y) => x - y);
      const caps = { 2: 5, 3: 3, 5: 2, 7: 2, 11: 1, 13: 1 };
      const exps = bases.map((p) => rng.int(1, caps[p]));
      const N = bases.reduce((acc, p, i) => acc * p ** exps[i], 1);
      if (N < 30 || N > 5000 || exps.every((e) => e === 1)) return null;
      return { bases, exps, N };
    },
    answer: ({ bases, exps }) => factorText(bases, exps),
    formatValue: (value) => value,
    distractors({ bases, exps }) {
      const out = [];
      const i = exps.findIndex((e) => e > 1);
      const j = exps.findIndex((e, idx) => idx !== i && e !== exps[i]);
      if (j >= 0) {
        const swapped = [...exps];
        [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
        out.push({ value: factorText(bases, swapped), why: `swapped the powers of ${bases[i]} and ${bases[j]}` });
      }
      out.push({ value: factorText(bases, exps.map((e, idx) => (idx === i ? e - 1 : e))), why: `stopped dividing by ${bases[i]} one time too early` });
      bases.forEach((p, idx) => out.push({ value: factorText(bases, exps.map((e, k) => (k === idx ? e + 1 : e))), why: `divided by ${p} one time too many` }));
      return out;
    },
    // Multiply the factors back out and check each base is prime by trial division.
    verify({ N }, text) {
      let product = 1;
      for (const part of text.split(' × ')) {
        const match = part.match(/^(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)$/);
        if (!match || !isPrime(Number(match[1]))) return false;
        const e = match[2] ? Number(match[2].split('').map((c) => FROM_SUPERSCRIPT[c]).join('')) : 1;
        for (let k = 0; k < e; k++) product *= Number(match[1]);
      }
      return product === N;
    },
    render({ bases, exps, N }) {
      const ladder = [];
      let n = N;
      bases.forEach((p, i) => {
        for (let k = 0; k < exps[i]; k++) {
          ladder.push(`${fmt(n)} ÷ ${p} = ${fmt(n / p)}`);
          n /= p;
        }
      });
      const answer = factorText(bases, exps);
      return {
        question: `What is the prime factorisation of ${fmt(N)}?`,
        explanation: `Divide by the smallest prime that goes in, again and again: ${ladder.join(', ')}. So ${fmt(N)} = ${answer}.`,
        solutionSteps: [...ladder.map((line) => `${line}.`), `${fmt(N)} = ${answer}.`],
        method: 'Repeated division by primes, smallest first.',
        hints: [`Is ${fmt(N)} even? Keep dividing by 2 while you can.`, 'Then try 3, 5, 7, … and count how many times each divides.'],
        commonMistakes: ['Miscounting how many times a prime divides the number.']
      };
    }
  },

  {
    id: 'fm-prime-power-in-product',
    version: 1,
    topicId: 'factors-multiples',
    conceptId: 'fm-primes',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fm-factorise-f'],
    estimatedSeconds: 55,
    params(rng) {
      const p = rng.pick([2, 3, 5]);
      const mode = rng.pick(['product', 'power']);
      // n = p^e × m, with m coprime to p and n kept to a readable size (≤ 400).
      const make = () => {
        const e = rng.int(2, { 2: 6, 3: 4, 5: 3 }[p]);
        const multipliers = [1, 2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 21].filter((m) => m % p !== 0 && p ** e * m <= 400);
        return { n: p ** e * rng.pick(multipliers), e };
      };
      const first = make();
      if (first.n < 12) return null;
      if (mode === 'power') {
        const k = rng.int(2, 5);
        if (k === first.e) return null;
        return { p, mode, a: first.n, ea: first.e, k };
      }
      const second = make();
      if (second.n < 12 || second.e === first.e) return null;
      return { p, mode, a: first.n, ea: first.e, b: second.n, eb: second.e };
    },
    answer: ({ mode, ea, eb, k }) => (mode === 'power' ? ea * k : ea + eb),
    formatValue: (value) => String(value),
    distractors: ({ mode, ea, eb, k }) =>
      mode === 'power'
        ? [
            { value: ea + k, why: 'added the index to the power instead of multiplying' },
            { value: ea, why: 'ignored the index' },
            { value: k, why: 'gave only the index' }
          ]
        : [
            { value: ea * eb, why: 'multiplied the powers instead of adding them' },
            { value: Math.max(ea, eb), why: 'took only the larger power' },
            { value: ea, why: 'counted only the first number' },
            { value: eb, why: 'counted only the second number' },
            { value: 2, why: 'counted one factor for each number' }
          ],
    // Build the whole number with BigInt and divide by p repeatedly.
    verify({ p, mode, a, b, k }, value) {
      let n = mode === 'power' ? BigInt(a) ** BigInt(k) : BigInt(a) * BigInt(b);
      const P = BigInt(p);
      let count = 0;
      while (n % P === 0n) {
        n /= P;
        count++;
      }
      return count === value;
    },
    render({ p, mode, a, ea, b, eb, k }) {
      const show = (n, e) => `${n} = ${p}${e > 1 ? sup(e) : ''} × ${n / p ** e}`;
      if (mode === 'power') {
        return {
          question: `In the prime factorisation of ${a}${sup(k)}, what is the power (index) of ${p}?`,
          explanation: `${show(a, ea)}, so ${a}${sup(k)} contains (${p}${ea > 1 ? sup(ea) : ''})${sup(k)} = ${p}${sup(ea * k)}. The power of ${p} is ${ea} × ${k} = ${ea * k}.`,
          solutionSteps: [`${show(a, ea)}.`, `Raising to the power ${k} multiplies every index by ${k}.`, `${ea} × ${k} = ${ea * k}.`],
          method: '(pᵃ)ᵏ = pᵃᵏ.',
          hints: [`How many times does ${p} divide ${a}?`, `Raising to the power ${k} repeats that ${k} times.`],
          commonMistakes: ['Adding the index instead of multiplying.']
        };
      }
      return {
        question: `In the prime factorisation of ${a} × ${b}, what is the power (index) of ${p}?`,
        explanation: `${show(a, ea)} and ${show(b, eb)}. Multiplying adds the indices: ${ea} + ${eb} = ${ea + eb}.`,
        solutionSteps: [`${show(a, ea)}.`, `${show(b, eb)}.`, `pᵃ × pᵇ = pᵃ⁺ᵇ: ${ea} + ${eb} = ${ea + eb}.`],
        method: 'Factorise each number; add the indices of the same prime.',
        hints: [`How many times does ${p} divide ${a}? And ${b}?`, 'When you multiply powers of the same prime, the indices add.'],
        commonMistakes: ['Multiplying the indices instead of adding them.']
      };
    }
  },

  /* ================================= HCF uses ================================= */
  {
    id: 'hl-hcf-largest-tile',
    version: 1,
    topicId: 'hcf-lcm',
    conceptId: 'hl-hcf-apps',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['hl-hcf-f'],
    estimatedSeconds: 45,
    params(rng) {
      const H = rng.pick([5, 6, 8, 10, 12, 15, 16, 18, 20, 24, 25, 30, 32, 36, 40, 45, 48, 50, 60]);
      const p = rng.int(2, 12);
      const q = rng.int(2, 12);
      if (p === q || gcd(p, q) !== 1) return null;
      const l = H * Math.max(p, q);
      const w = H * Math.min(p, q);
      if (l > 1200 || w < 60) return null;
      return { H, l, w, context: rng.pick(['floor', 'sheet', 'courtyard']) };
    },
    answer: ({ H }) => H,
    formatValue: (value) => cm(value),
    distractors: ({ H, l, w }) => [
      { value: lcm(l, w), why: 'used the LCM instead of the HCF' },
      { value: H / smallestPrimeFactor(H), why: 'found a common factor, but not the highest' },
      { value: w, why: 'took the shorter side as the tile side' },
      { value: l - w, why: 'took the difference of the sides' }
    ],
    verify: ({ l, w }, value) => hcfByCounting(l, w) === value,
    render({ H, l, w, context }) {
      const what = { floor: `A room floor ${l} cm long and ${w} cm wide is to be covered with identical square tiles, with no tile cut.`, sheet: `A rectangular sheet ${l} cm by ${w} cm is to be cut into identical squares with nothing left over.`, courtyard: `A courtyard ${l} cm long and ${w} cm wide is to be paved with identical square slabs, without cutting any.` }[context];
      return {
        question: `${what} What is the largest possible side of each square?`,
        explanation: `The side must divide both ${l} and ${w} exactly, and we want the largest such number: HCF(${l}, ${w}) = ${H} cm.`,
        solutionSteps: [`${l} = ${H} × ${l / H}; ${w} = ${H} × ${w / H}.`, `${l / H} and ${w / H} share no factor, so HCF = ${H}.`, `Largest side = ${H} cm.`],
        method: 'Largest equal piece = HCF.',
        hints: ['The side has to fit a whole number of times along both edges.', 'Which is the largest number dividing both lengths?'],
        commonMistakes: ['Using the LCM, which is larger than both sides.']
      };
    }
  },

  {
    id: 'hl-hcf-fewest-pieces',
    version: 1,
    topicId: 'hcf-lcm',
    conceptId: 'hl-hcf-apps',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['hl-hcf-f'],
    estimatedSeconds: 65,
    params(rng) {
      const H = rng.pick([6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 30, 36, 40, 45]);
      if (rng.chance(0.5)) {
        const p = rng.int(2, 12);
        const q = rng.int(2, 12);
        if (p === q || gcd(p, q) !== 1) return null;
        return { mode: 'tiles', H, l: H * Math.max(p, q), w: H * Math.min(p, q) };
      }
      const shares = [rng.int(2, 15), rng.int(2, 15), rng.int(2, 15)];
      if (new Set(shares).size < 3 || gcd(gcd(shares[0], shares[1]), shares[2]) !== 1) return null;
      return { mode: 'cans', H, amounts: shares.map((s) => s * H) };
    },
    answer: ({ mode, H, l, w, amounts }) => (mode === 'tiles' ? (l * w) / (H * H) : amounts.reduce((s, x) => s + x, 0) / H),
    formatValue: (value, { mode }) => `${fmt(value)} ${mode === 'tiles' ? 'tiles' : 'cans'}`,
    distractors({ mode, H, l, w, amounts }) {
      const g = H / smallestPrimeFactor(H);
      if (mode === 'tiles') {
        return [
          { value: (l * w) / H, why: 'divided the area by the tile side instead of the tile area' },
          { value: l / H + w / H, why: 'added the tiles along each side instead of multiplying' },
          { value: (l * w) / (g * g), why: 'used a common factor smaller than the HCF' }
        ];
      }
      const total = amounts.reduce((s, x) => s + x, 0);
      return [
        { value: H, why: 'gave the size of each can, not the number of cans' },
        { value: total / g, why: 'used a common factor smaller than the HCF' },
        { value: Math.max(...amounts) / H, why: 'counted the cans for only the largest quantity' }
      ];
    },
    // Find the HCF by counting down, then count the pieces.
    verify({ mode, l, w, amounts }, value) {
      if (mode === 'tiles') {
        const side = hcfByCounting(l, w);
        return (l / side) * (w / side) === value;
      }
      const size = hcfByCounting(...amounts);
      return amounts.reduce((s, x) => s + x / size, 0) === value;
    },
    render({ mode, H, l, w, amounts }) {
      if (mode === 'tiles') {
        const n = (l * w) / (H * H);
        return {
          question: `A floor ${l} cm long and ${w} cm wide is to be covered with the largest possible identical square tiles, with no tile cut. How many tiles are needed?`,
          explanation: `The largest tile has side HCF(${l}, ${w}) = ${H} cm. Along the length ${l} ÷ ${H} = ${l / H} tiles fit, and along the width ${w} ÷ ${H} = ${w / H}, so ${l / H} × ${w / H} = ${n} tiles.`,
          solutionSteps: [`HCF(${l}, ${w}) = ${H} cm.`, `${l / H} tiles along the length, ${w / H} along the width.`, `${l / H} × ${w / H} = ${n} tiles.`],
          method: 'Tile side = HCF; number = (length ÷ side) × (width ÷ side).',
          hints: ['Fewest tiles means the largest tile — use the HCF.', 'Count the tiles in one row and the number of rows.'],
          commonMistakes: ['Dividing the floor area by the tile side instead of the tile area.']
        };
      }
      const [x, y, z] = amounts;
      const total = x + y + z;
      return {
        question: `A trader has ${x} litres of one oil, ${y} litres of a second and ${z} litres of a third. He wants to fill them into cans of the same size without mixing, so that every can is full. What is the least number of cans he needs?`,
        explanation: `The fewest cans means the largest can that divides all three amounts: HCF(${x}, ${y}, ${z}) = ${H} litres. Cans = ${x / H} + ${y / H} + ${z / H} = ${total / H}.`,
        solutionSteps: [`HCF(${x}, ${y}, ${z}) = ${H}.`, `${x} ÷ ${H} = ${x / H}, ${y} ÷ ${H} = ${y / H}, ${z} ÷ ${H} = ${z / H}.`, `Total = ${total / H} cans.`],
        method: 'Can size = HCF; cans = total ÷ HCF.',
        hints: ['The fewest cans means each can should be as large as possible.', 'The can size must divide every amount exactly.'],
        commonMistakes: ['Stopping at the HCF and giving the can size instead of the number of cans.']
      };
    }
  }
];
