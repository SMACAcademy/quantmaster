/**
 * Data-sufficiency templates for reasoning: arrangements (a row, floors, days,
 * a circle), rankings, yes/no comparisons, family relations and walks.
 *
 * Each template hides one true "world" (a seating, an order, a family, a walk),
 * collects facts that are true in it, and deals out a little base information
 * and two statements. Statements are true in the hidden world, so no
 * combination is a contradiction. The answer choice comes from brute force over
 * every world (utils/reasoning/sufficiency.js, first method); `verify` works the
 * choice out again by the second, independent method (the geometric seating
 * reader, chains of comparisons, the path reading of the family, the
 * complex-number walker), which must agree with the first on every combination.
 *
 * A template first picks which of the five choices it is aiming for, so every
 * choice comes up about equally often, then deals statements until it gets it.
 */

import {
  DS_CHOICES,
  DS_LETTERS,
  arrangementAskText,
  arrangementClueText,
  arrangementValueText,
  checkedChoice,
  comparisonText,
  consistent,
  directionFactText,
  rankingAskText,
  relationPhrase,
  settled,
  solveBothWays,
  verdict
} from '../../utils/reasoning/sufficiency.js';
import { clueHolds, ordinal } from '../../utils/reasoning/seating.js';
import { DIRS, walkRoute } from '../../utils/reasoning/direction.js';
import { buildFamily, relationByStructure } from '../../utils/reasoning/family.js';
import { FEMALE_NAMES, LETTERS, MALE_NAMES, pickNames } from './reasoningShared.js';

const TOPIC = 'reasoning-data-sufficiency';
const ATTEMPTS = 120;

/* What each choice claims about (1) alone, (2) alone, and the two together. */
const CLAIMS = [
  [true, false, true],
  [false, true, true],
  [false, false, true],
  [true, true, true],
  [false, false, false]
];
const LABELS = ['statement (1) alone', 'statement (2) alone', 'the two statements together'];

/** Each wrong choice, named by the first judgement it gets wrong. */
function dsDistractors(target) {
  const truth = CLAIMS[target];
  return DS_CHOICES.map((value, i) => ({ value, i }))
    .filter(({ i }) => i !== target)
    .map(({ value, i }) => {
      const k = [0, 1, 2].find((j) => CLAIMS[i][j] !== truth[j]);
      return { value, why: CLAIMS[i][k] ? `thought ${LABELS[k]} settles it` : `missed that ${LABELS[k]} settles it` };
    });
}

/** Deal problems until one gives the target choice, is fair, and is not settled before the statements. */
function dealFor(rng, target, make) {
  for (let i = 0; i < ATTEMPTS; i++) {
    const problem = make(rng);
    if (!problem) continue;
    const [sets] = solveBothWays(problem);
    if (!consistent(sets) || settled(sets.none)) continue;
    if (verdict(sets) === target) return problem;
  }
  return null;
}

/** "Bhavna, Chetan or Divya", "only Bhavna". */
function possible(values, show) {
  const texts = values.map(show);
  if (texts.length === 1) return `only ${texts[0]}`;
  if (texts.length <= 4) return `${texts.slice(0, -1).join(', ')} or ${texts.at(-1)}`;
  return `${texts.length} different answers`;
}

/** The explanation lines, one per combination needed, from the first method's sets. */
function judgementLines(problem, show) {
  const [sets] = solveBothWays(problem);
  const yesNo = values => values.every((v) => v === 'Yes' || v === 'No');
  const line = (label, values) =>
    yesNo(values) ? (settled(values) ? `${label}: the answer is a definite ${values[0]}, so this is sufficient.` : `${label}: the answer could be Yes or No, so this is not sufficient.`) :
    settled(values) ? `${label}: ${possible(values, show)}, so this is sufficient.` : `${label}: ${possible(values, show)} still possible, so this is not sufficient.`;
  const target = verdict(sets);
  const lines = [line('(1) alone', sets.one), line('(2) alone', sets.two)];
  if (target === 2 || target === 4) lines.push(line('(1) and (2) together', sets.both));
  return { lines, target };
}

