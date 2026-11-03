// Chord shapes with fingerings, plus movable barre templates for chords outside the table.
import { parseChord, mod12, TUNING } from './theory.js';

// Strings are listed from 6 (low E) to 1. Frets: x = muted. Fingers: 1 index … 4 little, T thumb, 0 open/none.
// A third element marks a barre at that fret; it covers the strings that finger 1 holds at that fret.
const TABLE = {
  C: [['x32010', 'x32010']],
  D: [['xx0232', 'xx0132']],
  E: [['022100', '023100']],
  F: [['133211', '134211', 1], ['xx3211', 'xx3211', 1]],
  G: [['320003', '210003'], ['320033', '210034']],
  A: [['x02220', 'x01230']],
  B: [['x24442', 'x13331', 2]],
  Bb: [['x13331', 'x13331', 1]],
  Am: [['x02210', 'x02310']],
  Bm: [['x24432', 'x13421', 2]],
  Cm: [['x35543', 'x13421', 3]],
  'C#m': [['x46654', 'x13421', 4]],
  Dm: [['xx0231', 'xx0231']],
  Em: [['022000', '023000']],
  Fm: [['133111', '134111', 1]],
  'F#m': [['244222', '134111', 2]],
  Gm: [['355333', '134111', 3]],
  'G#m': [['466444', '134111', 4]],
  A7: [['x02020', 'x02030']],
  B7: [['x21202', 'x21304']],
  C7: [['x32310', 'x32410']],
  D7: [['xx0212', 'xx0213']],
  E7: [['020100', '020100']],
  G7: [['320001', '320001']],
  Am7: [['x02010', 'x02010']],
  Bm7: [['x24232', 'x13141', 2]],
  Dm7: [['xx0211', 'xx0211', 1]],
  Em7: [['020000', '020000'], ['022030', '023040']],
  'F#m7': [['242222', '131111', 2]],
  Cmaj7: [['x32000', 'x32000']],
  Dmaj7: [['xx0222', 'xx0123']],
  Fmaj7: [['xx3210', 'xx3210']],
  Gmaj7: [['320002', '320001']],
  Amaj7: [['x02120', 'x02130']],
  Dsus2: [['xx0230', 'xx0130']],
  Dsus4: [['xx0233', 'xx0134']],
  Asus2: [['x02200', 'x01200']],
  Asus4: [['x02230', 'x01230']],
  Esus4: [['022200', '023400']],
  Cadd9: [['x32033', 'x21034']],
  'G/B': [['x20003', 'x10003']],
  'D/F#': [['2x0232', 'Tx0132']],
};

// Movable shapes as offsets from the barre fret: [root on string 6 (E shape), root on string 5 (A shape)].
const TEMPLATES = {
  '': [['022100', '134211'], ['x02220', 'x12341']],
  m: [['022000', '134111'], ['x02210', 'x13421']],
  7: [['020100', '131211'], ['x02020', 'x13141']],
  m7: [['020000', '131111'], ['x02010', 'x13121']],
  maj7: [null, ['x02120', 'x13241']],
  sus4: [['022200', '123411'], ['x02230', 'x12341']],
  sus2: [null, ['x02200', 'x13411']],
};

/** Intervals in semitones above the root, per chord quality. */
export const QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  9: [0, 4, 7, 10, 14], dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8], m7b5: [0, 3, 6, 10], 5: [0, 7],
};
const INTERVAL_NAMES = { 0: '1', 2: '2', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7', 14: '9' };

export const CHORD_GROUPS = [
  { name: '入门开放和弦', chords: ['C', 'D', 'E', 'G', 'A', 'Am', 'Dm', 'Em'] },
  { name: '七和弦', chords: ['A7', 'B7', 'C7', 'D7', 'E7', 'G7', 'Am7', 'Dm7', 'Em7', 'Cmaj7', 'Fmaj7', 'Gmaj7', 'Dmaj7', 'Amaj7'] },
  { name: '挂留与加音', chords: ['Dsus2', 'Dsus4', 'Asus2', 'Asus4', 'Esus4', 'Cadd9'] },
  { name: '横按和弦', chords: ['F', 'Bm', 'B', 'Bb', 'Cm', 'C#m', 'Fm', 'F#m', 'Gm', 'G#m', 'Bm7', 'F#m7'] },
  { name: '低音转位', chords: ['G/B', 'D/F#'] },
];

function makeShape(frets, fingers, barreFret) {
  const f = [...frets].map((c) => (c === 'x' ? -1 : Number(c)));
  const g = [...fingers].map((c) => (c === 'T' ? 'T' : c === 'x' ? 0 : Number(c)));
  return finish(f, g, barreFret);
}

function finish(frets, fingers, barreFret) {
  let barre = null;
  if (barreFret) {
    const held = frets.map((fr, i) => (fr === barreFret && fingers[i] === 1 ? i : -1)).filter((i) => i >= 0);
    barre = { fret: barreFret, from: 6 - held[0], to: 6 - held[held.length - 1] };
  }
  const fretted = frets.filter((fr) => fr > 0);
  const max = Math.max(0, ...fretted);
  const base = max > 4 ? Math.min(...fretted) : 1;
  return { frets, fingers, barre, base };
}

function fromTemplate([frets, fingers], rootFret) {
  const f = [...frets].map((c) => (c === 'x' ? -1 : Number(c) + rootFret));
  const g = [...fingers].map((c) => (c === 'x' ? 0 : Number(c)));
  return finish(f, g, rootFret);
}

const chordKey = (c) => `${c.root}|${c.quality}|${c.bass ?? ''}`;
const INDEX = new Map();
for (const [name, shapes] of Object.entries(TABLE)) {
  INDEX.set(chordKey(parseChord(name)), shapes.map(([fr, fi, b]) => makeShape(fr, fi, b)));
}

function templateShapes(c) {
  const t = TEMPLATES[c.quality];
  if (!t) return [];
  const options = [];
  if (t[0]) options.push(fromTemplate(t[0], mod12(c.root - 4) || 12));
  if (t[1]) options.push(fromTemplate(t[1], mod12(c.root - 9) || 12));
  return options.sort((a, b) => a.barre.fret - b.barre.fret);
}

/** All known shapes for a chord name, easiest first; empty when the quality is unknown. */
export function chordShapes(name) {
  const c = parseChord(name);
  if (!c) return [];
  const table = INDEX.get(chordKey(c)) ?? [];
  if (c.bass !== null && !table.length) {
    // Slash chord missing from the table: fall back to the plain chord; the bass note stays in the name.
    return chordShapes(name.split('/')[0]);
  }
  if (c.bass !== null) return table;
  const extra = templateShapes(c).filter((t) => !table.some((s) => s.frets.join() === t.frets.join()));
  return [...table, ...extra];
}

/** A chord counts as easy when its first shape needs no barre and stays within the first three frets. */
export function isEasyChord(name) {
  const s = chordShapes(name)[0];
  return !!s && !s.barre && Math.max(...s.frets) <= 3;
}

/** Note names and interval labels of a chord, e.g. C → [['C','1'],['E','3'],['G','5']]. */
export function chordTones(name, spell) {
  const c = parseChord(name);
  const iv = c && QUALITIES[c.quality];
  if (!iv) return [];
  return iv.map((i) => [spell(c.root + i), INTERVAL_NAMES[i]]);
}

/** MIDI pitches a shape sounds, low string first; muted strings are skipped. */
export function shapePitches(shape, capo = 0) {
  return shape.frets.flatMap((fr, i) => (fr < 0 ? [] : [TUNING[6 - i] + capo + fr]));
}
