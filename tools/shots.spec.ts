// A screenshot of every screen, driven through window.game (src/hook.ts). See shots.config.ts.
import { test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = (q: string): string => `${pathToFileURL(resolve('dist-single/index.html')).href}?manual=1&${q}`;
const out = (name: string): string => resolve('qa/evidence', `${name}.png`);

async function open(page: Page, q: string): Promise<void> {
  await page.goto(url(q));
  await page.waitForFunction(() => typeof window.game?.step === 'function');
  await page.waitForFunction(() => document.fonts.check(`20px 'Lilita One'`) && document.fonts.check(`600 20px 'Fredoka'`));
}
const step = (page: Page, n: number): Promise<void> => page.evaluate(k => window.game!.step(k), n);

/** Presses a button of the screen by its id. */
const tap = (page: Page, id: string): Promise<void> => page.evaluate(i => {
  (window.game!.state as { ui: { buttons: { id: string; action: () => void }[] } }).ui.buttons.find(b => b.id === i)!.action();
}, id);

/** Puts the wheel `before` units ahead of the finish line of the level being played. */
const nearFinish = (page: Page, before: number): Promise<void> => page.evaluate(b => {
  const a = window.game!.state as { run: { finishX: number; m: { x: number; y: number; vx: number; r: number }; terrain: { groundAt(x: number): number; obstacles: unknown[] } } };
  a.run.terrain.obstacles.length = 0;
  a.run.m.x = a.run.finishX - b; a.run.m.y = a.run.terrain.groundAt(a.run.m.x) - a.run.m.r; a.run.m.vx = 600;
}, before);

for (const [tag, w, h] of [['phone', 844, 390], ['portrait', 390, 844], ['desktop', 1280, 720]] as const) {
  test(`screens ${tag}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await open(page, 'seed=11&tutorial=0&lang=fr');
    await step(page, 30);
    await page.screenshot({ path: out(`${tag}-title`) });

    // a Quick Game: jump at every obstacle with a little bot, then look mid-run
    await tap(page, 'quick');
    await page.evaluate(() => {
      const g = window.game!;
      type A = { run: { m: { x: number; vx: number }; terrain: { obstacles: { x: number; hit: boolean; passed: boolean }[] } } };
      for (let i = 0; i < 60 * 9; i++) {
        const a = g.state as A, m = a.run.m;
        const o = a.run.terrain.obstacles.find(o => !o.hit && !o.passed && o.x > m.x);
        g.hold('Space', !!o && o.x - m.x < 40 + m.vx * 0.12);
        g.step(1, false);
      }
      g.step(1);
    });
    await page.screenshot({ path: out(`${tag}-play`) });
    await page.evaluate(() => { window.game!.press('Escape'); window.game!.step(25); });
    await page.screenshot({ path: out(`${tag}-pause`) });
    // back to the run, then roll into everything until the wheel breaks
    await page.evaluate(() => { const g = window.game!; g.press('Enter'); g.step(25); for (let i = 0; i < 60 * 90 && g.scene === 'play'; i++) g.step(1, false); g.step(90); });
    await page.screenshot({ path: out(`${tag}-over`) });
  });

  test(`adventure ${tag}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    // the level list, with a few levels done
    await open(page, 'tutorial=0&lang=fr');
    await step(page, 30);
    await page.evaluate(() => { (window.game!.state as { save: { stars: number[] } }).save.stars = [3, 2, 1, 2]; });
    await tap(page, 'adventure'); await step(page, 30);
    await page.screenshot({ path: out(`${tag}-levels`) });
    // a level in play: the progress bar
    await open(page, 'tutorial=0&lang=fr&level=5');
    await step(page, 60 * 4);
    await page.screenshot({ path: out(`${tag}-level-play`) });
    // the finish: the wheel crosses the line, the guests cheer
    await nearFinish(page, 180);
    await step(page, 100);
    await page.screenshot({ path: out(`${tag}-feast`) });
    await step(page, 60 * 3);
    await step(page, 90);
    await page.screenshot({ path: out(`${tag}-level-won`) });
    // a level lost
    await open(page, 'tutorial=0&lang=fr&level=6');
    await page.evaluate(() => { const g = window.game!; for (let i = 0; i < 60 * 90 && g.scene === 'play'; i++) g.step(1, false); g.step(60); });
    await page.screenshot({ path: out(`${tag}-level-lost`) });
  });

  test(`menus ${tag}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await open(page, 'scene=shop&tutorial=0&lang=fr');
    await step(page, 30);
    await page.screenshot({ path: out(`${tag}-shop`) });
    await page.evaluate(() => { const g = window.game!; g.press('ArrowRight'); g.step(10); });
    await page.screenshot({ path: out(`${tag}-shop-tomme`) });
    await open(page, 'scene=missions&lang=fr');
    await step(page, 30);
    await page.screenshot({ path: out(`${tag}-missions`) });
    await open(page, 'scene=settings&lang=en');
    await step(page, 30);
    await page.screenshot({ path: out(`${tag}-settings-en`) });
    // the tutorial: roll until the first hint
    await open(page, 'seed=3&tutorial=1&lang=fr');
    await step(page, 30);
    await tap(page, 'quick');
    await page.evaluate(() => { const g = window.game!; for (let i = 0; i < 600; i++) { g.step(1, false); if ((g.state as { run: { hint: string | null } }).run.hint) break; } g.step(20); });
    await page.screenshot({ path: out(`${tag}-tutorial`) });
  });
}

test.describe('iPhone', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  test('the home-screen help', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.addInitScript(() => {
      for (const k of ['fullscreenEnabled', 'webkitFullscreenEnabled']) Object.defineProperty(Document.prototype, k, { get: () => false });
    });
    await open(page, 'tutorial=0&lang=fr');
    await step(page, 30);
    await tap(page, 'fullscreen'); await step(page, 30);
    await page.screenshot({ path: out('iphone-homescreen-help') });
  });
});
