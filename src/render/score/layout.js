// Page layout: which bars share a line, and the vertical positions inside a line.

export function breakLines(song, metrics, avail) {
  const lines = [];
  const bars = song.bars;
  const fits = (start, count) => count === 1 || metrics.slice(start, start + count).reduce((w, b) => w + b.natural, 0) <= avail;
  // A phrase that is too wide for one line splits in halves, so the halves line up with each other.
  const place = (start, count, sectionStart) => {
    if (fits(start, count)) return lines.push({ start, count, sectionStart });
    const half = Math.ceil(count / 2);
    place(start, half, sectionStart);
    place(start + half, count - half, false);
  };
  let i = 0;
  while (i < bars.length) {
    let end = i + 1;
    while (end < bars.length && !bars[end].phrase) end++;
    place(i, end - i, bars[i].section !== bars[i - 1]?.section);
    i = end;
  }
  return lines;
}

export function lineGeometry(bars, o) {
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
  if (notes && o.notation === 'slash') {
    if (has((e) => e.dir === 'D' || e.dir === 'U')) {
      g.strum = y + 1 * s;
      y += 17 * s;
    }
    g.stem = y + (has((e) => e.tuplet) ? 11 : 4) * s;
    g.lines = 5;
    g.gap = 8 * s;
    g.staff = g.stem + 10 * s;
    // Stems start at the top end of the slash, 7 above the middle line
    g.head = g.staff + 2 * g.gap - 6 * s;
    y = g.staff + 4 * g.gap + 10 * s;
  } else if (notes) {
    if (o.show.numbers && has((e) => e.kind === 'note')) {
      g.numbers = y + 22 * s;
      y += 46 * s;
    }
    if (o.show.tab && has((e) => e.kind === 'strum')) {
      g.strum = y + 1 * s;
      y += 17 * s;
    }
    if (o.show.rhythm) {
      g.stem = y + (has((e) => e.tuplet) ? 11 : 4) * s;
      g.head = g.stem + 20 * s;
      y = g.head + 10 * s;
    }
    if (o.show.tab) {
      g.lines = 6;
      g.gap = 11 * s;
      g.staff = y + 6 * s;
      y = g.staff + 5 * g.gap + 10 * s;
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
