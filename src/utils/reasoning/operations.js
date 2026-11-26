/**
 * Mathematical operations: symbol substitution ("+ means ×"), BODMAS after the
 * substitution, which equation is correct, interchanging two signs or two
 * numbers, filling in signs, and defined operations (a ★ b = 2a + b).
 *
 * An expression is a list of tokens: numbers, the four signs '+', '−', '×',
 * '÷' (the real minus sign, as printed), and brackets '(' and ')'. A coded
 * expression uses any other strings for its signs (letters, '@', or the real
 * signs standing for something else); `decode` rewrites it with a key.
 *
 * Two conventions are in use in Indian exam keys: the standard one (× and ÷ on
 * one level, + and − on the next, left to right within a level) and a literal
 * reading of "DMAS" (÷, then ×, then +, then −). They differ on 9 − 4 + 2
 * (7 one way, 3 the other), and on whether 8 × 3 ÷ 6 divides 3 by 6. Every
 * question in the app is chosen so that both give the same value, and every
 * division comes out whole: `cleanValue` returns the value only then.
 *
 * Two independent evaluators: `collapseSteps` works an expression one
 * operation at a time on the token list (as a learner writes it out), and
 * `parseValue` is a precedence-climbing parser over the printed text. Tests
 * hold them to each other on thousands of random expressions; the generators
 * answer with one and verify with the other.
 */

export const OPS = ['+', '−', '×', '÷'];
export const OP_WORDS = { '+': 'addition', '−': 'subtraction', '×': 'multiplication', '÷': 'division' };
export const SIGN_PAIRS = [
  ['+', '−'],
  ['+', '×'],
  ['+', '÷'],
  ['−', '×'],
  ['−', '÷'],
  ['×', '÷']
];
export const pairText = ([a, b]) => `${a} and ${b}`;

const isOp = (t) => typeof t === 'string' && OPS.includes(t);

/** a op b, or null when the division is not whole (or by zero). */
export function apply(a, op, b) {
  if (op === '+') return a + b;
  if (op === '−') return a - b;
  if (op === '×') return a * b;
  if (op === '÷') return b !== 0 && a % b === 0 ? a / b : null;
  return null;
}

/** "16 ÷ 4 × (3 + 9)" from tokens. */
export function exprText(tokens) {
  return tokens
    .map(String)
    .join(' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')');
}

/* ------------------------------ method 1: collapsing the tokens ------------------------------ */

/** The operator to do next among tokens[lo..hi), by convention. */
function pickOperator(tokens, lo, hi, convention) {
  const ops = [];
  for (let i = lo; i < hi; i++) if (isOp(tokens[i])) ops.push(i);
  if (!ops.length) return null;
  if (convention === 'left') return ops[0];
  if (convention === 'dmas') {
    for (const op of ['÷', '×', '+', '−']) {
      const at = ops.find((i) => tokens[i] === op);
      if (at !== undefined) return at;
    }
  }
  const strong = ops.find((i) => tokens[i] === '×' || tokens[i] === '÷');
  return strong !== undefined ? strong : ops[0];
}

/**
 * Every line of the working, one operation at a time:
 * [{ tokens, next: { index, op } | null, resultAt }]. Innermost bracket first.
 * `convention`: 'standard' (BODMAS), 'dmas' (÷, ×, +, − strictly in turn) or
 * 'left' (straight left to right: the classic mistake). Returns null if a
 * division is not whole, unless `exact` is false (then it divides anyway, for
 * the simulation to show where a wrong choice leads).
 */
export function collapseSteps(tokens, convention = 'standard', { exact = true } = {}) {
  const lines = [];
  let current = tokens.slice();
  let resultAt = null;
  for (let guard = 0; guard < 40; guard++) {
    const close = current.indexOf(')');
    const lo = close >= 0 ? current.lastIndexOf('(', close) + 1 : 0;
    const hi = close >= 0 ? close : current.length;
    const index = pickOperator(current, lo, hi, convention);
    if (index === null) {
      if (close >= 0) {
        // A bracket holding one number: drop it.
        current = [...current.slice(0, lo - 1), current[lo], ...current.slice(close + 1)];
        resultAt = lo - 1;
        continue;
      }
      lines.push({ tokens: current, next: null, resultAt });
      return lines;
    }
    lines.push({ tokens: current, next: { index, op: current[index] }, resultAt });
    let value = apply(current[index - 1], current[index], current[index + 1]);
    if (value === null) {
      if (exact || current[index + 1] === 0) return null;
      value = current[index - 1] / current[index + 1];
    }
    current = [...current.slice(0, index - 1), value, ...current.slice(index + 2)];
    resultAt = index - 1;
    if (current[resultAt - 1] === '(' && current[resultAt + 1] === ')') {
      current = [...current.slice(0, resultAt - 1), value, ...current.slice(resultAt + 2)];
      resultAt -= 1;
    }
  }
  return null;
}

