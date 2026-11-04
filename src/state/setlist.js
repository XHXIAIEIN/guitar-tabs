// The performance setlist: an ordered list of song ids.
import { state, save } from './store.js';

export const inSetlist = (id) => state.setlist.includes(id);

export function toggleSetlist(id) {
  const i = state.setlist.indexOf(id);
  if (i >= 0) state.setlist.splice(i, 1);
  else state.setlist.push(id);
  save();
}

export function moveInSetlist(i, delta) {
  const [id] = state.setlist.splice(i, 1);
  state.setlist.splice(i + delta, 0, id);
  save();
}
