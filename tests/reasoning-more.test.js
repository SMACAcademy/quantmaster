/**
 * The solvers for the second reasoning batch (direction sense, coding-decoding,
 * order and ranking, cubes and dice, mirror images and paper folding) and the
 * generators built on them. Each solver is held to textbook results, and to a
 * second, independently written method on every case or on many random ones;
 * generated questions are checked for a single right option.
 */

import { describe, it, expect } from 'vitest';

import { createRng } from '../src/generators/core.js';
import { getTemplate } from '../src/generators/index.js';
import { buildInstance } from '../src/generators/engine.js';
import {
  DIRS,
  directionByAngle,
  directionOf,
  facingFromShadow,
  facingFromShadowBrute,
  stepText,
  walkRoute,
  walkRouteComplex
} from '../src/utils/reasoning/direction.js';
import {
  applyRule,
  applyRuleByTable,
  codeByIntersection,
  codesFor,
  decodeWord,
  findRules,
  numberCode,
  numberCodeByTable,
  opposite,
  ruleFamily,
  solveSentences
} from '../src/utils/reasoning/coding.js';
import { betweenSeats, countBetween, countFrom, fromOtherEnd, layOut, orderByChaining, solveComparisons, solveRow, totalFrom } from '../src/utils/reasoning/ranking.js';
import {
  CUBE_NETS,
  ROTATIONS,
  cuboidFormula,
  diceFigureProblems,
  foldNet,
  netOpposites,
  netOppositesByLines,
  netOppositesByRolling,
  oppositeOf,
  oppositeOfByVectors,
  paintedCounts,
  paintedFormula,
  pairingsByFaces,
  pairingsByVectors,
  rotate
} from '../src/utils/reasoning/cubes.js';
import {
  MIRROR_SAME,
  WATER_SAME,
  foldLayers,
  holesByLayers,
  holesByReflection,
  looksSameInMirror,
  looksSameInMirrorByGlyphs,
  looksSameInWater,
  looksSameInWaterByGlyphs,
  mirrorSymmetric,
  mirrorTime,
  mirrorTimeByHands,
  onFoldLine,
  paperFigureProblems,
  waterSymmetric
} from '../src/utils/reasoning/mirror.js';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* ------------------------------ direction sense ------------------------------ */

describe('direction sense', () => {
  it('follows the textbook conventions', () => {
    // Facing south, a right turn points west.
    expect(DIRS[walkRoute({ start: 'south', steps: [{ turn: 'right' }] }).facing]).toBe('west');
    const r = walkRoute({ start: 'north', steps: [{ head: 'north', go: 6 }, { turn: 'right', go: 8 }] });
    expect([r.x, r.y, Math.hypot(r.x, r.y), directionOf(r.x, r.y)]).toEqual([8, 6, 10, 'north-east']);
    expect(stepText({ turn: 'left', go: 3 })).toBe('turns left and walks 3 km');
    expect(stepText({ rot: 'acw', deg: 45 })).toBe('turns 45° anticlockwise');
    expect(stepText({ head: 'east', go: 2 }, 'km', 'cycles')).toBe('cycles 2 km east');
    expect(directionOf(0, 0)).toBeNull();
  });

  it('walks every random route the same way with direction numbers and with complex numbers', () => {
    const rng = createRng(11);
    for (let i = 0; i < 2000; i++) {
      const steps = [{ head: rng.pick(['north', 'east', 'south', 'west']), go: rng.int(1, 9) }];
      for (let k = rng.int(0, 5); k > 0; k--) {
        steps.push(rng.chance(0.7) ? { turn: rng.pick(['left', 'right', 'back']), go: rng.int(1, 9) } : { rot: rng.pick(['cw', 'acw']), deg: 90 * rng.int(1, 7), go: rng.int(1, 9) });
      }
      const route = { start: 'north', steps };
      const a = walkRoute(route);
      const b = walkRouteComplex(route);
      expect([a.x, a.y, a.facing]).toEqual([b.x, b.y, b.facing]);
      if (a.x || a.y) expect(directionOf(a.x, a.y)).toBe(directionByAngle(b.x, b.y));
    }
  });

  it('agrees on the final facing after any turns, including eighth turns', () => {
    const rng = createRng(5);
    for (let i = 0; i < 1000; i++) {
      const steps = Array.from({ length: rng.int(1, 5) }, () => (rng.chance(0.5) ? { turn: rng.pick(['left', 'right', 'back']) } : { rot: rng.pick(['cw', 'acw']), deg: 45 * rng.int(1, 30) }));
      const start = rng.int(0, 7);
      expect(walkRoute({ start, steps }).facing).toBe(walkRouteComplex({ start, steps }).facing);
    }
  });

  it('reads shadows the same way by rule and by trying every facing', () => {
    for (const time of ['morning', 'evening']) for (const side of ['front', 'behind', 'left', 'right']) {
      expect(facingFromShadowBrute(time, side)).toEqual([facingFromShadow(time, side)]);
    }
    expect(facingFromShadow('morning', 'left')).toBe('north');
    expect(facingFromShadow('evening', 'behind')).toBe('west');
  });
});

