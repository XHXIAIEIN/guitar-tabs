import { barTicks, beatTicks, type Duration, type ScoreBar, type ScoreBeat, type TabScore } from '../score/model';
import { validateScore } from '../score/validate';

export interface EditorPosition { barId: string; tick: number; string: number }
interface Snapshot { score: TabScore; selection: EditorPosition }
export class EditorError extends Error {
  constructor(public code: string, public params: Record<string, number | string> = {}) {
    super(code); this.name = 'EditorError';
  }
}

const durations: Duration[] = [1, 2, 4, 8, 16, 32, 64];
const spans = durations.flatMap(duration => [0, 1, 2].map(dots => ({ duration, dots })))
  .sort((a, b) => beatTicks(b) - beatTicks(a));
const clone = <T>(value: T): T => structuredClone(value);

function rhythm(ticks: number): Pick<ScoreBeat, 'duration' | 'dots'>[] {
  const memo = new Map<number, Pick<ScoreBeat, 'duration' | 'dots'>[] | undefined>();
  const find = (remaining: number): Pick<ScoreBeat, 'duration' | 'dots'>[] | undefined => {
    if (remaining === 0) return [];
    if (remaining < 60) return undefined;
    if (memo.has(remaining)) return memo.get(remaining);
    for (const span of spans) {
      const length = beatTicks(span);
      if (length > remaining) continue;
      const tail = find(remaining - length);
      if (tail) { const found = [span, ...tail]; memo.set(remaining, found); return found; }
    }
    memo.set(remaining, undefined);
    return undefined;
  };
  const result = find(ticks);
  if (!result) throw new EditorError('editor.unrepresentableTick', { tick: ticks });
  return result;
}

