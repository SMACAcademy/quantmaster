/** Inequalities advanced unit: AM ≥ GM and maximum or minimum values (Phase E). */

import { fmt, gcd, nearlyEqual } from '../core.js';

/** Smallest and largest of f over lo..hi in steps of `step` (a brute-force scan). */
function scan(f, lo, hi, step) {
  let min = Infinity;
  let max = -Infinity;
  let argMin = NaN;
  let argMax = NaN;
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) {
    const x = lo + i * step;
    const y = f(x);
    if (y < min) [min, argMin] = [y, x];
    if (y > max) [max, argMax] = [y, x];
  }
  return { min, max, argMin, argMax };
}

/** "2x² − 12x + 23", "−x² + 6x", with a proper minus sign. */
function quadratic(a, b, c) {
  const lead = a === 1 ? 'x²' : a === -1 ? '−x²' : `${a < 0 ? '−' : ''}${Math.abs(a)}x²`;
  const mid = b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`;
  const end = c === 0 ? '' : ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}`;
  return lead + mid + end;
}

const signed = (value) => (value < 0 ? `(−${Math.abs(value)})` : `${value}`);
const minus = (value) => (value < 0 ? `−${Math.abs(value)}` : `${value}`);
const coef = (value) => (value === 1 ? '' : `${value}`);

