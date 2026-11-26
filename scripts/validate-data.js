#!/usr/bin/env node
/**
 * Content validator — run with `npm run validate-data`.
 *
 * Catches the errors that would otherwise surface as a broken question in front
 * of a learner: dangling references, unanswerable questions, duplicate ids,
 * unknown question types, malformed hints.
 *
 * Errors fail the run (exit 1). Warnings are reported but do not fail.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { solidProblems } from '../src/utils/solidGeometry.js';
import { clockProblems, numberLineProblems } from '../src/utils/figureMath.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src', 'data');

const VALID_DIFFICULTIES = ['easy', 'medium', 'complex'];
const VALID_LEARNING_STAGES = [
  'foundation',
  'recognition',
  'guided',
  'independent',
  'mixed',
  'challenge'
];
const VALID_LEVEL_TYPES = [
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
/** Revision cards: a formula, or a shortcut (a faster route to the same answer). */
const VALID_CARD_KINDS = ['formula', 'shortcut'];
const CHOICE_TYPES = [
  'single_choice',
  'formula_recognition',
  'formula_selection',
  'method_recognition',
  'statement_evaluation',
  'assertion_reason',
  'identify_error',
  'next_step',
  'estimate'
];
const VALID_QUESTION_TYPES = [
  ...CHOICE_TYPES,
  'multiple_choice',
  'numerical_input',
  'match_following',
  'ordering'
];

const errors = [];
const warnings = [];

const error = (where, message) => errors.push(`${where}: ${message}`);
const warn = (where, message) => warnings.push(`${where}: ${message}`);

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    error(basename(path), `invalid JSON — ${err.message}`);
    return null;
  }
}

function collect(key) {
  const out = [];
  const dirs = [join(DATA, 'content'), join(DATA, `${key}`)];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const payload = readJSON(join(dir, file));
      if (!payload) continue;
      const items = payload[key];
      if (Array.isArray(items)) {
        out.push(...items.map((item) => ({ item, file: `${basename(dir)}/${file}` })));
      }
    }
  }
  return out;
}

/* ----------------------------- load ----------------------------- */

const topicsFile = readJSON(join(DATA, 'topics.json'));
const achievementsFile = readJSON(join(DATA, 'achievements.json'));
if (!topicsFile || !achievementsFile) {
  console.error('Could not read topics.json or achievements.json.');
  process.exit(1);
}

const topics = topicsFile.topics || [];
const levels = collect('levels');
const concepts = collect('concepts');
const formulas = collect('formulas');
const questions = collect('questions');
const achievements = achievementsFile.achievements || [];

const topicIds = new Set(topics.map((t) => t.id));
const levelIds = new Set(levels.map(({ item }) => item.id));
const conceptIds = new Set(concepts.map(({ item }) => item.id));
const formulaIds = new Set(formulas.map(({ item }) => item.id));
const questionIds = new Set(questions.map(({ item }) => item.id));

/* ----------------------------- helpers ----------------------------- */

function checkUnique(list, label, getId = (x) => x.id) {
  const seen = new Set();
  for (const entry of list) {
    const item = entry.item ?? entry;
    const where = entry.file ? `${entry.file} → ${getId(item)}` : `${label} ${getId(item)}`;
    const id = getId(item);
    if (!id) {
      error(where, `${label} is missing an id`);
      continue;
    }
    if (seen.has(id)) error(where, `duplicate ${label} id "${id}"`);
    seen.add(id);
  }
}

function requireFields(item, fields, where) {
  for (const field of fields) {
    const value = field.split('.').reduce((acc, key) => acc?.[key], item);
    if (value === undefined || value === null || value === '') {
      error(where, `missing required field "${field}"`);
    }
  }
}

/* ----------------------------- topics ----------------------------- */

