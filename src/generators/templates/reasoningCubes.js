/**
 * Cubes-and-dice templates: painted cubes and cuboids cut into unit cubes,
 * opposite faces from views of a die, nets, and stacks of standard dice.
 *
 * Painted counts: the answer multiplies out, axis by axis, how many layers
 * carry paint ((n − p) + p·t for an axis with p painted ends, read off as a
 * polynomial in t); `verify` visits every small cube and counts its painted
 * faces. Dice: the answer is read from the hidden die; `verify` finds every die
 * that shows the printed views with arrows and determinants
 * (solveDiceByVectors) and needs them all to agree. Nets: folded with arrows
 * for the answer, and checked by rolling a die across the net.
 */

import {
  CUBE_NETS,
  FACES,
  OPPOSITE_FACE,
  ROTATIONS,
  netOpposites,
  netOppositesByRolling,
  oppositeByAdjacency,
  oppositeMap,
  oppositeOfByVectors,
  paintedCounts,
  rotate,
  solveDice
} from '../../utils/reasoning/cubes.js';

const TOPIC = 'cubes-dice';
const WORD = ['no face', 'exactly one face', 'exactly two faces', 'exactly three faces'];

/** Counts with 0, 1, 2, 3 painted faces from the layer polynomial Π((len − p) + p·t). */
function byPolynomial(lengths, paintedEnds) {
  let poly = [1];
  lengths.forEach((len, i) => {
    // Of the len layers across this direction, p touch a painted face (len is at least 2).
    const p = paintedEnds[i];
    const factor = [len - p, p];
    const next = Array(poly.length + factor.length - 1).fill(0);
    poly.forEach((a, x) => factor.forEach((b, y) => {
      next[x + y] += a * b;
    }));
    poly = next;
  });
  const out = [0, 0, 0, 0];
  poly.forEach((v, k) => {
    out[Math.min(k, 3)] += v;
  });
  return out;
}

const PAINT_CASES = [
  { faces: FACES, text: 'on all six faces', ends: [2, 2, 2] },
  { faces: FACES.filter((f) => f !== 'bottom'), text: 'on all its faces except the bottom', ends: [2, 2, 1] },
  { faces: ['top', 'bottom'], text: 'on the top and bottom faces only', ends: [0, 0, 2] },
  { faces: ['top', 'bottom', 'front', 'back'], text: 'on four faces (top, bottom, front and back), leaving the left and right faces unpainted', ends: [0, 2, 2] },
  { faces: ['top', 'front', 'right'], text: 'on three faces that meet at one corner (top, front and right)', ends: [1, 1, 1] }
];

const askText = (k) => (k === 'any' ? 'at least one painted face' : `${WORD[k]} painted`);
const pick = (counts, k) => (k === 'any' ? counts[1] + counts[2] + counts[3] : counts[k]);

function paintTemplate({ id, conceptId, difficulty, cuboid, partial, formulaIds, estimatedSeconds }) {
  return {
    id,
    version: 1,
    topicId: TOPIC,
    conceptId,
    difficulty,
    type: 'numerical_input',
    formulaIds,
    estimatedSeconds,
    params(rng) {
      const dims = cuboid ? [rng.int(3, 8), rng.int(3, 7), rng.int(2, 6)] : Array(3).fill(rng.int(3, 10));
      if (cuboid && new Set(dims).size < 2) return null;
      const paint = partial ? rng.pick(PAINT_CASES.slice(1)) : PAINT_CASES[0];
      const k = rng.pick(partial ? [0, 1, 2, 'any'] : [0, 1, 2, 3, 'any']);
      if (pick(paintedCounts(...dims, paint.faces), k) === 0 && rng.chance(0.7)) return null;
      return { dims, paint, k, colour: rng.pick(['red', 'blue', 'green', 'yellow']) };
    },
    answer: ({ dims, paint, k }) => {
      // Map paint.ends (x, y, z = left–right, front–back, bottom–top) onto the dims.
      return pick(byPolynomial(dims, paint.ends), k);
    },
    verify: ({ dims, paint, k }, value) => pick(paintedCounts(...dims, paint.faces), k) === value,
    render({ dims, paint, k, colour }) {
      const [a, b, c] = dims;
      const counts = byPolynomial(dims, paint.ends);
      const block = cuboid ? `A ${a} cm × ${b} cm × ${c} cm cuboid (length × breadth × height)` : `A cube of side ${a} cm`;
      const full = paint === PAINT_CASES[0];
      const how = full
        ? cuboid
          ? `Corners: 8. Edges (not corners): 4 × (${a - 2} + ${b - 2} + ${c - 2}) = ${counts[2]}. Faces (inside the edges): 2 × (${a - 2}×${b - 2} + ${b - 2}×${c - 2} + ${a - 2}×${c - 2}) = ${counts[1]}. Hidden inside: ${a - 2} × ${b - 2} × ${c - 2} = ${counts[0]}.`
          : `With n = ${a}: three faces 8, two faces 12(n − 2) = ${counts[2]}, one face 6(n − 2)² = ${counts[1]}, none (n − 2)³ = ${counts[0]}.`
        : `Along each direction, count the layers that touch a painted face. Counts: none ${counts[0]}, one face ${counts[1]}, two faces ${counts[2]}, three faces ${counts[3]}.`;
      const total = a * b * c;
      return {
        question: `${block} is painted ${colour} ${paint.text} and then cut into 1 cm cubes. How many of the small cubes have ${askText(k)}?`,
        explanation: `${how} ${k === 'any' ? `At least one painted face: ${total} − ${counts[0]} = ${pick(counts, k)}.` : ''} Check: ${counts.join(' + ')} = ${total} small cubes.`,
        solutionSteps: [
          `Total small cubes: ${a} × ${b} × ${c} = ${total}.`,
          full ? 'Corners have 3 painted faces, the rest of the edges 2, the rest of the faces 1, the inside none.' : 'Picture each unpainted face as if it were not there: the cubes along it lose a painted face.',
          `Answer: ${pick(counts, k)}.`
        ],
        method: full ? 'Corners 8, edges 12(n − 2), faces 6(n − 2)², inside (n − 2)³.' : 'Count layer by layer: along each direction, how many layers touch a painted face?',
        hints: [
          'Sort the small cubes into corners, edges, faces and the hidden inside.',
          full ? 'Take away the outer layer on each side: an inside block of (n − 2) on each edge is left.' : 'Which of the corners and edges are still on two or three painted faces?'
        ],
        commonMistakes: ['Using n instead of n − 2 (forgetting the corners at each end of an edge).', 'Counting the corners again among the edge cubes.']
      };
    }
  };
}

