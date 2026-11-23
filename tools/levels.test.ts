// npm run sim also runs this: the bot plays each Adventure level 20 times, at two skill levels,
// and prints how often it reaches the feast and the stars it gets. It prints; it never fails.
import { it } from 'vitest';
import config from '../data/config.json';
import cheeses from '../data/cheeses.json';
import levels from '../data/levels.json';
import { starsFor } from '../src/game/levels';
import { Run } from '../src/game/run';
import type { LevelDef, ObstacleType, Tune } from '../src/game/types';

const TUNE: Tune = config;

/** One attempt by a bot that times each jump from the physics, off by up to `error` seconds. */
export function attempt(level: LevelDef, seed: number, error: number): { won: boolean; progress: number; stars: number } {
  const r = new Run(TUNE, cheeses[0], 0, false, level);
  r.launch();
  let rand = seed * 7 + 1;
  const noise = (): number => { rand = (rand * 16807) % 2147483647; return rand / 2147483647; };
  let target = -1, slip = 0, hold = 0;
  const P = TUNE.physics;
  for (let i = 0; i < 60 * 300 && r.state === 'play'; i++) {
    const m = r.m, o = r.terrain.obstacles.find(o => !o.hit && !o.passed && o.x + 60 > m.x);
    if (o && o.x !== target) { target = o.x; slip = (noise() * 2 - 1) * error; }
    if (o && m.grounded && hold === 0) {
      const d = TUNE.obstacles[o.t as ObstacleType];
      const need = d.h + m.r * 0.8 - (r.terrain.groundAt(o.x) - r.terrain.groundAt(m.x));
      const disc = P.jump * P.jump - 2 * P.gravity * Math.max(0, need);
      const rise = disc > 0 ? (P.jump - Math.sqrt(disc)) / P.gravity : 0.43;
      if (o.x - (m.x + m.r * 0.8) <= m.vx * (rise + 0.1 + slip)) { r.press(); hold = d.h > 40 ? 40 : 8; }
    }
    if (hold > 0 && --hold === 0) r.release();
    r.update(1 / 60);
  }
  const won = r.state === 'won';
  return { won, progress: r.progress, stars: starsFor({ won, potatoes: r.stats.potatoes, total: r.potatoTotal, hits: r.stats.hits }) };
}

it('prints how the bot does on each level', () => {
  const rows: string[] = [];
  (levels as LevelDef[]).forEach((lv, i) => {
    const cells = ([['good', 0.05], ['average', 0.1]] as const).map(([name, err]) => {
      const tries = Array.from({ length: 20 }, (_, k) => attempt(lv, 100 + k, err));
      const wins = tries.filter(t => t.won).length;
      const avgProg = Math.round(100 * tries.reduce((n, t) => n + t.progress, 0) / tries.length);
      const stars = tries.filter(t => t.won).map(t => t.stars);
      return `${name} ${String(wins * 5).padStart(3)}% won, ${String(avgProg).padStart(3)}% along, stars ${stars.length ? (stars.reduce((a, b) => a + b, 0) / stars.length).toFixed(1) : '-'}`;
    });
    rows.push(`${String(i + 1).padStart(2)} ${lv.name.padEnd(22)} ${String(lv.length).padStart(4)} m | ${cells.join(' | ')}`);
  });
  process.stdout.write('\n' + rows.join('\n') + '\n');
});
