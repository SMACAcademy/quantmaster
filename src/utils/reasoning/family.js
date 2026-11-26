/**
 * Blood relations: build a family from statements, then name how one person is
 * related to another, two independent ways.
 *
 * A family (graph) is { n, gender: ['M' | 'F' | null], parents: [Set], spouse: [index | null] }.
 * Statements are { a, rel, b }, read "a is the <rel> of b", with rel one of
 *   father mother son daughter brother sister husband wife   (they say a's gender)
 *   parent child sibling                                     (they do not)
 *
 * Exam conventions built in: brothers and sisters share both parents; a parent's
 * husband or wife is the other parent; a husband and wife are of opposite gender.
 */

const MALE = new Set(['father', 'son', 'brother', 'husband']);
const FEMALE = new Set(['mother', 'daughter', 'sister', 'wife']);

/** Build the family the statements describe (nothing else is assumed). */
export function buildFamily(n, statements) {
  const gender = new Array(n).fill(null);
  const parents = Array.from({ length: n }, () => new Set());
  const spouse = new Array(n).fill(null);
  const sib = Array.from({ length: n }, (_, i) => i);
  const find = (i) => (sib[i] === i ? i : (sib[i] = find(sib[i])));
  for (const { a, rel, b } of statements) {
    if (MALE.has(rel)) gender[a] = 'M';
    if (FEMALE.has(rel)) gender[a] = 'F';
    if (rel === 'father' || rel === 'mother' || rel === 'parent') parents[b].add(a);
    if (rel === 'son' || rel === 'daughter' || rel === 'child') parents[a].add(b);
    if (rel === 'brother' || rel === 'sister' || rel === 'sibling') sib[find(a)] = find(b);
    if (rel === 'husband' || rel === 'wife') {
      spouse[a] = b;
      spouse[b] = a;
    }
  }
  // Apply the conventions until nothing changes.
  let changed = true;
  while (changed) {
    changed = false;
    const addParent = (child, p) => {
      if (!parents[child].has(p)) {
        parents[child].add(p);
        changed = true;
      }
    };
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) if (i !== j && find(i) === find(j)) for (const p of parents[j]) addParent(i, p);
      for (const p of [...parents[i]]) if (spouse[p] !== null) addParent(i, spouse[p]);
      if (spouse[i] !== null && gender[i] && !gender[spouse[i]]) {
        gender[spouse[i]] = gender[i] === 'M' ? 'F' : 'M';
        changed = true;
      }
    }
  }
  // Brothers and sisters with no parent named still count as siblings.
  const siblingGroup = Array.from({ length: n }, (_, i) => find(i));
  return { n, gender, parents, spouse, siblingGroup };
}

const areSiblings = (f, a, b) =>
  a !== b && ((f.siblingGroup && f.siblingGroup[a] === f.siblingGroup[b]) || [...f.parents[a]].some((p) => f.parents[b].has(p)));

const pick = (g, male, female) => (g === 'M' ? male : g === 'F' ? female : `${male} or ${female}`);

/** Ancestors of y with their generation distance (parents 1, grandparents 2, ...). */
function ancestors(f, y) {
  const dist = new Map();
  let frontier = [y];
  for (let d = 1; frontier.length && d <= 4; d++) {
    const next = [];
    for (const c of frontier) for (const p of f.parents[c]) if (!dist.has(p)) {
      dist.set(p, d);
      next.push(p);
    }
    frontier = next;
  }
  return dist;
}

/**
 * Method A, by structure: how is x related to y ("x is y's ___")? Null when there
 * is no everyday name for it (or no connection).
 */
export function relationByStructure(f, x, y) {
  if (x === y) return null;
  const g = f.gender[x];
  const up = ancestors(f, y);
  const down = ancestors(f, x);
  const gp = ['', ['father', 'mother'], ['grandfather', 'grandmother'], ['great-grandfather', 'great-grandmother']];
  const gc = ['', ['son', 'daughter'], ['grandson', 'granddaughter'], ['great-grandson', 'great-granddaughter']];
  if (up.has(x) && up.get(x) <= 3) return pick(g, ...gp[up.get(x)]);
  if (down.has(y) && down.get(y) <= 3) return pick(g, ...gc[down.get(y)]);
  if (f.spouse[x] === y) return pick(g, 'husband', 'wife');
  if (areSiblings(f, x, y)) return pick(g, 'brother', 'sister');
  const parentsOf = (i) => [...f.parents[i]];
  // Brother or sister of a parent, or the husband or wife of one.
  if (parentsOf(y).some((p) => areSiblings(f, x, p))) return pick(g, 'uncle', 'aunt');
  if (f.spouse[x] !== null && parentsOf(y).some((p) => areSiblings(f, f.spouse[x], p))) return pick(g, 'uncle', 'aunt');
  if (parentsOf(x).some((p) => areSiblings(f, p, y))) return pick(g, 'nephew', 'niece');
  if (f.spouse[y] !== null && parentsOf(x).some((p) => areSiblings(f, p, f.spouse[y]))) return pick(g, 'nephew', 'niece');
  if (parentsOf(x).some((p) => parentsOf(y).some((q) => areSiblings(f, p, q)))) return 'cousin';
  if (f.spouse[y] !== null && f.parents[f.spouse[y]].has(x)) return pick(g, 'father-in-law', 'mother-in-law');
  if (f.spouse[x] !== null && f.parents[f.spouse[x]].has(y)) return pick(g, 'son-in-law', 'daughter-in-law');
  if (f.spouse[x] !== null && areSiblings(f, f.spouse[x], y)) return pick(g, 'brother-in-law', 'sister-in-law');
  if (f.spouse[y] !== null && areSiblings(f, x, f.spouse[y])) return pick(g, 'brother-in-law', 'sister-in-law');
  return null;
}

