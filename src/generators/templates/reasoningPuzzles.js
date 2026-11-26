/**
 * Puzzle templates: floors, stacked boxes, days of the week and person ×
 * attribute grids. A hidden solution is drawn at random, every true clue is
 * collected, and clues are added until brute force leaves one solution (then
 * unneeded clues are dropped). The answer comes from the hidden solution;
 * `verify` re-solves the printed clues the other way round
 * (solvePuzzleByHolders) and needs every solution to give the same answer.
 */

import { puzzleClueHolds, solvePuzzle, solvePuzzleByHolders } from '../../utils/reasoning/puzzles.js';
import { numbered, pickClues, pickNames } from './reasoningShared.js';
import { ATTRS, DAYS, THEMES, WORDS, cap, list, puzzleClueText } from '../../utils/reasoning/puzzleText.js';

export { puzzleClueText };

const TOPIC = 'puzzles';

/** Every true clue about the hidden solution. */
function candidateClues(puzzle, truth, { useAttrSubjects = true } = {}) {
  const n = puzzle.people.length;
  const out = [];
  const add = (clue) => {
    if (puzzleClueHolds(truth, clue)) out.push(clue);
  };
  const subjects = Array.from({ length: n }, (_, p) => ({ p }));
  const attrSubjects = [];
  puzzle.attrs.forEach((_, a) => {
    for (let v = 0; v < n; v++) attrSubjects.push({ a, v });
  });
  // Links between a person (or a value) and a value of another attribute.
  for (const x of [...subjects, ...(useAttrSubjects ? attrSubjects : [])]) {
    for (const y of attrSubjects) {
      if (x.a !== undefined && x.a >= y.a) continue;
      add({ t: 'same', x, y });
      if (x.p !== undefined) add({ t: 'diff', x, y });
    }
  }
  if (puzzle.slots) {
    const movers = [...subjects, ...(useAttrSubjects ? attrSubjects : [])];
    for (const x of movers) {
      for (let k = 0; k < n; k++) if (x.p !== undefined) add({ t: 'at', x, k });
      if (THEMES[puzzle.kind].parity) for (const even of [true, false]) add({ t: 'parity', x, even });
      add({ t: 'extreme', x });
      for (const y of subjects) {
        if (x.p === y.p) continue;
        add({ t: 'above', x, y });
        add({ t: 'justAbove', x, y });
        for (let k = 1; k <= 3; k++) add({ t: 'gap', x, y, k });
        add({ t: 'notAdjacent', x, y });
      }
    }
  }
  return out;
}

function randomTruth(rng, puzzle) {
  const n = puzzle.people.length;
  const perm = () => rng.shuffle(Array.from({ length: n }, (_, i) => i));
  return { slot: puzzle.slots ? perm() : null, attr: puzzle.attrs.map(() => perm()) };
}

/** A puzzle whose clues have exactly one solution. */
function makePuzzle(rng, { kind, n, attrs = [], maxClues = 8, names }) {
  const people = names || pickNames(rng, n);
  const attrSpecs = attrs.map((key) => {
    const spec = ATTRS[key];
    return { ...spec, values: rng.shuffle(spec.values).slice(0, n) };
  });
  const puzzle = { kind, people, slots: kind !== 'grid', attrs: attrSpecs.map((a) => a.name), attrSpecs };
  const truth = randomTruth(rng, puzzle);
  // Clues about order come first more often than not, as in printed puzzles.
  const candidates = rng.shuffle(candidateClues(puzzle, truth));
  const clues = pickClues(candidates, solvePuzzle(puzzle, []), (listIn, clue) => listIn.filter((s) => puzzleClueHolds(s, clue)), (c) => solvePuzzle(puzzle, c), { maxClues });
  if (!clues) return null;
  return { ...puzzle, clues, truth };
}

const contextOf = (puzzle) => {
  const attrLine = puzzle.attrSpecs.length ? ` Each ${puzzle.attrSpecs.map((a) => `${a.each} (${list(a.values)})`).join(' and ')}.` : '';
  const intro = puzzle.kind === 'grid' ? `${cap(WORDS[puzzle.people.length])} friends: ${list(puzzle.people)}.${attrLine}` : THEMES[puzzle.kind].intro(puzzle) + attrLine;
  return `${intro}\n${numbered(puzzle.clues.map((c) => puzzleClueText(puzzle, c)))}`;
};

