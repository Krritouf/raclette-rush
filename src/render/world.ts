// The world on screen, in the look of src/render/art.ts: the sky, three ranges of mountains (drawn
// once into repeating strips, then scrolled), clouds, the slope with its grass and flowers, the
// trees, the potatoes, the bonuses, the obstacles and the wheel, seen through a camera that
// follows the wheel.

import type { Run } from '../game/run';
import {
  INK, artChalet, artCloud, artCow, artFarFir, artFeast, artFence, artFinishArch, artFir, artFlower, artPotato, artPowerBubble, artPowerIcon,
  artRangeTile, artRock, artSky, artWheel,
} from './art';
import type { Fx } from './fx';

type Ctx = CanvasRenderingContext2D;

/** The screen: its size in CSS pixels, the pixel ratio, and the world's scale. */
export interface View {
  W: number; H: number; dpr: number;
  /** World units to CSS pixels. */
  S: number;
}

/** The world's visible height and width, in world units, at least. */
export const WORLD_H = 540, WORLD_W = 700;

/** The world's scale for a screen: the slope must fit both ways. */
export function worldScale(W: number, H: number): number {
  return Math.min(H / WORLD_H, W / WORLD_W);
}

/** Follows the wheel, a little ahead of it as it speeds up; past a level's finish line, it frames the feast and zooms in. */
export class Camera {
  x = 0; y = 0;
  /** 1 in play; up to FEAST_ZOOM while the guests cheer. */
  zoom = 1;

  /** Jumps straight to the wheel. */
  snap(run: Run, v: View): void { this.zoom = 1; this.x = this.tx(run, v); this.y = this.ty(run, v); }

  follow(run: Run, v: View, dt: number): void {
    // as close as the screen allows with the arch and the whole table in view
    const feast = Math.max(1, Math.min(FEAST_ZOOM, (v.W / v.S) / FEAST_WIDTH));
    this.zoom += ((run.state === 'won' ? feast : 1) - this.zoom) * Math.min(1, dt * 2.5);
    const k = run.state === 'won' ? 1.5 : 1;
    this.x += (this.tx(run, v) - this.x) * Math.min(1, dt * 7 / k);
    this.y += (this.ty(run, v) - this.y) * Math.min(1, dt * 5 / k);
  }

  private tx(run: Run, v: View): number {
    const vw = v.W / (v.S * this.zoom);
    if (run.state === 'won') return (run.finishX + run.tableX) / 2 + 30 - vw / 2;
    return run.m.x - vw * (0.3 - Math.min(0.1, run.m.vx / 9000));
  }
  private ty(run: Run, v: View): number {
    const vh = v.H / (v.S * this.zoom);
    if (run.state === 'won') return run.terrain.groundAt(run.tableX) - vh * 0.68;
    return run.m.y - vh * 0.45;
  }
}

/** How close the camera comes for the feast, at most, and the width it keeps in view (the arch to the table's end). */
const FEAST_ZOOM = 1.45, FEAST_WIDTH = 820;

/** A number in [0, 1) that is always the same for the same n: places the grass and flowers. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- the mountains, drawn once per screen size ----------
/** The backdrop is 600 units tall, scaled to the screen's height; a strip repeats every PERIOD. */
const BACK_H = 600, PERIOD = 1800;
/** Extra height under each strip, so a strip lifted by the camera never shows the sky under it. */
const BACK_EXTRA = 260;
const RANGES = [
  { base: 300, height: 200, col: '#8ea9c8', snow: 0.42, seed: 3, parallax: 0.05, firs: false },
  { base: 372, height: 146, col: '#6f8fb0', snow: 0.3, seed: 11, parallax: 0.12, firs: false },
  { base: 480, height: 92, col: '#5f8f5a', snow: 0, seed: 21, parallax: 0.25, firs: true },
];

class Backdrop {
  private key = '';
  private strips: HTMLCanvasElement[] = [];
  private scale = 1;

