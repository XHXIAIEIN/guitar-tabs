// Helpers shared by the alphaTex and ChordPro parsers.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { parseKey } from '../key.js';
import { parseChord } from '../chord-name.js';

/** Shortens a quoted piece of the user's text for a message. */
export const clip = (s) => (s.length > 24 ? s.slice(0, 24) + '…' : s);

/** A new empty bar; parsers fill in its length, chords and events. */
export const newBar = (index, line) => ({ index, section: -1, line, ticks: 0, phase: 0, lineStart: false, chords: [], events: [], lyric: '', startChord: null });

/** Chord name with ♯/♭ written as #/b, or null when it is not a chord. */
export function chordName(name) {
  const norm = name.replace(/♯/g, '#').replace(/♭/g, 'b');
  return parseChord(norm) ? norm : null;
}

/** Stores a key, capo, bpm or time signature value in `meta`, or reports why it is wrong. `name` is the field as written. */
export function setMeta(meta, field, value, name, report) {
  if (field === 'key') {
    const k = parseKey(value);
    if (k) meta.key = k.name;
    else report(t('parser.badKey', { value }));
  } else if (field === 'time') {
    const time = parseTime(value);
    if (time) meta.time = time;
    else report(t('parser.badTime', { value }));
  } else {
    const num = Number(value);
    const [lo, hi] = config.format.limits[field];
    if (value !== '' && Number.isInteger(num) && num >= lo && num <= hi) meta[field] = num;
    else report(t('parser.outOfRange', { field: name, lo, hi }));
  }
}

/** Splits note text into strings and finger marks: "{T} 弹 {1}" → [{ finger: 'T' }, ' 弹 ', { finger: '1' }]. */
export function noteParts(text) {
  return text.split(/\{([T1-4])\}/).map((part, i) => (i % 2 ? { finger: part } : part)).filter((part) => part !== '');
}

export function parseTime(v) {
  const m = /^(\d{1,2})\/(2|4|8)$/.exec(v);
  return m && +m[1] > 0 ? [+m[1], +m[2]] : null;
}

/**
 * Splits alphaTex lyrics into one chunk per note, with the Guitar Pro rules alphaTab uses: a space or line break ends
 * a syllable, a space that follows a break or another space is an empty syllable (a held note), "-" ends a syllable
 * and stays with it, "+" joins syllables on one note, trailing "_" is dropped, and "[...]" is a comment.
 */
export function lyricChunks(text) {
  const out = [];
  const add = (s) => out.push(s.split('+').join(' ').replace(/_+$/, ''));
  let state = 'start';
  let start = 0;
  let afterDash = false;
  for (let p = 0; p < text.length; p++) {
    const c = text[p];
    if (state === 'gap') {
      if (c === '\n' || c === '\r' || c === '\t' || (c === ' ' && afterDash)) continue;
      afterDash = false;
      state = 'start';
    }
    if (state === 'comment') {
      if (c === ']') state = 'start';
    } else if (state === 'start') {
      if (c === '[') state = 'comment';
      else {
        start = p;
        state = 'word';
        p--;
      }
    } else if (state === 'word') {
      if (c === '-') state = 'dash';
      else if (c === ' ' || c === '\n' || c === '\r') {
        add(text.slice(start, p));
        state = 'gap';
      }
    } else if (c !== '-') {
      // state 'dash': the syllable ends after its run of dashes
      add(text.slice(start, p));
      afterDash = true;
      state = 'gap';
      p--;
    }
  }
  if (state === 'word' && start < text.length) add(text.slice(start));
  return out;
}