const shared = {
  version: 1,
  topicId: TOPIC,
  type: 'single_choice',
  formatValue: (value) => value,
  optionOrder: DS_CHOICES,
  optionCount: 5,
  answer: ({ target }) => DS_CHOICES[target],
  distractors: ({ target }) => dsDistractors(target),
  // The second method, which must also agree with the first on every combination.
  verify: ({ problem }, value) => {
    const choice = checkedChoice(problem);
    return choice !== null && DS_CHOICES[choice] === value;
  }
};

const statementsLine = (one, two) => `(1) ${one.join(' ')} (2) ${two.join(' ')}`;
const listOf = (names) => names.join(', ').replace(/, ([^,]*)$/, ' and $1');
const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

/** Deal base information and two statements from a shuffled pool of true facts. */
function dealFacts(rng, candidates, { base: [b0, b1], each: [e0, e1] }) {
  const pool = rng.shuffle(candidates);
  const take = (count) => pool.splice(0, count);
  const base = take(rng.int(b0, b1));
  const one = take(rng.int(e0, e1));
  const two = take(rng.int(e0, e1));
  return one.length && two.length ? { base, one, two } : null;
}

/* ------------------------------ arrangements ------------------------------ */

function arrangementIntro(problem) {
  const { setting, people } = problem;
  const n = people.length;
  if (setting === 'row') return `${WORDS[n]} friends, ${listOf(people)}, sit in a row facing north.`;
  if (setting === 'circle') return `${WORDS[n]} friends, ${listOf(people)}, sit around a circular table facing the centre.`;
  if (setting === 'floors') return `${WORDS[n]} people, ${listOf(people)}, live on the ${n} floors of a building, one on each floor. The bottom floor is the first floor and the top floor is the ${ordinal(n)}.`;
  return `${WORDS[n]} guest lecturers, ${listOf(people)}, each give one lecture at a college, on different days from Monday to ${['', '', '', '', 'Thursday', 'Friday', 'Saturday'][n]} of the same week.`;
}

const ordinalNumber = (k) => `${k}${{ 1: 'st', 2: 'nd', 3: 'rd' }[k] || 'th'}`;

/** Every true clue of the kinds the setting uses, in the hidden arrangement. */
function arrangementCandidates(problem, truth) {
  const n = problem.people.length;
  const puzzle = { layout: problem.layout, people: problem.people };
  const out = [];
  const add = (clue) => {
    if (clueHolds(puzzle, truth, clue)) out.push(clue);
  };
  for (let p = 0; p < n; p++) {
    if (problem.layout === 'row') {
      for (let k = 1; k <= n; k++) add({ t: 'pos', p, k, from: 'left' });
      add({ t: 'end', p });
      add({ t: 'notEnd', p });
    }
    for (let q = 0; q < n; q++) {
      if (p === q) continue;
      for (const side of ['left', 'right']) for (const k of [1, 2]) add({ t: 'side', p, q, side, k });
      if (p < q) {
        add({ t: 'adj', p, q });
        add({ t: 'notAdj', p, q });
        if (problem.layout === 'row') for (let k = 1; k <= 2; k++) add({ t: 'gap', p, q, k });
        if (problem.layout === 'circle' && n % 2 === 0) add({ t: 'opp', p, q });
      }
    }
  }
  return out;
}

function hiddenArrangement(rng, layout, n) {
  let seats = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  if (layout === 'circle') {
    const at = seats.indexOf(0);
    seats = [...seats.slice(at), ...seats.slice(0, at)];
  }
  return { seats, facing: null };
}

function makeArrangementAsk(rng, kind, n) {
  if (kind === 'at') return { q: 'at', seat: rng.pick([0, n - 1, n % 2 ? (n - 1) / 2 : 1]) };
  if (kind === 'pos') return { q: 'pos', p: rng.int(0, n - 1) };
  if (kind === 'opp') return { q: 'opp', p: rng.int(0, n - 1) };
  return { q: 'side', p: rng.int(0, n - 1), side: rng.pick(['left', 'right']), k: 1 };
}

