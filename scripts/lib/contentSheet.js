/**
 * Topic content <-> spreadsheet rows.
 *
 * One workbook per topic. Each sheet is an array of rows (arrays of cells: string,
 * number, boolean or null), the first row being the header:
 *
 *   Topic      key / value pairs: the topic's id
 *   Concepts   one row per concept, in teaching order
 *   Formulas   one row per formula card
 *   Levels     one row per level, in order
 *   Lessons    one row per lesson block, grouped by level
 *   Questions  one row per question: options A–E, the correct letter(s) or number,
 *              steps, hints and mistakes as columns
 *
 * `toSheets(content)` and `fromSheets(sheets)` are exact inverses for everything the
 * app stores: anything a row cannot express in its ordinary columns (a figure, a
 * chart, matching pairs…) is carried in that row's `extra` cell as JSON. This file
 * does no file access; scripts/content-sheet.js reads and writes the actual files.
 *
 * The lists below mirror scripts/validate-data.js, which stays the final judge:
 * the importer runs it on the result before keeping anything.
 */

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];
const OPTION_TYPES = new Set([
  'single_choice',
  'multiple_choice',
  'formula_recognition',
  'formula_selection',
  'method_recognition',
  'statement_evaluation',
  'assertion_reason',
  'next_step',
  'identify_error',
  'estimate'
]);
export const QUESTION_TYPES = [...OPTION_TYPES, 'numerical_input', 'match_following', 'ordering'];
export const LEVEL_TYPES = [
  'concept',
  'formula_revision',
  'formula_recognition',
  'method_recognition',
  'guided_practice',
  'easy_practice',
  'medium_practice',
  'complex_practice',
  'mixed_practice',
  'challenge'
];
export const DIFFICULTIES = ['easy', 'medium', 'complex'];
export const LEARNING_STAGES = ['foundation', 'recognition', 'guided', 'independent', 'mixed', 'challenge'];
export const LESSON_BLOCK_TYPES = ['text', 'example', 'formula', 'callout', 'check', 'simulation', 'figure'];
export const CARD_KINDS = ['formula', 'shortcut'];
const DEFAULT_STAGE = { easy: 'independent', medium: 'guided', complex: 'challenge' };
const NONE = 'none';
/** Level types that teach rather than quiz, so they need no questions of their own. */
const NO_QUESTIONS = new Set(['concept', 'formula_revision']);

export const SHEET_NAMES = ['Topic', 'Concepts', 'Formulas', 'Levels', 'Lessons', 'Questions'];

/**
 * Every column: [name, needed, what goes in it]. The header row and the Guide sheet
 * in each workbook both come from this one list.
 */
