import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/setup.js';
import { config } from '../src/core/config.js';
import { restoreState, state } from '../src/state/store.js';
import { exportData, importData } from '../src/state/backup.js';
import { prefsFor } from '../src/state/prefs.js';
import { parseSong } from '../src/music/format/parse-song.js';

test('简谱 and the rhythm notes are off on a first start', () => {
  const { show } = restoreState(null).settings;
  assert.equal(show.numbers, false);
  assert.equal(show.rhythm, false);
});

test('a saved document keeps its values and gets every default it lacks', () => {
  const s = restoreState({ settings: { theme: 'dark', show: { tab: false } }, songs: { a: { text: 'x' } } });
  assert.equal(s.settings.theme, 'dark');
  assert.equal(s.settings.show.tab, false);
  assert.equal(s.settings.show.lyrics, config.defaults.settings.show.lyrics);
  assert.deepEqual(s.tools, config.defaults.tools);
  assert.deepEqual(s.songs, { a: { text: 'x' } });
  assert.deepEqual(s.setlist, []);
});

test('saved lists replace the default lists, and the defaults stay unchanged', () => {
  const s = restoreState({ tools: { drill: { chords: ['Am', 'E', 'A'] } } });
  assert.deepEqual(s.tools.drill.chords, ['Am', 'E', 'A']);
  assert.equal(s.tools.drill.bpm, config.defaults.tools.drill.bpm);
  const fresh = restoreState(null);
  fresh.tools.drill.chords.push('D');
  assert.deepEqual(config.defaults.tools.drill.chords, ['C', 'D', 'G', 'Em']);
});

test('the default rhythm tool settings are the preset they name', () => {
  const saved = config.defaults.tools.rhythm;
  const preset = config.rhythm.presets.find((p) => p.id === saved.preset);
  assert.deepEqual([preset.time, preset.grid, preset.steps], [saved.time, saved.grid, saved.steps]);
});

test('a backup round trip restores songs, setlist and records', () => {
  state.songs.u1 = { text: 'title: 甲', updated: 1 };
  state.setlist.push('u1');
  state.records.minute = { 'C-G': [{ t: 1, n: 30 }] };
  const json = exportData();
  delete state.songs.u1;
  state.setlist.length = 0;
  state.records = {};
  assert.equal(importData(json), 1);
  assert.equal(state.songs.u1.text, 'title: 甲');
  assert.deepEqual(state.setlist, ['u1']);
  assert.equal(state.records.minute['C-G'][0].n, 30);
  assert.throws(() => importData('{"app":"other","songs":{}}'), /不是六弦本/);
});

test('song preferences start from the song and stay with their id', () => {
  const song = parseSong('title: t\nbpm: 90\ncapo: 2');
  const prefs = prefsFor('some-id', song);
  assert.equal(prefs.bpm, 90);
  assert.equal(prefs.capo, 2);
  assert.equal(prefs.trainer.on, false);
  assert.equal(prefs.trainer.step, config.song.trainer.step);
});
