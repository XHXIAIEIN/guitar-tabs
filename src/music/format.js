// Parser for the plain-text tab format. See README.md for the syntax.
import { parseChord, parseKey, midiOf } from './theory.js';

/** Ticks per quarter note. Divisible by 3 and 4 so triplets and sixteenths stay whole numbers. */
export const TPQ = 48;
const BASE = { w: 192, h: 96, q: 48, e: 24, s: 12 };

const META = new Map(Object.entries({
  title: 'title', 标题: 'title', 歌名: 'title',
  artist: 'artist', 作者: 'artist', 演唱: 'artist', 词曲: 'artist',
  key: 'key', 调: 'key',
  capo: 'capo', 变调夹: 'capo',
  bpm: 'bpm', tempo: 'bpm', 速度: 'bpm',
  time: 'time', 拍号: 'time',
  strum: 'strum', 节奏型: 'strum',
  pickup: 'pickup', 弱起: 'pickup',
  jianpu: 'jianpu', 简谱八度: 'jianpu',
  level: 'level', 难度: 'level',
  note: 'note', 说明: 'note',
}));
const ROWS = new Map(Object.entries({ chord: 'chord', 和弦: 'chord', tab: 'tab', 谱: 'tab', 六线谱: 'tab', lyric: 'lyric', 歌词: 'lyric' }));
const STRUMS = new Map(Object.entries({ D: 'D', 下: 'D', U: 'U', 上: 'U', X: 'X', 切: 'X' }));
const CJK = /[㐀-鿿豈-﫿]/;

const clip = (s) => (s.length > 24 ? s.slice(0, 24) + '…' : s);

/** Splits "| a | b |" into ['a', 'b']; inner empty cells stay. */
function splitBars(text) {
  const cells = text.split('|').map((c) => c.trim());
  if (cells.length > 1 && cells[0] === '') cells.shift();
  if (cells.length > 1 && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/** Splits lyrics into one syllable per note: each Han character, each word, "_" for a held note. */
export function syllables(text) {
  const out = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word === '_') out.push('');
    else if (CJK.test(word)) {
      for (const ch of word) {
        if (ch === '_') out.push('');
        else if (CJK.test(ch) || !out.length) out.push(ch);
        else out[out.length - 1] += ch; // punctuation stays with the syllable before it
      }
    } else out.push(...word.split(/(?<=-)/));
  }
  return out;
}

function parseTime(v) {
  const m = /^(\d{1,2})\/(2|4|8)$/.exec(v);
  return m && +m[1] > 0 ? [+m[1], +m[2]] : null;
}

/** Bar length, click unit and beam grouping for a time signature. */
export function meter([num, den]) {
  const beatTicks = 192 / den;
  const compound = den === 8 && num % 3 === 0;
  return {
    barTicks: num * beatTicks,
    beatTicks,
    beats: num,
    compound,
    groupTicks: compound ? 72 : den === 2 ? 96 : 48,
  };
}

/** Click strength of beat `i`: 2 bar start, 1 compound-meter group start, 0 other beats. */
export const beatAccent = (i, m) => (i === 0 ? 2 : m.compound && i % 3 === 0 ? 1 : 0);

/**
 * Parses one bar of tab tokens. `state` carries the sticky duration across bars of a row.
 * Returns the events and their total length in ticks.
 */
export function parseEvents(cell, state, report) {
  const events = [];
  let at = 0;
  for (const tok of cell.split(/\s+/).filter(Boolean)) {
    const d = /^([whqes])(\.?)(3?)$/.exec(tok);
    if (d) {
      state.base = d[1];
      state.dotted = !!d[2];
      state.tuplet = !!d[3];
      continue;
    }
    const dur = BASE[state.base] * (state.dotted ? 1.5 : 1) * (state.tuplet ? 2 / 3 : 1);
    const ev = { at, dur, base: state.base, dotted: state.dotted, tuplet: state.tuplet, kind: '', notes: [], dir: '', lyric: '' };
    const strum = STRUMS.get(tok.toUpperCase());
    if (tok === 'r' || tok === '休') ev.kind = 'rest';
    else if (strum) {
      ev.kind = 'strum';
      ev.dir = strum;
    } else {
      const parts = tok.split('+').map((p) => /^([1-6])\/(\d{1,2}|x)$/i.exec(p));
      if (parts.some((p) => !p)) {
        report(`无法识别「${clip(tok)}」。音符写成 弦/品（如 5/3），和音用 + 连接（如 5/3+2/1），休止符写 r，扫弦写 D、U、X`);
        continue;
      }
      ev.kind = 'note';
      ev.notes = parts.map((p) => ({ s: +p[1], f: p[2].toLowerCase() === 'x' ? -1 : +p[2] }));
      if (ev.notes.some((n) => n.f > 24)) report(`「${tok}」超出 24 品`);
    }
    events.push(ev);
    at += dur;
  }
  return { events, total: at };
}