checkUnique(topics, 'topic');
for (const topic of topics) {
  const where = `topics.json → ${topic.id}`;
  requireFields(topic, ['id', 'name', 'category', 'description', 'glyph', 'colorToken'], where);
  for (const prereq of topic.prerequisites || []) {
    if (!topicIds.has(prereq)) error(where, `prerequisite topic "${prereq}" does not exist`);
  }
}

/* ----------------------------- simulations ----------------------------- */

const { SIMULATIONS } = await import('../src/simulations/index.js');
const simulationIds = new Set();
for (const simulation of SIMULATIONS) {
  const where = `simulation ${simulation.id}`;
  if (simulationIds.has(simulation.id)) error(where, 'duplicate simulation id');
  simulationIds.add(simulation.id);
  if (!topicIds.has(simulation.topicId)) error(where, `unknown topicId "${simulation.topicId}"`);
}

/* ----------------------------- levels ----------------------------- */

checkUnique(levels, 'level');
const levelsByTopic = new Map();
for (const { item: level, file } of levels) {
  const where = `${file} → ${level.id}`;
  requireFields(level, ['id', 'topicId', 'order', 'title', 'description', 'type'], where);

  if (!topicIds.has(level.topicId)) error(where, `unknown topicId "${level.topicId}"`);
  if (!VALID_LEVEL_TYPES.includes(level.type)) error(where, `invalid level type "${level.type}"`);
  if (level.difficulty && !VALID_DIFFICULTIES.includes(level.difficulty)) {
    error(where, `invalid difficulty "${level.difficulty}"`);
  }

  for (const prereq of level.prerequisiteLevelIds || []) {
    if (!levelIds.has(prereq)) error(where, `prerequisite level "${prereq}" does not exist`);
  }
  for (const conceptId of level.conceptIds || []) {
    if (!conceptIds.has(conceptId)) error(where, `unknown conceptId "${conceptId}"`);
  }
  for (const formulaId of level.formulaIds || []) {
    if (!formulaIds.has(formulaId)) error(where, `unknown formulaId "${formulaId}"`);
  }
  for (const questionId of level.questionIds || []) {
    if (!questionIds.has(questionId)) error(where, `unknown questionId "${questionId}"`);
  }

  if (level.type === 'concept') {
    if (!level.lesson?.blocks?.length) error(where, 'concept level has no lesson blocks');
    for (const block of level.lesson?.blocks || []) {
      if (block.type === 'check' && !questionIds.has(block.questionId)) {
        error(where, `lesson check references unknown question "${block.questionId}"`);
      }
      if (block.type === 'simulation' && !simulationIds.has(block.simulationId)) {
        error(where, `lesson refers to unknown simulation "${block.simulationId}"`);
      }
      if (block.type === 'figure') {
        if (!block.figure) error(where, 'lesson figure block has no figure');
        else checkFigure(block.figure, `${where} lesson figure`);
        if (!block.body) error(where, 'lesson figure block needs body text explaining the picture');
      }
    }
  } else if (level.type === 'formula_revision') {
    if (!level.formulaIds?.length) warn(where, 'formula revision level lists no formulaIds');
  } else if (!level.questionIds?.length && !level.questionQuery) {
    error(where, 'practice level has neither questionIds nor questionQuery');
  }

  if (level.questionQuery?.topicId && !topicIds.has(level.questionQuery.topicId)) {
    error(where, `questionQuery references unknown topic "${level.questionQuery.topicId}"`);
  }

  if (!levelsByTopic.has(level.topicId)) levelsByTopic.set(level.topicId, []);
  levelsByTopic.get(level.topicId).push(level);
}

for (const [topicId, list] of levelsByTopic) {
  const orders = list.map((l) => l.order);
  if (new Set(orders).size !== orders.length) {
    error(`levels for ${topicId}`, 'two levels share the same order value');
  }
}

/* ----------------------------- concepts ----------------------------- */

checkUnique(concepts, 'concept');
for (const { item: concept, file } of concepts) {
  const where = `${file} → ${concept.id}`;
  requireFields(concept, ['id', 'topicId', 'name', 'description'], where);
  if (!topicIds.has(concept.topicId)) error(where, `unknown topicId "${concept.topicId}"`);
}

