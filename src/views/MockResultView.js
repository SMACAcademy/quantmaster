/** The analysis after a mock test: score, sections, topics, time, and a full review. */

import { el } from '../utils/dom.js';
import { navigate } from '../app/router.js';
import { button, dataTable, disclosure, linkButton, sectionHead, statTile } from '../components/ui.js';
import { solutionPanel } from '../components/SolutionPanel.js';
import { describeCorrectAnswer } from '../services/quizEngine.js';
import { topicRepository } from '../repositories/contentRepository.js';
import { getLastMockResult } from '../mock/history.js';

const seconds = (ms) => `${Math.round(ms / 1000)}s`;
const minutes = (ms) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const STATUS = { correct: '✓ Right', wrong: '✗ Wrong', unanswered: '– Not answered' };

function yourAnswer(row) {
  if (row.response === null) return '—';
  const { question } = row;
  if (question.options) return question.options.find((o) => o.id === row.response)?.text ?? String(row.response);
  return String(row.response);
}

function questionList(rows, empty) {
  if (!rows.length) return el('p.text-sm.text-muted', { text: empty });
  return el(
    'ul.mock-list',
    {},
    rows.map((row) =>
      el('li', {}, [
        el('span.text-xs.text-subtle', { text: `Q${row.index + 1} · ${seconds(row.timeMs)}` }),
        el('span', { text: row.question.question })
      ])
    )
  );
}

export function MockResultView() {
  const last = getLastMockResult();
  if (!last) {
    navigate('/mock', { replace: true });
    return { element: el('div'), title: 'Mock tests' };
  }
  const { pattern, analysis: a, timedOut } = last;
  const topicName = (id) => topicRepository.getById(id)?.name || id;

  const element = el('div.stack', { style: { gap: '20px' } }, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: `${pattern.name}: ${a.score} / ${a.maxScore}` }),
        el('p', { text: timedOut ? 'Time ran out; your answers were submitted automatically.' : `Finished in ${minutes(a.usedMs)} of ${pattern.minutes}:00.` })
      ])
    ]),
    el('div.stat-grid', {}, [
      statTile(`${a.score}`, 'Score', a.score > 0 ? 'success' : ''),
      statTile(`${a.accuracy}%`, 'Accuracy'),
      statTile(`${a.attempted}/${a.total}`, 'Attempted'),
      statTile(`${a.lost}`, 'Marks lost to wrong answers', a.lost ? 'warning' : ''),
      statTile(seconds(a.averageMs), `Per answer (budget ${seconds(a.budgetMs)})`)
    ]),
    el('div.card.mock-advice', {}, [el('h2', { text: 'What to change next time' }), el('ul', {}, a.advice.map((line) => el('li', { text: line })))]),
    el('section.section', {}, [
      sectionHead('By section'),
      dataTable({
        headers: ['Section', 'Questions', 'Attempted', 'Right', 'Score', 'Time'],
        rows: a.sections.map((s) => [s.key, s.count, s.attempted, s.correct, s.score, minutes(s.timeMs)])
      })
    ]),
    el('section.section', {}, [
      sectionHead('By topic', { hint: 'Weakest first' }),
      dataTable({
        headers: ['Topic', 'Questions', 'Attempted', 'Right', 'Accuracy', 'Avg time'],
        rows: a.topics
          .slice()
          .sort((p, q) => p.correct / p.count - q.correct / q.count)
          .map((t) => [topicName(t.key), t.count, t.attempted, t.correct, t.attempted ? `${Math.round((t.correct / t.attempted) * 100)}%` : '—', seconds(t.timeMs / t.count)])
      })
    ]),
    el('section.section', {}, [
      sectionHead('Worth skipping next time', { hint: 'Wrong, after more than the time each question deserves' }),
      questionList(a.skipNextTime, 'None: every long think paid off.')
    ]),
    el('section.section', {}, [sectionHead('Biggest time sinks', { hint: 'More than twice the budget' }), questionList(a.timeSinks, 'None: your time was well spread.')]),
    a.missedEasy.length ? el('section.section', {}, [sectionHead('Easy questions left unanswered'), questionList(a.missedEasy, '')]) : null,
    el('section.section', {}, [
      sectionHead('Review every question'),
      el(
        'div.stack',
        { style: { gap: '8px' } },
        a.rows.map((row) =>
          disclosure(
            `Q${row.index + 1}. ${STATUS[row.status]} · ${row.marks > 0 ? '+' : ''}${row.marks} · ${seconds(row.timeMs)} · ${row.question.question}`,
            () =>
              el('div.stack', {}, [
                el('p.text-sm', { text: `Your answer: ${yourAnswer(row)}. Correct answer: ${describeCorrectAnswer(row.question)}.` }),
                solutionPanel(row.question, { showAnswer: false })
              ])
          )
        )
      )
    ]),
    el('div.row.row--wrap', { style: { gap: '10px' } }, [
      button('Another paper', { variant: 'primary', iconName: 'refresh', onClick: () => navigate('/mock') }),
      linkButton('Review mistakes', '/mistakes', { variant: 'soft' })
    ])
  ]);
  return { element, title: 'Mock test analysis' };
}
