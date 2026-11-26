/** Explanation, worked steps, formulas used and the traps to avoid. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { badge, disclosure } from './ui.js';
import { formulaRepository, conceptRepository } from '../repositories/contentRepository.js';
import { describeCorrectAnswer } from '../services/quizEngine.js';
import { topicRepository } from '../repositories/contentRepository.js';
import { newDiscussionUrl, newIssueUrl, pageUrl } from '../app/community.js';

const external = { target: '_blank', rel: 'noopener noreferrer' };

/** Ask others about a question, or report a mistake in it, on GitHub. */
export function questionCommunityLinks(question) {
  if (!question?.id) return null;
  const topic = question.topicId ? topicRepository.getById(question.topicId) : null;
  const text = String(question.question || '').slice(0, 1500);
  return el('div.solution__community', {}, [
    el('a', {
      href: newDiscussionUrl('q-a', `Question ${question.id}: a quicker way?`, `> ${text}

Topic: ${topic?.name || question.topicId || ''}
From: ${pageUrl()}

My question or method:
`),
      ...external
    }, [icon('help', { size: 14 }), el('span', { text: 'Ask or share a quicker way' })]),
    el('a', {
      href: newIssueUrl('content-error.yml', `[${question.id}] `, { topic: topic?.name || question.topicId, question: `${question.id}

${text}` }),
      ...external
    }, [icon('flag', { size: 14 }), el('span', { text: 'Report a problem with this question' })])
  ]);
}

export function solutionPanel(question, { showAnswer = true, compact = false } = {}) {
  const formulas = formulaRepository.getByIds(question.formulaIds || []);
  const concept = question.conceptId ? conceptRepository.getById(question.conceptId) : null;

  return el('div.stack', {}, [
    showAnswer
      ? el('div', {}, [
          el('div.solution__label', { text: 'Answer' }),
          el('div.solution__text.font-bold', { text: describeCorrectAnswer(question) })
        ])
      : null,
    question.explanation
      ? el('div', {}, [
          el('div.solution__label', { text: 'Why' }),
          el('div.solution__text', { text: question.explanation })
        ])
      : null,
    question.solutionSteps?.length
      ? el('div', {}, [
          el('div.solution__label', { text: 'Step by step' }),
          el(
            'ol.solution-steps',
            {},
            question.solutionSteps.map((step) => el('li', {}, [el('span', { text: step })]))
          )
        ])
      : null,
    formulas.length
      ? el('div', {}, [
          el('div.solution__label', { text: formulas.length > 1 ? 'Formulas used' : 'Formula used' }),
          el(
            'div.row.row--wrap',
            {},
            formulas.map((formula) =>
              el('span.formula-inline', { text: formula.formula, title: formula.title })
            )
          )
        ])
      : null,
    compact
      ? null
      : question.method
        ? el('div', {}, [
            el('div.solution__label', { text: 'Method' }),
            el('div.text-sm.text-muted', { text: question.method })
          ])
        : null,
    compact
      ? null
      : question.commonMistakes?.length
        ? disclosure('Common mistakes on this question', () =>
            el(
              'ul',
              { style: { paddingLeft: '18px', color: 'var(--fg-muted)' } },
              question.commonMistakes.map((mistake) =>
                el('li.text-sm', { text: mistake, style: { marginBottom: '4px' } })
              )
            )
          )
        : null,
    concept && !compact
      ? el('div.row.row--wrap', { style: { marginTop: '4px' } }, [
          badge(concept.name, 'outline', { icon: 'brain' }),
          ...(question.tags || []).slice(0, 3).map((tag) => badge(tag, ''))
        ])
      : null,
    compact ? null : questionCommunityLinks(question)
  ]);
}

/** Header strip shown after an answer is submitted. */
export function feedbackHeader({ correct, xp, wasPreviouslyWrong, masteryDelta }) {
  const title = correct
    ? wasPreviouslyWrong
      ? 'You corrected a previous mistake'
      : 'Correct'
    : "Let's understand this";
  const sub = correct
    ? wasPreviouslyWrong
      ? 'That is real progress — this one used to catch you out.'
      : masteryDelta > 0
        ? `Mastery +${masteryDelta}`
        : 'Well done.'
    : 'Read the working below — the method matters more than the answer.';

  return el('div.feedback__head', {}, [
    el('div.feedback__icon', {}, [icon(correct ? 'check' : 'refresh', { size: 20 })]),
    el('div', { style: { minWidth: 0 } }, [
      el('div.feedback__title', { text: title }),
      el('div.feedback__sub', { text: sub })
    ]),
    xp ? el('div.feedback__xp', { text: `+${xp} XP` }) : null
  ]);
}
