// SVG score: chord names, 简谱, strum arrows, TAB staff with rhythm stems, lyrics.
// Lines break at section headings and otherwise hold a whole phrase (1, 2, 4 or 8 bars).
import { jianpu, midiOf } from '../music/theory.js';

const PAD_L = 12;
const PAD_R = 8;
// String label columns from the staff outwards, with widths before scaling
const LABEL_COLUMNS = [['name', 12], ['number', 12], ['tab', 13]];
const LABEL_GAP = 3;
const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const r1 = (n) => Math.round(n * 10) / 10;

let measureCtx;
function textWidth(text, font) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

const line = (x1, y1, x2, y2, cls) => `<line class="${cls}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"/>`;
const text = (x, y, t, cls, anchor = 'middle') => `<text class="${cls}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}">${esc(t)}</text>`;
const dot = (x, y, r, cls = 'dot') => `<circle class="${cls}" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/>`;

/** Relative x of `tick` when each event occupies its slot width, without padding. */
function slotX(bar, slots, tick) {
  let x = 0;
  for (let i = 0; i < bar.events.length; i++) {
    const e = bar.events[i];
    if (tick < e.at + e.dur) return x + ((tick - e.at) / e.dur) * slots[i];
    x += slots[i];
  }
  return x;
}

function measureBar(bar, song, o, F) {
  const s = o.scale;
  if (!bar.events.length) {
    const chordW = bar.chords.reduce((w, c) => w + textWidth(o.chordLabel(c.name), F.chartChord) + 14 * s, 0);
    const lyricW = o.show.lyrics && bar.lyric ? textWidth(bar.lyric, F.chartLyric) + 12 * s : 0;
    const beatW = (bar.ticks / song.meter.beatTicks) * (o.compact ? 14 : 22) * s;
    return { natural: (PAD_L + PAD_R) * s + Math.max(beatW, chordW, lyricW, 36 * s), slots: null };
  }
  const k = o.compact ? 0.5 : 1;
  const slots = bar.events.map((e) => {
    const lw = o.show.lyrics && e.lyric ? textWidth(e.lyric, F.lyric) + 6 * s : 0;
    return Math.max((12 + 20 * Math.sqrt(e.dur / 48)) * s * k, lw, (o.compact ? 10 : 18) * s);
  });
  if (o.show.chords) {
    // A chord name must end before the next change starts: widen the slot just before the change.
    for (let i = 1; i < bar.chords.length; i++) {
      const need = textWidth(o.chordLabel(bar.chords[i - 1].name), F.chord) + 10 * s;
      const have = slotX(bar, slots, bar.chords[i].at) - slotX(bar, slots, bar.chords[i - 1].at);
      if (have < need) {
        const j = bar.events.findLastIndex((e) => e.at < bar.chords[i].at);
        slots[Math.max(0, j)] += need - have;
      }
    }
  }
  return { natural: (PAD_L + PAD_R) * s + slots.reduce((a, b) => a + b, 0), slots };
}

function breakLines(song, metrics, avail) {
  const lines = [];
  const bars = song.bars;
  let i = 0;
  while (i < bars.length) {
    const section = bars[i].section;
    let end = i;
    while (end < bars.length && bars[end].section === section) end++;
    // Every line of a section holds the same phrase length, so phrases line up from one line to the next.
    const pickup = bars[i].pickup ? 1 : 0;
    const split = (per) => {
      const out = [];
      for (let a = i; a < end; a += out[out.length - 1].count) {
        out.push({ start: a, count: Math.min(end, a + per + (a === i ? pickup : 0)) - a, sectionStart: a === i });
      }
      return out;
    };
    const fits = (ln) => ln.count === 1 || metrics.slice(ln.start, ln.start + ln.count).reduce((w, b) => w + b.natural, 0) <= avail;
    let per = 8;
    while (per > 1 && !split(per).every(fits)) per /= 2;
    lines.push(...split(per));
    i = end;
  }
  return lines;
}

