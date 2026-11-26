/** Surds and indices, calendars, clocks and unit conversions templates. */

import { fmt, nearlyEqual } from '../core.js';

const SUPERSCRIPT = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((digit) => SUPERSCRIPT[digit]).join('');

/** Integer power by repeated multiplication (no exponent laws). */
function repeatedProduct(base, times) {
  let out = 1;
  for (let i = 0; i < times; i++) out *= base;
  return out;
}

/** A power that is small enough to be a readable option, else null (the engine skips nulls). */
const readablePower = (base, exponent) => (exponent >= 0 && repeatedProduct(base, exponent) <= 5e6 ? repeatedProduct(base, exponent) : null);

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const isLeapByDate = (year) => new Date(year, 1, 29).getDate() === 29;

/** Day count since 1 January 1970, built without Date so it can cross-check Date. */
function dayNumber(year, month, day) {
  const cumulative = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let total = 0;
  for (let y = 1970; y < year; y++) total += y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  total += cumulative[month - 1] + (leap && month > 2 ? 1 : 0) + (day - 1);
  return total;
}

const weekdayFromDayNumber = (n) => (((n + 4) % 7) + 7) % 7; // 1 Jan 1970 was a Thursday

const pad2 = (n) => String(n).padStart(2, '0');

function angleBetween(h, m) {
  const gap = Math.abs((h % 12) * 30 + m * 0.5 - m * 6);
  return Math.min(gap, 360 - gap);
}

/** A clock face at h:m with both hands, described in words but without the angle. */
function clockFigure(h, m) {
  const next = (h % 12) + 1;
  const hourHand = m === 0 ? `on ${h}` : m === 30 ? `halfway between ${h} and ${next}` : `between ${h} and ${next}`;
  const minuteHand = m % 5 === 0 ? `on ${m === 0 ? 12 : m / 5}` : `at ${m} minutes`;
  return {
    type: 'clock',
    caption: `The clock at ${h}:${pad2(m)}`,
    hour: h,
    minute: m,
    hands: 'both',
    ariaSummary: `A clock face showing ${h}:${pad2(m)}: the hour hand is ${hourHand} and the minute hand is ${minuteHand}.`
  };
}

