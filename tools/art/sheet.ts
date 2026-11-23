// The art sheet: every element of the new look (src/render/art.ts), large and at game size, and a
// game scene with all of them together. npm run art writes both to design/art/ as PNG.

import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import cheeses from '../../data/cheeses.json';
import {
  DISPLAY, TEXT, artButton, artChalet, artCloud, artCow, artFarFir, artFence, artFir, artGearIcon, artLogo, artPauseIcon,
  artFinishArch, artPill, artPotato, artPowerBubble, artRange, artRock, artRoundButton, artSky, artSlope, artWheel, type ArtPower,
} from '../../src/render/art';
import { FRIENDS, friend, friendsFeast } from '../../src/render/guests';

type Ctx = CanvasRenderingContext2D;
const VERSION = 'v1';
const FRIENDS_VERSION = 'v2';
const NAVY = '#2a3b52';

function label(ctx: Ctx, s: string, x: number, y: number, size: number, font = DISPLAY, color = NAVY, align: CanvasTextAlign = 'center'): void {
  ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function section(ctx: Ctx, y: number, h: number, title: string, sub: string, W: number): void {
  ctx.fillStyle = '#fbf7ef'; ctx.beginPath(); ctx.roundRect(30, y, W - 60, h, 24); ctx.fill();
  ctx.strokeStyle = '#e4dccb'; ctx.lineWidth = 2; ctx.stroke();
  label(ctx, title, 70, y + 50, 46, DISPLAY, NAVY, 'left');
  label(ctx, sub, 70, y + 92, 24, TEXT, '#6b7a8c', 'left');
}

/** Draws f scaled by s with (0, 0) at (x, y). */
function at(ctx: Ctx, x: number, y: number, s: number, f: () => void): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); f(); ctx.restore();
}