/* ----------------------------- formulas ----------------------------- */

checkUnique(formulas, 'formula');
for (const { item: formula, file } of formulas) {
  const where = `${file} → ${formula.id}`;
  requireFields(formula, ['id', 'topicId', 'title', 'prompt', 'formula', 'explanation'], where);
  if (!topicIds.has(formula.topicId)) error(where, `unknown topicId "${formula.topicId}"`);
  if (formula.conceptId && !conceptIds.has(formula.conceptId)) {
    error(where, `unknown conceptId "${formula.conceptId}"`);
  }
  if (formula.kind !== undefined && !VALID_CARD_KINDS.includes(formula.kind)) {
    error(where, `invalid kind "${formula.kind}" (use ${VALID_CARD_KINDS.join(' or ')})`);
  }
  if (!formula.example) warn(where, 'formula has no worked example');
  if (!formula.commonMistake) warn(where, 'formula has no common mistake noted');
}

/* ----------------------------- questions ----------------------------- */

checkUnique(questions, 'question');
for (const { item: question, file } of questions) {
  const where = `${file} → ${question.id}`;
  requireFields(question, ['id', 'topicId', 'difficulty', 'type', 'question', 'explanation'], where);

  if (!topicIds.has(question.topicId)) error(where, `unknown topicId "${question.topicId}"`);
  if (question.conceptId && !conceptIds.has(question.conceptId)) {
    error(where, `unknown conceptId "${question.conceptId}"`);
  }
  if (question.levelId && !levelIds.has(question.levelId)) {
    error(where, `unknown levelId "${question.levelId}"`);
  }
  if (!VALID_DIFFICULTIES.includes(question.difficulty)) {
    error(where, `invalid difficulty "${question.difficulty}"`);
  }
  if (question.learningStage && !VALID_LEARNING_STAGES.includes(question.learningStage)) {
    error(where, `invalid learningStage "${question.learningStage}"`);
  }
  if (!VALID_QUESTION_TYPES.includes(question.type)) {
    error(where, `unknown question type "${question.type}" — add a renderer and evaluator first`);
  }

  for (const formulaId of question.formulaIds || []) {
    if (!formulaIds.has(formulaId)) error(where, `unknown formulaId "${formulaId}"`);
  }

  // Type-specific requirements
  if (CHOICE_TYPES.includes(question.type) || question.type === 'multiple_choice') {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      error(where, 'choice question needs at least two options');
    } else {
      const optionIds = new Set();
      for (const option of question.options) {
        if (!option.id || option.text === undefined) error(where, 'option missing id or text');
        if (optionIds.has(option.id)) error(where, `duplicate option id "${option.id}"`);
        optionIds.add(option.id);
      }
      if (!Array.isArray(question.correctAnswer) || !question.correctAnswer.length) {
        error(where, 'missing correctAnswer');
      } else {
        for (const answerId of question.correctAnswer) {
          if (!optionIds.has(answerId)) {
            error(where, `correctAnswer "${answerId}" is not one of the options`);
          }
        }
        if (question.type !== 'multiple_choice' && question.correctAnswer.length > 1) {
          error(where, `type "${question.type}" must have exactly one correct answer`);
        }
        if (question.type === 'multiple_choice' && question.correctAnswer.length < 2) {
          warn(where, 'multiple_choice question has only one correct answer');
        }
      }
      const texts = question.options.map((o) => String(o.text).trim().toLowerCase());
      if (new Set(texts).size !== texts.length) {
        error(where, 'two options have identical text');
      }
    }
  }

  if (question.type === 'assertion_reason' && (!question.assertion || !question.reason)) {
    error(where, 'assertion_reason question needs both "assertion" and "reason"');
  }

  if (question.type === 'numerical_input') {
    if (question.answer?.value === undefined || typeof question.answer.value !== 'number') {
      error(where, 'numerical_input needs answer.value as a number');
    }
    if (question.answer && question.answer.tolerance === undefined) {
      warn(where, 'numerical_input has no explicit tolerance (0 assumed)');
    }
  }

  if (question.type === 'match_following') {
    if (!Array.isArray(question.pairs) || question.pairs.length < 2) {
      error(where, 'match_following needs at least two pairs');
    } else {
      const rights = question.pairs.map((p) => p.right);
      if (new Set(rights).size !== rights.length) {
        error(where, 'match_following has duplicate right-hand values, making it ambiguous');
      }
      for (const pair of question.pairs) {
        if (!pair.left || !pair.right) error(where, 'match pair missing left or right');
      }
    }
  }

  if (question.type === 'ordering') {
    if (!Array.isArray(question.steps) || question.steps.length < 3) {
      error(where, 'ordering question needs at least three steps');
    } else {
      const ids = question.steps.map((s) => s.id);
      if (new Set(ids).size !== ids.length) error(where, 'ordering steps have duplicate ids');
      for (const step of question.steps) {
        if (!step.id || !step.text) error(where, 'ordering step missing id or text');
      }
    }
  }

  // Hints: levels should start at 1 and increase by one.
  if (question.hints?.length) {
    const levelsSeen = question.hints.map((h) => h.level);
    const expected = levelsSeen.map((_, i) => i + 1);
    if (JSON.stringify([...levelsSeen].sort((a, b) => a - b)) !== JSON.stringify(expected)) {
      error(where, `hint levels must run 1..n, found [${levelsSeen.join(', ')}]`);
    }
    for (const hint of question.hints) {
      if (!hint.text || hint.text.length < 10) error(where, 'hint text is missing or too short');
      if (/think carefully|be careful|try again/i.test(hint.text || '')) {
        warn(where, 'hint looks generic — hints should be question-specific');
      }
    }
  } else if (question.difficulty !== 'easy') {
    warn(where, 'non-easy question has no hints');
  }

  if (!question.solutionSteps?.length) warn(where, 'question has no solutionSteps');
  checkSupportingData(question, where);
}

