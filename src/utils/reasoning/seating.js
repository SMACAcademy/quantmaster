/**
 * Seating arrangements: the conventions, the clues as data, and a brute-force
 * solver that tries every way of seating the people.
 *
 * Layouts (seats are numbered from 0):
 *   row     one row, everyone facing north. Seat 0 is the left end (west), so a
 *           person's left is the seat with the smaller number.
 *   rows    two rows of m seats facing each other. Seats 0..m-1 are Row 1, facing
 *           south; seats m..2m-1 are Row 2, facing north. Column c of Row 1 faces
 *           column c of Row 2. Column 0 is the west end of both rows, so in Row 1
 *           (facing south) a person's left is the larger column, in Row 2 the smaller.
 *   circle  n seats around a table, numbered clockwise as seen from above. Facing
 *           the centre, your left is the clockwise seat; facing outwards, your left
 *           is the anticlockwise seat. A circle has no fixed seat, so the solver
 *           seats person 0 in seat 0: arrangements that are rotations of each other
 *           count once, as in the exam.
 *
 * An arrangement is { seats: [person at seat 0, person at seat 1, ...], facing }
 * where facing (circles only) is an array of 'in' | 'out' by person, or null when
 * everyone faces the centre.
 *
 * Clues are plain objects, so the same clue is checked by the solver, shown by
 * the simulation and written out as a sentence:
 *   { t: 'pos', p, k, from: 'left' | 'right' }  p is k-th from that end (row)
 *   { t: 'end', p } / { t: 'notEnd', p }         p sits / does not sit at an end of a row
 *   { t: 'side', p, q, side: 'left' | 'right', k } p is k-th to q's left/right (k = 1: immediately)
 *   { t: 'adj', p, q } / { t: 'notAdj', p, q }   neighbours (in the same row) or not
 *   { t: 'gap', p, q, k }                        exactly k people between p and q (one row)
 *   { t: 'opp', p, q }                           p sits opposite q (circle) / faces q (two rows)
 *   { t: 'between', p, q, r }                    p sits between q and r, next to both
 *   { t: 'face', p, dir: 'in' | 'out' }          p faces the centre / outwards
 *   { t: 'row', p, row: 1 | 2 }                  p sits in that row (two rows)
 */

const permCache = new Map();

/** Every ordering of 0..n-1, cached (n is at most 8 here). */
export function permutations(n) {
  if (permCache.has(n)) return permCache.get(n);
  const out = [];
  const used = new Array(n).fill(false);
  const current = [];
  const walk = () => {
    if (current.length === n) {
      out.push(current.slice());
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(i);
      walk();
      current.pop();
      used[i] = false;
    }
  };
  walk();
  permCache.set(n, out);
  return out;
}

/** Seat of every person: the inverse of `seats`. */
export function seatOf(seats) {
  const where = new Array(seats.length);
  seats.forEach((person, seat) => {
    where[person] = seat;
  });
  return where;
}

/** Which way a seated person's left goes, as +1 or −1 along the seat numbers (or the column). */
function leftStep(layout, seat, n, facing, person) {
  if (layout === 'row') return -1;
  if (layout === 'rows') return seat < n / 2 ? +1 : -1;
  const dir = facing ? facing[person] : 'in';
  return dir === 'in' ? +1 : -1;
}

/**
 * The seat k places to the person's left or right, or null when that runs off
 * the end of a row.
 */
export function seatToSide(puzzle, arrangement, person, side, k) {
  const { layout } = puzzle;
  const n = arrangement.seats.length;
  const where = seatOf(arrangement.seats)[person];
  const step = leftStep(layout, where, n, arrangement.facing, person) * (side === 'left' ? 1 : -1);
  if (layout === 'circle') return (((where + step * k) % n) + n) % n;
  if (layout === 'row') {
    const target = where + step * k;
    return target >= 0 && target < n ? target : null;
  }
  const m = n / 2;
  const rowStart = where < m ? 0 : m;
  const column = where - rowStart + step * k;
  return column >= 0 && column < m ? rowStart + column : null;
}

/** The person k places to someone's left or right (null off the end of a row). */
export function personToSide(puzzle, arrangement, person, side, k) {
  const seat = seatToSide(puzzle, arrangement, person, side, k);
  return seat === null ? null : arrangement.seats[seat];
}

