import { describe, expect, it } from 'vitest';
import levelsData from '../../data/levels.json';
import { isUnlocked, recordStars, starParts, starsFor, totalStars } from '../../src/game/levels';
import { Run } from '../../src/game/run';
import { solve } from '../../src/game/solver';
import type { LevelDef } from '../../src/game/types';
import { FEAST_HALF_WIDTH } from '../../src/render/guests';
import { CHEESES, DT, TUNE, VALAIS, steps } from './fixtures';

const LEVELS: LevelDef[] = levelsData;

/** A launched run of a level, the wheel put just before the finish line on an empty slope. */
function nearFinish(i: number, before = 200): Run {
  const r = new Run(TUNE, VALAIS, 0, false, LEVELS[i]);
  r.launch();
  r.terrain.obstacles.length = 0;
  r.m.x = r.finishX - before; r.m.y = r.terrain.groundAt(r.m.x) - r.m.r; r.m.vx = 600; r.m.vy = 0;
  return r;
}

describe('stars', () => {
  it('gives one star for the finish, one for half the potatoes, one for no slice lost', () => {
    expect(starParts({ won: true, potatoes: 10, total: 20, hits: 0 })).toEqual([true, true, true]);
    expect(starParts({ won: true, potatoes: 9, total: 20, hits: 0 })).toEqual([true, false, true]);
    expect(starParts({ won: true, potatoes: 20, total: 20, hits: 1 })).toEqual([true, true, false]);
    expect(starsFor({ won: true, potatoes: 0, total: 20, hits: 3 })).toBe(1);
  });

  it('gives no star to a level not finished, however well it went', () => {
    expect(starsFor({ won: false, potatoes: 20, total: 20, hits: 0 })).toBe(0);
  });

  it('opens a level once the one before it is done', () => {
    expect(isUnlocked([], 0)).toBe(true);
    expect(isUnlocked([], 1)).toBe(false);
    expect(isUnlocked([1], 1)).toBe(true);
    expect(isUnlocked([3, 0], 2)).toBe(false);
  });

  it('keeps the best stars of a level: a worse replay takes none away', () => {
    expect(recordStars([2], 0, 1)).toEqual([2]);
    expect(recordStars([2], 0, 3)).toEqual([3]);
    expect(recordStars([], 2, 1)).toEqual([0, 0, 1]);
    expect(totalStars([3, 2, 1])).toBe(6);
  });
});

describe('the levels', () => {
  it('get longer and harder one after the other', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].length).toBeGreaterThan(LEVELS[i - 1].length);
      expect(LEVELS[i].difficulty).toBeGreaterThanOrEqual(LEVELS[i - 1].difficulty);
    }
  });

  it('are the same mountain every time they are played', () => {
    const a = new Run(TUNE, VALAIS, 1, false, LEVELS[4]), b = new Run(TUNE, VALAIS, 999, false, LEVELS[4]);
    expect(b.terrain.gy).toEqual(a.terrain.gy);
    expect(b.terrain.obstacles).toEqual(a.terrain.obstacles);
    expect(b.potatoTotal).toBe(a.potatoTotal);
  });

  it('each lay potatoes, and only the obstacles they allow', () => {
    LEVELS.forEach(lv => {
      const r = new Run(TUNE, VALAIS, 0, false, lv);
      expect(r.potatoTotal).toBeGreaterThan(0);
      for (const o of r.terrain.obstacles) expect(lv.obstacles).toContain(o.t);
    });
  });

  it('leave the finish clear: nothing to dodge or pick up near the line or after it', () => {
    LEVELS.forEach(lv => {
      const r = new Run(TUNE, VALAIS, 0, false, lv), from = r.finishX - TUNE.finish.clearBefore;
      expect(r.terrain.obstacles.filter(o => o.x >= from)).toEqual([]);
      expect(r.terrain.potatoes.filter(p => p.x >= from + TUNE.spawn.potatoSpacing * TUNE.spawn.potatoRowMax)).toEqual([]);
      expect(r.terrain.powerups.filter(p => p.x >= from)).toEqual([]);
    });
  });

  it('lie flat after the finish line, for the feast', () => {
    const r = new Run(TUNE, VALAIS, 0, false, LEVELS[9]);
    for (let x = r.finishX + 200; x < r.tableX + 300; x += 40) expect(Math.abs(r.terrain.slopeAt(x))).toBeLessThan(0.05);
  });

  it('can all be finished without a single hit (the solver finds the way)', () => {
    LEVELS.forEach(lv => {
      const s = solve(TUNE, VALAIS, lv);
      expect({ level: lv.name, won: s.won, stuck: s.stuck }).toEqual({ level: lv.name, won: true, stuck: null });
    });
  }, 120000);
});

describe('the finish', () => {
  it('ends the level when the wheel crosses the line', () => {
    const r = nearFinish(0);
    r.drain();
    steps(r, 30);
    expect(r.state).toBe('won');
    expect(r.drain().map(e => e.type)).toContain('finish');
    expect(r.progress).toBe(1);
  });

  it('brings the wheel to a stop just before the feast table', () => {
    const r = nearFinish(3);
    steps(r, 60 * 6);
    expect(r.m.vx).toBeLessThan(1);
    expect(r.m.x).toBeLessThanOrEqual(r.tableX - TUNE.finish.stopBefore + 1);
    expect(r.m.x).toBeGreaterThan(r.tableX - TUNE.finish.stopBefore - 40);
  });

  it('stops the wheel clear of the table, whatever the cheese', () => {
    for (const c of CHEESES) {
      const r = new Run(TUNE, c, 0, false, LEVELS[0]);
      r.launch(); r.terrain.obstacles.length = 0;
      r.m.x = r.finishX - 200; r.m.y = r.terrain.groundAt(r.m.x) - r.m.r; r.m.vx = 900;
      steps(r, 60 * 6);
      expect(r.m.x + r.m.r, c.id).toBeLessThan(r.tableX - FEAST_HALF_WIDTH);
    }
  });

  it('takes no more jumps once the line is crossed', () => {
    const r = nearFinish(0);
    steps(r, 30);
    const jumps = r.stats.jumps;
    r.press(); r.update(DT); r.release(); steps(r, 10);
    expect(r.stats.jumps).toBe(jumps);
  });

  it('has no finish in a Quick Game', () => {
    const r = new Run(TUNE, VALAIS, 7);
    expect(r.finishX).toBe(Infinity);
    expect(r.progress).toBe(0);
  });
});
