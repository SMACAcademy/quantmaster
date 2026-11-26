/** Topic catalogue with search, filters and sorting. */

import { el, render } from '../utils/dom.js';
import { plural } from '../utils/format.js';
import { badge, chip, emptyState, searchInput, segmented } from '../components/ui.js';
import { topicCard } from '../components/TopicCard.js';
import { topicRepository, getTopicContentSummary } from '../repositories/contentRepository.js';
import { getTopicSummary } from '../services/learningEngine.js';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'not_started', label: 'Not started' },
  { id: 'mastered', label: 'Mastered' }
];

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'progress', label: 'Progress' },
  { id: 'alphabetical', label: 'A–Z' }
];

export function TopicsView(ctx) {
  let query = ctx.query.q || '';
  let category = ctx.query.category || 'all';
  let status = 'all';
  let sort = 'recommended';
  let availableOnly = true;

  const grid = el('div');
  const countLine = el('p.text-sm.text-subtle');
  const categories = topicRepository.getCategories();

  function filtered() {
    let topics = query ? topicRepository.search(query) : topicRepository.getAll();
    if (category !== 'all') topics = topics.filter((t) => t.category === category);
    if (availableOnly) {
      topics = topics.filter((t) => getTopicContentSummary(t.id).levelCount > 0);
    }
    if (status !== 'all') {
      topics = topics.filter((t) => getTopicSummary(t.id).status === status);
    }

    if (sort === 'alphabetical') {
      topics = topics.slice().sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'progress') {
      topics = topics
        .slice()
        .sort((a, b) => getTopicSummary(b.id).mastery.score - getTopicSummary(a.id).mastery.score);
    } else {
      // Recommended: content-rich topics first, then curriculum order.
      const weight = (t) => {
        const content = getTopicContentSummary(t.id);
        const summary = getTopicSummary(t.id);
        if (summary.status === 'in_progress') return 0;
        if (content.questionCount > 30) return 1;
        if (content.questionCount > 0) return 2;
        return 3;
      };
      topics = topics.slice().sort((a, b) => weight(a) - weight(b) || a.sortOrder - b.sortOrder);
    }
    return topics;
  }

  function draw() {
    const topics = filtered();
    const withContent = topics.filter((t) => getTopicContentSummary(t.id).levelCount > 0).length;
    countLine.textContent = `${plural(topics.length, 'topic')} · ${withContent} ready to practise`;

    render(
      grid,
      topics.length
        ? [el('div.grid.grid--cards', {}, topics.map((topic) => topicCard(topic)))]
        : [
            emptyState({
              title: 'No topics match',
              body: 'Try a different search term or clear the filters.',
              iconName: 'search'
            })
          ]
    );
  }

  const toolbar = el('div.toolbar', {}, [
    searchInput({
      placeholder: 'Search topics…',
      value: query,
      onInput: (value) => {
        query = value;
        draw();
      }
    }),
    segmented(SORTS, sort, (id) => {
      sort = id;
      redrawToolbar();
      draw();
    })
  ]);

  const categoryRow = el('div.row.row--wrap', { style: { marginBottom: '12px' } });
  const statusRow = el('div.row.row--wrap', { style: { marginBottom: '16px' } });

  function redrawToolbar() {
    render(categoryRow, [
      chip('All areas', {
        pressed: category === 'all',
        onClick: () => {
          category = 'all';
          redrawToolbar();
          draw();
        }
      }),
      ...categories.map((cat) =>
        chip(cat.name, {
          pressed: category === cat.id,
          count: cat.count,
          onClick: () => {
            category = cat.id;
            redrawToolbar();
            draw();
          }
        })
      )
    ]);

    render(statusRow, [
      ...STATUS_FILTERS.map((filter) =>
        chip(filter.label, {
          pressed: status === filter.id,
          onClick: () => {
            status = filter.id;
            redrawToolbar();
            draw();
          }
        })
      ),
      el('span.flex-1'),
      chip(availableOnly ? 'Ready to practise' : 'Showing full catalogue', {
        pressed: availableOnly,
        onClick: () => {
          availableOnly = !availableOnly;
          redrawToolbar();
          draw();
        }
      })
    ]);

    // Re-render the sort control so its pressed state stays accurate.
    toolbar.replaceChild(
      segmented(SORTS, sort, (id) => {
        sort = id;
        redrawToolbar();
        draw();
      }),
      toolbar.lastChild
    );
  }

  const root = el('div', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Topics' }),
        el('p', { text: 'The full quantitative aptitude syllabus. Start anywhere, but Percentages pays off fastest.' })
      ]),
      badge(`${topicRepository.getAll().length} in catalogue`, 'outline')
    ]),
    toolbar,
    categoryRow,
    statusRow,
    countLine,
    el('div', { style: { height: '12px' } }),
    grid
  ]);

  redrawToolbar();
  draw();

  return { element: root, title: 'Topics' };
}
