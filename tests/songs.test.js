import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/setup.js';
import { parseKey } from '../src/music/key.js';
import { numberOf, numberTonic } from '../src/music/numbers.js';
import { chordShapes } from '../src/music/chord-shapes.js';
import { parseSong } from '../src/music/format/parse-song.js';
import { BUILTIN, allEntries, getEntry, setVersion } from '../src/state/songs.js';
import { shownRest } from '../src/render/score/glyphs.js';
import { midiOf } from '../src/music/pitch.js';

// Expected 简谱 of each built-in melody, written down independently of the tab positions.
const MELODIES = {
  twinkle: '1 1 5 5 6 6 5 4 4 3 3 2 2 1',
  'two-tigers': '1 2 3 1 1 2 3 1 3 4 5 3 4 5 5 6 5 4 3 1 5 6 5 4 3 1 1 5, 1',
  'ode-to-joy': "3 3 4 5 5 4 3 2 1 1 2 3 3 2 2",
  'happy-birthday': "5 5 6 5 1' 7 5 5 6 5 2' 1' 5 5 5' 3' 1' 7 6 4' 4' 3' 1' 2' 1'",
  farewell: "5 3 5 1' 6 1' 5 5 1 2 3 2 1 2 5 3 5 1' 7 6 1' 5 5 2 3 4 7, 1",
  'mary-lamb': '3 2 1 2 3 3 3 2 2 2 3 5 5 3 2 1 2 3 3 3 3 2 2 3 2 1',
  'little-bee': '5 3 3 4 2 2 1 2 3 4 5 5 5 5 3 3 4 2 2 1 3 5 5 3',
  'little-bird': '5 6 5 4 3 4 5 2 3 4 3 4 5 5 6 5 4 3 4 5 2 5 3 1',
  'new-year': '1 1 1 5, 3 3 3 1 1 3 5 5 4 3 2 2 3 4 4 3 2 3 1 1 3 2 5, 7, 2 1',
  'jingle-bells': '3 3 3 3 3 3 3 5 1 2 3 4 4 4 4 4 3 3 3 3 3 2 2 3 2 5',
  painter: '5 3 5 3 5 3 1 2 4 3 2 5 5 3 5 3 5 3 1 2 4 3 2 1',
  'row-your-boat': "1 1 1 2 3 3 2 3 4 5 1' 1' 1' 5 5 5 3 3 3 1 1 1 5 4 3 2 1",
  saints: '1 3 4 5 1 3 4 5 1 3 4 5 3 1 3 2 3 3 2 1 1 3 5 5 4 4 3 4 5 3 1 2 1',
  'amazing-grace': '5, 1 3 1 3 2 1 6, 5, 5, 1 3 1 3 2 5 5 3 5 3 1 3 2 1 6, 5, 5, 1 3 1 3 2 1',
  'find-friends': "5 6 5 6 5 6 5 5 1' 7 6 5 5 3 5 5 3 3 5 5 3 2 4 3 2 1 1 1",
  'jasmine-flower': "3 3 5 6 1' 1' 6 5 5 6 5 3 3 5 6 1' 1' 6 5 5 6 5 5 5 5 3 5 6 6 5 3 2 3 5 3 2 1 1 2 1 3 2 1 3 2 3 5 6 1' 5 2 3 5 2 3 1 6, 5, 6, 6, 1 2 3 1 2 1 6, 5,",
  'little-donkey': "1 1 1 3 5 5 5 5 6 6 6 1' 5 4 4 4 6 3 3 3 3 2 2 2 2 5",
  'santa-lucia': "5 5 1' 1' 7 7 4 4 6 6 5 5 3 6 5 5 ♯4 4 4 3 2 6 5 3' 2' 1' 7 6 2' 2' 1' 6 ♯4 5 1'",
  'red-river-valley': '5, 1 3 3 3 2 3 2 1 1 5, 1 3 1 3 5 4 3 2 5 4 3 3 3 2 1 2 3 5 4 2 1 7, 2 2 3 2 1',
  'castle-in-the-sky': "6 7 1' 7 1' 3' 7 3 3 6 5 6 1' 5 3 4 3 4 1' 3 1' 7 ♯4 4 7 7 6 7",
  rainbow: '3 5 1 4 6 1 5 5 1 4 6 1 6 3 5 1 4 6 1 2 1 7',
  'chrysanthemum-terrace': '3 3 2 3 3 5 3 2 3 1 1 2 3 5 3 2 2 1 2 3 5 3 6 5',
  'really-love-you': '5 1 2 3 3 2 1 2 2 3 2 1 7 1 7 6 1 2',
  encounter:
    "5 3 5 2 3 2 1 1 7, 6, 7, 1 7, 1 2 3 5 3 5 2' 1' 7 1' 1 7, 6, 7, 1 7, 1 2 1 5 6 7 1' 7 1' 7 6 5 6 5 1 2 3 " +
    "4 3 4 5 1 2 3 3 5 6 7 1' 7 1' 2' 1' 2' 3' 5 1 2 3 4 3 4 3 2 1 7, 1",
  'dandelion-promise': "3, 5, 1 3 3 5 2 2 5 7, 1 3 4 5 1 1 2 3 3, 5, 1 3 3 4 2 2 5 7, 1 3 4 5 1 1 2 1 3,",
  // two piano arrangements: the simple one opens with the intro, the original one starts at the verse
  'sunny-day': {
    simple: '6 1 5 1 4 5 6 5 1 1 5 5 1 1 5 7 5 6 1 5 1 4 5 6 5 1 1 5 5 1 1 5 7 5 5 5 1 1 2 3 5 5 1 1 2 3 2 1 5 5 5 1 1 2 3 3 3',
    original:
      '5 5 1 1 2 3 5 5 1 1 2 3 2 1 5 5 5 1 1 2 3 3 3 3 4 3 2 4 3 1 5 1 1 3 4 3 2 1 2 3 3 3 3 2 3 2 1 ' +
      '5 1 1 3 4 3 2 1 2 3 3 3 3 2 3 2 1 7 1 1 1 7 1 1 1 1 1 7 1 1 1 1 1 7 1 1 1 1 1 5 5 5 5 5 5 5 5 5 5 5 5 5 4 4 3 2 1 7 1',
  },
};

