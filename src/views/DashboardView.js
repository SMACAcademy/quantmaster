/**
 * Dashboard — answers "what should I do right now?" before it shows anything else.
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatNumber, plural, relativeTime } from '../utils/format.js';
import { navigate } from '../app/router.js';
import { getSettings, setActiveSession } from '../app/state.js';
import {
  actionTile,
  badge,
  button,
  emptyState,
  linkButton,
  progressBar,
  sectionHead,
  statTile
} from '../components/ui.js';
import { topicCard } from '../components/TopicCard.js';
import { topicRepository } from '../repositories/contentRepository.js';
import { getUserProgress } from '../repositories/progressRepository.js';
import { getStreakStatus, getWeekActivity, getRankProgress } from '../services/gamification.js';
import { getRecommendations } from '../services/recommendationEngine.js';
import {
  buildDailyChallenge,
  buildMistakesSession,
  buildSmartSession,
  buildPresetSession,
  getContinueTarget,
  getFormulaStats,
  planSession
} from '../services/sessionBuilder.js';
import { getGlobalStats, getMistakes, getRecentTopics } from '../services/learningEngine.js';
import { getOverallMastery } from '../services/masteryEngine.js';
import { LEVEL_TYPE_META } from '../app/config.js';
import { installAvailable, installNudgeCard } from '../components/InstallPrompt.js';
import { isInstallNudgeDismissed } from '../pwa/pwa.js';
import { withAllContent } from '../services/contentGate.js';
import { puzzleCard } from '../components/PuzzleCard.js';

export function DashboardView() {
  const progress = getUserProgress();
  const stats = getGlobalStats();
  const streak = getStreakStatus(progress);
  const isNew = stats.questionsAnswered === 0;
  const recommendations = getRecommendations({ limit: 5 });
  const plan = planSession(streak.qualifiedToday ? 'focused-practice' : 'daily-mission');
  const continueTarget = getContinueTarget();
  const formulaStats = getFormulaStats();
  const mistakes = getMistakes({ includeResolved: false });
  const recentTopics = getRecentTopics(3);

  const root = el('div', {}, [
    heroSection({ progress, stats, streak, isNew }),

    // Only after a completed session: asking before someone has found value is nagging.
    // Guarded here (not just inside the card) so a dismissed/unavailable card
    // doesn't leave a hollow spacer div behind.
    progress.stats.sessionsCompleted > 0 && installAvailable() && !isInstallNudgeDismissed()
      ? el('div', { style: { marginBottom: '24px' } }, [installNudgeCard()])
      : null,

    el('section.section', {}, [
      sectionHead(isNew ? 'Or try a quick session' : 'Start here', {
        hint: isNew ? 'A mixed sample across topics' : 'Chosen from your progress, not at random'
      }),
      el('div.grid.grid--2', {}, [
        sessionCard(plan),
        el('div.stack', {}, [
          continueTarget ? continueCard(continueTarget) : null,
          ...recommendations
            .filter((rec) => rec.id !== 'continue-level' && rec.id !== 'start-here')
            .slice(0, 2)
            .map((rec) =>
              actionTile({
                title: rec.title,
                description: rec.description,
                iconName: rec.icon,
                href: rec.route,
                tone: rec.tone === 'accent' ? '' : rec.tone
              })
            )
        ])
      ])
    ]),

    el('div.section', {}, [puzzleCard()]),

    el('section.section', {}, [
      sectionHead('Quick actions', { hint: 'Five minutes is enough' }),
      el('div.grid.grid--cards', {}, [
        actionTile({
          title: 'Revise formulas',
          description: formulaStats.due
            ? `${plural(formulaStats.due, 'card')} due for review`
            : `${formulaStats.total} cards · nothing due right now`,
          iconName: 'cards',
          href: '/revise?mode=recall',
          tone: 'review',
          badgeText: formulaStats.due ? String(formulaStats.due) : null
        }),
        actionTile({
          title: 'Review mistakes',
          description: mistakes.length
            ? `${plural(mistakes.length, 'question')} waiting to be corrected`
            : 'Nothing outstanding — good place to be',
          iconName: 'refresh',
          tone: 'mistakes',
          onClick: withAllContent(() => {
            const session = buildMistakesSession({ count: 10 });
            if (!session) return navigate('/mistakes');
            setActiveSession(session);
            navigate('/quiz');
          })
        }),
        actionTile({
          title: 'Explore',
          description: 'Move sliders and watch interest, speed, roots and chance behave',
          iconName: 'compass',
          href: '/explore'
        }),
        actionTile({
          title: 'Mock tests',
          description: 'Exam-pattern papers with the real clock and negative marking, then a full analysis',
          iconName: 'trophy',
          href: '/mock'
        }),
        actionTile({
          title: 'Speed drills',
          description: 'Squares, cubes, fractions as percentages, primes and more, against the clock',
          iconName: 'bolt',
          href: '/tables'
        }),
        actionTile({
          title: 'Quick sheets',
          description: 'Formulas, shortcuts, common traps and exam strategy, one page each, for the day before the exam',
          iconName: 'book',
          href: '/sheet?kind=formula'
        }),
        actionTile({
          title: 'Smart practice',
          description: 'Weak areas, due reviews and a little new ground',
          iconName: 'target',
          href: '/practice?mode=smart'
        }),
        actionTile({
          title: "Today's challenge",
          description: 'A fresh mixed set every day',
          iconName: 'trophy',
          tone: 'challenge',
          onClick: () => {
            const session = buildDailyChallenge({ count: 8 });
            if (!session) return;
            setActiveSession(session);
            navigate('/quiz');
          }
        })
      ])
    ]),

    recentTopics.length
      ? el('section.section', {}, [
          sectionHead('Your topics', {
            action: linkButton('All topics', '/topics', { variant: 'ghost', size: 'sm' })
          }),
          el(
            'div.grid.grid--cards',
            {},
            recentTopics.map((summary) => topicCard(summary.topic))
          )
        ])
      : el('section.section', {}, [
          sectionHead('Start a topic', { hint: 'Percentages is the recommended first stop' }),
          el(
            'div.grid.grid--cards',
            {},
            topicRepository
              .getPlayable()
              .slice(0, 3)
              .map((topic) => topicCard(topic))
          )
        ]),

    el('section.section', {}, [
      sectionHead('This week'),
      el('div.grid.grid--2', {}, [weekCard(progress), activityCard(progress)])
    ])
  ]);

  return { element: root, title: 'Dashboard' };
}

/* ------------------------------ sections ------------------------------ */