/** The value by collapsing, or null (a division not whole). */
export function evaluate(tokens, convention = 'standard') {
  const lines = collapseSteps(tokens, convention);
  if (!lines) return null;
  const last = lines.at(-1).tokens;
  return last.length === 1 && typeof last[0] === 'number' ? last[0] : null;
}

/** The value when both conventions agree and every division is whole; otherwise null. */
export function cleanValue(tokens) {
  const a = evaluate(tokens, 'standard');
  const b = evaluate(tokens, 'dmas');
  return a !== null && a === b ? a : null;
}

/* ------------------------------ method 2: parsing the printed text ------------------------------ */

const LEVELS = {
  standard: { '+': 1, '−': 1, '×': 2, '÷': 2 },
  dmas: { '−': 1, '+': 2, '×': 3, '÷': 4 }
};

/** Split printed text such as "18 ÷ 3 × (4 + 2)" into tokens. Accepts '-', '*', 'x', '/' too. */
export function tokenize(text) {
  const out = [];
  const alias = { '-': '−', '*': '×', x: '×', '/': '÷' };
  const re = /\s*(\d+|[+\-−×÷*x/()])/gy;
  let m;
  let at = 0;
  while ((m = re.exec(text)) !== null) {
    const t = m[1];
    out.push(/^\d+$/.test(t) ? Number(t) : alias[t] || t);
    at = re.lastIndex;
  }
  if (text.slice(at).trim()) throw new Error(`cannot read "${text}"`);
  return out;
}

/**
 * The value of printed text (or tokens), by precedence climbing: each sign has
 * a level (standard: + − 1, × ÷ 2; dmas: − 1, + 2, × 3, ÷ 4) and runs left to
 * right. Returns null if a division is not whole.
 */
export function parseValue(input, convention = 'standard') {
  const tokens = typeof input === 'string' ? tokenize(input) : input.map((t) => t);
  const level = LEVELS[convention];
  let pos = 0;
  let bad = false;
  const primary = () => {
    const t = tokens[pos++];
    if (t === '(') {
      const v = expression(1);
      if (tokens[pos++] !== ')') throw new Error('missing )');
      return v;
    }
    if (typeof t !== 'number') throw new Error(`unexpected ${t}`);
    return t;
  };
  const expression = (min) => {
    let left = primary();
    while (pos < tokens.length && level[tokens[pos]] >= min) {
      const op = tokens[pos++];
      const right = expression(level[op] + 1);
      if (op === '+') left += right;
      else if (op === '−') left -= right;
      else if (op === '×') left *= right;
      else if (right === 0 || left % right !== 0) {
        bad = true;
        left = 0;
      } else left /= right;
    }
    return left;
  };
  const value = expression(1);
  if (pos !== tokens.length) throw new Error('trailing tokens');
  return bad ? null : value;
}

/** cleanValue by the parser: both conventions agree, every division whole. */
export function cleanByParser(input) {
  const a = parseValue(input, 'standard');
  const b = parseValue(input, 'dmas');
  return a !== null && a === b ? a : null;
}

/* ------------------------------ substitution ------------------------------ */

/** Rewrite every coded sign with the key, all at once: { coded: real }. Numbers and brackets stay. */
export function decode(tokens, key) {
  return tokens.map((t) => (typeof t === 'string' && t in key ? key[t] : t));
}

/**
 * The classic slip: replacing one sign at a time through the whole line, so a
 * sign already rewritten gets rewritten again (+ → ×, then × → −, ...).
 */
export function decodeOneByOne(tokens, key) {
  let out = tokens.slice();
  for (const [from, to] of Object.entries(key)) out = out.map((t) => (t === from ? to : t));
  return out;
}

/** The key written out: "+ means ×, × means −". */
export function keyText(key, verb = 'means') {
  return Object.entries(key)
    .map(([from, to]) => `‘${from}’ ${verb} ‘${to}’`)
    .join(', ');
}

/* ------------------------------ interchanges ------------------------------ */

export function interchangeSigns(tokens, a, b) {
  return tokens.map((t) => (t === a ? b : t === b ? a : t));
}

export function interchangeNumbers(tokens, x, y) {
  return tokens.map((t) => (t === x ? y : t === y ? x : t));
}

/** Does left = right hold, in both conventions (both sides may be token lists or numbers)? */
export function holds(left, right) {
  const l = cleanValue(left);
  const r = typeof right === 'number' ? right : cleanValue(right);
  return l !== null && r !== null && l === r;
}