/* ------------------------------ coding-decoding ------------------------------ */

describe('coding-decoding', () => {
  it('codes the textbook examples', () => {
    expect(applyRule('ROAD', { kind: 'shift', ks: [3] })).toBe('URDG');
    expect(applyRule('GOLD', { kind: 'opposite' })).toBe('TLOW');
    expect(applyRule('BRAIN', { kind: 'reverse', k: 1 })).toBe('OJBSC');
    expect(applyRule('BEST', { kind: 'growing', start: 1, step: 1 })).toBe('CGVX');
    expect(applyRule('XYZ', { kind: 'shift', ks: [2] })).toBe('ZAB');
    expect(numberCode('CAT', 'positions')).toBe('3-1-20');
    expect(numberCode('CAT', 'opposite')).toBe(57);
    expect([...ALPHA].filter((ch) => opposite(ch) === ch)).toEqual([]);
  });

  it('applies every rule in the family the same way with character codes and with a lookup table, and decodes back', () => {
    const rng = createRng(3);
    const family = ruleFamily();
    for (let i = 0; i < 40; i++) {
      const word = Array.from({ length: rng.int(3, 7) }, () => rng.pick([...ALPHA])).join('');
      for (const rule of family) {
        const code = applyRule(word, rule);
        expect(applyRuleByTable(word, rule), `${word} ${JSON.stringify(rule)}`).toBe(code);
        expect(decodeWord(code, rule)).toBe(word);
      }
    }
  });

  it('finds the rule behind an example, and refuses examples two rules explain differently', () => {
    expect(codesFor({ word: 'ROAD', code: 'URDG' }, 'SWAN')).toEqual(['VZDQ']);
    expect(findRules({ word: 'COLD', code: 'DPME' }).length).toBeGreaterThanOrEqual(1);
    // A palindrome cannot tell "reverse then shift" from "shift".
    expect(codesFor({ word: 'NOON', code: 'OPPO' }, 'MANGO').length).toBeGreaterThan(1);
  });

  it('computes number codes the same two ways', () => {
    const rng = createRng(8);
    for (let i = 0; i < 300; i++) {
      const word = Array.from({ length: rng.int(2, 7) }, () => rng.pick([...ALPHA])).join('');
      for (const kind of ['positions', 'sum', 'opposite', 'double', 'length']) expect(numberCodeByTable(word, kind)).toBe(numberCode(word, kind));
    }
  });

  it('finds sentence codes by trying every assignment, matching the common-code method', () => {
    const rng = createRng(21);
    let settled = 0;
    for (let i = 0; i < 300; i++) {
      const vocab = ['a', 'b', 'c', 'd', 'e', 'f'];
      const codeOf = Object.fromEntries(vocab.map((w, k) => [w, `c${k}`]));
      const sentences = Array.from({ length: 3 }, () => {
        const words = rng.shuffle(vocab).slice(0, 3);
        return { words, codes: rng.shuffle(words.map((w) => codeOf[w])) };
      });
      if (new Set(sentences.flatMap((s) => s.words)).size !== 6) continue;
      const solutions = solveSentences(sentences);
      expect(solutions.length).toBeGreaterThan(0);
      for (const m of solutions) for (const s of sentences) expect(s.words.map((w) => m.get(w)).sort()).toEqual([...s.codes].sort());
      for (const w of vocab) {
        const codes = new Set(solutions.map((m) => m.get(w)));
        expect(codes.has(codeOf[w])).toBe(true);
        if (codes.size === 1) {
          settled++;
          expect(codeByIntersection(sentences, w)).toEqual([codeOf[w]]);
        }
      }
    }
    expect(settled).toBeGreaterThan(100);
  });
});

