// The menus' building blocks, drawn on the canvas: text and buttons. Each frame, every screen adds
// its buttons again; a tap or a click (which comes between two frames) tests the buttons of the
// frame on screen. The arrow keys
// move a focus ring from button to button and Enter or Space presses the one in focus, so every
// menu also works with a keyboard.

import { tr } from './i18n';
import { COL, roundRect } from './render/draw';

type Ctx = CanvasRenderingContext2D;

/** The font of every text. */
export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** A button of this frame. */
export interface Button {
  /** Stays the same from frame to frame, so the focus stays on it. */
  id: string;
  x: number; y: number; w: number; h: number;
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'ghost' | 'red';
  /** Drawn left of the label (or alone when there is no label). */
  icon?: (ctx: Ctx, cx: number, cy: number, size: number) => void;
  disabled?: boolean;
  /** Smaller text under the label. */
  sub?: string;
}

/** Text options. */
export interface TextOpts {
  weight?: number; color?: string; align?: CanvasTextAlign; baseline?: CanvasTextBaseline;
  /** Shrinks the font until the text fits. */
  maxW?: number;
  outline?: string; outlineW?: number;
  /** The text is drawn as given, not translated. */
  raw?: boolean;
}

/** Draws a text (translated) and returns its width. */
export function text(ctx: Ctx, s: string, x: number, y: number, size: number, o: TextOpts = {}): number {
  const str = o.raw ? s : tr(s);
  let sz = size;
  ctx.font = `${o.weight ?? 700} ${sz}px ${FONT}`;
  if (o.maxW) while (sz > 8 && ctx.measureText(str).width > o.maxW) { sz -= 1; ctx.font = `${o.weight ?? 700} ${sz}px ${FONT}`; }
  ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = o.baseline ?? 'middle';
  if (o.outline) { ctx.lineJoin = 'round'; ctx.lineWidth = o.outlineW ?? sz * 0.18; ctx.strokeStyle = o.outline; ctx.strokeText(str, x, y); }
  ctx.fillStyle = o.color ?? COL.navy; ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

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
    const u = this.u, r = Math.min(b.h / 2, 14 * u);
    const style = b.style ?? 'secondary';
    const fill = style === 'primary' ? COL.paste : style === 'red' ? COL.red : style === 'ghost' ? 'rgba(255,255,255,0.75)' : COL.cream;
    const ink = style === 'primary' ? '#5a3510' : style === 'red' ? '#fff' : COL.navy;
    ctx.save();
    if (b.disabled) ctx.globalAlpha = 0.55;
    if (style !== 'ghost') { roundRect(ctx, b.x, b.y + 4 * u, b.w, b.h, r); ctx.fillStyle = style === 'primary' ? COL.rind : 'rgba(22,50,74,0.35)'; ctx.fill(); }
    roundRect(ctx, b.x, b.y, b.w, b.h, r); ctx.fillStyle = fill; ctx.fill();
    if (this.keyboard && this.focusId === b.id) {
      roundRect(ctx, b.x - 4 * u, b.y - 4 * u, b.w + 8 * u, b.h + 12 * u, r + 4 * u);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * u; ctx.stroke();
    }
    const cy = b.y + b.h / 2 - (b.sub ? b.h * 0.12 : 0);
    const size = Math.min(b.h * 0.42, 24 * u);
    if (b.icon && !b.label) b.icon(ctx, b.x + b.w / 2, b.y + b.h / 2, b.h * 0.32);
    else {
      const iconW = b.icon ? size * 1.5 : 0;
      ctx.font = `800 ${size}px ${FONT}`;
      const tw = Math.min(ctx.measureText(tr(b.label)).width, b.w - iconW - 16 * u);
      const x0 = b.x + b.w / 2 - (tw + iconW) / 2;
      if (b.icon) b.icon(ctx, x0 + size * 0.6, cy, size * 0.7);
      text(ctx, b.label, x0 + iconW + tw / 2, cy, size, { weight: 800, color: ink, maxW: b.w - iconW - 16 * u });
    }
    if (b.sub) text(ctx, b.sub, b.x + b.w / 2, b.y + b.h * 0.76, size * 0.6, { weight: 600, color: ink, maxW: b.w - 12 * u });
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
