/**
 * What the app needs to list simulations without loading them: id, topic,
 * title, summary and challenge ids. `alsoTopicIds` lists other topics whose
 * pages should show it too (the Explore page lists it once, under its own topic). The models themselves (index.js) load
 * only when a simulation is opened. tests/simulations.test.js fails if this
 * list falls out of step with index.js.
 */

export const SIMULATION_META = [
  {
    id: 'successive-change',
    topicId: 'percentages',
    title: 'Two percentage changes in a row',
    summary: 'Why up 10% then down 10% does not bring you back to where you started.',
    taskIds: ['cancel', 'equal-rises', 'up-down']
  },
  {
    id: 'markup-discount',
    topicId: 'profit-loss-discount',
    title: 'Mark up, then discount',
    summary: 'How far can a shop cut the marked price before it starts losing money?',
    taskIds: ['break-even', 'generous', 'equal']
  },
  {
    id: 'ci-vs-si',
    topicId: 'compound-interest',
    alsoTopicIds: ['simple-interest'],
    title: 'Compound vs simple interest',
    summary: 'Watch interest earn interest: the gap between the two curves grows every year.',
    taskIds: ['double', 'half-again', 'two-years']
  },
  {
    id: 'alligation-seesaw',
    topicId: 'mixtures-alligation',
    alsoTopicIds: ['weighted-average', 'weighted-mean'],
    title: 'The alligation seesaw',
    summary: 'A mixture balances like a seesaw: the bigger quantity pulls the balance point towards itself.',
    taskIds: ['thirty', 'equal-amounts']
  },
  {
    id: 'proportion-curves',
    topicId: 'direct-inverse-proportion',
    alsoTopicIds: ['ratio-proportion'],
    title: 'Direct or inverse?',
    summary: 'Double x and see what happens to y: a straight line through zero, or a curve that never touches the axes.',
    taskIds: ['inverse-six', 'direct-twenty', 'halve']
  },
  {
    id: 'work-together',
    topicId: 'time-and-work',
    alsoTopicIds: ['work-and-wages'],
    title: 'Working together',
    summary: 'Add up what each worker does in a day, not the days: see why the LCM method works.',
    taskIds: ['six-days', 'half', 'three']
  },
  {
    id: 'tank-filling',
    topicId: 'pipes-cisterns',
    title: 'Filling a tank',
    summary: 'Open inlets and a drain, and watch the water level at any minute.',
    taskIds: ['twelve', 'never', 'half']
  },
  {
    id: 'tsd-meeting',
    topicId: 'time-speed-distance',
    alsoTopicIds: ['races'],
    title: 'When do two travellers meet?',
    summary: 'A distance–time graph of two travellers: where the lines cross, they meet.',
    taskIds: ['halfway', 'three-hours', 'catch-up']
  },
  {
    id: 'train-crossing',
    topicId: 'trains',
    title: 'What a crossing really covers',
    summary: 'Draw the train to scale against a pole, a platform or another train, and see the distance it must cover.',
    taskIds: ['pole', 'twice', 'overtake']
  },
  {
    id: 'boats-streams',
    topicId: 'boats-streams',
    title: 'Rowing with and against the stream',
    summary: 'A current helps one way and hurts the other. See why the round trip always takes longer.',
    taskIds: ['twice', 'fastest', 'stuck']
  },
  {
    id: 'clock-angle',
    topicId: 'clocks',
    title: 'The angle between the hands',
    summary: 'Set any time and see why the hour hand is never exactly on the hour.',
    taskIds: ['right-angle', 'straight', 'nearly-together']
  },
  {
    id: 'quadratic-roots',
    topicId: 'quadratic-equations',
    alsoTopicIds: ['quadratic-comparison'],
    title: 'Shape a parabola',
    summary: 'Change a, b and c and watch the roots, the vertex and the discriminant move together.',
    taskIds: ['touch', 'none', 'two-three', 'frown']
  },
  {
    id: 'two-lines',
    topicId: 'simultaneous-equations',
    alsoTopicIds: ['linear-equations'],
    title: 'Two equations, two lines',
    summary: 'The solution of a pair of equations is where their lines cross, and parallel lines never do.',
    taskIds: ['meet', 'parallel', 'same']
  },
  {
    id: 'inequality-line',
    topicId: 'inequalities',
    title: 'Solve and shade an inequality',
    summary: 'Solve ax + b against c step by step, and watch the sign flip when you divide by a negative.',
    taskIds: ['flip', 'closed', 'everything']
  },
  {
    id: 'ap-pairing',
    topicId: 'arithmetic-progression',
    title: 'Why an AP sum is n(first + last) ÷ 2',
    summary: 'Stack the series on itself reversed: every column is first + last, so the sum is half of n columns.',
    taskIds: ['gauss', 'odd', 'twenty']
  },
  {
    id: 'ap-vs-gp',
    topicId: 'geometric-progression',
    title: 'Adding vs multiplying',
    summary: 'An AP adds the same amount each time; a GP multiplies. Watch which one wins, and how a GP with r < 1 settles.',
    taskIds: ['overtake', 'settle']
  },
  {
    id: 'log-curves',
    topicId: 'logarithms',
    title: 'Powers and logarithms are mirror images',
    summary: 'y = bˣ and y = log_b x reflect in the line y = x. A logarithm answers "what power?".',
    taskIds: ['three', 'half', 'negative']
  },
  {
    id: 'triangle-angles',
    topicId: 'triangles',
    title: 'Angles of a triangle',
    summary: 'Choose two angles and the third is fixed: they always add to 180°. Watch the shape and its type change.',
    taskIds: ['equilateral', 'right', 'isosceles-obtuse']
  },
  {
    id: 'circle-angles',
    topicId: 'circles',
    title: 'The angle at the centre is twice the angle at the edge',
    summary: 'Move the point P around the circle: the angle it makes with A and B never changes, until P crosses to the other arc.',
    taskIds: ['semicircle', 'thirty', 'other-arc']
  },
  {
    id: 'polygon-angles',
    topicId: 'polygons',
    title: 'Angles of a regular polygon',
    summary: 'Add sides and watch the interior angles open up while the exterior angles always total 360°.',
    taskIds: ['one-forty', 'twenty', 'twenty-four']
  },
  {
    id: 'solid-volumes',
    topicId: 'mensuration-3d',
    title: 'Cone, sphere and cylinder',
    summary: 'Compare the volumes of a cone, a sphere and a cylinder with the same radius, and discover the 1 : 2 : 3.',
    taskIds: ['archimedes', 'sphere-cylinder', 'sphere-cone']
  },
  {
    id: 'trig-triangle',
    topicId: 'trigonometry',
    title: 'Sine, cosine and tangent in a triangle',
    summary: 'Turn the angle and watch the sides change. The ratios depend only on the angle, never on the size.',
    taskIds: ['equal', 'root-three', 'half']
  },
  {
    id: 'heights-observer',
    topicId: 'heights-distances',
    title: 'How tall is the tower?',
    summary: 'Stand somewhere, look up at the top, and the angle and the distance tell you the height.',
    taskIds: ['equal', 'thirty-sixty', 'hundred']
  },
  {
    id: 'probability-trials',
    topicId: 'probability',
    title: 'Probability in the long run',
    summary: 'Run an experiment many times and watch the share of successes settle at the theory.',
    taskIds: ['settle', 'mislead']
  },
  {
    id: 'mean-median-mode',
    topicId: 'mean-median-mode',
    alsoTopicIds: ['averages'],
    title: 'Mean, median and mode',
    summary: 'Drag five values and see which average reacts to an extreme value and which one holds steady.',
    taskIds: ['pull', 'mode', 'balance']
  },
  {
    id: 'spread-transform',
    topicId: 'dispersion',
    title: 'What moves the spread?',
    summary: 'Add a constant, multiply by a constant, or add an extreme value, and see what happens to the mean and the standard deviation.',
    taskIds: ['double', 'shift', 'outlier']
  },
  // --- numbers.js (Phase F): add entries below this line, in the same order as numberSims ---
  {
    id: 'ratio-bar-model',
    topicId: 'ratio-proportion',
    title: 'Split a total in a ratio',
    summary: 'Draw every share as equal blocks: find what one block is worth, and each share follows.',
    taskIds: ['b-600', 'four-hundred-more', 'hundred-a-block']
  },
  {
    id: 'partnership-shares',
    topicId: 'partnership',
    title: 'Profit by capital × months',
    summary: 'Each partner is a rectangle: capital up, months across. The profit splits in the ratio of the areas.',
    taskIds: ['equal', 'twice', 'small-but-biggest']
  },
  {
    id: 'hcf-tiles',
    topicId: 'hcf-lcm',
    title: 'The largest square tile',
    summary: 'Tile a rectangle with equal squares and no gaps. The biggest square that fits both sides is the HCF.',
    taskIds: ['seven', 'six-tiles', 'only-ones', 'four-times']
  },
  {
    id: 'lcm-bells',
    topicId: 'hcf-lcm',
    title: 'When do the bells ring together?',
    summary: 'Bells ring every few seconds. They all ring together again only at a common multiple, first at the LCM.',
    taskIds: ['sixty', 'product', 'third']
  },
  {
    id: 'ages-timeline',
    topicId: 'problems-on-ages',
    title: 'Two ages on a timeline',
    summary: 'Both ages rise one year per year: the lines are parallel, so the gap never changes, but the ratio does.',
    taskIds: ['twice', 'five-times-ago', 'three-then-two']
  },
  {
    id: 'calendar-odd-days',
    topicId: 'calendars',
    title: 'Odd days move the weekday',
    summary: 'Step a date forward some years: each year adds 1 odd day, a 29 February adds another, and only the leftover after whole weeks counts.',
    taskIds: ['six-years', 'jump-two', 'century', 'not-28']
  },
  {
    id: 'fraction-bars',
    topicId: 'fractions',
    title: 'Fractions as bars',
    summary: 'Cut two bars into equal parts. To compare, add or subtract, cut both into the same number of parts first.',
    taskIds: ['equal', 'make-one', 'twelfth', 'smaller-top']
  },
  // --- end of numbers.js ---
  // --- patterns.js (Phase F): add entries below this line, in the same order as patternSims ---
  {
    id: 'identity-area',
    topicId: 'algebraic-identities',
    title: 'Identities you can see',
    summary: 'Cut a square into pieces and the identities appear: (a + b)², (a − b)² and a² − b² as areas.',
    taskIds: ['hundred', 'balance', 'tiny', 'thirty-three']
  },
  {
    id: 'line-explorer',
    topicId: 'coordinate-geometry',
    title: 'A line through two points',
    summary: 'Move A and B and watch the slope, the equation, the distance AB and the midpoint change together.',
    taskIds: ['flat', 'five', 'two-x-plus-one', 'origin']
  },
  {
    id: 'function-shift',
    topicId: 'functions-graphs',
    title: 'Shift, stretch and flip a graph',
    summary: 'y = a·f(x − h) + k: h slides the graph sideways, k lifts it, and a stretches or flips it.',
    taskIds: ['vertex', 'peak', 'root']
  },
  {
    id: 'venn-explorer',
    topicId: 'venn-diagrams',
    alsoTopicIds: ['set-theory'],
    title: 'Fill a Venn diagram',
    summary: 'Set the sizes of U, A, B and the overlap, and see "only A", "only B", "both" and "neither" fall into place.',
    taskIds: ['disjoint', 'inside', 'everyone', 'least']
  },
  {
    id: 'counting-slots',
    topicId: 'permutations',
    alsoTopicIds: ['counting-principle'],
    title: 'Fill the slots',
    summary: 'Count arrangements slot by slot: multiply the choices for each slot, with or without repeats.',
    taskIds: ['shelf', 'pin', 'seven-twenty', 'run-out']
  },
  {
    id: 'pascal-ncr',
    topicId: 'combinations',
    title: 'Pascal’s triangle and ⁿCᵣ',
    summary: 'Every entry of Pascal’s triangle is an ⁿCᵣ: see its mirror image, its two parents and its row total.',
    taskIds: ['mirror', 'twenty', 'parents', 'row-total']
  },
  {
    id: 'sequence-differences',
    topicId: 'sequences',
    title: 'Differences reveal the rule',
    summary: 'Build a sequence and take differences, then differences of differences, or ratios, until something stays constant.',
    taskIds: ['thirty', 'squares', 'fibonacci', 'self']
  },
  // --- end of patterns.js ---
  // --- numberSense.js (Phase G): add entries below this line, in the same order as numberSenseSims ---
  {
    id: 'prime-sieve',
    topicId: 'number-system',
    alsoTopicIds: ['factors-multiples'],
    title: 'The sieve of Eratosthenes',
    summary: 'Cross out the multiples of each prime in turn. Whatever survives is prime, and the sieve can stop at the square root.',
    taskIds: ['fifty', 'idle', 'lone-survivor']
  },
  {
    id: 'divisibility-checker',
    topicId: 'divisibility',
    title: 'Divisibility tests at work',
    summary: 'Build a five-digit number and pick a divisor. See which digits the test reads, and check its verdict against the real remainder.',
    taskIds: ['nine-not-six', 'eleven-zero', 'eleven-eleven', 'four-not-eight']
  },
  {
    id: 'factor-pairs',
    topicId: 'factors-multiples',
    alsoTopicIds: ['number-system'],
    title: 'Factor pairs as rectangles',
    summary: 'Every way to arrange N squares in a rectangle is a factor pair. Count the rectangles and you count the factors.',
    taskIds: ['three', 'twelve', 'strip', 'nine']
  },
  {
    id: 'decimal-zoom',
    topicId: 'decimals',
    title: 'Zoom into a decimal',
    summary: 'Each zoom cuts one gap of the number line into ten: tenths, then hundredths, then thousandths. Two decimals part at the first place their digits differ.',
    taskIds: ['part', 'longer-smaller', 'thousandth-apart', 'same-hundredth']
  },
  // --- end of numberSense.js ---
  // --- basics.js (Phase G): add entries below this line, in the same order as basicsSims ---
  {
    id: 'index-laws',
    topicId: 'surds-indices',
    title: 'The laws of indices, factor by factor',
    summary: 'Write powers out as rows of factors: multiplying joins them, dividing cancels them, and a power of a power repeats them.',
    taskIds: ['equal-one', 'sixty-four', 'one-eighth', 'agree']
  },
  {
    id: 'unit-ladder',
    topicId: 'unit-conversions',
    alsoTopicIds: ['time-speed-distance'],
    title: 'The unit ladder',
    summary: 'Step a length up or down the metric ladder, × 10 or ÷ 10 a step, and turn km/h into m/s through 1 km = 1000 m and 1 h = 3600 s.',
    taskIds: ['thousand', 'one', 'tiny', 'seventy-two', 'ten-ms']
  },
  {
    id: 'algebra-tiles',
    topicId: 'algebraic-expressions',
    title: 'Algebra tiles: add two expressions',
    summary: 'Lay out two expressions as x², x and 1 tiles. Like tiles group together, and a tile and its negative cancel as a zero pair.',
    taskIds: ['cancel-x', 'x-squared-plus-one', 'zero', 'four-pairs']
  },
  // --- end of basics.js ---
  {
    id: 'di-bar-graphs',
    topicId: 'di-bar-graphs',
    title: 'Comparing two bars',
    summary: 'Set the bars, pick two years, and read the ratio, the difference and the % change. A bar twice as tall is +100%, not +200%.',
    taskIds: ['double', 'quarter', 'same-gap']
  },
  {
    id: 'di-line-graphs',
    topicId: 'di-line-graphs',
    title: 'The biggest rise or the fastest growth?',
    summary: 'Slide a window over eight years of a line graph. The year with the largest rise and the year with the largest % rise are often not the same.',
    taskIds: ['same', 'opposite', 'double']
  },
  {
    id: 'di-pie-charts',
    topicId: 'di-pie-charts',
    title: 'Angles, percentages and amounts in a pie',
    summary: 'Resize the slices of a monthly budget and set the total. Every 1% of a pie is 3.6°, and a slice is worth total × angle ÷ 360°.',
    taskIds: ['right-angle', 'amount', 'savings']
  },
  {
    id: 'di-tables',
    topicId: 'di-tables',
    title: 'Percentage points or per cent?',
    summary: 'Pick a base year and the table colours each cell by its change. A share going from 20% to 25% is up 5 percentage points, which is a 25% rise.',
    taskIds: ['points', 'flat', 'same']
  },
  {
    id: 'data-sufficiency',
    topicId: 'data-sufficiency',
    title: 'Is it enough? Watch the answers shrink',
    summary: 'Switch each statement on and watch the set of possible answers shrink. The data is sufficient only when exactly one value is left.',
    taskIds: ['two-roots', 'together', 'each', 'never']
  },
  // --- end of dataInterpretation.js ---
];

const byId = new Map(SIMULATION_META.map((meta) => [meta.id, meta]));

export const getSimulationMeta = (id) => byId.get(id) || null;
/** Simulations for a topic page: those that belong to it, then those that also suit it (`alsoTopicIds`). */
export const simulationMetaForTopic = (topicId) => [
  ...SIMULATION_META.filter((meta) => meta.topicId === topicId),
  ...SIMULATION_META.filter((meta) => (meta.alsoTopicIds || []).includes(topicId))
];

/** Load the models and the drawing code (a separate chunk). */
export function loadSimulationKit() {
  return Promise.all([import('./index.js'), import('../components/Simulation.js')]).then(([models, ui]) => ({
    getSimulation: models.getSimulation,
    simulationPanel: ui.simulationPanel
  }));
}
