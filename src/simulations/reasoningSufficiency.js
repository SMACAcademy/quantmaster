/**
 * Data sufficiency with arrangements (topic reasoning-data-sufficiency): every
 * way four friends can sit in a row, drawn as little rows of seats. Switching a
 * statement on strikes out the rows it rules out; the data is sufficient only
 * when every row left gives the same answer, even if several rows are left.
 * The rows and the answers come from the same brute-force solver the question
 * generators use (src/utils/reasoning/sufficiency.js).
 * Plot kind: arrangements (components/reasoningPlotsSufficiency.js).
 */

import { allArrangements, clueHolds } from '../utils/reasoning/seating.js';
import { DS_LETTERS, arrangementAskText, arrangementClueText, arrangementSets, arrangementValueText, settled, verdict } from '../utils/reasoning/sufficiency.js';

const PEOPLE = ['Anu', 'Bala', 'Chitra', 'Dinesh'];
const [ANU, BALA, CHITRA, DINESH] = [0, 1, 2, 3];
const problem = (base, one, two, ask) => ({ kind: 'arrangement', layout: 'row', setting: 'row', people: PEOPLE, base, one, two, ask });

/** Three problems with different answers: C, D and E. */
export const DS_ARRANGEMENT_PROBLEMS = {
  p1: problem([{ t: 'notEnd', p: DINESH }], [{ t: 'side', p: BALA, q: ANU, side: 'right', k: 1 }], [{ t: 'pos', p: CHITRA, k: 1, from: 'right' }], { q: 'at', seat: 0 }),
  p2: problem(
    [],
    [{ t: 'end', p: ANU }, { t: 'side', p: BALA, q: ANU, side: 'right', k: 1 }],
    [{ t: 'notEnd', p: CHITRA }, { t: 'side', p: CHITRA, q: ANU, side: 'right', k: 2 }],
    { q: 'at', seat: 0 }
  ),
  p3: problem([{ t: 'notEnd', p: DINESH }], [{ t: 'adj', p: ANU, q: BALA }], [{ t: 'end', p: CHITRA }], { q: 'at', seat: 3 })
};

