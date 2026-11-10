// The score importer: a file goes through alphaTab (the vendored copy the page loads) and comes out as alphaTex that the
// app's parser reads as the same music.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOT } from './helpers/setup.js';
import * as alphaTab from '@coderline/alphatab';
import { BUILTIN } from '../src/state/songs.js';
import { parseSong } from '../src/music/format/parse-song.js';
import { readScoreFile, readText } from '../src/music/import/load-score.js';
import { scoreToAlphaTex } from '../src/music/import/to-alphatex.js';

const settings = () => new alphaTab.Settings();
const fileOf = (name, bytes) => ({ name, arrayBuffer: async () => bytes, text: async () => new TextDecoder().decode(bytes) });

/** alphaTex → a Guitar Pro 7 file, written by alphaTab. */
function toGp7(tex) {
  const importer = new alphaTab.importer.AlphaTexImporter();
  importer.initFromString(tex, settings());
  return new alphaTab.exporter.Gp7Exporter().export(importer.readScore(), settings());
}

/** What a song holds as music, for comparing two texts of the same song. */
function music(song) {
  const { title, artist, key, capo, bpm, time } = song.meta;
  return {
    meta: { title, artist, key, capo, bpm, time },
    bars: song.bars.map((b) => ({
      section: song.sections[b.section]?.name,
      phase: b.phase,
      time: b.time,
      chords: b.chords,
      events: b.events.map(({ at, dur, kind, notes, lyric }) => ({ at, dur, kind, notes, lyric })),
    })),
  };
}

async function importFile(name, bytes) {
  const read = await readScoreFile(fileOf(name, bytes));
  return scoreToAlphaTex(read.score, read.tracks[0].index, name);
}

const atex = BUILTIN.filter((e) => (e.format ?? 'atex') === 'atex').flatMap((e) => (e.versions ?? [e]).map((v) => ({ id: `${e.id} ${v.id ?? ''}`, text: v.text })));

test('a MusicXML tab in drop D is moved to standard tuning, and what is lost is listed', async () => {
  const { text, remarks } = await importFile('drop-d.musicxml', readFileSync(new URL('tests/fixtures/drop-d.musicxml', ROOT)));
  assert.equal(remarks.length, 2);
  assert.equal(text, [
    '// 从 drop-d.musicxml 导入，第 1 轨（Guitar）',
    '// 原谱调弦是 D A D G B E，已换算成标准调弦的品位',
    '// 1 个音比标准调弦的空弦还低，去掉了',
    '\\title "Drop D"',
    '\\artist "Test"',
    '\\tempo 90',
    '\\ts 4 4',
    '\\ks Eminor',
    '\\systemsLayout (2)',
    '',
    '0.6 0.5 0.4.2 | -.4 r.4 0.3',
    '',
  ].join('\n'));
  assert.deepEqual(parseSong(text).errors, []);
});

test('song text is passed on as it is, and other files are refused by name', async () => {
  const tex = '\\title "A"\n0.1 0.1 0.1 0.1';
  assert.deepEqual(await readScoreFile(fileOf('a.ATEX', new TextEncoder().encode(tex))), { text: tex, remarks: [] });
  await assert.rejects(readScoreFile(fileOf('song.pdf', new Uint8Array())), /song\.pdf/);
  assert.throws(() => readText('Basically just alternate these two.', null), /e\|---3---\|/);
});

/** Frets and durations of a song's bars, as `fret.string:sixteenths` with chord names in brackets. */
const bars = (song) => song.bars.map((b) => b.events.map((e) => {
  const chord = b.chords.find((c) => c.at === e.at);
  return (chord ? `[${chord.name}]` : '') + (e.kind === 'rest' ? 'r' : e.notes.map((n) => `${n.f < 0 ? 'x' : n.f}.${n.s}`).join('+')) + ':' + e.dur / 12;
}).join(' '));

test('a text tab gets its frets, chords and title, and durations from the spacing', async () => {
  const { text, remarks } = await readScoreFile(fileOf('text-tab.txt', readFileSync(new URL('tests/fixtures/text-tab.txt', ROOT))));
  const song = parseSong(text);
  assert.deepEqual(song.errors, []);
  assert.deepEqual(song.warnings, []);
  assert.deepEqual([song.meta.title, song.meta.artist, song.meta.capo, song.meta.key], ['Morning Walk', 'Test Band', 2, 'Am']);
  assert.equal(remarks.length, 2);
  assert.deepEqual(bars(song), [
    '[Am]0.1+0.5:2 1.2:2 2.3:4 0.1:2 1.2:2 2.3:2 r:2',
    '[F]1.1+1.6:2 1.2:2 2.3:4 1.1:2 1.2:2 2.3:2 r:2',
    '[C]0.1+1.2+0.3+2.4+3.5:4 3.1:2 5.1:2 3.1:6 r:2',
    '[G]3.1+0.2+0.3+0.4+2.5+3.6:4 r:1 10.5:6 12.3:3 r:2',
  ]);
});

test('a text tab in another tuning is moved to standard tuning, and a long line runs on into new bars', () => {
  const tab = [...'eBGDA'.split('').map((l) => `${l}|---------------------|`), 'D|-0-2-2-2-2-2-2-2-2-2-|'].join('\n');
  const { text, remarks } = readText(tab, null);
  const song = parseSong(text);
  assert.deepEqual(song.errors, []);
  assert.match(remarks.join('\n'), /D A D G B E/);
  // the open low D is below standard tuning and dropped; nine eighth notes run on into a second bar
  assert.match(remarks.join('\n'), /1 个音比标准调弦的空弦还低/);
  assert.deepEqual(bars(song), ['r:2 0.6:2 0.6:2 0.6:2 0.6:2 0.6:2 0.6:2 0.6:2', '0.6:2 0.6:2 r:12']);
});

for (const { id, text } of atex) {
  test(`${id} comes back the same through Guitar Pro 7`, async () => {
    const { text: imported, remarks } = await importFile('x.gp', toGp7(text));
    assert.deepEqual(remarks, []);
    const song = parseSong(imported);
    assert.deepEqual(song.errors, []);
    assert.deepEqual(music(song), music(parseSong(text)));
  });
}
