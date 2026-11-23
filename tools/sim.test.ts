// npm run sim: a bot plays runs at three skill levels and prints what they earn, to check the
// shop's prices and the missions' targets against real runs. It prints observations; it does not
// judge them, so it never fails.
import { it } from 'vitest';
import config from '../data/config.json';
import cheeses from '../data/cheeses.json';
import { Run } from '../src/game/run';
import type { ObstacleType, Tune } from '../src/game/types';

const TUNE: Tune = config;

/**
 * One run by a bot that times each jump from the physics (the time to rise over the obstacle),
 * and is off by up to `error` seconds: a beginner is off by more.
 */
function play(seed: number, error: number): { meters: number; potatoes: number; time: number; hits: number } {
  const r = new Run(TUNE, cheeses[0], seed);
  r.launch();
  let rand = seed * 7 + 1;
  const noise = (): number => { rand = (rand * 16807) % 2147483647; return rand / 2147483647; };
  let target = -1, slip = 0, hold = 0;
  const P = TUNE.physics;
  for (let i = 0; i < 60 * 600 && r.state === 'play'; i++) {
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
  return { meters: r.stats.meters, potatoes: r.stats.potatoes, time: r.time, hits: r.stats.hits };
}

it('prints what runs earn', () => {
  const rows: string[] = [];
  for (const [name, error] of [['beginner', 0.16], ['average', 0.1], ['good', 0.05]] as const) {
    const runs = Array.from({ length: 40 }, (_, i) => play(1000 + i, error));
    const avg = (f: (x: typeof runs[number]) => number): number => Math.round(runs.reduce((n, x) => n + f(x), 0) / runs.length);
    rows.push(`${name.padEnd(9)} meters ${avg(x => x.meters)}  potatoes ${avg(x => x.potatoes)}  seconds ${avg(x => x.time)}  best ${Math.max(...runs.map(x => x.meters))}`);
  }
  process.stdout.write('\n' + rows.join('\n') + '\n');
});