const versionsOf = (entry) => entry.versions ?? [{ id: '', text: entry.text }];

// Versions of one song sit in different octaves and keys, so the check compares scale degrees.
const degreesOnly = (digits) => digits.replace(/[',]/g, '');

function melodyDigits(song) {
  const tonic = numberTonic(song.melody, parseKey(song.meta.key));
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
      const written = MELODIES[entry.id];
      const melody = typeof written === 'object' ? written[version] : written;
      if (melody) assert.ok(degreesOnly(melodyDigits(s)).startsWith(degreesOnly(melody)), `${id}: ${melodyDigits(s)}`);
    }
  }
});

test('versions of one entry share a title and open as the simple version', () => {
  for (const entry of BUILTIN.filter((e) => e.versions)) {
    assert.equal(entry.versions[0].id, 'simple', entry.id);
    const titles = entry.versions.map((v) => parseSong(v.text).meta.title);
    assert.equal(new Set(titles).size, 1, `${entry.id} titles`);
    assert.equal(entry.versions[0].level, '入门', `${entry.id} level`);
  }
});

test('simple songs keep the melody and stay on the top strings', () => {
  for (const entry of BUILTIN.filter((e) => e.versions && e.group === 'practice')) {
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

test('game and anime music plays one string at a time on strings 1 to 3', () => {
  const scores = BUILTIN.filter((e) => e.group === 'game' || e.group === 'anime').flatMap((e) =>
    e.versions ? e.versions.map((v) => ({ ...e, id: `${e.id}/${v.id}`, text: v.text })) : [e],
  );
  for (const entry of scores) {
    const song = parseSong(entry.text);
    if (entry.group === 'game') assert.ok(song.chordsUsed.length, `${entry.id} chords`);
    for (const e of song.bars.flatMap((b) => b.events)) {
      assert.ok(e.notes.length <= 1, `${entry.id} plays ${e.notes.length} notes at once`);
      for (const n of e.notes) {
        assert.ok(n.f <= 6, `${entry.id} plays fret ${n.f}`);
        // A note below open G cannot sit on strings 1 to 3.
        assert.ok(n.s <= 3 || midiOf(n.s, n.f) < midiOf(3, 0), `${entry.id} plays string ${n.s} fret ${n.f}`);
      }
    }
  }
});

test('only a rest that fills a metric bar is drawn as a whole rest without a dot', () => {
  const shown = (text, bar, i) => {
    const s = parseSong(`\\ts 3 4 ${text}`);
    return shownRest(s.bars[bar].events[i], s.bars[bar], s.meter);
  };
  const whole = shown('r.2{d}', 0, 0);
  assert.deepEqual([whole.base, whole.dotted], ['w', false]);
  // three beats of rest that start on beat 2 cross a bar line
  assert.equal(shown('0.1.4 r.2{d}', 0, 1).base, 'h');
  assert.equal(shown('0.1.2 r.4', 0, 1).base, 'q');
  assert.equal(shown('0.1.2{d}', 0, 0).base, 'h');
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

