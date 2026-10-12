import test, { type TestContext } from 'node:test';
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

function readingView(t: TestContext) {
  const css = globalThis.CSS, media = globalThis.matchMedia;
  globalThis.CSS = { escape: (value: string) => value } as typeof CSS;
  globalThis.matchMedia = (() => ({ matches: false })) as typeof matchMedia;
  t.after(() => { globalThis.CSS = css; globalThis.matchMedia = media; });
  const sheet = new Sheet();
  const moves: number[] = [];
  const classes = () => {
    const values = new Set<string>();
    return { add: (v: string) => values.add(v), remove: (v: string) => values.delete(v),
      contains: (v: string) => values.has(v), toggle: (v: string, on: boolean) => on ? values.add(v) : values.delete(v) };
  };
  const rows = Array.from({ length: 4 }, (_, index) => ({
    classList: classes(), nextElementSibling: null as unknown,
    getBoundingClientRect: () => ({ left: 0, right: 320, top: 12 + index * 140 - sheet.scrollTop, bottom: 152 + index * 140 - sheet.scrollTop }),
    scrollTo: () => {}
  }));
  rows.forEach((row, index) => row.nextElementSibling = rows[index + 1]);
  const bars = rows.map(row => ({ classList: classes(), closest: () => row,
    querySelectorAll: () => [], querySelector: () => null, getBoundingClientRect: row.getBoundingClientRect }));
  Object.assign(sheet, {
    clientHeight: 450,
    querySelector: (selector: string) => bars[Number(selector.match(/bar-(\d)/)?.[1])],
    getBoundingClientRect: () => ({ left: 0, right: 320, top: 0, bottom: 450 }),
    scrollTo: ({ top }: { top: number }) => { moves.push(top); sheet.scrollTop = top; }
  });
  const playback = new PlaybackView(sheet as unknown as HTMLElement);
  const play = (row: number, position: number) => playback.update({ ...state('playing', position), barId: `bar-${row}` });
  t.after(() => playback.dispose());
  return { sheet, moves, rows, playback, play };
}

test('visible row changes stay still and scrolling leaves the next row readable', t => {
  const { sheet, moves, rows, play } = readingView(t);
  play(0, 0); play(1, 4);
  assert.deepEqual(moves, []);
  assert.equal(rows[0].classList.contains('current-row'), false);
  assert.equal(rows[1].classList.contains('current-row'), true);
  play(2, 8);
  assert.equal(moves.length, 1);
  assert.ok(rows[2].getBoundingClientRect().top >= 12);
  assert.ok(rows[3].getBoundingClientRect().bottom <= 438);
  const top = sheet.scrollTop;
  play(2, 9); play(3, 12);
  assert.equal(sheet.scrollTop, top);
  assert.equal(moves.length, 1);
});

test('manual browsing persists across row changes until an explicit reveal', t => {
  const { sheet, moves, rows, playback, play } = readingView(t);
  play(0, 0);
  sheet.dispatchEvent(event('wheel', { deltaY: 100, deltaX: 0 }));
  moves.length = 0;
  play(3, 12);
  assert.equal(moves.length, 0);
  playback.reveal();
  assert.equal(playback.following, true);
  assert.equal(moves.length, 1);
  assert.ok(rows[3].getBoundingClientRect().top >= 12);
  playback.update(state('stopped'));
  assert.equal(rows[3].classList.contains('current-row'), false);
});

test('looping back reveals the opening row', t => {
  const { sheet, playback, play } = readingView(t);
  play(3, 12);
  assert.ok(sheet.scrollTop > 0);
  play(0, 0);
  assert.equal(sheet.scrollTop, 0);
  assert.equal(playback.following, true);
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
