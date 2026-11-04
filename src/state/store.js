// The persistent app state: settings, tool settings, user songs, per-song preferences, setlist and records.
// One JSON document under one localStorage key. Change it through save() so that listeners hear about it.
import { config } from '../core/config.js';
import { readJson, writeJson } from '../core/storage.js';
import { migrate } from './migrate.js';

export const state = {};
const listeners = new Set();

export let saveFailed = false;

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** `saved` with every field it lacks taken from `defaults`; nested objects merge, arrays and other values replace. */
function withDefaults(defaults, saved) {
  if (saved === undefined) return structuredClone(defaults);
  if (!isPlain(defaults) || !isPlain(saved)) return saved;
  const out = { ...saved };
  for (const key of Object.keys(defaults)) out[key] = withDefaults(defaults[key], saved[key]);
  return out;
}

/** The state for a saved document, or for a first start when `saved` is null. */
export function restoreState(saved) {
  const { settings, tools } = config.defaults;
  return withDefaults({ settings, tools, songs: {}, prefs: {}, versions: {}, setlist: [], records: {} }, migrate(saved ?? {}));
}

export function initState() {
  Object.assign(state, restoreState(readJson(config.storage.key)));
}

export function save() {
  saveFailed = !writeJson(config.storage.key, state);
  for (const fn of listeners) fn();
}

export const onSave = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export function setSetting(key, value) {
  state.settings[key] = value;
  save();
}
