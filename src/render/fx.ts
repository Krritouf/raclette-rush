// The effects that only look: flying crumbs, words popping up over the wheel, the screen shake.
// They use Math.random, never the run's Rng, so they never change the game.

import { DISPLAY, INK } from './art';

/** A crumb, a snowflake or a splinter. */
interface Particle { x: number; y: number; vx: number; vy: number; life: number; c: string; sz: number }

/** A word that floats up and fades. */
interface PopText { x: number; y: number; s: string; col: string; life: number; size: number }

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/** The effects of the world, in world units. */
export class Fx {
  particles: Particle[] = [];
  texts: PopText[] = [];
  shake = 0;

  /** n particles from (x, y), upward, in the given colours. */
  burst(x: number, y: number, cols: string[], n: number, spd: number): void {
    for (let i = 0; i < n; i++) {
      const a = rnd(-Math.PI, 0), s = rnd(spd * 0.3, spd);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.4, 0.9), c: cols[i % cols.length], sz: rnd(3, 6) });
    }
  }

  /** A word over (x, y). */
  pop(x: number, y: number, s: string, col = '#fff', size = 18): void {
    this.texts.push({ x, y, s, col, life: 1.1, size });
  }

  update(dt: number): void {
    for (const q of this.particles) { q.vy += 1100 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    this.particles = this.particles.filter(q => q.life > 0);
    for (const t of this.texts) { t.y -= 50 * dt; t.life -= dt; }
    this.texts = this.texts.filter(t => t.life > 0);
    this.shake = Math.max(0, this.shake - dt);
  }

  /** Draws the particles and words; tr translates the words. */
  draw(ctx: CanvasRenderingContext2D, tr: (s: string) => string): void {
    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, q.life * 1.5));
      ctx.fillStyle = q.c; ctx.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life));
      ctx.font = `${t.size}px ${DISPLAY}`;
      const s = tr(t.s);
      ctx.lineJoin = 'round'; ctx.lineWidth = t.size * 0.28; ctx.strokeStyle = INK; ctx.strokeText(s, t.x, t.y);
      ctx.fillStyle = t.col; ctx.fillText(s, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void { this.particles = []; this.texts = []; this.shake = 0; }
}
