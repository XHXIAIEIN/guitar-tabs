import { pitchName, type ScoreBar } from '../score/model';
import type { DisplaySettings } from '../settings/display';
import type { BarLayout } from './layout';
import { t } from '../i18n';
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
    let left = lineStart - 18 * settings.scale;
    if (settings.left.pitch) { parts.push(text(left, y, pitchName(tuning[string - 1]), 'string-label')); left -= 20 * settings.scale; }
    if (settings.left.string) { parts.push(text(left, y, String(string), 'string-label')); left -= 20 * settings.scale; }
    if (settings.left.tab && string >= 2 && string <= 4) parts.push(text(left, y, 'TAB'[string - 2], 'string-label'));
    let right = lineEnd + 12;
    if (settings.right.string) { parts.push(text(right, y, String(string), 'string-label')); right += 20 * settings.scale; }
    if (settings.right.pitch) parts.push(text(right, y, pitchName(tuning[string - 1]), 'string-label'));
  }
  for (const x of [lineStart, lineEnd]) parts.push(`<line x1="${x}" x2="${x}" y1="${top}" y2="${top + gap * 5}"/>`);
  if (editing) for (const col of layout.columns) parts.push(`<line x1="${col.x}" x2="${col.x}" y1="${top - 10}" y2="${top + gap * 5 + 10}" class="beat-guide"/>`);
  if (selected && editing) {
    const x = layout.musicStart + selected.tick / layout.tickSpan * layout.musicWidth;
    const y = top + (selected.string - 1) * gap;
    parts.push(`<rect x="${x - size * .6}" y="${y - size * .55}" width="${size * 1.2}" height="${size * 1.1}" rx="3" class="selection"/>`);
  }
  for (const beat of bar.beats) {
    const x = layout.musicStart + beat.startTick / layout.tickSpan * layout.musicWidth;
    parts.push(`<rect data-playing-beat="${escapeHtml(beat.id)}" x="${x - size * .65}" y="${top - size * .55}" width="${size * 1.3}" height="${gap * 5 + size * 1.1}" rx="3" class="playhead"/>`);
    for (const note of beat.notes) {
      const y = top + (note.string - 1) * gap;
      const mask = (String(note.fret).length * .62 + .35) * size;
      const active = selected?.tick === beat.startTick && selected.string === note.string;
      parts.push(`<rect x="${x - mask / 2}" y="${y - size / 2}" width="${mask}" height="${size}" rx="3" class="note-mask${active ? ' selected-note' : ''}"/>`);
      parts.push(`<text x="${x}" y="${y}" class="fret" font-size="${size}" dominant-baseline="central" text-anchor="middle">${note.fret}</text>`);
      if (note.tie) parts.push(text(x, y + size * .6, '⌒', 'tie'));
    }
    if (!settings.showRhythm) {
      if (!beat.notes.length) parts.push(text(x, top + gap * 2.5, ({ 1: '𝄻', 2: '𝄼', 4: '𝄽', 8: '𝄾', 16: '𝄿', 32: '𝅀', 64: '𝅁' })[beat.duration], 'rest'));
      continue;
    }
    const rhythmY = top - 24 * settings.scale;
    const stemTop = rhythmY - 24 * settings.scale;
    if (!beat.notes.length) parts.push(text(x, rhythmY - 7, ({ 1: '𝄻', 2: '𝄼', 4: '𝄽', 8: '𝄾', 16: '𝄿', 32: '𝅀', 64: '𝅁' })[beat.duration], 'rest'));
    else {
      parts.push(`<ellipse cx="${x}" cy="${rhythmY}" rx="${5 * settings.scale}" ry="${3.3 * settings.scale}" transform="rotate(-18 ${x} ${rhythmY})" class="rhythm-head" fill="${beat.duration >= 4 ? '#222' : 'white'}"/>`);
      if (beat.duration !== 1) parts.push(`<line x1="${x + 4 * settings.scale}" x2="${x + 4 * settings.scale}" y1="${rhythmY}" y2="${stemTop}" class="rhythm"/>`);
      if (beat.duration >= 8) {
        const index = bar.beats.indexOf(beat);
        const next = bar.beats[index + 1];
        const previous = bar.beats[index - 1];
        const pairedNext = next?.duration === beat.duration && next.notes.length && Math.floor(next.startTick / 960) === Math.floor(beat.startTick / 960);
        const pairedPrevious = previous?.duration === beat.duration && previous.notes.length && Math.floor(previous.startTick / 960) === Math.floor(beat.startTick / 960);
        for (let flag = 0; flag < Math.log2(beat.duration / 4); flag++) {
          const flagY = stemTop + flag * 5 * settings.scale;
          if (pairedNext) {
            const nextX = layout.musicStart + next.startTick / layout.tickSpan * layout.musicWidth;
            parts.push(`<path d="M${x + 4 * settings.scale} ${flagY}H${nextX + 4 * settings.scale}" class="beam"/>`);
          } else if (!pairedPrevious) parts.push(`<path d="M${x + 4 * settings.scale} ${flagY}q9 5 7 13" class="rhythm" fill="none"/>`);
        }
      }
    }
    for (let d = 0; d < beat.dots; d++) parts.push(text(x + 9 + d * 5, rhythmY - 1, '·', 'rhythm-dot'));
  }
  return `<svg class="tab-bar" role="img" aria-label="${escapeHtml(t('position', { bar: index + 1, beat: 1, string: 1 }))}" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}">${parts.join('')}</svg>`;
}
