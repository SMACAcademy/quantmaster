/**
 * Reasoning inequalities: chains such as P ≥ Q > R = S < T, and conclusions
 * about two letters.
 *
 * Two ways to find how two letters compare:
 *   pathRelation   walk the chain from one letter to the other and combine the
 *                  signs met on the way (the exam method: a ">" and a "<" on the
 *                  same path leave no definite relation)
 *   bruteRelation  give every letter a value from 1 to the number of letters, in
 *                  every way the statements allow, and see which comparisons occur
 * They must agree; generators keep a question only when they do.
 *
 * A relation is { x, op, y } with op one of > ≥ = ≤ <. The derived relation
 * between two letters is one of those five, or 'none'.
 *
 * Conclusions follow only on an exact match: from P > Q the conclusion P ≥ Q is
 * logically true, but answer keys differ on it, so questions here never ask it
 * (`isContested` finds such cases so generators can avoid them).
 */

export const OPS = ['>', '≥', '=', '≤', '<'];
const FLIP = { '>': '<', '≥': '≤', '=': '=', '≤': '≥', '<': '>' };
export const flip = (op) => FLIP[op];

/** "P ≥ Q > R" → [{x:P, op:≥, y:Q}, {x:Q, op:>, y:R}] */
export function chainRelations(tokens) {
  const out = [];
  for (let i = 1; i < tokens.length; i += 2) out.push({ x: tokens[i - 1], op: tokens[i], y: tokens[i + 1] });
  return out;
}

export function lettersOf(relations) {
  return [...new Set(relations.flatMap((r) => [r.x, r.y]))];
}

/** The derived relation from x to y by walking the (tree-shaped) chain between them. */
export function pathRelation(relations, x, y) {
  if (x === y) return '=';
  // Breadth-first search, remembering the sign seen on each step in the x → y direction.
  const edges = new Map();
  const add = (u, v, op) => {
    if (!edges.has(u)) edges.set(u, []);
    edges.get(u).push({ v, op });
  };
  for (const r of relations) {
    add(r.x, r.y, r.op);
    add(r.y, r.x, flip(r.op));
  }
  const prev = new Map([[x, null]]);
  const queue = [x];
  while (queue.length) {
    const u = queue.shift();
    for (const { v, op } of edges.get(u) || []) {
      if (prev.has(v)) continue;
      prev.set(v, { u, op });
      queue.push(v);
    }
  }
  if (!prev.has(y)) return 'none';
  const ops = [];
  for (let at = y; prev.get(at); at = prev.get(at).u) ops.push(prev.get(at).op);
  const up = ops.some((op) => op === '>' || op === '≥');
  const down = ops.some((op) => op === '<' || op === '≤');
  if (up && down) return 'none';
  if (up) return ops.includes('>') ? '>' : '≥';
  if (down) return ops.includes('<') ? '<' : '≤';
  return '=';
}

const compare = (a, b, op) => ({ '>': a > b, '≥': a >= b, '=': a === b, '≤': a <= b, '<': a < b })[op];

/** Every assignment of values 1..L to the letters that satisfies the relations (backtracking). */
export function assignments(relations, letters = lettersOf(relations)) {
  const L = letters.length;
  const value = {};
  const out = [];
  const walk = (i) => {
    if (i === L) {
      out.push({ ...value });
      return;
    }
    const letter = letters[i];
    for (let v = 1; v <= L; v++) {
      value[letter] = v;
      const ok = relations.every((r) => value[r.x] === undefined || value[r.y] === undefined || compare(value[r.x], value[r.y], r.op));
      if (ok) walk(i + 1);
    }
    delete value[letter];
  };
  walk(0);
  return out;
}

/** The derived relation from x to y, from every allowed assignment. */
export function bruteRelation(relations, x, y, all = assignments(relations)) {
  if (!all.length) return 'none';
  const seen = new Set(all.map((v) => (v[x] > v[y] ? '>' : v[x] < v[y] ? '<' : '=')));
  const key = ['>', '=', '<'].filter((s) => seen.has(s)).join('');
  return { '>': '>', '>=': '≥', '=': '=', '=<': '≤', '<': '<' }[key] || 'none';
}

