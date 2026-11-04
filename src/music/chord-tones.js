// Chord qualities as intervals, and the tones of a named chord.
import { parseChord } from './chord-name.js';

/** Intervals in semitones above the root, per chord quality. */
export const QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  9: [0, 4, 7, 10, 14], dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8], m7b5: [0, 3, 6, 10], 5: [0, 7],
};
const INTERVAL_NAMES = { 0: '1', 2: '2', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7', 14: '9' };

/** Note names and interval labels of a chord, e.g. C → [['C','1'],['E','3'],['G','5']]. */
export function chordTones(name, spell) {
  const c = parseChord(name);
  const iv = c && QUALITIES[c.quality];
  if (!iv) return [];
  return iv.map((i) => [spell(c.root + i), INTERVAL_NAMES[i]]);
}
