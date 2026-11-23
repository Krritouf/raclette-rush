// The screens over the world, in CSS pixels: the title, the HUD, the pause, the end of a run,
// the shop, the missions and the settings. Each screen draws its buttons through Ui and wires
// them to the Actions; it never changes the game's state itself.

import type { Actions, App } from './app';
import { CHEESES, MISSIONS } from './config';
import { describe, missionDef, progressWith } from './game/missions';
import type { PowerType } from './game/types';
import { tr } from './i18n';
import { COL, drawGear, drawPauseIcon, drawPortionIcon, drawPotato, drawPowerIcon, drawWheel, roundRect } from './render/draw';
import { FONT, text } from './ui';

type Ctx = CanvasRenderingContext2D;

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
  ctx.fillStyle = `rgba(10,30,50,${a})`; ctx.fillRect(0, 0, app.view.W, app.view.H);
}

const potatoIcon = (ctx: Ctx, cx: number, cy: number, s: number): void => drawPotato(ctx, cx, cy, s / 9);

/** The potatoes in the bank, top right (or where asked). */
function bank(ctx: Ctx, app: App, x: number, y: number, align: 'left' | 'right' = 'right'): void {
  const u = app.view.u, s = String(app.save.bank);
  ctx.font = `800 ${20 * u}px ${FONT}`;
  const w = ctx.measureText(s).width;
  const x0 = align === 'right' ? x - w - 26 * u : x;
  drawPotato(ctx, x0 + 10 * u, y, 1.1 * u);
  text(ctx, s, x0 + 24 * u, y, 20 * u, { weight: 800, align: 'left', color: COL.navy, outline: 'rgba(255,255,255,0.85)', raw: true });
}

/** A screen's top bar: the back button, the title and the bank. */
function header(ctx: Ctx, app: App, act: Actions, label: string): number {
  const { W, u } = app.view, p = pad(app), h = 46 * u;
  app.ui.button(ctx, { id: 'back', x: p.l, y: p.t, w: h, h, label: '', style: 'ghost', action: () => act.back(),
    icon: (c, cx, cy, s) => { c.strokeStyle = COL.navy; c.lineWidth = s * 0.28; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(cx + s * 0.4, cy - s * 0.7); c.lineTo(cx - s * 0.35, cy); c.lineTo(cx + s * 0.4, cy + s * 0.7); c.stroke(); } });
  text(ctx, label, W / 2, p.t + h / 2, 28 * u, { weight: 900, color: '#fff', outline: COL.navy, outlineW: 6 * u, maxW: W - 2 * (p.l + h + 64 * u) });
  bank(ctx, app, W - p.r, p.t + h / 2);
  return p.t + h + 14 * u;
}

function bar(ctx: Ctx, x: number, y: number, w: number, h: number, k: number, col: string): void {
  roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(22,50,74,0.18)'; ctx.fill();
  if (k > 0) { roundRect(ctx, x, y, Math.max(h, w * Math.min(1, k)), h, h / 2); ctx.fillStyle = col; ctx.fill(); }
}

function panel(ctx: Ctx, x: number, y: number, w: number, h: number, u: number): void {
  roundRect(ctx, x, y + 5 * u, w, h, 18 * u); ctx.fillStyle = 'rgba(22,50,74,0.35)'; ctx.fill();
  roundRect(ctx, x, y, w, h, 18 * u); ctx.fillStyle = COL.cream; ctx.fill();
}

// ---------- the title ----------
function logo(ctx: Ctx, app: App, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.05);
  text(ctx, 'RACLETTE', 0, -size * 0.42, size * 0.8, { weight: 900, color: COL.paste, outline: '#5a3510', outlineW: size * 0.14, raw: true });
  text(ctx, 'RUSH', size * 0.25, size * 0.42, size, { weight: 900, color: COL.red, outline: COL.cream, outlineW: size * 0.14, raw: true });
  ctx.translate(-size * 1.35, size * 0.42);
  drawWheel(ctx, CHEESES[0], size * 0.42, 4, 4, app.t * 2);
  ctx.restore();
}

