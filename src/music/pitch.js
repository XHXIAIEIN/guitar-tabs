// Pitch basics for a standard-tuned guitar: open strings, pitch classes, note names and display signs.

/** MIDI pitch of each open string; index = string number (1 = high E, 6 = low E). */
export const TUNING = [null, 64, 59, 55, 50, 45, 40];

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const mod12 = (n) => ((n % 12) + 12) % 12;

/** Parses the note name at the start of `text` ("F#", "Bb", "E♭"). */
export function parseNote(text) {
  const m = /^([A-G])([#b♯♭]?)/.exec(text);
  if (!m) return null;
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0;
  return { pc: mod12(LETTERS[m[1]] + acc), length: m[0].length };
}

export const midiOf = (string, fret, capo = 0) => TUNING[string] + capo + fret;

/** Display form with ♯/♭ signs: "Bbm7" → "B♭m7". */
export const pretty = (name) => name.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭');
