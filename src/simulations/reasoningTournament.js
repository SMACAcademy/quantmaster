/**
 * Logical sets: a four-team round robin. Each of the six results is a choice;
 * the crosstable, points and positions follow, and the readouts show why the
 * total is fixed (2 per match with 2-1-0 scoring, 3 per match minus the draws
 * with 3-1-0) and how many complete sets of results would give the very same
 * points table, counted by trying all 3^6 = 729 (utils/reasoning/tournament.js).
 * Plot kind: points (components/reasoningPlotsTournament.js).
 */

import { SCORINGS, pairs, pointsOf, positionsOf, solveTableByCounting, totalPoints } from '../utils/reasoning/tournament.js';
import { ordinal } from '../utils/reasoning/ranking.js';

const TEAMS = ['Chennai', 'Delhi', 'Kolkata', 'Mumbai'];
const PAIRS = pairs(4);
const KEYS = PAIRS.map(([i, j]) => `${TEAMS[i][0]}${TEAMS[j][0]}`.toLowerCase());
const SHORT = (t) => TEAMS[t].slice(0, 3).toUpperCase();

/** How many of the 729 result sets give each points table, per scoring (counted once). */
const tableCounts = new Map();
function countFor(scoringId, points) {
  if (!tableCounts.has(scoringId)) {
    const counts = new Map();
    for (const results of solveTableByCounting({ n: 4, points: [null, null, null, null], scoring: SCORINGS[scoringId] })) {
      const key = pointsOf(4, results, SCORINGS[scoringId]).join(',');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    tableCounts.set(scoringId, counts);
  }
  return tableCounts.get(scoringId).get(points.join(',')) || 0;
}

const matchOf = (t, u) => PAIRS.findIndex(([i, j]) => (i === t && j === u) || (i === u && j === t));
/** Team t's result in its match against the other team of pair [i, j]: W, D or L. */
const resultFor = (r, t, [i]) => (r === 'd' ? 'D' : (r === 'h') === (t === i) ? 'W' : 'L');

export const roundRobin = {
  id: 'round-robin',
  topicId: 'logical-sets',
  title: 'A round-robin points table',
  summary: 'Enter the six results of a four-team league and watch the crosstable, points and places update. The total is fixed by the number of matches (and the draws), and a count shows how many full sets of results give the same table: totals pin down the unknowns.',
  controls: [
    {
      id: 'scoring',
      label: 'Points for win, draw, loss',
      type: 'choice',
      options: [
        { id: '2-1-0', label: '2-1-0 (cricket)' },
        { id: '3-1-0', label: '3-1-0 (football)' }
      ],
      default: '2-1-0'
    },
    ...PAIRS.map(([i, j], k) => ({
      id: KEYS[k],
      label: `${TEAMS[i]} v ${TEAMS[j]}`,
      type: 'choice',
      options: [
        { id: 'h', label: `${TEAMS[i]} won` },
        { id: 'd', label: 'Drawn' },
        { id: 'a', label: `${TEAMS[j]} won` }
      ],
      default: 'h'
    }))
  ],
  compute(values) {
    const scoring = SCORINGS[values.scoring];
    const results = KEYS.map((key) => values[key]);
    const points = pointsOf(4, results, scoring);
    const positions = positionsOf(points);
    const draws = results.filter((r) => r === 'd').length;
    const total = totalPoints(6, draws, scoring);
    const count = countFor(values.scoring, points);
    const tied = (t) => positions.filter((p) => p === positions[t]).length > 1;
    const placeText = (t) => `${ordinal(positions[t])}${tied(t) ? '=' : ''}`;
    const order = [0, 1, 2, 3].sort((a, b) => points[b] - points[a] || a - b);
    const three = values.scoring === '3-1-0';
    return {
      numbers: { scoring: values.scoring, points, positions, draws, total, count },
      readouts: [
        { label: 'Points', value: order.map((t) => `${TEAMS[t]} ${points[t]}`).join(', ') },
        { label: 'Places', value: order.map((t) => `${TEAMS[t]} ${placeText(t)}`).join(', ') },
        { label: 'Total points', value: three ? `3 × 6 − ${draws} draw${draws === 1 ? '' : 's'} = ${total}` : `2 × 6 matches = ${total}, whatever happens` },
        { label: 'Result sets giving this table', value: `${count} of 729` }
      ],
      plot: {
        kind: 'points',
        teams: TEAMS.map((name, t) => ({ name, short: SHORT(t), points: points[t], place: placeText(t) })),
        grid: [0, 1, 2, 3].map((t) => [0, 1, 2, 3].map((u) => (t === u ? null : resultFor(results[matchOf(t, u)], t, PAIRS[matchOf(t, u)])))),
        matches: PAIRS.map(([i, j], k) => ({ label: `${SHORT(i)}–${SHORT(j)}`, given: results[k] === 'd' ? 2 * scoring.draw : scoring.win + scoring.loss, drawn: results[k] === 'd' })),
        most: 6 * Math.max(scoring.win + scoring.loss, 2 * scoring.draw),
        total,
        count,
        summary: `Points: ${order.map((t) => `${TEAMS[t]} ${points[t]}`).join(', ')}. ${draws} of the 6 matches drawn; ${total} points given out in all. ${count === 1 ? 'Only this set of results gives this table.' : `${count} different sets of results give this table.`}`
      },
      insight:
        count === 1
          ? `Only one set of the 729 possible results gives this table: the totals leave no room for anything else.${three ? '' : ' With 2-1-0 the total is always 12, so it is each team’s own points that do the work.'}`
          : three
            ? `${count} sets of results give these points. The total still tells you the draws (18 − ${total} = ${draws}); which matches they were is what the table leaves open.`
            : `${count} sets of results give these points. With 2-1-0 every match gives out 2 points, so a draw (1 + 1) and a win (2 + 0) look alike in the total.`
    };
  },
  tasks: [
    {
      id: 'level',
      prompt: 'Make all four teams finish level on points.',
      check: (values, n) => n.points.every((p) => p === n.points[0]),
      solution: Object.fromEntries(KEYS.map((key) => [key, 'd']))
    },
    {
      id: 'sixteen',
      prompt: 'With 3-1-0 scoring, make the points table add up to 16. How many draws does that take?',
      check: (values, n) => n.scoring === '3-1-0' && n.total === 16,
      solution: { scoring: '3-1-0', cd: 'd', ck: 'd' }
    },
    {
      id: 'many-ways',
      prompt: 'With no draws at all, find results whose points table could also come from a different set of results.',
      check: (values, n) => n.draws === 0 && n.count > 1,
      solution: { scoring: '2-1-0', cd: 'h', dk: 'h', ck: 'a' }
    },
    {
      id: 'one-draw',
      prompt: 'With 3-1-0 scoring and exactly one draw, find a table that only one set of results can give.',
      check: (values, n) => n.scoring === '3-1-0' && n.draws === 1 && n.count === 1,
      solution: { scoring: '3-1-0', cd: 'd' }
    }
  ]
};

export const tournamentSims = [roundRobin];
