/**
 * Exam-technique cards: ways to reach or check an answer faster that work
 * across topics. Shown on the "Strategy" quick sheet.
 *
 * Each card has a worked example, and `check()` recomputes it;
 * tests/traps.test.js runs every check, so no example can be wrong.
 */

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const digitRoot = (n) => {
  let x = Math.abs(n);
  while (x >= 10) x = String(x).split('').reduce((s, d) => s + Number(d), 0);
  return x === 9 ? 0 : x;
};

export const STRATEGIES = [
  {
    id: 'unit-digit',
    title: 'Check the last digit',
    rule: 'Before multiplying in full, work out only the last digit of the answer. Options with the wrong last digit are out.',
    example: '347 × 268: 7 × 8 = 56 ends in 6. Of 92,996, 92,994, 92,998 and 93,002, only 92,996 can be right.',
    whenNot: 'Two or more options share the same last digit: then check the size, or the digit sum.',
    check: () => 347 * 268 === 92996 && [92994, 92998, 93002].every((n) => n % 10 !== 6)
  },
  {
    id: 'digit-sum',
    title: 'Check with digit sums',
    rule: 'Replace each number by its digit sum (repeat until one digit; 9 counts as 0). The digit sums obey the same multiplication and addition as the numbers.',
    example: '4,368 × 27 = 117,936? Digit sums: 4,368 → 3 and 27 → 0, so the product → 0. 117,936 → 27 → 0. Consistent.',
    whenNot: 'It cannot catch two swapped digits (117,963 has the same digit sum), so use it to rule options out, not to prove one right.',
    check: () => 4368 * 27 === 117936 && digitRoot(4368) === 3 && digitRoot(27) === 0 && digitRoot(117936) === 0 && digitRoot(117963) === 0
  },
  {
    id: 'approximate',
    title: 'Estimate first',
    rule: 'Round the numbers to friendly values and estimate. When the options are far apart, the estimate picks the answer.',
    example: '49.8% of 6,012 is about half of 6,000 = 3,000. Of 2,994, 3,604 and 2,406, it must be 2,994 (exactly 2,993.98).',
    whenNot: 'The options are close together, say within 2% of each other: then calculate.',
    check: () => near(0.498 * 6012, 2993.976, 1e-6) && Math.abs(2994 - 3000) < Math.abs(2406 - 3000)
  },
  {
    id: 'plug-options',
    title: 'Work backwards from the options',
    rule: 'When setting up the equation is slow, try the options in the question. Start with the middle one: if it is too big or too small, you know which way to go.',
    example: 'A number rises 20% and then falls 20%, giving 960. Try 1,000: 1,000 → 1,200 → 960. Done.',
    whenNot: 'The options are expressions in x, or there are many steps to check: then solve directly.',
    check: () => near(1000 * 1.2 * 0.8, 960)
  },
  {
    id: 'easy-numbers',
    title: 'Pick easy numbers',
    rule: 'When a question has no actual values, choose your own: 100 for percentages, the LCM for work and rates, 1 or 2 for algebra.',
    example: 'A earns 25% more than B. By what percentage is B\'s income less than A\'s? Take B = 100, so A = 125: 25 out of 125 = 20%.',
    whenNot: 'In algebra, a special value like 0 or 1 can make wrong options look right: check two different values.',
    check: () => near((25 / 125) * 100, 20)
  },
  {
    id: 'special-values',
    title: 'Test a value in algebra options',
    rule: 'When the options are formulas, put a simple number into the question and into each option. Wrong options give a different number.',
    example: 'The sum of the first n odd numbers is: n², n² + 1, 2n − 1 or n(n + 1)? For n = 3: 1 + 3 + 5 = 9, and only n² gives 9.',
    whenNot: 'Two options agree for your chosen value: try a second value.',
    check: () => 1 + 3 + 5 === 9 && [3 * 3 + 1, 2 * 3 - 1, 3 * 4].every((v) => v !== 9)
  },
  {
    id: 'divisibility',
    title: 'Use what the answer must divide by',
    rule: 'Many answers must be a multiple of something: the parts of a ratio, a count of people, a sum of consecutive numbers. Rule out the options that are not.',
    example: '₹7,200 shared in the ratio 5 : 7 gives parts that are multiples of 7,200 ÷ 12 = 600. Of 3,000, 3,100 and 4,250, only 3,000 can be a share.',
    whenNot: 'The amounts are rounded, or the answer is an average, which need not be whole.',
    check: () => 7200 / 12 === 600 && 3000 % 600 === 0 && 3100 % 600 !== 0 && 4250 % 600 !== 0 && (7200 * 5) / 12 === 3000
  },
  {
    id: 'units',
    title: 'Watch the units',
    rule: 'Write the units next to every number. Convert minutes to hours (or km/h to m/s) before you multiply, not after.',
    example: '54 km/h for 20 minutes is 54 × 1/3 = 18 km, not 54 × 20 = 1,080.',
    whenNot: 'Everything is already in the same units.',
    check: () => near(54 * (20 / 60), 18)
  },
  {
    id: 'ratio-without-total',
    title: 'Compare without the total',
    rule: 'In data interpretation, a ratio or a percentage change often needs only two numbers. Read what is asked before you work anything out.',
    example: 'Ratio of A in 2019 (340) to B in 2020 (425): 340 : 425 = 4 : 5. The yearly totals are not needed.',
    whenNot: 'The question asks for a share of the total: then the total is needed.',
    check: () => 340 / 425 === 4 / 5
  },
  {
    id: 'guessing',
    title: 'Guessing with negative marking',
    rule: 'With 4 options and a quarter mark lost for a wrong answer, a blind guess gains slightly on average, and ruling out even one option makes guessing clearly worth it. With a third of a mark lost, a blind guess gains nothing.',
    example: '+1 or −¼: blind guess 1/4 − (3/4)(1/4) = +1/16. One option ruled out: 1/3 − (2/3)(1/4) = +1/6. With −⅓: 1/4 − (3/4)(1/3) = 0.',
    whenNot: 'Your paper\'s marking scheme differs: work out the same sum with its numbers.',
    check: () => near(1 / 4 - (3 / 4) * (1 / 4), 1 / 16) && near(1 / 3 - (2 / 3) * (1 / 4), 1 / 6) && near(1 / 4 - (3 / 4) * (1 / 3), 0)
  },
  {
    id: 'two-passes',
    title: 'Two passes through the paper',
    rule: 'First pass: answer everything you can see how to do quickly; mark anything that needs more than about a minute and a half. Second pass: return to the marked ones with the time left.',
    example: '30 questions in 30 minutes: aim for 20 sure answers in the first 18 minutes, then spend 12 minutes on the 10 you marked.',
    whenNot: 'There is sectional timing with very few questions: then keep moving in order.',
    check: () => 18 + 12 === 30 && 20 + 10 === 30
  },
  {
    id: 'square-root-bounds',
    title: 'Bracket square roots',
    rule: 'Find the two perfect squares either side of the number. The root lies between their roots, closer to the nearer one.',
    example: '√500: 22² = 484 and 23² = 529, so √500 is a little above 22 (about 22.36).',
    whenNot: 'The options lie within the same pair of whole numbers: then use the square-roots table.',
    check: () => 22 * 22 === 484 && 23 * 23 === 529 && near(Math.sqrt(500), 22.36, 0.005)
  }
];
