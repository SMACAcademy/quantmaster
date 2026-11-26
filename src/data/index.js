/**
 * Content loader.
 *
 * Topic content is discovered from the filesystem — dropping
 * `content/<topicId>.json` (or the split `levels|concepts|formulas|questions/<topicId>.json`
 * layout) into this folder is enough to add a topic. No application code changes.
 *
 * The build splits that content in two (see scripts/contentSplitPlugin.js):
 *   - a catalogue in the main bundle: every topic's concepts, formulas (without the
 *     flashcard text) and levels (without lesson blocks), plus an index of which
 *     topic owns each question;
 *   - one lazily loaded pack per topic: its questions, lesson blocks and flashcard text.
 *
 * `loadDataset()` stays synchronous and returns everything loaded so far. Code that
 * needs a topic's questions or lessons first awaits `ensureTopics()` (usually through
 * services/contentGate.js), so the engines never have to deal with promises.
 *
 * The dataset returned here is the only thing repositories know about, which is
 * what keeps the learning engine independent of where content actually lives.
 */

import topicsFile from './topics.json';
import achievementsFile from './achievements.json';
import catalogue from 'virtual:qm-catalogue';
import packLoaders from 'virtual:qm-packs';

const loadedPacks = new Map(); // topicId -> { questions, lessons }
const pendingPacks = new Map(); // topicId -> Promise
const levelById = new Map(catalogue.levels.map((level) => [level.id, level]));
const formulaById = new Map(catalogue.formulas.map((formula) => [formula.id, formula]));
const conceptsWithQuestions = new Set(catalogue.conceptsWithQuestions);

let cache = null;

function groupByTopic(items) {
  const byTopic = new Map();
  for (const item of items) {
    if (!byTopic.has(item.topicId)) byTopic.set(item.topicId, []);
    byTopic.get(item.topicId).push(item);
  }
  return byTopic;
}

export function loadDataset() {
  if (cache) return cache;

  const topics = topicsFile.topics.filter((topic) => topic.active !== false);
  // Level and formula objects are shared with the catalogue, so lessons and flashcard
  // text attached when a pack loads show up everywhere.
  const levels = catalogue.levels.slice().sort((a, b) => a.order - b.order);
  const concepts = catalogue.concepts;
  const formulas = catalogue.formulas;
  const questions = [];
  for (const pack of loadedPacks.values()) questions.push(...pack.questions.filter((q) => q.active !== false));
  const achievements = achievementsFile.achievements;

  const levelsByTopic = groupByTopic(levels);
  for (const list of levelsByTopic.values()) list.sort((a, b) => a.order - b.order);

  cache = {
    version: topicsFile.version,
    topics,
    levels,
    concepts,
    formulas,
    questions,
    achievements,
    index: {
      topicById: new Map(topics.map((t) => [t.id, t])),
      levelById,
      conceptById: new Map(concepts.map((c) => [c.id, c])),
      formulaById,
      questionById: new Map(questions.map((q) => [q.id, q])),
      achievementById: new Map(achievements.map((a) => [a.id, a])),
      levelsByTopic,
      questionsByTopic: groupByTopic(questions),
      formulasByTopic: groupByTopic(formulas),
      conceptsByTopic: groupByTopic(concepts)
    }
  };

  return cache;
}

/* ============================ lazy topic packs ============================ */

function loadPack(topicId) {
  if (!pendingPacks.has(topicId)) {
    const promise = packLoaders[topicId]()
      .then((mod) => {
        const pack = mod.default ?? mod;
        for (const [levelId, lesson] of Object.entries(pack.lessons || {})) {
          const level = levelById.get(levelId);
          if (level) level.lesson = lesson;
        }
        for (const [formulaId, details] of Object.entries(pack.formulaDetails || {})) {
          const formula = formulaById.get(formulaId);
          if (formula) Object.assign(formula, details);
        }
        loadedPacks.set(topicId, pack);
        cache = null;
      })
      .catch((error) => {
        // Let a later call retry (e.g. after coming back online).
        pendingPacks.delete(topicId);
        throw error;
      });
    pendingPacks.set(topicId, promise);
  }
  return pendingPacks.get(topicId);
}

/** True once a topic's questions and lessons are available (or it has none to load). */
export function isTopicLoaded(topicId) {
  return loadedPacks.has(topicId) || !packLoaders[topicId];
}

/** Load the packs for these topics (already-loaded ones cost nothing). */
export function ensureTopics(topicIds) {
  const missing = [...new Set(topicIds)].filter((id) => packLoaders[id] && !loadedPacks.has(id));
  if (!missing.length) return Promise.resolve();
  return Promise.all(missing.map(loadPack)).then(() => undefined);
}

export function ensureAllTopics() {
  return ensureTopics(Object.keys(packLoaders));
}

/** The topic that owns an authored question id, from the catalogue (no pack needed). */
export function topicOfQuestion(questionId) {
  return catalogue.questionTopic[questionId] || null;
}

/** How many authored questions exist in total, from the catalogue (no pack needed). */
export function authoredQuestionCount() {
  return Object.keys(catalogue.questionTopic).length;
}

/** Whether a concept has authored questions, from the catalogue (no pack needed). */
export function conceptHasAuthoredQuestions(conceptId) {
  return conceptsWithQuestions.has(conceptId);
}

/** Test seam: drop the memoised dataset. */
export function resetDatasetCache() {
  cache = null;
}