function arrangementTemplate({ id, conceptId, difficulty, settings, size, asks, base, each, seconds, formulaIds }) {
  return {
    ...shared,
    id,
    conceptId,
    difficulty,
    formulaIds,
    estimatedSeconds: seconds,
    params(rng) {
      const target = rng.int(0, 4);
      const setting = rng.pick(settings);
      const layout = setting === 'circle' ? 'circle' : 'row';
      const people = pickNames(rng, size);
      const problem = dealFor(rng, target, () => {
        const truth = hiddenArrangement(rng, layout, size);
        const ask = makeArrangementAsk(rng, rng.pick(asks), size);
        const shell = { kind: 'arrangement', layout, setting, people, ask };
        const dealt = dealFacts(rng, arrangementCandidates(shell, truth), { base, each });
        return dealt ? { ...shell, ...dealt } : null;
      });
      return problem ? { target, problem } : null;
    },
    render({ problem }, { fmt }) {
      const { lines, target } = judgementLines(problem, (v) => arrangementValueText(problem, v));
      const say = (clues) => clues.map((c) => arrangementClueText(problem, c));
      const cases = problem.setting === 'circle' ? 'seatings' : 'arrangements';
      return {
        context: [arrangementIntro(problem), ...say(problem.base)].join(' '),
        question: `${arrangementAskText(problem)} ${statementsLine(say(problem.one), say(problem.two))}`,
        explanation: `List the ${cases} each statement allows${problem.base.length ? ' together with the given information' : ''}. ${lines.join(' ')} So the answer is ${DS_LETTERS[target]}: ${fmt(DS_CHOICES[target])}`,
        solutionSteps: [...lines, `Answer ${DS_LETTERS[target]}.`],
        method: 'Draw the cases for statement (1) alone, then start again for (2) alone; combine only if neither is enough. Sufficient means every case left gives the same answer.',
        hints: [
          `Cover statement (2). With only (1)${problem.base.length ? ' and the given information' : ''}, how many different answers to the question are still possible?`,
          'Now cover (1) and do the same for (2). Only if both fail, use them together.'
        ],
        commonMistakes: ['Carrying what statement (1) says into the test of statement (2).', 'Calling a statement sufficient because it fixes some people, when the person asked about can still move.']
      };
    }
  };
}

/* ------------------------------ rankings ------------------------------ */

const QUALITIES = [
  { more: 'taller', less: 'shorter', most: 'tallest', least: 'shortest' },
  { more: 'heavier', less: 'lighter', most: 'heaviest', least: 'lightest' },
  { more: 'older', less: 'younger', most: 'oldest', least: 'youngest' },
  { more: 'richer', less: 'poorer', most: 'richest', least: 'poorest' }
];

function rankingCandidates(order, maxGap) {
  const out = [];
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length && j - i <= maxGap; j++) out.push({ more: [order[i], order[j]] });
  return out;
}

function rankingTemplate({ id, conceptId, difficulty, size, makeAsk, base, each, seconds, formulaIds }) {
  return {
    ...shared,
    id,
    conceptId,
    difficulty,
    formulaIds,
    estimatedSeconds: seconds,
    params(rng) {
      const target = rng.int(0, 4);
      const people = pickNames(rng, size);
      const quality = rng.pick(QUALITIES);
      const problem = dealFor(rng, target, () => {
        const order = rng.shuffle(Array.from({ length: size }, (_, i) => i));
        const dealt = dealFacts(rng, rankingCandidates(order, 2), { base, each });
        return dealt ? { kind: 'ranking', people, ...dealt, ask: makeAsk(rng, size, order) } : null;
      });
      if (!problem) return null;
      // Some comparisons are written the other way round ("B is shorter than A").
      const flips = [...problem.base, ...problem.one, ...problem.two].map(() => rng.chance(0.4));
      return { target, problem, quality, flips };
    },
    render({ problem, quality, flips }, { fmt }) {
      const show = (v) => (problem.ask.q === 'kth' ? problem.people[v] : problem.ask.q === 'rank' ? `${ordinalNumber(v)} place` : v);
      const { lines, target } = judgementLines(problem, show);
      let f = 0;
      const say = (facts) => facts.map((fact) => comparisonText(problem.people, fact, quality, flips[f++]));
      const base = say(problem.base);
      const one = say(problem.one);
      const two = say(problem.two);
      return {
        context: [`${WORDS[problem.people.length]} friends, ${listOf(problem.people)}, are compared.`, ...base].join(' '),
        question: `${rankingAskText(problem, quality)} ${statementsLine(one, two)}`,
        explanation: `Write each comparison as A > B (${quality.more} first) and join the chains. ${lines.join(' ')} So the answer is ${DS_LETTERS[target]}: ${fmt(DS_CHOICES[target])}`,
        solutionSteps: [...lines, `Answer ${DS_LETTERS[target]}.`],
        method: 'Join the comparisons into chains. Someone is surely above another only if a chain runs from one to the other; people in separate chains can be in either order.',
        hints: [`Write the comparisons as a chain, ${quality.most} on the left, using the given information and statement (1) only.`, 'Two people with no chain between them can be in either order. Then try (2) alone.'],
        commonMistakes: [`Reading "A is ${quality.less} than B" as A above B.`, 'Assuming two people with no chain between them are in a particular order.']
      };
    }
  };
}

