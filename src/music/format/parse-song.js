// Parser for the plain-text tab format. See README.md for the syntax.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { parseKey } from '../key.js';
import { parseChord } from '../chord-name.js';
import { midiOf } from '../pitch.js';
import { meter } from './meter.js';
import { parseEvents } from './events.js';
import { META, ROWS, clip, parseTime, splitBars, splitField, stripKeySuffix, stripNumberSuffix, syllables } from './syntax.js';

function parseChords(cell, bar, m, report) {
  const toks = cell.split(/\s+/).filter(Boolean);
  if (!toks.length) return;
  const slots = Math.round(bar.ticks / m.beatTicks);
  const dot = (tok) => tok === '.' || tok === '·';
  const add = (name, at) => {
    const norm = name.replace(/♯/g, '#').replace(/♭/g, 'b');
    if (!parseChord(norm)) report(t('parser.unknownChord', { name: clip(name) }));
    else bar.chords.push({ at, name: norm });
  };
  if (toks.some(dot)) {
    if (toks.length !== slots) report(t('parser.chordSlots', { cell: clip(cell), count: toks.length, slots }));
    toks.forEach((tok, i) => i < slots && !dot(tok) && add(tok, i * m.beatTicks));
  } else {
    toks.forEach((tok, i) => add(tok, Math.floor((i * slots) / toks.length) * m.beatTicks));
  }
}

/**
 * Parses song text into meta data and a flat list of bars. A bar is one `|` cell: a phrase of any length when it
 * holds notes, one metric bar when it holds only chords. `phase` is where a bar starts inside the metric bar.
 * Problems never stop the parse: they are collected in `errors` (wrong music) and `warnings` (suspicious layout).
 */
