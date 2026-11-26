/**
 * Syllogism and reasoning-inequality templates.
 *
 * Syllogisms: the answer is found by trying every Venn diagram the statements
 * allow (utils/reasoning/syllogism.js, bitmask worlds); `verify` decides again
 * from concrete members (every universe of members, read with every/some).
 *
 * Inequalities: the answer walks the chain between the two letters and combines
 * the signs (pathRelation); `verify` gives the letters every allowed set of
 * values and reads what is always true (bruteRelation). Conclusions whose truth
 * depends on the "P > Q, so is P ≥ Q true?" convention are never generated.
 */

import { VERDICTS, follows, followsByMembers, statementText, verdict, verdictByMembers } from '../../utils/reasoning/syllogism.js';
import {
  IQ_VERDICTS,
  OPS,
  SIGN_MEANING,
  bruteRelation,
  chainRelations,
  iqVerdict,
  iqVerdictBrute,
  isContested,
  pathRelation
} from '../../utils/reasoning/inequality.js';

/* ------------------------------ syllogisms ------------------------------ */

const TERM_SETS = [
  ['pens', 'books', 'bags', 'boxes'],
  ['roses', 'lilies', 'flowers', 'plants'],
  ['doctors', 'teachers', 'singers', 'dancers'],
  ['cars', 'buses', 'trains', 'planes'],
  ['rings', 'coins', 'chains', 'bangles'],
  ['apples', 'mangoes', 'fruits', 'seeds'],
  ['rivers', 'lakes', 'ponds', 'wells'],
  ['chairs', 'tables', 'desks', 'stools'],
  ['kites', 'birds', 'clouds', 'stars'],
  ['poets', 'writers', 'actors', 'painters']
];
const FORMS = ['all', 'some', 'no'];

function syllogismContext(terms, statements, c1, c2) {
  return `Statements:\n${statements.map((s) => statementText(terms, s)).join('\n')}\nConclusions:\nI. ${statementText(terms, c1)}\nII. ${statementText(terms, c2)}`;
}

/** Draw until the verdict is the target, so every answer comes up. */
function aim(rng, targets, draw, judge) {
  const target = rng.pick(targets);
  for (let i = 0; i < 80; i++) {
    const p = draw();
    if (p && judge(p) === target) return p;
  }
  return null;
}

const statusWord = (k, statements, c) => (follows(k, statements, c) ? 'follows' : 'does not follow');

function syllogismExplain(terms, k, statements, c1, c2) {
  const why = (c) => {
    if (c.possible) return follows(k, statements, c) ? 'some allowed diagram makes it true, so it is possible' : 'no allowed diagram makes it true, so it is not possible';
    return follows(k, statements, c) ? 'it is true in every diagram the statements allow' : 'at least one allowed diagram makes it false';
  };
  return `Conclusion I ${statusWord(k, statements, c1)}: ${why(c1)}. Conclusion II ${statusWord(k, statements, c2)}: ${why(c2)}.`;
}

/** Two random statements A–B and B–C (in either word order), from the given forms. */
function twoStatements(rng, forms) {
  const s1 = rng.chance(0.5) ? { q: rng.pick(forms), a: 0, b: 1 } : { q: rng.pick(forms), a: 1, b: 0 };
  const s2 = rng.chance(0.5) ? { q: rng.pick(forms), a: 1, b: 2 } : { q: rng.pick(forms), a: 2, b: 1 };
  return [s1, s2];
}

function randomConclusion(rng, k, { possible = 0, forms = ['all', 'some', 'no', 'someNot'] } = {}) {
  const a = rng.int(0, k - 1);
  let b = rng.int(0, k - 2);
  if (b >= a) b += 1;
  const c = { q: rng.pick(forms), a, b };
  if (rng.chance(possible)) {
    c.possible = true;
    // Exams ask possibilities as "All A being B" or "Some A being B".
    if (c.q === 'someNot' || c.q === 'no') c.q = rng.pick(['all', 'some']);
  }
  return c;
}

