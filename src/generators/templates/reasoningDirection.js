/**
 * Direction-sense templates: turns and the final direction, the shortest
 * distance back to the start, the direction of the end point, and shadows.
 *
 * Routes are drawn at random from perpendicular legs whose net movement is a
 * Pythagorean triple (or lies along one axis), so every distance is a whole
 * number. The answer comes from walkRoute (direction numbers and a table of
 * steps); `verify` walks the printed route again with walkRouteComplex (a
 * heading as a complex number, a left turn multiplying it by i) and reads the
 * direction from the angle, so the two must agree.
 */

import {
  DIRS,
  directionByAngle,
  directionOf,
  facingFromShadow,
  facingFromShadowBrute,
  stepText,
  turnAmount,
  walkRoute,
  walkRouteComplex
} from '../../utils/reasoning/direction.js';
import { NAMES } from './reasoningShared.js';

const TOPIC = 'direction-sense';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const mod = (a, n) => ((a % n) + n) % n;
const minus = (v) => (v < 0 ? `−${-v}` : String(v));
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [4, 3, 5], [12, 5, 13], [9, 12, 15], [12, 9, 15], [8, 15, 17], [15, 8, 17]];

/** The route as one sentence: "Asha walks 5 km north, then turns right and walks 3 km, ..." */
function routeSentence(name, route, unit = 'km') {
  const parts = route.steps.map((s) => stepText(s, unit));
  return `${name} ${parts[0]}${parts.slice(1).map((p) => `, then ${p}`).join('')}.`;
}

/** Perpendicular legs [[dirIndex, length], ...] as a route: the first leg heads, the rest turn left or right. */
function routeFromLegs(legs) {
  const steps = [{ head: DIRS[legs[0][0]], go: legs[0][1] }];
  for (let i = 1; i < legs.length; i++) {
    const turn = mod(legs[i][0] - legs[i - 1][0], 8) === 2 ? 'right' : 'left';
    steps.push({ turn, go: legs[i][1] });
  }
  return { start: legs[0][0], steps };
}

/**
 * Random perpendicular legs ending at (dx, dy). Legs alternate between the
 * north–south and east–west lines; each leg's length is positive.
 */
function legsTo(rng, dx, dy, count) {
  const vertical = rng.chance(0.5);
  const nV = vertical ? Math.ceil(count / 2) : Math.floor(count / 2);
  const nH = count - nV;
  const split = (total, parts) => {
    // Signed lengths summing to total, each nonzero, between −12 and 12.
    for (let attempt = 0; attempt < 30; attempt++) {
      const out = [];
      let left = total;
      for (let i = 0; i < parts - 1; i++) {
        const v = rng.int(-9, 12);
        out.push(v);
        left -= v;
      }
      out.push(left);
      if (out.every((v) => v !== 0 && Math.abs(v) <= 14)) return out;
    }
    return null;
  };
  const vs = split(dy, nV);
  const hs = split(dx, nH);
  if (!vs || !hs) return null;
  const legs = [];
  for (let i = 0; i < count; i++) {
    const useV = vertical ? i % 2 === 0 : i % 2 === 1;
    const v = useV ? vs.shift() : hs.shift();
    const dir = useV ? (v > 0 ? 0 : 4) : v > 0 ? 2 : 6;
    legs.push([dir, Math.abs(v)]);
  }
  return legs;
}

function randomTarget(rng) {
  if (rng.chance(0.2)) {
    const d = rng.int(2, 12);
    return rng.pick([[d, 0], [-d, 0], [0, d], [0, -d]]);
  }
  const [a, b] = rng.pick(TRIPLES);
  return [a * rng.pick([1, -1]), b * rng.pick([1, -1])];
}

const routeHint = 'Draw it: start at a dot, north up the page. Draw each leg in turn, turning the way the walker turns, not the way the page turns.';

