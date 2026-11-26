/**
 * Seating arrangement templates. Each one seats people at random, collects
 * every true clue, and keeps adding clues until brute force over all
 * arrangements leaves exactly one; clues the others already imply are dropped.
 * The answer is read from the hidden seating; `verify` re-solves the printed
 * clues with the geometric reading of left and right (utils/reasoning/seating.js)
 * and needs every arrangement it finds to give the same answer.
 */

import {
  allArrangements,
  clueHolds,
  clueText,
  ordinal,
  peopleBetween,
  personOpposite,
  personToSide,
  solveSeating,
  solveSeatingGeometric
} from '../../utils/reasoning/seating.js';
import { nameDistractors, numbered, pickClues, pickNames } from './reasoningShared.js';

const TOPIC = 'seating-arrangement';

function truthFor(rng, puzzle) {
  const n = puzzle.people.length;
  if (puzzle.layout === 'rows') {
    const m = n / 2;
    const one = rng.shuffle(Array.from({ length: m }, (_, i) => i));
    const two = rng.shuffle(Array.from({ length: m }, (_, i) => i + m));
    return { seats: [...one, ...two], facing: null };
  }
  let seats = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  if (puzzle.layout === 'circle') {
    const at = seats.indexOf(0);
    seats = [...seats.slice(at), ...seats.slice(0, at)];
  }
  let facing = null;
  if (puzzle.mixed) {
    facing = Array.from({ length: n }, () => (rng.chance(0.5) ? 'in' : 'out'));
    const outs = facing.filter((f) => f === 'out').length;
    if (outs < 2 || outs > n - 2) return null;
  }
  return { seats, facing };
}

/** Every true clue of the kinds this layout uses. */
function candidateClues(puzzle, truth) {
  const n = puzzle.people.length;
  const out = [];
  const add = (clue) => {
    if (clueHolds(puzzle, truth, clue)) out.push(clue);
  };
  for (let p = 0; p < n; p++) {
    if (puzzle.layout === 'row') {
      for (const from of ['left', 'right']) for (let k = 1; k <= 3; k++) add({ t: 'pos', p, k, from });
      add({ t: 'notEnd', p });
    }
    if (puzzle.layout === 'rows') {
      add({ t: 'end', p });
      add({ t: 'notEnd', p });
    }
    if (puzzle.mixed) add({ t: 'face', p, dir: truth.facing[p] });
    for (let q = 0; q < n; q++) {
      if (q === p) continue;
      for (const side of ['left', 'right']) for (let k = 1; k <= (puzzle.layout === 'circle' ? 3 : 2); k++) add({ t: 'side', p, q, side, k });
      if (q > p) {
        add({ t: 'notAdj', p, q });
        if (puzzle.layout !== 'circle') for (let k = 1; k <= 3; k++) add({ t: 'gap', p, q, k });
      }
      if (puzzle.layout !== 'row') add({ t: 'opp', p, q });
    }
  }
  return out;
}

const filterBy = (puzzle) => (list, clue) => list.filter((arrangement) => clueHolds(puzzle, arrangement, clue));

/** A random puzzle with a unique arrangement, or null for this seed. */
function makeSeating(rng, { layout, n, mixed = false, maxClues = 8 }) {
  const people = pickNames(rng, n);
  const puzzle = { layout, people, mixed, ...(layout === 'rows' ? { rowOne: Array.from({ length: n / 2 }, (_, i) => i) } : {}) };
  const truth = truthFor(rng, puzzle);
  if (!truth) return null;
  const clues = pickClues(rng.shuffle(candidateClues(puzzle, truth)), allArrangements(puzzle), filterBy(puzzle), (c) => solveSeating(puzzle, c), { maxClues });
  if (!clues) return null;
  return { ...puzzle, clues, truth };
}

/** Every arrangement the printed clues allow, read the geometric way, must give one answer. */
function sameEverywhere(puzzle, value, read) {
  const solutions = solveSeatingGeometric(puzzle);
  return solutions.length > 0 && solutions.every((arrangement) => read(arrangement) === value);
}

const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

