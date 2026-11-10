// Parser for the subset of ChordPro (https://www.chordpro.org/chordpro/) that chord charts use: metadata and grid
// sections, where each cell of a bar is one beat.
import { t } from '../../core/i18n.js';
import { meter } from './meter.js';
import { parseStrum } from './events.js';
import { chordName, clip, newBar, setMeta } from './syntax.js';

const ALIASES = { t: 'title', sog: 'start_of_grid', eog: 'end_of_grid' };
const DIRECTIVE = /^\{\s*([\w-]+)\s*(?::\s*(.*?))?\s*\}$/;

export function parseChordPro(text, song, err, warn) {
  const meta = song.meta;
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const directive = (line) => {
    const m = DIRECTIVE.exec(line);
    return m && { name: ALIASES[m[1].toLowerCase()] ?? m[1].toLowerCase(), value: m[2] ?? '' };
  };

  // Pass 1: meta data, because the time signature decides every bar length.
  let strum = null;
  lines.forEach((line, k) => {
    const d = line.startsWith('{') && directive(line);
    if (!d) return;
    const report = (message) => err(k + 1, message);
    if (d.name === 'title' || d.name === 'artist') meta[d.name] = d.value;
    else if (d.name === 'key' || d.name === 'capo' || d.name === 'time') setMeta(meta, d.name, d.value, d.name, report);
    else if (d.name === 'tempo') setMeta(meta, 'bpm', d.value, d.name, report);
    else if (d.name === 'meta') {
      const [, name, value] = /^(\S+)\s*(.*)$/.exec(d.value) ?? [];
      if (name === 'strum') strum = { value, line: k + 1 };
      else if (name === 'instructions') meta.instructions = value;
      else report(t('parser.unknownMeta', { name: clip(name ?? '') }));
    } else if (d.name !== 'start_of_grid' && d.name !== 'end_of_grid') report(t('parser.unknownDirective', { name: clip(d.name) }));
  });
  const m = meter(meta.time);
  song.meter = m;

  if (strum) {
    const report = (message) => err(strum.line, message);
    const { events, total } = parseStrum(strum.value, report);
    if (total !== m.barTicks) report(t('parser.strumLength', { total: +(total / m.beatTicks).toFixed(2), bar: m.beats }));
    else song.strum = events;
  }

  // Pass 2: grid rows, one bar per cell.
  let grid = 0;
  lines.forEach((line, k) => {
    const n = k + 1;
    if (!line || line.startsWith('#')) return;
    if (line.startsWith('{')) {
      const d = directive(line);
      if (!d) err(n, t('parser.unknownLine', { line: clip(line) }));
      else if (d.name === 'start_of_grid') {
        if (grid) err(n, t('parser.gridOpen'));
        grid = n;
        if (d.value) song.sections.push({ name: d.value, start: song.bars.length });
      } else if (d.name === 'end_of_grid') {
        if (!grid) err(n, t('parser.gridClosed'));
        grid = 0;
      }
      return;
    }
    if (!grid) return err(n, t('parser.outsideGrid', { line: clip(line) }));
    if (!line.startsWith('|') || !line.endsWith('|')) return err(n, t('parser.gridRow', { line: clip(line) }));
    const cells = line.replace(/\|[|.]/g, '|').split('|').slice(1, -1);
    cells.forEach((cell, c) => {
      const bar = newBar(song.bars.length, n);
      bar.ticks = m.barTicks;
      bar.lineStart = c === 0;
      const toks = cell.trim().split(/\s+/).filter(Boolean);
      const inBar = (message) => err(n, t('parser.inBar', { n: bar.index + 1, message }));
      if (toks.length !== m.beats) inBar(t('parser.gridCells', { count: toks.length, beats: m.beats }));
      toks.slice(0, m.beats).forEach((tok, beat) => {
        if (tok === '.') return;
        const name = chordName(tok);
        if (name) bar.chords.push({ at: beat * m.beatTicks, name });
        else inBar(t('parser.unknownChord', { name: clip(tok) }));
      });
      song.bars.push(bar);
    });
  });
  if (grid) err(grid, t('parser.gridUnclosed'));
}
