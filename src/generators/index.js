/**
 * Question generator registry.
 *
 * Authored questions teach; generated questions give unlimited, fresh practice
 * on the same concepts so learners practise the method rather than memorising
 * a small bank of answers. Every generated instance has passed validation, and
 * its id (gen:<template>:<version>:<seed>) is enough to rebuild it exactly.
 *
 * Adding a template: write it in templates/*.js and add it to TEMPLATES below.
 * `npm run validate-data` and `npm test` exercise every template over hundreds
 * of seeds.
 */

import { createRng, randomSeed } from './core.js';
import { buildInstance, generate, parseId, GENERATED_PREFIX } from './engine.js';
import { questionKey } from './questionKey.js';
import { percentageTemplates } from './templates/percentages.js';
import { commercialTemplates } from './templates/commercial.js';
import { rateTemplates } from './templates/rates.js';
import { numberTemplates } from './templates/numbers.js';
import { motionTemplates } from './templates/motion.js';
import { numberTheoryTemplates } from './templates/numbertheory.js';
import { wageTemplates } from './templates/wages.js';
import { averageTemplates } from './templates/averages.js';
import { proportionTemplates } from './templates/proportion.js';
import { arithmeticTemplates } from './templates/arithmetic.js';
import { measureTemplates } from './templates/measures.js';
import { algebraTemplates } from './templates/algebra.js';
import { identitiesTemplates } from './templates/identities.js';
import { sequenceTemplates } from './templates/sequences.js';
import { functionTemplates } from './templates/functions.js';
import { combinatoricsTemplates } from './templates/combinatorics.js';
import { statisticsTemplates } from './templates/statistics.js';
import { mensurationTemplates } from './templates/mensuration.js';
import { geometryTemplates } from './templates/geometry.js';
import { dataInterpretationTemplates } from './templates/dataInterpretation.js';
import { trigonometryTemplates } from './templates/trigonometry.js';
import { heightsTemplates } from './templates/heights.js';
import { quadComparisonTemplates } from './templates/quadComparison.js';
import { diMixedTemplates } from './templates/diMixed.js';
import { moreAlgebraTemplates } from './templates/moreAlgebra.js';
import { moreArithmeticTemplates } from './templates/moreArithmetic.js';
import { moreRatesNumbersTemplates } from './templates/moreRatesNumbers.js';
import { moreGeometryDataTemplates } from './templates/moreGeometryData.js';
import { advTriangleCentresTemplates } from './templates/advTriangleCentres.js';
import { advInstalmentsTemplates } from './templates/advInstalments.js';
import { advAmGmTemplates } from './templates/advAmGm.js';
import { advNumberBasesTemplates } from './templates/advNumberBases.js';
import { advDiscountTemplates } from './templates/advDiscount.js';
import { advStocksTemplates } from './templates/advStocks.js';
import { advCircleSectorsTemplates } from './templates/advCircleSectors.js';

const TEMPLATES = [
  ...percentageTemplates,
  ...commercialTemplates,
  ...rateTemplates,
  ...numberTemplates,
  ...motionTemplates,
  ...numberTheoryTemplates,
  ...wageTemplates,
  ...averageTemplates,
  ...proportionTemplates,
  ...arithmeticTemplates,
  ...measureTemplates,
  ...algebraTemplates,
  ...identitiesTemplates,
  ...sequenceTemplates,
  ...functionTemplates,
  ...combinatoricsTemplates,
  ...statisticsTemplates,
  ...mensurationTemplates,
  ...geometryTemplates,
  ...dataInterpretationTemplates,
  ...trigonometryTemplates,
  ...heightsTemplates,
  ...quadComparisonTemplates,
  ...diMixedTemplates,
  ...moreAlgebraTemplates,
  ...moreArithmeticTemplates,
  ...moreRatesNumbersTemplates,
  ...moreGeometryDataTemplates,
  ...advTriangleCentresTemplates,
  ...advInstalmentsTemplates,
  ...advAmGmTemplates,
  ...advNumberBasesTemplates,
  ...advDiscountTemplates,
  ...advStocksTemplates,
  ...advCircleSectorsTemplates
];

