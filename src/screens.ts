// The screens over the world, in CSS pixels, in the look of src/render/art.ts: the title, the
// HUD, the pause, the end of a run, the shop, the missions and the settings. Each screen draws its
// buttons through Ui and wires them to the Actions; it never changes the game's state itself.

import type { Actions, App } from './app';
import { CHEESES, MISSIONS } from './config';
import { describe, missionDef, progressWith } from './game/missions';
import type { PowerType } from './game/types';
import { tr } from './i18n';
import { INK, artGearIcon, artLogo, artPauseIcon, artPill, artPotato, artPowerIcon, artWheel, roundRect } from './render/art';
import { NAVY, font, text } from './ui';

type Ctx = CanvasRenderingContext2D;

const CREAM = '#fff6e2', GREEN = '#4f9a2e', BROWN = '#a0521c';

/** Draws the screen of the current scene. */
export function drawScreen(ctx: Ctx, app: App, act: Actions): void {
  switch (app.scene) {
    case 'title': title(ctx, app, act); break;
    case 'play': hud(ctx, app, act); break;
    case 'pause': hud(ctx, app, act, false); pause(ctx, app, act); break;
    case 'over': over(ctx, app, act); break;
    case 'shop': shop(ctx, app, act); break;
    case 'missions': missions(ctx, app, act); break;
    case 'settings': settings(ctx, app, act); break;
  }
  toasts(ctx, app);
}

// ---------- shared pieces ----------
function pad(app: App): { l: number; r: number; t: number; b: number } {
  const p = 14 * app.view.u, i = app.view.inset;
  return { l: p + i.l, r: p + i.r, t: p + i.t, b: p + i.b };
}

function dim(ctx: Ctx, app: App, a = 0.5): void {
  ctx.fillStyle = `rgba(15,30,50,${a})`; ctx.fillRect(0, 0, app.view.W, app.view.H);
}

/** A potato centred on (cx, cy), about 2.4 × s wide. */
function potato(ctx: Ctx, cx: number, cy: number, s: number): void {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s / 9, s / 9); artPotato(ctx); ctx.restore();
}
const potatoIcon = (ctx: Ctx, cx: number, cy: number, s: number): void => potato(ctx, cx, cy, s * 0.85);

/** A dark pill with a potato and a number: the bank. x is its left edge, or its right edge. */
function bank(ctx: Ctx, app: App, x: number, cy: number, n: number, align: 'left' | 'right' = 'right'): void {
  const u = app.view.u, s = String(n), h = 34 * u;
  ctx.font = font(21 * u, true);
  const w = ctx.measureText(s).width + 52 * u;
  const x0 = align === 'right' ? x - w : x;
  artPill(ctx, x0, cy, w, h);
  potato(ctx, x0 + 20 * u, cy, 9 * u);
  text(ctx, s, x0 + 38 * u, cy + 1, 21 * u, { display: true, align: 'left', color: '#fff', raw: true });
}

/** A screen's top bar: the back button, the title and the bank. */
function header(ctx: Ctx, app: App, act: Actions, label: string): number {
  const { W, u } = app.view, p = pad(app), h = 46 * u;
  app.ui.button(ctx, { id: 'back', x: p.l, y: p.t, w: h, h, label: '', style: 'ghost', action: () => act.back(),
    icon: (c, cx, cy, s) => { c.strokeStyle = NAVY; c.lineWidth = s * 0.32; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(cx + s * 0.35, cy - s * 0.7); c.lineTo(cx - s * 0.4, cy); c.lineTo(cx + s * 0.35, cy + s * 0.7); c.stroke(); } });
  text(ctx, label, W / 2, p.t + h / 2, 34 * u, { display: true, color: '#fff', outline: INK, outlineW: 7 * u, maxW: W - 2 * (p.l + h + 90 * u) });
  bank(ctx, app, W - p.r, p.t + h / 2, app.save.bank);
  return p.t + h + 18 * u;
}

function bar(ctx: Ctx, x: number, y: number, w: number, h: number, k: number, col: string): void {
  roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(42,59,82,0.15)'; ctx.fill();
  if (k > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, k)), h, h / 2); ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; roundRect(ctx, x + h * 0.3, y + h * 0.15, Math.max(0, w * Math.min(1, k) - h * 0.6), h * 0.3, h * 0.15); ctx.fill();
  }
  roundRect(ctx, x, y, w, h, h / 2); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, h * 0.14); ctx.stroke();
}

