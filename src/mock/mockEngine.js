/**
 * Mock tests: building a paper from a pattern, keeping time and answers while
 * it is taken, scoring it with the exam's marking, and analysing the attempt.
 * Free of the DOM; question sources are passed in so tests can control them.
 */

import { evaluateAnswer, isResponseComplete } from '../services/quizEngine.js';
import { questionCount } from './patterns.js';

/** Question types that fit an exam paper: one choice, or a typed number. */
export const EXAM_TYPES = ['single_choice', 'numerical_input'];

/**
 * Assemble a paper. `authored(section)` returns candidate hand-written
 * questions; `generated(section, count, avoid)` returns fresh ones. About half of
 * each section comes from each, topping up from whichever has more.
 */
export function assemblePaper(pattern, { authored, generated, random = Math.random }) {
  const shuffle = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const used = new Set();
  const items = [];
  for (const section of pattern.blueprint) {
    const pool = shuffle(authored(section).filter((q) => EXAM_TYPES.includes(q.type) && !used.has(q.id)));
    const wantGenerated = Math.ceil(section.count / 2);
    const fresh = generated(section, wantGenerated, used).filter((q) => !used.has(q.id));
    const picked = [...fresh.slice(0, wantGenerated)];
    for (const q of pool) {
      if (picked.length >= section.count) break;
      picked.push(q);
    }
    if (picked.length < section.count) {
      picked.push(...generated(section, section.count - picked.length, new Set([...used, ...picked.map((q) => q.id)])).slice(0, section.count - picked.length));
    }
    for (const question of shuffle(picked)) {
      used.add(question.id);
      items.push({ question, section: section.label });
    }
  }
  return items;
}

/** A fresh attempt at a paper. */
export function startAttempt(pattern, items, now = Date.now()) {
  return {
    id: `mock-${now}`,
    patternId: pattern.id,
    items,
    current: 0,
    responses: {},
    marked: new Set(),
    visited: new Set([items[0]?.question.id].filter(Boolean)),
    timeMs: {},
    startedAt: now,
    shownAt: now,
    endsAt: now + pattern.minutes * 60 * 1000,
    finishedAt: null
  };
}

/** Add the time spent on the question being shown, then show another. */
export function goTo(attempt, index, now = Date.now()) {
  const id = attempt.items[attempt.current]?.question.id;
  if (id) attempt.timeMs[id] = (attempt.timeMs[id] || 0) + Math.max(0, now - attempt.shownAt);
  attempt.current = Math.max(0, Math.min(index, attempt.items.length - 1));
  attempt.shownAt = now;
  attempt.visited.add(attempt.items[attempt.current].question.id);
}

export function setResponse(attempt, questionId, response) {
  if (response === null || response === undefined || response === '') delete attempt.responses[questionId];
  else attempt.responses[questionId] = response;
}

export function toggleMark(attempt, questionId) {
  if (attempt.marked.has(questionId)) attempt.marked.delete(questionId);
  else attempt.marked.add(questionId);
}

export function isAnswered(attempt, question) {
  const response = attempt.responses[question.id];
  return response !== undefined && isResponseComplete(question, response);
}

/** The palette state of one question: not-visited, not-answered, answered, marked, answered-marked. */
export function paletteState(attempt, question) {
  const answered = isAnswered(attempt, question);
  if (attempt.marked.has(question.id)) return answered ? 'answered-marked' : 'marked';
  if (answered) return 'answered';
  return attempt.visited.has(question.id) ? 'not-answered' : 'not-visited';
}

export function counts(attempt) {
  const states = attempt.items.map(({ question }) => paletteState(attempt, question));
  const count = (...names) => states.filter((s) => names.includes(s)).length;
  return {
    answered: count('answered', 'answered-marked'),
    notAnswered: count('not-answered'),
    marked: count('marked', 'answered-marked'),
    notVisited: count('not-visited')
  };
}

export function finishAttempt(attempt, now = Date.now()) {
  goTo(attempt, attempt.current, Math.min(now, attempt.endsAt));
  attempt.finishedAt = Math.min(now, attempt.endsAt);
  return attempt;
}

/** Marks for one question under the pattern's scheme. */
export function marksFor(pattern, question, status) {
  if (status === 'correct') return pattern.marks.correct;
  if (status === 'wrong') return pattern.marks.typedNoNegative && question.type === 'numerical_input' ? 0 : pattern.marks.wrong;
  return 0;
}