export const COLUMN_GUIDE = {
  Topic: [
    ['key', 'yes', 'Leave as it is.'],
    ['value', 'yes', 'For topicId: the topic\'s id, exactly as in src/data/topics.json.']
  ],
  Concepts: [
    ['id', 'yes', 'Short unique id, for example pct-change. Never change it once learners have used it.'],
    ['name', 'yes', 'Name shown to learners.'],
    ['description', 'yes', 'One sentence on what the concept covers.'],
    ['extra', 'no', 'Leave empty.']
  ],
  Formulas: [
    ['id', 'yes', 'Short unique id, for example pct-change-formula.'],
    ['concept', 'yes', 'Id of the concept it belongs to (from the Concepts sheet).'],
    ['kind', 'no', 'formula or shortcut. A shortcut is a faster route to an answer; it appears in the shortcut sheet instead of the formula sheet. Blank means formula.'],
    ['title', 'yes', 'Name of the formula card.'],
    ['prompt', 'yes', 'Front of the flashcard: the question that recalls the formula.'],
    ['formula', 'yes', 'The formula itself.'],
    ['explanation', 'yes', 'Why it works, in a sentence or two.'],
    ['example', 'no', 'A short worked example.'],
    ['commonMistake', 'no', 'The usual way people get it wrong.'],
    ['applicationPrompt', 'no', 'A quick question that applies the formula.'],
    ['variables', 'no', 'One per line inside the cell, as: symbol = meaning.'],
    ['tags', 'no', 'Comma-separated.'],
    ['difficulty', 'no', 'easy, medium or complex. Blank means easy.'],
    ['extra', 'no', 'Leave empty.']
  ],
  Levels: [
    ['id', 'no', 'Blank means <topic>-level-<order>. Never change it once learners have used it.'],
    ['order', 'no', 'Position in the topic, starting at 0. Blank means the row\'s position.'],
    ['title', 'yes', 'Level name shown to learners.'],
    ['description', 'yes', 'One line under the title.'],
    ['type', 'yes', `One of: ${LEVEL_TYPES.join(', ')}.`],
    ['difficulty', 'no', 'easy, medium or complex. Blank means easy.'],
    ['minutes', 'no', 'Estimated minutes. Blank means 8.'],
    ['xp', 'no', 'XP for completing the level. Blank means 30.'],
    ['prerequisites', 'no', 'Level ids, comma-separated. Blank means the level above; write none for no prerequisite.'],
    ['concepts', 'no', 'Concept ids the level covers, comma-separated.'],
    ['formulas', 'no', 'Formula ids to revise (formula_revision levels), comma-separated.'],
    ['questions', 'no', 'Question ids in order, comma-separated. Blank means every question on the Questions sheet whose level is this one.'],
    ['queryDifficulties', 'no', 'To pick questions from the whole topic instead: the difficulties to draw from, comma-separated.'],
    ['queryCount', 'no', 'How many questions the query picks. Blank means 8.'],
    ['queryConcepts', 'no', 'Limit the query to these concept ids, comma-separated.'],
    ['queryPreferUnseen', 'no', 'TRUE or FALSE. Blank means TRUE.'],
    ['minAccuracy', 'no', 'Percentage of correct answers needed to pass, for example 70.'],
    ['minAttempted', 'no', 'Questions that must be attempted to pass.'],
    ['minRecalled', 'no', 'Formula cards that must be recalled to pass (formula_revision levels).'],
    ['timerSeconds', 'no', 'Seconds allowed per question (challenge levels).'],
    ['extra', 'no', 'Leave empty.']
  ],
  Lessons: [
    ['level', 'yes', 'Id of the level this block belongs to. Blocks appear in sheet order.'],
    ['type', 'yes', `One of: ${LESSON_BLOCK_TYPES.join(', ')}.`],
    ['title', 'no', 'Heading for text, example and formula blocks.'],
    ['body', 'yes', 'The text of the block (not needed for check). For figure blocks it explains the picture, which goes in the extra column as {"figure": {…}}.'],
    ['caption', 'no', 'Small line under a formula block.'],
    ['tone', 'no', 'For callout blocks: tip, warning or info.'],
    ['question', 'no', 'For check blocks: the id of the question to ask.'],
    ['simulation', 'no', 'For simulation blocks: the id of the simulation to show (see the Explore page).'],
    ['extra', 'no', 'Leave empty.']
  ],
  Questions: [
    ['id', 'no', 'Blank means the next free <topic>-q-NNN. Never change it once learners have used it.'],
    ['concept', 'yes', 'Id of the concept it tests (from the Concepts sheet).'],
    ['level', 'yes', 'Id of the level it belongs to (from the Levels sheet).'],
    ['difficulty', 'yes', 'easy, medium or complex.'],
    ['stage', 'no', `One of: ${LEARNING_STAGES.join(', ')}. Blank: easy means independent, medium guided, complex challenge.`],
    ['type', 'yes', `One of: ${QUESTION_TYPES.join(', ')}.`],
    ['question', 'yes', 'The question text.'],
    ['context', 'no', 'Extra passage shown above the question.'],
    ['optionA', 'choice', 'First option. Choice questions need at least A and B.'],
    ['optionB', 'choice', 'Second option.'],
    ['optionC', 'no', 'Third option.'],
    ['optionD', 'no', 'Fourth option.'],
    ['optionE', 'no', 'Fifth option.'],
    ['correct', 'yes', 'Choice questions: the letter of the right option (B), or several for multiple_choice (A, C). numerical_input: the number.'],
    ['tolerance', 'no', 'numerical_input: how far off still counts as right. Blank means exact.'],
    ['unit', 'no', 'numerical_input: unit shown beside the answer box, for example %.'],
    ['explanation', 'yes', 'The full worked answer shown after answering.'],
    ['step1', 'no', 'Solution steps, one per cell, in order.'],
    ['step2', 'no', ''],
    ['step3', 'no', ''],
    ['step4', 'no', ''],
    ['step5', 'no', ''],
    ['hint1', 'no', 'Hints from gentlest to strongest. Give them for medium and complex questions.'],
    ['hint2', 'no', ''],
    ['hint3', 'no', ''],
    ['mistake1', 'no', 'A common wrong approach.'],
    ['mistake2', 'no', ''],
    ['method', 'no', 'Name of the method used, for example Successive change.'],
    ['formulas', 'no', 'Formula ids used, comma-separated.'],
    ['tags', 'no', 'Comma-separated.'],
    ['seconds', 'no', 'Expected solving time. Blank means 60.'],
    ['active', 'no', 'FALSE hides the question without deleting it. Blank means shown.'],
    ['extra', 'no', 'Tables, charts, figures and other special parts, as JSON. Leave empty for ordinary questions.']
  ]
};

export const HEADERS = Object.fromEntries(SHEET_NAMES.map((name) => [name, COLUMN_GUIDE[name].map(([column]) => column)]));

/**
 * Columns a spreadsheet program must keep as typed. Without this, Excel turns an
 * option of 1/2 into a date, 3:4 into a time and 25% into 0.25.
 */
export const TEXT_COLUMNS = {
  Topic: ['value'],
  Formulas: ['formula'],
  Questions: ['optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correct', 'unit']
};

/** Columns offered as a drop-down list in the workbook. */
export const CHOICE_COLUMNS = {
  Formulas: { kind: CARD_KINDS, difficulty: DIFFICULTIES },
  Levels: { type: LEVEL_TYPES, difficulty: DIFFICULTIES },
  Lessons: { type: LESSON_BLOCK_TYPES },
  Questions: { difficulty: DIFFICULTIES, stage: LEARNING_STAGES, type: QUESTION_TYPES }
};

/* ------------------------------ cell helpers ------------------------------ */

const blank = (cell) => cell === null || cell === undefined || (typeof cell === 'string' && cell.trim() === '');
const text = (cell) => (blank(cell) ? '' : String(cell).replace(/\r\n?/g, '\n').trim());
const list = (cell) => text(cell).split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
const join = (items) => (items?.length ? items.join(', ') : null);

function number(cell) {
  if (blank(cell)) return null;
  const value = typeof cell === 'number' ? cell : Number(String(cell).replace(/,/g, '').trim());
  return Number.isFinite(value) ? value : NaN;
}

function bool(cell, fallback) {
  if (blank(cell)) return fallback;
  if (typeof cell === 'boolean') return cell;
  return !/^(false|no|0)$/i.test(String(cell).trim());
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  return value;
}
const deepEqual = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));

/** Order an object's keys as the hand-written files do, unknown keys last. */
function ordered(object, keys) {
  const out = {};
  for (const key of keys) if (key in object) out[key] = object[key];
  for (const key of Object.keys(object)) if (!(key in out)) out[key] = object[key];
  return out;
}