/** Does "x op y" follow from a derived relation, on an exact match? */
export const conclusionFollows = (derived, op) => derived === op;

/** True when "x op y" is logically true but weaker than what is known (P > Q, asked P ≥ Q). */
export function isContested(derived, op) {
  if (derived === op || derived === 'none') return false;
  if ((op === '≥' && (derived === '>' || derived === '=')) || (op === '≤' && (derived === '<' || derived === '='))) return true;
  return false;
}

export const IQ_VERDICTS = ['Only conclusion I is true', 'Only conclusion II is true', 'Either conclusion I or II is true', 'Neither conclusion I nor II is true', 'Both conclusions I and II are true'];

/**
 * The answer for two conclusions { x, op, y }. Either-or: neither follows, both
 * are about the same two letters, and exactly one of them is always true: they
 * are opposites (P > Q and P ≤ Q), or they split the derived relation (P ≥ Q
 * into P > Q and P = Q).
 */
export function iqVerdict(relations, c1, c2, derive = pathRelation) {
  const d1 = derive(relations, c1.x, c1.y);
  const d2 = derive(relations, c2.x, c2.y);
  const one = conclusionFollows(d1, c1.op);
  const two = conclusionFollows(d2, c2.op);
  if (one && two) return IQ_VERDICTS[4];
  if (one) return IQ_VERDICTS[0];
  if (two) return IQ_VERDICTS[1];
  // Put both conclusions in the same direction before comparing them.
  const c2same = c2.x === c1.x ? c2 : { x: c2.y, op: flip(c2.op), y: c2.x };
  if (c2same.x === c1.x && c2same.y === c1.y) {
    const pair = new Set([c1.op, c2same.op]);
    // One is the exact opposite of the other (> and ≤, < and ≥): one of them is always true.
    const opposite = (pair.has('>') && pair.has('≤')) || (pair.has('<') && pair.has('≥'));
    if (opposite || (d1 === '≥' && pair.has('>') && pair.has('=')) || (d1 === '≤' && pair.has('<') && pair.has('='))) return IQ_VERDICTS[2];
  }
  return IQ_VERDICTS[3];
}

/** The same answer by brute force: what is true in every assignment, and "exactly one" for either-or. */
export function iqVerdictBrute(relations, c1, c2) {
  const all = assignments(relations);
  const always = (c) => all.length > 0 && all.every((v) => compare(v[c.x], v[c.y], c.op));
  // Exact-match convention: a conclusion follows only when it is the strongest true relation.
  const strongest = (c) => bruteRelation(relations, c.x, c.y, all) === c.op;
  const one = always(c1) && strongest(c1);
  const two = always(c2) && strongest(c2);
  if (one && two) return IQ_VERDICTS[4];
  if (one) return IQ_VERDICTS[0];
  if (two) return IQ_VERDICTS[1];
  const samePair = (c1.x === c2.x && c1.y === c2.y) || (c1.x === c2.y && c1.y === c2.x);
  if (samePair && all.length && all.every((v) => compare(v[c1.x], v[c1.y], c1.op) !== compare(v[c2.x], v[c2.y], c2.op))) return IQ_VERDICTS[2];
  return IQ_VERDICTS[3];
}

/** "P ≥ Q > R" from relations written in a chain order. */
export const chainText = (tokens) => tokens.join(' ');

/* ------------------------------ coded symbols ------------------------------ */

/** Exam wording for each sign, used in coded questions. */
export const SIGN_MEANING = {
  '>': 'is neither smaller than nor equal to',
  '≥': 'is not smaller than',
  '=': 'is neither smaller than nor greater than',
  '≤': 'is not greater than',
  '<': 'is neither greater than nor equal to'
};
