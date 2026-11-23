// One descent: the cheese wheel rolling down the Terrain, with the jump, the hits, the potatoes,
// the bonuses and the first-run tutorial. No drawing and no sound here: what happens is pushed as
// RunEvents, which the game reads with drain() to play sounds, shake the screen and vibrate.

import { makeRng } from './rng';
import { Terrain, type Obstacle } from './terrain';
import type { Cheese, LevelDef, ObstacleType, PowerType, Tune } from './types';

/** The wheel. y is its centre; a is its rotation. */
export interface Wheel {
  x: number; y: number; vx: number; vy: number; a: number;
  r: number;
  portions: number;
  maxPortions: number;
  grounded: boolean;
  /** Seconds left without hits after a hit. */
  inv: number;
}

/** What a run counts, for the record, the missions and the end screen. */
export interface RunStats {
  meters: number;
  potatoes: number;
  jumps: number;
  hits: number;
  powerups: number;
  cleared: Record<ObstacleType, number>;
  /** The longest stretch without a hit, in metres. */
  noHit: number;
  /** The longest time in the air from one jump, in seconds. */
  airTime: number;
}

/** Something that happened during a step. */
export type RunEvent =
  | { type: 'launch' }
  | { type: 'jump' }
  | { type: 'land'; speed: number }
  | { type: 'hit'; obstacle: ObstacleType; dead: boolean; x: number; y: number }
  | { type: 'shield'; x: number; y: number }
  | { type: 'smash'; obstacle: ObstacleType; x: number; y: number }
  | { type: 'clear'; obstacle: ObstacleType }
  | { type: 'potato'; x: number; y: number; combo: number }
  | { type: 'power'; power: PowerType; x: number; y: number; bonus: number }
  | { type: 'tutorialDone' }
  | { type: 'finish' };

/** The tutorial's prompt: a tap for a small jump, a long press for a big one. */
export type Hint = null | 'tap' | 'hold';

/** The state of a run: waiting at the top, rolling, broken, or past an Adventure level's finish line. */
export type RunState = 'ready' | 'play' | 'dead' | 'won';

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** One descent of the mountain. */
export class Run {
  state: RunState = 'ready';
  readonly terrain: Terrain;
  readonly m: Wheel;
  readonly stats: RunStats;
  /** The pan: absorbs the next hit. */
  shield = false;
  /** Seconds of magnet left. */
  magnet = 0;
  /** Seconds of turbo left. */
  turbo = 0;
  /** Game time speed: below 1 while the tutorial waits for a jump. */
  timeScale = 1;
  hint: Hint = null;
  tutorial: boolean;
  /** Seconds since the wheel broke. */
  deadT = 0;
  /** The obstacle of the last hit. */
  lastHit: ObstacleType | null = null;
  /** Seconds since the run started rolling. */
  time = 0;
  /** Seconds since the wheel crossed the finish line. */
  wonT = 0;
  /** An Adventure level's finish line, in units (Infinity in a Quick Game). */
  readonly finishX: number;
  /** Where the feast table stands, past the finish line. */
  readonly tableX: number;
  /** The potatoes laid before the finish line (0 in a Quick Game). */
  readonly potatoTotal: number;

  private jumpBuf = 0;
  private coyote = 0;
  private holding = false;
  private jumpAge = -1;
  private airFrom = -1;
  private noHitFrom: number;
  private combo = 0;
  private lastPotatoT = -10;
  private events: RunEvent[] = [];

  /**
   * @param tune the game's values (data/config.json)
   * @param cheese the wheel rolled
   * @param seed the mountain's seed
   * @param tutorial true on the very first run
   * @param level an Adventure level (its seed replaces `seed`); null for a Quick Game
   */
  constructor(readonly tune: Tune, readonly cheese: Cheese, readonly seed: number, tutorial = false, readonly level: LevelDef | null = null) {
    this.tutorial = tutorial;
    const x = tune.terrain.startX;
    this.finishX = level ? x + level.length * tune.unitsPerMeter : Infinity;
    this.tableX = this.finishX + tune.finish.tableGap;
    this.terrain = new Terrain(tune, makeRng(level ? level.seed : seed), tutorial, level ? { def: level, finishX: this.finishX } : null);
    if (level) {
      // the whole level, built now: it is short, and the end screen counts its potatoes
      this.terrain.genTo(this.tableX + 1500);
      this.potatoTotal = this.terrain.potatoes.filter(p => p.x < this.finishX).length;
    } else {
      this.terrain.genTo(2500);
      this.potatoTotal = 0;
    }
    this.m = { x, y: this.terrain.groundAt(x) - cheese.radius, vx: 0, vy: 0, a: 0, r: cheese.radius,
      portions: cheese.portions, maxPortions: cheese.portions, grounded: true, inv: 0 };
    this.noHitFrom = x;
    this.stats = { meters: 0, potatoes: 0, jumps: 0, hits: 0, powerups: 0, noHit: 0, airTime: 0,
      cleared: { rock: 0, fence: 0, tree: 0, cow: 0 } };
  }

