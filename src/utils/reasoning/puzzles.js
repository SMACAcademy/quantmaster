/**
 * Arrangement puzzles: floors, stacked boxes, days of the week, and grids of
 * people and attributes (city, colour, fruit...). One model covers them all.
 *
 * A puzzle:
 *   people   names
 *   slots    true when the people are put in order (floors, a stack, days); the
 *            number of slots equals the number of people, slot 0 is the lowest
 *            floor, the bottom box or the first day
 *   attrs    [{ name, values }] each attribute gives every person a different value
 *   clues    plain objects (below)
 *
 * A solution: { slot: [slot of person 0, ...] or null, attr: [[value index of
 * person 0, ...] per attribute] }.
 *
 * A clue talks about "subjects": { p } is a person, { a, v } is whoever has value
 * v of attribute a ("the person who likes red").
 *   { t: 'same', x, y }        x and y are the same person (Ravi likes red; the red one is from Delhi)
 *   { t: 'diff', x, y }        x and y are different people
 *   { t: 'at', x, k } / { t: 'notAt', x, k }   x is / is not in slot k
 *   { t: 'above', x, y }       x is in a higher slot than y (later day)
 *   { t: 'justAbove', x, y }   x is in the slot right above y (the next day)
 *   { t: 'gap', x, y, k }      exactly k slots between x and y
 *   { t: 'adjacent', x, y } / { t: 'notAdjacent', x, y }
 *   { t: 'parity', x, even }   x's slot number (counting from 1) is even / odd
 *   { t: 'extreme', x }        x is in the lowest or the highest slot
 */

import { permutations } from './seating.js';

const ORDER_CLUES = new Set(['at', 'notAt', 'above', 'justAbove', 'gap', 'adjacent', 'notAdjacent', 'parity', 'extreme']);

/** Which dimensions a clue needs: 0 is the order, i + 1 is attribute i. */
function clueDims(clue) {
  const dims = new Set();
  for (const s of [clue.x, clue.y]) if (s && s.a !== undefined) dims.add(s.a + 1);
  if (ORDER_CLUES.has(clue.t)) dims.add(0);
  return dims;
}

function personOf(solution, subject) {
  if (subject.p !== undefined) return subject.p;
  return solution.attr[subject.a].indexOf(subject.v);
}

/** Does a clue hold in a solution? */
export function puzzleClueHolds(solution, clue) {
  const x = personOf(solution, clue.x);
  const y = clue.y ? personOf(solution, clue.y) : null;
  const slot = solution.slot;
  switch (clue.t) {
    case 'same':
      return x === y;
    case 'diff':
      return x !== y;
    case 'at':
      return slot[x] === clue.k;
    case 'notAt':
      return slot[x] !== clue.k;
    case 'above':
      return slot[x] > slot[y];
    case 'justAbove':
      return slot[x] === slot[y] + 1;
    case 'gap':
      return x !== y && Math.abs(slot[x] - slot[y]) - 1 === clue.k;
    case 'adjacent':
      return Math.abs(slot[x] - slot[y]) === 1;
    case 'notAdjacent':
      return x !== y && Math.abs(slot[x] - slot[y]) !== 1;
    case 'parity':
      return ((slot[x] + 1) % 2 === 0) === clue.even;
    case 'extreme':
      return slot[x] === 0 || slot[x] === slot.length - 1;
    default:
      throw new Error(`unknown puzzle clue "${clue.t}"`);
  }
}

/**
 * Every solution of a puzzle, by trying every order and every way of giving out
 * each attribute, checking each clue as soon as the parts it needs are chosen.
 */