function intro(puzzle) {
  const n = puzzle.people.length;
  const N = WORDS[n];
  const list = puzzle.people.join(', ').replace(/, ([^,]*)$/, ' and $1');
  if (puzzle.layout === 'row') return `${N} friends, ${list}, sit in a row facing north.`;
  if (puzzle.layout === 'rows') {
    const m = n / 2;
    const one = puzzle.people.slice(0, m).join(', ').replace(/, ([^,]*)$/, ' and $1');
    const two = puzzle.people.slice(m).join(', ').replace(/, ([^,]*)$/, ' and $1');
    return `${N} people sit in two parallel rows of ${WORDS[m].toLowerCase()}, facing each other. ${one} sit in Row 1 and face south; ${two} sit in Row 2 and face north. Each person faces exactly one person in the other row.`;
  }
  if (puzzle.mixed) return `${N} friends, ${list}, sit around a circular table. Some of them face the centre and the others face away from it.`;
  return `${N} friends, ${list}, sit around a circular table facing the centre.`;
}

const contextOf = (puzzle) => `${intro(puzzle)}\n${numbered(puzzle.clues.map((c) => clueText(puzzle, c)))}`;

function layoutText(puzzle, arrangement) {
  const name = (i) => puzzle.people[i];
  const n = arrangement.seats.length;
  if (puzzle.layout === 'row') return `From the left end: ${arrangement.seats.map(name).join(', ')}.`;
  if (puzzle.layout === 'rows') {
    const m = n / 2;
    return `Row 1 (west to east): ${arrangement.seats.slice(0, m).map(name).join(', ')}. Row 2 (west to east): ${arrangement.seats.slice(m).map(name).join(', ')}.`;
  }
  const facing = (i) => (arrangement.facing ? (arrangement.facing[i] === 'in' ? ' (in)' : ' (out)') : '');
  return `Clockwise from ${name(arrangement.seats[0])}: ${arrangement.seats.map((i) => name(i) + facing(i)).join(', ')}.`;
}

const conventionHint = (puzzle) =>
  puzzle.layout === 'row'
    ? 'Facing north, a person’s left is the left end of the row.'
    : puzzle.layout === 'rows'
      ? 'Row 1 faces south, so for them left is east; Row 2 faces north, so for them left is west.'
      : puzzle.mixed
        ? 'Facing the centre, left is clockwise; facing outwards, left is anticlockwise.'
        : 'Facing the centre, a person’s left is the clockwise direction.';

function steps(puzzle) {
  return [
    `Draw the ${puzzle.layout === 'circle' ? 'circle' : 'seats'} and place the clue that fixes most: "${clueText(puzzle, puzzle.clues[0])}"`,
    `Add the other ${puzzle.clues.length - 1} clues one at a time, keeping every case still possible; only one arrangement survives.`,
    layoutText(puzzle, puzzle.truth)
  ];
}