/** Might left = right be read as true in either convention? (For uniqueness: any such reading counts.) */
export function mightHold(left, right) {
  const rs = typeof right === 'number' ? [right] : ['standard', 'dmas'].map((c) => evaluate(right, c));
  return ['standard', 'dmas'].some((c) => {
    const v = evaluate(left, c);
    return v !== null && rs.includes(v);
  });
}

/** Every sign pair whose interchange makes left = right true in some reading (brute force over the six pairs). */
export function signSwapsThatWork(left, right) {
  return SIGN_PAIRS.filter(([a, b]) => mightHold(interchangeSigns(left, a, b), typeof right === 'number' ? right : interchangeSigns(right, a, b)));
}

/** Every pair of different numbers on the left whose interchange makes left = right true in some reading. */
export function numberSwapsThatWork(left, right) {
  const nums = [...new Set(left.filter((t) => typeof t === 'number'))];
  const out = [];
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (mightHold(interchangeNumbers(left, nums[i], nums[j]), right)) out.push([nums[i], nums[j]]);
  return out;
}

/** Numbers and signs interleaved: [6, '×', 3, ...]. */
export function interleave(numbers, signs) {
  const out = [numbers[0]];
  signs.forEach((s, i) => out.push(s, numbers[i + 1]));
  return out;
}

/** Every sequence of signs (from `allowed`, each used at most once if `distinct`) that makes the numbers equal rhs, in some reading. */
export function fillSigns(numbers, rhs, { allowed = OPS, distinct = false } = {}) {
  const out = [];
  const go = (signs) => {
    if (signs.length === numbers.length - 1) {
      if (mightHold(interleave(numbers, signs), rhs)) out.push(signs.slice());
      return;
    }
    for (const s of allowed) {
      if (distinct && signs.includes(s)) continue;
      signs.push(s);
      go(signs);
      signs.pop();
    }
  };
  go([]);
  return out;
}

/** Whole numbers x from lo to hi that make the expression (with '?' for x) equal rhs, in some reading. */
export function solveUnknown(tokens, rhs, lo = 0, hi = 1000) {
  const out = [];
  for (let x = lo; x <= hi; x++) if (mightHold(tokens.map((t) => (t === '?' ? x : t)), rhs)) out.push(x);
  return out;
}

/* ------------------------------ defined operations ------------------------------ */

/**
 * A defined operation from its rule as tokens in 'a' and 'b', e.g.
 * a ★ b = 2a + b → [2, '×', 'a', '+', 'b']. Returns (a, b) => value (null if a
 * division is not whole, or the conventions disagree).
 */
export function defineOp(rule) {
  return (a, b) => cleanValue(rule.flatMap((t) => (t === 'a' ? [a] : t === 'b' ? [b] : [t])));
}

/** The rule as printed, as in textbooks: "2a + b", "ab − a", "a² − b", "(a + b) ÷ 2". */
export function ruleText(rule) {
  const isLetter = (t) => t === 'a' || t === 'b';
  const out = [];
  for (let i = 0; i < rule.length; i++) {
    const t = rule[i];
    const next = rule[i + 2];
    if (rule[i + 1] === '×' && isLetter(next) && (typeof t === 'number' || isLetter(t))) {
      // 2 × a is 2a, a × b is ab, a × a is a².
      out.push(t === next ? `${t}²` : `${t}${next}`);
      i += 2;
    } else out.push(String(t));
  }
  return exprText(out);
}

/**
 * Work a nested use of defined operations, innermost first:
 * ['(', 3, '★', 4, ')', '#', 2] with ops { '★': rule, '#': rule }. Operations
 * outside brackets go left to right. Returns the value, or null.
 */
export function evaluateDefined(tokens, ops) {
  const fns = Object.fromEntries(Object.entries(ops).map(([s, rule]) => [s, defineOp(rule)]));
  let current = tokens.slice();
  for (let guard = 0; guard < 20; guard++) {
    const close = current.indexOf(')');
    const lo = close >= 0 ? current.lastIndexOf('(', close) + 1 : 0;
    const hi = close >= 0 ? close : current.length;
    let i = lo;
    while (i < hi && !(current[i] in fns)) i++;
    if (i >= hi) {
      if (close >= 0) {
        current = [...current.slice(0, lo - 1), current[lo], ...current.slice(close + 1)];
        continue;
      }
      return current.length === 1 ? current[0] : null;
    }
    const v = fns[current[i]](current[i - 1], current[i + 1]);
    if (v === null) return null;
    current = [...current.slice(0, i - 1), v, ...current.slice(i + 2)];
  }
  return null;
}
