// The world on screen: the sky, three layers of far mountains, the slope, the trees, the potatoes,
// the bonuses, the obstacles and the wheel, seen through a camera that follows the wheel.

import type { Run } from '../game/run';
import { COL, drawObstacle, drawPotato, drawPowerBubble, drawPowerIcon, drawWheel } from './draw';
import type { Fx } from './fx';

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

/** Follows the wheel, a little ahead of it as it speeds up. */
export class Camera {
  x = 0; y = 0;

  /** Jumps straight to the wheel. */
  snap(run: Run, v: View): void { this.x = this.tx(run, v); this.y = this.ty(run, v); }

  follow(run: Run, v: View, dt: number): void {
    this.x += (this.tx(run, v) - this.x) * Math.min(1, dt * 7);
    this.y += (this.ty(run, v) - this.y) * Math.min(1, dt * 5);
  }

  private tx(run: Run, v: View): number { return run.m.x - (v.W / v.S) * (0.3 - Math.min(0.1, run.m.vx / 9000)); }
  private ty(run: Run, v: View): number { return run.m.y - (v.H / v.S) * 0.45; }
}

function mountains(ctx: CanvasRenderingContext2D, width: number, height: number, off: number, base: number, amp: number, col: string, snow: boolean, seed: number): void {
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let sx = 0; sx <= width + 20; sx += 10) {
    const x = sx + off;
    const h = Math.abs(Math.sin(x * 0.004 + seed)) * amp + Math.abs(Math.sin(x * 0.011 + seed * 2)) * amp * 0.4;
    ctx.lineTo(sx, base - h);
  }
  ctx.lineTo(width + 20, height); ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  if (snow) {
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, 0, width + 20, base - amp * 0.95);
    ctx.restore();
  }
}

