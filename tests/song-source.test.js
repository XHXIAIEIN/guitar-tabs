import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/setup.js';
import { parseSong } from '../src/music/format/parse-song.js';
import { songSource } from '../src/audio/song-source.js';

const song = parseSong('\\ts 3 4 0.1 0.1 0.1 | 0.1 0.1 0.1');
const source = (countIn) => songSource(song, { from: 1, loop: null, countIn, bpm: 80, live: { metronome: true, guitar: true }, shapeOf: () => null, capo: 0 });
const counts = (bar) => bar.items.map((item) => [item.tick, item.ui.count]);

test('a count-in shorter than a bar counts the last beats of a bar', () => {
  const s = source(2);
  const count = s.next();
  assert.equal(count.ticks, 2 * song.meter.beatTicks);
  assert.deepEqual(counts(count), [[0, 2], [song.meter.beatTicks, 3]]);
  assert.equal(s.next().items.find((item) => item.ui?.bar !== undefined).ui.bar, 1);
});

test('a count-in longer than a bar starts with the partial bar', () => {
  const s = source(4);
  assert.deepEqual(counts(s.next()), [[0, 3]]);
  assert.deepEqual(counts(s.next()).map(([, n]) => n), [1, 2, 3]);
  assert.equal(s.next().items.find((item) => item.ui?.bar !== undefined).ui.bar, 1);
});

test('no count-in starts at the first bar', () => {
  assert.equal(source(0).next().items.find((item) => item.ui?.bar !== undefined).ui.bar, 1);
});
