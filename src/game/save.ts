// The player's progress and settings, kept in a key-value store (localStorage in the game, a Map
// in the tests). load() never fails: a missing or broken save gives the defaults.

import { initialMissions, type MissionState } from './missions';
import type { Cheese } from './types';

/** Where the save is kept. */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The player's settings. */
export interface Settings { sound: boolean; music: boolean; vibrate: boolean; lang: 'fr' | 'en' }

/** Everything the game remembers. */
export interface SaveData {
  /** The best distance, in metres. */
  best: number;
  /** Potatoes to spend. */
  bank: number;
  /** Cheeses bought (the starting one included). */
  owned: string[];
  /** The cheese rolled. */
  cheese: string;
  missions: MissionState;
  tutorialDone: boolean;
  runs: number;
  settings: Settings;
}

/** The storage key. */
export const SAVE_KEY = 'raclette_rush';

/** A new player's save. */
export function defaults(lang: 'fr' | 'en' = 'fr'): SaveData {
  return { best: 0, bank: 0, owned: ['valais'], cheese: 'valais', missions: initialMissions(),
    tutorialDone: false, runs: 0, settings: { sound: true, music: true, vibrate: true, lang } };
}

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);

/** Reads the save; whatever is missing or wrong in it takes its default. */
export function load(store: Store, lang: 'fr' | 'en' = 'fr'): SaveData {
  const d = defaults(lang);
  let raw: Record<string, unknown> = {};
  try { raw = JSON.parse(store.getItem(SAVE_KEY) || '{}') ?? {}; } catch { return d; }
  if (typeof raw !== 'object') return d;
  const owned = Array.isArray(raw.owned) ? raw.owned.filter((x): x is string => typeof x === 'string') : [];
  if (!owned.includes('valais')) owned.unshift('valais');
  const ms = raw.missions as MissionState | undefined;
  const missionsOk = !!ms && typeof ms.next === 'number' && Array.isArray(ms.slots) && ms.slots.length === 3
    && ms.slots.every(s => typeof s?.idx === 'number' && typeof s?.progress === 'number');
  const st = (raw.settings ?? {}) as Partial<Settings>;
  return {
    best: num(raw.best, 0),
    bank: num(raw.bank, 0),
    owned,
    cheese: typeof raw.cheese === 'string' && owned.includes(raw.cheese) ? raw.cheese : 'valais',
    missions: missionsOk ? ms! : d.missions,
    tutorialDone: bool(raw.tutorialDone, false),
    runs: num(raw.runs, 0),
    settings: { sound: bool(st.sound, true), music: bool(st.music, true), vibrate: bool(st.vibrate, true),
      lang: st.lang === 'en' || st.lang === 'fr' ? st.lang : lang },
  };
}

/** Writes the save; a blocked storage is ignored. */
export function store(s: Store, data: SaveData): void {
  try { s.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage blocked */ }
}

/** The result of a purchase. */
export type BuyResult = 'bought' | 'owned' | 'poor';

/** Buys a cheese with potatoes (and rolls it). */
export function buy(save: SaveData, c: Cheese): BuyResult {
  if (save.owned.includes(c.id)) return 'owned';
  if (save.bank < c.price) return 'poor';
  save.bank -= c.price;
  save.owned.push(c.id);
  save.cheese = c.id;
  return 'bought';
}

/** Rolls a cheese already bought. */
export function choose(save: SaveData, id: string): boolean {
  if (!save.owned.includes(id)) return false;
  save.cheese = id;
  return true;
}
