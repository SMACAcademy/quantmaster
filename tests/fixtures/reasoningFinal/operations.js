/**
 * The hand-written mathematical-operations questions, in structured form (see
 * tests/reasoning-final-content.test.js). Each answer is worked out from the
 * structure with src/utils/reasoning/operations.js: decode with the key, then
 * evaluate; every expression that gets evaluated must give the same whole
 * value under the standard order and a literal "÷, ×, +, −" reading, and by the
 * token-collapsing method and the parser alike. "Which one" questions are
 * answered by trying every candidate, so a second right option would fail.
 */

import {
  cleanByParser,
  cleanValue,
  decode,
  defineOp,
  evaluateDefined,
  exprText,
  fillSigns,
  interchangeNumbers,
  interchangeSigns,
  mightHold,
  numberSwapsThatWork,
  pairText,
  signSwapsThatWork,
  solveUnknown
} from '../../../src/utils/reasoning/operations.js';

/** The value, insisting that both conventions and both methods agree on a whole number. */
function value(tokens) {
  const v = cleanValue(tokens);
  if (v === null) throw new Error(`${exprText(tokens)} is not clean`);
  if (cleanByParser(exprText(tokens)) !== v) throw new Error(`${exprText(tokens)}: the parser disagrees`);
  return v;
}

const said = (key) => Object.entries(key).map(([from, to]) => `‘${from}’ means ‘${to}’`);

/** Exactly one of the options passes `test`; the rest fail in every reading. Returns it. */
function onlyOne(options, test) {
  const pass = options.filter((o) => test(o));
  if (pass.length !== 1) throw new Error(`expected one option, got ${pass.length}`);
  return pass[0].text;
}

const eq = (text, left, rhs) => ({ text, left, rhs });
/** A coded equation option: true only if it holds after decoding, and no reading makes a false one true. */
const decodedTrue = (key) => (o) => {
  const real = decode(o.left, key);
  const v = value(real);
  if (v !== o.rhs && mightHold(real, o.rhs)) throw new Error(`${o.text} is true in one reading`);
  return v === o.rhs;
};

/* ------------------------------ easy ------------------------------ */

const K1 = { P: '×', Q: '+', R: '÷', S: '−' };
const E1 = [16, 'R', 4, 'Q', 6, 'P', 3, 'S', 5];
const K2 = { '+': '−', '−': '+', '×': '÷', '÷': '×' };
const E2 = [40, '×', 8, '÷', 3, '−', 7, '+', 2];
const STAR3 = [3, '×', 'a', '+', 2, '×', 'b'];
const HASH4 = ['a', '×', 'a', '−', 'b'];
const K5 = { '+': '÷', '−': '×', '×': '+', '÷': '−' };
const O5 = [
  eq('6 − 3 × 4 = 30', [6, '−', 3, '×', 4], 30),
  eq('12 + 4 × 2 = 5', [12, '+', 4, '×', 2], 5),
  eq('20 + 5 ÷ 1 = 5', [20, '+', 5, '÷', 1], 5),
  eq('9 ÷ 3 − 2 = 12', [9, '÷', 3, '−', 2], 12)
];
const K6 = { A: '+', B: '−', C: '×', D: '÷' };
const E6 = [7, 'C', 6, 'A', 45, 'D', 9, 'B', 8];

/* ------------------------------ medium ------------------------------ */

const K8 = { P: '÷', Q: '×', R: '+', S: '−' };
const E8 = [36, 'P', 4, 'R', '?', 'Q', 3, 'S', 5];
const K9 = { '×': '+', '+': '÷', '÷': '−', '−': '×' };
const O9 = [
  eq('15 + 3 − 2 × 1 = 12', [15, '+', 3, '−', 2, '×', 1], 12),
  eq('9 − 4 ÷ 6 + 2 = 15', [9, '−', 4, '÷', 6, '+', 2], 15),
  eq('8 × 6 + 2 ÷ 4 = 7', [8, '×', 6, '+', 2, '÷', 4], 7),
  eq('20 × 8 ÷ 12 + 2 = 8', [20, '×', 8, '÷', 12, '+', 2], 8)
];
const E10 = [15, '+', 36, '×', 4, '÷', 2, '−', 7];
const OPLUS11 = [2, '×', 'a', '−', 'b'];
const K13 = K2;
const O13 = [
  ['30 × 6 ÷ 2', [30, '×', 6, '÷', 2]],
  ['4 ÷ 3 − 2', [4, '÷', 3, '−', 2]],
  ['13 − 2 + 5', [13, '−', 2, '+', 5]],
  ['40 × 8 + 3', [40, '×', 8, '+', 3]],
  ['2 ÷ 7 + 4', [2, '÷', 7, '+', 4]]
];
const K14 = { L: '×', M: '−', N: '+', O: '÷' };
const E14 = ['(', 18, 'N', 6, ')', 'O', 4, 'L', 3, 'M', 5];

