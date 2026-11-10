// Arranges music written by pitch for guitar, so a piano score can be copied note by note. A source file
// arrangements/<group>/<id>.txt is alphaTex whose notes are pitch names such as `D4`, `F#3` or `(G2 D4)` instead of
// `fret.string`. `npm run arrange` picks a string and fret for each note and writes scores/<group>/<id>.atex; the rest
// of the source passes through unchanged.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { TUNING, mod12 } from '../src/music/pitch.js';
import { keyFromPc, parseKey } from '../src/music/key.js';

const ROOT = new URL('../', import.meta.url);
// git may check text files out with CRLF line ends
export const readText = (path) => readFileSync(new URL(path, ROOT), 'utf8').replaceAll('\r\n', '\n');

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACCIDENTALS = { '': null, n: 0, '#': 1, '##': 2, b: -1, bb: -2 };
// major-key tonic pitch class → number of sharps (negative: flats)
const FIFTHS = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5 };
// letter, accidental, octave, optional forced string after `@`
const PITCH = /([A-G])(##|#|bb|b|n)?(\d)(?:@([1-6]))?(?![\w#])/y;
const MAX_FRET = 12;
// widest stretch between fretted notes of one chord
const MAX_SPAN = 4;

/** Accidental of each letter under the key signature of `key`. */
function signature(key) {
  const count = FIFTHS[key.minor ? mod12(key.pc + 3) : key.pc];
  const sig = {};
  for (let i = 0; i < Math.abs(count); i++) sig[(count > 0 ? 'FCGDAEB' : 'BEADGCF')[i]] = Math.sign(count);
  return sig;
}

/** alphaTex `\ks` value ("G", "Aminor", "Eb") → key; the reverse of `ksValue`. */
const keyOfKs = (value) => parseKey(value.replace(/minor$/i, 'm').replace(/major$/i, ''));
const ksValue = (key) => (key.minor ? `${key.name.slice(0, -1)}minor` : key.name);

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/** Note events in reading order: a single note, or the notes of one `( )` group. Strings and comments are skipped. */
function scanEvents(text) {
  const events = [];
  let group = null;
  for (let i = 0; i < text.length; ) {
    const c = text[i];
    if (c === '"') {
      const end = text.indexOf('"', i + 1);
      if (end < 0) throw new Error(`line ${lineAt(text, i)}: unclosed string`);
      i = end + 1;
    } else if (text.startsWith('//', i)) {
      const end = text.indexOf('\n', i);
      i = end < 0 ? text.length : end;
    } else if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i);
      if (end < 0) throw new Error(`line ${lineAt(text, i)}: unclosed comment`);
      i = end + 2;
    } else if (c === '(') {
      group = [];
      i++;
    } else if (c === ')') {
      if (group?.length) events.push(group);
      group = null;
      i++;
    } else {
      PITCH.lastIndex = i;
      const m = /[\w\\]/.test(text[i - 1] ?? '') ? null : PITCH.exec(text);
      if (!m) {
        i++;
        continue;
      }
      const note = { start: i, end: i + m[0].length, letter: m[1], acc: m[2] ?? '', octave: +m[3], string: m[4] ? +m[4] : null };
      if (group) group.push(note);
      else events.push([note]);
      i = note.end;
    }
  }
  return events;
}

/** Every way to play an event: one { s, f } per note, higher notes on higher strings, within one hand stretch. */
function options(notes, line) {
  const sorted = [...notes].sort((a, b) => b.midi - a.midi);
  const out = [];
  const place = (k, used) => {
    if (k === sorted.length) {
      const fretted = used.map((p) => p.f).filter((f) => f > 0);
      if (!fretted.length || Math.max(...fretted) - Math.min(...fretted) <= MAX_SPAN) out.push(used);
      return;
    }
    const n = sorted[k];
    for (let s = (used[k - 1]?.s ?? 0) + 1; s <= 6; s++) {
      const f = n.midi - TUNING[s];
      if (f >= 0 && f <= MAX_FRET && (n.string === null || n.string === s)) place(k + 1, [...used, { note: n, s, f }]);
    }
  };
  place(0, []);
  if (!out.length) throw new Error(`line ${line}: no way to play ${notes.map((n) => n.text).join(' ')} on guitar`);
  return out;
}

