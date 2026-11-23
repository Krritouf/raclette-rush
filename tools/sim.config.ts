import { defineConfig } from 'vitest/config';

// npm run sim: the balance bot (tools/sim.test.ts), apart from the unit tests.
export default defineConfig({ test: { include: ['tools/sim.test.ts', 'tools/levels.test.ts'] } });