/* ------------------------------ relations ------------------------------ */

/*
 * A hidden family of six: a grandparent (0) with two children (1 and 5); 1 is married
 * to 2, and their children are 3 and 4. Genders are random.
 */
const FAMILY = { parents: [[0, 1], [0, 5], [1, 3], [2, 3], [1, 4], [2, 4]], spouses: [[1, 2]], siblings: [[1, 5], [3, 4]] };

function familyStatements(gender) {
  const word = (i, male, female) => (gender[i] === 'M' ? male : female);
  const out = [];
  for (const [p, c] of FAMILY.parents) {
    out.push({ a: p, rel: word(p, 'father', 'mother'), b: c }, { a: p, rel: 'parent', b: c });
    out.push({ a: c, rel: word(c, 'son', 'daughter'), b: p }, { a: c, rel: 'child', b: p });
  }
  for (const [a, b] of FAMILY.spouses) out.push({ a, rel: word(a, 'husband', 'wife'), b }, { a: b, rel: word(b, 'husband', 'wife'), b: a });
  for (const [a, b] of FAMILY.siblings) {
    out.push({ a, rel: word(a, 'brother', 'sister'), b }, { a: b, rel: word(b, 'brother', 'sister'), b: a });
    out.push({ a, rel: 'sibling', b });
  }
  return out;
}

const ASK_PAIRS = [[0, 3], [3, 0], [5, 3], [3, 5], [2, 0], [0, 2], [4, 3], [5, 2], [2, 5], [1, 3], [4, 0]];

const relationTemplate = {
  ...shared,
  id: 'rds-gen-relation',
  conceptId: 'rds-relations',
  difficulty: 'medium',
  formulaIds: ['rds-relations-f', 'rds-sc-gender'],
  estimatedSeconds: 80,
  params(rng) {
    const target = rng.int(0, 4);
    const people = rng.shuffle(LETTERS).slice(0, 6);
    const problem = dealFor(rng, target, () => {
      const gender = Array.from({ length: 6 }, () => (rng.chance(0.5) ? 'M' : 'F'));
      gender[2] = gender[1] === 'M' ? 'F' : 'M';
      const statements = familyStatements(gender);
      const [x, y] = rng.pick(ASK_PAIRS);
      const truth = relationByStructure(buildFamily(6, statements), x, y);
      if (!truth || truth.includes(' or ')) return null;
      const dealt = dealFacts(rng, statements, { base: [0, 1], each: [1, 2] });
      return dealt ? { kind: 'relation', n: 6, people, ...dealt, ask: { x, y }, truth } : null;
    });
    if (!problem) return null;
    // A settled answer must be the hidden family's own relation.
    for (const extra of [problem.one, problem.two, [...problem.one, ...problem.two]]) {
      const phrase = relationPhrase(problem, extra);
      if (phrase && !phrase.includes(' or ') && phrase !== problem.truth) return null;
    }
    return { target, problem };
  },
  render({ problem }, { fmt }) {
    const { people } = problem;
    const say = (list) => list.map(({ a, rel, b }) => `${people[a]} is the ${rel} of ${people[b]}.`);
    const X = people[problem.ask.x];
    const Y = people[problem.ask.y];
    const judge = (label, extra) => {
      const r = relationPhrase(problem, extra);
      if (r && !r.includes(' or ')) return `${label}: ${X} is ${Y}’s ${r}, so this is sufficient.`;
      if (r) return `${label}: ${X} could be ${Y}’s ${r}, as ${X}’s gender is not known, so this is not sufficient.`;
      return `${label}: nothing ties ${X} to ${Y}, so this is not sufficient.`;
    };
    const [sets] = solveBothWays(problem);
    const target = verdict(sets);
    const lines = [judge('(1) alone', problem.one), judge('(2) alone', problem.two)];
    if (target === 2 || target === 4) lines.push(judge('(1) and (2) together', [...problem.one, ...problem.two]));
    const named = people.filter((_, i) => i === problem.ask.x || i === problem.ask.y || [...problem.base, ...problem.one, ...problem.two].some((s) => s.a === i || s.b === i));
    return {
      context: [`${listOf(named)} are members of one family. A letter does not tell you whether a person is male or female.`, ...say(problem.base)].join(' '),
      question: `How is ${X} related to ${Y}? ${statementsLine(say(problem.one), say(problem.two))}`,
      explanation: `Draw the family tree for each statement separately. ${lines.join(' ')} So the answer is ${DS_LETTERS[target]}: ${fmt(DS_CHOICES[target])}`,
      solutionSteps: [...lines, `Answer ${DS_LETTERS[target]}.`],
      method: 'Draw a tree for each statement on its own. The relation is settled only if the tree joins the two people and shows the gender of the first one.',
      hints: [`With (1) alone, is there a line of the family tree joining ${X} to ${Y}?`, `Even if they are joined, do you know whether ${X} is male or female?`],
      commonMistakes: ['Guessing a gender that no statement gives.', '"Parent", "child" and "sibling" do not give a gender, so they cannot settle "son" or "daughter".']
    };
  }
};

