// One bar of a score line as SVG markup.
import { line, r1, text } from '../svg.js';
import { chordText, noteHead, restGlyph, shownRest, slashMark, strumArrow, tieArc } from './glyphs.js';
import { numberMarks, stemsAndBeams, tupletMarks } from './marks.js';
import { PAD_L, PAD_R, textWidth } from './measure.js';

/**
 * Returns the bar's markup and the x of its last event. `f.tieFrom` is the x of the event before the bar on the same line,
 * where a tie into the bar's first event starts.
 */
export function renderBar(bar, bx, bw, f, m, o, g, F, isFirstInLine, isLast) {
  const s = o.scale;
  const h = g.height;
  let out = `<g class="bar" data-bar="${bar.index}">`;
  let lastX;
  out += `<rect class="bar-bg" x="${r1(bx)}" y="${r1(1 * s)}" width="${r1(bw)}" height="${r1(h - 2 * s)}" rx="${r1(6 * s)}"/>`;
  out += `<rect class="loop-mark" x="${r1(bx + 2 * s)}" y="0" width="${r1(bw - 4 * s)}" height="${r1(3 * s)}" rx="${r1(1.5 * s)}"/>`;
  out += `<rect class="cursor-mark" x="${r1(bx)}" y="${r1(3 * s)}" width="${r1(3 * s)}" height="${r1(h - 6 * s)}" rx="${r1(1.5 * s)}"/>`;
  if (o.barNumbers !== false) out += text(bx + 4 * s, g.barNo, bar.index + 1, 'bar-no', 'start');
  if (bar.time) out += text(bx + bw - 4 * s, g.barNo, bar.time.join('/'), 'bar-no bar-time', 'end');

  const inner0 = bx + PAD_L * s;
  const innerW = bw - (PAD_L + PAD_R) * s;
  // beams never cross a metric bar line, even inside one bar of the score
  const groupOf = (e) => {
    const at = bar.phase + e.at;
    return Math.floor(at / m.barTicks) * m.barTicks + Math.floor((at % m.barTicks) / m.groupTicks);
  };

  if (!bar.events.length) {
    const xOf = (tick) => inner0 + (tick / bar.ticks) * innerW;
    if (g.chord !== undefined) {
      if (bar.chords.length) for (const c of bar.chords) out += chordText(o.chordLabel(c.name), c.name, xOf(c.at), g.chord, 'chord chart');
      else if (bar.startChord) out += chordText(o.chordLabel(bar.startChord), bar.startChord, xOf(0), g.chord, 'chord chart dim');
    }
    if (g.beats !== undefined) {
      const beats = Math.round(bar.ticks / m.beatTicks);
      for (let k = 0; k < beats; k++) out += line(xOf(k * m.beatTicks) + 2 * s, g.beats, xOf(k * m.beatTicks) + 2 * s, g.beats + 5 * s, (bar.phase + k * m.beatTicks) % m.barTicks === 0 ? 'beat strong' : 'beat');
    }
    if (g.lyric !== undefined && bar.lyric) out += text(inner0, g.lyric, bar.lyric, 'lyr', 'start');
  } else {
    const xs = [];
    let x = inner0;
    bar.events.forEach((e, i) => {
      const w = f.slots[i] * f.k;
      const lw = o.show.lyrics && e.lyric ? textWidth(e.lyric, F.lyric) : 0;
      xs.push(x + Math.min(w / 2, Math.max(8 * s, lw / 2 + 2 * s)));
      x += w;
    });
    lastX = xs.at(-1);
    const xAt = (tick) => {
      for (let i = 0; i < bar.events.length; i++) {
        const e = bar.events[i];
        if (tick < e.at + e.dur) return xs[i] + ((tick - e.at) / e.dur) * ((xs[i + 1] ?? bx + bw - PAD_R * s / 2) - xs[i]);
      }
      return bx + bw;
    };
    // A syllable that ends in "-" goes on into the next one, so the hyphen stands alone midway in the gap, as in engraved lyrics.
    const syllable = (lyric) => lyric.replace(/-$/, '');
    const lyricMarks = (i, ex) => {
      const word = syllable(bar.events[i].lyric);
      let marks = text(ex, g.lyric, word, 'lyr');
      if (word !== bar.events[i].lyric) {
        const left = ex + textWidth(word, F.lyric) / 2;
        const next = bar.events[i + 1];
        const right = next ? xs[i + 1] - textWidth(syllable(next.lyric), F.lyric) / 2 : bx + bw;
        marks += text((left + right) / 2, g.lyric, '-', 'lyr');
      }
      return marks;
    };
    if (g.chord !== undefined) {
      for (const c of bar.chords) out += chordText(o.chordLabel(c.name), c.name, xAt(c.at) - 4 * s, g.chord, 'chord', 'start');
      if (isFirstInLine && bar.startChord && bar.chords[0]?.at !== 0) out += chordText(`(${o.chordLabel(bar.startChord)})`, bar.startChord, xs[0] - 4 * s, g.chord, 'chord dim', 'start');
    }
    if (g.staff !== undefined) {
      for (let k = 0; k < g.lines; k++) out += line(bx, g.staff + k * g.gap, bx + bw, g.staff + k * g.gap, `staff s${k + 1}`);
    }
    if (g.stem !== undefined) out += stemsAndBeams(bar, xs, g, s, groupOf) + tupletMarks(bar, xs, g.stem - 2 * s);
    if (g.numbers !== undefined) out += numberMarks(bar, xs, g, s, o, xAt, groupOf);
    bar.events.forEach((e, i) => {
      let ev = `<g class="ev" data-ev="${i}">`;
      const drawn = shownRest(e, bar, m);
      // A whole-bar rest alone in its bar stands in the middle of it.
      const ex = drawn === e || bar.events.length > 1 ? xs[i] : bx + bw / 2;
      if (o.notation === 'slash') ev += slashMark(drawn, ex, g, s);
      else if (g.staff !== undefined) {
        const mid = g.staff + 2.5 * g.gap;
        if (e.kind === 'note') for (const n of e.notes) ev += text(ex, g.staff + (n.s - 1) * g.gap + 4.4 * s, n.f < 0 ? '×' : n.tie ? `(${n.f})` : n.f, 'fret');
        // mid is halfway between lines 3 and 4: a whole rest drawn here hangs from line 3, and this offset sets a half rest on line 4.
        else if (e.kind === 'rest') ev += restGlyph(drawn, ex, mid + (drawn.base === 'h' ? 3.5 * s : 0), s);
        else if (e.dir === 'X') ev += line(ex - 4 * s, mid - 4 * s, ex + 4 * s, mid + 4 * s, 'slash x') + line(ex + 4 * s, mid - 4 * s, ex - 4 * s, mid + 4 * s, 'slash x');
        else ev += line(ex - 4 * s, mid + 7 * s, ex + 4 * s, mid - 7 * s, 'slash');
      } else if (g.head !== undefined && e.kind === 'rest') ev += restGlyph(drawn, ex, g.head - 8 * s, s);
      if (o.notation !== 'slash' && g.head !== undefined && e.kind !== 'rest') ev += noteHead(e, ex, g.head, s);
      // at the start of a line, a tie from the bar before starts at the bar line
      if (e.notes.some((n) => n.tie)) {
        const from = i ? xs[i - 1] : f.tieFrom ?? bx;
        if (g.head !== undefined && o.notation !== 'slash') ev += tieArc(from, ex, g.head + 5 * s, 1, s);
        if (g.numbers !== undefined) ev += tieArc(from, ex, g.numbers - 19 * s, -1, s);
      }
      // An X head already marks a muted strum on the slash staff
      if (g.strum !== undefined && e.kind === 'strum' && !(o.notation === 'slash' && e.dir === 'X')) ev += strumArrow(e.dir, ex, g.strum, s);
      if (g.lyric !== undefined && e.lyric) ev += lyricMarks(i, ex);
      out += ev + '</g>';
    });
  }

  const [y1, y2, cls] = g.staff !== undefined ? [g.staff, g.staff + (g.lines - 1) * g.gap, 'barline'] : [6 * s, h - 6 * s, 'barline faint'];
  if (isFirstInLine) out += line(bx, y1, bx, y2, cls);
  if (isLast) out += line(bx + bw - 4 * s, y1, bx + bw - 4 * s, y2, cls) + `<rect class="barline-end" x="${r1(bx + bw - 2.5 * s)}" y="${r1(y1)}" width="${r1(2.5 * s)}" height="${r1(y2 - y1)}"/>`;
  else out += line(bx + bw, y1, bx + bw, y2, cls);
  return { svg: out + '</g>', lastX };
}
