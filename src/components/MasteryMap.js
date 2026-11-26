/**
 * Per-topic mastery map: the topic's concepts laid out as a path of stages, one
 * stage per level that first practises them, so the map follows the order the
 * topic teaches. Each concept is a node whose ring fills with its mastery score
 * and whose colour follows the mastery label. Selecting a node practises it.
 */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { applyDecay, getMasteryLabel } from '../services/masteryEngine.js';

/* Levels that introduce concepts. Formula revision and mixed practice list everything. */
const INTRODUCING_TYPES = new Set(['concept', 'easy_practice', 'medium_practice', 'complex_practice', 'challenge']);
const STRONG_ENOUGH = new Set(['proficient', 'strong']);

/** Group concepts by the first level (in order) that practises them. */
export function buildMasteryStages(concepts, levels) {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const placed = new Set();
  const stages = [];
  for (const level of [...levels].sort((a, b) => a.order - b.order)) {
    if (!INTRODUCING_TYPES.has(level.type)) continue;
    const fresh = (level.conceptIds || []).filter((id) => byId.has(id) && !placed.has(id));
    if (!fresh.length) continue;
    fresh.forEach((id) => placed.add(id));
    stages.push({ title: level.title, levelId: level.id, concepts: fresh.map((id) => byId.get(id)) });
  }
  const rest = concepts.filter((c) => !placed.has(c.id));
  if (rest.length) stages.push({ title: 'More concepts', levelId: null, concepts: rest });
  return stages;
}

/** Score, label and whether it is fading (decayed since last practice) for one concept. */
export function conceptNodeState(state, now = new Date()) {
  if (!state?.attempts) return { started: false, score: 0, label: getMasteryLabel(0), fading: false };
  const score = applyDecay(state, now);
  return {
    started: true,
    score,
    label: getMasteryLabel(score),
    fading: score < state.masteryScore - 0.5
  };
}

function node(concept, state, onPractise) {
  const { started, score, label, fading } = conceptNodeState(state);
  const percent = Math.round(score);
  const meta = started ? `${label.label} · ${percent}%` : 'Not started';
  return el(
    'button',
    {
      type: 'button',
      class: `mastery-node mastery-node--${label.id}${fading ? ' is-fading' : ''}`,
      title: concept.description,
      'aria-label': `${concept.name}: ${meta}${fading ? ', fading' : ''}. Practise this concept.`,
      on: { click: () => onPractise(concept) }
    },
    [
      el('span.mastery-node__ring', { style: { '--p': String(started ? Math.max(percent, 4) : 0) } }, [
        el('span.mastery-node__core', {}, [
          started ? el('span', { text: `${percent}` }) : icon('play', { size: 14 })
        ])
      ]),
      el('span.mastery-node__name', { text: concept.name }),
      el('span.mastery-node__meta', { text: meta }),
      fading ? el('span.mastery-node__flag', {}, [icon('refresh', { size: 11 }), 'Fading']) : null
    ]
  );
}

/**
 * @param {{ concepts, levels, conceptProgress, onPractise: (concept) => void }} options
 */
export function masteryMap({ concepts, levels, conceptProgress, onPractise }) {
  const stages = buildMasteryStages(concepts, levels);
  const states = concepts.map((c) => conceptNodeState(conceptProgress[c.id]));
  const strong = states.filter((s) => STRONG_ENOUGH.has(s.label.id)).length;
  const fading = states.filter((s) => s.fading).length;

  return el('div.mastery-map', {}, [
    el('p.mastery-map__summary.text-sm.text-muted', {
      text:
        `${strong} of ${concepts.length} concept${concepts.length === 1 ? '' : 's'} proficient or better.` +
        (fading ? ` ${fading} fading since you last practised ${fading === 1 ? 'it' : 'them'}.` : '') +
        ' Select a concept to practise just that idea.'
    }),
    el(
      'ol.mastery-map__stages',
      {},
      stages.map((stage, index) =>
        el('li.mastery-stage', {}, [
          el('div.mastery-stage__head', {}, [
            el('span.mastery-stage__step', { text: String(index + 1) }),
            el('span.mastery-stage__title', { text: stage.title })
          ]),
          el(
            'div.mastery-stage__nodes',
            {},
            stage.concepts.map((concept) => node(concept, conceptProgress[concept.id], onPractise))
          )
        ])
      )
    )
  ]);
}
