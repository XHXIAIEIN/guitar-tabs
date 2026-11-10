// Turns a parsed song into sequencer bars: count-in, metronome, guitar sounds, loop and speed trainer.
import { click } from './click.js';
import { pluck, strum, dampAll } from './guitar.js';
import { beatAccent } from '../music/format/meter.js';
import { chordAt } from '../music/format/pattern.js';
import { midiOf } from '../music/pitch.js';

const MUTED = [0, 0, 0, 0, 0, 0];

/** Click items for every beat of a bar; `force` keeps them audible with the metronome off (count-in). */
export function beatItems(m, live, force = false, ui = (k) => ({ beat: k })) {
  const items = [];
  for (let k = 0; k < m.beats; k++) {
    items.push({ tick: k * m.beatTicks, sound: (t) => (force || live.metronome) && click(t, beatAccent(k, m)), ui: ui(k) });
  }
  return items;
}

/**
 * @param song parsed song
 * @param o from: first bar; loop: [a, b] or null; countIn: beats; bpm;
 *          live: { metronome, guitar } read at schedule time so toggles apply at once;
 *          shapeOf(name): frets for a chord name or null; capo;
 *          trainer: { step, max } raises the tempo each time the loop restarts
 */
export function songSource(song, o) {
  const m = song.bars[o.from]?.meter ?? song.meter;
  const last = song.bars.length - 1;
  let countLeft = o.countIn;
  let next = o.from;
  let bpm = o.bpm;
  let wrapped = false;
  const defaultStrum = Array.from({ length: m.beats }, (_, k) => ({ at: k * m.beatTicks, kind: 'strum', dir: 'D' }));

  // metric position of the next tick inside the bar; the count-in ends on a downbeat
  let pos = 0;

  /** Click items in meter `m` for the beats in the `ticks` that start at metric position `from`. */
  const clicks = (m, from, ticks) => {
    const items = [];
    for (let tick = (m.beatTicks - (from % m.beatTicks)) % m.beatTicks; tick < ticks; tick += m.beatTicks) {
      const k = ((from + tick) % m.barTicks) / m.beatTicks;
      items.push({ tick, sound: (t) => o.live.metronome && click(t, beatAccent(k, m)), ui: { beat: k } });
    }
    return items;
  };

  const eventSound = (bar, e, accent) => {
    if (e.kind === 'rest') return (t) => o.live.guitar && dampAll(t);
    if (e.kind === 'note') {
      return (t) => {
        if (!o.live.guitar) return;
        for (const n of e.notes) {
          if (n.f < 0) pluck(t, n.s, midiOf(n.s, 0, o.capo), 0.5, true);
          else pluck(t, n.s, midiOf(n.s, n.f, o.capo), 0.8);
        }
      };
    }
    return (t) => {
      if (!o.live.guitar) return;
      const name = chordAt(bar, e.at);
      const frets = (name && o.shapeOf(name)) || MUTED;
      strum(t, frets, o.capo, name ? e.dir : 'X', accent);
    };
  };

  return {
    next() {
      if (countLeft > 0) {
        // a count-in shorter than a bar plays the bar's last beats, so it always ends on the last beat
        const n = countLeft % m.beats || m.beats;
        const skip = m.beats - n;
        countLeft -= n;
        const items = beatItems(m, o.live, true, (k) => ({ count: k + 1, of: m.beats }))
          .slice(skip)
          .map((item) => ({ ...item, tick: item.tick - skip * m.beatTicks }));
        return { ticks: n * m.beatTicks, beatTicks: m.beatTicks, items };
      }
      if (next === null) return null;
      const i = next;
      const bar = song.bars[i];
      if (o.loop && i === o.loop[1]) next = o.loop[0];
      else next = i < last ? i + 1 : null;

      // A bar that does not start where the previous one ended (the first one played, or a loop restart)
      // waits with metronome beats until its own beat comes round.
      const bm = bar.meter;
      const lead = (bar.phase - pos + bm.barTicks) % bm.barTicks;
      const plan = { ticks: lead + bar.ticks, beatTicks: bm.beatTicks, items: clicks(bm, pos, lead + bar.ticks) };
      pos = (bar.phase + bar.ticks) % bm.barTicks;
      if (wrapped && o.trainer) {
        bpm = Math.min(o.trainer.max, bpm + o.trainer.step);
        plan.bpm = bpm;
      }
      wrapped = !!o.loop && i === o.loop[1];
      plan.items.push({ tick: 0, ui: { bar: i, ev: -1 } });
      if (bar.events.length) {
        bar.events.forEach((e, j) => plan.items.push({ tick: lead + e.at, sound: eventSound(bar, e), ui: { bar: i, ev: j } }));
      } else {
        // the strum pattern repeats every metric bar
        for (let base = -bar.phase; base < bar.ticks; base += bm.barTicks) {
          for (const e of song.strum ?? defaultStrum) {
            const at = base + e.at;
            if (e.kind === 'strum' && at >= 0 && at < bar.ticks) plan.items.push({ tick: lead + at, sound: eventSound(bar, { ...e, at }, e.at === 0) });
          }
        }
      }
      plan.items.sort((a, b) => a.tick - b.tick);
      return plan;
    },
  };
}
