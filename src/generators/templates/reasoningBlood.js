/**
 * Blood-relation templates. A family is drawn at random (grandparents, their
 * children and the children's families), statements are written from it, and a
 * question asks how two people are related.
 *
 * The answer names the relation from the hidden family by its structure
 * (relationByStructure: common ancestors, generations, marriages). `verify`
 * rebuilds the family from the printed statements alone (buildFamily) and names
 * the relation from the shortest chain of single steps (relationByPath). The two
 * must agree, so a statement set that leaves the relation open is never used.
 */

import { buildFamily, generations, otherGender, relationByPath, relationByStructure, statementText } from '../../utils/reasoning/family.js';
import { FEMALE_NAMES, MALE_NAMES, numbered } from './reasoningShared.js';

const TOPIC = 'blood-relations';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** A random three-generation family: { n, gender, parents, spouse, gen }. */
function makeFamily(rng, { maxSize = 9 } = {}) {
  const gender = ['M', 'F'];
  const parents = [new Set(), new Set()];
  const spouse = [1, 0];
  const gen = [0, 0];
  const add = (g, ps, generation) => {
    gender.push(g);
    parents.push(new Set(ps));
    spouse.push(null);
    gen.push(generation);
    return gender.length - 1;
  };
  const children = Array.from({ length: rng.int(2, 3) }, () => add(rng.pick(['M', 'F']), [0, 1], 1));
  for (const child of children) {
    if (gender.length >= maxSize - 1 || !rng.chance(0.75)) continue;
    const partner = add(gender[child] === 'M' ? 'F' : 'M', [], 1);
    spouse[child] = partner;
    spouse[partner] = child;
    for (let k = rng.int(1, 2); k > 0 && gender.length < maxSize; k--) add(rng.pick(['M', 'F']), [child, partner], 2);
  }
  return { n: gender.length, gender, parents, spouse, gen };
}

/** Elementary link between a and b, worded from a ("a is the ___ of b"), or null. */
function linkWord(f, a, b) {
  const g = f.gender[a];
  if (f.parents[b].has(a)) return g === 'M' ? 'father' : 'mother';
  if (f.parents[a].has(b)) return g === 'M' ? 'son' : 'daughter';
  if (f.spouse[a] === b) return g === 'M' ? 'husband' : 'wife';
  if (a !== b && [...f.parents[a]].some((p) => f.parents[b].has(p))) return g === 'M' ? 'brother' : 'sister';
  return null;
}

const NEUTRAL = { father: 'parent', mother: 'parent', son: 'child', daughter: 'child', brother: 'sibling', sister: 'sibling' };

/**
 * Statements joining everyone (a spanning tree of single links), each new person
 * usually the subject so their gender is stated. `hide` is a person whose gender
 * must stay unstated.
 */
function spanningStatements(rng, f, { hide = null } = {}) {
  const root = rng.int(0, f.n - 1);
  const inTree = new Set([root]);
  const statements = [];
  while (inTree.size < f.n) {
    const options = [];
    for (const u of inTree) for (let v = 0; v < f.n; v++) if (!inTree.has(v) && linkWord(f, u, v)) options.push([u, v]);
    if (!options.length) return null;
    const [u, v] = rng.pick(options);
    let [a, b] = rng.chance(0.75) ? [v, u] : [u, v];
    if (hide !== null && b === hide && a !== hide && rng.chance(0.5)) [a, b] = [b, a];
    let rel = linkWord(f, a, b);
    if (a === hide) {
      rel = NEUTRAL[rel];
      if (!rel) return null; // a husband or wife always reveals gender
    }
    if (b === hide && (rel === 'husband' || rel === 'wife')) return null;
    statements.push({ a, rel, b });
    inTree.add(v);
  }
  // Turn statements round so that everyone (except `hide`) is named by a gendered word somewhere.
  for (let pass = 0; pass < f.n; pass++) {
    const known = buildFamily(f.n, statements).gender;
    const i = statements.findIndex((st) => st.b !== hide && st.a !== hide && !known[st.b]);
    if (i === -1) break;
    const st = statements[i];
    statements[i] = { a: st.b, rel: linkWord(f, st.b, st.a), b: st.a };
  }
  return rng.shuffle(statements);
}