export const seatingTemplates = [
  {
    id: 'sa-gen-row-side',
    version: 1,
    topicId: TOPIC,
    conceptId: 'sa-linear',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['sa-row-f'],
    formatValue: (v) => v,
    estimatedSeconds: 120,
    params(rng) {
      const puzzle = makeSeating(rng, { layout: 'row', n: rng.int(5, 6), maxClues: 6 });
      if (!puzzle) return null;
      const target = rng.int(0, puzzle.people.length - 1);
      const side = rng.pick(['left', 'right']);
      const k = rng.pick([1, 1, 2]);
      const who = personToSide(puzzle, puzzle.truth, target, side, k);
      if (who === null) return null;
      return { puzzle, target, side, k };
    },
    answer: ({ puzzle, target, side, k }) => puzzle.people[personToSide(puzzle, puzzle.truth, target, side, k)],
    distractors: ({ puzzle, target, side, k }) =>
      nameDistractors(
        puzzle.people[personToSide(puzzle, puzzle.truth, target, side, k)],
        [personToSide(puzzle, puzzle.truth, target, side === 'left' ? 'right' : 'left', k), personToSide(puzzle, puzzle.truth, target, side, k + 1)].map((i) => (i === null ? null : puzzle.people[i])),
        puzzle.people.filter((_, i) => i !== target)
      ),
    verify: ({ puzzle, target, side, k }, value) => sameEverywhere(puzzle, value, (a) => puzzle.people[personToSide(puzzle, a, target, side, k)] ?? null),
    render({ puzzle, target, side, k }, { fmt }) {
      const ask = k === 1 ? `immediately to the ${side} of` : `${ordinal(k)} to the ${side} of`;
      const answer = puzzle.people[personToSide(puzzle, puzzle.truth, target, side, k)];
      return {
        context: contextOf(puzzle),
        question: `Who sits ${ask} ${puzzle.people[target]}?`,
        explanation: `${layoutText(puzzle, puzzle.truth)} Everyone faces north, so ${side} means towards the ${side} end: ${fmt(answer)} sits ${ask} ${puzzle.people[target]}.`,
        solutionSteps: steps(puzzle),
        method: 'Fix the definite seat first, then the "immediately" clues, then the negative ones.',
        hints: [conventionHint(puzzle), `Start with clue 1: ${clueText(puzzle, puzzle.clues[0])}`],
        commonMistakes: ['Reading left and right from your own side of the page instead of the seated people’s.', 'Stopping after two possible arrangements without using the last clue.']
      };
    }
  },
  {
    id: 'sa-gen-row-between',
    version: 1,
    topicId: TOPIC,
    conceptId: 'sa-linear',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['sa-between-f'],
    estimatedSeconds: 120,
    params(rng) {
      const puzzle = makeSeating(rng, { layout: 'row', n: rng.int(6, 7), maxClues: 7 });
      if (!puzzle) return null;
      const [p, q] = rng.shuffle(Array.from({ length: puzzle.people.length }, (_, i) => i)).slice(0, 2);
      if (peopleBetween(puzzle, puzzle.truth, p, q) < 1) return null;
      return { puzzle, p, q };
    },
    answer: ({ puzzle, p, q }) => peopleBetween(puzzle, puzzle.truth, p, q),
    verify: ({ puzzle, p, q }, value) => sameEverywhere(puzzle, value, (a) => peopleBetween(puzzle, a, p, q)),
    render({ puzzle, p, q }) {
      const between = peopleBetween(puzzle, puzzle.truth, p, q);
      return {
        context: contextOf(puzzle),
        question: `How many people sit between ${puzzle.people[p]} and ${puzzle.people[q]}?`,
        explanation: `${layoutText(puzzle, puzzle.truth)} Their seats are ${between + 1} apart, so ${between} ${between === 1 ? 'person sits' : 'people sit'} between them.`,
        solutionSteps: steps(puzzle),
        method: 'People between = difference in seat numbers − 1.',
        hints: [conventionHint(puzzle), 'Once the row is fixed, count only the people strictly between the two, not the two themselves.'],
        commonMistakes: ['Counting one of the two people as well.', 'Using the difference in seat numbers without subtracting 1.']
      };
    }
  },
  {
    id: 'sa-gen-rows-face',
    version: 1,
    topicId: TOPIC,
    conceptId: 'sa-two-rows',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['sa-rows-f'],
    formatValue: (v) => v,
    estimatedSeconds: 150,
    params(rng) {
      const puzzle = makeSeating(rng, { layout: 'rows', n: 8, maxClues: 8 });
      if (!puzzle) return null;
      const target = rng.int(0, 7);
      const ask = rng.pick(['opp', 'left', 'right']);
      const who = ask === 'opp' ? personOpposite(puzzle, puzzle.truth, target) : personToSide(puzzle, puzzle.truth, target, ask, 1);
      if (who === null) return null;
      return { puzzle, target, ask };
    },
    answer: ({ puzzle, target, ask }) => puzzle.people[ask === 'opp' ? personOpposite(puzzle, puzzle.truth, target) : personToSide(puzzle, puzzle.truth, target, ask, 1)],
    distractors: ({ puzzle, target, ask }) => {
      const t = puzzle.truth;
      const near = [personOpposite(puzzle, t, target), personToSide(puzzle, t, target, 'left', 1), personToSide(puzzle, t, target, 'right', 1)];
      if (ask !== 'opp') near.push(personOpposite(puzzle, t, personToSide(puzzle, t, target, ask, 1)));
      return nameDistractors(
        puzzle.people[ask === 'opp' ? personOpposite(puzzle, t, target) : personToSide(puzzle, t, target, ask, 1)],
        near.map((i) => (i === null ? null : puzzle.people[i])),
        puzzle.people.filter((_, i) => i !== target)
      );
    },
    verify: ({ puzzle, target, ask }, value) =>
      sameEverywhere(puzzle, value, (a) => {
        const who = ask === 'opp' ? personOpposite(puzzle, a, target) : personToSide(puzzle, a, target, ask, 1);
        return who === null ? null : puzzle.people[who];
      }),
    render({ puzzle, target, ask }, { fmt }) {
      const question = ask === 'opp' ? `Who faces ${puzzle.people[target]}?` : `Who sits immediately to the ${ask} of ${puzzle.people[target]}?`;
      const row = target < 4 ? 'Row 1 faces south, so a Row 1 person’s left is towards the east end' : 'Row 2 faces north, so a Row 2 person’s left is towards the west end';
      return {
        context: contextOf(puzzle),
        question,
        explanation: `${layoutText(puzzle, puzzle.truth)} ${row}. So the answer is ${fmt(this.answer({ puzzle, target, ask }))}.`,
        solutionSteps: steps(puzzle),
        method: 'Draw both rows with arrows for the facing directions before reading left and right.',
        hints: [conventionHint(puzzle), 'People sitting face to face have their left and right hands on opposite ends of the rows.'],
        commonMistakes: ['Using the same left and right for both rows.', 'Taking "faces" to mean "sits next to".']
      };
    }
  },
  {
    id: 'sa-gen-circle',
    version: 1,
    topicId: TOPIC,
    conceptId: 'sa-circle',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['sa-circle-f'],
    formatValue: (v) => v,
    estimatedSeconds: 120,
    params(rng) {
      const puzzle = makeSeating(rng, { layout: 'circle', n: rng.pick([6, 8]), maxClues: 7 });
      if (!puzzle) return null;
      const target = rng.int(0, puzzle.people.length - 1);
      const ask = rng.pick(['opp', 'left', 'right']);
      const k = ask === 'opp' ? 0 : rng.int(1, 3);
      return { puzzle, target, ask, k };
    },
    answer: ({ puzzle, target, ask, k }) => puzzle.people[ask === 'opp' ? personOpposite(puzzle, puzzle.truth, target) : personToSide(puzzle, puzzle.truth, target, ask, k)],
    distractors: ({ puzzle, target, ask, k }) => {
      const t = puzzle.truth;
      const correct = ask === 'opp' ? personOpposite(puzzle, t, target) : personToSide(puzzle, t, target, ask, k);
      const mirror = ask === 'opp' ? personToSide(puzzle, t, target, 'left', 1) : personToSide(puzzle, t, target, ask === 'left' ? 'right' : 'left', k);
      return nameDistractors(puzzle.people[correct], [mirror, personToSide(puzzle, t, target, ask === 'right' ? 'right' : 'left', (k || 1) + 1)].map((i) => puzzle.people[i]), puzzle.people.filter((_, i) => i !== target));
    },
    verify: ({ puzzle, target, ask, k }, value) =>
      sameEverywhere(puzzle, value, (a) => puzzle.people[ask === 'opp' ? personOpposite(puzzle, a, target) : personToSide(puzzle, a, target, ask, k)]),
    render({ puzzle, target, ask, k }, { fmt }) {
      const question = ask === 'opp' ? `Who sits opposite ${puzzle.people[target]}?` : k === 1 ? `Who sits immediately to the ${ask} of ${puzzle.people[target]}?` : `Who sits ${ordinal(k)} to the ${ask} of ${puzzle.people[target]}?`;
      return {
        context: contextOf(puzzle),
        question,
        explanation: `${layoutText(puzzle, puzzle.truth)} Facing the centre, left is clockwise and right is anticlockwise, so the answer is ${fmt(this.answer({ puzzle, target, ask, k }))}.`,
        solutionSteps: steps(puzzle),
        method: 'Fix one person anywhere (a circle has no first seat), then place the others relative to them.',
        hints: [conventionHint(puzzle), `There are ${puzzle.people.length} seats, so opposite is ${puzzle.people.length / 2} seats away either way.`],
        commonMistakes: ['Taking left as anticlockwise for people facing the centre.', 'Counting the starting person as the first seat.']
      };
    }
  },
  {
    id: 'sa-gen-mixed',
    version: 1,
    topicId: TOPIC,
    conceptId: 'sa-mixed',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['sa-circle-f', 'sa-outward-f'],
    formatValue: (v) => v,
    estimatedSeconds: 180,
    params(rng) {
      const puzzle = makeSeating(rng, { layout: 'circle', n: 6, mixed: true, maxClues: 9 });
      if (!puzzle) return null;
      const target = rng.int(0, 5);
      const side = rng.pick(['left', 'right']);
      return { puzzle, target, side };
    },
    answer: ({ puzzle, target, side }) => puzzle.people[personToSide(puzzle, puzzle.truth, target, side, 1)],
    distractors: ({ puzzle, target, side }) =>
      nameDistractors(
        puzzle.people[personToSide(puzzle, puzzle.truth, target, side, 1)],
        [personToSide(puzzle, puzzle.truth, target, side === 'left' ? 'right' : 'left', 1), personOpposite(puzzle, puzzle.truth, target), personToSide(puzzle, puzzle.truth, target, side, 2)].map((i) => puzzle.people[i]),
        puzzle.people.filter((_, i) => i !== target)
      ),
    verify: ({ puzzle, target, side }, value) => sameEverywhere(puzzle, value, (a) => puzzle.people[personToSide(puzzle, a, target, side, 1)]),
    render({ puzzle, target, side }, { fmt }) {
      const who = puzzle.people[target];
      const faces = puzzle.truth.facing[target] === 'in' ? `faces the centre, so ${who}’s left is clockwise` : `faces away from the centre, so ${who}’s left is anticlockwise`;
      return {
        context: contextOf(puzzle),
        question: `Who sits immediately to the ${side} of ${puzzle.people[target]}?`,
        explanation: `${layoutText(puzzle, puzzle.truth)} ${puzzle.people[target]} ${faces}. So the answer is ${fmt(this.answer({ puzzle, target, side }))}.`,
        solutionSteps: steps(puzzle),
        method: 'Mark each person’s facing with an arrow before using their left or right.',
        hints: [conventionHint(puzzle), `First decide which way ${puzzle.people[target]} faces.`],
        commonMistakes: ['Using the facing-the-centre rule for someone who faces outwards.', 'Deciding facing directions last, after left and right have already been used.']
      };
    }
  },
  {
    id: 'sa-gen-cases',
    version: 1,
    topicId: TOPIC,
    conceptId: 'sa-cases',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['sa-cases-f'],
    estimatedSeconds: 150,
    params(rng) {
      // A few clues that leave a handful of arrangements, to be counted.
      const people = pickNames(rng, 5);
      const puzzle = { layout: 'row', people };
      const truth = truthFor(rng, puzzle);
      const pool = rng.shuffle(candidateClues(puzzle, truth).filter((c) => c.t !== 'pos' || c.k === 1));
      const clues = [];
      let left = allArrangements(puzzle);
      for (const clue of pool) {
        const next = filterBy(puzzle)(left, clue);
        if (next.length === left.length) continue;
        clues.push(clue);
        left = next;
        if (left.length <= 8) break;
      }
      if (left.length < 2 || left.length > 8 || clues.length > 4 || clues.length < 2) return null;
      return { puzzle: { ...puzzle, clues, truth }, count: left.length };
    },
    answer: ({ puzzle }) => solveSeating(puzzle).length,
    verify: ({ puzzle }, value) => solveSeatingGeometric(puzzle).length === value,
    render({ puzzle, count }) {
      return {
        context: contextOf(puzzle),
        question: 'How many different arrangements satisfy all the clues?',
        explanation: `Working case by case from the clue that fixes most, exactly ${count} orders of the five friends fit every clue. One of them is: ${layoutText(puzzle, puzzle.truth).replace('From the left end: ', '')}`,
        solutionSteps: [
          `Start with the most definite clue: "${clueText(puzzle, puzzle.clues[0])}" and write down each case it allows.`,
          'Extend each case with the next clues, crossing out any case that breaks one.',
          `Count the complete arrangements left: ${count}.`
        ],
        method: 'Branch on the first definite clue, then prune each branch.',
        hints: ['List every place the most definite clue allows as a separate case.', 'In each case, the people not mentioned in any clue can swap freely; count those orders too.'],
        commonMistakes: ['Forgetting that people mentioned in no clue can be arranged in several ways.', 'Counting a case twice when two clues describe the same pair.']
      };
    }
  }
];