const KEY_ORDER = {
  concept: ['id', 'topicId', 'name', 'description', 'sortOrder'],
  formula: ['id', 'topicId', 'conceptId', 'kind', 'title', 'prompt', 'formula', 'variables', 'explanation', 'example', 'commonMistake', 'applicationPrompt', 'tags', 'difficulty'],
  level: [
    'id', 'topicId', 'order', 'title', 'description', 'type', 'difficulty', 'estimatedMinutes', 'prerequisiteLevelIds', 'conceptIds',
    'formulaIds', 'questionIds', 'questionQuery', 'lesson', 'passCriteria', 'timerSecondsPerQuestion', 'xpReward'
  ],
  question: [
    'id', 'topicId', 'conceptId', 'levelId', 'difficulty', 'learningStage', 'type', 'question', 'context', 'table', 'chart', 'figure',
    'assertion', 'reason', 'options', 'correctAnswer', 'answer', 'pairs', 'steps', 'explanation', 'solutionSteps', 'formulaIds', 'method',
    'hints', 'commonMistakes', 'tags', 'estimatedSeconds', 'source', 'version', 'active'
  ]
};

/** Row object -> array in header order. */
const toRow = (sheet, values) => HEADERS[sheet].map((column) => values[column] ?? null);

/**
 * Finish a row for export: whatever the ordinary columns cannot reproduce exactly
 * goes into `extra`, so importing the row always gives back the original object.
 */
function withExtra(sheet, values, original, parse) {
  const parsed = parse(values);
  const extra = {};
  for (const key of new Set([...Object.keys(original), ...Object.keys(parsed)])) {
    if (!deepEqual(original[key], parsed[key])) extra[key] = key in original ? original[key] : null;
  }
  return toRow(sheet, { ...values, extra: Object.keys(extra).length ? JSON.stringify(extra) : null });
}

/** Apply a row's `extra` JSON over the parsed object (a null value removes the key). */
function applyExtra(object, cell, report) {
  if (blank(cell)) return object;
  let extra;
  try {
    extra = JSON.parse(text(cell));
  } catch (error) {
    report(`the "extra" cell is not valid JSON (${error.message})`);
    return object;
  }
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) {
    report('the "extra" cell must be a JSON object, like {"table": {...}}');
    return object;
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value === null) delete object[key];
    else object[key] = value;
  }
  return object;
}

/* ------------------------------- row parsers ------------------------------- */
/* Each takes a row object (column -> cell) plus context and returns the JSON object. */

function parseConcept(row, { topicId, index }) {
  return { id: text(row.id), topicId, name: text(row.name), description: text(row.description), sortOrder: index + 1 };
}

function parseFormula(row, { topicId }) {
  const variables = text(row.variables)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(' = ');
      return at < 0 ? { symbol: line, meaning: '' } : { symbol: line.slice(0, at).trim(), meaning: line.slice(at + 3).trim() };
    });
  return {
    id: text(row.id),
    topicId,
    conceptId: text(row.concept),
    // A card is a formula unless it says otherwise, so only shortcuts carry a kind.
    ...(blank(row.kind) || text(row.kind) === 'formula' ? {} : { kind: text(row.kind) }),
    title: text(row.title),
    prompt: text(row.prompt),
    formula: text(row.formula),
    variables,
    explanation: text(row.explanation),
    example: text(row.example),
    commonMistake: text(row.commonMistake),
    applicationPrompt: text(row.applicationPrompt),
    tags: list(row.tags),
    difficulty: text(row.difficulty) || 'easy'
  };
}

function parseLevel(row, { topicId, index, previousId }) {
  const order = blank(row.order) ? index : number(row.order);
  const level = {
    id: text(row.id) || `${topicId}-level-${order}`,
    topicId,
    order,
    title: text(row.title),
    description: text(row.description),
    type: text(row.type),
    difficulty: text(row.difficulty) || 'easy',
    estimatedMinutes: number(row.minutes) ?? 8,
    // Blank means "after the level above"; "none" means no prerequisite.
    prerequisiteLevelIds: blank(row.prerequisites) ? (previousId ? [previousId] : []) : text(row.prerequisites).toLowerCase() === NONE ? [] : list(row.prerequisites)
  };
  if (!blank(row.concepts)) level.conceptIds = list(row.concepts);
  if (!blank(row.formulas)) level.formulaIds = list(row.formulas);
  if (!blank(row.questions)) level.questionIds = list(row.questions);
  if (!blank(row.queryCount) || !blank(row.queryDifficulties)) {
    level.questionQuery = {
      topicId,
      difficulties: blank(row.queryDifficulties) ? [...DIFFICULTIES] : list(row.queryDifficulties),
      count: number(row.queryCount) ?? 8,
      preferUnseen: bool(row.queryPreferUnseen, true)
    };
    if (!blank(row.queryConcepts)) level.questionQuery.conceptIds = list(row.queryConcepts);
  }
  const pass = {};
  if (!blank(row.minAccuracy)) pass.minimumAccuracy = number(row.minAccuracy);
  if (!blank(row.minAttempted)) pass.minimumQuestionsAttempted = number(row.minAttempted);
  if (!blank(row.minRecalled)) pass.minimumRecalled = number(row.minRecalled);
  if (Object.keys(pass).length) level.passCriteria = pass;
  if (!blank(row.timerSeconds)) level.timerSecondsPerQuestion = number(row.timerSeconds);
  level.xpReward = number(row.xp) ?? 30;
  return level;
}

function parseLessonBlock(row) {
  const type = text(row.type);
  const block = { type };
  if (type === 'check') {
    block.questionId = text(row.question);
    return block;
  }
  if (type === 'simulation') {
    block.simulationId = text(row.simulation);
    return block;
  }
  if (!blank(row.tone)) block.tone = text(row.tone);
  if (!blank(row.title)) block.title = text(row.title);
  block.body = text(row.body);
  if (!blank(row.caption)) block.caption = text(row.caption);
  return block;
}

