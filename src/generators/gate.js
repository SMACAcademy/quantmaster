/**
 * Lazy access to the question generators.
 *
 * The templates are a large chunk of code that only matters once a learner starts
 * practising, so they are loaded with a dynamic import instead of shipping in the
 * main bundle. `ensureGenerators()` loads them (services/contentGate.js calls it
 * alongside the topic packs); after that, the functions below behave exactly like
 * their namesakes in ./index.js. Called too early, they return an empty result
 * rather than throwing, and warn once so the missing await is easy to find.
 */

import { GENERATED_PREFIX } from './engine.js';

let generators = null;
let pending = null;
const warned = new Set();

export function ensureGenerators() {
  if (generators) return Promise.resolve();
  if (!pending) {
    pending = import('./index.js')
      .then((mod) => {
        generators = mod;
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

function loaded(name) {
  if (generators) return true;
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`[generators] ${name}() called before ensureGenerators() finished`);
  }
  return false;
}

/** Pure prefix check, so it never needs the templates. */
export function isGeneratedId(id) {
  return typeof id === 'string' && id.startsWith(`${GENERATED_PREFIX}:`);
}

export const questionFromId = (id) => (loaded('questionFromId') ? generators.questionFromId(id) : null);
export const conceptHasTemplates = (conceptId) => (loaded('conceptHasTemplates') ? generators.conceptHasTemplates(conceptId) : false);
export const topicHasTemplates = (topicId) => (loaded('topicHasTemplates') ? generators.topicHasTemplates(topicId) : false);
export const templatesForTopic = (topicId) => (loaded('templatesForTopic') ? generators.templatesForTopic(topicId) : []);
export const generateQuestions = (options) => (loaded('generateQuestions') ? generators.generateQuestions(options) : []);
export const generateSimilar = (question) => (loaded('generateSimilar') ? generators.generateSimilar(question) : null);
export const templateSummary = () =>
  loaded('templateSummary') ? generators.templateSummary() : { templates: 0, topics: 0, concepts: 0 };
