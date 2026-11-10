// Parser for the subset of alphaTex (https://alphatab.net/docs/alphatex/introduction) that the scores use.
import { t } from '../../core/i18n.js';
import { meter } from './meter.js';
import { BASE } from './events.js';
import { chordName, clip, lyricChunks, newBar, setMeta } from './syntax.js';

const BASE_OF = { 1: 'w', 2: 'h', 4: 'q', 8: 'e', 16: 's' };
const MAX_FRET = 24;
const NOTE = /^(\d{1,2}|x)\.([1-6])$/;
const BEAT = /^(\d{1,2}|x)\.([1-6])(?:\.(\d+))?$/;
const REST = /^r(?:\.(\d+))?$/;
// tags that describe the whole song, so they belong before the first beat
const HEADER = new Set(['title', 'artist', 'instructions', 'tempo', 'ts', 'ks', 'capo', 'lyrics', 'systemslayout']);

/** Splits text into tags, strings, punctuation, `:N` durations and words, each with its line number. */
function tokenize(text, err) {
  const toks = [];
  let line = 1;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '\n') line++;
    if (/\s/.test(c)) {
      i++;
    } else if (text.startsWith('//', i)) {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      line += text.slice(i, stop).split('\n').length - 1;
      i = stop;
    } else if (c === '"' || c === "'") {
      const start = line;
      let value = '';
      i++;
      while (i < text.length && text[i] !== c) {
        if (text[i] === '\\' && i + 1 < text.length) {
          const e = text[++i];
          if (e === 'u') {
            value += String.fromCharCode(parseInt(text.slice(i + 1, i + 5), 16));
            i += 4;
          } else value += { n: '\n', t: '\t', r: '\r' }[e] ?? e;
        } else {
          if (text[i] === '\n') line++;
          value += text[i];
        }
        i++;
      }
      if (i >= text.length) err(start, t('parser.unclosed', { open: c }));
      toks.push({ type: 'str', value, line: start });
      i++;
    } else if ('(){}|'.includes(c)) {
      toks.push({ type: c, value: c, line });
      i++;
    } else {
      const m = /^[^\s(){}|"']+/.exec(text.slice(i));
      const word = m[0];
      if (word.startsWith('\\')) toks.push({ type: 'tag', value: word.slice(1).toLowerCase(), raw: word, line });
      else if (/^:\d+$/.test(word)) toks.push({ type: 'dur', value: +word.slice(1), line });
      else toks.push({ type: 'word', value: word, line });
      i += word.length;
    }
  }
  return toks;
}

