// Playwright runs tests/integration/ against dist-single/index.html, opened from
// disk: no dev server and no port (npm run test:e2e builds it first).
import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// The browser the checks use: PAGE_SHOT_BROWSER if set, else an installed Chrome or Edge,
// else Playwright's own (npx playwright install chromium-headless-shell).
function checkBrowser(): string | undefined {
  if (process.env.PAGE_SHOT_BROWSER) return process.env.PAGE_SHOT_BROWSER;
  const pf = process.env.ProgramFiles ?? 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
  const local = process.env.LOCALAPPDATA ?? '';
  return [
    join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find(p => existsSync(p));
}

export default defineConfig({
  testDir: 'tests/integration',
  forbidOnly: !!process.env.CI,
  use: {
    viewport: { width: 1280, height: 720 },
    launchOptions: { executablePath: checkBrowser() },
  },
});