function parseQuestion(row, { topicId }) {
  const type = text(row.type);
  const difficulty = text(row.difficulty);
  const question = {
    id: text(row.id),
    topicId,
    conceptId: text(row.concept),
    levelId: text(row.level),
    difficulty,
    learningStage: text(row.stage) || DEFAULT_STAGE[difficulty] || 'independent',
    type,
    question: text(row.question)
  };
  if (!blank(row.context)) question.context = text(row.context);

  if (OPTION_TYPES.has(type)) {
    const options = OPTION_LETTERS.map((letter) => row[`option${letter}`]);
    while (options.length && blank(options[options.length - 1])) options.pop();
    question.options = options.map((cell, i) => ({ id: OPTION_LETTERS[i].toLowerCase(), text: text(cell) }));
    question.correctAnswer = list(row.correct).map((letter) => letter.toLowerCase());
  } else if (type === 'numerical_input') {
    question.answer = { value: number(row.correct), tolerance: number(row.tolerance) ?? 0 };
    if (!blank(row.unit)) question.answer.unit = text(row.unit);
  }

  const cells = (prefix, count) =>
    Array.from({ length: count }, (_, i) => row[`${prefix}${i + 1}`]).filter((cell) => !blank(cell)).map(text);
  return {
    ...question,
    explanation: text(row.explanation),
    solutionSteps: cells('step', 5),
    formulaIds: list(row.formulas),
    method: text(row.method),
    hints: cells('hint', 3).map((hint, i) => ({ level: i + 1, text: hint })),
    commonMistakes: cells('mistake', 2),
    tags: list(row.tags),
    estimatedSeconds: number(row.seconds) ?? 60,
    source: 'original',
    version: 1,
    active: bool(row.active, true)
  };
}

/** Questions a level gets when its `questions` cell is blank: those written for it, in sheet order. */
function ownQuestionIds(levelId, questions) {
  return questions.filter((question) => question.levelId === levelId).map((question) => question.id);
}

/* --------------------------------- export --------------------------------- */

/** `{ topicId, concepts, formulas, levels, questions }` -> `{ SheetName: rows }`. */
export function toSheets(content) {
  const { topicId } = content;
  const sheets = Object.fromEntries(SHEET_NAMES.map((name) => [name, [HEADERS[name]]]));

  sheets.Topic.push(['topicId', topicId]);

  content.concepts.forEach((concept, index) => {
    const values = { id: concept.id, name: concept.name, description: concept.description };
    sheets.Concepts.push(withExtra('Concepts', values, concept, (v) => parseConcept(v, { topicId, index })));
  });

  for (const formula of content.formulas) {
    const values = {
      id: formula.id,
      concept: formula.conceptId,
      kind: formula.kind,
      title: formula.title,
      prompt: formula.prompt,
      formula: formula.formula,
      explanation: formula.explanation,
      example: formula.example,
      commonMistake: formula.commonMistake,
      applicationPrompt: formula.applicationPrompt,
      variables: (formula.variables || []).map((v) => `${v.symbol} = ${v.meaning}`).join('\n'),
      tags: join(formula.tags),
      difficulty: formula.difficulty
    };
    sheets.Formulas.push(withExtra('Formulas', values, formula, (v) => parseFormula(v, { topicId })));
  }

  // Rows are written in file order; a level's place among the rows is what a blank
  // `order` or `prerequisites` cell refers to.
  content.levels.forEach((level, index) => {
    const previousId = index > 0 ? content.levels[index - 1].id : null;
    const prerequisites = level.prerequisiteLevelIds || [];
    const { lesson, ...rest } = level;
    const query = level.questionQuery;
    // Leave `questions` blank when it is exactly what a blank cell would give, so
    // a question added to the Questions sheet joins its level without a second edit.
    const derivable =
      !NO_QUESTIONS.has(level.type) &&
      !query &&
      Boolean(level.questionIds?.length) &&
      deepEqual(level.questionIds, ownQuestionIds(level.id, content.questions));
    if (derivable) delete rest.questionIds;
    const values = {
      id: level.id,
      order: level.order,
      title: level.title,
      description: level.description,
      type: level.type,
      difficulty: level.difficulty,
      minutes: level.estimatedMinutes,
      xp: level.xpReward,
      prerequisites: deepEqual(prerequisites, previousId ? [previousId] : []) ? null : prerequisites.length ? join(prerequisites) : NONE,
      concepts: join(level.conceptIds),
      formulas: join(level.formulaIds),
      questions: derivable ? null : join(level.questionIds),
      queryDifficulties: query ? join(query.difficulties) : null,
      queryCount: query ? query.count : null,
      queryConcepts: query ? join(query.conceptIds) : null,
      queryPreferUnseen: query ? query.preferUnseen : null,
      minAccuracy: level.passCriteria?.minimumAccuracy ?? null,
      minAttempted: level.passCriteria?.minimumQuestionsAttempted ?? null,
      minRecalled: level.passCriteria?.minimumRecalled ?? null,
      timerSeconds: level.timerSecondsPerQuestion ?? null
    };
    sheets.Levels.push(withExtra('Levels', values, rest, (v) => parseLevel(v, { topicId, index, previousId })));

    for (const block of lesson?.blocks || []) {
      const blockValues = {
        level: level.id,
        type: block.type,
        title: block.title,
        body: block.body,
        caption: block.caption,
        tone: block.tone,
        question: block.questionId,
        simulation: block.simulationId
      };
      sheets.Lessons.push(withExtra('Lessons', blockValues, block, parseLessonBlock));
    }
  });

  for (const question of content.questions) {
    const values = {
      id: question.id,
      concept: question.conceptId,
      level: question.levelId,
      difficulty: question.difficulty,
      stage: question.learningStage,
      type: question.type,
      question: question.question,
      context: question.context,
      correct: question.answer ? question.answer.value : join((question.correctAnswer || []).map((id) => id.toUpperCase())),
      tolerance: question.answer && question.answer.tolerance ? question.answer.tolerance : null,
      unit: question.answer?.unit,
      explanation: question.explanation,
      method: question.method,
      formulas: join(question.formulaIds),
      tags: join(question.tags),
      seconds: question.estimatedSeconds,
      active: question.active === false ? false : null
    };
    (question.options || []).forEach((option, i) => { values[`option${OPTION_LETTERS[i]}`] = option.text; });
    (question.solutionSteps || []).forEach((step, i) => { values[`step${i + 1}`] = step; });
    (question.hints || []).forEach((hint, i) => { values[`hint${i + 1}`] = hint.text; });
    (question.commonMistakes || []).forEach((mistake, i) => { values[`mistake${i + 1}`] = mistake; });
    sheets.Questions.push(withExtra('Questions', values, question, (v) => parseQuestion(v, { topicId })));
  }

  return sheets;
}

