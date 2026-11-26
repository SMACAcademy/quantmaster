/**
 * Engagement features that need no login: the per-topic mastery map, concept
 * practice sessions and the daily reminder's scheduling rules.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { buildMasteryStages, conceptNodeState } from '../src/components/MasteryMap.js';
import { conceptRepository, levelRepository } from '../src/repositories/contentRepository.js';
import { resetProgress } from '../src/repositories/progressRepository.js';
import { buildConceptSession } from '../src/services/sessionBuilder.js';
import { minutesOf, msUntilNext, reminderMessage, shouldRemind } from '../src/services/reminders.js';
import { dayKey } from '../src/utils/format.js';

beforeEach(() => {
  resetProgress();
});

describe('mastery map', () => {
  it('places every concept exactly once, in teaching order', () => {
    for (const topicId of ['probability', 'number-system', 'sequences', 'percentages']) {
      const concepts = conceptRepository.getByTopic(topicId);
      const stages = buildMasteryStages(concepts, levelRepository.getByTopic(topicId));
      const placed = stages.flatMap((s) => s.concepts.map((c) => c.id));
      expect(placed.sort()).toEqual(concepts.map((c) => c.id).sort());
      expect(stages.every((s) => s.concepts.length > 0)).toBe(true);
    }
  });

  it('gives Tier 6 concepts their own stage after the core ones', () => {
    const stages = buildMasteryStages(conceptRepository.getByTopic('probability'), levelRepository.getByTopic('probability'));
    const last = stages[stages.length - 1];
    expect(last.title).toMatch(/^Advanced/);
    expect(last.concepts.map((c) => c.id)).toEqual(['prob-adv-conditional', 'prob-adv-stages']);
  });

  it('describes a node from its progress, including fading', () => {
    expect(conceptNodeState(null)).toMatchObject({ started: false, score: 0, fading: false });
    const now = new Date('2026-09-26T12:00:00');
    const fresh = { attempts: 5, masteryScore: 72, lastAttemptedAt: '2026-09-25T12:00:00' };
    expect(conceptNodeState(fresh, now)).toMatchObject({ started: true, score: 72, fading: false });
    expect(conceptNodeState(fresh, now).label.id).toBe('proficient');
    const stale = { ...fresh, lastAttemptedAt: '2026-07-01T12:00:00' };
    const faded = conceptNodeState(stale, now);
    expect(faded.fading).toBe(true);
    expect(faded.score).toBeLessThan(72);
  });

  it('builds a practice session for a single concept', () => {
    const session = buildConceptSession({ conceptId: 'prob-complement', count: 8 });
    expect(session.questions.length).toBe(8);
    expect(session.questions.every((q) => q.conceptId === 'prob-complement')).toBe(true);
    expect(session.source).toMatchObject({ type: 'concept', topicId: 'probability' });
    expect(buildConceptSession({ conceptId: 'no-such-concept' })).toBeNull();
  });
});

describe('daily reminder rules', () => {
  const at = (time) => new Date(`2026-09-26T${time}:00`);
  const state = (extra = {}) => ({ enabled: true, time: '19:00', lastPracticeDay: null, notifiedDay: null, ...extra });

  it('reads times as minutes after midnight', () => {
    expect(minutesOf('19:30')).toBe(1170);
    expect(minutesOf('00:05')).toBe(5);
  });

  it('waits until the next occurrence of the reminder time', () => {
    expect(msUntilNext('19:00', at('18:30'))).toBe(30 * 60 * 1000);
    expect(msUntilNext('19:00', at('19:00'))).toBe(24 * 60 * 60 * 1000);
    expect(msUntilNext('07:00', at('19:00'))).toBe(12 * 60 * 60 * 1000);
  });

  it('reminds only after the time, when enabled, not yet practised and not already reminded', () => {
    const now = at('19:05');
    expect(shouldRemind(state(), now)).toBe(true);
    expect(shouldRemind(state(), at('18:59'))).toBe(false);
    expect(shouldRemind(state({ enabled: false }), now)).toBe(false);
    expect(shouldRemind(state({ lastPracticeDay: dayKey(now) }), now)).toBe(false);
    expect(shouldRemind(state({ notifiedDay: dayKey(now) }), now)).toBe(false);
    // Practising or being reminded yesterday does not count for today.
    expect(shouldRemind(state({ lastPracticeDay: '2026-09-25', notifiedDay: '2026-09-25' }), now)).toBe(true);
  });

  it('mentions the streak when there is one', () => {
    expect(reminderMessage({ streak: 12, freezes: 0 }).title).toBe('Keep your 12-day streak going');
    expect(reminderMessage({ streak: 12, freezes: 0 }).body).toMatch(/no streak freeze left/);
    expect(reminderMessage({ streak: 0 }).title).toBe('Time for a little practice');
  });
});
