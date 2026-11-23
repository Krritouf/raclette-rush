// The Android app's extras, through Capacitor: vibration with Haptics, the back button, leaving
// the app. In a browser none of this exists: NATIVE is false and each call does nothing, so the
// web game is unchanged.

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';

/** True inside the Android (or iOS) app, false in a browser. */
export const NATIVE = Capacitor.isNativePlatform();

/** A vibration of ms milliseconds in the app; false in a browser (the caller uses navigator.vibrate). */
export function nativeVibrate(ms: number): boolean {
  if (!NATIVE) return false;
  Haptics.vibrate({ duration: ms }).catch(() => { /* no vibrator */ });
  return true;
}

/** Calls fn when the phone's back button (or gesture) is used, in the app only. */
export function onBack(fn: () => void): void {
  if (NATIVE) void App.addListener('backButton', fn);
}

/** Leaves the app (the back button on the title screen). */
export function exitApp(): void {
  if (NATIVE) void App.exitApp();
}