/* --------------------------------- import --------------------------------- */

/** Rows of one sheet as objects keyed by header (case-insensitive), with their 1-based row numbers. */
function readRows(sheets, name, problems) {
  const rows = sheets[name];
  if (!rows || !rows.length) return [];
  const known = new Map(HEADERS[name].map((column) => [column.toLowerCase(), column]));
  const columns = (rows[0] || []).map((cell) => {
    const header = text(cell);
    if (!header) return null;
    const column = known.get(header.toLowerCase());
    if (!column) problems.warnings.push({ sheet: name, row: 1, message: `column "${header}" is not recognised and was ignored` });
    return column || null;
  });
  const out = [];
  rows.slice(1).forEach((cells, index) => {
    if (!cells || cells.every(blank)) return;
    const rowNumber = index + 2;
    const row = {};
    columns.forEach((column, i) => {
      if (!column) return;
      row[column] = cells[i] ?? null;
      if (cells[i] instanceof Date) {
        row[column] = null;
        problems.errors.push({
          sheet: name,
          row: rowNumber,
          message: `the spreadsheet program turned the "${column}" cell into a date or time; format the cell as Text and type it again`
        });
      }
    });
    out.push({ row, rowNumber });
  });
  return out;
}

/**
 * `{ SheetName: rows }` -> `{ content, errors, warnings }`. `errors` and `warnings`
 * are `{ sheet, row, message }`; `content` is only fit to save when there are no errors.
 *
 * Options, both for checks against the rest of the app:
 *   topicIds  ids in the topic catalogue; the workbook's topic must be one of them
 *   reserved  { concepts, formulas, levels, questions }: ids already used by other topics
 */
