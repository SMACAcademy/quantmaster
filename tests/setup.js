/** Loads every lazily split topic pack and the generators so tests can use the synchronous repositories. */

import { ensureAllTopics } from '../src/data/index.js';
import { ensureGenerators } from '../src/generators/gate.js';

await Promise.all([ensureAllTopics(), ensureGenerators()]);
