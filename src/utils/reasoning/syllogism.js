/**
 * Syllogisms, decided by trying every possible Venn diagram.
 *
 * With k terms there are 2^k − 1 regions inside the circles (each a set of terms,
 * written as a bitmask). A "world" says which regions have something in them.
 * Every term has at least one member, as exam questions assume. A statement is
 * true in a world or not; a conclusion "definitely follows" when it is true in
 * every world the statements allow, and "is a possibility" when it is true in at
 * least one.
 *
 * Statements and conclusions: { q, a, b } with q one of
 *   all      All a are b
 *   some     Some a are b
 *   no       No a are b
 *   someNot  Some a are not b
 *   onlyFew  Only a few a are b (some are, and some are not)
 * A possibility conclusion is { ...statement, possible: true }.
 */

const worldCache = new Map();

/** Every world for k terms in which no term is empty, as bitmasks over the regions. */
export function allWorlds(k) {
  if (worldCache.has(k)) return worldCache.get(k);
  const regions = 2 ** k - 1;
  const list = [];
  for (let world = 1; world < 2 ** regions; world++) {
    let ok = true;
    for (let t = 0; t < k && ok; t++) {
      let found = false;
      for (let r = 1; r <= regions && !found; r++) if ((world >> (r - 1)) & 1 && (r >> t) & 1) found = true;
      ok = found;
    }
    if (ok) list.push(world);
  }
  worldCache.set(k, list);
  return list;
}

const inhabited = (world, r) => ((world >> (r - 1)) & 1) === 1;

function exists(world, k, test) {
  const regions = 2 ** k - 1;
  for (let r = 1; r <= regions; r++) if (inhabited(world, r) && test(r)) return true;
  return false;
}

/** Is a statement true in a world? */
export function statementTrue(world, k, { q, a, b }) {
  const inA = (r) => ((r >> a) & 1) === 1;
  const inB = (r) => ((r >> b) & 1) === 1;
  switch (q) {
    case 'all':
      return !exists(world, k, (r) => inA(r) && !inB(r));
    case 'no':
      return !exists(world, k, (r) => inA(r) && inB(r));
    case 'some':
      return exists(world, k, (r) => inA(r) && inB(r));
    case 'someNot':
      return exists(world, k, (r) => inA(r) && !inB(r));
    case 'onlyFew':
      return exists(world, k, (r) => inA(r) && inB(r)) && exists(world, k, (r) => inA(r) && !inB(r));
    default:
      throw new Error(`unknown statement "${q}"`);
  }
}

const Q_INDEX = { all: 0, some: 1, no: 2, someNot: 3, onlyFew: 4 };
const tableCache = new Map();

/**
 * Every statement's truth in every world, worked out once per k (with 4 terms
 * there are 32,767 worlds, so looking answers up beats recomputing them).
 */
function truthTable(k) {
  if (tableCache.has(k)) return tableCache.get(k);
  const worlds = allWorlds(k);
  const stride = k * k * 5;
  const table = new Uint8Array(worlds.length * stride);
  worlds.forEach((world, w) => {
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
      if (a === b) continue;
      for (const [q, i] of Object.entries(Q_INDEX)) table[w * stride + (a * k + b) * 5 + i] = statementTrue(world, k, { q, a, b }) ? 1 : 0;
    }
  });
  const entry = { worlds, table, stride };
  tableCache.set(k, entry);
  return entry;
}

/** Is statement s true in the w-th world of allWorlds(k)? */
function lookup(k, w, { q, a, b }) {
  const { table, stride } = truthTable(k);
  return table[w * stride + (a * k + b) * 5 + Q_INDEX[q]] === 1;
}

const statementsKey = (k, statements) => `${k}:${statements.map((s) => `${s.q}${s.a}${s.b}`).join(',')}`;
const consistentCache = new Map();

/** Indexes (into allWorlds(k)) of the worlds where every statement is true (remembered per set of statements). */
function consistentIndexes(k, statements) {
  const key = statementsKey(k, statements);
  if (consistentCache.has(key)) return consistentCache.get(key);
  const { worlds } = truthTable(k);
  const out = [];
  for (let w = 0; w < worlds.length; w++) if (statements.every((s) => lookup(k, w, s))) out.push(w);
  consistentCache.set(key, out);
  return out;
}

export function consistentWorlds(k, statements) {
  const { worlds } = truthTable(k);
  return consistentIndexes(k, statements).map((w) => worlds[w]);
}

/** 'definite' (true in every allowed world), 'possible' (in some) or 'never'. */
export function status(k, statements, conclusion) {
  const worlds = consistentIndexes(k, statements);
  const plain = { q: conclusion.q, a: conclusion.a, b: conclusion.b };
  const trueIn = worlds.filter((w) => lookup(k, w, plain)).length;
  if (worlds.length && trueIn === worlds.length) return 'definite';
  return trueIn ? 'possible' : 'never';
}

/** Does a conclusion follow? A plain one must be definite; a possibility one must be possible. */
export function follows(k, statements, conclusion) {
  const s = status(k, statements, conclusion);
  return conclusion.possible ? s !== 'never' : s === 'definite';
}

