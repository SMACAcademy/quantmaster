/**
 * Mock-test patterns: the shape of a real exam's quantitative section, so a
 * learner can practise under the same clock and marking.
 *
 *   minutes      the section's time limit
 *   marks        { correct, wrong } per question; `typedNoNegative` means a
 *                typed (numeric) answer loses nothing when wrong, as in CAT
 *   blueprint    sections in paper order: { label, topics, count, difficulties }
 *
 * Question counts, timings and marking follow the published patterns of each
 * exam's quantitative section. Topics are the app's own; a test checks they exist.
 */

const ARITHMETIC = [
  'percentages',
  'profit-loss-discount',
  'simple-interest',
  'compound-interest',
  'ratio-proportion',
  'averages',
  'mixtures-alligation',
  'partnership',
  'time-and-work',
  'pipes-cisterns',
  'time-speed-distance',
  'trains',
  'boats-streams',
  'problems-on-ages'
];
const DI = ['di-tables', 'di-bar-graphs', 'di-line-graphs', 'di-pie-charts', 'di-caselet', 'di-mixed-radar'];

export const MOCK_PATTERNS = [
  {
    id: 'bank-prelims',
    name: 'IBPS / SBI Prelims',
    exam: 'Bank PO and clerk prelims: Quantitative Aptitude',
    description: '35 questions in 20 minutes. Speed matters most: simplification, comparison, series, data and arithmetic.',
    minutes: 20,
    marks: { correct: 1, wrong: -0.25 },
    blueprint: [
      { label: 'Simplification and approximation', topics: ['simplification', 'approximation'], count: 5, difficulties: ['easy', 'medium'] },
      { label: 'Quadratic comparison', topics: ['quadratic-comparison'], count: 5, difficulties: ['easy', 'medium', 'complex'] },
      { label: 'Number series', topics: ['sequences'], count: 5, difficulties: ['easy', 'medium'] },
      { label: 'Data interpretation', topics: DI, count: 10, difficulties: ['easy', 'medium'] },
      { label: 'Arithmetic', topics: ARITHMETIC, count: 10, difficulties: ['easy', 'medium'] }
    ]
  },
  {
    id: 'ssc-cgl',
    name: 'SSC CGL Tier 1',
    exam: 'SSC CGL Tier 1: Quantitative Aptitude section',
    description: '25 questions, 2 marks each, in about 15 minutes (the paper allows 60 minutes for four sections). Arithmetic, algebra, geometry, mensuration and trigonometry.',
    minutes: 15,
    marks: { correct: 2, wrong: -0.5 },
    blueprint: [
      { label: 'Arithmetic', topics: ARITHMETIC, count: 9, difficulties: ['easy', 'medium'] },
      { label: 'Algebra', topics: ['algebraic-identities', 'linear-equations', 'simultaneous-equations', 'surds-indices'], count: 4, difficulties: ['easy', 'medium', 'complex'] },
      { label: 'Geometry', topics: ['triangles', 'circles', 'quadrilaterals', 'polygons', 'coordinate-geometry'], count: 4, difficulties: ['easy', 'medium'] },
      { label: 'Mensuration', topics: ['perimeter-area', 'mensuration-2d', 'mensuration-3d'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Trigonometry', topics: ['trigonometry', 'heights-distances'], count: 3, difficulties: ['easy', 'medium', 'complex'] },
      { label: 'Data and statistics', topics: ['di-pie-charts', 'di-bar-graphs', 'mean-median-mode'], count: 2, difficulties: ['easy', 'medium'] }
    ]
  },
  {
    id: 'cat-qa',
    name: 'CAT Quantitative Ability',
    exam: 'CAT: Quantitative Ability section',
    description: '22 questions in 40 minutes. +3 for a right answer, −1 for a wrong choice, nothing lost on a wrong typed answer. Fewer, harder questions: choose well.',
    minutes: 40,
    marks: { correct: 3, wrong: -1, typedNoNegative: true },
    blueprint: [
      { label: 'Arithmetic', topics: ARITHMETIC, count: 8, difficulties: ['medium', 'complex'] },
      { label: 'Algebra', topics: ['quadratic-equations', 'inequalities', 'logarithms', 'functions-graphs', 'arithmetic-progression', 'geometric-progression'], count: 6, difficulties: ['medium', 'complex'] },
      { label: 'Geometry and mensuration', topics: ['triangles', 'circles', 'coordinate-geometry', 'mensuration-2d', 'mensuration-3d'], count: 4, difficulties: ['medium', 'complex'] },
      { label: 'Number system', topics: ['number-system', 'factors-multiples', 'hcf-lcm'], count: 2, difficulties: ['medium', 'complex'] },
      { label: 'Modern maths', topics: ['permutations', 'combinations', 'probability', 'set-theory'], count: 2, difficulties: ['medium', 'complex'] }
    ]
  },
  {
    id: 'campus',
    name: 'Campus placement aptitude',
    exam: 'Typical campus recruitment test: quantitative section',
    description: '20 questions in 25 minutes, no negative marking. Attempt everything.',
    minutes: 25,
    marks: { correct: 1, wrong: 0 },
    blueprint: [
      { label: 'Arithmetic', topics: ARITHMETIC, count: 10, difficulties: ['easy', 'medium'] },
      { label: 'Numbers', topics: ['number-system', 'hcf-lcm', 'divisibility'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Counting and probability', topics: ['permutations', 'combinations', 'probability'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Series and data', topics: ['sequences', 'di-tables', 'di-bar-graphs'], count: 4, difficulties: ['easy', 'medium'] }
    ]
  }
];

export const getPattern = (id) => MOCK_PATTERNS.find((pattern) => pattern.id === id) || null;
export const questionCount = (pattern) => pattern.blueprint.reduce((sum, section) => sum + section.count, 0);
export const maxScore = (pattern) => questionCount(pattern) * pattern.marks.correct;
