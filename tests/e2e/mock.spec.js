/** A full mock test: start a paper, move with the palette, mark, submit, read the analysis. */

import { expect, test, watchForErrors } from './helpers.js';

/** Answer the question on screen with anything: the first option, or a typed number. */
async function answerAnything(page) {
  const options = page.getByRole('radiogroup', { name: 'Answer options' }).getByRole('radio');
  if (await options.count()) await options.first().click();
  else await page.getByLabel('Numerical answer').fill('7');
}

test('a campus mock runs on the clock, keeps the palette honest, and is analysed', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/mock');
  await expect(page.getByRole('heading', { name: 'Mock tests', level: 1 })).toBeVisible();
  const card = page.locator('.mock-card', { hasText: 'Campus placement aptitude' });
  await expect(card).toContainText('Not attempted yet');
  await card.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Start the test' }).click();

  // The exam hall: no app chrome, a clock, and a palette of 20 questions.
  await expect(page).toHaveURL(/#\/mock\/run$/);
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.mock__clock')).toHaveText(/^2[45]:\d\d$/);
  await expect(page.locator('.mock__palette-grid .mock-dot')).toHaveCount(20);
  await expect(page.getByText('Question 1 of 20')).toBeVisible();

  await answerAnything(page);
  await expect(page.getByRole('button', { name: 'Question 1: Answered' })).toBeVisible();

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Question 2 of 20')).toBeVisible();
  await page.getByRole('button', { name: 'Mark for review' }).click();
  await expect(page.getByRole('button', { name: 'Question 2: Marked for review' })).toBeVisible();

  // Jump straight to question 12 from the palette and answer it.
  await page.getByRole('button', { name: /^Question 12:/ }).click();
  await expect(page.getByText('Question 12 of 20')).toBeVisible();
  await answerAnything(page);
  await expect(page.getByRole('button', { name: 'Question 12: Answered' })).toBeVisible();

  await page.getByRole('button', { name: 'Submit test' }).click();
  await expect(page.getByRole('dialog')).toContainText('2 answered, 17 not answered, 1 marked for review');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();

  // The analysis.
  await expect(page).toHaveURL(/#\/mock\/result$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/^Campus placement aptitude: \d+ \/ 20$/);
  await expect(page.locator('.stat-tile', { hasText: 'Attempted' })).toContainText('2/20');
  await expect(page.getByRole('heading', { name: 'What to change next time' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'By section' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review every question' })).toBeVisible();
  await expect(page.locator('.mock-advice li').first()).toBeVisible();

  // Back on the list, the attempt is remembered.
  await page.goto('/#/mock');
  await expect(page.locator('.mock-history')).toContainText('Campus placement aptitude');
  await expect(card).toContainText('1 attempt');
  expect(errors).toEqual([]);
});

test('reasoning papers have their own section, and a bank reasoning mock builds a full paper', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/mock');
  const reasoning = page.locator('section', { has: page.getByRole('heading', { name: 'Logical reasoning' }) });
  await expect(reasoning.locator('.mock-card')).toHaveCount(3);
  const card = reasoning.locator('.mock-card', { hasText: 'IBPS / SBI Prelims: Reasoning' });
  await card.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Start the test' }).click();
  await expect(page).toHaveURL(/#\/mock\/run$/);
  await expect(page.locator('.mock__clock')).toHaveText(/^(20:00|19:5\d)$/);
  await expect(page.locator('.mock__palette-grid .mock-dot')).toHaveCount(35);
  await expect(page.locator('.question-card__stem')).toBeVisible();
  expect(errors).toEqual([]);
});
