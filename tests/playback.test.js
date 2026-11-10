import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/setup.js';
import { parseSong } from '../src/music/format/parse-song.js';
import { songSource } from '../src/audio/song-source.js';

/** Plays `text` and lists [kind, tick from the start] with the metronome beat number or the event index. */
function play(text, o = {}) {
  const song = parseSong(text);
  const src = songSource(song, { from: 0, loop: null, countIn: 3, bpm: 80, live: { metronome: true, guitar: true }, shapeOf: () => null, capo: 0, ...o });
  const out = [];
  let start = 0;
  for (let plan, n = 0; (plan = src.next()) && n < 20; start += plan.ticks, n++) {
    for (const it of plan.items) {
      if (it.ui?.count) out.push(['count', start + it.tick, it.ui.count]);
      if (it.ui?.beat !== undefined) out.push(['beat', start + it.tick, it.ui.beat]);
      if (it.ui?.ev >= 0) out.push([`${it.ui.bar}.${it.ui.ev}`, start + it.tick]);
    }
  }
  return out;
}

const HAPPY = '\\ts 3 4 \\ac 1.2.8 1.2 | 3.2.4 1.2 1.1 | 0.1.2 1.2.8 1.2 | 3.2.4 1.2 3.1 | 1.1.2';

test('a pickup starts on its beat after the count-in, and beat 1 falls on the first downbeat', () => {
  const out = play(HAPPY);
  assert.deepEqual(out.filter(([k]) => k === 'count').map(([, t]) => t), [0, 48, 96]);
  const beats = out.filter(([k]) => k === 'beat');
  // two silent beats lead into the pickup on beat 3
  assert.deepEqual(beats.slice(0, 4), [['beat', 144, 0], ['beat', 192, 1], ['beat', 240, 2], ['beat', 288, 0]]);
  assert.deepEqual(out.find(([k]) => k === '0.0'), ['0.0', 240]);
  // 生 is the first note on beat 1
  assert.deepEqual(out.find(([k]) => k === '1.0'), ['1.0', 288]);
});

test('metronome accents follow the time signature after a pickup', () => {
  const out = play(HAPPY);
  const beats = out.filter(([k]) => k === 'beat');
  for (const [, t, k] of beats) assert.equal(k, ((t - 144) / 48) % 3, `beat at ${t}`);
  // the second phrase starts on beat 3 of the second measure
  assert.deepEqual(out.find(([k]) => k === '2.1'), ['2.1', 240 + 288]);
  assert.deepEqual(beats.at(-1), ['beat', 768, 1]);
});

test('a bar in 2/4 clicks two beats and the next 4/4 bar starts on beat 1', () => {
  const out = play('0.1.1 | \\ts 2 4 0.1.2 | \\ts 4 4 0.1.1', { countIn: 0 });
  const beats = out.filter(([k]) => k === 'beat').map(([, t, k]) => [t, k]);
  assert.deepEqual(beats.slice(4), [[192, 0], [240, 1], [288, 0], [336, 1], [384, 2], [432, 3]]);
  assert.deepEqual(out.find(([k]) => k === '2.0'), ['2.0', 288]);
});

test('a tied note is not plucked again', () => {
  const song = parseSong('0.1.2 -.1 | -.1.1');
  const src = songSource(song, { from: 0, loop: null, countIn: 0, bpm: 80, live: { metronome: false, guitar: true }, shapeOf: () => null, capo: 0 });
  const notes = [src.next(), src.next()].flatMap((plan) => plan.items.filter((it) => it.ui?.ev >= 0));
  assert.equal(notes.length, 3);
  // Node has no AudioContext, so only a pluck throws
  assert.throws(() => notes[0].sound(0), /AudioContext/);
  for (const it of notes.slice(1)) it.sound(0);
});

test('starting or looping on the pickup waits for its beat each time', () => {
  const out = play(HAPPY, { from: 0, countIn: 0, loop: [0, 0] });
  assert.deepEqual(out.slice(0, 3), [['beat', 0, 0], ['beat', 48, 1], ['beat', 96, 2]]);
  const starts = out.filter(([k]) => k === '0.0').map(([, t]) => t);
  assert.deepEqual(starts.slice(0, 3), [96, 240, 384]);
});
