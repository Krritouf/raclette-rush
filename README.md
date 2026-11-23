# Raclette Rush

A cheese wheel races down the mountain: one button, jump. Vite + TypeScript, Canvas 2D,
Web Audio. The original one-file prototype is kept in `prototype/`.

Every command runs in this folder.

| Command | What it does |
|---------|--------------|
| `npm run dev` | The game on a local server, reloaded on every change |
| `npm run build` | `dist/`: the build to ship (and to wrap for Android) |
| `npm run build:single` | `dist-single/index.html`: the whole game in one file |
| `npm run test:unit` | Vitest: terrain, run, missions, save, translations |
| `npm run test:e2e` | Playwright on the single file: boot, a run, the tutorial, the settings |
| `npm run smoke` | The boot check alone |
| `npm run sim` | The balance bot: distance and potatoes per run |
| `npx playwright test --config tools/shots.config.ts` | Screenshots of every screen into `qa/evidence/` |

## Layout

```text
data/         every gameplay value: config.json, cheeses.json, missions.json
design/       game-brief.md
src/game/     the rules, with no drawing: terrain, run, missions, save, rng
src/render/   the world and the shapes (Canvas 2D paths, no image files)
src/screens.ts, src/ui.ts   the menus and the HUD
src/main.ts   the loop, input, sound and save, put together
tests/        unit/ (Vitest) and integration/ (Playwright)
tools/        the balance bot, the screenshots
```

## Address options (for tests)

`?manual=1` (only `window.game.step()` moves the game), `?seed=<n>`, `?tutorial=0|1`,
`?lang=fr|en`, `?scene=shop|missions|settings|play`.
