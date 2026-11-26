/** Progress analytics — a small number of charts that actually inform practice. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatDuration, formatNumber, pct, relativeTime } from '../utils/format.js';
import { badge, emptyState, linkButton, progressBar, sectionHead, statTile } from '../components/ui.js';
import { getAttemptsByDay, getUserProgress } from '../repositories/progressRepository.js';
import { topicRepository } from '../repositories/contentRepository.js';
import { getGlobalStats } from '../services/learningEngine.js';
import {
  getOverallMastery,
  getStrongConcepts,
  getTopicMastery,
  getWeakConcepts
} from '../services/masteryEngine.js';
import { getFormulaStats } from '../services/sessionBuilder.js';
import { getRankProgress, getUnlockedAchievements } from '../services/gamification.js';
import { DIFFICULTY_ORDER } from '../app/config.js';

export function ProgressView() {
  const progress = getUserProgress();
  const stats = getGlobalStats();
  const rank = getRankProgress(progress.xp.total);
  const formulaStats = getFormulaStats();
  const achievements = getUnlockedAchievements(progress);
  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;

  if (!stats.questionsAnswered) {
    return {
      title: 'Progress',
      element: el('div', {}, [
        el('div.page-head', {}, [
          el('div.page-head__text', {}, [
            el('h1', { text: 'Progress' }),
            el('p', { text: 'Your analytics appear here once you have answered some questions.' })
          ])
        ]),
        emptyState({
          title: 'Nothing to show yet',
          body: 'Answer a handful of questions and this page fills with accuracy, mastery and retention data.',
          iconName: 'chart',
          action: linkButton('Start practising', '/practice', { variant: 'primary' })
        })
      ])
    };
  }

  const startedTopics = Object.values(progress.topics)
    .filter((t) => t.questionsAnswered > 0)
    .map((t) => ({
      topic: topicRepository.getById(t.topicId),
      state: t,
      mastery: getTopicMastery(t.topicId)
    }))
    .filter((entry) => entry.topic)
    .sort((a, b) => b.mastery.score - a.mastery.score);

  const masteredTopics = startedTopics.filter((entry) => entry.mastery.score >= 85).length;
  const difficultyStats = computeDifficultyStats();
  const week = getAttemptsByDay(7);
  const maxDay = Math.max(1, ...week.map((d) => d.attempts.length));

  const root = el('div', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Progress' }),
        el('p', {
          text: 'Mastery here is a learning indicator built from your answers — useful for deciding what to practise, not a precise measurement.'
        })
      ]),
      el('div.row', { style: { gap: '8px' } }, [
        badge(rank.rank.name, 'accent', { icon: 'award' })
      ])
    ]),

    el('div.stat-grid', { style: { marginBottom: '26px' } }, [
      statTile(formatNumber(stats.questionsAnswered), 'Questions answered'),
      statTile(`${stats.accuracy}%`, 'Overall accuracy', 'success'),
      statTile(`${getOverallMastery()}%`, 'Average mastery'),
      statTile(progress.streak.current, 'Current streak'),
      statTile(progress.streak.longest, 'Longest streak'),
      statTile(startedTopics.length, 'Topics started'),
      statTile(masteredTopics, 'Topics mastered', masteredTopics ? 'success' : ''),
      statTile(formatDuration(stats.totalTimeSeconds), 'Time practising')
    ]),

    el('section.section', {}, [
      sectionHead('Weekly practice', { hint: 'Questions answered per day' }),
      el('div.card', {}, [
        el(
          'div.bar-chart',
          {},
          week.map((day) =>
            el('div.bar-chart__col', {}, [
              el('span.bar-chart__value', { text: String(day.attempts.length || '') }),
              el('div.bar-chart__bar', {
                style: { height: `${Math.max(3, (day.attempts.length / maxDay) * 100)}%` },
                title: `${day.attempts.length} questions on ${day.date.toLocaleDateString()}`
              }),
              el('span.bar-chart__label', {
                text: day.date.toLocaleDateString(undefined, { weekday: 'short' })
              })
            ])
          )
        )
      ])
    ]),

    el('section.section', {}, [
      sectionHead('Topic mastery'),
      el(
        'div.card.stack',
        {},
        startedTopics.map((entry) =>
          el('div.hbar', {}, [
            el('span.hbar__name', { text: entry.topic.name, title: entry.topic.name }),
            progressBar(entry.mastery.score, { size: 'sm' }),
            el('span.hbar__value', { text: `${entry.mastery.score}%` })
          ])
        )
      )
    ]),

    el('section.section', {}, [
      sectionHead('Accuracy by difficulty', {
        hint: 'A big gap between easy and complex means method, not arithmetic'
      }),
      el(
        'div.card.stack',
        {},
        DIFFICULTY_ORDER.map((difficulty) => {
          const entry = difficultyStats[difficulty];
          return el('div.hbar', {}, [
            el('span.hbar__name', { text: difficulty }),
            progressBar(entry.accuracy, {
              size: 'sm',
              variant: entry.accuracy >= 70 ? 'success' : entry.accuracy >= 50 ? '' : 'warning'
            }),
            el('span.hbar__value', {
              text: entry.total ? `${entry.accuracy}% (${entry.total})` : '—'
            })
          ]);
        })
      )
    ]),

    el('div.grid.grid--2', {}, [
      el('section', {}, [
        sectionHead('Formula retention'),
        el('div.card.stack', {}, [
          el('div.row', {}, [
            el('div', { style: { flex: 1 } }, [
              el('div.text-sm.text-muted', { text: 'Cards retained' }),
              el('div', { style: { fontSize: 'var(--text-2xl)', fontWeight: '750' } }, [
                `${formulaStats.retentionPercent}%`
              ])
            ]),
            icon('cards', { size: 22, className: 'text-subtle' })
          ]),
          progressBar(formulaStats.retentionPercent, { size: 'sm', variant: 'success' }),
          el('div.text-xs.text-subtle', {
            text: `${formulaStats.retained} retained · ${formulaStats.due} due · ${formulaStats.new} not started · ${formulaStats.total} total`
          }),
          linkButton('Revise now', '/revise?mode=recall', { variant: 'soft', size: 'sm' })
        ])
      ]),
      el('section', {}, [
        sectionHead('Learning habits'),
        el('div.card.stack', {}, [
          habitRow('Hints used', `${stats.hintsUsed} across ${stats.questionsAnswered} questions`),
          habitRow(
            'Average time',
            stats.questionsAnswered
              ? formatDuration(stats.totalTimeSeconds / stats.questionsAnswered)
              : '—'
          ),
          habitRow('Mistakes corrected', String(stats.mistakesCorrected)),
          habitRow('Independent after guided', String(stats.independentAfterGuided)),
          habitRow('Sessions completed', String(stats.sessionsCompleted)),
          habitRow(
            'Last activity',
            progress.lastActivityAt ? relativeTime(progress.lastActivityAt) : 'never'
          )
        ])
      ])
    ]),

    el('div.grid.grid--2', {}, [
      el('section', {}, [
        sectionHead('Needs attention'),
        conceptListCard(getWeakConcepts({ limit: 5 }), 'Nothing weak right now — nice.')
      ]),
      el('section', {}, [
        sectionHead('Strongest concepts'),
        conceptListCard(getStrongConcepts({ limit: 5 }), 'Keep going — strong concepts appear here.')
      ])
    ]),

    el('section.section', {}, [
      sectionHead('Achievements', { hint: `${unlockedCount} of ${achievements.length} unlocked` }),
      el(
        'div.grid.grid--cards',
        {},
        achievements.map((achievement) =>
          el(
            'div.card',
            { style: achievement.unlockedAt ? {} : { opacity: '0.55' } },
            [
              el('div.row', {}, [
                el('div', { style: { fontSize: '26px' }, text: achievement.glyph }),
                el('div', { style: { flex: 1, minWidth: 0 } }, [
                  el('div.card__title', { text: achievement.name }),
                  el('div.card__sub', { text: achievement.description })
                ])
              ]),
              achievement.unlockedAt
                ? el('div.text-xs.text-subtle', {
                    style: { marginTop: '8px' },
                    text: `Unlocked ${relativeTime(achievement.unlockedAt)}`
                  })
                : el('div.text-xs.text-subtle', { style: { marginTop: '8px' }, text: 'Locked' })
            ]
          )
        )
      )
    ])
  ]);

  return { element: root, title: 'Progress' };
}

function habitRow(label, value) {
  return el('div.row', {}, [
    el('span.text-sm.text-muted', { style: { flex: 1 }, text: label }),
    el('span.text-sm.font-bold', { text: value })
  ]);
}

function conceptListCard(entries, emptyMessage) {
  if (!entries.length) {
    return el('div.card', {}, [el('p.text-sm.text-muted', { text: emptyMessage })]);
  }
  return el(
    'div.card.stack',
    {},
    entries.map((entry) =>
      el('div.hbar', {}, [
        el('span.hbar__name', { text: entry.concept.name, title: entry.concept.name }),
        progressBar(entry.score, {
          size: 'sm',
          variant: entry.score >= 85 ? 'success' : 'warning'
        }),
        el('span.hbar__value', { text: `${Math.round(entry.score)}%` })
      ])
    )
  );
}

function computeDifficultyStats() {
  const attempts = getAttemptsByDay(365).flatMap((d) => d.attempts);
  const out = {};
  for (const difficulty of DIFFICULTY_ORDER) {
    const subset = attempts.filter((a) => a.difficulty === difficulty);
    const correct = subset.filter((a) => a.correct).length;
    out[difficulty] = {
      total: subset.length,
      correct,
      accuracy: subset.length ? pct(correct, subset.length) : 0
    };
  }
  return out;
}