export function parseSong(text) {
  const song = {
    meta: { ...config.format.defaultMeta, title: t('parser.untitled') },
    sections: [],
    bars: [],
    strum: null,
    errors: [],
    warnings: [],
  };
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const err = (line, message) => song.errors.push({ line, message });
  const warn = (line, message) => song.warnings.push({ line, message });

  // Pass 1: meta data, because the time signature decides every bar length.
  let strumLine = 0;
  lines.forEach((line, i) => {
    const m = !line.startsWith('//') && !line.startsWith('#') && splitField(line);
    const field = m && META.get(m[1].trim().toLowerCase());
    if (!field) return;
    const v = m[2].trim();
    const n = i + 1;
    const meta = song.meta;
    if (field === 'key') {
      const k = parseKey(stripKeySuffix(v));
      if (k) meta.key = k.name;
      else err(n, t('parser.badKey', { value: v }));
    } else if (field === 'capo' || field === 'bpm' || field === 'octave' || field === 'pickup') {
      const num = Number(stripNumberSuffix(v));
      const [lo, hi] = config.format.limits[field];
      if (Number.isFinite(num) && num >= lo && num <= hi) meta[field] = num;
      else err(n, t('parser.outOfRange', { field: m[1].trim(), lo, hi }));
    } else if (field === 'time') {
      const time = parseTime(v);
      if (time) meta.time = time;
      else err(n, t('parser.badTime', { value: v }));
    } else if (field === 'strum') strumLine = n;
    else meta[field] = v;
  });

  const m = meter(song.meta.time);
  song.meter = m;

  if (strumLine) {
    const v = splitField(lines[strumLine - 1])[2].trim();
    const { events, total } = parseEvents(v, { base: 'q' }, (msg) => err(strumLine, msg));
    if (total !== m.barTicks) err(strumLine, t('parser.strumLength', { total: +(total / m.beatTicks).toFixed(2), bar: m.beats }));
    else if (events.some((e) => e.kind === 'note')) err(strumLine, t('parser.strumNotes'));
    else song.strum = events;
  }

  // Pass 2: sections and row blocks.
  let block = [];
  let section = -1;
  const flush = () => {
    if (block.length) buildBlock(song, block, section, m, err, warn);
    block = [];
  };
  lines.forEach((line, i) => {
    const n = i + 1;
    if (!line) return flush();
    if (line.startsWith('//')) return;
    if (line.startsWith('#')) {
      flush();
      song.sections.push({ name: line.replace(/^#+/, '').trim(), start: song.bars.length });
      section = song.sections.length - 1;
      return;
    }
    const parts = splitField(line);
    const name = parts?.[1].trim().toLowerCase();
    if (parts && ROWS.has(name)) {
      const type = ROWS.get(name);
      if (block.some((r) => r.type === type)) flush();
      block.push({ type, line: n, cells: splitBars(parts[2].trim()) });
    } else if (!(parts && META.has(name))) {
      err(n, parts ? t('parser.unknownRow', { name: clip(parts[1].trim()) }) : t('parser.unknownLine', { line: clip(line) }));
    }
  });
  flush();

  // Drop headings without bars and renumber the rest.
  const headings = song.sections;
  const renumber = new Map();
  song.sections = [];
  headings.forEach((s, i) => {
    const first = song.bars.find((b) => b.section === i);
    if (!first) return;
    renumber.set(i, song.sections.length);
    song.sections.push({ name: s.name, start: first.index });
  });
  for (const b of song.bars) b.section = renumber.get(b.section) ?? -1;
  finishBars(song);
  return song;
}

function buildBlock(song, rows, sectionIndex, m, err, warn) {
  const n = Math.max(...rows.map((r) => r.cells.length));
  for (const r of rows) {
    if (r.type !== 'lyric' && r.cells.length !== n) warn(r.line, t('parser.rowLength', { count: r.cells.length, expected: n }));
  }
  const row = (type) => rows.find((r) => r.type === type);
  const tab = row('tab');
  const chord = row('chord');
  const lyric = row('lyric');
  const state = { base: 'q', dotted: false, tuplet: false };
  for (let k = 0; k < n; k++) {
    const index = song.bars.length;
    const bar = {
      index,
      section: sectionIndex,
      line: (tab ?? chord ?? lyric).line,
      // a cell without notes lasts one metric bar, or the pickup when it opens the song
      ticks: index === 0 && song.meta.pickup ? Math.round(song.meta.pickup * m.beatTicks) : m.barTicks,
      phase: 0,
      // the first bar of a row block starts a new line on the page
      lineStart: k === 0,
      chords: [],
      events: [],
      lyric: '',
      startChord: null,
    };
    const inBar = (message) => t('parser.inBar', { n: index + 1, message });
    const cell = tab?.cells[k];
    if (cell) {
      const { events, total } = parseEvents(cell, state, (msg) => err(tab.line, inBar(msg)));
      bar.events = events;
      if (events.length) bar.ticks = total;
    }
    if (chord?.cells[k]) parseChords(chord.cells[k], bar, m, (msg) => err(chord.line, inBar(msg)));
    const text = lyric?.cells[k] ?? '';
    const notes = bar.events.filter((e) => e.kind === 'note');
    if (text && notes.length) {
      const syl = syllables(text);
      syl.slice(0, notes.length).forEach((s, i) => (notes[i].lyric = s));
      if (syl.length > notes.length) {
        warn(lyric.line, inBar(t('parser.extraLyrics', { count: syl.length, notes: notes.length })));
        notes[notes.length - 1].lyric += syl.slice(notes.length).join('');
      }
    } else bar.lyric = text;
    song.bars.push(bar);
  }
}

function finishBars(song) {
  const m = song.meter;
  // the first downbeat comes after the pickup beats
  let start = -Math.round(song.meta.pickup * m.beatTicks);
  let current = null;
  const used = [];
  const pitches = [];
  for (const bar of song.bars) {
    bar.phase = ((start % m.barTicks) + m.barTicks) % m.barTicks;
    start += bar.ticks;
    bar.startChord = bar.chords[0]?.at === 0 ? bar.chords[0].name : current;
    for (const c of bar.chords) {
      current = c.name;
      if (!used.includes(c.name)) used.push(c.name);
    }
    for (const e of bar.events) {
      if (e.kind !== 'note') continue;
      // the top voice carries the melody that 简谱 shows
      const top = e.notes.filter((n) => n.f >= 0).sort((a, b) => a.s - b.s)[0];
      if (top) pitches.push(midiOf(top.s, top.f));
    }
  }
  song.chordsUsed = used;
  song.melody = pitches;
  song.hasEvents = song.bars.some((b) => b.events.length);
}
