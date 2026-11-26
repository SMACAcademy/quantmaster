/**
 * The logical-reasoning solvers (src/utils/reasoning) and the generators built
 * on them. Each solver is held to the textbook conventions on worked examples,
 * and to a second, independently written solver on many random cases; every
 * generated puzzle is re-solved from its printed clues to confirm the answer is
 * the only one.
 */

import { describe, it, expect } from 'vitest';

import { createRng } from '../src/generators/core.js';
import { getTemplate } from '../src/generators/index.js';
import {
  allArrangements,
  clueHolds,
  clueHoldsGeometric,
  personOpposite,
  personToSide,
  solveSeating,
  solveSeatingGeometric
} from '../src/utils/reasoning/seating.js';
import { forcedGrid, solutionKey, solvePuzzle, solvePuzzleByHolders } from '../src/utils/reasoning/puzzles.js';
import { VERDICTS, follows, followsByMembers, verdict, verdictByMembers } from '../src/utils/reasoning/syllogism.js';
import {
  IQ_VERDICTS,
  OPS,
  bruteRelation,
  chainRelations,
  iqVerdict,
  iqVerdictBrute,
  isContested,
  pathRelation
} from '../src/utils/reasoning/inequality.js';
import { buildFamily, generations, relationByPath, relationByStructure } from '../src/utils/reasoning/family.js';
import { buildInstance } from '../src/generators/engine.js';

/* ------------------------------ seating ------------------------------ */

describe('seating conventions', () => {
  const row = { layout: 'row', people: ['A', 'B', 'C', 'D'] };
  const circle = { layout: 'circle', people: ['A', 'B', 'C', 'D', 'E', 'F'] };
  const rows = { layout: 'rows', people: ['P', 'Q', 'R', 'A', 'B', 'C'] };

  it('reads a row facing north from the left end', () => {
    const a = { seats: [0, 1, 2, 3], facing: null };
    expect(personToSide(row, a, 2, 'left', 1)).toBe(1); // B is immediately left of C
    expect(personToSide(row, a, 1, 'right', 2)).toBe(3);
    expect(personToSide(row, a, 0, 'left', 1)).toBeNull(); // off the end
  });

  it('takes left as clockwise when facing the centre, anticlockwise when facing out', () => {
    const inward = { seats: [0, 1, 2, 3, 4, 5], facing: null };
    expect(personToSide(circle, inward, 0, 'left', 1)).toBe(1);
    expect(personToSide(circle, inward, 0, 'right', 1)).toBe(5);
    expect(personOpposite(circle, inward, 1)).toBe(4);
    const mixed = { seats: [0, 1, 2, 3, 4, 5], facing: ['out', 'in', 'in', 'in', 'in', 'in'] };
    expect(personToSide({ ...circle, mixed: true }, mixed, 0, 'left', 1)).toBe(5);
    expect(personToSide({ ...circle, mixed: true }, mixed, 0, 'right', 2)).toBe(2);
  });

  it('mirrors left and right between two rows facing each other', () => {
    // Row 1 (facing south), west to east: P Q R. Row 2 (facing north): A B C.
    const a = { seats: [0, 1, 2, 3, 4, 5], facing: null };
    expect(personToSide(rows, a, 1, 'left', 1)).toBe(2); // Q's left is east: R
    expect(personToSide(rows, a, 4, 'left', 1)).toBe(3); // B's left is west: A
    expect(personOpposite(rows, a, 0)).toBe(3);
  });

  it('agrees with the geometric reading on every clue in every arrangement', () => {
    const rng = createRng(11);
    const puzzles = [
      { layout: 'row', people: ['A', 'B', 'C', 'D', 'E'] },
      { layout: 'circle', people: ['A', 'B', 'C', 'D', 'E', 'F'] },
      { layout: 'circle', mixed: true, people: ['A', 'B', 'C', 'D', 'E'] },
      { layout: 'rows', people: ['A', 'B', 'C', 'D', 'E', 'F'] }
    ];
    for (const puzzle of puzzles) {
      const n = puzzle.people.length;
      const kinds = [];
      for (let p = 0; p < n; p++) {
        kinds.push({ t: 'end', p }, { t: 'notEnd', p }, { t: 'pos', p, k: 2, from: 'left' }, { t: 'pos', p, k: 1, from: 'right' }, { t: 'face', p, dir: 'out' }, { t: 'row', p, row: 2 });
        for (let q = 0; q < n; q++) {
          if (q === p) continue;
          for (const side of ['left', 'right']) for (const k of [1, 2, 3]) kinds.push({ t: 'side', p, q, side, k });
          kinds.push({ t: 'adj', p, q }, { t: 'notAdj', p, q }, { t: 'gap', p, q, k: 1 }, { t: 'opp', p, q });
        }
      }
      const all = allArrangements(puzzle);
      for (let i = 0; i < 300; i++) {
        const arrangement = rng.pick(all);
        const clue = rng.pick(kinds);
        if (clue.t === 'row' && puzzle.layout !== 'rows') continue;
        if ((clue.t === 'pos' || clue.t === 'gap') && puzzle.layout !== 'row') continue;
        expect(clueHoldsGeometric(puzzle, arrangement, clue), `${puzzle.layout} ${JSON.stringify(clue)}`).toBe(clueHolds(puzzle, arrangement, clue));
      }
    }
  });

  it('counts a round table’s rotations once', () => {
    expect(allArrangements({ layout: 'circle', people: ['A', 'B', 'C', 'D', 'E', 'F'] })).toHaveLength(120);
    expect(allArrangements({ layout: 'rows', rowOne: [0, 1, 2], people: ['A', 'B', 'C', 'D', 'E', 'F'] })).toHaveLength(36);
  });
});

