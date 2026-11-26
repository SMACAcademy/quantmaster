/**
 * More logical-reasoning simulations: a walker following directions, two
 * alphabet wheels for letter codes, a row of people counted from both ends, a
 * cube cut into small cubes (and a die's net), and paper folded and punched
 * (with a mirror-clock mode). Each works its picture out with the same solvers
 * the question generators use (src/utils/reasoning), so what the learner sees
 * is what the rules give.
 * Plot kinds: walk, wheels, queue, cubes, fold, mirrorclock (components/reasoningPlotsMore.js).
 */

import { DIRS, directionOf, stepText, walkRoute } from '../utils/reasoning/direction.js';
import { ALPHABET, applyRule, opposite, shiftLetter } from '../utils/reasoning/coding.js';
import { betweenSeats, fromOtherEnd, ordinal, totalFrom } from '../utils/reasoning/ranking.js';
import { paintedCounts, paintedFormula, netOpposites } from '../utils/reasoning/cubes.js';
import { foldLayers, foldText, holesByLayers, mirrorTime, timeText } from '../utils/reasoning/mirror.js';

const onOff = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: 'On' }
];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------ direction walk ------------------------------ */

const ROUTES = {
  r1: { start: 'north', steps: [{ head: 'north', go: 4 }, { turn: 'right', go: 3 }, { turn: 'right', go: 8 }, { turn: 'left', go: 3 }, { turn: 'left', go: 12 }] },
  r2: { start: 'east', steps: [{ head: 'east', go: 5 }, { turn: 'left', go: 6 }, { turn: 'back', go: 2 }, { turn: 'right', go: 9 }, { turn: 'left', go: 7 }] }
};

const placeText = (x, y) => {
  const ew = x ? `${Math.abs(x)} km ${x > 0 ? 'east' : 'west'}` : '';
  const ns = y ? `${Math.abs(y)} km ${y > 0 ? 'north' : 'south'}` : '';
  return [ew, ns].filter(Boolean).join(', ') || 'at the start';
};

export const directionWalk = {
  id: 'direction-walk',
  topicId: 'direction-sense',
  title: 'Follow the walker, turn by turn',
  summary: 'Step through a route of turns and walks. The dashed line from the start is the shortest way back: its length comes from Pythagoras, its direction from the signs of the east and north totals.',
  controls: [
    {
      id: 'route',
      label: 'Route',
      type: 'choice',
      options: [
        { id: 'r1', label: 'Route 1 (start facing north)' },
        { id: 'r2', label: 'Route 2 (start facing east)' }
      ],
      default: 'r1'
    },
    { id: 'steps', label: 'Legs walked', type: 'range', min: 0, max: 5, step: 1, default: 0 }
  ],
  compute({ route, steps }) {
    const full = ROUTES[route];
    const k = Math.min(steps, full.steps.length);
    const walked = walkRoute({ start: full.start, steps: full.steps.slice(0, k) });
    const { x, y } = walked;
    const facing = DIRS[walked.facing];
    const distance = Math.hypot(x, y);
    const direction = directionOf(x, y);
    const walkedKm = full.steps.slice(0, k).reduce((a, s) => a + s.go, 0);
    const all = walkRoute(full).points;
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    return {
      numbers: { route, k, x, y, facing, distance, direction, walkedKm },
      readouts: [
        { label: 'Facing now', value: cap(facing) },
        { label: 'Position from the start', value: placeText(x, y) },
        { label: 'Distance walked', value: `${walkedKm} km` },
        { label: 'Shortest distance back', value: x && y ? `√(${x * x} + ${y * y}) = ${Number(distance.toFixed(2))} km` : `${distance} km` },
        { label: 'Direction from the start', value: direction ? cap(direction) : 'At the start' }
      ],
      plot: {
        kind: 'walk',
        bounds: { minX: Math.min(...xs) - 1, maxX: Math.max(...xs) + 1, minY: Math.min(...ys) - 1, maxY: Math.max(...ys) + 1 },
        points: walked.points,
        facing: walked.facing,
        steps: full.steps.map((s, i) => ({ text: `${i + 1}. ${cap(stepText(s))}`, state: i < k ? (i === k - 1 ? 'new' : 'applied') : 'pending' })),
        summary: `After ${k} of ${full.steps.length} legs the walker faces ${facing} and is ${placeText(x, y)} of the start, ${Number(distance.toFixed(2))} km away${direction ? ` to the ${direction}` : ''}.`
      },
      insight:
        k === 0
          ? `The walker stands at the start facing ${full.start}. A right turn is a quarter turn clockwise, whatever way the walker faces.`
          : x && y
            ? `The way back is the long side of a right-angled triangle with sides ${Math.abs(x)} and ${Math.abs(y)}: √(${x * x} + ${y * y}).`
            : 'The walker is level with the start in one direction, so the way back is a straight line along the other.'
    };
  },
  tasks: [
    {
      id: 'five-km',
      prompt: 'Route 1: stop the walker at a moment when they are exactly 5 km from the start (there are two).',
      check: (values, n) => n.route === 'r1' && n.k > 0 && Math.abs(n.distance - 5) < 1e-9,
      solution: { route: 'r1', steps: 2 }
    },
    {
      id: 'face-west',
      prompt: 'Route 2: find the first moment the walker faces west.',
      check: (values, n) => n.route === 'r2' && n.facing === 'west' && n.k === 4,
      solution: { route: 'r2', steps: 4 }
    },
    {
      id: 'end-r2',
      prompt: 'Walk the whole of Route 2. How far from the start does it end, and in which direction?',
      check: (values, n) => n.route === 'r2' && n.k === 5,
      solution: { route: 'r2', steps: 5 }
    }
  ]
};

