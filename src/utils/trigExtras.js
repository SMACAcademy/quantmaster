/**
 * Trigonometry beyond the right triangle: radian measure, exact surd values
 * read back as numbers, a sin θ + b cos θ as one rotating vector, and numeric
 * sweeps for greatest and least values and for roots of simple equations.
 * Shared by the question generators (src/generators/templates/advTrigonometry.js)
 * and the simulation (src/simulations/trigWaves.js); DOM-free and unit-tested
 * in tests/trigExtras.test.js.
 */

export const RAD = Math.PI / 180;

const gcd = (a, b) => {
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y) [x, y] = [y, x % y];
  return x || 1;
};

/** A whole number of degrees as a fraction of π in lowest terms: 210 → [7, 6] (210° = 7π/6). */
export function radianFraction(degrees) {
  const g = gcd(degrees, 180);
  return [degrees / g, 180 / g];
}

/** kπ/n written the way the questions write it: 0, π, 2π, π/6, 7π/6. */
export function piFractionText(k, n) {
  if (k === 0) return '0';
  const g = gcd(k, n);
  const [top, bottom] = [k / g, n / g];
  const sign = top < 0 ? '−' : '';
  const head = Math.abs(top) === 1 ? 'π' : `${Math.abs(top)}π`;
  return `${sign}${head}${bottom === 1 ? '' : `/${bottom}`}`;
}

/** A whole number of degrees in radians, as text: 210 → "7π/6". */
export function radianText(degrees) {
  return piFractionText(...radianFraction(degrees));
}

/**
 * The value of an exact expression as the questions write it, such as
 * "2 − √3", "(√3 + 1)/(2√2)", "7π/6" or "√6/2"; NaN for anything it cannot read.
 * √ applies to the number or bracket straight after it; a number written
 * against √, π or a bracket multiplies it ("2√3", "7π"). Used to check a
 * template's text answer against Math.sin and friends.
 */
export function surdValue(text) {
  const src = String(text).replace(/\s+/g, '');
  let i = 0;
  const peek = () => src[i];
  const startsFactor = (ch) => ch !== undefined && /[0-9.√π(]/.test(ch);

  function number() {
    const match = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (!match) throw new Error('number expected');
    i += match[0].length;
    return Number(match[0]);
  }
  function factor() {
    const ch = peek();
    if (ch === '-' || ch === '−') {
      i += 1;
      return -factor();
    }
    if (ch === '√') {
      i += 1;
      return Math.sqrt(factor());
    }
    if (ch === 'π') {
      i += 1;
      return Math.PI;
    }
    if (ch === '(') {
      i += 1;
      const value = expression();
      if (peek() !== ')') throw new Error('missing )');
      i += 1;
      return value;
    }
    return number();
  }
  function term() {
    let value = factor();
    for (;;) {
      const ch = peek();
      if (ch === '×' || ch === '*') {
        i += 1;
        value *= factor();
      } else if (ch === '/' || ch === '÷') {
        i += 1;
        value /= factor();
      } else if (startsFactor(ch)) {
        value *= factor();
      } else {
        return value;
      }
    }
  }
  function expression() {
    let value = term();
    for (;;) {
      const ch = peek();
      if (ch === '+') {
        i += 1;
        value += term();
      } else if (ch === '-' || ch === '−') {
        i += 1;
        value -= term();
      } else {
        return value;
      }
    }
  }

  try {
    if (!src) return NaN;
    const value = expression();
    return i === src.length ? value : NaN;
  } catch {
    return NaN;
  }
}

/* ------------------------- a sin θ + b cos θ ------------------------- */

/** a sin θ + b cos θ at θ degrees. */
export const waveValue = (a, b, degrees) => a * Math.sin(degrees * RAD) + b * Math.cos(degrees * RAD);

/** The length of the combined vector, √(a² + b²): the greatest value of a sin θ + b cos θ. */
export const amplitude = (a, b) => Math.hypot(a, b);

/** α in a sin θ + b cos θ = R sin(θ + α), in degrees (−180 < α ≤ 180). */
export const phase = (a, b) => Math.atan2(b, a) / RAD;

/** Where a sin θ + b cos θ peaks, in degrees from 0 up to (not including) 360. */
export function peakAngle(a, b) {
  const angle = (((90 - phase(a, b)) % 360) + 360) % 360;
  return Math.abs(angle - 360) < 1e-9 ? 0 : angle;
}

/**
 * The two arrows behind a sin θ + b cos θ: a at angle θ, then b at right angles
 * to it (angle θ + 90°). A is where the first ends, P where the second does;
 * P's height is the value, and OP has length √(a² + b²).
 */
export function rotatingVector(a, b, degrees) {
  const [c, s] = [Math.cos(degrees * RAD), Math.sin(degrees * RAD)];
  const A = [a * c, a * s];
  const P = [A[0] - b * s, A[1] + b * c];
  return { A, P };
}

/* ------------------------- numeric sweeps ------------------------- */

/** The least and greatest of fn over from … to, sampling every `step`, and where they occur. */
export function sweepExtremes(fn, from, to, step) {
  let min = Infinity;
  let max = -Infinity;
  let argMin = from;
  let argMax = from;
  const count = Math.round((to - from) / step);
  for (let k = 0; k <= count; k++) {
    const x = from + k * step;
    const y = fn(x);
    if (!Number.isFinite(y)) continue;
    if (y < min) [min, argMin] = [y, x];
    if (y > max) [max, argMax] = [y, x];
  }
  return { min, max, argMin, argMax };
}

/**
 * Where fn crosses or touches zero on from … to: sign changes found by
 * sampling every `step`, then narrowed by bisection; touching points (a
 * sample within `touch` of zero) count too. Nearby duplicates are merged.
 */
export function rootsOf(fn, from, to, step, touch = 1e-12) {
  const roots = [];
  const add = (x) => {
    if (!roots.some((r) => Math.abs(r - x) < step)) roots.push(x);
  };
  const count = Math.round((to - from) / step);
  let prevX = from;
  let prevY = fn(from);
  if (Math.abs(prevY) <= touch) add(from);
  for (let k = 1; k <= count; k++) {
    const x = from + k * step;
    const y = fn(x);
    if (Math.abs(y) <= touch) add(x);
    else if (Number.isFinite(prevY) && Number.isFinite(y) && Math.abs(prevY) > touch && Math.sign(y) !== Math.sign(prevY)) {
      let [lo, hi, fLo] = [prevX, x, prevY];
      for (let n = 0; n < 60; n++) {
        const mid = (lo + hi) / 2;
        const fMid = fn(mid);
        if (Math.sign(fMid) === Math.sign(fLo)) [lo, fLo] = [mid, fMid];
        else hi = mid;
      }
      add((lo + hi) / 2);
    }
    [prevX, prevY] = [x, y];
  }
  return roots.sort((p, q) => p - q);
}
