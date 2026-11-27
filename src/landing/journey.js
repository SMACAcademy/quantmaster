/**
 * The landing page's journey: the stations the camera flies between, the copy
 * beside each one, and the plain maths that turns scroll position into a place
 * on the journey. Kept free of DOM and WebGL so it can be unit tested.
 */

import { readJSON, writeJSON } from '../utils/storage.js';

export const WELCOMED_KEY = 'quantmaster:v1:welcomed';

/**
 * Stations in flight order. `side` is where the 3D scene sits on wide screens;
 * the card goes on the other side. `topics` and `simulation` must exist in the
 * app's data (checked by tests/landing.test.js). `teaser` is a quick question
 * the card asks, with the answer behind a reveal.
 */
export const STATIONS = [
  { id: 'hero', side: 'right', color: '#7c8cff' },
  {
    id: 'motion',
    side: 'left',
    color: '#60a5fa',
    nav: 'Motion',
    eyebrow: 'Speed, time and distance',
    title: 'Two trains, one meeting point',
    text: 'Trains, boats, races and relative speed. Watch the gap close at the sum of the speeds, then answer questions drawn on the same picture.',
    topics: ['time-speed-distance', 'trains', 'boats-streams', 'races'],
    simulation: 'tsd-meeting',
    teaser: {
      question: 'Two trains start 300 km apart and head towards each other at 60 and 40 km/h. When do they meet?',
      answer: 'In 3 hours. The gap closes at 60 + 40 = 100 km/h, and 300 ÷ 100 = 3.'
    }
  },
  {
    id: 'work',
    side: 'right',
    color: '#06b6d4',
    nav: 'Pipes',
    eyebrow: 'Time and work',
    title: 'Every pipe is a rate',
    text: 'Two pipes fill, one drains, and the tank only cares about the total. See why rates add while times do not.',
    topics: ['pipes-cisterns', 'time-and-work', 'work-and-wages'],
    simulation: 'tank-filling',
    teaser: {
      question: 'A fills a tank in 12 min, B in 15 min, and C empties it in 20 min. With all three open, how long does it take to fill?',
      answer: '10 minutes. Each minute: 1/12 + 1/15 − 1/20 = (5 + 4 − 3)/60 = 1/10 of the tank.'
    }
  },
  {
    id: 'seating',
    side: 'left',
    color: '#f472b6',
    nav: 'Seating',
    eyebrow: 'Logical reasoning',
    title: 'Eight people, one round table',
    text: 'Clue by clue, each person takes a seat. Arrangements, puzzles and rankings become pictures you can check, not guesses.',
    topics: ['seating-arrangement', 'puzzles', 'order-ranking', 'blood-relations'],
    simulation: 'seating-clues',
    teaser: {
      question: 'Eight people sit round a table. In how many different ways can they be seated?',
      answer: '5040. Fix one person to remove the rotations; the other seven can sit in 7! = 5040 ways.'
    }
  },
  {
    id: 'data',
    side: 'right',
    color: '#fbbf24',
    nav: 'Data',
    eyebrow: 'Data interpretation',
    title: 'Charts that build themselves',
    text: 'Bars rise, slices pull apart, and the question is answered before the calculator comes out. Bar, pie, line, tables and caselets.',
    topics: ['di-bar-graphs', 'di-pie-charts', 'di-line-graphs', 'di-tables', 'di-caselet'],
    simulation: 'di-pie-charts',
    teaser: {
      question: 'A slice is 32% of a pie chart. What angle does it make at the centre?',
      answer: '115.2°. 32% of 360° = 0.32 × 360 = 115.2°.'
    }
  },
  {
    id: 'clock',
    side: 'left',
    color: '#a78bfa',
    nav: 'Clocks',
    eyebrow: 'Clocks and calendars',
    title: 'The hands tell you the angle',
    text: 'The angle between the hands is |30H − 5.5M|. Watch it change as the minutes run, and the formula stops being something to memorise.',
    topics: ['clocks', 'calendars', 'problems-on-ages'],
    simulation: 'clock-angle',
    teaser: {
      question: 'What is the angle between the hands of a clock at 3:40?',
      answer: '130°. |30 × 3 − 5.5 × 40| = |90 − 220| = 130°.'
    }
  },
  {
    id: 'money',
    side: 'right',
    color: '#fb923c',
    nav: 'Money',
    eyebrow: 'Interest, profit and taxes',
    title: 'Money that grows on money',
    text: 'Simple interest adds the same coins every year; compound interest adds coins on the coins. Two stacks, side by side.',
    topics: ['simple-interest', 'compound-interest', 'profit-loss-discount', 'taxes-commission'],
    simulation: 'ci-vs-si',
    teaser: {
      question: '₹10,000 at 10% a year for 2 years. How much more does compound interest earn than simple interest?',
      answer: '₹100. Over two years the difference is P × (r/100)² = 10,000 × 0.01 = ₹100.'
    }
  },
  {
    id: 'logic',
    side: 'left',
    color: '#34d399',
    nav: 'Logic',
    eyebrow: 'Sets, syllogisms and cubes',
    title: 'Logic you can turn over in your hand',
    text: 'Venn diagrams that overlap in front of you and a die that tumbles. Syllogisms, sets and cube questions, seen from every side.',
    topics: ['syllogism', 'venn-diagrams', 'cubes-dice', 'logical-sets'],
    simulation: 'syllogism-venn',
    teaser: {
      question: "All doctors are singers. Some singers are runners. Does it follow that some doctors are runners?",
      answer: "No. The runners among the singers may all sit outside the doctors' circle. Draw the Venn diagram and it shows at once."
    }
  },
  { id: 'finale', side: 'center', color: '#7c8cff' }
];

export const FINAL_STATION = STATIONS.length - 1;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Where on the journey (a fractional station index) a scroll position is.
 * `anchors[i]` is the scroll offset at which station i is centred; anchors are
 * increasing. Before the first anchor the journey is at 0, after the last it
 * stays at the last station.
 */
export function progressFromScroll(scroll, anchors) {
  if (!anchors.length) return 0;
  if (scroll <= anchors[0]) return 0;
  for (let i = 1; i < anchors.length; i++) {
    if (scroll <= anchors[i]) {
      const span = anchors[i] - anchors[i - 1];
      return i - 1 + (span > 0 ? (scroll - anchors[i - 1]) / span : 1);
    }
  }
  return anchors.length - 1;
}

/** How close the journey is to a station: 1 when centred on it, 0 one station away. */
export const focusOf = (progress, index) => clamp(1 - Math.abs(progress - index), 0, 1);

/** Smoothstep easing: slow near the stations, quick between them. */
export const ease = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/* ---------------- first visit ---------------- */

export const isWelcomed = () => readJSON(WELCOMED_KEY, false) === true;
export const markWelcomed = () => writeJSON(WELCOMED_KEY, true);

/**
 * The landing page greets a first visit to the home address. Anyone who has
 * gone past it, or who already has progress saved, goes straight to the dashboard.
 */
export function shouldShowLanding(progress) {
  if (isWelcomed()) return false;
  const answered = progress?.stats?.questionsAnswered || 0;
  const xp = progress?.xp?.total || 0;
  const levels = Object.keys(progress?.levels || {}).length;
  return answered === 0 && xp === 0 && levels === 0;
}
