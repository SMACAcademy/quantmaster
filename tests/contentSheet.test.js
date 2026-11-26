/**
 * The spreadsheet importer (scripts/content-sheet.js). The central promise is
 * that exporting a topic and importing it back changes nothing, for every topic
 * the app has; the rest covers what an author can leave blank, how mistakes are
 * reported, and the ways a spreadsheet program alters what was typed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  COLUMN_GUIDE,
  HEADERS,
  SHEET_NAMES,
  alignContent,
  alignKeys,
  diffContent,
  fromSheets,
  guideRows,
  templateContent,
  toSheets
} from '../scripts/lib/contentSheet.js';
import { parseCsv, readCsvFolder, readWorkbook, toCsv, writeCsvFolder, writeWorkbook } from '../scripts/lib/sheetFiles.js';
import { catalogueFor, readTopic, topicFileTexts, topicLayout, topicsWithContent } from '../scripts/lib/topicFiles.js';

const DATA = join(process.cwd(), 'src', 'data');
const TOPIC = 'your-topic-id';

let scratch;
beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'qm-sheets-'));
});
afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/** The template topic as sheets, with helpers to change cells the way an author would. */
function workbook() {
  const sheets = toSheets(templateContent());
  const column = (sheet, name) => sheets[sheet][0].indexOf(name);
  return {
    sheets,
    /** Set cells of an existing row (1 = first data row). */
    set(sheet, row, values) {
      for (const [name, value] of Object.entries(values)) sheets[sheet][row][column(sheet, name)] = value;
    },
    /** Append a row given as { column: value }. */
    add(sheet, values) {
      const row = sheets[sheet][0].map(() => null);
      for (const [name, value] of Object.entries(values)) row[column(sheet, name)] = value;
      sheets[sheet].push(row);
      return sheets[sheet].length; // its row number in the spreadsheet
    },
    import: (options) => fromSheets(sheets, options)
  };
}

const NEW_QUESTION = {
  concept: 'ex-scaling',
  level: `${TOPIC}-level-2`,
  difficulty: 'medium',
  type: 'single_choice',
  question: '3 pens cost ₹45. What do 10 pens cost?',
  optionA: '₹135',
  optionB: '₹150',
  optionC: '₹450',
  correct: 'b',
  explanation: 'One pen costs 45 ÷ 3 = ₹15, so 10 pens cost ₹150.',
  hint1: 'Find the price of one pen first.'
};

const messages = (result) => result.errors.map((error) => `${error.sheet} ${error.row}: ${error.message}`);

describe('every topic survives export and import unchanged', () => {
  const topicIds = topicsWithContent(DATA);

  it('finds the app\'s topics', () => {
    expect(topicIds.length).toBeGreaterThan(60);
  });

  it.each(topicIds)('%s', (topicId) => {
    const content = readTopic(DATA, topicId);
    const result = fromSheets(toSheets(content), catalogueFor(DATA, topicId));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.content).toEqual(content);
    // Same key order too, so saving it back leaves the files as they were.
    expect(JSON.stringify(alignContent(result.content, content))).toBe(JSON.stringify(content));
  });

  it('keeps ordinary questions in ordinary columns', () => {
    // Only tables, charts, figures and the rare special question types may need the JSON cell.
    const allowed = new Set(['table', 'chart', 'figure', 'pairs', 'steps', 'assertion', 'reason']);
    for (const topicId of topicIds) {
      const rows = toSheets(readTopic(DATA, topicId)).Questions;
      const extra = rows[0].indexOf('extra');
      for (const row of rows.slice(1)) {
        for (const key of Object.keys(row[extra] ? JSON.parse(row[extra]) : {})) expect(allowed, `${row[0]} needs "${key}" in extra`).toContain(key);
      }
    }
  });
});

