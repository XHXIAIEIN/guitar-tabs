// Persistent app state in localStorage: settings, user songs, per-song practice preferences, setlist, records.
import { BUILTIN } from './data/songs.js';
import { parseSong } from './music/format.js';

const KEY = 'liuxian.v1';

const DEFAULTS = {
  settings: {
    theme: 'auto',
    show: { tab: true, jianpu: false, rhythm: true, lyrics: true, chords: true },
    showRevision: 1,
    stringLabels: { left: ['number'], right: [] },
    stringWidth: 'uniform',
    zoom: 1,
    countIn: 1,
    metronome: true,
    guitar: true,
    volMetronome: 0.8,
    volGuitar: 0.8,
    tapOffset: 0,
    performZoom: 1.5,
  },
  songs: {},
  prefs: {},
  versions: {},
  setlist: [],
  records: {},
};

function load() {
  let saved = {};
  // Private browsing and blocked site data make localStorage throw; the app then runs without saving.
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    saved = {};
  }
  const show = { ...DEFAULTS.settings.show, ...saved.settings?.show };
  // Every save writes all of `show`, so a save without showRevision holds 简谱 on as an old default, not as a choice
  if (!saved.settings?.showRevision) show.jianpu = false;
  return {
    ...structuredClone(DEFAULTS),
    ...saved,
    settings: { ...DEFAULTS.settings, ...saved.settings, show },
  };
}

export const state = load();
const listeners = new Set();

export let saveFailed = false;

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveFailed = false;
  } catch {
    // Quota exceeded or storage blocked: keep working in memory and tell the user once per failure.
    saveFailed = true;
  }
  for (const fn of listeners) fn();
}

export const onSave = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export function setSetting(key, value) {
  state.settings[key] = value;
  save();
}

// ---- songs ----

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
  return { ...b, builtin: true, text: v.text, version: v, prefsId: `${b.id}:${v.id}` };
}

export function allEntries() {
  const user = Object.entries(state.songs)
    .map(([id, s]) => ({ id, text: s.text, group: '我的曲谱', builtin: false, updated: s.updated }))
    .sort((a, b) => b.updated - a.updated);
  return [...user, ...BUILTIN.map(builtinEntry)];
}

export function getEntry(id) {
  const user = state.songs[id];
  if (user) return { id, text: user.text, group: '我的曲谱', builtin: false, prefsId: id };
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

// ---- per-song practice preferences ----

export function prefsFor(id, song) {
  return { bpm: song.meta.bpm, capo: song.meta.capo, transpose: 0, loop: null, ...state.prefs[id] };
}

export function savePrefs(id, prefs) {
  state.prefs[id] = prefs;
  save();
}

// ---- backup ----

export function exportData() {
  return JSON.stringify({ app: 'liuxian', version: 1, songs: state.songs, setlist: state.setlist, records: state.records }, null, 2);
}

/** Merges a backup; songs with the same id are replaced. Returns the number of songs imported. */
export function importData(json) {
  const data = JSON.parse(json);
  if (data.app !== 'liuxian' || typeof data.songs !== 'object') throw new Error('这不是六弦本导出的备份文件');
  Object.assign(state.songs, data.songs);
  for (const id of data.setlist ?? []) if (!state.setlist.includes(id)) state.setlist.push(id);
  Object.assign(state.records, data.records ?? {});
  save();
  return Object.keys(data.songs).length;
}