/** Two conclusions that can never both be true and never both false, on the same two terms. */
export function complementaryPair(c1, c2) {
  if (c1.possible || c2.possible) return false;
  const pair = new Set([c1.q, c2.q]);
  const sameTerms = (c1.a === c2.a && c1.b === c2.b) || (c1.a === c2.b && c1.b === c2.a);
  const sameDirection = c1.a === c2.a && c1.b === c2.b;
  // Some/No are symmetric, so either direction works; All/Some-not need the same direction.
  if (pair.has('some') && pair.has('no')) return sameTerms;
  if (pair.has('all') && pair.has('someNot')) return sameDirection;
  return false;
}

export const VERDICTS = ['Only conclusion I follows', 'Only conclusion II follows', 'Either conclusion I or II follows', 'Neither conclusion I nor II follows', 'Both conclusions I and II follow'];

/** The bank-exam answer for two conclusions. */
export function verdict(k, statements, c1, c2) {
  const one = follows(k, statements, c1);
  const two = follows(k, statements, c2);
  if (one && two) return VERDICTS[4];
  if (one) return VERDICTS[0];
  if (two) return VERDICTS[1];
  if (complementaryPair(c1, c2)) {
    const worlds = consistentIndexes(k, statements);
    const exactlyOne = worlds.every((w) => lookup(k, w, c1) !== lookup(k, w, c2));
    if (exactlyOne) return VERDICTS[2];
  }
  return VERDICTS[3];
}

/* ------------------------------------------------------------------------ *
 * A second, independent decision, from concrete members.
 *
 * Instead of bitmasks, a "universe" is a list of members, each an object saying
 * which terms it belongs to. Every universe with at most one member of each kind
 * is tried; statements are read with every/some over the members, the way the
 * words say. A conclusion follows when no universe makes the statements true and
 * it false (and, for a possibility, when some universe makes both true).
 * ------------------------------------------------------------------------ */

const universeCache = new Map();

function universes(k) {
  if (universeCache.has(k)) return universeCache.get(k);
  const kinds = [];
  for (let mask = 1; mask < 2 ** k; mask++) kinds.push(Array.from({ length: k }, (_, t) => Boolean(mask & (1 << t))));
  const list = [];
  for (let pick = 1; pick < 2 ** kinds.length; pick++) {
    const members = kinds.filter((_, i) => pick & (1 << i));
    // Every term has a member.
    if (Array.from({ length: k }, (_, t) => members.some((m) => m[t])).every(Boolean)) list.push(members);
  }
  universeCache.set(k, list);
  return list;
}

function says(members, { q, a, b }) {
  const As = members.filter((m) => m[a]);
  if (q === 'all') return As.every((m) => m[b]);
  if (q === 'no') return !As.some((m) => m[b]);
  if (q === 'some') return As.some((m) => m[b]);
  if (q === 'someNot') return As.some((m) => !m[b]);
  if (q === 'onlyFew') return As.some((m) => m[b]) && As.some((m) => !m[b]);
  throw new Error(`unknown statement "${q}"`);
}

const fittingCache = new Map();

/** The universes in which every statement is true (remembered per set of statements). */
function fittingUniverses(k, statements) {
  const key = statementsKey(k, statements);
  if (!fittingCache.has(key)) fittingCache.set(key, universes(k).filter((u) => statements.every((s) => says(u, s))));
  return fittingCache.get(key);
}

export function followsByMembers(k, statements, conclusion) {
  const fitting = fittingUniverses(k, statements);
  if (conclusion.possible) return fitting.some((u) => says(u, conclusion));
  return fitting.length > 0 && fitting.every((u) => says(u, conclusion));
}

export function verdictByMembers(k, statements, c1, c2) {
  const one = followsByMembers(k, statements, c1);
  const two = followsByMembers(k, statements, c2);
  if (one && two) return VERDICTS[4];
  if (one) return VERDICTS[0];
  if (two) return VERDICTS[1];
  const fitting = fittingUniverses(k, statements);
  if (complementaryPair(c1, c2) && fitting.every((u) => says(u, c1) !== says(u, c2))) return VERDICTS[2];
  return VERDICTS[3];
}

/* ------------------------------ sentences ------------------------------ */

/** "All pens are books." Terms are plural nouns. */
export function statementText(terms, { q, a, b, possible }) {
  const A = terms[a];
  const B = terms[b];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (possible) {
    const core = { all: `All ${A} being ${B}`, some: `Some ${A} being ${B}`, no: `No ${A} being ${B}`, someNot: `Some ${A} not being ${B}` }[q];
    return `${core} is a possibility.`;
  }
  return cap(
    {
      all: `all ${A} are ${B}.`,
      some: `some ${A} are ${B}.`,
      no: `no ${A} are ${B}.`,
      someNot: `some ${A} are not ${B}.`,
      onlyFew: `only a few ${A} are ${B}.`
    }[q]
  );
}

/**
 * Pairwise picture of a world: how each two circles sit, as 'apart', 'overlap',
 * 'inside' (the first inside the second), 'around' (the second inside the first)
 * or 'same'. The simulation draws circles from this.
 */
export function pairRelation(world, k, a, b) {
  const both = exists(world, k, (r) => (r >> a) & 1 && (r >> b) & 1);
  const onlyA = exists(world, k, (r) => (r >> a) & 1 && !((r >> b) & 1));
  const onlyB = exists(world, k, (r) => (r >> b) & 1 && !((r >> a) & 1));
  if (!both) return 'apart';
  if (onlyA && onlyB) return 'overlap';
  if (onlyA) return 'around';
  if (onlyB) return 'inside';
  return 'same';
}
