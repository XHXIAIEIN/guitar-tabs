import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/setup.js';
import { parseSong } from '../src/music/format/parse-song.js';
import { midiOf } from '../src/music/pitch.js';
import { arrange, arrangements, readText } from '../scripts/arrange.mjs';

const pitches = (text) => parseSong(text).bars.flatMap((b) => b.events).map((e) => e.notes.map((n) => midiOf(n.s, n.f)).sort((a, b) => a - b));

test('pitch names follow the key signature unless they carry an accidental', () => {
  assert.deepEqual(pitches(arrange('\\ks G F4 Fn4 Bb3 C#4 E##4')), [[66], [65], [58], [61], [66]]);
  assert.deepEqual(pitches(arrange('\\ks Eb E4 A4 B4 En4')), [[63], [68], [70], [64]]);
});

test('transposing moves every note and the key signature', () => {
  const text = arrange('\\transpose -4\n\\ks C#minor G3 (E4 C3)');
  assert.match(text, /\\ks Aminor/);
  assert.doesNotMatch(text, /transpose/);
  assert.deepEqual(pitches(text), [[52], [45, 60]]);
});

test('chord notes sit on separate strings, higher notes on higher strings', () => {
  const song = parseSong(arrange('(G4 D4 G3 B2 G2)'));
  const notes = song.bars[0].events[0].notes.sort((a, b) => midiOf(b.s, b.f) - midiOf(a.s, a.f));
  assert.deepEqual(notes.map((n) => n.s), [1, 2, 3, 5, 6]);
});

test('a forced string and text in quotes or comments stay as written', () => {
  const text = arrange('\\title "A4 B4" // C4\n\\section "E5" E4@2');
  assert.equal(text, '\\title "A4 B4" // C4\n\\section "E5" 5.2');
});

test('a note out of reach names its line', () => {
  assert.throws(() => arrange('\\ks C\nC4\nC2'), /line 3/);
});

test('every arranged score matches its source', () => {
  for (const [source, score, text] of arrangements()) {
    assert.equal(readText(score), text, `${score} is out of date with ${source}: run npm run arrange`);
  }
});
