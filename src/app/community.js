/**
 * Who made QuantMaster, where its code lives, and links that invite people in:
 * GitHub Discussions, issues and the weekly puzzle. Forks change CREATOR and REPO_URL.
 * Empty creator fields are hidden.
 */

import puzzles from '../data/puzzles.json';

export const CREATOR = {
  /** Your name as you want it shown. */
  name: 'Muthukumar Subramanian',
  /** A short line under the name. */
  headline: 'Agentic AI & GenAI Architect · Fractional Executive · Mentor',
  /** One or two sentences on what you do. */
  summary:
    'I help enterprises take AI agents from proof of concept to production, reliably, on secure, cloud-native platforms: architecture and production-readiness reviews, turning ideas into running systems, and mentoring the engineers who build them. QuantMaster is one example: a complete learning platform designed and built with AI.',
  /** What you work on, shown as small tags. */
  focus: ['AI agents & RAG / GraphRAG', 'Kubernetes & DevSecOps', 'Training & mentoring'],
  /** A short credentials line. */
  credentials: '25 years in technology · Ex-CTO, Pente AI · Founder, SMAC Academy',
  /** Full LinkedIn profile URL, e.g. "https://www.linkedin.com/in/your-name/". Empty hides the button. */
  linkedin: ''
};

export const REPO_URL = 'https://github.com/SMACAcademy/quantmaster';

export const hasCreator = () => CREATOR.name.trim() !== '';

export const COMMUNITY = {
  repo: REPO_URL,
  discussions: `${REPO_URL}/discussions`,
  puzzles: `${REPO_URL}/discussions/categories/q-a`,
  ideas: `${REPO_URL}/discussions/new?category=ideas`,
  contributing: `${REPO_URL}/blob/main/CONTRIBUTING.md`,
  goodFirstIssues: `${REPO_URL}/issues?q=is%3Aopen+label%3A%22good+first+issue%22`
};

/** GitHub's default discussion categories. */
export function newDiscussionUrl(category, title, body = '') {
  const query = new URLSearchParams({ category, title });
  if (body) query.set('body', body);
  return `${REPO_URL}/discussions/new?${query.toString()}`;
}

/** A new issue from one of the forms in .github/ISSUE_TEMPLATE, with fields filled in by id. */
export function newIssueUrl(template, title, fields = {}) {
  const query = new URLSearchParams({ template, title });
  for (const [id, value] of Object.entries(fields)) if (value) query.set(id, value);
  return `${REPO_URL}/issues/new?${query.toString()}`;
}

/** This page's address without any query, for links back from GitHub. */
export function pageUrl() {
  return typeof window === 'undefined' ? '' : window.location.href.split('?')[0];
}

/* ============================== weekly puzzle ============================== */

export const PUZZLES = puzzles.puzzles;

/**
 * Monday 30 November 2026, 00:00 UTC: puzzle number 1. The scheduled workflow
 * .github/workflows/weekly-puzzle.yml uses the same start and order, so the app
 * and the posted discussion always agree.
 */
export const PUZZLE_EPOCH = Date.UTC(2026, 10, 30);
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** The puzzle for the week containing `now` (weeks start on Monday, UTC). Before the start, puzzle 1. */
export function weeklyPuzzle(now = Date.now()) {
  const week = Math.max(0, Math.floor((now - PUZZLE_EPOCH) / WEEK));
  return { number: week + 1, puzzle: PUZZLES[week % PUZZLES.length] };
}

/** Whether a typed answer matches: numbers compare with a small tolerance; commas and units are ignored. */
export function checkPuzzleAnswer(puzzle, typed) {
  const cleaned = String(typed ?? '').replace(/,/g, '').trim();
  const match = cleaned.match(/^-?\d+(\.\d+)?/);
  if (!match) return false;
  return Math.abs(Number(match[0]) - puzzle.answer) < 1e-6 * Math.max(1, Math.abs(puzzle.answer));
}