describe('spreadsheet files', () => {
  it.each(['averages', 'percentages', 'triangles', 'di-tables'])('%s survives a real .xlsx file', async (topicId) => {
    const content = readTopic(DATA, topicId);
    const path = join(scratch, `${topicId}.xlsx`);
    await writeWorkbook(path, toSheets(content));
    const result = fromSheets(await readWorkbook(path));
    expect(result.errors).toEqual([]);
    expect(result.content).toEqual(content);
  });

  it('survives a folder of .csv files', () => {
    const content = readTopic(DATA, 'coordinate-geometry');
    const dir = join(scratch, 'csv');
    writeCsvFolder(dir, toSheets(content));
    const result = fromSheets(readCsvFolder(dir));
    expect(result.errors).toEqual([]);
    expect(result.content).toEqual(content);
  });

  it('reads and writes awkward CSV cells', () => {
    const rows = [
      ['plain', 'has, comma', 'has "quotes"', 'two\nlines', null, ' padded '],
      ['தமிழ்', '₹1,200', '', 'last']
    ];
    const back = parseCsv(`﻿${toCsv(rows)}`);
    expect(back).toEqual([
      ['plain', 'has, comma', 'has "quotes"', 'two\nlines', null, ' padded '],
      ['தமிழ்', '₹1,200', null, 'last']
    ]);
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]); // no final line break, Unix endings
  });

  it('undoes what a spreadsheet program does to typed cells', async () => {
    const book = workbook();
    const rowNumber = book.add('Questions', NEW_QUESTION);
    const path = join(scratch, 'typed.xlsx');
    await writeWorkbook(path, book.sheets);

    // Re-open it as Excel would leave it after an author typed into plain cells.
    const excel = new ExcelJS.Workbook();
    await excel.xlsx.readFile(path);
    const sheet = excel.getWorksheet('Questions');
    const cell = (name) => sheet.getRow(rowNumber).getCell(HEADERS.Questions.indexOf(name) + 1);
    // (exceljs shares one style object between cells, so give each changed cell its own.)
    cell('optionA').value = 0.25; // typed 25%
    cell('optionA').style = { ...cell('optionA').style, numFmt: '0%' };
    cell('optionB').value = 150; // typed a bare number
    cell('optionC').value = { richText: [{ text: '4' }, { font: { bold: true }, text: '50' }] }; // part of the cell in bold
    cell('seconds').value = { formula: '30+15', result: 45 };
    cell('step1').value = new Date(Date.UTC(2026, 1, 1)); // typed 1/2, turned into a date
    cell('step1').style = { ...cell('step1').style, numFmt: 'd-mmm' };
    await excel.xlsx.writeFile(path);

    const result = fromSheets(await readWorkbook(path));
    const question = result.content.questions.at(-1);
    expect(question.options.map((option) => option.text)).toEqual(['25%', '150', '450']);
    expect(question.estimatedSeconds).toBe(45);
    expect(messages(result)).toEqual([expect.stringMatching(new RegExp(`^Questions ${rowNumber}: .*"step1" cell into a date`))]);
  });

  it('writes a Guide sheet and ignores it, and other stray sheets, on import', async () => {
    const path = join(scratch, 'guide.xlsx');
    await writeWorkbook(path, toSheets(templateContent()));
    const excel = new ExcelJS.Workbook();
    await excel.xlsx.readFile(path);
    expect(excel.worksheets.map((sheet) => sheet.name)).toEqual([...SHEET_NAMES, 'Guide']);
    excel.addWorksheet('My notes').addRow(['anything']);
    await excel.xlsx.writeFile(path);
    expect(Object.keys(await readWorkbook(path))).toEqual(SHEET_NAMES);
  });

  it('describes every column in the guide', () => {
    const described = guideRows().filter((row) => SHEET_NAMES.includes(row[0])).map((row) => `${row[0]}.${row[1]}`);
    expect(described).toEqual(SHEET_NAMES.flatMap((sheet) => HEADERS[sheet].map((column) => `${sheet}.${column}`)));
    for (const sheet of SHEET_NAMES) expect(COLUMN_GUIDE[sheet].every(([, needed]) => ['yes', 'no', 'choice'].includes(needed))).toBe(true);
  });
});

