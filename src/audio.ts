// The sound, all made by Web Audio (no sound files): the wheel's rumble, the jumps and hits, the
// cow, the potatoes, and a little Ländler (an alpine waltz in 3/4) that plays on and on. Starts on
// the first input, as browsers ask. Sound effects and music have their own switch.

import { audioContext } from './hook';

/** The sound effects the game plays. */
export type Sfx = 'jump' | 'land' | 'hit' | 'moo' | 'potato' | 'power' | 'shield' | 'smash' | 'dead'
  | 'click' | 'buy' | 'denied' | 'mission' | 'clear' | 'finish' | 'cheer';

/** The music's mood: calm in the menus, livelier in a run, silent for a moment after a fall. */
export type Mood = 'menu' | 'play' | 'over';

interface Audio {
  ac: AudioContext;
  sfx: GainNode;
  music: GainNode;
  noise: AudioBuffer;
  roll: { g: GainNode; f: BiquadFilterNode } | null;
}

let a: Audio | null = null;
let soundOn = true, musicOn = true;
let mood: Mood = 'menu';

const SFX_VOL = 0.55, MUSIC_VOL = 0.22;

/** Starts the sound on a user input (browsers need one), or resumes it. */
export function startAudio(): void {
  if (!a) {
    try {
      const ac = audioContext();
      const sfx = ac.createGain(), music = ac.createGain();
      sfx.gain.value = soundOn ? SFX_VOL : 0; music.gain.value = musicOn ? MUSIC_VOL : 0;
      sfx.connect(ac.destination); music.connect(ac.destination);
      const len = ac.sampleRate, noise = ac.createBuffer(1, len, ac.sampleRate), d = noise.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x3fffffff - 1; }
      a = { ac, sfx, music, noise, roll: null };
      // the rumble of the wheel: looping noise through a band-pass, louder with speed
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = noise; src.loop = true; f.type = 'bandpass'; f.frequency.value = 300; f.Q.value = 0.8; g.gain.value = 0;
      src.connect(f).connect(g).connect(sfx); src.start();
      a.roll = { g, f };
    } catch { a = null; return; }
  }
  if (a.ac.state === 'suspended') void a.ac.resume();
}

/** Switches the sound effects on or off. */
export function setSound(on: boolean): void {
  soundOn = on;
  if (a) a.sfx.gain.setTargetAtTime(on ? SFX_VOL : 0, a.ac.currentTime, 0.02);
}

/** Switches the music on or off. */
export function setMusic(on: boolean): void {
  musicOn = on;
  if (a) a.music.gain.setTargetAtTime(on ? MUSIC_VOL : 0, a.ac.currentTime, 0.05);
}

/** Sets the music's mood. */
export function setMood(m: Mood): void {
  if (m === mood) return;
  mood = m;
  if (!a) return;
  const t = a.ac.currentTime, g = a.music.gain;
  g.cancelScheduledValues(t);
  if (m === 'over') { g.setTargetAtTime(0, t, 0.08); g.setTargetAtTime(musicOn ? MUSIC_VOL : 0, t + 1.6, 0.6); }
  else g.setTargetAtTime(musicOn ? MUSIC_VOL : 0, t, 0.1);
}

/** The rumble follows the wheel: speed in units/s, on while rolling on the ground. */
export function rollSound(speed: number, on: boolean): void {
  if (!a?.roll) return;
  const t = a.ac.currentTime;
  a.roll.g.gain.setTargetAtTime(on ? Math.min(0.22, 0.05 + speed / 5000) : 0, t, 0.06);
  a.roll.f.frequency.setTargetAtTime(160 + speed * 0.45, t, 0.1);
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slide = 0, out?: AudioNode): void {
  if (!a) return;
  const t = a.ac.currentTime + when, o = a.ac.createOscillator(), g = a.ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out ?? a.sfx); o.start(t); o.stop(t + dur + 0.02);
}

function burst(dur: number, freq: number, vol: number, type: BiquadFilterType = 'lowpass', when = 0, out?: AudioNode): void {
  if (!a) return;
  const t = a.ac.currentTime + when, s = a.ac.createBufferSource(), f = a.ac.createBiquadFilter(), g = a.ac.createGain();
  s.buffer = a.noise; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out ?? a.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur);
}

function moo(): void {
  if (!a) return;
  const ac = a.ac, t = ac.currentTime, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain();
  const f = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(155, t); o.frequency.linearRampToValueAtTime(175, t + 0.15);
  o.frequency.exponentialRampToValueAtTime(105, t + 0.8);
  lfo.frequency.value = 5; lg.gain.value = 4; lfo.connect(lg).connect(o.frequency);
  f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1100, t + 0.2);
  f.frequency.linearRampToValueAtTime(400, t + 0.8); f.Q.value = 6;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
  o.connect(f).connect(g).connect(a.sfx); o.start(t); lfo.start(t); o.stop(t + 0.9); lfo.stop(t + 0.9);
}

