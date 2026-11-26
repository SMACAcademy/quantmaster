/** Explore: interactive simulations, on their own pages, on topic pages and inside lessons. */

import { expect, test, watchForErrors } from './helpers.js';

test('the gallery lists the simulations and each one reacts to its sliders', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/explore');
  await expect(page.getByRole('heading', { name: 'Explore', level: 1 })).toBeVisible();
  await expect(page.locator('.sim-card')).toHaveCount(57);

  await page.locator('.sim-card', { hasText: 'The angle between the hands' }).click();
  await expect(page).toHaveURL(/#\/explore\/clock-angle$/);
  await expect(page.getByRole('heading', { name: 'The angle between the hands', level: 1 })).toBeVisible();
  const angle = page.locator('.sim-readout', { hasText: 'Angle between' }).locator('dd');
  await expect(angle).toHaveText('115°'); // 10:10

  // Keyboard on a slider: 10:10 → 10:15 is 5 × 5.5° = 27.5° closer.
  const minutes = page.getByRole('slider', { name: 'Minutes' });
  await minutes.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect(angle).toHaveText('142.5°');
  await expect(page.locator('.sim-control__value').nth(1)).toHaveText('15');

  // "Show me" sets a solution, and the challenge is marked as solved.
  const task = page.locator('.sim-task', { hasText: 'right angles' });
  await task.getByRole('button', { name: 'Show me' }).click();
  await expect(task).toHaveClass(/is-done/);
  await expect(angle).toHaveText('90°');
  await expect(page.getByText('Try this (1 of 3 done)')).toBeVisible();

  // Finished challenges are remembered on this device.
  await page.goto('/#/explore');
  await expect(page.locator('.sim-card', { hasText: 'The angle between the hands' })).toContainText('1 of 3 challenges done');
  expect(errors).toEqual([]);
});

test('choices redraw the picture: a chase that never ends', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/explore/tsd-meeting');
  await expect(page.locator('.sim-readout', { hasText: 'They meet after' }).locator('dd')).toHaveText('2 h');
  await page.getByRole('button', { name: 'Same way (A chases B)' }).click();
  await expect(page.locator('.sim-readout', { hasText: 'They meet after' }).locator('dd')).toHaveText('6 h');
  const speedA = page.getByRole('slider', { name: 'Speed of A' });
  await speedA.focus();
  await page.keyboard.press('Home'); // 10 km/h, slower than B
  await expect(page.locator('.sim-readout', { hasText: 'They meet after' }).locator('dd')).toHaveText('Never: A is not faster');
  await expect(page.locator('.sim__insight')).toContainText('never cross');
  expect(errors).toEqual([]);
});

test('topics show their simulations, and lessons include them', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/topics/compound-interest');
  await expect(page.getByRole('heading', { name: 'Explore', level: 2 })).toBeVisible();
  await expect(page.locator('.sim-card', { hasText: 'Compound vs simple interest' })).toBeVisible();

  await page.goto('/#/topics/compound-interest/levels/compound-interest-level-0');
  const lessonSim = page.locator('.lesson__block--simulation');
  await expect(lessonSim).toBeVisible();
  await expect(lessonSim.getByRole('heading', { name: 'Compound vs simple interest' })).toBeVisible();
  await expect(lessonSim.locator('svg.sim-plot')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the new picture types respond: a tank, a number line, a polygon', async ({ page }) => {
  const errors = watchForErrors(page);

  await page.goto('/#/explore/tank-filling');
  const level = page.locator('.sim-readout', { hasText: 'Level after' }).locator('dd');
  await expect(level).toHaveText('50%');
  await page.getByRole('slider', { name: 'Minutes since opening' }).focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await expect(level).toHaveText('100%');
  await expect(page.locator('.sim-water-label')).toHaveText('After 12 min: 100% full');

  await page.goto('/#/explore/inequality-line');
  await page.locator('.sim-task', { hasText: 'negative a' }).getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('.sim-readout', { hasText: 'flip the sign' }).locator('dd')).toHaveText('x > 2');
  await expect(page.locator('.sim-dot-open')).toHaveCount(1);

  await page.goto('/#/explore/polygon-angles');
  const sides = page.getByRole('slider', { name: 'Number of sides' });
  await sides.focus();
  await page.keyboard.press('ArrowRight'); // 6 sides
  await expect(page.locator('.sim-readout', { hasText: 'Each interior angle' }).locator('dd')).toHaveText('120°');
  await expect(page.locator('.sim-diagonal')).toHaveCount(9);
  expect(errors).toEqual([]);
});