function lineGeometry(bars, o) {
  const s = o.scale;
  const notes = bars.some((b) => b.events.length);
  const has = (fn) => bars.some((b) => b.events.some(fn));
  const g = { notes };
  let y = 4 * s;
  g.barNo = y + 7 * s;
  if (o.show.chords && bars.some((b) => b.chords.length || b.startChord)) {
    g.chord = y + (notes ? 22 : 25) * s;
    y += (notes ? 28 : 33) * s;
  } else y += 12 * s;
  if (notes) {
    if (o.show.jianpu && has((e) => e.kind === 'note')) {
      g.jianpu = y + 22 * s;
      y += 46 * s;
    }
    if (o.show.tab && has((e) => e.kind === 'strum')) {
      g.strum = y + 1 * s;
      y += 17 * s;
    }
    if (o.show.tab) {
      g.gap = 11 * s;
      g.staff = y + 6 * s;
      const staffEnd = g.staff + 5 * g.gap;
      if (o.show.rhythm) {
        g.stem = staffEnd + 5 * s;
        y = g.stem + 27 * s;
      } else y = staffEnd + 10 * s;
    }
  } else {
    g.beats = y + 1 * s;
    y += 12 * s;
  }
  if (o.show.lyrics && bars.some((b) => b.lyric || b.events.some((e) => e.lyric))) {
    g.lyric = y + 16 * s;
    y += 27 * s;
  }
  g.height = y + 6 * s;
  return g;
}

function restGlyph(base, x, y, s) {
  const p = (d) => `<path class="rest" transform="translate(${r1(x)} ${r1(y)}) scale(${s})" d="${d}"/>`;
  if (base === 'w') return `<rect class="rest-block" x="${r1(x - 4.5 * s)}" y="${r1(y - 5.5 * s)}" width="${r1(9 * s)}" height="${r1(3.5 * s)}"/>`;
  if (base === 'h') return `<rect class="rest-block" x="${r1(x - 4.5 * s)}" y="${r1(y - 1.5 * s)}" width="${r1(9 * s)}" height="${r1(3.5 * s)}"/>`;
  if (base === 'q') return p('M-2 -9 L3 -3.5 L-1.5 0.5 L3 5.5 C-1.5 3.5 -3 6.5 0 9.5');
  const hook = 'M-3.5 -5.5 C-2 -2.5 1 -3 3 -5.5 L-1 6';
  return base === 'e' ? p(hook) + dot(x - 2.6 * s, y - 5.2 * s, 1.6 * s, 'rest-dot') : p(hook) + p('M-4.5 -0.5 C-3 2.5 0 2 2 -0.5') + dot(x - 2.6 * s, y - 5.2 * s, 1.6 * s, 'rest-dot') + dot(x - 3.6 * s, y - 0.2 * s, 1.6 * s, 'rest-dot');
}

const beam = (x1, x2, y, s) => `<rect class="beam" x="${r1(Math.min(x1, x2) - 0.7 * s)}" y="${r1(y - 2.6 * s)}" width="${r1(Math.abs(x2 - x1) + 1.4 * s)}" height="${r1(2.6 * s)}"/>`;

function stemsAndBeams(bar, xs, g, s, groupOf) {
  let out = '';
  const top = g.stem;
  const bottom = g.stem + 20 * s;
  const ev = bar.events;
  ev.forEach((e, i) => {
    if (e.kind === 'rest' || e.base === 'w') return;
    out += line(xs[i], e.base === 'h' ? top + 9 * s : top, xs[i], bottom, 'stem');
    if (e.dotted) out += dot(xs[i] + 4.5 * s, bottom - 3 * s, 1.4 * s);
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
      const flag = (y) => `<path class="flag" d="M${r1(xs[i])} ${r1(y)} q${r1(5 * s)} ${r1(-1.5 * s)} ${r1(6.5 * s)} ${r1(-8 * s)}"/>`;
      out += flag(bottom) + (ev[i].base === 's' ? flag(bottom - 4.5 * s) : '');
    } else {
      out += beam(xs[i], xs[j], bottom, s);
      for (let k = i; k <= j; k++) {
        if (ev[k].base !== 's') continue;
        if (k < j && ev[k + 1].base === 's') out += beam(xs[k], xs[k + 1], bottom - 4.5 * s, s);
        else if (!(k > i && ev[k - 1].base === 's')) out += beam(xs[k], xs[k] + (k === j ? -6 : 6) * s, bottom - 4.5 * s, s);
      }
    }
    i = j + 1;
  }
  return out;
}

