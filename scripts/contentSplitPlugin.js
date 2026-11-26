/**
 * Vite plugin: splits the authored content into a small catalogue that ships in
 * the main bundle and one lazily loaded "pack" per topic.
 *
 *   virtual:qm-catalogue   concepts, formulas and levels for every topic (formula
 *                          cards without their study text, levels without their
 *                          lesson blocks), plus a question index:
 *                          which topic owns each authored question id, and which
 *                          concepts have authored questions
 *   virtual:qm-packs       { topicId: () => import('virtual:qm-pack/<topicId>') }
 *   virtual:qm-pack/<id>   that topic's questions, lesson blocks and formula-card text
 *
 * Authoring is unchanged: content still lives in src/data/content/<topic>.json
 * or the split levels|concepts|formulas|questions/<topic>.json layout.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CATALOGUE = 'virtual:qm-catalogue';
const PACKS = 'virtual:qm-packs';
const PACK_PREFIX = 'virtual:qm-pack/';
const LAYOUTS = ['content', 'levels', 'concepts', 'formulas', 'questions'];
const KEYS = ['concepts', 'formulas', 'levels', 'questions'];
/* Formula-card text only the flashcard views show; everything else stays in the catalogue. */
const FORMULA_DETAIL_KEYS = ['prompt', 'explanation', 'example', 'commonMistake', 'applicationPrompt', 'variables'];

function splitFormula(formula) {
  const meta = {};
  const details = {};
  for (const [key, value] of Object.entries(formula)) (FORMULA_DETAIL_KEYS.includes(key) ? details : meta)[key] = value;
  return { meta, details };
}

/** Every content file, merged per topic id. */
function readContent(dataDir) {
  const files = [];
  const topics = new Map();
  for (const layout of LAYOUTS) {
    const dir = join(dataDir, layout);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
      const file = join(dir, name);
      files.push(file);
      const payload = JSON.parse(readFileSync(file, 'utf8'));
      for (const key of KEYS) {
        for (const item of payload[key] || []) {
          if (!topics.has(item.topicId)) topics.set(item.topicId, { concepts: [], formulas: [], levels: [], questions: [] });
          topics.get(item.topicId)[key].push(item);
        }
      }
    }
  }
  return { files, topics };
}

/** A module whose default export is `value`, parsed with JSON.parse (faster than an object literal). */
const jsonModule = (value) => `export default JSON.parse(${JSON.stringify(JSON.stringify(value))});\n`;

export function contentSplitPlugin({ dataDir = 'src/data' } = {}) {
  // Absolute, so the dev server can track the files it watches.
  let root = resolve(dataDir);
  return {
    name: 'quantmaster-content-split',
    configResolved(config) {
      root = resolve(config.root, dataDir);
    },
    resolveId(id) {
      if (id === CATALOGUE || id === PACKS || id.startsWith(PACK_PREFIX)) return `\0${id}`;
      return null;
    },
    load(id) {
      if (!id.startsWith('\0virtual:qm-')) return null;
      const { files, topics } = readContent(root);
      for (const file of files) this.addWatchFile(file);
      const virtualId = id.slice(1);

      if (virtualId === CATALOGUE) {
        const concepts = [];
        const formulas = [];
        const levels = [];
        const questionTopic = {};
        const conceptsWithQuestions = new Set();
        for (const [topicId, t] of topics) {
          concepts.push(...t.concepts);
          formulas.push(...t.formulas.map((f) => splitFormula(f).meta));
          for (const level of t.levels) {
            const { lesson, ...meta } = level;
            levels.push(lesson ? { ...meta, lessonBlockCount: lesson.blocks?.length ?? 0 } : meta);
          }
          for (const q of t.questions) {
            if (q.active === false) continue;
            questionTopic[q.id] = topicId;
            if (q.conceptId) conceptsWithQuestions.add(q.conceptId);
          }
        }
        return jsonModule({ concepts, formulas, levels, questionTopic, conceptsWithQuestions: [...conceptsWithQuestions] });
      }

      if (virtualId === PACKS) {
        const entries = [...topics.keys()]
          .filter((topicId) => {
            const t = topics.get(topicId);
            return t.questions.length || t.formulas.length || t.levels.some((l) => l.lesson);
          })
          .map((topicId) => `  ${JSON.stringify(topicId)}: () => import(${JSON.stringify(PACK_PREFIX + topicId)})`);
        return `export default {\n${entries.join(',\n')}\n};\n`;
      }

      const topicId = virtualId.slice(PACK_PREFIX.length);
      const t = topics.get(topicId);
      if (!t) return jsonModule({ questions: [], lessons: {}, formulaDetails: {} });
      const lessons = Object.fromEntries(t.levels.filter((l) => l.lesson).map((l) => [l.id, l.lesson]));
      const formulaDetails = Object.fromEntries(t.formulas.map((f) => [f.id, splitFormula(f).details]));
      return jsonModule({ questions: t.questions, lessons, formulaDetails });
    }
  };
}