function sheet(cv: HTMLCanvasElement): void {
  const W = 2400, H = 3080;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#efe7d8'; ctx.fillRect(0, 0, W, H);
  label(ctx, `Raclette Rush — proposition graphique ${VERSION}`, 70, 70, 60, DISPLAY, NAVY, 'left');
  label(ctx, 'Contours bruns, lumière en haut à gauche, ombres et reflets. Chaque élément en grand, puis à sa taille dans le jeu (téléphone en paysage).', 70, 122, 26, TEXT, '#6b7a8c', 'left');

  // ---- the cheeses ----
  let y = 170;
  section(ctx, y, 720, 'Les meules', 'Chaque fromage a sa pâte, sa croûte et ses trous ; la meule perd une part à chaque choc.', W);
  cheeses.forEach((c, i) => {
    const x = 280 + i * 450;
    at(ctx, x, y + 290, 1, () => artWheel(ctx, c.id, 110, c.portions, c.portions, -0.25));
    label(ctx, c.name, x, y + 440, 36);
    label(ctx, c.desc, x, y + 480, 21, TEXT, '#6b7a8c');
  });
  label(ctx, 'Les chocs :', 70, y + 590, 30, DISPLAY, NAVY, 'left');
  [4, 3, 2, 1].forEach((p, i) => {
    const x = 320 + i * 180;
    at(ctx, x, y + 600, 1, () => artWheel(ctx, 'valais', 62, p, 4, -0.25));
    label(ctx, `${p} part${p > 1 ? 's' : ''}`, x, y + 690, 22, TEXT, '#6b7a8c');
  });
  label(ctx, 'Taille réelle :', 1100, y + 590, 30, DISPLAY, NAVY, 'left');
  cheeses.forEach((c, i) => {
    at(ctx, 1340 + i * 70, y + 600, 1, () => artWheel(ctx, c.id, 22 * 0.67, c.portions, c.portions, -0.25));
    at(ctx, 1340 + i * 70, y + 660, 1, () => artWheel(ctx, c.id, 22 * 1.33, c.portions, c.portions, -0.25));
  });
  label(ctx, 'téléphone', 1720, y + 600, 20, TEXT, '#6b7a8c', 'left');
  label(ctx, 'ordinateur', 1720, y + 660, 20, TEXT, '#6b7a8c', 'left');

  // ---- the obstacles ----
  y = 920;
  section(ctx, y, 640, 'Les obstacles', 'Même taille de collision que dans le jeu. Deux vaches au choix : la noire d’Hérens (Valais) ou la tachetée.', W);
  const ground = y + 470;
  ctx.fillStyle = '#7fc25a'; ctx.fillRect(60, ground, W - 120, 14);
  ctx.fillStyle = '#5aa043'; ctx.fillRect(60, ground + 14, W - 120, 40);
  const obs: [string, number, () => void][] = [
    ['Caillou', 300, () => artRock(ctx)], ['Barrière', 700, () => artFence(ctx)], ['Sapin', 1080, () => artFir(ctx)],
    ['Vache d’Hérens', 1520, () => artCow(ctx)], ['Vache tachetée', 2040, () => artCow(ctx, true)],
  ];
  for (const [name, x, f] of obs) {
    at(ctx, x, ground, 3.4, f);
    label(ctx, name, x, ground + 90, 34);
    at(ctx, x + 150, ground + 92, 0.72, f);
  }

  // ---- the pickups ----
  y = 1590;
  section(ctx, y, 440, 'À ramasser', 'Les pommes de terre (la monnaie) et les quatre bonus, dans leur bulle.', W);
  const py = y + 270;
  at(ctx, 260, py, 5, () => artPotato(ctx));
  label(ctx, 'Pomme de terre', 260, py + 120, 32);
  at(ctx, 380, py + 100, 0.72, () => artPotato(ctx));
  const pw: [ArtPower, string][] = [['shield', 'Poêlon : bloque un choc'], ['magnet', 'Aimant : attire les patates'], ['turbo', 'Cornichon turbo : fonce'], ['heal', 'Part de fromage : +1 part']];
  pw.forEach(([t, name], i) => {
    const x = 720 + i * 420;
    at(ctx, x, py - 10, 3.6, () => artPowerBubble(ctx, t));
    label(ctx, name, x, py + 120, 28);
    at(ctx, x + 150, py + 60, 0.72, () => artPowerBubble(ctx, t));
  });

  // ---- the scenery ----
  y = 2060;
  section(ctx, y, 640, 'Le décor', 'Ciel chaud à l’horizon, trois chaînes de montagnes enneigées, sapins au loin, alpage fleuri, chalet de départ.', W);
  const px = 60, pyy = y + 120, pwid = W - 120, ph = 500;
  ctx.save(); ctx.beginPath(); ctx.roundRect(px, pyy, pwid, ph, 16); ctx.clip(); ctx.translate(px, pyy);
  artSky(ctx, pwid, ph, pwid * 0.78, ph * 0.22);
  at(ctx, 420, 90, 1.3, () => artCloud(ctx)); at(ctx, 1300, 60, 0.9, () => artCloud(ctx)); at(ctx, 1900, 120, 1.1, () => artCloud(ctx));
  artRange(ctx, pwid, ph * 0.62, 250, '#8ea9c8', 0.42, 3);
  artRange(ctx, pwid, ph * 0.72, 180, '#6f8fb0', 0.3, 11);
  artRange(ctx, pwid, ph * 0.86, 110, '#5f8f5a', 0, 21);
  for (let i = 0; i < 40; i++) at(ctx, i * 60 + (i % 3) * 13, ph * 0.86 + 6 - (i % 4) * 5, 1, () => artFarFir(ctx, 40 + (i % 3) * 10, i % 2 ? '#3f7048' : '#356541'));
  const pts: [number, number][] = [];
  for (let x = -20; x <= pwid + 20; x += 20) pts.push([x, 300 + x * 0.09 + Math.sin(x / 140) * 10]);
  artSlope(ctx, pts, ph + 10, 4);
  at(ctx, 220, 300 + 220 * 0.09 + Math.sin(220 / 140) * 10 + 4, 1.4, () => artChalet(ctx, 0.4));
  for (const fx of [520, 1200, 1820]) at(ctx, fx, 300 + fx * 0.09 + Math.sin(fx / 140) * 10 + 4, 1.5, () => artFir(ctx));
  ctx.restore();

  // ---- the interface ----
  y = 2730;
  section(ctx, y, 320, 'L’interface', 'Logo, boutons à relief, compteurs sur pastilles sombres, la vie en mini-meule. Polices : Lilita One et Fredoka (libres).', W);
  at(ctx, 470, y + 212, 1, () => artLogo(ctx, 84));
  artButton(ctx, 820, y + 130, 300, 84, 'JOUER', 'primary', (c, cx, cy, s) => { c.fillStyle = '#5a3510'; c.beginPath(); c.moveTo(cx - s * 0.45, cy - s * 0.6); c.lineTo(cx + s * 0.6, cy); c.lineTo(cx - s * 0.45, cy + s * 0.6); c.closePath(); c.fill(); });
  artButton(ctx, 1140, y + 130, 250, 70, 'BOUTIQUE', 'secondary', (c, cx, cy, s) => at(c, cx - s * 0.2, cy, s / 17, () => artPotato(c)));
  artButton(ctx, 1140, y + 214, 250, 70, 'MISSIONS', 'secondary');
  artButton(ctx, 820, y + 230, 300, 56, 'REJOUER', 'red');
  artRoundButton(ctx, 1460, y + 175, 34, artPauseIcon);
  artRoundButton(ctx, 1460, y + 260, 34, artGearIcon);
  artPill(ctx, 1560, y + 160, 220, 56); label(ctx, '1 248 m', 1670, y + 162, 34, DISPLAY, '#ffffff');
  artPill(ctx, 1560, y + 240, 150, 50); at(ctx, 1592, y + 240, 1.2, () => artPotato(ctx)); label(ctx, '57', 1655, y + 242, 30, DISPLAY, '#ffffff');
  at(ctx, 1860, y + 200, 1, () => artWheel(ctx, 'valais', 40, 3, 4, 0));
  label(ctx, 'vie', 1860, y + 268, 22, TEXT, '#6b7a8c');
  at(ctx, 1990, y + 200, 1, () => artWheel(ctx, 'valais', 40, 1, 4, 0));
  label(ctx, 'dernière part', 1990, y + 268, 22, TEXT, '#6b7a8c');
}