/* ------------------------------ complex ------------------------------ */

const E15 = [3, '×', 7, '+', 45, '÷', 9, '−', 8];
const E16 = [12, '÷', 4, '+', 5, '×', 3];
const O16 = [
  { text: 'Interchange + and ×, and 3 and 5', signs: ['+', '×'], nums: [3, 5] },
  { text: 'Interchange + and ×, and 3 and 4', signs: ['+', '×'], nums: [3, 4] },
  { text: 'Interchange ÷ and ×, and 4 and 5', signs: ['÷', '×'], nums: [4, 5] },
  { text: 'Interchange + and −, and 3 and 5', signs: ['+', '−'], nums: [3, 5] }
];
const STAR17 = ['a', '+', 'b', '+', 'a', '×', 'b'];
const DIAMOND17 = ['(', 'a', '+', 'b', ')', '÷', 2];
const O18 = [
  eq('7 + 2 × 4 = 30', [7, '+', 2, '×', 4], 30),
  eq('2 × 6 + 7 = 19', [2, '×', 6, '+', 7], 19),
  eq('7 × 3 + 2 = 13', [7, '×', 3, '+', 2], 13),
  eq('2 + 7 × 5 = 45', [2, '+', 7, '×', 5], 45)
];
const STAR19 = ['a', '×', 'b', '−', '(', 'a', '+', 'b', ')'];
const K20 = { P: '×', Q: '÷', R: '−', S: '+' };
const E20 = [84, 'Q', '?', 'P', 3, 'S', 15, 'R', 9];
const O21 = [
  eq('8 × 2 ÷ 3 = 12', [8, '×', 2, '÷', 3], 12),
  eq('36 × 4 + 1 = 10', [36, '×', 4, '+', 1], 10),
  eq('5 ÷ 6 × 3 = 90', [5, '÷', 6, '×', 3], 90),
  eq('20 − 12 × 4 = 2', [20, '−', 12, '×', 4], 2),
  eq('7 ÷ 3 − 1 = 20', [7, '÷', 3, '−', 1], 20)
];

const unknown = (key, tokens, rhs) => {
  const fits = solveUnknown(decode(tokens, key), rhs, 0, 1000);
  if (fits.length !== 1) throw new Error(`? has ${fits.length} values`);
  value(decode(tokens, key).map((t) => (t === '?' ? fits[0] : t)));
  return fits[0];
};

