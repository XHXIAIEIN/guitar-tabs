// Per-song practice preferences: speed, capo, transposition, loop, speed trainer and performance display.
import { config } from '../core/config.js';
import { state, save } from './store.js';

export function prefsFor(id, song) {
  const { trainer } = config.song;
  const saved = state.prefs[id];
  return {
    bpm: song.meta.bpm,
    capo: song.meta.capo,
    transpose: 0,
    loop: null,
    ...saved,
    trainer: { on: false, step: trainer.step, max: Math.min(trainer.maxBpm, Math.round(song.meta.bpm * trainer.maxRatio)), ...saved?.trainer },
  };
}

export function savePrefs(id, prefs) {
  state.prefs[id] = prefs;
  save();
}