/** Table, chart and figure checks, shared by authored and generated questions. */
function checkSupportingData(question, where) {
  if (question.table) {
    const width = question.table.headers?.length;
    for (const row of question.table.rows || []) {
      if (width && row.length !== width) {
        error(where, 'table row length does not match the header count');
      }
    }
  }
  if (question.chart) checkChart(question.chart, where);
  if (question.figure) checkFigure(question.figure, where);
}

function checkFigure(figure, where) {
  const validTypes = ['coordinate-plane', 'diagram', 'venn', 'solid', 'clock', 'numberline'];
  if (!validTypes.includes(figure.type)) {
    error(where, `figure type must be one of ${validTypes.join(', ')}`);
    return;
  }
  if (figure.type === 'coordinate-plane') checkCoordinatePlane(figure, where);
  if (figure.type === 'diagram') checkDiagram(figure, where);
  if (figure.type === 'venn') checkVenn(figure, where);
  if (figure.type === 'solid') for (const problem of solidProblems(figure)) error(where, problem);
  if (figure.type === 'clock') for (const problem of clockProblems(figure)) error(where, problem);
  if (figure.type === 'numberline') for (const problem of numberLineProblems(figure)) error(where, problem);
  if (!figure.ariaSummary || figure.ariaSummary.length < 10) {
    error(where, 'figure needs an ariaSummary of at least 10 characters, for screen readers');
  }
  if (!figure.caption) warn(where, 'figure has no caption');
}

