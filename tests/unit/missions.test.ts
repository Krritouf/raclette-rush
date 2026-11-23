import { describe, expect, it } from 'vitest';
import { describe as sentence, initialMissions, isDone, missionDef, settle, type MissionDef } from '../../src/game/missions';
import type { RunStats } from '../../src/game/run';
import { MISSIONS } from './fixtures';

const stats = (o: Partial<RunStats> = {}): RunStats => ({ meters: 0, potatoes: 0, jumps: 0, hits: 0, powerups: 0, noHit: 0, airTime: 0,
  cleared: { rock: 0, fence: 0, tree: 0, cow: 0 }, ...o });
const LIST: MissionDef[] = [
  { type: 'distance', target: 500, reward: 20 },
  { type: 'jumps', target: 10, reward: 15 },
  { type: 'cows', target: 2, reward: 30 },
  { type: 'potatoes', target: 5, reward: 10 },
];

describe('missions', () => {
  it('starts with the three first missions', () => {
    expect(initialMissions().slots.map(s => s.idx)).toEqual([0, 1, 2]);
  });

  it('a one-run mission needs the target in a single run', () => {
    const a = settle(LIST, initialMissions(), stats({ meters: 300 }));
    expect(a.completed).toEqual([]);
    expect(a.state.slots[0].progress).toBe(300);
    const b = settle(LIST, a.state, stats({ meters: 250 }));
    expect(b.state.slots[0].progress).toBe(300);
    expect(b.completed).toEqual([]);
  });

  it('a mission across runs adds the runs up', () => {
    const a = settle(LIST, initialMissions(), stats({ jumps: 6 }));
    const b = settle(LIST, a.state, stats({ jumps: 4 }));
    expect(b.completed.map(c => c.def.type)).toEqual(['jumps']);
  });

  it('replaces a finished mission with the next on the list', () => {
    const r = settle(LIST, initialMissions(), stats({ meters: 600, cleared: { rock: 0, fence: 0, tree: 0, cow: 2 } }));
    expect(r.completed.map(c => c.slot)).toEqual([0, 2]);
    expect(r.state.slots.map(s => s.idx)).toEqual([3, 1, 4]);
    expect(r.state.next).toBe(5);
  });

  it('starts the list again with bigger targets and rewards', () => {
    expect(missionDef(LIST, 4)).toEqual({ type: 'distance', target: 1000, reward: 40 });
    expect(missionDef(LIST, 9)).toEqual({ type: 'jumps', target: 30, reward: 45 });
  });

  it('tells when a run has finished a mission, before it is settled', () => {
    expect(isDone(LIST[0], { idx: 0, progress: 0 }, stats({ meters: 500 }))).toBe(true);
    expect(isDone(LIST[1], { idx: 1, progress: 9 }, stats({ jumps: 1 }))).toBe(true);
    expect(isDone(LIST[1], { idx: 1, progress: 8 }, stats({ jumps: 1 }))).toBe(false);
  });

  it('every mission of the game has a sentence and a positive target and reward', () => {
    for (let i = 0; i < MISSIONS.length * 2; i++) {
      const d = missionDef(MISSIONS, i);
      expect(sentence(d).length).toBeGreaterThan(5);
      expect(d.target).toBeGreaterThan(0);
      expect(d.reward).toBeGreaterThan(0);
    }
  });
});
