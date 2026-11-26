/** Moving progress between devices: export a file on one, import and merge it on another. */

import { expect, seedProgress, test, todayKey, watchForErrors } from './helpers.js';

const yesterday = () => todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

/** Progress from one device: XP on one day, a mistake, and an achievement. */
const deviceProgress = ({ xp, day, mistake, achievement }) => ({
  xp: { total: xp, byDay: { [day]: xp } },
  stats: { questionsAnswered: 10, correctAnswers: 8 },
  streak: { current: 1, longest: 1, lastPracticeDay: day, days: {}, freezes: 1, frozenDays: [], lost: null },
  questions: { [mistake]: { questionId: mistake, attempts: 1, timesWrong: 1, timesCorrect: 0, resolved: false, lastAttemptAt: new Date().toISOString() } },
  achievements: { [achievement]: { unlockedAt: new Date().toISOString() } }
});

const xpPill = (page) => page.locator('.stat-pill--xp');

test('progress exported on one device merges into another, keeping both', async ({ browser }, testInfo) => {
  // The laptop practised yesterday: 120 XP, one mistake.
  const laptopContext = await browser.newContext({ acceptDownloads: true });
  await seedProgress(laptopContext, deviceProgress({ xp: 120, day: yesterday(), mistake: 'trains-q-001', achievement: 'first-steps' }));
  const laptop = await laptopContext.newPage();
  await laptop.goto('/#/settings');
  const [download] = await Promise.all([laptop.waitForEvent('download'), laptop.getByRole('button', { name: 'Export' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^quantmaster-progress-\d{4}-\d{2}-\d{2}\.json$/);
  const file = testInfo.outputPath('laptop.json');
  await download.saveAs(file);

  // The phone practised today: 45 XP, a different mistake.
  const phoneContext = await browser.newContext();
  await seedProgress(phoneContext, deviceProgress({ xp: 45, day: todayKey(), mistake: 'boats-streams-q-001', achievement: 'error-hunter' }));
  const phone = await phoneContext.newPage();
  const errors = watchForErrors(phone);
  await phone.goto('/#/settings');
  await expect(xpPill(phone)).toContainText('45');

  const [chooser] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Import' }).click()]);
  await chooser.setFiles(file);
  const dialog = phone.getByRole('dialog', { name: 'Import progress' });
  await expect(dialog).toContainText('This device');
  await expect(dialog).toContainText('45 XP');
  await expect(dialog).toContainText('120 XP');
  await dialog.getByRole('button', { name: 'Merge' }).click();

  await expect(phone.getByText('Progress merged')).toBeVisible();
  await expect(xpPill(phone)).toContainText('165'); // different days: both count
  const saved = await phone.evaluate(() => JSON.parse(localStorage.getItem('quantmaster:v1:progress')));
  expect(Object.keys(saved.questions).sort()).toEqual(['boats-streams-q-001', 'trains-q-001']);
  expect(Object.keys(saved.achievements).sort()).toEqual(['error-hunter', 'first-steps']);
  expect(saved.streak.lastPracticeDay).toBe(todayKey());

  // Importing the same file again changes nothing.
  const [again] = await Promise.all([phone.waitForEvent('filechooser'), (await phone.goto('/#/settings'), phone.getByRole('button', { name: 'Import' }).click())]);
  await again.setFiles(file);
  await phone.getByRole('dialog', { name: 'Import progress' }).getByRole('button', { name: 'Merge' }).click();
  await expect(xpPill(phone)).toContainText('165');

  expect(errors).toEqual([]);
  await laptopContext.close();
  await phoneContext.close();
});

test('replace swaps this device\'s progress for the file\'s', async ({ browser }, testInfo) => {
  const fileContext = await browser.newContext({ acceptDownloads: true });
  await seedProgress(fileContext, deviceProgress({ xp: 300, day: todayKey(), mistake: 'trains-q-001', achievement: 'first-steps' }));
  const source = await fileContext.newPage();
  await source.goto('/#/settings');
  const [download] = await Promise.all([source.waitForEvent('download'), source.getByRole('button', { name: 'Export' }).click()]);
  const file = testInfo.outputPath('backup.json');
  await download.saveAs(file);

  const context = await browser.newContext();
  await seedProgress(context, deviceProgress({ xp: 45, day: todayKey(), mistake: 'boats-streams-q-001', achievement: 'error-hunter' }));
  const page = await context.newPage();
  await page.goto('/#/settings');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import' }).click()]);
  await chooser.setFiles(file);
  await page.getByRole('dialog', { name: 'Import progress' }).getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByText('Progress replaced')).toBeVisible();
  await expect(xpPill(page)).toContainText('300');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('quantmaster:v1:progress')));
  expect(Object.keys(saved.questions)).toEqual(['trains-q-001']);

  await fileContext.close();
  await context.close();
});
