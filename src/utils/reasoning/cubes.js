/**
 * Cubes and dice: which face is opposite which, from views of a die; standard
 * dice; nets; and a painted cube cut into small cubes.
 *
 * Faces are named by position: 0 top, 1 bottom, 2 front, 3 back, 4 right,
 * 5 left (opposites are 0–1, 2–3, 4–5). A view of a die shows the labels on its
 * top, front and right faces: { top, front, right }.
 *
 * Two independent ways to find every die that fits some views:
 *   - solveDice: put the six labels on the faces in all 720 ways, and keep the
 *     ways that some turn of the cube (one of its 24 rotations, generated from
 *     two quarter turns) shows as each view;
 *   - solveDiceByVectors: each label becomes an arrow (±x, ±y, ±z); a die is
 *     three opposite pairs plus a handedness (30 dice in all), and a view fits
 *     when its three arrows are at right angles with the right handedness (the
 *     sign of a determinant).
 * Both give the dice as "pairings" (each label's opposite), so they can be compared.
 */

export const FACES = ['top', 'bottom', 'front', 'back', 'right', 'left'];
export const OPPOSITE_FACE = [1, 0, 3, 2, 5, 4];

/* ------------------------------ rotations ------------------------------ */

// A rotation is a map: the face now at position p moves to position r[p].
const YAW = [0, 1, 4, 5, 3, 2]; // front → right → back → left → front
const PITCH = [2, 3, 1, 0, 4, 5]; // top → front → bottom → back → top
const compose = (a, b) => a.map((_, p) => b[a[p]]); // a, then b

export const ROTATIONS = (() => {
  const seen = new Map([[String([0, 1, 2, 3, 4, 5]), [0, 1, 2, 3, 4, 5]]]);
  const queue = [[0, 1, 2, 3, 4, 5]];
  while (queue.length) {
    const r = queue.shift();
    for (const g of [YAW, PITCH]) {
      const next = compose(r, g);
      if (!seen.has(String(next))) {
        seen.set(String(next), next);
        queue.push(next);
      }
    }
  }
  return [...seen.values()];
})();

/** Labels on faces after turning the die: rotate(labels, r)[r[p]] = labels[p]. */
export function rotate(labels, r) {
  const out = Array(6);
  labels.forEach((label, p) => {
    out[r[p]] = label;
  });
  return out;
}

const showsView = (labels, view) => ROTATIONS.some((r) => {
  const turned = rotate(labels, r);
  return turned[0] === view.top && turned[2] === view.front && turned[4] === view.right;
});

function permutations(list) {
  if (list.length <= 1) return [list];
  return list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [x, ...rest]));
}

/** A die as each label's opposite, written as a sorted key like "1-6|2-4|3-5". */
const pairingKey = (pairs) => pairs.map((p) => [...p].sort().join('-')).sort().join('|');
const pairsOf = (labels) => [0, 2, 4].map((p) => [labels[p], labels[OPPOSITE_FACE[p]]]);

/** Every die (labels on faces, one per rotation class) that shows all the views. */
export function solveDice(labels, views) {
  const found = new Map();
  for (const perm of permutations(labels)) {
    if (!views.every((v) => showsView(perm, v))) continue;
    // One representative per die: the smallest of its 24 turns.
    const key = ROTATIONS.map((r) => rotate(perm, r).join(',')).sort()[0];
    if (!found.has(key)) found.set(key, perm);
  }
  return [...found.values()];
}

/** The opposite of each label on a die given as labels on faces. */
export function oppositeMap(die) {
  const map = {};
  die.forEach((label, p) => {
    map[label] = die[OPPOSITE_FACE[p]];
  });
  return map;
}

/** The pairings of every die that fits, by the permutation method. */
export const pairingsByFaces = (labels, views) => [...new Set(solveDice(labels, views).map((d) => pairingKey(pairsOf(d))))].sort();

/* ------------------------------ the vector method ------------------------------ */

const det3 = (a, b, c) => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The 15 ways to split six labels into three opposite pairs. */
function pairings(labels) {
  if (!labels.length) return [[]];
  const [first, ...rest] = labels;
  return rest.flatMap((other, i) => pairings(rest.filter((_, j) => j !== i)).map((more) => [[first, other], ...more]));
}

/**
 * Every die that fits the views, found with arrows: { pairs, hand } for each.
 * In the standard position top = +z, front = −y and right = +x, so the arrows
 * of a view's right, front and top faces must have determinant −1 (a turn of
 * the cube keeps the determinant).
 */
