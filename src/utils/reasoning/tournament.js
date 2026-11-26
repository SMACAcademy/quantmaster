/**
 * Logical sets (CAT-style DILR): round-robin and knockout tournaments, points
 * tables, qualification thresholds, routes on a grid or a road network, and
 * match schedules.
 *
 * Teams are numbered 0..n−1. A round robin plays the pairs of pairs(n) in that
 * order; a result is 'h' (the first team of the pair won), 'a' (the second
 * won) or 'd' (drawn). A scoring is { win, draw, loss } points.
 *
 * Every rule here has a second, independently written method beside it, and
 * tests/reasoning-tournament.test.js holds the two to each other:
 *   matches and totals        formula        against walking every pair / trying every draw count
 *   points tables             a search that prunes on points still possible
 *                                            against counting through all 3^m results
 *   qualification             the n − k − 1 + ⌊k/2⌋ formula against every possible season
 *   knockouts                 n − 1, ⌈log₂ n⌉, 2^r − n against playing the draw round by round
 *   who can meet whom         the highest differing bit against halving the draw
 *   routes                    adding routes into each junction against walking every route
 *   shortest route            Dijkstra against listing every route
 *   schedules                 n − 1 or n days against building the circle-method fixture list
 */

export const SCORINGS = {
  '2-1-0': { win: 2, draw: 1, loss: 0 },
  '3-1-0': { win: 3, draw: 1, loss: 0 }
};

/* ------------------------------ round robin ------------------------------ */

/** The pairs of a single round robin, in a fixed order: [0,1], [0,2], ..., [n−2, n−1]. */
export function pairs(n) {
  const out = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
  return out;
}

/** Matches in a round robin of n teams played `legs` times: legs × nC2. */
export const matchCount = (n, legs = 1) => (legs * n * (n - 1)) / 2;

/** Points of each team after the results (one per pair of pairs(n)). */
export function pointsOf(n, results, scoring) {
  const pts = Array(n).fill(0);
  pairs(n).forEach(([i, j], k) => {
    const r = results[k];
    if (r === 'h') {
      pts[i] += scoring.win;
      pts[j] += scoring.loss;
    } else if (r === 'a') {
      pts[j] += scoring.win;
      pts[i] += scoring.loss;
    } else {
      pts[i] += scoring.draw;
      pts[j] += scoring.draw;
    }
  });
  return pts;
}

/** Wins, draws and losses of team t. */
export function recordOf(n, results, t) {
  const rec = { won: 0, drawn: 0, lost: 0 };
  pairs(n).forEach(([i, j], k) => {
    if (i !== t && j !== t) return;
    const r = results[k];
    if (r === 'd') rec.drawn += 1;
    else if ((r === 'h') === (i === t)) rec.won += 1;
    else rec.lost += 1;
  });
  return rec;
}

/** Total points given out: every decisive match gives win + loss, every draw 2 × draw. */
export const totalPoints = (m, draws, scoring) => (m - draws) * (scoring.win + scoring.loss) + draws * 2 * scoring.draw;

/** Draws from the total points, when each draw changes the total: (m(win + loss) − total) ÷ (win + loss − 2 draw). */
export function drawsFromTotal(m, total, scoring) {
  const per = scoring.win + scoring.loss - 2 * scoring.draw;
  if (per === 0) return null;
  const d = (m * (scoring.win + scoring.loss) - total) / per;
  return Number.isInteger(d) && d >= 0 && d <= m ? d : null;
}

/** Every number of draws (0..m) that gives this total, tried one by one. */
export function drawsByTrying(m, total, scoring) {
  const out = [];
  for (let d = 0; d <= m; d++) {
    let sum = 0;
    for (let k = 0; k < m; k++) sum += k < d ? 2 * scoring.draw : scoring.win + scoring.loss;
    if (sum === total) out.push(d);
  }
  return out;
}

/** Positions from points: 1 + the number of teams with more points (equal points share a position). */
export function positionsOf(points) {
  return points.map((p) => 1 + points.filter((q) => q > p).length);
}

/* ------------------------------ points tables ------------------------------ */

/**
 * Every set of results that fits. `points[t]` is a number or null (unknown);
 * `known` lists results already given: { pair: [i, j], result: 'h' | 'a' | 'd' }
 * with the result read for that order; `allowDraw` false forbids draws;
 * `check(results, pts)` is any further condition. Search: results are chosen
 * match by match, and a branch is dropped as soon as a team has more points
 * than its total, or too few matches left to reach it.
 */
