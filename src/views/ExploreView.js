/**
 * Explore: interactive simulations to play with an idea before (or after)
 * practising it. The gallery lists them by category; each has its own page.
 * The simulations themselves load only when one is opened.
 */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { breadcrumbs, emptyState, linkButton, sectionHead } from '../components/ui.js';
import { SIMULATION_META, getSimulationMeta, loadSimulationKit } from '../simulations/meta.js';
import { solvedCount } from '../simulations/progress.js';
import { topicRepository } from '../repositories/contentRepository.js';

/** A card that opens a simulation's page. */
export function simulationCard(meta, { showTopic = true } = {}) {
  const topic = topicRepository.getById(meta.topicId);
  const done = solvedCount(meta.id, meta.taskIds);
  return el('a.card.sim-card', { href: `#/explore/${meta.id}`, style: { color: 'inherit' } }, [
    el('div.sim-card__icon', { style: { color: `var(--cat-${topic?.colorToken || 'algebra'})` } }, [icon('compass', { size: 20 })]),
    el('div.sim-card__body', {}, [
      showTopic && topic ? el('div.text-xs.text-subtle', { text: topic.name }) : null,
      el('div.sim-card__title', { text: meta.title }),
      el('div.text-sm.text-muted', { text: meta.summary }),
      el('div.text-xs.text-subtle', {
        style: { marginTop: '6px' },
        text: done ? `${done} of ${meta.taskIds.length} challenges done` : `${meta.taskIds.length} challenges to try`
      })
    ])
  ]);
}

export function ExploreView() {
  const sections = topicRepository
    .getCategories()
    .map((category) => {
      const topicIds = new Set(topicRepository.getByCategory(category.id).map((topic) => topic.id));
      const simulations = SIMULATION_META.filter((meta) => topicIds.has(meta.topicId));
      if (!simulations.length) return null;
      return el('section.section', {}, [sectionHead(category.name), el('div.grid.grid--cards', {}, simulations.map((meta) => simulationCard(meta)))]);
    })
    .filter(Boolean);

  const element = el('div', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Explore' }),
        el('p', {
          text: 'Move the sliders and watch the idea behave. Each simulation has a few challenges; nothing here is scored, so experiment freely.'
        })
      ])
    ]),
    ...sections
  ]);
  return { element, title: 'Explore' };
}

export async function ExploreSimulationView(ctx) {
  const meta = getSimulationMeta(ctx.params.simulationId);
  if (!meta) {
    return {
      title: 'Not found',
      element: emptyState({
        title: 'That simulation does not exist',
        body: 'The link may be out of date.',
        iconName: 'compass',
        action: linkButton('All simulations', '/explore', { variant: 'primary' })
      })
    };
  }
  const { getSimulation, simulationPanel } = await loadSimulationKit();
  const topic = topicRepository.getById(meta.topicId);
  const element = el('div.stack', { style: { gap: '18px' } }, [
    breadcrumbs([{ label: 'Explore', href: '/explore' }, topic ? { label: topic.name, href: `/topics/${topic.id}` } : null, { label: meta.title }].filter(Boolean)),
    simulationPanel(getSimulation(meta.id), { heading: 'h1' }),
    topic
      ? el('div.row.row--wrap', { style: { gap: '10px' } }, [
          linkButton(`Practise ${topic.name}`, `/practice?mode=smart&topic=${topic.id}`, { variant: 'primary', iconName: 'target' }),
          linkButton(`Back to ${topic.name}`, `/topics/${topic.id}`, { variant: 'ghost' })
        ])
      : null
  ]);
  return { element, title: meta.title };
}
