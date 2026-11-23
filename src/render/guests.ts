// The feast at the end of an Adventure level: seven friends drawn after the owner's photo, standing
// behind a long table with the raclette machine. Each friend stands with the ground at (0, 0) and the
// table top at y = -40. tools/art/sheet.ts draws them on a sheet (design/art/convives-*.png).

import { INK, artPotato, dark, light, mix as mixHex } from './art';

type Ctx = CanvasRenderingContext2D;

/** One friend at the table. */
export interface Friend {
  /** What they look like, for the sheet (a description, not a name). */
  label: string;
  skin: string;
  /** 1 for an average adult. */
  height: number;
  hair: { style: 'curly' | 'bald' | 'long' | 'bob' | 'bun' | 'short'; color: string; grey?: string };
  beard?: { style: 'long' | 'short' | 'stubble'; color: string; grey?: string };
  glasses?: { frame: string; clear?: boolean; big?: boolean };
  hat?: boolean;
  top: { kind: 'hoodie' | 'jacket' | 'puffer' | 'denim' | 'top'; color: string; under?: string };
  scarf?: { color: string; color2: string; knit?: boolean };
  necklace?: boolean;
  /** Raises a V with one hand when cheering. */
  peace?: boolean;
}

/** The space between two friends at the table, and the table's half width. */
export const FRIEND_GAP = 46;
export const FEAST_HALF_WIDTH = (7 * FRIEND_GAP) / 2 + 10;

/** The seven friends of the photo, left to right at the table. */
export const FRIENDS: Friend[] = [
  { label: 'Chapeau et longue barbe', skin: '#e9b896', height: 1.0,
    hair: { style: 'short', color: '#3a2a20' }, hat: true, beard: { style: 'long', color: '#2e231e', grey: '#6d625a' },
    glasses: { frame: '#1d1d1f' }, top: { kind: 'jacket', color: '#6b6a45', under: '#2b2b2b' } },
  { label: 'Frange et lunettes claires', skin: '#f0c4a4', height: 0.88,
    hair: { style: 'bob', color: '#3b2419' }, glasses: { frame: '#e7c9c9', clear: true, big: true },
    top: { kind: 'denim', color: '#7a9cc6' }, scarf: { color: '#cf2e2b', color2: '#e85a4f', knit: true }, peace: true },
  { label: 'Boucles et lunettes', skin: '#e3ab84', height: 1.06,
    hair: { style: 'curly', color: '#3a2618' }, beard: { style: 'short', color: '#3a2618' }, glasses: { frame: '#141414' },
    top: { kind: 'jacket', color: '#26262b', under: '#d9a441' }, peace: true },
  { label: 'Cheveux longs et foulard', skin: '#e8b48f', height: 0.9,
    hair: { style: 'long', color: '#2b1d17' }, top: { kind: 'top', color: '#2c2f3a' }, scarf: { color: '#1f6f99', color2: '#7cc3e0' } },
  { label: 'Crâne rasé et barbe grise', skin: '#e2aa86', height: 1.04,
    hair: { style: 'bald', color: '#8b7f75' }, beard: { style: 'short', color: '#7d7068', grey: '#a69a90' },
    top: { kind: 'hoodie', color: '#232327' }, peace: true },
  { label: 'Chignon blond et lunettes', skin: '#eab995', height: 0.92,
    hair: { style: 'bun', color: '#b8935e', grey: '#7d6040' }, glasses: { frame: '#1a1a1a' },
    top: { kind: 'top', color: '#1e1e22' }, necklace: true },
  { label: 'Barbe de trois jours', skin: '#e6b08c', height: 1.08,
    hair: { style: 'short', color: '#5b4637', grey: '#8f8378' }, beard: { style: 'stubble', color: '#6a5a4c', grey: '#9a8f86' },
    top: { kind: 'puffer', color: '#202024' } },
];

function stroke(ctx: Ctx, w = 2): void { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = w; ctx.stroke(); }
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A hand at (x, y): an open hand, or a V for victory. */
function hand(ctx: Ctx, x: number, y: number, skin: string, peace: boolean, side: number): void {
  if (peace) {
    for (const a of [-0.28, 0.28]) {
      ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x + Math.sin(a) * 9 * side, y - 9);
      ctx.strokeStyle = INK; ctx.lineWidth = 4.6; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = skin; ctx.lineWidth = 2.6; ctx.stroke();
    }
  }
  ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill(); stroke(ctx, 1.6);
}

