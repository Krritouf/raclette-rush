// The shapes of the game data (data/*.json) and of a run. The game logic in src/game/ only
// imports types from here and receives the data as arguments, so tests can hand it their own.

/** The four obstacles on the mountain. */
export type ObstacleType = 'rock' | 'fence' | 'tree' | 'cow';

/** The four bonuses: a pan that absorbs a hit, a magnet fork, a pickle turbo, a portion back. */
export type PowerType = 'shield' | 'magnet' | 'turbo' | 'heal';

/** One obstacle's size and what a hit costs. */
export interface ObstacleDef {
  w: number; h: number;
  /** Portions lost on a hit. */
  dmg: number;
  /** Horizontal speed kept after a hit (0..1). */
  slow: number;
}

/** data/config.json: every gameplay value. */
export interface Tune {
  seed: number;
  physics: {
    gravity: number; jump: number; jumpCut: number; jumpCutSpeed: number; minJumpTime: number;
    rollDrag: number; maxSpeed: number; minSpeed: number; minSpeedPush: number; launchSpeed: number;
    jumpBuffer: number; coyote: number; bounceSpeed: number; bounce: number; substeps: number;
  };
  hits: { invulnerable: number; knockUp: number; hitbox: number; shieldSlow: number };
  terrain: {
    step: number; startX: number; startY: number; calmUntil: number; difficultyDistance: number;
    features: { normal: number; kicker: number; cliff: number; flat: number };
    cliffMin: number; cliffMax: number; cliffMaxHard: number;
  };
  obstacles: Record<ObstacleType, ObstacleDef>;
  spawn: {
    firstObstacle: number; gapMin: number; gapMinDrop: number; gapMax: number; gapMaxDrop: number;
    pools: { until: number; types: string[] }[];
    firstPotato: number; potatoGapMin: number; potatoGapMax: number; potatoSpacing: number;
    potatoRowMin: number; potatoRowMax: number; potatoHighChance: number;
    firstPower: number; powerGapMin: number; powerGapMax: number;
  };
  powers: {
    magnetTime: number; magnetRadius: number; turboTime: number; turboSpeed: number; healFullBonus: number;
    weights: Record<PowerType, number>;
  };
  tutorial: { obstacles: (number | string)[][]; end: number; hintDistance: number; slowMotion: number };
  unitsPerMeter: number;
  comboWindow: number;
}

/** data/cheeses.json: one wheel the player can roll. */
export interface Cheese {
  id: string;
  name: string;
  desc: string;
  /** Price in potatoes; 0 for the wheel the player starts with. */
  price: number;
  /** Hits it can take (a cow takes two). */
  portions: number;
  radius: number;
  /** Jump strength multiplier. */
  jump: number;
  /** Extra potato pull radius, always on. */
  magnet: number;
  paste: string;
  rind: string;
  stamp: string;
  holes: number;
}
