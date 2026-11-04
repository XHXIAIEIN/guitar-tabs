// Keys: parsing, transposition and the note spelling that goes with a key.
import { mod12, parseNote, pretty } from './pitch.js';

const SPELL = {
  sharp: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  flat: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  // C major / A minor: the spellings chord charts use for borrowed chords (Bb, Eb, F#)
  plain: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
};
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

export function keyFromPc(pc, minor) {
  pc = mod12(pc);
  return { pc, minor, name: (minor ? MINOR_KEYS : MAJOR_KEYS)[pc] };
}

/** "Eb" → { pc: 3, minor: false, name: 'Eb' }; "F#m" → minor key. */
export function parseKey(text) {
  const m = /^([A-G][#b♯♭]?)(m?)$/.exec(text.trim());
  if (!m) return null;
  return keyFromPc(parseNote(m[1]).pc, m[2] === 'm');
}

export const transposeKey = (key, semis) => keyFromPc(key.pc + semis, key.minor);

/** Pitch class of 简谱 "1": the tonic itself, or the relative major for minor keys (6 is the minor tonic). */
export const doPc = (key) => (key.minor ? mod12(key.pc + 3) : key.pc);

/** The twelve note names a key spells with. */
export function spelling(key) {
  const major = doPc(key);
  if (major === 0) return SPELL.plain;
  return [5, 10, 3, 8, 1].includes(major) ? SPELL.flat : SPELL.sharp;
}

export const noteName = (pc, key) => spelling(key)[mod12(pc)];

export const prettyKey = (key) => pretty(key.name);