function heroSection({ progress, stats, streak, isNew }) {
  const rank = getRankProgress(progress.xp.total);
  const mastery = getOverallMastery();
  const goal = getSettings().dailyGoalQuestions || 20;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (isNew) {
    const target = getContinueTarget();
    return el('section.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Welcome to QuantMaster' }),
        el('p', {
          text: 'Learn aptitude and reasoning the way it actually sticks: concept first, then formula recall, then method, then practice.'
        })
      ]),
      target
        ? el('div.row.row--wrap', { style: { width: '100%', gap: '10px' } }, [
            linkButton(
              `Start with ${target.topic.name}`,
              `/topics/${target.topic.id}/levels/${target.level.id}`,
              { variant: 'primary', size: 'lg', iconName: 'play' }
            ),
            linkButton('Browse all topics', '/topics', { variant: 'ghost', size: 'lg' })
          ])
        : null,
      el('p.text-xs.text-subtle', {
        text: 'Takes about 6 minutes. No account needed — progress saves on this device.'
      })
    ]);
  }

  return el('section.page-head', {}, [
    el('div.page-head__text', {}, [
      el('h1', { text: greeting }),
      el('p', {
        text: streak.qualifiedToday
          ? `Today is counted. ${plural(streak.current, 'day')} in a row.`
          : streak.freezesNeeded
            ? `${streak.current}-day streak — practise today and ${streak.freezesNeeded === 1 ? 'a streak freeze covers the day' : `${streak.freezesNeeded} streak freezes cover the days`} you missed.`
            : streak.current
              ? `${streak.current}-day streak — a short session today keeps it.`
              : 'A few questions today is enough to start a streak.'
      })
    ]),
    streakNote(streak),
    el('div.hero-stats', {}, [
      statTile(formatNumber(stats.xp), 'XP', 'warning'),
      statTile(streak.current, 'Day streak'),
      statTile(stats.questionsAnswered, 'Questions'),
      statTile(stats.accuracy === null ? '—' : `${stats.accuracy}%`, 'Accuracy', 'success'),
      statTile(`${mastery}%`, 'Avg mastery')
    ]),
    el('div.grid.grid--2', { style: { width: '100%', gap: '12px 24px' } }, [
      el('div', {}, [
        el('div.progress__label', {}, [
          el('span', { text: "Today's goal" }),
          el('span', {
            text: `${Math.min(streak.todayRecord.questions, goal)} / ${goal} questions`
          })
        ]),
        progressBar((streak.todayRecord.questions / goal) * 100, {
          size: 'sm',
          variant: streak.todayRecord.questions >= goal ? 'success' : ''
        })
      ]),
      el('div', {}, [
        el('div.progress__label', {}, [
          el('span', { text: rank.rank.name }),
          el('span', {
            text: rank.next
              ? `${formatNumber(rank.xpToNext)} XP to ${rank.next.name}`
              : 'Highest rank'
          })
        ]),
        progressBar(rank.percent, { size: 'sm' })
      ])
    ])
  ]);
}

