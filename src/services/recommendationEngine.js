/**
 * Decides what the learner should do next.
 *
 * Deliberately a transparent rule set rather than an opaque "AI" score: every
 * recommendation can state its own reason, which is what makes it trustworthy.
 */

import { plural } from '../utils/format.js';
import { getUserProgress } from '../repositories/progressRepository.js';
import { levelRepository, topicRepository } from '../repositories/contentRepository.js';
import { getWeakConcepts } from './masteryEngine.js';
import { getStreakStatus } from './gamification.js';
import { getContinueTarget, getDueFormulas, getFormulaStats } from './sessionBuilder.js';
import { getMistakes, getLevelStatus } from './learningEngine.js';
import { LEVEL_TYPE_META } from '../app/config.js';

/**
 * @returns {Array<{id,title,description,reason,icon,route,tone,priority}>}
 *   sorted with the most useful action first.
 */
export function getRecommendations({ limit = 4 } = {}) {
  const progress = getUserProgress();
  const recs = [];

  const streak = getStreakStatus(progress);
  const formulaStats = getFormulaStats();
  const unresolvedMistakes = getMistakes({ includeResolved: false });
  const weak = getWeakConcepts({ limit: 3 });
  const target = getContinueTarget();
  const isNewLearner = progress.stats.questionsAnswered === 0;

  if (isNewLearner && target) {
    recs.push({
      id: 'start-here',
      title: `Start with ${target.topic.name}`,
      description: target.level.title,
      reason: 'Percentages underpins most other topics, so it is the best place to begin.',
      icon: 'play',
      route: `/topics/${target.topic.id}/levels/${target.level.id}`,
      tone: 'accent',
      priority: 100
    });
  }

  if (formulaStats.due >= 3) {
    recs.push({
      id: 'due-formulas',
      title: `Revise ${plural(formulaStats.due, 'formula')}`,
      description: 'Scheduled review — these are the ones you are closest to forgetting.',
      reason: 'Spaced review at the right moment is the cheapest way to retain formulas.',
      icon: 'cards',
      route: '/revise?mode=recall',
      tone: 'review',
      priority: 90
    });
  }

  if (unresolvedMistakes.length >= 3) {
    recs.push({
      id: 'retry-mistakes',
      title: `Fix ${plural(unresolvedMistakes.length, 'past mistake')}`,
      description: 'Retry the questions you have got wrong and not yet corrected.',
      reason: 'Correcting a specific mistake is worth more than answering new questions.',
      icon: 'refresh',
      route: '/mistakes',
      tone: 'mistakes',
      priority: 85
    });
  }

  if (weak.length) {
    const names = weak.map((w) => w.concept.name).slice(0, 2).join(' and ');
    recs.push({
      id: 'weak-areas',
      title: 'Practise your weak areas',
      description: `Starting with ${names}`,
      reason: 'These concepts are scoring lowest across your recent answers.',
      icon: 'target',
      route: '/practice?mode=smart',
      tone: 'default',
      priority: 80
    });
  }

  if (target && !isNewLearner) {
    const status = getLevelStatus(target.level, progress);
    const typeLabel = LEVEL_TYPE_META[target.level.type]?.label || 'Practice';
    recs.push({
      id: 'continue-level',
      title: status === 'in_progress' ? `Continue ${target.level.title}` : `Next: ${target.level.title}`,
      description: `${target.topic.name} · ${typeLabel}`,
      reason: 'Picking up the level you were on keeps the topic progression intact.',
      icon: 'arrowRight',
      route: `/topics/${target.topic.id}/levels/${target.level.id}`,
      tone: 'accent',
      priority: 75
    });
  }

  if (streak.repair) {
    const { length, questionsDone, questionsNeeded, daysLeft } = streak.repair;
    recs.push({
      id: 'repair-streak',
      title: `Repair your ${length}-day streak`,
      description: `Answer ${questionsNeeded} questions in one day (${Math.min(questionsDone, questionsNeeded)} so far today). ${daysLeft === 1 ? 'Last day to do it.' : `${daysLeft} days left.`}`,
      reason: 'One long session brings a broken streak back, so a single bad day does not wipe out weeks of work.',
      icon: 'flame',
      route: '/practice',
      tone: 'challenge',
      priority: 97
    });
  }

  if (!streak.qualifiedToday && progress.stats.questionsAnswered > 0) {
    recs.push({
      id: 'keep-streak',
      title: streak.atRisk ? 'Keep your streak alive' : "Complete today's session",
      description: streak.current
        ? `${plural(streak.current, 'day')} so far — a short session counts.`
        : 'A few questions today is enough to start a streak.',
      reason: 'Short daily sessions retain more than occasional long ones.',
      icon: 'flame',
      route: '/practice',
      tone: 'challenge',
      priority: streak.atRisk ? 95 : 70
    });
  }

  const started = new Set(
    Object.values(progress.topics)
      .filter((t) => t.questionsAnswered > 0)
      .map((t) => t.topicId)
  );
  const nextTopic = topicRepository
    .getPlayable()
    .find((t) => !started.has(t.id) && levelRepository.getByTopic(t.id).length > 0);
  if (nextTopic && started.size > 0) {
    recs.push({
      id: 'new-topic',
      title: `Try ${nextTopic.name}`,
      description: nextTopic.description,
      reason: 'Broadening topics early makes mixed practice more useful later.',
      icon: 'compass',
      route: `/topics/${nextTopic.id}`,
      tone: 'default',
      priority: 55
    });
  }

  recs.push({
    id: 'daily-challenge',
    title: "Today's Challenge",
    description: 'A mixed set that changes every day.',
    reason: 'Mixing topics forces you to identify the method, not just apply it.',
    icon: 'trophy',
    route: '/practice?mode=daily',
    tone: 'challenge',
    priority: 50
  });

  return recs.sort((a, b) => b.priority - a.priority).slice(0, limit);
}

