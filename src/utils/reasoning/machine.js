/**
 * Input-output (machine input rearrangement), as set in bank mains papers.
 *
 * A machine is given a line of words and/or numbers and rearranges it one step
 * at a time. A sorting machine picks elements by value (the word first in
 * dictionary order, the largest number, ...) and moves each one to the left
 * end, just after the elements already placed there, or to the right end, just
 * before those already placed there. A rotating machine moves the last element
 * to the front (or the first to the back). An arithmetic machine changes every
 * number in each step.
 *
 * Conventions (said in the lessons too):
 *   - Words are lower case and compared in dictionary order; numbers by value.
 *     Every element of a line is different.
 *   - A step that would leave the line unchanged (the element is already in
 *     its place) is not counted: the machine goes straight on to the next move.
 *   - A sorting machine stops when no more elements can be picked. The last
 *     step is the last line it shows.
 *
 * Two independent methods:
 *   runMachine        splices the elements one move at a time (the machine itself)
 *   linesByFormula    works out the order of picks by sorting, then writes each
 *                     line directly: placed-left elements, then the rest in their
 *                     input order, then placed-right elements (a move never
 *                     changes the order of the elements it does not touch)
 * and, for the number of steps of a left-filling machine, a counting rule:
 * an element needs a step only if something not yet placed stands ahead of it.
 */

export const isNumberToken = (t) => /^\d+$/.test(String(t));
const byWord = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byNumber = (a, b) => Number(a) - Number(b);

/** How each pick chooses among the elements not yet placed. */
export const PICKS = {
  'word-first': { pool: 'word', order: (xs) => [...xs].sort(byWord), text: 'the word that comes first in dictionary order' },
  'word-last': { pool: 'word', order: (xs) => [...xs].sort(byWord).reverse(), text: 'the word that comes last in dictionary order' },
  'num-min': { pool: 'number', order: (xs) => [...xs].sort(byNumber), text: 'the smallest number' },
  'num-max': { pool: 'number', order: (xs) => [...xs].sort(byNumber).reverse(), text: 'the largest number' }
};

/**
 * The machines. `moves` are tried in order; `mode: 'each'` makes every move in
 * every step, `mode: 'alternate'` makes one move per step, taking turns (a move
 * whose elements have run out hands its turn to the other).
 */
export const RULES = {
  'words-az-left': {
    kind: 'sort',
    mode: 'each',
    moves: [{ pick: 'word-first', to: 'left' }],
    short: 'Words A to Z, from the left',
    text: 'In each step, the word that comes first in dictionary order moves to the left end, just after the words already placed.'
  },
  'words-za-left': {
    kind: 'sort',
    mode: 'each',
    moves: [{ pick: 'word-last', to: 'left' }],
    short: 'Words Z to A, from the left',
    text: 'In each step, the word that comes last in dictionary order moves to the left end, just after the words already placed.'
  },
  'words-az-right': {
    kind: 'sort',
    mode: 'each',
    moves: [{ pick: 'word-first', to: 'right' }],
    short: 'Words A to Z, from the right',
    text: 'In each step, the word that comes first in dictionary order moves to the right end, just before the words already placed.'
  },
  'nums-up-left': {
    kind: 'sort',
    mode: 'each',
    moves: [{ pick: 'num-min', to: 'left' }],
    short: 'Smallest number first, from the left',
    text: 'In each step, the smallest number moves to the left end, just after the numbers already placed.'
  },
  'nums-down-left': {
    kind: 'sort',
    mode: 'each',
    moves: [{ pick: 'num-max', to: 'left' }],
    short: 'Largest number first, from the left',
    text: 'In each step, the largest number moves to the left end, just after the numbers already placed.'
  },
  'word-left-num-right': {
    kind: 'sort',
    mode: 'each',
    moves: [
      { pick: 'word-first', to: 'left' },
      { pick: 'num-max', to: 'right' }
    ],
    short: 'A word to the left and a number to the right, every step',
    text: 'In each step, the word that comes first in dictionary order moves to the left end and the largest number moves to the right end (each next to those already placed).'
  },
  'num-left-word-right': {
    kind: 'sort',
    mode: 'each',
    moves: [
      { pick: 'num-min', to: 'left' },
      { pick: 'word-last', to: 'right' }
    ],
    short: 'A number to the left and a word to the right, every step',
    text: 'In each step, the smallest number moves to the left end and the word that comes last in dictionary order moves to the right end (each next to those already placed).'
  },
  'word-num-alternate': {
    kind: 'sort',
    mode: 'alternate',
    moves: [
      { pick: 'word-first', to: 'left' },
      { pick: 'num-max', to: 'right' }
    ],
    short: 'Words and numbers in turn',
    text: 'Steps take turns: odd steps move the word that comes first in dictionary order to the left end, even steps move the largest number to the right end (each next to those already placed).'
  },
  'rotate-right': {
    kind: 'rotate',
    by: 1,
    short: 'Last to the front',
    text: 'In each step, the last element moves to the front and the rest shift one place right.'
  },
  'rotate-left': {
    kind: 'rotate',
    by: -1,
    short: 'First to the back',
    text: 'In each step, the first element moves to the back and the rest shift one place left.'
  }
};