/** A Venn figure: 2 or 3 named sets, and only known regions holding a count or "?". */
function checkVenn(figure, where) {
  const sets = figure.sets || [];
  if (sets.length !== 2 && sets.length !== 3) {
    error(where, 'venn figure needs 2 or 3 sets');
    return;
  }
  if (sets.some((name) => typeof name !== 'string' || !name.trim())) error(where, 'venn set names must be non-empty text');
  const allowed = sets.length === 2 ? ['a', 'b', 'ab', 'none'] : ['a', 'b', 'c', 'ab', 'ac', 'bc', 'abc', 'none'];
  for (const [key, value] of Object.entries(figure.regions || {})) {
    if (!allowed.includes(key)) error(where, `venn region "${key}" is not one of ${allowed.join(', ')}`);
    const ok = (typeof value === 'number' && Number.isFinite(value) && value >= 0) || value === '?';
    if (!ok) error(where, `venn region "${key}" must be a count or "?"`);
  }
}

/** Validates ids and finite x/y for a figure's `points`, returning the set of valid ids. */
function checkPointIds(points, where) {
  const ids = new Set();
  for (const point of points) {
    if (!point.id) error(where, 'every point needs an id');
    if (ids.has(point.id)) error(where, `duplicate point id "${point.id}"`);
    ids.add(point.id);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      error(where, `point "${point.id}" needs finite x and y`);
    }
  }
  return ids;
}

function checkCoordinatePlane(figure, where) {
  const range = (name, r) => {
    if (!Array.isArray(r) || r.length !== 2 || !Number.isFinite(r[0]) || !Number.isFinite(r[1]) || r[0] >= r[1]) {
      error(where, `${name} must be a [min, max] array with min < max`);
      return false;
    }
    return true;
  };
  const okX = range('xRange', figure.xRange);
  const okY = range('yRange', figure.yRange);

  const points = figure.points || [];
  if (!points.length) warn(where, 'coordinate-plane figure has no points');
  const ids = checkPointIds(points, where);
  for (const point of points) {
    if (okX && Number.isFinite(point.x) && (point.x < figure.xRange[0] || point.x > figure.xRange[1])) {
      warn(where, `point "${point.id}" falls outside xRange`);
    }
    if (okY && Number.isFinite(point.y) && (point.y < figure.yRange[0] || point.y > figure.yRange[1])) {
      warn(where, `point "${point.id}" falls outside yRange`);
    }
  }
  for (const segment of figure.segments || []) {
    if (!ids.has(segment.from) || !ids.has(segment.to)) {
      error(where, `segment references an unknown point id ("${segment.from}" -> "${segment.to}")`);
    }
  }
  for (const line of figure.lines || []) {
    const [fromId, toId] = line.through || [];
    if (!ids.has(fromId) || !ids.has(toId)) {
      error(where, `line references an unknown point id ("${fromId}" -> "${toId}")`);
    }
  }
}

/** A circle, arc, sector or circular segment: a known centre, a positive radius, sensible angles. */
function checkRoundPart(shape, where, knownRef) {
  if (!knownRef(shape.center)) error(where, `${shape.type} references an unknown centre point id "${shape.center}"`);
  if (!Number.isFinite(shape.radius) || shape.radius <= 0) error(where, `${shape.type} needs a positive finite radius`);
  if (shape.type === 'circle') return;
  if (!Number.isFinite(shape.startAngle) || !Number.isFinite(shape.endAngle)) {
    error(where, `${shape.type} needs finite startAngle and endAngle`);
  } else if (shape.type !== 'arc' && !(shape.endAngle > shape.startAngle)) {
    error(where, `${shape.type} endAngle must be greater than startAngle (angles run clockwise from the top)`);
  }
}

