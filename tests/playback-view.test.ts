import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackView } from '../src/ui/playback-view.ts';
import type { PlaybackState } from '../src/playback/index.ts';

class Sheet extends EventTarget {
  dataset: Record<string, string> = {};
  clientWidth = 320;
  offsetWidth = 320;
  scrollTop = 0;
  scrollTo() {}
  querySelector() { return null; }
  getBoundingClientRect() { return { left: 0, right: 320 }; }
}
function event(type: string, values: Record<string, unknown> = {}): Event {
  const value = new Event(type, { cancelable: true });
  for (const [key, item] of Object.entries(values)) Object.defineProperty(value, key, { value: item });
  return value;
}
function state(status: PlaybackState['status'], position = 0): PlaybackState {
  return { status, position, playing: status === 'playing', queuedVoices: 0, beatId: `beat-${position}` };
}
function view() {
  const sheet = new Sheet();
  const changes: boolean[] = [];
  const playback = new PlaybackView(sheet as unknown as HTMLElement, { onFollowingChange: value => changes.push(value) });
  playback.update(state('playing'));
  return { sheet, changes, playback };
}

test('a tap keeps following; a touch move detaches until an explicit return', () => {
  const { sheet, changes, playback } = view();
  sheet.dispatchEvent(event('pointerdown', { button: 0, pointerId: 1, clientX: 20, clientY: 40 }));
  sheet.dispatchEvent(event('pointerup'));
  assert.equal(playback.following, true);
  sheet.dispatchEvent(event('touchmove'));
  assert.equal(playback.following, false);
  playback.update(state('playing', 20));
  playback.update(state('playing', 1));
  assert.equal(playback.following, false);
  playback.update(state('paused', 20));
  assert.equal(playback.following, false);
  playback.reveal();
  assert.equal(playback.following, true);
  assert.deepEqual(changes, [false, true]);
  playback.dispose();
});

test('wheel and pointer dragging detach; hover and zero-distance wheel keep following', () => {
  const { sheet, playback } = view();
  sheet.dispatchEvent(event('wheel', { deltaX: 0, deltaY: 0 }));
  assert.equal(playback.following, true);
  sheet.dispatchEvent(event('wheel', { deltaX: 30, deltaY: 0 }));
  assert.equal(playback.following, false);
  playback.reveal();
  sheet.dispatchEvent(event('pointerdown', { button: 0, pointerId: 1, clientX: 20, clientY: 40 }));
  sheet.dispatchEvent(event('pointermove', { buttons: 1, pointerId: 1, clientX: 20, clientY: 60 }));
  assert.equal(playback.following, false);
  playback.reveal();
  sheet.dispatchEvent(event('pointermove', { buttons: 0, pointerId: 1, clientX: 20, clientY: 80 }));
  assert.equal(playback.following, true);
  playback.dispose();
});

test('reading navigation detaches but editor-consumed arrows keep following', async () => {
  const { sheet, playback } = view();
  const arrow = event('keydown', { key: 'ArrowRight' });
  sheet.dispatchEvent(arrow); arrow.preventDefault();
  await Promise.resolve();
  assert.equal(playback.following, true);
  sheet.dispatchEvent(event('keydown', { key: 'PageDown' }));
  await Promise.resolve();
  assert.equal(playback.following, false);
  playback.update(state('stopped'));
  assert.equal(playback.following, true);
  playback.dispose();
});

test('rerender can preserve manual following and disposed input cannot change the replacement view', async () => {
  const sheet = new Sheet();
  const changes: boolean[] = [];
  const playback = new PlaybackView(sheet as unknown as HTMLElement, { following: false, onFollowingChange: value => changes.push(value) });
  playback.update(state('paused', 20));
  assert.equal(playback.following, false);
  playback.update(state('ended', 20));
  assert.equal(playback.following, true);
  playback.update(state('playing'));
  sheet.dispatchEvent(event('keydown', { key: 'PageDown' }));
  playback.dispose();
  sheet.dispatchEvent(event('touchmove'));
  await Promise.resolve();
  assert.equal(playback.following, true);
  assert.deepEqual(changes, [true]);
});