function title(ctx: Ctx, app: App, act: Actions): void {
  const { W, H, u } = app.view, p = pad(app), ui = app.ui;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(10,30,50,0.35)'); g.addColorStop(1, 'rgba(10,30,50,0.05)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const logoSize = Math.min(64 * u, W * 0.13);
  const bw = Math.min(300 * u, W - p.l - p.r), playH = 64 * u, rowH = 50 * u, gap = 14 * u;
  const total = logoSize * 2.2 + gap * 2 + playH + rowH;
  let y = Math.max(p.t + 40 * u, (H - total) / 2);
  logo(ctx, app, W / 2, y + logoSize * 0.9, logoSize);
  y += logoSize * 2.2 + gap;
  ui.button(ctx, { id: 'play', x: W / 2 - bw / 2, y, w: bw, h: playH, label: 'JOUER', style: 'primary', action: () => act.play(),
    icon: (c, cx, cy, s) => { c.fillStyle = '#5a3510'; c.beginPath(); c.moveTo(cx - s * 0.5, cy - s * 0.65); c.lineTo(cx + s * 0.6, cy); c.lineTo(cx - s * 0.5, cy + s * 0.65); c.closePath(); c.fill(); } });
  y += playH + gap;
  const hw = (bw - gap) / 2;
  ui.button(ctx, { id: 'shop', x: W / 2 - bw / 2, y, w: hw, h: rowH, label: 'BOUTIQUE', action: () => act.goto('shop'), icon: potatoIcon });
  ui.button(ctx, { id: 'missions', x: W / 2 + gap / 2, y, w: hw, h: rowH, label: 'MISSIONS', action: () => act.goto('missions'),
    icon: (c, cx, cy, s) => { c.strokeStyle = COL.red; c.lineWidth = s * 0.3; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - s * 0.6, cy); c.lineTo(cx - s * 0.1, cy + s * 0.5); c.lineTo(cx + s * 0.7, cy - s * 0.6); c.stroke(); } });

  const gs = 46 * u;
  ui.button(ctx, { id: 'settings', x: W - p.r - gs, y: p.t, w: gs, h: gs, label: '', style: 'ghost', action: () => act.goto('settings'),
    icon: (c, cx, cy, s) => drawGear(c, cx, cy, s, COL.navy) });
  bank(ctx, app, p.l, p.t + gs / 2, 'left');
  if (app.save.best > 0) text(ctx, `Record : ${app.save.best} m`, p.l, H - p.b - 8 * u, 17 * u, { weight: 800, align: 'left', color: '#fff', outline: 'rgba(10,30,50,0.6)', outlineW: 4 * u });
}

// ---------- in play ----------
const POWER_COL: Record<PowerType, string> = { shield: '#9aa6b4', magnet: COL.red, turbo: '#5a9a2e', heal: COL.paste };

