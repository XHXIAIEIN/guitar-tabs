import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord, parseKey, transposeChord, transposeKey, jianpu, jianpuTonic, mod12, midiOf, pretty } from '../src/music/theory.js';
import { chordShapes, shapePitches, QUALITIES, CHORD_GROUPS, isEasyChord } from '../src/music/chords.js';
import { parseSong, syllables, chordAt } from '../src/music/format.js';
import { BUILTIN } from '../src/data/songs.js';
import { getEntry, allEntries, setVersion } from '../src/store.js';

test('chord names', () => {
  assert.deepEqual(parseChord('D/F#'), { root: 2, quality: '', bass: 6 });
  assert.deepEqual(parseChord('Bbm7'), { root: 10, quality: 'm7', bass: null });
  assert.equal(parseChord('H7'), null);
  assert.equal(transposeChord('C', 3, parseKey('Eb')), 'Eb');
  assert.equal(transposeChord('D/F#', 2, parseKey('E')), 'E/G#');
  assert.equal(transposeChord('Am7', -2, parseKey('Bb')), 'Gm7');
  assert.equal(transposeKey(parseKey('C'), 3).name, 'Eb');
  assert.equal(pretty('Bbm7'), 'B♭m7');
});

test('every chord in the library has a shape whose notes are chord tones over the right bass', () => {
  const names = CHORD_GROUPS.flatMap((g) => g.chords);
  for (const name of names) {
    const shapes = chordShapes(name);
    assert.ok(shapes.length, `${name} has no shape`);
    const c = parseChord(name);
    const tones = QUALITIES[c.quality].map((i) => mod12(c.root + i));
    for (const shape of shapes) {
      const pitches = shapePitches(shape);
      for (const p of pitches) assert.ok(tones.includes(mod12(p)), `${name} ${shape.frets} plays non-chord tone ${p}`);
      assert.equal(mod12(pitches[0]), c.bass ?? c.root, `${name} ${shape.frets} has the wrong bass`);
      assert.ok(pitches.some((p) => mod12(p) === mod12(c.root + QUALITIES[c.quality][1])), `${name} misses its third/sus`);
      shape.frets.forEach((fr, i) => {
        if (fr > 0) assert.ok(shape.fingers[i], `${name} string ${6 - i} has no finger`);
      });
    }
  }
});

test('barre templates cover chords outside the table', () => {
  const [s] = chordShapes('Ebm');
  assert.equal(s.barre.fret, 6);
  assert.deepEqual(shapePitches(s).map(mod12).sort(), [3, 3, 6, 10, 10].sort());
  assert.ok(isEasyChord('C') && !isEasyChord('F') && !isEasyChord('Bm'));
});

test('jianpu degrees and octave choice', () => {
  const C = parseKey('C');
  assert.deepEqual(jianpu(55, 48), { deg: 5, acc: '', oct: 0 });
  assert.deepEqual(jianpu(47, 48), { deg: 7, acc: '', oct: -1 });
  assert.deepEqual(jianpu(61, 48), { deg: 1, acc: '♯', oct: 1 });
  assert.equal(jianpuTonic([48, 52, 55, 57, 60], C), 48);
  assert.equal(jianpuTonic([64, 65, 67, 60, 62], C), 60);
  // A minor uses the relative major: 简谱 "6" is the tonic A
  assert.equal(jianpu(57, jianpuTonic([57, 60, 64], parseKey('Am'))).deg, 6);
  // a positive shift writes the notes an octave higher
  assert.equal(jianpu(55, jianpuTonic([55, 57, 59], C, 1)).oct, 1);
});

test('syllables', () => {
  assert.deepEqual(syllables('长亭_外'), ['长', '亭', '', '外']);
  assert.deepEqual(syllables('晚风，拂柳'), ['晚', '风，', '拂', '柳']);
  assert.deepEqual(syllables('A- maz-ing grace'), ['A-', 'maz-', 'ing', 'grace']);
});

test('parser reports wrong bar lengths with the line number', () => {
  const s = parseSong('time: 4/4\ntab: | q 1/0 1/0 1/0 1/0 | q 1/0 1/0 1/0 |');
  assert.equal(s.errors.length, 1);
  assert.equal(s.errors[0].line, 2);
  assert.match(s.errors[0].message, /第 2 小节.*3 拍/);
});

test('parser handles pickups, sticky durations, chord slots and chord carry-over', () => {
  const s = parseSong(`time: 3/4
chord: | | C | . . G |
tab: | e 1/0 1/0 | q 1/0 2/1 1/3 | h 1/0 q 1/1 |`);
  assert.deepEqual(s.errors, []);
  assert.equal(s.bars[0].pickup, true);
  assert.equal(s.bars[0].ticks, 48);
  assert.equal(chordAt(s.bars[2], 0), 'C');
  assert.equal(chordAt(s.bars[2], 96), 'G');
  assert.deepEqual(s.bars[1].events.map((e) => e.dur), [48, 48, 48]);
});

// Expected 简谱 of each built-in melody, written down independently of the tab positions.
const MELODIES = {
  twinkle: '1 1 5 5 6 6 5 4 4 3 3 2 2 1',
  'two-tigers': '1 2 3 1 1 2 3 1 3 4 5 3 4 5 5 6 5 4 3 1 5 6 5 4 3 1 1 5, 1',
  'ode-to-joy': "3 3 4 5 5 4 3 2 1 1 2 3 3 2 2",
  'happy-birthday': "5 5 6 5 1' 7 5 5 6 5 2' 1' 5 5 5' 3' 1' 7 6 4' 4' 3' 1' 2' 1'",
  farewell: "5 3 5 1' 6 1' 5 5 1 2 3 2 1 2 5 3 5 1' 7 6 1' 5 5 2 3 4 7, 1",
  'mary-lamb': '3 2 1 2 3 3 3 2 2 2 3 5 5 3 2 1 2 3 3 3 3 2 2 3 2 1',
};

const versionsOf = (entry) => entry.versions ?? [{ id: '', text: entry.text }];

// Versions of one song sit in different octaves and keys, so the check compares scale degrees.
const degreesOnly = (digits) => digits.replace(/[',]/g, '');

function melodyDigits(song) {
  const tonic = jianpuTonic(song.melody, parseKey(song.meta.key), song.meta.jianpu);
  return song.melody
    .map((m) => {
      const j = jianpu(m, tonic);
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

test('simple versions stay on the top strings and come first', () => {
  for (const entry of BUILTIN.filter((e) => e.versions)) {
    assert.equal(entry.versions[0].id, 'simple', entry.id);
    const titles = entry.versions.map((v) => parseSong(v.text).meta.title);
    assert.equal(new Set(titles).size, 1, `${entry.id} titles`);
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

test('midi of fretted notes', () => {
  assert.equal(midiOf(5, 3), 48);
  assert.equal(midiOf(1, 0, 3), 67);
});