export function fromSheets(sheets, { topicIds = null, reserved = {} } = {}) {
  const problems = { errors: [], warnings: [] };
  const fail = (sheet, row) => (message) => problems.errors.push({ sheet, row, message });

  for (const name of SHEET_NAMES) {
    if (!sheets[name]?.length) problems.errors.push({ sheet: name, row: 1, message: `the "${name}" sheet is missing` });
  }

  const topicRows = readRows(sheets, 'Topic', problems);
  const topicId = text(topicRows.find(({ row }) => text(row.key).toLowerCase() === 'topicid')?.row.value);
  if (!topicId) {
    problems.errors.push({ sheet: 'Topic', row: 2, message: 'the Topic sheet needs a row with key "topicId" and the topic\'s id as its value' });
  } else if (topicIds && !topicIds.has(topicId)) {
    problems.errors.push({ sheet: 'Topic', row: 2, message: `topic "${topicId}" is not in src/data/topics.json; add it there first (see docs/ADDING_CONTENT.md)` });
  }

  const unique = (sheet, items, what, taken) => {
    const seen = new Map();
    for (const { object, rowNumber } of items) {
      if (!object.id) fail(sheet, rowNumber)(`${what} needs an id`);
      else if (seen.has(object.id)) fail(sheet, rowNumber)(`id "${object.id}" is already used on row ${seen.get(object.id)}`);
      else {
        seen.set(object.id, rowNumber);
        if (taken?.has(object.id)) fail(sheet, rowNumber)(`id "${object.id}" is already used by another topic`);
      }
    }
    return seen;
  };
  const needNumber = (value, what, report, minimum = 0) => {
    if (!Number.isFinite(value) || value < minimum) report(`${what} must be a number, ${minimum} or more`);
  };

  /* Concepts */
  const concepts = readRows(sheets, 'Concepts', problems).map(({ row, rowNumber }, index) => {
    const report = fail('Concepts', rowNumber);
    const object = applyExtra(parseConcept(row, { topicId, index }), row.extra, report);
    if (!object.name) report('concept needs a name');
    if (!object.description) report('concept needs a description');
    return { object: ordered(object, KEY_ORDER.concept), rowNumber };
  });
  const conceptIds = unique('Concepts', concepts, 'concept', reserved.concepts);

  /* Formulas */
  const formulas = readRows(sheets, 'Formulas', problems).map(({ row, rowNumber }) => {
    const report = fail('Formulas', rowNumber);
    const object = applyExtra(parseFormula(row, { topicId }), row.extra, report);
    if (!conceptIds.has(object.conceptId)) report(`concept "${object.conceptId}" is not on the Concepts sheet`);
    for (const field of ['title', 'prompt', 'formula', 'explanation']) if (!object[field]) report(`formula needs a ${field}`);
    if (!DIFFICULTIES.includes(object.difficulty)) report(`difficulty "${object.difficulty}" is not one of: ${DIFFICULTIES.join(', ')}`);
    if ('kind' in object && !CARD_KINDS.includes(object.kind)) report(`kind "${object.kind}" is not one of: ${CARD_KINDS.join(', ')}`);
    return { object: ordered(object, KEY_ORDER.formula), rowNumber };
  });
  const formulaIds = unique('Formulas', formulas, 'formula', reserved.formulas);

  /* Levels */
  let previousId = null;
  const levels = readRows(sheets, 'Levels', problems).map(({ row, rowNumber }, index) => {
    const report = fail('Levels', rowNumber);
    const object = applyExtra(parseLevel(row, { topicId, index, previousId }), row.extra, report);
    if (!LEVEL_TYPES.includes(object.type)) report(`type "${object.type}" is not one of: ${LEVEL_TYPES.join(', ')}`);
    if (!DIFFICULTIES.includes(object.difficulty)) report(`difficulty "${object.difficulty}" is not one of: ${DIFFICULTIES.join(', ')}`);
    if (!object.title) report('level needs a title');
    if (!object.description) report('level needs a description');
    if (!Number.isInteger(object.order) || object.order < 0) report('order must be a whole number, 0 or more');
    needNumber(object.estimatedMinutes, 'minutes', report, 1);
    needNumber(object.xpReward, 'xp', report);
    if (object.questionQuery) needNumber(object.questionQuery.count, 'queryCount', report, 1);
    for (const value of object.questionQuery?.difficulties || []) {
      if (!DIFFICULTIES.includes(value)) report(`queryDifficulties "${value}" is not one of: ${DIFFICULTIES.join(', ')}`);
    }
    const pass = object.passCriteria || {};
    if ('minimumAccuracy' in pass) needNumber(pass.minimumAccuracy, 'minAccuracy', report);
    if ('minimumQuestionsAttempted' in pass) needNumber(pass.minimumQuestionsAttempted, 'minAttempted', report);
    if ('minimumRecalled' in pass) needNumber(pass.minimumRecalled, 'minRecalled', report);
    if (pass.minimumAccuracy > 100) report('minAccuracy is a percentage, for example 70');
    if ('timerSecondsPerQuestion' in object) needNumber(object.timerSecondsPerQuestion, 'timerSeconds', report, 1);
    for (const id of object.conceptIds || []) if (!conceptIds.has(id)) report(`concept "${id}" is not on the Concepts sheet`);
    for (const id of object.formulaIds || []) if (!formulaIds.has(id)) report(`formula "${id}" is not on the Formulas sheet`);
    for (const id of object.questionQuery?.conceptIds || []) if (!conceptIds.has(id)) report(`query concept "${id}" is not on the Concepts sheet`);
    previousId = object.id;
    return { object, rowNumber };
  });
  const levelIds = unique('Levels', levels, 'level', reserved.levels);
  const orders = new Map();
  for (const { object, rowNumber } of levels) {
    for (const id of object.prerequisiteLevelIds) if (!levelIds.has(id)) fail('Levels', rowNumber)(`prerequisite "${id}" is not a level on this sheet`);
    if (orders.has(object.order)) fail('Levels', rowNumber)(`order ${object.order} is already used on row ${orders.get(object.order)}`);
    else orders.set(object.order, rowNumber);
  }

  /* Questions (blank ids are filled in with the next free number) */
  const questionRows = readRows(sheets, 'Questions', problems);
  const numbered = new RegExp(`^${topicId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-q-(\\d+)$`);
  let nextNumber = Math.max(0, ...questionRows.map(({ row }) => Number(numbered.exec(text(row.id))?.[1] || 0))) + 1;
  const questions = questionRows.map(({ row, rowNumber }) => {
    const report = fail('Questions', rowNumber);
    const object = applyExtra(parseQuestion(row, { topicId }), row.extra, report);
    if (!object.id) object.id = `${topicId}-q-${String(nextNumber++).padStart(3, '0')}`;
    if (!object.question) report('question text is empty');
    if (!QUESTION_TYPES.includes(object.type)) report(`type "${object.type}" is not one of: ${QUESTION_TYPES.join(', ')}`);
    if (!DIFFICULTIES.includes(object.difficulty)) report(`difficulty "${object.difficulty}" is not one of: ${DIFFICULTIES.join(', ')}`);
    if (!LEARNING_STAGES.includes(object.learningStage)) report(`stage "${object.learningStage}" is not one of: ${LEARNING_STAGES.join(', ')}`);
    if (!conceptIds.has(object.conceptId)) report(`concept "${object.conceptId}" is not on the Concepts sheet`);
    if (!levelIds.has(object.levelId)) report(`level "${object.levelId}" is not on the Levels sheet`);
    for (const id of object.formulaIds) if (!formulaIds.has(id)) report(`formula "${id}" is not on the Formulas sheet`);
    if (OPTION_TYPES.has(object.type)) {
      const options = object.options || [];
      const ids = options.map((option) => option.id);
      if (options.length < 2) report('choice questions need at least two options');
      if (options.some((option) => !option.text)) report('an option is empty while a later one is filled in');
      const texts = options.map((option) => String(option.text).trim().toLowerCase());
      if (new Set(texts).size !== texts.length) report('two options have the same text');
      if (!object.correctAnswer?.length) report('the "correct" cell is empty: give the letter of the right option, for example B');
      for (const id of object.correctAnswer || []) if (!ids.includes(id)) report(`correct answer "${String(id).toUpperCase()}" is not one of the options given`);
      if (object.type !== 'multiple_choice' && (object.correctAnswer || []).length > 1) report('only multiple_choice questions can have more than one correct option');
    }
    if (object.type === 'numerical_input') {
      if (!Number.isFinite(object.answer?.value)) report('the "correct" cell must be a number for a numerical_input question');
      if (!Number.isFinite(object.answer?.tolerance) || object.answer.tolerance < 0) report('tolerance must be a number, 0 or more');
    }
    if (object.type === 'match_following' && !object.pairs) report('a match_following question needs its "pairs" in the extra cell');
    if (object.type === 'ordering' && !object.steps) report('an ordering question needs its "steps" in the extra cell');
    if (object.type === 'assertion_reason' && !(object.assertion && object.reason)) report('an assertion_reason question needs "assertion" and "reason" in the extra cell');
    if (!object.explanation) report('explanation is empty');
    for (const hint of object.hints || []) if (String(hint.text || '').length < 10) report('a hint is shorter than 10 characters');
    needNumber(object.estimatedSeconds, 'seconds', report, 1);
    return { object: ordered(object, KEY_ORDER.question), rowNumber };
  });
  const questionIds = unique('Questions', questions, 'question', reserved.questions);

  /* Lessons, attached to their levels in sheet order */
  const levelById = new Map(levels.map((entry) => [entry.object.id, entry.object]));
  for (const { row, rowNumber } of readRows(sheets, 'Lessons', problems)) {
    const report = fail('Lessons', rowNumber);
    const level = levelById.get(text(row.level));
    if (!level) {
      report(`level "${text(row.level)}" is not on the Levels sheet`);
      continue;
    }
    const block = applyExtra(parseLessonBlock(row), row.extra, report);
    if (!LESSON_BLOCK_TYPES.includes(block.type)) report(`type "${block.type}" is not one of: ${LESSON_BLOCK_TYPES.join(', ')}`);
    else if (block.type === 'check') {
      if (!questionIds.has(block.questionId)) report(`question "${block.questionId}" is not on the Questions sheet`);
    } else if (block.type === 'simulation') {
      if (!block.simulationId) report('a simulation block needs the simulation id in the "simulation" column');
    } else if (!block.body) {
      report('lesson block needs a body');
    }
    (level.lesson ??= { blocks: [] }).blocks.push(block);
  }

  /* What each level needs, now that questions and lessons are known */
  const allQuestions = questions.map((entry) => entry.object);
  for (const { object, rowNumber } of levels) {
    const report = fail('Levels', rowNumber);
    for (const id of object.questionIds || []) if (!questionIds.has(id)) report(`question "${id}" is not on the Questions sheet`);
    if (object.type === 'concept' && !object.lesson) report('a concept level needs lesson blocks on the Lessons sheet');
    if (NO_QUESTIONS.has(object.type) || object.questionIds || object.questionQuery) continue;
    const own = ownQuestionIds(object.id, allQuestions);
    if (own.length) object.questionIds = own;
    else report('this level has no questions: write some for it on the Questions sheet, list ids in "questions", or give a query');
  }

  return {
    content: {
      topicId,
      concepts: concepts.map((entry) => entry.object),
      formulas: formulas.map((entry) => entry.object),
      levels: levels.map((entry) => ordered(entry.object, KEY_ORDER.level)),
      questions: allQuestions
    },
    errors: problems.errors,
    warnings: problems.warnings
  };
}

