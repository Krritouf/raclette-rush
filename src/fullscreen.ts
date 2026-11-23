// Full screen on the web. Android, iPad and computers have the Fullscreen API: one tap hides the
// browser's bars (and, on a phone, turns the game sideways). Safari on iPhone does not let a page go
// full screen; the way there is to add the game to the home screen, where it opens without Safari's
// bars (index.html's web-app tags and public/manifest.webmanifest). The Android app needs neither.

/** How this device gets the game full screen. */
export type FullscreenWay = 'api' | 'homescreen' | 'none';

/** What decides it. */
export interface FullscreenEnv {
  /** Inside the Android (or iOS) app. */
  native: boolean;
  /** Opened from the home screen as a web app: already without the browser's bars. */
  standalone: boolean;
  /** The Fullscreen API is there and allowed. */
  apiEnabled: boolean;
  /** An iPhone or iPod. */
  iphone: boolean;
}

/** The way to full screen for a device, or none when it is not needed or not possible. */
export function fullscreenWay(e: FullscreenEnv): FullscreenWay {
  if (e.native || e.standalone) return 'none';
  if (e.apiEnabled) return 'api';
  if (e.iphone) return 'homescreen';
  return 'none';
}

type FsDocument = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };

/** This browser's situation. */
export function browserEnv(native: boolean): FullscreenEnv {
  const doc = document as FsDocument, el = document.documentElement as FsElement;
  const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    native,
    standalone,
    apiEnabled: !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && !!(el.requestFullscreen || el.webkitRequestFullscreen),
    iphone: /iPhone|iPod/.test(navigator.userAgent),
  };
}

/** True while the page is full screen. */
export function isFullscreen(): boolean {
  const doc = document as FsDocument;
  return !!(doc.fullscreenElement || doc.webkitFullscreenElement);
}

/**
 * Goes full screen, then turns a phone sideways where the browser allows it. Call it straight from
 * a tap or a key press: browsers only allow it then.
 */
export function enterFullscreen(): void {
  const el = document.documentElement as FsElement;
  const done = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : (el.webkitRequestFullscreen?.(), Promise.resolve());
  void Promise.resolve(done)
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => { /* refused, or no lock on this device: the game plays either way */ });
}

/** Leaves full screen. */
export function exitFullscreen(): void {
  const doc = document as FsDocument;
  if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => { /* already out */ });
  else doc.webkitExitFullscreen?.();
}
