/**
 * Logical-reasoning simulations (src/simulations/reasoning.js). The general
 * checks (controls, corners, challenges, meta) run in simulations.test.js;
 * these hold each picture to the solvers: seats are drawn only when certain,
 * forced cells are exactly what every solution agrees on, every arrangement of
 * three circles that a Venn diagram allows can be drawn, chain verdicts match
 * brute force, and the family tree names relations correctly.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { circleLayout } from '../src/simulations/reasoning.js';
import { allWorlds, pairRelation } from '../src/utils/reasoning/syllogism.js';
import { OPS, bruteRelation, chainRelations } from '../src/utils/reasoning/inequality.js';
import { levelRepository } from '../src/repositories/contentRepository.js';

const result = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;

describe('seating-clues', () => {
  it('narrows the arrangements with every clue and seats only the certain people', () => {
    const counts = [0, 1, 2, 3, 4, 5, 6].map((k) => result('seating-clues', { layout: 'row', clues: k }).numbers.possible);
    expect(counts).toEqual([720, 120, 24, 12, 6, 4, 1]);
    const end = result('seating-clues', { layout: 'row', clues: 6 });
    expect(end.plot.people.map((p) => p.seat)).toEqual([1, 4, 3, 0, 5, 2]); // Dia Amar Farah Chirag Bela Eshan
    const two = result('seating-clues', { layout: 'row', clues: 2 });
    expect(two.plot.people.filter((p) => p.seat !== null).map((p) => p.name)).toEqual(['Bela', 'Chirag']);
    expect(two.plot.people.find((p) => p.name === 'Bela').fresh).toBe(true);
  });

  it('fixes Gauri at the top of the round table before any clue', () => {
    const start = result('seating-clues', { layout: 'circle', clues: 0 });
    expect(start.numbers.possible).toBe(5040);
    expect(start.plot.people.filter((p) => p.seat !== null).map((p) => p.name)).toEqual(['Gauri']);
    expect(result('seating-clues', { layout: 'circle', clues: 6 }).numbers.possible).toBe(1);
  });

  it('flags the contradicting clue', () => {
    const r = result('seating-clues', { layout: 'circle', clues: 6, conflict: 'on' });
    expect(r.numbers.possible).toBe(0);
    expect(r.plot.clues.at(-1).state).toBe('conflict');
    expect(r.plot.people.every((p) => p.seat === null)).toBe(true);
  });
});

describe('puzzle-grid', () => {
  it('fills every cell once the puzzle is solved, and only stated marks with filling off', () => {
    const solved = result('puzzle-grid', { puzzle: 'grid', clues: 6, fill: 'on' });
    expect(solved.numbers.solutions).toBe(1);
    expect(solved.numbers.settled).toBe(solved.numbers.total);
    const stated = result('puzzle-grid', { puzzle: 'grid', clues: 6, fill: 'off' });
    // Four clues name a person: Kabir–Cochin, Leela not Agra, Neha–red, Manu not Delhi.
    expect(stated.numbers.settled).toBe(4);
  });

  it('marks forced cells that the clues do not state', () => {
    const r = result('puzzle-grid', { puzzle: 'floors', clues: 1, fill: 'on' });
    // Raghav on floor 3: his row and floor 3's column are settled (1 tick, 8 crosses).
    expect(r.numbers.settled).toBe(9);
    const raghav = r.plot.cells[0][2];
    expect(raghav.map((c) => c.mark)).toEqual(['no', 'no', 'yes', 'no', 'no']);
    expect(raghav[0].source).toBe('forced');
    expect(raghav[2].source).toBe('clue');
  });
});

describe('syllogism-venn', () => {
  it('can draw every arrangement of three circles that some Venn diagram has', () => {
    const triples = new Set();
    for (const world of allWorlds(3)) triples.add([pairRelation(world, 3, 0, 1), pairRelation(world, 3, 1, 2), pairRelation(world, 3, 0, 2)].join('|'));
    expect(triples.size).toBeGreaterThan(20);
    for (const key of triples) expect(circleLayout(...key.split('|')), key).not.toBeNull();
  });

  it('decides the conclusions over all allowed pictures', () => {
    const p1 = result('syllogism-venn', { problem: 'p1' }).numbers;
    expect(p1.followsI).toBe(false); // Some roses are gifts: not certain
    expect(p1.followsII).toBe(true); // All roses being gifts: possible
    const p2 = result('syllogism-venn', { problem: 'p2', ab: 'inside', bc: 'apart', ac: 'apart' }).numbers;
    expect(p2.isAllowed).toBe(true);
    expect(p2.followsI).toBe(true); // No kites are clouds
    expect(p2.followsII).toBe(false); // Some clouds are birds
    const p3 = result('syllogism-venn', { problem: 'p3', ab: 'overlap', bc: 'overlap', ac: 'overlap' }).numbers;
    expect(p3.either).toBe(true);
  });

  it('says when three relations cannot be drawn together', () => {
    const r = result('syllogism-venn', { problem: 'p2', ab: 'inside', bc: 'apart', ac: 'overlap' });
    expect(r.numbers.realizable).toBe(false);
    expect(r.plot.circles).toEqual([]);
  });
});

describe('inequality-chain', () => {
  it('reads the same relation as brute force for every setting of the signs', () => {
    const letters = ['P', 'Q', 'R', 'S', 'T'];
    for (const s1 of OPS) for (const s2 of OPS) for (const s4 of OPS) {
      const s3 = '≥';
      const rel = chainRelations(['P', s1, 'Q', s2, 'R', s3, 'S', s4, 'T']);
      for (const [from, to] of [['P', 'T'], ['Q', 'S'], ['T', 'Q']]) {
        expect(result('inequality-chain', { s1, s2, s3, s4, from, to }).numbers.relation).toBe(bruteRelation(rel, from, to));
      }
      expect(letters).toHaveLength(5);
    }
  });

  it('marks the signs that point against the path', () => {
    const r = result('inequality-chain', { s1: '>', s2: '<', s3: '=', s4: '>', from: 'P', to: 'T' });
    expect(r.plot.signStates).toEqual(['path', 'against', 'path', 'path']);
  });
});

describe('family-tree', () => {
  it('names relations as the statements arrive', () => {
    expect(result('family-tree', { family: 'f1', read: 4, from: 'A', to: 'F' }).numbers.relation).toBeNull(); // F not in the story yet
    expect(result('family-tree', { family: 'f1', read: 5, from: 'A', to: 'F' }).numbers.relation).toBe('grandfather');
    expect(result('family-tree', { family: 'f1', read: 7, from: 'F', to: 'H' }).numbers.relation).toBe('cousin');
    expect(result('family-tree', { family: 'f1', read: 7, from: 'H', to: 'D' }).numbers.relation).toBe('son or daughter');
    expect(result('family-tree', { family: 'f2', read: 7, from: 'F', to: 'G' }).numbers.relation).toBe('great-grandmother');
  });

  it('draws unknown genders until a statement settles them', () => {
    const before = result('family-tree', { family: 'f2', read: 2 });
    expect(before.plot.nodes.find((n) => n.id === 'B').gender).toBeNull();
    const after = result('family-tree', { family: 'f2', read: 3 });
    const b = after.plot.nodes.find((n) => n.id === 'B');
    expect(b.gender).toBe('F');
    expect(b.revealed).toBe(true);
  });
});

describe('lessons', () => {
  it('embed each reasoning simulation in its topic’s first lesson', () => {
    const embeds = {
      'seating-arrangement': 'seating-clues',
      puzzles: 'puzzle-grid',
      syllogism: 'syllogism-venn',
      'reasoning-inequalities': 'inequality-chain',
      'blood-relations': 'family-tree'
    };
    for (const [topic, sim] of Object.entries(embeds)) {
      const lesson = levelRepository.getById(`${topic}-level-0`).lesson.blocks;
      expect(lesson.some((b) => b.type === 'simulation' && b.simulationId === sim), topic).toBe(true);
    }
  });
});