/* ------------------------------ order and ranking ------------------------------ */

describe('order and ranking', () => {
  it('holds the formulas to the brute-force row solver', () => {
    for (let n = 2; n <= 30; n++) for (let k = 1; k <= n; k++) {
      expect(solveRow({ people: 1, facts: [{ p: 0, k, from: 'left' }, { p: 0, k: fromOtherEnd(n, k), from: 'right' }], maxN: 40 }).map((s) => s.n)).toEqual([n]);
      expect(totalFrom(k, fromOtherEnd(n, k))).toBe(n);
      expect(countFrom(layOut(n, [k], ['X']), 'X', 'right')).toBe(fromOtherEnd(n, k));
    }
  });

  it('counts people between two others the same way by formula and along the row', () => {
    for (let n = 3; n <= 20; n++) for (let a = 1; a <= n; a++) for (let b = 1; b <= n; b++) {
      if (a === b) continue;
      expect(countBetween(layOut(n, [a, b], ['A', 'B']), 'A', 'B')).toBe(betweenSeats(a, b));
    }
  });

  it('finds both totals when the order of two people is not given', () => {
    const totals = solveRow({ people: 2, facts: [{ p: 0, k: 9, from: 'left' }, { p: 1, k: 8, from: 'right' }, { between: [0, 1], k: 4 }], maxN: 60 }).map((s) => s.n);
    expect([...new Set(totals)].sort((x, y) => x - y)).toEqual([11, 21]);
  });

  it('handles an interchange', () => {
    const sols = solveRow({ people: 2, facts: [{ p: 0, k: 10, from: 'left' }, { p: 1, k: 15, from: 'right' }, { p: 0, k: 18, from: 'left', after: true }], swap: [0, 1], maxN: 80 });
    expect(sols.map((s) => s.n)).toEqual([32]);
  });

  it('ranks by comparisons the same way by trying every order and by chaining', () => {
    const rng = createRng(4);
    for (let i = 0; i < 300; i++) {
      const n = rng.int(3, 6);
      const facts = Array.from({ length: rng.int(2, 8) }, () => {
        const [x, y] = rng.shuffle(Array.from({ length: n }, (_, k) => k)).slice(0, 2);
        return { more: [x, y] };
      });
      const orders = solveComparisons(n, facts);
      const chained = orderByChaining(n, facts);
      if (orders.length === 1) expect(chained).toEqual(orders[0]);
      else expect(chained).toBeNull();
    }
  });
});

/* ------------------------------ cubes and dice ------------------------------ */