  /** Lets go of the wheel at the top. */
  launch(): void {
    if (this.state !== 'ready') return;
    this.state = 'play';
    this.m.vx = this.tune.physics.launchSpeed;
    this.events.push({ type: 'launch' });
  }

  /** The jump button goes down: a jump as soon as the wheel can. */
  press(): void {
    this.holding = true;
    if (this.state === 'play') this.jumpBuf = this.tune.physics.jumpBuffer;
  }

  /** The jump button comes up: an early release makes a small jump. */
  release(): void { this.holding = false; }

  /** True while the button is held. */
  get held(): boolean { return this.holding; }

  /** How far along the level the wheel is, 0..1 (0 in a Quick Game). */
  get progress(): number {
    if (!this.level) return 0;
    const x0 = this.tune.terrain.startX;
    return clamp((this.m.x - x0) / (this.finishX - x0), 0, 1);
  }

  /** The distance rolled, in metres. */
  get meters(): number { return Math.max(0, Math.floor((this.m.x - this.tune.terrain.startX) / this.tune.unitsPerMeter)); }

  /** The events since the last call, oldest first. */
  drain(): RunEvent[] {
    const e = this.events; this.events = []; return e;
  }

  /** The box an obstacle collides with. */
  box(o: Obstacle): { x0: number; x1: number; y0: number; y1: number } {
    const d = this.tune.obstacles[o.t], base = this.terrain.groundAt(o.x + d.w / 2);
    return { x0: o.x, x1: o.x + d.w, y0: base - d.h, y1: base };
  }

  /** Moves the run on by dt seconds of real time. */
  update(dt: number): void {
    if (this.state === 'dead') this.deadT += dt;
    if (this.state === 'won') this.wonT += dt;
    for (const o of this.terrain.obstacles) if (o.hit && o.rot < 1.3) o.rot += dt * 4;
    if (this.state === 'won') { this.rollOut(dt); return; }
    if (this.state !== 'play') return;

    const P = this.tune.physics, m = this.m;
    const sdt = dt * this.timeScale;
    this.time += sdt;
    this.jumpBuf -= sdt; this.coyote -= sdt; m.inv -= sdt;
    this.magnet = Math.max(0, this.magnet - sdt);
    this.turbo = Math.max(0, this.turbo - sdt);

    const sub = P.substeps;
    for (let i = 0; i < sub && this.state === 'play'; i++) {
      const wasGrounded = m.grounded;
      this.step(sdt / sub);
      if (m.grounded) {
        this.coyote = P.coyote;
        if (this.airFrom >= 0) { this.stats.airTime = Math.max(this.stats.airTime, this.time - this.airFrom); this.airFrom = -1; }
      } else if (wasGrounded && this.airFrom < 0) this.airFrom = this.time;
      if (this.jumpBuf > 0 && this.coyote > 0) this.jump();
    }
    // a short press makes a short jump, but never shorter than minJumpTime of rising
    if (this.jumpAge >= 0) {
      this.jumpAge += sdt;
      if (!this.holding && this.jumpAge >= P.minJumpTime) {
        if (m.vy < -P.jumpCutSpeed) m.vy *= P.jumpCut;
        this.jumpAge = -1;
      }
      if (m.vy >= 0) this.jumpAge = -1;
    }
    m.a += (m.vx / m.r) * sdt;

    const meters = this.meters;
    this.stats.meters = Math.max(this.stats.meters, meters);
    this.stats.noHit = Math.max(this.stats.noHit, Math.floor((m.x - this.noHitFrom) / this.tune.unitsPerMeter));

    this.collect(sdt);
    this.checkPassed();
    if (this.tutorial) this.tutor(dt);
    this.terrain.prune(m.x - 1200);
    if (this.state === 'play' && m.x >= this.finishX) {
      this.state = 'won'; this.wonT = 0; this.hint = null; this.timeScale = 1; this.holding = false; this.jumpAge = -1;
      this.events.push({ type: 'finish' });
    }
  }