const OPTION_WORDS = {
  A: '(1) alone is enough, (2) alone is not',
  B: '(2) alone is enough, (1) alone is not',
  C: 'both together, but neither alone',
  D: 'each statement alone is enough',
  E: 'not even both together'
};
const onOff = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: 'On' }
];
const list = (names) => (names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`);

export const dsArrangements = {
  id: 'ds-arrangements',
  topicId: 'reasoning-data-sufficiency',
  title: 'Enough to seat them? Strike out the rows',
  summary: 'Every way four friends can sit in a row, as little rows of seats. Switch each statement on and watch it strike out the rows it rules out. The data is sufficient when every row left gives the same answer, even if more than one row is left.',
  controls: [
    {
      id: 'problem',
      label: 'Problem',
      type: 'choice',
      options: [
        { id: 'p1', label: 'Problem 1' },
        { id: 'p2', label: 'Problem 2' },
        { id: 'p3', label: 'Problem 3' }
      ],
      default: 'p1'
    },
    { id: 'one', label: 'Statement (1)', type: 'choice', options: onOff, default: 'off' },
    { id: 'two', label: 'Statement (2)', type: 'choice', options: onOff, default: 'off' }
  ],
  compute({ problem: id, one, two }) {
    const p = DS_ARRANGEMENT_PROBLEMS[id];
    const puzzle = { layout: p.layout, people: p.people };
    const on1 = one === 'on';
    const on2 = two === 'on';
    const holdsAll = (clues, a) => clues.every((c) => clueHolds(puzzle, a, c));
    const rows = allArrangements(puzzle)
      .filter((a) => holdsAll(p.base, a))
      .map((a) => {
        const breaks1 = on1 && !holdsAll(p.one, a);
        const breaks2 = on2 && !holdsAll(p.two, a);
        return {
          seats: a.seats.map((i) => p.people[i]),
          answer: a.seats[p.ask.seat],
          out: breaks1 || breaks2,
          by: breaks1 && breaks2 ? '(1) and (2)' : breaks1 ? '(1)' : breaks2 ? '(2)' : null
        };
      });
    const left = rows.filter((r) => !r.out);
    const answers = [...new Set(left.map((r) => r.answer))].sort((x, y) => x - y);
    const names = answers.map((v) => arrangementValueText(p, v));
    const option = DS_LETTERS[verdict(arrangementSets(p))];
    const enough = settled(answers);
    const switched = on1 && on2 ? '(1) and (2)' : on1 ? '(1) alone' : on2 ? '(2) alone' : 'None yet';
    const say = (clues) => clues.map((c) => arrangementClueText(p, c)).join(' ');
    const question = arrangementAskText(p);
    return {
      numbers: { on1, on2, rows: rows.length, left: left.length, answers: answers.length, enough, option },
      readouts: [
        { label: 'Statements on', value: switched },
        { label: 'Rows left', value: `${left.length} of ${rows.length}` },
        { label: 'Possible answers', value: names.length ? list(names) : 'none' },
        { label: 'Enough to answer?', value: enough ? `Yes: ${names[0]}` : `No: ${names.length} answers remain` },
        { label: 'DS answer for this problem', value: `${option}: ${OPTION_WORDS[option]}` }
      ],
      plot: {
        kind: 'arrangements',
        question,
        given: say(p.base),
        statements: [
          { label: '(1)', text: say(p.one), on: on1 },
          { label: '(2)', text: say(p.two), on: on2 }
        ],
        seats: p.people.length,
        askSeat: p.ask.seat,
        rows,
        answers: names,
        enough,
        badge: `DS answer: ${option}`,
        summary: `${question} ${p.base.length ? `Given: ${say(p.base)} ` : ''}${rows.length} possible rows. With ${switched.toLowerCase()} switched on, ${left.length} ${left.length === 1 ? 'row is' : 'rows are'} left and the answer could be ${names.length ? list(names) : 'nothing'}: ${enough ? 'sufficient' : 'not sufficient'}. The DS answer is ${option}.`
      },
      insight:
        !on1 && !on2
          ? `${rows.length} rows fit the given information, with ${names.length} different answers. Switch statement (1) on, then (2), and watch rows being struck out.`
          : enough
            ? `${left.length === 1 ? 'One row is left' : `${left.length} rows are left, but they all agree`}: ${names[0]}. That is sufficient.${on1 && on2 && option === 'C' ? ' Neither statement did it alone, so the answer is C.' : ''}`
            : on1 && on2
              ? `Even with both statements, ${list(names)} could be the answer, so the answer is E.`
              : `${left.length} rows are left and they disagree (${list(names)}), so this is not sufficient: sufficient means one answer, not merely fewer rows.`
    };
  },
  tasks: [
    {
      id: 'one-alone',
      prompt: 'In problem 1, switch on statement (1) alone. Two rows are left: why is that not enough?',
      check: (values) => values.problem === 'p1' && values.one === 'on' && values.two === 'off',
      solution: { problem: 'p1', one: 'on', two: 'off' }
    },
    {
      id: 'together',
      prompt: 'Find the problem where neither statement alone is enough but both together are (answer C), and switch both on.',
      check: (values, n) => n.option === 'C' && n.on1 && n.on2,
      solution: { problem: 'p1', one: 'on', two: 'on' }
    },
    {
      id: 'each',
      prompt: 'Find the problem where each statement alone is enough (answer D). Show it with only statement (1) on: two rows are left, yet the answer is fixed.',
      check: (values, n) => n.option === 'D' && n.on1 && !n.on2 && n.enough && n.left > 1,
      solution: { problem: 'p2', one: 'on', two: 'off' }
    },
    {
      id: 'never',
      prompt: 'Find the problem where even both statements leave more than one answer (answer E), with both on.',
      check: (values, n) => n.option === 'E' && n.on1 && n.on2,
      solution: { problem: 'p3', one: 'on', two: 'on' }
    }
  ]
};

export const sufficiencySims = [dsArrangements];
