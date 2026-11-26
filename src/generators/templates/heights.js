/**
 * Heights and distances templates, and the figures they share with the
 * authored questions. Answers are checked by rebuilding the triangle and
 * measuring its angles with Math.atan2.
 */

import { fmt, nearlyEqual } from '../core.js';

const RAD = Math.PI / 180;
const ANGLES = [30, 45, 60];
const round2 = (value) => Math.round(value * 100) / 100;
const angleAt = (opposite, adjacent) => Math.atan2(opposite, adjacent) / RAD;
/** "a" or "an" before a number read aloud: an 8, an 11, an 18, an 80. */
const an = (n) => (/^8/.test(String(n)) || n === 11 || n === 18 ? 'an' : 'a');

/** Observer at A on the ground, a tower BC; angle of elevation at A. */
export function towerFigure({ distance, height, angle, distanceLabel, heightLabel, caption }) {
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: 0, labelOffset: [-14, 6] },
      { id: 'B', x: distance, y: 0, labelOffset: [8, 14] },
      { id: 'C', x: distance, y: height, labelOffset: [8, -8] }
    ],
    shapes: [
      { type: 'segment', from: 'A', to: 'B', label: distanceLabel, labelOffset: [0, 16] },
      { type: 'segment', from: 'B', to: 'C', label: heightLabel, labelOffset: [26, 0] },
      { type: 'segment', from: 'A', to: 'C', style: 'dashed' }
    ],
    angles: [{ at: 'A', from: 'B', to: 'C', label: `${angle}°`, radius: 26 }],
    rightAngles: [{ at: 'B', from: 'A', to: 'C' }],
    ariaSummary: `${caption}. The angle of elevation at A is ${angle}°, the ground distance AB is ${distanceLabel} and the height BC is ${heightLabel}.`
  };
}

/** Top P of a height PQ looking down at R on the ground; angle of depression at P. */
export function depressionFigure({ distance, height, angle, distanceLabel, heightLabel, caption }) {
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'P', x: 0, y: height, labelOffset: [-14, -6] },
      { id: 'Q', x: 0, y: 0, labelOffset: [-14, 8] },
      { id: 'R', x: distance, y: 0, labelOffset: [8, 14] },
      { id: 'H', x: distance, y: height, hidden: true }
    ],
    shapes: [
      { type: 'segment', from: 'P', to: 'Q', label: heightLabel, labelOffset: [-28, 0] },
      { type: 'segment', from: 'Q', to: 'R', label: distanceLabel, labelOffset: [0, 16] },
      { type: 'segment', from: 'P', to: 'R', style: 'dashed' },
      { type: 'segment', from: 'P', to: 'H', style: 'dashed' }
    ],
    angles: [{ at: 'P', from: 'H', to: 'R', label: `${angle}°`, radius: 30 }],
    rightAngles: [{ at: 'Q', from: 'P', to: 'R' }],
    ariaSummary: `${caption}. The angle of depression at P, below the horizontal, is ${angle}°. The height PQ is ${heightLabel} and the distance QR is ${distanceLabel}.`
  };
}

/** Walking from A to B towards a tower FT; the elevation rises from α to β. */
export function twoAngleFigure({ walk, remaining, height, alpha, beta, walkLabel, caption }) {
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: 0, labelOffset: [-14, 6] },
      { id: 'B', x: walk, y: 0, labelOffset: [-4, 16] },
      { id: 'F', x: walk + remaining, y: 0, labelOffset: [8, 14] },
      { id: 'T', x: walk + remaining, y: height, labelOffset: [8, -8] }
    ],
    shapes: [
      { type: 'segment', from: 'A', to: 'F' },
      { type: 'segment', from: 'F', to: 'T', label: '?', labelOffset: [16, 0] },
      { type: 'segment', from: 'A', to: 'T', style: 'dashed' },
      { type: 'segment', from: 'B', to: 'T', style: 'dashed' },
      { type: 'segment', from: 'A', to: 'B', label: walkLabel, labelOffset: [0, 30] }
    ],
    angles: [
      { at: 'A', from: 'F', to: 'T', label: `${alpha}°`, radius: 30 },
      { at: 'B', from: 'F', to: 'T', label: `${beta}°`, radius: 24 }
    ],
    rightAngles: [{ at: 'F', from: 'A', to: 'T' }],
    ariaSummary: `${caption}. From A the angle of elevation of T is ${alpha}°; after walking ${walkLabel} to B it is ${beta}°. The height FT is unknown.`
  };
}