/* ------------------------------ coding wheels ------------------------------ */

const CODE_WORDS = ['INDIA', 'MANGO', 'ZEBRA'];

export const codingWheels = {
  id: 'coding-wheels',
  topicId: 'coding-decoding',
  title: 'Two alphabet wheels',
  summary: 'Turn the inner wheel to shift every letter by the same amount, or switch to opposite letters (A ↔ Z). Read a letter on the outer wheel and its code just inside it; the word below is coded live.',
  controls: [
    {
      id: 'mode',
      label: 'Rule',
      type: 'choice',
      options: [
        { id: 'shift', label: 'Shift' },
        { id: 'opposite', label: 'Opposite letters' }
      ],
      default: 'shift'
    },
    { id: 'shift', label: 'Shift (places forward)', type: 'range', min: 0, max: 25, step: 1, default: 0, showWhen: { mode: 'shift' } },
    { id: 'word', label: 'Word', type: 'choice', options: CODE_WORDS.map((w) => ({ id: w, label: w })), default: 'INDIA' }
  ],
  compute({ mode, shift, word }) {
    const rule = mode === 'shift' ? { kind: 'shift', ks: [shift] } : { kind: 'opposite' };
    const code = applyRule(word, rule);
    const inner = [...ALPHABET].map((ch) => (mode === 'shift' ? shiftLetter(ch, shift) : opposite(ch)));
    const fixed = [...ALPHABET].filter((ch, i) => inner[i] === ch);
    const twice = applyRule(code, rule);
    return {
      numbers: { mode, shift, word, code, fixed: fixed.length, selfInverse: twice === word },
      readouts: [
        { label: 'Rule', value: mode === 'shift' ? `Each letter moves ${shift} place${shift === 1 ? '' : 's'} forward${shift > 13 ? ` (the same as ${26 - shift} back)` : ''}` : 'Each letter becomes its opposite: positions add to 27' },
        { label: `${word} is coded as`, value: code },
        { label: 'A, M and Z become', value: `${inner[0]}, ${inner[12]}, ${inner[25]}` },
        { label: 'Coding the code again gives', value: twice }
      ],
      plot: {
        kind: 'wheels',
        outer: [...ALPHABET],
        inner,
        rotation: mode === 'shift' ? shift : null,
        word: [...word],
        code: [...code],
        summary: `Outer wheel A to Z; inner wheel ${mode === 'shift' ? `shifted ${shift} places` : 'reversed, Z to A'}. ${word} becomes ${code}.`
      },
      insight:
        mode === 'opposite'
          ? 'Opposite letters pair up (A–Z, B–Y, ..., M–N), so coding twice gives the word back.'
          : shift === 0
            ? 'With no shift every letter is its own code. Turn the inner wheel.'
            : shift === 13
              ? 'A shift of 13 is halfway round: coding twice moves 26 places, back to the start.'
              : `Every letter moves ${shift}: after Z the count wraps round to A.`
    };
  },
  tasks: [
    {
      id: 'india',
      prompt: 'Make INDIA come out as KPFKC.',
      check: (values, n) => n.code === 'KPFKC',
      solution: { mode: 'shift', shift: 2, word: 'INDIA' }
    },
    {
      id: 'back-one',
      prompt: 'Find the shift that turns MANGO into LZMFN: one place back for every letter.',
      check: (values, n) => n.code === 'LZMFN',
      solution: { mode: 'shift', shift: 25, word: 'MANGO' }
    },
    {
      id: 'zebra',
      prompt: 'Code ZEBRA with opposite letters.',
      check: (values, n) => n.mode === 'opposite' && n.word === 'ZEBRA',
      solution: { mode: 'opposite', word: 'ZEBRA' }
    },
    {
      id: 'thirteen',
      prompt: 'Find the only shift (other than 0) for which coding the code again gives back the word.',
      check: (values, n) => n.mode === 'shift' && n.shift === 13,
      solution: { mode: 'shift', shift: 13 }
    }
  ]
};

