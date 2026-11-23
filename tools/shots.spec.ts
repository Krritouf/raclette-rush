// A screenshot of every screen, driven through window.game (src/hook.ts). See shots.config.ts.
import { test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = (q: string): string => `${pathToFileURL(resolve('dist-single/index.html')).href}?manual=1&${q}`;
const out = (name: string): string => resolve('qa/evidence', `${name}.png`);

async function open(page: Page, q: string): Promise<void> {
  await page.goto(url(q));
  await page.waitForFunction(() => typeof window.game?.step === 'function');
}
const step = (page: Page, n: number): Promise<void> => page.evaluate(k => window.game!.step(k), n);

for (const [tag, w, h] of [['phone', 844, 390], ['portrait', 390, 844], ['desktop', 1280, 720]] as const) {
  test(`screens ${tag}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const lang = 'lang=fr';
    await open(page, `seed=11&tutorial=0&${lang}`);
    await step(page, 30);
    await page.screenshot({ path: out(`${tag}-title`) });

    // a run: jump at every obstacle with a little bot, then look mid-run
    await page.evaluate(() => {
      const g = window.game!; g.press('Enter');
    });
    await page.evaluate(() => {
      const g = window.game!;
      type A = { run: { m: { x: number; vx: number }; terrain: { obstacles: { x: number; hit: boolean; passed: boolean }[] } } };
      for (let i = 0; i < 60 * 9; i++) {
        const a = g.state as A, m = a.run.m;
        const o = a.run.terrain.obstacles.find(o => !o.hit && !o.passed && o.x > m.x);
        if (o && o.x - m.x < 40 + m.vx * 0.12) g.hold('Space', true); else g.hold('Space', false);
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
    await page.evaluate(() => { const g = window.game!; g.step(30); g.press('Enter'); for (let i = 0; i < 600; i++) { g.step(1, false); if ((g.state as { run: { hint: string | null } }).run.hint) break; } g.step(20); });
    await page.screenshot({ path: out(`${tag}-tutorial`) });
  });
}
