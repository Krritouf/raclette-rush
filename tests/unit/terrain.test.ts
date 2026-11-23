import { describe, expect, it } from 'vitest';
import { makeRng } from '../../src/game/rng';
import { Terrain } from '../../src/game/terrain';
import { TUNE } from './fixtures';

const build = (seed: number, tutorial = false): Terrain => { const t = new Terrain(TUNE, makeRng(seed), tutorial); t.genTo(20000); return t; };

describe('Terrain', () => {
  it('builds the same mountain from the same seed', () => {
    const a = build(7), b = build(7);
    expect(a.gy).toEqual(b.gy);
    expect(a.obstacles).toEqual(b.obstacles);
    expect(a.potatoes).toEqual(b.potatoes);
    expect(a.powerups).toEqual(b.powerups);
  });

  it('builds a different mountain from another seed', () => {
    expect(build(7).gy).not.toEqual(build(8).gy);
  });

  it('gives the same mountain whether it is asked for in one go or bit by bit', () => {
    const whole = build(3);
    const bits = new Terrain(TUNE, makeRng(3));
    for (let x = 0; x <= 20000; x += 137) bits.groundAt(x);
    bits.genTo(20000);
    expect(bits.gy.slice(0, 900)).toEqual(whole.gy.slice(0, 900));
    expect(bits.obstacles.slice(0, 20)).toEqual(whole.obstacles.slice(0, 20));
  });

  it('goes downhill overall, with finite heights', () => {
    const t = build(11);
    expect(t.gy.every(Number.isFinite)).toBe(true);
    expect(t.groundAt(20000)).toBeGreaterThan(t.groundAt(0) + 2000);
  });

  it('interpolates the ground between two points', () => {
    const t = build(5), step = TUNE.terrain.step;
    expect(t.groundAt(step * 10 + step / 2)).toBeCloseTo((t.gy[10] + t.gy[11]) / 2, 6);
  });

  it('keeps the first stretch free of obstacles', () => {
    const t = build(9);
    expect(Math.min(...t.obstacles.map(o => o.x))).toBeGreaterThanOrEqual(TUNE.spawn.firstObstacle);
  });

  it('places the tutorial obstacles by hand, and nothing else before its end', () => {
    const t = build(1, true);
    const early = t.obstacles.filter(o => o.x < TUNE.tutorial.end);
    expect(early.map(o => [o.x, o.t])).toEqual(TUNE.tutorial.obstacles);
  });

  it('only brings cows in once the last pool starts', () => {
    for (const seed of [21, 22, 23]) {
      const firstCow = build(seed).obstacles.find(o => o.t === 'cow');
      expect(firstCow?.x ?? Infinity).toBeGreaterThanOrEqual(TUNE.spawn.pools[1].until);
    }
  });

  it('leaves the landing zone after a kicker or a cliff free of obstacles', () => {
    // a wheel thrown in the air cannot jump: an obstacle where it lands is a hit it cannot avoid
    for (const seed of [1, 2, 3, 4, 5]) {
      const t = build(seed);
      expect(t.launches.length).toBeGreaterThan(5);
      const inZone = t.obstacles.filter(o => t.launches.some(l => o.x > l && o.x - l < TUNE.spawn.landingZone));
      expect(inZone).toEqual([]);
    }
  });

  it('never throws the wheel again before it has landed', () => {
    const t = build(8);
    const gaps = t.launches.slice(1).map((x, i) => x - t.launches[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(TUNE.spawn.landingZone);
  });
});