/* ------------------------------ puzzles ------------------------------ */

describe('puzzle solver', () => {
  const P = (p) => ({ p });
  const V = (a, v) => ({ a, v });

  it('solves a floor puzzle the two ways, with the same answers', () => {
    const puzzle = {
      people: ['A', 'B', 'C', 'D', 'E'],
      slots: true,
      attrs: ['colour'],
      clues: [{ t: 'at', x: P(0), k: 2 }, { t: 'justAbove', x: P(1), y: P(0) }, { t: 'same', x: P(1), y: V(0, 0) }, { t: 'parity', x: P(2), even: true }, { t: 'above', x: V(0, 1), y: P(3) }]
    };
    const a = solvePuzzle(puzzle).map(solutionKey).sort();
    const b = solvePuzzleByHolders(puzzle).map(solutionKey).sort();
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });

  it('agrees with the second solver on random clue sets', () => {
    const rng = createRng(5);
    const types = ['same', 'diff', 'at', 'notAt', 'above', 'justAbove', 'gap', 'adjacent', 'notAdjacent', 'parity', 'extreme'];
    for (let i = 0; i < 40; i++) {
      const puzzle = { people: ['A', 'B', 'C', 'D'], slots: true, attrs: ['x'], clues: [] };
      for (let c = 0; c < 4; c++) {
        const t = rng.pick(types);
        const x = rng.chance(0.7) ? P(rng.int(0, 3)) : V(0, rng.int(0, 3));
        const y = t === 'same' || t === 'diff' ? V(0, rng.int(0, 3)) : P(rng.int(0, 3));
        puzzle.clues.push({ t, x, y, k: rng.int(0, 2), even: rng.chance(0.5) });
      }
      expect(solvePuzzle(puzzle).map(solutionKey).sort()).toEqual(solvePuzzleByHolders(puzzle).map(solutionKey).sort());
    }
  });

  it('marks forced cells only when every solution agrees', () => {
    const puzzle = { people: ['A', 'B', 'C'], slots: false, attrs: ['city'], clues: [{ t: 'same', x: P(0), y: V(0, 2) }] };
    const grid = forcedGrid(puzzle, solvePuzzle(puzzle));
    expect(grid[0][0]).toEqual(['no', 'no', 'yes']);
    expect(grid[0][1]).toEqual([null, null, 'no']);
  });
});

/* ------------------------------ syllogisms ------------------------------ */

