import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorSession } from '../src/editor/session.ts';
import { ScoreRepository, LIBRARY_KEY, RECOVERY_KEY } from '../src/storage/repository.ts';
import { parseAlphaTex, exportAlphaTex } from '../src/formats/alphatex.ts';
import { barTicks, beatTicks, musicalContent, type TabScore } from '../src/score/model.ts';
import { validateScore } from '../src/score/validate.ts';

const fixture = (): TabScore => parseAlphaTex(String.raw`\title "练习" \tempo 90 \ts (4 4) 0.1.4 2.1.4 2.1.4 3.1.4`);
const code = (expected: string) => (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === expected);
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  failKey?: string;
  get length(): number { return this.items.size; }
  key(index: number): string | null { return [...this.items.keys()][index] ?? null; }
  getItem(key: string): string | null { return this.items.get(key) ?? null; }
  setItem(key: string, value: string): void { if (key === this.failKey) throw new Error('quota'); this.items.set(key, value); }
  removeItem(key: string): void { this.items.delete(key); }
  clear(): void { this.items.clear(); }
}

test('same-time strings, fret bounds, snapshot isolation, and selection history', () => {
  const original = fixture();
  const session = new EditorSession(original);
  const barId = session.selection.barId;
  session.select({ barId, tick: 960, string: 6 });
  session.setFret(36);
  assert.deepEqual(session.score.bars[0].beats[1].notes, [{ string: 1, fret: 2, tie: false }, { string: 6, fret: 36, tie: false }]);
  assert.equal(original.bars[0].beats[1].notes.length, 1);
  const escaped = session.score; escaped.bars[0].beats[1].notes[0].fret = 19;
  assert.equal(session.score.bars[0].beats[1].notes[0].fret, 2);
  session.select({ barId, tick: 1920, string: 2 });
  session.undo();
  assert.deepEqual(session.selection, { barId, tick: 960, string: 6 });
  assert.equal(session.canRedo, true);
  session.redo();
  assert.deepEqual(session.selection, { barId, tick: 1920, string: 2 });
  const before = session.score;
  for (const fret of [-1, 37, 0.5]) assert.throws(() => session.setFret(fret), code('editor.invalidFret'));
  assert.deepEqual(session.score, before);
  session.setFret(0);
  assert.equal(session.score.bars[0].beats[2].notes[1].fret, 0);
});

test('duration and dot edits reflow ticks; overfull and invalid tie edits remain atomic', () => {
  const session = new EditorSession(fixture());
  const unchanged = session.score;
  assert.throws(() => session.toggleDot(), code('editor.fullBar'));
  assert.throws(() => session.toggleTie());
  assert.deepEqual(session.score, unchanged);
  assert.equal(session.canUndo, false);
  session.setDuration(8);
  assert.deepEqual(session.score.bars[0].beats.map(beat => beat.startTick), [0, 480, 1440, 2400]);
  session.toggleDot();
  assert.deepEqual(session.score.bars[0].beats.map(beat => beat.startTick), [0, 720, 1680, 2640]);
  session.toggleDot();
  session.select({ barId: session.selection.barId, tick: 1440, string: 1 });
  session.toggleTie();
  assert.equal(session.score.bars[0].beats[2].notes[0].tie, true);
  session.toggleTie();
  session.deleteNote();
  assert.equal(session.score.bars[0].beats[2].notes.length, 0);
  session.undo();
  assert.equal(session.score.bars[0].beats[2].notes.length, 1);
  session.setRest();
  assert.equal(session.score.bars[0].beats[2].notes.length, 0);
  assert.equal(session.canRedo, false);
});

test('an interior tick splits sustaining notes and adds a chord without shifting later onsets', () => {
  const session = new EditorSession(fixture());
  session.select({ barId: session.selection.barId, tick: 480, string: 2 });
  session.setFret(12);
  const beats = session.score.bars[0].beats;
  assert.deepEqual(beats.map(beat => beat.startTick), [0, 480, 960, 1920, 2880]);
  assert.deepEqual(beats[1].notes, [{ string: 1, fret: 0, tie: true }, { string: 2, fret: 12, tie: false }]);
  assert.equal(beats[0].id, fixture().bars[0].beats[0].id);
  validateScore(session.score);
  assert.deepEqual(musicalContent(parseAlphaTex(exportAlphaTex(session.score))), musicalContent(session.score));
  session.select({ barId: session.selection.barId, tick: 1, string: 1 });
  const before = session.score;
  assert.throws(() => session.setFret(2), code('editor.unrepresentableTick'));
  assert.deepEqual(session.score, before);
  const fine = new EditorSession(fixture());
  fine.select({ barId: fine.selection.barId, tick: 60, string: 1 });
  fine.setFret(12);
  assert.equal(fine.score.bars[0].beats[0].notes[0].fret, 0);
  assert.equal(fine.score.bars[0].beats[1].notes[0].fret, 12);
  validateScore(fine.score);
});

test('gap input fills rests and takes remaining capacity; a full bar inserts by splitting', () => {
  const partial = parseAlphaTex(String.raw`\title "空位" \ts (4 4) 0.1.4`);
  const session = new EditorSession(partial);
  session.select({ barId: session.selection.barId, tick: 1920, string: 3 });
  session.setFret(7);
  assert.deepEqual(session.score.bars[0].beats.map(beat => beat.startTick), [0, 960, 1920]);
  assert.deepEqual(session.score.bars[0].beats[1].notes, []);
  session.insertBeat();
  assert.equal(session.score.bars[0].beats.length, 4);
  assert.equal(session.score.bars[0].beats[2].notes.length, 0);
  const full = new EditorSession(fixture());
  full.insertBeat();
  assert.deepEqual(full.score.bars[0].beats.map(beat => beat.startTick), [0, 480, 960, 1920, 2880]);
  assert.equal(full.score.bars[0].beats[0].notes.length, 0);
  assert.equal(full.score.bars[0].beats[1].notes[0].fret, 0);
  assert.equal(full.score.bars[0].beats.reduce((n, beat) => n + beatTicks(beat), 0), 3840);
});