/** The single most important action — used for the big dashboard button. */
export function getPrimaryRecommendation() {
  return getRecommendations({ limit: 1 })[0] || null;
}

/** Topic-scoped advice for the topic detail screen. */
export function getTopicRecommendation(topicId) {
  const progress = getUserProgress();
  const weak = getWeakConcepts({ topicId, limit: 2 });
  const due = getDueFormulas({ topicId, limit: 5 });
  const mistakes = getMistakes({ topicId, includeResolved: false });
  const levels = levelRepository.getByTopic(topicId);

  if (mistakes.length >= 3) {
    return {
      id: 'topic-mistakes',
      title: `Retry ${plural(mistakes.length, 'mistake')} in this topic`,
      route: `/practice?mode=mistakes&topic=${topicId}`,
      icon: 'refresh',
      tone: 'mistakes'
    };
  }
  if (due.length >= 3) {
    return {
      id: 'topic-formulas',
      title: `Revise ${plural(due.length, 'due formula')}`,
      route: `/revise/${topicId}?mode=recall`,
      icon: 'cards',
      tone: 'review'
    };
  }
  if (weak.length) {
    return {
      id: 'topic-weak',
      title: `Practise ${weak[0].concept.name}`,
      route: `/practice?mode=smart&topic=${topicId}`,
      icon: 'target',
      tone: 'default'
    };
  }
  const nextLevel = levels.find((level) => getLevelStatus(level, progress) !== 'completed');
  if (nextLevel) {
    return {
      id: 'topic-next-level',
      title: `Continue: ${nextLevel.title}`,
      route: `/topics/${topicId}/levels/${nextLevel.id}`,
      icon: 'play',
      tone: 'accent'
    };
  }
  return {
    id: 'topic-mixed',
    title: 'Mixed practice in this topic',
    route: `/practice?mode=smart&topic=${topicId}`,
    icon: 'swap',
    tone: 'accent'
  };
}
