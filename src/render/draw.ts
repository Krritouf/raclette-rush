// The shapes, drawn with Canvas 2D paths (no image files): the wheel, the obstacles, the potatoes,
// the bonuses and a few icons. Each draws around (0, 0) or a given point, so the world, the HUD and
// the shop all share them.

import type { Cheese, ObstacleType, PowerType } from '../game/types';

type Ctx = CanvasRenderingContext2D;

/** The palette. */
export const COL = {
  navy: '#16324a', cream: '#fff7e0', paste: '#f6d36b', rind: '#c9832c', red: '#d52b1e',
  grass: '#6fae4f', grassDark: '#3f7a35', grassEdge: '#9fd477', potato: '#c99550', potatoDark: '#8a6233',
  pine: '#245c33', trunk: '#6b4526',
};

/**
 * A cheese wheel at (0, 0): one slice per portion, the slices lost cut away.
 * @param portions slices left
 * @param total slices of the whole wheel
 */
export function drawWheel(ctx: Ctx, c: Cheese, r: number, portions: number, total: number, angle: number): void {
  ctx.save();
  ctx.rotate(angle);
  const q = Math.PI * 2 / total;
  for (let i = 0; i < total; i++) {
    if (i >= portions) continue;
    const a0 = i * q, a1 = (i + 1) * q;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath();
    ctx.fillStyle = c.paste; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r - r * 0.09, a0 + 0.02, a1 - 0.02);
    ctx.strokeStyle = c.rind; ctx.lineWidth = r * 0.18; ctx.stroke();
    const mid = (a0 + a1) / 2;
    ctx.fillStyle = 'rgba(190,140,40,0.45)';
    for (let h = 0; h < c.holes; h++) {
      const ang = mid + (h - (c.holes - 1) / 2) * (q / Math.max(2, c.holes + 1)), d = r * (0.38 + 0.3 * ((h * 7) % 3) / 2);
      ctx.beginPath(); ctx.arc(Math.cos(ang) * d, Math.sin(ang) * d, r * (h % 2 ? 0.07 : 0.11), 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(160,110,40,0.35)'; ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); ctx.stroke();
  }
  if (c.stamp && portions > 0) {
    ctx.fillStyle = 'rgba(160,40,40,0.6)';
    ctx.font = `700 ${Math.round(r * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.stamp, 0, 0);
  }
  ctx.restore();
}

/** An obstacle standing at (0, 0), its base on the ground. */
export function drawObstacle(ctx: Ctx, t: ObstacleType): void {
  if (t === 'rock') {
    ctx.fillStyle = '#8b8f98';
    ctx.beginPath(); ctx.moveTo(-17, 2); ctx.lineTo(-13, -16); ctx.lineTo(-2, -24); ctx.lineTo(12, -19); ctx.lineTo(17, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a9adb5'; ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(-2, -21); ctx.lineTo(6, -17); ctx.lineTo(-4, -12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6d717a'; ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(12, -19); ctx.lineTo(17, 2); ctx.closePath(); ctx.fill();
  } else if (t === 'tree') {
    ctx.fillStyle = COL.trunk; ctx.fillRect(-4, -14, 8, 16);
    ctx.fillStyle = COL.pine;
    for (let i = 0; i < 3; i++) {
      const yb = -12 - i * 20, w = 17 - i * 4;
      ctx.beginPath(); ctx.moveTo(-w, yb); ctx.lineTo(0, yb - 30); ctx.lineTo(w, yb); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-5, -70); ctx.lineTo(0, -78); ctx.lineTo(5, -70); ctx.closePath(); ctx.fill();
  } else if (t === 'fence') {
    ctx.fillStyle = '#8a5a2e';
    for (const px of [-26, 0, 24]) ctx.fillRect(px - 3, -34, 6, 36);
    ctx.fillStyle = '#a8713c';
    ctx.fillRect(-28, -28, 56, 5); ctx.fillRect(-28, -15, 56, 5);
  } else {
    // an Hérens cow: black, horns, a bell
    ctx.fillStyle = '#2a1d18';
    ctx.fillRect(-30, -14, 6, 14); ctx.fillRect(-18, -14, 6, 14); ctx.fillRect(14, -14, 6, 14); ctx.fillRect(24, -14, 6, 14);
    ctx.beginPath(); ctx.ellipse(0, -28, 34, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-36, -36, 12, 10, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a4034'; ctx.beginPath(); ctx.ellipse(-44, -32, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#efe6d0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-36, -44); ctx.quadraticCurveTo(-44, -54, -38, -58); ctx.moveTo(-32, -44); ctx.quadraticCurveTo(-26, -54, -30, -58); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-38, -38, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6a72a'; ctx.beginPath(); ctx.moveTo(-31, -24); ctx.lineTo(-25, -24); ctx.lineTo(-24, -14); ctx.lineTo(-32, -14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a1d18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(34, -32); ctx.quadraticCurveTo(42, -22, 38, -12); ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

/** A potato centred on (x, y), s its scale. */
export function drawPotato(ctx: Ctx, x: number, y: number, s = 1): void {
  ctx.fillStyle = COL.potato;
  ctx.beginPath(); ctx.ellipse(x, y, 10 * s, 7.5 * s, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,200,0.35)';
  ctx.beginPath(); ctx.ellipse(x - 3 * s, y - 3 * s, 4 * s, 2.2 * s, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COL.potatoDark;
  ctx.beginPath(); ctx.arc(x - 3 * s, y + 1 * s, 1.2 * s, 0, Math.PI * 2); ctx.arc(x + 4 * s, y + 2 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
}

/** A bonus's picture centred on (0, 0), about 2 * s wide. */
export function drawPowerIcon(ctx: Ctx, t: PowerType, s: number): void {
  ctx.save();
  ctx.scale(s / 14, s / 14);
  if (t === 'shield') {
    // the raclette pan (a poêlon)
    ctx.fillStyle = '#6b4526'; ctx.fillRect(4, -2, 14, 4);
    ctx.fillStyle = '#3d4450';
    ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(6, -6); ctx.lineTo(4, 5); ctx.lineTo(-10, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6d36b'; ctx.fillRect(-10, -6, 14, 3);
  } else if (t === 'magnet') {
    ctx.lineWidth = 6; ctx.strokeStyle = '#d52b1e'; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(0, -1, 8, Math.PI, 0, true); ctx.stroke();
    ctx.fillStyle = '#d8dde4'; ctx.fillRect(-11, -1, 6, 6); ctx.fillRect(5, -1, 6, 6);
  } else if (t === 'turbo') {
    // the turbo pickle
    ctx.fillStyle = '#4f8a2b';
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 6.5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7cb342';
    for (const [x, y] of [[-6, 0], [0, -2], [5, -4], [-2, 3], [6, 1]]) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill(); }
  } else {
    // a wedge of cheese: a portion back
    ctx.fillStyle = '#f6d36b';
    ctx.beginPath(); ctx.moveTo(-11, 7); ctx.lineTo(11, 7); ctx.lineTo(11, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9832c'; ctx.fillRect(-11, 7, 22, 2.5);
    ctx.fillStyle = 'rgba(200,150,50,0.6)'; ctx.beginPath(); ctx.arc(5, 3, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d52b1e'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-6, -2); ctx.moveTo(-10, -6); ctx.lineTo(-2, -6); ctx.stroke();
  }
  ctx.restore();
}

/** A bonus floating in the world: a bobbing bubble with its picture. */
export function drawPowerBubble(ctx: Ctx, t: PowerType, x: number, y: number, time: number): void {
  const bob = Math.sin(time * 4 + x * 0.01) * 4;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.5; ctx.stroke();
  drawPowerIcon(ctx, t, 13);
  ctx.restore();
}

/** A small portion (a quarter disc) for the HUD. */
export function drawPortionIcon(ctx: Ctx, x: number, y: number, r: number, full: boolean): void {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, 0); ctx.closePath();
  ctx.fillStyle = full ? COL.paste : 'rgba(22,50,74,0.18)'; ctx.fill();
  if (full) { ctx.strokeStyle = COL.rind; ctx.lineWidth = Math.max(1.5, r * 0.22); ctx.stroke(); }
}

/** A gear, for the settings button. */
export function drawGear(ctx: Ctx, x: number, y: number, r: number, col: string): void {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { ctx.rect(-r * 0.18, -r, r * 0.36, r * 0.4); ctx.rotate(Math.PI / 4); }
  ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Two bars, for the pause button. */
export function drawPauseIcon(ctx: Ctx, x: number, y: number, r: number, col: string): void {
  ctx.fillStyle = col;
  ctx.fillRect(x - r * 0.55, y - r * 0.7, r * 0.38, r * 1.4);
  ctx.fillRect(x + r * 0.17, y - r * 0.7, r * 0.38, r * 1.4);
}

/** A rounded rectangle path. */
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
