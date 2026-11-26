/**
 * Series, analogy and classification (reasoning-series): the solvers in
 * src/utils/reasoning/series.js held to textbook results and to their second,
 * independently written methods; the generated questions checked so that no
 * wrong option is also right by the independent method; and the alphabet-strip
 * simulation held to the solver.
 */

import { describe, it, expect } from 'vitest';

import { createRng } from '../src/generators/core.js';
import { getTemplate } from '../src/generators/index.js';
import { buildInstance } from '../src/generators/engine.js';
import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { codesFor } from '../src/utils/reasoning/coding.js';
import {
  ALPHABET,
  ANALOGY_RULES,
  NUMBER_PROPERTIES,
  analogyAnswers,
  analogyByResidue,
  buildSeries,
  countPattern,
  countPatternByRegex,
  diffCascade,
  elementAt,
  elementAtWalk,
  fillPatternBrute,
  fillPatternByClasses,
  gapSignature,
  groupProperties,
  letter,
  letterFrom,
  letterFromWalk,
  letterPairs,
  letterPairsByCounting,
  nextTerms,
  nextTermsOfParts,
  nextTermOfPartsByCascade,
  oddBySignature,
  oddOnesByRules,
  oppositeLetter,
  pairProperties,
  parseTerm,
  pos,
  relativeLetter,
  relativeLetterWalk,
  reversePos,
  seriesRules
} from '../src/utils/reasoning/series.js';

const P = (w) => [...w].map(pos);

/* ------------------------------ letter positions ------------------------------ */

describe('letter positions', () => {
  it('follows the textbook conventions', () => {
    expect(['E', 'J', 'O', 'T', 'Y'].map(pos)).toEqual([5, 10, 15, 20, 25]);
    expect(reversePos(pos('R'))).toBe(9);
    expect(oppositeLetter('A')).toBe('Z');
    expect(oppositeLetter('M')).toBe('N');
    expect(letterFrom(19, 'right')).toBe('H');
    expect(relativeLetter({ k: 19, end: 'right', m: 7, dir: 'left' })).toBe('A');
    expect(relativeLetter({ k: 3, end: 'left', m: 5, dir: 'left' })).toBeNull();
  });

  it('agrees with walking along the alphabet for every count, end and direction', () => {
    for (let k = 1; k <= 26; k++) {
      for (const end of ['left', 'right']) {
        expect(letterFrom(k, end)).toBe(letterFromWalk(k, end));
        for (let m = 0; m <= 26; m++) for (const dir of ['left', 'right']) expect(relativeLetter({ k, end, m, dir })).toBe(relativeLetterWalk({ k, end, m, dir }));
      }
    }
  });

  it('counts letter pairs in a word the same two ways', () => {
    expect(letterPairs('KITCHEN')).toEqual(['IE', 'IN', 'CE']);
    expect(letterPairs('MONKEY')).toEqual(['ON']);
    const rng = createRng(11);
    for (let i = 0; i < 500; i++) {
      const word = Array.from({ length: rng.int(3, 10) }, () => rng.pick([...ALPHABET])).join('');
      expect(letterPairs(word).length, word).toBe(letterPairsByCounting(word));
    }
  });
});

/* ------------------------------ series ------------------------------ */

/** A random series of a random kind, kept inside 1..26. */
function randomSeries(rng) {
  const kind = rng.pick(['add', 'grow', 'alt', 'interleave', 'times']);
  const rule =
    kind === 'add'
      ? { kind, d: rng.int(-6, 6) }
      : kind === 'grow'
        ? { kind, s: rng.pick([-2, -1, 1, 2]) }
        : kind === 'alt'
          ? { kind, d1: rng.int(-5, 5), d2: rng.int(-5, 5) }
          : kind === 'interleave'
            ? { kind, p: rng.int(-4, 4), q: rng.int(-4, 4) }
            : { kind, r: 2 };
  const n = rng.int(4, 7);
  const start = [rng.int(1, 26), rng.int(1, 26)];
  const t = buildSeries(rule, start, n);
  return t && t.every((x) => x >= 1 && x <= 26) ? t : null;
}

