import { t } from '../i18n';
import { barTicks, beatTicks, type TabScore } from './model';

export class ScoreError extends Error {
  constructor(public issues: string[]) { super(issues.join('\n')); this.name = 'ScoreError'; }
}
export function validateScore(score: TabScore): void {
  const issues: string[] = [];
  if (score.schemaVersion !== 1) issues.push(t('score.version'));
  if (!score.title.trim()) issues.push(t('score.title'));
  if (!Number.isFinite(score.tempo) || score.tempo < 20 || score.tempo > 300) issues.push(t('score.tempo'));
  if (score.tuning.length !== 6 || score.tuning.some(n => !Number.isInteger(n) || n < 0 || n > 127)) issues.push(t('score.tuning'));
  if (!score.bars.length) issues.push(t('score.empty'));
  const previous = new Map<number, { fret: number; end: number }>();
  let absolute = 0;
  const ids = new Set<string>();
  for (const [i, bar] of score.bars.entries()) {
    const params = { bar: i + 1 };
    if (!Number.isInteger(bar.meter[0]) || bar.meter[0] < 1 || bar.meter[0] > 32 || ![1, 2, 4, 8, 16, 32, 64].includes(bar.meter[1])) issues.push(t('score.meter', params));
    if (!Number.isFinite(bar.tempo) || bar.tempo < 20 || bar.tempo > 300) issues.push(t('score.tempo'));
    if (!Number.isInteger(bar.key) || bar.key < -7 || bar.key > 7) issues.push(t('score.key', params));
    if (ids.has(bar.id)) issues.push(t('score.id', params));
    ids.add(bar.id);
    if (!bar.beats.length) issues.push(t('score.noBeats', params));
    let cursor = 0;
    for (const [j, beat] of bar.beats.entries()) {
      const beatParams = { ...params, beat: j + 1 };
      if (ids.has(beat.id)) issues.push(t('score.id', params));
      ids.add(beat.id);
      if (!Number.isInteger(beat.startTick) || beat.startTick !== cursor) issues.push(t('score.time', beatParams));
      if (![1, 2, 4, 8, 16, 32, 64].includes(beat.duration) || !Number.isInteger(beat.dots) || beat.dots < 0 || beat.dots > 2) issues.push(t('score.duration', beatParams));
      const length = beatTicks(beat);
      const strings = new Set<number>();
      for (const note of beat.notes) {
        if (!Number.isInteger(note.string) || note.string < 1 || note.string > 6) issues.push(t('score.string', beatParams));
        if (!Number.isInteger(note.fret) || note.fret < 0 || note.fret > 36) issues.push(t('score.fret', beatParams));
        if (strings.has(note.string)) issues.push(t('score.sameString', beatParams));
        strings.add(note.string);
        const origin = previous.get(note.string);
        if (note.tie && (!origin || origin.fret !== note.fret || origin.end !== absolute + cursor)) issues.push(t('score.tie', beatParams));
        previous.set(note.string, { fret: note.fret, end: absolute + cursor + length });
      }
      cursor += length;
    }
    if (cursor > barTicks(bar)) issues.push(t('score.fullBar', params));
    absolute += barTicks(bar);
  }
  if (score.bars[0]?.tempo !== score.tempo) issues.push(t('score.initialTempo'));
  if (issues.length) throw new ScoreError(issues);
}
