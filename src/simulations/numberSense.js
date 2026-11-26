/** Simulations for the number system, divisibility, factors and decimals (Phase G). */

import { show } from './core.js';

/*
 * Every picture here is a `rects` plot laid out in pixels: the renderer fits a
 * plot into 500 × 282 px (simPlots.js), so a plot 500 wide and at most 282 high
 * is drawn at exactly one unit per pixel. A rectangle's label shows only when
 * it is at least 7 px per character + 6 wide and 18 px high.
 */
const BOX_W = 500;
const BOX_H = 282;

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).replace(/\d/g, (d) => SUPERSCRIPTS[d]);
const MINUS = '−';

/** A short list for a readout: all of it, or its start and end around an ellipsis. */
function listText(items, max = 12) {
  if (items.length <= max) return items.join(', ');
  return `${items.slice(0, max - 3).join(', ')}, … ${items.slice(-2).join(', ')}`;
}

/** Smallest prime factor of every number up to n (spf[1] = 1). */
function smallestPrimeFactors(n) {
  const spf = Array.from({ length: n + 1 }, (_, i) => i);
  for (let p = 2; p * p <= n; p++) {
    if (spf[p] !== p) continue;
    for (let m = p * p; m <= n; m += p) if (spf[m] === m) spf[m] = p;
  }
  return spf;
}

/** Prime factorisation as [[prime, power], ...]. */
function primePowers(n) {
  const out = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    let k = 0;
    while (m % p === 0) {
      m /= p;
      k += 1;
    }
    if (k) out.push([p, k]);
  }
  if (m > 1) out.push([m, 1]);
  return out;
}

/* ------------------------------ prime sieve ------------------------------ */