const LABEL_SETS = [
  ['1', '2', '3', '4', '5', '6'],
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['P', 'Q', 'R', 'S', 'T', 'U'],
  ['★', '●', '▲', '■', '◆', '✚']
];

/** A random view of a die (labels on faces): one of its 24 turns. */
function randomView(rng, die) {
  const turned = rotate(die, rng.pick(ROTATIONS));
  return { top: turned[0], front: turned[2], right: turned[4] };
}

export const cubesTemplates = [
  paintTemplate({ id: 'cb-gen-paint', conceptId: 'cb-paint', difficulty: 'easy', formulaIds: ['cb-paint-f', 'cb-sc-check'], estimatedSeconds: 50 }),
  paintTemplate({ id: 'cb-gen-cuboid', conceptId: 'cb-cuboid', difficulty: 'complex', cuboid: true, formulaIds: ['cb-cuboid-f', 'cb-sc-check'], estimatedSeconds: 100 }),
  paintTemplate({ id: 'cb-gen-partial', conceptId: 'cb-cuboid', difficulty: 'complex', partial: true, formulaIds: ['cb-paint-f', 'cb-cuboid-f'], estimatedSeconds: 110 }),
  {
    id: 'cb-gen-cuts',
    version: 1,
    topicId: TOPIC,
    conceptId: 'cb-paint',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cb-cuts-f'],
    estimatedSeconds: 50,
    params(rng) {
      const n = rng.int(2, 9);
      return { n, ask: rng.pick(['cuts', 'pieces']) };
    },
    answer: ({ n, ask }) => (ask === 'cuts' ? 3 * (n - 1) : ask === 'pieces' ? n ** 3 : n),
    // Count pieces from cuts by brute force: every combination of slab, column and row.
    verify: ({ n, ask }, value) => {
      if (ask === 'cuts') {
        // Fewest straight cuts (no restacking) giving n³ equal cubes: n − 1 along each direction.
        let best = Infinity;
        for (let x = 0; x <= 3 * n; x++) for (let y = 0; y <= 3 * n; y++) for (let z = 0; z <= 3 * n; z++) {
          if ((x + 1) * (y + 1) * (z + 1) === n ** 3 && x === y && y === z) best = Math.min(best, x + y + z);
        }
        return best === value;
      }
      let count = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) count++;
      return count === value;
    },
    render({ n, ask }) {
      const cuts = 3 * (n - 1);
      const q = {
        cuts: `A wooden cube is to be cut into ${n ** 3} identical smaller cubes. How many straight cuts are needed at the least (the pieces are not moved or stacked between cuts)?`,
        pieces: `A cube is cut by ${n - 1} cut${n === 2 ? '' : 's'} parallel to each pair of opposite faces (${cuts} cuts in all), equally spaced. How many small cubes are made?`
      }[ask];
      return {
        question: q,
        explanation: `${n} small cubes along each edge means ${n} × ${n} × ${n} = ${n ** 3} small cubes, made by ${n} − 1 = ${n - 1} cuts in each of the three directions: ${cuts} cuts.`,
        solutionSteps: [`n³ = ${n ** 3}, so n = ${n}.`, `${n - 1} cuts in each direction, 3 directions: ${cuts}.`],
        method: 'n small cubes along an edge: n³ cubes from 3(n − 1) cuts.',
        hints: ['How many small cubes lie along one edge?', 'n pieces along a line need n − 1 cuts; there are three directions.'],
        commonMistakes: ['Using n cuts for n pieces in a line (it is n − 1).', 'Counting cuts in one direction only.']
      };
    }
  },
  {
    id: 'cb-gen-views',
    version: 1,
    topicId: TOPIC,
    conceptId: 'cb-opposite',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cb-views-f', 'cb-sc-same'],
    formatValue: (v) => v,
    estimatedSeconds: 80,
    params(rng) {
      const labels = rng.pick(LABEL_SETS);
      const die = rng.shuffle(labels);
      const count = rng.int(2, 3);
      const views = Array.from({ length: count }, () => randomView(rng, die));
      if (new Set(views.map((v) => `${v.top}${v.front}${v.right}`)).size < count) return null;
      const opp = {};
      die.forEach((l, p) => {
        opp[l] = die[OPPOSITE_FACE[p]];
      });
      // Ask about a label every fitting die agrees on, shown in at least one view.
      const shown = [...new Set(views.flatMap((v) => [v.top, v.front, v.right]))];
      const dice = solveDice(labels, views);
      const askable = shown.filter((l) => new Set(dice.map((d) => oppositeMap(d)[l])).size === 1);
      if (!askable.length) return null;
      const ask = rng.pick(askable);
      return { labels, views, ask, answer: opp[ask] };
    },
    answer: ({ answer }) => answer,
    distractors: ({ labels, views, ask }) => {
      const beside = [...new Set(views.filter((v) => [v.top, v.front, v.right].includes(ask)).flatMap((v) => [v.top, v.front, v.right]))];
      return [...beside, ...labels].filter((l) => l !== ask).map((value) => ({ value, why: 'a face seen next to it' }));
    },
    verify: ({ labels, views, ask }, value) => {
      const found = oppositeOfByVectors(labels, views, ask);
      return found.length === 1 && found[0] === value;
    },
    render({ labels, views, ask, answer }, { fmt }) {
      const simple = oppositeByAdjacency(labels, views, ask);
      const beside = [...new Set(views.filter((v) => [v.top, v.front, v.right].includes(ask)).flatMap((v) => [v.top, v.front, v.right]))].filter((l) => l !== ask);
      return {
        question: `${views.length} different views of the same die are shown. Which symbol is on the face opposite ${ask}?`,
        context: views.map((v, i) => `View ${i + 1}: top ${v.top}, front ${v.front}, right ${v.right}.`).join('\n'),
        figure: {
          type: 'dice',
          views,
          caption: 'Views of one die: top, front and right faces',
          ariaSummary: views.map((v, i) => `View ${i + 1}: ${v.top} on top, ${v.front} in front, ${v.right} on the right.`).join(' ')
        },
        explanation: simple
          ? `Faces seen next to ${ask}: ${beside.join(', ')}. A face that touches ${ask} cannot be opposite it, so the one face never seen with ${ask}, ${fmt(answer)}, is opposite.`
          : `Faces seen next to ${ask} (${beside.join(', ')}) are not opposite it. To settle the rest, turn one view until it matches another on a common face, then read off the matching positions: ${fmt(answer)} is opposite ${ask}.`,
        solutionSteps: [
          `List the faces seen beside ${ask}: ${beside.join(', ')}.`,
          'Faces in the same view are never opposite each other.',
          `Opposite ${ask}: ${answer}.`
        ],
        method: 'Rule out every face seen with it; if one is left, that is the opposite face. Otherwise line two views up on a common face.',
        hints: [`Which faces appear in a view together with ${ask}?`, 'If two views share a face in the same position, the faces in the other matching positions are opposite.'],
        commonMistakes: ['Choosing a face that appears next to it in some view.', 'Matching views on a common face but not keeping the turning direction.']
      };
    }
  },
  {
    id: 'cb-gen-net',
    version: 1,
    topicId: TOPIC,
    conceptId: 'cb-standard',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cb-net-f'],
    formatValue: (v) => v,
    estimatedSeconds: 60,
    params(rng) {
      const net = rng.pick(CUBE_NETS);
      const labels = rng.shuffle(rng.pick(LABEL_SETS));
      const cells = net.map(([c, r], i) => [c, r, labels[i]]);
      return { cells, ask: rng.pick(labels) };
    },
    answer: ({ cells, ask }) => netOpposites(cells)[ask],
    distractors: ({ cells, ask }) => cells.map((c) => c[2]).filter((l) => l !== ask).map((value) => ({ value, why: 'a face that touches it' })),
    verify: ({ cells, ask }, value) => netOppositesByRolling(cells)?.[ask] === value,
    render({ cells, ask }, { fmt }) {
      const answer = netOpposites(cells)[ask];
      return {
        question: `The net shown is folded to make a cube. Which symbol is on the face opposite ${ask}?`,
        figure: {
          type: 'dice',
          net: cells,
          caption: 'A net of a cube',
          ariaSummary: `A net of six squares: ${cells.map(([c, r, l]) => `${l} at column ${c + 1}, row ${r + 1}`).join('; ')}.`
        },
        explanation: `Fold the net round one face at a time. Two squares that are next to each other on the net become neighbours on the cube; in a straight line of three squares, the two ends become opposite. ${ask} is opposite ${fmt(answer)}.`,
        solutionSteps: ['Pick a square as the base and fold the others up round it.', 'In any straight line of three squares, the first and third are opposite.', `${ask} ↔ ${answer}.`],
        method: 'Two squares with exactly one square between them in a straight line are opposite.',
        hints: [`Find a straight line of three squares with ${ask} at one end.`, 'Squares that share an edge on the net can never be opposite.'],
        commonMistakes: ['Choosing a square that shares an edge with it.', 'Applying the "skip one" rule round a corner.']
      };
    }
  },
  {
    id: 'cb-gen-standard',
    version: 1,
    topicId: TOPIC,
    conceptId: 'cb-standard',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['cb-standard-f'],
    estimatedSeconds: 60,
    params(rng) {
      const n = rng.int(2, 4);
      const top = rng.int(1, 6);
      return { n, top, mode: rng.pick(['stack', 'bottom']), front: rng.pick([1, 2, 3, 4, 5, 6].filter((x) => x !== top && x !== 7 - top)) };
    },
    answer: ({ n, top, mode, front }) => (mode === 'stack' ? 7 * n - top : 7 - front),
    // Stack: try every way the lower dice could be turned; the hidden total never changes.
    verify: ({ n, top, mode, front }, value) => {
      if (mode === 'bottom') {
        // A standard die: 1–6, 2–5, 3–4 opposite. Find the back face directly from that list.
        const pairs = [[1, 6], [2, 5], [3, 4]];
        const pair = pairs.find((p) => p.includes(front));
        return pair[0] + pair[1] - front === value;
      }
      const totals = new Set();
      const tops = Array(n - 1).fill(1);
      for (;;) {
        // Horizontal faces: every die's top and bottom, then hide the top of the top die.
        let hidden = 0;
        for (const t of [...tops, top]) hidden += t + (7 - t);
        totals.add(hidden - top);
        let i = 0;
        while (i < tops.length && tops[i] === 6) tops[i++] = 1;
        if (i === tops.length) break;
        tops[i] += 1;
      }
      return totals.size === 1 && [...totals][0] === value;
    },
    render({ n, top, mode, front }) {
      if (mode === 'bottom') {
        return {
          question: `A standard die (opposite faces add to 7) shows ${top} on top and ${front} at the front. What number is on the back face?`,
          explanation: `The back is opposite the front: 7 − ${front} = ${7 - front}.`,
          solutionSteps: ['Opposite faces of a standard die add to 7.', `Back = 7 − front = ${7 - front}.`],
          method: 'Opposite faces of a standard die add to 7.',
          hints: ['Which face is opposite the front?', 'Opposite faces add to 7.'],
          commonMistakes: [`Using the top (${top}) instead of the front.`, 'Thinking the back is next to the front.']
        };
      }
      return {
        question: `${n} standard dice (opposite faces add to 7) are stacked one on another on a table. The top face of the stack shows ${top}. What is the total of the dots on all the horizontal faces that cannot be seen (the faces where dice touch each other and the table)?`,
        explanation: `Every die has a top and a bottom adding to 7, so all the horizontal faces add to 7 × ${n} = ${7 * n}. Only the top of the stack (${top}) can be seen: ${7 * n} − ${top} = ${7 * n - top}.`,
        solutionSteps: [`Horizontal faces: one top and one bottom per die, ${n} × 7 = ${7 * n}.`, `Take away the visible top: ${7 * n} − ${top} = ${7 * n - top}.`],
        method: 'Each die’s top and bottom add to 7, however it is turned.',
        hints: ['You do not need to know how the lower dice are turned.', 'Top + bottom of every die is 7.'],
        commonMistakes: ['Trying to work out each hidden face separately.', 'Forgetting the bottom face resting on the table.']
      };
    }
  }
];
