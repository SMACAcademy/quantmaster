/**
 * Logical-reasoning simulations: seating clues, a puzzle grid, Venn circles for
 * syllogisms, an inequality chain and a family tree. Each works its picture out
 * with the same brute-force solvers the question generators use
 * (src/utils/reasoning), so what the learner sees is what is provably true.
 * Plot kinds: seats, grid, euler, chain, tree (components/reasoningPlots.js).
 */

import { clueText, solveSeating, seatOf } from '../utils/reasoning/seating.js';
import { forcedGrid, solvePuzzle } from '../utils/reasoning/puzzles.js';
import { ATTRS, puzzleClueText } from '../utils/reasoning/puzzleText.js';
import { allWorlds, pairRelation, statementText, statementTrue } from '../utils/reasoning/syllogism.js';
import { OPS, chainRelations, pathRelation } from '../utils/reasoning/inequality.js';
import { buildFamily, relationByPath, statementText as familyText } from '../utils/reasoning/family.js';

const onOff = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: 'On' }
];

/* ------------------------------ seating ------------------------------ */

const SEATING = {
  row: {
    layout: 'row',
    people: ['Amar', 'Bela', 'Chirag', 'Dia', 'Eshan', 'Farah'],
    clues: [
      { t: 'pos', p: 2, k: 4, from: 'left' },
      { t: 'side', p: 1, q: 2, side: 'right', k: 1 },
      { t: 'gap', p: 0, q: 2, k: 1 },
      { t: 'end', p: 4 },
      { t: 'notEnd', p: 0 },
      { t: 'side', p: 3, q: 0, side: 'left', k: 1 }
    ],
    conflict: { t: 'end', p: 5 }
  },
  circle: {
    layout: 'circle',
    people: ['Gauri', 'Hemant', 'Ira', 'Jai', 'Kavya', 'Lalit', 'Mira', 'Nitin'],
    clues: [
      { t: 'opp', p: 1, q: 0 },
      { t: 'side', p: 3, q: 0, side: 'left', k: 2 },
      { t: 'side', p: 2, q: 1, side: 'left', k: 1 },
      { t: 'adj', p: 4, q: 0 },
      { t: 'side', p: 6, q: 0, side: 'right', k: 1 },
      { t: 'between', p: 5, q: 3, r: 1 }
    ],
    conflict: { t: 'opp', p: 5, q: 2 }
  }
};

/** For each person: the seats still possible across all arrangements. */
function seatOptions(puzzle, solutions) {
  return puzzle.people.map((_, person) => [...new Set(solutions.map((a) => seatOf(a.seats)[person]))].sort((x, y) => x - y));
}