/* ------------------------------ ranking row ------------------------------ */

export const rankingRow = {
  id: 'ranking-row',
  topicId: 'order-ranking',
  title: 'Counting from both ends',
  summary: 'A row of people with A and B marked. Count A’s place from each end and see why the total is left + right − 1; swap A and B and watch both positions change.',
  controls: [
    { id: 'n', label: 'People in the row', type: 'range', min: 5, max: 15, step: 1, default: 9 },
    { id: 'a', label: 'A’s place from the left', type: 'range', min: 1, max: 15, step: 1, default: 3 },
    { id: 'b', label: 'B’s place from the left', type: 'range', min: 1, max: 15, step: 1, default: 8 },
    { id: 'swap', label: 'Interchange A and B', type: 'choice', options: onOff, default: 'off' }
  ],
  compute({ n, a, b, swap }) {
    let pa = Math.min(a, n);
    let pb = Math.min(b, n);
    const clash = pa === pb;
    if (clash) pb = pa === n ? pa - 1 : pa + 1;
    const swapped = swap === 'on';
    if (swapped) [pa, pb] = [pb, pa];
    const aRight = fromOtherEnd(n, pa);
    const between = betweenSeats(pa, pb);
    return {
      numbers: { n, aLeft: pa, aRight, bLeft: pb, bRight: fromOtherEnd(n, pb), between, swapped, total: totalFrom(pa, aRight) },
      readouts: [
        { label: 'A from the left', value: ordinal(pa) },
        { label: 'A from the right', value: ordinal(aRight) },
        { label: 'Left + right − 1', value: `${pa} + ${aRight} − 1 = ${totalFrom(pa, aRight)}` },
        { label: 'B from the left, from the right', value: `${ordinal(pb)}, ${ordinal(fromOtherEnd(n, pb))}` },
        { label: 'People between A and B', value: `|${pa} − ${pb}| − 1 = ${between}` }
      ],
      plot: {
        kind: 'queue',
        n,
        a: pa,
        b: pb,
        swapped,
        summary: `${n} people in a row. A is ${ordinal(pa)} from the left and ${ordinal(aRight)} from the right; B is ${ordinal(pb)} from the left. ${between} ${between === 1 ? 'person sits' : 'people sit'} between them.`
      },
      insight: clash
        ? 'A and B cannot share a seat, so B has moved next to A.'
        : swapped
          ? `After the swap A has B’s old place: ${ordinal(pa)} from the left, ${ordinal(aRight)} from the right. The people between them do not change.`
          : `A is counted in both directions, so ${pa} + ${aRight} counts A twice: subtract 1 to get ${n}.`
    };
  },
  tasks: [
    {
      id: 'four-six',
      prompt: 'Make A 4th from the left and 6th from the right. How many people is that?',
      check: (values, n) => n.aLeft === 4 && n.aRight === 6,
      solution: { n: 9, a: 4, swap: 'off' }
    },
    {
      id: 'middle',
      prompt: 'Put A exactly in the middle: the same place from both ends.',
      check: (values, n) => n.aLeft === n.aRight,
      solution: { n: 9, a: 5, b: 8, swap: 'off' }
    },
    {
      id: 'three-between',
      prompt: 'Put exactly 3 people between A and B.',
      check: (values, n) => n.between === 3,
      solution: { a: 3, b: 7 }
    },
    {
      id: 'swap',
      prompt: 'With 13 people, interchange A and B so that A ends up 9th from the left.',
      check: (values, n) => n.n === 13 && n.swapped && n.aLeft === 9,
      solution: { n: 13, a: 3, b: 9, swap: 'on' }
    }
  ]
};

