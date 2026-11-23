import { describe, expect, it } from 'vitest';
import { Run } from '../../src/game/run';
import type { PowerType } from '../../src/game/types';
import { CHEESES, DT, TUNE, VALAIS, emptySlope, launched, placeObstacle, steps } from './fixtures';

/** The wheel's height above the ground. */
const height = (r: Run): number => r.terrain.groundAt(r.m.x) - r.m.r - r.m.y;

describe('Run: rolling and jumping', () => {
  it('waits at the top until launched, then rolls downhill', () => {
    const r = new Run(TUNE, VALAIS, 42);
    steps(r, 60);
    expect(r.m.x).toBe(TUNE.terrain.startX);
    r.launch();
    expect(r.drain()).toEqual([{ type: 'launch' }]);
    steps(r, 120);
    expect(r.m.x).toBeGreaterThan(TUNE.terrain.startX + 300);
    expect(r.meters).toBeGreaterThan(30);
  });

  it('keeps the wheel on the ground while it rolls', () => {
    const r = launched(); emptySlope(r);
    steps(r, 30);
    expect(r.m.grounded).toBe(true);
    expect(Math.abs(height(r))).toBeLessThan(r.m.r);
  });

  it('jumps on a press, and a long press goes higher than a tap', () => {
    const peak = (hold: number): number => {
      const r = launched(); emptySlope(r); steps(r, 20);
      r.press();
      let best = 0;
      for (let i = 0; i < 90; i++) {
        if (i === hold) r.release();
        r.update(DT);
        best = Math.max(best, height(r));
      }
      return best;
    };
    const tap = peak(1), long = peak(60);
    expect(tap).toBeGreaterThan(20);
    expect(long).toBeGreaterThan(tap * 1.5);
  });

  it('counts the jumps and reports them', () => {
    const r = launched(); emptySlope(r); steps(r, 10); r.drain();
    r.press(); r.update(DT); r.release();
    expect(r.stats.jumps).toBe(1);
    expect(r.drain().some(e => e.type === 'jump')).toBe(true);
  });

  it('remembers a press made just before landing (jump buffer)', () => {
    const r = launched(); emptySlope(r); steps(r, 10);
    r.press(); r.update(DT); r.release();
    let pressed = false;
    for (let i = 0; i < 120 && !pressed; i++) {
      r.update(DT);
      if (r.m.vy > 0 && !r.m.grounded && height(r) < 12) { r.press(); r.release(); pressed = true; }
    }
    expect(pressed).toBe(true);
    steps(r, 10);
    expect(r.stats.jumps).toBe(2);
  });

  it('plays the same run twice from the same seed and inputs', () => {
    const play = (): unknown => {
      const r = launched(CHEESES[0], 99);
      for (let i = 0; i < 1200; i++) { if (i % 50 === 0) r.press(); if (i % 50 === 20) r.release(); r.update(DT); }
      return { m: r.m, stats: r.stats, state: r.state };
    };
    expect(play()).toEqual(play());
  });
});

describe('Run: obstacles', () => {
  it('a rock takes one portion and slows the wheel', () => {
    const r = launched(); emptySlope(r); steps(r, 30); r.drain();
    const vx = r.m.vx;
    placeObstacle(r, 'rock', 30);
    steps(r, 20);
    expect(r.m.portions).toBe(VALAIS.portions - TUNE.obstacles.rock.dmg);
    expect(r.stats.hits).toBe(1);
    expect(r.drain().find(e => e.type === 'hit')).toMatchObject({ obstacle: 'rock', dead: false });
    expect(r.m.vx).toBeLessThan(vx);
  });

  it('a cow takes two portions', () => {
    const r = launched(); emptySlope(r); steps(r, 30);
    placeObstacle(r, 'cow', 30);
    steps(r, 20);
    expect(r.m.portions).toBe(VALAIS.portions - TUNE.obstacles.cow.dmg);
  });

  it('breaks the wheel when the last portion goes', () => {
    const r = launched(); emptySlope(r); steps(r, 30); r.drain();
    r.m.portions = 1;
    placeObstacle(r, 'rock', 30);
    steps(r, 20);
    expect(r.state).toBe('dead');
    expect(r.lastHit).toBe('rock');
    expect(r.drain().find(e => e.type === 'hit')).toMatchObject({ dead: true });
  });

  it('cannot be hit twice in a row while it blinks', () => {
    const r = launched(); emptySlope(r); steps(r, 30);
    placeObstacle(r, 'rock', 30); placeObstacle(r, 'rock', 70);
    steps(r, 12);
    expect(r.stats.hits).toBe(1);
  });

  it('counts an obstacle jumped over', () => {
    const r = launched(); emptySlope(r); steps(r, 30);
    placeObstacle(r, 'rock', 200);
    for (let i = 0; i < 90; i++) {
      const o = r.terrain.obstacles[0];
      if (!o.passed && o.x - r.m.x < 60) r.press(); else r.release();
      r.update(DT);
    }
    expect(r.stats.hits).toBe(0);
    expect(r.stats.cleared.rock).toBe(1);
  });
});