test('the data pictures respond: DI charts, a table, a shrinking answer set', async ({ page }) => {
  const errors = watchForErrors(page);

  await page.goto('/#/explore/di-bar-graphs');
  await expect(page.locator('.sim-figure--chart .chart-bar')).toHaveCount(5);
  const change = page.locator('.sim-readout', { hasText: '% change, 2019 → 2023' }).locator('dd');
  await expect(change).toHaveText('+150%');
  await page.locator('.sim-task', { hasText: 'twice the base' }).getByRole('button', { name: 'Show me' }).click();
  await expect(change).toHaveText('+100%');

  // Years on a slider read 2016, not 2,016; narrowing the window merges the two highlighted steps.
  await page.goto('/#/explore/di-line-graphs');
  await expect(page.locator('.sim-control__value').first()).toHaveText('2016');
  await expect(page.locator('.chart-highlight')).toHaveCount(2);
  await page.getByRole('slider', { name: 'Window from' }).focus();
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowRight');
  await page.getByRole('slider', { name: 'Window to' }).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.sim-readout', { hasText: 'Window' }).first().locator('dd')).toHaveText('2018–2020');
  await expect(page.locator('.chart-highlight')).toHaveCount(1);

  await page.goto('/#/explore/di-pie-charts');
  await expect(page.locator('.chart-pie-sector--selected')).toHaveCount(1);
  await expect(page.locator('.sim-readout', { hasText: 'Angle = share' }).locator('dd')).toHaveText('35 × 3.6° = 126°');

  await page.goto('/#/explore/di-tables');
  const tablets = page.locator('.sim-table tr', { hasText: 'Tablets' });
  await expect(tablets).toContainText('+125%');
  await page.getByRole('button', { name: 'Share of the total' }).click();
  await expect(tablets).toContainText('+10 pp');

  await page.goto('/#/explore/data-sufficiency');
  const left = page.locator('.sim-readout', { hasText: 'Possible values of x' }).locator('dd');
  await expect(left).toHaveText('21 values');
  await page.getByRole('group', { name: 'Statement (1)' }).getByRole('button', { name: 'On' }).click();
  await expect(left).toHaveText('−4, 4');
  await page.getByRole('group', { name: 'Statement (2)' }).getByRole('button', { name: 'On' }).click();
  await expect(left).toHaveText('4');
  await expect(page.locator('.sim-badge')).toHaveText('DS answer: C');
  expect(errors).toEqual([]);
});

test('reasoning simulations: seats fill in, the grid fills itself, the tree grows', async ({ page }) => {
  const errors = watchForErrors(page);

  await page.goto('/#/explore/seating-clues');
  const possible = page.locator('.sim-readout', { hasText: 'Arrangements still possible' }).locator('dd');
  await expect(possible).toHaveText('720');
  await page.getByRole('slider', { name: 'Clues applied' }).focus();
  await page.keyboard.press('End');
  await expect(possible).toHaveText('1');
  await expect(page.locator('.rp-token:not(.is-waiting)')).toHaveCount(6);
  await page.getByRole('group', { name: 'Add a clue that contradicts' }).getByRole('button', { name: 'On' }).click();
  await expect(possible).toHaveText('0');
  await expect(page.locator('.rp-clue.is-conflict')).toHaveCount(1);

  await page.goto('/#/explore/puzzle-grid');
  await page.locator('.sim-task', { hasText: 'Five floors' }).getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('.sim-readout', { hasText: 'Cells settled' }).locator('dd')).toHaveText('25 of 25');
  await expect(page.locator('.rp-cell.is-yes')).toHaveCount(5);

  await page.goto('/#/explore/family-tree');
  await page.locator('.sim-task', { hasText: 'how A is related to F' }).getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('.sim-readout', { hasText: 'How A is related to F' }).locator('dd')).toHaveText('A is F’s grandfather.');
  await expect(page.locator('.rp-node')).toHaveCount(6);
  expect(errors).toEqual([]);
});