/* ------------------------------ cubes ------------------------------ */

// A standard die's net (opposite faces add to 7): a cross with 1 in the middle.
const DIE_NET = [[1, 1, '1'], [1, 0, '2'], [1, 2, '5'], [1, 3, '6'], [0, 1, '3'], [2, 1, '4']];

export const cubePaint = {
  id: 'cube-paint',
  topicId: 'cubes-dice',
  title: 'Cut a painted cube',
  summary: 'A cube painted on every face is cut into n × n × n small cubes. Colour them by painted faces: the 8 corners have three, the edges two, the faces one, and the hidden inside none. Switch to the net of a die to see which faces end up opposite.',
  controls: [
    {
      id: 'view',
      label: 'Show',
      type: 'choice',
      options: [
        { id: 'cube', label: 'Painted cube' },
        { id: 'net', label: 'Net of a die' }
      ],
      default: 'cube'
    },
    { id: 'n', label: 'Small cubes along an edge (n)', type: 'range', min: 2, max: 8, step: 1, default: 3, showWhen: { view: 'cube' } },
    {
      id: 'only',
      label: 'Highlight',
      type: 'choice',
      options: [
        { id: 'all', label: 'All' },
        { id: '3', label: '3 faces' },
        { id: '2', label: '2 faces' },
        { id: '1', label: '1 face' },
        { id: '0', label: 'No paint' }
      ],
      default: 'all',
      showWhen: { view: 'cube' }
    },
    {
      id: 'pair',
      label: 'Opposite faces of',
      type: 'choice',
      options: [
        { id: '1', label: '1' },
        { id: '2', label: '2' },
        { id: '3', label: '3' }
      ],
      default: '1',
      showWhen: { view: 'net' }
    }
  ],
  compute({ view, n, only, pair }) {
    if (view === 'net') {
      const opp = netOpposites(DIE_NET)[pair];
      return {
        numbers: { view, pair, opposite: opp, n, only },
        readouts: [
          { label: `Opposite ${pair}`, value: opp },
          { label: 'Their sum', value: String(Number(pair) + Number(opp)) },
          { label: 'Rule on the net', value: 'Two squares with one square between them, in a straight line, are opposite' }
        ],
        plot: {
          kind: 'cubes',
          view: 'net',
          net: DIE_NET.map(([c, r, label]) => ({ c, r, label, role: label === pair ? 'pick' : label === opp ? 'opposite' : null })),
          summary: `The net of a standard die: 1 in the middle, 2 above it, 5 and 6 below, 3 to the left and 4 to the right. ${pair} is opposite ${opp}.`
        },
        insight: `On a standard die opposite faces add to 7: ${pair} + ${opp} = 7. Faces that share an edge on the net can never be opposite.`
      };
    }
    const counts = paintedCounts(n);
    const formula = paintedFormula(n);
    const kind = (x, y, z) => [x, y, z].filter((v) => v === 0 || v === n - 1).length;
    const squares = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      squares.push({ face: 'front', u: i, v: j, k: kind(i, j, 0) });
      squares.push({ face: 'top', u: i, v: j, k: kind(i, n - 1, j) });
      squares.push({ face: 'right', u: j, v: i, k: kind(n - 1, i, j) });
    }
    return {
      numbers: { view, n, only, counts, pair },
      readouts: [
        { label: 'Small cubes', value: `${n}³ = ${n ** 3}` },
        { label: '3 faces (corners)', value: String(counts[3]) },
        { label: '2 faces: 12(n − 2)', value: `${formula[2]}` },
        { label: '1 face: 6(n − 2)²', value: `${formula[1]}` },
        { label: 'No paint: (n − 2)³', value: `${formula[0]}` }
      ],
      plot: {
        kind: 'cubes',
        view: 'cube',
        n,
        only,
        squares,
        counts,
        summary: `A ${n} × ${n} × ${n} cube: ${counts[3]} small cubes with three painted faces, ${counts[2]} with two, ${counts[1]} with one and ${counts[0]} with none.`
      },
      insight:
        n === 2
          ? 'With n = 2 every small cube is a corner: all 8 have three painted faces.'
          : `Peel off the outer layer and a ${n - 2} × ${n - 2} × ${n - 2} block is left, with no paint at all. Check: ${counts[0]} + ${counts[1]} + ${counts[2]} + 8 = ${n ** 3}.`
    };
  },
  tasks: [
    {
      id: 'two-faces',
      prompt: 'Set n = 5 and highlight the cubes with exactly two painted faces: 12 edges × 3 each.',
      check: (values, n) => n.view === 'cube' && n.n === 5 && n.only === '2',
      solution: { view: 'cube', n: 5, only: '2' }
    },
    {
      id: 'inside',
      prompt: 'Find the smallest n that hides a small cube with no paint at all.',
      check: (values, n) => n.view === 'cube' && n.n === 3 && n.only === '0',
      solution: { view: 'cube', n: 3, only: '0' }
    },
    {
      id: 'equal',
      prompt: 'Find the n for which the cubes with one painted face are exactly as many as those with none.',
      check: (values, n) => n.view === 'cube' && n.counts[0] > 0 && n.counts[1] === n.counts[0],
      solution: { view: 'cube', n: 8 }
    },
    {
      id: 'net',
      prompt: 'Switch to the net of the die. Which face is opposite 2?',
      check: (values, n) => n.view === 'net' && n.pair === '2',
      solution: { view: 'net', pair: '2' }
    }
  ]
};