const same = (x, y) => x.q === y.q && x.a === y.a && x.b === y.b && Boolean(x.possible) === Boolean(y.possible);

function syllogismTemplate({ id, conceptId, difficulty, targets, k = 3, makeStatements, conclusionOptions, formulaIds, method, hints, mistakes }) {
  return {
    id,
    version: 1,
    topicId: 'syllogism',
    conceptId,
    difficulty,
    type: 'single_choice',
    formulaIds,
    formatValue: (v) => v,
    optionOrder: VERDICTS,
    optionCount: 5,
    estimatedSeconds: difficulty === 'complex' ? 90 : 60,
    params(rng) {
      const terms = rng.shuffle(rng.pick(TERM_SETS)).slice(0, k);
      return aim(
        rng,
        targets,
        () => {
          const statements = makeStatements(rng);
          const c1 = randomConclusion(rng, k, conclusionOptions(0));
          const c2 = randomConclusion(rng, k, conclusionOptions(1));
          if (same(c1, c2) || statements.some((s) => same(s, c1) || same(s, c2))) return null;
          return { terms, statements, c1, c2 };
        },
        (p) => verdict(k, p.statements, p.c1, p.c2)
      );
    },
    answer: ({ statements, c1, c2 }) => verdict(k, statements, c1, c2),
    distractors: ({ statements, c1, c2 }) => VERDICTS.filter((v) => v !== verdict(k, statements, c1, c2)).map((value) => ({ value, why: 'another verdict' })),
    verify: ({ statements, c1, c2 }, value) => verdictByMembers(k, statements, c1, c2) === value,
    render({ terms, statements, c1, c2 }, { fmt }) {
      const answer = verdict(k, statements, c1, c2);
      const either = answer === VERDICTS[2] ? ' Neither is certain alone, but they are a complementary pair about the same two terms, so one of them must be true.' : '';
      return {
        context: syllogismContext(terms, statements, c1, c2),
        question: 'Which conclusion(s) follow from the statements, taking the statements to be true even if they seem to be at variance with known facts?',
        explanation: `${syllogismExplain(terms, k, statements, c1, c2)}${either} Answer: ${fmt(answer)}.`,
        solutionSteps: [
          'Draw the least-overlap diagram: draw only the overlaps the statements force.',
          'For each conclusion, try to draw an allowed diagram that makes it false. If you can, it does not definitely follow.',
          `For a possibility conclusion, try to draw an allowed diagram that makes it true.${either ? ' Then check for an either-or pair.' : ''}`,
          `Answer: ${answer}.`
        ],
        method,
        hints,
        commonMistakes: mistakes
      };
    }
  };
}

const BASIC_HINTS = ['Draw the circles with as little overlap as the statements allow; a conclusion follows only if no allowed drawing breaks it.', '"All A are B" lets you say "Some B are A", but never "All B are A".'];

