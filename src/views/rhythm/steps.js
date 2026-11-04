// The rhythm step grid as music: step lengths, score events and count labels. A step is one of D U X - .

export const GRID_TICKS = { q: 48, e: 24, e3: 16, s: 12 };
const DUR = { 12: ['s', false], 18: ['s', true], 24: ['e', false], 36: ['e', true], 48: ['q', false], 72: ['q', true], 96: ['h', false], 144: ['h', true], 192: ['w', false] };
const TRIPLET = { 16: 'e', 32: 'q' };

/** Converts grid steps to score events: holds lengthen the previous strum, empty steps become rests. */
export function stepsToEvents(steps, stepTicks, m) {
  const triplet = stepTicks === 16;
  const fits = (dur) => (triplet ? TRIPLET[dur] || DUR[dur] : DUR[dur]);
  const events = [];
  steps.forEach((s, i) => {
    const at = i * stepTicks;
    const last = events[events.length - 1];
    const sameBeat = last && Math.floor(last.at / m.groupTicks) === Math.floor(at / m.groupTicks);
    const extend = last && (s === '-' ? last.kind === 'strum' || last.kind === 'rest' : s === '.' && last.kind === 'rest' && sameBeat);
    if (extend && fits(last.dur + stepTicks) && (sameBeat || last.at % m.groupTicks === 0)) {
      last.dur += stepTicks;
      return;
    }
    events.push(s === 'D' || s === 'U' || s === 'X' ? { at, dur: stepTicks, kind: 'strum', dir: s, notes: [] } : { at, dur: stepTicks, kind: 'rest', notes: [] });
  });
  for (const e of events) {
    const tri = triplet && TRIPLET[e.dur];
    const [base, dotted] = tri ? [tri, false] : DUR[e.dur];
    Object.assign(e, { base, dotted, tuplet: !!tri, lyric: '' });
  }
  return events;
}

/** What a player counts on step `i`: the beat number, or "e", "+" and "a" between beats. */
export function countLabel(i, stepTicks, m) {
  const tick = i * stepTicks;
  if (tick % m.beatTicks === 0) return String(tick / m.beatTicks + 1);
  const pos = (tick % m.beatTicks) / stepTicks;
  return stepTicks === 12 ? ['e', '+', 'a'][pos - 1] : stepTicks === 16 ? ['+', 'a'][pos - 1] : '+';
}