function namesFor(rng, f, letters = false) {
  if (letters) return rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'P', 'Q', 'R', 'S', 'T']).slice(0, f.n);
  const men = rng.shuffle(MALE_NAMES);
  const women = rng.shuffle(FEMALE_NAMES);
  return f.gender.map((g) => (g === 'M' ? men.pop() : women.pop()));
}

const MIRROR = {
  father: 'son', mother: 'daughter', son: 'father', daughter: 'mother', grandfather: 'grandson', grandmother: 'granddaughter',
  grandson: 'grandfather', granddaughter: 'grandmother', uncle: 'nephew', aunt: 'niece', nephew: 'uncle', niece: 'aunt',
  'father-in-law': 'son-in-law', 'mother-in-law': 'daughter-in-law', 'son-in-law': 'father-in-law', 'daughter-in-law': 'mother-in-law',
  brother: 'cousin', sister: 'cousin', cousin: 'brother', husband: 'brother-in-law', wife: 'sister-in-law',
  'brother-in-law': 'brother', 'sister-in-law': 'sister'
};
const SAME_SIDE = {
  M: ['father', 'uncle', 'brother', 'brother-in-law', 'son', 'nephew', 'grandfather', 'grandson', 'father-in-law', 'son-in-law'],
  F: ['mother', 'aunt', 'sister', 'sister-in-law', 'daughter', 'niece', 'grandmother', 'granddaughter', 'mother-in-law', 'daughter-in-law']
};

function relationDistractors(answer) {
  const gender = SAME_SIDE.M.includes(answer) ? 'M' : SAME_SIDE.F.includes(answer) ? 'F' : 'M';
  const pool = [otherGender(answer), MIRROR[answer], ...SAME_SIDE[gender]];
  const seen = new Set([answer]);
  const out = [];
  for (const word of pool) {
    if (!word || seen.has(word)) continue;
    seen.add(word);
    out.push({ value: cap(word), why: 'a nearby relation' });
  }
  return out;
}

/** The relation word, or null when it has no name or depends on an unknown gender. */
const nameable = (word) => (word && !word.includes(' or ') ? word : null);

function treeHint(statements, names) {
  return `Draw the family: a square for a man, a circle for a woman, a double line for a marriage, a line down to children. Start with "${statementText(names, statements[0])}"`;
}

function familyTemplate({ id, conceptId, difficulty, build, formulaIds, method, extraHint, mistakes, letters = false, estimatedSeconds = 90 }) {
  return {
    id,
    version: 1,
    topicId: TOPIC,
    conceptId,
    difficulty,
    type: 'single_choice',
    formulaIds,
    formatValue: (v) => v,
    estimatedSeconds,
    params(rng) {
      const f = makeFamily(rng);
      const built = build(rng, f);
      if (!built) return null;
      const { statements, x, y } = built;
      const word = nameable(relationByStructure(f, x, y));
      if (!word) return null;
      return { f, names: namesFor(rng, f, letters), statements, x, y, word, codes: built.codes || null };
    },
    answer: ({ word }) => cap(word),
    distractors: ({ word }) => relationDistractors(word),
    verify: ({ f, statements, x, y }, value) => {
      const rebuilt = buildFamily(f.n, statements);
      const word = nameable(relationByPath(rebuilt, x, y));
      return Boolean(word) && cap(word) === value;
    },
    render({ names, statements, x, y, word, codes }, { fmt }) {
      const text = codes
        ? `${codes.legend}\nExpression: ${codes.expression}`
        : `${numbered(statements.map((s) => statementText(names, s)))}`;
      const decoded = codes ? `Decoded: ${statements.map((s) => statementText(names, s)).join(' ')} ` : '';
      return {
        context: text,
        question: `How is ${names[x]} related to ${names[y]}?`,
        explanation: `${decoded}Drawing the family tree from these, ${names[x]} is ${names[y]}’s ${word}. Answer: ${fmt(cap(word))}.`,
        solutionSteps: [
          ...(codes ? ['Decode the expression into plain statements, left to right.'] : []),
          'Draw each person once; mark men and women; join husbands and wives, parents and children.',
          'Brothers and sisters share parents, and a parent’s husband or wife is the other parent.',
          `Walk from ${names[y]} to ${names[x]} on the tree and name the step: ${word}.`
        ],
        method,
        hints: [treeHint(statements, names), extraHint],
        commonMistakes: mistakes
      };
    }
  };
}