export class EditorSession {
  private current: Snapshot;
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];
  private serial = 0;
  private usedIds = new Set<string>();

  constructor(score: TabScore) {
    validateScore(score);
    this.current = { score: clone(score), selection: { barId: score.bars[0].id, tick: 0, string: 1 } };
    for (const bar of score.bars) {
      this.usedIds.add(bar.id);
      for (const beat of bar.beats) this.usedIds.add(beat.id);
    }
  }
  get score(): TabScore { return clone(this.current.score); }
  get selection(): EditorPosition { return { ...this.current.selection }; }
  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }

  select(position: EditorPosition): void {
    this.checkPosition(this.current.score, position);
    this.current.selection = { ...position };
  }

  setFret(fret: number): void {
    if (!Number.isInteger(fret) || fret < 0 || fret > 36) throw new EditorError('editor.invalidFret');
    this.edit(draft => {
      const bar = this.bar(draft);
      const tick = draft.selection.tick;
      let continuation: ScoreBeat[] = [];
      let index = bar.beats.findIndex(beat => beat.startTick === tick);
      if (index < 0) {
        const containing = bar.beats.findIndex(beat => beat.startTick < tick && beat.startTick + beatTicks(beat) > tick);
        if (containing >= 0) {
          const source = bar.beats[containing];
          const prefix = this.fragments(source, tick - source.startTick, false);
          const suffix = this.fragments(source, beatTicks(source) - (tick - source.startTick), true);
          if (source.notes.some(note => note.string === draft.selection.string)) continuation = suffix;
          bar.beats.splice(containing, 1, ...prefix, ...suffix);
          this.reflow(bar);
          index = containing + prefix.length;
        } else {
          const end = this.end(bar);
          if (tick > end) bar.beats.push(...this.rests(tick - end));
          const remaining = barTicks(bar) - tick;
          const span = spans.find(item => beatTicks(item) <= Math.min(960, remaining));
          if (!span) throw new EditorError('editor.fullBar');
          bar.beats.push({ ...span, id: this.id('beat'), startTick: tick, notes: [] });
          this.reflow(bar);
          index = bar.beats.length - 1;
        }
      }
      const beat = bar.beats[index];
      const note = beat.notes.find(item => item.string === draft.selection.string);
      if (note) { if (note.fret !== fret) note.tie = false; note.fret = fret; }
      else beat.notes.push({ string: draft.selection.string, fret, tie: false });
      for (const fragment of continuation.slice(1)) {
        const continued = fragment.notes.find(item => item.string === draft.selection.string)!;
        continued.fret = fret; continued.tie = true;
      }
      beat.notes.sort((a, b) => a.string - b.string);
    });
  }

  setDuration(duration: Duration): void {
    if (!durations.includes(duration)) throw new EditorError('editor.invalidDuration');
    this.edit(draft => { this.beat(draft).duration = duration; this.reflow(this.bar(draft)); });
  }
  toggleDot(): void { this.edit(draft => { const beat = this.beat(draft); beat.dots = beat.dots ? 0 : 1; this.reflow(this.bar(draft)); }); }
  toggleTie(): void {
    this.edit(draft => {
      const note = this.beat(draft).notes.find(item => item.string === draft.selection.string);
      if (!note) throw new EditorError('editor.noteRequired');
      note.tie = !note.tie;
    });
  }
  setRest(): void { this.edit(draft => { this.beat(draft).notes = []; }); }
  deleteNote(): void {
    this.edit(draft => { const beat = this.beat(draft); beat.notes = beat.notes.filter(note => note.string !== draft.selection.string); });
  }

  /** Insert a rest before the selected beat. A full bar splits that beat into equal halves. */
  insertBeat(): void {
    this.edit(draft => {
      const bar = this.bar(draft);
      const index = bar.beats.findIndex(beat => beat.startTick === draft.selection.tick);
      const spare = barTicks(bar) - this.end(bar);
      if (index < 0) {
        if (draft.selection.tick !== this.end(bar)) throw new EditorError('editor.beatRequired');
        const span = spans.find(item => beatTicks(item) <= Math.min(960, spare));
        if (!span) throw new EditorError('editor.fullBar');
        bar.beats.push({ ...span, id: this.id('beat'), startTick: draft.selection.tick, notes: [] });
      } else {
        const selected = bar.beats[index];
        let duration = selected.duration;
        let dots = selected.dots;
        if (spare >= 60) {
          const span = spans.find(item => beatTicks(item) <= Math.min(beatTicks(selected), spare))!;
          duration = span.duration; dots = span.dots;
        } else {
          if (duration === 64) throw new EditorError('editor.fullBar');
          duration = (duration * 2) as Duration;
          selected.duration = duration;
        }
        bar.beats.splice(index, 0, { id: this.id('beat'), startTick: draft.selection.tick, duration, dots, notes: [] });
      }
      this.reflow(bar);
    });
  }
  deleteBeat(): void {
    this.edit(draft => {
      const bar = this.bar(draft);
      const beat = this.beat(draft);
      const index = bar.beats.indexOf(beat);
      if (bar.beats.length === 1) beat.notes = [];
      else bar.beats.splice(index, 1);
      this.reflow(bar);
      draft.selection.tick = bar.beats[Math.min(index, bar.beats.length - 1)].startTick;
    });
  }
  copyBar(): void {
    this.edit(draft => {
      const source = this.bar(draft);
      const copied = clone(source);
      copied.id = this.id('bar');
      for (const beat of copied.beats) beat.id = this.id('beat');
      draft.score.bars.splice(draft.score.bars.indexOf(source) + 1, 0, copied);
      draft.selection = { ...draft.selection, barId: copied.id, tick: 0 };
    });
  }
  addBar(): void {
    this.edit(draft => {
      const source = this.bar(draft);
      const added: ScoreBar = { ...clone(source), id: this.id('bar'), beats: this.rests(barTicks(source)) };
      this.reflow(added);
      draft.score.bars.splice(draft.score.bars.indexOf(source) + 1, 0, added);
      draft.selection = { ...draft.selection, barId: added.id, tick: 0 };
    });
  }
  undo(): void {
    const previous = this.past.pop();
    if (previous) { this.future.push(clone(this.current)); this.current = previous; }
  }
  redo(): void {
    const next = this.future.pop();
    if (next) { this.past.push(clone(this.current)); this.current = next; }
  }

  private edit(change: (draft: Snapshot) => void): void {
    const draft = clone(this.current);
    change(draft);
    if (draft.score.bars.some(bar => this.end(bar) > barTicks(bar))) throw new EditorError('editor.fullBar');
    validateScore(draft.score);
    this.checkPosition(draft.score, draft.selection);
    if (JSON.stringify(draft) === JSON.stringify(this.current)) return;
    this.past.push(clone(this.current)); this.current = draft; this.future = [];
  }
  private checkPosition(score: TabScore, position: EditorPosition): void {
    const bar = score.bars.find(item => item.id === position.barId);
    if (!bar) throw new EditorError('editor.barRequired');
    if (!Number.isInteger(position.tick) || position.tick < 0 || position.tick >= barTicks(bar)) throw new EditorError('editor.invalidTick');
    if (!Number.isInteger(position.string) || position.string < 1 || position.string > 6) throw new EditorError('editor.invalidString');
  }
  private bar(snapshot: Snapshot): ScoreBar { return snapshot.score.bars.find(bar => bar.id === snapshot.selection.barId)!; }
  private beat(snapshot: Snapshot): ScoreBeat {
    const beat = this.bar(snapshot).beats.find(item => item.startTick === snapshot.selection.tick);
    if (!beat) throw new EditorError('editor.beatRequired');
    return beat;
  }
  private end(bar: ScoreBar): number { return bar.beats.reduce((sum, beat) => sum + beatTicks(beat), 0); }
  private reflow(bar: ScoreBar): void { let tick = 0; for (const beat of bar.beats) { beat.startTick = tick; tick += beatTicks(beat); } }
  private id(kind: string): string {
    let id: string;
    do { id = `edit-${kind}-${++this.serial}`; } while (this.usedIds.has(id));
    this.usedIds.add(id); return id;
  }
  private rests(ticks: number): ScoreBeat[] {
    return rhythm(ticks).map(span => ({ ...span, id: this.id('beat'), startTick: 0, notes: [] }));
  }
  private fragments(source: ScoreBeat, ticks: number, continuation: boolean): ScoreBeat[] {
    return rhythm(ticks).map((span, index) => ({ ...span, id: !continuation && index === 0 ? source.id : this.id('beat'), startTick: 0,
      notes: source.notes.map(note => ({ ...note, tie: continuation || index > 0 ? true : note.tie })) }));
  }
}
