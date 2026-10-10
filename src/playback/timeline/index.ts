import { barTicks, beatTicks, TICKS_PER_QUARTER, type TabScore } from '../../score/model';
import { validateScore } from '../../score/validate';

export interface BarRange { startBar: number; endBar: number }
export interface TimelineEvent {
  time: number;
  duration: number;
  midi: number;
  barId: string;
  beatId: string;
  string: number;
}
export interface TimelineBeat { time: number; duration: number; barId: string; beatId: string }
export interface Timeline { events: TimelineEvent[]; beats: TimelineBeat[]; duration: number }

export function createTimeline(score: TabScore, speed = 1, range?: BarRange): Timeline {
  if (!Number.isFinite(speed) || speed <= 0) throw new Error('playback.invalidSpeed');
  validateScore(score);
  const startBar = range?.startBar ?? 0;
  const endBar = range?.endBar ?? score.bars.length - 1;
  if (!Number.isInteger(startBar) || !Number.isInteger(endBar) || startBar < 0 || endBar < startBar || endBar >= score.bars.length) {
    throw new Error('playback.invalidRange');
  }
  const timeline: Timeline = { events: [], beats: [], duration: 0 };
  const previous = new Map<number, TimelineEvent>();
  for (const bar of score.bars.slice(startBar, endBar + 1)) {
    const secondsPerTick = 60 / (bar.tempo * speed * TICKS_PER_QUARTER);
    for (const beat of bar.beats) {
      const time = timeline.duration + beat.startTick * secondsPerTick;
      const duration = beatTicks(beat) * secondsPerTick;
      timeline.beats.push({ time, duration, barId: bar.id, beatId: beat.id });
      for (const note of beat.notes) {
        const midi = score.tuning[note.string - 1] + note.fret;
        const origin = previous.get(note.string);
        if (note.tie && origin && origin.midi === midi && Math.abs(origin.time + origin.duration - time) < 1e-8) {
          origin.duration += duration;
        } else {
          const event = { time, duration, midi, barId: bar.id, beatId: beat.id, string: note.string };
          timeline.events.push(event);
          previous.set(note.string, event);
        }
      }
    }
    timeline.duration += barTicks(bar) * secondsPerTick;
  }
  return timeline;
}
