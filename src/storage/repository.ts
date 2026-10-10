import type { TabScore } from '../score/model';
import { validateScore } from '../score/validate';

export const LIBRARY_KEY = 'guitar-tabs.library.v1';
export const RECOVERY_KEY = 'guitar-tabs.library.recovery.v1';
export interface SavedScore { id: string; score: TabScore; updatedAt: number }
interface LibraryBackup { type: 'guitar-tabs-library'; schemaVersion: 1; entries: SavedScore[] }
export class StorageError extends Error {
  constructor(public code: string, cause?: unknown) { super(code, { cause }); this.name = 'StorageError'; }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const empty = (): LibraryBackup => ({ type: 'guitar-tabs-library', schemaVersion: 1, entries: [] });

function assertScore(value: unknown): asserts value is TabScore {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.title !== 'string' || !isNumber(value.tempo)
    || !Array.isArray(value.tuning) || !value.tuning.every(isNumber) || !Array.isArray(value.bars)) throw new StorageError('storage.invalidData');
  const ids = new Set<string>();
  const uniqueId = (id: unknown) => { if (!isId(id) || ids.has(id)) throw new StorageError('storage.invalidData'); ids.add(id); };
  for (const bar of value.bars) {
    if (!isRecord(bar) || !Array.isArray(bar.meter) || bar.meter.length !== 2 || !bar.meter.every(isNumber)
      || !isNumber(bar.tempo) || !isNumber(bar.key) || typeof bar.minor !== 'boolean' || !Array.isArray(bar.beats)) throw new StorageError('storage.invalidData');
    uniqueId(bar.id);
    for (const beat of bar.beats) {
      if (!isRecord(beat) || !isNumber(beat.startTick) || !isNumber(beat.duration) || !isNumber(beat.dots) || !Array.isArray(beat.notes)) throw new StorageError('storage.invalidData');
      uniqueId(beat.id);
      for (const note of beat.notes) {
        if (!isRecord(note) || !isNumber(note.string) || !isNumber(note.fret) || typeof note.tie !== 'boolean') throw new StorageError('storage.invalidData');
      }
    }
  }
  try { validateScore(value as unknown as TabScore); }
  catch (cause) { throw new StorageError('storage.invalidData', cause); }
}

function readBackup(text: string): LibraryBackup {
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch (cause) { throw new StorageError('storage.invalidData', cause); }
  if (!isRecord(parsed) || parsed.type !== 'guitar-tabs-library' || parsed.schemaVersion !== 1 || !Array.isArray(parsed.entries)) throw new StorageError('storage.invalidData');
  const ids = new Set<string>();
  for (const entry of parsed.entries) {
    if (!isRecord(entry) || !isId(entry.id) || ids.has(entry.id) || !isNumber(entry.updatedAt) || entry.updatedAt < 0) throw new StorageError('storage.invalidData');
    ids.add(entry.id);
    assertScore(entry.score);
  }
  return parsed as unknown as LibraryBackup;
}

/** Preserve the last readable primary snapshot before each library write. */
export class ScoreRepository {
  constructor(private suppliedStorage?: Storage) {}
  list(): SavedScore[] { return structuredClone(this.read().entries).sort((a, b) => b.updatedAt - a.updatedAt); }
  load(id: string): TabScore | undefined {
    const score = this.read().entries.find(entry => entry.id === id)?.score;
    return score && structuredClone(score);
  }
  save(id: string, score: TabScore): void {
    if (!isId(id)) throw new StorageError('storage.invalidId');
    assertScore(score);
    const current = this.read();
    const next = structuredClone(current);
    const entry: SavedScore = { id, score: structuredClone(score), updatedAt: Date.now() };
    const index = next.entries.findIndex(item => item.id === id);
    if (index < 0) next.entries.push(entry); else next.entries[index] = entry;
    this.write(next, current);
  }
  backup(): string { return JSON.stringify(this.read(), null, 2); }
  restore(text: string): void {
    const next = readBackup(text);
    // A validated import can replace a corrupt library while retaining a readable recovery copy.
    let current: LibraryBackup;
    try { current = this.read(); }
    catch (error) { if (error instanceof StorageError && error.code === 'storage.invalidData') current = next; else throw error; }
    this.write(next, current);
  }
  private storage(): Storage {
    if (this.suppliedStorage) return this.suppliedStorage;
    try { if (globalThis.localStorage) return globalThis.localStorage; }
    catch (cause) { throw new StorageError('storage.unavailable', cause); }
    throw new StorageError('storage.unavailable');
  }
  private read(): LibraryBackup {
    const storage = this.storage();
    let primary: string | null;
    let recovery: string | null;
    try { primary = storage.getItem(LIBRARY_KEY); recovery = storage.getItem(RECOVERY_KEY); }
    catch (cause) { throw new StorageError('storage.readFailed', cause); }
    if (primary !== null) {
      try { return readBackup(primary); }
      catch (error) {
        if (recovery === null) throw error;
        return readBackup(recovery);
      }
    }
    return recovery !== null ? readBackup(recovery) : empty();
  }
  private write(next: LibraryBackup, current: LibraryBackup): void {
    const storage = this.storage();
    try {
      storage.setItem(RECOVERY_KEY, JSON.stringify(current));
      storage.setItem(LIBRARY_KEY, JSON.stringify(next));
    } catch (cause) { throw new StorageError('storage.saveFailed', cause); }
  }
}
