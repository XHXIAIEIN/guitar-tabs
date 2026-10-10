import { barTicks, type ScoreBar } from '../score/model';
import type { DisplaySettings } from '../settings/display';
export interface BarLayout {
  barId: string;
  width: number;
  height: number;
  lineStart: number;
  lineEnd: number;
  top: number;
  gap: number;
  columns: { tick: number; x: number; beatId?: string }[];
}
export function layoutBar(bar: ScoreBar, availableWidth: number, settings: DisplaySettings): BarLayout {
  const size = settings.noteSize * settings.scale;
  const gap = settings.stringGap * settings.scale;
  const leftLabels = [settings.left.tab, settings.left.string, settings.left.pitch].filter(Boolean).length;
  const rightLabels = [settings.right.string, settings.right.pitch].filter(Boolean).length;
  const lineStart = 8 + leftLabels * 20 * settings.scale;
  const right = 8 + rightLabels * 20 * settings.scale;
  const padding = size * .8;
  const ticks = [...new Set([0, ...bar.beats.map(b => b.startTick), barTicks(bar)])].sort((a, b) => a - b);
  const minDelta = Math.min(...ticks.slice(1).map((t, i) => t - ticks[i]));
  const minWidth = (size * 1.7) * barTicks(bar) / minDelta;
  const musicWidth = Math.max(availableWidth - lineStart - right - 2 * padding, minWidth);
  const lineEnd = lineStart + padding * 2 + musicWidth;
  return { barId: bar.id, width: lineEnd + right, height: 42 + gap * 5 + 44 * settings.scale,
    lineStart, lineEnd, top: 34, gap,
    columns: ticks.slice(0, -1).map(tick => ({ tick, x: lineStart + padding + tick / barTicks(bar) * musicWidth,
      beatId: bar.beats.find(beat => beat.startTick === tick)?.id })) };
}
export function locate(layout: BarLayout, x: number, y: number): { barId: string; tick: number; string: number } {
  const nearest = layout.columns.reduce((a, b) => Math.abs(a.x - x) <= Math.abs(b.x - x) ? a : b);
  return { barId: layout.barId, tick: nearest.tick, string: Math.max(1, Math.min(6, Math.round((y - layout.top) / layout.gap) + 1)) };
}
