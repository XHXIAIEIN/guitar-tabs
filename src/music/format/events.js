// Parses a strum pattern ("q D e D U r U D U") into timed events.
import { t } from '../../core/i18n.js';
import { clip } from './syntax.js';

export const BASE = { w: 192, h: 96, q: 48, e: 24, s: 12 };
const STRUMS = new Set(['D', 'U', 'X']);

/** Returns the events of one strum pattern and their total length in ticks. A duration token stays until the next. */
export function parseStrum(text, report) {
  const events = [];
  const state = { base: 'q', dotted: false, tuplet: false };
  let at = 0;
  for (const tok of text.split(/\s+/).filter(Boolean)) {
    const d = /^([whqes])(\.?)(3?)$/.exec(tok);
    if (d) {
      state.base = d[1];
      state.dotted = !!d[2];
      state.tuplet = !!d[3];
      continue;
    }
    const dir = tok.toUpperCase();
    if (tok !== 'r' && !STRUMS.has(dir)) {
      report(t('parser.strumToken', { token: clip(tok) }));
      continue;
    }
    const dur = BASE[state.base] * (state.dotted ? 1.5 : 1) * (state.tuplet ? 2 / 3 : 1);
    events.push({ at, dur, base: state.base, dotted: state.dotted, tuplet: state.tuplet, kind: tok === 'r' ? 'rest' : 'strum', notes: [], dir: tok === 'r' ? '' : dir, lyric: '' });
    at += dur;
  }
  return { events, total: at };
}