describe('what an author may leave blank', () => {
  it('accepts the template as it is', () => {
    const result = workbook().import();
    expect(result.errors).toEqual([]);
    expect(result.content).toEqual(templateContent());
  });

  it('numbers a new question, sets its stage, and adds it to its level', () => {
    const book = workbook();
    book.add('Questions', NEW_QUESTION);
    book.add('Questions', { ...NEW_QUESTION, question: 'A second new question?', difficulty: 'complex' });
    const { content, errors } = book.import();
    expect(errors).toEqual([]);

    const [first, second] = content.questions.slice(-2);
    expect(first.id).toBe(`${TOPIC}-q-004`);
    expect(second.id).toBe(`${TOPIC}-q-005`);
    expect(first.learningStage).toBe('guided');
    expect(second.learningStage).toBe('challenge');
    expect(first).toMatchObject({
      topicId: TOPIC,
      options: [{ id: 'a', text: '₹135' }, { id: 'b', text: '₹150' }, { id: 'c', text: '₹450' }],
      correctAnswer: ['b'],
      hints: [{ level: 1, text: 'Find the price of one pen first.' }],
      solutionSteps: [],
      estimatedSeconds: 60,
      source: 'original',
      version: 1,
      active: true
    });
    expect(content.levels[2].questionIds).toEqual([`${TOPIC}-q-002`, `${TOPIC}-q-003`, `${TOPIC}-q-004`, `${TOPIC}-q-005`]);
  });

  it('leaves a level\'s question list alone once it is written out', () => {
    const book = workbook();
    book.set('Levels', 3, { questions: `${TOPIC}-q-003` });
    book.add('Questions', NEW_QUESTION);
    expect(book.import().content.levels[2].questionIds).toEqual([`${TOPIC}-q-003`]);
  });

  it('fills in a new level\'s id, order and prerequisite from its position', () => {
    const book = workbook();
    book.add('Levels', { title: 'Medium practice', description: 'A step up.', type: 'medium_practice', difficulty: 'medium' });
    book.add('Questions', { ...NEW_QUESTION, level: `${TOPIC}-level-3` });
    const { content, errors } = book.import();
    expect(errors).toEqual([]);
    expect(content.levels[3]).toMatchObject({
      id: `${TOPIC}-level-3`,
      order: 3,
      prerequisiteLevelIds: [`${TOPIC}-level-2`],
      estimatedMinutes: 8,
      xpReward: 30,
      questionIds: [`${TOPIC}-q-004`]
    });
  });

  it('reads "none" as no prerequisite and builds a question query', () => {
    const book = workbook();
    book.add('Levels', { title: 'Mixed', description: 'Everything.', type: 'mixed_practice', prerequisites: 'none', queryCount: 6, queryDifficulties: 'easy, medium' });
    const level = book.import().content.levels[3];
    expect(level.prerequisiteLevelIds).toEqual([]);
    expect(level.questionQuery).toEqual({ topicId: TOPIC, difficulties: ['easy', 'medium'], count: 6, preferUnseen: true });
    expect(level.questionIds).toBeUndefined();
  });

  it('reads numbers, letters and switches however they were typed', () => {
    const book = workbook();
    book.set('Questions', 2, { correct: ' 60.5 ', tolerance: '0.5', seconds: '90', active: 'no' });
    book.set('Questions', 3, { correct: 'C', type: 'multiple_choice' });
    book.set('Questions', 1, { correct: 'a, B' , type: 'multiple_choice' });
    const { content, errors } = book.import();
    expect(errors).toEqual([]);
    expect(content.questions[1].answer).toEqual({ value: 60.5, tolerance: 0.5, unit: 'km' });
    expect(content.questions[1].estimatedSeconds).toBe(90);
    expect(content.questions[1].active).toBe(false);
    expect(content.questions[0].correctAnswer).toEqual(['a', 'b']);
  });

  it('takes columns in any order and warns about ones it does not know', () => {
    const book = workbook();
    const swapped = book.sheets.Concepts.map((row) => [row[2], row[0], 'x', row[1]]);
    swapped[0][2] = 'Reviewer';
    book.sheets.Concepts = swapped;
    const result = book.import();
    expect(result.errors).toEqual([]);
    expect(result.content.concepts).toEqual(templateContent().concepts);
    expect(result.warnings).toEqual([{ sheet: 'Concepts', row: 1, message: 'column "Reviewer" is not recognised and was ignored' }]);
  });

  it('carries special parts in the extra cell', () => {
    const book = workbook();
    const table = { headers: ['Item', 'Cost'], rows: [['Pen', '₹15'], ['Book', '₹40']] };
    book.set('Questions', 2, { extra: JSON.stringify({ table }) });
    expect(book.import().content.questions[1].table).toEqual(table);
  });
});