function sessionCard(plan) {
  return el('div.session-card', {}, [
    el('div.session-card__head', {}, [
      el('div', { style: { flex: 1 } }, [
        el('div.text-xs.text-subtle', { text: "Today's session" }),
        el('h3', { text: `${plan.preset.minutes}-minute ${plan.preset.name.toLowerCase()}` }),
        el('p.text-sm.text-muted', { text: plan.preset.description })
      ]),
      badge(`+${plan.preset.questionCount * 10} XP`, 'warning', { icon: 'bolt' })
    ]),
    plan.parts.length
      ? el(
          'ul.session-plan',
          {},
          plan.parts.map((part) =>
            el('li', {}, [
              el('span.session-plan__icon', {}, [icon(part.icon, { size: 15 })]),
              el('span', { text: part.label }),
              el('span.session-plan__count', { text: String(part.count) })
            ])
          )
        )
      : el('p.text-sm.text-muted', { text: 'Pick a topic to fill your session plan.' }),
    button('Start session', {
      variant: 'primary',
      size: 'lg',
      iconName: 'play',
      onClick: withAllContent(() => {
        const session = buildPresetSession(plan.preset.id);
        if (!session) {
          navigate('/topics');
          return;
        }
        setActiveSession(session);
        navigate('/quiz');
      })
    })
  ]);
}

function continueCard(target) {
  const meta = LEVEL_TYPE_META[target.level.type];
  return el('a.card.card--interactive', {
    href: `#/topics/${target.topic.id}/levels/${target.level.id}`,
    style: { color: 'inherit', textDecoration: 'none' }
  }, [
    el('div.row', {}, [
      el('div.action-tile__icon', {}, [icon(meta?.icon || 'play', { size: 20 })]),
      el('div', { style: { flex: 1, minWidth: 0 } }, [
        el('div.text-xs.text-subtle', { text: 'Continue learning' }),
        el('div.card__title', { text: target.level.title }),
        el('div.card__sub', { text: `${target.topic.name} · Level ${target.level.order}` })
      ]),
      icon('arrowRight', { size: 18 })
    ])
  ]);
}