function parseChords(cell, bar, m, report) {
  const toks = cell.split(/\s+/).filter(Boolean);
  if (!toks.length) return;
  const slots = Math.round(bar.ticks / m.beatTicks);
  const dot = (t) => t === '.' || t === '·';
  const add = (name, at) => {
    const norm = name.replace(/♯/g, '#').replace(/♭/g, 'b');
    if (!parseChord(norm)) report(`无法识别的和弦「${clip(name)}」`);
    else bar.chords.push({ at, name: norm });
  };
  if (toks.some(dot)) {
    if (toks.length !== slots) report(`和弦格「${clip(cell)}」写了 ${toks.length} 个位置，这一小节有 ${slots} 拍（每个和弦或 . 占一拍）`);
    toks.forEach((t, i) => i < slots && !dot(t) && add(t, i * m.beatTicks));
  } else {
    toks.forEach((t, i) => add(t, Math.floor((i * slots) / toks.length) * m.beatTicks));
  }
}

const fmtBeats = (ticks, m) => `${+(ticks / m.beatTicks).toFixed(2)}`;

/**
 * Parses song text into meta data and a flat list of bars.
 * Problems never stop the parse: they are collected in `errors` (wrong music) and `warnings` (suspicious layout).
 */
export function parseSong(text) {
  const song = {
    meta: { title: '未命名', artist: '', key: 'C', capo: 0, bpm: 80, time: [4, 4], pickup: 0, jianpu: 0, level: '', note: '' },
    sections: [],
    bars: [],
    strum: null,
    errors: [],
    warnings: [],
  };
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const err = (line, message) => song.errors.push({ line, message });
  const warn = (line, message) => song.warnings.push({ line, message });
  const split = (line) => /^([^:：|]+)[:：](.*)$/.exec(line);

  // Pass 1: meta data, because the time signature decides every bar length.
  let strumLine = 0;
  lines.forEach((line, i) => {
    const m = !line.startsWith('//') && !line.startsWith('#') && split(line);
    const field = m && META.get(m[1].trim().toLowerCase());
    if (!field) return;
    const v = m[2].trim();
    const n = i + 1;
    const meta = song.meta;
    if (field === 'key') {
      const k = parseKey(v.replace(/调$/, ''));
      if (k) meta.key = k.name;
      else err(n, `调号「${v}」无法识别，写成 C、G、Eb、Am 这样的形式`);
    } else if (field === 'capo' || field === 'bpm' || field === 'jianpu' || field === 'pickup') {
      const num = Number(v.replace(/品|拍$/g, ''));
      const [lo, hi] = { capo: [0, 12], bpm: [20, 320], jianpu: [-2, 2], pickup: [0, 12] }[field];
      if (Number.isFinite(num) && num >= lo && num <= hi) meta[field] = num;
      else err(n, `${m[1].trim()} 应为 ${lo}–${hi} 之间的数字`);
    } else if (field === 'time') {
      const t = parseTime(v);
      if (t) meta.time = t;
      else err(n, `拍号「${v}」无法识别，写成 4/4、3/4、6/8 这样的形式`);
    } else if (field === 'strum') strumLine = n;
    else meta[field] = v;
  });

  const m = meter(song.meta.time);
  song.meter = m;

  if (strumLine) {
    const v = split(lines[strumLine - 1])[2].trim();
    const { events, total } = parseEvents(v, { base: 'q' }, (msg) => err(strumLine, msg));
    if (total !== m.barTicks) err(strumLine, `节奏型合计 ${fmtBeats(total, m)} 拍，应为一整小节 ${fmtBeats(m.barTicks, m)} 拍`);
    else if (events.some((e) => e.kind === 'note')) err(strumLine, '节奏型只能包含扫弦（D、U、X）和休止（r）');
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
    const parts = split(line);
    const name = parts?.[1].trim().toLowerCase();
    if (parts && ROWS.has(name)) {
      const type = ROWS.get(name);
      if (block.some((r) => r.type === type)) flush();
      block.push({ type, line: n, cells: splitBars(parts[2].trim()) });
    } else if (!(parts && META.has(name))) {
      err(n, parts ? `未知的行类型「${clip(parts[1].trim())}」，可用 chord / tab / lyric` : `无法识别这一行：「${clip(line)}」`);
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
    if (r.type !== 'lyric' && r.cells.length !== n) warn(r.line, `这一行有 ${r.cells.length} 个小节，同组的其他行有 ${n} 个`);
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
      ticks: m.barTicks,
      pickup: false,
      chords: [],
      events: [],
      lyric: '',
      startChord: null,
    };
    const label = `第 ${index + 1} 小节`;
    const cell = tab?.cells[k];
    if (cell) {
      const { events, total } = parseEvents(cell, state, (msg) => err(tab.line, `${label}：${msg}`));
      bar.events = events;
      if (index === 0 && total > 0 && total < m.barTicks) {
        bar.ticks = total;
        bar.pickup = true;
      } else if (events.length && total !== m.barTicks) {
        err(tab.line, `${label}：时值合计 ${fmtBeats(total, m)} 拍，${song.meta.time.join('/')} 拍每小节应为 ${fmtBeats(m.barTicks, m)} 拍`);
        bar.ticks = Math.max(total, m.barTicks);
      }
    } else if (index === 0 && song.meta.pickup) {
      bar.ticks = Math.round(song.meta.pickup * m.beatTicks);
      bar.pickup = bar.ticks < m.barTicks;
    }
    if (chord?.cells[k]) parseChords(chord.cells[k], bar, m, (msg) => err(chord.line, `${label}：${msg}`));
    const text = lyric?.cells[k] ?? '';
    const notes = bar.events.filter((e) => e.kind === 'note');
    if (text && notes.length) {
      const syl = syllables(text);
      syl.slice(0, notes.length).forEach((s, i) => (notes[i].lyric = s));
      if (syl.length > notes.length) {
        warn(lyric.line, `${label}：歌词有 ${syl.length} 个字，音符只有 ${notes.length} 个，多出的字接在最后一个音上`);
        notes[notes.length - 1].lyric += syl.slice(notes.length).join('');
      }
    } else bar.lyric = text;
    song.bars.push(bar);
  }
}

