/**
 * Polynomials for the polynomials topic: values, synthetic and long division,
 * real roots and the relations between roots and coefficients.
 *
 * A polynomial is an array of coefficients, highest power first:
 * [1, −6, 11, −6] is x³ − 6x² + 11x − 6. tests/polynomials.test.js checks the
 * division against multiplication back, and the roots against the values.
 */

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (k) => String(k).split('').map((d) => SUP[d]).join('');
const tidy = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : v);

/** Drop leading zero coefficients (keeping at least one). */
export function trim(coeffs) {
  let i = 0;
  while (i < coeffs.length - 1 && Math.abs(coeffs[i]) < 1e-12) i++;
  return coeffs.slice(i);
}

export const degree = (coeffs) => trim(coeffs).length - 1;

/** p(x) by Horner's rule. */
export function evaluate(coeffs, x) {
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

/** p(x) term by term (Σ cₖ xᵏ): a second, independent way to evaluate. */
export function evaluateByPowers(coeffs, x) {
  const n = coeffs.length - 1;
  return coeffs.reduce((sum, c, i) => sum + c * x ** (n - i), 0);
}

export function add(p, q) {
  const n = Math.max(p.length, q.length);
  const a = [...Array(n - p.length).fill(0), ...p];
  const b = [...Array(n - q.length).fill(0), ...q];
  return trim(a.map((v, i) => v + b[i]));
}

export function multiply(p, q) {
  const out = Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => (out[i + j] += a * b)));
  return trim(out);
}

/** The polynomial lead × (x − r₁)(x − r₂)… */
export function fromRoots(roots, lead = 1) {
  return roots.reduce((poly, r) => multiply(poly, [1, -r]), [lead]);
}

/**
 * Synthetic division of p(x) by (x − a). Returns the quotient's coefficients,
 * the remainder, and the two working rows (the products written under the
 * coefficients, and the running sums) for display.
 */
export function syntheticDivision(coeffs, a) {
  const sums = [];
  const products = [];
  coeffs.forEach((c, i) => {
    const carried = i === 0 ? 0 : sums[i - 1] * a;
    products.push(i === 0 ? null : tidy(carried));
    sums.push(tidy(c + carried));
  });
  return { quotient: sums.slice(0, -1), remainder: sums[sums.length - 1], products, sums };
}

/**
 * Long division of polynomials: dividend = divisor × quotient + remainder,
 * with deg(remainder) < deg(divisor).
 */
export function divide(dividend, divisor) {
  const d = trim(divisor);
  let r = [...trim(dividend)];
  if (d.length === 1 && Math.abs(d[0]) < 1e-12) throw new Error('division by zero polynomial');
  if (r.length < d.length) return { quotient: [0], remainder: r };
  const q = Array(r.length - d.length + 1).fill(0);
  for (let i = 0; i < q.length; i++) {
    const factor = r[i] / d[0];
    q[i] = tidy(factor);
    for (let j = 0; j < d.length; j++) r[i + j] = tidy(r[i + j] - factor * d[j]);
  }
  const remainder = trim(r.slice(q.length));
  return { quotient: q, remainder };
}

/** The derivative's coefficients. */
export function derivative(coeffs) {
  const n = coeffs.length - 1;
  if (n <= 0) return [0];
  return coeffs.slice(0, -1).map((c, i) => c * (n - i));
}

/**
 * The distinct real roots of p, sorted, found by bisection between the turning
 * points (the real roots of p′, found the same way). A root where the curve
 * only touches the axis is found as a turning point at height zero.
 */
export function realRoots(coeffs, tolerance = 1e-9) {
  const p = trim(coeffs);
  const n = p.length - 1;
  if (n < 1) return [];
  if (n === 1) return [tidy(-p[1] / p[0])];
  const bound = 1 + Math.max(...p.slice(1).map((c) => Math.abs(c / p[0])));
  const turning = realRoots(derivative(p), tolerance);
  const marks = [-bound, ...turning.filter((t) => t > -bound && t < bound), bound];
  const roots = [];
  const push = (x) => {
    const v = (Math.abs(x - Math.round(x)) < 1e-6 && Math.abs(evaluate(p, Math.round(x))) < 1e-9 ? Math.round(x) : x) + 0;
    if (!roots.some((r) => Math.abs(r - v) < 1e-6)) roots.push(v);
  };
  const scale = Math.max(1, ...p.map(Math.abs));
  for (const t of turning) if (Math.abs(evaluate(p, t)) < 1e-7 * scale) push(t);
  for (let i = 0; i + 1 < marks.length; i++) {
    let lo = marks[i];
    let hi = marks[i + 1];
    let flo = evaluate(p, lo);
    const fhi = evaluate(p, hi);
    if (flo === 0) {
      push(lo);
      continue;
    }
    if (fhi === 0) {
      push(hi);
      continue;
    }
    if (flo * fhi > 0) continue;
    for (let k = 0; k < 200 && hi - lo > tolerance; k++) {
      const mid = (lo + hi) / 2;
      const fm = evaluate(p, mid);
      if (fm === 0) {
        lo = hi = mid;
        break;
      }
      if (fm * flo < 0) hi = mid;
      else {
        lo = mid;
        flo = fm;
      }
    }
    push((lo + hi) / 2);
  }
  return roots.sort((a, b) => a - b);
}

/**
 * The relations between the roots and coefficients of ax² + bx + c or
 * ax³ + bx² + cx + d: the sum of the roots, the sum of products two at a
 * time, and the product (all roots, real or not, counted with multiplicity).
 */
export function vieta(coeffs) {
  const p = trim(coeffs);
  const a = p[0];
  if (p.length === 3) return { sum: tidy(-p[1] / a), product: tidy(p[2] / a) };
  if (p.length === 4) return { sum: tidy(-p[1] / a), pairSum: tidy(p[2] / a), product: tidy(-p[3] / a) };
  throw new Error('vieta: quadratic or cubic only');
}

/** A coefficient written with a true minus sign. */
const num = (v) => {
  const s = Number.isInteger(v) ? String(Math.abs(v)) : String(Number(Math.abs(v).toFixed(4)));
  return s;
};

/** "x³ − 6x² + 11x − 6": highest power first, unit coefficients dropped, true minus signs. */
export function polyText(coeffs, variable = 'x') {
  const p = trim(coeffs);
  const n = p.length - 1;
  const parts = [];
  p.forEach((c, i) => {
    if (c === 0) return;
    const power = n - i;
    const absC = Math.abs(c);
    const coef = power > 0 && absC === 1 ? '' : num(c);
    const body = power === 0 ? num(c) : `${coef}${variable}${power > 1 ? sup(power) : ''}`;
    if (!parts.length) parts.push(c < 0 ? `−${body}` : body);
    else parts.push(c < 0 ? `− ${body}` : `+ ${body}`);
  });
  return parts.length ? parts.join(' ') : '0';
}

/** "(x − 3)", "(x + 2)", "x" for the divisor x − a. */
export function linearFactorText(a, variable = 'x') {
  if (a === 0) return variable;
  return a > 0 ? `(${variable} − ${a})` : `(${variable} + ${-a})`;
}
