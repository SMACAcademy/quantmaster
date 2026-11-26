/**
 * Number system advanced unit: number bases (Phase E).
 *
 * Each template computes its answer one way and verifies it another: where the
 * answer uses hand-written place values or repeated division, the verifier uses
 * parseInt(str, base) (or BigInt's toString(base)), and where the answer comes
 * from algebra or a digit-sum rule, the verifier brute-forces every candidate.
 */

const DIGITS = '0123456789ABCDEF';
const SUBSCRIPT = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const SUPERSCRIPT = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const subscript = (n) => String(n).split('').map((d) => SUBSCRIPT[d]).join('');
const superscript = (n) => String(n).split('').map((d) => SUPERSCRIPT[d]).join('');

/** "312" in base 7 → "312₇". */
const numeral = (digits, base) => `${digits}${subscript(base)}`;

/** Decimal → base b by repeated division (the method the learner uses). */
function toBase(n, base) {
  if (n === 0) return '0';
  let out = '';
  while (n > 0) {
    out = DIGITS[n % base] + out;
    n = Math.floor(n / base);
  }
  return out;
}

/** Base b → decimal by place values, written out by hand. */
function fromBase(digits, base) {
  let value = 0;
  for (const ch of digits) value = value * base + DIGITS.indexOf(ch);
  return value;
}

/** True when every digit is a real digit of `base`. */
const validIn = (digits, base) =>
  digits.length > 0 && [...digits].every((ch) => DIGITS.indexOf(ch) >= 0 && DIGITS.indexOf(ch) < base);

const stripZeros = (digits) => digits.replace(/^0+(?=.)/, '');
const reverse = (digits) => [...digits].reverse().join('');

/** The repeated-division working, one line per step. */
function divisionSteps(n, base) {
  const steps = [];
  while (n > 0) {
    steps.push(`${n} ÷ ${base} = ${Math.floor(n / base)} remainder ${n % base}`);
    n = Math.floor(n / base);
  }
  return steps;
}

/** Split a bit string into groups of `size`, counting from the right. */
function groupFromRight(bits, size) {
  const groups = [];
  for (let end = bits.length; end > 0; end -= size) groups.unshift(bits.slice(Math.max(0, end - size), end));
  return groups;
}

/** Split a bit string into groups of `size`, counting (wrongly) from the left. */
function groupFromLeft(bits, size) {
  const groups = [];
  for (let start = 0; start < bits.length; start += size) groups.push(bits.slice(start, start + size));
  return groups;
}

const groupDigit = (group) => DIGITS[fromBase(group, 2)];
const BASE_NAMES = { 8: 'octal', 16: 'hexadecimal' };

