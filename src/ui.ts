// The menus' building blocks, drawn on the canvas: text and buttons, in the look of
// src/render/art.ts (raised buttons with a dark outline, Lilita One and Fredoka). Each frame,
// every screen adds its buttons again; a tap or a click (which comes between two frames) tests the
// buttons of the frame on screen. The arrow keys move a focus ring from button to button and
// Enter or Space presses the one in focus, so every menu also works with a keyboard.

import { tr } from './i18n';
import { DISPLAY, INK, TEXT, dark, light, roundRect } from './render/art';

type Ctx = CanvasRenderingContext2D;

/** The text colour on light backgrounds. */
export const NAVY = '#2a3b52';

/** A button of this frame. */
export interface Button {
  /** Stays the same from frame to frame, so the focus stays on it. */
  id: string;
  x: number; y: number; w: number; h: number;
  label: string;
  action: () => void;
  /** ghost: a round (or rounded) cream button for an icon. */
  style?: 'primary' | 'secondary' | 'ghost' | 'red';
  /** Drawn left of the label (or alone when there is no label). */
  icon?: (ctx: Ctx, cx: number, cy: number, size: number) => void;
  disabled?: boolean;
  /** Smaller text under the label. */
  sub?: string;
  /** The label is drawn as given, not translated. */
  raw?: boolean;
}

/** Text options. */
export interface TextOpts {
  weight?: number; color?: string; align?: CanvasTextAlign; baseline?: CanvasTextBaseline;
  /** In the display font (titles, big numbers). */
  display?: boolean;
  /** Shrinks the font until the text fits. */
  maxW?: number;
  outline?: string; outlineW?: number;
  /** The text is drawn as given, not translated. */
  raw?: boolean;
}

/** The canvas font for a size. */
export function font(size: number, display = false, weight = 600): string {
  return display ? `${size}px ${DISPLAY}` : `${weight >= 700 ? 700 : 600} ${size}px ${TEXT}`;
}

/** Draws a text (translated) and returns its width. */
export function text(ctx: Ctx, s: string, x: number, y: number, size: number, o: TextOpts = {}): number {
  const str = o.raw ? s : tr(s);
  let sz = size;
  ctx.font = font(sz, o.display, o.weight);
  if (o.maxW) while (sz > 8 && ctx.measureText(str).width > o.maxW) { sz -= 1; ctx.font = font(sz, o.display, o.weight); }
  ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = o.baseline ?? 'middle';
  if (o.outline) { ctx.lineJoin = 'round'; ctx.lineWidth = o.outlineW ?? sz * 0.18; ctx.strokeStyle = o.outline; ctx.strokeText(str, x, y); }
  ctx.fillStyle = o.color ?? NAVY; ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

const FILL = { primary: '#ffd257', secondary: '#fff6e2', ghost: '#fff6e2', red: '#e8432f' };
const LABEL = { primary: '#5a3510', secondary: NAVY, ghost: NAVY, red: '#ffffff' };

/** The buttons of the screen. */
export class Ui {
  private cur: Button[] = [];
  /** The id of the button in focus. */
  focusId: string | null = null;
  /** True once a key has been used: the focus ring shows. */
  keyboard = false;
  /** The screen's UI scale (1 on a 420 px tall phone). */
  u = 1;

  /** Starts a frame's buttons. */
  begin(): void { this.cur = []; }

  /** The buttons on screen. */
  get buttons(): readonly Button[] { return this.cur; }

  /** Draws a button and keeps it for this frame's taps. */
  button(ctx: Ctx, b: Button): void {
    this.cur.push(b);
    const u = this.u, style = b.style ?? 'secondary';
    const round = style === 'ghost' && Math.abs(b.w - b.h) < 2;
    const r = round ? b.h / 2 : Math.min(b.h * 0.32, 18 * u), depth = Math.max(3, b.h * 0.1);
    const col = FILL[style], lw = Math.max(1.8, 2.4 * u);
    ctx.save();
    if (b.disabled) ctx.globalAlpha = 0.55;
    // the raised edge, then the face, its gradient and its gloss
    roundRect(ctx, b.x, b.y + depth, b.w, b.h, r); ctx.fillStyle = style === 'ghost' ? '#c9b48f' : dark(col, 0.3); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke();
    roundRect(ctx, b.x, b.y, b.w, b.h, r);
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, light(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, dark(col, 0.06));
    ctx.fillStyle = g; ctx.fill(); ctx.stroke();
    ctx.save(); roundRect(ctx, b.x, b.y, b.w, b.h, r); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, b.y + b.h * 0.08, b.w * 0.48, b.h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (this.keyboard && this.focusId === b.id) {
      roundRect(ctx, b.x - 5 * u, b.y - 5 * u, b.w + 10 * u, b.h + depth + 10 * u, r + 5 * u);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5 * u; ctx.stroke();
    }
    const ink = LABEL[style];
    const cy = b.y + b.h / 2 - (b.sub ? b.h * 0.13 : 0);
    const size = Math.min(b.h * (b.sub ? 0.38 : 0.44), 26 * u);
    if (b.icon && !b.label.trim()) b.icon(ctx, b.x + b.w / 2, b.y + b.h / 2, b.h * 0.3);
    else if (b.label.trim()) {
      const label = b.raw ? b.label : tr(b.label);
      const iconW = b.icon ? size * 1.5 : 0;
      ctx.font = font(size, true);
      const tw = Math.min(ctx.measureText(label).width, b.w - iconW - 18 * u);
      const x0 = b.x + b.w / 2 - (tw + iconW) / 2;
      if (b.icon) b.icon(ctx, x0 + size * 0.6, cy, size * 0.62);
      if (style === 'primary' || style === 'red') text(ctx, label, x0 + iconW + tw / 2, cy + 2, size, { display: true, color: 'rgba(0,0,0,0.18)', maxW: b.w - iconW - 18 * u, raw: true });
      text(ctx, label, x0 + iconW + tw / 2, cy, size, { display: true, color: ink, maxW: b.w - iconW - 18 * u, raw: true });
    }
    if (b.sub) text(ctx, b.sub, b.x + b.w / 2, b.y + b.h * 0.76, size * 0.62, { color: ink, maxW: b.w - 12 * u });
    ctx.restore();
  }

  /** The button under (x, y), from the frame on screen. */
  at(x: number, y: number): Button | null {
    for (let i = this.cur.length - 1; i >= 0; i--) {
      const b = this.cur[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h + 4 * this.u) return b;
    }
    return null;
  }

  /** Moves the focus to the previous (-1) or next (+1) button. */
  move(dir: number): void {
    const list = this.cur.filter(b => !b.disabled);
    if (!list.length) return;
    this.keyboard = true;
    const i = list.findIndex(b => b.id === this.focusId);
    this.focusId = list[i < 0 ? 0 : (i + dir + list.length) % list.length].id;
  }

  /** The button in focus, or the first one. */
  focused(): Button | null {
    const list = this.cur.filter(b => !b.disabled);
    return list.find(b => b.id === this.focusId) ?? list[0] ?? null;
  }
}
