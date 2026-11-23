// The game's state between frames, and the actions the screens can call. main.ts owns both;
// screens.ts draws from the state and wires its buttons to the actions.

import type { Completed } from './game/missions';
import type { Run } from './game/run';
import type { SaveData } from './game/save';
import type { Cheese } from './game/types';
import type { Camera, View } from './render/world';
import type { Fx } from './render/fx';
import type { Ui } from './ui';

/** The screens. */
export type Scene = 'title' | 'play' | 'pause' | 'over' | 'shop' | 'missions' | 'settings';

/** The end of a run, as the end screen shows it. */
export interface Summary {
  meters: number;
  record: boolean;
  best: number;
  potatoes: number;
  completed: Completed[];
  bank: number;
  /** Why the wheel broke. */
  reason: string;
  /** A cheese the player can now afford, if any. */
  affordable: Cheese | null;
}

/** A banner at the top of the screen. */
export interface Toast { title: string; sub?: string; life: number; reward?: number }

/** The screen in CSS pixels, plus the UI scale and the phone's safe margins. */
export interface Screen extends View {
  u: number;
  inset: { l: number; r: number; t: number; b: number };
}

/** Everything the frame draws from. */
export interface App {
  scene: Scene;
  /** Seconds since the scene changed. */
  sceneT: number;
  /** Seconds since the game started. */
  t: number;
  save: SaveData;
  run: Run;
  fx: Fx;
  cam: Camera;
  ui: Ui;
  view: Screen;
  /** The cheese shown in the shop. */
  shopIdx: number;
  summary: Summary | null;
  toasts: Toast[];
  /** The scene the settings return to. */
  settingsFrom: Scene;
}

/** What the screens' buttons do. */
export interface Actions {
  play(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  menu(): void;
  goto(s: Scene): void;
  back(): void;
  shopMove(d: number): void;
  shopAction(): void;
  toggle(setting: 'sound' | 'music' | 'vibrate' | 'lang'): void;
  replayTutorial(): void;
}
