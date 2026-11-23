// Shared test data: the game's own data files, and a Run factory.
import config from '../../data/config.json';
import cheeses from '../../data/cheeses.json';
import missions from '../../data/missions.json';
import { Run } from '../../src/game/run';
import type { MissionDef } from '../../src/game/missions';
import type { Cheese, ObstacleType, Tune } from '../../src/game/types';

export const TUNE: Tune = config;
export const CHEESES: Cheese[] = cheeses;
export const MISSIONS: MissionDef[] = missions as MissionDef[];
export const VALAIS = CHEESES[0];
export const DT = 1 / 60;

/** A launched run on a seed, no tutorial. */
export function launched(cheese: Cheese = VALAIS, seed = 42): Run {
  const r = new Run(TUNE, cheese, seed);
  r.launch();
  return r;
}

/** Runs n steps of 1/60 s. */
export function steps(r: Run, n: number): void { for (let i = 0; i < n; i++) r.update(DT); }

/** Clears the generated obstacles, bonuses and potatoes, for a test that places its own. */
export function emptySlope(r: Run): void {
  r.terrain.obstacles.length = 0; r.terrain.powerups.length = 0; r.terrain.potatoes.length = 0;
}

/** Puts an obstacle `ahead` units in front of the wheel. */
export function placeObstacle(r: Run, t: ObstacleType, ahead: number): void {
  r.terrain.obstacles.push({ x: r.m.x + ahead, t, hit: false, passed: false, rot: 0 });
  r.terrain.obstacles.sort((a, b) => a.x - b.x);
}
