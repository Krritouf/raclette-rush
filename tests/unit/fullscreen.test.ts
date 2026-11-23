import { describe, expect, it } from 'vitest';
import { fullscreenWay, type FullscreenEnv } from '../../src/fullscreen';

const web: FullscreenEnv = { native: false, standalone: false, apiEnabled: true, iphone: false };

describe('the way to full screen', () => {
  it('uses the Fullscreen API where there is one (Android, iPad, a computer)', () => {
    expect(fullscreenWay(web)).toBe('api');
  });

  it('offers the home screen on an iPhone, where Safari has no full screen', () => {
    expect(fullscreenWay({ ...web, apiEnabled: false, iphone: true })).toBe('homescreen');
  });

  it('offers nothing in the Android app or a web app opened from the home screen', () => {
    expect(fullscreenWay({ ...web, native: true })).toBe('none');
    expect(fullscreenWay({ ...web, standalone: true })).toBe('none');
    expect(fullscreenWay({ ...web, apiEnabled: false, iphone: true, standalone: true })).toBe('none');
  });

  it('offers nothing on a browser with neither', () => {
    expect(fullscreenWay({ ...web, apiEnabled: false })).toBe('none');
  });
});
