// Raclette Rush: the boot, the loop, the input, and the glue between the run (src/game/), the
// sound, the save and the screens. The game logic steps at a fixed 60 Hz, so a run plays the same
// on any screen; the drawing happens once a frame.

import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import type { Actions, App, Scene, Summary } from './app';
import { rollSound, setHidden, setMood, setMusic, setSound, sfx, startAudio, updateMusic } from './audio';
import { CHEESES, LEVELS, MISSIONS, TUNE, cheeseById } from './config';
import { isUnlocked, recordStars, starParts } from './game/levels';
import { describe, isDone, missionDef, settle } from './game/missions';
import { Run, type RunEvent } from './game/run';
import { buy, choose, load, store as persistSave, type Store } from './game/save';
import { clock, install, manual, params } from './hook';
import { defaultLang, setLang, tr } from './i18n';
import { NATIVE, exitApp, nativeVibrate, onBack } from './native';
import { browserEnv, enterFullscreen, exitFullscreen, fullscreenWay, isFullscreen } from './fullscreen';
import { Fx } from './render/fx';
import { Camera, drawWorld, worldScale } from './render/world';
import { drawScreen } from './screens';
import { Ui } from './ui';

const DT = 1 / 60;
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

/** localStorage, or a memory store when the browser blocks it. */
const storage: Store = (() => {
  try { localStorage.setItem('raclette_probe', '1'); localStorage.removeItem('raclette_probe'); return localStorage; }
  catch { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; }
})();

// The canvas only draws with a web font once it is loaded: ask for both now. Until then the
// fallback fonts draw; the frame after they arrive uses them.
for (const f of [`20px 'Lilita One'`, `600 20px 'Fredoka'`, `700 20px 'Fredoka'`]) void document.fonts.load(f).catch(() => { /* fallback font */ });

const save = load(storage, defaultLang());
const langParam = params.get('lang');

/** A new run: an Adventure level (from 0), or a Quick Game on a random mountain. */
function newRun(level: number | null = null): Run {
  const seed = Number(params.get('seed')) || Math.floor(Math.random() * 2 ** 31);
  const tp = params.get('tutorial');
  // the first run ever is the tutorial, in either mode (the first level or a Quick Game)
  const tutorial = (level === null || level === 0) && (tp === '1' || (tp !== '0' && !save.tutorialDone));
  return new Run(TUNE, cheeseById(save.cheese), seed, tutorial, level === null ? null : LEVELS[level]);
}

const app: App = {
  scene: 'title', sceneT: 0, t: 0, save, run: newRun(), fx: new Fx(), cam: new Camera(), ui: new Ui(),
  view: { W: 1, H: 1, dpr: 1, S: 1, u: 1, inset: { l: 0, r: 0, t: 0, b: 0 } },
  shopIdx: 0, summary: null, toasts: [], settingsFrom: 'title', level: null,
  fullscreen: { way: 'none', on: false },
};
let cheers = 0;
let announced = [false, false, false];

// ---------- screen size ----------
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
document.body.appendChild(probe);

function resize(): void {
  app.fullscreen = { way: fullscreenWay(browserEnv(NATIVE)), on: isFullscreen() };
  const v = app.view;
  v.dpr = Math.min(window.devicePixelRatio || 1, 2);
  v.W = innerWidth; v.H = innerHeight;
  canvas.width = Math.round(v.W * v.dpr); canvas.height = Math.round(v.H * v.dpr);
  v.S = worldScale(v.W, v.H);
  v.u = Math.max(0.7, Math.min(1.5, Math.min(v.W, v.H) / 420));
  app.ui.u = v.u;
  const cs = getComputedStyle(probe), px = (s: string): number => parseFloat(s) || 0;
  v.inset = { t: px(cs.paddingTop), r: px(cs.paddingRight), b: px(cs.paddingBottom), l: px(cs.paddingLeft) };
  app.cam.snap(app.run, v);
}
addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
document.addEventListener('webkitfullscreenchange', resize);
resize();

// ---------- settings ----------
function applySettings(): void {
  const lang = langParam === 'en' || langParam === 'fr' ? langParam : save.settings.lang;
  setLang(lang); document.documentElement.lang = lang;
  setSound(save.settings.sound); setMusic(save.settings.music);
}
applySettings();

function persist(): void { persistSave(storage, save); }

function buzz(ms: number): void {
  if (!save.settings.vibrate || nativeVibrate(ms)) return;
  try { navigator.vibrate?.(ms); } catch { /* not allowed */ }
}

function toast(title: string, sub?: string, reward?: number): void {
  app.toasts.push({ title, sub, reward, life: 2.6 });
  if (app.toasts.length > 3) app.toasts.shift();
}

