import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/setup.js';
import { parseSong } from '../src/music/format/parse-song.js';
import { chordAt } from '../src/music/format/pattern.js';
import { lyricChunks, noteParts } from '../src/music/format/syntax.js';
import { breakLines } from '../src/render/score/layout.js';

test('note text splits into strings and finger marks', () => {
  assert.deepEqual(noteParts('{T} 弹 {1}。'), [{ finger: 'T' }, ' 弹 ', { finger: '1' }, '。']);
  assert.deepEqual(noteParts('只有文字 {5} {t}'), ['只有文字 {5} {t}']);
});

test('lyrics split like alphaTab: spaces, held notes, dashes, line breaks and comments', () => {
  assert.deepEqual(lyricChunks('长 亭  外'), ['长', '亭', '', '外']);
  assert.deepEqual(lyricChunks('晚 风， 拂 柳'), ['晚', '风，', '拂', '柳']);
  assert.deepEqual(lyricChunks('A-maz-ing grace'), ['A-', 'maz-', 'ing', 'grace']);
  assert.deepEqual(lyricChunks('一 二\n三\n 四'), ['一', '二', '三', '', '四']);
  assert.deepEqual(lyricChunks('[副歌]Do+Re Mi_'), ['Do Re', 'Mi']);
});

test('alphaTex notes: fret.string, sticky durations, chords, dots, triplets and dead notes', () => {
  const s = parseSong(`\\title "T"
\\ts 4 4
:8 3.5 (0.1 1.2).4{ch "Am"} x.4 r.8{d} 2.3.16 | 0.1{tu 3} 0.1{tu 3} 0.1{tu 3} 0.1.2{d}`);
  assert.deepEqual(s.errors, []);
  const [a, b] = s.bars;
  assert.deepEqual(a.events.map((e) => [e.at, e.dur, e.kind]), [[0, 24, 'note'], [24, 48, 'note'], [72, 48, 'note'], [120, 36, 'rest'], [156, 12, 'note']]);
  assert.deepEqual(a.events[1].notes, [{ s: 1, f: 0 }, { s: 2, f: 1 }]);
  assert.deepEqual(a.events[2].notes, [{ s: 4, f: -1 }]);
  assert.deepEqual(a.chords, [{ at: 24, name: 'Am' }]);
  assert.deepEqual(b.events.map((e) => [e.dur, e.base, e.tuplet]), [[8, 's', true], [8, 's', true], [8, 's', true], [144, 'h', false]]);
  assert.equal(chordAt(b, 0), 'Am');
});

test('a pickup bar starts inside the metric bar, and lyrics skip rests', () => {
  const s = parseSong(`\\ts 3 4 \\lyrics "祝 你  生"
\\ac 0.3.8{d} 0.3.16 | 2.3.4 r 1.2`);
  assert.deepEqual(s.errors, []);
  assert.deepEqual(s.warnings, []);
  assert.deepEqual(s.bars.map((b) => [b.ticks, b.phase]), [[48, 96], [144, 0]]);
  assert.deepEqual(s.bars.flatMap((b) => b.events.map((e) => e.lyric)), ['祝', '你', '', '', '生']);
});

test('alphaTex problems name their line', () => {
  const s = parseSong(`\\ts 4 4
0.1 0.1 0.1 | 5/3 0.1
\\tempo 90
\\tuning (E4 B3 G3 D3 A2 E2)
0.1 | 0.1 0.1 0.1 0.1`);
  assert.deepEqual(s.errors.map((e) => e.line), [2, 3, 4]);
  // a measure that is not full warns only when it is not the last one
  assert.deepEqual(s.warnings.map((e) => e.line), [2, 2]);
});

test('sections and \\systemsLayout decide where page lines start', () => {
  const s = parseSong(`\\systemsLayout (2 1)
\\section "A" 0.1.1 | 0.1.1 | 0.1.1 |
\\section "B" 0.1.1 | 0.1.1`);
  assert.deepEqual(s.sections, [{ name: 'A', start: 0 }, { name: 'B', start: 3 }]);
  assert.deepEqual(s.bars.map((b) => b.lineStart), [true, false, true, true, false]);
});

const PERFECT = `{title: P}
{time: 4/4}
{meta: strum q D D D D}

{start_of_grid: A}
| G . . . | C . D . |
| Em D/F# G . |
{end_of_grid}
{start_of_grid: B}
| . . C . |
{end_of_grid}`;

test('ChordPro grids give one measure per cell and one beat per token', () => {
  const s = parseSong(PERFECT);
  assert.deepEqual(s.errors, []);
  assert.deepEqual(s.bars.map((b) => b.chords), [[{ at: 0, name: 'G' }], [{ at: 0, name: 'C' }, { at: 96, name: 'D' }], [{ at: 0, name: 'Em' }, { at: 48, name: 'D/F#' }, { at: 96, name: 'G' }], [{ at: 96, name: 'C' }]]);
  assert.equal(s.bars[3].startChord, 'G');
  assert.deepEqual(s.sections, [{ name: 'A', start: 0 }, { name: 'B', start: 3 }]);
  assert.deepEqual(s.strum.map((e) => e.dir), ['D', 'D', 'D', 'D']);
  const lines = (avail) => breakLines(s, s.bars.map(() => ({ natural: 10 })), avail).map((l) => [l.start, l.count, l.sectionStart]);
  assert.deepEqual(lines(100), [[0, 2, true], [2, 1, false], [3, 1, true]]);
  assert.deepEqual(lines(10), [[0, 1, true], [1, 1, false], [2, 1, false], [3, 1, true]]);
});

test('a lyric row gives each bar of the grid row above it its lyrics', () => {
  const s = parseSong(`{time: 4/4}
{start_of_grid}
| G . . . | C . . . | D . . . |
lyric: | I found a love | | for me |
| G . . . |
{end_of_grid}`);
  assert.deepEqual(s.errors, []);
  assert.deepEqual(s.bars.map((b) => b.lyric), ['I found a love', '', 'for me', '']);
  assert.equal(s.hasLyrics, true);
  const bad = parseSong(`{time: 4/4}
{start_of_grid}
lyric: | a |
| G . . . | C . . . |
lyric: | a |
{end_of_grid}`);
  assert.deepEqual(bad.errors.map((e) => e.line), [3, 5]);
});

test('ChordPro problems name their line', () => {
  const s = parseSong(`{title: P}
{subtitle: x}
| G . . . |
{start_of_grid}
| G . . |
| G . . H |
{start_of_grid}`);
  assert.deepEqual(s.errors.map((e) => e.line), [2, 3, 5, 6, 7, 7]);
});