function finishBars(song) {
  let current = null;
  const used = [];
  const pitches = [];
  for (const bar of song.bars) {
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
  song.hasNotes = pitches.length > 0;
  song.hasEvents = song.bars.some((b) => b.events.length);
}

/** A one-bar song holding `events`, for showing a rhythm pattern with the score renderer. */
export function patternSong(events, time) {
  const m = meter(time);
  const bar = { index: 0, section: -1, line: 0, ticks: m.barTicks, pickup: false, chords: [], events, lyric: '', startChord: null };
  return { meta: { time }, meter: m, sections: [], bars: [bar], strum: null, errors: [], warnings: [], melody: [], chordsUsed: [] };
}

/** Readable form of a strum pattern: "下 下上 (空)上 下上", grouped by beat. */
export function describeStrum(events, m) {
  const words = { D: '下', U: '上', X: '切' };
  const beats = [];
  for (const e of events) {
    const k = Math.floor(e.at / m.beatTicks);
    beats[k] = (beats[k] ?? '') + (e.kind === 'strum' ? words[e.dir] : '(空)');
  }
  return beats.filter(Boolean).join(' ');
}

/** Chord sounding at `tick` of a bar. */
export function chordAt(bar, tick) {
  let name = bar.startChord;
  for (const c of bar.chords) if (c.at <= tick) name = c.name;
  return name;
}