/**
 * A friend behind the table.
 * @param arms 0: hands on the table; 1: raised above the head
 * @param cheering the wheel has arrived: big smiles, eyes on us
 */
export function friend(ctx: Ctx, f: Friend, arms: number, cheering: boolean): void {
  const headR = 13, top = -40 - 76 * f.height, hy = top + headR, shoulderY = hy + headR + 5;
  const look = cheering ? 0 : -1.6;
  ctx.save();
  if (cheering) ctx.translate(0, -arms * 4);

  // hair that falls behind the body
  if (f.hair.style === 'long') {
    ctx.beginPath(); ctx.moveTo(-15, hy - 4); ctx.quadraticCurveTo(-19, shoulderY + 14, -15, shoulderY + 30);
    ctx.lineTo(15, shoulderY + 30); ctx.quadraticCurveTo(19, shoulderY + 14, 15, hy - 4); ctx.closePath();
    ctx.fillStyle = f.hair.color; ctx.fill(); stroke(ctx, 1.8);
  } else if (f.hair.style === 'bob') {
    ctx.beginPath(); ctx.moveTo(-16, hy - 3); ctx.quadraticCurveTo(-18, hy + 15, -13, hy + 17); ctx.lineTo(13, hy + 17);
    ctx.quadraticCurveTo(18, hy + 15, 16, hy - 3); ctx.closePath();
    ctx.fillStyle = f.hair.color; ctx.fill(); stroke(ctx, 1.8);
  } else if (f.hair.style === 'curly') {
    ctx.fillStyle = f.hair.color;
    for (const [x, y, r] of [[-15, hy - 2, 7], [15, hy - 2, 7], [-16, hy + 6, 5.5], [16, hy + 6, 5.5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); stroke(ctx, 1.4); ctx.fill(); }
  }

  // the arms (behind the body when down)
  const reach = (side: number, up: boolean): { sx: number; sy: number; ex: number; ey: number; hx: number; hy2: number } => {
    const a = up ? arms : 0;
    return { sx: side * 12, sy: shoulderY + 4, ex: side * lerp(18, 20, a), ey: lerp(shoulderY + 17, shoulderY - 12, a),
      hx: side * lerp(15, 19, a), hy2: lerp(-43, top - 12, a) };
  };
  for (const side of [-1, 1]) {
    const p = reach(side, true);
    const sleeve = f.top.kind === 'denim' ? f.top.color : f.top.color;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.ex, p.ey); ctx.lineTo(p.hx, p.hy2); ctx.stroke();
    ctx.strokeStyle = sleeve; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.ex, p.ey); ctx.lineTo(lerp(p.ex, p.hx, 0.75), lerp(p.ey, p.hy2, 0.75)); ctx.stroke();
    hand(ctx, p.hx, p.hy2, f.skin, !!f.peace && side === 1 && cheering && arms > 0.5, side);
  }

  // the body and its clothes
  const body = (): void => {
    ctx.beginPath(); ctx.moveTo(-16, -30); ctx.lineTo(-15, shoulderY + 6); ctx.quadraticCurveTo(-14, shoulderY - 1, -6, shoulderY - 1);
    ctx.lineTo(6, shoulderY - 1); ctx.quadraticCurveTo(14, shoulderY - 1, 15, shoulderY + 6); ctx.lineTo(16, -30); ctx.closePath();
  };
  body();
  const g = ctx.createLinearGradient(-16, 0, 16, 0); g.addColorStop(0, light(f.top.color, 0.15)); g.addColorStop(1, dark(f.top.color, 0.2));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); body(); ctx.clip();
  if (f.top.under) { // an open jacket over a T-shirt
    ctx.fillStyle = f.top.under; ctx.beginPath(); ctx.moveTo(-6, shoulderY); ctx.lineTo(6, shoulderY); ctx.lineTo(5, -30); ctx.lineTo(-5, -30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark(f.top.color, 0.35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, shoulderY); ctx.lineTo(-5, -30); ctx.moveTo(6, shoulderY); ctx.lineTo(5, -30); ctx.stroke();
  }
  if (f.top.kind === 'puffer') { // quilted lines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.2;
    for (let y = shoulderY + 6; y < -30; y += 7) { ctx.beginPath(); ctx.moveTo(-16, y); ctx.quadraticCurveTo(0, y + 2, 16, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.moveTo(0, shoulderY + 2); ctx.lineTo(0, -30); ctx.stroke();
  }
  if (f.top.kind === 'hoodie') { // the hood and its strings
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-3, shoulderY + 2); ctx.lineTo(-4, shoulderY + 12); ctx.moveTo(3, shoulderY + 2); ctx.lineTo(4, shoulderY + 12); ctx.stroke();
  }
  if (f.top.kind === 'denim') { // seams and a pocket
    ctx.strokeStyle = '#e0c27a'; ctx.lineWidth = 0.9; ctx.setLineDash([2, 1.5]);
    ctx.beginPath(); ctx.moveTo(-14, shoulderY + 12); ctx.lineTo(-4, shoulderY + 12); ctx.moveTo(4, shoulderY + 12); ctx.lineTo(14, shoulderY + 12); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  body(); stroke(ctx, 2);
  if (f.top.kind === 'hoodie') { // the hood behind the neck
    ctx.beginPath(); ctx.ellipse(0, shoulderY + 1, 10, 4, 0, 0, Math.PI * 2); ctx.fillStyle = dark(f.top.color, 0.15); ctx.fill(); stroke(ctx, 1.6);
  }
  if (f.necklace) {
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-6, shoulderY); ctx.quadraticCurveTo(0, shoulderY + 14, 6, shoulderY); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, shoulderY + 10, 1.6, 2.4, 0, 0, Math.PI * 2); ctx.fillStyle = '#d9a441'; ctx.fill(); stroke(ctx, 0.9);
  }
  if (f.scarf) { // wrapped round the neck, the ends hanging
    const s = f.scarf;
    ctx.beginPath(); ctx.ellipse(0, shoulderY + 2, 13, 5.5, 0, 0, Math.PI * 2); ctx.fillStyle = s.color; ctx.fill(); stroke(ctx, 1.6);
    ctx.beginPath(); ctx.moveTo(-9, shoulderY + 4); ctx.lineTo(-12, shoulderY + 26); ctx.lineTo(-3, shoulderY + 26); ctx.lineTo(-2, shoulderY + 5); ctx.closePath();
    ctx.fillStyle = s.color; ctx.fill(); stroke(ctx, 1.6);
    ctx.strokeStyle = s.color2; ctx.lineWidth = 1.2;
    if (s.knit) { for (let y = shoulderY + 9; y < shoulderY + 25; y += 3) { ctx.beginPath(); ctx.moveTo(-10.5, y); ctx.lineTo(-3, y); ctx.stroke(); } }
    else { // swirls
      for (const [x, y] of [[-6, shoulderY + 3], [5, shoulderY + 1], [-7, shoulderY + 14], [-6, shoulderY + 21]]) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 1.5); ctx.stroke(); }
    }
  }

  // the head
  ctx.beginPath(); ctx.arc(0, hy, headR, 0, Math.PI * 2); ctx.fillStyle = f.skin; ctx.fill(); stroke(ctx, 2);
  // ears
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * headR, hy + 1, 2.6, 3.6, 0, 0, Math.PI * 2); ctx.fillStyle = f.skin; ctx.fill(); stroke(ctx, 1.4); }
  ctx.beginPath(); ctx.arc(0, hy, headR - 1, 0, Math.PI * 2); ctx.fillStyle = f.skin; ctx.fill();

  // beards, under the hair and glasses
  if (f.beard) {
    const b = f.beard;
    if (b.style === 'long') {
      ctx.beginPath(); ctx.moveTo(-12, hy + 1); ctx.quadraticCurveTo(-12, hy + 20, 0, hy + 31); ctx.quadraticCurveTo(12, hy + 20, 12, hy + 1);
      ctx.quadraticCurveTo(6, hy + 7, 0, hy + 7); ctx.quadraticCurveTo(-6, hy + 7, -12, hy + 1); ctx.closePath();
      ctx.fillStyle = b.color; ctx.fill(); stroke(ctx, 1.6);
      if (b.grey) { ctx.strokeStyle = b.grey; ctx.lineWidth = 1; for (const x of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(x, hy + 10); ctx.lineTo(x * 0.5, hy + 25); ctx.stroke(); } }
    } else {
      const alpha = b.style === 'stubble' ? 0.45 : 0.95;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.moveTo(-12.5, hy - 1); ctx.quadraticCurveTo(-12, hy + 13, 0, hy + 15); ctx.quadraticCurveTo(12, hy + 13, 12.5, hy - 1);
      ctx.quadraticCurveTo(9, hy + 5, 5, hy + 6); ctx.lineTo(-5, hy + 6); ctx.quadraticCurveTo(-9, hy + 5, -12.5, hy - 1); ctx.closePath();
      // a flat colour, salt and pepper blended in (dots read as dirt at this size)
      ctx.fillStyle = b.grey ? mixHex(b.color, b.grey, 0.45) : b.color; ctx.fill();
      ctx.restore();
      if (b.style === 'short') stroke(ctx, 1.2);
      // the moustache
      ctx.fillStyle = b.grey ? mixHex(b.color, b.grey, 0.3) : b.color; ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.ellipse(-3.2, hy + 5.2, 3.6, 1.6, 0.15, 0, Math.PI * 2); ctx.ellipse(3.2, hy + 5.2, 3.6, 1.6, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // the face
  ctx.fillStyle = INK;
  for (const ex of [-4.8, 4.8]) { ctx.beginPath(); ctx.ellipse(ex + look, hy - 1.5, 1.6, cheering ? 1.2 : 2, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,110,110,0.32)'; ctx.beginPath(); ctx.arc(-8, hy + 3, 2.6, 0, Math.PI * 2); ctx.arc(8, hy + 3, 2.6, 0, Math.PI * 2); ctx.fill();
  // a big smile with teeth (everyone in the photo has one), wider when cheering
  const mw = cheering ? 6.5 : 5, mh = cheering ? 4 + arms * 1.5 : 2.6;
  ctx.beginPath(); ctx.moveTo(-mw, hy + 6.5); ctx.quadraticCurveTo(0, hy + 7.5 + mh * 2, mw, hy + 6.5); ctx.closePath();
  ctx.fillStyle = '#7a2a1f'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#ffffff'; ctx.fillRect(-mw, hy + 6.2, mw * 2, 2.2); ctx.restore();
  ctx.beginPath(); ctx.moveTo(-mw, hy + 6.5); ctx.quadraticCurveTo(0, hy + 7.5 + mh * 2, mw, hy + 6.5); ctx.closePath(); stroke(ctx, 1.1);

  // glasses
  if (f.glasses) {
    const gl = f.glasses, w = gl.big ? 5.6 : 4.8, h = gl.big ? 4.8 : 3.8;
    for (const ex of [-5, 5]) {
      ctx.beginPath(); ctx.roundRect(ex - w + look * 0.4, hy - 1.5 - h, w * 2, h * 2, gl.big ? 2.6 : 1.4);
      if (gl.clear) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill(); }
      ctx.strokeStyle = gl.frame; ctx.lineWidth = gl.clear ? 1.6 : 1.9; ctx.stroke();
      if (gl.clear) { ctx.strokeStyle = 'rgba(120,90,90,0.6)'; ctx.lineWidth = 0.6; ctx.stroke(); }
    }
    ctx.strokeStyle = gl.frame; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-5 + w + look * 0.4, hy - 2); ctx.lineTo(5 - w + look * 0.4, hy - 2); ctx.stroke();
  }

  // hair on top
  const hc = f.hair.color;
  ctx.fillStyle = hc;
  switch (f.hair.style) {
    case 'curly': {
      for (const [x, y, r] of [[-10, hy - 10, 6.5], [-3, hy - 13, 7], [5, hy - 13, 7], [11, hy - 9, 6.5], [-13, hy - 3, 5], [13, hy - 3, 5], [0, hy - 8, 6]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); stroke(ctx, 1.3); ctx.fill();
      }
      ctx.strokeStyle = light(hc, 0.25); ctx.lineWidth = 1;
      for (const [x, y] of [[-8, hy - 12], [3, hy - 15], [10, hy - 10]]) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0.5, 3.5); ctx.stroke(); }
      break;
    }
    case 'bald': { // a shine, and a shadow of short hair on the sides
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-4, hy - 8, 4.5, 2.4, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hc; ctx.globalAlpha = 0.5; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, hy, headR - 1.5, Math.PI * 0.85, Math.PI * 1.05); ctx.stroke(); ctx.beginPath(); ctx.arc(0, hy, headR - 1.5, -Math.PI * 0.05, Math.PI * 0.15); ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'long': { // parted in the middle, framing the face
      ctx.beginPath(); ctx.moveTo(-14, hy + 6); ctx.quadraticCurveTo(-15, hy - 14, 0, hy - 14); ctx.quadraticCurveTo(15, hy - 14, 14, hy + 6);
      ctx.quadraticCurveTo(11, hy - 4, 3, hy - 9); ctx.lineTo(0, hy - 6); ctx.lineTo(-3, hy - 9); ctx.quadraticCurveTo(-11, hy - 4, -14, hy + 6); ctx.closePath();
      ctx.fill(); stroke(ctx, 1.6);
      break;
    }
    case 'bob': { // a thick fringe straight across
      ctx.beginPath(); ctx.moveTo(-15, hy + 3); ctx.quadraticCurveTo(-15, hy - 15, 0, hy - 15); ctx.quadraticCurveTo(15, hy - 15, 15, hy + 3);
      ctx.lineTo(12, hy - 5); ctx.lineTo(-12, hy - 5); ctx.closePath(); ctx.fill(); stroke(ctx, 1.6);
      ctx.strokeStyle = light(hc, 0.2); ctx.lineWidth = 0.9;
      for (const x of [-7, -2, 3, 8]) { ctx.beginPath(); ctx.moveTo(x, hy - 12); ctx.lineTo(x + 0.5, hy - 6); ctx.stroke(); }
      break;
    }
    case 'bun': { // pulled up, a few loose strands, darker roots
      ctx.beginPath(); ctx.arc(0, hy - 2, headR + 0.5, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(0, hy - 8, -headR - 0.4, hy - 2.5); ctx.fill(); stroke(ctx, 1.5);
      ctx.beginPath(); ctx.ellipse(1, top - 4, 8, 6, 0.15, 0, Math.PI * 2); ctx.fill(); stroke(ctx, 1.5);
      if (f.hair.grey) { ctx.strokeStyle = f.hair.grey; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, top - 7); ctx.quadraticCurveTo(1, top - 1, 6, top - 6); ctx.stroke(); }
      ctx.strokeStyle = hc; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-12, hy - 4); ctx.quadraticCurveTo(-15, hy + 4, -13, hy + 10); ctx.moveTo(12, hy - 4); ctx.quadraticCurveTo(15, hy + 3, 13, hy + 9); ctx.stroke();
      break;
    }
    case 'short': { // swept back, grey at the temples
      ctx.beginPath(); ctx.moveTo(-13.5, hy - 1); ctx.quadraticCurveTo(-14, hy - 15, 1, hy - 15); ctx.quadraticCurveTo(14, hy - 15, 13.5, hy - 1);
      ctx.quadraticCurveTo(9, hy - 9, 2, hy - 8); ctx.quadraticCurveTo(-7, hy - 10, -13.5, hy - 1); ctx.closePath(); ctx.fill(); stroke(ctx, 1.5);
      if (f.hair.grey) { ctx.fillStyle = f.hair.grey; ctx.beginPath(); ctx.ellipse(-12, hy - 2, 2, 4, 0.2, 0, Math.PI * 2); ctx.ellipse(12, hy - 2, 2, 4, -0.2, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
  }
  if (f.hat) { // a black fedora with a band
    ctx.beginPath(); ctx.ellipse(0, hy - 9, 21, 4.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#1c1c20'; ctx.fill(); stroke(ctx, 1.6);
    ctx.beginPath(); ctx.moveTo(-12, hy - 10); ctx.lineTo(-10, hy - 26); ctx.quadraticCurveTo(0, hy - 30, 10, hy - 26); ctx.lineTo(12, hy - 10); ctx.closePath();
    ctx.fillStyle = '#26262b'; ctx.fill(); stroke(ctx, 1.6);
    ctx.beginPath(); ctx.moveTo(-11.6, hy - 13); ctx.lineTo(11.6, hy - 13); ctx.lineTo(11.2, hy - 16.5); ctx.lineTo(-11.2, hy - 16.5); ctx.closePath(); ctx.fillStyle = '#3d3d44'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-7, hy - 25); ctx.lineTo(-8.5, hy - 18); ctx.stroke();
  }
  ctx.restore();
}

/**
 * The feast with the friends: a longer table for seven, the raclette machine in the middle, the
 * friends behind it. While `cheering`, they raise their arms together, in time (1.6 beats a second).
 */
export function friendsFeast(ctx: Ctx, time: number, cheering: boolean): void {
  const n = FRIENDS.length, gap = FRIEND_GAP, W = FEAST_HALF_WIDTH, topY = -40;
  ctx.fillStyle = 'rgba(30,50,20,0.25)'; ctx.beginPath(); ctx.ellipse(0, 2, W + 20, (W + 20) * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  const beat = cheering ? 0.5 - 0.5 * Math.cos(time * Math.PI * 2 * 1.6) : 0;
  FRIENDS.forEach((f, i) => { ctx.save(); ctx.translate((i - (n - 1) / 2) * gap, 0); friend(ctx, f, beat, cheering); ctx.restore(); });
  // the checked cloth
  const cloth = (): void => {
    ctx.beginPath(); ctx.moveTo(-W, topY); ctx.lineTo(W, topY); ctx.lineTo(W, topY + 26);
    for (let x = W; x > -W + 1; x -= 20) ctx.quadraticCurveTo(x - 10, topY + 31, Math.max(-W, x - 20), topY + 26);
    ctx.closePath();
  };
  ctx.save(); cloth(); ctx.clip();
  for (let x = -W; x < W; x += 10) for (let y = topY; y < topY + 34; y += 10) {
    ctx.fillStyle = (Math.round((x + W) / 10) + Math.round((y - topY) / 10)) % 2 === 0 ? '#d52b1e' : '#ffffff';
    ctx.fillRect(x, y, 10, 10);
  }
  ctx.restore();
  cloth(); stroke(ctx, 2.2);
  for (const x of [-W + 12, W - 12]) { ctx.beginPath(); ctx.rect(x - 4, topY + 28, 8, 12); ctx.fillStyle = '#7a4c20'; ctx.fill(); stroke(ctx, 1.8); }
  // plates in front of each friend, the machine in the middle
  FRIENDS.forEach((_, i) => {
    const px = (i - (n - 1) / 2) * gap;
    if (i === (n - 1) / 2) return;
    ctx.beginPath(); ctx.ellipse(px, topY - 1, 13, 3.4, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(ctx, 1.3);
    for (const dx of [-4, 4]) { ctx.save(); ctx.translate(px + dx, topY - 4); ctx.scale(0.3, 0.3); artPotato(ctx); ctx.restore(); }
  });
  ctx.save(); ctx.translate(0, topY);
  ctx.beginPath(); ctx.rect(-24, -8, 48, 8); ctx.fillStyle = '#3d4450'; ctx.fill(); stroke(ctx, 1.8);
  ctx.beginPath(); ctx.rect(14, -30, 6, 22); ctx.fillStyle = '#5d6472'; ctx.fill(); stroke(ctx, 1.6);
  ctx.beginPath(); ctx.moveTo(-26, -34); ctx.lineTo(24, -34); ctx.lineTo(20, -28); ctx.lineTo(-22, -28); ctx.closePath();
  ctx.fillStyle = '#2c313b'; ctx.fill(); stroke(ctx, 1.8);
  ctx.fillStyle = '#ff9a3c'; ctx.fillRect(-20, -28, 38, 1.6);
  ctx.beginPath(); ctx.moveTo(-18, -9); ctx.arc(-6, -9, 12, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fillStyle = '#f7d46a'; ctx.fill(); stroke(ctx, 1.6);
  ctx.beginPath(); ctx.arc(-6, -9, 10.8, Math.PI, Math.PI * 2); ctx.strokeStyle = '#c97b2e'; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.fillStyle = '#ffd35a'; ctx.beginPath(); ctx.moveTo(-17, -10); ctx.lineTo(5, -10); ctx.lineTo(4, -8); ctx.quadraticCurveTo(-2, -4, -6, -8); ctx.quadraticCurveTo(-12, -6, -17, -8); ctx.closePath(); ctx.fill();
  ctx.restore();
}
