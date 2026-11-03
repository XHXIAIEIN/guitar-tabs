// Pitch spelling, chord names, keys and 简谱 degrees for a standard-tuned guitar.

/** MIDI pitch of each open string; index = string number (1 = high E, 6 = low E). */
export const TUNING = [null, 64, 59, 55, 50, 45, 40];

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SPELL = {
  sharp: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  flat: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  // C major / A minor: the spellings chord charts use for borrowed chords (Bb, Eb, F#)
  plain: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
};
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

export const mod12 = (n) => ((n % 12) + 12) % 12;

/** Parses the note name at the start of `text` ("F#", "Bb", "E♭"). */
export function parseNote(text) {
  const m = /^([A-G])([#b♯♭]?)/.exec(text);
  if (!m) return null;
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0;
  return { pc: mod12(LETTERS[m[1]] + acc), length: m[0].length };
}

/** "D/F#" → { root: 2, quality: '', bass: 6 }; null when the root is not a note name. */
export function parseChord(name) {
  const m = /^([A-G][#b♯♭]?)([^/]*)(?:\/([A-G][#b♯♭]?))?$/.exec(name);
  if (!m) return null;
  return { root: parseNote(m[1]).pc, quality: m[2], bass: m[3] ? parseNote(m[3]).pc : null };
}

/** "Eb" → { pc: 3, minor: false, name: 'Eb' }; "F#m" → minor key. */
export function parseKey(text) {
  const m = /^([A-G][#b♯♭]?)(m?)$/.exec(text.trim());
  if (!m) return null;
  return keyFromPc(parseNote(m[1]).pc, m[2] === 'm');
}

export function keyFromPc(pc, minor) {
  pc = mod12(pc);
  return { pc, minor, name: (minor ? MINOR_KEYS : MAJOR_KEYS)[pc] };
}

export const transposeKey = (key, semis) => keyFromPc(key.pc + semis, key.minor);

/** Pitch class of 简谱 "1": the tonic itself, or the relative major for minor keys (6 is the minor tonic). */
export const doPc = (key) => (key.minor ? mod12(key.pc + 3) : key.pc);

function spelling(key) {
  const major = doPc(key);
  if (major === 0) return SPELL.plain;
  return [5, 10, 3, 8, 1].includes(major) ? SPELL.flat : SPELL.sharp;
}

export const noteName = (pc, key) => spelling(key)[mod12(pc)];

/** Moves a chord name by `semis`, spelled for the target `key`. */
export function transposeChord(name, semis, key) {
  if (!semis) return name;
  const c = parseChord(name);
  if (!c) return name;
  const sp = spelling(key);
  return sp[mod12(c.root + semis)] + c.quality + (c.bass === null ? '' : '/' + sp[mod12(c.bass + semis)]);
}

/** Display form with ♯/♭ signs: "Bbm7" → "B♭m7". */
export const pretty = (name) => name.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭');

export const prettyKey = (key) => pretty(key.name);

const DEGREES = [[1, ''], [1, '♯'], [2, ''], [3, '♭'], [3, ''], [4, ''], [4, '♯'], [5, ''], [5, '♯'], [6, ''], [7, '♭'], [7, '']];

/** 简谱 digit of a MIDI pitch: degree, accidental and octave (dots: + above, − below). */
export function jianpu(midi, tonicMidi) {
  const rel = midi - tonicMidi;
  const [deg, acc] = DEGREES[mod12(rel)];
  return { deg, acc, oct: Math.floor(rel / 12) };
}

/**
 * Picks the MIDI pitch written as an undotted "1": the octave that leaves the fewest melody
 * notes dotted. Ties keep the lower tonic. `shift` writes every note that many octaves higher.
 */
export function jianpuTonic(pitches, key, shift = 0) {
  const pc = doPc(key);
  let best = 48 + mod12(pc);
  let bestOut = Infinity;
  for (let t = 36 + mod12(pc); t <= 84; t += 12) {
    const out = pitches.filter((p) => p < t || p >= t + 12).length;
    if (out < bestOut) [best, bestOut] = [t, out];
  }
  return best - 12 * shift;
}

export const midiOf = (string, fret, capo = 0) => TUNING[string] + capo + fret;
