// Reads a plain-text tab as tab sites print it: blocks of six lines such as `e|---5---|`, high string first, with chord
// names on the line above a block. Text tabs have no rhythm, so durations come from the spacing: the most common
// gap between two notes counts as an eighth note. Everything else in the text, such as lyrics and legends, is skipped.
import { t } from '../../core/i18n.js';
import { config } from '../../core/config.js';
import { writeAlphaTex } from './write-alphatex.js';

const LABEL = /^(\s*)([A-Ga-g][#b]?)?(\s*)([|:]?)/;
// what may follow the label of a tab line: dashes, frets, bar lines and technique marks
const TAB_BODY = /^[-\d|hpbrxXsSt/\\~*.()<>^v= ]+$/;
const TECHNIQUE = /[hpbr/\\~^v]/g;
const CHORD = /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M|\d|[#b+\-()°ø])*(?:\/[A-G][#b]?)?$/;
// pitch class of each open string in standard tuning, string 1 (high E) first
const STANDARD = [4, 11, 7, 2, 9, 4];
const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// sixteenths → durations, longest first
const PIECES = [[16, 1, false], [12, 2, true], [8, 2, false], [6, 4, true], [4, 4, false], [3, 8, true], [2, 8, false], [1, 16, false]];
const BAR_16 = 16;

/** { label, start, body } when `line` is a line of a tab block: `body` is the text after the label and first bar line. */
function tabLine(line) {
  const m = LABEL.exec(line);
  // a line of dashes alone is a rule, not a string
  if (!m[2] && !m[4]) return null;
  const start = m[0].length;
  const body = line.slice(start).trimEnd();
  if ((body.match(/-/g) ?? []).length < 3 || !TAB_BODY.test(body)) return null;
  return { label: m[2] ?? '', start, body };
}

/** Durations that make up `n` sixteenths: the first is the note, the rest are rests after it. */
function pieces(n) {
  const out = [];
  for (const [len, dur, dotted] of PIECES) {
    while (n >= len) {
      out.push({ dur, dotted });
      n -= len;
    }
  }
  return out;
}

const pitchClass = (label) => (PITCH[label[0].toUpperCase()] + (label[1] === '#' ? 1 : label[1] === 'b' ? -1 : 0) + 12) % 12;

/** Six-line blocks of `lines`, each with its chord line; `other` counts the runs of tab lines that are not six long. */
function findBlocks(lines) {
  const blocks = [];
  let other = 0;
  for (let i = 0; i < lines.length; ) {
    const run = [];
    while (i + run.length < lines.length && tabLine(lines[i + run.length])) run.push(tabLine(lines[i + run.length]));
    if (!run.length) {
      i++;
      continue;
    }
    if (run.length === 6) {
      const above = lines[i - 1] ?? '';
      const tokens = [...above.matchAll(/\S+/g)];
      const chords = tokens.length && tokens.every((m) => CHORD.test(m[0])) ? tokens.map((m) => ({ name: m[0], col: m.index - run[0].start })) : [];
      blocks.push({ rows: run, chords, line: i });
    } else other++;
    i += run.length;
  }
  return { blocks, other };
}

/** The notes of a block grouped into beats, and the columns of its bar lines. */
function readBlock(block, report) {
  const notes = [];
  block.rows.forEach(({ body }, k) => {
    report('technique', (body.match(TECHNIQUE) ?? []).length);
    for (const m of body.matchAll(/\d{1,2}|[xX](?![a-zA-Z])/g)) notes.push({ s: k + 1, fret: /\d/.test(m[0]) ? +m[0] : null, start: m.index, end: m.index + m[0].length - 1 });
  });
  notes.sort((a, b) => a.start - b.start || a.s - b.s);
  // a two-digit fret on one string and a one-digit fret under its second digit sound together
  const beats = [];
  for (const n of notes) {
    const beat = beats[beats.length - 1];
    if (beat && n.start <= beat.end && !beat.notes.some((o) => o.s === n.s)) {
      beat.notes.push(n);
      beat.end = Math.max(beat.end, n.end);
    } else beats.push({ col: n.start, end: n.end, notes: [n] });
  }
  const width = Math.max(...block.rows.map((r) => r.body.length));
  // a bar line is a | on most of the strings
  const bars = [];
  for (let c = 0; c < width; c++) if (block.rows.filter((r) => r.body[c] === '|').length >= 4) bars.push(c);
  if (bars[bars.length - 1] !== width - 1) bars.push(width);
  return { beats, bars };
}

/** The most common gap between neighbouring notes inside a bar, taken as an eighth note. */
function eighthGap(read) {
  const gaps = new Map();
  for (const { beats, bars } of read) {
    beats.forEach((b, i) => {
      const next = beats[i + 1];
      if (next && !bars.some((c) => c > b.col && c < next.col)) gaps.set(next.col - b.col, (gaps.get(next.col - b.col) ?? 0) + 1);
    });
  }
  let best = 2;
  let bestCount = 0;
  for (const [gap, n] of gaps) if (n > bestCount || (n === bestCount && gap < best)) [best, bestCount] = [gap, n];
  return best;
}

/** True when `text` holds at least one six-line tab block. */
export const isTextTab = (text) => findBlocks(text.split(/\r?\n/)).blocks.length > 0;

/** Returns { text, remarks } for a text tab. `source` is the file name, or null for pasted text. */
export function textTabToAlphaTex(text, source) {
  const lines = text.split(/\r?\n/);
  const { blocks, other } = findBlocks(lines);
  const counts = new Map();
  const count = (key, n = 1) => n && counts.set(key, (counts.get(key) ?? 0) + n);
  count('otherStrings', other);

  // tuning from the labels of the first block, as a fret shift per string
  const labels = blocks[0].rows.map((r) => r.label);
  const shift = labels.every(Boolean) ? labels.map((l, k) => ((pitchClass(l) - STANDARD[k] + 18) % 12) - 6) : [0, 0, 0, 0, 0, 0];
  const remarks = [t('import.textRhythm')];
  if (shift.some(Boolean)) remarks.push(t('import.tuning', { tuning: [...labels].reverse().map((l) => l[0].toUpperCase() + l.slice(1)).join(' ') }));

  const read = blocks.map((b) => readBlock(b, count));
  const unit = eighthGap(read);
  const bars = [];
  let bar = null;
  let used = 0;
  const startBar = () => {
    bar = { beats: [] };
    bars.push(bar);
    used = 0;
  };
  /** Adds `n` sixteenths: a note (or rest when `notes` is empty) and rests for what is left, across bar lines. */
  const add = (notes, n, chord) => {
    while (n > 0) {
      if (!bar || used === BAR_16) startBar();
      const take = Math.min(n, BAR_16 - used);
      pieces(take).forEach((p, k) => bar.beats.push({ ...p, notes: k === 0 ? notes : [], chord: k === 0 ? chord : null }));
      used += take;
      n -= take;
      notes = [];
      chord = null;
    }
  };

  read.forEach(({ beats, bars: lines }, b) => {
    // each chord goes to the first beat at or after its column
    for (const c of blocks[b].chords) {
      const beat = beats.find((x) => x.end >= c.col) ?? beats[beats.length - 1];
      if (beat) beat.chord = c.name;
    }
    let from = -1;
    for (const end of lines) {
      const inBar = beats.filter((x) => x.col > from && x.col < end);
      inBar.forEach((beat, i) => {
        const gap = (inBar[i + 1]?.col ?? end) - beat.col;
        const n = Math.min(BAR_16, Math.max(1, Math.round((2 * gap) / unit)));
        const notes = [];
        for (const note of beat.notes) {
          if (note.fret === null) notes.push(`x.${note.s}`);
          else if (note.fret + shift[note.s - 1] < 0) count('low');
          else notes.push(`${note.fret + shift[note.s - 1]}.${note.s}`);
        }
        add(notes, n, beat.chord ?? null);
      });
      // a bar line of the tab ends the bar: the rest of it is silent
      if (inBar.length && used < BAR_16) add([], BAR_16 - used, null);
      from = end;
    }
  });

  for (const [key, n] of counts) remarks.push(t(`import.${key}`, { count: n }));
  const name = lines.find((l, i) => i < blocks[0].line && /\S\s+[-–—]\s+\S/.test(l) && !tabLine(l));
  const [title, artist] = name ? name.trim().split(/\s+[-–—]\s+/) : [source ? source.replace(/\.[^.]+$/, '') : t('import.pastedTitle'), ''];
  const capo = +(/capo\D{0,3}(\d{1,2})/i.exec(text)?.[1] ?? 0);
  const firstChord = blocks.flatMap((b) => b.chords)[0]?.name;
  const root = firstChord && /^[A-G][#b]?/.exec(firstChord)[0];
  const key = root ? root + (/^[A-G][#b]?m(?!aj)/.test(firstChord) ? 'minor' : '') : config.format.defaultMeta.key;

  const out = writeAlphaTex({
    comments: [source ? t('import.fromText', { name: source }) : t('import.fromPaste'), ...remarks],
    title,
    artist,
    tempo: config.format.defaultMeta.bpm,
    time: [4, 4],
    key,
    capo,
    lyrics: '',
    bars,
  });
  return { text: out, remarks };
}
