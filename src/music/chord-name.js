// Chord names: parsing and transposition.
import { mod12, parseNote } from './pitch.js';
import { spelling } from './key.js';

/** "D/F#" → { root: 2, quality: '', bass: 6 }; null when the root is not a note name. */
export function parseChord(name) {
  const m = /^([A-G][#b♯♭]?)([^/]*)(?:\/([A-G][#b♯♭]?))?$/.exec(name);
  if (!m) return null;
  return { root: parseNote(m[1]).pc, quality: m[2], bass: m[3] ? parseNote(m[3]).pc : null };
}

/** Moves a chord name by `semis`, spelled for the target `key`. */
export function transposeChord(name, semis, key) {
  if (!semis) return name;
  const c = parseChord(name);
  if (!c) return name;
  const sp = spelling(key);
  return sp[mod12(c.root + semis)] + c.quality + (c.bass === null ? '' : '/' + sp[mod12(c.bass + semis)]);
}