describe('mistakes are reported by sheet and row', () => {
  it('points at the row of each bad question', () => {
    const book = workbook();
    const wrongLetter = book.add('Questions', { ...NEW_QUESTION, correct: 'D' });
    const notANumber = book.add('Questions', { ...NEW_QUESTION, type: 'numerical_input', correct: 'forty', concept: 'ex-nowhere' });
    const gap = book.add('Questions', { ...NEW_QUESTION, optionB: null, correct: 'c', difficulty: 'hard', level: 'no-such-level' });
    const twins = book.add('Questions', { ...NEW_QUESTION, optionC: '₹150 ', correct: 'A, B', explanation: '' });
    expect(messages(book.import())).toEqual([
      `Questions ${wrongLetter}: correct answer "D" is not one of the options given`,
      `Questions ${notANumber}: concept "ex-nowhere" is not on the Concepts sheet`,
      `Questions ${notANumber}: the "correct" cell must be a number for a numerical_input question`,
      `Questions ${gap}: difficulty "hard" is not one of: easy, medium, complex`,
      `Questions ${gap}: level "no-such-level" is not on the Levels sheet`,
      `Questions ${gap}: an option is empty while a later one is filled in`,
      `Questions ${twins}: two options have the same text`,
      `Questions ${twins}: only multiple_choice questions can have more than one correct option`,
      `Questions ${twins}: explanation is empty`
    ]);
  });

  it('catches ids used twice, here or in another topic', () => {
    const book = workbook();
    const again = book.add('Questions', { ...NEW_QUESTION, id: `${TOPIC}-q-001` });
    const taken = book.add('Concepts', { id: 'avg-total', name: 'Totals', description: 'Borrowed id.' });
    const result = book.import({ reserved: { concepts: new Set(['avg-total']) } });
    expect(messages(result)).toEqual([
      `Concepts ${taken}: id "avg-total" is already used by another topic`,
      `Questions ${again}: id "${TOPIC}-q-001" is already used on row 2`
    ]);
  });

  it('checks the topic against the catalogue', () => {
    expect(messages(workbook().import({ topicIds: new Set(['averages']) }))).toEqual([
      `Topic 2: topic "${TOPIC}" is not in src/data/topics.json; add it there first (see docs/ADDING_CONTENT.md)`
    ]);
    const book = workbook();
    book.sheets.Topic = [['key', 'value']];
    expect(messages(book.import())[0]).toMatch(/^Topic 2: the Topic sheet needs a row with key "topicId"/);
  });

  it('checks levels, lessons and formulas', () => {
    const book = workbook();
    book.set('Levels', 2, { formulas: 'ex-missing-formula', minAccuracy: 'most' });
    const empty = book.add('Levels', { title: 'Empty', description: 'Nothing in it.', type: 'easy_practice' });
    const noLesson = book.add('Levels', { title: 'Idea', description: 'No lesson.', type: 'concept', order: 2 });
    const block = book.add('Lessons', { level: `${TOPIC}-level-0`, type: 'check', question: 'q-nowhere' });
    const orphan = book.add('Lessons', { level: 'level-nowhere', type: 'text', body: 'Lost.' });
    book.set('Formulas', 1, { concept: 'ex-nowhere', formula: '' });
    expect(messages(book.import())).toEqual([
      'Formulas 2: concept "ex-nowhere" is not on the Concepts sheet',
      'Formulas 2: formula needs a formula',
      'Levels 3: minAccuracy must be a number, 0 or more',
      'Levels 3: formula "ex-missing-formula" is not on the Formulas sheet',
      `Levels ${noLesson}: id "${TOPIC}-level-2" is already used on row 4`,
      `Levels ${noLesson}: order 2 is already used on row 4`,
      `Lessons ${block}: question "q-nowhere" is not on the Questions sheet`,
      `Lessons ${orphan}: level "level-nowhere" is not on the Levels sheet`,
      `Levels ${empty}: this level has no questions: write some for it on the Questions sheet, list ids in "questions", or give a query`,
      `Levels ${noLesson}: a concept level needs lesson blocks on the Lessons sheet`
    ]);
  });

  it('reports a missing sheet, broken extra JSON and cells turned into dates', () => {
    const book = workbook();
    delete book.sheets.Lessons;
    book.set('Questions', 2, { extra: '{"table": ' });
    book.set('Questions', 3, { optionA: new Date(Date.UTC(2026, 1, 1)) });
    const found = messages(book.import());
    expect(found).toContain('Lessons 1: the "Lessons" sheet is missing');
    expect(found.some((message) => /^Questions 3: the "extra" cell is not valid JSON/.test(message))).toBe(true);
    expect(found).toContain('Questions 4: the spreadsheet program turned the "optionA" cell into a date or time; format the cell as Text and type it again');
  });
});

