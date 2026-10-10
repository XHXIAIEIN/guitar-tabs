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
  musicStart: number;
  musicWidth: number;
  totalTicks: number;
  tickSpan: number;
  columns: { tick: number; x: number; beatId?: string }[];
}
export function layoutBar(bar: ScoreBar, availableWidth: number, settings: DisplaySettings, editing = false): BarLayout {
  const size = settings.noteSize * settings.scale;
  const gap = settings.stringGap * settings.scale;
  const leftLabels = [settings.left.tab, settings.left.string, settings.left.pitch].filter(Boolean).length;
  const rightLabels = [settings.right.string, settings.right.pitch].filter(Boolean).length;
  const lineStart = 8 + leftLabels * 20 * settings.scale;
  const right = 8 + rightLabels * 20 * settings.scale;
  const leftPadding = size * 1.2;
  const rightPadding = size * .8;
  const ticks = [...new Set([0, ...bar.beats.map(b => b.startTick), barTicks(bar)])].sort((a, b) => a - b);
  const minDelta = Math.min(...ticks.slice(1).map((t, i) => t - ticks[i]));
  const lastTick = bar.beats.at(-1)?.startTick ?? 0;
  const tickSpan = editing ? Math.max(lastTick, barTicks(bar) - 240) : lastTick || barTicks(bar);
  const minWidth = (size * 1.65) * tickSpan / minDelta;
  const musicWidth = Math.max(availableWidth - lineStart - right - leftPadding - rightPadding, minWidth);
  const lineEnd = lineStart + leftPadding + rightPadding + musicWidth;
  const top = settings.showRhythm ? 60 : 30;
  return { barId: bar.id, width: lineEnd + right, height: top + gap * 5 + 26 * settings.scale,
    lineStart, lineEnd, top, gap, musicStart: lineStart + leftPadding, musicWidth, totalTicks: barTicks(bar), tickSpan,
    columns: ticks.slice(0, -1).map(tick => ({ tick, x: lineStart + leftPadding + tick / tickSpan * musicWidth,
      beatId: bar.beats.find(beat => beat.startTick === tick)?.id })) };
}
export function locate(layout: BarLayout, x: number, y: number, snapTicks?: number): { barId: string; tick: number; string: number } {
  const nearest = layout.columns.reduce((a, b) => Math.abs(a.x - x) <= Math.abs(b.x - x) ? a : b);
  const tick = snapTicks ? Math.max(0, Math.min(layout.totalTicks - snapTicks, Math.round((x - layout.musicStart) / layout.musicWidth * layout.tickSpan / snapTicks) * snapTicks)) : nearest.tick;
  return { barId: layout.barId, tick, string: Math.max(1, Math.min(6, Math.round((y - layout.top) / layout.gap) + 1)) };
}
