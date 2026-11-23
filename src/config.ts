// The game data, from data/*.json, typed. Everything the game tunes lives in those files.

import config from '../data/config.json';
import cheeses from '../data/cheeses.json';
import levels from '../data/levels.json';
import missions from '../data/missions.json';
import type { MissionDef } from './game/missions';
import type { Cheese, LevelDef, Tune } from './game/types';

/** data/config.json: physics, terrain, obstacles, bonuses, tutorial. */
export const TUNE: Tune = config;
/** data/cheeses.json: the wheels of the shop, the starting one first. */
export const CHEESES: Cheese[] = cheeses;
/** data/levels.json: the Adventure's levels, in order. */
export const LEVELS: LevelDef[] = levels;
/** data/missions.json: the missions, in the order they come. */
export const MISSIONS: MissionDef[] = missions as MissionDef[];

/** A cheese by id (the starting one when the id is unknown). */
export function cheeseById(id: string): Cheese {
  return CHEESES.find(c => c.id === id) ?? CHEESES[0];
}