const singleConversion = {
  id: 'sy-gen-conversion',
  version: 1,
  topicId: 'syllogism',
  conceptId: 'sy-statements',
  difficulty: 'easy',
  type: 'single_choice',
  formulaIds: ['sy-conversion-f'],
  formatValue: (v) => v,
  estimatedSeconds: 45,
  params(rng) {
    const terms = rng.shuffle(rng.pick(TERM_SETS)).slice(0, 2);
    const statement = { q: rng.pick(['all', 'some', 'no']), a: 0, b: 1 };
    const all = [];
    for (const q of ['all', 'some', 'no', 'someNot']) for (const [a, b] of [[0, 1], [1, 0]]) if (!same({ q, a, b }, statement)) all.push({ q, a, b });
    const good = all.filter((c) => follows(2, [statement], c));
    const bad = all.filter((c) => !follows(2, [statement], c));
    if (!good.length || bad.length < 3) return null;
    return { terms, statement, answer: rng.pick(good), wrong: rng.shuffle(bad).slice(0, 3) };
  },
  answer: ({ terms, answer }) => statementText(terms, answer),
  distractors: ({ terms, wrong }) => wrong.map((c) => ({ value: statementText(terms, c), why: 'not implied' })),
  verify: ({ terms, statement, answer, wrong }, value) =>
    followsByMembers(2, [statement], answer) && statementText(terms, answer) === value && wrong.every((c) => !followsByMembers(2, [statement], c)),
  render({ terms, statement, answer, wrong }, { fmt }) {
    return {
      context: `Statement: ${statementText(terms, statement)}`,
      question: 'Which one of the following definitely follows from the statement?',
      explanation: `${fmt(statementText(terms, answer))} is true in every diagram the statement allows. Each of the others fails in at least one: ${wrong.map((c) => statementText(terms, c).replace(/\.$/, '')).join('; ')}.`,
      solutionSteps: ['Draw the statement with the least overlap it allows.', 'Check each option against every way the circles may sit: only one survives every drawing.'],
      method: 'All → Some (reversed is fine); Some ↔ Some; No ↔ No; nothing else converts.',
      hints: BASIC_HINTS,
      commonMistakes: ['Turning "All A are B" round into "All B are A".', 'Thinking "Some A are B" means "Some A are not B" as well.']
    };
  }
};

export const syllogismTemplates = [
  singleConversion,
  syllogismTemplate({
    id: 'sy-gen-definite',
    conceptId: 'sy-definite',
    difficulty: 'medium',
    targets: [VERDICTS[0], VERDICTS[1], VERDICTS[3], VERDICTS[4]],
    makeStatements: (rng) => twoStatements(rng, FORMS),
    conclusionOptions: () => ({}),
    formulaIds: ['sy-chain-f', 'sy-venn-f'],
    method: 'Least-overlap Venn diagram, then try to break each conclusion.',
    hints: BASIC_HINTS,
    mistakes: ['Deciding from everyday sense instead of the statements.', 'Accepting a conclusion because it is true in the first diagram you drew.']
  }),
  syllogismTemplate({
    id: 'sy-gen-either',
    conceptId: 'sy-either',
    difficulty: 'medium',
    targets: [VERDICTS[2], VERDICTS[2], VERDICTS[3], VERDICTS[0], VERDICTS[1]],
    makeStatements: (rng) => twoStatements(rng, FORMS),
    conclusionOptions: () => ({ forms: ['some', 'no', 'all', 'someNot'] }),
    formulaIds: ['sy-either-f'],
    method: 'If neither conclusion follows, check whether they are a complementary pair (Some/No, or All/Some-not) on the same two terms.',
    hints: ['First check each conclusion on its own.', 'If neither follows, ask: can both be false at once? Some–No and All–Some not pairs never can.'],
    mistakes: ['Marking "either" for two conclusions about different pairs of terms.', 'Marking "either" when one conclusion already follows.']
  }),
  syllogismTemplate({
    id: 'sy-gen-possibility',
    conceptId: 'sy-possibility',
    difficulty: 'complex',
    targets: [VERDICTS[0], VERDICTS[1], VERDICTS[3], VERDICTS[4]],
    makeStatements: (rng) => twoStatements(rng, FORMS),
    conclusionOptions: (i) => ({ possible: i === 0 ? 1 : 0.5, forms: ['all', 'some', 'no'] }),
    formulaIds: ['sy-possibility-f'],
    method: 'A possibility follows when at least one allowed diagram makes it true, and none of the statements forbids it.',
    hints: ['A possibility conclusion needs just one allowed drawing in which it is true.', 'It fails only if a statement rules it out (for example "No A are B" rules out "Some A being B").'],
    mistakes: ['Rejecting a possibility because it is not certain.', 'Accepting a possibility that a statement directly contradicts.']
  }),
  syllogismTemplate({
    id: 'sy-gen-only-few',
    conceptId: 'sy-only-few',
    difficulty: 'medium',
    targets: [VERDICTS[0], VERDICTS[1], VERDICTS[3], VERDICTS[4]],
    makeStatements: (rng) => {
      const [s1, s2] = twoStatements(rng, FORMS);
      return rng.chance(0.5) ? [{ ...s1, q: 'onlyFew' }, s2] : [s1, { ...s2, q: 'onlyFew' }];
    },
    conclusionOptions: () => ({ possible: 0.4, forms: ['all', 'some', 'no', 'someNot'] }),
    formulaIds: ['sy-only-few-f'],
    method: '"Only a few A are B" means some A are B and some A are not B: All A being B is then impossible.',
    hints: ['Split "Only a few A are B" into two statements: Some A are B, and Some A are not B.', 'So "All A are B" (even as a possibility) cannot follow.'],
    mistakes: ['Treating "only a few" as plain "some".', 'Accepting "All A being B is a possibility" after an "only a few" statement.']
  }),
  syllogismTemplate({
    id: 'sy-gen-three',
    conceptId: 'sy-definite',
    difficulty: 'complex',
    k: 4,
    targets: [VERDICTS[0], VERDICTS[1], VERDICTS[2], VERDICTS[3], VERDICTS[4]],
    makeStatements: (rng) => {
      const [s1, s2] = twoStatements(rng, FORMS);
      const s3 = rng.chance(0.5) ? { q: rng.pick(FORMS), a: 2, b: 3 } : { q: rng.pick(FORMS), a: 3, b: 2 };
      return [s1, s2, s3];
    },
    conclusionOptions: () => ({ possible: 0.2 }),
    formulaIds: ['sy-chain-f', 'sy-venn-f'],
    method: 'Link the statements through the shared terms, one pair at a time.',
    hints: BASIC_HINTS,
    mistakes: ['Linking two terms that share no statement as if they did.', 'Forgetting that a "No" link stops an "All" chain from carrying through.']
  })
];

