// Playwright: the single-file build opened from disk, driven through window.game (src/hook.ts).
// npm run smoke runs only the @boot test.
import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const build = (query: string): string => `${pathToFileURL(resolve('dist-single/index.html')).href}?${query}`;

/** Opens the build with a clean save and collects every page error. */
async function open(page: Page, query: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(build(query));
  await page.evaluate(() => localStorage.clear());
  await page.goto(build(query));
  await expect.poll(() => page.evaluate(() => typeof window.game?.step)).toBe('function');
  return errors;
}

type AppView = { scene: string; run: { meters: number; state: string; tutorial: boolean; m: { x: number; vx: number };
  terrain: { obstacles: { x: number; hit: boolean; passed: boolean }[] } }; save: { bank: number; best: number; runs: number; tutorialDone: boolean };
  ui: { buttons: { id: string; action: () => void; disabled?: boolean }[] } };

test('boots to the title screen with no errors @boot', async ({ page }) => {
  const errors = await open(page, 'manual=1');
  await page.evaluate(() => window.game!.step(10));
  expect(await page.evaluate(() => window.game!.scene)).toBe('title');
  const size = await page.locator('#game').boundingBox();
  expect(size && size.width > 0 && size.height > 0).toBe(true);
  expect(errors).toEqual([]);
});

test('the Quick Game button starts a run that rolls down the mountain', async ({ page }) => {
  await open(page, 'manual=1&seed=5&tutorial=0');
  const r = await page.evaluate(() => {
    const g = window.game!; g.step(30); (g.state as AppView).ui.buttons.find(b => b.id === 'quick')!.action(); g.step(120);
    const a = g.state as AppView;
    return { scene: g.scene, meters: a.run.meters, state: a.run.state };
  });
  expect(r).toEqual({ scene: 'play', meters: expect.any(Number), state: 'play' });
  expect(r.meters).toBeGreaterThan(50);
});

test('a broken wheel ends the run, pays its potatoes and saves', async ({ page }) => {
  await open(page, 'manual=1&seed=5&tutorial=0');
  const r = await page.evaluate(() => {
    const g = window.game!; g.step(30); (g.state as AppView).ui.buttons.find(b => b.id === 'quick')!.action();
    for (let i = 0; i < 60 * 120 && g.scene === 'play'; i++) g.step(1, false);
    g.step(10);
    const a = g.state as AppView;
    return { scene: g.scene, best: a.save.best, runs: a.save.runs, saved: JSON.parse(localStorage.getItem('raclette_rush') || '{}') };
  });
  expect(r.scene).toBe('over');
  expect(r.runs).toBe(1);
  expect(r.best).toBeGreaterThan(0);
  expect(r.saved.best).toBe(r.best);
});

test('the first run is the tutorial, and it is remembered once done', async ({ page }) => {
  await open(page, 'manual=1&seed=5');
  const r = await page.evaluate(() => {
    const g = window.game!; g.step(30); (g.state as AppView).ui.buttons.find(b => b.id === 'quick')!.action();
    const a = g.state as AppView & { run: { hint: string | null } };
    const first = a.run.tutorial;
    for (let i = 0; i < 60 * 40 && a.run.tutorial; i++) { g.hold('Space', !!a.run.hint); g.step(1, false); }
    return { first, done: a.save.tutorialDone };
  });
  expect(r).toEqual({ first: true, done: true });
});

test('a tap on the settings gear opens the settings, and a tap on a row changes it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page, 'lang=fr');
  await page.waitForTimeout(500);
  const gear = await page.evaluate(() => (window.game!.state as { ui: { buttons: { id: string; x: number; y: number; w: number; h: number }[] } }).ui.buttons.find(b => b.id === 'settings')!);
  await page.mouse.click(gear.x + gear.w / 2, gear.y + gear.h / 2);
  await expect.poll(() => page.evaluate(() => window.game!.scene)).toBe('settings');
  await page.waitForTimeout(400);
  const row = await page.evaluate(() => (window.game!.state as { ui: { buttons: { id: string; x: number; y: number; w: number; h: number }[] } }).ui.buttons.find(b => b.id === 'music')!);
  await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('raclette_rush') || '{}').settings?.music)).toBe(false);
});

test('the Adventure: level 2 is locked until level 1 is finished, which gives stars', async ({ page }) => {
  await open(page, 'manual=1&tutorial=0&level=1');
  const r = await page.evaluate(() => {
    const g = window.game!;
    type Lv = AppView & { run: { finishX: number; m: { x: number; y: number; vx: number; r: number }; terrain: { groundAt(x: number): number } };
      save: { stars: number[] }; summary: { level: { won: boolean; best: number } | null } };
    const a = g.state as Lv;
    // the wheel put just before the line, then the feast plays out
    a.run.terrain.obstacles.length = 0;
    a.run.m.x = a.run.finishX - 150; a.run.m.y = a.run.terrain.groundAt(a.run.m.x) - a.run.m.r; a.run.m.vx = 500;
    for (let i = 0; i < 60 * 6 && g.scene === 'play'; i++) g.step(1, false);
    g.step(30);
    const end = { scene: g.scene, won: a.summary.level?.won, stars: a.save.stars[0] };
    a.ui.buttons.find(b => b.id === 'levels')!.action(); g.step(30);
    const lv = (id: string): boolean | undefined => a.ui.buttons.find(b => b.id === id)?.disabled;
    return { ...end, scene2: g.scene, level2Locked: lv('level1'), level3Locked: lv('level2') };
  });
  expect(r).toEqual({ scene: 'over', won: true, stars: expect.any(Number), scene2: 'levels', level2Locked: false, level3Locked: true });
  expect(r.stars).toBeGreaterThanOrEqual(1);
});
