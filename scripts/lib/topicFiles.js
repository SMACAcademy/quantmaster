/**
 * Reading and writing a topic's content files under src/data, in whichever of the
 * two layouts the topic uses: one `content/<topicId>.json`, or the split
 * `concepts|formulas|levels|questions/<topicId>.json`.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const KINDS = ['concepts', 'formulas', 'levels', 'questions'];

const readJSON = (path) => JSON.parse(readFileSync(path, 'utf8'));
const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`;
const jsonFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith('.json')) : []);

const singlePath = (dataDir, topicId) => join(dataDir, 'content', `${topicId}.json`);
const splitPath = (dataDir, kind, topicId) => join(dataDir, kind, `${topicId}.json`);

/** 'single', 'split', or 'new' when the topic has no content files yet. */
export function topicLayout(dataDir, topicId) {
  if (existsSync(singlePath(dataDir, topicId))) return 'single';
  if (KINDS.some((kind) => existsSync(splitPath(dataDir, kind, topicId)))) return 'split';
  return 'new';
}

/** The topic's content as `{ topicId, concepts, formulas, levels, questions }`, or null if it has none. */
export function readTopic(dataDir, topicId) {
  const layout = topicLayout(dataDir, topicId);
  if (layout === 'new') return null;
  if (layout === 'single') {
    const file = readJSON(singlePath(dataDir, topicId));
    return { topicId, ...Object.fromEntries(KINDS.map((kind) => [kind, file[kind] || []])) };
  }
  const content = { topicId };
  for (const kind of KINDS) {
    const path = splitPath(dataDir, kind, topicId);
    content[kind] = existsSync(path) ? readJSON(path)[kind] || [] : [];
  }
  return content;
}

/** The files an import would write, as `[path, text]` pairs, keeping the topic's layout. */
export function topicFileTexts(dataDir, content) {
  const { topicId } = content;
  if (topicLayout(dataDir, topicId) === 'split') {
    return KINDS.map((kind) => [splitPath(dataDir, kind, topicId), stringify({ topicId, [kind]: content[kind] })]);
  }
  const file = { topicId, ...Object.fromEntries(KINDS.map((kind) => [kind, content[kind]])) };
  return [[singlePath(dataDir, topicId), stringify(file)]];
}

/** Ids of every topic that has content files. */
export function topicsWithContent(dataDir) {
  const ids = new Set(jsonFiles(join(dataDir, 'content')).map((file) => file.replace(/\.json$/, '')));
  for (const kind of KINDS) for (const file of jsonFiles(join(dataDir, kind))) ids.add(file.replace(/\.json$/, ''));
  return [...ids].sort();
}

/**
 * What an import must be checked against: the ids in the topic catalogue, and
 * the ids other topics already use (ids are unique across the whole app).
 */
export function catalogueFor(dataDir, topicId) {
  const topicIds = new Set(readJSON(join(dataDir, 'topics.json')).topics.map((topic) => topic.id));
  const reserved = Object.fromEntries(KINDS.map((kind) => [kind, new Set()]));
  for (const other of topicsWithContent(dataDir)) {
    if (other === topicId) continue;
    const content = readTopic(dataDir, other);
    for (const kind of KINDS) for (const item of content[kind]) reserved[kind].add(item.id);
  }
  return { topicIds, reserved };
}