  /** The strips for this screen, made again when its height or pixel ratio changes. */
  ensure(H: number, dpr: number): void {
    const q = Math.min(dpr, 1.5), sb = H / BACK_H, key = `${H}x${q}`;
    if (key === this.key) return;
    this.key = key; this.scale = sb * q;
    this.strips = RANGES.map(r => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(PERIOD * this.scale); c.height = Math.ceil((BACK_H + BACK_EXTRA) * this.scale);
      const g = c.getContext('2d')!;
      g.scale(this.scale, this.scale);
      artRangeTile(g, PERIOD, r.base, r.height, r.col, r.snow, r.seed);
      if (r.firs) {
        for (let i = 0; i < 30; i++) {
          const x = (i + hash(i) * 0.6) * PERIOD / 30, h = 34 + hash(i + 50) * 22;
          for (const dx of [0, PERIOD, -PERIOD]) { g.save(); g.translate(x + dx, r.base + 6 - hash(i + 9) * 14); artFarFir(g, h, i % 2 ? '#3f7048' : '#356541'); g.restore(); }
        }
      }
      return c;
    });
  }

  /** Draws the ranges for a camera at (camX, camY), in CSS pixels. */
  draw(ctx: Ctx, v: View, camX: number, camY: number): void {
    const sb = v.H / BACK_H, py = Math.max(-60, Math.min(60, -camY * 0.01));
    this.strips.forEach((c, i) => {
      const r = RANGES[i], w = PERIOD * sb, h = (BACK_H + BACK_EXTRA) * sb;
      const off = ((camX * r.parallax) % PERIOD + PERIOD) % PERIOD;
      for (let x = -off * sb; x < v.W; x += w) ctx.drawImage(c, x, py * (i + 1), w, h);
    });
  }
}
const backdrop = new Backdrop();