export const RULE_IDS = Object.keys(RULES);
export const SORT_RULE_IDS = RULE_IDS.filter((id) => RULES[id].kind === 'sort');

export const ROMAN = ['Input', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
export const stepName = (k) => (k === 0 ? 'Input' : `Step ${ROMAN[k]}`);
export const lineText = (line) => line.join(' ');

function poolOf(line, pick) {
  const want = PICKS[pick].pool;
  return line.filter((t) => (want === 'number' ? isNumberToken(t) : !isNumberToken(t)));
}

function checkInput(input) {
  if (new Set(input).size !== input.length) throw new Error(`elements must all be different: ${input.join(' ')}`);
}

/* ------------------------------ the machine itself ------------------------------ */

/**
 * Run a machine. Returns { lines, moved } where lines[0] is the input and
 * lines[k] is step k (steps that change nothing are left out), and moved[k] is
 * the list of elements that step k moved. A rotating machine runs `steps`
 * steps (default: until it is back where it started, less one).
 */
export function runMachine(input, ruleId, { steps } = {}) {
  checkInput(input);
  const rule = RULES[ruleId];
  if (!rule) throw new Error(`unknown rule ${ruleId}`);
  if (rule.kind === 'rotate') {
    const lines = [[...input]];
    const moved = [[]];
    const count = steps ?? input.length - 1;
    let line = [...input];
    for (let k = 0; k < count; k++) {
      if (rule.by > 0) {
        const last = line.pop();
        line.unshift(last);
        moved.push([last]);
      } else {
        const first = line.shift();
        line.push(first);
        moved.push([first]);
      }
      lines.push([...line]);
    }
    return { lines, moved };
  }

  let line = [...input];
  const n = line.length;
  const placed = new Set();
  let left = 0;
  let right = 0;
  const lines = [[...input]];
  const moved = [[]];
  const nextFor = (move) => {
    const pool = poolOf(line, move.pick).filter((t) => !placed.has(t));
    return pool.length ? PICKS[move.pick].order(pool)[0] : null;
  };
  const place = (token, to) => {
    const i = line.indexOf(token);
    line.splice(i, 1);
    if (to === 'left') {
      line.splice(left, 0, token);
      left += 1;
    } else {
      line.splice(n - right - 1, 0, token);
      right += 1;
    }
    placed.add(token);
    return line.indexOf(token) !== i;
  };
  let turn = 0;
  for (let guard = 0; guard < 4 * n + 4; guard++) {
    const before = lineText(line);
    const movedNow = [];
    let picked = false;
    if (rule.mode === 'each') {
      for (const move of rule.moves) {
        const token = nextFor(move);
        if (token === null) continue;
        picked = true;
        if (place(token, move.to)) movedNow.push(token);
      }
    } else {
      for (let tries = 0; tries < rule.moves.length; tries++) {
        const move = rule.moves[(turn + tries) % rule.moves.length];
        const token = nextFor(move);
        if (token === null) continue;
        picked = true;
        if (place(token, move.to)) movedNow.push(token);
        break;
      }
      turn += 1;
    }
    if (!picked) break;
    if (lineText(line) !== before) {
      lines.push([...line]);
      moved.push(movedNow);
    }
  }
  return { lines, moved };
}

/** The last line a sorting machine shows, and the number of steps it took. */
export function finalOf(input, ruleId) {
  const { lines } = runMachine(input, ruleId);
  return { line: lines.at(-1), steps: lines.length - 1 };
}

/* ------------------------------ the same, written directly ------------------------------ */

/**
 * The order in which a sorting machine picks, worked out by sorting alone,
 * grouped by step attempt: [[{ token, to }, ...], ...]. No line is touched.
 */
export function pickSchedule(input, ruleId) {
  const rule = RULES[ruleId];
  const queues = rule.moves.map((move) => ({ to: move.to, list: PICKS[move.pick].order(poolOf(input, move.pick)) }));
  // Two moves may share a pool (never in RULES, but be safe): a token is picked once.
  const taken = new Set();
  const take = (q) => {
    while (q.list.length && taken.has(q.list[0])) q.list.shift();
    if (!q.list.length) return null;
    const token = q.list.shift();
    taken.add(token);
    return { token, to: q.to };
  };
  const groups = [];
  let turn = 0;
  for (;;) {
    const group = [];
    if (rule.mode === 'each') {
      for (const q of queues) {
        const got = take(q);
        if (got) group.push(got);
      }
    } else {
      for (let tries = 0; tries < queues.length; tries++) {
        const got = take(queues[(turn + tries) % queues.length]);
        if (got) {
          group.push(got);
          break;
        }
      }
      turn += 1;
    }
    if (!group.length) break;
    groups.push(group);
  }
  return groups;
}

/**
 * True when every step of the run moves exactly the elements of the next pick
 * (no pick in the middle finds its element already in place), so step k is
 * simply "k picks done". Exam sets are written this way.
 */
export function cleanRun(input, ruleId) {
  if (RULES[ruleId].kind !== 'sort') return true;
  const { moved } = runMachine(input, ruleId);
  const groups = pickSchedule(input, ruleId);
  return moved.slice(1).every((tokens, i) => groups[i] && [...tokens].sort().join('|') === groups[i].map((g) => g.token).sort().join('|'));
}

/** The line once these elements are placed: left ones in pick order, the rest as in the input, right ones last-placed first. */
export function lineAfter(input, placedLeft, placedRight) {
  const done = new Set([...placedLeft, ...placedRight]);
  return [...placedLeft, ...input.filter((t) => !done.has(t)), ...[...placedRight].reverse()];
}

/** Every line of a machine, written directly (no step-by-step moving). Same shape as runMachine(...).lines. */
export function linesByFormula(input, ruleId, { steps } = {}) {
  const rule = RULES[ruleId];
  const n = input.length;
  if (rule.kind === 'rotate') {
    const count = steps ?? n - 1;
    return Array.from({ length: count + 1 }, (_, k) => input.map((_, i) => input[(((i - rule.by * k) % n) + n) % n]));
  }
  const lines = [[...input]];
  const left = [];
  const right = [];
  for (const group of pickSchedule(input, ruleId)) {
    for (const { token, to } of group) (to === 'left' ? left : right).push(token);
    const line = lineAfter(input, left, right);
    if (lineText(line) !== lineText(lines.at(-1))) lines.push(line);
  }
  return lines;
}

/**
 * Steps a one-move, left-filling machine needs, by counting alone: an element
 * needs a step exactly when some element placed after it (or never placed)
 * stands ahead of it in the input.
 */
export function stepsByCounting(input, ruleId) {
  const rule = RULES[ruleId];
  if (rule.kind !== 'sort' || rule.moves.length !== 1 || rule.moves[0].to !== 'left') throw new Error('counting rule is for one-move, left-filling machines');
  const order = PICKS[rule.moves[0].pick].order(poolOf(input, rule.moves[0].pick));
  const rank = new Map(order.map((t, i) => [t, i]));
  return order.filter((t) => input.slice(0, input.indexOf(t)).some((u) => !rank.has(u) || rank.get(u) > rank.get(t))).length;
}

/* ------------------------------ rules from steps ------------------------------ */

/**
 * Which machines in `ruleIds` (default: all) turn `input` into every shown
 * step? `shown` is { [stepNumber]: line }. Lines are compared as text.
 */
export function consistentRules(input, shown, ruleIds = RULE_IDS) {
  const ks = Object.keys(shown).map(Number);
  const most = Math.max(...ks);
  return ruleIds.filter((id) => {
    const { lines } = runMachine(input, id, { steps: Math.max(most, input.length - 1) });
    return ks.every((k) => lines[k] && lineText(lines[k]) === lineText(shown[k]));
  });
}

/* ------------------------------ from a later step ------------------------------ */

/**
 * The line `m` steps on, given only step k of some input (one-move-per-step
 * machines with no skipped steps before k): the first k picks are already
 * placed, and the machine carries on from there.
 */
export function continueFrom(line, k, ruleId, m) {
  const rule = RULES[ruleId];
  if (rule.kind === 'rotate') return linesByFormula(line, ruleId, { steps: m - k })[m - k];
  const groups = pickSchedule(line, ruleId);
  const left = [];
  const right = [];
  for (const group of groups.slice(0, k)) for (const { token, to } of group) (to === 'left' ? left : right).push(token);
  // The line at step k must already show those picks in place.
  if (lineText(lineAfter(line, left, right)) !== lineText(line)) return null;
  let current = [...line];
  let step = k;
  for (const group of groups.slice(k)) {
    for (const { token, to } of group) (to === 'left' ? left : right).push(token);
    const next = lineAfter(line, left, right);
    if (lineText(next) === lineText(current)) continue;
    current = next;
    step += 1;
    if (step === m) return current;
  }
  return step === m ? current : null;
}

/** Every ordering of a list (for brute force over small inputs). */
export function permutations(list) {
  if (list.length <= 1) return [list.slice()];
  const out = [];
  list.forEach((x, i) => {
    for (const rest of permutations(list.filter((_, j) => j !== i))) out.push([x, ...rest]);
  });
  return out;
}

/**
 * Brute force: every input made of the same elements whose step k is `line`;
 * returns the distinct texts of their step m (one text means the question is
 * well posed).
 */
export function stepMFromStepKBrute(line, k, ruleId, m) {
  const out = new Set();
  for (const input of permutations(line)) {
    const { lines } = runMachine(input, ruleId, { steps: m });
    if (lines[k] && lineText(lines[k]) === lineText(line) && lines[m]) out.add(lineText(lines[m]));
  }
  return [...out];
}

/** Brute force: every input of these elements whose step k is `line`. */
export function inputsForStep(line, k, ruleId) {
  return permutations(line).filter((input) => {
    const { lines } = runMachine(input, ruleId, { steps: k });
    return lines[k] && lineText(lines[k]) === lineText(line);
  });
}

/* ------------------------------ arithmetic machines ------------------------------ */

/** Operations, applied to every number in a step, in turn: { op: 'add' | 'sub' | 'mul', k }. */
export const opText = ({ op, k }) => (op === 'add' ? `add ${k}` : op === 'sub' ? `subtract ${k}` : `multiply by ${k}`);
export const applyOp = (x, { op, k }) => (op === 'add' ? x + k : op === 'sub' ? x - k : x * k);

/** Every line of an arithmetic machine, one operation per step, cycling through `ops`. */
export function arithmeticLines(input, ops, steps) {
  const lines = [[...input]];
  for (let s = 0; s < steps; s++) lines.push(lines.at(-1).map((x) => applyOp(x, ops[s % ops.length])));
  return lines;
}

/** The same machine as one map x → m·x + c after `steps` steps (composing the operations). */
export function affineAfter(ops, steps) {
  let m = 1;
  let c = 0;
  for (let s = 0; s < steps; s++) {
    const { op, k } = ops[s % ops.length];
    if (op === 'add') c += k;
    else if (op === 'sub') c -= k;
    else {
      m *= k;
      c *= k;
    }
  }
  return { m, c };
}

/** The input number that becomes `value` after `steps` steps, by undoing the map; null if none is a whole number. */
export function arithmeticInput(value, ops, steps) {
  const { m, c } = affineAfter(ops, steps);
  const x = (value - c) / m;
  return Number.isInteger(x) ? x : null;
}
