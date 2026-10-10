import { barTicks, beatTicks, type TabScore } from './model';

export class ScoreError extends Error {
  constructor(public issues: string[]) { super(issues.join('\n')); this.name = 'ScoreError'; }
}
export function validateScore(score: TabScore): void {
  const issues: string[] = [];
  if (score.schemaVersion !== 1) issues.push('曲谱版本无法读取。');
  if (!score.title.trim()) issues.push('请填写曲名。');
  if (!Number.isFinite(score.tempo) || score.tempo < 20 || score.tempo > 300) issues.push('速度应在 20–300 之间。');
  if (score.tuning.length !== 6 || score.tuning.some(n => !Number.isInteger(n) || n < 0 || n > 127)) issues.push('需要六弦调弦。');
  if (!score.bars.length) issues.push('曲谱至少需要一个小节。');
  const previous = new Map<number, { fret: number; end: number }>();
  let absolute = 0;
  const ids = new Set<string>();
  for (const [i, bar] of score.bars.entries()) {
    const label = `第 ${i + 1} 小节`;
    if (!Number.isInteger(bar.meter[0]) || bar.meter[0] < 1 || bar.meter[0] > 32 || ![1, 2, 4, 8, 16, 32, 64].includes(bar.meter[1])) issues.push(`${label}拍号无法读取。`);
    if (!Number.isFinite(bar.tempo) || bar.tempo < 20 || bar.tempo > 300) issues.push(`${label}速度应在 20–300 之间。`);
    if (!Number.isInteger(bar.key) || bar.key < -7 || bar.key > 7) issues.push(`${label}调号无法读取。`);
    if (ids.has(bar.id)) issues.push(`${label}重复标识。`);
    ids.add(bar.id);
    if (!bar.beats.length) issues.push(`${label}需要音符或休止符。`);
    let cursor = 0;
    for (const [j, beat] of bar.beats.entries()) {
      const where = `${label}第 ${j + 1} 个拍组`;
      if (ids.has(beat.id)) issues.push(`${where}重复标识。`);
      ids.add(beat.id);
      if (!Number.isInteger(beat.startTick) || beat.startTick !== cursor) issues.push(`${where}时间不连续。`);
      if (![1, 2, 4, 8, 16, 32, 64].includes(beat.duration) || !Number.isInteger(beat.dots) || beat.dots < 0 || beat.dots > 2) issues.push(`${where}时值无法读取。`);
      const length = beatTicks(beat);
      const strings = new Set<number>();
      for (const note of beat.notes) {
        if (!Number.isInteger(note.string) || note.string < 1 || note.string > 6) issues.push(`${where}弦号应在 1–6 之间。`);
        if (!Number.isInteger(note.fret) || note.fret < 0 || note.fret > 36) issues.push(`${where}品位应在 0–36 之间。`);
        if (strings.has(note.string)) issues.push(`${where}同一弦只能有一个音符。`);
        strings.add(note.string);
        const origin = previous.get(note.string);
        if (note.tie && (!origin || origin.fret !== note.fret || origin.end !== absolute + cursor)) issues.push(`${where}延音需要紧邻的同弦同品音符。`);
        previous.set(note.string, { fret: note.fret, end: absolute + cursor + length });
      }
      cursor += length;
    }
    if (cursor > barTicks(bar)) issues.push(`${label}时值超过拍号。`);
    absolute += barTicks(bar);
  }
  if (score.bars[0]?.tempo !== score.tempo) issues.push('起始速度与第一小节速度不一致。');
  if (issues.length) throw new ScoreError(issues);
}