/* ------------------------------ directions ------------------------------ */

const COMPASS = ['north', 'east', 'south', 'west'];

function routeSentence(name, steps, unit) {
  const parts = steps.map((s, i) => {
    if (i === 0) return `walks ${s.go} ${unit}`;
    return `${s.turn === '?' ? 'turns' : `turns ${s.turn}`} and walks ${s.go} ${unit}`;
  });
  return `${name} ${parts.slice(0, -1).join(', ')}, then ${parts.at(-1)}.`;
}

const directionTemplate = {
  ...shared,
  id: 'rds-gen-direction',
  conceptId: 'rds-directions',
  difficulty: 'medium',
  formulaIds: ['rds-directions-f'],
  estimatedSeconds: 80,
  params(rng) {
    const target = rng.int(0, 4);
    const pronoun = rng.pick(['he', 'she']);
    const name = rng.pick(pronoun === 'he' ? MALE_NAMES : FEMALE_NAMES);
    const unit = rng.pick(['km', 'm']);
    const problem = dealFor(rng, target, () => {
      const legs = rng.int(2, 3);
      const steps = [{ go: rng.int(2, 9) }];
      for (let i = 1; i < legs; i++) steps.push({ turn: rng.pick(['left', 'right', '?', '?']), go: rng.int(2, 9) });
      const unknown = steps.filter((s) => s.turn === '?').length;
      const start = rng.pick(COMPASS);
      let u = 0;
      const sides = Array.from({ length: unknown }, () => rng.pick(['left', 'right']));
      const walk = walkRoute({ start, steps: steps.map((s) => (s.turn === '?' ? { ...s, turn: sides[u++] } : s)) });
      const facts = [{ t: 'start', dir: start }, { t: 'end', dir: DIRS[walk.facing] }];
      for (let i = 1; i < walk.points.length - 1; i++) {
        const [x0, y0] = walk.points[i];
        const [x1, y1] = walk.points[i + 1];
        facts.push({ t: 'leg', i, dir: x1 > x0 ? 'east' : x1 < x0 ? 'west' : y1 > y0 ? 'north' : 'south' });
      }
      if (walk.x && walk.y) facts.push({ t: 'where', dir: `${walk.y > 0 ? 'north' : 'south'}-${walk.x > 0 ? 'east' : 'west'}` });
      const [one, two] = rng.shuffle(facts);
      return { kind: 'direction', starts: COMPASS, steps, base: [], one: [one], two: [two], ask: { q: rng.pick(['where', 'facing']) } };
    });
    return problem ? { target, problem, name, pronoun, unit } : null;
  },
  render({ problem, name, pronoun, unit }, { fmt }) {
    const { lines, target } = judgementLines(problem, (v) => (v === null ? 'back at the start' : v));
    const say = (facts) => facts.map((f) => directionFactText(name, f, pronoun));
    const his = pronoun === 'she' ? 'her' : 'his';
    const unknownTurns = problem.steps.filter((s) => s.turn === '?').length;
    return {
      context: `${routeSentence(name, problem.steps, unit)} The question does not say which way ${pronoun} faced at the start${unknownTurns ? `, nor which way ${pronoun} turned where it just says "turns"` : ''}.`,
      question: `${problem.ask.q === 'where' ? `In which direction is ${name} now from ${his} starting point?` : `Which direction is ${name} facing at the end?`} ${statementsLine(say(problem.one), say(problem.two))}`,
      explanation: `Try every starting direction${unknownTurns ? ' and both ways for each unknown turn' : ''}, keeping only the walks a statement allows. ${lines.join(' ')} So the answer is ${DS_LETTERS[target]}: ${fmt(DS_CHOICES[target])}`,
      solutionSteps: [...lines, `Answer ${DS_LETTERS[target]}.`],
      method: 'With the start unknown, the whole drawing can turn; a statement is sufficient only if it fixes the answer for every walk it still allows.',
      hints: ['Draw the walk starting north, then picture the whole drawing turned to start east, south or west.', 'Which of those drawings does statement (1) allow, and do they all give the same answer?'],
      commonMistakes: ['Assuming the walker starts facing north.', 'Treating "turns left" as a fixed compass direction instead of a turn from the way the walker faces.']
    };
  }
};

