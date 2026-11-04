// Chord box: strings vertical (6th string on the left), nut on top, finger numbers inside the dots.
import { t } from '../core/i18n.js';
import { TUNING, mod12 } from '../music/pitch.js';
import { parseChord } from '../music/chord-name.js';
import { esc } from './svg.js';

/**
 * @param shape from chordShapes()
 * @param opts name: title above the box; chord: chord name whose root dots are highlighted
 */
export function chordDiagram(shape, { name = '', chord = name } = {}) {
  const left = 18;
  const sx = 15;
  const fy = 18;
  const top = name ? 24 : 4;
  const gridTop = top + 14;
  const span = Math.max(4, Math.max(...shape.frets) - shape.base + 1);
  const W = left + sx * 5 + 12;
  const H = gridTop + span * fy + 6;
  const root = parseChord(chord.replace(/^\(|\)$/g, ''))?.root;
  const isRoot = (string, fret) => root !== undefined && mod12(TUNING[string] + fret) === root;
  const xOf = (string) => left + (6 - string) * sx;
  const yOf = (fret) => gridTop + (fret - shape.base + 0.5) * fy;

  let out = `<svg class="chord-diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chords.diagramLabel', { name: name || chord }))}">`;
  if (name) out += `<text class="cd-name" x="${left + sx * 2.5}" y="17" text-anchor="middle">${esc(name)}</text>`;
  for (let i = 0; i <= span; i++) {
    const cls = i === 0 && shape.base === 1 ? 'cd-nut' : 'cd-fret';
    out += `<line class="${cls}" x1="${left}" y1="${gridTop + i * fy}" x2="${left + 5 * sx}" y2="${gridTop + i * fy}"/>`;
  }
  for (let k = 0; k < 6; k++) out += `<line class="cd-string" x1="${left + k * sx}" y1="${gridTop}" x2="${left + k * sx}" y2="${gridTop + span * fy}"/>`;
  if (shape.base > 1) out += `<text class="cd-base" x="${left - 5}" y="${gridTop + fy / 2 + 4}" text-anchor="end">${shape.base}</text>`;

  const b = shape.barre;
  if (b) {
    const x1 = xOf(b.from);
    const x2 = xOf(b.to);
    const y = yOf(b.fret);
    out += `<rect class="cd-barre" x="${x1 - 6.5}" y="${y - 6.5}" width="${x2 - x1 + 13}" height="13" rx="6.5"/>`;
    out += `<text class="cd-finger" x="${(x1 + x2) / 2}" y="${y + 3.4}" text-anchor="middle">1</text>`;
  }
  shape.frets.forEach((fret, i) => {
    const string = 6 - i;
    const x = xOf(string);
    const finger = shape.fingers[i];
    if (fret < 0) {
      out += `<path class="cd-mute" d="M${x - 3.5} ${gridTop - 11} l7 7 m0 -7 l-7 7"/>`;
    } else if (fret === 0) {
      out += `<circle class="cd-open${isRoot(string, 0) ? ' root' : ''}" cx="${x}" cy="${gridTop - 7.5}" r="3.8"/>`;
    } else if (!(b && fret === b.fret && finger === 1)) {
      const y = yOf(fret);
      out += `<circle class="cd-dot${isRoot(string, fret) ? ' root' : ''}" cx="${x}" cy="${y}" r="6.5"/>`;
      if (finger) out += `<text class="cd-finger" x="${x}" y="${y + 3.4}" text-anchor="middle">${finger}</text>`;
    }
  });
  return out + '</svg>';
}
