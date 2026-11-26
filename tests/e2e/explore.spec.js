/** Explore: interactive simulations, on their own pages, on topic pages and inside lessons. */

import { expect, test, watchForErrors } from './helpers.js';

test('the gallery lists the simulations and each one reacts to its sliders', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/#/explore');
  await expect(page.getByRole('heading', { name: 'Explore', level: 1 })).toBeVisible();
  await expect(page.locator('.sim-card')).toHaveCount(84);

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

test('the topics that only borrowed a picture have their own: BODMAS, estimates, trees, sets, caselets, radar, races, wages, roots', async ({ page }) => {
  const errors = watchForErrors(page);
  const value = (label) => page.locator('.sim-readout', { hasText: label }).locator('dd');

  // Each one is the first simulation in its topic's first lesson.
  await page.goto('/#/topics/races/levels/races-level-0');
  await expect(page.locator('.lesson__block--simulation').first().getByRole('heading', { name: 'A beats B by x metres' })).toBeVisible();

  // BODMAS collapses 8 + 6 × 3 − 4 ÷ 2 to 24; the wrong order gives 19.
  await page.goto('/#/explore/bodmas-stack');
  await expect(page.locator('.sim-steps__token.is-next')).toHaveText(['6', '×', '3']);
  await page.getByRole('slider', { name: 'Operations done' }).focus();
  await page.keyboard.press('End');
  await expect(page.locator('.sim-steps__result')).toHaveText('= 24');
  await page.getByRole('button', { name: 'A common mistake' }).click();
  await expect(page.locator('.sim-steps__result')).toHaveText('= 19');

  // Rounding one up and one down: only 1,050 is left inside the band.
  await page.goto('/#/explore/estimate-band');
  await expect(value('Options inside the band')).toHaveText('1,050, 1,100');
  await page.locator('.sim-task', { hasText: 'under 0.5%' }).getByRole('button', { name: 'Show me' }).click();
  await expect(value('Options inside the band')).toHaveText('1,050');

  // And multiplies, or adds.
  await page.goto('/#/explore/choice-tree');
  await expect(page.locator('svg.sim-plot .sim-tree-edge')).toHaveCount(3 + 6);
  await page.getByRole('button', { name: 'One item in all (or)' }).click();
  await expect(page.locator('svg.sim-plot .sim-tree-edge')).toHaveCount(5);
  await expect(value('Ends of the tree')).toHaveText('5');

  // Twelve numbers in two sets of multiples, then the power set doubling.
  await page.goto('/#/explore/set-elements');
  await expect(page.locator('.sim-set-dot')).toHaveCount(12);
  await expect(value('n(A ∪ B)')).toHaveText('6 + 4 − 2 = 8');
  await page.getByRole('button', { name: 'Power set' }).click();
  await page.getByRole('slider', { name: 'Elements in S' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.sim-subsets__rows .sim-subsets__item')).toHaveCount(8);
  await expect(page.locator('.sim-subsets__rows .sim-subsets__item.is-fresh')).toHaveCount(4);

  // A caselet fills its table; leaving a fact out leaves cells that can never be found.
  await page.goto('/#/explore/caselet-table');
  await page.locator('.sim-task', { hasText: 'four cells' }).getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('.sim-table td.is-derived')).toHaveCount(9);
  await expect(page.locator('.sim-table td.is-given')).toHaveCount(3);
  await page.getByRole('button', { name: '"Arts has 100 fewer"' }).click();
  await expect(page.locator('.sim-table td', { hasText: 'cannot be found' })).toHaveCount(6);

  // Radar to bars: same marks, no shape.
  await page.goto('/#/explore/radar-or-bars');
  await expect(page.locator('.chart-radar-shape')).toHaveCount(2);
  await page.getByRole('button', { name: 'Grouped bars' }).click();
  await expect(page.locator('.sim-figure--chart .chart-bar')).toHaveCount(10);
  await expect(value('Totals')).toHaveText('Asha 360 · Ravi 350');

  // A beats B by 10 m; a 10 m start makes a dead heat.
  await page.goto('/#/explore/race-track');
  await expect(value('Result')).toHaveText('A beats B by 10 m (1.11 s)');
  await page.locator('.sim-task', { hasText: 'dead heat' }).getByRole('button', { name: 'Show me' }).click();
  await expect(value('Result')).toHaveText('Dead heat');

  // Wages by work: 3 : 2, not 50 : 50; B leaving after 3 days earns ₹600.
  await page.goto('/#/explore/wage-split');
  await expect(value('Wages by work done')).toHaveText('A ₹1,800 · B ₹1,200');
  await page.locator('.sim-task', { hasText: 'leaves after 3 days' }).getByRole('button', { name: 'Show me' }).click();
  await expect(value('Wages by work done')).toHaveText('A ₹2,400 · B ₹600');

  // Roots on two lines: interleaving roots give no relation.
  await page.goto('/#/explore/compare-roots');
  await expect(page.locator('.sim-badge')).toHaveText('x > y');
  await page.locator('.sim-task', { hasText: 'interleave' }).getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('.sim-badge')).toHaveText('Cannot be established');
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

test('CAT and placement pictures: a flat bottom, the remainder as a height, lattice points, a letter sum', async ({ page }) => {
  const errors = watchForErrors(page);
  const value = (label) => page.locator('.sim-readout', { hasText: label }).locator('dd');

  // Each one is in its topic's first lesson.
  await page.goto('/#/topics/modulus/levels/modulus-level-0');
  await expect(page.locator('.lesson__block--simulation').first().getByRole('heading', { name: 'Modulus as distance, and the flat bottom' })).toBeVisible();

  // |x + 1| + |x − 3| is least (4) all the way from −1 to 3; at that level there are infinitely many solutions.
  await page.goto('/#/explore/modulus-distance');
  await expect(value('Least value of f')).toHaveText('4, for every x from −1 to 3');
  await page.locator('.sim-task', { hasText: 'infinitely many' }).getByRole('button', { name: 'Show me' }).click();
  await expect(value('Solutions of f(x) = 4')).toContainText('infinitely many');
  await page.getByRole('button', { name: '|x − a|', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'b', exact: true })).toHaveCount(0);

  // The remainder on dividing by (x − 2) is the curve's height there; x − 1 is a factor of x³ − 2x² − 5x + 6.
  await page.goto('/#/explore/remainder-curve');
  await expect(value('Remainder on dividing by (x − 2)')).toHaveText('p(2) = −6');
  await page.locator('.sim-task', { hasText: 'a factor' }).getByRole('button', { name: 'Show me' }).click();
  await expect(value('Remainder on dividing by (x − 1)')).toHaveText('p(1) = 0');
  await expect(page.locator('.sim-table td.is-derived').last()).toContainText('0');

  // 3x + 5y = 47 has three positive solutions; 2x + 3y = 31 has five.
  await page.goto('/#/explore/lattice-line');
  await expect(value('How many')).toHaveText('3');
  await expect(page.locator('.sim-lattice-point')).toHaveCount(3);
  await page.locator('.sim-task', { hasText: 'exactly five' }).getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('.sim-lattice-point')).toHaveCount(5);

  // SIX + SIX = HILL: work every column and each letter has one digit left.
  await page.goto('/#/explore/column-solver');
  await expect(page.locator('.sim-crypt__cands tr.is-fixed')).toHaveCount(0);
  await page.getByRole('slider', { name: 'Columns worked (from the right)' }).focus();
  await page.keyboard.press('End');
  await expect(page.locator('.sim-crypt__cands tr.is-fixed')).toHaveCount(5);
  await expect(value('Letters with one digit left')).toHaveText('S = 8, I = 7, X = 2, H = 1, L = 4');
  expect(errors).toEqual([]);
});