describe('letter series', () => {
  it('continues the textbook series', () => {
    expect(nextTerms(P('CFIL')).map(letter)).toEqual(['O']);
    expect(nextTerms(P('BCEHL')).map(letter)).toEqual(['Q']);
    expect(nextTerms(P('AZCXE')).map(letter)).toEqual(['V']);
    expect(nextTerms(P('ABDH')).map(letter)).toEqual(['P']);
    // Four terms are always two interleaved pairs, so a growing series needs its 4th term to be believed.
    expect(nextTerms([1, 3, 6])).not.toHaveLength(1);
    expect(nextTerms([1, 3, 6, 10])).toEqual([15]);
  });

  it('finds the same next term by trying every rule and by reading the differences', () => {
    const rng = createRng(7);
    let unique = 0;
    for (let i = 0; i < 3000; i++) {
      const t = randomSeries(rng);
      if (!t) continue;
      const nexts = nextTerms(t);
      const cascade = diffCascade(t);
      if (nexts.length === 1) {
        unique++;
        expect(cascade?.next, t.join(',')).toBe(nexts[0]);
      }
      // Whatever the differences read, some rule in the family continues the same way.
      if (cascade) expect(nexts, t.join(',')).toContain(cascade.next);
    }
    expect(unique).toBeGreaterThan(500);
  });

  it('continues groups and alphanumeric terms place by place, the same two ways', () => {
    expect(nextTermsOfParts(['AZ', 'BY', 'CX'])).toEqual(['DW']);
    expect(nextTermsOfParts(['B2', 'E5', 'H8', 'K11'])).toEqual(['N14']);
    expect(nextTermsOfParts(['2B', '5E', '10H', '17K'])).toEqual(['26N']);
    expect(parseTerm('B12')).toEqual([{ type: 'L', value: 2 }, { type: 'N', value: 12 }]);
    const rng = createRng(3);
    for (let i = 0; i < 1000; i++) {
      const cols = [randomSeries(rng), randomSeries(rng)];
      if (cols.some((c) => !c)) continue;
      const n = Math.min(cols[0].length, cols[1].length);
      const terms = Array.from({ length: n }, (_, j) => `${letter(cols[0][j])}${cols[1][j]}`);
      const all = nextTermsOfParts(terms);
      if (all.length === 1) expect(nextTermOfPartsByCascade(terms), terms.join(',')).toBe(all[0]);
    }
  });

  it('fills repeating patterns by trying every filling and by the places of the block', () => {
    expect(fillPatternBrute('abcabc_bc_bc')).toEqual(['aa']);
    expect(fillPatternByClasses('abcabc_bc_bc')).toEqual(['aa']);
    const rng = createRng(5);
    let checked = 0;
    for (let i = 0; i < 1500; i++) {
      const L = rng.int(2, 5);
      const block = Array.from({ length: L }, () => rng.pick(['a', 'b', 'c'])).join('');
      const full = block.repeat(rng.int(2, 4));
      const pattern = [...full].map((c) => (rng.chance(0.3) ? '_' : c)).join('');
      if (!pattern.includes('_')) continue;
      const brute = fillPatternBrute(pattern);
      // (A place of the block that is blank in every copy can only be guessed: the block method leaves it.)
      if (brute.length === 1 && fillPatternByClasses(pattern).length) {
        checked++;
        expect(fillPatternByClasses(pattern), pattern).toEqual(brute);
      }
      // A filling the block method finds always makes the series repeat.
      for (const fill of fillPatternByClasses(pattern)) {
        if ([...fill].every((ch) => pattern.includes(ch))) expect(brute, pattern).toContain(fill);
      }
    }
    expect(checked).toBeGreaterThan(200);
  });
});

/* ------------------------------ mixed sequences ------------------------------ */

