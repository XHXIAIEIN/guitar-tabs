// Natural widths of bars, before a line stretches them to fill the page.

export const PAD_L = 12;
export const PAD_R = 8;

let measureCtx;
export function textWidth(text, font) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

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

export function measureBar(bar, song, o, F) {
  const s = o.scale;
  if (!bar.events.length) {
    const chordW = bar.chords.reduce((w, c) => w + textWidth(o.chordLabel(c.name), F.chartChord) + 14 * s, 0);
    const beatW = (bar.ticks / song.meter.beatTicks) * (o.compact ? 14 : 22) * s;
    return { natural: (PAD_L + PAD_R) * s + Math.max(beatW, chordW, 36 * s), slots: null };
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