/* ------------------------------ paper folding and mirror clocks ------------------------------ */

const PAPER = {
  one: { folds: ['left'], punches: { p1: ['F3'], p2: ['H7'] } },
  two: { folds: ['left', 'top'], punches: { p1: ['F6'], p2: ['H8'] } },
  diagonal: { folds: ['left', 'top', 'diag'], punches: { p1: ['E7'], p2: ['F8'] } }
};
const SIZE = 8;

export const paperFold = {
  id: 'paper-fold',
  topicId: 'mirror-paper-folding',
  title: 'Fold, punch, unfold',
  summary: 'Fold a sheet once, twice or along a diagonal, punch one hole through every layer, and open it out: each fold doubles the holes, reflected across the fold line. In clock mode, a mirror shows 11:60 minus the time.',
  controls: [
    {
      id: 'mode',
      label: 'Mode',
      type: 'choice',
      options: [
        { id: 'paper', label: 'Paper folding' },
        { id: 'clock', label: 'Mirror clock' }
      ],
      default: 'paper'
    },
    {
      id: 'folds',
      label: 'Folds',
      type: 'choice',
      options: [
        { id: 'one', label: 'One fold' },
        { id: 'two', label: 'Two folds' },
        { id: 'diagonal', label: 'Two folds and a diagonal' }
      ],
      default: 'one',
      showWhen: { mode: 'paper' }
    },
    {
      id: 'punch',
      label: 'Punch at',
      type: 'choice',
      options: [
        { id: 'p1', label: 'Near the fold' },
        { id: 'p2', label: 'Near the edge' }
      ],
      default: 'p1',
      showWhen: { mode: 'paper' }
    },
    { id: 'stage', label: 'Step', type: 'range', min: 0, max: 5, step: 1, default: 0, showWhen: { mode: 'paper' } },
    { id: 'hour', label: 'Hour', type: 'range', min: 1, max: 12, step: 1, default: 3, showWhen: { mode: 'clock' } },
    { id: 'minute', label: 'Minute', type: 'range', min: 0, max: 55, step: 5, default: 40, showWhen: { mode: 'clock' } }
  ],
  compute({ mode, folds, punch, stage, hour, minute }) {
    if (mode === 'clock') {
      const image = mirrorTime(hour, minute);
      const shown = timeText({ hour, minute });
      const reads = timeText(image);
      return {
        numbers: { mode, hour, minute, mirror: reads, same: reads === shown },
        readouts: [
          { label: 'Actual time', value: shown },
          { label: 'The mirror image reads', value: reads },
          { label: 'Check', value: `${shown} + ${reads} = 12:00` }
        ],
        plot: {
          kind: 'mirrorclock',
          hour,
          minute,
          image,
          summary: `A clock at ${shown}, and its mirror image, which reads ${reads}.`
        },
        insight: reads === shown ? `At ${shown} the hands lie on the vertical line, so the mirror changes nothing.` : `The mirror swaps left and right, so 11:60 − ${shown} = ${reads}.`
      };
    }
    const pattern = PAPER[folds];
    const punches = pattern.punches[punch];
    const stages = [...pattern.folds.map((_, i) => ({ name: i === 0 ? 'flat' : `fold-${i}`, done: i })), { name: 'folded', done: pattern.folds.length }, { name: 'punched', done: pattern.folds.length }, { name: 'opened', done: 0 }];
    const at = stages[Math.min(stage, stages.length - 1)];
    const holes = holesByLayers(SIZE, pattern.folds, punches);
    const layers = 2 ** at.done;
    const opened = at.name === 'opened';
    const punched = at.name === 'punched';
    const region = foldLayers(SIZE, pattern.folds.slice(0, at.done)).region;
    return {
      numbers: { mode, folds, stage: at.name, holes: holes.length, layers, region: region.length },
      readouts: [
        { label: 'Step', value: opened ? 'Opened out' : punched ? 'Punched through every layer' : at.done < pattern.folds.length ? `Next: ${foldText(pattern.folds[at.done])}` : 'Folded' },
        { label: 'Layers of paper', value: opened ? '1' : String(layers) },
        { label: 'Holes when opened', value: `${punches.length} × 2^${pattern.folds.length} = ${holes.length}` }
      ],
      plot: {
        kind: 'fold',
        size: SIZE,
        folds: pattern.folds,
        done: at.done,
        punches: punched ? punches : [],
        holes: opened ? holes : [],
        opened,
        steps: [...pattern.folds.map((f, i) => cap(foldText(f).replace(/^it is /, ''))), 'Punch one hole through every layer', 'Open it out'].map((text, i) => ({
          text: `${i + 1}. ${text}`,
          state: i < Math.min(stage, stages.length - 1) ? (i === Math.min(stage, stages.length - 1) - 1 ? 'new' : 'applied') : 'pending'
        })),
        summary: opened
          ? `The sheet opened out shows ${holes.length} holes: ${holes.join(', ')}.`
          : punched
            ? `The folded paper, ${layers} layers thick, punched once.`
            : `The sheet after ${at.done} fold${at.done === 1 ? '' : 's'}: ${layers} layer${layers === 1 ? '' : 's'} thick.`
      },
      insight: opened
        ? `${pattern.folds.length} fold${pattern.folds.length === 1 ? '' : 's'}, so ${2 ** pattern.folds.length} layers under the punch: ${holes.length} holes, each the mirror image of another across a fold line.`
        : punched
          ? 'The punch goes through every layer at once. Unfolding undoes the last fold first.'
          : 'Each fold lays one half exactly on the other, doubling the layers.'
    };
  },
  tasks: [
    {
      id: 'two-open',
      prompt: 'Two folds: punch, then open the sheet out. How many holes?',
      check: (values, n) => n.mode === 'paper' && n.folds === 'two' && n.stage === 'opened',
      solution: { mode: 'paper', folds: 'two', stage: 5 }
    },
    {
      id: 'diagonal',
      prompt: 'Add the diagonal fold and open the sheet: where do the 8 holes lie?',
      check: (values, n) => n.mode === 'paper' && n.folds === 'diagonal' && n.stage === 'opened',
      solution: { mode: 'paper', folds: 'diagonal', stage: 5 }
    },
    {
      id: 'mirror-930',
      prompt: 'Clock mode: set the clock so that its mirror image reads 9:30.',
      check: (values, n) => n.mode === 'clock' && n.mirror === '9:30',
      solution: { mode: 'clock', hour: 2, minute: 30 }
    },
    {
      id: 'same',
      prompt: 'Clock mode: find a time whose mirror image shows the same time.',
      check: (values, n) => n.mode === 'clock' && n.same,
      solution: { mode: 'clock', hour: 6, minute: 0 }
    }
  ]
};

export const reasoningMoreSims = [directionWalk, codingWheels, rankingRow, cubePaint, paperFold];