export const seatingClues = {
  id: 'seating-clues',
  topicId: 'seating-arrangement',
  title: 'Seat people one clue at a time',
  summary: 'Apply the clues in order and watch people slide into the seats that are certain. A clue that contradicts the others leaves no arrangement at all.',
  controls: [
    {
      id: 'layout',
      label: 'Arrangement',
      type: 'choice',
      options: [
        { id: 'row', label: 'Row, facing north' },
        { id: 'circle', label: 'Round table, facing centre' }
      ],
      default: 'row'
    },
    { id: 'clues', label: 'Clues applied', type: 'range', min: 0, max: 6, step: 1, default: 0 },
    { id: 'conflict', label: 'Add a clue that contradicts', type: 'choice', options: onOff, default: 'off' }
  ],
  compute({ layout, clues, conflict }) {
    const puzzle = SEATING[layout];
    const k = Math.min(clues, puzzle.clues.length);
    const withConflict = conflict === 'on';
    const active = [...puzzle.clues.slice(0, k), ...(withConflict ? [puzzle.conflict] : [])];
    const solutions = solveSeating(puzzle, active);
    const before = solveSeating(puzzle, withConflict ? puzzle.clues.slice(0, k) : puzzle.clues.slice(0, Math.max(0, k - 1)));
    const options = seatOptions(puzzle, solutions);
    const optionsBefore = seatOptions(puzzle, before);
    const fixed = options.filter((o) => o.length === 1).length;
    const n = puzzle.people.length;
    const people = puzzle.people.map((name, i) => ({
      name,
      seat: solutions.length && options[i].length === 1 ? options[i][0] : null,
      options: options[i].length,
      fresh: solutions.length > 0 && options[i].length === 1 && optionsBefore[i].length > 1
    }));
    const clueList = puzzle.clues.map((clue, i) => ({ text: clueText(puzzle, clue), state: i < k ? (i === k - 1 && !withConflict ? 'new' : 'applied') : 'pending' }));
    if (withConflict) clueList.push({ text: clueText(puzzle, puzzle.conflict), state: solutions.length ? 'new' : 'conflict', extra: true });
    const facing = layout === 'row' ? 'Everyone faces north: a person’s left is towards the left end.' : 'Everyone faces the centre: left is clockwise.';
    const insight =
      solutions.length === 0
        ? `No arrangement fits: "${clueText(puzzle, puzzle.conflict)}" contradicts what the first ${k} clue${k === 1 ? '' : 's'} fixed. In an exam this means a clue was misread.`
        : solutions.length === 1
          ? `One arrangement is left, so every seat is certain. ${facing}`
          : k === 0
            ? `With no clues, ${solutions.length} arrangements are possible${layout === 'circle' ? ' (a round table has no first seat, so Gauri is fixed at the top)' : ''}. Apply the clues one at a time.`
            : `${solutions.length} arrangements still fit. ${fixed} of ${n} people are certain; the others wait until a clue pins them down.`;
    return {
      numbers: { k, conflict: withConflict, possible: solutions.length, fixed, layout, fixedNames: people.filter((p) => p.seat !== null).map((p) => p.name) },
      readouts: [
        { label: 'Arrangements still possible', value: String(solutions.length) },
        { label: 'People seated for certain', value: `${fixed} of ${n}` },
        { label: 'Latest clue', value: withConflict ? clueText(puzzle, puzzle.conflict) : k ? clueText(puzzle, puzzle.clues[k - 1]) : 'None yet' }
      ],
      plot: {
        kind: 'seats',
        layout,
        seatCount: n,
        people,
        clues: clueList,
        summary: `${layout === 'row' ? 'A row of six seats' : 'A round table with eight seats'}. ${k} clue${k === 1 ? '' : 's'} applied${withConflict ? ' plus a contradicting clue' : ''}; ${solutions.length} arrangement${solutions.length === 1 ? '' : 's'} possible. Seated for certain: ${people.filter((p) => p.seat !== null).map((p) => `${p.name} in seat ${p.seat + 1}`).join(', ') || 'nobody yet'}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'first-fixed',
      prompt: 'Row: apply clues one at a time and stop at the first clue that makes Bela’s seat certain.',
      check: (values, n) => n.layout === 'row' && !n.conflict && n.k === 2,
      solution: { layout: 'row', clues: 2, conflict: 'off' }
    },
    {
      id: 'two-left',
      prompt: 'Round table: apply clues until exactly two arrangements are left. Who is still unsure of their seat?',
      check: (values, n) => n.layout === 'circle' && !n.conflict && n.possible === 2,
      solution: { layout: 'circle', clues: 5, conflict: 'off' }
    },
    {
      id: 'all-seated',
      prompt: 'Seat everyone at the round table: one arrangement, no contradiction.',
      check: (values, n) => n.layout === 'circle' && !n.conflict && n.possible === 1,
      solution: { layout: 'circle', clues: 6, conflict: 'off' }
    },
    {
      id: 'contradiction',
      prompt: 'Row: apply all six clues, then add the contradicting clue. How many arrangements survive?',
      check: (values, n) => n.layout === 'row' && n.conflict && n.k === 6 && n.possible === 0,
      solution: { layout: 'row', clues: 6, conflict: 'on' }
    }
  ]
};

/* ------------------------------ puzzle grid ------------------------------ */

const P = (p) => ({ p });
const V = (a, v) => ({ a, v });
const GRIDS = {
  grid: {
    kind: 'grid',
    slots: false,
    people: ['Kabir', 'Leela', 'Manu', 'Neha'],
    attrs: ['city', 'colour'],
    attrSpecs: [
      { ...ATTRS.city, values: ['Agra', 'Bhopal', 'Cochin', 'Delhi'] },
      { ...ATTRS.colour, values: ['red', 'blue', 'green', 'white'] }
    ],
    clues: [
      { t: 'same', x: P(0), y: V(0, 2) },
      { t: 'diff', x: P(1), y: V(0, 0) },
      { t: 'same', x: V(0, 3), y: V(1, 2) },
      { t: 'same', x: P(3), y: V(1, 0) },
      { t: 'diff', x: P(2), y: V(0, 3) },
      { t: 'same', x: V(0, 0), y: V(1, 1) }
    ]
  },
  floors: {
    kind: 'floors',
    slots: true,
    people: ['Om', 'Pari', 'Raghav', 'Sana', 'Tanu'],
    attrs: [],
    attrSpecs: [],
    clues: [
      { t: 'at', x: P(2), k: 2 },
      { t: 'parity', x: P(1), even: true },
      { t: 'justAbove', x: P(3), y: P(1) },
      { t: 'notAt', x: P(0), k: 0 }
    ]
  }
};

/** Marks a clue states outright, before any reasoning: ticks for "is", crosses for "is not". */
function statedMarks(puzzle, clues) {
  const n = puzzle.people.length;
  const dims = [...(puzzle.slots ? [-1] : []), ...puzzle.attrs.map((_, i) => i)];
  const grid = dims.map(() => Array.from({ length: n }, () => new Array(n).fill(null)));
  const block = (dim) => dims.indexOf(dim);
  for (const clue of clues) {
    const person = clue.x.p;
    if (person === undefined) continue;
    if (clue.t === 'same' && clue.y.a !== undefined) grid[block(clue.y.a)][person][clue.y.v] = 'yes';
    if (clue.t === 'diff' && clue.y.a !== undefined) grid[block(clue.y.a)][person][clue.y.v] = 'no';
    if (clue.t === 'at') grid[block(-1)][person][clue.k] = 'yes';
    if (clue.t === 'notAt') grid[block(-1)][person][clue.k] = 'no';
    if (clue.t === 'parity') for (let f = 0; f < n; f++) if (((f + 1) % 2 === 0) !== clue.even) grid[block(-1)][person][f] = 'no';
  }
  return grid;
}

export const puzzleGrid = {
  id: 'puzzle-grid',
  topicId: 'puzzles',
  title: 'Ticks, crosses and forced cells',
  summary: 'Read the clues one by one into a person × value grid. Switch on forced cells to see every tick and cross that follows, not just the ones a clue states.',
  controls: [
    {
      id: 'puzzle',
      label: 'Puzzle',
      type: 'choice',
      options: [
        { id: 'grid', label: 'City and colour' },
        { id: 'floors', label: 'Five floors' }
      ],
      default: 'grid'
    },
    { id: 'clues', label: 'Clues read', type: 'range', min: 0, max: 6, step: 1, default: 0 },
    { id: 'fill', label: 'Fill forced cells', type: 'choice', options: onOff, default: 'off' }
  ],
  compute({ puzzle: which, clues, fill }) {
    const puzzle = GRIDS[which];
    const k = Math.min(clues, puzzle.clues.length);
    const active = puzzle.clues.slice(0, k);
    const solutions = solvePuzzle(puzzle, active);
    const stated = statedMarks(puzzle, active);
    const forced = forcedGrid(puzzle, solutions);
    const forcedBefore = forcedGrid(puzzle, solvePuzzle(puzzle, puzzle.clues.slice(0, Math.max(0, k - 1))));
    const statedBefore = statedMarks(puzzle, puzzle.clues.slice(0, Math.max(0, k - 1)));
    const on = fill === 'on';
    const n = puzzle.people.length;
    const blocks = [
      ...(puzzle.slots ? [{ title: 'Floor', columns: Array.from({ length: n }, (_, f) => String(f + 1)) }] : []),
      ...puzzle.attrSpecs.map((a) => ({ title: a.name.charAt(0).toUpperCase() + a.name.slice(1), columns: a.values }))
    ];
    let settled = 0;
    const cells = blocks.map((_, b) =>
      puzzle.people.map((__, person) =>
        Array.from({ length: n }, (___, value) => {
          const mark = on ? forced[b][person][value] : stated[b][person][value];
          const was = on ? forcedBefore[b][person][value] : statedBefore[b][person][value];
          if (mark) settled += 1;
          return { mark, source: mark && !stated[b][person][value] ? 'forced' : 'clue', fresh: Boolean(mark) && !was && k > 0 };
        })
      )
    );
    const total = blocks.length * n * n;
    // When did Leela's city become certain (the third task)?
    let leelaAt = -1;
    if (which === 'grid') {
      for (let j = 0; j <= puzzle.clues.length && leelaAt === -1; j++) {
        const s = solvePuzzle(puzzle, puzzle.clues.slice(0, j));
        if (new Set(s.map((x) => x.attr[0][1])).size === 1) leelaAt = j;
      }
    }
    return {
      numbers: { k, fill: on, which, settled, total, solutions: solutions.length, leelaAt },
      readouts: [
        { label: 'Cells settled', value: `${settled} of ${total}` },
        { label: 'Ways the clues so far allow', value: String(solutions.length) },
        { label: 'Latest clue', value: k ? puzzleClueText(puzzle, puzzle.clues[k - 1]) : 'None yet' }
      ],
      plot: {
        kind: 'grid',
        rows: puzzle.people,
        blocks,
        cells,
        clues: puzzle.clues.map((clue, i) => ({ text: puzzleClueText(puzzle, clue), state: i < k ? (i === k - 1 ? 'new' : 'applied') : 'pending' })),
        summary: `${k} of ${puzzle.clues.length} clues read; forced cells ${on ? 'shown' : 'hidden'}. ${settled} of ${total} cells settled; ${solutions.length} solution${solutions.length === 1 ? '' : 's'} left.`
      },
      insight: on
        ? settled === total
          ? 'Every cell is settled: one tick in each row and column of each block. The puzzle is solved.'
          : `Forced cells include everything that follows: a tick crosses out its row and column, and a lone blank becomes a tick. ${total - settled} cells are still open.`
        : k === 0
          ? 'Read the first clue. With forced cells off you see only what each clue says in so many words.'
          : `Only the marks the clues state are shown (${settled} of ${total}). Switch on forced cells to see how far elimination carries them.`
    };
  },
  tasks: [
    {
      id: 'floors-solved',
      prompt: 'Five floors: with forced cells on, read clues until every cell is settled. How many clues did it take?',
      check: (values, n) => n.which === 'floors' && n.fill && n.settled === n.total && n.k === 4,
      solution: { puzzle: 'floors', clues: 4, fill: 'on' }
    },
    {
      id: 'stated-only',
      prompt: 'City and colour: read all six clues with forced cells off. Most cells are blank, yet the puzzle is solved: switch forced cells on to see why.',
      check: (values, n) => n.which === 'grid' && n.k === 6 && n.fill && n.settled === n.total,
      solution: { puzzle: 'grid', clues: 6, fill: 'on' }
    },
    {
      id: 'leela-city',
      prompt: 'City and colour, forced cells on: stop at the first clue after which Leela’s city is certain.',
      check: (values, n) => n.which === 'grid' && n.fill && n.k === n.leelaAt,
      solution: { puzzle: 'grid', clues: 5, fill: 'on' }
    }
  ]
};

/* ------------------------------ syllogism circles ------------------------------ */

const SYL = {
  p1: {
    terms: ['roses', 'flowers', 'gifts'],
    statements: [{ q: 'all', a: 0, b: 1 }, { q: 'some', a: 1, b: 2 }],
    conclusions: [{ q: 'some', a: 0, b: 2 }, { q: 'all', a: 0, b: 2, possible: true }]
  },
  p2: {
    terms: ['kites', 'birds', 'clouds'],
    statements: [{ q: 'all', a: 0, b: 1 }, { q: 'no', a: 1, b: 2 }],
    conclusions: [{ q: 'no', a: 0, b: 2 }, { q: 'some', a: 2, b: 1 }]
  },
  p3: {
    terms: ['pens', 'books', 'bags'],
    statements: [{ q: 'some', a: 0, b: 1 }, { q: 'some', a: 1, b: 2 }],
    conclusions: [{ q: 'some', a: 0, b: 2 }, { q: 'no', a: 0, b: 2 }]
  }
};
const RELATIONS = ['apart', 'overlap', 'inside', 'around', 'same'];
const relOptions = (x, y) => [
  { id: 'apart', label: 'Apart' },
  { id: 'overlap', label: 'Overlap' },
  { id: 'inside', label: `${x} inside ${y}` },
  { id: 'around', label: `${y} inside ${x}` },
  { id: 'same', label: 'Same' }
];

/** Every way three circles can sit, pair by pair, that some Venn diagram really has: key "ab|bc|ac" → a world. */
let pictureCache = null;
function pictures() {
  if (pictureCache) return pictureCache;
  pictureCache = new Map();
  for (const world of allWorlds(3)) {
    const key = [pairRelation(world, 3, 0, 1), pairRelation(world, 3, 1, 2), pairRelation(world, 3, 0, 2)].join('|');
    if (!pictureCache.has(key)) pictureCache.set(key, world);
  }
  return pictureCache;
}

/** Where to draw circle X (B is the unit circle at the origin) for its relation to B: a list of candidates. */
function placements(rel) {
  const out = [];
  const angles = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  const add = (r, d) => {
    for (const t of d === 0 ? [0] : angles) out.push({ x: d * Math.cos(t), y: d * Math.sin(t), r });
  };
  if (rel === 'same') out.push({ x: 0, y: 0, r: 1 });
  if (rel === 'inside') for (const r of [0.3, 0.42, 0.55]) for (const d of [0, 0.3, 0.42, 0.55]) if (d + r <= 0.9) add(r, d);
  if (rel === 'around') for (const r of [1.5, 1.75, 2.6, 3.2]) for (const d of [0, 0.25, 0.4, 1, 1.5]) if (d + 1 <= r - 0.12) add(r, d);
  if (rel === 'overlap') for (const r of [0.45, 0.6, 0.85, 1.3]) for (const d of [0.7, 0.95, 1.2]) if (d > Math.abs(1 - r) + 0.12 && d < 1 + r - 0.12) add(r, d);
  if (rel === 'apart') for (const r of [0.45, 0.6, 0.8, 1.6]) for (const d of [1 + r + 0.3, 1 + r + 0.7]) add(r, d);
  return out;
}

/** How two drawn circles sit, as a pair relation (null when they only touch). */
function drawnRelation(a, c) {
  const d = Math.hypot(a.x - c.x, a.y - c.y);
  const m = 0.08;
  if (d < 1e-9 && Math.abs(a.r - c.r) < 1e-9) return 'same';
  if (d + a.r <= c.r - m) return 'inside';
  if (d + c.r <= a.r - m) return 'around';
  if (d >= a.r + c.r + m) return 'apart';
  if (d > Math.abs(a.r - c.r) + m && d < a.r + c.r - m) return 'overlap';
  return null;
}

const layoutCache = new Map();
/** Circles for A, B, C that sit exactly as asked, or null. */
export function circleLayout(ab, bc, ac) {
  const key = `${ab}|${bc}|${ac}`;
  if (layoutCache.has(key)) return layoutCache.get(key);
  // Placements are relative to B; "A inside B" is A's relation to B, "B inside C" makes C around B.
  const flipRel = { inside: 'around', around: 'inside', apart: 'apart', overlap: 'overlap', same: 'same' };
  let found = null;
  for (const a of placements(ab)) {
    for (const c of placements(flipRel[bc])) {
      if (drawnRelation(a, c) === ac) {
        found = { a, b: { x: 0, y: 0, r: 1 }, c };
        break;
      }
    }
    if (found) break;
  }
  layoutCache.set(key, found);
  return found;
}

const keyOf = (ab, bc, ac) => `${ab}|${bc}|${ac}`;

export const syllogismVenn = {
  id: 'syllogism-venn',
  topicId: 'syllogism',
  title: 'Every picture the statements allow',
  summary: 'Move the three circles into every arrangement the two statements allow. A conclusion definitely follows only if it stays true in all of them; a possibility needs just one.',
  controls: [
    {
      id: 'problem',
      label: 'Problem',
      type: 'choice',
      options: [
        { id: 'p1', label: 'All + Some' },
        { id: 'p2', label: 'All + No' },
        { id: 'p3', label: 'Some + Some' }
      ],
      default: 'p1'
    },
    { id: 'ab', label: 'A and B', type: 'choice', options: relOptions('A', 'B'), default: 'inside' },
    { id: 'bc', label: 'B and C', type: 'choice', options: relOptions('B', 'C'), default: 'overlap' },
    { id: 'ac', label: 'A and C', type: 'choice', options: relOptions('A', 'C'), default: 'overlap' }
  ],
  compute({ problem, ab, bc, ac }) {
    const p = SYL[problem];
    const all = pictures();
    // The allowed pictures: real ones in which both statements hold.
    const allowed = [...all.entries()].filter(([, world]) => p.statements.every((s) => statementTrue(world, 3, s)));
    const key = keyOf(ab, bc, ac);
    const world = all.get(key) || null;
    const statementOk = p.statements.map((s) => (world ? statementTrue(world, 3, s) : null));
    const isAllowed = Boolean(world) && statementOk.every(Boolean);
    const conclusions = p.conclusions.map((c) => {
      const plain = { q: c.q, a: c.a, b: c.b };
      const trueIn = allowed.filter(([, w]) => statementTrue(w, 3, plain)).length;
      const follows = c.possible ? trueIn > 0 : trueIn === allowed.length;
      return {
        text: statementText(p.terms, c),
        here: world ? statementTrue(world, 3, plain) : null,
        trueIn,
        follows
      };
    });
    const either =
      !conclusions[0].follows && !conclusions[1].follows && allowed.every(([, w]) => statementTrue(w, 3, p.conclusions[0]) !== statementTrue(w, 3, p.conclusions[1]));
    const verdict = conclusions[0].follows && conclusions[1].follows ? 'Both follow' : conclusions[0].follows ? 'Only I follows' : conclusions[1].follows ? 'Only II follows' : either ? 'Either I or II follows' : 'Neither follows';
    const layout = world ? circleLayout(ab, bc, ac) : null;
    const names = p.terms.map((t, i) => `${'ABC'[i]} = ${t}`);
    const message = !world
      ? 'Three circles cannot sit like this: one pair contradicts the other two.'
      : !isAllowed
        ? `This picture breaks statement ${statementOk.findIndex((ok) => !ok) + 1}.`
        : 'Allowed: both statements hold in this picture.';
    return {
      numbers: { problem, allowed: allowed.length, isAllowed, realizable: Boolean(world), hereI: conclusions[0].here, hereII: conclusions[1].here, followsI: conclusions[0].follows, followsII: conclusions[1].follows, either },
      readouts: [
        { label: 'This picture', value: message },
        { label: 'Allowed pictures', value: String(allowed.length) },
        {
          label: 'Conclusion I',
          value: `${conclusions[0].here === null ? '—' : conclusions[0].here ? 'true here' : 'false here'}; true in ${conclusions[0].trueIn} of ${allowed.length}: ${conclusions[0].follows ? 'follows' : 'does not follow'}`
        },
        {
          label: 'Conclusion II',
          value: `${conclusions[1].here === null ? '—' : conclusions[1].here ? 'true here' : 'false here'}; true in ${conclusions[1].trueIn} of ${allowed.length}: ${conclusions[1].follows ? 'follows' : 'does not follow'}`
        },
        { label: 'Answer', value: verdict }
      ],
      plot: {
        kind: 'euler',
        circles: layout
          ? [
              { label: 'A', name: p.terms[0], ...layout.a, tone: 'reasoning' },
              { label: 'B', name: p.terms[1], ...layout.b, tone: 'algebra' },
              { label: 'C', name: p.terms[2], ...layout.c, tone: 'combinatorics' }
            ]
          : [],
        legend: names,
        statements: p.statements.map((s, i) => ({ text: statementText(p.terms, s), ok: statementOk[i] })),
        conclusions: conclusions.map((c, i) => ({ label: i ? 'II' : 'I', text: c.text, here: isAllowed ? c.here : null, follows: c.follows, possible: Boolean(p.conclusions[i].possible) })),
        message,
        summary: `${names.join(', ')}. ${message} ${conclusions.map((c, i) => `Conclusion ${i ? 'II' : 'I'}, ${c.text} ${c.here === null ? '' : c.here ? 'is true here' : 'is false here'}, and is true in ${c.trueIn} of ${allowed.length} allowed pictures.`).join(' ')}`
      },
      insight: !isAllowed
        ? 'Only pictures that keep both statements true count. Change a pair to get back to an allowed picture.'
        : either
          ? 'In every allowed picture exactly one of the two conclusions is true, so the answer is "either I or II", though neither follows alone.'
          : conclusions.some((c) => !c.follows && !p.conclusions[conclusions.indexOf(c)].possible && c.trueIn > 0)
            ? 'A conclusion that is true here but false in another allowed picture does not definitely follow.'
            : 'Try the other allowed pictures: a definite conclusion must survive all of them.'
    };
  },
  tasks: [
    {
      id: 'break',
      prompt: 'All + Some: find an allowed picture in which conclusion I is false. That is why it does not follow.',
      check: (values, n) => n.problem === 'p1' && n.isAllowed && n.hereI === false,
      solution: { problem: 'p1', ab: 'inside', bc: 'overlap', ac: 'apart' }
    },
    {
      id: 'possible',
      prompt: 'All + Some: show that "All roses being gifts" is possible with an allowed picture where A sits inside C.',
      check: (values, n) => n.problem === 'p1' && n.isAllowed && values.ac === 'inside',
      solution: { problem: 'p1', ab: 'inside', bc: 'overlap', ac: 'inside' }
    },
    {
      id: 'cannot-touch',
      prompt: 'All + No: put A inside B and B apart from C, then try to make A overlap C.',
      check: (values, n) => n.problem === 'p2' && values.ab === 'inside' && values.bc === 'apart' && values.ac === 'overlap',
      solution: { problem: 'p2', ab: 'inside', bc: 'apart', ac: 'overlap' }
    },
    {
      id: 'either',
      prompt: 'Some + Some: find an allowed picture in which conclusion II (No pens are bags) is true.',
      check: (values, n) => n.problem === 'p3' && n.isAllowed && n.hereII === true,
      solution: { problem: 'p3', ab: 'overlap', bc: 'overlap', ac: 'apart' }
    }
  ]
};

/* ------------------------------ inequality chain ------------------------------ */

const LETTERS = ['P', 'Q', 'R', 'S', 'T'];
const signOptions = OPS.map((op) => ({ id: op, label: op }));
const letterOptions = LETTERS.map((l) => ({ id: l, label: l }));
const UP = new Set(['>', '≥']);
const DOWN = new Set(['<', '≤']);

export const inequalityChain = {
  id: 'inequality-chain',
  topicId: 'reasoning-inequalities',
  title: 'Follow the path between two letters',
  summary: 'Set the signs between five letters and pick two of them. A definite relation needs every sign on the path between them to point the same way.',
  controls: [
    { id: 's1', label: 'Sign between P and Q', type: 'choice', options: signOptions, default: '>' },
    { id: 's2', label: 'Sign between Q and R', type: 'choice', options: signOptions, default: '≥' },
    { id: 's3', label: 'Sign between R and S', type: 'choice', options: signOptions, default: '=' },
    { id: 's4', label: 'Sign between S and T', type: 'choice', options: signOptions, default: '≥' },
    { id: 'from', label: 'From', type: 'choice', options: letterOptions, default: 'P' },
    { id: 'to', label: 'To', type: 'choice', options: letterOptions, default: 'T' }
  ],
  compute({ s1, s2, s3, s4, from, to }) {
    const signs = [s1, s2, s3, s4];
    const tokens = LETTERS.flatMap((l, i) => (i < 4 ? [l, signs[i]] : [l]));
    const relations = chainRelations(tokens);
    const relation = pathRelation(relations, from, to);
    const i = LETTERS.indexOf(from);
    const j = LETTERS.indexOf(to);
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    // Signs on the path, read in the from → to direction.
    const pathSigns = signs.slice(lo, hi).map((op) => (i <= j ? op : { '>': '<', '≥': '≤', '=': '=', '≤': '≥', '<': '>' }[op]));
    const firstWay = pathSigns.find((op) => op !== '=');
    const way = firstWay ? (UP.has(firstWay) ? UP : DOWN) : null;
    const signStates = signs.map((_, g) => {
      if (g < lo || g >= hi) return 'off';
      const op = pathSigns[g - lo];
      if (op === '=' || !way) return 'path';
      return way.has(op) ? 'path' : 'against';
    });
    const qs = pathRelation(relations, 'Q', 'S');
    const qt = pathRelation(relations, 'Q', 'T');
    const same = from === to;
    const conclusionText = same
      ? 'Pick two different letters.'
      : relation === 'none'
        ? `No definite relation between ${from} and ${to}: a sign on the path points the other way.`
        : `${from} ${relation} ${to} is definitely true.`;
    const either = relation === '≥' || relation === '≤' ? `Either ${from} ${relation === '≥' ? '>' : '<'} ${to} or ${from} = ${to}: neither alone is certain.` : null;
    return {
      numbers: { relation: same ? 'same' : relation, from, to, qs, qt, against: signStates.filter((s) => s === 'against').length },
      readouts: [
        { label: 'Chain', value: tokens.join(' ') },
        { label: `Path from ${from} to ${to}`, value: same ? '—' : pathSigns.join(' ') || '—' },
        { label: 'Definite relation', value: same ? '—' : relation === 'none' ? 'None' : `${from} ${relation} ${to}` },
        { label: 'Either–or pair', value: either || '—' }
      ],
      plot: {
        kind: 'chain',
        letters: LETTERS,
        signs,
        from,
        to,
        signStates,
        banner: { text: conclusionText, ok: !same && relation !== 'none' },
        summary: `Chain ${tokens.join(' ')}. From ${from} to ${to}: ${conclusionText}`
      },
      insight: same
        ? 'Choose two different letters to compare.'
        : relation === 'none'
          ? 'One sign facing the other way breaks the chain: the two ends could compare either way.'
          : relation === '='
            ? 'Only equals signs on the path, so the two letters are equal.'
            : relation === '>' || relation === '<'
              ? 'Every sign points one way and at least one is strict, so the relation is strict.'
              : 'Every sign points one way but none is strict, so only ≥ or ≤ follows: "either > or =".'
    };
  },
  tasks: [
    {
      id: 'break',
      prompt: 'Change one sign so that P and T have no definite relation.',
      check: (values, n) => values.from === 'P' && values.to === 'T' && n.relation === 'none',
      solution: { s4: '<', from: 'P', to: 'T' }
    },
    {
      id: 'weak',
      prompt: 'Make the relation from P to T exactly P ≥ T (true, but not strict).',
      check: (values, n) => values.from === 'P' && values.to === 'T' && n.relation === '≥',
      solution: { s1: '≥', s2: '≥', s3: '=', s4: '≥', from: 'P', to: 'T' }
    },
    {
      id: 'equal',
      prompt: 'Set the signs so that P = T.',
      check: (values, n) => values.from === 'P' && values.to === 'T' && n.relation === '=',
      solution: { s1: '=', s2: '=', s3: '=', s4: '=', from: 'P', to: 'T' }
    },
    {
      id: 'q-s-t',
      prompt: 'Make Q < S definitely true while Q and T have no definite relation.',
      check: (values, n) => n.qs === '<' && n.qt === 'none',
      solution: { s2: '<', s3: '=', s4: '>' }
    }
  ]
};

/* ------------------------------ family tree ------------------------------ */

const PEOPLE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const st = (a, rel, b) => ({ a: PEOPLE.indexOf(a), rel, b: PEOPLE.indexOf(b) });
const FAMILIES = {
  f1: {
    statements: [st('A', 'husband', 'B'), st('C', 'son', 'B'), st('D', 'sister', 'C'), st('E', 'wife', 'C'), st('F', 'daughter', 'E'), st('G', 'husband', 'D'), st('H', 'child', 'G')],
    // Where each person sits on the drawing (columns, generation rows).
    at: { A: [2, 0], B: [3, 0], C: [1, 1], E: [0, 1], D: [4, 1], G: [5, 1], F: [0.5, 2], H: [4.5, 2] }
  },
  f2: {
    statements: [st('A', 'father', 'B'), st('C', 'brother', 'B'), st('B', 'wife', 'D'), st('E', 'son', 'D'), st('F', 'mother', 'A'), st('G', 'daughter', 'C'), st('H', 'husband', 'G')],
    at: { F: [2.5, 0], A: [2.5, 1], B: [1, 2], D: [0, 2], C: [4, 2], E: [0.5, 3], G: [4, 3], H: [5, 3] }
  }
};
const personOptions = PEOPLE.map((p) => ({ id: p, label: p }));

export const familyTree = {
  id: 'family-tree',
  topicId: 'blood-relations',
  title: 'A family tree, one statement at a time',
  summary: 'Read the statements one by one and watch the tree grow. Squares are men, circles women, diamonds people whose gender is not known yet. Pick any two people to name their relation.',
  controls: [
    {
      id: 'family',
      label: 'Family',
      type: 'choice',
      options: [
        { id: 'f1', label: 'Family 1' },
        { id: 'f2', label: 'Family 2' }
      ],
      default: 'f1'
    },
    { id: 'read', label: 'Statements read', type: 'range', min: 0, max: 7, step: 1, default: 0 },
    { id: 'from', label: 'How is', type: 'choice', options: personOptions, default: 'A' },
    { id: 'to', label: 'related to', type: 'choice', options: personOptions, default: 'B' }
  ],
  compute({ family, read, from, to }) {
    const fam = FAMILIES[family];
    const k = Math.min(read, fam.statements.length);
    const used = fam.statements.slice(0, k);
    const f = buildFamily(PEOPLE.length, used);
    const mentioned = new Set(used.flatMap((s) => [s.a, s.b]));
    const mentionedBefore = new Set(fam.statements.slice(0, Math.max(0, k - 1)).flatMap((s) => [s.a, s.b]));
    const genderBefore = buildFamily(PEOPLE.length, fam.statements.slice(0, Math.max(0, k - 1))).gender;
    const x = PEOPLE.indexOf(from);
    const y = PEOPLE.indexOf(to);
    let relation;
    if (x === y) relation = 'the same person';
    else if (!mentioned.has(x) || !mentioned.has(y)) relation = null;
    else relation = relationByPath(f, x, y);
    const relationText =
      x === y
        ? 'Pick two different people.'
        : !mentioned.has(x) || !mentioned.has(y)
          ? `${!mentioned.has(x) ? from : to} is not in the story yet.`
          : relation
            ? relation.includes(' or ')
              ? `${from} is ${to}’s ${relation}: ${from}’s gender is not known.`
              : `${from} is ${to}’s ${relation}.`
            : `No simple name yet for how ${from} is related to ${to}.`;
    const nodes = PEOPLE.map((name, i) => ({
      id: name,
      x: fam.at[name][0],
      y: fam.at[name][1],
      gender: f.gender[i],
      visible: mentioned.has(i),
      fresh: mentioned.has(i) && !mentionedBefore.has(i),
      revealed: Boolean(f.gender[i]) && !genderBefore[i] && mentionedBefore.has(i),
      role: i === x ? 'from' : i === y ? 'to' : null
    }));
    const edges = [];
    for (let i = 0; i < PEOPLE.length; i++) {
      if (f.spouse[i] !== null && i < f.spouse[i] && mentioned.has(i)) edges.push({ type: 'marriage', a: PEOPLE[i], b: PEOPLE[f.spouse[i]] });
      const parents = [...f.parents[i]].filter((p) => mentioned.has(p));
      if (mentioned.has(i) && parents.length) edges.push({ type: 'child', parents: parents.map((p) => PEOPLE[p]), child: PEOPLE[i] });
    }
    // Brothers and sisters with no parent named yet are joined by a dashed line.
    for (let i = 0; i < PEOPLE.length; i++) for (let j = i + 1; j < PEOPLE.length; j++) {
      if (mentioned.has(i) && mentioned.has(j) && f.siblingGroup[i] === f.siblingGroup[j] && !f.parents[i].size) edges.push({ type: 'sibling', a: PEOPLE[i], b: PEOPLE[j] });
    }
    const unknown = PEOPLE.filter((_, i) => mentioned.has(i) && !f.gender[i]);
    return {
      numbers: { family, k, relation, from, to, unknown, known: mentioned.size },
      readouts: [
        { label: 'Latest statement', value: k ? familyText(PEOPLE, fam.statements[k - 1]) : 'None yet' },
        { label: 'People in the tree', value: String(mentioned.size) },
        { label: 'Gender not known', value: unknown.length ? unknown.join(', ') : 'Nobody' },
        { label: `How ${from} is related to ${to}`, value: relationText }
      ],
      plot: {
        kind: 'tree',
        nodes,
        edges,
        statements: fam.statements.map((s, i) => ({ text: familyText(PEOPLE, s), state: i < k ? (i === k - 1 ? 'new' : 'applied') : 'pending' })),
        summary: `${k} of 7 statements read. People so far: ${PEOPLE.filter((_, i) => mentioned.has(i)).map((p, i) => p).join(', ') || 'none'}. ${relationText}`
      },
      insight:
        k === 0
          ? 'Read the first statement. Each one adds a person or a link; the subject’s gender comes from the relation word.'
          : unknown.length
            ? `${unknown.join(' and ')} ${unknown.length === 1 ? 'is' : 'are'} drawn as a diamond: no statement has said man or woman yet. Any relation that needs that gender cannot be named.`
            : 'Everyone so far has a known gender, so every connected pair can be named.'
    };
  },
  tasks: [
    {
      id: 'grandfather',
      prompt: 'Family 1: read just enough statements to name how A is related to F.',
      check: (values, n) => n.family === 'f1' && n.from === 'A' && n.to === 'F' && n.relation === 'grandfather' && n.k === 5,
      solution: { family: 'f1', read: 5, from: 'A', to: 'F' }
    },
    {
      id: 'unknown',
      prompt: 'Family 1: read all seven statements. Whose gender is still unknown? Set "How is" to that person and "related to" to G.',
      check: (values, n) => n.family === 'f1' && n.k === 7 && n.from === 'H' && n.to === 'G',
      solution: { family: 'f1', read: 7, from: 'H', to: 'G' }
    },
    {
      id: 'reveal',
      prompt: 'Family 2: find the statement that tells you B is a woman (her shape changes from a diamond).',
      check: (values, n) => n.family === 'f2' && n.k === 3,
      solution: { family: 'f2', read: 3 }
    },
    {
      id: 'in-law',
      prompt: 'Family 2: show a brother-in-law. How is C related to D?',
      check: (values, n) => n.family === 'f2' && n.relation === 'brother-in-law',
      solution: { family: 'f2', read: 3, from: 'C', to: 'D' }
    }
  ]
};

export const reasoningSims = [seatingClues, puzzleGrid, syllogismVenn, inequalityChain, familyTree];
