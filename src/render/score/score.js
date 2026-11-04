// SVG score: chord names, 简谱, strum arrows, rhythm notes, TAB staff, lyrics.
// Lines break at section headings and otherwise hold a whole phrase (1, 2, 4 or 8 bars).
import { esc, r1 } from '../svg.js';
import { renderBar } from './bar.js';
import { breakLines, lineGeometry } from './layout.js';
import { gutterWidth, stringLabelMarks } from './marks.js';
import { measureBar } from './measure.js';

const NO_LABELS = { left: 'none', right: 'none' };

/**
 * Renders `song` into `root` and returns a handle that moves highlights without re-rendering.
 * @param {object} o width, scale, show {tab, numbers, rhythm, lyrics, chords}, chordLabel(name), tonic, compact, barNumbers,
 *   stringLabels {left, right} each 'none' | 'tab' | 'number' | 'name', stringWidth 'uniform' | 'real',
 *   notation 'slash' draws strums as rhythm notation: slash heads with stems on a five-line staff, instead of the TAB staff
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
  const labels = o.show.tab && song.bars.some((b) => b.events.length) ? o.stringLabels ?? NO_LABELS : NO_LABELS;
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
      svg += renderBar(bar, x, bw, { slots: metrics[bar.index].slots, k }, m, o, g, F, i === 0, bar.index === song.bars.length - 1);
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
    lineEl: (i) => barEls.get(i)?.closest('.sys'),
    setCurrent(bar, ev = -1) {
      if (current !== bar) {
        barEls.get(current)?.classList.remove('is-current');
        barEls.get(bar)?.classList.add('is-current');
        current = bar;
      }
      const el = bar == null || ev < 0 ? null : barEls.get(bar)?.querySelector(`[data-ev="${ev}"]`);
      const number = bar == null || ev < 0 ? null : barEls.get(bar)?.querySelector(`[data-number="${ev}"]`);
      for (const old of currentEv ?? []) old.classList.remove('on');
      currentEv = [el, number].filter(Boolean);
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