// ---------- the slope ----------
function drawSlope(ctx: Ctx, run: Run, i0: number, i1: number, x0: number, bottom: number, top: number): void {
  const T = run.terrain, step = run.tune.terrain.step;
  const ground = new Path2D(), line = new Path2D();
  ground.moveTo(x0, bottom); ground.lineTo(x0, T.gy[0]);
  line.moveTo(x0, T.gy[0]);
  for (let i = i0; i <= i1; i++) { ground.lineTo(i * step, T.gy[i]); line.lineTo(i * step, T.gy[i]); }
  ground.lineTo(i1 * step, bottom); ground.closePath();
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#79c055'); g.addColorStop(0.35, '#57a043'); g.addColorStop(1, '#2f6e2f');
  ctx.fillStyle = g; ctx.fill(ground);
  ctx.save(); ctx.clip(ground);
  // soft lighter patches, fixed to the ground
  for (let i = i0 - (i0 % 3); i <= i1; i += 3) {
    if (i < 0) continue;
    ctx.fillStyle = 'rgba(160,220,110,0.12)';
    ctx.beginPath(); ctx.ellipse(i * step + hash(i) * 20, T.gy[i] + 30 + hash(i + 1) * 120, 30 + hash(i + 2) * 30, 8 + hash(i + 3) * 6, -0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineJoin = 'round';
  ctx.translate(0, 10); ctx.strokeStyle = 'rgba(30,80,30,0.35)'; ctx.lineWidth = 16; ctx.stroke(line);
  ctx.restore();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3f8a35'; ctx.lineWidth = 7; ctx.stroke(line);
  ctx.save(); ctx.translate(0, -1.5); ctx.strokeStyle = '#b4e57c'; ctx.lineWidth = 3.5; ctx.stroke(line); ctx.restore();
  // grass tufts and flowers along the edge
  ctx.lineCap = 'round';
  for (let i = Math.max(0, i0); i < i1; i++) {
    const xa = i * step, ya = T.gy[i], xb = xa + step, yb = T.gy[i + 1];
    for (let k = 0; k < 2; k++) {
      const h = hash(i * 2 + k), t = hash(i * 2 + k + 0.5), x = xa + (xb - xa) * t, y = ya + (yb - ya) * t;
      if (h < 0.5) {
        ctx.strokeStyle = h < 0.25 ? '#3f8a35' : '#8fd062'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x - 3, y + 1); ctx.lineTo(x - 5, y - 5); ctx.moveTo(x, y + 1); ctx.lineTo(x, y - 7); ctx.moveTo(x + 3, y + 1); ctx.lineTo(x + 5, y - 5); ctx.stroke();
      } else if (h < 0.58) artFlower(ctx, x, y, 'edelweiss');
      else if (h < 0.65) artFlower(ctx, x, y, 'gentian');
      else if (h < 0.7) artFlower(ctx, x, y, 'buttercup');
    }
  }
}

/** Draws the whole world for this frame. */
export function drawWorld(ctx: Ctx, v: View, cam: Camera, run: Run, fx: Fx, time: number, tr: (s: string) => string): void {
  const { W, H, dpr } = v, S = v.S * cam.zoom;
  const viewW = W / S, viewH = H / S;
  const T = run.terrain, m = run.m;

  // the sky, the clouds and the mountains, in CSS pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  artSky(ctx, W, H, W * 0.8, H * 0.16);
  const sb = H / BACK_H;
  for (let i = 0; i < 5; i++) {
    const period = 2600, x = (((i * 560 + hash(i) * 200 - cam.x * 0.02) % period) + period) % period - 200;
    ctx.save(); ctx.translate(x * sb, (60 + hash(i + 7) * 90) * sb); ctx.scale(sb * (0.7 + hash(i + 3) * 0.6), sb * (0.7 + hash(i + 3) * 0.6)); artCloud(ctx); ctx.restore();
  }
  backdrop.ensure(H, dpr);
  backdrop.draw(ctx, v, cam.x, cam.y);

  // the world
  let sx = 0, sy = 0;
  if (fx.shake > 0) { sx = (Math.random() * 12 - 6) * fx.shake; sy = (Math.random() * 12 - 6) * fx.shake; }
  ctx.setTransform(dpr * S, 0, 0, dpr * S, (-cam.x + sx) * dpr * S, (-cam.y + sy) * dpr * S);

  const step = run.tune.terrain.step;
  const i0 = Math.max(0, Math.floor(cam.x / step) - 1);
  const i1 = Math.ceil((cam.x + viewW) / step) + 2;
  T.genTo(i1 * step);
  const inView = (x: number, pad: number): boolean => x > cam.x - pad && x < cam.x + viewW + pad;

  for (const d of T.deco) {
    if (!d.back || !inView(d.x, 50)) continue;
    ctx.save(); ctx.translate(d.x, T.groundAt(d.x) + 6); ctx.globalAlpha = 0.85; artFarFir(ctx, 64 * d.s, '#3f7048'); ctx.restore();
  }
  if (cam.x < 200) { ctx.save(); ctx.translate(-170, T.gy[0] + 2); ctx.scale(0.9, 0.9); artChalet(ctx, time); ctx.restore(); }

  drawSlope(ctx, run, i0, i1, Math.min(i0 * step, cam.x - 20), cam.y + viewH + 50, cam.y);

  for (const p of T.potatoes) {
    if (p.got || !inView(p.fx ?? p.x, 20)) continue;
    ctx.save(); ctx.translate(p.fx ?? p.x, p.fy ?? T.groundAt(p.x) - p.dy); ctx.rotate((hash(p.x) - 0.5) * 0.8); ctx.scale(0.9, 0.9); artPotato(ctx); ctx.restore();
  }
  for (const u of T.powerups) {
    if (u.got || !inView(u.x, 40)) continue;
    ctx.save(); ctx.translate(u.x, T.groundAt(u.x) - u.dy + Math.sin(time * 4 + u.x * 0.01) * 4); artPowerBubble(ctx, u.t, time); ctx.restore();
  }
  if (run.level) {
    // the end of the level: the arch over a chequered line, then the feast
    if (inView(run.finishX, 140)) {
      ctx.save(); ctx.translate(run.finishX, T.groundAt(run.finishX));
      for (let c = 0; c < 2; c++) for (let r = 0; r < 3; r++) { ctx.fillStyle = (c + r) % 2 ? '#ffffff' : INK; ctx.fillRect(-6 + c * 6, -2 + r * 6, 6, 6); }
      artFinishArch(ctx, tr('ARRIVÉE'), time);
      ctx.restore();
    }
    if (inView(run.tableX, 220)) {
      ctx.save(); ctx.translate(run.tableX, T.groundAt(run.tableX)); artFeast(ctx, time, run.state === 'won'); ctx.restore();
    }
  }
  for (const o of T.obstacles) {
    if (!inView(o.x, 120)) continue;
    const def = run.tune.obstacles[o.t], bx = o.x + def.w / 2;
    ctx.save();
    ctx.translate(bx, T.groundAt(bx));
    if (o.hit) ctx.rotate(Math.min(1.3, o.rot) * (o.t === 'rock' ? 0.3 : 1));
    if (o.t === 'rock') artRock(ctx);
    else if (o.t === 'fence') artFence(ctx);
    else if (o.t === 'tree') artFir(ctx);
    else artCow(ctx, o.variant === 1);
    ctx.restore();
  }

  if (run.state !== 'dead') drawPlayer(ctx, run, time);

  for (const d of T.deco) {
    if (d.back || !inView(d.x, 50)) continue;
    ctx.save(); ctx.translate(d.x, T.groundAt(d.x) + 40); artFarFir(ctx, 56 * d.s, '#1f4a2a'); ctx.restore();
  }

  fx.draw(ctx, tr);

  // speed lines
  const sp = Math.hypot(m.vx, m.vy);
  if (run.state === 'play' && sp > 600) {
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.8, (sp - 600) / 900)})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ly = m.y + Math.random() * 60 - 35, lx = m.x - 30 - Math.random() * 60;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 30 - Math.random() * 40, ly - 8); ctx.stroke();
    }
  }
}