/** Labels each run of three tuplet notes with "3" at height `y`. */
function tupletMarks(bar, xs, y, s) {
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

function jianpuMarks(bar, xs, g, s, o, xAt, groupOf) {
  let out = '';
  const y = g.jianpu;
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
      ({ deg: digit, acc, oct } = jianpu(midiOf(top.s, top.f), o.tonic));
    }
    let mark = text(x, y, digit, 'jp');
    if (acc) mark += text(x - 6.5 * s, y - 7 * s, acc, 'jp-acc');
    for (let k = 0; k < oct; k++) mark += dot(x, y - 16 * s - k * 4.5 * s, 1.7 * s, 'jp-dot');
    for (let k = 0; k < -oct; k++) mark += dot(x, y + 6.5 * s + under(e) * 3.5 * s + k * 4.5 * s, 1.7 * s, 'jp-dot');
    out += `<g class="jp-ev" data-jp="${i}">${mark}</g>`;
    if (e.dur >= 96) {
      for (let t = 48; t < e.dur; t += 48) out += line(xAt(e.at + t) - 4.5 * s, y - 5.5 * s, xAt(e.at + t) + 4.5 * s, y - 5.5 * s, 'jp-dash');
    } else if (e.dotted) out += dot(x + 7.5 * s, y - 5 * s, 1.6 * s, 'jp-dot');
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
      out += line(xs[i] - 5 * s, ly, xs[j] + 5 * s, ly, 'jp-line');
      i = j + 1;
    }
  }
  return out + tupletMarks(bar, xs, y - 20 * s, s);
}

function strumArrow(dir, x, y, s) {
  if (dir === 'X') return line(x - 3.5 * s, y + 3 * s, x + 3.5 * s, y + 10 * s, 'arrow') + line(x + 3.5 * s, y + 3 * s, x - 3.5 * s, y + 10 * s, 'arrow');
  const [tip, tail] = dir === 'D' ? [y + 13 * s, y] : [y, y + 13 * s];
  const back = dir === 'D' ? -5 * s : 5 * s;
  return line(x, tail, x, tip, 'arrow') + `<path class="arrow" d="M${r1(x - 3.5 * s)} ${r1(tip + back)} L${r1(x)} ${r1(tip)} L${r1(x + 3.5 * s)} ${r1(tip + back)}"/>`;
}