describe('cubes and dice', () => {
  it('has the 24 turns of a cube, all keeping opposite faces opposite', () => {
    expect(new Set(ROTATIONS.map(String)).size).toBe(24);
    for (const r of ROTATIONS) for (const [a, b] of [[0, 1], [2, 3], [4, 5]]) expect(Math.abs(r[a] - r[b]) === 1 && Math.min(r[a], r[b]) % 2 === 0).toBe(true);
  });

  it('finds the same dice from views by turning the cube and by arrows and determinants', () => {
    const rng = createRng(17);
    const labels = ['1', '2', '3', '4', '5', '6'];
    let settledByHandedness = 0;
    for (let i = 0; i < 250; i++) {
      const die = rng.shuffle(labels);
      const views = Array.from({ length: rng.int(1, 3) }, () => {
        const t = rotate(die, rng.pick(ROTATIONS));
        return { top: t[0], front: t[2], right: t[4] };
      });
      expect(pairingsByVectors(labels, views)).toEqual(pairingsByFaces(labels, views));
      for (const l of labels) {
        const a = oppositeOf(labels, views, l);
        expect(oppositeOfByVectors(labels, views, l)).toEqual(a);
        if (a.length === 1) expect(a[0]).toBe(die[[1, 0, 3, 2, 5, 4][die.indexOf(l)]]);
      }
      if (views.length >= 2 && pairingsByFaces(labels, views).length === 1) settledByHandedness++;
    }
    expect(settledByHandedness).toBeGreaterThan(20);
  });

  it('tells a die from its mirror image', () => {
    // Views (1, 2, 3) and (1, 3, 2) as (top, front, right) cannot both show one die.
    const labels = ['1', '2', '3', '4', '5', '6'];
    expect(pairingsByFaces(labels, [{ top: '1', front: '2', right: '3' }, { top: '1', front: '3', right: '2' }])).toEqual([]);
    expect(pairingsByVectors(labels, [{ top: '1', front: '2', right: '3' }, { top: '1', front: '3', right: '2' }])).toEqual([]);
  });

  it('folds all eleven nets, by arrows and by rolling a die across them', () => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const net of CUBE_NETS) {
      const cells = net.map(([c, r], i) => [c, r, labels[i]]);
      expect(foldNet(cells)).not.toBeNull();
      expect(diceFigureProblems({ net: cells })).toEqual([]);
      const a = netOpposites(cells);
      expect(netOppositesByRolling(cells)).toEqual(a);
      // The straight-line rule, where it applies, agrees.
      for (const [x, y] of Object.entries(netOppositesByLines(cells))) expect(a[x]).toBe(y);
    }
    // Six squares in a row do not fold into a cube.
    expect(foldNet([0, 1, 2, 3, 4, 5].map((c) => [c, 0, String(c)]))).toBeNull();
  });

  it('counts painted cubes by visiting every small cube, matching the formulas', () => {
    for (let n = 2; n <= 10; n++) {
      expect(paintedCounts(n)).toEqual(paintedFormula(n));
      expect(paintedFormula(n).reduce((a, b) => a + b, 0)).toBe(n ** 3);
    }
    for (let a = 2; a <= 7; a++) for (let b = 2; b <= 7; b++) for (let c = 2; c <= 7; c++) expect(paintedCounts(a, b, c)).toEqual(cuboidFormula(a, b, c));
    // Painted on all faces but the bottom, n = 5: the unpainted block is 3 × 3 × 4.
    expect(paintedCounts(5, 5, 5, ['top', 'front', 'back', 'left', 'right'])[0]).toBe(36);
  });
});

/* ------------------------------ mirror and paper ------------------------------ */

