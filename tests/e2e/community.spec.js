/** The About page, the site footer and the puzzle of the week. */

import { answerCorrectly, completedLevels, completeSession, expect, seedProgress, test, watchForErrors } from './helpers.js';

test('About introduces the app and its maker, with ways to join in', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/about');
  await expect(page.getByRole('heading', { name: 'About QuantMaster' })).toBeVisible();
  await expect(page.locator('.about-stat')).toHaveCount(4);
  const creator = page.getByRole('region', { name: 'Who built QuantMaster' });
  await expect(creator).toContainText('Muthukumar Subramanian');
  await expect(creator).toContainText('Agentic AI');
  await expect(creator).toContainText('Created by');
  const linkedin = creator.getByRole('link', { name: 'Connect on LinkedIn' });
  await expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/muthu4all/');
  await expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(creator.getByRole('link', { name: 'everyone who has contributed' })).toHaveAttribute('href', /graphs\/contributors$/);
  const star = page.getByRole('link', { name: /Star the project/ });
  await expect(star).toHaveAttribute('href', 'https://github.com/SMACAcademy/quantmaster');
  await expect(star).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: /Puzzle of the week #\d+/ })).toHaveAttribute('href', /discussions\/categories\/q-a$/);

  // The quiet footer on every page links back here.
  const footer = page.locator('.site-footer');
  await expect(footer).toContainText('Made by Muthukumar Subramanian');
  await expect(footer.getByRole('link', { name: 'Muthukumar Subramanian' })).toHaveAttribute('href', 'https://www.linkedin.com/in/muthu4all/');
  await page.goto('/#/topics');
  await footer.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/#\/about$/);
  expect(errors).toEqual([]);
});

test('the puzzle of the week checks an answer, gives a hint, and shows the method once solved', async ({ page, context }) => {
  // The first puzzle is the leaky tank: 4 hours.
  await page.clock.setFixedTime(new Date('2026-11-30T10:00:00Z'));
  const errors = watchForErrors(page);
  await page.goto('/#/dashboard');
  const card = page.locator('.puzzle');
  await expect(card).toContainText('Puzzle of the week #1');
  await expect(card).toContainText('Two taps and a leak');
  await expect(card.locator('.puzzle__method')).toHaveCount(0);

  const box = card.getByRole('textbox', { name: 'Your answer' });
  await box.fill('5');
  await box.press('Enter');
  await expect(card.getByRole('status')).toContainText('Not quite');
  await card.getByRole('button', { name: 'Hint' }).click();
  await expect(card.locator('.puzzle__hint')).toContainText('tank per hour');

  await box.fill('4 hours');
  await card.getByRole('button', { name: 'Check' }).click();
  await expect(card).toContainText('Solved: 4 hours (in 2 tries)');
  await expect(card.locator('.puzzle__method li')).toHaveCount(3);
  const share = card.getByRole('link', { name: 'Share your method' });
  await expect(share).toHaveAttribute('href', /discussions\/new\?category=q-a&title=Puzzle\+of\+the\+week\+%231/);
  await expect(card.getByRole('link', { name: 'See it move' })).toHaveAttribute('href', '#/explore/tank-filling');

  // Solved stays solved.
  await page.reload();
  await expect(page.locator('.puzzle')).toContainText('Solved: 4 hours');
  expect(errors).toEqual([]);
});

test('after a few sessions, results invite a star once; "Not now" hides it for good', async ({ page, context }) => {
  // Two sessions done before; this one makes three.
  await seedProgress(context, { levels: completedLevels('trains-level-0', 'trains-level-1'), stats: { questionsAnswered: 30, correctAnswers: 20, sessionsCompleted: 2 } });
  await page.goto('/#/topics/trains/levels/trains-level-2');
  await page.getByRole('button', { name: 'Start level' }).click();
  await completeSession(page, 5);

  await expect(page.locator('.results__score')).toBeVisible();
  const nudge = page.getByRole('region', { name: 'Help QuantMaster grow' });
  await expect(nudge.getByRole('link', { name: 'Star on GitHub' })).toHaveAttribute('href', 'https://github.com/SMACAcademy/quantmaster');
  await nudge.getByRole('button', { name: 'Not now' }).click();
  await expect(nudge).toHaveCount(0);
  // Leave and come back (the last result lives in memory, so no reload).
  await page.evaluate(() => (window.location.hash = '#/progress'));
  await page.evaluate(() => (window.location.hash = '#/results'));
  await expect(page.locator('.results__score')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Help QuantMaster grow' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('quantmaster:v1:community-nudge-dismissed'))).toBe('true');
});

test('a worked solution links to GitHub to ask about the question or report a problem', async ({ page, context }) => {
  await seedProgress(context, { levels: completedLevels('trains-level-0', 'trains-level-1') });
  await page.goto('/#/topics/trains/levels/trains-level-2');
  await page.getByRole('button', { name: 'Start level' }).click();
  await expect(page.locator('.question-card__stem')).toBeVisible();
  await answerCorrectly(page.locator('main'));
  await page.getByRole('button', { name: 'Submit answer' }).click();
  const report = page.getByRole('link', { name: 'Report a problem with this question' });
  await expect(report).toHaveAttribute('href', /issues\/new\?template=content-error\.yml&title=%5Btrains-/);
  await expect(report).toHaveAttribute('href', /&topic=Trains/);
  await expect(page.getByRole('link', { name: 'Ask or share a quicker way' })).toHaveAttribute('href', /discussions\/new\?category=q-a/);
});
