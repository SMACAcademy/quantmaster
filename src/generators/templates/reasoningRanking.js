/**
 * Order-and-ranking templates: positions from both ends, the total, people
 * between two others, interchanges, the smallest possible queue, and ranking
 * by comparisons.
 *
 * Answers use the formulas (total = L + R − 1 and the rest). `verify` uses the
 * brute-force solver instead (utils/reasoning/ranking.js: every row length and
 * every seat for the people named), or lays the row out and counts along it,
 * so a formula slip can never reach a learner. Comparisons are settled by
 * trying every order and checked by chaining the comparisons.
 */

import { betweenSeats, countFrom, fromOtherEnd, layOut, orderByChaining, ordinal, solveComparisons, solveRow, totalFrom } from '../../utils/reasoning/ranking.js';
import { NAMES, nameDistractors, pickClues, pickNames } from './reasoningShared.js';

const TOPIC = 'order-ranking';

const SETTINGS = [
  { row: 'a row of students facing north', ends: ['left', 'right'], noun: 'students' },
  { row: 'a queue at a railway ticket counter', ends: ['front', 'back'], noun: 'people' },
  { row: 'a class ranked by marks', ends: ['top', 'bottom'], noun: 'students' },
  { row: 'a line of children at the school assembly', ends: ['front', 'back'], noun: 'children' }
];

const only = (list) => (new Set(list).size === 1 ? list[0] : null);