export const advAmGmTemplates = [
  /* ============================== AM ≥ GM ============================== */
  {
    id: 'in-adv-amgm-equal-parts',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-adv-amgm',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['in-adv-amgm-f'],
    estimatedSeconds: 50,
    params(rng) {
      const n = rng.pick([2, 2, 3]);
      const m = n === 2 ? rng.int(3, 30) : rng.int(2, 12);
      return { n, m, fixedSum: rng.chance(0.5) };
    },
    // Fixed sum n·m → largest product mⁿ; fixed product mⁿ → smallest sum n·m.
    answer: ({ n, m, fixedSum }) => (fixedSum ? m ** n : n * m),
    // Brute force over every split on a half-unit grid.
    verify({ n, m, fixedSum }, value) {
      const step = 0.5;
      let best = fixedSum ? -Infinity : Infinity;
      if (fixedSum) {
        const S = n * m;
        for (let x = step; x < S; x += step) {
          if (n === 2) best = Math.max(best, x * (S - x));
          else for (let y = step; x + y < S; y += step) best = Math.max(best, x * y * (S - x - y));
        }
      } else {
        const P = m ** n;
        const top = n === 2 ? P : 3 * m;
        for (let x = step; x <= top; x += step) {
          if (n === 2) best = Math.min(best, x + P / x);
          else for (let y = step; y <= top; y += step) best = Math.min(best, x + y + P / (x * y));
        }
      }
      return nearlyEqual(best, value);
    },
    render({ n, m, fixedSum }) {
      const count = n === 2 ? 'Two' : 'Three';
      const parts = Array(n).fill(m).join(' × ');
      const S = n * m;
      const P = m ** n;
      if (fixedSum) {
        return {
          question: `${count} positive numbers add up to ${S}. What is the largest possible value of their product?`,
          explanation: `With the sum fixed, AM ≥ GM says the product is largest when the numbers are equal: each is ${S} ÷ ${n} = ${m}, so the product is ${parts} = ${fmt(P)}.`,
          solutionSteps: ['Fixed sum → equal parts give the largest product.', `${S} ÷ ${n} = ${m} each.`, `${parts} = ${fmt(P)}.`],
          method: 'Fixed sum: make the parts equal.',
          hints: [`Try a few splits of ${S}. Which gives the biggest product?`, 'The product is largest when the numbers are equal.'],
          commonMistakes: [`Giving ${m}, the size of each number, instead of the product.`]
        };
      }
      return {
        question: `${count} positive numbers have a product of ${fmt(P)}. What is the smallest possible value of their sum?`,
        explanation: `With the product fixed, AM ≥ GM says the sum is smallest when the numbers are equal: each is the ${n === 2 ? 'square' : 'cube'} root of ${fmt(P)}, which is ${m}, so the sum is ${n} × ${m} = ${S}.`,
        solutionSteps: ['Fixed product → equal parts give the smallest sum.', `${n === 2 ? '√' : '∛'}${fmt(P)} = ${m}.`, `${n} × ${m} = ${S}.`],
        method: 'Fixed product: make the parts equal.',
        hints: [`Try a few ways to write ${fmt(P)} as a product. Which has the smallest sum?`, `The sum is smallest when the numbers are equal: ${n === 2 ? 'square' : 'cube'} root.`],
        commonMistakes: [`Using 1 as one of the numbers, which makes the sum much larger, not smaller.`]
      };
    }
  },

  {
    id: 'in-adv-amgm-ax-plus-b-over-x',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-adv-amgm',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['in-adv-amgm-f', 'in-sc-am-gm'],
    estimatedSeconds: 60,
    // a = s·p², b = s·q², so ab = (spq)², the minimum 2spq is whole and the best x = q/p
    // (p is 1, 2 or 4, so q/p is a clean decimal).
    params(rng) {
      const s = rng.int(1, 4);
      const p = rng.pick([1, 2, 4]);
      const q = rng.int(1, 9);
      if (p === q || gcd(p, q) !== 1) return null;
      const a = s * p * p;
      const b = s * q * q;
      if (a < 2 || b > 400) return null;
      return { s, p, q, a, b };
    },
    answer: ({ s, p, q }) => 2 * s * p * q,
    formatValue: (value) => fmt(value),
    distractors: ({ s, p, q, a, b }) => [
      { value: s * p * q, why: 'gave √(ab), forgetting the factor 2' },
      { value: a + b, why: 'substituted x = 1' },
      { value: q / p, why: 'gave the value of x where the minimum occurs' },
      { value: (2 * q) / p, why: 'used 2√(b/a) instead of 2√(ab)' }
    ],
    // Brute force over x > 0 on a fine grid (q/p lands exactly on a grid point).
    verify({ a, b }, value) {
      const { min } = scan((x) => a * x + b / x, 1 / 1200, 30, 1 / 1200);
      return nearlyEqual(min, value, 1e-9);
    },
    render({ s, p, q, a, b }) {
      const m = 2 * s * p * q;
      const x = fmt(q / p);
      return {
        question: `For x > 0, what is the minimum value of ${coef(a)}x + ${b}/x?`,
        explanation: `For x > 0 both terms are positive, and their product ${coef(a)}x × ${b}/x = ${fmt(a * b)} is fixed. By AM ≥ GM, ${coef(a)}x + ${b}/x ≥ 2√${fmt(a * b)} = ${m}, with equality when ${coef(a)}x = ${b}/x, that is x = ${x}.`,
        solutionSteps: [`Product of the terms: ${a} × ${b} = ${fmt(a * b)}, a constant.`, `AM ≥ GM: sum ≥ 2√${fmt(a * b)} = 2 × ${s * p * q} = ${m}.`, `Equality at x = √(${b}/${a}) = ${x}.`],
        method: 'ax + b/x ≥ 2√(ab) for x > 0.',
        hints: ['Multiply the two terms together. What happens to x?', `A fixed product gives the smallest sum when the terms are equal: ${coef(a)}x = ${b}/x.`],
        commonMistakes: [`Giving √${fmt(a * b)} = ${s * p * q}, forgetting the 2.`, `Substituting x = 1 to get ${a + b}.`]
      };
    }
  },

  /* ======================= maximum or minimum of a quadratic ======================= */
  {
    id: 'in-adv-quad-extreme-value',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-adv-quad-extreme',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['in-adv-vertex-f'],
    estimatedSeconds: 60,
    // Built from the vertex form a(x − h)² + k, so the turning point is whole.
    params(rng) {
      const a = rng.pick([-3, -2, -1, 1, 2, 3]);
      const h = rng.int(-6, 6);
      if (h === 0) return null;
      const k = rng.int(-15, 30);
      return { a, h, k, b: -2 * a * h, c: a * h * h + k, askX: rng.chance(0.3) };
    },
    answer: ({ h, k, askX }) => (askX ? h : k),
    // Brute force: scan the expanded quadratic on a fine grid.
    verify({ a, b, c, askX }, value) {
      const { min, max, argMin, argMax } = scan((x) => a * x * x + b * x + c, -60, 60, 0.01);
      if (askX) return Math.abs((a > 0 ? argMin : argMax) - value) < 0.005;
      return nearlyEqual(a > 0 ? min : max, value, 1e-9);
    },
    render({ a, b, c, h, k, askX }) {
      const kind = a > 0 ? 'minimum' : 'maximum';
      const expr = quadratic(a, b, c);
      return {
        question: askX
          ? `For what value of x does ${expr} reach its ${kind}?`
          : `What is the ${kind} value of ${expr}?`,
        explanation: `Here a = ${minus(a)} and b = ${minus(b)}. Since a ${a > 0 ? '> 0 the parabola opens upwards, so it has a minimum' : '< 0 the parabola opens downwards, so it has a maximum'} at x = −b ÷ 2a = ${minus(-b)} ÷ ${signed(2 * a)} = ${minus(h)}.${askX ? '' : ` The value there is ${minus(c)} − ${signed(b)}² ÷ ${signed(4 * a)} = ${minus(k)}.`}`,
        solutionSteps: [
          `a = ${minus(a)}, b = ${minus(b)}, c = ${minus(c)}; a ${a > 0 ? '> 0, so a minimum' : '< 0, so a maximum'}.`,
          `x = −b ÷ 2a = ${minus(h)}.`,
          askX ? `The ${kind} is at x = ${minus(h)}.` : `c − b² ÷ 4a = ${minus(c)} − ${b * b} ÷ ${signed(4 * a)} = ${minus(k)}.`
        ],
        method: askX ? 'Turning point at x = −b/2a.' : 'Turning point at x = −b/2a, then the value c − b²/4a.',
        hints: [`Read off a = ${minus(a)} and b = ${minus(b)}.`, askX ? 'The turning point is at x = −b ÷ 2a.' : `Find x = −b ÷ 2a, then substitute it into ${expr}.`],
        commonMistakes: askX
          ? ['Using x = b ÷ 2a and getting the sign wrong.']
          : [`Giving ${minus(h)}, the value of x, instead of the ${kind} value.`, 'Losing the sign of a in c − b² ÷ 4a.']
      };
    }
  },

  {
    id: 'in-adv-fence-area',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-adv-quad-extreme',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['in-sc-adv-fencing', 'in-adv-vertex-f'],
    estimatedSeconds: 90,
    params(rng) {
      const L = 4 * rng.int(5, 60);
      const wall = rng.chance(0.5);
      return { L, wall, side: wall ? rng.pick(['a long wall', 'a river', 'a straight hedge']) : null };
    },
    // No wall: square of side L/4. Wall: L/4, L/2, L/4.
    answer: ({ L, wall }) => (wall ? (L * L) / 8 : (L * L) / 16),
    formatValue: (value) => `${fmt(value)} m²`,
    distractors: ({ L, wall }) =>
      wall
        ? [
            { value: (L * L) / 16, why: 'ignored the wall and made a square' },
            { value: Number.isInteger(L / 3) ? (L / 3) ** 2 : null, why: 'made all three fenced sides equal' },
            { value: (L * L) / 4, why: 'fenced only two sides, as if l + b = L' },
            { value: L / 2, why: 'gave the side along the wall instead of the area' }
          ]
        : [
            { value: (L * L) / 4, why: 'took L as l + b instead of 2(l + b)' },
            { value: (L * L) / 8, why: 'used the wall formula with no wall' },
            { value: L / 4, why: 'gave the side of the square instead of the area' }
          ],
    // Brute force over every whole-metre side (L/4 is whole, so the best side is too).
    verify({ L, wall }, value) {
      let best = 0;
      for (let x = 1; x < (wall ? L / 2 : L / 2); x++) {
        best = Math.max(best, wall ? x * (L - 2 * x) : x * (L / 2 - x));
      }
      return best === value;
    },
    render({ L, wall, side }) {
      const q = L / 4;
      if (wall) {
        return {
          question: `A rectangular plot beside ${side} is fenced on its other three sides with ${L} m of fencing. What is the largest area it can enclose?`,
          explanation: `Let each side at right angles to ${side} be x m; the side along it is then ${L} − 2x. The area x(${L} − 2x) = ${L}x − 2x² peaks at x = ${L} ÷ 4 = ${q}, so the plot is ${q} × ${L / 2} = ${fmt((L * L) / 8)} m².`,
          solutionSteps: [`Sides x, x and ${L} − 2x.`, `Area = ${L}x − 2x²; x = −${L} ÷ (2 × −2) = ${q}.`, `${q} × ${L / 2} = ${fmt((L * L) / 8)} m².`],
          method: 'Area as a quadratic in one side; the side along the wall is twice each of the others.',
          hints: ['Only three sides need fencing. If two of them are x each, how long is the third?', `Maximise x(${L} − 2x).`],
          commonMistakes: [`Ignoring ${side} and making a square: ${fmt((L * L) / 16)} m².`, `Making the three fenced sides equal (${fmt(L / 3)} m each).`]
        };
      }
      return {
        question: `A farmer has ${L} m of fencing to enclose a rectangular plot. What is the largest area he can enclose?`,
        explanation: `The perimeter is 2(l + b) = ${L}, so l + b = ${L / 2} is fixed. The area l × b is largest when l = b = ${q}, a square: ${q} × ${q} = ${fmt((L * L) / 16)} m².`,
        solutionSteps: [`2(l + b) = ${L}, so l + b = ${L / 2}.`, `Fixed sum → equal sides: l = b = ${q}.`, `Area = ${q}² = ${fmt((L * L) / 16)} m².`],
        method: 'A fixed perimeter encloses the most area as a square.',
        hints: [`Half the perimeter gives l + b = ${L / 2}.`, 'With l + b fixed, l × b is largest when l = b.'],
        commonMistakes: [`Taking ${L} as l + b, giving ${fmt((L * L) / 4)} m².`, `Using the wall formula with no wall: ${fmt((L * L) / 8)} m².`]
      };
    }
  }
];
