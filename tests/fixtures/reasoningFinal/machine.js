/**
 * The hand-written input-output questions, in structured form (see
 * tests/reasoning-final-content.test.js for how they are checked).
 *
 * Every answer here is worked out without the machine that wrote the content:
 * the rule is found by trying every machine in the family on the steps shown
 * (all machines that fit must agree on the answer), and lines are written
 * directly (linesByFormula), steps counted by the counting rule, later steps
 * found by brute force over every possible input, and arithmetic machines
 * undone by searching for the input.
 */

import {
  RULES,
  RULE_IDS,
  affineAfter,
  arithmeticLines,
  inputsForStep,
  lineText,
  linesByFormula,
  permutations,
  runMachine,
  stepMFromStepKBrute,
  stepsByCounting
} from '../../../src/utils/reasoning/machine.js';

const L = (s) => s.split(' ');
const lines = (input, rule, steps) => linesByFormula(L(input), rule, steps ? { steps } : {}).map(lineText);
const stepText = (k) => (k === 0 ? 'Input' : `Step ${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][k]}`);
/** "Input: ...", "Step I: ...", as printed. */
const printed = (ls) => ls.map((line, k) => `${stepText(k)}: ${line}`);

function only(values) {
  const set = new Set(values.map((v) => JSON.stringify(v)));
  if (!values.length) throw new Error('no machine fits');
  if (set.size !== 1) throw new Error(`machines that fit disagree: ${[...set].join(' | ')}`);
  return values[0];
}

/** Every machine whose directly written lines match the steps shown. */
const fitting = (shown) =>
  RULE_IDS.filter((id) => {
    const ls = lines(shown[0], id, Math.max(L(shown[0]).length - 1, shown.length - 1));
    return shown.every((line, k) => ls[k] === line);
  });
/** The answer every fitting machine gives. */
const byEveryFit = (shown, fn) => only(fitting(shown).map(fn));
/** Of the rules offered, the one that fits (its text). */
const offeredFit = (shown, offered) => RULES[only(offered.filter((id) => fitting(shown).includes(id)))].text;

/* ------------------------------ the sets ------------------------------ */

const S1 = lines('rasam laddu samosa idli kheer jalebi', 'words-az-left').slice(0, 3);
const S2 = lines('15 37 82 29 51 64', 'nums-down-left').slice(0, 3);
const S4ex = lines('36 mela 84 holi 57 onam 12 diwali', 'word-left-num-right');
const S4in = '48 kurta 91 saree 27 dhoti 65 lungi';
const S5 = lines('63 agra 45 pune 72 surat 18 kochi', 'word-num-alternate').slice(0, 4);
const S13ex = lines('5 ganga 9 yamuna 3 kaveri', 'rotate-left', 2);
const S15ex = lines('bansuri sarod ektara mridangam nagara', 'words-za-left').slice(0, 4);
const S18 = lines('kite 71 drum 34 flute 18 bell 56', 'num-left-word-right').slice(0, 2);
const S19 = lines('58 23 71 40 12', 'nums-up-left').slice(0, 3);

/** The step (1, 2, ...) from which `token` stands in its final place for good. */
function settledAt(ls, token) {
  const final = L(ls.at(-1)).indexOf(token);
  for (let k = 0; k < ls.length; k++) if (ls.slice(k).every((line) => L(line).indexOf(token) === final)) return k;
  return null;
}

/** Brute force: the last line of every input whose step k is `line`. */
function lastStepsFrom(line, k, ruleId) {
  const out = new Set();
  for (const input of permutations(L(line))) {
    const run = runMachine(input, ruleId).lines;
    if (run[k] && lineText(run[k]) === line) out.add(lineText(run.at(-1)));
  }
  return [...out];
}

