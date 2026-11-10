// Parses song text: alphaTex for scores with tab, ChordPro for chord charts. See README.md for the supported subset.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { midiOf } from '../pitch.js';
import { meter } from './meter.js';
import { parseAlphaTex } from './alphatex.js';
import { parseChordPro } from './chordpro.js';

/** ChordPro text starts with a directive; comments and blank lines before it do not count. */
const isChordPro = (text) => /^\s*(?:#[^\n]*\n\s*)*\{/.test(text);

/**
 * Parses song text into meta data and a flat list of bars. Each bar is one measure; `phase` is where it starts inside
 * the metric bar, which is not 0 only for a pickup. Problems never stop the parse: they are collected in `errors`
 * (wrong music) and `warnings` (suspicious layout), each with its line number.
 */
export function parseSong(text) {
  const song = {
    meta: { ...config.format.defaultMeta, time: [...config.format.defaultMeta.time], title: t('parser.untitled') },
    sections: [],
    bars: [],
    strum: null,
    errors: [],
    warnings: [],
  };
  const err = (line, message) => song.errors.push({ line, message });
  const warn = (line, message) => song.warnings.push({ line, message });
  const parser = isChordPro(text) ? parseChordPro : parseAlphaTex;
  parser(text, song, err, warn);
  song.meter ??= meter(song.meta.time);
  for (const b of song.bars) b.meter ??= song.meter;
  // a heading without bars after it is dropped
  song.sections = song.sections.filter((s, i) => s.start < (song.sections[i + 1]?.start ?? song.bars.length));
  song.bars.forEach((b) => (b.section = song.sections.findLastIndex((s) => s.start <= b.index)));
  finishBars(song);
  return song;
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
  song.hasEvents = song.bars.some((b) => b.events.length);
  song.hasLyrics = song.bars.some((b) => b.lyric || b.events.some((e) => e.lyric));
}
