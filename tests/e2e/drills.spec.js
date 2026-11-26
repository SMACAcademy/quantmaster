/** Must-know tables and the 60-second speed drill, typed on the real keyboard. */

import { expect, test, watchForErrors } from './helpers.js';

/** Work out the answer to a squares-drill prompt ("17² = ?" or "√289 = ?"). */
function squaresAnswer(prompt) {
  const square = /^(\d+)² = \?$/.exec(prompt);
  if (square) return String(Number(square[1]) ** 2);
  const root = /^√(\d+) = \?$/.exec(prompt);
  return String(Math.sqrt(Number(root[1])));
}

test('the tables page lists every table, with nothing else on the page', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/tables');
  await expect(page.getByRole('heading', { name: 'Must-know tables', level: 1 })).toBeVisible();
  await expect(page.locator('.tables__table')).toHaveCount(10);
  await expect(page.locator('.topbar')).toBeHidden();
  const squares = page.locator('#table-squares');
  await expect(squares.locator('.tables__cell', { hasText: '17²' })).toContainText('289');
  await expect(page.locator('#table-fractions .tables__cell', { hasText: '1/3' }).first()).toContainText('33 1/3%');
  await expect(squares).toContainText('Not drilled yet');
  expect(errors).toEqual([]);
});

test('a drill marks typed answers, shows misses, and keeps the best score', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/tables');
  await page.locator('#table-squares').getByRole('link', { name: 'Drill' }).click();
  await expect(page).toHaveURL(/#\/drill\/squares$/);
  await page.getByRole('button', { name: 'Start' }).click();

  const prompt = page.locator('.drill__prompt');
  const box = page.getByLabel('Your answer');

  // Three right answers in a row: the answer box keeps focus between questions.
  for (let i = 1; i <= 3; i++) {
    await expect(box).toBeFocused();
    const text = await prompt.textContent();
    await page.keyboard.type(squaresAnswer(text));
    await page.keyboard.press('Enter');
    await expect(page.locator('.drill__score')).toHaveText(`${i} correct`);
    await expect(prompt).not.toHaveText(text);
  }

  // A wrong answer shows the right one before moving on.
  const missed = await prompt.textContent();
  await page.keyboard.type('1');
  await page.keyboard.press('Enter');
  await expect(page.locator('.drill__reveal')).toContainText(`Answer: ${Number(squaresAnswer(missed)).toLocaleString('en-IN')}`);
  await expect(box).toBeFocused(); // back in the box once the next question appears

  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('heading', { name: 'New best!' })).toBeVisible();
  await expect(page.locator('.stat-tile', { hasText: 'Correct' })).toContainText('3');
  await expect(page.locator('.stat-tile', { hasText: 'Attempted' })).toContainText('4');
  await expect(page.locator('.drill__missed')).toContainText(missed);

  await page.getByRole('link', { name: 'Back to tables' }).click();
  await expect(page.locator('#table-squares')).toContainText('Best: 3 in 60 s');
  expect(errors).toEqual([]);
});

test('choice drills answer with number keys', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/drill/primes');
  await page.getByRole('button', { name: 'Start' }).click();
  const prompt = await page.locator('.drill__prompt').textContent();
  const n = Number(/Is (\d+) prime\?/.exec(prompt)[1]);
  let prime = n > 1;
  for (let d = 2; d < n; d++) if (n % d === 0) prime = false;
  await page.keyboard.press(prime ? '1' : '2');
  await expect(page.locator('.drill__score')).toHaveText('1 correct');
  expect(errors).toEqual([]);
});
