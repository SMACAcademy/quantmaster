/** Trains, boats and streams, races, and pipes and cisterns templates. */

import { fmt, format, gcd, lcm, nearlyEqual } from '../core.js';

const metres = (value) => `${fmt(value)} m`;
const seconds = (value) => `${fmt(value)} seconds`;

/** Two whole-number times whose combined rate is 1/T (T a whole number). */
function rateTriple(rng) {
  const p = rng.int(1, 5);
  const q = rng.int(1, 5);
  if (p === q || gcd(p, q) !== 1) return null;
  const T = p * q * rng.int(1, 6);
  const a = (T * (p + q)) / p;
  const b = (T * (p + q)) / q;
  if (a > 90 || b > 90 || T < 2) return null;
  return { a, b, T };
}

export const motionTemplates = [
  /* =============================== trains =============================== */
  {
    id: 'tr-pole-length',
    version: 1,
    topicId: 'trains',
    conceptId: 'tr-units',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tr-convert-f', 'tr-pole-f'],
    estimatedSeconds: 50,
    params(rng) {
      const k = rng.int(2, 8);
      return { s: 18 * k, t: rng.int(3, 20) };
    },
    answer: ({ s, t }) => ((s * 5) / 18) * t,
    formatValue: (value) => metres(value),
    distractors: ({ s, t }) => [
      { value: s * t, why: 'did not convert km/hr into m/s' },
      { value: (s * 18 * t) / 5, why: 'used 18/5 instead of 5/18' },
      { value: (s * t) / 5, why: 'divided by 5 but not by 18' }
    ],
    verify: ({ s, t }, value) => nearlyEqual((value / t) * 3.6, s),
    render({ s, t }) {
      const ms = (s * 5) / 18;
      return {
        question: `A train running at ${s} km/hr passes a pole in ${t} seconds. What is the length of the train?`,
        explanation: `${s} km/hr = ${s} × 5/18 = ${ms} m/s. Passing a pole covers the train's own length: ${ms} × ${t} = ${ms * t} m.`,
        solutionSteps: [`${s} × 5/18 = ${ms} m/s.`, `Length = speed × time = ${ms} × ${t}.`, `= ${ms * t} m.`],
        method: 'Convert to m/s, then length = speed × time.',
        hints: ['The time is in seconds, so convert the speed into m/s.', 'Multiply by 5/18, then by the time.'],
        commonMistakes: ['Multiplying the km/hr value by the seconds without converting.']
      };
    }
  },

  {
    id: 'tr-platform-time',
    version: 1,
    topicId: 'trains',
    conceptId: 'tr-platform',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tr-platform-f'],
    estimatedSeconds: 45,
    params(rng) {
      const v = rng.pick([10, 12, 15, 20, 25, 30]);
      const t = rng.int(8, 40);
      const total = v * t;
      const L = 10 * rng.int(5, 30);
      const P = total - L;
      if (P < 50 || P % 10 !== 0) return null;
      return { v, t, L, P };
    },
    answer: ({ t }) => t,
    formatValue: (value) => seconds(value),
    distractors: ({ v, L, P }) => [
      { value: L / v, why: 'used only the train length' },
      { value: P / v, why: 'used only the platform length' },
      { value: (L + P) * v, why: 'multiplied instead of dividing' }
    ],
    verify: ({ v, L, P }, value) => nearlyEqual(v * value, L + P),
    render({ v, t, L, P }) {
      return {
        question: `A ${L} m long train runs at ${v} m/s. How long does it take to completely cross a ${P} m long platform?`,
        explanation: `Distance = ${L} + ${P} = ${L + P} m. Time = ${L + P} ÷ ${v} = ${t} seconds.`,
        solutionSteps: [`Distance = ${L} + ${P} = ${L + P} m.`, `Time = ${L + P} ÷ ${v} = ${t} s.`],
        method: 'Time = (train + platform) ÷ speed.',
        hints: ['What total distance must the train travel to clear the platform?', 'Add both lengths, then divide by the speed.'],
        commonMistakes: ['Using only the platform length, forgetting the train has to clear it.']
      };
    }
  },

  {
    id: 'tr-two-trains',
    version: 1,
    topicId: 'trains',
    conceptId: 'tr-opposite',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tr-opposite-f', 'tr-same-f', 'tr-convert-f'],
    estimatedSeconds: 75,
    params(rng) {
      const a = rng.int(2, 12);
      const b = rng.int(2, 12);
      if (a === b) return null;
      const opposite = rng.chance(0.5);
      const fast = Math.max(a, b) * 9;
      const slow = Math.min(a, b) * 9;
      const rel = opposite ? fast + slow : fast - slow;
      // Choose the time first, then a total length that makes the answer whole.
      const t = 4 * rng.int(1, 12);
      const total = (t * 5 * rel) / 18;
      if (!Number.isInteger(total) || total % 10 !== 0 || total < 120 || total > 600) return null;
      const L1 = 10 * rng.int(6, total / 10 - 6);
      const L2 = total - L1;
      return { fast, slow, L1, L2, opposite, rel, t };
    },
    answer: ({ t }) => t,
    formatValue: (value) => seconds(value),
    distractors: ({ fast, slow, L1, L2, opposite }) => {
      const wrongRel = opposite ? fast - slow : fast + slow;
      return [
        { value: ((L1 + L2) * 18) / (5 * wrongRel), why: opposite ? 'subtracted the speeds' : 'added the speeds' },
        { value: (L1 + L2) / (opposite ? fast + slow : fast - slow), why: 'forgot to convert km/hr into m/s' },
        { value: (Math.max(L1, L2) * 18) / (5 * (opposite ? fast + slow : fast - slow)), why: 'used only the longer train' }
      ];
    },
    verify: ({ fast, slow, L1, L2, opposite }, value) => {
      const vf = (fast * 1000) / 3600;
      const vs = (slow * 1000) / 3600;
      const closing = opposite ? vf + vs : vf - vs;
      return nearlyEqual(closing * value, L1 + L2);
    },
    render({ fast, slow, L1, L2, opposite, rel, t }) {
      const relMs = (rel * 5) / 18;
      return {
        question: opposite
          ? `Two trains of length ${L1} m and ${L2} m run on parallel tracks in opposite directions at ${fast} km/hr and ${slow} km/hr. How long do they take to cross each other?`
          : `Two trains of length ${L1} m and ${L2} m run in the same direction at ${fast} km/hr and ${slow} km/hr. How long does the faster train take to completely overtake the slower one?`,
        explanation: `Relative speed = ${fast} ${opposite ? '+' : '−'} ${slow} = ${rel} km/hr = ${fmt(relMs)} m/s. Distance = ${L1} + ${L2} = ${L1 + L2} m. Time = ${L1 + L2} ÷ ${fmt(relMs)} = ${t} seconds.`,
        solutionSteps: [
          `Relative speed = ${rel} km/hr = ${rel} × 5/18 = ${fmt(relMs)} m/s.`,
          `Distance = ${L1} + ${L2} = ${L1 + L2} m.`,
          `Time = ${L1 + L2} ÷ ${fmt(relMs)} = ${t} s.`
        ],
        method: opposite ? 'Add the speeds, add the lengths.' : 'Subtract the speeds, add the lengths.',
        hints: [
          opposite ? 'Opposite directions: do the speeds add or subtract?' : 'Same direction: do the speeds add or subtract?',
          'Convert the relative speed into m/s, and add both lengths.'
        ],
        commonMistakes: [opposite ? 'Subtracting the speeds.' : 'Adding the speeds.']
      };
    }
  },

  {
    id: 'tr-two-crossings',
    version: 1,
    topicId: 'trains',
    conceptId: 'tr-platform',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['tr-platform-f', 'tr-pole-f'],
    estimatedSeconds: 80,
    params(rng) {
      const v = rng.pick([10, 12, 15, 20, 25]);
      const t1 = rng.int(6, 20);
      const dt = rng.int(4, 20);
      const L = v * t1;
      const P = v * dt;
      if (L > 600 || P < 50) return null;
      return { v, t1, dt, L, P };
    },
    answer: ({ L }) => L,
    verify: ({ v, t1, dt, L, P }, value) => nearlyEqual((value + P) / (t1 + dt), value / t1) && nearlyEqual(value / t1, v),
    unit: 'm',
    render({ t1, dt, L, P }) {
      const v = L / t1;
      return {
        question: `A train takes ${t1} seconds to pass a pole and ${t1 + dt} seconds to cross a ${P} m long platform. What is the length of the train, in metres?`,
        explanation: `The extra ${dt} seconds are spent on the ${P} m platform, so speed = ${P} ÷ ${dt} = ${fmt(v)} m/s. Length = ${fmt(v)} × ${t1} = ${L} m.`,
        solutionSteps: [`Extra time = ${t1 + dt} − ${t1} = ${dt} s.`, `Speed = ${P} ÷ ${dt} = ${fmt(v)} m/s.`, `Length = ${fmt(v)} × ${t1} = ${L} m.`],
        method: 'The difference in times covers exactly the platform.',
        hints: ['What does the extra time correspond to?', 'Use the platform length and the extra time for the speed.'],
        commonMistakes: [`Using ${t1 + dt} seconds as the pole time.`]
      };
    }
  },

  /* ========================= boats and streams ========================= */
  {
    id: 'bs-solve-speeds',
    version: 1,
    topicId: 'boats-streams',
    conceptId: 'bs-solve',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['bs-solve-f'],
    estimatedSeconds: 40,
    params(rng) {
      const b = rng.int(5, 25);
      const s = rng.int(1, Math.min(b - 1, 8));
      return { b, s, D: b + s, U: b - s, askBoat: rng.chance(0.5) };
    },
    answer: ({ b, s, askBoat }) => (askBoat ? b : s),
    formatValue: (value) => format.kmh(value),
    distractors: ({ b, s, D, U, askBoat }) =>
      askBoat
        ? [
            { value: s, why: 'gave the stream speed' },
            { value: D - U, why: 'gave the difference of the speeds' },
            { value: D + U, why: 'forgot to halve the sum' }
          ]
        : [
            { value: D - U, why: 'forgot to halve the difference' },
            { value: b, why: 'gave the still-water speed' },
            { value: D + U, why: 'added the speeds' }
          ],
    verify: ({ D, U }, value) => value >= 0 && D - value >= 0 && U + value >= 0,
    render({ b, s, D, U, askBoat }) {
      return {
        question: `A boat goes downstream at ${D} km/hr and upstream at ${U} km/hr. What is ${askBoat ? 'its speed in still water' : 'the speed of the stream'}?`,
        explanation: askBoat
          ? `Still water = (${D} + ${U}) ÷ 2 = ${b} km/hr.`
          : `Stream = (${D} − ${U}) ÷ 2 = ${s} km/hr.`,
        solutionSteps: [
          `Downstream = b + s = ${D}; upstream = b − s = ${U}.`,
          askBoat ? `Adding: 2b = ${D + U}, so b = ${b}.` : `Subtracting: 2s = ${D - U}, so s = ${s}.`
        ],
        method: askBoat ? 'b = (D + U) ÷ 2.' : 's = (D − U) ÷ 2.',
        hints: ['Downstream is b + s and upstream is b − s.', askBoat ? 'Add the two speeds: the stream cancels.' : 'Subtract the two speeds: the boat cancels.'],
        commonMistakes: askBoat ? ['Reporting the stream speed instead of the boat speed.'] : ['Forgetting to halve the difference.']
      };
    }
  },

  {
    id: 'bs-round-trip-time',
    version: 1,
    topicId: 'boats-streams',
    conceptId: 'bs-roundtrip',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['bs-roundtrip-f', 'bs-speeds-f'],
    estimatedSeconds: 70,
    tags: ['trap'],
    params(rng) {
      const b = rng.int(6, 20);
      const s = rng.int(1, Math.min(b - 2, 6));
      const D = b + s;
      const U = b - s;
      const unit = lcm(D, U);
      const d = unit * rng.int(1, 3);
      if (d > 300) return null;
      return { b, s, D, U, d };
    },
    answer: ({ d, D, U }) => d / D + d / U,
    formatValue: (value) => format.hours(value),
    distractors: ({ b, d, D, U }) => [
      { value: (2 * d) / b, why: 'used the still-water speed for the whole trip' },
      { value: d / D, why: 'gave only the downstream leg' },
      { value: d / U, why: 'gave only the upstream leg' }
    ],
    verify: ({ d, D, U }, value) => nearlyEqual(value * D * U, d * (D + U)),
    render({ b, s, D, U, d }) {
      return {
        question: `A boat with a speed of ${b} km/hr in still water goes ${d} km downstream and comes back to its starting point. The stream flows at ${s} km/hr. How long does the round trip take?`,
        explanation: `Downstream: ${d} ÷ ${D} = ${fmt(d / D)} hr. Upstream: ${d} ÷ ${U} = ${fmt(d / U)} hr. Total = ${fmt(d / D + d / U)} hr.`,
        solutionSteps: [`Downstream speed = ${b} + ${s} = ${D}; upstream = ${b} − ${s} = ${U}.`, `Times: ${d} ÷ ${D} and ${d} ÷ ${U}.`, `Total = ${fmt(d / D + d / U)} hr.`],
        method: 'Time each leg separately, then add.',
        hints: ['Find the speed on each leg first.', `Do not use ${2 * d} ÷ ${b}: the stream changes each leg differently.`],
        commonMistakes: ['Using the still-water speed for both legs.']
      };
    }
  },

  {
    id: 'bs-equal-time',
    version: 1,
    topicId: 'boats-streams',
    conceptId: 'bs-apps',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['bs-speeds-f'],
    estimatedSeconds: 90,
    params(rng) {
      const b = rng.int(8, 24);
      const s = rng.int(1, Math.min(b - 2, 6));
      const t = rng.int(1, 3);
      const D = b + s;
      const U = b - s;
      const g = gcd(D, U);
      return { b, s, d1: (D / g) * t, d2: (U / g) * t * 1, D, U, g };
    },
    answer: ({ b }) => b,
    formatValue: (value) => format.kmh(value),
    distractors: ({ b, D, U }) => [
      { value: D, why: 'gave the downstream speed' },
      { value: U, why: 'gave the upstream speed' },
      { value: 2 * b, why: 'doubled the answer' }
    ],
    verify: ({ s, d1, d2 }, value) => nearlyEqual(d1 / (value + s), d2 / (value - s)),
    render({ s, d1, d2, b }) {
      return {
        question: `A boat goes ${d1} km downstream in the same time it takes to go ${d2} km upstream. The stream flows at ${s} km/hr. What is the boat's speed in still water?`,
        explanation: `Equal times: ${d1} ÷ (b + ${s}) = ${d2} ÷ (b − ${s}). Cross-multiplying: ${d1}(b − ${s}) = ${d2}(b + ${s}), so b = ${b} km/hr.`,
        solutionSteps: [`${d1}(b − ${s}) = ${d2}(b + ${s}).`, `${d1}b − ${d1 * s} = ${d2}b + ${d2 * s}.`, `b = ${b}.`],
        method: 'Equal times: distance ÷ speed is the same on both legs.',
        hints: ['Time is the same, so distance ÷ speed is the same both ways.', 'Cross-multiply and solve for b.'],
        commonMistakes: ['Mixing up which leg has b + s and which has b − s.']
      };
    }
  },

  /* =============================== races =============================== */
  {
    id: 'rc-ratio-margin',
    version: 1,
    topicId: 'races',
    conceptId: 'rc-ratio',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['rc-ratio-f'],
    estimatedSeconds: 50,
    params(rng) {
      const p = rng.int(3, 10);
      const q = rng.int(2, p - 1);
      if (gcd(p, q) !== 1) return null;
      return { p, q, L: p * 10 * rng.int(1, 8) };
    },
    answer: ({ p, q, L }) => L - (L * q) / p,
    formatValue: (value) => metres(value),
    distractors: ({ p, q, L }) => [
      { value: (L * q) / p, why: 'gave the distance B ran' },
      { value: (L * (p - q)) / q, why: 'used the slower speed as the base' },
      { value: L - (p - q), why: 'subtracted the difference of the ratio terms' }
    ],
    verify: ({ p, q, L }, value) => nearlyEqual((L - value) / L, q / p),
    render({ p, q, L }) {
      const b = (L * q) / p;
      return {
        question: `The speeds of A and B are in the ratio ${p} : ${q}. In a ${L} m race, by how many metres does A beat B?`,
        explanation: `When A runs ${L} m, B runs ${L} × ${q}/${p} = ${fmt(b)} m in the same time. A wins by ${L} − ${fmt(b)} = ${fmt(L - b)} m.`,
        solutionSteps: [`B's distance = ${L} × ${q}/${p} = ${fmt(b)} m.`, `Margin = ${L} − ${fmt(b)} = ${fmt(L - b)} m.`],
        method: 'Loser\'s distance = L × (slower ÷ faster).',
        hints: ['In equal time, how far does B run when A runs the whole race?', 'The margin is the difference between the two distances.'],
        commonMistakes: ['Giving the distance B ran instead of the margin.']
      };
    }
  },

  {
    id: 'rc-time-gap',
    version: 1,
    topicId: 'races',
    conceptId: 'rc-beat',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rc-beat-f'],
    estimatedSeconds: 75,
    tags: ['trap'],
    params(rng) {
      const tA = rng.int(20, 200);
      const dt = rng.int(5, 40);
      const tB = tA + dt;
      const m = rng.int(2, 8);
      const L = tB * m;
      if (L > 2000) return null;
      return { tA, dt, tB, L, m };
    },
    answer: ({ dt, m }) => dt * m,
    formatValue: (value) => metres(value),
    distractors: ({ tA, dt, L, m }) => [
      { value: (L / tA) * dt, why: "converted the gap at the winner's speed" },
      { value: L - dt * m, why: 'gave the distance B ran' },
      { value: L / dt, why: 'divided the distance by the time gap' }
    ],
    verify: ({ tA, dt, L }, value) => nearlyEqual(L - value, (L / (tA + dt)) * tA),
    render({ tA, dt, tB, L, m }) {
      return {
        question: `In a ${L} m race, A finishes in ${tA} seconds and beats B by ${dt} seconds. By how many metres does A beat B?`,
        explanation: `B takes ${tB} s for ${L} m, so B's speed = ${L} ÷ ${tB} = ${m} m/s. In the ${dt}-second gap B covers ${m} × ${dt} = ${m * dt} m. A wins by ${m * dt} m.`,
        solutionSteps: [`B's time = ${tA} + ${dt} = ${tB} s.`, `B's speed = ${L} ÷ ${tB} = ${m} m/s.`, `Distance behind = ${m} × ${dt} = ${m * dt} m.`],
        method: 'A time gap becomes a distance at the loser\'s speed.',
        hints: ['How long does B take for the whole race?', 'What does B cover in the time gap?'],
        commonMistakes: ["Using the winner's speed to convert the time gap."]
      };
    }
  },

  {
    id: 'rc-start-length',
    version: 1,
    topicId: 'races',
    conceptId: 'rc-start',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rc-start-f'],
    estimatedSeconds: 80,
    params(rng) {
      const a = rng.int(5, 12);
      const b = rng.int(3, a - 1);
      const t = rng.int(5, 30);
      return { a, b, t, s: (a - b) * t, L: a * t };
    },
    answer: ({ L }) => L,
    formatValue: (value) => metres(value),
    distractors: ({ b, t, s, a, L }) => [
      { value: b * t, why: "gave B's distance instead of the race length" },
      { value: L + s, why: 'added the start to the race length' },
      { value: (s * a) / b, why: 'used the wrong speed ratio' }
    ],
    verify: ({ a, b, s }, value) => nearlyEqual(value / a, (value - s) / b),
    render({ a, b, s, L, t }) {
      return {
        question: `A runs at ${a} m/s and B at ${b} m/s. A gives B a start of ${s} m and they reach the finish at exactly the same moment. How long is the race?`,
        explanation: `Equal times: L ÷ ${a} = (L − ${s}) ÷ ${b}. So ${b}L = ${a}L − ${a * s}, giving L = ${L} m. Check: ${L} ÷ ${a} = ${t} s and ${L - s} ÷ ${b} = ${t} s.`,
        solutionSteps: [`Time for A = L ÷ ${a}; time for B = (L − ${s}) ÷ ${b}.`, `Set equal: ${b}L = ${a}(L − ${s}).`, `L = ${L} m.`],
        method: 'Equal times: L ÷ S_A = (L − start) ÷ S_B.',
        hints: ['A tie means equal times.', 'Write both times and set them equal.'],
        commonMistakes: ["Giving B's distance (L − start) instead of the race length."]
      };
    }
  },

  /* ========================= pipes and cisterns ========================= */
  {
    id: 'pc-together',
    version: 1,
    topicId: 'pipes-cisterns',
    conceptId: 'pc-combined',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pc-net-f'],
    estimatedSeconds: 50,
    params: (rng) => rateTriple(rng),
    answer: ({ T }) => T,
    formatValue: (value) => format.hours(value),
    distractors: ({ a, b }) => [
      { value: (a + b) / 2, why: 'averaged the times' },
      { value: a + b, why: 'added the times' },
      { value: Math.abs(a - b), why: 'subtracted the times' },
      { value: Math.min(a, b) / 2, why: 'halved the faster time' }
    ],
    verify: ({ a, b }, value) => nearlyEqual(1 / a + 1 / b, 1 / value),
    render({ a, b, T }) {
      const units = lcm(a, b);
      return {
        question: `Pipe A can fill a tank in ${a} hours and pipe B can fill it in ${b} hours. How long will they take to fill it together?`,
        explanation: `Together they fill 1/${a} + 1/${b} = 1/${T} of the tank per hour, so ${T} hours.`,
        solutionSteps: [`Call the tank ${units} units.`, `A adds ${units / a} per hour and B adds ${units / b} per hour.`, `Together ${units / a + units / b} per hour: ${units} ÷ ${units / a + units / b} = ${T} hours.`],
        method: 'Add the rates, then invert.',
        hints: [`Convert each time into a rate: A fills 1/${a} per hour.`, 'Add the rates and invert.'],
        commonMistakes: ['Averaging or adding the times.']
      };
    }
  },

  {
    id: 'pc-with-outlet',
    version: 1,
    topicId: 'pipes-cisterns',
    conceptId: 'pc-combined',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pc-net-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      // T - a must divide a², so b = a·T ÷ (T - a) is a whole number by construction.
      const a = rng.int(2, 20);
      const divisors = [];
      for (let d = 1; d <= a * a; d++) if ((a * a) % d === 0 && (a * (a + d)) / d <= 90) divisors.push(d);
      if (!divisors.length) return null;
      const T = a + rng.pick(divisors);
      const b = (a * T) / (T - a);
      if (b === a || T > 90) return null;
      return { a, b, T };
    },
    answer: ({ T }) => T,
    formatValue: (value) => format.hours(value),
    distractors: ({ a, b }) => [
      { value: (a * b) / (a + b), why: 'added the rates instead of subtracting' },
      { value: (a + b) / 2, why: 'averaged the times' },
      { value: a + b, why: 'added the times' }
    ],
    verify: ({ a, b }, value) => nearlyEqual(1 / a - 1 / b, 1 / value),
    render({ a, b, T }) {
      return {
        question: `An inlet pipe can fill an empty tank in ${a} hours and an outlet pipe can empty the full tank in ${b} hours. If both are opened together, how long will it take to fill the empty tank?`,
        explanation: `Net rate = 1/${a} − 1/${b} = 1/${T} per hour, so ${T} hours.`,
        solutionSteps: [`Inlet: +1/${a}; outlet: −1/${b}.`, `Net = 1/${a} − 1/${b} = 1/${T}.`, `Time = ${T} hours.`],
        method: 'Inlets add, outlets subtract.',
        hints: ['The outlet works against the inlet.', 'Subtract the outlet rate from the inlet rate and invert.'],
        commonMistakes: ["Adding the outlet's rate."]
      };
    }
  },

  {
    id: 'pc-leak',
    version: 1,
    topicId: 'pipes-cisterns',
    conceptId: 'pc-leak',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pc-leak-f'],
    estimatedSeconds: 70,
    tags: ['trap'],
    params(rng) {
      const a = rng.int(3, 20);
      const b = a + rng.int(1, 6);
      if ((a * b) % (b - a) !== 0) return null;
      return { a, b, leak: (a * b) / (b - a) };
    },
    answer: ({ leak }) => leak,
    formatValue: (value) => format.hours(value),
    distractors: ({ a, b }) => [
      { value: b - a, why: 'took the difference of the times' },
      { value: a + b, why: 'added the times' },
      { value: (a * b) / (a + b), why: 'added the rates instead of subtracting' }
    ],
    verify: ({ a, b }, value) => nearlyEqual(1 / a - 1 / value, 1 / b),
    render({ a, b, leak }) {
      return {
        question: `A pipe fills a tank in ${a} hours. Because of a leak, it takes ${b} hours to fill it. How long would the leak alone take to empty the full tank?`,
        explanation: `Leak rate = 1/${a} − 1/${b} = 1/${leak}, so the leak empties a full tank in ${leak} hours.`,
        solutionSteps: [`Without the leak: 1/${a} per hour. With it: 1/${b} per hour.`, `Leak = 1/${a} − 1/${b} = 1/${leak}.`, `Time = ${leak} hours.`],
        method: 'Leak rate = normal rate − actual rate.',
        hints: ['The extra hours are not the emptying time.', 'Subtract the two fill rates and invert.'],
        commonMistakes: ['Answering with the difference of the two fill times.']
      };
    }
  },

  {
    id: 'pc-close-one',
    version: 1,
    topicId: 'pipes-cisterns',
    conceptId: 'pc-apps',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['pc-net-f', 'pc-stage-f'],
    estimatedSeconds: 100,
    params(rng) {
      const triple = rateTriple(rng);
      if (!triple) return null;
      const { a, b, T } = triple;
      const options = [];
      for (let k = 1; k < T; k++) if ((b * (T - k)) % T === 0) options.push(k);
      if (!options.length) return null;
      const t1 = rng.pick(options);
      const extra = (b * (T - t1)) / T;
      return { a, b, T, t1, extra };
    },
    answer: ({ extra }) => extra,
    formatValue: (value) => format.hours(value),
    distractors: ({ b, T, t1 }) => [
      { value: T - t1, why: 'kept the combined rate after A was closed' },
      { value: b - t1, why: 'subtracted the time from the full fill time' },
      { value: T, why: 'ignored the first stage' }
    ],
    verify: ({ a, b, t1 }, value) => nearlyEqual(t1 * (1 / a + 1 / b) + value / b, 1),
    render({ a, b, T, t1, extra }) {
      const done = t1 / T;
      return {
        question: `Pipe A fills a tank in ${a} hours and pipe B in ${b} hours. Both are opened together and after ${t1} hours pipe A is closed. How many more hours does B need to fill the rest of the tank?`,
        explanation: `Together they fill 1/${T} per hour, so in ${t1} hours ${t1}/${T} is done. The remaining ${fmt(1 - done, 3)} is filled by B at 1/${b} per hour: ${extra} hours.`,
        solutionSteps: [`Combined rate = 1/${a} + 1/${b} = 1/${T}.`, `Done in ${t1} hours = ${t1}/${T}; remaining = ${T - t1}/${T}.`, `B alone: (${T - t1}/${T}) × ${b} = ${extra} hours.`],
        method: 'Stage 1: rate × time. Stage 2: remaining ÷ new rate.',
        hints: ['First find how much is filled in the first stage.', 'Then only B is working.'],
        commonMistakes: ["Continuing to use the combined rate after A is closed."]
      };
    }
  }
];
