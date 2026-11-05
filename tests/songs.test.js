import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/setup.js';
import { parseKey } from '../src/music/key.js';
import { numberOf, numberTonic } from '../src/music/numbers.js';
import { chordShapes } from '../src/music/chord-shapes.js';
import { parseSong } from '../src/music/format/parse-song.js';
import { BUILTIN, allEntries, getEntry, setVersion } from '../src/state/songs.js';
import { shownRest } from '../src/render/score/glyphs.js';

// Expected 简谱 of each built-in melody, written down independently of the tab positions.
const MELODIES = {
  twinkle: '1 1 5 5 6 6 5 4 4 3 3 2 2 1',
  'two-tigers': '1 2 3 1 1 2 3 1 3 4 5 3 4 5 5 6 5 4 3 1 5 6 5 4 3 1 1 5, 1',
  'ode-to-joy': "3 3 4 5 5 4 3 2 1 1 2 3 3 2 2",
  'happy-birthday': "5 5 6 5 1' 7 5 5 6 5 2' 1' 5 5 5' 3' 1' 7 6 4' 4' 3' 1' 2' 1'",
  farewell: "5 3 5 1' 6 1' 5 5 1 2 3 2 1 2 5 3 5 1' 7 6 1' 5 5 2 3 4 7, 1",
  'mary-lamb': '3 2 1 2 3 3 3 2 2 2 3 5 5 3 2 1 2 3 3 3 3 2 2 3 2 1',
  'mario-bros': '1 5 1 5 1 5 1 3 5 4 2 4 2 4 2 7 2 5',
};

const versionsOf = (entry) => entry.versions ?? [{ id: '', text: entry.text }];

// Versions of one song sit in different octaves and keys, so the check compares scale degrees.
const degreesOnly = (digits) => digits.replace(/[',]/g, '');

function melodyDigits(song) {
  const tonic = numberTonic(song.melody, parseKey(song.meta.key), song.meta.octave);
  return song.melody
    .map((m) => {
      const j = numberOf(m, tonic);
      return j.acc + j.deg + (j.oct > 0 ? "'".repeat(j.oct) : ','.repeat(-j.oct));
    })
    .join(' ');
}

test('built-in songs parse cleanly and their melodies match the written 简谱', () => {
  for (const entry of BUILTIN) {
    for (const { id: version, text } of versionsOf(entry)) {
      const id = `${entry.id} ${version}`;
      const s = parseSong(text);
      assert.deepEqual(s.errors, [], `${id} errors`);
      assert.deepEqual(s.warnings, [], `${id} warnings`);
      for (const name of s.chordsUsed) assert.ok(chordShapes(name).length, `${id} uses ${name} without a shape`);
      const melody = MELODIES[entry.id];
      if (melody) assert.ok(degreesOnly(melodyDigits(s)).startsWith(degreesOnly(melody)), `${id}: ${melodyDigits(s)}`);
    }
  }
});

test('versions of one entry share a title and open as the simple version', () => {
  for (const entry of BUILTIN.filter((e) => e.versions)) {
    assert.equal(entry.versions[0].id, 'simple', entry.id);
    const titles = entry.versions.map((v) => parseSong(v.text).meta.title);
    assert.equal(new Set(titles).size, 1, `${entry.id} titles`);
    assert.equal(parseSong(entry.versions[0].text).meta.level, '入门', `${entry.id} level`);
  }
});

test('simple exercises use only Em and Am and are no faster than the full version', () => {
  for (const entry of BUILTIN.filter((e) => e.group === 'exercise')) {
    const [simple, full] = entry.versions.map((v) => parseSong(v.text));
    for (const name of simple.chordsUsed) assert.ok(['Em', 'Am'].includes(name), `${entry.id} uses ${name}`);
    assert.ok(simple.meta.bpm <= full.meta.bpm, `${entry.id} bpm`);
  }
});

test('simple songs keep the melody and stay on the top strings', () => {
  for (const entry of BUILTIN.filter((e) => e.versions && e.group === 'song')) {
    const song = parseSong(entry.versions[0].text);
    const steps = (s) => s.melody.slice(1).map((p, i) => p - s.melody[i]);
    assert.deepEqual(steps(song), steps(parseSong(entry.versions[1].text)), `${entry.id} melody differs between versions`);
    assert.deepEqual(song.chordsUsed, [], `${entry.id} chords`);
    const notes = song.bars.flatMap((b) => b.events).flatMap((e) => e.notes);
    for (const n of notes) {
      assert.ok(n.s <= 2 || (n.s === 3 && n.f === 0), `${entry.id} plays string ${n.s} fret ${n.f}`);
      assert.ok(n.f <= 8, `${entry.id} plays fret ${n.f}`);
    }
  }
});

test('game music is a single melody on the top strings', () => {
  for (const entry of BUILTIN.filter((e) => e.group === 'game')) {
    const song = parseSong(entry.text);
    assert.deepEqual(song.chordsUsed, [], `${entry.id} chords`);
    const events = song.bars.flatMap((b) => b.events);
    for (const e of events) assert.ok(e.notes.length <= 1, `${entry.id} plays ${e.notes.length} notes at once`);
    for (const n of events.flatMap((e) => e.notes)) {
      assert.ok(n.s <= 2 || (n.s === 3 && n.f === 0), `${entry.id} plays string ${n.s} fret ${n.f}`);
      assert.ok(n.f <= 12, `${entry.id} plays fret ${n.f}`);
    }
  }
});

test('only a rest that fills its bar is drawn as a whole rest without a dot', () => {
  const rests = (text) => parseSong(`time: 3/4\n\ntab: | ${text} |`).bars[0].events;
  const [whole] = rests('h. r').map((e) => shownRest(e, 144));
  assert.deepEqual([whole.base, whole.dotted], ['w', false]);
  const short = rests('h 1/0 q r')[1];
  assert.equal(shownRest(short, 144), short);
  const note = rests('h. 1/0')[0];
  assert.equal(shownRest(note, 144), note);
});

test('a song opens as its simple version until another version is chosen', () => {
  const simple = getEntry('twinkle');
  assert.equal(simple.version.id, 'simple');
  assert.deepEqual(parseSong(simple.text).chordsUsed, []);
  setVersion('twinkle', 'full');
  const full = getEntry('twinkle');
  assert.equal(full.version.id, 'full');
  assert.ok(parseSong(full.text).chordsUsed.length);
  assert.notEqual(full.prefsId, simple.prefsId);
  assert.equal(allEntries().find((e) => e.id === 'twinkle').version.id, 'full');
  setVersion('twinkle', 'simple');
});