export const directionTemplates = [
  {
    id: 'ds-gen-facing',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ds-turns',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ds-compass-f', 'ds-sc-turns'],
    formatValue: (v) => cap(v),
    estimatedSeconds: 40,
    params(rng) {
      const start = rng.pick([0, 2, 4, 6]);
      const count = rng.int(2, 4);
      const steps = [];
      for (let i = 0; i < count; i++) {
        steps.push(
          rng.chance(0.65)
            ? { turn: rng.pick(['left', 'right', 'left', 'right', 'back']) }
            : { rot: rng.pick(['cw', 'acw']), deg: rng.pick([45, 90, 135, 180, 225, 270]) }
        );
      }
      const name = rng.pick(NAMES);
      return { start, steps, name };
    },
    answer: ({ start, steps }) => DIRS[walkRoute({ start, steps }).facing],
    distractors: ({ start, steps }) => {
      const right = walkRoute({ start, steps }).facing;
      // Left and right mixed up: every turn the other way.
      const swapped = walkRoute({ start, steps: steps.map((s) => (s.turn === 'left' ? { turn: 'right' } : s.turn === 'right' ? { turn: 'left' } : s.rot ? { ...s, rot: s.rot === 'cw' ? 'acw' : 'cw' } : s)) }).facing;
      return [
        { value: DIRS[swapped], why: 'turned the wrong way (left for right)' },
        { value: DIRS[mod(right + 4, 8)], why: 'the opposite direction' },
        { value: DIRS[mod(right + 2, 8)], why: 'one quarter turn out' },
        { value: DIRS[mod(right - 2, 8)], why: 'one quarter turn out' },
        { value: DIRS[mod(right + 1, 8)], why: 'an eighth of a turn out' }
      ];
    },
    verify: ({ start, steps }, value) => DIRS[walkRouteComplex({ start, steps }).facing] === value,
    render({ start, steps, name }, { fmt }) {
      let facing = start;
      const trail = [DIRS[start]];
      for (const s of steps) {
        facing = mod(facing + turnAmount(s), 8);
        trail.push(DIRS[facing]);
      }
      const eighths = steps.reduce((a, s) => a + turnAmount(s), 0);
      return {
        question: `${name} stands facing ${DIRS[start]}. ${name} ${steps.map((s) => stepText(s)).join(', then ')}. Which direction is ${name} facing now?`,
        explanation: `Track the facing after each turn: ${trail.join(' → ')}. ${name} ends up facing ${trail.at(-1)}: ${fmt(trail.at(-1))}.`,
        solutionSteps: [
          'Right = 90° clockwise, left = 90° anticlockwise, back = 180°.',
          `Net turn: ${Math.abs(eighths * 45)}° ${eighths < 0 ? 'anticlockwise' : 'clockwise'}${eighths < 0 ? `, the same as ${mod(eighths * 45, 360)}° clockwise` : ''}, from ${DIRS[start]}.`,
          `Facing: ${trail.join(' → ')}.`
        ],
        method: 'Add up the turns as angles (clockwise positive) and turn once from the start.',
        hints: ['Turning right is clockwise on a compass; turning left is anticlockwise.', `Add the turns: right +90°, left −90°, back 180°. Start from ${DIRS[start]}.`],
        commonMistakes: ['Turning by the page instead of by the walker (a right turn when facing south points west).', 'Treating anticlockwise as right.']
      };
    }
  },
  {
    id: 'ds-gen-distance',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ds-distance',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ds-net-f', 'ds-distance-f', 'ds-sc-triples'],
    formatValue: (v) => `${v} km`,
    estimatedSeconds: 75,
    params(rng) {
      const [dx, dy] = randomTarget(rng);
      const legs = legsTo(rng, dx, dy, rng.int(3, 5));
      if (!legs) return null;
      const route = routeFromLegs(legs);
      return { route, name: rng.pick(NAMES), dx, dy };
    },
    answer: ({ route }) => {
      const { x, y } = walkRoute(route);
      return Math.hypot(x, y);
    },
    distractors: ({ route }) => {
      const { x, y } = walkRoute(route);
      const path = route.steps.reduce((a, s) => a + s.go, 0);
      return [
        { value: Math.abs(x) + Math.abs(y), why: 'added east–west and north–south instead of using Pythagoras' },
        { value: path, why: 'the total distance walked' },
        { value: Math.abs(Math.abs(x) - Math.abs(y)), why: 'subtracted the two parts' },
        { value: Math.hypot(x, y) + 2, why: 'an arithmetic slip' },
        { value: path - route.steps[0].go, why: 'left out the first leg' }
      ];
    },
    verify: ({ route }, value) => {
      const w = walkRouteComplex(route);
      return Math.abs(Math.sqrt(w.x * w.x + w.y * w.y) - value) < 1e-9;
    },
    render({ route, name }, { fmt }) {
      const { x, y } = walkRoute(route);
      const d = Math.hypot(x, y);
      const ew = x ? `${Math.abs(x)} km ${x > 0 ? 'east' : 'west'}` : 'no distance east or west';
      const ns = y ? `${Math.abs(y)} km ${y > 0 ? 'north' : 'south'}` : 'no distance north or south';
      return {
        context: routeSentence(name, route),
        question: `How far is ${name} now from the starting point (the shortest distance)?`,
        explanation: `Add the movements along each line: ${name} ends ${ew} and ${ns} of the start. ${x && y ? `Shortest distance = √(${Math.abs(x)}² + ${Math.abs(y)}²) = ${fmt(d)}.` : `Both parts lie on one line, so the distance is ${fmt(d)}.`}`,
        solutionSteps: [
          'Turn each leg into a compass direction (right turn = clockwise).',
          `Net east–west: ${ew}. Net north–south: ${ns}.`,
          x && y ? `Pythagoras: √(${x * x} + ${y * y}) = ${d} km.` : `Distance = ${d} km.`
        ],
        method: 'Net east–west and net north–south, then Pythagoras.',
        hints: [routeHint, 'Add the east legs, subtract the west ones; do the same for north and south. Then use the right-angled triangle.'],
        commonMistakes: ['Adding every leg (that is the distance walked, not the distance from the start).', 'Adding the two net parts instead of using Pythagoras.']
      };
    }
  },
  {
    id: 'ds-gen-direction',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ds-position',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ds-net-f', 'ds-direction-f'],
    formatValue: (v) => cap(v),
    estimatedSeconds: 70,
    params(rng) {
      const [dx, dy] = randomTarget(rng);
      const legs = legsTo(rng, dx, dy, rng.int(3, 5));
      if (!legs) return null;
      return { route: routeFromLegs(legs), name: rng.pick(NAMES), reverse: rng.chance(0.3) };
    },
    answer: ({ route, reverse }) => {
      const { x, y } = walkRoute(route);
      return reverse ? directionOf(-x, -y) : directionOf(x, y);
    },
    distractors: ({ route, reverse }) => {
      const { x, y } = walkRoute(route);
      const sx = reverse ? -x : x;
      const sy = reverse ? -y : y;
      return [
        { value: directionOf(-sx, -sy), why: 'answered the reverse question' },
        { value: directionOf(-sx, sy), why: 'east and west mixed up' },
        { value: directionOf(sx, -sy), why: 'north and south mixed up' },
        { value: directionOf(sx, 0) || 'north', why: 'ignored the north–south part' },
        { value: directionOf(0, sy) || 'east', why: 'ignored the east–west part' },
        { value: DIRS[mod(DIRS.indexOf(directionOf(sx, sy)) + 2, 8)], why: 'a quarter turn out' },
        { value: DIRS[mod(DIRS.indexOf(directionOf(sx, sy)) - 2, 8)], why: 'a quarter turn out' }
      ];
    },
    verify: ({ route, reverse }, value) => {
      const w = walkRouteComplex(route);
      return (reverse ? directionByAngle(-w.x, -w.y) : directionByAngle(w.x, w.y)) === value;
    },
    render({ route, name, reverse }, { fmt }) {
      const { x, y } = walkRoute(route);
      const ew = x ? `${Math.abs(x)} km ${x > 0 ? 'east' : 'west'}` : 'level with the start east–west';
      const ns = y ? `${Math.abs(y)} km ${y > 0 ? 'north' : 'south'}` : 'level with the start north–south';
      const answer = reverse ? directionOf(-x, -y) : directionOf(x, y);
      return {
        context: routeSentence(name, route),
        question: reverse ? `In which direction is the starting point from ${name} now?` : `In which direction is ${name} now from the starting point?`,
        explanation: `${name} ends ${ew} and ${ns} of the start. ${reverse ? `So the start lies the opposite way from ${name}, to the ${answer}. Answer: ${fmt(answer)}.` : `So ${name} is ${answer} of the start. Answer: ${fmt(answer)}.`}`,
        solutionSteps: [
          'Turn each leg into a compass direction.',
          `Net: ${ew}; ${ns}.`,
          reverse ? `Seen from the end point, the start is the opposite way: ${answer}.` : `End point from the start: ${answer}.`
        ],
        method: 'Find the net east–west and north–south movement; name the quadrant.',
        hints: [routeHint, reverse ? 'Find where the walker is from the start first, then turn it round.' : 'Is the end point north or south of the start, and east or west?'],
        commonMistakes: ['Answering "where is the start from the walker" when asked the opposite.', 'Naming only the last direction walked.']
      };
    }
  },
  {
    id: 'ds-gen-shadow',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ds-shadow',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ds-shadow-f'],
    formatValue: (v) => cap(v),
    estimatedSeconds: 45,
    params(rng) {
      return {
        time: rng.pick(['morning', 'evening']),
        side: rng.pick(['left', 'right', 'behind', 'front']),
        name: rng.pick(NAMES),
        when: rng.pick(['One morning', 'Early one morning', 'Just after sunrise']),
        late: rng.pick(['One evening', 'Just before sunset', 'Late one afternoon'])
      };
    },
    answer: ({ time, side }) => facingFromShadow(time, side),
    distractors: ({ time, side }) => {
      const right = facingFromShadow(time, side);
      const other = facingFromShadow(time === 'morning' ? 'evening' : 'morning', side);
      return [
        { value: other, why: 'put the morning sun in the west' },
        ...['north', 'east', 'south', 'west'].filter((d) => d !== right && d !== other).map((value) => ({ value, why: 'another direction' }))
      ];
    },
    verify: ({ time, side }, value) => {
      const found = facingFromShadowBrute(time, side);
      return found.length === 1 && found[0] === value;
    },
    render({ time, side, name, when, late }, { fmt }) {
      const shadow = time === 'morning' ? 'west' : 'east';
      const sun = time === 'morning' ? 'east' : 'west';
      const where = side === 'front' ? 'falls straight in front of' : side === 'behind' ? 'falls exactly behind' : `falls to the ${side} of`;
      const answer = facingFromShadow(time, side);
      return {
        question: `${time === 'morning' ? when : late}, ${name} stands in an open field. ${name}’s shadow ${where} ${name}. Which direction is ${name} facing?`,
        explanation: `The sun is in the ${sun}, so shadows point ${shadow}. ${side === 'front' ? `The shadow is in front, so ${name} faces ${shadow}` : side === 'behind' ? `The shadow is behind, so ${name} faces away from it` : `With the ${shadow} on the ${side}`}: ${name} faces ${answer}. Answer: ${fmt(answer)}.`,
        solutionSteps: [
          `${cap(time)}: the sun is in the ${sun}; a shadow points away from the sun, to the ${shadow}.`,
          `The shadow (${shadow}) is on ${name}’s ${side === 'front' ? 'front' : side === 'behind' ? 'back' : side}.`,
          `Facing ${answer} puts ${shadow} there.`
        ],
        method: 'Morning shadows point west, evening shadows east; then turn yourself until the shadow is on the right side.',
        hints: [`Where is the sun in the ${time}? A shadow points the other way.`, `Stand facing north: west is on your left, east on your right. Turn until the shadow is ${side === 'front' ? 'in front' : side === 'behind' ? 'behind' : `on your ${side}`}.`],
        commonMistakes: ['Pointing the shadow towards the sun.', 'Putting the morning sun in the west.']
      };
    }
  },
  {
    id: 'ds-gen-where',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ds-position',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ds-distance-f', 'ds-direction-f'],
    formatValue: (v) => v,
    estimatedSeconds: 100,
    params(rng) {
      const [a, b] = rng.pick(TRIPLES);
      const dx = a * rng.pick([1, -1]);
      const dy = b * rng.pick([1, -1]);
      const legs = legsTo(rng, dx, dy, rng.int(4, 5));
      if (!legs) return null;
      return { route: routeFromLegs(legs), name: rng.pick(NAMES) };
    },
    answer: ({ route }) => {
      const { x, y } = walkRoute(route);
      return `${Math.hypot(x, y)} km ${directionOf(x, y)}`;
    },
    distractors: ({ route }) => {
      const { x, y } = walkRoute(route);
      const d = Math.hypot(x, y);
      return [
        { value: `${d} km ${directionOf(-x, -y)}`, why: 'the direction of the start from the walker' },
        { value: `${Math.abs(x) + Math.abs(y)} km ${directionOf(x, y)}`, why: 'added the two parts' },
        { value: `${d} km ${directionOf(-x, y)}`, why: 'east and west mixed up' },
        { value: `${Math.abs(x) + Math.abs(y)} km ${directionOf(-x, -y)}`, why: 'both slips' }
      ];
    },
    verify: ({ route }, value) => {
      const w = walkRouteComplex(route);
      return `${Math.sqrt(w.x ** 2 + w.y ** 2)} km ${directionByAngle(w.x, w.y)}` === value;
    },
    render({ route, name }, { fmt }) {
      const { x, y, points } = walkRoute(route);
      const d = Math.hypot(x, y);
      return {
        context: routeSentence(name, route),
        question: `How far, and in which direction, is ${name} now from the starting point?`,
        explanation: `Positions after each leg (east, north): ${points.map(([px, py]) => `(${minus(px)}, ${minus(py)})`).join(' → ')}. ${name} ends ${Math.abs(x)} km ${x > 0 ? 'east' : 'west'} and ${Math.abs(y)} km ${y > 0 ? 'north' : 'south'}: √(${x * x} + ${y * y}) = ${d} km, ${directionOf(x, y)} of the start. Answer: ${fmt(`${d} km ${directionOf(x, y)}`)}.`,
        solutionSteps: [
          'Write each leg as a change in (east, north).',
          `End point: (${minus(x)}, ${minus(y)}).`,
          `Distance √(${Math.abs(x)}² + ${Math.abs(y)}²) = ${d} km; direction ${directionOf(x, y)}.`
        ],
        method: 'Keep a running (east, north) position; then Pythagoras and the quadrant.',
        hints: [routeHint, 'Keep a running total: east is +, west is −; north is +, south is −.'],
        commonMistakes: ['Giving the direction of the start from the walker.', 'Adding the two parts instead of using Pythagoras.']
      };
    }
  }
];
