/**
 * Read-only content repositories (topics, levels, concepts, formulas, questions).
 *
 * Everything above this layer works with plain objects, so the JSON source can be
 * replaced by an API or database without touching the engines or the UI.
 */

import { conceptHasAuthoredQuestions, loadDataset } from '../data/index.js';
import { shuffle, uniq } from '../utils/format.js';
import { isGeneratedId, questionFromId } from '../generators/gate.js';

const data = () => loadDataset();

/* ============================ topics ============================ */

export const topicRepository = {
  getAll() {
    return data().topics.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  },
  getById(topicId) {
    return data().index.topicById.get(topicId) || null;
  },
  getByCategory(category) {
    return this.getAll().filter((t) => t.category === category);
  },
  getCategories() {
    const seen = new Map();
    for (const topic of this.getAll()) {
      if (!seen.has(topic.category)) {
        seen.set(topic.category, { id: topic.category, name: topic.categoryName, count: 0 });
      }
      seen.get(topic.category).count += 1;
    }
    return Array.from(seen.values());
  },
  /** Topics that actually have practice content authored. */
  getPlayable() {
    return this.getAll().filter((t) => levelRepository.getByTopic(t.id).length > 0);
  },
  search(term) {
    const q = term.trim().toLowerCase();
    if (!q) return this.getAll();
    return this.getAll().filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q)
    );
  }
};

/* ============================ levels ============================ */

export const levelRepository = {
  getByTopic(topicId) {
    return (data().index.levelsByTopic.get(topicId) || []).slice();
  },
  getById(levelId) {
    return data().index.levelById.get(levelId) || null;
  },
  getAll() {
    return data().levels.slice();
  },
  getNext(levelId) {
    const level = this.getById(levelId);
    if (!level) return null;
    const siblings = this.getByTopic(level.topicId);
    const index = siblings.findIndex((l) => l.id === levelId);
    return index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  },
  getPrevious(levelId) {
    const level = this.getById(levelId);
    if (!level) return null;
    const siblings = this.getByTopic(level.topicId);
    const index = siblings.findIndex((l) => l.id === levelId);
    return index > 0 ? siblings[index - 1] : null;
  }
};

/* ============================ concepts ============================ */

export const conceptRepository = {
  getByTopic(topicId) {
    return (data().index.conceptsByTopic.get(topicId) || []).slice().sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );
  },
  getById(conceptId) {
    return data().index.conceptById.get(conceptId) || null;
  },
  getAll() {
    return data().concepts.slice();
  },
  getByIds(ids) {
    return ids.map((id) => this.getById(id)).filter(Boolean);
  }
};

/* ============================ formulas ============================ */

/**
 * Revision cards come in two kinds: a formula (the rule itself) and a shortcut (a
 * faster route to the same answer). A card is a formula unless it says otherwise.
 */
export const CARD_KINDS = ['formula', 'shortcut'];
export const cardKind = (formula) => (formula.kind === 'shortcut' ? 'shortcut' : 'formula');
/** Keep only cards of one kind; no kind keeps them all. */
export const ofKind = (formulas, kind) => (CARD_KINDS.includes(kind) ? formulas.filter((f) => cardKind(f) === kind) : formulas);

export const formulaRepository = {
  getByTopic(topicId, kind = null) {
    return ofKind((data().index.formulasByTopic.get(topicId) || []).slice(), kind);
  },
  getById(formulaId) {
    return data().index.formulaById.get(formulaId) || null;
  },
  getByIds(ids) {
    return (ids || []).map((id) => this.getById(id)).filter(Boolean);
  },
  getAll(kind = null) {
    return ofKind(data().formulas.slice(), kind);
  },
  getByConcept(conceptId) {
    return this.getAll().filter((f) => f.conceptId === conceptId);
  },
  /**
   * Plausible wrong answers for recognition-mode cards: other formulas, preferring
   * ones from the same topic so the choice is genuinely discriminating.
   */
  getDistractors(formula, count = 3) {
    const sameTopic = this.getByTopic(formula.topicId).filter((f) => f.id !== formula.id);
    const others = this.getAll().filter(
      (f) => f.id !== formula.id && f.topicId !== formula.topicId
    );
    // Lookalikes of the same kind first: a shortcut among formulas would stand out.
    const sameKindFirst = (list) => {
      const kind = cardKind(formula);
      return list.filter((f) => cardKind(f) === kind).concat(list.filter((f) => cardKind(f) !== kind));
    };
    const pool = sameKindFirst(shuffle(sameTopic)).concat(sameKindFirst(shuffle(others)));
    const picked = [];
    const seenText = new Set([formula.formula]);
    for (const candidate of pool) {
      if (picked.length >= count) break;
      if (seenText.has(candidate.formula)) continue;
      seenText.add(candidate.formula);
      picked.push(candidate);
    }
    return picked;
  }
};

