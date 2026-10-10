import type { ScoreBar } from '../score/model';
import type { DisplaySettings } from '../settings/display';
import { layoutBar, type BarLayout } from './layout';

export interface ScoreRowLayout { barIds: string[]; layouts: BarLayout[] }

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

export function layoutRows(bars: ScoreBar[], availableWidth: number, settings: DisplaySettings, editing = false, changed?: string[]): ScoreRowLayout[] {
  return groupBars(bars, settings.beatsPerRow).map(row => {
    const barIds = row.map(bar => bar.id);
    if (changed && !barIds.some(id => changed.includes(id))) return { barIds, layouts: [] };
    const width = Math.min(availableWidth, settings.beatsPerRow * 76 * settings.scale);
    const display = (index: number, noteSize: number): DisplaySettings => ({ ...settings, noteSize,
      left: index === 0 ? settings.left : { tab: false, string: false, pitch: false },
      right: index === row.length - 1 ? settings.right : { string: false, pitch: false }
    });
    const minimums = (size: number) => row.map((bar, index) => layoutBar(bar, 0, display(index, size), editing).width);
    let noteSize = settings.noteSize;
    // Fit two-digit frets without reducing the string spacing.
    while (noteSize > 12 && minimums(noteSize).reduce((sum, value) => sum + value, 0) > width) noteSize--;
    const minima = minimums(noteSize);
    const spare = Math.max(0, width - minima.reduce((sum, value) => sum + value, 0));
    const beats = row.reduce((sum, bar) => sum + bar.meter[0], 0);
    return { barIds, layouts: row.map((bar, index) => {
      const local = display(index, noteSize);
      return { ...layoutBar(bar, minima[index] + spare * bar.meter[0] / beats, local, editing), settings: local };
    }) };
  });
}