describe('mixed sequences', () => {
  const rng = createRng(9);
  const seqs = Array.from({ length: 40 }, () => Array.from({ length: rng.int(8, 20) }, () => rng.pick(['A', 'K', 'R', '3', '7', '9', '@', '#', '%'])));

  it('finds an element by arithmetic and by walking', () => {
    for (const seq of seqs) {
      for (let k = 1; k <= seq.length; k++) for (const end of ['left', 'right']) for (let m = 0; m <= 6; m++) for (const dir of ['left', 'right']) {
        expect(elementAt(seq, { k, end, m, dir })).toBe(elementAtWalk(seq, { k, end, m, dir }));
      }
    }
  });

  it('counts neighbour patterns by scanning and by a regular expression', () => {
    const kinds = [null, 'L', 'N', 'S'];
    for (const seq of seqs) {
      for (const before of kinds) for (const mid of ['L', 'N', 'S']) for (const after of kinds) {
        expect(countPattern(seq, { before, mid, after })).toBe(countPatternByRegex(seq, { before, mid, after }));
      }
    }
  });
});

/* ------------------------------ analogy and odd one out ------------------------------ */

describe('analogy and classification', () => {
  it('answers number analogies the same way from the rule list and from residues', () => {
    expect(analogyAnswers(8, 64, 5)).toEqual([25]);
    expect(analogyAnswers(3, 28, 4)).toEqual([65]);
    for (const rule of ANALOGY_RULES) {
      for (let a = 2; a <= 12; a++) for (let c = 2; c <= 12; c++) {
        const b = rule.f(a);
        expect(analogyAnswers(a, b, c).sort((x, y) => x - y), `${rule.id} ${a} ${c}`).toEqual(analogyByResidue(a, b, c).sort((x, y) => x - y));
      }
    }
  });

  it('finds the odd one out by properties and by signatures', () => {
    const groups = ['BDF', 'LNP', 'PRT', 'GJL'];
    expect(oddOnesByRules(groups, groupProperties(groups))).toEqual([3]);
    expect(oddBySignature(groups, gapSignature)).toBe(3);
    expect(oddOnesByRules([27, 64, 100, 125], NUMBER_PROPERTIES)).toEqual([2]);
    expect(oddOnesByRules([[4, 18], [6, 38], [8, 66], [5, 25]], pairProperties())).toEqual([3]);
    // Whenever the properties single one group out by its gaps, the signature agrees.
    const rng = createRng(4);
    for (let i = 0; i < 400; i++) {
      const g = [rng.int(1, 4), rng.int(1, 4)];
      const make = (gaps) => {
        const s = rng.int(1, 16);
        return [s, s + gaps[0], s + gaps[0] + gaps[1]].map(letter).join('');
      };
      const items = rng.shuffle([make(g), make(g), make(g), make([g[0] + 1, g[1]])]);
      const odd = oddOnesByRules(items, groupProperties(items));
      if (odd.length === 1 && new Set(items).size === 4) expect(oddBySignature(items, gapSignature)).toBe(odd[0]);
    }
  });
});

/* ------------------------------ generated questions ------------------------------ */

const keyedText = (q) => q.options.find((o) => o.id === q.correctAnswer[0]).text;
const accepted = (q, fits) => q.options.filter((o) => fits(o.text)).map((o) => o.text);

/** Is this pattern, with the blanks filled in order, a repeated block? */
function repeats(pattern, fill) {
  let j = 0;
  const s = [...pattern].map((c) => (c === '_' ? fill[j++] : c)).join('');
  for (let L = 2; L <= s.length / 2; L++) if ([...s].every((c, i) => i < L || c === s[i - L])) return true;
  return false;
}

/** Can every place of the series be continued to this term by some rule in the family? */
const partsFit = (terms, text) => {
  const all = [...terms, text].map(parseTerm);
  if (all.at(-1).length !== all[0].length) return false;
  return all[0].every((_, k) => seriesRules(all.map((t) => t[k].value)).length > 0);
};