/* ------------------------------ inequalities ------------------------------ */

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const WEIGHTED_OPS = ['>', '>', '≥', '≥', '=', '≤', '≤', '<', '<'];

function chain(rng, letters) {
  const tokens = [letters[0]];
  for (let i = 1; i < letters.length; i++) tokens.push(rng.pick(WEIGHTED_OPS), letters[i]);
  return tokens;
}

/** A conclusion about two letters that is safe from the ≥-versus-> convention. */
function safeConclusion(rng, relations, letters, used = []) {
  for (let i = 0; i < 20; i++) {
    const [x, y] = rng.shuffle(letters).slice(0, 2);
    // Two letters already side by side in a statement make a give-away conclusion.
    if (relations.some((r) => (r.x === x && r.y === y) || (r.x === y && r.y === x))) continue;
    const op = rng.pick(OPS);
    const derived = pathRelation(relations, x, y);
    if (isContested(derived, op)) continue;
    if (used.some((c) => c.x === x && c.y === y && c.op === op)) continue;
    return { x, op, y };
  }
  return null;
}

const conclusionText = (c) => `${c.x} ${c.op} ${c.y}`;

function explainIq(relations, c1, c2) {
  const line = (c, label) => {
    const d = pathRelation(relations, c.x, c.y);
    return d === 'none'
      ? `${label}: between ${c.x} and ${c.y} the signs point both ways, so there is no definite relation; ${label} is not true.`
      : `${label}: the chain gives ${c.x} ${d} ${c.y}, so ${c.x} ${c.op} ${c.y} is ${d === c.op ? 'true' : 'not true'}.`;
  };
  return `${line(c1, 'I')} ${line(c2, 'II')}`;
}