// ---------- the scenes ----------
function goto(s: Scene): void {
  app.scene = s; app.sceneT = 0;
  if (s !== 'play' && s !== 'pause') rollSound(0, false);
  setMood(s === 'play' || s === 'pause' ? 'play' : s === 'over' ? 'over' : 'menu');
  if (s === 'shop') app.shopIdx = Math.max(0, CHEESES.findIndex(c => c.id === save.cheese));
  app.ui.focusId = null;
}

function freshRun(level: number | null = app.level): void {
  app.level = level;
  app.run = newRun(level);
  cheers = 0;
  app.fx.clear();
  app.cam.snap(app.run, app.view);
  announced = [false, false, false];
  app.summary = null;
}

const REASONS: Record<string, string> = {
  rock: 'La meule est en miettes !', fence: 'Coincée dans la barrière !',
  tree: 'Le sapin a gagné…', cow: 'Une vache a eu ta meule…',
};

/** Pays the run: potatoes, missions, and the record (Quick Game) or the stars (Adventure); then saves. */
function finish(): void {
  const run = app.run, s = run.stats;
  const { state, completed } = settle(MISSIONS, save.missions, s);
  const reward = completed.reduce((n, c) => n + c.def.reward, 0);
  save.missions = state;
  save.bank += s.potatoes + reward;
  save.runs++;
  let record = false, level: Summary['level'] = null;
  if (app.level === null) {
    record = s.meters > save.best;
    if (record) save.best = s.meters;
  } else {
    const i = app.level, won = run.state === 'won';
    const stars = starParts({ won, potatoes: s.potatoes, total: run.potatoTotal, hits: s.hits });
    save.stars = recordStars(save.stars, i, stars.filter(Boolean).length);
    level = { index: i, name: LEVELS[i].name, won, stars, best: save.stars[i], progress: run.progress, total: run.potatoTotal,
      next: i + 1 < LEVELS.length && isUnlocked(save.stars, i + 1) };
  }
  persist();
  const affordable = CHEESES.find(c => !save.owned.includes(c.id) && c.price <= save.bank) ?? null;
  app.summary = { meters: s.meters, record, best: save.best, potatoes: s.potatoes, completed, bank: save.bank,
    reason: REASONS[run.lastHit ?? 'rock'], affordable, level };
}

/** Starts the run made by freshRun(). */
function start(): void {
  app.run.launch();
  goto('play');
  if (app.run.tutorial) toast('Ta meule dévale la montagne !', 'Saute par-dessus les obstacles');
  else if (app.level !== null) toast(`NIVEAU ${app.level + 1}`, LEVELS[app.level].name);
}

const actions: Actions = {
  quick() {
    if (app.level !== null || app.run.state !== 'ready') freshRun(null);
    start();
  },
  playLevel(i) {
    if (!isUnlocked(save.stars, i)) { sfx('denied'); toast(`Termine le niveau ${i} pour le débloquer`); return; }
    freshRun(i);
    start();
  },
  nextLevel() {
    const i = (app.level ?? -1) + 1;
    if (i < LEVELS.length && isUnlocked(save.stars, i)) actions.playLevel(i); else { freshRun(null); goto('levels'); }
  },
  pause() { if (app.scene === 'play' && app.run.state === 'play') { app.run.release(); goto('pause'); } },
  resume() { goto('play'); },
  restart() { if (app.level === null) { freshRun(null); start(); } else actions.playLevel(app.level); },
  menu() { freshRun(null); goto('title'); },
  goto(s) { if (s === 'settings') app.settingsFrom = app.scene; goto(s); },
  back() {
    switch (app.scene) {
      case 'title': exitApp(); break;
      case 'play': actions.pause(); break;
      case 'pause': actions.resume(); break;
      case 'over': if (app.level !== null) { freshRun(null); goto('levels'); } else actions.menu(); break;
      case 'settings': goto(app.settingsFrom); break;
      default: goto('title');
    }
  },
  shopMove(d) { app.shopIdx = (app.shopIdx + d + CHEESES.length) % CHEESES.length; sfx('click'); },
  shopAction() {
    const c = CHEESES[app.shopIdx];
    if (save.owned.includes(c.id)) { if (choose(save, c.id)) { persist(); freshRun(); sfx('click'); } return; }
    const r = buy(save, c);
    if (r === 'bought') { persist(); freshRun(); sfx('buy'); toast(`${c.name} : à toi !`); app.fx.clear(); }
    else if (r === 'poor') { sfx('denied'); toast('Pas assez de pommes de terre', 'Chaque descente en rapporte !'); }
  },
  toggle(k) {
    const st = save.settings;
    if (k === 'lang') st.lang = st.lang === 'fr' ? 'en' : 'fr';
    else st[k] = !st[k];
    persist(); applySettings();
    if (k === 'vibrate') buzz(60);
  },
  replayTutorial() { save.tutorialDone = false; persist(); freshRun(); toast('Le tutoriel rejouera au prochain départ'); },
  fullscreen() {
    if (app.fullscreen.way === 'homescreen') goto('homescreen');
    else if (app.fullscreen.way === 'api') { if (isFullscreen()) exitFullscreen(); else enterFullscreen(); }
  },
};