export function solvePuzzle(puzzle, clues = puzzle.clues) {
  const n = puzzle.people.length;
  const dims = (puzzle.slots ? 1 : 0) + puzzle.attrs.length;
  const perms = permutations(n);
  // A clue is checked at the first stage where all its dimensions are known.
  const stageOf = (dim) => (puzzle.slots ? dim : dim - 1);
  const byStage = Array.from({ length: dims }, () => []);
  for (const clue of clues) {
    const needed = [...clueDims(clue)].map(stageOf);
    byStage[needed.length ? Math.max(...needed) : 0].push(clue);
  }
  const out = [];
  const current = { slot: puzzle.slots ? null : null, attr: puzzle.attrs.map(() => null) };
  const walk = (stage) => {
    if (stage === dims) {
      out.push({ slot: current.slot ? current.slot.slice() : null, attr: current.attr.map((a) => a.slice()) });
      return;
    }
    for (const perm of perms) {
      if (puzzle.slots && stage === 0) current.slot = perm;
      else current.attr[puzzle.slots ? stage - 1 : stage] = perm;
      if (byStage[stage].every((clue) => puzzleClueHolds(current, clue))) walk(stage + 1);
    }
  };
  walk(0);
  return out;
}

/**
 * A second, independent check: describe a solution the other way round (who is
 * in each slot, who holds each value) and test the clues on that description,
 * trying every combination with no early pruning.
 */
export function solvePuzzleByHolders(puzzle, clues = puzzle.clues) {
  const n = puzzle.people.length;
  const perms = permutations(n);
  const orders = puzzle.slots ? perms : [null];
  const out = [];
  const holds = (whoIn, holders, clue) => {
    const find = (s) => (s.p !== undefined ? s.p : holders[s.a][s.v]);
    const slotNo = (person) => whoIn.indexOf(person);
    const x = find(clue.x);
    const y = clue.y ? find(clue.y) : null;
    const sx = whoIn ? slotNo(x) : null;
    const sy = whoIn && y !== null ? slotNo(y) : null;
    const between = () => {
      const lo = Math.min(sx, sy);
      const hi = Math.max(sx, sy);
      return whoIn.slice(lo + 1, hi).length;
    };
    return {
      same: () => x === y,
      diff: () => x !== y,
      at: () => whoIn[clue.k] === x,
      notAt: () => whoIn[clue.k] !== x,
      above: () => sx - sy > 0,
      justAbove: () => whoIn[sy + 1] === x,
      gap: () => x !== y && between() === clue.k,
      adjacent: () => whoIn[sx + 1] === y || whoIn[sx - 1] === y,
      notAdjacent: () => x !== y && whoIn[sx + 1] !== y && whoIn[sx - 1] !== y,
      parity: () => (sx % 2 === 1) === clue.even,
      extreme: () => whoIn[0] === x || whoIn[whoIn.length - 1] === x
    }[clue.t]();
  };
  const combos = (k) => (k === 0 ? [[]] : combos(k - 1).flatMap((rest) => perms.map((p) => [...rest, p])));
  for (const whoIn of orders) {
    for (const holders of combos(puzzle.attrs.length)) {
      if (clues.every((clue) => holds(whoIn, holders, clue))) {
        // Back to the solver's shape, so the two can be compared.
        const slot = whoIn ? Array.from({ length: n }, (_, person) => whoIn.indexOf(person)) : null;
        const attr = holders.map((h) => Array.from({ length: n }, (_, person) => h.indexOf(person)));
        out.push({ slot, attr });
      }
    }
  }
  return out;
}

/** A canonical string for a solution, to compare solution sets. */
export const solutionKey = (s) => JSON.stringify([s.slot, s.attr]);

/**
 * The grid a learner draws: for each person and each value, 'yes' when every
 * solution agrees, 'no' when none has it, null while open. `dim` -1 is the
 * order (slots), otherwise an attribute index.
 */
export function forcedGrid(puzzle, solutions) {
  const n = puzzle.people.length;
  const dims = [...(puzzle.slots ? [-1] : []), ...puzzle.attrs.map((_, i) => i)];
  return dims.map((dim) =>
    Array.from({ length: n }, (_, person) =>
      Array.from({ length: n }, (_, value) => {
        const has = (s) => (dim === -1 ? s.slot[person] === value : s.attr[dim][person] === value);
        if (!solutions.length) return null;
        if (solutions.every(has)) return 'yes';
        if (!solutions.some(has)) return 'no';
        return null;
      })
    )
  );
}