function hud(ctx: Ctx, app: App, act: Actions, buttons = true): void {
  const { W, H, u } = app.view, p = pad(app), run = app.run, m = run.m;
  const o = { outline: 'rgba(255,255,255,0.9)', outlineW: 5 * u };
  text(ctx, `${run.meters} m`, p.l, p.t + 16 * u, 30 * u, { weight: 900, align: 'left', ...o, raw: true });
  drawPotato(ctx, p.l + 10 * u, p.t + 50 * u, 1.05 * u);
  text(ctx, `${run.stats.potatoes}`, p.l + 26 * u, p.t + 50 * u, 20 * u, { weight: 800, align: 'left', ...o, raw: true });
  for (let i = 0; i < m.maxPortions; i++) drawPortionIcon(ctx, p.l + 4 * u + i * 24 * u, p.t + 86 * u, 12 * u, i < m.portions);

  const bs = 48 * u;
  if (buttons) app.ui.button(ctx, { id: 'pause', x: W - p.r - bs, y: p.t, w: bs, h: bs, label: '', style: 'ghost', action: () => act.pause(),
    icon: (c, cx, cy, s) => drawPauseIcon(c, cx, cy, s, COL.navy) });
  // the bonuses in use
  const T = run.tune.powers;
  const active: [PowerType, number][] = [];
  if (run.shield) active.push(['shield', 1]);
  if (run.magnet > 0) active.push(['magnet', run.magnet / T.magnetTime]);
  if (run.turbo > 0) active.push(['turbo', run.turbo / T.turboTime]);
  active.forEach(([t, k], i) => {
    const x = W - p.r - bs / 2, y = p.t + bs + 30 * u + i * 44 * u;
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x, y, 17 * u, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = POWER_COL[t]; ctx.lineWidth = 4 * u;
    ctx.beginPath(); ctx.arc(x, y, 17 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
    ctx.save(); ctx.translate(x, y); drawPowerIcon(ctx, t, 10 * u); ctx.restore();
  });

  if (run.hint) {
    const pulse = 1 + Math.sin(app.t * 10) * 0.06;
    const big = run.hint === 'tap' ? 'TOUCHE !' : 'RESTE APPUYÉ !';
    const sub = run.hint === 'tap' ? 'pour sauter' : 'pour un grand saut';
    text(ctx, big, W / 2, H * 0.3, 40 * u * pulse, { weight: 900, color: '#fff', outline: COL.navy, outlineW: 7 * u });
    text(ctx, sub, W / 2, H * 0.3 + 40 * u, 20 * u, { weight: 800, color: '#fff', outline: COL.navy, outlineW: 5 * u });
    const k = (app.t * 1.5) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 4 * u;
    ctx.beginPath(); ctx.arc(W / 2, H * 0.3 + 100 * u, 14 * u + k * 30 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(W / 2, H * 0.3 + 100 * u, 12 * u, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- pause ----------
function column(ctx: Ctx, app: App, items: { id: string; label: string; action: () => void; style?: 'primary' | 'secondary' }[], top: number): void {
  const { W, u } = app.view, bw = Math.min(280 * u, W - 40), bh = 52 * u, gap = 12 * u;
  items.forEach((it, i) => app.ui.button(ctx, { ...it, x: W / 2 - bw / 2, y: top + i * (bh + gap), w: bw, h: bh }));
}

function pause(ctx: Ctx, app: App, act: Actions): void {
  const { W, H, u } = app.view;
  dim(ctx, app, 0.55);
  const h = 60 * u + 4 * 64 * u, top = Math.max(10, (H - h) / 2);
  text(ctx, 'PAUSE', W / 2, top + 22 * u, 38 * u, { weight: 900, color: '#fff' });
  column(ctx, app, [
    { id: 'resume', label: 'REPRENDRE', action: () => act.resume(), style: 'primary' },
    { id: 'restart', label: 'RECOMMENCER', action: () => act.restart() },
    { id: 'settings', label: 'RÉGLAGES', action: () => act.goto('settings') },
    { id: 'menu', label: 'MENU', action: () => act.menu() },
  ], top + 60 * u);
}

// ---------- the end of a run ----------
function over(ctx: Ctx, app: App, act: Actions): void {
  const { W, H, u } = app.view, s = app.summary, ui = app.ui;
  dim(ctx, app, Math.min(0.55, app.sceneT * 2));
  if (!s) return;
  const lines = s.completed.length;
  const pw = Math.min(460 * u, W - 24), ph = Math.min(H - 20, (250 + lines * 26 + (s.affordable ? 26 : 0)) * u);
  const px = W / 2 - pw / 2, py = H / 2 - ph / 2;
  panel(ctx, px, py, pw, ph, u);
  let y = py + 30 * u;
  text(ctx, s.reason, W / 2, y, 22 * u, { weight: 800, maxW: pw - 30 * u });
  y += 46 * u;
  text(ctx, `${s.meters} m`, W / 2, y, 48 * u, { weight: 900, color: COL.paste, outline: '#5a3510', outlineW: 7 * u, raw: true });
  y += 38 * u;
  if (s.record) {
    const pulse = 1 + Math.sin(app.t * 8) * 0.05;
    text(ctx, 'NOUVEAU RECORD !', W / 2, y, 20 * u * pulse, { weight: 900, color: COL.red });
  } else text(ctx, `Record : ${s.best} m`, W / 2, y, 17 * u, { weight: 700, color: 'rgba(22,50,74,0.7)' });
  y += 32 * u;
  const pt = `+${s.potatoes}`;
  ctx.font = `800 ${22 * u}px ${FONT}`;
  const tw = ctx.measureText(pt).width;
  drawPotato(ctx, W / 2 - tw / 2 - 14 * u, y, 1.2 * u);
  text(ctx, pt, W / 2 + 6 * u, y, 22 * u, { weight: 800, raw: true });
  y += 28 * u;
  for (const c of s.completed) {
    text(ctx, `✓ ${tr(describe(c.def))}  +${c.def.reward}`, W / 2, y, 15 * u, { weight: 700, color: '#2e7d32', maxW: pw - 30 * u, raw: true });
    y += 26 * u;
  }
  if (s.affordable) { text(ctx, `Tu peux acheter : ${s.affordable.name} !`, W / 2, y, 15 * u, { weight: 800, color: '#a0521c', maxW: pw - 30 * u }); y += 26 * u; }
  const bh = 50 * u, by = py + ph - bh - 20 * u, gap = 12 * u;
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
  // the wheel, with arrows either side
  const wx = wide ? p.l + (W - p.l - p.r) * 0.27 : W / 2;
  const wy = wide ? top + areaH * 0.45 : top + Math.min(areaH * 0.22, 110 * u);
  const wr = Math.min(wide ? areaH * 0.28 : areaH * 0.15, 90 * u);
  ctx.save(); ctx.translate(wx, wy);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(0, wr * 1.1, wr * 0.9, wr * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  drawWheel(ctx, c, wr, c.portions, c.portions, app.t * 0.8);
  ctx.restore();
  const as = 44 * u, ax = wr + 22 * u;
  const arrow = (dir: number) => (cx2: Ctx, cx: number, cy: number, s: number) => {
    cx2.fillStyle = COL.navy; cx2.beginPath(); cx2.moveTo(cx - dir * s * 0.4, cy - s * 0.6); cx2.lineTo(cx + dir * s * 0.5, cy); cx2.lineTo(cx - dir * s * 0.4, cy + s * 0.6); cx2.closePath(); cx2.fill();
  };
  ui.button(ctx, { id: 'prev', x: wx - ax - as, y: wy - as / 2, w: as, h: as, label: '', style: 'ghost', action: () => act.shopMove(-1), icon: arrow(-1) });
  ui.button(ctx, { id: 'next', x: wx + ax, y: wy - as / 2, w: as, h: as, label: '', style: 'ghost', action: () => act.shopMove(1), icon: arrow(1) });
  // the dots under the wheel
  CHEESES.forEach((_, i) => {
    ctx.fillStyle = i === app.shopIdx ? '#fff' : 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(wx + (i - (CHEESES.length - 1) / 2) * 16 * u, wy + wr + 26 * u, 4.5 * u, 0, Math.PI * 2); ctx.fill();
  });

  // the card
  const cx = wide ? W / 2 + 10 * u : p.l, cw = wide ? W - p.r - cx : W - p.l - p.r;
  const cyTop = wide ? top : wy + wr + 46 * u, ch = wide ? H - p.b - cyTop : Math.min(H - p.b - cyTop, 300 * u);
  panel(ctx, cx, cyTop, cw, ch, u);
  const ix = cx + 20 * u, iw = cw - 40 * u;
  let y = cyTop + 30 * u;
  text(ctx, c.name, ix, y, 26 * u, { weight: 900, align: 'left', maxW: iw });
  y += 28 * u;
  text(ctx, c.desc, ix, y, 15 * u, { weight: 600, align: 'left', color: 'rgba(22,50,74,0.75)', maxW: iw });
  y += 30 * u;
  const rowH = Math.min(28 * u, (ch - 170 * u) / 4);
  const label = (s: string, yy: number): void => { text(ctx, s, ix, yy, 15 * u, { weight: 700, align: 'left', maxW: iw * 0.35 }); };
  const bx = ix + iw * 0.38, bwid = iw * 0.62;
  label('Portions', y);
  for (let i = 0; i < c.portions; i++) drawPortionIcon(ctx, bx + i * 22 * u, y + 4 * u, 10 * u, true);
  y += rowH;
  label('Saut', y); bar(ctx, bx, y - 6 * u, bwid, 12 * u, (c.jump - 0.85) / 0.3, '#5a9a2e'); y += rowH;
  label('Aimant', y); bar(ctx, bx, y - 6 * u, bwid, 12 * u, c.magnet / 100, COL.red); y += rowH;
  label('Taille', y); bar(ctx, bx, y - 6 * u, bwid, 12 * u, (c.radius - 16) / 10, COL.rind);

  const bh = 54 * u, by = cyTop + ch - bh - 18 * u;
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
  const cw = Math.min(560 * u, W - p.l - p.r), x = W / 2 - cw / 2;
  const gap = 12 * u, avail = H - top - p.b - 30 * u, ch = Math.min(82 * u, (avail - 2 * gap) / 3);
  const empty = { meters: 0, potatoes: 0, jumps: 0, hits: 0, powerups: 0, noHit: 0, airTime: 0, cleared: { rock: 0, fence: 0, tree: 0, cow: 0 } };
  app.save.missions.slots.forEach((slot, i) => {
    const def = missionDef(MISSIONS, slot.idx), y = top + i * (ch + gap);
    panel(ctx, x, y, cw, ch, u);
    const prog = progressWith(def, slot, empty);
    text(ctx, describe(def), x + 18 * u, y + ch * 0.32, 17 * u, { weight: 800, align: 'left', maxW: cw - 120 * u });
    bar(ctx, x + 18 * u, y + ch * 0.62, cw - 150 * u, 12 * u, prog / def.target, '#5a9a2e');
    text(ctx, `${prog} / ${def.target}`, x + cw - 124 * u, y + ch * 0.62 + 6 * u, 14 * u, { weight: 700, align: 'left', raw: true });
    drawPotato(ctx, x + cw - 64 * u, y + ch * 0.32, 1.1 * u);
    text(ctx, `+${def.reward}`, x + cw - 50 * u, y + ch * 0.32, 18 * u, { weight: 900, align: 'left', color: '#a0521c', raw: true });
  });
  text(ctx, 'Les missions accomplies rapportent des pommes de terre à la fin de la descente', W / 2, top + 3 * (ch + gap) + 8 * u, 14 * u,
    { weight: 700, color: '#fff', outline: 'rgba(10,30,50,0.6)', outlineW: 4 * u, maxW: W - p.l - p.r });
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
  const bw = Math.min(460 * u, W - p.l - p.r), gap = 10 * u;
  const bh = Math.min(54 * u, (H - top - p.b - gap * (rows.length - 1)) / rows.length);
  rows.forEach((r, i) => {
    const x = W / 2 - bw / 2, y = top + i * (bh + gap);
    app.ui.button(ctx, { id: r.id, x, y, w: bw, h: bh, label: ' ', action: r.action });
    text(ctx, r.label, x + 20 * u, y + bh / 2, 19 * u, { weight: 800, align: 'left', maxW: bw * 0.55 });
    if (r.value) text(ctx, r.value, x + bw - 20 * u, y + bh / 2, 17 * u, { weight: 800, align: 'right', color: r.on ? '#2e7d32' : '#a33', maxW: bw * 0.4 });
  });
}

// ---------- banners ----------
function toasts(ctx: Ctx, app: App): void {
  const { W, u } = app.view, p = pad(app);
  let y = p.t + (app.scene === 'play' ? 4 : 64) * u;
  for (const t of app.toasts) {
    const a = Math.min(1, t.life * 3, (2.6 - t.life) * 6);
    const w = Math.min(440 * u, W - 2 * (p.l + 60 * u)), h = (t.sub ? 58 : 40) * u;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(0, (1 - Math.min(1, (2.6 - t.life) * 6)) * -20 * u);
    roundRect(ctx, W / 2 - w / 2, y, w, h, 14 * u); ctx.fillStyle = 'rgba(22,50,74,0.88)'; ctx.fill();
    text(ctx, t.title, W / 2, y + (t.sub ? 19 : 20) * u, 18 * u, { weight: 900, color: COL.paste, maxW: w - 80 * u });
    if (t.sub) text(ctx, t.sub, W / 2, y + 41 * u, 14 * u, { weight: 600, color: '#fff', maxW: w - 24 * u });
    if (t.reward) {
      drawPotato(ctx, W / 2 + w / 2 - 54 * u, y + 19 * u, 0.9 * u);
      text(ctx, `+${t.reward}`, W / 2 + w / 2 - 42 * u, y + 19 * u, 15 * u, { weight: 900, align: 'left', color: COL.paste, raw: true });
    }
    ctx.restore();
    y += h + 8 * u;
  }
}