export function solveDiceByVectors(labels, views) {
  const out = [];
  for (const pairs of pairings(labels)) {
    for (const hand of [1, -1]) {
      const arrow = {};
      const axes = [[1, 0, 0], [0, 1, 0], [0, 0, hand]];
      pairs.forEach(([a, b], i) => {
        arrow[a] = axes[i];
        arrow[b] = axes[i].map((x) => -x);
      });
      const fits = views.every((v) => {
        const [t, f, r] = [arrow[v.top], arrow[v.front], arrow[v.right]];
        if (!t || !f || !r) return false;
        if (dot(t, f) || dot(t, r) || dot(f, r)) return false;
        return det3(r, f, t) === -1;
      });
      if (fits) out.push({ pairs, hand });
    }
  }
  return out;
}

export const pairingsByVectors = (labels, views) => [...new Set(solveDiceByVectors(labels, views).map((d) => pairingKey(d.pairs)))].sort();

/** What is opposite `label`, over every die that fits: a list (one entry when it is certain). */
export function oppositeOf(labels, views, label) {
  return [...new Set(solveDice(labels, views).map((d) => oppositeMap(d)[label]))].sort();
}

export function oppositeOfByVectors(labels, views, label) {
  const out = new Set();
  for (const { pairs } of solveDiceByVectors(labels, views)) for (const [a, b] of pairs) {
    if (a === label) out.add(b);
    if (b === label) out.add(a);
  }
  return [...out].sort();
}

/** The textbook method: a label seen beside X is not opposite it; if four are seen, the fifth is opposite. */
export function oppositeByAdjacency(labels, views, label) {
  const beside = new Set();
  for (const v of views) {
    const seen = [v.top, v.front, v.right];
    if (seen.includes(label)) seen.forEach((s) => s !== label && beside.add(s));
  }
  const left = labels.filter((l) => l !== label && !beside.has(l));
  return left.length === 1 ? left[0] : null;
}

/* ------------------------------ nets ------------------------------ */

/**
 * Fold a net. `cells` are [column, row, label] on a grid (row 0 at the top).
 * The first cell lies face down; folding up the others in turn gives each label
 * an outward arrow. Returns { label: arrow }, or null if two cells land on the
 * same face (not a net of a cube).
 */
export function foldNet(cells) {
  const at = new Map(cells.map(([c, r, label]) => [`${c},${r}`, label]));
  const neg = (v) => v.map((x) => -x || 0);
  const [c0, r0, first] = cells[0];
  // For each cell: its outward normal, and the arrows for "east" and "north" on the net.
  const frames = new Map([[`${c0},${r0}`, { n: [0, 0, -1], e: [1, 0, 0], u: [0, 1, 0] }]]);
  const queue = [[c0, r0]];
  while (queue.length) {
    const [c, r] = queue.shift();
    const { n, e, u } = frames.get(`${c},${r}`);
    const moves = [
      [1, 0, { n: e, e: neg(n), u }],
      [-1, 0, { n: neg(e), e: n, u }],
      [0, -1, { n: u, e, u: neg(n) }],
      [0, 1, { n: neg(u), e, u: n }]
    ];
    for (const [dc, dr, frame] of moves) {
      const key = `${c + dc},${r + dr}`;
      if (at.has(key) && !frames.has(key)) {
        frames.set(key, frame);
        queue.push([c + dc, r + dr]);
      }
    }
  }
  if (frames.size !== cells.length) return null;
  const normals = {};
  const seen = new Set();
  for (const [key, frame] of frames) {
    const k = frame.n.join(',');
    if (seen.has(k)) return null;
    seen.add(k);
    normals[at.get(key)] = frame.n;
  }
  void first;
  return normals;
}

/** Opposite pairs of a folded net. */
export function netOpposites(cells) {
  const normals = foldNet(cells);
  if (!normals) return null;
  const map = {};
  for (const [a, va] of Object.entries(normals)) for (const [b, vb] of Object.entries(normals)) if (va.every((x, i) => x === -vb[i])) map[a] = b;
  return map;
}

/** The straight-line rule: in a line of three cells, the two ends are opposite. */
export function netOppositesByLines(cells) {
  const at = new Map(cells.map(([c, r, label]) => [`${c},${r}`, label]));
  const pairs = {};
  for (const [c, r, label] of cells) {
    for (const [dc, dr] of [[2, 0], [0, 2]]) {
      const mid = at.get(`${c + dc / 2},${r + dr / 2}`);
      const end = at.get(`${c + dc},${r + dr}`);
      if (mid !== undefined && end !== undefined) {
        pairs[label] = end;
        pairs[end] = label;
      }
    }
  }
  return pairs;
}

/**
 * The same opposites by rolling a die across the net: the die starts on the
 * first cell, and each roll onto a neighbouring cell tips it over an edge; the
 * face that lands on a cell is the face with that cell's label. Uses the face
 * positions (top, bottom, ...) rather than arrows.
 */
