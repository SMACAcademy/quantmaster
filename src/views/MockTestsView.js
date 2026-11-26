/**
 * Mock tests: full exam-pattern papers with a section clock and the exam's own
 * marking (MockRunView), then an analysis (MockResultView).
 */

import { el } from '../utils/dom.js';
import { plural, relativeTime } from '../utils/format.js';
import { navigate } from '../app/router.js';
import { badge, button, sectionHead } from '../components/ui.js';
import { confirmDialog } from '../components/Modal.js';
import { MOCK_PATTERNS, maxScore, questionCount } from '../mock/patterns.js';
import { assemblePaper, startAttempt } from '../mock/mockEngine.js';
import { bestMock, mockHistory, setActiveMock } from '../mock/history.js';
import { questionRepository } from '../repositories/contentRepository.js';
import { ensureAllContent } from '../services/contentGate.js';
import { ensureGenerators, generateQuestions } from '../generators/gate.js';

const DIFFICULTY_RANK = { easy: 0, medium: 1, complex: 2 };

const markingText = (pattern) => {
  const { correct, wrong, typedNoNegative } = pattern.marks;
  if (!wrong) return `+${correct} per right answer, no negative marking`;
  return `+${correct} right, ${String(wrong).replace('-', '−')} wrong${typedNoNegative ? ' (typed answers: no penalty)' : ''}`;
};

/** Build a paper for a pattern from the app's questions and generators. */
export function buildPaper(pattern) {
  const authored = (section) =>
    questionRepository
      .getAll()
      .filter((q) => section.topics.includes(q.topicId) && section.difficulties.includes(q.difficulty) && q.active !== false);
  const generated = (section, count, avoid) => {
    const maxDifficulty = section.difficulties.reduce((top, d) => (DIFFICULTY_RANK[d] > DIFFICULTY_RANK[top] ? d : top), 'easy');
    return generateQuestions({ topicIds: section.topics, count, maxDifficulty }).filter((q) => !avoid.has(q.id));
  };
  return assemblePaper(pattern, { authored, generated });
}

function startPattern(pattern) {
  confirmDialog({
    title: `Start ${pattern.name}?`,
    message: `${plural(questionCount(pattern), 'question')} in ${pattern.minutes} minutes. The clock runs for the whole section and cannot be paused. ${markingText(pattern)}.`,
    confirmLabel: 'Start the test',
    cancelLabel: 'Not now',
    onConfirm: async () => {
      await Promise.all([ensureAllContent(), ensureGenerators()]);
      const items = buildPaper(pattern);
      setActiveMock({ pattern, attempt: startAttempt(pattern, items) });
      navigate('/mock/run');
    }
  });
}

function patternCard(pattern) {
  const best = bestMock(pattern.id);
  const tries = mockHistory(pattern.id).length;
  return el('article.card.mock-card', {}, [
    el('div.mock-card__head', {}, [
      el('h3', { text: pattern.name }),
      badge(`${questionCount(pattern)} Q · ${pattern.minutes} min`, 'outline')
    ]),
    el('p.text-sm.text-subtle', { text: pattern.exam }),
    el('p.text-sm', { text: pattern.description }),
    el('ul.mock-card__facts', {}, [
      el('li', { text: markingText(pattern) }),
      el('li', { text: pattern.blueprint.map((s) => `${s.label} ${s.count}`).join(' · ') })
    ]),
    el('div.mock-card__foot', {}, [
      el('span.text-xs.text-subtle', {
        text: best ? `Best ${best.score} / ${maxScore(pattern)} · ${plural(tries, 'attempt')}` : 'Not attempted yet'
      }),
      button('Start', { variant: 'primary', size: 'sm', iconName: 'clock', onClick: () => startPattern(pattern) })
    ])
  ]);
}

export function MockTestsView() {
  const history = mockHistory().slice(0, 8);
  const byId = Object.fromEntries(MOCK_PATTERNS.map((p) => [p.id, p]));
  const element = el('div', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Mock tests' }),
        el('p', {
          text: 'Exam-pattern papers with the real clock and marking. Move freely between questions, mark some for review, and change answers until you submit. The analysis shows your score, time per question and what to skip next time.'
        })
      ])
    ]),
    el('div.grid.grid--cards', {}, MOCK_PATTERNS.map(patternCard)),
    history.length
      ? el('section.section', {}, [
          sectionHead('Recent attempts'),
          el(
            'ul.mock-history',
            {},
            history.map((entry) =>
              el('li', {}, [
                el('span', { text: byId[entry.patternId]?.name || entry.patternId }),
                el('strong', { text: `${entry.score} / ${entry.maxScore}` }),
                el('span.text-subtle', { text: `${entry.accuracy}% accuracy · ${entry.attempted} attempted · ${relativeTime(entry.at)}` })
              ])
            )
          )
        ])
      : null
  ]);
  return { element, title: 'Mock tests' };
}
