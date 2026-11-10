import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/setup.js';
import { config } from '../src/core/config.js';
import { pretty, midiOf, mod12 } from '../src/music/pitch.js';
import { parseKey, transposeKey } from '../src/music/key.js';
import { parseChord, transposeChord } from '../src/music/chord-name.js';
import { numberOf, numberTonic } from '../src/music/numbers.js';
import { chordShapes, isEasyChord, shapePitches } from '../src/music/chord-shapes.js';
import { QUALITIES } from '../src/music/chord-tones.js';

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
  const names = config.chords.groups.flatMap((g) => g.chords);
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

test('number degrees and octave choice', () => {
  const C = parseKey('C');
  assert.deepEqual(numberOf(55, 48), { deg: 5, acc: '', oct: 0 });
  assert.deepEqual(numberOf(47, 48), { deg: 7, acc: '', oct: -1 });
  assert.deepEqual(numberOf(61, 48), { deg: 1, acc: '♯', oct: 1 });
  assert.equal(numberTonic([48, 52, 55, 57, 60], C), 48);
  assert.equal(numberTonic([64, 65, 67, 60, 62], C), 60);
  // A minor uses the relative major: 简谱 "6" is the tonic A
  assert.equal(numberOf(57, numberTonic([57, 60, 64], parseKey('Am'))).deg, 6);
});

test('midi of fretted notes', () => {
  assert.equal(midiOf(5, 3), 48);
  assert.equal(midiOf(1, 0, 3), 67);
});