describe('saving an import', () => {
  it('summarises what changed', () => {
    const before = templateContent();
    const book = workbook();
    book.add('Questions', NEW_QUESTION);
    book.set('Questions', 1, { explanation: 'Reworded: 300 ÷ 5 = ₹60.' });
    book.sheets.Formulas.pop();
    book.set('Levels', 2, { formulas: null });
    for (const row of [1, 2, 3]) book.set('Questions', row, { formulas: null });
    const { content, errors } = book.import();
    expect(errors).toEqual([]);
    expect(diffContent(before, content)).toEqual({
      concepts: { added: [], changed: [], removed: [] },
      formulas: { added: [], changed: [], removed: ['ex-unit-rate-formula'] },
      levels: { added: [], changed: [`${TOPIC}-level-1`, `${TOPIC}-level-2`], removed: [] },
      questions: { added: [`${TOPIC}-q-004`], changed: [`${TOPIC}-q-001`, `${TOPIC}-q-002`, `${TOPIC}-q-003`], removed: [] }
    });
    expect(diffContent(null, content).questions.added).toHaveLength(4);
  });

  it('keeps the key order already in the file, with new keys last', () => {
    const previous = { xpReward: 20, id: 'a', answer: { tolerance: 0, value: 4 }, hints: [{ text: 'one', level: 1 }] };
    const next = { id: 'a', context: 'new', answer: { value: 5, tolerance: 0 }, hints: [{ level: 1, text: 'one' }, { level: 2, text: 'two' }], xpReward: 20 };
    expect(JSON.stringify(alignKeys(next, previous))).toBe(
      '{"xpReward":20,"id":"a","answer":{"tolerance":0,"value":5},"hints":[{"text":"one","level":1},{"level":2,"text":"two"}],"context":"new"}'
    );
  });

  it('writes one file for a new topic and keeps the split layout where a topic uses it', () => {
    const dataDir = join(scratch, 'data');
    const content = templateContent();
    expect(topicLayout(dataDir, TOPIC)).toBe('new');
    expect(readTopic(dataDir, TOPIC)).toBeNull();

    const single = topicFileTexts(dataDir, content);
    expect(single.map(([path]) => path)).toEqual([join(dataDir, 'content', `${TOPIC}.json`)]);
    mkdirSync(join(dataDir, 'content'), { recursive: true });
    writeFileSync(...single[0]);
    expect(topicLayout(dataDir, TOPIC)).toBe('single');
    expect(readTopic(dataDir, TOPIC)).toEqual(content);

    const splitTopic = templateContent('split-topic');
    for (const kind of ['concepts', 'formulas', 'levels', 'questions']) {
      mkdirSync(join(dataDir, kind), { recursive: true });
      writeFileSync(join(dataDir, kind, 'split-topic.json'), JSON.stringify({ topicId: 'split-topic', [kind]: [] }));
    }
    const split = topicFileTexts(dataDir, splitTopic);
    expect(split.map(([path]) => path)).toEqual(['concepts', 'formulas', 'levels', 'questions'].map((kind) => join(dataDir, kind, 'split-topic.json')));
    for (const [path, text] of split) writeFileSync(path, text);
    expect(readTopic(dataDir, 'split-topic')).toEqual(splitTopic);
    expect(topicsWithContent(dataDir)).toEqual(['split-topic', TOPIC]);

    writeFileSync(join(dataDir, 'topics.json'), JSON.stringify({ topics: [{ id: TOPIC }, { id: 'split-topic' }] }));
    const { topicIds, reserved } = catalogueFor(dataDir, TOPIC);
    expect([...topicIds]).toEqual([TOPIC, 'split-topic']);
    expect(reserved.questions.has('split-topic-q-001')).toBe(true);
    expect(reserved.questions.has(`${TOPIC}-q-001`)).toBe(false);
  });

  it('writes the app\'s own files back exactly as they are', () => {
    for (const topicId of ['averages', 'percentages']) {
      const content = readTopic(DATA, topicId);
      const saved = alignContent(fromSheets(toSheets(content)).content, content);
      // Compared as data in file order, so a hand edit's line breaks do not matter here.
      for (const [path, text] of topicFileTexts(DATA, saved)) expect(text).toBe(`${JSON.stringify(JSON.parse(readFileSync(path, 'utf8')), null, 2)}
`);
    }
  });
});