// ---------- the run's events ----------
function onEvent(e: RunEvent): void {
  const fx = app.fx, m = app.run.m;
  switch (e.type) {
    case 'jump': sfx('jump'); fx.burst(m.x, m.y + m.r, ['#e9f5ff', '#cfe8c2'], 6, 120); break;
    case 'land': sfx('land', e.speed); fx.burst(m.x, m.y + m.r, ['#e9f5ff', '#cfe8c2'], 6, 140); break;
    case 'hit': {
      sfx(e.obstacle === 'cow' ? 'moo' : 'hit');
      fx.burst(e.x, e.y, ['#f6d36b', '#ffe9a6', '#c9832c'], 22, 380);
      if (e.obstacle === 'tree' || e.obstacle === 'fence') fx.burst(e.x + 20, e.y, ['#2f6b3a', '#7a5230'], 12, 250);
      fx.pop(e.x, e.y - 40, e.obstacle === 'cow' ? 'Meuh !' : 'Aïe !');
      fx.shake = 0.35;
      buzz(e.dead ? 160 : 45);
      if (e.dead) {
        sfx('dead');
        fx.burst(e.x, e.y, ['#f6d36b', '#ffe9a6', '#c9832c'], 40, 500);
        fx.shake = 0.6;
        finish();
      }
      break;
    }
    case 'shield': sfx('shield'); fx.burst(e.x, e.y, ['#dfe6ee', '#9aa6b4'], 16, 300); fx.pop(e.x, e.y - 40, 'Paré !', '#e8f1ff'); break;
    case 'smash': sfx('smash'); fx.burst(e.x + 20, e.y, ['#8b8f98', '#2f6b3a', '#7a5230'], 18, 420); fx.pop(e.x, e.y - 40, 'Boum !', '#d5ff9a'); fx.shake = 0.2; break;
    case 'clear': if (e.obstacle === 'cow') { sfx('clear'); fx.pop(m.x, m.y - 46, 'Hop !', '#fff'); } break;
    case 'potato': sfx('potato', e.combo); fx.burst(e.x, e.y, ['#d9a85b', '#f0d29a'], 6, 150); break;
    case 'power': {
      sfx('power');
      const name = { shield: 'Poêlon !', magnet: 'Aimant !', turbo: 'Cornichon turbo !', heal: e.bonus ? `+${e.bonus}` : 'Une portion !' }[e.power];
      fx.pop(e.x, e.y - 30, name, '#fffbe0', 20);
      fx.burst(e.x, e.y, ['#ffffff', '#fff3b0'], 14, 260);
      break;
    }
    case 'tutorialDone':
      save.tutorialDone = true; persist();
      toast('Bien joué !', 'Les pommes de terre se dépensent à la boutique');
      break;
    case 'finish': {
      sfx('finish'); buzz(80);
      fx.pop(app.run.tableX, app.run.terrain.groundAt(app.run.tableX) - 150, 'Bon appétit !', '#ffe68a', 26);
      for (let i = 0; i < 4; i++) fx.burst(app.run.finishX, m.y - 80, ['#d52b1e', '#ffffff', '#ffd257'], 14, 420);
      break;
    }
    case 'launch': break;
  }
}

const CHEERS = ['Hourra !', 'Bravo !', 'À table !', 'Youpi !'];

