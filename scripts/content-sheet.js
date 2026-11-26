#!/usr/bin/env node
/**
 * Edit a topic's content in a spreadsheet instead of JSON.
 *
 *   npm run content:export -- <topicId|all> [--csv] [--out <folder>]
 *       Write the topic as content-sheets/<topicId>.xlsx (or a folder of .csv files).
 *
 *   npm run content:import -- <file.xlsx|csv folder> [--write]
 *       Check the spreadsheet and show what would change. With --write, save it
 *       into src/data and run the content validator; if that fails, the files are
 *       put back as they were.
 *
 *   npm run content:template [-- --out <file.xlsx>]
 *       Write a small example workbook to start a new topic from.
 *
 * The sheet layout is described in docs/ADDING_CONTENT.md and in each workbook's
 * Guide sheet; the conversion itself is scripts/lib/contentSheet.js.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alignContent, diffContent, fromSheets, templateContent, toSheets } from './lib/contentSheet.js';
import { readCsvFolder, readWorkbook, writeCsvFolder, writeWorkbook } from './lib/sheetFiles.js';
import { catalogueFor, readTopic, topicFileTexts, topicsWithContent } from './lib/topicFiles.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src', 'data');
const DEFAULT_OUT = join(ROOT, 'content-sheets');

const shown = (path) => relative(process.cwd(), path) || '.';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') flags.out = argv[++i];
    else if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = true;
    else positional.push(argv[i]);
  }
  return { flags, positional };
}

/** Writing fails with EBUSY when the workbook is open in Excel; say so plainly. */
async function saveWorkbook(path, sheets) {
  mkdirSync(dirname(path), { recursive: true });
  try {
    await writeWorkbook(path, sheets);
  } catch (error) {
    if (error.code === 'EBUSY' || error.code === 'EPERM') fail(`Could not write ${shown(path)}: close it in your spreadsheet program and try again.`);
    throw error;
  }
}

/* --------------------------------- export --------------------------------- */

async function exportTopics(target, flags) {
  if (!target) fail('Which topic? Usage: npm run content:export -- <topicId|all> [--csv] [--out <folder>]');
  const available = topicsWithContent(DATA);
  const topicIds = target === 'all' ? available : [target];
  const outDir = flags.out ? resolve(flags.out) : DEFAULT_OUT;

  for (const topicId of topicIds) {
    const content = readTopic(DATA, topicId);
    if (!content) fail(`Topic "${topicId}" has no content files. Topics with content: ${available.join(', ')}`);
    const sheets = toSheets(content);
    const path = join(outDir, flags.csv ? topicId : `${topicId}.xlsx`);
    if (flags.csv) writeCsvFolder(path, sheets);
    else await saveWorkbook(path, sheets);
    console.log(`${shown(path)}  (${content.levels.length} levels, ${content.questions.length} questions)`);
  }
}

/* --------------------------------- import --------------------------------- */

function printProblems(label, mark, problems) {
  if (!problems.length) return;
  console.log(`\n${problems.length} ${label}${problems.length === 1 ? '' : 's'}`);
  for (const { sheet, row, message } of problems) console.log(`  ${mark} ${sheet}, row ${row}: ${message}`);
}

function printChanges(changes) {
  let total = 0;
  for (const [kind, { added, changed, removed }] of Object.entries(changes)) {
    total += added.length + changed.length + removed.length;
    console.log(`  ${kind.padEnd(10)} ${added.length} added, ${changed.length} changed, ${removed.length} removed`);
    for (const [word, ids] of [['added', added], ['changed', changed], ['removed', removed]]) {
      if (ids.length) console.log(`    ${word}: ${ids.slice(0, 12).join(', ')}${ids.length > 12 ? `, … (${ids.length - 12} more)` : ''}`);
    }
  }
  return total;
}

async function importTopic(source, flags) {
  if (!source) fail('Which file? Usage: npm run content:import -- <file.xlsx|csv folder> [--write]');
  const path = resolve(source);
  if (!existsSync(path)) fail(`Not found: ${shown(path)}`);
  const sheets = statSync(path).isDirectory() ? readCsvFolder(path) : await readWorkbook(path);

  // First pass finds the topic; the second checks it against the rest of the app.
  const topicId = fromSheets(sheets).content.topicId;
  const { content: parsed, errors, warnings } = fromSheets(sheets, catalogueFor(DATA, topicId));

  console.log(`Topic: ${topicId || '(none)'}`);
  printProblems('warning', '!', warnings);
  printProblems('error', '✗', errors);
  if (errors.length) fail('\nNothing was saved. Fix the rows above and run the import again.');

  const before = readTopic(DATA, topicId);
  const content = alignContent(parsed, before);
  const changes = diffContent(before, content);
  console.log(before ? '\nCompared with the app\'s current content:' : '\nNew content:');
  const total = printChanges(changes);
  if (changes.questions.removed.length + changes.levels.removed.length) console.log('\n  Note: learners\' progress is stored by id. Removing or renaming a level or question drops their history for it.');

  const files = topicFileTexts(DATA, content);
  const unchanged = files.every(([file, text]) => existsSync(file) && readFileSync(file, 'utf8') === text);
  if (unchanged) {
    console.log('\nNo changes: the spreadsheet matches the app\'s content.');
    return;
  }
  if (!total) console.log('\n  Same content; only the file formatting or order differs.');
  if (!flags.write) {
    console.log('\nThe spreadsheet is valid. Nothing was saved: add --write to save it.');
    return;
  }

  const previous = files.map(([file]) => [file, existsSync(file) ? readFileSync(file) : null]);
  for (const [file, text] of files) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  const validation = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate-data.js')], { cwd: ROOT, encoding: 'utf8' });
  if (validation.status !== 0) {
    for (const [file, bytes] of previous) {
      if (bytes === null) rmSync(file, { force: true });
      else writeFileSync(file, bytes);
    }
    const output = `${validation.stdout || ''}${validation.stderr || ''}`;
    const at = output.lastIndexOf(' error(s)');
    console.log(`\nThe content validator rejected the result:\n${at < 0 ? output : output.slice(output.lastIndexOf('\n', at) + 1)}`);
    fail('Nothing was saved: the files were put back as they were.');
  }
  console.log(`\nSaved and validated:\n${files.map(([file]) => `  ${shown(file)}`).join('\n')}`);
  console.log('Next: npm run check, then commit.');
}

/* -------------------------------- template -------------------------------- */

async function writeTemplate(flags) {
  const path = flags.out ? resolve(flags.out) : join(DEFAULT_OUT, 'template.xlsx');
  await saveWorkbook(path, toSheets(templateContent()));
  console.log(`${shown(path)}\nReplace the example rows with your own. The topic must be in src/data/topics.json before you import.`);
}

/* ---------------------------------- main ---------------------------------- */

const [command, ...rest] = process.argv.slice(2);
const { flags, positional } = parseArgs(rest);

if (command === 'export') await exportTopics(positional[0], flags);
else if (command === 'import') await importTopic(positional[0], flags);
else if (command === 'template') await writeTemplate(flags);
else {
  fail(
    [
      'Usage:',
      '  npm run content:export -- <topicId|all> [--csv] [--out <folder>]',
      '  npm run content:import -- <file.xlsx|csv folder> [--write]',
      '  npm run content:template [-- --out <file.xlsx>]'
    ].join('\n')
  );
}