export const rankingTemplates = [
  {
    id: 'or-gen-total',
    version: 1,
    topicId: TOPIC,
    conceptId: 'or-position',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['or-total-f'],
    estimatedSeconds: 35,
    params(rng) {
      const set = rng.pick(SETTINGS);
      const n = rng.int(12, 60);
      const left = rng.int(2, n - 1);
      return { set, name: rng.pick(NAMES), left, right: fromOtherEnd(n, left) };
    },
    answer: ({ left, right }) => totalFrom(left, right),
    verify: ({ left, right }, value) => only(solveRow({ people: 1, facts: [{ p: 0, k: left, from: 'left' }, { p: 0, k: right, from: 'right' }], maxN: 80 }).map((s) => s.n)) === value,
    render({ set, name, left, right }) {
      const [a, b] = set.ends;
      return {
        question: `In ${set.row}, ${name} is ${ordinal(left)} from the ${a} and ${ordinal(right)} from the ${b}. How many ${set.noun} are there in all?`,
        explanation: `${name} is counted from both ends, so ${name} is counted twice: total = ${left} + ${right} − 1 = ${left + right - 1}.`,
        solutionSteps: [`${left - 1} ${set.noun} are ahead of ${name} from the ${a}, and ${right - 1} from the ${b}.`, `Total = ${left - 1} + ${right - 1} + 1 (${name}) = ${left + right - 1}.`],
        method: 'Total = position from one end + position from the other end − 1.',
        hints: [`How many ${set.noun} are on each side of ${name}?`, 'Add the two positions and subtract 1, because the person is counted twice.'],
        commonMistakes: ['Adding the two positions without subtracting 1.', 'Adding 1 instead of subtracting it.']
      };
    }
  },
  {
    id: 'or-gen-other-end',
    version: 1,
    topicId: TOPIC,
    conceptId: 'or-position',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['or-other-end-f'],
    estimatedSeconds: 35,
    params(rng) {
      const set = rng.pick(SETTINGS);
      const n = rng.int(10, 60);
      return { set, name: rng.pick(NAMES), n, left: rng.int(2, n - 1) };
    },
    answer: ({ n, left }) => fromOtherEnd(n, left),
    verify: ({ n, left, name }, value) => countFrom(layOut(n, [left], [name]), name, 'right') === value,
    render({ set, name, n, left }) {
      const [a, b] = set.ends;
      return {
        question: `There are ${n} ${set.noun} in ${set.row}. ${name} is ${ordinal(left)} from the ${a}. What is ${name}’s position from the ${b}?`,
        explanation: `${left - 1} ${set.noun} are before ${name} from the ${a}, so ${n} − ${left} = ${n - left} are after. Position from the ${b} = ${n - left} + 1 = ${n - left + 1}.`,
        solutionSteps: [`Position from the ${b} = total − position from the ${a} + 1.`, `${n} − ${left} + 1 = ${n - left + 1}.`],
        method: 'From the other end = total − position + 1.',
        hints: [`How many ${set.noun} are after ${name}?`, 'Total − position + 1.'],
        commonMistakes: ['Forgetting the + 1 (answering total − position).', 'Subtracting 1 instead of adding it.']
      };
    }
  },
  {
    id: 'or-gen-between',
    version: 1,
    topicId: TOPIC,
    conceptId: 'or-between',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['or-other-end-f', 'or-between-f', 'or-sc-overlap'],
    estimatedSeconds: 70,
    params(rng) {
      const set = rng.pick(SETTINGS);
      const n = rng.int(15, 50);
      const a = rng.int(2, n - 1);
      const bLeft = rng.int(1, n);
      if (Math.abs(a - bLeft) < 2) return null;
      const [p, q] = pickNames(rng, 2);
      return { set, n, a, bRight: fromOtherEnd(n, bLeft), p, q };
    },
    answer: ({ n, a, bRight }) => betweenSeats(a, fromOtherEnd(n, bRight)),
    verify: ({ n, a, bRight }, value) => only(solveRow({ people: 2, facts: [{ total: n }, { p: 0, k: a, from: 'left' }, { p: 1, k: bRight, from: 'right' }], maxN: n }).map((s) => Math.abs(s.seats[0] - s.seats[1]) - 1)) === value,
    render({ set, n, a, bRight, p, q }) {
      const [l, r] = set.ends;
      const bLeft = fromOtherEnd(n, bRight);
      return {
        question: `There are ${n} ${set.noun} in ${set.row}. ${p} is ${ordinal(a)} from the ${l} and ${q} is ${ordinal(bRight)} from the ${r}. How many ${set.noun} are there between ${p} and ${q}?`,
        explanation: `${q} from the ${l}: ${n} − ${bRight} + 1 = ${bLeft}. Between positions ${Math.min(a, bLeft)} and ${Math.max(a, bLeft)} there are ${Math.abs(a - bLeft)} − 1 = ${Math.abs(a - bLeft) - 1}.`,
        solutionSteps: [`Count both from the ${l}: ${p} is ${a}, ${q} is ${n} − ${bRight} + 1 = ${bLeft}.`, `Between = |${a} − ${bLeft}| − 1 = ${Math.abs(a - bLeft) - 1}.`],
        method: 'Convert both positions to the same end, then subtract and take 1 away.',
        hints: [`Write ${q}’s position from the ${l}.`, 'Between two positions p and q there are |p − q| − 1 people.'],
        commonMistakes: ['Subtracting a position from the left from a position from the right.', 'Forgetting to take 1 away (counting one of the two people).']
      };
    }
  },
  {
    id: 'or-gen-interchange',
    version: 1,
    topicId: TOPIC,
    conceptId: 'or-interchange',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['or-swap-f', 'or-total-f'],
    estimatedSeconds: 100,
    params(rng) {
      const set = rng.pick(SETTINGS);
      const n = rng.int(14, 45);
      const a = rng.int(2, n - 1);
      const b = rng.int(2, n - 1);
      if (Math.abs(a - b) < 2) return null;
      const [p, q] = pickNames(rng, 2);
      // Facts: p from the left, q from the right; after the swap, p's new position from the left.
      return { set, n, p, q, pLeft: a, qRight: fromOtherEnd(n, b), pAfter: b };
    },
    answer: ({ qRight, pAfter }) => totalFrom(pAfter, qRight),
    verify: ({ pLeft, qRight, pAfter }, value) =>
      only(solveRow({ people: 2, facts: [{ p: 0, k: pLeft, from: 'left' }, { p: 1, k: qRight, from: 'right' }, { p: 0, k: pAfter, from: 'left', after: true }], swap: [0, 1], maxN: 80 }).map((s) => s.n)) === value,
    render({ set, n, p, q, pLeft, qRight, pAfter }) {
      const [l, r] = set.ends;
      return {
        question: `In ${set.row}, ${p} is ${ordinal(pLeft)} from the ${l} and ${q} is ${ordinal(qRight)} from the ${r}. When ${p} and ${q} interchange their places, ${p} becomes ${ordinal(pAfter)} from the ${l}. How many ${set.noun} are there in all?`,
        explanation: `After the swap ${p} stands where ${q} stood, so ${q}’s old place is ${ordinal(pAfter)} from the ${l}. It is also ${ordinal(qRight)} from the ${r}. Total = ${pAfter} + ${qRight} − 1 = ${n}.`,
        solutionSteps: [`${p}’s new place is ${q}’s old place: ${pAfter} from the ${l}.`, `That same place is ${qRight} from the ${r}.`, `Total = ${pAfter} + ${qRight} − 1 = ${n}.`],
        method: 'After an interchange, each person takes the other’s old place: pair the new position with the other person’s old position from the other end.',
        hints: [`Where does ${p} stand after the swap?`, `That place is ${q}’s old place, which you know from the ${r}.`],
        commonMistakes: [`Using ${p}’s old position (${pLeft}) with ${q}’s position.`, 'Forgetting to subtract 1.']
      };
    }
  },
  {
    id: 'or-gen-minimum',
    version: 1,
    topicId: TOPIC,
    conceptId: 'or-between',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['or-between-f', 'or-sc-min'],
    estimatedSeconds: 100,
    params(rng) {
      const a = rng.int(5, 18);
      const b = rng.int(5, 18);
      const k = rng.int(2, Math.min(a, b) - 2);
      const [p, q] = pickNames(rng, 2);
      return { a, b, k, p, q };
    },
    // Both orders: p ahead of q gives a + k + b; q ahead of p (overlap) gives a + b − k − 2, if possible.
    answer: ({ a, b, k }) => Math.min(a + k + b, a + b - k - 2),
    verify: ({ a, b, k }, value) => {
      const sols = solveRow({ people: 2, facts: [{ p: 0, k: a, from: 'left' }, { p: 1, k: b, from: 'right' }, { between: [0, 1], k }], maxN: 60 });
      return sols.length > 0 && Math.min(...sols.map((s) => s.n)) === value;
    },
    render({ a, b, k, p, q }) {
      const big = a + k + b;
      const small = a + b - k - 2;
      return {
        question: `In a queue, ${p} is ${ordinal(a)} from the front and ${q} is ${ordinal(b)} from the back. There are ${k} people between ${p} and ${q}. What is the smallest possible number of people in the queue?`,
        explanation: `Two cases. If ${p} is ahead of ${q}: ${a} + ${k} + ${b} = ${big}. If ${q} is ahead of ${p}, the counts overlap: ${q} is ${k + 1} places ahead of ${p}, so ${q} is ${a - k - 1} from the front and the queue has ${a - k - 1} + ${b} − 1 = ${small}. The smaller is ${Math.min(big, small)}.`,
        solutionSteps: [`${p} ahead: total = ${a} + ${k} + ${b} = ${big}.`, `${q} ahead: ${q} is ${a} − ${k} − 1 = ${a - k - 1} from the front; total = ${a - k - 1} + ${b} − 1 = ${small}.`, `Smallest: ${Math.min(big, small)}.`],
        method: 'When the order of the two people is not given, try both orders.',
        hints: [`Is ${p} necessarily ahead of ${q}? Try it both ways.`, `If ${q} is ahead, ${q} is ${k + 1} places in front of ${p}.`],
        commonMistakes: ['Taking only the case where the first person is ahead.', 'Adding the people between in the overlapping case instead of subtracting.']
      };
    }
  },
  {
    id: 'or-gen-compare',
    version: 1,
    topicId: TOPIC,
    conceptId: 'or-compare',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['or-compare-f'],
    formatValue: (v) => v,
    estimatedSeconds: 80,
    params(rng) {
      const n = rng.int(4, 6);
      const names = pickNames(rng, n);
      const truth = rng.shuffle(Array.from({ length: n }, (_, i) => i)); // most first
      const rank = [];
      truth.forEach((p, i) => {
        rank[p] = i;
      });
      const candidates = [];
      for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) if (rank[x] < rank[y] && rank[y] - rank[x] <= 2) candidates.push({ more: [x, y] });
      const clues = pickClues(rng.shuffle(candidates), solveComparisons(n, []), (list, c) => list.filter((o) => o.indexOf(c.more[0]) < o.indexOf(c.more[1])), (cs) => solveComparisons(n, cs), { maxClues: 7 });
      if (!clues) return null;
      const quality = rng.pick([
        { more: 'taller', less: 'shorter', most: 'tallest', least: 'shortest' },
        { more: 'heavier', less: 'lighter', most: 'heaviest', least: 'lightest' },
        { more: 'older', less: 'younger', most: 'oldest', least: 'youngest' },
        { more: 'richer', less: 'poorer', most: 'richest', least: 'poorest' }
      ]);
      const k = rng.int(1, n);
      // Some comparisons are written the other way round: "B is shorter than A".
      const flipped = clues.map(() => rng.chance(0.4));
      return { names, clues, truth, quality, k, flipped };
    },
    answer: ({ names, truth, k }) => names[truth[k - 1]],
    distractors: ({ names, truth, k }) => nameDistractors(names[truth[k - 1]], [names[truth[k - 2]], names[truth[k]], names[truth[names.length - k]]], names),
    verify: ({ names, clues, k }, value) => {
      const order = orderByChaining(names.length, clues);
      return Boolean(order) && names[order[k - 1]] === value;
    },
    render({ names, clues, truth, quality, k, flipped }, { fmt }) {
      const n = names.length;
      const label = k === 1 ? `the ${quality.most}` : k === n ? `the ${quality.least}` : `the ${ordinal(k)} ${quality.most}`;
      return {
        context: `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are friends.\n${clues.map((c, i) => (flipped[i] ? `${i + 1}. ${names[c.more[1]]} is ${quality.less} than ${names[c.more[0]]}.` : `${i + 1}. ${names[c.more[0]]} is ${quality.more} than ${names[c.more[1]]}.`)).join('\n')}`,
        question: `Who is ${label}?`,
        explanation: `Chaining the comparisons gives one order, ${quality.most} first: ${truth.map((p) => names[p]).join(' > ')}. ${cap(label)} is ${fmt(names[truth[k - 1]])}.`,
        solutionSteps: ['Write each comparison as A > B.', 'Join the chains where they share a person.', `Order: ${truth.map((p) => names[p]).join(' > ')}.`],
        method: 'Chain the comparisons into one line, biggest first.',
        hints: ['Find someone no one is above: that is the top of the line.', 'Join two comparisons that share a person: A > B and B > C give A > B > C.'],
        commonMistakes: [`Reading "A is ${quality.less} than B" as A above B.`, 'Placing someone before checking every comparison that mentions them.']
      };
    }
  }
];

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
