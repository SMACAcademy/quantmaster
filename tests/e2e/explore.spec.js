/** Explore: interactive simulations, on their own pages, on topic pages and inside lessons. */

import { expect, test, watchForErrors } from './helpers.js';

test('the gallery lists the simulations and each one reacts to its sliders', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/explore');
  await expect(page.getByRole('heading', { name: 'Explore', level: 1 })).toBeVisible();
  await expect(page.locator('.sim-card')).toHaveCount(66);

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

test('the geometry pictures respond: angle pairs, a snapping quadrilateral, area, shaded regions, recasting', async ({ page }) => {
  const errors = watchForErrors(page);

  await page.goto('/#/topics/lines-angles/levels/lines-angles-level-0');
  await expect(page.locator('.lesson__block--simulation').getByRole('heading', { name: 'Parallel lines and a transversal' })).toBeVisible();

  // Parallel lines give two angle sizes; tilting the lower line makes four, and shows its slider.
  await page.goto('/#/explore/lines-angles');
  const sizes = page.locator('.sim-readout', { hasText: 'Different angle sizes' }).locator('dd');
  await expect(sizes).toHaveText('2: 60°, 120°');
  await expect(page.locator('.sim-geo-angle')).toHaveCount(4);
  await page.getByRole('button', { name: 'Tilt the lower line' }).click();
  await expect(page.getByRole('slider', { name: 'Tilt of the lower line' })).toBeVisible();
  await expect(sizes).toHaveText('4: 50°, 60°, 120°, 130°');

  await page.goto('/#/explore/quadrilaterals');
  const name = page.locator('.sim-readout', { hasText: 'Name' }).locator('dd');
  await expect(name).toHaveText('Parallelogram');
  await page.getByRole('group', { name: 'All four sides equal' }).getByRole('button', { name: 'Yes' }).click();
  await expect(name).toHaveText('Rhombus');
  await page.getByRole('group', { name: 'A right angle at A' }).getByRole('button', { name: 'Yes' }).click();
  await expect(name).toHaveText('Square');
  await expect(page.locator('.sim-right-mark')).toHaveCount(4);

  // A 24 m fence: 3 m long holds 27 m²; the 6 m square holds 36 m². The rectangle and its graph are stacked.
  await page.goto('/#/explore/perimeter-area');
  const area = page.locator('.sim-readout', { hasText: 'Area = l × w' }).locator('dd');
  await expect(area).toHaveText('27 m²');
  await page.getByRole('slider', { name: 'Length' }).focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await expect(area).toHaveText('36 m²');
  await expect(page.locator('.sim-stack svg.sim-plot')).toHaveCount(2);

  await page.goto('/#/explore/mensuration-2d');
  await page.locator('.sim-task', { hasText: '42 cm²' }).getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('.sim-readout', { hasText: 'Shaded = square − circle' }).locator('dd')).toHaveText('196 − 154 = 42 cm²');
  await expect(page.locator('.sim-geo-region')).toHaveCount(1);

  await page.goto('/#/explore/volume-surface-area');
  await page.locator('.sim-task', { hasText: 'twice its surface area' }).getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('.sim-readout', { hasText: 'Surface area grows' }).locator('dd')).toHaveText('× 2');
  await expect(page.locator('.sim-readout', { hasText: 'Each small sphere' }).locator('dd')).toHaveText('r = 3 cm');
  expect(errors).toEqual([]);
});