describe('syllogisms', () => {
  const s = (q, a, b, possible) => ({ q, a, b, ...(possible ? { possible: true } : {}) });

  it('matches the textbook results', () => {
    // All A are B, All B are C ⇒ All A are C.
    expect(follows(3, [s('all', 0, 1), s('all', 1, 2)], s('all', 0, 2))).toBe(true);
    // All A are B ⇏ All B are A, but ⇒ Some B are A.
    expect(follows(2, [s('all', 0, 1)], s('all', 1, 0))).toBe(false);
    expect(follows(2, [s('all', 0, 1)], s('some', 1, 0))).toBe(true);
    // Some A are B, No B are C ⇒ Some A are not C (and not "No A are C").
    expect(follows(3, [s('some', 0, 1), s('no', 1, 2)], s('someNot', 0, 2))).toBe(true);
    expect(follows(3, [s('some', 0, 1), s('no', 1, 2)], s('no', 0, 2))).toBe(false);
    // No A are B, All B are C ⇒ Some C are not A.
    expect(follows(3, [s('no', 0, 1), s('all', 1, 2)], s('someNot', 2, 0))).toBe(true);
    // Some + Some ⇒ nothing, but Some/No is an either-or pair.
    expect(verdict(3, [s('some', 0, 1), s('some', 1, 2)], s('some', 0, 2), s('no', 0, 2))).toBe(VERDICTS[2]);
    // A possibility that a statement forbids does not follow.
    expect(follows(2, [s('no', 0, 1)], s('some', 0, 1, true))).toBe(false);
    expect(follows(3, [s('all', 0, 1), s('some', 1, 2)], s('all', 0, 2, true))).toBe(true);
    // Only a few A are B rules out All A being B.
    expect(follows(2, [s('onlyFew', 0, 1)], s('all', 0, 1, true))).toBe(false);
  });

  it('decides every two-statement syllogism the same way from bitmask worlds and from members', () => {
    const forms = ['all', 'some', 'no', 'someNot'];
    const pairs = [[0, 1], [1, 0]];
    let checked = 0;
    for (const q1 of forms) for (const [a1, b1] of pairs) for (const q2 of forms) for (const [a2, b2] of [[1, 2], [2, 1]]) {
      const statements = [s(q1, a1, b1), s(q2, a2, b2)];
      for (const q of forms) for (const [a, b] of [[0, 2], [2, 0]]) {
        const c = s(q, a, b);
        expect(followsByMembers(3, statements, c)).toBe(follows(3, statements, c));
        const p = s(q, a, b, true);
        expect(followsByMembers(3, statements, p)).toBe(follows(3, statements, p));
        checked += 1;
      }
      expect(verdictByMembers(3, statements, s('some', 0, 2), s('no', 0, 2))).toBe(verdict(3, statements, s('some', 0, 2), s('no', 0, 2)));
    }
    expect(checked).toBe(512);
  });
});

/* ------------------------------ inequalities ------------------------------ */

describe('inequalities', () => {
  it('follows the path rule', () => {
    const rel = chainRelations(['P', '>', 'Q', '≥', 'R', '=', 'S', '<', 'T']);
    expect(pathRelation(rel, 'P', 'S')).toBe('>');
    expect(pathRelation(rel, 'Q', 'S')).toBe('≥');
    expect(pathRelation(rel, 'S', 'P')).toBe('<');
    expect(pathRelation(rel, 'P', 'T')).toBe('none');
    expect(iqVerdict(rel, { x: 'Q', op: '>', y: 'S' }, { x: 'Q', op: '=', y: 'S' })).toBe(IQ_VERDICTS[2]);
    expect(isContested('>', '≥')).toBe(true);
    expect(isContested('≥', '>')).toBe(false);
  });

  it('gives the same relation by the path and by brute force on every chain of four letters', () => {
    for (const a of OPS) for (const b of OPS) for (const c of OPS) {
      const rel = chainRelations(['A', a, 'B', b, 'C', c, 'D']);
      for (const [x, y] of [['A', 'C'], ['A', 'D'], ['D', 'B'], ['C', 'A']]) expect(pathRelation(rel, x, y), `${a}${b}${c} ${x}${y}`).toBe(bruteRelation(rel, x, y));
    }
  });

  it('gives the same verdict both ways for random statements and conclusions', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const rel = [...chainRelations(['A', rng.pick(OPS), 'B', rng.pick(OPS), 'C']), ...chainRelations(['C', rng.pick(OPS), 'D', rng.pick(OPS), 'E'])];
      const pick = () => {
        const [x, y] = rng.shuffle(['A', 'B', 'C', 'D', 'E']).slice(0, 2);
        return { x, op: rng.pick(OPS), y };
      };
      const c1 = pick();
      const c2 = rng.chance(0.5) ? { ...c1, op: rng.pick(OPS) } : pick();
      if ([c1, c2].some((c) => isContested(pathRelation(rel, c.x, c.y), c.op))) continue;
      expect(iqVerdictBrute(rel, c1, c2)).toBe(iqVerdict(rel, c1, c2));
    }
  });
});