function renderBar(bar, bx, bw, f, m, song, o, g, F, isFirstInLine, isLast) {
  const s = o.scale;
  const h = g.height;
  let out = `<g class="bar" data-bar="${bar.index}">`;
  out += `<rect class="bar-bg" x="${r1(bx)}" y="${r1(1 * s)}" width="${r1(bw)}" height="${r1(h - 2 * s)}" rx="${r1(6 * s)}"/>`;
  out += `<rect class="loop-mark" x="${r1(bx + 2 * s)}" y="0" width="${r1(bw - 4 * s)}" height="${r1(3 * s)}" rx="${r1(1.5 * s)}"/>`;
  out += `<rect class="cursor-mark" x="${r1(bx)}" y="${r1(3 * s)}" width="${r1(3 * s)}" height="${r1(h - 6 * s)}" rx="${r1(1.5 * s)}"/>`;
  if (o.barNumbers !== false) out += text(bx + 4 * s, g.barNo, bar.index + 1, 'bar-no', 'start');

  const inner0 = bx + PAD_L * s;
  const innerW = bw - (PAD_L + PAD_R) * s;
  const offset = bar.pickup ? m.barTicks - bar.ticks : 0;
  const groupOf = (e) => Math.floor((e.at + offset) / m.groupTicks);

  if (!bar.events.length) {
    const xOf = (tick) => inner0 + (tick / bar.ticks) * innerW;
    if (g.chord !== undefined) {
      if (bar.chords.length) for (const c of bar.chords) out += chordText(o.chordLabel(c.name), c.name, xOf(c.at), g.chord, 'chord chart');
      else if (bar.startChord) out += chordText(o.chordLabel(bar.startChord), bar.startChord, xOf(0), g.chord, 'chord chart dim');
    }
    if (g.beats !== undefined) {
      const beats = Math.round(bar.ticks / m.beatTicks);
      for (let k = 0; k < beats; k++) out += line(xOf(k * m.beatTicks) + 2 * s, g.beats, xOf(k * m.beatTicks) + 2 * s, g.beats + 5 * s, k + (offset / m.beatTicks) === 0 ? 'beat strong' : 'beat');
    }
    if (g.lyric !== undefined && bar.lyric) out += text(inner0, g.lyric, bar.lyric, 'lyr chart', 'start');
  } else {
    const xs = [];
    const starts = [];
    let x = inner0;
    bar.events.forEach((e, i) => {
      const w = f.slots[i] * f.k;
      const lw = o.show.lyrics && e.lyric ? textWidth(e.lyric, F.lyric) : 0;
      starts.push(x);
      xs.push(x + Math.min(w / 2, Math.max(8 * s, lw / 2 + 2 * s)));
      x += w;
    });
    const xAt = (tick) => {
      for (let i = 0; i < bar.events.length; i++) {
        const e = bar.events[i];
        if (tick < e.at + e.dur) return xs[i] + ((tick - e.at) / e.dur) * ((xs[i + 1] ?? bx + bw - PAD_R * s / 2) - xs[i]);
      }
      return bx + bw;
    };
    if (g.chord !== undefined) {
      for (const c of bar.chords) out += chordText(o.chordLabel(c.name), c.name, xAt(c.at) - 4 * s, g.chord, 'chord', 'start');
      if (isFirstInLine && bar.startChord && bar.chords[0]?.at !== 0) out += chordText(`(${o.chordLabel(bar.startChord)})`, bar.startChord, xs[0] - 4 * s, g.chord, 'chord dim', 'start');
    }
    if (g.staff !== undefined) {
      for (let k = 0; k < 6; k++) out += line(bx, g.staff + k * g.gap, bx + bw, g.staff + k * g.gap, `staff s${k + 1}`);
      if (g.stem !== undefined) out += stemsAndBeams(bar, xs, g, s, groupOf) + tupletMarks(bar, xs, g.stem + 30 * s, s);
    }
    if (g.jianpu !== undefined) out += jianpuMarks(bar, xs, g, s, o, xAt, groupOf);
    bar.events.forEach((e, i) => {
      let ev = `<g class="ev" data-ev="${i}">`;
      const ex = xs[i];
      if (g.staff !== undefined) {
        const mid = g.staff + 2.5 * g.gap;
        if (e.kind === 'note') for (const n of e.notes) ev += text(ex, g.staff + (n.s - 1) * g.gap + 4.4 * s, n.f < 0 ? '×' : n.f, 'fret');
        else if (e.kind === 'rest') ev += restGlyph(e.base, ex, mid, s);
        else if (e.dir === 'X') ev += line(ex - 4 * s, mid - 4 * s, ex + 4 * s, mid + 4 * s, 'slash x') + line(ex + 4 * s, mid - 4 * s, ex - 4 * s, mid + 4 * s, 'slash x');
        else ev += line(ex - 4 * s, mid + 7 * s, ex + 4 * s, mid - 7 * s, 'slash');
      }
      if (g.strum !== undefined && e.kind === 'strum') ev += strumArrow(e.dir, ex, g.strum, s);
      if (g.lyric !== undefined && e.lyric) ev += text(ex, g.lyric, e.lyric, 'lyr');
      out += ev + '</g>';
    });
  }

  const [y1, y2, cls] = g.staff !== undefined ? [g.staff, g.staff + 5 * g.gap, 'barline'] : [6 * s, h - 6 * s, 'barline faint'];
  if (isFirstInLine) out += line(bx, y1, bx, y2, cls);
  if (isLast) out += line(bx + bw - 4 * s, y1, bx + bw - 4 * s, y2, cls) + `<rect class="barline-end" x="${r1(bx + bw - 2.5 * s)}" y="${r1(y1)}" width="${r1(2.5 * s)}" height="${r1(y2 - y1)}"/>`;
  else out += line(bx + bw, y1, bx + bw, y2, cls);
  return out + '</g>';
}

function chordText(label, name, x, y, cls, anchor = 'start') {
  return `<text class="${cls}" data-chord="${esc(name)}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}">${esc(label)}</text>`;
}

const gutterWidth = (kinds, s) => {
  const w = LABEL_COLUMNS.reduce((sum, [kind, cw]) => sum + (kinds.includes(kind) ? cw : 0), 0);
  return w ? (w + LABEL_GAP) * s : 0;
};

/** String labels beside the staff, starting at `edge` and going outwards in direction `dir` (-1 left, 1 right). */
function stringLabelMarks(kinds, edge, dir, g, s) {
  let out = '';
  let x = edge + dir * LABEL_GAP * s;
  for (const [kind, w] of LABEL_COLUMNS) {
    if (!kinds.includes(kind)) continue;
    const cx = x + (dir * w * s) / 2;
    if (kind === 'tab') [...'TAB'].forEach((c, i) => (out += text(cx, g.staff + (1.5 + i) * g.gap + 4 * s, c, 'str-tab')));
    else {
      for (let k = 0; k < 6; k++) out += text(cx, g.staff + k * g.gap + 3.6 * s, kind === 'number' ? k + 1 : STRING_NAMES[k], 'str-label');
    }
    x += dir * w * s;
  }
  return out;
}