export function solveTable({ n, points, scoring, known = [], allowDraw = true, check = null }) {
  const list = pairs(n);
  const fixed = fixedResults(n, known);
  const left = Array(n).fill(n - 1);
  const pts = Array(n).fill(0);
  const results = [];
  const out = [];
  const best = Math.max(scoring.win, scoring.draw, scoring.loss);
  const options = allowDraw ? ['h', 'd', 'a'] : ['h', 'a'];
  const give = (i, j, r, sign) => {
    pts[i] += sign * (r === 'h' ? scoring.win : r === 'a' ? scoring.loss : scoring.draw);
    pts[j] += sign * (r === 'a' ? scoring.win : r === 'h' ? scoring.loss : scoring.draw);
  };
  const ok = (t) => points[t] === null || points[t] === undefined || (pts[t] <= points[t] && pts[t] + left[t] * best >= points[t]);
  const go = (k) => {
    if (k === list.length) {
      if (points.every((p, t) => p === null || p === undefined || p === pts[t]) && (!check || check([...results], [...pts]))) out.push([...results]);
      return;
    }
    const [i, j] = list[k];
    left[i] -= 1;
    left[j] -= 1;
    for (const r of fixed[k] ? [fixed[k]] : options) {
      give(i, j, r, 1);
      results.push(r);
      if (ok(i) && ok(j)) go(k + 1);
      results.pop();
      give(i, j, r, -1);
    }
    left[i] += 1;
    left[j] += 1;
  };
  go(0);
  return out;
}

/** Known results turned into one entry per pair of pairs(n). */
function fixedResults(n, known) {
  return pairs(n).map(([i, j]) => {
    const f = known.find((x) => (x.pair[0] === i && x.pair[1] === j) || (x.pair[0] === j && x.pair[1] === i));
    if (!f) return null;
    if (f.result === 'd' || f.pair[0] === i) return f.result;
    return f.result === 'h' ? 'a' : 'h';
  });
}

/**
 * The same, the slow way: count from 0 to 3^m − 1 (or 2^m − 1 without draws),
 * read each number as a list of results, and keep those that fit.
 */
export function solveTableByCounting({ n, points, scoring, known = [], allowDraw = true, check = null }) {
  const list = pairs(n);
  const m = list.length;
  const symbols = allowDraw ? ['h', 'd', 'a'] : ['h', 'a'];
  const base = symbols.length;
  const out = [];
  for (let code = 0; code < base ** m; code++) {
    const results = [];
    let c = code;
    for (let k = 0; k < m; k++) {
      results.push(symbols[c % base]);
      c = Math.floor(c / base);
    }
    if (!known.every((f) => resultBetween(n, results, f.pair[0], f.pair[1]) === f.result)) continue;
    const pts = pointsOf(n, results, scoring);
    if (!points.every((p, t) => p === null || p === undefined || p === pts[t])) continue;
    if (check && !check(results, pts)) continue;
    out.push(results);
  }
  return out;
}

/** The result of the match between a and b, read from a's side: 'h' a won, 'a' b won, 'd' drawn. */
export function resultBetween(n, results, a, b) {
  const k = pairs(n).findIndex(([i, j]) => (i === a && j === b) || (i === b && j === a));
  const r = results[k];
  if (r === 'd' || a < b) return r;
  return r === 'h' ? 'a' : 'h';
}

/* ------------------------------ qualification ------------------------------ */

/**
 * n teams play once each, no draws, `win` points a win; the top k go through,
 * and a tie is broken against the team in question.
 *   maxOut  the most points a team can have and still go out:
 *           k + 1 teams beat all the others and share their own matches as
 *           evenly as possible, so the weakest of them has n − k − 1 + ⌊k/2⌋ wins
 *   minSafe the fewest points that are always enough: one more win
 */
export function qualifyFormula(n, k, win = 2) {
  const maxOut = win * (n - k - 1 + Math.floor(k / 2));
  return { maxOut, minSafe: maxOut + win };
}

const qualifyCache = new Map();

/**
 * The same thresholds by playing every possible season (2^m of them, or 3^m with
 * draws): a team goes out if at least k others have as many points or more.
 * minSafe is the smallest score anyone can reach that never goes out.
 */
