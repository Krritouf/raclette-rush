// A solver for the Adventure's levels: it looks for a way through a level without a single hit,
// obstacle by obstacle, trying each moment and length of jump and replaying the level from the
// start (a level is the same every time). When an obstacle cannot be cleared, it goes back and
// tries another jump for the one before. A level it solves can be finished without losing a slice;
// an obstacle it cannot get past is a spot nobody could clear cleanly. The tests run it on every
// level.

import { Run } from './run';
import type { Cheese, LevelDef, Tune } from './types';

/** A jump: the frame the button goes down, and how many frames it stays down. */
export interface Press { frame: number; hold: number }

/** What the solver found. */
export interface Solution {
  /** The jumps that clear the level, in order. */
  presses: Press[];
  /** The obstacle (its x) furthest along that could not be cleared; null for a clean level. */
  stuck: number | null;
  won: boolean;
}

const DT = 1 / 60;
const HOLDS = [6, 14, 40];
/** How many different jumps to try for one obstacle before going back. */
const BRANCH = 4;
/** How many replays the whole search may use. */
const BUDGET = 20000;

/** Plays the level with these jumps until `stop` says so; returns the run. */
function replay(tune: Tune, cheese: Cheese, level: LevelDef, presses: Press[], stop: (r: Run, frame: number) => boolean): Run {
  const r = new Run(tune, cheese, 0, false, level);
  r.launch();
  let k = 0, releaseAt = -1;
  for (let f = 0; f < 60 * 400 && r.state === 'play'; f++) {
    if (k < presses.length && presses[k].frame === f) { r.press(); releaseAt = f + presses[k].hold; k++; }
    if (f === releaseAt) r.release();
    r.update(DT);
    if (stop(r, f)) break;
  }
  return r;
}

/** Looks for a way through the level without a hit. */
export function solve(tune: Tune, cheese: Cheese, level: LevelDef): Solution {
  const probe = new Run(tune, cheese, 0, false, level);
  const obstacles = probe.terrain.obstacles.map(o => o.x).filter(x => x < probe.finishX).sort((a, b) => a - b);
  let replays = 0, furthest = -1;

  /** The jumps (latest first, at most BRANCH) that clear obstacle k after these presses. */
  function options(presses: Press[], from: number, ox: number): Press[] {
    const frames: number[] = [];
    let hitBefore = false;
    replays++;
    // the frames as the wheel comes to the obstacle (stopped just before it: without a jump, it would hit it)
    replay(tune, cheese, level, presses, (r, f) => {
      if (r.stats.hits > 0) { hitBefore = !r.terrain.obstacles.some(o => o.x === ox && o.hit); return true; }
      if (f >= from && r.m.x > ox - 700) frames.push(f);
      return r.m.x > ox - r.m.r;
    });
    if (hitBefore) return [];
    const out: Press[] = [];
    for (const f of frames.reverse()) {
      for (const hold of HOLDS) {
        if (replays++ > BUDGET) return out;
        const r = replay(tune, cheese, level, [...presses, { frame: f, hold }], rr => rr.stats.hits > 0 || rr.m.x > ox + 140);
        if (r.stats.hits === 0 && (r.m.x > ox + 140 || r.state === 'won')) { out.push({ frame: f, hold }); break; }
      }
      if (out.length >= BRANCH) break;
    }
    return out;
  }

  function search(k: number, presses: Press[], from: number): boolean {
    if (k === obstacles.length) return true;
    furthest = Math.max(furthest, k);
    for (const p of options(presses, from, obstacles[k])) {
      presses.push(p);
      if (search(k + 1, presses, p.frame + p.hold + 1)) return true;
      presses.pop();
      if (replays > BUDGET) return false;
    }
    return false;
  }

  const presses: Press[] = [];
  const ok = search(0, presses, 0);
  const end = replay(tune, cheese, level, presses, () => false);
  return { presses, stuck: ok ? null : obstacles[furthest] ?? null, won: ok && end.state === 'won' && end.stats.hits === 0 };
}