/** Draws the whole world for this frame. */
export function drawWorld(ctx: CanvasRenderingContext2D, v: View, cam: Camera, run: Run, fx: Fx, time: number, tr: (s: string) => string): void {
  const { W, H, dpr, S } = v;
  const viewW = W / S, viewH = H / S;
  const T = run.terrain, m = run.m;

  // the sky
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#6fb2e6'); sky.addColorStop(1, '#d8eefc');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // far mountains: scaled to the screen's height, slow parallax
  const Sb = H / 600, bw = W / Sb;
  ctx.setTransform(dpr * Sb, 0, 0, dpr * Sb, 0, 0);
  ctx.fillStyle = 'rgba(255,250,220,0.9)';
  ctx.beginPath(); ctx.arc(bw * 0.8, 80, 28, 0, Math.PI * 2); ctx.fill();
  const py = Math.max(-60, Math.min(60, -cam.y * 0.01));
  mountains(ctx, bw, 600, cam.x * 0.05, 330 + py, 190, '#8aa6c4', true, 1.3);
  mountains(ctx, bw, 600, cam.x * 0.12, 420 + py * 2, 140, '#6f8fae', true, 4.1);
  mountains(ctx, bw, 600, cam.x * 0.25, 520 + py * 3, 90, '#5d8a5f', false, 2.2);

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
    const by = T.groundAt(d.x) + 6;
    ctx.fillStyle = 'rgba(36,92,51,0.55)';
    ctx.beginPath(); ctx.moveTo(d.x - 14 * d.s, by); ctx.lineTo(d.x, by - 60 * d.s); ctx.lineTo(d.x + 14 * d.s, by); ctx.closePath(); ctx.fill();
  }

  // the slope, with the flat top where the wheel waits (x < 0)
  const bottom = cam.y + viewH + 50, x0 = Math.min(i0 * step, cam.x - 20);
  if (cam.x < 0) drawChalet(ctx, -150, T.gy[0]);
  ctx.beginPath();
  ctx.moveTo(x0, bottom);
  ctx.lineTo(x0, T.gy[0]);
  for (let i = i0; i <= i1; i++) ctx.lineTo(i * step, T.gy[i]);
  ctx.lineTo(i1 * step, bottom); ctx.closePath();
  const gg = ctx.createLinearGradient(0, cam.y, 0, cam.y + viewH);
  gg.addColorStop(0, COL.grass); gg.addColorStop(1, COL.grassDark);
  ctx.fillStyle = gg; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0, T.gy[0]);
  for (let i = i0; i <= i1; i++) ctx.lineTo(i * step, T.gy[i]);
  ctx.strokeStyle = COL.grassEdge; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();

  for (const p of T.potatoes) {
    if (p.got || !inView(p.fx ?? p.x, 20)) continue;
    drawPotato(ctx, p.fx ?? p.x, p.fy ?? T.groundAt(p.x) - p.dy);
  }
  for (const u of T.powerups) {
    if (u.got || !inView(u.x, 30)) continue;
    drawPowerBubble(ctx, u.t, u.x, T.groundAt(u.x) - u.dy, time);
  }
  for (const o of T.obstacles) {
    if (!inView(o.x, 120)) continue;
    const def = run.tune.obstacles[o.t], bx = o.x + def.w / 2;
    ctx.save();
    ctx.translate(bx, T.groundAt(bx));
    if (o.hit) ctx.rotate(Math.min(1.3, o.rot) * (o.t === 'rock' ? 0.3 : 1));
    drawObstacle(ctx, o.t);
    ctx.restore();
  }

  if (run.state !== 'dead') drawPlayer(ctx, run, time);

  for (const d of T.deco) {
    if (d.back || !inView(d.x, 50)) continue;
    const by = T.groundAt(d.x) + 40;
    ctx.fillStyle = '#1f4f2b';
    ctx.beginPath(); ctx.moveTo(d.x - 12 * d.s, by); ctx.lineTo(d.x, by - 50 * d.s); ctx.lineTo(d.x + 12 * d.s, by); ctx.closePath(); ctx.fill();
  }

  fx.draw(ctx, tr);

  // speed lines
  const sp = Math.hypot(m.vx, m.vy);
  if (run.state === 'play' && sp > 600) {
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.8, (sp - 600) / 900)})`; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const ly = m.y + Math.random() * 100 - 60, lx = m.x - 40 - Math.random() * 120;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 30 - Math.random() * 40, ly - 8); ctx.stroke();
    }
  }
}

/** The wheel, with what its bonuses add: the pan's ring, the magnet's waves, the turbo's flames. */
function drawPlayer(ctx: CanvasRenderingContext2D, run: Run, time: number): void {
  const m = run.m;
  ctx.save();
  ctx.translate(m.x, m.y);
  if (run.turbo > 0) {
    for (let i = 0; i < 6; i++) {
      const k = (time * 8 + i) % 6 / 6;
      ctx.fillStyle = `rgba(${120 + 100 * k | 0},${200 - 60 * k | 0},60,${0.6 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(-m.r * 0.6 - k * 50, Math.sin(i * 2 + time * 20) * 6, m.r * (0.8 - k * 0.5), 0, Math.PI * 2); ctx.fill();
    }
  }
  if (run.magnet > 0) {
    const k = (time * 1.5) % 1;
    ctx.strokeStyle = `rgba(213,43,30,${0.5 * (1 - k) * Math.min(1, run.magnet)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, m.r + 8 + k * 50, 0, Math.PI * 2); ctx.stroke();
  }
  if (m.inv > 0 && Math.floor(m.inv * 20) % 2) ctx.globalAlpha = 0.5;
  drawWheel(ctx, run.cheese, m.r, m.portions, m.maxPortions, m.a);
  ctx.globalAlpha = 1;
  if (run.shield) {
    ctx.strokeStyle = 'rgba(220,230,240,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, m.r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(0, -m.r - 14); drawPowerIcon(ctx, 'shield', 8); ctx.restore();
  }
  if (run.turbo > 0) {
    ctx.strokeStyle = 'rgba(160,230,90,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, m.r + 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** The chalet at the top, where the run starts: its base at (x, y). */
function drawChalet(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#8a5a2e'; ctx.fillRect(-60, -70, 120, 72);
  ctx.fillStyle = '#6b4526';
  for (let i = 0; i < 6; i++) ctx.fillRect(-60, -66 + i * 12, 120, 2);
  ctx.fillStyle = '#5a3a20';
  ctx.beginPath(); ctx.moveTo(-78, -66); ctx.lineTo(0, -122); ctx.lineTo(78, -66); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-70, -70); ctx.lineTo(0, -120); ctx.lineTo(70, -70); ctx.lineTo(58, -70); ctx.lineTo(0, -110); ctx.lineTo(-58, -70); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fbe7a1'; ctx.fillRect(-40, -52, 22, 20); ctx.fillRect(18, -52, 22, 20);
  ctx.fillStyle = '#d52b1e'; ctx.fillRect(-46, -32, 34, 6); ctx.fillRect(12, -32, 34, 6);
  ctx.fillStyle = '#4a2e18'; ctx.fillRect(-10, -40, 20, 42);
  // the Swiss flag on the roof
  ctx.fillStyle = '#6b4526'; ctx.fillRect(-2, -156, 3, 38);
  ctx.fillStyle = '#d52b1e'; ctx.fillRect(1, -156, 20, 16);
  ctx.fillStyle = '#fff'; ctx.fillRect(9, -153, 4, 10); ctx.fillRect(6, -150, 10, 4);
  ctx.restore();
}
