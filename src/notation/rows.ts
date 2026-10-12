import { barTicks, type ScoreBar } from '../score/model';
import type { DisplaySettings } from '../settings/display';
import { layoutBar, type BarLayout } from './layout';

export interface ScoreRowLayout { barIds: string[]; layouts: BarLayout[]; width: number }

export function groupBars(bars: ScoreBar[], beatsPerRow: number): ScoreBar[][] {
  const rows: ScoreBar[][] = [];
  let row: ScoreBar[] = [], beats = 0;
  for (const bar of bars) {
    if (row.length && beats + bar.meter[0] > beatsPerRow) {
      rows.push(row); row = []; beats = 0;
    }
    row.push(bar); beats += bar.meter[0];
  }
  if (row.length) rows.push(row);
  return rows;
}

export function layoutRows(bars: ScoreBar[], availableWidth: number, settings: DisplaySettings, editing = false, _changed?: string[], snapTicks = 960): ScoreRowLayout[] {
  const width = Math.min(availableWidth, settings.beatsPerRow * 76 * settings.scale);
  const left = 8 + Object.values(settings.left).filter(Boolean).length * 20 * settings.scale;
  const right = 8 + Object.values(settings.right).filter(Boolean).length * 20 * settings.scale;
  const size = settings.noteSize * settings.scale;
  const widestFret = Math.max(1, ...bars.flatMap(bar => bar.beats.flatMap(beat => beat.notes.map(note => String(note.fret).length))));
  const padding = Math.max((widestFret * .62 + .35) * size + 3 * settings.scale,
    Math.min(size * 1.6, (width - left - right) / settings.beatsPerRow));
  const requestedGroups = groupBars(bars, settings.beatsPerRow);
  const joins = Math.max(0, ...requestedGroups.map(row => row.length - 1));
  const joinSpace = Math.min(settings.noteSize * settings.scale * .6, padding * .4);
  const nominalUnit = Math.max(1, (width - left - right - padding / 2 - joins * joinSpace) / settings.beatsPerRow);
  const minimumUnit = Math.max(1, ...bars.map(bar => {
    const ticks = [...new Set([0, ...bar.beats.map(beat => beat.startTick), barTicks(bar)])].sort((a,b)=>a-b);
    const delta = Math.min(...ticks.slice(1).map((tick,index)=>tick-ticks[index]), editing ? snapTicks : Infinity);
    const digits = Math.max(1, ...bar.beats.flatMap(beat => beat.notes.map(note => String(note.fret).length)));
    const clearance = (digits * .62 + .35) * size + 3 * settings.scale;
    return clearance * barTicks(bar) / delta / bar.meter[0];
  }));
  let unit = Math.max(nominalUnit, minimumUnit);
  const groups: ScoreBar[][] = [];
  let group: ScoreBar[] = [], beats = 0;
  for (const bar of bars) {
    const nextBeats = beats + bar.meter[0];
    const needed = left + right + padding / 2 + nextBeats * unit + group.length * joinSpace;
    if (group.length && (nextBeats > settings.beatsPerRow || needed > width + .001)) {
      groups.push(group); group = []; beats = 0;
    }
    group.push(bar); beats += bar.meter[0];
  }
  if (group.length) groups.push(group);
  // Keep one musical scale across rows, including partial final rows.
  const capacity = minimumUnit > nominalUnit ? Math.max(1, ...groups.map(row => row.reduce((sum, bar) => sum + bar.meter[0], 0))) : settings.beatsPerRow;
  const rowJoins = Math.max(0, ...groups.map(row => row.length - 1));
  unit = Math.max(unit, (width - left - right - padding / 2 - rowJoins * joinSpace) / capacity);
  return groups.map(row => {
    const barIds = row.map(bar => bar.id);
    const display = (index: number): DisplaySettings => ({ ...settings,
      left: index === 0 ? settings.left : { tab: false, string: false, pitch: false },
      right: index === row.length - 1 ? settings.right : { string: false, pitch: false }
    });
    return { barIds, width, layouts: row.map((bar, index) => {
      const local = display(index);
      const base = layoutBar(bar, 0, local, editing);
      const lineStart = index === 0 ? left : 0;
      const before = index > 0 ? joinSpace / 2 : 0;
      const after = index < rowJoins ? joinSpace / 2 : 0;
      const lineEnd = lineStart + unit * bar.meter[0] + (index === 0 ? padding / 2 : 0) + before + after;
      const musicStart = lineStart + (index === 0 ? padding : padding / 2) + before;
      const musicWidth = unit * bar.meter[0];
      const tickSpan = barTicks(bar);
      return { ...base, width: lineEnd + (index === row.length - 1 ? right : 0),
        lineStart, lineEnd, musicStart, musicWidth, tickSpan, firstInRow: index === 0, settings: local,
        columns: base.columns.map(column => ({ ...column, x: musicStart + column.tick / tickSpan * musicWidth })) };
    }) };
  });
}