/** The person opposite (circle) or facing (two rows), or null when there is none. */
export function personOpposite(puzzle, arrangement, person) {
  const n = arrangement.seats.length;
  const where = seatOf(arrangement.seats)[person];
  if (puzzle.layout === 'circle') return n % 2 ? null : arrangement.seats[(where + n / 2) % n];
  if (puzzle.layout === 'rows') {
    const m = n / 2;
    return arrangement.seats[where < m ? where + m : where - m];
  }
  return null;
}

function sameRow(puzzle, n, a, b) {
  if (puzzle.layout !== 'rows') return true;
  return a < n / 2 === b < n / 2;
}

/** Are two seats next to each other? */
export function seatsAdjacent(puzzle, n, a, b) {
  if (puzzle.layout === 'circle') return Math.abs(a - b) === 1 || Math.abs(a - b) === n - 1;
  return sameRow(puzzle, n, a, b) && Math.abs(a - b) === 1;
}

function isEnd(puzzle, n, seat) {
  if (puzzle.layout === 'row') return seat === 0 || seat === n - 1;
  if (puzzle.layout === 'rows') {
    const m = n / 2;
    const column = seat % m;
    return column === 0 || column === m - 1;
  }
  return false;
}

/** People strictly between two people sitting in one row (null for a circle or different rows). */
export function peopleBetween(puzzle, arrangement, p, q) {
  const n = arrangement.seats.length;
  const where = seatOf(arrangement.seats);
  if (puzzle.layout === 'circle' || !sameRow(puzzle, n, where[p], where[q])) return null;
  return Math.abs(where[p] - where[q]) - 1;
}

/** How many people you pass going from p towards p's left (or right) until you reach q. */
export function countBetweenFrom(puzzle, arrangement, p, q, side) {
  for (let k = 1; k < arrangement.seats.length; k++) {
    const other = personToSide(puzzle, arrangement, p, side, k);
    if (other === null) return null;
    if (other === q) return k - 1;
  }
  return null;
}

/** Does one clue hold in one arrangement? */
export function clueHolds(puzzle, arrangement, clue) {
  const n = arrangement.seats.length;
  const where = seatOf(arrangement.seats);
  switch (clue.t) {
    case 'pos':
      return clue.from === 'left' ? where[clue.p] === clue.k - 1 : where[clue.p] === n - clue.k;
    case 'end':
      return isEnd(puzzle, n, where[clue.p]);
    case 'notEnd':
      return !isEnd(puzzle, n, where[clue.p]);
    case 'side':
      return personToSide(puzzle, arrangement, clue.q, clue.side, clue.k) === clue.p;
    case 'adj':
      return seatsAdjacent(puzzle, n, where[clue.p], where[clue.q]);
    case 'notAdj':
      return !seatsAdjacent(puzzle, n, where[clue.p], where[clue.q]);
    case 'gap':
      return peopleBetween(puzzle, arrangement, clue.p, clue.q) === clue.k;
    case 'opp':
      return personOpposite(puzzle, arrangement, clue.q) === clue.p;
    case 'between': {
      const a = where[clue.p];
      return seatsAdjacent(puzzle, n, a, where[clue.q]) && seatsAdjacent(puzzle, n, a, where[clue.r]);
    }
    case 'face':
      return (arrangement.facing ? arrangement.facing[clue.p] : 'in') === clue.dir;
    case 'row':
      return clue.row === 1 ? where[clue.p] < n / 2 : where[clue.p] >= n / 2;
    default:
      throw new Error(`unknown seating clue "${clue.t}"`);
  }
}

const arrangementCache = new Map();

/**
 * Every arrangement of the puzzle's people, before any clue: all orders (for a
 * circle, person 0 kept in seat 0) and, when facing is mixed, every in/out choice.
 * The list is shared between calls, so callers must not change it.
 */
export function allArrangements(puzzle) {
  const n = puzzle.people.length;
  const key = [puzzle.layout, n, Boolean(puzzle.mixed), puzzle.rowOne ? puzzle.rowOne.join(',') : ''].join('|');
  if (!arrangementCache.has(key)) arrangementCache.set(key, buildArrangements(puzzle, n));
  return arrangementCache.get(key);
}