export const sets = [
  { id: 'input-output-q-001', texts: [...printed(S1), 'Step III'], answer: () => byEveryFit(S1, (id) => lines(S1[0], id)[3]) },
  { id: 'input-output-q-002', texts: printed(S1), answer: () => byEveryFit(S1, (id) => lines(S1[0], id).length - 1) },
  { id: 'input-output-q-003', texts: [...printed(S1), 'Step II', 'second from the right'], answer: () => L(S1[2]).at(-2) },
  {
    id: 'input-output-q-004',
    texts: printed(S2),
    answer: () => offeredFit(S2, ['nums-down-left', 'nums-up-left', 'rotate-right', 'rotate-left'])
  },
  { id: 'input-output-q-005', texts: [...printed(S2), 'last step'], answer: () => byEveryFit(S2, (id) => lines(S2[0], id).at(-1)) },
  { id: 'input-output-q-006', texts: [...printed(S2), '37'], answer: () => byEveryFit(S2, (id) => settledAt(lines(S2[0], id), '37')) },
  {
    id: 'input-output-q-007',
    texts: ['multiplies every number by 2', 'subtracts 3 from every number', 'Input: 14 9 21 6', 'third number', 'Step III'],
    answer: () => {
      const { m, c } = affineAfter([{ op: 'mul', k: 2 }, { op: 'sub', k: 3 }], 3);
      return m * 21 + c;
    }
  },
  { id: 'input-output-q-008', texts: [...printed(S4ex), `Input: ${S4in}`, 'Step II'], answer: () => byEveryFit(S4ex, (id) => lines(S4in, id)[2]) },
  { id: 'input-output-q-009', texts: [...printed(S4ex), `Input: ${S4in}`], answer: () => byEveryFit(S4ex, (id) => lines(S4in, id).length - 1) },
  {
    id: 'input-output-q-010',
    texts: [...printed(S4ex), `Input: ${S4in}`, 'Step II', 'third to the right of kurta'],
    answer: () =>
      byEveryFit(S4ex, (id) => {
        const line = L(lines(S4in, id)[2]);
        return line[line.indexOf('kurta') + 3];
      })
  },
  {
    id: 'input-output-q-011',
    texts: [...printed(S4ex), `Input: ${S4in}`, 'dhoti kurta 48 saree 27 lungi 65 91'],
    answer: () => byEveryFit(S4ex, (id) => lines(S4in, id).indexOf('dhoti kurta 48 saree 27 lungi 65 91'))
  },
  {
    id: 'input-output-q-012',
    texts: printed(S5),
    answer: () => offeredFit(S5, ['word-num-alternate', 'word-left-num-right', 'words-az-left', 'num-left-word-right'])
  },
  {
    id: 'input-output-q-013',
    texts: [...printed(S13ex), 'Step IV', 'krishna 8 godavari 7 narmada 2'],
    answer: () => byEveryFit(S13ex, (id) => only(inputsForStep(L('krishna 8 godavari 7 narmada 2'), 4, id).map(lineText)))
  },
  {
    id: 'input-output-q-014',
    texts: ['adds 5 to every number', 'multiplies every number by 2', 'Input: 7 12 4 9', 'sum', 'Step II'],
    answer: () => {
      const { m, c } = affineAfter([{ op: 'add', k: 5 }, { op: 'mul', k: 2 }], 2);
      return m * (7 + 12 + 4 + 9) + 4 * c;
    }
  },
  {
    id: 'input-output-q-015',
    texts: [...printed(S15ex), 'Step II', 'tulsi pudina amla neem karela methi', 'Step V'],
    answer: () => byEveryFit(S15ex, (id) => only(stepMFromStepKBrute(L('tulsi pudina amla neem karela methi'), 2, id, 5)))
  },
  {
    id: 'input-output-q-016',
    texts: ['first in dictionary order', 'left end', 'Input: arjun drona bhima nakul karna kunti sahadev vidura'],
    answer: () => stepsByCounting(L('arjun drona bhima nakul karna kunti sahadev vidura'), 'words-az-left')
  },
  {
    id: 'input-output-q-017',
    texts: ['smallest number', 'left end', 'exactly 3 steps'],
    answer: () => ['63 17 25 41 88', '41 88 17 25 63', '88 17 25 41 63', '41 17 63 25 88'].filter((s) => stepsByCounting(L(s), 'nums-up-left') === 3)
  },
  {
    id: 'input-output-q-018',
    texts: [...printed(S18), 'Step II'],
    answer: () =>
      byEveryFit(S18, (id) => {
        const all = lines(S18[0], id);
        const line = L(all[2]);
        const at = (t) => line.indexOf(t);
        const statements = [
          ['71 is third from the left end.', at('71') === 2],
          ['Exactly two elements stand between drum and flute.', Math.abs(at('drum') - at('flute')) - 1 === 2],
          ['drum is fourth from the right end.', line.length - at('drum') === 4],
          ['Two more steps after Step II complete the arrangement.', all.length - 1 - 2 === 2]
        ];
        return statements.filter(([, ok]) => ok).map(([text]) => text);
      })
  },
  {
    id: 'input-output-q-019',
    texts: printed(S19),
    answer: () => offeredFit(S19, ['nums-up-left', 'rotate-right', 'nums-down-left', 'rotate-left'])
  },
  {
    id: 'input-output-q-020',
    texts: ['multiplies every number by 3', 'adds 4 to every number', 'Step III', '75 102 57 129', 'second number'],
    answer: () => only(Array.from({ length: 300 }, (_, x) => x).filter((x) => arithmeticLines([x], [{ op: 'mul', k: 3 }, { op: 'add', k: 4 }], 3)[3][0] === 102))
  },
  {
    id: 'input-output-q-021',
    texts: [...printed(S4ex), 'Step I', 'chess 39 ludo 24 hockey 57 kabaddi 86', 'last step'],
    answer: () => byEveryFit(S4ex, (id) => only(lastStepsFrom('chess 39 ludo 24 hockey 57 kabaddi 86', 1, id)))
  }
];