function iqTemplate({ id, conceptId, difficulty, targets, makeStatements, coded = false, formulaIds, method, hints, mistakes, pairBias = 0 }) {
  return {
    id,
    version: 1,
    topicId: 'reasoning-inequalities',
    conceptId,
    difficulty,
    type: 'single_choice',
    formulaIds,
    formatValue: (v) => v,
    optionOrder: IQ_VERDICTS,
    optionCount: 5,
    estimatedSeconds: coded ? 75 : 50,
    params(rng) {
      const statements = makeStatements(rng);
      const relations = statements.flatMap(chainRelations);
      const letters = [...new Set(statements.flat().filter((t) => !OPS.includes(t)))];
      const symbols = coded ? Object.fromEntries(rng.shuffle(['@', '#', '$', '%', '&']).map((s, i) => [OPS[i], s])) : null;
      const target = rng.pick(targets);
      for (let i = 0; i < 60; i++) {
        const c1 = safeConclusion(rng, relations, letters);
        if (!c1) continue;
        // Either-or practice: often ask the complementary pair about the same two letters.
        let c2;
        if (rng.chance(pairBias)) {
          const op = rng.pick(OPS.filter((o) => o !== c1.op));
          c2 = isContested(pathRelation(relations, c1.x, c1.y), op) ? null : { x: c1.x, op, y: c1.y };
        } else c2 = safeConclusion(rng, relations, letters, [c1]);
        if (!c2) continue;
        if (iqVerdict(relations, c1, c2) === target) return { statements, relations, c1, c2, symbols };
      }
      return null;
    },
    answer: ({ relations, c1, c2 }) => iqVerdict(relations, c1, c2),
    distractors: ({ relations, c1, c2 }) => IQ_VERDICTS.filter((v) => v !== iqVerdict(relations, c1, c2)).map((value) => ({ value, why: 'another verdict' })),
    verify: ({ relations, c1, c2 }, value) =>
      iqVerdictBrute(relations, c1, c2) === value && [c1, c2].every((c) => pathRelation(relations, c.x, c.y) === bruteRelation(relations, c.x, c.y)),
    render({ statements, relations, c1, c2, symbols }, { fmt }) {
      const code = (tokens) => tokens.map((t) => (symbols && OPS.includes(t) ? symbols[t] : t)).join(' ');
      const codeC = (c) => (symbols ? `${c.x} ${symbols[c.op]} ${c.y}` : conclusionText(c));
      const legend = symbols ? `${OPS.map((op) => `'P ${symbols[op]} Q' means 'P ${SIGN_MEANING[op]} Q'.`).join('\n')}\n` : '';
      const answer = iqVerdict(relations, c1, c2);
      const decoded = symbols ? ` Decoded, the statements read ${statements.map((s) => s.join(' ')).join('; ')}.` : '';
      return {
        context: `${legend}Statement${statements.length > 1 ? 's' : ''}: ${statements.map(code).join('; ')}\nConclusions:\nI. ${codeC(c1)}\nII. ${codeC(c2)}`,
        question: 'Which of the conclusions is definitely true?',
        explanation: `${decoded.trim()} ${explainIq(relations, c1, c2)}${answer === IQ_VERDICTS[2] ? ' Neither is certain alone, but exactly one of the two must hold.' : ''} Answer: ${fmt(answer)}.`.trim(),
        solutionSteps: [
          ...(symbols ? ['Rewrite every symbol as its sign first.'] : []),
          'For each conclusion, find the path between its two letters through the statements.',
          'If every sign on the path points the same way (= can be ignored), the relation is definite: strict if any sign is strict.',
          'A sign pointing the other way anywhere on the path means no definite relation.',
          `Answer: ${answer}.`
        ],
        method,
        hints,
        commonMistakes: mistakes
      };
    }
  };
}

const IQ_HINTS = ['Follow the chain from the first letter of a conclusion to the second.', 'One sign facing the other way (a > and a < on the same path) breaks the chain.'];