export function qualifyByBrute(n, k, scoring = SCORINGS['2-1-0'], allowDraw = false) {
  const key = `${n}|${k}|${scoring.win},${scoring.draw},${scoring.loss}|${allowDraw}`;
  if (qualifyCache.has(key)) return qualifyCache.get(key);
  const m = matchCount(n);
  const symbols = allowDraw ? ['h', 'd', 'a'] : ['h', 'a'];
  const reachable = new Set();
  let maxOut = -1;
  const results = Array(m).fill('h');
  for (let code = 0; code < symbols.length ** m; code++) {
    let c = code;
    for (let i = 0; i < m; i++) {
      results[i] = symbols[c % symbols.length];
      c = Math.floor(c / symbols.length);
    }
    const pts = pointsOf(n, results, scoring);
    for (let t = 0; t < n; t++) {
      reachable.add(pts[t]);
      const level = pts.filter((p, u) => u !== t && p >= pts[t]).length;
      if (level >= k && pts[t] > maxOut) maxOut = pts[t];
    }
  }
  const minSafe = Math.min(...[...reachable].filter((p) => p > maxOut));
  const out = { maxOut, minSafe };
  qualifyCache.set(key, out);
  return out;
}

/* ------------------------------ knockout ------------------------------ */

/** A knockout of n players: n − 1 matches, ⌈log₂ n⌉ rounds, and 2^rounds − n byes in the first round. */
export function knockoutFormula(n) {
  const rounds = Math.ceil(Math.log2(n));
  const byes = 2 ** rounds - n;
  return { matches: n - 1, rounds, byes, firstRoundMatches: (n - byes) / 2 };
}

/**
 * Play the draw: in the first round the byes sit out so that the next round is
 * a power of 2; after that the players pair off until one is left.
 */
export function knockoutBySimulation(n) {
  let size = 1;
  while (size < n) size *= 2;
  const byes = size - n;
  let players = n;
  let matches = 0;
  let rounds = 0;
  let firstRoundMatches = 0;
  while (players > 1) {
    const sittingOut = rounds === 0 ? byes : 0;
    const games = (players - sittingOut) / 2;
    if (rounds === 0) firstRoundMatches = games;
    matches += games;
    players = sittingOut + games;
    rounds += 1;
  }
  return { matches, rounds, byes, firstRoundMatches };
}

/** The round (1 = first) in which draw positions a and b (counted from 1) can meet: the highest bit where a − 1 and b − 1 differ. */
export const meetRound = (a, b) => Math.floor(Math.log2((a - 1) ^ (b - 1))) + 1;

/** The same by halving: after each round a player's slot is half what it was; they meet when the slots first coincide. */
export function meetRoundByHalving(a, b) {
  let x = a - 1;
  let y = b - 1;
  let round = 0;
  while (x !== y) {
    x = Math.floor(x / 2);
    y = Math.floor(y / 2);
    round += 1;
  }
  return round;
}

/** The names of the rounds of a draw of `size` players: Round 1, ..., Quarter-final, Semi-final, Final. */
export function roundNames(size) {
  const total = Math.log2(size);
  return Array.from({ length: total }, (_, i) => {
    const fromEnd = total - i;
    return fromEnd === 1 ? 'Final' : fromEnd === 2 ? 'Semi-final' : fromEnd === 3 ? 'Quarter-final' : `Round ${i + 1}`;
  });
}

/* ------------------------------ routes ------------------------------ */

const binom = (n, r) => {
  let v = 1;
  for (let i = 1; i <= r; i++) v = (v * (n - r + i)) / i;
  return Math.round(v);
};

/**
 * Shortest routes on a street grid from (0, 0) to (east, north), moving only
 * east or north, avoiding the `blocked` junctions ([x, y]): add the routes into
 * each junction from the one to its west and the one to its south.
 */
export function gridRoutes(east, north, blocked = []) {
  const shut = new Set(blocked.map(([x, y]) => `${x},${y}`));
  const ways = Array.from({ length: east + 1 }, () => Array(north + 1).fill(0));
  for (let x = 0; x <= east; x++) {
    for (let y = 0; y <= north; y++) {
      if (shut.has(`${x},${y}`)) continue;
      if (x === 0 && y === 0) ways[x][y] = 1;
      else ways[x][y] = (x > 0 ? ways[x - 1][y] : 0) + (y > 0 ? ways[x][y - 1] : 0);
    }
  }
  return ways[east][north];
}

/** The grid routes again, by walking every one: each is a word of `east` E's and `north` N's. */
export function gridRoutesByWalking(east, north, blocked = [], through = null) {
  const shut = new Set(blocked.map(([x, y]) => `${x},${y}`));
  let count = 0;
  const walk = (x, y, passed) => {
    if (shut.has(`${x},${y}`)) return;
    const here = passed || (through && through[0] === x && through[1] === y);
    if (x === east && y === north) {
      if (!through || here) count += 1;
      return;
    }
    if (x < east) walk(x + 1, y, here);
    if (y < north) walk(x, y + 1, here);
  };
  walk(0, 0, false);
  return count;
}

