// 简谱 digits of MIDI pitches.
import { mod12 } from './pitch.js';
import { doPc } from './key.js';

const DEGREES = [[1, ''], [1, '♯'], [2, ''], [3, '♭'], [3, ''], [4, ''], [4, '♯'], [5, ''], [5, '♯'], [6, ''], [7, '♭'], [7, '']];

/** 简谱 digit of a MIDI pitch: degree, accidental and octave (dots: + above, − below). */
export function numberOf(midi, tonicMidi) {
  const rel = midi - tonicMidi;
  const [deg, acc] = DEGREES[mod12(rel)];
  return { deg, acc, oct: Math.floor(rel / 12) };
}

/**
 * Picks the MIDI pitch written as an undotted "1": the octave that leaves the fewest melody
 * notes dotted. Ties keep the lower tonic.
 */
export function numberTonic(pitches, key) {
  const pc = doPc(key);
  let best = 48 + mod12(pc);
  let bestOut = Infinity;
  for (let t = 36 + mod12(pc); t <= 84; t += 12) {
    const out = pitches.filter((p) => p < t || p >= t + 12).length;
    if (out < bestOut) [best, bestOut] = [t, out];
  }
  return best;
}
