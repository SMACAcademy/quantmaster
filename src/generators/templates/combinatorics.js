/** Counting principle, set theory and Venn diagram templates. */

export const combinatoricsTemplates = [
  /* ============================ counting principle ============================ */
  {
    id: 'cp-multiplication-basic',
    version: 1,
    topicId: 'counting-principle',
    conceptId: 'cp-multiplication',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['cp-mult-f'],
    estimatedSeconds: 30,
    params(rng) {
      const m = rng.int(2, 8);
      const n = rng.int(2, 8);
      return { m, n };
    },
    answer: ({ m, n }) => m * n,
    verify: ({ m, n }, value) => m * n === value,
    render({ m, n }) {
      return {
        question: `A café offers ${m} types of coffee and ${n} types of pastry. How many coffee-and-pastry combinations are there?`,
        explanation: `By the multiplication principle: ${m} × ${n} = ${m * n}.`,
        solutionSteps: [`${m} × ${n} = ${m * n}.`],
        method: 'Multiply the number of choices at each independent stage.',
        hints: ['This is two independent stages, one after the other.'],
        commonMistakes: ['Adding the two counts instead of multiplying them.']
      };
    }
  },

  {
    id: 'cp-factorial-arrange',
    version: 2,
    topicId: 'counting-principle',
    conceptId: 'cp-factorial',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cp-factorial-f'],
    estimatedSeconds: 35,
    params(rng) {
      const contexts = [
        { what: 'distinct people', how: 'be arranged in a row', fixedNote: 'one particular person must stand at the left end' },
        { what: 'different books', how: 'be placed side by side on a shelf', fixedNote: 'the dictionary must be at the right end' },
        { what: 'runners', how: 'finish a race with no ties', fixedNote: 'the favourite is known to finish first' },
        { what: 'different cars', how: 'be parked in a row of the same number of slots', fixedNote: 'the red car must take the first slot' },
        { what: 'speakers', how: 'be ordered on a programme', fixedNote: 'the chief guest must speak last' },
        { what: 'different flags', how: 'be hung in a line on a pole', fixedNote: 'the national flag must be at the top' }
      ];
      const context = rng.pick(contexts);
      const n = rng.int(3, 9);
      const fixed = rng.chance(0.35);
      const k = fixed ? n - 1 : n;
      let count = 1;
      for (let i = 2; i <= k; i++) count *= i;
      return { n, fixed, k, count, context };
    },
    answer: ({ count }) => count,
    // Count the orders one by one: build every permutation of k items.
    verify({ k }, value) {
      let total = 0;
      const used = new Array(k).fill(false);
      const walk = (depth) => {
        if (depth === k) {
          total += 1;
          return;
        }
        for (let i = 0; i < k; i++) {
          if (used[i]) continue;
          used[i] = true;
          walk(depth + 1);
          used[i] = false;
        }
      };
      walk(0);
      return total === value;
    },
    render({ n, fixed, k, count, context }) {
      const chain = Array.from({ length: k }, (_, i) => k - i).join(' × ');
      return {
        question: `In how many ways can ${n} ${context.what} ${context.how}${fixed ? `, if ${context.fixedNote}` : ''}?`,
        explanation: fixed
          ? `One place is already decided, so only the other ${k} can be arranged: ${k}! = ${chain} = ${count}.`
          : `${n} distinct items can be arranged in ${n}! ways: ${chain} = ${count}.`,
        solutionSteps: [...(fixed ? [`The fixed one leaves ${k} to arrange.`] : []), `${k}! = ${chain} = ${count}.`],
        method: 'Use n! for arranging n distinct items in a row; anything whose place is fixed drops out first.',
        hints: [
          'Each position uses up one item, so the choices go down by one each time.',
          fixed ? 'Put the fixed one in place first, then arrange the rest.' : `Multiply ${n} × ${n - 1} × … × 1.`
        ],
        commonMistakes: [`Computing ${n} × ${n} instead of ${n}!.`, ...(fixed ? [`Using ${n}! and ignoring the fixed place.`] : [])]
      };
    }
  },

  {
    id: 'cp-repetition-vs-no',
    version: 1,
    topicId: 'counting-principle',
    conceptId: 'cp-repetition',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cp-repetition-f'],
    estimatedSeconds: 40,
    tags: ['trap'],
    params(rng) {
      const n = rng.int(5, 10);
      const r = rng.int(2, Math.min(4, n - 1));
      let count = 1;
      for (let i = 0; i < r; i++) count *= n - i;
      return { n, r, count };
    },
    answer: ({ count }) => count,
    verify({ n, r }, value) {
      let count = 1;
      for (let i = 0; i < r; i++) count *= n - i;
      return count === value;
    },
    render({ n, r, count }) {
      const factors = Array.from({ length: r }, (_, i) => n - i).join(' × ');
      return {
        question: `How many ${r}-digit codes can be formed from ${n} distinct symbols if repetition is not allowed?`,
        explanation: `Without repetition, each position removes one symbol from the choices for the next: ${factors} = ${count}.`,
        solutionSteps: [`${factors} = ${count}.`],
        method: 'Each position has one fewer choice than the last, since symbols cannot repeat.',
        hints: ['The number of remaining choices shrinks by one at each position.'],
        commonMistakes: [`Using ${n}^${r} as if repetition were allowed.`]
      };
    }
  },

  {
    id: 'cp-block-together',
    version: 1,
    topicId: 'counting-principle',
    conceptId: 'cp-restricted',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['cp-restricted-f', 'cp-factorial-f'],
    estimatedSeconds: 55,
    params(rng) {
      const n = rng.int(4, 9);
      const m = rng.pick([2, 3, 4]);
      if (m >= n) return null;
      const units = n - m + 1;
      let unitsFact = 1;
      for (let i = 2; i <= units; i++) unitsFact *= i;
      let blockFact = 1;
      for (let i = 2; i <= m; i++) blockFact *= i;
      return { n, m, units, unitsFact, blockFact, total: unitsFact * blockFact };
    },
    answer: ({ total }) => total,
    verify({ units, m }, value) {
      let unitsFact = 1;
      for (let i = 2; i <= units; i++) unitsFact *= i;
      let blockFact = 1;
      for (let i = 2; i <= m; i++) blockFact *= i;
      return unitsFact * blockFact === value;
    },
    render({ n, m, units, unitsFact, blockFact, total }) {
      return {
        question: `In how many ways can ${n} people be seated in a row if ${m} specific people must sit together?`,
        explanation: `Treat the ${m} people as one block, giving ${units} units to arrange (${units}! = ${unitsFact}). Multiply by the ${m}! = ${blockFact} ways to arrange the people inside the block: ${unitsFact} × ${blockFact} = ${total}.`,
        solutionSteps: [`Units to arrange: ${n} − ${m} + 1 = ${units}. ${units}! = ${unitsFact}.`, `Arrangements inside the block: ${m}! = ${blockFact}.`, `${unitsFact} × ${blockFact} = ${total}.`],
        method: 'Treat the group that must stay together as a single block, then arrange within it.',
        hints: ['Do not forget the internal arrangements of the block itself.'],
        commonMistakes: ['Forgetting to multiply by the arrangements inside the block.']
      };
    }
  },

  /* ================================= set theory ================================= */
  {
    id: 'st-union-two',
    version: 1,
    topicId: 'set-theory',
    conceptId: 'st-venn-two',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['st-union-f'],
    estimatedSeconds: 30,
    params(rng) {
      const a = rng.int(8, 40);
      const b = rng.int(8, 40);
      const i = rng.int(0, Math.min(a, b) - 1);
      return { a, b, i };
    },
    answer: ({ a, b, i }) => a + b - i,
    verify: ({ a, b, i }, value) => a + b - i === value,
    render({ a, b, i }) {
      return {
        question: `If |A|=${a}, |B|=${b} and |A∩B|=${i}, what is |A∪B|?`,
        explanation: `|A∪B| = |A| + |B| − |A∩B| = ${a} + ${b} − ${i} = ${a + b - i}.`,
        solutionSteps: [`${a} + ${b} = ${a + b}.`, `${a + b} − ${i} = ${a + b - i}.`],
        method: 'Add the two sets, then subtract the overlap once.',
        hints: ['Do not forget to subtract the intersection.'],
        commonMistakes: ['Forgetting to subtract |A∩B|.']
      };
    }
  },

  {
    id: 'st-subsets-count',
    version: 2,
    topicId: 'set-theory',
    conceptId: 'st-subsets',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['st-subsets-f'],
    estimatedSeconds: 30,
    params(rng) {
      const n = rng.int(2, 10);
      const kind = rng.pick(['all', 'proper', 'nonEmpty', 'nonEmptyProper']);
      const listed = n <= 6 && rng.chance(0.5);
      const style = rng.pick(['numbers', 'letters']);
      const items = style === 'letters' ? 'pqrstu'.slice(0, n).split('') : Array.from({ length: n }, (_, i) => String(i + 1));
      const drop = { all: 0, proper: 1, nonEmpty: 1, nonEmptyProper: 2 }[kind];
      return { n, kind, listed, items, count: 2 ** n - drop };
    },
    answer: ({ count }) => count,
    // Walk through every subset as a bit pattern and count the ones the question allows.
    verify({ n, kind }, value) {
      let total = 0;
      for (let mask = 0; mask < 2 ** n; mask++) {
        const whole = mask === 2 ** n - 1;
        if ((kind === 'proper' || kind === 'nonEmptyProper') && whole) continue;
        if ((kind === 'nonEmpty' || kind === 'nonEmptyProper') && mask === 0) continue;
        total += 1;
      }
      return total === value;
    },
    render({ n, kind, listed, items, count }) {
      const setText = listed ? `A = {${items.join(', ')}}.` : `A set A has ${n} elements.`;
      const ask = {
        all: 'How many subsets does A have (including the empty set and A itself)?',
        proper: 'How many proper subsets does A have (every subset except A itself)?',
        nonEmpty: 'How many non-empty subsets does A have?',
        nonEmptyProper: 'How many subsets of A are neither empty nor A itself?'
      }[kind];
      const drop = {
        all: '',
        proper: ' − 1 (leave out A itself)',
        nonEmpty: ' − 1 (leave out the empty set)',
        nonEmptyProper: ' − 2 (leave out the empty set and A itself)'
      }[kind];
      return {
        question: `${setText} ${ask}`,
        explanation: `Each of the ${n} elements is either in a subset or not, so there are 2^${n} = ${2 ** n} subsets in all.${kind === 'all' ? '' : ` Then 2^${n}${drop} = ${count}.`}`,
        solutionSteps: [`${listed ? `A has ${n} elements. ` : ''}All subsets: 2^${n} = ${2 ** n}.`, ...(kind === 'all' ? [] : [`2^${n}${drop} = ${count}.`])],
        method: 'Count all subsets as 2^n, then remove the ones the question excludes.',
        hints: [
          'Each element independently is either included or excluded.',
          kind === 'all' ? 'Both the empty set and A itself count.' : 'Find 2^n first, then decide which subsets to remove.'
        ],
        commonMistakes: [`Computing ${n}² instead of 2^${n}.`, ...(kind === 'all' ? [] : ['Removing the wrong subsets (the empty set, the whole set, or both).'])]
      };
    }
  },

  {
    id: 'st-neither-count',
    version: 1,
    topicId: 'set-theory',
    conceptId: 'st-operations',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['st-union-f', 'st-complement-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(10, 30);
      const b = rng.int(10, 30);
      const i = rng.int(0, Math.min(a, b) - 1);
      const union = a + b - i;
      const u = rng.int(union + 5, union + 40);
      return { u, a, b, i, union };
    },
    answer: ({ u, union }) => u - union,
    verify: ({ u, a, b, i }, value) => u - (a + b - i) === value,
    render({ u, a, b, i, union }) {
      const neither = u - union;
      return {
        question: `A universal set has ${u} elements. |A|=${a}, |B|=${b}, |A∩B|=${i}. How many elements are in neither A nor B?`,
        explanation: `|A∪B| = ${a} + ${b} − ${i} = ${union}. Neither: ${u} − ${union} = ${neither}.`,
        solutionSteps: [`|A∪B| = ${a} + ${b} − ${i} = ${union}.`, `${u} − ${union} = ${neither}.`],
        method: 'Find the union first, then subtract it from the universal set.',
        hints: ['"Neither" means outside both A and B.'],
        commonMistakes: ['Subtracting |A| and |B| separately instead of using the union.']
      };
    }
  },

  {
    id: 'st-three-set-union',
    version: 1,
    topicId: 'set-theory',
    conceptId: 'st-venn-three',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['st-three-f'],
    estimatedSeconds: 60,
    params(rng) {
      const abc = rng.int(1, 4);
      const ab = abc + rng.int(1, 6);
      const bc = abc + rng.int(1, 6);
      const ac = abc + rng.int(1, 6);
      const a = ab + ac - abc + rng.int(5, 20);
      const b = ab + bc - abc + rng.int(5, 20);
      const c = bc + ac - abc + rng.int(5, 20);
      const union = a + b + c - ab - bc - ac + abc;
      return { a, b, c, ab, bc, ac, abc, union };
    },
    answer: ({ union }) => union,
    verify({ a, b, c, ab, bc, ac, abc }, value) {
      return a + b + c - ab - bc - ac + abc === value;
    },
    render({ a, b, c, ab, bc, ac, abc, union }) {
      return {
        question: `|A|=${a}, |B|=${b}, |C|=${c}, |A∩B|=${ab}, |B∩C|=${bc}, |A∩C|=${ac}, |A∩B∩C|=${abc}. What is |A∪B∪C|?`,
        explanation: `|A∪B∪C| = ${a}+${b}+${c}−${ab}−${bc}−${ac}+${abc} = ${union}.`,
        solutionSteps: [`Sum individual sets: ${a}+${b}+${c} = ${a + b + c}.`, `Subtract pairwise overlaps: ${a + b + c} − ${ab} − ${bc} − ${ac} = ${a + b + c - ab - bc - ac}.`, `Add back the triple overlap: + ${abc} = ${union}.`],
        method: 'Sum the sets, subtract pairwise overlaps, then add back the triple overlap.',
        hints: ['Do not forget to add the triple intersection back at the end.'],
        commonMistakes: ['Forgetting to add back |A∩B∩C|.']
      };
    }
  },

  /* ================================ venn diagrams ================================ */
  {
    id: 'vd-only-from-total',
    version: 1,
    topicId: 'venn-diagrams',
    conceptId: 'vd-two-regions',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['vd-regions-f'],
    estimatedSeconds: 25,
    params(rng) {
      const overlap = rng.int(2, 15);
      const a = overlap + rng.int(3, 25);
      return { a, overlap };
    },
    answer: ({ a, overlap }) => a - overlap,
    verify: ({ a, overlap }, value) => a - overlap === value,
    render({ a, overlap }) {
      return {
        question: `In a two-set Venn diagram, |A|=${a} and |A∩B|=${overlap}. What is "only A"?`,
        explanation: `Only A = |A| − |A∩B| = ${a} − ${overlap} = ${a - overlap}.`,
        solutionSteps: [`${a} − ${overlap} = ${a - overlap}.`],
        method: 'Remove the overlapping part from the total for A.',
        hints: ['"Only A" excludes the shared region.'],
        commonMistakes: ['Reporting the total for A instead of "only A."']
      };
    }
  },

  {
    id: 'vd-neither-two-set',
    version: 1,
    topicId: 'venn-diagrams',
    conceptId: 'vd-two-solve',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['vd-total-f'],
    estimatedSeconds: 40,
    params(rng) {
      const onlyA = rng.int(5, 25);
      const onlyB = rng.int(5, 25);
      const both = rng.int(2, 15);
      const total = onlyA + onlyB + both + rng.int(1, 20);
      return { onlyA, onlyB, both, total };
    },
    answer: ({ total, onlyA, onlyB, both }) => total - onlyA - onlyB - both,
    verify: ({ total, onlyA, onlyB, both }, value) => onlyA + onlyB + both + value === total,
    render({ onlyA, onlyB, both, total }) {
      const neither = total - onlyA - onlyB - both;
      return {
        figure: {
          type: 'venn',
          caption: 'The group, with each region counted',
          sets: ['A', 'B'],
          universe: `Total = ${total}`,
          regions: { a: onlyA, b: onlyB, ab: both, none: '?' },
          ariaSummary: `Two overlapping circles A and B inside a box of ${total}. Only A holds ${onlyA}, only B holds ${onlyB}, both holds ${both}, and the region outside both circles is unknown.`
        },
        question: `A group of ${total}: ${onlyA} are in only A, ${onlyB} are in only B, and ${both} are in both. How many are in neither?`,
        explanation: `Total = Only A + Only B + Both + Neither, so ${total} = ${onlyA} + ${onlyB} + ${both} + Neither, giving Neither = ${neither}.`,
        solutionSteps: [`${onlyA} + ${onlyB} + ${both} = ${onlyA + onlyB + both}.`, `${total} − ${onlyA + onlyB + both} = ${neither}.`],
        method: 'The four regions must add up to the total.',
        hints: ['Add up the three known regions, then subtract from the total.'],
        commonMistakes: ['Forgetting to include one of the three known regions.']
      };
    }
  },

  {
    id: 'vd-intersection-from-union',
    version: 1,
    topicId: 'venn-diagrams',
    conceptId: 'vd-word',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['vd-word-f', 'vd-total-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(20, 60);
      const b = rng.int(20, 60);
      const overlap = rng.int(1, Math.min(a, b) - 1);
      const atLeastOne = a + b - overlap;
      const total = atLeastOne + rng.int(0, 15);
      return { total, atLeastOne, a, b, overlap };
    },
    answer: ({ overlap }) => overlap,
    verify: ({ a, b, atLeastOne }, value) => a + b - value === atLeastOne,
    render({ total, atLeastOne, a, b, overlap }) {
      return {
        question: `Of ${total} people surveyed, ${atLeastOne} like at least one of A or B. |A|=${a} and |B|=${b}. What is |A∩B|?`,
        explanation: `|A∪B| = |A| + |B| − |A∩B|, so ${atLeastOne} = ${a} + ${b} − |A∩B|, giving |A∩B| = ${overlap}.`,
        solutionSteps: [`${a} + ${b} = ${a + b}.`, `${a + b} − ${atLeastOne} = ${overlap}.`],
        method: 'Use the union formula, rearranged to isolate the overlap.',
        hints: ['"At least one" is the same as the union count.'],
        commonMistakes: ['Confusing "at least one" with the total surveyed.']
      };
    }
  },

  {
    id: 'vd-three-set-none',
    version: 1,
    topicId: 'venn-diagrams',
    conceptId: 'vd-three-regions',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['vd-three-regions-f'],
    estimatedSeconds: 55,
    params(rng) {
      const onlyA = rng.int(5, 25);
      const onlyB = rng.int(5, 25);
      const onlyC = rng.int(5, 25);
      const exactlyTwo = rng.int(5, 25);
      const allThree = rng.int(1, 8);
      const known = onlyA + onlyB + onlyC + exactlyTwo + allThree;
      const total = known + rng.int(1, 20);
      return { onlyA, onlyB, onlyC, exactlyTwo, allThree, known, total };
    },
    answer: ({ total, known }) => total - known,
    verify: ({ total, known }, value) => known + value === total,
    render({ onlyA, onlyB, onlyC, exactlyTwo, allThree, known, total }) {
      const none = total - known;
      return {
        question: `Of ${total} people: only A=${onlyA}, only B=${onlyB}, only C=${onlyC}, exactly two of the three (combined)=${exactlyTwo}, and all three=${allThree}. How many are in none of the three?`,
        explanation: `Sum of known regions: ${onlyA}+${onlyB}+${onlyC}+${exactlyTwo}+${allThree} = ${known}. None = ${total} − ${known} = ${none}.`,
        solutionSteps: [`${onlyA}+${onlyB}+${onlyC}+${exactlyTwo}+${allThree} = ${known}.`, `${total} − ${known} = ${none}.`],
        method: 'Add every known region, then subtract from the total.',
        hints: ['Make sure every region except "none" is included in the sum.'],
        commonMistakes: ['Missing one of the given regions when summing.']
      };
    }
  }
];