  /** Past the finish line: the wheel lands, brakes and stops just before the feast table. */
  private rollOut(dt: number): void {
    const m = this.m, P = this.tune.physics, stopX = this.tableX - this.tune.finish.stopBefore;
    for (let i = 0; i < P.substeps; i++) {
      const h = dt / P.substeps;
      m.vy += P.gravity * h;
      m.vx = Math.min(m.vx, Math.max(0, (stopX - m.x) * 2.2));
      m.x += m.vx * h; m.y += m.vy * h;
      const lift = m.r * Math.min(Math.hypot(this.terrain.slopeAt(m.x), 1), 1.6), g = this.terrain.groundAt(m.x);
      m.grounded = m.y + lift > g - 0.5;
      if (m.grounded) { m.y = g - lift; m.vy = Math.min(0, m.vy); }
    }
    m.a += (m.vx / m.r) * dt;
  }

  private jump(): void {
    const m = this.m;
    m.vy = -this.tune.physics.jump * this.cheese.jump;
    m.y -= 2; m.grounded = false;
    this.jumpBuf = 0; this.coyote = 0; this.jumpAge = 0;
    if (this.airFrom < 0) this.airFrom = this.time;
    this.stats.jumps++;
    this.timeScale = 1; this.hint = null;
    this.events.push({ type: 'jump' });
  }

  /** One physics substep: gravity, the ground, the obstacles. */
  private step(dt: number): void {
    const P = this.tune.physics, m = this.m, T = this.terrain;
    m.vy += P.gravity * dt;
    m.x += m.vx * dt; m.y += m.vy * dt;

    const g = T.groundAt(m.x), s = T.slopeAt(m.x);
    const nl = Math.hypot(s, 1), nx = s / nl, ny = -1 / nl; // the ground's normal, pointing up
    const lift = m.r * Math.min(nl, 1.6); // the centre's height above the ground on a slope
    const wasGrounded = m.grounded;
    m.grounded = false;
    if (m.y + lift > g - 0.5) {
      m.y = g - lift;
      const vn = m.vx * nx + m.vy * ny;
      if (vn < 0) {
        const bounce = vn < -P.bounceSpeed ? P.bounce : 0;
        m.vx -= (1 + bounce) * vn * nx; m.vy -= (1 + bounce) * vn * ny;
        if (!wasGrounded && vn < -300) this.events.push({ type: 'land', speed: -vn });
      }
      m.grounded = true;
      m.vx *= 1 - P.rollDrag * dt; m.vy *= 1 - P.rollDrag * dt;
    }
    const sp = Math.hypot(m.vx, m.vy);
    if (sp > P.maxSpeed) { m.vx *= P.maxSpeed / sp; m.vy *= P.maxSpeed / sp; }
    // the wheel never stays stuck in a hollow
    if (m.grounded && m.vx < P.minSpeed) m.vx += P.minSpeedPush * dt;
    if (this.turbo > 0 && m.vx < this.tune.powers.turboSpeed) m.vx += (this.tune.powers.turboSpeed - m.vx) * Math.min(1, dt * 6);

    if (m.inv > 0 && this.turbo <= 0) return;
    for (const o of T.obstacles) {
      if (o.hit) continue;
      if (o.x > m.x + 150) break;
      const b = this.box(o);
      if (b.x1 < m.x - m.r) continue;
      const cx = clamp(m.x, b.x0, b.x1), cy = clamp(m.y, b.y0, b.y1);
      if (Math.hypot(m.x - cx, m.y - cy) < m.r * this.tune.hits.hitbox) { this.hitObstacle(o); return; }
    }
  }