/** A cream card with a dark outline and a shadow under it. */
function panel(ctx: Ctx, x: number, y: number, w: number, h: number, u: number): void {
  roundRect(ctx, x, y + 6 * u, w, h, 20 * u); ctx.fillStyle = 'rgba(15,30,50,0.35)'; ctx.fill();
  roundRect(ctx, x, y, w, h, 20 * u); ctx.fillStyle = CREAM; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, 2.6 * u); ctx.stroke();
}

/** One slice of cheese (a quarter of a wheel) for counting portions. */
function slice(ctx: Ctx, x: number, y: number, r: number, full: boolean): void {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, 0); ctx.closePath();
  ctx.fillStyle = full ? '#f7d46a' : 'rgba(42,59,82,0.15)'; ctx.fill();
  if (full) { ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.4, r * 0.16); ctx.stroke(); }
}

// ---------- the title ----------
function title(ctx: Ctx, app: App, act: Actions): void {
  const { W, H, u } = app.view, p = pad(app), ui = app.ui;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(15,30,50,0.3)'); g.addColorStop(1, 'rgba(15,30,50,0.05)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const logo = Math.min(62 * u, (W - 40) / 4.6);
  const bw = Math.min(310 * u, W - p.l - p.r), playH = 66 * u, rowH = 52 * u, gap = 16 * u;
  const total = logo * 2.3 + gap * 2 + playH + rowH;
  let y = Math.max(p.t + 44 * u, (H - total) / 2);
  ctx.save(); ctx.translate(W / 2 + logo * 0.45, y + logo * 1.05); artLogo(ctx, logo, app.t); ctx.restore();
  y += logo * 2.3 + gap;
  ui.button(ctx, { id: 'play', x: W / 2 - bw / 2, y, w: bw, h: playH, label: 'JOUER', style: 'primary', action: () => act.play(),
    icon: (c, cx, cy, s) => { c.fillStyle = '#5a3510'; c.beginPath(); c.moveTo(cx - s * 0.5, cy - s * 0.7); c.lineTo(cx + s * 0.65, cy); c.lineTo(cx - s * 0.5, cy + s * 0.7); c.closePath(); c.fill(); } });
  y += playH + gap;
  const hw = (bw - gap) / 2;
  ui.button(ctx, { id: 'shop', x: W / 2 - bw / 2, y, w: hw, h: rowH, label: 'BOUTIQUE', action: () => act.goto('shop'), icon: potatoIcon });
  ui.button(ctx, { id: 'missions', x: W / 2 + gap / 2, y, w: hw, h: rowH, label: 'MISSIONS', action: () => act.goto('missions'),
    icon: (c, cx, cy, s) => { c.strokeStyle = '#d52b1e'; c.lineWidth = s * 0.34; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(cx - s * 0.6, cy); c.lineTo(cx - s * 0.1, cy + s * 0.5); c.lineTo(cx + s * 0.7, cy - s * 0.6); c.stroke(); } });

  const gs = 48 * u;
  ui.button(ctx, { id: 'settings', x: W - p.r - gs, y: p.t, w: gs, h: gs, label: '', style: 'ghost', action: () => act.goto('settings'), icon: artGearIcon });
  bank(ctx, app, p.l, p.t + gs / 2, app.save.bank, 'left');
  if (app.save.best > 0) {
    const s = tr(`Record : ${app.save.best} m`);
    ctx.font = font(18 * u, true);
    const w = ctx.measureText(s).width + 32 * u, cy = H - p.b - 18 * u;
    artPill(ctx, p.l, cy, w, 34 * u);
    text(ctx, s, p.l + w / 2, cy + 1, 18 * u, { display: true, color: '#fff', raw: true });
  }
}

// ---------- in play ----------
const POWER_COL: Record<PowerType, string> = { shield: '#ffd35a', magnet: '#ff6a5a', turbo: '#8fe05a', heal: '#ff8fb0' };

