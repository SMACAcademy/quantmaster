/** End-of-session summary: what happened, what improved, what to do next. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatDuration, plural } from '../utils/format.js';
import { navigate } from '../app/router.js';
import { getLastResult } from '../app/state.js';
import { badge, button, linkButton, statTile, emptyState, sectionHead } from '../components/ui.js';
import { conceptRepository, levelRepository } from '../repositories/contentRepository.js';
import { getPassCriteria } from '../services/learningEngine.js';
import { getPrimaryRecommendation } from '../services/recommendationEngine.js';
import { solutionPanel } from '../components/SolutionPanel.js';
import { disclosure } from '../components/ui.js';
import { resultGrid, shareResult } from '../services/shareService.js';
import { emit, EVENTS } from '../app/eventBus.js';
import { getUserProgress } from '../repositories/progressRepository.js';
import { communityNudgeCard, shouldShowCommunityNudge } from '../components/CommunityNudge.js';

export function ResultsView() {
  const result = getLastResult();
  if (!result) {
    return {
      title: 'Results',
      element: emptyState({
        title: 'No recent session',
        body: 'Finish a practice session to see your summary here.',
        iconName: 'chart',
        action: linkButton('Go to practice', '/practice', { variant: 'primary' })
      })
    };
  }

  const level = result.source?.levelId ? levelRepository.getById(result.source.levelId) : null;
  const recommendation = getPrimaryRecommendation();
  const conceptsTouched = summariseConcepts(result);

  const headline = buildHeadline(result, level);

  const root = el('div.results', {}, [
    el('div.results__hero', {}, [
      el('div', { class: 'text-xs text-subtle', text: result.title }),
      el('div.results__score', { text: `${result.accuracy}%` }),
      el('div.text-muted', {
        text: `${result.correct} of ${result.attempted} correct`
      }),
      headline.badge,
      el('p.text-sm.text-muted', { style: { maxWidth: '46ch' }, text: headline.message }),
      result.attempted
        ? el('div.share-grid', {
            text: resultGrid(result),
            'aria-label': `${result.correct} correct out of ${result.attempted}`
          })
        : null,
      result.attempted
        ? button(result.source?.type === 'daily' ? 'Challenge a friend' : 'Share result', {
            variant: 'soft',
            size: 'sm',
            iconName: 'upload',
            onClick: async () => {
              const outcome = await shareResult(result);
              if (outcome === 'copied') {
                emit(EVENTS.toast, {
                  title: 'Copied to clipboard',
                  body: 'Paste it anywhere — the grid shows how you did without spoiling the answers.',
                  variant: 'success'
                });
              } else if (outcome === 'failed') {
                emit(EVENTS.toast, { title: 'Could not share from this browser', variant: 'warning' });
              }
            }
          })
        : null
    ]),

    shouldShowCommunityNudge(getUserProgress().stats.sessionsCompleted || 0) ? communityNudgeCard() : null,

    el('div.stat-grid', {}, [
      statTile(result.attempted, 'Attempted'),
      statTile(result.correct, 'Correct', 'success'),
      statTile(result.wrong, 'To review', result.wrong ? 'danger' : ''),
      statTile(`+${result.xpEarned}`, 'XP earned', 'warning'),
      statTile(formatDuration(result.totalTimeMs / 1000), 'Time'),
      statTile(
        result.averageTimeMs ? formatDuration(result.averageTimeMs / 1000) : '—',
        'Avg / question'
      )
    ]),

    result.correctedMistakes
      ? el('div.card.card--accent', {}, [
          el('div.row', {}, [
            icon('check', { size: 18 }),
            el('div', {}, [
              el('div.font-bold', {
                text: `${plural(result.correctedMistakes, 'previous mistake')} corrected`
              }),
              el('div.text-sm.text-muted', {
                text: 'Fixing a specific error is worth more than a new question answered.'
              })
            ])
          ])
        ])
      : null,

    conceptsTouched.length
      ? el('section', {}, [
          sectionHead('Concepts practised'),
          el(
            'div.row.row--wrap',
            {},
            conceptsTouched.map((entry) =>
              badge(
                `${entry.name} · ${entry.correct}/${entry.total}`,
                entry.correct === entry.total ? 'success' : entry.correct ? 'warning' : 'danger'
              )
            )
          )
        ])
      : null,

    result.outcomes.some((o) => o.outcome?.submitted)
      ? el('section', {}, [
          sectionHead('Question review', { hint: 'Tap a question to see the working' }),
          el(
            'div.stack',
            {},
            result.outcomes
              .filter((entry) => entry.outcome?.submitted || entry.outcome?.skipped)
              .map((entry) => reviewRow(entry))
          )
        ])
      : null,

    el('div.stack', { style: { marginTop: '8px' } }, [
      result.nextLevel && result.levelPassed
        ? button(`Start next: ${result.nextLevel.title}`, {
            variant: 'primary',
            size: 'lg',
            iconName: 'arrowRight',
            onClick: () =>
              navigate(`/topics/${result.nextLevel.topicId}/levels/${result.nextLevel.id}`)
          })
        : recommendation
          ? button(recommendation.title, {
              variant: 'primary',
              size: 'lg',
              iconName: recommendation.icon,
              onClick: () => navigate(recommendation.route)
            })
          : null,
      result.wrong
        ? linkButton('Review my mistakes', '/mistakes', { variant: 'soft', iconName: 'refresh' })
        : null,
      linkButton(level ? 'Back to topic' : 'Back to dashboard', result.returnTo || '/dashboard', {
        variant: 'ghost'
      })
    ])
  ]);

  return { element: root, title: 'Session results' };
}

function buildHeadline(result, level) {
  if (level) {
    const criteria = getPassCriteria(level);
    if (result.levelPassed) {
      return {
        badge: badge(
          result.levelFirstCompletion ? 'Level complete' : 'Level passed again',
          'success',
          { icon: 'check' }
        ),
        message: result.levelFirstCompletion
          ? 'The next level is now unlocked. Mastery keeps improving as you revisit this later.'
          : 'Still comfortably above the pass mark for this level.'
      };
    }
    const needed = Math.min(criteria.minimumQuestionsAttempted, result.total);
    const tooFewAttempts = result.attempted < needed;
    return {
      badge: badge(
        tooFewAttempts
          ? `Answer ${needed} to complete this level`
          : `Needs ${criteria.minimumAccuracy}% to pass`,
        'warning',
        { icon: 'target' }
      ),
      message: tooFewAttempts
        ? `You answered ${result.attempted} of the ${needed} questions this level needs. Your answers are saved — pick it up again whenever you like.`
        : 'Not passed yet — that is fine. Review the questions below, then retry the level when you are ready.'
    };
  }

  if (result.accuracy >= 90) {
    return {
      badge: badge('Strong session', 'success', { icon: 'sparkles' }),
      message: 'Accuracy this high suggests you are ready for harder questions in this area.'
    };
  }
  if (result.accuracy >= 60) {
    return {
      badge: badge('Solid work', 'accent'),
      message: 'A good working session. The questions you missed are now queued for review.'
    };
  }
  return {
    badge: badge('Worth revisiting', 'warning'),
    message:
      'A tough set. Read the explanations for the ones you missed — they are scheduled to come back.'
  };
}

function summariseConcepts(result) {
  const map = new Map();
  for (const { question, outcome } of result.outcomes) {
    if (!outcome?.submitted || !question.conceptId) continue;
    const concept = conceptRepository.getById(question.conceptId);
    if (!concept) continue;
    if (!map.has(concept.id)) map.set(concept.id, { name: concept.name, correct: 0, total: 0 });
    const entry = map.get(concept.id);
    entry.total += 1;
    if (outcome.correct) entry.correct += 1;
  }
  return Array.from(map.values());
}

function reviewRow({ question, outcome }) {
  const correct = outcome?.correct;
  const skipped = outcome?.skipped && !outcome?.submitted;
  return el('div', { class: `review-item ${correct ? 'is-correct' : 'is-wrong'}` }, [
    el('div.review-item__icon', {}, [
      skipped ? icon('arrowRight', { size: 15 }) : icon(correct ? 'check' : 'x', { size: 15 })
    ]),
    el('div.review-item__body', {}, [
      el('div.review-item__q', { text: question.question }),
      el('div.review-item__meta', {}, [
        el('span', { text: question.difficulty }),
        outcome?.hintsUsed ? el('span', { text: `${outcome.hintsUsed} hints` }) : null,
        skipped ? el('span', { text: 'skipped' }) : null,
        outcome?.timeMs ? el('span', { text: formatDuration(outcome.timeMs / 1000) }) : null
      ]),
      disclosure('Show working', () => solutionPanel(question, { compact: true }))
    ])
  ]);
}
