// The song collection: built-in entries and versions, user songs, and the parse cache.
import { parseSong } from '../music/format/parse-song.js';
import { requestDurableStorage } from '../core/storage.js';
import { state, save } from './store.js';

/** Every built-in entry in list order. It is empty until boot. */
export const BUILTIN = [];

/**
 * Path from the site root to one score file of a catalog entry: `scores/<group>/[<subgroup>/]<file>`, with `.atex`
 * (alphaTex), or `.cho` (ChordPro) when the entry says `"format": "cho"`. `file` is the id, or `<id>/<version id>`.
 */
export function scorePath(entry, file) {
  return `scores/${entry.group}/${entry.subgroup ? `${entry.subgroup}/` : ''}${file}.${entry.format ?? 'atex'}`;
}

/** Fills BUILTIN from scores/index.json and the files it names. Both readers take a path from the site root. */
export async function loadScores(readJson, readText) {
  const read = (entry, file) => readText(scorePath(entry, file));
  const catalog = await readJson('scores/index.json');
  const entries = await Promise.all(
    catalog.map(async (entry) =>
      entry.versions
        ? { ...entry, versions: await Promise.all(entry.versions.map(async (v) => ({ ...v, text: await read(entry, `${entry.id}/${v.id}`) }))) }
        : { ...entry, text: await read(entry, entry.id) },
    ),
  );
  BUILTIN.push(...entries);
}

const parsed = new Map();

/** Parses song text once per distinct text. */
export function parse(text) {
  let song = parsed.get(text);
  if (!song) {
    song = parseSong(text);
    parsed.set(text, song);
  }
  return song;
}

/** A built-in song as the chosen version, or its first version. Each version keeps its own practice preferences. */
function builtinEntry(b) {
  if (!b.versions) return { ...b, builtin: true, prefsId: b.id };
  const v = b.versions.find((x) => x.id === state.versions[b.id]) ?? b.versions[0];
  return { ...b, builtin: true, text: v.text, level: v.level, version: v, prefsId: `${b.id}:${v.id}` };
}

export function allEntries() {
  const user = Object.entries(state.songs)
    .map(([id, s]) => ({ id, text: s.text, group: 'mine', builtin: false, updated: s.updated }))
    .sort((a, b) => b.updated - a.updated);
  return [...user, ...BUILTIN.map(builtinEntry)];
}

export function getEntry(id) {
  const user = state.songs[id];
  if (user) return { id, text: user.text, group: 'mine', builtin: false, prefsId: id };
  const b = BUILTIN.find((x) => x.id === id);
  return b ? builtinEntry(b) : null;
}

export function setVersion(id, version) {
  state.versions[id] = version;
  save();
}

export function newSongId() {
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function saveSong(id, text) {
  state.songs[id] = { text, updated: Date.now() };
  save();
  requestDurableStorage();
}

/** Removes a user song and returns a function that restores it. */
export function deleteSong(id) {
  const old = state.songs[id];
  const pos = state.setlist.indexOf(id);
  delete state.songs[id];
  if (pos >= 0) state.setlist.splice(pos, 1);
  save();
  return () => {
    state.songs[id] = old;
    if (pos >= 0) state.setlist.splice(pos, 0, id);
    save();
  };
}
