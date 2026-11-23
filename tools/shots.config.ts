// npx playwright test --config tools/shots.config.ts: a screenshot of every screen, on a phone held
// sideways and in portrait, into qa/evidence/. Needs npm run build:single first.
import base from '../playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({ ...base, testDir: '.', testMatch: '*.spec.ts' });