/** One attempt at a missing-sign question: a chain, a gap, two conclusions and the one sign that works. */
function tryMissing(rng) {
  const letters = rng.shuffle(LETTERS).slice(0, 5);
  const tokens = chain(rng, letters);
  const gap = 2 * rng.int(1, 4) - 1; // an operator position
  // Two conclusions spanning the gap; exactly one sign must make both definitely true.
  const pairs = [];
  const before = letters.slice(0, (gap + 1) / 2);
  const after = letters.slice((gap + 1) / 2);
  for (const x of before) for (const y of after) pairs.push([x, y]);
  const [p1, p2] = rng.shuffle(pairs).slice(0, 2);
  if (!p2) return null;
  // Fill the gap with a sign, read the relations it gives, and ask for those.
  const filledIn = tokens.slice();
  filledIn[gap] = rng.pick(OPS);
  const given = chainRelations(filledIn);
  const targets = [p1, p2].map(([x, y]) => ({ x, op: pathRelation(given, x, y), y }));
  if (targets.some((t) => t.op === 'none')) return null;
  const working = OPS.filter((op) => {
    const t = tokens.slice();
    t[gap] = op;
    const relations = chainRelations(t);
    return targets.every((c) => {
      const d = pathRelation(relations, c.x, c.y);
      return d === c.op;
    });
  });
  if (working.length !== 1) return null;
  // No option may be "true but weaker" (the ≥-versus-> convention).
  const contested = OPS.some((op) => {
    const t = tokens.slice();
    t[gap] = op;
    const relations = chainRelations(t);
    return targets.some((c) => isContested(pathRelation(relations, c.x, c.y), c.op));
  });
  if (contested) return null;
  return { tokens, gap, targets, answer: working[0] };
}

const missingSign = {
  id: 'iq-gen-missing',
  version: 1,
  topicId: 'reasoning-inequalities',
  conceptId: 'iq-missing',
  difficulty: 'complex',
  type: 'single_choice',
  formulaIds: ['iq-path-f'],
  formatValue: (v) => v,
  optionOrder: OPS,
  optionCount: 5,
  estimatedSeconds: 75,
  params(rng) {
    // Most random chains give no unique sign; try a few before giving up on this seed.
    for (let i = 0; i < 30; i++) {
      const found = tryMissing(rng);
      if (found) return found;
    }
    return null;
  },
  answer: ({ answer }) => answer,
  distractors: ({ answer }) => OPS.filter((op) => op !== answer).map((value) => ({ value, why: 'another sign' })),
  verify: ({ tokens, gap, targets }, value) =>
    OPS.filter((op) => {
      const t = tokens.slice();
      t[gap] = op;
      const relations = chainRelations(t);
      return targets.every((c) => bruteRelation(relations, c.x, c.y) === c.op);
    }).join() === value,
  render({ tokens, gap, targets, answer }, { fmt }) {
    const shown = tokens.map((t, i) => (i === gap ? '?' : t)).join(' ');
    const filled = tokens.map((t, i) => (i === gap ? answer : t)).join(' ');
    return {
      context: `Expression: ${shown}\nConclusions that must definitely be true:\nI. ${conclusionText(targets[0])}\nII. ${conclusionText(targets[1])}`,
      question: 'Which sign should replace the question mark so that both conclusions are definitely true?',
      explanation: `With ${fmt(answer)} the expression reads ${filled}, which gives ${targets.map(conclusionText).join(' and ')}. Every other sign either breaks the chain or gives a different relation for at least one conclusion.`,
      solutionSteps: [
        'Both conclusions pass through the missing sign, so try each sign in turn.',
        'Read the relation between the two letters of each conclusion with that sign in place.',
        `Only ${answer} makes both exactly true: ${filled}.`
      ],
      method: 'Try each sign; keep the one that makes every required relation exact.',
      hints: ['Write the five signs in a row and test them one by one.', 'A conclusion with "=" needs every sign on its path to be "="; a strict conclusion needs at least one strict sign.'],
      commonMistakes: ['Choosing ≥ when the conclusion needs a strict >.', 'Checking only one of the two conclusions.']
    };
  }
};