export const sets = [
  { id: 'mathematical-operations-q-001', texts: [...said(K1), exprText(E1)], answer: () => String(value(decode(E1, K1))) },
  { id: 'mathematical-operations-q-002', texts: [...said(K2), exprText(E2)], answer: () => value(decode(E2, K2)) },
  { id: 'mathematical-operations-q-003', texts: ['a ★ b = 3a + 2b', '5 ★ 4'], answer: () => defineOp(STAR3)(5, 4) },
  { id: 'mathematical-operations-q-004', texts: ['a # b = a² − b', '6 # 9'], answer: () => String(defineOp(HASH4)(6, 9)) },
  { id: 'mathematical-operations-q-005', texts: said(K5), answer: () => onlyOne(O5, decodedTrue(K5)) },
  {
    id: 'mathematical-operations-q-006',
    texts: ['‘A’ stands for ‘+’', '‘B’ for ‘−’', '‘C’ for ‘×’', '‘D’ for ‘÷’', exprText(E6)],
    answer: () => value(decode(E6, K6))
  },
  {
    id: 'mathematical-operations-q-007',
    texts: ['6 * 4 * 2 = 26'],
    answer: () => {
      const fits = fillSigns([6, 4, 2], 26);
      if (fits.length !== 1) throw new Error('more than one way to fill the signs');
      value([6, fits[0][0], 4, fits[0][1], 2]);
      return fits[0].join(', ');
    }
  },
  { id: 'mathematical-operations-q-008', texts: [...said(K8), `${exprText(E8)} = 22`], answer: () => unknown(K8, E8, 22) },
  { id: 'mathematical-operations-q-009', texts: said(K9), answer: () => onlyOne(O9, decodedTrue(K9)) },
  {
    id: 'mathematical-operations-q-010',
    texts: ['two signs', `${exprText(E10)} = 26`],
    answer: () => {
      value(E10);
      const works = signSwapsThatWork(E10, 26);
      if (works.length !== 1) throw new Error('not one sign pair');
      value(interchangeSigns(E10, ...works[0]));
      return pairText(works[0]);
    }
  },
  { id: 'mathematical-operations-q-011', texts: ['a ⊕ b = 2a − b', '(7 ⊕ 4) ⊕ 3'], answer: () => evaluateDefined(['(', 7, '⊕', 4, ')', '⊕', 3], { '⊕': OPLUS11 }) },
  {
    id: 'mathematical-operations-q-012',
    texts: ['three different signs', '9 * 3 * 4 * 5 = 7'],
    answer: () => {
      const fits = fillSigns([9, 3, 4, 5], 7, { distinct: true });
      if (fits.length !== 1) throw new Error('more than one way to fill the signs');
      return fits[0].join(', ');
    }
  },
  {
    id: 'mathematical-operations-q-013',
    texts: [...said(K13), 'equal to 10'],
    answer: () => O13.filter(([, tokens]) => value(decode(tokens, K13)) === 10).map(([text]) => text)
  },
  { id: 'mathematical-operations-q-014', texts: [...said(K14), exprText(E14)], answer: () => value(decode(E14, K14)) },
  {
    id: 'mathematical-operations-q-015',
    texts: ['two numbers', `${exprText(E15)} = 58`],
    answer: () => {
      value(E15);
      const works = numberSwapsThatWork(E15, 58);
      if (works.length !== 1) throw new Error('not one number pair');
      value(interchangeNumbers(E15, ...works[0]));
      return works[0].sort((a, b) => a - b).join(' and ');
    }
  },
  {
    id: 'mathematical-operations-q-016',
    texts: [`${exprText(E16)} = 14`],
    answer: () => {
      value(E16);
      return onlyOne(O16, (o) => mightHold(interchangeNumbers(interchangeSigns(E16, ...o.signs), ...o.nums), 14) && value(interchangeNumbers(interchangeSigns(E16, ...o.signs), ...o.nums)) === 14);
    }
  },
  {
    id: 'mathematical-operations-q-017',
    texts: ['a ★ b = a + b + ab', 'a ◆ b = (a + b) ÷ 2', '(3 ★ 5) ◆ 9'],
    answer: () => evaluateDefined(['(', 3, '★', 5, ')', '◆', 9], { '★': STAR17, '◆': DIAMOND17 })
  },
  {
    id: 'mathematical-operations-q-018',
    texts: ['+ and × are interchanged', '2 and 7 are interchanged'],
    answer: () =>
      onlyOne(O18, (o) => {
        if (String(o.rhs).includes('2') || String(o.rhs).includes('7')) throw new Error('a right side would change too');
        const after = interchangeNumbers(interchangeSigns(o.left, '+', '×'), 2, 7);
        const v = value(after);
        if (v !== o.rhs && mightHold(after, o.rhs)) throw new Error(`${o.text} is true in one reading`);
        return v === o.rhs;
      })
  },
  {
    id: 'mathematical-operations-q-019',
    texts: ['a ★ b = ab − (a + b)'],
    answer: () => {
      const star = defineOp(STAR19);
      let symmetric = true;
      for (let a = 0; a <= 30; a++) for (let b = 0; b <= 30; b++) if (star(a, b) !== star(b, a)) symmetric = false;
      const claims = [
        ['3 ★ 4 = 5', star(3, 4) === 5],
        ['a ★ b = b ★ a for every pair of numbers', symmetric],
        ['2 ★ 2 = 0', star(2, 2) === 0],
        ['5 ★ 1 = 1', star(5, 1) === 1],
        ['(2 ★ 3) ★ 4 = 3', star(star(2, 3), 4) === 3]
      ];
      return claims.filter(([, ok]) => ok).map(([text]) => text);
    }
  },
  { id: 'mathematical-operations-q-020', texts: [...said(K20), `${exprText(E20)} = 42`], answer: () => unknown(K20, E20, 42) },
  {
    id: 'mathematical-operations-q-021',
    texts: ['× and ÷ are interchanged'],
    answer: () =>
      O21.filter((o) => {
        const after = interchangeSigns(o.left, '×', '÷');
        const v = value(after);
        if (v !== o.rhs && mightHold(after, o.rhs)) throw new Error(`${o.text} is true in one reading`);
        return v === o.rhs;
      }).map((o) => o.text)
  }
];
