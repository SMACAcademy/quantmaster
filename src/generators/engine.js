/**
 * Turns a template + seed into a standard question object, and refuses to emit
 * anything that fails validation.
 *
 * Template contract:
 * {
 *   id, version, topicId, conceptId, difficulty, type ('single_choice' | 'numerical_input'),
 *   formulaIds?, tags?, estimatedSeconds?,
 *   answerDecimals?  max decimal places the correct answer may have (default 0)
 *   tolerance?       numeric-entry tolerance (default 0)
 *   unit?            numeric-entry unit ('₹', '%', …)
 *   formatValue?     (value, params) => string, used for options
 *   optionOrder?     string[] — show options in this fixed order instead of shuffling
 *   optionCount?     4 (default) or 5 — how many options to show (bank papers use 5)
 *   params(rng)      => params object, or null to reject this seed
 *   answer(p)        => the correct value (number, or string for text answers)
 *   distractors(p)   => [{ value, why }]  — wrong answers modelled on real errors
 *   verify(p, value) => boolean — an INDEPENDENT check of the answer
 *   render(p, ctx)   => { question, context?, table?, chart?, figure?, explanation,
 *                         solutionSteps, hints, method, commonMistakes }
 *                       ctx.fmt(value) formats like the options
 * }
 */

import { createRng, hasAtMostDecimals, nearlyEqual } from './core.js';

export const GENERATED_PREFIX = 'gen';
const MAX_ATTEMPTS = 40;
const SCATTERED_ATTEMPTS = 60;

export function buildId(template, seed) {
  return `${GENERATED_PREFIX}:${template.id}:${template.version}:${seed}`;
}

export function parseId(id) {
  if (typeof id !== 'string' || !id.startsWith(`${GENERATED_PREFIX}:`)) return null;
  const [, templateId, version, seed] = id.split(':');
  const parsedSeed = Number(seed);
  const parsedVersion = Number(version);
  if (!templateId || !Number.isInteger(parsedSeed) || !Number.isInteger(parsedVersion)) {
    return null;
  }
  return { templateId, version: parsedVersion, seed: parsedSeed };
}

const BAD_TEXT = /\b(NaN|undefined|Infinity|null)\b|\[object/;

function textIsClean(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.every(textIsClean);
  if (typeof value === 'object') return Object.values(value).every(textIsClean);
  return !BAD_TEXT.test(String(value));
}

/**
 * Build exactly one instance for `seed`. Returns `{ question }` or `{ error }`
 * so callers (and the validator) can see why a seed was rejected.
 */
export function buildInstance(template, seed) {
  const rng = createRng(seed);
  const params = template.params(rng);
  if (!params) return { error: 'params rejected' };

  const answer = template.answer(params);
  const isText = typeof answer === 'string';
  const formatValue = (value) =>
    template.formatValue ? template.formatValue(value, params) : String(value);

  if (!isText) {
    if (!Number.isFinite(answer)) return { error: 'answer is not a finite number' };
    if (!hasAtMostDecimals(answer, template.answerDecimals ?? 0)) {
      return { error: `answer ${answer} is not clean` };
    }
  }
  if (!template.verify(params, answer)) return { error: 'independent verification failed' };

  const rendered = template.render(params, { fmt: formatValue });
  if (!rendered?.question || !rendered.explanation) return { error: 'missing question text' };
  if (!rendered.hints?.length) return { error: 'no hints' };

  const question = {
    id: buildId(template, seed),
    topicId: template.topicId,
    conceptId: template.conceptId,
    levelId: null,
    difficulty: template.difficulty,
    learningStage: template.learningStage || 'independent',
    type: template.type,
    question: rendered.question,
    context: rendered.context || null,
    explanation: rendered.explanation,
    solutionSteps: rendered.solutionSteps || [],
    formulaIds: template.formulaIds || [],
    method: rendered.method || '',
    hints: rendered.hints.map((text, index) => ({ level: index + 1, text })),
    commonMistakes: rendered.commonMistakes || [],
    tags: ['generated', ...(template.tags || [])],
    estimatedSeconds: template.estimatedSeconds || 60,
    source: 'generated',
    generated: true,
    templateId: template.id,
    templateVersion: template.version,
    parameters: params,
    version: 1,
    active: true
  };
  for (const key of ['table', 'chart', 'figure']) {
    if (rendered[key]) question[key] = rendered[key];
  }

  if (template.type === 'numerical_input') {
    if (isText) return { error: 'numeric template returned text' };
    question.answer = {
      value: answer,
      tolerance: template.tolerance ?? 0,
      ...(template.unit ? { unit: template.unit } : {})
    };
  } else {
    const answerText = formatValue(answer);
    const seen = new Set([answerText]);
    const wrong = [];
    for (const candidate of template.distractors(params)) {
      const { value } = candidate;
      if (value === null || value === undefined) continue;
      if (!isText) {
        if (!Number.isFinite(value) || value < 0) continue;
        if (nearlyEqual(value, answer)) continue;
      } else if (value === answer) {
        continue;
      }
      const text = formatValue(value);
      if (seen.has(text)) continue;
      seen.add(text);
      wrong.push(text);
    }
    const optionCount = template.optionCount === 5 ? 5 : 4;
    if (wrong.length < optionCount - 1) {
      return { error: `only ${wrong.length} distinct distractors` };
    }
    const chosen = [answerText, ...wrong.slice(0, optionCount - 1)];
    // A fixed answer format (e.g. the four quantitative-comparison choices) keeps its order.
    const optionTexts = template.optionOrder
      ? chosen.sort((x, y) => template.optionOrder.indexOf(x) - template.optionOrder.indexOf(y))
      : rng.shuffle(chosen);
    const ids = ['a', 'b', 'c', 'd', 'e'];
    question.options = optionTexts.map((text, index) => ({ id: ids[index], text }));
    question.correctAnswer = [ids[optionTexts.indexOf(answerText)]];
  }

  if (!textIsClean([question.question, question.context, question.explanation, question.solutionSteps, question.hints, question.options, question.table, question.chart, question.figure])) {
    return { error: 'rendered text contains NaN/undefined' };
  }

  return { question };
}

/** A seed far from `seed`, different for each attempt (a 32-bit integer hash). */
function scatter(seed, attempt) {
  let h = Math.imul((seed ^ 0x9e3779b9) >>> 0, 0x85ebca6b) ^ Math.imul(attempt + 1, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * Find a valid instance starting at `seed`, stepping forward on rejection.
 * Neighbouring seeds can be rejected in long runs (a template that is valid
 * for a fifth of seeds has seen runs of 45), so after the forward steps it
 * tries seeds scattered far apart. The returned question's id records the
 * seed that actually worked, so a question always rebuilds exactly.
 */
export function generate(template, seed) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { question } = buildInstance(template, (seed + attempt) >>> 0);
    if (question) return question;
  }
  for (let attempt = 0; attempt < SCATTERED_ATTEMPTS; attempt++) {
    const { question } = buildInstance(template, scatter(seed, attempt));
    if (question) return question;
  }
  return null;
}
