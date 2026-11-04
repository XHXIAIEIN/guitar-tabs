// Page layout: which bars share a line, and the vertical positions inside a line.

export function breakLines(song, metrics, avail) {
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
