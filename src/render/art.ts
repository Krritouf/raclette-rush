// The new look (proposal v1), drawn with Canvas 2D paths: dark brown outlines, light from the top
// left, shading and highlights. Not used by the game yet: tools/art/ draws it on a sheet so it can
// be reviewed and tuned first. Every function draws around (0, 0) at its natural size (the game's
// world units) and the caller scales it.

import { makeRng } from '../game/rng';

type Ctx = CanvasRenderingContext2D;

/** The outline colour of everything. */
export const INK = '#3a2316';

/** The display font (titles, the logo, big numbers) and the text font (buttons, HUD). */
export const DISPLAY = "'Lilita One', 'Arial Rounded MT Bold', system-ui, sans-serif";
export const TEXT = "'Fredoka', 'Arial Rounded MT Bold', system-ui, sans-serif";

// ---------- colour helpers ----------
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Mixes two #rrggbb colours: t = 0 gives a, 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `#${((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1)}`;
}
export const light = (c: string, t: number): string => mix(c, '#ffffff', t);
export const dark = (c: string, t: number): string => mix(c, '#000000', t);

function outline(ctx: Ctx, w = 2.2): void {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = w; ctx.stroke();
}

function blob(ctx: Ctx, pts: [number, number][]): void {
  // a closed smooth shape through the points (midpoint quadratic curves)
  const n = pts.length;
  ctx.beginPath();
  const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

/** A soft shadow on the ground under an object w wide. */
export function groundShadow(ctx: Ctx, w: number, y = 1): void {
  ctx.fillStyle = 'rgba(30,50,20,0.25)';
  ctx.beginPath(); ctx.ellipse(0, y, w / 2, w * 0.09, 0, 0, Math.PI * 2); ctx.fill();
}

// ---------- the cheeses ----------
interface WheelStyle {
  paste: string; rind: string;
  /** The rind's width, as a share of the radius. */
  rindW: number;
  /** Holes: angle, distance (share of the paste radius), size (share of the radius). */
  holes: [number, number, number][];
  deco: 'valais' | 'tomme' | 'emmental' | 'gruyere' | 'tete';
}

const WHEELS: Record<string, WheelStyle> = {
  valais: { paste: '#f7d46a', rind: '#c97b2e', rindW: 0.17, deco: 'valais',
    holes: [[0.7, 0.62, 0.07], [2.3, 0.55, 0.06], [3.6, 0.66, 0.08], [4.9, 0.6, 0.05], [5.7, 0.4, 0.045]] },
  tomme: { paste: '#f8f0d8', rind: '#9b968a', rindW: 0.15, deco: 'tomme',
    holes: [[1.0, 0.5, 0.04], [3.1, 0.45, 0.035], [4.6, 0.62, 0.04], [5.8, 0.3, 0.03]] },
  emmental: { paste: '#fbe38a', rind: '#ddb34a', rindW: 0.09, deco: 'emmental',
    holes: [[0.3, 0.58, 0.16], [1.8, 0.5, 0.13], [2.9, 0.7, 0.11], [4.1, 0.55, 0.17], [5.3, 0.68, 0.1], [0, 0.05, 0.09]] },
  gruyere: { paste: '#f1c650', rind: '#7a4c20', rindW: 0.16, deco: 'gruyere',
    holes: [[1.3, 0.6, 0.035], [4.2, 0.5, 0.03]] },
  tete: { paste: '#f6dc8e', rind: '#5e391d', rindW: 0.13, deco: 'tete', holes: [] },
};

/**
 * A cheese wheel centred on (0, 0), seen from the side as it rolls.
 * @param id the cheese (data/cheeses.json)
 * @param portions slices left; total slices of the whole wheel
 */
export function artWheel(ctx: Ctx, id: string, r: number, portions: number, total: number, angle: number): void {
  const s = WHEELS[id] ?? WHEELS.valais;
  const q = Math.PI * 2 / total;
  const shape = new Path2D();
  if (portions >= total) shape.arc(0, 0, r, 0, Math.PI * 2);
  else for (let i = 0; i < portions; i++) { shape.moveTo(0, 0); shape.arc(0, 0, r, i * q, (i + 1) * q); shape.closePath(); }
  if (portions <= 0) return;

  ctx.save();
  ctx.rotate(angle);
  ctx.save();
  ctx.clip(shape);
  // the rind
  const rg = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.2, 0, 0, r);
  rg.addColorStop(0, light(s.rind, 0.25)); rg.addColorStop(1, dark(s.rind, 0.12));
  ctx.fillStyle = rg; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  const pr = r * (1 - s.rindW);
  if (s.deco === 'tomme') { // a mottled grey crust
    const rr = makeRng(5);
    for (let i = 0; i < 40; i++) {
      const a = rr() * Math.PI * 2, d = pr + rr() * (r - pr);
      ctx.fillStyle = rr() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(60,55,45,0.3)';
      ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.02 + rr() * 0.035), 0, Math.PI * 2); ctx.fill();
    }
  } else if (s.deco === 'gruyere' || s.deco === 'valais') { // the rind's cloth pattern
    ctx.strokeStyle = 'rgba(40,20,5,0.25)'; ctx.lineWidth = Math.max(0.6, r * 0.018);
    for (let i = 0; i < 36; i++) {
      const a = i * Math.PI / 18, d = (pr + r) / 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * (d - r * 0.035), Math.sin(a) * (d - r * 0.035));
      ctx.lineTo(Math.cos(a + 0.05) * (d + r * 0.035), Math.sin(a + 0.05) * (d + r * 0.035)); ctx.stroke();
    }
  }
  // the paste
  const pg = ctx.createRadialGradient(-pr * 0.3, -pr * 0.35, pr * 0.1, 0, 0, pr);
  pg.addColorStop(0, light(s.paste, 0.35)); pg.addColorStop(0.7, s.paste); pg.addColorStop(1, dark(s.paste, 0.08));
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = dark(s.rind, 0.25); ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(1, r * 0.035); ctx.stroke(); ctx.globalAlpha = 1;
  // the holes: dark inside, the far wall lit
  for (const [a, d, sz] of s.holes) {
    const hx = Math.cos(a) * d * pr, hy = Math.sin(a) * d * pr, hr = sz * r;
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(-angle); // the light does not turn with the wheel
    ctx.fillStyle = dark(s.paste, 0.28); ctx.beginPath(); ctx.ellipse(0, 0, hr, hr * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark(s.paste, 0.12); ctx.beginPath(); ctx.ellipse(hr * 0.22, hr * 0.22, hr * 0.7, hr * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = light(s.paste, 0.55); ctx.lineWidth = Math.max(0.6, hr * 0.22);
    ctx.beginPath(); ctx.arc(0, 0, hr * 0.92, 0.2, 1.6); ctx.stroke();
    ctx.restore();
  }
  if (s.deco === 'valais') { // the red VS stamp
    ctx.save(); ctx.rotate(-0.3);
    ctx.strokeStyle = 'rgba(178,40,30,0.7)'; ctx.lineWidth = Math.max(0.8, r * 0.04);
    ctx.beginPath(); ctx.ellipse(0, 0, pr * 0.36, pr * 0.27, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(178,40,30,0.75)';
    ctx.font = `${Math.round(pr * 0.3)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('VS', 0, pr * 0.02);
    ctx.restore();
  } else if (s.deco === 'tete') { // the rosette shaved by a girolle
    for (let k = 0; k < 3; k++) {
      const rad = pr * (0.62 - k * 0.2), n = 9 - k * 2;
      ctx.fillStyle = light(s.paste, 0.15 + k * 0.12);
      ctx.beginPath();
      for (let i = 0; i <= n * 2; i++) {
        const a = i * Math.PI / n + k * 0.3, d = i % 2 ? rad * 0.72 : rad;
        if (i === 0) ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d); else ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = dark(s.paste, 0.15); ctx.lineWidth = Math.max(0.6, r * 0.02); ctx.stroke();
    }
  }
  // the cuts between slices
  ctx.strokeStyle = dark(s.paste, 0.3); ctx.globalAlpha = 0.45; ctx.lineWidth = Math.max(0.7, r * 0.025);
  for (let i = 0; i < total; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * q) * pr, Math.sin(i * q) * pr); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // light and shade, fixed to the screen
  ctx.rotate(-angle);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.86, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,25,0,0.22)'; ctx.lineWidth = r * 0.12;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.9, Math.PI * 0.05, Math.PI * 0.6); ctx.stroke();
  ctx.restore();
  // the cut faces of the missing slices, then the outline
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, r * 0.075); ctx.stroke(shape);
  ctx.restore();
}

// ---------- the obstacles (base at (0, 0), sized like the game's hit boxes) ----------
/** A boulder, 34 wide and 24 high, with moss and a little snow. */
export function artRock(ctx: Ctx): void {
  groundShadow(ctx, 40);
  const pts: [number, number][] = [[-19, 1], [-17, -11], [-9, -22], [3, -26], [14, -19], [20, -7], [19, 1]];
  blob(ctx, pts);
  const g = ctx.createLinearGradient(-15, -24, 15, 2);
  g.addColorStop(0, '#b9bec8'); g.addColorStop(0.55, '#8e94a1'); g.addColorStop(1, '#666c78');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(-6, -21); ctx.lineTo(2, -18); ctx.lineTo(-6, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(40,45,60,0.25)';
  ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(13, -17); ctx.lineTo(22, -6); ctx.lineTo(22, 2); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,45,60,0.45)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-3, -24); ctx.lineTo(0, -15); ctx.lineTo(-4, -6); ctx.stroke();
  // moss and snow
  ctx.fillStyle = '#5e9a3e'; blob(ctx, [[-21, 2], [-19, -6], [-12, -4], [-7, 0], [-9, 3]]); ctx.fill();
  ctx.fillStyle = '#ffffff'; blob(ctx, [[-8, -21], [2, -28], [12, -21], [6, -18], [0, -20], [-5, -17]]); ctx.fill();
  ctx.fillStyle = '#cfe0f2'; blob(ctx, [[3, -20], [12, -21], [8, -18]]); ctx.fill();
  ctx.restore();
  blob(ctx, pts); outline(ctx);
}

/** A wooden alpine fence, 56 wide and 34 high. */
export function artFence(ctx: Ctx): void {
  groundShadow(ctx, 62);
  const wood = '#b07a43';
  const post = (x: number): void => {
    ctx.beginPath(); ctx.moveTo(x - 4, 2); ctx.lineTo(x - 4, -30); ctx.lineTo(x, -36); ctx.lineTo(x + 4, -30); ctx.lineTo(x + 4, 2); ctx.closePath();
    const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    g.addColorStop(0, light(wood, 0.15)); g.addColorStop(0.5, wood); g.addColorStop(1, dark(wood, 0.25));
    ctx.fillStyle = g; ctx.fill(); outline(ctx, 2);
    ctx.strokeStyle = 'rgba(70,40,15,0.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - 1, -26); ctx.lineTo(x - 1.5, -8); ctx.moveTo(x + 1.5, -20); ctx.lineTo(x + 1, -2); ctx.stroke();
  };
  const rail = (y0: number, y1: number): void => {
    ctx.beginPath(); ctx.moveTo(-31, y0 - 3); ctx.lineTo(31, y1 - 3); ctx.lineTo(31, y1 + 3); ctx.lineTo(-31, y0 + 3); ctx.closePath();
    const g = ctx.createLinearGradient(0, y0 - 3, 0, y0 + 3);
    g.addColorStop(0, light(wood, 0.25)); g.addColorStop(1, dark(wood, 0.15));
    ctx.fillStyle = g; ctx.fill(); outline(ctx, 2);
    ctx.strokeStyle = 'rgba(70,40,15,0.35)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-24, (y0 * 3 + y1) / 4); ctx.lineTo(-6, (y0 + y1) / 2 + 0.5); ctx.moveTo(8, (y0 + y1 * 2) / 3); ctx.lineTo(24, (y0 + y1 * 4) / 5); ctx.stroke();
  };
  post(-25); post(25);
  rail(-25, -27); rail(-11, -13);
  post(0);
  ctx.fillStyle = '#5a5f68';
  for (const [x, y] of [[-25, -26], [-25, -12], [0, -26], [0, -12], [25, -27], [25, -13]]) { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill(); }
}

/** A fir tree, 30 wide at the base and 78 high, snow on its branches. */
export function artFir(ctx: Ctx, snow = true): void {
  groundShadow(ctx, 36);
  ctx.beginPath(); ctx.rect(-4, -14, 8, 15);
  const tg = ctx.createLinearGradient(-4, 0, 4, 0); tg.addColorStop(0, '#8a5a31'); tg.addColorStop(1, '#5b3a1f');
  ctx.fillStyle = tg; ctx.fill(); outline(ctx, 2);
  const green = '#2f7a46';
  for (let i = 0; i < 4; i++) {
    const yb = -10 - i * 16, hw = 19 - i * 3.8, h = 26 - i * 1.5, top = yb - h;
    const tier = new Path2D();
    tier.moveTo(0, top);
    tier.lineTo(hw, yb);
    for (let k = 3; k >= 1; k--) {
      const x1 = -hw + (2 * hw) * (k / 3), x0 = -hw + (2 * hw) * ((k - 1) / 3);
      tier.quadraticCurveTo((x0 + x1) / 2, yb + 4, x0, yb);
    }
    tier.closePath();
    const g = ctx.createLinearGradient(-hw, 0, hw, 0);
    g.addColorStop(0, light(green, 0.18)); g.addColorStop(0.45, green); g.addColorStop(1, dark(green, 0.35));
    ctx.fillStyle = g; ctx.fill(tier);
    ctx.save(); ctx.clip(tier);
    ctx.fillStyle = 'rgba(10,40,20,0.35)'; ctx.fillRect(-hw, yb - 4, hw * 2, 8);
    if (snow) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(0, top - 2); ctx.lineTo(hw * 0.55, top + h * 0.5);
      ctx.quadraticCurveTo(hw * 0.25, top + h * 0.38, 0, top + h * 0.5); ctx.quadraticCurveTo(-hw * 0.3, top + h * 0.36, -hw * 0.6, top + h * 0.52);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#cddff2';
      ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(hw * 0.55, top + h * 0.5); ctx.quadraticCurveTo(hw * 0.3, top + h * 0.4, hw * 0.12, top + h * 0.45); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(tier);
  }
}

/** A cow facing left, 78 wide and 52 high: a black Hérens with a bell, or a spotted one. */
export function artCow(ctx: Ctx, spotted = false): void {
  const body = spotted ? '#f6f1e8' : '#3a2c26';
  const bodyDark = spotted ? '#d9d1c4' : '#1f1613';
  const spot = '#8c4a22';
  groundShadow(ctx, 80);
  const leg = (x: number, far: boolean): void => {
    ctx.beginPath(); ctx.moveTo(x - 3.5, -20); ctx.lineTo(x + 3.5, -20); ctx.lineTo(x + 3.2, -4); ctx.lineTo(x - 3.2, -4); ctx.closePath();
    ctx.fillStyle = far ? dark(body, 0.25) : body; ctx.fill(); outline(ctx, 2);
    ctx.beginPath(); ctx.rect(x - 3.8, -5, 7.6, 5); ctx.fillStyle = '#231915'; ctx.fill(); outline(ctx, 2);
  };
  leg(-21, true); leg(21, true);
  // the tail
  ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(33, -40); ctx.quadraticCurveTo(42, -32, 39, -16); ctx.stroke();
  ctx.strokeStyle = body; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.fillStyle = spotted ? spot : '#1a110e'; blob(ctx, [[36, -18], [42, -18], [41, -10], [37, -11]]); ctx.fill(); outline(ctx, 1.6);
  // the body
  const bodyPath = (): void => blob(ctx, [[-30, -46], [0, -50], [34, -46], [37, -30], [33, -17], [0, -15], [-28, -17], [-33, -32]]);
  bodyPath();
  const bg = ctx.createLinearGradient(0, -50, 0, -15);
  bg.addColorStop(0, light(body, spotted ? 0 : 0.12)); bg.addColorStop(1, bodyDark);
  ctx.fillStyle = bg; ctx.fill();
  ctx.save(); ctx.clip();
  if (spotted) {
    ctx.fillStyle = spot;
    blob(ctx, [[-8, -50], [10, -51], [14, -40], [4, -34], [-6, -38]]); ctx.fill();
    blob(ctx, [[20, -42], [34, -44], [38, -30], [26, -28]]); ctx.fill();
    blob(ctx, [[-28, -30], [-16, -32], [-14, -22], [-26, -19]]); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-20, -45); ctx.quadraticCurveTo(5, -49, 26, -44); ctx.stroke();
  ctx.restore();
  bodyPath(); outline(ctx);
  leg(-14, false); leg(28, false);
  // the bell on its strap
  ctx.save(); ctx.translate(-27, -22);
  ctx.strokeStyle = INK; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.quadraticCurveTo(-2, -2, 7, -10); ctx.stroke();
  ctx.strokeStyle = '#c8281e'; ctx.lineWidth = 3.6; ctx.stroke();
  ctx.fillStyle = '#fff'; for (const t of [0.3, 0.6]) { ctx.beginPath(); ctx.arc(-6 + 13 * t, -14 + 12 * t * (1 - t) * 2 + 4 * t, 0.9, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(3, -3); ctx.lineTo(5, 8); ctx.lineTo(-6, 8); ctx.closePath();
  const bell = ctx.createLinearGradient(-6, 0, 5, 0); bell.addColorStop(0, '#ffe08a'); bell.addColorStop(0.5, '#e2ab2e'); bell.addColorStop(1, '#a8741a');
  ctx.fillStyle = bell; ctx.fill(); outline(ctx, 1.8);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-0.5, 8.5, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // the head
  ctx.save(); ctx.translate(-38, -38);
  // horns
  for (const [x0, x1, x2] of [[-4, -12, -9], [4, 10, 6]]) {
    ctx.beginPath(); ctx.moveTo(x0, -8); ctx.quadraticCurveTo(x1, -14, x2, -20);
    ctx.strokeStyle = INK; ctx.lineWidth = 6.5; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = '#f2e7c9'; ctx.lineWidth = 3.8; ctx.stroke();
  }
  // ears
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 11, -6, 5.5, 3, sx * 0.4, 0, Math.PI * 2); ctx.fillStyle = dark(body, 0.15); ctx.fill(); outline(ctx, 1.8); }
  blob(ctx, [[-10, -10], [10, -10], [12, 4], [6, 14], [-8, 14], [-12, 4]]);
  ctx.fillStyle = body; ctx.fill();
  if (spotted) { ctx.save(); ctx.clip(); ctx.fillStyle = spot; ctx.beginPath(); ctx.ellipse(6, -6, 7, 9, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  blob(ctx, [[-10, -10], [10, -10], [12, 4], [6, 14], [-8, 14], [-12, 4]]); outline(ctx);
  // muzzle
  ctx.beginPath(); ctx.ellipse(-1, 10, 10, 6.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = spotted ? '#eaa8a0' : '#8a7068'; ctx.fill(); outline(ctx, 1.8);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(-5, 10, 1.4, 2, 0.3, 0, Math.PI * 2); ctx.ellipse(3, 10, 1.4, 2, -0.3, 0, Math.PI * 2); ctx.fill();
  // eyes
  for (const ex of [-5, 5]) {
    ctx.beginPath(); ctx.ellipse(ex, -1, 3, 3.6, 0, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); outline(ctx, 1.4);
    ctx.beginPath(); ctx.arc(ex - 0.8, -0.4, 1.8, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - 1.4, -1.2, 0.7, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  }
  ctx.restore();
}

// ---------- the pickups ----------
/** A potato centred on (0, 0), about 22 wide. */
export function artPotato(ctx: Ctx): void {
  const pts: [number, number][] = [[-11, -2], [-8, -8], [0, -9], [9, -7], [12, 0], [8, 7], [-1, 8], [-9, 6]];
  blob(ctx, pts);
  const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 13);
  g.addColorStop(0, '#f0c98a'); g.addColorStop(0.6, '#cf9a55'); g.addColorStop(1, '#a8712f');
  ctx.fillStyle = g; ctx.fill(); outline(ctx, 1.8);
  ctx.fillStyle = '#7a4f22';
  for (const [x, y] of [[-5, 1], [4, -3], [5, 4]]) { ctx.beginPath(); ctx.ellipse(x, y, 1.3, 0.9, 0.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,245,220,0.7)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-6, -5); ctx.quadraticCurveTo(-2, -7.5, 3, -6.5); ctx.stroke();
}

/** The bonuses. */
export type ArtPower = 'shield' | 'magnet' | 'turbo' | 'heal';

const POWER_GLOW: Record<ArtPower, string> = { shield: '#ffd35a', magnet: '#ff6a5a', turbo: '#8fe05a', heal: '#ff8fb0' };

/** A bonus's picture centred on (0, 0), about 28 wide. */
export function artPowerIcon(ctx: Ctx, t: ArtPower): void {
  if (t === 'shield') {
    // the raclette pan, the cheese bubbling in it
    ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(19, -5); ctx.lineTo(20, -1); ctx.lineTo(7, 3); ctx.closePath();
    ctx.fillStyle = '#8a5a31'; ctx.fill(); outline(ctx, 1.6);
    ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(8, -5); ctx.lineTo(5, 6); ctx.lineTo(-11, 6); ctx.closePath();
    const g = ctx.createLinearGradient(0, -5, 0, 6); g.addColorStop(0, '#5d6472'); g.addColorStop(1, '#2c313b');
    ctx.fillStyle = g; ctx.fill(); outline(ctx, 1.8);
    ctx.beginPath(); ctx.moveTo(-14, -5); ctx.quadraticCurveTo(-3, -11, 8, -5); ctx.quadraticCurveTo(4, -2, 1, -4); ctx.quadraticCurveTo(-1, 1, -3, -4); ctx.quadraticCurveTo(-8, -2, -14, -5); ctx.closePath();
    ctx.fillStyle = '#ffd35a'; ctx.fill(); outline(ctx, 1.4);
    ctx.fillStyle = '#fff3c2'; ctx.beginPath(); ctx.arc(-6, -7, 1.4, 0, Math.PI * 2); ctx.arc(2, -7.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-10, -1); ctx.lineTo(-9, 4); ctx.stroke();
  } else if (t === 'magnet') {
    ctx.save(); ctx.rotate(-0.5);
    const p = new Path2D();
    p.arc(0, 0, 11, Math.PI, 0); p.lineTo(11, 10); p.lineTo(5, 10); p.lineTo(5, 0); p.arc(0, 0, 5, 0, Math.PI, true); p.lineTo(-5, 10); p.lineTo(-11, 10); p.closePath();
    const g = ctx.createLinearGradient(-11, -11, 11, 10); g.addColorStop(0, '#ff7b6b'); g.addColorStop(1, '#b81d14');
    ctx.fillStyle = g; ctx.fill(p);
    ctx.fillStyle = '#e8edf3'; ctx.fillRect(-11, 4, 6, 6); ctx.fillRect(5, 4, 6, 6);
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke(p);
    ctx.beginPath(); ctx.moveTo(-11, 4); ctx.lineTo(-5, 4); ctx.moveTo(5, 4); ctx.lineTo(11, 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#ffe17a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(14, 13); ctx.moveTo(4, 13); ctx.lineTo(5, 17); ctx.moveTo(13, 4); ctx.lineTo(17, 5); ctx.stroke();
  } else if (t === 'turbo') {
    // the turbo pickle, with speed lines
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-17, -2); ctx.lineTo(-12, -2); ctx.moveTo(-18, 3); ctx.lineTo(-11, 3); ctx.stroke();
    ctx.save(); ctx.rotate(-0.45);
    const p = new Path2D(); p.ellipse(2, 0, 13, 6.5, 0, 0, Math.PI * 2);
    const g = ctx.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, '#8cc152'); g.addColorStop(1, '#3d7a23');
    ctx.fillStyle = g; ctx.fill(p);
    ctx.fillStyle = '#b5dc7a';
    for (const [x, y] of [[-6, -2], [-1, 2], [4, -3], [8, 1], [12, -2], [-3, -4]]) { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(1, -2, 9, 2.6, 0, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke(p);
    ctx.restore();
  } else {
    // a wedge of cheese with a heart: a slice back
    ctx.beginPath(); ctx.moveTo(-13, 7); ctx.lineTo(11, 7); ctx.lineTo(11, -1); ctx.lineTo(-13, 3); ctx.closePath();
    ctx.fillStyle = '#e2aa3c'; ctx.fill(); outline(ctx, 1.8);
    ctx.beginPath(); ctx.moveTo(-13, 3); ctx.lineTo(11, -1); ctx.lineTo(5, -10); ctx.closePath();
    const g = ctx.createLinearGradient(-10, -10, 10, 3); g.addColorStop(0, '#fff0a8'); g.addColorStop(1, '#f6cf5c');
    ctx.fillStyle = g; ctx.fill(); outline(ctx, 1.8);
    ctx.beginPath(); ctx.moveTo(11, 7); ctx.lineTo(11, -1); ctx.lineTo(5, -10); ctx.lineTo(5, 1); ctx.closePath();
    ctx.fillStyle = '#c97b2e'; ctx.fill(); outline(ctx, 1.8);
    ctx.fillStyle = '#d8a23e'; ctx.beginPath(); ctx.ellipse(-4, 5, 1.8, 1.2, 0, 0, Math.PI * 2); ctx.ellipse(4, 3, 1.4, 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(-6, -9);
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.bezierCurveTo(-7, -2, -3, -7, 0, -3); ctx.bezierCurveTo(3, -7, 7, -2, 0, 3); ctx.closePath();
    ctx.fillStyle = '#ff4d6d'; ctx.fill(); outline(ctx, 1.4);
    ctx.restore();
  }
}

/** A bonus floating in a bubble, centred on (0, 0), radius 20. */
export function artPowerBubble(ctx: Ctx, t: ArtPower, time = 0): void {
  const glow = POWER_GLOW[t];
  const pulse = 1 + Math.sin(time * 5) * 0.06;
  const halo = ctx.createRadialGradient(0, 0, 10, 0, 0, 30 * pulse);
  halo.addColorStop(0, `${glow}88`); halo.addColorStop(1, `${glow}00`);
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 30 * pulse, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, 20);
  g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0.25)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.2; ctx.stroke();
  artPowerIcon(ctx, t);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, 15, Math.PI * 1.1, Math.PI * 1.35); ctx.stroke();
}

// ---------- the scenery ----------
/** The sky over a w × h screen: deep blue at the top, warm at the horizon, the sun's glow. */
export function artSky(ctx: Ctx, w: number, h: number, sunX: number, sunY: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#4f9ee0'); g.addColorStop(0.55, '#a9d6f5'); g.addColorStop(1, '#f6ead0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const s = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.5);
  s.addColorStop(0, 'rgba(255,248,215,0.9)'); s.addColorStop(0.12, 'rgba(255,244,200,0.55)'); s.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = s; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(sunX, sunY, h * 0.05, 0, Math.PI * 2); ctx.fill();
}

/** A puffy cloud centred on (0, 0), about 120 × s wide. */
export function artCloud(ctx: Ctx, s = 1): void {
  ctx.save(); ctx.scale(s, s);
  const puffs: [number, number, number][] = [[-40, 6, 20], [-18, -6, 26], [10, -12, 30], [38, -2, 22], [55, 8, 16], [0, 10, 24]];
  const p = new Path2D(); for (const [x, y, r] of puffs) { p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2); }
  ctx.fillStyle = '#ffffff'; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  ctx.fillStyle = 'rgba(160,190,225,0.35)'; ctx.fillRect(-70, 8, 140, 40);
  ctx.restore();
  ctx.restore();
}

/**
 * A range of mountains across w, peaks rising up to `height` above baseY.
 * @param snow the share of the height capped with snow (0 for none)
 */
export function artRange(ctx: Ctx, w: number, baseY: number, height: number, col: string, snow: number, seed: number, offset = 0): void {
  const r = makeRng(seed);
  const pts: [number, number][] = [];
  let x = -offset % 400 - 200;
  let up = true;
  while (x < w + 200) {
    pts.push([x, baseY - (up ? height * (0.55 + r() * 0.45) : height * (0.15 + r() * 0.3))]);
    x += up ? 70 + r() * 90 : 60 + r() * 80;
    up = !up;
  }
  drawRange(ctx, pts, w, baseY, height, col, snow, seed, 0);
}

/**
 * The same range made to repeat: it covers [0, period] and a copy drawn at x + period joins it
 * seamlessly, so the game can draw it once and scroll it.
 */
export function artRangeTile(ctx: Ctx, period: number, baseY: number, height: number, col: string, snow: number, seed: number): void {
  const r = makeRng(seed);
  const n = Math.max(4, Math.round(period / 140)) * 2; // peaks and valleys, an even count
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = (i + (i ? (r() - 0.5) * 0.5 : 0)) * period / n;
    pts.push([x, baseY - (i % 2 === 0 ? height * (0.55 + r() * 0.45) : height * (0.15 + r() * 0.3))]);
  }
  pts.push([period, pts[0][1]]);
  // one more peak each side, so the shading at the edges matches the next copy
  pts.unshift([pts[n - 1][0] - period, pts[n - 1][1]]);
  pts.push([pts[2][0] + period, pts[2][1]]);
  drawRange(ctx, pts, period, baseY, height, col, snow, seed, period);
}

function drawRange(ctx: Ctx, pts: [number, number][], w: number, baseY: number, height: number, col: string, snow: number, seed: number, period: number): void {
  const shape = new Path2D();
  shape.moveTo(pts[0][0], baseY + 400);
  for (const [px, py] of pts) shape.lineTo(px, py);
  shape.lineTo(pts[pts.length - 1][0], baseY + 400); shape.closePath();
  const g = ctx.createLinearGradient(0, baseY - height, 0, baseY + 60);
  g.addColorStop(0, light(col, 0.08)); g.addColorStop(1, mix(col, '#e8eef2', 0.35));
  ctx.fillStyle = g; ctx.fill(shape);
  ctx.save(); ctx.clip(shape);
  const snowY = baseY - height * (1 - snow);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    if (by > ay) { // a face going down to the right: in shade
      ctx.fillStyle = 'rgba(30,40,70,0.16)';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, baseY + 400); ctx.lineTo(ax + (bx - ax) * 0.35, baseY + 400); ctx.closePath(); ctx.fill();
    }
  }
  if (snow > 0) {
    // the snow cap, with a ragged edge, lit on the left faces
    const cap = new Path2D();
    cap.moveTo(pts[0][0], -1000);
    // a ragged edge; with a period, made of waves that fit it exactly, so the copies join
    const f1 = period ? Math.round(period * 0.05 / (2 * Math.PI)) * 2 * Math.PI / period : 0.05;
    const f2 = period ? Math.round(period * 0.13 / (2 * Math.PI)) * 2 * Math.PI / period : 0.13;
    for (let xx = pts[0][0]; xx <= pts[pts.length - 1][0] + 14; xx += 7) {
      cap.lineTo(xx, snowY + (Math.sin(xx * f1 + seed) * 0.6 + Math.sin(xx * f2 + seed * 3) * 0.4) * height * 0.07);
    }
    cap.lineTo(pts[pts.length - 1][0], -1000); cap.closePath();
    ctx.save(); ctx.clip(cap);
    ctx.fillStyle = '#f7fbff'; ctx.fillRect(-300, baseY - height - 50, w + 600, height + 50);
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      if (by > ay) {
        ctx.fillStyle = '#c4d6ec';
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, baseY); ctx.lineTo(ax + (bx - ax) * 0.35, baseY); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.restore();
  // haze at the foot
  const hz = ctx.createLinearGradient(0, baseY - height * 0.3, 0, baseY + 40);
  const haze = snow > 0 ? 0.45 : 0.15; // the near hills stay clear
  hz.addColorStop(0, 'rgba(235,242,248,0)'); hz.addColorStop(1, `rgba(235,242,248,${haze})`);
  ctx.save(); ctx.clip(shape); ctx.fillStyle = hz; ctx.fillRect(-300, baseY - height, w + 600, height + 100); ctx.restore();
}

/** A fir in the distance: a flat silhouette, h high, base at (0, 0). */
export function artFarFir(ctx: Ctx, h: number, col: string): void {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(0, -h);
  for (let i = 1; i <= 4; i++) { const y = -h + (h * 0.95) * i / 4, w = h * 0.12 * (0.6 + i * 0.35); ctx.lineTo(w, y); ctx.lineTo(w * 0.45, y - h * 0.04); }
  for (let i = 4; i >= 1; i--) { const y = -h + (h * 0.95) * i / 4, w = h * 0.12 * (0.6 + i * 0.35); ctx.lineTo(-w * 0.45, y - h * 0.04); ctx.lineTo(-w, y); }
  ctx.closePath(); ctx.fill();
  ctx.fillRect(-h * 0.03, -h * 0.06, h * 0.06, h * 0.08);
}

/**
 * The slope: the ground under the line through pts, filled down to bottom, with a lit grass lip,
 * tufts and flowers along it.
 */
export function artSlope(ctx: Ctx, pts: [number, number][], bottom: number, seed: number): void {
  const p = new Path2D();
  p.moveTo(pts[0][0], bottom);
  for (const [x, y] of pts) p.lineTo(x, y);
  p.lineTo(pts[pts.length - 1][0], bottom); p.closePath();
  const top = Math.min(...pts.map(q => q[1]));
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#79c055'); g.addColorStop(0.35, '#57a043'); g.addColorStop(1, '#2f6e2f');
  ctx.fillStyle = g; ctx.fill(p);
  // dark band under the lip, then the lit lip
  const line = new Path2D(); line.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts) line.lineTo(x, y);
  ctx.save(); ctx.clip(p);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(30,80,30,0.35)'; ctx.lineWidth = 16; ctx.translate(0, 10); ctx.stroke(line); ctx.translate(0, -10);
  // texture: soft lighter patches
  const r = makeRng(seed);
  for (let i = 0; i < pts.length; i += 3) {
    const [x, y] = pts[i];
    ctx.fillStyle = 'rgba(160,220,110,0.12)';
    ctx.beginPath(); ctx.ellipse(x + r() * 20, y + 30 + r() * 120, 30 + r() * 30, 8 + r() * 6, -0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#3f8a35'; ctx.lineWidth = 7; ctx.stroke(line);
  ctx.strokeStyle = '#b4e57c'; ctx.lineWidth = 3.5; ctx.translate(0, -1.5); ctx.stroke(line); ctx.translate(0, 1.5);
  // tufts and flowers
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    for (let k = 0; k < 2; k++) {
      const t = r(), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const pick = r();
      if (pick < 0.5) {
        ctx.strokeStyle = r() < 0.5 ? '#3f8a35' : '#8fd062'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 3, y + 1); ctx.lineTo(x - 5, y - 5); ctx.moveTo(x, y + 1); ctx.lineTo(x, y - 7); ctx.moveTo(x + 3, y + 1); ctx.lineTo(x + 5, y - 5); ctx.stroke();
      } else if (pick < 0.58) artFlower(ctx, x, y, 'edelweiss');
      else if (pick < 0.65) artFlower(ctx, x, y, 'gentian');
      else if (pick < 0.7) artFlower(ctx, x, y, 'buttercup');
    }
  }
}

/** A small mountain flower standing at (x, y). */
export function artFlower(ctx: Ctx, x: number, y: number, kind: 'edelweiss' | 'gentian' | 'buttercup'): void {
  ctx.strokeStyle = '#3f8a35'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 6); ctx.stroke();
  ctx.save(); ctx.translate(x, y - 7);
  if (kind === 'edelweiss') {
    ctx.fillStyle = '#f4f1e6';
    for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.ellipse(0, -2.6, 1.2, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#e3c75a'; ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'gentian') {
    ctx.fillStyle = '#2f5fd0'; ctx.beginPath(); ctx.moveTo(-2.5, -4); ctx.lineTo(2.5, -4); ctx.lineTo(1.5, 1.5); ctx.lineTo(-1.5, 1.5); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = '#f5d33a';
    for (let i = 0; i < 5; i++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.arc(0, -1.6, 1.5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

/** The chalet at the top of the run, base centred on (0, 0), about 160 wide. */
export function artChalet(ctx: Ctx, smokeT = 0): void {
  groundShadow(ctx, 170, 2);
  // chimney smoke
  for (let i = 0; i < 4; i++) {
    const k = (smokeT * 0.3 + i / 4) % 1;
    ctx.fillStyle = `rgba(240,240,245,${0.6 * (1 - k)})`;
    ctx.beginPath(); ctx.arc(38 + k * 22 + Math.sin(k * 6 + i) * 4, -150 - k * 60, 6 + k * 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath(); ctx.rect(30, -150, 16, 30); ctx.fillStyle = '#8d8f96'; ctx.fill(); outline(ctx, 2);
  ctx.fillStyle = '#6f727a'; ctx.fillRect(30, -150, 16, 4);
  // the stone base
  ctx.beginPath(); ctx.rect(-62, -22, 124, 24); ctx.fillStyle = '#a4a6ad'; ctx.fill(); outline(ctx, 2);
  ctx.strokeStyle = 'rgba(60,60,70,0.4)'; ctx.lineWidth = 1;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 8; i++) { const x = -62 + i * 16 + (row % 2) * 8; ctx.strokeRect(x, -22 + row * 8, 16, 8); }
  // the wooden walls
  ctx.beginPath(); ctx.rect(-58, -92, 116, 70);
  const wg = ctx.createLinearGradient(-58, 0, 58, 0); wg.addColorStop(0, '#b77c42'); wg.addColorStop(1, '#8a5a2c');
  ctx.fillStyle = wg; ctx.fill(); outline(ctx, 2);
  ctx.strokeStyle = 'rgba(70,40,15,0.45)'; ctx.lineWidth = 1;
  for (let y = -86; y < -22; y += 7) { ctx.beginPath(); ctx.moveTo(-58, y); ctx.lineTo(58, y); ctx.stroke(); }
  // windows with red and white shutters, and geraniums
  for (const wx of [-34, 22]) {
    ctx.beginPath(); ctx.rect(wx, -78, 16, 18); ctx.fillStyle = '#ffe9a8'; ctx.fill(); outline(ctx, 1.8);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(wx + 8, -78); ctx.lineTo(wx + 8, -60); ctx.moveTo(wx, -69); ctx.lineTo(wx + 16, -69); ctx.stroke();
    for (const sx of [wx - 8, wx + 16]) {
      ctx.beginPath(); ctx.rect(sx, -78, 8, 18); ctx.fillStyle = '#c8281e'; ctx.fill(); outline(ctx, 1.5);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx + 1, -76); ctx.lineTo(sx + 7, -70); ctx.lineTo(sx + 1, -64); ctx.stroke();
    }
    ctx.beginPath(); ctx.rect(wx - 3, -60, 22, 5); ctx.fillStyle = '#7a4c20'; ctx.fill(); outline(ctx, 1.5);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#2f7a46'; ctx.beginPath(); ctx.arc(wx - 1 + i * 4.5, -61, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e83a4a'; ctx.beginPath(); ctx.arc(wx + i * 4.5, -63, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  // the door
  ctx.beginPath(); ctx.moveTo(-9, -22); ctx.lineTo(-9, -46); ctx.quadraticCurveTo(0, -52, 9, -46); ctx.lineTo(9, -22); ctx.closePath();
  ctx.fillStyle = '#5a3418'; ctx.fill(); outline(ctx, 1.8);
  ctx.fillStyle = '#e2ab2e'; ctx.beginPath(); ctx.arc(5, -34, 1.3, 0, Math.PI * 2); ctx.fill();
  // the balcony
  ctx.beginPath(); ctx.rect(-60, -100, 120, 6); ctx.fillStyle = '#7a4c20'; ctx.fill(); outline(ctx, 1.8);
  // the roof: deep eaves, white trim
  ctx.beginPath(); ctx.moveTo(-82, -96); ctx.lineTo(0, -146); ctx.lineTo(82, -96); ctx.lineTo(74, -90); ctx.lineTo(0, -136); ctx.lineTo(-74, -90); ctx.closePath();
  ctx.fillStyle = '#4b2c16'; ctx.fill(); outline(ctx, 2);
  ctx.beginPath(); ctx.moveTo(-58, -92); ctx.lineTo(0, -128); ctx.lineTo(58, -92); ctx.closePath();
  const gg = ctx.createLinearGradient(0, -128, 0, -92); gg.addColorStop(0, '#a8713c'); gg.addColorStop(1, '#8a5a2c');
  ctx.fillStyle = gg; ctx.fill(); outline(ctx, 1.8);
  ctx.strokeStyle = 'rgba(70,40,15,0.45)'; ctx.lineWidth = 1;
  for (let x = -40; x <= 40; x += 10) { ctx.beginPath(); ctx.moveTo(x, -92); ctx.lineTo(x, -92 - (58 - Math.abs(x)) * 0.62); ctx.stroke(); }
  // snow on the roof
  ctx.beginPath(); ctx.moveTo(-80, -97); ctx.lineTo(0, -148); ctx.lineTo(80, -97); ctx.quadraticCurveTo(62, -104, 52, -102); ctx.quadraticCurveTo(30, -118, 0, -136); ctx.quadraticCurveTo(-36, -114, -56, -103); ctx.quadraticCurveTo(-70, -100, -80, -97); ctx.closePath();
  ctx.fillStyle = '#f7fbff'; ctx.fill(); outline(ctx, 1.6);
  // the Swiss flag
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-30, -126); ctx.lineTo(-30, -172); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-30, -172); ctx.quadraticCurveTo(-18, -176, -6, -170); ctx.lineTo(-6, -152); ctx.quadraticCurveTo(-18, -158, -30, -154); ctx.closePath();
  ctx.fillStyle = '#d52b1e'; ctx.fill(); outline(ctx, 1.6);
  ctx.fillStyle = '#fff'; ctx.fillRect(-20, -169, 4, 12); ctx.fillRect(-24, -165, 12, 4);
}

// ---------- the interface ----------
/** The logo centred on (0, 0), `size` the height of RUSH. */
export function artLogo(ctx: Ctx, size: number, time = 0): void {
  ctx.save();
  ctx.rotate(-0.05);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const word = (s: string, y: number, sz: number, top: string, bottom: string, inner: string | null): void => {
    ctx.font = `${sz}px ${DISPLAY}`;
    ctx.fillStyle = 'rgba(40,20,5,0.35)'; ctx.fillText(s, sz * 0.04, y + sz * 0.08);
    ctx.lineWidth = sz * 0.2; ctx.strokeStyle = INK; ctx.strokeText(s, 0, y);
    if (inner) { ctx.lineWidth = sz * 0.1; ctx.strokeStyle = inner; ctx.strokeText(s, 0, y); }
    const g = ctx.createLinearGradient(0, y - sz * 0.45, 0, y + sz * 0.45);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillText(s, 0, y);
  };
  word('RACLETTE', -size * 0.55, size * 0.78, '#ffe68a', '#f0a92e', null);
  // melted cheese dripping from RACLETTE
  ctx.fillStyle = '#f7c84a'; ctx.strokeStyle = INK; ctx.lineWidth = size * 0.035;
  for (const [x, l] of [[-size * 1.05, 0.22], [-size * 0.2, 0.32], [size * 0.75, 0.18]]) {
    ctx.beginPath(); ctx.moveTo(x - size * 0.06, -size * 0.25); ctx.lineTo(x - size * 0.04, -size * 0.25 + size * l);
    ctx.arc(x, -size * 0.25 + size * l, size * 0.045, Math.PI, 0, true); ctx.lineTo(x + size * 0.06, -size * 0.25); ctx.closePath();
    ctx.stroke(); ctx.fill();
  }
  word('RUSH', size * 0.42, size, '#ff6b52', '#c3211a', '#ffffff');
  // the wheel rolling in, with speed lines
  ctx.save(); ctx.translate(-size * 1.75, size * 0.42);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = size * 0.05; ctx.lineCap = 'round';
  for (const [dy, len] of [[-0.2, 0.5], [0.05, 0.7], [0.3, 0.45]]) { ctx.beginPath(); ctx.moveTo(-size * 0.5, size * dy); ctx.lineTo(-size * (0.5 + len), size * dy); ctx.stroke(); }
  artWheel(ctx, 'valais', size * 0.42, 4, 4, time * 2);
  ctx.restore();
  ctx.restore();
}

/** A button w × h with its top left at (x, y). */
export function artButton(ctx: Ctx, x: number, y: number, w: number, h: number, label: string, style: 'primary' | 'secondary' | 'red' = 'primary', icon?: (ctx: Ctx, cx: number, cy: number, s: number) => void): void {
  const col = style === 'primary' ? '#ffd257' : style === 'red' ? '#e8432f' : '#fff6e2';
  const ink = style === 'primary' ? '#5a3510' : style === 'red' ? '#ffffff' : '#2a3b52';
  const r = Math.min(h * 0.32, 18), depth = h * 0.12;
  const rr = (yy: number, hh: number): void => {
    ctx.beginPath(); ctx.moveTo(x + r, yy); ctx.arcTo(x + w, yy, x + w, yy + hh, r); ctx.arcTo(x + w, yy + hh, x, yy + hh, r);
    ctx.arcTo(x, yy + hh, x, yy, r); ctx.arcTo(x, yy, x + w, yy, r); ctx.closePath();
  };
  rr(y + depth, h); ctx.fillStyle = dark(col, 0.3); ctx.fill(); outline(ctx, 2.6);
  rr(y, h);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, light(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, dark(col, 0.06));
  ctx.fillStyle = g; ctx.fill(); outline(ctx, 2.6);
  ctx.save(); rr(y, h); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.08, w * 0.48, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const size = h * 0.44;
  ctx.font = `${size}px ${DISPLAY}`;
  const tw = ctx.measureText(label).width, iw = icon ? size * 1.4 : 0;
  const x0 = x + w / 2 - (tw + iw) / 2;
  if (icon) icon(ctx, x0 + size * 0.55, y + h / 2, size * 0.8);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  if (style !== 'secondary') { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillText(label, x0 + iw, y + h / 2 + 2); }
  ctx.fillStyle = ink; ctx.fillText(label, x0 + iw, y + h / 2);
}

/** A round icon button centred on (cx, cy). */
export function artRoundButton(ctx: Ctx, cx: number, cy: number, r: number, icon: (ctx: Ctx, cx: number, cy: number, s: number) => void): void {
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.12, r, 0, Math.PI * 2); ctx.fillStyle = '#c9b48f'; ctx.fill(); outline(ctx, 2.4);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#f1e4c8');
  ctx.fillStyle = g; ctx.fill(); outline(ctx, 2.4);
  icon(ctx, cx, cy, r * 0.55);
}

/** A dark rounded pill for the HUD, left edge at x, centred on cy. */
export function artPill(ctx: Ctx, x: number, cy: number, w: number, h: number): void {
  const r = h / 2;
  ctx.beginPath(); ctx.moveTo(x + r, cy - r); ctx.lineTo(x + w - r, cy - r); ctx.arc(x + w - r, cy, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + r, cy + r); ctx.arc(x + r, cy, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
  ctx.fillStyle = 'rgba(25,40,60,0.72)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
}

/** The pause icon. */
export function artPauseIcon(ctx: Ctx, cx: number, cy: number, s: number): void {
  ctx.fillStyle = '#2a3b52';
  for (const dx of [-0.45, 0.15]) { ctx.beginPath(); ctx.rect(cx + dx * s, cy - 0.7 * s, 0.32 * s, 1.4 * s); ctx.fill(); }
}

/** The gear icon. */
export function artGearIcon(ctx: Ctx, cx: number, cy: number, s: number): void {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = '#2a3b52';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { ctx.rect(-s * 0.2, -s * 1.05, s * 0.4, s * 0.45); ctx.rotate(Math.PI / 4); }
  ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
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

// ---------- the finish of an Adventure level ----------
/**
 * The finish arch, standing on the ground at (0, 0): two posts either side of the line, a banner
 * across with the label, and bunting under it.
 */
export function artFinishArch(ctx: Ctx, label: string, time = 0): void {
  for (const x of [-72, 72]) {
    ctx.beginPath(); ctx.rect(x - 5, -168, 10, 170);
    const g = ctx.createLinearGradient(x - 5, 0, x + 5, 0); g.addColorStop(0, '#c08a52'); g.addColorStop(1, '#7d5129');
    ctx.fillStyle = g; ctx.fill(); outline(ctx, 2.2);
    ctx.beginPath(); ctx.moveTo(x - 7, -168); ctx.lineTo(x, -178); ctx.lineTo(x + 7, -168); ctx.closePath();
    ctx.fillStyle = '#8a5a2c'; ctx.fill(); outline(ctx, 2);
  }
  // bunting
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-70, -128); ctx.quadraticCurveTo(0, -108, 70, -128); ctx.stroke();
  const cols = ['#d52b1e', '#ffffff', '#ffd257'];
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9, x = -70 + 140 * t, y = -128 + 40 * t * (1 - t) + 0.5;
    const sway = Math.sin(time * 3 + i) * 1.5;
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.lineTo(x + sway, y + 12); ctx.closePath();
    ctx.fillStyle = cols[i % 3]; ctx.fill(); outline(ctx, 1.2);
  }
  // the banner, waving a little
  const wave = (x: number): number => Math.sin(time * 2 + x * 0.05) * 1.5;
  ctx.beginPath(); ctx.moveTo(-70, -166 + wave(-70));
  for (let x = -70; x <= 70; x += 10) ctx.lineTo(x, -166 + wave(x));
  for (let x = 70; x >= -70; x -= 10) ctx.lineTo(x, -136 + wave(x));
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, -166, 0, -136); bg.addColorStop(0, '#ff5b45'); bg.addColorStop(1, '#c3211a');
  ctx.fillStyle = bg; ctx.fill(); outline(ctx, 2.2);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (let x = -66; x <= 66; x += 6) ctx.lineTo(x, -162 + wave(x)); ctx.stroke();
  ctx.beginPath(); for (let x = -66; x <= 66; x += 6) ctx.lineTo(x, -140 + wave(x)); ctx.stroke();
  let sz = 20;
  ctx.font = `${sz}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  while (sz > 9 && ctx.measureText(label).width > 120) { sz--; ctx.font = `${sz}px ${DISPLAY}`; }
  ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText(label, 0, -150);
  ctx.fillStyle = '#ffffff'; ctx.fillText(label, 0, -150);
  // a Swiss flag on each post
  for (const x of [-72, 72]) {
    ctx.beginPath(); ctx.rect(x + 4, -176, 16, 12); ctx.fillStyle = '#d52b1e'; ctx.fill(); outline(ctx, 1.4);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 10.5, -174, 3, 8); ctx.fillRect(x + 8, -171.5, 8, 3);
  }
}

/** A star centred on (0, 0), r its outer radius: gold when earned, dim when not. */
export function artStar(ctx: Ctx, r: number, filled: boolean): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * 0.48 : r;
    if (i === 0) ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d); else ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  if (filled) {
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#fff09a'); g.addColorStop(1, '#f0a92e');
    ctx.fillStyle = g;
  } else ctx.fillStyle = 'rgba(42,59,82,0.18)';
  ctx.fill();
  ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.4, r * 0.13); ctx.stroke();
  if (filled) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.45); ctx.lineTo(-r * 0.05, -r * 0.65); ctx.stroke();
  }
}

/** A padlock centred on (0, 0), about 2 × s tall. */
export function artLock(ctx: Ctx, s: number): void {
  ctx.beginPath(); ctx.arc(0, -s * 0.35, s * 0.45, Math.PI, 0);
  ctx.strokeStyle = INK; ctx.lineWidth = s * 0.32; ctx.stroke();
  ctx.strokeStyle = '#9aa3ae'; ctx.lineWidth = s * 0.16; ctx.stroke();
  ctx.beginPath(); ctx.rect(-s * 0.7, -s * 0.35, s * 1.4, s * 1.1);
  const g = ctx.createLinearGradient(0, -s * 0.35, 0, s * 0.75); g.addColorStop(0, '#ffd257'); g.addColorStop(1, '#d8952a');
  ctx.fillStyle = g; ctx.fill(); outline(ctx, Math.max(1.4, s * 0.12));
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-s * 0.06, s * 0.1, s * 0.12, s * 0.3);
}