function solutionText(puzzle, s) {
  const n = puzzle.people.length;
  const label = (p) => (puzzle.kind === 'boxes' ? `box ${puzzle.people[p]}` : puzzle.people[p]);
  const extras = (p) => puzzle.attrSpecs.map((a, i) => a.values[s.attr[i][p]]).join(', ');
  const withExtras = (p) => (puzzle.attrSpecs.length ? `${label(p)} (${extras(p)})` : label(p));
  if (!puzzle.slots) return `${puzzle.people.map((_, p) => withExtras(p)).join('; ')}.`;
  const order = Array.from({ length: n }, (_, k) => s.slot.indexOf(k));
  const slotName = THEMES[puzzle.kind].slot;
  return order
    .map((p, k) => `${cap(slotName(k))}: ${withExtras(p)}`)
    .reverse()
    .join('; ')
    .concat('.');
}

/** All solutions of the printed clues, found the second way, agree on `read`. */
function sameEverywhere(puzzle, value, read) {
  const solutions = solvePuzzleByHolders(puzzle);
  return solutions.length > 0 && solutions.every((s) => read(s) === value);
}

const steps = (puzzle) => [
  `Draw the ${puzzle.kind === 'grid' ? 'grid of people against values' : puzzle.kind === 'days' ? 'days in a column' : 'positions as a column, highest at the top'} and fill in the definite clues first.`,
  'Use the relative clues next, writing down each case they allow; strike out a case as soon as a clue breaks it.',
  `Only one arrangement fits every clue: ${solutionText(puzzle, puzzle.truth)}`
];

const firstHint = (puzzle) => {
  const definite = puzzle.clues.find((c) => c.t === 'at' || c.t === 'same');
  return definite ? `Start with the clue that fixes something outright: "${puzzleClueText(puzzle, definite)}"` : `Start with clue 1 and list the cases it allows.`;
};

const otherValues = (answer, values) => values.filter((v) => v !== answer).map((value) => ({ value, why: 'another value in the puzzle' }));