function buildArrangements(puzzle, n) {
  const list = [];
  const facings = [];
  if (puzzle.mixed) {
    for (let mask = 0; mask < 2 ** n; mask++) facings.push(Array.from({ length: n }, (_, i) => ((mask >> i) & 1 ? 'out' : 'in')));
  } else {
    facings.push(null);
  }
  if (puzzle.layout === 'rows' && puzzle.rowOne) {
    // Who sits in which row is given: only orders within each row are tried.
    const one = puzzle.rowOne;
    const two = Array.from({ length: n }, (_, i) => i).filter((i) => !one.includes(i));
    const m = n / 2;
    for (const p of permutations(m)) for (const q of permutations(m)) list.push({ seats: [...p.map((i) => one[i]), ...q.map((i) => two[i])], facing: null });
  } else if (puzzle.layout === 'circle') {
    for (const rest of permutations(n - 1)) {
      const seats = [0, ...rest.map((i) => i + 1)];
      for (const facing of facings) list.push({ seats, facing });
    }
  } else {
    for (const seats of permutations(n)) for (const facing of facings) list.push({ seats, facing });
  }
  return list;
}

/** The arrangements that satisfy every clue. */
export function solveSeating(puzzle, clues = puzzle.clues) {
  return allArrangements(puzzle).filter((arrangement) => clues.every((clue) => clueHolds(puzzle, arrangement, clue)));
}

/* ------------------------------------------------------------------------ *
 * A second, independent reading of the clues, from geometry.
 *
 * Each seat gets a point on a map (x east, y north) and a facing direction. A
 * person's left hand points along the facing direction turned 90° anticlockwise,
 * exactly as it does for a person standing there. "Second to the left" then means
 * two seats along that hand (in a row), or two seats round the table in the sense
 * the hand points (in a circle). Nothing here uses the step table above, so a
 * slip in either convention shows up as a disagreement.
 * ------------------------------------------------------------------------ */

function seatGeometry(layout, n, arrangement) {
  const seats = [];
  for (let s = 0; s < n; s++) {
    if (layout === 'row') seats.push({ x: s, y: 0, fx: 0, fy: 1, row: 0 });
    else if (layout === 'rows') {
      const m = n / 2;
      seats.push(s < m ? { x: s, y: 1, fx: 0, fy: -1, row: 1 } : { x: s - m, y: 0, fx: 0, fy: 1, row: 2 });
    } else {
      const theta = (2 * Math.PI * s) / n; // clockwise from north
      const x = Math.sin(theta);
      const y = Math.cos(theta);
      const out = arrangement.facing && arrangement.facing[arrangement.seats[s]] === 'out';
      seats.push({ x, y, fx: out ? x : -x, fy: out ? y : -y, row: 0 });
    }
  }
  return seats;
}

const close = (a, b) => Math.abs(a - b) < 1e-9;

function geometricSide(layout, geo, seatIndex, side, k) {
  const g = geo[seatIndex];
  // Left hand: the facing direction turned a quarter turn anticlockwise.
  let lx = -g.fy;
  let ly = g.fx;
  if (side === 'right') {
    lx = -lx;
    ly = -ly;
  }
  if (layout !== 'circle') {
    const target = geo.findIndex((h) => h.row === g.row && close(h.x, g.x + k * lx) && close(h.y, g.y + k * ly));
    return target === -1 ? null : target;
  }
  // Round the table: which way does the hand point, anticlockwise (cross > 0) or clockwise?
  const cross = g.x * ly - g.y * lx;
  const n = geo.length;
  // Seat numbers increase clockwise.
  const step = cross > 0 ? -1 : 1;
  return (((seatIndex + step * k) % n) + n) % n;
}

function geometricNeighbours(layout, geo, a, b) {
  if (layout !== 'circle') return geo[a].row === geo[b].row && close(Math.hypot(geo[a].x - geo[b].x, geo[a].y - geo[b].y), 1);
  // On a circle the two nearest seats are the neighbours.
  const d = (i, j) => Math.hypot(geo[i].x - geo[j].x, geo[i].y - geo[j].y);
  const nearest = Math.min(...geo.map((_, j) => (j === a ? Infinity : d(a, j))));
  return close(d(a, b), nearest);
}

function geometricEnd(geo, s) {
  const sameRow = geo.filter((h) => h.row === geo[s].row).map((h) => h.x);
  return close(geo[s].x, Math.min(...sameRow)) || close(geo[s].x, Math.max(...sameRow));
}