/* ============================ questions ============================ */

export const questionRepository = {
  getAll() {
    return data().questions.slice();
  },
  /** Authored questions by id; generated ids are rebuilt from their template and seed. */
  getById(questionId) {
    if (isGeneratedId(questionId)) return questionFromId(questionId);
    return data().index.questionById.get(questionId) || null;
  },
  getByIds(ids) {
    return (ids || []).map((id) => this.getById(id)).filter(Boolean);
  },
  getByTopic(topicId) {
    return (data().index.questionsByTopic.get(topicId) || []).slice();
  },
  getByLevel(levelId) {
    const level = levelRepository.getById(levelId);
    if (!level) return [];
    if (Array.isArray(level.questionIds) && level.questionIds.length) {
      return this.getByIds(level.questionIds);
    }
    if (level.questionQuery) {
      return this.query(level.questionQuery);
    }
    return this.getAll().filter((q) => q.levelId === levelId);
  },
  getByDifficulty(difficulty, topicId = null) {
    const pool = topicId ? this.getByTopic(topicId) : this.getAll();
    return pool.filter((q) => q.difficulty === difficulty);
  },
  getByConcept(conceptId) {
    return this.getAll().filter((q) => q.conceptId === conceptId);
  },
  getByConcepts(conceptIds) {
    const set = new Set(conceptIds);
    return this.getAll().filter((q) => set.has(q.conceptId));
  },
  /** From the catalogue index, so it works before the topic's questions are loaded. */
  conceptHasQuestions(conceptId) {
    return conceptHasAuthoredQuestions(conceptId);
  },
  getTopicIdsWithQuestions() {
    return uniq(this.getAll().map((q) => q.topicId));
  },
  /**
   * Declarative selection used by levels (`questionQuery`) and session building.
   * `criteria`: { topicId|topicIds, levelId, difficulties, conceptIds, types,
   *               excludeIds, count, preferUnseen, seenIds }
   */
  query(criteria = {}) {
    const {
      topicId,
      topicIds,
      levelId,
      difficulties,
      conceptIds,
      types,
      tags,
      excludeIds = [],
      count,
      preferUnseen = false,
      seenIds = new Set()
    } = criteria;

    let pool = this.getAll();
    if (topicId) pool = pool.filter((q) => q.topicId === topicId);
    if (topicIds?.length) {
      const set = new Set(topicIds);
      pool = pool.filter((q) => set.has(q.topicId));
    }
    if (levelId) pool = pool.filter((q) => q.levelId === levelId);
    if (difficulties?.length) {
      const set = new Set(difficulties);
      pool = pool.filter((q) => set.has(q.difficulty));
    }
    if (conceptIds?.length) {
      const set = new Set(conceptIds);
      pool = pool.filter((q) => set.has(q.conceptId));
    }
    if (types?.length) {
      const set = new Set(types);
      pool = pool.filter((q) => set.has(q.type));
    }
    if (tags?.length) {
      const set = new Set(tags);
      pool = pool.filter((q) => (q.tags || []).some((t) => set.has(t)));
    }
    if (excludeIds.length) {
      const set = new Set(excludeIds);
      pool = pool.filter((q) => !set.has(q.id));
    }

    let ordered = shuffle(pool);
    if (preferUnseen) {
      const unseen = ordered.filter((q) => !seenIds.has(q.id));
      const seen = ordered.filter((q) => seenIds.has(q.id));
      ordered = unseen.concat(seen);
    }
    return count ? ordered.slice(0, count) : ordered;
  },
  /** Questions the learner has never attempted. */
  getUnseenQuestions({ topicId = null, attemptedIds = new Set(), count = null } = {}) {
    const pool = (topicId ? this.getByTopic(topicId) : this.getAll()).filter(
      (q) => !attemptedIds.has(q.id)
    );
    const ordered = shuffle(pool);
    return count ? ordered.slice(0, count) : ordered;
  },
  search(term) {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return this.getAll().filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }
};

/* ============================ achievements ============================ */

export const achievementRepository = {
  getAll() {
    return data().achievements.slice();
  },
  getById(id) {
    return data().index.achievementById.get(id) || null;
  }
};

/** Counts used by topic cards and the catalogue. */
export function getTopicContentSummary(topicId) {
  return {
    levelCount: levelRepository.getByTopic(topicId).length,
    questionCount: questionRepository.getByTopic(topicId).length,
    formulaCount: formulaRepository.getByTopic(topicId).length,
    conceptCount: conceptRepository.getByTopic(topicId).length
  };
}
