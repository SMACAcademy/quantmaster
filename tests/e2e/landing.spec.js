/** The landing page: a 3D tour for first visits, a still version with reduced motion. */

import { expect, seedProgress, test, watchForErrors } from './helpers.js';

const TITLE = { name: 'See the maths move' };

test('a first visit lands on the tour, and Start practising opens the dashboard', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, ...TITLE })).toBeVisible();
  await expect(page.locator('.landing-section[data-station] h2')).toHaveCount(8);
  await expect(page.locator('.landing-stat')).toHaveCount(4);

  // A station's quick question hides its answer until asked.
  const teaser = page.locator('.landing-teaser').first();
  await teaser.scrollIntoViewIfNeeded();
  await expect(teaser.locator('.landing-teaser__a')).toBeHidden();
  await teaser.locator('summary').click();
  await expect(teaser.locator('.landing-teaser__a')).toContainText('3 hours');

  // Topic chips and simulation links lead into the app.
  await expect(page.getByRole('link', { name: 'Trains', exact: true })).toHaveAttribute('href', '#/topics/trains');
  await expect(page.locator('.landing-card__link').first()).toHaveAttribute('href', '#/explore/tsd-meeting');
  await expect(page.getByRole('link', { name: 'Star on GitHub' })).toHaveAttribute('href', 'https://github.com/SMACAcademy/quantmaster');

  await page.getByRole('button', { name: 'Start practising' }).first().click();
  await expect(page.getByRole('heading', { name: 'Welcome to QuantMaster' })).toBeVisible();

  // Once past it, the home address is the dashboard; the tour stays a link away.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to QuantMaster' })).toBeVisible();
  await page.locator('.site-footer').getByRole('link', { name: '3D tour' }).click();
  await expect(page.getByRole('heading', { level: 1, ...TITLE })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the 3D scene starts, and leaving the page shuts it down', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/welcome');
  const canvas = page.locator('canvas.landing__canvas');
  const live = await page.evaluate(() => Boolean(window.WebGL2RenderingContext && document.createElement('canvas').getContext('webgl2')));
  if (live) await expect(page.locator('.landing--live')).toHaveCount(1);
  else await expect(page.locator('.landing--static')).toHaveCount(1);

  // Flying to a stop scrolls the page; the rail follows.
  await page.locator('.landing-rail__dot').nth(4).click();
  await expect(page.locator('.landing-rail__dot').nth(4)).toHaveClass(/is-active/, { timeout: 15_000 });

  await page.goto('/#/topics');
  await expect(canvas).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Topics', level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('with reduced motion the tour is a still page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = watchForErrors(page);
  await page.goto('/#/welcome');
  await expect(page.getByRole('heading', { level: 1, ...TITLE })).toBeVisible();
  await expect(page.locator('.landing--static')).toHaveCount(1);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.landing-card').nth(3)).toBeVisible();
  expect(errors).toEqual([]);
});

test('a returning learner goes straight to the dashboard', async ({ page, context }) => {
  await seedProgress(context, { stats: { questionsAnswered: 12, correctAnswers: 9 }, xp: { total: 90 } });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, ...TITLE })).toHaveCount(0);
  await expect(page.locator('.landing')).toHaveCount(0);
});

test('the tour fits a phone screen @phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, ...TITLE })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Open QuantMaster' })).toBeVisible();
});