function hud(ctx: Ctx, app: App, act: Actions, buttons = true): void {
  const { W, H, u } = app.view, p = pad(app), run = app.run, m = run.m;
  // the distance and the potatoes, on dark pills
  const dist = `${run.meters} m`;
  ctx.font = font(24 * u, true);
  const dw = Math.max(110 * u, ctx.measureText(dist).width + 36 * u);
  artPill(ctx, p.l, p.t + 18 * u, dw, 38 * u);
  text(ctx, dist, p.l + dw / 2, p.t + 19 * u, 24 * u, { display: true, color: '#fff', raw: true });
  bank(ctx, app, p.l, p.t + 62 * u, run.stats.potatoes, 'left');
  // the wheel's slices left, as a little wheel
  ctx.save(); ctx.translate(p.l + 20 * u, p.t + 108 * u);
  artWheel(ctx, run.cheese.id, 17 * u, m.portions, m.maxPortions, -Math.PI / 2);
  ctx.restore();

  const bs = 48 * u;
  if (buttons) app.ui.button(ctx, { id: 'pause', x: W - p.r - bs, y: p.t, w: bs, h: bs, label: '', style: 'ghost', action: () => act.pause(), icon: artPauseIcon });
  // the bonuses in use, a ring for the time left
  const T = run.tune.powers;
  const active: [PowerType, number][] = [];
  if (run.shield) active.push(['shield', 1]);
  if (run.magnet > 0) active.push(['magnet', run.magnet / T.magnetTime]);
  if (run.turbo > 0) active.push(['turbo', run.turbo / T.turboTime]);
  active.forEach(([t, k], i) => {
    const x = W - p.r - bs / 2, y = p.t + bs + 34 * u + i * 48 * u, r = 19 * u;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2 * u; ctx.stroke();
    ctx.strokeStyle = POWER_COL[t]; ctx.lineWidth = 4.5 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r - 4 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.scale(0.62 * u, 0.62 * u); artPowerIcon(ctx, t); ctx.restore();
  });

  if (run.hint) {
    const pulse = 1 + Math.sin(app.t * 10) * 0.06;
    const big = run.hint === 'tap' ? 'TOUCHE !' : 'RESTE APPUYÉ !';
    const sub = run.hint === 'tap' ? 'pour sauter' : 'pour un grand saut';
    text(ctx, big, W / 2, H * 0.3, 46 * u * pulse, { display: true, color: '#ffe68a', outline: INK, outlineW: 8 * u });
    text(ctx, sub, W / 2, H * 0.3 + 42 * u, 22 * u, { weight: 700, color: '#fff', outline: INK, outlineW: 5 * u });
    const k = (app.t * 1.5) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 4 * u;
    ctx.beginPath(); ctx.arc(W / 2, H * 0.3 + 100 * u, 14 * u + k * 30 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(W / 2, H * 0.3 + 100 * u, 12 * u, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2 * u; ctx.stroke();
  }
}

// ---------- pause ----------
function column(ctx: Ctx, app: App, items: { id: string; label: string; action: () => void; style?: 'primary' | 'secondary' }[], top: number): void {
  const { W, u } = app.view, bw = Math.min(290 * u, W - 40), bh = 52 * u, gap = 14 * u;
  items.forEach((it, i) => app.ui.button(ctx, { ...it, x: W / 2 - bw / 2, y: top + i * (bh + gap), w: bw, h: bh }));
}

function pause(ctx: Ctx, app: App, act: Actions): void {
  const { W, H, u } = app.view;
  dim(ctx, app, 0.55);
  const h = 64 * u + 4 * 66 * u, top = Math.max(10, (H - h) / 2);
  text(ctx, 'PAUSE', W / 2, top + 22 * u, 44 * u, { display: true, color: '#fff', outline: INK, outlineW: 8 * u });
  column(ctx, app, [
    { id: 'resume', label: 'REPRENDRE', action: () => act.resume(), style: 'primary' },
    { id: 'restart', label: 'RECOMMENCER', action: () => act.restart() },
    { id: 'settings', label: 'RÉGLAGES', action: () => act.goto('settings') },
    { id: 'menu', label: 'MENU', action: () => act.menu() },
  ], top + 62 * u);
}

// ---------- the end of a run ----------
function over(ctx: Ctx, app: App, act: Actions): void {
  const { W, H, u } = app.view, s = app.summary, ui = app.ui;
  dim(ctx, app, Math.min(0.55, app.sceneT * 2));
  if (!s) return;
  const lines = s.completed.length;
  const pw = Math.min(470 * u, W - 24), ph = Math.min(H - 20, (262 + lines * 26 + (s.affordable ? 26 : 0)) * u);
  const px = W / 2 - pw / 2, py = H / 2 - ph / 2;
  panel(ctx, px, py, pw, ph, u);
  let y = py + 32 * u;
  text(ctx, s.reason, W / 2, y, 24 * u, { display: true, maxW: pw - 30 * u });
  y += 48 * u;
  text(ctx, `${s.meters} m`, W / 2, y, 54 * u, { display: true, color: '#ffd257', outline: INK, outlineW: 8 * u, raw: true });
  y += 40 * u;
  if (s.record) {
    const pulse = 1 + Math.sin(app.t * 8) * 0.05;
    text(ctx, 'NOUVEAU RECORD !', W / 2, y, 22 * u * pulse, { display: true, color: '#e8432f' });
  } else text(ctx, `Record : ${s.best} m`, W / 2, y, 18 * u, { color: 'rgba(42,59,82,0.7)' });
  y += 34 * u;
  const pt = `+${s.potatoes}`;
  ctx.font = font(26 * u, true);
  const tw = ctx.measureText(pt).width;
  potato(ctx, W / 2 - tw / 2 - 16 * u, y, 11 * u);
  text(ctx, pt, W / 2 + 8 * u, y + 1, 26 * u, { display: true, raw: true });
  y += 30 * u;
  for (const c of s.completed) {
    text(ctx, `✓ ${tr(describe(c.def))}  +${c.def.reward}`, W / 2, y, 16 * u, { weight: 700, color: GREEN, maxW: pw - 30 * u, raw: true });
    y += 26 * u;
  }
  if (s.affordable) { text(ctx, `Tu peux acheter : ${s.affordable.name} !`, W / 2, y, 16 * u, { weight: 700, color: BROWN, maxW: pw - 30 * u }); y += 26 * u; }
  const bh = 52 * u, by = py + ph - bh - 22 * u, gap = 12 * u;
  const n = s.affordable ? 3 : 2, bw = (pw - 40 * u - gap * (n - 1)) / n;
  ui.button(ctx, { id: 'again', x: px + 20 * u, y: by, w: bw, h: bh, label: 'REJOUER', style: 'primary', action: () => act.restart() });
  ui.button(ctx, { id: 'menu', x: px + 20 * u + bw + gap, y: by, w: bw, h: bh, label: 'MENU', action: () => act.menu() });
  if (s.affordable) ui.button(ctx, { id: 'shop', x: px + 20 * u + 2 * (bw + gap), y: by, w: bw, h: bh, label: 'BOUTIQUE', action: () => { act.menu(); act.goto('shop'); }, icon: potatoIcon });
}

// ---------- the shop ----------
function shop(ctx: Ctx, app: App, act: Actions): void {
  const { W, H, u } = app.view, p = pad(app), ui = app.ui, save = app.save;
  dim(ctx, app, 0.35);
  const top = header(ctx, app, act, 'BOUTIQUE');
  const c = CHEESES[app.shopIdx], owned = save.owned.includes(c.id), chosen = save.cheese === c.id;
  const wide = W > H * 1.15;
  const areaH = H - top - p.b;
  // the wheel, turning slowly, with arrows either side
  const wx = wide ? p.l + (W - p.l - p.r) * 0.27 : W / 2;
  const wy = wide ? top + areaH * 0.42 : top + Math.min(areaH * 0.2, 100 * u);
  const wr = Math.min(wide ? areaH * 0.3 : areaH * 0.15, 95 * u);
  ctx.fillStyle = 'rgba(15,30,50,0.25)'; ctx.beginPath(); ctx.ellipse(wx, wy + wr * 1.12, wr * 0.85, wr * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(wx, wy); artWheel(ctx, c.id, wr, c.portions, c.portions, app.t * 0.6); ctx.restore();
  const as = 46 * u, ax = wr + 20 * u;
  const arrow = (dir: number) => (g: Ctx, cx: number, cy: number, s: number) => {
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(cx - dir * s * 0.45, cy - s * 0.65); g.lineTo(cx + dir * s * 0.55, cy); g.lineTo(cx - dir * s * 0.45, cy + s * 0.65); g.closePath(); g.fill();
  };
  ui.button(ctx, { id: 'prev', x: wx - ax - as, y: wy - as / 2, w: as, h: as, label: '', style: 'ghost', action: () => act.shopMove(-1), icon: arrow(-1) });
  ui.button(ctx, { id: 'next', x: wx + ax, y: wy - as / 2, w: as, h: as, label: '', style: 'ghost', action: () => act.shopMove(1), icon: arrow(1) });
  CHEESES.forEach((_, i) => {
    const dx = wx + (i - (CHEESES.length - 1) / 2) * 18 * u, dy = wy + wr + 30 * u;
    ctx.beginPath(); ctx.arc(dx, dy, 5 * u, 0, Math.PI * 2);
    ctx.fillStyle = i === app.shopIdx ? '#ffd257' : 'rgba(255,255,255,0.6)'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * u; ctx.stroke();
  });

  // the card
  const cx = wide ? W / 2 + 10 * u : p.l, cw = wide ? W - p.r - cx : W - p.l - p.r;
  const cyTop = wide ? top : wy + wr + 50 * u, ch = wide ? H - p.b - cyTop : Math.min(H - p.b - cyTop, 300 * u);
  panel(ctx, cx, cyTop, cw, ch, u);
  const ix = cx + 20 * u, iw = cw - 40 * u;
  let y = cyTop + 32 * u;
  text(ctx, c.name, ix, y, 30 * u, { display: true, align: 'left', maxW: iw });
  y += 30 * u;
  text(ctx, c.desc, ix, y, 16 * u, { align: 'left', color: 'rgba(42,59,82,0.75)', maxW: iw });
  y += 32 * u;
  const rowH = Math.min(30 * u, (ch - 180 * u) / 4);
  const label = (s: string, yy: number): void => { text(ctx, s, ix, yy, 17 * u, { weight: 700, align: 'left', maxW: iw * 0.35 }); };
  const bx = ix + iw * 0.38, bwid = iw * 0.62;
  label('Portions', y);
  for (let i = 0; i < c.portions; i++) slice(ctx, bx + i * 24 * u, y + 6 * u, 12 * u, true);
  y += rowH;
  label('Saut', y); bar(ctx, bx, y - 7 * u, bwid, 14 * u, (c.jump - 0.85) / 0.3, '#7cc04a'); y += rowH;
  label('Aimant', y); bar(ctx, bx, y - 7 * u, bwid, 14 * u, c.magnet / 100, '#ff6a5a'); y += rowH;
  label('Taille', y); bar(ctx, bx, y - 7 * u, bwid, 14 * u, (c.radius - 16) / 10, '#e2a03c');

  const bh = 56 * u, by = cyTop + ch - bh - 22 * u;
  if (owned) {
    ui.button(ctx, { id: 'buy', x: ix, y: by, w: iw, h: bh, label: chosen ? 'EN JEU' : 'CHOISIR', style: chosen ? 'secondary' : 'primary',
      disabled: chosen, action: () => act.shopAction() });
  } else {
    const short = c.price - save.bank;
    ui.button(ctx, { id: 'buy', x: ix, y: by, w: iw, h: bh, label: `ACHETER ${c.price}`, style: short > 0 ? 'secondary' : 'primary',
      sub: short > 0 ? `Il te manque ${short}` : undefined, icon: potatoIcon, action: () => act.shopAction() });
  }
}

// ---------- the missions ----------
function missions(ctx: Ctx, app: App, act: Actions): void {
  const { W, H, u } = app.view, p = pad(app);
  dim(ctx, app, 0.35);
  const top = header(ctx, app, act, 'MISSIONS');
  const cw = Math.min(580 * u, W - p.l - p.r), x = W / 2 - cw / 2;
  const gap = 14 * u, avail = H - top - p.b - 30 * u, ch = Math.min(84 * u, (avail - 2 * gap) / 3);
  const empty = { meters: 0, potatoes: 0, jumps: 0, hits: 0, powerups: 0, noHit: 0, airTime: 0, cleared: { rock: 0, fence: 0, tree: 0, cow: 0 } };
  app.save.missions.slots.forEach((slot, i) => {
    const def = missionDef(MISSIONS, slot.idx), y = top + i * (ch + gap);
    panel(ctx, x, y, cw, ch, u);
    const prog = progressWith(def, slot, empty);
    text(ctx, describe(def), x + 18 * u, y + ch * 0.32, 18 * u, { weight: 700, align: 'left', maxW: cw - 130 * u });
    bar(ctx, x + 18 * u, y + ch * 0.6, cw - 160 * u, 14 * u, prog / def.target, '#7cc04a');
    text(ctx, `${prog} / ${def.target}`, x + cw - 132 * u, y + ch * 0.6 + 7 * u, 15 * u, { weight: 700, align: 'left', raw: true });
    potato(ctx, x + cw - 70 * u, y + ch * 0.32, 10 * u);
    text(ctx, `+${def.reward}`, x + cw - 54 * u, y + ch * 0.32 + 1, 21 * u, { display: true, align: 'left', color: BROWN, raw: true });
  });
  text(ctx, 'Les missions accomplies rapportent des pommes de terre à la fin de la descente', W / 2, top + 3 * (ch + gap) + 10 * u, 15 * u,
    { weight: 700, color: '#fff', outline: 'rgba(15,30,50,0.7)', outlineW: 4 * u, maxW: W - p.l - p.r });
}

// ---------- the settings ----------
function settings(ctx: Ctx, app: App, act: Actions): void {
  const { W, H, u } = app.view, p = pad(app), st = app.save.settings;
  dim(ctx, app, app.settingsFrom === 'pause' ? 0.6 : 0.35);
  const top = header(ctx, app, act, 'RÉGLAGES');
  const rows: { id: string; label: string; value: string; on: boolean; action: () => void }[] = [
    { id: 'sound', label: 'Sons', value: st.sound ? 'Activés' : 'Désactivés', on: st.sound, action: () => act.toggle('sound') },
    { id: 'music', label: 'Musique', value: st.music ? 'Activée' : 'Désactivée', on: st.music, action: () => act.toggle('music') },
    { id: 'vibrate', label: 'Vibrations', value: st.vibrate ? 'Activées' : 'Désactivées', on: st.vibrate, action: () => act.toggle('vibrate') },
    { id: 'lang', label: 'Langue', value: st.lang === 'fr' ? 'Français' : 'English', on: true, action: () => act.toggle('lang') },
    { id: 'tuto', label: 'Revoir le tutoriel', value: '', on: true, action: () => act.replayTutorial() },
  ];
  const bw = Math.min(470 * u, W - p.l - p.r), gap = 12 * u;
  const bh = Math.min(54 * u, (H - top - p.b - gap * (rows.length - 1)) / rows.length - 4 * u);
  rows.forEach((r, i) => {
    const x = W / 2 - bw / 2, y = top + i * (bh + gap);
    app.ui.button(ctx, { id: r.id, x, y, w: bw, h: bh, label: ' ', action: r.action });
    text(ctx, r.label, x + 20 * u, y + bh / 2, 20 * u, { display: true, align: 'left', maxW: bw * 0.55 });
    if (r.value) text(ctx, r.value, x + bw - 20 * u, y + bh / 2, 18 * u, { weight: 700, align: 'right', color: r.on ? GREEN : '#c0392b', maxW: bw * 0.4 });
  });
}

// ---------- banners ----------
function toasts(ctx: Ctx, app: App): void {
  const { W, u } = app.view, p = pad(app);
  let y = p.t + (app.scene === 'play' ? 4 : 66) * u;
  for (const t of app.toasts) {
    const a = Math.min(1, t.life * 3, (2.6 - t.life) * 6);
    const w = Math.min(450 * u, W - 2 * (p.l + 130 * u)), h = (t.sub ? 60 : 42) * u;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(0, (1 - Math.min(1, (2.6 - t.life) * 6)) * -20 * u);
    roundRect(ctx, W / 2 - w / 2, y, w, h, 16 * u); ctx.fillStyle = 'rgba(25,40,60,0.92)'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4 * u; ctx.stroke();
    text(ctx, t.title, W / 2, y + (t.sub ? 20 : 21) * u, 21 * u, { display: true, color: '#ffd257', maxW: w - 90 * u });
    if (t.sub) text(ctx, t.sub, W / 2, y + 43 * u, 15 * u, { color: '#fff', maxW: w - 24 * u });
    if (t.reward) {
      potato(ctx, W / 2 + w / 2 - 56 * u, y + 20 * u, 8 * u);
      text(ctx, `+${t.reward}`, W / 2 + w / 2 - 42 * u, y + 21 * u, 17 * u, { display: true, align: 'left', color: '#ffd257', raw: true });
    }
    ctx.restore();
    y += h + 8 * u;
  }
}