// Costs that steer the choice: low frets, melody on the top three strings, bass on the bottom three, few shifts.
function playCost(option) {
  let cost = 0;
  for (const { f } of option) cost += f === 0 ? 0 : f <= 4 ? 0.1 * f : 0.4 + 0.3 * (f - 4);
  const top = option[0];
  if (top.s > 3 && top.note.midi >= TUNING[3]) cost += 1.5;
  if (option.length > 1 && option[option.length - 1].s < 4) cost += 1;
  return cost;
}

const fretRange = (option) => {
  const fretted = option.map((p) => p.f).filter((f) => f > 0);
  return fretted.length ? [Math.min(...fretted), Math.max(...fretted)] : null;
};

function shiftCost(a, b) {
  const ra = fretRange(a);
  const rb = fretRange(b);
  if (!ra || !rb) return 0;
  if (Math.max(ra[1], rb[1]) - Math.min(ra[0], rb[0]) < MAX_SPAN) return 0;
  return 0.7 * Math.abs(rb[0] - ra[0]);
}

/** The cheapest playing of all events together (Viterbi over the options of each event). */
function fingerings(eventOptions) {
  let costs = eventOptions[0].map(playCost);
  const back = [];
  for (let e = 1; e < eventOptions.length; e++) {
    const prev = eventOptions[e - 1];
    const step = eventOptions[e].map((option) => {
      let best = 0;
      let bestCost = Infinity;
      prev.forEach((p, j) => {
        const c = costs[j] + shiftCost(p, option);
        if (c < bestCost) [best, bestCost] = [j, c];
      });
      return { best, cost: bestCost + playCost(option) };
    });
    back.push(step.map((x) => x.best));
    costs = step.map((x) => x.cost);
  }
  let k = costs.indexOf(Math.min(...costs));
  const chosen = [eventOptions[eventOptions.length - 1][k]];
  for (let e = back.length - 1; e >= 0; e--) {
    k = back[e][k];
    chosen.unshift(eventOptions[e][k]);
  }
  return chosen;
}

/**
 * Turns pitch-written source into alphaTex. Pitch names follow the `\ks` key signature unless they carry `#`, `b`, `##`,
 * `bb` or `n` (natural); an accidental holds for its own note only. `\transpose N` moves every note N semitones and
 * changes the key with it. `D4@2` forces string 2.
 */
export function arrange(source) {
  let text = source;
  let semis = 0;
  text = text.replace(/^\\transpose\s+(-?\d+)[ \t]*\r?\n/m, (_, n) => {
    semis = +n;
    return '';
  });
  const ks = /\\ks\s+(\S+)/.exec(text);
  const key = ks ? keyOfKs(ks[1]) : parseKey('C');
  if (!key) throw new Error(`unknown key ${ks[1]}`);
  if (ks && semis) text = text.replace(ks[0], `\\ks ${ksValue(keyFromPc(key.pc + semis, key.minor))}`);
  const sig = signature(key);

  const events = scanEvents(text);
  if (!events.length) return text;
  for (const notes of events) {
    for (const n of notes) {
      const acc = ACCIDENTALS[n.acc] ?? sig[n.letter] ?? 0;
      n.midi = 12 * (n.octave + 1) + LETTERS[n.letter] + acc + semis;
      n.text = text.slice(n.start, n.end);
    }
  }
  const chosen = fingerings(events.map((notes) => options(notes, lineAt(text, notes[0].start))));
  const places = chosen.flat().sort((a, b) => b.note.start - a.note.start);
  for (const { note, s, f } of places) text = text.slice(0, note.start) + `${f}.${s}` + text.slice(note.end);
  return text;
}

/** [source path, score path, generated text] for every source, paths relative to the repository root. */
export function arrangements() {
  return readdirSync(new URL('arrangements/', ROOT), { recursive: true })
    .map((p) => p.replaceAll('\\', '/'))
    .filter((p) => p.endsWith('.txt'))
    .sort()
    .map((p) => {
      const source = `arrangements/${p}`;
      const score = `scores/${p.replace(/\.txt$/, '.atex')}`;
      let text;
      try {
        text = arrange(readText(source));
      } catch (e) {
        throw new Error(`${source}: ${e.message}`);
      }
      return [source, score, `// Generated from ${source} by scripts/arrange.mjs. Edit the source, not this file.\n${text}`];
    });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [, score, text] of arrangements()) {
    writeFileSync(new URL(score, ROOT), text);
    console.log(score);
  }
}