/** Repair offer for a broken streak, or how many freezes are banked. */
function streakNote(streak) {
  if (streak.repair) {
    const { length, questionsDone, questionsNeeded, daysLeft } = streak.repair;
    const left = Math.max(0, questionsNeeded - questionsDone);
    return el('div.streak-note.streak-note--repair', {}, [
      el('span.streak-note__icon', {}, [icon('flame', { size: 20 })]),
      el('div.streak-note__body', {}, [
        el('div.font-bold', { text: `Repair your ${length}-day streak` }),
        el('div.text-muted', {
          text: `Answer ${questionsNeeded} questions in one day to bring it back (${Math.min(questionsDone, questionsNeeded)} of ${questionsNeeded} today, ${left} to go). ${daysLeft === 1 ? 'Today is the last day.' : `${plural(daysLeft, 'day')} left.`}`
        })
      ]),
      button('Practise', {
        variant: 'soft',
        size: 'sm',
        onClick: withAllContent(() => {
          // A session big enough to finish the repair in one go.
          const session = buildSmartSession({ count: Math.min(20, Math.max(5, left)) });
          if (!session) return;
          setActiveSession(session);
          navigate('/quiz');
        })
      })
    ]);
  }
  if (!streak.freezes || !streak.current) return null;
  return el('div.streak-note', {}, [
    el('span.streak-note__icon', {}, [icon('snowflake', { size: 18 })]),
    el('div.streak-note__body.text-muted', {
      text: `${streak.freezes === 1 ? 'A streak freeze is' : `${streak.freezes} streak freezes are`} saved up: ${streak.freezes === 1 ? 'it covers' : 'each covers'} one missed day automatically. Every 7th day of a streak earns another (up to ${streak.maxFreezes}).`
    })
  ]);
}

function weekCard(progress) {
  const week = getWeekActivity(progress);
  const total = week.reduce((sum, day) => sum + day.record.questions, 0);
  return el('div.card', {}, [
    el('div.row', { style: { marginBottom: '12px' } }, [
      el('div', { style: { flex: 1 } }, [
        el('div.card__title', { text: 'Practice this week' }),
        el('div.card__sub', { text: `${plural(total, 'question')} answered` })
      ]),
      icon('calendar', { size: 18, className: 'text-subtle' })
    ]),
    el(
      'div.streak-week',
      {},
      week.map((day) =>
        el(
          'div',
          {
            class: `streak-day ${day.active ? 'is-active' : ''} ${day.frozen && !day.active ? 'is-frozen' : ''} ${day.isToday ? 'is-today' : ''}`
              .replace(/\s+/g, ' ')
              .trim(),
            title: day.frozen && !day.active
              ? `Covered by a streak freeze on ${day.date.toLocaleDateString()}`
              : `${day.record.questions} questions on ${day.date.toLocaleDateString()}`
          },
          [
            el('span.streak-day__dot', {}, [
              day.active ? icon('check', { size: 13 }) : day.frozen ? icon('snowflake', { size: 13 }) : null
            ]),
            el('span', { text: day.date.toLocaleDateString(undefined, { weekday: 'narrow' }) })
          ]
        )
      )
    )
  ]);
}

function activityCard(progress) {
  const log = progress.sessionLog.slice(0, 5);
  return el('div.card', {}, [
    el('div.row', { style: { marginBottom: '12px' } }, [
      el('div.card__title', { text: 'Recent activity', style: { flex: 1 } }),
      linkButton('Progress', '/progress', { variant: 'ghost', size: 'sm' })
    ]),
    log.length
      ? el(
          'div.stack',
          { style: { gap: '10px' } },
          log.map((entry) =>
            el('div.row', {}, [
              el('div.action-tile__icon', { style: { width: '32px', height: '32px' } }, [
                icon(entry.mode === 'revision' ? 'cards' : 'check', { size: 15 })
              ]),
              el('div', { style: { flex: 1, minWidth: 0 } }, [
                el('div.text-sm.font-bold', { text: entry.title }),
                el('div.text-xs.text-subtle', {
                  text: `${entry.correct}/${entry.attempted} correct · ${relativeTime(entry.at)}`
                })
              ]),
              entry.xp ? badge(`+${entry.xp}`, 'warning') : null
            ])
          )
        )
      : emptyState({
          title: 'Nothing here yet',
          body: 'Finish a session and it will show up here.',
          iconName: 'clock'
        })
  ]);
}
