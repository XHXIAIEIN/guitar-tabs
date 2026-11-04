// Helpers over parsed bars: rhythm patterns as songs, their readable form, and the chord at a tick.
import { t } from '../../core/i18n.js';
import { meter } from './meter.js';

/** A one-bar song holding `events`, for showing a rhythm pattern with the score renderer. */
export function patternSong(events, time) {
  const m = meter(time);
  const bar = { index: 0, section: -1, line: 0, ticks: m.barTicks, pickup: false, chords: [], events, lyric: '', startChord: null };
  return { meta: { time }, meter: m, sections: [], bars: [bar], strum: null, errors: [], warnings: [], melody: [], chordsUsed: [] };
}

/** Readable form of a strum pattern: "下 下上 (空)上 下上", grouped by beat. */
export function describeStrum(events, m) {
  const beats = [];
  for (const e of events) {
    const k = Math.floor(e.at / m.beatTicks);
    beats[k] = (beats[k] ?? '') + t(e.kind === 'strum' ? `strum.${e.dir}` : 'strum.rest');
  }
  return beats.filter(Boolean).join(' ');
}

/** Chord sounding at `tick` of a bar. */
export function chordAt(bar, tick) {
  let name = bar.startChord;
  for (const c of bar.chords) if (c.at <= tick) name = c.name;
  return name;
}
