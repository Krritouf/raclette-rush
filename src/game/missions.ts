// The missions: three at a time, from data/missions.json in order. Some count within one run
// (go 2000 m), others add up across runs (jump 25 times). A finished mission pays its reward in
// potatoes at the end of the run and the next one on the list takes its place. Past the end of
// the list, the list starts again with bigger targets and rewards.

import type { RunStats } from './run';

/** What a mission counts. */
export type MissionType =
  | 'distance' | 'potatoes' | 'noHit' | 'powerups' | 'airTime' // within one run
  | 'jumps' | 'cows' | 'trees' | 'totalDistance' | 'runs';      // across runs

/** One mission of the list. */
export interface MissionDef { type: MissionType; target: number; reward: number }

/** One of the three active missions: its index in the (endless) list and its progress so far. */
export interface MissionSlot { idx: number; progress: number }

/** The missions part of the save. */
export interface MissionState { next: number; slots: MissionSlot[] }

/** A mission finished by a run. */
export interface Completed { def: MissionDef; slot: number }

const PER_RUN: ReadonlySet<MissionType> = new Set(['distance', 'potatoes', 'noHit', 'powerups', 'airTime']);

/** The three first missions. */
export function initialMissions(): MissionState {
  return { next: 3, slots: [0, 1, 2].map(idx => ({ idx, progress: 0 })) };
}

/** The mission at idx of the endless list: each pass over the list doubles, triples… targets and rewards. */
export function missionDef(list: readonly MissionDef[], idx: number): MissionDef {
  const base = list[idx % list.length], round = Math.floor(idx / list.length) + 1;
  const target = base.type === 'airTime' ? Math.round(base.target * (1 + 0.25 * (round - 1)) * 10) / 10 : base.target * round;
  return { type: base.type, target, reward: base.reward * round };
}

/** What a run adds to a mission of this type. */
export function runValue(type: MissionType, s: RunStats): number {
  switch (type) {
    case 'distance': case 'totalDistance': return s.meters;
    case 'potatoes': return s.potatoes;
    case 'noHit': return s.noHit;
    case 'powerups': return s.powerups;
    case 'airTime': return Math.floor(s.airTime * 10) / 10;
    case 'jumps': return s.jumps;
    case 'cows': return s.cleared.cow;
    case 'trees': return s.cleared.tree;
    case 'runs': return 1;
  }
}

/** A mission's progress with this run counted (the best run, or the total so far). */
export function progressWith(def: MissionDef, slot: MissionSlot, s: RunStats): number {
  const v = runValue(def.type, s);
  return PER_RUN.has(def.type) ? Math.max(slot.progress, v) : slot.progress + v;
}

/** True when this run has finished the mission. */
export function isDone(def: MissionDef, slot: MissionSlot, s: RunStats): boolean {
  return progressWith(def, slot, s) >= def.target;
}

/**
 * Counts a finished run: updates every slot, replaces the finished missions with the next ones.
 * Returns the new state and the missions finished (their rewards are for the caller to pay).
 */
export function settle(list: readonly MissionDef[], st: MissionState, s: RunStats): { state: MissionState; completed: Completed[] } {
  const completed: Completed[] = [];
  let next = st.next;
  const slots = st.slots.map((slot, i) => {
    const def = missionDef(list, slot.idx);
    const progress = progressWith(def, slot, s);
    if (progress >= def.target) { completed.push({ def, slot: i }); return { idx: next++, progress: 0 }; }
    return { idx: slot.idx, progress };
  });
  return { state: { next, slots }, completed };
}

/** The mission's sentence, in French (i18n.ts translates it). */
export function describe(def: MissionDef): string {
  const n = def.target;
  switch (def.type) {
    case 'distance': return `Parcours ${n} m en une descente`;
    case 'potatoes': return `Ramasse ${n} pommes de terre en une descente`;
    case 'noHit': return `Fais ${n} m sans aucun choc`;
    case 'powerups': return n === 1 ? 'Attrape un bonus' : `Attrape ${n} bonus en une descente`;
    case 'airTime': return `Reste ${n} s en l'air d'un seul saut`;
    case 'jumps': return `Saute ${n} fois`;
    case 'cows': return `Saute par-dessus ${n} vaches`;
    case 'trees': return `Saute par-dessus ${n} sapins`;
    case 'totalDistance': return `Parcours ${n} m au total`;
    case 'runs': return `Joue ${n} descentes`;
  }
}