/* ------------------------------ blood relations ------------------------------ */

describe('blood relations', () => {
  const st = (a, rel, b) => ({ a, rel, b });

  it('names relations by both methods', () => {
    // 0 Mohan = 1 Kamala; children 2 Suresh, 3 Lata; 4 Priya = Suresh; 5 Arun their son; 6 Vikram = Lata; 7 Bindu their daughter.
    const f = buildFamily(8, [st(0, 'husband', 1), st(2, 'son', 1), st(3, 'sister', 2), st(4, 'wife', 2), st(5, 'son', 4), st(6, 'husband', 3), st(7, 'daughter', 6)]);
    const cases = [
      [7, 5, 'cousin'],
      [6, 0, 'son-in-law'],
      [4, 3, 'sister-in-law'],
      [1, 7, 'grandmother'],
      [3, 5, 'aunt'],
      [5, 3, 'nephew'],
      [0, 4, 'father-in-law'],
      [2, 3, 'brother']
    ];
    for (const [x, y, word] of cases) {
      expect(relationByPath(f, x, y), `${x}→${y}`).toBe(word);
      expect(relationByStructure(f, x, y), `${x}→${y}`).toBe(word);
    }
    expect(generations(f)).toEqual([0, 0, 1, 1, 1, 2, 1, 2]);
  });

  it('leaves a gender open when no statement gives it', () => {
    const f = buildFamily(3, [st(0, 'brother', 1), st(1, 'child', 2)]);
    expect(f.gender).toEqual(['M', null, null]);
    expect(relationByPath(f, 1, 0)).toBe('brother or sister');
  });
});

/* ------------------------------ generated puzzles are unique ------------------------------ */

describe('generated reasoning puzzles', () => {
  it('print seating clues that only one arrangement satisfies', () => {
    for (const id of ['sa-gen-row-side', 'sa-gen-rows-face', 'sa-gen-circle', 'sa-gen-mixed']) {
      const template = getTemplate(id);
      let seen = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const params = template.params(createRng(seed));
        if (!params) continue;
        seen += 1;
        const { puzzle } = params;
        const solutions = solveSeating(puzzle);
        expect(solutions, `${id} seed ${seed}`).toHaveLength(1);
        expect(solveSeatingGeometric(puzzle)).toHaveLength(1);
        expect(solutions[0].seats).toEqual(puzzle.truth.seats);
      }
      expect(seen).toBeGreaterThan(10);
    }
  });

  it('print puzzle clues that only one solution satisfies', () => {
    for (const id of ['pz-gen-floor', 'pz-gen-floor-colour', 'pz-gen-box', 'pz-gen-schedule', 'pz-gen-grid']) {
      const template = getTemplate(id);
      for (let seed = 1; seed <= 25; seed++) {
        const params = template.params(createRng(seed));
        if (!params) continue;
        expect(solvePuzzleByHolders(params.puzzle), `${id} seed ${seed}`).toHaveLength(1);
      }
    }
  });

  it('keep the case-method questions honest: several cases, one answer', () => {
    const template = getTemplate('pz-gen-cases');
    for (let seed = 1; seed <= 30; seed++) {
      const { question } = buildInstance(template, seed);
      if (!question) continue;
      const { puzzle, p, q } = question.parameters;
      const all = solvePuzzleByHolders(puzzle);
      expect(all.length).toBeGreaterThan(1);
      expect(new Set(all.map((s) => Math.abs(s.slot[p] - s.slot[q]) - 1)).size).toBe(1);
    }
  });

  it('never ask an inequality conclusion that depends on the ≥-versus-> convention', () => {
    for (const id of ['iq-gen-direct', 'iq-gen-combined', 'iq-gen-either', 'iq-gen-coded']) {
      const template = getTemplate(id);
      for (let seed = 1; seed <= 60; seed++) {
        const params = template.params(createRng(seed));
        if (!params) continue;
        for (const c of [params.c1, params.c2]) expect(isContested(pathRelation(params.relations, c.x, c.y), c.op)).toBe(false);
      }
    }
  });
});
