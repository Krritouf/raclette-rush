// The mountain: a ground line made one step at a time as the camera moves forward, with the
// obstacles, potatoes, bonuses and background trees along it. Built from the seeded Rng only, so a
// seed always gives the same mountain, however early or late the rest of the game asks for it.

import { makeRng, pick, range, weighted, type Rng } from './rng';
import type { ObstacleType, PowerType, Tune } from './types';

/** An obstacle on the slope; x is its left edge. */
export interface Obstacle {
  x: number;
  t: ObstacleType;
  /** The wheel hit it (or smashed it with the turbo). */
  hit: boolean;
  /** The wheel went past it cleanly. */
  passed: boolean;
  /** How far it has toppled after a hit, 0..1.3 (looks only). */
  rot: number;
  /** Which look: the cows take turns, 0 the black Hérens, 1 the spotted one. */
  variant?: number;
}

/** A potato floating dy above the ground; once the magnet pulls it, it moves freely at fx, fy. */
export interface Potato { x: number; dy: number; got: boolean; fx?: number; fy?: number }

/** A bonus floating dy above the ground. */
export interface PowerUp { x: number; dy: number; t: PowerType; got: boolean }

/** A background (back) or foreground tree, with no collision. */
export interface Deco { x: number; s: number; back: boolean }

type Feature = 'normal' | 'kicker' | 'cliff' | 'flat';

/** The mountain of one run. */
export class Terrain {
  /** Ground heights, one every tune.terrain.step units. */
  readonly gy: number[];
  obstacles: Obstacle[] = [];
  potatoes: Potato[] = [];
  powerups: PowerUp[] = [];
  deco: Deco[] = [];
  /** Where the ground throws the wheel in the air: the lip of each kicker and the edge of each cliff. */
  launches: number[] = [];

  private genX = 0;
  private slope = 0.3;
  private target = 0.3;
  private feat: Feature = 'normal';
  private featLeft = 30;
  private cows = 0;
  private lastLaunch = -1e9;
  private nextObsX: number;
  private nextPotX: number;
  private nextPowX: number;
  private scripted: { x: number; t: ObstacleType }[];
  private readonly decoRng: Rng;

  /**
   * @param tune the game's values
   * @param rng the gameplay stream, from the run's seed
   * @param tutorial the first run: a calm slope with the tutorial's three obstacles placed by hand
   */
  constructor(private readonly tune: Tune, private readonly rng: Rng, private readonly tutorial = false) {
    this.gy = [tune.terrain.startY];
    const sp = tune.spawn;
    this.scripted = tutorial ? tune.tutorial.obstacles.map(([x, t]) => ({ x: Number(x), t: t as ObstacleType })) : [];
    this.nextObsX = tutorial ? tune.tutorial.end : sp.firstObstacle;
    this.nextPotX = sp.firstPotato;
    this.nextPowX = tutorial ? Math.max(sp.firstPower, tune.tutorial.end + 400) : sp.firstPower;
    // The trees in the background have their own stream: changing the scenery never moves an obstacle.
    this.decoRng = makeRng(Math.floor(rng() * 4294967296));
  }

  /** How far the ground is built. */
  get builtTo(): number { return this.genX; }

