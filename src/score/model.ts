export const TICKS_PER_QUARTER = 960;
export const STANDARD_TUNING = [64, 59, 55, 50, 45, 40];
export type Duration = 1 | 2 | 4 | 8 | 16 | 32 | 64;
export interface TabNote { string: number; fret: number; tie: boolean }
export interface ScoreBeat {
  id: string;
  startTick: number;
  duration: Duration;
  dots: number;
  notes: TabNote[];
}
export interface ScoreBar {
  id: string;
  meter: [number, number];
  tempo: number;
  key: number;
  minor: boolean;
  beats: ScoreBeat[];
}
export interface TabScore {
  schemaVersion: 1;
  title: string;
  tempo: number;
  tuning: number[];
  bars: ScoreBar[];
}
export function beatTicks(beat: Pick<ScoreBeat, 'duration' | 'dots'>): number {
  const base = TICKS_PER_QUARTER * 4 / beat.duration;
  return base * (2 - 1 / 2 ** beat.dots);
}
export function barTicks(bar: ScoreBar): number {
  return TICKS_PER_QUARTER * 4 * bar.meter[0] / bar.meter[1];
}
export function pitchName(midi: number, octave = false): string {
  const name = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12];
  return name + (octave ? Math.floor(midi / 12) - 1 : '');
}
export function musicalContent(score: TabScore): unknown {
  return { ...score, bars: score.bars.map(({ id: _id, beats, ...bar }) => ({ ...bar,
    beats: beats.map(({ id: _beatId, notes, ...beat }) => ({ ...beat,
      notes: [...notes].sort((a, b) => a.string - b.string) })) })) };
}