/** Plays a sound effect; n is a strength or a combo count where it matters. */
export function sfx(name: Sfx, n = 0): void {
  if (!a || !soundOn) return;
  switch (name) {
    case 'jump': tone(330, 0.16, 'sine', 0.35, 0, 2.2); break;
    case 'land': burst(0.12, 400, Math.min(0.5, n / 1500)); tone(80, 0.12, 'sine', Math.min(0.5, n / 1500)); break;
    case 'hit': burst(0.3, 1400, 0.6); tone(110, 0.3, 'triangle', 0.5, 0, 0.5); break;
    case 'moo': burst(0.3, 1400, 0.5); moo(); break;
    case 'potato': tone(660 * Math.pow(2, Math.min(n, 12) / 12), 0.09, 'square', 0.12); tone(990 * Math.pow(2, Math.min(n, 12) / 12), 0.12, 'sine', 0.12, 0.03); break;
    case 'power': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.12, i * 0.06)); break;
    case 'shield': tone(1200, 0.5, 'triangle', 0.3, 0, 0.9); tone(1810, 0.4, 'sine', 0.15); burst(0.08, 3000, 0.3, 'highpass'); break;
    case 'smash': burst(0.35, 900, 0.6); tone(220, 0.2, 'square', 0.15, 0, 2); break;
    case 'dead': burst(0.6, 600, 0.7); [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.3, 0.15 + i * 0.16)); break;
    case 'click': tone(880, 0.05, 'square', 0.1); break;
    case 'buy': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'square', 0.12, i * 0.07)); break;
    case 'denied': tone(180, 0.18, 'square', 0.15); tone(150, 0.2, 'square', 0.15, 0.1); break;
    case 'mission': [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'square', 0.13, i * 0.09)); tone(1047, 0.4, 'square', 0.13, 0.27); break;
    case 'clear': tone(1320, 0.06, 'sine', 0.08); break;
    case 'finish': // a fanfare as the wheel crosses the line
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i < 5 ? 0.14 : 0.6, 'square', 0.13, i * 0.11));
      tone(262, 0.9, 'triangle', 0.25, 0.55); tone(392, 0.9, 'triangle', 0.18, 0.55);
      break;
    case 'cheer': // the guests shout as their arms go up: a crowd of noise and a few voices
      burst(0.55, 1100, 0.32, 'bandpass'); burst(0.4, 2200, 0.16, 'bandpass', 0.05);
      for (let i = 0; i < 3; i++) tone(260 + Math.random() * 180, 0.22, 'sawtooth', 0.05, Math.random() * 0.08, 1.25);
      break;
  }
}

// ---------- The Ländler ----------
// 16 bars of 3 beats: the bass plays the first beat ("oom"), the chord the other two ("pah pah"),
// and an accordion plays the tune.
const CHORDS: Record<string, { bass: [number, number]; notes: number[] }> = {
  C: { bass: [36, 43], notes: [60, 64, 67] },
  G: { bass: [43, 38], notes: [59, 62, 65] },
  F: { bass: [41, 36], notes: [60, 65, 69] },
};
const BARS = 'C C G G G G C C C C F F C G C C'.split(' ');
const TUNE: (number | null)[][] = [
  [76, 79, 79], [76, 72, 76], [74, 77, 77], [74, 71, 74], [79, 77, 74], [71, 74, 77], [76, 74, 72], [72, null, null],
  [79, 81, 79], [76, 79, 76], [77, 81, 84], [81, 77, 72], [79, 76, 72], [74, 79, 77], [76, 72, 74], [72, null, null],
];
const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

let beat = 0, nextT = 0;

function accordion(n: number, t: number, dur: number): void {
  if (!a) return;
  const ac = a.ac, f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = 'lowpass'; f.frequency.value = 2200;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
  g.gain.setValueAtTime(0.16, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g).connect(a.music);
  for (const det of [-7, 7]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det;
    o.connect(f); o.start(t); o.stop(t + dur + 0.02);
  }
}

function playBeat(i: number, t: number, len: number): void {
  const bar = Math.floor(i / 3) % BARS.length, b = i % 3, ch = CHORDS[BARS[bar]];
  if (b === 0) tone(midi(ch.bass[bar % 2]), len * 0.6, 'triangle', 0.5, t - a!.ac.currentTime, 0, a!.music);
  else for (const n of ch.notes) tone(midi(n), len * 0.3, 'square', 0.05, t - a!.ac.currentTime, 0, a!.music);
  const m = TUNE[bar][b];
  if (m !== null) {
    let dur = len * 0.92, k = b + 1;
    while (k < 3 && TUNE[bar][k] === null) { dur += len; k++; }
    accordion(m, t, dur);
  }
  if (mood === 'play' && b !== 0) burst(0.04, 6000, 0.12, 'highpass', t - a!.ac.currentTime, a!.music);
}

/** Schedules the next notes of the music; called every frame. */
export function updateMusic(): void {
  if (!a || !musicOn || a.ac.state !== 'running') return;
  const len = 60 / (mood === 'play' ? 156 : 126), now = a.ac.currentTime;
  if (nextT < now) nextT = now + 0.05;
  while (nextT < now + 0.2) { playBeat(beat, nextT, len); nextT += len; beat++; }
}

/** Stops all sound while the game is hidden (another app, the phone locked), and resumes it. */
export function setHidden(hidden: boolean): void {
  if (!a) return;
  if (hidden) void a.ac.suspend(); else void a.ac.resume();
}
