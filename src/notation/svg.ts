import { pitchName, type ScoreBar } from '../score/model';
import type { DisplaySettings } from '../settings/display';
import type { BarLayout } from './layout';
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export function renderBar(bar: ScoreBar, layout: BarLayout, tuning: number[], settings: DisplaySettings, index: number, editing = false, selected?: { tick: number; string: number }): string {
  const parts: string[] = [];
  const { lineStart, lineEnd, top, gap } = layout;
  const size = settings.noteSize * settings.scale;
  const text = (x: number, y: number, value: string, cls: string) => `<text x="${x}" y="${y}" class="${cls}" dominant-baseline="central" text-anchor="middle">${escapeHtml(value)}</text>`;
  parts.push(text(lineStart + 2, 12, String(index + 1).padStart(2, '0'), 'bar-number'));
  for (let string = 1; string <= 6; string++) {
    const y = top + (string - 1) * gap;
    const weight = settings.lineWeight === 'graded' ? .65 + (string - 1) * .15 : .8;
    parts.push(`<line x1="${lineStart}" x2="${lineEnd}" y1="${y}" y2="${y}" stroke-width="${weight * settings.scale}"/>`);
    let left = lineStart - 11;
    if (settings.left.pitch) { parts.push(text(left, y, pitchName(tuning[string - 1]), 'string-label')); left -= 20 * settings.scale; }
    if (settings.left.string) { parts.push(text(left, y, String(string), 'string-label')); left -= 20 * settings.scale; }
    if (settings.left.tab && string >= 2 && string <= 4) parts.push(text(left, y, 'TAB'[string - 2], 'string-label'));
    let right = lineEnd + 12;
    if (settings.right.string) { parts.push(text(right, y, String(string), 'string-label')); right += 20 * settings.scale; }
    if (settings.right.pitch) parts.push(text(right, y, pitchName(tuning[string - 1]), 'string-label'));
  }
  for (const x of [lineStart, lineEnd]) parts.push(`<line x1="${x}" x2="${x}" y1="${top}" y2="${top + gap * 5}"/>`);
  if (editing) for (const col of layout.columns) parts.push(`<line x1="${col.x}" x2="${col.x}" y1="${top - 10}" y2="${top + gap * 5 + 10}" class="beat-guide"/>`);
  for (const beat of bar.beats) {
    const x = layout.columns.find(col => col.beatId === beat.id)!.x;
    for (const note of beat.notes) {
      const y = top + (note.string - 1) * gap;
      const mask = (String(note.fret).length * .62 + .35) * size;
      const active = selected?.tick === beat.startTick && selected.string === note.string;
      parts.push(`<rect x="${x - mask / 2}" y="${y - size / 2}" width="${mask}" height="${size}" rx="3" class="note-mask${active ? ' selected-note' : ''}"/>`);
      parts.push(`<text x="${x}" y="${y}" class="fret" font-size="${size}" dominant-baseline="central" text-anchor="middle">${note.fret}</text>`);
      if (note.tie) parts.push(text(x, y + size * .6, '⌒', 'tie'));
    }
    const rhythmY = top + gap * 5 + 12;
    if (!beat.notes.length) parts.push(text(x, rhythmY + 8, '𝄽', 'rest'));
    else {
      parts.push(`<line x1="${x}" x2="${x}" y1="${rhythmY}" y2="${rhythmY + 17}" class="rhythm"/>`);
      if (beat.duration >= 8) for (let flag = 0; flag < Math.log2(beat.duration / 4); flag++) parts.push(`<path d="M${x} ${rhythmY + 17 - flag * 4}q9 -2 8 -8" class="rhythm" fill="none"/>`);
      if (beat.duration <= 2) parts.push(`<ellipse cx="${x}" cy="${rhythmY}" rx="4" ry="2.3" fill="var(--paper)" class="rhythm"/>`);
    }
    for (let d = 0; d < beat.dots; d++) parts.push(text(x + 8 + d * 5, rhythmY + 13, '·', 'rhythm-dot'));
  }
  return `<svg class="tab-bar" role="img" aria-label="第 ${index + 1} 小节六弦谱" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}">${parts.join('')}</svg>`;
}
