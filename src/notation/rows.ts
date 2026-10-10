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

export function layoutRows(bars: ScoreBar[], availableWidth: number, settings: DisplaySettings, editing = false, changed?: string[], snapTicks = 960): ScoreRowLayout[] {
  const width = Math.min(availableWidth, settings.beatsPerRow * 76 * settings.scale);
  const left = 8 + Object.values(settings.left).filter(Boolean).length * 20 * settings.scale;
  const right = 8 + Object.values(settings.right).filter(Boolean).length * 20 * settings.scale;
  const padding = Math.min(settings.noteSize * settings.scale * 1.6, (width - left - right) / settings.beatsPerRow);
  const nominalUnit = Math.max(1, (width - left - right - padding / 2) / settings.beatsPerRow);
  return groupBars(bars, settings.beatsPerRow).map(row => {
    const barIds = row.map(bar => bar.id);
    if (changed && !barIds.some(id => changed.includes(id))) return { barIds, layouts: [], width };
    const display = (index: number, noteSize: number): DisplaySettings => ({ ...settings, noteSize,
      left: index === 0 ? settings.left : { tab: false, string: false, pitch: false },
      right: index === row.length - 1 ? settings.right : { string: false, pitch: false }
    });
    const minimumUnit = (size: number) => Math.max(...row.map(bar => {
      const ticks = [...new Set([0, ...bar.beats.map(beat => beat.startTick), barTicks(bar)])].sort((a,b)=>a-b);
      const delta = Math.min(...ticks.slice(1).map((tick,index)=>tick-ticks[index]), editing ? snapTicks : Infinity);
      const clearance = Math.max(size * settings.scale * 1.65, padding / 2 + size * settings.scale * .8);
      return clearance * barTicks(bar) / delta / bar.meter[0];
    }));
    let noteSize = settings.noteSize;
    // Fit two-digit frets without reducing the string spacing.
    while (noteSize > 12 && minimumUnit(noteSize) > nominalUnit) noteSize--;
    const unit = Math.max(nominalUnit, minimumUnit(noteSize));
    return { barIds, width, layouts: row.map((bar, index) => {
      const local = display(index, noteSize);
      const base = layoutBar(bar, 0, local, editing);
      const lineStart = index === 0 ? left : 0;
      const lineEnd = lineStart + unit * bar.meter[0] + (index === 0 ? padding / 2 : 0);
      const musicStart = lineStart + (index === 0 ? padding : padding / 2);
      const musicWidth = unit * bar.meter[0];
      const tickSpan = barTicks(bar);
      return { ...base, width: lineEnd + (index === row.length - 1 ? right : 0),
        lineStart, lineEnd, musicStart, musicWidth, tickSpan, firstInRow: index === 0, settings: local,
        columns: base.columns.map(column => ({ ...column, x: musicStart + column.tick / tickSpan * musicWidth })) };
    }) };
  });
}