function checkDiagram(figure, where) {
  const points = figure.points || [];
  if (points.length < 2) error(where, 'diagram figure needs at least 2 points');
  const ids = checkPointIds(points, where);
  const knownRef = (id) => ids.has(id);

  for (const shape of figure.shapes || []) {
    const validShapeTypes = ['polygon', 'segment', 'circle', 'arc', 'sector'];
    if (!validShapeTypes.includes(shape.type)) {
      error(where, `shape type must be one of ${validShapeTypes.join(', ')}`);
      continue;
    }
    if (shape.type === 'polygon') {
      if (!shape.points || shape.points.length < 3) error(where, 'a polygon needs at least 3 points');
      for (const id of shape.points || []) if (!knownRef(id)) error(where, `polygon references an unknown point id "${id}"`);
    }
    if (shape.type === 'segment' && (!knownRef(shape.from) || !knownRef(shape.to))) {
      error(where, `segment references an unknown point id ("${shape.from}" -> "${shape.to}")`);
    }
    if (['circle', 'arc', 'sector'].includes(shape.type)) checkRoundPart(shape, where, knownRef);
  }
  // Shaded regions: built from polygons, circles, sectors and circular segments.
  for (const region of figure.shaded || []) {
    const parts = region.parts || [];
    if (!parts.length) error(where, 'a shaded region needs at least one part');
    if (region.mode !== undefined && !['evenodd', 'intersect'].includes(region.mode)) {
      error(where, `shaded region mode must be "evenodd" or "intersect", not "${region.mode}"`);
    }
    if (region.mode === 'intersect' && parts.length < 2) error(where, 'an intersect region needs at least 2 parts');
    for (const part of parts) {
      if (!['polygon', 'circle', 'sector', 'segment'].includes(part.type)) {
        error(where, `shaded part type must be polygon, circle, sector or segment, not "${part.type}"`);
        continue;
      }
      if (part.type === 'polygon') {
        if (!part.points || part.points.length < 3) error(where, 'a shaded polygon needs at least 3 points');
        for (const id of part.points || []) if (!knownRef(id)) error(where, `shaded polygon references an unknown point id "${id}"`);
      } else {
        checkRoundPart(part, where, knownRef);
      }
    }
    if (region.label !== undefined && (typeof region.label !== 'string' || !region.label.trim())) error(where, 'shaded region label must be text');
    if (region.label && !knownRef(region.labelAt)) error(where, `shaded region label needs a known labelAt point (got "${region.labelAt}")`);
  }
  for (const angle of figure.angles || []) {
    if (!knownRef(angle.at) || !knownRef(angle.from) || !knownRef(angle.to)) {
      error(where, `angle references an unknown point id (at "${angle.at}")`);
    }
    if (angle.labelRadius !== undefined && !(Number.isFinite(angle.labelRadius) && angle.labelRadius > 0)) {
      error(where, 'angle labelRadius must be a positive number');
    }
  }
  for (const ra of figure.rightAngles || []) {
    if (!knownRef(ra.at) || !knownRef(ra.from) || !knownRef(ra.to)) {
      error(where, `rightAngle references an unknown point id (at "${ra.at}")`);
    }
  }
  for (const tick of figure.ticks || []) {
    const [a, b] = tick.on || [];
    if (!knownRef(a) || !knownRef(b)) error(where, `tick references an unknown point id ("${a}" -> "${b}")`);
    if (tick.count && tick.count > 4) warn(where, 'tick mark count over 4 may look cluttered');
  }
  for (const parallel of figure.parallels || []) {
    const [a, b] = parallel.on || [];
    if (!knownRef(a) || !knownRef(b)) error(where, `parallel mark references an unknown point id ("${a}" -> "${b}")`);
  }
}

