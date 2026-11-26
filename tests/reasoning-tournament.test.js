/**
 * Logical sets (utils/reasoning/tournament.js), its generators and its
 * simulation. Every rule is held to textbook values and to the second,
 * independently written method beside it, on every case or many random ones;
 * generated questions are checked for a single right option; the round-robin
 * simulation is held to the solver.
 */

import { describe, it, expect } from 'vitest';

import { createRng } from '../src/generators/core.js';
import { getTemplate } from '../src/generators/index.js';
import { buildInstance } from '../src/generators/engine.js';
import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { questionRepository } from '../src/repositories/contentRepository.js';
import {
  SCORINGS,
  circleSchedule,
  countRoutes,
  daysLowerBound,
  drawsByTrying,
  drawsFromTotal,
  gridRoutes,
  gridRoutesAll,
  gridRoutesByWalking,
  gridRoutesThrough,
  knockoutBySimulation,
  knockoutFormula,
  listRoutes,
  matchCount,
  meetRound,
  meetRoundByHalving,
  minDays,
  pairs,
  pointsOf,
  positionsOf,
  qualifyByBrute,
  qualifyFormula,
  recordOf,
  resultBetween,
  roundNames,
  scheduleProblems,
  shortestRoute,
  solveTable,
  solveTableByCounting,
  totalPoints
} from '../src/utils/reasoning/tournament.js';
import { openClaims, sets } from './fixtures/reasoningFinal/tournament.js';

const S210 = SCORINGS['2-1-0'];
const S310 = SCORINGS['3-1-0'];
const keyedText = (q) => q.options.find((o) => o.id === q.correctAnswer[0]).text;

describe('round robins', () => {
  it('counts matches and points the textbook way', () => {
    expect(matchCount(8)).toBe(28);
    expect(matchCount(6, 2)).toBe(30);
    expect(totalPoints(15, 4, S310)).toBe(41);
    expect(totalPoints(10, 7, S210)).toBe(20);
    expect(drawsFromTotal(15, 41, S310)).toBe(4);
    expect(drawsFromTotal(10, 20, S210)).toBeNull(); // with 2-1-0 the total says nothing about draws
    expect(positionsOf([6, 4, 4, 0])).toEqual([1, 2, 2, 4]);
  });

  it('matches the formulas to walking the pairs and trying every draw count', () => {
    for (let n = 2; n <= 20; n++) expect(pairs(n).length).toBe(matchCount(n));
    for (let m = 1; m <= 45; m++) {
      for (let d = 0; d <= m; d++) {
        expect(drawsByTrying(m, totalPoints(m, d, S310), S310)).toEqual([drawsFromTotal(m, totalPoints(m, d, S310), S310)]);
        expect(drawsByTrying(m, totalPoints(m, d, S210), S210)).toHaveLength(m + 1);
      }
    }
  });

  it('gives every result set points that add up to the total', () => {
    for (const results of solveTableByCounting({ n: 4, points: [null, null, null, null], scoring: S310 })) {
      const pts = pointsOf(4, results, S310);
      const draws = results.filter((r) => r === 'd').length;
      expect(pts.reduce((s, p) => s + p, 0)).toBe(totalPoints(6, draws, S310));
      const recs = [0, 1, 2, 3].map((t) => recordOf(4, results, t));
      recs.forEach((r, t) => expect(3 * r.won + r.drawn).toBe(pts[t]));
      expect(recs.reduce((s, r) => s + r.won, 0)).toBe(recs.reduce((s, r) => s + r.lost, 0));
    }
  });
});

describe('points tables', () => {
  it('finds the same result sets by the pruned search and by counting through all of them', () => {
    const rng = createRng(2024);
    for (let trial = 0; trial < 150; trial++) {
      const n = trial < 120 ? 4 : 5;
      const scoring = rng.chance(0.5) ? S310 : S210;
      const allowDraw = rng.chance(0.85);
      const results = pairs(n).map(() => (allowDraw && rng.chance(0.3) ? 'd' : rng.pick(['h', 'a'])));
      const full = pointsOf(n, results, scoring);
      const points = full.map((p) => (rng.chance(0.2) ? null : p));
      const [i, j] = rng.pick(pairs(n));
      const known = rng.chance(0.4) ? [{ pair: [j, i], result: resultBetween(n, results, j, i) }] : [];
      const a = solveTable({ n, points, scoring, known, allowDraw }).map((r) => r.join(''));
      const b = solveTableByCounting({ n, points, scoring, known, allowDraw }).map((r) => r.join(''));
      expect(a.sort()).toEqual(b.sort());
      expect(a).toContain(results.join(''));
    }
  });

  it('reads a known result from either side', () => {
    const results = ['h', 'd', 'a', 'h', 'a', 'd'];
    for (const [i, j] of pairs(4)) {
      const r = resultBetween(4, results, i, j);
      expect(resultBetween(4, results, j, i)).toBe(r === 'd' ? 'd' : r === 'h' ? 'a' : 'h');
    }
  });
});