/** The wheel, with what its bonuses add: the pan's ring, the magnet's waves, the turbo's flames. */
function drawPlayer(ctx: Ctx, run: Run, time: number): void {
  const m = run.m;
  ctx.save();
  ctx.translate(m.x, m.y);
  if (run.turbo > 0) {
    for (let i = 0; i < 6; i++) {
      const k = (time * 8 + i) % 6 / 6;
      ctx.fillStyle = `rgba(${120 + 100 * k | 0},${220 - 60 * k | 0},70,${0.6 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(-m.r * 0.6 - k * 50, Math.sin(i * 2 + time * 20) * 6, m.r * (0.8 - k * 0.5), 0, Math.PI * 2); ctx.fill();
    }
  }
  if (run.magnet > 0) {
    const k = (time * 1.5) % 1;
    ctx.strokeStyle = `rgba(255,106,90,${0.6 * (1 - k) * Math.min(1, run.magnet)})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, m.r + 8 + k * 50, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(30,50,20,0.2)';
  if (m.grounded) { ctx.beginPath(); ctx.ellipse(0, m.r - 1, m.r * 0.9, m.r * 0.18, 0, 0, Math.PI * 2); ctx.fill(); }
  if (m.inv > 0 && Math.floor(m.inv * 20) % 2) ctx.globalAlpha = 0.5;
  artWheel(ctx, run.cheese.id, m.r, m.portions, m.maxPortions, m.a);
  ctx.globalAlpha = 1;
  if (run.shield) {
    ctx.strokeStyle = 'rgba(255,211,90,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, m.r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(0, -m.r - 16); ctx.scale(0.6, 0.6); artPowerIcon(ctx, 'shield'); ctx.restore();
  }
  if (run.turbo > 0) {
    ctx.strokeStyle = 'rgba(143,224,90,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, m.r + 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
