// Parses the tokens of one tab cell into timed events.
import { t } from '../../core/i18n.js';
import { STRUMS, clip, isRest } from './syntax.js';

const BASE = { w: 192, h: 96, q: 48, e: 24, s: 12 };
const MAX_FRET = 24;

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
    if (isRest(tok)) ev.kind = 'rest';
    else if (strum) {
      ev.kind = 'strum';
      ev.dir = strum;
    } else {
      const parts = tok.split('+').map((p) => /^([1-6])\/(\d{1,2}|x)$/i.exec(p));
      if (parts.some((p) => !p)) {
        report(t('parser.unknownToken', { token: clip(tok) }));
        continue;
      }
      ev.kind = 'note';
      ev.notes = parts.map((p) => ({ s: +p[1], f: p[2].toLowerCase() === 'x' ? -1 : +p[2] }));
      if (ev.notes.some((n) => n.f > MAX_FRET)) report(t('parser.fretRange', { token: tok, max: MAX_FRET }));
    }
    events.push(ev);
    at += dur;
  }
  return { events, total: at };
}