describe('qualification', () => {
  it('agrees with playing every possible season', () => {
    for (let n = 3; n <= 6; n++) {
      for (let k = 1; k <= n - 1; k++) {
        for (const win of [1, 2, 3]) {
          expect(qualifyByBrute(n, k, { win, draw: 0, loss: 0 }, false), `${n} ${k} ${win}`).toEqual(qualifyFormula(n, k, win));
        }
      }
    }
  });

  it('knows the textbook cases', () => {
    expect(qualifyFormula(6, 4, 2)).toEqual({ maxOut: 6, minSafe: 8 });
    expect(qualifyByBrute(5, 2, S310, true)).toEqual({ maxOut: 9, minSafe: 10 });
  });
});

describe('knockouts', () => {
  it('counts matches, rounds and byes the same way as playing the draw', () => {
    for (let n = 2; n <= 300; n++) {
      const f = knockoutFormula(n);
      expect(knockoutBySimulation(n), String(n)).toEqual(f);
      expect(f.matches).toBe(n - 1);
    }
    expect(knockoutFormula(20)).toEqual({ matches: 19, rounds: 5, byes: 12, firstRoundMatches: 4 });
  });

  it('finds the round two players can meet in, by bits and by halving', () => {
    for (let a = 1; a <= 64; a++) for (let b = a + 1; b <= 64; b++) expect(meetRound(a, b)).toBe(meetRoundByHalving(a, b));
    expect(roundNames(16)[meetRound(3, 6) - 1]).toBe('Semi-final');
    expect(roundNames(16)[meetRound(1, 16) - 1]).toBe('Final');
    expect(roundNames(32)).toEqual(['Round 1', 'Round 2', 'Quarter-final', 'Semi-final', 'Final']);
  });
});

describe('routes and schedules', () => {
  it('counts grid routes by adding into each junction and by walking every route', () => {
    for (let e = 1; e <= 5; e++) {
      for (let nn = 1; nn <= 4; nn++) {
        expect(gridRoutes(e, nn)).toBe(gridRoutesAll(e, nn));
        expect(gridRoutesByWalking(e, nn)).toBe(gridRoutesAll(e, nn));
        for (let x = 0; x <= e; x++) {
          for (let y = 0; y <= nn; y++) {
            if ((x === 0 && y === 0) || (x === e && y === nn)) continue;
            expect(gridRoutesByWalking(e, nn, [[x, y]])).toBe(gridRoutes(e, nn, [[x, y]]));
            expect(gridRoutesByWalking(e, nn, [], [x, y])).toBe(gridRoutesThrough(e, nn, [x, y]));
            expect(gridRoutes(e, nn, [[x, y]])).toBe(gridRoutesAll(e, nn) - gridRoutesThrough(e, nn, [x, y]));
          }
        }
      }
    }
    expect(gridRoutes(4, 3, [[2, 1]])).toBe(17);
  });

  it('counts and measures road routes the same way as listing them', () => {
    const rng = createRng(77);
    const towns = ['P', 'Q', 'R', 'S', 'T', 'U'];
    for (let trial = 0; trial < 200; trial++) {
      const roads = [];
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (rng.chance(0.45)) roads.push([towns[i], towns[j], rng.int(1, 12)]);
      expect(countRoutes(roads, 'P', 'U')).toBe(listRoutes(roads, 'P', 'U', true).length);
      const all = listRoutes(roads, 'P', 'U', false);
      expect(shortestRoute(roads, 'P', 'U')).toBe(all.length ? Math.min(...all.map((r) => r.km)) : Infinity);
    }
  });

  it('builds a fixture list as short as the lower bound', () => {
    for (let n = 2; n <= 20; n++) {
      const days = circleSchedule(n);
      expect(scheduleProblems(n, days), String(n)).toEqual([]);
      expect(days.length).toBe(minDays(n));
      expect(daysLowerBound(n)).toBe(minDays(n));
    }
    expect(scheduleProblems(4, [[[0, 1], [1, 2]], [[0, 2]]]).length).toBeGreaterThan(0);
  });
});

/* ------------------------------ generated questions ------------------------------ */

