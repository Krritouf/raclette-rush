// npm run art: renders the art sheet to design/art/ (see render.spec.ts).
import base from '../../playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({ ...base, testDir: '.', testMatch: 'render.spec.ts' });
