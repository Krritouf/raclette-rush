// Opens the built art sheet and writes its canvases as PNG: the sheets into design/art/, the app icons into public/.
import { test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('renders the art sheet', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(resolve('tools/art/dist/index.html')).href);
  await page.waitForFunction(() => (window as unknown as { artReady?: boolean }).artReady === true, null, { timeout: 20000 });
  const version = process.env.ART_VERSION ?? 'v1';
  const friends = process.env.FRIENDS_VERSION ?? 'v1';
  for (const id of ['sheet', 'scene', 'friends']) {
    const data = await page.evaluate(i => (document.getElementById(i) as HTMLCanvasElement).toDataURL('image/png'), id);
    const name = id === 'sheet' ? `planche-${version}.png` : id === 'scene' ? `scene-${version}.png` : `convives-${friends}.png`;
    writeFileSync(resolve('design/art', name), Buffer.from(data.split(',')[1], 'base64'));
  }
  // the app icons, for a web app added to the home screen (public/, copied into dist/)
  for (const n of [512, 180]) {
    const data = await page.evaluate(i => (document.getElementById(i) as HTMLCanvasElement).toDataURL('image/png'), `icon${n}`);
    writeFileSync(resolve('public', `icon-${n}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
  if (errors.length) throw new Error(errors.join('\n'));
});