test('bar copy and creation use unique ids; beat deletion keeps a playable rest and selection', () => {
  const session = new EditorSession(fixture());
  session.copyBar();
  const copyId = session.selection.barId;
  assert.equal(session.score.bars.length, 2);
  assert.deepEqual(session.score.bars[1].beats.map(beat => beat.notes), session.score.bars[0].beats.map(beat => beat.notes));
  session.addBar();
  assert.equal(session.score.bars.length, 3);
  const added = session.score.bars[2];
  assert.equal(added.beats.every(beat => beat.notes.length === 0), true);
  assert.equal(added.beats.reduce((n, beat) => n + beatTicks(beat), 0), barTicks(added));
  const ids = session.score.bars.flatMap(bar => [bar.id, ...bar.beats.map(beat => beat.id)]);
  assert.equal(new Set(ids).size, ids.length);
  session.undo();
  assert.equal(session.selection.barId, copyId);
  session.select({ barId: copyId, tick: 2880, string: 1 });
  session.deleteBeat();
  assert.equal(session.selection.tick, 1920);
  const single = new EditorSession(parseAlphaTex(String.raw`\title "单拍" 0.1.1`));
  single.deleteBeat();
  assert.equal(single.score.bars[0].beats.length, 1);
  assert.deepEqual(single.score.bars[0].beats[0].notes, []);
  validateScore(single.score);
});

test('save, reload, backup restore, and snapshot isolation preserve complete scores', () => {
  const storage = new MemoryStorage();
  const repository = new ScoreRepository(storage);
  assert.deepEqual(repository.list(), []);
  assert.equal(repository.load('missing'), undefined);
  repository.save('a', fixture());
  const session = new EditorSession(repository.load('a')!);
  session.setFret(12);
  repository.save('a', session.score);
  assert.equal(new ScoreRepository(storage).load('a')!.bars[0].beats[0].notes[0].fret, 12);
  const target = new ScoreRepository(new MemoryStorage());
  target.restore(repository.backup());
  assert.deepEqual(target.list(), repository.list());
  const item = target.load('a')!; item.title = 'mutated';
  assert.equal(target.load('a')!.title, '练习');
});

test('malformed backups fail before writing, including wrong types and invalid musical data', () => {
  const storage = new MemoryStorage();
  const repository = new ScoreRepository(storage);
  repository.save('a', fixture());
  const before = storage.getItem(LIBRARY_KEY);
  const valid = JSON.parse(repository.backup());
  const invalidBackups = ['broken', '{}', JSON.stringify({ ...valid, schemaVersion: 2 }), JSON.stringify({ ...valid, type: 'other' }),
    JSON.stringify({ ...valid, entries: [valid.entries[0], valid.entries[0]] })];
  for (const text of invalidBackups) assert.throws(() => repository.restore(text), code('storage.invalidData'));
  for (const mutate of [
    (score: any) => { score.title = null; },
    (score: any) => { score.bars[0].minor = 'false'; },
    (score: any) => { score.bars[0].beats[0].notes[0].tie = 0; },
    (score: any) => { score.bars[0].beats[0].notes[0].fret = 37; },
    (score: any) => { score.bars[0].beats[0].id = score.bars[0].id; },
  ]) {
    const broken = structuredClone(valid); mutate(broken.entries[0].score);
    assert.throws(() => repository.restore(JSON.stringify(broken)), code('storage.invalidData'));
  }
  assert.equal(storage.getItem(LIBRARY_KEY), before);
});

test('failed writes preserve primary and editing state; corruption recovers the preceding snapshot', () => {
  const storage = new MemoryStorage();
  const repository = new ScoreRepository(storage);
  repository.save('a', fixture());
  const session = new EditorSession(repository.load('a')!);
  session.setFret(12);
  const oldPrimary = storage.getItem(LIBRARY_KEY);
  const edited = session.score;
  for (const failKey of [LIBRARY_KEY, RECOVERY_KEY]) {
    storage.failKey = failKey;
    assert.throws(() => repository.save('a', edited), code('storage.saveFailed'));
    assert.equal(storage.getItem(LIBRARY_KEY), oldPrimary);
    assert.deepEqual(session.score, edited);
  }
  storage.failKey = undefined;
  repository.save('a', edited);
  storage.setItem(LIBRARY_KEY, 'corrupt');
  assert.equal(repository.load('a')!.bars[0].beats[0].notes[0].fret, 0);
  const recovered = repository.load('a')!;
  repository.save('a', recovered);
  assert.equal(repository.load('a')!.bars[0].beats[0].notes[0].fret, 0);
  storage.setItem(LIBRARY_KEY, 'corrupt'); storage.setItem(RECOVERY_KEY, 'corrupt');
  assert.throws(() => repository.list(), code('storage.invalidData'));
  repository.restore(JSON.stringify({ type: 'guitar-tabs-library', schemaVersion: 1, entries: [{ id: 'a', score: edited, updatedAt: 1 }] }));
  assert.equal(repository.load('a')!.bars[0].beats[0].notes[0].fret, 12);
});