export function parseAlphaTex(text, song, err, warn) {
  const toks = tokenize(text, err);
  const meta = song.meta;
  let i = 0;
  let dur = 4;
  let cur = null;
  let lyrics = null;
  let layout = null;
  let anacrusis = null;

  const open = (line) => (cur ??= newBar(song.bars.length, line));
  const barMessage = (message) => t('parser.inBar', { n: song.bars.length + 1, message });
  const close = (line) => {
    if (!cur) return err(line, barMessage(t('parser.emptyBar')));
    if (!cur.events.length) err(cur.line, barMessage(t('parser.emptyBar')));
    song.bars.push(cur);
    cur = null;
  };

  /** Arguments of a tag: everything inside a following `( )`, or `count` single tokens. */
  const args = (count) => {
    if (toks[i]?.type === '(') {
      const out = [];
      for (i++; i < toks.length && toks[i].type !== ')'; i++) out.push(toks[i]);
      i++;
      return out;
    }
    const out = toks.slice(i, i + count);
    i += out.length;
    return out;
  };

  const readTag = (tok) => {
    const name = tok.value;
    const bad = () => err(tok.line, t('parser.tagValue', { tag: tok.raw }));
    const value = (a) => (a && (a.type === 'str' || a.type === 'word') ? String(a.value) : null);
    if (HEADER.has(name) && (song.bars.length || cur?.events.length)) err(tok.line, t('parser.headerOnly', { tag: tok.raw }));
    if (name === 'title' || name === 'artist' || name === 'instructions') {
      const v = value(args(1)[0]);
      if (v === null) bad();
      else meta[name] = v;
    } else if (name === 'tempo' || name === 'capo') {
      const v = value(args(1)[0]);
      if (v === null) bad();
      else setMeta(meta, name === 'tempo' ? 'bpm' : 'capo', v, tok.raw, (m) => err(tok.line, m));
    } else if (name === 'ts') {
      const a = args(toks[i]?.value === 'common' ? 1 : 2).map(value);
      const time = a[0] === 'common' ? '4/4' : a.join('/');
      setMeta(meta, 'time', time, tok.raw, (m) => err(tok.line, m));
    } else if (name === 'ks') {
      const v = value(args(1)[0]);
      if (v === null) bad();
      else setMeta(meta, 'key', v.replace(/minor$/i, 'm').replace(/major$/i, ''), tok.raw, (m) => err(tok.line, m));
    } else if (name === 'lyrics') {
      const a = args(toks[i]?.type === 'word' ? 2 : 1);
      const last = a[a.length - 1];
      if (a.length === 2 && a[0].value !== '0') err(tok.line, t('parser.lyricsStart'));
      if (last?.type !== 'str') bad();
      else lyrics = { text: last.value, line: last.line };
    } else if (name === 'systemslayout') {
      const a = args(1).map((x) => Number(x.value));
      if (!a.length || a.some((n) => !Number.isInteger(n) || n < 1)) bad();
      else layout = a;
    } else if (name === 'section') {
      const a = args(1);
      const v = value(a[a.length - 1]);
      if (v === null) return bad();
      if (cur?.events.length) err(tok.line, t('parser.barStart', { tag: tok.raw }));
      song.sections.push({ name: v, start: open(tok.line).index });
    } else if (name === 'ac') {
      if (cur?.events.length) err(tok.line, t('parser.barStart', { tag: tok.raw }));
      if (song.bars.length) err(tok.line, t('parser.acFirst'));
      else anacrusis = open(tok.line);
    } else {
      err(tok.line, t('parser.unknownTag', { tag: tok.raw }));
      // skip the arguments when they are in parentheses; bare ones read as unknown beats
      if (toks[i]?.type === '(') args(0);
    }
  };

  /** Applies `{ d tu 3 ch "C" }` after a beat. */
  const readProps = (ev, line) => {
    if (toks[i]?.type !== '{') return;
    for (i++; i < toks.length && toks[i].type !== '}'; i++) {
      const p = toks[i].value;
      if (p === 'd') ev.dotted = true;
      else if (p === 'x') ev.notes.forEach((n) => (n.f = -1));
      else if (p === 'tu') {
        if (toks[i + 1]?.value !== '3') err(line, t('parser.tuplet', { value: clip(String(toks[i + 1]?.value ?? '')) }));
        ev.tuplet = true;
        i++;
      } else if (p === 'ch') {
        const name = toks[++i];
        const norm = name?.type === 'str' && chordName(name.value);
        if (norm) ev.chord = norm;
        else err(line, barMessage(t('parser.unknownChord', { name: clip(String(name?.value ?? '')) })));
      } else err(line, barMessage(t('parser.unknownProperty', { name: clip(String(p)) })));
    }
    if (i >= toks.length) err(line, t('parser.unclosed', { open: '{' }));
    i++;
  };

  const setDur = (v, line) => {
    if (BASE_OF[v]) dur = v;
    else err(line, barMessage(t('parser.badDuration', { value: v })));
  };

  const readNotes = (tok) => {
    if (tok.type === '(') {
      const notes = [];
      for (; i < toks.length && toks[i].type !== ')'; i++) {
        const m = toks[i].type === 'word' && NOTE.exec(toks[i].value);
        if (m) notes.push({ s: +m[2], f: m[1] === 'x' ? -1 : +m[1] });
        else err(toks[i].line, barMessage(t('parser.unknownToken', { token: clip(String(toks[i].value)) })));
      }
      if (i >= toks.length) err(tok.line, t('parser.unclosed', { open: '(' }));
      i++;
      const d = toks[i]?.type === 'word' && /^\.(\d+)$/.exec(toks[i].value);
      if (d) {
        setDur(+d[1], toks[i].line);
        i++;
      }
      return { kind: 'note', notes };
    }
    const rest = REST.exec(tok.value);
    if (rest) {
      if (rest[1]) setDur(+rest[1], tok.line);
      return { kind: 'rest', notes: [] };
    }
    const m = BEAT.exec(tok.value);
    if (!m) return null;
    if (m[3]) setDur(+m[3], tok.line);
    return { kind: 'note', notes: [{ s: +m[2], f: m[1] === 'x' ? -1 : +m[1] }] };
  };

  while (i < toks.length) {
    const tok = toks[i++];
    if (tok.type === 'tag') readTag(tok);
    else if (tok.type === '|') close(tok.line);
    else if (tok.type === 'dur') setDur(tok.value, tok.line);
    else if (tok.type === '(' || tok.type === 'word') {
      const beat = readNotes(tok);
      if (!beat) {
        err(tok.line, barMessage(t('parser.unknownToken', { token: clip(tok.value) })));
        continue;
      }
      const ev = { at: 0, dur: 0, base: BASE_OF[dur], dotted: false, tuplet: false, ...beat, dir: '', lyric: '', chord: null };
      readProps(ev, tok.line);
      if (ev.notes.some((n) => n.f > MAX_FRET)) err(tok.line, barMessage(t('parser.fretRange', { max: MAX_FRET })));
      const bar = open(tok.line);
      ev.at = bar.ticks;
      ev.dur = BASE[ev.base] * (ev.dotted ? 1.5 : 1) * (ev.tuplet ? 2 / 3 : 1);
      if (ev.chord) bar.chords.push({ at: ev.at, name: ev.chord });
      delete ev.chord;
      bar.events.push(ev);
      bar.ticks += ev.dur;
    } else err(tok.line, barMessage(t('parser.unknownToken', { token: clip(tok.value) })));
  }
  if (cur?.events.length) song.bars.push(cur);

  const m = meter(meta.time);
  song.meter = m;
  song.bars.forEach((bar, k) => {
    const last = k === song.bars.length - 1;
    if (bar === anacrusis) bar.phase = (m.barTicks - (bar.ticks % m.barTicks)) % m.barTicks;
    else if (bar.ticks > m.barTicks || (bar.ticks < m.barTicks && !last)) {
      warn(bar.line, t('parser.inBar', { n: k + 1, message: t('parser.barLength', { total: +(bar.ticks / m.beatTicks).toFixed(2), bar: m.beats }) }));
    }
  });

  // page lines: the counts of \systemsLayout, then one line per section for the bars it does not cover
  let next = 0;
  for (const count of layout ?? []) {
    if (song.bars[next]) song.bars[next].lineStart = true;
    next += count;
  }
  if (song.bars[0]) song.bars[0].lineStart = true;
  for (const s of song.sections) if (s.start >= next && song.bars[s.start]) song.bars[s.start].lineStart = true;

  if (lyrics) {
    const notes = song.bars.flatMap((b) => b.events.filter((e) => e.kind === 'note'));
    const chunks = lyricChunks(lyrics.text);
    chunks.slice(0, notes.length).forEach((s, k) => (notes[k].lyric = s));
    if (chunks.length > notes.length) warn(lyrics.line, t('parser.extraLyrics', { count: chunks.length, notes: notes.length }));
  }
}
