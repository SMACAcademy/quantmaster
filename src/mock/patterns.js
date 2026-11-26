/**
 * Mock-test patterns: the shape of a real exam's quantitative or reasoning
 * section, so a learner can practise under the same clock and marking.
 *
 *   minutes      the section's time limit
 *   marks        { correct, wrong } per question; `typedNoNegative` means a
 *                typed (numeric) answer loses nothing when wrong, as in CAT
 *   blueprint    sections in paper order: { label, topics, count, difficulties }
 *   subject      'quant' or 'reasoning', for grouping on the mock-test page
 *
 * Question counts, timings and marking follow the published patterns of each
 * exam's quantitative or reasoning section. Topics are the app's own; a test checks they exist.
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
// SSC and bank clerk papers also set GST, sales tax and commission; CAT and campus tests rarely do.
const ARITHMETIC_WITH_TAXES = [...ARITHMETIC, 'taxes-commission'];
const REASONING_PUZZLES = ['seating-arrangement', 'puzzles'];
const DI = ['di-tables', 'di-bar-graphs', 'di-line-graphs', 'di-pie-charts', 'di-caselet', 'di-mixed-radar'];

export const MOCK_PATTERNS = [
  {
    id: 'bank-prelims',
    subject: 'quant',
    name: 'IBPS / SBI Prelims',
    exam: 'Bank PO and clerk prelims: Quantitative Aptitude',
    description: '35 questions in 20 minutes. Speed matters most: simplification, comparison, series, data and arithmetic.',
    minutes: 20,
    marks: { correct: 1, wrong: -0.25 },
    blueprint: [
      { label: 'Simplification and approximation', topics: ['simplification', 'approximation', 'speed-maths', 'squares-cubes-roots'], count: 5, difficulties: ['easy', 'medium'] },
      { label: 'Quadratic comparison', topics: ['quadratic-comparison'], count: 5, difficulties: ['easy', 'medium', 'complex'] },
      { label: 'Number series', topics: ['sequences'], count: 5, difficulties: ['easy', 'medium'] },
      { label: 'Data interpretation', topics: DI, count: 10, difficulties: ['easy', 'medium'] },
      { label: 'Arithmetic', topics: ARITHMETIC_WITH_TAXES, count: 10, difficulties: ['easy', 'medium'] }
    ]
  },
  {
    id: 'ssc-cgl',
    subject: 'quant',
    name: 'SSC CGL Tier 1',
    exam: 'SSC CGL Tier 1: Quantitative Aptitude section',
    description: '25 questions, 2 marks each, in about 15 minutes (the paper allows 60 minutes for four sections). Arithmetic, algebra, geometry, mensuration and trigonometry.',
    minutes: 15,
    marks: { correct: 2, wrong: -0.5 },
    blueprint: [
      { label: 'Arithmetic', topics: ARITHMETIC_WITH_TAXES, count: 9, difficulties: ['easy', 'medium'] },
      { label: 'Algebra', topics: ['algebraic-identities', 'linear-equations', 'simultaneous-equations', 'surds-indices'], count: 4, difficulties: ['easy', 'medium', 'complex'] },
      { label: 'Geometry', topics: ['triangles', 'circles', 'quadrilaterals', 'polygons', 'coordinate-geometry'], count: 4, difficulties: ['easy', 'medium'] },
      { label: 'Mensuration', topics: ['perimeter-area', 'mensuration-2d', 'mensuration-3d'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Trigonometry', topics: ['trigonometry', 'heights-distances'], count: 3, difficulties: ['easy', 'medium', 'complex'] },
      { label: 'Data and statistics', topics: ['di-pie-charts', 'di-bar-graphs', 'mean-median-mode', 'grouped-data'], count: 2, difficulties: ['easy', 'medium'] }
    ]
  },
  {
    id: 'cat-qa',
    subject: 'quant',
    name: 'CAT Quantitative Ability',
    exam: 'CAT: Quantitative Ability section',
    description: '22 questions in 40 minutes. +3 for a right answer, −1 for a wrong choice, nothing lost on a wrong typed answer. Fewer, harder questions: choose well.',
    minutes: 40,
    marks: { correct: 3, wrong: -1, typedNoNegative: true },
    blueprint: [
      { label: 'Arithmetic', topics: ARITHMETIC, count: 8, difficulties: ['medium', 'complex'] },
      { label: 'Algebra', topics: ['quadratic-equations', 'inequalities', 'modulus', 'polynomials', 'logarithms', 'functions-graphs', 'arithmetic-progression', 'geometric-progression'], count: 6, difficulties: ['medium', 'complex'] },
      { label: 'Geometry and mensuration', topics: ['triangles', 'circles', 'coordinate-geometry', 'mensuration-2d', 'mensuration-3d'], count: 4, difficulties: ['medium', 'complex'] },
      { label: 'Number system', topics: ['number-system', 'factors-multiples', 'hcf-lcm', 'remainders', 'factorials', 'integer-solutions'], count: 2, difficulties: ['medium', 'complex'] },
      { label: 'Modern maths', topics: ['permutations', 'combinations', 'probability', 'set-theory'], count: 2, difficulties: ['medium', 'complex'] }
    ]
  },
  {
    id: 'campus',
    subject: 'quant',
    name: 'Campus placement aptitude',
    exam: 'Typical campus recruitment test: quantitative section',
    description: '20 questions in 25 minutes, no negative marking. Attempt everything.',
    minutes: 25,
    marks: { correct: 1, wrong: 0 },
    blueprint: [
      { label: 'Arithmetic', topics: ARITHMETIC, count: 10, difficulties: ['easy', 'medium'] },
      { label: 'Numbers', topics: ['number-system', 'hcf-lcm', 'divisibility', 'remainders', 'cryptarithmetic'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Counting and probability', topics: ['permutations', 'combinations', 'probability'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Series and data', topics: ['sequences', 'di-tables', 'di-bar-graphs'], count: 4, difficulties: ['easy', 'medium'] }
    ]
  },
  {
    id: 'bank-prelims-reasoning',
    subject: 'reasoning',
    name: 'IBPS / SBI Prelims: Reasoning',
    exam: 'Bank PO and clerk prelims: Reasoning Ability',
    description: '35 questions in 20 minutes. Puzzles and seating carry the section; syllogism, inequalities, blood relations and coding are the quick marks.',
    minutes: 20,
    marks: { correct: 1, wrong: -0.25 },
    blueprint: [
      { label: 'Puzzles and seating arrangement', topics: REASONING_PUZZLES, count: 15, difficulties: ['easy', 'medium', 'complex'] },
      { label: 'Syllogism', topics: ['syllogism'], count: 5, difficulties: ['easy', 'medium'] },
      { label: 'Inequalities', topics: ['reasoning-inequalities'], count: 5, difficulties: ['easy', 'medium'] },
      { label: 'Blood relations and directions', topics: ['blood-relations', 'direction-sense'], count: 4, difficulties: ['easy', 'medium'] },
      { label: 'Coding and ranking', topics: ['coding-decoding', 'order-ranking'], count: 6, difficulties: ['easy', 'medium'] }
    ]
  },
  {
    id: 'ssc-cgl-reasoning',
    subject: 'reasoning',
    name: 'SSC CGL Tier 1: Reasoning',
    exam: 'SSC CGL Tier 1: General Intelligence and Reasoning section',
    description: '25 questions, 2 marks each, in about 15 minutes. Coding, relations, directions, ranking, syllogism, Venn diagrams, cubes and mirror images.',
    minutes: 15,
    marks: { correct: 2, wrong: -0.5 },
    blueprint: [
      { label: 'Coding-decoding', topics: ['coding-decoding'], count: 4, difficulties: ['easy', 'medium'] },
      { label: 'Order and ranking', topics: ['order-ranking'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Blood relations', topics: ['blood-relations'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Direction sense', topics: ['direction-sense'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Syllogism and Venn diagrams', topics: ['syllogism', 'venn-diagrams'], count: 4, difficulties: ['easy', 'medium'] },
      { label: 'Cubes and dice', topics: ['cubes-dice'], count: 4, difficulties: ['easy', 'medium'] },
      { label: 'Mirror images and paper folding', topics: ['mirror-paper-folding'], count: 4, difficulties: ['easy', 'medium'] }
    ]
  },
  {
    id: 'campus-reasoning',
    subject: 'reasoning',
    name: 'Campus placement: Logical reasoning',
    exam: 'Typical campus recruitment test: logical reasoning section',
    description: '15 questions in 20 minutes, no negative marking. Arrangements, coding, relations and syllogism.',
    minutes: 20,
    marks: { correct: 1, wrong: 0 },
    blueprint: [
      { label: 'Seating and puzzles', topics: REASONING_PUZZLES, count: 5, difficulties: ['easy', 'medium'] },
      { label: 'Coding-decoding', topics: ['coding-decoding'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Blood relations and directions', topics: ['blood-relations', 'direction-sense'], count: 3, difficulties: ['easy', 'medium'] },
      { label: 'Syllogism and ranking', topics: ['syllogism', 'order-ranking'], count: 4, difficulties: ['easy', 'medium'] }
    ]
  }
];

export const getPattern = (id) => MOCK_PATTERNS.find((pattern) => pattern.id === id) || null;
export const questionCount = (pattern) => pattern.blueprint.reduce((sum, section) => sum + section.count, 0);
export const maxScore = (pattern) => questionCount(pattern) * pattern.marks.correct;