export const inequalityTemplates = [
  iqTemplate({
    id: 'iq-gen-direct',
    conceptId: 'iq-direct',
    difficulty: 'easy',
    targets: [IQ_VERDICTS[0], IQ_VERDICTS[1], IQ_VERDICTS[3], IQ_VERDICTS[4]],
    makeStatements: (rng) => [chain(rng, rng.shuffle(LETTERS).slice(0, rng.int(4, 5)))],
    formulaIds: ['iq-path-f'],
    method: 'Follow the path between the two letters; all signs must point one way.',
    hints: IQ_HINTS,
    mistakes: ['Ignoring a sign that points the other way in the middle of the chain.', 'Taking ≥ along a path as strict >.']
  }),
  iqTemplate({
    id: 'iq-gen-combined',
    conceptId: 'iq-combined',
    difficulty: 'medium',
    targets: [IQ_VERDICTS[0], IQ_VERDICTS[1], IQ_VERDICTS[3], IQ_VERDICTS[4]],
    makeStatements: (rng) => {
      const letters = rng.shuffle(LETTERS).slice(0, 6);
      const one = chain(rng, letters.slice(0, 4));
      const shared = rng.pick(letters.slice(0, 4));
      const two = chain(rng, rng.chance(0.5) ? [letters[4], shared, letters[5]] : [shared, letters[4], letters[5]]);
      return [one, two];
    },
    formulaIds: ['iq-path-f', 'iq-combine-f'],
    method: 'Join the statements at their common letter, then follow the path.',
    hints: ['Find the letter the two statements share; that is where they join.', ...IQ_HINTS.slice(1)],
    mistakes: ['Comparing letters from different statements without going through the shared letter.', 'Flipping a sign when rewriting a statement the other way round, then forgetting to flip it back.']
  }),
  iqTemplate({
    id: 'iq-gen-either',
    conceptId: 'iq-either',
    difficulty: 'medium',
    targets: [IQ_VERDICTS[2], IQ_VERDICTS[2], IQ_VERDICTS[3], IQ_VERDICTS[0]],
    pairBias: 0.7,
    makeStatements: (rng) => [chain(rng, rng.shuffle(LETTERS).slice(0, 5))],
    formulaIds: ['iq-either-f'],
    method: 'Either-or: neither is true alone, both are about the same two letters, and exactly one of them must hold.',
    hints: ['Check each conclusion first; either-or only matters when neither is true.', 'P ≥ Q splits into P > Q or P = Q; and P > Q, P ≤ Q are exact opposites.'],
    mistakes: ['Choosing either-or for two conclusions about different letters.', 'Choosing either-or when one conclusion is already true.']
  }),
  iqTemplate({
    id: 'iq-gen-coded',
    conceptId: 'iq-coded',
    difficulty: 'complex',
    coded: true,
    targets: [IQ_VERDICTS[0], IQ_VERDICTS[1], IQ_VERDICTS[2], IQ_VERDICTS[3], IQ_VERDICTS[4]],
    pairBias: 0.3,
    makeStatements: (rng) => {
      const letters = rng.shuffle(LETTERS).slice(0, 5);
      return [chain(rng, letters.slice(0, 3)), chain(rng, [letters[2], letters[3], letters[4]])];
    },
    formulaIds: ['iq-coded-f'],
    method: 'Decode every symbol into a sign before reading any conclusion.',
    hints: ['"Not smaller than" is ≥; "neither smaller than nor equal to" is >.', 'Write the decoded chain once, then solve it like a normal inequality.'],
    mistakes: ['Decoding "not greater than" as <.', 'Decoding the conclusions with a different key from the statements.']
  }),
  missingSign
];
