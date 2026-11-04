// Backup files: user songs, the setlist and practice records as JSON.
import { t } from '../core/i18n.js';
import { state, save } from './store.js';

const APP_ID = 'guitar';

export function exportData() {
  return JSON.stringify({ app: APP_ID, version: 1, songs: state.songs, setlist: state.setlist, records: state.records }, null, 2);
}

/** Merges a backup; songs with the same id are replaced. Returns the number of songs imported. */
export function importData(json) {
  const data = JSON.parse(json);
  if (data.app !== APP_ID || typeof data.songs !== 'object') throw new Error(t('library.notBackup'));
  Object.assign(state.songs, data.songs);
  for (const id of data.setlist ?? []) if (!state.setlist.includes(id)) state.setlist.push(id);
  Object.assign(state.records, data.records ?? {});
  save();
  return Object.keys(data.songs).length;
}