/* ------------------------------ guide and diff ------------------------------ */

/** Rows for the "Guide" sheet that travels with every workbook (ignored on import). */
export function guideRows() {
  const rows = [
    ['sheet', 'column', 'needed', 'what to put'],
    ['(all)', '', '', 'Row 1 of every sheet is the header. Keep the column names; their order does not matter. Blank rows are skipped.'],
    ['(all)', '', '', 'Ids join the sheets together: a question names its concept and level by id.'],
    ['(all)', '', '', 'To check your changes: npm run content:import -- <this file>. To save them into the app: add --write.']
  ];
  for (const name of SHEET_NAMES) {
    for (const [column, needed, help] of COLUMN_GUIDE[name]) rows.push([name, column, needed, help]);
  }
  return rows;
}

/**
 * Give `next` the key order of `previous` wherever both have the same shape, so
 * saving an import changes only the lines whose content changed. Keys that are
 * new come last.
 */
export function alignKeys(next, previous) {
  if (Array.isArray(next)) return next.map((item, index) => alignKeys(item, Array.isArray(previous) ? previous[index] : undefined));
  if (!next || typeof next !== 'object') return next;
  const like = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
  const keys = [...Object.keys(like).filter((key) => key in next), ...Object.keys(next).filter((key) => !(key in like))];
  return Object.fromEntries(keys.map((key) => [key, alignKeys(next[key], like[key])]));
}

/** `alignKeys` for a whole topic, matching concepts, formulas, levels and questions by id. */
export function alignContent(next, previous) {
  const out = { topicId: next.topicId };
  for (const kind of ['concepts', 'formulas', 'levels', 'questions']) {
    const old = new Map((previous?.[kind] || []).map((item) => [item.id, item]));
    out[kind] = next[kind].map((item) => alignKeys(item, old.get(item.id)));
  }
  return out;
}

