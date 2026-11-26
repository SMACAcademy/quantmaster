/**
 * Mirror and water images, the mirror image of a clock, and paper folded and
 * punched.
 *
 * Letters: which capitals look the same in a mirror (a vertical line of
 * symmetry) or in water (a horizontal one). The lists follow the exam
 * convention for plain capitals; GLYPHS draws each capital on a 5 × 7 grid in
 * that plain style, so the lists can be checked a second way by flipping the
 * drawings.
 *
 * Clocks: the mirror image of h:m reads 12:00 − h:m ("11:60 − t"); a second
 * method reflects the two hands' angles and reads the time back from them.
 *
 * Paper: a square sheet ruled into a size × size grid of squares, columns
 * A, B, C, ... from the left and rows 1, 2, 3, ... from the top. Folds:
 *   'left'    the left half over onto the right half
 *   'right'   the right half over onto the left half
 *   'top'     the top half down onto the bottom half
 *   'bottom'  the bottom half up onto the top half
 *   'diag'    along the diagonal from the top-left corner to the bottom-right
 *             corner, the top-right half onto the bottom-left half
 *   'anti'    along the other diagonal, the top-left half onto the bottom-right
 * A punch goes through every layer at one square of the folded paper. Two
 * independent ways to find the holes: stack the layers fold by fold
 * (holesByLayers), or reflect the punch across each fold line, last fold first
 * (holesByReflection).
 */

export const MIRROR_SAME = 'AHIMOTUVWXY';
export const WATER_SAME = 'BCDEHIKOX';

// Plain capitals on a 5 × 7 grid ('#' inked).
const G = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####']
};
export const GLYPHS = G;

const flipLeftRight = (rows) => rows.map((r) => [...r].reverse().join(''));
const flipUpDown = (rows) => [...rows].reverse();
const same = (a, b) => a.every((row, i) => row === b[i]);

/** Does the drawn capital look the same in a mirror beside it (left and right swapped)? */
export const mirrorSymmetric = (ch) => same(G[ch], flipLeftRight(G[ch]));
/** ... in water below it (top and bottom swapped)? */
export const waterSymmetric = (ch) => same(G[ch], flipUpDown(G[ch]));

/** What a mirror beside the word shows, read left to right: the letters in reverse order (each one flipped). */
export const mirrorOrder = (word) => [...word].reverse().join('');
/** A word looks the same in a mirror beside it when it reads the same backwards and every letter is symmetric. */
export const looksSameInMirror = (word) => [...word].every((ch) => MIRROR_SAME.includes(ch)) && mirrorOrder(word) === word;
/** A word looks the same in water when every letter has a horizontal line of symmetry (the order is kept). */
export const looksSameInWater = (word) => [...word].every((ch) => WATER_SAME.includes(ch));

/** The same two tests from the drawings. */
export const looksSameInMirrorByGlyphs = (word) => {
  const rows = Array.from({ length: 7 }, (_, r) => [...word].map((ch) => G[ch][r]).join('.'));
  return same(rows, flipLeftRight(rows));
};
export const looksSameInWaterByGlyphs = (word) => {
  const rows = Array.from({ length: 7 }, (_, r) => [...word].map((ch) => G[ch][r]).join('.'));
  return same(rows, flipUpDown(rows));
};

/* ------------------------------ clocks ------------------------------ */

/** Minutes past 12 → { hour 1–12, minute }. */
const fromMinutes = (t) => {
  const m = ((t % 720) + 720) % 720;
  const hour = Math.floor(m / 60);
  return { hour: hour === 0 ? 12 : hour, minute: m % 60 };
};

/** The time a mirror image of a clock appears to show: 12:00 − h:m (whole minutes). */
export function mirrorTime(hour, minute) {
  return fromMinutes(720 - ((hour % 12) * 60 + minute));
}