export const advNumberBasesTemplates = [
  /* ======================== converting between bases ======================== */
  {
    id: 'ns-nb-to-decimal',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-nb-convert',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['ns-adv-nb-place-value-f'],
    estimatedSeconds: 50,
    tags: ['advanced', 'number-bases'],
    params(rng) {
      const base = rng.pick([2, 2, 3, 4, 5, 6, 7, 8, 9]);
      const length = base === 2 ? rng.int(5, 8) : rng.int(3, 4);
      let digits = String(rng.int(1, base - 1));
      for (let i = 1; i < length; i++) digits += String(rng.int(0, base - 1));
      return { base, digits };
    },
    answer: ({ base, digits }) => fromBase(digits, base),
    verify: ({ base, digits }, value) => parseInt(digits, base) === value,
    render({ base, digits }) {
      const n = digits.length;
      const terms = [...digits].map((d, i) => ({ d: Number(d), place: base ** (n - 1 - i) }));
      const places = terms.map((t) => t.place).reverse();
      const products = terms.filter((t) => t.d > 0);
      const total = fromBase(digits, base);
      const sum = products.map((t) => (base === 2 ? `${t.place}` : `${t.d} × ${t.place}`)).join(' + ');
      return {
        question: `What is ${numeral(digits, base)} in decimal?`,
        explanation: `In base ${base} the places, from the right, are worth ${places.join(', ')}. Multiply each digit by its place value and add: ${sum} = ${total}.`,
        solutionSteps: [
          `Place values from the right: ${places.join(', ')}.`,
          `${numeral(digits, base)} = ${terms.map((t) => `${t.d} × ${t.place}`).join(' + ')}.`,
          `= ${products.map((t) => t.d * t.place).join(' + ')} = ${total}.`
        ],
        method: 'Multiply each digit by its place value and add.',
        hints: [
          `The rightmost place is worth 1; each place to its left is worth ${base} times as much.`,
          `The leftmost digit of ${numeral(digits, base)} sits in the ${base}${superscript(n - 1)} = ${base ** (n - 1)} place.`
        ],
        commonMistakes: [
          `Reading the digits as a decimal number and answering ${digits}.`,
          'Starting the place values from the left, so the leftmost digit is counted as units.'
        ]
      };
    }
  },
  {
    id: 'ns-nb-from-decimal',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-nb-convert',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ns-adv-nb-place-value-f'],
    estimatedSeconds: 80,
    tags: ['advanced', 'number-bases'],
    formatValue: (digits, { base }) => numeral(digits, base),
    params(rng) {
      const base = rng.int(3, 9);
      const n = rng.int(base * base, Math.min(base ** 4 - 1, 999));
      return { base, n };
    },
    answer: ({ base, n }) => toBase(n, base),
    distractors({ base, n }) {
      const right = toBase(n, base);
      const candidates = [
        { value: stripZeros(reverse(right)), why: 'read the remainders from the top down' },
        { value: toBase(n, base - 1), why: `divided by ${base - 1} instead of ${base}` },
        { value: toBase(n, base + 1), why: `divided by ${base + 1} instead of ${base}` },
        { value: `${Math.floor(n / base)}${n % base}`, why: 'stopped after one division and wrote the quotient in decimal' },
        { value: stripZeros(right.slice(1)), why: 'stopped one division early and lost the leading digit' }
      ];
      return candidates.filter((c) => validIn(c.value, base));
    },
    verify: ({ base, n }, value) => validIn(value, base) && parseInt(value, base) === n,
    render({ base, n }, { fmt }) {
      const right = toBase(n, base);
      const steps = divisionSteps(n, base);
      return {
        question: `What is ${n} written in base ${base}?`,
        explanation: `Divide by ${base} again and again: ${steps.join('; ')}. Reading the remainders from the bottom up gives ${fmt(right)}. Check: ${[...right].map((d, i) => `${d} × ${base ** (right.length - 1 - i)}`).join(' + ')} = ${n}.`,
        solutionSteps: [...steps.map((s) => `${s}.`), `Read the remainders from the bottom up: ${fmt(right)}.`],
        method: 'Divide by the base repeatedly and read the remainders from last to first.',
        hints: [
          `Divide ${n} by ${base} and write down the remainder.`,
          `Keep dividing each quotient by ${base} until it reaches 0, then read the remainders upwards.`
        ],
        commonMistakes: [
          'Reading the remainders from the top down, which reverses the digits.',
          `Dividing by the wrong base: every digit of the answer must be less than ${base}.`
        ]
      };
    }
  },
  {
    id: 'ns-nb-binary-groups',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-nb-convert',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ns-sc-nb-bit-groups'],
    estimatedSeconds: 70,
    tags: ['advanced', 'number-bases'],
    formatValue: (digits, { target }) => numeral(digits, target),
    params(rng) {
      const target = rng.pick([8, 16]);
      const size = target === 8 ? 3 : 4;
      const length = rng.pick(target === 8 ? [7, 8, 10, 11] : [6, 7, 9, 10, 11]);
      if (length % size === 0) return null;
      let bits = '1';
      for (let i = 1; i < length; i++) bits += rng.chance(0.5) ? '1' : '0';
      return { bits, target, size };
    },
    answer: ({ bits, size }) => groupFromRight(bits, size).map(groupDigit).join(''),
    distractors({ bits, target, size }) {
      const groups = groupFromRight(bits, size);
      const otherSize = size === 3 ? 4 : 3;
      const candidates = [
        { value: groupFromLeft(bits, size).map(groupDigit).join(''), why: 'grouped the bits from the left' },
        { value: stripZeros([...groups].reverse().map(groupDigit).join('')), why: 'wrote the groups in the wrong order' },
        { value: groupFromRight(bits, otherSize).map(groupDigit).join(''), why: `grouped in ${otherSize}s, the wrong group size` },
        { value: groups.map((g) => groupDigit(reverse(g.padStart(size, '0')))).join(''), why: 'read each group of bits backwards' }
      ];
      return candidates.filter((c) => validIn(c.value, target));
    },
    verify: ({ bits, target }, value) => parseInt(value, target) === parseInt(bits, 2),
    render({ bits, target, size }, { fmt }) {
      const groups = groupFromRight(bits, size);
      const padded = groups.map((g) => g.padStart(size, '0'));
      const answer = groups.map(groupDigit).join('');
      const name = BASE_NAMES[target];
      return {
        question: `Write ${numeral(bits, 2)} in ${name}.`,
        explanation: `${target} = 2${superscript(size)}, so each ${name} digit stands for ${size} bits. Group from the right: ${groups.join(' | ')}, padded to ${padded.join(' | ')}. The groups are worth ${padded.map((g) => `${fromBase(g, 2)}`).join(', ')}, so the answer is ${fmt(answer)}.`,
        solutionSteps: [
          `Split ${numeral(bits, 2)} into groups of ${size} from the right: ${groups.join(' | ')}.`,
          `Pad the leftmost group with zeros: ${padded.join(' | ')}.`,
          `Write each group as one digit: ${padded.map((g) => `${g} → ${groupDigit(g)}`).join(', ')}.`,
          `So the number is ${fmt(answer)}.`
        ],
        method: `One ${name} digit for each group of ${size} bits, grouping from the right.`,
        hints: [
          `${target} = 2${superscript(size)}, so one ${name} digit covers ${size} bits.`,
          `Start the groups at the right-hand end: the last ${size} bits are ${bits.slice(-size)}.`
        ],
        commonMistakes: [
          'Grouping from the left, which leaves the short group at the wrong end.',
          `Grouping in ${size === 3 ? 4 : 3}s, which gives ${size === 3 ? 'hexadecimal' : 'octal'} digits instead.`
        ]
      };
    }
  },

  /* ============================= working in a base ============================ */
  {
    id: 'ns-nb-unknown-base',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-nb-arith',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ns-adv-nb-equation-f'],
    estimatedSeconds: 100,
    tags: ['advanced', 'number-bases'],
    params(rng) {
      // Two two-digit numbers whose units column carries once, so the sum's
      // tens digit is one more than a1 + c1 and the equation fixes the base.
      const base = rng.int(5, 9);
      const a0 = rng.int(1, base - 1);
      const c0 = rng.int(Math.max(1, base - a0), base - 1);
      const a1 = rng.int(1, base - 3);
      const c1 = rng.int(1, base - 2 - a1);
      const s0 = a0 + c0 - base;
      const s1 = a1 + c1 + 1;
      return { a: `${a1}${a0}`, c: `${c1}${c0}`, s: `${s1}${s0}` };
    },
    // Algebra: (a1 + c1)b + (a0 + c0) = s1·b + s0, so b = (a0 + c0 − s0) / (s1 − a1 − c1).
    answer({ a, c, s }) {
      const [a1, a0] = [...a].map(Number);
      const [c1, c0] = [...c].map(Number);
      const [s1, s0] = [...s].map(Number);
      return (a0 + c0 - s0) / (s1 - a1 - c1);
    },
    // Brute force: the only base (larger than every digit) in which the sum is true.
    verify({ a, c, s }, value) {
      const maxDigit = Math.max(...[...`${a}${c}${s}`].map(Number));
      const works = [];
      for (let b = maxDigit + 1; b <= 36; b++) {
        if (parseInt(a, b) + parseInt(c, b) === parseInt(s, b)) works.push(b);
      }
      return works.length === 1 && works[0] === value;
    },
    render({ a, c, s }) {
      const coef = (k) => (k === 1 ? 'b' : `${k}b`);
      const lin = (k, u) => (u ? `${coef(k)} + ${u}` : coef(k));
      const [a1, a0] = [...a].map(Number);
      const [c1, c0] = [...c].map(Number);
      const [s1, s0] = [...s].map(Number);
      const b = (a0 + c0 - s0) / (s1 - a1 - c1);
      const maxDigit = Math.max(...[...`${a}${c}${s}`].map(Number));
      return {
        question: `The sum ${a} + ${c} = ${s} is correct when all three numbers are written in the same base b. What is b?`,
        explanation: `In base b, ${a} = ${lin(a1, a0)}, ${c} = ${lin(c1, c0)} and ${s} = ${lin(s1, s0)}. So ${lin(a1 + c1, a0 + c0)} = ${lin(s1, s0)}, which gives b = ${a0 + c0 - s0}. Check: in base ${b}, ${a0} + ${c0} = ${a0 + c0} = ${b} + ${s0} (write ${s0}, carry 1) and ${a1} + ${c1} + 1 = ${s1}.`,
        solutionSteps: [
          `Write each number with place values: ${lin(a1, a0)}, ${lin(c1, c0)} and ${lin(s1, s0)}.`,
          `(${lin(a1, a0)}) + (${lin(c1, c0)}) = ${lin(a1 + c1, a0 + c0)}.`,
          `${lin(a1 + c1, a0 + c0)} = ${lin(s1, s0)}, so b = ${s0 ? `${a0 + c0} − ${s0} = ` : ''}${b}.`,
          `The digits go up to ${maxDigit}, and ${b} is larger, so base ${b} is allowed.`
        ],
        method: 'Write each number as place values in b and solve the equation.',
        hints: [
          `${a} in base b means ${a1} × b + ${a0}.`,
          `The units column gives ${a0} + ${c0}, but the sum shows ${s0}: a carry of 1 took away one b.`
        ],
        commonMistakes: [
          maxDigit + 1 < b
            ? `Giving ${maxDigit + 1}, the smallest base the digits allow, without solving the equation.`
            : 'Guessing the smallest base the digits allow without checking that the sum works in it.',
          `Matching the columns as in decimal (${a0} + ${c0} is not ${s0}) and deciding the sum is impossible: the units column carried 1.`
        ]
      };
    }
  },
  {
    id: 'ns-nb-missing-digit',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-nb-arith',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ns-sc-nb-digit-sum'],
    estimatedSeconds: 90,
    tags: ['advanced', 'number-bases'],
    params(rng) {
      const base = rng.int(5, 9);
      const length = rng.int(4, 5);
      const digits = [rng.int(1, base - 1)];
      for (let i = 1; i < length; i++) digits.push(rng.int(0, base - 1));
      const slot = rng.int(1, length - 1);
      const known = digits.reduce((sum, d, i) => (i === slot ? sum : sum + d), 0);
      // x ≡ −known (mod b − 1) has two digit solutions (0 and b − 1) when known is a multiple.
      if (known % (base - 1) === 0) return null;
      return { base, digits: digits.map(String), slot };
    },
    // Digit-sum rule: x is the digit that tops the known digits up to a multiple of b − 1.
    answer({ base, digits, slot }) {
      const known = digits.reduce((sum, d, i) => (i === slot ? sum : sum + Number(d)), 0);
      return (base - 1 - (known % (base - 1))) % (base - 1);
    },
    // Brute force: try every digit and divide the actual number.
    verify({ base, digits, slot }, value) {
      const works = [];
      for (let x = 0; x < base; x++) {
        const str = digits.map((d, i) => (i === slot ? String(x) : d)).join('');
        if (parseInt(str, base) % (base - 1) === 0) works.push(x);
      }
      return works.length === 1 && works[0] === value;
    },
    render({ base, digits, slot }) {
      const shown = digits.map((d, i) => (i === slot ? 'x' : d)).join('');
      const knownDigits = digits.filter((_, i) => i !== slot);
      const known = knownDigits.reduce((sum, d) => sum + Number(d), 0);
      const x = (base - 1 - (known % (base - 1))) % (base - 1);
      const target = known + x;
      return {
        question: `In the base-${base} number ${numeral(shown, base)}, x is a single digit. The number is divisible by ${base - 1}. What is x?`,
        explanation: `In base ${base}, a number leaves the same remainder on division by ${base - 1} as its digit sum, because ${base} leaves remainder 1. The digits add to ${knownDigits.join(' + ')} + x = ${known} + x, which must be a multiple of ${base - 1}. x is between 0 and ${base - 1}, so ${known} + x = ${target} and x = ${x}.`,
        solutionSteps: [
          `The base is ${base}, so test divisibility by ${base} − 1 = ${base - 1} with the digit sum.`,
          `Digit sum = ${knownDigits.join(' + ')} + x = ${known} + x.`,
          `The next multiple of ${base - 1} reachable with a digit up to ${base - 1} is ${target}.`,
          `x = ${target} − ${known} = ${x}.`
        ],
        method: 'Divisibility by b − 1 through the digit sum.',
        hints: [
          `${base - 1} is one less than the base ${base}.`,
          `A base-${base} number and its digit sum leave the same remainder on division by ${base - 1}.`,
          `Which digit makes ${known} + x a multiple of ${base - 1}?`
        ],
        commonMistakes: [
          `Using a decimal divisibility rule for ${base - 1}, which does not apply in base ${base}.`,
          `Choosing a digit of ${base} or more, which cannot appear in base ${base}.`
        ]
      };
    }
  },
  {
    id: 'ns-nb-last-digit',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-nb-arith',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ns-adv-nb-last-digit-f'],
    estimatedSeconds: 80,
    tags: ['advanced', 'number-bases'],
    params(rng) {
      const base = rng.int(3, 9);
      const r = rng.int(2, base - 1); // a remainder of 0 or 1 would make the cycle trivial
      const a = r + base * rng.int(1, Math.floor((30 - r) / base));
      return { base, a, k: rng.int(11, 49) };
    },
    // Remainder on division by the base, found with repeated multiplication mod b.
    answer({ base, a, k }) {
      let r = 1;
      for (let i = 0; i < k; i++) r = (r * a) % base;
      return r;
    },
    // Write the whole power in base b and read its last digit.
    verify({ base, a, k }, value) {
      const written = (BigInt(a) ** BigInt(k)).toString(base);
      return parseInt(written.slice(-1), base) === value;
    },
    render({ base, a, k }) {
      const r = a % base;
      const cycle = [];
      let p = r;
      while (!cycle.includes(p)) {
        cycle.push(p);
        p = (p * r) % base;
      }
      // The powers of r mod b settle into a cycle; find where it starts.
      const start = cycle.indexOf(p);
      const period = cycle.length - start;
      const index = k - 1 < start ? k - 1 : start + ((k - 1 - start) % period);
      const value = cycle[index];
      const decimalLast = Number((BigInt(a) ** BigInt(k)) % 10n);
      let pattern;
      if (period === 1 && start === 0) pattern = `${cycle[0]} for every power`;
      else if (period === 1) pattern = `${cycle.join(', ')}, and from then on stay at ${cycle[start]}`;
      else if (start === 0) pattern = `${cycle.join(', ')}, then repeat every ${period}`;
      else pattern = `${cycle.join(', ')}, then repeat from ${cycle[start]} every ${period}`;
      return {
        question: `What is the last digit of ${a}${superscript(k)} when it is written in base ${base}?`,
        explanation: `The last digit in base ${base} is the remainder on division by ${base}. ${a} leaves ${r}, so ${a}${superscript(k)} leaves the same remainder as ${r}${superscript(k)}. The remainders of ${r}, ${r}², ${r}³, … on division by ${base} are ${pattern}. Power ${k} lands on ${value}, so the last digit is ${value}.`,
        solutionSteps: [
          `Last digit in base ${base} = remainder on division by ${base}.`,
          `${a} leaves ${r} on division by ${base}, so look at powers of ${r}.`,
          `Remainders of powers of ${r}: ${pattern}.`,
          `Power ${k} lands on ${value}.`
        ],
        method: 'Last digit in base b = N mod b; find the remainder with a cycle.',
        hints: [
          `The last digit of N in base ${base} is N mod ${base}.`,
          `${a} leaves remainder ${r} on division by ${base}, so work with powers of ${r}.`,
          `List the remainders of ${r}, ${r}², ${r}³, … on division by ${base} until they repeat.`
        ],
        commonMistakes: [
          decimalLast !== value
            ? `Giving ${decimalLast}, the last digit of ${a}${superscript(k)} in decimal.`
            : `Using the decimal last digit of ${a}${superscript(k)}; it only agrees with base ${base} here by chance.`,
          'Counting the position in the cycle from 0 instead of from the first power.'
        ]
      };
    }
  }
];