/** The same clues as clueHolds, read from the seats' positions and facing directions. */
export function clueHoldsGeometric(puzzle, arrangement, clue) {
  const { layout } = puzzle;
  const n = arrangement.seats.length;
  const geo = seatGeometry(layout, n, arrangement);
  const seat = (person) => arrangement.seats.indexOf(person);
  const a = seat(clue.p);
  switch (clue.t) {
    case 'pos': {
      const xs = geo.map((h) => h.x).sort((u, v) => u - v);
      return clue.from === 'left' ? close(geo[a].x, xs[clue.k - 1]) : close(geo[a].x, xs[n - clue.k]);
    }
    case 'end':
      return layout !== 'circle' && geometricEnd(geo, a);
    case 'notEnd':
      return !(layout !== 'circle' && geometricEnd(geo, a));
    case 'side':
      return geometricSide(layout, geo, seat(clue.q), clue.side, clue.k) === a;
    case 'adj':
      return geometricNeighbours(layout, geo, a, seat(clue.q));
    case 'notAdj':
      return !geometricNeighbours(layout, geo, a, seat(clue.q));
    case 'gap': {
      const b = seat(clue.q);
      if (layout === 'circle' || geo[a].row !== geo[b].row) return false;
      const lo = Math.min(geo[a].x, geo[b].x);
      const hi = Math.max(geo[a].x, geo[b].x);
      return geo.filter((h) => h.row === geo[a].row && h.x > lo + 1e-9 && h.x < hi - 1e-9).length === clue.k;
    }
    case 'opp': {
      const b = seat(clue.q);
      if (layout === 'circle') return close(geo[a].x, -geo[b].x) && close(geo[a].y, -geo[b].y);
      return layout === 'rows' && geo[a].row !== geo[b].row && close(geo[a].x, geo[b].x);
    }
    case 'between':
      return geometricNeighbours(layout, geo, a, seat(clue.q)) && geometricNeighbours(layout, geo, a, seat(clue.r));
    case 'face':
      return (arrangement.facing ? arrangement.facing[clue.p] : 'in') === clue.dir;
    case 'row':
      return geo[a].row === clue.row;
    default:
      throw new Error(`unknown seating clue "${clue.t}"`);
  }
}

/** The arrangements that satisfy every clue, read the geometric way. */
export function solveSeatingGeometric(puzzle, clues = puzzle.clues) {
  return allArrangements(puzzle).filter((arrangement) => clues.every((clue) => clueHoldsGeometric(puzzle, arrangement, clue)));
}

/* ------------------------------ clue sentences ------------------------------ */

const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
export const ordinal = (k) => ORDINAL[k] || `${k}th`;

/** A clue as an exam sentence, using the puzzle's names. */
export function clueText(puzzle, clue) {
  const name = (i) => puzzle.people[i];
  const P = name(clue.p);
  const Q = clue.q === undefined ? '' : name(clue.q);
  switch (clue.t) {
    case 'pos':
      return clue.k === 1 ? `${P} sits at the extreme ${clue.from} end of the row.` : `${P} sits ${ordinal(clue.k)} from the ${clue.from} end of the row.`;
    case 'end':
      return `${P} sits at one of the ends of ${puzzle.layout === 'rows' ? 'a' : 'the'} row.`;
    case 'notEnd':
      return `${P} does not sit at an end of ${puzzle.layout === 'rows' ? 'a' : 'the'} row.`;
    case 'side':
      return clue.k === 1 ? `${P} sits immediately to the ${clue.side} of ${Q}.` : `${P} sits ${ordinal(clue.k)} to the ${clue.side} of ${Q}.`;
    case 'adj':
      return `${P} is an immediate neighbour of ${Q}.`;
    case 'notAdj':
      return `${P} is not an immediate neighbour of ${Q}.`;
    case 'gap':
      return clue.k === 0 ? `No one sits between ${P} and ${Q}.` : clue.k === 1 ? `Only one person sits between ${P} and ${Q}.` : `Exactly ${clue.k} people sit between ${P} and ${Q}.`;
    case 'opp':
      return puzzle.layout === 'rows' ? `${P} faces ${Q}.` : `${P} sits opposite ${Q}.`;
    case 'between':
      return `${P} sits between ${Q} and ${name(clue.r)}.`;
    case 'face':
      return clue.dir === 'in' ? `${P} faces the centre.` : `${P} faces away from the centre.`;
    case 'row':
      return `${P} sits in Row ${clue.row}.`;
    default:
      return '';
  }
}