  private hitObstacle(o: Obstacle): void {
    const m = this.m, def = this.tune.obstacles[o.t], H = this.tune.hits;
    o.hit = true;
    if (this.turbo > 0) { this.events.push({ type: 'smash', obstacle: o.t, x: m.x, y: m.y }); return; }
    if (this.shield) {
      this.shield = false;
      m.vx *= H.shieldSlow; m.inv = H.invulnerable;
      this.events.push({ type: 'shield', x: m.x, y: m.y });
      return;
    }
    m.portions -= def.dmg;
    m.vx *= def.slow;
    m.vy = Math.min(m.vy, 0) - H.knockUp;
    m.inv = H.invulnerable;
    this.stats.hits++;
    this.noHitFrom = m.x;
    this.lastHit = o.t;
    const dead = m.portions <= 0;
    if (dead) { m.portions = 0; this.state = 'dead'; this.deadT = 0; this.timeScale = 1; this.hint = null; }
    this.events.push({ type: 'hit', obstacle: o.t, dead, x: m.x, y: m.y });
  }

  /** Potatoes and bonuses within reach; the magnet pulls potatoes in. */
  private collect(dt: number): void {
    const m = this.m, T = this.terrain, Pw = this.tune.powers;
    const pull = (this.magnet > 0 ? Pw.magnetRadius : 0) + this.cheese.magnet;
    const reach = m.r + 12;
    for (const p of T.potatoes) {
      if (p.got) continue;
      if (p.x < m.x - 300 || p.x > m.x + Math.max(300, pull + 60)) continue;
      let px = p.fx ?? p.x, py = p.fy ?? T.groundAt(p.x) - p.dy;
      if (pull > 0 && Math.hypot(px - m.x, py - m.y) < pull) {
        // it follows the wheel's own speed and closes the gap, so even a fast wheel catches it
        const k = Math.min(1, dt * 12);
        px += m.vx * dt; py += m.vy * dt;
        px += (m.x - px) * k; py += (m.y - py) * k;
        p.fx = px; p.fy = py;
      }
      if (Math.hypot(px - m.x, py - m.y) < reach) {
        p.got = true; this.stats.potatoes++;
        this.combo = this.time - this.lastPotatoT < this.tune.comboWindow ? this.combo + 1 : 0;
        this.lastPotatoT = this.time;
        this.events.push({ type: 'potato', x: px, y: py, combo: this.combo });
      }
    }
    for (const u of T.powerups) {
      if (u.got || u.x < m.x - 80 || u.x > m.x + 80) continue;
      const uy = T.groundAt(u.x) - u.dy;
      if (Math.hypot(u.x - m.x, uy - m.y) < m.r + 18) {
        u.got = true; this.stats.powerups++;
        let bonus = 0;
        if (u.t === 'shield') this.shield = true;
        else if (u.t === 'magnet') this.magnet = Pw.magnetTime;
        else if (u.t === 'turbo') this.turbo = Pw.turboTime;
        else if (m.portions < m.maxPortions) m.portions++;
        else { bonus = Pw.healFullBonus; this.stats.potatoes += bonus; }
        this.events.push({ type: 'power', power: u.t, x: u.x, y: uy, bonus });
      }
    }
  }

  /** Obstacles the wheel went past without touching. */
  private checkPassed(): void {
    const m = this.m;
    for (const o of this.terrain.obstacles) {
      if (o.x > m.x) break;
      if (o.hit || o.passed) continue;
      if (m.x - m.r > o.x + this.tune.obstacles[o.t].w) {
        o.passed = true;
        if (m.inv <= 0) { this.stats.cleared[o.t]++; this.events.push({ type: 'clear', obstacle: o.t }); }
      }
    }
  }

  /** The first run: time slows before each obstacle until the player jumps. */
  private tutor(dt: number): void {
    const m = this.m, Tu = this.tune.tutorial;
    if (m.x > Tu.end) {
      this.tutorial = false; this.hint = null; this.timeScale = 1;
      this.events.push({ type: 'tutorialDone' });
      return;
    }
    let hint: Hint = null;
    for (const o of this.terrain.obstacles) {
      if (o.hit || o.passed) continue;
      const d = o.x - m.x;
      if (d > 0 && d < Tu.hintDistance && m.grounded) hint = o.t === 'tree' || o.t === 'cow' ? 'hold' : 'tap';
      break;
    }
    this.hint = hint;
    const target = hint ? Tu.slowMotion : 1;
    this.timeScale += (target - this.timeScale) * Math.min(1, dt * 10);
  }
}
