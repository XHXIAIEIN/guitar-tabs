// Marks that span several events of a bar: stems and beams, tuplets, 简谱 digits, and the string labels beside a staff.
import { numberOf } from '../../music/numbers.js';
import { midiOf } from '../../music/pitch.js';
import { dot, line, r1, text } from '../svg.js';
import { HEAD_RX, beam } from './glyphs.js';

// String label column widths before scaling
const LABEL_WIDTHS = { name: 12, number: 12, tab: 13 };
const LABEL_GAP = 3;
const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];

export function stemsAndBeams(bar, xs, g, s, groupOf) {
  let out = '';
  const top = g.stem;
  const ev = bar.events;
  // Stems stand on the right side of the head, and heads line up with the fret numbers below.
  const stemX = (i) => xs[i] + (HEAD_RX - 0.3) * s;
  ev.forEach((e, i) => {
    if (e.kind === 'rest' || e.base === 'w') return;
    out += line(stemX(i), g.head - 1 * s, stemX(i), top, 'stem');
  });
  const beamable = (e) => e && e.kind !== 'rest' && (e.base === 'e' || e.base === 's');
  for (let i = 0; i < ev.length; ) {
    if (!beamable(ev[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < ev.length && beamable(ev[j + 1]) && groupOf(ev[j + 1]) === groupOf(ev[i])) j++;
    if (j === i) {
      const flag = (y) => `<path class="flag" d="M${r1(stemX(i))} ${r1(y)} q${r1(5 * s)} ${r1(1.5 * s)} ${r1(6.5 * s)} ${r1(8 * s)}"/>`;
      out += flag(top) + (ev[i].base === 's' ? flag(top + 4.5 * s) : '');
    } else {
      out += beam(stemX(i), stemX(j), top + 2.6 * s, s);
      for (let k = i; k <= j; k++) {
        if (ev[k].base !== 's') continue;
        if (k < j && ev[k + 1].base === 's') out += beam(stemX(k), stemX(k + 1), top + 7.1 * s, s);
        else if (!(k > i && ev[k - 1].base === 's')) out += beam(stemX(k), stemX(k) + (k === j ? -6 : 6) * s, top + 7.1 * s, s);
      }
    }
    i = j + 1;
  }
  return out;
}

/** Labels each run of three tuplet notes with "3" at height `y`. */
export function tupletMarks(bar, xs, y) {
  let out = '';
  let run = [];
  const flush = () => {
    for (let k = 0; k + 2 < run.length; k += 3) out += text((xs[run[k]] + xs[run[k + 2]]) / 2, y, '3', 'tuplet');
    run = [];
  };
  bar.events.forEach((e, i) => (e.tuplet ? run.push(i) : flush()));
  flush();
  return out;
}

export function numberMarks(bar, xs, g, s, o, xAt, groupOf) {
  let out = '';
  const y = g.numbers;
  const under = (e) => (e.kind === 'strum' ? 0 : e.base === 'e' ? 1 : e.base === 's' ? 2 : 0);
  bar.events.forEach((e, i) => {
    if (e.kind === 'strum') return;
    const x = xs[i];
    let digit = '0';
    let acc = '';
    let oct = 0;
    if (e.kind === 'note') {
      const top = e.notes.filter((n) => n.f >= 0).sort((a, b) => a.s - b.s)[0];
      if (!top) return;
      ({ deg: digit, acc, oct } = numberOf(midiOf(top.s, top.f), o.tonic));
    }
    let mark = text(x, y, digit, 'number');
    if (acc) mark += text(x - 6.5 * s, y - 7 * s, acc, 'number-acc');
    for (let k = 0; k < oct; k++) mark += dot(x, y - 16 * s - k * 4.5 * s, 1.7 * s, 'number-dot');
    for (let k = 0; k < -oct; k++) mark += dot(x, y + 6.5 * s + under(e) * 3.5 * s + k * 4.5 * s, 1.7 * s, 'number-dot');
    out += `<g class="number-ev" data-number="${i}">${mark}</g>`;
    if (e.dur >= 96) {
      for (let t = 48; t < e.dur; t += 48) out += line(xAt(e.at + t) - 4.5 * s, y - 5.5 * s, xAt(e.at + t) + 4.5 * s, y - 5.5 * s, 'number-dash');
    } else if (e.dotted) out += dot(x + 7.5 * s, y - 5 * s, 1.6 * s, 'number-dot');
  });
  for (const level of [1, 2]) {
    const ly = y + 4 * s + (level - 1) * 3.5 * s;
    for (let i = 0; i < bar.events.length; ) {
      if (under(bar.events[i]) < level) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < bar.events.length && under(bar.events[j + 1]) >= level && groupOf(bar.events[j + 1]) === groupOf(bar.events[i])) j++;
      out += line(xs[i] - 5 * s, ly, xs[j] + 5 * s, ly, 'number-line');
      i = j + 1;
    }
  }
  return out + tupletMarks(bar, xs, y - 20 * s);
}

export const gutterWidth = (kind, s) => (kind === 'none' ? 0 : (LABEL_WIDTHS[kind] + LABEL_GAP) * s);

/** String labels beside the staff, one column away from `edge` in direction `dir` (-1 left, 1 right). */
export function stringLabelMarks(kind, edge, dir, g, s) {
  if (kind === 'none') return '';
  const cx = edge + dir * (LABEL_GAP + LABEL_WIDTHS[kind] / 2) * s;
  let out = '';
  if (kind === 'tab') [...'TAB'].forEach((c, i) => (out += text(cx, g.staff + (1.5 + i) * g.gap + 4 * s, c, 'str-tab')));
  else {
    for (let k = 0; k < 6; k++) out += text(cx, g.staff + k * g.gap + 3.6 * s, kind === 'number' ? k + 1 : STRING_NAMES[k], 'str-label');
  }
  return out;
}