const round2 = (value) => Math.round(value * 100) / 100;

/** Score and analyse a finished attempt. */
export function analyseAttempt(pattern, attempt) {
  const total = questionCount(pattern);
  const budgetMs = (pattern.minutes * 60 * 1000) / total;
  const rows = attempt.items.map(({ question, section }, index) => {
    const answered = isAnswered(attempt, question);
    const status = !answered ? 'unanswered' : evaluateAnswer(question, attempt.responses[question.id]).correct ? 'correct' : 'wrong';
    return {
      index,
      question,
      section,
      status,
      response: attempt.responses[question.id] ?? null,
      marks: marksFor(pattern, question, status),
      timeMs: attempt.timeMs[question.id] || 0
    };
  });

  const correct = rows.filter((r) => r.status === 'correct');
  const wrong = rows.filter((r) => r.status === 'wrong');
  const attempted = correct.length + wrong.length;
  const score = round2(rows.reduce((sum, r) => sum + r.marks, 0));
  const lost = round2(-wrong.reduce((sum, r) => sum + r.marks, 0));

  const group = (keyOf) => {
    const map = new Map();
    for (const row of rows) {
      const key = keyOf(row);
      if (!map.has(key)) map.set(key, { key, count: 0, attempted: 0, correct: 0, score: 0, timeMs: 0 });
      const entry = map.get(key);
      entry.count += 1;
      entry.timeMs += row.timeMs;
      entry.score = round2(entry.score + row.marks);
      if (row.status !== 'unanswered') entry.attempted += 1;
      if (row.status === 'correct') entry.correct += 1;
    }
    return [...map.values()];
  };

  const timeSinks = rows
    .filter((r) => r.timeMs > 2 * budgetMs)
    .sort((a, b) => b.timeMs - a.timeMs)
    .slice(0, 5);
  // Wrong after a long think: these cost marks and the time for another question.
  const skipNextTime = wrong.filter((r) => r.timeMs > budgetMs).sort((a, b) => b.timeMs - a.timeMs);
  const missedEasy = rows.filter((r) => r.status === 'unanswered' && r.question.difficulty === 'easy');

  const accuracy = attempted ? Math.round((correct.length / attempted) * 100) : 0;
  const usedMs = Math.max(0, (attempt.finishedAt ?? attempt.endsAt) - attempt.startedAt);

  return {
    total,
    attempted,
    correct: correct.length,
    wrong: wrong.length,
    unanswered: total - attempted,
    score,
    maxScore: total * pattern.marks.correct,
    lost,
    accuracy,
    usedMs,
    budgetMs,
    averageMs: attempted ? Math.round(rows.filter((r) => r.status !== 'unanswered').reduce((s, r) => s + r.timeMs, 0) / attempted) : 0,
    rows,
    sections: group((r) => r.section),
    topics: group((r) => r.question.topicId),
    timeSinks,
    skipNextTime,
    missedEasy,
    advice: advise({ pattern, accuracy, attempted, total, lost, skipNextTime, missedEasy })
  };
}

/** Two or three plain sentences on what to change next time. */
export function advise({ pattern, accuracy, attempted, total, lost, skipNextTime, missedEasy }) {
  const out = [];
  const negative = pattern.marks.wrong < 0;
  if (!attempted) return ['Nothing was answered. Next time, start with the questions you can do fastest and come back to the rest.'];
  if (negative && accuracy < 60) {
    out.push(`At ${accuracy}% accuracy the negative marking cost you ${lost} marks. Attempt fewer questions, but only ones you can solve with confidence.`);
  } else if (accuracy >= 85 && attempted < total * 0.7) {
    out.push(`Your accuracy is ${accuracy}%, so you can afford to attempt more: speed is what is holding the score back.`);
  } else if (!negative && attempted < total) {
    out.push('There is no negative marking here: never leave a question blank, even if you have to guess.');
  } else {
    out.push(`${accuracy}% accuracy on ${attempted} of ${total} questions.`);
  }
  if (skipNextTime.length) {
    out.push(`${skipNextTime.length} question${skipNextTime.length === 1 ? '' : 's'} took longer than the time each question deserves and still went wrong. In a real paper, skip those early and come back if time allows.`);
  }
  if (missedEasy.length) {
    out.push(`${missedEasy.length} easy question${missedEasy.length === 1 ? ' was' : 's were'} left unanswered. Do a quick first pass through the whole paper so easy marks are never left behind.`);
  }
  return out;
}