const INDEPENDENT = {
  'rs-gen-position': (p) => (t) => relativeLetterWalk(p) === t,
  'rs-gen-letter-step': (p) => (t) => seriesRules([...p.terms, pos(t)]).length > 0,
  'rs-gen-letter-pattern': (p) => (t) => seriesRules([...p.terms, pos(t)]).length > 0,
  'rs-gen-group-next': (p) => (t) => partsFit(p.groups, t),
  'rs-gen-pattern-blanks': (p) => (t) => repeats(p.pattern, t),
  'rs-gen-alnum-next': (p) => (t) => partsFit(p.terms, t),
  'rs-gen-alnum-position': (p) => (t) => elementAtWalk(p.seq, p) === t,
  'rs-gen-number-analogy': (p) => (t) => ANALOGY_RULES.some((r) => r.f(p.a) === p.b && r.f(p.c) === Number(t)),
  'rs-gen-letter-analogy': (p) => (t) => codesFor({ word: p.word, code: p.code }, p.target).includes(t),
  'rs-gen-odd-group': (p) => (t) => oddOnesByRules(p.items, groupProperties(p.items)).map((i) => p.items[i]).includes(t),
  'rs-gen-odd-number': (p) => (t) => oddOnesByRules(p.items, NUMBER_PROPERTIES).map((i) => String(p.items[i])).includes(t),
  'rs-gen-odd-pair': (p) => {
    const pairs = p.items.map((s) => s.split(' : ').map(Number));
    return (t) => oddOnesByRules(pairs, pairProperties()).map((i) => p.items[i]).includes(t);
  }
};

describe('generated series questions', () => {
  it('never offer a wrong option that the independent method also accepts', () => {
    for (const [id, check] of Object.entries(INDEPENDENT)) {
      const template = getTemplate(id);
      let made = 0;
      for (let seed = 1; seed <= 150; seed++) {
        const { question } = buildInstance(template, seed);
        if (!question) continue;
        made++;
        expect(accepted(question, check(question.parameters)), `${id} seed ${seed}`).toEqual([keyedText(question)]);
      }
      expect(made, id).toBeGreaterThan(30);
    }
  });

  it('count letter pairs and neighbour patterns the same way as the second method', () => {
    for (const id of ['rs-gen-pairs', 'rs-gen-alnum-count']) {
      const template = getTemplate(id);
      for (let seed = 1; seed <= 150; seed++) {
        const { question } = buildInstance(template, seed);
        if (!question) continue;
        const p = question.parameters;
        const second = id === 'rs-gen-pairs' ? letterPairsByCounting(p.word) : countPatternByRegex(p.seq, p);
        expect(question.answer.value).toBe(second);
      }
    }
  });
});

/* ------------------------------ simulation ------------------------------ */

describe('alphabet-strip', () => {
  const sim = getSimulation('alphabet-strip');
  const result = (values) => run(sim, { ...initialValues(sim), ...values }).result;

  it('marks every preset series and its next letter as the solver gives them', () => {
    for (const { id } of sim.controls.find((c) => c.id === 'series').options) {
      const r = result({ series: id, shown: 6 });
      const given = r.numbers.positions.slice(0, -1);
      expect(r.numbers.revealed).toBe(true);
      expect(nextTerms(given)).toEqual([pos(r.numbers.answer)]);
      expect(diffCascade(given).next).toBe(pos(r.numbers.answer));
      expect(r.plot.terms.every((t) => t.state !== 'hidden')).toBe(true);
      expect(r.plot.terms.at(-1).state).toBe('answer');
    }
  });

  it('turns every gap round when counting from Z, and hides the next letter until it is marked', () => {
    for (let shown = 2; shown <= 6; shown++) {
      const from = result({ series: 's3', shown, reverse: 'off' });
      const back = result({ series: 's3', shown, reverse: 'on' });
      expect(back.plot.gaps).toEqual(from.plot.gaps.map((g) => -g));
      expect(back.plot.terms.map((t) => t.value)).toEqual(from.plot.terms.map((t) => 27 - t.value));
      expect(from.plot.terms.filter((t) => t.state !== 'hidden')).toHaveLength(Math.min(shown, 6));
    }
    expect(result({ series: 's2', shown: 5 }).readouts.at(-1).value).toBe('?');
  });
});
