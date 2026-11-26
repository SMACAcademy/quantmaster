/** Logarithms and functions/basic-graphs templates. */

export const functionTemplates = [
  /* ================================ logarithms ================================ */
  {
    id: 'lg-basic-eval',
    version: 1,
    topicId: 'logarithms',
    conceptId: 'lg-definition',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['lg-def-f'],
    estimatedSeconds: 30,
    params(rng) {
      const b = rng.pick([2, 3, 4, 5, 6]);
      const n = rng.int(1, 5);
      const N = b ** n;
      return { b, n, N };
    },
    answer: ({ n }) => n,
    verify: ({ b, N }, value) => b ** value === N,
    render({ b, n, N }) {
      return {
        question: `What is log_${b}(${N})?`,
        explanation: `log_${b}(${N}) asks "${b} to what power gives ${N}?" Since ${b}^${n} = ${N}, log_${b}(${N}) = ${n}.`,
        solutionSteps: [`${b}^${n} = ${N}.`, `So log_${b}(${N}) = ${n}.`],
        method: 'Rewrite as an exponent equation and find the matching power.',
        hints: [`Which power of ${b} gives ${N}?`],
        commonMistakes: ['Confusing the logarithm with plain division.']
      };
    }
  },

  {
    id: 'lg-product-law',
    version: 1,
    topicId: 'logarithms',
    conceptId: 'lg-laws',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['lg-laws-f'],
    estimatedSeconds: 40,
    params(rng) {
      const b = rng.pick([2, 3, 5]);
      const n1 = rng.int(1, 5);
      const n2 = rng.int(1, 5);
      const N1 = b ** n1;
      const N2 = b ** n2;
      if (N1 * N2 > 100000) return null;
      return { b, n1, n2, N1, N2 };
    },
    answer: ({ n1, n2 }) => n1 + n2,
    verify: ({ b, N1, N2 }, value) => b ** value === N1 * N2,
    render({ b, n1, n2, N1, N2 }) {
      return {
        question: `What is log_${b}(${N1} × ${N2})?`,
        explanation: `log_${b}(${N1} × ${N2}) = log_${b}(${N1}) + log_${b}(${N2}) = ${n1} + ${n2} = ${n1 + n2}.`,
        solutionSteps: [`log_${b}(${N1}) = ${n1}.`, `log_${b}(${N2}) = ${n2}.`, `${n1} + ${n2} = ${n1 + n2}.`],
        method: 'Use the product law: log(mn) = log m + log n.',
        hints: [`Both ${N1} and ${N2} are powers of ${b}.`],
        commonMistakes: ['Multiplying the two individual logarithms instead of adding them.']
      };
    }
  },

  {
    id: 'lg-quotient-law',
    version: 1,
    topicId: 'logarithms',
    conceptId: 'lg-laws',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['lg-laws-f'],
    estimatedSeconds: 40,
    params(rng) {
      const b = rng.pick([2, 3, 5]);
      const n2 = rng.int(1, 4);
      const n1 = rng.int(n2 + 1, n2 + 5);
      const N1 = b ** n1;
      const N2 = b ** n2;
      if (N1 > 100000) return null;
      return { b, n1, n2, N1, N2 };
    },
    answer: ({ n1, n2 }) => n1 - n2,
    verify: ({ b, N1, N2 }, value) => b ** value === N1 / N2,
    render({ b, n1, n2, N1, N2 }) {
      return {
        question: `What is log_${b}(${N1} ÷ ${N2})?`,
        explanation: `log_${b}(${N1} ÷ ${N2}) = log_${b}(${N1}) − log_${b}(${N2}) = ${n1} − ${n2} = ${n1 - n2}.`,
        solutionSteps: [`log_${b}(${N1}) = ${n1}.`, `log_${b}(${N2}) = ${n2}.`, `${n1} − ${n2} = ${n1 - n2}.`],
        method: 'Use the quotient law: log(m/n) = log m − log n.',
        hints: [`Both ${N1} and ${N2} are powers of ${b}.`],
        commonMistakes: ['Dividing the two individual logarithms instead of subtracting them.']
      };
    }
  },

  {
    id: 'lg-solve-linear-exponent',
    version: 1,
    topicId: 'logarithms',
    conceptId: 'lg-solve',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['lg-solve-f', 'lg-def-f'],
    estimatedSeconds: 55,
    params(rng) {
      const b = rng.pick([2, 3, 5]);
      const k = rng.int(1, 3);
      const m = rng.int(0, 5);
      const x0 = rng.int(1, 6);
      const p = k * x0 + m;
      const N = b ** p;
      if (N > 100000) return null;
      return { b, k, m, x0, p, N };
    },
    answer: ({ x0 }) => x0,
    verify: ({ b, k, m, N }, value) => b ** (k * value + m) === N,
    render({ b, k, m, x0, N }) {
      const expExpr = m === 0 ? `${k === 1 ? 'x' : `${k}x`}` : `${k === 1 ? 'x' : `${k}x`} + ${m}`;
      return {
        question: `Solve for x: ${b}^(${expExpr}) = ${N}.`,
        explanation: `Write ${N} as a power of ${b}, giving the exponent equation ${expExpr} = ${k * x0 + m}. Solving: x = ${x0}.`,
        solutionSteps: [`${N} = ${b}^${k * x0 + m}.`, `${expExpr} = ${k * x0 + m}.`, `x = ${x0}.`],
        method: 'Rewrite both sides as powers of the same base, then equate the exponents.',
        hints: [`Express ${N} as ${b} raised to some power first.`],
        commonMistakes: ['Solving the linear exponent equation incorrectly after equating the exponents.']
      };
    }
  },

  /* ========================= functions and basic graphs ========================= */
  {
    id: 'fn-linear-eval',
    version: 1,
    topicId: 'functions-graphs',
    conceptId: 'fn-notation',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['fn-eval-f'],
    estimatedSeconds: 30,
    params(rng) {
      const a = rng.int(-8, 8) || 2;
      const b = rng.int(-15, 15);
      const x0 = rng.int(-10, 10);
      return { a, b, x0 };
    },
    answer: ({ a, b, x0 }) => a * x0 + b,
    verify: ({ a, b, x0 }, value) => a * x0 + b === value,
    render({ a, b, x0 }) {
      const value = a * x0 + b;
      return {
        question: `If f(x) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)}, what is f(${x0})?`,
        explanation: `Substitute x = ${x0}: f(${x0}) = ${a}(${x0}) ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${a * x0} ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${value}.`,
        solutionSteps: [`${a} × ${x0} = ${a * x0}.`, `${a * x0} ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${value}.`],
        method: 'Substitute the input value, then evaluate.',
        hints: ['Replace x with the given number everywhere it appears.'],
        commonMistakes: ['Reading f(x0) as a multiplication of f by x0.']
      };
    }
  },

  {
    id: 'fn-quadratic-eval-diff',
    version: 1,
    topicId: 'functions-graphs',
    conceptId: 'fn-notation',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['fn-eval-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(1, 5);
      const b = rng.int(1, 8);
      const p = rng.int(1, 8);
      const q = rng.int(1, 8);
      if (p === q) return null;
      return { a, b, p, q };
    },
    answer: ({ a, b, p, q }) => a * (p * p - q * q) + b * (p - q),
    verify({ a, b, p, q }, value) {
      const fp = a * p * p + b * p;
      const fq = a * q * q + b * q;
      return fp - fq === value;
    },
    render({ a, b, p, q }) {
      const fp = a * p * p + b * p;
      const fq = a * q * q + b * q;
      return {
        question: `If f(x) = ${a}x² + ${b}x, what is f(${p}) − f(${q})?`,
        explanation: `f(${p}) = ${a}(${p})² + ${b}(${p}) = ${fp}. f(${q}) = ${a}(${q})² + ${b}(${q}) = ${fq}. So f(${p}) − f(${q}) = ${fp} − ${fq} = ${fp - fq}.`,
        solutionSteps: [`f(${p}) = ${fp}.`, `f(${q}) = ${fq}.`, `${fp} − ${fq} = ${fp - fq}.`],
        method: 'Evaluate each value fully before subtracting.',
        hints: ['Compute f at each input separately before subtracting.'],
        commonMistakes: ['Subtracting the inputs first and evaluating f only once.']
      };
    }
  },

  {
    id: 'fn-slope-two-points',
    version: 1,
    topicId: 'functions-graphs',
    conceptId: 'fn-linear',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['fn-linear-f'],
    estimatedSeconds: 40,
    tags: ['trap'],
    params(rng) {
      const m = rng.int(-6, 6) || 2;
      const c = rng.int(-10, 10);
      const x1 = rng.int(-10, 10);
      const x2 = rng.int(-10, 10);
      if (x1 === x2) return null;
      const y1 = m * x1 + c;
      const y2 = m * x2 + c;
      return { m, x1, y1, x2, y2 };
    },
    answer: ({ m }) => m,
    verify: ({ x1, y1, x2, y2 }, value) => (y2 - y1) === value * (x2 - x1),
    render({ m, x1, y1, x2, y2 }) {
      return {
        question: `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`,
        explanation: `Slope = (${y2} − ${y1}) / (${x2} − ${x1}) = ${y2 - y1} / ${x2 - x1} = ${m}.`,
        solutionSteps: [`Rise = ${y2} − ${y1} = ${y2 - y1}.`, `Run = ${x2} − ${x1} = ${x2 - x1}.`, `${y2 - y1} ÷ ${x2 - x1} = ${m}.`],
        method: 'Slope = rise over run, using the same order for both points.',
        hints: ['Subtract the y-values and the x-values in the same order.'],
        commonMistakes: ['Mismatching the order of subtraction between the numerator and denominator.']
      };
    }
  },

  {
    id: 'fn-compose-linear',
    version: 1,
    topicId: 'functions-graphs',
    conceptId: 'fn-compose',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['fn-compose-f'],
    estimatedSeconds: 55,
    params(rng) {
      const a = rng.int(-6, 6) || 2;
      const b = rng.int(-10, 10);
      const c = rng.int(-6, 6) || 2;
      const d = rng.int(-10, 10);
      const x0 = rng.int(-10, 10);
      return { a, b, c, d, x0 };
    },
    answer: ({ a, b, c, d, x0 }) => a * (c * x0 + d) + b,
    verify: ({ a, b, c, d, x0 }, value) => {
      const gx = c * x0 + d;
      return a * gx + b === value;
    },
    render({ a, b, c, d, x0 }) {
      const gx = c * x0 + d;
      const result = a * gx + b;
      return {
        question: `If f(x) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)} and g(x) = ${c}x ${d >= 0 ? '+' : '−'} ${Math.abs(d)}, what is f(g(${x0}))?`,
        explanation: `First g(${x0}) = ${c}(${x0}) ${d >= 0 ? '+' : '−'} ${Math.abs(d)} = ${gx}. Then f(${gx}) = ${a}(${gx}) ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${result}.`,
        solutionSteps: [`g(${x0}) = ${gx}.`, `f(${gx}) = ${result}.`],
        method: 'Work from the inside out: apply g first, then f.',
        hints: ['Evaluate the inner function before the outer one.'],
        commonMistakes: ['Applying f before g, reversing the order of composition.']
      };
    }
  }
];