export const heightsTemplates = [
  {
    id: 'hd-elevation',
    version: 1,
    topicId: 'heights-distances',
    conceptId: 'hd-one-triangle',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['hd-tan-f'],
    answerDecimals: 2,
    tolerance: 0.01,
    unit: 'm',
    estimatedSeconds: 45,
    params(rng) {
      const angle = rng.pick(ANGLES);
      const known = rng.int(2, 30) * 5;
      const ask = rng.pick(['height', 'distance']);
      const height = ask === 'height' ? known * Math.tan(angle * RAD) : known;
      const distance = ask === 'height' ? known : known / Math.tan(angle * RAD);
      return { angle, known, ask, height, distance };
    },
    answer: ({ ask, height, distance }) => round2(ask === 'height' ? height : distance),
    // Rebuild the triangle from the answer and measure the angle again.
    verify: ({ angle, known, ask }, value) =>
      Math.abs((ask === 'height' ? angleAt(value, known) : angleAt(known, value)) - angle) < 0.02,
    render({ angle, known, ask, height, distance }) {
      const value = round2(ask === 'height' ? height : distance);
      const caption = 'A tower BC seen from A';
      return {
        question:
          ask === 'height'
            ? `From a point ${known} m from the foot of a tower, the angle of elevation of its top is ${angle}°. How tall is the tower, in metres (to 2 decimal places)?`
            : `A tower is ${known} m tall. From a point on the ground the angle of elevation of its top is ${angle}°. How far is the point from the foot of the tower, in metres (to 2 decimal places)?`,
        figure: towerFigure({
          distance,
          height,
          angle,
          distanceLabel: ask === 'height' ? `${known} m` : '?',
          heightLabel: ask === 'height' ? '?' : `${known} m`,
          caption
        }),
        explanation:
          ask === 'height'
            ? `tan ${angle}° = height ÷ ${known}, so height = ${known} × tan ${angle}° = ${fmt(value)} m.`
            : `tan ${angle}° = ${known} ÷ distance, so distance = ${known} ÷ tan ${angle}° = ${fmt(value)} m.`,
        solutionSteps: [
          `tan θ = opposite ÷ adjacent = height ÷ distance.`,
          ask === 'height' ? `Height = ${known} × tan ${angle}°.` : `Distance = ${known} ÷ tan ${angle}°.`,
          `= ${fmt(value)} m.`
        ],
        method: 'Height and ground distance are linked by the tangent of the angle of elevation.',
        hints: ['tan 30° ≈ 0.577, tan 45° = 1, tan 60° ≈ 1.732.', 'Which side is opposite the angle, and which is next to it?'],
        commonMistakes: ['Using sine, which needs the line of sight, not the ground distance.', 'Multiplying when you should divide by tan θ.']
      };
    }
  },

  {
    id: 'hd-depression',
    version: 1,
    topicId: 'heights-distances',
    conceptId: 'hd-elevation',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['hd-depression-f', 'hd-tan-f'],
    answerDecimals: 2,
    tolerance: 0.01,
    unit: 'm',
    estimatedSeconds: 55,
    params(rng) {
      const angle = rng.pick(ANGLES);
      const height = rng.int(4, 30) * 5;
      const what = rng.pick(['cliff', 'lighthouse', 'building']);
      const target = rng.pick(['boat', 'car', 'rock']);
      if (what !== 'building' && target === 'car') return null;
      return { angle, height, what, target, distance: height / Math.tan(angle * RAD) };
    },
    answer: ({ distance }) => round2(distance),
    verify: ({ angle, height }, value) => Math.abs(angleAt(height, value) - angle) < 0.02,
    render({ angle, height, what, target, distance }) {
      const value = round2(distance);
      return {
        question: `From the top of ${an(height)} ${height} m ${what}, the angle of depression of a ${target} is ${angle}°. How far is the ${target} from the foot of the ${what}, in metres (to 2 decimal places)?`,
        figure: depressionFigure({ distance, height, angle, distanceLabel: '?', heightLabel: `${height} m`, caption: `Looking down from the top of the ${what}` }),
        explanation: `The angle of depression from the top equals the angle of elevation from the ${target} (alternate angles). So tan ${angle}° = ${height} ÷ distance, giving distance = ${height} ÷ tan ${angle}° = ${fmt(value)} m.`,
        solutionSteps: [`Angle of elevation from the ${target} = ${angle}°.`, `Distance = ${height} ÷ tan ${angle}°.`, `= ${fmt(value)} m.`],
        method: 'Turn the angle of depression into the equal angle of elevation at the other end.',
        hints: ['The horizontal at the top is parallel to the ground.', `tan ${angle}° = height ÷ distance.`],
        commonMistakes: ['Putting the angle of depression between the line of sight and the vertical.']
      };
    }
  },

  {
    id: 'hd-two-angles',
    version: 1,
    topicId: 'heights-distances',
    conceptId: 'hd-two-angles',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['hd-two-angles-f', 'hd-sc-30-60'],
    answerDecimals: 2,
    tolerance: 0.01,
    unit: 'm',
    estimatedSeconds: 80,
    params(rng) {
      const [alpha, beta] = rng.pick([[30, 60], [30, 45], [45, 60]]);
      const walk = rng.int(2, 20) * 10;
      const cot = (deg) => 1 / Math.tan(deg * RAD);
      const height = walk / (cot(alpha) - cot(beta));
      return { alpha, beta, walk, height, remaining: height * cot(beta) };
    },
    answer: ({ height }) => round2(height),
    // From the height alone, both angles must come back.
    verify: ({ alpha, beta, walk }, value) => {
      const remaining = value / Math.tan(beta * RAD);
      return Math.abs(angleAt(value, remaining + walk) - alpha) < 0.02;
    },
    render({ alpha, beta, walk, height, remaining }) {
      const value = round2(height);
      return {
        question: `Walking ${walk} m straight towards a tower, the angle of elevation of its top rises from ${alpha}° to ${beta}°. How tall is the tower, in metres (to 2 decimal places)?`,
        figure: twoAngleFigure({ walk, remaining, height, alpha, beta, walkLabel: `${walk} m`, caption: 'Two sightings of the tower FT' }),
        explanation: `Let the height be h. From B: distance = h cot ${beta}°. From A: distance = h cot ${alpha}°. The difference is the walk: h(cot ${alpha}° − cot ${beta}°) = ${walk}, so h = ${walk} ÷ (cot ${alpha}° − cot ${beta}°) = ${fmt(value)} m.`,
        solutionSteps: [`h cot ${alpha}° − h cot ${beta}° = ${walk}.`, `h = ${walk} ÷ (cot ${alpha}° − cot ${beta}°).`, `= ${fmt(value)} m.`],
        method: 'Write both ground distances in terms of the height; their difference is the distance walked.',
        hints: ['Call the height h and write each distance as h × cot(angle).', 'cot 30° = √3 ≈ 1.732, cot 45° = 1, cot 60° ≈ 0.577.'],
        commonMistakes: ['Using the whole distance from A with the angle at B.']
      };
    }
  },

  {
    id: 'hd-shadow',
    version: 1,
    topicId: 'heights-distances',
    conceptId: 'hd-shadow',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['hd-tan-f'],
    estimatedSeconds: 45,
    params(rng) {
      const angle = rng.pick(ANGLES);
      // Height and shadow chosen so the ratio is exactly tan(angle): k√3 pairs written with √3.
      const k = rng.int(2, 20);
      return { angle, k };
    },
    answer: ({ angle }) => angle,
    verify: ({ angle, k }, value) => {
      const [height, shadow] = { 30: [k, k * Math.sqrt(3)], 45: [k, k], 60: [k * Math.sqrt(3), k] }[angle];
      return Math.abs(angleAt(height, shadow) - value) < 1e-6;
    },
    render({ angle, k }) {
      const [heightText, shadowText] = { 30: [`${k} m`, `${k}√3 m`], 45: [`${k} m`, `${k} m`], 60: [`${k}√3 m`, `${k} m`] }[angle];
      const ratio = { 30: '1/√3', 45: '1', 60: '√3' }[angle];
      return {
        question: `A pole ${heightText} tall casts a shadow ${shadowText} long. What is the angle of elevation of the sun, in degrees?`,
        explanation: `tan θ = height ÷ shadow = ${heightText.replace(' m', '')} ÷ ${shadowText.replace(' m', '')} = ${ratio}, so θ = ${angle}°.`,
        solutionSteps: [`tan θ = ${heightText.replace(' m', '')} ÷ ${shadowText.replace(' m', '')}.`, `= ${ratio}.`, `θ = ${angle}°.`],
        method: 'The pole, its shadow and the sun\'s ray make a right triangle; use tan θ = height ÷ shadow.',
        hints: ['Divide the height by the shadow.', 'Which standard angle has that tangent?'],
        commonMistakes: [`Swapping height and shadow, which gives ${90 - angle}°.`]
      };
    }
  },

  {
    id: 'hd-ladder',
    version: 1,
    topicId: 'heights-distances',
    conceptId: 'hd-shadow',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['hd-ladder-f'],
    answerDecimals: 2,
    tolerance: 0.01,
    unit: 'm',
    estimatedSeconds: 45,
    params(rng) {
      const angle = rng.pick(ANGLES);
      const length = rng.int(2, 15) * 2;
      const ask = rng.pick(['height', 'foot']);
      return { angle, length, ask };
    },
    answer: ({ angle, length, ask }) => round2(ask === 'height' ? length * Math.sin(angle * RAD) : length * Math.cos(angle * RAD)),
    // The ladder, the wall and the ground: the other side follows from Pythagoras. Rounding
    // the answer to 2 places moves the measured angle by up to about 0.15° on a short ladder;
    // a real slip (sine for cosine) is out by 15° or more.
    verify: ({ angle, length, ask }, value) => {
      const other = Math.sqrt(length * length - value * value);
      const measured = ask === 'height' ? angleAt(value, other) : angleAt(other, value);
      return Math.abs(measured - angle) < 0.3;
    },
    render({ angle, length, ask }) {
      const value = round2(ask === 'height' ? length * Math.sin(angle * RAD) : length * Math.cos(angle * RAD));
      const fn = ask === 'height' ? 'sin' : 'cos';
      return {
        question:
          ask === 'height'
            ? `${an(length) === 'an' ? 'An' : 'A'} ${length} m ladder leans against a wall, making ${angle}° with the ground. How high up the wall does it reach, in metres (to 2 decimal places)?`
            : `${an(length) === 'an' ? 'An' : 'A'} ${length} m ladder leans against a wall, making ${angle}° with the ground. How far is its foot from the wall, in metres (to 2 decimal places)?`,
        explanation: `The ladder is the hypotenuse. ${ask === 'height' ? 'Height' : 'Distance from the wall'} = ${length} × ${fn} ${angle}° = ${fmt(value)} m.`,
        solutionSteps: [`${ask === 'height' ? 'Height' : 'Foot distance'} = ladder × ${fn} ${angle}°.`, `${length} × ${fn} ${angle}° = ${fmt(value)} m.`],
        method: 'The ladder is the hypotenuse: the wall height uses sine, the ground distance uses cosine.',
        hints: ['Which side does the ladder form?', ask === 'height' ? 'The wall is opposite the angle.' : 'The ground is next to the angle.'],
        commonMistakes: ['Using tan, which needs two legs rather than the hypotenuse.']
      };
    }
  }
];