/* ------------------------------ the templates ------------------------------ */

export const sufficiencyTemplates = [
  arrangementTemplate({
    id: 'rds-gen-floors',
    conceptId: 'rds-arrangements',
    difficulty: 'easy',
    settings: ['floors', 'days'],
    size: 4,
    asks: ['at', 'pos'],
    base: [0, 0],
    each: [1, 2],
    seconds: 70,
    formulaIds: ['rds-arrangements-f', 'rds-choices-f']
  }),
  arrangementTemplate({
    id: 'rds-gen-row',
    conceptId: 'rds-arrangements',
    difficulty: 'medium',
    settings: ['row', 'floors', 'days'],
    size: 5,
    asks: ['at', 'pos'],
    base: [1, 2],
    each: [1, 2],
    seconds: 100,
    formulaIds: ['rds-arrangements-f', 'rds-sc-cases']
  }),
  arrangementTemplate({
    id: 'rds-gen-circle',
    conceptId: 'rds-arrangements',
    difficulty: 'complex',
    settings: ['circle'],
    size: 6,
    asks: ['opp', 'side'],
    base: [1, 2],
    each: [1, 2],
    seconds: 120,
    formulaIds: ['rds-arrangements-f', 'rds-sc-cases']
  }),
  rankingTemplate({
    id: 'rds-gen-ranking',
    conceptId: 'rds-ranking',
    difficulty: 'easy',
    size: 4,
    makeAsk: (rng, n) => ({ q: 'kth', k: rng.pick([1, n]) }),
    base: [1, 2],
    each: [1, 2],
    seconds: 60,
    formulaIds: ['rds-ranking-f']
  }),
  rankingTemplate({
    id: 'rds-gen-rank-place',
    conceptId: 'rds-ranking',
    difficulty: 'medium',
    size: 5,
    makeAsk: (rng, n) => (rng.chance(0.5) ? { q: 'kth', k: rng.int(2, n - 1) } : { q: 'rank', p: rng.int(0, n - 1) }),
    base: [1, 2],
    each: [1, 3],
    seconds: 90,
    formulaIds: ['rds-ranking-f', 'rds-sc-chain']
  }),
  rankingTemplate({
    id: 'rds-gen-yes-no',
    conceptId: 'rds-choices',
    difficulty: 'complex',
    size: 5,
    makeAsk: (rng, n, order) => {
      const [a, b] = rng.shuffle(order).slice(0, 2);
      return { q: 'more', a, b };
    },
    base: [0, 1],
    each: [1, 2],
    seconds: 90,
    formulaIds: ['rds-choices-f', 'rds-sc-definite-no']
  }),
  relationTemplate,
  directionTemplate
];