/** The same, by reflecting both hands (angle θ becomes 360° − θ) and reading the clock. */
export function mirrorTimeByHands(hour, minute) {
  const hourAngle = ((hour % 12) * 30 + minute / 2) % 360;
  const minuteAngle = (minute * 6) % 360;
  const h = (360 - hourAngle) % 360;
  const m = (360 - minuteAngle) % 360;
  const readMinute = Math.round(m / 6) % 60;
  // The hour hand has moved half a degree a minute past its hour mark.
  const readHour = Math.round((h - readMinute / 2) / 30) % 12;
  return { hour: readHour === 0 ? 12 : readHour, minute: readMinute };
}

export const timeText = ({ hour, minute }) => `${hour}:${String(minute).padStart(2, '0')}`;

/* ------------------------------ paper folding ------------------------------ */

export const FOLDS = ['left', 'right', 'top', 'bottom', 'diag', 'anti'];

export const squareName = (col, row) => `${String.fromCharCode(65 + col)}${row + 1}`;
export const parseSquare = (name) => [name.charCodeAt(0) - 65, Number(name.slice(1)) - 1];

/**
 * Fold step by step, keeping, for each square of the folded paper, the stack
 * of original squares lying there. Returns { stacks: Map(name → [names]),
 * region: [names] } or null if a fold does not fit the paper's current shape
 * (a half fold needs an even width or height; a diagonal fold needs a square).
 */
export function foldLayers(size, folds) {
  let stacks = new Map();
  for (let c = 0; c < size; c++) for (let r = 0; r < size; r++) stacks.set(`${c},${r}`, [squareName(c, r)]);
  for (const fold of folds) {
    const keys = [...stacks.keys()].map((k) => k.split(',').map(Number));
    const cols = keys.map((k) => k[0]);
    const rows = keys.map((k) => k[1]);
    const [c0, c1, r0, r1] = [Math.min(...cols), Math.max(...cols), Math.min(...rows), Math.max(...rows)];
    const w = c1 - c0 + 1;
    const h = r1 - r0 + 1;
    // Where each square goes, and whether it moves.
    let move;
    if (fold === 'left' || fold === 'right') {
      if (w % 2 || stacks.size !== w * h) return null;
      const mid = c0 + w / 2;
      move = ([c, r]) => ((fold === 'left' ? c < mid : c >= mid) ? [c0 + c1 - c, r] : null);
    } else if (fold === 'top' || fold === 'bottom') {
      if (h % 2 || stacks.size !== w * h) return null;
      const mid = r0 + h / 2;
      move = ([c, r]) => ((fold === 'top' ? r < mid : r >= mid) ? [c, r0 + r1 - r] : null);
    } else if (fold === 'diag') {
      if (w !== h || stacks.size !== w * h) return null;
      move = ([c, r]) => (c - c0 > r - r0 ? [c0 + (r - r0), r0 + (c - c0)] : null);
    } else if (fold === 'anti') {
      if (w !== h || stacks.size !== w * h) return null;
      // The anti-diagonal: (c − c0) + (r − r0) = w − 1. Top-left half goes to bottom-right.
      move = ([c, r]) => ((c - c0) + (r - r0) < w - 1 ? [c1 - (r - r0), r1 - (c - c0)] : null);
    } else return null;
    const next = new Map();
    for (const [key, stack] of stacks) {
      const cr = key.split(',').map(Number);
      if (move(cr)) continue;
      next.set(key, [...stack]);
    }
    for (const [key, stack] of stacks) {
      const to = move(key.split(',').map(Number));
      if (!to) continue;
      const target = next.get(to.join(','));
      if (!target) return null;
      target.push(...stack);
    }
    stacks = next;
  }
  const named = new Map([...stacks].map(([key, stack]) => [squareName(...key.split(',').map(Number)), stack]));
  return { stacks: named, region: [...named.keys()] };
}