function checkChart(chart, where) {
  const validTypes = ['bar', 'line', 'pie', 'combo', 'radar'];
  if (!validTypes.includes(chart.type)) {
    error(where, `chart type must be one of ${validTypes.join(', ')}`);
  }
  if (chart.type === 'combo') {
    const kinds = (chart.series || []).map((s) => s.kind);
    if (!kinds.every((k) => k === 'bar' || k === 'line')) error(where, 'every combo series needs kind "bar" or "line"');
    if (!kinds.includes('bar') || !kinds.includes('line')) error(where, 'a combo chart needs at least one bar series and one line series');
  }
  if (chart.type === 'radar' && (chart.categories?.length || 0) < 3) error(where, 'a radar chart needs at least 3 categories');
  const categoryCount = chart.categories?.length || 0;
  if (categoryCount < 2) error(where, 'chart needs at least 2 categories');
  if (categoryCount > 8) warn(where, 'chart has more than 8 categories — may be hard to read on a phone');

  if (!chart.series?.length) {
    error(where, 'chart needs at least one data series');
    return;
  }
  if (chart.type === 'pie' && chart.series.length > 1) {
    error(where, 'pie chart must have exactly one series');
  }
  for (const series of chart.series) {
    if (series.data?.length !== categoryCount) {
      error(where, `chart series "${series.label}" length does not match the category count`);
    }
    for (const value of series.data || []) {
      if (!Number.isFinite(value) || value < 0) {
        error(where, `chart series "${series.label}" has a non-finite or negative value`);
      }
    }
  }
  if (chart.type === 'pie' && chart.unit === '%') {
    const total = (chart.series[0]?.data || []).reduce((sum, v) => sum + v, 0);
    if (Math.abs(total - 100) > 1) error(where, `pie chart values in % should sum to ~100, got ${total}`);
  }
  if (!chart.ariaSummary || chart.ariaSummary.length < 10) {
    error(where, 'chart needs an ariaSummary of at least 10 characters, for screen readers');
  }
  if (!chart.caption) warn(where, 'chart has no caption');
}

/* ----------------------------- achievements ----------------------------- */

checkUnique(achievements, 'achievement');
for (const achievement of achievements) {
  const where = `achievements.json → ${achievement.id}`;
  requireFields(achievement, ['id', 'name', 'description', 'criteria.type'], where);
  if (achievement.criteria?.type === 'topicMastery' && !topicIds.has(achievement.criteria.topicId)) {
    error(where, `criteria references unknown topic "${achievement.criteria.topicId}"`);
  }
  if (typeof achievement.criteria?.threshold !== 'number') {
    error(where, 'criteria.threshold must be a number');
  }
}

/* ----------------------------- generators ----------------------------- */

const { getTemplates, questionKey } = await import('../src/generators/index.js');
const { buildInstance } = await import('../src/generators/engine.js');

const GENERATOR_SEEDS = 400;
const templateReport = [];
const templateIds = new Set();

for (const template of getTemplates()) {
  const where = `generator ${template.id}`;
  if (templateIds.has(template.id)) error(where, 'duplicate template id');
  templateIds.add(template.id);

  if (!topicIds.has(template.topicId)) error(where, `unknown topicId "${template.topicId}"`);
  if (!conceptIds.has(template.conceptId)) error(where, `unknown conceptId "${template.conceptId}"`);
  for (const formulaId of template.formulaIds || []) {
    if (!formulaIds.has(formulaId)) error(where, `unknown formulaId "${formulaId}"`);
  }
  if (!VALID_DIFFICULTIES.includes(template.difficulty)) {
    error(where, `invalid difficulty "${template.difficulty}"`);
  }
  if (!['single_choice', 'numerical_input'].includes(template.type)) {
    error(where, `unsupported generated type "${template.type}"`);
  }
  if (!Number.isInteger(template.version)) error(where, 'version must be an integer');

  let valid = 0;
  let supportingDataOk = true;
  const texts = new Set();
  for (let seed = 1; seed <= GENERATOR_SEEDS; seed++) {
    const { question } = buildInstance(template, seed);
    if (!question) continue;
    valid += 1;
    texts.add(questionKey(question));
    // Generated figures/charts/tables get the same checks as authored ones;
    // report only the first bad seed so one broken template isn't 400 errors.
    if (supportingDataOk) {
      const before = errors.length;
      checkSupportingData(question, `${where} (seed ${seed})`);
      supportingDataOk = errors.length === before;
    }
  }
  templateReport.push({ id: template.id, valid, unique: texts.size });
  if (valid < GENERATOR_SEEDS * 0.1) {
    error(where, `only ${valid}/${GENERATOR_SEEDS} seeds produced a valid question`);
  }
  if (texts.size < 15) {
    warn(where, `only ${texts.size} distinct questions across ${GENERATOR_SEEDS} seeds`);
  }
}