/** Method B: the shortest chain of single steps from y to x, looked up in a table. */
const PATH_NAMES = {
  parent: ['father', 'mother'],
  child: ['son', 'daughter'],
  spouse: ['husband', 'wife'],
  sibling: ['brother', 'sister'],
  'parent.parent': ['grandfather', 'grandmother'],
  'child.child': ['grandson', 'granddaughter'],
  'parent.parent.parent': ['great-grandfather', 'great-grandmother'],
  'child.child.child': ['great-grandson', 'great-granddaughter'],
  'parent.sibling': ['uncle', 'aunt'],
  'parent.sibling.spouse': ['uncle', 'aunt'],
  'sibling.child': ['nephew', 'niece'],
  'spouse.sibling.child': ['nephew', 'niece'],
  'parent.sibling.child': ['cousin', 'cousin'],
  'spouse.parent': ['father-in-law', 'mother-in-law'],
  'child.spouse': ['son-in-law', 'daughter-in-law'],
  'sibling.spouse': ['brother-in-law', 'sister-in-law'],
  'spouse.sibling': ['brother-in-law', 'sister-in-law']
};

function steps(f, i) {
  const out = [];
  for (const p of f.parents[i]) out.push({ to: p, step: 'parent' });
  for (let c = 0; c < f.n; c++) if (f.parents[c].has(i)) out.push({ to: c, step: 'child' });
  if (f.spouse[i] !== null) out.push({ to: f.spouse[i], step: 'spouse' });
  for (let s = 0; s < f.n; s++) if (areSiblings(f, i, s)) out.push({ to: s, step: 'sibling' });
  return out;
}

export function relationByPath(f, x, y) {
  if (x === y) return null;
  // Breadth-first, keeping every shortest path's list of steps.
  let layer = [{ at: y, path: [] }];
  const seen = new Set([y]);
  for (let depth = 0; depth < 4 && layer.length; depth++) {
    const next = [];
    const reached = [];
    for (const { at, path } of layer) {
      for (const { to, step } of steps(f, at)) {
        if (seen.has(to)) continue;
        const entry = { at: to, path: [...path, step] };
        if (to === x) reached.push(entry);
        next.push(entry);
      }
    }
    if (reached.length) {
      const names = new Set(
        reached.map(({ path }) => {
          const pair = PATH_NAMES[path.join('.')];
          return pair ? pick(f.gender[x], pair[0], pair[1]).replace('cousin or cousin', 'cousin') : null;
        })
      );
      return names.size === 1 ? [...names][0] : null;
    }
    for (const entry of next) seen.add(entry.at);
    layer = next;
  }
  return null;
}

/** Generation of every person, the oldest generation 0 (null when not connected to person 0). */
export function generations(f) {
  const gen = new Array(f.n).fill(null);
  gen[0] = 0;
  const queue = [0];
  while (queue.length) {
    const i = queue.shift();
    for (const { to, step } of steps(f, i)) {
      if (gen[to] !== null) continue;
      gen[to] = gen[i] + (step === 'parent' ? -1 : step === 'child' ? 1 : 0);
      queue.push(to);
    }
  }
  if (gen.some((g) => g === null)) return null;
  const top = Math.min(...gen);
  return gen.map((g) => g - top);
}

/* ------------------------------ sentences ------------------------------ */

export function statementText(names, { a, rel, b }) {
  return `${names[a]} is the ${rel} of ${names[b]}.`;
}

/** The relation word a person of gender g would be called, for a given neutral or gendered word. */
export const RELATION_WORDS = [
  'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'husband', 'wife',
  'grandfather', 'grandmother', 'grandson', 'granddaughter', 'uncle', 'aunt', 'nephew', 'niece', 'cousin',
  'father-in-law', 'mother-in-law', 'son-in-law', 'daughter-in-law', 'brother-in-law', 'sister-in-law',
  'great-grandfather', 'great-grandmother', 'great-grandson', 'great-granddaughter'
];

/** The same word for the other gender (uncle ↔ aunt), or null. */
export function otherGender(word) {
  const pairs = [
    ['father', 'mother'], ['son', 'daughter'], ['brother', 'sister'], ['husband', 'wife'], ['grandfather', 'grandmother'],
    ['grandson', 'granddaughter'], ['uncle', 'aunt'], ['nephew', 'niece'], ['father-in-law', 'mother-in-law'],
    ['son-in-law', 'daughter-in-law'], ['brother-in-law', 'sister-in-law'], ['great-grandfather', 'great-grandmother'],
    ['great-grandson', 'great-granddaughter']
  ];
  for (const [m, f] of pairs) {
    if (word === m) return f;
    if (word === f) return m;
  }
  return null;
}
