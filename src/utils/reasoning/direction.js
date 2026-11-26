/**
 * Direction sense: a walker who turns and walks, where they end up, which way
 * they face, how far they are from the start, and shadows.
 *
 * Directions are compass points, numbered clockwise from north in 45° steps:
 * 0 north, 1 north-east, 2 east, ... 7 north-west. Positions are in the walk's
 * own units, x to the east and y to the north.
 *
 * A route is { start, steps }: `start` is the direction faced at the start, and
 * each step is one of
 *   { head: 'north', go: 5 }            face a compass direction and walk
 *   { turn: 'left' | 'right' | 'back', go?: 3 }   turn 90° (or about), then walk
 *   { rot: 'cw' | 'acw', deg: 45, go?: 3 }        turn by an angle, then walk
 *   { go: 3 }                           walk straight on
 * Walking is only ever along north, east, south or west, so every position is a
 * whole number. Two independent walkers are provided: walkRoute (direction
 * numbers and a table of steps) and walkRouteComplex (complex numbers, a left
 * turn multiplies by i); tests hold them to each other.
 */

export const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const STEP = { 0: [0, 1], 2: [1, 0], 4: [0, -1], 6: [-1, 0] };
const mod = (a, n) => ((a % n) + n) % n;

export const dirIndex = (name) => {
  const i = DIRS.indexOf(name);
  if (i === -1) throw new Error(`unknown direction ${name}`);
  return i;
};

/** The direction faced after one step's turn (in 45° units, clockwise positive). */
export function turnAmount(step) {
  if (step.turn === 'left') return -2;
  if (step.turn === 'right') return 2;
  if (step.turn === 'back') return 4;
  if (step.rot) return ((step.rot === 'cw' ? 1 : -1) * step.deg) / 45;
  return 0;
}

/** Walk a route: { x, y, facing, points: [[x, y], ...] } (points include the start). */
export function walkRoute(route) {
  let facing = route.start === undefined ? 0 : typeof route.start === 'number' ? route.start : dirIndex(route.start);
  let x = 0;
  let y = 0;
  const points = [[0, 0]];
  for (const step of route.steps) {
    if (step.head) facing = dirIndex(step.head);
    else facing = mod(facing + turnAmount(step), 8);
    if (step.go) {
      const v = STEP[facing];
      if (!v) throw new Error(`walking ${DIRS[facing]} is not on the grid`);
      x += v[0] * step.go;
      y += v[1] * step.go;
      points.push([x, y]);
    }
  }
  return { x, y, facing, points };
}

/* A second walker: the heading is a complex number of length 1 (north = i),
   a left turn multiplies it by i, a right turn by −i. Angles that are not
   multiples of 90° are kept as a count of eighth-turns beside it. */
const cmul = ([a, b], [c, d]) => [a * c - b * d, a * d + b * c];
const UNIT = { north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0] };
export function walkRouteComplex(route) {
  const start = route.start === undefined ? 'north' : typeof route.start === 'number' ? DIRS[route.start] : route.start;
  // Heading as (complex quarter-turn heading, extra eighth turn 0 or 1, clockwise).
  let eighths = DIRS.indexOf(start);
  let pos = [0, 0];
  for (const step of route.steps) {
    if (step.head) eighths = DIRS.indexOf(step.head);
    else if (step.turn === 'left') eighths -= 2;
    else if (step.turn === 'right') eighths += 2;
    else if (step.turn === 'back') eighths += 4;
    else if (step.rot) eighths += (step.rot === 'cw' ? step.deg : -step.deg) / 45;
    eighths = mod(eighths, 8);
    if (step.go) {
      if (eighths % 2) throw new Error('diagonal walk');
      // North rotated clockwise by eighths/2 quarter turns: multiply by (−i) that many times.
      let h = UNIT.north;
      for (let k = 0; k < eighths / 2; k++) h = cmul(h, [0, -1]);
      pos = [pos[0] + h[0] * step.go, pos[1] + h[1] * step.go];
    }
  }
  return { x: pos[0], y: pos[1], facing: eighths };
}

/** Straight-line distance from the start. */
export const distanceFrom = (x, y) => Math.hypot(x, y);

/**
 * The direction of (x, y) as seen from the origin, in exam style: a compass
 * point when one coordinate is 0, otherwise the quadrant (north-east and so on).
 * Null for the origin itself.
 */
export function directionOf(x, y) {
  if (x === 0 && y === 0) return null;
  const ns = y > 0 ? 'north' : y < 0 ? 'south' : '';
  const ew = x > 0 ? 'east' : x < 0 ? 'west' : '';
  return ns && ew ? `${ns}-${ew}` : ns || ew;
}

/** The same, from the angle: within 1e-9 of an axis is that axis, otherwise the quadrant. */
export function directionByAngle(x, y) {
  if (x === 0 && y === 0) return null;
  const deg = mod((Math.atan2(x, y) * 180) / Math.PI, 360); // bearing, clockwise from north
  const axes = [0, 90, 180, 270];
  const on = axes.findIndex((a) => Math.abs(deg - a) < 1e-9 || Math.abs(deg - a - 360) < 1e-9);
  if (on !== -1) return DIRS[on * 2];
  return DIRS[Math.floor(deg / 90) * 2 + 1];
}

/** A step as a phrase, e.g. "walks 5 km north", "turns right and walks 3 km", "turns 45° clockwise" (another verb: "drives 5 km north"). */
export function stepText(step, unit = 'km', verb = 'walks') {
  const walk = step.go ? `${verb} ${step.go} ${unit}` : '';
  if (step.head) return `${walk} ${step.head}`.trim();
  let turn = '';
  if (step.turn === 'back') turn = 'turns back';
  else if (step.turn) turn = `turns ${step.turn}`;
  else if (step.rot) turn = `turns ${step.deg}° ${step.rot === 'cw' ? 'clockwise' : 'anticlockwise'}`;
  if (!turn) return `${verb} straight on for ${step.go} ${unit}`;
  return walk ? `${turn} and ${walk}` : turn;
}

/* ------------------------------ shadows ------------------------------ */

/** Where the shadow falls: away from the sun. Morning sun in the east, evening sun in the west. */
export const shadowDirection = (time) => (time === 'morning' ? 'west' : 'east');

const SIDE_TURN = { front: 0, right: 2, behind: 4, left: 6 };

/** The direction a person faces when the shadow falls on the given side of them. */
export function facingFromShadow(time, side) {
  return DIRS[mod(dirIndex(shadowDirection(time)) - SIDE_TURN[side], 8)];
}

/** The same, by trying the four main directions: face each, and see where the shadow falls. */
export function facingFromShadowBrute(time, side) {
  const sunAt = time === 'morning' ? [1, 0] : [-1, 0];
  const shadow = [-sunAt[0], -sunAt[1]];
  const found = [];
  for (const name of ['north', 'east', 'south', 'west']) {
    const f = UNIT[name];
    const right = [f[1], -f[0]]; // facing rotated a quarter turn clockwise
    const sides = { front: f, right, behind: [-f[0], -f[1]], left: [-right[0], -right[1]] };
    const v = sides[side];
    if (v[0] === shadow[0] && v[1] === shadow[1]) found.push(name);
  }
  return found;
}