/**
 * Renders `song` into `root` and returns a handle that moves highlights without re-rendering.
 * @param {object} o width, scale, show {tab, jianpu, rhythm, lyrics, chords}, chordLabel(name), tonic, compact, barNumbers,
 *   stringLabels {left, right} lists of 'tab' | 'number' | 'name', stringWidth 'uniform' | 'real'
 */
export function renderScore(root, song, o) {
  const s = o.scale;
  const fam = getComputedStyle(root).getPropertyValue('--score-font').trim() || 'sans-serif';
  const F = {
    chord: `600 ${15 * s}px ${fam}`,
    lyric: `400 ${15 * s}px ${fam}`,
    chartChord: `700 ${18 * s}px ${fam}`,
    chartLyric: `400 ${16 * s}px ${fam}`,
  };
  const m = song.meter;
  const labels = o.show.tab && song.bars.some((b) => b.events.length) ? o.stringLabels ?? { left: [], right: [] } : { left: [], right: [] };
  const gutterL = gutterWidth(labels.left, s);
  const avail = o.width - gutterL - gutterWidth(labels.right, s);
  const metrics = song.bars.map((b) => measureBar(b, song, o, F));
  const lines = breakLines(song, metrics, avail);

  let html = '';
  let prevK = null;
  lines.forEach((ln, li) => {
    const bars = song.bars.slice(ln.start, ln.start + ln.count);
    const natural = bars.reduce((a, b) => a + metrics[b.index].natural, 0);
    let k = avail / natural;
    const next = lines[li + 1];
    const lastOfSection = !next || next.sectionStart;
    // A short last line keeps the bar widths of the line above instead of stretching across the page.
    if (lastOfSection && li > 0 && !ln.sectionStart && ln.count < lines[li - 1].count) k = Math.min(k, prevK);
    else if (lastOfSection && ln.sectionStart && natural < avail * 0.6) k = Math.min(k, 1.6);
    prevK = k;
    const g = lineGeometry(bars, o);
    let x = gutterL;
    let svg = '';
    bars.forEach((bar, i) => {
      const bw = metrics[bar.index].natural * k;
      svg += renderBar(bar, x, bw, { slots: metrics[bar.index].slots, k }, m, song, o, g, F, i === 0, bar.index === song.bars.length - 1);
      x += bw;
    });
    if (g.staff !== undefined) svg += stringLabelMarks(labels.left, gutterL, -1, g, s) + stringLabelMarks(labels.right, x, 1, g, s);
    const name = ln.sectionStart ? song.sections[bars[0].section]?.name : '';
    const cls = 'sys-svg' + (o.stringWidth === 'real' ? ' real-strings' : '');
    html += `<div class="sys" data-line="${li}">${name ? `<div class="sec-label">${esc(name)}</div>` : ''}<svg class="${cls}" style="--s:${s}" width="${r1(o.width)}" height="${r1(g.height)}" viewBox="0 0 ${r1(o.width)} ${r1(g.height)}">${svg}</svg></div>`;
  });
  root.innerHTML = html;

  const barEls = new Map([...root.querySelectorAll('g.bar')].map((el) => [+el.dataset.bar, el]));
  let current = null;
  let currentEv = null;
  let cursor = null;
  return {
    barEl: (i) => barEls.get(i),
    lineEl: (i) => barEls.get(i)?.closest('.sys'),
    setCurrent(bar, ev = -1) {
      if (current !== bar) {
        barEls.get(current)?.classList.remove('is-current');
        barEls.get(bar)?.classList.add('is-current');
        current = bar;
      }
      const el = bar == null || ev < 0 ? null : barEls.get(bar)?.querySelector(`[data-ev="${ev}"]`);
      const jp = bar == null || ev < 0 ? null : barEls.get(bar)?.querySelector(`[data-jp="${ev}"]`);
      for (const old of currentEv ?? []) old.classList.remove('on');
      currentEv = [el, jp].filter(Boolean);
      for (const n of currentEv) n.classList.add('on');
    },
    setCursor(i) {
      barEls.get(cursor)?.classList.remove('is-cursor');
      barEls.get(i)?.classList.add('is-cursor');
      cursor = i;
    },
    setLoop(a, b) {
      for (const [i, el] of barEls) el.classList.toggle('in-loop', a != null && i >= a && i <= b);
    },
  };
}