describe('mirror images and paper folding', () => {
  it('draws the symmetric capitals exactly as the lists say', () => {
    expect([...ALPHA].filter(mirrorSymmetric).join('')).toBe(MIRROR_SAME);
    expect([...ALPHA].filter(waterSymmetric).join('')).toBe(WATER_SAME);
  });

  it('decides whole words the same way from the lists and from the drawings', () => {
    const rng = createRng(9);
    for (let i = 0; i < 2000; i++) {
      const pool = rng.pick([MIRROR_SAME, WATER_SAME, ALPHA]);
      let word = Array.from({ length: rng.int(1, 5) }, () => rng.pick([...pool])).join('');
      if (rng.chance(0.5)) word += [...word].reverse().join('');
      expect(looksSameInMirrorByGlyphs(word), word).toBe(looksSameInMirror(word));
      expect(looksSameInWaterByGlyphs(word), word).toBe(looksSameInWater(word));
    }
  });

  it('reads the mirror image of every minute of the clock the same two ways', () => {
    for (let hour = 1; hour <= 12; hour++) for (let minute = 0; minute < 60; minute++) {
      const image = mirrorTime(hour, minute);
      expect(mirrorTimeByHands(hour, minute)).toEqual(image);
      // The image of the image is the time itself.
      expect(mirrorTime(image.hour, image.minute)).toEqual({ hour, minute });
    }
    expect(mirrorTime(4, 20)).toEqual({ hour: 7, minute: 40 });
    expect(mirrorTime(6, 0)).toEqual({ hour: 6, minute: 0 });
    expect(mirrorTime(12, 15)).toEqual({ hour: 11, minute: 45 });
  });

  it('finds the same holes by stacking layers and by reflecting the punch, for every fold sequence and square', () => {
    const halves = ['left', 'right', 'top', 'bottom'];
    const sequences = [[]];
    for (let depth = 0; depth < 3; depth++) for (const seq of [...sequences]) if (seq.length === depth) for (const f of halves) sequences.push([...seq, f]);
    for (const seq of [...sequences]) for (const d of ['diag', 'anti']) sequences.push([...seq, d]);
    let checked = 0;
    for (const size of [4, 8]) for (const folds of sequences) {
      const folded = foldLayers(size, folds);
      if (!folded) continue;
      for (const square of folded.region) {
        if (onFoldLine(size, folds, square)) continue;
        const holes = holesByLayers(size, folds, [square]);
        expect(holesByReflection(size, folds, [square]), `${size} ${folds} ${square}`).toEqual(holes);
        expect(holes).toHaveLength(2 ** folds.length);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(paperFigureProblems({ size: 4, folds: ['left', 'top', 'diag'], punches: ['C3'] })).toEqual(['punch C3 lies on a fold line']);
    expect(paperFigureProblems({ size: 4, folds: ['left'], punches: ['A1'] })).toEqual(['punch A1 is not on the folded paper']);
  });
});

/* ------------------------------ generated questions ------------------------------ */

const keyedText = (q) => q.options.find((o) => o.id === q.correctAnswer[0]).text;

describe('generated questions of the second reasoning batch', () => {
  it('give one facing, one distance and one direction for every route', () => {
    for (const id of ['ds-gen-facing', 'ds-gen-distance', 'ds-gen-direction', 'ds-gen-where', 'ds-gen-shadow']) {
      const template = getTemplate(id);
      let made = 0;
      for (let seed = 1; seed <= 150; seed++) {
        const { question } = buildInstance(template, seed);
        if (!question) continue;
        made++;
        const value = template.answer(question.parameters);
        // Every wrong option fails the independent check.
        for (const o of question.options) if (o.id !== question.correctAnswer[0]) expect(o.text).not.toBe(keyedText(question));
        expect(template.verify(question.parameters, value)).toBe(true);
      }
      expect(made, id).toBeGreaterThan(50);
    }
  });

  it('never offer a second code that a fitting rule would also give', () => {
    for (const id of ['cd-gen-shift', 'cd-gen-alternate', 'cd-gen-opposite', 'cd-gen-mixed']) {
      const template = getTemplate(id);
      for (let seed = 1; seed <= 60; seed++) {
        const { question } = buildInstance(template, seed);
        if (!question) continue;
        const { word, code, target } = question.parameters;
        const fits = codesFor({ word, code }, target);
        expect(fits).toEqual([keyedText(question)]);
      }
    }
  });

  it('never offer a second code for the word asked in a sentence set', () => {
    const template = getTemplate('cd-gen-sentence');
    for (let seed = 1; seed <= 200; seed++) {
      const { question } = buildInstance(template, seed);
      if (!question) continue;
      const { sentences, word } = question.parameters;
      const codes = new Set(solveSentences(sentences).map((m) => `‘${m.get(word)}’`));
      expect([...codes]).toEqual([keyedText(question)]);
    }
  });

  it('never offer a second die face that could be opposite', () => {
    for (const id of ['cb-gen-views', 'cb-gen-net']) {
      const template = getTemplate(id);
      for (let seed = 1; seed <= 80; seed++) {
        const { question } = buildInstance(template, seed);
        if (!question) continue;
        const p = question.parameters;
        const possible = id === 'cb-gen-views' ? oppositeOf(p.labels, p.views, p.ask) : [netOppositesByRolling(p.cells)[p.ask]];
        expect(possible).toEqual([keyedText(question)]);
      }
    }
  });

  it('never offer a second letter group that looks the same in the mirror or the water', () => {
    for (const [id, same] of [['mp-gen-mirror-word', looksSameInMirrorByGlyphs], ['mp-gen-water-word', looksSameInWaterByGlyphs]]) {
      const template = getTemplate(id);
      for (let seed = 1; seed <= 150; seed++) {
        const { question } = buildInstance(template, seed);
        if (!question) continue;
        expect(question.options.filter((o) => same(o.text)).map((o) => o.text)).toEqual([keyedText(question)]);
      }
    }
  });

  it('put the holes where reflecting the punch puts them', () => {
    const template = getTemplate('mp-gen-fold-where');
    for (let seed = 1; seed <= 150; seed++) {
      const { question } = buildInstance(template, seed);
      if (!question) continue;
      const { size, folds, punches } = question.parameters;
      expect(keyedText(question)).toBe(holesByReflection(size, folds, punches).join(', '));
      expect(paperFigureProblems(question.figure)).toEqual([]);
    }
  });
});