/** Pairs not linked by a single statement, so the question needs the tree. */
function indirectPair(rng, f, statements) {
  const direct = new Set(statements.map((s) => `${Math.min(s.a, s.b)}-${Math.max(s.a, s.b)}`));
  const pairs = [];
  for (let x = 0; x < f.n; x++) for (let y = 0; y < f.n; y++) {
    if (x === y || direct.has(`${Math.min(x, y)}-${Math.max(x, y)}`)) continue;
    if (nameable(relationByStructure(f, x, y))) pairs.push([x, y]);
  }
  return pairs.length ? rng.pick(pairs) : null;
}

/** A path of single links x0 → x1 → ... of the given length, by random walk. */
function randomPath(rng, f, length) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const path = [rng.int(0, f.n - 1)];
    while (path.length <= length) {
      const at = path[path.length - 1];
      const next = Array.from({ length: f.n }, (_, v) => v).filter((v) => !path.includes(v) && linkWord(f, at, v));
      if (!next.length) break;
      path.push(rng.pick(next));
    }
    if (path.length === length + 1) return path;
  }
  return null;
}

const CODE_SETS = [
  ['+', '−', '×', '÷'],
  ['@', '#', '$', '%'],
  ['★', '©', '&', '?']
];

export const bloodTemplates = [
  familyTemplate({
    id: 'br-gen-two-step',
    conceptId: 'br-direct',
    difficulty: 'easy',
    estimatedSeconds: 45,
    build(rng, f) {
      const path = randomPath(rng, f, 2);
      if (!path) return null;
      const [x, m, z] = path;
      const statements = [
        { a: x, rel: linkWord(f, x, m), b: m },
        { a: m, rel: linkWord(f, m, z), b: z }
      ];
      return { statements, x, y: z };
    },
    formulaIds: ['br-chain-f'],
    method: 'Combine the two steps: "father’s brother" is uncle, "mother’s mother" is grandmother.',
    extraHint: 'Read it as a chain: X is the ___ of M, and M is the ___ of Z. Name the two steps together.',
    mistakes: ['Answering how the second person is related to the first (the reverse question).', 'Ignoring the gender the relation word gives.']
  }),
  familyTemplate({
    id: 'br-gen-tree',
    conceptId: 'br-tree',
    difficulty: 'medium',
    build(rng, f) {
      const statements = spanningStatements(rng, f);
      if (!statements) return null;
      if (buildFamily(f.n, statements).gender.some((g) => !g)) return null;
      const pair = indirectPair(rng, f, statements);
      return pair ? { statements, x: pair[0], y: pair[1] } : null;
    },
    formulaIds: ['br-tree-f', 'br-chain-f'],
    method: 'Draw the whole tree first, then read the relation off it.',
    extraHint: 'Put each generation on its own row; then count generations between the two people.',
    mistakes: ['Naming the relation the wrong way round.', 'Forgetting that a mother’s husband is the father.']
  }),
  familyTemplate({
    id: 'br-gen-coded',
    conceptId: 'br-coded',
    difficulty: 'complex',
    letters: true,
    estimatedSeconds: 100,
    build(rng, f) {
      const path = randomPath(rng, f, 3);
      if (!path) return null;
      const words = path.slice(0, 3).map((a, i) => linkWord(f, a, path[i + 1]));
      const symbols = rng.pick(CODE_SETS);
      const meanings = [...new Set(words)];
      if (meanings.length > 4) return null;
      // Fill the key up to four meanings with other relation words.
      const extra = rng.shuffle(['father', 'mother', 'son', 'daughter', 'brother', 'sister', 'husband', 'wife'].filter((w) => !meanings.includes(w)));
      const key = rng.shuffle([...meanings, ...extra].slice(0, 4));
      const statements = path.slice(0, 3).map((a, i) => ({ a, rel: words[i], b: path[i + 1] }));
      const [x, y] = rng.chance(0.5) ? [path[3], path[0]] : [path[0], path[3]];
      return { statements, x, y, codes: { key, symbols, path, words } };
    },
    formulaIds: ['br-coded-f'],
    method: 'Decode left to right, one symbol at a time, drawing as you go.',
    extraHint: 'Each symbol links the letter before it to the letter after it: "A + B" says what A is to B.',
    mistakes: ['Decoding a symbol the wrong way round (B to A).', 'Giving a gender to a person the expression never reveals.']
  }),
  {
    id: 'br-gen-generations',
    version: 1,
    topicId: TOPIC,
    conceptId: 'br-generation',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['br-generation-f'],
    estimatedSeconds: 80,
    params(rng) {
      const f = makeFamily(rng);
      const statements = spanningStatements(rng, f);
      if (!statements) return null;
      // Ask about everyone named, or about two people.
      const ask = rng.pick(['count', 'gap']);
      const [x, y] = rng.shuffle(Array.from({ length: f.n }, (_, i) => i)).slice(0, 2);
      if (ask === 'gap' && f.gen[x] === f.gen[y]) return null;
      return { f, names: namesFor(rng, f), statements, ask, x, y };
    },
    answer: ({ f, ask, x, y }) => (ask === 'count' ? Math.max(...f.gen) - Math.min(...f.gen) + 1 : Math.abs(f.gen[x] - f.gen[y])),
    verify: ({ f, statements, ask, x, y }, value) => {
      const gen = generations(buildFamily(f.n, statements));
      if (!gen) return false;
      return (ask === 'count' ? Math.max(...gen) + 1 : Math.abs(gen[x] - gen[y])) === value;
    },
    render({ f, names, statements, ask, x, y }) {
      const answer = ask === 'count' ? Math.max(...f.gen) - Math.min(...f.gen) + 1 : Math.abs(f.gen[x] - f.gen[y]);
      const byGen = [0, 1, 2].map((g) => names.filter((_, i) => f.gen[i] === g)).filter((list) => list.length);
      return {
        context: numbered(statements.map((s) => statementText(names, s))),
        question: ask === 'count' ? 'How many generations of this family are named in the statements?' : `How many generations apart are ${names[x]} and ${names[y]}?`,
        explanation: `By generation, oldest first: ${byGen.map((list) => list.join(', ')).join(' | ')}. ${ask === 'count' ? `That is ${answer} generations.` : `${names[x]} and ${names[y]} are ${answer} generation${answer === 1 ? '' : 's'} apart.`}`,
        solutionSteps: [
          'Parents are one generation above their children; husbands, wives, brothers and sisters share a generation.',
          'Give the first person generation 0 and move up or down one row for each parent or child link.',
          `Generations, oldest first: ${byGen.map((list) => list.join(', ')).join(' | ')}.`
        ],
        method: 'One row per generation; marriages and siblings stay on the same row.',
        hints: [treeHint(statements, names), 'Only parent and child links change the generation.'],
        commonMistakes: ['Moving a husband or wife to a different generation.', 'Counting the links instead of the rows.']
      };
    }
  },
  {
    id: 'br-gen-gender',
    version: 1,
    topicId: TOPIC,
    conceptId: 'br-gender',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['br-gender-f'],
    formatValue: (v) => v,
    estimatedSeconds: 70,
    params(rng) {
      const f = makeFamily(rng, { maxSize: 7 });
      // Someone with no husband or wife, whose gender the statements will keep quiet about.
      const candidates = Array.from({ length: f.n }, (_, i) => i).filter((i) => f.spouse[i] === null);
      if (!candidates.length) return null;
      const hide = rng.pick(candidates);
      const statements = spanningStatements(rng, f, { hide });
      if (!statements) return null;
      const unknown = buildFamily(f.n, statements).gender.map((g, i) => (g ? null : i)).filter((i) => i !== null);
      if (unknown.length !== 1 || unknown[0] !== hide) return null;
      const names = rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']).slice(0, f.n);
      return { f, names, statements, hide };
    },
    answer: ({ names, hide }) => names[hide],
    distractors: ({ names, hide }) => names.filter((_, i) => i !== hide).map((value) => ({ value, why: 'gender is stated' })),
    // Independent check: try every way of giving everyone a gender; only the hidden person can be either.
    verify: ({ f, names, statements }, value) => {
      const word = { father: 'M', son: 'M', brother: 'M', husband: 'M', mother: 'F', daughter: 'F', sister: 'F', wife: 'F' };
      const free = new Set();
      const fixed = Array.from({ length: f.n }, () => new Set());
      for (let mask = 0; mask < 2 ** f.n; mask++) {
        const g = (i) => ((mask >> i) & 1 ? 'F' : 'M');
        const ok = statements.every((s) => (!word[s.rel] || g(s.a) === word[s.rel]) && (s.rel !== 'husband' && s.rel !== 'wife' ? true : g(s.a) !== g(s.b)));
        if (ok) for (let i = 0; i < f.n; i++) fixed[i].add(g(i));
      }
      fixed.forEach((set, i) => {
        if (set.size === 2) free.add(i);
      });
      return free.size === 1 && names[[...free][0]] === value;
    },
    render({ names, statements, hide }, { fmt }) {
      const about = statements.filter((s) => s.a === hide || s.b === hide).map((s) => statementText(names, s));
      return {
        context: numbered(statements.map((s) => statementText(names, s))),
        question: 'Whose gender cannot be determined from these statements?',
        explanation: `Every other person is called father, mother, son, daughter, brother, sister, husband or wife somewhere, which fixes their gender. ${fmt(names[hide])} appears only in: ${about.join(' ')} None of these says whether ${names[hide]} is male or female.`,
        solutionSteps: [
          'Mark a gender only when a statement calls that person by a gendered word (father, sister, wife, ...).',
          'A husband’s wife is female and a wife’s husband is male, even if unnamed otherwise.',
          `${names[hide]} is only ever a child, parent or sibling, or the person someone else is related to.`
        ],
        method: 'Gender comes only from the word used for that person, or from a marriage.',
        hints: ['In "A is the brother of B", only A’s gender is known.', 'Go through the people one by one and find the word that fixes each one’s gender.'],
        commonMistakes: ['Taking B’s gender from "A is the brother of B".', 'Guessing a gender from a name or a usual role.']
      };
    }
  }
];

/** The legend and expression for a coded question (render needs names, so it is filled in here). */
for (const template of bloodTemplates) {
  if (template.id !== 'br-gen-coded') continue;
  const params = template.params;
  template.params = (rng) => {
    const p = params.call(template, rng);
    if (!p || !p.codes) return p;
    const { key, symbols, path, words } = p.codes;
    const symbolFor = Object.fromEntries(key.map((w, i) => [w, symbols[i]]));
    const legend = key.map((w, i) => `'P ${symbols[i]} Q' means 'P is the ${w} of Q'.`).join('\n');
    const expression = path.map((v, i) => (i < 3 ? `${p.names[v]} ${symbolFor[words[i]]} ` : p.names[v])).join('');
    return { ...p, codes: { legend, expression } };
  };
}