export function netOppositesByRolling(cells) {
  const at = new Map(cells.map(([c, r, label]) => [`${c},${r}`, label]));
  // state[position] = which face of the die (named by its starting position) is there now.
  const T = 0, B = 1, F = 2, K = 3, R = 4, L = 5;
  const roll = {
    east: (s) => { const n = [...s]; n[T] = s[L]; n[R] = s[T]; n[B] = s[R]; n[L] = s[B]; return n; },
    west: (s) => { const n = [...s]; n[T] = s[R]; n[L] = s[T]; n[B] = s[L]; n[R] = s[B]; return n; },
    north: (s) => { const n = [...s]; n[T] = s[F]; n[K] = s[T]; n[B] = s[K]; n[F] = s[B]; return n; },
    south: (s) => { const n = [...s]; n[T] = s[K]; n[F] = s[T]; n[B] = s[F]; n[K] = s[B]; return n; }
  };
  const faceLabel = new Map();
  const [c0, r0] = cells[0];
  const seen = new Map([[`${c0},${r0}`, [0, 1, 2, 3, 4, 5]]]);
  const queue = [[c0, r0]];
  while (queue.length) {
    const [c, r] = queue.shift();
    const state = seen.get(`${c},${r}`);
    if (faceLabel.has(state[B])) return null;
    faceLabel.set(state[B], at.get(`${c},${r}`));
    for (const [dc, dr, dir] of [[1, 0, 'east'], [-1, 0, 'west'], [0, -1, 'north'], [0, 1, 'south']]) {
      const key = `${c + dc},${r + dr}`;
      if (at.has(key) && !seen.has(key)) {
        seen.set(key, roll[dir](state));
        queue.push([c + dc, r + dr]);
      }
    }
  }
  if (faceLabel.size !== 6) return null;
  const map = {};
  for (const [face, label] of faceLabel) map[label] = faceLabel.get(OPPOSITE_FACE[face]);
  return map;
}

/** The eleven nets of a cube, as [column, row] cells (row 0 at the top). */
export const CUBE_NETS = [
  // A row of four with one square above and one below.
  [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [0, 2]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [1, 2]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [2, 2]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [3, 2]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [1, 2]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [2, 2]],
  // Two, three, one.
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]],
  // A staircase of twos, and two rows of three.
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]]
];

/** Problems with a net figure or dice views figure (empty when it can be drawn). */
export function diceFigureProblems(figure) {
  const problems = [];
  const views = figure.views || [];
  if (!views.length && !figure.net) problems.push('dice figure needs views or a net');
  for (const [i, v] of views.entries()) {
    for (const key of ['top', 'front', 'right']) if (typeof v[key] !== 'string' || !v[key]) problems.push(`view ${i + 1}: needs a ${key} label`);
    if (new Set([v.top, v.front, v.right]).size !== 3) problems.push(`view ${i + 1}: the three faces must show different labels`);
  }
  if (figure.net) {
    if (!Array.isArray(figure.net) || figure.net.length !== 6) problems.push('a net needs exactly six cells');
    else if (!foldNet(figure.net)) problems.push('the net does not fold into a cube');
  }
  return problems;
}

/* ------------------------------ painted cubes ------------------------------ */

/**
 * Cut an a × b × c block (painted on the faces listed, default all six) into
 * unit cubes and count how many have 0, 1, 2 and 3 painted faces, by visiting
 * every small cube. Faces: 'top', 'bottom', 'front', 'back', 'right', 'left'.
 */
export function paintedCounts(a, b = a, c = a, painted = FACES) {
  const counts = [0, 0, 0, 0];
  const on = new Set(painted);
  for (let x = 0; x < a; x++) for (let y = 0; y < b; y++) for (let z = 0; z < c; z++) {
    let k = 0;
    if (on.has('left') && x === 0) k++;
    if (on.has('right') && x === a - 1) k++;
    if (on.has('front') && y === 0) k++;
    if (on.has('back') && y === b - 1) k++;
    if (on.has('bottom') && z === 0) k++;
    if (on.has('top') && z === c - 1) k++;
    counts[Math.min(k, 3)] += 1;
  }
  return counts;
}

/** The formulas, for a cube of side n (n ≥ 2) painted all over. */
export function paintedFormula(n) {
  return [(n - 2) ** 3, 6 * (n - 2) ** 2, 12 * (n - 2), 8];
}

/** For an a × b × c cuboid painted all over (each side at least 2). */
export function cuboidFormula(a, b, c) {
  return [(a - 2) * (b - 2) * (c - 2), 2 * ((a - 2) * (b - 2) + (b - 2) * (c - 2) + (a - 2) * (c - 2)), 4 * (a - 2 + b - 2 + c - 2), 8];
}