  /** Builds the ground up to x (and a little beyond). */
  genTo(x: number): void {
    const T = this.tune, step = T.terrain.step, sp = T.spawn, r = this.rng;
    while (this.genX <= x + step * 2) {
      const d = this.genX;
      const diff = Math.min(1, d / T.terrain.difficultyDistance);
      const calm = d < T.terrain.calmUntil || (this.tutorial && d < T.tutorial.end);
      let y = this.gy[this.gy.length - 1];
      if (this.featLeft <= 0) {
        const f = T.terrain.features;
        const p = r();
        const landing = d - this.lastLaunch < sp.landingZone;
        if (calm) { this.feat = 'normal'; this.featLeft = 10; if (this.tutorial) this.target = 0.28; }
        else if (landing) { this.feat = 'normal'; this.featLeft = 6; }
        else if (p < f.normal) { this.feat = 'normal'; this.featLeft = Math.floor(range(r, 12, 35)); this.target = range(r, 0.22, 0.5 + 0.25 * diff); }
        else if (p < f.normal + f.kicker && this.feat !== 'flat') { this.feat = 'kicker'; this.featLeft = Math.floor(range(r, 4, 7)); }
        else if (p < f.normal + f.kicker + f.cliff) { this.feat = 'cliff'; this.featLeft = 1; }
        else { this.feat = 'flat'; this.featLeft = Math.floor(range(r, 8, 18)); this.target = range(r, 0.02, 0.1); }
      }
      if (this.feat === 'kicker') this.slope += (-0.45 - this.slope) * 0.5;
      else if (this.feat === 'cliff') { y += range(r, T.terrain.cliffMin, T.terrain.cliffMax + T.terrain.cliffMaxHard * diff); this.slope = this.target; }
      else this.slope += (this.target - this.slope) * 0.2 + range(r, -0.06, 0.06);
      if (this.feat === 'kicker' && this.featLeft === 1) this.target = range(r, 0.3, 0.55);
      y += this.slope * step;
      this.featLeft--;
      this.gy.push(y);
      this.genX += step;
      const nx = this.genX;
      if ((this.feat === 'kicker' && this.featLeft === 0) || this.feat === 'cliff') { this.launches.push(nx); this.lastLaunch = nx; }

      // the tutorial's obstacles, placed by hand
      while (this.scripted.length && nx >= this.scripted[0].x) {
        const s = this.scripted.shift()!;
        this.obstacles.push({ x: s.x, t: s.t, hit: false, passed: false, rot: 0 });
      }
      // obstacles: only on a steady slope, never on a kicker or a cliff edge, and never where a wheel
      // thrown by the last kicker or cliff may still be in the air (it could not jump)
      if (nx > this.nextObsX && (this.feat === 'normal' || this.feat === 'flat') && this.featLeft > 3 && nx - this.lastLaunch >= sp.landingZone) {
        const pool = sp.pools.find(p => nx < p.until) ?? sp.pools[sp.pools.length - 1];
        const t = pick(r, pool.types) as ObstacleType;
        this.obstacles.push({ x: nx, t, hit: false, passed: false, rot: 0, variant: t === 'cow' ? this.cows++ % 2 : 0 });
        this.nextObsX = nx + range(r, sp.gapMin - sp.gapMinDrop * diff, sp.gapMax - sp.gapMaxDrop * diff);
      }
      // potatoes, in an arc, sometimes high up
      if (nx > this.nextPotX && this.feat !== 'cliff') {
        const n = Math.floor(range(r, sp.potatoRowMin, sp.potatoRowMax)), high = r() < sp.potatoHighChance;
        for (let i = 0; i < n; i++) {
          const arc = Math.sin(i / Math.max(1, n - 1) * Math.PI);
          this.potatoes.push({ x: nx + i * sp.potatoSpacing, dy: (high ? 90 : 40) + arc * (high ? 40 : 20), got: false });
        }
        this.nextPotX = nx + range(r, sp.potatoGapMin, sp.potatoGapMax);
      }
      // bonuses
      if (nx > this.nextPowX && this.feat !== 'cliff') {
        this.powerups.push({ x: nx, dy: 70, t: weighted(r, T.powers.weights), got: false });
        this.nextPowX = nx + range(r, sp.powerGapMin, sp.powerGapMax);
      }
      // scenery
      const dr = this.decoRng;
      if (dr() < 0.12) this.deco.push({ x: nx + range(dr, -10, 10), s: range(dr, 0.5, 1.1), back: dr() < 0.5 });
    }
  }

  /** The ground's height under x. */
  groundAt(x: number): number {
    if (x < 0) x = 0;
    this.genTo(x);
    const step = this.tune.terrain.step;
    const fi = x / step, i = Math.floor(fi), t = fi - i;
    return this.gy[i] + (this.gy[i + 1] - this.gy[i]) * t;
  }

  /** The ground's slope under x (positive: going down to the right). */
  slopeAt(x: number): number {
    return (this.groundAt(x + 4) - this.groundAt(x - 4)) / 8;
  }

  /** Forgets what lies well behind xMin, so a long run keeps short lists. */
  prune(xMin: number): void {
    if (this.obstacles.length > 60) this.obstacles = this.obstacles.filter(o => o.x > xMin);
    if (this.potatoes.length > 120) this.potatoes = this.potatoes.filter(p => p.x > xMin);
    if (this.powerups.length > 20) this.powerups = this.powerups.filter(p => p.x > xMin);
    if (this.deco.length > 200) this.deco = this.deco.filter(d => d.x > xMin - 200);
  }
}