// ---------- the step ----------
function update(dt: number): void {
  app.t += dt; app.sceneT += dt;
  const run = app.run;
  if (app.scene === 'play' || app.scene === 'over' || app.scene === 'title') {
    run.update(dt);
    for (const e of run.drain()) onEvent(e);
  }
  if (app.scene === 'play') {
    if (run.state === 'play') {
      save.missions.slots.forEach((slot, i) => {
        if (announced[i]) return;
        const def = missionDef(MISSIONS, slot.idx);
        if (isDone(def, slot, run.stats)) { announced[i] = true; sfx('mission'); toast('Mission accomplie !', describe(def), def.reward); }
      });
    }
    if (run.state === 'dead' && run.deadT > 1.1) goto('over');
    if (run.state === 'won') {
      // the guests raise their arms in time (src/render/art.ts, 1.6 beats a second): a shout each time
      const beat = Math.floor(app.t * 1.6 - 0.35);
      if (beat !== cheers) {
        cheers = beat; sfx('cheer');
        const gx = run.tableX + (Math.random() - 0.5) * 200, gy = run.terrain.groundAt(run.tableX) - 120;
        app.fx.pop(gx, gy, CHEERS[Math.floor(Math.random() * CHEERS.length)], '#ffffff', 18);
      }
      if (run.wonT > TUNE.finish.celebrate) { finish(); goto('over'); }
    }
  }
  if (app.scene !== 'pause') { app.fx.update(dt); app.cam.follow(run, app.view, dt); }
  for (const t of app.toasts) t.life -= dt;
  app.toasts = app.toasts.filter(t => t.life > 0);
  rollSound(Math.hypot(run.m.vx, run.m.vy), app.scene === 'play' && run.state === 'play' && run.m.grounded);
  updateMusic();
}

function render(): void {
  const v = app.view;
  drawWorld(ctx, v, app.cam, app.run, app.fx, app.t, tr);
  ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
  app.ui.begin();
  drawScreen(ctx, app, actions);
}

// ---------- input ----------
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyZ']);

function keyDown(code: string): void {
  startAudio();
  if (code === 'KeyM') { save.settings.sound = save.settings.music = !(save.settings.sound || save.settings.music); persist(); applySettings(); return; }
  if (app.scene === 'play') {
    if (JUMP_KEYS.has(code)) app.run.press();
    else if (code === 'Escape' || code === 'KeyP' || code === 'Backspace') actions.pause();
    return;
  }
  const ui = app.ui;
  if (app.scene === 'shop' && (code === 'ArrowLeft' || code === 'ArrowRight')) { actions.shopMove(code === 'ArrowLeft' ? -1 : 1); return; }
  if (code === 'ArrowUp' || code === 'ArrowLeft') ui.move(-1);
  else if (code === 'ArrowDown' || code === 'ArrowRight' || code === 'Tab') ui.move(1);
  else if (code === 'Enter' || code === 'Space') {
    const b = ui.focused();
    if (b && app.sceneT > 0.3) { if (b.disabled) sfx('denied'); else { sfx('click'); b.action(); } }
  } else if (code === 'Escape' || code === 'Backspace' || (code === 'KeyP' && app.scene === 'pause')) actions.back();
}

function keyUp(code: string): void {
  if (JUMP_KEYS.has(code)) app.run.release();
}

addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return;
  keyDown(e.code);
});
addEventListener('keyup', e => keyUp(e.code));

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  startAudio();
  app.ui.keyboard = false;
  const b = app.ui.at(e.clientX, e.clientY);
  if (b) {
    if (app.sceneT < 0.3) return;
    if (b.disabled) { sfx('denied'); return; }
    sfx('click'); b.action(); return;
  }
  if (app.scene === 'play') app.run.press();
});
addEventListener('pointerup', () => app.run.release());
addEventListener('pointercancel', () => app.run.release());
addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (document.hidden) actions.pause();
  setHidden(document.hidden);
});
onBack(() => actions.back());

// ---------- the loop ----------
const sceneParam = params.get('scene') as Scene | null;
const levelParam = Number(params.get('level'));
if (levelParam >= 1 && levelParam <= LEVELS.length) { // ?level=n: straight into a level, open or not (for checks)
  freshRun(levelParam - 1); start();
} else if (sceneParam && ['title', 'play', 'shop', 'missions', 'settings', 'levels'].includes(sceneParam)) {
  if (sceneParam === 'play') actions.quick(); else actions.goto(sceneParam);
}

const pendingUp: string[] = [];
install({
  get scene() { return app.scene; },
  get state() { return app; },
  press(code) { keyDown(code); pendingUp.push(code); },
  hold(code, on) { if (on) keyDown(code); else keyUp(code); },
  step(n = 1, draw = true) {
    for (let i = 0; i < n; i++) { update(DT); while (pendingUp.length) keyUp(pendingUp.shift()!); }
    if (draw) render();
  },
});

let acc = 0, last = clock.now();
function frame(): void {
  const now = clock.now();
  acc += Math.min(0.25, now - last); last = now;
  let n = 0;
  while (acc >= DT && n < 5) { update(DT); acc -= DT; n++; }
  if (n === 5) acc = 0;
  render();
  requestAnimationFrame(frame);
}
if (manual) render(); else requestAnimationFrame(frame);
