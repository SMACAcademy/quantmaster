/**
 * Order and ranking: positions in a row (or a queue, or a class list) counted
 * from either end, people between two others, interchanges, and ranking by
 * comparisons.
 *
 * Positions are counted from 1. "From the left" is the same as "from the front"
 * or "from the top"; which words a question uses is up to its text.
 *
 * The formulas (total = L + R − 1 and the rest) live beside a brute-force
 * solver, solveRow, which tries every row length and every seat for the people
 * named and keeps those that fit every fact. Tests hold the two to each other.
 */

export const fromOtherEnd = (n, k) => n - k + 1;
export const totalFrom = (left, right) => left + right - 1;
/** People strictly between seats p and q. */
export const betweenSeats = (p, q) => Math.abs(p - q) - 1;

export function ordinal(k) {
  const tens = k % 100;
  if (tens >= 11 && tens <= 13) return `${k}th`;
  return `${k}${{ 1: 'st', 2: 'nd', 3: 'rd' }[k % 10] || 'th'}`;
}

/**
 * Facts, about people numbered 0, 1, ...:
 *   { p, k, from: 'left' | 'right', after?: true }  p is k-th from that end (after the swap, if `after`)
 *   { between: [p, q], k }                           exactly k people sit between p and q
 *   { ahead: [p, q] }                                p is nearer the left end than q
 *   { total: n }                                     there are n people in all
 * `swap: [p, q]` (optional) exchanges p and q; facts marked `after` describe the
 * row after that. Returns every { n, seats } (seats[p] counted from the left,
 * before any swap) with n from 1 to maxN that fits every fact.
 */
export function solveRow({ people, facts, swap = null, maxN = 80 }) {
  const out = [];
  const count = people;
  const seats = Array(count).fill(0);
  for (let n = count; n <= maxN; n++) {
    // Seats each person may take, from the facts that fix a position before any swap.
    const allowed = Array.from({ length: count }, (_, p) => {
      const fixed = facts.filter((f) => f.from && !f.after && f.p === p).map((f) => (f.from === 'left' ? f.k : n - f.k + 1));
      const all = Array.from({ length: n }, (_, i) => i + 1);
      return fixed.length ? all.filter((s) => fixed.every((k) => k === s)) : all;
    });
    const fill = (i) => {
      if (i === count) {
        if (fits(n, seats, facts, swap)) out.push({ n, seats: [...seats] });
        return;
      }
      for (const s of allowed[i]) {
        if (seats.slice(0, i).includes(s)) continue;
        seats[i] = s;
        fill(i + 1);
      }
    };
    fill(0);
  }
  return out;
}

function fits(n, seats, facts, swap) {
  const after = [...seats];
  if (swap) [after[swap[0]], after[swap[1]]] = [after[swap[1]], after[swap[0]]];
  for (const f of facts) {
    if (f.total !== undefined && f.total !== n) return false;
    if (f.from) {
      const s = (f.after ? after : seats)[f.p];
      if ((f.from === 'left' ? s : n - s + 1) !== f.k) return false;
    }
    if (f.between && Math.abs(seats[f.between[0]] - seats[f.between[1]]) - 1 !== f.k) return false;
    if (f.ahead && !(seats[f.ahead[0]] < seats[f.ahead[1]])) return false;
  }
  return true;
}

/** A row actually laid out, people as letters in seats: '.' for everyone else. */
export function layOut(n, seats, names) {
  const row = Array(n).fill('.');
  seats.forEach((s, i) => {
    row[s - 1] = names[i];
  });
  return row;
}

/** Count from a laid-out row, the slow way: walk from the end until you meet the person. */
export function countFrom(row, name, end) {
  const list = end === 'left' ? row : [...row].reverse();
  for (let i = 0; i < list.length; i++) if (list[i] === name) return i + 1;
  return null;
}

export function countBetween(row, a, b) {
  const i = row.indexOf(a);
  const j = row.indexOf(b);
  let c = 0;
  for (let k = Math.min(i, j) + 1; k < Math.max(i, j); k++) c += 1;
  return c;
}

/* ------------------------------ comparisons ------------------------------ */

/**
 * Ranking by comparisons. `facts` are { more: [a, b] } (a has more than b) and
 * { not: [a, k] } (a is not k-th from the top, 1 = most), over people numbered
 * 0..n−1. Returns every order (most first) that fits.
 */
export function solveComparisons(n, facts) {
  const out = [];
  const perm = [];
  const used = Array(n).fill(false);
  const go = () => {
    if (perm.length === n) {
      const rank = [];
      perm.forEach((p, i) => {
        rank[p] = i;
      });
      if (facts.every((f) => (f.more ? rank[f.more[0]] < rank[f.more[1]] : f.not ? rank[f.not[0]] !== f.not[1] - 1 : f.at ? rank[f.at[0]] === f.at[1] - 1 : true))) out.push([...perm]);
      return;
    }
    for (let p = 0; p < n; p++) {
      if (used[p]) continue;
      used[p] = true;
      perm.push(p);
      go();
      perm.pop();
      used[p] = false;
    }
  };
  go();
  return out;
}

/**
 * The same facts read the textbook way: keep a list of who must be above whom
 * (adding everything that follows by chaining), and read the order off when it
 * is complete. Returns the order (most first) when the comparisons settle it,
 * or null.
 */
export function orderByChaining(n, facts) {
  const above = Array.from({ length: n }, () => new Set());
  for (const f of facts) if (f.more) above[f.more[1]].add(f.more[0]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let x = 0; x < n; x++) for (const y of [...above[x]]) for (const z of above[y]) if (!above[x].has(z)) {
      above[x].add(z);
      changed = true;
    }
  }
  const order = Array.from({ length: n }, (_, x) => x).sort((a, b) => above[a].size - above[b].size);
  // Settled only if everyone has a different number of people above them, 0..n−1.
  if (order.some((x, i) => above[x].size !== i)) return null;
  return order;
}