export const puzzleTemplates = [
  {
    id: 'pz-gen-floor',
    version: 1,
    topicId: TOPIC,
    conceptId: 'pz-floor',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pz-order-f'],
    formatValue: (v) => v,
    estimatedSeconds: 120,
    params(rng) {
      const puzzle = makePuzzle(rng, { kind: 'floors', n: rng.int(5, 6), maxClues: 6 });
      if (!puzzle) return null;
      const ask = rng.pick(['at', 'above', 'below']);
      const k = rng.int(0, puzzle.people.length - 1);
      const who = puzzle.truth.slot.indexOf(k);
      const base = ask === 'above' ? puzzle.truth.slot.indexOf(puzzle.truth.slot[who] - 1) : ask === 'below' ? puzzle.truth.slot.indexOf(puzzle.truth.slot[who] + 1) : who;
      if (base === -1) return null;
      return { puzzle, ask, k, base };
    },
    // ask 'at': who is on floor k; 'above': who lives immediately above `base`; 'below': immediately below.
    answer: ({ puzzle, ask, k, base }) => puzzle.people[ask === 'at' ? puzzle.truth.slot.indexOf(k) : puzzle.truth.slot.indexOf(puzzle.truth.slot[base] + (ask === 'above' ? 1 : -1))],
    distractors({ puzzle, ask, k, base }) {
      const s = puzzle.truth.slot;
      const near = ask === 'at' ? [s.indexOf(k + 1), s.indexOf(k - 1), s.indexOf(puzzle.people.length - 1 - k)] : [s.indexOf(s[base] + (ask === 'above' ? -1 : 1)), s.indexOf(s[base] + (ask === 'above' ? 2 : -2))];
      const answer = this.answer({ puzzle, ask, k, base });
      return [...near.filter((i) => i >= 0).map((i) => puzzle.people[i]), ...puzzle.people].filter((v, i, all) => v !== answer && (ask === 'at' || v !== puzzle.people[base]) && all.indexOf(v) === i).map((value) => ({ value, why: 'a neighbouring floor' }));
    },
    verify: ({ puzzle, ask, k, base }, value) =>
      sameEverywhere(puzzle, value, (s) => puzzle.people[ask === 'at' ? s.slot.indexOf(k) : s.slot.indexOf(s.slot[base] + (ask === 'above' ? 1 : -1))]),
    render({ puzzle, ask, k, base }, { fmt }) {
      const question = ask === 'at' ? `Who lives on floor ${k + 1}?` : `Who lives immediately ${ask} ${puzzle.people[base]}?`;
      return {
        context: contextOf(puzzle),
        question,
        explanation: `${solutionText(puzzle, puzzle.truth)} So the answer is ${fmt(this.answer({ puzzle, ask, k, base }))}.`,
        solutionSteps: steps(puzzle),
        method: 'Floors as a column, lowest at the bottom; definite clues first, then relative ones.',
        hints: [firstHint(puzzle), '"Immediately above" means the very next floor up; "somewhere above" means any higher floor.'],
        commonMistakes: ['Reading "somewhere above" as "immediately above".', 'Numbering the floors from the top.']
      };
    }
  },
  {
    id: 'pz-gen-floor-colour',
    version: 1,
    topicId: TOPIC,
    conceptId: 'pz-floor',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['pz-order-f', 'pz-grid-f'],
    formatValue: (v) => v,
    estimatedSeconds: 180,
    params(rng) {
      const puzzle = makePuzzle(rng, { kind: 'floors', n: 5, attrs: ['colour'], maxClues: 8 });
      if (!puzzle) return null;
      return { puzzle, k: rng.int(0, 4) };
    },
    answer: ({ puzzle, k }) => puzzle.attrSpecs[0].values[puzzle.truth.attr[0][puzzle.truth.slot.indexOf(k)]],
    distractors: ({ puzzle, k }) => otherValues(puzzle.attrSpecs[0].values[puzzle.truth.attr[0][puzzle.truth.slot.indexOf(k)]], puzzle.attrSpecs[0].values),
    verify: ({ puzzle, k }, value) => sameEverywhere(puzzle, value, (s) => puzzle.attrSpecs[0].values[s.attr[0][s.slot.indexOf(k)]]),
    render({ puzzle, k }, { fmt }) {
      return {
        context: contextOf(puzzle),
        question: `Which colour does the person on floor ${k + 1} like?`,
        explanation: `${solutionText(puzzle, puzzle.truth)} The person on floor ${k + 1} likes ${fmt(this.answer({ puzzle, k }))}.`,
        solutionSteps: steps(puzzle),
        method: 'Place people on floors first, then hang each colour on its person.',
        hints: [firstHint(puzzle), 'A clue like "the person who likes red lives above X" places a colour, not a name: carry it as its own marker until you can match it to a person.'],
        commonMistakes: ['Treating "the person who likes red" as a new, extra person.', 'Fixing a colour before the floors are certain.']
      };
    }
  },
  {
    id: 'pz-gen-box',
    version: 1,
    topicId: TOPIC,
    conceptId: 'pz-box',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['pz-order-f'],
    estimatedSeconds: 120,
    params(rng) {
      const puzzle = makePuzzle(rng, { kind: 'boxes', n: 6, names: rng.shuffle(['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W']).slice(0, 6), maxClues: 7 });
      if (!puzzle) return null;
      const ask = rng.pick(['between', 'above']);
      const [p, q] = rng.shuffle([0, 1, 2, 3, 4, 5]).slice(0, 2);
      if (ask === 'between' && Math.abs(puzzle.truth.slot[p] - puzzle.truth.slot[q]) < 2) return null;
      return { puzzle, ask, p, q };
    },
    answer: ({ puzzle, ask, p, q }) => (ask === 'between' ? Math.abs(puzzle.truth.slot[p] - puzzle.truth.slot[q]) - 1 : puzzle.people.length - 1 - puzzle.truth.slot[p]),
    verify: ({ puzzle, ask, p, q }, value) => sameEverywhere(puzzle, value, (s) => (ask === 'between' ? Math.abs(s.slot[p] - s.slot[q]) - 1 : puzzle.people.length - 1 - s.slot[p])),
    render({ puzzle, ask, p, q }) {
      const answer = this.answer({ puzzle, ask, p, q });
      return {
        context: contextOf(puzzle),
        question: ask === 'between' ? `How many boxes are kept between box ${puzzle.people[p]} and box ${puzzle.people[q]}?` : `How many boxes are kept above box ${puzzle.people[p]}?`,
        explanation: `${solutionText(puzzle, puzzle.truth)} So the count is ${answer}.`,
        solutionSteps: steps(puzzle),
        method: 'Stack the boxes as a column, bottom at position 1, and count only the boxes strictly between.',
        hints: [firstHint(puzzle), ask === 'between' ? 'Boxes between = difference in positions − 1.' : 'Boxes above = top position − this box’s position.'],
        commonMistakes: ['Counting one of the two named boxes as well.', 'Numbering positions from the top instead of the bottom.']
      };
    }
  },
  {
    id: 'pz-gen-schedule',
    version: 1,
    topicId: TOPIC,
    conceptId: 'pz-schedule',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pz-order-f'],
    formatValue: (v) => v,
    estimatedSeconds: 120,
    params(rng) {
      const puzzle = makePuzzle(rng, { kind: 'days', n: rng.int(5, 6), maxClues: 6 });
      if (!puzzle) return null;
      return { puzzle, p: rng.int(0, puzzle.people.length - 1) };
    },
    answer: ({ puzzle, p }) => DAYS[puzzle.truth.slot[p]],
    distractors: ({ puzzle, p }) => otherValues(DAYS[puzzle.truth.slot[p]], [DAYS[puzzle.truth.slot[p] + 1], DAYS[puzzle.truth.slot[p] - 1], ...DAYS.slice(0, puzzle.people.length)].filter(Boolean)),
    verify: ({ puzzle, p }, value) => sameEverywhere(puzzle, value, (s) => DAYS[s.slot[p]]),
    render({ puzzle, p }, { fmt }) {
      return {
        context: contextOf(puzzle),
        question: `On which day does ${puzzle.people[p]} visit?`,
        explanation: `${solutionText(puzzle, puzzle.truth)} So ${puzzle.people[p]} visits on ${fmt(this.answer({ puzzle, p }))}.`,
        solutionSteps: steps(puzzle),
        method: 'Treat the days as positions 1, 2, 3, ... and solve like a floor puzzle.',
        hints: [firstHint(puzzle), '"The day immediately after" is the next day; "some day after" can be any later day.'],
        commonMistakes: ['Reading "some day after" as "the next day".', 'Counting the two named days in "people between".']
      };
    }
  },
  {
    id: 'pz-gen-grid',
    version: 1,
    topicId: TOPIC,
    conceptId: 'pz-grid',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pz-grid-f'],
    formatValue: (v) => v,
    estimatedSeconds: 120,
    params(rng) {
      const puzzle = makePuzzle(rng, { kind: 'grid', n: rng.int(4, 5), attrs: ['city', 'fruit'], maxClues: 8 });
      if (!puzzle) return null;
      return { puzzle, p: rng.int(0, puzzle.people.length - 1), a: rng.int(0, 1), byValue: rng.chance(0.4) };
    },
    // byValue: "Who is from Delhi?" (answer a name); otherwise "Which city is Ravi from?" (answer a value).
    answer: ({ puzzle, p, a, byValue }) => (byValue ? puzzle.people[p] : puzzle.attrSpecs[a].values[puzzle.truth.attr[a][p]]),
    distractors: ({ puzzle, p, a, byValue }) => (byValue ? otherValues(puzzle.people[p], puzzle.people) : otherValues(puzzle.attrSpecs[a].values[puzzle.truth.attr[a][p]], puzzle.attrSpecs[a].values)),
    verify: ({ puzzle, p, a, byValue }, value) => {
      const v = puzzle.truth.attr[a][p];
      return sameEverywhere(puzzle, value, (s) => (byValue ? puzzle.people[s.attr[a].indexOf(v)] : puzzle.attrSpecs[a].values[s.attr[a][p]]));
    },
    render({ puzzle, p, a, byValue }, { fmt }) {
      const spec = puzzle.attrSpecs[a];
      const value = spec.values[puzzle.truth.attr[a][p]];
      const question = byValue ? `Who ${spec.is(value)}?` : a === 0 ? `Which city is ${puzzle.people[p]} from?` : `Which fruit does ${puzzle.people[p]} like?`;
      return {
        context: contextOf(puzzle),
        question,
        explanation: `${solutionText(puzzle, puzzle.truth)} So the answer is ${fmt(this.answer({ puzzle, p, a, byValue }))}.`,
        solutionSteps: [
          'Draw a grid: people down the side, every city and fruit across the top.',
          'A tick for every "is", a cross for every "is not"; a tick in a cell crosses out the rest of its row and column within that attribute.',
          'When a row has one empty cell left in an attribute, it must be a tick. Links between a city and a fruit carry ticks across.',
          `The grid ends with one tick per person in each attribute: ${solutionText(puzzle, puzzle.truth)}`
        ],
        method: 'Grid elimination: ticks, crosses and the last empty cell.',
        hints: [firstHint(puzzle), 'After every tick, cross out the rest of that row and column in the same attribute, then look for a row or column with only one blank left.'],
        commonMistakes: ['Forgetting that one tick rules out a whole row and column.', 'Matching a city and a fruit to a person before the link is certain.']
      };
    }
  },
  {
    id: 'pz-gen-cases',
    version: 1,
    topicId: TOPIC,
    conceptId: 'pz-cases',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['pz-cases-f'],
    estimatedSeconds: 150,
    params(rng) {
      // Clues that leave two or three arrangements, and a question whose answer is the same in all of them.
      const n = 6;
      const people = pickNames(rng, n);
      const puzzle = { kind: 'floors', people, slots: true, attrs: [], attrSpecs: [] };
      const truth = randomTruth(rng, puzzle);
      const pool = rng.shuffle(candidateClues(puzzle, truth).filter((c) => c.t !== 'at'));
      let left = solvePuzzle(puzzle, []);
      const clues = [];
      for (const clue of pool) {
        const next = left.filter((s) => puzzleClueHolds(s, clue));
        if (next.length === left.length || next.length < 2) continue;
        clues.push(clue);
        left = next;
        if (left.length <= 3) break;
      }
      if (left.length < 2 || left.length > 3) return null;
      // Drop clues the others already imply.
      for (let i = clues.length - 1; i >= 0; i--) {
        const without = clues.filter((_, j) => j !== i);
        if (solvePuzzle(puzzle, without).length === left.length) clues.splice(i, 1);
      }
      if (clues.length > 7) return null;
      // A pair whose gap is the same in every case, though the floors are not.
      const pairs = [];
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        const gaps = new Set(left.map((s) => Math.abs(s.slot[p] - s.slot[q]) - 1));
        const moves = new Set(left.map((s) => s.slot[p])).size > 1;
        if (gaps.size === 1 && moves && [...gaps][0] >= 1) pairs.push([p, q]);
      }
      if (!pairs.length) return null;
      const [p, q] = rng.pick(pairs);
      return { puzzle: { ...puzzle, clues, truth }, p, q, cases: left.length };
    },
    answer: ({ puzzle, p, q }) => Math.abs(puzzle.truth.slot[p] - puzzle.truth.slot[q]) - 1,
    verify: ({ puzzle, p, q }, value) => {
      const all = solvePuzzleByHolders(puzzle);
      return all.length >= 2 && all.every((s) => Math.abs(s.slot[p] - s.slot[q]) - 1 === value);
    },
    render({ puzzle, p, q, cases }) {
      const answer = this.answer({ puzzle, p, q });
      return {
        context: contextOf(puzzle),
        question: `How many people live between ${puzzle.people[p]} and ${puzzle.people[q]}?`,
        explanation: `The clues allow ${cases} different arrangements, but in every one of them ${puzzle.people[p]} and ${puzzle.people[q]} are ${answer + 1} floors apart, so ${answer} ${answer === 1 ? 'person lives' : 'people live'} between them. One of the arrangements: ${solutionText(puzzle, puzzle.truth)}`,
        solutionSteps: [
          'Start from the clue that pins down most, and write each possible case as its own column.',
          'Apply the remaining clues to every case; delete the cases that break one.',
          `${cases} cases survive. Read the answer in each: it is ${answer} every time, so it is certain.`
        ],
        method: 'Case method: an answer is certain when every surviving case gives it, even if the full arrangement is not.',
        hints: ['You will not be able to fix every floor. Keep all the cases that survive.', `Check the gap between ${puzzle.people[p]} and ${puzzle.people[q]} in each surviving case.`],
        commonMistakes: ['Giving up because the arrangement is not unique.', 'Answering from only one case without checking the others.']
      };
    }
  }
];