/** Routes through one junction: routes to it × routes from it, C(x + y, x) × C(east − x + north − y, east − x). */
export const gridRoutesThrough = (east, north, [x, y]) => binom(x + y, x) * binom(east - x + north - y, east - x);
export const gridRoutesAll = (east, north) => binom(east + north, east);

/**
 * Routes on a road network. `roads` are [from, to, km]; `oneWay` true means each
 * road runs only from → to. countRoutes adds up the routes out of each place
 * (the network must have no loops when one-way); listRoutes walks every route
 * that never visits a place twice.
 */
export function countRoutes(roads, from, to) {
  const memo = new Map();
  const ways = (p) => {
    if (p === to) return 1;
    if (memo.has(p)) return memo.get(p);
    let total = 0;
    for (const [a, b] of roads) if (a === p) total += ways(b);
    memo.set(p, total);
    return total;
  };
  return ways(from);
}

export function listRoutes(roads, from, to, oneWay = true) {
  const out = [];
  const next = (p) => roads.flatMap(([a, b, km]) => (a === p ? [[b, km]] : !oneWay && b === p ? [[a, km]] : []));
  const walk = (p, path, km) => {
    if (p === to) {
      out.push({ path: [...path], km });
      return;
    }
    for (const [q, d] of next(p)) {
      if (path.includes(q)) continue;
      path.push(q);
      walk(q, path, km + d);
      path.pop();
    }
  };
  walk(from, [from], 0);
  return out;
}

/** Shortest distance by Dijkstra's method: settle the nearest unsettled place each time. */
export function shortestRoute(roads, from, to, oneWay = false) {
  const places = [...new Set([from, to, ...roads.flatMap(([a, b]) => [a, b])])];
  const dist = new Map(places.map((p) => [p, Infinity]));
  const done = new Set();
  dist.set(from, 0);
  while (done.size < places.length) {
    let best = null;
    for (const p of places) if (!done.has(p) && (best === null || dist.get(p) < dist.get(best))) best = p;
    if (dist.get(best) === Infinity) break;
    done.add(best);
    for (const [a, b, km] of roads) {
      if (a === best && dist.get(best) + km < dist.get(b)) dist.set(b, dist.get(best) + km);
      if (!oneWay && b === best && dist.get(best) + km < dist.get(a)) dist.set(a, dist.get(best) + km);
    }
  }
  return dist.get(to);
}

/* ------------------------------ schedules ------------------------------ */

/** Fewest days for a single round robin when no team plays twice a day: n − 1 if n is even, n if odd. */
export const minDays = (n, legs = 1) => legs * (n % 2 === 0 ? n - 1 : n);

/**
 * The circle method: fix one team, rotate the rest one place a day, and pair
 * the teams across the circle (with a dummy "rest" team when n is odd).
 * Returns the days, each a list of [i, j] matches.
 */
export function circleSchedule(n) {
  const teams = Array.from({ length: n % 2 === 0 ? n : n + 1 }, (_, i) => i);
  const size = teams.length;
  const days = [];
  let ring = teams.slice(1);
  for (let d = 0; d < size - 1; d++) {
    const order = [teams[0], ...ring];
    const day = [];
    for (let i = 0; i < size / 2; i++) {
      const a = order[i];
      const b = order[size - 1 - i];
      if (a < n && b < n) day.push([Math.min(a, b), Math.max(a, b)]);
    }
    days.push(day);
    ring = [ring[ring.length - 1], ...ring.slice(0, -1)];
  }
  return days;
}

/** What is wrong with a fixture list: a pair missed or repeated, or a team playing twice in a day. */
export function scheduleProblems(n, days) {
  const problems = [];
  const seen = new Map();
  days.forEach((day, d) => {
    const busy = new Set();
    for (const [a, b] of day) {
      if (busy.has(a) || busy.has(b)) problems.push(`day ${d + 1}: a team plays twice`);
      busy.add(a);
      busy.add(b);
      const key = `${a}-${b}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
  });
  for (const [a, b] of pairs(n)) if (seen.get(`${a}-${b}`) !== 1) problems.push(`${a} v ${b} played ${seen.get(`${a}-${b}`) || 0} times`);
  return problems;
}

/** A lower bound for the days: at most ⌊n/2⌋ matches fit in a day. */
export const daysLowerBound = (n, legs = 1) => Math.ceil(matchCount(n, legs) / Math.floor(n / 2));
