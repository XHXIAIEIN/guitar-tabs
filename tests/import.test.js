// The score importer: a file goes through alphaTab (the vendored copy the page loads) and comes out as alphaTex that the
// app's parser reads as the same music.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOT } from './helpers/setup.js';
import * as alphaTab from '@coderline/alphatab';
import { BUILTIN } from '../src/state/songs.js';
import { parseSong } from '../src/music/format/parse-song.js';
import { readScoreFile } from '../src/music/import/load-score.js';
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
  assert.equal(remarks.length, 3);
  assert.equal(text, [
    '// 从 drop-d.musicxml 导入，第 1 轨（Guitar）',
    '// 原谱调弦是 D A D G B E，已换算成标准调弦的品位',
    '// 1 个延音线后半的音没有写出，那里成了休止符或少了一个音',
    '// 1 个音比标准调弦的空弦还低，去掉了',
    '\\title "Drop D"',
    '\\artist "Test"',
    '\\tempo 90',
    '\\ts 4 4',
    '\\ks Eminor',
    '\\systemsLayout (2)',
    '',
    '0.6 0.5 0.4.2 | r r.4 0.3',
    '',
  ].join('\n'));
  assert.deepEqual(parseSong(text).errors, []);
});

test('song text is passed on as it is, and other files are refused by name', async () => {
  const tex = '\\title "A"\n0.1 0.1 0.1 0.1';
  assert.deepEqual(await readScoreFile(fileOf('a.ATEX', new TextEncoder().encode(tex))), { text: tex });
  await assert.rejects(readScoreFile(fileOf('song.pdf', new Uint8Array())), /song\.pdf/);
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
