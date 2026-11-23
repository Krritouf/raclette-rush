// Opens the built art sheet and writes its two canvases as PNG into design/art/.
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
  for (const id of ['sheet', 'scene']) {
    const data = await page.evaluate(i => (document.getElementById(i) as HTMLCanvasElement).toDataURL('image/png'), id);
    const name = id === 'sheet' ? `planche-${version}.png` : `scene-${version}.png`;
    writeFileSync(resolve('design/art', name), Buffer.from(data.split(',')[1], 'base64'));
  }
  if (errors.length) throw new Error(errors.join('\n'));
});