describe('generated logical-sets questions', () => {
  const each = (id, seeds, fn) => {
    const template = getTemplate(id);
    let made = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const { question } = buildInstance(template, seed);
      if (!question) continue;
      made++;
      fn(question, question.parameters);
    }
    expect(made, id).toBeGreaterThan(seeds * 0.3);
  };

  it('key the only result every points table allows', () => {
    each('ls-gen-table', 80, (q, p) => {
      const seen = new Set(solveTableByCounting({ n: 4, points: p.points, scoring: S310 }).map((r) => resultBetween(4, r, p.a, p.b)));
      expect(seen.size).toBe(1);
      const text = keyedText(q);
      const r = [...seen][0];
      expect(text).toBe(r === 'd' ? 'The match was drawn' : `${p.names[r === 'h' ? p.a : p.b]} won`);
      expect(q.options.map((o) => o.text)).toContain('Cannot be determined from the table');
      expect(q.table.rows.map((row) => Number(row[2])).sort()).toEqual([...p.points].sort());
    });
  });

  it('key the only record a points table allows', () => {
    each('ls-gen-record', 80, (q, p) => {
      const seen = new Set(solveTableByCounting({ n: 4, points: p.points, scoring: S310 }).map((r) => recordOf(4, r, p.team)[p.ask]));
      expect([...seen]).toEqual([q.answer.value]);
    });
  });

  it('name the one round two players can meet in', () => {
    each('ls-gen-meet', 150, (q, p) => {
      const right = roundNames(p.size)[meetRoundByHalving(p.a, p.b) - 1];
      expect(q.options.filter((o) => o.text === right).map((o) => o.id)).toEqual(q.correctAnswer);
    });
  });

  it('give numbers the independent methods agree with', () => {
    each('ls-gen-matches', 60, (q, p) => expect(q.answer.value).toBe(pairs(p.n).length * p.legs));
    each('ls-gen-draws', 60, (q, p) => expect(drawsByTrying(p.m, p.total, S310)).toEqual([p.draws]));
    each('ls-gen-knockout', 60, (q, p) => expect(q.answer.value).toBe(knockoutBySimulation(p.n)[p.ask]));
    each('ls-gen-qualify', 40, (q, p) => expect(q.answer.value).toBe(qualifyByBrute(p.n, p.k, { win: p.win, draw: 0, loss: 0 }, false)[p.ask]));
    each('ls-gen-grid', 60, (q, p) => expect(q.answer.value).toBe(gridRoutesByWalking(p.east, p.north, p.ask === 'avoid' ? [[p.x, p.y]] : [], p.ask === 'through' ? [p.x, p.y] : null)));
    each('ls-gen-network', 80, (q, p) => expect(q.answer.value).toBe(listRoutes(p.roads, p.towns[0], p.towns[5], true).length));
    each('ls-gen-shortest', 80, (q, p) => {
      const routes = listRoutes(p.roads, p.towns[0], p.towns[4], false);
      expect(q.answer.value).toBe(Math.min(...routes.map((r) => r.km)));
      // The route with the fewest roads is never a shortest one.
      const fewest = Math.min(...routes.map((r) => r.path.length));
      expect(routes.some((r) => r.km === q.answer.value && r.path.length === fewest)).toBe(false);
    });
    each('ls-gen-days', 60, (q, p) => expect(q.answer.value).toBe(circleSchedule(p.n).length * p.legs));
  });
});

/* ------------------------------ hand-written questions ------------------------------ */

describe('hand-written logical-sets questions', () => {
  it('print the points tables the solver was given', () => {
    for (const set of sets.filter((s) => s.table)) {
      const q = questionRepository.getById(set.id);
      const [names, points] = set.table;
      expect(q.table.rows.map((row) => row[0]).sort(), set.id).toEqual([...names].sort());
      for (const row of q.table.rows) {
        const p = points[names.indexOf(row[0])];
        expect(row[2], `${set.id} ${row[0]}`).toBe(p === null ? '?' : String(p));
      }
    }
  });

  it('offer "must be true" claims that the smudged table really leaves open', () => {
    const open = openClaims();
    expect(open.map((c) => c.text)).toEqual(['Odisha beat Punjab.', 'Punjab beat Haryana.']);
    for (const claim of open) expect(claim.someTrue, claim.text).toBe(true);
  });
});

/* ------------------------------ simulation ------------------------------ */

describe('round-robin simulation', () => {
  const sim = getSimulation('round-robin');
  const KEYS = ['cd', 'ck', 'cm', 'dk', 'dm', 'km'];

  it('counts the result sets that give its table by the pruned search too', () => {
    const rng = createRng(5);
    for (let trial = 0; trial < 60; trial++) {
      const scoring = rng.pick(['2-1-0', '3-1-0']);
      const results = KEYS.map(() => rng.pick(['h', 'd', 'a']));
      const { result } = run(sim, { ...initialValues(sim), scoring, ...Object.fromEntries(KEYS.map((k, i) => [k, results[i]])) });
      const n = result.numbers;
      expect(n.points).toEqual(pointsOf(4, results, SCORINGS[scoring]));
      expect(n.count).toBe(solveTable({ n: 4, points: n.points, scoring: SCORINGS[scoring] }).length);
      expect(n.points.reduce((s, p) => s + p, 0)).toBe(n.total);
      expect(result.plot.matches.reduce((s, m) => s + m.given, 0)).toBe(n.total);
      // The crosstable reads each match from both sides.
      for (let t = 0; t < 4; t++) for (let u = 0; u < 4; u++) if (t !== u) expect(`${result.plot.grid[t][u]}${result.plot.grid[u][t]}`).toMatch(/^(WL|LW|DD)$/);
    }
  });

  it('starts from a table only one set of results gives', () => {
    const { result } = run(sim, initialValues(sim));
    expect(result.numbers.points).toEqual([6, 4, 2, 0]);
    expect(result.numbers.count).toBe(1);
  });
});