function scene(cv: HTMLCanvasElement): void {
  // a phone held sideways (844 × 390) at 2x
  const W = 1688, H = 780, k = 2;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  artSky(ctx, W, H, W * 0.8, H * 0.16);
  at(ctx, 300, 110, 1.4, () => artCloud(ctx)); at(ctx, 1100, 70, 1, () => artCloud(ctx));
  artRange(ctx, W, H * 0.5, 260, '#8ea9c8', 0.42, 3, 120);
  artRange(ctx, W, H * 0.62, 190, '#6f8fb0', 0.3, 11, 260);
  artRange(ctx, W, H * 0.8, 120, '#5f8f5a', 0, 21, 400);
  for (let i = 0; i < 32; i++) at(ctx, i * 56 + (i % 3) * 11, H * 0.8 + 6 - (i % 4) * 5, 1, () => artFarFir(ctx, 44 + (i % 3) * 12, i % 2 ? '#3f7048' : '#356541'));
  // the world, 1.44 px per unit (the game's scale on this phone, at 2x)
  const S = Math.min(390 / 540, 844 / 700) * k;
  ctx.save(); ctx.scale(S, S);
  const vw = W / S, vh = H / S;
  const g = (x: number): number => 150 + x * 0.3 + Math.sin(x / 90) * 12 + (x > 700 ? (x - 700) * 0.12 : 0);
  const pts: [number, number][] = [];
  for (let x = -20; x <= vw + 20; x += 20) pts.push([x, g(x)]);
  artSlope(ctx, pts, vh + 20, 9);
  at(ctx, 120, g(120) + 3, 1, () => artFir(ctx));
  for (let i = 0; i < 5; i++) { const x = 400 + i * 34; at(ctx, x, g(x) - 55 - Math.sin(i / 4 * Math.PI) * 25, 1, () => artPotato(ctx)); }
  at(ctx, 640, g(640), 1, () => artRock(ctx));
  at(ctx, 780, g(780) - 80, 1, () => artPowerBubble(ctx, 'magnet'));
  at(ctx, 960, g(960), 1, () => artCow(ctx));
  // the wheel, mid-jump, with speed lines
  const wx = 300, wy = g(300) - 22 - 46;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const [dy, l] of [[-10, 50], [4, 70], [16, 40]]) { ctx.beginPath(); ctx.moveTo(wx - 30, wy + dy); ctx.lineTo(wx - 30 - l, wy + dy - 10); ctx.stroke(); }
  at(ctx, wx, wy, 1, () => artWheel(ctx, 'valais', 22, 3, 4, 2.2));
  at(ctx, 1080, g(1080) + 30, 1.1, () => artFir(ctx));
  ctx.restore();
  // the HUD, at 2x
  ctx.save(); ctx.scale(k, k);
  artPill(ctx, 14, 30, 120, 34); label(ctx, '1 248 m', 74, 31, 22, DISPLAY, '#ffffff');
  artPill(ctx, 14, 72, 80, 30); at(ctx, 34, 72, 0.85, () => artPotato(ctx)); label(ctx, '57', 66, 73, 19, DISPLAY, '#ffffff');
  at(ctx, 34, 120, 1, () => artWheel(ctx, 'valais', 17, 3, 4, 0));
  artRoundButton(ctx, 806, 34, 20, artPauseIcon);
  ctx.restore();
}

