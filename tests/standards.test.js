// The built-in scores and the editor template must be real alphaTex and ChordPro: the reference readers (alphaTab and
// chordsheetjs, dev dependencies only) read them without errors and find the same music as the app's own parser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJsonFile } from './helpers/setup.js';
import * as alphaTab from '@coderline/alphatab';
import ChordSheetJS from 'chordsheetjs';
import { BUILTIN } from '../src/state/songs.js';
import { parseSong } from '../src/music/format/parse-song.js';

const texts = BUILTIN.flatMap((e) => (e.versions ?? [e]).map((v) => ({ id: `${e.id} ${v.id ?? ''}`, format: e.format ?? 'atex', text: v.text })));
const template = readJsonFile('src/lang/zh_CN.json').editor.template.join('\n');
// alphaTab counts 960 ticks per quarter note, the app 48
const TICK = 20;

function readAlphaTex(text) {
  const reader = new alphaTab.importer.AlphaTexImporter();
  reader.logErrors = false;
  reader.initFromString(text, new alphaTab.Settings());
  let score;
  try {
    score = reader.readScore();
  } catch {}
  const errors = [reader.lexerDiagnostics, reader.parserDiagnostics, reader.semanticDiagnostics]
    .flatMap((bag) => bag?.items ?? [])
    .filter((d) => d.severity === 2)
    .map((d) => `${d.start?.line}: ${d.message}`);
  return { score, errors };
}

test('alphaTab reads every alphaTex score and finds the same notes, chords, lyrics and sections', () => {
  for (const { id, text } of [...texts.filter((x) => x.format === 'atex'), { id: 'editor template', text: template }]) {
    const { score, errors } = readAlphaTex(text);
    assert.deepEqual(errors, [], id);
    const song = parseSong(text);
    assert.deepEqual(song.errors, [], id);
    assert.equal(score.title, song.meta.title, `${id} title`);
    assert.equal(score.tempo, song.meta.bpm, `${id} tempo`);
    const staff = score.tracks[0].staves[0];
    assert.equal(staff.capo, song.meta.capo, `${id} capo`);
    assert.equal(score.instructions, song.meta.instructions, `${id} instructions`);
    assert.equal(staff.bars.length, song.bars.length, `${id} bars`);
    let time = song.meta.time;
    staff.bars.forEach((bar, k) => {
      const ours = song.bars[k];
      const master = bar.masterBar;
      time = ours.time ?? time;
      assert.deepEqual([master.timeSignatureNumerator, master.timeSignatureDenominator], time, `${id} bar ${k + 1} time`);
      assert.equal(master.isAnacrusis, k === 0 && ours.phase > 0, `${id} bar ${k + 1} pickup`);
      assert.equal(master.section?.text ?? null, song.sections.find((s) => s.start === k)?.name ?? null, `${id} bar ${k + 1} section`);
      const beats = bar.voices[0].beats.map((b) => ({
        at: b.playbackStart / TICK,
        dur: b.playbackDuration / TICK,
        kind: b.isRest ? 'rest' : 'note',
        notes: b.notes.map((n) => ({ s: 7 - n.string, f: n.isDead ? -1 : n.fret, ...(n.isTieDestination && { tie: true }) })),
        lyric: b.lyrics?.[0] ?? '',
        chord: b.chord?.name ?? null,
      }));
      const chordOf = (e) => ours.chords.find((c) => c.at === e.at)?.name ?? null;
      assert.deepEqual(beats, ours.events.map((e) => ({ at: e.at, dur: e.dur, kind: e.kind, notes: e.notes, lyric: e.lyric, chord: chordOf(e) })), `${id} bar ${k + 1}`);
    });
  }
});

test('chordsheetjs reads every ChordPro chart and finds the same meta data and grid rows', () => {
  for (const { id, text } of texts.filter((x) => x.format === 'cho')) {
    const sheet = new ChordSheetJS.ChordProParser().parse(text);
    const song = parseSong(text);
    assert.deepEqual(song.errors, [], id);
    const meta = sheet.metadata.metadata;
    assert.equal(meta.title, song.meta.title);
    assert.equal(meta.artist, song.meta.artist);
    assert.equal(meta.key, song.meta.key);
    assert.equal(Number(meta.capo), song.meta.capo);
    assert.equal(Number(meta.tempo), song.meta.bpm);
    assert.equal(meta.time, song.meta.time.join('/'));
    assert.equal(meta.instructions, song.meta.instructions);
    assert.ok(meta.strum && song.strum);
    const grids = sheet.paragraphs.filter((p) => p.type === 'grid');
    // a grid without a label goes on in the section before it
    assert.deepEqual(grids.filter((p) => p.label).map((p) => p.label), song.sections.map((s) => s.name), `${id} sections`);
    // each literal grid row holds the cells of the bars that start a page line, in order; lyric rows are the app's own
    const rows = grids.flatMap((p) => p.lines.flatMap((l) => l.items.filter((it) => 'string' in it).map((it) => it.string))).filter((r) => !r.startsWith('lyric:'));
    const cells = rows.flatMap((r) => r.split('|').slice(1, -1).map((c) => c.trim().split(/\s+/)));
    assert.equal(cells.length, song.bars.length, `${id} bars`);
    cells.forEach((cell, k) => {
      const named = cell.map((tok, beat) => [tok, beat]).filter(([tok]) => tok !== '.');
      assert.deepEqual(named.map(([name, beat]) => ({ at: beat * song.meter.beatTicks, name })), song.bars[k].chords, `${id} bar ${k + 1}`);
    });
  }
});