/** Squares of the folded paper that lie on a diagonal fold line (a punch there would cut the fold). */
export function onFoldLine(size, folds, square) {
  const [col, row] = parseSquare(square);
  let rect = { c0: 0, c1: size, r0: 0, r1: size };
  for (const fold of folds) {
    if (fold === 'diag' && Math.abs(col - rect.c0 - (row - rect.r0)) < 1e-9) return true;
    if (fold === 'anti' && Math.abs(col + 0.5 - rect.c0 + (row + 0.5 - rect.r0) - (rect.c1 - rect.c0)) < 1e-9) return true;
    rect = shrink(rect, fold);
  }
  return false;
}

function shrink(rect, fold) {
  const { c0, c1, r0, r1 } = rect;
  if (fold === 'left') return { c0: (c0 + c1) / 2, c1, r0, r1 };
  if (fold === 'right') return { c0, c1: (c0 + c1) / 2, r0, r1 };
  if (fold === 'top') return { c0, c1, r0: (r0 + r1) / 2, r1 };
  if (fold === 'bottom') return { c0, c1, r0, r1: (r0 + r1) / 2 };
  return rect; // a diagonal fold keeps the bounding square
}

/** Holes after unfolding, by stacking layers: every original square under a punch. */
export function holesByLayers(size, folds, punches) {
  const folded = foldLayers(size, folds);
  if (!folded) return null;
  const out = new Set();
  for (const p of punches) {
    const stack = folded.stacks.get(p);
    if (!stack) return null;
    stack.forEach((s) => out.add(s));
  }
  return [...out].sort();
}

/** Holes after unfolding, by reflecting each punch's centre across the fold lines, last fold first. */
export function holesByReflection(size, folds, punches) {
  const rects = [];
  let rect = { c0: 0, c1: size, r0: 0, r1: size };
  for (const fold of folds) {
    rects.push(rect);
    rect = shrink(rect, fold);
  }
  let points = punches.map((p) => {
    const [c, r] = parseSquare(p);
    return [c + 0.5, r + 0.5];
  });
  for (let i = folds.length - 1; i >= 0; i--) {
    const { c0, c1, r0, r1 } = rects[i];
    const fold = folds[i];
    const reflect = ([x, y]) => {
      if (fold === 'left' || fold === 'right') return [c0 + c1 - x, y];
      if (fold === 'top' || fold === 'bottom') return [x, r0 + r1 - y];
      if (fold === 'diag') return [c0 + (y - r0), r0 + (x - c0)];
      return [c1 - (y - r0), r1 - (x - c0)]; // anti: reflect in x + y = const
    };
    points = [...points, ...points.map(reflect)];
  }
  const names = points.map(([x, y]) => squareName(Math.floor(x), Math.floor(y)));
  return [...new Set(names)].sort();
}

const FOLD_TEXT = {
  left: 'the left half is folded over onto the right half',
  right: 'the right half is folded over onto the left half',
  top: 'the top half is folded down onto the bottom half',
  bottom: 'the bottom half is folded up onto the top half',
  diag: 'it is folded along the diagonal from its top-left corner to its bottom-right corner, the top-right half onto the bottom-left half',
  anti: 'it is folded along the diagonal from its top-right corner to its bottom-left corner, the top-left half onto the bottom-right half'
};
export const foldText = (fold) => FOLD_TEXT[fold];

/** Problems with a paper figure (empty when it can be drawn). */
export function paperFigureProblems(figure) {
  const problems = [];
  if (![2, 4, 6, 8].includes(figure.size)) problems.push('paper size must be 2, 4, 6 or 8 squares');
  if (!Array.isArray(figure.folds) || !figure.folds.every((f) => FOLDS.includes(f))) problems.push(`paper folds must be from ${FOLDS.join(', ')}`);
  else if (!foldLayers(figure.size, figure.folds)) problems.push('a fold does not fit the folded paper');
  else {
    const region = foldLayers(figure.size, figure.folds).region;
    for (const p of figure.punches || []) {
      if (!region.includes(p)) problems.push(`punch ${p} is not on the folded paper`);
      else if (onFoldLine(figure.size, figure.folds, p)) problems.push(`punch ${p} lies on a fold line`);
    }
  }
  return problems;
}
