// Single score symbols: rests, note heads, beams, slash heads, strum arrows and chord labels.
import { dot, esc, line, r1 } from '../svg.js';

export const HEAD_RX = 4;

function restShape(base, x, y, s) {
  const p = (d) => `<path class="rest" transform="translate(${r1(x)} ${r1(y)}) scale(${s})" d="${d}"/>`;
  if (base === 'w') return `<rect class="rest-block" x="${r1(x - 4.5 * s)}" y="${r1(y - 5.5 * s)}" width="${r1(9 * s)}" height="${r1(3.5 * s)}"/>`;
  if (base === 'h') return `<rect class="rest-block" x="${r1(x - 4.5 * s)}" y="${r1(y - 1.5 * s)}" width="${r1(9 * s)}" height="${r1(3.5 * s)}"/>`;
  if (base === 'q') return p('M-2 -9 L3 -3.5 L-1.5 0.5 L3 5.5 C-1.5 3.5 -3 6.5 0 9.5');
  const hook = 'M-3.5 -5.5 C-2 -2.5 1 -3 3 -5.5 L-1 6';
  return base === 'e' ? p(hook) + dot(x - 2.6 * s, y - 5.2 * s, 1.6 * s, 'rest-dot') : p(hook) + p('M-4.5 -0.5 C-3 2.5 0 2 2 -0.5') + dot(x - 2.6 * s, y - 5.2 * s, 1.6 * s, 'rest-dot') + dot(x - 3.6 * s, y - 0.2 * s, 1.6 * s, 'rest-dot');
}

/** The event to draw: a rest that fills its bar is written as a whole rest in every meter, without a dot. */
export const shownRest = (e, barTicks) => (e.kind === 'rest' && e.dur === barTicks ? { ...e, base: 'w', dotted: false } : e);

export const restGlyph = (e, x, y, s) => restShape(e.base, x, y, s) + (e.dotted ? dot(x + 7 * s, y - s, 1.4 * s, 'rest-dot') : '');

export const beam = (x1, x2, y, s) => `<rect class="beam" x="${r1(Math.min(x1, x2) - 0.7 * s)}" y="${r1(y - 2.6 * s)}" width="${r1(Math.abs(x2 - x1) + 1.4 * s)}" height="${r1(2.6 * s)}"/>`;

export function noteHead(e, x, y, s) {
  const hollow = e.base === 'h' || e.base === 'w';
  const head = `<ellipse class="head${hollow ? ' hollow' : ''}" cx="${r1(x)}" cy="${r1(y)}" rx="${r1(HEAD_RX * s)}" ry="${r1(2.9 * s)}" transform="rotate(-20 ${r1(x)} ${r1(y)})"/>`;
  return e.dotted ? head + dot(x + 8 * s, y, 1.4 * s) : head;
}

/** A strum as a slash notehead, or a rest, around the middle line of the five-line staff. */
export function slashMark(e, x, g, s) {
  const mid = g.staff + 2 * g.gap;
  if (e.kind === 'rest') return restGlyph(e, x, mid + ({ w: -2.5, h: -2 }[e.base] ?? 0) * s, s);
  let head;
  if (e.dir === 'X') head = line(x - 4 * s, mid + 7 * s, x + 4 * s, mid - 7 * s, 'slash x') + line(x + 4 * s, mid + 7 * s, x - 4 * s, mid - 7 * s, 'slash x');
  else if (e.base === 'h' || e.base === 'w') {
    head = `<path class="slash hollow" d="M${r1(x - 6.3 * s)} ${r1(mid + 7 * s)} L${r1(x - 2.3 * s)} ${r1(mid + 7 * s)} L${r1(x + 3.7 * s)} ${r1(mid - 7 * s)} L${r1(x - 0.3 * s)} ${r1(mid - 7 * s)} Z"/>`;
  } else head = line(x - 4 * s, mid + 7 * s, x + 4 * s, mid - 7 * s, 'slash');
  return e.dotted ? head + dot(x + 8 * s, mid - 4 * s, 1.4 * s) : head;
}

export function strumArrow(dir, x, y, s) {
  if (dir === 'X') return line(x - 3.5 * s, y + 3 * s, x + 3.5 * s, y + 10 * s, 'arrow') + line(x + 3.5 * s, y + 3 * s, x - 3.5 * s, y + 10 * s, 'arrow');
  const [tip, tail] = dir === 'D' ? [y + 13 * s, y] : [y, y + 13 * s];
  const back = dir === 'D' ? -5 * s : 5 * s;
  return line(x, tail, x, tip, 'arrow') + `<path class="arrow" d="M${r1(x - 3.5 * s)} ${r1(tip + back)} L${r1(x)} ${r1(tip)} L${r1(x + 3.5 * s)} ${r1(tip + back)}"/>`;
}

export function chordText(label, name, x, y, cls, anchor = 'start') {
  return `<text class="${cls}" data-chord="${esc(name)}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}">${esc(label)}</text>`;
}
