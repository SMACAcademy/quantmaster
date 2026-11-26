/** The core learning loop, with no account: browse, learn a lesson, practise a level. */

import { answerCorrectly, completeSession, completedLevels, expect, seedProgress, test, watchForErrors } from './helpers.js';

const savedProgress = (page) => page.evaluate(() => JSON.parse(window.localStorage.getItem('quantmaster:v1:progress')));

test('a new learner gets the welcome screen and every topic', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to QuantMaster' })).toBeVisible();

  await page.goto('/#/topics');
  await expect(page.locator('.topic-card')).toHaveCount(74);
  await expect(page.locator('.topic-card.is-locked')).toHaveCount(0);

  await page.goto('/#/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
  await expect(page.getByText('QuantMaster has no accounts and no server of its own.')).toBeVisible();
  await expect(page.getByText('No accounts, sign-ups or passwords.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a lesson teaches, checks understanding and unlocks the next level', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/topics/trains/levels/trains-level-0');
  await expect(page.getByRole('heading', { name: 'Length Is Part of the Distance' })).toBeVisible();

  const checks = page.locator('.lesson__block', { has: page.getByText('Quick check') });
  await expect(checks).toHaveCount(2);
  for (const check of await checks.all()) {
    await answerCorrectly(check);
    await check.getByRole('button', { name: 'Check' }).click();
    await expect(check.locator('.feedback--correct')).toBeVisible();
  }

  await page.getByRole('button', { name: 'Mark as understood' }).click();
  await expect(page).toHaveURL(/trains-level-1$/);
  const progress = await savedProgress(page);
  expect(progress.levels['trains-level-0'].status).toBe('completed');
  expect(progress.xp.total).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('a locked level cannot be started', async ({ page }) => {
  await page.goto('/#/topics/trains/levels/trains-level-2');
  await expect(page.getByRole('heading', { name: 'Locked for now' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start level' })).toHaveCount(0);
});

test('a practice level runs to the results screen and counts for the streak', async ({ page, context }) => {
  const errors = watchForErrors(page);
  await seedProgress(context, { levels: completedLevels('trains-level-0', 'trains-level-1') });
  await page.goto('/#/topics/trains/levels/trains-level-2');
  await page.getByRole('button', { name: 'Start level' }).click();

  await completeSession(page, 5);

  await expect(page.locator('.results__score')).toHaveText('100%');
  await expect(page.getByText('5 of 5 correct')).toBeVisible();
  const progress = await savedProgress(page);
  expect(progress.levels['trains-level-2'].status).toBe('completed');
  expect(progress.streak.current).toBe(1); // five questions make today count
  expect(progress.stats.questionsAnswered).toBe(5);
  expect(errors).toEqual([]);
});

test('the mastery map starts practice on one concept', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/topics/trains');
  const nodes = page.locator('.mastery-node');
  await expect(nodes.first()).toBeVisible();
  const concept = (await nodes.first().locator('.mastery-node__name').textContent()).trim();
  await nodes.first().click();
  await expect(page).toHaveURL(/#\/quiz$/);
  await expect(page.locator('.question-card__stem')).toBeVisible();
  // The session is named after the concept.
  await expect(page).toHaveTitle(`${concept} · QuantMaster`);
  expect(errors).toEqual([]);
});

test('fresh generated practice starts straight after a cold load', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/practice?mode=fresh&topic=sequences');
  await expect(page).toHaveURL(/#\/quiz$/);
  await expect(page.locator('.question-card__stem')).toBeVisible();
  await expect(page.getByText('1/10')).toBeVisible();
  expect(errors).toEqual([]);
});

test('quick sheets show every formula or shortcut with nothing else on the page', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/sheet?kind=formula');
  await expect(page.getByRole('heading', { name: 'Formula sheet', level: 1 })).toBeVisible();
  await expect(page.locator('.sheet__topic')).toHaveCount(74);
  // Reading only: no navigation or XP, and no examples until asked for.
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.bottom-nav')).toBeHidden();
  await expect(page.locator('.sheet-item__example')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Show examples and common mistakes' }).click();
  await expect(page.locator('.sheet-item__example').first()).toBeVisible();

  await page.getByRole('button', { name: 'Shortcuts' }).click();
  await expect(page.getByRole('heading', { name: 'Shortcut sheet', level: 1 })).toBeVisible();
  await expect(page.getByText('Net % = a + b + (a × b)/100')).toBeVisible();
  // Shortcuts come with their worked examples.
  await expect(page.locator('.sheet-item__example').first()).toBeVisible();
  // A new learner has studied nothing yet, so that filter is not offered.
  await expect(page.getByRole('button', { name: 'Topics I have studied' })).toHaveCount(0);

  await page.goto('/#/sheet/trains?kind=shortcut');
  await expect(page.getByRole('heading', { name: 'Trains: Shortcut sheet', level: 1 })).toBeVisible();
  await expect(page.locator('.sheet__topic')).toHaveCount(1);
  await page.getByRole('link', { name: 'Done' }).click();
  await expect(page).toHaveURL(/#\/topics\/trains$/);
  // Back in the app proper: the navigation returns, and the topic lists its shortcuts.
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shortcuts', level: 2 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('revision can be limited to shortcuts, and opens the matching sheet', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/revise?mode=browse');
  await page.getByRole('button', { name: 'Shortcuts' }).click();
  await expect(page).toHaveURL(/kind=shortcut/);
  await expect(page.getByRole('heading', { name: 'Shortcut revision', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Read as a sheet' }).click();
  await expect(page.getByRole('heading', { name: 'Shortcut sheet', level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the bottom bar moves between screens on a phone @phone', async ({ page }) => {
  await page.goto('/');
  const bar = page.getByRole('navigation', { name: 'Main' }).last();
  await bar.getByRole('link', { name: 'Topics' }).click();
  await expect(page.getByRole('heading', { name: 'Topics', level: 1 })).toBeVisible();
  await bar.getByRole('link', { name: 'Practice' }).click();
  await expect(page.getByRole('heading', { name: 'Practice', level: 1 })).toBeVisible();
});

test('the traps and strategy sheets, reached from a topic page', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/topics/averages');
  await page.getByRole('link', { name: 'Traps' }).click();
  await expect(page.getByRole('heading', { name: 'Averages: Traps sheet', level: 1 })).toBeVisible();
  await expect(page.locator('.sheet-item--trap').first()).toBeVisible();
  await expect(page.locator('.sheet-item__fix')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Show the right way next to each trap' }).click();
  await expect(page.locator('.sheet-item__fix').first()).toContainText('Right way:');

  await page.getByRole('button', { name: 'Strategy' }).click();
  await expect(page.getByRole('heading', { name: 'Exam strategy', level: 1 })).toBeVisible();
  await expect(page.locator('.sheet-item--strategy')).toHaveCount(12);
  await expect(page.getByText('Guessing with negative marking')).toBeVisible();
  expect(errors).toEqual([]);
});

test('radar and combo charts draw with their values', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/topics/di-mixed-radar/levels/di-mixed-radar-level-0');
  await expect(page.getByRole('heading', { name: 'Radar Charts, Combos and Missing Data', level: 1 })).toBeVisible();
  // The question's radar, not the one in the lesson's simulation.
  const radar = page.locator('.lesson__block:not(.lesson__block--simulation) svg.chart-svg--radar');
  await expect(radar).toBeVisible();
  await expect(radar.locator('.chart-radar-value')).toHaveCount(10); // two students × five subjects
  await expect(page.locator('.chart-value-label--inside')).toHaveCount(5); // production bars
  await expect(page.locator('.chart-legend__item', { hasText: 'Production (bars)' })).toBeVisible();
  await expect(page.locator('.chart-legend__item', { hasText: 'Sales (line)' })).toBeVisible();
  expect(errors).toEqual([]);
});
