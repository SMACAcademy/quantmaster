/** Shared steps for the browser tests. */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

// Specs import `test` and `expect` from here, so shared set-up has one home.
export { test, expect };

const DATA = join(process.cwd(), 'src', 'data');

/** Every authored question, keyed by its text, so tests can give the right answer. */
const bank = new Map();
for (const dir of ['content', 'questions']) {
  for (const file of readdirSync(join(DATA, dir)).filter((f) => f.endsWith('.json'))) {
    const { questions = [] } = JSON.parse(readFileSync(join(DATA, dir, file), 'utf8'));
    for (const question of questions) bank.set(question.question, question);
  }
}

export const todayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Put saved progress in place before the app starts. Only the given parts are
 * needed; the app fills in the rest, as it does for older saves.
 */
export async function seedProgress(context, progress) {
  await context.addInitScript((value) => {
    if (!window.localStorage.getItem('quantmaster:v1:progress')) {
      window.localStorage.setItem('quantmaster:v1:progress', JSON.stringify(value));
    }
  }, progress);
}

/**
 * Skip the landing page, as a visitor who has already been past it would. Tests
 * that start at the home address and are about the dashboard use this.
 */
export async function skipLanding(context) {
  await context.addInitScript(() => window.localStorage.setItem('quantmaster:v1:welcomed', 'true'));
}

export const completedLevels = (...ids) =>
  Object.fromEntries(ids.map((id) => [id, { levelId: id, topicId: id.replace(/-level-\d+$/, ''), status: 'completed', attempts: 1, bestAccuracy: 100 }]));

/** Collect console errors and failed page scripts; assert on it at the end of a test. */
export function watchForErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/**
 * Answer the question on screen correctly (choice or numeric questions), using
 * the authored answer. Returns the question it answered.
 */
export async function answerCorrectly(scope) {
  const text = (await scope.locator('.question-card__stem').first().textContent()).trim();
  const question = bank.get(text);
  if (!question) throw new Error(`No authored question matches "${text}"`);
  if (question.options) {
    const correct = question.options.find((o) => question.correctAnswer.includes(o.id));
    await scope.getByRole('radio').filter({ has: scope.page().locator('.option__text', { hasText: new RegExp(`^${escape(correct.text)}$`) }) }).first().click();
  } else {
    await scope.getByLabel('Numerical answer').fill(String(question.answer.value));
  }
  return question;
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Achievement pop-ups can appear mid-session (a mixed session unlocks them) and
 * animate in a moment later, so close them whenever one blocks a step.
 */
const handled = new WeakSet();
async function dismissCelebration(page) {
  if (handled.has(page)) return;
  handled.add(page);
  // Several can queue up, so do not wait for this one to vanish: the next one is handled in turn.
  await page.addLocatorHandler(page.getByRole('button', { name: 'Nice' }), async (nice) => nice.click(), { noWaitAfter: true });
}

/** Work through a quiz session, answering every question correctly. */
export async function completeSession(page, questionCount) {
  for (let i = 0; i < questionCount; i++) {
    await expect(page.locator('.question-card__stem')).toBeVisible();
    await dismissCelebration(page);
    await answerCorrectly(page.locator('main'));
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await page.getByRole('button', { name: i === questionCount - 1 ? 'Finish session' : 'Next question' }).click();
  }
}