/* ----------------------------- coverage report ----------------------------- */

const playableTopics = new Set(levels.map(({ item }) => item.topicId));
const questionsByTopic = new Map();
for (const { item } of questions) {
  questionsByTopic.set(item.topicId, (questionsByTopic.get(item.topicId) || 0) + 1);
}

for (const topicId of playableTopics) {
  if (!questionsByTopic.get(topicId)) {
    warn(`topic ${topicId}`, 'has levels but no questions');
  }
}

// Orphan questions: authored but not reachable from any level (directly or by query).
const referencedQuestionIds = new Set();
for (const { item: level } of levels) {
  for (const id of level.questionIds || []) referencedQuestionIds.add(id);
  for (const block of level.lesson?.blocks || []) {
    if (block.questionId) referencedQuestionIds.add(block.questionId);
  }
}
const queryTopics = new Set(
  levels.filter(({ item }) => item.questionQuery).map(({ item }) => item.questionQuery.topicId)
);
for (const { item: question, file } of questions) {
  if (!referencedQuestionIds.has(question.id) && !queryTopics.has(question.topicId)) {
    warn(`${file} → ${question.id}`, 'question is not reachable from any level');
  }
}

/* ----------------------------- output ----------------------------- */

const line = '─'.repeat(64);
console.log(line);
console.log('QuantMaster content validation');
console.log(line);
console.log(`Topics:       ${topics.length} (${playableTopics.size} with levels)`);
console.log(`Levels:       ${levels.length}`);
console.log(`Concepts:     ${concepts.length}`);
const shortcutCount = formulas.filter(({ item }) => item.kind === 'shortcut').length;
console.log(`Formulas:     ${formulas.length - shortcutCount} (plus ${shortcutCount} shortcuts)`);
console.log(`Questions:    ${questions.length}`);
console.log(`Achievements: ${achievements.length}`);
console.log(`Simulations:  ${SIMULATIONS.length}`);

const typeCounts = {};
for (const { item } of questions) typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
console.log(`\nQuestion types in use: ${Object.keys(typeCounts).length}`);
for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(22)} ${count}`);
}

const difficultyCounts = {};
for (const { item } of questions) {
  difficultyCounts[item.difficulty] = (difficultyCounts[item.difficulty] || 0) + 1;
}
console.log(`\nBy difficulty: ${VALID_DIFFICULTIES.map((d) => `${d} ${difficultyCounts[d] || 0}`).join(' · ')}`);

const generatorTopics = new Set(getTemplates().map((t) => t.topicId));
console.log(
  `\nQuestion generators: ${templateReport.length} templates across ${generatorTopics.size} topics`
);
const weakest = [...templateReport].sort((a, b) => a.valid - b.valid).slice(0, 3);
console.log(
  `  lowest valid-seed rates: ${weakest.map((t) => `${t.id} ${Math.round((t.valid / GENERATOR_SEEDS) * 100)}%`).join(' · ')}`
);
console.log(
  `  distinct questions per ${GENERATOR_SEEDS} seeds: ${templateReport.reduce((sum, t) => sum + t.unique, 0)} total`
);

if (warnings.length) {
  console.log(`\n${line}\n${warnings.length} warning(s)\n${line}`);
  for (const message of warnings) console.log(`  ! ${message}`);
}

if (errors.length) {
  console.log(`\n${line}\n${errors.length} error(s)\n${line}`);
  for (const message of errors) console.log(`  ✗ ${message}`);
  console.log('\nValidation FAILED');
  process.exit(1);
}

console.log(`\nValidation passed${warnings.length ? ` with ${warnings.length} warning(s)` : ''}.`);