function clockText(totalMinutes) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${pad2(minute)} ${suffix}`;
}

export const measureTemplates = [
  /* ============================ surds and indices ============================ */
  {
    id: 'si-index-laws',
    version: 1,
    topicId: 'surds-indices',
    conceptId: 'si-laws',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['si-laws-f'],
    estimatedSeconds: 40,
    tags: ['trap'],
    params(rng) {
      const b = rng.pick([2, 3, 5, 10]);
      const m = rng.int(3, 9);
      const n = rng.int(2, 6);
      const multiply = rng.chance(0.5);
      if (!multiply && m <= n) return null;
      if (repeatedProduct(b, m + n) > 5e6) return null;
      return { b, m, n, multiply };
    },
    answer: ({ b, m, n, multiply }) => repeatedProduct(b, multiply ? m + n : m - n),
    formatValue: (value) => fmt(value),
    distractors: ({ b, m, n, multiply }) =>
      multiply
        ? [
            { value: readablePower(b, m * n), why: 'multiplied the exponents' },
            { value: repeatedProduct(b, Math.abs(m - n)), why: 'subtracted the exponents' },
            { value: repeatedProduct(b, m + n + 1), why: 'slipped by one in the exponent' },
            { value: repeatedProduct(b, m + n - 1), why: 'slipped by one in the exponent' }
          ]
        : [
            { value: repeatedProduct(b, m + n), why: 'added the exponents' },
            { value: readablePower(b, m * n), why: 'multiplied the exponents' },
            { value: repeatedProduct(b, m - n + 1), why: 'slipped by one in the exponent' },
            { value: repeatedProduct(b, m - n - 1), why: 'slipped by one in the exponent' }
          ],
    verify({ b, m, n, multiply }, value) {
      const top = repeatedProduct(b, m);
      const bottom = repeatedProduct(b, n);
      return multiply ? top * bottom === value : top / bottom === value;
    },
    render({ b, m, n, multiply }) {
      const result = repeatedProduct(b, multiply ? m + n : m - n);
      return {
        question: multiply ? `What is the value of ${b}${sup(m)} × ${b}${sup(n)}?` : `What is the value of ${b}${sup(m)} ÷ ${b}${sup(n)}?`,
        explanation: multiply
          ? `Same base, so add the exponents: ${b}${sup(m)} × ${b}${sup(n)} = ${b}${sup(m + n)} = ${fmt(result)}.`
          : `Same base, so subtract the exponents: ${b}${sup(m)} ÷ ${b}${sup(n)} = ${b}${sup(m - n)} = ${fmt(result)}.`,
        solutionSteps: [multiply ? `Add: ${m} + ${n} = ${m + n}.` : `Subtract: ${m} − ${n} = ${m - n}.`, `${b}${sup(multiply ? m + n : m - n)} = ${fmt(result)}.`],
        method: multiply ? 'aᵐ × aⁿ = aᵐ⁺ⁿ.' : 'aᵐ ÷ aⁿ = aᵐ⁻ⁿ.',
        hints: ['Count how many factors of the base are involved.', multiply ? 'Multiplying adds exponents.' : 'Dividing subtracts exponents.'],
        commonMistakes: ['Multiplying the exponents.']
      };
    }
  },

  {
    id: 'si-fractional-power',
    version: 1,
    topicId: 'surds-indices',
    conceptId: 'si-fractional',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['si-fractional-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const c = rng.int(2, 6);
      const q = rng.pick([2, 3, 4]);
      const p = rng.int(1, 3);
      const b = repeatedProduct(c, q);
      if (b > 1300 || (q === 2 && p === 2)) return null;
      return { c, q, p, b };
    },
    answer: ({ c, p }) => repeatedProduct(c, p),
    formatValue: (value) => fmt(value),
    distractors: ({ b, c, p, q }) => [
      { value: (b * p) / q, why: 'multiplied the base by the exponent' },
      { value: c * p, why: 'multiplied the root by the numerator' },
      { value: repeatedProduct(c, p + q), why: 'added the exponent parts' },
      { value: repeatedProduct(b, p), why: 'ignored the root' }
    ],
    verify: ({ b, p, q }, value) => nearlyEqual(Math.pow(b, p / q), value),
    render({ b, c, p, q }) {
      const rootName = q === 2 ? 'square root' : q === 3 ? 'cube root' : 'fourth root';
      return {
        question: `What is the value of ${b}^(${p}/${q})?`,
        explanation: `${b}^(1/${q}) is the ${rootName} of ${b}, which is ${c}. Then ${c}${sup(p)} = ${repeatedProduct(c, p)}.`,
        solutionSteps: [`${b}^(1/${q}) = ${c}.`, `${c}${sup(p)} = ${repeatedProduct(c, p)}.`],
        method: 'Root first, then the power.',
        hints: [`The denominator ${q} asks for the ${rootName}.`, 'The numerator is the power you then apply.'],
        commonMistakes: [`Multiplying ${b} by ${p}/${q}.`]
      };
    }
  },

  {
    id: 'si-simplify-surd',
    version: 1,
    topicId: 'surds-indices',
    conceptId: 'si-surds',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['si-surd-f'],
    estimatedSeconds: 50,
    tags: ['trap'],
    params(rng) {
      const n = rng.pick([2, 3, 5, 6, 7, 10, 11]);
      const m = rng.int(2, 9);
      return { m, n, N: m * m * n };
    },
    answer: ({ m, n }) => `${m}√${n}`,
    formatValue: (value) => String(value),
    distractors: ({ m, n }) => [
      { value: `${m * m}√${n}`, why: 'left the square outside the root' },
      { value: `${n}√${m}`, why: 'swapped the two factors' },
      { value: `${m}√${m * n}`, why: 'did not remove the square from inside the root' },
      { value: `${m + 1}√${n}`, why: 'guessed the coefficient' }
    ],
    verify: ({ N }, value) => {
      const [, coefficient, radicand] = /^(\d+)√(\d+)$/.exec(value) || [];
      return Boolean(coefficient) && nearlyEqual(Number(coefficient) * Math.sqrt(Number(radicand)), Math.sqrt(N));
    },
    render({ m, n, N }) {
      return {
        question: `What is √${N} in its simplest surd form?`,
        explanation: `${N} = ${m * m} × ${n}, so √${N} = √${m * m} × √${n} = ${m}√${n}.`,
        solutionSteps: [`${N} = ${m * m} × ${n}.`, `√${m * m} = ${m}.`, `${m}√${n}.`],
        method: 'Take out the largest square factor.',
        hints: [`What is the largest perfect square that divides ${N}?`, 'Take its square root outside.'],
        commonMistakes: ['Leaving the square outside the root instead of taking its root.']
      };
    }
  },

  {
    id: 'si-exponent-equation',
    version: 1,
    topicId: 'surds-indices',
    conceptId: 'si-equations',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['si-equation-f'],
    estimatedSeconds: 80,
    tags: ['trap'],
    params(rng) {
      const c = rng.pick([2, 3]);
      const s = rng.int(2, 4);
      const t = rng.int(2, 4);
      if (s === t) return null;
      const x = rng.int(1, 9);
      const fits = [];
      for (let u = 1; u <= 4; u++) {
        const num = s * (x + u);
        if (num % t === 0 && num / t - x >= -4 && num / t - x <= 6) fits.push(u);
      }
      if (!fits.length) return null;
      const u = rng.pick(fits);
      const w = (s * (x + u)) / t - x;
      return { c, s, t, x, u, w, a: repeatedProduct(c, s), b: repeatedProduct(c, t) };
    },
    answer: ({ x }) => x,
    formatValue: (value) => fmt(value),
    distractors: ({ x }) => [
      { value: x + 1, why: 'slipped by one' },
      { value: x + 2, why: 'slipped by two' },
      { value: Math.max(x - 1, 0), why: 'slipped by one' },
      { value: 2 * x, why: 'doubled the answer' }
    ],
    verify: ({ a, b, u, w }, value) => nearlyEqual((value + u) * Math.log(a), (value + w) * Math.log(b)),
    render({ c, s, t, x, u, w, a, b }) {
      const right = w === 0 ? 'x' : w > 0 ? `x + ${w}` : `x − ${-w}`;
      return {
        question: `If ${a}^(x + ${u}) = ${b}^(${right}), what is x?`,
        explanation: `Write both sides in base ${c}: ${a} = ${c}${sup(s)} and ${b} = ${c}${sup(t)}. So ${s}(x + ${u}) = ${t}(${right}), which gives x = ${x}.`,
        solutionSteps: [`${a} = ${c}^${s}; ${b} = ${c}^${t}.`, `${s}(x + ${u}) = ${t}(${right}).`, `x = ${x}.`],
        method: 'Common base, then equate the exponents.',
        hints: [`Both ${a} and ${b} are powers of ${c}.`, 'Once the bases match, the exponents must be equal.'],
        commonMistakes: ['Equating exponents before making the bases the same.']
      };
    }
  },

  /* ================================= calendars ================================= */
  {
    id: 'cal-leap-year',
    version: 1,
    topicId: 'calendars',
    conceptId: 'cal-leap',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['cal-leap-f'],
    estimatedSeconds: 30,
    tags: ['trap'],
    params(rng) {
      const century = rng.chance(0.4);
      const year = century ? rng.pick([1600, 2000, 2400]) : rng.int(1604, 2396);
      if (!century && (year % 4 !== 0 || year % 100 === 0)) return null;
      const centuries = [1700, 1800, 1900, 2100, 2200, 2300].filter((y) => !isLeapByDate(y) && y !== year);
      const others = [];
      others.push(rng.pick(centuries));
      let guard = 0;
      while (others.length < 3 && guard++ < 30) {
        const candidate = century ? year + rng.pick([-3, -2, -1, 1, 2, 3, 98, 102]) : year + rng.pick([-3, -2, -1, 1, 2, 3]);
        if (!isLeapByDate(candidate) && !others.includes(candidate) && candidate !== year) others.push(candidate);
      }
      if (others.length < 3) return null;
      const options = [year, ...others].sort((x, y) => x - y);
      return { year, century, others, options };
    },
    answer: ({ year }) => String(year),
    formatValue: (value) => String(value),
    distractors: ({ others }) => others.map((value) => ({ value: String(value), why: 'not a leap year' })),
    verify: ({ year }, value) => Number(value) === year && isLeapByDate(year),
    render({ year, options }) {
      return {
        question: `Which of these years is a leap year: ${options.join(', ')}?`,
        explanation: `${year} ${year % 400 === 0 ? 'is a century year divisible by 400' : 'is divisible by 4 and is not a century year'}, so it is a leap year. The other options fail the rule.`,
        solutionSteps: ['A year is a leap year if divisible by 4.', 'Century years must be divisible by 400.', `${year} passes.`],
        method: 'Divisible by 4; centuries by 400.',
        hints: ['Check divisibility by 4 first.', 'Century years follow a stricter rule.'],
        commonMistakes: ['Treating a century year as a leap year because it is divisible by 4.']
      };
    }
  },

  {
    id: 'cal-odd-days-span',
    version: 1,
    topicId: 'calendars',
    conceptId: 'cal-odd',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cal-odd-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const start = rng.int(1901, 2090);
      const years = rng.int(3, 30);
      let leaps = 0;
      for (let y = start; y < start + years; y++) if (isLeapByDate(y)) leaps++;
      const odd = (years + leaps) % 7;
      if (odd === years % 7) return null;
      return { start, years, leaps, odd };
    },
    answer: ({ odd }) => odd,
    formatValue: (value) => `${value} odd day${value === 1 ? '' : 's'}`,
    distractors: ({ years, leaps, odd }) => [
      { value: years % 7, why: 'ignored the leap days' },
      { value: (years + 2 * leaps) % 7, why: 'counted leap years twice' },
      { value: (odd + 1) % 7, why: 'miscounted a leap year' },
      { value: (odd + 6) % 7, why: 'miscounted a leap year' },
      { value: leaps % 7, why: 'counted only the leap years' }
    ],
    verify({ start, years }, value) {
      const days = dayNumber(start + years, 1, 1) - dayNumber(start, 1, 1);
      return days % 7 === value;
    },
    render({ start, years, leaps, odd }) {
      return {
        question: `How many odd days are there from 1 January ${start} to 31 December ${start + years - 1} (both dates included)?`,
        explanation: `${years} years contain ${leaps} leap year${leaps === 1 ? '' : 's'}, so ${years + leaps} extra days beyond whole years: ${years} + ${leaps} = ${years + leaps}, which leaves ${odd} after removing complete weeks.`,
        solutionSteps: [`Leap years in ${start}–${start + years - 1}: ${leaps}.`, `Total odd days: ${years} + ${leaps} = ${years + leaps}.`, `${years + leaps} mod 7 = ${odd}.`],
        method: 'Ordinary year → 1 odd day, leap year → 2.',
        hints: ['Count the leap years in the period.', 'Each ordinary year contributes 1 odd day and each leap year 2.'],
        commonMistakes: ['Forgetting the extra day of each leap year.']
      };
    }
  },

  {
    id: 'cal-weekday-shift',
    version: 1,
    topicId: 'calendars',
    conceptId: 'cal-dow',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cal-dow-f', 'cal-odd-f'],
    estimatedSeconds: 75,
    tags: ['trap'],
    params(rng) {
      const year = rng.int(1995, 2030);
      const month = rng.int(1, 12);
      const day = rng.int(1, 28);
      const gap = rng.int(30, 1500);
      if (gap % 7 === 0) return null;
      const ref = new Date(Date.UTC(year, month - 1, day));
      const target = new Date(ref.getTime() + gap * 86400000);
      return {
        ref: { y: year, m: month, d: day },
        target: { y: target.getUTCFullYear(), m: target.getUTCMonth() + 1, d: target.getUTCDate() },
        refDay: ref.getUTCDay(),
        targetDay: target.getUTCDay(),
        gap
      };
    },
    answer: ({ targetDay }) => DAYS[targetDay],
    formatValue: (value) => String(value),
    distractors: ({ targetDay }) =>
      [1, -1, 2, -2, 3].map((offset) => ({ value: DAYS[(targetDay + offset + 7) % 7], why: 'miscounted the leap days' })),
    verify({ ref, target, refDay }, value) {
      const gap = dayNumber(target.y, target.m, target.d) - dayNumber(ref.y, ref.m, ref.d);
      return DAYS[(refDay + (gap % 7) + 7) % 7] === value;
    },
    render({ ref, target, refDay, targetDay, gap }) {
      const shift = gap % 7;
      return {
        question: `${ref.d} ${MONTHS[ref.m - 1]} ${ref.y} was a ${DAYS[refDay]}. What day of the week is ${target.d} ${MONTHS[target.m - 1]} ${target.y}?`,
        explanation: `The two dates are ${fmt(gap)} days apart (leap days included). ${fmt(gap)} mod 7 = ${shift}, so the weekday moves forward ${shift}: ${DAYS[refDay]} → ${DAYS[targetDay]}.`,
        solutionSteps: [`Days between the dates: ${fmt(gap)} (count each 29 February that lies between them).`, `${fmt(gap)} mod 7 = ${shift}.`, `${DAYS[refDay]} + ${shift} = ${DAYS[targetDay]}.`],
        method: 'Days between the dates mod 7 = shift in weekday.',
        hints: ['Count only the leap days that fall between the two dates.', 'Reduce the number of days modulo 7.'],
        commonMistakes: ['Counting a leap day that is not between the two dates.']
      };
    }
  },

  {
    id: 'cal-weekday-count',
    version: 1,
    topicId: 'calendars',
    conceptId: 'cal-count',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cal-count-f'],
    estimatedSeconds: 45,
    tags: ['trap'],
    params(rng) {
      return { length: rng.pick([29, 30, 31]), start: rng.int(0, 6), target: rng.int(0, 6) };
    },
    answer: ({ length, start, target }) => {
      let count = 0;
      for (let day = 0; day < length; day++) if ((start + day) % 7 === target) count++;
      return count;
    },
    formatValue: (value) => String(value),
    distractors: () => [3, 4, 5, 6].map((value) => ({ value, why: 'miscounted the extra days' })),
    verify: ({ length, start, target }, value) => 4 + ((target - start + 7) % 7 < length - 28 ? 1 : 0) === value,
    render({ length, start, target }) {
      const extra = length - 28;
      const repeated = Array.from({ length: extra }, (_, i) => DAYS[(start + i) % 7]);
      return {
        question: `A month of ${length} days begins on a ${DAYS[start]}. How many ${DAYS[target]}s does it contain?`,
        explanation: `${length} days = 4 full weeks + ${extra} extra day${extra === 1 ? '' : 's'}. The extra days repeat the first weekday${extra === 1 ? '' : 's'} of the month (${repeated.join(', ')}), which occur 5 times; all others occur 4 times.`,
        solutionSteps: [`${length} − 28 = ${extra} extra days.`, `Days occurring 5 times: ${repeated.join(', ')}.`, `${DAYS[target]} occurs ${repeated.includes(DAYS[target]) ? 5 : 4} times.`],
        method: 'The extra days repeat the starting weekdays.',
        hints: ['How many days remain after four full weeks?', 'Those extra days repeat the weekdays the month starts with.'],
        commonMistakes: ['Assuming the last weekdays of the month repeat.']
      };
    }
  },

  /* ================================== clocks ================================== */
  {
    id: 'clk-angle-time',
    version: 1,
    topicId: 'clocks',
    conceptId: 'clk-angle',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['clk-angle-f', 'clk-speed-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    answerDecimals: 1,
    params(rng) {
      const h = rng.int(1, 12);
      const m = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 12, 18, 24, 36, 42]);
      const angle = angleBetween(h, m);
      if (angle === 0 || angle === 180) return null;
      return { h, m, angle };
    },
    answer: ({ angle }) => angle,
    formatValue: (value) => `${fmt(value, 1)}°`,
    distractors: ({ h, m, angle }) => {
      const reduce = (value) => {
        const gap = Math.abs(value);
        return gap > 180 ? 360 - gap : gap;
      };
      return [
        { value: reduce((h % 12) * 30 - 6 * m), why: 'ignored the hour hand moving' },
        { value: reduce((h % 12) * 30 - 5 * m), why: 'used 5° per minute for the minute hand' },
        { value: 360 - angle, why: 'gave the reflex angle' },
        { value: angle + 30, why: 'slipped by one hour mark' },
        { value: Math.abs(angle - 30), why: 'slipped by one hour mark' }
      ];
    },
    verify({ h, m }, value) {
      const hourPos = (h % 12) * 30 + m * 0.5;
      const minutePos = m * 6;
      const gap = Math.abs(hourPos - minutePos);
      return nearlyEqual(Math.min(gap, 360 - gap), value);
    },
    render({ h, m, angle }) {
      const hourPos = (h % 12) * 30 + m * 0.5;
      return {
        question: `What is the angle between the hands of a clock at ${h}:${pad2(m)}?`,
        figure: clockFigure(h, m),
        explanation: `The hour hand is at ${h % 12} × 30 + ${m} × 0.5 = ${fmt(hourPos, 1)}°. The minute hand is at ${m} × 6 = ${m * 6}°. The angle is ${fmt(angle, 1)}°${angle !== Math.abs(hourPos - m * 6) ? ' (taking the smaller angle)' : ''}.`,
        solutionSteps: [`Hour hand: ${fmt(hourPos, 1)}°.`, `Minute hand: ${m * 6}°.`, `Difference: ${fmt(angle, 1)}°.`],
        method: '|30h − 5.5m|, then the smaller angle.',
        hints: ['The hour hand is not exactly on the hour mark.', 'Each minute the hour hand moves 0.5°.'],
        commonMistakes: ['Forgetting that the hour hand moves as the minutes pass.']
      };
    }
  },

  {
    id: 'clk-mirror-time',
    version: 1,
    topicId: 'clocks',
    conceptId: 'clk-mirror',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['clk-mirror-f'],
    estimatedSeconds: 45,
    tags: ['trap'],
    params(rng) {
      const h = rng.int(1, 11);
      const m = rng.pick([5, 10, 15, 20, 25, 35, 40, 45, 50, 55]);
      const total = (720 - (h * 60 + m)) % 720;
      return { h, m, mh: Math.floor(total / 60) || 12, mm: total % 60 };
    },
    answer: ({ mh, mm }) => `${mh}:${pad2(mm)}`,
    formatValue: (value) => String(value),
    distractors: ({ h, m }) => {
      const hourOf = (value) => (value <= 0 ? value + 12 : value);
      return [
        { value: `${hourOf(12 - h)}:${pad2(60 - m)}`, why: 'used 12 − h for the hours without borrowing' },
        { value: `${hourOf(12 - h)}:${pad2(m)}`, why: 'left the minutes unchanged' },
        { value: `${h}:${pad2(60 - m)}`, why: 'reflected only the minutes' },
        { value: `${hourOf(11 - h)}:${pad2(m)}`, why: 'left the minutes unchanged' }
      ];
    },
    verify({ h, m }, value) {
      // Mirror each hand: a hand at angle θ appears at 360° − θ.
      const hourAngle = 360 - (h * 30 + m * 0.5);
      const totalMinutes = Math.round((hourAngle / 30) * 60) % 720;
      const [mh, mm] = value.split(':').map(Number);
      return ((mh % 12) * 60 + mm) % 720 === totalMinutes;
    },
    render({ h, m, mh, mm }) {
      return {
        question: `A clock reads ${h}:${pad2(m)}. What time would you see in a mirror?`,
        figure: clockFigure(h, m),
        explanation: `Mirror time = 12:00 − ${h}:${pad2(m)} = ${mh}:${pad2(mm)}.`,
        solutionSteps: [`12:00 − ${h}:${pad2(m)}.`, `Borrow an hour for the minutes: ${11 - h}:${60 - m}.`, `= ${mh}:${pad2(mm)}.`],
        method: '12:00 minus the time.',
        hints: ['Subtract the time from 12:00.', 'You will need to borrow an hour for the minutes.'],
        commonMistakes: ['Subtracting only the hours.']
      };
    }
  },

  {
    id: 'clk-gain-loss-time',
    version: 1,
    topicId: 'clocks',
    conceptId: 'clk-faulty',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['clk-faulty-f'],
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const start = rng.int(5, 9) * 60;
      const n = rng.int(3, 12);
      const g = rng.int(2, 6);
      return { start, n, g, fast: rng.chance(0.5) };
    },
    answer: ({ start, n, g, fast }) => clockText(start + n * 60 + (fast ? n * g : -n * g)),
    formatValue: (value) => String(value),
    distractors: ({ start, n, g, fast }) => [
      { value: clockText(start + n * 60 + (fast ? -n * g : n * g)), why: 'applied the error the wrong way' },
      { value: clockText(start + n * 60), why: 'gave the true time' },
      { value: clockText(start + n * 60 + (fast ? (n - 1) * g : -(n - 1) * g)), why: 'counted one hour too few' },
      { value: clockText(start + n * 60 + (fast ? (n + 1) * g : -(n + 1) * g)), why: 'counted one hour too many' }
    ],
    verify({ start, n, g, fast }, value) {
      let shown = start;
      for (let hour = 0; hour < n; hour++) shown += 60 + (fast ? g : -g);
      return clockText(shown) === value;
    },
    render({ start, n, g, fast }) {
      const shown = clockText(start + n * 60 + (fast ? n * g : -n * g));
      return {
        question: `A clock ${fast ? 'gains' : 'loses'} ${g} minutes every hour. It is set right at ${clockText(start)}. What time does it show when the true time is ${clockText(start + n * 60)}?`,
        explanation: `${n} true hours pass, and the clock ${fast ? 'gains' : 'loses'} ${g} minutes in each, ${n * g} minutes in all. It shows ${shown}.`,
        solutionSteps: [`True time elapsed: ${n} hours.`, `Total error: ${n} × ${g} = ${n * g} minutes ${fast ? 'fast' : 'slow'}.`, `Shown time: ${shown}.`],
        method: 'Total error = hours × error per hour.',
        hints: ['How many true hours have passed?', `The clock is ${fast ? 'ahead' : 'behind'} by the total error.`],
        commonMistakes: ['Applying the error in the wrong direction.']
      };
    }
  },

  {
    id: 'clk-faulty-elapsed',
    version: 1,
    topicId: 'clocks',
    conceptId: 'clk-faulty',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['clk-faulty-f'],
    estimatedSeconds: 80,
    tags: ['trap'],
    params(rng) {
      const g = rng.pick([3, 4, 5, 6, 10, 12]);
      const fast = rng.chance(0.5);
      const k = rng.int(2, 12);
      const rate = fast ? 60 + g : 60 - g;
      return { g, fast, k, rate, shown: rate * k };
    },
    answer: ({ k }) => k,
    formatValue: (value) => `${fmt(value)} hour${value === 1 ? '' : 's'}`,
    distractors: ({ k, shown }) => [
      { value: shown / 60, why: 'treated the clock time as true time' },
      { value: k + 1, why: 'off by one hour' },
      { value: Math.max(k - 1, 1), why: 'off by one hour' },
      { value: k * 2, why: 'doubled the answer' }
    ],
    verify({ rate, shown }, value) {
      let trueHours = 0;
      let clockMinutes = 0;
      while (clockMinutes < shown && trueHours < 1000) {
        clockMinutes += rate;
        trueHours++;
      }
      return clockMinutes === shown && trueHours === value;
    },
    render({ g, fast, k, rate, shown }) {
      const hh = Math.floor(shown / 60);
      const mm = shown % 60;
      return {
        question: `A clock ${fast ? 'gains' : 'loses'} ${g} minutes every hour and is set right at noon. It now shows that ${hh} hour${hh === 1 ? '' : 's'}${mm ? ` ${mm} minutes` : ''} have passed. How many true hours have actually passed?`,
        explanation: `The clock advances ${rate} minutes for each true hour. It has advanced ${shown} minutes, so ${shown} ÷ ${rate} = ${k} true hours.`,
        solutionSteps: [`Clock advances ${rate} min per true hour.`, `Shown elapsed: ${shown} min.`, `${shown} ÷ ${rate} = ${k}.`],
        method: 'True elapsed = shown elapsed × 60 ÷ (60 ± g).',
        hints: [`How many minutes does the clock show per true hour?`, 'Divide the shown minutes by that.'],
        commonMistakes: ['Treating the clock reading as the true elapsed time.']
      };
    }
  },

  /* ============================= unit conversions ============================= */
  {
    id: 'uc-metric-convert',
    version: 1,
    topicId: 'unit-conversions',
    conceptId: 'uc-metric',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['uc-metric-f'],
    estimatedSeconds: 35,
    tags: ['trap'],
    answerDecimals: 2,
    params(rng) {
      const pair = rng.pick([
        { big: 'km', small: 'm', f: 1000, what: 'length' },
        { big: 'm', small: 'cm', f: 100, what: 'length' },
        { big: 'cm', small: 'mm', f: 10, what: 'length' },
        { big: 'kg', small: 'g', f: 1000, what: 'mass' },
        { big: 'quintal', small: 'kg', f: 100, what: 'mass' },
        { big: 'tonne', small: 'kg', f: 1000, what: 'mass' },
        { big: 'L', small: 'mL', f: 1000, what: 'volume' }
      ]);
      const big = rng.pick([0.5, 1.5, 2.5, 3.2, 4.5, 6.4, 7.5, 12.5, 0.25, 8.75]);
      const toSmall = rng.chance(0.5);
      // The quantity shown is always a tidy number; the answer is then a tidy number too.
      return { ...pair, toSmall, value: toSmall ? big : big * pair.f, expected: toSmall ? big * pair.f : big };
    },
    answer: ({ expected }) => expected,
    formatValue: (value) => fmt(value, 4),
    distractors: ({ f, value, toSmall, expected }) => {
      const right = expected;
      return [
        { value: toSmall ? value / f : value * f, why: 'converted in the wrong direction' },
        { value: right * 10, why: 'shifted the decimal point one place too far' },
        { value: right / 10, why: 'shifted the decimal point one place too little' },
        { value: right * 100, why: 'shifted the decimal point two places' }
      ];
    },
    verify: ({ f, value, toSmall }, answer) => (toSmall ? nearlyEqual(answer / f, value) : nearlyEqual(answer * f, value)),
    render({ big, small, f, value, toSmall, expected }) {
      const right = expected;
      return {
        question: toSmall ? `Convert ${fmt(value, 4)} ${big} into ${small}.` : `Convert ${fmt(value, 4)} ${small} into ${big}.`,
        explanation: toSmall
          ? `1 ${big} = ${fmt(f)} ${small}, so ${fmt(value, 4)} ${big} = ${fmt(value, 4)} × ${fmt(f)} = ${fmt(right, 4)} ${small}.`
          : `1 ${big} = ${fmt(f)} ${small}, so ${fmt(value, 4)} ${small} = ${fmt(value, 4)} ÷ ${fmt(f)} = ${fmt(right, 4)} ${big}.`,
        solutionSteps: [`1 ${big} = ${fmt(f)} ${small}.`, toSmall ? `Multiply: ${fmt(value, 4)} × ${fmt(f)}.` : `Divide: ${fmt(value, 4)} ÷ ${fmt(f)}.`, `= ${fmt(right, 4)}.`],
        method: toSmall ? 'To a smaller unit: multiply.' : 'To a larger unit: divide.',
        hints: [`How many ${small} are in one ${big}?`, toSmall ? 'A smaller unit means a bigger number.' : 'A larger unit means a smaller number.'],
        commonMistakes: ['Multiplying when you should divide.']
      };
    }
  },

  {
    id: 'uc-area-volume-convert',
    version: 1,
    topicId: 'unit-conversions',
    conceptId: 'uc-area-volume',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['uc-square-f'],
    estimatedSeconds: 45,
    tags: ['trap'],
    answerDecimals: 3,
    params(rng) {
      const pair = rng.pick([
        { from: 'm²', to: 'cm²', f: 10000, linear: 100 },
        { from: 'km²', to: 'm²', f: 1000000, linear: 1000 },
        { from: 'hectares', to: 'm²', f: 10000, linear: 100 },
        { from: 'm³', to: 'cm³', f: 1000000, linear: 100 },
        { from: 'm³', to: 'litres', f: 1000, linear: 10 },
        { from: 'km²', to: 'hectares', f: 100, linear: 10 }
      ]);
      return { ...pair, value: rng.pick([0.5, 2, 2.5, 3, 4.5, 6, 0.25, 7.5]) };
    },
    answer: ({ f, value }) => value * f,
    formatValue: (value) => fmt(value, 4),
    distractors: ({ f, value, linear }) => [
      { value: value * linear, why: 'used the length factor' },
      { value: value * f * 10, why: 'gained a zero' },
      { value: (value * f) / 10, why: 'lost a zero' },
      { value: value / f, why: 'divided instead of multiplying' }
    ],
    verify: ({ f, value }, answer) => nearlyEqual(answer / value, f),
    render({ from, to, f, value, linear }) {
      return {
        question: `How many ${to} are there in ${fmt(value, 4)} ${from}?`,
        explanation: `1 ${from} = ${fmt(f)} ${to} (the factor ${fmt(linear)} ${f === linear ** 2 ? 'squared' : f === linear ** 3 ? 'cubed' : 'used appropriately'}), so ${fmt(value, 4)} ${from} = ${fmt(value * f, 4)} ${to}.`,
        solutionSteps: [`1 ${from} = ${fmt(f)} ${to}.`, `${fmt(value, 4)} × ${fmt(f)} = ${fmt(value * f, 4)}.`],
        method: 'Area factor = (length factor)²; volume factor = (length factor)³.',
        hints: ['Square the length factor for an area, cube it for a volume.'],
        commonMistakes: ['Using the length factor for an area or volume.']
      };
    }
  },

  {
    id: 'uc-rate-convert',
    version: 1,
    topicId: 'unit-conversions',
    conceptId: 'uc-rates',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['uc-rate-f', 'uc-time-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    answerDecimals: 2,
    params(rng) {
      const family = rng.pick([
        { from: 'km/hr', to: 'm/min', factor: 1000 / 60, step: 3 },
        { from: 'm/s', to: 'm/min', factor: 60, step: 1 },
        { from: 'litres/min', to: 'm³/hr', factor: 60 / 1000, step: 25 },
        { from: 'km/hr', to: 'm/s', factor: 5 / 18, step: 18 },
        { from: 'm/s', to: 'km/hr', factor: 18 / 5, step: 5 }
      ]);
      return { ...family, value: family.step * rng.int(1, 12) };
    },
    answer: ({ value, factor }) => value * factor,
    formatValue: (value) => fmt(value, 4),
    distractors: ({ value, factor }) => {
      const right = value * factor;
      return [
        { value: value / factor, why: 'used the reciprocal conversion' },
        { value: right * 10, why: 'shifted the decimal point' },
        { value: right / 10, why: 'shifted the decimal point' },
        { value, why: 'did not convert' }
      ];
    },
    verify: ({ value, factor }, answer) => nearlyEqual(answer / factor, value),
    render({ from, to, factor, value }) {
      return {
        question: `Convert ${fmt(value, 4)} ${from} into ${to}.`,
        explanation: `Multiply by the conversion factor ${fmt(factor, 4)}: ${fmt(value, 4)} × ${fmt(factor, 4)} = ${fmt(value * factor, 4)} ${to}.`,
        solutionSteps: [`Convert the top unit and the bottom unit separately.`, `Combined factor = ${fmt(factor, 4)}.`, `${fmt(value, 4)} × ${fmt(factor, 4)} = ${fmt(value * factor, 4)}.`],
        method: 'Convert numerator and denominator units separately.',
        hints: ['Change the distance or volume unit first.', 'Then change the time unit.'],
        commonMistakes: ['Converting only one of the two units.']
      };
    }
  },

  {
    id: 'uc-tiles',
    version: 1,
    topicId: 'unit-conversions',
    conceptId: 'uc-word',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['uc-word-f', 'uc-square-f'],
    estimatedSeconds: 75,
    tags: ['trap'],
    params(rng) {
      const [c, d] = rng.pick([[20, 20], [25, 25], [30, 30], [50, 50], [20, 25], [20, 30], [25, 40], [40, 50]]);
      const a = rng.int(2, 12);
      const b = rng.int(2, 12);
      if (a === b || (a * b * 10000) % (c * d) !== 0) return null;
      return { a, b, c, d, tiles: (a * b * 10000) / (c * d) };
    },
    answer: ({ tiles }) => tiles,
    formatValue: (value) => fmt(value),
    distractors: ({ tiles }) => [
      { value: tiles / 10, why: 'used 1 m² = 1,000 cm²' },
      { value: tiles * 10, why: 'used 1 m² = 100,000 cm²' },
      { value: tiles / 100, why: 'used 1 m² = 100 cm²' },
      { value: tiles * 100, why: 'gained two zeros' }
    ],
    verify: ({ a, b, c, d }, value) => nearlyEqual(value * c * d, a * 100 * b * 100),
    render({ a, b, c, d, tiles }) {
      return {
        question: `A rectangular floor ${a} m by ${b} m is to be covered with rectangular tiles of ${c} cm by ${d} cm. How many tiles are needed?`,
        explanation: `Floor area = ${a} × ${b} = ${a * b} m² = ${fmt(a * b * 10000)} cm². One tile is ${c} × ${d} = ${c * d} cm². Tiles = ${fmt(a * b * 10000)} ÷ ${c * d} = ${fmt(tiles)}.`,
        solutionSteps: [`Floor: ${a * b} m² = ${fmt(a * b * 10000)} cm².`, `Tile: ${c * d} cm².`, `${fmt(a * b * 10000)} ÷ ${c * d} = ${fmt(tiles)}.`],
        method: 'Convert to the same unit, then divide the areas.',
        hints: ['Put both areas in cm².', 'Remember 1 m² = 10,000 cm².'],
        commonMistakes: ['Using 100 cm² for a square metre.']
      };
    }
  }
];

/** Pick a value from `list` deterministically from a numeric hint (keeps templates seed-stable). */
function rngSafePick(list, hint) {
  return list[Math.abs(Math.floor(hint)) % list.length];
}