export const primeSieve = {
  id: 'prime-sieve',
  topicId: 'number-system',
  alsoTopicIds: ['factors-multiples'],
  title: 'The sieve of Eratosthenes',
  summary: 'Cross out the multiples of each prime in turn. Whatever survives is prime, and the sieve can stop at the square root.',
  controls: [
    { id: 'n', label: 'Numbers up to', type: 'range', min: 20, max: 100, step: 10, default: 100 },
    { id: 'step', label: 'Primes sieved with', type: 'range', min: 0, max: 8, step: 1, default: 1 }
  ],
  compute({ n, step }) {
    const spf = smallestPrimeFactors(n);
    const primes = [];
    for (let m = 2; m <= n; m++) if (spf[m] === m) primes.push(m);
    const sieving = primes.slice(0, step);
    const p = step > 0 ? primes[step - 1] : 0;
    // Below the next prime's square, every number left is certainly prime.
    const next = primes[step];
    const safeBelow = next ? next * next : n + 1;
    const needed = primes.filter((q) => q * q <= n);
    const finished = step >= needed.length;
    const firstIdle = primes.find((q) => q * q > n);

    const status = [];
    for (let m = 1; m <= n; m++) {
      if (m === 1) status.push('one');
      else if (spf[m] === m) status.push(m === p ? 'current' : m < safeBelow || finished || m <= p ? 'prime' : 'open');
      else if (spf[m] === p) status.push('new');
      else if (spf[m] < p) status.push('old');
      else status.push('open'); // a composite whose smallest prime factor is still to come
    }
    const at = (m) => status[m - 1];
    const crossedNow = [];
    const known = [];
    const open = [];
    for (let m = 2; m <= n; m++) {
      if (at(m) === 'new') crossedNow.push(m);
      else if (at(m) === 'prime' || at(m) === 'current') known.push(m);
      else if (at(m) === 'open') open.push(m);
    }
    const compositesLeft = open.filter((m) => spf[m] !== m);

    // Ten to a row, with a line of text above the grid.
    const top = 26;
    const rows = Math.ceil(n / 10);
    const cellW = BOX_W / 10;
    const cellH = Math.min(36, (BOX_H - top) / rows);
    const rects = [];
    const TONES = {
      one: { tone: 'algebra', faint: true, dashed: true },
      prime: { tone: 'geometry' },
      current: { tone: 'data' },
      new: { tone: 'combinatorics', faint: true },
      old: { tone: 'algebra', faint: true },
      open: { tone: 'arithmetic', faint: true }
    };
    for (let m = 1; m <= n; m++) {
      const col = (m - 1) % 10;
      const row = Math.floor((m - 1) / 10);
      const x = col * cellW + 3;
      const y = top + row * cellH + 2;
      const w = cellW - 6;
      const h = cellH - 4;
      const style = TONES[at(m)];
      rects.push({ x, y, w, h, label: String(m), ...style });
      // A crossed-out number gets a stroke through it.
      if (at(m) === 'new' || at(m) === 'old') rects.push({ x: x + w / 2 - 12, y: y + h / 2 - 1, w: 24, h: 2, tone: at(m) === 'new' ? 'combinatorics' : 'algebra' });
    }

    let heading;
    if (step === 0) heading = '1 is not prime. Start with 2, the first prime.';
    else if (crossedNow.length) heading = `Multiples of ${p}, from ${p}${sup(2)} = ${p * p}: ${crossedNow.length} crossed out`;
    else heading = `${p}${sup(2)} = ${p * p} > ${n}: nothing new to cross out`;
    const notes = [{ x: 4, y: 17, text: heading, anchor: 'start' }];

    let insight;
    if (step === 0) insight = '1 has only one factor, so it is not prime. 2 is: nothing but 1 and 2 divides it. Sieve with 2 to clear every even number after it.';
    else if (!crossedNow.length)
      insight = `${p}${sup(2)} = ${p * p} is past ${n}, so every multiple of ${p} up to ${n} has a smaller prime factor and is already gone. The sieve can stop at √${n}.`;
    else if (finished)
      insight = `Every composite up to ${n} has a prime factor no bigger than √${n}, so sieving with ${sieving.join(', ')} is enough: ${known.length} primes remain.`;
    else
      insight = `Crossing out starts at ${p}${sup(2)} = ${p * p}: smaller multiples of ${p} have a smaller prime factor and are gone already. Every number left below ${next}${sup(2)} = ${safeBelow} is prime.`;

    return {
      numbers: { n, p, sieving, primes: known, primeCount: known.length, finished, newCrossed: crossedNow.length, crossedNow, compositesLeft, open, firstIdle },
      readouts: [
        { label: 'Sieved with', value: sieving.length ? sieving.join(', ') : 'nothing yet' },
        {
          label: 'This step',
          value: step === 0 ? '1 set aside' : crossedNow.length ? `crossed out ${listText(crossedNow, 8)}` : `${p} crosses out nothing new`
        },
        { label: finished ? 'Primes up to ' + n : 'Primes found so far', value: `${known.length}: ${listText(known)}` },
        { label: 'Still to decide', value: open.length ? `${open.length} numbers from ${open[0]} on` : 'none: every number left is prime' }
      ],
      plot: {
        kind: 'rects',
        width: BOX_W,
        height: top + rows * cellH,
        rects,
        notes,
        summary: `The numbers 1 to ${n} after sieving with ${sieving.length ? sieving.join(', ') : 'no primes yet'}: ${known.length} primes found${
          open.length ? `, ${open.length} numbers still to decide` : ', and every number left is prime'
        }.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'fifty',
      prompt: 'Sieve the numbers up to 50 until every number left is prime. How many primes are there?',
      check: (values, n) => values.n === 50 && n.finished,
      solution: { n: 50, step: 4 }
    },
    {
      id: 'idle',
      prompt: 'Step on to the first prime that has nothing new to cross out.',
      check: (values, n) => values.step > 0 && n.p === n.firstIdle,
      solution: { n: 100, step: 5 }
    },
    {
      id: 'lone-survivor',
      prompt: 'Sieve with 2 and 3 only, on a grid where exactly one composite number survives.',
      check: (values, n) => values.step === 2 && n.compositesLeft.length === 1,
      solution: { n: 30, step: 2 }
    }
  ]
};

/* --------------------------- divisibility rules --------------------------- */

const DIVISORS = [2, 3, 4, 5, 6, 8, 9, 11, 12];
const PLACE_NAMES = ['1', '10', `10${sup(2)}`, `10${sup(3)}`, `10${sup(4)}`];

/**
 * One digit test on the digits (units first): what it looks at, what that
 * leaves on division by d, and the working as text.
 */
function digitTest(d, digits) {
  const [u, t, h] = digits;
  if (d === 2 || d === 5) {
    const pass = u % d === 0;
    return {
      d,
      used: [0],
      value: u,
      remainder: u % d,
      pass,
      work: d === 2 ? `Last digit ${u} is ${pass ? 'even' : 'odd'}` : `Last digit ${u} is ${pass ? '' : 'not '}0 or 5`,
      short: `last digit ${u}`
    };
  }
  if (d === 4 || d === 8) {
    const places = d === 4 ? 2 : 3;
    const value = d === 4 ? 10 * t + u : 100 * h + 10 * t + u;
    const text = String(value).padStart(places, '0');
    return { d, used: places === 2 ? [0, 1] : [0, 1, 2], value, remainder: value % d, pass: value % d === 0, work: `Last ${places === 2 ? 'two' : 'three'} digits: ${text}`, short: `last ${places === 2 ? 'two' : 'three'} digits ${text}` };
  }
  if (d === 3 || d === 9) {
    const value = digits.reduce((s, x) => s + x, 0);
    const shown = digits.slice().reverse().join(' + ');
    return { d, used: [0, 1, 2, 3, 4], value, remainder: value % d, pass: value % d === 0, work: `Digit sum: ${shown} = ${value}`, short: `digit sum ${value}` };
  }
  // 11: units +, tens −, hundreds +, … (10 leaves −1 on division by 11).
  const value = digits.reduce((s, x, i) => s + (i % 2 ? -x : x), 0);
  const terms = digits.map((x, i) => (i === 0 ? String(x) : `${i % 2 ? MINUS : '+'} ${x}`)).join(' ');
  return {
    d,
    used: [0, 1, 2, 3, 4],
    value,
    remainder: ((value % 11) + 11) % 11,
    pass: value % 11 === 0,
    work: `From the units: ${terms} = ${value < 0 ? MINUS + -value : value}`
  };
}

const remainderText = (test) => {
  const v = test.value < 0 ? `${MINUS}${-test.value}` : show(test.value, 0);
  return test.remainder === 0 ? `${v} is a multiple of ${test.d}` : `${v} leaves ${test.remainder} on division by ${test.d}`;
};

export const divisibilityChecker = {
  id: 'divisibility-checker',
  topicId: 'divisibility',
  title: 'Divisibility tests at work',
  summary: 'Build a five-digit number and pick a divisor. See which digits the test reads, and check its verdict against the real remainder.',
  controls: [
    {
      id: 'divisor',
      label: 'Divide by',
      type: 'choice',
      options: DIVISORS.map((d) => ({ id: String(d), label: String(d) })),
      default: '3'
    },
    { id: 'd4', label: 'Ten-thousands digit', type: 'range', min: 1, max: 9, step: 1, default: 4 },
    { id: 'd3', label: 'Thousands digit', type: 'range', min: 0, max: 9, step: 1, default: 7 },
    { id: 'd2', label: 'Hundreds digit', type: 'range', min: 0, max: 9, step: 1, default: 5 },
    { id: 'd1', label: 'Tens digit', type: 'range', min: 0, max: 9, step: 1, default: 2 },
    { id: 'd0', label: 'Units digit', type: 'range', min: 0, max: 9, step: 1, default: 8 }
  ],
  compute({ divisor, d4, d3, d2, d1, d0 }) {
    const d = Number(divisor);
    const digits = [d0, d1, d2, d3, d4];
    const value = digits.reduce((s, x, i) => s + x * 10 ** i, 0);
    const remainder = value % d;
    const quotient = (value - remainder) / d;
    // 6 = 2 × 3 and 12 = 4 × 3: two tests on coprime parts.
    const parts = d === 6 ? [2, 3] : d === 12 ? [4, 3] : [d];
    const tests = parts.map((part) => digitTest(part, digits));
    const passes = tests.every((test) => test.pass);
    const single = tests.length === 1;

    // Five digit boxes, place values above and the test's working below.
    const box = 60;
    const gap = 12;
    const left = (BOX_W - 5 * box - 4 * gap) / 2;
    const boxTop = 30;
    const xOf = (i) => left + (4 - i) * (box + gap);
    const rects = [];
    const notes = [];
    for (let i = 4; i >= 0; i--) {
      let tone = 'algebra';
      let faint = true;
      if (d === 11) {
        tone = i % 2 ? 'combinatorics' : 'arithmetic';
        faint = false;
      } else if (tests[0].used.includes(i)) {
        tone = 'data';
        faint = false;
      } else if (tests[1]?.used.includes(i)) {
        tone = 'arithmetic';
        faint = false;
      }
      rects.push({ x: xOf(i), y: boxTop, w: box, h: box, tone, faint, label: String(digits[i]) });
      notes.push({ x: xOf(i) + box / 2, y: boxTop - 10, text: PLACE_NAMES[i] });
      if (d === 11) notes.push({ x: xOf(i) + box / 2, y: boxTop + box + 22, text: i % 2 ? `${MINUS} ${digits[i]}` : `+ ${digits[i]}` });
    }
    // A bar under the digits each test reads.
    if (d !== 11) {
      tests.forEach((test, k) => {
        const from = Math.max(...test.used);
        rects.push({ x: xOf(from), y: boxTop + box + 8 + k * 10, w: xOf(0) + box - xOf(from), h: 5, tone: k === 0 ? 'data' : 'arithmetic' });
      });
    }

    const lines = [];
    if (single) {
      lines.push(tests[0].work);
      lines.push(`${remainderText(tests[0])}, so the test ${tests[0].pass ? 'passes' : 'fails'}`);
    } else {
      for (const test of tests) lines.push(`÷ ${test.d}: ${test.short}${test.pass ? '' : `, remainder ${test.remainder}`}, so it ${test.pass ? 'passes' : 'fails'}`);
      lines.push(passes ? `Both pass, so it is divisible by ${d}` : `Not both, so it is not divisible by ${d}`);
    }
    lines.push(remainder ? `Check: ${show(value, 0)} = ${d} × ${show(quotient, 0)} + ${remainder}` : `Check: ${show(value, 0)} = ${d} × ${show(quotient, 0)}`);
    const linesTop = boxTop + box + (d === 11 ? 58 : 50);
    lines.forEach((text, k) => notes.push({ x: BOX_W / 2, y: linesTop + k * 26, text }));
    const height = linesTop + (lines.length - 1) * 26 + 10;

    const last2 = String(10 * d1 + d0).padStart(2, '0');
    const last3 = String(100 * d2 + 10 * d1 + d0).padStart(3, '0');
    const INSIGHTS = {
      2: `10 is a multiple of 2, so every digit but the last stands for a multiple of 2: the last digit alone decides.`,
      5: `10 is a multiple of 5, so every digit but the last stands for a multiple of 5: the last digit alone decides.`,
      4: `100 = 4 × 25, so the hundreds and everything above are multiples of 4: only the last two digits, ${last2}, decide.`,
      8: `1000 = 8 × 125, so the thousands and everything above are multiples of 8: only the last three digits, ${last3}, decide.`,
      3: `10 = 9 + 1, so 10, 100, 1000 … each leave 1 on division by 3: ${show(value, 0)} leaves the same remainder as its digit sum, ${tests[0].value}.`,
      9: `10 = 9 + 1, so 10, 100, 1000 … each leave 1 on division by 9: ${show(value, 0)} leaves the same remainder as its digit sum, ${tests[0].value}.`,
      11: `10 = 11 − 1, so the place values leave +1, −1, +1, … on division by 11: the alternating sum from the units leaves the same remainder as the number.`,
      6: `6 = 2 × 3, and 2 and 3 share no factor, so passing both tests means divisible by 6. Passing one is not enough.`,
      12: `12 = 4 × 3, two parts that share no factor, so test 4 and 3. Testing 2 and 6 would not do: they share a 2, and 18 passes both.`
    };

    return {
      numbers: { value, divisor: d, remainder, quotient, divisible: remainder === 0, passes, tests: tests.map(({ d: part, value: v, remainder: r, pass }) => ({ d: part, value: v, remainder: r, pass })) },
      readouts: [
        { label: 'Number', value: show(value, 0) },
        {
          label: 'Test',
          value:
            d === 6
              ? 'even, and digit sum divisible by 3'
              : d === 12
                ? 'last two digits divisible by 4, and digit sum by 3'
                : { 2: 'last digit even', 5: 'last digit 0 or 5', 4: 'last two digits', 8: 'last three digits', 3: 'digit sum', 9: 'digit sum', 11: 'alternating digit sum' }[d]
        },
        {
          label: 'Test says',
          value: single ? `remainder ${tests[0].remainder}` : tests.map((test) => `÷ ${test.d} ${test.pass ? 'passes' : 'fails'}`).join(', ')
        },
        { label: 'Real remainder', value: `${show(value, 0)} ÷ ${d} = ${show(quotient, 0)} remainder ${remainder}` }
      ],
      plot: {
        kind: 'rects',
        width: BOX_W,
        height,
        rects,
        notes,
        summary: `${show(value, 0)} divided by ${d}: ${lines.join('. ')}.`
      },
      insight: INSIGHTS[d]
    };
  },
  tasks: [
    {
      id: 'nine-not-six',
      prompt: 'Make a number divisible by 9 but not by 6.',
      check: (values, n) => n.value % 9 === 0 && n.value % 6 !== 0,
      solution: { divisor: '9', d4: 1, d3: 0, d2: 0, d1: 1, d0: 7 }
    },
    {
      id: 'eleven-zero',
      prompt: 'With 11 chosen, make the alternating sum exactly 0.',
      check: (values, n) => values.divisor === '11' && n.tests[0].value === 0,
      solution: { divisor: '11', d4: 2, d3: 7, d2: 5, d1: 0, d0: 0 }
    },
    {
      id: 'eleven-eleven',
      prompt: 'With 11 chosen, find a multiple of 11 whose alternating sum is not 0.',
      check: (values, n) => values.divisor === '11' && n.divisible && n.tests[0].value !== 0,
      solution: { divisor: '11', d4: 9, d3: 0, d2: 2, d1: 0, d0: 0 }
    },
    {
      id: 'four-not-eight',
      prompt: 'With 8 chosen, make a number divisible by 4 that fails the test for 8.',
      check: (values, n) => values.divisor === '8' && n.value % 4 === 0 && !n.passes,
      solution: { divisor: '8', d4: 1, d3: 0, d2: 0, d1: 1, d0: 2 }
    }
  ]
};

/* ------------------------------ factor pairs ------------------------------ */

export const factorPairs = {
  id: 'factor-pairs',
  topicId: 'factors-multiples',
  alsoTopicIds: ['number-system'],
  title: 'Factor pairs as rectangles',
  summary: 'Every way to arrange N squares in a rectangle is a factor pair. Count the rectangles and you count the factors.',
  controls: [{ id: 'n', label: 'N', type: 'range', min: 1, max: 100, step: 1, default: 12 }],
  compute({ n }) {
    const pairs = [];
    for (let a = 1; a * a <= n; a++) if (n % a === 0) pairs.push([a, n / a]);
    const factors = [...pairs.map(([a]) => a), ...pairs.map(([, b]) => b).reverse()].filter((v, i, list) => list.indexOf(v) === i);
    const count = factors.length;
    const isSquare = pairs.some(([a, b]) => a === b);
    const isPrime = count === 2;
    const powers = primePowers(n);

    // One row per pair, short side down, long side across, all at one scale. A row takes
    // at least 20 px so its label has room; thin strips sit in the middle of their row.
    const labelW = 70;
    const gap = 8;
    const minRow = 20;
    const rowsHeight = (s) => pairs.reduce((h, [a]) => h + Math.max(a * s, minRow), 0) + gap * (pairs.length - 1);
    let s = (BOX_W - labelW - 10) / n;
    if (rowsHeight(s) > BOX_H) {
      let lo = 0;
      let hi = s;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (rowsHeight(mid) <= BOX_H) lo = mid;
        else hi = mid;
      }
      s = lo;
    }
    const rects = [];
    const notes = [];
    let y = 0;
    for (const [a, b] of pairs) {
      const rowH = Math.max(a * s, minRow);
      const top = y + (rowH - a * s) / 2;
      const tone = a === b ? 'geometry' : 'arithmetic';
      if (s >= 8) {
        // Unit squares, so the area can be counted.
        for (let r = 0; r < a; r++) for (let c = 0; c < b; c++) rects.push({ x: labelW + c * s, y: top + r * s, w: s, h: s, tone, faint: true });
        rects.push({ x: labelW, y: top, w: b * s, h: a * s, tone, faint: true });
      } else {
        rects.push({ x: labelW, y: top, w: b * s, h: a * s, tone });
      }
      notes.push({ x: labelW - 10, y: y + rowH / 2 + 5, text: `${a} × ${b}`, anchor: 'end' });
      if (a === b) notes.push({ x: labelW + b * s + 8, y: y + rowH / 2 + 5, text: 'a square', anchor: 'start' });
      y += rowH + gap;
    }
    const height = y - gap;
    // Room for "a square" beside the square, when there is one.
    const root = Math.round(Math.sqrt(n));
    const width = Math.max(labelW + n * s, isSquare ? labelW + root * s + 72 : 0);

    const formula = powers.length ? `${powers.map(([p, k]) => (k === 1 ? p : `${p}${sup(k)}`)).join(' × ')} → ${powers.map(([, k]) => `(${k} + 1)`).join('')} = ${count}` : '1 has no prime factors';
    let insight;
    if (n === 1) insight = '1 is the only number with a single factor: its one rectangle is a 1 × 1 square.';
    else if (isPrime) insight = `${n} is prime: the only rectangle is a 1 × ${n} strip, so it has exactly 2 factors.`;
    else if (count === 3)
      insight = `${n} = ${root}², the square of a prime: its factors are 1, ${root} and ${n}. The ${root} × ${root} square pairs ${root} with itself, so the count is odd.`;
    else if (isSquare)
      insight = `${n} is a square: ${pairs.length - 1} rectangles give two factors each, and the square gives just one, its side. So ${n} has an odd number of factors, ${count}.`;
    else
      insight = `Each rectangle a × b gives two factors, a and b, so ${pairs.length} rectangles mean ${count} factors. The short sides stop before √${n} ≈ ${show(Math.sqrt(n), 2)}.`;

    return {
      numbers: { n, pairs, factors, count, isSquare, isPrime },
      readouts: [
        { label: 'Rectangles', value: pairs.map(([a, b]) => `${a} × ${b}`).join(', ') },
        { label: 'Factors', value: `${count}: ${factors.join(', ')}` },
        { label: 'From the primes', value: n === 1 ? '1 has no prime factors' : `${n} = ${formula}` },
        { label: 'Square number', value: isSquare ? `yes, ${root} × ${root}: odd count` : 'no: factors pair up, even count' }
      ],
      plot: {
        kind: 'rects',
        width,
        height,
        rects,
        notes,
        summary: `${n} squares make ${pairs.length} rectangle${pairs.length === 1 ? '' : 's'}: ${pairs.map(([a, b]) => `${a} by ${b}`).join(', ')}. So ${n} has ${count} factor${count === 1 ? '' : 's'}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'three',
      prompt: 'Find a number with exactly 3 factors.',
      check: (values, n) => n.count === 3,
      solution: { n: 49 }
    },
    {
      id: 'twelve',
      prompt: 'Find a number with exactly 12 factors.',
      check: (values, n) => n.count === 12,
      solution: { n: 60 }
    },
    {
      id: 'strip',
      prompt: 'Find a number above 50 whose only rectangle is a single strip.',
      check: (values, n) => values.n > 50 && n.isPrime,
      solution: { n: 53 }
    },
    {
      id: 'nine',
      prompt: 'Find a square number with exactly 9 factors.',
      check: (values, n) => n.isSquare && n.count === 9,
      solution: { n: 36 }
    }
  ]
};

/* ------------------------------ decimal zoom ------------------------------ */

/** A decimal held as whole thousandths (0–1000), as text: "0.45", "0.405", "0", "1". */
export function thousandthsText(k, places) {
  const whole = Math.floor(k / 1000);
  const frac = String(k % 1000).padStart(3, '0');
  if (places !== undefined) return places === 0 ? String(whole) : `${whole}.${frac.slice(0, places)}`;
  const trimmed = frac.replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : String(whole);
}

/** Decimal places a number of thousandths needs: 0.4 has 1, 0.45 has 2, 0.405 has 3. */
export const placesOf = (k) => (k % 10 ? 3 : k % 100 ? 2 : k % 1000 ? 1 : 0);

const PLACE = ['', 'tenths', 'hundredths', 'thousandths'];
const ZOOMS = ['tenths', 'hundredths', 'thousandths'];

export const decimalZoom = {
  id: 'decimal-zoom',
  topicId: 'decimals',
  title: 'Zoom into a decimal',
  summary: 'Each zoom cuts one gap of the number line into ten: tenths, then hundredths, then thousandths. Two decimals part at the first place their digits differ.',
  controls: [
    {
      id: 'zoom',
      label: 'Zoom in to',
      type: 'choice',
      options: [
        { id: 'tenths', label: 'Tenths' },
        { id: 'hundredths', label: 'Hundredths' },
        { id: 'thousandths', label: 'Thousandths' }
      ],
      default: 'tenths'
    },
    { id: 'a1', label: 'A: tenths digit', type: 'range', min: 0, max: 9, step: 1, default: 3 },
    { id: 'a2', label: 'A: hundredths digit', type: 'range', min: 0, max: 9, step: 1, default: 7 },
    { id: 'a3', label: 'A: thousandths digit', type: 'range', min: 0, max: 9, step: 1, default: 2 },
    { id: 'b1', label: 'B: tenths digit', type: 'range', min: 0, max: 9, step: 1, default: 5 },
    { id: 'b2', label: 'B: hundredths digit', type: 'range', min: 0, max: 9, step: 1, default: 0 },
    { id: 'b3', label: 'B: thousandths digit', type: 'range', min: 0, max: 9, step: 1, default: 0 }
  ],
  compute({ zoom, a1, a2, a3, b1, b2, b3 }) {
    // Whole thousandths, so every comparison is exact.
    const A = 100 * a1 + 10 * a2 + a3;
    const B = 100 * b1 + 10 * b2 + b3;
    const aDigits = [a1, a2, a3];
    const bDigits = [b1, b2, b3];
    const firstDiff = aDigits.findIndex((digit, i) => digit !== bDigits[i]) + 1; // 0 when equal
    const comparison = Math.sign(A - B);
    const levels = ZOOMS.indexOf(zoom) + 1;
    const aText = thousandthsText(A);
    const bText = thousandthsText(B);

    // Each level is a ruler from lo to lo + span (in thousandths), cut into ten.
    const windows = [
      { lo: 0, span: 1000, places: 1 },
      { lo: 100 * a1, span: 100, places: 2 },
      { lo: 100 * a1 + 10 * a2, span: 10, places: 3 }
    ].slice(0, levels);
    const left = 40;
    const right = BOX_W - 40;
    const slot = 94;
    const rects = [];
    const notes = [];
    windows.forEach((win, level) => {
      const y0 = level * slot;
      const axisY = y0 + 50;
      const sx = (k) => left + ((k - win.lo) / win.span) * (right - left);
      const caption =
        level === 0
          ? 'From 0 to 1 in tenths'
          : `Zoom ×${10 ** level}: ${thousandthsText(win.lo, win.places - 1)} to ${thousandthsText(win.lo + win.span, win.places - 1)} in ${PLACE[win.places]}`;
      notes.push({ x: left, y: y0 + 12, text: caption, anchor: 'start' });
      // The piece the next level magnifies.
      if (level + 1 < windows.length) {
        const nextWin = windows[level + 1];
        rects.push({ x: sx(nextWin.lo), y: axisY - 11, w: sx(nextWin.lo + nextWin.span) - sx(nextWin.lo), h: 22, tone: 'geometry', faint: true });
      }
      if (level > 0) rects.push({ x: left, y: axisY - 11, w: right - left, h: 22, tone: 'geometry', faint: true, dashed: true });
      rects.push({ x: left, y: axisY - 1, w: right - left, h: 2, tone: 'algebra' });
      for (let i = 0; i <= 10; i++) {
        const k = win.lo + (i * win.span) / 10;
        const end = i === 0 || i === 10;
        rects.push({ x: sx(k) - 1, y: axisY - (end ? 8 : 5), w: 2, h: end ? 16 : 10, tone: 'algebra' });
        const label = level === 0 && end ? thousandthsText(k, 0) : thousandthsText(k, win.places);
        // Five-character labels such as 0.455 would touch, so thousandths are labelled every other tick.
        if (win.places < 3 || i % 2 === 0) notes.push({ x: sx(k), y: axisY + 26, text: label });
      }
      // A and B: a mark on the ruler, or an arrow at the end they lie beyond.
      const marks = [
        { name: 'A', k: A, tone: 'arithmetic' },
        { name: 'B', k: B, tone: 'combinatorics' }
      ];
      const inside = marks.filter((m) => m.k >= win.lo && m.k <= win.lo + win.span);
      for (const m of marks) {
        if (m.k < win.lo) notes.push({ x: left - 6, y: axisY + 5, text: `${m.name} ←`, anchor: 'end' });
        else if (m.k > win.lo + win.span) notes.push({ x: right + 6, y: axisY + 5, text: `→ ${m.name}`, anchor: 'start' });
        else rects.push({ x: sx(m.k) - 2, y: axisY - 12, w: 4, h: 24, tone: m.tone });
      }
      if (inside.length === 2 && A === B) notes.push({ x: sx(A), y: axisY - 18, text: 'A = B' });
      else if (inside.length === 2 && Math.abs(sx(A) - sx(B)) < 18) {
        const [lower, upper] = A < B ? [inside[0], inside[1]] : [inside[1], inside[0]];
        notes.push({ x: sx(lower.k) - 3, y: axisY - 18, text: lower.name, anchor: 'end' });
        notes.push({ x: sx(upper.k) + 3, y: axisY - 18, text: upper.name, anchor: 'start' });
      } else for (const m of inside) notes.push({ x: sx(m.k), y: axisY - 18, text: m.name });
    });
    // Arrows at the ends sit two to a side at most; both A and B beyond one end share a line.
    for (let level = 0; level < windows.length; level++) {
      for (const [x, anchor] of [[left - 6, 'end'], [right + 6, 'start']]) {
        const here = notes.filter((note) => note.x === x && note.anchor === anchor && note.y === level * slot + 55);
        if (here.length === 2) {
          here[0].text = anchor === 'end' ? 'A B ←' : '→ A B';
          notes.splice(notes.indexOf(here[1]), 1);
        }
      }
    }

    const padded = (k) => thousandthsText(k, 3);
    const digitWords = (digits) => `${digits[0]} tenths + ${digits[1]} hundredths + ${digits[2]} thousandths`;
    let verdict;
    let insight;
    if (comparison === 0) {
      verdict = `A = B = ${aText}`;
      insight = 'The same digits in the same places: the same number, however you write it (0.5 = 0.50 = 0.500).';
    } else {
      const bigger = comparison > 0 ? 'A' : 'B';
      const [hi, lo] = comparison > 0 ? [aDigits, bDigits] : [bDigits, aDigits];
      verdict = `${bigger} is bigger: the ${PLACE[firstDiff]} differ, ${hi[firstDiff - 1]} > ${lo[firstDiff - 1]}`;
      if (levels < firstDiff)
        insight = `A and B agree up to the ${PLACE[firstDiff - 1]}, so at this zoom they sit in the same gap. Zoom in to the ${PLACE[firstDiff]} to see them part.`;
      else {
        const longerSmaller = (placesOf(A) > placesOf(B) && A < B) || (placesOf(B) > placesOf(A) && B < A);
        insight = longerSmaller
          ? `More digits does not mean bigger: pad to ${padded(A)} and ${padded(B)}, and the ${PLACE[firstDiff]} decide, ${hi[firstDiff - 1]} against ${lo[firstDiff - 1]}.`
          : `Read the digits from the left: the first place they differ, the ${PLACE[firstDiff]}, decides${firstDiff < 3 ? ', whatever follows' : ''}. ${padded(Math.max(A, B))} > ${padded(Math.min(A, B))}.`;
      }
    }

    return {
      numbers: { A, B, comparison, firstDiff, levels, placesA: placesOf(A), placesB: placesOf(B), gap: Math.abs(A - B) },
      readouts: [
        { label: 'A', value: `${aText} = ${digitWords(aDigits)}` },
        { label: 'B', value: `${bText} = ${digitWords(bDigits)}` },
        { label: 'Padded to 3 places', value: `${padded(A)} and ${padded(B)}` },
        { label: 'Compare', value: verdict }
      ],
      plot: {
        kind: 'rects',
        width: BOX_W,
        height: windows.length * slot - 6,
        rects,
        notes,
        summary: `A = ${aText} and B = ${bText} on a number line zoomed to ${PLACE[levels]}. ${verdict}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'part',
      prompt: 'Set A to 0.45 and B to 0.405, then zoom to the place where their digits first differ.',
      check: (values, n) => n.A === 450 && n.B === 405 && n.levels === n.firstDiff,
      solution: { a1: 4, a2: 5, a3: 0, b1: 4, b2: 0, b3: 5, zoom: 'hundredths' }
    },
    {
      id: 'longer-smaller',
      prompt: 'Give B more decimal places than A, yet make B the smaller.',
      check: (values, n) => n.placesB > n.placesA && n.B < n.A,
      solution: { a1: 6, a2: 0, a3: 0, b1: 5, b2: 9, b3: 9 }
    },
    {
      id: 'thousandth-apart',
      prompt: 'Make A and B exactly one thousandth apart, with different tenths digits.',
      check: (values, n) => n.gap === 1 && values.a1 !== values.b1,
      solution: { a1: 4, a2: 0, a3: 0, b1: 3, b2: 9, b3: 9 }
    },
    {
      id: 'same-hundredth',
      prompt: 'Zoom to thousandths and put two different numbers on the same last ruler.',
      check: (values, n) => values.zoom === 'thousandths' && n.A !== n.B && Math.floor(n.A / 10) === Math.floor(n.B / 10),
      solution: { zoom: 'thousandths', a1: 4, a2: 5, a3: 2, b1: 4, b2: 5, b3: 7 }
    }
  ]
};

export const numberSenseSims = [primeSieve, divisibilityChecker, factorPairs, decimalZoom];
