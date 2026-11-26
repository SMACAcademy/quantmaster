/**
 * Shareable result summaries.
 *
 * A spoiler-free emoji grid (one square per question) plus a link. Because the
 * daily challenge is the same set for everyone on a given date, a shared daily
 * result doubles as an invitation to compare on identical questions.
 */

import { getStreakStatus } from './gamification.js';

const SQUARES = {
  correct: '🟩',
  hinted: '🟨',
  wrong: '🟥',
  skipped: '⬜'
};

export function resultGrid(result) {
  return result.outcomes
    .map(({ outcome }) => {
      if (!outcome || (!outcome.submitted && outcome.skipped)) return SQUARES.skipped;
      if (!outcome.submitted) return SQUARES.skipped;
      if (!outcome.correct) return SQUARES.wrong;
      return outcome.hintsUsed > 0 || outcome.revealedSolution ? SQUARES.hinted : SQUARES.correct;
    })
    .join('');
}

export function buildShareText(result) {
  const date = new Date(result.finishedAt || Date.now()).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short'
  });
  const isDaily = result.source?.type === 'daily';
  const heading = isDaily ? `QuantMaster Daily · ${date}` : `QuantMaster · ${result.title}`;
  const streak = getStreakStatus();
  const lines = [
    heading,
    `${resultGrid(result)} ${result.correct}/${result.attempted}`,
    streak.current > 1 ? `🔥 ${streak.current}-day streak` : null,
    isDaily ? 'Same questions for everyone today — can you beat it?' : null
  ].filter(Boolean);
  return lines.join('\n');
}

export function shareUrl(result) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return result.source?.type === 'daily' ? `${base}#/practice?mode=daily` : `${base}#/`;
}

/**
 * Uses the native share sheet where available, otherwise copies to the clipboard.
 * @returns {Promise<'shared'|'copied'|'cancelled'|'failed'>}
 */
export async function shareResult(result) {
  const text = buildShareText(result);
  const url = shareUrl(result);

  if (navigator.share) {
    try {
      await navigator.share({ title: 'QuantMaster', text, url });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch (_) {
    return 'failed';
  }
}