describe('Run: bonuses and potatoes', () => {
  const grab = (r: Run, t: PowerType): void => {
    r.terrain.powerups.push({ x: r.m.x + 20, dy: r.terrain.groundAt(r.m.x + 20) - r.m.y, t, got: false });
    steps(r, 5);
  };

  it('the pan absorbs the next hit', () => {
    const r = launched(); emptySlope(r); steps(r, 30);
    grab(r, 'shield');
    expect(r.shield).toBe(true);
    placeObstacle(r, 'cow', 30);
    steps(r, 20);
    expect(r.m.portions).toBe(VALAIS.portions);
    expect(r.shield).toBe(false);
  });

  it('the turbo smashes obstacles and speeds the wheel up', () => {
    const r = launched(); emptySlope(r); steps(r, 30);
    grab(r, 'turbo');
    placeObstacle(r, 'tree', 60);
    steps(r, 30);
    expect(r.m.portions).toBe(VALAIS.portions);
    expect(r.terrain.obstacles[0].hit).toBe(true);
    expect(r.m.vx).toBeGreaterThan(TUNE.powers.turboSpeed * 0.8);
  });

  it('a wedge gives a portion back, or potatoes when the wheel is whole', () => {
    const r = launched(); emptySlope(r); steps(r, 30);
    grab(r, 'heal');
    expect(r.stats.potatoes).toBe(TUNE.powers.healFullBonus);
    r.m.portions = 2;
    grab(r, 'heal');
    expect(r.m.portions).toBe(3);
  });

  it('picks potatoes up on contact, and the magnet pulls them from afar', () => {
    const r = launched(); emptySlope(r); steps(r, 30);
    r.terrain.potatoes.push({ x: r.m.x + 10, dy: 0, got: false });
    r.terrain.potatoes.push({ x: r.m.x - TUNE.powers.magnetRadius * 0.7, dy: 0, got: false });
    r.terrain.potatoes.sort((a, b) => a.x - b.x);
    steps(r, 3);
    expect(r.stats.potatoes).toBe(1);
    r.magnet = TUNE.powers.magnetTime;
    steps(r, 40);
    expect(r.stats.potatoes).toBe(2);
  });

  it('the Emmental pulls potatoes without a magnet', () => {
    const emm = CHEESES.find(c => c.id === 'emmental')!;
    const r = launched(emm); emptySlope(r); steps(r, 30);
    r.terrain.potatoes.push({ x: r.m.x - emm.magnet * 0.8, dy: 0, got: false });
    steps(r, 30);
    expect(r.stats.potatoes).toBe(1);
  });
});

describe('Run: tutorial', () => {
  it('slows time before the first obstacle until the player jumps', () => {
    const r = new Run(TUNE, VALAIS, 5, true); r.launch();
    for (let i = 0; i < 600 && !r.hint; i++) r.update(DT);
    expect(r.hint).toBe('tap');
    steps(r, 20);
    expect(r.timeScale).toBeLessThan(0.5);
    r.press(); r.update(DT);
    expect(r.timeScale).toBe(1);
    expect(r.hint).toBe(null);
  });

  it('ends after its last obstacle', () => {
    const r = new Run(TUNE, VALAIS, 5, true); r.launch();
    const events: string[] = [];
    for (let i = 0; i < 60 * 30 && r.tutorial; i++) {
      if (r.hint) r.press(); else r.release();
      r.update(DT);
      events.push(...r.drain().map(e => e.type));
    }
    expect(r.tutorial).toBe(false);
    expect(events).toContain('tutorialDone');
  });
});