/** A tiny made-up topic showing each sheet in use: the starting point for a new topic. */
export function templateContent(topicId = 'your-topic-id') {
  const level = (order) => `${topicId}-level-${order}`;
  return {
    topicId,
    concepts: [
      { id: 'ex-unit-rate', topicId, name: 'Unit rate', description: 'How much of one quantity goes with one unit of another.', sortOrder: 1 },
      { id: 'ex-scaling', topicId, name: 'Scaling up and down', description: 'Using the unit rate to find any other amount.', sortOrder: 2 }
    ],
    formulas: [
      {
        id: 'ex-unit-rate-formula',
        topicId,
        conceptId: 'ex-unit-rate',
        title: 'Unit rate',
        prompt: 'How do you find the cost of one item from the cost of several?',
        formula: 'Unit rate = Total ÷ Number of units',
        variables: [
          { symbol: 'Total', meaning: 'the amount for all the units together' },
          { symbol: 'Number of units', meaning: 'how many units that amount covers' }
        ],
        explanation: 'Sharing the total equally gives the amount for a single unit.',
        example: '6 pens cost ₹90, so one pen costs 90 ÷ 6 = ₹15.',
        commonMistake: 'Dividing the number of units by the total instead of the other way round.',
        applicationPrompt: '8 notebooks cost ₹200. What does one cost?',
        tags: ['unit-rate'],
        difficulty: 'easy'
      }
    ],
    levels: [
      {
        id: level(0),
        topicId,
        order: 0,
        title: 'What a unit rate is',
        description: 'The idea behind every rate problem.',
        type: 'concept',
        difficulty: 'easy',
        estimatedMinutes: 6,
        prerequisiteLevelIds: [],
        conceptIds: ['ex-unit-rate'],
        lesson: {
          blocks: [
            { type: 'text', title: 'One unit at a time', body: 'A unit rate tells you how much goes with one unit: the price of one pen, the distance in one hour.' },
            { type: 'example', title: 'Worked example', body: '6 pens cost ₹90. One pen costs 90 ÷ 6 = ₹15.' },
            { type: 'formula', title: 'The rule', body: 'Unit rate = Total ÷ Number of units', caption: 'Divide the total by how many units it covers.' },
            { type: 'callout', tone: 'tip', body: 'Find the unit rate first; every other amount follows from it.' },
            { type: 'check', questionId: `${topicId}-q-001` }
          ]
        },
        xpReward: 20
      },
      {
        id: level(1),
        topicId,
        order: 1,
        title: 'Formula revision',
        description: 'Recall the unit rate formula.',
        type: 'formula_revision',
        difficulty: 'easy',
        estimatedMinutes: 4,
        prerequisiteLevelIds: [level(0)],
        formulaIds: ['ex-unit-rate-formula'],
        passCriteria: { minimumRecalled: 1 },
        xpReward: 20
      },
      {
        id: level(2),
        topicId,
        order: 2,
        title: 'Easy practice',
        description: 'Straightforward unit rate questions.',
        type: 'easy_practice',
        difficulty: 'easy',
        estimatedMinutes: 8,
        prerequisiteLevelIds: [level(1)],
        conceptIds: ['ex-unit-rate', 'ex-scaling'],
        questionIds: [`${topicId}-q-002`, `${topicId}-q-003`],
        passCriteria: { minimumAccuracy: 70, minimumQuestionsAttempted: 2 },
        xpReward: 30
      }
    ],
    questions: [
      {
        id: `${topicId}-q-001`,
        topicId,
        conceptId: 'ex-unit-rate',
        levelId: level(0),
        difficulty: 'easy',
        learningStage: 'foundation',
        type: 'single_choice',
        question: '5 kg of rice costs ₹300. What does 1 kg cost?',
        options: [
          { id: 'a', text: '₹50' },
          { id: 'b', text: '₹60' },
          { id: 'c', text: '₹75' },
          { id: 'd', text: '₹1500' }
        ],
        correctAnswer: ['b'],
        explanation: 'Divide the total by the number of kilograms: 300 ÷ 5 = ₹60.',
        solutionSteps: ['Total cost = ₹300 for 5 kg.', 'Cost of 1 kg = 300 ÷ 5 = ₹60.'],
        formulaIds: ['ex-unit-rate-formula'],
        method: 'Unit rate',
        hints: [{ level: 1, text: 'Share the total cost equally among the 5 kilograms.' }],
        commonMistakes: ['Multiplying 300 by 5 instead of dividing.'],
        tags: ['unit-rate'],
        estimatedSeconds: 30,
        source: 'original',
        version: 1,
        active: true
      },
      {
        id: `${topicId}-q-002`,
        topicId,
        conceptId: 'ex-unit-rate',
        levelId: level(2),
        difficulty: 'easy',
        learningStage: 'independent',
        type: 'numerical_input',
        question: 'A car covers 240 km in 4 hours at a steady speed. How far does it go in 1 hour?',
        answer: { value: 60, tolerance: 0, unit: 'km' },
        explanation: 'Distance in one hour = 240 ÷ 4 = 60 km.',
        solutionSteps: ['Total distance = 240 km in 4 hours.', 'Distance in 1 hour = 240 ÷ 4 = 60 km.'],
        formulaIds: ['ex-unit-rate-formula'],
        method: 'Unit rate',
        hints: [{ level: 1, text: 'Divide the distance by the number of hours.' }],
        commonMistakes: [],
        tags: ['unit-rate'],
        estimatedSeconds: 40,
        source: 'original',
        version: 1,
        active: true
      },
      {
        id: `${topicId}-q-003`,
        topicId,
        conceptId: 'ex-scaling',
        levelId: level(2),
        difficulty: 'easy',
        learningStage: 'independent',
        type: 'single_choice',
        question: '4 pens cost ₹60. What do 7 pens cost?',
        options: [
          { id: 'a', text: '₹90' },
          { id: 'b', text: '₹100' },
          { id: 'c', text: '₹105' },
          { id: 'd', text: '₹420' }
        ],
        correctAnswer: ['c'],
        explanation: 'One pen costs 60 ÷ 4 = ₹15, so 7 pens cost 7 × 15 = ₹105.',
        solutionSteps: ['Cost of 1 pen = 60 ÷ 4 = ₹15.', 'Cost of 7 pens = 7 × 15 = ₹105.'],
        formulaIds: ['ex-unit-rate-formula'],
        method: 'Unit rate, then scale',
        hints: [
          { level: 1, text: 'First find what a single pen costs.' },
          { level: 2, text: 'One pen is ₹15. Now multiply by 7.' }
        ],
        commonMistakes: ['Multiplying 60 by 7 without first finding the price of one pen.'],
        tags: ['scaling'],
        estimatedSeconds: 45,
        source: 'original',
        version: 1,
        active: true
      }
    ]
  };
}

/** What an import would change: ids added, changed and removed per kind. */
export function diffContent(before, after) {
  const out = {};
  for (const kind of ['concepts', 'formulas', 'levels', 'questions']) {
    const old = new Map((before?.[kind] || []).map((item) => [item.id, item]));
    const next = new Map((after[kind] || []).map((item) => [item.id, item]));
    out[kind] = {
      added: [...next.keys()].filter((id) => !old.has(id)),
      changed: [...next.keys()].filter((id) => old.has(id) && !deepEqual(old.get(id), next.get(id))),
      removed: [...old.keys()].filter((id) => !next.has(id))
    };
  }
  return out;
}