const byId = new Map(TEMPLATES.map((template) => [template.id, template]));
const DIFFICULTY_RANK = { easy: 0, medium: 1, complex: 2 };

export function getTemplates() {
  return TEMPLATES.slice();
}

export function getTemplate(templateId) {
  return byId.get(templateId) || null;
}

export { questionKey } from './questionKey.js';

export function isGeneratedId(id) {
  return typeof id === 'string' && id.startsWith(`${GENERATED_PREFIX}:`);
}

/** Rebuild a previously generated question from its id. Null if the template changed. */
export function questionFromId(id) {
  const parsed = parseId(id);
  if (!parsed) return null;
  const template = byId.get(parsed.templateId);
  if (!template || template.version !== parsed.version) return null;
  return buildInstance(template, parsed.seed).question || null;
}

export function templatesForConcept(conceptId) {
  return TEMPLATES.filter((template) => template.conceptId === conceptId);
}

export function templatesForTopic(topicId) {
  return TEMPLATES.filter((template) => template.topicId === topicId);
}

export function topicHasTemplates(topicId) {
  return TEMPLATES.some((template) => template.topicId === topicId);
}

export function conceptHasTemplates(conceptId) {
  return TEMPLATES.some((template) => template.conceptId === conceptId);
}

export function generateFromTemplate(templateId, seed = randomSeed()) {
  const template = byId.get(templateId);
  return template ? generate(template, seed) : null;
}

/**
 * Generate `count` distinct questions, spread across the matching templates.
 * @param {object} options
 * @param {string[]} [options.conceptIds]
 * @param {string} [options.topicId]
 * @param {string[]} [options.topicIds]
 * @param {string} [options.maxDifficulty] - 'easy' | 'medium' | 'complex'
 * @param {Set<string>} [options.avoidText] - questionKey()s already in the session
 */
export function generateQuestions({
  conceptIds = null,
  topicId = null,
  topicIds = null,
  maxDifficulty = null,
  count = 5,
  avoidText = new Set()
} = {}) {
  let pool = TEMPLATES;
  if (conceptIds?.length) pool = pool.filter((t) => conceptIds.includes(t.conceptId));
  if (topicId) pool = pool.filter((t) => t.topicId === topicId);
  if (topicIds?.length) pool = pool.filter((t) => topicIds.includes(t.topicId));
  if (maxDifficulty) {
    pool = pool.filter((t) => DIFFICULTY_RANK[t.difficulty] <= DIFFICULTY_RANK[maxDifficulty]);
  }
  if (!pool.length || count <= 0) return [];

  const order = createRng(randomSeed()).shuffle(pool);
  const seenText = new Set(avoidText);
  const out = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 12) {
    const template = order[attempts % order.length];
    attempts += 1;
    const question = generate(template, randomSeed());
    if (!question || seenText.has(questionKey(question))) continue;
    seenText.add(questionKey(question));
    out.push(question);
  }
  return out;
}

/**
 * A fresh question on the same idea as `question` — used after a wrong answer
 * so the learner can immediately apply the explanation to new numbers.
 */
export function generateSimilar(question) {
  if (!question) return null;
  let candidates = question.templateId
    ? [byId.get(question.templateId)].filter(Boolean)
    : templatesForConcept(question.conceptId);
  if (!candidates.length) candidates = templatesForConcept(question.conceptId);
  if (!candidates.length) return null;

  const sameDifficulty = candidates.filter((t) => t.difficulty === question.difficulty);
  const pool = sameDifficulty.length ? sameDifficulty : candidates;

  for (let attempt = 0; attempt < 6; attempt++) {
    const template = pool[Math.floor(Math.random() * pool.length)];
    const fresh = generate(template, randomSeed());
    if (fresh && questionKey(fresh) !== questionKey(question)) return fresh;
  }
  return null;
}

export function templateSummary() {
  const topics = new Set(TEMPLATES.map((t) => t.topicId));
  const concepts = new Set(TEMPLATES.map((t) => t.conceptId));
  return { templates: TEMPLATES.length, topics: topics.size, concepts: concepts.size };
}