/** The feast's guests after the photo of friends (proposal, tools/art/friends-art.ts). */
function friendsSheet(cv: HTMLCanvasElement): void {
  const W = 2400, H = 2290;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#efe7d8'; ctx.fillRect(0, 0, W, H);
  label(ctx, `Raclette Rush — les convives, proposition ${FRIENDS_VERSION}`, 70, 70, 60, DISPLAY, NAVY, 'left');
  label(ctx, 'Sept personnages d’après la photo. Ils attendent la meule bras baissés, puis lèvent les bras en cadence ; trois font le V comme sur la photo.', 70, 122, 26, TEXT, '#6b7a8c', 'left');

  const n = FRIENDS.length, colW = (W - 140) / n;
  // arms down, waiting
  let y = 170;
  section(ctx, y, 700, 'En attendant la meule', 'Bras sur la table, ils regardent arriver le fromage.', W);
  FRIENDS.forEach((f, i) => {
    const x = 70 + colW * (i + 0.5);
    at(ctx, x, y + 660, 3.6, () => {
      ctx.fillStyle = '#e4dccb'; ctx.fillRect(-24, -40, 48, 6);
      friend(ctx, f, 0, false);
    });
    label(ctx, f.label, x, y + 640, 24, TEXT, NAVY);
  });
  // cheering
  y = 900;
  section(ctx, y, 700, 'La fête', 'La meule est arrivée : bras levés, grands sourires.', W);
  FRIENDS.forEach((f, i) => {
    const x = 70 + colW * (i + 0.5);
    at(ctx, x, y + 690, 3.6, () => friend(ctx, f, 1, true));
  });
  // the table at the end of a level
  y = 1630;
  section(ctx, y, 580, 'La tablée', 'Une table pour sept, l’appareil à raclette au milieu. À gauche en grand, à droite à la taille du jeu sur un téléphone.', W);
  const px = 60, pyy = y + 120, pw = 1520, ph = 440;
  ctx.save(); ctx.beginPath(); ctx.roundRect(px, pyy, pw, ph, 16); ctx.clip(); ctx.translate(px, pyy);
  artSky(ctx, pw, ph, pw * 0.85, ph * 0.18);
  artRange(ctx, pw, ph * 0.62, 200, '#8ea9c8', 0.42, 3);
  artRange(ctx, pw, ph * 0.78, 110, '#5f8f5a', 0, 21);
  const pts: [number, number][] = [];
  for (let x = -20; x <= pw + 20; x += 20) pts.push([x, ph - 70]);
  artSlope(ctx, pts, ph + 10, 4);
  at(ctx, 140, ph - 70, 1.6, () => artFinishArch(ctx, 'ARRIVÉE', 0.5));
  at(ctx, 420, ph - 70 - 22 * 1.6, 1.6, () => artWheel(ctx, 'valais', 22, 3, 4, 0.4));
  at(ctx, 960, ph - 70, 1.6, () => friendsFeast(ctx, 0.31, true));
  ctx.restore();
  // the game's framing on a phone held sideways: 820 units across (arch to table), scaled to fit
  const sx = 1620, sw = 720, sy = pyy, sh = sw * 390 / 844;
  ctx.save(); ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 16); ctx.clip(); ctx.translate(sx, sy);
  artSky(ctx, sw, sh, sw * 0.8, sh * 0.2);
  artRange(ctx, sw, sh * 0.62, 150, '#8ea9c8', 0.42, 3);
  const k = sw / 820, gy = sh * 0.68;
  const pts2: [number, number][] = [];
  for (let x = -20; x <= sw + 20; x += 20) pts2.push([x, gy]);
  artSlope(ctx, pts2, sh + 10, 5);
  at(ctx, 120 * k, gy, k, () => artFinishArch(ctx, 'ARRIVÉE', 0.5));
  at(ctx, (120 + 520 - 222) * k, gy - 22 * k, k, () => artWheel(ctx, 'valais', 22, 3, 4, 0.4));
  at(ctx, (120 + 520) * k, gy, k, () => friendsFeast(ctx, 0.31, true));
  ctx.restore();
  label(ctx, 'le cadrage du jeu sur un téléphone en paysage (réduit)', sx + sw / 2, sy + sh + 30, 22, TEXT, '#6b7a8c');
}

async function main(): Promise<void> {
  await Promise.all([document.fonts.load(`40px 'Lilita One'`), document.fonts.load(`600 20px 'Fredoka'`)]);
  sheet(document.getElementById('sheet') as HTMLCanvasElement);
  scene(document.getElementById('scene') as HTMLCanvasElement);
  friendsSheet(document.getElementById('friends') as HTMLCanvasElement);
  (window as unknown as { artReady: boolean }).artReady = true;
}
void main();
